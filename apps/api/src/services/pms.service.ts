import { prisma } from '@estays/database';
import bcrypt from 'bcryptjs';
import { bookingRepository } from '../repositories/booking.repository';
import { roomRepository } from '../repositories/room.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../utils/app-error';
import { assertHotelAccess } from '../utils/hotel-access';
import { parseDecimal, generateBookingNumber, getDateRange } from '../utils/helpers';
import { taxService } from './tax.service';
import { hotelEventBus } from '../lib/event-bus';
import { createChildLogger } from '@estays/logger';
import { generateFolioPdf } from './folio-pdf.service';
import { transactionalEmailService } from './transactional-email.service';

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

  async markNoShow(hotelId: string, bookingId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.hotelId !== hotelId) throw AppError.notFound('Booking');
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      throw AppError.badRequest('Booking cannot be marked no-show');
    }

    const roomId = booking.rooms[0]?.roomId;
    const dates = getDateRange(
      booking.checkInDate.toISOString().slice(0, 10),
      booking.checkOutDate.toISOString().slice(0, 10)
    );

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'NO_SHOW' } });
      if (roomId) {
        for (const date of dates) {
          const inv = await tx.inventory.findUnique({
            where: { roomId_date: { roomId, date } },
          });
          if (inv && inv.bookedRooms > 0) {
            await tx.inventory.update({
              where: { roomId_date: { roomId, date } },
              data: { availableRooms: { increment: 1 }, bookedRooms: { decrement: 1 } },
            });
          }
        }
      }
    });

    await auditRepository.log({
      userId, hotelId, action: 'BOOKING_NO_SHOW', entityType: 'Booking', entityId: bookingId,
    });
    hotelEventBus.emit(`hotel:${hotelId}`, { type: 'booking.updated', hotelId });
    return { bookingId, status: 'NO_SHOW' };
  }

  async createWalkIn(
    hotelId: string,
    userId: string,
    isAdmin: boolean,
    input: {
      roomTypeId: string;
      roomId: string;
      checkInDate: string;
      checkOutDate: string;
      adults: number;
      guestFirstName: string;
      guestLastName: string;
      guestEmail: string;
      guestPhone?: string;
    }
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const room = await prisma.room.findFirst({
      where: { id: input.roomId, hotelId, roomTypeId: input.roomTypeId, status: 'AVAILABLE' },
    });
    if (!room) throw AppError.conflict('Room not available');

    const checkIn = new Date(input.checkInDate);
    const checkOut = new Date(input.checkOutDate);
    const dates = getDateRange(input.checkInDate, input.checkOutDate);
    const nights = dates.length;

    const ratePlan = await prisma.ratePlan.findFirst({
      where: { hotelId, roomTypeId: input.roomTypeId, isActive: true },
    });
    if (!ratePlan) throw AppError.notFound('Rate plan');

    const roomType = await roomRepository.findRoomTypeById(input.roomTypeId);
    const basePrice = roomType ? parseDecimal(roomType.basePrice) : 0;
    const totalAmount = basePrice * nights;
    const nightlyRate = basePrice;

    let guest = await prisma.user.findUnique({ where: { email: input.guestEmail.toLowerCase() } });
    if (!guest) {
      const guestRole = await prisma.role.findUnique({ where: { name: 'GUEST' } });
      const passwordHash = await bcrypt.hash(`WalkIn${Date.now()}`, 12);
      guest = await prisma.user.create({
        data: {
          email: input.guestEmail.toLowerCase(),
          passwordHash,
          firstName: input.guestFirstName,
          lastName: input.guestLastName,
          phone: input.guestPhone,
          emailVerified: true,
          roles: guestRole ? { create: { roleId: guestRole.id } } : undefined,
        },
      });
    }

    const bookingNumber = generateBookingNumber();

    const booking = await prisma.$transaction(async (tx) => {
      for (const date of dates) {
        const inv = await tx.inventory.findUnique({
          where: { roomId_date: { roomId: input.roomId, date } },
        });
        if (!inv || inv.availableRooms < 1) {
          throw AppError.conflict(`Room not available on ${date.toISOString().slice(0, 10)}`);
        }
        await tx.inventory.update({
          where: { roomId_date: { roomId: input.roomId, date } },
          data: { availableRooms: { decrement: 1 }, bookedRooms: { increment: 1 } },
        });
      }

      return tx.booking.create({
        data: {
          bookingNumber,
          hotelId,
          guestId: guest!.id,
          ratePlanId: ratePlan.id,
          status: 'CONFIRMED',
          source: 'WALK_IN',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: input.adults,
          totalAmount,
          paidAmount: 0,
          confirmedAt: new Date(),
          rooms: {
            create: {
              roomTypeId: input.roomTypeId,
              roomId: input.roomId,
              nightlyRate,
              nights,
            },
          },
          guests: {
            create: {
              firstName: input.guestFirstName,
              lastName: input.guestLastName,
              email: input.guestEmail,
              phone: input.guestPhone,
              isPrimary: true,
            },
          },
        },
        include: {
          guest: true,
          hotel: { select: { name: true } },
          rooms: { include: { room: true, roomType: true } },
        },
      });
    });

    await transactionalEmailService.sendBookingConfirmed({
      to: input.guestEmail,
      guestName: `${input.guestFirstName} ${input.guestLastName}`,
      bookingNumber,
      bookingId: booking.id,
      hotelName: booking.hotel.name,
      checkIn: input.checkInDate,
      checkOut: input.checkOutDate,
      totalAmount: totalAmount.toFixed(2),
    });

    await auditRepository.log({
      userId, hotelId, action: 'WALK_IN_BOOKING', entityType: 'Booking', entityId: booking.id,
    });
    hotelEventBus.emit(`hotel:${hotelId}`, { type: 'booking.created', hotelId });
    log.info({ bookingId: booking.id, bookingNumber }, 'Walk-in booking created');
    return booking;
  }

  async getFolioReceiptPdf(hotelId: string, bookingId: string, userId: string, isAdmin: boolean) {
    const folio = await this.getFolio(hotelId, bookingId, userId, isAdmin);
    const booking = folio.booking;
    return generateFolioPdf({
      bookingNumber: booking.bookingNumber || bookingId,
      hotelName: (await prisma.hotel.findUnique({ where: { id: hotelId }, select: { name: true } }))?.name || '',
      guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      checkIn: booking.checkInDate.toISOString().slice(0, 10),
      checkOut: booking.checkOutDate.toISOString().slice(0, 10),
      status: folio.status,
      subtotal: folio.subtotal,
      taxAmount: folio.taxAmount,
      total: folio.total,
      items: folio.items.map((i) => ({
        type: i.type,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
    });
  }
}

export const pmsService = new PmsService();
