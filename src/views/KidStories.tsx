import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Star, Play, Pause, Sparkles, Wand2, Compass, RotateCcw, Heart } from 'lucide-react';
import type { Member } from '../types';

interface KidStoriesProps {
  member: Member;
  onBack: () => void;
}

interface StoryItem {
  id: string;
  title: string;
  author: string;
  icon: string;
  duration: string;
  category: string;
  intro: string;
  fullText: string;
  isFavorite: boolean;
}

export const KidStories: React.FC<KidStoriesProps> = ({
  member,
  onBack
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bibliotheque' | 'ia'>('bibliotheque');
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);

  // AI Story Generator State
  const [aiHero, setAiHero] = useState('un petit lapin');
  const [aiCompanion, setAiCompanion] = useState('un robot rigolo');
  const [aiPlace, setAiPlace] = useState('sur la Lune');
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Stories database
  const [stories, setStories] = useState<StoryItem[]>([
    {
      id: 'story-1',
      title: 'Le Petit Dragon qui avait froid 🦎🔥',
      author: 'Contes de la Forêt',
      icon: '🦎',
      duration: '5 min',
      category: 'Magie',
      intro: 'Ignis est un dragonneau très mignon, mais il a un secret : son feu ne veut pas s\'allumer !',
      fullText: "Il était une fois, dans la vallée des Volcans Bleus, un petit dragon prénommé Ignis. Contrairement à ses grands frères, Ignis n'arrivait pas à cracher le moindre petit filet de feu. Quand il essayait, seuls des confettis multicolores sortaient de sa bouche ! \n\nUn matin, le vent d'hiver se mit à souffler très fort. Ignis tremblait de froid. Il décida d'aller demander de l'aide à la Fée des Neiges. En chemin, il rencontra un écureuil qui grelottait lui aussi. Pris de pitié, Ignis souffla de toutes ses forces pour essayer de le réchauffer. Et là... POUF ! Une magnifique flamme violette, chaude et douce, jaillit de son nez. Ce n'était pas un feu ordinaire, c'était un feu magique né de la gentillesse ! Depuis ce jour, Ignis réchauffe tous ses amis de la forêt.",
      isFavorite: true
    },
    {
      id: 'story-2',
      title: 'Le Robot perdu dans les Étoiles 🤖✨',
      author: 'Aventures de l\'Espace',
      icon: '🤖',
      duration: '8 min',
      category: 'Espace',
      intro: 'Bip-Bop est un petit robot explorateur. Un jour, sa fusée dévie de sa trajectoire...',
      fullText: "Bip-Bop adorait scanner les météorites de toutes les couleurs. Mais un après-midi, un nuage de poussière cosmique le sépara de son vaisseau. Le voilà tout seul, flottant dans l'espace étoilé. \n\nHeureusement, Bip-Bop avait des batteries très solides et un grand sourire métallique. Il vit passer une comète joyeuse nommée Stella. 'Monte sur ma queue de glace !' cria Stella. Bip-Bop s'accrocha fort. Ils glissèrent ensemble à toute vitesse à travers la Voie Lactée, évitant les trous noirs géants comme dans un jeu vidéo ! Stella raccompagna Bip-Bop juste à temps pour le goûter des robots. Depuis, Bip-Bop regarde le ciel chaque nuit en faisant clignoter ses yeux bleus pour saluer son amie.",
      isFavorite: false
    },
    {
      id: 'story-3',
      title: 'La Super-Marmotte en mission 🐹🦸‍♀️',
      author: 'Récits Rigolos',
      icon: '🐹',
      duration: '4 min',
      category: 'Humour',
      intro: 'Mimi est une marmotte qui préfère porter une cape de super-héros plutôt que de dormir !',
      fullText: "Toutes les marmottes des Alpes savent que l'hiver est fait pour dormir au chaud. Toutes, sauf Mimi ! Mimi a fabriqué une cape rouge avec une vieille feuille d'automne et s'est déclarée : 'Super-Marmotte, protectrice des sommets !'\n\nPendant que sa famille ronflait doucement, Mimi surveillait la montagne. Elle a aidé un jeune chamois coincé dans la neige, puis elle a partagé ses noisettes avec un oiseau égaré. Quand le printemps est revenu, toutes les marmottes se sont réveillées fatiguées d'avoir trop dormi, mais Mimi, elle, avait des étoiles plein les yeux et plein d'histoires extraordinaires à raconter !",
      isFavorite: true
    }
  ]);

  const toggleFavorite = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const handleOpenStory = (story: StoryItem) => {
    setSelectedStory(story);
    setIsPlaying(false);
    setPlayProgress(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const generateAISpookyStory = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedStory(null);

    setTimeout(() => {
      const storySentences = [
        `Il était une fois, ${aiHero} qui vivait paisiblement.`,
        `Un jour extraordinaire, notre héros décida de faire un grand voyage et rencontra ${aiCompanion}.`,
        `Ensemble, ils prirent leur courage à deux mains et partirent explorer un lieu mystérieux : ${aiPlace}.`,
        `Là-bas, ils découvrirent un trésor magique étincelant qui exauça leur vœu le plus cher !`,
        `Depuis ce jour, ${aiHero} et ${aiCompanion} sont devenus les meilleurs amis de l'univers et vivent de fantastiques aventures.`
      ];

      setGeneratedStory(storySentences.join('\n\n'));
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
      
      {/* Background magical glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pt-4 mb-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={selectedStory ? () => setSelectedStory(null) : onBack}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>🌙</span>
              <span>Histoires du Soir</span>
            </h1>
            <p className="text-xs text-white/50 font-bold">Lis de beaux contes ou écoute-les en audio !</p>
          </div>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D] text-xl">
          🧚‍♀️
        </div>
      </div>

      {/* Main Tabs (only shown when no story is open) */}
      {!selectedStory && (
        <div className="bg-white/5 p-1 rounded-2xl border border-white/5 grid grid-cols-2 gap-1 mb-6">
          <button
            onClick={() => setActiveSubTab('bibliotheque')}
            className={`py-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeSubTab === 'bibliotheque' 
                ? 'bg-[#FF4D6D] text-[#07111F] shadow-md shadow-[#FF4D6D]/20' 
                : 'text-white/50 hover:text-white/85'
            }`}
          >
            <span>📚</span>
            <span>Bibliothèque</span>
          </button>
          <button
            onClick={() => setActiveSubTab('ia')}
            className={`py-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeSubTab === 'ia' 
                ? 'bg-[#FF4D6D] text-[#07111F] shadow-md shadow-[#FF4D6D]/20' 
                : 'text-white/50 hover:text-white/85'
            }`}
          >
            <span>🪄</span>
            <span>Créateur IA</span>
          </button>
        </div>
      )}

      {/* STORY DETAIL VIEW */}
      {selectedStory ? (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Card Story header */}
          <div className="bg-gradient-to-br from-[#FF4D6D]/10 to-[#6C5CFF]/10 border border-white/10 rounded-[32px] p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
                {selectedStory.icon}
              </div>
              <span className="text-[10px] font-black uppercase bg-[#FF4D6D]/20 text-[#FF4D6D] px-2.5 py-1 rounded-full">
                {selectedStory.category}
              </span>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">{selectedStory.title}</h2>
              <p className="text-[10px] text-white/45 font-bold">Écrit par : {selectedStory.author} • Durée : {selectedStory.duration}</p>
            </div>
          </div>

          {/* AUDIO PLAYER */}
          <div className="bg-white/5 border border-white/8 rounded-[28px] p-4 flex items-center justify-between space-x-4">
            <button 
              onClick={handleTogglePlay}
              className="w-12 h-12 bg-[#FF4D6D] rounded-[18px] flex items-center justify-center shadow-lg shadow-[#FF4D6D]/20 active:scale-90 transition-transform cursor-pointer shrink-0"
            >
              {isPlaying ? <Pause className="w-5 h-5 text-[#07111F] fill-[#07111F]" /> : <Play className="w-5 h-5 text-[#07111F] fill-[#07111F] ml-0.5" />}
            </button>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[9px] font-black text-white/40">
                <span>LECTURE AUDIO</span>
                <span>{selectedStory.duration}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF4D6D] to-[#6C5CFF] rounded-full transition-all duration-300" 
                  style={{ width: isPlaying ? '40%' : '15%' }}
                />
              </div>
            </div>
          </div>

          {/* STORY TEXT BODY */}
          <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 space-y-4 font-serif text-white/95 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
            {selectedStory.fullText}
          </div>

          <button 
            onClick={() => setSelectedStory(null)}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
          >
            Fermer l'histoire 📖
          </button>
        </div>
      ) : (
        <>
          {/* CONTENT: Bibliothèque */}
          {activeSubTab === 'bibliotheque' && (
            <div className="space-y-6">
              
              {/* Last read section shortcut */}
              <div className="bg-gradient-to-r from-[#FF4D6D]/15 to-[#FF4D6D]/5 border border-[#FF4D6D]/20 rounded-[32px] p-5 flex items-center justify-between shadow-md">
                <div className="space-y-1 flex-1 pr-3">
                  <span className="text-[8px] font-black uppercase text-[#FF4D6D] tracking-widest">Dernière histoire lue :</span>
                  <h3 className="text-sm font-black text-white leading-tight">Le Petit Dragon qui avait froid 🦎</h3>
                  <p className="text-[10px] text-white/50 font-bold">Reprendre la lecture là où tu t'es arrêté</p>
                </div>
                <button 
                  onClick={() => handleOpenStory(stories[0])}
                  className="px-4 py-2.5 bg-[#FF4D6D] text-[#07111F] rounded-xl text-xs font-black shadow-lg cursor-pointer"
                >
                  Continuer 📖
                </button>
              </div>

              {/* Favorites & Grid */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Mes Histoires Préférées :</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stories.map(story => (
                    <div 
                      key={story.id} 
                      onClick={() => handleOpenStory(story)}
                      className="bg-[#112240] border-2 border-white/5 hover:border-[#FF4D6D]/30 rounded-[28px] p-4 flex items-start space-x-3 cursor-pointer shadow-lg hover:bg-[#FF4D6D]/5 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                        {story.icon}
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase bg-white/5 px-2 py-0.5 rounded-full text-white/50">
                            {story.category}
                          </span>
                          <button 
                            onClick={(e) => toggleFavorite(story.id, e)}
                            className="p-1 rounded-lg text-white/30 hover:text-[#FF4D6D] cursor-pointer"
                          >
                            <Heart className={`w-4 h-4 ${story.isFavorite ? 'text-[#FF4D6D] fill-[#FF4D6D]' : ''}`} />
                          </button>
                        </div>
                        <h4 className="text-xs font-black text-white leading-snug">{story.title}</h4>
                        <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">{story.intro}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONTENT: AI Story Generator */}
          {activeSubTab === 'ia' && (
            <div className="space-y-6">
              
              {generatedStory ? (
                <div className="space-y-5 animate-fade-in text-left">
                  <div className="bg-gradient-to-br from-[#FF4D6D]/15 to-[#6C5CFF]/15 border border-[#FF4D6D]/30 rounded-[32px] p-6 space-y-4">
                    <div className="flex items-center space-x-2 text-[#FF4D6D]">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider">Ton Histoire Magique IA</span>
                    </div>
                    <div className="bg-[#07111F]/80 p-5 rounded-[24px] border border-white/5 text-sm font-serif text-white/90 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {generatedStory}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setGeneratedStory(null)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Recommencer</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={generateAISpookyStory} className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-5">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white justify-center">
                    <Wand2 className="w-5 h-5 text-[#FF4D6D]" />
                    <span>Mélangeur d'Histoires Magiques</span>
                  </div>
                  
                  <p className="text-xs text-white/45 text-center leading-relaxed font-bold">
                    Choisis tes 3 ingrédients magiques pour que l'IA écrive ton conte !
                  </p>

                  <div className="space-y-4 font-bold">
                    {/* Hero selection */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">1. Le Héros principal :</label>
                      <select 
                        value={aiHero}
                        onChange={(e) => setAiHero(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      >
                        <option value="un petit lapin farceur 🐰">Un petit lapin farceur 🐰</option>
                        <option value="un jeune astronaute courageux 👨‍🚀">Un jeune astronaute courageux 👨‍🚀</option>
                        <option value="une petite fée rigolote 🧚‍♀️">Une petite fée rigolote 🧚‍♀️</option>
                        <option value="un gentil dragon maladroit 🐉">Un gentil dragon maladroit 🐉</option>
                      </select>
                    </div>

                    {/* Companion selection */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">2. Le Compagnon de route :</label>
                      <select 
                        value={aiCompanion}
                        onChange={(e) => setAiCompanion(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      >
                        <option value="un écureuil volant 🐿️">Un écureuil volant 🐿️</option>
                        <option value="un robot parlant qui fait des blagues 🤖">Un robot qui fait des blagues 🤖</option>
                        <option value="un chat noir aux yeux magiques 🐱">Un chat noir magique 🐱</option>
                        <option value="un ourson géant en guimauve 🧸">Un ourson en guimauve 🧸</option>
                      </select>
                    </div>

                    {/* Place selection */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">3. Le Lieu secret :</label>
                      <select 
                        value={aiPlace}
                        onChange={(e) => setAiPlace(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      >
                        <option value="dans une forêt de bonbons géants 🍭">Une forêt de bonbons géants 🍭</option>
                        <option value="sur la Lune en chocolat 🌙">La Lune en chocolat 🌙</option>
                        <option value="dans un château dans les nuages 🏰">Un château dans les nuages 🏰</option>
                        <option value="au fond d'un océan d'eau pétillante 🐠">Un océan d'eau pétillante 🐠</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full py-3 bg-[#FF4D6D] disabled:bg-white/15 disabled:text-white/30 text-[#07111F] rounded-xl text-xs font-black uppercase tracking-wider active:scale-97 transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-[#FF4D6D]/20"
                  >
                    {isGenerating ? (
                      <span>Formule magique en cours... 🪄</span>
                    ) : (
                      <>
                        <Wand2 className="w-4.5 h-4.5" />
                        <span>Générer mon histoire ! ✨</span>
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          )}
        </>
      )}

    </div>
  );
};
