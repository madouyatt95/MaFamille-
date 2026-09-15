import { getSupabaseClient } from '../utils/supabase';
import { loadWorkspaceIdentity } from './familyWorkspaceService';
import { pilotScope, type PilotGroceryRow } from '../ai/local/voicePilot';
import type { PilotEvent } from '../ai/local/eventMove';
import type { EventMember } from '../ai/local/eventMoveDialogue';

export type PilotSnapshot = { scope: string; foyerId: string; memberId: string; loadedAt: number; groceries: PilotGroceryRow[]; events: PilotEvent[]; external: Record<string, unknown>[]; members?: EventMember[] };
export async function loadVoicePilot(foyerId: string, memberId: string): Promise<PilotSnapshot> {
  const client = getSupabaseClient(); if (!client) throw new Error('Connexion indisponible.');
  const identity = (await loadWorkspaceIdentity()).find(row => row.foyerId === foyerId && row.id === memberId && row.parent);
  const { data: { user } } = await client.auth.getUser();
  if (!identity || !user || localStorage.getItem('mf_active_member_id') !== memberId) throw new Error('Le mode d’essai nécessite votre propre profil parent connecté.');
  const check = await client.rpc('voice_pilot_available', { p_foyer: foyerId, p_member: memberId });
  if (check.error || check.data !== true) throw new Error('Mode d’essai indisponible : la migration du parseur doit être appliquée au serveur. Le micro actuel reste disponible.');
  const groceries = await client.from('groceries').select('id,name,category,quantity,checked').eq('foyer_id', foyerId).order('id').limit(201);
  const events = await client.from('events').select('id,title,date_time,time,member_id,done').eq('foyer_id', foyerId).order('id').limit(501);
  const external = await client.from('external_calendar_events').select('id,title,start_at,end_at,is_all_day,member_id').eq('foyer_id', foyerId).order('id').limit(501);
  const members = await client.from('foyer_members').select('id,display_name').eq('foyer_id', foyerId).eq('approved', true).order('id').limit(101);
  if (members.error || !members.data || members.data.length > 100) throw new Error('Membres du foyer indisponibles. Réessayez sans changer de profil.');
  if (groceries.error || events.error || external.error || !groceries.data || !events.data || !external.data || groceries.data.length > 200 || events.data.length > 500 || external.data.length > 500) throw new Error('Contexte incomplet ou trop volumineux pour cet essai. Utilisez les modules habituels.');
  return { scope: pilotScope(user.id, foyerId, memberId), foyerId, memberId, loadedAt: Date.now(), groceries: groceries.data, events: events.data, external: external.data, members: members.data };
}
export async function commitVoicePilot(snapshot: PilotSnapshot, id: string, action: { kind: 'groceries'; after: PilotGroceryRow[] } | { kind: 'event'; eventId: string; time: string; durations: Record<string, number>; timezone: string }) {
  const client = getSupabaseClient(); if (!client) throw new Error('Connexion indisponible.');
  const { data: { user } } = await client.auth.getUser();
  if (!user || pilotScope(user.id, snapshot.foyerId, snapshot.memberId) !== snapshot.scope || localStorage.getItem('mf_active_member_id') !== snapshot.memberId || Date.now() - snapshot.loadedAt > 120000) throw new Error('Le contexte a changé ou expiré. Rechargez avant de confirmer.');
  const { data, error } = await client.rpc('commit_voice_pilot', { p_foyer: snapshot.foyerId, p_member: snapshot.memberId, p_id: id, p_expires: new Date(snapshot.loadedAt + 120000).toISOString(), p_before: action.kind === 'groceries' ? snapshot.groceries : { events: snapshot.events, external: snapshot.external }, p_action: action });
  if (error) throw new Error(error.message.includes('conflict') ? 'La liste, les droits ou l’agenda ont changé, ou un créneau est occupé. Rechargez avant de réessayer.' : 'Enregistrement non confirmé. Rechargez pour vérifier le résultat avant de recommencer.');
  if (data !== true) throw new Error('Enregistrement non confirmé.');
}
