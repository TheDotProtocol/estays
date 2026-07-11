import { Response, Router } from 'express';
import { partnerService } from '../services/partner.service';
import { hotelEventBus } from '../lib/event-bus';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import { reviewReplySchema, reviewStatusSchema, onboardPropertySchema, PERMISSIONS } from '@estays/shared';
import { hotelService } from '../services/hotel.service';

export const partnerRouter = Router();

partnerRouter.post(
  '/properties/onboard',
  authenticate,
  requirePermission(PERMISSIONS.HOTEL_CREATE),
  validate(onboardPropertySchema),
  async (req: AuthRequest, res: Response) => {
    const result = await hotelService.onboardProperty(req.user!.sub, req.body);
    sendCreated(res, result);
  }
);

partnerRouter.get(
  '/hotels/:hotelId/dashboard',
  authenticate,
  requirePermission(PERMISSIONS.BOOKING_READ),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const data = await partnerService.getLiveDashboard(hotelId, req.user!.sub, isAdmin);
    sendSuccess(res, data);
  }
);

partnerRouter.get(
  '/hotels/:hotelId/live',
  authenticate,
  requirePermission(PERMISSIONS.BOOKING_READ),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = async () => {
      try {
        const data = await partnerService.getLiveDashboard(hotelId, req.user!.sub, isAdmin);
        res.write(`data: ${JSON.stringify({ success: true, data })}\n\n`);
      } catch {
        res.write(`data: ${JSON.stringify({ success: false })}\n\n`);
      }
    };

    await sendUpdate();
    const interval = setInterval(sendUpdate, 5000);

    const onEvent = (event: { hotelId: string }) => {
      if (event.hotelId === hotelId) sendUpdate();
    };
    hotelEventBus.on(`hotel:${hotelId}`, onEvent);

    req.on('close', () => {
      clearInterval(interval);
      hotelEventBus.off(`hotel:${hotelId}`, onEvent);
    });
  }
);

partnerRouter.post(
  '/hotels/:hotelId/reviews/:reviewId/reply',
  authenticate,
  requirePermission(PERMISSIONS.HOTEL_UPDATE),
  validate(reviewReplySchema),
  async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const review = await partnerService.replyToReview(
      param(req.params.reviewId),
      param(req.params.hotelId),
      req.user!.sub,
      req.body.reply,
      isAdmin
    );
    sendSuccess(res, review);
  }
);

partnerRouter.patch(
  '/hotels/:hotelId/reviews/:reviewId/status',
  authenticate,
  requirePermission(PERMISSIONS.HOTEL_UPDATE),
  validate(reviewStatusSchema),
  async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
    const review = await partnerService.updateReviewStatus(
      param(req.params.reviewId),
      param(req.params.hotelId),
      req.user!.sub,
      req.body.status,
      isAdmin
    );
    sendSuccess(res, review);
  }
);
