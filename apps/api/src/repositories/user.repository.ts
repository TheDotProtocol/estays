import { prisma } from '@estays/database';
import bcrypt from 'bcryptjs';
import { WELCOME_BONUS_POINTS } from '@estays/shared';

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        hotelStaff: { select: { hotelId: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        hotelStaff: { select: { hotelId: true } },
      },
    });
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    companyName?: string;
    companyAddress?: string;
    roleName?: string;
    emailVerified?: boolean;
    loyaltyPoints?: number;
    partnerStatus?: 'PENDING_KYC' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = await prisma.role.findUnique({ where: { name: (data.roleName || 'GUEST') as never } });
    const isGuest = (data.roleName || 'GUEST') === 'GUEST';

    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        companyName: data.companyName,
        companyAddress: data.companyAddress,
        emailVerified: data.emailVerified ?? false,
        loyaltyPoints: data.loyaltyPoints ?? (isGuest ? WELCOME_BONUS_POINTS : 0),
        loyaltyTier: 'SILVER',
        partnerStatus: data.partnerStatus,
        roles: role ? { create: { roleId: role.id } } : undefined,
      },
      include: { roles: { include: { role: true } } },
    });
  }

  async updatePartnerStatus(id: string, status: 'PENDING_KYC' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED') {
    return prisma.user.update({ where: { id }, data: { partnerStatus: status } });
  }

  async updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async verifyPassword(passwordHash: string, password: string) {
    return bcrypt.compare(password, passwordHash);
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async updateLoyalty(
    id: string,
    data: { loyaltyPoints?: number; loyaltyTier?: string; lifetimeBookings?: number }
  ) {
    return prisma.user.update({
      where: { id },
      data: {
        loyaltyPoints: data.loyaltyPoints,
        loyaltyTier: data.loyaltyTier as never,
        lifetimeBookings: data.lifetimeBookings,
      },
      select: {
        id: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        lifetimeBookings: true,
      },
    });
  }

  async listUsers(page: number, limit: number) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { include: { role: { select: { name: true } } } },
        },
      }),
      prisma.user.count(),
    ]);
    return { users, total };
  }
}

export const userRepository = new UserRepository();
