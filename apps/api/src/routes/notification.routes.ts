import { Response, Router } from 'express';
import { notificationRepository } from '../repositories/notification.repository';
import { sendSuccess, buildPaginationMeta } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import { paginationSchema, PERMISSIONS } from '@estays/shared';

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.use(requirePermission(PERMISSIONS.NOTIFICATION_READ));

notificationRouter.get('/', validate(paginationSchema, 'query'), async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const unreadOnly = req.query.unread === 'true';
  const result = await notificationRepository.listForUser(req.user!.sub, page, limit, unreadOnly);
  sendSuccess(res, result.notifications, 200, buildPaginationMeta(page, limit, result.total));
});

notificationRouter.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  await notificationRepository.markRead(param(req.params.id), req.user!.sub);
  sendSuccess(res, { read: true });
});

notificationRouter.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await notificationRepository.markAllRead(req.user!.sub);
  sendSuccess(res, { read: true });
});
