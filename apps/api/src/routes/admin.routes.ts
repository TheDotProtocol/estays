import { Response, Router } from 'express';
import { adminService } from '../services/admin.service';
import { hotelService } from '../services/hotel.service';
import { sendSuccess, buildPaginationMeta } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import { approveHotelSchema, paginationSchema, PERMISSIONS } from '@estays/shared';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRole('SUPER_ADMIN', 'ADMIN'));

adminRouter.get('/dashboard', requirePermission(PERMISSIONS.ADMIN_ANALYTICS), async (_req: AuthRequest, res: Response) => {
  const stats = await adminService.getDashboardStats();
  sendSuccess(res, stats);
});

adminRouter.get('/performance', requirePermission(PERMISSIONS.ADMIN_ANALYTICS), async (_req: AuthRequest, res: Response) => {
  const data = await adminService.getPropertyPerformance();
  sendSuccess(res, data);
});

adminRouter.get('/profit-loss', requirePermission(PERMISSIONS.ADMIN_ANALYTICS), async (_req: AuthRequest, res: Response) => {
  const data = await adminService.getProfitLoss();
  sendSuccess(res, data);
});

adminRouter.get('/transactions', requirePermission(PERMISSIONS.ADMIN_ANALYTICS), validate(paginationSchema, 'query'), async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await adminService.listTransactions(page, limit);
  sendSuccess(res, result.transactions, 200, buildPaginationMeta(page, limit, result.total));
});

adminRouter.get('/complaints', requirePermission(PERMISSIONS.ADMIN_ANALYTICS), async (_req: AuthRequest, res: Response) => {
  const data = await adminService.listComplaints();
  sendSuccess(res, data);
});

adminRouter.patch('/complaints/:complaintId/status', requirePermission(PERMISSIONS.ADMIN_ANALYTICS), async (req: AuthRequest, res: Response) => {
  const { status, resolution } = req.body as { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; resolution?: string };
  const complaint = await adminService.updateComplaintStatus(param(req.params.complaintId), status, resolution);
  sendSuccess(res, complaint);
});

adminRouter.get('/feedback', requirePermission(PERMISSIONS.ADMIN_ANALYTICS), async (_req: AuthRequest, res: Response) => {
  const data = await adminService.listFeedback();
  sendSuccess(res, data);
});

adminRouter.get('/hotels/pending', requirePermission(PERMISSIONS.HOTEL_APPROVE), validate(paginationSchema, 'query'), async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await adminService.listPendingHotels(page, limit);
  sendSuccess(res, result.hotels, 200, buildPaginationMeta(page, limit, result.total));
});

adminRouter.get('/hotels', requirePermission(PERMISSIONS.HOTEL_READ), validate(paginationSchema, 'query'), async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const status = req.query.status as string | undefined;
  const result = await adminService.listAllHotels(page, limit, status);
  sendSuccess(res, result.hotels, 200, buildPaginationMeta(page, limit, result.total));
});

adminRouter.patch(
  '/hotels/:hotelId/status',
  requirePermission(PERMISSIONS.HOTEL_APPROVE),
  validate(approveHotelSchema),
  async (req: AuthRequest, res: Response) => {
    const hotel = await hotelService.approveHotel(
      param(req.params.hotelId),
      req.user!.sub,
      req.body.status,
      req.body.rejectionReason
    );
    sendSuccess(res, hotel);
  }
);

adminRouter.get('/users', requirePermission(PERMISSIONS.ADMIN_USERS), validate(paginationSchema, 'query'), async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await adminService.listUsers(page, limit);
  sendSuccess(res, result.users, 200, buildPaginationMeta(page, limit, result.total));
});

adminRouter.get('/partners', requirePermission(PERMISSIONS.ADMIN_USERS), async (_req: AuthRequest, res: Response) => {
  const partners = await adminService.listAllPartners();
  sendSuccess(res, partners);
});

adminRouter.get('/partners/pending', requirePermission(PERMISSIONS.ADMIN_USERS), async (_req: AuthRequest, res: Response) => {
  const partners = await adminService.listPendingPartners();
  sendSuccess(res, partners);
});

adminRouter.patch('/partners/:userId/status', requirePermission(PERMISSIONS.ADMIN_USERS), async (req: AuthRequest, res: Response) => {
  const { status } = req.body as { status: 'APPROVED' | 'REJECTED' };
  const partner = await adminService.updatePartnerStatus(param(req.params.userId), status, req.user!.sub);
  sendSuccess(res, partner);
});

adminRouter.post('/payments/:paymentId/refund', requirePermission(PERMISSIONS.PAYMENT_REFUND), async (req: AuthRequest, res: Response) => {
  const { paymentService } = await import('../services/payment.service');
  const { amount } = (req.body || {}) as { amount?: number };
  const result = await paymentService.refundPayment(param(req.params.paymentId), req.user!.sub, amount);
  sendSuccess(res, result);
});
