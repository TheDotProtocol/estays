'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { QRCodeSVG } from 'qrcode.react';
import {
  getStoredUser,
  getBooking,
  initiatePayment,
  confirmPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getRazorpayConfig,
  createStripeIntent,
  getStripeConfig,
} from '@/lib/api';
import { useCurrency } from '@/lib/currency';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { StripeCheckoutForm } from '@/components/StripeCheckoutForm';

type PaymentMethod = 'PAY_AT_HOTEL' | 'UPI' | 'ALIPAY' | 'THAI_QR' | 'STRIPE';

/** QR-based methods — shown in UI but not yet live (cards only for now). */
const QR_PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'ALIPAY', 'THAI_QR'];

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const PAYMENT_GROUPS = [
  {
    title: 'Pay at Hotel',
    methods: [
      { id: 'PAY_AT_HOTEL' as PaymentMethod, label: 'Pay at Hotel', icon: '🏨', desc: 'Pay when you check in at the property' },
    ],
  },
  {
    title: 'Cards — Stripe',
    methods: [
      { id: 'STRIPE' as PaymentMethod, label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, Amex — secure Stripe checkout' },
    ],
  },
  {
    title: 'India — UPI & Cards',
    methods: [
      { id: 'UPI' as PaymentMethod, label: 'UPI / Card / Wallet', icon: '🇮🇳', desc: 'Secure checkout via Razorpay' },
    ],
  },
  {
    title: 'Thailand — Alipay & Thai QR',
    methods: [
      { id: 'ALIPAY' as PaymentMethod, label: 'Alipay', icon: '💙', desc: 'Scan with Alipay app' },
      { id: 'THAI_QR' as PaymentMethod, label: 'Thai QR / PromptPay', icon: '🇹🇭', desc: 'Scan with any Thai banking app' },
    ],
  },
];

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { format, currency } = useCurrency();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [payer, setPayer] = useState({ payerName: '', payerEmail: '', payerPhone: '' });
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [payment, setPayment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  useEffect(() => {
    getRazorpayConfig().then((res) => {
      if (res.success && res.data) {
        const data = res.data as { enabled?: boolean };
        setRazorpayEnabled(Boolean(data.enabled));
      }
    });
    getStripeConfig().then((res) => {
      if (res.success && res.data) {
        const data = res.data as { enabled?: boolean; publishableKey?: string };
        const pk = data.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
        setStripeEnabled(Boolean(data.enabled && pk));
        if (pk) setStripePromise(loadStripe(pk));
      } else {
        const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
        if (pk) {
          setStripeEnabled(true);
          setStripePromise(loadStripe(pk));
        }
      }
    });
  }, []);

  useEffect(() => {
    const user = getStoredUser() as { firstName?: string; lastName?: string; email?: string; phone?: string } | null;
    if (!user) {
      router.push('/login');
      return;
    }
    setPayer({
      payerName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      payerEmail: user.email || '',
      payerPhone: user.phone || '',
    });
    getBooking(bookingId).then((res) => {
      if (!res.success) {
        setError(res.error?.message || 'Booking not found');
      } else {
        setBooking(res.data as Record<string, unknown>);
      }
      setLoading(false);
    });
  }, [bookingId, router]);

  const openRazorpayCheckout = useCallback(
    async (orderData: Record<string, unknown>) => {
      if (!window.Razorpay) {
        setError('Payment gateway is loading. Please try again.');
        setProcessing(false);
        return;
      }

      const paymentId = orderData.paymentId as string;
      const keyId = (orderData.keyId as string) || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
      const orderId = orderData.orderId as string;
      const amount = orderData.amount as number;
      const bookingNumber = orderData.bookingNumber as string;

      const options: RazorpayOptions = {
        key: keyId,
        amount,
        currency: 'INR',
        name: 'E Stays Hotels',
        description: `Booking ${bookingNumber}`,
        order_id: orderId,
        prefill: {
          name: payer.payerName,
          email: payer.payerEmail,
          contact: payer.payerPhone || undefined,
        },
        theme: { color: '#1a2744' },
        handler: async (response) => {
          setProcessing(true);
          setError('');
          const verifyRes = await verifyRazorpayPayment({
            paymentId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (verifyRes.success) {
            setSuccess(true);
            setTimeout(() => router.push('/bookings'), 2500);
          } else {
            setError(verifyRes.error?.message || 'Payment verification failed');
          }
          setProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setSelectedMethod(null);
            setError('Payment cancelled. You can try again.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setProcessing(false);
        setSelectedMethod(null);
        setError(response.error?.description || 'Payment failed. Please try again.');
      });
      rzp.open();
    },
    [payer, router]
  );

  const goToConfirmation = useCallback(() => {
    router.replace(`/bookings/${bookingId}/confirmation`);
  }, [bookingId, router]);

  const handleSelectMethod = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    setError('');
    setPayment(null);

    if (QR_PAYMENT_METHODS.includes(method)) {
      return;
    }

    setProcessing(true);

    if (method === 'STRIPE') {
      const res = await createStripeIntent(bookingId, currency, payer);
      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>;
        const pk = (data.publishableKey as string) || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (pk && !stripePromise) {
          setStripePromise(loadStripe(pk));
        }
        setStripeEnabled(true);
        setPayment(data);
      } else {
        setError(
          res.error?.message ||
            'Card payments are not available yet. Please use Pay at Hotel or contact bookings@estayshotels.com.'
        );
        setSelectedMethod(null);
      }
      setProcessing(false);
      return;
    }

    const res = await initiatePayment(bookingId, method, currency, payer);
    if (res.success) {
      setPayment(res.data as Record<string, unknown>);
      if (method === 'PAY_AT_HOTEL') {
        goToConfirmation();
      }
    } else {
      setError(res.error?.message || 'Payment initiation failed');
      setSelectedMethod(null);
    }
    setProcessing(false);
  };

  const handleConfirmQr = async () => {
    if (!payment?.paymentId) return;
    setProcessing(true);
    const res = await confirmPayment(payment.paymentId as string);
    if (res.success) {
      goToConfirmation();
    } else {
      setError(res.error?.message || 'Confirmation failed');
    }
    setProcessing(false);
  };

  if (loading) return <div className="text-center py-20 text-navy/50">Loading checkout...</div>;
  if (!booking) return <div className="text-center py-20 text-red-500">{error || 'Booking not found'}</div>;

  if (success) {
    goToConfirmation();
    return <div className="text-center py-20 text-navy/50">Redirecting to confirmation…</div>;
  }

  const hotel = booking.hotel as Record<string, unknown>;
  const totalUsd = Number(booking.totalAmount);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setRazorpayReady(true)}
      />

      <div className="max-w-lg mx-auto px-4 py-8">
        <Link href="/bookings" className="text-sm text-gold hover:underline mb-4 inline-block">← My bookings</Link>

        <div className="bg-white rounded-2xl shadow-lg border border-gold/10 overflow-hidden mb-6">
          <div className="bg-navy text-white p-5">
            <h1 className="font-display text-xl font-bold">Complete Payment</h1>
            <p className="text-gold text-sm">{booking.bookingNumber as string}</p>
          </div>
          <div className="p-5">
            <h2 className="font-semibold text-navy">{hotel?.name as string}</h2>
            <p className="text-sm text-navy/50">
              {String(booking.checkInDate).slice(0, 10)} → {String(booking.checkOutDate).slice(0, 10)}
            </p>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gold/10">
              <span className="text-navy/70">Total</span>
              <span className="text-2xl font-bold text-navy">{format(totalUsd)}</span>
            </div>
          </div>
        </div>

        {step === 'details' && !payment && (
          <div className="bg-white rounded-2xl border border-gold/10 p-6 mb-6 space-y-4">
            <h3 className="font-semibold text-navy text-sm">Your Details (for booking & refunds)</h3>
            <p className="text-xs text-navy/50">We capture your payment method to process refunds if needed.</p>
            <input required placeholder="Full name" value={payer.payerName}
              onChange={(e) => setPayer({ ...payer, payerName: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gold/50 outline-none" />
            <input required type="email" placeholder="Email for refund notifications" value={payer.payerEmail}
              onChange={(e) => setPayer({ ...payer, payerEmail: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gold/50 outline-none" />
            <input placeholder="Phone (optional)" value={payer.payerPhone}
              onChange={(e) => setPayer({ ...payer, payerPhone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gold/50 outline-none" />
            <button
              onClick={() => {
                if (!payer.payerName.trim() || !payer.payerEmail.trim()) {
                  setError('Please enter your name and email');
                  return;
                }
                setError('');
                setStep('payment');
              }}
              className="w-full py-3 bg-navy text-white font-medium rounded-lg hover:bg-navy-light transition"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-5">
            {!payment && (
              <>
                <button onClick={() => setStep('details')} className="text-sm text-gold hover:underline">← Edit details</button>
                <h3 className="font-semibold text-navy text-sm">Choose Payment Method</h3>
                {!stripeEnabled && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Card checkout requires Stripe on the server. If card payment fails, use Pay at Hotel or email bookings@estayshotels.com.
                  </p>
                )}
                {razorpayEnabled && !razorpayReady && (
                  <p className="text-xs text-navy/50">Loading secure payment gateway...</p>
                )}
                {PAYMENT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-medium text-navy/50 uppercase tracking-wide mb-2">{group.title}</p>
                    <div className="space-y-2">
                      {group.methods.map((m) => (
                        <button key={m.id} onClick={() => handleSelectMethod(m.id)} disabled={processing}
                          className={`w-full text-left p-4 rounded-xl border transition ${
                            selectedMethod === m.id ? 'border-coral bg-coral/5' : 'border-gold/10 bg-white hover:border-gold/30'
                          } disabled:opacity-50`}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{m.icon}</span>
                            <div>
                              <div className="font-medium text-navy text-sm">{m.label}</div>
                              <div className="text-xs text-navy/50">{m.desc}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedMethod && QR_PAYMENT_METHODS.includes(selectedMethod) && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-950">
                    <p className="font-semibold mb-1">Coming soon</p>
                    <p className="text-amber-900/90">
                      UPI, Alipay, and Thai QR / PromptPay are not available yet. Please use{' '}
                      <strong>Credit / Debit Card</strong> to complete your booking for now.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {payment?.clientSecret && stripePromise ? (
          <div className="bg-white rounded-2xl border border-surface-border p-6 mt-4">
            <p className="text-sm font-semibold text-navy mb-1">Pay with card</p>
            <p className="text-sm text-ink-muted mb-4">Enter your card details securely via Stripe.</p>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: payment.clientSecret as string,
                appearance: { theme: 'stripe', variables: { colorPrimary: '#E0394E' } },
              }}
            >
              <StripeCheckoutForm
                paymentId={payment.paymentId as string}
                paymentIntentId={payment.paymentIntentId as string}
                onSuccess={goToConfirmation}
                onCancel={() => {
                  setPayment(null);
                  setSelectedMethod(null);
                }}
              />
            </Elements>
          </div>
        ) : payment?.qrPayload ? (
          <div className="bg-white rounded-2xl border border-gold/10 p-6 text-center">
            <p className="text-sm text-navy mb-1">{payment.qrLabel as string}</p>
            <p className="text-2xl font-bold text-navy mb-4">
              {payment.currencySymbol as string}{payment.displayAmount as number}
            </p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={payment.qrPayload as string} size={200} level="M" />
            </div>
            <p className="text-xs text-navy/40 mb-4">Ref: {payment.bookingNumber as string}</p>
            <button onClick={handleConfirmQr} disabled={processing}
              className="w-full py-3 bg-coral text-white font-medium rounded-lg hover:bg-coral-light transition disabled:opacity-50">
              {processing ? 'Confirming...' : "I've Completed Payment"}
            </button>
            <button onClick={() => { setPayment(null); setSelectedMethod(null); setStep('payment'); }}
              className="w-full mt-2 py-2 text-sm text-navy/50 hover:text-navy">
              Choose different method
            </button>
          </div>
        ) : null}

        {processing && selectedMethod === 'STRIPE' && !payment?.clientSecret && (
          <p className="text-sm text-navy/50 text-center mt-4">Loading secure card checkout…</p>
        )}

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
      </div>
    </>
  );
}
