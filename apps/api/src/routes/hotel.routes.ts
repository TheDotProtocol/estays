import { Response, Router } from 'express';
import { hotelService } from '../services/hotel.service';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response';
import { AuthRequest, authenticate, optionalAuth } from '../middleware/auth';
import { requirePermission, requireHotelAccess } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import {
  createHotelSchema,
  updateHotelSchema,
  hotelSearchSchema,
  createRoomTypeSchema,
  createRoomSchema,
  updateRoomStatusSchema,
  createRatePlanSchema,
  updatePricesSchema,
  paginationSchema,
  featuredHotelsSchema,
  guestComplaintSchema,
  PERMISSIONS,
} from '@estays/shared';
import { searchDestinations, COUNTRIES } from '@estays/shared';
import { AppError } from '../utils/app-error';
import { prisma } from '@estays/database';

export const hotelRouter = Router();

hotelRouter.get('/locations', async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  const country = req.query.country as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 12, 50);
  const results = searchDestinations(q, limit, country);
  sendSuccess(res, results);
});

hotelRouter.get('/countries', async (_req: AuthRequest, res: Response) => {
  sendSuccess(res, COUNTRIES);
});

hotelRouter.get('/amenities', async (_req: AuthRequest, res: Response) => {
  const { prisma } = await import('@estays/database');
  const amenities = await prisma.amenity.findMany({ orderBy: { category: 'asc' } });
  sendSuccess(res, amenities);
});

hotelRouter.get(
  '/featured',
  validate(featuredHotelsSchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const query = req.query as unknown as { page: number; limit: number; currency?: string };
    const result = await hotelService.listFeaturedHotels(query);
    sendSuccess(res, result.hotels, 200, buildPaginationMeta(query.page, query.limit, result.total));
  }
);

hotelRouter.get(
  '/search',
  validate(hotelSearchSchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const query = req.query as unknown as { page: number; limit: number };
    const result = await hotelService.searchHotels(req.query as never);
    sendSuccess(res, result.hotels, 200, buildPaginationMeta(query.page, query.limit, result.total));
  }
);

hotelRouter.get(
  '/',
  authenticate,
  validate(paginationSchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const isPartner = req.user!.roles.includes('PARTNER');

    const filters: Parameters<typeof hotelService.listHotels>[0] = { page, limit };
    if (isPartner && !isAdmin) {
      filters.ownerId = req.user!.sub;
    }

    const result = await hotelService.listHotels(filters);
    sendSuccess(res, result.hotels, 200, buildPaginationMeta(page, limit, result.total));
  }
);

hotelRouter.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.HOTEL_CREATE),
  validate(createHotelSchema),
  async (req: AuthRequest, res: Response) => {
    const hotel = await hotelService.createHotel(req.user!.sub, req.body);
    sendCreated(res, hotel);
  }
);

hotelRouter.get('/:hotelId', optionalAuth, async (req: AuthRequest, res: Response) => {
  const hotelId = param(req.params.hotelId);
  const hotel = await hotelService.getHotel(hotelId);

  if (!['APPROVED', 'ACTIVE'].includes(hotel.status)) {
    const isOwner = hotel.ownerId === req.user?.sub;
    const isAdmin = req.user?.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const isStaff = req.user?.hotelIds?.includes(hotel.id);
    if (!isOwner && !isAdmin && !isStaff) {
      throw AppError.notFound('Hotel');
    }
  }

  sendSuccess(res, hotel);
});

hotelRouter.patch(
  '/:hotelId',
  authenticate,
  requirePermission(PERMISSIONS.HOTEL_UPDATE),
  requireHotelAccess,
  validate(updateHotelSchema),
  async (req: AuthRequest, res: Response) => {
    const hotel = await hotelService.updateHotel(param(req.params.hotelId), req.user!.sub, req.body);
    sendSuccess(res, hotel);
  }
);

hotelRouter.get('/:hotelId/availability', async (req: AuthRequest, res: Response) => {
  const { checkIn, checkOut } = req.query as { checkIn: string; checkOut: string };
  if (!checkIn || !checkOut) throw AppError.badRequest('checkIn and checkOut are required');

  const availability = await hotelService.getAvailability(param(req.params.hotelId), checkIn, checkOut);
  sendSuccess(res, availability);
});

hotelRouter.get(
  '/:hotelId/inventory',
  authenticate,
  requirePermission(PERMISSIONS.ROOM_READ),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const start = startDate || new Date().toISOString().slice(0, 10);
    const end = endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const summary = await hotelService.getInventorySummary(param(req.params.hotelId), start, end);
    sendSuccess(res, summary);
  }
);

hotelRouter.get('/:hotelId/room-types', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { roomRepository } = await import('../repositories/room.repository');
  const roomTypes = await roomRepository.listRoomTypes(param(req.params.hotelId));
  sendSuccess(res, roomTypes);
});

hotelRouter.post(
  '/:hotelId/room-types',
  authenticate,
  requirePermission(PERMISSIONS.ROOM_CREATE),
  requireHotelAccess,
  validate(createRoomTypeSchema),
  async (req: AuthRequest, res: Response) => {
    const roomType = await hotelService.createRoomType(param(req.params.hotelId), req.user!.sub, req.body);
    sendCreated(res, roomType);
  }
);

hotelRouter.get(
  '/:hotelId/rooms',
  authenticate,
  requirePermission(PERMISSIONS.ROOM_READ),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const { roomRepository } = await import('../repositories/room.repository');
    const rooms = await roomRepository.listRooms(
      param(req.params.hotelId),
      req.query.roomTypeId as string | undefined
    );
    sendSuccess(res, rooms);
  }
);

hotelRouter.post(
  '/:hotelId/rooms',
  authenticate,
  requirePermission(PERMISSIONS.ROOM_CREATE),
  requireHotelAccess,
  validate(createRoomSchema),
  async (req: AuthRequest, res: Response) => {
    const room = await hotelService.createRoom(
      param(req.params.hotelId),
      req.user!.sub,
      req.body.roomTypeId,
      req.body.roomNumber,
      req.body.floor,
      req.body.notes
    );
    sendCreated(res, room);
  }
);

hotelRouter.patch(
  '/:hotelId/rooms/:roomId/status',
  authenticate,
  requirePermission(PERMISSIONS.PMS_ROOM_STATUS),
  requireHotelAccess,
  validate(updateRoomStatusSchema),
  async (req: AuthRequest, res: Response) => {
    const room = await hotelService.updateRoomStatus(
      param(req.params.hotelId),
      param(req.params.roomId),
      req.user!.sub,
      req.body.status,
      req.body.notes
    );
    sendSuccess(res, room);
  }
);

hotelRouter.get(
  '/:hotelId/rate-plans',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_READ),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const { roomRepository } = await import('../repositories/room.repository');
    const plans = await roomRepository.listRatePlans(
      param(req.params.hotelId),
      req.query.roomTypeId as string | undefined
    );
    sendSuccess(res, plans);
  }
);

hotelRouter.post(
  '/:hotelId/rate-plans',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_UPDATE),
  requireHotelAccess,
  validate(createRatePlanSchema),
  async (req: AuthRequest, res: Response) => {
    const { roomRepository } = await import('../repositories/room.repository');
    const plan = await roomRepository.createRatePlan({
      hotel: { connect: { id: param(req.params.hotelId) } },
      roomType: { connect: { id: req.body.roomTypeId } },
      name: req.body.name,
      description: req.body.description,
      isRefundable: req.body.isRefundable ?? true,
      cancellationHours: req.body.cancellationHours ?? 24,
    });
    sendCreated(res, plan);
  }
);

hotelRouter.put(
  '/:hotelId/rate-plans/:ratePlanId/prices',
  authenticate,
  requirePermission(PERMISSIONS.PRICING_UPDATE),
  requireHotelAccess,
  validate(updatePricesSchema),
  async (req: AuthRequest, res: Response) => {
    const plan = await hotelService.updatePrices(
      param(req.params.hotelId),
      param(req.params.ratePlanId),
      req.user!.sub,
      req.body.prices
    );
    sendSuccess(res, plan);
  }
);

hotelRouter.post(
  '/:hotelId/complaints',
  validate(guestComplaintSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw AppError.notFound('Hotel');
    const complaint = await prisma.hotelComplaint.create({
      data: {
        hotelId,
        guestName: req.body.guestName,
        guestEmail: req.body.guestEmail,
        category: req.body.category,
        subject: req.body.subject,
        description: req.body.description,
        status: 'OPEN',
      },
    });
    sendCreated(res, complaint);
  }
);
