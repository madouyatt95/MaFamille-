import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFamilyLabVoice, emptyFamilyVoiceContext } from '../src/ai/local/familyVoiceDialogue.ts';
import { suggestGroceryTranscriptions } from '../src/ai/local/groceryHearing.ts';
import { replayFeedback } from '../src/ai/local/parserFeedback.ts';

const run = (...turns: string[]) => {
  let context = emptyFamilyVoiceContext();
  let result = parseFamilyLabVoice('annule');
  turns.forEach((turn, index) => { result = parseFamilyLabVoice(turn, context, { now: 1000 + index, scopeKey: 'next', utteranceId: `u-${index}` }); context = result.context; });
  return result;
};
test('deux packs de six repartis par variante, correction ciblee sans perte du conditionnement', () => {
  const result = run('ajoute deux packs de six yaourts, un nature et l’autre à la fraise', 'finalement remplace seulement celui à la fraise par à la vanille');
  assert.equal(result.status, 'proposed');
  assert.deepEqual(result.context.grocery.proposal.map(item => [item.name, item.amount]), [['Yaourts nature', { value: 1, unit: 'pack', packSize: 6 }], ['Yaourts à la vanille', { value: 1, unit: 'pack', packSize: 6 }]]);
});
test('remplacement cible sans destination pose une seule question', () => {
  const result = run('ajoute deux packs de six yaourts, un nature et l’autre à la fraise', 'finalement remplace seulement celui à la fraise', 'nature');
  assert.equal(result.status, 'needs_clarification'); // merging variants is never silent
});
test('repartition incoherente ne confirme aucun ajout', () => {
  const result = run('ajoute trois packs de six yaourts, un nature et l’autre à la fraise', 'oui');
  assert.equal(result.status, 'needs_clarification'); assert.equal(result.receipt, undefined);
});
test('planification conserve les quantites connues et pose une question par produit manquant', () => {
  const result = run('il faut prevoir de la boisson pour 3 personnes', 'trois jus d orange et du coca et de l eau', 'une bouteille', 'deux bouteilles');
  assert.equal(result.status, 'proposed');
  assert.deepEqual(result.context.grocery.proposal.map(item => item.amount), [{ value: 3, unit: 'piece' }, { value: 1, unit: 'bottle' }, { value: 2, unit: 'bottle' }]);
});
test('suggestion de transcription reste un choix et conserve le nombre', () => {
  const choice = run('trois jours orange');
  assert.equal(choice.status, 'needs_clarification'); assert.equal(choice.context.grocery.hasProposal, undefined);
  const selected = run('trois jours orange', '2');
  assert.equal(selected.status, 'proposed'); assert.equal(selected.context.grocery.proposal[0].amount.value, 3);
  assert.equal(run('trois jours orange', 'oui').status, 'needs_clarification');
});
test('aucune correction de prix, personnes ou medicaments', () => {
  for (const phrase of ['note 20 euros pour trois jours orange', 'appelle mariane', 'medicament amoxiline', 'rdv demain']) assert.deepEqual(suggestGroceryTranscriptions(phrase, ['marianne', 'amoxiciline']), []);
});
test('retour consenti rejouable sans execution ni contexte familial', () => {
  assert.equal(replayFeedback({ id: 'test', createdAt: '2026-09-14T00:00:00Z', turns: ['il n y a plus de yaourts'], expectedNames: ['Yaourts'], expectedStatus: 'proposed' }).passed, true);
});
