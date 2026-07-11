import { LEDGER_ACCOUNTS } from '@estays/shared';
import { ledgerRepository } from '../repositories/ledger.repository';
import { createChildLogger } from '@estays/logger';

const log = createChildLogger('ledger-service');

export class LedgerService {
  async recordBookingFinancial(
    _financialId: string,
    data: {
      hotelId: string;
      bookingId: string;
      bookingNumber: string;
      paymentCategory: 'PAID_ONLINE' | 'PAY_AT_HOTEL';
      finalAmount: number;
      commission: number;
      partnerReceivable: number;
      platformReceivable: number;
      taxAmount?: number;
      currency: string;
      actorId?: string;
    }
  ) {
    const ref = `BK-${data.bookingNumber}`;
    const journal = await ledgerRepository.createJournal({
      reference: ref,
      description: `Booking financial — ${data.bookingNumber}`,
      hotelId: data.hotelId,
      createdById: data.actorId,
    });

    const entries = [];

    if (data.paymentCategory === 'PAID_ONLINE') {
      entries.push(
        {
          journalId: journal.id,
          hotelId: data.hotelId,
          bookingId: data.bookingId,
          accountCode: LEDGER_ACCOUNTS.PLATFORM_CASH,
          debit: data.finalAmount,
          credit: 0,
          currency: data.currency,
          description: `Guest payment received — ${data.bookingNumber}`,
          reference: ref,
          createdById: data.actorId,
        },
        {
          journalId: journal.id,
          hotelId: data.hotelId,
          bookingId: data.bookingId,
          accountCode: LEDGER_ACCOUNTS.PARTNER_PAYABLE,
          debit: 0,
          credit: data.partnerReceivable,
          currency: data.currency,
          description: `Partner payable — ${data.bookingNumber}`,
          reference: ref,
          createdById: data.actorId,
        },
        {
          journalId: journal.id,
          hotelId: data.hotelId,
          bookingId: data.bookingId,
          accountCode: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
          debit: 0,
          credit: data.commission,
          currency: data.currency,
          description: `Platform commission — ${data.bookingNumber}`,
          reference: ref,
          createdById: data.actorId,
        }
      );
    } else {
      entries.push(
        {
          journalId: journal.id,
          hotelId: data.hotelId,
          bookingId: data.bookingId,
          accountCode: LEDGER_ACCOUNTS.PARTNER_RECEIVABLE,
          debit: data.commission,
          credit: 0,
          currency: data.currency,
          description: `Commission receivable (pay at hotel) — ${data.bookingNumber}`,
          reference: ref,
          createdById: data.actorId,
        },
        {
          journalId: journal.id,
          hotelId: data.hotelId,
          bookingId: data.bookingId,
          accountCode: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
          debit: 0,
          credit: data.commission,
          currency: data.currency,
          description: `Platform commission earned — ${data.bookingNumber}`,
          reference: ref,
          createdById: data.actorId,
        }
      );
    }

    await ledgerRepository.createEntries(entries);
    log.info({ ref, hotelId: data.hotelId }, 'Journal entry created');
    return journal;
  }

  async recordSettlement(
    settlementId: string,
    data: {
      hotelId: string;
      statementNumber: string;
      netPayable: number;
      netReceivable: number;
      netSettlement: number;
      currency: string;
      actorId?: string;
    }
  ) {
    const ref = `STL-${data.statementNumber}`;
    const journal = await ledgerRepository.createJournal({
      reference: ref,
      description: `Settlement ${data.statementNumber}`,
      hotelId: data.hotelId,
      settlement: { connect: { id: settlementId } },
      createdById: data.actorId,
    });

    const entries = [];
    if (data.netPayable > 0) {
      entries.push({
        journalId: journal.id,
        hotelId: data.hotelId,
        settlementId,
        accountCode: LEDGER_ACCOUNTS.PARTNER_PAYABLE,
        debit: data.netPayable,
        credit: 0,
        currency: data.currency,
        description: `Settlement payout — ${data.statementNumber}`,
        reference: ref,
        createdById: data.actorId,
      });
    }
    if (data.netReceivable > 0) {
      entries.push({
        journalId: journal.id,
        hotelId: data.hotelId,
        settlementId,
        accountCode: LEDGER_ACCOUNTS.PARTNER_RECEIVABLE,
        debit: 0,
        credit: data.netReceivable,
        currency: data.currency,
        description: `Commission collected — ${data.statementNumber}`,
        reference: ref,
        createdById: data.actorId,
      });
    }

    if (entries.length) await ledgerRepository.createEntries(entries);
    return journal;
  }

  async recordReversal(
    reference: string,
    hotelId: string,
    bookingId: string,
    data: {
      description: string;
      partnerAmount: number;
      commissionAmount: number;
      currency: string;
      actorId?: string;
    }
  ) {
    const journal = await ledgerRepository.createJournal({
      reference: `${reference}-REV`,
      description: data.description,
      hotelId,
      createdById: data.actorId,
    });

    await ledgerRepository.createEntries([
      {
        journalId: journal.id,
        hotelId,
        bookingId,
        accountCode: LEDGER_ACCOUNTS.GUEST_REFUND,
        debit: data.partnerAmount + data.commissionAmount,
        credit: 0,
        currency: data.currency,
        description: data.description,
        reference: `${reference}-REV`,
        isReversal: true,
        createdById: data.actorId,
      },
      {
        journalId: journal.id,
        hotelId,
        bookingId,
        accountCode: LEDGER_ACCOUNTS.PARTNER_PAYABLE,
        debit: 0,
        credit: data.partnerAmount,
        currency: data.currency,
        description: `Reversal partner portion`,
        reference: `${reference}-REV`,
        isReversal: true,
        createdById: data.actorId,
      },
      {
        journalId: journal.id,
        hotelId,
        bookingId,
        accountCode: LEDGER_ACCOUNTS.PLATFORM_COMMISSION,
        debit: 0,
        credit: data.commissionAmount,
        currency: data.currency,
        description: `Reversal commission portion`,
        reference: `${reference}-REV`,
        isReversal: true,
        createdById: data.actorId,
      },
    ]);

    return journal;
  }
}

export const ledgerService = new LedgerService();
