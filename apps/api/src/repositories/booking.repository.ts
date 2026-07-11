import { prisma, Prisma, BookingStatus } from '@estays/database';

export class BookingRepository {
  async create(data: Prisma.BookingCreateInput) {
    return prisma.booking.create({
      data,
      include: {
        hotel: { select: { id: true, name: true, city: true, slug: true } },
        rooms: { include: { roomType: true, room: true } },
        guests: true,
        ratePlan: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        hotel: true,
        guest: { select: { id: true, email: true, firstName: true, lastName: true } },
        rooms: { include: { roomType: true, room: true } },
        guests: true,
        ratePlan: true,
        payments: { orderBy: { createdAt: 'desc' } },
        folio: { include: { items: true } },
      },
    });
  }

  async findByNumber(bookingNumber: string) {
    return prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        hotel: true,
        guest: { select: { id: true, email: true, firstName: true, lastName: true } },
        rooms: { include: { roomType: true, room: true } },
        payments: true,
      },
    });
  }

  async update(id: string, data: Prisma.BookingUpdateInput) {
    return prisma.booking.update({
      where: { id },
      data,
      include: {
        hotel: { select: { id: true, name: true } },
        rooms: { include: { roomType: true } },
        payments: true,
      },
    });
  }

  async list(filters: {
    guestId?: string;
    hotelId?: string;
    status?: BookingStatus;
    page: number;
    limit: number;
  }) {
    const where: Prisma.BookingWhereInput = {};
    if (filters.guestId) where.guestId = filters.guestId;
    if (filters.hotelId) where.hotelId = filters.hotelId;
    if (filters.status) where.status = filters.status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          hotel: { select: { id: true, name: true, city: true, starRating: true } },
          rooms: { include: { roomType: { select: { name: true } } } },
          payments: { where: { status: 'CAPTURED' }, take: 1 },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total };
  }
}

export const bookingRepository = new BookingRepository();
