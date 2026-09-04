import assert from 'node:assert/strict';
import test from 'node:test';
import { startLabRecognition, type LabRecognition, type LabSpeechEvent } from '../src/dev/labSpeechRecognition.ts';

class FakeRecognition implements LabRecognition {
  static instance: FakeRecognition;
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
  onresult: LabRecognition['onresult'] = null; onerror: LabRecognition['onerror'] = null; onend: LabRecognition['onend'] = null;
  stopped = false; aborted = false;
  constructor() { FakeRecognition.instance = this; }
  start() {}
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
}
const event = (rows: [string, boolean][], resultIndex = 0): LabSpeechEvent => ({ resultIndex, results: rows.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })) });
function harness() {
  const final: string[] = []; const interim: string[] = []; const errors: string[] = []; const durations: number[] = []; let ended = 0; let time = 0;
  const controller = startLabRecognition(FakeRecognition, { interim: text => interim.push(text), final: (text, duration) => { final.push(text); durations.push(duration); }, error: text => errors.push(text), end: () => { ended++; } }, () => time += 10);
  return { controller, recognition: FakeRecognition.instance, final, interim, errors, durations, ended: () => ended };
}

test('le banc vocal agrège les segments finaux après les pauses, sans doublon ni envoi intermédiaire', () => {
  const h = harness();
  h.recognition.onresult?.(event([['ajoute', false]])); assert.deepEqual(h.final, []);
  h.recognition.onresult?.(event([['ajoute du lait', true], ['non', false]]));
  h.recognition.onresult?.(event([['ajoute du lait', true], ['non plutôt deux', true]], 1));
  h.recognition.onresult?.(event([['ajoute du lait', true], ['non plutôt deux', true]], 1));
  assert.deepEqual(h.final, []);
  h.controller.stop(); assert.equal(h.recognition.stopped, true);
  h.recognition.onend?.(); h.recognition.onend?.();
  assert.deepEqual(h.final, ['ajoute du lait non plutôt deux']); assert.equal(h.ended(), 1); assert.equal(h.durations.length, 1);
});
test('abandon au changement de profil ou démontage : callbacks tardifs inertes', () => {
  const h = harness(); const callback = h.recognition.onresult; const end = h.recognition.onend;
  h.controller.abort(); callback?.(event([['ajoute du lait', true]])); end?.();
  assert.deepEqual(h.final, []); assert.equal(h.recognition.aborted, true);
});
test('erreur du service : aucune application d’une transcription partielle', () => {
  const h = harness(); h.recognition.onresult?.(event([['ajoute du lait', true]]));
  h.recognition.onerror?.({ error: 'network' }); h.recognition.onend?.();
  assert.deepEqual(h.final, []); assert.match(h.errors[0], /ne répond pas/); assert.equal(h.ended(), 1);
});
test('fin sans parole : message explicite et aucun appel du parseur', () => {
  const h = harness(); h.recognition.onend?.(); assert.deepEqual(h.final, []); assert.match(h.errors[0], /Aucune transcription finale/);
});
test('refus de permission : pas de redémarrage automatique', () => {
  const h = harness(); h.recognition.onerror?.({ error: 'not-allowed' }); assert.match(h.errors[0], /refusé/); assert.equal(h.recognition.aborted, true);
});

test('alternatives réelles : agrégation bornée sans combinaisons inventées', () => {
  let actual: string[] = [];
  const controller = startLabRecognition(FakeRecognition, { interim() {}, error() {}, end() {}, final: (_text, _elapsed, alternatives) => { actual = alternatives; } });
  const recognition = FakeRecognition.instance;
  assert.equal(recognition.maxAlternatives, 3);
  recognition.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'ajoute du pain' }, { transcript: 'ajoute du lait' }], { isFinal: true }), Object.assign([{ transcript: 'et deux pommes' }, { transcript: 'et trois pommes' }], { isFinal: true })] });
  recognition.onend?.(); controller.abort();
  assert.deepEqual(actual, ['ajoute du lait et deux pommes', 'ajoute du pain et trois pommes']);
});
test('silence du dialogue : stop borné, puis un seul résultat final', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let count = 0;
  const controller = startLabRecognition(FakeRecognition, { interim() {}, error() {}, end() {}, final() { count++; } }, () => 1, 1600);
  FakeRecognition.instance.onresult?.(event([['du lait', true]]));
  t.mock.timers.tick(1601); assert.equal(FakeRecognition.instance.stopped, true); assert.equal(count, 0);
  FakeRecognition.instance.onend?.(); assert.equal(count, 1); controller.abort();
});
