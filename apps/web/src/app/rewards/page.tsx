'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStoredUser, getLoyaltyProfile } from '@/lib/api';
import { LOYALTY_TIERS } from '@estays/shared';

const TIER_GRADIENT: Record<string, string> = {
  SILVER: 'from-slate-400 to-slate-600',
  GOLD: 'from-gold to-yellow-600',
  VIP: 'from-coral to-orange-500',
  PLATINUM: 'from-navy via-purple-900 to-navy-light',
};

export default function RewardsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStoredUser()) {
      router.push('/login?redirect=/rewards');
      return;
    }
    getLoyaltyProfile().then((res) => {
      if (res.success) setProfile(res.data as Record<string, unknown>);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="text-center py-20 text-navy/50">Loading your rewards...</div>;
  if (!profile) return <div className="text-center py-20 text-red-500">Unable to load rewards profile</div>;

  const tier = profile.tier as string;
  const tiers = Object.values(LOYALTY_TIERS);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero card */}
      <div className={`bg-gradient-to-br ${TIER_GRADIENT[tier]} text-white rounded-2xl p-8 mb-8 shadow-xl`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white/70 text-sm uppercase tracking-widest">EStays Cash Balance</p>
            <p className="text-5xl font-display font-bold mt-1">{(profile.points as number).toLocaleString()}</p>
            <p className="text-white/80 text-sm mt-2">Earn on every booking · Redeem on future stays</p>
          </div>
          <div className="text-center bg-white/20 rounded-xl px-4 py-3">
            <div className="text-3xl">{profile.tierIcon as string}</div>
            <div className="font-bold text-sm mt-1">{profile.tierLabel as string}</div>
            <div className="text-xs text-white/70">Member</div>
          </div>
        </div>
        {profile.nextTier && (
          <div className="mt-6 bg-white/10 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to {profile.nextTierLabel as string}</span>
              <span>{profile.pointsToNext as number} EStays Cash to go</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min(100, ((profile.points as number) / ((profile.points as number) + (profile.pointsToNext as number))) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-white/60 mt-2">{profile.lifetimeBookings as number} lifetime bookings</p>
          </div>
        )}
      </div>

      {/* Current perks */}
      <div className="bg-white rounded-xl border border-gold/10 p-6 mb-8">
        <h2 className="font-display text-xl font-bold text-navy mb-4">Your {profile.tierLabel as string} Perks</h2>
        <ul className="space-y-2">
          {(profile.perks as string[]).map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm text-navy/80">
              <span className="text-green-500">✓</span> {perk}
            </li>
          ))}
        </ul>
      </div>

      {/* All tiers */}
      <h2 className="font-display text-xl font-bold text-navy mb-4">Membership Tiers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {tiers.map((t) => (
          <div
            key={t.tier}
            className={`rounded-xl border p-5 transition ${tier === t.tier ? 'border-coral bg-coral/5 shadow-md' : 'border-gold/10 bg-white'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{t.icon}</span>
              <span className="font-bold text-navy">{t.label}</span>
              {tier === t.tier && <span className="text-xs bg-coral text-white px-2 py-0.5 rounded-full">Current</span>}
            </div>
            <p className="text-xs text-navy/50 mb-3">
              {t.minPoints.toLocaleString()}+ points or {t.minBookings}+ bookings
            </p>
            <ul className="space-y-1">
              {t.perks.slice(0, 3).map((p) => (
                <li key={p} className="text-xs text-navy/70">• {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link href="/" className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-light transition">
          Book & Earn More EStays Cash
        </Link>
      </div>
    </div>
  );
}
