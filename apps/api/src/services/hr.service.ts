import { prisma } from '@estays/database';
import { assertHotelAccess } from '../utils/hotel-access';
import { AppError } from '../utils/app-error';
import { parseDecimal } from '../utils/helpers';
import { auditRepository } from '../repositories/audit.repository';

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
      const daysAbsent = daysInPeriod - daysPresent;
      const basic = parseDecimal(emp.basicSalary);
      const hra = basic * parseDecimal(emp.hraPercent);
      const monthlyGross = basic + hra;
      const dailyRate = monthlyGross / 30;
      const grossSalary = Math.round(dailyRate * daysPresent * 100) / 100;
      const pfDeduction = Math.round(basic * 0.12 * (daysPresent / daysInPeriod) * 100) / 100;
      const tdsDeduction = Math.round(grossSalary * 0.05 * 100) / 100;
      const totalDed = pfDeduction + tdsDeduction;
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
}

export const hrService = new HrService();
