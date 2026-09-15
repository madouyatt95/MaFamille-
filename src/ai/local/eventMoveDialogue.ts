import { foldVoice, normalizeSafeVoiceText } from './safeGroceryEntities.ts';
import { readHouseholdSchedule } from './householdLabDates.ts';
import { parseEventMove, eventMoveCandidates, type MoveRequest, type PilotEvent } from './eventMove.ts';

export type EventMember = { id: string; display_name: string };
export type EventMoveDraft = { request: MoveRequest; hasTime: boolean; scope: string; expiresAt: number };
export type EventMoveAnswer = { draft: EventMoveDraft | null; candidates: PilotEvent[]; message: string; ready: boolean };
const empty = (message: string): EventMoveAnswer => ({ draft: null, candidates: [], message, ready: false });
const start = /^(?:decale|reporte|avance|deplace)\s+/;

// This dialogue selects an existing event and changes its time, never its day.
export function advanceEventMove(raw: string, previous: EventMoveDraft | null, events: PilotEvent[], members: EventMember[], now: number, timezone: string, scope: string): EventMoveAnswer | null {
  const text = foldVoice(normalizeSafeVoiceText(raw));
  if (!previous && !start.test(text)) return null;
  if (!text || text.length > 500) return empty('Reformulez une demande courte.');
  if (/^(?:annule|non|stop|laisse tomber)$/.test(text)) return empty('Déplacement annulé. Aucun changement enregistré.');
  if (previous && (previous.scope !== scope || previous.expiresAt <= now) && !start.test(text)) return empty('La demande a expiré ou le profil a changé. Recommencez le déplacement.');
  if (/\b(?:si|sauf|pas|euros?|budget|medicament|traitement|message|puis|ajoute)\b|[€$£]/.test(text)) return empty('Cette demande doit être traitée séparément. Aucun rendez-vous modifié.');
  let draft: EventMoveDraft;
  if (start.test(text)) {
    const relative = parseEventMove(text, now, timezone);
    if (relative) draft = { request: relative, hasTime: true, scope, expiresAt: now + 120000 };
    else {
      const absolute = text.match(/^(?:decale|reporte|avance|deplace)\s+(.+?)\s+a\s+(\d{1,2}\s*(?:h|:)\s*\d{0,2}|midi|minuit)$/);
      const schedule = absolute ? readHouseholdSchedule(absolute[2], now, timezone) : null;
      // Do not mistake an unsupported destination/date or duration for a title.
      if (!absolute && /\b(?:a|de)\s+(?:\d|vendredi|lundi|mardi|mercredi|jeudi|samedi|dimanche)|\b(?:minutes?|heures?|apres-midi|matin|soir)\b/.test(text)) return empty('Indiquez une heure précise dans la même journée, ou un décalage en minutes. Pour changer de date, utilisez l’agenda.');
      if (absolute && (!schedule?.time || schedule.error)) return empty('Indiquez une heure valide, par exemple 16h30.');
      const target = absolute?.[1] || text.replace(start, '');
      // Reuse the existing date/title extraction, with a synthetic offset only for parsing.
      const base = parseEventMove(`decale ${target} de une minute`, now, timezone);
      if (!base) return empty('Quel rendez-vous souhaitez-vous déplacer ?');
      draft = { request: { ...base, minutes: 0, ...(schedule?.time ? { time: schedule.time } : {}) }, hasTime: Boolean(schedule?.time), scope, expiresAt: now + 120000 };
    }
    const owner = draft.request.search.match(/^(.*?)\s+(?:pour|de)\s+(.+)$/);
    if (owner) {
      const matches = members.filter(member => foldVoice(member.display_name) === owner[2]);
      if (matches.length === 1) draft.request = { ...draft.request, search: owner[1], memberId: matches[0].id };
    }
  } else {
    draft = structuredClone(previous!);
    const memberName = text.match(/^(?:non\s+)?(?:celui|celle) (?:de|pour) (.+)$/)?.[1];
    const dateText = text.match(/^(?:non\s+)?(?:celui|celle) (?:de |d')?(demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)$/)?.[1];
    const memberMatches = memberName ? members.filter(member => foldVoice(member.display_name) === memberName) : [];
    if (dateText) {
      const date = readHouseholdSchedule(dateText, now, timezone).date;
      if (date) draft.request.date = date;
    } else if (memberMatches.length === 1) draft.request.memberId = memberMatches[0].id;
    else if (/^(?:a\s+)?(?:\d{1,2}\s*(?:h|:)\s*\d{0,2}|midi|minuit)$/.test(text)) {
      const schedule = readHouseholdSchedule(text, now, timezone);
      if (!schedule.time || schedule.error) return { draft, candidates: eventMoveCandidates(events, draft.request), ready: false, message: 'Cette heure n’est pas valide. Quelle heure souhaitez-vous ?' };
      draft.request = { ...draft.request, time: schedule.time, minutes: 0 }; draft.hasTime = true;
    } else {
      const relative = parseEventMove(`decale le rdv de ${text.replace(/^de\s+/, '')}`, now, timezone);
      if (relative) { draft.request = { ...draft.request, minutes: relative.minutes, time: undefined }; draft.hasTime = true; }
      else return { draft, candidates: eventMoveCandidates(events, draft.request), ready: false, message: memberName ? 'Aucun membre unique ne porte ce nom. Précisez un prénom présent dans votre famille.' : 'Précisez « celui de demain », « celui de [prénom] », une heure ou un décalage en minutes. La date du rendez-vous ne sera pas changée.' };
    }
  }
  const candidates = eventMoveCandidates(events, draft.request);
  const label = (event: PilotEvent) => `${event.title}, ${members.find(member => member.id === event.member_id)?.display_name || 'famille'}, ${event.date_time}, ${event.time || 'heure inconnue'}`;
  const message = !candidates.length ? 'Aucun rendez-vous correspondant dans votre agenda. Reformulez le titre ou la sélection.'
    : candidates.length > 1 ? `Quel rendez-vous : ${candidates.slice(0, 4).map(label).join(' ; ')}${candidates.length > 4 ? ' ; autres choix dans la liste' : ''} ?`
      : !draft.hasTime ? `${label(candidates[0])}. À quelle heure, ou de combien de minutes souhaitez-vous le déplacer ?`
        : `${label(candidates[0])}. Vérifiez le nouvel horaire et les durées avant d’enregistrer.`;
  return { draft, candidates, message, ready: draft.hasTime && candidates.length > 0 };
}
