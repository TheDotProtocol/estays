'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { sendOtp, register } from '@/lib/api';
import { WELCOME_BONUS_POINTS } from '@estays/shared';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    address: '', city: '', country: '', otpCode: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    const res = await sendOtp(form.email, 'GUEST_REGISTER');
    if (!res.success) {
      setError(res.error?.message || 'Failed to send verification code');
      setLoading(false);
      return;
    }
    setInfo('A 6-digit code has been sent to your email. Check your inbox.');
    setStep('verify');
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await register(form);
    if (!res.success) {
      setError(res.error?.message || 'Registration failed');
      setLoading(false);
      return;
    }
    router.push('/rewards');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo href="/" size={80} showText={false} className="justify-center mb-4" />
          <h1 className="font-display text-2xl font-bold text-navy">Join E Stays</h1>
          <p className="text-gold text-sm mt-1">Earn {WELCOME_BONUS_POINTS} EStays Cash on signup</p>
        </div>

        <div className="bg-gradient-to-r from-navy to-navy-light text-white rounded-xl p-4 mb-6 text-center text-sm">
          <span className="font-semibold">Email verification required</span>
          <p className="text-white/70 text-xs mt-1">We&apos;ll send a one-time code to confirm your email. No phone OTP.</p>
        </div>

        {step === 'details' ? (
          <form onSubmit={handleSendOtp} className="bg-white rounded-2xl shadow-lg p-8 border border-gold/20 space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="First name" value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
              <input required placeholder="Last name" value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            </div>
            <input required type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            <input placeholder="Phone (optional)" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            <input placeholder="Address (optional)" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="City" value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
              <input placeholder="Country" value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            </div>
            <input required type="password" placeholder="Password (min 8 chars, 1 uppercase, 1 number)" minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-coral text-white font-medium rounded-lg hover:bg-coral-light transition disabled:opacity-50">
              {loading ? 'Sending code...' : 'Send Email Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-lg p-8 border border-gold/20 space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
            {info && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{info}</div>}

            <p className="text-sm text-navy/60">Enter the 6-digit code sent to <strong>{form.email}</strong></p>
            <input required maxLength={6} placeholder="000000" value={form.otpCode}
              onChange={(e) => setForm({ ...form, otpCode: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-gold/50 outline-none" />

            <button type="submit" disabled={loading || form.otpCode.length !== 6}
              className="w-full py-3 bg-coral text-white font-medium rounded-lg hover:bg-coral-light transition disabled:opacity-50">
              {loading ? 'Creating account...' : `Verify & Join — Get ${WELCOME_BONUS_POINTS} EStays Cash`}
            </button>
            <button type="button" onClick={() => setStep('details')}
              className="w-full py-2 text-sm text-navy/50 hover:text-navy">
              ← Back to details
            </button>
          </form>
        )}

        <p className="text-center text-sm text-navy/50 mt-4">
          Already a member? <Link href="/login" className="text-coral hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
