import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Eye, Pencil, Play, RotateCcw, SkipForward, Timer, Trash2, Trophy, X } from 'lucide-react';

type MimePack = 'enfants' | 'famille' | 'ados' | 'vacances' | 'fetes' | 'cinema';

const MIME_PACKS: Record<MimePack, string[]> = {
  enfants: [
    'Un chat qui se réveille', 'Souffler des bougies', 'Se brosser les dents',
    'Un bébé qui apprend à marcher', 'Un pingouin pressé', 'Sauter dans une flaque',
    'Un dinosaure qui éternue', 'Ouvrir un cadeau surprenant', 'Un chien qui cherche son os',
    'Un lapin qui mange une carotte', 'Un enfant qui apprend à faire du vélo', 'Une grenouille qui saute',
    'Un escargot très lent', 'Un dragon qui crache du feu', 'Un ours qui hiberne',
    'Un éléphant qui se douche', 'Un poisson hors de l’eau', 'Un singe qui mange une banane',
    'Faire une cabane avec des coussins', 'Construire une tour de cubes', 'Jouer à cache-cache',
    'Un magicien qui sort un foulard', 'Un cheval qui galope', 'Une poule qui pond un œuf',
    'Mettre ses chaussures à l’envers', 'Faire voler un cerf-volant', 'Un pompier qui déroule un tuyau',
    'Un pirate qui cherche un trésor', 'Un roi qui perd sa couronne', 'Un clown qui jongle'
  ],
  famille: [
    'Marcher sur la Lune', 'Faire du ski', 'Un robot en panne', 'Rater son bus',
    'Nager sous l’eau', 'Faire une photo de famille', 'Porter une valise très lourde',
    'Danser sous la pluie', 'Chercher ses clés', 'Préparer une pizza',
    'Un super-héros qui décolle', 'Jouer au tennis', 'Faire les courses avec un caddie fou',
    'Changer une ampoule trop haute', 'Monter un meuble sans notice', 'Chercher la télécommande',
    'Faire semblant de dormir', 'Réparer un vélo', 'Faire un barbecue', 'Arroser des plantes',
    'Ouvrir un pot de confiture impossible', 'Porter un bébé qui pleure', 'Faire un gâteau',
    'Prendre le train en retard', 'Faire la vaisselle en musique', 'Passer l’aspirateur',
    'Un chef cuisinier pressé', 'Un arbitre qui siffle', 'Un chanteur sur scène',
    'Une personne coincée dans un ascenseur', 'Faire du yoga', 'Pêcher un très gros poisson',
    'Marcher sur du sable brûlant', 'Faire une surprise à quelqu’un', 'Déballer un colis',
    'Jouer au bowling', 'Peindre un mur', 'Faire du jardinage', 'Prendre une douche froide',
    'Essayer un vêtement trop petit', 'Un bébé qui refuse de manger', 'Un parent qui marche sur un jouet'
  ],
  ados: [
    'Faire semblant de perdre le réseau', 'Prendre un selfie parfait', 'Arriver en retard en cours',
    'Danser dans un concert', 'Jouer à un jeu vidéo', 'Écrire un message très gênant',
    'Regarder une série en cachette', 'Essayer une nouvelle coiffure', 'Chercher son chargeur',
    'Faire une chorégraphie TikTok', 'Réviser au dernier moment', 'Faire semblant d’écouter en visio',
    'Déballer un nouveau téléphone', 'Mettre des écouteurs emmêlés', 'Réagir à un spoiler',
    'Essayer de prendre une photo discrète', 'Faire la queue pour un concert', 'Rater son bus scolaire',
    'Jouer une finale de jeu vidéo', 'Se préparer pour une sortie', 'Recevoir une mauvaise note',
    'Faire un exposé sans stress', 'Chercher une tenue parfaite', 'Envoyer un vocal trop long',
    'Faire semblant de ne pas voir un message', 'Regarder un match très tendu', 'Faire du skate',
    'Apprendre une danse compliquée', 'Avoir trop chaud avec un sweat', 'Trouver un mot de passe oublié',
    'Essayer un filtre ridicule', 'Faire une photo de groupe', 'Manger des nouilles très chaudes'
  ],
  vacances: [
    'Monter une tente', 'Mettre de la crème solaire', 'Chercher sa valise',
    'Nager avec un masque', 'Prendre l’avion', 'Faire une bataille d’eau',
    'Lire une carte à l’envers', 'Dormir dans un hamac', 'Faire une randonnée trop longue',
    'Porter une glacière lourde', 'Monter dans un manège', 'Faire du pédalo',
    'Se battre avec un parasol', 'Chercher une place à la plage', 'Faire un château de sable',
    'Manger une glace qui fond', 'Prendre une photo devant un monument', 'Faire une plongée',
    'Rater une vague en surf', 'Installer une caravane', 'Faire un feu de camp',
    'Lire au bord de la piscine', 'Avoir peur dans l’avion', 'Courir après un chapeau envolé',
    'Faire une sieste au soleil', 'Pêcher au bord d’un lac', 'Faire du snorkeling',
    'Préparer un pique-nique', 'Porter des tongs qui collent', 'Faire du vélo en montagne',
    'Chercher son hôtel', 'Déplier une serviette de plage', 'Faire du canoë'
  ],
  fetes: [
    'Décorer un sapin', 'Souffler des bougies', 'Emballer un cadeau',
    'Lancer des confettis', 'Danser à un mariage', 'Chercher les œufs de Pâques',
    'Faire un bonhomme de neige', 'Porter un gâteau très fragile', 'Ouvrir une bouteille de champagne',
    'Accrocher une guirlande', 'Recevoir un cadeau étrange', 'Faire un discours au micro',
    'Danser avec sa grand-mère', 'Organiser une chasse au trésor', 'Mettre une couronne des rois',
    'Casser une piñata', 'Préparer une surprise', 'Lancer le bouquet à un mariage',
    'Se déguiser pour Halloween', 'Faire peur derrière une porte', 'Allumer des bougies',
    'Faire un compte à rebours', 'Prendre une photo de groupe', 'Porter un costume trop grand',
    'Chercher une place à table', 'Couper une bûche de Noël', 'Distribuer des bonbons',
    'Faire tourner une galette', 'Décorer des œufs', 'Installer des ballons',
    'Oublier les paroles d’une chanson', 'Déballer un cadeau minuscule', 'Faire un toast'
  ],
  cinema: [
    'Un détective qui enquête', 'Un pirate sur son bateau', 'Un monstre timide',
    'Un astronaute en apesanteur', 'Un magicien qui rate son tour', 'Un espion discret',
    'Un cow-boy à cheval', 'Un réalisateur qui donne des ordres', 'Un super-vilain qui rit',
    'Un héros au ralenti', 'Un fantôme qui traverse un mur', 'Une poursuite en voiture',
    'Un chevalier avec une épée trop lourde', 'Un scientifique fou', 'Un zombie fatigué',
    'Un cascadeur qui saute', 'Un acteur qui oublie son texte', 'Un vampire qui évite le soleil',
    'Un policier qui arrête la circulation', 'Un pilote de vaisseau spatial', 'Une momie qui marche',
    'Un chanteur de comédie musicale', 'Un explorateur dans la jungle', 'Un samouraï concentré',
    'Un gardien de musée la nuit', 'Un robot qui découvre les émotions', 'Un dinosaure dans la ville',
    'Un roi qui fait un discours', 'Un détective avec une loupe', 'Un chef d’orchestre dramatique',
    'Un ninja silencieux', 'Un marin dans la tempête', 'Un extraterrestre qui apprend à saluer'
  ]
};

interface MimeChallengeGameProps {
  teamNames: [string, string];
  isPremium: boolean;
  onTriggerPaywall?: () => void;
  onFinished: (scores: [number, number], rounds: number, winnerName: string) => void;
}

const FREE_MIME_CARDS = MIME_PACKS.famille.slice(0, 20);

const shuffleMimeCards = (source: string[], previousCard?: string): string[] => {
  const shuffled = [...source];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  if (previousCard && shuffled.length > 1 && shuffled[0] === previousCard) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
};

export function MimeChallengeGame({ teamNames, isPremium, onTriggerPaywall, onFinished }: MimeChallengeGameProps) {
  const [pack, setPack] = useState<MimePack>('famille');
  const [duration, setDuration] = useState<30 | 60 | 90>(60);
  const [totalRounds, setTotalRounds] = useState<2 | 4 | 6>(4);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [roundScore, setRoundScore] = useState(0);
  const [passes, setPasses] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [turnCompleted, setTurnCompleted] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardDeck, setCardDeck] = useState<string[]>([]);
  const [customCard, setCustomCard] = useState('');
  const [showCustomCards, setShowCustomCards] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [customCards, setCustomCards] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mf_mime_custom_cards') || '[]');
    } catch {
      return [];
    }
  });
  const completedRef = useRef(false);
  const celebratedRef = useRef(false);
  const cards = useMemo(
    () => isPremium ? [...MIME_PACKS[pack], ...customCards] : FREE_MIME_CARDS,
    [customCards, isPremium, pack]
  );
  const activeCards = cardDeck.length > 0 ? cardDeck : cards;
  const activeTeam = round % 2 as 0 | 1;

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  const finishTurn = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const nextScores: [number, number] = [...scores];
    nextScores[activeTeam] += roundScore;
    setScores(nextScores);
    setRunning(false);
    setTurnCompleted(true);
    if (round + 1 >= totalRounds) {
      const winnerName = nextScores[0] === nextScores[1] ? 'Égalité' : teamNames[nextScores[0] > nextScores[1] ? 0 : 1];
      setFinished(true);
      onFinished(nextScores, totalRounds, winnerName);
    }
  }, [activeTeam, onFinished, round, roundScore, scores, teamNames, totalRounds]);

  useEffect(() => {
    if (running && seconds === 0) queueMicrotask(finishTurn);
  }, [finishTurn, running, seconds]);

  useEffect(() => {
    if (!finished) {
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    navigator.vibrate?.([90, 45, 120, 45, 180]);
  }, [finished]);

  const nextCard = (found: boolean) => {
    if (found) setRoundScore(value => value + 1);
    else setPasses(value => value + 1);
    const nextIndex = cardIndex + 1;
    if (nextIndex >= activeCards.length) {
      setCardDeck(shuffleMimeCards(cards, activeCards[cardIndex]));
      setCardIndex(0);
    } else {
      setCardIndex(nextIndex);
    }
    setRevealed(false);
  };

  const startTurn = () => {
    completedRef.current = false;
    if (cardDeck.length === 0) setCardDeck(shuffleMimeCards(cards));
    setRoundScore(0);
    setPasses(0);
    setSeconds(duration);
    setRevealed(false);
    setRunning(true);
    setTurnCompleted(false);
  };

  const nextRound = () => {
    setRound(value => value + 1);
    setRoundScore(0);
    setPasses(0);
    setSeconds(duration);
    setRevealed(false);
    setTurnCompleted(false);
    completedRef.current = false;
  };

  const reset = () => {
    setRound(0);
    setScores([0, 0]);
    setRoundScore(0);
    setPasses(0);
    setSeconds(duration);
    setRunning(false);
    setFinished(false);
    setConfigured(false);
    setCardDeck([]);
    setCardIndex(0);
    setRevealed(false);
    setTurnCompleted(false);
    completedRef.current = false;
  };

  const addCustomCard = () => {
    const value = customCard.trim();
    if (!value || customCards.includes(value)) return;
    const next = [...customCards, value].slice(-30);
    setCustomCards(next);
    localStorage.setItem('mf_mime_custom_cards', JSON.stringify(next));
    setCustomCard('');
  };

  const persistCustomCards = (next: string[]) => {
    setCustomCards(next);
    localStorage.setItem('mf_mime_custom_cards', JSON.stringify(next));
  };

  const deleteCustomCard = (card: string) => {
    persistCustomCards(customCards.filter(item => item !== card));
    if (editingCard === card) setEditingCard(null);
  };

  const saveEditedCard = () => {
    const value = editingValue.trim();
    if (!editingCard || !value) return;
    persistCustomCards(customCards.map(item => item === editingCard ? value : item));
    setEditingCard(null);
    setEditingValue('');
  };

  if (!configured) {
    return (
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 sm:p-6 space-y-5">
        <div className="text-center">
          <Eye className="mx-auto w-9 h-9 text-[#FF4D6D]" />
          <h2 className="mt-3 text-xl font-black text-white">Préparer les manches</h2>
          <p className="mt-1 text-xs text-white/50">Les équipes jouent chacune leur tour. Le téléphone est tenu par la personne qui valide.</p>
        </div>
        {isPremium ? (
          <label className="block"><span className="mb-2 block text-xs font-black text-white">Paquet</span>
            <select value={pack} onChange={event => setPack(event.target.value as MimePack)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
              <option value="enfants">Enfants</option><option value="famille">Toute la famille</option><option value="ados">Adolescents</option>
              <option value="vacances">Vacances</option><option value="fetes">Fêtes</option><option value="cinema">Cinéma</option>
            </select>
          </label>
        ) : (
          <button type="button" onClick={onTriggerPaywall} className="w-full rounded-2xl border border-[#FFB020]/25 bg-[#FFB020]/8 p-4 text-left">
            <strong className="block text-xs text-white">Paquet découverte · 20 cartes</strong>
            <span className="mt-1 block text-[10px] text-white/50">Premium débloque tous les âges, vacances, fêtes, cinéma et vos propres cartes.</span>
          </button>
        )}
        {isPremium && <div>
          <span className="mb-2 block text-xs font-black text-white">Cartes familiales</span>
          <div className="flex gap-2">
            <input value={customCard} onChange={event => setCustomCard(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addCustomCard(); }} placeholder="Ajouter un mime personnel" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white" />
            <button type="button" onClick={addCustomCard} className="rounded-2xl bg-[#6C5CFF] px-4 text-xs font-black text-white">Ajouter</button>
          </div>
          {customCards.length > 0 && (
            <div className="mt-3 rounded-2xl border border-white/8 bg-white/3">
              <button type="button" onClick={() => setShowCustomCards(value => !value)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <span className="text-[10px] font-black text-white/60">{customCards.length} mime{customCards.length > 1 ? 's' : ''} personnalisé{customCards.length > 1 ? 's' : ''}</span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showCustomCards ? 'rotate-180' : ''}`} />
              </button>
              {showCustomCards && (
                <div className="border-t border-white/8 p-2 space-y-2">
                  {customCards.map(card => (
                    <div key={card} className="rounded-xl border border-white/8 bg-white/5 p-2">
                      {editingCard === card ? (
                        <div className="flex gap-2">
                          <input value={editingValue} onChange={event => setEditingValue(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white" />
                          <button type="button" onClick={saveEditedCard} className="rounded-xl bg-[#00D26A] p-2 text-[#07111F]" title="Enregistrer"><Check className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setEditingCard(null)} className="rounded-xl border border-white/8 p-2 text-white/50" title="Annuler"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 text-xs text-white/75">{card}</span>
                          <button type="button" onClick={() => { setEditingCard(card); setEditingValue(card); }} className="rounded-lg p-2 text-[#4F8CFF]" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => deleteCustomCard(card)} className="rounded-lg p-2 text-[#FF4D6D]" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>}
        <div className="grid grid-cols-3 gap-2">
          {[30, 60, 90].map(value => <button key={value} type="button" onClick={() => setDuration(value as 30 | 60 | 90)} className={`rounded-2xl border py-3 text-xs font-black ${duration === value ? 'border-[#FFB020] bg-[#FFB020]/12 text-[#FFB020]' : 'border-white/8 text-white/60'}`}>{value}s</button>)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[2, 4, 6].map(value => <button key={value} type="button" onClick={() => setTotalRounds(value as 2 | 4 | 6)} className={`rounded-2xl border py-3 text-xs font-black ${totalRounds === value ? 'border-[#6C5CFF] bg-[#6C5CFF]/12 text-[#9E94FF]' : 'border-white/8 text-white/60'}`}>{value} manches</button>)}
        </div>
        <button type="button" onClick={() => { setConfigured(true); setSeconds(duration); }} className="w-full rounded-2xl bg-[#FF4D6D] py-4 text-sm font-black text-white">Commencer</button>
      </div>
    );
  }

  if (finished) {
    const winner = scores[0] === scores[1] ? 'Égalité' : teamNames[scores[0] > scores[1] ? 0 : 1];
    return (
      <div className="game-victory glass-panel rounded-[28px] border border-[#FFB020]/25 p-6 text-center">
        <Trophy className="mx-auto w-12 h-12 text-[#FFB020]" />
        <h2 className="mt-3 text-xl font-black text-white">{winner === 'Égalité' ? 'Égalité parfaite !' : `Victoire de ${winner}`}</h2>
        <p className="mt-2 text-2xl font-black text-[#FFB020]">{scores[0]} - {scores[1]}</p>
        <button type="button" onClick={reset} className="mt-5 rounded-2xl bg-[#6C5CFF] px-6 py-3 text-xs font-black text-white">Nouvelle partie</button>
      </div>
    );
  }

  if (!running) {
    return (
      <div className="glass-panel rounded-[28px] border border-white/8 p-6 text-center space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {teamNames.map((name, index) => <div key={name} className={`rounded-2xl border p-3 ${activeTeam === index ? 'border-[#FF4D6D]/40 bg-[#FF4D6D]/10' : 'border-white/8'}`}><strong className="block text-xs text-white">{name}</strong><span className="text-xl font-black text-[#FFB020]">{scores[index]}</span></div>)}
        </div>
        <h2 className="text-xl font-black text-white">{turnCompleted ? `${roundScore} mime${roundScore > 1 ? 's' : ''} trouvé${roundScore > 1 ? 's' : ''}` : `${teamNames[activeTeam]} fait deviner`}</h2>
        <p className="text-xs text-white/50">Manche {round + 1} sur {totalRounds} · {isPremium ? `paquet ${pack}` : 'paquet découverte'} · {cards.length} cartes</p>
        {turnCompleted && <p className="text-[10px] text-white/40">{passes} carte{passes > 1 ? 's' : ''} passée{passes > 1 ? 's' : ''}</p>}
        {turnCompleted ? (
          <button type="button" onClick={nextRound} className="w-full rounded-2xl bg-[#FFB020] py-3 text-xs font-black text-[#07111F]">Équipe suivante</button>
        ) : (
          <button type="button" onClick={startTurn} className="w-full rounded-2xl bg-[#FF4D6D] py-3 text-xs font-black text-white flex items-center justify-center gap-2"><Play className="w-4 h-4 fill-current" /> Lancer {duration} secondes</button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
        <span className="text-xs font-black text-[#00D26A]">{roundScore} trouvés</span>
        <span className={`flex items-center gap-1.5 text-base font-black ${seconds <= 10 ? 'text-[#FF4D6D]' : 'text-[#FFB020]'}`}><Timer className="w-5 h-5" /> {seconds}s</span>
        <button type="button" onClick={finishTurn} className="text-white/45" title="Arrêter"><RotateCcw className="w-4 h-4" /></button>
      </div>
      <button type="button" onClick={() => setRevealed(true)} className={`mime-reveal-card family-games-challenge w-full min-h-[320px] rounded-[28px] border p-6 flex flex-col items-center justify-center text-center ${revealed ? 'is-revealed' : ''}`}>
        {revealed ? <><span className="text-[10px] font-black uppercase tracking-widest text-[#FF4D6D]">À mimer</span><strong className="mt-5 text-3xl sm:text-4xl leading-tight text-white">{activeCards[cardIndex] || cards[0]}</strong></> : <><Eye className="w-10 h-10 text-[#6C5CFF]" /><strong className="mt-4 text-lg text-white">Touchez pour révéler</strong></>}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => nextCard(false)} className="py-4 rounded-2xl border border-white/8 bg-white/5 text-white/60 text-xs font-black flex items-center justify-center gap-2"><SkipForward className="w-4 h-4" /> Passer</button>
        <button type="button" onClick={() => nextCard(true)} disabled={!revealed} className="py-4 rounded-2xl bg-[#00D26A] disabled:opacity-40 text-[#07111F] text-xs font-black flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Trouvé</button>
      </div>
    </div>
  );
}
