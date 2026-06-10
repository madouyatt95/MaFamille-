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
  HeartHandshake
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
  onUnlockPremium: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ isOpen, onClose, onUnlockPremium }) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [simulating, setSimulating] = useState(false);

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

  if (!isOpen) return null;

  const handlePurchaseSimulate = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      onUnlockPremium();
      alert(`Mode test Premium activé pour l’offre ${selectedPlanLabel}. Aucun paiement réel n’a été lancé.`);
      onClose();
    }, 1800);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel border border-[#6C5CFF]/30 rounded-[32px] overflow-hidden bg-gradient-to-b from-[#0F1E3D]/95 to-[#07111F]/98 shadow-[0_25px_60px_-15px_rgba(108,92,255,0.3)] max-h-[90vh] flex flex-col justify-between">
        
        {/* Glowing aura */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#6C5CFF]/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-[#FF4D6D]/10 blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/8 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header content */}
        <div className="p-6 text-center space-y-2 shrink-0 border-b border-white/5">
          <div className="inline-flex p-3 rounded-full bg-[#6C5CFF]/10 border border-[#6C5CFF]/30 text-[#6C5CFF] shadow-[0_0_15px_rgba(108,92,255,0.2)] animate-bounce-slow">
            <Crown className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>MyFamily+</span>
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-[9px] font-extrabold text-white tracking-wider uppercase">Premium</span>
          </h2>
          <p className="text-xs text-white/50 max-w-xs mx-auto">
            Débloquez les outils avancés du foyer : IA réelle, exports, démarches, grande famille et modules créatifs.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] text-white/60 font-black uppercase tracking-wider">
              {platformLabel}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 text-[9px] text-[#00D26A] font-black uppercase tracking-wider">
              Mode test
            </span>
          </div>
        </div>

        {/* Features scroll area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 no-scrollbar">
          <div className="space-y-3">
            {premiumFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="flex items-start space-x-3.5 p-3 rounded-2xl bg-white/3 border border-white/5">
                  <div className={`p-2 rounded-xl shrink-0 ${feat.color} border border-white/5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{feat.title}</h4>
                    <p className="text-[10.5px] text-white/50 mt-0.5 leading-normal font-sans font-medium">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Cards & CTA Action */}
        <div className="p-6 bg-black/40 border-t border-white/5 space-y-5 shrink-0 rounded-t-[28px]">
          
          {/* Plan Options Selector */}
          <div className="rounded-2xl bg-white/5 border border-white/8 p-3 text-center">
            <span className="text-[9px] text-white/35 font-black uppercase tracking-widest block">Offre sélectionnée</span>
            <span className="text-sm text-white font-black mt-1 block">{selectedPrice}</span>
            <span className="text-[10px] text-white/45 font-semibold block mt-0.5">{selectedPlanLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedPlan === 'monthly'
                  ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] shadow-[0_0_15px_rgba(108,92,255,0.15)]'
                  : 'bg-white/3 border-white/5 opacity-60 hover:opacity-85'
              }`}
            >
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Mensuel</span>
              <span className="text-sm font-black text-white block mt-1">{priceMonthly} <span className="text-[10px] font-medium text-white/50">/ mois</span></span>
              <span className="text-[9px] text-[#4F8CFF] font-bold block mt-1 font-sans">Sans engagement</span>
            </button>

            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                selectedPlan === 'yearly'
                  ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] shadow-[0_0_15px_rgba(108,92,255,0.15)]'
                  : 'bg-white/3 border-white/5 opacity-60 hover:opacity-85'
              }`}
            >
              {/* Ribbon */}
              <div className="absolute top-0 right-0 bg-gradient-to-l from-[#FF4D6D] to-[#6C5CFF] text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                {priceYearlySave}
              </div>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Annuel</span>
              <span className="text-sm font-black text-white block mt-1">{priceYearly} <span className="text-[10px] font-medium text-white/50">/ an</span></span>
              <span className="text-[9px] text-[#00D26A] font-bold block mt-1 font-sans">Soit {priceMonthlyEquivalent} / mois</span>
            </button>
          </div>

          {/* CTA Action button */}
          <div className="space-y-3">
            <button
              onClick={handlePurchaseSimulate}
              disabled={simulating}
              className="w-full py-4 rounded-[22px] bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:scale-[1.01] transition-all shadow-[0_4px_20px_rgba(108,92,255,0.25)] flex items-center justify-center space-x-2"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Activation du mode test...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-bounce" />
                  <span>Activer Premium pour tester</span>
                </>
              )}
            </button>
            
            <p className="text-[9.5px] text-white/30 text-center font-sans">
              Aucun prélèvement aujourd’hui. Provider actuel : {billingProvider}. Le paiement réel sera branché plus tard via {realProviderLabel}.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
