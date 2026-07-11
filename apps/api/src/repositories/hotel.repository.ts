import { prisma, Prisma, HotelStatus } from '@estays/database';

export class HotelRepository {
  async create(data: Prisma.HotelCreateInput) {
    return prisma.hotel.create({
      data,
      include: { amenities: { include: { amenity: true } }, images: true },
    });
  }

  async findById(id: string) {
    return prisma.hotel.findUnique({
      where: { id },
      include: {
        amenities: { include: { amenity: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        roomTypes: { where: { isActive: true }, include: { rooms: { where: { isActive: true } } } },
        ratePlans: { where: { isActive: true }, include: { prices: { take: 30, orderBy: { date: 'asc' } } } },
        staff: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.hotel.findUnique({ where: { slug } });
  }

  async update(id: string, data: Prisma.HotelUpdateInput) {
    return prisma.hotel.update({
      where: { id },
      data,
      include: { amenities: { include: { amenity: true } }, images: true },
    });
  }

  async list(filters: {
    status?: HotelStatus;
    city?: string;
    country?: string;
    ownerId?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.HotelWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.country) where.country = { contains: filters.country, mode: 'insensitive' };
    if (filters.ownerId) where.ownerId = filters.ownerId;

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          amenities: { include: { amenity: true } },
          images: { where: { isPrimary: true }, take: 1 },
          roomTypes: { where: { isActive: true }, select: { id: true, name: true, basePrice: true } },
          _count: { select: { rooms: true, bookings: true } },
        },
      }),
      prisma.hotel.count({ where }),
    ]);

    return { hotels, total };
  }

  async searchPublic(filters: {
    city?: string;
    country?: string;
    starRating?: number;
    propertyType?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.HotelWhereInput = {
      status: { in: ['APPROVED', 'ACTIVE'] },
    };
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.country) where.country = { contains: filters.country, mode: 'insensitive' };
    if (filters.starRating) where.starRating = { gte: filters.starRating };
    if (filters.propertyType) where.propertyType = filters.propertyType as never;

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { starRating: 'desc' },
        include: {
          amenities: { include: { amenity: true } },
          images: { where: { isPrimary: true }, take: 1 },
          roomTypes: {
            where: { isActive: true },
            select: { id: true, name: true, basePrice: true, maxOccupancy: true },
          },
        },
      }),
      prisma.hotel.count({ where }),
    ]);

    return { hotels, total };
  }

  async setAmenities(hotelId: string, amenityIds: string[]) {
    await prisma.hotelAmenity.deleteMany({ where: { hotelId } });
    if (amenityIds.length > 0) {
      await prisma.hotelAmenity.createMany({
        data: amenityIds.map((amenityId) => ({ hotelId, amenityId })),
      });
    }
  }

  async addStaff(hotelId: string, userId: string, title?: string, isPrimary = false) {
    return prisma.hotelStaff.upsert({
      where: { userId_hotelId: { userId, hotelId } },
      update: { title, isPrimary },
      create: { userId, hotelId, title, isPrimary },
    });
  }

  async countByStatus() {
    const results = await prisma.hotel.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return results.reduce(
      (acc, r) => ({ ...acc, [r.status]: r._count.id }),
      {} as Record<string, number>
    );
  }

  /** Remove a failed draft listing (PENDING only, no bookings). */
  async deletePendingHotel(hotelId: string, ownerId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { status: true, ownerId: true, _count: { select: { bookings: true } } },
    });
    if (!hotel || hotel.ownerId !== ownerId || hotel.status !== 'PENDING' || hotel._count.bookings > 0) {
      return false;
    }

    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { hotelId } }),
      prisma.hotel.delete({ where: { id: hotelId } }),
    ]);
    return true;
  }
}

export const hotelRepository = new HotelRepository();
