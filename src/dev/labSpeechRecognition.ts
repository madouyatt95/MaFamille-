export type LabSpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
export type LabSpeechEvent = { resultIndex: number; results: ArrayLike<LabSpeechResult> };
export type LabRecognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: LabSpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export type LabRecognitionConstructor = new () => LabRecognition;
export const getLabRecognition = (): LabRecognitionConstructor | undefined => {
  const host = window as Window & { SpeechRecognition?: LabRecognitionConstructor; webkitSpeechRecognition?: LabRecognitionConstructor };
  return host.SpeechRecognition || host.webkitSpeechRecognition;
};
export type LabSpeechCallbacks = { interim(text: string): void; final(text: string, elapsed: number, alternatives: string[]): void; end(): void; error(message: string): void };
const errors: Record<string, string> = {
  'not-allowed': 'Accès au microphone refusé. Vérifiez les autorisations du navigateur.',
  'service-not-allowed': 'Le service de reconnaissance est indisponible sur cet appareil.',
  'audio-capture': 'Aucun microphone utilisable.', network: 'Le service vocal du navigateur ne répond pas. La saisie texte reste disponible.',
  'no-speech': 'Aucune parole reconnue. Réessayez.', aborted: 'Écoute interrompue.',
};

// Finals are indexed, accumulated, and delivered once on end; interim text never enters the parser.
export function startLabRecognition(Constructor: LabRecognitionConstructor, callbacks: LabSpeechCallbacks, clock = () => performance.now(), silenceMs?: number) {
  const recognition = new Constructor();
  const startedAt = clock();
  const finals = new Map<number, string>();
  const alternatives = new Map<number, string[]>();
  let active = true;
  let failed = false;
  let stopping = false;
  let finalAt: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let silence: ReturnType<typeof setTimeout> | undefined;
  const detach = () => { clearTimeout(timer); clearTimeout(silence); recognition.onresult = null; recognition.onerror = null; recognition.onend = null; };
  const abort = () => { if (!active) return; active = false; detach(); try { recognition.abort(); } catch { /* Already stopped by the browser. */ } };
  const stop = () => {
    if (!active || stopping) return;
    stopping = true;
    clearTimeout(timer);
    clearTimeout(silence);
    try { recognition.stop(); } catch { abort(); callbacks.error('Impossible de terminer la reconnaissance.'); callbacks.end(); return; }
    if (active) timer = setTimeout(() => { abort(); callbacks.error('La reconnaissance a dépassé le délai. Aucune phrase soumise.'); callbacks.end(); }, 5000);
  };
  recognition.lang = 'fr-FR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  recognition.onresult = event => {
    if (!active || failed) return;
    const interim: string[] = [];
    for (let index = 0; index < event.results.length; index++) {
      const result = event.results[index];
      if (!result?.[0]) continue;
      const text = result[0].transcript.trim();
      if (result.isFinal) {
        if (!finals.has(index)) { finals.set(index, text); alternatives.set(index, Array.from(result).slice(1, 3).map(value => value.transcript.trim()).filter(Boolean)); finalAt = clock(); }
      } else interim.push(text);
    }
    callbacks.interim([...finals.entries()].sort((a, b) => a[0] - b[0]).map(([, text]) => text).concat(interim).join(' '));
    clearTimeout(silence);
    if (silenceMs && !stopping) silence = setTimeout(stop, silenceMs);
  };
  recognition.onerror = event => {
    if (!active) return;
    failed = true;
    abort();
    callbacks.error(errors[event.error || ''] || 'Reconnaissance indisponible. Réessayez ou utilisez le texte.');
    callbacks.end();
  };
  recognition.onend = () => {
    if (!active) return;
    active = false;
    detach();
    const entries = [...finals.entries()].sort((a, b) => a[0] - b[0]);
    const transcript = entries.map(([, text]) => text).join(' ').trim();
    // Change one ambiguous segment at a time; never invent a Cartesian combination.
    const variants = entries.flatMap(([index]) => (alternatives.get(index) || []).map(value => entries.map(([key, text]) => key === index ? value : text).join(' ')));
    if (variants.length > 4) callbacks.error('Trop de passages incertains. Répétez une phrase plus courte.');
    else if (!failed && transcript) callbacks.final(transcript, (finalAt ?? clock()) - startedAt, [...new Set(variants)]);
    else if (!failed) callbacks.error('Aucune transcription finale. Rien n’a été soumis.');
    callbacks.end();
  };
  try { recognition.start(); } catch { abort(); throw new Error('Le navigateur ne peut pas démarrer la reconnaissance.'); }
  if (active) timer = setTimeout(stop, 45000);
  return { stop, abort };
}
