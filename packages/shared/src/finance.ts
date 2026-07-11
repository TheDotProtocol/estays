export const COMMISSION_TYPES = {
  FLAT: 'FLAT',
  PERCENTAGE: 'PERCENTAGE',
  PROMOTIONAL: 'PROMOTIONAL',
  ZERO: 'ZERO',
} as const;

export const SETTLEMENT_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PROCESSING: 'PROCESSING',
  SETTLED: 'SETTLED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
} as const;

export const FINANCIAL_SETTLEMENT_STATUS = {
  UNSETTLED: 'UNSETTLED',
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
  REVERSED: 'REVERSED',
} as const;

export const BOOKING_PAYMENT_CATEGORY = {
  PAID_ONLINE: 'PAID_ONLINE',
  PAY_AT_HOTEL: 'PAY_AT_HOTEL',
} as const;

export const LEDGER_ACCOUNTS = {
  PLATFORM_CASH: 'PLATFORM_CASH',
  PLATFORM_COMMISSION: 'PLATFORM_COMMISSION',
  PARTNER_RECEIVABLE: 'PARTNER_RECEIVABLE',
  PARTNER_PAYABLE: 'PARTNER_PAYABLE',
  GUEST_REFUND: 'GUEST_REFUND',
  TAX_PAYABLE: 'TAX_PAYABLE',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export const DEFAULT_PLATFORM_COMMISSION_RATE = 0.15;

/**
 * GST/VAT is tracked per booking for reporting. It is NOT included in
 * settlement payout amounts until hotel-auditor guidance is finalized.
 * Toggle to 'INCLUDED' later when accounting treatment is confirmed.
 */
export const SETTLEMENT_TAX_POLICY = 'TRACKED_ONLY' as const;

export const SETTLEMENT_TAX_DISCLAIMER =
  'GST/VAT shown for reference only — not included in net settlement amount pending auditor guidance.';

export const ONLINE_PAYMENT_METHODS = [
  'UPI',
  'ALIPAY',
  'THAI_QR',
  'STRIPE',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
] as const;
