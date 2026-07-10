import type {
  FamilyRelationshipType,
  FamilyTreeProfile,
  FamilyTreeRelationship
} from '../services/familyRootsService';

export type GenealogyUnion = {
  id: string;
  profiles: FamilyTreeProfile[];
  status: 'couple' | 'former-couple' | 'single';
};

export type GenealogyGeneration = {
  offset: number;
  label: string;
  unions: GenealogyUnion[];
};

export type GenealogyIssue = {
  id: string;
  profileIds: string[];
  title: string;
  detail: string;
  severity: 'info' | 'warning';
};

export type GenealogyLayout = {
  focusId: string;
  generations: GenealogyGeneration[];
  disconnected: FamilyTreeProfile[];
  issues: GenealogyIssue[];
};

type Constraint = {
  from: string;
  to: string;
  delta: number;
  relationship: FamilyTreeRelationship;
};

const MAX_GENERATION_DISTANCE = 5;

const relationDelta = (type: FamilyRelationshipType): number | null => {
  if (['parent', 'parent_biologique', 'beau_parent', 'tuteur'].includes(type)) return 1;
  if (type === 'enfant') return -1;
  if (type === 'grand_parent') return 2;
  if (type === 'petit_enfant') return -2;
  if (type === 'oncle_tante') return 1;
  if (type === 'neveu_niece') return -1;
  if (['conjoint', 'ex_conjoint', 'fratrie', 'cousin', 'famille'].includes(type)) return 0;
  return null;
};

const generationLabel = (offset: number, focusName: string): string => {
  if (offset <= -3) return 'Ancêtres';
  if (offset === -2) return 'Grands-parents';
  if (offset === -1) return 'Parents, oncles et tantes';
  if (offset === 0) return `Autour de ${focusName}`;
  if (offset === 1) return 'Enfants, neveux et nièces';
  if (offset === 2) return 'Petits-enfants';
  return 'Descendants';
};

const birthTime = (profile: FamilyTreeProfile): number => {
  if (!profile.birthDate) return Number.MAX_SAFE_INTEGER;
  const time = new Date(`${profile.birthDate}T12:00:00`).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const orderProfiles = (profiles: FamilyTreeProfile[], focusId: string): FamilyTreeProfile[] => [...profiles].sort((left, right) => {
  if (left.id === focusId) return -1;
  if (right.id === focusId) return 1;
  return birthTime(left) - birthTime(right) || left.displayName.localeCompare(right.displayName, 'fr');
});

const buildUnions = (
  profiles: FamilyTreeProfile[],
  relationships: FamilyTreeRelationship[],
  focusId: string
): GenealogyUnion[] => {
  const profileIds = new Set(profiles.map(profile => profile.id));
  const profileById = new Map(profiles.map(profile => [profile.id, profile]));
  const partnerLinks = relationships.filter(relationship => (
    ['conjoint', 'ex_conjoint'].includes(relationship.relationshipType)
    && profileIds.has(relationship.sourceProfileId)
    && profileIds.has(relationship.targetProfileId)
  ));
  const used = new Set<string>();
  const unions: GenealogyUnion[] = [];

  orderProfiles(profiles, focusId).forEach(profile => {
    if (used.has(profile.id)) return;
    const partnerLink = partnerLinks.find(link => (
      (link.sourceProfileId === profile.id && !used.has(link.targetProfileId))
      || (link.targetProfileId === profile.id && !used.has(link.sourceProfileId))
    ));
    if (!partnerLink) {
      used.add(profile.id);
      unions.push({ id: profile.id, profiles: [profile], status: 'single' });
      return;
    }

    const partnerId = partnerLink.sourceProfileId === profile.id
      ? partnerLink.targetProfileId
      : partnerLink.sourceProfileId;
    const partner = profileById.get(partnerId);
    if (!partner) return;
    used.add(profile.id);
    used.add(partner.id);
    unions.push({
      id: [profile.id, partner.id].sort().join(':'),
      profiles: orderProfiles([profile, partner], focusId),
      status: partnerLink.relationshipType === 'ex_conjoint' ? 'former-couple' : 'couple'
    });
  });

  return unions;
};

const addConstraint = (constraints: Constraint[], relationship: FamilyTreeRelationship) => {
  const delta = relationDelta(relationship.relationshipType);
  if (delta === null) return;
  constraints.push({ from: relationship.sourceProfileId, to: relationship.targetProfileId, delta, relationship });
  constraints.push({ from: relationship.targetProfileId, to: relationship.sourceProfileId, delta: -delta, relationship });
};

export const buildGenealogyLayout = (
  profiles: FamilyTreeProfile[],
  relationships: FamilyTreeRelationship[],
  requestedFocusId?: string
): GenealogyLayout => {
  const visibleProfiles = profiles.filter(profile => profile.visibility !== 'masque');
  const profileIds = new Set(visibleProfiles.map(profile => profile.id));
  const focus = visibleProfiles.find(profile => profile.id === requestedFocusId)
    || visibleProfiles.find(profile => profile.isLocal && !profile.isMinor)
    || visibleProfiles[0];

  if (!focus) return { focusId: '', generations: [], disconnected: [], issues: [] };

  const validRelationships = relationships.filter(relationship => (
    profileIds.has(relationship.sourceProfileId) && profileIds.has(relationship.targetProfileId)
  ));
  const constraints: Constraint[] = [];
  validRelationships.forEach(relationship => addConstraint(constraints, relationship));
  const adjacency = new Map<string, Constraint[]>();
  constraints.forEach(constraint => adjacency.set(constraint.from, [...(adjacency.get(constraint.from) || []), constraint]));

  const generations = new Map<string, number>([[focus.id, 0]]);
  const queue = [focus.id];
  const issues: GenealogyIssue[] = [];
  const conflictKeys = new Set<string>();

  while (queue.length) {
    const currentId = queue.shift() as string;
    const currentGeneration = generations.get(currentId) || 0;
    (adjacency.get(currentId) || []).forEach(constraint => {
      const proposed = Math.max(-MAX_GENERATION_DISTANCE, Math.min(MAX_GENERATION_DISTANCE, currentGeneration + constraint.delta));
      const existing = generations.get(constraint.to);
      if (existing === undefined) {
        generations.set(constraint.to, proposed);
        queue.push(constraint.to);
        return;
      }
      if (existing !== proposed && constraint.delta !== 0) {
        const key = [constraint.from, constraint.to].sort().join(':');
        if (conflictKeys.has(key)) return;
        conflictKeys.add(key);
        issues.push({
          id: `conflict-${key}`,
          profileIds: [constraint.from, constraint.to],
          title: 'Lien à vérifier',
          detail: 'Ces liens placent une même personne dans deux générations différentes.',
          severity: 'warning'
        });
      }
    });
  }

  const disconnected = visibleProfiles.filter(profile => !generations.has(profile.id));
  disconnected.forEach(profile => {
    issues.push({
      id: `isolated-${profile.id}`,
      profileIds: [profile.id],
      title: `${profile.displayName} n’est pas encore relié`,
      detail: 'Ajoutez au moins un parent, un enfant, un conjoint ou un lien de fratrie.',
      severity: 'info'
    });
  });

  const profileById = new Map(visibleProfiles.map(profile => [profile.id, profile]));
  const grouped = new Map<number, FamilyTreeProfile[]>();
  generations.forEach((offset, profileId) => {
    const profile = profileById.get(profileId);
    if (profile) grouped.set(offset, [...(grouped.get(offset) || []), profile]);
  });

  const renderedGenerations = [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([offset, generationProfiles]) => ({
      offset,
      label: generationLabel(offset, focus.displayName),
      unions: buildUnions(generationProfiles, validRelationships, focus.id)
    }));

  return {
    focusId: focus.id,
    generations: renderedGenerations,
    disconnected: orderProfiles(disconnected, focus.id),
    issues
  };
};

export const relationForNewRelative = (
  anchorId: string,
  relativeId: string,
  relationship: FamilyRelationshipType
): Pick<FamilyTreeRelationship, 'sourceProfileId' | 'targetProfileId' | 'relationshipType'> => {
  if (['parent', 'parent_biologique', 'beau_parent', 'tuteur', 'grand_parent', 'oncle_tante'].includes(relationship)) {
    return { sourceProfileId: relativeId, targetProfileId: anchorId, relationshipType: relationship };
  }
  if (['enfant', 'petit_enfant', 'neveu_niece'].includes(relationship)) {
    return { sourceProfileId: anchorId, targetProfileId: relativeId, relationshipType: relationship };
  }
  return { sourceProfileId: anchorId, targetProfileId: relativeId, relationshipType: relationship };
};
