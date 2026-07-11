import { prisma, Prisma } from '@estays/database';

export class BookingFinancialRepository {
  async upsert(data: Prisma.BookingFinancialCreateInput) {
    return prisma.bookingFinancial.upsert({
      where: { bookingId: (data.booking as { connect: { id: string } }).connect.id },
      create: data,
      update: {
        roomRate: data.roomRate,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
        paymentCategory: data.paymentCategory,
        paymentMethod: data.paymentMethod,
        commissionAmount: data.commissionAmount,
        partnerReceivable: data.partnerReceivable,
        platformReceivable: data.platformReceivable,
        taxAmount: data.taxAmount,
        bookingStatus: data.bookingStatus,
        paymentStatus: data.paymentStatus,
        completedAt: data.completedAt,
        payment: data.payment,
      },
      include: { booking: true, hotel: true },
    });
  }

  async findByBookingId(bookingId: string) {
    return prisma.bookingFinancial.findUnique({
      where: { bookingId },
      include: { booking: true, payment: true },
    });
  }

  async listUnsettledForHotel(
    hotelId: string,
    opts?: { beforeDate?: Date; periodStart?: Date; periodEnd?: Date }
  ) {
    const where: {
      hotelId: string;
      settlementStatus: 'UNSETTLED';
      createdAt?: { lte?: Date; gte?: Date };
    } = { hotelId, settlementStatus: 'UNSETTLED' };

    if (opts?.periodStart && opts?.periodEnd) {
      const end = new Date(opts.periodEnd);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: opts.periodStart, lte: end };
    } else if (opts?.beforeDate) {
      where.createdAt = { lte: opts.beforeDate };
    }

    return prisma.bookingFinancial.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async markPendingSettlement(ids: string[], settlementId: string) {
    return prisma.bookingFinancial.updateMany({
      where: { id: { in: ids } },
      data: { settlementStatus: 'PENDING', settlementId },
    });
  }

  async markSettled(settlementId: string) {
    return prisma.bookingFinancial.updateMany({
      where: { settlementId },
      data: { settlementStatus: 'SETTLED' },
    });
  }

  async getTodayEarnings(hotelId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const agg = await prisma.bookingFinancial.aggregate({
      where: { hotelId, createdAt: { gte: start }, bookingStatus: { not: 'CANCELLED' } },
      _sum: { partnerReceivable: true, commissionAmount: true, finalAmount: true },
      _count: true,
    });
    return agg;
  }

  async search(filters: {
    hotelId?: string;
    bookingId?: string;
    settlementStatus?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.BookingFinancialWhereInput = {};
    if (filters.hotelId) where.hotelId = filters.hotelId;
    if (filters.bookingId) where.bookingId = filters.bookingId;
    if (filters.settlementStatus) where.settlementStatus = filters.settlementStatus as never;

    const [items, total] = await Promise.all([
      prisma.bookingFinancial.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: { booking: { select: { bookingNumber: true, guest: { select: { firstName: true, lastName: true, email: true } } } } },
      }),
      prisma.bookingFinancial.count({ where }),
    ]);
    return { items, total };
  }
}

export const bookingFinancialRepository = new BookingFinancialRepository();
