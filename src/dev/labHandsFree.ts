import type { LabSpeechCallbacks } from './labSpeechRecognition.ts';

export type HandsFreePhase = 'listening' | 'speaking' | 'stopped';
type Handle = { abort(): void; stop(): void };
type Ports = {
  listen(callbacks: LabSpeechCallbacks): Handle;
  speak(text: string, end: () => void, error: () => void): () => void;
  interpret(text: string, elapsed: number, alternatives: string[]): { speech: string; continue: boolean };
  phase(value: HandsFreePhase): void;
  interim(text: string): void;
  error(text: string): void;
};

// Every callback is tied to a turn. A stopped/background session can never reopen the mic.
export function startLabHandsFree(ports: Ports, limits = { sessionMs: 120000, listenMs: 20000, speechMs: 30000, turns: 8 }) {
  let active = true;
  let epoch = 0;
  let turns = 0;
  let listener: Handle | undefined;
  let cancelSpeech: (() => void) | undefined;
  let turnTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (!active) return;
    active = false; epoch++;
    clearTimeout(turnTimer); clearTimeout(sessionTimer);
    listener?.abort(); listener = undefined; cancelSpeech?.(); cancelSpeech = undefined;
    ports.interim(''); ports.phase('stopped');
  };
  const fail = (message: string) => { if (active) { stop(); ports.error(message); } };
  const listen = () => {
    if (!active) return;
    if (++turns > limits.turns) { fail('Limite du dialogue atteinte. Relancez le micro pour continuer.'); return; }
    const turn = ++epoch;
    let final: [string, number, string[]] | undefined;
    let ended = false;
    const valid = () => active && epoch === turn;
    ports.phase('listening');
    turnTimer = setTimeout(() => fail('Écoute interrompue après le délai autorisé.'), limits.listenMs);
    try {
      const handle = ports.listen({
        interim: text => { if (valid()) ports.interim(text); },
        final: (text, elapsed, alternatives) => { if (valid()) final = [text, elapsed, alternatives]; },
        error: message => { if (valid()) fail(message); },
        end: () => {
          if (!valid() || ended) return;
          ended = true;
          listener = undefined; clearTimeout(turnTimer); ports.interim('');
          if (!final) { fail('Aucune phrase finale. Le dialogue est arrêté.'); return; }
          let result: ReturnType<Ports['interpret']>;
          try { result = ports.interpret(...final); } catch { fail('Impossible d’interpréter cette phrase. Rien n’est appliqué.'); return; }
          if (!valid()) return;
          if (!result.speech) { stop(); return; }
          ports.phase('speaking');
          turnTimer = setTimeout(() => fail('La lecture vocale ne répond plus. Dialogue arrêté.'), limits.speechMs);
          try {
            const cancel = ports.speak(result.speech.slice(0, 1800), () => {
              if (!valid()) return;
              cancelSpeech = undefined; clearTimeout(turnTimer);
              if (result.continue) listen(); else stop();
            }, () => { if (valid()) fail('Lecture vocale indisponible. Continuez par écrit.'); });
            if (valid()) cancelSpeech = cancel; else cancel();
          } catch { fail('Lecture vocale indisponible. Continuez par écrit.'); }
        },
      });
      if (valid() && !ended) listener = handle; else handle.abort();
    } catch { fail('Impossible de démarrer le microphone.'); }
  };
  const sessionTimer = setTimeout(() => fail('Dialogue arrêté après deux minutes. Vous pouvez le relancer.'), limits.sessionMs);
  listen();
  return { stop, finishPhrase: () => listener?.stop() };
}
