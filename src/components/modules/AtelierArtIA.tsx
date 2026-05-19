import React, { useState, useRef, useEffect } from 'react';
import { 
  Paintbrush, 
  Sparkles, 
  Trash2, 
  Gift, 
  Palette, 
  Check, 
  ArrowLeft,
  Share2,
  Download
} from 'lucide-react';
import type { MemoryLog } from '../../types';

interface AtelierArtIAProps {
  activeMemberId: string;
  onBack: () => void;
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
}

const ART_STYLES = [
  { id: '3d', label: '3D Pixar ✨', emoji: '🧸', styleDesc: 'en volume 3D féérique et coloré' },
  { id: 'watercolor', label: 'Aquarelle 🎨', emoji: '🖌️', styleDesc: 'en aquarelle douce aux tons pastel' },
  { id: 'anime', label: 'Animé 🌸', emoji: '⚡', styleDesc: 'en dessin animé japonais dynamique' },
  { id: 'neon', label: 'Néon Cosmique 🌌', emoji: '🔮', styleDesc: 'en peinture luminescente néon galactique' }
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
  
  // Track if canvas has drawings
  const [hasDrawn, setHasDrawn] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('3d');
  
  // Imagination states
  const [artPrompt, setArtPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [userSketchUrl, setUserSketchUrl] = useState<string | null>(null);
  const [generatedArt, setGeneratedArt] = useState<{ title: string; url: string } | null>(null);
  const [isOrdered, setIsOrdered] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Rainbow color state
  const rainbowHue = useRef(0);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
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
    setHasDrawn(true);
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
        setHasDrawn(false);
        setUserSketchUrl(null);
      }
    }
  };

  // Download raw sketch
  const downloadSketch = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'mon-gribouillage-celeste.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Launch AI Artwork Generation using drawing + prompt + style
  const handleGenerateArt = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture the sketch ONLY if user actually drew something
    if (hasDrawn) {
      const sketchUrl = canvas.toDataURL('image/png');
      setUserSketchUrl(sketchUrl);
    } else {
      setUserSketchUrl(null);
    }

    setIsGenerating(true);
    setGenerationStep(1);

    setTimeout(() => {
      setGenerationStep(2);
      setTimeout(() => {
        setGenerationStep(3);
        setTimeout(() => {
          // 1. Récupérer le prompt de l'enfant ou un prompt par défaut magique
          const basePrompt = artPrompt.trim() || (hasDrawn ? "Dessin magique et créatif d'un enfant" : "Paysage féérique et magique");

          // 2. Traduction ou enrichissement automatique selon le style choisi
          let styleEnrichment = "digital art, highly detailed, vibrant colors";
          if (selectedStyle === '3d') {
            styleEnrichment = "cute 3D render, Disney Pixar style, claymation toy, soft volumetric lighting, vibrant cheerful colors, highly detailed, masterpiece";
          } else if (selectedStyle === 'watercolor') {
            styleEnrichment = "beautiful dreamy watercolor painting, soft pastel color wash, fairytale illustration, wet-on-wet technique, magical aesthetic";
          } else if (selectedStyle === 'anime') {
            styleEnrichment = "vibrant anime style, digital art, Studio Ghibli aesthetic, anime illustration, colorful glowing lights, beautiful sky background";
          } else if (selectedStyle === 'neon') {
            styleEnrichment = "glowing neon cosmic illustration, cyberpunk luminescent paint, galaxy background, glowing lines, ultraviolet glow effect, majestic fantasy art";
          }

          // 3. Encoder le prompt complet pour l'URL
          const fullPrompt = `${basePrompt}, ${styleEnrichment}`;
          const encodedPrompt = encodeURIComponent(fullPrompt);

          // 4. URL de génération d'image IA générative en direct de Pollinations.ai !
          // Nous ajoutons une graine de bruit (seed) aléatoire pour garantir que deux générations du même prompt donnent des œuvres uniques !
          const randomSeed = Math.floor(Math.random() * 1000000);
          const aiGeneratedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=600&seed=${randomSeed}&nologo=true`;

          setGeneratedArt({
            title: artPrompt ? artPrompt : `Œuvre Magique ${selectedStyle.toUpperCase()}`,
            url: aiGeneratedUrl
          });
          setIsGenerating(false);
          setGenerationStep(0);
          setIsPublished(false);
          setIsOrdered(false);
        }, 2000);
      }, 1200);
    }, 1200);
  };

  // Publish to Family wall memories (comparative Polaroids)
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
      title: `🎨 Chef-d'œuvre : ${generatedArt.title}`,
      description: `Création interactive imaginée par ${author}. ${userSketchUrl ? 'Gribouillage de base magnifié' : 'Idée textuelle matérialisée'} par l'IA céleste en style ${ART_STYLES.find(s => s.id === selectedStyle)?.label}.`,
      imageUrl: generatedArt.url,
      imageUrls: userSketchUrl ? [userSketchUrl, generatedArt.url] : [generatedArt.url],
      date: new Date().toLocaleDateString('fr-FR'),
      authorName: author,
      authorPhoto: authorPic,
      likesCount: 0,
      theme: '🎨 Création',
      isPrivate: false
    };

    setMemories(prev => [newMemory, ...prev]);
    setIsPublished(true);
    alert(userSketchUrl ? "Félicitations ! Ton œuvre interactive a été publiée sur le Mur de la Famille avec ton gribouillage ! 📸" : "Félicitations ! Ton idée magique a été publiée sur le Mur de la Famille ! 📸");
  };

  return (
    <div className="w-full max-w-5xl space-y-6 animate-fade-in px-1 md:px-4 font-sans text-white">
      
      {/* Header section */}
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
          <h2 className="text-xl md:text-3xl font-black tracking-tight">
            Magifie tes Gribouillages par l'IA
          </h2>
          <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
            Fais un dessin ou de simples tracés de couleurs sur le tableau magique, choisis ton style artistique et regarde l'IA donner vie à ton idée !
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* PANEL 1: DRAWING BOARD (HTML5 Canvas + Interactive controls) */}
        <div className="md:col-span-7 flex flex-col justify-between bg-white/4 border border-white/8 rounded-[32px] p-5 backdrop-blur-xl space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                1. Gribouille ton dessin
              </span>
              <div className="flex items-center space-x-2">
                {hasDrawn && (
                  <button 
                    onClick={downloadSketch}
                    className="p-2 rounded-xl bg-white/3 border border-white/6 hover:bg-white/8 text-[#00F0FF] transition-colors flex items-center space-x-1.5 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer animate-fade-in"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sauver</span>
                  </button>
                )}
                <button 
                  onClick={clearCanvas}
                  className="p-2 rounded-xl bg-white/3 border border-white/6 hover:bg-red-500/15 hover:text-red-400 text-white/60 transition-colors flex items-center space-x-1.5 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Effacer</span>
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white relative shadow-inner">
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
              {!hasDrawn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] animate-bounce-slow mb-2">
                    <Paintbrush className="w-5.5 h-5.5" />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Gribouille ici !</span>
                  <span className="text-[9px] text-slate-400/60 max-w-[200px] mt-1 leading-normal">Utilise tes doigts ou ta souris pour faire des tracés de couleurs.</span>
                </div>
              )}
            </div>

            {/* Premium Palette controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              
              {/* Palette */}
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold text-white/40 uppercase tracking-wider block">Palette de couleurs</span>
                <div className="flex items-center space-x-1.5 flex-wrap">
                  {['#7C3AED', '#FF4D6D', '#FFB020', '#00D26A', '#00F0FF', '#111827'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setBrushColor(color);
                        setBrushType('solid');
                      }}
                      className={`w-6.5 h-6.5 rounded-full border-2 transition-all cursor-pointer ${
                        brushColor === color && brushType === 'solid'
                          ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]' 
                          : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  
                  {/* Rainbow Selector brush */}
                  <button
                    onClick={() => setBrushType('rainbow')}
                    className={`w-6.5 h-6.5 rounded-full border-2 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 transition-all cursor-pointer ${
                      brushType === 'rainbow' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'border-white/10'
                    }`}
                    title="Arc-en-ciel magique"
                  />
                </div>
              </div>

              {/* Pinceaux types */}
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold text-white/40 uppercase tracking-wider block">Pinceau spécial</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setBrushType('solid')}
                    className={`py-2 px-2 rounded-xl border flex items-center justify-center space-x-1 transition-all text-[9px] font-black uppercase tracking-wide cursor-pointer ${
                      brushType === 'solid' ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white shadow-inner' : 'bg-white/3 border-white/6 text-white/40 hover:bg-white/6'
                    }`}
                  >
                    <Palette className="w-3 h-3" />
                    <span>Classique</span>
                  </button>
                  <button
                    onClick={() => {
                      setBrushType('neon');
                      if (brushColor === '#111827') setBrushColor('#7C3AED');
                    }}
                    className={`py-2 px-2 rounded-xl border flex items-center justify-center space-x-1 transition-all text-[9px] font-black uppercase tracking-wide cursor-pointer ${
                      brushType === 'neon' ? 'bg-pink-500/20 border-pink-500 text-white shadow-inner' : 'bg-white/3 border-white/6 text-white/40 hover:bg-white/6'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Cosmique Néon</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Thickness and Size slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[9px] text-white/40 font-extrabold">
                <span>Épaisseur du tracé</span>
                <span>{brushSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFB020]"
              />
            </div>

          </div>
        </div>

        {/* PANEL 2: THE AI MAGICAL TRANSFORMATION & CO-CREATION */}
        <div className="md:col-span-5 flex flex-col justify-between bg-white/4 border border-white/8 rounded-[32px] p-5 backdrop-blur-xl space-y-4">
          <div className="space-y-4 h-full flex flex-col justify-between">
            
            <div className="space-y-3">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                2. Style & Co-Création IA
              </span>

              {/* Style selector grid */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-white/50 uppercase tracking-wider block">Choisis ton style magique</label>
                <div className="grid grid-cols-2 gap-2">
                  {ART_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer backdrop-blur-md flex flex-col justify-between ${
                        selectedStyle === style.id 
                          ? 'bg-gradient-to-br from-[#7C3AED]/20 to-pink-500/20 border-[#FFB020] text-white shadow-lg' 
                          : 'bg-white/3 border-white/6 text-white/60 hover:bg-white/6'
                      }`}
                    >
                      <span className="text-[14px]">{style.emoji}</span>
                      <span className="text-[9.5px] font-black uppercase tracking-wider mt-1 block">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt/Imagination Input */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-white/50 uppercase tracking-wider block">Ajoute une idée (facultatif)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: un dinosaure cosmique, un chat..."
                    value={artPrompt}
                    onChange={(e) => setArtPrompt(e.target.value)}
                    className="w-full bg-[#0d1627]/60 border border-white/10 rounded-2xl pl-3 pr-10 py-3 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#FFB020] transition-all"
                  />
                  <button
                    onClick={() => {
                      const ideas = [
                        "Un dinosaure astronaute rigolo",
                        "Un château dans un nuage de coton rose",
                        "Un chat pirate sur la lune",
                        "Une licorne sous-marine féérique"
                      ];
                      setArtPrompt(ideas[Math.floor(Math.random() * ideas.length)]);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm filter grayscale hover:grayscale-0 active:scale-95 transition-all cursor-pointer"
                    title="Idée magique surprise"
                  >
                    ✨
                  </button>
                </div>
              </div>

              {/* Main Transformation Trigger */}
              <button
                onClick={handleGenerateArt}
                disabled={isGenerating || (!hasDrawn && !artPrompt.trim())}
                className="w-full py-4 rounded-[22px] bg-gradient-to-r from-violet-600 via-pink-500 to-[#FFB020] text-white font-black text-[10px] tracking-widest uppercase cursor-pointer shadow-lg hover:brightness-105 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
                <span>{hasDrawn ? 'MAGIFIER MON GRIBOUILLAGE ✨' : 'GÉNÉRER MON IDÉE ✨'}</span>
              </button>
            </div>

            {/* CO-CREATION PREVIEW & RESULT BOX */}
            <div className="flex-1 flex items-center justify-center min-h-[220px] rounded-2xl border border-dashed border-white/10 bg-black/40 overflow-hidden relative p-3">
              
              {isGenerating ? (
                <div className="text-center space-y-3 animate-pulse">
                  <div className="relative w-11 h-11 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#FFB020] animate-spin"></div>
                    <Sparkles className="w-5 h-5 text-[#FFB020]" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest block font-sans">Fusion magique...</span>
                    <span className="text-[8px] text-white/40 uppercase block tracking-wider font-semibold">
                      {generationStep === 1 ? 'Analyse de ton idée...' :
                       generationStep === 2 ? 'Modélisation tridimensionnelle...' :
                       `Création artistique en style ${ART_STYLES.find(s => s.id === selectedStyle)?.label}...`}
                    </span>
                  </div>
                </div>
              ) : generatedArt ? (
                // Flexible layout: Before/After if sketched, or Full Screen AI Art if text-only!
                <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-3.5 bg-[#0b0f19]">
                  
                  {userSketchUrl ? (
                    /* Grid showing comparison (Mode Sketch) */
                    <div className="grid grid-cols-2 gap-3 flex-1 items-stretch mt-1 mb-2">
                      {/* Left: Original Sketch */}
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-white p-1 relative flex flex-col justify-between min-h-[120px]">
                        <img 
                          src={userSketchUrl} 
                          alt="Original sketch" 
                          className="w-full h-full object-contain rounded-lg flex-1"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 border border-white/15 rounded-md px-1.5 py-0.5 backdrop-blur-md">
                          <span className="text-[7.5px] font-black text-slate-300 uppercase tracking-wider block">Ton croquis</span>
                        </div>
                      </div>

                      {/* Right: AI Magnified */}
                      <div className="rounded-xl overflow-hidden border border-[#FFB020]/30 bg-black/50 p-1 relative flex flex-col justify-between min-h-[120px] shadow-lg">
                        <img 
                          src={generatedArt.url} 
                          alt="AI Art co-creation" 
                          className="w-full h-full object-cover rounded-lg flex-1 filter brightness-[0.8] contrast-[1.05]"
                        />
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-violet-600 to-pink-500 border border-white/15 rounded-md px-1.5 py-0.5 backdrop-blur-md shadow-md">
                          <span className="text-[7.5px] font-black text-white uppercase tracking-wider block">Version IA ✨</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Full Screen AI Art (Mode Text-only) */
                    <div className="rounded-xl overflow-hidden border border-[#FFB020]/30 bg-black/50 p-1 relative flex flex-col justify-between flex-1 mt-1 mb-2 shadow-lg min-h-[120px]">
                      <img 
                        src={generatedArt.url} 
                        alt="AI Art creation" 
                        className="w-full h-full object-cover rounded-lg flex-1 filter brightness-[0.8] contrast-[1.05]"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-violet-600 to-pink-500 border border-white/15 rounded-md px-2.5 py-0.8 backdrop-blur-md shadow-md">
                        <span className="text-[8px] font-black text-white uppercase tracking-wider block">Création Magique ✨</span>
                      </div>
                    </div>
                  )}

                  {/* Dynamic description & Action controls */}
                  <div className="bg-white/3 border border-white/6 rounded-xl p-3 backdrop-blur-md space-y-3">
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">{generatedArt.title}</h4>
                      <p className="text-[8.5px] text-white/40 mt-0.5 leading-relaxed font-sans">
                        {userSketchUrl ? 'Gribouillage magnifié' : 'Idée textuelle matérialisée'} en style {ART_STYLES.find(s => s.id === selectedStyle)?.label}.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Publish memory card */}
                      <button
                        onClick={handlePublishToWall}
                        disabled={isPublished}
                        className={`py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-[8.5px] font-black uppercase tracking-wider cursor-pointer ${
                          isPublished
                            ? 'bg-[#00D26A]/20 border border-[#00D26A] text-[#00D26A] pointer-events-none'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        {isPublished ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{isPublished ? 'Partagé !' : 'Partager'}</span>
                      </button>

                      {/* Order mock physical prints */}
                      <button
                        onClick={() => {
                          setIsOrdered(true);
                          alert(userSketchUrl 
                            ? "Commande Premium Validée ! 🎁\n\nNous allons imprimer un comparatif interactif de ton gribouillage original et du chef-d'œuvre IA sur une double-toile en bois brut (20x30 cm).\n\nLivraison prévue à la maison d'ici 3 jours. Félicitations l'Artiste !"
                            : "Commande Premium Validée ! 🎁\n\nNous allons imprimer ton œuvre d'art IA sur une magnifique toile tendue sur châssis en bois (20x30 cm).\n\nLivraison prévue à la maison d'ici 3 jours. Félicitations l'Artiste !"
                          );
                        }}
                        disabled={isOrdered}
                        className={`py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-[8.5px] font-black uppercase tracking-wider cursor-pointer ${
                          isOrdered
                            ? 'bg-[#FFB020]/20 border border-[#FFB020] text-[#FFB020] pointer-events-none'
                            : 'bg-gradient-to-r from-pink-500 to-[#FF4D6D] border border-transparent text-white hover:brightness-105 shadow-md'
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
                  <div className="w-9 h-9 rounded-full bg-white/3 border border-white/6 flex items-center justify-center mx-auto text-white/30">
                    <Paintbrush className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-black text-white/40 uppercase tracking-widest block font-sans">En attente d'inspiration</span>
                    <p className="text-[8.5px] text-white/20 max-w-[200px] mx-auto leading-normal">
                      Fais un tracé sur le tableau de gauche ou décris une idée magique ci-dessus !
                    </p>
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
