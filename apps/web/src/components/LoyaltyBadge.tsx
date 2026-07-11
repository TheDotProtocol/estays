'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/api';

const TIER_STYLES: Record<string, string> = {
  SILVER: 'from-slate-400 to-slate-500',
  GOLD: 'from-gold to-gold-light',
  VIP: 'from-coral to-coral-light',
  PLATINUM: 'from-navy to-navy-light',
};

export function LoyaltyBadge({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  if (!user || user.roles && (user.roles as string[]).some((r) => ['PARTNER', 'RECEPTIONIST', 'ADMIN', 'SUPER_ADMIN'].includes(r))) {
    return null;
  }

  const tier = (user.loyaltyTier as string) || 'SILVER';
  const points = (user.loyaltyPoints as number) || 0;
  const tierIcons: Record<string, string> = { SILVER: '🥈', GOLD: '🥇', VIP: '💎', PLATINUM: '👑' };

  if (compact) {
    return (
      <Link href="/rewards" className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${TIER_STYLES[tier]} text-white font-medium`}>
        {tierIcons[tier]} {points.toLocaleString()}
      </Link>
    );
  }

  return (
    <Link href="/rewards" className="block bg-white rounded-xl border border-gold/20 p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-navy/50 uppercase tracking-wide">EStays Cash</p>
          <p className="text-xl font-bold text-navy">{points.toLocaleString()}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${TIER_STYLES[tier]}`}>
          {tierIcons[tier]} {tier}
        </span>
      </div>
    </Link>
  );
}
