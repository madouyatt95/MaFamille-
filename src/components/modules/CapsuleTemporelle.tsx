import React, { useState } from 'react';
import { 
  Camera, 
  Heart, 
  Printer, 
  RefreshCw,
  Lock,
  Trash2
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
  
  // Advanced Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTheme, setNewTheme] = useState('🏖️ Vacances');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPresetImage, setSelectedPresetImage] = useState('https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&auto=format&fit=crop&q=80');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [generatingGazette, setGeneratingGazette] = useState(false);
  const [gazetteStep, setGazetteStep] = useState(0);

  const isParent = activeMemberId === '1' || activeMemberId === '2';

  const PRESET_IMAGES = [
    { label: '🚴‍♂️ Sport', url: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&auto=format&fit=crop&q=80' },
    { label: '🍳 Cuisine', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=80' },
    { label: '🎂 Fête', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80' },
    { label: '🏖️ Plage', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    setUploading(true);
    setTimeout(() => {
      const author = activeMemberId === '1' ? 'Papa' : activeMemberId === '2' ? 'Maman' : activeMemberId === '3' ? 'Amadou' : 'Awa';
      const authorPic = activeMemberId === '1' 
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' 
        : activeMemberId === '2' 
          ? 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80'
          : activeMemberId === '3'
            ? 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1517677129300-07b130802f46?w=150&auto=format&fit=crop&q=80';

      const newMemory: MemoryLog = {
        id: `mem-${Date.now()}`,
        title: newTitle,
        description: newDesc,
        imageUrl: uploadedImage || selectedPresetImage,
        date: new Date(newDate).toLocaleDateString('fr-FR'),
        authorName: author,
        authorPhoto: authorPic,
        likesCount: 0,
        theme: newTheme,
        isPrivate: isPrivate
      };

      setMemories(prev => [newMemory, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setUploadedImage(null);
      setIsPrivate(false);
      setUploading(false);
      alert("Nouveau souvenir partagé dans la Capsule de la Famille ! 📸");
    }, 1000);
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

  // Filter memories based on parental privacy settings
  const visibleMemories = memories.filter(m => {
    if (m.isPrivate && !isParent) return false;
    return true;
  });

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
          
          {/* Advanced upload memory form */}
          <form onSubmit={handleUploadMemory} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Créer un nouveau souvenir</span>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Titre</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Sortie vélo en famille..." 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date du moment</label>
                  <input 
                    type="date" 
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Thématique / Ambiance</label>
                  <select 
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                  >
                    <option value="🏖️ Vacances">🏖️ Vacances & Sorties</option>
                    <option value="🚴‍♂️ Sport">🚴‍♂️ Activités & Sport</option>
                    <option value="🎂 Anniversaire">🎂 Anniversaire & Fête</option>
                    <option value="🍳 Cuisine">🍳 Cuisine & Repas</option>
                    <option value="🎓 Scolaire">🎓 Réussite & École</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Unsplash Presets (Galerie de secours)</label>
                  <select 
                    value={selectedPresetImage}
                    onChange={(e) => setSelectedPresetImage(e.target.value)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                  >
                    {PRESET_IMAGES.map(pr => (
                      <option key={pr.url} value={pr.url}>{pr.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Mobile Camera & Library Uploader */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Image (Appareil photo / Bibliothèque locale)</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Native input camera picker */}
                  <div className="relative flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-[#FF4D6D]/45 rounded-xl p-4 bg-white/5 cursor-pointer min-h-[90px] transition-all">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Camera className="w-5 h-5 text-white/60 mb-1" />
                    <span className="text-[10px] font-bold text-white/80">Ajouter une photo</span>
                    <span className="text-[8px] text-white/40 mt-0.5">Appareil photo ou Galerie</span>
                  </div>

                  {/* Photo Preview / Fallback indicator */}
                  <div className="relative rounded-xl overflow-hidden min-h-[90px] border border-white/10 flex items-center justify-center bg-black/20">
                    {uploadedImage ? (
                      <>
                        <img src={uploadedImage} alt="Preview" className="w-full h-full object-cover animate-fade-in" />
                        <button 
                          type="button"
                          onClick={() => setUploadedImage(null)}
                          className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 border border-white/20 text-[#FF4D6D] hover:bg-black transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-[#00D26A]/90 text-[8px] font-extrabold text-white border border-[#00D26A]/30 uppercase">
                          Photo importée ✓
                        </span>
                      </>
                    ) : (
                      <>
                        <img src={selectedPresetImage} alt="Preset default" className="w-full h-full object-cover opacity-60" />
                        <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-bold text-white/60 border border-white/10 uppercase">
                          Défaut Preset
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Description</label>
                <textarea 
                  required
                  placeholder="Racontez le moment... (ex: Une superbe après-midi ensoleillée avec les enfants...)" 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D] resize-none"
                />
              </div>

              {/* Parent Privacy Toggle Switch */}
              {isParent && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 mt-1">
                  <div className="flex items-center space-x-2.5">
                    <Lock className="w-4 h-4 text-[#FF4D6D]" />
                    <div>
                      <p className="text-[11px] font-bold text-white">🔒 Rendre ce souvenir privé</p>
                      <p className="text-[9px] text-white/40">Visible uniquement par Papa & Maman</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(prev => !prev)}
                    className={`px-3 py-1 rounded-xl text-[9px] font-extrabold tracking-wider uppercase border transition-all cursor-pointer ${
                      isPrivate 
                        ? 'bg-[#FF4D6D] border-[#FF4D6D] text-white' 
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    {isPrivate ? 'Privé' : 'Public'}
                  </button>
                </div>
              )}
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
            {visibleMemories.map(m => (
              <div key={m.id} className="glass-panel border border-white/8 rounded-[28px] overflow-hidden flex flex-col justify-between shadow-lg relative group">
                {m.imageUrl && (
                  <img 
                    src={m.imageUrl} 
                    alt={m.title} 
                    className="w-full h-44 object-cover border-b border-white/5 transition-transform duration-500 group-hover:scale-102"
                  />
                )}
                
                {/* Private label indicators overlay */}
                {m.isPrivate && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-[#FF4D6D]/90 text-[8px] font-extrabold text-white border border-[#FF4D6D]/20 shadow-md uppercase tracking-wider flex items-center space-x-1">
                    <Lock className="w-2.5 h-2.5 shrink-0" />
                    <span>Privé (Parents)</span>
                  </span>
                )}

                {m.theme && (
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-lg bg-black/60 text-[8px] font-extrabold text-[#FFB020] border border-white/5 shadow-md uppercase tracking-wider">
                    {m.theme}
                  </span>
                )}
                
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs sm:text-sm font-extrabold text-white leading-snug">{m.title}</h3>
                    <span className="text-[9px] text-white/40 shrink-0 font-medium">{m.date}</span>
                  </div>
                  
                  <p className="text-[11px] text-white/50 leading-relaxed font-sans font-medium">{m.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={m.authorPhoto} 
                        alt={m.authorName} 
                        className="w-4 h-4 rounded-full object-cover border border-white/20 shrink-0"
                      />
                      <span className="text-[9px] font-bold text-white/40">
                        Par: <span className="text-[#FF4D6D]">{m.authorName}</span>
                      </span>
                    </div>
                    
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
