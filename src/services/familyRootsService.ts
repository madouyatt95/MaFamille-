import type { Member } from '../types';
import { getSupabaseClient } from '../utils/supabase';
import { DEMO_PROFILES, DEMO_RELATIONSHIPS, DEMO_EVENTS, DEMO_MEMORIES } from '../utils/familyRootsDemoData';

export type FamilyBranch = 'proche' | 'paternelle' | 'maternelle' | 'autre';
export type FamilyProfileVisibility = 'prive' | 'famille' | 'masque';
export type FamilyRelationshipType = 'parent' | 'enfant' | 'fratrie' | 'cousin' | 'conjoint' | 'oncle_tante' | 'neveu_niece' | 'grand_parent' | 'petit_enfant' | 'famille';

export type FamilyTreeProfile = {
  id: string;
  foyerId: string;
  memberId?: string;
  displayName: string;
  birthDate?: string;
  branch: FamilyBranch;
  country?: string;
  originCity?: string;
  nickname?: string;
  bio?: string;
  languages: string[];
  isMinor: boolean;
  visibility: FamilyProfileVisibility;
  isLocal: boolean;
  photoUrl?: string;
  isMemorial: boolean;
  deathDate?: string;
  sharedFields: string[];
};

export type FamilyTreeConnection = {
  id: string;
  requesterFoyerId: string;
  targetFoyerId: string;
  requesterProfileId: string;
  targetProfileId?: string;
  relationshipType: FamilyRelationshipType;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  createdAt: string;
  confirmedAt?: string;
  direction: 'incoming' | 'outgoing';
};

export type FamilyTreeRelationship = {
  id: string;
  foyerId: string;
  sourceProfileId: string;
  targetProfileId: string;
  relationshipType: FamilyRelationshipType;
};

export type FamilyTreeIdentityRequest = {
  id: string;
  requesterFoyerId: string;
  targetFoyerId: string;
  sourceProfileId: string;
  targetProfileId: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  direction: 'incoming' | 'outgoing';
  createdAt: string;
};

export type FamilyTreeEvent = {
  id: string;
  foyerId: string;
  profileId?: string;
  eventType: 'anniversaire' | 'mariage' | 'deces' | 'reunion' | 'autre';
  title: string;
  eventDate: string;
  repeatsYearly: boolean;
  visibility: 'prive' | 'famille';
  agendaEventId?: string;
  generated?: boolean;
};

export type FamilyTreeMemory = {
  id: string;
  foyerId: string;
  profileId: string;
  title: string;
  note: string;
  memoryDate?: string;
  photoUrl?: string;
  visibility: 'prive' | 'famille';
  createdAt: string;
};

export type FamilyTreeCorrectionRequest = {
  id: string;
  foyerId: string;
  profileId: string;
  fieldName: string;
  currentValue?: string;
  proposedValue: string;
  note?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
};

export type FamilyTreeValidationLog = {
  id: string;
  foyerId: string;
  action: string;
  summary: string;
  createdAt: string;
};

export type FamilyRootsSnapshot = {
  shareCode?: string;
  shareCodeExpiresAt?: string;
  profiles: FamilyTreeProfile[];
  relationships: FamilyTreeRelationship[];
  connections: FamilyTreeConnection[];
  identityRequests: FamilyTreeIdentityRequest[];
  events: FamilyTreeEvent[];
  memories: FamilyTreeMemory[];
  corrections: FamilyTreeCorrectionRequest[];
  validationLogs: FamilyTreeValidationLog[];
  cloudEnabled: boolean;
};

type ProfileRow = {
  id: string;
  foyer_id: string;
  member_id?: string | null;
  display_name: string;
  birth_date?: string | null;
  branch: FamilyBranch;
  country?: string | null;
  origin_city?: string | null;
  nickname?: string | null;
  bio?: string | null;
  languages?: string[] | null;
  photo_url?: string | null;
  is_memorial?: boolean | null;
  death_date?: string | null;
  is_minor: boolean;
  visibility: FamilyProfileVisibility;
  shared_fields?: string[] | null;
};

type ConnectionRow = {
  id: string;
  requester_foyer_id: string;
  target_foyer_id: string;
  requester_profile_id: string;
  target_profile_id?: string | null;
  relationship_type: FamilyRelationshipType;
  status: FamilyTreeConnection['status'];
  created_at: string;
  confirmed_at?: string | null;
};

type RelationshipRow = {
  id: string;
  foyer_id: string;
  source_profile_id: string;
  target_profile_id: string;
  relationship_type: FamilyTreeRelationship['relationshipType'];
};

type EventRow = {
  id: string;
  foyer_id: string;
  profile_id?: string | null;
  event_type: FamilyTreeEvent['eventType'];
  title: string;
  event_date: string;
  repeats_yearly: boolean;
  visibility: FamilyTreeEvent['visibility'];
  agenda_event_id?: string | null;
};

type IdentityRow = {
  id: string;
  requester_foyer_id: string;
  target_foyer_id: string;
  source_profile_id: string;
  target_profile_id: string;
  status: FamilyTreeIdentityRequest['status'];
  created_at: string;
};

type MemoryRow = {
  id: string;
  foyer_id: string;
  profile_id: string;
  title: string;
  note: string;
  memory_date?: string | null;
  photo_url?: string | null;
  visibility: FamilyTreeMemory['visibility'];
  created_at: string;
};

type CorrectionRow = {
  id: string;
  foyer_id: string;
  profile_id: string;
  field_name: string;
  current_value?: string | null;
  proposed_value: string;
  note?: string | null;
  status: FamilyTreeCorrectionRequest['status'];
  created_at: string;
};

type ValidationLogRow = {
  id: string;
  foyer_id: string;
  action: string;
  summary: string;
  created_at: string;
};

const localProfileKey = (foyerId: string) => `mf_family_roots_profiles_${foyerId}`;
const tableMissing = (error: { message?: string; code?: string } | null) => {
  const value = `${error?.message || ''} ${error?.code || ''}`.toLowerCase();
  return value.includes('family_tree_') || value.includes('pgrst205') || value.includes('42p01');
};

const ageFromMember = (member: Member): number | null => {
  if (member.birthDate) {
    const birth = new Date(member.birthDate);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
      return age;
    }
  }
  const parsed = Number.parseInt(member.age || '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const localProfilesFromMembers = (foyerId: string, members: Member[]): FamilyTreeProfile[] => {
  let saved: Record<string, Partial<FamilyTreeProfile>> = {};
  try {
    saved = JSON.parse(localStorage.getItem(localProfileKey(foyerId)) || '{}');
  } catch {
    saved = {};
  }
  return members.filter(member => member.approved !== false).map(member => {
    const age = ageFromMember(member);
    const stored = saved[member.id] || {};
    return {
      id: stored.id || `local-${member.id}`,
      foyerId,
      memberId: member.id,
      displayName: member.name,
      birthDate: member.birthDate || undefined,
      branch: stored.branch || 'proche',
      country: stored.country || undefined,
      originCity: stored.originCity || undefined,
      nickname: stored.nickname || undefined,
      bio: stored.bio || undefined,
      languages: stored.languages || [],
      isMinor: age !== null && age < 18,
      visibility: stored.visibility || (age !== null && age < 18 ? 'prive' : 'famille'),
      isLocal: true,
      photoUrl: member.photoUrl,
      isMemorial: stored.isMemorial || false,
      deathDate: stored.deathDate || undefined,
      sharedFields: stored.sharedFields || (age !== null && age < 18 ? ['display_name', 'nickname'] : ['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url', 'bio', 'languages'])
    };
  });
};

const mapProfile = (row: ProfileRow, activeFoyerId: string, members: Member[]): FamilyTreeProfile => {
  const member = members.find(item => item.id === row.member_id);
  return {
    id: row.id,
    foyerId: row.foyer_id,
    memberId: row.member_id || undefined,
    displayName: row.display_name,
    birthDate: row.birth_date || undefined,
    branch: row.branch,
    country: row.country || undefined,
    originCity: row.origin_city || undefined,
    nickname: row.nickname || undefined,
    bio: row.bio || undefined,
    languages: row.languages || [],
    isMinor: row.is_minor,
    visibility: row.visibility,
    isLocal: row.foyer_id === activeFoyerId,
    photoUrl: row.foyer_id === activeFoyerId ? (row.photo_url || member?.photoUrl) : row.photo_url || undefined,
    isMemorial: row.is_memorial || false,
    deathDate: row.death_date || undefined,
    sharedFields: row.shared_fields || []
  };
};

const generatedBirthdayEvents = (profiles: FamilyTreeProfile[]): FamilyTreeEvent[] => profiles
  .filter(profile => profile.birthDate && profile.visibility !== 'masque')
  .map(profile => ({
    id: `birthday-${profile.id}`,
    foyerId: profile.foyerId,
    profileId: profile.id,
    eventType: 'anniversaire',
    title: `Anniversaire de ${profile.displayName}`,
    eventDate: profile.birthDate as string,
    repeatsYearly: true,
    visibility: profile.visibility === 'prive' ? 'prive' : 'famille',
    generated: true
  }));

const persistLocalProfile = (foyerId: string, profile: FamilyTreeProfile) => {
  if (!profile.memberId) return;
  const saved: Record<string, Partial<FamilyTreeProfile>> = (() => {
    try { return JSON.parse(localStorage.getItem(localProfileKey(foyerId)) || '{}'); } catch { return {}; }
  })();
  saved[profile.memberId] = {
    id: profile.id,
    branch: profile.branch,
    country: profile.country,
    originCity: profile.originCity,
    nickname: profile.nickname,
    bio: profile.bio,
    languages: profile.languages,
    visibility: profile.visibility,
    isMemorial: profile.isMemorial,
    deathDate: profile.deathDate,
    sharedFields: profile.sharedFields
  };
  localStorage.setItem(localProfileKey(foyerId), JSON.stringify(saved));
};

const buildDemoSnapshot = (foyerId: string): FamilyRootsSnapshot => {
  const demoProfilesMapped = DEMO_PROFILES.map(p => ({
    id: p.id,
    foyerId: foyerId,
    displayName: p.displayName,
    nickname: p.nickname,
    birthDate: p.birthDate,
    deathDate: p.deathDate,
    isMemorial: p.isMemorial,
    branch: p.branch,
    country: p.country,
    originCity: p.originCity,
    languages: p.languages,
    isMinor: p.isMinor,
    visibility: p.visibility,
    photoUrl: p.photoUrl,
    bio: p.bio,
    isLocal: true,
    sharedFields: p.isMinor ? ['display_name', 'nickname'] : ['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url', 'bio', 'languages']
  }));
  const demoRelationshipsMapped = DEMO_RELATIONSHIPS.map(r => ({
    id: r.id,
    foyerId: foyerId,
    sourceProfileId: r.sourceProfileId,
    targetProfileId: r.targetProfileId,
    relationshipType: r.relationshipType
  }));
  const demoEventsMapped = DEMO_EVENTS.map(e => ({
    id: e.id,
    foyerId: foyerId,
    eventType: e.eventType,
    title: e.title,
    eventDate: e.eventDate,
    repeatsYearly: e.repeatsYearly,
    visibility: e.visibility
  }));
  const demoMemoriesMapped = DEMO_MEMORIES.map(m => ({
    id: m.id,
    foyerId: foyerId,
    profileId: m.profileId,
    title: m.title,
    note: m.note,
    memoryDate: m.memoryDate,
    photoUrl: m.photoUrl,
    visibility: m.visibility,
    createdAt: new Date().toISOString()
  }));

  return {
    shareCode: 'RAC-DEMO12',
    shareCodeExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    profiles: demoProfilesMapped,
    relationships: demoRelationshipsMapped,
    connections: [],
    identityRequests: [],
    events: [...generatedBirthdayEvents(demoProfilesMapped), ...demoEventsMapped],
    memories: demoMemoriesMapped,
    corrections: [],
    validationLogs: [],
    cloudEnabled: false
  };
};

export const familyRootsService = {
  async load(foyerId: string, members: Member[], canManage: boolean): Promise<FamilyRootsSnapshot> {
    const fallbackProfiles = localProfilesFromMembers(foyerId, members);
    const client = getSupabaseClient();
    if (!client || !foyerId || foyerId === 'local') {
      return buildDemoSnapshot(foyerId || 'local');
    }

    const settingsResult = await client
      .from('family_tree_settings')
      .select('share_code, share_code_expires_at')
      .eq('foyer_id', foyerId)
      .maybeSingle();

    if (settingsResult.error && tableMissing(settingsResult.error)) {
      return buildDemoSnapshot(foyerId);
    }
    if (settingsResult.error) throw settingsResult.error;

    let shareCode = settingsResult.data?.share_code as string | undefined;
    let shareCodeExpiresAt = settingsResult.data?.share_code_expires_at as string | undefined;
    if (!shareCode && canManage) {
      const codeResult = await client.rpc('regenerate_family_tree_code', { p_foyer_id: foyerId });
      if (codeResult.error) throw codeResult.error;
      shareCode = codeResult.data as string;
      shareCodeExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    }

    const ownProfilesResult = await client
      .from('family_tree_profiles')
      .select('id, foyer_id, member_id, display_name, birth_date, branch, country, origin_city, nickname, bio, languages, photo_url, is_memorial, death_date, is_minor, visibility, shared_fields')
      .eq('foyer_id', foyerId)
      .limit(80);
    if (ownProfilesResult.error) throw ownProfilesResult.error;

    let existingRows = (ownProfilesResult.data || []) as ProfileRow[];

    if (existingRows.length === 0 && canManage) {
      try {
        // Seed settings
        await client.from('family_tree_settings').insert({
          foyer_id: foyerId,
          share_code: 'RAC-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          enabled: true,
          share_code_expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
        });

        // Seed profiles
        await client.from('family_tree_profiles').insert(
          DEMO_PROFILES.map(p => ({
            id: p.id,
            foyer_id: foyerId,
            display_name: p.displayName,
            nickname: p.nickname,
            birth_date: p.birthDate,
            death_date: p.deathDate,
            is_memorial: p.isMemorial,
            branch: p.branch,
            country: p.country,
            origin_city: p.originCity,
            languages: p.languages,
            is_minor: p.isMinor,
            visibility: p.visibility,
            photo_url: p.photoUrl,
            bio: p.bio,
            shared_fields: p.isMinor ? ['display_name', 'nickname'] : ['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url', 'bio', 'languages']
          }))
        );

        // Seed relationships
        await client.from('family_tree_relationships').insert(
          DEMO_RELATIONSHIPS.map(r => ({
            id: r.id,
            foyer_id: foyerId,
            source_profile_id: r.sourceProfileId,
            target_profile_id: r.targetProfileId,
            relationship_type: r.relationshipType
          }))
        );

        // Seed events
        await client.from('family_tree_events').insert(
          DEMO_EVENTS.map(e => ({
            id: e.id,
            foyer_id: foyerId,
            event_type: e.eventType,
            title: e.title,
            event_date: e.eventDate,
            repeats_yearly: e.repeatsYearly,
            visibility: e.visibility
          }))
        );

        // Seed memories
        await client.from('family_tree_memories').insert(
          DEMO_MEMORIES.map(m => ({
            id: m.id,
            foyer_id: foyerId,
            profile_id: m.profileId,
            title: m.title,
            note: m.note,
            memory_date: m.memoryDate,
            photo_url: m.photoUrl,
            visibility: m.visibility
          }))
        );

        // Refetch
        const refetch = await client
          .from('family_tree_profiles')
          .select('id, foyer_id, member_id, display_name, birth_date, branch, country, origin_city, nickname, bio, languages, photo_url, is_memorial, death_date, is_minor, visibility, shared_fields')
          .eq('foyer_id', foyerId)
          .limit(80);
        if (!refetch.error) {
          existingRows = (refetch.data || []) as ProfileRow[];
        }
      } catch (err) {
        console.error('Failed to seed family tree:', err);
      }
    }

    if (existingRows.length === 0) {
      const snap = buildDemoSnapshot(foyerId);
      snap.cloudEnabled = true;
      if (shareCode) {
        snap.shareCode = shareCode;
        snap.shareCodeExpiresAt = shareCodeExpiresAt;
      }
      return snap;
    }
    if (canManage) {
      const existingMemberIds = new Set(existingRows.map(row => row.member_id).filter(Boolean));
      const missing = fallbackProfiles.filter(profile => profile.memberId && !existingMemberIds.has(profile.memberId));
      if (missing.length) {
        const insertResult = await client.from('family_tree_profiles').insert(missing.map(profile => ({
          foyer_id: foyerId,
          member_id: profile.memberId,
          display_name: profile.displayName,
          birth_date: profile.birthDate || null,
          branch: profile.branch,
          country: profile.country || null,
          is_minor: profile.isMinor,
          visibility: profile.visibility
        }))).select('id, foyer_id, member_id, display_name, birth_date, branch, country, origin_city, nickname, bio, languages, photo_url, is_memorial, death_date, is_minor, visibility, shared_fields');
        if (insertResult.error) throw insertResult.error;
        existingRows.push(...((insertResult.data || []) as ProfileRow[]));
      }
    }

    const connectionsResult = await client
      .from('family_tree_connections')
      .select('id, requester_foyer_id, target_foyer_id, requester_profile_id, target_profile_id, relationship_type, status, created_at, confirmed_at')
      .or(`requester_foyer_id.eq.${foyerId},target_foyer_id.eq.${foyerId}`)
      .in('status', ['pending', 'confirmed'])
      .order('updated_at', { ascending: false })
      .limit(30);
    if (connectionsResult.error) throw connectionsResult.error;

    const connectionRows = (connectionsResult.data || []) as ConnectionRow[];
    const remoteFoyerIds = [...new Set(connectionRows
      .filter(row => row.status === 'confirmed')
      .map(row => row.requester_foyer_id === foyerId ? row.target_foyer_id : row.requester_foyer_id))];

    let remoteRows: ProfileRow[] = [];
    if (remoteFoyerIds.length) {
      const filteredRemote = await client.rpc('get_family_tree_visible_profiles', { p_viewer_foyer_id: foyerId });
      if (filteredRemote.error && tableMissing(filteredRemote.error)) {
        const remoteResult = await client
          .from('family_tree_profiles')
          .select('id, foyer_id, member_id, display_name, birth_date, branch, country, origin_city, nickname, bio, languages, photo_url, is_memorial, death_date, is_minor, visibility, shared_fields')
          .in('foyer_id', remoteFoyerIds)
          .eq('visibility', 'famille')
          .limit(160);
        if (remoteResult.error) throw remoteResult.error;
        remoteRows = (remoteResult.data || []) as ProfileRow[];
      } else {
        if (filteredRemote.error) throw filteredRemote.error;
        remoteRows = (filteredRemote.data || []) as ProfileRow[];
      }
    }

    const profiles = [...existingRows, ...remoteRows].map(row => mapProfile(row, foyerId, members));
    const connections = connectionRows.map(row => ({
      id: row.id,
      requesterFoyerId: row.requester_foyer_id,
      targetFoyerId: row.target_foyer_id,
      requesterProfileId: row.requester_profile_id,
      targetProfileId: row.target_profile_id || undefined,
      relationshipType: row.relationship_type,
      status: row.status,
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at || undefined,
      direction: row.target_foyer_id === foyerId ? 'incoming' as const : 'outgoing' as const
    }));

    const visibleFoyerIds = [foyerId, ...remoteFoyerIds];
    const relationshipsResult = await client
      .from('family_tree_relationships')
      .select('id, foyer_id, source_profile_id, target_profile_id, relationship_type')
      .in('foyer_id', visibleFoyerIds)
      .order('created_at', { ascending: true })
      .limit(300);
    if (relationshipsResult.error) throw relationshipsResult.error;

    const eventsResult = await client
      .from('family_tree_events')
      .select('id, foyer_id, profile_id, event_type, title, event_date, repeats_yearly, visibility, agenda_event_id')
      .in('foyer_id', visibleFoyerIds)
      .order('event_date', { ascending: true })
      .limit(100);
    if (eventsResult.error) throw eventsResult.error;
    const events = (eventsResult.data || []).map((row: EventRow) => ({
      id: row.id,
      foyerId: row.foyer_id,
      profileId: row.profile_id || undefined,
      eventType: row.event_type,
      title: row.title,
      eventDate: row.event_date,
      repeatsYearly: row.repeats_yearly,
      visibility: row.visibility,
      agendaEventId: row.agenda_event_id || undefined
    }));

    const identityResult = await client
      .from('family_tree_identity_requests')
      .select('id, requester_foyer_id, target_foyer_id, source_profile_id, target_profile_id, status, created_at')
      .or(`requester_foyer_id.eq.${foyerId},target_foyer_id.eq.${foyerId}`)
      .in('status', ['pending', 'confirmed'])
      .order('updated_at', { ascending: false })
      .limit(40);
    const identityRows = identityResult.error && tableMissing(identityResult.error)
      ? []
      : (identityResult.data || []) as IdentityRow[];
    if (identityResult.error && !tableMissing(identityResult.error)) throw identityResult.error;
    const identityRequests = identityRows.map(row => ({
      id: row.id,
      requesterFoyerId: row.requester_foyer_id,
      targetFoyerId: row.target_foyer_id,
      sourceProfileId: row.source_profile_id,
      targetProfileId: row.target_profile_id,
      status: row.status,
      createdAt: row.created_at,
      direction: row.target_foyer_id === foyerId ? 'incoming' as const : 'outgoing' as const
    }));

    const relationships = ((relationshipsResult.data || []) as RelationshipRow[]).map(row => ({
      id: row.id,
      foyerId: row.foyer_id,
      sourceProfileId: row.source_profile_id,
      targetProfileId: row.target_profile_id,
      relationshipType: row.relationship_type
    }));

    const memoriesResult = await client
      .from('family_tree_memories')
      .select('id, foyer_id, profile_id, title, note, memory_date, photo_url, visibility, created_at')
      .in('foyer_id', visibleFoyerIds)
      .order('created_at', { ascending: false })
      .limit(80);
    const memoryRows = memoriesResult.error && tableMissing(memoriesResult.error) ? [] : (memoriesResult.data || []) as MemoryRow[];
    if (memoriesResult.error && !tableMissing(memoriesResult.error)) throw memoriesResult.error;
    const memories = memoryRows.map(row => ({
      id: row.id,
      foyerId: row.foyer_id,
      profileId: row.profile_id,
      title: row.title,
      note: row.note,
      memoryDate: row.memory_date || undefined,
      photoUrl: row.photo_url || undefined,
      visibility: row.visibility,
      createdAt: row.created_at
    }));

    const correctionsResult = await client
      .from('family_tree_correction_requests')
      .select('id, foyer_id, profile_id, field_name, current_value, proposed_value, note, status, created_at')
      .eq('foyer_id', foyerId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(40);
    const correctionRows = correctionsResult.error && tableMissing(correctionsResult.error) ? [] : (correctionsResult.data || []) as CorrectionRow[];
    if (correctionsResult.error && !tableMissing(correctionsResult.error)) throw correctionsResult.error;
    const corrections = correctionRows.map(row => ({
      id: row.id,
      foyerId: row.foyer_id,
      profileId: row.profile_id,
      fieldName: row.field_name,
      currentValue: row.current_value || undefined,
      proposedValue: row.proposed_value,
      note: row.note || undefined,
      status: row.status,
      createdAt: row.created_at
    }));

    const logsResult = await client
      .from('family_tree_validation_logs')
      .select('id, foyer_id, action, summary, created_at')
      .eq('foyer_id', foyerId)
      .order('created_at', { ascending: false })
      .limit(30);
    const logRows = logsResult.error && tableMissing(logsResult.error) ? [] : (logsResult.data || []) as ValidationLogRow[];
    if (logsResult.error && !tableMissing(logsResult.error)) throw logsResult.error;
    const validationLogs = logRows.map(row => ({
      id: row.id,
      foyerId: row.foyer_id,
      action: row.action,
      summary: row.summary,
      createdAt: row.created_at
    }));

    return {
      shareCode,
      shareCodeExpiresAt,
      profiles,
      relationships,
      connections,
      identityRequests,
      events: [...generatedBirthdayEvents(profiles), ...events],
      memories,
      corrections,
      validationLogs,
      cloudEnabled: true
    };
  },

  async updateProfile(foyerId: string, profile: FamilyTreeProfile): Promise<void> {
    persistLocalProfile(foyerId, profile);
    const client = getSupabaseClient();
    if (!client || profile.id.startsWith('local-')) return;
    const { error } = await client.from('family_tree_profiles').update({
      display_name: profile.displayName,
      birth_date: profile.birthDate || null,
      branch: profile.branch,
      country: profile.country || null,
      origin_city: profile.originCity || null,
      nickname: profile.nickname || null,
      bio: profile.bio || null,
      languages: profile.languages,
      photo_url: profile.photoUrl || null,
      is_memorial: profile.isMemorial,
      death_date: profile.deathDate || null,
      shared_fields: profile.sharedFields,
      visibility: profile.visibility,
      updated_at: new Date().toISOString()
    }).eq('id', profile.id).eq('foyer_id', foyerId);
    if (error) throw error;
  },

  async addProfile(foyerId: string, profile: Pick<FamilyTreeProfile, 'displayName' | 'birthDate' | 'branch' | 'country' | 'originCity' | 'nickname' | 'bio' | 'languages' | 'photoUrl' | 'isMinor' | 'visibility' | 'isMemorial' | 'deathDate' | 'sharedFields'>): Promise<FamilyTreeProfile> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est nécessaire pour ajouter cette personne.');
    const { data, error } = await client.from('family_tree_profiles').insert({
      foyer_id: foyerId,
      member_id: null,
      display_name: profile.displayName,
      birth_date: profile.birthDate || null,
      branch: profile.branch,
      country: profile.country || null,
      origin_city: profile.originCity || null,
      nickname: profile.nickname || null,
      bio: profile.bio || null,
      languages: profile.languages,
      photo_url: profile.photoUrl || null,
      is_minor: profile.isMinor,
      is_memorial: profile.isMemorial,
      death_date: profile.deathDate || null,
      shared_fields: profile.sharedFields,
      visibility: profile.visibility
    }).select('id, foyer_id, member_id, display_name, birth_date, branch, country, origin_city, nickname, bio, languages, photo_url, is_memorial, death_date, is_minor, visibility, shared_fields').single();
    if (error) throw error;
    return mapProfile(data as ProfileRow, foyerId, []);
  },

  async requestConnection(foyerId: string, targetCode: string, profileId: string, relationshipType: FamilyRelationshipType): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La connexion entre foyers nécessite la synchronisation sécurisée.');
    const { error } = await client.rpc('request_family_tree_connection', {
      p_requester_foyer_id: foyerId,
      p_target_code: targetCode,
      p_requester_profile_id: profileId,
      p_relationship_type: relationshipType
    });
    if (error) throw error;
  },

  async addRelationship(foyerId: string, sourceProfileId: string, targetProfileId: string, relationshipType: FamilyTreeRelationship['relationshipType']): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est nécessaire pour enregistrer ce lien.');
    const { error } = await client.rpc('add_family_tree_relationship', {
      p_foyer_id: foyerId,
      p_source_profile_id: sourceProfileId,
      p_target_profile_id: targetProfileId,
      p_relationship_type: relationshipType
    });
    if (error) throw error;
  },

  async deleteRelationship(foyerId: string, relationshipId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client.rpc('delete_family_tree_relationship', {
      p_foyer_id: foyerId,
      p_relationship_id: relationshipId
    });
    if (error) throw error;
  },

  async respondConnection(connectionId: string, accept: boolean, targetProfileId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est indisponible.');
    const { error } = await client.rpc('respond_family_tree_connection', {
      p_connection_id: connectionId,
      p_accept: accept,
      p_target_profile_id: targetProfileId || null
    });
    if (error) throw error;
  },

  async cancelConnection(connectionId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client.rpc('cancel_family_tree_connection', { p_connection_id: connectionId });
    if (error) throw error;
  },

  async regenerateCode(foyerId: string): Promise<string> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est indisponible.');
    const { data, error } = await client.rpc('regenerate_family_tree_code', { p_foyer_id: foyerId });
    if (error) throw error;
    return data as string;
  },

  async requestIdentityLink(sourceProfileId: string, targetProfileId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est indisponible.');
    const { error } = await client.rpc('request_family_tree_identity_link', {
      p_source_profile_id: sourceProfileId,
      p_target_profile_id: targetProfileId
    });
    if (error) throw error;
  },

  async respondIdentityLink(requestId: string, accept: boolean): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est indisponible.');
    const { error } = await client.rpc('respond_family_tree_identity_link', {
      p_request_id: requestId,
      p_accept: accept
    });
    if (error) throw error;
  },

  async addEvent(foyerId: string, event: Omit<FamilyTreeEvent, 'id' | 'foyerId'>): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est nécessaire pour partager cet événement.');
    const { error } = await client.from('family_tree_events').insert({
      foyer_id: foyerId,
      profile_id: event.profileId || null,
      event_type: event.eventType,
      title: event.title,
      event_date: event.eventDate,
      repeats_yearly: event.repeatsYearly,
      visibility: event.visibility,
      agenda_event_id: event.agendaEventId || null
    });
    if (error) throw error;
  },

  async addMemory(foyerId: string, memory: Omit<FamilyTreeMemory, 'id' | 'foyerId' | 'createdAt'>): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est nécessaire pour ajouter ce souvenir.');
    const { error } = await client.from('family_tree_memories').insert({
      foyer_id: foyerId,
      profile_id: memory.profileId,
      title: memory.title,
      note: memory.note,
      memory_date: memory.memoryDate || null,
      photo_url: memory.photoUrl || null,
      visibility: memory.visibility
    });
    if (error) throw error;
  },

  async requestCorrection(foyerId: string, request: Omit<FamilyTreeCorrectionRequest, 'id' | 'foyerId' | 'status' | 'createdAt'>): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est nécessaire pour proposer une correction.');
    const { error } = await client.from('family_tree_correction_requests').insert({
      foyer_id: foyerId,
      profile_id: request.profileId,
      field_name: request.fieldName,
      current_value: request.currentValue || null,
      proposed_value: request.proposedValue,
      note: request.note || null
    });
    if (error) throw error;
  },

  async reviewCorrection(requestId: string, accept: boolean): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est indisponible.');
    const { error } = await client.rpc('review_family_tree_correction', {
      p_request_id: requestId,
      p_accept: accept
    });
    if (error) throw error;
  },

  async undoCorrection(requestId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('La synchronisation sécurisée est indisponible.');
    const { error } = await client.rpc('undo_family_tree_correction', { p_request_id: requestId });
    if (error) throw error;
  },

  async importProfiles(foyerId: string, profiles: Array<Omit<FamilyTreeProfile, 'id' | 'foyerId' | 'memberId' | 'isLocal'>>): Promise<FamilyTreeProfile[]> {
    const imported: FamilyTreeProfile[] = [];
    for (const profile of profiles.slice(0, 250)) {
      imported.push(await this.addProfile(foyerId, profile));
    }
    return imported;
  }
};
