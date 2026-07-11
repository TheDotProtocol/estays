import { PaymentMethod, PaymentStatus, BookingStatus } from '@estays/database';
import { ONLINE_PAYMENT_METHODS } from '@estays/shared';
import { bookingFinancialRepository } from '../repositories/booking-financial.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { commissionService } from './commission.service';
import { ledgerService } from './ledger.service';
import { parseDecimal } from '../utils/helpers';
import { hotelEventBus } from '../lib/event-bus';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('booking-finance');

function isOnlinePayment(method: string) {
  return ONLINE_PAYMENT_METHODS.includes(method as (typeof ONLINE_PAYMENT_METHODS)[number]);
}

export class BookingFinanceService {
  async recordFromPayment(
    bookingId: string,
    paymentId: string,
    method: PaymentMethod,
    paymentStatus: PaymentStatus,
    actorId?: string
  ) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) return null;

    const finalAmount = parseDecimal(booking.totalAmount);
    const paymentCategory = method === 'PAY_AT_HOTEL' ? 'PAY_AT_HOTEL' : 'PAID_ONLINE';
    const calc = await commissionService.calculate(booking.hotelId, finalAmount, paymentCategory);

    const financial = await bookingFinancialRepository.upsert({
      booking: { connect: { id: bookingId } },
      hotel: { connect: { id: booking.hotelId } },
      guestId: booking.guestId,
      payment: { connect: { id: paymentId } },
      bookingNumber: booking.bookingNumber,
      roomRate: finalAmount,
      discountAmount: 0,
      finalAmount,
      paymentCategory,
      paymentMethod: method,
      commissionAmount: calc.commissionAmount,
      partnerReceivable: calc.partnerReceivable,
      platformReceivable: calc.platformReceivable,
      taxAmount: calc.taxAmount,
      bookingStatus: booking.status,
      paymentStatus,
      currency: booking.currency,
      completedAt: ['CAPTURED', 'AUTHORIZED'].includes(paymentStatus) ? new Date() : undefined,
    });

    if (['CAPTURED', 'AUTHORIZED'].includes(paymentStatus)) {
      await ledgerService.recordBookingFinancial(financial.id, {
        hotelId: booking.hotelId,
        bookingId,
        bookingNumber: booking.bookingNumber,
        paymentCategory,
        finalAmount,
        commission: calc.commissionAmount,
        partnerReceivable: calc.partnerReceivable,
        platformReceivable: calc.platformReceivable,
        taxAmount: calc.taxAmount,
        currency: booking.currency,
        actorId,
      });
    }

    hotelEventBus.publish({
      hotelId: booking.hotelId,
      type: 'finance.updated',
      timestamp: new Date().toISOString(),
      data: { bookingId, financialId: financial.id },
    });

    log.info({ bookingId, paymentId, paymentCategory }, 'Booking financial recorded');
    return financial;
  }

  async recordRefund(bookingId: string, refundAmount: number, actorId?: string) {
    const existing = await bookingFinancialRepository.findByBookingId(bookingId);
    if (!existing) return null;

    const ratio = refundAmount / parseDecimal(existing.finalAmount);
    const commissionRefund = parseDecimal(existing.commissionAmount) * ratio;
    const partnerRefund = parseDecimal(existing.partnerReceivable) * ratio;

    await ledgerService.recordReversal(
      `REFUND-${bookingId}`,
      existing.hotelId,
      bookingId,
      {
        description: `Refund for booking ${existing.bookingNumber}`,
        partnerAmount: partnerRefund,
        commissionAmount: commissionRefund,
        currency: existing.currency,
        actorId,
      }
    );

    hotelEventBus.publish({
      hotelId: existing.hotelId,
      type: 'finance.refund',
      timestamp: new Date().toISOString(),
      data: { bookingId, refundAmount },
    });

    return existing;
  }

  async updateBookingStatus(bookingId: string, status: BookingStatus) {
    const existing = await bookingFinancialRepository.findByBookingId(bookingId);
    if (!existing) return null;
    // Status sync handled via upsert on next payment event; lightweight update via prisma if needed
    return existing;
  }
}

export const bookingFinanceService = new BookingFinanceService();
