import { paymentRepository } from '../repositories/payment.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { bookingService } from './booking.service';
import { notificationRepository } from '../repositories/notification.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../utils/app-error';
import { parseDecimal } from '../utils/helpers';
import { createChildLogger } from '@estays/logger';
import { convertFromUSD, CURRENCIES, PAYMENT_REGIONS } from '@estays/shared';
import { bookingFinanceService } from './booking-finance.service';
import { hotelEventBus } from '../lib/event-bus';

const log = createChildLogger('payment-service');

type PaymentMethodType = 'UPI' | 'ALIPAY' | 'THAI_QR' | 'PAY_AT_HOTEL';

function buildUpiPayload(bookingNumber: string, amountInr: number): string {
  const { upiId, merchantName } = PAYMENT_REGIONS.INDIA;
  return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amountInr}&cu=INR&tn=${encodeURIComponent(`E Stays ${bookingNumber}`)}`;
}

function buildAlipayPayload(bookingNumber: string, amountThb: number): string {
  return `alipay://pay?merchant=${PAYMENT_REGIONS.THAILAND.alipayId}&amount=${amountThb}&currency=THB&ref=${bookingNumber}`;
}

function buildThaiQrPayload(bookingNumber: string, amountThb: number): string {
  const { thaiMerchantId } = PAYMENT_REGIONS.THAILAND;
  return `|${thaiMerchantId}\n${amountThb.toFixed(2)}\n${bookingNumber}`;
}

export class PaymentService {
  async initiatePayment(
    bookingId: string,
    userId: string,
    method: PaymentMethodType,
    displayCurrency = 'USD',
    payer?: { payerName: string; payerEmail: string; payerPhone?: string }
  ) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking');
    if (booking.guestId !== userId) throw AppError.forbidden('Not your booking');
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw AppError.badRequest('Booking is not awaiting payment');
    }

    const amountUsd = parseDecimal(booking.totalAmount);
    const currency = CURRENCIES[displayCurrency] || CURRENCIES.USD;
    const displayAmount = convertFromUSD(amountUsd, displayCurrency);

    if (method === 'PAY_AT_HOTEL') {
      const payment = await paymentRepository.create({
        bookingId,
        amount: amountUsd,
        currency: booking.currency,
        method: 'PAY_AT_HOTEL',
        status: 'AUTHORIZED',
        description: `Pay at hotel — booking ${booking.bookingNumber}`,
        payerName: payer?.payerName,
        payerEmail: payer?.payerEmail,
        payerPhone: payer?.payerPhone,
        refundMethod: 'PAY_AT_HOTEL',
        metadata: { displayCurrency, displayAmount, payAtHotel: true },
      });

      const confirmed = await bookingService.confirmBooking(bookingId, 0);

      await notificationRepository.create({
        userId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed — Pay at Hotel',
        message: `Your booking ${booking.bookingNumber} is confirmed. Pay at check-in.`,
        bookingId,
      });

      hotelEventBus.publish({
        hotelId: booking.hotelId,
        type: 'payment.pay_at_hotel',
        timestamp: new Date().toISOString(),
        data: { bookingId, paymentId: payment.id },
      });

      await bookingFinanceService.recordFromPayment(
        bookingId,
        payment.id,
        'PAY_AT_HOTEL',
        'AUTHORIZED',
        userId
      );

      return {
        paymentId: payment.id,
        method: 'PAY_AT_HOTEL',
        amount: amountUsd,
        displayAmount,
        displayCurrency,
        currencySymbol: currency.symbol,
        booking: confirmed,
        message: 'Booking confirmed. Payment due at check-in.',
      };
    }

    let qrPayload = '';
    let qrLabel = '';

    if (method === 'UPI') {
      const amountInr = convertFromUSD(amountUsd, 'INR');
      qrPayload = buildUpiPayload(booking.bookingNumber, amountInr);
      qrLabel = `Scan with any UPI app (GPay, PhonePe, Paytm)`;
    } else if (method === 'ALIPAY') {
      const amountThb = convertFromUSD(amountUsd, 'THB');
      qrPayload = buildAlipayPayload(booking.bookingNumber, amountThb);
      qrLabel = 'Scan with Alipay';
    } else if (method === 'THAI_QR') {
      const amountThb = convertFromUSD(amountUsd, 'THB');
      qrPayload = buildThaiQrPayload(booking.bookingNumber, amountThb);
      qrLabel = 'Scan with Thai QR (PromptPay)';
    }

    const payment = await paymentRepository.create({
      bookingId,
      amount: amountUsd,
      currency: booking.currency,
      method,
      status: 'PENDING',
      description: `${method} payment for ${booking.bookingNumber}`,
      payerName: payer?.payerName,
      payerEmail: payer?.payerEmail,
      payerPhone: payer?.payerPhone,
      refundMethod: method as never,
      metadata: { qrPayload, displayCurrency, displayAmount, qrLabel },
    });

    await paymentRepository.update(payment.id, {
      stripeIntentId: `qr_${method}_${payment.id}`,
    });

    return {
      paymentId: payment.id,
      method,
      amount: amountUsd,
      displayAmount,
      displayCurrency,
      currencySymbol: currency.symbol,
      qrPayload,
      qrLabel,
      bookingNumber: booking.bookingNumber,
    };
  }

  async confirmQrPayment(paymentId: string, userId: string) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Payment');
    if (payment.booking.guestId !== userId) throw AppError.forbidden('Not your payment');
    if (payment.status === 'CAPTURED') {
      return { payment, booking: payment.booking, alreadyPaid: true };
    }
    if (!['UPI', 'ALIPAY', 'THAI_QR'].includes(payment.method)) {
      throw AppError.badRequest('Invalid payment method for QR confirmation');
    }

    const updatedPayment = await paymentRepository.update(paymentId, {
      status: 'CAPTURED',
      processedAt: new Date(),
    });

    const booking = await bookingService.confirmBooking(
      payment.bookingId,
      parseDecimal(payment.amount)
    );

    await auditRepository.log({
      userId,
      hotelId: booking.hotelId,
      action: 'QR_PAYMENT_CONFIRMED',
      entityType: 'Payment',
      entityId: paymentId,
      newData: { method: payment.method, amount: parseDecimal(payment.amount) },
    });

    log.info({ paymentId, method: payment.method }, 'QR payment confirmed');

    hotelEventBus.publish({
      hotelId: booking.hotelId,
      type: 'payment.captured',
      timestamp: new Date().toISOString(),
      data: { paymentId, method: payment.method },
    });

    await bookingFinanceService.recordFromPayment(
      payment.bookingId,
      paymentId,
      payment.method,
      'CAPTURED',
      userId
    );

    return { payment: updatedPayment, booking, alreadyPaid: false };
  }

  async refundPayment(paymentId: string, adminId: string, amount?: number) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Payment');
    if (payment.status !== 'CAPTURED') throw AppError.badRequest('Payment not captured');

    const refundAmount = amount ?? parseDecimal(payment.amount);

    const updated = await paymentRepository.update(paymentId, {
      status: refundAmount >= parseDecimal(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAmount: refundAmount,
    });

    await notificationRepository.create({
      userId: payment.booking.guestId,
      type: 'PAYMENT_RECEIVED',
      title: 'Refund Processed',
      message: `A refund has been processed for booking ${payment.booking.bookingNumber}.`,
      bookingId: payment.bookingId,
    });

    await bookingFinanceService.recordRefund(payment.bookingId, refundAmount, adminId);

    return updated;
  }

  async getPaymentHistory(bookingId: string, userId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking');
    if (booking.guestId !== userId) throw AppError.forbidden('Not your booking');
    return paymentRepository.listByBooking(bookingId);
  }
}

export const paymentService = new PaymentService();
