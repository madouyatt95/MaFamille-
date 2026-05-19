import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  User, 
  Compass, 
  Heart,
  ChevronLeft,
  RotateCcw
} from 'lucide-react';

interface ConteurIAProps {
  onBack: () => void;
  members: any[];
}

interface Universe {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  color: string;
  bgGlow: string;
}

interface Moral {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

const UNIVERSES: Universe[] = [
  { id: 'espace', name: 'L\'Espace Intersidéral', emoji: '🚀', desc: 'Des planètes en sucre et des étoiles filantes chantantes', color: 'text-indigo-400', bgGlow: 'from-indigo-600/30 to-purple-600/30' },
  { id: 'foret', name: 'La Forêt Enchantée', emoji: '🌲', desc: 'Des arbres bavards et des lucioles magiques de toutes les couleurs', color: 'text-emerald-400', bgGlow: 'from-emerald-600/30 to-teal-600/30' },
  { id: 'dinos', name: 'Le Royaume des Dinosaures', emoji: '🦕', desc: 'Des bébés tricératops joueurs et des volcans de chocolat chaud', color: 'text-amber-400', bgGlow: 'from-amber-600/30 to-orange-600/30' },
  { id: 'ocean', name: 'L\'Océan Mystérieux', emoji: '🐙', desc: 'Des dauphins luminescents et des châteaux de sable sous-marins', color: 'text-sky-400', bgGlow: 'from-sky-600/30 to-cyan-600/30' },
  { id: 'bonbons', name: 'Le Monde des Bonbons', emoji: '🍭', desc: 'Des rivières de sirop de fraise et des nuages de barbe à papa', color: 'text-pink-400', bgGlow: 'from-pink-600/30 to-rose-600/30' }
];

const MORALS: Moral[] = [
  { id: 'partage', name: 'Le Partage', emoji: '🤝', desc: 'Apprendre à offrir avec bonheur et recevoir avec gratitude' },
  { id: 'courage', name: 'Le Courage', emoji: '🦁', desc: 'Dépasser ses petites peurs pour accomplir de grandes choses' },
  { id: 'amitie', name: 'L\'Amitié', emoji: '🧸', desc: 'Découvrir la force de s\'entraider et de rire ensemble' },
  { id: 'curiosite', name: 'La Curiosité', emoji: '🔍', desc: 'Explorer le monde pour percer des mystères extraordinaires' },
  { id: 'perseverance', name: 'La Persévérance', emoji: '🎯', desc: 'Essayer encore avec le sourire jusqu\'à réussir son rêve' }
];

// Generative Bedtime Story Engine Database
const generateStory = (hero: string, universeId: string, moralId: string) => {
  const universe = UNIVERSES.find(u => u.id === universeId) || UNIVERSES[0];
  
  let title = '';
  let pages: string[] = [];
  
  // 1. Space Story
  if (universeId === 'espace') {
    title = `L'Incroyable Voyage Stellaire de ${hero} et l'Étoile Perdue`;
    
    pages[0] = `Il était une fois, dans un petit village bordé de collines, un(e) jeune aventurier(e) nommé(e) ${hero}. Ce soir-là, en regardant par la fenêtre de sa chambre, ${hero} vit une petite lumière violette s'agiter dans le ciel. En un instant, une navette spatiale miniature en verre givré se posa doucement sur son lit. Poussé(e) par une douce curiosité, ${hero} monta à bord. La navette décolla silencieusement vers l'Espace Intersidéral, frôlant des constellations de bonbons et naviguant à travers des nuages cosmiques étincelants.`;
    
    if (moralId === 'partage') {
      pages[1] = `Arrivé(e) près de Saturne, ${hero} rencontra Piko, un petit extraterrestre tout bleu qui pleurait des larmes d'étoiles filantes. Piko n'avait plus de poussière magique pour allumer sa planète. ${hero} fouilla dans ses poches et trouva un paquet de sablés dorés faits avec amour. Sans hésiter, il/elle décida de partager son trésor sucré. Magiquement, les miettes des biscuits brillèrent si fort qu'elles se transformèrent en une pluie d'étoiles dorées multicolores. Piko rit aux éclats et sa planète s'illumina d'une douce lumière turquoise.`;
    } else if (moralId === 'courage') {
      pages[1] = `Soudain, une grosse tempête de comètes de réglisse grisa le ciel. La navette commença à tanguer et Piko, le petit robot pilote, tremblait de tous ses boulons. ${hero} sentit son cœur battre fort, mais il/elle prit une grande inspiration. Il/Elle ferma les yeux, prit fermement les commandes et chanta une douce berceuse apprise à la maison. Sa voix calma les vents stellaires et la tempête de réglisse s'évapora en confettis d'argent. ${hero} venait de prouver que la bravoure est une lumière qui brise toutes les ombres.`;
    } else {
      pages[1] = `Sur une comète de cristal, ${hero} fit la connaissance de Nova, un petit chien de l'espace aux oreilles scintillantes. Nova s'était égaré en cherchant la Grande Ourse. Ensemble, main dans la patte, ils décidèrent de s'entraider. Nova éclairait le chemin avec son collier lumineux et ${hero} dessinait une carte stellaire sur la vitre de la navette. Grâce à cette belle complicité, ils retrouvèrent le chemin de la Grande Ourse, qui les accueillit avec un grand câlin de poussière d'étoile chaleureux.`;
    }
    
    pages[2] = `Le voyage touchait à sa fin. Nova et Piko offrirent à ${hero} une petite fiole d'étoile filante lumineuse pour décorer sa chambre. De retour sur Terre, confortablement blotti(e) sous sa couette, ${hero} ferma les yeux avec un grand sourire. Il/elle comprit que le plus grand des pouvoirs n'était pas de voler dans l'espace, mais d'avoir un cœur rempli de bonté et de lumière. L'univers entier veillait désormais sur ses rêves les plus doux. Bonsoir ${hero}, dors bien.`;
  }
  // 2. Enchanted Forest
  else if (universeId === 'foret') {
    title = `${hero} et le Secret de la Forêt Enchantée`;
    
    pages[0] = `Dans la douce pénombre du soir, ${hero} découvrit une petite porte en écorce d'arbre secrète au fond du jardin. En la franchissant, il/elle pénétra dans la majestueuse Forêt Enchantée. Sous ses pieds, la mousse de velours brillait d'une lueur vert émeraude et les arbres chuchotaient de joyeux secrets. Les lucioles s'organisaient en petits cœurs lumineux pour éclairer ses pas. C'était un monde mystérieux où la magie prenait vie à chaque instant.`;
    
    if (moralId === 'partage') {
      pages[1] = `Au détour d'un ruisseau argenté, ${hero} aperçut un petit lutin nommé Pipin qui tentait de construire un abri pour la nuit, mais il grelottait de froid. ${hero} portait une écharpe douce et chaude tricotée par sa famille. Avec bienveillance, il/elle l'enleva et la partagea avec Pipin en la drapant sur ses épaules. Touché par ce geste, le lutin sourit chaleureusement. L'écharpe magique grandit instantanément pour former une magnifique tente douillette en laine lumineuse capable de les abriter tous les deux.`;
    } else if (moralId === 'courage') {
      pages[1] = `Soudain, un grand bruit sourd retentit : c'était l'Ombre Grognon, un immense nuage gris qui adorait éteindre la lumière des fleurs. Les lucioles prirent peur et s'éteignirent. ${hero} eut un instant d'hésitation, puis s'avança courageusement face au géant gris. Il/Elle tendit les mains en avant et prononça des mots doux d'amitié et de joie. Devant tant de bravoure et de gentillesse, l'Ombre commença à fondre et se transforma en une douce brume parfumée à la menthe et à la lavande.`;
    } else {
      pages[1] = `Au milieu de la clairière, ${hero} fit la rencontre de Willow, un faon timide aux sabots de nacre qui n'arrivait pas à sauter par-dessus le ruisseau pour rejoindre ses amis. ${hero} s'approcha doucement, lui caressa la tête et lui murmura des paroles rassurantes. Ensemble, en unissant leurs forces, ${hero} montra le chemin en sautant en premier sur une pierre plate, et Willow le suivit d'un bond gracieux. Libéré, le petit faon sautille de joie autour de son nouvel ami.`;
    }
    
    pages[2] = `Pour remercier ${hero}, le grand chêne de la forêt lui offrit une feuille dorée magique qui ne fane jamais. En repassant la porte secrète pour revenir dans sa chambre, ${hero} glissa la feuille sous son oreiller. Une douce chaleur se répandit dans tout son lit, lui rappelant que la gentillesse est la plus belle des magies. Ses paupières se firent lourdes de jolis rêves de nature. Dors bien, ${hero}, la forêt veille sur toi.`;
  }
  // 3. Dinosaur Kingdom
  else if (universeId === 'dinos') {
    title = `L'Aventure Sucrée de ${hero} au Pays des Dinos`;
    
    pages[0] = `Ce soir-là, en ouvrant son livre d'images préféré, ${hero} fut enveloppé(e) d'une douce brume parfumée au cacao. En ouvrant les yeux, il/elle se retrouva au sommet d'une colline de guimauve, au cœur du Royaume des Dinosaures. Au loin, un immense volcan crachait de douces vagues de chocolat chaud tiède. C'était un monde préhistorique magique où les dinosaures avaient la taille de gentils chiots et adoraient jouer à cache-cache.`;
    
    if (moralId === 'partage') {
      pages[1] = `Un adorable bébé Diplodocus nommé Choco s'approcha de ${hero}. Il était triste car il n'atteignait pas les feuilles de bonbons accrochées en haut de l'arbre. ${hero} monta alors sur une colline de caramel et cueillit délicatement les plus jolies feuilles sucrées pour les partager avec Choco. Enchanté par ce festin partagé, le petit dinosaure battit joyeusement de la queue. En guise de remerciement, il fit glisser ${hero} le long de son grand cou doux comme sur un toboggan magique !`;
    } else if (moralId === 'courage') {
      pages[1] = `Soudain, un grand Tyrannosaure miniature se dressa devant eux. Il rugissait fort pour impressionner la galerie, mais ${hero} remarqua qu'il tenait sa patte en l'air avec une grosse épine de sucre plantée dedans. Surmontant sa peur, ${hero} s'approcha doucement en murmurant des mots doux. Avec précaution et précision, il/elle retira l'épine. Soulagé, le T-Rex se mit à ronronner comme un gros chaton et offrit à ${hero} un gros câlin préhistorique tout doux.`;
    } else {
      pages[1] = `Choco et ${hero} voulaient traverser la rivière de lait concentré pour rejoindre la vallée des jeux, mais le courant était trop fort. C'est alors qu'un ptérodactyle en pain d'épices vint à leur rencontre. Ensemble, en combinant la force du dinosaure et les idées de ${hero}, ils construisirent un pont solide avec de grandes gaufres trouvées sur la rive. En travaillant en équipe, ils purent traverser en toute sécurité sous un ciel de confettis.`;
    }
    
    pages[2] = `La lune de vanille commença à briller dans le ciel ensoleillé de cacao. Choco raccompagna ${hero} jusqu'à son lit de nuages moelleux. De retour chez lui/elle, encore émerveillé(e), ${hero} s'endormit avec un léger parfum de chocolat sur la peau, sachant que la bienveillance transforme même les géants en amis. Fais de doux rêves, petit(e) aventurier(e) des dinos.`;
  }
  // 4. Mysterious Ocean
  else if (universeId === 'ocean') {
    title = `${hero} et la Cité de Corail Lumineux`;
    
    pages[0] = `En glissant un coquillage magique contre son oreille, ${hero} entendit une douce mélodie marine. Une bulle d'air protectrice et dorée l'enveloppa délicatement et l'emmena flotter sous les vagues de l'Océan Mystérieux. Autour de lui/elle, des dauphins luminescents dansaient en formant des arabesques d'eau et de lumière. Au fond de l'eau brillait une splendide cité de corail aux mille éclats bleus et mauves.`;
    
    if (moralId === 'partage') {
      pages[1] = `Dans les allées de la cité sous-marine, ${hero} rencontra Marina, une petite sirène couronnée d'algues nacrées. Marina avait perdu ses perles de lumière pour éclairer les bébés tortues qui allaient naître. ${hero} sortit alors de sa bulle son petit trésor de coquillages polis brillants qu'il/elle avait collectés sur la plage. Il/Elle les partagea tous avec Marina. Posés sur le corail, les coquillages de ${hero} se mirent à briller d'une lueur dorée féerique, guidant parfaitement les bébés tortues vers la mer ouverte.`;
    } else if (moralId === 'courage') {
      pages[1] = `Soudain, un grand poulpe timide nommé Octo bloqua l'entrée de la grotte aux merveilles car il avait peur du noir des abysses. ${hero} s'approcha doucement d'Octo malgré l'obscurité impressionnante de l'eau. Il/Elle alluma une veilleuse magique de poche et la tendit au poulpe avec un grand sourire rassurant. Octo, rassuré par le courage de son ami(e), changea de couleur pour devenir rose scintillant et ouvrit grand les bras pour laisser place à la lumière.`;
    } else {
      pages[1] = `Marina et ${hero} cherchaient le trésor perdu du Roi Triton, enfoui sous un banc de sable mouvant. C'est en s'associant avec un crabe musicien rigolo qu'ils trouvèrent la solution. Le crabe tapotait le sable en rythme pour détecter le coffre, et ${hero} creusait doucement à l'aide d'une coquille Saint-Jacques géante. En équipe, ils sortirent de l'eau une magnifique harpe dorée magique qui se mit à jouer une douce berceuse.`;
    }
    
    pages[2] = `Porté(e) par la douce mélodie de la harpe d'or, la bulle de ${hero} remonta tranquillement à la surface pour le/la déposer dans sa chambre. En ouvrant les yeux au chaud sous sa couette, ${hero} se sentit bercé(e) par le va-et-vient des vagues. Il/elle s'endormit paisiblement, l'esprit rempli de coquillages scintillants et de poissons magiques. Bonsoir, ${hero}, fais de doux rêves marins.`;
  }
  // 5. Candy World
  else {
    title = `${hero} au Pays des Nuages en Barbe à Papa`;
    
    pages[0] = `Un soir, un chemin de petits bonbons acidulés se dessina sur le sol de la chambre de ${hero}. En le suivant pas à pas, il/elle s'envola vers le Monde des Bonbons ! Le sol y était moelleux comme de la brioche, des rivières de sirop de fraise coulaient paisiblement entre des collines de chocolat blanc, et de grands arbres en sucette abritaient des oiseaux en sucre filé qui chantaient doucement.`;
    
    if (moralId === 'partage') {
      pages[1] = `Au bord de la rivière de fraise, ${hero} fit la connaissance de Gribouille, un petit ours en guimauve tout triste car son biscuit en gaufrette s'était brisé. ${hero} sortit de son sac une magnifique tablette de chocolat multicolore qu'il/elle avait reçue. Avec joie, il/elle la cassa en deux et partagea la plus grande moitié avec Gribouille. Instantanément, la guimauve de l'ours s'illumina de paillettes arc-en-ciel et un parfum délicieux de vanille envahit toute la clairière sucrée.`;
    } else if (moralId === 'courage') {
      pages[1] = `Soudain, le pont en sucre d'orge qui permettait de traverser la falaise de chocolat commença à fondre sous les rayons d'une lune de miel trop chaude. Gribouille était paralysé de panique à l'idée de traverser. ${hero} prit alors le petit ours par la patte molle, lui parla doucement pour le rassurer, et s'avança en premier d'un pas assuré sur le pont. Grâce à son sang-froid et sa bienveillance, ils traversèrent juste à temps avant que le pont ne se transforme en un toboggan de caramel amusant !`;
    } else {
      pages[1] = `Gribouille et ${hero} voulaient cueillir les cerises confites géantes situées au sommet de la plus haute colline de meringue. Mais la meringue était glissante comme de la glace ! En unissant leurs efforts, l'ours en guimauve fit la courte échelle à ${hero} tandis que ${hero} s'accrochait à une branche de réglisse solide pour se hisser. En travaillant main dans la main, ils récoltèrent un plein panier de cerises confites brillantes en riant de bon cœur.`;
    }
    
    pages[2] = `Le soleil de caramel coulant se coucha doucement, laissant place à une nuit de sucre glace. Fatigué(e) mais le cœur comblé, ${hero} se laissa glisser sur un nuage de barbe à papa rose qui le/la ramena tout en douceur dans son lit douillet. En fermant les yeux, ${hero} garda en mémoire le goût sucré de cette aventure et la certitude que le partage rend le monde infiniment plus doux. Dors bien, ${hero}, fais de délicieux rêves sucrés.`;
  }

  return { title, pages, bgGlow: universe.bgGlow, emoji: universe.emoji };
};

export const ConteurIA: React.FC<ConteurIAProps> = ({ onBack, members }) => {
  // Config state
  const [selectedHero, setSelectedHero] = useState<string>('');
  const [selectedUniverse, setSelectedUniverse] = useState<string>('espace');
  const [selectedMoral, setSelectedMoral] = useState<string>('partage');
  
  // Generation & playback state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genStep, setGenStep] = useState<number>(0);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isReadingAloud, setIsReadingAloud] = useState<boolean>(false);

  // Set default hero based on family members
  useEffect(() => {
    if (members && members.length > 0) {
      // Prioritize child members if available (Amadou or Awa)
      const kids = members.filter(m => m.id === '3' || m.id === '4');
      if (kids.length > 0) {
        setSelectedHero(kids[0].name);
      } else {
        setSelectedHero(members[0].name);
      }
    } else {
      setSelectedHero('Amadou');
    }
  }, [members]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleStartGeneration = () => {
    if (!selectedHero.trim()) return;
    setIsGenerating(true);
    setGenStep(1);
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);

    // Dynamic generation simulation step-by-step for magical immersion
    setTimeout(() => {
      setGenStep(2);
      setTimeout(() => {
        setGenStep(3);
        setTimeout(() => {
          const story = generateStory(selectedHero.trim(), selectedUniverse, selectedMoral);
          setActiveStory(story);
          setCurrentPageIndex(0);
          setIsGenerating(false);
          setGenStep(0);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const handleNextPage = () => {
    if (!activeStory) return;
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);
    if (currentPageIndex < activeStory.pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  // Ultra-premium audio-reading aloud feature (Text-To-Speech)
  const handleToggleReadAloud = () => {
    if (!activeStory) return;

    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
      return;
    }

    const textToRead = activeStory.pages[currentPageIndex];
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9; // Soft, slow storytelling voice speed

    // Attempt to pick a soft voice if available in the browser
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(v => v.lang.startsWith('fr') && v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('soft'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.onend = () => {
      setIsReadingAloud(false);
    };

    utterance.onerror = () => {
      setIsReadingAloud(false);
    };

    setIsReadingAloud(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);
    setActiveStory(null);
    setCurrentPageIndex(0);
  };

  return (
    <div className="relative glass-panel border border-white/10 rounded-[36px] p-6 md:p-8 overflow-hidden min-h-[600px] w-full flex flex-col justify-between transition-all animate-fade-in shadow-[0_20px_50px_rgba(255,176,32,0.15)] bg-slate-950/40">
      
      {/* Dynamic ambient glowing spheres based on universe */}
      <div className={`absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr filter blur-[100px] opacity-35 transition-all duration-1000 ${
        activeStory ? activeStory.bgGlow : 
        selectedUniverse === 'espace' ? 'from-indigo-600 to-purple-600' :
        selectedUniverse === 'foret' ? 'from-emerald-600 to-teal-600' :
        selectedUniverse === 'dinos' ? 'from-amber-600 to-orange-600' :
        selectedUniverse === 'ocean' ? 'from-sky-600 to-cyan-600' :
        'from-pink-600 to-rose-600'
      }`}></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between w-full pb-4 border-b border-white/8">
        <button 
          onClick={activeStory ? handleReset : onBack}
          className="flex items-center space-x-2 text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{activeStory ? 'Créer un autre conte' : 'Retour'}</span>
        </button>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-[#FFB020] animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-[#FFB020]">Conteur Magique IA</span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 my-auto py-6 flex flex-col items-center justify-center w-full min-h-[420px]">
        
        {/* STATE 1: SELECTION/CREATION SCREEN */}
        {!isGenerating && !activeStory && (
          <div className="w-full max-w-xl space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight">Générez une Histoire pour le Soir</h2>
              <p className="text-xs text-white/50">Choisissez les ingrédients secrets et laissez la magie de l'IA opérer...</p>
            </div>

            <div className="space-y-4 bg-white/5 border border-white/10 rounded-[28px] p-5 md:p-6 backdrop-blur-md">
              
              {/* Ingredient 1: The Hero */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFB020] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Le Héros de l'Aventure
                </label>
                <div className="flex gap-2">
                  <select 
                    value={selectedHero}
                    onChange={(e) => setSelectedHero(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.name} className="bg-slate-900 text-white">
                        {m.name} ({m.role})
                      </option>
                    ))}
                    <option value="custom" className="bg-slate-900 text-white">Nom personnalisé...</option>
                  </select>
                  
                  {selectedHero === 'custom' || !members.some(m => m.name === selectedHero) ? (
                    <input 
                      type="text"
                      placeholder="Prénom de l'enfant..."
                      value={selectedHero === 'custom' ? '' : selectedHero}
                      onChange={(e) => setSelectedHero(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  ) : null}
                </div>
              </div>

              {/* Ingredient 2: The Universe */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFB020] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> L'Univers Merveilleux
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {UNIVERSES.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUniverse(u.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-[84px] ${
                        selectedUniverse === u.id 
                          ? 'bg-[#FFB020]/15 border-[#FFB020] shadow-[0_0_15px_rgba(255,176,32,0.15)]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/8'
                      }`}
                    >
                      <span className="text-xl">{u.emoji}</span>
                      <div>
                        <p className="text-[11px] font-bold text-white leading-tight">{u.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-white/40 italic">
                  {UNIVERSES.find(u => u.id === selectedUniverse)?.desc}
                </p>
              </div>

              {/* Ingredient 3: The Moral/Value */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFB020] flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" /> La Douce Leçon (Morale)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MORALS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMoral(m.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        selectedMoral === m.id 
                          ? 'bg-[#FFB020]/15 border-[#FFB020] shadow-[0_0_10px_rgba(255,176,32,0.1)]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/8'
                      }`}
                    >
                      <span className="text-base">{m.emoji}</span>
                      <span className="text-[9px] font-bold text-white leading-none">{m.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-white/40 italic text-center">
                  « {MORALS.find(m => m.id === selectedMoral)?.desc} »
                </p>
              </div>

            </div>

            {/* Glowing CTA Button */}
            <button
              onClick={handleStartGeneration}
              disabled={!selectedHero.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-black font-extrabold text-xs uppercase tracking-widest hover:opacity-95 hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-[#FFB020]/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>Générer l'histoire magique</span>
            </button>
          </div>
        )}

        {/* STATE 2: MAGICAL GENERATION SCREEN (IMMERSIVE LOADING STATE) */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center space-y-6 text-center animate-fade-in max-w-sm">
            {/* Spinning core */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#FFB020]/40 animate-spin-slow"></div>
              <div className="absolute inset-2 rounded-full border-2 border-[#FF4D6D]/40 animate-spin-reverse"></div>
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#FFB020] to-[#FF4D6D] rounded-full opacity-25 filter blur-[20px] animate-pulse"></div>
              <BookOpen className="w-10 h-10 text-white relative z-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFB020] animate-pulse">
                {genStep === 1 ? 'Mélange des ingrédients...' :
                 genStep === 2 ? 'Écriture du conte magique...' :
                 'Saupoudrage d\'étoiles filantes...'}
              </span>
              <h3 className="text-base font-extrabold text-white">Chuuut... L'IA écrit l'histoire</h3>
              <p className="text-[11px] text-white/50">
                {genStep === 1 && `Nous préparons l'aventure de ${selectedHero} dans ${UNIVERSES.find(u => u.id === selectedUniverse)?.name}...`}
                {genStep === 2 && `Création d'une leçon sur ${MORALS.find(m => m.id === selectedMoral)?.name.toLowerCase()}...`}
                {genStep === 3 && `Finitions poétiques pour de beaux rêves doux...`}
              </p>
            </div>

            {/* Glowing progress line */}
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/10">
              <div 
                className="bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] h-full transition-all duration-[1200ms] rounded-full"
                style={{ width: `${genStep === 1 ? '33%' : genStep === 2 ? '66%' : '100%'}` }}
              ></div>
            </div>
          </div>
        )}

        {/* STATE 3: IMMERSIVE BOOK READING INTERFACE (SCEPTICISM DEFLATOR!) */}
        {!isGenerating && activeStory && (
          <div className="w-full max-w-4xl space-y-6 animate-scale-up">
            
            {/* The Book Box */}
            <div className="relative glass-panel border border-white/15 rounded-[36px] bg-slate-900/60 shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden p-6 md:p-8 flex flex-col md:grid md:grid-cols-2 gap-6 min-h-[400px]">
              
              {/* Left Page: Abstract dynamic visual representation of the universe */}
              <div className="relative rounded-[24px] overflow-hidden flex flex-col items-center justify-center p-6 text-center border border-white/8 bg-slate-950/50 shadow-inner group min-h-[220px] md:min-h-full">
                
                {/* Flowing animated backgrounds based on universe */}
                <div className={`absolute inset-0 bg-gradient-to-br ${activeStory.bgGlow} opacity-30 filter blur-[40px] animate-pulse`}></div>
                
                {/* Visual orbits or glowing particles */}
                <div className="absolute inset-4 rounded-[20px] border border-white/5 flex items-center justify-center">
                  <div className="absolute w-40 h-40 rounded-full border border-white/10 animate-spin-slow opacity-25"></div>
                  <div className="absolute w-52 h-52 rounded-full border border-dashed border-[#FFB020]/20 animate-spin-reverse opacity-30"></div>
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Glowing Floating Emoji Sphere */}
                  <div className="relative w-24 h-24 mx-auto bg-gradient-to-tr from-white/10 to-white/5 rounded-full border border-white/15 shadow-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <span className="text-5xl filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)] animate-pulse">{activeStory.emoji}</span>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#FFB020] text-black text-xs font-black flex items-center justify-center shadow-lg border border-slate-900">
                      {currentPageIndex + 1}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#FFB020]">{UNIVERSES.find(u => u.id === selectedUniverse)?.name}</span>
                    <h4 className="text-sm font-extrabold text-white max-w-xs mx-auto leading-snug">
                      {activeStory.title}
                    </h4>
                  </div>

                  <p className="text-[10px] text-white/40 italic max-w-xs leading-normal">
                    Morale du soir : {MORALS.find(m => m.id === selectedMoral)?.name} ({MORALS.find(m => m.id === selectedMoral)?.emoji})
                  </p>
                </div>
              </div>

              {/* Right Page: The story text page */}
              <div className="relative flex flex-col justify-between p-2 md:p-4 min-h-[300px] md:min-h-full">
                
                {/* Page content with high-fidelity typography */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/6">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/30 font-sans">
                      {currentPageIndex === 0 ? 'Chapitre I : L\'Entrée' :
                       currentPageIndex === 1 ? 'Chapitre II : L\'Événement' :
                       'Chapitre III : Le Sommeil'}
                    </span>
                    
                    {/* Read aloud toggle button */}
                    <button
                      onClick={handleToggleReadAloud}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                        isReadingAloud 
                          ? 'bg-[#FF4D6D]/15 border-[#FF4D6D] text-[#FF4D6D] animate-pulse shadow-[0_0_10px_rgba(255,77,109,0.1)]' 
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/8'
                      }`}
                    >
                      {isReadingAloud ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Arrêter l'audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Raconter l'histoire</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Story Text (Serif font for rich book feel) */}
                  <p className="text-sm md:text-base leading-relaxed text-white/90 font-serif font-medium tracking-normal text-justify select-none indent-6 animate-fade-in py-2">
                    {activeStory.pages[currentPageIndex]}
                  </p>
                </div>

                {/* Footer page control bar */}
                <div className="flex items-center justify-between pt-4 border-t border-white/6 font-sans">
                  <span className="text-[10px] font-bold text-white/30">
                    Page {currentPageIndex + 1} sur {activeStory.pages.length}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPageIndex === 0}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    
                    {currentPageIndex < activeStory.pages.length - 1 ? (
                      <button
                        onClick={handleNextPage}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-black font-extrabold text-[10px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#FFB020]/10 animate-pulse-subtle"
                      >
                        <span>Page Suivante</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer active:scale-95 transition-all border border-white/10"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Recommencer</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* Footer warning hint */}
      <div className="relative z-10 pt-4 border-t border-white/6 flex items-center justify-between text-[9px] text-white/30">
        <span>© MaFamille+ Conteur IA Merveilleux</span>
        <span>Recommandé pour les 3 à 10 ans 🧸</span>
      </div>

    </div>
  );
};
