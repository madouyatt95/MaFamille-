/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/exhaustive-deps -- legacy Supabase and module payloads still use broad shapes; tracked in docs/lint_cleanup_remaining.md; legacy state and payload updates need a dedicated immutable-data refactor; legacy effects need dependency isolation before changing behavior */
import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Database,
  BarChart3,
  FileJson,
  FileSpreadsheet,
  Lock
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';
import type { Transaction, Member, SavingGoal, CustomCategory, Account, Abonnement, Trip } from '../types';
import type { WorkSheet } from 'xlsx';

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const resolveImagePayload = async (payload?: string): Promise<string | undefined> => {
  if (!payload) return undefined;
  if (!/^https?:\/\//i.test(payload)) return payload;
  const response = await fetch(payload);
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
  return blobToDataUrl(await response.blob());
};

interface BudgetExportProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  savingGoals: SavingGoal[];
  members: Member[];
  customCategories: CustomCategory[];
  accounts: Account[];
  abonnements: Abonnement[];
  trips: Trip[];
  foyerId: string;
  myMemberProfile: any;
  currencySymbol: string;
  initialOptions?: {
    format?: 'pdf' | 'excel' | 'csv' | 'json' | 'txt';
    period?: 'today' | 'week' | 'month' | 'last_month' | 'quarter' | 'year' | 'last_year' | 'custom';
    category?: string;
  };
}

type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'txt';
type ExportPeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_year' | 'custom';

interface HistoryItem {
  id: string;
  created_at: string;
  format: string;
  period_type: string;
  start_date: string;
  end_date: string;
  member_name: string;
  file_path: string | null;
  options_included?: string;
}

export const BudgetExport: React.FC<BudgetExportProps> = ({
  isOpen,
  onClose,
  transactions,
  savingGoals,
  customCategories,
  accounts,
  abonnements,
  trips,
  foyerId,
  myMemberProfile,
  currencySymbol,
  initialOptions
}) => {
  // Format state
  const [format, setFormat] = useState<ExportFormat>('pdf');
  
  // Period states
  const [period, setPeriod] = useState<ExportPeriod>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data selection states - Case checkboxes
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeCategories, setIncludeCategories] = useState(true);
  const [includeSubCategories, setIncludeSubCategories] = useState(true);
  const [includeModuleBudgets, setIncludeModuleBudgets] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeTravelGoals, setIncludeTravelGoals] = useState(true);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeAbonnements, setIncludeAbonnements] = useState(true);
  const [includeImports, setIncludeImports] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  
  // Advanced sub-checkboxes
  const [includeChartPie, setIncludeChartPie] = useState(true);
  const [includeChartLine, setIncludeChartLine] = useState(true);
  const [includeChartModule, setIncludeChartModule] = useState(true);
  const [includeChartMember, setIncludeChartMember] = useState(true);
  const [includeVoiceTxs, setIncludeVoiceTxs] = useState(true);
  const [includeImportedTxs, setIncludeImportedTxs] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);

  // Storage and status
  const [saveCloud] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [importsHistory, setImportsHistory] = useState<any[]>([]);

  // CSV sub-selection (for CSV downloads)
  const [csvTarget, setCsvTarget] = useState<'expenses' | 'incomes' | 'transactions' | 'savings' | 'abonnements'>('transactions');

  // Verify Roles / Permissions (seuls owner, gestionnaire et parent peuvent exporter)
  const userRole = (myMemberProfile?.role || 'parent').toLowerCase();
  const isAllowedToExport = ['owner', 'gestionnaire', 'parent', 'admin', 'chef de famille'].some(r => userRole.includes(r));

  // Apply initial options from voice parsing if present
  useEffect(() => {
    if (initialOptions) {
      if (initialOptions.format) queueMicrotask(() => setFormat(initialOptions.format as ExportFormat));
      if (initialOptions.period) {
        const nextPeriod =
          initialOptions.period === 'today' ? 'today' :
          initialOptions.period === 'week' ? 'this_week' :
          initialOptions.period === 'month' ? 'this_month' :
          initialOptions.period === 'last_month' ? 'last_month' :
          initialOptions.period === 'quarter' ? 'this_quarter' :
          initialOptions.period === 'year' ? 'this_year' :
          initialOptions.period === 'last_year' ? 'last_year' :
          initialOptions.period === 'custom' ? 'custom' :
          null;
        if (nextPeriod) queueMicrotask(() => setPeriod(nextPeriod));
      }
    }
  }, [initialOptions]);

  // Load history on open
  useEffect(() => {
    if (isOpen && foyerId && isAllowedToExport) {
      loadExportHistory();
      loadImportHistory();
    }
  }, [isOpen, foyerId, isAllowedToExport]);

  const loadExportHistory = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('exports_history')
        .select('*')
        .eq('foyer_id', foyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error('Error loading export history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadImportHistory = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('imports_history')
        .select('*')
        .eq('foyer_id', foyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImportsHistory(data || []);
    } catch (err: any) {
      console.error('Error loading import history in export view:', err);
    }
  };

  // Helper date calculators
  const getPeriodDates = (): { start: Date; end: Date } => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'this_quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(0);
        end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
        break;
    }
    return { start, end };
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();
  const formattedStartStr = periodStart.toISOString().split('T')[0];
  const formattedEndStr = periodEnd.toISOString().split('T')[0];

  const filteredTxs = transactions.filter(t => {
    const txDate = new Date(t.date);
    if (txDate < periodStart || txDate > periodEnd) return false;

    // Filter out voice command transactions if unchecked
    const isVoiceTx = t.comment === 'Généré par commande vocale' || (t.comment && t.comment.toLowerCase().includes('vocal')) || false;
    if (!includeVoiceTxs && isVoiceTx) return false;

    // Filter out imported transactions if unchecked
    const isImported = t.modificationHistory?.some(h => h.action.toLowerCase().includes('import')) || false;
    if (!includeImportedTxs && isImported) return false;

    return true;
  });

  const incomeTxs = filteredTxs.filter(t => t.type === 'income');
  const expenseTxs = filteredTxs.filter(t => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const savingsTotal = savingGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Budget par module calculations
  const moduleBudgets: Record<string, number> = {
    courses: 600,
    sante: 150,
    vehicules: 250,
    logement: 800,
    voyages: trips.reduce((acc, t) => acc + t.budget, 0),
    ecole: 200,
    demarches: 150,
    animaux: 100,
    argent_de_poche: 100
  };

  // Group real expenses by moduleSource
  const moduleDépenses: Record<string, number> = {
    courses: 0,
    sante: 0,
    vehicules: 0,
    logement: 0,
    voyages: 0,
    ecole: 0,
    demarches: 0,
    animaux: 0,
    argent_de_poche: 0
  };

  filteredTxs.filter(t => t.type === 'expense').forEach(t => {
    const src = t.moduleSource || 'budget';
    if (src in moduleDépenses) {
      moduleDépenses[src] += t.amount;
    }
  });

  // Handle Export Generation
  const handleGenerateExport = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      // Pre-calculate spending groupings for use in PDF & Excel charts
      const expenseByCat: Record<string, number> = {};
      expenseTxs.forEach(t => {
        expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
      });

      const moduleExpenses: Record<string, number> = {};
      expenseTxs.forEach(t => {
        const mod = t.moduleSource || 'budget';
        moduleExpenses[mod] = (moduleExpenses[mod] || 0) + t.amount;
      });

      const memberExpenses: Record<string, number> = {};
      expenseTxs.forEach(t => {
        const name = t.memberName || t.createdBy || 'Parent';
        memberExpenses[name] = (memberExpenses[name] || 0) + t.amount;
      });

      const fileName = `Export_Budget_${formattedStartStr}_to_${formattedEndStr}.${format === 'excel' ? 'xlsx' : format}`;
      let fileBlob: Blob | null = null;
      let textContent = '';

      // Create comma-separated options list to save in logs
      const optionsArray = [];
      if (includeSummary) optionsArray.push('résumé');
      if (includeIncome) optionsArray.push('revenus');
      if (includeExpenses) optionsArray.push('dépenses');
      if (includeTransactions) optionsArray.push('transactions');
      if (includeCategories) optionsArray.push('catégories');
      if (includeSubCategories) optionsArray.push('sous-catégories');
      if (includeModuleBudgets) optionsArray.push('budgets-modules');
      if (includeSavings) optionsArray.push('épargne');
      if (includeTravelGoals) optionsArray.push('voyages');
      if (includeAccounts) optionsArray.push('comptes');
      if (includeAbonnements) optionsArray.push('abonnements');
      if (includeCharts) optionsArray.push('graphiques');
      if (includeChartPie) optionsArray.push('camembert');
      if (includeChartLine) optionsArray.push('courbe-evolution');
      if (includeChartModule) optionsArray.push('module-graph');
      if (includeChartMember) optionsArray.push('membre-graph');
      if (includeVoiceTxs) optionsArray.push('vocal-txs');
      if (includeImportedTxs) optionsArray.push('imported-txs');
      if (includeReceipts) optionsArray.push('recus');
      if (includeHistory) optionsArray.push('historique');
      const optionsString = optionsArray.join(', ');

      if (format === 'json') {
        const exportData: any = {};
        if (includeSummary) {
          exportData.summary = {
            foyerId,
            period,
            start_date: formattedStartStr,
            end_date: formattedEndStr,
            total_income: totalIncome,
            total_expense: totalExpense,
            net_balance: netBalance,
            total_savings: savingsTotal
          };
        }
        if (includeIncome) exportData.incomes = incomeTxs;
        if (includeExpenses) exportData.expenses = expenseTxs;
        if (includeTransactions) exportData.all_transactions = filteredTxs;
        if (includeSavings) exportData.saving_goals = savingGoals;
        if (includeTravelGoals) exportData.trips = trips;
        if (includeAbonnements) exportData.abonnements = abonnements;
        if (includeAccounts) exportData.accounts = accounts;
        if (includeCategories) exportData.custom_categories = customCategories;
        if (includeModuleBudgets) exportData.module_budgets = moduleBudgets;

        textContent = JSON.stringify(exportData, null, 2);
        fileBlob = new Blob([textContent], { type: 'application/json;charset=utf-8;' });
      } 
      else if (format === 'txt') {
        textContent = `====================================================\n`;
        textContent += `RAPPORT BUDGÉTAIRE - MAFAMILLE+\n`;
        textContent += `====================================================\n`;
        textContent += `Période : Du ${formattedStartStr} au ${formattedEndStr}\n`;
        textContent += `Généré le : ${new Date().toLocaleString()}\n`;
        textContent += `Généré par : ${myMemberProfile?.displayName || 'Membre'}\n\n`;

        if (includeSummary) {
          textContent += `1. RÉSUMÉ GLOBAL\n`;
          textContent += `----------------------------------------------------\n`;
          textContent += `- Revenus totaux   : ${totalIncome.toFixed(2)} ${currencySymbol}\n`;
          textContent += `- Dépenses totales : ${totalExpense.toFixed(2)} ${currencySymbol}\n`;
          textContent += `- Solde net        : ${netBalance.toFixed(2)} ${currencySymbol}\n`;
          textContent += `- Épargne totale   : ${savingsTotal.toFixed(2)} ${currencySymbol}\n\n`;
        }

        if (includeIncome && incomeTxs.length > 0) {
          textContent += `2. REVENUS DÉTAILLÉS\n`;
          textContent += `----------------------------------------------------\n`;
          incomeTxs.forEach(t => {
            textContent += `[${t.date}] ${t.title} : +${t.amount.toFixed(2)} ${currencySymbol} (Catégorie: ${t.category} | Créé par: ${t.createdBy || 'N/A'})\n`;
          });
          textContent += `\n`;
        }

        if (includeExpenses && expenseTxs.length > 0) {
          textContent += `3. DÉPENSES DÉTAILLÉES\n`;
          textContent += `----------------------------------------------------\n`;
          expenseTxs.forEach(t => {
            const timestampPart = includeTimestamp && t.entryTime ? ` à ${t.entryTime}` : '';
            textContent += `[${t.date}${timestampPart}] ${t.title} : -${t.amount.toFixed(2)} ${currencySymbol} (Catégorie: ${t.category} - ${t.subCategory || 'Divers'} | Créé par: ${t.createdBy || 'N/A'})\n`;
          });
          textContent += `\n`;
        }

        if (includeAbonnements && abonnements.length > 0) {
          textContent += `4. ABONNEMENTS ACTIFS\n`;
          textContent += `----------------------------------------------------\n`;
          abonnements.forEach(a => {
            textContent += `- ${a.name} : ${a.amount.toFixed(2)} ${currencySymbol}/mois (Prochain : ${a.nextBillingDate || 'N/A'})\n`;
          });
          textContent += `\n`;
        }

        fileBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      }
      else if (format === 'csv') {
        // Individual CSV based on csvTarget option
        let csvContent = '';
        if (csvTarget === 'expenses') {
          csvContent = 'Date,Titre,Montant,Categorie,Sous-categorie,Compte,Auteur,Saisie_Le,Heure_Saisie,Source\n';
          expenseTxs.forEach(t => {
            csvContent += `${t.date},"${t.title.replace(/"/g, '""')}",${t.amount},"${t.category}","${t.subCategory || ''}","${t.accountId || ''}","${t.createdBy || ''}","${t.entryDate || ''}","${t.entryTime || ''}","${t.source_module || ''}"\n`;
          });
        } else if (csvTarget === 'incomes') {
          csvContent = 'Date,Titre,Montant,Categorie,Compte,Auteur,Saisie_Le,Heure_Saisie,Source\n';
          incomeTxs.forEach(t => {
            csvContent += `${t.date},"${t.title.replace(/"/g, '""')}",${t.amount},"${t.category}","${t.accountId || ''}","${t.createdBy || ''}","${t.entryDate || ''}","${t.entryTime || ''}","${t.source_module || ''}"\n`;
          });
        } else if (csvTarget === 'savings') {
          csvContent = 'Cagnotte,Cible,Montant_Actuel,Categorie,Pourcentage\n';
          savingGoals.forEach(g => {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
            csvContent += `"${g.title.replace(/"/g, '""')}",${g.targetAmount},${g.currentAmount},"${g.category}",${pct}%\n`;
          });
        } else if (csvTarget === 'abonnements') {
          csvContent = 'Abonnement,Montant,Periode,Categorie,Prochain_Prelevement\n';
          abonnements.forEach(a => {
            csvContent += `"${a.name.replace(/"/g, '""')}",${a.amount},"${a.period}","${a.category || ''}","${a.nextBillingDate || ''}"\n`;
          });
        } else {
          // transactions
          csvContent = 'Date,Titre,Montant,Type,Categorie,Sous-categorie,Compte,Auteur,Saisie_Le,Heure_Saisie,Source\n';
          filteredTxs.forEach(t => {
            csvContent += `${t.date},"${t.title.replace(/"/g, '""')}",${t.amount},${t.type},"${t.category}","${t.subCategory || ''}","${t.accountId || ''}","${t.createdBy || ''}","${t.entryDate || ''}","${t.entryTime || ''}","${t.source_module || ''}"\n`;
          });
        }

        fileBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      }
      else if (format === 'excel') {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();

        // Helper to format worksheets: autofilters and auto-widths
        const formatSheet = (ws: WorkSheet, colsCount: number, rowsCount: number) => {
          if (rowsCount > 0) {
            const colLetter = String.fromCharCode(65 + colsCount - 1);
            ws['!autofilter'] = { ref: `A1:${colLetter}${rowsCount + 1}` };
          }
          const colWidths = [];
          for (let i = 0; i < colsCount; i++) {
            colWidths.push({ wch: 18 });
          }
          ws['!cols'] = colWidths;
        };

        if (includeSummary) {
          const summaryData = [
            { Métrique: 'Revenus Totaux', Valeur: `${totalIncome.toFixed(2)} ${currencySymbol}` },
            { Métrique: 'Dépenses Totales', Valeur: `${totalExpense.toFixed(2)} ${currencySymbol}` },
            { Métrique: 'Solde Net', Valeur: `${netBalance.toFixed(2)} ${currencySymbol}` },
            { Métrique: 'Épargne Totale', Valeur: `${savingsTotal.toFixed(2)} ${currencySymbol}` }
          ];
          const ws = XLSX.utils.json_to_sheet(summaryData);
          formatSheet(ws, 2, summaryData.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Résumé');
        }

        if (includeIncome && incomeTxs.length > 0) {
          const data = incomeTxs.map(t => ({
            Date: t.date,
            Libellé: t.title,
            Montant: `${t.amount.toFixed(2)} ${currencySymbol}`,
            Catégorie: t.category,
            Compte: accounts.find(a => a.id === t.accountId)?.name || 'N/A',
            Auteur: t.createdBy || 'N/A',
            'Saisi Le': t.entryDate || '',
            'Heure Saisie': t.entryTime || '',
            Source: t.source_module || ''
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 9, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Revenus');
        }

        if (includeExpenses && expenseTxs.length > 0) {
          const data = expenseTxs.map(t => ({
            Date: t.date,
            Libellé: t.title,
            Montant: `${t.amount.toFixed(2)} ${currencySymbol}`,
            Catégorie: t.category,
            'Sous-catégorie': t.subCategory || '',
            Compte: accounts.find(a => a.id === t.accountId)?.name || 'N/A',
            Auteur: t.createdBy || 'N/A',
            Justificatif: (t.receiptUrl || t.attachmentUrl || t.receiptBase64 || t.attachmentBase64) ? 'Oui' : 'Non',
            'Saisi Le': t.entryDate || '',
            'Heure Saisie': t.entryTime || '',
            Source: t.source_module || ''
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 11, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Dépenses');
        }

        if (includeTransactions && filteredTxs.length > 0) {
          const data = filteredTxs.map(t => ({
            Date: t.date,
            Libellé: t.title,
            Montant: `${t.type === 'expense' ? '-' : '+'}${t.amount.toFixed(2)} ${currencySymbol}`,
            Type: t.type === 'income' ? 'Revenu' : t.type === 'savings' ? 'Épargne' : 'Dépense',
            Catégorie: t.category,
            'Sous-catégorie': t.subCategory || '',
            Compte: accounts.find(a => a.id === t.accountId)?.name || 'N/A',
            Auteur: t.createdBy || 'N/A',
            Justificatif: (t.receiptUrl || t.attachmentUrl || t.receiptBase64 || t.attachmentBase64) ? 'Oui' : 'Non',
            'Saisi Le': t.entryDate || '',
            'Heure Saisie': t.entryTime || '',
            Source: t.source_module || ''
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 12, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        }

        if (includeCategories && customCategories.length > 0) {
          const data = customCategories.map(c => ({
            Catégorie: c.name,
            'Budget Mensuel': `${(c.budget || 0).toFixed(2)} ${currencySymbol}`,
            Souscategories: (c.subcategories || []).join(', ')
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 3, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Catégories');
        }

        if (includeModuleBudgets) {
          const data = Object.keys(moduleBudgets).map(k => ({
            Module: k.toUpperCase(),
            'Budget Prévu': `${moduleBudgets[k].toFixed(2)} ${currencySymbol}`,
            'Dépenses Réelles': `${(moduleDépenses[k] || 0).toFixed(2)} ${currencySymbol}`,
            'Reste Disponible': `${Math.max(0, moduleBudgets[k] - (moduleDépenses[k] || 0)).toFixed(2)} ${currencySymbol}`
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 4, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Budgets par module');
        }

        if ((includeSavings && savingGoals.length > 0) || (includeTravelGoals && trips.length > 0)) {
          const epargneList = includeSavings ? savingGoals.map(g => ({
            Type: 'Épargne',
            Intitulé: g.title,
            'Cible / Budget': `${g.targetAmount.toFixed(2)} ${currencySymbol}`,
            'Actuel / Dépensé': `${g.currentAmount.toFixed(2)} ${currencySymbol}`,
            'Date Cible / Fin': g.targetDate || 'N/A',
            'Complété / Reste': `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`
          })) : [];

          const voyageList = includeTravelGoals ? trips.map(t => {
            const tripExpenses = filteredTxs.filter(tx => 
              tx.type === 'expense' && 
              (tx.travelId === t.id || tx.travel_id === t.id || (tx.moduleSource === 'voyages' && tx.title.includes(t.destination)))
            );
            const spent = tripExpenses.reduce((sum, tx) => sum + tx.amount, 0);
            return {
              Type: 'Voyage',
              Intitulé: t.destination,
              'Cible / Budget': `${t.budget.toFixed(2)} ${currencySymbol}`,
              'Actuel / Dépensé': `${spent.toFixed(2)} ${currencySymbol}`,
              'Date Cible / Fin': `${t.startDate} au ${t.endDate}`,
              'Complété / Reste': `${(t.budget - spent).toFixed(2)} ${currencySymbol} restants`
            };
          }) : [];

          const data = [...epargneList, ...voyageList];
          if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);
            formatSheet(ws, 6, data.length);
            XLSX.utils.book_append_sheet(wb, ws, 'Objectifs');
          }
        }

        if (includeAccounts && accounts.length > 0) {
          const data = accounts.map(a => ({
            Compte: a.name,
            Type: a.type === 'bank' ? 'Bancaire' : a.type === 'savings' ? 'Épargne' : 'Espèces',
            Solde: `${a.balance.toFixed(2)} ${currencySymbol}`
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 3, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Comptes');
        }

        if (includeAbonnements && abonnements.length > 0) {
          const data = abonnements.map(a => ({
            Abonnement: a.name,
            Montant: `${a.amount.toFixed(2)} ${currencySymbol}`,
            Période: a.period === 'monthly' ? 'Mensuel' : 'Annuel',
            Catégorie: a.category || '',
            'Prochain Prélèvement': a.nextBillingDate || ''
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 5, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Abonnements');
        }

        if (includeCharts) {
          // Category summary
          const catSum = Object.keys(expenseByCat).map(c => ({
            'Axe d\'Analyse': `Catégorie : ${c}`,
            Dépenses: `${expenseByCat[c].toFixed(2)} ${currencySymbol}`
          }));

          // Module summary
          const modSum = Object.keys(moduleExpenses).map(m => ({
            'Axe d\'Analyse': `Module : ${m.toUpperCase()}`,
            Dépenses: `${moduleExpenses[m].toFixed(2)} ${currencySymbol}`
          }));

          // Member summary
          const memSum = Object.keys(memberExpenses).map(mem => ({
            'Axe d\'Analyse': `Membre : ${mem}`,
            Dépenses: `${memberExpenses[mem].toFixed(2)} ${currencySymbol}`
          }));

          const chartData = [
            ...catSum,
            { 'Axe d\'Analyse': '--------------------------------', Dépenses: '' },
            ...modSum,
            { 'Axe d\'Analyse': '--------------------------------', Dépenses: '' },
            ...memSum
          ];
          const ws = XLSX.utils.json_to_sheet(chartData);
          formatSheet(ws, 2, chartData.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Données Graphiques');
        }

        if (includeImports && importsHistory.length > 0) {
          const data = importsHistory.map(h => ({
            Fichier: h.filename,
            ImportéPar: h.member_name || 'N/A',
            Date: new Date(h.created_at).toLocaleDateString('fr-FR') + ' ' + new Date(h.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
            'Transactions Ajoutées': (h.added_transaction_ids || []).length,
            'Doublons Ignorés': h.ignored_count || 0
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          formatSheet(ws, 5, data.length);
          XLSX.utils.book_append_sheet(wb, ws, 'Imports');
        }

        if (includeHistory) {
          const data: any[] = [];
          filteredTxs.forEach(t => {
            if (t.modificationHistory && t.modificationHistory.length > 0) {
              t.modificationHistory.forEach(h => {
                data.push({
                  'Transaction ID': t.id,
                  Transaction: t.title,
                  Auteur: h.author,
                  Date: h.date,
                  Action: h.action
                });
              });
            }
          });
          if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);
            formatSheet(ws, 5, data.length);
            XLSX.utils.book_append_sheet(wb, ws, 'Historique');
          }
        }

        // Generate binary and build Blob
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        fileBlob = new Blob([wbout], { type: 'application/octet-stream' });
      }
      else if (format === 'pdf') {
        const [{ jsPDF }, autoTableModule] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable')
        ]);
        const autoTable = autoTableModule.default;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. COVER PAGE
        doc.setFillColor(7, 17, 31); // Dark background #07111F
        doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

        // Cover styling borders
        doc.setDrawColor(108, 92, 255);
        doc.setLineWidth(1.5);
        doc.line(20, 20, pageWidth - 20, 20);
        doc.line(20, doc.internal.pageSize.getHeight() - 20, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(32);
        doc.text("MyFamily+", pageWidth / 2, 70, { align: 'center' });

        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 160, 180);
        doc.text("RAPPORT BUDGETAIRE PREMIUM", pageWidth / 2, 85, { align: 'center' });

        // Metadata box
        doc.setFillColor(255, 255, 255, 0.03);
        doc.rect(30, 110, pageWidth - 60, 90, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Foyer : ${myMemberProfile?.foyerName || 'Foyer MyFamily+'}`, 40, 130);
        doc.text(`Générateur : ${myMemberProfile?.displayName || 'Parent'}`, 40, 145);
        doc.text(`Période : Du ${formattedStartStr} au ${formattedEndStr}`, 40, 160);
        doc.text(`Date d'export : ${new Date().toLocaleDateString()}`, 40, 175);
        doc.text(`Options incluses : ${optionsString.length > 30 ? optionsString.substring(0, 30) + '...' : optionsString}`, 40, 190);

        // Footer cover
        doc.setFontSize(9);
        doc.setTextColor(100, 110, 130);
        doc.text("Généré de manière sécurisée par l'OS familial MyFamily+", pageWidth / 2, 260, { align: 'center' });

        // 2. SUMMARY PAGE
        doc.addPage();
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text("1. Synthèse Budgétaire", 15, 25);

        // Summary Cards
        const cardWidth = (pageWidth - 40) / 2;
        
        doc.setFillColor(240, 253, 244);
        doc.rect(15, 35, cardWidth, 30, 'F');
        doc.setTextColor(22, 101, 52);
        doc.setFontSize(10);
        doc.text("REVENUS TOTAL", 20, 45);
        doc.setFontSize(14);
        doc.text(`+${totalIncome.toFixed(2)} ${currencySymbol}`, 20, 57);

        doc.setFillColor(254, 242, 242);
        doc.rect(15 + cardWidth + 10, 35, cardWidth, 30, 'F');
        doc.setTextColor(153, 27, 27);
        doc.setFontSize(10);
        doc.text("DÉPENSES TOTAL", 20 + cardWidth + 10, 45);
        doc.setFontSize(14);
        doc.text(`-${totalExpense.toFixed(2)} ${currencySymbol}`, 20 + cardWidth + 10, 57);

        doc.setFillColor(243, 244, 246);
        doc.rect(15, 75, cardWidth, 30, 'F');
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(10);
        doc.text("SOLDE NET DE LA PÉRIODE", 20, 85);
        doc.setFontSize(14);
        doc.text(`${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)} ${currencySymbol}`, 20, 97);

        doc.setFillColor(239, 246, 255);
        doc.rect(15 + cardWidth + 10, 75, cardWidth, 30, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(10);
        doc.text("ÉPARGNE ACQUISE", 20 + cardWidth + 10, 85);
        doc.setFontSize(14);
        doc.text(`${savingsTotal.toFixed(2)} ${currencySymbol}`, 20 + cardWidth + 10, 97);

        // Vector Charts in PDF!
        if (includeCharts) {
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(14);
          doc.text("2. Analyses Graphiques", 15, 125);

          // 2.1 Camembert des Dépenses par Catégorie
          if (includeChartPie) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text("2.1 Dépenses par Catégorie (Camembert)", 15, 135);

            const catArray = Object.keys(expenseByCat).map(k => ({
              name: k,
              amount: expenseByCat[k]
            })).sort((a,b) => b.amount - a.amount);

            const totalExp = catArray.reduce((sum, c) => sum + c.amount, 0);

            const ctx = (doc as any).context2d || (doc as any).canvas?.getContext('2d');
            if (ctx && totalExp > 0) {
              const centerX = 50;
              const centerY = 175;
              const radius = 25;
              let startAngle = -Math.PI / 2;

              const palette = ['#6C5CFF', '#4F8CFF', '#10B981', '#EF4444', '#F59E0B', '#EC4899', '#8B5CF6'];

              catArray.forEach((c, idx) => {
                const sliceAngle = (c.amount / totalExp) * 2 * Math.PI;
                ctx.fillStyle = palette[idx % palette.length];
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
                ctx.closePath();
                ctx.fill();
                startAngle += sliceAngle;
              });

              // Donut hole
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
              ctx.closePath();
              ctx.fill();

              // Legend
              doc.setFontSize(7.5);
              catArray.slice(0, 5).forEach((c, idx) => {
                const lx = 90;
                const ly = 150 + idx * 10;
                doc.setFillColor(palette[idx % palette.length]);
                doc.rect(lx, ly - 2.5, 3.5, 3.5, 'F');
                doc.setTextColor(50, 50, 50);
                doc.setFont('helvetica', 'normal');
                doc.text(`${c.name} : ${c.amount.toFixed(2)} ${currencySymbol} (${Math.round(c.amount / totalExp * 100)}%)`, lx + 6, ly + 0.5);
              });
            } else {
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(120, 120, 120);
              doc.text("Aucune dépense enregistrée pour le camembert.", 20, 160);
            }
          }

          // 2.2 Courbe Évolution (Revenus vs Dépenses vs Épargne)
          if (includeChartLine) {
            const chartX = 110;
            const chartY = 150;
            const chartW = 85;
            const chartH = 40;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text("2.2 Courbe d'Évolution (Période)", chartX, 135);

            // Generate 5 intervals
            const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
            const interval = diffTime > 0 ? diffTime / 4 : 86400000;

            const points: { label: string; income: number; expense: number; savings: number }[] = [];
            for (let k = 0; k < 5; k++) {
              const pDate = new Date(periodStart.getTime() + k * interval);
              const pStr = pDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

              const iStart = new Date(periodStart.getTime() + (k - 0.5) * interval);
              const iEnd = new Date(periodStart.getTime() + (k + 0.5) * interval);

              const iTxs = filteredTxs.filter(t => {
                const d = new Date(t.date);
                return d >= iStart && d <= iEnd;
              });

              const inc = iTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
              const exp = iTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

              const sav = savingGoals.reduce((sum, g) => {
                const contribs = (g.contributions || []).filter(c => {
                  const cd = new Date(c.date);
                  return cd >= iStart && cd <= iEnd;
                }).reduce((s, c) => s + c.amount, 0);
                return sum + contribs;
              }, 0);

              points.push({ label: pStr, income: inc, expense: exp, savings: sav });
            }

            // Draw axes
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH); // X
            doc.line(chartX, chartY, chartX, chartY + chartH); // Y

            // Draw grid lines
            doc.setDrawColor(240, 240, 240);
            doc.line(chartX, chartY + chartH / 2, chartX + chartW, chartY + chartH / 2);
            doc.line(chartX, chartY, chartX + chartW, chartY);

            const maxVal = Math.max(10, ...points.map(p => Math.max(p.income, p.expense, p.savings)));

            // Draw lines
            const drawTrendLine = (type: 'income' | 'expense' | 'savings', r: number, g: number, b: number) => {
              doc.setDrawColor(r, g, b);
              doc.setLineWidth(1.2);
              let prevX = 0;
              let prevY = 0;

              points.forEach((p, idx) => {
                const px = chartX + (idx * (chartW / 4));
                const val = type === 'income' ? p.income : type === 'expense' ? p.expense : p.savings;
                const py = chartY + chartH - (val / maxVal * chartH);

                doc.setFillColor(r, g, b);
                doc.circle(px, py, 1.2, 'F');

                if (idx > 0) {
                  doc.line(prevX, prevY, px, py);
                }
                prevX = px;
                prevY = py;
              });
            };

            drawTrendLine('income', 16, 185, 129); // Green
            drawTrendLine('expense', 239, 68, 68); // Red
            drawTrendLine('savings', 79, 140, 255); // Blue

            // Chart labels
            doc.setFontSize(6);
            doc.setTextColor(120, 120, 120);
            doc.text(`Max: ${maxVal.toFixed(0)} €`, chartX - 12, chartY + 2);
            doc.text(`0 €`, chartX - 6, chartY + chartH + 2);

            points.forEach((p, idx) => {
              doc.text(p.label, chartX + (idx * (chartW / 4)) - 4, chartY + chartH + 5);
            });

            // Legend
            doc.setFontSize(6.5);
            doc.setFillColor(16, 185, 129); doc.rect(chartX, chartY + chartH + 9, 3, 3, 'F');
            doc.setTextColor(30, 41, 59); doc.text("Revenus", chartX + 4.5, chartY + chartH + 11.5);

            doc.setFillColor(239, 68, 68); doc.rect(chartX + 22, chartY + chartH + 9, 3, 3, 'F');
            doc.text("Dépenses", chartX + 26.5, chartY + chartH + 11.5);

            doc.setFillColor(79, 140, 255); doc.rect(chartX + 45, chartY + chartH + 9, 3, 3, 'F');
            doc.text("Épargne", chartX + 49.5, chartY + chartH + 11.5);
          }
        }

        // 2.3 Analyses Graphiques (Suite) - Page 3
        if (includeCharts && (includeChartModule || includeChartMember)) {
          doc.addPage();
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.text("2. Analyses Graphiques (Suite)", 15, 25);

          let nextChartY = 40;

          if (includeChartModule) {
            doc.setFontSize(11);
            doc.text("2.3 Dépenses Réelles par Module Source", 15, nextChartY);

            const modArray = Object.keys(moduleExpenses).map(k => ({
              name: k.toUpperCase(),
              amount: moduleExpenses[k]
            })).sort((a, b) => b.amount - a.amount);

            if (modArray.length > 0) {
              const maxModVal = Math.max(...modArray.map(m => m.amount));
              modArray.slice(0, 5).forEach((m, idx) => {
                const barY = nextChartY + 10 + idx * 10;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(50, 50, 50);
                doc.text(m.name, 15, barY + 5);

                const barWidth = 100;
                const ratio = m.amount / maxModVal;
                doc.setFillColor(235, 235, 245);
                doc.rect(50, barY, barWidth, 6, 'F');
                doc.setFillColor(79, 140, 255);
                doc.rect(50, barY, barWidth * ratio, 6, 'F');

                doc.setFont('helvetica', 'normal');
                doc.text(`${m.amount.toFixed(2)} ${currencySymbol}`, 160, barY + 5);
              });
              nextChartY += 70;
            } else {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(9);
              doc.setTextColor(120, 120, 120);
              doc.text("Aucune dépense enregistrée par module.", 15, nextChartY + 10);
              nextChartY += 25;
            }
          }

          if (includeChartMember) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text("2.4 Dépenses Réelles par Membre du Foyer", 15, nextChartY);

            const memArray = Object.keys(memberExpenses).map(k => ({
              name: k,
              amount: memberExpenses[k]
            })).sort((a, b) => b.amount - a.amount);

            if (memArray.length > 0) {
              const maxMemVal = Math.max(...memArray.map(m => m.amount));
              memArray.slice(0, 5).forEach((m, idx) => {
                const barY = nextChartY + 10 + idx * 10;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(50, 50, 50);
                doc.text(m.name, 15, barY + 5);

                const barWidth = 100;
                const ratio = m.amount / maxMemVal;
                doc.setFillColor(235, 235, 245);
                doc.rect(50, barY, barWidth, 6, 'F');
                doc.setFillColor(16, 185, 129);
                doc.rect(50, barY, barWidth * ratio, 6, 'F');

                doc.setFont('helvetica', 'normal');
                doc.text(`${m.amount.toFixed(2)} ${currencySymbol}`, 160, barY + 5);
              });
            } else {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(9);
              doc.setTextColor(120, 120, 120);
              doc.text("Aucune dépense enregistrée par membre.", 15, nextChartY + 10);
            }
          }
        }

        // 3. INCOME DETAILED LIST TABLE
        if (includeIncome && incomeTxs.length > 0) {
          doc.addPage();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text("3. Liste Détaillée des Revenus", 15, 25);

          autoTable(doc, {
            startY: 32,
            head: [['Date', 'Description', 'Montant', 'Catégorie', 'Auteur', 'Source']],
            body: incomeTxs.map(t => [t.date, t.title, `+${t.amount.toFixed(2)} ${currencySymbol}`, t.category, t.createdBy || '', t.source_module || 'Manuel']),
            headStyles: { fillColor: [7, 17, 31] },
            alternateRowStyles: { fillColor: [248, 250, 252] }
          });
        }

        // 4. EXPENSE DETAILED LIST TABLE
        if (includeExpenses && expenseTxs.length > 0) {
          doc.addPage();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text("4. Liste Détaillée des Dépenses", 15, 25);

          autoTable(doc, {
            startY: 32,
            head: [['Date', 'Description', 'Montant', 'Catégorie', 'Auteur', 'Date Saisie', 'Heure', 'Source']],
            body: expenseTxs.map(t => [
              t.date, 
              t.title, 
              `-${t.amount.toFixed(2)} ${currencySymbol}`, 
              t.category, 
              t.createdBy || '', 
              t.entryDate || t.date,
              t.entryTime || '',
              t.source_module || 'Manuel'
            ]),
            headStyles: { fillColor: [153, 27, 27] },
            alternateRowStyles: { fillColor: [255, 242, 242] }
          });
        }

        // 5. RECURRING ABONNEMENTS TABLE
        if (includeAbonnements && abonnements.length > 0) {
          doc.addPage();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text("5. Abonnements et Factures Récurrentes", 15, 25);

          autoTable(doc, {
            startY: 32,
            head: [['Abonnement', 'Montant', 'Périodicité', 'Catégorie', 'Prochain Prélèvement']],
            body: abonnements.map(a => [a.name, `${a.amount.toFixed(2)} ${currencySymbol}`, a.period === 'monthly' ? 'Mensuel' : 'Annuel', a.category || '', a.nextBillingDate || '']),
            headStyles: { fillColor: [30, 58, 138] }
          });
        }

        // 6. HISTORY TABLE
        if (includeHistory) {
          const historyRows: any[] = [];
          filteredTxs.forEach(t => {
            if (t.modificationHistory && t.modificationHistory.length > 0) {
              t.modificationHistory.forEach(h => {
                historyRows.push([t.title, h.author, h.date, h.action]);
              });
            }
          });

          if (historyRows.length > 0) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text("6. Historique de Modification des Transactions", 15, 25);

            autoTable(doc, {
              startY: 32,
              head: [['Transaction', 'Auteur', 'Date/Heure', 'Détails de l\'action']],
              body: historyRows,
              headStyles: { fillColor: [108, 92, 255] }
            });
          }
        }

        // 7. ANNEXE REÇUS
        if (includeReceipts) {
          const receiptsTxs = filteredTxs.filter(t => t.receiptUrl || t.attachmentUrl || t.receiptBase64 || t.attachmentBase64);
          if (receiptsTxs.length > 0) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text("7. Justificatifs & Pièces Jointes", 15, 25);

            let receiptY = 35;
            for (const [idx, tx] of receiptsTxs.entries()) {
              const base64Data = await resolveImagePayload(tx.receiptUrl || tx.attachmentUrl || tx.receiptBase64 || tx.attachmentBase64);
              if (base64Data) {
                let imgFormat = 'JPEG';
                if (base64Data.includes('png')) imgFormat = 'PNG';
                const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

                if (receiptY > 210) {
                  doc.addPage();
                  receiptY = 25;
                }

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(`Reçu #${idx + 1} - ${tx.title} (${tx.amount.toFixed(2)} ${currencySymbol})`, 15, receiptY);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text(`Date : ${tx.date} | Saisi par : ${tx.createdBy || 'Parent'}`, 15, receiptY + 4);

                try {
                  doc.addImage(cleanBase64, imgFormat, 15, receiptY + 7, 50, 38);
                } catch (e) {
                  console.warn("Unable to add receipt image to PDF:", e);
                  doc.rect(15, receiptY + 7, 50, 38);
                  doc.text("Image non lisible / format incompatible", 18, receiptY + 26);
                }
                receiptY += 52;
              }
            }
          }
        }

        // Add page numbers
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let j = 2; j <= totalPages; j++) {
          doc.setPage(j);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${j} sur ${totalPages}`, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
          doc.text(`MyFamily+ Budget Export - ${new Date().toLocaleDateString()}`, 15, doc.internal.pageSize.getHeight() - 10);
        }

        fileBlob = doc.output('blob');
      }

      if (!fileBlob) throw new Error("Erreur de génération du fichier.");

      // SAVE TO CLOUD (SUPABASE STORAGE & HISTORY)
      let storagePath: string | null = null;
      const supabase = getSupabaseClient();
      
      if (saveCloud && supabase) {
        const fileExt = format === 'excel' ? 'xlsx' : format;
        const cloudPath = `exports/${foyerId}/${Date.now()}_export.${fileExt}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('finance-exports')
          .upload(cloudPath, fileBlob, { contentType: fileBlob.type, cacheControl: '3600' });

        if (!uploadErr) {
          storagePath = cloudPath;
        }

        const { data: { user } } = await supabase.auth.getUser();

        // Log entry in export history
        await supabase.from('exports_history').insert({
          id: crypto.randomUUID(),
          foyer_id: foyerId,
          user_id: user ? user.id : null,
          member_name: myMemberProfile?.displayName || myMemberProfile?.name || 'Parent',
          format,
          period_type: period,
          start_date: formattedStartStr,
          end_date: formattedEndStr,
          file_path: storagePath,
          options_included: optionsString
        });

        loadExportHistory();
      }

      // DOWNLOAD
      const fileUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileUrl);

      setSuccess(true);
    } catch (err: any) {
      console.error('Error generating export:', err);
      setErrorMsg(`Impossible de générer le fichier : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFromHistory = async (item: HistoryItem) => {
    const supabase = getSupabaseClient();
    if (!supabase || !item.file_path) {
      alert("Fichier non disponible sur le cloud.");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('finance-exports')
        .download(item.file_path);

      if (error) throw error;
      
      const fileUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `Export_Budget_Historique_${item.start_date}_to_${item.end_date}.${item.format === 'excel' ? 'xlsx' : item.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileUrl);
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  // If role is not allowed, block interface completely
  if (!isAllowedToExport) {
    return (
      <>
        <div onClick={onClose} className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 transition-opacity" />
        <div className="fixed bottom-0 left-0 right-0 top-0 md:top-20 md:bottom-20 max-w-md mx-auto glass-panel border border-white/10 z-50 rounded-[32px] p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full animate-shake">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Accès Refusé</h3>
          <p className="text-xs text-white/50 leading-relaxed">
            Seuls les parents, le propriétaire du foyer et les gestionnaires ont la permission d'exporter les données financières du budget familial. Les enfants et ados n'ont pas accès à ce module.
          </p>
          <button onClick={onClose} className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
            Fermer
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-45 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div 
        className={`fixed bottom-0 left-0 right-0 top-0 md:top-10 md:bottom-10 max-h-[92vh] md:max-w-4xl mx-auto glass-panel border-t md:border border-white/10 z-50 rounded-t-[32px] md:rounded-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.6)] flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] transition-all duration-300 ease-out transform overflow-hidden ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#6C5CFF]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Exports financiers</h2>
              <p className="text-xs text-white/50">Préparez un fichier clair pour votre foyer</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-200 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span>Export généré et enregistré.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Options Panel */}
            <div className="space-y-6">
              
              {/* 1. Format Select */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">1. Choisir le format d'export</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pdf', name: 'PDF complet', icon: FileText, desc: 'Rapport familial' },
                    { id: 'excel', name: 'Excel .xlsx', icon: FileSpreadsheet, desc: 'Multi-feuilles' },
                    { id: 'csv', name: 'Fichier CSV', icon: Database, desc: 'Tableur simple' },
                    { id: 'json', name: 'JSON', icon: FileJson, desc: 'Sauvegarde structurée' },
                    { id: 'txt', name: 'Texte simple', icon: FileText, desc: 'Résumé lisible' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id as ExportFormat)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer ${
                        format === f.id 
                          ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-[0_0_12px_rgba(108,92,255,0.15)]' 
                          : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <f.icon className="w-5 h-5 text-[#6C5CFF]" />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider">{f.name}</div>
                        <div className="text-[9px] opacity-65 leading-none">{f.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CSV sub-choice */}
              {format === 'csv' && (
                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Type de CSV à télécharger</span>
                  <select 
                    value={csvTarget}
                    onChange={(e) => setCsvTarget(e.target.value as any)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="transactions">Toutes les transactions</option>
                    <option value="expenses">Dépenses réelles uniquement</option>
                    <option value="incomes">Revenus uniquement</option>
                    <option value="savings">Épargne & Cagnottes</option>
                    <option value="abonnements">Abonnements mensuels</option>
                  </select>
                </div>
              )}

              {/* 2. Period Selection */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">2. Choisir la période</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ExportPeriod)}
                  className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all text-xs"
                >
                  <option value="today">Aujourd'hui</option>
                  <option value="this_week">Cette semaine</option>
                  <option value="this_month">Ce mois-ci</option>
                  <option value="last_month">Le mois dernier</option>
                  <option value="this_quarter">Ce trimestre</option>
                  <option value="this_year">Cette année</option>
                  <option value="last_year">Année précédente</option>
                  <option value="custom">Période personnalisée</option>
                </select>

                {period === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase">Date de début</span>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/8 text-white rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-white/40 uppercase">Date de fin</span>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/8 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Data to include */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest block">3. Options de données</span>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                  
                  {/* Group 1: Données principales */}
                  <div className="p-3 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block">Sections à inclure</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Résumé Global', val: includeSummary, set: setIncludeSummary },
                        { label: 'Revenus', val: includeIncome, set: setIncludeIncome },
                        { label: 'Dépenses', val: includeExpenses, set: setIncludeExpenses },
                        { label: 'Toutes les Transactions', val: includeTransactions, set: setIncludeTransactions },
                        { label: 'Catégories', val: includeCategories, set: setIncludeCategories },
                        { label: 'Sous-catégories', val: includeSubCategories, set: setIncludeSubCategories },
                        { label: 'Budgets par module', val: includeModuleBudgets, set: setIncludeModuleBudgets },
                        { label: 'Objectifs Épargne', val: includeSavings, set: setIncludeSavings },
                        { label: 'Objectifs Voyage', val: includeTravelGoals, set: setIncludeTravelGoals },
                        { label: 'Soldes des Comptes', val: includeAccounts, set: setIncludeAccounts },
                        { label: 'Abonnements', val: includeAbonnements, set: setIncludeAbonnements },
                        { label: 'Historique des Imports', val: includeImports, set: setIncludeImports },
                        { label: 'Historique d\'Audit', val: includeHistory, set: setIncludeHistory }
                      ].map((chk, i) => (
                        <label key={i} className="flex items-center space-x-2 cursor-pointer select-none text-white/70 hover:text-white">
                          <input 
                            type="checkbox"
                            checked={chk.val}
                            onChange={(e) => chk.set(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-white/20 accent-[#6C5CFF]"
                          />
                          <span className="text-[10.5px] font-medium leading-none">{chk.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Group 2: Filtres spécifiques */}
                  <div className="p-3 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-[#4F8CFF] uppercase tracking-widest block">Filtres et Pièces</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Transactions Micro', val: includeVoiceTxs, set: setIncludeVoiceTxs },
                        { label: 'Transactions Importées', val: includeImportedTxs, set: setIncludeImportedTxs },
                        { label: 'Pièces jointes / Reçus', val: includeReceipts, set: setIncludeReceipts },
                        { label: 'Horodatages complets', val: includeTimestamp, set: setIncludeTimestamp }
                      ].map((chk, i) => (
                        <label key={i} className="flex items-center space-x-2 cursor-pointer select-none text-white/70 hover:text-white">
                          <input 
                            type="checkbox"
                            checked={chk.val}
                            onChange={(e) => chk.set(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-white/20 accent-[#4F8CFF]"
                          />
                          <span className="text-[10.5px] font-medium leading-none">{chk.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Group 3: Graphiques */}
                  <div className="p-3 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest">Analyses Graphiques</span>
                      <label className="flex items-center space-x-1 cursor-pointer select-none text-white/60 hover:text-white text-[10px]">
                        <input 
                          type="checkbox"
                          checked={includeCharts}
                          onChange={(e) => setIncludeCharts(e.target.checked)}
                          className="w-3 h-3 accent-[#10B981]"
                        />
                        <span>Activer</span>
                      </label>
                    </div>
                    {includeCharts && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 animate-fade-in">
                        {[
                          { label: 'Camembert Catégories', val: includeChartPie, set: setIncludeChartPie },
                          { label: 'Courbe Évolution', val: includeChartLine, set: setIncludeChartLine },
                          { label: 'Dépenses par Module', val: includeChartModule, set: setIncludeChartModule },
                          { label: 'Dépenses par Membre', val: includeChartMember, set: setIncludeChartMember }
                        ].map((chk, i) => (
                          <label key={i} className="flex items-center space-x-2 cursor-pointer select-none text-white/70 hover:text-white">
                            <input 
                              type="checkbox"
                              checked={chk.val}
                              onChange={(e) => chk.set(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-white/20 accent-[#10B981]"
                            />
                            <span className="text-[10.5px] font-medium leading-none">{chk.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Preview & History Panel */}
            <div className="space-y-6 flex flex-col justify-between">
              
              {/* Preview block */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#6C5CFF]/10 to-[#4F8CFF]/10 border border-[#6C5CFF]/20 space-y-4">
                <div className="flex items-center space-x-2 text-white">
                  <BarChart3 className="w-4 h-4 text-[#6C5CFF]" />
                  <span className="text-xs font-black uppercase tracking-wider">Aperçu de la Période</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-1 text-white/60">
                    <span>Période ciblée :</span>
                    <span className="font-bold text-white">Du {formattedStartStr} au {formattedEndStr}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1 text-white/60">
                    <span>Nombre de revenus :</span>
                    <span className="font-bold text-white">{includeIncome ? incomeTxs.length : 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1 text-white/60">
                    <span>Nombre de dépenses :</span>
                    <span className="font-bold text-white">{includeExpenses ? expenseTxs.length : 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1 text-white/60">
                    <span>Solde net calculé :</span>
                    <span className={`font-black ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Sauvegarde sécurisée :</span>
                    <span className="font-bold text-white">{saveCloud ? 'Activée' : 'Désactivée'}</span>
                  </div>
                </div>

                <button
                  onClick={handleGenerateExport}
                  disabled={loading}
                  className="w-full py-3.5 bg-[#6C5CFF] hover:bg-[#6C5CFF]/90 disabled:bg-[#6C5CFF]/50 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#6C5CFF]/20 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Génération de l'export...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Générer l'export</span>
                    </>
                  )}
                </button>
              </div>

              {/* Exports History list */}
              <div className="flex-1 flex flex-col space-y-2.5 min-h-[160px] pt-4">
                <div className="flex items-center space-x-2 text-white/60">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Historique des exports du foyer</span>
                </div>

                <div className="flex-1 border border-white/5 rounded-2xl bg-white/3 overflow-y-auto no-scrollbar max-h-[180px] p-2 space-y-2">
                  {historyLoading ? (
                    <div className="h-full flex items-center justify-center text-xs text-white/40">
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Chargement de l'historique...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-white/30 text-center p-4">
                      Aucun export n'a encore été généré.
                    </div>
                  ) : (
                    history.map(item => (
                      <div 
                        key={item.id} 
                        className="p-2.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between text-xs transition-all"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold uppercase text-[9px] text-[#4F8CFF]">{item.format}</span>
                            <span className="text-[9px] text-white/40">le {new Date(item.created_at).toLocaleDateString('fr-FR')} par {item.member_name}</span>
                          </div>
                          <div className="text-[10px] text-white/70">
                            Période : {item.start_date} → {item.end_date}
                          </div>
                          {item.options_included && (
                            <div className="text-[9px] text-white/40 italic truncate max-w-[220px]" title={item.options_included}>
                              Inclut : {item.options_included}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-1 shrink-0">
                          {item.file_path && (
                            <button
                              onClick={() => handleDownloadFromHistory(item)}
                              title="Télécharger à nouveau"
                              className="p-2 bg-white/5 hover:bg-[#6C5CFF]/20 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer animate-pulse"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
};
