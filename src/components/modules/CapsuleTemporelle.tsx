import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Heart, 
  Printer, 
  RefreshCw,
  Lock,
  Sparkles,
  Download,
  Share2
} from 'lucide-react';
import type { MemoryLog } from '../../types';

interface CapsuleTemporelleProps {
  memories: MemoryLog[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
  activeMemberId: string;
}

interface MemoryCardProps {
  m: MemoryLog;
  isParent: boolean;
  handleLike: (id: string) => void;
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
}

const MemoryCard: React.FC<MemoryCardProps> = ({
  m,
  isParent,
  handleLike,
  setMemories
}) => {
  const images = m.imageUrls && m.imageUrls.length > 0 ? m.imageUrls : (m.imageUrl ? [m.imageUrl] : []);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  return (
    <div className="glass-panel border border-white/8 rounded-[28px] overflow-hidden flex flex-col justify-between shadow-lg relative group">
      {images.length > 0 && (
        <div className="relative w-full h-44 overflow-hidden bg-black/40 border-b border-white/5">
          <img 
            src={images[activeImgIdx]} 
            alt={m.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          />
          
          {images.length > 1 && (
            <>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center border border-white/10 hover:bg-black transition-all cursor-pointer z-10"
              >
                ‹
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIdx(prev => (prev === images.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center border border-white/10 hover:bg-black transition-all cursor-pointer z-10"
              >
                ›
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-10 bg-black/40 px-2 py-1 rounded-full border border-white/5">
                {images.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImgIdx ? 'bg-[#FF4D6D] w-3' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
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
        
        <p className="text-[11px] text-white/55 leading-relaxed font-sans font-medium">{m.description}</p>
        
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
          
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleLike(m.id)}
              className="px-2 py-1 rounded-xl bg-white/5 hover:bg-[#FF4D6D]/25 hover:text-[#FF4D6D] text-white/70 border border-white/10 text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-[#FF4D6D]" />
              <span>{m.likesCount}</span>
            </button>
            {isParent && (
              <div className="flex space-x-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <button 
                  type="button"
                  onClick={() => {
                    const newTitle = window.prompt("Modifier le titre du souvenir :", m.title);
                    if (!newTitle) return;
                    const newDesc = window.prompt("Modifier la description :", m.description);
                    if (!newDesc) return;
                    setMemories(prev => prev.map(item => item.id === m.id ? { ...item, title: newTitle, description: newDesc } : item));
                  }}
                  className="p-1 hover:bg-white/10 rounded text-[10px]"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (window.confirm("Supprimer ce souvenir de la capsule ?")) {
                      setMemories(prev => prev.filter(item => item.id !== m.id));
                    }
                  }}
                  className="p-1 hover:bg-red-500/10 rounded text-[10px] text-red-400"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CapsuleTemporelle: React.FC<CapsuleTemporelleProps> = ({ 
  memories, 
  setMemories,
  activeMemberId 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'album' | 'gazette' | 'comic'>('album');
  
  // Advanced Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTheme, setNewTheme] = useState('🏖️ Vacances');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPresetImage, setSelectedPresetImage] = useState('https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&auto=format&fit=crop&q=80');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [generatingGazette, setGeneratingGazette] = useState(false);
  const [gazetteStep, setGazetteStep] = useState(0);

  // === BD ÉPIQUE STATES ===
  const [selectedComicStyle, setSelectedComicStyle] = useState<'retro' | 'manga' | 'fantasy' | 'cyberpunk'>('retro');
  const [isGeneratingComic, setIsGeneratingComic] = useState(false);
  const [comicImage, setComicImage] = useState<string>('');
  const [comicChapters, setComicChapters] = useState<{ title: string; desc: string; author: string; photo?: string }[]>([]);
  const [comicGenerationProgress, setComicGenerationProgress] = useState<string>('');

  const isParent = activeMemberId === '1' || activeMemberId === '2';

  const PRESET_IMAGES = [
    { label: '🚴‍♂️ Sport', url: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&auto=format&fit=crop&q=80' },
    { label: '🍳 Cuisine', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=80' },
    { label: '🎂 Fête', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80' },
    { label: '🏖️ Plage', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUploadMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    setUploading(true);
    setTimeout(() => {
      const author = activeMemberId === '1' ? 'Papa' : activeMemberId === '2' ? 'Maman' : activeMemberId === '3' ? 'Amadou' : 'Awa';
      const authorPic = activeMemberId === '1' 
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' 
        : activeMemberId === '2' 
          ? 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80'
          : activeMemberId === '3'
            ? 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=150&auto=format&fit=crop&q=80';

      const finalImages = uploadedImages.length > 0 ? uploadedImages : [selectedPresetImage];

      const newMemory: MemoryLog = {
        id: `mem-${Date.now()}`,
        title: newTitle,
        description: newDesc,
        imageUrl: finalImages[0],
        imageUrls: finalImages,
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
      setUploadedImages([]);
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
          const printStyle = document.createElement('style');
          printStyle.id = 'gazette-print-style';
          printStyle.textContent = `
            @media print {
              body * { visibility: hidden !important; }
              .gazette-printable, .gazette-printable * { visibility: visible !important; }
              .gazette-printable {
                position: absolute; left: 0; top: 0; width: 100%;
                background: #fbfbf6 !important; color: #111 !important;
                padding: 40px !important; font-family: Georgia, serif !important;
                border: 3px double #333 !important;
              }
              .gazette-printable h2 { color: #111 !important; font-size: 32px !important; font-family: Georgia, serif !important; text-transform: uppercase !important; text-align: center !important; }
              .gazette-printable span, .gazette-printable h4, .gazette-printable p, .gazette-printable td { color: #222 !important; }
              .gazette-printable .no-print { display: none !important; }
            }
          `;
          document.head.appendChild(printStyle);
          window.print();
          setTimeout(() => {
            const el = document.getElementById('gazette-print-style');
            if (el) el.remove();
          }, 1000);
        }, 1200);
      }, 1000);
    }, 1000);
  };

  // === BD GENERATION ENGINE ===
  const generateComicBook = () => {
    setIsGeneratingComic(true);
    setComicGenerationProgress("Chiffonnage du papier Comics vintage...");

    // 1. Lire les 3 derniers souvenirs ou charger des aventures par défaut si vide
    const sampleMemories = memories.slice(0, 3);
    
    setTimeout(() => {
      setComicGenerationProgress("Scénarisation de l'aventure épique...");
      
      const chapters: { title: string; desc: string; author: string; photo?: string }[] = [];
      
      // Souvenir 1
      if (sampleMemories[0]) {
        chapters.push({
          title: `L'Odyssée de ${sampleMemories[0].authorName}`,
          desc: `Notre vaillant explorateur ${sampleMemories[0].authorName} a entrepris l'exploit intitulé: "${sampleMemories[0].title}". Les récits disent qu'il a bravé tous les vents célestes pour écrire ce souvenir : "${sampleMemories[0].description}" !`,
          author: sampleMemories[0].authorName,
          photo: sampleMemories[0].imageUrl
        });
      } else {
        chapters.push({
          title: "L'exploration de la Nébuleuse des Arbres Sacrés",
          desc: "Le vaillant Chef Papa et son clan s'aventurent au cœur de la forêt des murmures célestes, découvrant le secret des runes dorées cachées sous les écorces millénaires !",
          author: "Papa",
          photo: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=500&auto=format&fit=crop&q=80"
        });
      }

      // Souvenir 2
      if (sampleMemories[1]) {
        chapters.push({
          title: `L'Invocation Céleste de ${sampleMemories[1].authorName}`,
          desc: `Alors, ${sampleMemories[1].authorName} fit surgir une onde magique appelée "${sampleMemories[1].title}". L'assemblée en fut stupéfaite: "${sampleMemories[1].description}" !`,
          author: sampleMemories[1].authorName,
          photo: sampleMemories[1].imageUrl
        });
      } else {
        chapters.push({
          title: "L'Invocation du Lion d'Or",
          desc: "Le jeune Mage Amadou canalise l'esprit de l'art magique pour matérialiser le Lion Céleste aux crins de braise, protecteur éternel du salon de la maisonnée !",
          author: "Amadou",
          photo: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=80"
        });
      }

      // Souvenir 3
      if (sampleMemories[2]) {
        chapters.push({
          title: `Le Banquet Héroïque de ${sampleMemories[2].authorName}`,
          desc: `Pour clore cette épopée, ${sampleMemories[2].authorName} réunit les troupes autour de "${sampleMemories[2].title}". Un festin mémorable : "${sampleMemories[2].description}" !`,
          author: sampleMemories[2].authorName,
          photo: sampleMemories[2].imageUrl
        });
      } else {
        chapters.push({
          title: "Le Festin Cosmique des Pizzas Étoilées",
          desc: "Le clan se réunit autour d'un grand Banquet Lunaire de Pizzas Cosmiques aux fromages coulants de la Voie Lactée, célébrant la paix et les rires du royaume !",
          author: "Maman",
          photo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80"
        });
      }

      setComicChapters(chapters);

      setTimeout(() => {
        setComicGenerationProgress("Invoquer l'IA de Stable Diffusion pour peindre la couverture...");

        // Construire un prompt ultra stylisé selon le style choisi
        let stylePrompt = "";
        if (selectedComicStyle === 'retro') {
          stylePrompt = "retro marvel comic book cover, 1980s vintage style, ink drawings, highly detailed graphic novel, colorful speech bubbles, pop art accents";
        } else if (selectedComicStyle === 'manga') {
          stylePrompt = "shonen manga colorful volume cover, anime key visual, highly detailed art style, vibrant gradient lighting, emotional character pose";
        } else if (selectedComicStyle === 'fantasy') {
          stylePrompt = "epic high-fantasy novel illustration, oil painting style, glowing magical pipes, ancient wizard scrolls, grand warrior posture, warm fantasy lighting";
        } else {
          stylePrompt = "cyberpunk neon graphic novel panel, sci-fi concept art, dark futuristic background, glowing holographic symbols, high contrast violet and cyan";
        }

        const keywords = sampleMemories.map(m => m.title).join(", ") || "family adventure, magical forest, pizza feast, heroic golden lion";
        const finalPrompt = encodeURIComponent(`${stylePrompt}, depicting: a family having an epic fantasy quest including ${keywords}, dramatic lighting, masterpiece illustration`);

        const seed = Math.floor(Math.random() * 1000000);
        const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=800&height=1000&nologo=true&seed=${seed}`;

        // Préchargement sécurisé en arrière-plan pour éviter les clignotements
        const img = new Image();
        img.src = generatedUrl;

        img.onload = () => {
          setComicImage(generatedUrl);
          setIsGeneratingComic(false);
        };

        img.onerror = () => {
          // Fallback en direct sur Unsplash en cas d'erreur de serveur IA
          setComicImage(`https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80&sig=${seed}`);
          setIsGeneratingComic(false);
        };

      }, 1000);
    }, 1000);
  };

  // Auto generate at start when clicking the sub-tab
  useEffect(() => {
    if (activeSubTab === 'comic' && !comicImage && !isGeneratingComic) {
      generateComicBook();
    }
  }, [activeSubTab]);

  const handleShareComicToWall = () => {
    if (!comicImage) return;

    const newMemory: MemoryLog = {
      id: `mem-comic-${Date.now()}`,
      title: `🦸 LA GAZETTE BD : Les Aventures Épiques du Clan !`,
      description: `Nous avons généré en direct notre BD personnalisée de la semaine basée sur nos souvenirs ! Style choisi : ${selectedComicStyle.toUpperCase()}.`,
      imageUrl: comicImage,
      imageUrls: [comicImage],
      date: new Date().toLocaleDateString('fr-FR'),
      authorName: activeMemberId === '1' ? 'Papa' : 'Maman',
      authorPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      likesCount: 0,
      theme: '🦸 Gazette BD',
      isPrivate: false
    };

    setMemories(prev => [newMemory, ...prev]);
    alert("Votre incroyable Bande Dessinée a été publiée sur le Mur de la Famille avec succès ! 🌟");
    setActiveSubTab('album');
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
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Capsule Temporelle & IA</h2>
            <p className="text-xs text-white/50">Journal intime, souvenirs partagés et créations d'IA de votre foyer</p>
          </div>
        </div>
      </div>

      {/* Navigation sub-tabs */}
      <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 flex gap-1">
        <button
          onClick={() => setActiveSubTab('album')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'album' 
              ? 'bg-[#FF4D6D] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <span>📸 Album Photo</span>
        </button>
        <button
          onClick={() => setActiveSubTab('gazette')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'gazette' 
              ? 'bg-[#FF4D6D] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <span>📰 Gazette Rétro</span>
        </button>
        <button
          onClick={() => setActiveSubTab('comic')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 ${
            activeSubTab === 'comic' 
              ? 'bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white border-none shadow-md' 
              : 'hover:text-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>🦸 Gazette BD IA</span>
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
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Image (Appareil photo / Bibliothèque locale - Sélectionnez plusieurs)</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-[#FF4D6D]/45 rounded-xl p-4 bg-white/5 cursor-pointer min-h-[90px] transition-all">
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Camera className="w-5 h-5 text-white/60 mb-1" />
                    <span className="text-[10px] font-bold text-white/80">Ajouter des photos</span>
                    <span className="text-[8px] text-white/40 mt-0.5">Appareil photo ou Galerie</span>
                  </div>

                  <div className="rounded-xl p-2 border border-white/10 flex flex-wrap gap-2 bg-black/20 min-h-[90px] items-center justify-center overflow-y-auto max-h-[140px]">
                    {uploadedImages.length > 0 ? (
                      uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 group">
                          <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 text-[10px] font-bold transition-all cursor-pointer"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="relative w-full h-full min-h-[70px] rounded-lg overflow-hidden flex items-center justify-center bg-black/20">
                        <img src={selectedPresetImage} alt="Preset default" className="w-full h-full object-cover opacity-60 absolute inset-0" />
                        <span className="relative z-10 px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-bold text-white/60 border border-white/10 uppercase">
                          Défaut Preset
                        </span>
                      </div>
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
              <MemoryCard 
                key={m.id}
                m={m}
                isParent={isParent}
                handleLike={handleLike}
                setMemories={setMemories}
              />
            ))}
          </div>

        </div>
      )}

      {/* GAZETTE VIEW */}
      {activeSubTab === 'gazette' && (
        <div className="space-y-6">
          
          <div className="gazette-printable relative rounded-[32px] overflow-hidden border border-amber-500/20 bg-[#0f1524] text-white p-6 md:p-8 flex flex-col justify-between min-h-[500px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] font-serif">
            
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFB020]/4 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#FF4D6D]/4 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="text-center relative z-10">
              <span className="text-[8.5px] font-black text-[#FFB020] uppercase tracking-widest block font-sans">
                Chronique Hebdomadaire des Temps Merveilleux
              </span>
              
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white font-serif mt-2 select-none uppercase">
                {activeMemberId === '1' || activeMemberId === '2' ? 'LA GAZETTE DES DJITÉ' : 'L\'ÉCHO DES DJITÉ'}
              </h2>
              
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent my-3"></div>
              
              <div className="flex justify-between items-center text-[9.5px] text-white/55 font-sans px-3 uppercase tracking-wider font-bold border-y border-white/8 py-2">
                <span>Vol. VIII • No. 116</span>
                <span className="text-center text-[#FFB020]">
                  Dimanche {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span>Prix : Gratuit & Précieux</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 relative z-10 border-b border-white/8 pb-6 items-stretch">
              
              <div className="md:col-span-5 space-y-3 md:border-r border-white/8 pr-0 md:pr-6 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="inline-block bg-[#FFB020]/10 border border-[#FFB020]/25 rounded-md px-2 py-0.5">
                    <span className="text-[8.5px] font-black text-[#FFB020] uppercase tracking-wider font-sans">Éditorial Merveilleux</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white leading-snug">
                    L'Art de Vivre Ensemble sous le Toit Céleste
                  </h3>
                  <p className="text-[11px] text-white/60 leading-relaxed font-sans first-letter:text-3xl first-letter:font-black first-letter:text-[#FFB020] first-letter:mr-1.5 first-letter:float-left">
                    Une nouvelle semaine s'achève au sein du foyer, riche en fous rires, en apprentissages et en précieux moments de partage. Nos rituels quotidiens demeurent le ciment de notre harmonie céleste. Entre les plats mijotés avec amour et les contes féériques du soir, la maisonnée rayonne de bonheur et de complicité.
                  </p>
                </div>
                
                <div className="border-t border-dashed border-white/10 pt-3 mt-3">
                  <span className="text-[8.5px] font-bold text-white/35 italic block font-sans">
                    — Rédigé avec tendresse par le Majordome IA
                  </span>
                </div>
              </div>

              <div className="md:col-span-4 space-y-4 md:border-r border-white/8 px-0 md:px-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="inline-block bg-[#FF4D6D]/10 border border-[#FF4D6D]/25 rounded-md px-2 py-0.5">
                    <span className="text-[8.5px] font-black text-[#FF4D6D] uppercase tracking-wider font-sans">Instant Figé</span>
                  </div>
                  
                  <div className="border-2 border-white/10 p-1.5 bg-white/3 rounded-xl overflow-hidden shadow-inner group">
                    <img 
                      src={visibleMemories[0]?.imageUrl || "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&auto=format&fit=crop&q=80"} 
                      alt="News Illustration" 
                      className="w-full h-28 object-cover rounded-lg grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                    <div className="pt-2 text-center">
                      <span className="text-[8.5px] italic text-white/40 leading-none block font-sans">
                        « {visibleMemories[0]?.title || "Souvenir immortalisé de la semaine"} »
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-dashed border-white/10">
                  <span className="text-[8.5px] font-black text-[#00D26A] uppercase tracking-wider block font-sans">Le Bulletin des Ménages</span>
                  <p className="text-[10px] text-white/60 leading-normal font-sans">
                    Les tâches ont été réparties avec démocratie. Le foyer brille d'une propreté exemplaire grâce aux efforts conjoints de chacun.
                  </p>
                </div>
              </div>

              <div className="md:col-span-3 space-y-4 pl-0 md:pl-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="inline-block bg-[#00D26A]/10 border border-[#00D26A]/25 rounded-md px-2 py-0.5">
                    <span className="text-[8.5px] font-black text-[#00D26A] uppercase tracking-wider font-sans">Brèves du Foyer</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10.5px] font-extrabold text-white uppercase tracking-wider leading-tight">
                      L'Exploit Scolaire
                    </h4>
                    <p className="text-[10px] text-white/55 leading-normal font-sans">
                      Les devoirs ont été finalisés dans le calme olympien. L'IA salue la persévérance de nos jeunes explorateurs du savoir.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-dashed border-white/10 pt-2.5">
                    <h4 className="text-[10.5px] font-extrabold text-white uppercase tracking-wider leading-tight">
                      Le Mot de l'Éco-Chef
                    </h4>
                    <p className="text-[10px] text-white/55 leading-normal font-sans">
                      Menu varié, savoureux, équilibré et garanti sans gaspillage alimentaire. L'estomac et la planète vous remercient !
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-double border-white/10 text-center font-sans">
                  <span className="text-[8.5px] text-[#FF4D6D] font-extrabold uppercase tracking-widest block animate-pulse">
                    Météo des Cœurs : Radieuse ☀️
                  </span>
                </div>
              </div>

            </div>

            <div className="pt-3 flex flex-col items-center justify-center relative z-10 w-full no-print">
              {generatingGazette ? (
                <div className="w-full p-4 rounded-[20px] bg-white/3 border border-white/6 flex flex-col items-center justify-center space-y-2.5 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-[#FFB020] animate-spin" />
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest font-sans">
                    {gazetteStep === 1 ? 'Chiffonnage du papier vintage...' :
                     gazetteStep === 2 ? 'Impression des chroniques familiales...' :
                     'Mise sous pli dorée de la gazette...'}
                  </span>
                </div>
              ) : (
                <button
                  onClick={generateGazette}
                  className="w-full py-4 rounded-[20px] bg-gradient-to-r from-[#FF4D6D] via-pink-500 to-[#FFB020] text-white font-black text-xs tracking-wider uppercase cursor-pointer transition-all hover:brightness-105 active:scale-[0.99] shadow-lg flex items-center justify-center space-x-2.5 font-sans"
                >
                  <Printer className="w-4.5 h-4.5 text-white" />
                  <span>Imprimer la Gazette Rétro de la Famille</span>
                </button>
              )}
            </div>

          </div>
          
        </div>
      )}

      {/* 🦸 100% REAL IA COMIC TAB VIEW */}
      {activeSubTab === 'comic' && (
        <div className="space-y-6">
          
          {/* Style Selector Toolbar */}
          <div className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-3">
            <span className="text-[10px] font-black text-[#6C5CFF] uppercase tracking-widest block flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              Style Artistique de votre Bande Dessinée :
            </span>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'retro', label: '🦸 Comics Rétro', desc: 'Marvel Vintage 1980' },
                { id: 'manga', label: '🏮 Shonen Manga', desc: 'Anime Moderne' },
                { id: 'fantasy', label: '🧙 Fantasy Épique', desc: 'Livre Enchanté' },
                { id: 'cyberpunk', label: '🌆 Cyberpunk', desc: 'Futur Néon' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setSelectedComicStyle(st.id as any)}
                  className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    selectedComicStyle === st.id 
                      ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-md' 
                      : 'bg-white/3 border-white/5 text-white/50 hover:bg-white/5'
                  }`}
                >
                  <span className="text-[10.5px] font-black">{st.label}</span>
                  <span className="text-[8.5px] opacity-60 font-sans mt-0.5">{st.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={generateComicBook}
              disabled={isGeneratingComic}
              className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:brightness-105 transition-all shadow-md shadow-[#6C5CFF]/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isGeneratingComic ? 'animate-spin' : ''}`} />
              <span>Re-générer l'œuvre de la semaine</span>
            </button>
          </div>

          {/* Loader Overlay */}
          {isGeneratingComic ? (
            <div className="glass-panel border border-white/10 rounded-[32px] p-8 text-center flex flex-col items-center justify-center min-h-[350px] space-y-4 animate-pulse">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] animate-ping opacity-30"></div>
                <Sparkles className="w-7 h-7 text-white animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-[#FF4D6D] uppercase tracking-widest block">Studio d'IA Céleste</span>
                <h4 className="text-sm font-black text-white">{comicGenerationProgress}</h4>
                <p className="text-[10px] text-white/40 italic font-sans max-w-xs mx-auto">
                  Stable Diffusion dessine vos souvenirs à la volée. Cela peut prendre 3 à 6 secondes...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Planche de BD */}
              <div className="relative rounded-[36px] overflow-hidden border border-[#6C5CFF]/25 bg-black/60 p-6 md:p-8 space-y-8 shadow-[0_20px_60px_rgba(108,92,255,0.15)]">
                
                {/* 1. Couverture de Comics Héroïque */}
                {comicImage && (
                  <div className="relative w-full max-w-sm mx-auto rounded-[24px] overflow-hidden border-4 border-white shadow-2xl transform rotate-[-0.5deg] group hover:rotate-0 transition-transform duration-500">
                    <img src={comicImage} alt="Comic Cover" className="w-full h-auto object-cover" />
                    
                    {/* Retro Comic Labels overlay */}
                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start">
                      <div className="bg-[#FFB020] text-black px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">
                        N° 01 • SEMAINE OR
                      </div>
                      <div className="bg-[#FF4D6D] text-white px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">
                        0.15 €
                      </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 text-center">
                      <span className="text-[8.5px] font-bold text-[#FFB020] uppercase tracking-widest block font-sans">
                        Les Chroniques Héroïques du Clan
                      </span>
                      <h3 className="text-base font-black text-white font-serif tracking-tight uppercase leading-none mt-1">
                        L'Aventure Merveilleuse
                      </h3>
                    </div>
                  </div>
                )}

                {/* 2. Planche de Cases avec Bulles Retro CSS */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest block">
                      📖 Épopée en 3 chapitres réels
                    </span>
                    <span className="text-[9px] text-[#6C5CFF] font-bold font-sans">
                      Photos réelles de la semaine intégrées
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {comicChapters.map((ch, idx) => (
                      <div 
                        key={idx} 
                        className={`glass-panel border border-white/10 rounded-[28px] p-4 flex flex-col justify-between relative shadow-lg transform transition-all hover:scale-102 duration-300 ${
                          idx === 0 ? 'rotate-[-0.8deg] border-l-[#FF4D6D]' :
                          idx === 1 ? 'rotate-[0.5deg] border-t-[#FFB020]' :
                          'rotate-[-0.5deg] border-r-[#6C5CFF]'
                        }`}
                      >
                        {/* Incrustation photo réelle */}
                        {ch.photo && (
                          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/8 bg-black/40 mb-3 shadow-inner">
                            <img src={ch.photo} alt={ch.title} className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 hover:brightness-100 transition-all duration-500" />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[7.5px] font-extrabold text-[#FFB020] uppercase tracking-wider">
                              Capture Réelle
                            </span>
                          </div>
                        )}

                        {/* Bulle de dialogue CSS rétro */}
                        <div className="relative bg-white text-black p-3.5 rounded-[20px] shadow-md border-2 border-black font-sans text-[11px] leading-relaxed font-semibold mb-4">
                          <p className="italic">« {ch.desc} »</p>
                          {/* Triangle point direction of speech bubble */}
                          <div className="absolute bottom-[-10px] left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-black"></div>
                          <div className="absolute bottom-[-7px] left-[25px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-white"></div>
                        </div>

                        {/* Infos auteur */}
                        <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            Chapitre {idx + 1} • <span className="text-[#6C5CFF]">{ch.author}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Actions Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <a 
                    href={comicImage} 
                    download="MaFamille_BD_Semaine.png"
                    target="_blank"
                    rel="noreferrer"
                    className="py-3.5 rounded-xl border border-white/10 bg-white/5 text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger la Couverture</span>
                  </a>

                  <button
                    onClick={handleShareComicToWall}
                    className="py-3.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:brightness-110 transition-all shadow-md shadow-[#6C5CFF]/15 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Publier la BD sur le Mur</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
