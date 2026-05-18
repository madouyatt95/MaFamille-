import React, { useState, useRef, useMemo } from 'react';
import { FileText, Upload, Search, Shield, Plus, X, HeartPulse, GraduationCap, Briefcase, Car, Home, Plane, CreditCard, User, AlertTriangle } from 'lucide-react';
import type { DocumentFile, DocumentCategory, Member } from '../../types';

interface CoffreFortAvanceProps {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  members: Member[];
}

export const CoffreFortAvance: React.FC<CoffreFortAvanceProps> = ({ documents, setDocuments, members }) => {
  const [viewMode, setViewMode] = useState<'categories' | 'members' | 'expiring' | 'all'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
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
                          doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;
      
      if (viewMode === 'expiring') return !!doc.expiryDate && new Date(doc.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Expirant dans < 3 mois
      return true;
    });
  }, [documents, searchQuery, viewMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedFileBase64(event.target.result as string);
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
            <p className="text-xs text-white/50">{documents.length} documents sécurisés</p>
          </div>
        </div>
        <button 
          onClick={() => setIsUploading(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#6C5CFF] rounded-full text-sm font-semibold hover:bg-[#5B4BE0] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 flex flex-col space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Rechercher un document ou un tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#6C5CFF]"
          />
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {(['categories', 'members', 'expiring', 'all'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
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
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(categoryConfig) as [DocumentCategory, any][]).map(([key, config]) => {
              const count = documents.filter(d => d.category === key).length;
              if (count === 0 && !searchQuery) return null;
              
              return (
                <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-start space-y-2 cursor-pointer hover:bg-white/10 transition">
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
        )}

        {viewMode === 'all' && (
          <div className="space-y-2">
            {filteredDocs.map(doc => {
              const config = categoryConfig[doc.category];
              const Icon = config?.icon || FileText;
              return (
                <div key={doc.id} className="flex items-center p-3 bg-white/5 border border-white/10 rounded-xl space-x-3 cursor-pointer hover:bg-white/10 transition">
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

        {/* Similar renders for members and expiring can go here */}
        {viewMode === 'expiring' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-[#FFB020] bg-[#FFB020]/10 p-3 rounded-xl border border-[#FFB020]/20">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-medium">Documents à renouveler prochainement</p>
            </div>
            {filteredDocs.map(doc => (
               <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 border border-[#FFB020]/30 rounded-xl">
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
                  capture="environment"
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
    </div>
  );
};
