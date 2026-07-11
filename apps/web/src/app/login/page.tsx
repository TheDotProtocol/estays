'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error?.message || 'Login failed');
      setLoading(false);
      return;
    }

    const user = (res.data as { user: { roles: string[] } })?.user;
    if (user?.roles?.some((r) => ['SUPER_ADMIN', 'ADMIN'].includes(r))) {
      router.push('/admin');
    } else if (user?.roles?.some((r) => ['PARTNER', 'RECEPTIONIST'].includes(r))) {
      router.push('/partner');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo href="/" size={80} showText={false} className="justify-center mb-4" />
          <h1 className="font-display text-2xl font-bold text-navy">Welcome Back</h1>
          <p className="text-gold text-sm mt-1">Sign in to your E Stays account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 border border-gold/20">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-navy/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-navy/70 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/50 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-navy text-white font-medium rounded-lg hover:bg-navy-light transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-navy/50 mt-6">
          New guest? <Link href="/signup" className="text-coral hover:underline">Create account</Link>
          {' · '}
          Property owner? <Link href="/partner/signup" className="text-coral hover:underline">Partner signup</Link>
        </p>
      </div>
    </div>
  );
}
