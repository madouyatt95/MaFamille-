import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseHouseholdVoice as parse, type HouseholdAnswer } from '../src/ai/local/householdAssistant.ts';
import { createHouseholdData, validateHouseholdData, importHouseholdData, commitHouseholdProposal, undoHouseholdSimulation, householdSignature, projectHouseholdOperations, type HouseholdData, type HouseholdOperation } from '../src/ai/local/householdLabData.ts';
import { createHouseholdFixture } from '../src/ai/local/householdLabFixture.ts';
import { readHouseholdSchedule, dayInZone } from '../src/ai/local/householdLabDates.ts';

const now = Date.parse('2026-09-07T09:00:00Z');
const actorId = 'parent-test';
const policy = { actorId, canWrite: true };
const fixture = () => createHouseholdFixture(now);
function dialogue(turns: string[], data = fixture(), actor = actorId) {
  let result: HouseholdAnswer | undefined;
  for (const [i, text] of turns.entries()) result = parse(text, data, result?.context, { actorId: actor, now: now + i * 100, utteranceId: `turn-${i}` });
  return result!;
}
const apply = (result: HouseholdAnswer, data = fixture(), actor = actorId) => commitHouseholdProposal({ data, applied: [] }, result.proposal, result.status === 'confirmed', { actorId: actor, canWrite: true }, now + 10000);

test('le laboratoire commence vide et importe uniquement un contexte explicite', () => {
  assert.equal(createHouseholdData().members.length, 0);
  assert.equal(validateHouseholdData(createHouseholdData()), true);
  assert.equal(validateHouseholdData(fixture()), true);
  const imported = importHouseholdData(JSON.stringify(fixture()));
  assert.deepEqual(imported, fixture());
  assert.equal(parse('ajoute du lait', createHouseholdData(), undefined, { actorId, now }).status, 'rejected');
});

test('réception : besoins puis menu, produits, heure et durée, confirmation atomique', () => {
  const data = fixture(); const before = structuredClone(data);
  const turns = ['On reçoit six personnes samedi soir', 'les trois', 'pizza maison', '3jus d orange et une bouteille de coca', '19h pendant 120 minutes'];
  const proposed = dialogue(turns, data);
  assert.equal(proposed.status, 'proposed');
  assert.deepEqual(proposed.context?.operations.map(op => op.kind), ['plan.add', 'grocery.add', 'grocery.add', 'event.add']);
  assert.equal(apply(proposed, data).applied, false);
  const confirmed = dialogue([...turns, 'oui'], data);
  const result = apply(confirmed, data);
  assert.equal(result.applied, true, result.message);
  assert.equal(result.state.data.plans[0].people, 6);
  assert.equal(result.state.data.plans[0].menu, 'pizza maison');
  assert.equal(result.state.data.events.at(-1)?.date, '2026-09-12');
  assert.equal(result.state.data.events.at(-1)?.time, '19:00');
  assert.equal(result.state.data.events.at(-1)?.duration, 120);
  assert.deepEqual(data, before);
});

test('réception sans nombre ni date : ne fabrique ni menu ni quantités', () => {
  assert.match(dialogue(['on reçoit']).message, /Combien/);
  assert.match(dialogue(['on reçoit', 'six']).message, /date/);
  assert.match(dialogue(['on reçoit', 'six', 'samedi', 'courses', 'du coca']).message, /quantité/);
  const result = dialogue(['on reçoit', 'six', 'samedi', 'courses', 'du coca', 'deux bouteilles', 'oui']);
  assert.equal(result.status, 'confirmed');
  assert.equal(result.proposal?.operations.length, 1);
  assert.equal(result.proposal?.operations[0].kind, 'grocery.add');
});

test('réception limitée au repas ne crée pas un rendez-vous implicite', () => {
  const result = dialogue(['on reçoit quatre personnes samedi', 'repas', 'lasagnes', 'oui']);
  assert.equal(result.status, 'confirmed');
  assert.deepEqual(result.proposal?.operations.map(op => op.kind), ['plan.add']);
});

test('une dépense pendant le choix des produits ne disparaît pas derrière les courses', () => {
  const result = dialogue(['on reçoit six personnes samedi', 'courses', 'ajoute du lait et note 25 euros de courses']);
  assert.equal(result.status, 'rejected'); assert.equal(result.proposal, undefined);
});

test('horaire ou durée manquant : oui ne contourne pas la question', () => {
  for (const last of ['19h', 'oui', 'pendant 120 minutes']) {
    const result = dialogue(['on reçoit six personnes samedi', 'agenda', last, 'oui']);
    assert.equal(result.status, 'needs_clarification'); assert.equal(result.proposal, undefined);
  }
});

test('un conflit dans un ensemble ne laisse passer aucun autre ajout', () => {
  const data = fixture();
  data.events.push({ id: 'busy-family', title: 'Occupé', date: '2026-09-12', time: '19:00', duration: 60, memberId: null });
  const result = dialogue(['on reçoit six personnes samedi', 'les trois', 'pizza', '2 bouteilles de coca', '19h pendant 120 minutes'], data);
  assert.equal(result.status, 'rejected'); assert.match(result.message, /occupé/); assert.equal(result.proposal, undefined);
  assert.equal(data.plans.length, 0);
});

test('historique : semaine civile précédente, boissons exclues, quantités conservées', () => {
  const result = dialogue(['reprends les courses de la semaine dernière sans les boissons', 'oui']);
  assert.equal(result.status, 'confirmed');
  assert.equal(result.proposal?.operations.length, 1);
  const op = result.proposal!.operations[0];
  assert.equal(op.kind, 'grocery.add'); if (op.kind !== 'grocery.add') return;
  assert.equal(op.item.name, 'Pain'); assert.equal(op.item.amount.value, 1);
  const data = fixture(); data.history = [];
  assert.equal(dialogue(['reprends les courses de la semaine dernière'], data).status, 'answered');
});

test('recherche : sources fournies et visibilité avant les résultats', () => {
  assert.match(dialogue(['retrouve les dépenses pharmacie']).results[0], /12.50.*Camille/);
  assert.equal(dialogue(['retrouve les dépenses pharmacie'], fixture(), 'child-test').status, 'rejected');
  assert.equal(dialogue(['retrouve les rdv Alex'], fixture(), 'child-test').results.length, 0);
  const ownEvents = dialogue(['retrouve les rdv Ismaël'], fixture(), 'child-test').results;
  assert.equal(ownEvents.length, 2); assert.ok(ownEvents.every(value => value.includes('Ismaël')));
  assert.match(dialogue(['retrouve les tâches cartable'], fixture(), 'child-test').results[0], /cartable/);
  assert.equal(dialogue(['retrouve les tâches inexistantes']).results.length, 0);
});

test('dentiste ambigu, correction du membre et après-midi avec créneau libre', () => {
  const start = dialogue(['Décale le dentiste à vendredi']);
  assert.equal(start.choices.length, 2);
  const corrected = dialogue(['Décale le dentiste à vendredi', 'Non, celui d’Ismaël, et seulement l’après-midi']);
  assert.equal(corrected.choices[0].id, 'time:14:00');
  assert.doesNotMatch(corrected.message, /Alex/);
  const result = dialogue(['Décale le dentiste à vendredi', 'Non, celui d’Ismaël, et seulement l’après-midi', '1', 'oui']);
  assert.deepEqual(result.proposal?.operations, [{ kind: 'event.move', id: 'dentist-child', date: '2026-09-11', time: '14:00' }]);
  const committed = apply(result);
  assert.equal(committed.applied, true);
  assert.deepEqual(committed.state.data.events.find(event => event.id === 'dentist-parent'), fixture().events[0]);
});

test('correction du membre après une proposition remplace bien le rendez-vous', () => {
  const result = dialogue(['décale le dentiste à vendredi à 15h', '1', 'non celui d’Ismaël', 'oui']);
  assert.equal(result.status, 'confirmed');
  assert.equal(result.proposal?.operations[0].kind, 'event.move');
  assert.equal((result.proposal?.operations[0] as { id: string }).id, 'dentist-child');
});

test('conflit et période : aucun contournement par oui', () => {
  const turns = ['décale le dentiste à vendredi', 'celui d’Ismaël l’après-midi'];
  const conflict = dialogue([...turns, '13h']);
  assert.equal(conflict.status, 'needs_clarification'); assert.match(conflict.message, /occupé/);
  assert.notEqual(dialogue([...turns, '13h', 'oui']).status, 'confirmed');
  assert.notEqual(dialogue([...turns, '10h', 'oui']).status, 'confirmed');
});

test('un membre inconnu ou une réponse sans rapport ne confirme pas le précédent rendez-vous', () => {
  for (const correction of ['non celui de Paul', 'ouvre la carte']) {
    const result = dialogue(['décale le dentiste à vendredi à 15h', '1', correction, 'oui']);
    assert.notEqual(result.status, 'confirmed'); assert.equal(result.proposal, undefined);
  }
});

test('les parcours guidés ne perdent pas une deuxième commande non prise en charge', () => {
  for (const text of ['on reçoit six personnes samedi et note 25 euros de courses', 'prépare notre départ en vacances samedi puis supprime les tâches', 'décale le dentiste à vendredi et ajoute du lait']) {
    const result = dialogue([text]); assert.equal(result.status, 'rejected'); assert.equal(result.proposal, undefined);
  }
});

for (const phrase of ['j’ai pris deux bouteilles de lait sur les trois', 'j ai pris deux sur trois bouteilles de lait']) test(`achat partiel : ${phrase}`, () => {
  const result = dialogue([phrase, 'oui']); const committed = apply(result);
  assert.equal(committed.applied, true, committed.message);
  const item = committed.state.data.groceries.find(item => item.name === 'Lait')!;
  assert.equal(item.amount.value, 3); assert.equal(item.bought, 2); assert.equal(item.completed, false);
  assert.equal(committed.state.data.expenses.length, fixture().expenses.length);
});

test('achat partiel ambigu : sélection sans perte de contexte', () => {
  const data = fixture(); data.groceries.push({ ...data.groceries[0], id: 'another-three', name: 'Eau' });
  assert.equal(dialogue(['j’ai pris deux sur trois'], data).choices.length, 2);
  const result = dialogue(['j’ai pris deux sur trois', 'le deuxième', 'oui'], data);
  assert.equal(apply(result, data).state.data.groceries.find(item => item.id === 'another-three')?.bought, 2);
});

for (const phrase of ['j’ai pris quatre bouteilles de lait sur les trois', 'j’ai pris deux bouteilles de truc inconnu sur trois', 'j’ai pris deux lait et ouvre le budget sur trois', 'j’ai pris deux litres de lait sur trois bouteilles', 'j’ai pris deux bouteilles de lait sur trois pommes', 'j’ai pris moins deux bouteilles de lait sur trois']) test(`achat partiel refusé : ${phrase}`, () => {
  assert.notEqual(dialogue([phrase]).status, 'proposed');
});

test('dépense répartie : 42 = 12 + 30, jamais 42 + 12 + 30', () => {
  const result = dialogue(['j’ai payé 42 euros dont 12 pour la pharmacie', 'courses', 'oui']);
  const ops = result.proposal!.operations;
  assert.equal(ops.length, 2);
  assert.equal(ops.reduce((sum, op) => sum + (op.kind === 'expense.add' ? op.cents : 0), 0), 4200);
  assert.equal(apply(result).state.data.expenses.length, 3);
});

test('centimes exacts et montant entièrement affecté', () => {
  const result = dialogue(['j’ai payé 42,35 euros dont 12,10 euros pour pharmacie', 'courses', 'oui']);
  assert.deepEqual(result.proposal?.operations.map(op => op.kind === 'expense.add' ? op.cents : null), [1210, 3025]);
  assert.equal(dialogue(['note 42 euros dont 42 pour pharmacie', 'oui']).proposal?.operations.length, 1);
});

for (const phrase of ['note 42 euros dont 43 pour pharmacie', 'note 42 euros dont -12 pour pharmacie', 'note 42 dollars dont 12 pour pharmacie', 'note 42 euros dont 12 dollars pour pharmacie', 'note 42,123 euros dont 12 pour pharmacie', 'note 42 euros dont 12 pour pharmacie et 10 pour courses']) test(`répartition invalide : ${phrase}`, () => {
  assert.equal(dialogue([phrase]).status, 'rejected');
});

test('le motif du reste et les droits Budget ne sont jamais implicites', () => {
  assert.equal(dialogue(['note 42 euros dont 12 pour pharmacie', 'oui']).status, 'needs_clarification');
  assert.equal(dialogue(['note 42 euros dont 12 pour pharmacie'], fixture(), 'child-test').status, 'rejected');
  assert.equal(dialogue(['ajoute du lait et note 25 euros de courses'], fixture(), 'child-test').status, 'rejected');
});

test('ajout ciblé et réaffectation : pas de copie familiale', () => {
  for (const turns of [['ajoute du pain pour maman', 'oui'], ['ajoute du pain', 'ajoute ça pour maman, pas pour toute la famille', 'oui']]) {
    const result = dialogue(turns); assert.equal(result.status, 'confirmed');
    const committed = apply(result);
    const bread = committed.state.data.groceries.filter(item => item.name === 'Pain');
    assert.equal(bread.length, 1); assert.equal(bread[0].memberId, 'mother-test');
  }
  assert.equal(dialogue(['ajoute du pain pour maman'], fixture(), 'child-test').status, 'rejected');
  assert.equal(dialogue(['ajoute du pain pour Paul']).status, 'needs_clarification');
});

test('routine : uniquement les étapes définies, dates relatives et un seul ensemble', () => {
  const result = dialogue(['prépare notre départ en vacances', 'samedi', 'oui']);
  assert.equal(result.status, 'confirmed');
  assert.deepEqual(result.proposal?.operations.map(op => op.kind), ['task.add', 'grocery.add', 'reminder.add']);
  const committed = apply(result);
  assert.equal(committed.state.data.tasks.at(-1)?.date, '2026-09-11');
  assert.equal(committed.state.data.reminders[0].date, '2026-09-12');
  const data = fixture(); data.routines = [];
  assert.equal(dialogue(['prépare notre départ en vacances'], data).status, 'answered');
});

test('routine personnalisée modifiée, aucune liste de départ codée en dur', () => {
  const data = fixture(); data.routines = [{ id: 'custom', name: 'Sport', trigger: 'prépare le sport', steps: [{ kind: 'task', text: 'Préparer le sac', daysBefore: 0, time: '08:00' }] }];
  const result = dialogue(['prépare le sport', 'samedi', 'oui'], data);
  assert.equal(result.proposal?.operations.length, 1);
  assert.equal(apply(result, data).state.data.tasks.at(-1)?.title, 'Préparer le sac');
});

test('routine : produit inconnu et délai passé annulent la proposition entière', () => {
  const data = fixture(); data.routines[0].steps[1].text = 'du produit inconnu';
  assert.equal(dialogue(['prépare notre départ en vacances', 'samedi'], data).status, 'rejected');
  assert.equal(dialogue(['prépare notre départ en vacances', 'aujourd’hui']).status, 'rejected');
});

test('routine enfant : les nouvelles données restent propres au membre', () => {
  const result = dialogue(['prépare notre départ en vacances', 'samedi', 'oui'], fixture(), 'child-test');
  const committed = apply(result, fixture(), 'child-test');
  assert.equal(committed.applied, true);
  assert.equal(committed.state.data.reminders[0].memberId, 'child-test');
});

test('confirmation et autorisation distinctes, puis protection anti-rejeu et annulation', () => {
  const data = fixture(); const state = { data, applied: [] };
  const result = dialogue(['ajoute du pain', 'oui'], data);
  assert.equal(commitHouseholdProposal(state, result.proposal, true, { ...policy, canWrite: false }, now).applied, false);
  assert.equal(commitHouseholdProposal(state, result.proposal, false, policy, now).applied, false);
  const first = commitHouseholdProposal(state, result.proposal, true, policy, now);
  assert.equal(first.applied, true);
  assert.equal(commitHouseholdProposal(first.state, result.proposal, true, policy, now).applied, false);
  const undone = undoHouseholdSimulation(first.state, policy);
  assert.deepEqual(undone.state.data.groceries, data.groceries);
  assert.equal(commitHouseholdProposal(undone.state, result.proposal, true, policy, now).applied, false);
  assert.equal(undoHouseholdSimulation(first.state, { actorId: 'child-test', canWrite: true }).state, first.state);
});

test('contexte, profil, révision et délai invalidés avant confirmation ou transcription dupliquée', () => {
  const data = fixture(); const result = dialogue(['ajoute du pain']);
  for (const opts of [{ actorId: 'child-test', now, utteranceId: 'turn-0' }, { actorId, now: now + 120001 }]) {
    const rejected = parse('oui', data, result.context, opts);
    assert.equal(rejected.status, 'rejected'); assert.equal(rejected.context, undefined);
  }
  const changed = structuredClone(data); changed.revision++;
  assert.equal(parse('oui', changed, result.context, { actorId, now }).status, 'rejected');
  assert.equal(parse('ajoute du pain', data, result.context, { actorId, now, utteranceId: 'turn-0' }).status, 'ignored');
  assert.equal(parse('oui', data, result.context, { actorId, now, isFinal: false }).status, 'ignored');
});

test('transaction : modification externe, droits retirés ou action forgée refusés sans effet partiel', () => {
  const data = fixture(); const result = dialogue(['ajoute du pain', 'oui'], data);
  const changed = structuredClone(data); changed.groceries[0].bought = 1;
  assert.equal(apply(result, changed).applied, false);
  const corrupted = structuredClone(result); corrupted.proposal!.operations.push({ kind: 'expense.add', cents: -10, label: 'courses', memberId: null });
  assert.equal(apply(corrupted, data).applied, false);
  const ops: HouseholdOperation[] = [{ kind: 'grocery.add', memberId: null, item: { ...data.groceries[0], amount: { value: -1, unit: 'bottle' }, quantity: '-1 bouteille' } }];
  assert.throws(() => projectHouseholdOperations(data, ops, actorId, 'bad'), /invalide/);
  assert.equal(householdSignature(data), householdSignature(fixture()));
});

test('un horaire devenu passé entre confirmation et application bloque tout le lot', () => {
  const data = fixture();
  const result = dialogue(['décale le dentiste à aujourd’hui à 11h01', '1', 'oui'], data);
  assert.equal(result.status, 'confirmed');
  const committed = commitHouseholdProposal({ data, applied: [] }, result.proposal, true, policy, now + 65000);
  assert.equal(committed.applied, false); assert.match(committed.message, /passé/);
});

test('transcriptions divergentes : choix explicite puis confirmation, arrêt prioritaire', () => {
  const data = fixture();
  const result = parse('ajoute du pain', data, undefined, { actorId, now, alternatives: ['note 20 euros de courses'] });
  assert.equal(result.status, 'needs_clarification'); assert.equal(result.choices.length, 2);
  assert.equal(parse('oui', data, result.context, { actorId, now }).status, 'needs_clarification');
  const chosen = parse('2', data, result.context, { actorId, now });
  assert.equal(chosen.status, 'proposed'); assert.equal(chosen.context?.operations[0].kind, 'expense.add');
  assert.equal(parse('stop', data, result.context, { actorId, now, alternatives: ['oui'] }).status, 'cancelled');
});

for (const phrase of ['on reçoit six personnes samedi si on a le temps', 'décale le dentiste à vendredi si possible', 'j’ai pris deux sur trois si besoin', 'note 42 euros dont 12 pour pharmacie si besoin']) test(`condition non exécutée : ${phrase}`, () => {
  assert.equal(dialogue([phrase]).status, 'rejected');
});

test('une nouvelle demande ne fait pas disparaître un ensemble en attente', () => {
  for (const command of ['retrouve les tâches', 'prépare notre départ en vacances', 'reprends les courses de la semaine dernière', 'décale le dentiste à vendredi']) {
    const result = dialogue(['ajoute du pain', command]);
    assert.equal(result.status, 'needs_clarification'); assert.equal(result.context?.operations[0].kind, 'grocery.add');
  }
  assert.equal(dialogue(['ajoute du pain', 'annule']).status, 'cancelled');
});

test('dates françaises : fuseau, période non confondue avec midi, durée non confondue avec date', () => {
  assert.equal(dayInZone(Date.parse('2026-09-07T23:30:00Z'), 'Europe/Paris'), '2026-09-08');
  assert.equal(readHouseholdSchedule('vendredi', now, 'Europe/Paris').date, '2026-09-11');
  assert.equal(readHouseholdSchedule('19h pendant 120 minutes', now, 'Europe/Paris').date, undefined);
  assert.equal(readHouseholdSchedule('seulement l’après-midi', now, 'Europe/Paris').time, undefined);
  for (const phrase of ['25h', 'vendredi ou samedi', 'hier']) assert.ok(readHouseholdSchedule(phrase, now, 'Europe/Paris').error, phrase);
});

for (const mutate of [
  (data: HouseholdData) => { data.history[0].items = [null as never]; },
  (data: HouseholdData) => { data.groceries[0].amount = null as never; },
  (data: HouseholdData) => { data.groceries[0].qualifiers = {} as never; },
  (data: HouseholdData) => { data.routines[0].steps = [null as never]; },
  (data: HouseholdData) => { data.events[0].date = '2026-02-31'; },
  (data: HouseholdData) => { data.events[0].memberId = 'absent'; },
  (data: HouseholdData) => { data.members[0].aliases = [null as never]; },
]) test(`import JSON invalide rejeté sans exception du validateur : ${mutate.toString().slice(0, 100)}`, () => {
  const data = fixture(); mutate(data);
  assert.equal(validateHouseholdData(data), false);
  assert.throws(() => importHouseholdData(JSON.stringify(data)), /invalide/);
});

test('isolement du micro réel et absence de connexion distante', () => {
  assert.doesNotMatch(readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), /householdAssistant|HouseholdAssistantLab/);
  for (const file of ['householdAssistant', 'householdLabData', 'householdLabFixture', 'householdLabDates']) assert.doesNotMatch(readFileSync(new URL(`../src/ai/local/${file}.ts`, import.meta.url), 'utf8'), /\bfetch\s*\(|\bsupabase\b|localStorage|navigator\.mediaDevices/);
});
