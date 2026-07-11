import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

async function getOrCreateGuest(client: PrismaClient, email: string, firstName: string, lastName: string) {
  let user = await client.user.findUnique({ where: { email } });
  if (user) return user;

  const role = await client.role.findUnique({ where: { name: 'GUEST' } });
  const passwordHash = await bcrypt.hash('Guest123!', 12);
  user = await client.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      emailVerified: true,
      loyaltyPoints: 500,
      loyaltyTier: 'GOLD',
      roles: role ? { create: { roleId: role.id } } : undefined,
    },
  });
  return user;
}

export async function seedAdminDemoData(prisma: PrismaClient) {
  console.log('Seeding admin demo data (bookings, payments, complaints)...');

  const bookingCount = await prisma.booking.count();
  const complaintCount = await prisma.hotelComplaint.count();

  if (bookingCount < 5) {
    const hotels = await prisma.hotel.findMany({
      where: { status: 'ACTIVE' },
      take: 8,
      include: { roomTypes: { take: 1, include: { ratePlans: { take: 1 } } } },
    });

    if (hotels.length) {
      const guests = await Promise.all([
        getOrCreateGuest(prisma, 'sarah.mitchell@email.com', 'Sarah', 'Mitchell'),
        getOrCreateGuest(prisma, 'david.chen@email.com', 'David', 'Chen'),
        getOrCreateGuest(prisma, 'priya.sharma@email.com', 'Priya', 'Sharma'),
        getOrCreateGuest(prisma, 'michael.brown@email.com', 'Michael', 'Brown'),
        getOrCreateGuest(prisma, 'emma.wilson@email.com', 'Emma', 'Wilson'),
      ]);

      const today = dateOnly(new Date());
      const methods = ['UPI', 'ALIPAY', 'THAI_QR', 'PAY_AT_HOTEL'] as const;
      const statuses = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CONFIRMED', 'CHECKED_OUT'] as const;
      let bookingNum = 1001;

      for (let i = 0; i < 12; i++) {
        const hotel = hotels[i % hotels.length];
        const guest = guests[i % guests.length];
        const roomType = hotel.roomTypes[0];
        if (!roomType) continue;

        const ratePlan = roomType.ratePlans[0];
        const nights = 2 + (i % 4);
        const checkIn = addDays(today, -30 + i * 3);
        const checkOut = addDays(checkIn, nights);
        const totalAmount = Number(roomType.basePrice) * nights;
        const status = statuses[i % statuses.length];
        const method = methods[i % methods.length];
        const paymentStatus = method === 'PAY_AT_HOTEL' ? 'AUTHORIZED' : 'CAPTURED';
        const isPartialRefund = i === 10;

        const booking = await prisma.booking.create({
          data: {
            bookingNumber: `EST-${bookingNum++}`,
            hotelId: hotel.id,
            guestId: guest.id,
            ratePlanId: ratePlan?.id,
            status,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults: 2,
            totalAmount,
            paidAmount: totalAmount,
            currency: 'USD',
            confirmedAt: addDays(checkIn, -2),
            rooms: {
              create: {
                roomTypeId: roomType.id,
                nightlyRate: roomType.basePrice,
                nights,
              },
            },
          },
        });

        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: totalAmount,
            currency: 'USD',
            method,
            status: isPartialRefund ? 'PARTIALLY_REFUNDED' : paymentStatus,
            payerName: `${guest.firstName} ${guest.lastName}`,
            payerEmail: guest.email,
            refundMethod: method,
            processedAt: addDays(checkIn, -1),
            description: `${method} payment for ${booking.bookingNumber}`,
            refundedAmount: isPartialRefund ? totalAmount * 0.5 : 0,
          },
        });
      }
      console.log('  ✓ Bookings & payments seeded');
    }
  } else {
    console.log('  ↻ Bookings already seeded');
  }

  if (complaintCount === 0) {
    const complaintData = [
      { slug: 'grand-plaza-hotel', guestName: 'John D.', category: 'SERVICE' as const, subject: 'Slow check-in', description: 'Waited 45 minutes at front desk despite online check-in.', status: 'OPEN' as const },
      { slug: 'grand-plaza-hotel', guestName: 'Lisa K.', category: 'CLEANLINESS' as const, subject: 'Room not cleaned', description: 'Found previous guest items in bathroom drawer.', status: 'IN_PROGRESS' as const },
      { slug: 'bengaluru-tech-park-hotel', guestName: 'Arjun P.', category: 'AMENITIES' as const, subject: 'WiFi issues', description: 'Internet dropped repeatedly during video calls.', status: 'OPEN' as const },
      { slug: 'imperial-grand-mumbai', guestName: 'Neha R.', category: 'BILLING' as const, subject: 'Incorrect charge', description: 'Charged for minibar items I did not consume.', status: 'RESOLVED' as const, resolution: 'Refund of $28 issued to original payment method.' },
      { slug: 'phuket-paradise-resort', guestName: 'Tom H.', category: 'SAFETY' as const, subject: 'Pool area slippery', description: 'No warning signs near wet pool deck area.', status: 'OPEN' as const },
      { slug: 'bangkok-sky-tower-hotel', guestName: 'Yuki T.', category: 'SERVICE' as const, subject: 'Noise complaint', description: 'Construction noise from adjacent floor until midnight.', status: 'IN_PROGRESS' as const },
      { slug: 'sea-view-resort', guestName: 'Maria G.', category: 'CLEANLINESS' as const, subject: 'Towels stained', description: 'Bathroom towels had visible stains on arrival.', status: 'RESOLVED' as const, resolution: 'Housekeeping replaced all linens and offered spa credit.' },
      { slug: 'kerala-backwater-resort', guestName: 'Rajesh V.', category: 'AMENITIES' as const, subject: 'Houseboat delay', description: 'Scheduled houseboat tour started 2 hours late.', status: 'CLOSED' as const, resolution: 'Complimentary dinner provided as goodwill gesture.' },
    ];

    const hotelBySlug = Object.fromEntries(
      (await prisma.hotel.findMany({ select: { id: true, slug: true } })).map((h) => [h.slug, h.id])
    );

    for (const c of complaintData) {
      const hotelId = hotelBySlug[c.slug];
      if (!hotelId) continue;
      await prisma.hotelComplaint.create({
        data: {
          hotelId,
          guestName: c.guestName,
          guestEmail: `${c.guestName.replace(/\s/g, '').toLowerCase()}@email.com`,
          category: c.category,
          subject: c.subject,
          description: c.description,
          status: c.status,
          resolution: c.resolution,
          resolvedAt: ['RESOLVED', 'CLOSED'].includes(c.status) ? new Date() : undefined,
        },
      });
    }
    console.log('  ✓ Complaints seeded');
  } else {
    console.log('  ↻ Complaints already seeded');
  }
}
