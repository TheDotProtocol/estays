import { emailService } from './email.service';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('transactional-email');

const FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'E Stays Hotels <noreply@estayshotels.com>';

export class TransactionalEmailService {
  private async send(opts: { to: string; subject: string; text: string }) {
    const host = process.env.SMTP_HOST;
    if (!host) {
      log.info({ to: opts.to, subject: opts.subject }, 'Email (dev mode)');
      console.log(`\n📧 ${opts.subject} → ${opts.to}\n${opts.text}\n`);
      return;
    }
    await emailService.sendRaw({ to: opts.to, from: FROM, subject: opts.subject, text: opts.text });
    log.info({ to: opts.to, subject: opts.subject }, 'Transactional email sent');
  }

  async sendBookingConfirmed(opts: {
    to: string;
    guestName: string;
    bookingNumber: string;
    hotelName: string;
    checkIn: string;
    checkOut: string;
    totalAmount: string;
  }) {
    await this.send({
      to: opts.to,
      subject: `E Stays — Booking ${opts.bookingNumber} confirmed`,
      text: `Hi ${opts.guestName},\n\nYour booking ${opts.bookingNumber} at ${opts.hotelName} is confirmed.\nCheck-in: ${opts.checkIn}\nCheck-out: ${opts.checkOut}\nTotal: ${opts.totalAmount}\n\nView: https://www.estayshotels.com/bookings`,
    });
  }

  async sendPartnerStatus(opts: { to: string; name: string; status: 'APPROVED' | 'REJECTED' }) {
    const text =
      opts.status === 'APPROVED'
        ? `Hi ${opts.name},\n\nYour E Stays partner account has been approved. Log in: https://www.estayshotels.com/partner`
        : `Hi ${opts.name},\n\nYour E Stays partner application was not approved. Contact support@estayshotels.com`;
    await this.send({
      to: opts.to,
      subject: opts.status === 'APPROVED' ? 'E Stays — Partner account approved' : 'E Stays — Partner application update',
      text,
    });
  }

  async sendHotelApproved(opts: { to: string; name: string; hotelName: string }) {
    await this.send({
      to: opts.to,
      subject: `E Stays — ${opts.hotelName} approved`,
      text: `Hi ${opts.name},\n\nYour property "${opts.hotelName}" is now live on E Stays.`,
    });
  }
}

export const transactionalEmailService = new TransactionalEmailService();
