import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, CheckSquare, Square, PackageOpen, ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import type { JustificatifPack, DocumentFile } from '../../types';

interface SharedPackViewProps {
  pack: JustificatifPack;
  documents: DocumentFile[];
}

export const SharedPackView: React.FC<SharedPackViewProps> = ({ pack, documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set(documents.map(d => d.id)));
  const [isGenerating, setIsGenerating] = useState(false);
  const expiresAt = pack.shareExpiresAt ? new Date(pack.shareExpiresAt) : null;
  const isExpired = !!expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now();
  const directDownloadsAllowed = pack.allowDirectDownloads !== false;

  const getDocumentPayload = (doc: DocumentFile) => doc.fileUrl || doc.fileBase64 || '';

  const toggleDoc = (id: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocs(newSet);
  };

  const handleDownload = async () => {
    if (isExpired) return;
    setIsGenerating(true);
    const docsToInclude = documents.filter(d => selectedDocs.has(d.id));
    const { generatePackPDF } = await import('../../utils/pdfGenerator');
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
        <div className={`${isExpired ? 'bg-[#FF4D6D]/10 border-[#FF4D6D]/25' : 'bg-[#00D26A]/10 border-[#00D26A]/20'} border rounded-2xl p-4 flex items-center space-x-3`}>
          {isExpired ? <AlertTriangle className="w-6 h-6 text-[#FF4D6D]" /> : <ShieldCheck className="w-6 h-6 text-[#00D26A]" />}
          <div>
            <h3 className={`text-xs font-bold ${isExpired ? 'text-[#FF4D6D]' : 'text-[#00D26A]'}`}>
              {isExpired ? 'Lien expiré' : 'Partage MyFamily+'}
            </h3>
            <p className={`text-[10px] ${isExpired ? 'text-[#FF4D6D]/70' : 'text-[#00D26A]/70'}`}>
              {isExpired
                ? 'Ce dossier n’est plus consultable.'
                : expiresAt
                ? `Accessible jusqu’au ${expiresAt.toLocaleDateString('fr-FR')}.`
                : 'Accessible via le lien transmis par la famille.'}
            </p>
          </div>
        </div>

        {isExpired && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
            <Clock className="mx-auto mb-2 h-7 w-7 text-white/35" />
            <p className="text-sm font-bold text-white">Demandez un nouveau lien</p>
            <p className="mt-1 text-xs text-white/45">Le propriétaire du foyer peut recréer un dossier ou prolonger l’expiration.</p>
          </div>
        )}

        {/* Document List */}
        {!isExpired && <div className="glass-panel border border-white/10 rounded-[28px] overflow-hidden">
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
              const payload = getDocumentPayload(doc);
              const canOpenFile = directDownloadsAllowed && !!payload && !doc.isSecure;
              return (
                <div 
                  key={doc.id} 
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${isSelected ? 'bg-white/5 hover:bg-white/10' : 'hover:bg-white/5 opacity-50 hover:opacity-80'}`}
                >
                  <button type="button" onClick={() => toggleDoc(doc.id)} className="flex min-w-0 flex-1 items-center space-x-3 text-left">
                    <div className={`p-2 rounded-xl border transition-colors ${isSelected ? 'bg-[#6C5CFF]/20 border-[#6C5CFF]/50 text-[#6C5CFF]' : 'bg-white/5 border-white/10 text-white/30'}`}>
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-bold ${isSelected ? 'text-white' : 'text-white/60'}`}>{doc.name}</p>
                      <p className="text-[10px] text-white/40">
                        {doc.category} • {doc.uploadDate} • {canOpenFile ? 'fichier disponible' : 'sommaire uniquement'}
                      </p>
                    </div>
                  </button>
                  {canOpenFile ? (
                    <a
                      href={payload}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-xl border border-[#00D26A]/25 bg-[#00D26A]/10 px-3 py-2 text-[10px] font-bold text-[#00D26A] inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir
                    </a>
                  ) : (
                    <FileText className={`w-5 h-5 shrink-0 ${isSelected ? 'text-white/50' : 'text-white/20'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>}

        {/* Action Bar */}
        {!isExpired && <div className="pt-4">
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
          <p className="mt-3 text-center text-[10px] text-white/35">
            Le PDF regroupe les informations du dossier. Les fichiers directs restent disponibles uniquement quand le propriétaire les autorise.
          </p>
        </div>}

        <p className="text-center text-[10px] text-white/30 pt-8">Propulsé par MyFamily+</p>
      </div>
    </div>
  );
};
