import { getSupabaseClient } from '../utils/supabase';
import { dayInZone, shiftDay } from '../ai/local/householdLabDates';
import { normalizeExternalWorkspaceEvent, validWorkspaceRecord, type WorkspaceEvent, type WorkspaceRecord, type WorkspaceSnapshot, type WorkspaceSource, type SourceState } from '../ai/local/familyWorkspace';

type Row = Record<string, unknown>;
const str = (value: unknown) => typeof value === 'string' ? value : '';
const strings = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((entry): entry is Row => entry !== null && typeof entry === 'object') : [];
const audience = (value: unknown) => !value || value === 'all' || value === 'family' ? null : str(value);
const requiredClient = () => { const client = getSupabaseClient(); if (!client) throw new Error('Connexion au foyer indisponible.'); return client; };

export async function loadWorkspaceIdentity() {
  const client = requiredClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error('Connectez-vous à MyFamily+ pour consulter votre foyer.');
  const result = await client.from('foyer_members').select('id, foyer_id, display_name, role, approved').eq('user_id', user.id).eq('approved', true);
  if (result.error) throw new Error('Impossible de vérifier votre appartenance au foyer.');
  return rows(result.data).map(row => ({ id: str(row.id), foyerId: str(row.foyer_id), name: str(row.display_name), parent: ['admin', 'parent'].includes(str(row.role)) }));
}

export async function loadWorkspace(foyerId: string, actorId: string): Promise<WorkspaceSnapshot> {
  const client = requiredClient();
  const identities = await loadWorkspaceIdentity();
  const actor = identities.find(member => member.id === actorId && member.foyerId === foyerId);
  if (!actor) throw new Error('Ce profil ne correspond pas au compte connecté.');
  const selected = localStorage.getItem('mf_active_member_id');
  if (selected && selected !== actor.id && selected !== '1') throw new Error('Revenez à votre profil personnel dans MyFamily+ avant de charger ce contexte.');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const start = dayInZone(Date.now(), timezone), end = shiftDay(start, 90);
  const membersResult = await client.from('foyer_members').select('id, display_name').eq('foyer_id', foyerId).eq('approved', true);
  if (membersResult.error) throw new Error('Liste des membres indisponible.');
  const members = rows(membersResult.data).filter(row => actor.parent || row.id === actor.id).map(row => ({ id: str(row.id), name: str(row.display_name) }));
  const visible = (memberId: string | null) => actor.parent || memberId === null || memberId === actor.id;
  const restrict = <T extends { or: (filter: string) => T }>(query: T, column: string) => actor.parent ? query : query.or(`${column}.is.null,${column}.eq.all,${column}.eq.${actor.id}`);
  const floor = `${shiftDay(start, -1)}T00:00:00Z`;
  const overlapsRange = `end_at.gte.${floor},and(end_at.is.null,start_at.gte.${floor})`;
  const externalQuery = client.from('external_calendar_events').select('id, title, member_id, start_at, end_at, is_all_day').eq('foyer_id', foyerId).or(actor.parent ? overlapsRange : `and(or(${overlapsRange}),or(member_id.is.null,member_id.eq.${actor.id}))`).lt('start_at', `${shiftDay(end, 1)}T23:59:59Z`).order('start_at').limit(201);
  const results = await Promise.all([
    restrict(client.from('events').select('id, title, member_id, date_time, time, done').eq('foyer_id', foyerId).eq('done', false).gte('date_time', shiftDay(start, -1)).lte('date_time', `${shiftDay(end, 1)}T23:59:59`).order('date_time').limit(201), 'member_id'),
    externalQuery,
    client.from('family_recipes').select('id, title, servings, uses, missing, prep_steps, updated_at').eq('foyer_id', foyerId).order('updated_at', { ascending: false }).limit(101),
    client.from('groceries').select('id, name, quantity, checked, in_stock').eq('foyer_id', foyerId).order('created_at', { ascending: false }).limit(201),
    restrict(client.from('chore_tasks').select('id, title, assigned_member_id, due_date, done').eq('foyer_id', foyerId).eq('done', false).gte('due_date', start).lte('due_date', end).order('due_date').limit(201), 'assigned_member_id'),
  ]);
  const keys: WorkspaceSource[] = ['agenda', 'external', 'recipes', 'groceries', 'tasks'];
  const sources = {} as Record<WorkspaceSource, SourceState>;
  results.forEach((result, index) => { sources[keys[index]] = { state: result.error ? 'unavailable' : rows(result.data).length > (index === 2 ? 100 : 200) ? 'limited' : 'ready', count: rows(result.data).length }; });
  const localTime = (instant: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant);
  const events: WorkspaceEvent[] = rows(results[0].data).filter(row => visible(audience(row.member_id))).map(row => {
    const raw = str(row.date_time), instant = new Date(raw), valid = Number.isFinite(instant.getTime());
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
    return { id: str(row.id), title: str(row.title), memberId: audience(row.member_id), date: hasZone && valid ? dayInZone(instant.getTime(), timezone) : raw.slice(0, 10), time: /^\d{2}:\d{2}$/.test(str(row.time)) ? str(row.time) : raw.includes('T') && valid ? localTime(instant) : null, duration: null, source: 'agenda', allDay: false };
  });
  for (const row of rows(results[1].data)) {
    if (visible(audience(row.member_id))) events.push(...normalizeExternalWorkspaceEvent({ id: str(row.id), title: str(row.title), memberId: audience(row.member_id), start: str(row.start_at), end: str(row.end_at), allDay: Boolean(row.is_all_day) }, { start, end }, timezone));
  }
  return {
    foyerId, actorId, actorName: actor.name, parent: actor.parent, fetchedAt: Date.now(), timezone, range: { start, end }, members,
    events: events.filter(event => event.date >= start && event.date <= end), sources,
    recipes: rows(results[2].data).slice(0, 100).map(row => ({ id: str(row.id), title: str(row.title), servings: typeof row.servings === 'number' && row.servings > 0 ? row.servings : null, ingredients: [...strings(row.uses), ...strings(row.missing)], steps: strings(row.prep_steps), updatedAt: str(row.updated_at) })),
    groceries: rows(results[3].data).slice(0, 200).map(row => ({ id: str(row.id), name: str(row.name), quantity: str(row.quantity), checked: Boolean(row.checked), inStock: Boolean(row.in_stock) })),
    tasks: rows(results[4].data).filter(row => visible(audience(row.assigned_member_id))).slice(0, 200).map(row => ({ id: str(row.id), title: str(row.title), dueDate: str(row.due_date), memberId: audience(row.assigned_member_id), done: Boolean(row.done) })),
  };
}

export async function loadWorkspaceRecords(foyerId: string): Promise<WorkspaceRecord[]> {
  const { data, error } = await requiredClient().from('assistant_workspace_records').select('id, kind, title, audience, owner_member_id, revision, payload, updated_at').eq('foyer_id', foyerId).order('updated_at', { ascending: false }).limit(200);
  if (error) throw new Error('La synchronisation des préférences et préparations est indisponible. La migration Assistant doit être appliquée sur Supabase.');
  if (!Array.isArray(data) || data.some(record => !validWorkspaceRecord(record))) throw new Error('Une préparation enregistrée est invalide. Rien n’a été chargé.');
  return data as WorkspaceRecord[];
}
export async function saveWorkspaceRecord(foyerId: string, record: Omit<WorkspaceRecord, 'updated_at'>): Promise<WorkspaceRecord> {
  const { data, error } = await requiredClient().rpc('save_assistant_workspace_record', { p_foyer_id: foyerId, p_id: record.id, p_kind: record.kind, p_title: record.title, p_audience: record.audience, p_payload: record.payload, p_revision: record.revision });
  if (error) throw new Error(error.message.includes('revision') ? 'Cette préparation a changé sur un autre appareil. Actualisez avant de la modifier.' : 'Enregistrement refusé ou indisponible. Vos changements ne sont pas synchronisés.');
  if (!validWorkspaceRecord(data)) throw new Error('La réponse de synchronisation est invalide. Actualisez avant de réessayer.');
  return data;
}
export async function deleteWorkspaceRecord(foyerId: string, record: WorkspaceRecord) {
  const { error } = await requiredClient().rpc('delete_assistant_workspace_record', { p_foyer_id: foyerId, p_id: record.id, p_revision: record.revision });
  if (error) throw new Error('Suppression impossible : actualisez et vérifiez vos droits.');
}
