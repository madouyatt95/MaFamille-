import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, CheckSquare, Square, PackageOpen } from 'lucide-react';
import type { JustificatifPack, DocumentFile } from '../../types';
import { generatePackPDF } from '../../utils/pdfGenerator';

interface SharedPackViewProps {
  pack: JustificatifPack;
  documents: DocumentFile[];
}

export const SharedPackView: React.FC<SharedPackViewProps> = ({ pack, documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set(documents.map(d => d.id)));
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleDoc = (id: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocs(newSet);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    const docsToInclude = documents.filter(d => selectedDocs.has(d.id));
    await generatePackPDF(pack, docsToInclude);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans flex flex-col items-center pt-10">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#6C5CFF]/10 rounded-2xl mx-auto flex items-center justify-center border border-[#6C5CFF]/20 shadow-lg shadow-[#6C5CFF]/20">
            <PackageOpen className="w-8 h-8 text-[#6C5CFF]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Dossier Partagé</h1>
          <p className="text-sm text-white/50">{pack.name}</p>
        </div>

        {/* Security Badge */}
        <div className="bg-[#00D26A]/10 border border-[#00D26A]/20 rounded-2xl p-4 flex items-center space-x-3">
          <ShieldCheck className="w-6 h-6 text-[#00D26A]" />
          <div>
            <h3 className="text-xs font-bold text-[#00D26A]">Partage Sécurisé MyFamily+</h3>
            <p className="text-[10px] text-[#00D26A]/70">Les documents sont chiffrés et vérifiés.</p>
          </div>
        </div>

        {/* Document List */}
        <div className="glass-panel border border-white/10 rounded-[28px] overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Pièces jointes ({documents.length})</h3>
              <button 
                onClick={() => setSelectedDocs(selectedDocs.size === documents.length ? new Set() : new Set(documents.map(d => d.id)))}
                className="text-[10px] text-[#6C5CFF] font-bold hover:opacity-80"
              >
                {selectedDocs.size === documents.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-white/5">
            {documents.map(doc => {
              const isSelected = selectedDocs.has(doc.id);
              return (
                <div 
                  key={doc.id} 
                  onClick={() => toggleDoc(doc.id)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-white/5 hover:bg-white/10' : 'hover:bg-white/5 opacity-50 hover:opacity-80'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl border transition-colors ${isSelected ? 'bg-[#6C5CFF]/20 border-[#6C5CFF]/50 text-[#6C5CFF]' : 'bg-white/5 border-white/10 text-white/30'}`}>
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-white/60'}`}>{doc.name}</p>
                      <p className="text-[10px] text-white/40">{doc.category} • {doc.uploadDate}</p>
                    </div>
                  </div>
                  <FileText className={`w-5 h-5 ${isSelected ? 'text-white/50' : 'text-white/20'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-4">
          <button
            onClick={handleDownload}
            disabled={selectedDocs.size === 0 || isGenerating}
            className="w-full py-4 bg-[#6C5CFF] text-white font-black rounded-2xl shadow-lg shadow-[#6C5CFF]/20 hover:shadow-[#6C5CFF]/40 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="animate-pulse">Génération du PDF...</span>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Télécharger la sélection ({selectedDocs.size})</span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[10px] text-white/30 pt-8">Propulsé par MyFamily+</p>
      </div>
    </div>
  );
};
