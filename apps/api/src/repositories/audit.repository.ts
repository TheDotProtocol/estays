import { prisma } from '@estays/database';

export class AuditRepository {
  async log(data: {
    userId?: string;
    hotelId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldData?: unknown;
    newData?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        hotelId: data.hotelId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldData: data.oldData as never,
        newData: data.newData as never,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}

export const auditRepository = new AuditRepository();
