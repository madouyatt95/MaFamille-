import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronRight,
  Circle,
  Gamepad2,
  Grid3X3,
  Lock,
  Medal,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Users
} from 'lucide-react';
import type { Member } from '../types';

type GameId = 'memory' | 'connect4' | 'family-challenge';
type MemoryCard = {
  id: string;
  pairId: string;
  label: string;
  image?: string;
  emoji?: string;
};
type ConnectCell = 0 | 1 | 2;

interface FamilyGamesProps {
  members: Member[];
  activeMemberId: string;
  foyerId?: string;
  isPremium?: boolean;
  onBack: () => void;
  onTriggerPaywall?: () => void;
}

const BASE_CHALLENGES = [
  {
    question: 'Quelle est la première chose que l’on oublie avant de partir en vacances ?',
    answers: ['Le chargeur', 'La brosse à dents', 'Les papiers', 'Le doudou', 'Les lunettes']
  },
  {
    question: 'Quelle activité met presque toute la famille de bonne humeur ?',
    answers: ['Un bon repas', 'Une sortie', 'Un film', 'Un jeu', 'De la musique']
  },
  {
    question: 'Quel objet disparaît mystérieusement le plus souvent à la maison ?',
    answers: ['Les clés', 'La télécommande', 'Les chaussettes', 'Le téléphone', 'Un stylo']
  },
  {
    question: 'Que fait-on généralement quand personne ne sait quoi manger ?',
    answers: ['Commander', 'Faire des pâtes', 'Regarder le frigo', 'Demander aux enfants', 'Improviser']
  },
  {
    question: 'Quelle phrase entend-on souvent juste avant de quitter la maison ?',
    answers: ['On y va !', 'Tu as tes clés ?', 'Dépêchez-vous', 'J’arrive !', 'Où est mon téléphone ?']
  },
  {
    question: 'Quel est le meilleur moment d’une soirée en famille ?',
    answers: ['Le repas', 'Le jeu', 'Le dessert', 'Le film', 'Les discussions']
  }
];

const PREMIUM_CHALLENGES = [
  {
    question: 'Quelle petite habitude familiale ferait rire quelqu’un qui nous découvre ?',
    answers: ['Nos surnoms', 'Nos chansons', 'Nos expressions', 'Nos débats', 'Nos danses']
  },
  {
    question: 'Quel talent secret est le plus utile dans une famille ?',
    answers: ['Retrouver les objets', 'Calmer les disputes', 'Cuisiner vite', 'Faire rire', 'Tout organiser']
  },
  {
    question: 'Quelle mission du quotidien mérite une médaille ?',
    answers: ['Le réveil', 'Les devoirs', 'Le rangement', 'Les courses', 'Le coucher']
  },
  {
    question: 'Quel souvenir familial devrait devenir un film ?',
    answers: ['Des vacances', 'Une fête', 'Une naissance', 'Une aventure imprévue', 'Un repas mémorable']
  },
  {
    question: 'Quelle règle de la maison est la plus difficile à respecter ?',
    answers: ['Ranger', 'Être à l’heure', 'Limiter les écrans', 'Finir son assiette', 'Parler calmement']
  },
  {
    question: 'Quelle récompense motive le plus toute la famille ?',
    answers: ['Une sortie', 'Un dessert', 'Une soirée film', 'Un voyage', 'Une journée sans corvées']
  }
];

const FALLBACK_MEMORY_ITEMS = [
  { label: 'Vacances', emoji: '🏖️' },
  { label: 'Maison', emoji: '🏠' },
  { label: 'Fête', emoji: '🎉' },
  { label: 'Repas', emoji: '🍕' },
  { label: 'Musique', emoji: '🎵' },
  { label: 'Étoile', emoji: '⭐' }
];

const seededOrder = (value: string, round: number): number => {
  const hash = [...value].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 17), round * 131);
  const x = Math.sin(hash * 999) * 10000;
  return x - Math.floor(x);
};

const buildMemoryDeck = (members: Member[], round: number): MemoryCard[] => {
  const memberItems: Array<{ label: string; image?: string; emoji?: string }> = members
    .filter(member => member.name)
    .slice(0, 6)
    .map(member => ({
      label: member.name,
      image: member.photoUrl,
      emoji: '🙂'
    }));
  const items: Array<{ label: string; image?: string; emoji?: string }> = [...memberItems];
  for (const fallback of FALLBACK_MEMORY_ITEMS) {
    if (items.length >= 6) break;
    items.push(fallback);
  }
  return items
    .flatMap((item, index) => [
      { ...item, id: `${round}-${index}-a`, pairId: `pair-${index}` },
      { ...item, id: `${round}-${index}-b`, pairId: `pair-${index}` }
    ])
    .sort((a, b) => seededOrder(a.id, round) - seededOrder(b.id, round));
};

const emptyBoard = (): ConnectCell[][] =>
  Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0 as ConnectCell));

const getConnectWinner = (board: ConnectCell[][]): ConnectCell => {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const player = board[row][col];
      if (!player) continue;
      for (const [dr, dc] of directions) {
        let connected = 1;
        for (let step = 1; step < 4; step += 1) {
          const nextRow = row + dr * step;
          const nextCol = col + dc * step;
          if (board[nextRow]?.[nextCol] === player) connected += 1;
        }
        if (connected === 4) return player;
      }
    }
  }
  return 0;
};

const getInitials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';

export function FamilyGames({
  members,
  activeMemberId,
  foyerId = 'local',
  isPremium = false,
  onBack,
  onTriggerPaywall
}: FamilyGamesProps) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [memoryRound, setMemoryRound] = useState(1);
  const memoryDeck = useMemo(() => buildMemoryDeck(members, memoryRound), [members, memoryRound]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);

  const players = useMemo(() => {
    const active = members.find(member => member.id === activeMemberId);
    const others = members.filter(member => member.id !== activeMemberId);
    return [
      active || members[0] || { id: 'player-1', name: 'Équipe Soleil', role: 'Famille', photoUrl: '' },
      others[0] || { id: 'player-2', name: 'Équipe Comète', role: 'Famille', photoUrl: '' }
    ];
  }, [activeMemberId, members]);

  const [board, setBoard] = useState<ConnectCell[][]>(() => emptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [connectWinner, setConnectWinner] = useState<ConnectCell>(0);
  const [connectScores, setConnectScores] = useState<[number, number]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mf_games_connect4_${foyerId}`) || '[0,0]');
      return Array.isArray(saved) && saved.length === 2 ? [Number(saved[0]) || 0, Number(saved[1]) || 0] : [0, 0];
    } catch {
      return [0, 0];
    }
  });

  const challenges = useMemo(
    () => isPremium ? [...BASE_CHALLENGES, ...PREMIUM_CHALLENGES] : BASE_CHALLENGES,
    [isPremium]
  );
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);
  const [challengeScores, setChallengeScores] = useState<[number, number]>([0, 0]);
  const challenge = challenges[challengeIndex % challenges.length];

  useEffect(() => {
    localStorage.setItem(`mf_games_connect4_${foyerId}`, JSON.stringify(connectScores));
  }, [connectScores, foyerId]);

  useEffect(() => {
    if (flippedCards.length !== 2) return;
    const [first, second] = flippedCards.map(id => memoryDeck.find(card => card.id === id));
    if (first && second && first.pairId === second.pairId) {
      queueMicrotask(() => {
        setMatchedPairs(previous => previous.includes(first.pairId) ? previous : [...previous, first.pairId]);
        setFlippedCards([]);
      });
      return;
    }
    const timer = window.setTimeout(() => setFlippedCards([]), 700);
    return () => window.clearTimeout(timer);
  }, [flippedCards, memoryDeck]);

  const resetMemory = () => {
    setMemoryRound(previous => previous + 1);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMemoryMoves(0);
  };

  const flipMemoryCard = (card: MemoryCard) => {
    if (flippedCards.length >= 2 || flippedCards.includes(card.id) || matchedPairs.includes(card.pairId)) return;
    setFlippedCards(previous => [...previous, card.id]);
    setMemoryMoves(previous => previous + 1);
  };

  const dropConnectPiece = (column: number) => {
    if (connectWinner) return;
    const targetRow = [...board].map((_, index) => index).reverse().find(row => board[row][column] === 0);
    if (targetRow === undefined) return;
    const next = board.map(row => [...row]);
    next[targetRow][column] = currentPlayer;
    const winner = getConnectWinner(next);
    setBoard(next);
    if (winner) {
      setConnectWinner(winner);
      setConnectScores(previous => winner === 1 ? [previous[0] + 1, previous[1]] : [previous[0], previous[1] + 1]);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  const resetConnectBoard = () => {
    setBoard(emptyBoard());
    setConnectWinner(0);
    setCurrentPlayer(previous => previous === 1 ? 2 : 1);
  };

  const nextChallenge = () => {
    setChallengeIndex(previous => (previous + 1) % challenges.length);
    setRevealedAnswers([]);
  };

  const gameCards = [
    {
      id: 'memory' as const,
      title: 'Memory famille',
      description: 'Retrouvez les paires avec les visages et les souvenirs de votre foyer.',
      icon: Grid3X3,
      accent: '#FFB020',
      meta: '1 à 6 joueurs'
    },
    {
      id: 'connect4' as const,
      title: 'Puissance 4',
      description: 'Un duel rapide, tactile et parfait pour départager deux membres.',
      icon: Circle,
      accent: '#4F8CFF',
      meta: '2 joueurs'
    },
    {
      id: 'family-challenge' as const,
      title: 'Défi famille',
      description: 'Devinez les réponses les plus populaires et faites gagner votre équipe.',
      icon: Users,
      accent: '#FF4D6D',
      meta: `${challenges.length} manches`
    }
  ];

  const gameHeader = (title: string, subtitle: string, icon: typeof Gamepad2) => {
    const Icon = icon;
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="shrink-0 p-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            aria-label="Retour aux jeux"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Icon className="w-6 h-6 text-[#FFB020]" />
              <span className="truncate">{title}</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-white/50 font-semibold mt-1">{subtitle}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="family-games min-h-screen pb-32 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] px-4 md:px-8 premium-glow-purple">
      <div className="max-w-5xl mx-auto space-y-6">
        {!activeGame && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">Jeux en famille</h1>
                    <Gamepad2 className="w-7 h-7 text-[#FFB020]" />
                  </div>
                  <p className="text-xs sm:text-sm text-white/50 font-semibold mt-1">Des parties courtes pour jouer ensemble, sur le même écran.</p>
                </div>
              </div>
            </div>

            <section className="family-games-hero relative overflow-hidden rounded-[28px] border p-5 sm:p-7">
              <div className="absolute right-[-30px] top-[-40px] w-40 h-40 rounded-full bg-[#6C5CFF]/15 blur-3xl pointer-events-none" />
              <div className="relative grid gap-5 md:grid-cols-[1.3fr_0.7fr] md:items-center">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-1 text-[9px] font-black uppercase text-[#FFB020]">
                    <Sparkles className="w-3 h-3" /> Salle de jeux
                  </span>
                  <h2 className="mt-4 text-xl sm:text-2xl font-black text-white">La prochaine soirée commence ici.</h2>
                  <p className="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-white/55">
                    Choisissez un jeu, posez le téléphone au centre et passez-le au joueur suivant. Aucun compte supplémentaire n’est nécessaire.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {players.concat(members.filter(member => !players.some(player => player.id === member.id)).slice(0, 1)).map(member => (
                    <div key={member.id} className="family-games-member aspect-square rounded-2xl border p-2 flex flex-col items-center justify-center text-center">
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/15" />
                      ) : (
                        <span className="w-10 h-10 rounded-full bg-[#6C5CFF]/20 text-[#9E94FF] flex items-center justify-center text-xs font-black">{getInitials(member.name)}</span>
                      )}
                      <span className="mt-2 text-[9px] font-bold text-white/70 truncate w-full">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gameCards.map(game => {
                const Icon = game.icon;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setActiveGame(game.id)}
                    className="glass-panel min-h-[220px] rounded-[28px] border border-white/8 p-5 text-left flex flex-col justify-between hover:bg-white/8 hover:-translate-y-1 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <span className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10" style={{ backgroundColor: `${game.accent}18`, color: game.accent }}>
                        <Icon className="w-6 h-6" />
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/40">{game.meta}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{game.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-white/50">{game.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-black" style={{ color: game.accent }}>
                        Jouer <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {!isPremium && (
              <button
                type="button"
                onClick={onTriggerPaywall}
                className="w-full rounded-[24px] border border-[#FFB020]/20 bg-[#FFB020]/8 p-4 flex items-center justify-between gap-4 text-left hover:bg-[#FFB020]/12 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-2xl bg-[#FFB020]/15 text-[#FFB020]"><Lock className="w-5 h-5" /></span>
                  <div>
                    <strong className="block text-sm text-white">Pack Défi famille Plus</strong>
                    <span className="text-[11px] text-white/50">6 manches supplémentaires pour renouveler les soirées.</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 text-[#FFB020]" />
              </button>
            )}
          </>
        )}

        {activeGame === 'memory' && (
          <>
            {gameHeader('Memory famille', 'Retrouvez toutes les paires en un minimum de coups.', Brain)}
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-5">
                <span className="text-xs text-white/50">Coups <strong className="ml-1 text-white">{memoryMoves}</strong></span>
                <span className="text-xs text-white/50">Paires <strong className="ml-1 text-[#00D26A]">{matchedPairs.length}/6</strong></span>
              </div>
              <button type="button" onClick={resetMemory} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10" title="Recommencer">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-2xl mx-auto">
              {memoryDeck.map(card => {
                const isVisible = flippedCards.includes(card.id) || matchedPairs.includes(card.pairId);
                const isMatched = matchedPairs.includes(card.pairId);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => flipMemoryCard(card)}
                    className={`aspect-[0.82] rounded-[20px] border transition-all overflow-hidden relative ${
                      isVisible
                        ? isMatched ? 'border-[#00D26A]/50 bg-[#00D26A]/10' : 'border-[#FFB020]/40 bg-white/8'
                        : 'border-[#6C5CFF]/25 bg-[#6C5CFF]/12 hover:bg-[#6C5CFF]/20'
                    }`}
                  >
                    {isVisible ? (
                      <span className="absolute inset-0 p-2 flex flex-col items-center justify-center">
                        {card.image ? (
                          <img src={card.image} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/20" />
                        ) : (
                          <span className="text-3xl sm:text-4xl">{card.emoji}</span>
                        )}
                        <strong className="mt-2 max-w-full truncate text-[9px] sm:text-[11px] text-white">{card.label}</strong>
                        {isMatched && <Check className="absolute top-2 right-2 w-4 h-4 text-[#00D26A]" />}
                      </span>
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Star className="w-7 h-7 text-[#9E94FF]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {matchedPairs.length === 6 && (
              <div className="glass-panel rounded-[24px] border border-[#00D26A]/25 p-5 text-center">
                <Trophy className="w-10 h-10 mx-auto text-[#FFB020]" />
                <h2 className="mt-2 text-lg font-black text-white">Toutes les paires retrouvées !</h2>
                <p className="mt-1 text-xs text-white/50">Partie terminée en {memoryMoves} coups.</p>
                <button type="button" onClick={resetMemory} className="mt-4 px-5 py-3 rounded-2xl bg-[#00D26A] text-[#07111F] text-xs font-black">
                  Nouvelle partie
                </button>
              </div>
            )}
          </>
        )}

        {activeGame === 'connect4' && (
          <>
            {gameHeader('Puissance 4', 'Alignez quatre jetons horizontalement, verticalement ou en diagonale.', Circle)}
            <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
              {players.map((player, index) => (
                <div key={player.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${currentPlayer === index + 1 && !connectWinner ? 'border-[#FFB020]/40 bg-[#FFB020]/10' : 'border-white/8 bg-white/5'}`}>
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-[#FF4D6D] text-white' : 'bg-[#FFB020] text-[#07111F]'}`}>{getInitials(player.name)}</span>
                  )}
                  <div className="min-w-0">
                    <strong className="block text-xs text-white truncate">{player.name}</strong>
                    <span className="text-[10px] text-white/45">{connectScores[index]} victoire{connectScores[index] > 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="family-games-board max-w-xl mx-auto rounded-[24px] border p-2.5 sm:p-4 shadow-xl">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {board.map((row, rowIndex) => row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    onClick={() => dropConnectPiece(colIndex)}
                    className="family-games-slot aspect-square rounded-full border p-[12%]"
                    aria-label={`Colonne ${colIndex + 1}`}
                  >
                    <span className={`block w-full h-full rounded-full transition-colors ${
                      cell === 1 ? 'bg-[#FF4D6D]' : cell === 2 ? 'bg-[#FFB020]' : 'bg-white/5'
                    }`} />
                  </button>
                )))}
              </div>
            </div>
            <div className="text-center">
              {connectWinner ? (
                <div className="space-y-3">
                  <p className="text-base font-black text-white"><Trophy className="inline w-5 h-5 mr-2 text-[#FFB020]" />{players[connectWinner - 1].name} remporte la manche !</p>
                  <button type="button" onClick={resetConnectBoard} className="px-5 py-3 rounded-2xl bg-[#6C5CFF] text-white text-xs font-black">
                    Revanche
                  </button>
                </div>
              ) : (
                <p className="text-sm font-bold text-white/70">À {players[currentPlayer - 1].name} de jouer</p>
              )}
            </div>
          </>
        )}

        {activeGame === 'family-challenge' && (
          <>
            {gameHeader('Défi famille', 'Une personne anime, les deux équipes proposent leurs réponses.', Users)}
            <div className="grid grid-cols-2 gap-3">
              {players.map((player, index) => (
                <div key={player.id} className="glass-panel rounded-[22px] border border-white/8 p-4 text-center">
                  <span className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${index === 0 ? 'bg-[#6C5CFF] text-white' : 'bg-[#FF4D6D] text-white'}`}>
                    {getInitials(player.name)}
                  </span>
                  <strong className="mt-2 block text-xs text-white truncate">{player.name}</strong>
                  <span className="mt-1 block text-2xl font-black text-[#FFB020]">{challengeScores[index]}</span>
                </div>
              ))}
            </div>
            <section className="family-games-challenge rounded-[28px] border p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D6D]">Manche {challengeIndex + 1}/{challenges.length}</span>
                <Medal className="w-5 h-5 text-[#FFB020]" />
              </div>
              <h2 className="mt-4 text-lg sm:text-2xl font-black leading-snug text-white">{challenge.question}</h2>
              <div className="mt-5 space-y-2.5">
                {challenge.answers.map((answer, index) => {
                  const revealed = revealedAnswers.includes(index);
                  const points = (challenge.answers.length - index) * 10;
                  return (
                    <button
                      key={answer}
                      type="button"
                      onClick={() => setRevealedAnswers(previous => previous.includes(index) ? previous : [...previous, index])}
                      className={`w-full min-h-12 rounded-2xl border px-4 py-3 flex items-center justify-between text-left transition-colors ${
                        revealed ? 'border-[#00D26A]/30 bg-[#00D26A]/10' : 'border-white/8 bg-white/5 hover:bg-white/8'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black ${revealed ? 'bg-[#00D26A] text-[#07111F]' : 'bg-white/8 text-white/35'}`}>
                          {revealed ? index + 1 : '?'}
                        </span>
                        <strong className={`text-xs sm:text-sm truncate ${revealed ? 'text-white' : 'text-white/30'}`}>{revealed ? answer : 'Réponse masquée'}</strong>
                      </span>
                      {revealed && <span className="text-xs font-black text-[#00D26A]">+{points}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
            <div className="grid grid-cols-2 gap-3">
              {players.map((player, index) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setChallengeScores(previous => index === 0 ? [previous[0] + 10, previous[1]] : [previous[0], previous[1] + 10])}
                  className={`rounded-2xl py-3 px-2 text-xs font-black text-white ${index === 0 ? 'bg-[#6C5CFF]' : 'bg-[#FF4D6D]'}`}
                >
                  +10 pour {player.name}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChallengeScores([0, 0])}
                className="p-3 rounded-2xl border border-white/8 bg-white/5 text-white/60"
                title="Remettre les scores à zéro"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={nextChallenge}
                className="flex-1 rounded-2xl bg-[#FFB020] py-3 text-[#07111F] text-xs font-black flex items-center justify-center gap-2"
              >
                <span>Manche suivante</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
