'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getStoredUser, getBooking, initiatePayment, confirmPayment } from '@/lib/api';
import { useCurrency } from '@/lib/currency';

type PaymentMethod = 'PAY_AT_HOTEL' | 'UPI' | 'ALIPAY' | 'THAI_QR';

const PAYMENT_GROUPS = [
  {
    title: 'Pay at Hotel',
    methods: [
      { id: 'PAY_AT_HOTEL' as PaymentMethod, label: 'Pay at Hotel', icon: '🏨', desc: 'No online payment — pay at check-in' },
    ],
  },
  {
    title: 'India — UPI',
    methods: [
      { id: 'UPI' as PaymentMethod, label: 'UPI', icon: '🇮🇳', desc: 'GPay, PhonePe, Paytm & all UPI apps' },
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

  const handleSelectMethod = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    setError('');
    setProcessing(true);

    const res = await initiatePayment(bookingId, method, currency, payer);
    if (res.success) {
      setPayment(res.data as Record<string, unknown>);
      if (method === 'PAY_AT_HOTEL') {
        setSuccess(true);
        setTimeout(() => router.push('/bookings'), 2500);
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
      setSuccess(true);
      setTimeout(() => router.push('/bookings'), 2500);
    } else {
      setError(res.error?.message || 'Confirmation failed');
    }
    setProcessing(false);
  };

  if (loading) return <div className="text-center py-20 text-navy/50">Loading checkout...</div>;
  if (!booking) return <div className="text-center py-20 text-red-500">{error || 'Booking not found'}</div>;

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="font-display text-2xl font-bold text-navy">Booking Confirmed!</h1>
        <p className="text-navy/60 mt-2">
          {selectedMethod === 'PAY_AT_HOTEL'
            ? 'Pay when you arrive at the hotel.'
            : 'Payment received. Redirecting...'}
        </p>
      </div>
    );
  }

  const hotel = booking.hotel as Record<string, unknown>;
  const totalUsd = Number(booking.totalAmount);

  return (
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

      {step === 'payment' && !payment && (
        <div className="space-y-5">
          <button onClick={() => setStep('details')} className="text-sm text-gold hover:underline">← Edit details</button>
          <h3 className="font-semibold text-navy text-sm">Choose Payment Method</h3>
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
        </div>
      )}

      {payment?.qrPayload ? (
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

      {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
    </div>
  );
}
