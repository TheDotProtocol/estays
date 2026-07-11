'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendOtp, registerPartner } from '@/lib/api';

export default function PartnerSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    companyName: '', companyAddress: '', otpCode: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    const res = await sendOtp(form.email, 'PARTNER_REGISTER');
    if (!res.success) {
      setError(res.error?.message || 'Failed to send verification code');
      setLoading(false);
      return;
    }
    setInfo('A 6-digit code has been sent to your email.');
    setStep('verify');
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await registerPartner(form);
    if (!res.success) {
      setError(res.error?.message || 'Registration failed');
      setLoading(false);
      return;
    }
    router.push('/partner');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-navy">Partner with E Stays</h1>
          <p className="text-gold text-sm mt-1">List your property on our global platform</p>
        </div>

        <div className="bg-sand rounded-xl p-4 mb-6 text-sm text-navy/70">
          <p className="font-medium text-navy mb-1">After signup:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Verify your email with the OTP code</li>
            <li>Upload KYC documents (ID, business proof)</li>
            <li>Wait for admin approval before listing properties</li>
          </ol>
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
            <input required type="email" placeholder="Business email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            <input required placeholder="Contact phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            <input required placeholder="Company / property name" value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            <input required placeholder="Business address" value={form.companyAddress}
              onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />
            <input required type="password" placeholder="Password (min 8 chars)" minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none" />

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-navy text-white font-medium rounded-lg hover:bg-navy-light transition disabled:opacity-50">
              {loading ? 'Sending code...' : 'Send Email Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="bg-white rounded-2xl shadow-lg p-8 border border-gold/20 space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
            {info && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{info}</div>}

            <p className="text-sm text-navy/60">Enter the code sent to <strong>{form.email}</strong></p>
            <input required maxLength={6} placeholder="000000" value={form.otpCode}
              onChange={(e) => setForm({ ...form, otpCode: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-gold/50 outline-none" />

            <button type="submit" disabled={loading || form.otpCode.length !== 6}
              className="w-full py-3 bg-navy text-white font-medium rounded-lg hover:bg-navy-light transition disabled:opacity-50">
              {loading ? 'Creating account...' : 'Verify & Create Partner Account'}
            </button>
            <button type="button" onClick={() => setStep('details')}
              className="w-full py-2 text-sm text-navy/50 hover:text-navy">
              ← Back to details
            </button>
          </form>
        )}

        <p className="text-center text-sm text-navy/50 mt-4">
          Already a partner? <Link href="/login" className="text-coral hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
