import { prisma, Prisma } from '@estays/database';

export class LedgerRepository {
  async createJournal(data: Prisma.JournalEntryCreateInput) {
    return prisma.journalEntry.create({ data, include: { entries: true } });
  }

  async createEntries(entries: Prisma.LedgerEntryCreateManyInput[]) {
    return prisma.ledgerEntry.createMany({ data: entries });
  }

  async listForSettlement(settlementId: string) {
    return prisma.ledgerEntry.findMany({
      where: { settlementId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listForHotel(hotelId: string, limit = 50) {
    return prisma.ledgerEntry.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export class BillingConfigRepository {
  async get() {
    let config = await prisma.platformBillingConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.platformBillingConfig.create({
        data: {
          id: 'default',
          settlementNotifyEmails: [],
          billingFromEmail: process.env.EMAIL_FROM || 'noreply@estays.com',
          companyLegalName: 'E Stays Hotels LLC',
        },
      });
    }
    return config;
  }

  async update(data: Prisma.PlatformBillingConfigUpdateInput) {
    return prisma.platformBillingConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        settlementNotifyEmails: (data.settlementNotifyEmails as string[]) || [],
        billingFromEmail: (data.billingFromEmail as string) || 'noreply@estays.com',
        companyLegalName: (data.companyLegalName as string) || 'E Stays Hotels LLC',
      },
      update: data,
    });
  }
}

export const ledgerRepository = new LedgerRepository();
export const billingConfigRepository = new BillingConfigRepository();
