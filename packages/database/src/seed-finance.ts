import { prisma } from '@estays/database';
import { DEFAULT_PLATFORM_COMMISSION_RATE, resolveCountryTax, calculateTaxOnCommission } from '@estays/shared';

/**
 * Backfill commission rules, billing config, and booking financials from existing payments.
 */
export async function seedFinanceData() {
  console.log('Seeding finance & settlement data...');

  await prisma.commissionRule.findFirst({ where: { hotelId: null, isActive: true } }).then(async (existing) => {
    if (!existing) {
      await prisma.commissionRule.create({
        data: {
          name: 'Platform Default Commission',
          type: 'PERCENTAGE',
          percentageRate: DEFAULT_PLATFORM_COMMISSION_RATE,
          isActive: true,
        },
      });
    } else {
      await prisma.commissionRule.update({
        where: { id: existing.id },
        data: { percentageRate: DEFAULT_PLATFORM_COMMISSION_RATE },
      });
    }
  });

  await prisma.platformBillingConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      settlementNotifyEmails: [],
      billingFromEmail: process.env.EMAIL_FROM || 'noreply@estays.com',
      companyLegalName: 'E Stays Hotels LLC',
    },
    update: {},
  });

  const hotels = await prisma.hotel.findMany({
    where: { status: { in: ['APPROVED', 'ACTIVE'] } },
    select: { id: true, ownerId: true, country: true },
  });

  for (const hotel of hotels) {
    const taxConfig = resolveCountryTax(hotel.country);
    await prisma.partnerFinanceSettings.upsert({
      where: { hotelId: hotel.id },
      create: {
        hotelId: hotel.id,
        currency: 'USD',
        taxRate: taxConfig.rate,
        taxType: taxConfig.type,
        taxLabel: taxConfig.label,
        taxCountry: hotel.country,
      },
      update: {
        taxRate: taxConfig.rate,
        taxType: taxConfig.type,
        taxLabel: taxConfig.label,
        taxCountry: hotel.country,
      },
    });

    // Per-hotel percentage example for first 3 hotels (configurable via admin)
    const idx = hotels.indexOf(hotel);
    if (idx < 3) {
      const hasRule = await prisma.commissionRule.findFirst({ where: { hotelId: hotel.id, isActive: true } });
      if (!hasRule) {
        await prisma.commissionRule.create({
          data: {
            hotelId: hotel.id,
            name: idx === 0 ? 'Flat Commission' : idx === 1 ? 'Promotional Rate' : 'Standard Percentage',
            type: idx === 0 ? 'FLAT' : idx === 1 ? 'PROMOTIONAL' : 'PERCENTAGE',
            flatAmount: idx === 0 ? 200 : undefined,
            percentageRate: idx === 2 ? 0.15 : undefined,
            promotionalRate: idx === 1 ? 0.1 : undefined,
            isActive: true,
          },
        });
      }
    }
  }

  const payments = await prisma.payment.findMany({
    where: { status: { in: ['CAPTURED', 'AUTHORIZED'] } },
    include: { booking: true },
  });

  let created = 0;
  for (const payment of payments) {
    const exists = await prisma.bookingFinancial.findUnique({ where: { bookingId: payment.bookingId } });
    if (exists) continue;

    const booking = payment.booking;
    const finalAmount = Number(booking.totalAmount);
    const paymentCategory = payment.method === 'PAY_AT_HOTEL' ? 'PAY_AT_HOTEL' : 'PAID_ONLINE';

    const rule = await prisma.commissionRule.findFirst({
      where: {
        OR: [{ hotelId: booking.hotelId }, { hotelId: null }],
        isActive: true,
      },
      orderBy: [{ hotelId: 'desc' }, { effectiveFrom: 'desc' }],
    });

    let commission = finalAmount * DEFAULT_PLATFORM_COMMISSION_RATE;
    if (rule) {
      if (rule.type === 'FLAT') commission = Number(rule.flatAmount ?? 0);
      else if (rule.type === 'PERCENTAGE') commission = finalAmount * Number(rule.percentageRate ?? 0);
      else if (rule.type === 'PROMOTIONAL') commission = finalAmount * Number(rule.promotionalRate ?? rule.percentageRate ?? 0);
      else if (rule.type === 'ZERO') commission = 0;
    }
    commission = Math.round(commission * 100) / 100;

    const partnerReceivable =
      paymentCategory === 'PAID_ONLINE'
        ? Math.round((finalAmount - commission) * 100) / 100
        : finalAmount;
    const platformReceivable = commission;
    const hotelRecord = await prisma.hotel.findUnique({ where: { id: booking.hotelId }, select: { country: true } });
    const taxConfig = resolveCountryTax(hotelRecord?.country || '');
    const taxAmount = calculateTaxOnCommission(commission, taxConfig);

    await prisma.bookingFinancial.create({
      data: {
        bookingId: booking.id,
        hotelId: booking.hotelId,
        guestId: booking.guestId,
        paymentId: payment.id,
        bookingNumber: booking.bookingNumber,
        roomRate: finalAmount,
        finalAmount,
        paymentCategory,
        paymentMethod: payment.method,
        commissionAmount: commission,
        partnerReceivable,
        platformReceivable,
        taxAmount,
        bookingStatus: booking.status,
        paymentStatus: payment.status,
        currency: booking.currency,
        completedAt: payment.processedAt ?? payment.createdAt,
      },
    });
    created++;
  }

  // Refresh tax on existing financials missing tax
  const existing = await prisma.bookingFinancial.findMany({ where: { taxAmount: 0 }, include: { hotel: { select: { country: true } } } });
  for (const f of existing) {
    const taxConfig = resolveCountryTax(f.hotel.country);
    const taxAmount = calculateTaxOnCommission(Number(f.commissionAmount), taxConfig);
    if (taxAmount > 0) {
      await prisma.bookingFinancial.update({ where: { id: f.id }, data: { taxAmount } });
    }
  }

  console.log(`  Finance: ${created} booking financials backfilled`);
}
