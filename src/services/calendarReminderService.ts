import { getSupabaseClient } from '../utils/supabase';
import type { Foyer } from '../types';
import type { CalendarSource } from '../views/Agenda';
import type { ExternalEvent } from '../utils/icalParser';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SYNCED_EVENTS = 2000;
const CALENDAR_SYNC_VERSION = 2;

const hashCalendarPayload = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(36)}`;
};

const getSyncWindow = () => {
  const now = new Date();
  const min = new Date(now);
  min.setMonth(min.getMonth() - 3);
  const max = new Date(now);
  max.setMonth(max.getMonth() + 18);
  return { min, max };
};

const toNullableUuid = (value?: string | null): string | null => {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
};

const toDateTime = (date?: string, time?: string): string | null => {
  if (!date) return null;
  const candidate = new Date(`${date}T${time || '09:00'}:00`);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate.toISOString();
};

type SyncExternalCalendarEventsOptions = {
  foyer: Foyer | null;
  activeMemberId?: string;
  calendarSources: CalendarSource[];
  externalEvents: ExternalEvent[];
};

export type CloudCalendarState = {
  sources: CalendarSource[];
  events: ExternalEvent[];
};

const splitCloudDateTime = (value: string | null, isAllDay: boolean) => {
  if (!value) return { date: '', time: undefined as string | undefined };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: undefined as string | undefined };
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: isAllDay ? undefined : `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
  };
};

export const loadExternalCalendarStateFromCloud = async (foyerId: string): Promise<CloudCalendarState> => {
  const supabase = getSupabaseClient();
  if (!supabase || !foyerId) return { sources: [], events: [] };

  const { min, max } = getSyncWindow();
  const { data, error } = await supabase
    .from('external_calendar_events')
    .select('external_id, source_id, source_name, source_url, source_color, member_id, title, description, location, start_at, end_at, is_all_day')
    .eq('foyer_id', foyerId)
    .gte('start_at', min.toISOString())
    .lte('start_at', max.toISOString())
    .order('start_at', { ascending: true })
    .limit(MAX_SYNCED_EVENTS);

  if (error) {
    console.warn('[Agenda] Chargement des calendriers cloud ignoré :', error.message);
    return { sources: [], events: [] };
  }

  const sourceMap = new Map<string, CalendarSource>();
  const events = (data || []).map(row => {
    const sourceName = row.source_name || 'Calendrier cloud';
    const sourceId = row.source_id || `cloud-${sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
    if (!sourceMap.has(sourceId)) {
      sourceMap.set(sourceId, {
        id: sourceId,
        name: sourceName,
        url: row.source_url || 'cloud-only:',
        color: row.source_color || '#6C5CFF',
        memberId: row.member_id || undefined,
        isActive: true
      });
    }
    const start = splitCloudDateTime(row.start_at, !!row.is_all_day);
    const end = splitCloudDateTime(row.end_at, !!row.is_all_day);
    return {
      id: row.external_id,
      title: row.title || 'Sans titre',
      startDate: start.date,
      endDate: end.date || start.date,
      startTime: start.time,
      endTime: end.time,
      description: row.description || undefined,
      location: row.location || undefined,
      sourceId,
      sourceName,
      sourceColor: row.source_color || '#6C5CFF',
      memberId: row.member_id || undefined,
      isAllDay: !!row.is_all_day
    } satisfies ExternalEvent;
  }).filter(event => Boolean(event.startDate));

  return { sources: [...sourceMap.values()], events };
};

export const syncExternalCalendarEventsForReminders = async ({
  foyer,
  activeMemberId,
  calendarSources,
  externalEvents
}: SyncExternalCalendarEventsOptions): Promise<void> => {
  if (!foyer?.id) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { min, max } = getSyncWindow();
  const activeSources = calendarSources.filter(source => source.isActive);
  const sourceById = new Map(activeSources.map(source => [source.id, source]));
  const sourceByName = new Map(activeSources.map(source => [source.name, source]));

  const rows = externalEvents
    .map(event => {
      const startAt = toDateTime(event.startDate, event.startTime);
      if (!startAt) return null;

      const startDate = new Date(startAt);
      if (startDate < min || startDate > max) return null;

      const source = (event.sourceId ? sourceById.get(event.sourceId) : undefined)
        || sourceByName.get(event.sourceName);
      if (!source) return null;
      return {
        foyer_id: foyer.id,
        external_id: event.id,
        source_id: source?.id || null,
        source_name: event.sourceName,
        source_url: source?.url || null,
        source_color: event.sourceColor,
        member_id: toNullableUuid(event.memberId),
        imported_by_member_id: toNullableUuid(activeMemberId),
        title: event.title,
        description: event.description || null,
        location: event.location || null,
        start_at: startAt,
        end_at: toDateTime(event.endDate || event.startDate, event.endTime || event.startTime) || startAt,
        is_all_day: !!event.isAllDay,
        raw_event: {
          id: event.id,
          sourceName: event.sourceName,
          memberId: event.memberId || null
        }
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, MAX_SYNCED_EVENTS);

  if (rows.length === 0) return;
  const syncSignature = hashCalendarPayload(JSON.stringify(rows.map(row => [
    row.external_id,
    row.source_id,
    row.title,
    row.start_at,
    row.end_at,
    row.location,
    row.description
  ])));
  const signatureKey = `mf_calendar_reminder_signature_v${CALENDAR_SYNC_VERSION}_${foyer.id}`;
  if (localStorage.getItem(signatureKey) === syncSignature) return;

  const { error } = await supabase
    .from('external_calendar_events')
    .upsert(rows, { onConflict: 'foyer_id,external_id' });

  if (error) {
    console.warn('[Agenda] Synchronisation serveur des rappels ICS ignorée :', error.message);
    return;
  }
  localStorage.setItem(signatureKey, syncSignature);
};

export const deleteExternalCalendarSourceForReminders = async (
  foyer: Foyer | null,
  source: Pick<CalendarSource, 'id' | 'name'>
): Promise<boolean> => {
  if (!foyer?.id || !source.name.trim()) return false;

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error: sourceIdError } = await supabase
    .from('external_calendar_events')
    .delete()
    .eq('foyer_id', foyer.id)
    .eq('source_id', source.id);

  if (sourceIdError) {
    console.warn('[Agenda] Suppression serveur de la source ICS ignorée :', sourceIdError.message);
    return false;
  }

  // Older rows may predate source_id. Limit the fallback to legacy rows so
  // two calendars sharing the same display name cannot delete each other.
  const { error: legacyError } = await supabase
    .from('external_calendar_events')
    .delete()
    .eq('foyer_id', foyer.id)
    .eq('source_name', source.name)
    .is('source_id', null);

  if (legacyError) {
    console.warn('[Agenda] Nettoyage des anciens rappels ICS ignoré :', legacyError.message);
    return false;
  }
  localStorage.removeItem(`mf_calendar_reminder_signature_v${CALENDAR_SYNC_VERSION}_${foyer.id}`);
  return true;
};
