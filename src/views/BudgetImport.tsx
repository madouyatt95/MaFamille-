/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/exhaustive-deps -- legacy Supabase and module payloads still use broad shapes; tracked in docs/lint_cleanup_remaining.md; legacy state and payload updates need a dedicated immutable-data refactor; legacy effects need dependency isolation before changing behavior */
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Trash2,
  Columns,
  Sparkles,
  Clipboard,
  History
} from 'lucide-react';
import { getSupabaseClient, serializeTransactionComment } from '../utils/supabase';
import type { Transaction, CustomCategory, Account } from '../types';
import type { WorkBook } from 'xlsx';
import { parseReceiptText, recognizeImageDocument } from '../utils/localOcr';

interface BudgetImportProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  accounts: Account[];
  customCategories: CustomCategory[];
  foyerId: string;
  myMemberProfile: any;
  activeMemberId: string;
  activeMemberObj: any;
  onImportComplete: (addedTxs: any[]) => void;
  initialOptions?: {
    type?: 'relevé' | 'ticket' | 'csv' | 'excel';
  };
}

type ImportStep = 'upload' | 'sheets_select' | 'mapping' | 'categorization' | 'duplicates' | 'validation' | 'complete';

interface ParsedRow {
  date: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subCategory?: string;
  accountId?: string;
  comment?: string;
}

interface ImportHistoryItem {
  id: string;
  created_at: string;
  filename: string;
  member_name: string;
  added_transaction_ids: string[];
  ignored_count: number;
  tx_count: number;
}

export const BudgetImport: React.FC<BudgetImportProps> = ({
  isOpen,
  onClose,
  transactions,
  accounts,
  customCategories,
  foyerId,
  myMemberProfile,
  activeMemberId,
  activeMemberObj,
  onImportComplete,
  initialOptions
}) => {
  // Wizard state
  const [step, setStep] = useState<ImportStep>('upload');
  
  // File details
  const [fileName, setFileName] = useState('');
  const [pasteText, setPasteText] = useState('');
  
  // Excel sheets
  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [sheetsList, setSheetsList] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Mapping state
  const [mappings, setMappings] = useState<Record<string, string>>({
    date: '',
    title: '',
    amount: '',
    type: '',
    category: '',
    comment: ''
  });

  // Selected Account for import
  const [targetAccountId, setTargetAccountId] = useState('');

  // Parsed rows to import
  const [processedRows, setProcessedRows] = useState<ParsedRow[]>([]);
  const [duplicateFlags, setDuplicateFlags] = useState<boolean[]>([]);
  const [duplicateOption, setDuplicateOption] = useState<'ignore' | 'force'>('ignore');

  // Loaders / Messages
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply voice commands
  useEffect(() => {
    if (initialOptions) {
      if (initialOptions.type === 'ticket') {
        setTimeout(() => fileInputRef.current?.click(), 300);
      }
    }
  }, [initialOptions]);

  // Load imports history
  useEffect(() => {
    if (isOpen && foyerId) {
      loadImportHistory();
    }
  }, [isOpen, foyerId]);

  const loadImportHistory = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('imports_history')
        .select('*')
        .eq('foyer_id', foyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedHistory: ImportHistoryItem[] = (data || []).map((h: any) => ({
        id: h.id,
        created_at: h.created_at,
        filename: h.filename,
        member_name: h.member_name,
        added_transaction_ids: h.added_transaction_ids || [],
        ignored_count: h.ignored_count || 0,
        tx_count: (h.added_transaction_ids || []).length
      }));

      setHistory(formattedHistory);
    } catch (err) {
      console.error('Error loading import history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = async (file: File) => {
    setErrorMsg('');
    setFileName(file.name);

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Ce fichier dépasse 10 Mo. Exportez une période plus courte puis réessayez.");
      return;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'csv') {
      readCsvFile(file);
    } 
    else if (ext === 'xlsx' || ext === 'xls') {
      readExcelFile(file);
    } 
    else if (['jpg', 'jpeg', 'png', 'pdf'].includes(ext || '')) {
      runLocalOcr(file);
    } 
    else {
      setErrorMsg("Format de fichier non supporté. Utilisez CSV, XLSX, JPG, PNG ou PDF.");
    }
  };

  // CSV Reader
  const readCsvFile = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setErrorMsg("Le fichier CSV est vide.");
        setLoading(false);
        return;
      }

      try {
        const XLSX = await import('xlsx');
        const csvWorkbook = XLSX.read(text, { type: 'string' });
        const firstSheetName = csvWorkbook.SheetNames[0];
        if (!firstSheetName) throw new Error('Aucune feuille détectée');
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(csvWorkbook.Sheets[firstSheetName], { defval: '' });
        if (rawData.length === 0) throw new Error('Aucune ligne de transaction détectée');
        const headers = Object.keys(rawData[0]);

        setParsedHeaders(headers);
        setRawRows(rawData);
        autoDetectMappings(headers);
        setStep('mapping');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMsg(`Lecture CSV impossible : ${message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Le fichier CSV n'a pas pu être lu.");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  // Excel Reader
  const readExcelFile = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      try {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setSheetsList(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setSelectedSheet(wb.SheetNames[0]);
          loadExcelSheet(wb, wb.SheetNames[0]);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMsg(`Erreur Excel : ${message}`);
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadExcelSheet = async (wb: WorkBook, sheetName: string) => {
    const XLSX = await import('xlsx');
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (data.length === 0) {
      setErrorMsg("Cette feuille est vide.");
      setLoading(false);
      return;
    }

    const headers = Object.keys(data[0] as any);
    setParsedHeaders(headers);
    setRawRows(data);
    autoDetectMappings(headers);
    setStep('sheets_select');
    setLoading(false);
  };

  // Paste Text Parser
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Detect delimiter
    const sample = lines[0];
    let delimiter = '\t';
    if (sample.includes(';')) delimiter = ';';
    else if (sample.includes(',')) delimiter = ',';

    const headers = sample.split(delimiter).map(h => h.trim());
    const rawData = lines.slice(1).map(l => {
      const cols = l.split(delimiter).map(c => c.trim());
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || '';
      });
      return rowObj;
    });

    setParsedHeaders(headers);
    setRawRows(rawData);
    autoDetectMappings(headers);
    setStep('mapping');
  };

  // OCR Reader using the shared local OCR flow.
  const runLocalOcr = async (file: File) => {
    setLoading(true);
    setLoadingProgress('Initialisation de Tesseract OCR...');
    
    try {
      setLoadingProgress('Lecture du document...');
      const document = await recognizeImageDocument(file);
      parseOcrText(document.text, document.lines);
    } catch (err: unknown) {
      console.error('OCR Error:', err);
      setErrorMsg(`L'OCR local a échoué. Saisie manuelle suggérée.`);
      setLoading(false);
    }
  };

  const parseOcrText = (text: string, metadata: Parameters<typeof parseReceiptText>[1] = []) => {
    const receipt = parseReceiptText(text, metadata);

    // Create a single row list
    const detectedRow: ParsedRow = {
      date: receipt.date,
      title: receipt.merchant,
      amount: receipt.amount || 0,
      type: 'expense',
      category: receipt.category,
      subCategory: receipt.categorySuggestion === 'Restauration' ? 'Restaurant' : undefined,
      comment: [
        receipt.time ? `Heure : ${receipt.time.slice(0, 5)}` : '',
        receipt.paymentMethod ? `Paiement : ${receipt.paymentMethodLabel}` : '',
        receipt.selectionReason,
        receipt.alternateAmounts.length ? `Autres montants détectés : ${receipt.alternateAmounts.map(value => `${value.toFixed(2)} €`).join(', ')}` : ''
      ].filter(Boolean).join('\n')
    };

    setProcessedRows([detectedRow]);
    setDuplicateFlags([checkIsDuplicate(detectedRow)]);
    setStep('duplicates');
    setLoading(false);
  };

  // Helper Auto Detect columns mapping
  const autoDetectMappings = (headers: string[]) => {
    const newMappings = { ...mappings };
    headers.forEach(h => {
      const lower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (['date', 'jour', 'cree'].some(k => lower.includes(k))) {
        newMappings.date = h;
      } 
      else if (['titre', 'libelle', 'description', 'commercant', 'nom', 'details'].some(k => lower.includes(k))) {
        newMappings.title = h;
      } 
      else if (['montant', 'somme', 'valeur', 'debit', 'credit', 'prix'].some(k => lower.includes(k))) {
        newMappings.amount = h;
      } 
      else if (lower.includes('type')) {
        newMappings.type = h;
      } 
      else if (['categorie', 'classement', 'rubrique'].some(k => lower.includes(k))) {
        newMappings.category = h;
      } 
      else if (['note', 'comment', 'description', 'details'].some(k => lower.includes(k))) {
        newMappings.comment = h;
      }
    });
    setMappings(newMappings);
  };

  // Helper categorization rules
  const autoCategorize = (title: string): string => {
    const cleanTitle = title.toLowerCase();
    
    if (['carrefour', 'auchan', 'lidl', 'supermarche', 'aldi', 'monoprix', 'e.leclerc', 'alimentation', 'courses', 'boulangerie'].some(k => cleanTitle.includes(k))) {
      return 'Alimentation';
    }
    if (['uber', 'taxi', 'sncf', 'metro', 'ratp', 'total', 'essence', 'carburant', 'parking', 'peage', 'vol', 'train', 'avion'].some(k => cleanTitle.includes(k))) {
      return 'Transport';
    }
    if (['netflix', 'spotify', 'disney', 'amazon prime', 'canal', 'abonnement', 'mensuel'].some(k => cleanTitle.includes(k))) {
      return 'Loisirs';
    }
    if (['edf', 'engie', 'suez', 'veolia', 'internet', 'loyer', 'bricolage', 'meuble', 'ikea', 'castorama'].some(k => cleanTitle.includes(k))) {
      return 'Logement';
    }
    if (['pharmacie', 'medecin', 'dentiste', 'mutuelle', 'hopital'].some(k => cleanTitle.includes(k))) {
      return 'Santé';
    }
    if (['ecole', 'cantine', 'creche', 'livre', 'cours', 'cahier'].some(k => cleanTitle.includes(k))) {
      return 'Éducation';
    }
    return 'Divers';
  };

  // Process rows from mapping
  const processMappedData = () => {
    if (!mappings.date || !mappings.title || !mappings.amount) {
      setErrorMsg("Veuillez mapper au minimum la Date, le Libellé (Titre) et le Montant.");
      return;
    }

    const processed: ParsedRow[] = [];
    rawRows.forEach((r) => {
      const rawDate = r[mappings.date];
      const rawTitle = r[mappings.title];
      const rawAmount = r[mappings.amount];
      
      if (!rawDate || !rawTitle || rawAmount === '') return;

      // Extract float
      let amount = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
      if (isNaN(amount)) return;
      
      const rawType = mappings.type ? String(r[mappings.type]).toLowerCase() : '';
      const amountHeader = mappings.amount.toLowerCase();
      const type: ParsedRow['type'] =
        ['revenu', 'income', 'crédit', 'credit', 'entrée', 'entree'].some(label => rawType.includes(label))
          ? 'income'
          : ['dépense', 'depense', 'expense', 'débit', 'debit', 'sortie'].some(label => rawType.includes(label))
            ? 'expense'
            : amountHeader.includes('debit') || amountHeader.includes('débit')
              ? 'expense'
              : amountHeader.includes('credit') || amountHeader.includes('crédit')
                ? 'income'
                : amount > 0 ? 'income' : 'expense';
      amount = Math.abs(amount);

      // Clean date
      let date = String(rawDate).split('T')[0]; // strip time if ISO
      if (date.includes('/')) {
        const parts = date.split('/');
        if (parts[2]?.length === 4) {
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const category = mappings.category ? r[mappings.category] : autoCategorize(String(rawTitle));

      processed.push({
        date,
        title: String(rawTitle).trim(),
        amount,
        type,
        category: customCategories.some(c => c.name.toLowerCase() === category.toLowerCase()) ? category : autoCategorize(String(rawTitle)),
        accountId: targetAccountId || undefined,
        comment: mappings.comment ? String(r[mappings.comment]) : ''
      });
    });

    if (processed.length === 0) {
      setErrorMsg("Aucune transaction valide n'a pu être extraite avec ce mapping.");
      return;
    }

    setProcessedRows(processed);
    
    // Check duplicates
    const flags = processed.map(row => checkIsDuplicate(row));
    setDuplicateFlags(flags);

    setStep('duplicates');
  };

  const checkIsDuplicate = (row: ParsedRow): boolean => {
    return transactions.some(t => 
      t.date === row.date &&
      t.title.toLowerCase().trim() === row.title.toLowerCase().trim() &&
      Math.abs(t.amount - row.amount) < 0.01
    );
  };

  // Perform Final Database Insert
  const handleFinalImport = async () => {
    setLoading(true);
    setErrorMsg('');
    
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) {
      setErrorMsg("Base de données Supabase non disponible.");
      setLoading(false);
      return;
    }

    try {
      const addedIds: string[] = [];
      const addedTxsList: any[] = [];
      let ignored = 0;

      for (let i = 0; i < processedRows.length; i++) {
        const row = processedRows[i];
        const isDup = duplicateFlags[i];

        if (isDup && duplicateOption === 'ignore') {
          ignored++;
          continue;
        }

        const txId = crypto.randomUUID();
        const nowUser = myMemberProfile?.displayName || 'Parent';

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const dbTx = {
          id: txId,
          foyer_id: foyerId,
          title: row.title,
          amount: row.amount,
          type: row.type,
          category: row.category,
          date: row.date,
          member_id: activeMemberId,
          member_name: activeMemberObj?.name || 'Système',
          account_id: row.accountId || null,
          comment: serializeTransactionComment(row.comment || '', {
            moduleSource: 'import',
            entryTime: timeStr,
            entryDate: row.date
          }),
          modification_history: JSON.stringify([{
            date: new Date().toISOString(),
            author: nowUser,
            action: 'Importation de relevé bancaire'
          }])
        };

        const { error: insErr } = await supabase.from('transactions').insert(dbTx);
        if (insErr) throw insErr;
        
        addedIds.push(txId);
        addedTxsList.push(dbTx);
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Log import history
      await supabase.from('imports_history').insert({
        id: crypto.randomUUID(),
        foyer_id: foyerId,
        user_id: user ? user.id : null,
        member_name: myMemberProfile?.displayName || 'Gestionnaire',
        filename: fileName || 'Import Manuel',
        added_transaction_ids: addedIds,
        ignored_count: ignored
      });

      onImportComplete(addedTxsList);
      setStep('complete');
    } catch (err: any) {
      console.error("Error importing transactions:", err);
      setErrorMsg(`Erreur lors de l'insertion en base : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Rollback imported transaction
  const handleRollbackImport = async (item: ImportHistoryItem) => {
    const confirmRollback = window.confirm(`Voulez-vous vraiment annuler l'importation "${item.filename}" ? Cela supprimera les ${item.tx_count} transactions ajoutées.`);
    if (!confirmRollback) return;

    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Delete transactions by ids
      if (item.added_transaction_ids.length > 0) {
        const { error: delErr } = await supabase
          .from('transactions')
          .delete()
          .in('id', item.added_transaction_ids);

        if (delErr) throw delErr;
      }

      // Delete history item
      const { error: histErr } = await supabase
        .from('imports_history')
        .delete()
        .eq('id', item.id);

      if (histErr) throw histErr;

      alert("Importation annulée avec succès !");
      loadImportHistory();
      onImportComplete([]);
    } catch (err: any) {
      alert(`Impossible d'annuler l'importation : ${err.message}`);
    } finally {
      setLoading(false);
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
        className={`fixed bottom-0 left-0 right-0 top-0 md:top-10 md:bottom-10 max-h-[92vh] md:max-w-4xl mx-auto glass-panel border-t md:border border-white/10 z-50 rounded-t-[32px] md:rounded-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.6)] flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] transition-all duration-300 ease-out transform ${
          isOpen ? 'translate-y-0 opacity-100Scale' : 'translate-y-full opacity-0'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#4F8CFF]/15 border border-[#4F8CFF]/30 text-[#4F8CFF]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Module "Importer un budget"</h2>
              <p className="text-xs text-white/50">Importez des transactions et scannez des tickets</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar flex flex-col">
          
          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl flex items-center space-x-2 shrink-0">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD SOURCE */}
          {step === 'upload' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Left drag n drop */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-white/10 hover:border-[#4F8CFF]/50 rounded-[24px] bg-white/3 hover:bg-white/5 p-6 flex flex-col items-center justify-center text-center space-y-4 transition-all"
              >
                <div className="p-4 bg-[#4F8CFF]/10 rounded-full text-[#4F8CFF]">
                  <Upload className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Sélectionner ou Déposer un fichier</h3>
                  <p className="text-xs text-white/40 max-w-[240px] mx-auto mt-1 leading-normal">
                    Glissez-déposez un fichier CSV, Excel, ou l'image/PDF d'un ticket de caisse.
                  </p>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg,.pdf"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Choisir un fichier
                </button>
              </div>

              {/* Right text paste */}
              <div className="flex flex-col space-y-3 bg-white/3 border border-white/5 rounded-[24px] p-6 justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-white">
                    <Clipboard className="w-4 h-4 text-[#4F8CFF]" />
                    <span className="text-xs font-black uppercase tracking-wider">Copier-Coller des données</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-normal">
                    Copiez et collez les lignes tabulaires directement depuis un tableur ou un e-mail.
                  </p>
                  
                  <textarea
                    rows={6}
                    placeholder="Date    Libellé    Montant&#10;02/06/2026    Courses Carrefour    54.30"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="w-full p-3 bg-[#07111F] text-xs text-white border border-white/8 rounded-xl focus:outline-none focus:border-[#4F8CFF] resize-none"
                  />
                </div>

                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Analyser le texte
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: EXCEL SHEET SELECTION */}
          {step === 'sheets_select' && (
            <div className="flex-1 flex flex-col space-y-4 justify-center items-center max-w-md mx-auto text-center">
              <FileSpreadsheet className="w-12 h-12 text-[#4F8CFF]" />
              <div>
                <h3 className="text-base font-bold text-white">Sélectionner la feuille Excel</h3>
                <p className="text-xs text-white/50 mt-1">Le document contient plusieurs feuilles de calcul. Choisissez celle à importer.</p>
              </div>
              
              <select
                value={selectedSheet}
                onChange={(e) => {
                  setSelectedSheet(e.target.value);
                  if (workbook) loadExcelSheet(workbook, e.target.value);
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#4F8CFF] transition-all"
              >
                {sheetsList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <button
                onClick={() => setStep('mapping')}
                className="px-6 py-2.5 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <span>Continuer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 3: MAPPING COLUMNS */}
          {step === 'mapping' && (
            <div className="flex-1 flex flex-col space-y-5">
              <div className="flex items-center space-x-2 text-white">
                <Columns className="w-4 h-4 text-[#4F8CFF]" />
                <span className="text-xs font-black uppercase tracking-wider">Faire correspondre les colonnes</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column selects */}
                <div className="space-y-3 p-4 bg-white/3 border border-white/5 rounded-2xl">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-white/40 uppercase">Compte Bancaire Ciblé</span>
                    <select
                      value={targetAccountId}
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#07111F] text-xs border border-white/8 text-white rounded-lg"
                    >
                      <option value="">Sélectionner un compte (Optionnel)</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {[
                    { key: 'date', label: 'Date (Requis)' },
                    { key: 'title', label: 'Libellé / Titre (Requis)' },
                    { key: 'amount', label: 'Montant (Requis)' },
                    { key: 'type', label: 'Type (Revenu / Dépense)' },
                    { key: 'category', label: 'Catégorie' },
                    { key: 'comment', label: 'Commentaire / Note' }
                  ].map(m => (
                    <div key={m.key} className="flex justify-between items-center space-x-4">
                      <span className="text-xs text-white/70 font-semibold">{m.label}</span>
                      <select
                        value={mappings[m.key]}
                        onChange={(e) => setMappings({ ...mappings, [m.key]: e.target.value })}
                        className="px-2.5 py-1.5 bg-[#07111F] text-xs border border-white/8 text-white rounded-lg w-48"
                      >
                        <option value="">Ignorer</option>
                        {parsedHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* File rows preview table */}
                <div className="border border-white/5 rounded-2xl bg-white/2 p-4 overflow-x-auto">
                  <span className="text-[10px] font-bold text-white/40 uppercase block mb-2">Aperçu du fichier</span>
                  <table className="w-full text-[10px] text-white/60">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        {parsedHeaders.slice(0, 3).map(h => (
                          <th key={h} className="pb-1.5 font-bold uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-white/5">
                          {parsedHeaders.slice(0, 3).map(h => (
                            <td key={h} className="py-1.5 truncate max-w-[100px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={processMappedData}
                  className="px-6 py-2.5 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <span>Vérifier les données</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: DUPLICATES CHECK */}
          {step === 'duplicates' && (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex justify-between items-center text-white shrink-0">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#4F8CFF]" />
                  <span className="text-xs font-black uppercase tracking-wider">Aperçu & Détection des doublons</span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-white/50">Option de doublons :</span>
                  <select
                    value={duplicateOption}
                    onChange={(e) => setDuplicateOption(e.target.value as any)}
                    className="px-2.5 py-1 bg-[#07111F] border border-white/8 text-white rounded-lg text-xs"
                  >
                    <option value="ignore">Ignorer les doublons</option>
                    <option value="force">Importer quand même</option>
                  </select>
                </div>
              </div>

              {/* Transactions to import preview */}
              <div className="flex-1 border border-white/5 rounded-2xl overflow-y-auto no-scrollbar bg-white/2 max-h-[300px]">
                <table className="w-full text-xs text-white/80">
                  <thead>
                    <tr className="border-b border-white/10 text-left bg-white/3 sticky top-0">
                      <th className="p-3 font-bold uppercase text-[10px]">Statut</th>
                      <th className="p-3 font-bold uppercase text-[10px]">Date</th>
                      <th className="p-3 font-bold uppercase text-[10px]">Libellé</th>
                      <th className="p-3 font-bold uppercase text-[10px]">Catégorie</th>
                      <th className="p-3 font-bold uppercase text-[10px] text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedRows.map((row, idx) => {
                      const isDup = duplicateFlags[idx];
                      return (
                        <tr 
                          key={idx} 
                          className={`border-b border-white/5 ${isDup ? 'bg-amber-500/5 text-amber-200' : ''}`}
                        >
                          <td className="p-3 font-bold">
                            {isDup ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400">
                                {duplicateOption === 'ignore' ? 'Ignoré' : 'Doublon'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] text-green-400">
                                Prêt
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-[11px]">{row.date}</td>
                          <td className="p-3 font-bold">{row.title}</td>
                          <td className="p-3 text-white/50">{row.category}</td>
                          <td className={`p-3 text-right font-black ${row.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                            {row.type === 'income' ? '+' : '-'}{row.amount.toFixed(2)} €
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center shrink-0 pt-2 border-t border-white/5">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Retour au mapping
                </button>

                <button
                  onClick={handleFinalImport}
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 disabled:bg-[#4F8CFF]/50 text-white font-bold text-xs uppercase tracking-widest rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-[#4F8CFF]/15"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lancer l'importation</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* STEP 5: IMPORT COMPLETE */}
          {step === 'complete' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto py-10">
              <CheckCircle2 className="w-16 h-16 text-green-400 animate-bounce" />
              <div>
                <h3 className="text-lg font-bold text-white">Importation Terminée !</h3>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Toutes les transactions sélectionnées ont été injectées avec succès dans la base de données de votre foyer.
                </p>
              </div>

              <button
                onClick={() => {
                  setStep('upload');
                  setProcessedRows([]);
                  setFileName('');
                }}
                className="px-6 py-2.5 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Importer un autre fichier
              </button>
            </div>
          )}

          {/* Loader Overlay */}
          {loading && step !== 'duplicates' && (
            <div className="absolute inset-0 bg-[#07111F]/90 z-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#4F8CFF] animate-spin" />
              <span className="text-xs font-bold text-white">{loadingProgress || 'Traitement du fichier...'}</span>
            </div>
          )}

          {/* Imports History / Rollback section (only on upload screen) */}
          {step === 'upload' && (
            <div className="border-t border-white/8 pt-5 mt-auto shrink-0 flex flex-col space-y-3">
              <div className="flex items-center space-x-2 text-white/50">
                <History className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Historique des imports & Annulations (Rollback)</span>
              </div>

              <div className="border border-white/5 rounded-2xl bg-white/2 max-h-[160px] overflow-y-auto no-scrollbar p-2 space-y-2">
                {historyLoading ? (
                  <div className="py-6 flex items-center justify-center text-xs text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Chargement de l'historique...
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-6 text-center text-xs text-white/30">
                    Aucune importation enregistrée.
                  </div>
                ) : (
                  history.map(item => (
                    <div 
                      key={item.id} 
                      className="p-2.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between text-xs transition-all"
                    >
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-white">{item.filename}</span>
                          <span className="text-[10px] text-white/50">par {item.member_name}</span>
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          Date : {new Date(item.created_at).toLocaleString()} • {item.tx_count} ajouté(s) • {item.ignored_count} ignoré(s)
                        </div>
                      </div>

                      <button
                        onClick={() => handleRollbackImport(item)}
                        title="Annuler cet import (Supprimer les transactions)"
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </>
  );
};
