import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from 'react';
import {
  Bell, BookOpen, CalendarDays, Check, Copy, Download, Earth, Eye, FileText, FileUp,
  GitBranch, History, Image, Link2, LockKeyhole, MapPin, Maximize2, MessageCircle, Minus,
  Plus, RefreshCw, ScanLine, Search, Send, ShieldAlert, ShieldCheck, Sparkles, Trash2, TreePine,
  Undo2, UserPlus, Users, X
} from 'lucide-react';
import type { Member } from '../types';
import {
  familyRootsService,
  type FamilyBranch,
  type FamilyRelationshipType,
  type FamilyRootsSnapshot,
  type FamilyTreeEvent,
  type FamilyTreeIdentityRequest,
  type FamilyTreeMemory,
  type FamilyTreeProfile,
  type FamilyTreeRelationship,
  type FamilyProfileVisibility
} from '../services/familyRootsService';
import { MemberAvatar } from '../components/MemberAvatar';
import { exportGedcom, parseGedcom, type GedcomLink, type GedcomPerson } from '../utils/gedcom';
import { compressImageToBlob, uploadBlobToStorage } from '../utils/imageCompressor';

type Props = {
  foyerId?: string;
  familyName?: string;
  members: Member[];
  canManage: boolean;
  isPremium: boolean;
  onTriggerPaywall: () => void;
  onAddAgendaEvent?: (event: { title: string; dateTime: string; type?: string; description?: string; memberId?: string; memberName?: string }) => Promise<void> | void;
  onCreateBranchGroup?: (name: string, memberIds: string[]) => Promise<void> | void;
};

type ViewId = 'arbre' | 'cousins' | 'branches' | 'carte' | 'dates';
type GedcomPreview = { people: GedcomPerson[]; links: GedcomLink[] } | null;
type MemoryDraft = { title: string; note: string; date: string; photoUrl: string; visibility: FamilyTreeMemory['visibility'] };
type GenerationGroup = { generation: number; people: FamilyTreeProfile[] };
type RelationshipPreview = { id: string; label: string; targetName: string };

const branchLabels: Record<FamilyBranch, string> = {
  proche: 'Famille proche',
  paternelle: 'Branche paternelle',
  maternelle: 'Branche maternelle',
  autre: 'Autre branche'
};

const relationshipLabels: Record<FamilyRelationshipType, string> = {
  parent: 'Parent',
  enfant: 'Enfant',
  fratrie: 'Frère ou sœur',
  cousin: 'Cousin ou cousine',
  conjoint: 'Conjoint ou conjointe',
  oncle_tante: 'Oncle ou tante',
  neveu_niece: 'Neveu ou nièce',
  grand_parent: 'Grand-parent',
  petit_enfant: 'Petit-enfant',
  famille: 'Autre lien familial'
};

const reciprocalRelationshipType = (type: FamilyRelationshipType): FamilyRelationshipType => {
  if (type === 'parent') return 'enfant';
  if (type === 'enfant') return 'parent';
  if (type === 'grand_parent') return 'petit_enfant';
  if (type === 'petit_enfant') return 'grand_parent';
  if (type === 'oncle_tante') return 'neveu_niece';
  if (type === 'neveu_niece') return 'oncle_tante';
  return type;
};

const eventLabels: Record<FamilyTreeEvent['eventType'], string> = {
  anniversaire: 'Anniversaire',
  mariage: 'Mariage',
  deces: 'Souvenir',
  reunion: 'Réunion familiale',
  autre: 'Événement'
};

const shareFieldOptions = [
  ['nickname', 'Surnom'],
  ['country', 'Pays'],
  ['origin_city', 'Ville'],
  ['birth_date', 'Naissance'],
  ['photo_url', 'Photo'],
  ['bio', 'Histoire'],
  ['languages', 'Langues'],
  ['death_date', 'Souvenir']
] as const;

const correctionFieldLabels: Record<string, string> = {
  display_name: 'Nom',
  nickname: 'Surnom',
  birth_date: 'Naissance',
  death_date: 'Souvenir',
  branch: 'Branche',
  country: 'Pays',
  origin_city: 'Ville',
  bio: 'Histoire',
  languages: 'Langues',
  relationship: 'Lien familial'
};

const emptySnapshot: FamilyRootsSnapshot = {
  profiles: [],
  relationships: [],
  connections: [],
  identityRequests: [],
  events: [],
  memories: [],
  corrections: [],
  validationLogs: [],
  cloudEnabled: false
};

const defaultSharedFields = (isMinor = false) => isMinor
  ? ['display_name', 'nickname']
  : ['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url', 'bio', 'languages'];

const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normalizeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('family_tree_') || lower.includes('pgrst') || lower.includes('schema cache')) {
    return 'Activez la migration Racines familiales dans Supabase pour utiliser cette option.';
  }
  if (lower.includes('duplicate') || lower.includes('unique')) return 'Cette demande ou ce lien existe déjà.';
  if (lower.includes('code racines')) return 'Ce code Racines est invalide ou expiré.';
  if (lower.includes('boucle') || lower.includes('coherent')) return message;
  return message || 'Une action n’a pas pu être terminée.';
};

const nextOccurrence = (event: FamilyTreeEvent) => {
  const source = new Date(`${event.eventDate}T12:00:00`);
  if (!event.repeatsYearly || Number.isNaN(source.getTime())) return source;
  const now = new Date();
  const candidate = new Date(now.getFullYear(), source.getMonth(), source.getDate(), 12);
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const ageDiff = (older?: string, younger?: string) => {
  if (!older || !younger) return null;
  const a = new Date(`${older}T12:00:00`);
  const b = new Date(`${younger}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return b.getFullYear() - a.getFullYear();
};

const profileLabel = (profile: FamilyTreeProfile) => profile.nickname ? `${profile.displayName} · ${profile.nickname}` : profile.displayName;

const buildGenerations = (profiles: FamilyTreeProfile[], relationships: FamilyRootsSnapshot['relationships']): GenerationGroup[] => {
  const visible = profiles.filter(profile => profile.visibility !== 'masque');
  const ids = new Set(visible.map(profile => profile.id));
  const levels = new Map(visible.map(profile => [profile.id, 0]));
  const generationLinks = relationships.flatMap(link => {
    if (!ids.has(link.sourceProfileId) || !ids.has(link.targetProfileId)) return [];
    if (link.relationshipType === 'parent') return [{ parentId: link.sourceProfileId, childId: link.targetProfileId, offset: 1 }];
    if (link.relationshipType === 'enfant') return [{ parentId: link.targetProfileId, childId: link.sourceProfileId, offset: 1 }];
    if (link.relationshipType === 'grand_parent') return [{ parentId: link.sourceProfileId, childId: link.targetProfileId, offset: 2 }];
    if (link.relationshipType === 'petit_enfant') return [{ parentId: link.targetProfileId, childId: link.sourceProfileId, offset: 2 }];
    if (link.relationshipType === 'oncle_tante') return [{ parentId: link.sourceProfileId, childId: link.targetProfileId, offset: 1 }];
    if (link.relationshipType === 'neveu_niece') return [{ parentId: link.targetProfileId, childId: link.sourceProfileId, offset: 1 }];
    return [];
  });

  for (let i = 0; i < Math.max(1, visible.length); i += 1) {
    let changed = false;
    for (const link of generationLinks) {
      const parentLevel = levels.get(link.parentId) ?? 0;
      const childLevel = levels.get(link.childId) ?? 0;
      if (childLevel < parentLevel + link.offset) {
        levels.set(link.childId, parentLevel + link.offset);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const min = Math.min(...[...levels.values(), 0]);
  const groups = new Map<number, FamilyTreeProfile[]>();
  visible.forEach(profile => {
    const generation = (levels.get(profile.id) ?? 0) - min;
    groups.set(generation, [...(groups.get(generation) || []), profile]);
  });
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([generation, people]) => ({ generation, people }));
};

const relationshipPreviewTone = (type: FamilyRelationshipType) => {
  if (['parent', 'enfant', 'grand_parent', 'petit_enfant'].includes(type)) return 'roots-link-green';
  if (['conjoint', 'fratrie'].includes(type)) return 'roots-link-violet';
  if (['cousin', 'oncle_tante', 'neveu_niece'].includes(type)) return 'roots-link-blue';
  return 'roots-link-amber';
};

const buildWarnings = (profiles: FamilyTreeProfile[], relationships: FamilyRootsSnapshot['relationships']) => {
  const warnings: string[] = [];
  const visible = profiles.filter(profile => profile.isLocal && profile.visibility !== 'masque');
  const byName = new Map<string, FamilyTreeProfile[]>();
  visible.forEach(profile => {
    const key = `${normalizeText(profile.displayName)}|${profile.birthDate || ''}`;
    if (!key.startsWith('|')) byName.set(key, [...(byName.get(key) || []), profile]);
    if (profile.deathDate && profile.birthDate && profile.deathDate < profile.birthDate) {
      warnings.push(`${profile.displayName} a une date de souvenir avant la naissance.`);
    }
  });
  [...byName.values()].filter(items => items.length > 1).forEach(items => {
    warnings.push(`${items.map(item => item.displayName).join(' et ')} semblent être des doublons.`);
  });
  relationships.filter(link => link.relationshipType === 'parent').forEach(link => {
    const parent = profiles.find(profile => profile.id === link.sourceProfileId);
    const child = profiles.find(profile => profile.id === link.targetProfileId);
    const diff = ageDiff(parent?.birthDate, child?.birthDate);
    if (parent && child && diff !== null && diff < 12) {
      warnings.push(`Le lien parent-enfant entre ${parent.displayName} et ${child.displayName} semble incohérent.`);
    }
  });
  return warnings.slice(0, 8);
};

export function FamilyRoots({
  foyerId = 'local',
  familyName = 'Notre famille',
  members,
  canManage,
  isPremium,
  onTriggerPaywall,
  onAddAgendaEvent,
  onCreateBranchGroup
}: Props) {
  const [view, setView] = useState<ViewId>('arbre');
  const [snapshot, setSnapshot] = useState<FamilyRootsSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [todayTimestamp] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [editingProfile, setEditingProfile] = useState<FamilyTreeProfile | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<FamilyBranch | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [datePlaceFilter, setDatePlaceFilter] = useState('all');
  const [treeSearch, setTreeSearch] = useState('');
  const [treeBranchFilter, setTreeBranchFilter] = useState<'all' | FamilyBranch>('all');
  const [treePlaceFilter, setTreePlaceFilter] = useState('all');
  const [treeGenerationFilter, setTreeGenerationFilter] = useState('all');
  const [treeLinkProfileId, setTreeLinkProfileId] = useState('');
  const [treeZoom, setTreeZoom] = useState(1);
  const [targetCode, setTargetCode] = useState('');
  const [sourceProfileId, setSourceProfileId] = useState('');
  const [relationshipType, setRelationshipType] = useState<FamilyRelationshipType>('cousin');
  const [relationTargetId, setRelationTargetId] = useState('');
  const [relationType, setRelationType] = useState<FamilyRelationshipType>('parent');
  const [responseProfiles, setResponseProfiles] = useState<Record<string, string>>({});
  const [identityDraft, setIdentityDraft] = useState({ localProfileId: '', remoteProfileId: '' });
  const [eventDraft, setEventDraft] = useState({ title: '', date: '', type: 'reunion' as FamilyTreeEvent['eventType'], profileId: '', repeats: false, agenda: true });
  const [correctionDraft, setCorrectionDraft] = useState({ profileId: '', fieldName: 'display_name', proposedValue: '', note: '' });
  const [memoryDraft, setMemoryDraft] = useState<MemoryDraft>({ title: '', note: '', date: '', photoUrl: '', visibility: 'famille' });
  const [guideDraft, setGuideDraft] = useState({
    baseProfileId: '',
    relation: 'parent' as 'parent' | 'fratrie' | 'enfant' | 'conjoint',
    name: '',
    birthDate: '',
    branch: 'proche' as FamilyBranch,
    country: ''
  });
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    nickname: '',
    birthDate: '',
    deathDate: '',
    branch: 'proche' as FamilyBranch,
    country: '',
    originCity: '',
    bio: '',
    languages: '',
    photoUrl: '',
    isMinor: false,
    isMemorial: false,
    visibility: 'famille' as FamilyProfileVisibility,
    sharedFields: defaultSharedFields(false)
  });
  const [gedcomPreview, setGedcomPreview] = useState<GedcomPreview>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await familyRootsService.load(foyerId, members, canManage);
      setSnapshot(data);
      setSourceProfileId(current => current || data.profiles.find(profile => profile.isLocal)?.id || '');
      setIdentityDraft(current => ({
        localProfileId: current.localProfileId || data.profiles.find(profile => profile.isLocal)?.id || '',
        remoteProfileId: current.remoteProfileId || data.profiles.find(profile => !profile.isLocal)?.id || ''
      }));
      setGuideDraft(current => ({
        ...current,
        baseProfileId: current.baseProfileId || data.profiles.find(profile => profile.isLocal)?.id || ''
      }));
    } catch (error) {
      setNotice(normalizeError(error));
      setSnapshot(emptySnapshot);
    } finally {
      setLoading(false);
    }
  }, [canManage, foyerId, members]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
    const code = search.get('racines') || hash.get('racines');
    if (code) {
      queueMicrotask(() => {
        setTargetCode(code.toUpperCase());
        setView('branches');
        setLinkOpen(true);
      });
    }
  }, []);

  const localProfiles = useMemo(() => snapshot.profiles.filter(profile => profile.isLocal && profile.visibility !== 'masque'), [snapshot.profiles]);
  const remoteProfiles = useMemo(() => snapshot.profiles.filter(profile => !profile.isLocal && profile.visibility === 'famille'), [snapshot.profiles]);
  const focusProfile = localProfiles[0] || snapshot.profiles.find(profile => profile.visibility !== 'masque');
  const confirmedConnections = snapshot.connections.filter(connection => connection.status === 'confirmed');
  const pendingConnections = snapshot.connections.filter(connection => connection.status === 'pending');
  const incomingConnections = pendingConnections.filter(connection => connection.direction === 'incoming');
  const pendingIdentity = snapshot.identityRequests.filter(request => request.status === 'pending');
  const incomingIdentity = pendingIdentity.filter(request => request.direction === 'incoming');
  const profileById = useCallback((id?: string) => snapshot.profiles.find(profile => profile.id === id), [snapshot.profiles]);
  const connectionRelationships = useMemo(() => confirmedConnections
    .filter(connection => connection.targetProfileId)
    .flatMap(connection => {
      const direct = {
        id: `connection-${connection.id}`,
        foyerId,
        sourceProfileId: connection.requesterProfileId,
        targetProfileId: connection.targetProfileId as string,
        relationshipType: connection.relationshipType
      };
      const inverse = {
        id: `connection-${connection.id}-inverse`,
        foyerId,
        sourceProfileId: connection.targetProfileId as string,
        targetProfileId: connection.requesterProfileId,
        relationshipType: reciprocalRelationshipType(connection.relationshipType)
      };
      return [direct, inverse];
    }), [confirmedConnections, foyerId]);
  const treeRelationships = useMemo(() => {
    const seen = new Set<string>();
    return [...snapshot.relationships, ...connectionRelationships].filter(link => {
      const key = `${link.sourceProfileId}|${link.targetProfileId}|${link.relationshipType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [connectionRelationships, snapshot.relationships]);
  const warnings = useMemo(() => buildWarnings(snapshot.profiles, treeRelationships), [snapshot.profiles, treeRelationships]);
  const allTreeProfiles = useMemo(() => [...localProfiles, ...remoteProfiles], [localProfiles, remoteProfiles]);
  const relationshipPreviewsByProfile = useMemo(() => {
    const ids = new Set(allTreeProfiles.map(profile => profile.id));
    const map = new Map<string, RelationshipPreview[]>();
    treeRelationships.forEach(link => {
      if (!ids.has(link.sourceProfileId) || !ids.has(link.targetProfileId)) return;
      const target = profileById(link.targetProfileId);
      if (!target || target.visibility === 'masque') return;
      map.set(link.sourceProfileId, [...(map.get(link.sourceProfileId) || []), {
        id: link.id,
        label: relationshipLabels[link.relationshipType],
        targetName: target.displayName
      }]);
    });
    return map;
  }, [allTreeProfiles, profileById, treeRelationships]);
  const editableRelationshipsByProfile = useMemo(() => {
    const map = new Map<string, Array<{ relationship: FamilyTreeRelationship; target: FamilyTreeProfile }>>();
    snapshot.relationships.forEach(relationship => {
      const target = profileById(relationship.targetProfileId);
      if (!target || target.visibility === 'masque') return;
      map.set(relationship.sourceProfileId, [
        ...(map.get(relationship.sourceProfileId) || []),
        { relationship, target }
      ]);
    });
    return map;
  }, [profileById, snapshot.relationships]);
  const visibleRelationshipSummaries = useMemo(() => {
    const ids = new Set(allTreeProfiles.map(profile => profile.id));
    const displayed = new Set<string>();
    return treeRelationships.flatMap(link => {
      if (!ids.has(link.sourceProfileId) || !ids.has(link.targetProfileId)) return [];
      const source = profileById(link.sourceProfileId);
      const target = profileById(link.targetProfileId);
      if (!source || !target || source.visibility === 'masque' || target.visibility === 'masque') return [];
      const symmetric = ['fratrie', 'cousin', 'conjoint', 'famille'].includes(link.relationshipType);
      const displaySourceId = link.relationshipType === 'enfant' || link.relationshipType === 'petit_enfant' || link.relationshipType === 'neveu_niece'
        ? link.targetProfileId
        : link.sourceProfileId;
      const displayTargetId = link.relationshipType === 'enfant' || link.relationshipType === 'petit_enfant' || link.relationshipType === 'neveu_niece'
        ? link.sourceProfileId
        : link.targetProfileId;
      const displayType = link.relationshipType === 'enfant' || link.relationshipType === 'petit_enfant' || link.relationshipType === 'neveu_niece'
        ? reciprocalRelationshipType(link.relationshipType)
        : link.relationshipType;
      const ordered = symmetric ? [displaySourceId, displayTargetId].sort() : [displaySourceId, displayTargetId];
      const key = `${ordered[0]}|${ordered[1]}|${displayType}`;
      if (displayed.has(key)) return [];
      displayed.add(key);
      const displaySource = profileById(displaySourceId);
      const displayTarget = profileById(displayTargetId);
      if (!displaySource || !displayTarget) return [];
      return [{
        id: link.id,
        type: displayType,
        sourceName: displaySource.displayName,
        targetName: displayTarget.displayName
      }];
    }).slice(0, 8);
  }, [allTreeProfiles, profileById, treeRelationships]);
  const cousinProfiles = useMemo(() => {
    const ids = new Set<string>();
    treeRelationships.filter(link => link.relationshipType === 'cousin').forEach(link => {
      if (!focusProfile || link.sourceProfileId === focusProfile.id) ids.add(link.targetProfileId);
      if (!focusProfile || link.targetProfileId === focusProfile.id) ids.add(link.sourceProfileId);
    });
    const query = normalizeText(treeSearch);
    const matches = (profile: FamilyTreeProfile) => !query || normalizeText(`${profile.displayName} ${profile.nickname || ''} ${profile.country || ''} ${profile.originCity || ''}`).includes(query);
    const explicit = allTreeProfiles.filter(profile => ids.has(profile.id) && profile.id !== focusProfile?.id).filter(matches);
    if (explicit.length) return explicit;
    return allTreeProfiles
      .filter(profile => profile.id !== focusProfile?.id)
      .filter(profile => profile.branch !== 'proche' || !profile.isLocal)
      .filter(matches)
      .slice(0, 24);
  }, [allTreeProfiles, focusProfile, treeRelationships, treeSearch]);
  const branchSummaries = useMemo(() => (['proche', 'paternelle', 'maternelle', 'autre'] as FamilyBranch[]).map(branch => ({
    branch,
    profiles: localProfiles.filter(profile => profile.branch === branch),
    events: snapshot.events.filter(event => {
      const profile = profileById(event.profileId);
      return profile?.branch === branch;
    }),
    memories: snapshot.memories.filter(memory => {
      const profile = profileById(memory.profileId);
      return profile?.branch === branch;
    })
  })), [localProfiles, profileById, snapshot.events, snapshot.memories]);
  const countries = useMemo(() => {
    const map = new Map<string, FamilyTreeProfile[]>();
    snapshot.profiles.filter(profile => profile.visibility !== 'masque').forEach(profile => {
      const country = profile.country?.trim() || 'Pays non indiqué';
      const city = profile.originCity?.trim();
      const key = city ? `${city}, ${country}` : country;
      map.set(key, [...(map.get(key) || []), profile]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'));
  }, [snapshot.profiles]);
  const upcomingEvents = useMemo(() => [...snapshot.events]
    .sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime())
    .slice(0, 40), [snapshot.events]);
  const highlightedEvent = useMemo(() => {
    const event = upcomingEvents[0];
    if (!event) return null;
    const date = nextOccurrence(event);
    return {
      event,
      date,
      days: Math.max(0, Math.ceil((date.getTime() - todayTimestamp) / 86400000))
    };
  }, [todayTimestamp, upcomingEvents]);
  const places = useMemo(() => ['all', ...countries.map(([place]) => place)], [countries]);
  const linkedProfileIds = useMemo(() => {
    if (!treeLinkProfileId) return null;
    const ids = new Set([treeLinkProfileId]);
    treeRelationships.forEach(link => {
      if (link.sourceProfileId === treeLinkProfileId) ids.add(link.targetProfileId);
      if (link.targetProfileId === treeLinkProfileId) ids.add(link.sourceProfileId);
    });
    return ids;
  }, [treeRelationships, treeLinkProfileId]);
  const filteredTreeProfiles = useMemo(() => allTreeProfiles.filter(profile => {
    const query = normalizeText(treeSearch);
    const country = profile.country?.trim() || 'Pays non indiqué';
    const place = profile.originCity ? `${profile.originCity}, ${country}` : country;
    if (query && !normalizeText(`${profile.displayName} ${profile.nickname || ''} ${profile.country || ''} ${profile.originCity || ''} ${profile.bio || ''}`).includes(query)) return false;
    if (treeBranchFilter !== 'all' && profile.branch !== treeBranchFilter) return false;
    if (treePlaceFilter !== 'all' && place !== treePlaceFilter) return false;
    if (linkedProfileIds && !linkedProfileIds.has(profile.id)) return false;
    return true;
  }), [allTreeProfiles, linkedProfileIds, treeBranchFilter, treePlaceFilter, treeSearch]);
  const generations = useMemo(() => buildGenerations(filteredTreeProfiles, treeRelationships), [filteredTreeProfiles, treeRelationships]);
  const generationOptions = useMemo(() => ['all', ...generations.map(group => String(group.generation))], [generations]);
  const visibleGenerations = useMemo(() => generations.filter(group => treeGenerationFilter === 'all' || String(group.generation) === treeGenerationFilter), [generations, treeGenerationFilter]);
  const filteredUpcomingEvents = useMemo(() => upcomingEvents.filter(event => {
    if (datePlaceFilter === 'all') return true;
    const profile = profileById(event.profileId);
    const country = profile?.country?.trim() || 'Pays non indiqué';
    const place = profile?.originCity ? `${profile.originCity}, ${country}` : country;
    return place === datePlaceFilter;
  }), [datePlaceFilter, profileById, upcomingEvents]);
  const currentMonthBirthdays = useMemo(() => {
    const month = new Date().getMonth();
    return snapshot.events
      .filter(event => event.eventType === 'anniversaire' && new Date(`${event.eventDate}T12:00:00`).getMonth() === month)
      .slice(0, 12);
  }, [snapshot.events]);
  const internalNotifications = useMemo(() => [
    incomingConnections.length ? `${incomingConnections.length} demande${incomingConnections.length > 1 ? 's' : ''} de branche à traiter` : '',
    snapshot.corrections.filter(request => request.status === 'pending').length ? `${snapshot.corrections.filter(request => request.status === 'pending').length} correction${snapshot.corrections.filter(request => request.status === 'pending').length > 1 ? 's' : ''} en attente` : '',
    incomingIdentity.length ? `${incomingIdentity.length} rapprochement${incomingIdentity.length > 1 ? 's' : ''} à confirmer` : ''
  ].filter(Boolean), [incomingConnections.length, incomingIdentity.length, snapshot.corrections]);
  const identitySuggestions = useMemo(() => {
    const suggestions: Array<{ local: FamilyTreeProfile; remote: FamilyTreeProfile; reason: string }> = [];
    localProfiles.forEach(local => {
      remoteProfiles.forEach(remote => {
        const sameName = normalizeText(local.displayName) && normalizeText(local.displayName) === normalizeText(remote.displayName);
        const sameBirth = local.birthDate && remote.birthDate && local.birthDate === remote.birthDate;
        const samePlace = (local.originCity && remote.originCity && normalizeText(local.originCity) === normalizeText(remote.originCity))
          || (local.country && remote.country && normalizeText(local.country) === normalizeText(remote.country));
        if ((sameName && (sameBirth || samePlace)) || (sameBirth && samePlace)) {
          suggestions.push({ local, remote, reason: sameBirth ? 'même date de naissance' : 'nom et origine proches' });
        }
      });
    });
    return suggestions.slice(0, 4);
  }, [localProfiles, remoteProfiles]);
  const timeline = useMemo(() => {
    const profileItems = snapshot.profiles.flatMap(profile => [
      profile.birthDate ? { id: `birth-${profile.id}`, date: profile.birthDate, title: `Naissance de ${profile.displayName}`, detail: profile.originCity || profile.country || branchLabels[profile.branch], type: 'naissance' } : null,
      profile.deathDate ? { id: `death-${profile.id}`, date: profile.deathDate, title: `Souvenir de ${profile.displayName}`, detail: profile.bio || 'Mémoire familiale', type: 'souvenir' } : null
    ].filter(Boolean) as Array<{ id: string; date: string; title: string; detail?: string; type: string }>);
    const eventItems = snapshot.events.filter(event => !event.generated).map(event => ({
      id: event.id,
      date: event.eventDate,
      title: event.title,
      detail: eventLabels[event.eventType],
      type: event.eventType
    }));
    const memoryItems = snapshot.memories.filter(memory => memory.memoryDate).map(memory => ({
      id: `memory-${memory.id}`,
      date: memory.memoryDate as string,
      title: memory.title,
      detail: memory.note,
      type: 'souvenir'
    }));
    return [...profileItems, ...eventItems, ...memoryItems].sort((a, b) => a.date.localeCompare(b.date)).slice(-80);
  }, [snapshot.events, snapshot.memories, snapshot.profiles]);
  const shareUrl = useMemo(() => {
    if (!snapshot.shareCode) return '';
    return `${window.location.origin}/app?racines=${encodeURIComponent(snapshot.shareCode)}`;
  }, [snapshot.shareCode]);

  const runAction = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setNotice('');
    try {
      await action();
      setNotice(success);
      await load();
    } catch (error) {
      setNotice(normalizeError(error));
    } finally {
      setBusy(false);
    }
  };

  const uploadFamilyRootPhoto = async (file: File, folder: 'profiles' | 'memories', ownerId: string, preset: 'profile' | 'classic' = 'profile') => {
    if (!file.type.startsWith('image/')) throw new Error('Choisissez une image.');
    setPhotoUploading(true);
    try {
      const { blob, ext } = await compressImageToBlob(file, preset);
      const safeOwnerId = ownerId.replace(/[^a-z0-9_-]/gi, '-').slice(0, 80) || 'photo';
      return await uploadBlobToStorage('avatars', `${foyerId}/family-roots/${folder}/${safeOwnerId}-${Date.now()}.${ext}`, blob);
    } finally {
      setPhotoUploading(false);
    }
  };

  const uploadNewProfilePhoto = async (file: File) => {
    try {
      const url = await uploadFamilyRootPhoto(file, 'profiles', profileDraft.name || 'nouvelle-personne');
      setProfileDraft(current => ({ ...current, photoUrl: url }));
      setNotice('Photo ajoutée à la fiche.');
    } catch (error) {
      setNotice(normalizeError(error));
    }
  };

  const uploadEditedProfilePhoto = async (file: File) => {
    if (!editingProfile) return;
    try {
      const url = await uploadFamilyRootPhoto(file, 'profiles', editingProfile.id);
      setEditingProfile(current => current ? { ...current, photoUrl: url } : current);
      setNotice('Photo ajoutée à la fiche.');
    } catch (error) {
      setNotice(normalizeError(error));
    }
  };

  const uploadMemoryPhoto = async (file: File) => {
    const ownerId = editingProfile?.id || memoryDraft.title || 'souvenir';
    try {
      const url = await uploadFamilyRootPhoto(file, 'memories', ownerId, 'classic');
      setMemoryDraft(current => ({ ...current, photoUrl: url }));
      setNotice('Photo ajoutée au souvenir.');
    } catch (error) {
      setNotice(normalizeError(error));
    }
  };

  const saveProfile = async () => {
    if (!editingProfile) return;
    await runAction(async () => {
      await familyRootsService.updateProfile(foyerId, editingProfile);
      setEditingProfile(null);
    }, 'La fiche familiale a été enregistrée.');
  };

  const addProfile = async () => {
    if (!profileDraft.name.trim()) return setNotice('Indiquez le prénom ou le nom de la personne.');
    await runAction(async () => {
      await familyRootsService.addProfile(foyerId, {
        displayName: profileDraft.name.trim(),
        nickname: profileDraft.nickname.trim() || undefined,
        birthDate: profileDraft.birthDate || undefined,
        deathDate: profileDraft.deathDate || undefined,
        branch: profileDraft.branch,
        country: profileDraft.country.trim() || undefined,
        originCity: profileDraft.originCity.trim() || undefined,
        bio: profileDraft.bio.trim() || undefined,
        languages: profileDraft.languages.split(',').map(item => item.trim()).filter(Boolean),
        photoUrl: profileDraft.photoUrl.trim() || undefined,
        isMinor: profileDraft.isMinor,
        isMemorial: profileDraft.isMemorial,
        visibility: profileDraft.isMinor && profileDraft.visibility === 'famille' ? 'prive' : profileDraft.visibility,
        sharedFields: profileDraft.isMinor ? defaultSharedFields(true) : profileDraft.sharedFields
      });
      setProfileDraft({ name: '', nickname: '', birthDate: '', deathDate: '', branch: 'proche', country: '', originCity: '', bio: '', languages: '', photoUrl: '', isMinor: false, isMemorial: false, visibility: 'famille', sharedFields: defaultSharedFields(false) });
      setProfileOpen(false);
    }, 'La personne a été ajoutée à l’arbre.');
  };

  const addInternalRelationship = async () => {
    if (!editingProfile || !relationTargetId) return setNotice('Choisissez la personne reliée.');
    const sourceProfileId = editingProfile.id;
    await runAction(async () => {
      await familyRootsService.addRelationship(foyerId, sourceProfileId, relationTargetId, relationType);
      setRelationTargetId('');
      setTreeBranchFilter('all');
      setTreePlaceFilter('all');
      setTreeGenerationFilter('all');
      setTreeLinkProfileId(sourceProfileId);
    }, 'Le lien familial est ajouté à la fiche et à l’arbre.');
  };

  const deleteInternalRelationship = async (relationshipId: string) => {
    await runAction(async () => {
      await familyRootsService.deleteRelationship(foyerId, relationshipId);
    }, 'Le lien familial a été supprimé.');
  };

  const sendConnection = async () => {
    if (!isPremium) return onTriggerPaywall();
    if (!targetCode.trim() || !sourceProfileId) return setNotice('Indiquez le code Racines et le membre qui relie les deux branches.');
    await runAction(async () => {
      await familyRootsService.requestConnection(foyerId, targetCode.trim(), sourceProfileId, relationshipType);
      setTargetCode('');
      setLinkOpen(false);
    }, 'La demande a été envoyée. L’autre branche doit maintenant confirmer.');
  };

  const sendIdentityRequest = async () => {
    if (!identityDraft.localProfileId || !identityDraft.remoteProfileId) return setNotice('Choisissez les deux fiches à rapprocher.');
    await runAction(async () => {
      await familyRootsService.requestIdentityLink(identityDraft.localProfileId, identityDraft.remoteProfileId);
    }, 'La demande de rapprochement a été envoyée à l’autre branche.');
  };

  const addEvent = async () => {
    if (!eventDraft.title.trim() || !eventDraft.date) return setNotice('Ajoutez un titre et une date.');
    const agendaEventId = eventDraft.agenda ? `roots-${Date.now()}` : undefined;
    await runAction(async () => {
      await familyRootsService.addEvent(foyerId, {
        profileId: eventDraft.profileId || undefined,
        eventType: eventDraft.type,
        title: eventDraft.title.trim(),
        eventDate: eventDraft.date,
        repeatsYearly: eventDraft.repeats,
        visibility: 'famille',
        agendaEventId
      });
      if (eventDraft.agenda && onAddAgendaEvent) {
        const profile = profileById(eventDraft.profileId);
        await onAddAgendaEvent({
          title: eventDraft.title.trim(),
          dateTime: `${eventDraft.date}T09:00:00`,
          type: 'family',
          description: 'Ajouté depuis Racines familiales.',
          memberId: profile?.memberId,
          memberName: profile?.displayName
        });
      }
      setEventDraft({ title: '', date: '', type: 'reunion', profileId: '', repeats: false, agenda: true });
      setEventOpen(false);
    }, eventDraft.agenda ? 'La date a été ajoutée à l’arbre et à l’agenda.' : 'La date a été ajoutée aux Racines familiales.');
  };

  const addMemory = async (profileId: string) => {
    if (!memoryDraft.title.trim() || !memoryDraft.note.trim()) return setNotice('Ajoutez un titre et un souvenir.');
    await runAction(async () => {
      await familyRootsService.addMemory(foyerId, {
        profileId,
        title: memoryDraft.title.trim(),
        note: memoryDraft.note.trim(),
        memoryDate: memoryDraft.date || undefined,
        photoUrl: memoryDraft.photoUrl.trim() || undefined,
        visibility: memoryDraft.visibility
      });
      setMemoryDraft({ title: '', note: '', date: '', photoUrl: '', visibility: 'famille' });
    }, 'Le souvenir a été ajouté à l’histoire familiale.');
  };

  const addGuidedRelative = async () => {
    if (!guideDraft.name.trim() || !guideDraft.baseProfileId) return setNotice('Choisissez une personne de départ et indiquez le prénom à ajouter.');
    await runAction(async () => {
      const created = await familyRootsService.addProfile(foyerId, {
        displayName: guideDraft.name.trim(),
        birthDate: guideDraft.birthDate || undefined,
        branch: guideDraft.branch,
        country: guideDraft.country.trim() || undefined,
        originCity: undefined,
        nickname: undefined,
        bio: undefined,
        languages: [],
        photoUrl: undefined,
        isMinor: false,
        isMemorial: false,
        visibility: 'prive',
        sharedFields: defaultSharedFields(false)
      });
      if (guideDraft.relation === 'parent') {
        await familyRootsService.addRelationship(foyerId, created.id, guideDraft.baseProfileId, 'parent');
      } else if (guideDraft.relation === 'enfant') {
        await familyRootsService.addRelationship(foyerId, guideDraft.baseProfileId, created.id, 'parent');
      } else {
        await familyRootsService.addRelationship(foyerId, guideDraft.baseProfileId, created.id, guideDraft.relation);
      }
      setGuideDraft(current => ({ ...current, name: '', birthDate: '', country: '' }));
    }, 'La personne a été ajoutée avec son lien familial.');
  };

  const currentFieldValue = (profile: FamilyTreeProfile | undefined, fieldName: string) => {
    if (!profile) return '';
    const value = profile[fieldName as keyof FamilyTreeProfile];
    return Array.isArray(value) ? value.join(', ') : value ? String(value) : '';
  };

  const requestCorrection = async () => {
    const profile = profileById(correctionDraft.profileId);
    if (!profile || !correctionDraft.proposedValue.trim()) return setNotice('Choisissez une fiche et indiquez la correction proposée.');
    await runAction(async () => {
      await familyRootsService.requestCorrection(foyerId, {
        profileId: profile.id,
        fieldName: correctionDraft.fieldName,
        currentValue: currentFieldValue(profile, correctionDraft.fieldName),
        proposedValue: correctionDraft.proposedValue.trim(),
        note: correctionDraft.note.trim() || undefined
      });
      setCorrectionDraft({ profileId: '', fieldName: 'display_name', proposedValue: '', note: '' });
      setCorrectionOpen(false);
    }, 'La correction a été proposée aux responsables du foyer.');
  };

  const copyText = async (value: string, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setNotice(label);
  };

  const shareBranchLink = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      await navigator.share({ title: 'Invitation Racines familiales', text: 'Voici le lien privé pour relier nos branches familiales.', url: shareUrl });
      return;
    }
    await copyText(shareUrl, 'Lien privé copié.');
  };

  const regenerateCode = async () => {
    if (!isPremium) return onTriggerPaywall();
    await runAction(async () => {
      await familyRootsService.regenerateCode(foyerId);
    }, 'Un nouveau code privé valable 30 jours a été généré.');
  };

  const createBranchGroup = async (branch: FamilyBranch) => {
    const memberIds = localProfiles.filter(profile => profile.branch === branch && profile.memberId).map(profile => profile.memberId as string);
    if (!memberIds.length || !onCreateBranchGroup) return setNotice('Cette branche ne contient pas encore de membre avec compte.');
    await runAction(async () => {
      await onCreateBranchGroup(branchLabels[branch], memberIds);
    }, 'La discussion de branche est prête dans la messagerie.');
  };

  const handleGedcomFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setGedcomPreview(parseGedcom(text));
  };

  const importGedcomPreview = async () => {
    if (!gedcomPreview) return;
    await runAction(async () => {
      const imported = await familyRootsService.importProfiles(foyerId, gedcomPreview.people.map(person => ({
        displayName: person.name,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        branch: 'autre',
        country: undefined,
        originCity: undefined,
        nickname: undefined,
        bio: undefined,
        languages: [],
        photoUrl: undefined,
        isMinor: false,
        isMemorial: Boolean(person.deathDate),
        visibility: 'prive',
        sharedFields: defaultSharedFields(false)
      })));
      const byRef = new Map(gedcomPreview.people.map((person, index) => [person.ref, imported[index]?.id]));
      for (const link of gedcomPreview.links.slice(0, 120)) {
        const source = byRef.get(link.sourceRef);
        const target = byRef.get(link.targetRef);
        if (source && target) await familyRootsService.addRelationship(foyerId, source, target, link.type);
      }
      setGedcomPreview(null);
      if (importInputRef.current) importInputRef.current.value = '';
    }, 'Le fichier a été importé en brouillon privé.');
  };

  const downloadGedcom = () => {
    const blob = new Blob([exportGedcom(snapshot.profiles, snapshot.relationships)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `racines-${familyName.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.ged`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadFamilyBooklet = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44;
    let y = 0;

    doc.setFillColor(7, 17, 31);
    doc.rect(0, 0, pageWidth, 168, 'F');
    doc.setFillColor(0, 210, 106);
    doc.roundedRect(margin, 36, 52, 52, 14, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Racines familiales', margin + 70, 58);
    doc.setFontSize(15);
    doc.text(familyName, margin + 70, 82);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(200, 209, 224);
    doc.text(`Livret généré le ${new Date().toLocaleDateString('fr-FR')}`, margin + 70, 104);
    doc.text(`${localProfiles.length} proches · ${confirmedConnections.length} branche(s) reliée(s) · ${snapshot.memories.length} souvenir(s)`, margin + 70, 122);
    y = 204;

    const writeTitle = (title: string) => {
      if (y > pageHeight - 90) { doc.addPage(); y = margin; }
      doc.setTextColor(7, 17, 31);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(title, margin, y);
      doc.setDrawColor(0, 210, 106);
      doc.line(margin, y + 6, margin + 72, y + 6);
      y += 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(45, 55, 72);
    };
    const writeLine = (line: string) => {
      const lines = doc.splitTextToSize(line, 500);
      if (y + lines.length * 13 > pageHeight - 42) { doc.addPage(); y = margin; }
      doc.text(lines, margin, y);
      y += lines.length * 13 + 5;
    };

    writeTitle('Branches');
    branchSummaries.forEach((branch, index) => {
      if (y > pageHeight - 76) { doc.addPage(); y = margin; }
      const palette = [[0, 210, 106], [108, 92, 255], [79, 140, 255], [255, 176, 32]][index] || [0, 210, 106];
      doc.setFillColor(palette[0], palette[1], palette[2]);
      doc.roundedRect(margin, y - 10, 10, 10, 4, 4, 'F');
      writeLine(`${branchLabels[branch.branch]} : ${branch.profiles.length} personne(s), ${branch.events.length} date(s), ${branch.memories.length} souvenir(s).`);
    });
    writeTitle('Personnes visibles');
    localProfiles.forEach(profile => writeLine(`${profile.displayName}${profile.nickname ? ` (${profile.nickname})` : ''} - ${profile.originCity || profile.country || branchLabels[profile.branch]}${profile.birthDate ? ` - né(e) le ${formatDate(profile.birthDate)}` : ''}${profile.isMemorial ? ' - souvenir' : ''}`));
    writeTitle('Prochaines dates');
    upcomingEvents.slice(0, 20).forEach(event => writeLine(`${formatDate(nextOccurrence(event).toISOString().slice(0, 10))} - ${event.title}`));
    writeTitle('Souvenirs');
    snapshot.memories.slice(0, 20).forEach(memory => {
      const profile = profileById(memory.profileId);
      writeLine(`${profile?.displayName || 'Famille'} - ${memory.title} : ${memory.note}`);
    });
    doc.save(`livret-racines-${familyName.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.pdf`);
  };

  const renderView = () => {
    if (loading) return <LoadingGrid />;
    if (view === 'arbre') {
      return (
        <div className="space-y-5">
          {canManage && (localProfiles.length < 2 || snapshot.relationships.length === 0) && (
            <section className="roots-card border-[#00D26A]/22 bg-[#00D26A]/7 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00D26A]/12 text-[#00D26A]"><Sparkles className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <h2 className="roots-title">Construire l’arbre pas à pas</h2>
                  <p className="roots-muted mt-1">Ajoutez d’abord parents, enfants, frères et sœurs autour d’une personne de départ.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setGuideOpen(true)} className="roots-action roots-action-green"><UserPlus className="h-4 w-4" /> Assistant</button>
                    <button type="button" onClick={() => setProfileOpen(true)} className="roots-action"><Plus className="h-4 w-4" /> Ajout libre</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="roots-card roots-tree-shell overflow-hidden p-3 sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="roots-title">Arbre familial</h2>
                <p className="roots-muted">{localProfiles.length + remoteProfiles.length} personnes visibles · {confirmedConnections.length} branche{confirmedConnections.length > 1 ? 's' : ''} liée{confirmedConnections.length > 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={treeLinkProfileId} onChange={event => setTreeLinkProfileId(event.target.value)} className="roots-view-select">
                  <option value="">Vue globale</option>
                  {allTreeProfiles.map(profile => <option key={profile.id} value={profile.id}>Autour de {profile.displayName}</option>)}
                </select>
                <button type="button" onClick={() => setReadingOpen(true)} className="roots-fullscreen-button" aria-label="Lire en plein écran"><Maximize2 className="h-4 w-4" /><span>Plein écran</span></button>
                <div className="flex rounded-2xl border border-white/8 bg-white/5 p-1">
                  <button type="button" onClick={() => setTreeZoom(value => Math.max(0.8, Number((value - 0.1).toFixed(1))))} className="roots-icon-button" aria-label="Réduire"><Minus className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setTreeZoom(value => Math.min(1.4, Number((value + 0.1).toFixed(1))))} className="roots-icon-button" aria-label="Agrandir"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <label className="roots-search-pill roots-search-compact sm:col-span-2">
                <input value={treeSearch} onChange={event => setTreeSearch(event.target.value)} placeholder="Rechercher une personne, une ville..." />
                <Search className="h-4 w-4" />
              </label>
              <select value={treeBranchFilter} onChange={event => setTreeBranchFilter(event.target.value as 'all' | FamilyBranch)} className="root-input">
                <option value="all">Toutes les branches</option>
                {Object.entries(branchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={treeGenerationFilter} onChange={event => setTreeGenerationFilter(event.target.value)} className="root-input">
                {generationOptions.map(option => <option key={option} value={option}>{option === 'all' ? 'Toutes les générations' : option === '0' ? 'Origines proches' : `Génération ${Number(option) + 1}`}</option>)}
              </select>
              <select value={treePlaceFilter} onChange={event => setTreePlaceFilter(event.target.value)} className="root-input sm:col-span-4">
                {places.map(place => <option key={place} value={place}>{place === 'all' ? 'Tous les lieux déclarés' : place}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="family-tree-canvas min-w-[720px] space-y-8 px-3 py-4" style={{ transform: `scale(${treeZoom})`, transformOrigin: 'top left', width: `${100 / treeZoom}%` }}>
                {visibleGenerations.length ? visibleGenerations.map(group => (
                  <TreeGeneration
                    key={group.generation}
                    group={group}
                    isFirst={group.generation === visibleGenerations[0]?.generation}
                    canManage={canManage}
                    relationshipPreviewsByProfile={relationshipPreviewsByProfile}
                    onProfileClick={profile => canManage && profile.isLocal && setEditingProfile(profile)}
                  />
                )) : <div className="max-w-sm"><EmptyState icon={<Search className="h-8 w-8" />} text="Aucune fiche ne correspond aux filtres." /></div>}
              </div>
            </div>
            {visibleRelationshipSummaries.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {visibleRelationshipSummaries.slice(0, 4).map(link => (
                  <div key={`${link.id}-${link.sourceName}-${link.targetName}`} className={`roots-link-summary ${relationshipPreviewTone(link.type)}`}>
                    <span>{relationshipLabels[link.type]}</span>
                    <strong>{link.sourceName} · {link.targetName}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            {canManage && <button type="button" onClick={() => setProfileOpen(true)} className="roots-action roots-action-green"><Plus className="h-4 w-4" /> Ajouter une personne</button>}
            {canManage && <button type="button" onClick={() => setLinkOpen(true)} className="roots-action roots-action-violet"><Link2 className="h-4 w-4" /> Lier une nouvelle branche</button>}
          </div>

          {highlightedEvent && (
            <section className="roots-card roots-event-strip flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF4D6D]/10 text-[#FF4D6D]"><CalendarDays className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <span className="roots-kicker">Événement à venir</span>
                <strong className="mt-1 block truncate text-sm font-black text-white">{highlightedEvent.event.title}</strong>
                <p className="roots-muted">{formatDate(highlightedEvent.date.toISOString().slice(0, 10))}</p>
              </div>
              <span className="rounded-full bg-[#6C5CFF]/10 px-3 py-2 text-[11px] font-black text-[#6C5CFF]">{highlightedEvent.days} j</span>
            </section>
          )}

          {warnings.length > 0 && (
            <section className="roots-card border-[#FFB020]/25 bg-[#FFB020]/8 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB020]" />
                <div className="min-w-0 flex-1">
                  <h2 className="roots-title">À vérifier</h2>
                  <div className="mt-3 space-y-2">
                    {warnings.map(warning => <p key={warning} className="rounded-2xl bg-black/10 px-3 py-2 text-xs font-semibold text-white/65">{warning}</p>)}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="roots-card p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#00D26A]" />
              <div>
                <strong className="roots-title">Vie privée par défaut</strong>
                <p className="roots-muted mt-1">Les mineurs restent privés, les coordonnées ne sont jamais copiées, et chaque lien entre deux foyers doit être confirmé.</p>
              </div>
            </div>
          </section>
        </div>
      );
    }

    if (view === 'carte') {
      return (
        <div className="space-y-4">
          <HeroNotice icon={<Earth className="h-5 w-5" />} title="Carte déclarative" text="Cette vue utilise uniquement les pays et villes saisis dans les fiches. Aucune position GPS n’est demandée." />
          <div className="grid gap-3">
            {countries.map(([place, profiles]) => (
              <section key={place} className="roots-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4F8CFF]/14 text-[#7FB0FF]"><MapPin className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <h2 className="roots-title truncate">{place}</h2>
                      <p className="roots-muted">{profiles.length} personne{profiles.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/6 px-3 py-1 text-[10px] font-black text-white/50">{profiles.filter(profile => profile.isLocal).length} proches</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profiles.map(profile => <span key={profile.id} className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-[11px] font-bold text-white/65">{profile.displayName}</span>)}
                </div>
              </section>
            ))}
          </div>
        </div>
      );
    }

    if (view === 'cousins') {
      return (
        <div className="space-y-4">
          <label className="roots-search-pill">
            <input value={treeSearch} onChange={event => setTreeSearch(event.target.value)} placeholder="Rechercher un cousin, une cousine..." />
            <Search className="h-5 w-5" />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Users className="h-5 w-5" />} value={cousinProfiles.length} label="cousins" tone="violet" />
            <StatCard icon={<GitBranch className="h-5 w-5" />} value={confirmedConnections.length} label="branches liées" tone="green" />
            <StatCard icon={<Earth className="h-5 w-5" />} value={countries.filter(([place]) => place !== 'Pays non indiqué').length} label="pays" tone="blue" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['Tous', 'Proches', 'Par pays', 'Par branche'].map(filter => <span key={filter} className={`roots-filter-chip shrink-0 ${filter === 'Tous' ? 'roots-filter-chip-active' : ''}`}>{filter}</span>)}
          </div>
          <section className="roots-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="roots-title">Cousins & cousines</h2>
                <p className="roots-muted">{cousinProfiles.length} personne{cousinProfiles.length > 1 ? 's' : ''} trouvée{cousinProfiles.length > 1 ? 's' : ''}</p>
              </div>
              <Users className="h-5 w-5 text-[#6C5CFF]" />
            </div>
            {cousinProfiles.length ? (
              <div className="divide-y divide-black/6">
                {cousinProfiles.map(profile => (
                  <button key={profile.id} type="button" onClick={() => profile.isLocal && canManage && setEditingProfile(profile)} className="flex w-full items-center gap-3 py-3 text-left">
                    <MemberAvatar name={profile.displayName} photoUrl={profile.photoUrl} className="h-12 w-12 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-white">{profile.displayName}</strong>
                      <p className="mt-0.5 text-[11px] font-semibold text-white/45">{profile.originCity || profile.country || branchLabels[profile.branch]}</p>
                    </div>
                    <span className="rounded-full bg-[#6C5CFF]/8 px-3 py-2 text-[10px] font-black text-[#6C5CFF]">Voir</span>
                  </button>
                ))}
              </div>
            ) : <EmptyState icon={<Users className="h-8 w-8" />} text="Aucun cousin relié pour le moment." />}
          </section>
        </div>
      );
    }

    if (view === 'dates') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="roots-title">Dates de la famille</h2>
              <p className="roots-muted">Anniversaires, réunions et souvenirs.</p>
            </div>
            {canManage && <button type="button" onClick={() => setEventOpen(true)} className="roots-small-action"><Plus className="h-4 w-4" /> Ajouter</button>}
          </div>
          {currentMonthBirthdays.length > 0 && (
            <section className="roots-card border-[#00D26A]/18 bg-[#00D26A]/6 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="roots-title">Ce mois-ci</h2>
                  <p className="roots-muted">Anniversaires visibles dans les branches.</p>
                </div>
                <CalendarDays className="h-5 w-5 text-[#00D26A]" />
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {currentMonthBirthdays.map(event => {
                  const profile = profileById(event.profileId);
                  return <span key={event.id} className="shrink-0 rounded-2xl border border-white/8 bg-white/6 px-3 py-2 text-[11px] font-bold text-white/65">{profile?.displayName || event.title}</span>;
                })}
              </div>
            </section>
          )}
          <select value={datePlaceFilter} onChange={event => setDatePlaceFilter(event.target.value)} className="root-input">
            {places.map(place => <option key={place} value={place}>{place === 'all' ? 'Tous les lieux déclarés' : place}</option>)}
          </select>
          {filteredUpcomingEvents.length ? (
            <div className="space-y-3">
              {filteredUpcomingEvents.map(event => {
                const date = nextOccurrence(event);
                return (
                  <div key={event.id} className="roots-card flex items-center gap-4 p-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#FFB020]/12 text-[#FFB020]">
                      <span className="text-lg font-black leading-none">{date.getDate()}</span>
                      <span className="mt-1 text-[8px] font-black uppercase">{date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black text-white">{event.title}</strong>
                      <p className="mt-1 text-[10px] font-semibold text-white/45">{eventLabels[event.eventType]}{event.repeatsYearly ? ' · chaque année' : ''}{event.agendaEventId ? ' · agenda' : ''}</p>
                    </div>
                    {event.visibility === 'prive' && <LockKeyhole className="h-4 w-4 text-white/30" />}
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon={<CalendarDays className="h-8 w-8" />} text="Aucune date familiale enregistrée." />}
          {timeline.length > 0 && (
            <section className="roots-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="roots-title">Chronologie familiale</h2>
                  <p className="roots-muted">Naissances, souvenirs et moments importants.</p>
                </div>
                <History className="h-5 w-5 text-[#FFB020]" />
              </div>
              <div className="mt-4 space-y-3">
                {timeline.slice(-8).reverse().map(item => (
                  <div key={item.id} className="relative rounded-2xl border border-white/8 bg-white/5 p-3 pl-11">
                    <span className="absolute left-4 top-4 h-3 w-3 rounded-full bg-[#FFB020] shadow-[0_0_16px_rgba(255,176,32,.45)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#FFB020]">{formatDate(item.date)}</span>
                    <strong className="mt-1 block text-xs font-black text-white">{item.title}</strong>
                    {item.detail && <p className="mt-1 text-[10px] font-semibold text-white/45">{item.detail}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <BranchWorldMap countries={countries} />

        <section className="roots-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="roots-title">Liste des branches</h2>
              <p className="roots-muted">Foyers proches, branches liées et demandes en cours.</p>
            </div>
            <GitBranch className="h-5 w-5 text-[#6C5CFF]" />
          </div>
          <div className="space-y-2">
            {branchSummaries.map((item, index) => (
              <button key={item.branch} type="button" onClick={() => setSelectedBranch(item.branch)} className="roots-branch-row flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${index === 0 ? 'bg-[#6C5CFF]/10 text-[#6C5CFF]' : index === 1 ? 'bg-[#00D26A]/10 text-[#00A862]' : index === 2 ? 'bg-[#FF7A1A]/10 text-[#FF7A1A]' : 'bg-[#4F8CFF]/10 text-[#247CFF]'}`}><Users className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-black text-white">{branchLabels[item.branch]}</strong>
                  <span className="mt-0.5 block text-[11px] font-semibold text-white/45">{item.profiles.length} membre{item.profiles.length > 1 ? 's' : ''} · {item.memories.length} souvenir{item.memories.length > 1 ? 's' : ''}</span>
                </span>
                <span className="text-[10px] font-black text-[#00A862]">{index === 0 ? 'Vous' : item.profiles.length ? 'Lié' : 'À créer'}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="roots-card border-[#6C5CFF]/20 bg-[#6C5CFF]/7 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="roots-kicker text-[#9E94FF]">Invitation privée</span>
              <strong className="mt-2 block font-mono text-lg font-black tracking-wider text-white">{snapshot.shareCode || 'Migration requise'}</strong>
              {snapshot.shareCodeExpiresAt && <p className="roots-muted mt-1">Valable jusqu’au {formatDate(snapshot.shareCodeExpiresAt.slice(0, 10))}</p>}
            </div>
            {snapshot.shareCode && <button type="button" onClick={() => void copyText(snapshot.shareCode || '', 'Code Racines copié.')} className="roots-icon-button" aria-label="Copier le code"><Copy className="h-4 w-4" /></button>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void shareBranchLink()} className="roots-action"><ScanLine className="h-4 w-4" /> Partager</button>
            {canManage && <button type="button" disabled={busy} onClick={() => void regenerateCode()} className="roots-action"><RefreshCw className="h-4 w-4" /> Nouveau code</button>}
          </div>
          {canManage && <button type="button" onClick={() => setLinkOpen(true)} className="roots-solid-violet mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-black"><Plus className="h-4 w-4" /> Lier une nouvelle branche</button>}
        </section>

        <section className="roots-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="roots-title">Livret familial</h2>
              <p className="roots-muted">Exporter l’arbre ou importer une base généalogique existante.</p>
            </div>
            <FileText className="h-5 w-5 text-[#FFB020]" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => void downloadFamilyBooklet()} className="roots-action"><Download className="h-4 w-4" /> Livret PDF</button>
            <button type="button" onClick={downloadGedcom} className="roots-action"><Download className="h-4 w-4" /> GEDCOM</button>
            <label className="roots-action cursor-pointer">
              <FileUp className="h-4 w-4" /> Importer
              <input ref={importInputRef} type="file" accept=".ged,.gedcom,text/plain" className="hidden" onChange={event => void handleGedcomFile(event)} />
            </label>
          </div>
          {gedcomPreview && (
            <div className="mt-4 rounded-2xl border border-[#00D26A]/18 bg-[#00D26A]/7 p-3">
              <strong className="block text-xs font-black text-white">{gedcomPreview.people.length} personne{gedcomPreview.people.length > 1 ? 's' : ''} détectée{gedcomPreview.people.length > 1 ? 's' : ''}</strong>
              <p className="mt-1 text-[10px] font-semibold text-white/45">{gedcomPreview.links.length} lien{gedcomPreview.links.length > 1 ? 's' : ''} familial{gedcomPreview.links.length > 1 ? 'aux' : ''} prêt{gedcomPreview.links.length > 1 ? 's' : ''} à importer en privé.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setGedcomPreview(null)} className="rounded-2xl border border-white/8 bg-white/5 py-2.5 text-[10px] font-black text-white/55">Annuler</button>
                <button type="button" disabled={busy} onClick={() => void importGedcomPreview()} className="rounded-2xl bg-[#00D26A] py-2.5 text-[10px] font-black text-[#07111F]">Importer</button>
              </div>
            </div>
          )}
        </section>

        <section className="roots-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="roots-title">Discussions par branche</h2>
              <p className="roots-muted">Créez un groupe avec les membres du foyer rattachés à une branche.</p>
            </div>
            <MessageCircle className="h-5 w-5 text-[#00D26A]" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(['proche', 'paternelle', 'maternelle', 'autre'] as FamilyBranch[]).map(branch => {
              const count = localProfiles.filter(profile => profile.branch === branch && profile.memberId).length;
              return (
                <button key={branch} type="button" disabled={!canManage || !count || busy} onClick={() => void createBranchGroup(branch)} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left disabled:opacity-45">
                  <span className="min-w-0">
                    <strong className="block truncate text-xs font-black text-white">{branchLabels[branch]}</strong>
                    <span className="mt-1 block text-[10px] font-bold text-white/40">{count} membre{count > 1 ? 's' : ''}</span>
                  </span>
                  <MessageCircle className="h-4 w-4 shrink-0 text-[#00D26A]" />
                </button>
              );
            })}
          </div>
        </section>

        {pendingConnections.length > 0 && <ConnectionList
          connections={pendingConnections}
          localProfiles={localProfiles}
          profileById={profileById}
          responseProfiles={responseProfiles}
          setResponseProfiles={setResponseProfiles}
          busy={busy}
          runAction={runAction}
        />}

        <section className="roots-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="roots-title">Corrections proposées</h2>
              <p className="roots-muted">Un membre peut signaler une fiche à corriger, puis un responsable valide.</p>
            </div>
            <button type="button" onClick={() => setCorrectionOpen(true)} className="roots-icon-button" aria-label="Proposer une correction"><Plus className="h-4 w-4" /></button>
          </div>
          {snapshot.corrections.length > 0 ? (
            <div className="mt-4 space-y-2">
              {snapshot.corrections.map(request => {
                const profile = profileById(request.profileId);
                return (
                  <div key={request.id} className="rounded-2xl border border-white/8 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-xs font-black text-white">{profile?.displayName || 'Fiche familiale'} · {correctionFieldLabels[request.fieldName] || request.fieldName}</strong>
                        <p className="mt-1 text-[10px] font-bold text-white/38">{request.status === 'accepted' ? 'Correction validée' : 'À comparer avant validation'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${request.status === 'accepted' ? 'bg-[#00D26A]/14 text-[#00D26A]' : 'bg-[#FFB020]/14 text-[#FFB020]'}`}>{request.status === 'accepted' ? 'Validée' : 'En attente'}</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                        <span className="text-[9px] font-black uppercase text-white/35">Actuel</span>
                        <p className="mt-1 text-[11px] font-bold text-white/58">{request.currentValue || 'Non renseigné'}</p>
                      </div>
                      <div className="rounded-2xl border border-[#00D26A]/18 bg-[#00D26A]/7 p-3">
                        <span className="text-[9px] font-black uppercase text-[#00D26A]">Proposé</span>
                        <p className="mt-1 text-[11px] font-bold text-white/75">{request.proposedValue}</p>
                      </div>
                    </div>
                    {request.note && <p className="mt-2 rounded-2xl border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-semibold text-white/45">{request.note}</p>}
                    {canManage && request.status === 'pending' && <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled={busy} onClick={() => void runAction(() => familyRootsService.reviewCorrection(request.id, false), 'La correction a été refusée.')} className="rounded-2xl border border-white/8 bg-white/5 py-2 text-[10px] font-black text-white/55">Refuser</button>
                      <button type="button" disabled={busy} onClick={() => void runAction(() => familyRootsService.reviewCorrection(request.id, true), 'La correction a été validée.')} className="rounded-2xl bg-[#00D26A] py-2 text-[10px] font-black text-[#07111F]">Valider</button>
                    </div>}
                    {canManage && request.status === 'accepted' && <button type="button" disabled={busy} onClick={() => void runAction(() => familyRootsService.undoCorrection(request.id), 'La correction validée a été annulée.')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FFB020]/22 bg-[#FFB020]/8 py-2.5 text-[10px] font-black text-[#FFB020]"><Undo2 className="h-3.5 w-3.5" /> Annuler cette validation</button>}
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs font-semibold text-white/35">Aucune correction en attente.</p>}
        </section>

        {remoteProfiles.length > 0 && (
          <section className="roots-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="roots-title">Rapprocher deux fiches</h2>
                <p className="roots-muted">Pour signaler que deux branches parlent de la même personne.</p>
              </div>
              <Search className="h-5 w-5 text-[#9E94FF]" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <select value={identityDraft.localProfileId} onChange={event => setIdentityDraft(current => ({ ...current, localProfileId: event.target.value }))} className="root-input">{localProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select>
              <select value={identityDraft.remoteProfileId} onChange={event => setIdentityDraft(current => ({ ...current, remoteProfileId: event.target.value }))} className="root-input">{remoteProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select>
            </div>
            <button type="button" disabled={busy} onClick={() => void sendIdentityRequest()} className="mt-3 roots-action roots-action-violet"><Sparkles className="h-4 w-4" /> Demander confirmation</button>
            {identitySuggestions.length > 0 && <div className="mt-4 space-y-2">
              <span className="roots-kicker">Suggestions</span>
              {identitySuggestions.map(suggestion => (
                <button key={`${suggestion.local.id}-${suggestion.remote.id}`} type="button" onClick={() => setIdentityDraft({ localProfileId: suggestion.local.id, remoteProfileId: suggestion.remote.id })} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-left">
                  <span className="min-w-0 text-[11px] font-bold text-white/65">{suggestion.local.displayName} ↔ {suggestion.remote.displayName}</span>
                  <span className="shrink-0 text-[9px] font-black text-[#9E94FF]">{suggestion.reason}</span>
                </button>
              ))}
            </div>}
          </section>
        )}

        {incomingIdentity.length > 0 && <IdentityList requests={incomingIdentity} profileById={profileById} busy={busy} runAction={runAction} />}

        <section className="space-y-3">
          <h2 className="roots-kicker">Branches confirmées</h2>
          {confirmedConnections.length ? confirmedConnections.map(connection => (
            <div key={connection.id} className="roots-card flex items-center gap-3 border-[#00D26A]/18 bg-[#00D26A]/6 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00D26A]/12 text-[#00D26A]"><GitBranch className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <strong className="text-sm font-black text-white">Branche familiale reliée</strong>
                <p className="mt-1 text-[10px] font-semibold text-white/45">{relationshipLabels[connection.relationshipType]} · confirmé</p>
              </div>
              <Check className="h-4 w-4 text-[#00D26A]" />
            </div>
          )) : <EmptyState icon={<GitBranch className="h-8 w-8" />} text="Aucune autre branche reliée pour le moment." />}
        </section>

        {snapshot.validationLogs.length > 0 && <section className="roots-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="roots-title">Historique de confiance</h2>
              <p className="roots-muted">Les validations importantes restent visibles pour le foyer.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-[#00D26A]" />
          </div>
          <div className="mt-4 space-y-2">
            {snapshot.validationLogs.map(log => (
              <div key={log.id} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                <strong className="block text-[11px] font-black text-white">{log.summary}</strong>
                <p className="mt-1 text-[10px] font-semibold text-white/40">{formatDate(log.createdAt.slice(0, 10))}</p>
              </div>
            ))}
          </div>
        </section>}
      </div>
    );
  };

  return (
    <div className="family-roots space-y-6 pb-20 premium-glow-green">
      <header className="roots-main-header flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl border border-[#00D26A]/25 bg-[#00D26A]/10 p-3 text-[#00D26A]"><TreePine className="h-6 w-6" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-white">Racines familiales</h1>
            <p className="mt-0.5 text-xs font-semibold text-white/50">{familyName} · {localProfiles.length + remoteProfiles.length} personnes visibles</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} aria-label="Actualiser" className="roots-icon-button"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </header>

      <div className="roots-tabs flex gap-2 overflow-x-auto pb-1">
        <TabButton active={view === 'arbre'} onClick={() => setView('arbre')} icon={<TreePine className="h-4 w-4" />} label="Arbre" />
        <TabButton active={view === 'cousins'} onClick={() => setView('cousins')} icon={<Users className="h-4 w-4" />} label="Cousins" />
        <TabButton active={view === 'branches'} onClick={() => setView('branches')} icon={<Link2 className="h-4 w-4" />} label="Branches" badge={incomingConnections.length + incomingIdentity.length} />
        <TabButton active={view === 'carte'} onClick={() => setView('carte')} icon={<Earth className="h-4 w-4" />} label="Carte" />
        <TabButton active={view === 'dates'} onClick={() => setView('dates')} icon={<CalendarDays className="h-4 w-4" />} label="Événements" />
      </div>

      {notice && <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 px-4 py-3 text-xs font-semibold text-white/75"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Fermer"><X className="h-4 w-4" /></button></div>}

      {internalNotifications.length > 0 && (
        <section className="roots-card border-[#FFB020]/24 bg-[#FFB020]/7 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFB020]/12 text-[#FFB020]"><Bell className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="roots-title">À traiter</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {internalNotifications.map(item => <button key={item} type="button" onClick={() => setView('branches')} className="rounded-full border border-white/8 bg-white/6 px-3 py-2 text-[10px] font-black text-white/65">{item}</button>)}
              </div>
            </div>
          </div>
        </section>
      )}

      {renderView()}

      {guideOpen && <GuideModal
        localProfiles={localProfiles}
        guideDraft={guideDraft}
        setGuideDraft={setGuideDraft}
        busy={busy}
        onAdd={() => addGuidedRelative()}
        onClose={() => setGuideOpen(false)}
      />}

      {readingOpen && <ReadingMode
        familyName={familyName}
        generations={generations}
        relationshipPreviewsByProfile={relationshipPreviewsByProfile}
        visibleRelationshipSummaries={visibleRelationshipSummaries}
        onClose={() => setReadingOpen(false)}
      />}

      {editingProfile && <ProfileModal
        profile={editingProfile}
        setProfile={setEditingProfile}
        localProfiles={localProfiles}
        editableLinks={editableRelationshipsByProfile.get(editingProfile.id) || []}
        memories={snapshot.memories.filter(memory => memory.profileId === editingProfile.id)}
        memoryDraft={memoryDraft}
        setMemoryDraft={setMemoryDraft}
        relationType={relationType}
        setRelationType={setRelationType}
        relationTargetId={relationTargetId}
        setRelationTargetId={setRelationTargetId}
        busy={busy}
        photoUploading={photoUploading}
        canAddRelationship={snapshot.cloudEnabled && localProfiles.length > 1}
        onSave={saveProfile}
        onClose={() => setEditingProfile(null)}
        onAddRelationship={addInternalRelationship}
        onDeleteRelationship={deleteInternalRelationship}
        onAddMemory={() => addMemory(editingProfile.id)}
        onUploadProfilePhoto={uploadEditedProfilePhoto}
        onUploadMemoryPhoto={uploadMemoryPhoto}
      />}

      {selectedBranch && <BranchModal
        branch={selectedBranch}
        summary={branchSummaries.find(item => item.branch === selectedBranch)}
        onClose={() => setSelectedBranch(null)}
        onCreateGroup={() => void createBranchGroup(selectedBranch)}
        canManage={canManage}
        busy={busy}
      />}

      {correctionOpen && <Modal title="Proposer une correction" onClose={() => setCorrectionOpen(false)}>
        <div className="space-y-4">
          <Field label="Fiche concernée"><select value={correctionDraft.profileId} onChange={event => setCorrectionDraft({ ...correctionDraft, profileId: event.target.value })} className="root-input"><option value="">Choisir une fiche</option>{snapshot.profiles.filter(profile => profile.visibility !== 'masque').map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></Field>
          <Field label="Élément à corriger"><select value={correctionDraft.fieldName} onChange={event => setCorrectionDraft({ ...correctionDraft, fieldName: event.target.value })} className="root-input">{Object.entries(correctionFieldLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Correction proposée"><input value={correctionDraft.proposedValue} onChange={event => setCorrectionDraft({ ...correctionDraft, proposedValue: event.target.value })} className="root-input" /></Field>
          <Field label="Précision facultative"><textarea value={correctionDraft.note} onChange={event => setCorrectionDraft({ ...correctionDraft, note: event.target.value })} rows={3} className="root-input min-h-[96px] py-3" /></Field>
          <button type="button" disabled={busy} onClick={() => void requestCorrection()} className="roots-solid-violet w-full rounded-2xl py-3.5 text-xs font-black">Envoyer la correction</button>
        </div>
      </Modal>}

      {profileOpen && <Modal title="Ajouter une personne" onClose={() => setProfileOpen(false)}>
        <div className="space-y-4">
          <Field label="Prénom et nom"><input value={profileDraft.name} onChange={event => setProfileDraft({ ...profileDraft, name: event.target.value })} placeholder="Ex. Prénom Nom" className="root-input" /></Field>
          <Field label="Surnom"><input value={profileDraft.nickname} onChange={event => setProfileDraft({ ...profileDraft, nickname: event.target.value })} placeholder="Facultatif" className="root-input" /></Field>
          <PhotoPicker
            label="Photo de la personne"
            name={profileDraft.name}
            photoUrl={profileDraft.photoUrl}
            uploading={photoUploading}
            onSelect={uploadNewProfilePhoto}
            onClear={() => setProfileDraft(current => ({ ...current, photoUrl: '' }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Branche"><select value={profileDraft.branch} onChange={event => setProfileDraft({ ...profileDraft, branch: event.target.value as FamilyBranch })} className="root-input">{Object.entries(branchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Pays"><input value={profileDraft.country} onChange={event => setProfileDraft({ ...profileDraft, country: event.target.value })} placeholder="Ex. Sénégal" className="root-input" /></Field>
          </div>
          <Field label="Ville d’origine"><input value={profileDraft.originCity} onChange={event => setProfileDraft({ ...profileDraft, originCity: event.target.value })} placeholder="Facultatif" className="root-input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Naissance"><input type="date" value={profileDraft.birthDate} onChange={event => setProfileDraft({ ...profileDraft, birthDate: event.target.value })} className="root-input" /></Field>
            <Field label="Souvenir"><input type="date" value={profileDraft.deathDate} onChange={event => setProfileDraft({ ...profileDraft, deathDate: event.target.value, isMemorial: Boolean(event.target.value) })} className="root-input" /></Field>
          </div>
          <Field label="Langues parlées"><input value={profileDraft.languages} onChange={event => setProfileDraft({ ...profileDraft, languages: event.target.value })} placeholder="Français, wolof, soninké…" className="root-input" /></Field>
          <Field label="Petite histoire"><textarea value={profileDraft.bio} onChange={event => setProfileDraft({ ...profileDraft, bio: event.target.value })} rows={3} placeholder="Un souvenir, une origine, une anecdote…" className="root-input min-h-[96px] py-3" /></Field>
          <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4 text-xs font-bold text-white/70"><span>Cette personne est mineure</span><input type="checkbox" checked={profileDraft.isMinor} onChange={event => setProfileDraft({ ...profileDraft, isMinor: event.target.checked, visibility: event.target.checked ? 'prive' : profileDraft.visibility, sharedFields: defaultSharedFields(event.target.checked) })} className="h-5 w-5 accent-[#00D26A]" /></label>
          <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4 text-xs font-bold text-white/70"><span>Mode souvenir</span><input type="checkbox" checked={profileDraft.isMemorial} onChange={event => setProfileDraft({ ...profileDraft, isMemorial: event.target.checked })} className="h-5 w-5 accent-[#FFB020]" /></label>
          <VisibilityPicker value={profileDraft.visibility} isMinor={profileDraft.isMinor} onChange={visibility => setProfileDraft({ ...profileDraft, visibility })} />
          <SharedFieldsPicker profile={{
            id: 'draft',
            foyerId,
            displayName: profileDraft.name || 'Nouvelle personne',
            birthDate: profileDraft.birthDate || undefined,
            branch: profileDraft.branch,
            country: profileDraft.country || undefined,
            originCity: profileDraft.originCity || undefined,
            nickname: profileDraft.nickname || undefined,
            bio: profileDraft.bio || undefined,
            languages: profileDraft.languages.split(',').map(item => item.trim()).filter(Boolean),
            isMinor: profileDraft.isMinor,
            visibility: profileDraft.visibility,
            isLocal: true,
            photoUrl: profileDraft.photoUrl || undefined,
            isMemorial: profileDraft.isMemorial,
            deathDate: profileDraft.deathDate || undefined,
            sharedFields: profileDraft.sharedFields
          }} onChange={sharedFields => setProfileDraft({ ...profileDraft, sharedFields })} />
          <button type="button" disabled={busy} onClick={() => void addProfile()} className="w-full rounded-2xl bg-[#00D26A] py-3.5 text-xs font-black text-[#07111F]">Ajouter à l’arbre</button>
        </div>
      </Modal>}

      {linkOpen && <Modal title="Relier une autre branche" onClose={() => setLinkOpen(false)}>
        <div className="space-y-4">
          <Field label="Code ou lien reçu"><input value={targetCode} onChange={event => setTargetCode(event.target.value.toUpperCase().replace(/^.*RAC-/, 'RAC-'))} placeholder="RAC-XXXXXXX" className="root-input font-mono uppercase" /></Field>
          <Field label="Membre qui crée le lien"><select value={sourceProfileId} onChange={event => setSourceProfileId(event.target.value)} className="root-input">{localProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></Field>
          <Field label="Lien familial"><select value={relationshipType} onChange={event => setRelationshipType(event.target.value as FamilyRelationshipType)} className="root-input">{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <HeroNotice icon={<ShieldCheck className="h-4 w-4" />} title="Double confirmation" text="La branche invitée choisira le membre correspondant et confirmera le lien avant tout affichage partagé." compact />
          <button type="button" disabled={busy} onClick={() => void sendConnection()} className="roots-solid-violet flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black"><Send className="h-4 w-4" /> Envoyer la demande</button>
        </div>
      </Modal>}

      {eventOpen && <Modal title="Ajouter une date familiale" onClose={() => setEventOpen(false)}>
        <div className="space-y-4">
          <Field label="Titre"><input value={eventDraft.title} onChange={event => setEventDraft({ ...eventDraft, title: event.target.value })} placeholder="Ex. Réunion de famille" className="root-input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" value={eventDraft.date} onChange={event => setEventDraft({ ...eventDraft, date: event.target.value })} className="root-input" /></Field>
            <Field label="Type"><select value={eventDraft.type} onChange={event => setEventDraft({ ...eventDraft, type: event.target.value as FamilyTreeEvent['eventType'] })} className="root-input">{Object.entries(eventLabels).filter(([value]) => value !== 'anniversaire').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          </div>
          <Field label="Personne concernée"><select value={eventDraft.profileId} onChange={event => setEventDraft({ ...eventDraft, profileId: event.target.value })} className="root-input"><option value="">Toute la famille</option>{localProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></Field>
          <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4 text-xs font-bold text-white/70"><span>Répéter chaque année</span><input type="checkbox" checked={eventDraft.repeats} onChange={event => setEventDraft({ ...eventDraft, repeats: event.target.checked })} className="h-5 w-5 accent-[#FFB020]" /></label>
          <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4 text-xs font-bold text-white/70"><span>Afficher aussi dans l’agenda</span><input type="checkbox" checked={eventDraft.agenda} onChange={event => setEventDraft({ ...eventDraft, agenda: event.target.checked })} className="h-5 w-5 accent-[#00D26A]" /></label>
          <button type="button" disabled={busy} onClick={() => void addEvent()} className="w-full rounded-2xl bg-[#FFB020] py-3.5 text-xs font-black text-[#101426]">Ajouter la date</button>
        </div>
      </Modal>}

      <style>{`
        .family-roots .roots-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);border-radius:26px}
        .family-roots .roots-title{font-size:14px;font-weight:900;color:white}
        .family-roots .roots-muted{font-size:11px;font-weight:700;line-height:1.55;color:rgba(255,255,255,.48)}
        .family-roots .roots-kicker{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.46)}
        .family-roots .roots-icon-button{display:flex;height:44px;width:44px;align-items:center;justify-content:center;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);color:rgba(255,255,255,.65)}
        .family-roots .roots-fullscreen-button{display:flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border-radius:16px;border:1px solid rgba(108,92,255,.25);background:rgba(108,92,255,.12);padding:0 12px;color:#C9C3FF;font-size:11px;font-weight:900}
        .family-roots .roots-action{display:flex;min-height:46px;align-items:center;justify-content:center;gap:8px;border-radius:16px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.055);padding:0 12px;font-size:11px;font-weight:900;color:rgba(255,255,255,.7)}
        .family-roots .roots-action-green{border-color:rgba(0,210,106,.25);background:rgba(0,210,106,.08);color:#00D26A;width:100%}
        .family-roots .roots-action-violet{border-color:rgba(108,92,255,.3);background:rgba(108,92,255,.13);color:#b8b0ff;width:100%}
        .family-roots .roots-solid-violet{background:#6C5CFF;color:#fff;box-shadow:0 14px 34px rgba(108,92,255,.22)}
        .family-roots .roots-small-action{display:flex;height:44px;align-items:center;gap:8px;border-radius:16px;background:#FFB020;padding:0 14px;font-size:11px;font-weight:900;color:#101426}
        .family-roots .roots-main-header{border-radius:28px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.025));padding:14px}
        .family-roots .roots-tabs{border-radius:24px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);padding:6px}
        .family-roots .roots-tab{border-color:transparent;background:transparent;color:rgba(255,255,255,.56)}
        .family-roots .roots-tab-active{border-color:rgba(108,92,255,.24);background:rgba(108,92,255,.16);color:#C9C3FF;box-shadow:0 12px 30px rgba(108,92,255,.14)}
        .family-roots .roots-view-select{min-height:44px;max-width:170px;border-radius:16px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.055);padding:0 12px;color:rgba(255,255,255,.72);font-size:11px;font-weight:900;outline:none}
        .family-roots .roots-search-pill{display:flex;min-height:56px;align-items:center;gap:10px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.055);padding:0 16px;color:rgba(255,255,255,.45)}
        .family-roots .roots-search-compact{min-height:48px;border-radius:16px}
        .family-roots .roots-search-pill input{min-width:0;flex:1;background:transparent;color:white;font-size:13px;font-weight:700;outline:none}
        .family-roots .roots-filter-chip{border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);padding:9px 16px;font-size:11px;font-weight:900;color:rgba(255,255,255,.56)}
        .family-roots .roots-filter-chip-active{border-color:rgba(108,92,255,.28);background:rgba(108,92,255,.16);color:#C9C3FF}
        .family-roots .roots-branch-row{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);box-shadow:0 14px 34px rgba(0,0,0,.14)}
        .family-roots .roots-world-map{background:radial-gradient(circle at 28% 44%,rgba(0,210,106,.18),transparent 7%),radial-gradient(circle at 51% 40%,rgba(108,92,255,.22),transparent 8%),radial-gradient(circle at 76% 52%,rgba(79,140,255,.20),transparent 8%),linear-gradient(135deg,rgba(79,140,255,.14),rgba(255,255,255,.03) 42%,rgba(0,210,106,.10));}
        .family-roots .roots-world-map:before{content:"";position:absolute;inset:56px 18px 18px;border-radius:28px;background:linear-gradient(115deg,transparent 0 18%,rgba(255,255,255,.08) 18% 19%,transparent 19% 36%,rgba(255,255,255,.07) 36% 37%,transparent 37% 100%);opacity:.7}
        .family-roots .roots-world-map:after{content:"";position:absolute;left:21%;right:18%;top:48%;height:2px;border-top:2px dashed rgba(108,92,255,.38);transform:rotate(-6deg);transform-origin:center}
        .family-roots .roots-map-point{position:absolute;z-index:2;display:flex;align-items:center;gap:8px;transform:translate(-50%,-50%);border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(7,17,31,.88);padding:6px 9px;box-shadow:0 14px 32px rgba(0,0,0,.22);font-size:10px;font-weight:900;color:white;white-space:nowrap}
        .family-roots .roots-map-green span{color:#00D26A}.family-roots .roots-map-violet span{color:#C9C3FF}.family-roots .roots-map-orange span{color:#FFB020}.family-roots .roots-map-blue span{color:#7FB0FF}
        .family-roots .roots-tree-shell{background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))}
        .family-roots .family-tree-canvas{position:relative;border-radius:28px;background:radial-gradient(circle at 50% 0%,rgba(0,210,106,.12),transparent 32%),radial-gradient(circle at 20% 16%,rgba(108,92,255,.12),transparent 24%),linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015))}
        .family-roots .family-tree-canvas:before{content:"";position:absolute;left:50%;top:28px;bottom:28px;width:2px;background:linear-gradient(180deg,rgba(0,210,106,.45),rgba(108,92,255,.18));transform:translateX(-50%);border-radius:999px}
        .family-roots .roots-tree-generation{padding-top:10px}
        .family-roots .roots-tree-stem{position:absolute;left:50%;top:-24px;height:28px;width:2px;transform:translateX(-50%);background:rgba(0,210,106,.35)}
        .family-roots .roots-tree-row:before{content:"";position:absolute;left:10%;right:10%;top:-8px;height:2px;background:linear-gradient(90deg,transparent,rgba(0,210,106,.34),transparent);border-radius:999px}
        .family-roots .roots-tree-generation-wide .roots-tree-row{gap:22px}
        .family-roots .roots-tree-node{isolation:isolate;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .family-roots .roots-tree-node:not(:disabled):active{transform:scale(.985)}
        .family-roots .roots-tree-node:not(:disabled):hover{border-color:rgba(0,210,106,.25);box-shadow:0 22px 60px rgba(0,0,0,.24)}
        .family-roots .roots-tree-node:before{content:"";position:absolute;left:50%;top:-14px;height:14px;width:2px;transform:translateX(-50%);background:rgba(0,210,106,.34)}
        .family-roots .roots-tree-dot{position:absolute;left:50%;top:-18px;height:9px;width:9px;transform:translateX(-50%);border-radius:999px;background:#00D26A;box-shadow:0 0 18px rgba(0,210,106,.55)}
        .family-roots .roots-relation-chip{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:6px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.055);padding:5px 7px;text-align:left}
        .family-roots .roots-relation-chip span{min-width:0;color:rgba(255,255,255,.42);font-size:8px;font-weight:900;text-transform:uppercase}
        .family-roots .roots-relation-chip strong{min-width:0;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.72);font-size:9px;font-weight:900}
        .family-roots .roots-link-summary{display:flex;min-height:54px;flex-direction:column;justify-content:center;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);padding:10px 12px}
        .family-roots .roots-link-summary span{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
        .family-roots .roots-link-summary strong{margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.74);font-size:11px;font-weight:900}
        .family-roots .roots-link-green span{color:#00D26A}.family-roots .roots-link-violet span{color:#C9C3FF}.family-roots .roots-link-blue span{color:#7FB0FF}.family-roots .roots-link-amber span{color:#FFB020}
        .root-input{width:100%;min-height:48px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:#101c34;padding:0 14px;color:white;font-size:12px;font-weight:700;outline:none}
        textarea.root-input{resize:vertical}
        .root-input:focus{border-color:rgba(108,92,255,.6)}
        .theme-light .family-roots .roots-card{background:#fff;border-color:rgba(24,32,51,.12)}
        .theme-light .family-roots [class*="text-white"], .theme-light .family-roots .roots-title{color:#182033!important}
        .theme-light .family-roots .roots-muted, .theme-light .family-roots .roots-kicker{color:rgba(24,32,51,.58)!important}
        .theme-light .family-roots .root-input{background:#fff;color:#182033;border-color:rgba(24,32,51,.16)}
        .theme-light .family-roots .roots-icon-button,.theme-light .family-roots .roots-action{background:#f5f7fb;border-color:rgba(24,32,51,.12);color:#243047}
        .theme-light .family-roots .roots-fullscreen-button{background:#F0EAFF;border-color:#DCD0FF;color:#5B35D5}
        .theme-light .family-roots .roots-solid-violet{background:#6C5CFF!important;color:#fff!important}
        .theme-light .family-roots .roots-main-header,.theme-light .family-roots .roots-tabs,.theme-light .family-roots .roots-branch-row,.theme-light .family-roots .roots-search-pill{background:#fff;border-color:rgba(24,32,51,.10);box-shadow:0 14px 38px rgba(24,32,51,.06)}
        .theme-light .family-roots .roots-tab{color:#4B5565}.theme-light .family-roots .roots-tab-active{background:#F0EAFF;color:#5B35D5;border-color:#DCD0FF}
        .theme-light .family-roots .roots-view-select,.theme-light .family-roots .roots-search-pill input{background:#fff;color:#182033;border-color:rgba(24,32,51,.12)}
        .theme-light .family-roots .roots-filter-chip{background:#fff;color:#667085;border-color:rgba(24,32,51,.10)}.theme-light .family-roots .roots-filter-chip-active{background:#F0EAFF;color:#5B35D5;border-color:#DCD0FF}
        .theme-light .family-roots .roots-map-point{background:#fff;color:#182033;border-color:rgba(24,32,51,.10)}
        .theme-light .family-roots .roots-relation-chip,.theme-light .family-roots .roots-link-summary{background:#fff;border-color:rgba(24,32,51,.10)}
        .theme-light .family-roots .roots-relation-chip span{color:rgba(24,32,51,.46)}.theme-light .family-roots .roots-relation-chip strong,.theme-light .family-roots .roots-link-summary strong{color:#182033}
        .theme-light .family-roots .roots-world-map{background:radial-gradient(circle at 28% 44%,rgba(0,210,106,.16),transparent 7%),radial-gradient(circle at 51% 40%,rgba(108,92,255,.16),transparent 8%),radial-gradient(circle at 76% 52%,rgba(79,140,255,.16),transparent 8%),linear-gradient(135deg,#EEF8FF,#fff 48%,#F0FFF8)}
        .theme-light .family-roots .roots-tree-shell{background:#fff}
        .theme-light .family-roots .family-tree-canvas{background:linear-gradient(180deg,#f7fbf8,#fff)}
        .theme-light .family-roots .roots-tree-node{background:linear-gradient(145deg,#fff,#F8FBFF)!important;border-color:rgba(24,32,51,.12);box-shadow:0 18px 42px rgba(24,32,51,.08)}
        .theme-light .family-roots input::placeholder{color:rgba(24,32,51,.35)}
        .theme-light .family-roots .roots-modal-panel{background:#fff;color:#182033;border-color:rgba(24,32,51,.12)}
        .theme-sepia .family-roots .roots-card{background:#fffaf0;border-color:rgba(53,47,39,.14)}
        .theme-sepia .family-roots [class*="text-white"], .theme-sepia .family-roots .roots-title{color:#352f27!important}
        .theme-sepia .family-roots .roots-muted, .theme-sepia .family-roots .roots-kicker{color:rgba(53,47,39,.6)!important}
        .theme-sepia .family-roots .root-input{background:#fffaf0;color:#352f27;border-color:rgba(53,47,39,.18)}
        .theme-sepia .family-roots .roots-icon-button,.theme-sepia .family-roots .roots-action{background:#f7ecd8;border-color:rgba(53,47,39,.14);color:#42382d}
        .theme-sepia .family-roots .roots-fullscreen-button{background:#F1E5D4;border-color:rgba(91,53,213,.22);color:#5B35D5}
        .theme-sepia .family-roots .roots-solid-violet{background:#6C5CFF!important;color:#fff!important}
        .theme-sepia .family-roots .roots-main-header,.theme-sepia .family-roots .roots-tabs,.theme-sepia .family-roots .roots-branch-row,.theme-sepia .family-roots .roots-search-pill{background:#fffaf0;border-color:rgba(53,47,39,.12);box-shadow:0 14px 38px rgba(53,47,39,.06)}
        .theme-sepia .family-roots .roots-tab{color:#6B5E50}.theme-sepia .family-roots .roots-tab-active{background:#F1E5D4;color:#5B35D5;border-color:rgba(91,53,213,.22)}
        .theme-sepia .family-roots .roots-view-select,.theme-sepia .family-roots .roots-search-pill input{background:#fffaf0;color:#352f27;border-color:rgba(53,47,39,.14)}
        .theme-sepia .family-roots .roots-filter-chip{background:#fffaf0;color:#6B5E50;border-color:rgba(53,47,39,.12)}.theme-sepia .family-roots .roots-filter-chip-active{background:#F1E5D4;color:#5B35D5;border-color:rgba(91,53,213,.22)}
        .theme-sepia .family-roots .roots-map-point{background:#fffaf0;color:#352f27;border-color:rgba(53,47,39,.14)}
        .theme-sepia .family-roots .roots-relation-chip,.theme-sepia .family-roots .roots-link-summary{background:#fffaf0;border-color:rgba(53,47,39,.13)}
        .theme-sepia .family-roots .roots-relation-chip span{color:rgba(53,47,39,.5)}.theme-sepia .family-roots .roots-relation-chip strong,.theme-sepia .family-roots .roots-link-summary strong{color:#352f27}
        .theme-sepia .family-roots .roots-world-map{background:linear-gradient(135deg,#F5EBD8,#FFFAF0 48%,#EEF8E8)}
        .theme-sepia .family-roots .roots-tree-shell{background:#fffaf0}
        .theme-sepia .family-roots .family-tree-canvas{background:linear-gradient(180deg,#f8efd9,#fffaf0)}
        .theme-sepia .family-roots .roots-tree-node{background:linear-gradient(145deg,#fffaf0,#f8ecd7)!important;border-color:rgba(53,47,39,.14);box-shadow:0 18px 42px rgba(53,47,39,.08)}
        .theme-sepia .family-roots input::placeholder{color:rgba(53,47,39,.4)}
        .theme-sepia .family-roots .roots-modal-panel{background:#fffaf0;color:#352f27;border-color:rgba(53,47,39,.14)}
      `}</style>
    </div>
  );
}

function TreeGeneration({
  group,
  isFirst,
  canManage,
  relationshipPreviewsByProfile,
  fullScreen = false,
  onProfileClick
}: {
  group: GenerationGroup;
  isFirst: boolean;
  canManage: boolean;
  relationshipPreviewsByProfile: Map<string, RelationshipPreview[]>;
  fullScreen?: boolean;
  onProfileClick: (profile: FamilyTreeProfile) => void;
}) {
  return (
    <section className={`roots-tree-generation relative ${fullScreen ? 'roots-tree-generation-wide' : ''}`}>
      {!isFirst && <span className="roots-tree-stem" aria-hidden="true" />}
      <div className="mb-3 flex items-center justify-center">
        <span className="rounded-full border border-[#00D26A]/22 bg-[#00D26A]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#00D26A]">
          {group.generation === 0 ? 'Origines proches' : `Génération ${group.generation + 1}`}
        </span>
      </div>
      <div className="roots-tree-row relative flex flex-wrap justify-center gap-4">
        {group.people.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            variant="tree"
            links={relationshipPreviewsByProfile.get(profile.id)}
            fullScreen={fullScreen}
            onClick={() => onProfileClick(profile)}
            disabled={!canManage || !profile.isLocal}
          />
        ))}
      </div>
    </section>
  );
}

function ProfileCard({
  profile,
  onClick,
  variant = 'list',
  disabled = false,
  links = [],
  fullScreen = false
}: {
  profile: FamilyTreeProfile;
  onClick?: () => void;
  variant?: 'list' | 'tree';
  disabled?: boolean;
  links?: RelationshipPreview[];
  fullScreen?: boolean;
}) {
  const branchTone = profile.branch === 'paternelle'
    ? 'from-[#4F8CFF]/24 to-[#102846]'
    : profile.branch === 'maternelle'
      ? 'from-[#FF4D6D]/18 to-[#221428]'
      : profile.branch === 'autre'
        ? 'from-[#FFB020]/18 to-[#221B10]'
        : 'from-[#00D26A]/18 to-[#10251C]';

  if (variant === 'tree') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`roots-tree-node relative flex ${fullScreen ? 'min-h-[178px] w-[188px]' : 'min-h-[164px] w-[174px]'} flex-col items-center justify-start rounded-[30px] border border-white/10 bg-gradient-to-br ${branchTone} p-3 text-center shadow-[0_18px_50px_rgba(0,0,0,.18)] disabled:cursor-default`}
      >
        <span className="roots-tree-dot" aria-hidden="true" />
        <MemberAvatar name={profile.displayName} photoUrl={profile.photoUrl} className={`${fullScreen ? 'h-20 w-20' : 'h-16 w-16'} rounded-full ring-4 ring-white/10`} />
        <strong className="mt-3 line-clamp-2 text-sm font-black leading-4 text-white">{profileLabel(profile)}</strong>
        <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-white/48">{profile.originCity || profile.country || branchLabels[profile.branch]}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {profile.birthDate && <span className="rounded-full bg-white/8 px-2 py-1 text-[9px] font-black text-white/50">{new Date(`${profile.birthDate}T12:00:00`).getFullYear()}</span>}
          {profile.isMinor && <span className="rounded-full bg-[#00D26A]/14 px-2 py-1 text-[9px] font-black text-[#00D26A]">Protégé</span>}
          {profile.isMemorial && <span className="rounded-full bg-[#FFB020]/14 px-2 py-1 text-[9px] font-black text-[#FFB020]">Souvenir</span>}
        </div>
        {links.length > 0 && (
          <div className="mt-3 flex w-full flex-col gap-1.5">
            {links.slice(0, 2).map(link => (
              <span key={link.id} className="roots-relation-chip">
                <span>{link.label}</span>
                <strong>{link.targetName}</strong>
              </span>
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`roots-card flex min-h-[96px] w-[205px] items-center gap-3 p-3 text-left ${profile.isMemorial ? 'border-[#FFB020]/28 bg-[#FFB020]/7' : ''}`}>
      <MemberAvatar name={profile.displayName} photoUrl={profile.photoUrl} className="h-12 w-12 shrink-0" />
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-black text-white">{profileLabel(profile)}</strong>
        <p className="mt-1 truncate text-[10px] font-semibold text-white/45">{profile.originCity || profile.country || branchLabels[profile.branch]}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.isMinor && <span className="inline-flex rounded-full bg-[#00D26A]/14 px-2 py-1 text-[9px] font-black text-[#00D26A]">Protégé</span>}
          {profile.isMemorial && <span className="inline-flex rounded-full bg-[#FFB020]/14 px-2 py-1 text-[9px] font-black text-[#FFB020]">Souvenir</span>}
        </div>
      </div>
      {profile.visibility === 'famille' ? <Eye className="h-4 w-4 text-[#00D26A]" /> : <LockKeyhole className="h-4 w-4 text-[#FFB020]" />}
    </button>
  );
}

function GuideModal({
  localProfiles,
  guideDraft,
  setGuideDraft,
  busy,
  onAdd,
  onClose
}: {
  localProfiles: FamilyTreeProfile[];
  guideDraft: { baseProfileId: string; relation: 'parent' | 'fratrie' | 'enfant' | 'conjoint'; name: string; birthDate: string; branch: FamilyBranch; country: string };
  setGuideDraft: Dispatch<SetStateAction<{ baseProfileId: string; relation: 'parent' | 'fratrie' | 'enfant' | 'conjoint'; name: string; birthDate: string; branch: FamilyBranch; country: string }>>;
  busy: boolean;
  onAdd: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal title="Assistant de création" onClose={onClose}>
      <div className="space-y-4">
        <HeroNotice icon={<Sparkles className="h-4 w-4" />} title="Ajout guidé" text="Choisissez une personne déjà connue, puis ajoutez le parent, l’enfant, le conjoint ou la fratrie autour d’elle." compact />
        <Field label="Personne de départ">
          <select value={guideDraft.baseProfileId} onChange={event => setGuideDraft(current => ({ ...current, baseProfileId: event.target.value }))} className="root-input">
            {localProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}
          </select>
        </Field>
        <Field label="Lien à ajouter">
          <div className="grid grid-cols-2 gap-2">
            {([
              ['parent', 'Un parent'],
              ['enfant', 'Un enfant'],
              ['fratrie', 'Frère ou sœur'],
              ['conjoint', 'Conjoint']
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setGuideDraft(current => ({ ...current, relation: value }))} className={`min-h-12 rounded-2xl border px-2 text-[10px] font-black ${guideDraft.relation === value ? 'border-[#00D26A]/35 bg-[#00D26A]/12 text-[#00D26A]' : 'border-white/8 bg-white/4 text-white/45'}`}>
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Prénom et nom"><input value={guideDraft.name} onChange={event => setGuideDraft(current => ({ ...current, name: event.target.value }))} className="root-input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Naissance"><input type="date" value={guideDraft.birthDate} onChange={event => setGuideDraft(current => ({ ...current, birthDate: event.target.value }))} className="root-input" /></Field>
          <Field label="Pays"><input value={guideDraft.country} onChange={event => setGuideDraft(current => ({ ...current, country: event.target.value }))} className="root-input" /></Field>
        </div>
        <Field label="Branche">
          <select value={guideDraft.branch} onChange={event => setGuideDraft(current => ({ ...current, branch: event.target.value as FamilyBranch }))} className="root-input">
            {Object.entries(branchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <button type="button" disabled={busy || !guideDraft.baseProfileId || !guideDraft.name.trim()} onClick={() => void onAdd()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00D26A] py-3.5 text-xs font-black text-[#07111F]"><UserPlus className="h-4 w-4" /> Ajouter et continuer</button>
      </div>
    </Modal>
  );
}

function ReadingMode({
  familyName,
  generations,
  relationshipPreviewsByProfile,
  visibleRelationshipSummaries,
  onClose
}: {
  familyName: string;
  generations: GenerationGroup[];
  relationshipPreviewsByProfile: Map<string, RelationshipPreview[]>;
  visibleRelationshipSummaries: Array<{ id: string; type: FamilyRelationshipType; sourceName: string; targetName: string }>;
  onClose: () => void;
}) {
  return (
    <div className="family-roots fixed inset-0 z-[95] overflow-y-auto bg-[#07111F] p-4 text-white">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <header className="flex items-start justify-between gap-4 rounded-[34px] border border-white/10 bg-gradient-to-br from-[#102846] via-[#101A35] to-[#062820] p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)]">
          <div>
            <span className="roots-kicker text-[#00D26A]">Lecture familiale</span>
            <h2 className="mt-2 text-2xl font-black">{familyName}</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/60">Une vue plein écran pour lire l’arbre, les générations et les liens familiaux sans outils d’édition.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/70" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </header>
        <section className="roots-card roots-tree-shell overflow-hidden p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white">Arbre familial</h3>
              <p className="roots-muted">Faites glisser horizontalement pour parcourir les grandes familles.</p>
            </div>
            <TreePine className="h-5 w-5 text-[#00D26A]" />
          </div>
          <div className="overflow-x-auto pb-3">
            <div className="family-tree-canvas min-w-[980px] space-y-10 px-6 py-6">
              {generations.length ? generations.map(group => (
                <TreeGeneration
                  key={group.generation}
                  group={group}
                  isFirst={group.generation === generations[0]?.generation}
                  canManage={false}
                  fullScreen
                  relationshipPreviewsByProfile={relationshipPreviewsByProfile}
                  onProfileClick={() => undefined}
                />
              )) : <EmptyState icon={<TreePine className="h-8 w-8" />} text="L’arbre est encore vide." />}
            </div>
          </div>
          {visibleRelationshipSummaries.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-4">
              {visibleRelationshipSummaries.slice(0, 8).map(link => (
                <div key={`reading-${link.id}-${link.sourceName}-${link.targetName}`} className={`roots-link-summary ${relationshipPreviewTone(link.type)}`}>
                  <span>{relationshipLabels[link.type]}</span>
                  <strong>{link.sourceName} · {link.targetName}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BranchModal({
  branch,
  summary,
  onClose,
  onCreateGroup,
  canManage,
  busy
}: {
  branch: FamilyBranch;
  summary?: { branch: FamilyBranch; profiles: FamilyTreeProfile[]; events: FamilyTreeEvent[]; memories: FamilyTreeMemory[] };
  onClose: () => void;
  onCreateGroup: () => void;
  canManage: boolean;
  busy: boolean;
}) {
  const profiles = summary?.profiles || [];
  const events = summary?.events || [];
  const memories = summary?.memories || [];
  return (
    <Modal title={branchLabels[branch]} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={<Users className="h-5 w-5" />} value={profiles.length} label="personnes" tone="green" />
          <StatCard icon={<CalendarDays className="h-5 w-5" />} value={events.length} label="dates" tone="violet" />
          <StatCard icon={<BookOpen className="h-5 w-5" />} value={memories.length} label="souvenirs" tone="blue" />
        </div>
        {canManage && <button type="button" disabled={busy || profiles.every(profile => !profile.memberId)} onClick={onCreateGroup} className="roots-action roots-action-green"><MessageCircle className="h-4 w-4" /> Discussion de branche</button>}
        <section className="space-y-2">
          <h3 className="roots-kicker">Membres</h3>
          {profiles.length ? profiles.map(profile => <ProfileCard key={profile.id} profile={profile} />) : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs font-semibold text-white/35">Aucun membre dans cette branche.</p>}
        </section>
        {events.length > 0 && <section className="space-y-2">
          <h3 className="roots-kicker">Dates</h3>
          {events.slice(0, 6).map(event => <p key={event.id} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-bold text-white/60">{formatDate(event.eventDate)} · {event.title}</p>)}
        </section>}
        {memories.length > 0 && <section className="space-y-2">
          <h3 className="roots-kicker">Souvenirs</h3>
          {memories.slice(0, 6).map(memory => <MemoryCard key={memory.id} memory={memory} />)}
        </section>}
      </div>
    </Modal>
  );
}

function BranchWorldMap({ countries }: { countries: Array<[string, FamilyTreeProfile[]]> }) {
  const points = countries.filter(([place]) => place !== 'Pays non indiqué').slice(0, 4);
  const positions = [
    { left: '24%', top: '48%', tone: 'green' },
    { left: '50%', top: '40%', tone: 'violet' },
    { left: '46%', top: '67%', tone: 'orange' },
    { left: '78%', top: '52%', tone: 'blue' }
  ];
  return (
    <section className="roots-card overflow-hidden p-0">
      <div className="roots-world-map relative min-h-[240px] p-4">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <h2 className="roots-title">Branches familiales</h2>
            <p className="roots-muted">Pays et villes déclarés dans les fiches.</p>
          </div>
          <Earth className="h-5 w-5 text-[#4F8CFF]" />
        </div>
        {points.map(([place, profiles], index) => {
          const position = positions[index] || positions[0];
          return (
            <div key={place} className={`roots-map-point roots-map-${position.tone}`} style={{ left: position.left, top: position.top }}>
              <div className="flex -space-x-2">
                {profiles.slice(0, 2).map(profile => <MemberAvatar key={profile.id} name={profile.displayName} photoUrl={profile.photoUrl} className="h-8 w-8 rounded-full border-2 border-white" />)}
              </div>
              <span>{place}</span>
            </div>
          );
        })}
        {points.length === 0 && <div className="absolute inset-x-4 bottom-4 z-10 rounded-2xl border border-dashed border-white/12 bg-white/6 p-4 text-center text-xs font-semibold text-white/45">Ajoutez un pays ou une ville dans une fiche pour afficher la carte des branches.</div>}
      </div>
    </section>
  );
}

function MemoryCard({ memory, profileName }: { memory: FamilyTreeMemory; profileName?: string }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-white/8 bg-white/5">
      {memory.photoUrl ? (
        <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(180deg, rgba(7,17,31,0), rgba(7,17,31,.58)), url(${memory.photoUrl})` }} />
      ) : (
        <div className="flex h-20 items-center justify-center bg-gradient-to-br from-[#6C5CFF]/20 via-[#102846] to-[#00D26A]/10 text-[#9E94FF]"><Image className="h-6 w-6" /></div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="block truncate text-xs font-black text-white">{memory.title}</strong>
            <p className="mt-1 text-[10px] font-bold text-white/40">{profileName || (memory.memoryDate ? formatDate(memory.memoryDate) : 'Souvenir familial')}</p>
          </div>
          {memory.visibility === 'prive' && <LockKeyhole className="h-4 w-4 shrink-0 text-[#FFB020]" />}
        </div>
        <p className="mt-2 line-clamp-4 text-[11px] font-semibold leading-5 text-white/50">{memory.note}</p>
      </div>
    </article>
  );
}

function PhotoPicker({
  label,
  name,
  photoUrl,
  uploading,
  onSelect,
  onClear
}: {
  label: string;
  name?: string;
  photoUrl?: string;
  uploading: boolean;
  onSelect: (file: File) => Promise<void>;
  onClear: () => void;
}) {
  return (
    <Field label={label}>
      <div className="rounded-[22px] border border-white/8 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <MemberAvatar name={name} photoUrl={photoUrl} className="h-16 w-16 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-white">{photoUrl ? 'Photo prête' : 'Aucune photo choisie'}</p>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-white/42">Choisissez une image depuis le téléphone. Elle est compressée avant l’envoi.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#6C5CFF]/25 bg-[#6C5CFF]/12 px-3 text-[10px] font-black text-[#C9C3FF] ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
            <FileUp className="h-4 w-4" />
            {uploading ? 'Envoi...' : 'Photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={event => {
                const file = event.target.files?.[0];
                event.currentTarget.value = '';
                if (file) void onSelect(file);
              }}
            />
          </label>
          <button type="button" disabled={!photoUrl || uploading} onClick={onClear} className="min-h-11 rounded-2xl border border-white/8 bg-white/4 px-3 text-[10px] font-black text-white/45 disabled:opacity-35">Retirer</button>
        </div>
      </div>
    </Field>
  );
}

function SharedFieldsPicker({ profile, onChange }: { profile: FamilyTreeProfile; onChange: (fields: string[]) => void }) {
  const fields = new Set(profile.sharedFields.length ? profile.sharedFields : defaultSharedFields(profile.isMinor));
  const toggleField = (field: string) => {
    const next = new Set(fields);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    next.add('display_name');
    onChange([...next]);
  };
  return (
    <Field label="Partage avec branches reliées">
      <div className="grid grid-cols-2 gap-2">
        {shareFieldOptions.map(([field, label]) => (
          <button key={field} type="button" disabled={profile.isMinor && !['nickname'].includes(field)} onClick={() => toggleField(field)} className={`min-h-11 rounded-2xl border px-2 text-[10px] font-black disabled:opacity-35 ${fields.has(field) ? 'border-[#00D26A]/35 bg-[#00D26A]/12 text-[#00D26A]' : 'border-white/8 bg-white/4 text-white/45'}`}>
            {label}
          </button>
        ))}
      </div>
      {profile.isMinor && <p className="mt-2 text-[10px] font-semibold text-white/40">Profil mineur : le partage reste volontairement très limité.</p>}
    </Field>
  );
}

function ProfileModal({
  profile, setProfile, localProfiles, editableLinks, relationType, setRelationType, relationTargetId, setRelationTargetId,
  memories, memoryDraft, setMemoryDraft, busy, photoUploading, canAddRelationship, onSave, onClose, onAddRelationship, onAddMemory,
  onDeleteRelationship, onUploadProfilePhoto, onUploadMemoryPhoto
}: {
  profile: FamilyTreeProfile;
  setProfile: (profile: FamilyTreeProfile | null) => void;
  localProfiles: FamilyTreeProfile[];
  editableLinks: Array<{ relationship: FamilyTreeRelationship; target: FamilyTreeProfile }>;
  memories: FamilyTreeMemory[];
  memoryDraft: MemoryDraft;
  setMemoryDraft: Dispatch<SetStateAction<MemoryDraft>>;
  relationType: FamilyRelationshipType;
  setRelationType: (value: FamilyRelationshipType) => void;
  relationTargetId: string;
  setRelationTargetId: (value: string) => void;
  busy: boolean;
  photoUploading: boolean;
  canAddRelationship: boolean;
  onSave: () => Promise<void>;
  onClose: () => void;
  onAddRelationship: () => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  onAddMemory: () => Promise<void>;
  onUploadProfilePhoto: (file: File) => Promise<void>;
  onUploadMemoryPhoto: (file: File) => Promise<void>;
}) {
  return (
    <Modal title="Fiche familiale" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <MemberAvatar name={profile.displayName} photoUrl={profile.photoUrl} className="h-12 w-12" />
          <div>
            <strong className="text-sm font-black text-white">{profile.displayName}</strong>
            <p className="text-[10px] font-semibold text-white/45">{profile.isMinor ? 'Profil mineur protégé' : profile.isMemorial ? 'Mode souvenir' : 'Profil familial'}</p>
          </div>
        </div>
        <Field label="Nom affiché"><input value={profile.displayName} onChange={event => setProfile({ ...profile, displayName: event.target.value })} className="root-input" /></Field>
        <Field label="Surnom"><input value={profile.nickname || ''} onChange={event => setProfile({ ...profile, nickname: event.target.value })} className="root-input" /></Field>
        <PhotoPicker
          label="Photo de la personne"
          name={profile.displayName}
          photoUrl={profile.photoUrl}
          uploading={photoUploading}
          onSelect={onUploadProfilePhoto}
          onClear={() => setProfile({ ...profile, photoUrl: undefined })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branche"><select value={profile.branch} onChange={event => setProfile({ ...profile, branch: event.target.value as FamilyBranch })} className="root-input">{Object.entries(branchLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Pays"><input value={profile.country || ''} onChange={event => setProfile({ ...profile, country: event.target.value })} className="root-input" /></Field>
        </div>
        <Field label="Ville d’origine"><input value={profile.originCity || ''} onChange={event => setProfile({ ...profile, originCity: event.target.value })} className="root-input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Naissance"><input type="date" value={profile.birthDate || ''} onChange={event => setProfile({ ...profile, birthDate: event.target.value || undefined })} className="root-input" /></Field>
          <Field label="Souvenir"><input type="date" value={profile.deathDate || ''} onChange={event => setProfile({ ...profile, deathDate: event.target.value || undefined, isMemorial: Boolean(event.target.value) || profile.isMemorial })} className="root-input" /></Field>
        </div>
        <Field label="Langues parlées"><input value={profile.languages.join(', ')} onChange={event => setProfile({ ...profile, languages: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} className="root-input" /></Field>
        <Field label="Petite histoire"><textarea value={profile.bio || ''} onChange={event => setProfile({ ...profile, bio: event.target.value })} rows={3} className="root-input min-h-[96px] py-3" /></Field>
        <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 p-4 text-xs font-bold text-white/70"><span>Mode souvenir</span><input type="checkbox" checked={profile.isMemorial} onChange={event => setProfile({ ...profile, isMemorial: event.target.checked })} className="h-5 w-5 accent-[#FFB020]" /></label>
        <VisibilityPicker value={profile.visibility} isMinor={profile.isMinor} onChange={visibility => setProfile({ ...profile, visibility })} />
        <SharedFieldsPicker profile={profile} onChange={sharedFields => setProfile({ ...profile, sharedFields })} />
        <div className="space-y-3 border-t border-white/8 pt-4">
          <span className="block text-[10px] font-black uppercase text-white/45">Souvenirs</span>
          {memories.length > 0 && <div className="grid gap-2 sm:grid-cols-2">
            {memories.slice(0, 4).map(memory => <MemoryCard key={memory.id} memory={memory} />)}
          </div>}
          <Field label="Titre du souvenir"><input value={memoryDraft.title} onChange={event => setMemoryDraft(current => ({ ...current, title: event.target.value }))} className="root-input" /></Field>
          <Field label="Souvenir"><textarea value={memoryDraft.note} onChange={event => setMemoryDraft(current => ({ ...current, note: event.target.value }))} rows={3} className="root-input min-h-[96px] py-3" /></Field>
          <PhotoPicker
            label="Photo du souvenir"
            name={memoryDraft.title || profile.displayName}
            photoUrl={memoryDraft.photoUrl}
            uploading={photoUploading}
            onSelect={onUploadMemoryPhoto}
            onClear={() => setMemoryDraft(current => ({ ...current, photoUrl: '' }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date"><input type="date" value={memoryDraft.date} onChange={event => setMemoryDraft(current => ({ ...current, date: event.target.value }))} className="root-input" /></Field>
            <Field label="Visibilité"><select value={memoryDraft.visibility} onChange={event => setMemoryDraft(current => ({ ...current, visibility: event.target.value as FamilyTreeMemory['visibility'] }))} className="root-input"><option value="famille">Branches</option><option value="prive">Ce foyer</option></select></Field>
          </div>
          <button type="button" disabled={busy} onClick={() => void onAddMemory()} className="roots-action roots-action-violet"><BookOpen className="h-4 w-4" /> Ajouter le souvenir</button>
        </div>
        {canAddRelationship && <div className="space-y-3 border-t border-white/8 pt-4">
          <span className="block text-[10px] font-black uppercase text-white/45">Liens familiaux</span>
          {editableLinks.length > 0 ? (
            <div className="space-y-2">
              {editableLinks.map(({ relationship, target }) => (
                <div key={relationship.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 p-3">
                  <MemberAvatar name={target.displayName} photoUrl={target.photoUrl} className="h-9 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-black text-white">{target.displayName}</strong>
                    <p className="mt-0.5 text-[10px] font-bold text-white/45">{relationshipLabels[relationship.relationshipType]}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDeleteRelationship(relationship.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#FF4D6D]/20 bg-[#FF4D6D]/10 text-[#FF7A92] disabled:opacity-45"
                    aria-label={`Supprimer le lien avec ${target.displayName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs font-semibold text-white/35">Aucun lien direct ajouté pour cette personne.</p>
          )}
        </div>}
        {canAddRelationship && <div className="space-y-3 border-t border-white/8 pt-4">
          <span className="block text-[10px] font-black uppercase text-white/45">Ajouter un lien familial</span>
          <div className="grid grid-cols-2 gap-2">
            <select value={relationType} onChange={event => setRelationType(event.target.value as FamilyRelationshipType)} className="root-input">{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={relationTargetId} onChange={event => setRelationTargetId(event.target.value)} className="root-input"><option value="">Avec…</option>{localProfiles.filter(item => item.id !== profile.id).map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>
          </div>
          <button type="button" disabled={busy || !relationTargetId} onClick={() => void onAddRelationship()} className="roots-action roots-action-violet"><Plus className="h-4 w-4" /> Ajouter ce lien</button>
        </div>}
        <button type="button" disabled={busy} onClick={() => void onSave()} className="w-full rounded-2xl bg-[#00D26A] py-3.5 text-xs font-black text-[#07111F]">Enregistrer</button>
      </div>
    </Modal>
  );
}

function ConnectionList({
  connections, localProfiles, profileById, responseProfiles, setResponseProfiles, busy, runAction
}: {
  connections: FamilyRootsSnapshot['connections'];
  localProfiles: FamilyTreeProfile[];
  profileById: (id?: string) => FamilyTreeProfile | undefined;
  responseProfiles: Record<string, string>;
  setResponseProfiles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  busy: boolean;
  runAction: (action: () => Promise<void>, success: string) => Promise<void>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="roots-kicker">Demandes en attente</h2>
      {connections.map(connection => {
        const source = profileById(connection.requesterProfileId);
        const targetId = responseProfiles[connection.id] || localProfiles[0]?.id || '';
        return (
          <div key={connection.id} className="roots-card border-[#FFB020]/20 bg-[#FFB020]/6 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFB020]/12 text-[#FFB020]"><Send className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-black text-white">{connection.direction === 'incoming' ? 'Une branche souhaite vous rejoindre' : 'Invitation envoyée'}</strong>
                <p className="mt-1 text-[10px] font-semibold text-white/45">Lien proposé : {relationshipLabels[connection.relationshipType]}{source ? ` avec ${source.displayName}` : ''}</p>
              </div>
            </div>
            {connection.direction === 'incoming' ? (
              <div className="mt-4 space-y-3">
                <select value={targetId} onChange={event => setResponseProfiles(current => ({ ...current, [connection.id]: event.target.value }))} className="root-input">{localProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy} onClick={() => void runAction(() => familyRootsService.respondConnection(connection.id, false), 'La demande a été refusée.')} className="rounded-2xl border border-white/8 bg-white/5 py-3 text-xs font-black text-white/55">Refuser</button>
                  <button type="button" disabled={busy || !targetId} onClick={() => void runAction(() => familyRootsService.respondConnection(connection.id, true, targetId), 'Les deux branches sont maintenant reliées.')} className="flex items-center justify-center gap-2 rounded-2xl bg-[#00D26A] py-3 text-xs font-black text-[#07111F]"><Check className="h-4 w-4" /> Confirmer</button>
                </div>
              </div>
            ) : <button type="button" disabled={busy} onClick={() => void runAction(() => familyRootsService.cancelConnection(connection.id), 'La demande a été annulée.')} className="mt-4 w-full rounded-2xl border border-white/8 bg-white/5 py-3 text-xs font-black text-white/55">Annuler la demande</button>}
          </div>
        );
      })}
    </section>
  );
}

function IdentityList({ requests, profileById, busy, runAction }: { requests: FamilyTreeIdentityRequest[]; profileById: (id?: string) => FamilyTreeProfile | undefined; busy: boolean; runAction: (action: () => Promise<void>, success: string) => Promise<void> }) {
  return (
    <section className="space-y-3">
      <h2 className="roots-kicker">Rapprochements à confirmer</h2>
      {requests.map(request => {
        const source = profileById(request.sourceProfileId);
        const target = profileById(request.targetProfileId);
        return (
          <div key={request.id} className="roots-card p-4">
            <p className="text-xs font-bold text-white/65">{source?.displayName || 'Une fiche'} et {target?.displayName || 'une fiche'} désignent la même personne ?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => void runAction(() => familyRootsService.respondIdentityLink(request.id, false), 'Le rapprochement a été refusé.')} className="rounded-2xl border border-white/8 bg-white/5 py-3 text-xs font-black text-white/55">Refuser</button>
              <button type="button" disabled={busy} onClick={() => void runAction(() => familyRootsService.respondIdentityLink(request.id, true), 'Le rapprochement a été confirmé.')} className="rounded-2xl bg-[#00D26A] py-3 text-xs font-black text-[#07111F]">Confirmer</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function TabButton({ active, onClick, icon, label, badge = 0 }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; badge?: number }) {
  return (
    <button type="button" onClick={onClick} className={`roots-tab relative flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 text-[11px] font-black ${active ? 'roots-tab-active' : ''}`}>
      <span className="hidden sm:block">{icon}</span><span>{label}</span>{badge > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#FF4D6D]" />}
    </button>
  );
}

function StatCard({ icon, value, label, tone }: { icon: ReactNode; value: number; label: string; tone: 'green' | 'violet' | 'blue' }) {
  const color = tone === 'green' ? 'text-[#00D26A]' : tone === 'violet' ? 'text-[#9E94FF]' : 'text-[#7FB0FF]';
  return <div className="roots-card p-4"><div className={color}>{icon}</div><strong className="mt-3 block text-xl font-black text-white">{value}</strong><span className="text-[10px] font-bold text-white/40">{label}</span></div>;
}

function HeroNotice({ icon, title, text, compact = false }: { icon: ReactNode; title: string; text: string; compact?: boolean }) {
  return <div className={`roots-card flex items-start gap-3 border-[#00D26A]/18 bg-[#00D26A]/6 ${compact ? 'p-3' : 'p-4'}`}><div className="shrink-0 text-[#00D26A]">{icon}</div><div><strong className="roots-title">{title}</strong><p className="roots-muted mt-1">{text}</p></div></div>;
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="roots-card border-dashed p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/22">{icon}</div><p className="mt-3 text-xs font-semibold text-white/40">{text}</p></div>;
}

function LoadingGrid() {
  return <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map(item => <div key={item} className="h-32 animate-pulse rounded-[24px] border border-white/6 bg-white/4" />)}</div>;
}

function VisibilityPicker({ value, isMinor, onChange }: { value: FamilyProfileVisibility; isMinor?: boolean; onChange: (value: FamilyProfileVisibility) => void }) {
  return (
    <Field label="Visibilité">
      <div className="grid grid-cols-3 gap-2">
        {(['prive', 'famille', 'masque'] as FamilyProfileVisibility[]).map(option => (
          <button key={option} type="button" disabled={isMinor && option === 'famille'} onClick={() => onChange(option)} className={`min-h-12 rounded-2xl border px-2 text-[10px] font-black disabled:opacity-35 ${value === option ? 'border-[#00D26A]/35 bg-[#00D26A]/12 text-[#00D26A]' : 'border-white/8 bg-white/4 text-white/45'}`}>
            {option === 'prive' ? 'Ce foyer' : option === 'famille' ? 'Branches' : 'Masqué'}
          </button>
        ))}
      </div>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="block text-[10px] font-black uppercase text-white/45">{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[90] flex items-end bg-[#07111F]/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center"><div className="roots-modal-panel max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/10 bg-[#0F1A30] p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-base font-black text-white">{title}</h2><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-white/60" aria-label="Fermer"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}
