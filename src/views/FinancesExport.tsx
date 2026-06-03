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
  FileSpreadsheet
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';
import type { Transaction, Member, SavingGoal, CustomCategory, Account, Abonnement } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface FinancesExportProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  savingGoals: SavingGoal[];
  members: Member[];
  customCategories: CustomCategory[];
  accounts: Account[];
  abonnements: Abonnement[];
  foyerId: string;
  myMemberProfile: any;
  currencySymbol: string;
  initialOptions?: {
    format?: 'pdf' | 'excel' | 'csv' | 'json' | 'txt';
    period?: 'week' | 'month' | 'last_month' | 'year' | 'last_year' | 'custom';
    category?: string;
  };
}

type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'txt';
type ExportPeriod = 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

interface HistoryItem {
  id: string;
  created_at: string;
  format: string;
  period_type: string;
  start_date: string;
  end_date: string;
  member_name: string;
  file_path: string | null;
}

export const FinancesExport: React.FC<FinancesExportProps> = ({
  isOpen,
  onClose,
  transactions,
  savingGoals,
  customCategories,
  accounts,
  abonnements,
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

  // Data selection states
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeAbonnements, setIncludeAbonnements] = useState(true);
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeBudgets, setIncludeBudgets] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [saveCloud, setSaveCloud] = useState(true);

  // Status and logs
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Apply initial options from voice parsing if present
  useEffect(() => {
    if (initialOptions) {
      if (initialOptions.format) setFormat(initialOptions.format);
      if (initialOptions.period) {
        if (initialOptions.period === 'week') setPeriod('this_week');
        else if (initialOptions.period === 'month') setPeriod('this_month');
        else if (initialOptions.period === 'last_month') setPeriod('last_month');
        else if (initialOptions.period === 'year') setPeriod('this_year');
        else if (initialOptions.period === 'last_year') setPeriod('last_year');
        else if (initialOptions.period === 'custom') setPeriod('custom');
      }
    }
  }, [initialOptions]);

  // Load history on open
  useEffect(() => {
    if (isOpen && foyerId) {
      loadExportHistory();
    }
  }, [isOpen, foyerId]);

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

  // Helper date calculators
  const getPeriodDates = (): { start: Date; end: Date } => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'this_week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date();
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

  // Filter lists based on selected period
  const formattedStartStr = periodStart.toISOString().split('T')[0];
  const formattedEndStr = periodEnd.toISOString().split('T')[0];

  const filteredTxs = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= periodStart && txDate <= periodEnd;
  });

  const incomeTxs = filteredTxs.filter(t => t.type === 'income');
  const expenseTxs = filteredTxs.filter(t => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Epargne total
  const savingsTotal = savingGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Budget Restant calculation
  const totalBudgetLimit = customCategories.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalBudgetSpent = transactions
    .filter(t => t.type === 'expense' && t.date >= formattedStartStr && t.date <= formattedEndStr)
    .reduce((sum, t) => sum + t.amount, 0);
  const budgetRemaining = totalBudgetLimit - totalBudgetSpent;

  // Handle Export Generation
  const handleGenerateExport = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      const fileName = `Export_Finances_${formattedStartStr}_to_${formattedEndStr}.${format === 'excel' ? 'xlsx' : format}`;
      let fileBlob: Blob | null = null;
      let textContent = '';

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
            total_savings: savingsTotal,
            budget_remaining: budgetRemaining
          };
        }
        if (includeIncome) exportData.incomes = incomeTxs;
        if (includeExpenses) exportData.expenses = expenseTxs;
        if (includeSavings) exportData.saving_goals = savingGoals;
        if (includeAbonnements) exportData.abonnements = abonnements;
        if (includeAccounts) exportData.accounts = accounts;
        if (includeBudgets) exportData.custom_categories = customCategories;

        textContent = JSON.stringify(exportData, null, 2);
        fileBlob = new Blob([textContent], { type: 'application/json;charset=utf-8;' });
      } 
      else if (format === 'txt') {
        textContent = `====================================================\n`;
        textContent += `RAPPORT FINANCIER DE LA FAMILLE - MAFAMILLE+\n`;
        textContent += `====================================================\n`;
        textContent += `Période : Du ${formattedStartStr} au ${formattedEndStr}\n`;
        textContent += `Généré le : ${new Date().toLocaleString()}\n`;
        textContent += `Généré par : ${myMemberProfile?.displayName || 'Membre'}\n\n`;

        if (includeSummary) {
          textContent += `1. RÉSUMÉ GLOBAL\n`;
          textContent += `----------------------------------------------------\n`;
          textContent += `- Revenus totaux  : ${totalIncome.toFixed(2)} ${currencySymbol}\n`;
          textContent += `- Dépenses totales : ${totalExpense.toFixed(2)} ${currencySymbol}\n`;
          textContent += `- Solde net        : ${netBalance.toFixed(2)} ${currencySymbol}\n`;
          textContent += `- Épargne totale   : ${savingsTotal.toFixed(2)} ${currencySymbol}\n`;
          textContent += `- Budget restant   : ${budgetRemaining.toFixed(2)} ${currencySymbol}\n\n`;
        }

        if (includeIncome && incomeTxs.length > 0) {
          textContent += `2. LISTE DES REVENUS DETTAILLÉS\n`;
          textContent += `----------------------------------------------------\n`;
          incomeTxs.forEach(t => {
            textContent += `[${t.date}] ${t.title} : +${t.amount.toFixed(2)} ${currencySymbol} (${t.category} | ${t.memberName || 'N/A'})\n`;
          });
          textContent += `\n`;
        }

        if (includeExpenses && expenseTxs.length > 0) {
          textContent += `3. LISTE DES DÉPENSES DÉTAILLÉES\n`;
          textContent += `----------------------------------------------------\n`;
          expenseTxs.forEach(t => {
            textContent += `[${t.date}] ${t.title} : -${t.amount.toFixed(2)} ${currencySymbol} (${t.category} - ${t.subCategory || 'Aucune'} | ${t.memberName || 'N/A'})\n`;
          });
          textContent += `\n`;
        }

        if (includeAbonnements && abonnements.length > 0) {
          textContent += `4. ABONNEMENTS MENSUELS ACTIFS\n`;
          textContent += `----------------------------------------------------\n`;
          abonnements.forEach(a => {
            textContent += `- ${a.name} : ${a.amount.toFixed(2)} ${currencySymbol}/mois (Prochain prélèvement le ${a.nextBillingDate || 'N/A'})\n`;
          });
          textContent += `\n`;
        }

        fileBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      }
      else if (format === 'csv') {
        let csvContent = 'FEUILLE,Date,Titre,Montant,Type,Categorie,Sous-categorie,Compte,Membre,Commentaire\n';
        
        if (includeIncome) {
          incomeTxs.forEach(t => {
            csvContent += `Revenus,${t.date},"${t.title.replace(/"/g, '""')}",${t.amount},income,"${t.category}","${t.subCategory || ''}","${t.accountId || ''}","${t.memberName || ''}","${(t.comment || '').replace(/"/g, '""')}"\n`;
          });
        }
        if (includeExpenses) {
          expenseTxs.forEach(t => {
            csvContent += `Depenses,${t.date},"${t.title.replace(/"/g, '""')}",${t.amount},expense,"${t.category}","${t.subCategory || ''}","${t.accountId || ''}","${t.memberName || ''}","${(t.comment || '').replace(/"/g, '""')}"\n`;
          });
        }
        if (includeAbonnements) {
          abonnements.forEach(a => {
            csvContent += `Abonnements,,"${a.name.replace(/"/g, '""')}",${a.amount},expense,"${a.category || ''}",,,,"Prochain : ${a.nextBillingDate || ''}"\n`;
          });
        }

        fileBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      }
      else if (format === 'excel') {
        const wb = XLSX.utils.book_new();

        if (includeSummary) {
          const summaryData = [
            { Métrique: 'Revenus Totaux', Valeur: totalIncome, Devise: currencySymbol },
            { Métrique: 'Dépenses Totales', Valeur: totalExpense, Devise: currencySymbol },
            { Métrique: 'Solde Net', Valeur: netBalance, Devise: currencySymbol },
            { Métrique: 'Épargne Totale', Valeur: savingsTotal, Devise: currencySymbol },
            { Métrique: 'Budget Restant', Valeur: budgetRemaining, Devise: currencySymbol }
          ];
          const ws = XLSX.utils.json_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(wb, ws, 'Résumé');
        }

        if (includeIncome && incomeTxs.length > 0) {
          const data = incomeTxs.map(t => ({
            Date: t.date,
            Libellé: t.title,
            Montant: t.amount,
            Catégorie: t.category,
            Compte: accounts.find(a => a.id === t.accountId)?.name || 'N/A',
            Membre: t.memberName || 'N/A',
            Commentaire: t.comment || ''
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Revenus');
        }

        if (includeExpenses && expenseTxs.length > 0) {
          const data = expenseTxs.map(t => ({
            Date: t.date,
            Libellé: t.title,
            Montant: t.amount,
            Catégorie: t.category,
            'Sous-catégorie': t.subCategory || '',
            Compte: accounts.find(a => a.id === t.accountId)?.name || 'N/A',
            Membre: t.memberName || 'N/A',
            Commentaire: t.comment || ''
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Dépenses');
        }

        if (includeSavings && savingGoals.length > 0) {
          const data = savingGoals.map(g => ({
            Cagnotte: g.title,
            Cible: g.targetAmount,
            Actuel: g.currentAmount,
            Catégorie: g.category || '',
            Complété: `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Épargne');
        }

        if (includeAbonnements && abonnements.length > 0) {
          const data = abonnements.map(a => ({
            Abonnement: a.name,
            Montant: a.amount,
            Période: a.period === 'monthly' ? 'Mensuel' : 'Annuel',
            Catégorie: a.category || '',
            'Prochain Prélèvement': a.nextBillingDate || ''
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Abonnements');
        }

        if (includeAccounts && accounts.length > 0) {
          const data = accounts.map(a => ({
            Compte: a.name,
            Type: a.type === 'bank' ? 'Bancaire' : a.type === 'savings' ? 'Épargne' : 'Espèces',
            Solde: a.balance
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Comptes');
        }

        // Generate binary and build Blob
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        fileBlob = new Blob([wbout], { type: 'application/octet-stream' });
      }
      else if (format === 'pdf') {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. PAGE DE COUVERTURE
        doc.setFillColor(7, 17, 31); // Dark background #07111F
        doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

        // Draw stylized shapes
        doc.setDrawColor(108, 92, 255); // Purple border
        doc.setLineWidth(1.5);
        doc.line(20, 20, pageWidth - 20, 20);
        doc.line(20, doc.internal.pageSize.getHeight() - 20, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);

        // Header Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.text("MaFamille+", pageWidth / 2, 70, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 160, 180);
        doc.text("RAPPORT FINANCIER PREMIUM", pageWidth / 2, 85, { align: 'center' });

        // Metadata block
        doc.setFillColor(255, 255, 255, 0.03);
        doc.rect(30, 110, pageWidth - 60, 80, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Foyer : ${myMemberProfile?.foyerName || 'Ma Famille'}`, 40, 130);
        doc.text(`Généré par : ${myMemberProfile?.displayName || 'Gestionnaire'}`, 40, 145);
        doc.text(`Période : Du ${formattedStartStr} au ${formattedEndStr}`, 40, 160);
        doc.text(`Date d'export : ${new Date().toLocaleDateString()}`, 40, 175);

        // Footer couverture
        doc.setFontSize(10);
        doc.setTextColor(100, 110, 130);
        doc.text("Généré de manière sécurisée par l'OS familial MyFamily+", pageWidth / 2, 260, { align: 'center' });

        // 2. PAGE DE SYNTHÈSE
        doc.addPage();
        doc.setTextColor(30, 41, 59); // Standard slate text for content
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text("1. Synthèse Globale", 15, 25);

        // Draw cards
        const cardWidth = (pageWidth - 40) / 2;
        
        // Income Card
        doc.setFillColor(240, 253, 244); // Greenish
        doc.rect(15, 35, cardWidth, 30, 'F');
        doc.setTextColor(22, 101, 52);
        doc.setFontSize(10);
        doc.text("REVENUS TOTAL", 20, 45);
        doc.setFontSize(14);
        doc.text(`+${totalIncome.toFixed(2)} ${currencySymbol}`, 20, 57);

        // Expense Card
        doc.setFillColor(254, 242, 242); // Reddish
        doc.rect(15 + cardWidth + 10, 35, cardWidth, 30, 'F');
        doc.setTextColor(153, 27, 27);
        doc.setFontSize(10);
        doc.text("DÉPENSES TOTAL", 20 + cardWidth + 10, 45);
        doc.setFontSize(14);
        doc.text(`-${totalExpense.toFixed(2)} ${currencySymbol}`, 20 + cardWidth + 10, 57);

        // Net Balance Card
        doc.setFillColor(243, 244, 246); // Gray
        doc.rect(15, 75, cardWidth, 30, 'F');
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(10);
        doc.text("SOLDE NET", 20, 85);
        doc.setFontSize(14);
        doc.text(`${netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)} ${currencySymbol}`, 20, 97);

        // Savings Card
        doc.setFillColor(239, 246, 255); // Blue
        doc.rect(15 + cardWidth + 10, 75, cardWidth, 30, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(10);
        doc.text("ÉPARGNE ACQUISE", 20 + cardWidth + 10, 85);
        doc.setFontSize(14);
        doc.text(`${savingsTotal.toFixed(2)} ${currencySymbol}`, 20 + cardWidth + 10, 97);

        // Category breakdown progress
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text("Budget Restant de la Période", 15, 125);
        
        doc.setFillColor(229, 231, 235);
        doc.rect(15, 135, pageWidth - 30, 6, 'F');
        
        const budgetRatio = totalBudgetLimit > 0 ? Math.min(1, Math.max(0, totalBudgetSpent / totalBudgetLimit)) : 0;
        doc.setFillColor(108, 92, 255);
        doc.rect(15, 135, (pageWidth - 30) * budgetRatio, 6, 'F');

        doc.setFontSize(10);
        doc.text(`Dépensé : ${totalBudgetSpent.toFixed(2)} / ${totalBudgetLimit.toFixed(2)} ${currencySymbol} (Reste : ${budgetRemaining.toFixed(2)} ${currencySymbol})`, 15, 148);

        // 3. DETAILED LISTS USING AUTOTABLE
        if (includeIncome && incomeTxs.length > 0) {
          doc.addPage();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text("2. Liste des Revenus", 15, 25);

          (doc as any).autoTable({
            startY: 32,
            head: [['Date', 'Description', 'Montant', 'Catégorie', 'Auteur']],
            body: incomeTxs.map(t => [t.date, t.title, `+${t.amount.toFixed(2)} ${currencySymbol}`, t.category, t.memberName || '']),
            headStyles: { fillColor: [7, 17, 31] },
            alternateRowStyles: { fillColor: [248, 250, 252] }
          });
        }

        if (includeExpenses && expenseTxs.length > 0) {
          doc.addPage();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text("3. Liste des Dépenses", 15, 25);

          (doc as any).autoTable({
            startY: 32,
            head: [['Date', 'Description', 'Montant', 'Catégorie', 'Auteur']],
            body: expenseTxs.map(t => [t.date, t.title, `-${t.amount.toFixed(2)} ${currencySymbol}`, t.category, t.memberName || '']),
            headStyles: { fillColor: [153, 27, 27] },
            alternateRowStyles: { fillColor: [255, 242, 242] }
          });
        }

        if (includeAbonnements && abonnements.length > 0) {
          doc.addPage();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text("4. Liste des Abonnements Récurrents", 15, 25);

          (doc as any).autoTable({
            startY: 32,
            head: [['Abonnement', 'Montant', 'Périodicité', 'Catégorie', 'Prochain Prélèvement']],
            body: abonnements.map(a => [a.name, `${a.amount.toFixed(2)} ${currencySymbol}`, a.period === 'monthly' ? 'Mensuel' : 'Annuel', a.category || '', a.nextBillingDate || '']),
            headStyles: { fillColor: [30, 58, 138] }
          });
        }

        // Add page numbers in footer to all pages (except cover)
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let j = 2; j <= totalPages; j++) {
          doc.setPage(j);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${j} sur ${totalPages}`, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
          doc.text(`Export Financier MyFamily+ - ${new Date().toLocaleDateString()}`, 15, doc.internal.pageSize.getHeight() - 10);
        }

        fileBlob = doc.output('blob');
      }

      if (!fileBlob) throw new Error("Erreur de génération du fichier.");

      // 4. SAVE TO CLOUD (SUPABASE STORAGE & HISTORY)
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
        } else {
          console.warn('Storage upload error (continuing with download fallback):', uploadErr);
        }

        const { data: { user } } = await supabase.auth.getUser();

        // Insert into history
        await supabase.from('exports_history').insert({
          id: crypto.randomUUID(),
          foyer_id: foyerId,
          user_id: user ? user.id : null,
          member_name: myMemberProfile?.displayName || 'Système',
          format,
          period_type: period,
          start_date: formattedStartStr,
          end_date: formattedEndStr,
          file_path: storagePath
        });

        // Reload history
        loadExportHistory();
      }

      // 5. DOWNLOAD OR SHARE
      const fileUrl = URL.createObjectURL(fileBlob);
      
      if (navigator.share && navigator.canShare) {
        const fileObj = new File([fileBlob], fileName, { type: fileBlob.type });
        if (navigator.canShare({ files: [fileObj] })) {
          try {
            await navigator.share({
              files: [fileObj],
              title: `Rapport Financier - MaFamille+`,
              text: `Voici l'export financier du foyer de ${formattedStartStr} à ${formattedEndStr}`
            });
            setSuccess(true);
            setLoading(false);
            return;
          } catch (shareErr) {
            console.warn('Web Share failed, downloading instead:', shareErr);
          }
        }
      }

      // Normal download fallback
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
      alert("Ce fichier n'est pas stocké sur le cloud ou le stockage n'est pas configuré.");
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
      link.download = `Export_Finances_Historique_${item.start_date}_to_${item.end_date}.${item.format === 'excel' ? 'xlsx' : item.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileUrl);
    } catch (err: any) {
      alert(`Erreur de téléchargement : ${err.message}`);
    }
  };

  return (
    <>
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div 
        className={`fixed bottom-0 left-0 right-0 top-0 md:top-10 md:bottom-10 max-h-[92vh] md:max-w-4xl mx-auto glass-panel border-t md:border border-white/10 z-50 rounded-t-[32px] md:rounded-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300 ease-out transform ${
          isOpen ? 'translate-y-0 opacity-100Scale' : 'translate-y-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#6C5CFF]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Module "Exporter les finances"</h2>
              <p className="text-xs text-white/50">Générez des rapports premium pour votre foyer</p>
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
              <span>Exportation réussie et enregistrée avec succès !</span>
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
                    { id: 'pdf', name: 'PDF Premium', icon: FileText, desc: 'Rapport complet' },
                    { id: 'excel', name: 'Excel .xlsx', icon: FileSpreadsheet, desc: 'Multi-feuilles' },
                    { id: 'csv', name: 'Fichier CSV', icon: Database, desc: 'Données brutes' },
                    { id: 'json', name: 'JSON', icon: FileJson, desc: 'Dump technique' },
                    { id: 'txt', name: 'Texte Simple', icon: FileText, desc: 'Mémo brut' }
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

              {/* 2. Period Selection */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">2. Choisir la période</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ExportPeriod)}
                  className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                >
                  <option value="this_week">Cette semaine</option>
                  <option value="this_month">Ce mois-ci</option>
                  <option value="last_month">Le mois dernier</option>
                  <option value="this_year">Cette année</option>
                  <option value="last_year">L'année dernière</option>
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
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">3. Données à inclure</span>
                <div className="grid grid-cols-2 gap-2 p-3 bg-white/5 border border-white/5 rounded-2xl">
                  {[
                    { label: 'Revenus', val: includeIncome, set: setIncludeIncome },
                    { label: 'Dépenses', val: includeExpenses, set: setIncludeExpenses },
                    { label: 'Objectifs d’épargne', val: includeSavings, set: setIncludeSavings },
                    { label: 'Abonnements récurrents', val: includeAbonnements, set: setIncludeAbonnements },
                    { label: 'Soldes des comptes', val: includeAccounts, set: setIncludeAccounts },
                    { label: 'Catégories / Budgets', val: includeBudgets, set: setIncludeBudgets },
                    { label: 'Résumé Global', val: includeSummary, set: setIncludeSummary },
                    { label: 'Sauvegarder dans le Cloud', val: saveCloud, set: setSaveCloud }
                  ].map((chk, i) => (
                    <label key={i} className="flex items-center space-x-2.5 p-1 cursor-pointer select-none text-white/80 hover:text-white">
                      <input 
                        type="checkbox"
                        checked={chk.val}
                        onChange={(e) => chk.set(e.target.checked)}
                        className="w-4 h-4 rounded border-white/25 accent-[#6C5CFF]"
                      />
                      <span className="text-xs font-semibold">{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Preview & History Panel */}
            <div className="space-y-6 flex flex-col">
              
              {/* Preview block */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#6C5CFF]/10 to-[#4F8CFF]/10 border border-[#6C5CFF]/20 space-y-4">
                <div className="flex items-center space-x-2 text-white">
                  <BarChart3 className="w-4 h-4 text-[#6C5CFF]" />
                  <span className="text-xs font-black uppercase tracking-wider">Prévisualisation du rapport</span>
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
                    <span>Enregistrement cloud :</span>
                    <span className="font-bold text-white">{saveCloud ? 'Activé (finance-exports)' : 'Désactivé'}</span>
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
                      <span>Générer et Exporter</span>
                    </>
                  )}
                </button>
              </div>

              {/* Exports History list */}
              <div className="flex-1 flex flex-col space-y-2.5 min-h-[160px]">
                <div className="flex items-center space-x-2 text-white/60">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Historique des exports</span>
                </div>

                <div className="flex-1 border border-white/5 rounded-2xl bg-white/3 overflow-y-auto no-scrollbar max-h-[180px] p-2 space-y-2">
                  {historyLoading ? (
                    <div className="h-full flex items-center justify-center text-xs text-white/40">
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Chargement de l'historique...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-white/30 text-center p-4">
                      Aucun export n'a encore été historisé.
                    </div>
                  ) : (
                    history.map(item => (
                      <div 
                        key={item.id} 
                        className="p-2.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between text-xs transition-all"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold uppercase text-[10px] text-[#4F8CFF]">{item.format}</span>
                            <span className="text-[10px] text-white/50">par {item.member_name}</span>
                          </div>
                          <div className="text-[10px] text-white/70">
                            Période : {item.start_date} → {item.end_date}
                          </div>
                        </div>
                        
                        <div className="flex space-x-1 shrink-0">
                          {item.file_path && (
                            <button
                              onClick={() => handleDownloadFromHistory(item)}
                              title="Télécharger depuis le Cloud"
                              className="p-2 bg-white/5 hover:bg-[#6C5CFF]/20 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
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
