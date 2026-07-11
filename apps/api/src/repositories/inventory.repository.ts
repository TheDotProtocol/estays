import { prisma } from '@estays/database';

export class InventoryRepository {
  async generateForRoom(roomId: string, hotelId: string, startDate: Date, days: number) {
    const records = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(current);
      records.push({
        hotelId,
        roomId,
        date,
        totalRooms: 1,
        availableRooms: 1,
        bookedRooms: 0,
        blockedRooms: 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return prisma.$transaction(
      records.map((r) =>
        prisma.inventory.upsert({
          where: { roomId_date: { roomId: r.roomId, date: r.date } },
          update: {},
          create: r,
        })
      )
    );
  }

  async generateForHotel(hotelId: string, days = 90) {
    const rooms = await prisma.room.findMany({
      where: { hotelId, isActive: true },
      select: { id: true },
    });

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    for (const room of rooms) {
      await this.generateForRoom(room.id, hotelId, startDate, days);
    }
  }

  async checkAvailability(
    hotelId: string,
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date
  ) {
    const rooms = await prisma.room.findMany({
      where: { hotelId, roomTypeId, isActive: true, status: { not: 'BLOCKED' } },
      select: { id: true },
    });

    if (rooms.length === 0) return { available: false, roomsAvailable: 0, roomIds: [] as string[] };

    const roomIds = rooms.map((r) => r.id);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const inventory = await prisma.inventory.groupBy({
      by: ['roomId'],
      where: {
        roomId: { in: roomIds },
        date: { gte: checkIn, lt: checkOut },
        availableRooms: { gt: 0 },
      },
      _count: { date: true },
    });

    const availableRoomIds = inventory
      .filter((inv) => inv._count.date >= nights)
      .map((inv) => inv.roomId);

    return {
      available: availableRoomIds.length > 0,
      roomsAvailable: availableRoomIds.length,
      roomIds: availableRoomIds,
    };
  }

  async holdRooms(roomIds: string[], checkIn: Date, checkOut: Date) {
    const dates: Date[] = [];
    const current = new Date(checkIn);
    while (current < checkOut) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return prisma.$transaction(async (tx) => {
      for (const roomId of roomIds) {
        for (const date of dates) {
          const inv = await tx.inventory.findUnique({
            where: { roomId_date: { roomId, date } },
          });
          if (!inv || inv.availableRooms < 1) {
            throw new Error(`Room ${roomId} not available on ${date.toISOString().slice(0, 10)}`);
          }
          await tx.inventory.update({
            where: { roomId_date: { roomId, date } },
            data: {
              availableRooms: { decrement: 1 },
              bookedRooms: { increment: 1 },
            },
          });
        }
      }
    });
  }

  async releaseRooms(roomIds: string[], checkIn: Date, checkOut: Date) {
    const dates: Date[] = [];
    const current = new Date(checkIn);
    while (current < checkOut) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return prisma.$transaction(
      roomIds.flatMap((roomId) =>
        dates.map((date) =>
          prisma.inventory.update({
            where: { roomId_date: { roomId, date } },
            data: {
              availableRooms: { increment: 1 },
              bookedRooms: { decrement: 1 },
            },
          })
        )
      )
    );
  }

  async getHotelInventorySummary(hotelId: string, startDate: Date, endDate: Date) {
    return prisma.inventory.groupBy({
      by: ['date'],
      where: {
        hotelId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalRooms: true,
        availableRooms: true,
        bookedRooms: true,
        blockedRooms: true,
      },
      orderBy: { date: 'asc' },
    });
  }
}

export const inventoryRepository = new InventoryRepository();
