import { getSupabaseClient } from '../utils/supabase';
import type { Foyer } from '../types';
import type { CalendarSource } from '../views/Agenda';
import type { ExternalEvent } from '../utils/icalParser';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export const syncExternalCalendarEventsForReminders = async ({
  foyer,
  activeMemberId,
  calendarSources,
  externalEvents
}: SyncExternalCalendarEventsOptions): Promise<void> => {
  if (!foyer?.id) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const sourceByName = new Map(calendarSources.map(source => [source.name, source]));
  const rows = externalEvents
    .map(event => {
      const startAt = toDateTime(event.startDate, event.startTime);
      if (!startAt) return null;

      const source = sourceByName.get(event.sourceName);
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
        raw_event: event
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('external_calendar_events')
    .upsert(rows, { onConflict: 'foyer_id,external_id' });

  if (error) {
    console.warn('[Agenda] Synchronisation serveur des rappels ICS ignorée :', error.message);
  }
};

export const deleteExternalCalendarSourceForReminders = async (
  foyer: Foyer | null,
  sourceName: string
): Promise<void> => {
  if (!foyer?.id || !sourceName.trim()) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from('external_calendar_events')
    .delete()
    .eq('foyer_id', foyer.id)
    .eq('source_name', sourceName);

  if (error) {
    console.warn('[Agenda] Suppression serveur de la source ICS ignorée :', error.message);
  }
};
