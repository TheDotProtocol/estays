import { userRepository } from '../repositories/user.repository';
import { otpRepository } from '../repositories/otp.repository';
import { auditRepository } from '../repositories/audit.repository';
import { emailService } from './email.service';
import { transactionalEmailService } from './transactional-email.service';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getTokenExpirySeconds } from '../utils/helpers';
import { AppError } from '../utils/app-error';
import { AuthTokens, AuthUser, RegisterInput, LoginInput, WELCOME_BONUS_POINTS } from '@estays/shared';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('auth-service');

type PartnerRegisterInput = RegisterInput & {
  companyName: string;
  companyAddress: string;
};

export class AuthService {
  private extractUserData(user: NonNullable<Awaited<ReturnType<typeof userRepository.findById>>>) {
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.name))),
    ];
    const hotelIds = user.hotelStaff.map((hs) => hs.hotelId);
    return { roles, permissions, hotelIds };
  }

  private buildAuthUser(user: NonNullable<Awaited<ReturnType<typeof userRepository.findById>>>): AuthUser {
    const { roles, permissions, hotelIds } = this.extractUserData(user);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
      hotelIds: hotelIds.length > 0 ? hotelIds : undefined,
      loyaltyPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
      lifetimeBookings: user.lifetimeBookings,
      emailVerified: user.emailVerified,
      partnerStatus: user.partnerStatus ?? undefined,
      phone: user.phone ?? undefined,
    };
  }

  private async generateTokens(user: NonNullable<Awaited<ReturnType<typeof userRepository.findById>>>): Promise<AuthTokens> {
    const { roles, permissions, hotelIds } = this.extractUserData(user);
    const payload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      hotelIds: hotelIds.length > 0 ? hotelIds : undefined,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await userRepository.createRefreshToken(user.id, refreshToken, expiresAt);
    return {
      accessToken,
      refreshToken,
      expiresIn: getTokenExpirySeconds(process.env.JWT_ACCESS_EXPIRES_IN || '45m'),
    };
  }

  async sendOtp(email: string, purpose: 'GUEST_REGISTER' | 'PARTNER_REGISTER') {
    const existing = await userRepository.findByEmail(email);
    if (existing && purpose === 'GUEST_REGISTER') {
      throw AppError.conflict('Email already registered. Please sign in.');
    }
    if (existing && purpose === 'PARTNER_REGISTER') {
      throw AppError.conflict('Email already registered.');
    }

    const code = emailService.createCode();
    await otpRepository.create(email, code, purpose);
    await emailService.sendOtp(email, code, purpose);
    return { message: 'Verification code sent to your email', expiresInMinutes: 10 };
  }

  private async verifyOtpOrFail(email: string, code: string, purpose: 'GUEST_REGISTER' | 'PARTNER_REGISTER') {
    const valid = await otpRepository.verify(email, code, purpose);
    if (!valid) throw AppError.badRequest('Invalid or expired verification code');
  }

  async register(input: RegisterInput, ipAddress?: string) {
    await this.verifyOtpOrFail(input.email, input.otpCode, 'GUEST_REGISTER');

    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict('Email already registered');

    const user = await userRepository.create({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      country: input.country,
      roleName: 'GUEST',
      emailVerified: true,
      loyaltyPoints: WELCOME_BONUS_POINTS,
    });

    const fullUser = await userRepository.findById(user.id);
    if (!fullUser) throw AppError.internal('Failed to create user');

    const tokens = await this.generateTokens(fullUser);
    await auditRepository.log({ userId: user.id, action: 'USER_REGISTERED', entityType: 'User', entityId: user.id, ipAddress });
    log.info({ userId: user.id }, 'Guest registered with email OTP');

    void transactionalEmailService.sendWelcomeEmail({
      to: fullUser.email,
      guestName: `${fullUser.firstName} ${fullUser.lastName}`.trim(),
      loyaltyPoints: fullUser.loyaltyPoints,
    }).catch((err) => log.warn({ err, userId: user.id }, 'Welcome email failed'));

    return { user: this.buildAuthUser(fullUser), tokens };
  }

  async registerPartner(input: PartnerRegisterInput, ipAddress?: string) {
    await this.verifyOtpOrFail(input.email, input.otpCode, 'PARTNER_REGISTER');

    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict('Email already registered');

    const user = await userRepository.create({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      companyName: input.companyName,
      companyAddress: input.companyAddress,
      roleName: 'PARTNER',
      emailVerified: true,
      partnerStatus: 'PENDING_KYC',
    });

    const fullUser = await userRepository.findById(user.id);
    if (!fullUser) throw AppError.internal('Failed to create partner');

    const tokens = await this.generateTokens(fullUser);
    await auditRepository.log({ userId: user.id, action: 'PARTNER_REGISTERED', entityType: 'User', entityId: user.id, ipAddress });
    log.info({ userId: user.id }, 'Partner registered — pending KYC');

    return { user: this.buildAuthUser(fullUser), tokens };
  }

  async login(input: LoginInput, ipAddress?: string) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw AppError.unauthorized('Invalid email or password');
    if (!user.isActive) throw AppError.forbidden('Account is deactivated');
    if (!user.emailVerified) throw AppError.forbidden('Please verify your email before signing in');

    const valid = await userRepository.verifyPassword(user.passwordHash, input.password);
    if (!valid) throw AppError.unauthorized('Invalid email or password');

    const isPartner = user.roles.some((r) => r.role.name === 'PARTNER');
    if (isPartner && user.partnerStatus === 'REJECTED') {
      throw AppError.forbidden('Your partner application was not approved');
    }

    await userRepository.updateLastLogin(user.id);
    const tokens = await this.generateTokens(user);
    await auditRepository.log({ userId: user.id, action: 'USER_LOGIN', entityType: 'User', entityId: user.id, ipAddress });

    return { user: this.buildAuthUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await userRepository.findRefreshToken(refreshToken);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }
    await userRepository.revokeRefreshToken(refreshToken);
    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) throw AppError.unauthorized('User not found or inactive');
    return this.generateTokens(user);
  }

  async logout(refreshToken: string, userId?: string): Promise<void> {
    if (refreshToken) {
      try { await userRepository.revokeRefreshToken(refreshToken); } catch { /* ok */ }
    }
    if (userId) {
      await auditRepository.log({ userId, action: 'USER_LOGOUT', entityType: 'User', entityId: userId });
    }
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User');
    return this.buildAuthUser(user);
  }
}

export const authService = new AuthService();
