import { Response, Router } from 'express';
import { pmsService } from '../services/pms.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import {
  checkInSchema,
  checkOutSchema,
  addFolioItemSchema,
  updateRoomStatusSchema,
  dailyOpsQuerySchema,
  PERMISSIONS,
} from '@estays/shared';
import { hotelService } from '../services/hotel.service';

export const pmsRouter = Router();

function isAdminUser(req: AuthRequest) {
  return req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
}

pmsRouter.get(
  '/hotels/:hotelId/daily-ops',
  authenticate,
  requirePermission(PERMISSIONS.BOOKING_READ),
  validate(dailyOpsQuerySchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { date } = req.query as { date?: string };
    const data = await pmsService.getDailyOps(hotelId, req.user!.sub, isAdminUser(req), date);
    sendSuccess(res, data);
  }
);

pmsRouter.get(
  '/hotels/:hotelId/room-board',
  authenticate,
  requirePermission(PERMISSIONS.PMS_ROOM_STATUS),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const data = await pmsService.getRoomBoard(hotelId, req.user!.sub, isAdminUser(req));
    sendSuccess(res, data);
  }
);

pmsRouter.post(
  '/hotels/:hotelId/check-in',
  authenticate,
  requirePermission(PERMISSIONS.PMS_CHECKIN),
  validate(checkInSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { bookingId, roomId } = req.body;
    const data = await pmsService.checkIn(hotelId, bookingId, roomId, req.user!.sub, isAdminUser(req));
    sendCreated(res, data);
  }
);

pmsRouter.post(
  '/hotels/:hotelId/check-out',
  authenticate,
  requirePermission(PERMISSIONS.PMS_CHECKOUT),
  validate(checkOutSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { bookingId } = req.body;
    const data = await pmsService.checkOut(hotelId, bookingId, req.user!.sub, isAdminUser(req));
    sendSuccess(res, data);
  }
);

pmsRouter.get(
  '/hotels/:hotelId/bookings/:bookingId/folio',
  authenticate,
  requirePermission(PERMISSIONS.PMS_FOLIO),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const bookingId = param(req.params.bookingId);
    const data = await pmsService.getFolio(hotelId, bookingId, req.user!.sub, isAdminUser(req));
    sendSuccess(res, data);
  }
);

pmsRouter.post(
  '/hotels/:hotelId/bookings/:bookingId/folio/items',
  authenticate,
  requirePermission(PERMISSIONS.PMS_FOLIO),
  validate(addFolioItemSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const bookingId = param(req.params.bookingId);
    const data = await pmsService.addFolioItem(
      hotelId,
      bookingId,
      req.user!.sub,
      isAdminUser(req),
      req.body
    );
    sendCreated(res, data);
  }
);

pmsRouter.patch(
  '/hotels/:hotelId/rooms/:roomId/status',
  authenticate,
  requirePermission(PERMISSIONS.PMS_ROOM_STATUS),
  validate(updateRoomStatusSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const roomId = param(req.params.roomId);
    const { status, notes } = req.body;
    const data = await hotelService.updateRoomStatus(hotelId, roomId, req.user!.sub, status, notes);
    sendSuccess(res, data);
  }
);

pmsRouter.post(
  '/hotels/:hotelId/rooms/:roomId/clean',
  authenticate,
  requirePermission(PERMISSIONS.PMS_ROOM_STATUS),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const roomId = param(req.params.roomId);
    const data = await pmsService.markRoomClean(hotelId, roomId, req.user!.sub, isAdminUser(req));
    sendSuccess(res, data);
  }
);
