import { prisma, Prisma, SettlementStatus } from '@estays/database';

export class SettlementRepository {
  async create(data: Prisma.SettlementCreateInput) {
    return prisma.settlement.create({
      data,
      include: { items: true, adjustments: true, hotel: true },
    });
  }

  async findById(id: string) {
    return prisma.settlement.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' }, include: { bookingFinancial: { select: { taxAmount: true } } } },
        adjustments: { orderBy: { createdAt: 'asc' } },
        documents: true,
        auditLogs: { orderBy: { createdAt: 'desc' } },
        hotel: { select: { id: true, name: true, city: true, ownerId: true, email: true } },
      },
    });
  }

  async findByStatementNumber(statementNumber: string) {
    return prisma.settlement.findUnique({ where: { statementNumber }, include: { items: true } });
  }

  async getLastForHotel(hotelId: string) {
    return prisma.settlement.findFirst({
      where: { hotelId, status: { in: ['SETTLED', 'COMPLETED'] } },
      orderBy: { settlementDate: 'desc' },
    });
  }

  async updateStatus(id: string, status: SettlementStatus, extra?: Prisma.SettlementUpdateInput) {
    return prisma.settlement.update({
      where: { id },
      data: { status, ...extra },
      include: { items: true, hotel: true },
    });
  }

  async search(filters: {
    hotelId?: string;
    partnerId?: string;
    status?: SettlementStatus;
    startDate?: Date;
    endDate?: Date;
    page: number;
    limit: number;
  }) {
    const where: Prisma.SettlementWhereInput = {};
    if (filters.hotelId) where.hotelId = filters.hotelId;
    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.settlementDate = {};
      if (filters.startDate) where.settlementDate.gte = filters.startDate;
      if (filters.endDate) where.settlementDate.lte = filters.endDate;
    }

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { settlementDate: 'desc' },
        include: { hotel: { select: { name: true, city: true } } },
      }),
      prisma.settlement.count({ where }),
    ]);
    return { settlements, total };
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount, pending, failed, completedToday] = await Promise.all([
      prisma.settlement.count({ where: { settlementDate: { gte: today } } }),
      prisma.settlement.count({ where: { status: { in: ['PENDING', 'ACCEPTED', 'PROCESSING'] } } }),
      prisma.settlement.count({ where: { status: 'FAILED' } }),
      prisma.settlement.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
    ]);

    const outstanding = await prisma.settlement.aggregate({
      where: { status: { in: ['PENDING', 'ACCEPTED', 'PROCESSING'] } },
      _sum: { netSettlement: true, netPayable: true, netReceivable: true },
    });

    const commission = await prisma.settlement.aggregate({
      _sum: { commissionTotal: true },
    });

    return { todayCount, pending, failed, completedToday, outstanding, commission };
  }

  async addAuditLog(data: Prisma.SettlementAuditLogCreateInput) {
    return prisma.settlementAuditLog.create({ data });
  }

  async addDocument(data: Prisma.SettlementDocumentCreateInput) {
    return prisma.settlementDocument.create({ data });
  }

  async countStatementsForDate(hotelId: string, date: Date) {
    return prisma.settlement.count({
      where: { hotelId, settlementDate: date },
    });
  }
}

export const settlementRepository = new SettlementRepository();
