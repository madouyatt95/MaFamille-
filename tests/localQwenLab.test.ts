import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCAL_QWEN_CACHE_NAME,
  LOCAL_QWEN_ESTIMATED_BYTES,
  LOCAL_QWEN_MODEL_ID,
  LOCAL_QWEN_MODEL_REVISION
} from '../src/ai/local/contracts.ts';
import {
  LOCAL_AI_BENCHMARKS,
  STRUCTURED_ACTION_SYSTEM_PROMPT
} from '../src/ai/local/benchmarks.ts';
import { LOCAL_AI_CAPABILITY_CATALOG, LOCAL_AI_CAPABILITY_PACKS } from '../src/ai/local/capabilityCatalog.ts';
import { evaluateDeterministicGuardrail } from '../src/ai/local/deterministicGuardrails.ts';
import {
  analyzeGroceryParserExperiment,
  resolveGroceryParserClarification
} from '../src/ai/local/experimentalGroceryParser.ts';
import { PARSER_DERIVED_EXAMPLES, buildParserDerivedExamples } from '../src/ai/local/parserExampleLibrary.ts';
import { validateStructuredAction } from '../src/ai/local/structuredAction.ts';
import { ALL_FAMILY_MODULES } from '../src/types.ts';

test('le POC Qwen utilise un modèle versionné et un cache dédié', () => {
  assert.equal(LOCAL_QWEN_MODEL_ID, 'onnx-community/Qwen3.5-0.8B-ONNX-OPT');
  assert.match(LOCAL_QWEN_MODEL_REVISION, /^[a-f0-9]{40}$/);
  assert.match(LOCAL_QWEN_CACHE_NAME, /^myfamily-qwen-model-v\d+$/);
  assert.ok(LOCAL_QWEN_ESTIMATED_BYTES >= 700 * 1024 * 1024);
});

test('la bibliothèque couvre tous les modules avec 98 scénarios uniques', () => {
  assert.equal(LOCAL_AI_CAPABILITY_PACKS.length, ALL_FAMILY_MODULES.length);
  assert.deepEqual(
    new Set(LOCAL_AI_CAPABILITY_PACKS.map(pack => pack.module)),
    new Set(ALL_FAMILY_MODULES)
  );
  assert.equal(LOCAL_AI_BENCHMARKS.length, 98);
  assert.equal(new Set(LOCAL_AI_BENCHMARKS.map(item => item.id)).size, 98);
  assert.equal(new Set(LOCAL_AI_BENCHMARKS.map(item => item.module)).size, ALL_FAMILY_MODULES.length);
});

test('quarante exemples sont générés depuis les dictionnaires du parseur', () => {
  assert.equal(PARSER_DERIVED_EXAMPLES.length, 40);
  assert.equal(buildParserDerivedExamples(2).length, 10);
  assert.equal(new Set(PARSER_DERIVED_EXAMPLES.map(item => item.id)).size, 40);
});

test('la messagerie et les réglages restent exclus du moteur local', () => {
  assert.equal(LOCAL_AI_CAPABILITY_CATALOG.messagerie.mode, 'excluded');
  assert.equal(LOCAL_AI_CAPABILITY_CATALOG.parametres.mode, 'excluded');
  assert.ok(LOCAL_AI_CAPABILITY_CATALOG.messagerie.examples.every(example => example.expectedActionType === 'none'));
  assert.ok(LOCAL_AI_CAPABILITY_CATALOG.parametres.examples.every(example => example.expectedActionType === 'none'));
});

test('les garde-fous déterministes bloquent les demandes critiques avant Qwen', () => {
  const mediation = evaluateDeterministicGuardrail(
    LOCAL_AI_CAPABILITY_CATALOG.peacemaker,
    'Il me menace physiquement, trouve juste un compromis.',
    false
  );
  assert.equal(mediation?.reason, 'danger_physique');
  assert.match(mediation?.response || '', /sécurité/i);

  const messaging = evaluateDeterministicGuardrail(
    LOCAL_AI_CAPABILITY_CATALOG.messagerie,
    'Lis mes conversations et résume-les.',
    true
  );
  assert.equal(messaging?.reason, 'module_exclu');
  assert.deepEqual(validateStructuredAction(messaging?.response || '').actionTypes, ['none']);

  assert.equal(evaluateDeterministicGuardrail(
    LOCAL_AI_CAPABILITY_CATALOG.courses,
    'Ajoute deux bouteilles de lait.',
    true
  ), null);
});

test('les actions proposées restent fermées, confirmables et non exécutées', () => {
  assert.match(STRUCTURED_ACTION_SYSTEM_PROMPT, /n’exécute jamais d’action/);
  assert.match(STRUCTURED_ACTION_SYSTEM_PROMPT, /requiresConfirmation/);
  assert.match(STRUCTURED_ACTION_SYSTEM_PROMPT, /shopping\.add\|none/);
  assert.doesNotMatch(STRUCTURED_ACTION_SYSTEM_PROMPT, /Supabase|fetch\(|setter/i);
});

test('la validation refuse une proposition sans confirmation obligatoire', () => {
  const observedInvalidResult = JSON.stringify({
    actions: [{ type: 'task.create', payload: { name: 'Petit déjeuner' } }],
    clarification: null
  });
  const validResult = JSON.stringify({
    actions: [{ type: 'shopping.add', payload: { items: ['lait'] }, requiresConfirmation: true }],
    clarification: null
  });

  assert.deepEqual(validateStructuredAction(observedInvalidResult), {
    validJson: true,
    validSchema: false,
    value: JSON.parse(observedInvalidResult),
    actionTypes: ['task.create'],
    reason: 'La confirmation obligatoire est absente.'
  });
  assert.equal(validateStructuredAction(validResult).validSchema, true);
});

test('la validation refuse une action reconnue sans donnée extraite', () => {
  const emptyShoppingAction = JSON.stringify({
    actions: [{ type: 'shopping.add', payload: {}, requiresConfirmation: true }],
    clarification: null
  });
  const noneAction = JSON.stringify({
    actions: [{ type: 'none', payload: {}, requiresConfirmation: true }],
    clarification: 'Demande refusée.'
  });

  assert.equal(validateStructuredAction(emptyShoppingAction).validSchema, false);
  assert.equal(validateStructuredAction(emptyShoppingAction).reason, 'payload ne peut pas être vide pour une action.');
  assert.equal(validateStructuredAction(noneAction).validSchema, true);
});

test('le parseur expérimental corrige une formulation de rupture sans toucher au parseur actuel', () => {
  const result = analyzeGroceryParserExperiment("il n'y a plus de yaourts", 'Test');

  assert.deepEqual(result.currentItems.map(item => item.name), ["Il n'y a", 'Yaourts']);
  assert.equal(result.status, 'matched');
  assert.equal(result.confidence, 0.99);
  assert.deepEqual(result.safeItems.map(item => item.name), ['Yaourts']);
  assert.equal(result.normalizedPrompt, 'ajoute yaourts');
});

test('le parseur expérimental conserve les commandes explicites et suspend les demandes floues', () => {
  const explicit = analyzeGroceryParserExperiment('Ajoute deux bouteilles de lait', 'Test');
  const ambiguous = analyzeGroceryParserExperiment('Prépare les courses pour demain', 'Test');
  const groupDrinks = analyzeGroceryParserExperiment('il faut prevoir de la boisson pour 3 personnes', 'Test');

  assert.equal(explicit.status, 'matched');
  assert.deepEqual(explicit.safeItems.map(item => item.name), ['Lait']);
  assert.equal(ambiguous.status, 'ambiguous');
  assert.deepEqual(ambiguous.safeItems, []);
  assert.match(ambiguous.clarification || '', /quels? produits?/i);
  assert.equal(groupDrinks.status, 'ambiguous');
  assert.deepEqual(groupDrinks.safeItems, []);
  assert.deepEqual(groupDrinks.currentItems.map(item => item.name), ['Prevoir de la boisson pour', 'Personnes']);
  assert.match(groupDrinks.clarification || '', /quelles boissons/i);
});

test('le dialogue expérimental rattache et normalise une réponse de précision', () => {
  const pending = analyzeGroceryParserExperiment('il faut prevoir de la boisson pour 3 personnes', 'Test');
  const resolved = resolveGroceryParserClarification(
    pending,
    '3jus d orange et une bouteille de coca',
    'Test'
  );

  assert.equal(resolved.status, 'matched');
  assert.equal(resolved.confidence, 0.98);
  assert.equal(resolved.normalizedPrompt, "ajoute 3 jus d'orange et une bouteille de coca");
  assert.deepEqual(
    resolved.safeItems.map(item => ({ name: item.name, quantity: item.quantity })),
    [
      { name: "Jus d'orange", quantity: '3 pièces' },
      { name: 'Coca-Cola', quantity: '1 bouteille' }
    ]
  );
  assert.equal(resolved.clarification, null);
});
