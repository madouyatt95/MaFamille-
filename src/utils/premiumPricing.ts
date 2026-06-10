export type PremiumPlatform = 'web' | 'ios';
export type PremiumPlan = 'monthly' | 'yearly';
export type PremiumBillingProvider = 'test' | 'stripe' | 'appstore';

export const PREMIUM_PLATFORM_LABEL: Record<PremiumPlatform, string> = {
  web: 'PWA / Web',
  ios: 'iPhone / App Store'
};

export const PREMIUM_BILLING_PROVIDER: Record<PremiumPlatform, PremiumBillingProvider> = {
  web: 'stripe',
  ios: 'test'
};

export const PREMIUM_REAL_PROVIDER_LABEL: Record<PremiumPlatform, string> = {
  web: 'Stripe',
  ios: 'App Store'
};

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

export function getPremiumPlanLabel(platform: PremiumPlatform, plan: PremiumPlan): string {
  return `${PREMIUM_PLATFORM_LABEL[platform]} · ${plan === 'monthly' ? 'mensuel' : 'annuel'}`;
}
