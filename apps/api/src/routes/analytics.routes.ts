import { Response, Router } from 'express';
import { analyticsService } from '../services/analytics.service';
import { sendSuccess } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import { analyticsQuerySchema, PERMISSIONS } from '@estays/shared';

export const analyticsRouter = Router();

function isAdminUser(req: AuthRequest) {
  return req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
}

analyticsRouter.get(
  '/platform',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_ANALYTICS),
  validate(analyticsQuerySchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, groupBy } = req.query as {
      startDate: string;
      endDate: string;
      groupBy: 'day' | 'week' | 'month';
    };
    const data = await analyticsService.getPlatformAnalytics(startDate, endDate, groupBy);
    sendSuccess(res, data);
  }
);

analyticsRouter.get(
  '/hotels/:hotelId',
  authenticate,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  validate(analyticsQuerySchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { startDate, endDate, groupBy } = req.query as {
      startDate: string;
      endDate: string;
      groupBy: 'day' | 'week' | 'month';
    };
    const data = await analyticsService.getHotelAnalytics(
      hotelId,
      req.user!.sub,
      isAdminUser(req),
      startDate,
      endDate,
      groupBy
    );
    sendSuccess(res, data);
  }
);
