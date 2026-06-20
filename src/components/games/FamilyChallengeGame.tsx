import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock3, HelpCircle, Play, Shield, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import {
  FAMILY_CHALLENGE_QUESTIONS,
  getChallengeQuestion,
  type ChallengeQuestionFilters,
  type FamilyChallengeQuestion
} from '../../data/familyChallengeQuestions';
import { familyGameService, type FamilyGameRoom } from '../../services/familyGameService';
import { matchChallengeAnswer } from '../../utils/familyChallengeMatcher';

type ChallengePhase = 'faceoff' | 'play' | 'steal' | 'round-end' | 'game-end';

type Team = {
  id: string;
  name: string;
  members?: string[];
  captain?: string;
};

export type FamilyChallengeRoundSummary = {
  round: number;
  winner: number;
  bank: number;
  foundAnswers: number[];
  strikes: number;
  stolen: boolean;
};

export type FamilyChallengeRecap = {
  scores: [number, number];
  winnerName: string;
  roundsPlayed: number;
  suddenDeath: boolean;
  roundHistory: FamilyChallengeRoundSummary[];
};

interface FamilyChallengeGameProps {
  foyerId: string;
  isPremium: boolean;
  teams: [Team, Team];
  room: FamilyGameRoom | null;
  onRoomChange: (room: FamilyGameRoom) => void;
  onFinished: (recap: FamilyChallengeRecap) => void;
}

const asNumberArray = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];

const asScores = (value: unknown): [number, number] => {
  const scores = asNumberArray(value);
  return [scores[0] || 0, scores[1] || 0];
};

const asRoundHistory = (value: unknown): FamilyChallengeRoundSummary[] =>
  Array.isArray(value)
    ? value.filter((item): item is FamilyChallengeRoundSummary => (
      Boolean(item)
      && typeof item === 'object'
      && typeof (item as FamilyChallengeRoundSummary).round === 'number'
      && typeof (item as FamilyChallengeRoundSummary).winner === 'number'
    ))
    : [];

const isChallengeQuestion = (value: unknown): value is FamilyChallengeQuestion => {
  if (!value || typeof value !== 'object') return false;
  const question = value as FamilyChallengeQuestion;
  return typeof question.id === 'string'
    && typeof question.prompt === 'string'
    && Array.isArray(question.answers)
    && question.answers.length === 8;
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
  const [reconnectNow, setReconnectNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [showRules, setShowRules] = useState(() => (
    !isChallengeQuestion(roomState.question)
    || localStorage.getItem('mf_family_challenge_rules_seen') !== '1'
  ));
  const [totalRounds, setTotalRounds] = useState(() => typeof roomState.totalRounds === 'number' ? roomState.totalRounds : 5);
  const [silentMode, setSilentMode] = useState(() => localStorage.getItem('mf_games_silent') === '1');
  const [closeMatch, setCloseMatch] = useState<ReturnType<typeof matchChallengeAnswer> | null>(null);
  const initialFilters = roomState.filters && typeof roomState.filters === 'object'
    ? roomState.filters as ChallengeQuestionFilters
    : {};
  const [selectedPack, setSelectedPack] = useState<FamilyChallengeQuestion['pack'] | 'Tous'>(initialFilters.pack || 'Tous');
  const [selectedCategory, setSelectedCategory] = useState<FamilyChallengeQuestion['category'] | 'Toutes'>(initialFilters.category || 'Toutes');
  const [selectedDifficulty, setSelectedDifficulty] = useState<FamilyChallengeQuestion['difficulty'] | 'Toutes'>(initialFilters.difficulty || 'Toutes');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<FamilyChallengeQuestion['ageGroup'] | 'Tous'>(initialFilters.ageGroup || 'Tous');
  const [roundHistory, setRoundHistory] = useState<FamilyChallengeRoundSummary[]>(() => asRoundHistory(roomState.roundHistory));
  const [suddenDeath, setSuddenDeath] = useState(() => roomState.suddenDeath === true);
  const [playedQuestionIds, setPlayedQuestionIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`mf_family_challenge_played_${foyerId}`) || '[]');
    } catch {
      return [];
    }
  });
  const timerExpiredRef = useRef(false);
  const finishedRoomRef = useRef<string | null>(null);

  const questionCount = isPremium ? FAMILY_CHALLENGE_QUESTIONS.length : 12;
  const questionFilters = useMemo<ChallengeQuestionFilters>(() => ({
    pack: selectedPack === 'Tous' ? undefined : selectedPack,
    category: selectedCategory === 'Toutes' ? undefined : selectedCategory,
    difficulty: selectedDifficulty === 'Toutes' ? undefined : selectedDifficulty,
    ageGroup: selectedAgeGroup === 'Tous' ? undefined : selectedAgeGroup
  }), [selectedAgeGroup, selectedCategory, selectedDifficulty, selectedPack]);
  const localQuestion = useMemo(
    () => getChallengeQuestion(round, room?.code || foyerId, questionCount, playedQuestionIds.slice(-160), questionFilters),
    [foyerId, playedQuestionIds, questionCount, questionFilters, room?.code, round]
  );
  const question = isChallengeQuestion(roomState.question) ? roomState.question : localQuestion;
  const localTeamIndex: 0 | 1 = room?.guestFoyerId === foyerId ? 1 : 0;
  const activeTeam: 0 | 1 = phase === 'steal' ? (controllingTeam === 0 ? 1 : 0) : controllingTeam;
  const activeResponder = teams[activeTeam].members?.length
    ? teams[activeTeam].members![(foundAnswers.length + strikes + round) % teams[activeTeam].members!.length]
    : teams[activeTeam].captain;
  const pendingServerClose = room?.state.pendingCloseAnswer && typeof room.state.pendingCloseAnswer === 'object'
    ? room.state.pendingCloseAnswer as { answerIndex?: number; answerLabel?: string; team?: number }
    : null;
  const canArbitrateServerClose = Boolean(
    pendingServerClose
    && pendingServerClose.team === localTeamIndex
  );
  const disconnectedFoyerId = typeof room?.state.disconnectedFoyerId === 'string'
    ? room.state.disconnectedFoyerId
    : null;
  const reconnectDeadline = typeof room?.state.reconnectDeadline === 'string'
    ? new Date(room.state.reconnectDeadline)
    : null;
  const opponentDisconnected = Boolean(disconnectedFoyerId && disconnectedFoyerId !== foyerId);
  const reconnectExpired = Boolean(reconnectDeadline && reconnectDeadline.getTime() <= reconnectNow);
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

  const applyState = useCallback((updates: Record<string, unknown>, action: Parameters<typeof familyGameService.performRoomAction>[2]) => {
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
      if (state.challengePhase === 'faceoff' || state.challengePhase === 'play' || state.challengePhase === 'steal' || state.challengePhase === 'round-end' || state.challengePhase === 'game-end') {
        setPhase(state.challengePhase);
      }
      setScores(asScores(state.scores));
      if (state.controllingTeam === 0 || state.controllingTeam === 1) setControllingTeam(state.controllingTeam);
      setFoundAnswers(asNumberArray(state.foundAnswers));
      if (typeof state.strikes === 'number') setStrikes(state.strikes);
      if (typeof state.roundBank === 'number') setRoundBank(state.roundBank);
      if (typeof state.totalRounds === 'number') setTotalRounds(state.totalRounds);
      setRoundHistory(asRoundHistory(state.roundHistory));
      setSuddenDeath(state.suddenDeath === true);
      if (typeof state.feedback === 'string') setFeedback(state.feedback);
      if (typeof state.timerDeadline === 'string') {
        setSeconds(Math.max(0, Math.ceil((new Date(state.timerDeadline).getTime() - Date.now()) / 1000)));
        setTimerRunning(true);
      } else {
        setTimerRunning(false);
      }
    });
  }, [room]);

  useEffect(() => {
    if (room && isChallengeQuestion(room.state.question)) {
      queueMicrotask(() => setShowRules(false));
    }
  }, [room]);

  useEffect(() => {
    if (!room || room.status !== 'finished' || finishedRoomRef.current === room.id) return;
    finishedRoomRef.current = room.id;
    const finalScores = asScores(room.state.scores);
    const finalWinner = room.state.finalWinner === 1 ? 1 : 0;
    const winnerName = finalScores[0] === finalScores[1] && room.state.finalWinner === undefined
      ? 'Égalité'
      : teams[finalWinner].name;
    onFinished({
      scores: finalScores,
      winnerName,
      roundsPlayed: asRoundHistory(room.state.roundHistory).length,
      suddenDeath: room.state.suddenDeath === true,
      roundHistory: asRoundHistory(room.state.roundHistory)
    });
  }, [onFinished, room, teams]);

  useEffect(() => {
    if (!room?.id) return;
    const channel = familyGameService.subscribeToRoom(room.id, onRoomChange);
    return () => {
      void familyGameService.unsubscribe(channel);
    };
  }, [onRoomChange, room?.id]);

  useEffect(() => {
    if (!opponentDisconnected) return;
    const timer = window.setInterval(() => setReconnectNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [opponentDisconnected]);

  useEffect(() => {
    if (!timerRunning || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, timerRunning]);

  useEffect(() => {
    if (seconds > 0) timerExpiredRef.current = false;
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

    if (suddenDeath) {
      const nextScores: [number, number] = [...scores];
      nextScores[winner] += 1;
      setScores(nextScores);
      setFoundAnswers(found);
      setRoundBank(bank);
      setPhase('game-end');
      playCue('win');
      onFinished({
        scores: nextScores,
        winnerName: teams[winner].name,
        roundsPlayed: roundHistory.length,
        suddenDeath: true,
        roundHistory
      });
      return;
    }

    setControllingTeam(winner);
    setFoundAnswers(found);
    setRoundBank(bank);
    setStrikes(0);
    setPhase('play');
    setFeedback(`${teams[winner].name} prend la main avec la meilleure réponse.`);
  }, [onFinished, playCue, question, round, roundHistory, scores, suddenDeath, teams]);

  useEffect(() => {
    if (phase !== 'faceoff' || !faceoffAnswers[0] || !faceoffAnswers[1]) return;
    if (room) return;
    queueMicrotask(() => resolveFaceoff([faceoffAnswers[0]!, faceoffAnswers[1]!]));
  }, [faceoffAnswers, phase, resolveFaceoff, room]);

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
    const nextHistory = [...roundHistory, {
      round: round + 1,
      winner,
      bank: finalBank,
      foundAnswers: finalFound,
      strikes,
      stolen: phase === 'steal' && winner !== controllingTeam
    }];
    setScores(nextScores);
    setRoundHistory(nextHistory);
    setFoundAnswers(finalFound);
    setRoundBank(finalBank);
    setPhase('round-end');
    setFeedback(message);
    playCue('win');
    navigator.vibrate?.([80, 45, 160]);
  };

  useEffect(() => {
    if (seconds !== 0 || timerExpiredRef.current || phase === 'round-end' || phase === 'faceoff') return;
    if (room && localTeamIndex !== activeTeam) return;
    timerExpiredRef.current = true;
    queueMicrotask(() => {
      if (room) {
        void familyGameService.submitChallengeGuess(room.id, foyerId, '__timer_expired__')
          .then(result => {
            onRoomChange(result.room);
            if (result.message) setFeedback(result.message);
          })
          .catch(error => console.warn('[FamilyChallenge] Timer resolution rejected:', error));
        return;
      }
      if (phase === 'steal') {
        finishRound(controllingTeam, foundAnswers, roundBank, `Temps écoulé : ${teams[controllingTeam].name} garde la cagnotte.`);
        return;
      }
      setStrikes(3);
      setPhase('steal');
      setFeedback(`Temps écoulé : ${teams[controllingTeam === 0 ? 1 : 0].name} peut voler la cagnotte.`);
    });
  // finishRound intentionally reads the current round state when the timer expires.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam, applyState, controllingTeam, foyerId, foundAnswers, localTeamIndex, onRoomChange, phase, room, roundBank, seconds, teams]);

  const submitGuess = async () => {
    const value = guessInput.trim();
    if (!value || (room && localTeamIndex !== activeTeam)) return;
    if (room) {
      setSubmitting(true);
      try {
        const result = await familyGameService.submitChallengeGuess(room.id, foyerId, value);
        onRoomChange(result.room);
        setFeedback(result.message || '');
        if (result.status === 'accepted') {
          playCue('good');
          navigator.vibrate?.(35);
        } else if (result.status === 'rejected') {
          playCue('bad');
          navigator.vibrate?.(120);
        } else if (result.status === 'round_finished' || result.status === 'game_finished') {
          playCue('win');
          navigator.vibrate?.([80, 45, 160]);
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Réponse impossible à envoyer.');
      } finally {
        setSubmitting(false);
        setGuessInput('');
      }
      return;
    }
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
      playCue('good');
      navigator.vibrate?.(35);
      if (nextFound.length === question.answers.length) {
        finishRound(controllingTeam, nextFound, nextBank, `${teams[controllingTeam].name} a trouvé tout le tableau.`);
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
      }
    }
    setGuessInput('');
  };

  const nextRound = async () => {
    const nextRoundNumber = round + 1;
    const nextPlayedIds = [...playedQuestionIds.filter(id => id !== question.id), question.id].slice(-160);
    setPlayedQuestionIds(nextPlayedIds);
    localStorage.setItem(`mf_family_challenge_played_${foyerId}`, JSON.stringify(nextPlayedIds));
    const nextQuestion = getChallengeQuestion(
      nextRoundNumber,
      room?.code || foyerId,
      questionCount,
      nextPlayedIds,
      questionFilters
    );

    if (room) {
      if (room.hostFoyerId !== foyerId) return;
      try {
        const nextRoom = await familyGameService.performRoomAction(room.id, foyerId, 'next_round', {
          question: nextQuestion
        });
        onRoomChange(nextRoom);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Impossible de lancer la manche suivante.');
      }
      return;
    }

    if (nextRoundNumber >= totalRounds) {
      if (scores[0] === scores[1] && !suddenDeath) {
        setRound(nextRoundNumber);
        setSuddenDeath(true);
        setPhase('faceoff');
        setFoundAnswers([]);
        setFaceoffInputs(['', '']);
        setLocalFaceoffAnswers([null, null]);
        setFeedback('Égalité : une dernière question départage les équipes.');
        return;
      }
      const winnerName = scores[0] === scores[1] ? 'Égalité' : teams[scores[0] > scores[1] ? 0 : 1].name;
      onFinished({
        scores,
        winnerName,
        roundsPlayed: roundHistory.length,
        suddenDeath,
        roundHistory
      });
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
  };

  const confirmCloseAnswer = async () => {
    if (room) {
      try {
        const nextRoom = await familyGameService.performRoomAction(room.id, foyerId, 'confirm_close_answer');
        onRoomChange(nextRoom);
        playCue('good');
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Validation impossible.');
      }
      return;
    }
    if (!closeMatch?.answer || foundAnswers.includes(closeMatch.answerIndex)) {
      setCloseMatch(null);
      return;
    }
    const nextFound = [...foundAnswers, closeMatch.answerIndex];
    const nextBank = roundBank + closeMatch.answer.points;
    if (phase === 'steal') {
      finishRound(activeTeam, nextFound, nextBank, `${teams[activeTeam].name} vole la cagnotte !`);
      setGuessInput('');
      setCloseMatch(null);
      return;
    }
    if (nextFound.length === question.answers.length) {
      finishRound(controllingTeam, nextFound, nextBank, `${teams[controllingTeam].name} a trouvé tout le tableau.`);
      setGuessInput('');
      setCloseMatch(null);
      return;
    }
    setFoundAnswers(nextFound);
    setRoundBank(nextBank);
    setFeedback(`${closeMatch.answer.label} est validée par l’arbitre.`);
    playCue('good');
    setGuessInput('');
    setCloseMatch(null);
  };

  const rejectCloseAnswer = async () => {
    if (room) {
      try {
        const nextRoom = await familyGameService.performRoomAction(room.id, foyerId, 'reject_close_answer');
        onRoomChange(nextRoom);
        playCue('bad');
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Refus impossible.');
      }
      return;
    }
    setCloseMatch(null);
    setGuessInput('');
    setFeedback('Réponse refusée par l’arbitre.');
    playCue('bad');
    if (phase === 'steal') {
      finishRound(controllingTeam, foundAnswers, roundBank, `Vol manqué : ${teams[controllingTeam].name} garde la cagnotte.`);
      return;
    }
    const nextStrikes = strikes + 1;
    setStrikes(nextStrikes);
    if (nextStrikes >= 3) {
      setPhase('steal');
      setFeedback(`${teams[controllingTeam === 0 ? 1 : 0].name} a une réponse pour voler la cagnotte.`);
    }
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
        {(!room || room.hostFoyerId === foyerId) && (
          <div className="grid gap-3 sm:grid-cols-2">
          {isPremium && <label className="block">
            <span className="mb-2 block text-xs font-black text-white">Pack de questions</span>
            <select value={selectedPack} onChange={event => setSelectedPack(event.target.value as FamilyChallengeQuestion['pack'] | 'Tous')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
              {['Tous', 'Essentiel', 'Enfants', 'Adolescents', 'Parents', 'Vacances', 'Fêtes', 'Culture familiale'].map(pack => <option key={pack} value={pack}>{pack}</option>)}
            </select>
          </label>}
          {isPremium && <label className="block">
            <span className="mb-2 block text-xs font-black text-white">Catégorie</span>
            <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value as FamilyChallengeQuestion['category'] | 'Toutes')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
              {['Toutes', 'Maison', 'Quotidien', 'Repas', 'Vacances', 'École', 'Loisirs', 'Famille', 'Fêtes'].map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>}
          {isPremium && <label className="block">
            <span className="mb-2 block text-xs font-black text-white">Âge</span>
            <select value={selectedAgeGroup} onChange={event => setSelectedAgeGroup(event.target.value as FamilyChallengeQuestion['ageGroup'] | 'Tous')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
              {['Tous', 'Enfants', 'Adolescents', 'Famille', 'Adultes'].map(age => <option key={age} value={age}>{age}</option>)}
            </select>
          </label>}
          {isPremium && <label className="block">
            <span className="mb-2 block text-xs font-black text-white">Difficulté</span>
            <select value={selectedDifficulty} onChange={event => setSelectedDifficulty(event.target.value as FamilyChallengeQuestion['difficulty'] | 'Toutes')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
              {['Toutes', 'Facile', 'Intermédiaire', 'Difficile'].map(difficulty => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
            </select>
          </label>}
          <label className="block">
            <span className="mb-2 block text-xs font-black text-white">Nombre de manches</span>
            <select value={totalRounds} onChange={event => setTotalRounds(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
              {[1, 3, 5, 7, 9].map(value => <option key={value} value={value}>{value} manche{value > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          </div>
        )}
        {room && room.hostFoyerId !== foyerId ? (
          <p className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center text-xs text-white/55">La famille hôte prépare les règles et la première question.</p>
        ) : <button type="button" onClick={() => {
          localStorage.setItem('mf_family_challenge_rules_seen', '1');
          setShowRules(false);
          if (room) {
            applyState({
              totalRounds,
              question: localQuestion,
              filters: questionFilters,
              teamMembers: teams.map(team => team.members || []),
              teamCaptains: teams.map(team => team.captain || team.members?.[0] || '')
            }, 'configure');
          }
        }} className="w-full rounded-2xl bg-[#FF4D6D] py-4 text-sm font-black text-white">
          Lancer le défi
        </button>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {opponentDisconnected && (
        <div className="rounded-2xl border border-[#FFB020]/25 bg-[#FFB020]/10 p-4">
          <strong className="block text-sm text-white">L’autre famille est déconnectée</strong>
          <span className="mt-1 block text-xs text-white/50">
            {reconnectExpired ? 'Le délai de deux minutes est terminé.' : 'La partie reste ouverte pendant deux minutes.'}
          </span>
          {reconnectExpired && room && (
            <button type="button" onClick={() => {
              void familyGameService.performRoomAction(room.id, foyerId, 'claim_forfeit')
                .then(onRoomChange)
                .catch(error => setFeedback(error instanceof Error ? error.message : 'Action impossible.'));
            }} className="mt-3 rounded-xl bg-[#FFB020] px-4 py-2 text-xs font-black text-[#07111F]">
              Gagner par abandon
            </button>
          )}
        </div>
      )}
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
            {team.members && team.members.length > 0 && (
              <span className="mt-1 block truncate text-[9px] text-white/40">{team.members.join(' · ')}</span>
            )}
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
            if (next && room) applyState({ seconds: 60 }, 'start_timer');
          }} disabled={Boolean(room && room.hostFoyerId !== foyerId)} className={`flex items-center gap-1.5 text-sm font-black disabled:opacity-50 ${seconds <= 10 ? 'text-[#FF4D6D]' : 'text-[#FFB020]'}`}>
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
              <span className="text-[10px] text-white/45">
                {activeResponder ? `${activeResponder} répond · ` : ''}
                {phase === 'steal' ? 'une seule réponse pour prendre toute la cagnotte.' : 'continuez jusqu’à trois erreurs.'}
              </span>
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
                onKeyDown={event => { if (event.key === 'Enter') void submitGuess(); }}
                placeholder="Proposer une réponse..."
                className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none"
              />
              <button type="button" onClick={() => void submitGuess()} disabled={!guessInput.trim() || submitting} className="px-5 rounded-2xl bg-[#00D26A] disabled:opacity-40 text-[#07111F] font-black">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <p className="rounded-2xl bg-white/5 p-3 text-xs text-white/45">L’autre famille propose une réponse...</p>
          )}
        </div>
      )}

      {feedback && <p className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 p-3 text-center text-xs font-bold text-white">{feedback}</p>}

      {(closeMatch?.answer || pendingServerClose?.answerLabel) && (
        <div className="rounded-[22px] border border-[#FFB020]/30 bg-[#FFB020]/10 p-4 space-y-3">
          <div>
            <strong className="block text-sm text-white">Réponse proche détectée</strong>
            <span className="text-xs text-white/55">Valider « {pendingServerClose?.answerLabel || closeMatch?.answer?.label} » ?</span>
          </div>
          {(!room || canArbitrateServerClose) ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void rejectCloseAnswer()} className="rounded-2xl border border-white/10 py-3 text-xs font-black text-white/65">Refuser</button>
              <button type="button" onClick={() => void confirmCloseAnswer()} className="rounded-2xl bg-[#00D26A] py-3 text-xs font-black text-[#07111F]">Valider</button>
            </div>
          ) : (
            <p className="text-xs text-white/50">L’autre famille arbitre cette réponse.</p>
          )}
        </div>
      )}

      {phase === 'round-end' && (
        <div className="glass-panel rounded-[24px] border border-[#FFB020]/25 p-5 text-center">
          <Trophy className="w-9 h-9 mx-auto text-[#FFB020]" />
          <h3 className="mt-2 text-lg font-black text-white">Manche terminée</h3>
          <p className="mt-1 text-xs text-white/50">{feedback}</p>
          <button type="button" onClick={() => void nextRound()} disabled={Boolean(room && room.hostFoyerId !== foyerId)} className="mt-4 w-full py-3 rounded-2xl bg-[#FFB020] disabled:opacity-45 text-[#07111F] text-xs font-black flex items-center justify-center gap-2">
            {room && room.hostFoyerId !== foyerId ? 'En attente de la famille hôte' : round + 1 >= totalRounds ? 'Voir le résultat' : 'Manche suivante'} <Play className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
}
