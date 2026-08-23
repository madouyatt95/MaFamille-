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

type PendingAppStoreVerification = {
  foyerId: string;
  transaction: AppStoreTransaction;
  queuedAt: string;
};

type AppStoreBillingPlugin = {
  getProducts(options: { productIds: string[] }): Promise<{ products: AppStoreProduct[] }>;
  purchase(options: { productId: string; appAccountToken: string }): Promise<AppStoreTransaction>;
  restore(options: { productIds: string[] }): Promise<AppStoreTransaction>;
};

const AppStoreBilling = registerPlugin<AppStoreBillingPlugin>('AppStoreBilling');

const APP_STORE_PRODUCT_IDS: Record<PremiumPlan, string> = {
  monthly: import.meta.env.VITE_APP_STORE_PREMIUM_MONTHLY_PRODUCT_ID || 'fr.myfamilyplus.app.premium.monthly',
  yearly: import.meta.env.VITE_APP_STORE_PREMIUM_YEARLY_PRODUCT_ID || 'fr.myfamilyplus.app.premium.yearly'
};

const PENDING_VERIFICATION_KEY = 'mf_pending_app_store_verification_v1';

class AppStoreVerificationError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'AppStoreVerificationError';
    this.retryable = retryable;
  }
}

function planFromProductId(productId?: string): PremiumPlan {
  return productId === APP_STORE_PRODUCT_IDS.monthly ? 'monthly' : 'yearly';
}

function readPendingVerification(): PendingAppStoreVerification | null {
  try {
    const raw = localStorage.getItem(PENDING_VERIFICATION_KEY);
    return raw ? JSON.parse(raw) as PendingAppStoreVerification : null;
  } catch {
    return null;
  }
}

function queuePendingVerification(foyerId: string, transaction: AppStoreTransaction): void {
  try {
    localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify({
      foyerId,
      transaction: {
        ...transaction,
        // The transaction id is sufficient for the server retry. Avoid persisting the signed payload.
        signedTransactionInfo: undefined
      },
      queuedAt: new Date().toISOString()
    } satisfies PendingAppStoreVerification));
  } catch {
    // The verified StoreKit transaction remains restorable even if local storage is unavailable.
  }
}

function clearPendingVerification(foyerId: string, transactionId?: string): void {
  const pending = readPendingVerification();
  if (!pending || pending.foyerId !== foyerId) return;
  if (transactionId && pending.transaction.transactionId !== transactionId) return;
  localStorage.removeItem(PENDING_VERIFICATION_KEY);
}

function snapshotFromVerifiedTransaction(transaction: AppStoreTransaction): PremiumSubscriptionSnapshot {
  if (transaction.status !== 'verified' || !transaction.transactionId || !transaction.productId) {
    throw new Error("Apple n'a pas confirmé cette transaction.");
  }

  const suppliedExpiry = transaction.expiresAt ? new Date(transaction.expiresAt) : null;
  const expiresAt = suppliedExpiry && Number.isFinite(suppliedExpiry.getTime())
    ? suppliedExpiry.toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    isPremium: new Date(expiresAt).getTime() > Date.now(),
    source: 'appstore',
    plan: planFromProductId(transaction.productId),
    status: new Date(expiresAt).getTime() > Date.now() ? 'active' : 'expired',
    expiresAt,
    platform: 'ios',
    appStoreOriginalTransactionId: transaction.originalTransactionId || transaction.transactionId
  };
}

async function getFunctionError(error: unknown): Promise<AppStoreVerificationError> {
  const fallback = "La synchronisation de l'achat avec votre foyer est momentanément indisponible.";
  const candidate = error as { message?: string; context?: unknown } | null;
  const response = candidate?.context instanceof Response ? candidate.context : null;

  if (response) {
    const status = response.status;
    let message = fallback;
    try {
      const payload = await response.clone().json() as { message?: string };
      message = payload.message || fallback;
    } catch {
      // Keep the user-facing fallback when the gateway response is not JSON.
    }
    return new AppStoreVerificationError(message, status >= 500 || status === 429);
  }

  const technicalMessage = candidate?.message || '';
  const retryable = /fetch|network|edge function|relay|timeout|unavailable/i.test(technicalMessage);
  return new AppStoreVerificationError(retryable ? fallback : (technicalMessage || fallback), retryable);
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
      status: 'active',
      expiresAt: transaction.expiresAt || null,
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
    throw await getFunctionError(error);
  }

  if (!data?.subscription) {
    throw new Error(data?.message || "La validation App Store n'a pas renvoyé d'abonnement.");
  }

  return data.subscription as PremiumSubscriptionSnapshot;
}

async function verifyOrQueue(
  foyerId: string,
  transaction: AppStoreTransaction
): Promise<PremiumSubscriptionSnapshot> {
  try {
    const subscription = await verifyWithSupabase(foyerId, transaction);
    clearPendingVerification(foyerId, transaction.transactionId);
    return subscription;
  } catch (error) {
    // StoreKit has already verified the signed transaction on-device. Cloud sync must
    // never turn a completed Apple purchase into a blocking error for the customer.
    const subscription = snapshotFromVerifiedTransaction(transaction);
    queuePendingVerification(foyerId, transaction);
    console.warn('[App Store] StoreKit verified the purchase; cloud sync will retry later.', error);
    return subscription;
  }
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
    return verifyOrQueue(foyerId, transaction);
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
    return verifyOrQueue(foyerId, transaction);
  },

  async flushPendingVerification(foyerId: string): Promise<PremiumSubscriptionSnapshot | null> {
    const pending = readPendingVerification();
    if (!pending || pending.foyerId !== foyerId) return null;

    try {
      const subscription = await verifyWithSupabase(foyerId, pending.transaction);
      clearPendingVerification(foyerId, pending.transaction.transactionId);
      return subscription;
    } catch (error) {
      if (error instanceof AppStoreVerificationError && error.retryable) return null;
      clearPendingVerification(foyerId, pending.transaction.transactionId);
      throw error;
    }
  },

  planFromProductId
};
