import { prisma } from '@estays/database';
import { bookingRepository } from '../repositories/booking.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../utils/app-error';
import { assertHotelAccess } from '../utils/hotel-access';
import { parseDecimal } from '../utils/helpers';
import { taxService } from './tax.service';
import { hotelEventBus } from '../lib/event-bus';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('pms-service');

function dateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export class PmsService {
  private async recalculateFolio(folioId: string) {
    const items = await prisma.folioItem.findMany({ where: { folioId } });
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      const amount = parseDecimal(item.totalPrice);
      if (item.type === 'TAX') taxAmount += amount;
      else if (item.type === 'DISCOUNT' || item.type === 'REFUND') subtotal -= amount;
      else subtotal += amount;
    }

    const total = subtotal + taxAmount;
    await prisma.folio.update({
      where: { id: folioId },
      data: { subtotal, taxAmount, total },
    });
    return { subtotal, taxAmount, total };
  }

  async checkIn(hotelId: string, bookingId: string, roomId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.hotelId !== hotelId) throw AppError.notFound('Booking');
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      throw AppError.badRequest(`Cannot check in booking with status ${booking.status}`);
    }

    const room = await prisma.room.findFirst({ where: { id: roomId, hotelId, isActive: true } });
    if (!room) throw AppError.notFound('Room');
    if (room.status !== 'AVAILABLE') {
      throw AppError.conflict(`Room ${room.roomNumber} is ${room.status}`);
    }

    const existingFolio = await prisma.folio.findUnique({ where: { bookingId } });
    if (existingFolio) throw AppError.conflict('Guest already checked in');

    const taxConfig = await taxService.resolveForHotel(hotelId);
    const roomCharge = parseDecimal(booking.totalAmount);

    const result = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CHECKED_IN', checkedInAt: new Date() },
      });

      const bookingRoom = booking.rooms[0];
      if (bookingRoom) {
        await tx.bookingRoom.update({
          where: { id: bookingRoom.id },
          data: { roomId },
        });
      }

      await tx.room.update({
        where: { id: roomId },
        data: { status: 'OCCUPIED' },
      });

      const folio = await tx.folio.create({
        data: {
          bookingId,
          hotelId,
          status: 'OPEN',
          items: {
            create: [
              {
                type: 'ROOM_CHARGE',
                description: `Room charges — ${booking.rooms[0]?.roomType?.name || 'Room'}`,
                quantity: booking.rooms[0]?.nights || 1,
                unitPrice: booking.rooms[0]?.nightlyRate || roomCharge,
                totalPrice: roomCharge,
              },
              ...(taxConfig.rate > 0
                ? [{
                    type: 'TAX' as const,
                    description: taxConfig.label,
                    quantity: 1,
                    unitPrice: roomCharge * taxConfig.rate,
                    totalPrice: roomCharge * taxConfig.rate,
                  }]
                : []),
            ],
          },
        },
        include: { items: true },
      });

      const subtotal = roomCharge;
      const taxAmount = taxConfig.rate > 0 ? roomCharge * taxConfig.rate : 0;
      await tx.folio.update({
        where: { id: folio.id },
        data: { subtotal, taxAmount, total: subtotal + taxAmount },
      });

      return tx.folio.findUnique({
        where: { id: folio.id },
        include: { items: true, booking: { include: { guest: true, rooms: { include: { room: true, roomType: true } } } } },
      });
    });

    await auditRepository.log({
      userId,
      hotelId,
      action: 'GUEST_CHECKED_IN',
      entityType: 'Booking',
      entityId: bookingId,
      newData: { roomId },
    });

    hotelEventBus.emit(`hotel:${hotelId}`, { type: 'booking.updated', hotelId });
    log.info({ bookingId, roomId }, 'Guest checked in');
    return result;
  }

  async checkOut(hotelId: string, bookingId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.hotelId !== hotelId) throw AppError.notFound('Booking');
    if (booking.status !== 'CHECKED_IN') throw AppError.badRequest('Guest is not checked in');

    const folio = await prisma.folio.findUnique({ where: { bookingId }, include: { items: true } });
    if (!folio) throw AppError.notFound('Folio');
    if (folio.status !== 'OPEN') throw AppError.badRequest('Folio already settled');

    const roomId = booking.rooms[0]?.roomId;

    const result = await prisma.$transaction(async (tx) => {
      await tx.folio.update({
        where: { id: folio.id },
        data: { status: 'SETTLED', settledAt: new Date() },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED', checkedOutAt: new Date() },
      });

      if (roomId) {
        await tx.room.update({
          where: { id: roomId },
          data: { status: 'DIRTY' },
        });
      }

      return tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          guest: true,
          folio: { include: { items: true } },
          rooms: { include: { room: true, roomType: true } },
        },
      });
    });

    await auditRepository.log({
      userId,
      hotelId,
      action: 'GUEST_CHECKED_OUT',
      entityType: 'Booking',
      entityId: bookingId,
    });

    hotelEventBus.emit(`hotel:${hotelId}`, { type: 'folio.updated', hotelId });
    log.info({ bookingId }, 'Guest checked out');
    return result;
  }

  async addFolioItem(
    hotelId: string,
    bookingId: string,
    userId: string,
    isAdmin: boolean,
    item: { type: string; description: string; quantity: number; unitPrice: number }
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const folio = await prisma.folio.findFirst({
      where: { bookingId, hotelId, status: 'OPEN' },
    });
    if (!folio) throw AppError.notFound('Open folio');

    const totalPrice = item.quantity * item.unitPrice;
    const created = await prisma.folioItem.create({
      data: {
        folioId: folio.id,
        type: item.type as never,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        createdBy: userId,
      },
    });

    const totals = await this.recalculateFolio(folio.id);
    hotelEventBus.emit(`hotel:${hotelId}`, { type: 'folio.updated', hotelId });
    return { item: created, ...totals };
  }

  async getFolio(hotelId: string, bookingId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const folio = await prisma.folio.findFirst({
      where: { bookingId, hotelId },
      include: { items: { orderBy: { date: 'asc' } }, booking: { include: { guest: true } } },
    });
    if (!folio) throw AppError.notFound('Folio');
    return folio;
  }

  async getRoomBoard(hotelId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const rooms = await prisma.room.findMany({
      where: { hotelId, isActive: true },
      include: {
        roomType: { select: { id: true, name: true } },
        bookingRooms: {
          where: { booking: { status: 'CHECKED_IN' } },
          include: {
            booking: {
              select: {
                id: true,
                bookingNumber: true,
                checkOutDate: true,
                guest: { select: { firstName: true, lastName: true } },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    const summary = {
      total: rooms.length,
      available: rooms.filter((r) => r.status === 'AVAILABLE').length,
      occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
      dirty: rooms.filter((r) => r.status === 'DIRTY').length,
      maintenance: rooms.filter((r) => r.status === 'MAINTENANCE').length,
      blocked: rooms.filter((r) => r.status === 'BLOCKED').length,
    };

    return {
      summary,
      rooms: rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        status: r.status,
        notes: r.notes,
        roomType: r.roomType,
        currentGuest: r.bookingRooms[0]
          ? {
              bookingId: r.bookingRooms[0].booking.id,
              bookingNumber: r.bookingRooms[0].booking.bookingNumber,
              guestName: `${r.bookingRooms[0].booking.guest.firstName} ${r.bookingRooms[0].booking.guest.lastName}`,
              checkOutDate: r.bookingRooms[0].booking.checkOutDate,
            }
          : null,
      })),
    };
  }

  async getDailyOps(hotelId: string, userId: string, isAdmin: boolean, dateStr?: string) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const date = dateStr ? dateOnly(new Date(dateStr)) : dateOnly(new Date());

    const bookingInclude = {
      guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
      rooms: { include: { room: true, roomType: true } },
      folio: { select: { id: true, status: true, total: true } },
    };

    const [arrivals, departures, inHouse] = await Promise.all([
      prisma.booking.findMany({
        where: { hotelId, checkInDate: date, status: { in: ['CONFIRMED', 'PENDING'] } },
        include: bookingInclude,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.booking.findMany({
        where: { hotelId, checkOutDate: date, status: 'CHECKED_IN' },
        include: bookingInclude,
        orderBy: { checkOutDate: 'asc' },
      }),
      prisma.booking.findMany({
        where: { hotelId, status: 'CHECKED_IN' },
        include: bookingInclude,
        orderBy: { checkInDate: 'asc' },
      }),
    ]);

    return {
      date: date.toISOString().slice(0, 10),
      arrivals: arrivals.map(this.formatOpsBooking),
      departures: departures.map(this.formatOpsBooking),
      inHouse: inHouse.map(this.formatOpsBooking),
      counts: { arrivals: arrivals.length, departures: departures.length, inHouse: inHouse.length },
    };
  }

  private formatOpsBooking(b: {
    id: string;
    bookingNumber: string;
    status: string;
    checkInDate: Date;
    checkOutDate: Date;
    adults: number;
    children: number;
    totalAmount: unknown;
    guest: { firstName: string; lastName: string; email: string | null; phone: string | null };
    rooms: { room: { roomNumber: string } | null; roomType: { name: string } }[];
    folio: { id: string; status: string; total: unknown } | null;
  }) {
    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      status: b.status,
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      adults: b.adults,
      children: b.children,
      totalAmount: parseDecimal(b.totalAmount),
      guestName: `${b.guest.firstName} ${b.guest.lastName}`,
      guestEmail: b.guest.email,
      guestPhone: b.guest.phone,
      roomNumber: b.rooms[0]?.room?.roomNumber,
      roomType: b.rooms[0]?.roomType?.name,
      folioStatus: b.folio?.status,
      folioTotal: b.folio ? parseDecimal(b.folio.total) : null,
    };
  }

  async markRoomClean(hotelId: string, roomId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const room = await prisma.room.findFirst({ where: { id: roomId, hotelId } });
    if (!room) throw AppError.notFound('Room');
    if (room.status !== 'DIRTY') throw AppError.badRequest('Room is not marked dirty');

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: { status: 'AVAILABLE', notes: null },
    });

    await auditRepository.log({
      userId,
      hotelId,
      action: 'ROOM_CLEANED',
      entityType: 'Room',
      entityId: roomId,
    });

    return updated;
  }
}

export const pmsService = new PmsService();
