import { emailService } from './email.service';
import { createChildLogger } from '@estays/logger';
import { ESTAYS_COMPANY, formatCompanyAddress } from '@estays/shared';

const log = createChildLogger('transactional-email');

const BOOKINGS_FROM =
  process.env.BOOKINGS_EMAIL_FROM ||
  process.env.SMTP_BOOKINGS_FROM ||
  `E Stays Bookings <${ESTAYS_COMPANY.emails.bookings}>`;

const BOOKINGS_INBOX =
  process.env.BOOKINGS_BCC ||
  process.env.BOOKINGS_INBOX ||
  ESTAYS_COMPANY.emails.bookings;

const WELCOME_FROM =
  process.env.WELCOME_EMAIL_FROM ||
  process.env.SMTP_WELCOME_FROM ||
  `E Stays Hotels <${ESTAYS_COMPANY.emails.welcome}>`;

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] || trimmed;
}

function welcomeEmailHtml(opts: {
  firstName: string;
  fullName: string;
  loyaltyPoints: number;
  exploreUrl: string;
  rewardsUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,'Times New Roman',serif;background:#eef2f7;margin:0;padding:32px 16px">
  <div style="max-width:580px;margin:0 auto">
    <p style="text-align:center;margin:0 0 16px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8">E Stays Hotels</p>
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(26,43,74,0.12);border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#1a2b4a 0%,#243656 100%);color:#fff;padding:36px 32px 32px">
        <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;color:#fbbf24;text-transform:uppercase;letter-spacing:1.5px">Welcome aboard</p>
        <h1 style="margin:0;font-size:28px;font-weight:400;line-height:1.25">Hello, ${opts.firstName}.</h1>
        <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:15px;color:#cbd5e1;line-height:1.5">
          Your E Stays profile is live — ${ESTAYS_COMPANY.tagline.toLowerCase()}.
        </p>
      </div>
      <div style="padding:32px;font-family:Arial,sans-serif;color:#334155;font-size:15px;line-height:1.65">
        <p style="margin:0 0 16px">Dear ${opts.fullName},</p>
        <p style="margin:0 0 20px">
          We're delighted you've joined E Stays. From safari lodges in Kenya to beach resorts in Bali,
          your next unforgettable stay is just a few clicks away.
        </p>
        <div style="background:linear-gradient(90deg,#fef9c3,#fff7ed);border-radius:14px;padding:20px 24px;margin:28px 0;border:1px solid #fde68a">
          <p style="margin:0;font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:0.5px">Your welcome gift</p>
          <p style="margin:8px 0 4px;font-size:32px;font-weight:700;color:#1a2b4a;font-family:Georgia,serif">${opts.loyaltyPoints.toLocaleString()}</p>
          <p style="margin:0;font-size:14px;color:#78350f;font-weight:600">E Stays Rewards points — already in your account</p>
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
          <tr>
            <td style="padding-right:10px">
              <a href="${opts.exploreUrl}" style="display:inline-block;background:#E0394E;color:#fff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:600;font-size:14px">Explore stays</a>
            </td>
            <td>
              <a href="${opts.rewardsUrl}" style="display:inline-block;background:#1a2b4a;color:#fff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:600;font-size:14px">My rewards</a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:13px;color:#64748b">
          Questions? We're at <a href="mailto:${ESTAYS_COMPANY.emails.support}" style="color:#E0394E">${ESTAYS_COMPANY.emails.support}</a>
        </p>
      </div>
      <div style="padding:20px 32px;background:#f8fafc;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.6;border-top:1px solid #e2e8f0">
        ${ESTAYS_COMPANY.name}<br/>
        ${formatCompanyAddress()}<br/>
        Sent from ${ESTAYS_COMPANY.emails.welcome} because you created a profile at estayshotels.com
      </div>
    </div>
  </div>
</body>
</html>`;
}

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
      <p style="margin:0 0 6px;font-size:11px;color:#fbbf24;text-transform:uppercase;letter-spacing:1px">Booking confirmed</p>
      <h1 style="margin:0;font-size:22px">You're all set, ${firstName(opts.guestName)}</h1>
      <p style="margin:8px 0 0;color:#fbbf24;font-family:monospace">Ref: ${opts.bookingNumber}</p>
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
      Questions? <a href="mailto:${ESTAYS_COMPANY.emails.bookings}">${ESTAYS_COMPANY.emails.bookings}</a>
    </div>
  </div>
</body>
</html>`;
}

export class TransactionalEmailService {
  private async send(opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    from?: string;
    replyTo?: string;
    bcc?: string | string[];
  }) {
    const host = process.env.SMTP_HOST;
    const from = opts.from || BOOKINGS_FROM;
    if (!host) {
      log.info({ to: opts.to, bcc: opts.bcc, subject: opts.subject }, 'Email (dev mode)');
      console.log(`\n📧 ${opts.subject}\n  To: ${opts.to}${opts.bcc ? `\n  Bcc: ${opts.bcc}` : ''}\n${opts.text}\n`);
      return;
    }
    await emailService.sendRaw({
      to: opts.to,
      from,
      replyTo: opts.replyTo,
      bcc: opts.bcc,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    log.info({ to: opts.to, bcc: opts.bcc, subject: opts.subject }, 'Transactional email sent');
  }

  async sendWelcomeEmail(opts: { to: string; guestName: string; loyaltyPoints: number }) {
    const webBase = (process.env.WEB_URL || ESTAYS_COMPANY.website).replace(/\/$/, '');
    const exploreUrl = `${webBase}/`;
    const rewardsUrl = `${webBase}/rewards`;
    const name = opts.guestName.trim() || 'Guest';
    const givenName = firstName(name);

    const text = [
      `Hello, ${givenName}.`,
      '',
      `Dear ${name},`,
      '',
      `Welcome to E Stays — ${ESTAYS_COMPANY.tagline}`,
      '',
      `Your profile is ready. We've added ${opts.loyaltyPoints.toLocaleString()} welcome bonus points to your E Stays Rewards balance.`,
      '',
      `Explore stays: ${exploreUrl}`,
      `View rewards: ${rewardsUrl}`,
      '',
      `Questions? ${ESTAYS_COMPANY.emails.support}`,
      '',
      ESTAYS_COMPANY.name,
    ].join('\n');

    await this.send({
      to: opts.to,
      from: WELCOME_FROM,
      replyTo: ESTAYS_COMPANY.emails.support,
      subject: `Welcome to E Stays, ${givenName}!`,
      text,
      html: welcomeEmailHtml({
        firstName: givenName,
        fullName: name,
        loyaltyPoints: opts.loyaltyPoints,
        exploreUrl,
        rewardsUrl,
      }),
    });
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
    const subject = `E Stays — Booking ${opts.bookingNumber} confirmed`;

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
      replyTo: ESTAYS_COMPANY.emails.bookings,
      bcc: BOOKINGS_INBOX,
      subject,
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
        : `Hi ${opts.name},\n\nYour E Stays partner application was not approved. Contact ${ESTAYS_COMPANY.emails.partner}`;
    await this.send({
      to: opts.to,
      from: `E Stays Partners <${ESTAYS_COMPANY.emails.partner}>`,
      replyTo: ESTAYS_COMPANY.emails.partner,
      subject: opts.status === 'APPROVED' ? 'E Stays — Partner account approved' : 'E Stays — Partner application update',
      text,
    });
  }

  async sendHotelApproved(opts: { to: string; name: string; hotelName: string }) {
    await this.send({
      to: opts.to,
      from: `E Stays Partners <${ESTAYS_COMPANY.emails.partner}>`,
      replyTo: ESTAYS_COMPANY.emails.partner,
      subject: `E Stays — ${opts.hotelName} approved`,
      text: `Hi ${opts.name},\n\nYour property "${opts.hotelName}" is now live on E Stays.`,
    });
  }
}

export const transactionalEmailService = new TransactionalEmailService();
