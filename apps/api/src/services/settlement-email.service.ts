import fs from 'fs';
import { settlementRepository } from '../repositories/settlement.repository';
import { billingConfigRepository } from '../repositories/ledger.repository';
import { hotelRepository } from '../repositories/hotel.repository';
import { userRepository } from '../repositories/user.repository';
import { emailService } from './email.service';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('settlement-email');

export class SettlementEmailService {
  async sendSettlementComplete(settlementId: string) {
    const settlement = await settlementRepository.findById(settlementId);
    if (!settlement) return;

    const config = await billingConfigRepository.get();
    const hotel = await hotelRepository.findById(settlement.hotelId);
    const partner = await userRepository.findById(settlement.partnerId);

    const recipients = new Set<string>(config.settlementNotifyEmails);
    if (hotel?.email) recipients.add(hotel.email);
    if (partner?.email) recipients.add(partner.email);

    const financeSettings = await import('@estays/database').then((m) =>
      m.prisma.partnerFinanceSettings.findUnique({ where: { hotelId: settlement.hotelId } })
    );
    if (financeSettings?.settlementEmail) recipients.add(financeSettings.settlementEmail);

    if (recipients.size === 0) {
      log.warn({ settlementId }, 'No settlement email recipients configured');
      return;
    }

    const attachments = settlement.documents
      .filter((d) => fs.existsSync(d.filePath))
      .map((d) => ({
        filename: d.fileName,
        content: fs.readFileSync(d.filePath),
        contentType: d.mimeType,
      }));

    const subject = `E Stays Settlement ${settlement.statementNumber} — ${settlement.status}`;
    const body = `
Settlement ${settlement.statementNumber} for ${hotel?.name ?? 'Property'} has been completed.

Net Settlement: ${settlement.netSettlement} USD
Status: ${settlement.status}
Transaction Reference: ${settlement.transactionRef ?? 'N/A'}

Attached: Statement, Receipt, and CSV export.

— ${config.companyLegalName}
    `.trim();

    for (const to of recipients) {
      try {
        await emailService.sendRaw({
          to,
          from: config.billingFromEmail,
          replyTo: config.billingReplyToEmail ?? undefined,
          subject,
          text: body,
          attachments,
        });
      } catch (err) {
        log.error({ err, to, settlementId }, 'Failed to send settlement email');
      }
    }
  }
}

export const settlementEmailService = new SettlementEmailService();
