import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { startLabHandsFree, type HandsFreePhase } from '../src/dev/labHandsFree.ts';
import type { LabSpeechCallbacks } from '../src/dev/labSpeechRecognition.ts';

function harness(t: TestContext, continueDialogue = true, turns = 8) {
  const phases: HandsFreePhase[] = []; const errors: string[] = [];
  const callbacks: LabSpeechCallbacks[] = []; const speech: { end(): void; error(): void; cancelled: boolean }[] = [];
  let mic = false; let speaking = false; let interpreted = 0; let aborted = 0;
  const controller = startLabHandsFree({
    listen: value => { assert.equal(speaking, false, 'mic pendant TTS'); mic = true; callbacks.push(value); return { stop() {}, abort() { aborted++; mic = false; } }; },
    speak: (_text, end, error) => { assert.equal(mic, false, 'TTS pendant micro'); speaking = true; const utterance = { end: () => { speaking = false; end(); }, error, cancelled: false }; speech.push(utterance); return () => { speaking = false; utterance.cancelled = true; }; },
    interpret: () => { interpreted++; return { speech: 'Quels produits ?', continue: continueDialogue }; },
    phase: value => phases.push(value), interim() {}, error: value => errors.push(value),
  }, { sessionMs: 120000, listenMs: 20000, speechMs: 30000, turns });
  const finish = (text = 'du lait') => { const cb = callbacks.at(-1)!; cb.final(text, 100, []); mic = false; cb.end(); };
  t.after(() => controller.stop());
  return { controller, callbacks, speech, phases, errors, finish, interpreted: () => interpreted, aborted: () => aborted };
}
test('mains libres : question puis nouvelle écoute seulement après end de TTS', t => {
  const h = harness(t); assert.deepEqual(h.phases, ['listening']);
  h.finish(); assert.deepEqual(h.phases, ['listening', 'speaking']); assert.equal(h.callbacks.length, 1);
  h.speech[0].end(); assert.equal(h.callbacks.length, 2); assert.equal(h.phases.at(-1), 'listening');
});
test('stop pendant TTS : aucun redémarrage, même si callback tardif', t => {
  const h = harness(t); h.finish(); h.controller.stop(); h.speech[0].end();
  assert.equal(h.speech[0].cancelled, true); assert.equal(h.callbacks.length, 1); assert.equal(h.phases.at(-1), 'stopped');
});
test('stop pendant écoute : résultat tardif ignoré', t => {
  const h = harness(t); h.controller.stop(); h.finish();
  assert.equal(h.interpreted(), 0); assert.equal(h.aborted(), 1); assert.equal(h.speech.length, 0);
});
test('confirmation terminale lue une fois puis fin du dialogue', t => {
  const h = harness(t, false); h.finish(); h.speech[0].end(); h.speech[0].end();
  assert.equal(h.callbacks.length, 1); assert.equal(h.phases.at(-1), 'stopped');
});
test('erreur réseau ou permission : pas de boucle de redémarrage', t => {
  const h = harness(t); h.callbacks[0].error('permission refusée'); h.finish();
  assert.equal(h.callbacks.length, 1); assert.equal(h.interpreted(), 0); assert.equal(h.phases.at(-1), 'stopped');
});
test('end répété ne réinterprète pas une phrase ni ne double la lecture', t => {
  const h = harness(t); h.finish(); h.callbacks[0].end();
  assert.equal(h.interpreted(), 1); assert.equal(h.speech.length, 1);
});
test('délai écoute : arrêt complet', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const h = harness(t);
  t.mock.timers.tick(20001); assert.equal(h.phases.at(-1), 'stopped'); assert.match(h.errors[0], /délai/);
});
test('TTS sans end : watchdog ne relance jamais le micro', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const h = harness(t); h.finish();
  t.mock.timers.tick(30001); h.speech[0].end(); assert.equal(h.callbacks.length, 1); assert.match(h.errors[0], /lecture vocale/);
});
test('nombre de tours borné', t => {
  const h = harness(t, true, 2); h.finish(); h.speech[0].end(); h.finish(); h.speech[1].end();
  assert.equal(h.callbacks.length, 2); assert.equal(h.phases.at(-1), 'stopped'); assert.match(h.errors[0], /Limite/);
});
test('arrêt après deux minutes même avec activité', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const h = harness(t);
  for (let index = 0; index < 5; index++) { t.mock.timers.tick(10000); h.finish(); t.mock.timers.tick(10000); h.speech[index].end(); }
  t.mock.timers.tick(10000); h.finish(); t.mock.timers.tick(10001);
  assert.equal(h.phases.at(-1), 'stopped'); assert.match(h.errors[0], /deux minutes/);
});
