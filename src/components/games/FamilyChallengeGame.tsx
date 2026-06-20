import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock3, HelpCircle, Play, Shield, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { FAMILY_CHALLENGE_QUESTIONS, getChallengeQuestion, type FamilyChallengeQuestion } from '../../data/familyChallengeQuestions';
import { familyGameService, type FamilyGameRoom } from '../../services/familyGameService';
import { matchChallengeAnswer } from '../../utils/familyChallengeMatcher';

type ChallengePhase = 'faceoff' | 'play' | 'steal' | 'round-end';

type Team = {
  id: string;
  name: string;
};

interface FamilyChallengeGameProps {
  foyerId: string;
  isPremium: boolean;
  teams: [Team, Team];
  room: FamilyGameRoom | null;
  onRoomChange: (room: FamilyGameRoom) => void;
  onFinished: (scores: [number, number], winnerName: string) => void;
}

const asNumberArray = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];

const asScores = (value: unknown): [number, number] => {
  const scores = asNumberArray(value);
  return [scores[0] || 0, scores[1] || 0];
};

export function FamilyChallengeGame({
  foyerId,
  isPremium,
  teams,
  room,
  onRoomChange,
  onFinished
}: FamilyChallengeGameProps) {
  const roomState = room?.state || {};
  const [round, setRound] = useState(() => typeof roomState.challengeIndex === 'number' ? roomState.challengeIndex : 0);
  const [phase, setPhase] = useState<ChallengePhase>(() => {
    const value = roomState.challengePhase;
    return value === 'play' || value === 'steal' || value === 'round-end' ? value : 'faceoff';
  });
  const [scores, setScores] = useState<[number, number]>(() => asScores(roomState.scores));
  const [controllingTeam, setControllingTeam] = useState<0 | 1>(() => roomState.controllingTeam === 1 ? 1 : 0);
  const [foundAnswers, setFoundAnswers] = useState<number[]>(() => asNumberArray(roomState.foundAnswers));
  const [strikes, setStrikes] = useState(() => typeof roomState.strikes === 'number' ? roomState.strikes : 0);
  const [roundBank, setRoundBank] = useState(() => typeof roomState.roundBank === 'number' ? roomState.roundBank : 0);
  const [faceoffInputs, setFaceoffInputs] = useState<[string, string]>(['', '']);
  const [localFaceoffAnswers, setLocalFaceoffAnswers] = useState<[string | null, string | null]>([null, null]);
  const [guessInput, setGuessInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRules, setShowRules] = useState(() => localStorage.getItem('mf_family_challenge_rules_seen') !== '1');
  const [totalRounds, setTotalRounds] = useState(() => typeof roomState.totalRounds === 'number' ? roomState.totalRounds : 5);
  const [silentMode, setSilentMode] = useState(() => localStorage.getItem('mf_games_silent') === '1');
  const [closeMatch, setCloseMatch] = useState<ReturnType<typeof matchChallengeAnswer> | null>(null);
  const [selectedPack, setSelectedPack] = useState<FamilyChallengeQuestion['pack'] | 'Tous'>('Tous');
  const [playedQuestionIds, setPlayedQuestionIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mf_family_challenge_played_${foyerId}`) || '[]');
    } catch {
      return [];
    }
  });

  const questionCount = isPremium ? FAMILY_CHALLENGE_QUESTIONS.length : 12;
  const question = useMemo(
    () => getChallengeQuestion(round, room?.code || foyerId, questionCount, playedQuestionIds.slice(-120), selectedPack === 'Tous' ? undefined : selectedPack),
    [foyerId, playedQuestionIds, questionCount, room?.code, round, selectedPack]
  );
  const localTeamIndex: 0 | 1 = room?.guestFoyerId === foyerId ? 1 : 0;
  const activeTeam: 0 | 1 = phase === 'steal' ? (controllingTeam === 0 ? 1 : 0) : controllingTeam;
  const faceoffAnswers = useMemo<[string | null, string | null]>(
    () => {
      if (!room) return localFaceoffAnswers;
      const shared = Array.isArray(room.state.submittedAnswers)
        ? room.state.submittedAnswers.filter((value): value is string => typeof value === 'string')
        : [];
      return [shared[0] || null, shared[1] || null];
    },
    [localFaceoffAnswers, room]
  );

  const playCue = useCallback((kind: 'good' | 'bad' | 'win') => {
    if (silentMode) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = kind === 'good' ? 660 : kind === 'win' ? 880 : 180;
    oscillator.type = kind === 'bad' ? 'sawtooth' : 'sine';
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'win' ? 0.35 : 0.16));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (kind === 'win' ? 0.38 : 0.18));
    oscillator.addEventListener('ended', () => void context.close());
  }, [silentMode]);

  const applyState = useCallback((updates: Record<string, unknown>, action: Parameters<typeof familyGameService.performRoomAction>[2] = 'accept_answer') => {
    if (!room) return;
    const nextState = { ...room.state, ...updates };
    onRoomChange({ ...room, state: nextState });
    void familyGameService.performRoomAction(room.id, foyerId, action, updates)
      .then(onRoomChange)
      .catch(error => console.warn('[FamilyChallenge] Room action rejected:', error));
  }, [foyerId, onRoomChange, room]);

  useEffect(() => {
    if (!room) return;
    const state = room.state;
    queueMicrotask(() => {
      if (typeof state.challengeIndex === 'number') setRound(state.challengeIndex);
      if (state.challengePhase === 'faceoff' || state.challengePhase === 'play' || state.challengePhase === 'steal' || state.challengePhase === 'round-end') {
        setPhase(state.challengePhase);
      }
      setScores(asScores(state.scores));
      if (state.controllingTeam === 0 || state.controllingTeam === 1) setControllingTeam(state.controllingTeam);
      setFoundAnswers(asNumberArray(state.foundAnswers));
      if (typeof state.strikes === 'number') setStrikes(state.strikes);
      if (typeof state.roundBank === 'number') setRoundBank(state.roundBank);
      if (typeof state.totalRounds === 'number') setTotalRounds(state.totalRounds);
      if (typeof state.timerDeadline === 'string') {
        setSeconds(Math.max(0, Math.ceil((new Date(state.timerDeadline).getTime() - Date.now()) / 1000)));
        setTimerRunning(true);
      }
    });
  }, [room]);

  useEffect(() => {
    if (!room?.id) return;
    const channel = familyGameService.subscribeToRoom(room.id, onRoomChange);
    return () => {
      void familyGameService.unsubscribe(channel);
    };
  }, [onRoomChange, room?.id]);

  useEffect(() => {
    if (!timerRunning || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, timerRunning]);

  useEffect(() => {
    if (seconds === 0) queueMicrotask(() => setTimerRunning(false));
  }, [seconds]);

  const resolveFaceoff = useCallback((answers: [string, string]) => {
    const matches = answers.map(value => matchChallengeAnswer(value, question));
    const firstAccepted = matches[0].status !== 'rejected';
    const secondAccepted = matches[1].status !== 'rejected';
    let winner: 0 | 1 = round % 2 === 0 ? 0 : 1;
    if (firstAccepted && !secondAccepted) winner = 0;
    if (secondAccepted && !firstAccepted) winner = 1;
    if (firstAccepted && secondAccepted && matches[0].answerIndex !== matches[1].answerIndex) {
      winner = matches[0].answerIndex < matches[1].answerIndex ? 0 : 1;
    }
    const found = [...new Set(matches.filter(match => match.status !== 'rejected').map(match => match.answerIndex))];
    const bank = found.reduce((total, index) => total + (question.answers[index]?.points || 0), 0);

    setControllingTeam(winner);
    setFoundAnswers(found);
    setRoundBank(bank);
    setStrikes(0);
    setPhase('play');
    setFeedback(`${teams[winner].name} prend la main avec la meilleure réponse.`);
    applyState({
      challengePhase: 'play',
      controllingTeam: winner,
      foundAnswers: found,
      roundBank: bank,
      strikes: 0
    }, 'resolve_faceoff');
  }, [applyState, question, round, teams]);

  useEffect(() => {
    if (phase !== 'faceoff' || !faceoffAnswers[0] || !faceoffAnswers[1]) return;
    if (room && room.hostFoyerId !== foyerId) return;
    queueMicrotask(() => resolveFaceoff([faceoffAnswers[0]!, faceoffAnswers[1]!]));
  }, [faceoffAnswers, foyerId, phase, resolveFaceoff, room]);

  const submitFaceoff = async (teamIndex: 0 | 1) => {
    const value = faceoffInputs[teamIndex].trim();
    if (!value) return;
    if (!room) {
      setLocalFaceoffAnswers(previous => {
        const next: [string | null, string | null] = [...previous];
        next[teamIndex] = value;
        return next;
      });
      return;
    }
    if (teamIndex !== localTeamIndex) return;
    setSubmitting(true);
    try {
      const nextRoom = await familyGameService.submitChallengeAnswer(room.id, foyerId, round, value);
      onRoomChange(nextRoom);
    } finally {
      setSubmitting(false);
    }
  };

  const finishRound = (winner: 0 | 1, finalFound: number[], finalBank: number, message: string, answerIndex?: number) => {
    const nextScores: [number, number] = [...scores];
    nextScores[winner] += finalBank;
    setScores(nextScores);
    setFoundAnswers(finalFound);
    setRoundBank(finalBank);
    setPhase('round-end');
    setFeedback(message);
    playCue('win');
    navigator.vibrate?.([80, 45, 160]);
    applyState({
      challengePhase: 'round-end',
      scores: nextScores,
      foundAnswers: finalFound,
      roundBank: finalBank,
      roundWinner: winner,
      winner,
      answerIndex
    }, 'finish_round');
  };

  const submitGuess = () => {
    const value = guessInput.trim();
    if (!value || (room && localTeamIndex !== activeTeam)) return;
    const match = matchChallengeAnswer(value, question);
    if (match.status === 'close') {
      setCloseMatch(match);
      return;
    }
    const accepted = match.status === 'accepted' && !foundAnswers.includes(match.answerIndex);

    if (phase === 'steal') {
      if (accepted) {
        const nextFound = [...foundAnswers, match.answerIndex];
        const finalBank = roundBank + (match.answer?.points || 0);
        finishRound(activeTeam, nextFound, finalBank, `${teams[activeTeam].name} vole la cagnotte !`, match.answerIndex);
      } else {
        finishRound(controllingTeam, foundAnswers, roundBank, `Vol manqué : ${teams[controllingTeam].name} garde la cagnotte.`);
      }
      setGuessInput('');
      return;
    }

    if (accepted) {
      const nextFound = [...foundAnswers, match.answerIndex];
      const nextBank = roundBank + (match.answer?.points || 0);
      setFoundAnswers(nextFound);
      setRoundBank(nextBank);
      setFeedback(`${match.answer?.label} est au tableau !`);
      playCue('good');
      navigator.vibrate?.(35);
      if (nextFound.length === question.answers.length) {
        finishRound(controllingTeam, nextFound, nextBank, `${teams[controllingTeam].name} a trouvé tout le tableau.`, match.answerIndex);
      } else {
        applyState({ answerIndex: match.answerIndex, foundAnswers: nextFound, roundBank: nextBank }, 'accept_answer');
      }
    } else {
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);
      setFeedback(foundAnswers.includes(match.answerIndex) ? 'Cette réponse a déjà été trouvée.' : 'Cette réponse n’est pas au tableau.');
      playCue('bad');
      navigator.vibrate?.(120);
      if (nextStrikes >= 3) {
        setPhase('steal');
        setFeedback(`${teams[controllingTeam === 0 ? 1 : 0].name} a une réponse pour voler la cagnotte.`);
        applyState({ challengePhase: 'steal', strikes: 3 }, 'reject_answer');
      } else {
        applyState({ strikes: nextStrikes }, 'reject_answer');
      }
    }
    setGuessInput('');
  };

  const nextRound = () => {
    const nextRoundNumber = round + 1;
    const nextPlayedIds = [...playedQuestionIds.filter(id => id !== question.id), question.id].slice(-160);
    setPlayedQuestionIds(nextPlayedIds);
    localStorage.setItem(`mf_family_challenge_played_${foyerId}`, JSON.stringify(nextPlayedIds));
    if (nextRoundNumber >= totalRounds) {
      const winnerName = scores[0] === scores[1] ? 'Égalité' : teams[scores[0] > scores[1] ? 0 : 1].name;
      onFinished(scores, winnerName);
      return;
    }
    setRound(nextRoundNumber);
    setPhase('faceoff');
    setControllingTeam(0);
    setFoundAnswers([]);
    setStrikes(0);
    setRoundBank(0);
    setFaceoffInputs(['', '']);
    setLocalFaceoffAnswers([null, null]);
    setGuessInput('');
    setFeedback('');
    setSeconds(60);
    setTimerRunning(false);
    applyState({
      challengeIndex: nextRoundNumber,
      challengePhase: 'faceoff',
      controllingTeam: 0,
      foundAnswers: [],
      strikes: 0,
      roundBank: 0,
      hostSubmitted: false,
      guestSubmitted: false,
      submittedAnswers: null
    }, 'next_round');
  };

  const confirmCloseAnswer = () => {
    if (!closeMatch?.answer || foundAnswers.includes(closeMatch.answerIndex)) {
      setCloseMatch(null);
      return;
    }
    const nextFound = [...foundAnswers, closeMatch.answerIndex];
    const nextBank = roundBank + closeMatch.answer.points;
    setFoundAnswers(nextFound);
    setRoundBank(nextBank);
    setFeedback(`${closeMatch.answer.label} est validée par l’arbitre.`);
    playCue('good');
    applyState({ answerIndex: closeMatch.answerIndex, foundAnswers: nextFound, roundBank: nextBank }, 'accept_answer');
    setGuessInput('');
    setCloseMatch(null);
  };

  if (showRules) {
    return (
      <div className="family-games-challenge rounded-[28px] border p-5 sm:p-7 space-y-5">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-[#FF4D6D]/12 text-[#FF4D6D] flex items-center justify-center animate-pulse">
          <Trophy className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-black text-white">Comment gagner la manche ?</h2>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/55">Deux équipes s’affrontent au duel. La meilleure réponse prend le contrôle, puis cherche le tableau jusqu’à trois erreurs. L’autre équipe peut alors tout voler avec une seule réponse.</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {['Duel', 'Contrôle', '3 erreurs', 'Vol'].map((label, index) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <span className="mx-auto flex w-7 h-7 items-center justify-center rounded-full bg-[#6C5CFF] text-[10px] font-black text-white">{index + 1}</span>
              <strong className="mt-2 block text-[10px] text-white">{label}</strong>
            </div>
          ))}
        </div>
        {!room && (
          <>
          {isPremium && <label className="block">
            <span className="mb-2 block text-xs font-black text-white">Pack de questions</span>
            <select value={selectedPack} onChange={event => setSelectedPack(event.target.value as FamilyChallengeQuestion['pack'] | 'Tous')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
              {['Tous', 'Essentiel', 'Enfants', 'Adolescents', 'Parents', 'Vacances', 'Fêtes', 'Culture familiale'].map(pack => <option key={pack} value={pack}>{pack}</option>)}
            </select>
          </label>}
          <label className="block">
            <span className="mb-2 block text-xs font-black text-white">Nombre de manches</span>
            <select value={totalRounds} onChange={event => setTotalRounds(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
              {[1, 3, 5, 7, 9].map(value => <option key={value} value={value}>{value} manche{value > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          </>
        )}
        <button type="button" onClick={() => {
          localStorage.setItem('mf_family_challenge_rules_seen', '1');
          setShowRules(false);
          if (room) applyState({ totalRounds }, 'configure');
        }} className="w-full rounded-2xl bg-[#FF4D6D] py-4 text-sm font-black text-white">
          Lancer le défi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {[
          ['faceoff', 'Duel'],
          ['play', 'En contrôle'],
          ['steal', 'Vol'],
          ['round-end', 'Fin de manche']
        ].map(([value, label], index) => (
          <div key={value} className={`flex min-w-fit items-center gap-1.5 rounded-full border px-3 py-2 text-[9px] font-black ${phase === value ? 'border-[#FF4D6D]/35 bg-[#FF4D6D]/12 text-[#FF4D6D]' : 'border-white/8 bg-white/5 text-white/35'}`}>
            <span>{index + 1}</span>{label}
          </div>
        ))}
        <button type="button" onClick={() => {
          const next = !silentMode;
          setSilentMode(next);
          localStorage.setItem('mf_games_silent', next ? '1' : '0');
        }} className="shrink-0 rounded-full border border-white/8 bg-white/5 p-2 text-white/55" title={silentMode ? 'Activer les sons' : 'Mode silencieux'}>
          {silentMode ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => setShowRules(true)} className="shrink-0 rounded-full border border-white/8 bg-white/5 p-2 text-white/55" title="Règles">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {teams.map((team, index) => (
          <div key={team.id} className={`glass-panel rounded-[22px] border p-4 text-center ${activeTeam === index && phase !== 'faceoff' && phase !== 'round-end' ? 'border-[#FFB020]/40' : 'border-white/8'}`}>
            <strong className="block text-xs text-white truncate">{team.name}</strong>
            <span className="mt-1 block text-2xl font-black text-[#FFB020]">{scores[index]}</span>
            {controllingTeam === index && phase !== 'faceoff' && <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-black text-[#00D26A]"><Shield className="w-3 h-3" /> En contrôle</span>}
          </div>
        ))}
      </div>

      <section className="family-games-challenge rounded-[28px] border p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D6D]">
            {question.pack} · {question.ageGroup} · Manche {round + 1}
          </span>
          <button type="button" onClick={() => {
            const next = !timerRunning;
            setTimerRunning(next);
            if (next && room) applyState({}, 'start_timer');
          }} className={`flex items-center gap-1.5 text-sm font-black ${seconds <= 10 ? 'text-[#FF4D6D]' : 'text-[#FFB020]'}`}>
            <Clock3 className="w-4 h-4" /> {seconds}s
          </button>
        </div>
        <h2 className="mt-4 text-lg sm:text-2xl font-black leading-snug text-white">{question.prompt}</h2>
        <div className="mt-4 flex items-center justify-between text-xs font-black">
          <span className="text-white/45">{foundAnswers.length}/{question.answers.length} réponses</span>
          <span className="text-[#FFB020]">Cagnotte : {roundBank} pts</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {question.answers.map((answer, index) => {
          const revealed = foundAnswers.includes(index) || phase === 'round-end';
          return (
            <div key={answer.label} className={`min-h-14 rounded-2xl border px-3 py-3 flex items-center justify-between gap-2 ${revealed ? 'border-[#00D26A]/25 bg-[#00D26A]/10' : 'border-white/8 bg-white/5'}`}>
              <span className={`w-7 h-7 shrink-0 rounded-xl flex items-center justify-center text-[10px] font-black ${revealed ? 'bg-[#00D26A] text-[#07111F]' : 'bg-white/8 text-white/35'}`}>{index + 1}</span>
              <strong className={`flex-1 text-xs leading-tight ${revealed ? 'text-white' : 'text-white/25'}`}>{revealed ? answer.label : 'Réponse masquée'}</strong>
              {revealed && <span className="text-xs font-black text-[#FFB020]">{answer.points}</span>}
            </div>
          );
        })}
      </div>

      {phase === 'faceoff' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team, index) => {
            const canAnswer = !room || localTeamIndex === index;
            const submitted = room
              ? Boolean(index === 0 ? room.state.hostSubmitted : room.state.guestSubmitted)
              : Boolean(localFaceoffAnswers[index]);
            return (
              <div key={team.id} className="glass-panel rounded-[22px] border border-white/8 p-4 space-y-3">
                <strong className="text-xs text-white">{team.name} répond au duel</strong>
                {canAnswer ? (
                  <>
                    <input
                      type="password"
                      value={faceoffInputs[index]}
                      onChange={event => setFaceoffInputs(previous => index === 0 ? [event.target.value, previous[1]] : [previous[0], event.target.value])}
                      disabled={submitted || submitting}
                      placeholder="Réponse secrète..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none"
                    />
                    <button type="button" onClick={() => void submitFaceoff(index as 0 | 1)} disabled={submitted || !faceoffInputs[index].trim()} className={`w-full py-3 rounded-2xl disabled:opacity-40 text-xs font-black text-white ${index === 0 ? 'bg-[#6C5CFF]' : 'bg-[#FF4D6D]'}`}>
                      {submitted ? 'Réponse validée' : 'Valider'}
                    </button>
                  </>
                ) : (
                  <p className="rounded-2xl bg-white/5 p-3 text-xs text-white/45">{submitted ? 'Réponse validée' : 'La famille réfléchit...'}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(phase === 'play' || phase === 'steal') && (
        <div className="glass-panel rounded-[22px] border border-white/8 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="block text-sm text-white">
                {phase === 'steal' ? `Tentative de vol : ${teams[activeTeam].name}` : `À ${teams[activeTeam].name} de jouer`}
              </strong>
              <span className="text-[10px] text-white/45">{phase === 'steal' ? 'Une seule réponse pour prendre toute la cagnotte.' : 'Continuez jusqu’à trois erreurs.'}</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(index => <X key={index} className={`w-5 h-5 ${index < strikes ? 'text-[#FF4D6D]' : 'text-white/15'}`} />)}
            </div>
          </div>
          {(!room || localTeamIndex === activeTeam) ? (
            <div className="flex gap-2">
              <input
                value={guessInput}
                onChange={event => setGuessInput(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') submitGuess(); }}
                placeholder="Proposer une réponse..."
                className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none"
              />
              <button type="button" onClick={submitGuess} disabled={!guessInput.trim()} className="px-5 rounded-2xl bg-[#00D26A] disabled:opacity-40 text-[#07111F] font-black">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <p className="rounded-2xl bg-white/5 p-3 text-xs text-white/45">L’autre famille propose une réponse...</p>
          )}
        </div>
      )}

      {feedback && <p className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 p-3 text-center text-xs font-bold text-white">{feedback}</p>}

      {closeMatch?.answer && (
        <div className="rounded-[22px] border border-[#FFB020]/30 bg-[#FFB020]/10 p-4 space-y-3">
          <div>
            <strong className="block text-sm text-white">Réponse proche détectée</strong>
            <span className="text-xs text-white/55">Valider « {closeMatch.answer.label} » ?</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => {
              setCloseMatch(null);
              setGuessInput('');
              setFeedback('Réponse refusée par l’arbitre.');
              playCue('bad');
            }} className="rounded-2xl border border-white/10 py-3 text-xs font-black text-white/65">Refuser</button>
            <button type="button" onClick={confirmCloseAnswer} className="rounded-2xl bg-[#00D26A] py-3 text-xs font-black text-[#07111F]">Valider</button>
          </div>
        </div>
      )}

      {phase === 'round-end' && (
        <div className="glass-panel rounded-[24px] border border-[#FFB020]/25 p-5 text-center">
          <Trophy className="w-9 h-9 mx-auto text-[#FFB020]" />
          <h3 className="mt-2 text-lg font-black text-white">Manche terminée</h3>
          <p className="mt-1 text-xs text-white/50">{feedback}</p>
          <button type="button" onClick={nextRound} className="mt-4 w-full py-3 rounded-2xl bg-[#FFB020] text-[#07111F] text-xs font-black flex items-center justify-center gap-2">
            {round + 1 >= totalRounds ? 'Voir le résultat' : 'Manche suivante'} <Play className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
}
