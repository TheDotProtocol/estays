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
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from './razorpay.service';
import {
  createStripePaymentIntent,
  getStripePublishableKey,
  isStripeConfigured,
  retrieveStripePaymentIntent,
} from './stripe.service';

const log = createChildLogger('payment-service');

type PaymentMethodType = 'UPI' | 'ALIPAY' | 'THAI_QR' | 'PAY_AT_HOTEL' | 'STRIPE';

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

    if (method === 'UPI' && isRazorpayConfigured()) {
      return this.createRazorpayCheckoutOrder(bookingId, userId, displayCurrency, payer);
    }

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

  async createRazorpayCheckoutOrder(
    bookingId: string,
    userId: string,
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
    const amountInr = convertFromUSD(amountUsd, 'INR');
    const amountPaise = Math.max(100, Math.round(amountInr * 100));

    const order = await createRazorpayOrder({
      amountPaise,
      currency: 'INR',
      receipt: booking.bookingNumber,
      notes: {
        bookingId,
        bookingNumber: booking.bookingNumber,
        guestId: userId,
      },
    });

    const payment = await paymentRepository.create({
      bookingId,
      amount: amountUsd,
      currency: booking.currency,
      method: 'UPI',
      status: 'PENDING',
      description: `Razorpay UPI payment for ${booking.bookingNumber}`,
      payerName: payer?.payerName,
      payerEmail: payer?.payerEmail,
      payerPhone: payer?.payerPhone,
      refundMethod: 'UPI',
      stripeIntentId: order.orderId,
      metadata: {
        razorpay: true,
        orderId: order.orderId,
        amountPaise: order.amount,
        displayCurrency,
        displayAmount: amountInr,
      },
    });

    return {
      paymentId: payment.id,
      method: 'UPI',
      provider: 'RAZORPAY',
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      displayAmount: amountInr,
      displayCurrency: 'INR',
      currencySymbol: CURRENCIES.INR.symbol,
      bookingNumber: booking.bookingNumber,
    };
  }

  async verifyRazorpayPayment(
    paymentId: string,
    userId: string,
    params: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw AppError.badRequest('Missing Razorpay payment verification fields');
    }

    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Payment');
    if (payment.booking.guestId !== userId) throw AppError.forbidden('Not your payment');
    if (payment.status === 'CAPTURED') {
      return { payment, booking: payment.booking, alreadyPaid: true };
    }
    if (payment.stripeIntentId !== razorpay_order_id) {
      throw AppError.badRequest('Order ID does not match payment record');
    }

    const valid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      throw AppError.badRequest('Invalid payment signature');
    }

    const updatedPayment = await paymentRepository.update(paymentId, {
      status: 'CAPTURED',
      stripePaymentId: razorpay_payment_id,
      processedAt: new Date(),
    });

    const booking = await bookingService.confirmBooking(
      payment.bookingId,
      parseDecimal(payment.amount)
    );

    await auditRepository.log({
      userId,
      hotelId: booking.hotelId,
      action: 'RAZORPAY_PAYMENT_CONFIRMED',
      entityType: 'Payment',
      entityId: paymentId,
      newData: {
        method: payment.method,
        amount: parseDecimal(payment.amount),
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    log.info({ paymentId, razorpayPaymentId: razorpay_payment_id }, 'Razorpay payment verified');

    hotelEventBus.publish({
      hotelId: booking.hotelId,
      type: 'payment.captured',
      timestamp: new Date().toISOString(),
      data: { paymentId, method: payment.method, provider: 'RAZORPAY' },
    });

    await bookingFinanceService.recordFromPayment(
      payment.bookingId,
      paymentId,
      payment.method,
      'CAPTURED',
      userId
    );

    await notificationRepository.create({
      userId,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      message: `Payment received for booking ${booking.bookingNumber}.`,
      bookingId: payment.bookingId,
    });

    return { payment: updatedPayment, booking, alreadyPaid: false };
  }

  async createStripeCheckoutIntent(
    bookingId: string,
    userId: string,
    displayCurrency = 'INR',
    payer?: { payerName: string; payerEmail: string; payerPhone?: string }
  ) {
    if (!isStripeConfigured()) {
      throw AppError.badRequest('Card payments are not configured');
    }

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking');
    if (booking.guestId !== userId) throw AppError.forbidden('Not your booking');
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw AppError.badRequest('Booking is not awaiting payment');
    }

    const amountUsd = parseDecimal(booking.totalAmount);
    const currency = CURRENCIES[displayCurrency] ? displayCurrency : 'INR';
    const displayAmount = convertFromUSD(amountUsd, currency);
    const amountMinor = Math.max(
      currency === 'JPY' ? 1 : 100,
      Math.round(displayAmount * (currency === 'JPY' ? 1 : 100))
    );

    const intent = await createStripePaymentIntent({
      amountMinor,
      currency,
      bookingId,
      bookingNumber: booking.bookingNumber,
      guestEmail: payer?.payerEmail || '',
      guestName: payer?.payerName,
    });

    const payment = await paymentRepository.create({
      bookingId,
      amount: amountUsd,
      currency: booking.currency,
      method: 'STRIPE',
      status: 'PENDING',
      description: `Stripe payment for ${booking.bookingNumber}`,
      payerName: payer?.payerName,
      payerEmail: payer?.payerEmail,
      payerPhone: payer?.payerPhone,
      refundMethod: 'STRIPE',
      stripeIntentId: intent.id,
      metadata: {
        stripe: true,
        paymentIntentId: intent.id,
        displayCurrency: currency,
        displayAmount,
        clientSecret: intent.client_secret,
      },
    });

    return {
      paymentId: payment.id,
      method: 'STRIPE',
      provider: 'STRIPE',
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      publishableKey: getStripePublishableKey(),
      displayAmount,
      displayCurrency: currency,
      currencySymbol: CURRENCIES[currency].symbol,
      bookingNumber: booking.bookingNumber,
    };
  }

  async confirmStripePayment(paymentId: string, userId: string, paymentIntentId: string) {
    if (!isStripeConfigured()) {
      throw AppError.badRequest('Card payments are not configured');
    }

    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Payment');
    if (payment.booking.guestId !== userId) throw AppError.forbidden('Not your payment');
    if (payment.status === 'CAPTURED') {
      return { payment, booking: payment.booking, alreadyPaid: true };
    }
    if (payment.stripeIntentId !== paymentIntentId) {
      throw AppError.badRequest('Payment intent does not match payment record');
    }

    const intent = await retrieveStripePaymentIntent(paymentIntentId);
    if (intent.status !== 'succeeded') {
      throw AppError.badRequest(`Payment not completed (status: ${intent.status})`);
    }

    const updatedPayment = await paymentRepository.update(paymentId, {
      status: 'CAPTURED',
      stripePaymentId: intent.latest_charge as string | undefined,
      processedAt: new Date(),
    });

    const booking = await bookingService.confirmBooking(
      payment.bookingId,
      parseDecimal(payment.amount)
    );

    await auditRepository.log({
      userId,
      hotelId: booking.hotelId,
      action: 'STRIPE_PAYMENT_CONFIRMED',
      entityType: 'Payment',
      entityId: paymentId,
      newData: {
        method: payment.method,
        amount: parseDecimal(payment.amount),
        paymentIntentId,
      },
    });

    hotelEventBus.publish({
      hotelId: booking.hotelId,
      type: 'payment.captured',
      timestamp: new Date().toISOString(),
      data: { paymentId, method: payment.method, provider: 'STRIPE' },
    });

    await bookingFinanceService.recordFromPayment(
      payment.bookingId,
      paymentId,
      payment.method,
      'CAPTURED',
      userId
    );

    await notificationRepository.create({
      userId,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      message: `Payment received for booking ${booking.bookingNumber}.`,
      bookingId: payment.bookingId,
    });

    return { payment: updatedPayment, booking, alreadyPaid: false };
  }

  async handleStripeWebhookEvent(event: {
    type: string;
    data: { object: { id: string; status: string; latest_charge?: string | null } };
  }) {
    if (event.type !== 'payment_intent.succeeded') return { handled: false };

    const intent = event.data.object;
    const payment = await paymentRepository.findByIntentId(intent.id);
    if (!payment || payment.status === 'CAPTURED') return { handled: true };

    await paymentRepository.update(payment.id, {
      status: 'CAPTURED',
      stripePaymentId: intent.latest_charge as string | undefined,
      processedAt: new Date(),
    });

    const booking = await bookingService.confirmBooking(
      payment.bookingId,
      parseDecimal(payment.amount)
    );

    await bookingFinanceService.recordFromPayment(
      payment.bookingId,
      payment.id,
      payment.method,
      'CAPTURED',
      payment.booking.guestId
    );

    hotelEventBus.publish({
      hotelId: booking.hotelId,
      type: 'payment.captured',
      timestamp: new Date().toISOString(),
      data: { paymentId: payment.id, method: payment.method, provider: 'STRIPE' },
    });

    return { handled: true };
  }

  async confirmQrPayment(paymentId: string, userId: string) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Payment');
    if (payment.booking.guestId !== userId) throw AppError.forbidden('Not your payment');
    if (payment.status === 'CAPTURED') {
      return { payment, booking: payment.booking, alreadyPaid: true };
    }
    if (payment.method === 'UPI' && isRazorpayConfigured()) {
      throw AppError.badRequest('Use Razorpay verification for UPI payments');
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
