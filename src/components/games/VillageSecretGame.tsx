import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  Crown,
  Eye,
  EyeOff,
  Feather,
  History,
  Moon,
  Music2,
  Play,
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
  Vote
} from 'lucide-react';
import type { Member } from '../../types';

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
  | 'diplomat';
type Alignment = 'traitors' | 'village' | 'solo';
type Stage =
  | 'setup'
  | 'reveal-pass'
  | 'reveal-role'
  | 'cupid-pass'
  | 'cupid-choice'
  | 'night-intro'
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
  linkedId?: string;
  elderShield: boolean;
  diplomatShield: boolean;
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
    description: 'Chaque nuit, protégez une personne contre l’attaque des Traîtres.',
    alignment: 'village',
    color: '#00D26A'
  },
  investigator: {
    name: 'Enquêteur',
    icon: '🔮',
    description: 'Chaque nuit, découvrez secrètement si une personne est un Traître.',
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
    description: 'Votre bulletin compte double pendant chaque vote du village.',
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
  }
};

const SPECIAL_ROLES = (Object.keys(ROLE_INFO) as Role[]).filter(role => role !== 'villager' && role !== 'traitor');
const DEFAULT_SPECIAL_ROLES: Role[] = ['investigator', 'protector', 'healer', 'cupid', 'jester', 'elder', 'mayor', 'raven', 'archivist', 'diplomat'];
const SAVE_KEY = 'mf_village_secret_active_game_v2';
const RESULTS_KEY = 'mf_village_secret_results_v1';

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
};

const buildRoles = (count: number, enabledRoles: Role[]): Role[] => {
  const traitorCount = count >= 16 ? 4 : count >= 11 ? 3 : count >= 7 ? 2 : 1;
  const roles: Role[] = [...Array.from({ length: traitorCount }, () => 'traitor' as const)];
  const minimumVillagers = Math.max(2, Math.floor(count * 0.3));
  const maximumSpecialRoles = Math.max(0, count - traitorCount - minimumVillagers);
  enabledRoles.slice(0, maximumSpecialRoles).forEach(role => {
    if (roles.length < count) roles.push(role);
  });
  while (roles.length < count) roles.push('villager');
  return shuffle(roles);
};

const speakText = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.92;
  utterance.pitch = 0.92;
  window.speechSynthesis.speak(utterance);
};

const playEffect = (effect: 'success' | 'danger' | 'victory') => {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const notes = effect === 'victory' ? [392, 523, 659] : effect === 'success' ? [440, 554] : [220, 165];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + index * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.08 + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + index * 0.08);
    oscillator.stop(context.currentTime + index * 0.08 + 0.2);
  });
  window.setTimeout(() => void context.close(), 700);
};

export function VillageSecretGame({ members, onFinished }: VillageSecretGameProps) {
  const initialNames = members.map(member => member.name).filter(Boolean).slice(0, 20);
  const [names, setNames] = useState<string[]>(initialNames);
  const [guestName, setGuestName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [stage, setStage] = useState<Stage>('setup');
  const [revealIndex, setRevealIndex] = useState(0);
  const [night, setNight] = useState(1);
  const [shadowTarget, setShadowTarget] = useState<string | null>(null);
  const [protectedTarget, setProtectedTarget] = useState<string | null>(null);
  const [oracleTarget, setOracleTarget] = useState<string | null>(null);
  const [oracleResultVisible, setOracleResultVisible] = useState(false);
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
  const [ravenTarget, setRavenTarget] = useState<string | null>(null);
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

  const alivePlayers = useMemo(() => players.filter(player => player.alive), [players]);
  const aliveTraitors = useMemo(() => alivePlayers.filter(player => player.role === 'traitor'), [alivePlayers]);
  const investigator = players.find(player => player.role === 'investigator' && player.alive);
  const protector = players.find(player => player.role === 'protector' && player.alive);
  const healer = players.find(player => player.role === 'healer' && player.alive);
  const cupid = players.find(player => player.role === 'cupid' && player.alive);
  const raven = players.find(player => player.role === 'raven' && player.alive);
  const archivist = players.find(player => player.role === 'archivist' && player.alive);
  const currentRevealPlayer = players[revealIndex];
  const currentVoter = alivePlayers[voterIndex];

  const narrate = useCallback((text: string) => {
    if (narratorEnabled) speakText(text);
  }, [narratorEnabled]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

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
      archivistUsed,
      nightHealerSaved,
      revealRoles,
      soundEnabled
    }));
  }, [
    archivistUsed, cupidTargets, dawnMessage, discussionSeconds, eliminationHistory, healerSaveAvailable,
    night, nightHealerSaved, narratorEnabled, oracleTarget, players, protectedTarget, ravenTarget,
    revealIndex, revealRoles, seconds, shadowTarget, soloWinner, soundEnabled, stage, voteMessage, voterIndex, votes, winner
  ]);

  const checkWinner = useCallback((nextPlayers: Player[]) => {
    const alive = nextPlayers.filter(player => player.alive);
    const traitors = alive.filter(player => player.role === 'traitor').length;
    const village = alive.length - traitors;
    if (traitors === 0) return 'village' as const;
    if (traitors >= village) return 'traitors' as const;
    return null;
  }, []);

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
    if (soundEnabled) playEffect('victory');
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
    if (cleanNames.length < 5) return;
    const roles = buildRoles(cleanNames.length, enabledRoles);
    setPlayers(shuffle(cleanNames.map((name, index) => ({
      id: `player-${Date.now()}-${index}`,
      name,
      role: roles[index],
      alive: true,
      elderShield: roles[index] === 'elder',
      diplomatShield: roles[index] === 'diplomat'
    }))));
    setRevealIndex(0);
    setRoleVisible(false);
    setNight(1);
    setWinner(null);
    setSoloWinner(null);
    setEliminationHistory([]);
    setHealerSaveAvailable(true);
    setCupidTargets([]);
    setRavenTarget(null);
    setArchivistUsed(false);
    setNightHealerSaved(false);
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
      setArchivistUsed(Boolean(saved.archivistUsed));
      setNightHealerSaved(Boolean(saved.nightHealerSaved));
      setRevealRoles(saved.revealRoles !== false);
      setSoundEnabled(saved.soundEnabled !== false);
    } catch {
      localStorage.removeItem(SAVE_KEY);
      setResumeAvailable(false);
    }
  };

  const addGuest = () => {
    const value = guestName.trim();
    if (!value || names.some(name => name.toLowerCase() === value.toLowerCase()) || names.length >= 20) return;
    setNames(previous => [...previous, value]);
    setGuestName('');
  };

  const continueReveal = () => {
    setRoleVisible(false);
    if (revealIndex + 1 < players.length) {
      setRevealIndex(value => value + 1);
      setStage('reveal-pass');
      return;
    }
    if (cupid) {
      setStage('cupid-pass');
      narrate(`Tous les rôles sont distribués. Passez le téléphone à ${cupid.name}, Cupidon familial.`);
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
    setShadowTarget(null);
    setProtectedTarget(null);
    setOracleTarget(null);
    setOracleResultVisible(false);
    setRavenTarget(null);
    setArchivistTarget(null);
    setArchivistResultVisible(false);
    setNightHealerSaved(false);
    if (aliveTraitors.length > 0) {
      setStage('night-shadow-pass');
      narrate(`Nuit ${night}. Passez discrètement le téléphone à ${aliveTraitors[0].name}, représentant des Traîtres.`);
    }
  };

  const afterShadow = () => {
    if (investigator) {
      setStage('night-oracle-pass');
      narrate(`Les Traîtres se rendorment. Passez le téléphone à ${investigator.name}, l’Enquêteur.`);
    } else if (protector) {
      setStage('night-guardian-pass');
      narrate(`Passez maintenant le téléphone à ${protector.name}, le Protecteur.`);
    } else if (healer && healerSaveAvailable && shadowTarget) {
      setStage('night-healer-pass');
      narrate(`Passez maintenant le téléphone à ${healer.name}, le Guérisseur.`);
    } else {
      continueNightSupport(false);
    }
  };

  const afterOracle = () => {
    setOracleResultVisible(false);
    if (protector) {
      setStage('night-guardian-pass');
      narrate(`L’Enquêteur se rendort. Passez le téléphone à ${protector.name}, le Protecteur.`);
    } else if (healer && healerSaveAvailable && shadowTarget) {
      setStage('night-healer-pass');
      narrate(`Passez maintenant le téléphone à ${healer.name}, le Guérisseur.`);
    } else {
      continueNightSupport(false);
    }
  };

  const afterProtector = () => {
    if (healer && healerSaveAvailable && shadowTarget && shadowTarget !== protectedTarget) {
      setStage('night-healer-pass');
      narrate(`Le Protecteur se rendort. Passez le téléphone à ${healer.name}, le Guérisseur.`);
      return;
    }
    continueNightSupport(false);
  };

  function continueNightSupport(healerSaved: boolean) {
    setNightHealerSaved(healerSaved);
    if (raven) {
      setStage('night-raven-pass');
      narrate(`Passez maintenant le téléphone à ${raven.name}, le Corbeau.`);
      return;
    }
    if (archivist && !archivistUsed && eliminationHistory.length > 0) {
      setStage('night-archivist-pass');
      narrate(`Passez maintenant le téléphone à ${archivist.name}, l’Archiviste.`);
      return;
    }
    resolveDawn(healerSaved);
  }

  const afterRaven = () => {
    if (archivist && !archivistUsed && eliminationHistory.length > 0) {
      setStage('night-archivist-pass');
      narrate(`Le Corbeau se rendort. Passez le téléphone à ${archivist.name}, l’Archiviste.`);
      return;
    }
    resolveDawn(nightHealerSaved);
  };

  const finishArchivist = () => {
    setArchivistResultVisible(false);
    resolveDawn(nightHealerSaved);
  };

  const resolveDawn = (healerSaved = false) => {
    let nextPlayers = players;
    let message = 'Le jour se lève. Cette nuit, personne n’a été éliminé.';
    if (shadowTarget && shadowTarget !== protectedTarget && !healerSaved) {
      const victim = players.find(player => player.id === shadowTarget);
      if (victim?.role === 'elder' && victim.elderShield) {
        nextPlayers = players.map(player => player.id === shadowTarget ? { ...player, elderShield: false } : player);
        message = `${victim.name}, l’Ancien du village, a résisté à sa première attaque nocturne.`;
      } else {
        const linkedId = victim?.linkedId;
        nextPlayers = players.map(player => (
          player.id === shadowTarget || (linkedId && player.id === linkedId)
            ? { ...player, alive: false }
            : player
        ));
        const linked = linkedId ? players.find(player => player.id === linkedId) : undefined;
        const entries = [
          ...(victim ? [{ night, name: victim.name, role: victim.role, cause: 'Attaque nocturne' }] : []),
          ...(linked ? [{ night, name: linked.name, role: linked.role, cause: 'Lien de Cupidon' }] : [])
        ];
        setEliminationHistory(previous => [...previous, ...entries]);
        message = `Le jour se lève. ${victim?.name || 'Une personne'} a été éliminé${linked ? `, et ${linked.name} l’a suivi à cause du lien secret` : ''}.`;
      }
      setPlayers(nextPlayers);
    } else if (shadowTarget && shadowTarget === protectedTarget) {
      message = 'Le Protecteur a déjoué l’attaque : personne n’a été éliminé.';
    } else if (healerSaved) {
      message = 'Le Guérisseur a utilisé son remède : personne n’a été éliminé.';
    }
    if (ravenTarget) {
      const marked = players.find(player => player.id === ravenTarget);
      if (marked) message += ` Le Corbeau place une voix contre ${marked.name} pour le prochain vote.`;
    }
    setDawnMessage(message);
    setStage('dawn');
    if (soundEnabled) playEffect(message.includes('éliminé') ? 'danger' : 'success');
    narrate(message);
    const nextWinner = checkWinner(nextPlayers);
    if (nextWinner) window.setTimeout(() => finishWithWinner(nextWinner), 900);
  };

  const startDiscussion = () => {
    setSeconds(discussionSeconds);
    setStage('discussion');
    narrate(`Le débat commence. Vous avez ${discussionSeconds / 60} minute${discussionSeconds > 60 ? 's' : ''} pour identifier un Traître.`);
  };

  const submitVote = (targetId: string) => {
    if (!currentVoter) return;
    const nextVotes = { ...votes, [currentVoter.id]: targetId };
    setVotes(nextVotes);
    if (voterIndex + 1 < alivePlayers.length) {
      setVoterIndex(value => value + 1);
      setStage('vote-pass');
      return;
    }
    const counts = Object.entries(nextVotes).reduce<Record<string, number>>((accumulator, [voterId, targetId]) => {
      const voter = players.find(player => player.id === voterId);
      accumulator[targetId] = (accumulator[targetId] || 0) + (voter?.role === 'mayor' ? 2 : 1);
      return accumulator;
    }, ravenTarget ? { [ravenTarget]: 1 } : {});
    const highest = Math.max(...Object.values(counts));
    const leaders = Object.entries(counts).filter(([, count]) => count === highest).map(([id]) => id);
    if (leaders.length !== 1) {
      setVoteMessage('Le vote se termine sur une égalité. Personne ne quitte le Village.');
      setStage('vote-result');
      if (soundEnabled) playEffect('danger');
      narrate('Égalité parfaite. Personne ne quitte le Village.');
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
      if (soundEnabled) playEffect('victory');
      navigator.vibrate?.([100, 60, 100, 60, 180]);
      narrate(`${eliminated.name} était le Farceur. Il remporte immédiatement la partie.`);
      return;
    }
    if (eliminated?.role === 'diplomat' && eliminated.diplomatShield) {
      setPlayers(previous => previous.map(player => player.id === eliminated.id ? { ...player, diplomatShield: false } : player));
      setVoteMessage(`${eliminated.name} révèle son rôle de Diplomate et annule cette première décision contre lui.`);
      setStage('vote-result');
      if (soundEnabled) playEffect('success');
      narrate(`${eliminated.name} était le Diplomate. Il reste dans le Village cette fois-ci.`);
      return;
    }
    const linkedId = eliminated?.linkedId;
    const nextPlayers = players.map(player => (
      player.id === leaders[0] || (linkedId && player.id === linkedId)
        ? { ...player, alive: false }
        : player
    ));
    setPlayers(nextPlayers);
    const linked = linkedId ? players.find(player => player.id === linkedId) : undefined;
    setEliminationHistory(previous => [
      ...previous,
      ...(eliminated ? [{ night, name: eliminated.name, role: eliminated.role, cause: 'Vote du village' }] : []),
      ...(linked ? [{ night, name: linked.name, role: linked.role, cause: 'Lien de Cupidon' }] : [])
    ]);
    setVoteMessage(`${eliminated?.name} quitte le Village.${revealRoles && eliminated ? ` Son rôle était ${ROLE_INFO[eliminated.role].name}.` : ''}${linked ? ` ${linked.name} le suit à cause du lien secret.` : ''}`);
    setStage('vote-result');
    if (soundEnabled) playEffect('danger');
    narrate(`${eliminated?.name} quitte le Village. Son rôle était ${eliminated ? ROLE_INFO[eliminated.role].name : 'inconnu'}.`);
    const nextWinner = checkWinner(nextPlayers);
    if (nextWinner) window.setTimeout(() => finishWithWinner(nextWinner), 900);
  };

  const nextNight = () => {
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
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-white/55">Un jeu familial de déduction à rôles cachés. Le maître du jeu automatique guide chaque phase, même hors connexion.</p>
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
            <strong className="mt-2 block text-xs text-white">Composition</strong>
          </button>
        </div>

        {showRules && (
          <div className="mt-3 rounded-2xl border border-white/8 bg-white/5 p-4">
            <ol className="space-y-3 text-xs leading-relaxed text-white/65">
              <li><strong className="text-white">1. Distribution :</strong> chacun consulte sa carte secrète puis masque l’écran.</li>
              <li><strong className="text-white">2. Nuit :</strong> le maître du jeu appelle les rôles dans l’ordre et enregistre leurs choix.</li>
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
                    <span className="text-xl">{info.icon}</span>
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
              <span className="text-2xl">{ROLE_INFO[role].icon}</span>
              <strong className="mt-2 block text-[9px] text-white">{ROLE_INFO[role].name}</strong>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <strong className="text-xs text-white">Joueurs · {names.length}/20</strong>
            <span className={`text-[10px] font-black ${names.length >= 5 ? 'text-[#00D26A]' : 'text-[#FFB020]'}`}>{names.length >= 5 ? 'Prêt' : '5 minimum'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {names.map((name, index) => (
              <button key={`${name}-${index}`} type="button" onClick={() => setNames(previous => previous.filter((_, itemIndex) => itemIndex !== index))} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black text-white/70">
                {name} <span className="ml-1 text-[#FF4D6D]">×</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={guestName} onChange={event => setGuestName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addGuest(); }} placeholder="Ajouter un joueur invité" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none" />
            <button type="button" onClick={addGuest} disabled={!guestName.trim() || names.length >= 20} className="rounded-2xl bg-[#6C5CFF] px-4 text-white disabled:opacity-40" title="Ajouter"><UserPlus className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-3">
            <span className="flex items-center gap-2 text-xs font-bold text-white/70">{narratorEnabled ? <Volume2 className="h-4 w-4 text-[#00D26A]" /> : <VolumeX className="h-4 w-4" />} Narrateur</span>
            <button type="button" role="switch" aria-checked={narratorEnabled} onClick={() => setNarratorEnabled(value => !value)} className={`relative h-7 w-12 rounded-full ${narratorEnabled ? 'bg-[#00D26A]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${narratorEnabled ? 'translate-x-5' : ''}`} /></button>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-3">
            <span className="flex items-center gap-2 text-xs font-bold text-white/70"><Music2 className={`h-4 w-4 ${soundEnabled ? 'text-[#FFB020]' : 'text-white/35'}`} /> Effets sonores</span>
            <button type="button" role="switch" aria-checked={soundEnabled} onClick={() => setSoundEnabled(value => !value)} className={`relative h-7 w-12 rounded-full ${soundEnabled ? 'bg-[#FFB020]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : ''}`} /></button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-[10px]">
          <span className="text-white/50">{enabledRoles.length} rôles spéciaux activés</span>
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

        <button type="button" onClick={startGame} disabled={names.length < 5} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#9E94FF] py-4 text-sm font-black text-[#090D1A] disabled:opacity-35">
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
            <span className="text-5xl">{info.icon}</span>
            <span className="mt-4 block text-[10px] font-black uppercase tracking-widest" style={{ color: info.color }}>Votre rôle secret</span>
            <h2 className="mt-1 text-3xl font-black text-white">{info.name}</h2>
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-white/60">{info.description}</p>
            {currentRevealPlayer.role === 'traitor' && (
              <p className="mx-auto mt-3 max-w-sm rounded-2xl border border-[#FF4D6D]/20 bg-[#FF4D6D]/8 p-3 text-xs text-[#FF9BAF]">
                Vos alliés : {players.filter(player => player.role === 'traitor' && player.id !== currentRevealPlayer.id).map(player => player.name).join(', ') || 'vous êtes le seul Traître'}
              </p>
            )}
          </div>
        ) : <p className="mt-5 text-center text-sm font-black text-white">Touchez l’œil pour voir votre rôle</p>}
        <button type="button" disabled={!roleVisible} onClick={continueReveal} className="mt-6 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white disabled:opacity-35">J’ai mémorisé mon rôle</button>
      </SecretPanel>
    );
  }

  if (stage === 'cupid-pass' && cupid) {
    return <SecretPass title={`Téléphone pour ${cupid.name}`} detail="Cupidon familial va créer un lien secret entre deux joueurs." onReady={() => setStage('cupid-choice')} />;
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
    return <NarratorScene icon={<Moon className="h-10 w-10" />} eyebrow={`Nuit ${night}`} title="Le Village s’endort" detail="Tout le monde ferme les yeux. Le téléphone guidera chaque rôle secret." action="Commencer la nuit" onAction={startNightActions} narratorEnabled={narratorEnabled} onToggleNarrator={() => setNarratorEnabled(value => !value)} />;
  }

  if (stage === 'night-shadow-pass') {
    return <SecretPass title={`Téléphone pour ${aliveTraitors[0]?.name}`} detail="Les Traîtres de la nuit ouvrent les yeux et choisissent ensemble une cible." onReady={() => setStage('night-shadow')} />;
  }

  if (stage === 'night-shadow') {
    return <SecretChoice icon={<Skull className="h-8 w-8 text-[#FF4D6D]" />} title="Choix des Traîtres" detail="Choisissez une personne à éliminer cette nuit." players={alivePlayers.filter(player => player.role !== 'traitor')} selectedId={shadowTarget} onSelect={setShadowTarget} onConfirm={afterShadow} />;
  }

  if (stage === 'night-oracle-pass' && investigator) {
    return <SecretPass title={`Téléphone pour ${investigator.name}`} detail="L’Enquêteur va vérifier une personne en secret." onReady={() => setStage('night-oracle')} />;
  }

  if (stage === 'night-oracle') {
    const target = players.find(player => player.id === oracleTarget);
    return (
      <SecretPanel>
        <Eye className="mx-auto h-10 w-10 text-[#9E94FF]" />
        <h2 className="mt-3 text-center text-xl font-black text-white">Enquête secrète</h2>
        {!oracleResultVisible ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {alivePlayers.filter(player => player.id !== investigator?.id).map(player => (
                <button key={player.id} type="button" onClick={() => setOracleTarget(player.id)} className={`rounded-2xl border p-3 text-xs font-black ${oracleTarget === player.id ? 'border-[#9E94FF] bg-[#9E94FF]/12 text-white' : 'border-white/8 bg-white/5 text-white/55'}`}>{player.name}</button>
              ))}
            </div>
            <button type="button" disabled={!oracleTarget} onClick={() => setOracleResultVisible(true)} className="mt-4 w-full rounded-2xl bg-[#9E94FF] py-3 text-xs font-black text-[#090D1A] disabled:opacity-35">Révéler l’alignement</button>
          </>
        ) : (
          <>
            <div className={`mt-5 rounded-3xl border p-6 text-center ${target?.role === 'traitor' ? 'border-[#FF4D6D]/30 bg-[#FF4D6D]/10' : 'border-[#00D26A]/30 bg-[#00D26A]/10'}`}>
              <strong className="text-lg text-white">{target?.name}</strong>
              <span className={`mt-2 block text-sm font-black ${target?.role === 'traitor' ? 'text-[#FF4D6D]' : 'text-[#00D26A]'}`}>{target?.role === 'traitor' ? 'est un Traître de la nuit' : 'n’est pas un Traître'}</span>
            </div>
            <button type="button" onClick={afterOracle} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-3 text-xs font-black text-white">Masquer et continuer</button>
          </>
        )}
      </SecretPanel>
    );
  }

  if (stage === 'night-guardian-pass' && protector) {
    return <SecretPass title={`Téléphone pour ${protector.name}`} detail="Le Protecteur choisit une personne à protéger." onReady={() => setStage('night-guardian')} />;
  }

  if (stage === 'night-guardian') {
    return <SecretChoice icon={<Shield className="h-8 w-8 text-[#00D26A]" />} title="Protection nocturne" detail="Choisissez une personne à protéger pendant cette nuit." players={alivePlayers} selectedId={protectedTarget} onSelect={setProtectedTarget} onConfirm={afterProtector} />;
  }

  if (stage === 'night-healer-pass' && healer) {
    return <SecretPass title={`Téléphone pour ${healer.name}`} detail="Le Guérisseur peut utiliser son unique remède pour sauver la cible." onReady={() => setStage('night-healer')} />;
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
    return <SecretPass title={`Téléphone pour ${raven.name}`} detail="Le Corbeau va placer une voix secrète contre une personne pour le prochain vote." onReady={() => setStage('night-raven')} />;
  }

  if (stage === 'night-raven') {
    return <SecretChoice icon={<Feather className="h-8 w-8 text-[#8FA3BF]" />} title="Marque du Corbeau" detail="Cette personne commencera le vote avec une voix contre elle." players={alivePlayers.filter(player => player.id !== raven?.id)} selectedId={ravenTarget} onSelect={setRavenTarget} onConfirm={afterRaven} />;
  }

  if (stage === 'night-archivist-pass' && archivist) {
    return <SecretPass title={`Téléphone pour ${archivist.name}`} detail="L’Archiviste peut consulter une ancienne fiche, une seule fois dans la partie." onReady={() => setStage('night-archivist')} />;
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
        <div className="mt-5 grid grid-cols-3 gap-2">
          {([60, 120, 180] as const).map(value => <button key={value} type="button" onClick={() => { setDiscussionSeconds(value); setSeconds(value); }} className={`rounded-xl border py-2 text-[10px] font-black ${discussionSeconds === value ? 'border-[#FFB020] text-[#FFB020]' : 'border-white/8 text-white/40'}`}>{value / 60} min</button>)}
        </div>
        <button type="button" onClick={() => { setVoterIndex(0); setVotes({}); setStage('vote-pass'); narrate('Le vote commence. Passez le téléphone à chaque joueur encore présent.'); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB020] py-3 text-xs font-black text-[#07111F]"><Vote className="h-4 w-4" /> Passer au vote</button>
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
    return <SecretPass title={`Vote secret de ${currentVoter.name}`} detail="Passez-lui le téléphone sans regarder son choix." onReady={() => setStage('vote')} />;
  }

  if (stage === 'vote' && currentVoter) {
    return <SecretChoice icon={<Vote className="h-8 w-8 text-[#FFB020]" />} title={`Vote de ${currentVoter.name}`} detail="Qui doit quitter le Village ?" players={alivePlayers.filter(player => player.id !== currentVoter.id)} selectedId={null} onSelect={submitVote} immediate />;
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
      <div className="mt-5 grid grid-cols-2 gap-2">
        {players.map(player => <div key={player.id} className="rounded-2xl border border-white/8 bg-white/5 p-3"><strong className="block text-xs text-white">{player.name}</strong><span className="mt-1 block text-[10px]" style={{ color: ROLE_INFO[player.role].color }}>{ROLE_INFO[player.role].icon} {ROLE_INFO[player.role].name}</span></div>)}
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
