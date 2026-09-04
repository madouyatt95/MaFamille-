import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseSafeGroceryVoiceV2 as parse, EMPTY_GROCERY_CONVERSATION, GROCERY_DIALOGUE_TTL_MS, rememberConfirmedGroceryProducts } from '../src/ai/local/safeGroceryParserV2.ts';
import { parseGroceryEntities } from '../src/ai/local/safeGroceryEntities.ts';
import { createGrocerySimulation, simulateGroceryCommit, undoGrocerySimulation } from '../src/ai/local/grocerySimulation.ts';

const options = { now: 1000, scopeKey: 'test:parent' };
const pending = () => parse('il faut prévoir des boissons pour 3 personnes', undefined, options).nextContext;
const proposed = () => parse('ajoute 2 coca', undefined, options).nextContext;
const policy = { canWrite: true, scopeKey: options.scopeKey };
const confirmed = (text = 'ajoute 2 coca', extra = {}) => {
  const proposal = parse(text, undefined, { ...options, ...extra });
  return parse('oui', proposal.nextContext, { ...options, now: 1100, utteranceId: 'confirmation' });
};

const protectedPhrases = [
  ["j'ai payé 30 euros de courses", 'budget'],
  ['finalement 20 euros de coca', 'budget'],
  ['ajoute une dépense de 12,50 EUR', 'budget'],
  ['j ai depense 50 en courses', 'budget'],
  ['rdv chez le médecin demain', 'agenda'],
  ['ouvre la carte familiale', 'navigation'],
  ['envoie un message à maman', 'messages'],
  ['ajoute un vaccin demain', 'health'],
  ['rappelle les devoirs', 'tasks'],
  ['ajoute du lait et une dépense de 20 euros', 'budget']
] as const;
for (const [phrase, domain] of protectedPhrases) {
  for (const state of ['empty', 'pending', 'proposed', 'unknown'] as const) {
    test(`routage ${domain}, état ${state} : ${phrase}`, () => {
      const context = state === 'pending' ? pending() : state === 'proposed' ? proposed() : state === 'unknown' ? parse('ajoute lait lactel', undefined, options).nextContext : EMPTY_GROCERY_CONVERSATION;
      const before = structuredClone(context);
      const result = parse(phrase, context, options);
      assert.equal(result.domain, domain);
      assert.equal(result.status, 'out_of_scope');
      assert.equal(result.items.length, 0);
      assert.deepEqual(result.nextContext, EMPTY_GROCERY_CONVERSATION);
      assert.deepEqual(context, before);
    });
  }
}

test('un alias ne masque jamais un montant ni ne détourne la confirmation', () => {
  assert.equal(parse('20 euros', proposed(), { ...options, aliases: { '20 euros': 'coca' } }).domain, 'budget');
  assert.equal(parse('coca', proposed(), { ...options, aliases: { coca: '20 euros' } }).domain, 'budget');
  assert.equal(parse('non', proposed(), { ...options, aliases: { non: 'oui' } }).status, 'cancelled');
  assert.notEqual(parse('coca', proposed(), { ...options, aliases: { coca: 'oui' } }).status, 'confirmed');
  assert.equal(parse("n'ajoute pas de lait", proposed(), { ...options, aliases: { "n'ajoute pas de lait": 'ajoute lait' } }).status, 'cancelled');
});

test('un produit seul se confirme au tour suivant sans boucle', () => {
  const result = parse('yaourts', undefined, options);
  assert.equal(result.missingFields[0], 'confirmation');
  const yes = parse('oui', result.nextContext, options);
  assert.equal(yes.status, 'confirmed');
  assert.equal(yes.items[0].name, 'Yaourts');
});

test('oui sans produit, expiration et changement de profil ne confirment rien', () => {
  for (const result of [parse('oui', pending(), options), parse('oui', proposed(), { ...options, now: options.now + GROCERY_DIALOGUE_TTL_MS }), parse('oui', proposed(), { ...options, scopeKey: 'test:enfant' })]) {
    assert.notEqual(result.status, 'confirmed');
    assert.equal(result.confirmedProposal, undefined);
    assert.equal(result.items.length, 0);
  }
  const route = parse('ouvre agenda', proposed(), options);
  assert.notEqual(parse('oui', route.nextContext, options).status, 'confirmed');
});

for (const phrase of ["n'ajoute pas de lait", 'on en a déjà', 'non', 'annule', "je ne veux pas de lait"]) {
  test(`négation sans ajout : ${phrase}`, () => {
    const result = parse(phrase, proposed(), options);
    assert.equal(result.status, 'cancelled');
    assert.deepEqual(result.items, []);
    assert.notEqual(parse('oui', result.nextContext, options).status, 'confirmed');
  });
}
for (const phrase of ['si on manque de lait ajoute du lait', 'achète du pain seulement si nécessaire', 'éventuellement du coca']) {
  test(`condition sans exécution : ${phrase}`, () => assert.equal(parse(phrase, proposed(), options).status, 'rejected'));
}

for (const phrase of ['ajoute 0 lait', 'ajoute -2 lait', 'ajoute - 2 lait', 'ajoute moins deux lait', 'ajoute 10001 lait', 'ajoute 1,5 coca', 'ajoute 2 packs de 0 yaourts', 'ajoute deux packs de -6 yaourts']) {
  test(`quantité invalide : ${phrase}`, () => assert.equal(parse(phrase, undefined, options).status, 'rejected'));
}

for (const [text, amount] of [
  ['deux packs de six yaourts', { value: 2, unit: 'pack', packSize: 6 }],
  ['un demi-litre de lait', { value: 0.5, unit: 'litre' }],
  ['1,5 kg de tomates', { value: 1.5, unit: 'kg' }],
  ["3jus d orange", { value: 3, unit: 'piece' }],
  ['une bouteille de coca', { value: 1, unit: 'bottle' }]
] as const) {
  test(`quantité structurée : ${text}`, () => {
    const result = parse(`ajoute ${text}`, undefined, options);
    assert.equal(result.status, 'proposed');
    assert.deepEqual(result.items[0].amount, amount);
  });
}

test('ajouter encore, remplacer la quantité, et choisir le deuxième produit sont distincts', () => {
  const first = parse('ajoute 2 bouteilles de coca et 3 yaourts', undefined, options);
  const ambiguous = parse('plutôt deux', first.nextContext, options);
  assert.equal(ambiguous.nextContext.pending?.kind, 'selection');
  const selected = parse('la deuxième', ambiguous.nextContext, options);
  assert.equal(selected.items[1].amount.value, 2);
  const add = parse('ajoute encore deux', selected.nextContext, options);
  assert.equal(add.items[1].amount.value, 4);
  const set = parse('non plutôt deux', add.nextContext, options);
  assert.equal(set.items[1].amount.value, 2);
  const bottles = parse('la première', ambiguous.nextContext, options);
  assert.equal(bottles.items[0].amount.unit, 'bottle');
});

test('la liste existante est consultée, les unités se convertissent sans doublon', () => {
  const list = parseGroceryEntities('1 kg de tomates').items;
  const snapshot = structuredClone(list);
  const result = parse('ajoute 500 g de tomates', undefined, { ...options, list });
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.items[0].amount, { value: 1.5, unit: 'kg' });
  assert.deepEqual(list, snapshot);
  assert.equal(parse('ajoute 2 tomates', undefined, { ...options, list }).status, 'needs_clarification');
  assert.deepEqual(parse('que reste-t-il', undefined, { ...options, list }).items, list);
  const precise = parse('finalement 1,5 tomates', undefined, { ...options, list });
  assert.deepEqual(precise.items[0].amount, { value: 1.5, unit: 'kg' });
  assert.equal(parse('finalement 1,5 coca', proposed(), options).status, 'needs_clarification');
});

test('un retrait absent ne prétend pas réussir et le dernier produit peut être retiré', () => {
  assert.equal(parse('retire le lait', proposed(), options).status, 'needs_clarification');
  assert.equal(parse('remplace le lait par du riz', proposed(), options).status, 'needs_clarification');
  const remove = parse('retire le coca', proposed(), options);
  assert.equal(remove.status, 'proposed');
  assert.deepEqual(remove.items, []);
  assert.equal(parse('oui', remove.nextContext, options).status, 'confirmed');
});

test('produit inconnu : accord sur le nom, confirmation, puis consentement au vocabulaire', () => {
  const first = parse('ajoute du lait lactel', undefined, options);
  assert.equal(first.nextContext.pending?.kind, 'unknown_product');
  assert.deepEqual(rememberConfirmedGroceryProducts(first, [], true), []);
  const named = parse('oui', first.nextContext, options);
  assert.equal(named.status, 'proposed');
  assert.equal(named.items[0].name, 'Lait lactel');
  const final = parse('oui', named.nextContext, options);
  assert.equal(final.status, 'confirmed');
  assert.deepEqual(rememberConfirmedGroceryProducts(final, [], false), []);
  const vocabulary = rememberConfirmedGroceryProducts(final, [], true);
  assert.deepEqual(vocabulary, ['Lait lactel']);
  assert.equal(parse('ajoute lait lactel', undefined, { ...options, vocabulary }).items[0].source, 'personal');
});

test('transcriptions intermédiaires et finales répétées ne doublent pas une proposition', () => {
  const interim = parse('ajoute coca', undefined, { ...options, isFinal: false });
  assert.equal(interim.status, 'ignored');
  const first = parse('ajoute coca', undefined, { ...options, utteranceId: 'speech-1' });
  const second = parse('ajoute coca', first.nextContext, { ...options, utteranceId: 'speech-1' });
  assert.equal(second.status, 'ignored');
  assert.deepEqual(second.nextContext.proposal, first.items);
});

test('une commande explicite remplace une clarification devenue sans objet', () => {
  const result = parse('ajoute des yaourts', pending(), options);
  assert.equal(result.status, 'proposed');
  assert.deepEqual(result.items.map(item => item.name), ['Yaourts']);
  const unknown = parse('ajoute skyr', undefined, options);
  assert.equal(parse('ajoute du lait', unknown.nextContext, options).items[0].name, 'Lait');
});

test('oui ne valide jamais une ancienne proposition quand une correction reste non résolue', () => {
  const multiple = parse('ajoute 2 coca et 3 yaourts', undefined, options).nextContext;
  for (const result of [
    parse('finalement -2 coca', proposed(), options),
    parse('retire du lait', proposed(), options),
    parse('plutôt deux', multiple, options)
  ]) {
    assert.equal(result.status, 'needs_clarification');
    const yes = parse('oui', result.nextContext, options);
    assert.equal(yes.status, 'needs_clarification');
    assert.equal(yes.confirmedProposal, undefined);
  }
});

test('une répétition de transcription après application est encore neutralisée', () => {
  const original = confirmed('ajoute 2 coca', { utteranceId: 'utterance-A' });
  const first = simulateGroceryCommit(createGrocerySimulation(options.scopeKey), original, policy, 1100);
  const duplicate = parse('ajoute 2 coca', undefined, { ...options, now: 2000, list: first.state.list, utteranceId: 'utterance-A' });
  const duplicateConfirmed = parse('oui', duplicate.nextContext, { ...options, now: 2100, utteranceId: 'utterance-B' });
  assert.equal(simulateGroceryCommit(first.state, duplicateConfirmed, policy, 2100).status, 'duplicate');
  assert.equal(first.state.list[0].amount.value, 2);
});

test('simulation : permissions, confirmation, conflit, expiration, idempotence et annulation', () => {
  const state = createGrocerySimulation(options.scopeKey);
  const result = confirmed('ajoute 2 coca', { utteranceId: 'speech-1' });
  assert.equal(simulateGroceryCommit(state, result, { ...policy, canWrite: false }, 1100).status, 'blocked');
  assert.equal(simulateGroceryCommit(state, result, { ...policy, scopeKey: 'other' }, 1100).status, 'blocked');
  assert.equal(simulateGroceryCommit(state, parse('ajoute coca', undefined, options), policy, 1100).status, 'blocked');
  assert.equal(simulateGroceryCommit(state, result, policy, 130000).status, 'blocked');
  const applied = simulateGroceryCommit(state, result, policy, 1100);
  assert.equal(applied.status, 'applied');
  assert.deepEqual(state.list, []);
  assert.equal(simulateGroceryCommit(applied.state, result, policy, 1200).status, 'duplicate');
  const oldProposal = confirmed('ajoute du lait', { now: 1001 });
  assert.equal(simulateGroceryCommit(applied.state, oldProposal, policy, 1200).status, 'duplicate');
  const conflict = { ...applied.state, appliedUtteranceIds: [] };
  assert.equal(simulateGroceryCommit(conflict, oldProposal, policy, 1200).status, 'blocked');
  const undone = undoGrocerySimulation(applied.state, policy);
  assert.equal(undone.status, 'undone');
  assert.deepEqual(undone.state.list, []);
  assert.equal(undoGrocerySimulation(undone.state, policy).status, 'blocked');
  assert.equal(simulateGroceryCommit(undone.state, result, policy, 1200).status, 'duplicate');
});

test('les nouveaux modules restent purs et ne sont pas importés par le microphone', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /safeGrocery|grocerySimulation/);
  for (const name of ['safeGroceryParserV2', 'safeGroceryEntities', 'grocerySimulation']) {
    const source = readFileSync(new URL(`../src/ai/local/${name}.ts`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bsupabase\b|\bfetch\s*\(|localStorage|sessionStorage|navigator\.mediaDevices/);
  }
});
