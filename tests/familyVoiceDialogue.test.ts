import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseFamilyLabVoice as parse, emptyFamilyVoiceContext, parseLabExpense, splitLabCommands } from '../src/ai/local/familyVoiceDialogue.ts';
import { createFamilySimulation, simulateFamilyCommit, undoFamilySimulation } from '../src/ai/local/familyVoiceSimulation.ts';
import { parseSafeGroceryVoiceV2 } from '../src/ai/local/safeGroceryParserV2.ts';
import { decodeFamilyVocabulary, validateVocabularyEntry, vocabularyAliases } from '../src/ai/local/familyVocabulary.ts';
import { saveLabVocabulary, loadLabVocabulary } from '../src/dev/labVocabularyStorage.ts';
import { transcriptionMetrics } from '../src/ai/local/voiceLabMetrics.ts';

const options = { now: 1000, scopeKey: 'lab:parent', utteranceId: 'first' };
const yes = (result: ReturnType<typeof parse>) => parse('oui', result.context, { ...options, now: 1100, utteranceId: 'yes' });
const next = (text: string, result: ReturnType<typeof parse>, id = text) => parse(text, result.context, { ...options, now: 1050, utteranceId: id });

test('demande mixte : deux propositions, une confirmation, aucune modification réelle', () => {
  const result = parse('ajoute du lait et note 25 euros de courses', undefined, options);
  assert.equal(result.status, 'proposed');
  assert.equal(result.context.grocery.proposal[0].name, 'Lait');
  assert.deepEqual(result.expenses, [{ cents: 2500, currency: 'EUR', label: 'courses' }]);
  assert.equal(result.receipt, undefined);
  const confirmed = yes(result);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.receipt?.after[0].name, 'Lait');
  assert.equal(confirmed.receipt?.expenses[0].cents, 2500);
  assert.deepEqual(confirmed.context, emptyFamilyVoiceContext());
  // The older isolated parser still delegates the entire mixed request to Budget.
  assert.equal(parseSafeGroceryVoiceV2('ajoute du lait et note 25 euros de courses').domain, 'budget');
});

for (const phrase of [
  'note 25 € de courses puis ajoute du lait',
  'ajoute du lait; note 25 euros de courses',
  'ajoute du lait et enregistre une dépense de 25 eur pour courses',
]) test(`variantes de séparation explicite : ${phrase}`, () => {
  const result = parse(phrase, undefined, options);
  assert.equal(result.status, 'proposed'); assert.equal(result.expenses[0].cents, 2500); assert.equal(result.context.grocery.proposal[0].name, 'Lait');
});

for (const phrase of [
  'ajoute du lait et note beaucoup d’euros de courses',
  'ajoute du lait et note -25 euros de courses',
  'ajoute du lait et note 25 euros de courses si besoin',
  'ajoute du lait et ouvre la carte',
  'ajoute du lait et une dépense de 20 euros',
  'ajoute du lait et note 25,567 euros de courses',
  'note 25 euros de courses puis ajoute du lait seulement si besoin',
  'ajoute du lait et note 25 dollars de courses',
]) test(`aucun ajout partiel pour une demande non prise en charge : ${phrase}`, () => {
  const result = parse(phrase, undefined, options);
  assert.notEqual(result.status, 'proposed'); assert.equal(result.receipt, undefined);
  assert.deepEqual(result.context, emptyFamilyVoiceContext());
  assert.notEqual(yes(result).status, 'confirmed');
});

test('séparation limitée aux verbes, décimales et négation préservées', () => {
  assert.deepEqual(splitLabCommands('ajoute 1,5 kg de tomates et du lait'), ['ajoute 1,5 kg de tomates et du lait']);
  assert.equal(parseLabExpense('note 12,50 euros de courses')?.cents, 1250);
  assert.equal(parseLabExpense('note 0 euros de courses'), null);
  assert.equal(parseLabExpense('note 25 euros de courses non'), null);
});

for (const phrase of [
  'prends trois bouteilles de coca… non, deux et sans sucre',
  'prends trois bouteilles de coca non deux et sans sucre',
  'ajoute trois bouteilles de coca, non plutôt deux et sans sucre',
]) test(`hésitation sans doublon : ${phrase}`, () => {
  const result = parse(phrase, undefined, options);
  assert.equal(result.status, 'proposed');
  assert.equal(result.context.grocery.proposal.length, 1);
  assert.equal(result.context.grocery.proposal[0].name, 'Coca-Cola sans sucre');
  assert.deepEqual(result.context.grocery.proposal[0].amount, { value: 2, unit: 'bottle' });
  assert.equal(yes(result).status, 'confirmed');
});

test('une hésitation non résolue ne confirme pas la première partie', () => {
  for (const phrase of ['ajoute du lait… non, demain', 'ajoute du lait… non, -2', 'prends trois bouteilles… non, deux']) {
    const result = parse(phrase, undefined, options);
    assert.notEqual(result.status, 'proposed'); assert.notEqual(yes(result).status, 'confirmed');
  }
});

test('une demande non résolue ne disparaît pas derrière une seconde commande', () => {
  const result = parse('ajoute du skyr et ajoute du lait', undefined, options);
  assert.equal(result.status, 'needs_clarification');
  assert.deepEqual(result.context, emptyFamilyVoiceContext());
  assert.notEqual(yes(result).status, 'confirmed');
  const reversed = parse('ajoute du lait et ajoute du skyr', undefined, options);
  assert.equal(reversed.status, 'needs_clarification');
  const named = yes(reversed);
  assert.equal(named.status, 'proposed');
  assert.equal(named.context.grocery.proposal.length, 2);
});

test('des précisions contradictoires ne sont pas résolues arbitrairement', () => {
  assert.equal(parse('ajoute du lait entier écrémé', undefined, options).status, 'rejected');
});

test('référence nommée, précision puis quantité : seul le lait change', () => {
  const first = parse('ajoute 2 lait et 3 yaourts', undefined, options);
  const precision = next('le lait, prends-le sans lactose', first);
  assert.equal(precision.status, 'proposed');
  assert.deepEqual(precision.context.grocery.proposal.map(item => item.name), ['Lait sans lactose', 'Yaourts']);
  const quantity = next('finalement quatre', precision);
  assert.deepEqual(quantity.context.grocery.proposal.map(item => item.amount.value), [4, 3]);
});

test('pronom pluriel ambigu : question, sélection puis une confirmation', () => {
  const first = parse('ajoute du lait et des yaourts', undefined, options);
  const ambiguous = next('ceux-là sans lactose', first);
  assert.equal(ambiguous.status, 'needs_clarification'); assert.notEqual(yes(ambiguous).status, 'confirmed');
  const selected = next('le deuxième', ambiguous);
  assert.deepEqual(selected.context.grocery.proposal.map(item => item.name), ['Lait', 'Yaourts sans lactose']);
  assert.equal(yes(selected).status, 'confirmed');
  const named = next('le lait', ambiguous);
  assert.equal(named.context.grocery.proposal[0].name, 'Lait sans lactose');
});

test('les variantes restent distinctes et le nom générique ambigu ne modifie rien', () => {
  const first = parse('ajoute du lait entier et du lait écrémé', undefined, options);
  assert.equal(first.context.grocery.proposal.length, 2);
  const result = next('le lait prends-le sans lactose', first);
  assert.equal(result.status, 'needs_clarification');
  assert.notEqual(yes(result).status, 'confirmed');
});

test('planification : personnes conservées, aucune quantité inventée, confirmation finale unique', () => {
  const start = parse('il faut prévoir des boissons pour 3 personnes', undefined, options);
  assert.equal(start.context.grocery.planning?.people, 3);
  const drinks = next('du coca', start);
  assert.equal(drinks.status, 'needs_clarification'); assert.match(drinks.message, /quantité.*3 personnes/);
  assert.deepEqual(drinks.context.grocery.proposal, []);
  const amount = next('deux bouteilles', drinks);
  assert.equal(amount.status, 'proposed'); assert.equal(amount.context.grocery.planning?.people, 3);
  assert.equal(amount.context.grocery.proposal[0].quantity, '2 bouteilles');
  assert.equal(yes(amount).status, 'confirmed');
});

test('les quantités explicites évitent une question supplémentaire', () => {
  const start = parse('prévoir des boissons pour 3 personnes', undefined, options);
  const response = next('3jus d orange et une bouteille de coca', start);
  assert.equal(response.status, 'proposed'); assert.equal(response.context.grocery.proposal.length, 2);
  assert.equal(yes(response).status, 'confirmed');
});

test('une dépense ne court-circuite pas une clarification Courses', () => {
  const result = parse('prévoir des boissons pour 3 personnes et note 25 euros de courses', undefined, options);
  assert.equal(result.status, 'needs_clarification'); assert.equal(result.expenses.length, 1);
  assert.notEqual(yes(result).status, 'confirmed');
  const response = next('2 bouteilles de coca', result);
  assert.equal(yes(response).receipt?.expenses.length, 1);
});

test('profil, expiration, annulation et événements finaux répétés ferment les propositions mixtes', () => {
  const start = parse('ajoute du lait et note 25 euros de courses', undefined, options);
  for (const modified of [{ scopeKey: 'lab:child', now: 1100 }, { scopeKey: options.scopeKey, now: 130000 }]) {
    assert.notEqual(parse('oui', start.context, { ...options, ...modified }).status, 'confirmed');
  }
  assert.deepEqual(next('annule', start).context, emptyFamilyVoiceContext());
  assert.equal(parse('ajoute du lait', start.context, options).status, 'ignored');
  assert.equal(parse('ajoute du lait', start.context, { ...options, isFinal: false }).status, 'ignored');
});

test('simulation mixte atomique : droits, doublons, annulation et absence de mutation', () => {
  const state = createFamilySimulation(options.scopeKey);
  const proposal = parse('ajoute du lait et note 25 euros de courses', undefined, options);
  const result = yes(proposal);
  const policy = { scopeKey: options.scopeKey, canWrite: true };
  assert.equal(simulateFamilyCommit(state, proposal, policy, 1100).status, 'blocked');
  assert.equal(simulateFamilyCommit(state, result, { ...policy, canWrite: false }, 1100).status, 'blocked');
  const applied = simulateFamilyCommit(state, result, policy, 1100);
  assert.equal(applied.status, 'applied'); assert.equal(applied.state.expenses.length, 1); assert.equal(applied.state.groceries.list.length, 1);
  assert.equal(simulateFamilyCommit(applied.state, result, policy, 1100).status, 'duplicate');
  const undone = undoFamilySimulation(applied.state, policy);
  assert.deepEqual(undone.state.groceries.list, []); assert.deepEqual(undone.state.expenses, []);
  assert.deepEqual(state, createFamilySimulation(options.scopeKey));
  const corrupt = structuredClone(result); corrupt.receipt!.expenses[0].cents = -1;
  assert.equal(simulateFamilyCommit(state, corrupt, policy, 1100).status, 'blocked');
});

test('vocabulaire : validation fermée, consentement, relecture, édition, suppression et isolation de profil', () => {
  const entry = validateVocabularyEntry('le lait habituel', 'lait sans lactose');
  assert.deepEqual(entry, { phrase: 'lait habituel', product: 'Lait sans lactose' });
  for (const [from, to] of [['oui', 'lait'], ['budget habituel', 'lait'], ['lait habituel', '20 euros'], ['lait habituel', '3 lait'], ['lait habituel', 'lait et coca']]) assert.equal(validateVocabularyEntry(from, to), null);
  assert.deepEqual(decodeFamilyVocabulary('oops'), []);
  assert.deepEqual(decodeFamilyVocabulary('{"version":2,"entries":[]}'), []);
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  try {
    assert.equal(saveLabVocabulary(options.scopeKey, [entry!], false), false); assert.equal(values.size, 0);
    assert.equal(saveLabVocabulary(options.scopeKey, [entry!], true), true);
    const loaded = loadLabVocabulary(options.scopeKey);
    assert.deepEqual(loaded, [entry]); assert.deepEqual(loadLabVocabulary('lab:child'), []);
    assert.equal(parse('ajoute le lait habituel', undefined, { ...options, aliases: vocabularyAliases(loaded) }).context.grocery.proposal[0].name, 'Lait sans lactose');
    assert.equal(saveLabVocabulary(options.scopeKey, [{ phrase: 'lait habituel', product: 'Lait entier' }], true), true);
    assert.equal(loadLabVocabulary(options.scopeKey)[0].product, 'Lait entier');
    assert.equal(saveLabVocabulary(options.scopeKey, [], true), true); assert.deepEqual(loadLabVocabulary(options.scopeKey), []);
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('la mesure des mots ne prétend pas mesurer la pertinence du parseur', () => {
  assert.equal(transcriptionMetrics('', 'du lait'), null);
  assert.equal(transcriptionMetrics('Ajoute du lait.', 'ajoute du lait')?.wordErrorRate, 0);
  assert.equal(transcriptionMetrics('ajoute du lait', 'ajoute du pain')?.edits, 1);
  assert.equal(transcriptionMetrics('lait', 'du lait entier')?.wordErrorRate, 2);
});

test('aucune intégration dans le micro de production ni appel distant du dialogue', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /familyVoiceDialogue|VoiceBench|labSpeechRecognition|familyVocabulary/);
  for (const module of ['familyVoiceDialogue', 'familyVoiceSimulation', 'familyVocabulary', 'voiceLabMetrics']) {
    assert.doesNotMatch(readFileSync(new URL(`../src/ai/local/${module}.ts`, import.meta.url), 'utf8'), /\bfetch\s*\(|\bsupabase\b|localStorage|navigator\.mediaDevices/);
  }
});
