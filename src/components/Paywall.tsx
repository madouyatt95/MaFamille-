import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  Sparkles, 
  X, 
  Crown, 
  Mic, 
  BookOpen, 
  FolderLock, 
  RefreshCw, 
  Users,
  Download,
  Plane,
  HeartHandshake,
  Check,
  LockKeyhole,
  Smartphone,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { PREMIUM_FEATURES } from '../utils/premiumFeatures';
import {
  getPremiumPlanLabel,
  PREMIUM_BILLING_PROVIDER,
  PREMIUM_MONTHLY_EQUIVALENT,
  PREMIUM_PLATFORM_LABEL,
  PREMIUM_PRICING,
  PREMIUM_REAL_PROVIDER_LABEL,
  PREMIUM_YEARLY_SAVE
} from '../utils/premiumPricing';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  foyerId?: string | null;
  onStartStripeCheckout?: (options: {
    plan: 'monthly' | 'yearly';
  }) => Promise<void>;
  onUnlockPremium: (options: {
    platform: 'web' | 'ios';
    plan: 'monthly' | 'yearly';
    source: 'test';
    status: 'active';
    expiresAt: string;
  }) => void;
}

export const Paywall: React.FC<PaywallProps> = ({ isOpen, onClose, foyerId, onStartStripeCheckout, onUnlockPremium }) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [simulating, setSimulating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isWeb = Capacitor.getPlatform() === 'web';
  const platform = isWeb ? 'web' : 'ios';
  const priceMonthly = PREMIUM_PRICING[platform].monthly;
  const priceYearly = PREMIUM_PRICING[platform].yearly;
  const priceMonthlyEquivalent = PREMIUM_MONTHLY_EQUIVALENT[platform];
  const priceYearlySave = PREMIUM_YEARLY_SAVE[platform];
  const platformLabel = PREMIUM_PLATFORM_LABEL[platform];
  const billingProvider = PREMIUM_BILLING_PROVIDER[platform];
  const realProviderLabel = PREMIUM_REAL_PROVIDER_LABEL[platform];
  const selectedPrice = selectedPlan === 'monthly' ? priceMonthly : priceYearly;
  const selectedPlanLabel = getPremiumPlanLabel(platform, selectedPlan);
  const canUseStripe = isWeb && !!foyerId && !!onStartStripeCheckout;

  if (!isOpen) return null;

  const handlePurchaseSimulate = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + (selectedPlan === 'yearly' ? 12 : 1));
      onUnlockPremium({
        platform,
        plan: selectedPlan,
        source: 'test',
        status: 'active',
        expiresAt: expiresAt.toISOString()
      });
      alert(`Mode test Premium activé pour l’offre ${selectedPlanLabel}. Aucun paiement réel n’a été lancé.`);
      onClose();
    }, 1800);
  };

  const handleRealPurchase = async () => {
    if (!canUseStripe || !onStartStripeCheckout) {
      alert("Le paiement réel n'est pas encore disponible sur cette plateforme.");
      return;
    }

    try {
      setCheckoutLoading(true);
      await onStartStripeCheckout({ plan: selectedPlan });
    } catch (err) {
      console.error("[Paywall] Stripe checkout failed:", err);
      alert(err instanceof Error ? err.message : "Impossible de démarrer le paiement Stripe.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const mainBenefits = [
    {
      label: 'Inclus gratuitement',
      value: '3 membres, documents et organisation du quotidien',
      icon: Users
    },
    {
      label: 'Débloqué en Premium',
      value: 'IA réelle, exports, démarches et modules famille avancés',
      icon: LockKeyhole
    },
    {
      label: 'Quota IA',
      value: '10 requêtes réelles par foyer et par jour, puis repli simulé',
      icon: Sparkles
    }
  ];

  const premiumFeatures = [
    { 
      title: PREMIUM_FEATURES.real_ai.title,
      desc: PREMIUM_FEATURES.real_ai.description,
      icon: Sparkles, 
      color: "text-[#6C5CFF] bg-[#6C5CFF]/10" 
    },
    { 
      title: PREMIUM_FEATURES.exports.title,
      desc: PREMIUM_FEATURES.exports.description,
      icon: Download,
      color: "text-[#00D26A] bg-[#00D26A]/10"
    },
    {
      title: PREMIUM_FEATURES.demarches.title,
      desc: PREMIUM_FEATURES.demarches.description,
      icon: FolderLock,
      color: "text-[#4F8CFF] bg-[#4F8CFF]/10"
    },
    {
      title: PREMIUM_FEATURES.members_over_3.title,
      desc: PREMIUM_FEATURES.members_over_3.description,
      icon: Users,
      color: "text-[#FF4D6D] bg-[#FF4D6D]/10"
    },
    {
      title: PREMIUM_FEATURES.eco_chef_ai.title,
      desc: PREMIUM_FEATURES.eco_chef_ai.description,
      icon: Sparkles,
      color: "text-[#6C5CFF] bg-[#6C5CFF]/10"
    },
    {
      title: PREMIUM_FEATURES.voyage_ai.title,
      desc: PREMIUM_FEATURES.voyage_ai.description,
      icon: Plane,
      color: "text-[#FF4D6D] bg-[#FF4D6D]/10"
    },
    {
      title: PREMIUM_FEATURES.capsule_gazette_bd_ai.title,
      desc: PREMIUM_FEATURES.capsule_gazette_bd_ai.description,
      icon: BookOpen, 
      color: "text-[#FFB020] bg-[#FFB020]/10" 
    },
    { 
      title: PREMIUM_FEATURES.bedtime_stories_ai.title,
      desc: PREMIUM_FEATURES.bedtime_stories_ai.description,
      icon: Mic, 
      color: "text-[#00D26A] bg-[#00D26A]/10" 
    },
    { 
      title: PREMIUM_FEATURES.peacemaker_ai.title,
      desc: PREMIUM_FEATURES.peacemaker_ai.description,
      icon: HeartHandshake,
      color: "text-[#00D26A] bg-[#00D26A]/10"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel border border-[#6C5CFF]/30 rounded-[28px] overflow-hidden bg-[#07111F] shadow-[0_25px_70px_-20px_rgba(108,92,255,0.42)] max-h-[92vh] flex flex-col">
        <button 
          onClick={onClose}
          aria-label="Fermer l'offre Premium"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/8 border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="shrink-0 p-5 sm:p-6 border-b border-white/8 bg-gradient-to-br from-[#101B35] via-[#0D1428] to-[#07111F]">
          <div className="flex items-start gap-4 pr-10">
            <div className="shrink-0 p-3 rounded-2xl bg-[#6C5CFF]/14 border border-[#6C5CFF]/30 text-[#8E82FF] shadow-[0_0_22px_rgba(108,92,255,0.22)]">
              <Crown className="w-7 h-7" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">MyFamily+ Premium</h2>
                <span className="px-2.5 py-1 rounded-full bg-[#00D26A]/12 border border-[#00D26A]/20 text-[9px] text-[#00D26A] font-black uppercase tracking-wider">
                  {isWeb ? 'Paiement réel PWA' : 'Test iOS'}
                </span>
              </div>
              <p className="text-sm text-white/58 leading-relaxed max-w-xl">
                {isWeb
                  ? "Une seule offre familiale pour débloquer les limites, les exports et les modules IA avancés. Paiement sécurisé par Stripe pour la PWA."
                  : "Une seule offre familiale pour débloquer les limites, les exports et les modules IA avancés. Le paiement iOS passera par l'App Store."}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/7 border border-white/10 text-[10px] text-white/68 font-black uppercase tracking-wider">
                  <Smartphone className="w-3.5 h-3.5" />
                  {platformLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/7 border border-white/10 text-[10px] text-white/68 font-black uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5" />
                  Paiement : {realProviderLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {mainBenefits.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl bg-white/[0.045] border border-white/8 p-4 min-h-[118px]">
                    <Icon className="w-5 h-5 text-[#8E82FF] mb-3" />
                    <p className="text-[10px] text-white/38 font-black uppercase tracking-wider">{item.label}</p>
                    <p className="text-xs text-white/76 font-bold leading-relaxed mt-1.5">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-white/38 font-black uppercase tracking-wider">Choisir l'offre</p>
                  <p className="text-sm text-white font-extrabold mt-1">{selectedPlanLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg text-white font-black">{selectedPrice}</p>
                  <p className="text-[10px] text-white/42 font-semibold">Mode {billingProvider}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedPlan === 'monthly'
                      ? 'bg-[#6C5CFF]/18 border-[#8E82FF] shadow-[0_0_18px_rgba(108,92,255,0.18)]'
                      : 'bg-white/[0.035] border-white/8 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="text-[9px] font-black text-white/42 uppercase tracking-widest block">Mensuel</span>
                  <span className="text-base font-black text-white block mt-1">{priceMonthly}</span>
                  <span className="text-[10px] text-[#7DB2FF] font-bold block mt-1">Sans engagement</span>
                </button>

                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    selectedPlan === 'yearly'
                      ? 'bg-[#6C5CFF]/18 border-[#8E82FF] shadow-[0_0_18px_rgba(108,92,255,0.18)]'
                      : 'bg-white/[0.035] border-white/8 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-[#FF4D6D] to-[#6C5CFF] text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    {priceYearlySave}
                  </div>
                  <span className="text-[9px] font-black text-white/42 uppercase tracking-widest block">Annuel</span>
                  <span className="text-base font-black text-white block mt-1">{priceYearly}</span>
                  <span className="text-[10px] text-[#00D26A] font-bold block mt-1">Soit {priceMonthlyEquivalent} / mois</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[10px] text-white/38 font-black uppercase tracking-wider">Modules Premium</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-white/48 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D26A]" />
                  Lié au foyer
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {premiumFeatures.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div key={feat.title} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.035] border border-white/8">
                      <div className={`p-2 rounded-xl shrink-0 ${feat.color} border border-white/5`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white leading-snug">{feat.title}</h4>
                        <p className="text-[10.5px] text-white/50 mt-0.5 leading-normal font-sans font-medium">{feat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-black/45 border-t border-white/8 shrink-0 space-y-3">
          {isWeb ? (
            <button
              onClick={handleRealPurchase}
              disabled={checkoutLoading || !canUseStripe}
              className="w-full py-4 rounded-[20px] bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:scale-[1.005] transition-all shadow-[0_8px_24px_rgba(108,92,255,0.28)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Ouverture du paiement...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Payer avec Stripe · {selectedPrice}</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handlePurchaseSimulate}
              disabled={simulating}
              className="w-full py-4 rounded-[20px] bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:scale-[1.005] transition-all shadow-[0_8px_24px_rgba(108,92,255,0.28)] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Activation du mode test...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Activer Premium test · {selectedPrice}</span>
                </>
              )}
            </button>
          )}
          {isWeb && (
            <button
              onClick={handlePurchaseSimulate}
              disabled={simulating || checkoutLoading}
              className="w-full py-3 rounded-[18px] bg-white/[0.055] border border-white/10 text-white/58 font-extrabold text-[10px] tracking-wider uppercase cursor-pointer hover:bg-white/[0.08] transition-all disabled:opacity-50"
            >
              {simulating ? "Activation du test..." : "Garder le raccourci test"}
            </button>
          )}
          <p className="text-[10px] text-white/34 text-center font-sans leading-relaxed">
            {isWeb
              ? "Après paiement, Stripe confirmera l'abonnement et le foyer passera Premium automatiquement."
              : "Aucun prélèvement iOS pour le moment. L'achat App Store sera branché dans une étape séparée."}
          </p>
        </div>
      </div>
    </div>
  );
};
