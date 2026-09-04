import * as chrono from 'chrono-node/fr';
import { validDate, validTime } from './householdLabData.ts';
import { foldVoice } from './safeGroceryEntities.ts';

export const dayInZone = (now: number, timezone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const shiftDay = (day: string, delta: number) => new Date(Date.parse(day + 'T12:00:00Z') + delta * 86400000).toISOString().slice(0, 10);
export function readHouseholdSchedule(text: string, now: number, timezone: string) {
  const today = dayInZone(now, timezone);
  const input = foldVoice(text).replace(/(\d)\s+h\b/g, '$1h');
  const parsed = chrono.parse(input.replace(/\bpendant \d+ (?:minutes?|min|heures?)\b/g, ''), { instant: new Date(today + 'T12:00:00Z'), timezone: 0 }, { forwardDate: true });
  const dated = parsed.filter(value => value.start.isCertain('day') || value.start.isCertain('weekday'));
  if (dated.length > 1 || dated.some(value => value.end)) return { error: 'Indiquez une seule date, sans plage de plusieurs jours.' };
  const start = dated[0]?.start;
  const date = start ? `${start.get('year')}-${String(start.get('month')).padStart(2, '0')}-${String(start.get('day')).padStart(2, '0')}` : undefined;
  const times = [...input.matchAll(/\b(\d{1,2})\s*(?:h(?:eures?)?|:)\s*(\d{2})?\b/g)];
  if (times.length > 1) return { error: 'Indiquez une seule heure précise.' };
  const time = times[0] ? `${times[0][1].padStart(2, '0')}:${times[0][2] || '00'}` : /\bmidi\b/.test(input) && !/apres[ -]midi/.test(input) ? '12:00' : /\bminuit\b/.test(input) ? '00:00' : undefined;
  if (date && (!validDate(date) || date < today) || time && !validTime(time)) return { error: 'Choisissez une date à venir et une heure valide.' };
  const period = /apres[ -]midi/.test(input) ? 'afternoon' : /\bmatin\b/.test(input) ? 'morning' : /\bsoir\b/.test(input) ? 'evening' : undefined;
  return { date, time, period: period as 'morning' | 'afternoon' | 'evening' | undefined, error: undefined };
}
