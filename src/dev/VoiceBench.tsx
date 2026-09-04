import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { getLabRecognition, startLabRecognition } from './labSpeechRecognition';
import { transcriptionMetrics } from '../ai/local/voiceLabMetrics';
import { startLabHandsFree, type HandsFreePhase } from './labHandsFree';

export type VoiceBenchObservation = { transcript: string; recognitionMs: number; parseMs: number; interpretation: string; status: string; speech?: string };
export function VoiceBench({ onTranscript, onListeningChange }: { onTranscript: (text: string, elapsed: number, alternatives?: string[]) => VoiceBenchObservation; onListeningChange: (active: boolean) => void }) {
  const [consent, setConsent] = useState(false);
  const [listening, setListening] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [expected, setExpected] = useState('');
  const [observation, setObservation] = useState<VoiceBenchObservation | null>(null);
  const [assessment, setAssessment] = useState('unrated');
  const [handsFree, setHandsFree] = useState(false);
  const [phase, setPhase] = useState<HandsFreePhase>('stopped');
  const controller = useRef<ReturnType<typeof startLabRecognition> | null>(null);
  const dialogue = useRef<ReturnType<typeof startLabHandsFree> | null>(null);
  const callback = useRef(onTranscript);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onListeningChange(listening); return () => onListeningChange(false); }, [listening, onListeningChange]);
  useEffect(() => {
    const cancel = () => { controller.current?.abort(); dialogue.current?.stop(); dialogue.current = null; controller.current = null; setListening(false); setStopping(false); setInterim(''); };
    const hidden = () => { if (document.hidden) cancel(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', cancel);
    return () => { controller.current?.abort(); dialogue.current?.stop(); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', cancel); };
  }, []);
  const supported = Boolean(getLabRecognition()) && window.isSecureContext;
  const metrics = observation ? transcriptionMetrics(expected, observation.transcript) : null;
  const cancel = () => { controller.current?.abort(); controller.current = null; dialogue.current?.stop(); dialogue.current = null; setListening(false); setStopping(false); setInterim(''); };
  const start = () => {
    const Constructor = getLabRecognition();
    if (!Constructor || !consent || !supported || controller.current) return;
    setError(''); setInterim(''); setListening(true); setStopping(false); setObservation(null); setAssessment('unrated');
    if (handsFree) {
      if (!window.speechSynthesis || window.speechSynthesis.speaking) { setListening(false); setError('Attendez la fin de la lecture vocale, ou désactivez le dialogue mains libres.'); return; }
      dialogue.current = startLabHandsFree({
        listen: callbacks => startLabRecognition(Constructor, callbacks, () => performance.now(), 1600),
        speak: (text, end, fail) => {
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.startsWith('fr'));
          utterance.lang = 'fr-FR'; utterance.voice = voices.find(voice => voice.localService) || voices[0] || null;
          let finished = false;
          utterance.onend = () => { if (!finished) { finished = true; end(); } };
          utterance.onerror = () => { if (!finished) { finished = true; fail(); } };
          window.speechSynthesis.speak(utterance);
          return () => { utterance.onend = null; utterance.onerror = null; if (!finished) { finished = true; window.speechSynthesis.cancel(); } };
        },
        interpret: (text, elapsed, alternatives) => {
          const result = callback.current(text, elapsed, alternatives); setObservation(result);
          return { speech: result.status === 'cancelled' ? '' : result.speech || result.interpretation, continue: ['proposed', 'needs_clarification'].includes(result.status) };
        },
        phase: value => { setPhase(value); setListening(value !== 'stopped'); setStopping(false); }, interim: setInterim, error: setError,
      });
      return;
    }
    try {
      controller.current = startLabRecognition(Constructor, {
        interim: setInterim,
        final: (text, elapsed, alternatives) => setObservation(callback.current(text, elapsed, alternatives)),
        error: setError,
        end: () => { controller.current = null; setListening(false); setStopping(false); setInterim(''); },
      });
    } catch (cause) { setListening(false); setError(cause instanceof Error ? cause.message : 'Microphone indisponible.'); }
  };
  return <section className="mt-4 border-t border-family-border pt-4" aria-label="Banc d’essai vocal">
    <h4 className="text-sm font-bold">Banc d’essai vocal</h4>
    <p className="mt-2 text-xs leading-relaxed text-family-text-secondary">La reconnaissance peut transmettre la voix au service du navigateur. Aucun audio enregistré par MyFamily+ ; transcription et mesures conservées uniquement pendant cette session du laboratoire.</p>
    {!supported && <p role="status" className="mt-2 text-xs text-family-warning">Micro de test indisponible dans ce navigateur ou hors connexion sécurisée. Les essais texte restent disponibles.</p>}
    <label className="mt-3 flex gap-2 text-xs"><input type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); if (!event.target.checked) cancel(); }} />J’autorise la reconnaissance vocale pour cet essai</label>
    <label className="mt-3 flex gap-2 text-xs"><input type="checkbox" checked={handsFree} disabled={!consent || !supported} onChange={event => { cancel(); setHandsFree(event.target.checked); }} />Dialogue vocal mains libres</label>
    {handsFree && <p className="mt-2 text-xs text-family-text-secondary">Questions lues à voix haute, puis reprise de l’écoute. Maximum 8 tours et 2 minutes. Aucune application automatique à la simulation.</p>}
    <label className="mt-3 block text-xs">Phrase attendue (facultatif)<input aria-label="Phrase attendue" maxLength={500} value={expected} disabled={listening} onChange={event => setExpected(event.target.value)} className="app-field mt-1 min-h-10 w-full rounded-lg px-2" /></label>
    <div className="mt-3 flex items-center gap-3">
      <button type="button" title={listening ? handsFree ? 'Arrêter le dialogue vocal' : 'Terminer la phrase' : 'Démarrer le micro de test'} aria-label={listening ? handsFree ? 'Arrêter le dialogue vocal' : 'Terminer la phrase' : 'Démarrer le micro de test'} disabled={!supported || !consent || stopping && !handsFree} onClick={() => { if (listening) { if (handsFree) cancel(); else { setStopping(true); controller.current?.stop(); } } else start(); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-family-border disabled:opacity-40">{listening ? <Square size={18} /> : <Mic size={18} />}</button>
      <p role="status" className="min-w-0 break-words text-xs">{stopping ? 'Fin de transcription…' : listening ? phase === 'speaking' && handsFree ? 'Lecture de la question · micro coupé' : interim || 'Écoute en cours…' : error || 'Micro arrêté'}</p>
      <button type="button" title="Effacer les mesures vocales" aria-label="Effacer les mesures vocales" disabled={listening} onClick={() => { setObservation(null); setExpected(''); setAssessment('unrated'); setError(''); }} className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-family-border"><Trash2 size={16} /></button>
    </div>
    {observation && <div className="mt-3 space-y-2 text-xs" aria-label="Mesures vocales">
      <p className="break-words"><strong>Transcription :</strong> {observation.transcript}</p>
      <p>Écarts de mots : {metrics ? `${metrics.edits} / ${metrics.words} (${Math.round(metrics.wordErrorRate * 100)} %)` : 'phrase de référence non renseignée'}</p>
      <p>Début d’écoute → dernier résultat final : {Math.round(observation.recognitionMs)} ms</p>
      <p>Interprétation locale : {observation.parseMs.toFixed(2)} ms</p>
      <p className="break-words">Résultat : {observation.interpretation}</p>
      <label className="block">Interprétation conforme à votre intention<select aria-label="Évaluation de l’interprétation" value={assessment} onChange={event => setAssessment(event.target.value)} className="app-field mt-1 min-h-10 w-full rounded-lg px-2"><option value="unrated">Non évaluée</option><option value="correct">Conforme</option><option value="wrong">À corriger</option></select></label>
    </div>}
  </section>;
}
