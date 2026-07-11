import { prisma, Prisma } from '@estays/database';

export class RoomRepository {
  async createRoomType(data: Prisma.RoomTypeCreateInput) {
    return prisma.roomType.create({ data });
  }

  async findRoomTypeById(id: string) {
    return prisma.roomType.findUnique({
      where: { id },
      include: { rooms: { where: { isActive: true } }, ratePlans: { where: { isActive: true } } },
    });
  }

  async listRoomTypes(hotelId: string) {
    return prisma.roomType.findMany({
      where: { hotelId, isActive: true },
      include: {
        rooms: { where: { isActive: true } },
        ratePlans: { where: { isActive: true } },
        _count: { select: { rooms: true } },
      },
      orderBy: { basePrice: 'asc' },
    });
  }

  async updateRoomType(id: string, data: Prisma.RoomTypeUpdateInput) {
    return prisma.roomType.update({ where: { id }, data });
  }

  async createRoom(data: Prisma.RoomCreateInput) {
    return prisma.room.create({ data });
  }

  async findRoomById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: { roomType: true, hotel: true },
    });
  }

  async listRooms(hotelId: string, roomTypeId?: string) {
    const where: Prisma.RoomWhereInput = { hotelId, isActive: true };
    if (roomTypeId) where.roomTypeId = roomTypeId;

    return prisma.room.findMany({
      where,
      include: { roomType: { select: { id: true, name: true } } },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async updateRoom(id: string, data: Prisma.RoomUpdateInput) {
    return prisma.room.update({ where: { id }, data, include: { roomType: true } });
  }

  async createRatePlan(data: Prisma.RatePlanCreateInput) {
    return prisma.ratePlan.create({ data });
  }

  async findRatePlanById(id: string) {
    return prisma.ratePlan.findUnique({
      where: { id },
      include: { roomType: true, prices: { orderBy: { date: 'asc' }, take: 90 } },
    });
  }

  async listRatePlans(hotelId: string, roomTypeId?: string) {
    const where: Prisma.RatePlanWhereInput = { hotelId, isActive: true };
    if (roomTypeId) where.roomTypeId = roomTypeId;

    return prisma.ratePlan.findMany({
      where,
      include: { roomType: { select: { id: true, name: true, basePrice: true } } },
    });
  }

  async upsertPrices(ratePlanId: string, prices: { date: Date; price: number; minStay?: number; isClosed?: boolean }[]) {
    const operations = prices.map((p) =>
      prisma.ratePlanPrice.upsert({
        where: { ratePlanId_date: { ratePlanId, date: p.date } },
        update: {
          price: p.price,
          minStay: p.minStay ?? 1,
          isClosed: p.isClosed ?? false,
        },
        create: {
          ratePlanId,
          date: p.date,
          price: p.price,
          minStay: p.minStay ?? 1,
          isClosed: p.isClosed ?? false,
        },
      })
    );
    return prisma.$transaction(operations);
  }

  async getPricesForRange(ratePlanId: string, startDate: Date, endDate: Date) {
    return prisma.ratePlanPrice.findMany({
      where: {
        ratePlanId,
        date: { gte: startDate, lt: endDate },
        isClosed: false,
      },
      orderBy: { date: 'asc' },
    });
  }
}

export const roomRepository = new RoomRepository();
