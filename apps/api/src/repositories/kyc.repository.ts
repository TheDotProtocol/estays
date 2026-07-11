import { prisma } from '@estays/database';

export class KycRepository {
  async listByUser(userId: string) {
    return prisma.partnerKycDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async create(data: {
    userId: string;
    documentType: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    url: string;
  }) {
    return prisma.partnerKycDocument.create({ data });
  }

  async listPendingPartners() {
    return prisma.user.findMany({
      where: {
        partnerStatus: { in: ['PENDING_KYC', 'PENDING_APPROVAL'] },
        roles: { some: { role: { name: 'PARTNER' } } },
      },
      include: {
        kycDocuments: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const kycRepository = new KycRepository();
