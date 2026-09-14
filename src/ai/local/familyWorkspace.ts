import { readHouseholdSchedule, dayInZone, shiftDay } from './householdLabDates.ts';
import { validDate, validTime, timeMinutes } from './householdLabData.ts';
import { foldVoice, readAmountPrefix } from './safeGroceryEntities.ts';

export type WorkspaceSource = 'agenda' | 'external' | 'recipes' | 'groceries' | 'tasks';
export type SourceState = { state: 'ready' | 'unavailable' | 'limited'; count: number };
export type WorkspaceEvent = { id: string; title: string; date: string; time: string | null; duration: number | null; memberId: string | null; source: 'agenda' | 'external'; allDay: boolean };
export type WorkspaceRecipe = { id: string; title: string; servings: number | null; ingredients: string[]; steps: string[]; updatedAt: string };
export type WorkspaceSnapshot = {
  foyerId: string; actorId: string; actorName: string; parent: boolean; fetchedAt: number; timezone: string;
  range: { start: string; end: string }; members: { id: string; name: string }[];
  events: WorkspaceEvent[]; recipes: WorkspaceRecipe[];
  groceries: { id: string; name: string; quantity: string; checked: boolean; inStock: boolean }[];
  tasks: { id: string; title: string; dueDate: string; memberId: string | null; done: boolean }[];
  sources: Record<WorkspaceSource, SourceState>;
};
export type WorkspaceReference = { label: string; href: string; id: string };
export type WorkspaceAnswer = { message: string; lines: string[]; references: WorkspaceReference[]; clarification?: string; pendingQuery?: string; kind: 'answer' | 'clarify' | 'unsupported'; date?: string };
export const moduleLink = (module: string) => `/app?tab=menu&module=${encodeURIComponent(module)}`;
export const eventReference = (event: WorkspaceEvent): WorkspaceReference => ({ id: event.id, label: `${event.title} · ${event.date}${event.time ? ` ${event.time}` : ''}`, href: moduleLink('agenda') });
export const freshSnapshot = (snapshot: WorkspaceSnapshot, now = Date.now()) => now >= snapshot.fetchedAt && now - snapshot.fetchedAt <= 5 * 60_000;
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const overlaps = (start: number, end: number, otherStart: number, otherEnd: number) => start < otherEnd && otherStart < end;
const relevantEvents = (snapshot: WorkspaceSnapshot, date: string, memberIds: string[]) => snapshot.events.filter(event => event.date === date && (!event.memberId || memberIds.includes(event.memberId)));
export function normalizeExternalWorkspaceEvent(event: { id: string; title: string; memberId: string | null; start: string; end: string; allDay: boolean }, range: { start: string; end: string }, timezone: string): WorkspaceEvent[] {
  const startAt = new Date(event.start), endAt = new Date(event.end);
  if (!Number.isFinite(startAt.getTime())) return [];
  const duration = Number.isFinite(endAt.getTime()) && endAt > startAt ? (endAt.getTime() - startAt.getTime()) / 60000 : null;
  // Date-only ICS values are civil days, not instants to shift into the local timezone.
  const first = event.allDay ? event.start.slice(0, 10) : dayInZone(startAt.getTime(), timezone);
  const last = duration ? event.allDay ? new Date(endAt.getTime() - 1).toISOString().slice(0, 10) : dayInZone(endAt.getTime() - 1, timezone) : first;
  const result: WorkspaceEvent[] = [];
  for (let day = first < range.start ? range.start : first, n = 0; day <= last && day <= range.end && n < 91; day = shiftDay(day, 1), n++) {
    const allDay = event.allDay || first !== last;
    result.push({ id: `external:${event.id}:${day}`, title: event.title, memberId: event.memberId, date: day, time: allDay ? null : new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(startAt), duration: allDay ? 1440 : duration, allDay, source: 'external' });
  }
  return result;
}
export function availability(snapshot: WorkspaceSnapshot, date: string, memberIds: string[], duration: number, from = '08:00', until = '20:00') {
  const events = relevantEvents(snapshot, date, memberIds);
  const warnings: string[] = [];
  if (!freshSnapshot(snapshot)) warnings.push('Actualisez le contexte du foyer.');
  if (!validDate(date) || date < snapshot.range.start || date > snapshot.range.end) warnings.push('La date sort de la période chargée.');
  if (!memberIds.length || memberIds.some(id => !snapshot.members.some(member => member.id === id))) warnings.push('Choisissez des membres visibles du foyer.');
  if (snapshot.sources.agenda.state !== 'ready' || snapshot.sources.external.state !== 'ready') warnings.push('Un agenda est indisponible ou incomplet.');
  if (events.some(event => !event.allDay && (!event.time || !validTime(event.time) || !Number.isFinite(event.duration) || event.duration! <= 0))) warnings.push('La durée ou l’heure de certains rendez-vous manque.');
  if (!validTime(from) || !validTime(until) || !Number.isInteger(duration) || duration < 5 || duration > 720 || timeMinutes(from) >= timeMinutes(until)) warnings.push('Précisez une plage et une durée valides.');
  if (warnings.length) return { slots: [] as string[], warnings, events };
  const slots: string[] = [];
  const now = Date.now();
  const earliest = date === dayInZone(now, snapshot.timezone) ? timeMinutes(new Intl.DateTimeFormat('en-GB', { timeZone: snapshot.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)) + 1 : 0;
  for (let start = timeMinutes(from); start + duration <= timeMinutes(until); start += 15) {
    if (start >= earliest && !events.some(event => event.allDay || overlaps(start, start + duration, timeMinutes(event.time!), timeMinutes(event.time!) + event.duration!))) slots.push(clock(start));
  }
  return { slots, warnings, events };
}

export function answerWorkspace(raw: string, snapshot: WorkspaceSnapshot, previous?: WorkspaceAnswer, now = Date.now()): WorkspaceAnswer {
  const base = (kind: WorkspaceAnswer['kind'], message: string): WorkspaceAnswer => ({ kind, message, lines: [], references: [] });
  if (!freshSnapshot(snapshot, now)) return base('clarify', 'Actualisez le contexte du foyer avant de poursuivre.');
  const text = foldVoice(raw).replace(/[’]/g, "'").trim();
  if (/^(attends?|pause|stop|annule)[.!?]*$/.test(text)) return base('answer', 'D’accord, la demande est arrêtée.');
  if (/\b(decale|deplace|supprime|ajoute|modifie|organise|prepare|recoit|recevons)\b/.test(text)) return base('unsupported', 'Préparez la modification dans les parcours ci-dessous, puis ouvrez le module concerné pour la valider.');
  const schedule = readHouseholdSchedule(raw, now, snapshot.timezone);
  if (schedule.error) return base('clarify', schedule.error);
  if (schedule.date && previous?.clarification === 'date' && previous.pendingQuery) return answerWorkspace(`${previous.pendingQuery} ${raw}`, snapshot, undefined, now);
  const date = schedule.date || previous?.date;
  if (/\b(recettes?|repas|manger|cuisiner)\b/.test(text)) {
    if (snapshot.sources.recipes.state !== 'ready') return base('clarify', 'Le carnet de recettes est incomplet ou indisponible. Actualisez-le.');
    return { ...base('answer', snapshot.recipes.length ? 'Voici les recettes enregistrées dans votre foyer.' : 'Votre carnet ne contient pas encore de recette.'), lines: snapshot.recipes.map(recipe => recipe.title), references: snapshot.recipes.map(recipe => ({ id: recipe.id, label: recipe.title, href: moduleLink('courses') })) };
  }
  if (/\b(courses|acheter|manque)\b/.test(text)) {
    return { ...base('answer', snapshot.sources.groceries.state !== 'ready' ? 'La liste est incomplète ou indisponible.' : 'Produits encore présents dans la liste de courses.'), lines: snapshot.groceries.filter(item => !item.checked && !item.inStock).map(item => `${item.name} · ${item.quantity || 'quantité non précisée'}`), references: [{ id: 'groceries', label: 'Liste de courses', href: moduleLink('courses') }] };
  }
  if (!date) return { ...base('clarify', 'Pour quel jour souhaitez-vous consulter le foyer ?'), clarification: 'date', pendingQuery: raw.slice(0, 500) };
  if (date < snapshot.range.start || date > snapshot.range.end) return { ...base('clarify', 'Cette date sort de la période chargée. Choisissez un jour dans les 90 prochains jours.'), date };
  const named = snapshot.members.filter(member => (` ${text.replace(/[^a-z0-9]/g, ' ')} `).includes(` ${foldVoice(member.name).replace(/[^a-z0-9]/g, ' ')} `));
  const memberIds = named.length ? named.map(member => member.id) : snapshot.members.map(member => member.id);
  const events = relevantEvents(snapshot, date, memberIds);
  if (/\b(disponibles?|libres?|creneaux?|apres le|apres la|apres celui)\b/.test(text)) {
    const before = /\bavant\b/.test(text);
    let from = schedule.time && !before && /\b(?:a|apres|des)\s+\d/.test(text) ? schedule.time : schedule.period === 'afternoon' ? '12:00' : schedule.period === 'evening' ? '18:00' : '08:00';
    if (/\bapres (?:le|la|celui)\b/.test(text)) {
      const target = text.split(/\bapres (?:le|la|celui)\s+/)[1]?.trim();
      const matches = events.filter(event => target && foldVoice(event.title).includes(target));
      if (matches.length !== 1 || !matches[0].time || !matches[0].duration) return { ...base('clarify', 'Précisez le rendez-vous et sa durée pour chercher après celui-ci.'), date, references: events.map(eventReference) };
      from = clock(timeMinutes(matches[0].time) + matches[0].duration);
    }
    const durationMatch = [...text.matchAll(/\b(\d+)\s*(minutes?|min|heures?|h)\b/g)].find(match => !/\b(?:a|apres|avant|des)\s*$/.test(text.slice(0, match.index)));
    const duration = durationMatch ? Number(durationMatch[1]) * (/^h/.test(durationMatch[2]) ? 60 : 1) : 60;
    const found = availability(snapshot, date, memberIds, duration, from, before && schedule.time ? schedule.time : schedule.period === 'morning' ? '12:00' : '20:00');
    return { ...base(found.warnings.length ? 'clarify' : 'answer', found.warnings.length ? found.warnings.join(' ') : `Créneaux de ${duration} minutes sans chevauchement dans les agendas chargés. Les trajets restent à vérifier.`), date, lines: found.slots.slice(0, 6).map(time => `${date} à ${time}`), references: events.map(eventReference) };
  }
  const tasks = snapshot.tasks.filter(task => !task.done && task.dueDate.slice(0, 10) === date && (!task.memberId || memberIds.includes(task.memberId)));
  return { ...base('answer', `Le ${date} · ${events.length} rendez-vous et ${tasks.length} tâches visibles.${snapshot.sources.agenda.state !== 'ready' || snapshot.sources.external.state !== 'ready' || snapshot.sources.tasks.state !== 'ready' ? ' Certaines sources sont incomplètes.' : ''}`), date, lines: [...events.map(event => `${event.time || 'Heure non précisée'} · ${event.title}`), ...tasks.map(task => task.title)], references: [...events.map(eventReference), ...tasks.map(task => ({ id: task.id, label: task.title, href: moduleLink('taches') }))] };
}

export type DayStep = { id: string; title: string; duration: number; memberIds: string[]; afterEventId?: string };
export type DayPlan = { date: string; from: string; until: string; travelMinutes: number; steps: DayStep[]; durationEstimates?: Record<string, number> };
export type DayAlternative = { label: string; steps: { id: string; title: string; start: string; end: string }[] };
export function planDay(snapshot: WorkspaceSnapshot, plan: DayPlan): { alternatives: DayAlternative[]; warnings: string[]; references: WorkspaceReference[] } {
  const warnings: string[] = [];
  if (!freshSnapshot(snapshot)) warnings.push('Actualisez le foyer avant de calculer.');
  if (plan.date < dayInZone(Date.now(), snapshot.timezone)) warnings.push('Choisissez une date à venir.');
  if (!plan.steps.length || plan.steps.length > 8 || !Number.isInteger(plan.travelMinutes) || plan.travelMinutes < 0 || plan.travelMinutes > 180) warnings.push('Ajoutez 1 à 8 étapes et un temps de transition valide.');
  if (new Set(plan.steps.map(step => step.id)).size !== plan.steps.length) warnings.push('Chaque étape doit avoir un identifiant distinct.');
  if (plan.steps.some(step => !step.title.trim())) warnings.push('Nommez chaque étape.');
  if (Object.values(plan.durationEstimates || {}).some(value => !Number.isInteger(value) || value < 5 || value > 720)) warnings.push('Les durées estimées doivent être comprises entre 5 et 720 minutes.');
  snapshot = { ...snapshot, events: snapshot.events.map(event => ({ ...event, duration: event.duration ?? plan.durationEstimates?.[event.id] ?? null })) };
  const candidates = plan.steps.map(step => {
    const result = availability(snapshot, plan.date, step.memberIds, step.duration, plan.from, plan.until);
    warnings.push(...result.warnings);
    let slots = result.slots.filter(time => {
      const min = timeMinutes(time);
      return min + step.duration + plan.travelMinutes <= timeMinutes(plan.until) && !result.events.some(event => event.time && event.duration && overlaps(min - plan.travelMinutes, min + step.duration + plan.travelMinutes, timeMinutes(event.time), timeMinutes(event.time) + event.duration));
    });
    if (step.afterEventId) {
      const event = snapshot.events.find(event => event.id === step.afterEventId && event.date === plan.date);
      if (!event?.time || !event.duration) { warnings.push('Le rendez-vous de référence est absent ou sa durée manque.'); slots = []; }
      else slots = slots.filter(time => timeMinutes(time) >= timeMinutes(event.time!) + event.duration! + plan.travelMinutes);
    }
    return slots;
  });
  const references = snapshot.events.filter(event => event.date === plan.date).map(eventReference);
  if (warnings.length) return { alternatives: [], warnings: [...new Set(warnings)], references };
  const alternatives: DayAlternative[] = [];
  // Preserve the user's order; try each feasible first slot with bounded search.
  for (const first of candidates[0] || []) {
    let end = timeMinutes(plan.from);
    const rows: DayAlternative['steps'] = [];
    for (let index = 0; index < plan.steps.length; index++) {
      const step = plan.steps[index];
      const start = index === 0 ? first : candidates[index].find(time => timeMinutes(time) >= end + plan.travelMinutes);
      if (!start) break;
      const min = timeMinutes(start);
      end = min + step.duration; rows.push({ id: step.id, title: step.title, start, end: clock(end) });
    }
    if (rows.length === plan.steps.length) alternatives.push({ label: `Départ à ${rows[0].start}`, steps: rows });
    if (alternatives.length === 3) break;
  }
  if (!alternatives.length) warnings.push('Aucun déroulé complet ne respecte ces contraintes. Réduisez les durées ou élargissez la plage.');
  return { alternatives, warnings, references };
}

export type LinkedIngredient = { source: string; name: string; quantity: number | null; unit: string; resolved: boolean };
const supportedUnits = /^(kg|g|ml|cl|l|litres?|grammes?|kilogrammes?|bouteilles?|boites?|sachets?|cuilleres?)(?:\s+(?:de|d'))?\s+/i;
export function ingredientFromText(source: string): LinkedIngredient {
  const normalized = foldVoice(source).replace(/,/g, '.').replace(/(\d)([a-z])/g, '$1 $2');
  const amount = readAmountPrefix(normalized);
  const unit = amount.rest.match(supportedUnits);
  const name = (unit ? amount.rest.slice(unit[0].length) : amount.rest).replace(/^(?:de |d')/, '').trim();
  const resolved = amount.explicit && Number.isFinite(amount.value) && amount.value > 0 && amount.value <= 100000 && Boolean(name) && !/\d/.test(name);
  return { source, name: resolved ? name : source, quantity: resolved ? amount.value : null, unit: unit?.[1] || 'pièce', resolved };
}
export type MealDraft = { recipeId: string; recipeVersion: string; date: string; servings: number; baseServings: number; ingredients: LinkedIngredient[] };
export function makeMealDraft(recipe: WorkspaceRecipe, date: string, servings: number): MealDraft {
  return { recipeId: recipe.id, recipeVersion: recipe.updatedAt, date, servings, baseServings: recipe.servings || 0, ingredients: [...new Set(recipe.ingredients)].map(ingredientFromText) };
}
export function previewMeal(snapshot: WorkspaceSnapshot, draft: MealDraft) {
  const recipe = snapshot.recipes.find(value => value.id === draft.recipeId);
  const warnings: string[] = [];
  if (!freshSnapshot(snapshot)) warnings.push('Actualisez le foyer avant de préparer les courses.');
  if (snapshot.sources.recipes.state !== 'ready' || snapshot.sources.groceries.state !== 'ready') warnings.push('Le carnet ou la liste de courses est incomplet ou indisponible.');
  if (!recipe || recipe.updatedAt !== draft.recipeVersion) warnings.push('La recette a changé ou a été supprimée. Rechargez-la avant de continuer.');
  if (!validDate(draft.date) || draft.date < dayInZone(Date.now(), snapshot.timezone)) warnings.push('Choisissez une date à venir.');
  if (!Number.isInteger(draft.servings) || draft.servings < 1 || draft.servings > 100 || !Number.isInteger(draft.baseServings) || draft.baseServings < 1 || draft.baseServings > 100) warnings.push('Précisez les portions de référence et les portions souhaitées (1 à 100).');
  if (!draft.ingredients.length) warnings.push('Ajoutez les ingrédients manquants à la recette.');
  const ratio = draft.servings / draft.baseServings;
  const lines = draft.ingredients.map(item => {
    const valid = item.resolved && Number.isFinite(item.quantity) && item.quantity! > 0 && item.quantity! <= 100000 && item.name.trim() && item.unit.trim();
    const quantity = valid && Number.isFinite(ratio) ? Math.round(item.quantity! * ratio * 1000) / 1000 : null;
    const existing = snapshot.groceries.filter(grocery => foldVoice(grocery.name) === foldVoice(item.name));
    return { ...item, quantity, existing, text: quantity === null ? `${item.name} · quantité à préciser` : `${quantity} ${item.unit} · ${item.name}` };
  });
  if (lines.some(item => item.quantity === null)) warnings.push('Certaines quantités doivent être précisées avant de préparer les courses.');
  return { lines, warnings, recipe, ready: warnings.length === 0 };
}

export type ChosenMemory = { trigger: string; meaning: string; kind: 'preference' | 'shortcut' };
export type WorkspaceRecord = { id: string; kind: 'memory' | 'meal' | 'day'; title: string; audience: 'personal' | 'family'; owner_member_id: string; revision: number; payload: ChosenMemory | MealDraft | DayPlan; updated_at: string };
export function validMemory(value: ChosenMemory) {
  return ['preference', 'shortcut'].includes(value.kind) && typeof value.trigger === 'string' && value.trigger.trim().length >= 2 && value.trigger.length <= 80 && typeof value.meaning === 'string' && value.meaning.trim().length >= 2 && value.meaning.length <= 500;
}
export function memoryMatch(raw: string, records: WorkspaceRecord[]) {
  return records.filter(record => record.kind === 'memory' && validMemory(record.payload as ChosenMemory) && foldVoice((record.payload as ChosenMemory).trigger.trim()) === foldVoice(raw.trim()));
}

export function validWorkspaceRecord(value: unknown): value is WorkspaceRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as WorkspaceRecord;
  if (typeof record.id !== 'string' || typeof record.title !== 'string' || typeof record.owner_member_id !== 'string' || !Number.isInteger(record.revision) || record.revision < 1 || !['personal', 'family'].includes(record.audience) || typeof record.updated_at !== 'string' || !record.payload || typeof record.payload !== 'object') return false;
  if (record.kind === 'memory') return validMemory(record.payload as ChosenMemory);
  if (record.kind === 'meal') {
    const draft = record.payload as MealDraft;
    return typeof draft.recipeId === 'string' && typeof draft.recipeVersion === 'string' && typeof draft.date === 'string' && Number.isFinite(draft.servings) && Number.isFinite(draft.baseServings) && Array.isArray(draft.ingredients) && draft.ingredients.length <= 100 && draft.ingredients.every(item => item && typeof item.source === 'string' && typeof item.name === 'string' && typeof item.unit === 'string' && typeof item.resolved === 'boolean' && (item.quantity === null || Number.isFinite(item.quantity)));
  }
  if (record.kind === 'day') {
    const draft = record.payload as DayPlan;
    return typeof draft.date === 'string' && typeof draft.from === 'string' && typeof draft.until === 'string' && Number.isFinite(draft.travelMinutes) && Array.isArray(draft.steps) && draft.steps.length <= 8 && draft.steps.every(step => step && typeof step.id === 'string' && typeof step.title === 'string' && Number.isFinite(step.duration) && Array.isArray(step.memberIds) && step.memberIds.every(id => typeof id === 'string') && (step.afterEventId === undefined || typeof step.afterEventId === 'string')) && (draft.durationEstimates === undefined || draft.durationEstimates !== null && typeof draft.durationEstimates === 'object' && Object.values(draft.durationEstimates).every(value => Number.isInteger(value) && value >= 5 && value <= 720));
  }
  return false;
}
