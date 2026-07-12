import { Response, Router } from 'express';
import { hrService } from '../services/hr.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { param } from '../utils/params';
import {
  createEmployeeSchema,
  attendanceClockSchema,
  payrollRunSchema,
  analyticsQuerySchema,
  PERMISSIONS,
} from '@estays/shared';

export const hrRouter = Router();

function isAdminUser(req: AuthRequest) {
  return req.user!.roles.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
}

hrRouter.get(
  '/hotels/:hotelId/summary',
  authenticate,
  requirePermission(PERMISSIONS.HR_READ),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const data = await hrService.getHrSummary(hotelId, req.user!.sub, isAdminUser(req));
    sendSuccess(res, data);
  }
);

hrRouter.get(
  '/hotels/:hotelId/employees',
  authenticate,
  requirePermission(PERMISSIONS.HR_READ),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const data = await hrService.listEmployees(hotelId, req.user!.sub, isAdminUser(req));
    sendSuccess(res, data);
  }
);

hrRouter.post(
  '/hotels/:hotelId/employees',
  authenticate,
  requirePermission(PERMISSIONS.HR_MANAGE),
  validate(createEmployeeSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const data = await hrService.createEmployee(hotelId, req.user!.sub, isAdminUser(req), req.body);
    sendCreated(res, data);
  }
);

hrRouter.post(
  '/hotels/:hotelId/attendance/clock',
  authenticate,
  requirePermission(PERMISSIONS.HR_ATTENDANCE),
  validate(attendanceClockSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { employeeId, action, notes } = req.body;
    const data = await hrService.clockAttendance(
      hotelId,
      employeeId,
      action,
      req.user!.sub,
      isAdminUser(req),
      notes
    );
    sendSuccess(res, data);
  }
);

hrRouter.get(
  '/hotels/:hotelId/attendance',
  authenticate,
  requirePermission(PERMISSIONS.HR_READ),
  validate(analyticsQuerySchema, 'query'),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const data = await hrService.getAttendance(hotelId, req.user!.sub, isAdminUser(req), startDate, endDate);
    sendSuccess(res, data);
  }
);

hrRouter.post(
  '/hotels/:hotelId/payroll/run',
  authenticate,
  requirePermission(PERMISSIONS.HR_PAYROLL),
  validate(payrollRunSchema),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const { periodStart, periodEnd } = req.body;
    const data = await hrService.runPayroll(
      hotelId,
      req.user!.sub,
      isAdminUser(req),
      periodStart,
      periodEnd
    );
    sendCreated(res, data);
  }
);

hrRouter.get(
  '/hotels/:hotelId/payroll',
  authenticate,
  requirePermission(PERMISSIONS.HR_READ),
  async (req: AuthRequest, res: Response) => {
    const hotelId = param(req.params.hotelId);
    const data = await hrService.listPayrollRuns(hotelId, req.user!.sub, isAdminUser(req));
    sendSuccess(res, data);
  }
);
