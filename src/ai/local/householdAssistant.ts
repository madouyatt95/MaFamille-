import { parseFamilyLabVoice, type FamilyVoiceContext, type FamilyVoiceResult } from './familyVoiceDialogue.ts';
import { foldVoice, normalizeSafeVoiceText, parseGroceryEntities, readGroceryAmount, formatSafeAmount } from './safeGroceryEntities.ts';
import { readFrenchNumber, readEuroCents } from './frenchVoiceNumbers.ts';
import { dayInZone, readHouseholdSchedule, shiftDay } from './householdLabDates.ts';
import { actorIsParent, canReadAudience, canWriteAudience, eventConflicts, householdSignature, projectHouseholdOperations, shortText, timeMinutes, type HouseholdData, type HouseholdOperation, type HouseholdProposal, type LabAudience } from './householdLabData.ts';

type Need = { kind: 'need'; people?: number; date?: string; modules?: string[]; stage: 'people' | 'date' | 'modules' | 'menu' | 'products' | 'time'; ops: HouseholdOperation[]; legacy?: FamilyVoiceContext };
type Move = { kind: 'move'; query: string; eventId?: string; memberId?: string; date?: string; time?: string; period?: 'morning' | 'afternoon' | 'evening'; choices?: { id: string; label: string; reply: string }[] };
type Pending = Need | Move | { kind: 'partial'; quantity: number; total?: number; unit?: string; ids: string[] }
  | { kind: 'split'; total: number; cents: number; label: string }
  | { kind: 'routine'; routineId: string; date?: string }
  | { kind: 'legacy'; legacy: FamilyVoiceContext }
  | { kind: 'proposal' };
export type HouseholdDialogue = {
  scopeKey: string; actorId: string; expiresAt: number; signature: string; id: string;
  target: LabAudience; pending?: Pending; operations: HouseholdOperation[]; seen: string[];
  hearing?: { choices: string[]; previous?: HouseholdDialogue };
};
export type HouseholdAnswer = { status: 'proposed' | 'needs_clarification' | 'confirmed' | 'cancelled' | 'rejected' | 'answered' | 'ignored'; message: string; context?: HouseholdDialogue; proposal?: HouseholdProposal; choices: { id: string; label: string; reply: string }[]; results: string[] };
export type HouseholdVoiceOptions = { actorId: string; now?: number; utteranceId?: string; isFinal?: boolean; alternatives?: string[] };
const yes = /^(?:oui|oui merci|confirme|valide|ok|d'accord|c'est bon)$/;
const cancel = /^(?:annule|non|stop|arrete|laisse tomber|oublie|coupe le micro)$/;
const folded = (text: string) => foldVoice(normalizeSafeVoiceText(text));
const indexedChoice = (text: string) => {
  const match = text.match(/^(?:(?:le|la|choix|option) )?(premier|premiere|deuxieme|second|seconde|troisieme|quatrieme|cinquieme|[1-9])$/);
  return match ? ({ premier: 0, premiere: 0, deuxieme: 1, second: 1, seconde: 1, troisieme: 2, quatrieme: 3, cinquieme: 4 }[match[1]] ?? Number(match[1]) - 1) : -1;
};
const memberLabel = (data: HouseholdData, id: LabAudience) => id === null ? 'toute la famille' : data.members.find(member => member.id === id)?.name || 'membre absent';
export function describeHouseholdOperation(op: HouseholdOperation, data: HouseholdData): string {
  switch (op.kind) {
    case 'grocery.add': return `Courses · Ajouter ${op.item.quantity} de ${op.item.name} pour ${memberLabel(data, op.memberId)}`;
    case 'grocery.update': { const item = data.groceries.find(item => item.id === op.id); return `Courses · ${item?.name} : ${formatSafeAmount(op.amount)}, ${op.bought} achetés, ${Number((op.amount.value - op.bought).toFixed(6))} restants`; }
    case 'grocery.remove': return `Courses · Retirer ${data.groceries.find(item => item.id === op.id)?.name}`;
    case 'expense.add': return `Budget · ${(op.cents / 100).toFixed(2)} € · ${op.label} · ${memberLabel(data, op.memberId)}`;
    case 'event.move': { const event = data.events.find(event => event.id === op.id); return `Agenda · ${event?.title} (${memberLabel(data, event?.memberId ?? null)}) : ${event?.date} ${event?.time} → ${op.date} ${op.time}`; }
    case 'event.add': return `Agenda · ${op.event.title}, ${op.event.date} à ${op.event.time}, ${op.event.duration} min · ${memberLabel(data, op.event.memberId)}`;
    case 'task.add': return `Tâche · ${op.task.title}, le ${op.task.date} · ${memberLabel(data, op.task.memberId)}`;
    case 'reminder.add': return `Rappel simulé · ${op.reminder.title}, ${op.reminder.date} à ${op.reminder.time} · ${memberLabel(data, op.reminder.memberId)}`;
    case 'plan.add': return `Repas · ${op.plan.menu} pour ${op.plan.people}, le ${op.plan.date} · ${memberLabel(data, op.plan.memberId)}`;
  }
}
const safeLabel = (text: string) => shortText(text, 120) && !/\b(?:ajoute|supprime|retire|envoie|virement|si|quand|peut etre)\b/.test(folded(text));
function mentionedMembers(text: string, data: HouseholdData) {
  return data.members.filter(member => [member.name, ...member.aliases].some(alias => new RegExp(`(?:^|[^a-z])${folded(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z])`).test(text)));
}
function legacyOperations(result: FamilyVoiceResult, data: HouseholdData, target: LabAudience): HouseholdOperation[] {
  const before = data.groceries.filter(item => item.memberId === target);
  const after = result.receipt?.after || result.context.grocery.proposal;
  const operations: HouseholdOperation[] = [];
  for (const item of after) {
    const old = before.find(value => value.name === item.name);
    if (!old) operations.push({ kind: 'grocery.add', item, memberId: target });
    else if (JSON.stringify(old.amount) !== JSON.stringify(item.amount) || (old.bought === old.amount.value) !== Boolean(item.completed)) {
      const sameUnit = old.amount.unit === item.amount.unit && old.amount.packSize === item.amount.packSize;
      if (sameUnit && item.amount.value > old.amount.value && !item.completed) operations.push({ kind: 'grocery.add', item: { ...item, amount: { ...item.amount, value: item.amount.value - old.amount.value }, quantity: formatSafeAmount({ ...item.amount, value: item.amount.value - old.amount.value }) }, memberId: target });
      else operations.push({ kind: 'grocery.update', id: old.id, amount: item.amount, bought: item.completed ? item.amount.value : old.bought === old.amount.value ? 0 : old.bought });
    }
  }
  if (result.receipt || result.context.grocery.hasProposal) for (const old of before) if (!after.some(item => item.name === old.name)) operations.push({ kind: 'grocery.remove', id: old.id });
  for (const expense of result.receipt?.expenses || result.expenses) operations.push({ kind: 'expense.add', cents: expense.cents, label: expense.label, memberId: target });
  return operations;
}

export function parseHouseholdVoice(raw: string, data: HouseholdData, previous: HouseholdDialogue | undefined, options: HouseholdVoiceOptions): HouseholdAnswer {
  const now = options.now ?? Date.now();
  const text = normalizeSafeVoiceText(raw); const t = folded(raw);
  const actor = data.members.find(member => member.id === options.actorId);
  const answer = (status: HouseholdAnswer['status'], message: string, context?: HouseholdDialogue, choices: HouseholdAnswer['choices'] = [], results: string[] = []): HouseholdAnswer => ({ status, message, context, choices, results });
  if (!actor) return answer('rejected', 'Choisissez un membre du contexte de test.');
  if (!text || text.length > 500) return answer('rejected', 'Reformulez une phrase de moins de 500 caractères.');
  if (/^(?:stop|arrete|coupe le micro)$/.test(t)) return answer('cancelled', 'Dialogue arrêté. Rien n’est appliqué.');
  if (previous && (previous.actorId !== actor.id || previous.scopeKey !== data.scopeKey || previous.expiresAt <= now || previous.signature !== householdSignature(data))) return answer('rejected', 'Le profil, les données ou le délai ont changé. Recommencez la demande.');
  if (options.isFinal === false || options.utteranceId && previous?.seen.includes(options.utteranceId)) return answer('ignored', 'Transcription intermédiaire ou déjà traitée.', previous);
  if (/\b(?:si|peut etre|eventuellement|a condition|sauf si)\b/.test(t)) return answer('rejected', 'Cette demande est conditionnelle. Précisez ce que vous souhaitez réellement préparer.');
  const context: HouseholdDialogue = previous ? structuredClone(previous) : { actorId: actor.id, scopeKey: data.scopeKey, expiresAt: now + 120000, signature: householdSignature(data), id: `${data.scopeKey}:${now}:${options.utteranceId || 'text'}`, target: actor.role === 'parent' ? null : actor.id, operations: [], seen: [] };
  if (options.alternatives?.length) {
    const candidates = [...new Set([text, ...options.alternatives.map(value => normalizeSafeVoiceText(value))])];
    if (candidates.length > 5 || candidates.some(value => value.length > 500)) return answer('rejected', 'Trop de variantes. Répétez une phrase courte.');
    const unique = new Map<string, string>();
    for (const candidate of candidates) {
      const result = parseHouseholdVoice(candidate, data, previous, { ...options, now, alternatives: undefined });
      unique.set(JSON.stringify([result.status, result.context?.operations, result.context?.pending, result.message, result.results]), candidate);
    }
    if (unique.size > 1) {
      const choices = [...unique.values()]; context.hearing = { choices, previous };
      return answer('needs_clarification', 'Les transcriptions ne conduisent pas à la même demande. Choisissez une phrase.', context, choices.map((value, i) => ({ id: String(i), label: value, reply: String(i + 1) })));
    }
  }
  if (cancel.test(t)) return answer('cancelled', 'Propositions abandonnées. Les données restent inchangées.');
  if (context.hearing) {
    const index = indexedChoice(t); const choices = context.hearing.choices;
    const selected = index >= 0 ? choices[index] : choices.find(value => folded(value) === t);
    if (!selected) return answer('needs_clarification', 'Choisissez un numéro ; « oui » ne choisit pas une transcription.', context, choices.map((value, i) => ({ id: String(i), label: value, reply: String(i + 1) })));
    return parseHouseholdVoice(selected, data, context.hearing.previous, { ...options, now, alternatives: undefined });
  }
  context.seen = [...context.seen, ...(options.utteranceId ? [options.utteranceId] : [])].slice(-100);
  const ask = (message: string, choices: HouseholdAnswer['choices'] = []) => answer('needs_clarification', message, context, choices);
  const finish = (operations: HouseholdOperation[], message = 'Vérifiez ces modifications, puis confirmez l’ensemble.'): HouseholdAnswer => {
    try { projectHouseholdOperations(data, operations, actor.id, context.id, now); } catch (error) { return answer('rejected', error instanceof Error ? error.message : 'Proposition invalide.'); }
    context.operations = operations; context.pending = { kind: 'proposal' };
    return answer('proposed', message, context);
  };
  const schedule = readHouseholdSchedule(text, now, data.timezone);
  const customRequest = context.pending && context.pending.kind !== 'legacy' || /^(?:on recoit|nous recevons|on invite|nous invitons|decale|deplace|reprogramme|j'ai pris|j ai pris|j'ai achete|j ai achete|on a pris|j'ai paye|j ai paye|lance .*routine)\b/.test(t) || data.routines.some(routine => t.startsWith(folded(routine.trigger)));
  if (customRequest && /(?:\bet\b|\bpuis\b|;)\s*(?:ajoute|supprime|retire|note|enregistre|ouvre|envoie|decale|deplace)\b/.test(t)) return answer('rejected', 'Cette combinaison doit être traitée en demandes distinctes. Aucun ajout partiel.');
  const today = dayInZone(now, data.timezone);
  const visibleGroceries = data.groceries.filter(item => canReadAudience(data, actor.id, item.memberId));
  const visibleEvents = data.events.filter(event => canReadAudience(data, actor.id, event.memberId));
  const getRecipient = (value: string): LabAudience | undefined => {
    if (/^(?:toute la famille|la famille|tout le monde)$/.test(value)) return null;
    if (/^(?:moi|moi seulement)$/.test(value)) return actor.id;
    const members = mentionedMembers(value, data);
    return members.length === 1 ? members[0].id : undefined;
  };

  const retarget = t.match(/^(?:ajoute|mets|reserve) (?:ca|cela|tout ca) pour (.+?)(?:,? pas pour (?:toute )?la famille)?$/);
  if (retarget) {
    const target = getRecipient(retarget[1]);
    if (target === undefined) return ask('Quel membre exactement ? Utilisez son nom dans le contexte.');
    if (!canWriteAudience(data, actor.id, target)) return answer('rejected', 'Ce profil ne peut pas modifier les données de ce destinataire.');
    if (!context.operations.length || context.operations.some(op => !['grocery.add', 'expense.add', 'task.add', 'reminder.add', 'plan.add'].includes(op.kind))) return ask('Seuls les nouveaux ajouts peuvent changer de destinataire. Précisez d’abord les éléments à ajouter.');
    const ops = context.operations.map(op => op.kind === 'grocery.add' || op.kind === 'expense.add' ? { ...op, memberId: target } : op.kind === 'task.add' ? { ...op, task: { ...op.task, memberId: target } } : op.kind === 'reminder.add' ? { ...op, reminder: { ...op.reminder, memberId: target } } : op.kind === 'plan.add' ? { ...op, plan: { ...op.plan, memberId: target } } : op);
    context.target = target; return finish(ops, `Ajouts réservés à ${memberLabel(data, target)}. Confirmez cette nouvelle proposition.`);
  }

  if ((context.pending?.kind === 'proposal' || context.pending?.kind === 'move' && context.operations.length) && yes.test(t)) {
    const checked = finish(context.operations);
    if (checked.status !== 'proposed') return checked;
    const proposal: HouseholdProposal = { id: context.id, actorId: actor.id, scopeKey: data.scopeKey, baseSignature: context.signature, expiresAt: context.expiresAt, operations: structuredClone(context.operations) };
    return { ...answer('confirmed', 'Ensemble confirmé. Aucune modification réelle exécutée.', context), proposal };
  }

  const needMatch = t.match(/^(?:on recoit|nous recevons|on invite|nous invitons)(?: (.+?))?(?: (?:personnes?|invites?|amis))?(?: (?:samedi|dimanche|lundi|mardi|mercredi|jeudi|vendredi|demain|aujourd'hui|le \d).*)?$/);
  if (needMatch && context.pending?.kind !== 'need') {
    if (context.operations.length) return ask('Une proposition est en attente. Confirmez-la ou dites annule avant de préparer cette réception.');
    const number = readFrenchNumber(t.replace(/^(?:on recoit|nous recevons|on invite|nous invitons)\s*/, ''));
    context.pending = { kind: 'need', people: number.explicit && Number.isInteger(number.value) && number.value > 0 && number.value <= 100 ? number.value : undefined, date: schedule.date, stage: number.explicit ? schedule.date ? 'modules' : 'date' : 'people', ops: [] };
    if (schedule.error) return ask(schedule.error);
  }
  if (context.pending?.kind === 'need') {
    const need = context.pending;
    if (!need.people) {
      const value = readFrenchNumber(t);
      if (!needMatch && value.explicit && !value.rest.replace(/^personnes?$/, '').trim() && Number.isInteger(value.value) && value.value > 0 && value.value <= 100) need.people = value.value;
      else return ask('Combien de personnes recevez-vous ?');
    }
    if (!need.date) { if (schedule.error) return ask(schedule.error); if (schedule.date) need.date = schedule.date; else return ask('À quelle date recevez-vous ces personnes ?'); }
    if (!need.modules) {
      const choices = [{ id: 'courses', label: 'Courses', reply: 'courses' }, { id: 'repas', label: 'Repas', reply: 'repas' }, { id: 'agenda', label: 'Agenda', reply: 'agenda' }, { id: 'all', label: 'Les trois', reply: 'les trois' }];
      const input = indexedChoice(t) >= 0 ? choices[indexedChoice(t)]?.reply || t : t;
      const modules = input === 'les trois' || input === 'tout' ? ['repas', 'courses', 'agenda'] : input.split(/\s*(?:,|et)\s*/).filter(value => ['repas', 'courses', 'agenda'].includes(value));
      if (needMatch || !modules.length || modules.length !== input.split(/\s*(?:,|et)\s*/).length && !['les trois', 'tout'].includes(input)) return ask(`Réception de ${need.people} personnes le ${need.date}. Que souhaitez-vous préparer ?`, choices);
      need.modules = [...new Set(modules)]; need.stage = need.modules.includes('repas') ? 'menu' : need.modules.includes('courses') ? 'products' : 'time';
      return ask(need.stage === 'menu' ? 'Quel repas ou menu prévoyez-vous ?' : need.stage === 'products' ? `Quels produits et quantités pour ces ${need.people} personnes ?` : 'À quelle heure commence la réception ?');
    }
    if (need.stage === 'menu') {
      if (yes.test(t) || !safeLabel(text)) return ask('Indiquez le nom du repas ; aucun menu ne sera inventé.');
      need.ops.push({ kind: 'plan.add', plan: { title: 'Réception familiale', date: need.date, people: need.people, menu: text, memberId: context.target } });
      need.stage = need.modules.includes('courses') ? 'products' : 'time';
      if (need.modules.includes('courses')) return ask(`Quels produits et quantités pour ${need.people} personnes ?`);
      if (need.modules.includes('agenda')) return ask('À quelle heure commence la réception ?');
      return finish(need.ops);
    }
    if (need.stage === 'products') {
      const legacyOptions = { scopeKey: data.scopeKey + ':' + actor.id, now, list: [], utteranceId: options.utteranceId };
      const legacy = parseFamilyLabVoice(text, need.legacy || parseFamilyLabVoice(`il faut prévoir des courses pour ${need.people} personnes`, undefined, { ...legacyOptions, utteranceId: undefined }).context, legacyOptions);
      need.legacy = legacy.context;
      if (legacy.expenses.length || legacy.receipt?.expenses.length) return answer('rejected', 'Cette étape attend des produits. Traitez la dépense dans une demande distincte ; aucun élément de la réception n’est appliqué.');
      if (!['proposed', 'confirmed'].includes(legacy.status)) return ask(legacy.message);
      const items = legacy.receipt?.after || legacy.context.grocery.proposal;
      if (!items.length) return ask('Quels produits et quantités souhaitez-vous ajouter ?');
      need.ops.push(...items.map(item => ({ kind: 'grocery.add' as const, item, memberId: context.target })));
      if (!need.modules.includes('agenda')) return finish(need.ops);
      need.stage = 'time'; return ask('À quelle heure commence la réception, et pour quelle durée en minutes ?');
    }
    if (need.stage === 'time') {
      if (schedule.error) return ask(schedule.error);
      const duration = t.match(/(?:pendant|duree|durée) (\d+) (?:min|minutes)/);
      if (!schedule.time || !duration) return ask('Précisez l’heure et la durée, par exemple « 19h pendant 120 minutes ».');
      return finish([...need.ops, { kind: 'event.add', event: { title: `Réception · ${need.people} personnes`, date: need.date, time: schedule.time, duration: Number(duration[1]), memberId: context.target } }]);
    }
  }

  const moveMatch = t.match(/^(?:decale|deplace|reprogramme) (?:le |la |mon |notre )?(.+?)(?: (?:a|au) (.+))?$/);
  if (moveMatch || context.pending?.kind === 'move') {
    if (moveMatch && context.operations.length && context.pending?.kind !== 'move') return ask('Confirmez ou annulez la proposition en cours avant de déplacer un rendez-vous.');
    const move: Move = context.pending?.kind === 'move' ? context.pending : { kind: 'move', query: moveMatch![1] };
    context.pending = move;
    context.operations = [];
    if (schedule.error) return ask(schedule.error);
    if (schedule.date) { move.date = schedule.date; move.time = undefined; }
    if (schedule.time) move.time = schedule.time;
    if (schedule.period) { move.period = schedule.period; if (!schedule.time) move.time = undefined; }
    const members = mentionedMembers(t, data);
    if (members.length > 1) return ask('Un seul membre à la fois : indiquez son nom exact.');
    if (/\b(?:celui|celle) (?:de |d')/.test(t) && !members.length) { move.eventId = undefined; move.memberId = undefined; move.time = undefined; return ask('Ce membre n’est pas identifié dans le contexte. Précisez son nom exact.'); }
    if (members[0]) { if (!canReadAudience(data, actor.id, members[0].id)) return answer('rejected', 'Aucun rendez-vous accessible pour cette demande.'); move.memberId = members[0].id; move.eventId = undefined; }
    const index = indexedChoice(t);
    if (!moveMatch && !members.length && !schedule.date && !schedule.time && !schedule.period && !(index >= 0 && move.choices?.[index])) return ask('Précisez le membre, la date ou l’heure, ou choisissez un créneau proposé.');
    if (index >= 0 && move.choices?.[index]) { const choice = move.choices[index]; if (choice.id.startsWith('time:')) move.time = choice.reply; else move.eventId = choice.id; }
    const words = move.query.split(/[^a-z0-9]+/).filter(word => word.length > 2 && !['rdv', 'rendez', 'vous', 'chez', 'pour', 'celui', 'maman', 'papa'].includes(word) && !data.members.some(member => [member.name, ...member.aliases].some(alias => folded(alias).includes(word))));
    const matches = visibleEvents.filter(event => event.date >= today && (move.memberId === undefined || event.memberId === move.memberId) && words.every(word => folded(event.title).includes(word)));
    let event = move.eventId ? matches.find(event => event.id === move.eventId) : matches.length === 1 ? matches[0] : undefined;
    if (!event) {
      if (!matches.length) return answer('answered', 'Aucun rendez-vous accessible ne correspond. Rien n’est déplacé.');
      move.choices = matches.slice(0, 9).map(event => ({ id: event.id, label: `${event.title} · ${memberLabel(data, event.memberId)} · ${event.date} ${event.time}`, reply: String(matches.indexOf(event) + 1) }));
      return ask('Quel rendez-vous souhaitez-vous déplacer ?', move.choices);
    }
    move.eventId = event.id;
    if (!move.date) return ask(`À quelle date déplacer ${event.title} pour ${memberLabel(data, event.memberId)} ?`);
    const freeTimes = () => {
      const start = move.period === 'afternoon' ? 13 : move.period === 'evening' ? 18 : 8;
      const end = move.period === 'morning' ? 12 : move.period === 'afternoon' ? 18 : 22;
      const choices: Move['choices'] = [];
      for (let minute = start * 60; minute + event!.duration <= end * 60 && choices.length < 3; minute += 30) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        const clock = new Intl.DateTimeFormat('en-GB', { timeZone: data.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
        if (`${move.date} ${time}` > `${today} ${clock}` && !eventConflicts(data, { ...event!, date: move.date!, time }).length) choices.push({ id: `time:${time}`, label: `${move.date} à ${time}`, reply: time });
      }
      return choices;
    };
    if (!move.time) { move.choices = freeTimes(); return ask(`À quelle heure pour ${memberLabel(data, event.memberId)} ? Ces créneaux sont libres dans l’agenda fourni.`, move.choices.map((choice, i) => ({ ...choice, reply: String(i + 1) }))); }
    if (move.period && (move.period === 'afternoon' && (timeMinutes(move.time) < 780 || timeMinutes(move.time) >= 1080) || move.period === 'morning' && timeMinutes(move.time) >= 720 || move.period === 'evening' && timeMinutes(move.time) < 1080)) return ask('Cette heure ne respecte pas la période demandée. Choisissez une autre heure.');
    event = { ...event, date: move.date, time: move.time };
    if (eventConflicts(data, event).length) { move.time = undefined; move.choices = freeTimes(); return ask('Ce créneau est déjà occupé. Quel autre créneau préférez-vous ?', move.choices.map((choice, i) => ({ ...choice, reply: String(i + 1) }))); }
    const result = finish([{ kind: 'event.move', id: event.id, date: event.date, time: event.time }]);
    if (result.status === 'proposed') context.pending = move;
    return result;
  }

  const historyMatch = t.match(/^(?:remets|reprends|ajoute) (?:les |nos )?courses de la semaine derniere(?:,? (?:mais )?sans (?:les |la |le )?(.+))?$/);
  if (historyMatch) {
    if (context.operations.length) return ask('Confirmez ou annulez les propositions avant de reprendre un historique.');
    const categories: Record<string, string> = { boissons: 'Boissons', fruits: 'Fruits & Légumes', legumes: 'Fruits & Légumes', 'fruits et legumes': 'Fruits & Légumes', viandes: 'Viandes & Poissons', 'produits laitiers': 'Produits Laitiers' };
    const excluded = historyMatch[1] ? categories[historyMatch[1]] : undefined;
    if (historyMatch[1] && !excluded) return ask('Quelle catégorie exclure : boissons, fruits et légumes, viandes ou produits laitiers ?');
    const weekday = new Date(today + 'T12:00:00Z').getUTCDay(); const monday = shiftDay(today, -((weekday + 6) % 7)); const from = shiftDay(monday, -7);
    const entries = data.history.filter(entry => entry.date >= from && entry.date < monday);
    const items = entries.flatMap(entry => entry.items).filter(item => canReadAudience(data, actor.id, item.memberId) && canWriteAudience(data, actor.id, item.memberId) && (!excluded || folded(item.category) !== folded(excluded)));
    if (!items.length) return answer('answered', `Aucun produit accessible à reprendre entre le ${from} et le ${shiftDay(monday, -1)} avec ces critères.`);
    return finish(items.map(item => ({ kind: 'grocery.add', item: { ...item, completed: false }, memberId: item.memberId })), `Historique fourni du ${from} au ${shiftDay(monday, -1)}${excluded ? `, sans ${historyMatch[1]}` : ''}. Quantités reprises à l’identique ; confirmez avant ajout.`);
  }

  const partialMatch = t.match(/^(?:j'ai pris|j ai pris|j'ai achete|j ai achete|on a pris) (.+?) sur (?:les? )?(.+)$/);
  if (partialMatch || context.pending?.kind === 'partial') {
    if (context.operations.length && context.pending?.kind !== 'partial') return ask('Confirmez ou annulez la proposition avant de déclarer cet achat.');
    let pending = context.pending?.kind === 'partial' ? context.pending : undefined;
    if (partialMatch) {
      const quantity = readGroceryAmount(partialMatch[1]); const total = readGroceryAmount(partialMatch[2]);
      const names = [quantity.rest, total.rest].filter(Boolean).map(value => parseGroceryEntities(value));
      if (!quantity.valid || !quantity.explicit || !total.valid || !total.explicit || names.some(value => value.error || value.items.length !== 1) || names.length === 2 && names[0].items[0].name !== names[1].items[0].name || quantity.unitExplicit && total.unitExplicit && quantity.amount.unit !== total.amount.unit) return answer('rejected', 'Précisez la quantité prise, le produit et la quantité restante initiale.');
      const named = names[0]?.items[0].name;
      const unit = quantity.unitExplicit ? quantity.amount.unit : total.unitExplicit ? total.amount.unit : undefined;
      const matches = visibleGroceries.filter(item => canWriteAudience(data, actor.id, item.memberId) && Math.abs(item.amount.value - item.bought - total.amount.value) < 0.000001 && (!named || item.name === named) && (!unit || item.amount.unit === unit));
      pending = { kind: 'partial', quantity: quantity.amount.value, total: total.amount.value, unit: quantity.unitExplicit ? quantity.amount.unit : undefined, ids: matches.map(item => item.id) }; context.pending = pending;
    }
    const candidates = visibleGroceries.filter(item => pending!.ids.includes(item.id)); const index = indexedChoice(t);
    const item = index >= 0 ? candidates[index] : candidates.length === 1 ? candidates[0] : candidates.find(item => folded(item.name) === t);
    if (!item) return candidates.length ? ask('De quel produit s’agit-il ?', candidates.map((item, i) => ({ id: item.id, label: `${item.name} · ${item.quantity} · ${memberLabel(data, item.memberId)}`, reply: String(i + 1) }))) : answer('rejected', 'Aucune quantité restante ne correspond. Aucun produit coché.');
    if (pending!.quantity > item.amount.value - item.bought) return answer('rejected', 'La quantité prise dépasse la quantité restante.');
    return finish([{ kind: 'grocery.update', id: item.id, amount: item.amount, bought: Math.round((item.bought + pending!.quantity) * 1000000) / 1000000 }]);
  }

  const splitMatch = t.match(/^(?:j'ai paye|j ai paye|note|enregistre) (.+?),? dont (.+?) (?:pour|de) (.+)$/);
  if (splitMatch || context.pending?.kind === 'split') {
    if (context.operations.length && context.pending?.kind !== 'split') return ask('Confirmez ou annulez la proposition avant de répartir cette dépense.');
    if (!actorIsParent(data, actor.id)) return answer('rejected', 'Les dépenses ne sont pas accessibles à ce profil.');
    let pending = context.pending?.kind === 'split' ? context.pending : undefined;
    if (splitMatch) {
      const total = readEuroCents(splitMatch[1].replace(/,$/, ''));
      const cents = readEuroCents(splitMatch[2]) ?? readEuroCents(`${splitMatch[2]} euros`);
      const label = splitMatch[3].replace(/^(?:la|le|les) /, '');
      if (total === null || cents === null || cents > total || !safeLabel(label) || /\bet\b/.test(label)) return answer('rejected', 'Répartition invalide. Indiquez un total et une part qui ne le dépasse pas.');
      pending = { kind: 'split', total, cents, label }; context.pending = pending;
      if (cents === total) return finish([{ kind: 'expense.add', cents: total, label, memberId: context.target }]);
      return ask(`${(cents / 100).toFixed(2)} € pour ${label}. À quelle catégorie affecter les ${((total - cents) / 100).toFixed(2)} € restants ?`);
    }
    const label = text.replace(/^(?:le reste (?:pour|en)|pour|en|de)\s+/i, '').replace(/^(?:les|la|le)\s+/i, '');
    if (yes.test(t) || !safeLabel(label) || /\d|euros?|€|\bet\b/.test(t)) return ask(`Quel motif pour les ${((pending!.total - pending!.cents) / 100).toFixed(2)} € restants ?`);
    return finish([{ kind: 'expense.add', cents: pending!.cents, label: pending!.label, memberId: context.target }, { kind: 'expense.add', cents: pending!.total - pending!.cents, label, memberId: context.target }], `Total réparti : ${(pending!.total / 100).toFixed(2)} €. Le total ne sera pas ajouté une seconde fois.`);
  }

  const routineMatches = data.routines.filter(routine => t === folded(routine.trigger) || t.startsWith(folded(routine.trigger) + ' ') || t === `lance la routine ${folded(routine.name)}`);
  if (routineMatches.length || context.pending?.kind === 'routine' || /^lance (?:la |une )?routine\b/.test(t) || /^prepare (?:notre |le )?depart en vacances\b/.test(t)) {
    if (context.operations.length && context.pending?.kind !== 'routine') return ask('Confirmez ou annulez la proposition avant de lancer une routine.');
    const routineId = context.pending?.kind === 'routine' ? context.pending.routineId : undefined;
    const routine = routineId ? data.routines.find(routine => routine.id === routineId) : routineMatches.length === 1 ? routineMatches[0] : undefined;
    if (!routine) return answer('answered', routineMatches.length > 1 ? 'Plusieurs routines ont cette phrase. Donnez-leur des déclencheurs distincts.' : 'Aucune routine définie ne correspond. Ajoutez votre routine dans le laboratoire.');
    const pending = context.pending?.kind === 'routine' ? context.pending : { kind: 'routine' as const, routineId: routine.id };
    context.pending = pending;
    if (schedule.error) return ask(schedule.error);
    if (schedule.date) pending.date = schedule.date;
    if (!pending.date) return ask(`Pour quelle date lancer « ${routine.name} » ?`);
    const operations: HouseholdOperation[] = [];
    for (const step of routine.steps) {
      const date = shiftDay(pending.date, -step.daysBefore);
      if (date < today) return answer('rejected', 'Une étape tomberait dans le passé. Corrigez les délais de la routine ou la date de départ.');
      if (step.kind === 'grocery') {
        const parsed = parseGroceryEntities(normalizeSafeVoiceText(step.text));
        if (parsed.error || parsed.unknown.length) return answer('rejected', `Produit de routine à préciser : ${step.text}.`);
        operations.push(...parsed.items.map(item => ({ kind: 'grocery.add' as const, item, memberId: context.target })));
      } else if (step.kind === 'task') operations.push({ kind: 'task.add', task: { title: step.text, date, done: false, memberId: context.target } });
      else operations.push({ kind: 'reminder.add', reminder: { title: step.text, date, time: step.time, memberId: context.target } });
    }
    return finish(operations, `Routine « ${routine.name} » : uniquement les étapes enregistrées. Confirmez l’ensemble ; aucun rappel push réel ne sera envoyé.`);
  }

  const search = t.match(/^(?:retrouve|cherche|recherche|montre) (?:mes |les |nos |la |le )?(rendez-vous|rendez vous|rdv|taches|depenses|courses)(?: (.+))?$/);
  if (search) {
    if (context.operations.length) return ask('Confirmez ou annulez la proposition en cours avant cette recherche.');
    const module = search[1]; const query = search[2] || ''; const members = mentionedMembers(query, data);
    if (members.length > 1) return ask('Précisez un seul membre.');
    if (members[0] && !canReadAudience(data, actor.id, members[0].id)) return answer('answered', 'Aucun résultat accessible.');
    if (module === 'depenses' && !actorIsParent(data, actor.id)) return answer('rejected', 'Les dépenses ne sont pas accessibles à ce profil.');
    const words = query.split(/[^a-z0-9]+/).filter(word => word.length > 2 && !['pour', 'chez'].includes(word) && !members.some(member => [member.name, ...member.aliases].some(alias => folded(alias).includes(word))));
    const rows = module === 'courses' ? visibleGroceries.map(item => ({ memberId: item.memberId, text: `${item.name} · ${item.quantity} · ${item.bought} achetés` })) : module === 'taches' ? data.tasks.filter(task => canReadAudience(data, actor.id, task.memberId)).map(task => ({ memberId: task.memberId, text: `${task.title} · ${task.date} · ${task.done ? 'terminée' : 'à faire'}` })) : module === 'depenses' ? data.expenses.map(expense => ({ memberId: expense.memberId, text: `${expense.label} · ${(expense.cents / 100).toFixed(2)} €` })) : visibleEvents.map(event => ({ memberId: event.memberId, text: `${event.title} · ${event.date} ${event.time}` }));
    const results = rows.filter(row => (!members[0] || row.memberId === members[0].id) && words.every(word => folded(row.text).includes(word))).slice(0, 20).map(row => `${row.text} · ${memberLabel(data, row.memberId)}`);
    return answer('answered', results.length ? 'Résultats du contexte fourni au laboratoire.' : 'Aucun résultat accessible dans le contexte fourni.', undefined, [], results);
  }

  if (context.pending?.kind === 'proposal') return ask('Une proposition est en attente. Confirmez-la, changez son destinataire ou dites annule.');
  const addressed = t.match(/^(ajoute .+?) pour (.+)$/);
  let legacyText = text;
  if (addressed && !/\b(?:euros?|€|personnes?)\b/.test(t)) {
    const target = getRecipient(addressed[2]);
    if (target === undefined) return ask('Quel destinataire du contexte souhaitez-vous choisir ? Reformulez avec son nom exact.');
    if (!canWriteAudience(data, actor.id, target)) return answer('rejected', 'Ce profil ne peut pas modifier ce destinataire.');
    if (context.operations.length && target !== context.target) return ask('Utilisez « ajoute ça pour ce membre » pour réaffecter les ajouts en attente.');
    context.target = target; legacyText = addressed[1];
  }
  const legacyContext = context.pending?.kind === 'legacy' ? context.pending.legacy : undefined;
  const scopedList = data.groceries.filter(item => item.memberId === context.target).map(item => ({ ...item, completed: item.bought === item.amount.value }));
  const legacy = parseFamilyLabVoice(legacyText, legacyContext, { scopeKey: data.scopeKey + ':' + actor.id, now, list: scopedList, utteranceId: options.utteranceId });
  if (legacy.status === 'proposed' || legacy.status === 'confirmed') {
    const ops = legacyOperations(legacy, data, context.target);
    if (!ops.length) return answer('answered', legacy.message);
    const proposed = finish(ops, legacy.message);
    if (proposed.status !== 'proposed') return proposed;
    if (legacy.status === 'confirmed') return parseHouseholdVoice('oui', data, context, { ...options, utteranceId: undefined, alternatives: undefined });
    context.pending = { kind: 'legacy', legacy: legacy.context };
    return { ...proposed, context };
  }
  if (legacy.status === 'needs_clarification') { context.pending = { kind: 'legacy', legacy: legacy.context }; return ask(legacy.message); }
  return answer(legacy.status === 'out_of_scope' ? 'rejected' : legacy.status, legacy.message);
}
