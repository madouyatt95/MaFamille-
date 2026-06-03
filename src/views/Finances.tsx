import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  PiggyBank, 
  Plus,
  ChevronRight,
  Edit3,
  Trash2,
  Copy,
  Archive,
  FileText,
  Search,
  Download,
  Upload,
  RefreshCw,
  CreditCard,
  User,
  Tag,
  PlusCircle,
  ArrowLeftRight,
  X,
  Eye,
  Info,
  DollarSign
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
import { getSupabaseClient } from '../utils/supabase';
import { FinancesExport } from './FinancesExport';
import { FinancesImport } from './FinancesImport';

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
  onAddTransaction?: (newTrans: any) => void;
  // New premium finance props
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
  activeSubView?: { type: 'export' | 'import', options?: any } | null;
  onClearActiveSubView?: () => void;
}

type FinanceTab = 'dashboard' | 'transactions' | 'accounts' | 'categories' | 'goals' | 'abonnements' | 'debts';

// Default categories and subcategories mapping
const DEFAULT_CATEGORIES = [
  { name: 'Alimentation', icon: 'ShoppingCart', color: '#10B981', budget: 600, sub: ['Supermarché', 'Restaurant', 'Boulangerie', 'Épicerie'] },
  { name: 'Logement', icon: 'Home', color: '#3B82F6', budget: 800, sub: ['Loyer', 'Électricité', 'Eau', 'Internet', 'Assurance'] },
  { name: 'Transport', icon: 'Car', color: '#F59E0B', budget: 250, sub: ['Essence', 'Taxi', 'Uber', 'Péage', 'Maintenance'] },
  { name: 'Santé', icon: 'HeartPulse', color: '#EF4444', budget: 150, sub: ['Pharmacie', 'Médecin', 'Dentiste', 'Mutuelle'] },
  { name: 'Éducation', icon: 'GraduationCap', color: '#8B5CF6', budget: 200, sub: ['Inscriptions', 'Livres', 'Cours particuliers', 'Activités'] },
  { name: 'Autres', icon: 'MoreHorizontal', color: '#6B7280', budget: 150, sub: ['Divers', 'Cadeaux', 'Abonnements'] }
];

export const Finances: React.FC<FinancesProps> = ({
  transactions,
  setTransactions,
  savingGoals,
  setSavingGoals,
  members,
  currencySymbol: _currencySymbol = '€',
  formatMoney,
  onAddTransactionClick: _onAddTransactionClick,
  activeMemberId = '1',
  onAddTransaction: _onAddTransaction,
  foyerId,
  myMemberProfile,
  customCategories,
  setCustomCategories,
  accounts,
  setAccounts,
  abonnements,
  setAbonnements,
  debts,
  setDebts,
  activeSubView,
  onClearActiveSubView
}) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Export and Import
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Trigger modals based on voice search or deep link options
  React.useEffect(() => {
    if (activeSubView) {
      if (activeSubView.type === 'export') {
        setIsExportModalOpen(true);
      } else if (activeSubView.type === 'import') {
        setIsImportModalOpen(true);
      }
    }
  }, [activeSubView]);

  const isAuthorized = myMemberProfile?.role === 'admin' || myMemberProfile?.role === 'parent';

  const mapDbTxToTransaction = (t: any): Transaction => ({
    id: t.id,
    amount: Number(t.amount || 0),
    type: t.type,
    category: t.category,
    date: t.date,
    title: t.title,
    memberId: t.member_id || t.memberId,
    memberName: t.member_name || t.memberName,
    subCategory: t.sub_category || t.subCategory,
    accountId: t.account_id || t.accountId,
    receiptBase64: t.receipt_base64 || t.receiptBase64,
    attachmentBase64: t.attachment_base64 || t.attachmentBase64,
    comment: t.comment,
    modificationHistory: typeof t.modification_history === 'string' 
      ? JSON.parse(t.modification_history) 
      : (t.modification_history || t.modificationHistory || []),
    isArchived: !!(t.is_archived || t.isArchived),
    recurrence: t.recurrence || 'none',
    subscriptionId: t.subscription_id || t.subscriptionId
  });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [accountFilter, setAccountFilter] = useState('all');

  // Modals visibility states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAboModalOpen, setIsAboModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Editing items states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [editingAbo, setEditingAbo] = useState<Abonnement | null>(null);
  const [activeHistoryTx, setActiveHistoryTx] = useState<Transaction | null>(null);

  // New item form states
  const [txForm, setTxForm] = useState({
    title: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: 'Alimentation',
    subCategory: 'Supermarché',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    comment: '',
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    receiptBase64: '',
    attachmentBase64: ''
  });

  const [catForm, setCatForm] = useState({
    name: '',
    icon: 'Mosquée',
    color: '#EF4444',
    budget: '',
    displayOrder: '0'
  });

  const [goalForm, setGoalForm] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    category: 'Général'
  });

  const [aboForm, setAboForm] = useState({
    name: '',
    amount: '',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    nextBillingDate: new Date().toISOString().split('T')[0],
    category: 'Loisirs'
  });

  const [debtForm, setDebtForm] = useState({
    title: '',
    amount: '',
    payerId: '',
    debtorId: ''
  });

  const [transferForm, setTransferForm] = useState({
    sourceAccountId: '',
    targetAccountId: '',
    amount: ''
  });

  // Collaborative Saving Goal contribution states
  const [contribGoal, setContribGoal] = useState<SavingGoal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribType, setContribType] = useState<'add' | 'withdraw'>('add');

  // Category merging states
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  // ----------------------------------------------------
  // Computations & Selectors
  // ----------------------------------------------------
  const activeMemberObj = useMemo(() => members.find(m => m.id === activeMemberId), [members, activeMemberId]);
  
  // All combined categories (default + custom)
  const allCategories = useMemo(() => {
    const list = [...DEFAULT_CATEGORIES];
    customCategories.forEach(cc => {
      // Find if already exists, otherwise add
      if (!list.some(c => c.name.toLowerCase() === cc.name.toLowerCase())) {
        list.push({
          name: cc.name,
          icon: cc.icon || 'MoreHorizontal',
          color: cc.color || '#3B82F6',
          budget: cc.budget || 0,
          sub: ['Divers']
        });
      }
    });
    return list;
  }, [customCategories]);

  // Compute transaction subcategories dynamically
  const availableSubcategories = useMemo(() => {
    const cat = allCategories.find(c => c.name === txForm.category);
    return cat ? cat.sub : ['Divers'];
  }, [txForm.category, allCategories]);

  // Active non-archived transactions
  const activeTransactions = useMemo(() => {
    return transactions.filter(t => !t.isArchived);
  }, [transactions]);

  // Global Financial Statistics
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    activeTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    // Subscriptions cost (monthly estimate)
    let subsMonthly = 0;
    abonnements.forEach(a => {
      const amt = a.amount;
      if (a.period === 'weekly') subsMonthly += amt * 4.33;
      else if (a.period === 'daily') subsMonthly += amt * 30;
      else if (a.period === 'yearly') subsMonthly += amt / 12;
      else subsMonthly += amt;
    });

    const balance = income - expense;
    // Reste à vivre (Balance minus next billing subscriptions)
    const resteAVivre = balance - subsMonthly;

    return {
      income,
      expense,
      balance,
      subsMonthly,
      resteAVivre
    };
  }, [activeTransactions, abonnements]);

  // Filtered transactions for list view
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search query filter
      const matchesSearch = searchQuery === '' || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.comment && t.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subCategory && t.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || t.type === typeFilter;

      // Account filter
      const matchesAccount = accountFilter === 'all' || t.accountId === accountFilter;

      return matchesSearch && matchesCategory && matchesType && matchesAccount;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, categoryFilter, typeFilter, accountFilter]);

  // Grouped expenses by category for SVG Chart
  const expenseByCategory = useMemo(() => {
    const map: Record<string, { amount: number; color: string }> = {};
    allCategories.forEach(c => {
      map[c.name] = { amount: 0, color: c.color };
    });

    activeTransactions.filter(t => t.type === 'expense').forEach(t => {
      if (!map[t.category]) {
        map[t.category] = { amount: 0, color: '#6B7280' };
      }
      map[t.category].amount += t.amount;
    });

    return Object.entries(map)
      .map(([name, val]) => ({ name, amount: val.amount, color: val.color }))
      .filter(item => item.amount > 0);
  }, [activeTransactions, allCategories]);

  // Total expenses for percentage calculation
  const totalExpense = useMemo(() => {
    return expenseByCategory.reduce((sum, item) => sum + item.amount, 0);
  }, [expenseByCategory]);

  // ----------------------------------------------------
  // Actions & Operations
  // ----------------------------------------------------
  const handleOpenAddTx = () => {
    setEditingTx(null);
    setTxForm({
      title: '',
      amount: '',
      type: 'expense',
      category: allCategories[0]?.name || 'Alimentation',
      subCategory: 'Supermarché',
      accountId: accounts[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      comment: '',
      recurrence: 'none',
      receiptBase64: '',
      attachmentBase64: ''
    });
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxForm({
      title: tx.title,
      amount: tx.amount.toString(),
      type: tx.type === 'income' ? 'income' : 'expense',
      category: tx.category,
      subCategory: tx.subCategory || 'Divers',
      accountId: tx.accountId || '',
      date: tx.date,
      comment: tx.comment || '',
      recurrence: tx.recurrence || 'none',
      receiptBase64: tx.receiptBase64 || '',
      attachmentBase64: tx.attachmentBase64 || ''
    });
    setIsTxModalOpen(true);
  };

  // Convert files to base64 utility
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'receipt' | 'attachment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setTxForm(prev => ({
          ...prev,
          [field === 'receipt' ? 'receiptBase64' : 'attachmentBase64']: reader.result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Create or Update Transaction
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    const parsedAmount = Math.abs(parseFloat(txForm.amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    try {
      const nowUser = myMemberProfile?.displayName || 'Parent';

      if (editingTx) {
        // Track modification history
        const newHistoryItem = {
          date: new Date().toISOString(),
          author: nowUser,
          action: `Modification : ${editingTx.title !== txForm.title ? `Titre (${editingTx.title} -> ${txForm.title}) ` : ''}${editingTx.amount !== parsedAmount ? `Montant (${editingTx.amount} -> ${parsedAmount}) ` : ''}`
        };

        const updatedHistory = [...(editingTx.modificationHistory || []), newHistoryItem];

        const dbItem = {
          id: editingTx.id,
          foyer_id: foyerId,
          amount: parsedAmount,
          type: txForm.type,
          category: txForm.category,
          sub_category: txForm.subCategory,
          account_id: txForm.accountId || null,
          date: txForm.date,
          title: txForm.title,
          comment: txForm.comment,
          recurrence: txForm.recurrence,
          receipt_base64: txForm.receiptBase64,
          attachment_base64: txForm.attachmentBase64,
          modification_history: JSON.stringify(updatedHistory),
          member_id: editingTx.memberId,
          member_name: editingTx.memberName
        };

        const { error } = await supabase.from('transactions').upsert(dbItem);
        if (error) throw error;
        setTransactions(prev => prev.map(t => t.id === dbItem.id ? mapDbTxToTransaction(dbItem) : t));
      } else {
        // Create new
        const dbItem = {
          id: crypto.randomUUID(),
          foyer_id: foyerId,
          amount: parsedAmount,
          type: txForm.type,
          category: txForm.category,
          sub_category: txForm.subCategory,
          account_id: txForm.accountId || null,
          date: txForm.date,
          title: txForm.title,
          comment: txForm.comment,
          recurrence: txForm.recurrence,
          receipt_base64: txForm.receiptBase64,
          attachment_base64: txForm.attachmentBase64,
          modification_history: JSON.stringify([{
            date: new Date().toISOString(),
            author: nowUser,
            action: 'Création de la transaction'
          }]),
          member_id: activeMemberId,
          member_name: activeMemberObj?.name || 'Système'
        };

        const { error } = await supabase.from('transactions').insert(dbItem);
        if (error) throw error;
        setTransactions(prev => [mapDbTxToTransaction(dbItem), ...prev]);
      }

      setIsTxModalOpen(false);
      setEditingTx(null);
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      alert('Erreur lors de la sauvegarde de la transaction : ' + err.message);
    }
  };

  // Delete transaction
  const handleDeleteTx = async (txId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const { data, error } = await supabase.from('transactions').delete().eq('foyer_id', foyerId).eq('id', txId).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Vous n'avez pas l'autorisation de supprimer cette transaction (droits Parent/Admin requis).");
      }
      setTransactions(prev => prev.filter(t => t.id !== txId));
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  // Duplicate transaction
  const handleDuplicateTx = async (tx: Transaction) => {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const nowUser = myMemberProfile?.displayName || 'Parent';
      const dbItem = {
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        sub_category: tx.subCategory,
        account_id: tx.accountId || null,
        date: new Date().toISOString().split('T')[0], // today
        title: `${tx.title} (Copie)`,
        comment: tx.comment,
        recurrence: tx.recurrence || 'none',
        receipt_base64: tx.receiptBase64,
        attachment_base64: tx.attachmentBase64,
        modification_history: JSON.stringify([{
          date: new Date().toISOString(),
          author: nowUser,
          action: `Duplication de la transaction ${tx.id}`
        }]),
        member_id: activeMemberId,
        member_name: activeMemberObj?.name || 'Système'
      };

      const { error } = await supabase.from('transactions').insert(dbItem);
      if (error) throw error;
      setTransactions(prev => [mapDbTxToTransaction(dbItem), ...prev]);
    } catch (err: any) {
      console.error('Error duplicating transaction:', err);
      alert('Erreur lors de la duplication : ' + err.message);
    }
  };

  // Archive transaction
  const handleArchiveTx = async (tx: Transaction) => {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_archived: !tx.isArchived })
        .eq('foyer_id', foyerId)
        .eq('id', tx.id);
      if (error) throw error;
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, isArchived: !t.isArchived } : t));
    } catch (err: any) {
      console.error('Error archiving transaction:', err);
      alert('Erreur lors de l\'archivage : ' + err.message);
    }
  };

  // ----------------------------------------------------
  // Custom Categories CRUD
  // ----------------------------------------------------
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const dbItem = {
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        name: catForm.name,
        icon: catForm.icon,
        color: catForm.color,
        budget: parseFloat(catForm.budget) || 0,
        display_order: parseInt(catForm.displayOrder) || 0
      };

      const { error } = await supabase.from('custom_categories').insert(dbItem);
      if (error) throw error;

      const newItem: CustomCategory = {
        id: dbItem.id,
        name: dbItem.name,
        icon: dbItem.icon,
        color: dbItem.color,
        budget: dbItem.budget,
        displayOrder: dbItem.display_order
      };
      setCustomCategories(prev => [...prev, newItem]);

      setIsCatModalOpen(false);
      setCatForm({ name: '', icon: 'Mosquée', color: '#EF4444', budget: '', displayOrder: '0' });
    } catch (err: any) {
      console.error('Error saving custom category:', err);
      alert('Erreur lors de l\'enregistrement de la catégorie : ' + err.message);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Voulez-vous supprimer cette catégorie personnalisée ?')) return;
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const { data, error } = await supabase.from('custom_categories').delete().eq('foyer_id', foyerId).eq('id', catId).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Vous n'avez pas l'autorisation de supprimer cette catégorie ou elle n'existe pas.");
      }
      setCustomCategories(prev => prev.filter(c => c.id !== catId));
    } catch (err: any) {
      console.error('Error deleting custom category:', err);
      alert('Erreur lors de la suppression de la catégorie : ' + err.message);
    }
  };

  // Merge (fusionner) custom category transactions into another category
  const handleMergeCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) {
      alert('Veuillez sélectionner deux catégories distinctes.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      // 1. Update all transactions matching the source category to target category
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ category: mergeTarget })
        .eq('foyer_id', foyerId)
        .eq('category', mergeSource);

      if (txErr) throw txErr;

      setTransactions(prev => prev.map(t => t.category === mergeSource ? { ...t, category: mergeTarget } : t));

      // 2. Delete source custom category if it is a custom category
      const sourceCc = customCategories.find(c => c.name === mergeSource);
      if (sourceCc) {
        await supabase.from('custom_categories').delete().eq('foyer_id', foyerId).eq('id', sourceCc.id);
        setCustomCategories(prev => prev.filter(c => c.id !== sourceCc.id));
      }

      setIsMergeModalOpen(false);
      alert('Fusion effectuée avec succès !');
    } catch (err: any) {
      console.error('Error merging categories:', err);
      alert('Erreur lors de la fusion : ' + err.message);
    }
  };

  // ----------------------------------------------------
  // Saving Goals CRUD (Collaborative Pots)
  // ----------------------------------------------------
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const target = parseFloat(goalForm.targetAmount);
      if (isNaN(target) || target <= 0) return;

      if (editingGoal) {
        const { error } = await supabase
          .from('saving_goals')
          .update({
            title: goalForm.title,
            target_amount: target,
            target_date: goalForm.targetDate,
            category: goalForm.category
          })
          .eq('foyer_id', foyerId)
          .eq('id', editingGoal.id);
        if (error) throw error;

        setSavingGoals(prev => prev.map(g => g.id === editingGoal.id ? {
          ...g,
          title: goalForm.title,
          targetAmount: target,
          targetDate: goalForm.targetDate,
          category: goalForm.category
        } : g));
      } else {
        const dbItem = {
          id: crypto.randomUUID(),
          foyer_id: foyerId,
          title: goalForm.title,
          target_amount: target,
          current_amount: parseFloat(goalForm.currentAmount) || 0,
          target_date: goalForm.targetDate,
          category: goalForm.category,
          contributions: JSON.stringify([])
        };
        const { error } = await supabase.from('saving_goals').insert(dbItem);
        if (error) throw error;

        const newItem: SavingGoal = {
          id: dbItem.id,
          title: dbItem.title,
          targetAmount: dbItem.target_amount,
          currentAmount: dbItem.current_amount,
          targetDate: dbItem.target_date,
          category: dbItem.category,
          contributions: []
        };
        setSavingGoals(prev => [...prev, newItem]);
      }

      setIsGoalModalOpen(false);
      setEditingGoal(null);
      setGoalForm({ title: '', targetAmount: '', currentAmount: '0', targetDate: '', category: 'Général' });
    } catch (err: any) {
      console.error('Error saving goal:', err);
      alert('Erreur lors de l\'enregistrement de la cagnotte : ' + err.message);
    }
  };

  const handleOpenEditGoal = (goal: SavingGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate || '',
      category: goal.category || 'Général'
    });
    setIsGoalModalOpen(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Supprimer cette cagnotte d\'épargne ?')) return;
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const { data, error } = await supabase.from('saving_goals').delete().eq('foyer_id', foyerId).eq('id', goalId).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Vous n'avez pas l'autorisation de supprimer cette cagnotte ou elle n'existe pas.");
      }
      setSavingGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err: any) {
      console.error('Error deleting goal:', err);
      alert('Erreur lors de la suppression de la cagnotte : ' + err.message);
    }
  };

  // Collaborative Contribution Flow
  const handleOpenContrib = (goal: SavingGoal) => {
    setContribGoal(goal);
    setContribAmount('');
    setContribType('add');
  };

  const handleSaveContrib = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoal) return;

    const amt = parseFloat(contribAmount);
    if (isNaN(amt) || amt <= 0) return;

    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const isAdd = contribType === 'add';
      const change = isAdd ? amt : -amt;
      const newCurrent = Math.max(0, contribGoal.currentAmount + change);

      const contributionLogItem = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        memberId: activeMemberId,
        memberName: activeMemberObj?.name || 'Parent',
        amount: change
      };

      const updatedContributions = [...(contribGoal.contributions || []), contributionLogItem];

      // 1. Update savings goal current amount
      const { error: goalErr } = await supabase
        .from('saving_goals')
        .update({
          current_amount: newCurrent,
          contributions: JSON.stringify(updatedContributions)
        })
        .eq('foyer_id', foyerId)
        .eq('id', contribGoal.id);

      if (goalErr) throw goalErr;

      // 2. Generate automatic transaction tracking
      const txItem = {
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        title: isAdd ? `Versement cagnotte : ${contribGoal.title}` : `Retrait cagnotte : ${contribGoal.title}`,
        amount: amt,
        type: isAdd ? 'expense' : 'income', // Expense from wallet to pot, or income from pot to wallet
        category: 'Épargne',
        date: new Date().toISOString().split('T')[0],
        member_id: activeMemberId,
        member_name: activeMemberObj?.name || 'Système',
        comment: `Transaction automatique liée à la cagnotte`
      };

      await supabase.from('transactions').insert(txItem);

      // Update local state
      setSavingGoals(prev => prev.map(g => g.id === contribGoal.id ? {
        ...g,
        currentAmount: newCurrent,
        contributions: updatedContributions
      } : g));
      setTransactions(prev => [mapDbTxToTransaction(txItem), ...prev]);

      setContribGoal(null);
      alert('Contribution enregistrée !');
    } catch (err: any) {
      console.error('Error saving contribution:', err);
      alert('Erreur lors de la contribution : ' + err.message);
    }
  };

  // ----------------------------------------------------
  // Subscriptions CRUD (Abonnements)
  // ----------------------------------------------------
  const handleSaveAbo = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const amt = parseFloat(aboForm.amount);
      if (isNaN(amt) || amt <= 0) return;

      if (editingAbo) {
        const { error } = await supabase
          .from('abonnements')
          .update({
            name: aboForm.name,
            amount: amt,
            period: aboForm.period,
            next_billing_date: aboForm.nextBillingDate,
            category: aboForm.category
          })
          .eq('foyer_id', foyerId)
          .eq('id', editingAbo.id);
        if (error) throw error;

        setAbonnements(prev => prev.map(a => a.id === editingAbo.id ? {
          ...a,
          name: aboForm.name,
          amount: amt,
          period: aboForm.period as any,
          nextBillingDate: aboForm.nextBillingDate,
          category: aboForm.category
        } : a));
      } else {
        const dbItem = {
          id: crypto.randomUUID(),
          foyer_id: foyerId,
          name: aboForm.name,
          amount: amt,
          period: aboForm.period,
          next_billing_date: aboForm.nextBillingDate,
          category: aboForm.category
        };
        const { error } = await supabase.from('abonnements').insert(dbItem);
        if (error) throw error;

        const newItem: Abonnement = {
          id: dbItem.id,
          name: dbItem.name,
          amount: dbItem.amount,
          period: dbItem.period as any,
          nextBillingDate: dbItem.next_billing_date,
          category: dbItem.category
        };
        setAbonnements(prev => [...prev, newItem]);
      }

      setIsAboModalOpen(false);
      setEditingAbo(null);
      setAboForm({ name: '', amount: '', period: 'monthly', nextBillingDate: new Date().toISOString().split('T')[0], category: 'Loisirs' });
    } catch (err: any) {
      console.error('Error saving subscription:', err);
      alert('Erreur lors de l\'enregistrement de l\'abonnement : ' + err.message);
    }
  };

  const handleOpenEditAbo = (abo: Abonnement) => {
    setEditingAbo(abo);
    setAboForm({
      name: abo.name,
      amount: abo.amount.toString(),
      period: abo.period,
      nextBillingDate: abo.nextBillingDate || '',
      category: abo.category || 'Loisirs'
    });
    setIsAboModalOpen(true);
  };

  const handleDeleteAbo = async (aboId: string) => {
    if (!confirm('Supprimer cet abonnement récurrent ?')) return;
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const { data, error } = await supabase.from('abonnements').delete().eq('foyer_id', foyerId).eq('id', aboId).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Vous n'avez pas l'autorisation de supprimer cet abonnement ou il n'existe pas.");
      }
      setAbonnements(prev => prev.filter(a => a.id !== aboId));
    } catch (err: any) {
      console.error('Error deleting subscription:', err);
      alert('Erreur lors de la suppression de l\'abonnement : ' + err.message);
    }
  };

  // ----------------------------------------------------
  // Peer-to-Peer Family Debts Tracker
  // ----------------------------------------------------
  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtForm.payerId || !debtForm.debtorId || debtForm.payerId === debtForm.debtorId) {
      alert('Veuillez sélectionner deux membres différents');
      return;
    }

    const amt = parseFloat(debtForm.amount);
    if (isNaN(amt) || amt <= 0) return;

    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const payer = members.find(m => m.id === debtForm.payerId);
      const debtor = members.find(m => m.id === debtForm.debtorId);

      const dbItem = {
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        title: debtForm.title,
        amount: amt,
        payer_id: debtForm.payerId,
        payer_name: payer?.name || 'Parent',
        debtor_id: debtForm.debtorId,
        debtor_name: debtor?.name || 'Enfant',
        is_repaid: false
      };

      const { error } = await supabase.from('debts').insert(dbItem);
      if (error) throw error;

      const newItem: Debt = {
        id: dbItem.id,
        title: dbItem.title,
        amount: dbItem.amount,
        payerId: dbItem.payer_id,
        payerName: dbItem.payer_name,
        debtorId: dbItem.debtor_id,
        debtorName: dbItem.debtor_name,
        isRepaid: dbItem.is_repaid
      };
      setDebts(prev => [...prev, newItem]);

      setIsDebtModalOpen(false);
      setDebtForm({ title: '', amount: '', payerId: '', debtorId: '' });
    } catch (err: any) {
      console.error('Error saving debt:', err);
      alert('Erreur lors de l\'enregistrement de la dette : ' + err.message);
    }
  };

  // Reimburse/settle debt (marks as repaid + optional auto-transaction generation)
  const handleSettleDebt = async (debt: Debt) => {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const { error } = await supabase
        .from('debts')
        .update({ is_repaid: true })
        .eq('foyer_id', foyerId)
        .eq('id', debt.id);

      if (error) throw error;

      // Auto transaction track
      const tx = {
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        title: `Remboursement dette : ${debt.title}`,
        amount: debt.amount,
        type: 'expense', // from debtor wallet
        category: 'Remboursements',
        date: new Date().toISOString().split('T')[0],
        member_id: debt.debtorId,
        member_name: debt.debtorName,
        comment: `Remboursement de la dette à ${debt.payerName}`
      };

      await supabase.from('transactions').insert(tx);

      // Local state update
      setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, isRepaid: true } : d));
      setTransactions(prev => [mapDbTxToTransaction(tx), ...prev]);

      alert('Dette marquée comme remboursée !');
    } catch (err: any) {
      console.error('Error settling debt:', err);
      alert('Erreur lors du remboursement de la dette : ' + err.message);
    }
  };

  // ----------------------------------------------------
  // Multi-Account Transfers
  // ----------------------------------------------------
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.sourceAccountId || !transferForm.targetAccountId || transferForm.sourceAccountId === transferForm.targetAccountId) {
      alert('Veuillez sélectionner deux comptes distincts');
      return;
    }

    const amt = parseFloat(transferForm.amount);
    if (isNaN(amt) || amt <= 0) return;

    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;

    try {
      const srcAcc = accounts.find(a => a.id === transferForm.sourceAccountId);
      const destAcc = accounts.find(a => a.id === transferForm.targetAccountId);

      if (!srcAcc || !destAcc) return;

      // 1. Create source account debit transaction
      const transOut = {
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        amount: amt,
        type: 'expense',
        category: 'Transfert',
        sub_category: 'Sortie',
        account_id: srcAcc.id,
        date: new Date().toISOString().split('T')[0],
        title: `Virement vers ${destAcc.name}`,
        member_id: activeMemberId,
        member_name: activeMemberObj?.name || 'Système',
        comment: `Transfert inter-compte`
      };

      // 2. Create destination account credit transaction
      const transIn = {
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        amount: amt,
        type: 'income',
        category: 'Transfert',
        sub_category: 'Entrée',
        account_id: destAcc.id,
        date: new Date().toISOString().split('T')[0],
        title: `Virement reçu de ${srcAcc.name}`,
        member_id: activeMemberId,
        member_name: activeMemberObj?.name || 'Système',
        comment: `Transfert inter-compte`
      };

      const { error: err1 } = await supabase.from('transactions').insert(transOut);
      const { error: err2 } = await supabase.from('transactions').insert(transIn);

      if (err1) throw err1;
      if (err2) throw err2;

      // 3. Update balances in Supabase
      await supabase.from('accounts').update({ balance: Math.max(0, srcAcc.balance - amt) }).eq('id', srcAcc.id);
      await supabase.from('accounts').update({ balance: destAcc.balance + amt }).eq('id', destAcc.id);

      // Local state update
      setTransactions(prev => [mapDbTxToTransaction(transOut), mapDbTxToTransaction(transIn), ...prev]);
      setAccounts(prev => prev.map(a => {
        if (a.id === srcAcc.id) {
          return { ...a, balance: Math.max(0, a.balance - amt) };
        }
        if (a.id === destAcc.id) {
          return { ...a, balance: a.balance + amt };
        }
        return a;
      }));

      setIsTransferModalOpen(false);
      setTransferForm({ sourceAccountId: '', targetAccountId: '', amount: '' });
      alert('Transfert réalisé avec succès !');
    } catch (err: any) {
      console.error('Error doing transfer:', err);
      alert('Erreur lors du transfert : ' + err.message);
    }
  };

  // ----------------------------------------------------
  // Export & Statement Import (Advanced Modules integrated)
  // ----------------------------------------------------

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Finances de la Famille</span>
              <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md shadow-purple-500/20">
                Premium
              </span>
            </h1>
            <p className="text-xs text-white/50 font-medium">Module de Gestion Financière Collaboratif</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAuthorized && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl transition duration-200 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white/80">Importer</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl transition duration-200 cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white/80">Exporter</span>
              </button>
            </>
          )}

          <button
            onClick={handleOpenAddTx}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6C5CFF] hover:bg-[#6C5CFF]/90 text-white rounded-xl text-xs font-bold shadow-md shadow-[#6C5CFF]/20 hover:scale-[1.02] active:scale-[0.98] transition duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Opération</span>
          </button>
        </div>
      </div>


      {/* Tabs Subheader */}
      <div className="mt-8">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-white/5">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: TrendingUp },
            { id: 'transactions', label: 'Opérations', icon: FileText },
            { id: 'accounts', label: 'Comptes & Virements', icon: CreditCard },
            { id: 'categories', label: 'Catégories', icon: Tag },
            { id: 'goals', label: 'Cagnottes d\'épargne', icon: PiggyBank },
            { id: 'abonnements', label: 'Abonnements', icon: RefreshCw },
            { id: 'debts', label: 'Dettes & Remboursements', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FinanceTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-200 whitespace-nowrap ${
                  active 
                    ? 'bg-white/10 text-white shadow-inner border border-white/10' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Section */}
      <main className="mt-8">
        
        {/* ========================================================================= */}
        {/* TAB: DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Top Cards Section */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors duration-500"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/60 text-sm font-medium">Solde Global du Foyer</span>
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black tracking-tight text-emerald-400">
                  {formatMoney(stats.balance)}
                </div>
                <div className="text-xs text-white/40 mt-1">Total des comptes et transactions</div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors duration-500"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/60 text-sm font-medium">Restes à Vivre</span>
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black tracking-tight text-white">
                  {formatMoney(stats.resteAVivre)}
                </div>
                <div className="text-xs text-white/40 mt-1">Déduction faite des abonnements récurrents</div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/60 text-sm font-medium">Abonnements Récurrents</span>
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black tracking-tight text-purple-400">
                  {formatMoney(stats.subsMonthly)}
                </div>
                <div className="text-xs text-white/40 mt-1">Estimation mensuelle cumulée</div>
              </div>
            </div>

            {/* Expenses Interactive Chart */}
            <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" />
                Répartition des Dépenses par Catégorie
              </h3>

              {expenseByCategory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40 text-sm">
                  <Info className="w-12 h-12 mb-3 text-white/20" />
                  Aucune dépense enregistrée sur cette période
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-8 justify-around">
                  {/* SVG Pie Chart */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {(() => {
                        let accumulatedAngle = 0;
                        return expenseByCategory.map((item, idx) => {
                          const percent = (item.amount / totalExpense) * 100;
                          const angle = (percent / 100) * 360;
                          const x1 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
                          const y1 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
                          accumulatedAngle += angle;
                          const x2 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
                          const y2 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
                          const largeArcFlag = angle > 180 ? 1 : 0;
                          const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                          return (
                            <path 
                              key={idx} 
                              d={d} 
                              fill={item.color} 
                              className="transition-transform duration-300 hover:scale-105 origin-center cursor-pointer"
                            >
                              <title>{`${item.name} : ${formatMoney(item.amount)}`}</title>
                            </path>
                          );
                        });
                      })()}
                      <circle cx="50" cy="50" r="22" fill="#0b0f19" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xxs uppercase tracking-wider text-white/50">Total</span>
                      <span className="text-base font-bold">{formatMoney(totalExpense)}</span>
                    </div>
                  </div>

                  {/* Legends */}
                  <div className="flex flex-col gap-2.5 w-full sm:w-1/2">
                    {expenseByCategory.map((item, idx) => {
                      const pct = ((item.amount / totalExpense) * 100).toFixed(1);
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: item.color }}></span>
                            <span className="text-white/80 font-medium">{item.name}</span>
                          </div>
                          <span className="font-semibold text-white/90">
                            {formatMoney(item.amount)} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                Actions Rapides
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-500/20 rounded-xl transition duration-200"
                >
                  <span className="flex items-center gap-3">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                    <span className="font-medium text-sm text-left">Faire un virement inter-compte</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </button>

                <button
                  onClick={() => setIsDebtModalOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 bg-purple-950/40 hover:bg-purple-950/80 border border-purple-500/20 rounded-xl transition duration-200"
                >
                  <span className="flex items-center gap-3">
                    <User className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-sm text-left">Ajouter une dette familiale</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-purple-400" />
                </button>

                <button
                  onClick={() => setIsCatModalOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800/80 border border-white/10 rounded-xl transition duration-200"
                >
                  <span className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-white/60" />
                    <span className="font-medium text-sm text-left">Créer une catégorie</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>

            {/* Collaborative Savings Pots Quick Glance */}
            <div className="md:col-span-3 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-pink-400" />
                  Cagnottes Collaborative d'Épargne
                </h3>
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="text-sm font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Cagnotte
                </button>
              </div>

              {savingGoals.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-sm">
                  Aucun projet d'épargne en cours. Créez-en un pour collaborer !
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {savingGoals.map(goal => {
                    const pct = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
                    return (
                      <div key={goal.id} className="bg-slate-950/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-bold text-base text-white/90">{goal.title}</h4>
                            <span className="text-xs bg-pink-500/10 text-pink-400 font-semibold px-2 py-0.5 rounded-full border border-pink-500/20">
                              {goal.category || 'Épargne'}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-xl font-black text-white">{formatMoney(goal.currentAmount)}</span>
                            <span className="text-xs text-white/40">/ {formatMoney(goal.targetAmount)}</span>
                          </div>

                          <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-pink-500 to-rose-500 h-2.5 rounded-full" 
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xxs text-white/40 mb-4">
                            <span>Progression : {pct.toFixed(0)}%</span>
                            {goal.targetDate && <span>Échéance : {goal.targetDate}</span>}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenContrib(goal)}
                            className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-xs font-semibold tracking-wider uppercase transition duration-200"
                          >
                            Contribuer / Retirer
                          </button>
                          <button
                            onClick={() => handleOpenEditGoal(goal)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white/70 hover:text-white transition duration-200"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: TRANSACTIONS (REVENUS / DEPENSES) */}
        {/* ========================================================================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            
            {/* Search, Filter & Actions Bar */}
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par titre, comm..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition duration-200"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500 transition duration-200"
                >
                  <option value="all">Toutes catégories</option>
                  {allCategories.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500 transition duration-200"
                >
                  <option value="all">Tous types</option>
                  <option value="income">Revenus</option>
                  <option value="expense">Dépenses</option>
                </select>

                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500 transition duration-200"
                >
                  <option value="all">Tous comptes</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setTypeFilter('all');
                    setSearchQuery('');
                    setAccountFilter('all');
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white/80 rounded-xl text-sm transition duration-200"
                >
                  Réinitialiser filtres
                </button>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-xs font-semibold uppercase tracking-wider bg-slate-950/40">
                      <th className="py-4 px-6">Titre & Détails</th>
                      <th className="py-4 px-6">Catégorie</th>
                      <th className="py-4 px-6">Compte</th>
                      <th className="py-4 px-6">Date & Auteur</th>
                      <th className="py-4 px-6 text-right">Montant</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-white/40 text-sm">
                          Aucune transaction trouvée correspondant à vos critères
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => {
                        const isIncome = tx.type === 'income';
                        const accountObj = accounts.find(a => a.id === tx.accountId);
                        return (
                          <tr key={tx.id} className="hover:bg-white/5 transition duration-150 group">
                            <td className="py-4 px-6">
                              <div className="font-bold text-white group-hover:text-purple-400 transition-colors">
                                {tx.title}
                              </div>
                              <div className="text-xs text-white/50 flex flex-wrap gap-2 mt-1">
                                {tx.subCategory && (
                                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                    {tx.subCategory}
                                  </span>
                                )}
                                {tx.comment && (
                                  <span className="text-white/40 italic">
                                    "{tx.comment}"
                                  </span>
                                )}
                                {tx.recurrence && tx.recurrence !== 'none' && (
                                  <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                    {tx.recurrence}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm font-medium text-white/80">
                                {tx.category}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-white/60">
                                {accountObj ? accountObj.name : 'Espèces / Autre'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-white/50">
                              <div>{tx.date}</div>
                              <div className="text-white/30 mt-0.5">Par {tx.memberName || 'Système'}</div>
                            </td>
                            <td className={`py-4 px-6 text-right font-black text-base ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isIncome ? '+' : '-'} {formatMoney(tx.amount)}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-1">
                                {tx.receiptBase64 && (
                                  <button
                                    onClick={() => alert(`Visualisation ticket : ${tx.title}`)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white rounded-lg transition"
                                    title="Voir le ticket"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setActiveHistoryTx(tx);
                                    setIsHistoryModalOpen(true);
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white rounded-lg transition"
                                  title="Historique des modifs"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleArchiveTx(tx)}
                                  className={`p-1.5 rounded-lg transition ${tx.isArchived ? 'bg-amber-900/40 text-amber-400' : 'bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white'}`}
                                  title={tx.isArchived ? 'Désarchiver' : 'Archiver'}
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateTx(tx)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white rounded-lg transition"
                                  title="Dupliquer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditTx(tx)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white rounded-lg transition"
                                  title="Modifier"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="p-1.5 bg-red-950/40 hover:bg-red-950/80 text-rose-400 rounded-lg transition"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ACCOUNTS & TRANSFERS */}
        {/* ========================================================================= */}
        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Accounts List */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    Comptes du Foyer
                  </h3>
                  <button
                    onClick={async () => {
                      const name = prompt('Nom du nouveau compte (ex: Revolut, Espèces...) :');
                      if (!name) return;
                      const balance = parseFloat(prompt('Solde initial (€) :', '0') || '0');
                      const supabase = getSupabaseClient();
                      if (supabase && foyerId) {
                        await supabase.from('accounts').insert({
                          id: crypto.randomUUID(),
                          foyer_id: foyerId,
                          name,
                          type: 'bank',
                          balance
                        });
                      }
                    }}
                    className="text-sm font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau Compte
                  </button>
                </div>

                {accounts.length === 0 ? (
                  <div className="text-center py-12 text-white/40 text-sm">
                    Aucun compte enregistré pour le moment.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {accounts.map(acc => (
                      <div key={acc.id} className="bg-slate-950/60 hover:bg-slate-950 border border-white/5 hover:border-white/10 rounded-xl p-5 flex items-center justify-between transition duration-200">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                            <CreditCard className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-white">{acc.name}</h4>
                            <span className="text-xs text-white/40 uppercase tracking-wide">{acc.type || 'Bancaire'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-white">{formatMoney(acc.balance)}</span>
                          <div className="flex justify-end gap-2 mt-1">
                            <button
                              onClick={async () => {
                                const newName = prompt('Nouveau nom du compte :', acc.name);
                                if (!newName) return;
                                const supabase = getSupabaseClient();
                                if (supabase && foyerId) {
                                  await supabase.from('accounts').update({ name: newName }).eq('foyer_id', foyerId).eq('id', acc.id);
                                }
                              }}
                              className="text-xs text-white/40 hover:text-white"
                            >
                              Renommer
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Voulez-vous supprimer ce compte ?')) return;
                                const supabase = getSupabaseClient();
                                if (supabase && foyerId) {
                                  try {
                                    const { data, error } = await supabase.from('accounts').delete().eq('foyer_id', foyerId).eq('id', acc.id).select();
                                    if (error) throw error;
                                    if (!data || data.length === 0) {
                                      throw new Error("Vous n'avez pas l'autorisation de supprimer ce compte.");
                                    }
                                    setAccounts(prev => prev.filter(a => a.id !== acc.id));
                                  } catch (err: any) {
                                    alert("Erreur lors de la suppression du compte : " + err.message);
                                  }
                                }
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Transfer form card */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                Virement Inter-Compte
              </h3>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Compte Source</label>
                  <select
                    value={transferForm.sourceAccountId}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, sourceAccountId: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                    required
                  >
                    <option value="">Sélectionner source...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Compte Cible</label>
                  <select
                    value={transferForm.targetAccountId}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, targetAccountId: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                    required
                  >
                    <option value="">Sélectionner destination...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant du virement (€)</label>
                  <input
                    type="number"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="ex: 150"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-sm font-semibold transition duration-200 mt-2"
                >
                  Valider le transfert
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: CATEGORIES CUSTOM */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Categories List */}
            <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-400" />
                  Catégories de Dépenses
                </h3>
                <button
                  onClick={() => setIsMergeModalOpen(true)}
                  className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Fusionner deux catégories
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allCategories.map((c, idx) => {
                  const isCustom = customCategories.some(cc => cc.name.toLowerCase() === c.name.toLowerCase());
                  const ccObj = customCategories.find(cc => cc.name.toLowerCase() === c.name.toLowerCase());
                  return (
                    <div key={idx} className="bg-slate-950/60 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg" style={{ backgroundColor: c.color + '20', color: c.color }}>
                          {c.icon ? c.icon.charAt(0) : '🏷️'}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-white">{c.name}</h4>
                          <span className="text-[10px] text-white/40 uppercase font-semibold">
                            {isCustom ? 'Personnalisée' : 'Système'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-900 px-2.5 py-1 rounded border border-white/10 text-white/70">
                          Max {formatMoney(c.budget)}
                        </span>
                        {isCustom && ccObj && (
                          <button
                            onClick={() => handleDeleteCategory(ccObj.id)}
                            className="p-1.5 bg-red-950/40 hover:bg-red-950/80 text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create Custom Category Form */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-400" />
                Nouvelle Catégorie
              </h3>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Nom de la catégorie</label>
                  <input
                    type="text"
                    value={catForm.name}
                    onChange={(e) => setCatForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: Animaux, Mosquée, Voyage..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Icône (Caractère ou Emoji)</label>
                  <select
                    value={catForm.icon}
                    onChange={(e) => setCatForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  >
                    <option value="🐾 Animaux">🐾 Animaux</option>
                    <option value="🕌 Mosquée">🕌 Mosquée</option>
                    <option value="🎁 Dons">🎁 Dons</option>
                    <option value="✈️ Voyage">✈️ Voyage</option>
                    <option value="💍 Mariage">💍 Mariage</option>
                    <option value="🏗️ Travaux">🏗️ Travaux</option>
                    <option value="⚽ Sport">⚽ Sport</option>
                    <option value="🎮 Loisirs">🎮 Loisirs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Couleur thématique</label>
                  <div className="flex gap-2.5">
                    {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatForm(prev => ({ ...prev, color: c }))}
                        className={`w-7 h-7 rounded-full border transition ${catForm.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      ></button>
                    ))}
                    <input 
                      type="color" 
                      value={catForm.color} 
                      onChange={(e) => setCatForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-7 h-7 bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Budget dédié mensuel (€)</label>
                  <input
                    type="number"
                    value={catForm.budget}
                    onChange={(e) => setCatForm(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="ex: 150"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition duration-200 mt-2"
                >
                  Ajouter la catégorie
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: SAVING GOALS (CAGNOTTES MULTIPLES) */}
        {/* ========================================================================= */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-pink-400" />
                  Cagnottes Collaborative d'Épargne
                </h3>
                <button
                  onClick={() => {
                    setEditingGoal(null);
                    setGoalForm({ title: '', targetAmount: '', currentAmount: '0', targetDate: '', category: 'Général' });
                    setIsGoalModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl text-sm font-semibold shadow-lg shadow-pink-600/20 transition"
                >
                  + Nouvelle Cagnotte
                </button>
              </div>

              {savingGoals.length === 0 ? (
                <div className="text-center py-16 text-white/40 text-sm">
                  Aucun projet d'épargne en cours. Créez-en un pour collaborer !
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {savingGoals.map(goal => {
                    const pct = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
                    return (
                      <div key={goal.id} className="bg-slate-950/60 border border-white/10 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-lg text-white">{goal.title}</h4>
                              <span className="text-xs text-white/40">Catégorie : {goal.category || 'Général'}</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleOpenEditGoal(goal)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white rounded-lg transition"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="p-1.5 bg-red-950/40 hover:bg-red-950/80 text-rose-400 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-baseline gap-1 mt-4">
                            <span className="text-2xl font-black text-pink-400">{formatMoney(goal.currentAmount)}</span>
                            <span className="text-sm text-white/40">/ target {formatMoney(goal.targetAmount)}</span>
                          </div>

                          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden mt-3">
                            <div 
                              className="bg-gradient-to-r from-pink-500 to-rose-500 h-3 rounded-full" 
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-white/40 mt-1">
                            <span>Progression : {pct.toFixed(0)}%</span>
                            {goal.targetDate && <span>Échéance : {goal.targetDate}</span>}
                          </div>
                        </div>

                        {/* Contribution History list */}
                        <div className="border-t border-white/5 pt-4">
                          <span className="text-xs text-white/60 font-semibold uppercase tracking-wider block mb-2">Contributions</span>
                          {(!goal.contributions || goal.contributions.length === 0) ? (
                            <span className="text-xxs text-white/30 italic">Aucune transaction enregistrée.</span>
                          ) : (
                            <div className="max-h-24 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
                              {goal.contributions.map((c, i) => (
                                <div key={i} className="flex justify-between text-xxs text-white/50">
                                  <span>{c.date.split('T')[0]} - {c.memberName}</span>
                                  <span className={c.amount > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                    {c.amount > 0 ? '+' : ''}{formatMoney(c.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenContrib(goal)}
                          className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-lg text-xs font-bold uppercase tracking-wider transition"
                        >
                          Ajouter / Retirer des fonds
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ABONNEMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'abonnements' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Active Subscriptions list */}
            <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-400" />
                Abonnements & Récurrences du Foyer
              </h3>

              {abonnements.length === 0 ? (
                <div className="text-center py-16 text-white/40 text-sm">
                  Aucun abonnement enregistré.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {abonnements.map(abo => (
                    <div key={abo.id} className="bg-slate-950/60 border border-white/5 rounded-xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-white">{abo.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                            <span className="capitalize">{abo.period === 'monthly' ? 'Mensuel' : abo.period === 'weekly' ? 'Hebdomadaire' : abo.period === 'yearly' ? 'Annuel' : 'Quotidien'}</span>
                            <span>•</span>
                            <span>Prochaine facture le {abo.nextBillingDate || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-base font-black text-purple-400">
                          {formatMoney(abo.amount)}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenEditAbo(abo)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white rounded-lg transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAbo(abo.id)}
                            className="p-1.5 bg-red-950/40 hover:bg-red-950/80 text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create subscription card */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-400" />
                Nouveau Contrat / Recurrency
              </h3>
              <form onSubmit={handleSaveAbo} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Nom du service</label>
                  <input
                    type="text"
                    value={aboForm.name}
                    onChange={(e) => setAboForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: Netflix, Loyer, Gemini..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Tarif facturé (€)</label>
                  <input
                    type="number"
                    value={aboForm.amount}
                    onChange={(e) => setAboForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="ex: 15.99"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Périodicité</label>
                  <select
                    value={aboForm.period}
                    onChange={(e) => setAboForm(prev => ({ ...prev, period: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  >
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Prochaine Échéance</label>
                  <input
                    type="date"
                    value={aboForm.nextBillingDate}
                    onChange={(e) => setAboForm(prev => ({ ...prev, nextBillingDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition duration-200 mt-2"
                >
                  Ajouter le contrat
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: DEBTS (DETTES FAMILIALES) */}
        {/* ========================================================================= */}
        {activeTab === 'debts' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Debts list */}
            <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                Dettes & Remboursements en cours
              </h3>

              {debts.length === 0 ? (
                <div className="text-center py-16 text-white/40 text-sm">
                  Aucun remboursement interne en attente.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {debts.map(debt => (
                    <div key={debt.id} className="bg-slate-950/60 border border-white/5 rounded-xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-white">{debt.title}</h4>
                          <span className="text-xs text-white/45 block mt-0.5">
                            {debt.debtorName} doit {formatMoney(debt.amount)} à {debt.payerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {debt.isRepaid ? (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase">
                            Remboursée
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSettleDebt(debt)}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-semibold uppercase tracking-wider transition"
                          >
                            Rembourser
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create debt card */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-400" />
                Créer une Dette Interne
              </h3>
              <form onSubmit={handleSaveDebt} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Titre de la dette</label>
                  <input
                    type="text"
                    value={debtForm.title}
                    onChange={(e) => setDebtForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="ex: Resto, Ticket de cinéma..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Qui prête (Créancier)</label>
                  <select
                    value={debtForm.payerId}
                    onChange={(e) => setDebtForm(prev => ({ ...prev, payerId: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Qui doit (Débiteur)</label>
                  <select
                    value={debtForm.debtorId}
                    onChange={(e) => setDebtForm(prev => ({ ...prev, debtorId: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant prêté (€)</label>
                  <input
                    type="number"
                    value={debtForm.amount}
                    onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="ex: 20"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition duration-200 mt-2"
                >
                  Ajouter la dette
                </button>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT TRANSACTION */}
      {/* ========================================================================= */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setIsTxModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-6">
              {editingTx ? 'Modifier la transaction' : 'Nouvelle opération financière'}
            </h3>

            <form onSubmit={handleSaveTx} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Titre / Libellé</label>
                <input
                  type="text"
                  value={txForm.title}
                  onChange={(e) => setTxForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                  placeholder="ex: Courses Leclerc, Salaire mai..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant (€)</label>
                  <input
                    type="number"
                    value={txForm.amount}
                    onChange={(e) => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Type d'opération</label>
                  <select
                    value={txForm.type}
                    onChange={(e) => setTxForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  >
                    <option value="expense">Dépense (Débit)</option>
                    <option value="income">Revenu (Crédit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Catégorie</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  >
                    {allCategories.map((c, idx) => (
                      <option key={idx} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Sous-catégorie</label>
                  <select
                    value={txForm.subCategory}
                    onChange={(e) => setTxForm(prev => ({ ...prev, subCategory: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  >
                    {availableSubcategories.map((sub, idx) => (
                      <option key={idx} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Compte associé</label>
                <select
                  value={txForm.accountId}
                  onChange={(e) => setTxForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                >
                  <option value="">Aucun (Espèces / Autre)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Date</label>
                  <input
                    type="date"
                    value={txForm.date}
                    onChange={(e) => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Récurrence automatique</label>
                  <select
                    value={txForm.recurrence}
                    onChange={(e) => setTxForm(prev => ({ ...prev, recurrence: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  >
                    <option value="none">Aucune</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Pièce Jointe / Ticket (Image)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('tx_receipt_file')?.click()}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-xs transition"
                  >
                    {txForm.receiptBase64 ? 'Ticket chargé ✓' : 'Charger Ticket'}
                  </button>
                  <input 
                    type="file" 
                    id="tx_receipt_file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'receipt')} 
                  />

                  <button
                    type="button"
                    onClick={() => document.getElementById('tx_attach_file')?.click()}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-xs transition"
                  >
                    {txForm.attachmentBase64 ? 'Facture chargée ✓' : 'Charger Facture'}
                  </button>
                  <input 
                    type="file" 
                    id="tx_attach_file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'attachment')} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Commentaire / Remarques</label>
                <textarea
                  value={txForm.comment}
                  onChange={(e) => setTxForm(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white h-20 resize-none"
                  placeholder="Notes additionnelles..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-sm font-semibold tracking-wider transition"
              >
                Enregistrer la transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GOAL CONTRIBUTION (COLLABORATIVE POT) */}
      {/* ========================================================================= */}
      {contribGoal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
            <button 
              onClick={() => setContribGoal(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-4">Contribution Cagnotte</h3>
            <p className="text-xs text-white/60 mb-6">
              Projet : <strong>{contribGoal.title}</strong> (Solde actuel : {formatMoney(contribGoal.currentAmount)})
            </p>

            <form onSubmit={handleSaveContrib} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Type d'opération</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContribType('add')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${contribType === 'add' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-white/60'}`}
                  >
                    Ajouter (Épargner)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContribType('withdraw')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${contribType === 'withdraw' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white/60'}`}
                  >
                    Retirer (Dépenser)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant (€)</label>
                <input
                  type="number"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 text-white"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="ex: 50"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl text-sm font-semibold transition"
              >
                Confirmer l'opération
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CATEGORY MERGING */}
      {/* ========================================================================= */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
            <button 
              onClick={() => setIsMergeModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
              Fusionner des Catégories
            </h3>
            <p className="text-xs text-white/60 mb-6">
              Tous les enregistrements de la catégorie source seront transférés vers la catégorie cible.
            </p>

            <form onSubmit={handleMergeCategories} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Catégorie Source</label>
                <select
                  value={mergeSource}
                  onChange={(e) => setMergeSource(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {allCategories.map((c, i) => (
                    <option key={i} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Catégorie Cible</label>
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {allCategories.map((c, i) => (
                    <option key={i} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-sm font-semibold transition"
              >
                Confirmer la fusion
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSACTION MODIFICATION HISTORY */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && activeHistoryTx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => {
                setIsHistoryModalOpen(false);
                setActiveHistoryTx(null);
              }}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-4">Historique des modifications</h3>
            <p className="text-xs text-white/60 mb-6">
              Opération : <strong>{activeHistoryTx.title}</strong>
            </p>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {(!activeHistoryTx.modificationHistory || activeHistoryTx.modificationHistory.length === 0) ? (
                <div className="text-center py-6 text-white/40 text-sm">
                  Aucun historique de modification.
                </div>
              ) : (
                activeHistoryTx.modificationHistory.map((log: any, idx: number) => (
                  <div key={idx} className="bg-slate-950/40 p-3 rounded-lg border border-white/5 text-xs">
                    <div className="flex justify-between text-white/40 mb-1">
                      <span>Par {log.author}</span>
                      <span>{new Date(log.date).toLocaleString()}</span>
                    </div>
                    <div className="text-white/80 font-medium">
                      {log.action}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-400" />
              Nouvelle Catégorie
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Nom de la catégorie</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Animaux, Mosquée, Voyage..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Icône (Caractère ou Emoji)</label>
                <select
                  value={catForm.icon}
                  onChange={(e) => setCatForm(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                >
                  <option value="🐾 Animaux">🐾 Animaux</option>
                  <option value="🕌 Mosquée">🕌 Mosquée</option>
                  <option value="🎁 Dons">🎁 Dons</option>
                  <option value="✈️ Voyage">✈️ Voyage</option>
                  <option value="💍 Mariage">💍 Mariage</option>
                  <option value="🏗️ Travaux">🏗️ Travaux</option>
                  <option value="⚽ Sport">⚽ Sport</option>
                  <option value="🎮 Loisirs">🎮 Loisirs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Couleur thématique</label>
                <div className="flex gap-2.5">
                  {['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatForm(prev => ({ ...prev, color: c }))}
                      className={`w-7 h-7 rounded-full border transition ${catForm.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    ></button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Budget dédié mensuel (€)</label>
                <input
                  type="number"
                  value={catForm.budget}
                  onChange={(e) => setCatForm(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="ex: 150"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition"
              >
                Ajouter la catégorie
              </button>
            </form>
          </div>
        </div>
      )}

      {isAboModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setIsAboModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-400" />
              {editingAbo ? 'Modifier l\'abonnement' : 'Nouvel Abonnement'}
            </h3>
            <form onSubmit={handleSaveAbo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Nom du service</label>
                <input
                  type="text"
                  value={aboForm.name}
                  onChange={(e) => setAboForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Netflix, Spotify..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Tarif facturé (€)</label>
                <input
                  type="number"
                  value={aboForm.amount}
                  onChange={(e) => setAboForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="ex: 15.99"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Périodicité</label>
                <select
                  value={aboForm.period}
                  onChange={(e) => setAboForm(prev => ({ ...prev, period: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                >
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Prochaine Échéance</label>
                <input
                  type="date"
                  value={aboForm.nextBillingDate}
                  onChange={(e) => setAboForm(prev => ({ ...prev, nextBillingDate: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition"
              >
                Sauvegarder
              </button>
            </form>
          </div>
        </div>
      )}

      {isDebtModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setIsDebtModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-400" />
              Créer une Dette Interne
            </h3>
            <form onSubmit={handleSaveDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Titre de la dette</label>
                <input
                  type="text"
                  value={debtForm.title}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="ex: Resto, Cinéma..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Qui prête (Créancier)</label>
                <select
                  value={debtForm.payerId}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, payerId: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Qui doit (Débiteur)</label>
                <select
                  value={debtForm.debtorId}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, debtorId: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant prêté (€)</label>
                <input
                  type="number"
                  value={debtForm.amount}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="ex: 20"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 text-white"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition"
              >
                Ajouter la dette
              </button>
            </form>
          </div>
        </div>
      )}

      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setIsTransferModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
              Virement Inter-Compte
            </h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Compte Source</label>
                <select
                  value={transferForm.sourceAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, sourceAccountId: e.target.value }))}
                  className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  required
                >
                  <option value="">Sélectionner source...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Compte Cible</label>
                <select
                  value={transferForm.targetAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, targetAccountId: e.target.value }))}
                  className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  required
                >
                  <option value="">Sélectionner destination...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant du virement (€)</label>
                <input
                  type="number"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="ex: 150"
                  className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-sm font-semibold transition"
              >
                Valider le transfert
              </button>
            </form>
          </div>
        </div>
      )}

      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative">
            <button 
              onClick={() => {
                setIsGoalModalOpen(false);
                setEditingGoal(null);
                setGoalForm({ title: '', targetAmount: '', currentAmount: '0', targetDate: '', category: 'Général' });
              }} 
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-pink-400" />
              {editingGoal ? 'Modifier la Cagnotte' : 'Nouvelle Cagnotte Épargne'}
            </h3>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Titre du projet</label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="ex: Vacances d'été, Nouvelle Voiture..."
                  className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant Cible (€)</label>
                <input
                  type="number"
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                  placeholder="ex: 3000"
                  className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 text-white"
                  required
                  min="1"
                />
              </div>

              {!editingGoal && (
                <div>
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Montant Initial (€)</label>
                  <input
                    type="number"
                    value={goalForm.currentAmount}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, currentAmount: e.target.value }))}
                    placeholder="ex: 0"
                    className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 text-white"
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Date Cible</label>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, targetDate: e.target.value }))}
                  className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Catégorie de projet</label>
                <select
                  value={goalForm.category}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-955 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 text-white"
                >
                  <option value="Général">Général</option>
                  <option value="Voyage">Voyage</option>
                  <option value="Maison">Maison</option>
                  <option value="Voiture">Voiture</option>
                  <option value="Études">Études</option>
                  <option value="Cadeaux">Cadeaux</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-xl text-sm font-semibold transition"
              >
                {editingGoal ? 'Sauvegarder' : 'Créer la cagnotte'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <FinancesExport
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
            if (onClearActiveSubView) onClearActiveSubView();
          }}
          transactions={transactions}
          savingGoals={savingGoals}
          members={members}
          customCategories={customCategories}
          accounts={accounts}
          abonnements={abonnements}
          foyerId={foyerId}
          myMemberProfile={myMemberProfile}
          currencySymbol={_currencySymbol}
          initialOptions={activeSubView?.type === 'export' ? activeSubView.options : undefined}
        />
      )}

      {isImportModalOpen && (
        <FinancesImport
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            if (onClearActiveSubView) onClearActiveSubView();
          }}
          transactions={transactions}
          accounts={accounts}
          customCategories={customCategories}
          foyerId={foyerId}
          myMemberProfile={myMemberProfile}
          activeMemberId={activeMemberId}
          activeMemberObj={members.find(m => m.id === activeMemberId)}
          onImportComplete={(newTxs) => {
            const mapped = newTxs.map(mapDbTxToTransaction);
            setTransactions(prev => [...mapped, ...prev]);
            if (onClearActiveSubView) onClearActiveSubView();
          }}
          initialOptions={activeSubView?.type === 'import' ? activeSubView.options : undefined}
        />
      )}

    </div>
  );
};
