import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PremiumPlan } from '../utils/premiumPricing';
import { getSupabaseClient } from '../utils/supabase';
import type { PremiumSubscriptionSnapshot } from './billingService';

export type AppStoreProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount?: number;
  currencyCode?: string;
};

type AppStoreTransaction = {
  status: 'verified' | 'pending';
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  appAccountToken?: string;
  signedTransactionInfo?: string;
  expiresAt?: string;
  localStoreKitTest?: boolean;
  message?: string;
};

type AppStoreBillingPlugin = {
  getProducts(options: { productIds: string[] }): Promise<{ products: AppStoreProduct[] }>;
  purchase(options: { productId: string; appAccountToken: string }): Promise<AppStoreTransaction>;
  restore(options: { productIds: string[] }): Promise<AppStoreTransaction>;
};

const AppStoreBilling = registerPlugin<AppStoreBillingPlugin>('AppStoreBilling');

const APP_STORE_PRODUCT_IDS: Record<PremiumPlan, string> = {
  monthly: import.meta.env.VITE_APP_STORE_PREMIUM_MONTHLY_PRODUCT_ID || 'myfamilyplus.premium.monthly',
  yearly: import.meta.env.VITE_APP_STORE_PREMIUM_YEARLY_PRODUCT_ID || 'myfamilyplus.premium.yearly'
};

function planFromProductId(productId?: string): PremiumPlan {
  return productId === APP_STORE_PRODUCT_IDS.monthly ? 'monthly' : 'yearly';
}

async function verifyWithSupabase(
  foyerId: string,
  transaction: AppStoreTransaction
): Promise<PremiumSubscriptionSnapshot> {
  if (transaction.localStoreKitTest) {
    return {
      isPremium: true,
      source: 'test',
      plan: planFromProductId(transaction.productId),
      status: 'trialing',
      expiresAt: transaction.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      platform: 'ios',
      appStoreOriginalTransactionId: transaction.originalTransactionId || null
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase n'est pas disponible.");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Vous devez être connecté pour valider l'achat App Store.");
  }

  const { data, error } = await supabase.functions.invoke('verify-app-store-purchase', {
    body: {
      foyerId,
      productId: transaction.productId,
      transactionId: transaction.transactionId,
      originalTransactionId: transaction.originalTransactionId,
      appAccountToken: transaction.appAccountToken,
      signedTransactionInfo: transaction.signedTransactionInfo
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) {
    throw new Error(error.message || "Impossible de valider l'achat App Store.");
  }

  if (!data?.subscription) {
    throw new Error(data?.message || "La validation App Store n'a pas renvoyé d'abonnement.");
  }

  return data.subscription as PremiumSubscriptionSnapshot;
}

export const appStoreBillingService = {
  productIds: APP_STORE_PRODUCT_IDS,

  isAvailable(): boolean {
    return Capacitor.getPlatform() === 'ios';
  },

  async getProducts(): Promise<AppStoreProduct[]> {
    if (!this.isAvailable()) return [];
    const result = await AppStoreBilling.getProducts({
      productIds: Object.values(APP_STORE_PRODUCT_IDS)
    });
    return result.products || [];
  },

  async purchase(foyerId: string, plan: PremiumPlan): Promise<PremiumSubscriptionSnapshot> {
    if (!this.isAvailable()) {
      throw new Error("Les achats App Store sont disponibles uniquement sur iPhone/iPad.");
    }
    const transaction = await AppStoreBilling.purchase({
      productId: APP_STORE_PRODUCT_IDS[plan],
      appAccountToken: foyerId
    });
    if (transaction.status === 'pending') {
      throw new Error(transaction.message || "L'achat est en attente de validation par Apple.");
    }
    return verifyWithSupabase(foyerId, transaction);
  },

  async restore(foyerId: string): Promise<PremiumSubscriptionSnapshot> {
    if (!this.isAvailable()) {
      throw new Error("La restauration App Store est disponible uniquement sur iPhone/iPad.");
    }
    const transaction = await AppStoreBilling.restore({
      productIds: Object.values(APP_STORE_PRODUCT_IDS)
    });
    if (transaction.status === 'pending') {
      throw new Error(transaction.message || "La restauration est en attente de validation par Apple.");
    }
    return verifyWithSupabase(foyerId, transaction);
  },

  planFromProductId
};
