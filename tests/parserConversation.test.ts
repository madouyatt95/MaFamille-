import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFamilyLabVoice, emptyFamilyVoiceContext, type FamilyVoiceOptions } from '../src/ai/local/familyVoiceDialogue.ts';
import { parseGroceryEntities } from '../src/ai/local/safeGroceryEntities.ts';
import { advanceEventMove, type EventMoveDraft } from '../src/ai/local/eventMoveDialogue.ts';
import { requestedEventTime } from '../src/ai/local/eventMove.ts';
import { replayFeedback, validFeedback } from '../src/ai/local/parserFeedback.ts';

function dialogue(turns: string[], options: FamilyVoiceOptions = {}) {
  let context = emptyFamilyVoiceContext();
  return turns.map((turn, index) => {
    const result = parseFamilyLabVoice(turn, context, { ...options, now: 1000 + index, scopeKey: 'parent-test', utteranceId: String(index) });
    context = result.context; return result;
  });
}
test('preparer un diner est une planification, jamais un produit', () => {
  for (const phrase of ['prepare un diner pour deux personnes', 'prépare un dîner pour 2 personnes', 'prévois un déjeuner pour trois personnes', 'organise un repas']) {
    const first = dialogue([phrase])[0];
    assert.equal(first.status, 'needs_clarification');
    assert.match(first.message, /Quels ingrédients/);
    assert.equal(first.context.grocery.hasProposal, undefined);
    assert.equal(first.receipt, undefined);
  }
  const results = dialogue(['prépare un dîner pour deux personnes', 'deux tomates et un pain', 'confirme']);
  assert.match(results[0].message, /2 personnes/);
  assert.equal(results[0].context.grocery.planning?.people, 2);
  assert.deepEqual(results[2].receipt!.after.map(item => item.name), ['Tomates', 'Pain']);
});
test('structure : politesse, quantite postposee, corrections successives et qualification ciblee', () => {
  const results = dialogue(['peux-tu ajouter du lait, trois bouteilles', 'deux finalement', 'le lait sans lactose', 'confirme']);
  assert.equal(results.at(-1)?.status, 'confirmed');
  const items = results.at(-1)!.receipt!.after;
  assert.deepEqual(items.map(item => [item.name, item.amount]), [['Lait sans lactose', { value: 2, unit: 'bottle' }]]);
});
test('quantite nommee seule corrige la proposition, ajout explicite reste cumulatif', () => {
  const corrected = dialogue(['ajoute trois bouteilles de lait et deux pains', '1 pain', 'confirme']).at(-1)!;
  assert.deepEqual(corrected.receipt!.after.map(item => [item.name, item.amount.value]), [['Lait', 3], ['Pain', 1]]);
  const added = dialogue(['ajoute deux pains', 'ajoute un pain', 'confirme']).at(-1)!;
  assert.equal(added.receipt!.after[0].amount.value, 3);
});
test('une correction conserve les autres produits et le nouveau referent apres remplacement', () => {
  const last = dialogue(['ajoute trois jus d orange et deux pains', 'remplace le pain par du lait', 'deux finalement', 'le lait sans lactose']).at(-1)!;
  assert.deepEqual(last.context.grocery.proposal.map(item => [item.name, item.amount.value]), [["Jus d'orange", 3], ['Lait sans lactose', 2]]);
});
test('sans sucre ajoute reste distinct de sans sucre', () => {
  const last = dialogue(['ajoute deux jus de pomme', 'le jus de pomme sans sucre ajouté']).at(-1)!;
  assert.equal(last.context.grocery.proposal[0].name, 'Jus de pomme sans sucre ajouté');
});
test('date et destinataire non supportes ne sont ni perdus ni transformes en produit', () => {
  for (const text of ['pour samedi, ajoute deux bouteilles de lait', 'ajoute deux bouteilles de lait pour maman']) {
    const last = dialogue([text, 'oui']).at(-1)!;
    assert.equal(last.status, 'needs_clarification'); assert.equal(last.receipt, undefined);
  }
});
test('liste reelle injectee : manque deja liste demande seulement la quantite supplementaire', () => {
  const list = parseGroceryEntities('deux bouteilles de lait').items;
  const results = dialogue(['il n y a plus de lait', 'une bouteille', 'confirme'], { list });
  assert.match(results[0].message, /déjà sur la liste/);
  assert.equal(results[1].status, 'proposed');
  assert.equal(results[2].receipt!.after[0].amount.value, 3);
  assert.equal(results[2].receipt!.before[0].amount.value, 2);
});
test('lecture de liste ne pretend pas connaitre le stock et ne cree pas de proposition', () => {
  const last = dialogue(['on a encore du lait'], { list: parseGroceryEntities('deux bouteilles de lait').items })[0];
  assert.match(last.message, /2 bouteilles/); assert.match(last.message, /pas un inventaire/);
  assert.equal(last.context.grocery.hasProposal, undefined); assert.equal(last.receipt, undefined);
});
test('alternatives de quantite : question ciblee et reponse naturelle sans choix silencieux', () => {
  const first = parseFamilyLabVoice('ajoute deux yaourts', undefined, { now: 1000, scopeKey: 'a', alternatives: ['ajoute douze yaourts'] });
  assert.match(first.message, /2 pièces ou 12 pièces/);
  assert.equal(first.context.grocery.hasProposal, undefined);
  const next = parseFamilyLabVoice('douze', first.context, { now: 1001, scopeKey: 'a' });
  assert.equal(next.status, 'proposed'); assert.equal(next.context.grocery.proposal[0].amount.value, 12);
  assert.equal(parseFamilyLabVoice('oui', first.context, { now: 1001, scopeKey: 'a' }).status, 'needs_clarification');
});
test('aucune clarification de quantite ne traverse vers budget ou sante', () => {
  for (const phrase of ['note deux euros de courses', 'ajoute deux medicaments']) {
    const first = parseFamilyLabVoice('ajoute deux yaourts', undefined, { now: 1000, scopeKey: 'a', alternatives: [phrase] });
    assert.doesNotMatch(first.message, /Pour Yaourts/); assert.equal(first.receipt, undefined);
  }
});
test('retours rejouables : quantite incorrecte et trop de questions font echouer le test', () => {
  const row = { id: 'fictional', createdAt: '2026-09-15T12:00:00Z', turns: ['ajoute deux laits'], expectedStatus: 'proposed' as const, expectedNames: ['Lait'], expectedItems: [{ name: 'Lait', quantity: '2 pièces' }], maxQuestions: 0 };
  assert.equal(replayFeedback(row).passed, true);
  assert.equal(replayFeedback({ ...row, expectedItems: [{ name: 'Lait', quantity: '3 pièces' }] }).passed, false);
  assert.equal(validFeedback({ ...row, expectedItems: [null] }), false);
});

const now = Date.parse('2026-09-15T08:00:00Z');
const members = [{ id: 'a', display_name: 'Alice' }, { id: 'b', display_name: 'Noé' }];
const events = members.map((member, i) => ({ id: member.id, title: 'Dentiste', date_time: '2026-09-16', time: i ? '11:00' : '10:00', member_id: member.id, done: false }));
test('agenda : selection membre puis heure, contexte et date conserves', () => {
  let state: EventMoveDraft | null = null;
  const replies = ['décale le dentiste demain', 'celui de Alice', 'à 16h30'].map((turn, index) => {
    const result = advanceEventMove(turn, state, events, members, now + index, 'Europe/Paris', 'parent')!;
    state = result.draft; return result;
  });
  assert.equal(replies[0].candidates.length, 2);
  assert.equal(replies[1].candidates.length, 1); assert.match(replies[1].message, /À quelle heure/);
  assert.equal(replies[2].draft!.request.date, '2026-09-16');
  assert.equal(replies[2].draft!.request.memberId, 'a');
  assert.equal(requestedEventTime(events[0], replies[2].draft!.request), '16:30');
});
test('agenda : horaire deja connu non redemande apres selection, membre reel seulement', () => {
  const first = advanceEventMove('décale le dentiste à 16h', null, events, members, now, 'Europe/Paris', 'parent')!;
  const second = advanceEventMove('celui de Noé', first.draft, events, members, now + 1, 'Europe/Paris', 'parent')!;
  assert.equal(second.draft!.request.time, '16:00'); assert.equal(second.candidates[0].id, 'b');
  assert.equal(advanceEventMove('celui de PapaDémo', first.draft, events, members, now + 1, 'Europe/Paris', 'parent')!.draft!.request.memberId, undefined);
  assert.equal(advanceEventMove('celui de PapaDémo', first.draft, events, members, now + 1, 'Europe/Paris', 'parent')!.ready, false);
  assert.equal(advanceEventMove('à 25h', second.draft, events, members, now + 1, 'Europe/Paris', 'parent')!.ready, false);
});
test('agenda : expiration, changement de profil, condition et changement de date bloques', () => {
  const first = advanceEventMove('décale le dentiste', null, events, members, now, 'Europe/Paris', 'parent')!;
  assert.equal(advanceEventMove('16h', first.draft, events, members, now + 120000, 'Europe/Paris', 'parent')!.draft, null);
  assert.equal(advanceEventMove('16h', first.draft, events, members, now + 1, 'Europe/Paris', 'autre')!.draft, null);
  assert.equal(advanceEventMove('décale le dentiste à vendredi', null, events, members, now, 'Europe/Paris', 'parent')!.draft, null);
  assert.equal(advanceEventMove('décale le dentiste de trente minutes si possible', null, events, members, now, 'Europe/Paris', 'parent')!.draft, null);
});
