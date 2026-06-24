import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  RotateCcw,
  Shield,
  Sparkles,
  UserRound,
  Users,
  Vote
} from 'lucide-react';
import type { Member } from '../../types';

type Stage = 'setup' | 'pass' | 'card' | 'clues' | 'vote' | 'vote-result' | 'result';
type Role = 'citizen' | 'undercover' | 'white';
type Pack = 'famille' | 'quotidien' | 'vacances' | 'ados';

type WordPair = {
  pack: Pack;
  publicWord: string;
  undercoverWord: string;
};

type Player = {
  id: string;
  name: string;
  photoUrl?: string;
  role: Role;
  word?: string;
  eliminated?: boolean;
};

type Clue = {
  round: number;
  playerId: string;
  playerName: string;
  text: string;
};

type VoteOutcome = {
  eliminatedId?: string;
  eliminatedName?: string;
  eliminatedRole?: Role;
  tied: boolean;
  tiedIds?: string[];
  counts: Array<{ id: string; name: string; total: number }>;
};

interface AgentCacheGameProps {
  members: Member[];
}

const CARD_IMAGE = '/game-assets/agent-cache-cards.jpg';

const WORD_PAIRS: WordPair[] = [
  { pack: 'famille', publicWord: 'Cousin', undercoverWord: 'Voisin' },
  { pack: 'famille', publicWord: 'Mamie', undercoverWord: 'Tatie' },
  { pack: 'famille', publicWord: 'Anniversaire', undercoverWord: 'Mariage' },
  { pack: 'famille', publicWord: 'Salon', undercoverWord: 'Cuisine' },
  { pack: 'famille', publicWord: 'Photo de famille', undercoverWord: 'Selfie' },
  { pack: 'famille', publicWord: 'Réunion familiale', undercoverWord: 'Repas du dimanche' },
  { pack: 'famille', publicWord: 'Cadeau', undercoverWord: 'Surprise' },
  { pack: 'famille', publicWord: 'Vacances en famille', undercoverWord: 'Week-end' },
  { pack: 'famille', publicWord: 'Maison', undercoverWord: 'Appartement' },
  { pack: 'famille', publicWord: 'Frère', undercoverWord: 'Cousin' },
  { pack: 'quotidien', publicWord: 'Supermarché', undercoverWord: 'Épicerie' },
  { pack: 'quotidien', publicWord: 'Dentifrice', undercoverWord: 'Savon' },
  { pack: 'quotidien', publicWord: 'Télécommande', undercoverWord: 'Manette' },
  { pack: 'quotidien', publicWord: 'Cartable', undercoverWord: 'Sac à dos' },
  { pack: 'quotidien', publicWord: 'Boulangerie', undercoverWord: 'Pâtisserie' },
  { pack: 'quotidien', publicWord: 'Bus', undercoverWord: 'Tramway' },
  { pack: 'quotidien', publicWord: 'Facture', undercoverWord: 'Ticket de caisse' },
  { pack: 'quotidien', publicWord: 'Aspirateur', undercoverWord: 'Balai' },
  { pack: 'quotidien', publicWord: 'Pyjama', undercoverWord: 'Peignoir' },
  { pack: 'quotidien', publicWord: 'Agenda', undercoverWord: 'Calendrier' },
  { pack: 'vacances', publicWord: 'Plage', undercoverWord: 'Piscine' },
  { pack: 'vacances', publicWord: 'Valise', undercoverWord: 'Sac de voyage' },
  { pack: 'vacances', publicWord: 'Passeport', undercoverWord: 'Carte d’identité' },
  { pack: 'vacances', publicWord: 'Camping', undercoverWord: 'Hôtel' },
  { pack: 'vacances', publicWord: 'Glace', undercoverWord: 'Sorbet' },
  { pack: 'vacances', publicWord: 'Montagne', undercoverWord: 'Colline' },
  { pack: 'vacances', publicWord: 'Carte postale', undercoverWord: 'Souvenir' },
  { pack: 'vacances', publicWord: 'Train', undercoverWord: 'Avion' },
  { pack: 'vacances', publicWord: 'Parasol', undercoverWord: 'Serviette' },
  { pack: 'vacances', publicWord: 'Randonnée', undercoverWord: 'Balade' },
  { pack: 'ados', publicWord: 'Story', undercoverWord: 'Message' },
  { pack: 'ados', publicWord: 'Playlist', undercoverWord: 'Podcast' },
  { pack: 'ados', publicWord: 'Sneakers', undercoverWord: 'Chaussures' },
  { pack: 'ados', publicWord: 'Cinéma', undercoverWord: 'Série' },
  { pack: 'ados', publicWord: 'Contrôle', undercoverWord: 'Devoir' },
  { pack: 'ados', publicWord: 'Gaming', undercoverWord: 'Streaming' },
  { pack: 'ados', publicWord: 'Casque audio', undercoverWord: 'Écouteurs' },
  { pack: 'ados', publicWord: 'Collège', undercoverWord: 'Lycée' },
  { pack: 'ados', publicWord: 'Discussion', undercoverWord: 'Groupe' },
  { pack: 'ados', publicWord: 'Emoji', undercoverWord: 'Sticker' },
  { pack: 'famille', publicWord: 'Canapé', undercoverWord: 'Fauteuil' },
  { pack: 'famille', publicWord: 'Cérémonie', undercoverWord: 'Fête' },
  { pack: 'famille', publicWord: 'Parrain', undercoverWord: 'Oncle' },
  { pack: 'famille', publicWord: 'Album photo', undercoverWord: 'Cadre' },
  { pack: 'famille', publicWord: 'Berceau', undercoverWord: 'Lit' },
  { pack: 'famille', publicWord: 'Repas', undercoverWord: 'Goûter' },
  { pack: 'famille', publicWord: 'Jardin', undercoverWord: 'Balcon' },
  { pack: 'famille', publicWord: 'Poussette', undercoverWord: 'Trottinette' },
  { pack: 'famille', publicWord: 'Doudou', undercoverWord: 'Peluche' },
  { pack: 'famille', publicWord: 'Barbecue', undercoverWord: 'Plancha' },
  { pack: 'quotidien', publicWord: 'Réveil', undercoverWord: 'Alarme' },
  { pack: 'quotidien', publicWord: 'Frigo', undercoverWord: 'Congélateur' },
  { pack: 'quotidien', publicWord: 'Lessive', undercoverWord: 'Vaisselle' },
  { pack: 'quotidien', publicWord: 'Clés', undercoverWord: 'Badge' },
  { pack: 'quotidien', publicWord: 'Médecin', undercoverWord: 'Pharmacien' },
  { pack: 'quotidien', publicWord: 'Essence', undercoverWord: 'Parking' },
  { pack: 'quotidien', publicWord: 'Ordinateur', undercoverWord: 'Tablette' },
  { pack: 'quotidien', publicWord: 'Facteur', undercoverWord: 'Livreur' },
  { pack: 'quotidien', publicWord: 'Ascenseur', undercoverWord: 'Escalier' },
  { pack: 'quotidien', publicWord: 'Parapluie', undercoverWord: 'Manteau' },
  { pack: 'vacances', publicWord: 'Aéroport', undercoverWord: 'Gare' },
  { pack: 'vacances', publicWord: 'Croisière', undercoverWord: 'Traversée' },
  { pack: 'vacances', publicWord: 'Musée', undercoverWord: 'Monument' },
  { pack: 'vacances', publicWord: 'Boussole', undercoverWord: 'Carte' },
  { pack: 'vacances', publicWord: 'Tente', undercoverWord: 'Caravane' },
  { pack: 'vacances', publicWord: 'Crème solaire', undercoverWord: 'Lunettes' },
  { pack: 'vacances', publicWord: 'Pique-nique', undercoverWord: 'Restaurant' },
  { pack: 'vacances', publicWord: 'Location', undercoverWord: 'Réservation' },
  { pack: 'vacances', publicWord: 'Coquillage', undercoverWord: 'Galets' },
  { pack: 'vacances', publicWord: 'Guide', undercoverWord: 'Touriste' },
  { pack: 'ados', publicWord: 'Réseaux sociaux', undercoverWord: 'Forum' },
  { pack: 'ados', publicWord: 'Chargeur', undercoverWord: 'Batterie' },
  { pack: 'ados', publicWord: 'Contrôle surprise', undercoverWord: 'Examen' },
  { pack: 'ados', publicWord: 'Influenceur', undercoverWord: 'Youtubeur' },
  { pack: 'ados', publicWord: 'Selfie', undercoverWord: 'Portrait' },
  { pack: 'ados', publicWord: 'Match', undercoverWord: 'Tournoi' },
  { pack: 'ados', publicWord: 'Burger', undercoverWord: 'Tacos' },
  { pack: 'ados', publicWord: 'Snap', undercoverWord: 'Message' },
  { pack: 'ados', publicWord: 'Casier', undercoverWord: 'Bureau' },
  { pack: 'ados', publicWord: 'Sortie scolaire', undercoverWord: 'Voyage' }
];

const ROLE_LABELS: Record<Role, string> = {
  citizen: 'Citoyen',
  undercover: 'Agent caché',
  white: 'Agent blanc'
};

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('') || 'MF';

const normalizeGuess = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const getEditDistance = (left: string, right: string) => {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
};

const isCitizenWordGuess = (guess: string, citizenWord: string) => {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedWord = normalizeGuess(citizenWord);
  if (!normalizedGuess || !normalizedWord) return false;
  if (normalizedGuess === normalizedWord) return true;

  const allowedDistance = normalizedWord.length >= 10 ? 2 : 1;
  return Math.abs(normalizedGuess.length - normalizedWord.length) <= allowedDistance
    && getEditDistance(normalizedGuess, normalizedWord) <= allowedDistance;
};

const getSecretRoleCounts = (playerCount: number) => {
  const maxHiddenAgents = Math.max(1, Math.min(3, Math.floor((playerCount - 1) / 3)));
  const whiteAllowed = playerCount >= 5;
  const includeWhite = whiteAllowed && Math.random() < 0.45;
  const undercoverCount = Math.random() < 0.25 && includeWhite
    ? 0
    : Math.max(1, 1 + Math.floor(Math.random() * maxHiddenAgents));

  return {
    undercoverCount: Math.min(undercoverCount, playerCount - (includeWhite ? 2 : 1)),
    includeWhite
  };
};

const keepWhiteAwayFromFirstTurn = (players: Player[]) => {
  if (players[0]?.role !== 'white') return players;
  const swapIndex = players.findIndex((player, index) => index > 0 && player.role !== 'white' && !player.eliminated);
  if (swapIndex === -1) return players;
  const copy = [...players];
  [copy[0], copy[swapIndex]] = [copy[swapIndex], copy[0]];
  return copy;
};

const roleImagePosition = (role: Role) => {
  if (role === 'undercover') return '0% 0%';
  if (role === 'white') return '0% 100%';
  return '100% 0%';
};

const roleBorderClass = (role: Role) => {
  if (role === 'undercover') return 'border-[#FF4D6D]/30 bg-[#FF4D6D]/10';
  if (role === 'white') return 'border-[#FFB020]/30 bg-[#FFB020]/10';
  return 'border-[#00D26A]/25 bg-[#00D26A]/10';
};

const checkWinner = (alivePlayers: Player[]) => {
  const aliveUndercover = alivePlayers.filter(player => player.role === 'undercover').length;
  const aliveWhite = alivePlayers.some(player => player.role === 'white');
  const aliveCitizens = alivePlayers.filter(player => player.role === 'citizen').length;

  if (aliveWhite && alivePlayers.length <= 2) return 'white' as const;
  if (aliveUndercover === 0 && !aliveWhite) return 'citizens' as const;
  if (aliveUndercover > 0 && aliveUndercover >= aliveCitizens) return 'undercover' as const;
  return null;
};

const getVictoryExplanation = (
  winner: ReturnType<typeof checkWinner>,
  pair: WordPair | null
) => {
  if (winner === 'white') {
    return pair
      ? `L’Agent blanc a trouvé le mot des citoyens : ${pair.publicWord}.`
      : 'L’Agent blanc a réussi à trouver le mot des citoyens.';
  }
  if (winner === 'citizens') return 'Tous les rôles cachés ont été éliminés.';
  if (winner === 'undercover') return 'Les agents cachés sont devenus aussi nombreux que les citoyens restants.';
  return 'La partie est terminée.';
};

export function AgentCacheGame({ members }: AgentCacheGameProps) {
  const playableMembers = useMemo(
    () => members.length > 0 ? members : [{ id: 'guest-1', name: 'Joueur 1' }, { id: 'guest-2', name: 'Joueur 2' }, { id: 'guest-3', name: 'Joueur 3' }] as Member[],
    [members]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => playableMembers.slice(0, Math.min(6, playableMembers.length)).map(member => member.id));
  const [stage, setStage] = useState<Stage>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [pair, setPair] = useState<WordPair | null>(null);
  const [round, setRound] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [clueInput, setClueInput] = useState('');
  const [clues, setClues] = useState<Clue[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [voteOutcome, setVoteOutcome] = useState<VoteOutcome | null>(null);
  const [winner, setWinner] = useState<ReturnType<typeof checkWinner>>(null);
  const [clueSecondsLeft, setClueSecondsLeft] = useState(15);
  const [voteCandidates, setVoteCandidates] = useState<string[] | null>(null);

  const selectedMembers = useMemo(
    () => selectedIds.map(id => playableMembers.find(member => member.id === id)).filter((member): member is Member => Boolean(member)),
    [playableMembers, selectedIds]
  );
  const alivePlayers = players.filter(player => !player.eliminated);
  const currentPlayer = alivePlayers[currentIndex];
  const currentVoter = alivePlayers[Object.keys(votes).length];
  const voteTargets = voteCandidates
    ? alivePlayers.filter(player => voteCandidates.includes(player.id))
    : alivePlayers;
  const visibleClues = clues.slice().sort((a, b) => b.round - a.round);

  const togglePlayer = (memberId: string) => {
    setSelectedIds(previous => {
      if (previous.includes(memberId)) return previous.length <= 3 ? previous : previous.filter(id => id !== memberId);
      if (previous.length >= 12) return previous;
      return [...previous, memberId];
    });
  };

  const startGame = () => {
    const nextPair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)] || WORD_PAIRS[0];
    const secretRoles = getSecretRoleCounts(selectedMembers.length);
    const roleDeck: Role[] = [
      ...Array.from({ length: secretRoles.undercoverCount }, () => 'undercover' as const),
      ...(secretRoles.includeWhite ? ['white' as const] : []),
      ...Array.from({ length: Math.max(0, selectedMembers.length - secretRoles.undercoverCount - (secretRoles.includeWhite ? 1 : 0)) }, () => 'citizen' as const)
    ];
    const shuffledRoles = shuffle(roleDeck);
    const nextPlayers = keepWhiteAwayFromFirstTurn(shuffle(selectedMembers).map((member, index) => {
      const role = shuffledRoles[index] || 'citizen';
      return {
        id: member.id,
        name: member.name,
        photoUrl: member.photoUrl,
        role,
        word: role === 'citizen' ? nextPair.publicWord : role === 'undercover' ? nextPair.undercoverWord : undefined,
        eliminated: false
      };
    }));
    setPlayers(nextPlayers);
    setPair(nextPair);
    setRound(1);
    setCurrentIndex(0);
    setRevealed(false);
    setClueInput('');
    setClues([]);
    setVotes({});
    setVoteOutcome(null);
    setWinner(null);
    setClueSecondsLeft(15);
    setVoteCandidates(null);
    setStage('pass');
  };

  const saveClueAndContinue = () => {
    if (!currentPlayer || !clueInput.trim()) return;
    if (
      currentPlayer.role === 'white'
      && pair
      && isCitizenWordGuess(clueInput, pair.publicWord)
    ) {
      setWinner('white');
      setStage('result');
      return;
    }
    setClues(previous => [...previous, {
      round,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      text: clueInput.trim()
    }]);
    setClueInput('');
    setRevealed(false);
    setClueSecondsLeft(15);
    if (currentIndex >= alivePlayers.length - 1) {
      setCurrentIndex(0);
      setStage('clues');
    } else {
      setCurrentIndex(index => index + 1);
      setStage('pass');
    }
  };

  const finishVote = (nextVotes: Record<string, string>) => {
    const eligibleTargets = voteCandidates
      ? alivePlayers.filter(player => voteCandidates.includes(player.id))
      : alivePlayers;
    const totals = eligibleTargets.map(player => ({
      id: player.id,
      name: player.name,
      total: Object.values(nextVotes).filter(vote => vote === player.id).length
    })).sort((a, b) => b.total - a.total);
    const topScore = totals[0]?.total || 0;
    const tiedLeaders = totals.filter(item => item.total === topScore);
    if (tiedLeaders.length > 1) {
      setVoteOutcome({
        tied: true,
        tiedIds: tiedLeaders.map(item => item.id),
        counts: totals
      });
      setVotes({});
      setVoteCandidates(tiedLeaders.map(item => item.id));
      setStage('vote-result');
      return;
    }
    const eliminated = alivePlayers.find(player => player.id === tiedLeaders[0]?.id) || alivePlayers[0];
    if (!eliminated) return;
    const nextPlayers = keepWhiteAwayFromFirstTurn(players.map(player => player.id === eliminated.id ? { ...player, eliminated: true } : player));
    const nextAlive = nextPlayers.filter(player => !player.eliminated);
    const nextWinner = checkWinner(nextAlive);
    setPlayers(nextPlayers);
    setVoteOutcome({
      eliminatedId: eliminated.id,
      eliminatedName: eliminated.name,
      eliminatedRole: eliminated.role,
      tied: false,
      counts: totals
    });
    setWinner(nextWinner);
    setVoteCandidates(null);
    setStage(nextWinner ? 'result' : 'vote-result');
  };

  const submitVote = (targetId: string) => {
    if (!currentVoter) return;
    const nextVotes = { ...votes, [currentVoter.id]: targetId };
    setVotes(nextVotes);
    if (Object.keys(nextVotes).length >= alivePlayers.length) finishVote(nextVotes);
  };

  const nextRound = () => {
    setRound(value => value + 1);
    setVotes({});
    setVoteOutcome(null);
    setVoteCandidates(null);
    setCurrentIndex(0);
    setRevealed(false);
    setClueInput('');
    setStage('pass');
  };

  const resetGame = () => {
    setPlayers([]);
    setPair(null);
    setRound(1);
    setCurrentIndex(0);
    setRevealed(false);
    setClueInput('');
    setClues([]);
    setVotes({});
    setVoteOutcome(null);
    setWinner(null);
    setClueSecondsLeft(15);
    setVoteCandidates(null);
    setStage('setup');
  };

  useEffect(() => {
    if (!revealed || stage !== 'pass') return undefined;
    const intervalId = window.setInterval(() => {
      setClueSecondsLeft(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [revealed, stage, currentPlayer?.id, round]);

  if (stage === 'setup') {
    return (
      <section className="space-y-5">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0B1020] shadow-2xl">
          <div className="relative min-h-[250px]">
            <span className="absolute inset-0 bg-[#080B16]" />
            <span className="absolute inset-0 bg-cover bg-center opacity-90" style={{ backgroundImage: `url('${CARD_IMAGE}')` }} />
            <span className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-[#0B1020]/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h2 className="mt-3 text-2xl font-black text-white">Agent caché</h2>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/65">Choisissez les joueurs, découvrez chacun votre mot, annoncez un indice à voix haute puis votez pour le joueur le plus suspect.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <span>
                <strong className="block text-sm text-white">Joueurs</strong>
                <span className="mt-1 block text-[10px] text-white/45">3 à 12 joueurs. Appuyez pour cocher ou décocher.</span>
              </span>
              <span className="rounded-full bg-[#6C5CFF]/15 px-3 py-1 text-[10px] font-black text-[#C4BEFF]">{selectedIds.length}/12</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {playableMembers.map(member => {
                const selected = selectedIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => togglePlayer(member.id)}
                    className={`flex items-center gap-2 rounded-2xl border p-2 text-left transition-colors ${selected ? 'border-[#00D26A]/35 bg-[#00D26A]/10' : 'border-white/8 bg-white/5'}`}
                  >
                    {member.photoUrl ? <img src={member.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-[10px] font-black text-white">{getInitials(member.name)}</span>}
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[11px] text-white">{member.name}</strong>
                      <span className="text-[9px] text-white/40">{selected ? 'Dans la partie' : 'Ajouter'}</span>
                    </span>
                    {selected && <Check className="h-4 w-4 text-[#00D26A]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-white/8 bg-white/5 p-4">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <strong className="block text-xs text-white">Déroulé</strong>
              <span className="mt-1 block text-[9px] leading-relaxed text-white/45">
                Un mot est donné à chaque joueur. Écrivez votre indice en 15 secondes, dites-le à voix haute, puis débattez avant le vote.
              </span>
            </div>
            <button type="button" onClick={startGame} disabled={selectedIds.length < 3} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF4D6D] py-4 text-sm font-black text-white disabled:opacity-40">
              <Sparkles className="h-4 w-4" /> Lancer l’attribution
            </button>
          </div>
        </div>
      </section>
    );
  }

  if ((stage === 'pass' || stage === 'card') && currentPlayer) {
    return (
      <section className="mx-auto max-w-lg space-y-4">
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-5 text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Tour {round} · indice {currentIndex + 1}/{alivePlayers.length}</span>
          <h2 className="mt-2 text-2xl font-black text-white">Passez à {currentPlayer.name}</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/50">La personne regarde son mot, écrit son indice, puis passe le téléphone.</p>
        </div>
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#10172A] p-4 shadow-2xl">
          <div className="relative min-h-[360px] overflow-hidden rounded-[24px]">
            <span className="absolute inset-0 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url('${CARD_IMAGE}')` }} />
            <span className="absolute inset-0 bg-gradient-to-t from-[#080B16] via-[#080B16]/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-left">
              {!revealed ? (
                <>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white backdrop-blur"><Eye className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-2xl font-black text-white">Carte masquée</h3>
                  <p className="mt-2 text-xs text-white/55">Appuyez seulement quand {currentPlayer.name} tient le téléphone.</p>
                </>
              ) : (
                <>
                  <span className="inline-flex rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/70 backdrop-blur">
                    Mot secret
                  </span>
                  <h3 className="mt-3 text-3xl font-black text-white">{currentPlayer.word || 'Aucun mot'}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    {currentPlayer.role === 'white'
                      ? 'Si vous pensez avoir trouvé le mot commun, écrivez-le. Sinon, bluffez avec un indice crédible.'
                      : 'Vous ne savez pas si votre mot est celui de la majorité ou celui d’un agent caché.'}
                  </p>
                  <p className="mt-3 inline-flex rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-black text-white/75 backdrop-blur">
                    {clueSecondsLeft}s pour écrire et dire l’indice à voix haute
                  </p>
                </>
              )}
            </div>
          </div>
          {!revealed ? (
            <button type="button" onClick={() => {
              setClueSecondsLeft(15);
              setRevealed(true);
            }} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-4 text-sm font-black text-white">
              Afficher mon mot
            </button>
          ) : (
            <div className="mt-4 space-y-2">
              <input
                value={clueInput}
                onChange={event => setClueInput(event.target.value)}
                maxLength={36}
                placeholder={currentPlayer.role === 'white' ? 'Mot commun ou indice public' : 'Votre indice public'}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/30"
              />
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-[#FFB020] transition-all duration-300"
                  style={{ width: `${Math.max(0, clueSecondsLeft / 15) * 100}%` }}
                />
              </div>
              <button type="button" onClick={saveClueAndContinue} disabled={!clueInput.trim()} className="w-full rounded-2xl bg-[#FFB020] py-4 text-sm font-black text-[#07111F] disabled:opacity-40">
                Valider l’indice et masquer
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (stage === 'clues') {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020]">Indices publics · tour {round}</span>
          <h2 className="mt-2 text-2xl font-black text-white">Comparez les indices</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">Les indices des tours précédents restent visibles. Discutez, défendez-vous, puis votez pour éliminer un suspect.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleClues.map(clue => (
            <div key={`${clue.round}-${clue.playerId}`} className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <strong className="block text-xs text-white">{clue.playerName}</strong>
              <span className="text-[9px] font-black uppercase tracking-wider text-white/35">Tour {clue.round}</span>
              <span className="mt-1 block text-sm font-black text-[#FFB020]">{clue.text}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => {
          setVotes({});
          setStage('vote');
        }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF4D6D] py-4 text-sm font-black text-white">
          <Vote className="h-4 w-4" /> Passer au vote
        </button>
      </section>
    );
  }

  if (stage === 'vote') {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4D6D]">{voteCandidates ? 'Nouveau vote' : 'Vote'} · tour {round}</span>
          <h2 className="mt-2 text-2xl font-black text-white">{currentVoter ? `${currentVoter.name} vote` : 'Calcul du vote...'}</h2>
          <p className="mt-2 text-xs text-white/55">{voteCandidates ? 'Il y a eu égalité. Votez uniquement entre les joueurs concernés.' : 'Votez pour éliminer un suspect. La partie continue si aucune condition de victoire n’est atteinte.'}</p>
        </div>
        {currentVoter && (
          <div className="grid gap-2 sm:grid-cols-2">
            {voteTargets.filter(player => player.id !== currentVoter.id).map(player => (
              <button key={player.id} type="button" onClick={() => submitVote(player.id)} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-xs font-black text-white">{getInitials(player.name)}</span>
                <span><strong className="block text-xs text-white">{player.name}</strong><span className="text-[9px] text-white/40">Désigner</span></span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (stage === 'vote-result' && voteOutcome) {
    if (voteOutcome.tied) {
      return (
        <section className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-[28px] border border-[#FFB020]/25 bg-[#FFB020]/10 p-5 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020]">Égalité</span>
            <h2 className="mt-2 text-2xl font-black text-white">Personne ne sort pour l’instant</h2>
            <p className="mt-2 text-xs text-white/60">Les joueurs à égalité restent en danger. Relancez un vote entre eux.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {voteOutcome.counts.map(item => (
              <div key={item.id} className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <strong className="block text-xs text-white">{item.name}</strong>
                <span className="text-[9px] text-white/45">{item.total} vote{item.total > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setStage('vote')} className="w-full rounded-2xl bg-[#FF4D6D] py-4 text-sm font-black text-white">
            Nouveau vote
          </button>
        </section>
      );
    }

    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[28px] border border-[#FFB020]/25 bg-[#FFB020]/10 p-5 text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020]">Élimination</span>
          <h2 className="mt-2 text-2xl font-black text-white">{voteOutcome.eliminatedName} quitte la partie</h2>
          <p className="mt-2 text-xs text-white/60">
            Rôle révélé : <strong className="text-white">{voteOutcome.eliminatedRole ? ROLE_LABELS[voteOutcome.eliminatedRole] : 'Inconnu'}</strong>
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {voteOutcome.counts.map(item => (
            <div key={item.id} className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <strong className="block text-xs text-white">{item.name}</strong>
              <span className="text-[9px] text-white/45">{item.total} vote{item.total > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={nextRound} className="w-full rounded-2xl bg-[#6C5CFF] py-4 text-sm font-black text-white">
          Tour d’indices suivant
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#10172A] p-5 text-center shadow-2xl">
        <span className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: `url('${CARD_IMAGE}')` }} />
        <span className="absolute inset-0 bg-[#080B16]/70" />
        <div className="relative">
          <TrophyIcon winner={winner} />
          <h2 className="mt-3 text-2xl font-black text-white">
            {winner === 'citizens' ? 'Les citoyens gagnent !' : winner === 'white' ? 'L’Agent blanc gagne !' : 'Les agents cachés gagnent !'}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/70">
            {getVictoryExplanation(winner, pair)}
          </p>
          {voteOutcome && (
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              {voteOutcome.eliminatedName && voteOutcome.eliminatedRole
                ? `Dernier éliminé : ${voteOutcome.eliminatedName}, ${ROLE_LABELS[voteOutcome.eliminatedRole]}.`
                : 'La partie s’est terminée avant une nouvelle élimination.'}
            </p>
          )}
        </div>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {players.map(player => <RoleRevealCard key={player.id} player={player} />)}
        </div>
        {pair && (
          <p className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-3 text-center text-xs font-bold text-white/65">
            Mot citoyen : <span className="text-[#00D26A]">{pair.publicWord}</span> · Mot agent caché : <span className="text-[#FF4D6D]">{pair.undercoverWord}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={resetGame} className="flex items-center justify-center gap-2 rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white"><RotateCcw className="h-4 w-4" /> Nouvelle partie</button>
        <button type="button" onClick={() => setStage('setup')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-black text-white/65"><ArrowLeft className="h-4 w-4" /> Réglages</button>
      </div>
    </section>
  );
}

function TrophyIcon({ winner }: { winner: ReturnType<typeof checkWinner> }) {
  if (winner === 'white') return <UserRound className="mx-auto h-12 w-12 text-[#FFB020]" />;
  if (winner === 'citizens') return <Users className="mx-auto h-12 w-12 text-[#00D26A]" />;
  return <Shield className="mx-auto h-12 w-12 text-[#FF4D6D]" />;
}

function RoleRevealCard({ player }: { player: Player }) {
  return (
    <div className={`overflow-hidden rounded-2xl border ${roleBorderClass(player.role)}`}>
      <div className="flex gap-3 p-3">
        <span
          className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url('${CARD_IMAGE}')`,
            backgroundPosition: roleImagePosition(player.role),
            backgroundSize: '200% auto'
          }}
        />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-xs text-white">{player.name}{player.eliminated ? ' · éliminé' : ''}</strong>
          <span className="mt-1 inline-flex rounded-full bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/70">
            {ROLE_LABELS[player.role]}
          </span>
          <span className="mt-2 block text-[10px] text-white/45">{player.word || 'Aucun mot'}</span>
        </span>
      </div>
    </div>
  );
}
