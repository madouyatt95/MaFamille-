import type { Foyer } from '../types';
import type { PremiumPlan, PremiumPlatform } from '../utils/premiumPricing';

export type BillingProvider = 'test' | 'stripe' | 'appstore';
export type PremiumStatus = 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';

export type PremiumSubscriptionSnapshot = {
  isPremium: boolean;
  source: BillingProvider;
  plan: PremiumPlan;
  status: PremiumStatus;
  expiresAt: string;
  platform: PremiumPlatform;
};

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

export const billingService = {
  createTestSubscription(platform: PremiumPlatform, plan: PremiumPlan): PremiumSubscriptionSnapshot {
    const expiresAt = addMonths(new Date(), plan === 'yearly' ? 12 : 1).toISOString();
    return {
      isPremium: true,
      source: 'test',
      plan,
      status: 'active',
      expiresAt,
      platform
    };
  },

  isFoyerPremium(foyer?: Foyer | null): boolean {
    if (!foyer?.isPremium) return false;
    if (!foyer.premiumExpiresAt) return true;
    return new Date(foyer.premiumExpiresAt).getTime() > Date.now();
  },

  getStatusLabel(foyer?: Foyer | null): string {
    if (!foyer?.isPremium) return 'Gratuit';
    if (foyer.premiumSource === 'test') return 'Premium test';
    if (foyer.premiumSource === 'stripe') return 'Premium Stripe';
    if (foyer.premiumSource === 'appstore') return 'Premium App Store';
    return 'Premium';
  }
};
