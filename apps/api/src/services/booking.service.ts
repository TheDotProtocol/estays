import { prisma } from '@estays/database';
import { bookingRepository } from '../repositories/booking.repository';
import { inventoryRepository } from '../repositories/inventory.repository';
import { roomRepository } from '../repositories/room.repository';
import { hotelRepository } from '../repositories/hotel.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../utils/app-error';
import { generateBookingNumber, getDateRange, parseDecimal } from '../utils/helpers';
import { CreateBookingInput } from '@estays/shared';
import { createChildLogger } from '@estays/logger';
import { loyaltyService } from './loyalty.service';
import { hotelEventBus } from '../lib/event-bus';
import { transactionalEmailService } from './transactional-email.service';
import { bookingToVoucherData, type BookingVoucherData } from './booking-voucher.service';
import { generateBookingVoucherPdf } from './booking-voucher-pdf.service';
import { generateVoucherQrPng } from './booking-voucher.service';

const log = createChildLogger('booking-service');

export class BookingService {
  async createBooking(guestId: string, input: CreateBookingInput) {
    const hotel = await hotelRepository.findById(input.hotelId);
    if (!hotel) throw AppError.notFound('Hotel');
    if (!['APPROVED', 'ACTIVE'].includes(hotel.status)) {
      throw AppError.badRequest('Hotel is not available for booking');
    }

    const ratePlan = await roomRepository.findRatePlanById(input.ratePlanId);
    if (!ratePlan || ratePlan.hotelId !== input.hotelId) {
      throw AppError.notFound('Rate plan');
    }

    const checkIn = new Date(input.checkInDate);
    const checkOut = new Date(input.checkOutDate);
    if (checkOut <= checkIn) {
      throw AppError.badRequest('Check-out must be after check-in');
    }

    const nights = getDateRange(input.checkInDate, input.checkOutDate).length;
    if (nights < 1) throw AppError.badRequest('Minimum 1 night required');

    const availability = await inventoryRepository.checkAvailability(
      input.hotelId,
      ratePlan.roomTypeId,
      checkIn,
      checkOut
    );

    if (!availability.available || availability.roomIds.length === 0) {
      throw AppError.conflict('No rooms available for selected dates');
    }

    const assignedRoomId = availability.roomIds[0];
    const prices = await roomRepository.getPricesForRange(ratePlan.id, checkIn, checkOut);
    const priceMap = new Map(prices.map((p) => [p.date.toISOString().slice(0, 10), parseDecimal(p.price)]));

    const roomType = await roomRepository.findRoomTypeById(ratePlan.roomTypeId);
    const basePrice = roomType ? parseDecimal(roomType.basePrice) : 0;

    let totalAmount = 0;
    const dates = getDateRange(input.checkInDate, input.checkOutDate);
    for (const d of dates) {
      const dateStr = d.toISOString().slice(0, 10);
      totalAmount += priceMap.get(dateStr) ?? basePrice;
    }

    const nightlyRate = totalAmount / nights;
    const bookingNumber = generateBookingNumber();

    const booking = await prisma.$transaction(async (tx) => {
      // Hold inventory atomically
      for (const date of dates) {
        const inv = await tx.inventory.findUnique({
          where: { roomId_date: { roomId: assignedRoomId, date } },
        });
        if (!inv || inv.availableRooms < 1) {
          throw AppError.conflict(`Room no longer available on ${date.toISOString().slice(0, 10)}`);
        }
        await tx.inventory.update({
          where: { roomId_date: { roomId: assignedRoomId, date } },
          data: { availableRooms: { decrement: 1 }, bookedRooms: { increment: 1 } },
        });
      }

      const created = await tx.booking.create({
        data: {
          bookingNumber,
          hotelId: input.hotelId,
          guestId,
          ratePlanId: input.ratePlanId,
          status: 'PENDING',
          source: 'DIRECT',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: input.adults,
          children: input.children,
          totalAmount,
          currency: 'USD',
          specialRequests: input.specialRequests,
          rooms: {
            create: {
              roomTypeId: ratePlan.roomTypeId,
              roomId: assignedRoomId,
              nightlyRate,
              nights,
            },
          },
          guests: input.guests?.length
            ? {
                create: input.guests.map((g, i) => ({
                  firstName: g.firstName,
                  lastName: g.lastName,
                  email: g.email,
                  phone: g.phone,
                  isPrimary: g.isPrimary ?? i === 0,
                })),
              }
            : undefined,
        },
        include: {
          hotel: { select: { id: true, name: true, city: true } },
          rooms: { include: { roomType: true, room: true } },
          guests: true,
        },
      });

      return created;
    });

    await auditRepository.log({
      userId: guestId,
      hotelId: input.hotelId,
      action: 'BOOKING_CREATED',
      entityType: 'Booking',
      entityId: booking.id,
      newData: { bookingNumber, totalAmount, status: 'PENDING' },
    });

    log.info({ bookingId: booking.id, bookingNumber, guestId }, 'Booking created');

    hotelEventBus.publish({
      hotelId: input.hotelId,
      type: 'booking.created',
      timestamp: new Date().toISOString(),
      data: { bookingId: booking.id, bookingNumber },
    });

    return booking;
  }

  async confirmBooking(bookingId: string, paidAmount: number) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking');
    if (booking.status !== 'PENDING') {
      throw AppError.badRequest(`Cannot confirm booking in ${booking.status} status`);
    }

    const updated = await bookingRepository.update(bookingId, {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      paidAmount,
    });

    await notificationRepository.create({
      userId: booking.guestId,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      message: `Your booking ${booking.bookingNumber} at ${booking.hotel.name} has been confirmed.`,
      bookingId,
      data: { bookingNumber: booking.bookingNumber, hotelName: booking.hotel.name },
    });

    // Notify hotel owner/staff
    const staff = await prisma.hotelStaff.findMany({ where: { hotelId: booking.hotelId } });
    for (const s of staff) {
      await notificationRepository.create({
        userId: s.userId,
        type: 'BOOKING_CONFIRMED',
        title: 'New Booking',
        message: `New booking ${booking.bookingNumber} for ${booking.checkInDate.toISOString().slice(0, 10)}.`,
        bookingId,
      });
    }

    const earned = await loyaltyService.awardBookingPoints(
      booking.guestId,
      parseDecimal(booking.totalAmount)
    );

    const guest = await prisma.user.findUnique({ where: { id: booking.guestId } });
    if (guest?.email) {
      await transactionalEmailService.sendBookingConfirmed({
        to: guest.email,
        guestName: `${guest.firstName} ${guest.lastName}`,
        bookingNumber: booking.bookingNumber,
        hotelName: booking.hotel.name,
        checkIn: booking.checkInDate.toISOString().slice(0, 10),
        checkOut: booking.checkOutDate.toISOString().slice(0, 10),
        totalAmount: `${booking.currency} ${parseDecimal(booking.totalAmount).toFixed(2)}`,
        bookingId,
        currency: booking.currency,
      });
    }

    hotelEventBus.publish({
      hotelId: booking.hotelId,
      type: 'booking.updated',
      timestamp: new Date().toISOString(),
      data: { bookingId, status: 'CONFIRMED' },
    });

    return { ...updated, loyaltyEarned: earned?.loyaltyPoints };
  }

  async cancelBooking(bookingId: string, userId: string, reason: string, isAdmin = false) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking');

    if (!isAdmin && booking.guestId !== userId) {
      throw AppError.forbidden('You can only cancel your own bookings');
    }

    if (['CANCELLED', 'CHECKED_OUT', 'COMPLETED'].includes(booking.status)) {
      throw AppError.badRequest(`Cannot cancel booking in ${booking.status} status`);
    }

    const bookingRoom = booking.rooms[0];
    if (bookingRoom?.roomId) {
      await inventoryRepository.releaseRooms(
        [bookingRoom.roomId],
        booking.checkInDate,
        booking.checkOutDate
      );
    }

    const updated = await bookingRepository.update(bookingId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason,
    });

    await notificationRepository.create({
      userId: booking.guestId,
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: `Your booking ${booking.bookingNumber} has been cancelled.`,
      bookingId,
    });

    await auditRepository.log({
      userId,
      hotelId: booking.hotelId,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: bookingId,
      newData: { reason },
    });

    return updated;
  }

  async getBooking(id: string, userId: string, roles: string[]) {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw AppError.notFound('Booking');

    const isAdmin = roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const isPartner = roles.some((r) => ['PARTNER', 'RECEPTIONIST'].includes(r));
    const isGuest = booking.guestId === userId;

    if (!isAdmin && !isGuest) {
      if (isPartner) {
        const staff = await prisma.hotelStaff.findFirst({
          where: { userId, hotelId: booking.hotelId },
        });
        if (!staff) throw AppError.forbidden('No access to this booking');
      } else {
        throw AppError.forbidden('No access to this booking');
      }
    }

    return booking;
  }

  async listBookings(filters: {
    guestId?: string;
    hotelId?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    return bookingRepository.list({
      guestId: filters.guestId,
      hotelId: filters.hotelId,
      status: filters.status as never,
      page: filters.page,
      limit: filters.limit,
    });
  }

  private assertVoucherAccess(booking: { guestId: string; status: string }, userId: string, roles: string[]) {
    if (!['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CHECKED_OUT'].includes(booking.status)) {
      throw AppError.badRequest('Voucher available after booking is confirmed');
    }
    const isAdmin = roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    if (isAdmin || booking.guestId === userId) return;
    throw AppError.forbidden('No access to this voucher');
  }

  async getVoucherData(bookingId: string, userId: string, roles: string[]): Promise<BookingVoucherData> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) throw AppError.notFound('Booking');
    this.assertVoucherAccess(booking, userId, roles);
    return bookingToVoucherData(booking);
  }

  async getVoucherPdf(bookingId: string, userId: string, roles: string[]): Promise<Buffer> {
    const data = await this.getVoucherData(bookingId, userId, roles);
    return generateBookingVoucherPdf(data);
  }

  async getVoucherQrPng(bookingId: string, userId: string, roles: string[]): Promise<Buffer> {
    const data = await this.getVoucherData(bookingId, userId, roles);
    return generateVoucherQrPng(data);
  }
}

export const bookingService = new BookingService();
