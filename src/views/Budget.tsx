import React, { useState, useMemo } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Archive, 
  Search, 
  ArrowLeft, 
  ArrowLeftRight, 
  X, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import type { 
  Transaction, 
  SavingGoal, 
  Member, 
  CustomCategory, 
  Account, 
  Abonnement, 
  Debt,
  FoyerMember
} from '../types';
import { getSupabaseClient, serializeCategoryIcon, serializeTransactionComment } from '../utils/supabase';
import { BudgetExport } from './BudgetExport';
import { BudgetImport } from './BudgetImport';

interface BudgetProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  savingGoals: SavingGoal[];
  setSavingGoals: React.Dispatch<React.SetStateAction<SavingGoal[]>>;
  members: Member[];
  currencySymbol?: string;
  formatMoney: (amount: number) => string;
  onAddTransactionClick: () => void;
  activeMemberId?: string;
  onAddTransaction?: (newTrans: any) => void;
  foyerId: string;
  myMemberProfile: FoyerMember | null;
  customCategories: CustomCategory[];
  setCustomCategories: React.Dispatch<React.SetStateAction<CustomCategory[]>>;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  abonnements: Abonnement[];
  setAbonnements: React.Dispatch<React.SetStateAction<Abonnement[]>>;
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  activeSubView?: { type: 'export' | 'import' | 'transaction_form', options?: any } | null;
  onClearActiveSubView?: () => void;
}

type FinanceTab = 'dashboard' | 'transactions' | 'revenus' | 'depenses' | 'categories' | 'goals' | 'accounts' | 'abonnements' | 'budgets_modules' | 'imports' | 'exports' | 'reports';

// Default categories and subcategories mapping
export const DEFAULT_CATEGORIES = [
  { name: 'Alimentation', icon: '🛒', color: '#10B981', budget: 600, sub: ['Supermarché', 'Restaurant', 'Boulangerie', 'Épicerie', 'Café'] },
  { name: 'Transport', icon: '🚗', color: '#F59E0B', budget: 200, sub: ['Taxi', 'Uber', 'Essence', 'Péage', 'Transport public'] },
  { name: 'Santé', icon: '🩺', color: '#EF4444', budget: 150, sub: ['Médecin', 'Pharmacie', 'Dentiste', 'Vaccin', 'Analyse', 'Mutuelle'] },
  { name: 'Logement', icon: '🏠', color: '#3B82F6', budget: 800, sub: ['Loyer', 'Électricité', 'Eau', 'Internet', 'Assurance habitation', 'Travaux', 'Maintenance'] },
  { name: 'Éducation', icon: '🎓', color: '#8B5CF6', budget: 200, sub: ['Inscriptions', 'Livres', 'Cours particuliers', 'Activités', 'Cantine'] },
  { name: 'Véhicules', icon: '🔧', color: '#F59E0B', budget: 150, sub: ['Essence', 'Péage', 'Lavage', 'Assurance auto', 'Contrôle technique', 'Entretien', 'Réparation'] },
  { name: 'Voyages', icon: '✈️', color: '#06B6D4', budget: 300, sub: ['Billets', 'Hôtel', 'Transport', 'Activités', 'Repas'] },
  { name: 'Administratif', icon: '📂', color: '#6B7280', budget: 100, sub: ['Frais administratifs', 'Passeport', 'Visa', 'Carte identité', 'Timbres fiscaux'] },
  { name: 'Animaux', icon: '🐶', color: '#10B981', budget: 100, sub: ['Nourriture', 'Vétérinaire', 'Médicaments', 'Jouets'] },
  { name: 'Loisirs', icon: '🎨', color: '#EC4899', budget: 150, sub: ['Cinéma', 'Concert', 'Musée', 'Cadeaux', 'Sport'] },
  { name: 'Abonnements', icon: '🔄', color: '#6366F1', budget: 80, sub: ['Streaming', 'Téléphone', 'Logiciels'] },
  { name: 'Argent de poche', icon: '🪙', color: '#8B5CF6', budget: 50, sub: ['Allocation enfant', 'Récompense'] },
  { name: 'Épargne', icon: '🐷', color: '#10B981', budget: 200, sub: ['Cagnotte', 'Placement'] },
  { name: 'Autres', icon: '✨', color: '#6B7280', budget: 100, sub: ['Divers', 'Imprévu'] }
];

export const Budget: React.FC<BudgetProps> = ({
  transactions,
  setTransactions,
  savingGoals,
  setSavingGoals,
  members,
  currencySymbol: _currencySymbol = '€',
  formatMoney,
  onAddTransactionClick: _onAddTransactionClick,
  activeMemberId = '1',
  onAddTransaction,
  foyerId,
  myMemberProfile,
  customCategories,
  setCustomCategories,
  accounts,
  setAccounts,
  abonnements,
  setAbonnements,
  debts: _debts,
  setDebts: _setDebts,
  activeSubView,
  onClearActiveSubView
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  
  // Period filter states
  type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAboModalOpen, setIsAboModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Edit states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [editingAbo, setEditingAbo] = useState<Abonnement | null>(null);
  const [editingCat, setEditingCat] = useState<CustomCategory | null>(null);

  // Module budgets state (overrides default or sets budget limit for modules)
  const [moduleBudgets, setModuleBudgets] = useState<Record<string, { budget: number; recurrence: string }>>(() => {
    const cached = localStorage.getItem(`mf_module_budgets_${foyerId}`);
    return cached ? JSON.parse(cached) : {
      courses: { budget: 500, recurrence: 'monthly' },
      sante: { budget: 150, recurrence: 'monthly' },
      vehicules: { budget: 200, recurrence: 'monthly' },
      logement: { budget: 800, recurrence: 'monthly' },
      voyages: { budget: 1000, recurrence: 'custom' },
      ecole: { budget: 150, recurrence: 'monthly' },
      demarches: { budget: 100, recurrence: 'monthly' },
      animaux: { budget: 100, recurrence: 'monthly' },
      argent_de_poche: { budget: 50, recurrence: 'monthly' },
      taches: { budget: 50, recurrence: 'monthly' }
    };
  });

  const saveModuleBudgets = (updated: typeof moduleBudgets) => {
    setModuleBudgets(updated);
    localStorage.setItem(`mf_module_budgets_${foyerId}`, JSON.stringify(updated));
  };

  // Limit state modal
  const [selectedModuleForLimit, setSelectedModuleForLimit] = useState<string | null>(null);
  const [moduleLimitInput, setModuleLimitInput] = useState('');
  const [moduleLimitRecurrence, setModuleLimitRecurrence] = useState('monthly');

  // Interactive chart hover/selection states
  const [selectedDonutSegment, setSelectedDonutSegment] = useState<number | null>(null);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);
  const [temporalStatTab, setTemporalStatTab] = useState<'day' | 'hour' | 'week' | 'month'>('day');
  const [expandedTxHistory, setExpandedTxHistory] = useState<Record<string, boolean>>({});
  const toggleTxHistory = (txId: string) => {
    setExpandedTxHistory(prev => ({
      ...prev,
      [txId]: !prev[txId]
    }));
  };

  // Archive categories & subcategories states
  const [archivedCategories, setArchivedCategories] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mf_archived_categories_${foyerId}`) || '[]');
    } catch {
      return [];
    }
  });

  const [archivedSubcategories, setArchivedSubcategories] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mf_archived_subcategories_${foyerId}`) || '[]');
    } catch {
      return [];
    }
  });

  const trips = useMemo(() => {
    try {
      const saved = localStorage.getItem('mf_trips');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const toggleArchiveCategory = async (catName: string) => {
    const isCurrentlyArchived = archivedCategories.includes(catName);
    const nextArchived = isCurrentlyArchived
      ? archivedCategories.filter(n => n !== catName)
      : [...archivedCategories, catName];
    setArchivedCategories(nextArchived);
    localStorage.setItem(`mf_archived_categories_${foyerId}`, JSON.stringify(nextArchived));

    // Also persist to Supabase via isArchived flag in the icon column
    const cc = customCategories.find(c => c.name === catName);
    if (cc) {
      const client = getSupabaseClient();
      if (client && foyerId) {
        const updatedCat = { ...cc, isArchived: !isCurrentlyArchived };
        await client.from('custom_categories').update({
          icon: serializeCategoryIcon(updatedCat.icon, updatedCat.subcategories, updatedCat.isArchived)
        }).eq('id', cc.id);
        setCustomCategories(prev => prev.map(c => c.id === cc.id ? updatedCat : c));
      }
    }
  };

  const toggleArchiveSubcategory = (catName: string, subName: string) => {
    const key = `${catName}:${subName}`;
    setArchivedSubcategories(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem(`mf_archived_subcategories_${foyerId}`, JSON.stringify(next));
      return next;
    });
  };

  const formatTxListDate = (tx: Transaction) => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (tx.date === todayStr) {
      return `Aujourd'hui • ${tx.entryTime || `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`}`;
    }
    
    if (tx.date && tx.date.includes('-')) {
      const parts = tx.date.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return tx.date;
  };

  // Forms state
  const [txForm, setTxForm] = useState({
    title: '',
    amount: '',
    type: 'expense' as 'income' | 'expense' | 'savings' | 'transfer',
    category: 'Alimentation',
    subCategory: 'Supermarché',
    accountId: '',
    memberId: '',
    date: new Date().toISOString().split('T')[0],
    comment: '',
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'quarterly' | 'semiannually' | 'custom',
    moduleSource: 'budget',
    receiptBase64: ''
  });

  const [catForm, setCatForm] = useState({
    name: '',
    icon: '✨',
    color: '#3B82F6',
    budget: '',
    subcategories: [] as string[],
    newSubInput: ''
  });

  const [goalForm, setGoalForm] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    category: 'Épargne'
  });

  const [aboForm, setAboForm] = useState({
    name: '',
    amount: '',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    nextBillingDate: new Date().toISOString().split('T')[0],
    category: 'Abonnements'
  });

  const [transferForm, setTransferForm] = useState({
    sourceAccountId: '',
    targetAccountId: '',
    amount: '',
    title: 'Virement interne'
  });

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank' as 'bank' | 'cash' | 'savings' | 'wallet',
    balance: '',
    icon: '💳',
    color: '#6C5CFF',
    initialBalance: ''
  });
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState<Account | null>(null);

  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  // Sync sub view from props
  React.useEffect(() => {
    if (activeSubView) {
      if (activeSubView.type === 'export') {
        setActiveTab('exports');
      } else if (activeSubView.type === 'import') {
        setActiveTab('imports');
      } else if (activeSubView.type === 'transaction_form') {
        setActiveTab('transactions');
        setTxForm({
          title: activeSubView.options?.title || '',
          amount: String(activeSubView.options?.amount || ''),
          type: activeSubView.options?.type || 'expense',
          category: activeSubView.options?.category || 'Autres',
          subCategory: activeSubView.options?.subCategory || 'Divers',
          date: activeSubView.options?.date || new Date().toISOString().split('T')[0],
          accountId: activeSubView.options?.accountId || '',
          memberId: '',
          recurrence: activeSubView.options?.recurrence || 'none',
          moduleSource: activeSubView.options?.moduleSource || 'budget',
          receiptBase64: '',
          comment: activeSubView.options?.comment || ''
        });
        setIsTxModalOpen(true);
        onClearActiveSubView?.();
      }
    }
  }, [activeSubView]);

  const isAuthorized = myMemberProfile?.role === 'admin' || myMemberProfile?.role === 'parent';

  // Categories resolution
  const allCategories = useMemo(() => {
    const list = [...DEFAULT_CATEGORIES];
    customCategories.forEach(cc => {
      const idx = list.findIndex(c => c.name.toLowerCase() === cc.name.toLowerCase());
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          icon: cc.icon || list[idx].icon,
          color: cc.color || list[idx].color,
          budget: cc.budget || list[idx].budget
        };
      } else {
        list.push({
          name: cc.name,
          icon: cc.icon || '✨',
          color: cc.color || '#3B82F6',
          budget: cc.budget || 0,
          sub: cc.subcategories || ['Divers']
        } as any);
      }
    });
    return list;
  }, [customCategories]);

  const activeSubcategories = useMemo(() => {
    const matched = allCategories.find(c => c.name === txForm.category);
    if (!matched) return ['Divers'];
    return matched.sub.filter(s => !archivedSubcategories.includes(`${txForm.category}:${s}`));
  }, [txForm.category, allCategories, archivedSubcategories]);

  // Financial Stats
  const activeTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Helper to get Monday of the current week
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
    
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return transactions.filter(t => {
      if (t.isArchived) return false;

      // Exclure les budgets prévus, objectifs et limites fictives de la liste des transactions réelles
      const titleLower = t.title.toLowerCase();
      if (
        titleLower.startsWith('budget voyage') ||
        titleLower.includes('budget prévu') ||
        titleLower.includes('objectif de dépense') ||
        titleLower.includes('limite budgétaire') ||
        titleLower.includes('enveloppe voyage')
      ) {
        return false;
      }
      
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return true;

      switch (periodFilter) {
        case 'today':
          return tDate >= startOfToday;
        case 'yesterday': {
          const yesterday = new Date(startOfToday);
          yesterday.setDate(yesterday.getDate() - 1);
          const endOfYesterday = new Date(startOfToday);
          endOfYesterday.setMilliseconds(-1);
          return tDate >= yesterday && tDate <= endOfYesterday;
        }
        case 'week':
          return tDate >= startOfWeek;
        case 'month':
          return tDate >= startOfMonth;
        case 'quarter':
          return tDate >= startOfQuarter;
        case 'year':
          return tDate >= startOfYear;
        case 'custom': {
          const start = customStartDate ? new Date(customStartDate) : null;
          const end = customEndDate ? new Date(customEndDate) : null;
          if (start) start.setHours(0, 0, 0, 0);
          if (end) end.setHours(23, 59, 59, 999);
          
          if (start && tDate < start) return false;
          if (end && tDate > end) return false;
          return true;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [transactions, periodFilter, customStartDate, customEndDate]);

  // Temporal statistics calculations
  const temporalStats = useMemo(() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayMap: Record<string, number> = { 'Lundi': 0, 'Mardi': 0, 'Mercredi': 0, 'Jeudi': 0, 'Vendredi': 0, 'Samedi': 0, 'Dimanche': 0 };
    
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    
    const weekMap: Record<string, number> = {};
    
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    const monthMap: Record<string, number> = {};
    months.forEach(m => { monthMap[m] = 0; });
    
    activeTransactions.filter(t => t.type === 'expense').forEach(t => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const dName = days[d.getDay()];
        dayMap[dName] = (dayMap[dName] || 0) + t.amount;
        
        const mName = months[d.getMonth()];
        monthMap[mName] = (monthMap[mName] || 0) + t.amount;
        
        const temp = new Date(d);
        const dayOfWeek = temp.getDay();
        const diff = temp.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(temp.getFullYear(), temp.getMonth(), diff);
        const weekStr = `${monday.getDate()}/${monday.getMonth() + 1}`;
        weekMap[weekStr] = (weekMap[weekStr] || 0) + t.amount;
      }
      
      if (t.entryTime) {
        const hr = parseInt(t.entryTime.split(':')[0]);
        if (!isNaN(hr) && hr >= 0 && hr < 24) {
          hourMap[hr] = (hourMap[hr] || 0) + t.amount;
        }
      } else {
        hourMap[12] = (hourMap[12] || 0) + t.amount;
      }
    });

    return {
      day: Object.keys(dayMap).map(k => ({ label: k, amount: dayMap[k] })),
      hour: Object.keys(hourMap).map(k => ({ label: `${k}h`, amount: hourMap[Number(k)] })),
      week: Object.keys(weekMap).map(k => ({ label: `Sem. ${k}`, amount: weekMap[k] })).sort(),
      month: Object.keys(monthMap).map(k => ({ label: k.slice(0, 4), amount: monthMap[k] }))
    };
  }, [activeTransactions]);

  // Donut chart logic
  const donutData = useMemo(() => {
    const data: { category: string; icon: string; color: string; amount: number }[] = [];
    let totalExpenses = 0;
    
    allCategories.forEach(cat => {
      const amount = activeTransactions
        .filter(t => t.category === cat.name && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      if (amount > 0) {
        data.push({ category: cat.name, icon: cat.icon || '💸', color: cat.color || '#3B82F6', amount });
        totalExpenses += amount;
      }
    });

    return { segments: data, total: totalExpenses };
  }, [allCategories, activeTransactions]);

  // 12-Month Trend Line Chart Calculations
  const trendData = useMemo(() => {
    const list: { label: string; year: number; month: number; income: number; expense: number; savings: number }[] = [];
    const now = new Date();
    const localeMonths = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${localeMonths[month]} ${year.toString().slice(-2)}`;
      
      let monthIncome = 0;
      let monthExpense = 0;
      let monthSavings = 0;
      
      transactions.forEach(t => {
        if (t.isArchived) return;
        const tDate = new Date(t.date);
        if (!isNaN(tDate.getTime()) && tDate.getFullYear() === year && tDate.getMonth() === month) {
          if (t.type === 'income') monthIncome += t.amount;
          else if (t.type === 'expense') monthExpense += t.amount;
          else if (t.type === 'savings') monthSavings += t.amount;
        }
      });
      
      list.push({ label, year, month, income: monthIncome, expense: monthExpense, savings: monthSavings });
    }
    return list;
  }, [transactions]);

  const maxVal = useMemo(() => {
    let max = 100;
    trendData.forEach(d => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
      if (d.savings > max) max = d.savings;
    });
    return max * 1.15;
  }, [trendData]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let savings = 0;

    activeTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expense += t.amount;
      } else if (t.type === 'savings') {
        savings += t.amount;
      }
    });

    const accountsTotal = accounts.reduce((acc, a) => acc + a.balance, 0);
    const savingsTotal = savingGoals.reduce((acc, g) => acc + g.currentAmount, 0);

    // Sum abonnements for upcoming billing this month
    const upcomingAboCost = abonnements.reduce((acc, a) => acc + a.amount, 0);

    // Alert calculation
    const budgetAlerts: string[] = [];
    const categorySums: Record<string, number> = {};
    activeTransactions.filter(t => t.type === 'expense').forEach(t => {
      categorySums[t.category] = (categorySums[t.category] || 0) + t.amount;
    });

    allCategories.forEach(cat => {
      if (cat.budget > 0 && categorySums[cat.name] > cat.budget) {
        budgetAlerts.push(`⚠️ Le budget de la catégorie "${cat.icon} ${cat.name}" a été dépassé (${categorySums[cat.name].toFixed(2)}€ dépensés / limit ${cat.budget}€)`);
      }
    });

    return {
      soldeFamilial: accountsTotal,
      revenusMois: income,
      depensesMois: expense,
      budgetRestant: accountsTotal - expense,
      epargneTotale: savingsTotal,
      depensesAVenir: upcomingAboCost,
      alerts: budgetAlerts
    };
  }, [activeTransactions, accounts, savingGoals, abonnements, allCategories]);

  // Filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchQuery = searchQuery === '' || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subCategory && t.subCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.comment && t.comment.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
      const matchAcc = accountFilter === 'all' || t.accountId === accountFilter;

      return matchQuery && matchCat && matchAcc;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, categoryFilter, accountFilter]);

  // Operations CRUD
  const handleOpenAddTx = () => {
    setEditingTx(null);
    setTxForm({
      title: '',
      amount: '',
      type: 'expense',
      category: 'Alimentation',
      subCategory: 'Supermarché',
      accountId: accounts[0]?.id || '',
      memberId: activeMemberId,
      date: new Date().toISOString().split('T')[0],
      comment: '',
      recurrence: 'none',
      moduleSource: 'budget',
      receiptBase64: ''
    });
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxForm({
      title: tx.title,
      amount: tx.amount.toString(),
      type: (tx.type as any) || 'expense',
      category: tx.category,
      subCategory: tx.subCategory || 'Divers',
      accountId: tx.accountId || '',
      memberId: tx.memberId || '',
      date: tx.date,
      comment: tx.comment || '',
      recurrence: tx.recurrence || 'none',
      moduleSource: tx.moduleSource || 'budget',
      receiptBase64: tx.receiptBase64 || ''
    });
    setIsTxModalOpen(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Veuillez saisir un montant correct.');
      return;
    }

    const matchedMember = members.find(m => m.id === txForm.memberId);
    const newTxData: any = {
      amount: amt,
      type: txForm.type,
      category: txForm.category,
      subCategory: txForm.subCategory,
      accountId: txForm.accountId || null,
      memberId: txForm.memberId || null,
      memberName: matchedMember?.name || 'Famille',
      date: txForm.date,
      title: txForm.title,
      comment: txForm.comment,
      recurrence: txForm.recurrence,
      moduleSource: txForm.moduleSource,
      receiptBase64: txForm.receiptBase64
    };

    if (editingTx) {
      newTxData.id = editingTx.id;
      
      const history = [...(editingTx.modificationHistory || [])];
      const author = myMemberProfile?.displayName || 'Système';
      const d = new Date();
      const changeDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      
      const changes: string[] = [];
      if (editingTx.amount !== amt) {
        changes.push(`Montant modifié de ${editingTx.amount}€ à ${amt}€`);
      }
      if (editingTx.category !== txForm.category) {
        changes.push(`Catégorie changée : ${editingTx.category} → ${txForm.category}`);
      }
      if (editingTx.subCategory !== txForm.subCategory) {
        changes.push(`Sous-catégorie changée : ${editingTx.subCategory || 'Aucune'} → ${txForm.subCategory || 'Aucune'}`);
      }
      if (editingTx.title !== txForm.title) {
        changes.push(`Titre modifié : "${editingTx.title}" → "${txForm.title}"`);
      }
      
      const actionText = changes.length > 0 ? changes.join(', ') : 'Modification manuelle';
      history.push({ author, date: changeDate, action: actionText });
      
      newTxData.modificationHistory = history;
      newTxData.updatedAt = d.toISOString();
      newTxData.updated_at = d.toISOString();

      const client = getSupabaseClient();
      if (client && foyerId) {
        await client.from('transactions').update({
          amount: newTxData.amount,
          type: newTxData.type,
          category: newTxData.category,
          sub_category: newTxData.subCategory,
          account_id: newTxData.accountId,
          member_id: newTxData.memberId,
          member_name: newTxData.memberName,
          date: newTxData.date,
          title: newTxData.title,
          comment: serializeTransactionComment(newTxData.comment, {
            moduleSource: newTxData.moduleSource,
            entryTime: editingTx.entryTime,
            entryDate: editingTx.entryDate,
            travelId: editingTx.travelId || editingTx.travel_id,
            recurrenceInterval: editingTx.recurrenceInterval,
            startDate: editingTx.startDate,
            endDate: editingTx.endDate,
            nextOccurrence: editingTx.nextOccurrence
          }),
          recurrence: newTxData.recurrence,
          receipt_base64: newTxData.receiptBase64,
          modification_history: JSON.stringify(newTxData.modificationHistory)
        }).eq('id', editingTx.id);
      }

      setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...t, ...newTxData } : t));
    } else {
      newTxData.id = `tx-${Date.now()}`;
      newTxData.modificationHistory = [{ author: myMemberProfile?.displayName || 'Système', date: new Date().toISOString(), action: 'Création manuelle' }];
      
      const now = new Date();
      newTxData.entryTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      newTxData.entryDate = newTxData.date;

      const client = getSupabaseClient();
      if (client && foyerId) {
        await client.from('transactions').insert({
          id: newTxData.id,
          foyer_id: foyerId,
          amount: newTxData.amount,
          type: newTxData.type,
          category: newTxData.category,
          sub_category: newTxData.subCategory,
          account_id: newTxData.accountId,
          member_id: newTxData.memberId,
          member_name: newTxData.memberName,
          date: newTxData.date,
          title: newTxData.title,
          comment: serializeTransactionComment(newTxData.comment, {
            moduleSource: newTxData.moduleSource,
            entryTime: newTxData.entryTime,
            entryDate: newTxData.entryDate
          }),
          recurrence: newTxData.recurrence,
          receipt_base64: newTxData.receiptBase64,
          modification_history: JSON.stringify(newTxData.modificationHistory)
        });
      }

      // Automatically adjust account balance if selected
      if (txForm.accountId && onAddTransaction) {
        onAddTransaction(newTxData);
      } else {
        setTransactions(prev => [newTxData, ...prev]);
      }
    }

    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Supprimer cette transaction ?')) return;

    const client = getSupabaseClient();
    if (client) {
      await client.from('transactions').delete().eq('id', id);
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleDuplicateTx = async (tx: Transaction) => {
    const now = new Date();
    const dup: any = {
      ...tx,
      id: `tx-dup-${Date.now()}`,
      title: `${tx.title} (Copie)`,
      date: new Date().toISOString().split('T')[0],
      entryTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      entryDate: new Date().toISOString().split('T')[0]
    };
    const client = getSupabaseClient();
    if (client && foyerId) {
      await client.from('transactions').insert({
        id: dup.id,
        foyer_id: foyerId,
        amount: dup.amount,
        type: dup.type,
        category: dup.category,
        sub_category: dup.subCategory,
        account_id: dup.accountId,
        member_id: dup.memberId,
        member_name: dup.memberName,
        date: dup.date,
        title: dup.title,
        comment: serializeTransactionComment(dup.comment, {
          moduleSource: dup.moduleSource,
          entryTime: dup.entryTime,
          entryDate: dup.entryDate
        }),
        recurrence: dup.recurrence,
        receipt_base64: dup.receiptBase64,
        modification_history: JSON.stringify([{ author: myMemberProfile?.displayName || 'Système', date: new Date().toISOString(), action: 'Duplication' }])
      });
    }
    setTransactions(prev => [dup, ...prev]);
  };

  const handleArchiveTx = async (tx: Transaction) => {
    const updatedArchivedStatus = !tx.isArchived;
    const client = getSupabaseClient();
    if (client) {
      await client.from('transactions').update({ is_archived: updatedArchivedStatus }).eq('id', tx.id);
    }
    setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, isArchived: updatedArchivedStatus } : t));
  };

  // Categories logic
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) return;

    const limitVal = parseFloat(catForm.budget) || 0;
    const newCat: CustomCategory = {
      id: editingCat?.id || `cat-${Date.now()}`,
      name: catForm.name,
      icon: catForm.icon,
      color: catForm.color,
      budget: limitVal,
      displayOrder: 0,
      subcategories: catForm.subcategories as any
    };

    const client = getSupabaseClient();
    if (client && foyerId) {
      await client.from('custom_categories').upsert({
        id: newCat.id,
        foyer_id: foyerId,
        name: newCat.name,
        icon: serializeCategoryIcon(newCat.icon, newCat.subcategories, newCat.isArchived),
        color: newCat.color,
        budget: newCat.budget,
        display_order: newCat.displayOrder
      });
    }

    if (editingCat) {
      setCustomCategories(prev => {
        if (prev.some(c => c.id === editingCat.id)) {
          return prev.map(c => c.id === editingCat.id ? newCat : c);
        } else {
          return [...prev, newCat];
        }
      });
    } else {
      setCustomCategories(prev => [...prev, newCat]);
    }

    setIsCatModalOpen(false);
    setEditingCat(null);
  };

  const handleMergeCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) {
      alert('Veuillez sélectionner deux catégories distinctes.');
      return;
    }

    const client = getSupabaseClient();
    if (client && foyerId) {
      await client.from('transactions')
        .update({ category: mergeTarget })
        .eq('foyer_id', foyerId)
        .eq('category', mergeSource);
      
      const customSource = customCategories.find(c => c.name === mergeSource);
      if (customSource) {
        await client.from('custom_categories').delete().eq('id', customSource.id);
      }
    }

    setTransactions(prev => prev.map(t => t.category === mergeSource ? { ...t, category: mergeTarget } : t));
    setCustomCategories(prev => prev.filter(c => c.name !== mergeSource));
    setIsMergeModalOpen(false);
    alert('Catégories fusionnées avec succès !');
  };

  // Module budgeting modal
  const handleOpenLimitModal = (moduleName: string) => {
    setSelectedModuleForLimit(moduleName);
    const curr = moduleBudgets[moduleName];
    setModuleLimitInput(curr ? curr.budget.toString() : '');
    setModuleLimitRecurrence(curr ? curr.recurrence : 'monthly');
  };

  const handleSaveModuleLimit = () => {
    if (!selectedModuleForLimit) return;
    const limit = parseFloat(moduleLimitInput) || 0;
    const updated = {
      ...moduleBudgets,
      [selectedModuleForLimit]: { budget: limit, recurrence: moduleLimitRecurrence }
    };
    saveModuleBudgets(updated);
    setSelectedModuleForLimit(null);
  };

  // Group transactions for module budgeting overview
  const moduleDépenses = useMemo(() => {
    const map: Record<string, number> = {
      courses: 0,
      sante: 0,
      vehicules: 0,
      logement: 0,
      voyages: 0,
      ecole: 0,
      demarches: 0,
      animaux: 0,
      argent_de_poche: 0,
      taches: 0
    };

    activeTransactions.filter(t => t.type === 'expense').forEach(t => {
      const src = t.moduleSource || 'budget';
      if (src in map) {
        map[src] += t.amount;
      }
    });

    return map;
  }, [activeTransactions]);

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg">
            <PiggyBank className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">Budget</h1>
            <p className="text-xs text-white/50 font-medium">Cockpit financier transversal et comptes du foyer</p>
          </div>
        </div>

        {isAuthorized && (
          <button
            onClick={handleOpenAddTx}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Ajouter une opération</span>
          </button>
        )}
      </div>

      {/* Period Selector */}
      <div className="glass-panel border border-white/5 p-4 rounded-[28px] space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Choix de la période</span>
          <span className="text-[10px] font-bold text-purple-400 capitalize">
            {periodFilter === 'month' ? 'Ce mois' : periodFilter === 'week' ? 'Cette semaine' : periodFilter === 'today' ? "Aujourd'hui" : periodFilter === 'yesterday' ? "Hier" : periodFilter === 'quarter' ? 'Ce trimestre' : periodFilter === 'year' ? 'Cette année' : periodFilter === 'all' ? 'Toutes périodes' : 'Période personnalisée'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'today', label: "Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'week', label: 'Cette semaine' },
            { id: 'month', label: 'Ce mois' },
            { id: 'quarter', label: 'Ce trimestre' },
            { id: 'year', label: 'Cette année' },
            { id: 'all', label: 'Toutes' },
            { id: 'custom', label: '📅 Perso' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodFilter(p.id as PeriodType)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition cursor-pointer active:scale-95 ${
                periodFilter === p.id 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periodFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[9px] text-white/40 mb-1">Date de début</label>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]" 
              />
            </div>
            <div>
              <label className="block text-[9px] text-white/40 mb-1">Date de fin</label>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-purple-500 [color-scheme:dark]" 
              />
            </div>
          </div>
        )}
      </div>

      {/* 1. Global Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel border border-white/5 p-4 rounded-3xl space-y-1">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Solde familial</span>
          <span className="text-lg font-black text-white block leading-tight">{formatMoney(stats.soldeFamilial)}</span>
          <span className="text-[9px] text-white/30 block">Tous comptes réunis</span>
        </div>

        <div className="glass-panel border border-white/5 p-4 rounded-3xl space-y-1">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Revenus du mois</span>
          <span className="text-lg font-black text-emerald-400 block leading-tight">+{formatMoney(stats.revenusMois)}</span>
          <span className="text-[9px] text-white/30 block">Total crédits enregistrés</span>
        </div>

        <div className="glass-panel border border-white/5 p-4 rounded-3xl space-y-1">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Dépenses du mois</span>
          <span className="text-lg font-black text-rose-400 block leading-tight">-{formatMoney(stats.depensesMois)}</span>
          <span className="text-[9px] text-white/30 block">Reste à vivre : {formatMoney(stats.budgetRestant)}</span>
        </div>

        <div className="glass-panel border border-white/5 p-4 rounded-3xl space-y-1">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Épargne totale</span>
          <span className="text-lg font-black text-purple-400 block leading-tight">{formatMoney(stats.epargneTotale)}</span>
          <span className="text-[9px] text-white/30 block">Cagnottes et projets</span>
        </div>
      </div>

      {/* Over-expenditure Warnings */}
      {stats.alerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs text-amber-400">
          <h4 className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Dépassements budgétaires détectés</h4>
          <div className="space-y-0.5 opacity-90">
            {stats.alerts.map((al, idx) => <p key={idx}>{al}</p>)}
          </div>
        </div>
      )}

      {/* 2. Sub-tab Navigation Switcher */}
      <div className="border-b border-white/5 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 pb-2">
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble' },
            { id: 'transactions', label: 'Opérations' },
            { id: 'revenus', label: 'Revenus' },
            { id: 'depenses', label: 'Dépenses' },
            { id: 'budgets_modules', label: 'Budgets par module' },
            { id: 'categories', label: 'Catégories' },
            { id: 'goals', label: 'Épargne' },
            { id: 'accounts', label: 'Comptes' },
            { id: 'abonnements', label: 'Abonnements' },
            { id: 'reports', label: 'Analyses & Rapports' },
            { id: 'imports', label: 'Importation' },
            { id: 'exports', label: 'Exportation' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as FinanceTab);
                if (onClearActiveSubView) onClearActiveSubView();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/10' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Render Sub-tabs content */}
      <div className="space-y-6">

        {/* --- TABS: DASHBOARD (Overview) --- */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Accounts brief */}
            <div className="md:col-span-2 glass-panel border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Soldes des comptes bancaires</h3>
                <button onClick={() => setActiveTab('accounts')} className="text-[10px] font-bold text-purple-400 hover:underline">Gérer</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.map(acc => (
                  <div key={acc.id} className="p-4 bg-white/3 border border-white/5 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-white block">{acc.name}</span>
                      <span className="text-[9px] text-white/40 uppercase block">{acc.type}</span>
                    </div>
                    <span className="text-sm font-black text-white">{formatMoney(acc.balance)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming billing */}
            <div className="glass-panel border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Prélèvements à venir</h3>
                <span className="text-[10px] font-bold text-purple-400">{formatMoney(stats.depensesAVenir)} / mois</span>
              </div>
              <div className="space-y-2">
                {abonnements.slice(0, 3).map(ab => (
                  <div key={ab.id} className="flex justify-between items-center text-xs p-2.5 bg-white/2 rounded-xl border border-white/5">
                    <div>
                      <p className="font-bold text-white">{ab.name}</p>
                      <p className="text-[9px] text-white/40">Échéance: {ab.nextBillingDate}</p>
                    </div>
                    <span className="font-black text-rose-300">-{formatMoney(ab.amount)}</span>
                  </div>
                ))}
                {abonnements.length === 0 && <p className="text-xs text-white/30 italic">Aucun abonnement en cours.</p>}
              </div>
            </div>

            {/* Recent transactions */}
            <div className="md:col-span-3 glass-panel border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dernières opérations enregistrées</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-[10px] font-bold text-purple-400 hover:underline">Tout voir ({transactions.length})</button>
              </div>
              <div className="space-y-2.5">
                {filteredTransactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-2xl text-xs hover:bg-white/5 transition-all">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-base shrink-0">
                        {allCategories.find(c => c.name === tx.category)?.icon || '💸'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{tx.title}</p>
                        <p className="text-[9.5px] text-white/40 mt-0.5">
                          {formatTxListDate(tx)} • {tx.category} {tx.subCategory && `(${tx.subCategory})`} {tx.memberName && `• ${tx.memberName}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-black text-sm block ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'savings' ? 'text-purple-400' : 'text-rose-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                      </span>
                      {tx.moduleSource && tx.moduleSource !== 'budget' && (
                        <span className="text-[8px] font-black uppercase text-purple-400/80 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20">{tx.moduleSource}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- TABS: TRANSACTIONS / REVENUS / DÉPENSES --- */}
        {(activeTab === 'transactions' || activeTab === 'revenus' || activeTab === 'depenses') && (
          <div className="glass-panel border border-white/5 p-5 rounded-3xl space-y-4">
            
            {/* Toolbar Filters */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="text"
                  placeholder="Rechercher une opération..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#07111F]/60 border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#07111F]/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">Toutes catégories</option>
                  {allCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>

                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="bg-[#07111F]/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">Tous comptes</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {filteredTransactions
                .filter(t => {
                  if (activeTab === 'revenus') return t.type === 'income';
                  if (activeTab === 'depenses') return t.type === 'expense';
                  return true;
                })
                .map(tx => (
                  <div key={tx.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-4 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition text-xs">
                    
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {allCategories.find(c => c.name === tx.category)?.icon || '💸'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white truncate max-w-[200px]">{tx.title}</h4>
                          {tx.isArchived && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 text-[8px] uppercase font-bold">Archivée</span>
                          )}
                          {tx.recurrence && tx.recurrence !== 'none' && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] uppercase font-bold">🔁 {tx.recurrence}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 leading-normal">
                          {formatTxListDate(tx)} • <strong className="text-white/60">{tx.category}</strong> {tx.subCategory && `> ${tx.subCategory}`}
                          {tx.memberName && ` • Concerné: ${tx.memberName}`}
                          {tx.accountId && ` • Compte: ${accounts.find(a => a.id === tx.accountId)?.name || 'N/A'}`}
                        </p>
                        {tx.comment && <p className="text-[10px] text-[#FFB020] italic mt-1">{tx.comment}</p>}
                        
                        {tx.modificationHistory && tx.modificationHistory.length > 0 && (
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); toggleTxHistory(tx.id); }}
                            className="mt-1.5 flex items-center space-x-1 text-[9px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 w-fit cursor-pointer"
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>{expandedTxHistory[tx.id] ? "Masquer l'historique" : "Voir l'historique"}</span>
                          </button>
                        )}
                        
                        {expandedTxHistory[tx.id] && tx.modificationHistory && (
                          <div className="mt-2.5 p-3 rounded-xl bg-[#07111F]/50 border border-white/5 space-y-1.5 text-[10px] font-sans">
                            <span className="text-[9px] font-black text-white/30 uppercase block tracking-wider">Trace d'audit :</span>
                            <div className="space-y-1 border-l border-white/10 pl-2 ml-1">
                              {tx.modificationHistory.map((h, hIdx) => (
                                <div key={hIdx} className="relative py-0.5">
                                  <span className="absolute -left-[11.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-[#6C5CFF]" />
                                  <div className="text-white/40 text-[9px] font-semibold">{h.date} • par <strong className="text-white/60">{h.author}</strong></div>
                                  <div className="text-white/80 font-medium">{h.action}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0 border-t md:border-t-0 border-white/5 pt-2.5 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className={`text-base font-black ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'savings' ? 'text-purple-400' : 'text-rose-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                        </span>
                        {tx.moduleSource && tx.moduleSource !== 'budget' && (
                          <span className="block text-[8px] font-black uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20 w-fit md:ml-auto mt-0.5">{tx.moduleSource}</span>
                        )}
                      </div>

                      {isAuthorized && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleOpenEditTx(tx)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition" title="Modifier"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDuplicateTx(tx)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition" title="Dupliquer"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleArchiveTx(tx)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition" title="Archiver"><Archive className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteTx(tx.id)} className="p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 text-red-400 transition" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              {filteredTransactions.length === 0 && <p className="text-xs text-white/30 italic text-center py-8">Aucune opération correspondante.</p>}
            </div>

          </div>
        )}

        {/* --- TABS: BUDGETS PAR MODULE (Cockpit global) --- */}
        {activeTab === 'budgets_modules' && (
          <div className="space-y-6">
            <div className="glass-panel border border-white/5 p-5 rounded-3xl space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cockpit de Budgets Limites par Module</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Définissez des limites financières mensuelles ou par projet pour chaque module de la famille. Les dépenses associées sont automatiquement imputées en temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'courses', label: '🛒 Courses & Achats', icon: '🛒', cat: 'Alimentation' },
                { id: 'sante', label: '🩺 Santé & Soins', icon: '🩺', cat: 'Santé' },
                { id: 'vehicules', label: '🚗 Véhicule & Auto', icon: '🚗', cat: 'Transport' },
                { id: 'logement', label: '🏠 Logement & Charges', icon: '🏠', cat: 'Logement' },
                { id: 'voyages', label: '✈️ Voyages & Vacances', icon: '✈️', cat: 'Voyages' },
                { id: 'ecole', label: '🎓 École & Éducation', icon: '🎓', cat: 'Éducation' },
                { id: 'demarches', label: '📂 Démarches Admin', icon: '📂', cat: 'Administratif' },
                { id: 'animaux', label: '🐶 Animaux & Veto', icon: '🐶', cat: 'Animaux' },
                { id: 'argent_de_poche', label: '🪙 Argent de Poche', icon: '🪙', cat: 'Argent de poche' },
                { id: 'taches', label: '🧹 Tâches Ménagères', icon: '🧹', cat: 'Argent de poche' }
              ].map(mod => {
                const limitObj = moduleBudgets[mod.id] || { budget: 0, recurrence: 'monthly' };
                const dépensé = moduleDépenses[mod.id] || 0;
                const restant = Math.max(0, limitObj.budget - dépensé);
                const pct = limitObj.budget > 0 ? Math.min(100, Math.round((dépensé / limitObj.budget) * 100)) : 0;
                const recent = activeTransactions
                  .filter(t => t.moduleSource === mod.id && t.type === 'expense')
                  .slice(0, 2);

                return (
                  <div key={mod.id} className="glass-panel border border-white/5 p-5 rounded-3xl space-y-4 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-2xl">{mod.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-white">{mod.label}</h4>
                          <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20 mt-1 block w-max">Liaison : {mod.cat}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white block">{formatMoney(restant)} <span className="text-[9px] text-white/40 font-normal">restants</span></span>
                        <span className="text-[10px] text-white/50 block">Limite : {limitObj.budget > 0 ? `${formatMoney(limitObj.budget)} (${limitObj.recurrence === 'monthly' ? 'mensuel' : 'projet'})` : 'Aucune limite'}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    {limitObj.budget > 0 && (
                      <div className="space-y-1.5">
                        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-white/40">
                          <span>Dépensé : {formatMoney(dépensé)}</span>
                          <span className={pct >= 100 ? 'text-rose-400 font-bold animate-pulse' : ''}>{pct}% utilisé</span>
                        </div>
                      </div>
                    )}

                    {/* Recent expenses */}
                    {recent.length > 0 && (
                      <div className="space-y-1.5 bg-white/2 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest block">Dépenses récentes</span>
                        {recent.map(r => (
                          <div key={r.id} className="flex justify-between text-[10px]">
                            <span className="text-white/60 truncate max-w-[150px]">{r.title}</span>
                            <span className="font-bold text-rose-300">-{formatMoney(r.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    {isAuthorized && (
                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            setTxForm(prev => ({
                              ...prev,
                              title: `Dépense ${mod.label}`,
                              type: 'expense',
                              category: mod.cat,
                              moduleSource: mod.id,
                              accountId: accounts[0]?.id || ''
                            }));
                            setEditingTx(null);
                            setIsTxModalOpen(true);
                          }}
                          className="flex-1 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-300 font-bold rounded-xl active:scale-95 transition-all text-[10px] cursor-pointer"
                        >
                          + Dépense
                        </button>
                        <button
                          onClick={() => handleOpenLimitModal(mod.id)}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-bold rounded-xl active:scale-95 transition-all text-[10px] cursor-pointer"
                        >
                          ⚙️ Limite
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TABS: CATEGORIES MANAGEMENT --- */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            
            <div className="glass-panel border border-white/5 p-5 rounded-3xl flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Catégories & Sous-catégories</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Personnalisez vos étiquettes budgétaires et fusions</p>
              </div>

              {isAuthorized && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setCatForm({ name: '', icon: '✨', color: '#3B82F6', budget: '', subcategories: [], newSubInput: '' });
                      setEditingCat(null);
                      setIsCatModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-purple-600 rounded-xl text-[10px] font-bold text-white cursor-pointer hover:opacity-90 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer</span>
                  </button>
                  <button 
                    onClick={() => {
                      setMergeSource('');
                      setMergeTarget('');
                      setIsMergeModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold text-white/80 cursor-pointer hover:bg-white/10 transition flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Fusionner</span>
                  </button>
                </div>
              )}
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allCategories.map(cat => (
                <div key={cat.name} className={`glass-panel border border-white/5 p-5 rounded-3xl space-y-3 text-xs transition ${archivedCategories.includes(cat.name) ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-lg" style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}40`, color: cat.color }}>
                        {cat.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-white text-sm">{cat.name}</h4>
                          {archivedCategories.includes(cat.name) && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">Archivé</span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/40">Limite mensuelle : {cat.budget > 0 ? `${formatMoney(cat.budget)}` : 'Aucune'}</span>
                      </div>
                    </div>

                    {isAuthorized && (
                      <div className="flex gap-1.5 items-center">
                        <button
                          onClick={() => {
                            const matchedCc = customCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
                            setEditingCat(matchedCc || {
                              id: `cat-override-${cat.name.toLowerCase()}`,
                              name: cat.name,
                              icon: cat.icon,
                              color: cat.color,
                              budget: cat.budget,
                              displayOrder: 0,
                              subcategories: cat.sub || []
                            });
                            setCatForm({
                              name: matchedCc ? matchedCc.name : cat.name,
                              icon: matchedCc ? (matchedCc.icon || '✨') : cat.icon,
                              color: matchedCc ? (matchedCc.color || '#3B82F6') : cat.color,
                              budget: matchedCc ? (matchedCc.budget ? matchedCc.budget.toString() : '') : (cat.budget ? cat.budget.toString() : ''),
                              subcategories: matchedCc ? (matchedCc.subcategories || []) : (cat.sub || []),
                              newSubInput: ''
                            });
                            setIsCatModalOpen(true);
                          }}
                          title="Modifier"
                          className="p-1.5 bg-white/5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleArchiveCategory(cat.name)}
                          title={archivedCategories.includes(cat.name) ? "Restaurer" : "Archiver"}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${archivedCategories.includes(cat.name) ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        {customCategories.some(c => c.name.toLowerCase() === cat.name.toLowerCase()) && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Supprimer la catégorie "${cat.name}" ?`)) {
                                const matchedCc = customCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase())!;
                                const client = getSupabaseClient();
                                if (client) {
                                  await client.from('custom_categories').delete().eq('id', matchedCc.id);
                                }
                                setCustomCategories(prev => prev.filter(c => c.id !== matchedCc.id));
                              }
                            }}
                            title="Supprimer"
                            className="p-1.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subcategories list */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest block">Sous-catégories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.sub?.map(s => {
                        const isArchived = archivedSubcategories.includes(`${cat.name}:${s}`);
                        return (
                          <button 
                            key={s} 
                            disabled={!isAuthorized}
                            onClick={() => toggleArchiveSubcategory(cat.name, s)}
                            className={`px-2.5 py-1 rounded-lg border text-[10px] transition-all duration-200 text-left flex items-center gap-1 cursor-pointer active:scale-95 ${
                              isArchived 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400/80 hover:bg-amber-500/20' 
                                : 'bg-white/3 border-white/5 text-white/70 hover:bg-white/5 hover:border-white/10'
                            }`}
                            title={isArchived ? "Restaurer la sous-catégorie" : "Archiver la sous-catégorie"}
                          >
                            <span>{s}</span>
                            {isArchived && <span className="text-[8px] opacity-75 font-semibold">(Archivé)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* --- TABS: SAVING GOALS (Pots d'épargne) --- */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="glass-panel border border-white/5 p-5 rounded-3xl flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Objectifs d'Épargne & Cagnottes</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Financer vos projets familiaux à plusieurs</p>
              </div>

              {isAuthorized && (
                <button 
                  onClick={() => {
                    setGoalForm({ title: '', targetAmount: '', currentAmount: '0', targetDate: '', category: 'Épargne' });
                    setEditingGoal(null);
                    setIsGoalModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-purple-600 rounded-xl text-xs font-bold text-white cursor-pointer hover:opacity-90 transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle cagnotte</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingGoals.map(goal => {
                const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                return (
                  <div key={goal.id} className="glass-panel border border-white/5 p-5 rounded-3xl space-y-4 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-3xl">🐷</span>
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{goal.title}</h4>
                          <span className="text-[9px] text-white/40">{goal.category} {goal.targetDate && `• Échéance: ${goal.targetDate}`}</span>
                        </div>
                      </div>
                      {isAuthorized && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingGoal(goal);
                              setGoalForm({
                                title: goal.title,
                                targetAmount: goal.targetAmount.toString(),
                                currentAmount: goal.currentAmount.toString(),
                                targetDate: goal.targetDate || '',
                                category: goal.category || 'Épargne'
                              });
                              setIsGoalModalOpen(true);
                            }}
                            className="p-1.5 bg-white/5 rounded-lg text-white/60 hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Supprimer la cagnotte "${goal.title}" ?`)) {
                                const client = getSupabaseClient();
                                if (client) {
                                  await client.from('saving_goals').delete().eq('id', goal.id);
                                }
                                setSavingGoals(prev => prev.filter(g => g.id !== goal.id));
                              }
                            }}
                            className="p-1.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/70">Cumulé : <strong>{formatMoney(goal.currentAmount)}</strong></span>
                        <span className="text-white/50">Cible : {formatMoney(goal.targetAmount)}</span>
                      </div>
                      <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-purple-400 font-bold block text-right">{pct}% complété</span>
                    </div>

                    {/* Manual additions to pots */}
                    {isAuthorized && (
                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <input 
                          type="number" 
                          placeholder="Montant (€)" 
                          id={`input-pot-${goal.id}`}
                          className="flex-1 bg-[#07111F]/60 border border-white/8 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none"
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById(`input-pot-${goal.id}`) as HTMLInputElement;
                            const amt = parseFloat(input?.value || '');
                            if (isNaN(amt) || amt <= 0) return;

                            const client = getSupabaseClient();
                            const newAmount = goal.currentAmount + amt;
                            if (client) {
                              await client.from('saving_goals').update({ current_amount: newAmount }).eq('id', goal.id);
                              
                              // Log contribution as transaction too
                              const now = new Date();
                              await client.from('transactions').insert({
                                id: `tx-pot-${Date.now()}`,
                                foyer_id: foyerId,
                                amount: amt,
                                type: 'savings',
                                category: 'Épargne',
                                sub_category: 'Cagnotte',
                                date: now.toISOString().split('T')[0],
                                title: `Épargne : ${goal.title}`,
                                comment: serializeTransactionComment(`Contribution manuelle à la cagnotte`, {
                                  moduleSource: 'budget',
                                  entryTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                                  entryDate: now.toISOString().split('T')[0]
                                })
                              });
                            }

                            setSavingGoals(prev => prev.map(g => g.id === goal.id ? { ...g, currentAmount: newAmount } : g));
                            input.value = '';
                            alert('🐷 Versement de cagnotte enregistré !');
                          }}
                          className="px-4 py-1.5 bg-purple-600 rounded-xl font-bold text-white text-xs cursor-pointer"
                        >
                          Verser
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TABS: ACCOUNTS (Comptes bancaires) --- */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {!selectedHistoryAccount ? (
              // 1. ACCOUNTS LISTING VIEW
              <>
                <div className="glass-panel border border-white/5 p-5 rounded-3xl flex justify-between items-center shadow-lg">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Comptes Financiers & Virements</h3>
                    <p className="text-[10px] text-white/40 mt-0.5">Soldes actuels des comptes du foyer</p>
                  </div>

                  <div className="flex gap-2">
                    {isAuthorized && (
                      <button
                        onClick={() => {
                          setAccountForm({ name: '', type: 'bank', balance: '', icon: '💳', color: '#6C5CFF', initialBalance: '' });
                          setEditingAccount(null);
                          setIsAccountModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-xs font-bold text-white cursor-pointer hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau compte</span>
                      </button>
                    )}
                    {isAuthorized && (
                      <button
                        onClick={() => {
                          setTransferForm({ sourceAccountId: '', targetAccountId: '', amount: '', title: 'Virement interne' });
                          setIsTransferModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white cursor-pointer hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Virement</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accounts.map(acc => {
                    const fallbackColor = acc.type === 'bank' ? '#3B82F6' : acc.type === 'savings' ? '#10B981' : '#F59E0B';
                    const color = acc.color || fallbackColor;
                    const icon = acc.icon || (acc.type === 'bank' ? '💳' : acc.type === 'savings' ? '🐷' : '👛');
                    return (
                      <div 
                        key={acc.id} 
                        onClick={() => setSelectedHistoryAccount(acc)}
                        className="glass-panel border border-white/5 p-5 rounded-3xl flex justify-between items-center text-xs cursor-pointer hover:border-white/15 hover:bg-white/[0.04] transition-all active:scale-[0.98]"
                        style={{ borderLeft: `4px solid ${color}` }}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg bg-white/5 border border-white/5">
                            {icon}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-sm">{acc.name}</h4>
                            <span className="text-[9px] text-white/40 uppercase font-semibold">
                              {acc.type === 'bank' ? 'Banque / Carte' : acc.type === 'savings' ? 'Épargne' : acc.type === 'cash' ? 'Espèces' : 'Portefeuille'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-base font-black text-white block">{formatMoney(acc.balance)}</span>
                          <span className="text-[8px] font-bold text-purple-400/80 uppercase tracking-wider">Voir l'historique →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              // 2. ACCOUNT DETAIL & TRANSACTION HISTORY VIEW
              <div className="space-y-6">
                <div 
                  className="glass-panel border border-white/5 p-5 rounded-3xl flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-xl"
                  style={{ borderLeft: `5px solid ${selectedHistoryAccount.color || '#6C5CFF'}` }}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedHistoryAccount(null)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition active:scale-95 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedHistoryAccount.icon || '💳'}</span>
                      <div>
                        <h3 className="text-sm font-extrabold text-white">{selectedHistoryAccount.name}</h3>
                        <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider font-bold">
                          {selectedHistoryAccount.type === 'bank' ? 'Compte bancaire' : selectedHistoryAccount.type === 'savings' ? 'Compte épargne' : selectedHistoryAccount.type === 'cash' ? 'Espèces' : 'Portefeuille mobile'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between md:justify-end items-center gap-4">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-white/40 block">Solde actuel</span>
                      <span className="text-lg font-black text-white">{formatMoney(selectedHistoryAccount.balance)}</span>
                    </div>

                    {isAuthorized && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAccountForm({
                              name: selectedHistoryAccount.name,
                              type: selectedHistoryAccount.type,
                              balance: selectedHistoryAccount.balance.toString(),
                              icon: selectedHistoryAccount.icon || '💳',
                              color: selectedHistoryAccount.color || '#6C5CFF',
                              initialBalance: selectedHistoryAccount.initialBalance?.toString() || '0'
                            });
                            setEditingAccount(selectedHistoryAccount);
                            setIsAccountModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer active:scale-95 transition-all"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Voulez-vous vraiment supprimer ce compte ? Cette action n'effacera pas les transactions associées mais dissociera le compte.")) {
                              const client = getSupabaseClient();
                              if (client && foyerId) {
                                client.from('accounts').delete().eq('id', selectedHistoryAccount.id).then(() => {
                                  const metadataStr = localStorage.getItem('mf_accounts_metadata');
                                  if (metadataStr) {
                                    const metadata = JSON.parse(metadataStr);
                                    delete metadata[selectedHistoryAccount.id];
                                    localStorage.setItem('mf_accounts_metadata', JSON.stringify(metadata));
                                  }
                                  setAccounts(prev => prev.filter(a => a.id !== selectedHistoryAccount.id));
                                  setSelectedHistoryAccount(null);
                                });
                              }
                            }
                          }}
                          className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 rounded-xl text-xs font-bold text-red-400 cursor-pointer active:scale-95 transition-all"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Transactions History */}
                <div className="glass-panel border border-white/5 rounded-3xl p-5 space-y-4">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Historique des Transactions</span>
                  
                  {(() => {
                    const accountTransactions = transactions.filter(t => t.accountId === selectedHistoryAccount.id);
                    if (accountTransactions.length === 0) {
                      return (
                        <div className="py-8 text-center text-white/30 text-xs italic">
                          Aucune transaction enregistrée pour ce compte.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {accountTransactions.map(tx => (
                          <div key={tx.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs hover:bg-white/[0.04] transition">
                            <div className="flex items-center space-x-3.5">
                              <span className="text-xl">
                                {tx.type === 'income' ? '📈' : tx.type === 'savings' ? '🐷' : '📉'}
                              </span>
                              <div>
                                <h4 className="font-extrabold text-white">{tx.title}</h4>
                                <p className="text-[9px] text-white/40 mt-0.5">
                                  {tx.date} • {tx.category} • {tx.memberName}
                                </p>
                              </div>
                            </div>
                            <span className={`font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TABS: ABONNEMENTS (Subscriptions) --- */}
        {activeTab === 'abonnements' && (
          <div className="space-y-6">
            <div className="glass-panel border border-white/5 p-5 rounded-3xl flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Abonnements Récurrents</h3>
                <p className="text-[10px] text-white/40 mt-0.5">Visuels et prélèvements de vos contrats et streaming</p>
              </div>

              {isAuthorized && (
                <button
                  onClick={() => {
                    setAboForm({ name: '', amount: '', period: 'monthly', nextBillingDate: new Date().toISOString().split('T')[0], category: 'Abonnements' });
                    setEditingAbo(null);
                    setIsAboModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-purple-600 rounded-xl text-xs font-bold text-white cursor-pointer hover:opacity-90 transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvel abonnement</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {abonnements.map(ab => (
                <div key={ab.id} className="glass-panel border border-white/5 p-4 rounded-3xl space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">🔄</span>
                      <h4 className="font-extrabold text-white">{ab.name}</h4>
                    </div>

                    {isAuthorized && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingAbo(ab);
                            setAboForm({
                              name: ab.name,
                              amount: ab.amount.toString(),
                              period: ab.period || 'monthly',
                              nextBillingDate: ab.nextBillingDate || new Date().toISOString().split('T')[0],
                              category: ab.category || 'Abonnements'
                            });
                            setIsAboModalOpen(true);
                          }}
                          className="p-1 bg-white/5 rounded-lg text-white/60 hover:text-white"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Supprimer l'abonnement "${ab.name}" ?`)) {
                              const client = getSupabaseClient();
                              if (client) {
                                await client.from('abonnements').delete().eq('id', ab.id);
                              }
                              setAbonnements(prev => prev.filter(a => a.id !== ab.id));
                            }
                          }}
                          className="p-1 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-black text-rose-300">-{formatMoney(ab.amount)}</span>
                    <span className="text-[10px] text-white/50 capitalize">{ab.period}</span>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-[10px] text-white/40 flex justify-between">
                    <span>Facturé le : {ab.nextBillingDate}</span>
                    <span>{ab.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TABS: REPORTS (Analytics chart simulation) --- */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Interactive SVG Donut Chart */}
              <div className="lg:col-span-1 glass-panel border border-white/5 p-5 rounded-3xl flex flex-col items-center justify-between text-xs space-y-4">
                <div className="w-full">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider text-left">Répartition des dépenses</h3>
                  <p className="text-[9px] text-white/40 text-left mt-0.5">Cliquez sur un segment pour le sélectionner</p>
                </div>

                <div className="relative w-48 h-48 flex items-center justify-center">
                  {donutData.total === 0 ? (
                    <span className="text-white/30 text-xs italic">Aucune dépense</span>
                  ) : (
                    <>
                      <svg width="180" height="180" viewBox="0 0 120 120" className="transform -rotate-90">
                        {(() => {
                          let currentOffset = 0;
                          return donutData.segments.map((seg, idx) => {
                            const pct = (seg.amount / donutData.total) * 100;
                            const strokeLength = (pct / 100) * 314.159;
                            const strokeOffset = -currentOffset;
                            currentOffset += strokeLength;

                            const isSelected = selectedDonutSegment === idx;
                            return (
                              <circle
                                key={seg.category}
                                cx="60"
                                cy="60"
                                r="50"
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth={isSelected ? "14" : "10"}
                                strokeDasharray={`${strokeLength} 314.159`}
                                strokeDashoffset={strokeOffset}
                                className="cursor-pointer transition-all duration-300 hover:stroke-[14px]"
                                onClick={() => setSelectedDonutSegment(isSelected ? null : idx)}
                              />
                            );
                          });
                        })()}
                      </svg>
                      {/* Central label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                        {selectedDonutSegment !== null && donutData.segments[selectedDonutSegment] ? (
                          <>
                            <span className="text-xl">{donutData.segments[selectedDonutSegment].icon}</span>
                            <span className="text-[9px] font-black text-white/50 uppercase tracking-widest mt-0.5 truncate max-w-[100px]">
                              {donutData.segments[selectedDonutSegment].category}
                            </span>
                            <span className="text-xs font-black text-white mt-0.5">
                              {formatMoney(donutData.segments[selectedDonutSegment].amount)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Total Dépenses</span>
                            <span className="text-sm font-black text-white mt-0.5">{formatMoney(donutData.total)}</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Donut Legend */}
                <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-white/5 max-h-[140px] overflow-y-auto scrollbar-none">
                  {donutData.segments.map((seg, idx) => (
                    <div 
                      key={seg.category} 
                      onClick={() => setSelectedDonutSegment(selectedDonutSegment === idx ? null : idx)}
                      className={`flex items-center gap-1.5 cursor-pointer p-1.5 rounded-lg transition ${selectedDonutSegment === idx ? 'bg-white/5 border border-white/10' : 'hover:bg-white/2 border border-transparent'}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-[10px] text-white/80 font-medium truncate">{seg.icon} {seg.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Donut Detailed Categories list with progress bar */}
              <div className="lg:col-span-2 glass-panel border border-white/5 p-5 rounded-3xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Suivi analytique et Limites</h3>
                <div className="space-y-4 text-xs font-sans max-h-[300px] overflow-y-auto scrollbar-none pr-1">
                  {allCategories.map(cat => {
                    const totalDep = activeTransactions
                      .filter(t => t.category === cat.name && t.type === 'expense')
                      .reduce((sum, t) => sum + t.amount, 0);

                    if (totalDep === 0) return null;

                    const limitVal = cat.budget || 1;
                    const pct = Math.min(100, Math.round((totalDep / limitVal) * 100));
                    const isHighlighted = selectedDonutSegment !== null && donutData.segments[selectedDonutSegment]?.category === cat.name;

                    return (
                      <div 
                        key={cat.name} 
                        className={`space-y-1.5 p-2 rounded-xl border transition ${isHighlighted ? 'bg-white/5 border-purple-500/20' : 'bg-transparent border-transparent'}`}
                      >
                        <div className="flex justify-between text-[11px] items-center">
                          <span className="font-extrabold text-white flex items-center gap-1">{cat.icon} {cat.name}</span>
                          <span className="text-white/70 font-semibold">{formatMoney(totalDep)} {cat.budget > 0 && `/ ${cat.budget}€`}</span>
                        </div>
                        <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                        {cat.budget > 0 && (
                          <div className="flex justify-between text-[9px] text-white/40">
                            <span>Consommé : {pct}%</span>
                            <span className={pct >= 100 ? 'text-red-400 font-bold' : ''}>{pct >= 100 ? 'Budget dépassé !' : `${formatMoney(cat.budget - totalDep)} restant`}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Statistiques Temporelles */}
            <div className="glass-panel border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Statistiques Temporelles</h3>
                  <p className="text-[9px] text-white/40 mt-0.5">Analyse fine de la répartition des dépenses</p>
                </div>
                
                <div className="flex bg-[#112240] p-1 rounded-xl border border-white/5 self-end">
                  {[
                    { id: 'day', label: 'Jour' },
                    { id: 'hour', label: 'Heure' },
                    { id: 'week', label: 'Semaine' },
                    { id: 'month', label: 'Mois' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemporalStatTab(t.id as any)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        temporalStatTab === t.id
                          ? 'bg-[#6C5CFF] text-white shadow-md'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const currentData = temporalStats[temporalStatTab] || [];
                const maxAmount = Math.max(...currentData.map(d => d.amount), 1);
                
                return (
                  <div className="space-y-4">
                    {/* SVG Bar Chart */}
                    <div className="relative h-48 w-full bg-[#07111F]/30 rounded-2xl border border-white/5 p-4 flex items-end justify-between gap-1.5 overflow-x-auto no-scrollbar">
                      {currentData.map((item, idx) => {
                        const pct = (item.amount / maxAmount) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center min-w-[30px] group relative">
                            {/* Value tooltip */}
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 px-1.5 py-0.5 rounded text-[8px] text-white absolute -top-8 font-bold pointer-events-none whitespace-nowrap z-10">
                              {item.amount.toFixed(1)}€
                            </span>
                            
                            {/* Bar container */}
                            <div className="w-full flex items-end justify-center h-28 relative">
                              <div 
                                className="w-4 rounded-t bg-gradient-to-t from-indigo-500 to-[#6C5CFF] hover:from-purple-500 hover:to-indigo-400 transition-all duration-300 shadow-[0_-2px_8px_rgba(108,92,255,0.2)] cursor-pointer"
                                style={{ height: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                            
                            {/* Label */}
                            <span className="text-[8px] text-white/40 mt-1.5 font-bold truncate text-center w-full block">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                      {currentData.length === 0 || maxAmount <= 1 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs italic">
                          Aucune donnée à afficher pour cette période
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3. Rolling 12-Month Line Chart */}
            <div className="glass-panel border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Évolution mensuelle des finances</h3>
                  <p className="text-[9px] text-white/40 mt-0.5">Revenus, Dépenses et Épargne sur les 12 derniers mois</p>
                </div>
                {/* Legend colors */}
                <div className="flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Revenus</span>
                  <span className="flex items-center gap-1.5 font-bold text-rose-400"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Dépenses</span>
                  <span className="flex items-center gap-1.5 font-bold text-purple-400"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Épargne</span>
                </div>
              </div>

              {/* Line graph canvas wrapper */}
              <div className="w-full overflow-x-auto scrollbar-none pt-2">
                <div className="min-w-[500px] h-[250px] relative">
                  <svg viewBox="0 0 500 240" className="w-full h-full font-sans overflow-visible text-[9px] text-white/30">
                    {/* Vertical grid lines & Y labels */}
                    {(() => {
                      const lines = [];
                      for (let i = 0; i <= 4; i++) {
                        const v = (maxVal / 4) * i;
                        const y = 20 + 185 - (v / maxVal) * 185;
                        lines.push(
                          <g key={i}>
                            <line x1="50" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                            <text x="45" y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.4)" className="font-extrabold">{formatMoney(v)}</text>
                          </g>
                        );
                      }
                      return lines;
                    })()}

                    {/* Horizontal labels (Months) */}
                    {trendData.map((d, i) => {
                      const x = 50 + (i / 11) * 430;
                      return (
                        <text key={i} x={x} y="225" textAnchor="middle" fill="rgba(255,255,255,0.4)" className="font-extrabold">
                          {d.label}
                        </text>
                      );
                    })}

                    {/* Line path definitions */}
                    {(() => {
                      const left = 50;
                      const plotWidth = 430;
                      const plotHeight = 185;
                      const top = 20;

                      let incPath = '';
                      let expPath = '';
                      let savPath = '';

                      trendData.forEach((d, i) => {
                        const x = left + (i / 11) * plotWidth;
                        const yInc = top + plotHeight - (d.income / maxVal) * plotHeight;
                        const yExp = top + plotHeight - (d.expense / maxVal) * plotHeight;
                        const ySav = top + plotHeight - (d.savings / maxVal) * plotHeight;

                        if (i === 0) {
                          incPath = `M ${x} ${yInc}`;
                          expPath = `M ${x} ${yExp}`;
                          savPath = `M ${x} ${ySav}`;
                        } else {
                          incPath += ` L ${x} ${yInc}`;
                          expPath += ` L ${x} ${yExp}`;
                          savPath += ` L ${x} ${ySav}`;
                        }
                      });

                      return (
                        <>
                          {/* Curves */}
                          <path d={incPath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={expPath} fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={savPath} fill="none" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Hover target guides & points */}
                          {trendData.map((d, i) => {
                            const x = left + (i / 11) * plotWidth;
                            const yInc = top + plotHeight - (d.income / maxVal) * plotHeight;
                            const yExp = top + plotHeight - (d.expense / maxVal) * plotHeight;
                            const ySav = top + plotHeight - (d.savings / maxVal) * plotHeight;

                            const isSelected = selectedTrendIndex === i;

                            return (
                              <g key={i}>
                                {/* Vertical highlight bar on hover */}
                                <rect
                                  x={x - 15}
                                  y={top}
                                  width="30"
                                  height={plotHeight}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => setSelectedTrendIndex(i)}
                                  onMouseLeave={() => setSelectedTrendIndex(null)}
                                />
                                {isSelected && (
                                  <>
                                    <line x1={x} y1={top} x2={x} y2={top + plotHeight} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                                    {/* Circles on dots */}
                                    <circle cx={x} cy={yInc} r="5" fill="#10B981" stroke="white" strokeWidth="1.5" />
                                    <circle cx={x} cy={yExp} r="5" fill="#F43F5E" stroke="white" strokeWidth="1.5" />
                                    <circle cx={x} cy={ySav} r="5" fill="#8B5CF6" stroke="white" strokeWidth="1.5" />
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Trend chart HTML Tooltip overlays on hover */}
                  {selectedTrendIndex !== null && trendData[selectedTrendIndex] && (
                    <div 
                      className="absolute top-1 bg-[#091424] border border-white/10 p-3 rounded-2xl text-[9px] text-white/90 space-y-1 shadow-2xl pointer-events-none"
                      style={{ 
                        left: `${50 + (selectedTrendIndex / 11) * 75}%`,
                        transform: selectedTrendIndex > 8 ? 'translateX(-100%)' : 'none'
                      }}
                    >
                      <h4 className="font-extrabold uppercase text-white tracking-widest">{trendData[selectedTrendIndex].label}</h4>
                      <div className="space-y-0.5 font-semibold text-left">
                        <p className="flex justify-between gap-6">Revenus: <span className="text-emerald-400">+{formatMoney(trendData[selectedTrendIndex].income)}</span></p>
                        <p className="flex justify-between gap-6">Dépenses: <span className="text-rose-400">-{formatMoney(trendData[selectedTrendIndex].expense)}</span></p>
                        <p className="flex justify-between gap-6">Épargne: <span className="text-purple-400">{formatMoney(trendData[selectedTrendIndex].savings)}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TABS: IMPORTS / EXPORTS (Transversal) --- */}
        {activeTab === 'imports' && (
          <BudgetImport 
            isOpen={activeTab === 'imports'}
            onClose={() => setActiveTab('dashboard')} 
            transactions={transactions}
            accounts={accounts}
            customCategories={customCategories}
            foyerId={foyerId}
            myMemberProfile={myMemberProfile}
            activeMemberId={activeMemberId}
            activeMemberObj={members.find(m => m.id === activeMemberId)}
            onImportComplete={(addedTxs) => {
              setTransactions(prev => [...addedTxs, ...prev]);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'exports' && (
          <BudgetExport 
            isOpen={activeTab === 'exports'}
            onClose={() => setActiveTab('dashboard')} 
            transactions={transactions} 
            savingGoals={savingGoals}
            members={members}
            customCategories={customCategories}
            accounts={accounts}
            abonnements={abonnements}
            foyerId={foyerId}
            myMemberProfile={myMemberProfile}
            currencySymbol={_currencySymbol}
            trips={trips}
          />
        )}

      </div>

      {/* ===================== MODALS DEFINITION ===================== */}

      {/* Modal Transaction */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveTx} className="glass-panel border border-white/10 rounded-[28px] w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white uppercase">{editingTx ? 'Modifier la transaction' : 'Ajouter une transaction'}</h3>
              <button type="button" onClick={() => setIsTxModalOpen(false)} className="p-1 text-white/40 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Titre *</label>
                  <input type="text" required value={txForm.title} onChange={e => setTxForm(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Montant (€) *</label>
                  <input type="number" step="0.01" required value={txForm.amount} onChange={e => setTxForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Type *</label>
                  <select value={txForm.type} onChange={e => setTxForm(prev => ({ ...prev, type: e.target.value as any }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                    <option value="savings">Épargne</option>
                    <option value="transfer">Virement interne</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Catégorie *</label>
                  <select value={txForm.category} onChange={e => {
                    const selectedCat = e.target.value;
                    const foundCat = allCategories.find(c => c.name === selectedCat);
                    const subArray = foundCat?.sub || ['Divers'];
                    const nonArchivedSubs = subArray.filter(s => !archivedSubcategories.includes(`${selectedCat}:${s}`));
                    const firstSub = nonArchivedSubs[0] || subArray[0] || 'Divers';
                    setTxForm(prev => ({ ...prev, category: selectedCat, subCategory: firstSub }));
                  }} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    {allCategories.filter(c => !archivedCategories.includes(c.name)).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Sous-catégorie *</label>
                  <select value={txForm.subCategory} onChange={e => setTxForm(prev => ({ ...prev, subCategory: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    {activeSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Compte bancaire *</label>
                  <select value={txForm.accountId} onChange={e => setTxForm(prev => ({ ...prev, accountId: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="">Aucun</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Membre concerné</label>
                  <select value={txForm.memberId} onChange={e => setTxForm(prev => ({ ...prev, memberId: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="">Famille</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Date *</label>
                  <input type="date" required value={txForm.date} onChange={e => setTxForm(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark]" />
                </div>
              </div>

              <div>
                <label className="block text-white/50 mb-1">Récurrence</label>
                <select value={txForm.recurrence} onChange={e => setTxForm(prev => ({ ...prev, recurrence: e.target.value as any }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="none">Aucune</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="quarterly">Trimestrielle</option>
                  <option value="semiannually">Semestrielle</option>
                  <option value="yearly">Annuelle</option>
                  <option value="custom">Personnalisée</option>
                </select>
              </div>

              <div>
                <label className="block text-white/50 mb-1">Liaison Module</label>
                <select value={txForm.moduleSource} onChange={e => setTxForm(prev => ({ ...prev, moduleSource: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="budget">Aucun (Budget Direct)</option>
                  <option value="courses">🛒 Courses</option>
                  <option value="sante">🩺 Santé</option>
                  <option value="vehicules">🚗 Véhicules</option>
                  <option value="logement">🏠 Logement</option>
                  <option value="voyages">✈️ Voyages</option>
                  <option value="ecole">🎓 École</option>
                  <option value="demarches">📂 Démarches</option>
                  <option value="animaux">🐶 Animaux</option>
                  <option value="argent_de_poche">🪙 Argent de poche</option>
                </select>
              </div>

              <div>
                <label className="block text-white/50 mb-1">Note / Commentaire (Optionnel)</label>
                <textarea value={txForm.comment} onChange={e => setTxForm(prev => ({ ...prev, comment: e.target.value }))} className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" rows={2} />
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all cursor-pointer">
              Enregistrer l'opération
            </button>
          </form>
        </div>
      )}

      {/* Modal Module Limits Settings */}
      {selectedModuleForLimit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white uppercase">Définir une limite pour {selectedModuleForLimit}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-white/50 mb-1">Montant Limite (€)</label>
                <input type="number" value={moduleLimitInput} onChange={e => setModuleLimitInput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" placeholder="Ex: 500" />
              </div>
              <div>
                <label className="block text-white/50 mb-1">Périodicité</label>
                <select value={moduleLimitRecurrence} onChange={e => setModuleLimitRecurrence(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="monthly">Mensuel</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="custom">Par projet / événement</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedModuleForLimit(null)} className="flex-1 py-2 bg-white/5 border border-white/10 text-white rounded-xl font-bold">Annuler</button>
              <button onClick={handleSaveModuleLimit} className="flex-1 py-2 bg-purple-600 text-white rounded-xl font-bold">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Custom Category Form */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCategory} className="glass-panel border border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-white">{editingCat ? 'Modifier la catégorie' : 'Créer une catégorie'}</h3>
              <button type="button" onClick={() => setIsCatModalOpen(false)} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-white/50 mb-1">Nom *</label>
                <input type="text" required value={catForm.name} onChange={e => setCatForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Icône (Emoji) *</label>
                  <input type="text" required value={catForm.icon} onChange={e => setCatForm(prev => ({ ...prev, icon: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Couleur (Hex) *</label>
                  <input type="color" value={catForm.color} onChange={e => setCatForm(prev => ({ ...prev, color: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-white focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-white/50 mb-1">Budget mensuel (€)</label>
                <input type="number" value={catForm.budget} onChange={e => setCatForm(prev => ({ ...prev, budget: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" placeholder="Optionnel" />
              </div>

              {/* Subcategories list creation */}
              <div className="space-y-2">
                <label className="block text-white/50">Sous-catégories</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={catForm.newSubInput} 
                    onChange={e => setCatForm(prev => ({ ...prev, newSubInput: e.target.value }))} 
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white" 
                    placeholder="Ajouter sous-catégorie" 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!catForm.newSubInput.trim()) return;
                      setCatForm(prev => ({ 
                        ...prev, 
                        subcategories: [...prev.subcategories, prev.newSubInput.trim()],
                        newSubInput: '' 
                      }));
                    }}
                    className="px-3 bg-purple-600 text-white rounded-xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {catForm.subcategories.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded bg-white/10 text-white flex items-center gap-1">
                      <span>{s}</span>
                      <button type="button" onClick={() => setCatForm(prev => ({ ...prev, subcategories: prev.subcategories.filter(x => x !== s) }))} className="text-red-400 font-bold">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl uppercase tracking-wider text-[11px]">Enregistrer</button>
          </form>
        </div>
      )}

      {/* Modal Fusionner Catégories */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleMergeCategories} className="glass-panel border border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-white">Fusionner deux catégories</h3>
              <button type="button" onClick={() => setIsMergeModalOpen(false)} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-white/50 mb-1">Catégorie Source (à supprimer)</label>
                <select value={mergeSource} onChange={e => setMergeSource(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="">Sélectionner la source...</option>
                  {allCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-white/50 mb-1">Catégorie Cible (conserve les opérations)</label>
                <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="">Sélectionner la cible...</option>
                  {allCategories.filter(c => c.name !== mergeSource).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl uppercase tracking-wider text-[11px]">Exécuter la fusion</button>
          </form>
        </div>
      )}

      {/* Modal Objective */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const target = parseFloat(goalForm.targetAmount);
              const curr = parseFloat(goalForm.currentAmount) || 0;
              if (isNaN(target) || target <= 0) return;

              const client = getSupabaseClient();
              const newGoal: SavingGoal = {
                id: editingGoal?.id || `goal-${Date.now()}`,
                title: goalForm.title,
                targetAmount: target,
                currentAmount: curr,
                targetDate: goalForm.targetDate,
                category: goalForm.category,
                contributions: editingGoal?.contributions || []
              };

              if (client && foyerId) {
                await client.from('saving_goals').upsert({
                  id: newGoal.id,
                  foyer_id: foyerId,
                  title: newGoal.title,
                  target_amount: newGoal.targetAmount,
                  current_amount: newGoal.currentAmount,
                  target_date: newGoal.targetDate || null,
                  category: newGoal.category,
                  contributions: JSON.stringify(newGoal.contributions)
                });
              }

              if (editingGoal) {
                setSavingGoals(prev => prev.map(g => g.id === editingGoal.id ? newGoal : g));
              } else {
                setSavingGoals(prev => [...prev, newGoal]);
              }
              setIsGoalModalOpen(false);
              setEditingGoal(null);
            }}
            className="glass-panel border border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-white">{editingGoal ? 'Modifier la cagnotte' : 'Nouvelle cagnotte'}</h3>
              <button type="button" onClick={() => setIsGoalModalOpen(false)} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-white/50 mb-1">Titre de l'objectif *</label>
                <input type="text" required value={goalForm.title} onChange={e => setGoalForm(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Montant Cible (€) *</label>
                  <input type="number" required value={goalForm.targetAmount} onChange={e => setGoalForm(prev => ({ ...prev, targetAmount: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Montant Initial (€)</label>
                  <input type="number" disabled={!!editingGoal} value={goalForm.currentAmount} onChange={e => setGoalForm(prev => ({ ...prev, currentAmount: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Catégorie</label>
                  <input type="text" value={goalForm.category} onChange={e => setGoalForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Date Limite</label>
                  <input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(prev => ({ ...prev, targetDate: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark]" />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl uppercase tracking-wider text-[11px]">Enregistrer</button>
          </form>
        </div>
      )}

      {/* Modal Abonnement */}
      {isAboModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const amt = parseFloat(aboForm.amount);
              if (isNaN(amt) || amt <= 0) return;

              const client = getSupabaseClient();
              const newAbo: Abonnement = {
                id: editingAbo?.id || `abo-${Date.now()}`,
                name: aboForm.name,
                amount: amt,
                period: aboForm.period,
                nextBillingDate: aboForm.nextBillingDate,
                category: aboForm.category
              };

              if (client && foyerId) {
                await client.from('abonnements').upsert({
                  id: newAbo.id,
                  foyer_id: foyerId,
                  name: newAbo.name,
                  amount: newAbo.amount,
                  period: newAbo.period,
                  next_billing_date: newAbo.nextBillingDate,
                  category: newAbo.category
                });
              }

              if (editingAbo) {
                setAbonnements(prev => prev.map(a => a.id === editingAbo.id ? newAbo : a));
              } else {
                setAbonnements(prev => [...prev, newAbo]);
              }
              setIsAboModalOpen(false);
              setEditingAbo(null);
            }}
            className="glass-panel border border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-white">{editingAbo ? 'Modifier l\'abonnement' : 'Nouvel abonnement'}</h3>
              <button type="button" onClick={() => setIsAboModalOpen(false)} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-white/50 mb-1">Nom du service *</label>
                <input type="text" required value={aboForm.name} onChange={e => setAboForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" placeholder="Ex: Netflix" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Montant récurrent (€) *</label>
                  <input type="number" step="0.01" required value={aboForm.amount} onChange={e => setAboForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Périodicité *</label>
                  <select value={aboForm.period} onChange={e => setAboForm(prev => ({ ...prev, period: e.target.value as any }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Catégorie</label>
                  <input type="text" value={aboForm.category} onChange={e => setAboForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Prochain prélèvement *</label>
                  <input type="date" required value={aboForm.nextBillingDate} onChange={e => setAboForm(prev => ({ ...prev, nextBillingDate: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none [color-scheme:dark]" />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl uppercase tracking-wider text-[11px]">Enregistrer</button>
          </form>
        </div>
      )}

      {/* Modal Compte */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const initialBal = parseFloat(accountForm.initialBalance || '0') || 0;
              const name = accountForm.name.trim();
              if (!name) return;

              const client = getSupabaseClient();
              const accountId = editingAccount?.id || `acc-${Date.now()}`;
              
              const updatedAccount: Account = {
                id: accountId,
                name: name,
                type: accountForm.type,
                balance: editingAccount ? editingAccount.balance : initialBal,
                icon: accountForm.icon,
                color: accountForm.color,
                initialBalance: initialBal
              };

              const metadataStr = localStorage.getItem('mf_accounts_metadata');
              const metadata = metadataStr ? JSON.parse(metadataStr) : {};
              metadata[accountId] = { 
                icon: accountForm.icon, 
                color: accountForm.color, 
                initialBalance: initialBal 
              };
              localStorage.setItem('mf_accounts_metadata', JSON.stringify(metadata));

              if (client && foyerId) {
                try {
                  await client.from('accounts').upsert({
                    id: accountId,
                    foyer_id: foyerId,
                    name: updatedAccount.name,
                    type: updatedAccount.type,
                    balance: updatedAccount.balance
                  });
                } catch (err) {
                  console.error("Error upserting account in Supabase:", err);
                }
              }

              if (editingAccount) {
                setAccounts(prev => prev.map(a => a.id === editingAccount.id ? updatedAccount : a));
                if (selectedHistoryAccount?.id === editingAccount.id) {
                  setSelectedHistoryAccount(updatedAccount);
                }
              } else {
                setAccounts(prev => [...prev, updatedAccount]);
              }

              setIsAccountModalOpen(false);
              setEditingAccount(null);
            }}
            className="glass-panel border border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 text-xs text-left"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white">
                {editingAccount ? 'Modifier le compte' : 'Créer un nouveau compte'}
              </h3>
              <button type="button" onClick={() => { setIsAccountModalOpen(false); setEditingAccount(null); }} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-white/50 mb-1">Nom du compte *</label>
                <input 
                  type="text" 
                  required 
                  value={accountForm.name} 
                  onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500" 
                  placeholder="Ex: Orange Money, Revolut, Compte joint" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Type de compte</label>
                  <select 
                    value={accountForm.type} 
                    onChange={e => setAccountForm(prev => ({ ...prev, type: e.target.value as any }))} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="bank" className="bg-[#07111F]">Banque / Carte</option>
                    <option value="cash" className="bg-[#07111F]">Espèces</option>
                    <option value="savings" className="bg-[#07111F]">Épargne</option>
                    <option value="wallet" className="bg-[#07111F]">Portefeuille mobile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/50 mb-1">Solde initial (€) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    disabled={!!editingAccount}
                    value={accountForm.initialBalance} 
                    onChange={e => setAccountForm(prev => ({ ...prev, initialBalance: e.target.value }))} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-50" 
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Icône (Emoji)</label>
                  <input 
                    type="text" 
                    value={accountForm.icon} 
                    onChange={e => setAccountForm(prev => ({ ...prev, icon: e.target.value }))} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" 
                    placeholder="Ex: 💳, 💰, 🏦" 
                  />
                </div>

                <div>
                  <label className="block text-white/50 mb-1">Couleur (Hex)</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={accountForm.color} 
                      onChange={e => setAccountForm(prev => ({ ...prev, color: e.target.value }))} 
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer" 
                    />
                    <input 
                      type="text" 
                      value={accountForm.color} 
                      onChange={e => setAccountForm(prev => ({ ...prev, color: e.target.value }))} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none" 
                      placeholder="#6C5CFF" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl uppercase tracking-wider text-[11px]">
              Enregistrer
            </button>
          </form>
        </div>
      )}

      {/* Modal Virement Interne */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const amt = parseFloat(transferForm.amount);
              if (isNaN(amt) || amt <= 0 || !transferForm.sourceAccountId || !transferForm.targetAccountId) return;

              if (transferForm.sourceAccountId === transferForm.targetAccountId) {
                alert('Veuillez sélectionner deux comptes distincts.');
                return;
              }

              // Adjust balances locally and on database
              const client = getSupabaseClient();
              if (client) {
                // Deduct source
                const srcAcc = accounts.find(a => a.id === transferForm.sourceAccountId)!;
                const tarAcc = accounts.find(a => a.id === transferForm.targetAccountId)!;
                
                await client.from('bank_accounts').update({ balance: srcAcc.balance - amt }).eq('id', srcAcc.id);
                await client.from('bank_accounts').update({ balance: tarAcc.balance + amt }).eq('id', tarAcc.id);

                // Add double transactions
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const dateStr = now.toISOString().split('T')[0];

                await client.from('transactions').insert([
                  {
                    id: `tx-tf-src-${Date.now()}`,
                    foyer_id: foyerId,
                    amount: amt,
                    type: 'expense',
                    category: 'Autres',
                    sub_category: 'Virement',
                    date: dateStr,
                    title: `Virement sortant: ${transferForm.title}`,
                    account_id: srcAcc.id,
                    comment: serializeTransactionComment(`Vers ${tarAcc.name}`, {
                      moduleSource: 'budget',
                      entryTime: timeStr,
                      entryDate: dateStr
                    })
                  },
                  {
                    id: `tx-tf-tar-${Date.now()}`,
                    foyer_id: foyerId,
                    amount: amt,
                    type: 'income',
                    category: 'Autres',
                    sub_category: 'Virement',
                    date: dateStr,
                    title: `Virement entrant: ${transferForm.title}`,
                    account_id: tarAcc.id,
                    comment: serializeTransactionComment(`Depuis ${srcAcc.name}`, {
                      moduleSource: 'budget',
                      entryTime: timeStr,
                      entryDate: dateStr
                    })
                  }
                ]);
              }

              setAccounts(prev => prev.map(a => {
                if (a.id === transferForm.sourceAccountId) return { ...a, balance: a.balance - amt };
                if (a.id === transferForm.targetAccountId) return { ...a, balance: a.balance + amt };
                return a;
              }));

              setIsTransferModalOpen(false);
              alert('🔄 Virement effectué avec succès !');
            }}
            className="glass-panel border border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 text-xs"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-white">Nouveau virement interne</h3>
              <button type="button" onClick={() => setIsTransferModalOpen(false)} className="p-1 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-white/50 mb-1">Libellé du virement *</label>
                <input type="text" required value={transferForm.title} onChange={e => setTransferForm(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-white/50 mb-1">Montant à transférer (€) *</label>
                <input type="number" step="0.01" required value={transferForm.amount} onChange={e => setTransferForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Compte Source *</label>
                  <select value={transferForm.sourceAccountId} onChange={e => setTransferForm(prev => ({ ...prev, sourceAccountId: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="">Sélectionner...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Compte Destinataire *</label>
                  <select value={transferForm.targetAccountId} onChange={e => setTransferForm(prev => ({ ...prev, targetAccountId: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="">Sélectionner...</option>
                    {accounts.filter(a => a.id !== transferForm.sourceAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl uppercase tracking-wider text-[11px]">Confirmer le virement</button>
          </form>
        </div>
      )}

    </div>
  );
};
