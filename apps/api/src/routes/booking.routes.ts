import { Response, Router } from 'express';
import { bookingService } from '../services/booking.service';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import {
  createBookingSchema,
  cancelBookingSchema,
  paginationSchema,
  PERMISSIONS,
} from '@estays/shared';
import { asyncHandler } from '../utils/async-handler';

export const bookingRouter = Router();

bookingRouter.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.BOOKING_CREATE),
  validate(createBookingSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const booking = await bookingService.createBooking(req.user!.sub, req.body);
    sendCreated(res, booking);
  })
);

bookingRouter.get(
  '/my',
  authenticate,
  validate(paginationSchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await bookingService.listBookings({
      guestId: req.user!.sub,
      page,
      limit,
    });
    sendSuccess(res, result.bookings, 200, buildPaginationMeta(page, limit, result.total));
  }
);

bookingRouter.get(
  '/hotel/:hotelId',
  authenticate,
  requirePermission(PERMISSIONS.BOOKING_READ),
  validate(paginationSchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await bookingService.listBookings({
      hotelId: param(req.params.hotelId),
      page,
      limit,
    });
    sendSuccess(res, result.bookings, 200, buildPaginationMeta(page, limit, result.total));
  }
);

bookingRouter.get('/:bookingId', authenticate, async (req: AuthRequest, res: Response) => {
  const booking = await bookingService.getBooking(
    param(req.params.bookingId),
    req.user!.sub,
    req.user!.roles
  );
  sendSuccess(res, booking);
});

bookingRouter.get('/:bookingId/voucher', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await bookingService.getVoucherData(
    param(req.params.bookingId),
    req.user!.sub,
    req.user!.roles
  );
  sendSuccess(res, data);
});

bookingRouter.get('/:bookingId/voucher.pdf', authenticate, async (req: AuthRequest, res: Response) => {
  const pdf = await bookingService.getVoucherPdf(
    param(req.params.bookingId),
    req.user!.sub,
    req.user!.roles
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="estays-${param(req.params.bookingId)}.pdf"`);
  res.send(pdf);
});

bookingRouter.get('/:bookingId/voucher-qr.png', authenticate, async (req: AuthRequest, res: Response) => {
  const png = await bookingService.getVoucherQrPng(
    param(req.params.bookingId),
    req.user!.sub,
    req.user!.roles
  );
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(png);
});

bookingRouter.post(
  '/:bookingId/cancel',
  authenticate,
  requirePermission(PERMISSIONS.BOOKING_CANCEL),
  validate(cancelBookingSchema),
  async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const booking = await bookingService.cancelBooking(
      param(req.params.bookingId),
      req.user!.sub,
      req.body.reason,
      isAdmin
    );
    sendSuccess(res, booking);
  }
);
