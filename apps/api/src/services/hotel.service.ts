import { hotelRepository } from '../repositories/hotel.repository';
import { prisma } from '@estays/database';
import { roomRepository } from '../repositories/room.repository';
import { inventoryRepository } from '../repositories/inventory.repository';
import { userRepository } from '../repositories/user.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../utils/app-error';
import { slugify, getDateRange, parseDecimal } from '../utils/helpers';
import {
  convertFromUSD,
  formatPrice,
  resolveDestinationQuery,
  CreateHotelInput,
  HotelSearchInput,
  CreateRoomTypeInput,
  OnboardPropertyInput,
  brandPropertyName,
} from '@estays/shared';
import { createChildLogger } from '@estays/logger';
import { HotelStatus } from '@estays/database';
import { hotelEventBus } from '../lib/event-bus';
import { transactionalEmailService } from './transactional-email.service';

const log = createChildLogger('hotel-service');

export class HotelService {
  async createHotel(ownerId: string, input: CreateHotelInput) {
    const owner = await userRepository.findById(ownerId);
    if (!owner) throw AppError.notFound('User');
    const isPartner = owner.roles.some((r) => r.role.name === 'PARTNER');
    if (isPartner && owner.partnerStatus !== 'APPROVED') {
      throw AppError.forbidden('Complete KYC upload and wait for admin approval before listing properties');
    }
    if (isPartner && !input.brandAccepted) {
      throw AppError.badRequest('You must accept the E Stays branding before listing your property');
    }

    let slug = slugify(input.name);
    const existing = await hotelRepository.findBySlug(slug);
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const displayName = brandPropertyName(input.name);
    if (!displayName) throw AppError.badRequest('Property name is required');

    const hotel = await hotelRepository.create({
      name: displayName,
      slug,
      description: input.description,
      address: input.address,
      city: input.city,
      state: input.state,
      country: input.country,
      postalCode: input.postalCode,
      latitude: input.latitude,
      longitude: input.longitude,
      phone: input.phone,
      email: input.email,
      website: input.website || undefined,
      googleMapsUrl: input.googleMapsUrl || undefined,
      googlePlaceId: input.googlePlaceId,
      socialFacebook: input.socialFacebook || undefined,
      socialInstagram: input.socialInstagram || undefined,
      socialTwitter: input.socialTwitter || undefined,
      socialLinkedIn: input.socialLinkedIn || undefined,
      socialYoutube: input.socialYoutube || undefined,
      starRating: input.starRating ?? 3,
      propertyType: input.propertyType ?? 'HOTEL',
      checkInTime: input.checkInTime ?? '15:00',
      checkOutTime: input.checkOutTime ?? '11:00',
      status: 'PENDING',
      ownerId,
    });

    if (input.amenityIds?.length) {
      await hotelRepository.setAmenities(hotel.id, input.amenityIds);
    }

    await hotelRepository.addStaff(hotel.id, ownerId, 'Owner', true);

    await auditRepository.log({
      userId: ownerId,
      hotelId: hotel.id,
      action: 'HOTEL_CREATED',
      entityType: 'Hotel',
      entityId: hotel.id,
      newData: { name: hotel.name, status: hotel.status },
    });

    log.info({ hotelId: hotel.id, ownerId }, 'Hotel created');

    return hotelRepository.findById(hotel.id);
  }

  /** Atomic partner onboarding: hotel, amenities, room types, and rooms in one request. */
  async onboardProperty(ownerId: string, input: OnboardPropertyInput) {
    const { roomTypes, ...hotelInput } = input;
    const hotel = await this.createHotel(ownerId, { ...hotelInput, brandAccepted: true });
    if (!hotel) throw AppError.internal('Failed to create property');

    const createdRoomTypes: {
      roomType: Awaited<ReturnType<HotelService['createRoomType']>>;
      rooms: Awaited<ReturnType<HotelService['createRoom']>>[];
    }[] = [];

    try {
      for (const rt of roomTypes) {
        const roomType = await this.createRoomType(hotel.id, ownerId, {
          name: rt.name,
          description: rt.description,
          bedType: rt.bedType,
          maxOccupancy: rt.maxOccupancy,
          basePrice: rt.basePrice,
        });

        const prefix = rt.name.replace(/\s/g, '').slice(0, 3).toUpperCase() || 'RM';
        const rooms = [];
        for (let i = 1; i <= rt.roomCount; i++) {
          const room = await this.createRoom(
            hotel.id,
            ownerId,
            roomType.id,
            `${prefix}${100 + i}`,
            Math.ceil(i / 10)
          );
          rooms.push(room);
        }
        createdRoomTypes.push({ roomType, rooms });
      }
    } catch (err) {
      const rolledBack = await hotelRepository.deletePendingHotel(hotel.id, ownerId);
      log.error({ err, hotelId: hotel.id, ownerId, rolledBack }, 'Property onboarding failed — draft rolled back');
      throw err;
    }

    await auditRepository.log({
      userId: ownerId,
      hotelId: hotel.id,
      action: 'PROPERTY_ONBOARDED',
      entityType: 'Hotel',
      entityId: hotel.id,
      newData: {
        roomTypeCount: roomTypes.length,
        roomCount: roomTypes.reduce((sum, rt) => sum + rt.roomCount, 0),
      },
    });

    log.info(
      {
        hotelId: hotel.id,
        ownerId,
        roomTypeCount: roomTypes.length,
        roomCount: roomTypes.reduce((sum, rt) => sum + rt.roomCount, 0),
      },
      'Property onboarded'
    );

    const fullHotel = await hotelRepository.findById(hotel.id);
    return { hotel: fullHotel, roomTypes: createdRoomTypes };
  }

  async getHotel(id: string) {
    const hotel = await hotelRepository.findById(id);
    if (!hotel) throw AppError.notFound('Hotel');
    return hotel;
  }

  async updateHotel(id: string, userId: string, input: Partial<CreateHotelInput>) {
    const hotel = await hotelRepository.findById(id);
    if (!hotel) throw AppError.notFound('Hotel');

    const updated = await hotelRepository.update(id, {
      name: input.name,
      description: input.description,
      address: input.address,
      city: input.city,
      state: input.state,
      country: input.country,
      postalCode: input.postalCode,
      latitude: input.latitude,
      longitude: input.longitude,
      phone: input.phone,
      email: input.email,
      website: input.website,
      googleMapsUrl: input.googleMapsUrl,
      googlePlaceId: input.googlePlaceId,
      socialFacebook: input.socialFacebook,
      socialInstagram: input.socialInstagram,
      socialTwitter: input.socialTwitter,
      socialLinkedIn: input.socialLinkedIn,
      socialYoutube: input.socialYoutube,
      starRating: input.starRating,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
    });

    if (input.amenityIds) {
      await hotelRepository.setAmenities(id, input.amenityIds);
    }

    await auditRepository.log({
      userId,
      hotelId: id,
      action: 'HOTEL_UPDATED',
      entityType: 'Hotel',
      entityId: id,
    });

    hotelEventBus.publish({
      hotelId: id,
      type: 'hotel.updated',
      timestamp: new Date().toISOString(),
    });

    return hotelRepository.findById(id);
  }

  async listHotels(filters: {
    status?: HotelStatus;
    city?: string;
    country?: string;
    ownerId?: string;
    page: number;
    limit: number;
  }) {
    return hotelRepository.list(filters);
  }

  async searchHotels(input: HotelSearchInput) {
    const displayCurrency = input.currency || 'USD';
    const resolved = input.city ? resolveDestinationQuery(input.city) : {};
    const searchCity = resolved.city || input.city;
    const searchCountry = resolved.country || input.country;

    const { hotels, total } = await hotelRepository.searchPublic({
      city: searchCity,
      country: searchCountry,
      starRating: input.starRating,
      propertyType: input.propertyType,
      page: input.page,
      limit: input.limit,
    });

    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);

    const enriched = await Promise.all(
      hotels.map(async (hotel) => {
        let lowestPrice: number | null = null;
        let hasAvailability = false;

        for (const rt of hotel.roomTypes) {
          if (rt.maxOccupancy && rt.maxOccupancy < input.adults) continue;

          const avail = await inventoryRepository.checkAvailability(
            hotel.id,
            rt.id,
            checkIn,
            checkOut
          );

          if (avail.available) {
            hasAvailability = true;
            const price = parseDecimal(rt.basePrice);
            if (lowestPrice === null || price < lowestPrice) {
              lowestPrice = price;
            }
          }
        }

        return {
          ...hotel,
          hasAvailability,
          lowestPrice,
          lowestPriceDisplay: lowestPrice !== null ? convertFromUSD(lowestPrice, displayCurrency) : null,
          priceFormatted: lowestPrice !== null ? formatPrice(lowestPrice, displayCurrency) : null,
          displayCurrency,
          nights: getDateRange(input.checkIn, input.checkOut).length,
        };
      })
    );

    let filtered = enriched;
    if (input.minPrice !== undefined) {
      filtered = filtered.filter((h) => h.lowestPrice !== null && h.lowestPrice >= input.minPrice!);
    }
    if (input.maxPrice !== undefined) {
      filtered = filtered.filter((h) => h.lowestPrice !== null && h.lowestPrice <= input.maxPrice!);
    }

    return { hotels: filtered, total, currency: displayCurrency };
  }

  async approveHotel(
    hotelId: string,
    adminId: string,
    status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE',
    rejectionReason?: string
  ) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw AppError.notFound('Hotel');

    if (status === 'REJECTED' && !rejectionReason) {
      throw AppError.badRequest('Rejection reason is required');
    }

    const updated = await hotelRepository.update(hotelId, {
      status,
      approvedById: ['APPROVED', 'ACTIVE'].includes(status) ? adminId : undefined,
      approvedAt: ['APPROVED', 'ACTIVE'].includes(status) ? new Date() : undefined,
      rejectionReason: status === 'REJECTED' ? rejectionReason : null,
    });

    if (['APPROVED', 'ACTIVE'].includes(status)) {
      await inventoryRepository.generateForHotel(hotelId, 90);
      const owner = await prisma.user.findUnique({ where: { id: hotel.ownerId } });
      if (owner?.email) {
        await transactionalEmailService.sendHotelApproved({
          to: owner.email,
          name: `${owner.firstName} ${owner.lastName}`,
          hotelName: hotel.name,
        });
      }
    }

    await auditRepository.log({
      userId: adminId,
      hotelId,
      action: `HOTEL_${status}`,
      entityType: 'Hotel',
      entityId: hotelId,
      newData: { status, rejectionReason },
    });

    log.info({ hotelId, status, adminId }, 'Hotel status updated');

    return updated;
  }

  async createRoomType(hotelId: string, userId: string, input: CreateRoomTypeInput) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw AppError.notFound('Hotel');

    const roomType = await roomRepository.createRoomType({
      hotel: { connect: { id: hotelId } },
      name: input.name,
      description: input.description,
      maxOccupancy: input.maxOccupancy ?? 2,
      bedType: input.bedType,
      sizeSqm: input.sizeSqm,
      basePrice: input.basePrice,
    });

    await roomRepository.createRatePlan({
      hotel: { connect: { id: hotelId } },
      roomType: { connect: { id: roomType.id } },
      name: 'Standard Rate',
      description: 'Best available rate',
      isRefundable: true,
      cancellationHours: 24,
    });

    await auditRepository.log({
      userId,
      hotelId,
      action: 'ROOM_TYPE_CREATED',
      entityType: 'RoomType',
      entityId: roomType.id,
    });

    return roomType;
  }

  async createRoom(hotelId: string, userId: string, roomTypeId: string, roomNumber: string, floor?: number, notes?: string) {
    const roomType = await roomRepository.findRoomTypeById(roomTypeId);
    if (!roomType || roomType.hotelId !== hotelId) {
      throw AppError.notFound('Room type');
    }

    const room = await roomRepository.createRoom({
      hotel: { connect: { id: hotelId } },
      roomType: { connect: { id: roomTypeId } },
      roomNumber,
      floor,
      notes,
      status: 'AVAILABLE',
    });

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    await inventoryRepository.generateForRoom(room.id, hotelId, startDate, 90);

    await auditRepository.log({
      userId,
      hotelId,
      action: 'ROOM_CREATED',
      entityType: 'Room',
      entityId: room.id,
    });

    return room;
  }

  async updateRoomStatus(hotelId: string, roomId: string, userId: string, status: string, notes?: string) {
    const room = await roomRepository.findRoomById(roomId);
    if (!room || room.hotelId !== hotelId) throw AppError.notFound('Room');

    const updated = await roomRepository.updateRoom(roomId, { status: status as never, notes });

    await auditRepository.log({
      userId,
      hotelId,
      action: 'ROOM_STATUS_UPDATED',
      entityType: 'Room',
      entityId: roomId,
      newData: { status, notes },
    });

    return updated;
  }

  async updatePrices(hotelId: string, ratePlanId: string, userId: string, prices: { date: string; price: number; minStay?: number; isClosed?: boolean }[]) {
    const ratePlan = await roomRepository.findRatePlanById(ratePlanId);
    if (!ratePlan || ratePlan.hotelId !== hotelId) throw AppError.notFound('Rate plan');

    const priceRecords = prices.map((p) => ({
      date: new Date(p.date),
      price: p.price,
      minStay: p.minStay,
      isClosed: p.isClosed,
    }));

    await roomRepository.upsertPrices(ratePlanId, priceRecords);

    await auditRepository.log({
      userId,
      hotelId,
      action: 'PRICES_UPDATED',
      entityType: 'RatePlan',
      entityId: ratePlanId,
      newData: { count: prices.length },
    });

    return roomRepository.findRatePlanById(ratePlanId);
  }

  async getAvailability(hotelId: string, checkIn: string, checkOut: string) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw AppError.notFound('Hotel');

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const availability = await Promise.all(
      hotel.roomTypes.map(async (rt) => {
        const avail = await inventoryRepository.checkAvailability(
          hotelId,
          rt.id,
          checkInDate,
          checkOutDate
        );

        const ratePlan = hotel.ratePlans.find((rp) => rp.roomTypeId === rt.id);
        let totalPrice = 0;
        const nightlyBreakdown: { date: string; price: number }[] = [];

        if (ratePlan && avail.available) {
          const dates = getDateRange(checkIn, checkOut);
          const prices = await roomRepository.getPricesForRange(
            ratePlan.id,
            checkInDate,
            checkOutDate
          );
          const priceMap = new Map(prices.map((p) => [p.date.toISOString().slice(0, 10), parseDecimal(p.price)]));

          for (const d of dates) {
            const dateStr = d.toISOString().slice(0, 10);
            const price = priceMap.get(dateStr) ?? parseDecimal(rt.basePrice);
            nightlyBreakdown.push({ date: dateStr, price });
            totalPrice += price;
          }
        }

        return {
          roomTypeId: rt.id,
          roomTypeName: rt.name,
          maxOccupancy: rt.maxOccupancy,
          basePrice: parseDecimal(rt.basePrice),
          available: avail.available,
          roomsAvailable: avail.roomsAvailable,
          ratePlanId: ratePlan?.id,
          totalPrice,
          nightlyBreakdown,
        };
      })
    );

    return { hotelId, checkIn, checkOut, availability };
  }

  async getInventorySummary(hotelId: string, startDate: string, endDate: string) {
    return inventoryRepository.getHotelInventorySummary(
      hotelId,
      new Date(startDate),
      new Date(endDate)
    );
  }
}

export const hotelService = new HotelService();
