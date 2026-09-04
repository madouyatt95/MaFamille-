import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SAFE_GROCERY_V2_CORPUS } from '../src/ai/local/groceryV2Corpus.ts';
import {
  EMPTY_GROCERY_CONVERSATION,
  detectProtectedVoiceDomain,
  normalizeSafeVoiceText,
  parseSafeGroceryVoiceV2,
  runGroceryShadowV2
} from '../src/ai/local/safeGroceryParserV2.ts';

test('le corpus fantôme couvre plus de cent formulations sans faux routage budget', () => {
  assert.ok(SAFE_GROCERY_V2_CORPUS.length >= 120);
  for (const scenario of SAFE_GROCERY_V2_CORPUS) {
    const result = parseSafeGroceryVoiceV2(scenario.text);
    assert.equal(result.domain, scenario.expectedDomain, `${scenario.id}: domaine pour « ${scenario.text} »`);
    assert.equal(result.status, scenario.expectedStatus, `${scenario.id}: statut pour « ${scenario.text} »`);
    if (scenario.expectedProduct) {
      assert.ok(
        result.items.some(item => item.name === scenario.expectedProduct),
        `${scenario.id}: produit ${scenario.expectedProduct} absent pour « ${scenario.text} »`
      );
    }
  }
});

test('le routeur protège le parseur Budget avant toute analyse Courses', () => {
  const budgetPhrases = [
    "j'ai payé 30 euros de courses",
    'ajoute 14,50 € de dépense au supermarché',
    'prévois un budget de 80 euros pour les courses'
  ];

  for (const phrase of budgetPhrases) {
    assert.equal(detectProtectedVoiceDomain(phrase), 'budget');
    const result = parseSafeGroceryVoiceV2(phrase);
    assert.equal(result.status, 'out_of_scope');
    assert.equal(result.items.length, 0);
    assert.match(result.explanation, /Budget/);
  }
});

test('la normalisation corrige la transcription sans modifier le texte global du micro', () => {
  assert.equal(
    normalizeSafeVoiceText("Euh 3jus d orange et une bouteille de coca s'il te plaît"),
    "3 jus d'orange et une bouteille de coca"
  );
  assert.equal(
    normalizeSafeVoiceText('ajoute le lait habituel', { 'le lait habituel': 'lait' }),
    'ajoute lait'
  );
});

test('le dialogue conserve une mémoire courte puis exige une confirmation', () => {
  const initial = parseSafeGroceryVoiceV2('il faut prevoir de la boisson pour 3 personnes');
  assert.equal(initial.status, 'needs_clarification');
  assert.equal(initial.nextContext.pending?.expectedCategory, 'Boissons');

  const followUp = parseSafeGroceryVoiceV2(
    '3jus d orange et une bouteille de coca',
    initial.nextContext
  );
  assert.equal(followUp.status, 'proposed');
  assert.equal(followUp.requiresConfirmation, true);
  assert.deepEqual(
    followUp.items.map(item => ({ name: item.name, quantity: item.quantity })),
    [
      { name: "Jus d'orange", quantity: '3 pièces' },
      { name: 'Coca-Cola', quantity: '1 bouteille' }
    ]
  );

  const confirmed = parseSafeGroceryVoiceV2('oui', followUp.nextContext);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.requiresConfirmation, false);
  assert.deepEqual(confirmed.nextContext, EMPTY_GROCERY_CONVERSATION);
});

test('les corrections vocales modifient uniquement la proposition en attente', () => {
  const initial = parseSafeGroceryVoiceV2('il faut prévoir de la boisson pour 3 personnes');
  const proposal = parseSafeGroceryVoiceV2(
    "3 jus d'orange et une bouteille de coca",
    initial.nextContext
  );
  const quantityUpdate = parseSafeGroceryVoiceV2('finalement 2 coca', proposal.nextContext);
  assert.equal(quantityUpdate.intent, 'shopping.quantity.update');
  assert.equal(quantityUpdate.items.find(item => item.name === 'Coca-Cola')?.quantity, '2 bouteilles');

  const removal = parseSafeGroceryVoiceV2("enlève le jus d'orange", quantityUpdate.nextContext);
  assert.equal(removal.intent, 'shopping.remove');
  assert.deepEqual(removal.items.map(item => item.name), ['Coca-Cola']);

  const replacement = parseSafeGroceryVoiceV2("remplace le coca par de l'eau", proposal.nextContext);
  assert.equal(replacement.intent, 'shopping.replace');
  assert.deepEqual(replacement.items.map(item => item.name), ["Jus d'orange", 'Eau']);
});

test('le dictionnaire familial reste injecté localement et explicite', () => {
  const result = parseSafeGroceryVoiceV2('ajoute le lait habituel', EMPTY_GROCERY_CONVERSATION, {
    aliases: { 'le lait habituel': 'lait' }
  });
  assert.equal(result.status, 'proposed');
  assert.deepEqual(result.items.map(item => item.name), ['Lait']);
});

test('le mode fantôme compare sans écrire et révèle les divergences', () => {
  const contextSnapshot = structuredClone(EMPTY_GROCERY_CONVERSATION);
  const comparison = runGroceryShadowV2("il n'y a plus de yaourts", EMPTY_GROCERY_CONVERSATION);

  assert.deepEqual(comparison.legacyItems.map(item => item.name), ["Il n'y a", 'Yaourts']);
  assert.deepEqual(comparison.safeResult.items.map(item => item.name), ['Yaourts']);
  assert.equal(comparison.diverged, true);
  assert.deepEqual(EMPTY_GROCERY_CONVERSATION, contextSnapshot);
});

test('la V2 reste hors du microphone principal et sans accès aux données', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const parserSource = readFileSync(new URL('../src/ai/local/safeGroceryParserV2.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(appSource, /safeGroceryParserV2|runGroceryShadowV2|parseSafeGroceryVoiceV2/);
  assert.doesNotMatch(parserSource, /\bsupabase\b|\bfetch\s*\(|localStorage|sessionStorage/);
});
