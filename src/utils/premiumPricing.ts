export type PremiumPlatform = 'web' | 'ios';
export type PremiumPlan = 'monthly' | 'yearly';

export const PREMIUM_PRICING: Record<PremiumPlatform, Record<PremiumPlan, string>> = {
  web: {
    monthly: '3,99 €',
    yearly: '29,99 €'
  },
  ios: {
    monthly: '4,99 €',
    yearly: '39,99 €'
  }
};

export const PREMIUM_MONTHLY_EQUIVALENT: Record<PremiumPlatform, string> = {
  web: '2,50 €',
  ios: '3,33 €'
};

export const PREMIUM_YEARLY_SAVE: Record<PremiumPlatform, string> = {
  web: '-37%',
  ios: '-33%'
};
