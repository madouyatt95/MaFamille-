import React, { useState } from 'react';
import { 
  Camera, 
  Heart, 
  Printer, 
  RefreshCw 
} from 'lucide-react';
import type { MemoryLog } from '../../types';

interface CapsuleTemporelleProps {
  memories: MemoryLog[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
  activeMemberId: string;
}

export const CapsuleTemporelle: React.FC<CapsuleTemporelleProps> = ({ 
  memories, 
  setMemories,
  activeMemberId 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'album' | 'gazette'>('album');
  
  // Simulated photo upload
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generatingGazette, setGeneratingGazette] = useState(false);
  const [gazetteStep, setGazetteStep] = useState(0);

  const handleUploadMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    setUploading(true);
    setTimeout(() => {
      const newMemory: MemoryLog = {
        id: `mem-${Date.now()}`,
        title: newTitle,
        description: newDesc,
        imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80',
        date: new Date().toLocaleDateString('fr-FR'),
        authorName: activeMemberId === '1' ? 'Papa' : activeMemberId === '2' ? 'Maman' : activeMemberId === '3' ? 'Amadou' : 'Awa',
        authorPhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        likesCount: 0
      };

      setMemories(prev => [newMemory, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setUploading(false);
      alert("Nouveau souvenir partagé dans la Capsule de la Famille ! 📸");
    }, 1200);
  };

  const handleLike = (id: string) => {
    setMemories(prev =>
      prev.map(m => m.id === id ? { ...m, likesCount: m.likesCount + 1 } : m)
    );
  };

  const generateGazette = () => {
    setGeneratingGazette(true);
    setGazetteStep(1);
    
    setTimeout(() => {
      setGazetteStep(2);
      setTimeout(() => {
        setGazetteStep(3);
        setTimeout(() => {
          setGeneratingGazette(false);
          setGazetteStep(0);
          alert("📰 Gazette de la famille 'Édition Spéciale' compilée avec succès ! Le fichier PDF premium est prêt pour l'impression.");
        }, 1200);
      }, 1000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D]">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Capsule Temporelle</h2>
            <p className="text-xs text-white/50">Journal intime et souvenirs partagés de votre foyer</p>
          </div>
        </div>
      </div>

      {/* Navigation sub-tabs */}
      <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 flex">
        <button
          onClick={() => setActiveSubTab('album')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'album' 
              ? 'bg-[#FF4D6D] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Album Photo Partagé
        </button>
        <button
          onClick={() => setActiveSubTab('gazette')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'gazette' 
              ? 'bg-[#FF4D6D] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          La Gazette du Dimanche 📰
        </button>
      </div>

      {/* ALBUM VIEW */}
      {activeSubTab === 'album' && (
        <div className="space-y-6">
          
          {/* Quick upload memory form */}
          <form onSubmit={handleUploadMemory} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Ajouter un nouveau souvenir :</span>
            
            <div className="space-y-2.5">
              <input 
                type="text" 
                required
                placeholder="Titre du souvenir (ex: Sortie vélo au parc)..." 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
              />
              <textarea 
                required
                placeholder="Décrivez ce moment incroyable de complicité..." 
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#FFB020] text-white font-semibold text-xs shadow-md cursor-pointer transition-all hover:opacity-95 flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>{uploading ? 'Fixation chimique de l\'image...' : 'Publier dans l\'Album'}</span>
            </button>
          </form>

          {/* Album grid view */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {memories.map(m => (
              <div key={m.id} className="glass-panel border border-white/8 rounded-[28px] overflow-hidden flex flex-col justify-between shadow-lg relative group">
                {m.imageUrl && (
                  <img 
                    src={m.imageUrl} 
                    alt={m.title} 
                    className="w-full h-44 object-cover border-b border-white/5 transition-transform duration-500 group-hover:scale-102"
                  />
                )}
                
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs sm:text-sm font-extrabold text-white leading-snug">{m.title}</h3>
                    <span className="text-[9px] text-white/40 shrink-0 font-medium">{m.date}</span>
                  </div>
                  
                  <p className="text-[11px] text-white/50 leading-relaxed font-sans font-medium">{m.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[9px] font-bold text-white/40">
                      Par: <span className="text-[#FF4D6D]">{m.authorName}</span>
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleLike(m.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#FF4D6D]/25 hover:text-[#FF4D6D] text-white/70 border border-white/10 text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current text-[#FF4D6D]" />
                        <span>{m.likesCount}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* GAZETTE VIEW */}
      {activeSubTab === 'gazette' && (
        <div className="space-y-6">
          
          {/* Gazette Promo Cover */}
          <div className="relative rounded-[28px] overflow-hidden border border-[#FF4D6D]/30 bg-gradient-to-br from-[#1C1F2E] to-[#0A0D16] p-6 flex flex-col justify-between min-h-[380px] shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF4D6D]/10 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Editorial Title */}
            <div className="text-center border-b border-white/10 pb-4">
              <span className="text-[9px] font-extrabold text-[#FF4D6D] uppercase tracking-widest block">Édition Hebdomadaire</span>
              <h2 className="text-2xl font-serif font-extrabold text-white tracking-widest mt-1.5">LA GAZETTE DES FATOU</h2>
              <span className="text-[10px] text-white/40 block mt-1 font-bold">Dimanche 24 Mai 2026 • Numéro #24</span>
            </div>

            {/* Highlights Columns */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-white/5 my-2">
              <div className="space-y-2 border-r border-white/5 pr-4">
                <span className="text-[8px] font-bold text-[#FFB020] uppercase tracking-wider block">L'EXPLOIT DE LA SEMAINE</span>
                <h4 className="text-xs font-bold text-white leading-normal">Amadou décroche un 19/20 en Histoire ! 🎓</h4>
                <p className="text-[10px] text-white/50 leading-relaxed font-sans">Soutenu par notre Tuteur IA, Amadou a impressionné sa classe avec son quiz sur le Roi-Soleil.</p>
              </div>
              <div className="space-y-2 pl-2">
                <span className="text-[8px] font-bold text-[#00D26A] uppercase tracking-wider block">LE MOT DE L'ÉCO-CHEF</span>
                <h4 className="text-xs font-bold text-white leading-normal">0 déchet en cuisine cette semaine 🥦</h4>
                <p className="text-[10px] text-white/50 leading-relaxed font-sans">Grâce aux recettes créatives de restes, la famille a réduit son empreinte et économisé 35 €.</p>
              </div>
            </div>

            {/* Bottom PDF Generation Trigger */}
            <div className="pt-2">
              {generatingGazette ? (
                <div className="w-full p-4 rounded-[18px] bg-white/5 border border-white/5 flex flex-col items-center justify-center space-y-2 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-[#FF4D6D] animate-spin" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                    {gazetteStep === 1 ? 'Mise en page des photos de la semaine...' :
                     gazetteStep === 2 ? 'Génération de la chronique éditoriale...' :
                     'Compilation du PDF luxury de la Gazette...'}
                  </span>
                </div>
              ) : (
                <button
                  onClick={generateGazette}
                  className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#FFB020] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer transition-all hover:opacity-95 shadow-md flex items-center justify-center space-x-2.5 hover:scale-102"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Gazette du Dimanche</span>
                </button>
              )}
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
};
