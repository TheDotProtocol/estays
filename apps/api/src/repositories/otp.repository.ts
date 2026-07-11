import { prisma } from '@estays/database';

export class OtpRepository {
  async create(email: string, code: string, purpose: 'GUEST_REGISTER' | 'PARTNER_REGISTER') {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.emailOtp.deleteMany({ where: { email: email.toLowerCase(), purpose, verified: false } });
    return prisma.emailOtp.create({
      data: { email: email.toLowerCase(), code, purpose, expiresAt },
    });
  }

  async verify(email: string, code: string, purpose: 'GUEST_REGISTER' | 'PARTNER_REGISTER') {
    const otp = await prisma.emailOtp.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { verified: true } });
    return true;
  }
}

export const otpRepository = new OtpRepository();
