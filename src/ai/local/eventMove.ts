import { foldVoice } from './safeGroceryEntities.ts';
import { readHouseholdSchedule } from './householdLabDates.ts';
import { readFrenchNumber } from './frenchVoiceNumbers.ts';

export type PilotEvent = { id: string; title: string; date_time: string | null; time: string | null; member_id: string | null; done: boolean | null };
export type MoveRequest = { date?: string; search: string; minutes: number };
export function parseEventMove(raw: string, now: number, timezone: string): MoveRequest | null {
  const text = foldVoice(raw).replace(/[’]/g, "'").trim();
  const match = text.match(/^(decale|reporte|avance|deplace)\s+(.+?)\s+de\s+(.+?)\s+(minutes?|min|heures?)\s*[.!?]*$/);
  if (!match || /\b(?:si|sauf|pas|puis|euros?|budget|seulement)\b/.test(text)) return null;
  const amount = readFrenchNumber(match[3]);
  const minutes = amount.value * (/^heure/.test(match[4]) ? 60 : 1) * (match[1] === 'avance' ? -1 : 1);
  if (!amount.explicit || amount.rest || !Number.isInteger(minutes) || Math.abs(minutes) < 1 || Math.abs(minutes) > 720) return null;
  const schedule = readHouseholdSchedule(match[2], now, timezone);
  if (schedule.error) return null;
  const search = match[2].replace(/\b(?:le|la|les|mon|ma|mes|rendez-vous|rendez vous|rdv|evenement|de|du|demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|prochain)\b/g, ' ').replace(/\s+/g, ' ').trim();
  return { date: schedule.date, search, minutes };
}
export function eventMoveCandidates(events: PilotEvent[], request: MoveRequest) {
  return events.filter(event => !event.done && (!request.date || event.date_time?.slice(0, 10) === request.date) && (!request.search || foldVoice(event.title).includes(request.search)));
}
export function movedTime(event: PilotEvent, minutes: number): string | null {
  if (!/^\d{2}:\d{2}$/.test(event.time || '') || !/^\d{4}-\d{2}-\d{2}$/.test(event.date_time || '')) return null;
  const [h, m] = event.time!.split(':').map(Number); const next = h * 60 + m + minutes;
  return h < 24 && m < 60 && next >= 0 && next < 1440 ? `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}` : null;
}
