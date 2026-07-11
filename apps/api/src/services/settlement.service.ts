import fs from 'fs';
import path from 'path';
import { prisma } from '@estays/database';
import { settlementRepository } from '../repositories/settlement.repository';
import { bookingFinancialRepository } from '../repositories/booking-financial.repository';
import { hotelRepository } from '../repositories/hotel.repository';
import { ledgerService } from './ledger.service';
import { settlementEmailService } from './settlement-email.service';
import { settlementPdfService } from './settlement-pdf.service';
import { taxService } from './tax.service';
import { AppError } from '../utils/app-error';
import { parseDecimal } from '../utils/helpers';
import { hotelEventBus } from '../lib/event-bus';
import { SETTLEMENT_TAX_DISCLAIMER } from '@estays/shared';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('settlement-service');
const DOCS_DIR = process.env.SETTLEMENT_DOCS_DIR || path.join(process.cwd(), 'uploads', 'settlements');

function dateOnly(d: Date) {
  return new Date(d.toISOString().slice(0, 10));
}

function formatStatementNumber(hotelId: string, date: Date, seq: number) {
  const slug = hotelId.slice(-6).toUpperCase();
  const ds = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `EST-${slug}-${ds}-${String(seq).padStart(3, '0')}`;
}

function formatWeeklyStatementNumber(hotelId: string, weekEnd: Date, seq: number) {
  const slug = hotelId.slice(-6).toUpperCase();
  const d = weekEnd;
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `EST-${slug}-W${d.getFullYear()}${String(week).padStart(2, '0')}-${String(seq).padStart(3, '0')}`;
}

function weekRange(weekEnd = new Date()) {
  const end = dateOnly(weekEnd);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start, end };
}

function ensureDocsDir() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
}

export class SettlementService {
  async getPartnerFinanceSummary(hotelId: string) {
    const today = await bookingFinancialRepository.getTodayEarnings(hotelId);
    const pending = await settlementRepository.search({
      hotelId,
      status: 'PENDING' as never,
      page: 1,
      limit: 100,
    });
    const completed = await settlementRepository.search({
      hotelId,
      status: 'COMPLETED' as never,
      page: 1,
      limit: 10,
    });
    const unsettled = await bookingFinancialRepository.listUnsettledForHotel(hotelId);

    return {
      todayEarnings: parseDecimal(today._sum.partnerReceivable),
      todayBookings: today._count,
      todayGross: parseDecimal(today._sum.finalAmount),
      todayCommission: parseDecimal(today._sum.commissionAmount),
      pendingSettlements: pending.settlements,
      pendingCount: pending.total,
      completedSettlements: completed.settlements,
      unsettledBookings: unsettled.length,
      unsettledAmount: unsettled.reduce((s, b) => s + parseDecimal(b.partnerReceivable), 0),
    };
  }

  async generateDailySettlement(hotelId: string, settlementDate = new Date(), actorId?: string) {
    const date = dateOnly(settlementDate);
    return this.buildSettlement(hotelId, date, date, 'DAILY', actorId);
  }

  async generateWeeklySettlement(hotelId: string, weekEndDate = new Date(), actorId?: string) {
    const { start, end } = weekRange(weekEndDate);
    return this.buildSettlement(hotelId, start, end, 'WEEKLY', actorId);
  }

  private async buildSettlement(
    hotelId: string,
    periodStart: Date,
    periodEnd: Date,
    periodType: 'DAILY' | 'WEEKLY',
    actorId?: string
  ) {
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) throw AppError.notFound('Hotel');

    await taxService.syncFinanceSettingsFromCountry(hotelId);

    const periodEndCutoff = new Date(periodEnd);
    periodEndCutoff.setHours(23, 59, 59, 999);

    const financials = await bookingFinancialRepository.listUnsettledForHotel(hotelId, {
      periodStart: periodType === 'WEEKLY' ? periodStart : undefined,
      periodEnd: periodEnd,
      beforeDate: periodType === 'DAILY' ? periodEndCutoff : undefined,
    });
    if (financials.length === 0) return null;

    const last = await settlementRepository.getLastForHotel(hotelId);
    const openingBalance = last ? parseDecimal(last.closingBalance) : 0;

    let paidOnlineTotal = 0;
    let payAtHotelTotal = 0;
    let commissionTotal = 0;
    let taxTotal = 0;
    let netPayable = 0;
    let netReceivable = 0;

    const items: {
      bookingFinancialId: string;
      entryType: 'PAID_ONLINE' | 'PAY_AT_HOTEL';
      description: string;
      bookingId: string;
      paymentId?: string;
      grossAmount: number;
      commission: number;
      taxAmount: number;
      netAmount: number;
    }[] = [];

    for (const f of financials) {
      const gross = parseDecimal(f.finalAmount);
      const commission = parseDecimal(f.commissionAmount);
      const tax = parseDecimal(f.taxAmount);
      const partnerNet = parseDecimal(f.partnerReceivable);
      const platformNet = parseDecimal(f.platformReceivable);

      taxTotal += tax;
      commissionTotal += commission;

      if (f.paymentCategory === 'PAID_ONLINE') {
        paidOnlineTotal += gross;
        netPayable += partnerNet;
        items.push({
          bookingFinancialId: f.id,
          entryType: 'PAID_ONLINE',
          description: `Paid online — ${f.bookingNumber}`,
          bookingId: f.bookingId,
          paymentId: f.paymentId ?? undefined,
          grossAmount: gross,
          commission,
          taxAmount: tax,
          netAmount: partnerNet,
        });
      } else {
        payAtHotelTotal += gross;
        netReceivable += platformNet;
        items.push({
          bookingFinancialId: f.id,
          entryType: 'PAY_AT_HOTEL',
          description: `Pay at hotel — ${f.bookingNumber}`,
          bookingId: f.bookingId,
          paymentId: f.paymentId ?? undefined,
          grossAmount: gross,
          commission,
          taxAmount: tax,
          netAmount: platformNet,
        });
      }
    }

    const pendingAdjustments = await prisma.settlementAdjustment.findMany({
      where: { hotelId, settlementId: null },
    });

    let creditsTotal = 0;
    let debitsTotal = 0;
    for (const adj of pendingAdjustments) {
      const amt = parseDecimal(adj.amount);
      if (adj.entryType === 'MANUAL_CREDIT') creditsTotal += amt;
      else debitsTotal += amt;
    }

    // GST/VAT is tracked in taxTotal for reporting only — not added to netSettlement payout.
    const netSettlement = netPayable - netReceivable + creditsTotal - debitsTotal;
    const closingBalance = openingBalance + netSettlement;

    const settlementDate = dateOnly(periodEnd);
    const seq =
      periodType === 'WEEKLY'
        ? (await settlementRepository.countStatementsForDate(hotelId, settlementDate)) + 1
        : (await settlementRepository.countStatementsForDate(hotelId, settlementDate)) + 1;
    const statementNumber =
      periodType === 'WEEKLY'
        ? formatWeeklyStatementNumber(hotelId, settlementDate, seq)
        : formatStatementNumber(hotelId, settlementDate, seq);

    const settlement = await settlementRepository.create({
      statementNumber,
      hotel: { connect: { id: hotelId } },
      partnerId: hotel.ownerId,
      settlementDate,
      periodStart: dateOnly(periodStart),
      periodEnd: dateOnly(periodEnd),
      periodType,
      openingBalance,
      paidOnlineTotal,
      payAtHotelTotal,
      refundsTotal: 0,
      creditsTotal,
      debitsTotal,
      commissionTotal,
      taxTotal,
      netPayable,
      netReceivable,
      netSettlement,
      closingBalance,
      bookingCount: financials.length,
      status: 'PENDING',
      items: {
        create: items.map((i) => ({
          hotelId,
          bookingFinancialId: i.bookingFinancialId,
          entryType: i.entryType,
          description: i.description,
          bookingId: i.bookingId,
          paymentId: i.paymentId,
          grossAmount: i.grossAmount,
          commission: i.commission,
          taxAmount: i.taxAmount,
          netAmount: i.netAmount,
        })),
      },
      adjustments: pendingAdjustments.length
        ? { connect: pendingAdjustments.map((a) => ({ id: a.id })) }
        : undefined,
    });

    await bookingFinancialRepository.markPendingSettlement(
      financials.map((f) => f.id),
      settlement.id
    );

    await settlementRepository.addAuditLog({
      settlement: { connect: { id: settlement.id } },
      action: 'SETTLEMENT_GENERATED',
      actorId,
      newStatus: 'PENDING',
      metadata: { bookingCount: financials.length, statementNumber, periodType },
    });

    await this.generateDocuments(settlement.id);

    hotelEventBus.publish({
      hotelId,
      type: 'settlement.generated',
      timestamp: new Date().toISOString(),
      data: { settlementId: settlement.id, statementNumber, periodType },
    });

    log.info({ hotelId, statementNumber, periodType }, 'Settlement generated');
    return settlementRepository.findById(settlement.id);
  }

  async generateAllDailySettlements(settlementDate = new Date(), actorId?: string) {
    const hotels = await prisma.hotel.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      select: { id: true, name: true },
    });
    const results = [];
    for (const h of hotels) {
      const s = await this.generateDailySettlement(h.id, settlementDate, actorId);
      if (s) results.push(s);
    }
    return results;
  }

  async generateAllWeeklySettlements(weekEndDate = new Date(), actorId?: string) {
    const hotels = await prisma.hotel.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      select: { id: true },
    });
    const results = [];
    for (const h of hotels) {
      const s = await this.generateWeeklySettlement(h.id, weekEndDate, actorId);
      if (s) results.push(s);
    }
    return results;
  }

  async partnerAcceptSettlement(settlementId: string, partnerId: string, ipAddress?: string) {
    const settlement = await settlementRepository.findById(settlementId);
    if (!settlement) throw AppError.notFound('Settlement');
    if (settlement.partnerId !== partnerId) throw AppError.forbidden('Not your settlement');
    if (settlement.status !== 'PENDING') throw AppError.badRequest('Settlement is not pending acceptance');

    const updated = await settlementRepository.updateStatus(settlementId, 'ACCEPTED', {
      acceptedAt: new Date(),
    });

    await settlementRepository.addAuditLog({
      settlement: { connect: { id: settlementId } },
      action: 'PARTNER_ACCEPTED',
      actorId: partnerId,
      oldStatus: 'PENDING',
      newStatus: 'ACCEPTED',
      ipAddress,
    });

    return updated;
  }

  async partnerSettlePayment(settlementId: string, partnerId: string, ipAddress?: string) {
    let settlement = await settlementRepository.findById(settlementId);
    if (!settlement) throw AppError.notFound('Settlement');
    if (settlement.partnerId !== partnerId) throw AppError.forbidden('Not your settlement');
    if (!['PENDING', 'ACCEPTED'].includes(settlement.status)) {
      throw AppError.badRequest('Settlement cannot be processed in current status');
    }

    if (settlement.status === 'PENDING') {
      await this.partnerAcceptSettlement(settlementId, partnerId, ipAddress);
      settlement = await settlementRepository.findById(settlementId);
      if (!settlement) throw AppError.notFound('Settlement');
    }

    await settlementRepository.updateStatus(settlementId, 'PROCESSING');
    await settlementRepository.addAuditLog({
      settlement: { connect: { id: settlementId } },
      action: 'SETTLEMENT_PROCESSING',
      actorId: partnerId,
      oldStatus: 'ACCEPTED',
      newStatus: 'PROCESSING',
      ipAddress,
    });

    const transactionRef = `TXN-${settlement.statementNumber}-${Date.now().toString(36).toUpperCase()}`;

    await ledgerService.recordSettlement(settlementId, {
      hotelId: settlement.hotelId,
      statementNumber: settlement.statementNumber,
      netPayable: parseDecimal(settlement.netPayable),
      netReceivable: parseDecimal(settlement.netReceivable),
      netSettlement: parseDecimal(settlement.netSettlement),
      currency: 'USD',
      actorId: partnerId,
    });

    await bookingFinancialRepository.markSettled(settlementId);

    const completed = await settlementRepository.updateStatus(settlementId, 'COMPLETED', {
      settledAt: new Date(),
      completedAt: new Date(),
      transactionRef,
    });

    await settlementRepository.addAuditLog({
      settlement: { connect: { id: settlementId } },
      action: 'SETTLEMENT_COMPLETED',
      actorId: partnerId,
      oldStatus: 'PROCESSING',
      newStatus: 'COMPLETED',
      ipAddress,
      metadata: { transactionRef },
    });

    await this.generateDocuments(settlementId);
    await settlementEmailService.sendSettlementComplete(settlementId);

    hotelEventBus.publish({
      hotelId: settlement.hotelId,
      type: 'settlement.completed',
      timestamp: new Date().toISOString(),
      data: { settlementId, transactionRef },
    });

    return settlementRepository.findById(settlementId);
  }

  async addManualAdjustment(
    hotelId: string,
    entryType: 'MANUAL_CREDIT' | 'MANUAL_DEBIT',
    description: string,
    amount: number,
    actorId: string
  ) {
    return prisma.settlementAdjustment.create({
      data: { hotelId, entryType, description, amount, createdById: actorId },
    });
  }

  async getSettlement(id: string) {
    const s = await settlementRepository.findById(id);
    if (!s) throw AppError.notFound('Settlement');
    return s;
  }

  async searchSettlements(filters: {
    hotelId?: string;
    partnerId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    return settlementRepository.search({
      hotelId: filters.hotelId,
      partnerId: filters.partnerId,
      status: filters.status as never,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      page: filters.page,
      limit: filters.limit,
    });
  }

  async getAdminBillingDashboard() {
    const stats = await settlementRepository.getDashboardStats();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [dailyRevenue, monthlyRevenue] = await Promise.all([
      prisma.bookingFinancial.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { finalAmount: true, commissionAmount: true },
      }),
      prisma.bookingFinancial.aggregate({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
        _sum: { finalAmount: true, commissionAmount: true },
      }),
    ]);

    const partnerBalances = await prisma.settlement.groupBy({
      by: ['hotelId'],
      where: { status: { in: ['PENDING', 'ACCEPTED', 'PROCESSING'] } },
      _sum: { netSettlement: true },
    });

    return {
      ...stats,
      dailyRevenue: parseDecimal(dailyRevenue._sum.finalAmount ?? 0),
      dailyCommission: parseDecimal(dailyRevenue._sum.commissionAmount ?? 0),
      monthlyRevenue: parseDecimal(monthlyRevenue._sum.finalAmount ?? 0),
      monthlyCommission: parseDecimal(monthlyRevenue._sum.commissionAmount ?? 0),
      partnerBalances,
    };
  }

  async generateDocuments(settlementId: string) {
    const settlement = await settlementRepository.findById(settlementId);
    if (!settlement) return;

    const taxConfig = await taxService.resolveForHotel(settlement.hotelId);
    const docPayload = {
      ...settlement,
      taxLabel: taxConfig.label,
      periodType: settlement.periodType,
      taxDisclaimer: SETTLEMENT_TAX_DISCLAIMER,
      items: settlement.items.map((item) => {
        const lineTax =
          parseDecimal(item.taxAmount) ||
          (item.bookingFinancial ? parseDecimal(item.bookingFinancial.taxAmount) : 0);
        return { ...item, taxAmount: lineTax };
      }),
    };

    ensureDocsDir();
    const base = path.join(DOCS_DIR, settlement.statementNumber);

    const statementPdfPath = `${base}-statement.pdf`;
    const receiptPdfPath = `${base}-receipt.pdf`;
    const csvPath = `${base}-statement.csv`;

    await settlementPdfService.writeStatementPdf(docPayload, statementPdfPath, taxConfig.label);
    await settlementPdfService.writeReceiptPdf(docPayload, receiptPdfPath);

    const csv = this.buildCsv(settlement, taxConfig.label);
    fs.writeFileSync(csvPath, csv);

    const docs = [
      {
        type: 'STATEMENT' as const,
        fileName: `${settlement.statementNumber}-statement.pdf`,
        filePath: statementPdfPath,
        mimeType: 'application/pdf',
      },
      {
        type: 'CSV' as const,
        fileName: `${settlement.statementNumber}-statement.csv`,
        filePath: csvPath,
        mimeType: 'text/csv',
      },
      {
        type: 'RECEIPT' as const,
        fileName: `${settlement.statementNumber}-receipt.pdf`,
        filePath: receiptPdfPath,
        mimeType: 'application/pdf',
      },
    ];

    for (const doc of docs) {
      const existing = await prisma.settlementDocument.findFirst({
        where: { settlementId, type: doc.type },
      });
      if (existing) {
        await prisma.settlementDocument.update({
          where: { id: existing.id },
          data: { fileName: doc.fileName, filePath: doc.filePath, mimeType: doc.mimeType },
        });
      } else {
        await settlementRepository.addDocument({
          settlement: { connect: { id: settlementId } },
          type: doc.type,
          fileName: doc.fileName,
          filePath: doc.filePath,
          mimeType: doc.mimeType,
        });
      }
    }
  }

  private buildCsv(
    settlement: NonNullable<Awaited<ReturnType<typeof settlementRepository.findById>>>,
    taxLabel = 'Tax'
  ) {
    const header = 'Type,Description,Gross,Commission,Tax,Net';
    const rows = settlement.items.map(
      (i) =>
        `${i.entryType},"${i.description}",${parseDecimal(i.grossAmount)},${parseDecimal(i.commission)},${parseDecimal(i.taxAmount)},${parseDecimal(i.netAmount)}`
    );
    const summary = [
      '',
      'Summary',
      `Paid Online,${parseDecimal(settlement.paidOnlineTotal)}`,
      `Pay At Hotel,${parseDecimal(settlement.payAtHotelTotal)}`,
      `Commission,${parseDecimal(settlement.commissionTotal)}`,
      `${taxLabel} (informational),${parseDecimal(settlement.taxTotal)}`,
      `Net Settlement,${parseDecimal(settlement.netSettlement)}`,
      `Note,"${SETTLEMENT_TAX_DISCLAIMER}"`,
      `Status,${settlement.status}`,
    ];
    return [header, ...rows, ...summary].join('\n');
  }
}

export const settlementService = new SettlementService();
