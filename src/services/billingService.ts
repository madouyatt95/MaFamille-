import type { Foyer } from '../types';
import type { PremiumPlan, PremiumPlatform } from '../utils/premiumPricing';
import { getSupabaseClient } from '../utils/supabase';

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

export const billingService = {
  createTestSubscription(platform: PremiumPlatform, plan: PremiumPlan): PremiumSubscriptionSnapshot {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
      isPremium: true,
      source: 'test',
      plan,
      status: 'trialing',
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
    if (foyer.premiumStatus === 'trialing') return 'Essai Premium';
    if (foyer.premiumSource === 'test') return 'Premium test';
    if (foyer.premiumSource === 'stripe') return 'Premium Stripe';
    if (foyer.premiumSource === 'appstore') return 'Premium App Store';
    return 'Premium';
  },

  async startStripeCheckout(foyerId: string, plan: PremiumPlan): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase n'est pas disponible.");
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Vous devez être connecté pour lancer le paiement.");
    }

    const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
      body: { foyerId, plan },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      throw new Error(error.message || "Impossible de démarrer le paiement Stripe.");
    }

    if (!data?.url) {
      throw new Error(data?.message || "Stripe n'a pas renvoyé de lien de paiement.");
    }

    window.location.href = data.url;
  }
};
