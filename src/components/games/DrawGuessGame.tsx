import { useEffect, useRef, useState } from 'react';
import { Check, Eraser, Palette, RotateCcw, SkipForward, Timer } from 'lucide-react';

const DRAW_WORDS = [
  'Girafe', 'Maison', 'Anniversaire', 'Vélo', 'Arc-en-ciel', 'Pizza',
  'Château', 'Fusée', 'Chat', 'Plage', 'Bonhomme de neige', 'Sac à dos',
  'Téléphone', 'Gâteau', 'Bateau', 'École', 'Avion', 'Famille'
];

const COLORS = ['#111827', '#E11D48', '#2563EB', '#059669', '#B7791F', '#7C3AED'];

interface DrawGuessGameProps {
  playerName: string;
  onFinished: (score: number, rounds: number) => void;
}

export function DrawGuessGame({ playerName, onFinished }: DrawGuessGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [isErasing, setIsErasing] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [started, setStarted] = useState(false);
  const word = DRAW_WORDS[round % DRAW_WORDS.length];

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (!started || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds, started]);

  useEffect(() => {
    if (started && seconds === 0) {
      queueMicrotask(() => setStarted(false));
    }
  }, [seconds, started]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext('2d');
    context?.scale(ratio, ratio);
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!started) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;
    const next = pointFromEvent(event);
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(next.x, next.y);
    context.strokeStyle = isErasing ? 'rgba(0,0,0,1)' : color;
    context.lineWidth = isErasing ? 24 : 5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    context.stroke();
    lastPointRef.current = next;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const nextRound = (found: boolean) => {
    const nextScore = score + (found ? Math.max(10, seconds) : 0);
    const nextRoundNumber = round + 1;
    setScore(nextScore);
    setRound(nextRoundNumber);
    setSeconds(60);
    setStarted(false);
    clearCanvas();
    if (nextRoundNumber >= 5) onFinished(nextScore, nextRoundNumber);
  };

  if (!started) {
    return (
      <div className="glass-panel rounded-[28px] border border-white/8 p-6 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#6C5CFF]/12 text-[#6C5CFF] flex items-center justify-center">
          <Palette className="w-8 h-8" />
        </div>
        <div>
          <p className="text-xs font-bold text-white/50">{playerName} dessine</p>
          <h2 className="mt-2 text-3xl font-black text-white">{word}</h2>
          <p className="mt-2 text-xs text-white/50">Montre le mot uniquement au dessinateur, puis pose le téléphone au centre.</p>
        </div>
        {round >= 5 ? (
          <button type="button" onClick={() => { setRound(0); setScore(0); }} className="w-full py-3 rounded-2xl bg-[#6C5CFF] text-white text-xs font-black">
            Nouvelle partie
          </button>
        ) : (
          <button type="button" onClick={() => setStarted(true)} className="w-full py-3 rounded-2xl bg-[#00D26A] text-[#07111F] text-xs font-black">
            Commencer la manche {round + 1}/5
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
        <span className="text-xs font-black text-white">Manche {round + 1}/5</span>
        <span className={`flex items-center gap-1.5 text-sm font-black ${seconds <= 10 ? 'text-[#FF4D6D]' : 'text-[#FFB020]'}`}>
          <Timer className="w-4 h-4" /> {seconds}s
        </span>
        <span className="text-xs font-black text-[#00D26A]">{score} pts</span>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        className="family-games-canvas w-full h-[44vh] min-h-[300px] max-h-[520px] rounded-[24px] border touch-none"
        aria-label="Zone de dessin"
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {COLORS.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => { setColor(item); setIsErasing(false); }}
            className={`w-10 h-10 shrink-0 rounded-full border-4 ${color === item && !isErasing ? 'border-[#FFB020]' : 'border-transparent'}`}
            style={{ backgroundColor: item }}
            aria-label={`Couleur ${item}`}
          />
        ))}
        <button type="button" onClick={() => setIsErasing(value => !value)} className={`p-3 rounded-2xl border ${isErasing ? 'bg-[#FFB020]/15 border-[#FFB020]/30 text-[#FFB020]' : 'bg-white/5 border-white/8 text-white/60'}`} title="Gomme">
          <Eraser className="w-5 h-5" />
        </button>
        <button type="button" onClick={clearCanvas} className="p-3 rounded-2xl border border-white/8 bg-white/5 text-white/60" title="Effacer tout">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => nextRound(false)} className="py-3 rounded-2xl border border-white/8 bg-white/5 text-white/60 text-xs font-black flex items-center justify-center gap-2">
          <SkipForward className="w-4 h-4" /> Passer
        </button>
        <button type="button" onClick={() => nextRound(true)} className="py-3 rounded-2xl bg-[#00D26A] text-[#07111F] text-xs font-black flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> Trouvé
        </button>
      </div>
    </div>
  );
}
