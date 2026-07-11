import { userRepository } from '../repositories/user.repository';
import {
  calculateTier,
  earnPointsForBooking,
  LOYALTY_TIERS,
  pointsToNextTier,
  WELCOME_BONUS_POINTS,
  LoyaltyTier,
} from '@estays/shared';

export class LoyaltyService {
  getProfile(user: {
    loyaltyPoints: number;
    loyaltyTier: string;
    lifetimeBookings: number;
  }) {
    const tier = (user.loyaltyTier as LoyaltyTier) || calculateTier(user.loyaltyPoints, user.lifetimeBookings);
    const tierInfo = LOYALTY_TIERS[tier];
    const nextTier = tier === 'PLATINUM' ? null : tier === 'SILVER' ? 'GOLD' : tier === 'GOLD' ? 'VIP' : 'PLATINUM';
    const nextInfo = nextTier ? LOYALTY_TIERS[nextTier] : null;

    return {
      points: user.loyaltyPoints,
      tier,
      tierLabel: tierInfo.label,
      tierIcon: tierInfo.icon,
      tierColor: tierInfo.color,
      lifetimeBookings: user.lifetimeBookings,
      perks: tierInfo.perks,
      earnMultiplier: tierInfo.earnMultiplier,
      nextTier,
      nextTierLabel: nextInfo?.label,
      pointsToNext: pointsToNextTier(user.loyaltyPoints, user.lifetimeBookings, tier),
      allTiers: Object.values(LOYALTY_TIERS),
    };
  }

  async awardWelcomeBonus(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) return null;

    return userRepository.updateLoyalty(userId, {
      loyaltyPoints: user.loyaltyPoints + WELCOME_BONUS_POINTS,
      loyaltyTier: calculateTier(user.loyaltyPoints + WELCOME_BONUS_POINTS, user.lifetimeBookings),
    });
  }

  async awardBookingPoints(userId: string, amountUsd: number) {
    const user = await userRepository.findById(userId);
    if (!user) return null;

    const tier = (user.loyaltyTier as LoyaltyTier) || 'SILVER';
    const earned = earnPointsForBooking(amountUsd, tier);
    const newPoints = user.loyaltyPoints + earned;
    const newBookings = user.lifetimeBookings + 1;
    const newTier = calculateTier(newPoints, newBookings);

    return userRepository.updateLoyalty(userId, {
      loyaltyPoints: newPoints,
      loyaltyTier: newTier,
      lifetimeBookings: newBookings,
    });
  }
}

export const loyaltyService = new LoyaltyService();
