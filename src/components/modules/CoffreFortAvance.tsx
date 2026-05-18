import React, { useState, useRef, useMemo } from 'react';
import { FileText, Upload, Search, Shield, Plus, X, HeartPulse, GraduationCap, Briefcase, Car, Home, Plane, CreditCard, User, AlertTriangle, ArrowLeft, Trash2, Download, Share2, CheckCircle2, ChevronRight, Calendar, Users } from 'lucide-react';
import type { DocumentFile, DocumentCategory, Member, Demarche, JustificatifPack } from '../../types';
import { demarcheTemplates } from '../../data/demoData';

interface CoffreFortAvanceProps {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  members: Member[];
  demarches: Demarche[];
  setDemarches: React.Dispatch<React.SetStateAction<Demarche[]>>;
  packs: JustificatifPack[];
  setPacks: React.Dispatch<React.SetStateAction<JustificatifPack[]>>;
  onAddEvent?: (title: string, dateTime: string) => void;
}

export const CoffreFortAvance: React.FC<CoffreFortAvanceProps> = ({ documents, setDocuments, members, demarches, setDemarches, packs, setPacks, onAddEvent }) => {
  const [mainTab, setMainTab] = useState<'docs' | 'demarches' | 'packs'>('docs');
  const [viewMode, setViewMode] = useState<'categories' | 'members' | 'expiring' | 'all'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);

  // Demarche states
  const [activeDemarche, setActiveDemarche] = useState<Demarche | null>(null);
  const [showNewDemarche, setShowNewDemarche] = useState(false);
  const [newDemarcheTitle, setNewDemarcheTitle] = useState('');
  const [newDemarcheTemplate, setNewDemarcheTemplate] = useState('');
  const [newDemarcheAssignee, setNewDemarcheAssignee] = useState('');

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
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);

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

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;
      
      if (viewMode === 'expiring') {
        if (!doc.expiryDate) return false;
        // Parse DD/MM/YYYY
        const parts = doc.expiryDate.split('/');
        if (parts.length === 3) {
          const docDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
          return docDate < ninetyDaysFromNow;
        }
        return false;
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
      uploadDate: new Date().toLocaleDateString('fr-FR'),
      expiryDate: newDocExpiry || undefined,
      fileSize: 'Modéré', // Computed size could be added here
      isExpired: false,
      tags: newDocTags.split(',').map(t => t.trim()).filter(Boolean),
      fileBase64: selectedFileBase64
    };

    setDocuments(prev => [newDoc, ...prev]);
    setIsUploading(false);
    
    // Reset
    setNewDocName('');
    setNewDocCategory('identity');
    setNewDocMember('');
    setNewDocExpiry('');
    setNewDocTags('');
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

  return (
    <div className="flex flex-col h-full bg-[#07111F] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#6C5CFF]/20 rounded-xl">
            <Shield className="w-6 h-6 text-[#6C5CFF]" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Coffre-Fort Avancé</h2>
            <p className="text-xs text-white/50">{documents.length} docs • {demarches.length} démarches • {packs.length} packs</p>
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

      {/* Main Tab Navigation */}
      <div className="p-3 border-b border-white/5">
        <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-3 gap-1">
          <button onClick={() => setMainTab('docs')} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${mainTab === 'docs' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
            📁 Documents
          </button>
          <button onClick={() => setMainTab('demarches')} className={`py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer relative ${mainTab === 'demarches' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
            📋 Démarches
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
              {mode === 'expiring' && 'Expirations'}
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
                        onClick={() => setPreviewDoc(doc)}
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
                  onClick={() => setPreviewDoc(doc)}
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
                        onClick={() => setPreviewDoc(doc)}
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
                        onClick={() => setPreviewDoc(doc)}
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
              <p className="text-sm font-medium">Documents à renouveler prochainement</p>
            </div>
            {filteredDocs.map(doc => (
               <div 
                 key={doc.id} 
                 onClick={() => setPreviewDoc(doc)}
                 className="flex items-center justify-between p-3 bg-white/5 border border-[#FFB020]/30 rounded-xl cursor-pointer hover:bg-white/10 transition"
               >
                 <div>
                   <p className="font-semibold text-sm truncate">{doc.name}</p>
                   <p className="text-xs text-[#FFB020] mt-0.5">Expire le: {doc.expiryDate}</p>
                 </div>
               </div>
            ))}
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
                const statusLabel = dem.status === 'completed' ? 'Terminée' : dem.status === 'waiting' ? 'En attente' : dem.status === 'in_progress' ? 'En cours' : 'Brouillon';
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
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Lancer une démarche</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {demarcheTemplates.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => { setShowNewDemarche(true); setNewDemarcheTemplate(tpl.id); setNewDemarcheTitle(tpl.name); }}
                  className="p-4 rounded-[20px] border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left space-y-2 cursor-pointer active:scale-[0.97]"
                >
                  <span className="text-2xl block">{tpl.icon}</span>
                  <h5 className="text-[11px] font-bold text-white">{tpl.name}</h5>
                  <p className="text-[9px] text-white/40 leading-relaxed">{tpl.description}</p>
                  <div className="flex items-center space-x-2 text-[8px] text-white/30">
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
                    const tpl = demarcheTemplates.find(t => t.id === newDemarcheTemplate);
                    const member = members.find(m => m.id === newDemarcheAssignee);
                    const newDem: Demarche = {
                      id: `dem-${Date.now()}`,
                      templateId: newDemarcheTemplate || undefined,
                      title: newDemarcheTitle || 'Nouvelle démarche',
                      icon: tpl?.icon || '📋',
                      status: 'draft',
                      assignedMemberId: member?.id,
                      assignedMemberName: member?.name,
                      steps: (tpl?.defaultSteps || []).map((s, i) => ({ id: `ds-${Date.now()}-${i}`, title: s.title, done: false })),
                      pieces: (tpl?.defaultPieces || []).map((p, i) => ({ id: `dp-${Date.now()}-${i}`, name: p.name, status: 'missing' as const })),
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
      )}

      {/* ===================== PACKS VIEW ===================== */}
      {mainTab === 'packs' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Packs Justificatifs</span>
            <button type="button" onClick={() => { setShowNewPack(true); setSelectedPackDocs([]); }} className="px-3 py-1.5 bg-[#6C5CFF] rounded-xl text-[10px] font-bold text-white cursor-pointer hover:opacity-90 transition flex items-center space-x-1">
              <Plus className="w-3 h-3" />
              <span>Nouveau pack</span>
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
                <button
                  type="button"
                  onClick={() => {
                    const names = packDocs.map(d => d.name).join(', ');
                    if (navigator.share) {
                      navigator.share({ title: pack.name, text: `Pack justificatif : ${pack.name}\nDocuments : ${names}` }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(`${pack.name}\n${names}`);
                      alert('📋 Pack copié dans le presse-papiers !');
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-[10px] font-bold cursor-pointer hover:bg-[#00D26A]/20 transition flex items-center justify-center space-x-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Partager / Exporter</span>
                </button>
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
                  <h3 className="text-sm font-extrabold text-white">Nouveau Pack Justificatif</h3>
                  <button type="button" onClick={() => setShowNewPack(false)} className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <input type="text" placeholder="Nom du pack (ex: Dossier location Paris)" value={newPackName} onChange={e => setNewPackName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]" />
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
                  Créer le pack ({selectedPackDocs.length} doc{selectedPackDocs.length > 1 ? 's' : ''})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
