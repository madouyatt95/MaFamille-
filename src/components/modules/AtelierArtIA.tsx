import React, { useState, useRef, useEffect } from 'react';
import { 
  Paintbrush, 
  Sparkles, 
  Trash2, 
  Gift, 
  Palette, 
  Check, 
  ArrowLeft,
  Share2
} from 'lucide-react';
import type { MemoryLog } from '../../types';

interface AtelierArtIAProps {
  activeMemberId: string;
  onBack: () => void;
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
}

const PRESET_ARTWORKS = [
  {
    prompt: "chat pirate lune",
    title: "Le Pirate Céleste 🐱🏴‍☠️",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80"
  },
  {
    prompt: "château nuage",
    title: "Le Palais des Rêves de Coton 🏰☁️",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80"
  },
  {
    prompt: "dinosaure espace",
    title: "Le T-Rex Cosmique 🦖🪐",
    url: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&auto=format&fit=crop&q=80"
  }
];

export const AtelierArtIA: React.FC<AtelierArtIAProps> = ({
  activeMemberId,
  onBack,
  setMemories
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#7C3AED');
  const [brushSize, setBrushSize] = useState(6);
  const [brushType, setBrushType] = useState<'solid' | 'neon' | 'rainbow'>('solid');
  
  // Imagination states
  const [artPrompt, setArtPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedArt, setGeneratedArt] = useState<{ title: string; url: string } | null>(null);
  const [isOrdered, setIsOrdered] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Rainbow color state
  const rainbowHue = useRef(0);

  // Initialize canvas with smooth properties
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Fill canvas background with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    // Apply brush style
    if (brushType === 'rainbow') {
      rainbowHue.current = (rainbowHue.current + 3) % 360;
      ctx.strokeStyle = `hsl(${rainbowHue.current}, 100%, 50%)`;
      ctx.shadowBlur = 0;
    } else if (brushType === 'neon') {
      ctx.strokeStyle = brushColor;
      ctx.shadowColor = brushColor;
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = brushColor;
      ctx.shadowBlur = 0;
    }

    ctx.lineWidth = brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Launch AI Artwork Generation
  const handleGenerateArt = () => {
    if (!artPrompt.trim()) return;

    setIsGenerating(true);
    setGenerationStep(1);

    setTimeout(() => {
      setGenerationStep(2);
      setTimeout(() => {
        setGenerationStep(3);
        setTimeout(() => {
          // Select preset or match prompt
          const matched = PRESET_ARTWORKS.find(art => 
            artPrompt.toLowerCase().includes(art.prompt)
          ) || PRESET_ARTWORKS[Math.floor(Math.random() * PRESET_ARTWORKS.length)];

          setGeneratedArt({
            title: artPrompt.length > 25 ? `${artPrompt.substring(0, 25)}...` : artPrompt,
            url: matched.url
          });
          setIsGenerating(false);
          setGenerationStep(0);
          setIsPublished(false);
          setIsOrdered(false);
        }, 1500);
      }, 1200);
    }, 1200);
  };

  // Publish to Family wall memories
  const handlePublishToWall = () => {
    if (!generatedArt) return;

    const author = activeMemberId === '3' ? 'Amadou' : activeMemberId === '4' ? 'Awa' : activeMemberId === '1' ? 'Papa' : 'Maman';
    const authorPic = activeMemberId === '1' 
      ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' 
      : activeMemberId === '2' 
        ? 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80'
        : activeMemberId === '3'
          ? 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=150&auto=format&fit=crop&q=80';

    const newMemory: MemoryLog = {
      id: `art-${Date.now()}`,
      title: `🎨 Œuvre d'Art : ${generatedArt.title}`,
      description: `Chef-d'œuvre magique imaginé par ${author} et magnifié par l'intelligence artificielle céleste : « ${artPrompt} ».`,
      imageUrl: generatedArt.url,
      imageUrls: [generatedArt.url],
      date: new Date().toLocaleDateString('fr-FR'),
      authorName: author,
      authorPhoto: authorPic,
      likesCount: 0,
      theme: '🎨 Création',
      isPrivate: false
    };

    setMemories(prev => [newMemory, ...prev]);
    setIsPublished(true);
    alert("Félicitations ! Ton œuvre a été publiée sur le Mur de la Famille ! 📸");
  };

  return (
    <div className="w-full max-w-5xl space-y-6 animate-fade-in px-1 md:px-4 font-sans">
      
      {/* Header section with back button */}
      <div className="space-y-4 relative w-full">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-16 bg-[#7C3AED]/10 filter blur-[40px] rounded-full"></div>
        
        <div className="flex items-center justify-between w-full relative z-10 px-1">
          <button 
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-white/3 border border-white/6 hover:bg-white/8 text-white/70 hover:text-white transition-all duration-300 cursor-pointer flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FFB020]" />
            <span>Retour</span>
          </button>

          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600/15 via-pink-500/15 to-[#FFB020]/15 border border-white/8 px-4.5 py-1.8 rounded-full backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#FFB020] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020]">Atelier d'Art Céleste</span>
          </div>
        </div>
        
        <div className="text-center space-y-2 relative z-10">
          <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">
            Dessine & Imagine avec l'IA
          </h2>
          <p className="text-xs text-white/50 max-w-md mx-auto">
            Gribouille une idée sur le tableau magique ou décris ton rêve le plus fou pour donner vie à un chef-d'œuvre inédit !
          </p>
        </div>
      </div>

      {/* Main Dual Panels Grid (Drawing Board on left, AI magical display on right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* PANEL 1: THE DOCK BOARD (DRAWING CANVAS) */}
        <div className="md:col-span-7 flex flex-col justify-between bg-white/4 border border-white/8 rounded-[32px] p-5 backdrop-blur-xl space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                1. Tableau à gribouiller
              </span>
              <button 
                onClick={clearCanvas}
                className="p-2 rounded-xl bg-white/3 border border-white/6 hover:bg-red-500/15 hover:text-red-400 text-white/60 transition-colors flex items-center space-x-1.5 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer</span>
              </button>
            </div>

            {/* Canvas Container */}
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair touch-none"
              />
            </div>

            {/* Premium Brush and Palette controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              
              {/* Palette & size */}
              <div className="space-y-2.5">
                <span className="text-[9px] font-extrabold text-white/40 uppercase tracking-wider block">Palette de couleurs</span>
                <div className="flex items-center space-x-2">
                  {['#7C3AED', '#FF4D6D', '#FFB020', '#00D26A', '#00F0FF', '#111827'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setBrushColor(color);
                        setBrushType('solid');
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        brushColor === color && brushType === 'solid'
                          ? 'border-white scale-110 shadow-lg' 
                          : 'border-white/15'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  
                  {/* Rainbow Selector brush */}
                  <button
                    onClick={() => setBrushType('rainbow')}
                    className={`w-6 h-6 rounded-full border-2 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 transition-all cursor-pointer ${
                      brushType === 'rainbow' ? 'border-white scale-110' : 'border-white/15'
                    }`}
                    title="Arc-en-ciel magique"
                  />
                </div>

                {/* Thickness Slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[9px] text-white/40 font-extrabold">
                    <span>Épaisseur du trait</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFB020]"
                  />
                </div>
              </div>

              {/* Brush dynamic effects selection */}
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold text-white/40 uppercase tracking-wider block">Type de pinceau</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBrushType('solid')}
                    className={`py-2 px-2.5 rounded-xl border flex items-center justify-center space-x-1.5 transition-all text-[9.5px] font-extrabold uppercase tracking-wide cursor-pointer ${
                      brushType === 'solid' ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white' : 'bg-white/3 border-white/6 text-white/50 hover:bg-white/6'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Classique</span>
                  </button>
                  <button
                    onClick={() => {
                      setBrushType('neon');
                      if (brushColor === '#111827') setBrushColor('#7C3AED');
                    }}
                    className={`py-2 px-2.5 rounded-xl border flex items-center justify-center space-x-1.5 transition-all text-[9.5px] font-extrabold uppercase tracking-wide cursor-pointer ${
                      brushType === 'neon' ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-white/3 border-white/6 text-white/50 hover:bg-white/6'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Néon Cosmique</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* PANEL 2: THE AI MAGICAL GENERATION */}
        <div className="md:col-span-5 flex flex-col justify-between bg-white/4 border border-white/8 rounded-[32px] p-5 backdrop-blur-xl space-y-5">
          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3.5">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                2. L'imaginateur magique
              </span>

              {/* Prompt input field */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-[#FFB020] uppercase tracking-wider block">Décris ton idée de rêve</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: un chat pirate sur la lune, un dinosaure cosmique..."
                    value={artPrompt}
                    onChange={(e) => setArtPrompt(e.target.value)}
                    className="w-full bg-[#0d1627] border border-white/10 rounded-2xl pl-4 pr-11 py-3.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020] focus:shadow-[0_0_12px_rgba(255,176,32,0.15)] transition-all"
                  />
                  <button
                    onClick={() => {
                      const ideas = [
                        "Un mignon chat pirate sur la lune",
                        "Un château magique dans un nuage rose",
                        "Un adorable dinosaure astronaute",
                        "Une licorne sous-marine avec des dauphins",
                        "Une fusée en sucre d'orge dans le ciel"
                      ];
                      setArtPrompt(ideas[Math.floor(Math.random() * ideas.length)]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base filter grayscale hover:grayscale-0 active:scale-95 transition-all cursor-pointer"
                    title="Idée magique surprise !"
                  >
                    ✨
                  </button>
                </div>
              </div>

              {/* Generate Trigger Button */}
              <button
                onClick={handleGenerateArt}
                disabled={isGenerating || !artPrompt.trim()}
                className="w-full py-4.5 rounded-[22px] bg-gradient-to-r from-violet-600 via-pink-500 to-[#FFB020] text-white font-black text-[10px] tracking-widest uppercase cursor-pointer shadow-lg hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4.5 h-4.5 text-white animate-pulse" />
                <span>MAGIFIER MON DESSIN PAR L'IA</span>
              </button>
            </div>

            {/* AI Generated Display Screen */}
            <div className="flex-1 flex items-center justify-center min-h-[220px] rounded-2xl border border-dashed border-white/15 bg-black/30 overflow-hidden relative p-4 mt-2">
              
              {isGenerating ? (
                <div className="text-center space-y-3 animate-pulse">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#FFB020] animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-[#FFB020]" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/90 uppercase tracking-widest block font-sans">Génération magique...</span>
                    <span className="text-[8px] text-white/40 uppercase block tracking-wider">
                      {generationStep === 1 ? 'Analyse du gribouillage de base...' :
                       generationStep === 2 ? 'Modélisation tridimensionnelle...' :
                       'Peinture pastel féérique finale...'}
                    </span>
                  </div>
                </div>
              ) : generatedArt ? (
                // Reveal beautiful high fidelity pastel artwork
                <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 group">
                  <img 
                    src={generatedArt.url} 
                    alt="Art generation"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.7] contrast-[1.05]"
                  />
                  
                  {/* Subtle glass header badge */}
                  <div className="relative z-10 self-start bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 backdrop-blur-md">
                    <span className="text-[8.5px] font-extrabold text-[#FFB020] uppercase tracking-wider font-sans">Chef-d'œuvre Magnifié ✨</span>
                  </div>

                  {/* Glass bottom controls */}
                  <div className="relative z-10 mt-auto bg-black/65 border border-white/8 rounded-2xl p-3 backdrop-blur-md space-y-3.5">
                    <div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wider">{generatedArt.title}</h4>
                      <p className="text-[9px] text-white/50 mt-0.5 leading-relaxed font-sans font-medium">« {artPrompt} »</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Publish on Family Wall */}
                      <button
                        onClick={handlePublishToWall}
                        disabled={isPublished}
                        className={`py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                          isPublished
                            ? 'bg-[#00D26A]/20 border border-[#00D26A] text-[#00D26A] pointer-events-none'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        {isPublished ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{isPublished ? 'Partagé !' : 'Partager'}</span>
                      </button>

                      {/* Order physical painting Frame */}
                      <button
                        onClick={() => {
                          setIsOrdered(true);
                          alert("Commande Premium Simulée ! 🎉\n\nTon tableau en 3D pastel haute définition a été envoyé à l'impression. Un cadre en bois brut 20x30 cm sera livré à la maison d'ici 3 jours. Bravo l'Artiste ! 🖼️");
                        }}
                        disabled={isOrdered}
                        className={`py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer ${
                          isOrdered
                            ? 'bg-[#FFB020]/20 border border-[#FFB020] text-[#FFB020] pointer-events-none'
                            : 'bg-gradient-to-r from-pink-500 to-[#FF4D6D] border border-transparent text-white hover:brightness-105'
                        }`}
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>{isOrdered ? 'Commandé !' : 'Commander'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 p-6">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/8 flex items-center justify-center mx-auto text-white/30">
                    <Paintbrush className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest block font-sans">En attente d'inspiration</span>
                    <p className="text-[9px] text-white/30 max-w-[200px] mx-auto leading-relaxed">Gribouille ou écris une idée magique à gauche, puis appuie sur Générer !</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
