import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFamilyLabVoice as parse, parseLabExpense, emptyFamilyVoiceContext, type FamilyVoiceOptions } from '../src/ai/local/familyVoiceDialogue.ts';
import { parseSafeGroceryVoiceV2, groceryListSignature } from '../src/ai/local/safeGroceryParserV2.ts';
import { parseGroceryEntities } from '../src/ai/local/safeGroceryEntities.ts';
import { createFamilySimulation, simulateFamilyCommit, familyUndoToken, undoFamilySimulation, type FamilyVoiceSimulation } from '../src/ai/local/familyVoiceSimulation.ts';
import { describeGroceryChanges } from '../src/ai/local/labActionSummary.ts';

const options: FamilyVoiceOptions = { scopeKey: 'lab:test', now: 1000 };
const list = (phrase: string) => parseGroceryEntities(phrase).items;
const yes = (result: ReturnType<typeof parse>, opts = options) => parse('oui', result.context, opts);
const apply = (phrase: string, state = createFamilySimulation('lab:test')): FamilyVoiceSimulation => {
  const opts = { ...options, list: state.groceries.list, now: 1000 + state.groceries.revision, utteranceId: `r${state.groceries.revision}`, undo: familyUndoToken(state) };
  const proposal = parse(phrase, undefined, opts);
  assert.equal(proposal.status, 'proposed', proposal.message);
  const confirmed = yes(proposal, { ...opts, utteranceId: opts.utteranceId + ':yes' });
  const outcome = simulateFamilyCommit(state, confirmed, { scopeKey: 'lab:test', canWrite: true }, opts.now);
  assert.ok(['applied', 'undone'].includes(outcome.status), outcome.reason);
  return outcome.state;
};

for (const phrase of ['ajoute du lait et du pain, mais pas de beurre', 'ajoute du lait et du pain mais sans beurre', 'ajoute du lait et du pain sauf beurre']) {
  test(`exclusion locale : ${phrase}`, () => {
    const opts = { ...options, list: list('deux beurre') };
    const result = parse(phrase, undefined, opts);
    assert.equal(result.status, 'proposed', result.message);
    assert.equal(result.context.grocery.proposal.length, 3);
    assert.equal(result.context.grocery.proposal.find(item => item.name === 'Beurre')?.amount.value, 2);
    assert.match(result.message, /Exclus/);
  });
}
test('exclusions multiples retirent seulement les nouveaux produits', () => {
  const result = parse('ajoute du lait et du beurre et du pain mais pas de beurre ni de lait', undefined, options);
  assert.deepEqual(result.context.grocery.proposal.map(item => item.name), ['Pain']);
  assert.equal(parse('ajoute du beurre mais pas de beurre', undefined, options).status, 'cancelled');
});
test('un alias ne peut pas maquiller une négation en ajout avec exclusion', () => {
  const result = parseSafeGroceryVoiceV2('n’ajoute pas de lait', undefined, { ...options, aliases: { "n'ajoute pas de lait": 'ajoute du pain sauf beurre' } });
  assert.equal(result.status, 'cancelled');
});
for (const phrase of ['ajoute du lait mais pas de beurre si besoin', 'ajoute du lait mais pas de beurre et note -20 euros de courses', 'n’ajoute pas de lait', 'ajoute du lait sauf un truc pour demain']) test(`exclusion ne contourne pas les gardes : ${phrase}`, () => {
  assert.notEqual(parse(phrase, undefined, options).status, 'proposed');
});

for (const [phrase, value, unit] of [
  ['un litre et demi de lait', 1.5, 'litre'], ['une douzaine d’œufs', 12, 'piece'],
  ['deux douzaines d’œufs', 24, 'piece'], ['vingt et un yaourts', 21, 'piece'],
  ['quatre-vingt-dix-neuf yaourts', 99, 'piece'], ['deux cent trente-cinq grammes de beurre', 235, 'g'],
  ['un kilo et quart de tomates', 1.25, 'kg'], ['une demi-bouteille de lait', 0, 'invalid'],
] as const) test(`quantité parlée : ${phrase}`, () => {
  const result = parse(`ajoute ${phrase}`, undefined, options);
  if (unit === 'invalid') { assert.notEqual(result.status, 'proposed'); return; }
  assert.equal(result.status, 'proposed', result.message);
  assert.equal(result.context.grocery.proposal[0].amount.value, value);
  assert.equal(result.context.grocery.proposal[0].amount.unit, unit);
});
test('les et des nombres et fractions ne séparent pas les produits', () => {
  const result = parse('ajoute vingt et un yaourts et un litre et demi de lait et du pain', undefined, options);
  assert.equal(result.status, 'proposed', result.message);
  assert.equal(result.context.grocery.proposal.length, 3);
});
for (const [phrase, cents] of [
  ['vingt-cinq euros cinquante', 2550], ['vingt cinq euros et cinq centimes', 2505],
  ['zéro euro cinquante', 50], ['quatre-vingts euros', 8000], ['25,50 euros', 2550], ['vingt euros', 2000],
] as const) test(`montant exact : ${phrase}`, () => {
  assert.equal(parseLabExpense(`note ${phrase} de courses`)?.cents, cents);
});
for (const phrase of ['-25 euros', 'moins vingt euros', '25 euros cent cinquante', '25,555 euros', 'mille deux euros', 'vingt millions euros', '25,5 euros cinquante', '0 euros']) test(`montant rejeté sans troncature : ${phrase}`, () => {
  assert.equal(parseLabExpense(`note ${phrase} de courses`), null);
});
test('demande mixte avec nombres écrits : validation globale', () => {
  const result = parse('ajoute une douzaine d’œufs et note vingt-cinq euros cinquante de courses', undefined, options);
  assert.equal(result.status, 'proposed'); assert.equal(result.expenses[0].cents, 2550);
  assert.equal(yes(result).receipt?.after[0].amount.value, 12);
});
test('cocher puis décocher : aucun ajout de produit ni de dépense', () => {
  const initial = apply('ajoute du lait et des yaourts');
  const bought = apply('j’ai acheté le lait et les yaourts', initial);
  assert.equal(bought.groceries.list.length, 2); assert.ok(bought.groceries.list.every(item => item.completed));
  assert.deepEqual(bought.expenses, []);
  const uncheck = apply('décoche le lait', bought);
  assert.equal(uncheck.groceries.list.find(item => item.name === 'Lait')?.completed, false);
  assert.equal(uncheck.groceries.list.find(item => item.name === 'Yaourts')?.completed, true);
  const again = parse('coche les yaourts', undefined, { ...options, list: uncheck.groceries.list });
  assert.equal(again.status, 'ignored'); assert.equal(yes(again).receipt, undefined);
});
test('achat partiel ou produit absent : pas de coche partielle', () => {
  const opts = { ...options, list: list('trois lait et un pain') };
  for (const phrase of ['j’ai acheté deux lait', 'coche le pain et le beurre']) {
    const result = parse(phrase, undefined, opts);
    assert.equal(result.status, 'needs_clarification'); assert.equal(yes(result, opts).receipt, undefined);
    assert.ok(opts.list.every(item => !item.completed));
  }
});
test('plusieurs laits : choix ciblé avant de cocher, toutes les autres cibles conservées', () => {
  const opts = { ...options, list: list('lait bio et lait entier et pain') };
  const result = parse('coche le pain et le lait', undefined, opts);
  assert.equal(result.status, 'needs_clarification');
  const selected = parse('le deuxième', result.context, opts);
  assert.equal(selected.status, 'proposed');
  assert.deepEqual(selected.context.grocery.proposal.filter(item => item.completed).map(item => item.name), ['Lait entier', 'Pain']);
});
test('une phrase avec prix ne crée jamais une dépense implicite', () => {
  const result = parse('j’ai acheté le lait pour 3 euros', undefined, { ...options, list: list('lait') });
  assert.equal(result.status, 'out_of_scope'); assert.deepEqual(result.expenses, []);
});
test('nouvel ajout sur produit acheté : ne masque pas le besoin dans une ligne cochée', () => {
  const state = apply('coche le lait', apply('ajoute du lait'));
  const result = parse('il n’y a plus de lait', undefined, { ...options, list: state.groceries.list });
  assert.equal(result.status, 'needs_clarification'); assert.match(result.message, /déjà coché/); assert.equal(yes(result).receipt, undefined);
});
test('alternatives : aucune sélection automatique et oui ne choisit pas', () => {
  const result = parse('ajoute du pain', undefined, { ...options, alternatives: ['ajoute du lait'] });
  assert.equal(result.status, 'needs_clarification'); assert.equal(result.context.hearing?.choices.length, 2);
  assert.equal(yes(result).receipt, undefined);
  const chosen = parse('le deuxième', result.context, options);
  assert.equal(chosen.status, 'proposed'); assert.equal(yes(chosen).receipt?.after[0].name, 'Lait');
});
test('alternatives numériquement identiques ne redemandent pas le choix', () => {
  const result = parse('ajoute 2 lait', undefined, { ...options, alternatives: ['ajoute deux lait'] });
  assert.equal(result.status, 'proposed'); assert.equal(result.context.hearing, undefined);
});
test('ambiguïté oui/non ne confirme pas et préserve la proposition pour le choix', () => {
  const first = parse('ajoute du lait', undefined, options);
  const ambiguous = parse('oui', first.context, { ...options, alternatives: ['non'] });
  assert.equal(ambiguous.status, 'needs_clarification'); assert.equal(ambiguous.receipt, undefined);
  assert.equal(parse('le premier', ambiguous.context, options).status, 'confirmed');
});
test('stop prioritaire interrompt le dialogue malgré une hypothèse alternative', () => {
  const result = parse('stop', undefined, { ...options, alternatives: ['ajoute du lait'] });
  assert.equal(result.status, 'cancelled'); assert.equal(result.context.hearing, undefined);
});
test('alternatives : profil, expiration, route Budget et intermédiaire', () => {
  const result = parse('ajoute du lait', undefined, { ...options, alternatives: ['note vingt euros de courses'] });
  const budget = parse('2', result.context, options);
  assert.equal(budget.expenses[0].cents, 2000); assert.deepEqual(budget.context.grocery.proposal, []);
  assert.equal(parse('oui', result.context, { ...options, now: 200000 }).receipt, undefined);
  assert.equal(parse('oui', result.context, { ...options, scopeKey: 'other' }).receipt, undefined);
  assert.equal(parse('oui', result.context, { ...options, isFinal: false }).status, 'ignored');
});
test('annuler une action appliquée exige confirmation puis droits', () => {
  const state = apply('ajoute du lait'); const opts = { ...options, undo: familyUndoToken(state), list: state.groceries.list };
  const request = parse('annule mon dernier ajout', undefined, opts);
  assert.equal(request.status, 'proposed'); assert.equal(request.undoReceipt, undefined);
  const confirmed = yes(request, opts); assert.equal(confirmed.status, 'confirmed');
  assert.equal(simulateFamilyCommit(state, confirmed, { scopeKey: 'lab:test', canWrite: false }, 1000).status, 'blocked');
  const undone = simulateFamilyCommit(state, confirmed, { scopeKey: 'lab:test', canWrite: true }, 1000);
  assert.equal(undone.status, 'undone'); assert.deepEqual(undone.state.groceries.list, []);
  assert.equal(simulateFamilyCommit(undone.state, confirmed, { scopeKey: 'lab:test', canWrite: true }, 1000).status, 'blocked');
});
test('annule seul abandonne la proposition, pas la dernière action appliquée', () => {
  const state = apply('ajoute du lait'); const opts = { ...options, undo: familyUndoToken(state), list: state.groceries.list };
  const pending = parse('ajoute du pain', undefined, opts);
  assert.equal(parse('annule mon dernier ajout', pending.context, opts).status, 'needs_clarification');
  assert.equal(parse('annule', pending.context, opts).status, 'cancelled');
  assert.equal(state.groceries.list.length, 1);
});
test('une coche récente ne peut pas être annulée sous le nom de dernier ajout', () => {
  const state = apply('coche le lait', apply('ajoute du lait'));
  const result = parse('annule mon dernier ajout', undefined, { ...options, undo: familyUndoToken(state) });
  assert.equal(result.status, 'needs_clarification'); assert.match(result.message, /n’est pas un ajout/);
});
test('undo protège les modifications plus récentes, même sans révision incrémentée', () => {
  const state = apply('ajoute du lait et note vingt euros de courses');
  const opts = { ...options, undo: familyUndoToken(state) };
  const confirmation = yes(parse('annule ma dernière action', undefined, opts), opts);
  const newer = apply('ajoute du pain', state);
  assert.equal(simulateFamilyCommit(newer, confirmation, { scopeKey: 'lab:test', canWrite: true }, 1000).status, 'blocked');
  const changed = structuredClone(state); changed.expenses[0].cents++;
  assert.equal(undoFamilySimulation(changed, { scopeKey: 'lab:test', canWrite: true }).status, 'blocked');
  const changedList = structuredClone(state); changedList.groceries.list[0].completed = true;
  assert.equal(familyUndoToken(changedList), undefined);
  assert.notEqual(groceryListSignature(state.groceries.list), groceryListSignature(changedList.groceries.list));
});
test('annulation multi-module restaure les deux instantanés', () => {
  const state = apply('ajoute du lait et note vingt euros de courses');
  const restored = apply('annule ma dernière action', state);
  assert.deepEqual(restored.groceries.list, []); assert.deepEqual(restored.expenses, []);
});
test('intention acheté reste isolée de la production, annulation clôt le contexte', () => {
  assert.equal(parseSafeGroceryVoiceV2('coche le lait', undefined, { ...options, list: list('lait') }).intent, 'shopping.complete');
  assert.deepEqual(parse('stop').context, emptyFamilyVoiceContext());
});
for (const suffix of ['à la liste de courses', 'dans ma liste', 'au panier']) test(`la destination Courses ne devient pas un produit : ${suffix}`, () => {
  const result = parse(`ajoute deux bouteilles de lait ${suffix}`, undefined, options);
  assert.equal(result.status, 'proposed'); assert.equal(result.context.grocery.proposal[0].name, 'Lait'); assert.equal(result.context.grocery.proposal[0].amount.value, 2);
});
test('le récapitulatif isole les modifications de la liste inchangée', () => {
  const before = list('du lait et du beurre');
  const after = [{ ...before[0], completed: true }, ...list('du pain')];
  assert.deepEqual(describeGroceryChanges(before, after), ['Cocher comme acheté : Lait', 'Ajouter 1 pièce de Pain', 'Retirer Beurre']);
});
