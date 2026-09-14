import test from 'node:test';
import assert from 'node:assert/strict';
import { pilotList, pilotAfter, shouldUseVoicePilot, pilotScope, pilotKey } from '../src/ai/local/voicePilot.ts';
import { parseSafeGroceryVoiceV2 } from '../src/ai/local/safeGroceryParserV2.ts';
import { eventMoveCandidates, movedTime, parseEventMove } from '../src/ai/local/eventMove.ts';

test('pilote ferme par defaut, iOS et dialogue actuel preserves, budget jamais detourne', () => {
  for (const phrase of ['ajoute du lait', 'il faut prevoir de la boisson', 'decale le rdv de trente minutes']) {
    assert.equal(shouldUseVoicePilot(phrase, false, false, false), false);
    assert.equal(shouldUseVoicePilot(phrase, true, true, false), false);
    assert.equal(shouldUseVoicePilot(phrase, true, false, true), false);
    assert.equal(shouldUseVoicePilot(phrase, true, false, false), true);
  }
  for (const phrase of ['ajoute 20 euros de courses', 'note une depense de 15 euros', 'ajoute du lait puis note 20 euros de courses', 'prends rdv chez le medecin', 'ouvre voyage', 'ajoute un vaccin']) assert.equal(shouldUseVoicePilot(phrase, true, false, false), false);
  assert.notEqual(pilotKey(pilotScope('a', 'b', 'c')), pilotKey(pilotScope('a', 'b', 'd')));
});
test('edition conserve id et laisse les donnees non modifiees intactes', () => {
  const rows = [{ id: 'a', name: 'Yaourts nature', category: null, quantity: '1 pack de 6', checked: null }, { id: 'b', name: 'Lait', category: 'Frais', quantity: '2', checked: false }];
  const list = pilotList(rows);
  assert.deepEqual(pilotAfter(rows, list, () => 'new'), rows);
  const next = parseSafeGroceryVoiceV2('remplace seulement celui nature par à la fraise', undefined, { list });
  assert.equal(next.status, 'proposed');
  const after = pilotAfter(rows, next.items, () => 'new');
  assert.equal(after[0].id, 'a'); assert.match(after[0].name, /fraise/); assert.equal(after[0].quantity, '1 pack de 6');
  assert.deepEqual(after[1], rows[1]);
  assert.throws(() => pilotAfter(rows, [{ ...list[0], recordId: 'missing' }], () => 'new'), /inconnu/);
  assert.throws(() => pilotList([...rows, { ...rows[0], id: 'duplicate' }]), /doublons/);
});
test('deplacement rendez vous selection explicite et horaires bornes', () => {
  const now = Date.parse('2026-09-14T10:00:00Z');
  const request = parseEventMove('décale le rendez-vous dentiste demain de trente minutes', now, 'Europe/Paris');
  assert.deepEqual(request, { date: '2026-09-15', search: 'dentiste', minutes: 30 });
  const event = { id: 'a', title: 'Dentiste', date_time: '2026-09-15', time: '10:00', member_id: null, done: false };
  assert.equal(eventMoveCandidates([event, { ...event, id: 'b' }], request!).length, 2);
  assert.equal(movedTime(event, 30), '10:30');
  assert.equal(movedTime({ ...event, time: '23:50' }, 30), null);
  assert.equal(parseEventMove('décale le dentiste de trente minutes si possible', now, 'Europe/Paris'), null);
  assert.equal(parseEventMove('avance le rdv de une heure', now, 'Europe/Paris')?.minutes, -60);
});
