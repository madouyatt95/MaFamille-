import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  BrainCircuit,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  Download,
  Gamepad2,
  LockKeyhole,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import {
  PREMIUM_MONTHLY_EQUIVALENT,
  PREMIUM_PRICING,
  PREMIUM_YEARLY_SAVE
} from '../utils/premiumPricing';
import { appStoreBillingService, type AppStoreProduct } from '../services/appStoreBillingService';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  foyerId?: string | null;
  onStartStripeCheckout?: (options: {
    plan: 'monthly' | 'yearly';
  }) => Promise<void>;
  onStartAppStorePurchase?: (options: {
    plan: 'monthly' | 'yearly';
  }) => Promise<void>;
  onRestoreAppStorePurchase?: () => Promise<void>;
  onUnlockPremium: (options: {
    platform: 'web' | 'ios';
    plan: 'monthly' | 'yearly';
    source: 'test';
    status: 'trialing';
    expiresAt: string;
  }) => void;
}

const PREMIUM_HIGHLIGHTS = [
  {
    title: 'Toute la famille réunie',
    description: 'Membres illimités, rôles, documents et organisation partagée.',
    icon: Users,
    tone: 'violet'
  },
  {
    title: 'Assistant vraiment intelligent',
    description: 'Micro principal et 10 requêtes IA réelles par foyer et par jour.',
    icon: BrainCircuit,
    tone: 'blue'
  },
  {
    title: 'Jeux familiaux complets',
    description: 'Bibliothèques intégrales, parties privées, progression et statistiques.',
    icon: Gamepad2,
    tone: 'pink'
  },
  {
    title: 'Souvenirs et histoires enrichis',
    description: 'Contes personnalisés, narration, capsules et Gazette BD familiale.',
    icon: Sparkles,
    tone: 'gold'
  },
  {
    title: 'Cuisine, voyages et quotidien',
    description: 'Éco-Chef, listes intelligentes, valises et conseils personnalisés.',
    icon: Mic,
    tone: 'green'
  },
  {
    title: 'Exports et démarches avancées',
    description: 'PDF, Excel, historiques et suivi administratif du foyer.',
    icon: Download,
    tone: 'cyan'
  }
] as const;

const COMPARISON_ROWS = [
  ['Membres du foyer', '3', 'Illimités'],
  ['Jeux en famille', 'Découverte', 'Complets + privés'],
  ['Assistant IA', 'Local', '10 appels réels / jour'],
  ['Exports et historique', 'Essentiels', 'PDF, Excel et statistiques']
] as const;

export const Paywall: React.FC<PaywallProps> = ({
  isOpen,
  onClose,
  foyerId,
  onStartStripeCheckout,
  onStartAppStorePurchase,
  onRestoreAppStorePurchase,
  onUnlockPremium
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [simulating, setSimulating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [appStoreProducts, setAppStoreProducts] = useState<AppStoreProduct[]>([]);
  const [appStoreCatalogStatus, setAppStoreCatalogStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [appStoreCatalogReload, setAppStoreCatalogReload] = useState(0);

  const isWeb = Capacitor.getPlatform() === 'web';
  const platform = isWeb ? 'web' : 'ios';
  const monthlyAppStoreProduct = appStoreProducts.find(product => product.id === appStoreBillingService.productIds.monthly);
  const yearlyAppStoreProduct = appStoreProducts.find(product => product.id === appStoreBillingService.productIds.yearly);
  const appStoreCatalogReady = isWeb || (!!monthlyAppStoreProduct && !!yearlyAppStoreProduct && appStoreCatalogStatus === 'ready');
  const priceMonthly = monthlyAppStoreProduct?.price || (isWeb ? PREMIUM_PRICING.web.monthly : '—');
  const priceYearly = yearlyAppStoreProduct?.price || (isWeb ? PREMIUM_PRICING.web.yearly : '—');
  const dynamicMonthlyEquivalent = yearlyAppStoreProduct?.priceAmount && yearlyAppStoreProduct.currencyCode
    ? new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: yearlyAppStoreProduct.currencyCode,
        maximumFractionDigits: 2
      }).format(yearlyAppStoreProduct.priceAmount / 12)
    : null;
  const dynamicYearlySave = monthlyAppStoreProduct?.priceAmount && yearlyAppStoreProduct?.priceAmount
    ? Math.max(0, Math.round((1 - yearlyAppStoreProduct.priceAmount / (monthlyAppStoreProduct.priceAmount * 12)) * 100))
    : null;
  const priceMonthlyEquivalent = dynamicMonthlyEquivalent || PREMIUM_MONTHLY_EQUIVALENT[platform];
  const priceYearlySave = dynamicYearlySave !== null
    ? `-${dynamicYearlySave}%`
    : PREMIUM_YEARLY_SAVE[platform];
  const selectedPrice = selectedPlan === 'monthly' ? priceMonthly : priceYearly;
  const selectedPeriod = selectedPlan === 'monthly' ? 'par mois' : 'par an';
  const canUseStripe = isWeb && !!foyerId && !!onStartStripeCheckout;
  const canUseAppStore = !isWeb && appStoreCatalogReady && !!foyerId && !!onStartAppStorePurchase;
  const testModeEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PREMIUM_TEST_MODE === 'true';
  const canPurchase = canUseStripe || canUseAppStore || testModeEnabled;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !checkoutLoading && !restoreLoading && !simulating) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [checkoutLoading, isOpen, onClose, restoreLoading, simulating]);

  useEffect(() => {
    if (!isOpen || isWeb) return;
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => {
      setAppStoreCatalogStatus('loading');
      setAppStoreProducts([]);
      appStoreBillingService.getProducts()
        .then(products => {
          if (cancelled) return;
          setAppStoreProducts(products);
          const productIds = new Set(products.map(product => product.id));
          setAppStoreCatalogStatus(
            productIds.has(appStoreBillingService.productIds.monthly)
            && productIds.has(appStoreBillingService.productIds.yearly)
              ? 'ready'
              : 'unavailable'
          );
        })
        .catch(error => {
          console.warn('[Paywall] Unable to load localized App Store prices:', error);
          if (!cancelled) setAppStoreCatalogStatus('unavailable');
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
    };
  }, [appStoreCatalogReload, isOpen, isWeb]);

  if (!isOpen) return null;

  const handlePurchaseSimulate = () => {
    if (!testModeEnabled) return;
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      onUnlockPremium({
        platform,
        plan: selectedPlan,
        source: 'test',
        status: 'trialing',
        expiresAt: expiresAt.toISOString()
      });
      onClose();
    }, 900);
  };

  const handleRealPurchase = async () => {
    try {
      setCheckoutLoading(true);
      if (canUseStripe && onStartStripeCheckout) {
        await onStartStripeCheckout({ plan: selectedPlan });
        return;
      }
      if (canUseAppStore && onStartAppStorePurchase) {
        await onStartAppStorePurchase({ plan: selectedPlan });
        onClose();
        return;
      }
    } catch (error) {
      console.error('[Paywall] Premium checkout failed:', error);
      alert(error instanceof Error ? error.message : 'Impossible de démarrer le paiement Premium.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRestorePurchase = async () => {
    if (isWeb || !onRestoreAppStorePurchase) return;
    try {
      setRestoreLoading(true);
      await onRestoreAppStorePurchase();
      onClose();
    } catch (error) {
      console.error('[Paywall] App Store restore failed:', error);
      alert(error instanceof Error ? error.message : 'Impossible de restaurer les achats App Store.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handlePrimaryAction = testModeEnabled && !canUseStripe && !canUseAppStore
    ? handlePurchaseSimulate
    : handleRealPurchase;

  return (
    <div className="premium-paywall fixed inset-0 z-[100] flex items-end justify-center bg-[#020712]/82 backdrop-blur-md sm:items-center sm:p-5 animate-fade-in">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-paywall-title"
        className="premium-paywall__surface relative flex max-h-[96dvh] w-full max-w-[760px] flex-col overflow-hidden border border-white/10 bg-[#091424] shadow-[0_28px_90px_rgba(0,0,0,0.48)] sm:max-h-[92vh] sm:rounded-[28px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'offre Premium"
          title="Fermer"
          className="premium-paywall__close absolute right-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white/70 transition hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="premium-paywall__scroll flex-1 overflow-y-auto overscroll-contain">
          <header className="premium-paywall__hero border-b border-white/8 px-5 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] sm:px-8 sm:pb-7 sm:pt-7">
            <div className="max-w-[620px] pr-12">
              <div className="mb-4 flex items-center gap-3">
                <div className="premium-paywall__brand flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FFCB6B]/30 bg-[#FFB020]/12 text-[#FFCB6B]">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-[#FFCB6B]">MyFamily+ Premium</p>
                  <p className="mt-0.5 text-[11px] font-bold text-white/45">Une seule offre pour tout le foyer</p>
                </div>
              </div>

              <h2 id="premium-paywall-title" className="text-[28px] font-black leading-[1.1] text-white sm:text-[34px]">
                Toute votre famille,<br className="hidden sm:block" /> sans les limites.
              </h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-white/58">
                Débloquez les outils intelligents, les jeux complets et toute l’organisation avancée du foyer pendant 7 jours.
              </p>

              <div className="premium-paywall__trial mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/18">
                <div className="p-3 sm:p-4">
                  <span className="block text-[9px] font-black uppercase text-white/38">Aujourd’hui</span>
                  <strong className="mt-1 block text-sm text-white">0 €</strong>
                </div>
                <div className="border-x border-white/8 p-3 sm:p-4">
                  <span className="block text-[9px] font-black uppercase text-white/38">Pendant 7 jours</span>
                  <strong className="mt-1 block text-sm text-white">Tout Premium</strong>
                </div>
                <div className="p-3 sm:p-4">
                  <span className="block text-[9px] font-black uppercase text-white/38">Ensuite</span>
                  <strong className="mt-1 block text-sm text-white">{selectedPrice}</strong>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-7">
            <section aria-labelledby="premium-plan-title">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="premium-paywall__eyebrow">Votre formule</p>
                  <h3 id="premium-plan-title" className="mt-1 text-base font-black text-white">Choisissez votre rythme</h3>
                </div>
                <span className="hidden items-center gap-1.5 text-[10px] font-bold text-white/45 sm:inline-flex">
                  <ShieldCheck className="h-4 w-4 text-[#00D26A]" /> Paiement sécurisé
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Période d'abonnement">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === 'monthly'}
                  onClick={() => setSelectedPlan('monthly')}
                  className={`premium-paywall__plan relative min-h-[118px] rounded-2xl border p-4 text-left transition ${selectedPlan === 'monthly' ? 'is-selected' : ''}`}
                >
                  <span className="block text-[10px] font-black uppercase text-white/42">Mensuel</span>
                  <strong className="mt-2 block text-xl font-black text-white">{priceMonthly}</strong>
                  <span className="mt-1 block text-[11px] font-semibold text-white/48">par mois · sans engagement</span>
                  <span className="premium-paywall__radio-dot absolute right-4 top-4 h-4 w-4 rounded-full border border-white/20" />
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan === 'yearly'}
                  onClick={() => setSelectedPlan('yearly')}
                  className={`premium-paywall__plan relative min-h-[118px] rounded-2xl border p-4 text-left transition ${selectedPlan === 'yearly' ? 'is-selected' : ''}`}
                >
                  <span className="absolute right-3 top-3 rounded-full bg-[#00D26A]/14 px-2 py-1 text-[9px] font-black text-[#00D26A]">
                    Économisez {priceYearlySave.replace('-', '')}
                  </span>
                  <span className="block text-[10px] font-black uppercase text-white/42">Annuel</span>
                  <strong className="mt-2 block text-xl font-black text-white">{priceYearly}</strong>
                  <span className="mt-1 block text-[11px] font-semibold text-[#68E6A0]">soit {priceMonthlyEquivalent} / mois</span>
                  <span className="premium-paywall__radio-dot absolute bottom-4 right-4 h-4 w-4 rounded-full border border-white/20" />
                </button>
              </div>

              {!isWeb && appStoreCatalogStatus === 'unavailable' && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#FFB020]/25 bg-[#FFB020]/8 px-4 py-3">
                  <p className="text-[11px] font-semibold leading-relaxed text-white/65">
                    Les abonnements Apple sont momentanément indisponibles.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAppStoreCatalogReload(value => value + 1)}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/7 px-3 py-2 text-[10px] font-black text-white transition hover:bg-white/12"
                  >
                    Réessayer
                  </button>
                </div>
              )}
            </section>

            <section aria-labelledby="premium-benefits-title">
              <p className="premium-paywall__eyebrow">Ce que Premium change</p>
              <h3 id="premium-benefits-title" className="mt-1 text-base font-black text-white">Plus utile chaque jour, plus vivant ensemble</h3>
              <div className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {PREMIUM_HIGHLIGHTS.map(({ title, description, icon: Icon, tone }) => (
                  <div key={title} className="premium-paywall__feature flex gap-3 border-b border-white/7 py-4" data-tone={tone}>
                    <div className="premium-paywall__feature-icon mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-black text-white">{title}</h4>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/48">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="premium-comparison-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 id="premium-comparison-title" className="text-sm font-black text-white">Gratuit ou Premium</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#FFCB6B]"><Crown className="h-3.5 w-3.5" /> Pour tout le foyer</span>
              </div>
              <div className="premium-paywall__comparison overflow-hidden rounded-2xl border border-white/9">
                <div className="grid grid-cols-[1.25fr_.7fr_1fr] border-b border-white/8 bg-white/[0.035] px-3 py-2.5 text-[9px] font-black uppercase text-white/38 sm:px-4">
                  <span>Fonctionnalité</span><span>Gratuit</span><span className="text-[#FFCB6B]">Premium</span>
                </div>
                {COMPARISON_ROWS.map(([label, free, premium]) => (
                  <div key={label} className="grid grid-cols-[1.25fr_.7fr_1fr] items-center border-b border-white/6 px-3 py-3 text-[10px] last:border-0 sm:px-4 sm:text-[11px]">
                    <span className="font-bold text-white/70">{label}</span>
                    <span className="text-white/38">{free}</span>
                    <span className="flex items-center gap-1.5 font-black text-white"><Check className="h-3.5 w-3.5 shrink-0 text-[#00D26A]" />{premium}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <footer className="premium-paywall__footer shrink-0 border-t border-white/9 bg-[#07111F]/96 px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-8 sm:pb-5">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!canPurchase || checkoutLoading || restoreLoading || simulating}
            className="premium-paywall__cta flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#6C5CFF] px-4 text-sm font-black text-white shadow-[0_12px_30px_rgba(108,92,255,0.3)] transition hover:bg-[#5B4EFA] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {checkoutLoading || simulating ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Préparation de votre essai...</>
            ) : !isWeb && appStoreCatalogStatus === 'loading' ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Connexion à l’App Store...</>
            ) : canPurchase ? (
              <>{isWeb ? 'Essayer Premium gratuitement' : 'Continuer avec l’App Store'} <ChevronRight className="h-4 w-4" /></>
            ) : (
              <><LockKeyhole className="h-4 w-4" /> Abonnements indisponibles</>
            )}
          </button>

          {!isWeb && (
            <button
              type="button"
              onClick={handleRestorePurchase}
              disabled={!onRestoreAppStorePurchase || checkoutLoading || restoreLoading || simulating}
              className="mt-2.5 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-[11px] font-black text-white/62 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {restoreLoading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Restauration...</> : 'Restaurer mes achats'}
            </button>
          )}

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[9px] font-semibold text-white/38">
            <span>7 jours gratuits</span>
            <span aria-hidden="true">•</span>
            <span>Puis {selectedPrice} {selectedPeriod}</span>
            <span aria-hidden="true">•</span>
            <span>Annulable à tout moment</span>
            {isWeb && selectedPlan === 'monthly' && <><span aria-hidden="true">•</span><span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" /> Codes promotionnels acceptés</span></>}
            {!isWeb && <><span aria-hidden="true">•</span><span>Facturation Apple</span></>}
          </div>
          <div className="mt-2 flex justify-center gap-4 text-[9px] font-bold text-white/35">
            <a href="/legal/terms.html" target="_blank" rel="noreferrer" className="hover:text-white/60">Conditions</a>
            <a href="/legal/privacy.html" target="_blank" rel="noreferrer" className="hover:text-white/60">Confidentialité</a>
          </div>
        </footer>
      </section>
    </div>
  );
};
