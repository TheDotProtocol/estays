import { prisma, Prisma, CommissionType } from '@estays/database';

export class CommissionRepository {
  async findActiveForHotel(hotelId: string, at = new Date()) {
    const hotelRule = await prisma.commissionRule.findFirst({
      where: {
        hotelId,
        isActive: true,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (hotelRule) return hotelRule;

    return prisma.commissionRule.findFirst({
      where: {
        hotelId: null,
        isActive: true,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async create(data: Prisma.CommissionRuleCreateInput) {
    return prisma.commissionRule.create({ data });
  }

  async listForHotel(hotelId: string) {
    return prisma.commissionRule.findMany({
      where: { OR: [{ hotelId }, { hotelId: null }] },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async upsertDefaultPlatformRule(rate: number, type: CommissionType = 'PERCENTAGE') {
    const existing = await prisma.commissionRule.findFirst({
      where: { hotelId: null, isActive: true, type },
    });
    if (existing) {
      return prisma.commissionRule.update({
        where: { id: existing.id },
        data: { percentageRate: rate, name: 'Platform Default Commission' },
      });
    }
    return prisma.commissionRule.create({
      data: {
        name: 'Platform Default Commission',
        type,
        percentageRate: rate,
        isActive: true,
      },
    });
  }
}

export const commissionRepository = new CommissionRepository();
