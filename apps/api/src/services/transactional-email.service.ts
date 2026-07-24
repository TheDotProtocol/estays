import { emailService } from './email.service';
import { createChildLogger } from '@estays/logger';
import { ESTAYS_COMPANY } from '@estays/shared';

const log = createChildLogger('transactional-email');

const BOOKINGS_FROM =
  process.env.BOOKINGS_EMAIL_FROM ||
  process.env.SMTP_BOOKINGS_FROM ||
  `E Stays Bookings <${ESTAYS_COMPANY.emails.bookings}>`;

function confirmationEmailHtml(opts: {
  guestName: string;
  bookingNumber: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string;
  confirmationUrl: string;
  voucherPdfUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#1a2b4a;color:#fff;padding:24px">
      <h1 style="margin:0;font-size:22px">Booking confirmed</h1>
      <p style="margin:8px 0 0;color:#fbbf24">Ref: ${opts.bookingNumber}</p>
    </div>
    <div style="padding:24px;color:#334155">
      <p>Hi ${opts.guestName},</p>
      <p>Your stay at <strong>${opts.hotelName}</strong> is confirmed with E Stays.</p>
      <table style="width:100%;margin:20px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b">Check-in</td><td><strong>${opts.checkIn}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Check-out</td><td><strong>${opts.checkOut}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Total</td><td><strong>${opts.totalAmount}</strong></td></tr>
      </table>
      <p style="margin:24px 0">
        <a href="${opts.confirmationUrl}" style="display:inline-block;background:#E0394E;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">View voucher &amp; QR code</a>
      </p>
      <p style="font-size:13px;color:#64748b">
        <a href="${opts.voucherPdfUrl}">Download PDF voucher</a> · Present the QR code at check-in
      </p>
    </div>
    <div style="padding:16px 24px;background:#f8fafc;font-size:11px;color:#94a3b8">
      ${ESTAYS_COMPANY.name} · ${ESTAYS_COMPANY.tagline}<br/>
      Questions? ${ESTAYS_COMPANY.emails.bookings}
    </div>
  </div>
</body>
</html>`;
}

export class TransactionalEmailService {
  private async send(opts: { to: string; subject: string; text: string; html?: string; from?: string }) {
    const host = process.env.SMTP_HOST;
    const from = opts.from || BOOKINGS_FROM;
    if (!host) {
      log.info({ to: opts.to, subject: opts.subject }, 'Email (dev mode)');
      console.log(`\n📧 ${opts.subject} → ${opts.to}\n${opts.text}\n`);
      return;
    }
    await emailService.sendRaw({
      to: opts.to,
      from,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
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
    bookingId: string;
    currency?: string;
  }) {
    const webBase = (process.env.WEB_URL || ESTAYS_COMPANY.website).replace(/\/$/, '');
    const confirmationUrl = `${webBase}/bookings/${opts.bookingId}/confirmation`;
    const voucherPdfUrl = `${confirmationUrl}?download=pdf`;

    const text = [
      `Hi ${opts.guestName},`,
      '',
      `Your booking ${opts.bookingNumber} at ${opts.hotelName} is confirmed.`,
      `Check-in: ${opts.checkIn}`,
      `Check-out: ${opts.checkOut}`,
      `Total: ${opts.totalAmount}`,
      '',
      `View your voucher & QR code: ${confirmationUrl}`,
      `Download PDF: ${voucherPdfUrl}`,
      '',
      `E Stays Bookings · ${ESTAYS_COMPANY.emails.bookings}`,
    ].join('\n');

    await this.send({
      to: opts.to,
      from: BOOKINGS_FROM,
      subject: `E Stays — Booking ${opts.bookingNumber} confirmed`,
      text,
      html: confirmationEmailHtml({
        guestName: opts.guestName,
        bookingNumber: opts.bookingNumber,
        hotelName: opts.hotelName,
        checkIn: opts.checkIn,
        checkOut: opts.checkOut,
        totalAmount: opts.totalAmount,
        confirmationUrl,
        voucherPdfUrl,
      }),
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
