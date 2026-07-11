import { prisma } from '@estays/database';

export class PaymentRepository {
  async create(data: {
    bookingId: string;
    amount: number;
    currency?: string;
    method?: string;
    status?: string;
    stripeIntentId?: string;
    stripePaymentId?: string;
    description?: string;
    payerName?: string;
    payerEmail?: string;
    payerPhone?: string;
    refundMethod?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        currency: data.currency || 'USD',
        method: (data.method || 'STRIPE') as never,
        status: (data.status || 'PENDING') as never,
        stripeIntentId: data.stripeIntentId,
        stripePaymentId: data.stripePaymentId,
        description: data.description,
        payerName: data.payerName,
        payerEmail: data.payerEmail,
        payerPhone: data.payerPhone,
        refundMethod: data.refundMethod as never,
        metadata: data.metadata as never,
      },
    });
  }

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: { booking: { include: { hotel: true, guest: true } } },
    });
  }

  async findByIntentId(intentId: string) {
    return prisma.payment.findFirst({
      where: { stripeIntentId: intentId },
      include: { booking: true },
    });
  }

  async update(id: string, data: {
    status?: string;
    stripePaymentId?: string;
    stripeIntentId?: string;
    processedAt?: Date;
    refundedAmount?: number;
  }) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: data.status as never,
        stripePaymentId: data.stripePaymentId,
        stripeIntentId: data.stripeIntentId,
        processedAt: data.processedAt,
        refundedAmount: data.refundedAmount,
      },
    });
  }

  async listByBooking(bookingId: string) {
    return prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const paymentRepository = new PaymentRepository();
