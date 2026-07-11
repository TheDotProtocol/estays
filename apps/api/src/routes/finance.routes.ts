import { Response, Router } from 'express';
import path from 'path';
import { settlementService } from '../services/settlement.service';
import { commissionService } from '../services/commission.service';
import { commissionRepository } from '../repositories/commission.repository';
import { sendSuccess, sendCreated, buildPaginationMeta } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission, requireHotelAccess } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import {
  PERMISSIONS,
  settlementSearchSchema,
  settlementAdjustmentSchema,
  commissionRuleSchema,
  billingConfigSchema,
} from '@estays/shared';

export const financeRouter = Router();

// ─── Partner Finance ───────────────────────────────────────────────

financeRouter.get(
  '/partner/hotels/:hotelId/finance/summary',
  authenticate,
  requirePermission(PERMISSIONS.FINANCE_READ),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const data = await settlementService.getPartnerFinanceSummary(param(req.params.hotelId));
    sendSuccess(res, data);
  }
);

financeRouter.get(
  '/partner/hotels/:hotelId/finance/settlements',
  authenticate,
  requirePermission(PERMISSIONS.FINANCE_READ),
  requireHotelAccess,
  validate(settlementSearchSchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { page, limit, status, startDate, endDate } = req.query as Record<string, string>;
    const result = await settlementService.searchSettlements({
      hotelId,
      status,
      startDate,
      endDate,
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });
    sendSuccess(res, result.settlements, 200, buildPaginationMeta(parseInt(page || '1', 10), parseInt(limit || '20', 10), result.total));
  }
);

financeRouter.get(
  '/partner/hotels/:hotelId/finance/settlements/:settlementId',
  authenticate,
  requirePermission(PERMISSIONS.FINANCE_READ),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const settlement = await settlementService.getSettlement(param(req.params.settlementId));
    sendSuccess(res, settlement);
  }
);

financeRouter.post(
  '/partner/hotels/:hotelId/finance/settlements/:settlementId/accept',
  authenticate,
  requirePermission(PERMISSIONS.FINANCE_SETTLE),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const updated = await settlementService.partnerAcceptSettlement(
      param(req.params.settlementId),
      req.user!.sub,
      req.ip
    );
    sendSuccess(res, updated);
  }
);

financeRouter.post(
  '/partner/hotels/:hotelId/finance/settlements/:settlementId/settle',
  authenticate,
  requirePermission(PERMISSIONS.FINANCE_SETTLE),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const updated = await settlementService.partnerSettlePayment(
      param(req.params.settlementId),
      req.user!.sub,
      req.ip
    );
    sendSuccess(res, updated);
  }
);

financeRouter.get(
  '/partner/hotels/:hotelId/finance/settlements/:settlementId/documents/:type',
  authenticate,
  requirePermission(PERMISSIONS.FINANCE_READ),
  requireHotelAccess,
  async (req: AuthRequest, res: Response) => {
    const settlement = await settlementService.getSettlement(param(req.params.settlementId));
    const type = String(req.params.type || '').toUpperCase();
    const doc = settlement.documents.find((d) => d.type === type);
    if (!doc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    res.setHeader('Content-Type', doc.mimeType);
    return res.sendFile(path.resolve(doc.filePath), {
      headers: { 'Content-Disposition': `attachment; filename="${doc.fileName}"` },
    });
  }
);

// ─── Admin Billing ─────────────────────────────────────────────────

financeRouter.get(
  '/admin/billing/dashboard',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  async (_req: AuthRequest, res: Response) => {
    const data = await settlementService.getAdminBillingDashboard();
    sendSuccess(res, data);
  }
);

financeRouter.get(
  '/admin/billing/settlements',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  validate(settlementSearchSchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const q = req.query as Record<string, string>;
    const result = await settlementService.searchSettlements({
      hotelId: q.hotelId,
      partnerId: q.partnerId,
      status: q.status,
      startDate: q.startDate,
      endDate: q.endDate,
      page: parseInt(q.page || '1', 10),
      limit: parseInt(q.limit || '20', 10),
    });
    sendSuccess(res, result.settlements, 200, buildPaginationMeta(parseInt(q.page || '1', 10), parseInt(q.limit || '20', 10), result.total));
  }
);

financeRouter.post(
  '/admin/billing/settlements/generate-weekly',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  async (req: AuthRequest, res: Response) => {
    const { hotelId, weekEnd } = req.body as { hotelId?: string; weekEnd?: string };
    const weekEndDate = weekEnd ? new Date(weekEnd) : new Date();
    if (hotelId) {
      const s = await settlementService.generateWeeklySettlement(hotelId, weekEndDate, req.user!.sub);
      return sendCreated(res, s ?? { message: 'No unsettled bookings for this week' });
    }
    const results = await settlementService.generateAllWeeklySettlements(weekEndDate, req.user!.sub);
    sendCreated(res, { generated: results.length, settlements: results });
  }
);

financeRouter.post(
  '/admin/billing/settlements/generate-daily',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  async (req: AuthRequest, res: Response) => {
    const { hotelId, date } = req.body as { hotelId?: string; date?: string };
    const settlementDate = date ? new Date(date) : new Date();
    if (hotelId) {
      const s = await settlementService.generateDailySettlement(hotelId, settlementDate, req.user!.sub);
      return sendCreated(res, s ?? { message: 'No unsettled bookings' });
    }
    const results = await settlementService.generateAllDailySettlements(settlementDate, req.user!.sub);
    sendCreated(res, { generated: results.length, settlements: results });
  }
);

financeRouter.post(
  '/admin/billing/adjustments',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  validate(settlementAdjustmentSchema),
  async (req: AuthRequest, res: Response) => {
    const { hotelId, entryType, description, amount } = req.body;
    const adj = await settlementService.addManualAdjustment(
      hotelId,
      entryType,
      description,
      amount,
      req.user!.sub
    );
    sendCreated(res, adj);
  }
);

financeRouter.get(
  '/admin/billing/commission-rules',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  async (req: AuthRequest, res: Response) => {
    const hotelId = req.query.hotelId as string | undefined;
    const rules = hotelId
      ? await commissionRepository.listForHotel(hotelId)
      : await commissionRepository.listForHotel('');
    sendSuccess(res, rules);
  }
);

financeRouter.post(
  '/admin/billing/commission-rules',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  validate(commissionRuleSchema),
  async (req: AuthRequest, res: Response) => {
    const body = req.body;
    const rule = await commissionRepository.create({
      name: body.name,
      type: body.type,
      flatAmount: body.flatAmount,
      percentageRate: body.percentageRate,
      promotionalRate: body.promotionalRate,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
      hotel: body.hotelId ? { connect: { id: body.hotelId } } : undefined,
      createdById: req.user!.sub,
    });
    sendCreated(res, rule);
  }
);

financeRouter.get(
  '/admin/billing/config',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  async (_req: AuthRequest, res: Response) => {
    const { billingConfigRepository } = await import('../repositories/ledger.repository');
    const config = await billingConfigRepository.get();
    sendSuccess(res, config);
  }
);

financeRouter.patch(
  '/admin/billing/config',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  validate(billingConfigSchema),
  async (req: AuthRequest, res: Response) => {
    const { billingConfigRepository } = await import('../repositories/ledger.repository');
    const config = await billingConfigRepository.update(req.body);
    sendSuccess(res, config);
  }
);

// Commission preview
financeRouter.get(
  '/admin/billing/commission/preview',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_BILLING),
  async (req: AuthRequest, res: Response) => {
    const hotelId = req.query.hotelId as string;
    const amount = parseFloat(req.query.amount as string) || 1200;
    const category = (req.query.category as 'PAID_ONLINE' | 'PAY_AT_HOTEL') || 'PAID_ONLINE';
    const calc = await commissionService.calculate(hotelId, amount, category);
    sendSuccess(res, calc);
  }
);
