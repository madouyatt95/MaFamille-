import { formatSafeAmount, validAmount, validCustomName, type SafeGroceryItem } from './safeGroceryEntities.ts';

export type LabMember = { id: string; name: string; aliases: string[]; role: 'parent' | 'child' };
export type LabAudience = string | null;
export type HouseholdGrocery = SafeGroceryItem & { id: string; memberId: LabAudience; bought: number };
export type HouseholdEvent = { id: string; title: string; date: string; time: string; duration: number; memberId: LabAudience };
export type HouseholdTask = { id: string; title: string; date: string; memberId: LabAudience; done: boolean };
export type HouseholdReminder = { id: string; title: string; date: string; time: string; memberId: LabAudience };
export type HouseholdExpense = { id: string; cents: number; label: string; memberId: LabAudience };
export type HouseholdPlan = { id: string; title: string; date: string; people: number; menu: string; memberId: LabAudience };
export type RoutineStep = { kind: 'task' | 'grocery' | 'reminder'; text: string; daysBefore: number; time: string };
export type HouseholdRoutine = { id: string; name: string; trigger: string; steps: RoutineStep[] };
export type HouseholdData = {
  scopeKey: string; timezone: string; revision: number; members: LabMember[];
  groceries: HouseholdGrocery[]; history: { id: string; date: string; items: HouseholdGrocery[] }[];
  events: HouseholdEvent[]; tasks: HouseholdTask[]; expenses: HouseholdExpense[];
  reminders: HouseholdReminder[]; plans: HouseholdPlan[]; routines: HouseholdRoutine[];
};
export type HouseholdPolicy = { actorId: string; canWrite: boolean };
export type HouseholdOperation =
  | { kind: 'grocery.add'; item: SafeGroceryItem; memberId: LabAudience }
  | { kind: 'grocery.update'; id: string; amount: SafeGroceryItem['amount']; bought: number }
  | { kind: 'grocery.remove'; id: string }
  | { kind: 'expense.add'; cents: number; label: string; memberId: LabAudience }
  | { kind: 'event.move'; id: string; date: string; time: string }
  | { kind: 'event.add'; event: Omit<HouseholdEvent, 'id'> }
  | { kind: 'task.add'; task: Omit<HouseholdTask, 'id'> }
  | { kind: 'reminder.add'; reminder: Omit<HouseholdReminder, 'id'> }
  | { kind: 'plan.add'; plan: Omit<HouseholdPlan, 'id'> };
export type HouseholdProposal = { id: string; scopeKey: string; actorId: string; baseSignature: string; expiresAt: number; operations: HouseholdOperation[] };
export type HouseholdSimulation = { data: HouseholdData; applied: string[]; undo?: { before: HouseholdData; afterSignature: string; actorId: string } };
export const createHouseholdData = (): HouseholdData => ({ scopeKey: 'household:lab', timezone: 'Europe/Paris', revision: 0, members: [], groceries: [], history: [], events: [], tasks: [], expenses: [], reminders: [], plans: [], routines: [] });
export const householdSignature = (data: HouseholdData) => JSON.stringify(data);
export const actorIsParent = (data: HouseholdData, actorId: string) => data.members.some(member => member.id === actorId && member.role === 'parent');
export const canReadAudience = (data: HouseholdData, actorId: string, memberId: LabAudience) => data.members.some(member => member.id === actorId) && (memberId === null || memberId === actorId || actorIsParent(data, actorId));
export const canWriteAudience = (data: HouseholdData, actorId: string, memberId: LabAudience) => memberId !== undefined && (memberId === null || data.members.some(member => member.id === memberId)) && (actorIsParent(data, actorId) || memberId === actorId);
export const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
export const validTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
export const timeMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const shortText = (value: unknown, max = 120): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[<>]/.test(value) && ![...value].some(char => char.charCodeAt(0) < 32);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const uniqueIds = (rows: { id: string }[]) => rows.every(row => record(row) && shortText(row.id, 150)) && new Set(rows.map(row => row.id)).size === rows.length;
const groceryCore = (item: SafeGroceryItem) => record(item) && record(item.amount) && validAmount(item.amount)
  && shortText(item.name, 70) && validCustomName(item.name) && shortText(item.category, 50)
  && ['catalog', 'personal', 'unconfirmed'].includes(item.source) && item.quantity === formatSafeAmount(item.amount)
  && (item.completed === undefined || typeof item.completed === 'boolean')
  && (item.productName === undefined || shortText(item.productName, 70))
  && (item.qualifiers === undefined || Array.isArray(item.qualifiers) && item.qualifiers.length <= 6 && item.qualifiers.every(value => shortText(value, 40)));

// Imported snapshots are explicit lab input, never a replacement for a server's access policy.
export function validateHouseholdData(value: unknown): value is HouseholdData {
  if (!record(value) || !shortText(value.scopeKey, 100) || typeof value.timezone !== 'string' || !Number.isInteger(value.revision) || Number(value.revision) < 0) return false;
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: value.timezone }); } catch { return false; }
  const keys = ['members', 'groceries', 'history', 'events', 'tasks', 'expenses', 'reminders', 'plans', 'routines'] as const;
  if (keys.some(key => !Array.isArray(value[key]) || value[key].length > 500 || value[key].some((row: unknown) => !record(row)))) return false;
  const data = value as unknown as HouseholdData;
  if (keys.some(key => !uniqueIds(data[key]))) return false;
  if (data.members.some(member => !shortText(member.name, 50) || !['parent', 'child'].includes(member.role) || !Array.isArray(member.aliases) || member.aliases.length > 10 || member.aliases.some(alias => !shortText(alias, 50)))) return false;
  const audience = (memberId: LabAudience) => memberId === null || data.members.some(member => member.id === memberId);
  const grocery = (item: HouseholdGrocery) => groceryCore(item) && Number.isFinite(item.bought) && item.bought >= 0 && item.bought <= item.amount.value && (['kg', 'g', 'litre', 'ml'].includes(item.amount.unit) || Number.isInteger(item.bought)) && audience(item.memberId);
  if (data.groceries.some(item => !grocery(item)) || new Set(data.groceries.map(item => JSON.stringify([item.name.toLowerCase(), item.memberId]))).size !== data.groceries.length) return false;
  if (data.history.some(entry => !validDate(entry.date) || !Array.isArray(entry.items) || entry.items.length > 100 || !uniqueIds(entry.items) || entry.items.some(item => !grocery(item)))) return false;
  if (data.events.some(event => !shortText(event.title) || !validDate(event.date) || !validTime(event.time) || !Number.isInteger(event.duration) || event.duration < 5 || event.duration > 720 || timeMinutes(event.time) + event.duration > 1440 || !audience(event.memberId))) return false;
  if (data.tasks.some(task => !shortText(task.title) || !validDate(task.date) || typeof task.done !== 'boolean' || !audience(task.memberId))) return false;
  if (data.reminders.some(reminder => !shortText(reminder.title) || !validDate(reminder.date) || !validTime(reminder.time) || !audience(reminder.memberId))) return false;
  if (data.plans.some(plan => !shortText(plan.title) || !shortText(plan.menu, 300) || !validDate(plan.date) || !Number.isInteger(plan.people) || plan.people < 1 || plan.people > 100 || !audience(plan.memberId))) return false;
  if (data.expenses.some(expense => !Number.isSafeInteger(expense.cents) || expense.cents <= 0 || expense.cents > 100000000 || !shortText(expense.label, 60) || !audience(expense.memberId))) return false;
  return data.routines.every(routine => shortText(routine.name, 70) && shortText(routine.trigger, 100) && Array.isArray(routine.steps) && routine.steps.length > 0 && routine.steps.length <= 20 && routine.steps.every(step => record(step) && ['task', 'grocery', 'reminder'].includes(step.kind) && shortText(step.text, 120) && Number.isInteger(step.daysBefore) && step.daysBefore >= 0 && step.daysBefore <= 90 && validTime(step.time)));
}
export function importHouseholdData(json: string): HouseholdData {
  if (json.length > 250000) throw new Error('Le contexte dépasse 250 Ko.');
  const value: unknown = JSON.parse(json);
  if (!validateHouseholdData(value)) throw new Error('Contexte invalide : vérifiez les membres, dates, quantités et identifiants.');
  return structuredClone(value);
}
export function eventConflicts(data: HouseholdData, event: HouseholdEvent): HouseholdEvent[] {
  return data.events.filter(other => other.id !== event.id && other.date === event.date && (other.memberId === null || event.memberId === null || other.memberId === event.memberId) && timeMinutes(other.time) < timeMinutes(event.time) + event.duration && timeMinutes(other.time) + other.duration > timeMinutes(event.time));
}

export function projectHouseholdOperations(data: HouseholdData, operations: HouseholdOperation[], actorId: string, batchId: string, now?: number): HouseholdData {
  if (!operations.length || operations.length > 40 || !data.members.some(member => member.id === actorId)) throw new Error('Aucune action applicable ou profil absent.');
  const next = structuredClone(data);
  const allow = (memberId: LabAudience) => { if (!canWriteAudience(data, actorId, memberId)) throw new Error('Ce profil ne peut pas modifier ce destinataire.'); };
  operations.forEach((op, index) => {
    const id = `${batchId}:${index}`;
    switch (op.kind) {
      case 'grocery.add': {
        allow(op.memberId);
        if (!groceryCore(op.item)) throw new Error('Produit ou quantité ajoutée invalide.');
        const existing = next.groceries.find(item => item.name === op.item.name && item.memberId === op.memberId);
        if (existing) {
          if (JSON.stringify({ ...existing.amount, value: 0 }) !== JSON.stringify({ ...op.item.amount, value: 0 })) throw new Error('Unités différentes : précisez la quantité totale.');
          existing.amount.value = Math.round((existing.amount.value + op.item.amount.value) * 1000000) / 1000000; existing.quantity = formatSafeAmount(existing.amount); existing.completed = existing.bought === existing.amount.value;
        } else next.groceries.push({ ...structuredClone(op.item), id, memberId: op.memberId, bought: 0, completed: false });
        break;
      }
      case 'grocery.update': {
        const item = next.groceries.find(item => item.id === op.id); if (!item) throw new Error('Produit introuvable.'); allow(item.memberId);
        item.amount = structuredClone(op.amount); item.quantity = formatSafeAmount(op.amount); item.bought = op.bought; item.completed = op.bought === op.amount.value; break;
      }
      case 'grocery.remove': { const item = next.groceries.find(item => item.id === op.id); if (!item) throw new Error('Produit introuvable.'); allow(item.memberId); next.groceries = next.groceries.filter(item => item.id !== op.id); break; }
      case 'expense.add': if (!actorIsParent(data, actorId)) throw new Error('Budget réservé au parent dans ce laboratoire.'); allow(op.memberId); next.expenses.push({ id, cents: op.cents, label: op.label, memberId: op.memberId }); break;
      case 'event.move': {
        const event = next.events.find(event => event.id === op.id); if (!event) throw new Error('Rendez-vous introuvable.'); allow(event.memberId); event.date = op.date; event.time = op.time; break;
      }
      case 'event.add': allow(op.event.memberId); next.events.push({ ...op.event, id }); break;
      case 'task.add': allow(op.task.memberId); next.tasks.push({ ...op.task, id }); break;
      case 'reminder.add': allow(op.reminder.memberId); next.reminders.push({ ...op.reminder, id }); break;
      case 'plan.add': allow(op.plan.memberId); next.plans.push({ ...op.plan, id }); break;
      default: throw new Error('Action inconnue.');
    }
  });
  next.revision++;
  if (!validateHouseholdData(next)) throw new Error('Une quantité, une date ou une donnée proposée est invalide.');
  if (now !== undefined) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
    const localNow = `${date} ${time}`;
    const schedule = (op: HouseholdOperation) => op.kind === 'event.move' ? op : op.kind === 'event.add' ? op.event : op.kind === 'reminder.add' ? op.reminder : undefined;
    if (operations.some(op => { const value = schedule(op); return value && `${value.date} ${value.time}` <= localNow; })) throw new Error('Un horaire proposé est déjà passé dans le fuseau du contexte.');
  }
  for (const op of operations) if (op.kind === 'event.move' || op.kind === 'event.add') {
    const event = next.events.find(event => event.id === (op.kind === 'event.move' ? op.id : `${batchId}:${operations.indexOf(op)}`))!;
    if (eventConflicts(next, event).length) throw new Error('Créneau déjà occupé : choisissez une autre heure.');
  }
  return next;
}
export function commitHouseholdProposal(state: HouseholdSimulation, proposal: HouseholdProposal | undefined, confirmed: boolean, policy: HouseholdPolicy, now = Date.now()) {
  const blocked = (message: string) => ({ state, applied: false, message });
  if (!confirmed || !proposal || !policy.canWrite || proposal.actorId !== policy.actorId || proposal.scopeKey !== state.data.scopeKey) return blocked('Confirmation, profil et autorisation d’écriture nécessaires.');
  if (state.applied.includes(proposal.id)) return blocked('Cette proposition a déjà été appliquée.');
  if (proposal.expiresAt <= now || proposal.baseSignature !== householdSignature(state.data)) return blocked('Le contexte a changé ou la proposition a expiré. Recommencez le dialogue.');
  try {
    const data = projectHouseholdOperations(state.data, proposal.operations, policy.actorId, proposal.id, now);
    return { applied: true, message: 'Ensemble appliqué uniquement dans le laboratoire.', state: { data, applied: [...state.applied, proposal.id], undo: { before: structuredClone(state.data), afterSignature: householdSignature(data), actorId: policy.actorId } } };
  } catch (error) { return blocked(error instanceof Error ? error.message : 'Proposition invalide.'); }
}
export function undoHouseholdSimulation(state: HouseholdSimulation, policy: HouseholdPolicy) {
  if (!state.undo || !policy.canWrite || state.undo.actorId !== policy.actorId || state.undo.afterSignature !== householdSignature(state.data)) return { state, message: 'Annulation indisponible : profil ou contexte modifié.' };
  return { state: { data: { ...structuredClone(state.undo.before), revision: state.data.revision + 1 }, applied: state.applied }, message: 'Dernier ensemble annulé dans le laboratoire.' };
}
