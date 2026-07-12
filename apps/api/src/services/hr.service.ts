import { prisma } from '@estays/database';
import { assertHotelAccess } from '../utils/hotel-access';
import { AppError } from '../utils/app-error';
import { parseDecimal } from '../utils/helpers';
import { auditRepository } from '../repositories/audit.repository';
import { generatePayslipPdf } from './payslip-pdf.service';

function dateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysInRange(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

export class HrService {
  async listEmployees(hotelId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    return prisma.employee.findMany({
      where: { hotelId },
      orderBy: { firstName: 'asc' },
    });
  }

  async createEmployee(
    hotelId: string,
    userId: string,
    isAdmin: boolean,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      department?: string;
      designation?: string;
      joinDate: string;
      basicSalary: number;
      hraPercent?: number;
    }
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const count = await prisma.employee.count({ where: { hotelId } });
    const employeeCode = `EMP-${String(count + 1).padStart(4, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        hotelId,
        employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        department: data.department,
        designation: data.designation,
        joinDate: new Date(data.joinDate),
        basicSalary: data.basicSalary,
        hraPercent: data.hraPercent ?? 0.4,
      },
    });

    await auditRepository.log({
      userId,
      hotelId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: employee.id,
    });

    return employee;
  }

  async clockAttendance(
    hotelId: string,
    employeeId: string,
    action: 'IN' | 'OUT',
    userId: string,
    isAdmin: boolean,
    notes?: string
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, hotelId, status: 'ACTIVE' },
    });
    if (!employee) throw AppError.notFound('Employee');

    const today = dateOnly(new Date());
    const now = new Date();

    if (action === 'IN') {
      const record = await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date: today } },
        create: {
          employeeId,
          hotelId,
          date: today,
          clockIn: now,
          status: 'PRESENT',
          notes,
        },
        update: {
          clockIn: now,
          status: 'PRESENT',
          notes,
        },
      });
      return record;
    }

    const existing = await prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!existing?.clockIn) throw AppError.badRequest('Must clock in first');

    return prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { clockOut: now, notes: notes || existing.notes },
    });
  }

  async getAttendance(hotelId: string, userId: string, isAdmin: boolean, startDate: string, endDate: string) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    return prisma.attendanceRecord.findMany({
      where: {
        hotelId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      orderBy: [{ date: 'desc' }, { employee: { firstName: 'asc' } }],
    });
  }

  async runPayroll(
    hotelId: string,
    userId: string,
    isAdmin: boolean,
    periodStart: string,
    periodEnd: string
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const daysInPeriod = daysInRange(start, end);

    const employees = await prisma.employee.findMany({
      where: { hotelId, status: 'ACTIVE' },
    });

    if (employees.length === 0) throw AppError.badRequest('No active employees');

    const attendance = await prisma.attendanceRecord.findMany({
      where: {
        hotelId,
        date: { gte: start, lte: end },
        status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] },
      },
    });

    const approvedLeave = await prisma.leaveRequest.findMany({
      where: {
        hotelId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    const leaveDaysByEmployee = new Map<string, number>();
    for (const leave of approvedLeave) {
      const ls = leave.startDate > start ? leave.startDate : start;
      const le = leave.endDate < end ? leave.endDate : end;
      const days = daysInRange(ls, le);
      leaveDaysByEmployee.set(leave.employeeId, (leaveDaysByEmployee.get(leave.employeeId) || 0) + days);
    }

    const attByEmployee = new Map<string, number>();
    for (const a of attendance) {
      const weight = a.status === 'HALF_DAY' ? 0.5 : 1;
      attByEmployee.set(a.employeeId, (attByEmployee.get(a.employeeId) || 0) + weight);
    }

    const payslips: {
      employeeId: string;
      daysInPeriod: number;
      daysPresent: number;
      daysAbsent: number;
      grossSalary: number;
      totalDeductions: number;
      netSalary: number;
    }[] = [];

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const emp of employees) {
      const daysPresent = Math.min(daysInPeriod, attByEmployee.get(emp.id) || 0);
      const leaveDays = leaveDaysByEmployee.get(emp.id) || 0;
      const daysAbsent = Math.max(0, daysInPeriod - daysPresent - leaveDays);
      const basic = parseDecimal(emp.basicSalary);
      const hra = basic * parseDecimal(emp.hraPercent);
      const monthlyGross = basic + hra;
      const dailyRate = monthlyGross / 30;
      const grossSalary = Math.round(dailyRate * daysPresent * 100) / 100;
      const pfDeduction = Math.round(basic * 0.12 * (daysPresent / daysInPeriod) * 100) / 100;
      const esiDeduction = Math.round(grossSalary * 0.0075 * 100) / 100;
      const profTax = grossSalary > 15000 ? Math.round(200 * (daysPresent / daysInPeriod) * 100) / 100 : 0;
      const tdsDeduction = Math.round(grossSalary * 0.05 * 100) / 100;
      const totalDed = pfDeduction + esiDeduction + profTax + tdsDeduction;
      const netSalary = Math.round((grossSalary - totalDed) * 100) / 100;

      payslips.push({
        employeeId: emp.id,
        daysInPeriod,
        daysPresent: Math.round(daysPresent),
        daysAbsent,
        grossSalary,
        totalDeductions: totalDed,
        netSalary,
      });

      totalGross += grossSalary;
      totalDeductions += totalDed;
      totalNet += netSalary;
    }

    const run = await prisma.$transaction(async (tx) => {
      const payrollRun = await tx.payrollRun.create({
        data: {
          hotelId,
          periodStart: start,
          periodEnd: end,
          status: 'PROCESSED',
          employeeCount: employees.length,
          totalGross,
          totalDeductions,
          totalNet,
          processedAt: new Date(),
        },
      });

      await tx.payslip.createMany({
        data: payslips.map((p) => ({ payrollRunId: payrollRun.id, ...p })),
      });

      return tx.payrollRun.findUnique({
        where: { id: payrollRun.id },
        include: {
          payslips: {
            include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, designation: true } } },
          },
        },
      });
    });

    await auditRepository.log({
      userId,
      hotelId,
      action: 'PAYROLL_PROCESSED',
      entityType: 'PayrollRun',
      entityId: run!.id,
      newData: { periodStart, periodEnd, totalNet },
    });

    return run;
  }

  async listPayrollRuns(hotelId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    return prisma.payrollRun.findMany({
      where: { hotelId },
      orderBy: { periodStart: 'desc' },
      include: {
        payslips: {
          include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
        },
      },
    });
  }

  async getHrSummary(hotelId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const today = dateOnly(new Date());

    const [employeeCount, activeCount, todayPresent, lastPayroll] = await Promise.all([
      prisma.employee.count({ where: { hotelId } }),
      prisma.employee.count({ where: { hotelId, status: 'ACTIVE' } }),
      prisma.attendanceRecord.count({
        where: { hotelId, date: today, status: { in: ['PRESENT', 'LATE'] } },
      }),
      prisma.payrollRun.findFirst({
        where: { hotelId },
        orderBy: { periodStart: 'desc' },
      }),
    ]);

    return {
      employeeCount,
      activeCount,
      todayPresent,
      lastPayroll: lastPayroll
        ? {
            id: lastPayroll.id,
            periodStart: lastPayroll.periodStart,
            periodEnd: lastPayroll.periodEnd,
            totalNet: parseDecimal(lastPayroll.totalNet),
            status: lastPayroll.status,
          }
        : null,
    };
  }

  async updateEmployee(
    hotelId: string,
    employeeId: string,
    userId: string,
    isAdmin: boolean,
    data: Record<string, unknown>
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, hotelId } });
    if (!emp) throw AppError.notFound('Employee');
    return prisma.employee.update({
      where: { id: employeeId },
      data: {
        department: data.department as string | undefined,
        designation: data.designation as string | undefined,
        basicSalary: data.basicSalary as number | undefined,
        shiftStart: data.shiftStart as string | undefined,
        shiftEnd: data.shiftEnd as string | undefined,
        status: data.status as 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | undefined,
      },
    });
  }

  async requestLeave(
    hotelId: string,
    userId: string,
    isAdmin: boolean,
    data: { employeeId: string; startDate: string; endDate: string; reason: string }
  ) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    return prisma.leaveRequest.create({
      data: {
        hotelId,
        employeeId: data.employeeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
      },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  async listLeave(hotelId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    return prisma.leaveRequest.findMany({
      where: { hotelId },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveLeave(hotelId: string, leaveId: string, userId: string, isAdmin: boolean, approve: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const leave = await prisma.leaveRequest.findFirst({ where: { id: leaveId, hotelId } });
    if (!leave) throw AppError.notFound('Leave request');
    return prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        approvedBy: userId,
      },
    });
  }

  async getPayslipPdf(hotelId: string, payslipId: string, userId: string, isAdmin: boolean) {
    await assertHotelAccess(hotelId, userId, isAdmin);
    const payslip = await prisma.payslip.findFirst({
      where: { id: payslipId },
      include: {
        employee: true,
        payrollRun: { include: { hotel: { select: { name: true } } } },
      },
    });
    if (!payslip || payslip.payrollRun.hotelId !== hotelId) throw AppError.notFound('Payslip');

    const gross = parseDecimal(payslip.grossSalary);
    const deductions = parseDecimal(payslip.totalDeductions);
    return generatePayslipPdf({
      employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
      employeeCode: payslip.employee.employeeCode,
      designation: payslip.employee.designation || 'Staff',
      hotelName: payslip.payrollRun.hotel.name,
      periodStart: payslip.payrollRun.periodStart.toISOString().slice(0, 10),
      periodEnd: payslip.payrollRun.periodEnd.toISOString().slice(0, 10),
      daysPresent: payslip.daysPresent,
      daysAbsent: payslip.daysAbsent,
      grossSalary: payslip.grossSalary,
      totalDeductions: payslip.totalDeductions,
      netSalary: payslip.netSalary,
      deductions: [
        { label: 'PF (12%)', amount: gross * 0.12 },
        { label: 'ESI (0.75%)', amount: gross * 0.0075 },
        { label: 'Professional Tax', amount: gross > 15000 ? 200 : 0 },
        { label: 'TDS (5%)', amount: gross * 0.05 },
      ].filter((d) => d.amount > 0).map((d) => ({ ...d, amount: Math.round(d.amount * 100) / 100 })),
    });
  }
}

export const hrService = new HrService();
