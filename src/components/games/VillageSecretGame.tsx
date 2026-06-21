import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  Feather,
  History,
  Moon,
  Music2,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  Skull,
  Sparkles,
  Sun,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Vote,
  X
} from 'lucide-react';
import type { Member } from '../../types';
import { nativeSpeech, type NativeSpeechVoice } from '../../utils/nativeSpeech';

type Role =
  | 'villager'
  | 'traitor'
  | 'protector'
  | 'investigator'
  | 'healer'
  | 'cupid'
  | 'jester'
  | 'elder'
  | 'mayor'
  | 'raven'
  | 'archivist'
  | 'diplomat'
  | 'watcher'
  | 'messenger'
  | 'twin'
  | 'confessor'
  | 'silencer'
  | 'repentant';
type Alignment = 'traitors' | 'village' | 'solo';
type BotDifficulty = 'easy' | 'normal' | 'hard';
type BotSpeed = 'fast' | 'normal' | 'cinematic';
type BotPersonality = 'prudent' | 'accuser' | 'discreet' | 'unpredictable';
type Stage =
  | 'setup'
  | 'reveal-pass'
  | 'reveal-role'
  | 'cupid-pass'
  | 'cupid-choice'
  | 'night-intro'
  | 'night-player-pass'
  | 'night-player-action'
  | 'night-shadow-pass'
  | 'night-shadow'
  | 'night-oracle-pass'
  | 'night-oracle'
  | 'night-guardian-pass'
  | 'night-guardian'
  | 'night-healer-pass'
  | 'night-healer'
  | 'night-raven-pass'
  | 'night-raven'
  | 'night-archivist-pass'
  | 'night-archivist'
  | 'dawn'
  | 'discussion'
  | 'vote-pass'
  | 'vote'
  | 'vote-result'
  | 'finished';

type Player = {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
  isBot?: boolean;
  botPersonality?: BotPersonality;
  hasRepented?: boolean;
  repentanceNoticePending?: boolean;
  linkedId?: string;
  elderShield: boolean;
  diplomatShield: boolean;
  twinId?: string;
};

type GameMoment = {
  id: string;
  night: number;
  kind: 'start' | 'night' | 'investigation' | 'protection' | 'healing' | 'link' | 'vote' | 'result';
  title: string;
  detail: string;
};

type BotDecision = {
  id: string;
  night: number;
  botName: string;
  action: string;
  detail: string;
};

interface VillageSecretGameProps {
  members: Member[];
  onFinished?: (winner: 'village' | 'traitors', rounds: number) => void;
}

const ROLE_INFO: Record<Role, { name: string; icon: string; description: string; alignment: Alignment; color: string }> = {
  villager: {
    name: 'Villageois',
    icon: '🏡',
    description: 'Observez les débats et votez pour démasquer les Traîtres de la nuit.',
    alignment: 'village',
    color: '#FFB020'
  },
  traitor: {
    name: 'Traître de la nuit',
    icon: '🌑',
    description: 'Chaque nuit, les Traîtres choisissent ensemble une personne à éliminer.',
    alignment: 'traitors',
    color: '#FF4D6D'
  },
  protector: {
    name: 'Protecteur',
    icon: '🛡️',
    description: 'Protégez une personne, sans pouvoir choisir la même deux nuits de suite. Repos alterné à 5–6 joueurs.',
    alignment: 'village',
    color: '#00D26A'
  },
  investigator: {
    name: 'Enquêteur',
    icon: '🔮',
    description: 'Découvrez si une personne est un Traître. Une seule vérification à 5–6 joueurs, une nuit sur deux à 7–9.',
    alignment: 'village',
    color: '#9E94FF'
  },
  healer: {
    name: 'Guérisseur',
    icon: '🌿',
    description: 'Une fois par partie, sauvez la personne visée pendant la nuit.',
    alignment: 'village',
    color: '#42D6C5'
  },
  cupid: {
    name: 'Cupidon familial',
    icon: '💞',
    description: 'Au début de la partie, liez deux joueurs : si l’un tombe, l’autre le suit.',
    alignment: 'village',
    color: '#FF72B6'
  },
  jester: {
    name: 'Farceur',
    icon: '🃏',
    description: 'Votre objectif secret est d’être éliminé par le vote du village.',
    alignment: 'solo',
    color: '#F472B6'
  },
  elder: {
    name: 'Ancien du village',
    icon: '🧓',
    description: 'Vous résistez à la première attaque nocturne qui vous vise.',
    alignment: 'village',
    color: '#D4A373'
  },
  mayor: {
    name: 'Maire',
    icon: '👑',
    description: 'À 5–6 joueurs, ajoutez une voix une seule fois. À partir de 7 joueurs, votre voix compte double.',
    alignment: 'village',
    color: '#FFD166'
  },
  raven: {
    name: 'Corbeau',
    icon: '🪶',
    description: 'Chaque nuit, désignez une personne qui commencera le vote avec une voix contre elle.',
    alignment: 'village',
    color: '#8FA3BF'
  },
  archivist: {
    name: 'Archiviste',
    icon: '📜',
    description: 'Une fois par partie, consultez secrètement le rôle exact d’une personne éliminée.',
    alignment: 'village',
    color: '#C084FC'
  },
  diplomat: {
    name: 'Diplomate',
    icon: '🕊️',
    description: 'Vous survivez à la première décision du village qui devait vous éliminer.',
    alignment: 'village',
    color: '#7DD3FC'
  },
  watcher: {
    name: 'Veilleur',
    icon: '🕯️',
    description: 'Chaque nuit, découvrez si une personne possède une action nocturne.',
    alignment: 'village',
    color: '#FDE68A'
  },
  messenger: {
    name: 'Messager',
    icon: '✉️',
    description: 'Envoyez chaque nuit un conseil anonyme qui sera révélé au lever du jour.',
    alignment: 'village',
    color: '#67E8F9'
  },
  twin: {
    name: 'Jumeau secret',
    icon: '♊',
    description: 'Vous connaissez votre Jumeau. Si l’un tombe, l’autre le suit.',
    alignment: 'village',
    color: '#F0ABFC'
  },
  confessor: {
    name: 'Confesseur',
    icon: '🕊️',
    description: 'Une fois par partie, protégez publiquement une personne du prochain vote.',
    alignment: 'village',
    color: '#A7F3D0'
  },
  silencer: {
    name: 'Silencieux',
    icon: '🤫',
    description: 'Chaque nuit, empêchez une personne de participer au vote du lendemain.',
    alignment: 'traitors',
    color: '#A78BFA'
  },
  repentant: {
    name: 'Traître repenti',
    icon: '🌗',
    description: 'Vous commencez avec les Traîtres, puis rejoignez le Village lorsqu’un autre Traître tombe.',
    alignment: 'traitors',
    color: '#FB7185'
  }
};

const SPECIAL_ROLES = (Object.keys(ROLE_INFO) as Role[]).filter(role => role !== 'villager' && role !== 'traitor');
const DEFAULT_SPECIAL_ROLES: Role[] = ['investigator', 'protector', 'healer', 'cupid', 'jester', 'elder', 'mayor', 'raven', 'archivist', 'diplomat', 'watcher', 'messenger', 'twin', 'confessor', 'silencer', 'repentant'];
const SAVE_KEY = 'mf_village_secret_active_game_v3';
const RESULTS_KEY = 'mf_village_secret_results_v1';
const VOICE_PREFERENCE_KEY = `mf_village_secret_voice_${nativeSpeech.platform()}`;
const ROLE_ART_ORDER: Role[] = ['villager', 'traitor', 'protector', 'investigator', 'healer', 'cupid', 'jester', 'elder', 'mayor', 'raven', 'archivist', 'diplomat'];
const EXTRA_ROLE_ART_ORDER: Role[] = ['watcher', 'messenger', 'twin', 'confessor', 'silencer', 'repentant'];
const BOT_NAMES = ['Camille', 'Nolan', 'Jade', 'Sacha', 'Lina', 'Noé', 'Mila', 'Eden', 'Lou', 'Maël', 'Inès', 'Naël', 'Rose', 'Léo', 'Aya', 'Tom', 'Zoé', 'Adam', 'Nina'];
const BOT_PERSONALITIES: BotPersonality[] = ['prudent', 'accuser', 'discreet', 'unpredictable'];
const BOT_PERSONALITY_LABELS: Record<BotPersonality, string> = {
  prudent: 'Prudent',
  accuser: 'Accusateur',
  discreet: 'Discret',
  unpredictable: 'Imprévisible'
};
const BOT_SPEED_DELAYS: Record<BotSpeed, number> = { fast: 180, normal: 600, cinematic: 1050 };

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
};

const pickRandom = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];
const isTraitorRole = (role: Role) => ROLE_INFO[role].alignment === 'traitors';
const isActiveTraitor = (player: Pick<Player, 'role' | 'hasRepented'>) => (
  isTraitorRole(player.role) && !(player.role === 'repentant' && player.hasRepented)
);
const hasNightAction = (role: Role) => ['traitor', 'repentant', 'silencer', 'protector', 'investigator', 'healer', 'cupid', 'raven', 'archivist', 'watcher', 'messenger', 'confessor'].includes(role);

const buildRoles = (count: number, enabledRoles: Role[], humanCount = count): Role[] => {
  const traitorCount = count >= 16 ? 4 : count >= 11 ? 3 : count >= 7 ? 2 : 1;
  const botRatio = 1 - humanCount / count;
  const minimumVillagers = Math.max(2, Math.floor(count * (botRatio > 0.6 ? 0.4 : 0.3)));
  const maximumSpecialRoles = Math.max(0, count - traitorCount - minimumVillagers);
  const balancedRoles = enabledRoles.filter(role => !(count <= 6 && ['mayor', 'silencer', 'repentant'].includes(role)));
  const selectedSpecials: Role[] = [];
  shuffle(balancedRoles).forEach(role => {
    if (selectedSpecials.length >= maximumSpecialRoles) return;
    if (role === 'twin') {
      if (selectedSpecials.length + 2 <= maximumSpecialRoles) selectedSpecials.push('twin', 'twin');
      return;
    }
    selectedSpecials.push(role);
  });
  const selectedTraitorRoles = selectedSpecials.filter(role => isTraitorRole(role)).length;
  const roles: Role[] = [
    ...Array.from({ length: Math.max(1, traitorCount - selectedTraitorRoles) }, () => 'traitor' as const),
    ...selectedSpecials
  ];
  while (roles.length < count) roles.push('villager');
  return shuffle(roles);
};

const getFrenchVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('fr'));
  const unique = new Map<string, SpeechSynthesisVoice>();
  voices.forEach(voice => {
    const key = `${voice.name.trim().toLocaleLowerCase('fr')}|${voice.lang.toLocaleLowerCase('fr')}`;
    const current = unique.get(key);
    if (!current || (!current.localService && voice.localService)) unique.set(key, voice);
  });
  return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name, 'fr'));
};

const speakText = (text: string, selectedVoiceURI = '') => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  const frenchVoices = getFrenchVoices();
  const preferredNames = ['audrey', 'thomas', 'amélie', 'amelie', 'aurélie', 'aurelie', 'marie', 'denise', 'natural', 'google français'];
  utterance.voice = frenchVoices.find(voice => voice.voiceURI === selectedVoiceURI)
    || preferredNames
    .map(name => frenchVoices.find(voice => voice.name.toLowerCase().includes(name)))
    .find(Boolean) || frenchVoices[0] || null;
  utterance.rate = 0.94;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
};

let sharedAudioContext: AudioContext | null = null;
let ambientNodes: { oscillators: OscillatorNode[]; gain: GainNode } | null = null;

const getAudioContext = async (): Promise<AudioContext | null> => {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedAudioContext ||= new AudioContextClass();
  if (sharedAudioContext.state === 'suspended') await sharedAudioContext.resume();
  return sharedAudioContext;
};

const playEffect = async (effect: 'success' | 'danger' | 'victory', volume = 0.7) => {
  try {
    const context = await getAudioContext();
    if (!context) return;
    const notes = effect === 'victory' ? [392, 523, 659] : effect === 'success' ? [440, 554] : [220, 165];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = effect === 'danger' ? 'triangle' : 'sine';
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.2 * volume), context.currentTime + index * 0.1 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.1 + 0.26);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + index * 0.1);
      oscillator.stop(context.currentTime + index * 0.1 + 0.28);
    });
  } catch {
    // Embedded browsers can defer Web Audio until a later user interaction.
  }
};

const startAmbience = async (volume: number) => {
  if (ambientNodes) {
    ambientNodes.gain.gain.value = 0.018 * volume;
    return;
  }
  if (volume <= 0) return;
  try {
    const context = await getAudioContext();
    if (!context) return;
    const gain = context.createGain();
    gain.gain.value = 0.018 * volume;
    gain.connect(context.destination);
    const oscillators = [110, 164.81].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -7 : 5;
      oscillator.connect(gain);
      oscillator.start();
      return oscillator;
    });
    ambientNodes = { oscillators, gain };
  } catch {
    ambientNodes = null;
  }
};

const stopAmbience = () => {
  ambientNodes?.oscillators.forEach(oscillator => {
    try { oscillator.stop(); } catch { /* Already stopped. */ }
  });
  ambientNodes?.gain.disconnect();
  ambientNodes = null;
};

export function VillageSecretGame({ members, onFinished }: VillageSecretGameProps) {
  const initialNames = members.map(member => member.name).filter(Boolean).slice(0, 20);
  const [names, setNames] = useState<string[]>(initialNames);
  const [botCount, setBotCount] = useState(0);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('normal');
  const [botSpeed, setBotSpeed] = useState<BotSpeed>('normal');
  const [fastForwardBots, setFastForwardBots] = useState(false);
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [customBotNames, setCustomBotNames] = useState<string[]>(BOT_NAMES);
  const [botDecisions, setBotDecisions] = useState<BotDecision[]>([]);
  const [guestName, setGuestName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [stage, setStage] = useState<Stage>('setup');
  const [revealIndex, setRevealIndex] = useState(0);
  const [night, setNight] = useState(1);
  const [shadowTarget, setShadowTarget] = useState<string | null>(null);
  const [protectedTarget, setProtectedTarget] = useState<string | null>(null);
  const [oracleTarget, setOracleTarget] = useState<string | null>(null);
  const [oracleResultVisible, setOracleResultVisible] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<{ playerId: string; isTraitor: boolean } | null>(null);
  const [dawnMessage, setDawnMessage] = useState('');
  const [discussionSeconds, setDiscussionSeconds] = useState<60 | 120 | 180>(120);
  const [seconds, setSeconds] = useState(120);
  const [voterIndex, setVoterIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [voteMessage, setVoteMessage] = useState('');
  const [winner, setWinner] = useState<'village' | 'traitors' | null>(null);
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const [roleVisible, setRoleVisible] = useState(false);
  const [cupidTargets, setCupidTargets] = useState<string[]>([]);
  const [healerSaveAvailable, setHealerSaveAvailable] = useState(true);
  const [eliminationHistory, setEliminationHistory] = useState<Array<{ night: number; name: string; role: Role; cause: string }>>([]);
  const [soloWinner, setSoloWinner] = useState<string | null>(null);
  const [enabledRoles, setEnabledRoles] = useState<Role[]>(DEFAULT_SPECIAL_ROLES);
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [ravenTarget, setRavenTarget] = useState<string | null>(null);
  const [watcherTarget, setWatcherTarget] = useState<string | null>(null);
  const [watcherResultVisible, setWatcherResultVisible] = useState(false);
  const [messengerTarget, setMessengerTarget] = useState<string | null>(null);
  const [messengerTone, setMessengerTone] = useState<'trust' | 'doubt'>('doubt');
  const [messengerMessage, setMessengerMessage] = useState('');
  const [confessorTarget, setConfessorTarget] = useState<string | null>(null);
  const [confessorUsed, setConfessorUsed] = useState(false);
  const [silencedTarget, setSilencedTarget] = useState<string | null>(null);
  const [archivistUsed, setArchivistUsed] = useState(false);
  const [archivistTarget, setArchivistTarget] = useState<string | null>(null);
  const [archivistResultVisible, setArchivistResultVisible] = useState(false);
  const [nightHealerSaved, setNightHealerSaved] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(() => Boolean(localStorage.getItem(SAVE_KEY)));
  const [revealRoles, setRevealRoles] = useState(true);
  const [pastGames, setPastGames] = useState<Array<{ winner: string; nights: number; playedAt: string }>>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
      return Array.isArray(value) ? value.slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nightTurnIndex, setNightTurnIndex] = useState(0);
  const [traitorVotes, setTraitorVotes] = useState<Record<string, string>>({});
  const [healerTarget, setHealerTarget] = useState<string | null>(null);
  const [dummyTarget, setDummyTarget] = useState<string | null>(null);
  const [investigationsUsed, setInvestigationsUsed] = useState(0);
  const [investigationHistory, setInvestigationHistory] = useState<Record<string, boolean>>({});
  const [lastProtectedTarget, setLastProtectedTarget] = useState<string | null>(null);
  const [mayorBonusUsed, setMayorBonusUsed] = useState(false);
  const [mayorBonusVoterId, setMayorBonusVoterId] = useState<string | null>(null);
  const [mayorWantsBonus, setMayorWantsBonus] = useState(false);
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [voiceRefresh, setVoiceRefresh] = useState(0);
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem(VOICE_PREFERENCE_KEY) || '');
  const [voicesRefreshedAt, setVoicesRefreshedAt] = useState<number | null>(null);
  const [nativeVoices, setNativeVoices] = useState<NativeSpeechVoice[]>([]);
  const [effectsVolume, setEffectsVolume] = useState(0.7);
  const [ambienceVolume, setAmbienceVolume] = useState(0.45);
  const [gameMoments, setGameMoments] = useState<GameMoment[]>([]);

  const alivePlayers = useMemo(() => players.filter(player => player.alive), [players]);
  const aliveTraitors = useMemo(() => alivePlayers.filter(player => isTraitorRole(player.role)), [alivePlayers]);
  const botStatements = useMemo(() => alivePlayers
    .filter(player => player.isBot)
    .slice(0, 4)
    .map(bot => {
      const candidates = alivePlayers.filter(player => player.id !== bot.id && (!isActiveTraitor(bot) || !isActiveTraitor(player)));
      const knownTraitor = bot.role === 'investigator'
        ? candidates.find(player => investigationHistory[player.id] === true)
        : undefined;
      const suspected = knownTraitor || candidates[(night + bot.name.length) % Math.max(1, candidates.length)];
      const detail = !suspected
        ? 'Je préfère encore observer.'
        : bot.botPersonality === 'prudent'
          ? `Je garde un œil sur ${suspected.name}.`
          : bot.botPersonality === 'accuser'
            ? `${suspected.name} me semble le plus suspect pour le moment.`
            : bot.botPersonality === 'discreet'
              ? `Je ne suis pas certain, mais ${suspected.name} m’interroge.`
              : `Mon intuition pointe vers ${suspected.name}.`;
      return { id: bot.id, name: bot.name, detail };
    }), [alivePlayers, investigationHistory, night]);
  const investigator = players.find(player => player.role === 'investigator' && player.alive);
  const protector = players.find(player => player.role === 'protector' && player.alive);
  const healer = players.find(player => player.role === 'healer' && player.alive);
  const cupid = players.find(player => player.role === 'cupid' && player.alive);
  const raven = players.find(player => player.role === 'raven' && player.alive);
  const archivist = players.find(player => player.role === 'archivist' && player.alive);
  const currentRevealPlayer = players[revealIndex];
  const eligibleVoters = alivePlayers.filter(player => player.id !== silencedTarget);
  const currentVoter = eligibleVoters[voterIndex];
  const currentNightPlayer = alivePlayers[nightTurnIndex];
  const familyMemberNames = useMemo(() => new Set(members.map(member => member.name)), [members]);
  const guestNames = names.filter(name => !familyMemberNames.has(name));
  const totalParticipants = names.length + botCount;
  const maximumBots = Math.max(0, 20 - names.length);
  const webFrenchVoices = useMemo(() => {
    void voiceRefresh;
    return getFrenchVoices();
  }, [voiceRefresh]);
  const usesNativeVoice = nativeSpeech.isAvailable();
  const nativeVoicePlatform = nativeSpeech.platform();
  const availableVoices = usesNativeVoice
    ? nativeVoices.map(voice => ({
        id: voice.id,
        name: `${voice.name} · ${voice.language} · ${voice.qualityLabel}${voice.isPersonal ? ' · Personnelle' : ''}${voice.requiresNetwork ? ' · En ligne' : ''}${voice.isInstalled === false ? ' · À télécharger' : ''}`
      }))
    : webFrenchVoices.map(voice => ({ id: voice.voiceURI, name: `${voice.name} · ${voice.lang}` }));

  const refreshAvailableVoices = () => {
    window.speechSynthesis?.cancel();
    if (nativeSpeech.isAvailable()) void nativeSpeech.stop();
    setVoiceRefresh(value => value + 1);
    setVoicesRefreshedAt(Date.now());
  };

  const narrate = useCallback((text: string) => {
    if (!narratorEnabled) return;
    if (nativeSpeech.isAvailable()) void nativeSpeech.speak(text, voiceURI);
    else speakText(text, voiceURI);
  }, [narratorEnabled, voiceURI]);

  const previewVoice = (text: string) => {
    if (nativeSpeech.isAvailable()) void nativeSpeech.speak(text, voiceURI);
    else speakText(text, voiceURI);
  };

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    if (nativeSpeech.isAvailable()) void nativeSpeech.stop();
  }, []);

  useEffect(() => {
    const nightIsActive = stage === 'night-intro' || stage === 'night-player-pass' || stage === 'night-player-action';
    if (soundEnabled && nightIsActive) void startAmbience(ambienceVolume);
    else stopAmbience();
    return () => {
      if (!nightIsActive) stopAmbience();
    };
  }, [ambienceVolume, soundEnabled, stage]);

  useEffect(() => () => stopAmbience(), []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const refreshVoices = () => setVoiceRefresh(value => value + 1);
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
  }, []);

  useEffect(() => {
    if (!nativeSpeech.isAvailable()) return;
    void nativeSpeech.getVoices()
      .then(voices => {
        setNativeVoices(voices);
        if (voiceURI && !voices.some(voice => voice.id === voiceURI)) {
          setVoiceURI('');
          localStorage.removeItem(VOICE_PREFERENCE_KEY);
        }
      })
      .catch(() => setNativeVoices([]));
  }, [voiceRefresh, voiceURI]);

  useEffect(() => {
    if (voiceURI) localStorage.setItem(VOICE_PREFERENCE_KEY, voiceURI);
    else localStorage.removeItem(VOICE_PREFERENCE_KEY);
  }, [voiceURI]);

  useEffect(() => {
    if (!nativeSpeech.isAvailable()) return;
    let active = true;
    let listenerHandle: { remove(): Promise<void> } | undefined;

    void nativeSpeech.onVoicesChanged(voices => {
      if (!active) return;
      setNativeVoices(voices);
      setVoicesRefreshedAt(Date.now());
    }).then(handle => {
      listenerHandle = handle;
    });

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') setVoiceRefresh(value => value + 1);
    };
    document.addEventListener('visibilitychange', refreshOnReturn);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', refreshOnReturn);
      if (listenerHandle) void listenerHandle.remove();
    };
  }, []);

  useEffect(() => {
    if (stage !== 'discussion' || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, stage]);

  useEffect(() => {
    if (stage === 'discussion' && seconds === 0) {
      narrate('Le temps de discussion est terminé. Le vote commence.');
      queueMicrotask(() => {
        setVoterIndex(0);
        setVotes({});
        setStage('vote-pass');
      });
    }
  }, [narrate, seconds, stage]);

  useEffect(() => {
    if (stage === 'setup' || stage === 'finished' || players.length === 0) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      players,
      stage: stage === 'reveal-role' ? 'reveal-pass' : stage,
      revealIndex,
      night,
      shadowTarget,
      protectedTarget,
      oracleTarget,
      oracleResultVisible,
      investigationResult,
      dawnMessage,
      discussionSeconds,
      seconds,
      voterIndex,
      votes,
      voteMessage,
      winner,
      narratorEnabled,
      cupidTargets,
      healerSaveAvailable,
      eliminationHistory,
      soloWinner,
      ravenTarget,
      watcherTarget,
      watcherResultVisible,
      messengerTarget,
      messengerTone,
      messengerMessage,
      confessorTarget,
      confessorUsed,
      silencedTarget,
      archivistUsed,
      nightHealerSaved,
      revealRoles,
      soundEnabled,
      nightTurnIndex,
      traitorVotes,
      healerTarget,
      investigationsUsed,
      investigationHistory,
      lastProtectedTarget,
      mayorBonusUsed,
      mayorBonusVoterId,
      voiceURI,
      effectsVolume,
      ambienceVolume,
      botDifficulty,
      botSpeed,
      botDecisions,
      gameMoments
    }));
  }, [
    archivistUsed, confessorTarget, confessorUsed, cupidTargets, dawnMessage, discussionSeconds, eliminationHistory, healerSaveAvailable,
    investigationResult, night, nightHealerSaved, narratorEnabled, oracleResultVisible, oracleTarget, players, protectedTarget, ravenTarget,
    healerTarget, investigationHistory, investigationsUsed, lastProtectedTarget, mayorBonusUsed, mayorBonusVoterId, messengerMessage, messengerTarget, messengerTone, nightTurnIndex,
    revealIndex, revealRoles, seconds, shadowTarget, soloWinner, soundEnabled, stage, traitorVotes,
    ambienceVolume, botDecisions, botDifficulty, botSpeed, effectsVolume, gameMoments, silencedTarget, voiceURI, voteMessage, voterIndex, votes, watcherResultVisible, watcherTarget, winner
  ]);

  const checkWinner = useCallback((nextPlayers: Player[]) => {
    const alive = nextPlayers.filter(player => player.alive);
    const traitors = alive.filter(isActiveTraitor).length;
    const village = alive.length - traitors;
    if (traitors === 0) return 'village' as const;
    if (traitors >= village) return 'traitors' as const;
    return null;
  }, []);

  const addMoment = (kind: GameMoment['kind'], title: string, detail: string, momentNight = night) => {
    setGameMoments(previous => [...previous, {
      id: crypto.randomUUID(),
      night: momentNight,
      kind,
      title,
      detail
    }]);
  };

  const addBotDecision = (bot: Player, action: string, detail: string) => {
    setBotDecisions(previous => [...previous, {
      id: crypto.randomUUID(),
      night,
      botName: bot.name,
      action,
      detail
    }]);
  };

  const selectBotTarget = (bot: Player, candidates: Player[], preferKnownTraitor = false): Player | undefined => {
    if (candidates.length === 0) return undefined;
    if (preferKnownTraitor && botDifficulty !== 'easy') {
      const knownTraitor = candidates.find(player => investigationHistory[player.id] === true);
      if (knownTraitor) return knownTraitor;
    }
    if (bot.botPersonality === 'prudent') {
      return candidates.find(player => !ravenTarget || player.id !== ravenTarget) || candidates[0];
    }
    if (bot.botPersonality === 'accuser') {
      const previousTargets = Object.values(votes);
      return candidates
        .map(player => ({ player, score: previousTargets.filter(id => id === player.id).length + (player.id === ravenTarget ? 1 : 0) }))
        .sort((left, right) => right.score - left.score)[0]?.player;
    }
    if (bot.botPersonality === 'discreet') {
      return candidates[(bot.name.length + night) % candidates.length];
    }
    return pickRandom(candidates);
  };

  const recordResult = (resultWinner: string) => {
    const result = { winner: resultWinner, nights: night, playedAt: new Date().toISOString() };
    setPastGames(previous => {
      const next = [result, ...previous].slice(0, 5);
      localStorage.setItem(RESULTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const finishWithWinner = (nextWinner: 'village' | 'traitors') => {
    setWinner(nextWinner);
    setStage('finished');
    navigator.vibrate?.([120, 80, 180]);
    if (soundEnabled) playEffect('victory', effectsVolume);
    addMoment('result', 'Fin de la partie', nextWinner === 'village' ? 'Le Village a démasqué tous les Traîtres.' : 'Les Traîtres ont pris le contrôle du Village.');
    narrate(nextWinner === 'village'
      ? 'Les derniers Traîtres sont démasqués. Le Village remporte la partie.'
      : 'Les Traîtres de la nuit contrôlent désormais le Village.');
    localStorage.removeItem(SAVE_KEY);
    setResumeAvailable(false);
    recordResult(nextWinner === 'village' ? 'Village' : 'Traîtres');
    onFinished?.(nextWinner, night);
  };

  const startGame = () => {
    const cleanNames = names.map(name => name.trim()).filter(Boolean).slice(0, 20);
    const requestedBots = Math.min(botCount, 20 - cleanNames.length);
    const availableBotNames = customBotNames.filter(name => name.trim() && !cleanNames.some(humanName => humanName.toLowerCase() === name.trim().toLowerCase()));
    const botNames = Array.from({ length: requestedBots }, (_, index) => `${availableBotNames[index] || `Joueur ${index + 1}`} · Ordi`);
    const participants = [
      ...cleanNames.map(name => ({ name, isBot: false })),
      ...botNames.map(name => ({ name, isBot: true }))
    ];
    if (cleanNames.length < 1 || participants.length < 5) return;
    const roles = buildRoles(participants.length, enabledRoles, cleanNames.length);
    let nextPlayers = shuffle(participants.map((participant, index) => ({
      id: `player-${Date.now()}-${index}`,
      name: participant.name,
      role: roles[index],
      alive: true,
      isBot: participant.isBot,
      botPersonality: participant.isBot ? BOT_PERSONALITIES[index % BOT_PERSONALITIES.length] : undefined,
      elderShield: roles[index] === 'elder',
      diplomatShield: roles[index] === 'diplomat'
    })));
    const twins = nextPlayers.filter(player => player.role === 'twin');
    if (twins.length >= 2) {
      nextPlayers = nextPlayers.map(player => (
        player.id === twins[0].id ? { ...player, twinId: twins[1].id } :
        player.id === twins[1].id ? { ...player, twinId: twins[0].id } :
        player
      ));
    }
    setPlayers(nextPlayers);
    setRevealIndex(Math.max(0, nextPlayers.findIndex(player => !player.isBot)));
    setRoleVisible(false);
    setNight(1);
    setWinner(null);
    setSoloWinner(null);
    setEliminationHistory([]);
    setHealerSaveAvailable(true);
    setCupidTargets([]);
    setRavenTarget(null);
    setWatcherTarget(null);
    setWatcherResultVisible(false);
    setMessengerTarget(null);
    setMessengerMessage('');
    setConfessorTarget(null);
    setConfessorUsed(false);
    setSilencedTarget(null);
    setArchivistUsed(false);
    setNightHealerSaved(false);
    setNightTurnIndex(0);
    setTraitorVotes({});
    setHealerTarget(null);
    setInvestigationsUsed(0);
    setInvestigationHistory({});
    setOracleTarget(null);
    setOracleResultVisible(false);
    setInvestigationResult(null);
    setLastProtectedTarget(null);
    setMayorBonusUsed(false);
    setMayorBonusVoterId(null);
    setMayorWantsBonus(false);
    setVoteTarget(null);
    setFastForwardBots(false);
    setBotDecisions([]);
    setGameMoments([{ id: crypto.randomUUID(), night: 0, kind: 'start', title: 'Début de la partie', detail: `${participants.length} personnes entrent dans le Village, dont ${botNames.length} gérée${botNames.length > 1 ? 's' : ''} par l’ordinateur.` }]);
    if (soundEnabled) void playEffect('success', effectsVolume);
    setStage('reveal-pass');
    setResumeAvailable(true);
    narrate('Village Secret commence. Passez le téléphone à chaque joueur pour découvrir son rôle secret.');
  };

  const resumeGame = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (!Array.isArray(saved.players) || saved.players.length < 5) return;
      setPlayers(saved.players.map((player: Player) => ({
        ...player,
        elderShield: player.elderShield ?? player.role === 'elder',
        diplomatShield: player.diplomatShield ?? player.role === 'diplomat'
      })));
      setStage(saved.stage || 'night-intro');
      setRevealIndex(saved.revealIndex || 0);
      setNight(saved.night || 1);
      setShadowTarget(saved.shadowTarget || null);
      setProtectedTarget(saved.protectedTarget || null);
      setOracleTarget(saved.oracleTarget || null);
      setOracleResultVisible(Boolean(saved.oracleResultVisible));
      setInvestigationResult(saved.investigationResult || null);
      setDawnMessage(saved.dawnMessage || '');
      setDiscussionSeconds(saved.discussionSeconds || 120);
      setSeconds(saved.seconds || saved.discussionSeconds || 120);
      setVoterIndex(saved.voterIndex || 0);
      setVotes(saved.votes || {});
      setVoteMessage(saved.voteMessage || '');
      setWinner(saved.winner || null);
      setNarratorEnabled(saved.narratorEnabled !== false);
      setCupidTargets(saved.cupidTargets || []);
      setHealerSaveAvailable(saved.healerSaveAvailable !== false);
      setEliminationHistory(saved.eliminationHistory || []);
      setSoloWinner(saved.soloWinner || null);
      setRavenTarget(saved.ravenTarget || null);
      setWatcherTarget(saved.watcherTarget || null);
      setWatcherResultVisible(Boolean(saved.watcherResultVisible));
      setMessengerTarget(saved.messengerTarget || null);
      setMessengerTone(saved.messengerTone || 'doubt');
      setMessengerMessage(saved.messengerMessage || '');
      setConfessorTarget(saved.confessorTarget || null);
      setConfessorUsed(Boolean(saved.confessorUsed));
      setSilencedTarget(saved.silencedTarget || null);
      setArchivistUsed(Boolean(saved.archivistUsed));
      setNightHealerSaved(Boolean(saved.nightHealerSaved));
      setRevealRoles(saved.revealRoles !== false);
      setSoundEnabled(saved.soundEnabled !== false);
      setNightTurnIndex(saved.nightTurnIndex || 0);
      setTraitorVotes(saved.traitorVotes || {});
      setHealerTarget(saved.healerTarget || null);
      setInvestigationsUsed(saved.investigationsUsed || 0);
      setInvestigationHistory(saved.investigationHistory || {});
      setLastProtectedTarget(saved.lastProtectedTarget || null);
      setMayorBonusUsed(Boolean(saved.mayorBonusUsed));
      setMayorBonusVoterId(saved.mayorBonusVoterId || null);
      setEffectsVolume(saved.effectsVolume ?? 0.7);
      setAmbienceVolume(saved.ambienceVolume ?? 0.45);
      setBotDifficulty(saved.botDifficulty || 'normal');
      setBotSpeed(saved.botSpeed || 'normal');
      setBotDecisions(saved.botDecisions || []);
      setGameMoments(saved.gameMoments || []);
    } catch {
      localStorage.removeItem(SAVE_KEY);
      setResumeAvailable(false);
    }
  };

  const addGuest = () => {
    const value = guestName.trim();
    if (!value || names.some(name => name.toLowerCase() === value.toLowerCase()) || names.length + botCount >= 20) return;
    setNames(previous => [...previous, value]);
    setGuestName('');
  };

  const continueReveal = () => {
    setRoleVisible(false);
    const nextHumanIndex = players.findIndex((player, index) => index > revealIndex && !player.isBot);
    if (nextHumanIndex >= 0) {
      setRevealIndex(nextHumanIndex);
      setStage('reveal-pass');
      return;
    }
    setStage('night-intro');
    narrate('Tous les rôles sont distribués. Le Village s’endort. Que chacun ferme les yeux.');
  };

  const confirmCupid = () => {
    if (cupidTargets.length !== 2) return;
    const [firstId, secondId] = cupidTargets;
    setPlayers(previous => previous.map(player => {
      if (player.id === firstId) return { ...player, linkedId: secondId };
      if (player.id === secondId) return { ...player, linkedId: firstId };
      return player;
    }));
    setStage('night-intro');
    narrate('Le lien secret est créé. Cupidon se rendort et le Village ferme les yeux.');
  };

  const startNightActions = () => {
    if (soundEnabled) void playEffect('danger', effectsVolume);
    setShadowTarget(null);
    setProtectedTarget(null);
    setOracleTarget(null);
    setOracleResultVisible(false);
    setInvestigationResult(null);
    setRavenTarget(null);
    setWatcherTarget(null);
    setWatcherResultVisible(false);
    setMessengerTarget(null);
    setMessengerMessage('');
    setConfessorTarget(null);
    setSilencedTarget(null);
    setArchivistTarget(null);
    setArchivistResultVisible(false);
    setNightHealerSaved(false);
    setNightTurnIndex(0);
    setTraitorVotes({});
    setHealerTarget(null);
    setDummyTarget(null);
    setStage('night-player-pass');
    narrate(`Nuit ${night}. Le téléphone va passer entre toutes les personnes encore en jeu.`);
  };

  const resolveTraitorTarget = (nightVotes: Record<string, string>): string | null => {
    const orderedVotes = alivePlayers
      .filter(player => (player.role === 'traitor' || player.role === 'repentant') && isActiveTraitor(player))
      .map(player => nightVotes[player.id])
      .filter(Boolean);
    if (orderedVotes.length === 0) return null;
    const counts = orderedVotes.reduce<Record<string, number>>((accumulator, targetId) => {
      accumulator[targetId] = (accumulator[targetId] || 0) + 1;
      return accumulator;
    }, {});
    const highest = Math.max(...Object.values(counts));
    const leaders = Object.keys(counts).filter(targetId => counts[targetId] === highest);
    return [...orderedVotes].reverse().find(targetId => leaders.includes(targetId)) || leaders[0] || null;
  };

  const advanceNightTurn = (
    nextTraitorVotes = traitorVotes,
    nextProtectionTarget = protectedTarget,
    nextHealerTarget = healerTarget,
    nextRavenTarget = ravenTarget,
    nextMessengerMessage = messengerMessage,
    nextConfessorTarget = confessorTarget,
    nextSilencedTarget = silencedTarget
  ) => {
    if (soundEnabled) void playEffect('success', effectsVolume);
    setOracleResultVisible(false);
    setInvestigationResult(null);
    setDummyTarget(null);
    if (nightTurnIndex + 1 < alivePlayers.length) {
      setNightTurnIndex(value => value + 1);
      setStage('night-player-pass');
      if (!currentNightPlayer?.isBot) {
        narrate('Choix enregistré. Passez le téléphone à la personne suivante.');
      }
      return;
    }
    const attackTarget = resolveTraitorTarget(nextTraitorVotes);
    setShadowTarget(attackTarget);
    const attacked = players.find(player => player.id === attackTarget);
    if (attacked) addMoment('night', `Choix des Traîtres`, `${attacked.name} a été choisi pendant la nuit.`);
    resolveDawn(
      Boolean(attackTarget && nextHealerTarget === attackTarget),
      attackTarget,
      nextProtectionTarget,
      nextRavenTarget,
      nextMessengerMessage,
      nextConfessorTarget,
      nextSilencedTarget
    );
  };

  const afterShadow = () => {
    if (investigator) {
      setStage('night-oracle-pass');
      narrate('Le premier choix est enregistré. Passez discrètement le téléphone à la personne indiquée à l’écran.');
    } else if (protector) {
      setStage('night-guardian-pass');
      narrate('Passez discrètement le téléphone à la personne indiquée à l’écran.');
    } else if (healer && healerSaveAvailable && shadowTarget) {
      setStage('night-healer-pass');
      narrate('Passez discrètement le téléphone à la personne indiquée à l’écran.');
    } else {
      continueNightSupport(false);
    }
  };

  const afterOracle = () => {
    setOracleResultVisible(false);
    setInvestigationResult(null);
    if (protector) {
      setStage('night-guardian-pass');
      narrate('Le choix est enregistré. Passez discrètement le téléphone à la personne indiquée à l’écran.');
    } else if (healer && healerSaveAvailable && shadowTarget) {
      setStage('night-healer-pass');
      narrate('Passez discrètement le téléphone à la personne indiquée à l’écran.');
    } else {
      continueNightSupport(false);
    }
  };

  const revealInvestigation = (playerId: string) => {
    const checked = players.find(player => player.id === playerId);
    if (!checked) return;
    const result = { playerId: checked.id, isTraitor: isActiveTraitor(checked) };
    setOracleTarget(checked.id);
    setInvestigationResult(result);
    setOracleResultVisible(true);
    setInvestigationsUsed(value => value + 1);
    setInvestigationHistory(previous => ({ ...previous, [checked.id]: result.isTraitor }));
    addMoment('investigation', 'Vérification de l’Enquêteur', `${checked.name} ${result.isTraitor ? 'était un Traître' : 'n’était pas un Traître'}.`);
    if (soundEnabled) void playEffect(result.isTraitor ? 'danger' : 'success', effectsVolume);
    navigator.vibrate?.(result.isTraitor ? [90, 60, 120] : 70);
  };

  const runBotNightTurn = (bot: Player) => {
    const otherAlive = alivePlayers.filter(player => player.id !== bot.id);
    if (bot.role === 'traitor' || bot.role === 'repentant') {
      const target = selectBotTarget(bot, otherAlive.filter(player => !isTraitorRole(player.role)));
      if (!target) return advanceNightTurn();
      const nextVotes = { ...traitorVotes, [bot.id]: target.id };
      setTraitorVotes(nextVotes);
      addBotDecision(bot, 'Vote nocturne', `a choisi ${target.name}.`);
      return advanceNightTurn(nextVotes);
    }
    if (bot.role === 'investigator') {
      const canInvestigate = players.length <= 6
        ? investigationsUsed < 1
        : players.length <= 9
          ? night % 2 === 1
          : true;
      const target = canInvestigate
        ? selectBotTarget(bot, otherAlive.filter(player => !(player.id in investigationHistory)))
        : undefined;
      if (target) {
        setInvestigationsUsed(value => value + 1);
        setInvestigationHistory(previous => ({ ...previous, [target.id]: isActiveTraitor(target) }));
        addBotDecision(bot, 'Enquête', `a vérifié ${target.name}, qui ${isActiveTraitor(target) ? 'était dans le camp des Traîtres' : 'était innocent'}.`);
      }
      return advanceNightTurn();
    }
    if (bot.role === 'protector') {
      const canProtect = players.length >= 7 || night % 2 === 1;
      const target = canProtect
        ? selectBotTarget(bot, alivePlayers.filter(player => player.id !== lastProtectedTarget))
        : undefined;
      if (target) {
        setProtectedTarget(target.id);
        setLastProtectedTarget(target.id);
        addBotDecision(bot, 'Protection', `a protégé ${target.name}.`);
        return advanceNightTurn(traitorVotes, target.id);
      }
      return advanceNightTurn();
    }
    if (bot.role === 'healer' && healerSaveAvailable && Math.random() < (botDifficulty === 'hard' ? 0.25 : 0.12)) {
      const target = selectBotTarget(bot, alivePlayers);
      if (target) {
        setHealerSaveAvailable(false);
        setHealerTarget(target.id);
        addBotDecision(bot, 'Remède', `a tenté de sauver ${target.name}.`);
        return advanceNightTurn(traitorVotes, protectedTarget, target.id);
      }
    }
    if (bot.role === 'cupid' && night === 1 && !players.some(player => player.linkedId)) {
      const targets = shuffle(alivePlayers).slice(0, 2);
      if (targets.length === 2) {
        setPlayers(previous => previous.map(player => (
          player.id === targets[0].id ? { ...player, linkedId: targets[1].id } :
          player.id === targets[1].id ? { ...player, linkedId: targets[0].id } :
          player
        )));
        addBotDecision(bot, 'Lien secret', `a lié ${targets[0].name} et ${targets[1].name}.`);
      }
      return advanceNightTurn();
    }
    if (bot.role === 'raven') {
      const target = selectBotTarget(bot, otherAlive, botDifficulty === 'hard');
      if (target) {
        setRavenTarget(target.id);
        addBotDecision(bot, 'Marque du Corbeau', `a placé une voix contre ${target.name}.`);
        return advanceNightTurn(traitorVotes, protectedTarget, healerTarget, target.id);
      }
      return advanceNightTurn();
    }
    if (bot.role === 'watcher') {
      const target = selectBotTarget(bot, otherAlive);
      if (target) addBotDecision(bot, 'Veille', `a observé ${target.name}, qui ${hasNightAction(target.role) ? 'avait une action nocturne' : 'n’avait pas d’action nocturne'}.`);
      return advanceNightTurn();
    }
    if (bot.role === 'messenger') {
      const target = selectBotTarget(bot, otherAlive, botDifficulty === 'hard');
      if (target) {
        const tone = isActiveTraitor(target) ? 'doubt' : 'trust';
        const message = `Message anonyme : ${tone === 'trust' ? 'faites confiance à' : 'méfiez-vous de'} ${target.name}.`;
        setMessengerMessage(message);
        addBotDecision(bot, 'Message', `a conseillé de ${tone === 'trust' ? 'faire confiance à' : 'se méfier de'} ${target.name}.`);
        return advanceNightTurn(traitorVotes, protectedTarget, healerTarget, ravenTarget, message);
      }
      return advanceNightTurn();
    }
    if (bot.role === 'confessor' && !confessorUsed) {
      const target = selectBotTarget(bot, otherAlive.filter(player => !isTraitorRole(player.role)));
      if (target) {
        setConfessorTarget(target.id);
        setConfessorUsed(true);
        addBotDecision(bot, 'Confession', `a protégé ${target.name} du vote suivant.`);
        return advanceNightTurn(traitorVotes, protectedTarget, healerTarget, ravenTarget, messengerMessage, target.id);
      }
      return advanceNightTurn();
    }
    if (bot.role === 'silencer') {
      const target = selectBotTarget(bot, otherAlive.filter(player => !isTraitorRole(player.role)));
      if (target) {
        setSilencedTarget(target.id);
        addBotDecision(bot, 'Silence', `a retiré le droit de vote de ${target.name}.`);
        return advanceNightTurn(traitorVotes, protectedTarget, healerTarget, ravenTarget, messengerMessage, confessorTarget, target.id);
      }
      return advanceNightTurn();
    }
    if (bot.role === 'archivist' && !archivistUsed && eliminationHistory.length > 0) {
      setArchivistUsed(true);
      addBotDecision(bot, 'Archives', `a consulté les archives du Village.`);
      return advanceNightTurn();
    }
    return advanceNightTurn();
  };

  const afterProtector = () => {
    if (healer && healerSaveAvailable && shadowTarget && shadowTarget !== protectedTarget) {
      setStage('night-healer-pass');
      narrate('Le choix est enregistré. Passez discrètement le téléphone à la personne indiquée à l’écran.');
      return;
    }
    continueNightSupport(false);
  };

  function continueNightSupport(healerSaved: boolean) {
    setNightHealerSaved(healerSaved);
    if (raven) {
      setStage('night-raven-pass');
      narrate('Passez discrètement le téléphone à la personne indiquée à l’écran.');
      return;
    }
    if (archivist && !archivistUsed && eliminationHistory.length > 0) {
      setStage('night-archivist-pass');
      narrate('Passez discrètement le téléphone à la personne indiquée à l’écran.');
      return;
    }
    resolveDawn(healerSaved);
  }

  const afterRaven = () => {
    if (archivist && !archivistUsed && eliminationHistory.length > 0) {
      setStage('night-archivist-pass');
      narrate('Le choix est enregistré. Passez discrètement le téléphone à la personne indiquée à l’écran.');
      return;
    }
    resolveDawn(nightHealerSaved);
  };

  const finishArchivist = () => {
    setArchivistResultVisible(false);
    resolveDawn(nightHealerSaved);
  };

  const resolveLinkedEliminations = (initialId: string) => {
    const eliminatedIds = new Set<string>([initialId]);
    let changed = true;
    while (changed) {
      changed = false;
      players.forEach(player => {
        if (!eliminatedIds.has(player.id)) return;
        [player.linkedId, player.twinId].filter(Boolean).forEach(relatedId => {
          if (!eliminatedIds.has(relatedId!)) {
            eliminatedIds.add(relatedId!);
            changed = true;
          }
        });
      });
    }
    return eliminatedIds;
  };

  const applyRepentantConversion = (nextPlayers: Player[], eliminatedIds: Set<string>) => {
    const traitorFell = players.some(player => eliminatedIds.has(player.id) && isActiveTraitor(player) && player.role !== 'repentant');
    if (!traitorFell) return nextPlayers;
    return nextPlayers.map(player => (
      player.alive && player.role === 'repentant' && !player.hasRepented
        ? { ...player, hasRepented: true, repentanceNoticePending: true }
        : player
    ));
  };

  const resolveDawn = (
    healerSaved = false,
    attackTarget: string | null = shadowTarget,
    protectionTarget: string | null = protectedTarget,
    markedTarget: string | null = ravenTarget,
    deliveredMessage = messengerMessage,
    absolvedTarget: string | null = confessorTarget,
    mutedTarget: string | null = silencedTarget
  ) => {
    let nextPlayers = players;
    let message = 'Le jour se lève. Cette nuit, personne n’a été éliminé.';
    if (attackTarget && attackTarget !== protectionTarget && !healerSaved) {
      const victim = players.find(player => player.id === attackTarget);
      if (victim?.role === 'elder' && victim.elderShield) {
        nextPlayers = players.map(player => player.id === attackTarget ? { ...player, elderShield: false } : player);
        message = `${victim.name} a mystérieusement résisté à cette attaque nocturne.`;
      } else {
        const eliminatedIds = resolveLinkedEliminations(attackTarget);
        nextPlayers = applyRepentantConversion(
          players.map(player => eliminatedIds.has(player.id) ? { ...player, alive: false } : player),
          eliminatedIds
        );
        const linkedVictims = players.filter(player => eliminatedIds.has(player.id) && player.id !== attackTarget);
        const entries = players
          .filter(player => eliminatedIds.has(player.id))
          .map(player => ({
            night,
            name: player.name,
            role: player.role,
            cause: player.id === attackTarget ? 'Attaque nocturne' : player.twinId && eliminatedIds.has(player.twinId) ? 'Lien des Jumeaux' : 'Lien de Cupidon'
          }));
        setEliminationHistory(previous => [...previous, ...entries]);
        message = `Le jour se lève. ${victim?.name || 'Une personne'} a été éliminé${linkedVictims.length ? `, et ${linkedVictims.map(player => player.name).join(', ')} l’a suivi à cause d’un lien secret` : ''}.`;
      }
      setPlayers(nextPlayers);
    } else if (attackTarget && attackTarget === protectionTarget) {
      message = 'Une protection mystérieuse a déjoué l’attaque : personne n’a été éliminé.';
    } else if (healerSaved) {
      message = 'Un remède mystérieux a empêché l’élimination cette nuit.';
    }
    if (markedTarget) {
      const marked = players.find(player => player.id === markedTarget);
      if (marked) message += ` Le Corbeau place une voix contre ${marked.name} pour le prochain vote.`;
    }
    if (deliveredMessage) message += ` ${deliveredMessage}`;
    if (absolvedTarget) {
      const absolved = players.find(player => player.id === absolvedTarget);
      if (absolved) message += ` Le Confesseur protège publiquement ${absolved.name} du prochain vote.`;
    }
    if (mutedTarget) {
      const silenced = players.find(player => player.id === mutedTarget);
      if (silenced) message += ` ${silenced.name} ne participera pas au vote aujourd’hui.`;
    }
    setDawnMessage(message);
    setStage('dawn');
    addMoment(
      message.includes('éliminé') ? 'result' : 'protection',
      `Lever du jour ${night}`,
      message
    );
    if (soundEnabled) playEffect(message.includes('éliminé') ? 'danger' : 'success', effectsVolume);
    narrate(message);
    const nextWinner = checkWinner(nextPlayers);
    if (nextWinner) window.setTimeout(() => finishWithWinner(nextWinner), 900);
  };

  const startDiscussion = () => {
    setSeconds(discussionSeconds);
    setStage('discussion');
    narrate(`Le débat commence. Vous avez ${discussionSeconds / 60} minute${discussionSeconds > 60 ? 's' : ''} pour identifier un Traître.`);
  };

  const submitVote = (targetId: string, useMayorBonus = false) => {
    if (!currentVoter) return;
    if (soundEnabled) void playEffect('success', effectsVolume);
    const nextVotes = { ...votes, [currentVoter.id]: targetId };
    const nextMayorBonusVoterId = useMayorBonus ? currentVoter.id : mayorBonusVoterId;
    setVotes(nextVotes);
    if (useMayorBonus) {
      setMayorBonusUsed(true);
      setMayorBonusVoterId(currentVoter.id);
    }
    setMayorWantsBonus(false);
    setVoteTarget(null);
    if (voterIndex + 1 < eligibleVoters.length) {
      setVoterIndex(value => value + 1);
      setStage('vote-pass');
      return;
    }
    const counts = Object.entries(nextVotes).reduce<Record<string, number>>((accumulator, [voterId, targetId]) => {
      const voter = players.find(player => player.id === voterId);
      const mayorAddsVoice = voter?.role === 'mayor'
        && (players.length >= 7 || voterId === nextMayorBonusVoterId);
      accumulator[targetId] = (accumulator[targetId] || 0) + (mayorAddsVoice ? 2 : 1);
      return accumulator;
    }, ravenTarget ? { [ravenTarget]: 1 } : {});
    const highest = Math.max(...Object.values(counts));
    const leaders = Object.entries(counts).filter(([, count]) => count === highest).map(([id]) => id);
    if (leaders.length !== 1) {
      setVoteMessage('Le vote se termine sur une égalité. Personne ne quitte le Village.');
      setStage('vote-result');
      if (soundEnabled) playEffect('danger', effectsVolume);
      narrate('Égalité parfaite. Personne ne quitte le Village.');
      addMoment('vote', `Vote du jour ${night}`, 'Le vote s’est terminé sur une égalité.');
      return;
    }
    const eliminated = players.find(player => player.id === leaders[0]);
    if (eliminated?.role === 'jester') {
      setSoloWinner(eliminated.name);
      setVoteMessage(`${eliminated.name} était le Farceur et voulait précisément être éliminé par le vote. Victoire du Farceur !`);
      setStage('finished');
      localStorage.removeItem(SAVE_KEY);
      setResumeAvailable(false);
      recordResult(`Farceur · ${eliminated.name}`);
      if (soundEnabled) playEffect('victory', effectsVolume);
      navigator.vibrate?.([100, 60, 100, 60, 180]);
      narrate(`${eliminated.name} était le Farceur. Il remporte immédiatement la partie.`);
      addMoment('vote', `Vote du jour ${night}`, `${eliminated.name} a été choisi et remporte la partie en tant que Farceur.`);
      return;
    }
    if (eliminated?.role === 'diplomat' && eliminated.diplomatShield) {
      setPlayers(previous => previous.map(player => player.id === eliminated.id ? { ...player, diplomatShield: false } : player));
      setVoteMessage(`${eliminated.name} révèle son rôle de Diplomate et annule cette première décision contre lui.`);
      setStage('vote-result');
      if (soundEnabled) playEffect('success', effectsVolume);
      narrate(`${eliminated.name} était le Diplomate. Il reste dans le Village cette fois-ci.`);
      addMoment('vote', `Vote du jour ${night}`, `${eliminated.name} a annulé sa première élimination grâce au Diplomate.`);
      return;
    }
    const eliminatedIds = resolveLinkedEliminations(leaders[0]);
    const nextPlayers = applyRepentantConversion(
      players.map(player => eliminatedIds.has(player.id) ? { ...player, alive: false } : player),
      eliminatedIds
    );
    setPlayers(nextPlayers);
    const linkedVictims = players.filter(player => eliminatedIds.has(player.id) && player.id !== leaders[0]);
    setEliminationHistory(previous => [
      ...previous,
      ...players
        .filter(player => eliminatedIds.has(player.id))
        .map(player => ({
          night,
          name: player.name,
          role: player.role,
          cause: player.id === leaders[0] ? 'Vote du village' : player.twinId && eliminatedIds.has(player.twinId) ? 'Lien des Jumeaux' : 'Lien de Cupidon'
        }))
    ]);
    setVoteMessage(`${eliminated?.name} quitte le Village.${revealRoles && eliminated ? ` Son rôle était ${ROLE_INFO[eliminated.role].name}.` : ''}${linkedVictims.length ? ` ${linkedVictims.map(player => player.name).join(', ')} le suit à cause d’un lien secret.` : ''}`);
    setStage('vote-result');
    if (soundEnabled) playEffect('danger', effectsVolume);
    narrate(`${eliminated?.name} quitte le Village.${revealRoles && eliminated ? ` Son rôle est révélé à l’écran.` : ''}`);
    if (eliminated) addMoment('vote', `Vote du jour ${night}`, `${eliminated.name} a quitté le Village avec ${highest} voix.`);
    const nextWinner = checkWinner(nextPlayers);
    if (nextWinner) window.setTimeout(() => finishWithWinner(nextWinner), 900);
  };

  const runBotVote = (bot: Player) => {
    let candidates = alivePlayers.filter(player => player.id !== bot.id && player.id !== confessorTarget);
    if (isActiveTraitor(bot)) {
      candidates = candidates.filter(player => !isActiveTraitor(player));
    }
    if (bot.role === 'investigator' && botDifficulty !== 'easy') {
      const knownTraitor = candidates.find(player => investigationHistory[player.id] === true);
      if (knownTraitor) {
        addBotDecision(bot, 'Vote du Village', `a voté contre ${knownTraitor.name}.`);
        submitVote(knownTraitor.id);
        return;
      }
    }
    const target = selectBotTarget(bot, candidates, botDifficulty === 'hard');
    if (!target) return;
    const useMayorBonus = bot.role === 'mayor'
      && !mayorBonusUsed
      && (botDifficulty === 'hard' || (botDifficulty === 'normal' && Math.random() < 0.4));
    addBotDecision(bot, 'Vote du Village', `a voté contre ${target.name}${useMayorBonus ? ' avec la voix du Maire' : ''}.`);
    submitVote(target.id, useMayorBonus);
  };

  const nextNight = () => {
    if (soundEnabled) void playEffect('danger', effectsVolume);
    setNight(value => value + 1);
    setStage('night-intro');
    narrate('La nuit revient sur le Village. Tout le monde ferme les yeux.');
  };

  const resetGame = () => {
    window.speechSynthesis?.cancel();
    setPlayers([]);
    setStage('setup');
    setRevealIndex(0);
    setVotes({});
    setWinner(null);
    setRoleVisible(false);
    localStorage.removeItem(SAVE_KEY);
    setResumeAvailable(false);
  };

  if (stage === 'setup') {
    return (
      <section className="night-village overflow-hidden rounded-[28px] border border-[#9E94FF]/20 bg-[#0B1020] p-5 sm:p-7">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#9E94FF]/25 bg-[#9E94FF]/10">
            <Moon className="h-8 w-8 text-[#C4BEFF]" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-white">Village Secret</h2>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-white/55">Un jeu familial où chacun reçoit un personnage secret. Le maître du jeu automatique explique chaque étape, même sans connexion.</p>
        </div>

        {resumeAvailable && (
          <button type="button" onClick={resumeGame} className="mt-5 flex w-full items-center justify-between rounded-2xl border border-[#00D26A]/25 bg-[#00D26A]/10 p-4 text-left">
            <span>
              <strong className="block text-sm text-white">Reprendre la partie</strong>
              <span className="mt-1 block text-[10px] text-white/50">La progression est enregistrée uniquement sur cet appareil.</span>
            </span>
            <Save className="h-5 w-5 text-[#00D26A]" />
          </button>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setShowRules(value => !value)} className={`rounded-2xl border p-3 text-left ${showRules ? 'border-[#9E94FF]/35 bg-[#9E94FF]/10' : 'border-white/8 bg-white/5'}`}>
            <BookOpen className="h-5 w-5 text-[#9E94FF]" />
            <strong className="mt-2 block text-xs text-white">Comment jouer</strong>
          </button>
          <button type="button" onClick={() => setShowRoleSettings(value => !value)} className={`rounded-2xl border p-3 text-left ${showRoleSettings ? 'border-[#FFB020]/35 bg-[#FFB020]/10' : 'border-white/8 bg-white/5'}`}>
            <Settings2 className="h-5 w-5 text-[#FFB020]" />
            <strong className="mt-2 block text-xs text-white">Choix des personnages</strong>
          </button>
        </div>

        {showRules && (
          <div className="mt-3 rounded-2xl border border-white/8 bg-white/5 p-4">
            <ol className="space-y-3 text-xs leading-relaxed text-white/65">
              <li><strong className="text-white">1. Distribution :</strong> chacun consulte sa carte secrète puis masque l’écran.</li>
              <li><strong className="text-white">2. Nuit :</strong> le téléphone passe à tout le monde. Certains choix ont un effet, les autres servent seulement à garder le secret.</li>
              <li><strong className="text-white">3. Jour :</strong> la victime est annoncée, puis la famille débat pendant le temps choisi.</li>
              <li><strong className="text-white">4. Vote :</strong> chaque joueur vote seul. Le Village gagne en éliminant tous les Traîtres.</li>
            </ol>
          </div>
        )}

        {showRoleSettings && (
          <div className="mt-3 space-y-4 rounded-2xl border border-white/8 bg-white/5 p-4">
            <div className="grid grid-cols-3 gap-2">
              {([
                ['Essentiel', ['investigator', 'protector']],
                ['Classique', ['investigator', 'protector', 'healer', 'cupid', 'elder', 'mayor']],
                ['Complet', DEFAULT_SPECIAL_ROLES]
              ] as Array<[string, Role[]]>).map(([label, roles]) => (
                <button key={label} type="button" onClick={() => setEnabledRoles(roles)} className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-[9px] font-black text-white/70">
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SPECIAL_ROLES.map(role => {
                const active = enabledRoles.includes(role);
                const info = ROLE_INFO[role];
                return (
                  <button key={role} type="button" onClick={() => setEnabledRoles(previous => active ? previous.filter(item => item !== role) : [...previous, role])} className={`min-h-24 rounded-2xl border p-3 text-left ${active ? 'border-[#9E94FF]/40 bg-[#9E94FF]/10' : 'border-white/8 bg-black/10 opacity-55'}`}>
                    <RolePortrait role={role} className="w-full rounded-xl" />
                    <strong className="mt-2 block text-[10px] text-white">{info.name}</strong>
                    <span className="mt-1 block text-[9px] leading-relaxed text-white/45">{info.description}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
              <span>
                <strong className="block text-xs text-white">Révéler les rôles éliminés</strong>
                <span className="mt-1 block text-[9px] text-white/45">Désactivez pour une partie plus difficile et donner plus de valeur à l’Archiviste.</span>
              </span>
              <button type="button" role="switch" aria-checked={revealRoles} onClick={() => setRevealRoles(value => !value)} className={`relative h-7 w-12 shrink-0 rounded-full ${revealRoles ? 'bg-[#00D26A]' : 'bg-white/15'}`}>
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${revealRoles ? 'translate-x-5' : ''}`} />
              </button>
            </label>
          </div>
        )}

        <div className="mt-5 grid grid-cols-4 gap-2">
          {(['traitor', 'investigator', 'protector', 'mayor'] as Role[]).map(role => (
            <div key={role} className="rounded-2xl border border-white/8 bg-white/5 p-3 text-center">
              <RolePortrait role={role} className="mx-auto w-full rounded-xl" />
              <strong className="mt-2 block text-[9px] text-white">{ROLE_INFO[role].name}</strong>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <strong className="text-xs text-white">Joueurs · {totalParticipants}/20</strong>
            <span className={`text-[10px] font-black ${names.length >= 1 && totalParticipants >= 5 ? 'text-[#00D26A]' : 'text-[#FFB020]'}`}>{names.length < 1 ? '1 humain minimum' : totalParticipants >= 5 ? 'Prêt' : '5 joueurs minimum'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {members.slice(0, 20).map(member => {
              const selected = names.includes(member.name);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setNames(previous => selected ? previous.filter(name => name !== member.name) : previous.length + botCount < 20 ? [...previous, member.name] : previous)}
                  className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-left ${selected ? 'border-[#00D26A]/35 bg-[#00D26A]/10' : 'border-white/8 bg-white/5'}`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-[#00D26A] bg-[#00D26A] text-[#07111F]' : 'border-white/20 text-transparent'}`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className={`truncate text-[10px] font-black ${selected ? 'text-white' : 'text-white/45'}`}>{member.name}</span>
                </button>
              );
            })}
          </div>
          {guestNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {guestNames.map(name => (
                <button key={name} type="button" onClick={() => setNames(previous => previous.filter(item => item !== name))} className="rounded-full border border-[#9E94FF]/20 bg-[#9E94FF]/10 px-3 py-2 text-[10px] font-black text-white/70">
                  {name} <X className="ml-1 inline h-3 w-3 text-[#FF9BAF]" />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={guestName} onChange={event => setGuestName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addGuest(); }} placeholder="Ajouter un joueur invité" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none" />
            <button type="button" onClick={addGuest} disabled={!guestName.trim() || totalParticipants >= 20} className="rounded-2xl bg-[#6C5CFF] px-4 text-white disabled:opacity-40" title="Ajouter"><UserPlus className="h-5 w-5" /></button>
          </div>

          <div className="rounded-2xl border border-[#4F8CFF]/20 bg-[#4F8CFF]/8 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4F8CFF]/12 text-[#8AB5FF]"><Bot className="h-5 w-5" /></span>
                <span>
                  <strong className="block text-xs text-white">Joueurs ordinateur</strong>
                  <span className="mt-1 block text-[9px] text-white/45">Ils jouent automatiquement. Les rôles s’équilibrent selon le nombre d’humains.</span>
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setBotCount(value => Math.max(0, value - 1))} disabled={botCount === 0} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-lg font-black text-white/60 disabled:opacity-25" aria-label="Retirer un joueur ordinateur">−</button>
                <strong className="min-w-6 text-center text-sm text-white">{botCount}</strong>
                <button type="button" onClick={() => setBotCount(value => Math.min(maximumBots, value + 1))} disabled={botCount >= maximumBots} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4F8CFF] text-lg font-black text-white disabled:opacity-25" aria-label="Ajouter un joueur ordinateur">+</button>
              </div>
            </div>
            {botCount > 0 && (
              <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
                <div>
                  <span className="mb-2 block text-[9px] font-black uppercase text-white/40">Difficulté</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['easy', 'Prudent'],
                      ['normal', 'Normal'],
                      ['hard', 'Rusé']
                    ] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setBotDifficulty(value)} className={`rounded-xl border py-2 text-[9px] font-black ${botDifficulty === value ? 'border-[#4F8CFF] bg-[#4F8CFF]/15 text-[#8AB5FF]' : 'border-white/8 text-white/40'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="mb-2 block text-[9px] font-black uppercase text-white/40">Vitesse des tours</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['fast', 'Rapide'],
                      ['normal', 'Normale'],
                      ['cinematic', 'Cinématique']
                    ] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setBotSpeed(value)} className={`rounded-xl border py-2 text-[9px] font-black ${botSpeed === value ? 'border-[#9E94FF] bg-[#9E94FF]/15 text-[#C4BEFF]' : 'border-white/8 text-white/40'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => setShowBotSettings(value => !value)} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-[9px] font-black text-white/60">
                  Noms et personnalités
                  <ChevronDown className={`h-4 w-4 transition-transform ${showBotSettings ? 'rotate-180' : ''}`} />
                </button>
                {showBotSettings && (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {Array.from({ length: botCount }, (_, index) => (
                      <label key={index} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/8 bg-black/10 p-2">
                        <input
                          value={customBotNames[index] || ''}
                          onChange={event => setCustomBotNames(previous => {
                            const next = [...previous];
                            next[index] = event.target.value.slice(0, 18);
                            return next;
                          })}
                          placeholder={`Ordinateur ${index + 1}`}
                          className="min-w-0 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-[10px] font-bold text-white outline-none"
                        />
                        <span className="text-[8px] font-black uppercase text-[#8AB5FF]">{BOT_PERSONALITY_LABELS[BOT_PERSONALITIES[index % BOT_PERSONALITIES.length]]}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/8 bg-white/4">
          <button
            type="button"
            onClick={() => setShowSoundSettings(value => !value)}
            aria-expanded={showSoundSettings}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#9E94FF]/10 text-[#C4BEFF]">
                {narratorEnabled || soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </span>
              <span className="min-w-0">
                <strong className="block text-xs text-white">Son et narration</strong>
                <span className="mt-1 block truncate text-[9px] text-white/45">
                  Narrateur {narratorEnabled ? 'actif' : 'coupé'} · Effets {soundEnabled ? 'actifs' : 'coupés'}
                </span>
              </span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-white/45 transition-transform ${showSoundSettings ? 'rotate-180' : ''}`} />
          </button>

          {showSoundSettings && (
            <div className="space-y-3 border-t border-white/8 p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-white/70">{narratorEnabled ? <Volume2 className="h-4 w-4 text-[#00D26A]" /> : <VolumeX className="h-4 w-4" />} Narrateur</span>
                  <button type="button" role="switch" aria-checked={narratorEnabled} onClick={() => setNarratorEnabled(value => {
                    const next = !value;
                    if (next) previewVoice('Le maître du jeu est prêt.');
                    return next;
                  })} className={`relative h-7 w-12 rounded-full ${narratorEnabled ? 'bg-[#00D26A]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${narratorEnabled ? 'translate-x-5' : ''}`} /></button>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-white/70">
                    <Music2 className={`h-4 w-4 ${soundEnabled ? 'text-[#FFB020]' : 'text-white/35'}`} />
                    Effets sonores
                  </span>
                  <button type="button" role="switch" aria-checked={soundEnabled} onClick={() => setSoundEnabled(value => {
                    const next = !value;
                    if (next) void playEffect('success', effectsVolume);
                    return next;
                  })} className={`relative h-7 w-12 rounded-full ${soundEnabled ? 'bg-[#FFB020]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : ''}`} /></button>
                </div>
              </div>

              {narratorEnabled && (
                <div className="grid gap-2 rounded-2xl border border-white/8 bg-white/4 p-3 sm:grid-cols-[1fr_auto_auto]">
                  <label className="min-w-0">
                    <span className="mb-1 block text-[9px] font-black uppercase text-white/40">Voix du maître du jeu</span>
                    <select value={voiceURI} onChange={event => setVoiceURI(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2.5 text-xs font-bold text-white outline-none">
                      <option value="">Meilleure voix française disponible</option>
                      {availableVoices.map(voice => (
                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => previewVoice('La nuit tombe doucement sur le Village. Fermez les yeux et écoutez.')} className="self-end rounded-xl border border-[#9E94FF]/25 bg-[#9E94FF]/10 px-4 py-2.5 text-[10px] font-black text-[#C4BEFF]">
                    Écouter
                  </button>
                  <button type="button" onClick={refreshAvailableVoices} className="self-end rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/55" title="Actualiser les voix disponibles" aria-label="Actualiser les voix disponibles">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <p className="sm:col-span-3 text-[9px] leading-relaxed text-white/35">
                    {availableVoices.length} voix française{availableVoices.length > 1 ? 's' : ''} exposée{availableVoices.length > 1 ? 's' : ''} à cette application.
                    {voicesRefreshedAt ? ' Liste actualisée.' : ''} {nativeVoicePlatform === 'ios'
                      ? 'Les voix Siri, VoiceOver et certaines voix téléchargées ne sont pas toujours proposées par iOS aux applications.'
                      : nativeVoicePlatform === 'android'
                        ? 'Voix du moteur de synthèse Android sélectionné dans les réglages du téléphone.'
                        : 'En PWA, la liste dépend du moteur vocal fourni au navigateur.'}
                  </p>
                </div>
              )}

              {soundEnabled && (
                <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 sm:grid-cols-2">
                  <label>
                    <span className="flex items-center justify-between text-[9px] font-black uppercase text-white/45"><span>Sons des actions</span><span>{Math.round(effectsVolume * 100)} %</span></span>
                    <input type="range" min="0" max="1" step="0.05" value={effectsVolume} onChange={event => setEffectsVolume(Number(event.target.value))} className="mt-2 w-full accent-[#FFB020]" />
                    <button type="button" onClick={() => void playEffect('success', effectsVolume)} className="mt-2 text-[9px] font-black text-[#FFB020] underline">Tester les effets</button>
                  </label>
                  <label>
                    <span className="flex items-center justify-between text-[9px] font-black uppercase text-white/45"><span>Ambiance de nuit</span><span>{Math.round(ambienceVolume * 100)} %</span></span>
                    <input type="range" min="0" max="1" step="0.05" value={ambienceVolume} onChange={event => setAmbienceVolume(Number(event.target.value))} className="mt-2 w-full accent-[#9E94FF]" />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-[10px]">
          <span className="text-white/50">{enabledRoles.length} personnages avec une capacité</span>
          <span className="font-black text-[#FF4D6D]">{names.length >= 16 ? 4 : names.length >= 11 ? 3 : names.length >= 7 ? 2 : 1} Traître{names.length >= 7 ? 's' : ''}</span>
        </div>

        {pastGames.length > 0 && (
          <div className="mt-3 rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-[#FFB020]" />
              <strong className="text-xs text-white">Dernières parties sur cet appareil</strong>
            </div>
            <div className="mt-3 space-y-2">
              {pastGames.slice(0, 3).map(game => (
                <div key={game.playedAt} className="flex items-center justify-between gap-3 text-[10px]">
                  <span className="font-bold text-white/65">{game.winner}</span>
                  <span className="text-white/35">{game.nights} nuit{game.nights > 1 ? 's' : ''} · {new Date(game.playedAt).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={startGame} disabled={names.length < 1 || totalParticipants < 5} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#9E94FF] py-4 text-sm font-black text-[#090D1A] disabled:opacity-35">
          <Play className="h-5 w-5" /> Distribuer les rôles
        </button>
      </section>
    );
  }

  if (stage === 'reveal-pass' && currentRevealPlayer) {
    return <SecretPass title={`Passez le téléphone à ${currentRevealPlayer.name}`} detail="Personne d’autre ne doit regarder l’écran." onReady={() => { setRoleVisible(true); setStage('reveal-role'); }} />;
  }

  if (stage === 'reveal-role' && currentRevealPlayer) {
    const info = ROLE_INFO[currentRevealPlayer.role];
    return (
      <SecretPanel>
        <button type="button" onClick={() => setRoleVisible(value => !value)} className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
          {roleVisible ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
        </button>
        {roleVisible ? (
          <div className="mt-4 text-center">
            <RolePortrait role={currentRevealPlayer.role} className="mx-auto w-full max-w-sm rounded-3xl" />
            <span className="mt-4 block text-[10px] font-black uppercase tracking-widest" style={{ color: info.color }}>Votre rôle secret</span>
            <h2 className="mt-1 text-3xl font-black text-white">{info.name}</h2>
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-white/60">{info.description}</p>
            {isTraitorRole(currentRevealPlayer.role) && (
              <p className="mx-auto mt-3 max-w-sm rounded-2xl border border-[#FF4D6D]/20 bg-[#FF4D6D]/8 p-3 text-xs text-[#FF9BAF]">
                Vos alliés : {players.filter(player => isTraitorRole(player.role) && player.id !== currentRevealPlayer.id).map(player => player.name).join(', ') || 'vous êtes le seul membre du camp des Traîtres'}
              </p>
            )}
            {currentRevealPlayer.role === 'twin' && (
              <p className="mx-auto mt-3 max-w-sm rounded-2xl border border-[#F0ABFC]/20 bg-[#F0ABFC]/8 p-3 text-xs text-[#F0ABFC]">
                Votre Jumeau : {players.find(player => player.id === currentRevealPlayer.twinId)?.name || 'introuvable'}
              </p>
            )}
          </div>
        ) : <p className="mt-5 text-center text-sm font-black text-white">Touchez l’œil pour voir votre rôle</p>}
        <button type="button" disabled={!roleVisible} onClick={continueReveal} className="mt-6 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white disabled:opacity-35">J’ai mémorisé mon rôle</button>
      </SecretPanel>
    );
  }

  if (stage === 'cupid-pass' && cupid) {
    return <SecretPass title={`Passez le téléphone à ${cupid.name}`} detail="Quand cette personne est seule, elle peut révéler son action secrète." onReady={() => setStage('cupid-choice')} />;
  }

  if (stage === 'cupid-choice') {
    return (
      <SecretPanel>
        <span className="block text-center text-4xl">💞</span>
        <h2 className="mt-3 text-center text-xl font-black text-white">Créer le lien secret</h2>
        <p className="mt-1 text-center text-xs text-white/50">Choisissez exactement deux joueurs. Si l’un est éliminé, l’autre le suit.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {players.map(player => {
            const selected = cupidTargets.includes(player.id);
            return (
              <button key={player.id} type="button" onClick={() => setCupidTargets(previous => selected ? previous.filter(id => id !== player.id) : previous.length < 2 ? [...previous, player.id] : previous)} className={`rounded-2xl border p-3 text-xs font-black ${selected ? 'border-[#FF72B6] bg-[#FF72B6]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>
                {player.name}
              </button>
            );
          })}
        </div>
        <button type="button" disabled={cupidTargets.length !== 2} onClick={confirmCupid} className="mt-5 w-full rounded-2xl bg-[#FF72B6] py-3 text-xs font-black text-[#090D1A] disabled:opacity-35">Lier ces deux joueurs</button>
      </SecretPanel>
    );
  }

  if (stage === 'night-intro') {
    return <NarratorScene icon={<Moon className="h-10 w-10" />} eyebrow={`Nuit ${night}`} title="Le Village s’endort" detail="Le téléphone passera à tout le monde. Certains choix changeront la partie, les autres serviront seulement à protéger les secrets." action="Commencer la nuit" onAction={startNightActions} narratorEnabled={narratorEnabled} onToggleNarrator={() => setNarratorEnabled(value => !value)} />;
  }

  if (stage === 'night-player-pass' && currentNightPlayer?.isBot) {
    return <ComputerTurn key={`night-${night}-${nightTurnIndex}-${currentNightPlayer.id}`} name={currentNightPlayer.name} detail={`Action nocturne ${nightTurnIndex + 1}/${alivePlayers.length}`} delay={fastForwardBots ? 40 : BOT_SPEED_DELAYS[botSpeed]} fastForward={fastForwardBots} onFastForward={() => setFastForwardBots(true)} onComplete={() => runBotNightTurn(currentNightPlayer)} />;
  }

  if (stage === 'night-player-pass' && currentNightPlayer) {
    return (
      <SecretPass
        title={`Passez le téléphone à ${currentNightPlayer.name}`}
        detail={`Passage ${nightTurnIndex + 1}/${alivePlayers.length}. Tout le monde reçoit un écran secret.`}
        onReady={() => setStage('night-player-action')}
      />
    );
  }

  if (stage === 'night-player-action' && currentNightPlayer) {
    if (currentNightPlayer.isBot) {
      return <ComputerTurn key={`night-action-${night}-${nightTurnIndex}-${currentNightPlayer.id}`} name={currentNightPlayer.name} detail="Choix nocturne en cours…" delay={fastForwardBots ? 40 : BOT_SPEED_DELAYS[botSpeed]} fastForward={fastForwardBots} onFastForward={() => setFastForwardBots(true)} onComplete={() => runBotNightTurn(currentNightPlayer)} />;
    }
    if (currentNightPlayer.repentanceNoticePending) {
      return (
        <SecretPanel>
          <span className="block text-center text-5xl">🌅</span>
          <h2 className="mt-4 text-center text-xl font-black text-white">Vous avez changé de camp</h2>
          <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-relaxed text-white/55">Un membre du camp des Traîtres est tombé. Vous gagnez désormais avec le Village, mais continuez à participer à leurs choix pour ne pas être découvert.</p>
          <button type="button" onClick={() => {
            setPlayers(previous => previous.map(player => player.id === currentNightPlayer.id ? { ...player, repentanceNoticePending: false } : player));
          }} className="mt-6 w-full rounded-2xl bg-[#00D26A] py-3 text-xs font-black text-[#07111F]">J’ai compris · continuer</button>
        </SecretPanel>
      );
    }
    const role = currentNightPlayer.role;
    const canInvestigate = players.length <= 6
      ? investigationsUsed < 1
      : players.length <= 9
        ? night % 2 === 1
        : true;
    const canProtect = players.length >= 7 || night % 2 === 1;

    if (role === 'traitor' || role === 'repentant') {
      const selectedTarget = traitorVotes[currentNightPlayer.id] || null;
      const traitorAllies = aliveTraitors.filter(player => player.id !== currentNightPlayer.id);
      const previousCounts = Object.values(traitorVotes).reduce<Record<string, number>>((counts, targetId) => {
        counts[targetId] = (counts[targetId] || 0) + 1;
        return counts;
      }, {});
      return (
        <SecretPanel>
          <Skull className="mx-auto h-10 w-10 text-[#FF4D6D]" />
          <h2 className="mt-3 text-center text-xl font-black text-white">Choix des Traîtres</h2>
          <p className="mt-2 text-center text-xs text-white/50">Vous voyez les choix déjà faits, mais jamais le nom de leurs auteurs.</p>
          <div className="mt-4 rounded-2xl border border-[#FF4D6D]/20 bg-[#FF4D6D]/8 p-3 text-center">
            <strong className="block text-[9px] uppercase text-[#FF9BAF]">Votre équipe</strong>
            <span className="mt-1 block text-xs font-black text-white">
              {traitorAllies.length > 0
                ? traitorAllies.map(player => player.name).join(', ')
                : 'Vous êtes le dernier Traître en jeu'}
            </span>
          </div>
          {Object.keys(previousCounts).length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#FF4D6D]/20 bg-[#FF4D6D]/8 p-3">
              <strong className="text-[9px] uppercase text-[#FF9BAF]">Choix déjà faits</strong>
              <div className="mt-2 space-y-1.5">
                {Object.entries(previousCounts).sort((left, right) => right[1] - left[1]).map(([targetId, count]) => (
                  <div key={targetId} className="flex items-center justify-between text-xs text-white/70">
                    <span>{players.find(player => player.id === targetId)?.name}</span>
                    <strong className="text-[#FF9BAF]">{count} voix</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {alivePlayers.filter(player => !isTraitorRole(player.role)).map(player => (
              <button key={player.id} type="button" onClick={() => setTraitorVotes(previous => ({ ...previous, [currentNightPlayer.id]: player.id }))} className={`rounded-2xl border p-3 text-xs font-black ${selectedTarget === player.id ? 'border-[#FF4D6D] bg-[#FF4D6D]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>
                {player.name}
              </button>
            ))}
          </div>
          <button type="button" disabled={!selectedTarget} onClick={() => advanceNightTurn(traitorVotes)} className="mt-5 w-full rounded-2xl bg-[#FF4D6D] py-3 text-xs font-black text-white disabled:opacity-35">Valider mon choix</button>
        </SecretPanel>
      );
    }

    if (role === 'investigator' && canInvestigate) {
      const target = players.find(player => player.id === investigationResult?.playerId);
      const previousInvestigations = Object.entries(investigationHistory)
        .map(([playerId, isTraitor]) => ({ player: players.find(player => player.id === playerId), isTraitor }))
        .filter((entry): entry is { player: Player; isTraitor: boolean } => Boolean(entry.player));
      return (
        <SecretPanel>
          <Eye className="mx-auto h-10 w-10 text-[#9E94FF]" />
          <h2 className="mt-3 text-center text-xl font-black text-white">Enquête secrète</h2>
          {!oracleResultVisible ? (
            <>
              <p className="mt-2 text-center text-xs text-white/50">{players.length <= 6 ? 'Votre unique enquête de la partie.' : players.length <= 9 ? 'Vous enquêtez une nuit sur deux.' : 'Vous pouvez enquêter chaque nuit.'}</p>
              {previousInvestigations.length > 0 && (
                <div className="mt-4 rounded-2xl border border-[#9E94FF]/20 bg-[#9E94FF]/8 p-3 text-left">
                  <strong className="text-[9px] uppercase text-[#C4BEFF]">Votre carnet d’enquête</strong>
                  <div className="mt-2 space-y-1.5">
                    {previousInvestigations.map(({ player, isTraitor }) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-white/70">{player.name}</span>
                        <span className={isTraitor ? 'font-black text-[#FF4D6D]' : 'font-black text-[#00D26A]'}>
                          {isTraitor ? 'Traître' : 'Innocent'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                {alivePlayers.filter(player => player.id !== currentNightPlayer.id).map(player => {
                  const alreadyChecked = player.id in investigationHistory;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      disabled={alreadyChecked}
                      onClick={() => setOracleTarget(player.id)}
                      className={`rounded-2xl border p-3 text-xs font-black ${
                        alreadyChecked
                          ? 'border-white/5 bg-black/10 text-white/25'
                          : oracleTarget === player.id
                            ? 'border-[#9E94FF] bg-[#9E94FF]/12 text-white'
                            : 'border-white/8 bg-white/5 text-white/55'
                      }`}
                    >
                      {player.name}
                      {alreadyChecked && <span className="mt-1 block text-[8px] uppercase">Déjà vérifié</span>}
                    </button>
                  );
                })}
              </div>
              <button type="button" disabled={!oracleTarget} onClick={() => oracleTarget && revealInvestigation(oracleTarget)} className="mt-4 w-full rounded-2xl bg-[#9E94FF] py-3 text-xs font-black text-[#090D1A] disabled:opacity-35">Révéler le résultat</button>
            </>
          ) : (
            <>
              <span className="mt-4 block text-center text-[10px] font-black uppercase tracking-widest text-[#C4BEFF]">Résultat de votre enquête</span>
              <div className={`mt-3 rounded-3xl border p-6 text-center ${investigationResult?.isTraitor ? 'border-[#FF4D6D]/30 bg-[#FF4D6D]/10' : 'border-[#00D26A]/30 bg-[#00D26A]/10'}`}>
                <strong className="text-lg text-white">{target?.name}</strong>
                <span className={`mt-2 block text-sm font-black ${investigationResult?.isTraitor ? 'text-[#FF4D6D]' : 'text-[#00D26A]'}`}>{investigationResult?.isTraitor ? 'est un Traître' : 'n’est pas un Traître'}</span>
                <span className="mt-3 block text-[10px] text-white/45">Mémorisez ce résultat avant de masquer l’écran.</span>
              </div>
              <button type="button" onClick={() => advanceNightTurn()} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white">J’ai compris · masquer et continuer</button>
            </>
          )}
        </SecretPanel>
      );
    }

    if (role === 'protector' && canProtect) {
      return (
        <SecretChoice
          icon={<Shield className="h-8 w-8 text-[#00D26A]" />}
          title="Protection nocturne"
          detail={lastProtectedTarget ? 'Vous ne pouvez pas protéger la même personne deux nuits de suite.' : 'Choisissez une personne à protéger.'}
          players={alivePlayers.filter(player => player.id !== lastProtectedTarget)}
          selectedId={protectedTarget}
          onSelect={setProtectedTarget}
          onConfirm={() => {
            setLastProtectedTarget(protectedTarget);
            const protectedPlayer = players.find(player => player.id === protectedTarget);
            if (protectedPlayer) addMoment('protection', 'Choix du Protecteur', `${protectedPlayer.name} a été protégé pendant cette nuit.`);
            advanceNightTurn(traitorVotes, protectedTarget);
          }}
        />
      );
    }

    if (role === 'healer' && healerSaveAvailable) {
      return (
        <SecretPanel>
          <span className="block text-center text-4xl">🌿</span>
          <h2 className="mt-3 text-center text-xl font-black text-white">Remède unique</h2>
          <p className="mt-2 text-center text-xs text-white/50">Choisissez à l’aveugle une personne à sauver cette nuit, ou conservez le remède.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {alivePlayers.map(player => (
              <button key={player.id} type="button" onClick={() => setHealerTarget(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${healerTarget === player.id ? 'border-[#42D6C5] bg-[#42D6C5]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{player.name}</button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => advanceNightTurn()} className="rounded-2xl border border-white/10 py-3 text-xs font-black text-white/60">Conserver</button>
            <button type="button" disabled={!healerTarget} onClick={() => {
              setHealerSaveAvailable(false);
              const healed = players.find(player => player.id === healerTarget);
              if (healed) addMoment('healing', 'Remède utilisé', `${healed.name} a reçu le remède du Guérisseur.`);
              advanceNightTurn(traitorVotes, protectedTarget, healerTarget);
            }} className="rounded-2xl bg-[#42D6C5] py-3 text-xs font-black text-[#07111F] disabled:opacity-35">Utiliser</button>
          </div>
        </SecretPanel>
      );
    }

    if (role === 'cupid' && night === 1 && !players.some(player => player.linkedId)) {
      return (
        <SecretPanel>
          <span className="block text-center text-4xl">💞</span>
          <h2 className="mt-3 text-center text-xl font-black text-white">Créer le lien secret</h2>
          <p className="mt-1 text-center text-xs text-white/50">Choisissez exactement deux personnes.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {alivePlayers.map(player => {
              const selected = cupidTargets.includes(player.id);
              return <button key={player.id} type="button" onClick={() => setCupidTargets(previous => selected ? previous.filter(id => id !== player.id) : previous.length < 2 ? [...previous, player.id] : previous)} className={`rounded-2xl border p-3 text-xs font-black ${selected ? 'border-[#FF72B6] bg-[#FF72B6]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{player.name}</button>;
            })}
          </div>
          <button type="button" disabled={cupidTargets.length !== 2} onClick={() => {
            const [firstId, secondId] = cupidTargets;
            setPlayers(previous => previous.map(player => player.id === firstId ? { ...player, linkedId: secondId } : player.id === secondId ? { ...player, linkedId: firstId } : player));
            const first = players.find(player => player.id === firstId);
            const second = players.find(player => player.id === secondId);
            if (first && second) addMoment('link', 'Lien créé', `${first.name} et ${second.name} ont été liés par Cupidon.`);
            advanceNightTurn();
          }} className="mt-5 w-full rounded-2xl bg-[#FF72B6] py-3 text-xs font-black text-[#090D1A] disabled:opacity-35">Créer le lien</button>
        </SecretPanel>
      );
    }

    if (role === 'raven') {
      return <SecretChoice icon={<Feather className="h-8 w-8 text-[#8FA3BF]" />} title="Marque du Corbeau" detail="Ajoutez une voix secrète contre une personne au prochain vote." players={alivePlayers.filter(player => player.id !== currentNightPlayer.id)} selectedId={ravenTarget} onSelect={setRavenTarget} onConfirm={() => advanceNightTurn()} />;
    }

    if (role === 'watcher') {
      const watched = players.find(player => player.id === watcherTarget);
      return (
        <SecretPanel>
          <span className="block text-center text-4xl">🕯️</span>
          <h2 className="mt-3 text-center text-xl font-black text-white">Veille nocturne</h2>
          {!watcherResultVisible ? (
            <>
              <p className="mt-2 text-center text-xs text-white/50">Choisissez une personne pour savoir si elle possède une action pendant la nuit.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {alivePlayers.filter(player => player.id !== currentNightPlayer.id).map(player => (
                  <button key={player.id} type="button" onClick={() => setWatcherTarget(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${watcherTarget === player.id ? 'border-[#FDE68A] bg-[#FDE68A]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{player.name}</button>
                ))}
              </div>
              <button type="button" disabled={!watcherTarget} onClick={() => setWatcherResultVisible(true)} className="mt-4 w-full rounded-2xl bg-[#FDE68A] py-3 text-xs font-black text-[#07111F] disabled:opacity-35">Observer</button>
            </>
          ) : (
            <>
              <div className="mt-5 rounded-3xl border border-[#FDE68A]/25 bg-[#FDE68A]/10 p-6 text-center">
                <strong className="text-lg text-white">{watched?.name}</strong>
                <span className="mt-2 block text-sm font-black text-[#FDE68A]">{watched && hasNightAction(watched.role) ? 'agit pendant la nuit' : 'n’a pas d’action nocturne'}</span>
              </div>
              <button type="button" onClick={() => advanceNightTurn()} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white">J’ai compris · continuer</button>
            </>
          )}
        </SecretPanel>
      );
    }

    if (role === 'messenger') {
      return (
        <SecretPanel>
          <span className="block text-center text-4xl">✉️</span>
          <h2 className="mt-3 text-center text-xl font-black text-white">Message anonyme</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMessengerTone('trust')} className={`rounded-xl border py-2 text-[10px] font-black ${messengerTone === 'trust' ? 'border-[#00D26A] text-[#00D26A]' : 'border-white/8 text-white/40'}`}>Faire confiance</button>
            <button type="button" onClick={() => setMessengerTone('doubt')} className={`rounded-xl border py-2 text-[10px] font-black ${messengerTone === 'doubt' ? 'border-[#FF4D6D] text-[#FF9BAF]' : 'border-white/8 text-white/40'}`}>Se méfier</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {alivePlayers.filter(player => player.id !== currentNightPlayer.id).map(player => (
              <button key={player.id} type="button" onClick={() => setMessengerTarget(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${messengerTarget === player.id ? 'border-[#67E8F9] bg-[#67E8F9]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{player.name}</button>
            ))}
          </div>
          <button type="button" disabled={!messengerTarget} onClick={() => {
            const target = players.find(player => player.id === messengerTarget);
            if (!target) return;
            const message = `Message anonyme : ${messengerTone === 'trust' ? 'faites confiance à' : 'méfiez-vous de'} ${target.name}.`;
            setMessengerMessage(message);
            advanceNightTurn(traitorVotes, protectedTarget, healerTarget, ravenTarget, message);
          }} className="mt-4 w-full rounded-2xl bg-[#67E8F9] py-3 text-xs font-black text-[#07111F] disabled:opacity-35">Envoyer anonymement</button>
        </SecretPanel>
      );
    }

    if (role === 'confessor' && !confessorUsed) {
      return <SecretChoice icon={<span className="text-3xl">🕊️</span>} title="Confession publique" detail="Cette personne ne pourra pas être éliminée par le prochain vote." players={alivePlayers.filter(player => player.id !== currentNightPlayer.id)} selectedId={confessorTarget} onSelect={setConfessorTarget} onConfirm={() => { setConfessorUsed(true); advanceNightTurn(traitorVotes, protectedTarget, healerTarget, ravenTarget, messengerMessage, confessorTarget); }} />;
    }

    if (role === 'silencer') {
      return <SecretChoice icon={<span className="text-3xl">🤫</span>} title="Imposer le silence" detail="Cette personne ne participera pas au vote du lendemain." players={alivePlayers.filter(player => player.id !== currentNightPlayer.id && !isTraitorRole(player.role))} selectedId={silencedTarget} onSelect={setSilencedTarget} onConfirm={() => advanceNightTurn(traitorVotes, protectedTarget, healerTarget, ravenTarget, messengerMessage, confessorTarget, silencedTarget)} />;
    }

    if (role === 'archivist' && !archivistUsed && eliminationHistory.length > 0) {
      const selectedEntry = eliminationHistory[Number(archivistTarget)];
      return (
        <SecretPanel>
          <History className="mx-auto h-10 w-10 text-[#C084FC]" />
          <h2 className="mt-3 text-center text-xl font-black text-white">Archives secrètes</h2>
          {!archivistResultVisible ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {eliminationHistory.map((entry, index) => <button key={`${entry.name}-${index}`} type="button" onClick={() => setArchivistTarget(String(index))} className={`rounded-2xl border p-3 text-xs font-black ${archivistTarget === String(index) ? 'border-[#C084FC] bg-[#C084FC]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{entry.name}</button>)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => advanceNightTurn()} className="rounded-2xl border border-white/10 py-3 text-xs font-black text-white/60">Conserver</button>
                <button type="button" disabled={archivistTarget === null} onClick={() => { setArchivistUsed(true); setArchivistResultVisible(true); }} className="rounded-2xl bg-[#C084FC] py-3 text-xs font-black text-[#090D1A] disabled:opacity-35">Consulter</button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-5 rounded-3xl border border-[#C084FC]/30 bg-[#C084FC]/10 p-6 text-center">
                <strong className="text-lg text-white">{selectedEntry?.name}</strong>
                <span className="mt-2 block text-sm font-black text-[#D8B4FE]">{selectedEntry ? ROLE_INFO[selectedEntry.role].name : 'Fiche introuvable'}</span>
              </div>
              <button type="button" onClick={() => advanceNightTurn()} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white">Refermer</button>
            </>
          )}
        </SecretPanel>
      );
    }

    return (
      <SecretPanel>
        <Moon className="mx-auto h-10 w-10 text-[#9E94FF]" />
        <h2 className="mt-3 text-center text-xl font-black text-white">Observation nocturne</h2>
        <p className="mt-2 text-center text-xs text-white/50">Choisissez la personne qui vous paraît la plus suspecte. Ce choix sert uniquement à ne pas révéler votre personnage.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {alivePlayers.filter(player => player.id !== currentNightPlayer.id).map(player => (
            <button key={player.id} type="button" onClick={() => setDummyTarget(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${dummyTarget === player.id ? 'border-[#9E94FF] bg-[#9E94FF]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{player.name}</button>
          ))}
        </div>
        <button type="button" disabled={!dummyTarget} onClick={() => advanceNightTurn()} className="mt-5 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white disabled:opacity-35">Valider et masquer</button>
      </SecretPanel>
    );
  }

  if (stage === 'night-shadow-pass') {
    return <SecretPass title={`Passez le téléphone à ${aliveTraitors[0]?.name}`} detail="Quand cette personne est seule, elle peut révéler son action secrète." onReady={() => setStage('night-shadow')} />;
  }

  if (stage === 'night-shadow') {
    return <SecretChoice icon={<Skull className="h-8 w-8 text-[#FF4D6D]" />} title="Choix des Traîtres" detail="Choisissez une personne à éliminer cette nuit." players={alivePlayers.filter(player => !isTraitorRole(player.role))} selectedId={shadowTarget} onSelect={setShadowTarget} onConfirm={afterShadow} />;
  }

  if (stage === 'night-oracle-pass' && investigator) {
    return <SecretPass title={`Passez le téléphone à ${investigator.name}`} detail="Quand cette personne est seule, elle peut révéler son action secrète." onReady={() => setStage('night-oracle')} />;
  }

  if (stage === 'night-oracle') {
    const target = players.find(player => player.id === investigationResult?.playerId);
    const previousInvestigations = Object.entries(investigationHistory)
      .map(([playerId, isTraitor]) => ({ player: players.find(player => player.id === playerId), isTraitor }))
      .filter((entry): entry is { player: Player; isTraitor: boolean } => Boolean(entry.player));
    return (
      <SecretPanel>
        <Eye className="mx-auto h-10 w-10 text-[#9E94FF]" />
        <h2 className="mt-3 text-center text-xl font-black text-white">Enquête secrète</h2>
        {!oracleResultVisible ? (
          <>
            {previousInvestigations.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[#9E94FF]/20 bg-[#9E94FF]/8 p-3">
                <strong className="text-[9px] uppercase text-[#C4BEFF]">Votre carnet d’enquête</strong>
                <div className="mt-2 space-y-1.5">
                  {previousInvestigations.map(({ player, isTraitor }) => (
                    <div key={player.id} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{player.name}</span>
                      <span className={isTraitor ? 'font-black text-[#FF4D6D]' : 'font-black text-[#00D26A]'}>{isTraitor ? 'Traître' : 'Innocent'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {alivePlayers.filter(player => player.id !== investigator?.id).map(player => {
                const alreadyChecked = player.id in investigationHistory;
                return (
                  <button key={player.id} type="button" disabled={alreadyChecked} onClick={() => setOracleTarget(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${alreadyChecked ? 'border-white/5 bg-black/10 text-white/25' : oracleTarget === player.id ? 'border-[#9E94FF] bg-[#9E94FF]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>
                    {player.name}
                    {alreadyChecked && <span className="mt-1 block text-[8px] uppercase">Déjà vérifié</span>}
                  </button>
                );
              })}
            </div>
            <button type="button" disabled={!oracleTarget} onClick={() => oracleTarget && revealInvestigation(oracleTarget)} className="mt-4 w-full rounded-2xl bg-[#9E94FF] py-3 text-xs font-black text-[#090D1A] disabled:opacity-35">Révéler le résultat</button>
          </>
        ) : (
          <>
            <span className="mt-4 block text-center text-[10px] font-black uppercase tracking-widest text-[#C4BEFF]">Résultat de votre enquête</span>
            <div className={`mt-3 rounded-3xl border p-6 text-center ${investigationResult?.isTraitor ? 'border-[#FF4D6D]/30 bg-[#FF4D6D]/10' : 'border-[#00D26A]/30 bg-[#00D26A]/10'}`}>
              <strong className="text-lg text-white">{target?.name}</strong>
              <span className={`mt-2 block text-sm font-black ${investigationResult?.isTraitor ? 'text-[#FF4D6D]' : 'text-[#00D26A]'}`}>{investigationResult?.isTraitor ? 'est un Traître de la nuit' : 'n’est pas un Traître'}</span>
              <span className="mt-3 block text-[10px] text-white/45">Mémorisez ce résultat avant de masquer l’écran.</span>
            </div>
            <button type="button" onClick={afterOracle} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white">J’ai compris · masquer et continuer</button>
          </>
        )}
      </SecretPanel>
    );
  }

  if (stage === 'night-guardian-pass' && protector) {
    return <SecretPass title={`Passez le téléphone à ${protector.name}`} detail="Quand cette personne est seule, elle peut révéler son action secrète." onReady={() => setStage('night-guardian')} />;
  }

  if (stage === 'night-guardian') {
    return <SecretChoice icon={<Shield className="h-8 w-8 text-[#00D26A]" />} title="Protection nocturne" detail="Choisissez une personne à protéger pendant cette nuit." players={alivePlayers} selectedId={protectedTarget} onSelect={setProtectedTarget} onConfirm={afterProtector} />;
  }

  if (stage === 'night-healer-pass' && healer) {
    return <SecretPass title={`Passez le téléphone à ${healer.name}`} detail="Quand cette personne est seule, elle peut révéler son action secrète." onReady={() => setStage('night-healer')} />;
  }

  if (stage === 'night-healer') {
    const target = players.find(player => player.id === shadowTarget);
    return (
      <SecretPanel>
        <span className="block text-center text-4xl">🌿</span>
        <h2 className="mt-3 text-center text-xl font-black text-white">Remède du Guérisseur</h2>
        <p className="mt-2 text-center text-xs text-white/55">{target?.name || 'Une personne'} a été visé cette nuit. Le remède ne peut être utilisé qu’une fois.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => continueNightSupport(false)} className="rounded-2xl border border-white/10 py-3 text-xs font-black text-white/60">Garder le remède</button>
          <button type="button" onClick={() => { setHealerSaveAvailable(false); continueNightSupport(true); }} className="rounded-2xl bg-[#42D6C5] py-3 text-xs font-black text-[#07111F]">Sauver cette personne</button>
        </div>
      </SecretPanel>
    );
  }

  if (stage === 'night-raven-pass' && raven) {
    return <SecretPass title={`Passez le téléphone à ${raven.name}`} detail="Quand cette personne est seule, elle peut révéler son action secrète." onReady={() => setStage('night-raven')} />;
  }

  if (stage === 'night-raven') {
    return <SecretChoice icon={<Feather className="h-8 w-8 text-[#8FA3BF]" />} title="Marque du Corbeau" detail="Cette personne commencera le vote avec une voix contre elle." players={alivePlayers.filter(player => player.id !== raven?.id)} selectedId={ravenTarget} onSelect={setRavenTarget} onConfirm={afterRaven} />;
  }

  if (stage === 'night-archivist-pass' && archivist) {
    return <SecretPass title={`Passez le téléphone à ${archivist.name}`} detail="Quand cette personne est seule, elle peut révéler son action secrète." onReady={() => setStage('night-archivist')} />;
  }

  if (stage === 'night-archivist') {
    const selectedEntry = eliminationHistory[Number(archivistTarget)];
    return (
      <SecretPanel>
        <History className="mx-auto h-10 w-10 text-[#C084FC]" />
        <h2 className="mt-3 text-center text-xl font-black text-white">Archives secrètes</h2>
        {!archivistResultVisible ? (
          <>
            <p className="mt-2 text-center text-xs text-white/50">Consultez un rôle éliminé maintenant, ou conservez ce pouvoir.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {eliminationHistory.map((entry, index) => (
                <button key={`${entry.name}-${index}`} type="button" onClick={() => setArchivistTarget(String(index))} className={`rounded-2xl border p-3 text-xs font-black ${archivistTarget === String(index) ? 'border-[#C084FC] bg-[#C084FC]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{entry.name}</button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => resolveDawn(nightHealerSaved)} className="rounded-2xl border border-white/10 py-3 text-xs font-black text-white/60">Garder le pouvoir</button>
              <button type="button" disabled={archivistTarget === null} onClick={() => { setArchivistUsed(true); setArchivistResultVisible(true); }} className="rounded-2xl bg-[#C084FC] py-3 text-xs font-black text-[#090D1A] disabled:opacity-35">Consulter</button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-3xl border border-[#C084FC]/30 bg-[#C084FC]/10 p-6 text-center">
              <strong className="text-lg text-white">{selectedEntry?.name}</strong>
              <span className="mt-2 block text-sm font-black text-[#D8B4FE]">{selectedEntry ? `${ROLE_INFO[selectedEntry.role].icon} ${ROLE_INFO[selectedEntry.role].name}` : 'Fiche introuvable'}</span>
            </div>
            <button type="button" onClick={finishArchivist} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white">Refermer les archives</button>
          </>
        )}
      </SecretPanel>
    );
  }

  if (stage === 'dawn') {
    return <NarratorScene icon={<Sun className="h-10 w-10" />} eyebrow={`Jour ${night}`} title="Le Village se réveille" detail={dawnMessage} action="Ouvrir le débat" onAction={startDiscussion} narratorEnabled={narratorEnabled} onToggleNarrator={() => setNarratorEnabled(value => !value)} />;
  }

  if (stage === 'discussion') {
    return (
      <section className="night-village rounded-[28px] border border-[#FFB020]/20 bg-[#111827] p-6 text-center">
        <Users className="mx-auto h-10 w-10 text-[#FFB020]" />
        <span className="mt-3 block text-[10px] font-black uppercase tracking-widest text-[#FFB020]">Débat du Village</span>
        <div className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-2 text-[9px] font-black uppercase text-white/40">
          <span>{alivePlayers.length} joueurs en vie</span>
          <span>·</span>
          <span>Nuit {night}</span>
          {ravenTarget && <><span>·</span><span className="text-[#8FA3BF]">Marque du Corbeau active</span></>}
        </div>
        <strong className="mt-1 block text-5xl font-black text-white">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong>
        <p className="mx-auto mt-3 max-w-md text-xs text-white/55">Partagez vos soupçons sans révéler directement votre rôle. Les Traîtres peuvent mentir.</p>
        {botStatements.length > 0 && (
          <div className="mt-5 space-y-2 rounded-2xl border border-[#4F8CFF]/20 bg-[#4F8CFF]/8 p-4 text-left">
            <strong className="flex items-center gap-2 text-[9px] uppercase text-[#8AB5FF]"><Bot className="h-4 w-4" /> Avis des joueurs ordinateur</strong>
            {botStatements.map(statement => (
              <div key={statement.id} className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
                <span className="block text-[10px] font-black text-white">{statement.name}</span>
                <span className="mt-1 block text-[10px] text-white/50">« {statement.detail} »</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {([60, 120, 180] as const).map(value => <button key={value} type="button" onClick={() => { setDiscussionSeconds(value); setSeconds(value); }} className={`rounded-xl border py-2 text-[10px] font-black ${discussionSeconds === value ? 'border-[#FFB020] text-[#FFB020]' : 'border-white/8 text-white/40'}`}>{value / 60} min</button>)}
        </div>
        <button type="button" onClick={() => {
          setVoterIndex(0);
          setVotes({});
          setVoteTarget(null);
          setMayorWantsBonus(false);
          setStage('vote-pass');
          narrate('Le vote commence. Passez le téléphone à chaque joueur encore présent.');
        }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB020] py-3 text-xs font-black text-[#07111F]"><Vote className="h-4 w-4" /> Passer au vote</button>
        {eliminationHistory.length > 0 && (
          <div className="mt-5 border-t border-white/8 pt-4 text-left">
            <strong className="text-[10px] uppercase text-white/40">Éliminations</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {eliminationHistory.map((entry, index) => (
                <span key={`${entry.name}-${index}`} className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-[9px] font-bold text-white/55">
                  {entry.name}{revealRoles ? ` · ${ROLE_INFO[entry.role].name}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  if (stage === 'vote-pass' && currentVoter) {
    if (currentVoter.isBot) {
      return <ComputerTurn key={`vote-${night}-${voterIndex}-${currentVoter.id}`} name={currentVoter.name} detail={`Vote ${voterIndex + 1}/${alivePlayers.length}`} delay={fastForwardBots ? 40 : BOT_SPEED_DELAYS[botSpeed]} fastForward={fastForwardBots} onFastForward={() => setFastForwardBots(true)} onComplete={() => runBotVote(currentVoter)} />;
    }
    return <SecretPass title={`Vote secret de ${currentVoter.name}`} detail="Passez-lui le téléphone sans regarder son choix." onReady={() => setStage('vote')} />;
  }

  if (stage === 'vote' && currentVoter) {
    const mayorCanUseSingleBonus = currentVoter.role === 'mayor' && players.length <= 6 && !mayorBonusUsed;
    if (mayorCanUseSingleBonus) {
      return (
        <SecretPanel>
          <Crown className="mx-auto h-10 w-10 text-[#FFB020]" />
          <h2 className="mt-3 text-center text-xl font-black text-white">Vote de {currentVoter.name}</h2>
          <p className="mt-2 text-center text-xs text-white/50">Le Maire peut ajouter une voix à son choix une seule fois dans la partie.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {alivePlayers.filter(player => player.id !== currentVoter.id && player.id !== confessorTarget).map(player => (
              <button key={player.id} type="button" onClick={() => setVoteTarget(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${voteTarget === player.id ? 'border-[#FFB020] bg-[#FFB020]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>
                {player.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setMayorWantsBonus(value => !value)} className={`mt-4 flex w-full items-center justify-between rounded-2xl border p-3 text-left ${mayorWantsBonus ? 'border-[#FFB020]/40 bg-[#FFB020]/12' : 'border-white/8 bg-white/5'}`}>
            <span>
              <strong className="block text-xs text-white">Ajouter ma voix supplémentaire</strong>
              <span className="mt-1 block text-[9px] text-white/45">{mayorWantsBonus ? 'Elle sera utilisée pour ce vote.' : 'La conserver pour un prochain vote.'}</span>
            </span>
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${mayorWantsBonus ? 'border-[#FFB020] bg-[#FFB020] text-[#07111F]' : 'border-white/20 text-transparent'}`}><Check className="h-3.5 w-3.5" /></span>
          </button>
          <button type="button" disabled={!voteTarget} onClick={() => voteTarget && submitVote(voteTarget, mayorWantsBonus)} className="mt-4 w-full rounded-2xl bg-[#FFB020] py-3 text-xs font-black text-[#07111F] disabled:opacity-35">Valider mon vote</button>
        </SecretPanel>
      );
    }
    return <SecretChoice icon={<Vote className="h-8 w-8 text-[#FFB020]" />} title={`Vote de ${currentVoter.name}`} detail="Qui doit quitter le Village ?" players={alivePlayers.filter(player => player.id !== currentVoter.id && player.id !== confessorTarget)} selectedId={null} onSelect={submitVote} immediate />;
  }

  if (stage === 'vote-result') {
    return <NarratorScene icon={<Vote className="h-10 w-10" />} eyebrow="Résultat du vote" title="La décision est prise" detail={voteMessage} action="Passer à la nuit suivante" onAction={nextNight} narratorEnabled={narratorEnabled} onToggleNarrator={() => setNarratorEnabled(value => !value)} />;
  }

  return (
    <section className="game-victory night-village rounded-[28px] border border-[#FFB020]/30 bg-[#111827] p-7 text-center">
      <Sparkles className="mx-auto h-12 w-12 text-[#FFB020]" />
      <span className="mt-4 block text-[10px] font-black uppercase tracking-widest text-[#FFB020]">Partie terminée</span>
      <h2 className="mt-1 text-2xl font-black text-white">{soloWinner ? `Victoire du Farceur ${soloWinner}` : winner === 'village' ? 'Victoire du Village' : 'Victoire des Traîtres'}</h2>
      <p className="mt-2 text-xs text-white/50">{night} nuit{night > 1 ? 's' : ''} jouée{night > 1 ? 's' : ''}</p>
      {gameMoments.length > 0 && (
        <div className="mt-6 rounded-3xl border border-white/8 bg-white/5 p-4 text-left">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#9E94FF]" />
            <div>
              <strong className="block text-sm text-white">Histoire de la partie</strong>
              <span className="text-[9px] text-white/40">Tous les choix importants, maintenant révélés.</span>
            </div>
          </div>
          <div className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-white/10">
            {gameMoments.map(moment => (
              <div key={moment.id} className="relative pl-7">
                <span className={`absolute left-0 top-1.5 h-[19px] w-[19px] rounded-full border-4 border-[#111827] ${
                  moment.kind === 'result' ? 'bg-[#FFB020]' :
                  moment.kind === 'vote' ? 'bg-[#FF4D6D]' :
                  moment.kind === 'investigation' ? 'bg-[#9E94FF]' :
                  moment.kind === 'protection' || moment.kind === 'healing' ? 'bg-[#00D26A]' :
                  'bg-[#4F8CFF]'
                }`} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block text-xs text-white">{moment.title}</strong>
                    <p className="mt-1 text-[10px] leading-relaxed text-white/50">{moment.detail}</p>
                  </div>
                  <span className="shrink-0 text-[8px] font-black uppercase text-white/30">{moment.night === 0 ? 'Début' : `Nuit ${moment.night}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {botDecisions.length > 0 && (
        <div className="mt-5 rounded-2xl border border-[#4F8CFF]/20 bg-[#4F8CFF]/8 p-4 text-left">
          <strong className="flex items-center gap-2 text-xs text-white"><Bot className="h-4 w-4 text-[#8AB5FF]" /> Décisions des joueurs ordinateur</strong>
          <p className="mt-1 text-[9px] text-white/40">Ces informations sont restées cachées pendant la partie.</p>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {botDecisions.map(decision => (
              <div key={decision.id} className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[10px] text-white">{decision.botName} · {decision.action}</strong>
                  <span className="text-[8px] font-black uppercase text-white/30">Nuit {decision.night}</span>
                </div>
                <p className="mt-1 text-[9px] text-white/50">{decision.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {players.map(player => <div key={player.id} className="overflow-hidden rounded-2xl border border-white/8 bg-white/5"><RolePortrait role={player.role} className="w-full" /><div className="p-3"><strong className="block text-xs text-white">{player.name}</strong><span className="mt-1 block text-[10px]" style={{ color: ROLE_INFO[player.role].color }}>{ROLE_INFO[player.role].name}</span>{player.isBot && <span className="mt-1 block text-[8px] font-black uppercase text-[#8AB5FF]">{BOT_PERSONALITY_LABELS[player.botPersonality || 'discreet']}</span>}</div></div>)}
      </div>
      {eliminationHistory.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4 text-left">
          <strong className="text-xs text-white">Historique des éliminations</strong>
          <div className="mt-3 space-y-2">
            {eliminationHistory.map((entry, index) => (
              <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-3 text-[10px]">
                <span className="text-white/65">{entry.name} · {ROLE_INFO[entry.role].name}</span>
                <span className="text-white/35">Jour {entry.night} · {entry.cause}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={resetGame} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white"><RotateCcw className="h-4 w-4" /> Nouvelle partie</button>
    </section>
  );
}

function SecretPanel({ children }: { children: ReactNode }) {
  return <section className="night-village mx-auto max-w-xl rounded-[28px] border border-[#9E94FF]/20 bg-[#090D1A] p-6 sm:p-8">{children}</section>;
}

function ComputerTurn({ name, detail, delay, fastForward, onFastForward, onComplete }: {
  name: string;
  detail: string;
  delay: number;
  fastForward: boolean;
  onFastForward: () => void;
  onComplete: () => void;
}) {
  const completionRef = useRef(onComplete);
  useEffect(() => {
    completionRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer = window.setTimeout(() => completionRef.current(), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return (
    <section className="night-village mx-auto max-w-xl rounded-[28px] border border-[#4F8CFF]/20 bg-[#090D1A] p-7 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#4F8CFF]/25 bg-[#4F8CFF]/10 text-[#8AB5FF]">
        <Bot className="h-8 w-8 animate-pulse" />
      </span>
      <span className="mt-4 block text-[10px] font-black uppercase tracking-widest text-[#4F8CFF]">Joueur ordinateur</span>
      <h2 className="mt-1 text-xl font-black text-white">{name}</h2>
      <p className="mt-3 text-xs text-white/50">{detail}</p>
      <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-white/8">
        <span className="block h-full w-2/3 animate-pulse rounded-full bg-[#4F8CFF]" />
      </div>
      {!fastForward && (
        <button type="button" onClick={onFastForward} className="mt-5 rounded-xl border border-[#4F8CFF]/25 bg-[#4F8CFF]/10 px-4 py-2 text-[9px] font-black text-[#8AB5FF]">
          Passer rapidement tous les tours ordinateur
        </button>
      )}
    </section>
  );
}

function SecretPass({ title, detail, onReady }: { title: string; detail: string; onReady: () => void }) {
  return (
    <SecretPanel>
      <EyeOff className="mx-auto h-12 w-12 text-[#9E94FF]" />
      <h2 className="mt-4 text-center text-xl font-black text-white">{title}</h2>
      <p className="mt-2 text-center text-xs text-white/50">{detail}</p>
      <button type="button" onClick={onReady} className="mt-6 w-full rounded-2xl bg-[#6C5CFF] py-4 text-xs font-black text-white">Je suis prêt, révéler</button>
    </SecretPanel>
  );
}

function SecretChoice({ icon, title, detail, players, selectedId, onSelect, onConfirm, immediate = false }: {
  icon: ReactNode;
  title: string;
  detail: string;
  players: Player[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfirm?: () => void;
  immediate?: boolean;
}) {
  return (
    <SecretPanel>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/5">{icon}</div>
      <h2 className="mt-4 text-center text-xl font-black text-white">{title}</h2>
      <p className="mt-1 text-center text-xs text-white/50">{detail}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {players.map(player => (
          <button key={player.id} type="button" onClick={() => onSelect(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${selectedId === player.id ? 'border-[#9E94FF] bg-[#9E94FF]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>
            {player.name}{immediate ? <Check className="ml-1 inline h-3.5 w-3.5 opacity-40" /> : null}
          </button>
        ))}
      </div>
      {!immediate && <button type="button" disabled={!selectedId} onClick={onConfirm} className="mt-5 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white disabled:opacity-35">Confirmer et masquer</button>}
    </SecretPanel>
  );
}

function NarratorScene({ icon, eyebrow, title, detail, action, onAction, narratorEnabled, onToggleNarrator }: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  detail: string;
  action: string;
  onAction: () => void;
  narratorEnabled: boolean;
  onToggleNarrator: () => void;
}) {
  return (
    <section className="night-village rounded-[28px] border border-[#9E94FF]/20 bg-[#0B1020] p-7 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#9E94FF]/20 bg-[#9E94FF]/10 text-[#C4BEFF]">{icon}</div>
      <span className="mt-4 block text-[10px] font-black uppercase tracking-widest text-[#9E94FF]">{eyebrow}</span>
      <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/60">{detail}</p>
      <button type="button" onClick={onToggleNarrator} className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-white/8 px-3 py-2 text-[10px] font-black text-white/50">{narratorEnabled ? <Volume2 className="h-4 w-4 text-[#00D26A]" /> : <VolumeX className="h-4 w-4" />} {narratorEnabled ? 'Narrateur actif' : 'Mode silencieux'}</button>
      <button type="button" onClick={onAction} className="mt-6 w-full rounded-2xl bg-[#9E94FF] py-4 text-xs font-black text-[#090D1A]">{action}</button>
    </section>
  );
}

function RolePortrait({ role, className = '' }: { role: Role; className?: string }) {
  const index = ROLE_ART_ORDER.indexOf(role);
  if (index >= 0) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    return (
      <div
        role="img"
        aria-label={`Illustration ${ROLE_INFO[role].name}`}
        className={`role-portrait aspect-square bg-cover bg-no-repeat ${className}`}
        style={{
          backgroundImage: "url('/game-assets/village-secret-roles-hd.webp')",
          backgroundSize: '400% 300%',
          backgroundPosition: `${column * (100 / 3)}% ${row * 50}%`
        }}
      />
    );
  }

  const extraIndex = EXTRA_ROLE_ART_ORDER.indexOf(role);
  const column = extraIndex % 3;
  const row = Math.floor(extraIndex / 3);
  return (
    <div
      role="img"
      aria-label={`Illustration ${ROLE_INFO[role].name}`}
      className={`role-portrait aspect-square bg-cover bg-no-repeat ${className}`}
      style={{
        backgroundImage: "url('/game-assets/village-secret-roles-extra-hd.webp')",
        backgroundSize: '300% 200%',
        backgroundPosition: `${column * 50}% ${row * 100}%`
      }}
    />
  );
}
