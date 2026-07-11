import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Camera,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  Eye,
  EyeOff,
  Globe2,
  Heart,
  Image,
  GitMerge,
  Link2,
  MapPinned,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Send,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  TreePine,
  UsersRound,
  UserRoundSearch,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import type { FoyerMemberProfileUpdate, Member } from '../types';
import {
  familyRootsService,
  type FamilyRelationshipType,
  type FamilyRootsSnapshot,
  type FamilyTreeConnection,
  type FamilyTreeProfile,
  type FamilyTreeRelationship
} from '../services/familyRootsService';
import './family-roots.css';
import './family-roots-map.css';
import './family-roots-tree.css';
import { getFamilyRootCoordinates, getMapPosition, resolveFamilyRootCoordinates } from '../utils/familyRootsGeo';
import { compressImageToBlob, uploadBlobToStorage } from '../utils/imageCompressor';
import { buildGenealogyLayout, relationForNewRelative } from '../utils/familyGraph';
import { ImageCropper } from '../components/ImageCropper';

const FamilyRootsWorldMap = lazy(() => import('./FamilyRootsWorldMap'));

type RootTab = 'tree' | 'cousins' | 'branches' | 'map' | 'history';
type TreeDensity = 'auto' | 'comfortable' | 'compact';
type ModalName = 'add-person' | 'link-persons' | 'link-branch' | 'invite' | 'branch-details' | 'review-center' | 'photo-crop' | null;
type ProfileTab = 'infos' | 'famille' | 'medias' | 'liens';

type FamilyRootsProps = {
  foyerId?: string;
  familyName?: string;
  members?: Member[];
  canManage?: boolean;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  onSendNotification?: (title: string, body: string, type?: string) => void;
  onAddAgendaEvent?: (event: unknown) => void;
  onCreateBranchGroup?: (name: string, memberIds: string[]) => Promise<unknown>;
  onUpdateMemberProfile?: (memberId: string, updates: FoyerMemberProfileUpdate) => Promise<void> | void;
};

const relationshipLabels: Record<FamilyRelationshipType, string> = {
  parent: 'Parent',
  parent_biologique: 'Parent biologique',
  beau_parent: 'Beau-parent',
  tuteur: 'Tuteur ou tutrice',
  enfant: 'Enfant',
  fratrie: 'Frère ou sœur',
  cousin: 'Cousin ou cousine',
  conjoint: 'Conjoint·e',
  ex_conjoint: 'Ancien·ne conjoint·e',
  oncle_tante: 'Oncle ou tante',
  neveu_niece: 'Neveu ou nièce',
  grand_parent: 'Grand-parent',
  petit_enfant: 'Petit-enfant',
  famille: 'Famille'
};

const branchColors = ['violet', 'green', 'orange', 'blue'] as const;
const rootTabs: Array<[RootTab, string]> = [['tree', 'Arbre'], ['cousins', 'Cousins'], ['branches', 'Branches'], ['map', 'Carte'], ['history', 'Histoire']];
const FAMILY_ROOTS_RENDER_TIME = Date.now();
const DEFAULT_SHARED_FIELDS = ['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url'];

const initial = (name?: string) => (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

const displayYear = (profile: FamilyTreeProfile) => {
  if (!profile.birthDate) return 'Date inconnue';
  const year = new Date(`${profile.birthDate}T12:00:00`).getFullYear();
  if (Number.isNaN(year)) return 'Date inconnue';
  if (profile.isMemorial && profile.deathDate) {
    const death = new Date(`${profile.deathDate}T12:00:00`).getFullYear();
    return `${year} - ${Number.isNaN(death) ? '' : death}`;
  }
  return `${year} -`;
};

const profileLocation = (profile: FamilyTreeProfile) => [profile.originCity, profile.country].filter(Boolean).join(', ') || 'Lieu non renseigné';

const profileAge = (profile: FamilyTreeProfile) => {
  if (!profile.birthDate) return '';
  const birth = new Date(`${profile.birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} ans`;
};

const inverseRelationship: Partial<Record<FamilyRelationshipType, FamilyRelationshipType>> = {
  parent: 'enfant',
  parent_biologique: 'enfant',
  beau_parent: 'enfant',
  tuteur: 'enfant',
  enfant: 'parent',
  grand_parent: 'petit_enfant',
  petit_enfant: 'grand_parent',
  oncle_tante: 'neveu_niece',
  neveu_niece: 'oncle_tante'
};

const describeRelationship = (
  sourceId: string,
  targetId: string,
  relationships: FamilyTreeRelationship[]
) => {
  if (!sourceId || !targetId || sourceId === targetId) return sourceId === targetId ? 'Vous' : 'Membre de la famille';
  const graph = new Map<string, Array<{ id: string; type: FamilyRelationshipType }>>();
  relationships.forEach(relationship => {
    graph.set(relationship.sourceProfileId, [...(graph.get(relationship.sourceProfileId) || []), { id: relationship.targetProfileId, type: relationship.relationshipType }]);
  });
  const queue: Array<{ id: string; path: FamilyRelationshipType[] }> = [{ id: sourceId, path: [] }];
  const visited = new Set([sourceId]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of graph.get(current.id) || []) {
      const path = [...current.path, edge.type];
      if (edge.id === targetId) {
        const signature = path.join('>');
        if (signature === 'enfant>parent' || signature === 'parent>enfant') return 'Frère ou sœur';
        if (signature === 'enfant>fratrie') return 'Oncle ou tante';
        if (signature === 'fratrie>parent') return 'Neveu ou nièce';
        if (signature === 'enfant>fratrie>parent') return 'Cousin ou cousine';
        if (signature === 'enfant>enfant') return 'Grand-parent';
        if (signature === 'parent>parent') return 'Petit-enfant';
        if (path.length === 1) return relationshipLabels[path[0]];
        return path.length <= 3 ? path.map(type => relationshipLabels[type]).join(' · ') : `Famille reliée à ${path.length} liens`;
      }
      if (!visited.has(edge.id) && path.length < 5) {
        visited.add(edge.id);
        queue.push({ id: edge.id, path });
      }
    }
  }
  return 'Branche familiale reliée';
};

const getRelationshipIssue = (
  source: FamilyTreeProfile | undefined,
  target: FamilyTreeProfile | undefined,
  relationshipType: FamilyRelationshipType,
  relationships: FamilyTreeRelationship[]
) => {
  if (!source || !target) return '';
  if (source.id === target.id) return 'Choisissez deux personnes différentes.';
  const alreadyLinked = relationships.some(relationship => relationship.sourceProfileId === source.id && relationship.targetProfileId === target.id && relationship.relationshipType === relationshipType);
  if (alreadyLinked) return 'Ce lien existe déjà dans l’arbre.';
  if (['conjoint', 'ex_conjoint'].includes(relationshipType) && (source.isMinor || target.isMinor)) return 'Un lien de couple ne peut pas concerner un profil mineur.';

  const sourceDate = source.birthDate ? new Date(`${source.birthDate}T12:00:00`) : null;
  const targetDate = target.birthDate ? new Date(`${target.birthDate}T12:00:00`) : null;
  const yearGap = sourceDate && targetDate ? (targetDate.getTime() - sourceDate.getTime()) / 31557600000 : null;
  const normalizedGap = relationshipType === 'enfant' && yearGap !== null ? -yearGap : yearGap;
  if (['parent', 'parent_biologique'].includes(relationshipType) && normalizedGap !== null && normalizedGap < 12) return 'Les dates ne sont pas cohérentes avec un lien parent-enfant.';
  if (relationshipType === 'grand_parent' && yearGap !== null && yearGap < 24) return 'Les dates ne sont pas cohérentes avec un lien grand-parent.';

  if (relationshipType === 'conjoint') {
    const incompatible = relationships.some(relationship => {
      const samePair = (relationship.sourceProfileId === source.id && relationship.targetProfileId === target.id)
        || (relationship.sourceProfileId === target.id && relationship.targetProfileId === source.id);
      return samePair && ['parent', 'parent_biologique', 'enfant', 'fratrie'].includes(relationship.relationshipType);
    });
    if (incompatible) return 'Ce couple est incompatible avec un lien déjà renseigné.';
  }

  if (['parent', 'parent_biologique', 'enfant'].includes(relationshipType)) {
    const parentId = relationshipType === 'enfant' ? target.id : source.id;
    const childId = relationshipType === 'enfant' ? source.id : target.id;
    const descendants = new Set<string>();
    const queue = [childId];
    while (queue.length) {
      const id = queue.shift()!;
      relationships.filter(relationship => relationship.sourceProfileId === id && ['parent', 'parent_biologique'].includes(relationship.relationshipType)).forEach(relationship => {
        if (!descendants.has(relationship.targetProfileId)) {
          descendants.add(relationship.targetProfileId);
          queue.push(relationship.targetProfileId);
        }
      });
    }
    if (descendants.has(parentId)) return 'Ce lien créerait une boucle impossible dans l’arbre.';
  }
  return '';
};

function ProfileAvatar({ profile, className = '' }: { profile: FamilyTreeProfile; className?: string }) {
  return (
    <div className={`fr-avatar ${className}`} aria-label={profile.displayName}>
      {profile.photoUrl ? <img src={profile.photoUrl} alt="" /> : <span>{initial(profile.displayName)}</span>}
    </div>
  );
}

function PersonNode({
  profile,
  compact = false,
  onSelect,
  onAddRelative
}: {
  profile: FamilyTreeProfile;
  compact?: boolean;
  onSelect: (profile: FamilyTreeProfile) => void;
  onAddRelative?: (profile: FamilyTreeProfile) => void;
}) {
  return (
    <div className={`fr-person-node ${compact ? 'is-compact' : ''}`}>
      <button className="fr-person-main" onClick={() => onSelect(profile)}>
        <ProfileAvatar profile={profile} />
        <strong>{profile.displayName}</strong>
        <span>{displayYear(profile)}</span>
      </button>
      {onAddRelative && profile.isLocal && <button className="fr-person-add" onClick={() => onAddRelative(profile)} aria-label={`Ajouter un proche de ${profile.displayName}`}><Plus /></button>}
    </div>
  );
}

function FocusedGenealogyTree({
  profiles,
  relationships,
  focusProfileId,
  selectedProfileId,
  expandedGenerations,
  onToggleGeneration,
  onSelect,
  onAddRelative
}: {
  profiles: FamilyTreeProfile[];
  relationships: FamilyTreeRelationship[];
  focusProfileId?: string;
  selectedProfileId?: string;
  expandedGenerations: Set<string>;
  onToggleGeneration: (generationId: string) => void;
  onSelect: (profile: FamilyTreeProfile) => void;
  onAddRelative?: (profile: FamilyTreeProfile) => void;
}) {
  const layout = useMemo(() => buildGenealogyLayout(profiles, relationships, focusProfileId), [focusProfileId, profiles, relationships]);

  return <div className="fr-genealogy-tree" data-focus-id={layout.focusId}>
    {layout.generations.map((generation, index) => {
      const generationId = `generation-${generation.offset}`;
      const expanded = expandedGenerations.has(generationId);
      const shownUnions = expanded ? generation.unions : generation.unions.slice(0, generation.offset === 0 ? 4 : 3);
      const hiddenCount = generation.unions.slice(shownUnions.length).reduce((count, union) => count + union.profiles.length, 0);
      return <section className={`fr-genealogy-generation offset-${generation.offset}`} key={generation.offset}>
        {index > 0 && <span className="fr-genealogy-trunk" aria-hidden="true" />}
        <div className="fr-genealogy-label"><span>{generation.label}</span></div>
        <div className={`fr-genealogy-row count-${Math.min(shownUnions.length + (hiddenCount ? 1 : 0), 4)}`}>
          {shownUnions.map(union => <article className={`fr-genealogy-union ${union.status} ${union.profiles.some(profile => profile.id === selectedProfileId) ? 'is-selected' : ''}`} key={union.id}>
            <div className="fr-genealogy-union-people">
              {union.profiles.map(profile => <PersonNode profile={profile} compact key={profile.id} onSelect={onSelect} onAddRelative={onAddRelative} />)}
              {union.profiles.length === 2 && <span className="fr-genealogy-union-mark" title={union.status === 'former-couple' ? 'Ancienne union' : 'Couple'}>{union.status === 'former-couple' ? <X /> : <Heart />}</span>}
            </div>
            {union.profiles.length === 2 && <small>{union.status === 'former-couple' ? 'Ancienne union' : 'Foyer'}</small>}
          </article>)}
          {hiddenCount > 0 && <button className="fr-genealogy-more" onClick={() => onToggleGeneration(generationId)}><b>+{hiddenCount}</b><span>Afficher</span></button>}
        </div>
        {expanded && generation.unions.length > 3 && <button className="fr-genealogy-collapse" onClick={() => onToggleGeneration(generationId)}><Minus /> Réduire</button>}
      </section>;
    })}
    {layout.disconnected.length > 0 && <section className="fr-genealogy-unlinked">
      <span>À relier</span>
      <div>{layout.disconnected.slice(0, 4).map(profile => <PersonNode profile={profile} compact key={profile.id} onSelect={onSelect} onAddRelative={onAddRelative} />)}</div>
    </section>}
  </div>;
}

function TreeBoard({
  profiles,
  relationships,
  activeFoyerId,
  familyName,
  focusProfileId,
  selectedProfileId,
  expandedHouseholds,
  onToggleHousehold,
  onOpenBranch,
  onSelect,
  onAddRelative,
  density = 'comfortable',
  onEmptyAdd,
  onEmptyLinkBranch,
  fullScreen = false
}: {
  profiles: FamilyTreeProfile[];
  relationships: FamilyTreeRelationship[];
  activeFoyerId: string;
  familyName: string;
  focusProfileId?: string;
  selectedProfileId?: string;
  expandedHouseholds: Set<string>;
  onToggleHousehold: (householdId: string) => void;
  onOpenBranch: (foyerId: string) => void;
  onSelect: (profile: FamilyTreeProfile) => void;
  onAddRelative?: (profile: FamilyTreeProfile) => void;
  density?: Exclude<TreeDensity, 'auto'>;
  onEmptyAdd?: (relation: 'parent' | 'enfant') => void;
  onEmptyLinkBranch?: () => void;
  fullScreen?: boolean;
}) {
  if (!profiles.length) {
    return <div className="fr-empty-tree"><TreePine /><strong>Commencez votre arbre</strong><span>Choisissez un premier lien pour construire une histoire familiale fidèle.</span><div className="fr-empty-tree-actions"><button onClick={() => onEmptyAdd?.('parent')}>Ajouter mes parents</button><button onClick={() => onEmptyAdd?.('enfant')}>Ajouter mes enfants</button><button onClick={onEmptyLinkBranch}>Relier une branche</button></div></div>;
  }

  return (
    <div className={`fr-tree-board is-${density} ${fullScreen ? 'is-fullscreen-tree' : ''}`} data-family={familyName} data-foyer={activeFoyerId}>
      <FocusedGenealogyTree profiles={profiles} relationships={relationships} focusProfileId={focusProfileId} selectedProfileId={selectedProfileId} expandedGenerations={expandedHouseholds} onToggleGeneration={onToggleHousehold} onSelect={onSelect} onAddRelative={onAddRelative} />
      {profiles.some(profile => profile.foyerId !== activeFoyerId) && <button className="fr-open-branches" onClick={() => onOpenBranch(profiles.find(profile => profile.foyerId !== activeFoyerId)?.foyerId || activeFoyerId)}><UsersRound /> Voir les foyers reliés</button>}
    </div>
  );
}

function RootsModal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fr-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="fr-modal">
        <div className="fr-modal-header"><h2>{title}</h2><button onClick={onClose} aria-label="Fermer"><X /></button></div>
        {children}
      </section>
    </div>
  );
}

export function FamilyRoots({
  foyerId,
  familyName = 'Ma famille',
  members = [],
  canManage = false,
  isPremium = false,
  onTriggerPaywall,
  onSendNotification,
  onAddAgendaEvent,
  onCreateBranchGroup,
  onUpdateMemberProfile
}: FamilyRootsProps) {
  const [activeTab, setActiveTab] = useState<RootTab>('tree');
  const [snapshot, setSnapshot] = useState<FamilyRootsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<FamilyTreeProfile | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>('infos');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', birthDate: '', city: '', country: '', school: '', languages: '', bio: '', visibility: 'famille' as FamilyTreeProfile['visibility'] });
  const [modal, setModal] = useState<ModalName>(null);
  const [treeFullscreen, setTreeFullscreen] = useState(false);
  const [treeScale, setTreeScale] = useState(0.84);
  const [treeFocusId, setTreeFocusId] = useState('');
  const [expandedHouseholds, setExpandedHouseholds] = useState<Set<string>>(new Set());
  const [connectionTargets, setConnectionTargets] = useState<Record<string, string>>({});
  const [treeScope, setTreeScope] = useState<'mine' | 'global'>('global');
  const [readingMode, setReadingMode] = useState(false);
  const [treeDensity, setTreeDensity] = useState<TreeDensity>('auto');
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [shareDrafts, setShareDrafts] = useState<Record<string, { isVisible: boolean; sharedFields: string[] }>>({});
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | 'nearby' | 'country' | 'branch'>('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [personForm, setPersonForm] = useState({ name: '', date: '', city: '', country: '', anchorId: '', relation: 'parent' as FamilyRelationshipType });
  const [relationshipForm, setRelationshipForm] = useState({ source: '', target: '', relation: 'parent' as FamilyRelationshipType });
  const [branchForm, setBranchForm] = useState({ code: '', source: '', relation: 'famille' as FamilyRelationshipType });
  const [relationshipReferenceId, setRelationshipReferenceId] = useState('');
  const [resolvedCoordinates, setResolvedCoordinates] = useState<Record<string, { latitude: number; longitude: number; label: string }>>({});
  const [inviteLinkHandled, setInviteLinkHandled] = useState(false);
  const [photoCropFile, setPhotoCropFile] = useState<File | null>(null);
  const fullTreeScrollRef = useRef<HTMLDivElement>(null);
  const tabSwipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const activeFoyerId = foyerId || 'local';
  const inviteCodeFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('rootCode')?.trim().toUpperCase() || '';
  }, []);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await familyRootsService.load(activeFoyerId, members, canManage, force);
      setSnapshot(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l’arbre familial.');
    } finally {
      setLoading(false);
    }
  }, [activeFoyerId, canManage, members]);

  /* These effects hydrate asynchronous family data and navigation state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!inviteCodeFromUrl || loading || inviteLinkHandled) return;
    const localProfile = snapshot?.profiles.find(profile => profile.isLocal);
    setBranchForm(current => ({ ...current, code: inviteCodeFromUrl, source: current.source || localProfile?.id || '' }));
    setModal('link-branch');
    setInviteLinkHandled(true);
  }, [inviteCodeFromUrl, inviteLinkHandled, loading, snapshot?.profiles]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const profiles = useMemo(() => snapshot?.profiles || [], [snapshot?.profiles]);
  const relationships = useMemo(() => snapshot?.relationships || [], [snapshot?.relationships]);
  const connections = useMemo(() => snapshot?.connections || [], [snapshot?.connections]);
  const profileShares = useMemo(() => snapshot?.profileShares || [], [snapshot?.profileShares]);
  const identityRequests = useMemo(() => snapshot?.identityRequests || [], [snapshot?.identityRequests]);
  const localProfiles = profiles.filter(profile => profile.isLocal);
  const linkedProfiles = profiles.filter(profile => !profile.isLocal);
  const eventList = snapshot?.events.filter(event => event.visibility === 'famille').slice(0, 3) || [];
  const countries = new Set(profiles.map(profile => profile.country).filter(Boolean)).size;
  const confirmedBranches = connections.filter(connection => connection.status === 'confirmed');
  const pendingConnections = connections.filter(connection => connection.status === 'pending');
  const editingAllowed = canManage && !readingMode;
  const relationshipGraph = useMemo(() => {
    const connectionRelationships: FamilyTreeRelationship[] = connections.flatMap(connection => {
      if (connection.status !== 'confirmed' || !connection.targetProfileId) return [];
      const inverse = inverseRelationship[connection.relationshipType] || connection.relationshipType;
      return [
        { id: `connection-${connection.id}`, foyerId: activeFoyerId, sourceProfileId: connection.requesterProfileId, targetProfileId: connection.targetProfileId, relationshipType: connection.relationshipType },
        { id: `connection-inverse-${connection.id}`, foyerId: activeFoyerId, sourceProfileId: connection.targetProfileId, targetProfileId: connection.requesterProfileId, relationshipType: inverse }
      ];
    });
    return [...relationships, ...connectionRelationships];
  }, [activeFoyerId, connections, relationships]);

  useEffect(() => {
    if (relationshipReferenceId && profiles.some(profile => profile.id === relationshipReferenceId)) return;
    setRelationshipReferenceId(localProfiles[0]?.id || profiles[0]?.id || '');
  }, [localProfiles, profiles, relationshipReferenceId]);
  useEffect(() => {
    if (treeFocusId && profiles.some(profile => profile.id === treeFocusId)) return;
    setTreeFocusId(localProfiles.find(profile => !profile.isMinor)?.id || localProfiles[0]?.id || profiles[0]?.id || '');
  }, [localProfiles, profiles, treeFocusId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const cousinProfiles = useMemo(() => {
    const localIds = new Set(localProfiles.map(profile => profile.id));
    const candidateProfiles = linkedProfiles.length ? linkedProfiles : profiles.filter(profile => !localIds.has(profile.id));
    const source = candidateProfiles.length ? candidateProfiles : profiles;
    return source.filter(profile => {
      const needle = query.trim().toLowerCase();
      if (needle && !`${profile.displayName} ${profileLocation(profile)}`.toLowerCase().includes(needle)) return false;
      if (branchFilter === 'nearby') return profile.isLocal;
      if (branchFilter === 'country') return Boolean(profile.country);
      if (branchFilter === 'branch') return !profile.isLocal;
      return true;
    });
  }, [branchFilter, linkedProfiles, localProfiles, profiles, query]);

  const branches = useMemo(() => {
    const groups = new Map<string, FamilyTreeProfile[]>();
    profiles.forEach(profile => groups.set(profile.foyerId, [...(groups.get(profile.foyerId) || []), profile]));
    return [...groups.entries()].map(([id, branchProfiles], index) => ({
      id,
      profiles: branchProfiles,
      name: id === activeFoyerId ? familyName : `Branche de ${branchProfiles[0]?.displayName || 'la famille'}`,
      location: profileLocation(branchProfiles.find(profile => profile.originCity || profile.country) || branchProfiles[0]),
      color: branchColors[index % branchColors.length],
      status: id === activeFoyerId ? 'Vous' : 'Liée'
    }));
  }, [activeFoyerId, familyName, profiles]);
  const locationSignature = profiles.map(profile => `${profile.id}:${profile.originCity || ''}:${profile.country || ''}:${profile.latitude || ''}:${profile.longitude || ''}`).join('|');
  useEffect(() => {
    if (activeTab !== 'map' && activeTab !== 'branches') return;
    let cancelled = false;
    const unresolved = profiles.filter(profile => (profile.originCity || profile.country)
      && !Number.isFinite(profile.latitude)
      && !Number.isFinite(profile.longitude)
      && !getFamilyRootCoordinates(profile.originCity, profile.country)
      && !resolvedCoordinates[profile.id]);
    if (!unresolved.length) return;
    void Promise.all(unresolved.slice(0, 12).map(async profile => ({ profile, coordinates: await resolveFamilyRootCoordinates(profile.originCity, profile.country) }))).then(results => {
      if (cancelled) return;
      setResolvedCoordinates(current => {
        const next = { ...current };
        results.forEach(({ profile, coordinates }) => { if (coordinates) next[profile.id] = coordinates; });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [activeTab, locationSignature, profiles, resolvedCoordinates]);
  const selectedBranch = branches.find(branch => branch.id === selectedBranchId) || null;
  const visibleTreeProfiles = treeScope === 'mine' ? localProfiles : profiles;
  const resolvedTreeDensity: Exclude<TreeDensity, 'auto'> = treeDensity === 'auto'
    ? (visibleTreeProfiles.length >= 10 ? 'compact' : 'comfortable')
    : treeDensity;
  const focusedTreeProfile = visibleTreeProfiles.find(profile => profile.id === treeFocusId) || visibleTreeProfiles[0];
  const possibleDuplicates = useMemo(() => {
    const normalize = (value: string) => value.trim().toLocaleLowerCase('fr-FR').replace(/[^a-z0-9]/g, '');
    const reviewedPairs = new Set(identityRequests.map(request => `${request.sourceProfileId}:${request.targetProfileId}`));
    return localProfiles.flatMap(local => linkedProfiles.flatMap(remote => {
      const sameName = normalize(local.displayName) === normalize(remote.displayName);
      const sameYear = local.birthDate && remote.birthDate && local.birthDate.slice(0, 4) === remote.birthDate.slice(0, 4);
      return sameName && (!local.birthDate || !remote.birthDate || sameYear) && !reviewedPairs.has(`${local.id}:${remote.id}`) && !reviewedPairs.has(`${remote.id}:${local.id}`) ? [{ local, remote }] : [];
    }));
  }, [identityRequests, linkedProfiles, localProfiles]);
  const possibleLinkSuggestions = useMemo(() => {
    const directLinks = new Set(relationships.flatMap(relationship => [`${relationship.sourceProfileId}:${relationship.targetProfileId}`, `${relationship.targetProfileId}:${relationship.sourceProfileId}`]));
    return localProfiles.flatMap((profile, index) => localProfiles.slice(index + 1).flatMap(candidate => {
      const profileSurname = profile.displayName.trim().split(/\s+/).slice(-1)[0]?.toLocaleLowerCase('fr-FR');
      const candidateSurname = candidate.displayName.trim().split(/\s+/).slice(-1)[0]?.toLocaleLowerCase('fr-FR');
      const related = directLinks.has(`${profile.id}:${candidate.id}`);
      const sameSurname = Boolean(profileSurname && candidateSurname && profileSurname.length > 2 && profileSurname === candidateSurname);
      const closeAge = profile.birthDate && candidate.birthDate && Math.abs(Number(profile.birthDate.slice(0, 4)) - Number(candidate.birthDate.slice(0, 4))) <= 18;
      return !related && (sameSurname || closeAge) ? [{ profile, candidate }] : [];
    }));
  }, [localProfiles, relationships]);
  const linkPreview = useMemo(() => {
    const source = profiles.find(profile => profile.id === relationshipForm.source);
    const target = profiles.find(profile => profile.id === relationshipForm.target);
    if (!source || !target) return 'Choisissez les deux personnes pour voir leur place dans l’arbre.';
    if (relationshipForm.relation === 'fratrie') return `${source.displayName} et ${target.displayName} apparaîtront comme frère et sœur. Leurs enfants seront cousins.`;
    if (relationshipForm.relation === 'conjoint') return `${source.displayName} et ${target.displayName} seront regroupés comme parents d’un même foyer.`;
    if (relationshipForm.relation === 'parent') return `${source.displayName} apparaîtra comme parent de ${target.displayName}.`;
    if (relationshipForm.relation === 'enfant') return `${source.displayName} apparaîtra comme enfant de ${target.displayName}.`;
    return `${source.displayName} et ${target.displayName} seront reliés comme ${relationshipLabels[relationshipForm.relation].toLocaleLowerCase('fr-FR')}.`;
  }, [profiles, relationshipForm]);
  const relationshipIssue = useMemo(() => getRelationshipIssue(
    profiles.find(profile => profile.id === relationshipForm.source),
    profiles.find(profile => profile.id === relationshipForm.target),
    relationshipForm.relation,
    relationships
  ), [profiles, relationshipForm, relationships]);

  const profileSuggestions = useMemo(() => localProfiles.flatMap(profile => {
    const missing: string[] = [];
    if (!profile.photoUrl) missing.push('photo');
    if (!profile.birthDate) missing.push('date de naissance');
    if (!profile.originCity && !profile.country) missing.push('lieu');
    if (!profile.bio) missing.push('présentation');
    const hasRelationship = relationships.some(relationship => relationship.sourceProfileId === profile.id || relationship.targetProfileId === profile.id);
    if (!hasRelationship && localProfiles.length > 1) missing.push('lien familial');
    return missing.length ? [{ profile, missing }] : [];
  }).sort((left, right) => right.missing.length - left.missing.length), [localProfiles, relationships]);

  const branchMapMarkers = useMemo(() => branches.flatMap(branch => {
    const profile = branch.profiles.find(item => (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) || getFamilyRootCoordinates(item.originCity, item.country) || resolvedCoordinates[item.id]);
    if (!profile) return [];
    const coordinates = Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)
      ? { latitude: profile.latitude as number, longitude: profile.longitude as number, label: profileLocation(profile) }
      : getFamilyRootCoordinates(profile.originCity, profile.country) || resolvedCoordinates[profile.id];
    if (!coordinates) return [];
    return [{ branch, profile, coordinates }];
  }), [branches, resolvedCoordinates]);
  const selectedMember = selectedProfile?.memberId ? members.find(member => member.id === selectedProfile.memberId) : undefined;
  const selectedRelations = useMemo(() => {
    if (!selectedProfile) return [];
    return relationshipGraph.flatMap(relationship => {
      if (relationship.sourceProfileId === selectedProfile.id) {
        const person = profiles.find(profile => profile.id === relationship.targetProfileId);
        return person ? [{ id: relationship.id, person, label: relationshipLabels[relationship.relationshipType] }] : [];
      }
      if (relationship.targetProfileId === selectedProfile.id) {
        const person = profiles.find(profile => profile.id === relationship.sourceProfileId);
        return person ? [{ id: relationship.id, person, label: relationshipLabels[relationship.relationshipType] }] : [];
      }
      return [];
    });
  }, [profiles, relationshipGraph, selectedProfile]);
  const selectedMemories = useMemo(() => selectedProfile ? (snapshot?.memories || []).filter(memory => memory.profileId === selectedProfile.id) : [], [selectedProfile, snapshot?.memories]);
  const selectedRelationshipDescription = selectedProfile
    ? describeRelationship(relationshipReferenceId, selectedProfile.id, relationshipGraph)
    : '';
  const genealogyLayout = useMemo(() => buildGenealogyLayout(visibleTreeProfiles, relationshipGraph, treeFocusId), [relationshipGraph, treeFocusId, visibleTreeProfiles]);
  const pendingCorrections = (snapshot?.corrections || []).filter(correction => correction.status === 'pending');
  const verificationCount = genealogyLayout.issues.length + possibleDuplicates.length + pendingConnections.length + pendingCorrections.length + profileSuggestions.length;
  const historyItems = useMemo(() => {
    const eventItems = (snapshot?.events || []).map(event => ({
      id: `event-${event.id}`,
      date: event.eventDate,
      title: event.title,
      detail: event.eventType === 'anniversaire' ? 'Anniversaire' : event.eventType === 'mariage' ? 'Mariage' : event.eventType === 'deces' ? 'Souvenir' : 'Événement',
      profile: profiles.find(profile => profile.id === event.profileId),
      photoUrl: undefined as string | undefined
    }));
    const memoryItems = (snapshot?.memories || []).map(memory => ({
      id: `memory-${memory.id}`,
      date: memory.memoryDate || memory.createdAt.slice(0, 10),
      title: memory.title,
      detail: memory.note || 'Souvenir familial',
      profile: profiles.find(profile => profile.id === memory.profileId),
      photoUrl: memory.photoUrl
    }));
    return [...eventItems, ...memoryItems].sort((left, right) => right.date.localeCompare(left.date));
  }, [profiles, snapshot?.events, snapshot?.memories]);

  const toggleHousehold = (householdId: string) => setExpandedHouseholds(current => {
    const next = new Set(current);
    if (next.has(householdId)) next.delete(householdId); else next.add(householdId);
    return next;
  });

  const recenterTree = useCallback(() => {
    const viewport = fullTreeScrollRef.current;
    if (!viewport) return;
    window.requestAnimationFrame(() => viewport.scrollTo({
      left: Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2),
      top: Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2),
      behavior: 'smooth'
    }));
  }, []);
  useEffect(() => {
    if (!treeFullscreen) return undefined;
    const timer = window.setTimeout(recenterTree, 120);
    return () => window.clearTimeout(timer);
  }, [recenterTree, treeFocusId, treeFullscreen]);

  const selectProfile = (profile: FamilyTreeProfile) => {
    const member = profile.memberId ? members.find(item => item.id === profile.memberId) : undefined;
    setSelectedProfile(profile);
    setTreeFocusId(profile.id);
    setProfileTab('infos');
    setEditingProfile(false);
    setProfileForm({
      name: profile.displayName,
      birthDate: profile.birthDate || '',
      city: profile.originCity || '',
      country: profile.country || '',
      school: member?.schoolOrEmployer || '',
      languages: profile.languages.join(', '),
      bio: profile.bio || '',
      visibility: profile.visibility
    });
  };
  const openAddRelative = (profile: FamilyTreeProfile) => {
    if (!ensureManage()) return;
    setPersonForm({ name: '', date: '', city: '', country: '', anchorId: profile.id, relation: 'parent' });
    setModal('add-person');
  };
  const openProfileEditor = (profile: FamilyTreeProfile) => {
    selectProfile(profile);
    setEditingProfile(true);
  };
  const showFeedback = (message: string) => setNotice(message);

  const ensureManage = () => {
    if (editingAllowed) return true;
    showFeedback(readingMode ? 'Quittez le mode lecture pour modifier votre branche.' : 'Seul un parent ou le chef de famille peut modifier l’arbre.');
    return false;
  };

  const openEmptyRelative = (relation: 'parent' | 'enfant') => {
    if (!ensureManage()) return;
    setPersonForm({ name: '', date: '', city: '', country: '', anchorId: '', relation });
    setModal('add-person');
  };

  const handleTabTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (target.closest('button, input, select, textarea, .fr-tree-surface, .fr-world-card, .fr-profile-drawer, .fr-modal')) return;
    const touch = event.touches[0];
    tabSwipeStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTabTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = tabSwipeStartRef.current;
    tabSwipeStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    const currentIndex = rootTabs.findIndex(([tab]) => tab === activeTab);
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < rootTabs.length) setActiveTab(rootTabs[nextIndex][0]);
  };

  const handleAddPerson = async () => {
    if (!ensureManage() || !personForm.name.trim()) return;
    setBusy(true);
    try {
      const coordinates = await resolveFamilyRootCoordinates(personForm.city, personForm.country);
      const birth = personForm.date ? new Date(`${personForm.date}T12:00:00`) : null;
      const isMinor = birth && !Number.isNaN(birth.getTime())
        ? new Date(birth.getFullYear() + 18, birth.getMonth(), birth.getDate()) > new Date()
        : false;
      const added = await familyRootsService.addProfile(activeFoyerId, {
        displayName: personForm.name.trim(),
        birthDate: personForm.date || undefined,
        branch: 'proche',
        country: personForm.country || undefined,
        originCity: personForm.city || undefined,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        nickname: undefined,
        bio: undefined,
        languages: [],
        photoUrl: undefined,
        isMinor: Boolean(isMinor),
        visibility: isMinor ? 'prive' : 'famille',
        isMemorial: false,
        deathDate: undefined,
        sharedFields: ['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url']
      });
      const anchorId = personForm.anchorId || treeFocusId || localProfiles[0]?.id;
      if (anchorId) {
        const link = relationForNewRelative(anchorId, added.id, personForm.relation);
        await familyRootsService.addRelationship(activeFoyerId, link.sourceProfileId, link.targetProfileId, link.relationshipType);
      }
      setPersonForm({ name: '', date: '', city: '', country: '', anchorId: '', relation: 'parent' });
      setModal(null);
      setTreeFocusId(added.id);
      await reload(true);
      showFeedback(`${added.displayName} apparaît maintenant dans l’arbre.`);
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La personne n’a pas pu être ajoutée.');
    } finally { setBusy(false); }
  };

  const handleAddRelationship = async () => {
    if (!ensureManage() || !relationshipForm.source || !relationshipForm.target || relationshipForm.source === relationshipForm.target) return;
    if (relationshipIssue) return showFeedback(relationshipIssue);
    setBusy(true);
    try {
      await familyRootsService.addRelationship(activeFoyerId, relationshipForm.source, relationshipForm.target, relationshipForm.relation);
      setModal(null);
      await reload(true);
      showFeedback('Le lien familial a été ajouté à l’arbre.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'Le lien n’a pas pu être ajouté.');
    } finally { setBusy(false); }
  };

  const openLinkGuide = (sourceProfileId = '') => {
    setRelationshipForm(current => ({ ...current, source: sourceProfileId || current.source }));
    setModal('link-persons');
  };

  const openBranchDetails = (branchId: string) => {
    setSelectedBranchId(branchId);
    setModal('branch-details');
  };

  const requestDuplicateReview = async (local: FamilyTreeProfile, remote: FamilyTreeProfile) => {
    if (!ensureManage()) return;
    setBusy(true);
    try {
      await familyRootsService.requestIdentityLink(local.id, remote.id);
      await reload(true);
      showFeedback('La demande de rapprochement a été envoyée à l’autre branche.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La demande de rapprochement n’a pas pu être envoyée.');
    } finally {
      setBusy(false);
    }
  };

  const respondToDuplicateReview = async (requestId: string, accept: boolean) => {
    if (!ensureManage()) return;
    setBusy(true);
    try {
      await familyRootsService.respondIdentityLink(requestId, accept);
      await reload(true);
      showFeedback(accept ? 'Les deux fiches ont été rapprochées.' : 'Le rapprochement a été refusé.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La demande n’a pas pu être traitée.');
    } finally {
      setBusy(false);
    }
  };

  const getBranchShareDraft = (profileId: string, targetFoyerId: string) => {
    const key = `${profileId}:${targetFoyerId}`;
    const stored = shareDrafts[key];
    if (stored) return stored;
    const saved = profileShares.find(share => share.profileId === profileId && share.targetFoyerId === targetFoyerId);
    return saved || { isVisible: true, sharedFields: DEFAULT_SHARED_FIELDS };
  };

  const updateBranchShareDraft = (profileId: string, targetFoyerId: string, next: { isVisible: boolean; sharedFields: string[] }) => {
    setShareDrafts(current => ({ ...current, [`${profileId}:${targetFoyerId}`]: next }));
  };

  const saveBranchShare = async (profile: FamilyTreeProfile, targetFoyerId: string) => {
    if (!ensureManage()) return;
    const settings = getBranchShareDraft(profile.id, targetFoyerId);
    setBusy(true);
    try {
      await familyRootsService.setProfileBranchVisibility(activeFoyerId, profile.id, targetFoyerId, settings.isVisible, settings.sharedFields);
      setSnapshot(current => current ? {
        ...current,
        profileShares: [...current.profileShares.filter(share => !(share.profileId === profile.id && share.targetFoyerId === targetFoyerId)), { profileId: profile.id, targetFoyerId, ...settings }]
      } : current);
      showFeedback('Les options de partage de cette branche ont été enregistrées.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'Les options de partage n’ont pas pu être enregistrées.');
    } finally {
      setBusy(false);
    }
  };

  const exportFamilyBooklet = async () => {
    if (!profiles.length) return;
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const document = new jsPDF({ unit: 'mm', format: 'a4' });
      document.setProperties({ title: `Racines familiales - ${familyName}` });
      document.setFillColor(110, 75, 216);
      document.rect(0, 0, 210, 48, 'F');
      document.setTextColor(255, 255, 255);
      document.setFontSize(25);
      document.text('Racines familiales', 18, 23);
      document.setFontSize(12);
      document.text(familyName, 18, 33);
      document.setTextColor(25, 25, 25);
      document.setFontSize(15);
      document.text('Nos branches', 18, 65);
      let y = 75;
      branches.forEach(branch => {
        document.setFillColor(248, 246, 252);
        document.roundedRect(18, y - 7, 174, 18, 3, 3, 'F');
        document.setFontSize(12);
        document.text(branch.name, 24, y);
        document.setFontSize(9);
        document.setTextColor(100, 95, 110);
        document.text(`${branch.location} - ${branch.profiles.length} membre${branch.profiles.length > 1 ? 's' : ''}`, 24, y + 6);
        document.setTextColor(25, 25, 25);
        y += 24;
      });
      document.addPage();
      document.setFontSize(16);
      document.text('Membres visibles', 18, 22);
      y = 34;
      profiles.filter(profile => profile.visibility !== 'masque').forEach(profile => {
        if (y > 270) { document.addPage(); y = 22; }
        document.setFontSize(11);
        document.text(profile.displayName, 20, y);
        document.setFontSize(9);
        document.setTextColor(100, 95, 110);
        document.text(`${displayYear(profile)} - ${profileLocation(profile)}`, 74, y);
        document.setTextColor(25, 25, 25);
        y += 10;
      });
      document.save(`racines-${familyName.toLocaleLowerCase('fr-FR').replace(/[^a-z0-9]+/g, '-') || 'famille'}.pdf`);
      showFeedback('Le livret familial a été préparé.');
    } catch {
      showFeedback('Le livret n’a pas pu être créé sur cet appareil.');
    } finally {
      setBusy(false);
    }
  };

  const handleConnectBranch = async () => {
    if (!ensureManage() || !branchForm.code.trim() || !branchForm.source) return;
    setBusy(true);
    try {
      await familyRootsService.requestConnection(activeFoyerId, branchForm.code.trim(), branchForm.source, branchForm.relation);
      setModal(null);
      await reload(true);
      onSendNotification?.('Demande de branche envoyée', 'Votre demande attend maintenant la confirmation de l’autre foyer.', 'family_roots');
      showFeedback('La demande a été envoyée à cette branche.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La demande n’a pas pu être envoyée.');
    } finally { setBusy(false); }
  };

  const handleRespondConnection = async (connection: FamilyTreeConnection, accept: boolean, targetProfileId?: string) => {
    if (!ensureManage()) return;
    const targetProfile = localProfiles.find(profile => profile.id === targetProfileId);
    if (accept && !targetProfile) return showFeedback('Choisissez la personne de votre foyer liée à cette branche.');
    setBusy(true);
    try {
      await familyRootsService.respondConnection(connection.id, accept, targetProfile?.id);
      await reload(true);
      onSendNotification?.(accept ? 'Branche reliée' : 'Demande refusée', accept ? 'Les deux arbres familiaux sont maintenant reliés.' : 'La demande de branche a été refusée.', 'family_roots');
      showFeedback(accept ? 'Les deux branches sont maintenant reliées.' : 'La demande a été refusée.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La demande n’a pas pu être traitée.');
    } finally { setBusy(false); }
  };

  const copyInvite = async () => {
    if (!snapshot?.shareCode) return;
    try {
      await navigator.clipboard?.writeText(snapshot.shareCode);
      showFeedback('Le code de la branche a été copié.');
    } catch { showFeedback(`Code à partager : ${snapshot.shareCode}`); }
  };

  const inviteLink = (() => {
    if (!snapshot?.shareCode || typeof window === 'undefined') return '';
    const url = new URL('/app', window.location.origin);
    url.searchParams.set('racines', '1');
    url.searchParams.set('rootCode', snapshot.shareCode);
    return url.toString();
  })();
  const inviteQrUrl = inviteLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(inviteLink)}`
    : '';

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard?.writeText(inviteLink);
      showFeedback('Le lien d’invitation a été copié.');
    } catch {
      showFeedback('Le lien ne peut pas être copié automatiquement.');
    }
  };

  const shareInviteLink = async () => {
    if (!inviteLink) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Invitation Racines familiales', text: 'Rejoins ma branche familiale sur MyFamily+.', url: inviteLink });
        return;
      }
      await copyInviteLink();
    } catch {
      // Annuler le partage ne doit pas déclencher une erreur visible.
    }
  };

  const persistProfile = async (nextProfile: FamilyTreeProfile) => {
    await familyRootsService.updateProfile(activeFoyerId, nextProfile);
    setSnapshot(current => current ? {
      ...current,
      profiles: current.profiles.map(profile => profile.id === nextProfile.id ? nextProfile : profile)
    } : current);
    setSelectedProfile(nextProfile);
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile || !ensureManage() || !selectedProfile.isLocal || !profileForm.name.trim()) return;
    setBusy(true);
    try {
      const locationChanged = profileForm.city.trim() !== (selectedProfile.originCity || '') || profileForm.country.trim() !== (selectedProfile.country || '');
      const coordinates = locationChanged
        ? await resolveFamilyRootCoordinates(profileForm.city.trim(), profileForm.country.trim())
        : Number.isFinite(selectedProfile.latitude) && Number.isFinite(selectedProfile.longitude)
          ? { latitude: selectedProfile.latitude as number, longitude: selectedProfile.longitude as number }
          : null;
      const birth = profileForm.birthDate ? new Date(`${profileForm.birthDate}T12:00:00`) : null;
      const isMinor = birth && !Number.isNaN(birth.getTime())
        ? new Date(birth.getFullYear() + 18, birth.getMonth(), birth.getDate()) > new Date()
        : selectedProfile.isMinor;
      const nextProfile: FamilyTreeProfile = {
        ...selectedProfile,
        displayName: profileForm.name.trim(),
        birthDate: profileForm.birthDate || undefined,
        originCity: profileForm.city.trim() || undefined,
        country: profileForm.country.trim() || undefined,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        languages: profileForm.languages.split(',').map(item => item.trim()).filter(Boolean),
        bio: profileForm.bio.trim() || undefined,
        isMinor: Boolean(isMinor),
        visibility: isMinor && profileForm.visibility === 'famille' ? 'prive' : profileForm.visibility
      };
      if (selectedProfile.memberId && onUpdateMemberProfile) {
        await onUpdateMemberProfile(selectedProfile.memberId, {
          displayName: nextProfile.displayName,
          birthDate: nextProfile.birthDate || '',
          schoolOrEmployer: profileForm.school.trim()
        });
      }
      await persistProfile(nextProfile);
      setEditingProfile(false);
      showFeedback('La fiche a été mise à jour dans le foyer et dans l’arbre.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La fiche n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  };

  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedProfile || !ensureManage() || !selectedProfile.isLocal) return;
    setPhotoCropFile(file);
    setModal('photo-crop');
  };

  const saveCroppedProfilePhoto = async (croppedBlob: Blob) => {
    if (!selectedProfile || !ensureManage() || !selectedProfile.isLocal) return;
    setBusy(true);
    try {
      const croppedFile = new File([croppedBlob], `portrait-${selectedProfile.id}.jpg`, { type: croppedBlob.type || 'image/jpeg' });
      const { blob, ext } = await compressImageToBlob(croppedFile, 'profile');
      const photoKey = selectedProfile.memberId || selectedProfile.id;
      const photoUrl = await uploadBlobToStorage('avatars', `${activeFoyerId}/roots_${photoKey}.${ext}`, blob);
      const nextProfile = { ...selectedProfile, photoUrl };
      if (selectedProfile.memberId && onUpdateMemberProfile) {
        await onUpdateMemberProfile(selectedProfile.memberId, { photoUrl });
      }
      await persistProfile(nextProfile);
      setPhotoCropFile(null);
      setModal(null);
      showFeedback('La photo a été mise à jour dans la fiche et dans le foyer.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La photo n’a pas pu être envoyée.');
    } finally { setBusy(false); }
  };

  const regenerateInvite = async () => {
    if (!ensureManage()) return;
    setBusy(true);
    try {
      const code = await familyRootsService.regenerateCode(activeFoyerId);
      setSnapshot(current => current ? { ...current, shareCode: code } : current);
      showFeedback('Un nouveau code de branche est prêt.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'Impossible de créer un nouveau code.');
    } finally { setBusy(false); }
  };

  const undoJournalAction = async (logId: string) => {
    if (!ensureManage()) return;
    setBusy(true);
    try {
      await familyRootsService.undoAction(logId);
      await reload(true);
      showFeedback('L’action récente a été annulée.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'Cette action ne peut pas être annulée.');
    } finally {
      setBusy(false);
    }
  };

  const undoRecentCorrection = async (requestId: string) => {
    if (!ensureManage()) return;
    setBusy(true);
    try {
      await familyRootsService.undoCorrection(requestId);
      await reload(true);
      showFeedback('La correction a été annulée.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La correction ne peut pas être annulée.');
    } finally {
      setBusy(false);
    }
  };

  const disconnectBranch = async (branchId: string) => {
    if (!ensureManage()) return;
    const connection = confirmedBranches.find(item => item.requesterFoyerId === branchId || item.targetFoyerId === branchId);
    if (!connection) return;
    setBusy(true);
    try {
      await familyRootsService.cancelConnection(connection.id);
      setModal(null);
      await reload(true);
      showFeedback('La branche a été déliée des deux arbres.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La branche n’a pas pu être déliée.');
    } finally {
      setBusy(false);
    }
  };

  const publishEvent = (profile: FamilyTreeProfile) => {
    const title = `Anniversaire de ${profile.displayName}`;
    onAddAgendaEvent?.({ title, type: 'social', dateTime: profile.birthDate || new Date().toISOString().slice(0, 10), done: false });
    showFeedback('L’événement a été ajouté à l’agenda du foyer.');
  };

  const createBranchGroup = async () => {
    if (!selectedProfile || !onCreateBranchGroup) return;
    const matchingMemberIds = members.filter(member => member.name === selectedProfile.displayName).map(member => member.id);
    try {
      await onCreateBranchGroup(`Famille · ${selectedProfile.displayName}`, matchingMemberIds);
      showFeedback('Le groupe familial a été créé.');
    } catch { showFeedback('Le groupe n’a pas pu être créé.'); }
  };

  const fullTree = treeFullscreen && (
    <div className="fr-fullscreen-tree-shell">
      <button className="fr-fullscreen-close" onClick={() => setTreeFullscreen(false)} aria-label="Quitter le plein écran"><X /></button>
      <div className="fr-fullscreen-scroll" ref={fullTreeScrollRef}>
        <div className="fr-fullscreen-scale" style={{ transform: `scale(${treeScale})` }}>
          <TreeBoard profiles={visibleTreeProfiles} relationships={relationshipGraph} activeFoyerId={activeFoyerId} familyName={familyName} focusProfileId={treeFocusId} selectedProfileId={selectedProfile?.id} expandedHouseholds={expandedHouseholds} onToggleHousehold={toggleHousehold} onOpenBranch={openBranchDetails} onSelect={selectProfile} onAddRelative={editingAllowed ? openAddRelative : undefined} density={resolvedTreeDensity} fullScreen />
        </div>
      </div>
      <div className="fr-tree-minimap" aria-label="Aperçu des générations">{genealogyLayout.generations.map(generation => <button key={generation.offset} onClick={() => { const focus = generation.unions.flatMap(union => union.profiles)[0]; if (focus) setTreeFocusId(focus.id); }}><span>{generation.unions.reduce((count, union) => count + union.profiles.length, 0)}</span><small>{generation.label}</small></button>)}</div>
      <div className="fr-zoom-controls">
        <button onClick={() => setTreeScale(value => Math.max(0.6, Number((value - 0.08).toFixed(2))))}><ZoomOut /></button>
        <button onClick={() => { setTreeScale(visibleTreeProfiles.length > 12 ? .68 : .84); recenterTree(); }}>{Math.round(treeScale * 100)}%</button>
        <button onClick={() => setTreeScale(value => Math.min(1.18, Number((value + 0.08).toFixed(2))))}><ZoomIn /></button>
        <button onClick={recenterTree} aria-label="Recentrer"><RotateCcw /></button>
      </div>
    </div>
  );

  return (
    <div className="family-roots" onTouchStart={handleTabTouchStart} onTouchEnd={handleTabTouchEnd}>
      <div className="fr-page">
        <div className="fr-sticky-shell">
          <header className="fr-header">
            <div className="fr-title"><h1>Racines familiales <TreePine /></h1><p>Notre histoire, nos liens, nos racines</p></div>
            {canManage ? <button className="fr-icon-button" onClick={() => editingAllowed ? setModal('invite') : setReadingMode(false)} aria-label={editingAllowed ? 'Inviter une branche' : 'Quitter le mode lecture'}>{editingAllowed ? <Share2 /> : <BookOpen />}</button> : <span />}
          </header>

          <nav className="fr-tabs" aria-label="Racines familiales">
            {rootTabs.map(([tab, label]) => <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'is-active' : ''}>{label}</button>)}
          </nav>
        </div>

        {notice && <div className="fr-notice"><Check />{notice}</div>}
        {loading && <div className="fr-loading"><span /><span /><span /></div>}
        {error && <div className="fr-error"><CircleHelp /><p>{error}</p><button onClick={() => void reload(true)}>Réessayer</button></div>}

        {!loading && !error && activeTab === 'tree' && <main className="fr-content fr-tree-content">
          <section className="fr-tree-hero">
            <div><span className="fr-eyebrow"><Sparkles /> Arbre vivant</span><h2>{familyName}</h2><p>{profiles.length} personne{profiles.length > 1 ? 's' : ''} visible{profiles.length > 1 ? 's' : ''} · {confirmedBranches.length} branche{confirmedBranches.length > 1 ? 's' : ''} liée{confirmedBranches.length > 1 ? 's' : ''}</p></div>
            <div className="fr-tree-hero-actions">{editingAllowed && <button className="fr-review-button" onClick={() => setModal('review-center')}><ShieldCheck /><span>Vérifier</span>{verificationCount > 0 && <b>{verificationCount}</b>}</button>}<button className="fr-expand-tree" onClick={() => setTreeFullscreen(true)}><ZoomIn /><span>Voir tout</span></button></div>
          </section>
          <div className="fr-tree-toolbar"><div className="fr-tree-scope"><button className={treeScope === 'mine' ? 'is-active' : ''} onClick={() => setTreeScope('mine')}>Ma branche</button><button className={treeScope === 'global' ? 'is-active' : ''} onClick={() => setTreeScope('global')}>Vue globale</button></div><label className="fr-tree-focus"><UserRoundSearch /><span>Voir depuis</span><select value={treeFocusId} onChange={event => setTreeFocusId(event.target.value)}>{visibleTreeProfiles.filter(profile => profile.visibility !== 'masque').map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><div className="fr-density-control" aria-label="Densité de l’arbre">{([['auto', 'Auto'], ['comfortable', 'Aéré'], ['compact', 'Compact']] as Array<[TreeDensity, string]>).map(([value, label]) => <button key={value} className={treeDensity === value ? 'is-active' : ''} onClick={() => setTreeDensity(value)}>{label}</button>)}</div><button className={`fr-legend-toggle ${legendOpen ? 'is-active' : ''}`} onClick={() => setLegendOpen(current => !current)}>Légende</button>{canManage && <button className={`fr-reading-mode ${readingMode ? 'is-active' : ''}`} onClick={() => setReadingMode(current => !current)}><BookOpen /> {readingMode ? 'Quitter la lecture' : 'Mode lecture'}</button>}<button className="fr-export-booklet" onClick={() => void exportFamilyBooklet()} disabled={busy}><Download /> Livret</button></div>
          {focusedTreeProfile && <div className="fr-tree-position"><UserRoundSearch /><span>Arbre centré sur</span><strong>{focusedTreeProfile.displayName}</strong><small>{describeRelationship(relationshipReferenceId || focusedTreeProfile.id, focusedTreeProfile.id, relationshipGraph) || profileLocation(focusedTreeProfile)}</small></div>}
          {legendOpen && <div className="fr-tree-legend"><span><i className="is-couple" />Union</span><span><i className="is-child" />Descendance</span><span><i className="is-former" />Ancienne union</span><span><i className="is-branch" />Branche reliée</span><span><i className="is-pending" />Lien à confirmer</span></div>}
          {(readingMode || !canManage) && <div className="fr-reading-banner"><ShieldCheck /><span>Lecture seule : l’arbre peut être consulté sans afficher les outils de modification.</span></div>}

          {editingAllowed && pendingConnections.filter(connection => connection.direction === 'incoming').map(connection => (
            <section className="fr-branch-request" key={connection.id}>
              <div className="fr-request-icon"><Bell /></div>
              <div><strong>{connection.requesterDisplayName || 'Une branche'} souhaite se relier</strong><p>Cette branche indique un lien « {relationshipLabels[connection.relationshipType]} ». Choisissez la personne précise de votre foyer à relier.</p></div>
              <label className="fr-request-profile">Relier à<select value={connectionTargets[connection.id] || ''} onChange={event => setConnectionTargets(current => ({ ...current, [connection.id]: event.target.value }))}><option value="">Choisir une personne</option>{localProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></label>
              {connectionTargets[connection.id] && <div className="fr-request-preview"><GitMerge />Après validation, {connection.requesterDisplayName || 'cette personne'} sera relié comme {relationshipLabels[connection.relationshipType].toLocaleLowerCase('fr-FR')} de {localProfiles.find(profile => profile.id === connectionTargets[connection.id])?.displayName || 'la personne choisie'} dans les deux arbres.</div>}
              <div className="fr-request-actions"><button onClick={() => void handleRespondConnection(connection, false)}>Refuser</button><button onClick={() => void handleRespondConnection(connection, true, connectionTargets[connection.id])} disabled={busy || !connectionTargets[connection.id]}>Accepter</button></div>
            </section>
          ))}
          {editingAllowed && identityRequests.filter(request => request.direction === 'incoming' && request.status === 'pending').map(request => {
            const source = profiles.find(profile => profile.id === request.sourceProfileId);
            const target = profiles.find(profile => profile.id === request.targetProfileId);
            return <section className="fr-branch-request" key={request.id}><div className="fr-request-icon"><GitMerge /></div><div><strong>Rapprochement de fiches proposé</strong><p>{source?.displayName || 'Une fiche'} semble correspondre à {target?.displayName || 'une personne de votre arbre'}.</p></div><div className="fr-request-actions"><button onClick={() => void respondToDuplicateReview(request.id, false)}>Refuser</button><button onClick={() => void respondToDuplicateReview(request.id, true)} disabled={busy}>Confirmer</button></div></section>;
          })}

          <section className="fr-tree-surface">
            <TreeBoard profiles={visibleTreeProfiles} relationships={relationshipGraph} activeFoyerId={activeFoyerId} familyName={familyName} focusProfileId={treeFocusId} selectedProfileId={selectedProfile?.id} expandedHouseholds={expandedHouseholds} onToggleHousehold={toggleHousehold} onOpenBranch={openBranchDetails} onSelect={selectProfile} onAddRelative={editingAllowed ? openAddRelative : undefined} density={resolvedTreeDensity} onEmptyAdd={openEmptyRelative} onEmptyLinkBranch={() => editingAllowed && setModal('link-branch')} />
          </section>

          {editingAllowed && <div className="fr-tree-actions">
            <button onClick={() => { const anchor = profiles.find(profile => profile.id === treeFocusId) || localProfiles[0]; if (anchor) openAddRelative(anchor); else setModal('add-person'); }}><Plus /> Ajouter un proche</button>
            <button onClick={() => openLinkGuide()}><Link2 /> Relier deux personnes</button>
          </div>}
          {editingAllowed && possibleLinkSuggestions.length > 0 && <section className="fr-link-suggestions"><div className="fr-section-heading"><div><span>Liens à vérifier</span><small>Une suggestion n’est jamais ajoutée sans votre validation.</small></div><Sparkles /></div>{possibleLinkSuggestions.slice(0, 3).map(({ profile, candidate }) => <div className="fr-link-suggestion-row" key={`${profile.id}-${candidate.id}`}><span>{profile.displayName} et {candidate.displayName}</span><button onClick={() => { setRelationshipForm({ source: profile.id, target: candidate.id, relation: 'fratrie' }); setModal('link-persons'); }}>Vérifier</button></div>)}</section>}
          {editingAllowed && profileSuggestions.length > 0 && <section className="fr-completion-card"><div className="fr-section-heading"><div><span>Arbre à compléter</span><small>Des suggestions simples pour rendre les fiches plus utiles.</small></div><UserRoundSearch /></div>{profileSuggestions.slice(0, 3).map(({ profile, missing }) => <button key={profile.id} onClick={() => missing.includes('lien familial') && missing.length === 1 ? openLinkGuide(profile.id) : openProfileEditor(profile)}><ProfileAvatar profile={profile} /><span><strong>{profile.displayName}</strong><small>{missing.join(' · ')}</small></span><ChevronRight /></button>)}</section>}
          {editingAllowed && <button className="fr-primary-action" onClick={() => setModal('link-branch')}><Plus /> Lier une nouvelle branche</button>}

          {eventList.length > 0 && <section className="fr-upcoming-card"><div className="fr-section-heading"><span>Événements à venir</span><CalendarDays /></div>{eventList.map(event => <div className="fr-event-row" key={event.id}><span className="fr-event-icon">🎁</span><div><strong>{event.title}</strong><small>{new Date(`${event.eventDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</small></div><b>{event.repeatsYearly ? 'Chaque année' : 'À noter'}</b></div>)}</section>}
        </main>}

        {!loading && !error && activeTab === 'cousins' && <main className="fr-content">
          <section className="fr-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une personne, une ville, une branche…" /></section>
          <label className="fr-relationship-reference"><UserRoundSearch /><span>Afficher les liens depuis</span><select value={relationshipReferenceId} onChange={event => setRelationshipReferenceId(event.target.value)}>{localProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></label>
          <section className="fr-stats-grid"><article><UsersRound /><b>{cousinProfiles.length}</b><span>Cousins & cousines</span></article><article><Link2 /><b>{confirmedBranches.length}</b><span>Branches liées</span></article><article><Globe2 /><b>{countries}</b><span>Pays</span></article></section>
          <div className="fr-filter-row">{([['all', 'Tous'], ['nearby', 'Proches'], ['country', 'Par pays'], ['branch', 'Par branche']] as const).map(([filter, label]) => <button className={branchFilter === filter ? 'is-active' : ''} key={filter} onClick={() => setBranchFilter(filter)}>{label}</button>)}</div>
          <section className="fr-cousins-card"><div className="fr-section-heading"><span>Famille retrouvée <small>({cousinProfiles.length})</small></span><UsersRound /></div>{cousinProfiles.length ? cousinProfiles.map(profile => <button className="fr-cousin-row" key={profile.id} onClick={() => selectProfile(profile)}><ProfileAvatar profile={profile} /><div><strong>{profile.displayName}</strong><span>{describeRelationship(relationshipReferenceId, profile.id, relationshipGraph)}</span><small>{profileLocation(profile)}</small></div><MessageCircle /><MoreHorizontal /></button>) : <div className="fr-empty-list">Les personnes correspondant à votre recherche apparaîtront ici.</div>}</section>
          {possibleDuplicates.length > 0 && <section className="fr-duplicate-card"><div className="fr-section-heading"><div><span>Fiches à rapprocher</span><small>Une confirmation est demandée avant toute fusion.</small></div><GitMerge /></div>{possibleDuplicates.slice(0, 3).map(({ local, remote }) => <div className="fr-duplicate-row" key={`${local.id}-${remote.id}`}><div><strong>{local.displayName}</strong><span>{remote.displayName} dans une autre branche</span></div><button disabled={busy} onClick={() => void requestDuplicateReview(local, remote)}>Vérifier</button></div>)}</section>}
          {cousinProfiles.length > 5 && <button className="fr-primary-action">Voir tous les cousins ({cousinProfiles.length})</button>}
        </main>}

        {!loading && !error && activeTab === 'branches' && <main className="fr-content">
          <section className="fr-map-card"><div className="fr-section-heading"><div><span>Branches familiales</span><small>Les repères indiquent les villes et pays renseignés dans les fiches.</small></div><Globe2 /></div><div className="fr-map-preview"><img className="fr-map-light" src="/family-roots/world-map-light.png" alt="Carte du monde" /><img className="fr-map-dark" src="/family-roots/world-map-dark.png" alt="" />{branchMapMarkers.map(({ branch, coordinates }) => <button key={branch.id} className="fr-map-pin" style={getMapPosition(coordinates)} onClick={() => setActiveTab('map')}><span>{branch.profiles.length}</span>{coordinates.label}</button>)}{!branchMapMarkers.length && <p className="fr-map-empty">Ajoutez une ville ou un pays dans une fiche pour placer votre branche sur la carte.</p>}</div></section>
          <section className="fr-branches-card"><div className="fr-section-heading"><div><span>Liste des branches</span><small>Foyers proches, branches liées et demandes en cours.</small></div><Link2 /></div>{branches.map(branch => <button className="fr-branch-row" key={branch.id} onClick={() => openBranchDetails(branch.id)}><div className={`fr-branch-badge ${branch.color}`}><UsersRound /></div><div className="fr-branch-row-copy"><strong>{branch.name}</strong><span>{branch.location} · {branch.profiles.length} membre{branch.profiles.length > 1 ? 's' : ''}</span></div><b className={branch.status === 'Vous' ? 'is-owner' : ''}>{branch.status}</b><ChevronRight /></button>)}{pendingConnections.filter(connection => connection.direction === 'outgoing').map(connection => <div className="fr-branch-row is-pending" key={connection.id}><div className="fr-branch-badge blue"><Send /></div><div className="fr-branch-row-copy"><strong>{connection.requesterDisplayName || 'Invitation envoyée'}</strong><span>En attente de confirmation par l’autre foyer</span></div><b>En attente</b></div>)}</section>
          {editingAllowed && <button className="fr-primary-action" onClick={() => setModal('link-branch')}><Plus /> Lier une nouvelle branche</button>}
          {(snapshot?.validationLogs.length || snapshot?.corrections.some(correction => correction.status === 'accepted')) ? <section className="fr-trust-journal"><div className="fr-section-heading"><div><span>Journal de confiance</span><small>Les validations importantes de votre branche.</small></div><ShieldCheck /></div>{snapshot?.corrections.filter(correction => correction.status === 'accepted' && FAMILY_ROOTS_RENDER_TIME - new Date(correction.createdAt).getTime() < 86400000).slice(0, 2).map(correction => <div className="fr-journal-row" key={correction.id}><div><strong>Correction validée</strong><span>{new Date(correction.createdAt).toLocaleDateString('fr-FR')}</span></div>{editingAllowed && <button onClick={() => void undoRecentCorrection(correction.id)} disabled={busy}><RotateCcw /> Annuler</button>}</div>)}{snapshot?.validationLogs.slice(0, 6).map(log => { const reversible = editingAllowed && !log.revertedAt && Boolean(log.reversibleUntil) && new Date(log.reversibleUntil as string).getTime() > FAMILY_ROOTS_RENDER_TIME; const actor = members.find(member => member.userId === log.actorUserId)?.name || (log.actorUserId ? 'Une branche liée' : 'Un parent'); return <div className="fr-journal-row" key={log.id}><div><strong>{log.summary}</strong><span>{actor} · {new Date(log.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>{reversible && <button onClick={() => void undoJournalAction(log.id)} disabled={busy}><RotateCcw /> Annuler</button>}</div>; })}</section> : null}
        </main>}

        {!loading && !error && activeTab === 'map' && <main className="fr-content">
          <section className="fr-world-card"><div className="fr-world-copy"><span className="fr-eyebrow"><MapPinned /> Famille dans le monde</span><h2>Vos branches reliées</h2><p>La carte utilise les coordonnées réelles des villes renseignées. Les lignes montrent les branches reliées à votre foyer.</p></div>{branchMapMarkers.length ? <Suspense fallback={<div className="fr-map-loading">Ouverture de la carte…</div>}><FamilyRootsWorldMap markers={branchMapMarkers.map(({ branch, profile, coordinates }) => ({ id: branch.id, name: branch.name, location: branch.location, isLocal: branch.id === activeFoyerId, profile, coordinates }))} onSelect={selectProfile} /></Suspense> : <div className="fr-world-map"><img className="fr-map-light" src="/family-roots/world-map-light.png" alt="Carte du monde des branches" /><img className="fr-map-dark" src="/family-roots/world-map-dark.png" alt="" /><p className="fr-map-empty">Ajoutez une ville ou un pays dans une fiche pour placer la branche.</p></div>}</section>
          <section className="fr-map-list">{branches.map(branch => <button key={branch.id} onClick={() => selectProfile(branch.profiles[0])}><div className={`fr-branch-badge ${branch.color}`}><UsersRound /></div><div><strong>{branch.name}</strong><span>{branch.location}</span></div><ChevronRight /></button>)}</section>
        </main>}

        {!loading && !error && activeTab === 'history' && <main className="fr-content">
          <section className="fr-history-hero"><span className="fr-eyebrow"><CalendarDays /> Histoire familiale</span><h2>Les moments qui relient vos branches</h2><p>Naissances, anniversaires, mariages et souvenirs validés dans l’arbre.</p></section>
          <section className="fr-history-timeline">{historyItems.length ? historyItems.map(item => <article key={item.id}><time>{new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</time><span className="fr-history-line" /><div className="fr-history-card">{item.photoUrl ? <img src={item.photoUrl} alt="" /> : item.profile ? <ProfileAvatar profile={item.profile} /> : <span className="fr-history-icon"><CalendarDays /></span>}<div><strong>{item.title}</strong><small>{item.detail}</small>{item.profile && <button onClick={() => selectProfile(item.profile as FamilyTreeProfile)}>{item.profile.displayName}</button>}</div></div></article>) : <div className="fr-empty-list">Ajoutez un événement ou un souvenir dans une fiche pour commencer l’histoire familiale.</div>}</section>
        </main>}
      </div>

      {selectedProfile && <aside className="fr-profile-drawer" role="dialog" aria-modal="true" aria-label={`Fiche de ${selectedProfile.displayName}`}>
        <button className="fr-profile-close" onClick={() => setSelectedProfile(null)} aria-label="Fermer"><ChevronLeft /></button>
        {editingAllowed && selectedProfile.isLocal && <button className="fr-profile-more" onClick={() => openLinkGuide(selectedProfile.id)} aria-label="Relier cette personne"><MoreHorizontal /></button>}
        <div className="fr-profile-identity">
          <ProfileAvatar profile={selectedProfile} />
          <h2>{selectedProfile.displayName}</h2>
          <span>{selectedRelationshipDescription || selectedProfile.nickname || selectedProfile.memberRole || 'Membre de la famille'}</span>
          <p>{selectedProfile.birthDate ? `Né${selectedProfile.displayName.endsWith('a') ? 'e' : ''} le ${new Date(`${selectedProfile.birthDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}${profileAge(selectedProfile) ? ` (${profileAge(selectedProfile)})` : ''}` : 'Date de naissance non renseignée'}</p>
          <p>📍 {profileLocation(selectedProfile)}</p>
        </div>
        <div className="fr-profile-actions">
          <button onClick={() => createBranchGroup()}><MessageCircle /><span>Message</span></button>
          <button onClick={() => publishEvent(selectedProfile)}><CalendarDays /><span>Événement</span></button>
          {editingAllowed && selectedProfile.isLocal && <button onClick={() => openLinkGuide(selectedProfile.id)}><Link2 /><span>Lier</span></button>}
        </div>
        <div className="fr-profile-tabs">
          {([['infos', 'Infos'], ['famille', 'Famille'], ['medias', 'Médias'], ['liens', 'Liens']] as Array<[ProfileTab, string]>).map(([tab, label]) => <button key={tab} onClick={() => setProfileTab(tab)} className={profileTab === tab ? 'is-active' : ''}>{label}</button>)}
        </div>

        {profileTab === 'infos' && (editingProfile ? <section className="fr-profile-section fr-profile-edit">
          <div className="fr-profile-section-heading"><h3>Modifier la fiche</h3><button onClick={() => setEditingProfile(false)}>Annuler</button></div>
          <label className="fr-photo-change"><Camera /> Changer la photo<input type="file" accept="image/*" onChange={event => void handleProfilePhotoUpload(event)} /></label>
          <div className="fr-form">
            <label>Prénom et nom<input value={profileForm.name} onChange={event => setProfileForm(form => ({ ...form, name: event.target.value }))} /></label>
            <label>Date de naissance<input type="date" value={profileForm.birthDate} onChange={event => setProfileForm(form => ({ ...form, birthDate: event.target.value }))} /></label>
            <div className="fr-form-duo"><label>Ville<input value={profileForm.city} onChange={event => setProfileForm(form => ({ ...form, city: event.target.value }))} placeholder="Ex. Dakar" /></label><label>Pays<input value={profileForm.country} onChange={event => setProfileForm(form => ({ ...form, country: event.target.value }))} placeholder="Ex. Sénégal" /></label></div>
            {selectedProfile.memberId && <label>École ou activité<input value={profileForm.school} onChange={event => setProfileForm(form => ({ ...form, school: event.target.value }))} placeholder="Ex. Collège, métier…" /></label>}
            <label>Langues<input value={profileForm.languages} onChange={event => setProfileForm(form => ({ ...form, languages: event.target.value }))} placeholder="Ex. Français, Wolof" /></label>
            <label>À propos<textarea value={profileForm.bio} onChange={event => setProfileForm(form => ({ ...form, bio: event.target.value }))} placeholder="Une phrase pour garder le souvenir." /></label>
            <label>Qui peut voir cette fiche ?<select value={profileForm.visibility} onChange={event => setProfileForm(form => ({ ...form, visibility: event.target.value as FamilyTreeProfile['visibility'] }))}>{!selectedProfile.isMinor && <option value="famille">Les foyers reliés</option>}<option value="prive">Mon foyer seulement</option><option value="masque">Masquée de l’arbre</option></select></label>
            <button className="fr-primary-action" disabled={busy || !profileForm.name.trim()} onClick={() => void handleSaveProfile()}><Save />{busy ? 'Enregistrement…' : 'Enregistrer la fiche'}</button>
          </div>
        </section> : <section className="fr-profile-section">
          <div className="fr-profile-section-heading"><h3>À propos</h3>{editingAllowed && selectedProfile.isLocal && <button onClick={() => setEditingProfile(true)}><Pencil /> Modifier</button>}</div>
          <dl>
            <div><dt>Ville</dt><dd>{profileLocation(selectedProfile)}</dd></div>
            {selectedMember?.schoolOrEmployer && <div><dt>École ou activité</dt><dd>{selectedMember.schoolOrEmployer}</dd></div>}
            <div><dt>Langues</dt><dd>{selectedProfile.languages.length ? selectedProfile.languages.join(', ') : 'Non renseignées'}</dd></div>
            <div><dt>Statut</dt><dd>{selectedProfile.isMinor ? 'Profil protégé' : 'Membre de la famille'}</dd></div>
            <div><dt>Partage</dt><dd>{selectedProfile.visibility === 'famille' ? 'Foyers reliés' : selectedProfile.visibility === 'prive' ? 'Mon foyer' : 'Masquée'}</dd></div>
          </dl>
          {selectedProfile.bio && <p className="fr-profile-bio">{selectedProfile.bio}</p>}
        </section>)}

        {profileTab === 'famille' && <section className="fr-profile-section"><div className="fr-profile-section-heading"><h3>Famille</h3>{editingAllowed && selectedProfile.isLocal && <button onClick={() => openLinkGuide(selectedProfile.id)}><Plus /> Lier</button>}</div>{selectedRelations.length ? selectedRelations.map(({ id, person, label }) => <button className="fr-link-row" key={id} onClick={() => selectProfile(person)}><ProfileAvatar profile={person} /><span><small>{label}</small><strong>{person.displayName}</strong></span><ChevronRight /></button>) : <p>Aucun lien familial n’est encore renseigné.</p>}</section>}

        {profileTab === 'medias' && <section className="fr-profile-section"><div className="fr-profile-section-heading"><h3>Souvenirs</h3><Image /></div>{selectedMemories.length ? selectedMemories.map(memory => <article className="fr-memory-row" key={memory.id}>{memory.photoUrl && <img src={memory.photoUrl} alt="" />}<div><strong>{memory.title}</strong><small>{memory.memoryDate ? new Date(`${memory.memoryDate}T12:00:00`).toLocaleDateString('fr-FR') : 'Souvenir familial'}</small><p>{memory.note}</p></div></article>) : <p>Aucun souvenir associé à cette fiche pour le moment.</p>}</section>}

        {profileTab === 'liens' && <section className="fr-profile-section">
          <div className="fr-profile-section-heading"><h3>Liens et branche</h3><Link2 /></div>
          <p>Reliez cette personne à un proche du foyer, ou connectez une autre branche familiale.</p>
          {editingAllowed && selectedProfile.isLocal && <><button className="fr-secondary-action" onClick={() => openLinkGuide(selectedProfile.id)}><Link2 /> Relier une personne</button><button className="fr-secondary-action" onClick={() => setModal('link-branch')}><UsersRound /> Entrer un code de branche</button><button className="fr-primary-action" onClick={() => setModal('invite')}><Share2 /> Partager une invitation</button></>}
          {!selectedProfile.isLocal && <div className="fr-readonly-branch"><BookOpen /><span>Cette fiche appartient à une branche liée. Elle est consultable en lecture seule.</span></div>}
          {editingAllowed && selectedProfile.isLocal && branches.filter(branch => branch.id !== activeFoyerId).length > 0 && <div className="fr-branch-privacy">
            <div className="fr-profile-section-heading"><h3>Partage par branche</h3><Eye /></div>
            <p>Chaque foyer lié ne voit que les informations autorisées ci-dessous.</p>
            {branches.filter(branch => branch.id !== activeFoyerId).map(branch => {
              const settings = getBranchShareDraft(selectedProfile.id, branch.id);
              const fields: Array<[string, string]> = [['photo_url', 'Photo'], ['birth_date', 'Année'], ['origin_city', 'Ville'], ['bio', 'Bio'], ['languages', 'Langues']];
              return <article key={branch.id}>
                <div className="fr-branch-privacy-title"><strong>{branch.name}</strong><button onClick={() => updateBranchShareDraft(selectedProfile.id, branch.id, { ...settings, isVisible: !settings.isVisible })}>{settings.isVisible ? <><Eye /> Visible</> : <><EyeOff /> Masqué</>}</button></div>
                {settings.isVisible && <div className="fr-share-fields">{fields.map(([field, label]) => <label key={field}><input type="checkbox" checked={settings.sharedFields.includes(field)} onChange={() => updateBranchShareDraft(selectedProfile.id, branch.id, { ...settings, sharedFields: settings.sharedFields.includes(field) ? settings.sharedFields.filter(item => item !== field) : [...settings.sharedFields, field] })} />{label}</label>)}</div>}
                <button className="fr-save-privacy" disabled={busy} onClick={() => void saveBranchShare(selectedProfile, branch.id)}>Enregistrer</button>
              </article>;
            })}
          </div>}
        </section>}
      </aside>}

      {modal === 'add-person' && <RootsModal title="Ajouter un proche" onClose={() => setModal(null)}><div className="fr-form"><label>Cette personne sera liée à<select value={personForm.anchorId || treeFocusId} onChange={event => setPersonForm(form => ({ ...form, anchorId: event.target.value }))}><option value="">Choisir une personne</option>{localProfiles.map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><div className="fr-relative-choices">{([['parent', 'Parent'], ['conjoint', 'Conjoint'], ['enfant', 'Enfant'], ['fratrie', 'Frère ou sœur'], ['beau_parent', 'Beau-parent'], ['tuteur', 'Tuteur']] as Array<[FamilyRelationshipType, string]>).map(([value, label]) => <button type="button" key={value} className={personForm.relation === value ? 'is-active' : ''} onClick={() => setPersonForm(form => ({ ...form, relation: value }))}>{label}</button>)}</div><label>Prénom et nom<input autoFocus value={personForm.name} onChange={event => setPersonForm(form => ({ ...form, name: event.target.value }))} placeholder="Prénom et nom" /></label><label>Date de naissance<input type="date" value={personForm.date} onChange={event => setPersonForm(form => ({ ...form, date: event.target.value }))} /></label><div className="fr-form-duo"><label>Ville<input value={personForm.city} onChange={event => setPersonForm(form => ({ ...form, city: event.target.value }))} placeholder="Ville" /></label><label>Pays<input value={personForm.country} onChange={event => setPersonForm(form => ({ ...form, country: event.target.value }))} placeholder="Pays" /></label></div><div className="fr-link-preview"><Sparkles />{personForm.anchorId || treeFocusId ? `${personForm.name.trim() || 'Cette personne'} apparaîtra comme ${relationshipLabels[personForm.relation].toLocaleLowerCase('fr-FR')} de ${profiles.find(profile => profile.id === (personForm.anchorId || treeFocusId))?.displayName || 'la personne choisie'}.` : 'Choisissez la personne à laquelle ce proche sera relié.'}</div><button className="fr-primary-action" disabled={busy || !personForm.name.trim() || !(personForm.anchorId || treeFocusId)} onClick={() => void handleAddPerson()}>{busy ? 'Ajout…' : 'Ajouter à l’arbre'}</button></div></RootsModal>}

      {modal === 'link-persons' && <RootsModal title="Construire un lien familial" onClose={() => setModal(null)}><div className="fr-form"><p className="fr-link-guide-step">1. Choisissez les deux personnes. 2. Indiquez leur lien. 3. Vérifiez leur place dans l’arbre.</p><label>Cette personne<select value={relationshipForm.source} onChange={event => setRelationshipForm(form => ({ ...form, source: event.target.value }))}><option value="">Choisir une personne</option>{localProfiles.map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><label>Son lien<select value={relationshipForm.relation} onChange={event => setRelationshipForm(form => ({ ...form, relation: event.target.value as FamilyRelationshipType }))}>{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Avec cette personne<select value={relationshipForm.target} onChange={event => setRelationshipForm(form => ({ ...form, target: event.target.value }))}><option value="">Choisir une personne</option>{localProfiles.filter(profile => profile.id !== relationshipForm.source).map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><div className="fr-link-preview"><Sparkles />{linkPreview}</div>{relationshipIssue && <div className="fr-link-warning"><AlertTriangle />{relationshipIssue}</div>}<button className="fr-primary-action" disabled={busy || !relationshipForm.source || !relationshipForm.target || Boolean(relationshipIssue)} onClick={() => void handleAddRelationship()}>{busy ? 'Enregistrement…' : 'Ajouter ce lien'}</button></div></RootsModal>}

      {modal === 'review-center' && <RootsModal title="Vérifier l’arbre" onClose={() => setModal(null)}><div className="fr-review-center"><p className="fr-form-intro">Rien n’est modifié automatiquement. Ces éléments servent uniquement à garder un arbre cohérent.</p>{pendingConnections.length > 0 && <section><div><Bell /><strong>{pendingConnections.length} demande{pendingConnections.length > 1 ? 's' : ''} de branche</strong></div><p>Ouvrez l’onglet Arbre pour accepter, refuser ou choisir la personne à relier.</p></section>}{genealogyLayout.issues.map(issue => <section key={issue.id}><div><AlertTriangle /><strong>{issue.title}</strong></div><p>{issue.detail}</p>{issue.profileIds[0] && <button onClick={() => { const profile = profiles.find(item => item.id === issue.profileIds[0]); if (profile) { setModal(null); selectProfile(profile); } }}>Voir la fiche</button>}</section>)}{possibleDuplicates.slice(0, 5).map(({ local, remote }) => <section key={`${local.id}-${remote.id}`}><div><GitMerge /><strong>Doublon possible</strong></div><p>{local.displayName} pourrait correspondre à {remote.displayName} dans une autre branche.</p><button onClick={() => { setModal(null); void requestDuplicateReview(local, remote); }}>Vérifier</button></section>)}{profileSuggestions.slice(0, 5).map(({ profile, missing }) => <section key={profile.id}><div><UserRoundSearch /><strong>Fiche à compléter</strong></div><p>{profile.displayName} : {missing.join(', ')}.</p><button onClick={() => { setModal(null); openProfileEditor(profile); }}>Compléter</button></section>)}{pendingCorrections.length > 0 && <section><div><Pencil /><strong>{pendingCorrections.length} correction{pendingCorrections.length > 1 ? 's' : ''} en attente</strong></div><p>Les propositions restent visibles dans le journal de confiance jusqu’à leur validation.</p></section>}{verificationCount === 0 && <div className="fr-empty-list">Votre arbre ne présente aucun élément à vérifier.</div>}</div></RootsModal>}

      {modal === 'link-branch' && <RootsModal title="Lier une nouvelle branche" onClose={() => setModal(null)}><div className="fr-form"><p className="fr-form-intro">Demandez au chef de l’autre foyer son code Racines. Il devra confirmer le lien avant qu’il apparaisse dans les deux arbres.</p><label>Code de la branche<input value={branchForm.code} onChange={event => setBranchForm(form => ({ ...form, code: event.target.value.toUpperCase() }))} placeholder="RAC-XXXXXXX" /></label><label>Personne de votre foyer<select value={branchForm.source} onChange={event => setBranchForm(form => ({ ...form, source: event.target.value }))}><option value="">Choisir une personne</option>{localProfiles.map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><label>Votre lien avec cette branche<select value={branchForm.relation} onChange={event => setBranchForm(form => ({ ...form, relation: event.target.value as FamilyRelationshipType }))}>{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{branchForm.source && <div className="fr-link-preview"><GitMerge />{profiles.find(profile => profile.id === branchForm.source)?.displayName || 'Cette personne'} sera présentée comme {relationshipLabels[branchForm.relation].toLocaleLowerCase('fr-FR')} de la personne choisie par l’autre foyer. L’autre chef verra exactement ce rapprochement avant de l’accepter.</div>}<button className="fr-primary-action" disabled={busy || !branchForm.code || !branchForm.source} onClick={() => void handleConnectBranch()}>{busy ? 'Envoi…' : 'Envoyer la demande'}</button></div></RootsModal>}

      {modal === 'invite' && <RootsModal title="Inviter une branche" onClose={() => setModal(null)}><div className="fr-invite"><span className="fr-invite-icon"><TreePine /></span><h3>Inviter une autre famille</h3><p>Le lien ouvre directement la demande de branche avec votre code déjà rempli.</p>{inviteQrUrl && <div className="fr-invite-qr"><img src={inviteQrUrl} alt="QR code de l’invitation familiale" /><span><QrCode /> À scanner avec l’appareil photo</span></div>}<div className="fr-share-code"><strong>{snapshot?.shareCode || 'Création…'}</strong><button onClick={() => void copyInvite()} aria-label="Copier le code"><Copy /></button></div><small>{snapshot?.shareCodeExpiresAt ? `Code valable jusqu’au ${new Date(snapshot.shareCodeExpiresAt).toLocaleDateString('fr-FR')}` : 'Code sécurisé'}</small><button className="fr-primary-action" disabled={!inviteLink} onClick={() => void shareInviteLink()}><Share2 /> Partager le lien d’invitation</button><button className="fr-secondary-action" disabled={!inviteLink} onClick={() => void copyInviteLink()}><Copy /> Copier le lien</button><button className="fr-secondary-action" onClick={() => { setModal('link-branch'); }}><Link2 /> J’ai reçu un code</button><button className="fr-secondary-action" onClick={() => void regenerateInvite()} disabled={busy}><Sparkles /> Générer un nouveau code</button>{!isPremium && <button className="fr-quiet-premium" onClick={onTriggerPaywall}>Les branches entre foyers sont incluses avec Premium</button>}</div></RootsModal>}
      {modal === 'photo-crop' && photoCropFile && <ImageCropper file={photoCropFile} aspect={1} title="Recadrer le portrait" onCancel={() => { setPhotoCropFile(null); setModal(null); }} onConfirm={saveCroppedProfilePhoto} />}
      {modal === 'branch-details' && selectedBranch && <RootsModal title={selectedBranch.name} onClose={() => setModal(null)}><div className="fr-branch-details"><div className={`fr-branch-detail-icon ${selectedBranch.color}`}><UsersRound /></div><p>{selectedBranch.location} · {selectedBranch.profiles.length} membre{selectedBranch.profiles.length > 1 ? 's' : ''}</p>{selectedBranch.id !== activeFoyerId && <div className="fr-readonly-branch"><BookOpen /><span>Cette branche est consultable en lecture seule. Chaque foyer conserve ses propres modifications.</span></div>}<div className="fr-branch-detail-members">{selectedBranch.profiles.slice(0, 12).map(profile => <button key={profile.id} onClick={() => { setModal(null); selectProfile(profile); }}><ProfileAvatar profile={profile} /><span>{profile.displayName}</span></button>)}</div><div className="fr-branch-detail-actions"><button className="fr-secondary-action" onClick={() => { setModal(null); setActiveTab('map'); }}><MapPinned /> Voir sur la carte</button><button className="fr-primary-action" onClick={() => { setModal(null); setActiveTab('tree'); setTreeScope(selectedBranch.id === activeFoyerId ? 'mine' : 'global'); }}><TreePine /> Voir dans l’arbre</button>{editingAllowed && selectedBranch.id !== activeFoyerId && <button className="fr-danger-action" disabled={busy} onClick={() => void disconnectBranch(selectedBranch.id)}><X /> Délier cette branche</button>}</div></div></RootsModal>}
      {fullTree}
    </div>
  );
}
