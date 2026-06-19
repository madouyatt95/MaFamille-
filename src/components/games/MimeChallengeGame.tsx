import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';

const MIME_CARDS = [
  'Marcher sur la Lune', 'Faire du ski', 'Un robot en panne', 'Un chat qui se réveille',
  'Souffler des bougies', 'Rater son bus', 'Nager sous l’eau', 'Faire une photo de famille',
  'Porter une valise très lourde', 'Danser sous la pluie', 'Chercher ses clés', 'Préparer une pizza',
  'Un super-héros qui décolle', 'Se brosser les dents', 'Un bébé qui apprend à marcher',
  'Ouvrir un cadeau surprenant', 'Jouer au tennis', 'Un pingouin pressé'
];

interface MimeChallengeGameProps {
  playerName: string;
  onFinished: (score: number, rounds: number) => void;
}

export function MimeChallengeGame({ playerName, onFinished }: MimeChallengeGameProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [passes, setPasses] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (running && seconds === 0 && !completedRef.current) {
      completedRef.current = true;
      queueMicrotask(() => {
        setRunning(false);
        onFinished(score, score + passes);
      });
    }
  }, [onFinished, passes, running, score, seconds]);

  const next = (found: boolean) => {
    if (found) setScore(value => value + 1);
    else setPasses(value => value + 1);
    setCardIndex(value => (value + 1) % MIME_CARDS.length);
    setRevealed(false);
  };

  const reset = () => {
    setScore(0);
    setPasses(0);
    setSeconds(60);
    setRunning(false);
    setRevealed(false);
    completedRef.current = false;
    setCardIndex(value => (value + 3) % MIME_CARDS.length);
  };

  if (!running) {
    return (
      <div className="glass-panel rounded-[28px] border border-white/8 p-6 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FF4D6D]/12 text-[#FF4D6D] flex items-center justify-center">
          <Eye className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{seconds === 0 ? 'Temps écoulé !' : `${playerName} fait deviner`}</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            Un proche tient le téléphone. Il montre chaque carte au mime et valide Trouvé ou Passer.
          </p>
        </div>
        {seconds === 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#00D26A]/10 p-3"><strong className="text-2xl text-[#00D26A]">{score}</strong><span className="block text-[10px] text-white/45">trouvés</span></div>
            <div className="rounded-2xl bg-white/5 p-3"><strong className="text-2xl text-white">{passes}</strong><span className="block text-[10px] text-white/45">passés</span></div>
          </div>
        )}
        <button type="button" onClick={() => { if (seconds === 0) reset(); completedRef.current = false; setRunning(true); }} className="w-full py-3 rounded-2xl bg-[#FF4D6D] text-white text-xs font-black flex items-center justify-center gap-2">
          <Play className="w-4 h-4 fill-current" /> {seconds === 0 ? 'Rejouer' : 'Lancer 60 secondes'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
        <span className="text-xs font-black text-[#00D26A]">{score} trouvés</span>
        <span className={`flex items-center gap-1.5 text-base font-black ${seconds <= 10 ? 'text-[#FF4D6D]' : 'text-[#FFB020]'}`}><Timer className="w-5 h-5" /> {seconds}s</span>
        <button type="button" onClick={reset} className="text-white/45" title="Arrêter"><RotateCcw className="w-4 h-4" /></button>
      </div>

      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="family-games-challenge w-full min-h-[320px] rounded-[28px] border p-6 flex flex-col items-center justify-center text-center"
      >
        {revealed ? (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4D6D]">À mimer</span>
            <strong className="mt-5 text-3xl sm:text-4xl leading-tight text-white">{MIME_CARDS[cardIndex]}</strong>
          </>
        ) : (
          <>
            <Eye className="w-10 h-10 text-[#6C5CFF]" />
            <strong className="mt-4 text-lg text-white">Touchez pour révéler la carte</strong>
          </>
        )}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => next(false)} className="py-4 rounded-2xl border border-white/8 bg-white/5 text-white/60 text-xs font-black flex items-center justify-center gap-2">
          <SkipForward className="w-4 h-4" /> Passer
        </button>
        <button type="button" onClick={() => next(true)} disabled={!revealed} className="py-4 rounded-2xl bg-[#00D26A] disabled:opacity-40 text-[#07111F] text-xs font-black flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> Trouvé
        </button>
      </div>
    </div>
  );
}
