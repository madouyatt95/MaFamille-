import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Globe2,
  Link2,
  MapPinned,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  TreePine,
  UsersRound,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import type { Member } from '../types';
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

type RootTab = 'tree' | 'cousins' | 'branches' | 'map';
type ModalName = 'add-person' | 'link-persons' | 'link-branch' | 'invite' | null;

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
};

const relationshipLabels: Record<FamilyRelationshipType, string> = {
  parent: 'Parent',
  enfant: 'Enfant',
  fratrie: 'Frère ou sœur',
  cousin: 'Cousin ou cousine',
  conjoint: 'Conjoint·e',
  oncle_tante: 'Oncle ou tante',
  neveu_niece: 'Neveu ou nièce',
  grand_parent: 'Grand-parent',
  petit_enfant: 'Petit-enfant',
  famille: 'Famille'
};

const branchColors = ['violet', 'green', 'orange', 'blue'] as const;

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
  onSelect
}: {
  profile: FamilyTreeProfile;
  compact?: boolean;
  onSelect: (profile: FamilyTreeProfile) => void;
}) {
  return (
    <button className={`fr-person-node ${compact ? 'is-compact' : ''}`} onClick={() => onSelect(profile)}>
      <ProfileAvatar profile={profile} />
      <strong>{profile.displayName}</strong>
      <span>{compact ? displayYear(profile) : profile.nickname || profileLocation(profile)}</span>
    </button>
  );
}

function buildGenerationRows(
  profiles: FamilyTreeProfile[],
  relationships: FamilyTreeRelationship[],
  connections: FamilyTreeConnection[]
) {
  const profileIds = new Set(profiles.map(profile => profile.id));
  const parentEdges = relationships
    .filter(relationship => relationship.relationshipType === 'parent' && profileIds.has(relationship.sourceProfileId) && profileIds.has(relationship.targetProfileId))
    .map(relationship => ({ parent: relationship.sourceProfileId, child: relationship.targetProfileId }));

  connections.filter(connection => connection.status === 'confirmed' && connection.targetProfileId).forEach(connection => {
    if (!profileIds.has(connection.requesterProfileId) || !profileIds.has(connection.targetProfileId!)) return;
    if (connection.relationshipType === 'parent') parentEdges.push({ parent: connection.requesterProfileId, child: connection.targetProfileId! });
    if (connection.relationshipType === 'enfant') parentEdges.push({ parent: connection.targetProfileId!, child: connection.requesterProfileId });
  });

  const parentsByChild = new Map<string, string[]>();
  parentEdges.forEach(edge => parentsByChild.set(edge.child, [...(parentsByChild.get(edge.child) || []), edge.parent]));
  const resolving = new Set<string>();
  const resolveGeneration = (id: string): number => {
    if (resolving.has(id)) return 0;
    resolving.add(id);
    const parents = parentsByChild.get(id) || [];
    const generation = parents.length ? Math.min(4, Math.max(...parents.map(resolveGeneration)) + 1) : 0;
    resolving.delete(id);
    return generation;
  };

  const rows = new Map<number, FamilyTreeProfile[]>();
  profiles.filter(profile => profile.visibility !== 'masque').forEach(profile => {
    const generation = resolveGeneration(profile.id);
    rows.set(generation, [...(rows.get(generation) || []), profile]);
  });

  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([generation, row]) => ({
      generation,
      profiles: row.sort((left, right) => {
        const leftTime = left.birthDate ? new Date(left.birthDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.birthDate ? new Date(right.birthDate).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })
    }));
}

function TreeBoard({
  profiles,
  relationships,
  connections,
  selectedProfileId,
  expandedRows,
  onToggleRow,
  onSelect,
  fullScreen = false
}: {
  profiles: FamilyTreeProfile[];
  relationships: FamilyTreeRelationship[];
  connections: FamilyTreeConnection[];
  selectedProfileId?: string;
  expandedRows: Set<number>;
  onToggleRow: (generation: number) => void;
  onSelect: (profile: FamilyTreeProfile) => void;
  fullScreen?: boolean;
}) {
  const rows = useMemo(() => buildGenerationRows(profiles, relationships, connections), [profiles, relationships, connections]);
  const names = ['Grands-parents', 'Parents et oncles/tantes', 'Enfants et cousins', 'Petits-enfants', 'Descendants'];
  if (!profiles.length) {
    return <div className="fr-empty-tree"><TreePine /><strong>Commencez votre arbre</strong><span>Ajoutez les personnes de votre famille, puis reliez-les simplement.</span></div>;
  }

  return (
    <div className={`fr-tree-board ${fullScreen ? 'is-fullscreen-tree' : ''}`}>
      {rows.map(({ generation, profiles: rowProfiles }) => {
        const isExpanded = expandedRows.has(generation);
        const visibleProfiles = isExpanded ? rowProfiles : rowProfiles.slice(0, 3);
        const remaining = rowProfiles.length - visibleProfiles.length;
        return (
          <section className="fr-generation" key={generation}>
            <div className="fr-generation-label"><span>Génération {generation + 1}</span><small>{names[generation] || 'Famille'}</small></div>
            <div className={`fr-generation-nodes count-${Math.min(visibleProfiles.length + (remaining ? 1 : 0), 4)}`}>
              {visibleProfiles.map(profile => (
                <div className={`fr-tree-node-wrap ${selectedProfileId === profile.id ? 'is-selected' : ''}`} key={profile.id}>
                  <PersonNode profile={profile} compact={fullScreen} onSelect={onSelect} />
                </div>
              ))}
              {remaining > 0 && (
                <button className="fr-more-people" onClick={() => onToggleRow(generation)}>
                  <b>+{remaining}</b><span>Afficher</span>
                </button>
              )}
              {isExpanded && rowProfiles.length > 3 && (
                <button className="fr-collapse-people" onClick={() => onToggleRow(generation)} aria-label="Réduire cette génération"><Minus /></button>
              )}
            </div>
          </section>
        );
      })}
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
  onCreateBranchGroup
}: FamilyRootsProps) {
  const [activeTab, setActiveTab] = useState<RootTab>('tree');
  const [snapshot, setSnapshot] = useState<FamilyRootsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<FamilyTreeProfile | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [treeFullscreen, setTreeFullscreen] = useState(false);
  const [treeScale, setTreeScale] = useState(0.84);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | 'nearby' | 'country' | 'branch'>('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [personForm, setPersonForm] = useState({ name: '', date: '', city: '', country: '', relation: 'famille' as FamilyRelationshipType });
  const [relationshipForm, setRelationshipForm] = useState({ source: '', target: '', relation: 'parent' as FamilyRelationshipType });
  const [branchForm, setBranchForm] = useState({ code: '', source: '', relation: 'famille' as FamilyRelationshipType });

  const memberSignature = members.map(member => `${member.id}:${member.name}:${member.birthDate}:${member.photoUrl}`).join('|');
  const activeFoyerId = foyerId || 'local';

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await familyRootsService.load(activeFoyerId, members, canManage);
      setSnapshot(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger l’arbre familial.');
    } finally {
      setLoading(false);
    }
  }, [activeFoyerId, canManage, memberSignature]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const profiles = snapshot?.profiles || [];
  const relationships = snapshot?.relationships || [];
  const connections = snapshot?.connections || [];
  const localProfiles = profiles.filter(profile => profile.isLocal);
  const linkedProfiles = profiles.filter(profile => !profile.isLocal);
  const eventList = snapshot?.events.filter(event => event.visibility === 'famille').slice(0, 3) || [];
  const countries = new Set(profiles.map(profile => profile.country).filter(Boolean)).size;
  const confirmedBranches = connections.filter(connection => connection.status === 'confirmed');
  const pendingConnections = connections.filter(connection => connection.status === 'pending');

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

  const toggleRow = (generation: number) => setExpandedRows(current => {
    const next = new Set(current);
    if (next.has(generation)) next.delete(generation); else next.add(generation);
    return next;
  });

  const selectProfile = (profile: FamilyTreeProfile) => setSelectedProfile(profile);
  const showFeedback = (message: string) => setNotice(message);

  const ensureManage = () => {
    if (canManage) return true;
    showFeedback('Seul un parent ou le chef de famille peut modifier l’arbre.');
    return false;
  };

  const handleAddPerson = async () => {
    if (!ensureManage() || !personForm.name.trim()) return;
    setBusy(true);
    try {
      const added = await familyRootsService.addProfile(activeFoyerId, {
        displayName: personForm.name.trim(),
        birthDate: personForm.date || undefined,
        branch: 'proche',
        country: personForm.country || undefined,
        originCity: personForm.city || undefined,
        nickname: relationshipLabels[personForm.relation],
        bio: undefined,
        languages: [],
        photoUrl: undefined,
        isMinor: false,
        visibility: 'famille',
        isMemorial: false,
        deathDate: undefined,
        sharedFields: ['display_name', 'nickname', 'country', 'origin_city', 'birth_date', 'photo_url']
      });
      if (profiles.length) {
        await familyRootsService.addRelationship(activeFoyerId, profiles[0].id, added.id, personForm.relation);
      }
      setPersonForm({ name: '', date: '', city: '', country: '', relation: 'famille' });
      setModal(null);
      await reload();
      showFeedback(`${added.displayName} apparaît maintenant dans l’arbre.`);
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La personne n’a pas pu être ajoutée.');
    } finally { setBusy(false); }
  };

  const handleAddRelationship = async () => {
    if (!ensureManage() || !relationshipForm.source || !relationshipForm.target || relationshipForm.source === relationshipForm.target) return;
    setBusy(true);
    try {
      await familyRootsService.addRelationship(activeFoyerId, relationshipForm.source, relationshipForm.target, relationshipForm.relation);
      setModal(null);
      await reload();
      showFeedback('Le lien familial a été ajouté à l’arbre.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'Le lien n’a pas pu être ajouté.');
    } finally { setBusy(false); }
  };

  const handleConnectBranch = async () => {
    if (!ensureManage() || !branchForm.code.trim() || !branchForm.source) return;
    setBusy(true);
    try {
      await familyRootsService.requestConnection(activeFoyerId, branchForm.code.trim(), branchForm.source, branchForm.relation);
      setModal(null);
      await reload();
      onSendNotification?.('Demande de branche envoyée', 'Votre demande attend maintenant la confirmation de l’autre foyer.', 'family_roots');
      showFeedback('La demande a été envoyée à cette branche.');
    } catch (cause) {
      showFeedback(cause instanceof Error ? cause.message : 'La demande n’a pas pu être envoyée.');
    } finally { setBusy(false); }
  };

  const handleRespondConnection = async (connection: FamilyTreeConnection, accept: boolean) => {
    if (!ensureManage()) return;
    const targetProfile = localProfiles[0];
    if (accept && !targetProfile) return showFeedback('Ajoutez d’abord une personne dans votre foyer.');
    setBusy(true);
    try {
      await familyRootsService.respondConnection(connection.id, accept, targetProfile?.id);
      await reload();
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
      <div className="fr-fullscreen-scroll">
        <div className="fr-fullscreen-scale" style={{ transform: `scale(${treeScale})` }}>
          <TreeBoard profiles={profiles} relationships={relationships} connections={connections} selectedProfileId={selectedProfile?.id} expandedRows={expandedRows} onToggleRow={toggleRow} onSelect={selectProfile} fullScreen />
        </div>
      </div>
      <div className="fr-zoom-controls">
        <button onClick={() => setTreeScale(value => Math.max(0.6, Number((value - 0.08).toFixed(2))))}><ZoomOut /></button>
        <button onClick={() => setTreeScale(0.84)}>{Math.round(treeScale * 100)}%</button>
        <button onClick={() => setTreeScale(value => Math.min(1.18, Number((value + 0.08).toFixed(2))))}><ZoomIn /></button>
      </div>
    </div>
  );

  return (
    <div className="family-roots">
      <div className="fr-page">
        <header className="fr-header">
          <button className="fr-icon-button" onClick={() => window.history.back()} aria-label="Retour"><ArrowLeft /></button>
          <div className="fr-title"><h1>Racines familiales <TreePine /></h1><p>Notre histoire, nos liens, nos racines</p></div>
          <button className="fr-icon-button" onClick={() => setModal('invite')} aria-label="Inviter une branche"><Share2 /></button>
        </header>

        <nav className="fr-tabs" aria-label="Racines familiales">
          {([
            ['tree', 'Arbre'], ['cousins', 'Cousins'], ['branches', 'Branches'], ['map', 'Carte']
          ] as Array<[RootTab, string]>).map(([tab, label]) => <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'is-active' : ''}>{label}</button>)}
        </nav>

        {notice && <div className="fr-notice"><Check />{notice}</div>}
        {loading && <div className="fr-loading"><span /><span /><span /></div>}
        {error && <div className="fr-error"><CircleHelp /><p>{error}</p><button onClick={() => void reload()}>Réessayer</button></div>}

        {!loading && !error && activeTab === 'tree' && <main className="fr-content fr-tree-content">
          <section className="fr-tree-hero">
            <div><span className="fr-eyebrow"><Sparkles /> Arbre vivant</span><h2>{familyName}</h2><p>{profiles.length} personne{profiles.length > 1 ? 's' : ''} visible{profiles.length > 1 ? 's' : ''} · {confirmedBranches.length} branche{confirmedBranches.length > 1 ? 's' : ''} liée{confirmedBranches.length > 1 ? 's' : ''}</p></div>
            <button className="fr-expand-tree" onClick={() => setTreeFullscreen(true)}><ZoomIn /><span>Lire l’arbre</span></button>
          </section>

          {pendingConnections.filter(connection => connection.direction === 'incoming').map(connection => (
            <section className="fr-branch-request" key={connection.id}>
              <div className="fr-request-icon"><Bell /></div>
              <div><strong>{connection.requesterDisplayName || 'Une branche'} souhaite se relier</strong><p>Choisissez la personne de votre arbre qui représente ce lien.</p></div>
              <div className="fr-request-actions"><button onClick={() => void handleRespondConnection(connection, false)}>Refuser</button><button onClick={() => void handleRespondConnection(connection, true)} disabled={busy}>Accepter</button></div>
            </section>
          ))}

          <section className="fr-tree-surface">
            <TreeBoard profiles={profiles} relationships={relationships} connections={connections} selectedProfileId={selectedProfile?.id} expandedRows={expandedRows} onToggleRow={toggleRow} onSelect={selectProfile} />
          </section>

          {canManage && <div className="fr-tree-actions">
            <button onClick={() => setModal('add-person')}><Plus /> Ajouter une personne</button>
            <button onClick={() => setModal('link-persons')}><Link2 /> Relier deux personnes</button>
          </div>}
          <button className="fr-primary-action" onClick={() => setModal('link-branch')}><Plus /> Lier une nouvelle branche</button>

          {eventList.length > 0 && <section className="fr-upcoming-card"><div className="fr-section-heading"><span>Événements à venir</span><CalendarDays /></div>{eventList.map(event => <div className="fr-event-row" key={event.id}><span className="fr-event-icon">🎁</span><div><strong>{event.title}</strong><small>{new Date(`${event.eventDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</small></div><b>{event.repeatsYearly ? 'Chaque année' : 'À noter'}</b></div>)}</section>}
        </main>}

        {!loading && !error && activeTab === 'cousins' && <main className="fr-content">
          <section className="fr-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un cousin, une cousine…" /></section>
          <section className="fr-stats-grid"><article><UsersRound /><b>{cousinProfiles.length}</b><span>Cousins & cousines</span></article><article><Link2 /><b>{confirmedBranches.length}</b><span>Branches liées</span></article><article><Globe2 /><b>{countries}</b><span>Pays</span></article></section>
          <div className="fr-filter-row">{([['all', 'Tous'], ['nearby', 'Proches'], ['country', 'Par pays'], ['branch', 'Par branche']] as const).map(([filter, label]) => <button className={branchFilter === filter ? 'is-active' : ''} key={filter} onClick={() => setBranchFilter(filter)}>{label}</button>)}</div>
          <section className="fr-cousins-card"><div className="fr-section-heading"><span>Cousins & cousines <small>({cousinProfiles.length})</small></span><UsersRound /></div>{cousinProfiles.length ? cousinProfiles.map(profile => <button className="fr-cousin-row" key={profile.id} onClick={() => selectProfile(profile)}><ProfileAvatar profile={profile} /><div><strong>{profile.displayName}</strong><span>{profile.nickname || 'Membre de la famille'}</span><small>{profileLocation(profile)}</small></div><MessageCircle /><MoreHorizontal /></button>) : <div className="fr-empty-list">Vos cousins apparaîtront ici lorsque les branches seront reliées.</div>}</section>
          {cousinProfiles.length > 5 && <button className="fr-primary-action">Voir tous les cousins ({cousinProfiles.length})</button>}
        </main>}

        {!loading && !error && activeTab === 'branches' && <main className="fr-content">
          <section className="fr-map-card"><div className="fr-section-heading"><div><span>Branches familiales</span><small>Pays et villes déclarés dans les fiches</small></div><Globe2 /></div><div className="fr-map-preview"><img className="fr-map-light" src="/family-roots/world-map-light.png" alt="Carte du monde" /><img className="fr-map-dark" src="/family-roots/world-map-dark.png" alt="" />{branches.slice(0, 4).map((branch, index) => <button key={branch.id} className={`fr-map-pin pin-${index}`} onClick={() => setActiveTab('map')}><span>{branch.profiles.length}</span>{branch.location}</button>)}</div></section>
          <section className="fr-branches-card"><div className="fr-section-heading"><div><span>Liste des branches</span><small>Foyers proches, branches liées et demandes en cours.</small></div><Link2 /></div>{branches.map(branch => <button className="fr-branch-row" key={branch.id} onClick={() => setActiveTab('map')}><div className={`fr-branch-badge ${branch.color}`}><UsersRound /></div><div className="fr-branch-row-copy"><strong>{branch.name}</strong><span>{branch.location} · {branch.profiles.length} membre{branch.profiles.length > 1 ? 's' : ''}</span></div><b className={branch.status === 'Vous' ? 'is-owner' : ''}>{branch.status}</b><ChevronRight /></button>)}{pendingConnections.filter(connection => connection.direction === 'outgoing').map(connection => <div className="fr-branch-row is-pending" key={connection.id}><div className="fr-branch-badge blue"><Send /></div><div className="fr-branch-row-copy"><strong>Invitation envoyée</strong><span>En attente de confirmation</span></div><b>En attente</b></div>)}</section>
          <button className="fr-primary-action" onClick={() => setModal('link-branch')}><Plus /> Lier une nouvelle branche</button>
        </main>}

        {!loading && !error && activeTab === 'map' && <main className="fr-content">
          <section className="fr-world-card"><div className="fr-world-copy"><span className="fr-eyebrow"><MapPinned /> Famille dans le monde</span><h2>Vos branches reliées</h2><p>Chaque lieu correspond à une branche qui a choisi de partager sa ville.</p></div><div className="fr-world-map"><img className="fr-map-light" src="/family-roots/world-map-light.png" alt="Carte du monde des branches" /><img className="fr-map-dark" src="/family-roots/world-map-dark.png" alt="" />{branches.slice(0, 4).map((branch, index) => <button className={`fr-world-pin pin-${index}`} key={branch.id} onClick={() => { setActiveTab('branches'); }}><div className="fr-pin-avatar"><ProfileAvatar profile={branch.profiles[0]} /></div><span>{branch.location}</span></button>)}</div></section>
          <section className="fr-map-list">{branches.map(branch => <button key={branch.id} onClick={() => setSelectedProfile(branch.profiles[0])}><div className={`fr-branch-badge ${branch.color}`}><UsersRound /></div><div><strong>{branch.name}</strong><span>{branch.location}</span></div><ChevronRight /></button>)}</section>
        </main>}
      </div>

      {selectedProfile && <aside className="fr-profile-drawer" role="dialog" aria-modal="true"><button className="fr-profile-close" onClick={() => setSelectedProfile(null)} aria-label="Fermer"><ChevronLeft /></button><button className="fr-profile-more" onClick={() => setModal('link-persons')} aria-label="Plus d’options"><MoreHorizontal /></button><div className="fr-profile-identity"><ProfileAvatar profile={selectedProfile} /><h2>{selectedProfile.displayName}</h2><span>{selectedProfile.nickname || 'Membre de la famille'}</span><p>{selectedProfile.birthDate ? `Né${selectedProfile.displayName.endsWith('a') ? 'e' : ''} le ${new Date(`${selectedProfile.birthDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}${profileAge(selectedProfile) ? ` (${profileAge(selectedProfile)})` : ''}` : 'Date de naissance non renseignée'}</p><p>📍 {profileLocation(selectedProfile)}</p></div><div className="fr-profile-actions"><button onClick={() => createBranchGroup()}><MessageCircle /><span>Message</span></button><button onClick={() => publishEvent(selectedProfile)}><CalendarDays /><span>Événement</span></button><button onClick={() => setModal('link-persons')}><Link2 /><span>Lier</span></button></div><div className="fr-profile-tabs"><button className="is-active">Infos</button><button>Famille</button><button>Médias</button><button>Liens</button></div><section className="fr-profile-section"><h3>À propos</h3><dl><div><dt>Ville</dt><dd>{profileLocation(selectedProfile)}</dd></div><div><dt>Langues</dt><dd>{selectedProfile.languages.length ? selectedProfile.languages.join(', ') : 'Non renseignées'}</dd></div><div><dt>Statut</dt><dd>{selectedProfile.isMinor ? 'Profil protégé' : 'Membre de la famille'}</dd></div></dl></section><section className="fr-profile-section"><h3>Liens familiaux</h3>{(() => { const links = relationships.filter(item => item.sourceProfileId === selectedProfile.id).slice(0, 4).map(item => ({ item, target: profiles.find(profile => profile.id === item.targetProfileId) })).filter((link): link is { item: FamilyTreeRelationship; target: FamilyTreeProfile } => Boolean(link.target)); return links.length ? links.map(({ item, target }) => <button className="fr-link-row" key={item.id} onClick={() => setSelectedProfile(target)}><ProfileAvatar profile={target} /><span><small>{relationshipLabels[item.relationshipType]}</small><strong>{target.displayName}</strong></span><ChevronRight /></button>) : <p>Aucun lien enregistré pour le moment.</p>; })()}</section></aside>}

      {modal === 'add-person' && <RootsModal title="Ajouter une personne" onClose={() => setModal(null)}><div className="fr-form"><label>Prénom et nom<input autoFocus value={personForm.name} onChange={event => setPersonForm(form => ({ ...form, name: event.target.value }))} placeholder="Ex. Awa Ndiaye" /></label><label>Date de naissance<input type="date" value={personForm.date} onChange={event => setPersonForm(form => ({ ...form, date: event.target.value }))} /></label><div className="fr-form-duo"><label>Ville<input value={personForm.city} onChange={event => setPersonForm(form => ({ ...form, city: event.target.value }))} placeholder="Ex. Dakar" /></label><label>Pays<input value={personForm.country} onChange={event => setPersonForm(form => ({ ...form, country: event.target.value }))} placeholder="Ex. Sénégal" /></label></div><label>Lien avec la première personne<select value={personForm.relation} onChange={event => setPersonForm(form => ({ ...form, relation: event.target.value as FamilyRelationshipType }))}>{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="fr-primary-action" disabled={busy || !personForm.name.trim()} onClick={() => void handleAddPerson()}>{busy ? 'Ajout…' : 'Ajouter à l’arbre'}</button></div></RootsModal>}

      {modal === 'link-persons' && <RootsModal title="Relier deux personnes" onClose={() => setModal(null)}><div className="fr-form"><label>Première personne<select value={relationshipForm.source} onChange={event => setRelationshipForm(form => ({ ...form, source: event.target.value }))}><option value="">Choisir une personne</option>{profiles.map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><label>Lien<select value={relationshipForm.relation} onChange={event => setRelationshipForm(form => ({ ...form, relation: event.target.value as FamilyRelationshipType }))}>{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Deuxième personne<select value={relationshipForm.target} onChange={event => setRelationshipForm(form => ({ ...form, target: event.target.value }))}><option value="">Choisir une personne</option>{profiles.filter(profile => profile.id !== relationshipForm.source).map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><button className="fr-primary-action" disabled={busy || !relationshipForm.source || !relationshipForm.target} onClick={() => void handleAddRelationship()}>{busy ? 'Enregistrement…' : 'Ajouter le lien'}</button></div></RootsModal>}

      {modal === 'link-branch' && <RootsModal title="Lier une nouvelle branche" onClose={() => setModal(null)}><div className="fr-form"><p className="fr-form-intro">Demandez au chef de l’autre foyer son code Racines. Il devra confirmer le lien avant qu’il apparaisse dans les deux arbres.</p><label>Code de la branche<input value={branchForm.code} onChange={event => setBranchForm(form => ({ ...form, code: event.target.value.toUpperCase() }))} placeholder="RAC-XXXXXXX" /></label><label>Personne de votre foyer<select value={branchForm.source} onChange={event => setBranchForm(form => ({ ...form, source: event.target.value }))}><option value="">Choisir une personne</option>{localProfiles.map(profile => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label><label>Votre lien avec cette branche<select value={branchForm.relation} onChange={event => setBranchForm(form => ({ ...form, relation: event.target.value as FamilyRelationshipType }))}>{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="fr-primary-action" disabled={busy || !branchForm.code || !branchForm.source} onClick={() => void handleConnectBranch()}>{busy ? 'Envoi…' : 'Envoyer la demande'}</button></div></RootsModal>}

      {modal === 'invite' && <RootsModal title="Inviter une branche" onClose={() => setModal(null)}><div className="fr-invite"><span className="fr-invite-icon"><TreePine /></span><h3>Votre code Racines</h3><p>Partagez-le uniquement avec un chef de famille que vous connaissez.</p><div className="fr-share-code"><strong>{snapshot?.shareCode || 'Création…'}</strong><button onClick={() => void copyInvite()} aria-label="Copier le code"><Copy /></button></div><small>{snapshot?.shareCodeExpiresAt ? `Valable jusqu’au ${new Date(snapshot.shareCodeExpiresAt).toLocaleDateString('fr-FR')}` : 'Code sécurisé'}</small><button className="fr-secondary-action" onClick={() => void regenerateInvite()} disabled={busy}><Sparkles /> Générer un nouveau code</button>{!isPremium && <button className="fr-quiet-premium" onClick={onTriggerPaywall}>Les branches entre foyers sont incluses avec Premium</button>}</div></RootsModal>}
      {fullTree}
    </div>
  );
}
