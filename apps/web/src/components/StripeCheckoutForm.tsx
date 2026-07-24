'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { confirmStripePayment } from '@/lib/api';

type Props = {
  paymentId: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function StripeCheckoutForm({ paymentId, paymentIntentId, onSuccess, onCancel }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setProcessing(false);
      return;
    }

    const verifyRes = await confirmStripePayment({ paymentId, paymentIntentId });
    if (verifyRes.success) {
      onSuccess();
    } else {
      setError(verifyRes.error?.message || 'Payment verification failed');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 btn-primary disabled:opacity-50"
      >
        {processing ? 'Processing…' : 'Pay securely'}
      </button>
      <button type="button" onClick={onCancel} className="w-full py-2 text-sm text-ink-muted hover:text-ink">
        Choose different method
      </button>
    </form>
  );
}
