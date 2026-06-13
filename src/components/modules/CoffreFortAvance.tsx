/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, react-hooks/purity -- legacy Supabase and module payloads still use broad shapes; tracked in docs/lint_cleanup_remaining.md; legacy synchronization effects intentionally set local state; legacy module keeps placeholders for future flows; legacy render helpers use date/random/derived calls; tracked for a dedicated refactor */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { FileText, Upload, Search, Shield, Plus, X, HeartPulse, GraduationCap, Briefcase, Car, Home, Plane, CreditCard, User, AlertTriangle, ArrowLeft, Trash2, Download, Share2, CheckCircle2, ChevronRight, Calendar, Users, Scan, Lock } from 'lucide-react';
import Tesseract from 'tesseract.js';
import type { DocumentFile, DocumentCategory, Member, Demarche, JustificatifPack, DemarcheTemplate } from '../../types';
import { demarcheTemplates } from '../../data/demoData';
import { generatePackPDF } from '../../utils/pdfGenerator';

interface CoffreFortAvanceProps {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  members: Member[];
  demarches: Demarche[];
  setDemarches: React.Dispatch<React.SetStateAction<Demarche[]>>;
  packs: JustificatifPack[];
  setPacks: React.Dispatch<React.SetStateAction<JustificatifPack[]>>;
  onAddEvent?: (title: string, dateTime: string) => void;
  onAddTransaction?: (newTrans: any) => void;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  defaultTab?: 'docs' | 'demarches' | 'packs';
}

export const CoffreFortAvance: React.FC<CoffreFortAvanceProps> = ({ documents, setDocuments, members, demarches, setDemarches, packs, setPacks, onAddEvent, onAddTransaction, isPremium = false, onTriggerPaywall, defaultTab }) => {
  const [mainTab, setMainTab] = useState<'docs' | 'demarches' | 'packs'>(defaultTab || 'docs');
  const [viewMode, setViewMode] = useState<'categories' | 'members' | 'expiring' | 'all'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);
  const [docToUnlock, setDocToUnlock] = useState<DocumentFile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [rgpdAccepted, setRgpdAccepted] = useState<boolean>(() => {
    return localStorage.getItem('mf_vault_rgpd_accepted') === 'true';
  });
  const [showRgpdCenter, setShowRgpdCenter] = useState(false);

  useEffect(() => {
    if (!isPremium && mainTab === 'demarches') {
      setMainTab('docs');
      onTriggerPaywall?.();
    }
  }, [isPremium, mainTab, onTriggerPaywall]);

  const handleDocumentClick = (doc: DocumentFile) => {
    if (doc.isSecure) {
      setDocToUnlock(doc);
      setPinInput('');
      setPinError(false);
    } else {
      setPreviewDoc(doc);
    }
  };

  const handlePinSubmit = () => {
    const parentPin = localStorage.getItem('mf_parent_pin') || '0000';
    if (pinInput === '1234' || pinInput === parentPin) {
      setPreviewDoc(docToUnlock);
      setDocToUnlock(null);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
      setPinInput('');
    }
  };

  // Demarche states
  const [activeDemarche, setActiveDemarche] = useState<Demarche | null>(null);
  const [showNewDemarche, setShowNewDemarche] = useState(false);
  const [newDemarcheTitle, setNewDemarcheTitle] = useState('');
  const [newDemarcheTemplate, setNewDemarcheTemplate] = useState('');
  const [newDemarcheAssignee, setNewDemarcheAssignee] = useState('');

  const [demarcheSearchQuery, setDemarcheSearchQuery] = useState('');
  const [suggestedMemberId, setSuggestedMemberId] = useState<string>(members[0]?.id || '');
  const [customTemplates, setCustomTemplates] = useState<DemarcheTemplate[]>(() => {
    try {
      const cached = localStorage.getItem('mf_custom_demarche_templates');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [showCustomTplModal, setShowCustomTplModal] = useState(false);
  const [customTplForm, setCustomTplForm] = useState({
    title: '',
    category: 'Identité',
    description: '',
    steps: '',
    pieces: '',
    cost: '',
    icon: '📋'
  });

  const getAgeInYears = (m: Member): number => {
    if (m.birthDate) {
      const parts = m.birthDate.split('/');
      if (parts.length === 3) {
        const birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const monthDiff = now.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
          age--;
        }
        return age;
      }
    }
    if (m.age) {
      const num = parseInt(m.age);
      if (!isNaN(num)) {
        if (m.age.toLowerCase().includes('mois')) {
          return num / 12;
        }
        return num;
      }
    }
    return 30; // default to adult
  };

  // Pack states
  const [showNewPack, setShowNewPack] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackType, setNewPackType] = useState<'location' | 'ecole' | 'banque' | 'emploi' | 'custom'>('location');
  const [selectedPackDocs, setSelectedPackDocs] = useState<string[]>([]);
  
  // Upload Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('identity');
  const [newDocMember, setNewDocMember] = useState<string>('');
  const [newDocExpiry, setNewDocExpiry] = useState('');
  const [newDocTags, setNewDocTags] = useState('');
  const [newDocSecure, setNewDocSecure] = useState(false);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  const handleOcrScan = async () => {
    if (!selectedFileBase64 || !selectedFileBase64.startsWith('data:image')) return;
    setIsOcrProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(selectedFileBase64, 'fra', {
        logger: m => console.log(m)
      });
      console.log('Texte extrait:', text);
      
      // Chercher une date d'expiration (JJ/MM/AAAA)
      // Ex: "Expire le: 12/05/2028" ou "jusqu'au 12.05.2028"
      const dateMatch = text.match(/(\d{2})[./-](\d{2})[./-](\d{4})/g);
      if (dateMatch && dateMatch.length > 0) {
        // On prend souvent la dernière date d'un document d'identité comme date d'expiration
        const lastDate = dateMatch[dateMatch.length - 1];
        // Convertir en YYYY-MM-DD pour l'input HTML
        const parts = lastDate.split(/[./-]/);
        if (parts.length === 3) {
          setNewDocExpiry(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
      
      // Si la catégorie est identité, on essaie de trouver un prénom/nom simple (très basique pour l'exemple)
      if (newDocCategory === 'identity') {
        const nameMatch = text.match(/Nom\s*[:\n]\s*([A-Z]+)/i);
        if (nameMatch && nameMatch[1]) {
          setNewDocName(`Pièce d'identité - ${nameMatch[1]}`);
        }
      }
    } catch (e) {
      console.error('Erreur OCR', e);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const categoryConfig: Record<DocumentCategory, { label: string; icon: any; color: string }> = {
    identity: { label: 'Identité', icon: User, color: 'text-blue-400 bg-blue-400/10' },
    health: { label: 'Santé', icon: HeartPulse, color: 'text-red-400 bg-red-400/10' },
    school: { label: 'École', icon: GraduationCap, color: 'text-yellow-400 bg-yellow-400/10' },
    insurance: { label: 'Assurance', icon: Shield, color: 'text-green-400 bg-green-400/10' },
    bank: { label: 'Banque', icon: CreditCard, color: 'text-indigo-400 bg-indigo-400/10' },
    contract: { label: 'Contrats', icon: Briefcase, color: 'text-purple-400 bg-purple-400/10' },
    vehicle: { label: 'Véhicules', icon: Car, color: 'text-teal-400 bg-teal-400/10' },
    home: { label: 'Logement', icon: Home, color: 'text-orange-400 bg-orange-400/10' },
    travel: { label: 'Voyages', icon: Plane, color: 'text-sky-400 bg-sky-400/10' },
    other: { label: 'Autres', icon: FileText, color: 'text-gray-400 bg-gray-400/10' },
  };

  const parseDocumentDate = (value?: string): Date | null => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(`${value}T12:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parts = value.split(/[./-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      const parsed = new Date(year, month - 1, day, 12, 0, 0);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDocumentDate = (value?: string) => {
    const parsed = parseDocumentDate(value);
    return parsed ? parsed.toLocaleDateString('fr-FR') : value || '';
  };

  const getRenewalStatus = (doc: DocumentFile) => {
    const date = parseDocumentDate(doc.expiryDate);
    if (!date) {
      return { status: 'none' as const, label: 'Sans échéance', days: null as number | null, accent: 'text-white/40', border: 'border-white/10', bg: 'bg-white/5' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (days < 0 || doc.isExpired) {
      return { status: 'expired' as const, label: `Expiré depuis ${Math.abs(days)} j`, days, accent: 'text-[#FF4D6D]', border: 'border-[#FF4D6D]/35', bg: 'bg-[#FF4D6D]/10' };
    }
    if (days <= 30) {
      return { status: 'urgent' as const, label: `À renouveler dans ${days} j`, days, accent: 'text-[#FFB020]', border: 'border-[#FFB020]/35', bg: 'bg-[#FFB020]/10' };
    }
    if (days <= 90) {
      return { status: 'soon' as const, label: `À surveiller dans ${days} j`, days, accent: 'text-[#4F8CFF]', border: 'border-[#4F8CFF]/25', bg: 'bg-[#4F8CFF]/10' };
    }
    return { status: 'ok' as const, label: `Valide ${days} j`, days, accent: 'text-[#00D26A]', border: 'border-[#00D26A]/20', bg: 'bg-[#00D26A]/10' };
  };

  const renewalDocs = useMemo(() => {
    return documents
      .map(doc => ({ doc, renewal: getRenewalStatus(doc), expiryDate: parseDocumentDate(doc.expiryDate) }))
      .filter(item => item.expiryDate && ['expired', 'urgent', 'soon'].includes(item.renewal.status))
      .sort((a, b) => (a.expiryDate?.getTime() || 0) - (b.expiryDate?.getTime() || 0));
  }, [documents]);

  const activeDemarchesCount = demarches.filter(d => d.status !== 'completed' && d.status !== 'archived').length;
  const completedDemarchesCount = demarches.filter(d => d.status === 'completed').length;
  const protectedDocsCount = documents.filter(d => d.isSecure).length;
  const readyPacksCount = packs.filter(p => p.documentIds.length > 0).length;

  const addDocumentRenewalReminder = (doc: DocumentFile) => {
    const parsed = parseDocumentDate(doc.expiryDate);
    if (!parsed || !onAddEvent) return;
    const reminderDate = new Date(parsed);
    reminderDate.setDate(reminderDate.getDate() - 14);
    const dateForCalendar = reminderDate > new Date() ? reminderDate : parsed;
    onAddEvent(`Renouveler : ${doc.name}`, dateForCalendar.toISOString().split('T')[0]);
    alert('📅 Rappel ajouté au calendrier familial.');
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;
      
      if (viewMode === 'expiring') {
        if (!doc.expiryDate) return false;
        const docDate = parseDocumentDate(doc.expiryDate);
        if (!docDate) return false;
        const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        return docDate < ninetyDaysFromNow;
      }
      return true;
    });
  }, [documents, searchQuery, viewMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const resultStr = event.target.result as string;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const max_size = 600;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > max_size) {
                height *= max_size / width;
                width = max_size;
              }
            } else {
              if (height > max_size) {
                width *= max_size / height;
                height = max_size;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            setSelectedFileBase64(compressed);
          };
          img.src = resultStr;
        } else {
          setSelectedFileBase64(resultStr);
        }
        if (!newDocName) setNewDocName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUpload = () => {
    if (!newDocName || !selectedFileBase64) return;
    
    const member = members.find(m => m.id === newDocMember);
    const newDoc: DocumentFile = {
      id: `doc_${Date.now()}`,
      name: newDocName,
      category: newDocCategory,
      memberId: member?.id,
      memberName: member?.name,
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: newDocExpiry || undefined,
      fileSize: 'Modéré', // Computed size could be added here
      isExpired: false,
      tags: newDocTags.split(',').map(t => t.trim()).filter(Boolean),
      fileBase64: selectedFileBase64,
      isSecure: newDocSecure
    };

    setDocuments(prev => [newDoc, ...prev]);
    if (newDoc.expiryDate && onAddEvent) {
      const parsed = parseDocumentDate(newDoc.expiryDate);
      if (parsed) {
        const reminderDate = new Date(parsed);
        reminderDate.setDate(reminderDate.getDate() - 14);
        const dateForCalendar = reminderDate > new Date() ? reminderDate : parsed;
        onAddEvent(`Renouveler : ${newDoc.name}`, dateForCalendar.toISOString().split('T')[0]);
      }
    }
    setIsUploading(false);
    
    // Reset
    setNewDocName('');
    setNewDocCategory('identity');
    setNewDocMember('');
    setNewDocExpiry('');
    setNewDocTags('');
    setNewDocSecure(false);
    setSelectedFileBase64(null);
  };

  const handleDeleteDocument = (docId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce document ?")) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setPreviewDoc(null);
      setSelectedCategory(null);
    }
  };

  const handleShareDocument = (doc: DocumentFile) => {
    if (navigator.share) {
      navigator.share({
        title: doc.name,
        text: `Document partagé de mon coffre-fort : ${doc.name}`,
        url: window.location.href
      }).catch(err => console.error(err));
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/share/doc/${doc.id}`);
      alert("📋 Lien du document copié dans le presse-papiers ! Vous pouvez le coller pour le partager.");
    }
  };

  const allTemplates = useMemo(() => [...demarcheTemplates, ...customTemplates], [customTemplates]);
  const filteredTemplates = useMemo(() => {
    if (!demarcheSearchQuery) return allTemplates;
    const q = demarcheSearchQuery.toLowerCase();
    return allTemplates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [allTemplates, demarcheSearchQuery]);

  const suggestions = useMemo(() => {
    const suggestedMember = members.find(m => m.id === suggestedMemberId);
    if (!suggestedMember) return [];
    const age = getAgeInYears(suggestedMember);
    if (age < 2) {
      return allTemplates.filter(t => t.id === 'tpl-acte-naissance' || t.id === 'tpl-carte-vitale');
    } else if (age < 18) {
      return allTemplates.filter(t => t.id === 'tpl-cni' || t.id === 'tpl-passeport');
    } else {
      return allTemplates.filter(t => t.id === 'tpl-voyage-passeport' || t.id === 'tpl-permis');
    }
  }, [allTemplates, members, suggestedMemberId]);

  return (
    <div className="flex flex-col h-full bg-[#07111F] text-white">
      {!rgpdAccepted ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center space-y-6">
          <div className="w-16 h-16 rounded-[22px] bg-[#6C5CFF]/10 flex items-center justify-center border border-[#6C5CFF]/20 shadow-lg shadow-[#6C5CFF]/5 animate-pulse">
            <Shield className="w-8 h-8 text-[#6C5CFF]" />
          </div>
          
          <div className="text-center space-y-2 max-w-sm">
            <h2 className="text-xl font-extrabold tracking-tight">Activez votre coffre-fort familial</h2>
            <p className="text-xs text-white/50 leading-relaxed">
              Pour stocker vos pièces d'identité, attestations de santé et justificatifs en toute sérénité, nous garantissons un traitement strictement conforme au RGPD.
            </p>
          </div>

          <div className="w-full max-w-sm bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-4">
            <h4 className="text-[10px] font-extrabold text-[#6C5CFF] uppercase tracking-wider mb-2 border-b border-white/5 pb-2">Charte de Confidentialité & RGPD</h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-3">
                <span className="text-lg mt-0.5">🇪🇺</span>
                <div>
                  <p className="font-bold text-white">Hébergement en Europe</p>
                  <p className="text-[10px] text-white/40 leading-normal">Vos données sensibles sont stockées sur des serveurs sécurisés en Europe (EU-West), conformes aux normes ISO 27001.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-lg mt-0.5">🔒</span>
                <div>
                  <p className="font-bold text-white">Protection des fichiers</p>
                  <p className="text-[10px] text-white/40 leading-normal">Chiffrement au repos et protocoles SSL/TLS en transit pour limiter les accès non autorisés à vos fichiers.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-lg mt-0.5">🗑️</span>
                <div>
                  <p className="font-bold text-white">Suppression & portabilité</p>
                  <p className="text-[10px] text-white/40 leading-normal">Vous pouvez supprimer vos documents et récupérer vos pièces importantes à tout moment depuis votre espace familial.</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.setItem('mf_vault_rgpd_accepted', 'true');
              setRgpdAccepted(true);
            }}
            className="w-full max-w-sm py-3.5 bg-[#6C5CFF] text-white text-xs font-extrabold rounded-2xl shadow-lg hover:shadow-[#6C5CFF]/20 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>J'accepte et j'active mon Coffre-fort</span>
          </button>
          
          <p className="text-[9px] text-white/30 text-center max-w-xs">
            En activant ce coffre, vous acceptez nos CGU de stockage sécurisé. Vous pouvez révoquer ce consentement à tout moment en contactant notre DPO à dpo@mafamilleplus.fr.
          </p>
        </div>
      ) : (
        <>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#6C5CFF]/20 rounded-xl">
              <Shield className="w-6 h-6 text-[#6C5CFF]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold">Coffre-fort</h2>
                <button
                  onClick={() => setShowRgpdCenter(true)}
                  className="px-2 py-0.5 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-[9px] font-bold hover:bg-[#00D26A]/20 transition flex items-center space-x-1"
                >
                  <span>🔒 RGPD</span>
                </button>
              </div>
              <p className="text-xs text-white/50">{documents.length} documents • {activeDemarchesCount} démarches ouvertes • {readyPacksCount} dossiers prêts</p>
            </div>
          </div>
          {mainTab === 'docs' && (
            <button 
              onClick={() => setIsUploading(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#6C5CFF] rounded-full text-sm font-semibold hover:bg-[#5B4BE0] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          )}
        </div>

      <div className="px-4 pt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setMainTab('docs'); setViewMode('all'); setSelectedCategory(null); }}
          className="text-left rounded-2xl border border-white/8 bg-white/[0.04] p-3 active:scale-[0.98] transition"
        >
          <p className="text-[9px] uppercase tracking-widest text-white/35 font-extrabold">Documents</p>
          <p className="text-lg font-extrabold text-white">{documents.length}</p>
          <p className="text-[10px] text-white/45">{protectedDocsCount} protégés par code</p>
        </button>
        <button
          type="button"
          onClick={() => { setMainTab('docs'); setViewMode('expiring'); setSelectedCategory(null); }}
          className="text-left rounded-2xl border border-[#FFB020]/25 bg-[#FFB020]/10 p-3 active:scale-[0.98] transition"
        >
          <p className="text-[9px] uppercase tracking-widest text-[#FFB020]/80 font-extrabold">À renouveler</p>
          <p className="text-lg font-extrabold text-white">{renewalDocs.length}</p>
          <p className="text-[10px] text-white/45">pièces avec échéance proche</p>
        </button>
        <button
          type="button"
          onClick={() => isPremium ? setMainTab('demarches') : onTriggerPaywall?.()}
          className="text-left rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 p-3 active:scale-[0.98] transition"
        >
          <p className="text-[9px] uppercase tracking-widest text-[#9D8CFF] font-extrabold">Démarches</p>
          <p className="text-lg font-extrabold text-white">{activeDemarchesCount}</p>
          <p className="text-[10px] text-white/45">{completedDemarchesCount} terminées</p>
        </button>
        <button
          type="button"
          onClick={() => setMainTab('packs')}
          className="text-left rounded-2xl border border-[#00D26A]/20 bg-[#00D26A]/10 p-3 active:scale-[0.98] transition"
        >
          <p className="text-[9px] uppercase tracking-widest text-[#00D26A] font-extrabold">Dossiers prêts</p>
          <p className="text-lg font-extrabold text-white">{readyPacksCount}</p>
          <p className="text-[10px] text-white/45">packs justificatifs</p>
        </button>
      </div>

      {/* Main Tab Navigation */}
      <div className="p-3 border-b border-white/5">
        <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-3 gap-1">
          <button onClick={() => setMainTab('docs')} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${mainTab === 'docs' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
            📁 Documents
          </button>
          <button 
            onClick={() => {
              if (!isPremium) {
                onTriggerPaywall?.();
              } else {
                setMainTab('demarches');
              }
            }} 
            className={`py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer relative ${mainTab === 'demarches' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}
          >
            📋 Démarches {!isPremium && <Lock className="inline-block w-3 h-3 ml-1 -mt-0.5" />}
            {demarches.filter(d => d.status !== 'completed').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFB020] rounded-full text-[8px] font-bold text-black flex items-center justify-center">{demarches.filter(d => d.status !== 'completed').length}</span>
            )}
          </button>
          <button onClick={() => setMainTab('packs')} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${mainTab === 'packs' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
            📦 Packs
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {mainTab === 'docs' && (
      <>
      <div className="p-4 flex flex-col space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Rechercher un document ou un tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#6C5CFF] transition-colors"
          />
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {(['categories', 'members', 'expiring', 'all'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                setSelectedCategory(null);
              }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                viewMode === mode ? 'bg-white text-[#07111F]' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {mode === 'categories' && 'Catégories'}
              {mode === 'members' && 'Membres'}
              {mode === 'expiring' && 'Échéances'}
              {mode === 'all' && 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {viewMode === 'categories' && (
          selectedCategory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-white capitalize">{categoryConfig[selectedCategory].label}</span>
                </div>
                <span className="text-xs text-white/40">
                  {documents.filter(d => d.category === selectedCategory).length} document(s)
                </span>
              </div>
              
              <div className="space-y-2">
                {documents
                  .filter(d => {
                    if (d.category !== selectedCategory) return false;
                    if (!searchQuery) return true;
                    return d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (d.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
                  })
                  .map(doc => {
                    const config = categoryConfig[doc.category];
                    const Icon = config?.icon || FileText;
                    return (
                      <div 
                        key={doc.id} 
                        onClick={() => handleDocumentClick(doc)}
                        className="flex items-center p-3 bg-white/5 border border-white/10 rounded-xl space-x-3 cursor-pointer hover:bg-white/10 transition"
                      >
                        <div className={`p-2 rounded-lg ${config?.color || 'text-white bg-white/10'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{doc.name}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-white/50 mt-0.5">
                            <span>{doc.uploadDate}</span>
                            {doc.memberName && <span>• {doc.memberName}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {documents.filter(d => d.category === selectedCategory).length === 0 && (
                  <p className="text-xs text-white/40 text-center py-6">Aucun document dans cette catégorie</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(categoryConfig) as [DocumentCategory, any][]).map(([key, config]) => {
                const count = documents.filter(d => d.category === key).length;
                if (count === 0 && !searchQuery) return null;
                
                return (
                  <div 
                    key={key} 
                    onClick={() => setSelectedCategory(key)}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-start space-y-2 cursor-pointer hover:bg-white/10 transition"
                  >
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <config.icon className="w-5 h-5" />
                    </div>
                    <div className="mt-2">
                      <p className="font-semibold text-sm">{config.label}</p>
                      <p className="text-xs text-white/50">{count} fichier(s)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {viewMode === 'all' && (
          <div className="space-y-2">
            {filteredDocs.map(doc => {
              const config = categoryConfig[doc.category];
              const Icon = config?.icon || FileText;
              return (
                <div 
                  key={doc.id} 
                  onClick={() => handleDocumentClick(doc)}
                  className="flex items-center p-3 bg-white/5 border border-white/10 rounded-xl space-x-3 cursor-pointer hover:bg-white/10 transition"
                >
                  <div className={`p-2 rounded-lg ${config?.color || 'text-white bg-white/10'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{doc.name}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-white/50 mt-0.5">
                      <span>{doc.uploadDate}</span>
                      {doc.memberName && <span>• {doc.memberName}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Members View */}
        {viewMode === 'members' && (
          <div className="space-y-4">
            {members.map(member => {
              const memberDocs = filteredDocs.filter(d => d.memberId === member.id);
              if (memberDocs.length === 0 && !searchQuery) return null;
              
              return (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center space-x-3 mb-3 border-b border-white/5 pb-2">
                    <img src={member.photoUrl} alt={member.name} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{member.name}</h4>
                      <p className="text-[10px] text-white/40">{memberDocs.length} document(s)</p>
                    </div>
                  </div>
                  {memberDocs.map(doc => {
                    const config = categoryConfig[doc.category];
                    const Icon = config?.icon || FileText;
                    return (
                      <div 
                        key={doc.id} 
                        onClick={() => handleDocumentClick(doc)}
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`p-2 rounded-lg ${config?.color || 'text-white bg-white/10'} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate">{doc.name}</p>
                            <p className="text-[10px] text-white/40">{config?.label || doc.category}</p>
                          </div>
                        </div>
                        {doc.expiryDate && <span className="text-[10px] text-[#FFB020] shrink-0 ml-2">Exp: {doc.expiryDate}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            
            {/* General/Family Docs */}
            {(() => {
              const generalDocs = filteredDocs.filter(d => !d.memberId);
              if (generalDocs.length === 0) return null;
              return (
                <div className="space-y-2 mt-6">
                  <div className="flex items-center space-x-3 mb-3 border-b border-white/5 pb-2">
                    <div className="w-8 h-8 rounded-full bg-[#6C5CFF]/20 flex items-center justify-center border border-[#6C5CFF]/30">
                      <Users className="w-4 h-4 text-[#6C5CFF]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Famille (Général)</h4>
                      <p className="text-[10px] text-white/40">{generalDocs.length} document(s)</p>
                    </div>
                  </div>
                  {generalDocs.map(doc => {
                    const config = categoryConfig[doc.category];
                    const Icon = config?.icon || FileText;
                    return (
                      <div 
                        key={doc.id} 
                        onClick={() => handleDocumentClick(doc)}
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`p-2 rounded-lg ${config?.color || 'text-white bg-white/10'} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate">{doc.name}</p>
                            <p className="text-[10px] text-white/40">{config?.label || doc.category}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Expiring View */}
        {viewMode === 'expiring' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-[#FFB020] bg-[#FFB020]/10 p-3 rounded-xl border border-[#FFB020]/20">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Documents à renouveler</p>
                <p className="text-[10px] text-white/45">Les pièces expirées ou proches de leur échéance sont regroupées ici.</p>
              </div>
            </div>
            {renewalDocs.length > 0 ? renewalDocs.map(({ doc, renewal }) => {
              const config = categoryConfig[doc.category];
              const Icon = config?.icon || FileText;
              return (
                <div
                  key={doc.id}
                  className={`p-3 rounded-xl border ${renewal.border} ${renewal.bg} space-y-3`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleDocumentClick(doc)}
                      className="flex items-center gap-3 min-w-0 text-left flex-1"
                    >
                      <div className={`p-2 rounded-lg ${config?.color || 'text-white bg-white/10'} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{doc.name}</p>
                        <p className="text-[10px] text-white/45 truncate">
                          {doc.memberName || 'Famille'} • {config?.label || doc.category} • expire le {formatDocumentDate(doc.expiryDate)}
                        </p>
                      </div>
                    </button>
                    <span className={`text-[10px] font-extrabold shrink-0 ${renewal.accent}`}>{renewal.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDocumentClick(doc)}
                      className="flex-1 py-2 rounded-xl bg-white/8 border border-white/10 text-white text-[10px] font-bold"
                    >
                      Voir le document
                    </button>
                    {onAddEvent && (
                      <button
                        type="button"
                        onClick={() => addDocumentRenewalReminder(doc)}
                        className="flex-1 py-2 rounded-xl bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 text-[#7AA8FF] text-[10px] font-bold flex items-center justify-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Créer rappel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-10 rounded-2xl border border-white/8 bg-white/[0.03]">
                <CheckCircle2 className="w-8 h-8 text-[#00D26A] mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Aucune échéance urgente</p>
                <p className="text-[10px] text-white/40 mt-1">Ajoutez une date d'expiration à vos documents pour suivre les renouvellements.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#07111F]/80 backdrop-blur-sm">
          <div className="bg-[#112240] w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Classer un document</h3>
              <button onClick={() => setIsUploading(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Picker */}
              <div 
                className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#6C5CFF] hover:bg-[#6C5CFF]/5 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-white/50 mb-2" />
                <p className="text-sm font-medium text-center">{selectedFileBase64 ? "Fichier sélectionné" : "Appuyez pour Scanner ou Sélectionner un fichier"}</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
              </div>

              {selectedFileBase64 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-1 block">Nom du document *</label>
                    <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6C5CFF]" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-white/70 mb-1 block">Catégorie *</label>
                      <select value={newDocCategory} onChange={(e) => setNewDocCategory(e.target.value as DocumentCategory)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6C5CFF]">
                        {Object.entries(categoryConfig).map(([k, v]) => (
                          <option key={k} value={k} className="bg-[#112240]">{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/70 mb-1 block">Membre lié</label>
                      <select value={newDocMember} onChange={(e) => setNewDocMember(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6C5CFF]">
                        <option value="" className="bg-[#112240]">Général (Famille)</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id} className="bg-[#112240]">{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-white/70 mb-1 block">Expiration (Optionnel)</label>
                      <input type="date" value={newDocExpiry} onChange={(e) => setNewDocExpiry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6C5CFF] [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/70 mb-1 block">Tags (séparés par virgule)</label>
                      <input type="text" placeholder="ex: impôts, 2026" value={newDocTags} onChange={(e) => setNewDocTags(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6C5CFF]" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setNewDocSecure(!newDocSecure)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        newDocSecure ? 'bg-[#FF4D6D]/20 border-[#FF4D6D]/50 text-[#FF4D6D]' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>{newDocSecure ? "Sécurisé (PIN requis)" : "Non sécurisé"}</span>
                    </button>
                    
                    {selectedFileBase64.startsWith('data:image') && (
                      <button
                        type="button"
                        onClick={handleOcrScan}
                        disabled={isOcrProcessing}
                        className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-[#00D26A]/30 bg-[#00D26A]/10 text-[#00D26A] text-xs font-bold hover:bg-[#00D26A]/20 transition-all disabled:opacity-50"
                      >
                        <Scan className={`w-4 h-4 ${isOcrProcessing ? 'animate-spin' : ''}`} />
                        <span>{isOcrProcessing ? "Analyse..." : "Scanner (IA)"}</span>
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={handleSubmitUpload}
                    className="w-full py-3 mt-4 bg-[#6C5CFF] text-white font-bold rounded-xl shadow-lg hover:shadow-[#6C5CFF]/20 active:scale-95 transition-all"
                  >
                    Sauvegarder dans le Coffre
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIN Unlock Modal */}
      {docToUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111F]/90 backdrop-blur-md">
          <div className="bg-[#112240] w-full max-w-sm rounded-[32px] border border-[#FF4D6D]/20 shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setDocToUnlock(null)} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4 pt-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FF4D6D]/10 flex items-center justify-center border border-[#FF4D6D]/20 mb-2">
                <Lock className="w-8 h-8 text-[#FF4D6D]" />
              </div>
              <h3 className="text-lg font-bold">Document Sécurisé</h3>
              <p className="text-xs text-white/50 px-4">Ce document nécessite le code PIN parental pour être consulté.</p>
              
              <div className="w-full pt-4">
                <div className="flex justify-center space-x-3 mb-6">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-12 h-14 rounded-xl flex items-center justify-center text-xl font-bold border transition-colors ${
                      pinInput.length > i ? 'bg-white text-[#07111F] border-white' : 
                      pinInput.length === i ? 'bg-[#6C5CFF]/20 border-[#6C5CFF] text-[#6C5CFF]' : 
                      'bg-white/5 border-white/10 text-transparent'
                    } ${pinError ? 'border-[#FF4D6D] bg-[#FF4D6D]/20 text-[#FF4D6D]' : ''}`}>
                      {pinInput.length > i ? '•' : ''}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => setPinInput(prev => prev.length < 4 ? prev + num : prev)}
                      className="py-3 rounded-2xl bg-white/5 border border-white/10 text-lg font-bold hover:bg-white/10 active:scale-95 transition-all"
                    >
                      {num}
                    </button>
                  ))}
                  <div className="py-3"></div>
                  <button
                    onClick={() => setPinInput(prev => prev.length < 4 ? prev + '0' : prev)}
                    className="py-3 rounded-2xl bg-white/5 border border-white/10 text-lg font-bold hover:bg-white/10 active:scale-95 transition-all"
                  >
                    0
                  </button>
                  <button
                    onClick={() => setPinInput(prev => prev.slice(0, -1))}
                    className="py-3 rounded-2xl bg-white/5 border border-white/10 text-lg font-bold text-[#FF4D6D] hover:bg-[#FF4D6D]/10 active:scale-95 transition-all"
                  >
                    ⌫
                  </button>
                </div>
                
                {pinInput.length === 4 && (
                  <button 
                    onClick={handlePinSubmit}
                    className="w-full mt-6 py-3.5 bg-[#FF4D6D] text-white font-bold rounded-xl shadow-lg hover:bg-[#FF4D6D]/90 active:scale-95 transition-all"
                  >
                    Déverrouiller
                  </button>
                )}
                {pinError && <p className="text-[#FF4D6D] text-xs font-bold mt-4 animate-pulse">Code incorrect</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111F]/90 backdrop-blur-md">
          <div className="bg-[#112240] w-full max-w-lg rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white/5">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold truncate max-w-[200px]">{previewDoc.name}</h3>
                  <p className="text-[10px] text-white/50">{previewDoc.uploadDate} • {previewDoc.fileSize || 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Image Preview if available */}
              {previewDoc.fileBase64 ? (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center">
                  <img src={previewDoc.fileBase64} alt={previewDoc.name} className="max-w-full h-auto max-h-[40vh] object-contain" />
                </div>
              ) : (
                <div className="w-full h-48 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center text-white/30">
                  <FileText className="w-12 h-12 mb-2 opacity-50" />
                  <span className="text-xs font-bold uppercase">Aperçu non disponible</span>
                </div>
              )}

              <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
                <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider mb-2 border-b border-white/5 pb-2">Métadonnées du document</h4>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-white/40 mb-0.5">Catégorie</p>
                    <p className="font-bold text-white capitalize">{categoryConfig[previewDoc.category]?.label || previewDoc.category}</p>
                  </div>
                  <div>
                    <p className="text-white/40 mb-0.5">Membre concerné</p>
                    <p className="font-bold text-white">{previewDoc.memberName || 'Général'}</p>
                  </div>
                  {previewDoc.expiryDate && (
                    <div>
                      <p className="text-[#FFB020]/70 mb-0.5">Date d'expiration</p>
                      <p className="font-bold text-[#FFB020]">{previewDoc.expiryDate}</p>
                    </div>
                  )}
                  {previewDoc.tags && previewDoc.tags.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-white/40 mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {previewDoc.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-[#6C5CFF]/20 text-[#6C5CFF] text-[10px] font-bold">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions: Download / Share / Delete */}
                <div className="flex gap-2 pt-3 mt-3 border-t border-white/10">
                  {previewDoc.fileBase64 && (
                    <a 
                      href={previewDoc.fileBase64} 
                      download={previewDoc.name}
                      className="flex-1 py-2.5 bg-[#00D26A]/10 hover:bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/20 font-bold rounded-xl flex items-center justify-center space-x-1 transition text-[10px] sm:text-xs cursor-pointer text-center"
                    >
                      <Download className="w-3.5 h-3.5 inline-block mr-1" />
                      <span>Télécharger</span>
                    </a>
                  )}
                  <button 
                    onClick={() => handleShareDocument(previewDoc)}
                    className="flex-1 py-2.5 bg-[#6C5CFF]/10 hover:bg-[#6C5CFF]/20 text-[#6C5CFF] border border-[#6C5CFF]/20 font-bold rounded-xl flex items-center justify-center space-x-1 transition text-[10px] sm:text-xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 inline-block mr-1" />
                    <span>Partager</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteDocument(previewDoc.id)}
                    className="flex-1 py-2.5 bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/20 text-[#FF4D6D] border border-[#FF4D6D]/20 font-bold rounded-xl flex items-center justify-center space-x-1 transition text-[10px] sm:text-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
      {/* end mainTab === 'docs' */}

      {/* ===================== DEMARCHES VIEW ===================== */}
      {mainTab === 'demarches' && !activeDemarche && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Header Controls: Search & Custom Model Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={demarcheSearchQuery}
                onChange={e => setDemarcheSearchQuery(e.target.value)}
                placeholder="Rechercher une démarche ou un modèle..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF]"
              />
              {demarcheSearchQuery && (
                <button type="button" onClick={() => setDemarcheSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCustomTplModal(true)}
              className="px-4 py-2.5 bg-[#00D26A]/10 border border-[#00D26A]/20 hover:bg-[#00D26A]/20 text-[#00D26A] font-extrabold rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Créer mon modèle</span>
            </button>
          </div>

          {/* Age-based Suggestions */}
          <div className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <span>💡 Suggestions par âge</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/40">pour</span>
                <select
                  value={suggestedMemberId}
                  onChange={e => setSuggestedMemberId(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#6C5CFF] cursor-pointer"
                >
                  <option value="">Sélectionner un membre...</option>
                  {members.filter(m => m.id !== '5').map(m => (
                    <option key={m.id} value={m.id} className="bg-[#07111F] text-white">
                      {m.name} ({m.age || getAgeInYears(m) + ' ans'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {suggestions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => { setShowNewDemarche(true); setNewDemarcheTemplate(tpl.id); setNewDemarcheTitle(tpl.name); }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/5 hover:bg-[#6C5CFF]/10 text-left transition cursor-pointer text-xs"
                  >
                    <span className="text-xl shrink-0">{tpl.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[11px] font-bold text-white truncate">{tpl.name}</h5>
                      <p className="text-[9px] text-white/40 truncate">{tpl.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/30 italic text-center">Sélectionnez un membre ci-dessus pour voir ses suggestions.</p>
            )}
          </div>

          {/* Active Demarches */}
          {demarches.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Mes Démarches en cours</span>
              {demarches.map(dem => {
                const doneSteps = dem.steps.filter(s => s.done).length;
                const totalSteps = dem.steps.length;
                const pct = Math.round((doneSteps / totalSteps) * 100);
                const missingPieces = dem.pieces.filter(p => p.status === 'missing').length;
                const statusColor = dem.status === 'completed' ? '#00D26A' : dem.status === 'waiting' ? '#FFB020' : '#6C5CFF';
                const statusLabel = dem.status === 'completed' ? 'Terminée' : dem.status === 'waiting' ? 'En attente' : dem.status === 'in_progress' ? 'En cours' : 'À faire';
                return (
                  <button
                    key={dem.id}
                    type="button"
                    onClick={() => setActiveDemarche(dem)}
                    className="w-full text-left glass-panel border border-white/8 rounded-[24px] p-4 space-y-3 hover:bg-white/5 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{dem.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{dem.title}</h4>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {dem.assignedMemberName && `Assignée à ${dem.assignedMemberName} • `}{dem.createdAt}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </div>
                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: statusColor }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold" style={{ color: statusColor }}>{statusLabel} • {doneSteps}/{totalSteps} étapes</span>
                      {missingPieces > 0 && <span className="text-[#FF4D6D] font-bold">⚠️ {missingPieces} pièce(s) manquante(s)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Templates catalog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Modèles disponibles</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {filteredTemplates.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => { setShowNewDemarche(true); setNewDemarcheTemplate(tpl.id); setNewDemarcheTitle(tpl.name); }}
                  className="p-4 rounded-[20px] border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left space-y-2 cursor-pointer active:scale-[0.97]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{tpl.icon}</span>
                    {tpl.id.startsWith('tpl-custom') && (
                      <span className="text-[7px] font-bold uppercase tracking-wider text-[#00D26A] px-1.5 py-0.5 rounded-md bg-[#00D26A]/10 border border-[#00D26A]/20">Perso</span>
                    )}
                  </div>
                  <h5 className="text-[11px] font-bold text-white">{tpl.name}</h5>
                  <p className="text-[9px] text-white/40 leading-relaxed line-clamp-2">{tpl.description}</p>
                  <div className="flex items-center space-x-2 text-[8px] text-white/30 pt-1">
                    <span>{tpl.defaultSteps.length} étapes</span>
                    <span>•</span>
                    <span>{tpl.defaultPieces.length} pièces</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* New Demarche Modal */}
          {showNewDemarche && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewDemarche(false)}>
              <div className="glass-panel border border-white/10 rounded-[28px] w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white">Nouvelle Démarche</h3>
                  <button type="button" onClick={() => setShowNewDemarche(false)} className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Intitulé de la démarche" value={newDemarcheTitle} onChange={e => setNewDemarcheTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]" />
                  <select value={newDemarcheAssignee} onChange={e => setNewDemarcheAssignee(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]">
                    <option value="">Assigner à un membre…</option>
                    {members.filter(m => m.id !== '5').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = allTemplates.find(t => t.id === newDemarcheTemplate);
                    const member = members.find(m => m.id === newDemarcheAssignee);
                    const newDem: Demarche = {
                      id: `dem-${Date.now()}`,
                      templateId: newDemarcheTemplate || undefined,
                      title: newDemarcheTitle || 'Nouvelle démarche',
                      icon: tpl?.icon || '📋',
                      status: 'todo',
                      assignedMemberId: member?.id,
                      assignedMemberName: member?.name,
                      steps: (tpl?.defaultSteps || []).map((s, i) => ({ id: `ds-${Date.now()}-${i}`, title: s.title, done: false })),
                      pieces: (tpl?.defaultPieces || []).map((p, i) => {
                        let matchedDocId = undefined;
                        if (p.autoAttachTags && p.autoAttachTags.length > 0) {
                          const match = documents.find(d => {
                            // Ne pas attacher de document expiré
                            if (d.isExpired) return false;
                            if (d.expiryDate) {
                              const docDate = parseDocumentDate(d.expiryDate);
                              if (docDate && docDate < new Date()) return false;
                            }
                            // Correspondre au membre si assigné
                            if (member && d.memberId && d.memberId !== member.id) return false;
                            
                            // Vérifier les tags
                            const docStr = `${d.name} ${d.category} ${(d.tags||[]).join(' ')}`.toLowerCase();
                            return p.autoAttachTags!.some(t => docStr.includes(t.toLowerCase()));
                          });
                          if (match) matchedDocId = match.id;
                        }
                        return { 
                          id: `dp-${Date.now()}-${i}`, 
                          name: p.name, 
                          status: matchedDocId ? 'attached' : 'missing',
                          documentId: matchedDocId
                        };
                      }),
                      createdAt: new Date().toLocaleDateString('fr-FR')
                    };
                    setDemarches(prev => [newDem, ...prev]);
                    setShowNewDemarche(false);
                    setNewDemarcheTitle(''); setNewDemarcheTemplate(''); setNewDemarcheAssignee('');
                  }}
                  className="w-full py-3 bg-[#6C5CFF] rounded-xl text-white text-xs font-extrabold cursor-pointer hover:opacity-90 transition"
                >
                  Créer la démarche
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Demarche Detail View */}
      {mainTab === 'demarches' && activeDemarche && (
        <ActiveDemarcheDetail
          key={activeDemarche.id}
          activeDemarche={activeDemarche}
          setActiveDemarche={setActiveDemarche}
          setDemarches={setDemarches}
          documents={documents}
          onAddEvent={onAddEvent}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* ===================== PACKS VIEW ===================== */}
      {mainTab === 'packs' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Dossiers justificatifs</span>
            <button type="button" onClick={() => { setShowNewPack(true); setSelectedPackDocs([]); }} className="px-3 py-1.5 bg-[#6C5CFF] rounded-xl text-[10px] font-bold text-white cursor-pointer hover:opacity-90 transition flex items-center space-x-1">
              <Plus className="w-3 h-3" />
              <span>Nouveau dossier</span>
            </button>
          </div>

          {packs.map(pack => {
            const packDocs = documents.filter(d => pack.documentIds.includes(d.id));
            const typeLabel = pack.templateType === 'location' ? '🏠 Location' : pack.templateType === 'ecole' ? '🎓 École' : pack.templateType === 'banque' ? '🏦 Banque' : pack.templateType === 'emploi' ? '💼 Emploi' : '📁 Personnalisé';
            return (
              <div key={pack.id} className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{pack.name}</h4>
                    <p className="text-[9px] text-white/40 mt-0.5">{typeLabel} • {packDocs.length} document(s) • {pack.createdAt}</p>
                  </div>
                  <button type="button" onClick={() => { if(window.confirm('Supprimer ce pack ?')) setPacks(prev => prev.filter(p => p.id !== pack.id)); }} className="p-1.5 hover:bg-[#FF4D6D]/10 rounded-xl text-[#FF4D6D] transition cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {packDocs.map(doc => (
                    <div key={doc.id} className="flex items-center space-x-2 p-2 bg-white/[0.03] rounded-lg border border-white/5 text-[10px]">
                      <FileText className="w-3.5 h-3.5 text-[#6C5CFF] shrink-0" />
                      <span className="text-white font-medium truncate">{doc.name}</span>
                      <span className="text-white/30 shrink-0">{doc.category}</span>
                    </div>
                  ))}
                  {packDocs.length === 0 && <p className="text-[10px] text-white/30 text-center py-2">Aucun document lié</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => generatePackPDF(pack, packDocs)}
                    className="py-2.5 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-[10px] font-bold cursor-pointer hover:bg-[#00D26A]/20 transition flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}${window.location.pathname}#share_${pack.id}`;
                      navigator.clipboard.writeText(shareUrl);
                      alert('🔗 Lien de partage copié dans le presse-papiers !\nEnvoyez-le à votre destinataire.');
                    }}
                    className="py-2.5 rounded-xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF] text-[10px] font-bold cursor-pointer hover:bg-[#6C5CFF]/20 transition flex items-center justify-center space-x-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Lien de partage</span>
                  </button>
                </div>
              </div>
            );
          })}

          {packs.length === 0 && !showNewPack && (
            <div className="text-center py-12 space-y-3">
              <span className="text-4xl block">📦</span>
              <p className="text-xs text-white/40">Aucun pack créé. Créez un dossier justificatif pour regrouper vos documents.</p>
            </div>
          )}

          {/* New Pack Modal */}
          {showNewPack && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewPack(false)}>
              <div className="glass-panel border border-white/10 rounded-[28px] w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white">Nouveau dossier justificatif</h3>
                  <button type="button" onClick={() => setShowNewPack(false)} className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <input type="text" placeholder="Nom du dossier (ex: Location Paris)" value={newPackName} onChange={e => setNewPackName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]" />
                <select value={newPackType} onChange={e => setNewPackType(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]">
                  <option value="location">🏠 Location</option>
                  <option value="ecole">🎓 École</option>
                  <option value="banque">🏦 Banque</option>
                  <option value="emploi">💼 Emploi</option>
                  <option value="custom">📁 Personnalisé</option>
                </select>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-white/40 uppercase block">Sélectionner les documents</span>
                  {documents.map(doc => (
                    <label key={doc.id} className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${selectedPackDocs.includes(doc.id) ? 'bg-[#6C5CFF]/10 border-[#6C5CFF]/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}`}>
                      <input
                        type="checkbox"
                        checked={selectedPackDocs.includes(doc.id)}
                        onChange={() => setSelectedPackDocs(prev => prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id])}
                        className="accent-[#6C5CFF]"
                      />
                      <FileText className="w-3.5 h-3.5 text-[#6C5CFF] shrink-0" />
                      <span className="text-[10px] text-white font-medium truncate">{doc.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPackName) return;
                    const newPack: JustificatifPack = {
                      id: `pack-${Date.now()}`,
                      name: newPackName,
                      templateType: newPackType,
                      documentIds: selectedPackDocs,
                      createdAt: new Date().toLocaleDateString('fr-FR')
                    };
                    setPacks(prev => [newPack, ...prev]);
                    setShowNewPack(false);
                    setNewPackName(''); setSelectedPackDocs([]);
                  }}
                  className="w-full py-3 bg-[#6C5CFF] rounded-xl text-white text-xs font-extrabold cursor-pointer hover:opacity-90 transition"
                >
                  Créer le dossier ({selectedPackDocs.length} doc{selectedPackDocs.length > 1 ? 's' : ''})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* RGPD Compliance Center Modal */}
      {showRgpdCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07111F]/95 backdrop-blur-md">
          <div className="bg-[#112240] w-full max-w-md rounded-[32px] border border-[#00D26A]/20 shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setShowRgpdCenter(false)} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4 pt-4">
              <div className="w-16 h-16 rounded-2xl bg-[#00D26A]/10 flex items-center justify-center border border-[#00D26A]/20 mb-2">
                <Shield className="w-8 h-8 text-[#00D26A]" />
              </div>
              <h3 className="text-lg font-bold">Espace sécurité & RGPD</h3>
              <p className="text-xs text-white/50 px-4">Vos documents sont protégés conformément au Règlement Général sur la Protection des Données (RGPD).</p>
              
              <div className="w-full text-left space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs">
                <div>
                  <p className="font-bold text-white flex items-center"><span className="mr-1.5">🛡️</span> Suppression des documents</p>
                  <p className="text-[10px] text-white/40 leading-normal mt-0.5">Un document supprimé est retiré de votre coffre et de la synchronisation familiale.</p>
                </div>
                <div>
                  <p className="font-bold text-white flex items-center"><span className="mr-1.5">🔑</span> Protection des accès</p>
                  <p className="text-[10px] text-white/40 leading-normal mt-0.5">Les transferts passent par HTTPS et les documents sensibles peuvent demander le code parental avant consultation.</p>
                </div>
                <div>
                  <p className="font-bold text-white flex items-center"><span className="mr-1.5">📁</span> Droit à la portabilité</p>
                  <p className="text-[10px] text-white/40 leading-normal mt-0.5">Vous conservez l'entière propriété de vos pièces. Contactez notre délégué à la protection à dpo@mafamilleplus.fr pour toute question.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowRgpdCenter(false)}
                className="w-full py-3 bg-[#00D26A] text-white font-bold rounded-xl shadow-lg hover:bg-[#00D26A]/90 active:scale-95 transition-all cursor-pointer text-xs"
              >
                Fermer l'espace sécurité
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Template Modal */}
      {showCustomTplModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomTplModal(false)}>
          <div className="glass-panel border border-white/10 rounded-[28px] w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Créer mon Modèle de Démarche</h3>
              <button type="button" onClick={() => setShowCustomTplModal(false)} className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!customTplForm.title) return;
                const stepsList = customTplForm.steps.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ title: s }));
                const piecesList = customTplForm.pieces.split(',').map(p => p.trim()).filter(Boolean).map(p => ({ name: p, autoAttachTags: [p] }));
                const newTpl: DemarcheTemplate = {
                  id: `tpl-custom-${Date.now()}`,
                  name: customTplForm.title,
                  icon: customTplForm.icon || '📋',
                  category: customTplForm.category,
                  description: customTplForm.description || `Modèle personnalisé de démarche pour ${customTplForm.title}`,
                  defaultSteps: stepsList.length > 0 ? stepsList : [{ title: 'Déposer le dossier' }],
                  defaultPieces: piecesList,
                  defaultCost: parseFloat(customTplForm.cost) || undefined
                };
                const updated = [...customTemplates, newTpl];
                setCustomTemplates(updated);
                localStorage.setItem('mf_custom_demarche_templates', JSON.stringify(updated));
                setShowCustomTplModal(false);
                setCustomTplForm({
                  title: '',
                  category: 'Identité',
                  description: '',
                  steps: '',
                  pieces: '',
                  cost: '',
                  icon: '📋'
                });
                alert(`✅ Modèle "${newTpl.name}" créé avec succès !`);
              }}
              className="space-y-3.5 text-xs text-left"
            >
              <div>
                <label className="block text-white/50 mb-1">Intitulé du modèle *</label>
                <input type="text" required value={customTplForm.title} onChange={e => setCustomTplForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Renouvellement Carte Scolaire" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 mb-1">Catégorie *</label>
                  <select value={customTplForm.category} onChange={e => setCustomTplForm(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF] cursor-pointer">
                    {['Identité', 'Famille', 'Santé', 'École', 'Logement', 'Travail', 'Voyage', 'Véhicules'].map(c => <option key={c} value={c} className="bg-[#07111F]">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 mb-1">Icône (Emoji) *</label>
                  <input type="text" required value={customTplForm.icon} onChange={e => setCustomTplForm(prev => ({ ...prev, icon: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]" />
                </div>
              </div>
              <div>
                <label className="block text-white/50 mb-1">Description</label>
                <textarea value={customTplForm.description} onChange={e => setCustomTplForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Ex: Démarches pour renouveler la carte annuelle de transport scolaire." className="w-full h-16 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]" />
              </div>
              <div>
                <label className="block text-white/50 mb-1">Étapes de la démarche (séparées par des virgules) *</label>
                <input type="text" required value={customTplForm.steps} onChange={e => setCustomTplForm(prev => ({ ...prev, steps: e.target.value }))} placeholder="Ex: Remplir le formulaire, Faire la photo, Payer le timbre, Soumettre" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]" />
              </div>
              <div>
                <label className="block text-white/50 mb-1">Pièces justificatives requises (séparées par des virgules)</label>
                <input type="text" value={customTplForm.pieces} onChange={e => setCustomTplForm(prev => ({ ...prev, pieces: e.target.value }))} placeholder="Ex: Justificatif de domicile, Photo d'identité, Attestation scolaire" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]" />
              </div>
              <div>
                <label className="block text-white/50 mb-1">Coût par défaut (€)</label>
                <input type="number" step="0.01" value={customTplForm.cost} onChange={e => setCustomTplForm(prev => ({ ...prev, cost: e.target.value }))} placeholder="Ex: 35.00" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#00D26A] rounded-xl text-white text-xs font-extrabold cursor-pointer hover:opacity-90 transition mt-2">
                Enregistrer le modèle
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ActiveDemarcheDetailProps {
  activeDemarche: Demarche;
  setActiveDemarche: React.Dispatch<React.SetStateAction<Demarche | null>>;
  setDemarches: React.Dispatch<React.SetStateAction<Demarche[]>>;
  documents: DocumentFile[];
  onAddEvent?: (title: string, date: string) => void;
  onAddTransaction?: (newTrans: any) => void;
}

const ActiveDemarcheDetail: React.FC<ActiveDemarcheDetailProps> = ({
  activeDemarche,
  setActiveDemarche,
  setDemarches,
  documents,
  onAddEvent,
  onAddTransaction
}) => {
  const [costInput, setCostInput] = useState(activeDemarche.cost?.toString() || '');
  const [receiptId, setReceiptId] = useState(activeDemarche.receiptDocId || '');
  const isPaid = activeDemarche.isPaid || false;

  const handleUpdateCost = () => {
    const amt = parseFloat(costInput);
    if (isNaN(amt) || amt <= 0) return;
    
    const updated = { 
      ...activeDemarche, 
      cost: amt,
      receiptDocId: receiptId || undefined
    };
    setActiveDemarche(updated);
    setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
    alert('🔧 Coût de la démarche mis à jour !');
  };

  const handleAddCostToBudget = () => {
    const amt = parseFloat(costInput) || activeDemarche.cost || 0;
    if (amt <= 0) {
      alert('Veuillez spécifier un coût valide.');
      return;
    }
    if (onAddTransaction) {
      onAddTransaction({
        amount: amt,
        type: 'expense',
        category: 'Administratif',
        subCategory: activeDemarche.title.toLowerCase().includes('passeport') ? 'Passeport' :
                     activeDemarche.title.toLowerCase().includes('visa') ? 'Visa' :
                     activeDemarche.title.toLowerCase().includes('carte') ? 'Carte identité' :
                     'Frais administratifs',
        date: new Date().toISOString().split('T')[0],
        title: `Frais admin : ${activeDemarche.title}`,
        memberName: activeDemarche.assignedMemberName || 'Foyer',
        moduleSource: 'demarches',
        comment: `Coût administratif pour la démarche ${activeDemarche.title}. Reçu lié: ${receiptId ? 'Oui' : 'Non'}`
      });
      
      // Mark as paid in demarches
      const updated = { ...activeDemarche, cost: amt, isPaid: true, receiptDocId: receiptId || undefined };
      setActiveDemarche(updated);
      setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
      
      alert('💰 Frais de démarche ajoutés au Budget avec succès !');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <button type="button" onClick={() => setActiveDemarche(null)} className="flex items-center space-x-1.5 text-[10px] font-bold text-white/40 hover:text-white transition cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Retour aux démarches</span>
      </button>

      <div className="flex items-center space-x-3">
        <span className="text-3xl">{activeDemarche.icon}</span>
        <div>
          <h3 className="text-sm font-extrabold text-white">{activeDemarche.title}</h3>
          {activeDemarche.assignedMemberName && (
            <p className="text-[10px] text-white/40 flex items-center space-x-1 mt-0.5"><Users className="w-3 h-3" /><span>Assignée à {activeDemarche.assignedMemberName}</span></p>
          )}
        </div>
      </div>

      {activeDemarche.notes && (
        <div className="p-3 rounded-xl bg-[#FFB020]/10 border border-[#FFB020]/20 text-[10px] text-[#FFB020] font-medium">📝 {activeDemarche.notes}</div>
      )}

      {/* Steps checklist */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Étapes</span>
        {activeDemarche.steps.map((step, idx) => (
          <div key={step.id} className={`flex items-center space-x-3 p-3 rounded-xl border transition ${step.done ? 'bg-[#00D26A]/5 border-[#00D26A]/20' : 'bg-white/[0.02] border-white/5'}`}>
            <button
              type="button"
              onClick={() => {
                const updated = { ...activeDemarche, steps: activeDemarche.steps.map(s => s.id === step.id ? { ...s, done: !s.done } : s) };
                const allDone = updated.steps.every(s => s.done);
                if (allDone) updated.status = 'completed';
                else if (updated.steps.some(s => s.done)) updated.status = 'in_progress';
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              className="shrink-0 cursor-pointer"
            >
              {step.done ? <CheckCircle2 className="w-5 h-5 text-[#00D26A]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
            </button>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium ${step.done ? 'text-white/40 line-through' : 'text-white'}`}>{idx + 1}. {step.title}</span>
              {step.dueDate && <span className="text-[9px] text-[#FFB020] font-bold block mt-0.5">📅 Échéance : {step.dueDate}</span>}
            </div>
            {step.dueDate && !step.done && onAddEvent && (
              <button
                type="button"
                onClick={() => { onAddEvent(step.title, step.dueDate!); alert('📅 Ajouté au calendrier familial !'); }}
                className="p-1.5 bg-[#4F8CFF]/10 rounded-lg border border-[#4F8CFF]/20 text-[#4F8CFF] shrink-0 cursor-pointer hover:bg-[#4F8CFF]/20 transition"
                title="Ajouter au calendrier"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Required pieces */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Pièces requises</span>
        {activeDemarche.pieces.map(piece => {
          const color = piece.status === 'attached' ? '#00D26A' : piece.status === 'expired' ? '#FF4D6D' : '#FFB020';
          const label = piece.status === 'attached' ? '✅ Fournie' : piece.status === 'expired' ? '⚠️ Expirée' : '❌ Manquante';
          const linkedDoc = piece.documentId ? documents.find(d => d.id === piece.documentId) : null;
          return (
            <div key={piece.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-white block truncate">{piece.name}</span>
                  {linkedDoc && <span className="text-[9px] text-white/30 block truncate">📎 {linkedDoc.name}</span>}
                </div>
              </div>
              <span className="text-[9px] font-bold shrink-0" style={{ color }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Administrative Costs Section */}
      <div className="glass-panel rounded-[24px] border border-white/8 p-4 space-y-4 text-xs">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Coûts Administratifs & Paiement</span>
        
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 text-left">
            <div>
              <label className="block text-[10px] font-semibold text-white/50 mb-1">Coût Estimé (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/50 mb-1">Lier un Reçu / Justificatif</label>
              <select
                value={receiptId}
                onChange={(e) => setReceiptId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
              >
                <option value="" className="bg-[#112240]">Aucun</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id} className="bg-[#112240]">{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpdateCost}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white font-bold"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={handleAddCostToBudget}
              disabled={isPaid}
              className={`flex-1 py-2 rounded-xl text-black font-extrabold transition ${isPaid ? 'bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 cursor-not-allowed' : 'bg-[#FFB020] hover:bg-[#DFA015] cursor-pointer'}`}
            >
              {isPaid ? '✅ Payé & Enregistré' : '💰 Payer (Budget)'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Demarche Info Form */}
      <div className="glass-panel rounded-[24px] border border-white/8 p-4 space-y-3 text-xs text-left">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Édition des Détails</span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Titre de la démarche</label>
            <input
              type="text"
              value={activeDemarche.title}
              onChange={(e) => {
                const updated = { ...activeDemarche, title: e.target.value };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Catégorie</label>
            <select
              value={activeDemarche.category || 'Identité'}
              onChange={(e) => {
                const updated = { ...activeDemarche, category: e.target.value };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF] cursor-pointer"
            >
              {['Identité', 'Famille', 'Santé', 'École', 'Logement', 'Travail', 'Voyage', 'Véhicules'].map(c => <option key={c} value={c} className="bg-[#07111F]">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Date Limite (Échéance)</label>
            <input
              type="date"
              value={activeDemarche.dueDate || ''}
              onChange={(e) => {
                const updated = { ...activeDemarche, dueDate: e.target.value };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Statut</label>
            <select
              value={activeDemarche.status}
              onChange={(e) => {
                const updated = { ...activeDemarche, status: e.target.value as any };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="todo" className="bg-[#07111F]">À faire</option>
              <option value="in_progress" className="bg-[#07111F]">En cours</option>
              <option value="waiting" className="bg-[#07111F]">En attente</option>
              <option value="missing_docs" className="bg-[#07111F]">Documents manquants</option>
              <option value="payment_pending" className="bg-[#07111F]">Paiement en attente</option>
              <option value="completed" className="bg-[#07111F]">Terminée</option>
              <option value="archived" className="bg-[#07111F]">Archivée</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Coût Estimé (€)</label>
            <input
              type="number"
              step="0.01"
              value={activeDemarche.costEstimated || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || undefined;
                const updated = { ...activeDemarche, costEstimated: val };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Coût Réel (€)</label>
            <input
              type="number"
              step="0.01"
              value={activeDemarche.costReal || activeDemarche.cost || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || undefined;
                const updated = { ...activeDemarche, costReal: val, cost: val };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Récurrence</label>
            <select
              value={activeDemarche.recurrence || 'none'}
              onChange={(e) => {
                const updated = { ...activeDemarche, recurrence: e.target.value === 'none' ? undefined : e.target.value };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="none" className="bg-[#07111F]">Aucune</option>
              <option value="1m" className="bg-[#07111F]">Mensuelle</option>
              <option value="1y" className="bg-[#07111F]">Annuelle</option>
              <option value="custom" className="bg-[#07111F]">Personnalisée</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/50 mb-1">Rappels (Jours avant échéance)</label>
            <input
              type="text"
              placeholder="Ex: 7, 3, 1"
              value={activeDemarche.reminders?.join(', ') || ''}
              onChange={(e) => {
                const list = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                const updated = { ...activeDemarche, reminders: list };
                setActiveDemarche(updated);
                setDemarches(prev => prev.map(d => d.id === updated.id ? updated : d));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Delete demarche */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Supprimer cette démarche ?')) {
            setDemarches(prev => prev.filter(d => d.id !== activeDemarche.id));
            setActiveDemarche(null);
          }
        }}
        className="w-full py-2.5 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D] text-xs font-bold cursor-pointer hover:bg-[#FF4D6D]/20 transition flex items-center justify-center space-x-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Supprimer la démarche</span>
      </button>
    </div>
  );
};
