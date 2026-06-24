import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  RotateCcw,
  Shield,
  Sparkles,
  UserRound,
  Users,
  Vote,
} from 'lucide-react';
import type { Member } from '../../types';

type AgentStage = 'setup' | 'pass' | 'card' | 'talk' | 'vote' | 'result';
type AgentRole = 'citizen' | 'agent' | 'blank';
type AgentPack = 'famille' | 'quotidien' | 'vacances' | 'ados' | 'mix';

type WordPair = {
  pack: Exclude<AgentPack, 'mix'>;
  publicWord: string;
  agentWord: string;
};

type AgentPlayer = {
  id: string;
  name: string;
  photoUrl?: string;
  role: AgentRole;
  word?: string;
};

interface AgentCacheGameProps {
  members: Member[];
}

const CARD_IMAGE = '/game-assets/agent-cache-cards.jpg';

const WORD_PAIRS: WordPair[] = [
  { pack: 'famille', publicWord: 'Cousin', agentWord: 'Voisin' },
  { pack: 'famille', publicWord: 'Mamie', agentWord: 'Tatie' },
  { pack: 'famille', publicWord: 'Anniversaire', agentWord: 'Mariage' },
  { pack: 'famille', publicWord: 'Salon', agentWord: 'Cuisine' },
  { pack: 'famille', publicWord: 'Photo de famille', agentWord: 'Selfie' },
  { pack: 'famille', publicWord: 'Réunion familiale', agentWord: 'Repas du dimanche' },
  { pack: 'famille', publicWord: 'Cadeau', agentWord: 'Surprise' },
  { pack: 'famille', publicWord: 'Vacances en famille', agentWord: 'Week-end' },
  { pack: 'famille', publicWord: 'Maison', agentWord: 'Appartement' },
  { pack: 'famille', publicWord: 'Frère', agentWord: 'Cousin' },
  { pack: 'quotidien', publicWord: 'Supermarché', agentWord: 'Épicerie' },
  { pack: 'quotidien', publicWord: 'Dentifrice', agentWord: 'Savon' },
  { pack: 'quotidien', publicWord: 'Télécommande', agentWord: 'Manette' },
  { pack: 'quotidien', publicWord: 'Cartable', agentWord: 'Sac à dos' },
  { pack: 'quotidien', publicWord: 'Boulangerie', agentWord: 'Pâtisserie' },
  { pack: 'quotidien', publicWord: 'Bus', agentWord: 'Tramway' },
  { pack: 'quotidien', publicWord: 'Facture', agentWord: 'Ticket de caisse' },
  { pack: 'quotidien', publicWord: 'Aspirateur', agentWord: 'Balai' },
  { pack: 'quotidien', publicWord: 'Pyjama', agentWord: 'Peignoir' },
  { pack: 'quotidien', publicWord: 'Agenda', agentWord: 'Calendrier' },
  { pack: 'vacances', publicWord: 'Plage', agentWord: 'Piscine' },
  { pack: 'vacances', publicWord: 'Valise', agentWord: 'Sac de voyage' },
  { pack: 'vacances', publicWord: 'Passeport', agentWord: 'Carte d’identité' },
  { pack: 'vacances', publicWord: 'Camping', agentWord: 'Hôtel' },
  { pack: 'vacances', publicWord: 'Glace', agentWord: 'Sorbet' },
  { pack: 'vacances', publicWord: 'Montagne', agentWord: 'Colline' },
  { pack: 'vacances', publicWord: 'Carte postale', agentWord: 'Souvenir' },
  { pack: 'vacances', publicWord: 'Train', agentWord: 'Avion' },
  { pack: 'vacances', publicWord: 'Parasol', agentWord: 'Serviette' },
  { pack: 'vacances', publicWord: 'Randonnée', agentWord: 'Balade' },
  { pack: 'ados', publicWord: 'Story', agentWord: 'Message' },
  { pack: 'ados', publicWord: 'Playlist', agentWord: 'Podcast' },
  { pack: 'ados', publicWord: 'Sneakers', agentWord: 'Chaussures' },
  { pack: 'ados', publicWord: 'Cinéma', agentWord: 'Série' },
  { pack: 'ados', publicWord: 'Contrôle', agentWord: 'Devoir' },
  { pack: 'ados', publicWord: 'Gaming', agentWord: 'Streaming' },
  { pack: 'ados', publicWord: 'Casque audio', agentWord: 'Écouteurs' },
  { pack: 'ados', publicWord: 'Collège', agentWord: 'Lycée' },
  { pack: 'ados', publicWord: 'Discussion', agentWord: 'Groupe' },
  { pack: 'ados', publicWord: 'Emoji', agentWord: 'Sticker' }
];

const PACK_LABELS: Record<AgentPack, string> = {
  mix: 'Mélange',
  famille: 'Famille',
  quotidien: 'Quotidien',
  vacances: 'Vacances',
  ados: 'Ados'
};

const roleLabel: Record<AgentRole, string> = {
  citizen: 'Citoyen',
  agent: 'Agent caché',
  blank: 'Agent blanc'
};

const roleDescription: Record<AgentRole, string> = {
  citizen: 'Vous connaissez le mot commun. Donnez un indice sans être trop évident.',
  agent: 'Votre mot est proche, mais différent. Déduisez le vrai mot sans vous trahir.',
  blank: 'Vous n’avez aucun mot. Bluffez, écoutez et survivez au vote.'
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

const imagePositionForRole = (role: AgentRole) => {
  if (role === 'agent') return '0% 0%';
  if (role === 'blank') return '0% 100%';
  return '100% 0%';
};

export function AgentCacheGame({ members }: AgentCacheGameProps) {
  const playableMembers = useMemo(
    () => members.length > 0 ? members : [{ id: 'guest-1', name: 'Joueur 1' }, { id: 'guest-2', name: 'Joueur 2' }, { id: 'guest-3', name: 'Joueur 3' }] as Member[],
    [members]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => playableMembers.slice(0, Math.min(6, playableMembers.length)).map(member => member.id));
  const [pack, setPack] = useState<AgentPack>('mix');
  const [agentCount, setAgentCount] = useState(1);
  const [includeBlank, setIncludeBlank] = useState(false);
  const [stage, setStage] = useState<AgentStage>('setup');
  const [players, setPlayers] = useState<AgentPlayer[]>([]);
  const [pair, setPair] = useState<WordPair | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [talkIndex, setTalkIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});

  const selectedMembers = useMemo(
    () => selectedIds.map(id => playableMembers.find(member => member.id === id)).filter((member): member is Member => Boolean(member)),
    [playableMembers, selectedIds]
  );
  const maxAgents = Math.max(1, Math.min(3, Math.floor(selectedIds.length / 3)));
  const currentPlayer = players[currentIndex];
  const voteEntries = Object.values(votes);
  const votedPlayerId = voteEntries.length > 0
    ? [...new Set(voteEntries)].map(id => ({ id, total: voteEntries.filter(vote => vote === id).length })).sort((a, b) => b.total - a.total)[0]?.id
    : undefined;
  const votedPlayer = players.find(player => player.id === votedPlayerId);
  const citizensWin = Boolean(votedPlayer && votedPlayer.role === 'agent');
  const blankWins = Boolean(votedPlayer && votedPlayer.role === 'blank');

  const togglePlayer = (memberId: string) => {
    setSelectedIds(previous => {
      if (previous.includes(memberId)) return previous.length <= 3 ? previous : previous.filter(id => id !== memberId);
      if (previous.length >= 12) return previous;
      return [...previous, memberId];
    });
  };

  const startGame = () => {
    const pool = WORD_PAIRS.filter(item => pack === 'mix' || item.pack === pack);
    const nextPair = pool[Math.floor(Math.random() * pool.length)] || WORD_PAIRS[0];
    const shuffledMembers = shuffle(selectedMembers);
    const nextPlayers = shuffledMembers.map((member, index) => {
      const role: AgentRole = index < agentCount ? 'agent' : includeBlank && index === agentCount ? 'blank' : 'citizen';
      return {
        id: member.id,
        name: member.name,
        photoUrl: member.photoUrl,
        role,
        word: role === 'citizen' ? nextPair.publicWord : role === 'agent' ? nextPair.agentWord : undefined
      };
    });
    setPlayers(shuffle(nextPlayers));
    setPair(nextPair);
    setCurrentIndex(0);
    setTalkIndex(0);
    setVotes({});
    setRevealed(false);
    setStage('pass');
  };

  const nextReveal = () => {
    setRevealed(false);
    if (currentIndex >= players.length - 1) {
      setStage('talk');
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(index => index + 1);
    setStage('pass');
  };

  const resetGame = () => {
    setPlayers([]);
    setPair(null);
    setCurrentIndex(0);
    setTalkIndex(0);
    setVotes({});
    setRevealed(false);
    setStage('setup');
  };

  if (stage === 'setup') {
    return (
      <section className="space-y-5">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0B1020] shadow-2xl">
          <div className="relative min-h-[250px]">
            <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${CARD_IMAGE}')` }} />
            <span className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-[#0B1020]/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FF4D6D]/30 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#FF9BAF] backdrop-blur">
                <Shield className="h-3.5 w-3.5" /> Local · sans son
              </span>
              <h2 className="mt-3 text-2xl font-black text-white">Agent caché</h2>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/65">Un mot commun, un agent avec un mot proche, puis des indices pour trouver qui bluffe.</p>
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
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">Pack de mots</span>
              <select value={pack} onChange={event => setPack(event.target.value as AgentPack)} className="w-full rounded-2xl border border-white/10 bg-[#10172A] px-3 py-3 text-sm font-bold text-white outline-none">
                {(Object.keys(PACK_LABELS) as AgentPack[]).map(value => <option key={value} value={value}>{PACK_LABELS[value]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">Agents cachés</span>
              <select value={Math.min(agentCount, maxAgents)} onChange={event => setAgentCount(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-[#10172A] px-3 py-3 text-sm font-bold text-white outline-none">
                {Array.from({ length: maxAgents }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} agent{value > 1 ? 's' : ''}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setIncludeBlank(value => !value)} className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left ${includeBlank ? 'border-[#FFB020]/35 bg-[#FFB020]/10' : 'border-white/8 bg-white/5'}`}>
              <span><strong className="block text-xs text-white">Agent blanc</strong><span className="mt-1 block text-[9px] text-white/45">Un joueur n’a aucun mot et doit improviser.</span></span>
              <span className={`h-6 w-11 rounded-full p-1 transition-colors ${includeBlank ? 'bg-[#FFB020]' : 'bg-white/15'}`}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${includeBlank ? 'translate-x-5' : ''}`} /></span>
            </button>
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
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Carte secrète {currentIndex + 1}/{players.length}</span>
          <h2 className="mt-2 text-2xl font-black text-white">Passez à {currentPlayer.name}</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/50">La personne regarde sa carte seule, puis passe au joueur suivant.</p>
        </div>
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#10172A] p-4 shadow-2xl">
          <div className="relative min-h-[360px] overflow-hidden rounded-[24px]">
            <span className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-500" style={{ backgroundImage: `url('${CARD_IMAGE}')`, backgroundSize: '200% auto', backgroundPosition: revealed ? imagePositionForRole(currentPlayer.role) : '100% 100%' }} />
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
                  <span className="inline-flex rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/70 backdrop-blur">{roleLabel[currentPlayer.role]}</span>
                  <h3 className="mt-3 text-3xl font-black text-white">{currentPlayer.word || 'Aucun mot'}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">{roleDescription[currentPlayer.role]}</p>
                </>
              )}
            </div>
          </div>
          <button type="button" onClick={() => revealed ? nextReveal() : setRevealed(true)} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] py-4 text-sm font-black text-white">
            {revealed ? currentIndex >= players.length - 1 ? 'Commencer les indices' : 'Masquer et passer' : 'Afficher ma carte'}
          </button>
        </div>
      </section>
    );
  }

  if (stage === 'talk') {
    const speaker = players[talkIndex % players.length];
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020]">Phase indices</span>
          <h2 className="mt-2 text-2xl font-black text-white">À {speaker?.name} de parler</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">Chaque joueur donne un indice court. Pas de mot de la même famille, pas de traduction, pas de mime.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {players.map((player, index) => (
            <div key={player.id} className={`rounded-2xl border p-3 ${index === talkIndex % players.length ? 'border-[#FFB020]/35 bg-[#FFB020]/10' : 'border-white/8 bg-white/5'}`}>
              <strong className="block text-xs text-white">{player.name}</strong>
              <span className="text-[9px] text-white/40">{index < talkIndex ? 'Indice donné' : index === talkIndex ? 'En cours' : 'À venir'}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTalkIndex(index => index + 1)} className="rounded-2xl bg-[#FFB020] py-3 text-xs font-black text-[#07111F]">Joueur suivant</button>
          <button type="button" onClick={() => setStage('vote')} className="rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-black text-white">Passer au vote</button>
        </div>
      </section>
    );
  }

  if (stage === 'vote') {
    const voter = players[Object.keys(votes).length];
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4D6D]">Vote final</span>
          <h2 className="mt-2 text-2xl font-black text-white">{voter ? `${voter.name} vote` : 'Tous les votes sont prêts'}</h2>
          <p className="mt-2 text-xs text-white/55">Votez pour la personne que vous pensez être Agent caché.</p>
        </div>
        {voter ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {players.filter(player => player.id !== voter.id).map(player => (
              <button key={player.id} type="button" onClick={() => setVotes(previous => ({ ...previous, [voter.id]: player.id }))} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-xs font-black text-white">{getInitials(player.name)}</span>
                <span><strong className="block text-xs text-white">{player.name}</strong><span className="text-[9px] text-white/40">Désigner</span></span>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => setStage('result')} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D26A] py-4 text-sm font-black text-[#07111F]">
            <Vote className="h-4 w-4" /> Révéler le résultat
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#10172A] p-5 text-center shadow-2xl">
        <span className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: `url('${CARD_IMAGE}')` }} />
        <span className="absolute inset-0 bg-[#080B16]/70" />
        <div className="relative">
          <TrophyIcon win={citizensWin} blank={blankWins} />
          <h2 className="mt-3 text-2xl font-black text-white">
            {citizensWin ? 'Les citoyens gagnent !' : blankWins ? 'L’Agent blanc s’en sort !' : 'L’Agent caché gagne !'}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            {votedPlayer ? `${votedPlayer.name} a été désigné : ${roleLabel[votedPlayer.role]}.` : 'Aucun vote final.'}
          </p>
        </div>
      </div>
      <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {players.map(player => (
            <div key={player.id} className={`rounded-2xl border p-3 ${player.role === 'agent' ? 'border-[#FF4D6D]/30 bg-[#FF4D6D]/10' : player.role === 'blank' ? 'border-[#FFB020]/30 bg-[#FFB020]/10' : 'border-white/8 bg-white/5'}`}>
              <strong className="block text-xs text-white">{player.name}</strong>
              <span className="text-[9px] text-white/45">{roleLabel[player.role]} · {player.word || 'Aucun mot'}</span>
            </div>
          ))}
        </div>
        {pair && (
          <p className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-3 text-center text-xs font-bold text-white/65">
            Mot commun : <span className="text-[#00D26A]">{pair.publicWord}</span> · Mot agent : <span className="text-[#FF4D6D]">{pair.agentWord}</span>
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

function TrophyIcon({ win, blank }: { win: boolean; blank: boolean }) {
  if (blank) return <UserRound className="mx-auto h-12 w-12 text-[#FFB020]" />;
  if (win) return <Users className="mx-auto h-12 w-12 text-[#00D26A]" />;
  return <Shield className="mx-auto h-12 w-12 text-[#FF4D6D]" />;
}
