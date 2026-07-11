import nodemailer from 'nodemailer';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('email-service');

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) return null;

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return this.transporter;
  }

  async sendOtp(email: string, code: string, purpose: string): Promise<void> {
    const subject =
      purpose === 'PARTNER_REGISTER'
        ? 'E Stays — Verify your partner account'
        : 'E Stays — Verify your email';

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a2b4a">E Stays Hotels</h2>
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#e8836b">${code}</p>
        <p style="color:#666;font-size:13px">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `;

    const transport = this.getTransporter();
    if (transport) {
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@estayshotels.com',
        to: email,
        subject,
        html,
      });
      log.info({ email, purpose }, 'OTP email sent via SMTP');
    } else {
      log.info({ email, purpose, code }, 'OTP (dev mode — check API logs)');
      console.log(`\n📧 OTP for ${email}: ${code} (${purpose})\n`);
    }
  }

  createCode(): string {
    return generateOtp();
  }

  async sendRaw(opts: {
    to: string;
    from: string;
    replyTo?: string;
    subject: string;
    text: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  }): Promise<void> {
    const transport = this.getTransporter();
    const html = opts.text.replace(/\n/g, '<br>');
    if (transport) {
      await transport.sendMail({
        from: opts.from,
        to: opts.to,
        replyTo: opts.replyTo,
        subject: opts.subject,
        text: opts.text,
        html,
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      log.info({ to: opts.to, subject: opts.subject }, 'Email sent via SMTP');
    } else {
      log.info({ to: opts.to, subject: opts.subject }, 'Email (dev mode — check API logs)');
      console.log(`\n📧 Email to ${opts.to}: ${opts.subject}\n${opts.text}\n`);
    }
  }
}

export const emailService = new EmailService();
