import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_'));
}

function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

export function getStripePublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}

export async function createStripePaymentIntent(params: {
  amountMinor: number;
  currency: string;
  bookingId: string;
  bookingNumber: string;
  guestEmail: string;
  guestName?: string;
}) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: params.amountMinor,
    currency: params.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    receipt_email: params.guestEmail,
    metadata: {
      bookingId: params.bookingId,
      bookingNumber: params.bookingNumber,
      guestName: params.guestName || '',
    },
  });
}

export async function retrieveStripePaymentIntent(intentId: string) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(intentId);
}

export function constructStripeWebhookEvent(payload: Buffer, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
