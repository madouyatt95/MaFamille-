import test from 'node:test';
import assert from 'node:assert/strict';
import { pilotList, pilotAfter, shouldUseVoicePilot, pilotScope, pilotKey, pilotPartition, preservedTarget, pilotMealIntent, rebasePilotGroceries } from '../src/ai/local/voicePilot.ts';
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
test('article historique non interpretable : intact et sans bloquer un nouvel achat', () => {
  const rows = [{ id: 'a', name: 'un diner pour', category: null, quantity: '2', checked: false }];
  const before = structuredClone(rows);
  assert.deepEqual(pilotList(rows), []);
  assert.deepEqual(pilotAfter(rows, [], () => 'new'), rows);
  const parsed = parseSafeGroceryVoiceV2('ajoute un pain', undefined, { list: pilotList(rows) });
  const after = pilotAfter(rows, parsed.items, () => 'new');
  assert.equal(after.length, 2);
  assert.deepEqual(after[1], rows[0]);
  assert.deepEqual(rows, before);
});
test('articles preserves identifies uniquement quand ils sont vises', () => {
  const rows = [{ id: 'a', name: 'Personnes', category: null, quantity: '2', checked: null }];
  assert.equal(pilotPartition(rows).preserved.length, 1);
  assert.equal(preservedTarget('retire Personnes', rows)?.id, 'a');
  assert.equal(preservedTarget('ajoute deux pains', rows), undefined);
});
test('objectifs repas et menus ne routent pas une depense vers les courses', () => {
  assert.equal(pilotMealIntent('prépare un dîner pour deux personnes'), 'meal');
  assert.equal(pilotMealIntent('on mange quoi ce soir ?'), 'menu');
  assert.equal(pilotMealIntent("j'ai payé 25 euros au restaurant"), null);
  assert.equal(pilotMealIntent('ajoute deux tomates'), null);
  assert.equal(shouldUseVoicePilot("j'ai payé 25 euros au restaurant", true, false, false), false);
});
test('reprise conserve les changements independants et refuse un conflit cible', () => {
  const pain = { id: 'pain', name: 'Pain', quantity: '2', category: 'Autres', checked: false };
  const lait = { id: 'lait', name: 'Lait', quantity: '1', category: 'Frais', checked: false };
  const desired = [{ ...pain, quantity: '1' }];
  assert.deepEqual(rebasePilotGroceries([pain], desired, [pain, lait]), [desired[0], lait]);
  assert.throws(() => rebasePilotGroceries([pain], desired, [{ ...pain, quantity: '4' }]), /a changé/);
  assert.throws(() => rebasePilotGroceries([pain], desired, []), /a changé/);
  assert.throws(() => rebasePilotGroceries([], [pain], [{ ...pain, id: 'other' }]), /déjà présent/);
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
