export type LoyaltyTier = 'SILVER' | 'GOLD' | 'VIP' | 'PLATINUM';

export interface LoyaltyTierInfo {
  tier: LoyaltyTier;
  label: string;
  color: string;
  icon: string;
  minPoints: number;
  minBookings: number;
  earnMultiplier: number;
  perks: string[];
}

export const LOYALTY_TIERS: Record<LoyaltyTier, LoyaltyTierInfo> = {
  SILVER: {
    tier: 'SILVER',
    label: 'Silver',
    color: '#94a3b8',
    icon: '🥈',
    minPoints: 0,
    minBookings: 0,
    earnMultiplier: 1,
    perks: ['Earn 1 EStays Cash per $1 spent', 'Member-only deals', 'Free cancellation on select stays'],
  },
  GOLD: {
    tier: 'GOLD',
    label: 'Gold',
    color: '#c4a35a',
    icon: '🥇',
    minPoints: 1000,
    minBookings: 3,
    earnMultiplier: 1.25,
    perks: ['25% bonus EStays Cash', 'Priority customer support', 'Room upgrade vouchers', 'Early check-in when available'],
  },
  VIP: {
    tier: 'VIP',
    label: 'VIP',
    color: '#e8836b',
    icon: '💎',
    minPoints: 5000,
    minBookings: 10,
    earnMultiplier: 1.5,
    perks: ['50% bonus EStays Cash', 'VIP-only flash sales', 'Complimentary breakfast at partner hotels', 'Late checkout priority'],
  },
  PLATINUM: {
    tier: 'PLATINUM',
    label: 'Platinum',
    color: '#1a2b4a',
    icon: '👑',
    minPoints: 15000,
    minBookings: 25,
    earnMultiplier: 2,
    perks: ['Double EStays Cash on every booking', 'Dedicated concierge line', 'Guaranteed room upgrades', 'Exclusive Platinum-only properties', 'Airport lounge access vouchers'],
  },
};

export const WELCOME_BONUS_POINTS = 500;

export function calculateTier(points: number, bookings: number): LoyaltyTier {
  if (points >= LOYALTY_TIERS.PLATINUM.minPoints || bookings >= LOYALTY_TIERS.PLATINUM.minBookings) return 'PLATINUM';
  if (points >= LOYALTY_TIERS.VIP.minPoints || bookings >= LOYALTY_TIERS.VIP.minBookings) return 'VIP';
  if (points >= LOYALTY_TIERS.GOLD.minPoints || bookings >= LOYALTY_TIERS.GOLD.minBookings) return 'GOLD';
  return 'SILVER';
}

export function getNextTier(current: LoyaltyTier): LoyaltyTier | null {
  if (current === 'SILVER') return 'GOLD';
  if (current === 'GOLD') return 'VIP';
  if (current === 'VIP') return 'PLATINUM';
  return null;
}

export function pointsToNextTier(points: number, bookings: number, tier: LoyaltyTier): number {
  const next = getNextTier(tier);
  if (!next) return 0;
  const nextInfo = LOYALTY_TIERS[next];
  const pointsNeeded = Math.max(0, nextInfo.minPoints - points);
  const bookingsNeeded = Math.max(0, nextInfo.minBookings - bookings);
  return pointsNeeded > 0 ? pointsNeeded : bookingsNeeded * 200;
}

export function earnPointsForBooking(amountUsd: number, tier: LoyaltyTier): number {
  const multiplier = LOYALTY_TIERS[tier].earnMultiplier;
  return Math.floor(amountUsd * multiplier);
}
