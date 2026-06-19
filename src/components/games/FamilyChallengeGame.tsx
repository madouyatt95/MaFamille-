import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock3, Play, Shield, Trophy, X } from 'lucide-react';
import { getChallengeQuestion } from '../../data/familyChallengeQuestions';
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

  const questionCount = isPremium ? 48 : 12;
  const question = useMemo(
    () => getChallengeQuestion(round, room?.code || foyerId, questionCount),
    [foyerId, questionCount, room?.code, round]
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

  const applyState = useCallback((updates: Record<string, unknown>) => {
    if (!room) return;
    const nextState = { ...room.state, ...updates };
    onRoomChange({ ...room, state: nextState });
    void familyGameService.updateRoom(room.id, { status: 'active', state: nextState });
  }, [onRoomChange, room]);

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
    });
  }, [room]);

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
    });
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

  const finishRound = (winner: 0 | 1, finalFound: number[], finalBank: number, message: string) => {
    const nextScores: [number, number] = [...scores];
    nextScores[winner] += finalBank;
    setScores(nextScores);
    setFoundAnswers(finalFound);
    setRoundBank(finalBank);
    setPhase('round-end');
    setFeedback(message);
    applyState({
      challengePhase: 'round-end',
      scores: nextScores,
      foundAnswers: finalFound,
      roundBank: finalBank,
      roundWinner: winner
    });
  };

  const submitGuess = () => {
    const value = guessInput.trim();
    if (!value || (room && localTeamIndex !== activeTeam)) return;
    const match = matchChallengeAnswer(value, question);
    const accepted = match.status !== 'rejected' && !foundAnswers.includes(match.answerIndex);

    if (phase === 'steal') {
      if (accepted) {
        const nextFound = [...foundAnswers, match.answerIndex];
        const finalBank = roundBank + (match.answer?.points || 0);
        finishRound(activeTeam, nextFound, finalBank, `${teams[activeTeam].name} vole la cagnotte !`);
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
      if (nextFound.length === question.answers.length) {
        finishRound(controllingTeam, nextFound, nextBank, `${teams[controllingTeam].name} a trouvé tout le tableau.`);
      } else {
        applyState({ foundAnswers: nextFound, roundBank: nextBank });
      }
    } else {
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);
      setFeedback(foundAnswers.includes(match.answerIndex) ? 'Cette réponse a déjà été trouvée.' : 'Cette réponse n’est pas au tableau.');
      navigator.vibrate?.(120);
      if (nextStrikes >= 3) {
        setPhase('steal');
        setFeedback(`${teams[controllingTeam === 0 ? 1 : 0].name} a une réponse pour voler la cagnotte.`);
        applyState({ challengePhase: 'steal', strikes: 3 });
      } else {
        applyState({ strikes: nextStrikes });
      }
    }
    setGuessInput('');
  };

  const nextRound = () => {
    const nextRoundNumber = round + 1;
    if (nextRoundNumber % 5 === 0) {
      const winnerIndex = scores[0] >= scores[1] ? 0 : 1;
      onFinished(scores, teams[winnerIndex].name);
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
    });
  };

  return (
    <div className="space-y-4">
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
            {question.category} · Manche {round + 1}
          </span>
          <button type="button" onClick={() => setTimerRunning(value => !value)} className={`flex items-center gap-1.5 text-sm font-black ${seconds <= 10 ? 'text-[#FF4D6D]' : 'text-[#FFB020]'}`}>
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
              <strong className={`flex-1 text-xs truncate ${revealed ? 'text-white' : 'text-white/25'}`}>{revealed ? answer.label : 'Réponse masquée'}</strong>
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

      {phase === 'round-end' && (
        <div className="glass-panel rounded-[24px] border border-[#FFB020]/25 p-5 text-center">
          <Trophy className="w-9 h-9 mx-auto text-[#FFB020]" />
          <h3 className="mt-2 text-lg font-black text-white">Manche terminée</h3>
          <p className="mt-1 text-xs text-white/50">{feedback}</p>
          <button type="button" onClick={nextRound} className="mt-4 w-full py-3 rounded-2xl bg-[#FFB020] text-[#07111F] text-xs font-black flex items-center justify-center gap-2">
            Manche suivante <Play className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
}
