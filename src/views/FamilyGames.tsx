import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Brain,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Gamepad2,
  Gift,
  Grid3X3,
  History,
  Lock,
  LogOut,
  Mic2,
  Moon,
  Radio,
  RotateCcw,
  Ship,
  Sparkles,
  Star,
  Trophy,
  Users,
  Vote,
  X
} from 'lucide-react';
import type { FamilyEvent, FamilyVote, MalusSettings, Member, MemoryLog, PocketMoneyChild } from '../types';
import { getSupabaseClient } from '../utils/supabase';
import { MimeChallengeGame } from '../components/games/MimeChallengeGame';
import { PrivateFamilyRoom } from '../components/games/PrivateFamilyRoom';
import {
  FamilyChallengeGame,
  type FamilyChallengeRecap
} from '../components/games/FamilyChallengeGame';
import { BattleshipGame } from '../components/games/BattleshipGame';
import {
  familyGameService,
  type FamilyGameResult,
  type FamilyGameRoom,
  type FamilyGameType
} from '../services/familyGameService';
import { FAMILY_CHALLENGE_QUESTIONS } from '../data/familyChallengeQuestions';

type GameId = FamilyGameType | 'village-secret';
type MemoryCard = {
  id: string;
  pairId: string;
  label: string;
  image?: string;
  emoji?: string;
};
type ConnectCell = 0 | 1 | 2;
type GameFilter = 'all' | 'free' | 'premium' | 'quick' | 'team' | 'kids';
type MemoryMode = 'individual' | 'teams';
type MemorySource = 'family' | 'memories';
type BotDifficulty = 'easy' | 'normal' | 'hard';
type ConnectMode = 'local' | 'bot' | 'private';
type ChallengeMode = 'local' | 'private';
type TeamSettings = { names: [string, string]; colors: [string, string] };
type PendingGameReward = {
  id: string;
  memberId: string;
  memberName: string;
  points: number;
  gameType: FamilyGameType;
  createdAt: string;
};
type TournamentState = {
  active: boolean;
  games: FamilyGameType[];
  currentIndex: number;
  playerNames: [string, string];
  scores: [number, number];
};
type GameResumeSnapshot = {
  activeGame: GameId;
  updatedAt?: string;
  memory?: {
    started?: boolean;
    pairCount?: 6 | 8 | 12;
    mode?: MemoryMode;
    source?: MemorySource;
    round?: number;
    playerIds?: string[];
    scores?: number[];
    currentPlayer?: number;
    matchedPairs?: string[];
    moves?: number;
  };
  connect4?: {
    board?: ConnectCell[][];
    currentPlayer?: 1 | 2;
    winner?: ConnectCell;
    draw?: boolean;
    vsBot?: boolean;
  };
};
const BOT_DIFFICULTIES: Array<[BotDifficulty, string]> = [
  ['easy', 'Facile'],
  ['normal', 'Normal'],
  ['hard', 'Difficile']
];
const GAME_LABELS: Record<FamilyGameType, string> = {
  memory: 'Memory famille',
  connect4: 'Puissance 4',
  battleship: 'Bataille navale',
  'family-challenge': 'Défi famille',
  'mime-challenge': 'Mimes et défis'
};
const GAME_COVER_POSITIONS: Record<GameId, string> = {
  memory: '0% 0%',
  connect4: '50% 0%',
  battleship: '100% 0%',
  'family-challenge': '0% 100%',
  'mime-challenge': '50% 100%',
  'village-secret': '100% 100%'
};

const VillageSecretGame = lazy(async () => {
  const module = await import('../components/games/VillageSecretGame');
  return { default: module.VillageSecretGame };
});

interface FamilyGamesProps {
  members: Member[];
  activeMemberId: string;
  foyerId?: string;
  familyName?: string;
  isPremium?: boolean;
  onBack: () => void;
  onTriggerPaywall?: () => void;
  pocketMoney?: PocketMoneyChild[];
  setPocketMoney?: React.Dispatch<React.SetStateAction<PocketMoneyChild[]>>;
  memories?: MemoryLog[];
  setVotes?: React.Dispatch<React.SetStateAction<FamilyVote[]>>;
  onAddEventDirect?: (newEvent: FamilyEvent) => void;
  onSendNotification?: (title: string, description: string, moduleName?: string, type?: 'info' | 'warning' | 'error' | 'success') => Promise<void>;
  rewardSettings?: MalusSettings;
}

const FALLBACK_MEMORY_ITEMS = [
  { label: 'Vacances', emoji: '🏖️' },
  { label: 'Maison', emoji: '🏠' },
  { label: 'Fête', emoji: '🎉' },
  { label: 'Repas', emoji: '🍕' },
  { label: 'Musique', emoji: '🎵' },
  { label: 'Étoile', emoji: '⭐' }
  ,{ label: 'Cinéma', emoji: '🎬' }
  ,{ label: 'Voyage', emoji: '🧳' }
  ,{ label: 'Anniversaire', emoji: '🎂' }
  ,{ label: 'Lecture', emoji: '📚' }
  ,{ label: 'Sport', emoji: '⚽' }
  ,{ label: 'Nature', emoji: '🌿' }
];

const seededOrder = (value: string, round: number): number => {
  const hash = [...value].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 17), round * 131);
  const x = Math.sin(hash * 999) * 10000;
  return x - Math.floor(x);
};

const toLocalDateTimeValue = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildMemoryDeck = (
  members: Member[],
  memories: MemoryLog[],
  source: MemorySource,
  round: number,
  pairCount: number
): MemoryCard[] => {
  const memberItems: Array<{ label: string; image?: string; emoji?: string }> = members
    .filter(member => member.name)
    .slice(0, pairCount)
    .map(member => ({
      label: member.name,
      image: member.photoUrl,
      emoji: '🙂'
    }));
  const memoryItems: Array<{ label: string; image?: string; emoji?: string }> = memories
    .filter(memory => memory.title && (memory.imageUrl || memory.imageUrls?.[0]))
    .slice(0, pairCount)
    .map(memory => ({
      label: memory.title,
      image: memory.imageUrl || memory.imageUrls?.[0],
      emoji: '📸'
    }));
  const items: Array<{ label: string; image?: string; emoji?: string }> =
    source === 'memories' && memoryItems.length > 0 ? [...memoryItems] : [...memberItems];
  for (const fallback of FALLBACK_MEMORY_ITEMS) {
    if (items.length >= pairCount) break;
    items.push(fallback);
  }
  return items.slice(0, pairCount)
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

const getAvailableColumns = (board: ConnectCell[][]): number[] =>
  board[0].map((cell, column) => cell === 0 ? column : -1).filter(column => column >= 0);

const simulateConnectMove = (board: ConnectCell[][], column: number, player: 1 | 2): ConnectCell[][] => {
  const next = board.map(row => [...row]);
  const targetRow = [...next].map((_, index) => index).reverse().find(row => next[row][column] === 0);
  if (targetRow !== undefined) next[targetRow][column] = player;
  return next;
};

const scoreConnectBoard = (board: ConnectCell[][]): number => {
  const winner = getConnectWinner(board);
  if (winner === 2) return 10000;
  if (winner === 1) return -10000;
  return board.flatMap(row => row).reduce<number>((score, cell, index) => {
    const column = index % 7;
    return score + (cell === 2 ? 4 - Math.abs(3 - column) : cell === 1 ? -(4 - Math.abs(3 - column)) : 0);
  }, 0);
};

const minimaxConnect = (board: ConnectCell[][], depth: number, maximizing: boolean): number => {
  const available = getAvailableColumns(board);
  if (depth === 0 || getConnectWinner(board) || available.length === 0) return scoreConnectBoard(board);
  const scores = available.map(column => minimaxConnect(simulateConnectMove(board, column, maximizing ? 2 : 1), depth - 1, !maximizing));
  return maximizing ? Math.max(...scores) : Math.min(...scores);
};

export function FamilyGames({
  members,
  activeMemberId,
  foyerId = 'local',
  familyName = 'Ma famille',
  isPremium = false,
  onBack,
  onTriggerPaywall,
  pocketMoney = [],
  setPocketMoney,
  memories = [],
  setVotes,
  onAddEventDirect,
  onSendNotification,
  rewardSettings
}: FamilyGamesProps) {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [gameFilter, setGameFilter] = useState<GameFilter>('all');
  const [showProgression, setShowProgression] = useState(false);
  const [resumeSnapshot, setResumeSnapshot] = useState<GameResumeSnapshot | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mf_games_resume_${foyerId}`) || 'null');
    } catch {
      return null;
    }
  });
  const [lastGameId, setLastGameId] = useState<GameId | null>(() => {
    const saved = localStorage.getItem(`mf_games_last_${foyerId}`);
    return saved as GameId | null;
  });
  const [playerIds, setPlayerIds] = useState<[string, string]>(() => {
    const first = members.find(member => member.id === activeMemberId)?.id || members[0]?.id || 'player-1';
    const second = members.find(member => member.id !== first)?.id || 'player-2';
    return [first, second];
  });
  const [results, setResults] = useState<FamilyGameResult[]>([]);
  const [activeRoom, setActiveRoom] = useState<FamilyGameRoom | null>(null);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showVillageCloseConfirm, setShowVillageCloseConfirm] = useState(false);
  const [lastRecap, setLastRecap] = useState<FamilyChallengeRecap | null>(null);
  const [memoryRound, setMemoryRound] = useState(1);
  const [memoryPairCount, setMemoryPairCount] = useState<6 | 8 | 12>(6);
  const [memoryMode, setMemoryMode] = useState<MemoryMode>('individual');
  const [memorySource, setMemorySource] = useState<MemorySource>('family');
  const [memoryPlayerIds, setMemoryPlayerIds] = useState<string[]>(() => members.slice(0, Math.min(2, members.length)).map(member => member.id));
  const [memoryStarted, setMemoryStarted] = useState(false);
  const [memoryCurrentPlayer, setMemoryCurrentPlayer] = useState(0);
  const [memoryScores, setMemoryScores] = useState<number[]>([]);
  const memoryDeck = useMemo(
    () => buildMemoryDeck(members, memories, memorySource, memoryRound, memoryPairCount),
    [members, memories, memoryPairCount, memoryRound, memorySource]
  );
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memorySaved, setMemorySaved] = useState(false);
  const dailyChallengeKey = `mf_games_daily_${foyerId}_${new Date().toISOString().slice(0, 10)}`;
  const [dailyChallengeComplete, setDailyChallengeComplete] = useState(() =>
    localStorage.getItem(dailyChallengeKey) === '1'
  );
  const [gameNightDate, setGameNightDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(19, 0, 0, 0);
    return toLocalDateTimeValue(date);
  });
  const [connectionMessage, setConnectionMessage] = useState('');
  const [rewardsEnabled, setRewardsEnabled] = useState(() =>
    rewardSettings?.rewards_enabled !== false
      && localStorage.getItem(`mf_games_rewards_enabled_${foyerId}`) === 'true'
  );
  const [pendingRewards, setPendingRewards] = useState<PendingGameReward[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mf_games_pending_rewards_${foyerId}`) || '[]');
    } catch {
      return [];
    }
  });
  const [showTournamentSetup, setShowTournamentSetup] = useState(false);
  const gameRewardPoints = Math.max(1, rewardSettings?.reward_game_points || 5);
  const rewardDailyCap = Math.max(gameRewardPoints, rewardSettings?.reward_daily_cap || 50);
  const gameRewardsAllowed = rewardSettings?.rewards_enabled !== false
    && rewardSettings?.reward_sources?.games !== false;
  const rewardLedgerKey = `mf_games_reward_ledger_${foyerId}_${new Date().toISOString().slice(0, 10)}`;
  const readAwardedPoints = useCallback(() => {
    const value = Number(localStorage.getItem(rewardLedgerKey) || 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [rewardLedgerKey]);
  const recordAwardedPoints = useCallback((points: number) => {
    localStorage.setItem(rewardLedgerKey, String(readAwardedPoints() + points));
  }, [readAwardedPoints, rewardLedgerKey]);
  const [tournamentGames, setTournamentGames] = useState<FamilyGameType[]>(['memory', 'connect4', 'battleship']);
  const [tournament, setTournament] = useState<TournamentState | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mf_games_tournament_${foyerId}`) || 'null');
    } catch {
      return null;
    }
  });

  const players = useMemo(() => {
    const active = members.find(member => member.id === playerIds[0]);
    const second = members.find(member => member.id === playerIds[1]);
    return [
      active || members[0] || { id: 'player-1', name: 'Équipe Soleil', role: 'Famille', photoUrl: '' },
      second || members.find(member => member.id !== active?.id) || { id: 'player-2', name: 'Équipe Comète', role: 'Famille', photoUrl: '' }
    ];
  }, [members, playerIds]);
  const activeMember = useMemo(
    () => members.find(member => member.id === activeMemberId),
    [activeMemberId, members]
  );
  const privatePlayerName = activeMember?.name
    ? `${familyName} · ${activeMember.name}`
    : familyName;
  const isAdult = useMemo(() => {
    const role = (activeMember?.role || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ['chef', 'parent', 'gestionnaire', 'adulte', 'admin'].some(value => role.includes(value));
  }, [activeMember?.role]);

  const [board, setBoard] = useState<ConnectCell[][]>(() => emptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [connectWinner, setConnectWinner] = useState<ConnectCell>(0);
  const [connectDraw, setConnectDraw] = useState(false);
  const [connectVsBot, setConnectVsBot] = useState(false);
  const [connectMode, setConnectMode] = useState<ConnectMode>('local');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectPrivateBusy, setConnectPrivateBusy] = useState(false);
  const [connectPrivateMessage, setConnectPrivateMessage] = useState('');
  const reportedPrivateConnectResultRef = useRef<string | null>(null);
  const [lastDroppedCell, setLastDroppedCell] = useState<{ row: number; column: number; nonce: number } | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('normal');
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mf_games_teams_${foyerId}`) || 'null');
      if (saved?.names?.length === 2 && saved?.colors?.length === 2) return saved;
    } catch {
      // Keep the defaults.
    }
    return { names: ['Équipe Soleil', 'Équipe Comète'], colors: ['#FFB020', '#6C5CFF'] };
  });
  const [challengeTeamMemberIds, setChallengeTeamMemberIds] = useState<[string[], string[]]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mf_games_challenge_members_${foyerId}`) || 'null');
      if (Array.isArray(saved) && Array.isArray(saved[0]) && Array.isArray(saved[1])) return [saved[0], saved[1]];
    } catch {
      // Keep the balanced default.
    }
    return [
      members.filter((_, index) => index % 2 === 0).map(member => member.id),
      members.filter((_, index) => index % 2 === 1).map(member => member.id)
    ];
  });
  const [connectScores, setConnectScores] = useState<[number, number]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mf_games_connect4_${foyerId}`) || '[0,0]');
      return Array.isArray(saved) && saved.length === 2 ? [Number(saved[0]) || 0, Number(saved[1]) || 0] : [0, 0];
    } catch {
      return [0, 0];
    }
  });

  const challengeQuestionCount = isPremium ? FAMILY_CHALLENGE_QUESTIONS.length : 12;
  const connectRoom = activeRoom?.gameType === 'connect4' ? activeRoom : null;
  const challengeRoom = activeRoom?.gameType === 'family-challenge' ? activeRoom : null;
  const challengeTeams = useMemo(() => {
    const sharedMembers = Array.isArray(challengeRoom?.state.teamMembers)
      ? challengeRoom.state.teamMembers as string[][]
      : [];
    const sharedCaptains = Array.isArray(challengeRoom?.state.teamCaptains)
      ? challengeRoom.state.teamCaptains as string[]
      : [];
    if (challengeRoom) {
      return [
        {
          id: challengeRoom.hostFoyerId,
          name: challengeRoom.hostName,
          photoUrl: '',
          members: sharedMembers[0] || [challengeRoom.hostName],
          captain: sharedCaptains[0] || challengeRoom.hostName
        },
        {
          id: challengeRoom.guestFoyerId || 'guest-family',
          name: challengeRoom.guestName || 'Famille invitée',
          photoUrl: '',
          members: sharedMembers[1] || [challengeRoom.guestName || 'Famille invitée'],
          captain: sharedCaptains[1] || challengeRoom.guestName || 'Famille invitée'
        }
      ];
    }
    return [
      {
        id: 'team-1',
        name: teamSettings.names[0],
        photoUrl: '',
        members: challengeTeamMemberIds[0].map(id => members.find(member => member.id === id)?.name).filter((name): name is string => Boolean(name)),
        captain: members.find(member => member.id === challengeTeamMemberIds[0][0])?.name
      },
      {
        id: 'team-2',
        name: teamSettings.names[1],
        photoUrl: '',
        members: challengeTeamMemberIds[1].map(id => members.find(member => member.id === id)?.name).filter((name): name is string => Boolean(name)),
        captain: members.find(member => member.id === challengeTeamMemberIds[1][0])?.name
      }
    ];
  }, [challengeRoom, challengeTeamMemberIds, members, teamSettings.names]);
  const gameStats = useMemo(() => {
    const wins = new Map<string, number>();
    results.forEach(result => {
      if (result.winnerName && result.winnerName !== 'Égalité') {
        wins.set(result.winnerName, (wins.get(result.winnerName) || 0) + 1);
      }
    });
    const leader = [...wins.entries()].sort((left, right) => right[1] - left[1])[0];
    const challengeGames = results.filter(result => result.gameType === 'family-challenge');
    return {
      total: results.length,
      challengeGames: challengeGames.length,
      leaderName: leader?.[0],
      leaderWins: leader?.[1] || 0,
      bestChallengeScore: Math.max(0, ...challengeGames.flatMap(result => result.scores)),
      streak: results.reduce((best, result, index, list) => {
        if (!result.winnerName || result.winnerName === 'Égalité') return best;
        let count = 1;
        while (list[index + count]?.winnerName === result.winnerName) count += 1;
        return Math.max(best, count);
      }, 0)
    };
  }, [results]);
  const memoryPlayers = useMemo(() => memoryPlayerIds.map(id => members.find(member => member.id === id)).filter((member): member is Member => Boolean(member)), [members, memoryPlayerIds]);
  const memoryCompetitorNames = useMemo(() => {
    if (memoryMode === 'teams') return teamSettings.names;
    return memoryPlayers.map(member => member.name);
  }, [memoryMode, memoryPlayers, teamSettings.names]);

  useEffect(() => {
    localStorage.setItem(`mf_games_teams_${foyerId}`, JSON.stringify(teamSettings));
  }, [foyerId, teamSettings]);

  useEffect(() => {
    localStorage.setItem(`mf_games_challenge_members_${foyerId}`, JSON.stringify(challengeTeamMemberIds));
  }, [challengeTeamMemberIds, foyerId]);

  useEffect(() => {
    localStorage.setItem(`mf_games_rewards_enabled_${foyerId}`, String(rewardsEnabled));
  }, [foyerId, rewardsEnabled]);

  useEffect(() => {
    localStorage.setItem(`mf_games_pending_rewards_${foyerId}`, JSON.stringify(pendingRewards));
  }, [foyerId, pendingRewards]);

  useEffect(() => {
    if (tournament) localStorage.setItem(`mf_games_tournament_${foyerId}`, JSON.stringify(tournament));
    else localStorage.removeItem(`mf_games_tournament_${foyerId}`);
  }, [foyerId, tournament]);

  useEffect(() => {
    void familyGameService.getCurrentUserId().then(setCurrentUserId);
    void familyGameService.fetchResults(foyerId).then(setResults);
    if (isPremium) {
      void familyGameService.fetchActiveRoom(foyerId).then(room => {
        if (room && (room.status === 'waiting' || room.status === 'active')) {
          const resume = room.status === 'active'
            ? familyGameService.refreshRoom(room.id, foyerId).catch(() => room)
            : Promise.resolve(room);
          void resume.then(nextRoom => {
            setActiveRoom(nextRoom);
            if (nextRoom.gameType === 'family-challenge') setChallengeMode('private');
            if (nextRoom.gameType === 'connect4') setConnectMode('private');
            setActiveGame(nextRoom.gameType);
          });
        }
      });
    }
  }, [foyerId, isPremium]);

  useEffect(() => {
    if (!connectRoom?.id) return;
    const channel = familyGameService.subscribeToRoom(connectRoom.id, setActiveRoom);
    return () => {
      void familyGameService.unsubscribe(channel);
    };
  }, [connectRoom?.id]);

  useEffect(() => {
    if (connectRoom?.status === 'active') {
      reportedPrivateConnectResultRef.current = null;
    }
  }, [connectRoom?.status, connectRoom?.state.matchNumber]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mf_games_resume_${foyerId}`) || 'null') as GameResumeSnapshot | null;
      queueMicrotask(() => setResumeSnapshot(saved?.activeGame ? saved : null));
    } catch {
      // A corrupted local resume must never block the games hub.
    }
  }, [foyerId]);

  useEffect(() => {
    if (!activeGame) return;
    const snapshot: GameResumeSnapshot = {
      activeGame,
      updatedAt: new Date().toISOString(),
      memory: {
        started: memoryStarted,
        pairCount: memoryPairCount,
        mode: memoryMode,
        source: memorySource,
        round: memoryRound,
        playerIds: memoryPlayerIds,
        scores: memoryScores,
        currentPlayer: memoryCurrentPlayer,
        matchedPairs,
        moves: memoryMoves
      },
      connect4: { board, currentPlayer, winner: connectWinner, draw: connectDraw, vsBot: connectVsBot }
    };
    localStorage.setItem(`mf_games_resume_${foyerId}`, JSON.stringify(snapshot));
  }, [activeGame, board, connectDraw, connectVsBot, connectWinner, currentPlayer, foyerId, matchedPairs, memoryCurrentPlayer, memoryMode, memoryMoves, memoryPairCount, memoryPlayerIds, memoryRound, memoryScores, memorySource, memoryStarted]);

  const openGame = useCallback((gameId: GameId) => {
    if (gameId === 'village-secret' && !isPremium) {
      onTriggerPaywall?.();
      return;
    }
    localStorage.setItem(`mf_games_last_${foyerId}`, gameId);
    setLastGameId(gameId);
    setActiveGame(gameId);
  }, [foyerId, isPremium, onTriggerPaywall]);

  const resumeSavedGame = useCallback(() => {
    const saved = resumeSnapshot;
    if (!saved?.activeGame) return;
    if (saved.activeGame === 'village-secret' && !isPremium) {
      onTriggerPaywall?.();
      return;
    }
    if (saved.memory) {
      setMemoryStarted(Boolean(saved.memory.started));
      setMemoryPairCount(saved.memory.pairCount || 6);
      setMemoryMode(saved.memory.mode || 'individual');
      setMemorySource(saved.memory.source || 'family');
      setMemoryRound(saved.memory.round || 1);
      setMemoryPlayerIds(saved.memory.playerIds || []);
      setMemoryScores(saved.memory.scores || []);
      setMemoryCurrentPlayer(saved.memory.currentPlayer || 0);
      setMatchedPairs(saved.memory.matchedPairs || []);
      setMemoryMoves(saved.memory.moves || 0);
    }
    if (saved.connect4) {
      setBoard(saved.connect4.board || emptyBoard());
      setCurrentPlayer(saved.connect4.currentPlayer || 1);
      setConnectWinner(saved.connect4.winner || 0);
      setConnectDraw(Boolean(saved.connect4.draw));
      setConnectVsBot(Boolean(saved.connect4.vsBot));
    }
    openGame(saved.activeGame);
  }, [isPremium, onTriggerPaywall, openGame, resumeSnapshot]);

  const returnToGamesHub = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mf_games_resume_${foyerId}`) || 'null') as GameResumeSnapshot | null;
      setResumeSnapshot(saved?.activeGame ? saved : null);
    } catch {
      setResumeSnapshot(null);
    }
    setActiveGame(null);
  }, [foyerId]);

  const saveResult = useCallback(async (
    gameType: FamilyGameType,
    scores: number[],
    winnerName?: string,
    metadata: Record<string, unknown> = {},
    resultPlayerNames: string[] = players.map(player => player.name)
  ) => {
    const localResult: FamilyGameResult = {
      id: crypto.randomUUID(),
      gameType,
      winnerName,
      playerNames: resultPlayerNames,
      scores,
      metadata,
      playedAt: new Date().toISOString()
    };
    setResults(previous => [localResult, ...previous].slice(0, 30));
    const saved = await familyGameService.saveResult(foyerId, {
      gameType,
      winnerName,
      playerNames: localResult.playerNames,
      scores,
      metadata
    });
    if (saved) {
      setResults(previous => [saved, ...previous.filter(result => result.id !== localResult.id)].slice(0, 30));
    }

    if (tournament?.active && tournament.games[tournament.currentIndex] === gameType) {
      const nextScores: [number, number] = [...tournament.scores];
      if (!winnerName || winnerName === 'Égalité') {
        nextScores[0] += 1;
        nextScores[1] += 1;
      } else {
        const winnerIndex = tournament.playerNames.findIndex(name => name === winnerName);
        if (winnerIndex >= 0) nextScores[winnerIndex] += 3;
      }
      const nextIndex = tournament.currentIndex + 1;
      const finished = nextIndex >= tournament.games.length;
      setTournament({ ...tournament, scores: nextScores, currentIndex: nextIndex, active: !finished });
      window.setTimeout(() => setActiveGame(finished ? null : tournament.games[nextIndex]), 700);
    }

    if (gameRewardsAllowed && rewardsEnabled && winnerName && winnerName !== 'Égalité' && setPocketMoney) {
      const winnerMember = members.find(member => member.name === winnerName);
      const winnerAccount = winnerMember ? pocketMoney.find(account => account.id === winnerMember.id) : undefined;
      if (winnerMember && winnerAccount) {
        const availableToday = Math.max(0, rewardDailyCap - readAwardedPoints());
        const points = Math.min(gameRewardPoints, availableToday);
        if (points <= 0) {
          setConnectionMessage(`Plafond quotidien de ${rewardDailyCap} points atteint.`);
          return;
        }
        const pendingReward: PendingGameReward = {
          id: `game-reward-${localResult.id}`,
          memberId: winnerMember.id,
          memberName: winnerMember.name,
          points,
          gameType,
          createdAt: localResult.playedAt
        };
        if (rewardSettings?.reward_parent_validation === false) {
          const nextPoints = (winnerAccount.points || 0) + points;
          setPocketMoney(previous => previous.map(account =>
            account.id === winnerAccount.id ? { ...account, points: nextPoints } : account
          ));
          recordAwardedPoints(points);
          const client = getSupabaseClient();
          if (client && foyerId !== 'local') {
            void client.from('pocket_money').update({ points: nextPoints }).eq('id', winnerAccount.id).eq('foyer_id', foyerId);
          }
          setConnectionMessage(`${points} points ajoutés automatiquement à ${winnerMember.name}.`);
        } else {
          setPendingRewards(previous => previous.some(reward => reward.id === pendingReward.id)
            ? previous
            : [pendingReward, ...previous].slice(0, 20));
          void onSendNotification?.(
            '🎁 Récompense de jeu à valider',
            `${winnerMember.name} a gagné une partie. Un parent peut valider les ${points} points depuis le module Jeux.`,
            'games',
            'info'
          );
        }
      }
    }
    void onSendNotification?.(
      '🎮 Partie terminée',
      winnerName && winnerName !== 'Égalité'
        ? `${winnerName} remporte la partie de ${gameType}.`
        : `La partie de ${gameType} se termine sur une égalité.`,
      'games',
      'success'
    );
  }, [foyerId, gameRewardPoints, gameRewardsAllowed, members, onSendNotification, players, pocketMoney, readAwardedPoints, recordAwardedPoints, rewardDailyCap, rewardSettings?.reward_parent_validation, rewardsEnabled, setPocketMoney, tournament]);

  const startTournament = () => {
    if (tournamentGames.length < 2) return;
    const nextTournament: TournamentState = {
      active: true,
      games: tournamentGames,
      currentIndex: 0,
      playerNames: [players[0].name, players[1].name],
      scores: [0, 0]
    };
    setTournament(nextTournament);
    setShowTournamentSetup(false);
    setActiveGame(tournamentGames[0]);
  };

  const approveReward = async (reward: PendingGameReward) => {
    if (!isAdult || !setPocketMoney) return;
    const winnerAccount = pocketMoney.find(account => account.id === reward.memberId);
    if (!winnerAccount) {
      setConnectionMessage('Aucune tirelire ne correspond à ce membre.');
      return;
    }
    const availableToday = Math.max(0, rewardDailyCap - readAwardedPoints());
    const awardedPoints = Math.min(reward.points, availableToday);
    if (awardedPoints <= 0) {
      setConnectionMessage(`Plafond quotidien de ${rewardDailyCap} points atteint.`);
      return;
    }
    const nextPoints = (winnerAccount.points || 0) + awardedPoints;
    setPocketMoney(previous => previous.map(account =>
      account.id === winnerAccount.id ? { ...account, points: nextPoints } : account
    ));
    setPendingRewards(previous => previous.filter(item => item.id !== reward.id));
    recordAwardedPoints(awardedPoints);
    const client = getSupabaseClient();
    if (client && foyerId !== 'local') {
      const { error } = await client.from('pocket_money')
        .update({ points: nextPoints })
        .eq('id', winnerAccount.id)
        .eq('foyer_id', foyerId);
      if (error) {
        console.warn('[FamilyGames] Pocket money reward not synced:', error.message);
        setConnectionMessage('Points ajoutés sur cet appareil, synchronisation cloud à réessayer.');
        return;
      }
    }
    setConnectionMessage(`${awardedPoints} points ajoutés à la tirelire de ${reward.memberName}.`);
    void onSendNotification?.(
      '✅ Récompense de jeu validée',
      `${reward.memberName} reçoit ${awardedPoints} points dans sa tirelire.`,
      'finances',
      'success'
    );
  };

  const rejectReward = (rewardId: string) => {
    if (!isAdult) return;
    setPendingRewards(previous => previous.filter(reward => reward.id !== rewardId));
    setConnectionMessage('La récompense a été refusée.');
  };

  const scheduleGameNight = () => {
    if (!onAddEventDirect || !gameNightDate) return;
    const date = new Date(gameNightDate);
    onAddEventDirect({
      id: `game-night-${Date.now()}`,
      title: 'Soirée jeux en famille',
      type: 'social',
      dateTime: gameNightDate,
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      description: 'Un moment en famille depuis la salle de jeux MyFamily+.',
      done: false
    });
    setConnectionMessage('La soirée jeux a été ajoutée à l’agenda.');
  };

  const createGameVote = async () => {
    if (!setVotes || !isAdult) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const vote: FamilyVote = {
      id: crypto.randomUUID(),
      question: 'À quel jeu jouons-nous lors de la prochaine soirée ?',
      options: [
        { text: 'Memory famille', votes: [] },
        { text: 'Puissance 4', votes: [] },
        { text: 'Mimes et défis', votes: [] },
        { text: 'Défi famille', votes: [] }
      ],
      authorName: activeMember?.name || 'Un parent',
      active: true,
      dueDate: dueDate.toLocaleDateString('fr-FR')
    };
    setVotes(previous => [vote, ...previous]);
    const client = getSupabaseClient();
    if (client && foyerId !== 'local') {
      const { error } = await client.from('votes').insert({
        id: vote.id,
        foyer_id: foyerId,
        question: vote.question,
        options: vote.options,
        author_name: vote.authorName,
        active: vote.active,
        due_date: vote.dueDate
      });
      if (error) console.warn('[FamilyGames] Game vote not synced:', error.message);
    }
    setConnectionMessage('Le vote est disponible dans le Conseil de famille.');
    void onSendNotification?.(
      '🗳️ Vote pour la prochaine soirée jeux',
      'La famille peut maintenant choisir son prochain jeu dans le Conseil de famille.',
      'conseil',
      'info'
    );
  };

  const handleRoomReady = useCallback((room: FamilyGameRoom) => {
    setChallengeMode('private');
    setActiveRoom(room.status === 'active' ? room : null);
  }, []);

  useEffect(() => {
    localStorage.setItem(`mf_games_connect4_${foyerId}`, JSON.stringify(connectScores));
  }, [connectScores, foyerId]);

  useEffect(() => {
    if (flippedCards.length !== 2) return;
    const [first, second] = flippedCards.map(id => memoryDeck.find(card => card.id === id));
    if (first && second && first.pairId === second.pairId) {
      queueMicrotask(() => {
        setMatchedPairs(previous => previous.includes(first.pairId) ? previous : [...previous, first.pairId]);
        setMemoryScores(previous => previous.map((score, index) => index === memoryCurrentPlayer ? score + 1 : score));
        setFlippedCards([]);
      });
      return;
    }
    const timer = window.setTimeout(() => {
      setFlippedCards([]);
      setMemoryCurrentPlayer(current => (current + 1) % Math.max(1, memoryScores.length));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [flippedCards, memoryCurrentPlayer, memoryDeck, memoryScores.length]);

  useEffect(() => {
    if (memoryPairCount !== 8 || matchedPairs.length !== 8 || memoryMoves > 20 || dailyChallengeComplete) return;
    localStorage.setItem(dailyChallengeKey, '1');
    queueMicrotask(() => setDailyChallengeComplete(true));
  }, [dailyChallengeComplete, dailyChallengeKey, matchedPairs.length, memoryMoves, memoryPairCount]);

  const resetMemory = () => {
    setMemoryRound(previous => previous + 1);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMemoryMoves(0);
    setMemorySaved(false);
    setMemoryCurrentPlayer(0);
    setMemoryScores(Array.from({ length: Math.max(1, memoryCompetitorNames.length) }, () => 0));
  };

  const startMemory = () => {
    const competitorCount = memoryMode === 'teams' ? 2 : memoryPlayers.length;
    if (competitorCount < 1) return;
    setMemoryStarted(true);
    setMemoryScores(Array.from({ length: competitorCount }, () => 0));
    resetMemory();
  };

  const flipMemoryCard = (card: MemoryCard) => {
    if (flippedCards.length >= 2 || flippedCards.includes(card.id) || matchedPairs.includes(card.pairId)) return;
    setFlippedCards(previous => [...previous, card.id]);
    setMemoryMoves(previous => previous + 1);
  };

  const dropConnectPiece = (column: number) => {
    if (connectWinner || connectDraw) return;
    const targetRow = [...board].map((_, index) => index).reverse().find(row => board[row][column] === 0);
    if (targetRow === undefined) return;
    const next = board.map(row => [...row]);
    next[targetRow][column] = currentPlayer;
    setLastDroppedCell({ row: targetRow, column, nonce: Date.now() });
    const winner = getConnectWinner(next);
    setBoard(next);
    if (winner) {
      navigator.vibrate?.([80, 40, 140]);
      setConnectWinner(winner);
      setConnectScores(previous => winner === 1 ? [previous[0] + 1, previous[1]] : [previous[0], previous[1] + 1]);
      const winnerName = connectVsBot && winner === 2 ? 'Ordinateur' : players[winner - 1].name;
      void saveResult('connect4', winner === 1 ? [1, 0] : [0, 1], winnerName);
    } else if (next.every(row => row.every(cell => cell !== 0))) {
      setConnectDraw(true);
      void saveResult('connect4', [0, 0], 'Égalité');
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  const resetConnectBoard = () => {
    setBoard(emptyBoard());
    setConnectWinner(0);
    setConnectDraw(false);
    setLastDroppedCell(null);
    setCurrentPlayer(previous => previous === 1 ? 2 : 1);
  };

  const privateConnectBoard = useMemo<ConnectCell[][]>(() => {
    const flat = Array.isArray(connectRoom?.state.board)
      ? connectRoom.state.board.map(value => value === 1 || value === 2 ? value : 0)
      : Array(42).fill(0);
    return Array.from({ length: 6 }, (_, row) => flat.slice(row * 7, row * 7 + 7) as ConnectCell[]);
  }, [connectRoom]);
  const privateConnectPlayer: 1 | 2 = connectRoom?.guestUserId === currentUserId ? 2 : 1;
  const privateConnectTurn: 1 | 2 = connectRoom?.state.turn === 2 ? 2 : 1;
  const privateConnectWinner = connectRoom?.state.winner === 1 || connectRoom?.state.winner === 2
    ? connectRoom.state.winner
    : 0;
  const privateConnectDraw = connectRoom?.state.draw === true;
  const privateConnectRematchRequested = privateConnectPlayer === 1
    ? connectRoom?.state.rematchHost === true
    : connectRoom?.state.rematchGuest === true;

  useEffect(() => {
    if (!connectRoom || connectRoom.status !== 'finished' || reportedPrivateConnectResultRef.current === connectRoom.id) return;
    const shouldSave = currentUserId === connectRoom.hostUserId
      || (connectRoom.guestFoyerId !== connectRoom.hostFoyerId && currentUserId === connectRoom.guestUserId);
    if (!shouldSave) return;
    reportedPrivateConnectResultRef.current = connectRoom.id;
    const winnerName = privateConnectDraw
      ? 'Égalité'
      : privateConnectWinner === 1 ? connectRoom.hostName : (connectRoom.guestName || 'Joueur invité');
    queueMicrotask(() => {
      void saveResult(
        'connect4',
        privateConnectWinner === 1 ? [1, 0] : privateConnectWinner === 2 ? [0, 1] : [0, 0],
        winnerName,
        { mode: 'private', roomId: connectRoom.id },
        [connectRoom.hostName, connectRoom.guestName || 'Joueur invité']
      );
    });
  }, [connectRoom, currentUserId, privateConnectDraw, privateConnectWinner, saveResult]);

  const playPrivateConnectColumn = async (column: number) => {
    if (!connectRoom || connectRoom.status !== 'active' || privateConnectTurn !== privateConnectPlayer || connectPrivateBusy) return;
    setConnectPrivateBusy(true);
    setConnectPrivateMessage('');
    try {
      setActiveRoom(await familyGameService.playConnect4Column(connectRoom.id, foyerId, column));
    } catch (error) {
      setConnectPrivateMessage(error instanceof Error ? error.message : 'Coup impossible.');
    } finally {
      setConnectPrivateBusy(false);
    }
  };

  const requestPrivateConnectRematch = async () => {
    if (!connectRoom || connectPrivateBusy) return;
    setConnectPrivateBusy(true);
    setConnectPrivateMessage('');
    try {
      const nextRoom = await familyGameService.requestConnect4Rematch(connectRoom.id, foyerId);
      setActiveRoom(nextRoom);
      if (nextRoom.status === 'active') reportedPrivateConnectResultRef.current = null;
      setConnectPrivateMessage(nextRoom.status === 'active'
        ? 'Revanche lancée.'
        : 'Demande envoyée. En attente de l’autre joueur.');
    } catch (error) {
      setConnectPrivateMessage(error instanceof Error ? error.message : 'Revanche impossible.');
    } finally {
      setConnectPrivateBusy(false);
    }
  };

  const closePrivateConnectRoom = async () => {
    if (!connectRoom || connectPrivateBusy) return;
    setConnectPrivateBusy(true);
    try {
      if (connectRoom.status !== 'finished') {
        await familyGameService.performRoomAction(
          connectRoom.id,
          foyerId,
          connectRoom.status === 'active' ? 'leave' : connectRoom.hostFoyerId === foyerId ? 'cancel' : 'leave'
        );
      }
      setActiveRoom(null);
      setConnectMode('local');
      setConnectPrivateMessage('');
    } catch (error) {
      setConnectPrivateMessage(error instanceof Error ? error.message : 'Impossible de quitter la salle.');
    } finally {
      setConnectPrivateBusy(false);
    }
  };

  const assignChallengeMember = (memberId: string, teamIndex: 0 | 1) => {
    setChallengeTeamMemberIds(previous => {
      const next: [string[], string[]] = [
        previous[0].filter(id => id !== memberId),
        previous[1].filter(id => id !== memberId)
      ];
      next[teamIndex].push(memberId);
      return next;
    });
  };

  useEffect(() => {
    if (!connectVsBot || currentPlayer !== 2 || connectWinner || connectDraw || activeGame !== 'connect4') return;
    const available = getAvailableColumns(board);
    if (available.length === 0) return;
    const timer = window.setTimeout(() => {
      let selectedColumn = available[Math.floor(Math.random() * available.length)];
      if (botDifficulty !== 'easy') {
        const winningColumn = available.find(column => getConnectWinner(simulateConnectMove(board, column, 2)) === 2);
        const blockingColumn = available.find(column => getConnectWinner(simulateConnectMove(board, column, 1)) === 1);
        selectedColumn = winningColumn ?? blockingColumn ?? selectedColumn;
      }
      if (botDifficulty === 'hard') {
        selectedColumn = available
          .map(column => ({ column, score: minimaxConnect(simulateConnectMove(board, column, 2), 4, false) }))
          .sort((left, right) => right.score - left.score)[0]?.column ?? selectedColumn;
      }
      dropConnectPiece(selectedColumn);
    }, 500);
    return () => window.clearTimeout(timer);
  // dropConnectPiece intentionally uses the latest render state for the delayed bot move.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame, board, botDifficulty, connectDraw, connectVsBot, connectWinner, currentPlayer]);

  const gameCards = [
    {
      id: 'memory' as const,
      title: 'Memory famille',
      description: 'Retrouvez les paires avec les visages et les souvenirs de votre foyer.',
      icon: Grid3X3,
      accent: '#FFB020',
      coverPosition: GAME_COVER_POSITIONS.memory,
      meta: '1 à 6 joueurs · 5 min',
      tags: ['free', 'quick', 'kids', 'team']
    },
    {
      id: 'connect4' as const,
      title: 'Puissance 4',
      description: 'Un duel rapide, tactile et parfait pour départager deux membres.',
      icon: Circle,
      accent: '#4F8CFF',
      coverPosition: GAME_COVER_POSITIONS.connect4,
      meta: '1 à 2 joueurs · 8 min',
      tags: ['free', 'quick', 'kids']
    },
    {
      id: 'battleship' as const,
      title: 'Bataille navale',
      description: 'Cachez votre flotte, visez juste et défiez un proche ou une autre famille.',
      icon: Ship,
      accent: '#00A8E8',
      coverPosition: GAME_COVER_POSITIONS.battleship,
      meta: '1 à 2 joueurs · 15 min',
      tags: ['free', 'team', 'kids']
    },
    {
      id: 'family-challenge' as const,
      title: 'Défi famille',
      description: 'Devinez les réponses les plus populaires et faites gagner votre équipe.',
      icon: Users,
      accent: '#FF4D6D',
      coverPosition: GAME_COVER_POSITIONS['family-challenge'],
      meta: `2 équipes · ${challengeQuestionCount} questions`,
      tags: ['premium', 'team']
    },
    {
      id: 'mime-challenge' as const,
      title: 'Mimes et défis',
      description: 'Mimez un maximum de cartes avant la fin du chronomètre.',
      icon: Mic2,
      accent: '#9E94FF',
      coverPosition: GAME_COVER_POSITIONS['mime-challenge'],
      meta: isPremium ? '2 équipes · 6 paquets' : '2 équipes · 8 cartes',
      tags: ['free', 'quick', 'team', 'kids']
    },
    {
      id: 'village-secret' as const,
      title: 'Village Secret',
      description: 'Rôles secrets, alliances, débats et votes guidés par un maître du jeu automatique.',
      icon: Moon,
      accent: '#C4BEFF',
      coverPosition: GAME_COVER_POSITIONS['village-secret'],
      meta: '5 à 20 joueurs · 25 min',
      tags: ['premium', 'team'],
      premiumOnly: true
    }
  ];
  const featuredGame = gameCards.find(game => game.id === 'village-secret')!;
  const visibleGameCards = gameCards.filter(game => game.id !== 'village-secret' && (gameFilter === 'all' || game.tags.includes(gameFilter)));
  const lastGame = gameCards.find(game => game.id === lastGameId);
  const LastGameIcon = lastGame?.icon || Gamepad2;

  const gameHeader = (title: string, subtitle: string, icon: typeof Gamepad2) => {
    const Icon = icon;
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={returnToGamesHub}
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
          <div className="flex flex-col gap-6">
            <div className="order-1 flex items-center justify-between gap-3">
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
                  <p className="text-xs sm:text-sm text-white/50 font-semibold mt-1">Choisissez, lancez et jouez ensemble.</p>
                </div>
              </div>
            </div>

            <div className="order-2 grid gap-3 sm:grid-cols-2">
              {resumeSnapshot?.activeGame && (
                <button type="button" onClick={resumeSavedGame} className="flex min-h-20 items-center justify-between gap-3 rounded-[22px] border border-[#00D26A]/25 bg-[#00D26A]/10 p-4 text-left transition-transform active:scale-[0.98]">
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00D26A]/15 text-[#00D26A]"><RotateCcw className="h-5 w-5" /></span>
                    <span>
                      <strong className="block text-sm text-white">Reprendre la partie</strong>
                      <span className="mt-1 block text-[10px] text-white/50">{gameCards.find(game => game.id === resumeSnapshot.activeGame)?.title || 'Partie en cours'}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#00D26A]" />
                </button>
              )}
              {lastGame && (
                <button type="button" onClick={() => openGame(lastGame.id)} className="flex min-h-20 items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-white/5 p-4 text-left transition-transform active:scale-[0.98]">
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/5" style={{ color: lastGame.accent }}><LastGameIcon className="h-5 w-5" /></span>
                    <span>
                      <strong className="block text-sm text-white">Dernier jeu joué</strong>
                      <span className="mt-1 block text-[10px] text-white/50">{lastGame.title}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-white/35" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => openGame('village-secret')}
              className="family-games-featured order-3 relative min-h-[280px] overflow-hidden rounded-[28px] border text-left shadow-2xl transition-transform active:scale-[0.99] sm:min-h-[330px]"
            >
              <span
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{
                  backgroundImage: "url('/game-assets/family-games-covers.webp')",
                  backgroundSize: '300% 200%',
                  backgroundPosition: featuredGame.coverPosition
                }}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[#080B16] via-[#080B16]/55 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4BEFF]/30 bg-[#11152B]/80 px-3 py-1 text-[9px] font-black uppercase text-[#D8D4FF] backdrop-blur-md">
                  <Sparkles className="h-3 w-3" /> Jeu vedette
                </span>
                <span className="mt-3 flex items-end justify-between gap-4">
                  <span>
                    <strong className="block text-2xl font-black text-white sm:text-3xl">Village Secret</strong>
                    <span className="mt-2 block max-w-xl text-xs leading-relaxed text-white/70 sm:text-sm">{featuredGame.description}</span>
                    <span className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black text-white/75">5 à 20 joueurs</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black text-white/75">Narrateur automatique</span>
                      <span className="rounded-full bg-[#FFB020]/15 px-3 py-1 text-[9px] font-black text-[#FFCB6B]">Premium</span>
                    </span>
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C4BEFF] text-[#090D1A]"><ChevronRight className="h-6 w-6" /></span>
                </span>
              </span>
            </button>

            <div className="order-3 flex gap-2 overflow-x-auto pb-1">
              {([
                ['all', 'Tous'],
                ['free', 'Gratuits'],
                ['premium', 'Premium'],
                ['quick', 'Rapides'],
                ['team', 'Équipes'],
                ['kids', 'Enfants']
              ] as Array<[GameFilter, string]>).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setGameFilter(value)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black ${gameFilter === value ? 'border-[#6C5CFF] bg-[#6C5CFF] text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="order-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {visibleGameCards.map(game => {
                const Icon = game.icon;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => openGame(game.id)}
                    className="family-game-cover-card group relative min-h-[210px] overflow-hidden rounded-[24px] border border-white/8 text-left shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98]"
                  >
                    <span
                      className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: "url('/game-assets/family-games-covers.webp')",
                        backgroundSize: '300% 200%',
                        backgroundPosition: game.coverPosition
                      }}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#090D1A] via-[#090D1A]/55 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-4">
                      <span className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/35 backdrop-blur-md" style={{ color: game.accent }}><Icon className="h-4.5 w-4.5" /></span>
                        <span className="text-right text-[8px] font-black uppercase text-white/60">{game.meta}</span>
                      </span>
                      <strong className="block text-base font-black text-white">{game.title}</strong>
                      <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-white/60">{game.description}</span>
                      {game.id === 'family-challenge' && !isPremium && <span className="mt-2 inline-flex rounded-full bg-[#FFB020]/18 px-2 py-1 text-[8px] font-black text-[#FFCB6B]">12 questions gratuites</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={() => setShowProgression(value => !value)} className="order-4 flex w-full items-center justify-between rounded-[22px] border border-white/8 bg-white/5 p-4 text-left">
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFB020]/12 text-[#FFB020]"><Trophy className="h-5 w-5" /></span>
                <span>
                  <strong className="block text-sm text-white">Progression et organisation</strong>
                  <span className="mt-1 block text-[10px] text-white/45">Tournoi, équipes, récompenses, soirée jeux et statistiques.</span>
                </span>
              </span>
              <ChevronRight className={`h-5 w-5 text-white/40 transition-transform ${showProgression ? 'rotate-90' : ''}`} />
            </button>

            {showProgression && (
              <div className="order-5 rounded-[24px] border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <span><strong className="block text-xs text-white">Parties privées</strong><span className="mt-1 block text-[9px] text-white/45">Défiez une famille connue avec un code.</span></span>
                  <span><strong className="block text-xs text-white">Packs complets</strong><span className="mt-1 block text-[9px] text-white/45">Questions, mimes et personnages supplémentaires.</span></span>
                  <span><strong className="block text-xs text-white">Progression Premium</strong><span className="mt-1 block text-[9px] text-white/45">Historique, trophées, records et statistiques.</span></span>
                </div>
              </div>
            )}

            {showProgression && <button type="button" onClick={() => {
              setMemoryPairCount(8);
              setMemoryStarted(false);
              openGame('memory');
            }} className={`order-5 w-full rounded-[22px] border p-4 text-left flex items-center justify-between gap-3 ${dailyChallengeComplete ? 'border-[#00D26A]/30 bg-[#00D26A]/12' : 'border-[#00D26A]/20 bg-[#00D26A]/8'}`}>
              <span>
                <strong className="block text-sm text-white">Défi du jour</strong>
                <span className="mt-1 block text-[10px] text-white/50">{dailyChallengeComplete ? 'Défi réussi aujourd’hui. Revenez demain pour un nouveau défi.' : 'Terminez un Memory de 8 paires en moins de 20 coups.'}</span>
              </span>
              <span className="rounded-full bg-[#00D26A]/15 px-3 py-1 text-[10px] font-black text-[#00D26A]">{dailyChallengeComplete ? 'Réussi' : '+1 trophée'}</span>
            </button>}

            {showProgression && <section className="order-5 glass-panel rounded-[24px] border border-[#FFB020]/20 p-5 space-y-4">
              <button type="button" onClick={() => setShowTournamentSetup(value => !value)} className="flex w-full items-center justify-between gap-3 text-left">
                <span>
                  <strong className="flex items-center gap-2 text-sm text-white"><Trophy className="h-5 w-5 text-[#FFB020]" /> Tournoi familial</strong>
                  <span className="mt-1 block text-[10px] text-white/45">Enchaînez plusieurs jeux, même hors connexion.</span>
                </span>
                <ChevronRight className={`h-5 w-5 text-white/40 transition-transform ${showTournamentSetup ? 'rotate-90' : ''}`} />
              </button>
              {tournament && (
                <div className="rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span><strong className="block text-xs text-white">{tournament.active ? `Manche ${Math.min(tournament.currentIndex + 1, tournament.games.length)}/${tournament.games.length}` : 'Tournoi terminé'}</strong><span className="text-[9px] text-white/45">{tournament.games.join(' · ')}</span></span>
                    <strong className="text-lg text-[#FFB020]">{tournament.scores[0]} - {tournament.scores[1]}</strong>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-bold text-white/65"><span>{tournament.playerNames[0]}</span><span>{tournament.playerNames[1]}</span></div>
                  {!tournament.active && (
                    <button type="button" onClick={() => setTournament(null)} className="mt-3 w-full rounded-xl border border-white/8 py-2 text-[10px] font-black text-white/55">Fermer le podium</button>
                  )}
                </div>
              )}
              {showTournamentSetup && (
                <div className="space-y-3 border-t border-white/8 pt-4">
                  <p className="text-[10px] text-white/50">Choisissez entre 2 et 5 manches. Victoire : 3 points, égalité : 1 point chacun.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['memory', 'Memory'],
                      ['connect4', 'Puissance 4'],
                      ['battleship', 'Bataille navale'],
                      ['mime-challenge', 'Mimes']
                    ] as Array<[FamilyGameType, string]>).map(([id, label]) => {
                      const selected = tournamentGames.includes(id);
                      return (
                        <button key={id} type="button" onClick={() => setTournamentGames(previous => selected ? previous.filter(game => game !== id) : [...previous, id])} className={`rounded-2xl border p-3 text-left text-xs font-black ${selected ? 'border-[#FFB020] bg-[#FFB020]/10 text-[#FFB020]' : 'border-white/8 bg-white/5 text-white/50'}`}>
                          {selected && <Check className="mr-1 inline h-4 w-4" />}{label}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" disabled={tournamentGames.length < 2} onClick={startTournament} className="w-full rounded-2xl bg-[#FFB020] py-3 text-xs font-black text-[#07111F] disabled:opacity-40">Commencer le tournoi</button>
                </div>
              )}
            </section>}

            {showProgression && <section className="order-5 glass-panel rounded-[24px] border border-white/8 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Joueurs de la prochaine partie</h3>
                  <p className="text-[10px] text-white/45">Les scores seront associés à ces membres.</p>
                </div>
                <Users className="w-5 h-5 text-[#6C5CFF]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1].map(index => (
                  <select
                    key={index}
                    value={playerIds[index]}
                    onChange={event => setPlayerIds(previous => index === 0 ? [event.target.value, previous[1]] : [previous[0], event.target.value])}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold text-white outline-none"
                  >
                    {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                ))}
              </div>
              {pocketMoney.length > 0 && (
                <div className="rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/8 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-[#FFB020]" />
                      <span>
                        <strong className="block text-[11px] text-white">Récompenses de jeu</strong>
                        <span className="block text-[9px] text-white/50">{gameRewardPoints} points proposés au gagnant, puis validés par un parent.</span>
                      </span>
                    </span>
                    {isAdult && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rewardsEnabled}
                        onClick={() => setRewardsEnabled(value => !value)}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${rewardsEnabled ? 'bg-[#00D26A]' : 'bg-white/15'}`}
                        title={rewardsEnabled ? 'Désactiver les récompenses' : 'Activer les récompenses'}
                      >
                        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${rewardsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    )}
                  </div>
                  {!isAdult && (
                    <p className="mt-2 text-[9px] font-bold text-white/45">
                      {rewardsEnabled ? 'Les gains restent en attente de validation parentale.' : 'Un parent peut activer cette option.'}
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 border-t border-white/8 pt-4">
                {[0, 1].map(index => (
                  <label key={index} className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 p-2">
                    <input disabled={!isPremium} type="color" value={teamSettings.colors[index]} onChange={event => setTeamSettings(previous => ({ ...previous, colors: index === 0 ? [event.target.value, previous.colors[1]] : [previous.colors[0], event.target.value] }))} className="h-9 w-9 rounded-lg border-0 p-0 disabled:opacity-50" title={`Couleur équipe ${index + 1}`} />
                    <input disabled={!isPremium} value={teamSettings.names[index]} maxLength={24} onChange={event => setTeamSettings(previous => ({ ...previous, names: index === 0 ? [event.target.value, previous.names[1]] : [previous.names[0], event.target.value] }))} className="min-w-0 flex-1 bg-transparent text-xs font-black text-white outline-none disabled:opacity-60" />
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <span className="block text-[9px] font-black uppercase text-white/40">Composition des équipes</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1].map(teamIndex => (
                    <div key={teamIndex} className="rounded-2xl border border-white/8 bg-white/5 p-3">
                      <strong className="block truncate text-xs text-white">{teamSettings.names[teamIndex]}</strong>
                      <span className="mt-1 block text-[9px] text-white/40">
                        {challengeTeamMemberIds[teamIndex].length > 0
                          ? `Capitaine : ${members.find(member => member.id === challengeTeamMemberIds[teamIndex][0])?.name || 'À choisir'}`
                          : 'Ajoutez au moins un membre'}
                      </span>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {members.map(member => {
                          const selected = challengeTeamMemberIds[teamIndex].includes(member.id);
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => assignChallengeMember(member.id, teamIndex as 0 | 1)}
                              className={`rounded-full border px-3 py-1.5 text-[9px] font-black ${selected ? 'border-[#00D26A]/35 bg-[#00D26A]/12 text-[#00D26A]' : 'border-white/8 text-white/45'}`}
                            >
                              {member.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {!isPremium && (
                <button type="button" onClick={onTriggerPaywall} className="w-full rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/8 py-3 text-[10px] font-black text-[#FFB020]">
                  Personnaliser les équipes avec Premium
                </button>
              )}
            </section>}

            {showProgression && (onAddEventDirect || setVotes || pendingRewards.length > 0) && (
              <section className="order-5 glass-panel rounded-[24px] border border-white/8 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white">Liens avec la famille</h3>
                  <p className="text-[10px] text-white/45">Préparez la prochaine partie et gardez les récompenses sous contrôle.</p>
                </div>

                {onAddEventDirect && (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <label className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                      <span className="mb-1 block text-[9px] font-black uppercase text-white/40">Prochaine soirée jeux</span>
                      <input
                        type="datetime-local"
                        value={gameNightDate}
                        onChange={event => setGameNightDate(event.target.value)}
                        className="w-full bg-transparent text-xs font-bold text-white outline-none"
                      />
                    </label>
                    <button type="button" onClick={scheduleGameNight} className="flex items-center justify-center gap-2 rounded-2xl bg-[#4F8CFF] px-4 py-3 text-xs font-black text-white">
                      <CalendarDays className="h-4 w-4" /> Ajouter
                    </button>
                  </div>
                )}

                {setVotes && (
                  <button
                    type="button"
                    disabled={!isAdult}
                    onClick={() => void createGameVote()}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#6C5CFF]/25 bg-[#6C5CFF]/10 p-4 text-left disabled:opacity-45"
                  >
                    <span>
                      <strong className="block text-xs text-white">Faire choisir le prochain jeu</strong>
                      <span className="mt-1 block text-[9px] text-white/45">{isAdult ? 'Publie un vote dans le Conseil de famille.' : 'Seul un parent peut publier ce vote.'}</span>
                    </span>
                    <Vote className="h-5 w-5 shrink-0 text-[#9E94FF]" />
                  </button>
                )}

                {pendingRewards.length > 0 && (
                  <div className="space-y-2 border-t border-white/8 pt-4">
                    <span className="text-[9px] font-black uppercase text-white/40">Récompenses en attente</span>
                    {pendingRewards.map(reward => (
                      <div key={reward.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/8 p-3">
                        <span className="min-w-0">
                          <strong className="block truncate text-xs text-white">{reward.memberName}</strong>
                          <span className="text-[9px] text-white/45">+{reward.points} points · {reward.gameType}</span>
                        </span>
                        {isAdult ? (
                          <span className="flex shrink-0 gap-2">
                            <button type="button" onClick={() => rejectReward(reward.id)} className="rounded-xl border border-white/10 px-3 py-2 text-[9px] font-black text-white/55">Refuser</button>
                            <button type="button" onClick={() => void approveReward(reward)} className="rounded-xl bg-[#00D26A] px-3 py-2 text-[9px] font-black text-[#07111F]">Valider</button>
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-white/8 px-3 py-1 text-[9px] font-black text-white/45">Parent</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {connectionMessage && (
                  <p className="rounded-xl border border-[#00D26A]/20 bg-[#00D26A]/8 px-3 py-2 text-[10px] font-bold text-white/65">
                    {connectionMessage}
                  </p>
                )}
              </section>
            )}

            {showProgression && isPremium && results.length > 0 && (
              <section className="order-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Parties', gameStats.total],
                  ['Défis', gameStats.challengeGames],
                  ['Record', gameStats.bestChallengeScore],
                  ['Leader', gameStats.leaderName ? `${gameStats.leaderName} · ${gameStats.leaderWins}` : '—']
                ].map(([label, value]) => (
                  <div key={label} className="glass-panel rounded-2xl border border-white/8 p-4">
                    <span className="block text-[9px] font-black uppercase text-white/40">{label}</span>
                    <strong className="mt-1 block truncate text-base text-white">{value}</strong>
                  </div>
                ))}
              </section>
            )}

            {showProgression && isPremium && (
              <section className="order-5 glass-panel rounded-[24px] border border-white/8 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white">Trophées familiaux</h3>
                    <p className="text-[10px] text-white/45">Progression calculée à partir des parties enregistrées.</p>
                  </div>
                  <Trophy className="w-5 h-5 text-[#FFB020]" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ['Première partie', gameStats.total >= 1],
                    ['Série de 3', gameStats.streak >= 3],
                    ['Soirée jeux', gameStats.total >= 10]
                  ].map(([label, unlocked]) => (
                    <div key={String(label)} className={`rounded-2xl border p-3 text-center ${unlocked ? 'border-[#FFB020]/30 bg-[#FFB020]/10' : 'border-white/8 bg-white/5 opacity-50'}`}>
                      <Star className={`mx-auto w-5 h-5 ${unlocked ? 'text-[#FFB020] fill-[#FFB020]' : 'text-white/30'}`} />
                      <strong className="mt-2 block text-[9px] text-white">{label}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showProgression && isPremium && <button
              type="button"
              onClick={() => setShowHistory(value => !value)}
              className="order-5 w-full rounded-[22px] border border-white/8 bg-white/5 p-4 flex items-center justify-between text-left"
            >
              <span className="flex items-center gap-3">
                <History className="w-5 h-5 text-[#4F8CFF]" />
                <span>
                  <strong className="block text-sm text-white">Historique familial</strong>
                  <span className="text-[10px] text-white/45">{results.length} partie{results.length > 1 ? 's' : ''} enregistrée{results.length > 1 ? 's' : ''}</span>
                </span>
              </span>
              <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
            </button>}

            {showProgression && isPremium && showHistory && (
              <div className="order-5 space-y-2">
                {results.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center text-xs text-white/45">Les prochaines parties terminées apparaîtront ici.</p>
                ) : results.slice(0, 8).map(result => (
                  <div key={result.id} className="glass-panel rounded-2xl border border-white/8 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block text-xs text-white truncate">{result.winnerName ? `Victoire de ${result.winnerName}` : 'Partie terminée'}</strong>
                      <span className="text-[10px] text-white/45">{GAME_LABELS[result.gameType]} · {new Date(result.playedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <span className="text-xs font-black text-[#FFB020]">{result.scores.join(' - ')}</span>
                  </div>
                ))}
              </div>
            )}

            {showProgression && !isPremium && (
              <button
                type="button"
                onClick={onTriggerPaywall}
                className="order-5 w-full rounded-[24px] border border-[#FFB020]/20 bg-[#FFB020]/8 p-4 flex items-center justify-between gap-4 text-left hover:bg-[#FFB020]/12 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-2xl bg-[#FFB020]/15 text-[#FFB020]"><Lock className="w-5 h-5" /></span>
                  <div>
                    <strong className="block text-sm text-white">Pack Défi famille Plus</strong>
                    <span className="text-[11px] text-white/50">{FAMILY_CHALLENGE_QUESTIONS.length - 12} questions supplémentaires, packs, statistiques et défis privés.</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 text-[#FFB020]" />
              </button>
            )}
          </div>
        )}

        {activeGame === 'memory' && (
          <>
            {gameHeader('Memory famille', 'Trouvez une paire pour rejouer, sinon passez la main.', Brain)}
            {!memoryStarted ? (
              <section className="glass-panel rounded-[24px] border border-white/8 p-5 space-y-5">
                <div>
                  <h2 className="text-base font-black text-white">Préparer la partie</h2>
                  <p className="mt-1 text-xs text-white/50">Choisissez jusqu’à six joueurs et la taille du plateau.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[6, 8, 12].map(value => (
                    <button key={value} type="button" onClick={() => setMemoryPairCount(value as 6 | 8 | 12)} className={`rounded-2xl border py-3 text-xs font-black ${memoryPairCount === value ? 'border-[#FFB020] bg-[#FFB020]/12 text-[#FFB020]' : 'border-white/8 bg-white/5 text-white/60'}`}>{value} paires</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMemoryMode('individual')} className={`rounded-2xl border py-3 text-xs font-black ${memoryMode === 'individual' ? 'border-[#6C5CFF] bg-[#6C5CFF]/12 text-[#9E94FF]' : 'border-white/8 bg-white/5 text-white/60'}`}>Chacun pour soi</button>
                  <button type="button" onClick={() => setMemoryMode('teams')} className={`rounded-2xl border py-3 text-xs font-black ${memoryMode === 'teams' ? 'border-[#6C5CFF] bg-[#6C5CFF]/12 text-[#9E94FF]' : 'border-white/8 bg-white/5 text-white/60'}`}>Deux équipes</button>
                </div>
                {memories.some(memory => memory.imageUrl || memory.imageUrls?.[0]) && (
                  <div>
                    <span className="mb-2 block text-[9px] font-black uppercase text-white/40">Images des cartes</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setMemorySource('family')} className={`rounded-2xl border py-3 text-xs font-black ${memorySource === 'family' ? 'border-[#FFB020] bg-[#FFB020]/12 text-[#FFB020]' : 'border-white/8 bg-white/5 text-white/60'}`}>Membres</button>
                      <button type="button" onClick={() => setMemorySource('memories')} className={`rounded-2xl border py-3 text-xs font-black ${memorySource === 'memories' ? 'border-[#FFB020] bg-[#FFB020]/12 text-[#FFB020]' : 'border-white/8 bg-white/5 text-white/60'}`}>Souvenirs</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {members.slice(0, 6).map(member => {
                    const selected = memoryPlayerIds.includes(member.id);
                    return (
                      <button key={member.id} type="button" onClick={() => setMemoryPlayerIds(previous => selected ? previous.filter(id => id !== member.id) : previous.length < 6 ? [...previous, member.id] : previous)} className={`rounded-2xl border p-3 text-left ${selected ? 'border-[#00D26A]/45 bg-[#00D26A]/10' : 'border-white/8 bg-white/5'}`}>
                        <strong className="block truncate text-xs text-white">{member.name}</strong>
                        <span className="text-[9px] text-white/45">{selected ? memoryMode === 'teams' ? `Équipe ${memoryPlayerIds.indexOf(member.id) % 2 === 0 ? 'Soleil' : 'Comète'}` : 'Participe' : 'Ajouter'}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={startMemory} disabled={memoryPlayerIds.length === 0 || (memoryMode === 'teams' && memoryPlayerIds.length < 2)} className="w-full rounded-2xl bg-[#FFB020] py-4 text-sm font-black text-[#07111F] disabled:opacity-40">Commencer</button>
              </section>
            ) : (
              <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {memoryCompetitorNames.map((name, index) => (
                <div key={`${name}-${index}`} className={`rounded-2xl border p-3 ${memoryCurrentPlayer === index ? 'bg-white/10' : 'border-white/8 bg-white/5'}`} style={memoryMode === 'teams' && memoryCurrentPlayer === index ? { borderColor: teamSettings.colors[index] } : undefined}>
                  <strong className="block truncate text-xs text-white">{name}</strong>
                  <span className="text-[10px] text-white/45">{memoryScores[index] || 0} paire{memoryScores[index] === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-5">
                <span className="text-xs text-white/50">Coups <strong className="ml-1 text-white">{memoryMoves}</strong></span>
                <span className="text-xs text-white/50">Paires <strong className="ml-1 text-[#00D26A]">{matchedPairs.length}/{memoryPairCount}</strong></span>
              </div>
              <button type="button" onClick={resetMemory} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10" title="Recommencer">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className={`grid gap-2.5 sm:gap-4 max-w-3xl mx-auto ${memoryPairCount === 12 ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-4'}`}>
              {memoryDeck.map(card => {
                const isVisible = flippedCards.includes(card.id) || matchedPairs.includes(card.pairId);
                const isMatched = matchedPairs.includes(card.pairId);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => flipMemoryCard(card)}
                    className={`memory-game-card aspect-[0.82] rounded-[20px] border transition-all overflow-hidden relative ${isVisible ? 'is-visible' : ''} ${isMatched ? 'is-matched' : ''} ${
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
            {matchedPairs.length === memoryPairCount && (
              <div className="glass-panel rounded-[24px] border border-[#00D26A]/25 p-5 text-center">
                <Trophy className="w-10 h-10 mx-auto text-[#FFB020]" />
                <h2 className="mt-2 text-lg font-black text-white">{Math.max(...memoryScores) === Math.min(...memoryScores) ? 'Égalité !' : `Victoire de ${memoryCompetitorNames[memoryScores.indexOf(Math.max(...memoryScores))]}`}</h2>
                <p className="mt-1 text-xs text-white/50">Partie terminée en {memoryMoves} coups.</p>
                <div className="mt-4 space-y-2">
                  {memoryCompetitorNames.map((name, index) => ({ name, score: memoryScores[index] || 0 })).sort((a, b) => b.score - a.score).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs"><span className="text-white">{index + 1}. {entry.name}</span><strong className="text-[#FFB020]">{entry.score}</strong></div>
                  ))}
                </div>
                <button type="button" onClick={resetMemory} className="mt-4 px-5 py-3 rounded-2xl bg-[#00D26A] text-[#07111F] text-xs font-black">
                  Nouvelle partie
                </button>
                <button
                  type="button"
                  disabled={memorySaved}
                  onClick={() => {
                    setMemorySaved(true);
                    const topScore = Math.max(...memoryScores);
                    const winners = memoryCompetitorNames.filter((_, index) => memoryScores[index] === topScore);
                    void saveResult('memory', memoryScores, winners.length > 1 ? 'Égalité' : winners[0], { moves: memoryMoves, pairs: memoryPairCount, mode: memoryMode }, memoryCompetitorNames);
                  }}
                  className="mt-2 ml-2 px-5 py-3 rounded-2xl border border-white/8 disabled:opacity-45 text-white text-xs font-black"
                >
                  {memorySaved ? 'Score enregistré' : 'Enregistrer le score'}
                </button>
              </div>
            )}
              </>
            )}
          </>
        )}

        {activeGame === 'connect4' && (
          <>
            {gameHeader('Puissance 4', 'Alignez quatre jetons horizontalement, verticalement ou en diagonale.', Circle)}
            <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
              {([
                ['local', Users, 'Même écran'],
                ['bot', Bot, 'Ordinateur'],
                ['private', Radio, 'Duel privé']
              ] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={Boolean(connectRoom && value !== 'private')}
                  onClick={() => {
                    if (value === 'private' && !isPremium) {
                      onTriggerPaywall?.();
                      return;
                    }
                    setConnectMode(value);
                    setConnectVsBot(value === 'bot');
                    if (value !== 'private') setActiveRoom(previous => previous?.gameType === 'connect4' ? null : previous);
                    setBoard(emptyBoard());
                    setConnectWinner(0);
                    setConnectDraw(false);
                    setCurrentPlayer(1);
                  }}
                  className={`rounded-2xl border p-3 text-center disabled:opacity-40 ${connectMode === value ? 'border-[#4F8CFF] bg-[#4F8CFF]/12' : 'border-white/8 bg-white/5'}`}
                >
                  <Icon className="mx-auto h-5 w-5 text-[#4F8CFF]" />
                  <strong className="mt-2 block text-[10px] text-white">{label}</strong>
                </button>
              ))}
            </div>
            {connectMode === 'private' ? (
              <div className="space-y-4">
                {!connectRoom ? (
                  <PrivateFamilyRoom
                    foyerId={foyerId}
                    familyName={privatePlayerName}
                    selectedGame="connect4"
                    onRoomReady={room => setActiveRoom(room)}
                    onRoomClosed={() => {
                      setActiveRoom(null);
                      setConnectMode('local');
                    }}
                  />
                ) : (
                  <>
                    <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 p-4 flex items-center justify-between gap-3">
                      <span><strong className="block text-xs text-white">{connectRoom.hostName}</strong><span className="text-[9px] text-white/40">Rouge</span></span>
                      <span className="text-[10px] font-black uppercase text-[#9E94FF]">Salle {connectRoom.code}</span>
                      <span className="text-right"><strong className="block text-xs text-white">{connectRoom.guestName || 'En attente'}</strong><span className="text-[9px] text-white/40">Jaune</span></span>
                    </div>
                    <div className={`rounded-2xl border p-4 text-center ${privateConnectTurn === privateConnectPlayer && connectRoom.status === 'active' ? 'border-[#00D26A]/25 bg-[#00D26A]/8' : 'border-white/8 bg-white/5'}`}>
                      <strong className="text-sm text-white">
                        {connectRoom.status === 'waiting'
                          ? 'En attente d’un autre joueur...'
                          : connectRoom.status === 'finished'
                            ? privateConnectDraw ? 'Grille pleine : égalité' : privateConnectWinner === privateConnectPlayer ? 'Vous remportez la manche !' : 'L’autre joueur remporte la manche'
                            : privateConnectTurn === privateConnectPlayer ? 'À vous de jouer' : 'L’autre joueur réfléchit...'}
                      </strong>
                    </div>
                    <div className="family-games-board max-w-xl mx-auto rounded-[24px] border p-2.5 sm:p-4 shadow-xl">
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {privateConnectBoard.map((row, rowIndex) => row.map((cell, colIndex) => (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            type="button"
                            disabled={connectRoom.status !== 'active' || privateConnectTurn !== privateConnectPlayer || connectPrivateBusy || privateConnectWinner !== 0 || privateConnectDraw}
                            onClick={() => void playPrivateConnectColumn(colIndex)}
                            className="family-games-slot aspect-square rounded-full border p-[12%] disabled:cursor-default"
                            aria-label={`Colonne ${colIndex + 1}`}
                          >
                            <span className={`connect-piece block w-full h-full rounded-full ${
                              cell === 1 ? 'bg-[#FF4D6D]' : cell === 2 ? 'bg-[#FFB020]' : 'bg-white/5'
                            }`} />
                          </button>
                        )))}
                      </div>
                    </div>
                    {connectRoom.status === 'finished' && (
                      <button
                        type="button"
                        onClick={() => void requestPrivateConnectRematch()}
                        disabled={connectPrivateBusy || privateConnectRematchRequested}
                        className="w-full rounded-2xl bg-[#4F8CFF] py-3 text-xs font-black text-white disabled:opacity-50"
                      >
                        {privateConnectRematchRequested ? 'En attente de l’autre joueur' : 'Proposer une revanche'}
                      </button>
                    )}
                    <button type="button" onClick={() => void closePrivateConnectRoom()} disabled={connectPrivateBusy} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FF4D6D]/20 py-3 text-xs font-black text-[#FF4D6D]">
                      <LogOut className="h-4 w-4" /> Quitter le salon
                    </button>
                  </>
                )}
                {connectPrivateMessage && <p className="rounded-xl border border-white/8 bg-white/5 p-3 text-center text-xs font-bold text-white/60">{connectPrivateMessage}</p>}
              </div>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
              {[0, 1].map(index => (
                <select key={index} value={playerIds[index]} disabled={connectVsBot && index === 1} onChange={event => setPlayerIds(previous => index === 0 ? [event.target.value, previous[1]] : [previous[0], event.target.value])} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold text-white">
                  {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              ))}
            </div>
            {connectVsBot && (
              <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
                {BOT_DIFFICULTIES.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setBotDifficulty(value)} className={`rounded-2xl border py-2.5 text-xs font-black ${botDifficulty === value ? 'border-[#4F8CFF] bg-[#4F8CFF]/12 text-[#4F8CFF]' : 'border-white/8 bg-white/5 text-white/55'}`}>{label}</button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
              {players.map((player, index) => (
                <div key={player.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${currentPlayer === index + 1 && !connectWinner ? 'border-[#FFB020]/40 bg-[#FFB020]/10' : 'border-white/8 bg-white/5'}`}>
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-[#FF4D6D] text-white' : 'bg-[#FFB020] text-[#07111F]'}`}>{getInitials(player.name)}</span>
                  )}
                  <div className="min-w-0">
                    <strong className="block text-xs text-white truncate">{connectVsBot && index === 1 ? 'Ordinateur' : player.name}</strong>
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
                    <span key={lastDroppedCell?.row === rowIndex && lastDroppedCell.column === colIndex ? lastDroppedCell.nonce : `${rowIndex}-${colIndex}-piece`} className={`connect-piece block w-full h-full rounded-full transition-colors ${lastDroppedCell?.row === rowIndex && lastDroppedCell.column === colIndex ? 'is-dropping' : ''} ${
                      cell === 1 ? 'bg-[#FF4D6D]' : cell === 2 ? 'bg-[#FFB020]' : 'bg-white/5'
                    }`} />
                  </button>
                )))}
              </div>
            </div>
            <div className="text-center">
              {connectWinner ? (
                <div className="game-victory space-y-3">
                  <p className="text-base font-black text-white"><Trophy className="inline w-5 h-5 mr-2 text-[#FFB020]" />{connectVsBot && connectWinner === 2 ? 'Ordinateur' : players[connectWinner - 1].name} remporte la manche !</p>
                  <button type="button" onClick={resetConnectBoard} className="px-5 py-3 rounded-2xl bg-[#6C5CFF] text-white text-xs font-black">
                    Revanche
                  </button>
                </div>
              ) : connectDraw ? (
                <div className="space-y-3">
                  <p className="text-base font-black text-white">Grille pleine : égalité !</p>
                  <button type="button" onClick={resetConnectBoard} className="px-5 py-3 rounded-2xl bg-[#6C5CFF] text-white text-xs font-black">Rejouer</button>
                </div>
              ) : (
                <p className="text-sm font-bold text-white/70">À {connectVsBot && currentPlayer === 2 ? 'l’ordinateur' : players[currentPlayer - 1].name} de jouer</p>
              )}
            </div>
              </>
            )}
          </>
        )}

        {activeGame === 'battleship' && (
          <>
            {gameHeader('Bataille navale', 'Placez votre flotte, protégez vos positions et coulez les cinq bateaux adverses.', Ship)}
            <BattleshipGame
              foyerId={foyerId}
              familyName={privatePlayerName}
              isPremium={isPremium}
              playerNames={[players[0].name, players[1].name]}
              room={activeRoom?.gameType === 'battleship' ? activeRoom : null}
              onRoomChange={setActiveRoom}
              onTriggerPaywall={onTriggerPaywall}
              onFinished={(scores, winnerName, mode) => void saveResult('battleship', scores, winnerName, { mode }, [players[0].name, players[1].name])}
            />
          </>
        )}

        {activeGame === 'family-challenge' && (
          <>
            {gameHeader('Défi famille', 'Prenez la main, complétez le tableau et protégez la cagnotte.', Users)}
            {!challengeRoom && !challengeMode && !lastRecap && (
              <section className="family-games-challenge rounded-[28px] border p-5 sm:p-7 space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">Comment souhaitez-vous jouer ?</h2>
                  <p className="mt-2 text-xs leading-relaxed text-white/50">Préparez deux équipes dans votre foyer ou invitez une famille connue avec un code privé.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setChallengeMode('local')}
                    className="glass-panel min-h-40 rounded-[22px] border border-[#FF4D6D]/25 p-5 text-left hover:bg-white/8 transition-colors"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF4D6D]/12 text-[#FF4D6D]">
                      <Users className="h-5 w-5" />
                    </span>
                    <strong className="mt-4 block text-sm text-white">Jouer dans ce foyer</strong>
                    <span className="mt-1 block text-[10px] leading-relaxed text-white/45">Deux équipes jouent ensemble sur le même appareil.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => isPremium ? setChallengeMode('private') : onTriggerPaywall?.()}
                    className="glass-panel relative min-h-40 rounded-[22px] border border-[#6C5CFF]/25 p-5 text-left hover:bg-white/8 transition-colors"
                  >
                    {!isPremium && <Lock className="absolute right-4 top-4 h-4 w-4 text-[#FFB020]" />}
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6C5CFF]/12 text-[#9E94FF]">
                      <Gamepad2 className="h-5 w-5" />
                    </span>
                    <strong className="mt-4 block text-sm text-white">Défier une famille</strong>
                    <span className="mt-1 block text-[10px] leading-relaxed text-white/45">Créez ou rejoignez une salle privée avec un code à six caractères.</span>
                  </button>
                </div>
              </section>
            )}
            {!challengeRoom && challengeMode && !lastRecap && (
              <button
                type="button"
                onClick={() => setChallengeMode(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[10px] font-black text-white/55"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Changer de mode
              </button>
            )}
            {challengeRoom?.status === 'active' && (
              <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-xs font-black text-white">{challengeRoom.hostName}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#9E94FF]">Salle {challengeRoom.code}</span>
                <span className="text-xs font-black text-white">{challengeRoom.guestName || 'En attente'}</span>
                <button type="button" onClick={() => {
                  void familyGameService.performRoomAction(
                    challengeRoom.id,
                    foyerId,
                    challengeRoom.status === 'active'
                      ? 'leave'
                      : challengeRoom.hostFoyerId === foyerId ? 'cancel' : 'leave'
                  ).finally(() => setActiveRoom(null));
                }} className="rounded-xl border border-[#FF4D6D]/20 p-2 text-[#FF4D6D]" title="Quitter la partie">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            )}
            {lastRecap && (
              <div className="rounded-[28px] border border-[#FFB020]/30 bg-[#FFB020]/10 p-6 text-center animate-fade-in">
                <Trophy className="mx-auto w-12 h-12 text-[#FFB020]" />
                <h2 className="mt-3 text-xl font-black text-white">{lastRecap.winnerName === 'Égalité' ? 'Égalité parfaite !' : `Victoire de ${lastRecap.winnerName}`}</h2>
                <p className="mt-1 text-sm font-black text-[#FFB020]">{lastRecap.scores[0]} - {lastRecap.scores[1]}</p>
                <p className="mt-2 text-xs text-white/50">
                  {lastRecap.roundsPlayed} manche{lastRecap.roundsPlayed > 1 ? 's' : ''}
                  {lastRecap.suddenDeath ? ' · départage en mort subite' : ''}
                </p>
                {lastRecap.roundHistory.length > 0 && (
                  <div className="mt-4 grid gap-2 text-left sm:grid-cols-2">
                    {lastRecap.roundHistory.map(summary => (
                      <div key={summary.round} className="rounded-2xl border border-white/8 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-xs text-white">Manche {summary.round}</strong>
                          <span className="text-xs font-black text-[#FFB020]">{summary.bank} pts</span>
                        </div>
                        <span className="mt-1 block text-[9px] text-white/45">
                          {challengeTeams[summary.winner]?.name || 'Équipe'} · {summary.foundAnswers.length}/8 réponses · {summary.strikes} erreur{summary.strikes > 1 ? 's' : ''}
                          {summary.stolen ? ' · cagnotte volée' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setLastRecap(null)} className="mt-4 rounded-2xl bg-[#FFB020] px-5 py-3 text-xs font-black text-[#07111F]">Nouvelle partie</button>
              </div>
            )}
            {challengeMode === 'private' && !challengeRoom && !lastRecap ? (
              <PrivateFamilyRoom
                foyerId={foyerId}
                familyName={familyName}
                selectedGame="family-challenge"
                onRoomReady={handleRoomReady}
                onRoomClosed={() => {
                  setActiveRoom(null);
                  setChallengeMode(null);
                }}
              />
            ) : challengeRoom?.status === 'waiting' ? (
              <PrivateFamilyRoom
                foyerId={foyerId}
                familyName={familyName}
                selectedGame="family-challenge"
                initialRoom={challengeRoom}
                onRoomReady={handleRoomReady}
                onRoomClosed={() => {
                  setActiveRoom(null);
                  setChallengeMode(null);
                }}
              />
            ) : (challengeMode === 'local' || challengeRoom) && !lastRecap ? <FamilyChallengeGame
              foyerId={foyerId}
              isPremium={isPremium}
              teams={[
                {
                  id: challengeTeams[0].id,
                  name: challengeTeams[0].name,
                  members: challengeTeams[0].members,
                  captain: challengeTeams[0].captain
                },
                {
                  id: challengeTeams[1].id,
                  name: challengeTeams[1].name,
                  members: challengeTeams[1].members,
                  captain: challengeTeams[1].captain
                }
              ]}
              room={challengeRoom}
              onRoomChange={handleRoomReady}
              onFinished={recap => {
                setLastRecap(recap);
                void saveResult(
                  'family-challenge',
                  recap.scores,
                  recap.winnerName,
                  {
                    roomId: challengeRoom?.id,
                    rounds: recap.roundsPlayed,
                    suddenDeath: recap.suddenDeath,
                    roundHistory: recap.roundHistory
                  },
                  challengeTeams.map(team => team.name)
                );
              }}
            /> : null}
          </>
        )}

        {activeGame === 'mime-challenge' && (
          <>
            {gameHeader('Mimes et défis', 'Faites deviner un maximum de cartes en 60 secondes.', Mic2)}
            <MimeChallengeGame
              teamNames={teamSettings.names}
              isPremium={isPremium}
              onTriggerPaywall={onTriggerPaywall}
              onFinished={(scores, rounds, winnerName) => void saveResult('mime-challenge', scores, winnerName, { rounds }, teamSettings.names)}
            />
          </>
        )}

        {activeGame === 'village-secret' && (
          <>
            {gameHeader('Village Secret', 'Rôles cachés, nuit, débat et vote guidés automatiquement.', Moon)}
            <button
              type="button"
              onClick={() => setShowVillageCloseConfirm(true)}
              className="ml-auto flex items-center gap-2 rounded-2xl border border-[#FF4D6D]/25 bg-[#FF4D6D]/8 px-4 py-2.5 text-[10px] font-black text-[#FF9BAF]"
            >
              <X className="h-4 w-4" /> Fermer complètement la partie
            </button>
            <Suspense fallback={<div className="rounded-[28px] border border-white/8 bg-white/5 p-8 text-center text-xs font-bold text-white/55">Préparation du village...</div>}>
              <VillageSecretGame members={members} />
            </Suspense>
            {showVillageCloseConfirm && (
              <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-4 sm:items-center">
                <div role="dialog" aria-modal="true" aria-labelledby="village-close-title" className="app-dialog-surface w-full max-w-sm rounded-[24px] border border-white/10 bg-[#111827] p-5 shadow-2xl">
                  <h2 id="village-close-title" className="text-lg font-black text-white">Fermer cette partie ?</h2>
                  <p className="mt-2 text-xs leading-relaxed text-white/55">La partie et sa sauvegarde locale seront supprimées. Cette action ne peut pas être annulée.</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setShowVillageCloseConfirm(false)} className="rounded-2xl border border-white/10 py-3 text-xs font-black text-white/60">Continuer à jouer</button>
                    <button type="button" onClick={() => {
                      localStorage.removeItem('mf_village_secret_active_game_v3');
                      localStorage.removeItem(`mf_games_resume_${foyerId}`);
                      window.speechSynthesis?.cancel();
                      setShowVillageCloseConfirm(false);
                      setResumeSnapshot(null);
                      setActiveGame(null);
                    }} className="rounded-2xl bg-[#FF4D6D] py-3 text-xs font-black text-white">Fermer</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
