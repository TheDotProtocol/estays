import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createChildLogger } from '@estays/logger';
import { AppError } from '../utils/app-error';

const log = createChildLogger('razorpay-service');

const MIN_AMOUNT_PAISE = 100;

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getCredentials() !== null;
}

export function getRazorpayKeyId(): string | null {
  return getCredentials()?.keyId ?? null;
}

function getClient(): Razorpay {
  const creds = getCredentials();
  if (!creds) {
    throw AppError.internal('Razorpay is not configured');
  }
  return new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  if (!Number.isFinite(params.amountPaise) || params.amountPaise < MIN_AMOUNT_PAISE) {
    throw AppError.badRequest(`Amount must be at least ${MIN_AMOUNT_PAISE} paise`);
  }

  const creds = getCredentials();
  if (!creds) {
    throw AppError.internal('Razorpay is not configured');
  }

  try {
    const client = getClient();
    const order = await client.orders.create({
      amount: Math.round(params.amountPaise),
      currency: params.currency,
      receipt: params.receipt.slice(0, 40),
      notes: params.notes,
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: creds.keyId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Razorpay order creation failed';
    log.error({ err, receipt: params.receipt }, 'Razorpay create order failed');

    if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('unauthorized')) {
      throw AppError.unauthorized('Razorpay authentication failed');
    }
    throw AppError.internal('Failed to create Razorpay order');
  }
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const creds = getCredentials();
  if (!creds) {
    throw AppError.internal('Razorpay is not configured');
  }

  const body = `${params.orderId}|${params.paymentId}`;
  const expected = crypto
    .createHmac('sha256', creds.keySecret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(params.signature, 'utf8')
    );
  } catch {
    return false;
  }
}
