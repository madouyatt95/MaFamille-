import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Plus,
  ShoppingCart,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  MoreHorizontal,
  ChevronRight,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import type { Transaction, SavingGoal, Member } from '../types';

interface FinancesProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  savingGoals: SavingGoal[];
  setSavingGoals: React.Dispatch<React.SetStateAction<SavingGoal[]>>;
  members: Member[];
  currencySymbol?: string;
  formatMoney: (amount: number) => string;
  onAddTransactionClick: () => void;
  activeMemberId?: string;
}

type FinanceTab = 'apercu' | 'depenses' | 'revenus' | 'budget';

export const Finances: React.FC<FinancesProps> = ({
  transactions,
  setTransactions,
  savingGoals,
  setSavingGoals,
  formatMoney,
  onAddTransactionClick,
  activeMemberId = '1'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinanceTab>('apercu');
  const [selectedMonth, setSelectedMonth] = useState('Mai 2026');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSavingGoalsModalOpen, setIsSavingGoalsModalOpen] = useState(false);

  // Dynamic purchases for children
  const [childGoal, setChildGoal] = useState(() => {
    const saved = localStorage.getItem(`child_purchase_goal_${activeMemberId}`);
    if (saved) return JSON.parse(saved);
    return activeMemberId === '3' 
      ? { title: 'Nouveau jeu Switch 🎮', target: 50 }
      : { title: 'Kit de dessin 🎨', target: 20 };
  });

  const isChild = activeMemberId === '3' || activeMemberId === '4';
  const childName = activeMemberId === '3' ? 'Amadou' : 'Awa';
  
  if (isChild) {
    const balance = activeMemberId === '3' ? 15.00 : 22.50;
    const points = activeMemberId === '3' ? 150 : 85;
    
    // Filter transactions to show only their rewards / pocket money entries
    const childTransactions = transactions.filter(t => t.memberName === childName || t.category === 'Argent de Poche');
    
    return (
      <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-md mx-auto premium-glow-purple">
        {/* Child Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020]">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Ma Tirelire active</h1>
            <p className="text-xs text-white/50 font-medium">Mon argent de poche & mes objectifs</p>
          </div>
        </div>

        {/* Dynamic Balance Card */}
        <div className="relative rounded-[28px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-6 flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#FFB020]/15 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#4F8CFF]/15 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Mon Solde Disponible</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-white">{formatMoney(balance)}</span>
              <span className="text-xs font-bold text-white/40">sur mon compte</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                <span className="text-[9px] font-bold text-white/40 uppercase block">Points gagnés</span>
                <span className="text-xs font-extrabold text-[#FFB020] mt-1 block">{points} Pts</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                <span className="text-[9px] font-bold text-white/40 uppercase block">Tâches faites</span>
                <span className="text-xs font-extrabold text-[#00D26A] mt-1 block">4 / 6</span>
              </div>
            </div>
          </div>
        </div>

        {/* Piggy Bank Target Progress */}
        <div className="glass-panel border border-white/10 rounded-[28px] p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PiggyBank className="w-5 h-5 text-[#4F8CFF]" />
              <span className="text-xs font-extrabold text-white">Mon Projet d'Achat 🎯</span>
            </div>
            <span className="text-[10px] font-bold text-[#4F8CFF] bg-[#4F8CFF]/10 px-2 py-0.5 rounded-full">En cours</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <h4 className="text-xs font-bold text-white/90">{childGoal.title}</h4>
              <span className="text-[10px] font-bold text-white/50">{balance} € / {childGoal.target} €</span>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#4F8CFF] to-[#6C5CFF] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((balance / childGoal.target) * 100))}%` }} />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[9px] font-bold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-md">
                {balance >= childGoal.target ? "Bravo, tu as assez d'argent !" : `Il te manque ${Math.max(0, childGoal.target - balance)} € pour ton projet !`}
              </span>
              <button 
                onClick={() => {
                  const title = window.prompt("Quel est ton nouvel objectif d'achat ?", childGoal.title);
                  if (!title) return;
                  const price = window.prompt("Quel est son prix (€) ?", childGoal.target.toString());
                  if (!price || isNaN(Number(price))) return;
                  const updated = { title, target: Number(price) };
                  setChildGoal(updated);
                  localStorage.setItem(`child_purchase_goal_${activeMemberId}`, JSON.stringify(updated));
                }}
                className="text-[10px] font-extrabold text-[#6C5CFF] hover:underline cursor-pointer bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5"
              >
                Définir 🎯
              </button>
            </div>
          </div>
        </div>

        {/* Kids Chore Rewards List */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Historique de mes gains</span>
          <div className="space-y-2.5">
            {childTransactions.length > 0 ? (
              childTransactions.map((t) => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between transition-all hover:bg-white/8 animate-fade-in">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{t.title}</h4>
                      <span className="text-[9px] text-white/30 block mt-0.5">{t.date}</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-[#00D26A] bg-[#00D26A]/10 px-2.5 py-1 rounded-lg">
                    +{formatMoney(t.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center glass-panel rounded-2xl border border-white/5">
                <span className="text-xs text-white/30">Aucun gain enregistré pour le moment. Fais tes tâches ménagères pour gagner de l'argent de poche ! 🧹</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculs financiers réels basés sur les transactions du state
  const totalRevenus = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDepenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalEpargne = transactions
    .filter(t => t.type === 'savings')
    .reduce((acc, t) => acc + t.amount, 0);

  // Catégories statiques / dynamiques de dépenses

  const categoriesDef = [
    { name: 'Alimentation', icon: ShoppingCart, color: 'bg-[#00D26A]', textCol: 'text-[#00D26A]', raw: 650 },
    { name: 'Logement', icon: Home, color: 'bg-[#4F8CFF]', textCol: 'text-[#4F8CFF]', raw: 450 },
    { name: 'Transport', icon: Car, color: 'bg-[#FFB020]', textCol: 'text-[#FFB020]', raw: 250 },
    { name: 'Santé', icon: HeartPulse, color: 'bg-[#FF4D6D]', textCol: 'text-[#FF4D6D]', raw: 150 },
    { name: 'Éducation', icon: GraduationCap, color: 'bg-[#6C5CFF]', textCol: 'text-[#6C5CFF]', raw: 100 },
    { name: 'Autres', icon: MoreHorizontal, color: 'bg-white/40', textCol: 'text-white/60', raw: 100 }
  ];

  // Calculer les pourcentages de chaque catégorie de dépenses
  const totalRaw = categoriesDef.reduce((acc, c) => acc + c.raw, 0);
  const categoriesBreakdown = categoriesDef.map(cat => {
    // Calculer le montant réel par rapport au budget (ou proportionnel au montant total des dépenses réelles)
    const proportion = cat.raw / totalRaw;
    const realAmount = totalDepenses * proportion;
    const percentage = Math.round(proportion * 100);
    
    return {
      ...cat,
      amount: realAmount,
      percentage
    };
  });

  // Objectif d'épargne principal
  const mainGoal = savingGoals[0] || {
    title: 'Vacances été 2026',
    targetAmount: 2500,
    currentAmount: 1100,
    targetDate: '01/07/2026',
    category: 'Voyages'
  };
  const goalPercentage = Math.min(100, Math.round((mainGoal.currentAmount / mainGoal.targetAmount) * 100));

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-4xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Finances</h1>
            <p className="text-xs text-white/50 font-medium">Gestion du budget et épargne</p>
          </div>
        </div>
        
        <button 
          onClick={onAddTransactionClick}
          className="p-3 rounded-2xl bg-[#6C5CFF] text-white hover:opacity-90 transition-all cursor-pointer shadow-[0_4px_12px_rgba(108,92,255,0.4)]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 4 sub-tabs layout (Aperçu, Dépenses, Revenus, Budget) */}
      <div className="glass-panel rounded-[24px] p-1.5 flex justify-between items-center border border-white/6 overflow-x-auto no-scrollbar">
        {[
          { id: 'apercu', label: 'Aperçu' },
          { id: 'depenses', label: 'Dépenses' },
          { id: 'revenus', label: 'Revenus' },
          { id: 'budget', label: 'Budget' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as FinanceTab)}
            className={`flex-1 py-2.5 rounded-[16px] text-xs font-bold transition-all cursor-pointer shrink-0 px-4 text-center ${
              activeSubTab === tab.id
                ? 'bg-[#6C5CFF] text-white shadow-[0_4px_10px_rgba(108,92,255,0.3)]'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Selector Month */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ce mois-ci</h3>
        <select 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-[#6C5CFF] cursor-pointer"
        >
          <option value="Mai 2026" className="bg-[#07111F]">Mai 2026</option>
          <option value="Avril 2026" className="bg-[#07111F]">Avril 2026</option>
          <option value="Mars 2026" className="bg-[#07111F]">Mars 2026</option>
        </select>
      </div>

      {/* Revenues / Expenses / Savings Summary Cards Grid */}
      <div className="grid grid-cols-3 gap-3">
        
        {/* Card 1: Rev */}
        <div className="glass-panel rounded-[28px] p-4 border border-white/6 flex flex-col justify-between h-[120px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-[#00D26A]/20">
            <TrendingUp className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Revenus</span>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#00D26A] truncate">
              {formatMoney(totalRevenus)}
            </h3>
            <p className="text-[9px] text-[#00D26A] font-semibold mt-0.5">+12% ce mois</p>
          </div>
        </div>

        {/* Card 2: Dep */}
        <div className="glass-panel rounded-[28px] p-4 border border-white/6 flex flex-col justify-between h-[120px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-[#FF4D6D]/20">
            <TrendingDown className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dépenses</span>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#FF4D6D] truncate">
              {formatMoney(totalDepenses)}
            </h3>
            <p className="text-[9px] text-[#FF4D6D] font-semibold mt-0.5">-3% ce mois</p>
          </div>
        </div>

        {/* Card 3: Sav */}
        <div className="glass-panel rounded-[28px] p-4 border border-white/6 flex flex-col justify-between h-[120px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-[#4F8CFF]/20">
            <PiggyBank className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Épargne</span>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#4F8CFF] truncate">
              {formatMoney(totalEpargne)}
            </h3>
            <p className="text-[9px] text-[#4F8CFF] font-semibold mt-0.5">43% d'objectif</p>
          </div>
        </div>

      </div>

      {/* Category Spendings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dépenses par catégorie</h3>
          <button 
            onClick={() => setSelectedCategory('Alimentation')}
            className="text-xs font-semibold text-[#6C5CFF] hover:underline flex items-center cursor-pointer"
          >
            Voir tout <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {/* Spendings List with Progress Bars */}
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
          {categoriesBreakdown.map((cat, idx) => {
            const CatIcon = cat.icon;
            return (
              <div 
                key={idx} 
                onClick={() => setSelectedCategory(cat.name)}
                className="space-y-2 cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl bg-white/5 ${cat.textCol} border border-white/5`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <span>{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span>{formatMoney(cat.amount)}</span>
                    <span className="text-[10px] text-white/40 font-semibold ml-2">{cat.percentage}%</span>
                  </div>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    style={{ width: `${cat.percentage}%` }}
                    className={`h-full ${cat.color} rounded-full transition-all duration-1000 ease-out`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Goal Card with inline SVG vector beach */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Objectif d'épargne</h3>
          <button 
            onClick={() => setIsSavingGoalsModalOpen(true)}
            className="text-xs font-semibold text-[#6C5CFF] hover:underline flex items-center cursor-pointer"
          >
            Voir tout <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div 
          onClick={() => setIsSavingGoalsModalOpen(true)}
          className="glass-panel rounded-[28px] border border-white/8 p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:border-[#FFB020]/45 transition-all"
        >
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#FFB020]/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Tropical vector graphics */}
          <div className="absolute right-4 bottom-2 w-36 h-36 opacity-95 pointer-events-none select-none hidden sm:block">
            <svg viewBox="0 0 160 160" fill="none" className="w-full h-full">
              {/* Island Ground */}
              <ellipse cx="80" cy="135" rx="55" ry="15" fill="#FFB020" fillOpacity="0.85" />
              <ellipse cx="80" cy="140" rx="40" ry="8" fill="#4F8CFF" fillOpacity="0.25" filter="blur(4px)" />
              
              {/* Sea base */}
              <path d="M10,135 Q80,125 150,135" stroke="rgba(79, 140, 255, 0.4)" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Palm tree trunk */}
              <path d="M105,135 Q92,100 95,70" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="5.5" strokeLinecap="round" />
              <path d="M105,135 Q92,100 95,70" stroke="#FFB020" strokeWidth="2" strokeLinecap="round" />
              
              {/* Palm leaves - dynamic success green paths */}
              <path d="M95,70 Q75,65 65,75" stroke="#00D26A" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M95,70 Q80,50 82,40" stroke="#00D26A" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M95,70 Q110,50 120,55" stroke="#00D26A" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M95,70 Q115,70 125,82" stroke="#00D26A" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M95,70 Q95,85 92,95" stroke="#00D26A" strokeWidth="3" strokeLinecap="round" />
              
              {/* Coconuts */}
              <circle cx="91" cy="74" r="3.5" fill="#FF4D6D" />
              <circle cx="98" cy="73" r="3" fill="#FF4D6D" />
              
              {/* Sun glowing yellow */}
              <circle cx="45" cy="50" r="16" fill="#FFB020" fillOpacity="0.15" />
              <circle cx="45" cy="50" r="11" fill="#FFB020" fillOpacity="0.85" className="animate-pulse" />
              
              {/* Minimal birds */}
              <path d="M25,25 Q30,22 35,26 Q40,22 45,25" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M135,30 Q138,27 141,31 Q144,27 147,30" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>

          {/* Goal Content */}
          <div className="z-10 space-y-4 flex-1">
            <div>
              <span className="text-[9px] font-extrabold text-[#FFB020] uppercase tracking-widest bg-[#FFB020]/10 border border-[#FFB020]/20 px-3 py-1 rounded-full">
                {mainGoal.category}
              </span>
              <h4 className="text-base font-extrabold text-white mt-2">{mainGoal.title}</h4>
              <p className="text-xs text-white/50 font-medium">Échéance cible : {mainGoal.targetDate}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <p className="text-sm font-extrabold text-white">
                  {formatMoney(mainGoal.currentAmount)}
                  <span className="text-xs text-white/40 font-medium"> / {formatMoney(mainGoal.targetAmount)}</span>
                </p>
                <span className="text-xs font-bold text-[#FFB020] bg-[#FFB020]/10 px-2 py-0.5 rounded-lg">
                  {goalPercentage}%
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 max-w-sm">
                <div 
                  style={{ width: `${goalPercentage}%` }}
                  className="h-full bg-gradient-to-r from-[#FFB020] to-[#6C5CFF] rounded-full transition-all duration-1000 ease-out"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transactions récentes</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
          {transactions.map((t) => (
            <div 
              key={t.id}
              className="glass-panel rounded-[28px] p-4 border border-white/6 flex items-center justify-between hover:bg-white/8 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl border border-white/5 ${
                  t.type === 'income' 
                    ? 'text-[#00D26A] bg-[#00D26A]/10' 
                    : t.type === 'savings'
                      ? 'text-[#4F8CFF] bg-[#4F8CFF]/10'
                      : 'text-[#FF4D6D] bg-[#FF4D6D]/10'
                }`}>
                  {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">{t.title}</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                    {t.category} {t.memberName ? `• ${t.memberName}` : ''}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`text-xs sm:text-sm font-extrabold ${
                  t.type === 'income' 
                    ? 'text-[#00D26A]' 
                    : t.type === 'savings'
                      ? 'text-[#4F8CFF]'
                      : 'text-white'
                }`}>
                  {t.type === 'income' ? '+' : t.type === 'savings' ? '→' : '-'}
                  {formatMoney(t.amount)}
                </span>
                <p className="text-[9px] text-white/30 font-medium mt-0.5">{t.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Spendings Detail Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-[32px] p-6 w-full max-w-md bg-[#0D1527] space-y-4 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => setSelectedCategory(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white text-lg font-bold"
            >
              ×
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#FF4D6D] uppercase tracking-widest block">Détails Dépenses</span>
              <h3 className="text-base font-extrabold text-white">Catégorie : {selectedCategory}</h3>
            </div>

            {/* List category transactions */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {transactions.filter(t => t.category === selectedCategory && t.type === 'expense').length > 0 ? (
                transactions.filter(t => t.category === selectedCategory && t.type === 'expense').map(t => (
                  <div key={t.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{t.title}</h4>
                      <p className="text-[9px] text-white/40 font-semibold">{t.date} • {t.memberName || 'Famille'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold text-[#FF4D6D] mr-2">-{formatMoney(t.amount)}</span>
                      <button 
                        onClick={() => {
                          const newT = window.prompt("Modifier le titre :", t.title);
                          if (!newT) return;
                          const newA = window.prompt("Modifier le montant :", t.amount.toString());
                          if (!newA || isNaN(Number(newA))) return;
                          setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, title: newT, amount: Number(newA) } : item));
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] cursor-pointer"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm("Supprimer cette transaction ?")) {
                            setTransactions(prev => prev.filter(item => item.id !== t.id));
                          }
                        }}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px] cursor-pointer"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/40 text-center py-4">Aucune dépense enregistrée dans cette catégorie.</p>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button 
                onClick={() => {
                  const title = window.prompt("Titre de la nouvelle dépense :");
                  if (!title) return;
                  const amountStr = window.prompt("Montant (€) :");
                  if (!amountStr || isNaN(Number(amountStr))) return;
                  const newT: Transaction = {
                    id: `t-${Date.now()}`,
                    title,
                    amount: Number(amountStr),
                    type: 'expense',
                    category: selectedCategory,
                    date: new Date().toLocaleDateString('fr-FR'),
                    memberName: activeMemberId === '1' ? 'Papa' : 'Maman'
                  };
                  setTransactions(prev => [newT, ...prev]);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#6C5CFF] text-white text-xs font-bold transition hover:opacity-90 cursor-pointer"
              >
                ➕ Ajouter une dépense
              </button>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold transition hover:bg-white/10 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Goals CRUD Modal */}
      {isSavingGoalsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-[32px] p-6 w-full max-w-md bg-[#0D1527] space-y-4 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => setIsSavingGoalsModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white text-lg font-bold"
            >
              ×
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest block">Épargne Familiale</span>
              <h3 className="text-base font-extrabold text-white">Objectifs d'Épargne de la Maison</h3>
            </div>

            {/* List all saving goals */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {savingGoals.length > 0 ? (
                savingGoals.map((g, idx) => {
                  const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                  return (
                    <div key={idx} className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{g.title}</h4>
                          <p className="text-[9px] text-white/40 font-semibold">Cible: {g.targetDate} • {g.category}</p>
                        </div>
                        <div className="flex space-x-1.5">
                          <button 
                            onClick={() => {
                              const newTitle = window.prompt("Modifier le titre :", g.title);
                              if (!newTitle) return;
                              const newTarget = window.prompt("Montant cible :", g.targetAmount.toString());
                              if (!newTarget || isNaN(Number(newTarget))) return;
                              const newCurrent = window.prompt("Montant déjà épargné :", g.currentAmount.toString());
                              if (!newCurrent || isNaN(Number(newCurrent))) return;
                              const newDate = window.prompt("Date cible (JJ/MM/AAAA) :", g.targetDate);
                              if (!newDate) return;
                              setSavingGoals(prev => prev.map(item => item.title === g.title ? {
                                ...item,
                                title: newTitle,
                                targetAmount: Number(newTarget),
                                currentAmount: Number(newCurrent),
                                targetDate: newDate
                              } : item));
                            }}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] cursor-pointer"
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm("Supprimer cet objectif d'épargne ?")) {
                                setSavingGoals(prev => prev.filter(item => item.title !== g.title));
                              }
                            }}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[10px] cursor-pointer"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50 font-bold">
                          <span>{formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}</span>
                          <span className="text-[#FFB020]">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FFB020] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-white/40 text-center py-4">Aucun objectif d'épargne défini.</p>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button 
                onClick={() => {
                  const title = window.prompt("Titre de l'objectif d'épargne :");
                  if (!title) return;
                  const targetAmount = window.prompt("Montant cible (€) :");
                  if (!targetAmount || isNaN(Number(targetAmount))) return;
                  const currentAmount = window.prompt("Montant déjà épargné (€) :");
                  if (!currentAmount || isNaN(Number(currentAmount))) return;
                  const targetDate = window.prompt("Date cible (JJ/MM/AAAA) :");
                  if (!targetDate) return;
                  const newGoal: SavingGoal = {
                    id: `g-${Date.now()}`,
                    title,
                    targetAmount: Number(targetAmount),
                    currentAmount: Number(currentAmount),
                    targetDate,
                    category: 'Épargne'
                  };
                  setSavingGoals(prev => [...prev, newGoal]);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#FFB020] text-black text-xs font-extrabold transition hover:opacity-90 cursor-pointer"
              >
                ➕ Créer un Objectif
              </button>
              <button 
                onClick={() => setIsSavingGoalsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold transition hover:bg-white/10 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
