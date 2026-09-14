import assert from 'node:assert/strict';
import test from 'node:test';
import { answerWorkspace, availability, freshSnapshot, ingredientFromText, makeMealDraft, memoryMatch, normalizeExternalWorkspaceEvent, planDay, previewMeal, validWorkspaceRecord, type DayPlan, type WorkspaceRecord, type WorkspaceSnapshot } from '../src/ai/local/familyWorkspace.ts';
import { dayInZone, shiftDay } from '../src/ai/local/householdLabDates.ts';
import { assessExercise, mediationFrame, specialistPrompt } from '../src/ai/local/workspaceSpecialists.ts';

function fixture(): WorkspaceSnapshot {
  const now = Date.now(), start = dayInZone(now, 'Europe/Paris');
  return {
    foyerId: 'f', actorId: 'p', actorName: 'Parent', parent: true, fetchedAt: now, timezone: 'Europe/Paris',
    range: { start, end: shiftDay(start, 90) }, members: [{ id: 'p', name: 'Parent' }, { id: 'c', name: 'Sam' }],
    events: [{ id: 'dentist', title: 'Dentiste', date: shiftDay(start, 1), time: '10:00', duration: 60, memberId: 'p', source: 'agenda', allDay: false }],
    recipes: [{ id: 'soup', title: 'Soupe familiale', servings: 4, ingredients: ['500 g de carottes', '2 pommes de terre'], steps: ['Cuire les légumes.'], updatedAt: 'v1' }],
    groceries: [{ id: 'g', name: 'carottes', quantity: '300 g', checked: false, inStock: true }], tasks: [],
    sources: { agenda: { state: 'ready', count: 1 }, external: { state: 'ready', count: 0 }, recipes: { state: 'ready', count: 1 }, groceries: { state: 'ready', count: 1 }, tasks: { state: 'ready', count: 0 } },
  };
}
function day(snapshot: WorkspaceSnapshot): DayPlan {
  return { date: shiftDay(snapshot.range.start, 1), from: '08:00', until: '16:00', travelMinutes: 15, steps: [{ id: 'shopping', title: 'Courses', duration: 45, memberIds: ['p'], afterEventId: 'dentist' }, { id: 'library', title: 'Bibliothèque', duration: 30, memberIds: ['p', 'c'] }] };
}

test('contexte: vieillissement et horloge incohérente refusés', () => {
  const s = fixture();
  assert.equal(freshSnapshot(s, s.fetchedAt + 300001), false);
  assert.equal(freshSnapshot(s, s.fetchedAt - 1), false);
  assert.equal(answerWorkspace('demain', s, undefined, s.fetchedAt + 300001).kind, 'clarify');
});
test('contexte: une source absente ou tronquée ne signifie jamais libre', () => {
  for (const state of ['unavailable', 'limited'] as const) {
    const s = fixture(); s.sources.external.state = state;
    assert.equal(availability(s, day(s).date, ['p'], 60).slots.length, 0);
  }
});
test('contexte: durée inconnue, membre inconnu et date hors plage refusés', () => {
  const s = fixture(); s.events[0].duration = null;
  assert.equal(availability(s, day(s).date, ['p'], 60).slots.length, 0);
  assert.equal(availability(s, day(s).date, ['intrus'], 60).slots.length, 0);
  assert.equal(availability(s, shiftDay(s.range.end, 1), ['c'], 60).slots.length, 0);
});
test('contexte: événement toute la journée et chevauchements respectés', () => {
  const s = fixture(), d = day(s).date;
  const slots = availability(s, d, ['p'], 60).slots;
  assert.ok(slots.includes('09:00')); assert.ok(!slots.includes('09:15')); assert.ok(!slots.includes('10:00')); assert.ok(slots.includes('11:00'));
  s.events[0].allDay = true;
  assert.equal(availability(s, d, ['p'], 60).slots.length, 0);
  assert.ok(availability(s, d, ['c'], 60).slots.length > 0);
});
test('ICS: une journée entière reste un jour civil malgré le fuseau', () => {
  for (const timezone of ['Europe/Paris', 'America/New_York']) {
    const result = normalizeExternalWorkspaceEvent({ id: 'ics', title: 'Repos', memberId: null, start: '2026-09-06T00:00:00Z', end: '2026-09-07T00:00:00Z', allDay: true }, { start: '2026-09-05', end: '2026-10-01' }, timezone);
    assert.deepEqual(result.map(event => event.date), ['2026-09-06']); assert.equal(result[0].allDay, true);
  }
});
test('ICS: événement traversant minuit et voyage de plusieurs jours ne disparaissent pas', () => {
  const event = { id: 'ics', title: 'Voyage', memberId: null, start: '2026-09-04T21:00:00Z', end: '2026-09-07T10:00:00Z', allDay: false };
  const result = normalizeExternalWorkspaceEvent(event, { start: '2026-09-05', end: '2026-10-01' }, 'Europe/Paris');
  assert.deepEqual(result.map(event => event.date), ['2026-09-05', '2026-09-06', '2026-09-07']); assert.ok(result.every(event => event.allDay));
});
test('disponibilité: aucun créneau passé proposé aujourd’hui', t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-05T13:10:00Z') });
  const s = fixture(); assert.equal(availability(s, s.range.start, ['p'], 30).slots[0], '15:15');
});
test('dialogue: recettes au pluriel et réponses avec provenance', () => {
  const reply = answerWorkspace('Quelles recettes avons-nous ?', fixture());
  assert.equal(reply.kind, 'answer'); assert.deepEqual(reply.lines, ['Soupe familiale']); assert.match(reply.references[0].href, /module=courses/);
});
test('dialogue: demande de date conserve la question et pas une recherche de disponibilité', () => {
  const s = fixture(), first = answerWorkspace('Quels rendez-vous avons-nous ?', s);
  assert.equal(first.clarification, 'date');
  const reply = answerWorkspace('demain', s, first);
  assert.match(reply.message, /1 rendez-vous/); assert.match(reply.lines[0], /Dentiste/);
});
test('dialogue: créneaux au pluriel puis jour, clarification suivie correctement', () => {
  const s = fixture(), first = answerWorkspace('Quels créneaux libres ?', s);
  const reply = answerWorkspace('demain après-midi', s, first);
  assert.match(reply.message, /Créneaux de 60/); assert.ok(reply.lines[0].endsWith('12:00'));
});
test('dialogue: une heure de départ n’est pas confondue avec une durée', () => {
  const s = fixture(); assert.ok(answerWorkspace('créneaux libres demain après 15h', s).lines[0].endsWith('15:00'));
  assert.ok(answerWorkspace('créneaux libres demain pendant 1 heure', s).lines[0].endsWith('08:00'));
});
test('dialogue: préparation explicite ne modifie aucune source', () => {
  const s = fixture(), before = structuredClone(s);
  assert.equal(answerWorkspace('Déplace le dentiste demain', s).kind, 'unsupported'); assert.deepEqual(s, before);
});
test('journée: trois alternatives complètes, ordre, marges et heure limite', () => {
  const s = fixture(), p = day(s), before = structuredClone(s);
  const result = planDay(s, p); assert.equal(result.alternatives.length, 3); assert.equal(result.warnings.length, 0);
  for (const alt of result.alternatives) {
    assert.deepEqual(alt.steps.map(step => step.id), ['shopping', 'library']); assert.ok(alt.steps[0].start >= '11:15'); assert.ok(alt.steps[1].end <= '15:45');
  }
  assert.deepEqual(s, before);
});
test('journée: cherche plus loin quand la marge bloque le premier créneau d’une étape', () => {
  const s = fixture(); s.events[0].time = '09:30'; s.events[0].duration = 30;
  const p = day(s); p.from = '08:00'; p.steps[0] = { ...p.steps[0], duration: 60, afterEventId: undefined };
  const result = planDay(s, p);
  assert.equal(result.alternatives[0].steps[0].start, '08:00'); assert.equal(result.alternatives[0].steps[1].start, '10:15');
});
test('journée: aucune solution partielle ou dépendance disparue', () => {
  const s = fixture(), p = day(s); p.until = '11:45';
  assert.equal(planDay(s, p).alternatives.length, 0);
  p.until = '16:00'; p.steps[0].afterEventId = 'deleted'; assert.equal(planDay(s, p).alternatives.length, 0);
});
test('journée: estimation conservée sans écraser la durée réelle', () => {
  const s = fixture(), p = day(s); s.events[0].duration = null;
  assert.equal(planDay(s, p).alternatives.length, 0);
  p.durationEstimates = { dentist: 90 };
  assert.equal(planDay(s, JSON.parse(JSON.stringify(p))).alternatives[0].steps[0].start, '11:45');
  s.events[0].duration = 60; assert.equal(planDay(s, p).alternatives[0].steps[0].start, '11:15');
  p.durationEstimates.dentist = -1; assert.equal(planDay(s, p).alternatives.length, 0);
});
test('repas: quantités, unités et portions recalculées sans déduction automatique du stock', () => {
  const s = fixture(), draft = makeMealDraft(s.recipes[0], day(s).date, 6);
  const result = previewMeal(s, draft);
  assert.equal(result.ready, true); assert.equal(result.lines[0].quantity, 750); assert.equal(result.lines[1].quantity, 3);
  assert.equal(result.lines[0].existing.length, 1); assert.equal(s.groceries[0].quantity, '300 g');
});
test('repas: quantités compactes reconnues, ambiguïtés laissées à préciser', () => {
  assert.equal(ingredientFromText('250g de farine').quantity, 250);
  assert.equal(ingredientFromText('du sel').quantity, null);
  assert.equal(ingredientFromText('2 ou 3 tomates').resolved, false);
});
test('repas: recette modifiée, supprimée, portions inconnues ou source incomplète bloquées', () => {
  const s = fixture(), draft = makeMealDraft(s.recipes[0], day(s).date, 4);
  draft.baseServings = 0; assert.equal(previewMeal(s, draft).ready, false); draft.baseServings = 4;
  s.sources.groceries.state = 'limited'; assert.equal(previewMeal(s, draft).ready, false); s.sources.groceries.state = 'ready';
  s.recipes[0].updatedAt = 'v2'; assert.equal(previewMeal(s, draft).ready, false);
  s.recipes = []; assert.equal(previewMeal(s, draft).ready, false);
});
test('mémoire: raccourci explicite exact, sans choix silencieux entre deux sens', () => {
  const record: WorkspaceRecord = { id: 'r', kind: 'memory', title: 'Ma semaine', audience: 'personal', owner_member_id: 'p', revision: 1, payload: { kind: 'shortcut', trigger: 'Ma semaine', meaning: 'Quels rendez-vous demain ?' }, updated_at: '2026-01-01' };
  assert.equal(memoryMatch('  ma semaine ', [record]).length, 1);
  assert.equal(memoryMatch('ma semaine prochaine', [record]).length, 0);
  assert.equal(memoryMatch('ma semaine', [record, { ...record, id: 'r2', audience: 'family' }]).length, 2);
});
test('synchronisation: validation runtime des charges utiles, révisions et estimations', () => {
  const s = fixture(), record = { id: 'r', kind: 'day', title: 'Plan', audience: 'personal', owner_member_id: 'p', revision: 1, payload: day(s), updated_at: '2026-01-01' };
  assert.equal(validWorkspaceRecord(record), true);
  for (const invalid of [null, {}, { ...record, revision: 0 }, { ...record, payload: { ...day(s), steps: [null] } }, { ...record, payload: { ...day(s), durationEstimates: { dentist: '60' } } }]) assert.equal(validWorkspaceRecord(invalid), false);
});
test('devoirs: indices progressifs, vérification bornée et exercice de transfert', () => {
  const first = assessExercise('multiplication', '40', 0, 0), second = assessExercise('multiplication', '40', 0, first.hint);
  assert.notEqual(first.feedback, second.feedback); assert.equal(assessExercise('multiplication', '42', 0, 0).correct, true);
  assert.equal(assessExercise('multiplication', '48', 1, 0).correct, true); assert.equal(assessExercise('reading', 'il ne pleut pas', 0, 0).correct, false);
  assert.match(assessExercise('multiplication', '42', 1, 0).feedback, /8 en 7/);
});
test('médiation: deux perspectives requises, violence hors compromis', () => {
  assert.equal(mediationFrame('Je veux du calme', '').prompts.length, 2);
  assert.equal(mediationFrame('Je veux du calme', 'Je veux jouer').blocked, false);
  assert.equal(mediationFrame('Il me frappe', 'Je suis en danger').blocked, true);
});
test('spécialistes: contexte borné, aucune action ni garantie d’allergène', () => {
  const prompt = specialistPrompt('courses', 'variante'.repeat(500), 'recette'.repeat(2000));
  assert.ok(prompt.prompt.length < 5100); assert.match(prompt.systemPrompt, /Tu ne peux exécuter aucune action/); assert.match(prompt.systemPrompt, /Ne garantis jamais/);
});
