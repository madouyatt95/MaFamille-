import type { FamilyBranch, FamilyRelationshipType } from '../services/familyRootsService';

export const DEMO_PROFILES = [
  // G1 - Grands-parents
  {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: 'Ousmane Diop',
    nickname: 'Grand-père',
    birthDate: '1946-05-12',
    deathDate: '2018-09-20',
    isMemorial: true,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    displayName: 'Awa Ndiaye',
    nickname: 'Grand-mère',
    birthDate: '1950-10-18',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80'
  },

  // G2 - Parents
  {
    id: '00000000-0000-0000-0000-000000000003',
    displayName: 'Ibrahima',
    nickname: 'Oncle',
    birthDate: '1970-04-05',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    displayName: 'Fatou',
    nickname: 'Maman',
    birthDate: '1975-08-22',
    isMemorial: false,
    branch: 'proche' as FamilyBranch,
    country: 'France',
    originCity: 'Paris',
    languages: ['Français', 'Wolof', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    displayName: 'Moussa',
    nickname: 'Oncle',
    birthDate: '1978-11-30',
    isMemorial: false,
    branch: 'maternelle' as FamilyBranch,
    country: 'Côte d\'Ivoire',
    originCity: 'Abidjan',
    languages: ['Français', 'Dioula'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    displayName: 'Mariama',
    nickname: 'Tante',
    birthDate: '1980-12-14',
    isMemorial: false,
    branch: 'maternelle' as FamilyBranch,
    country: 'France',
    originCity: 'Paris',
    languages: ['Français', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    displayName: 'Mamadou',
    nickname: 'Papa',
    birthDate: '1973-03-12',
    isMemorial: false,
    branch: 'proche' as FamilyBranch,
    country: 'France',
    originCity: 'Paris',
    languages: ['Français', 'Wolof', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&h=256&q=80'
  },

  // G3 - Foyers (Cartes familiales intermédiaires)
  {
    id: '00000000-0000-0000-0000-000000000031',
    displayName: 'Ibrahima',
    nickname: 'Dakar',
    birthDate: '1970-04-05',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1542241647-9cbb2225278b?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000032',
    displayName: 'Mamadou',
    nickname: 'Paris',
    birthDate: '1973-03-12',
    isMemorial: false,
    branch: 'proche' as FamilyBranch,
    country: 'France',
    originCity: 'Paris',
    languages: ['Français', 'Wolof', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1542241647-9cbb2225278b?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000033',
    displayName: 'Moussa',
    nickname: 'Abidjan',
    birthDate: '1978-11-30',
    isMemorial: false,
    branch: 'maternelle' as FamilyBranch,
    country: 'Côte d\'Ivoire',
    originCity: 'Abidjan',
    languages: ['Français', 'Dioula'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1542241647-9cbb2225278b?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000034',
    displayName: 'Awa',
    nickname: 'New York',
    birthDate: '1980-12-14',
    isMemorial: false,
    branch: 'autre' as FamilyBranch,
    country: 'USA',
    originCity: 'New York',
    languages: ['Français', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1542241647-9cbb2225278b?auto=format&fit=crop&w=256&h=256&q=80'
  },

  // G4 - Enfants
  {
    id: '00000000-0000-0000-0000-000000000008',
    displayName: 'Aminata',
    nickname: 'Cousine',
    birthDate: '1995-02-14',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    displayName: 'Cheikh',
    nickname: 'Cousin',
    birthDate: '1998-07-09',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    displayName: 'Sokhna',
    nickname: 'Cousine',
    birthDate: '2001-09-11',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    displayName: 'Mamadou Jr.',
    nickname: 'Frère',
    birthDate: '2003-01-20',
    isMemorial: false,
    branch: 'proche' as FamilyBranch,
    country: 'France',
    originCity: 'Paris',
    languages: ['Français', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    displayName: 'Aïcha Diop',
    nickname: 'Ma cousine',
    birthDate: '2006-05-12',
    isMemorial: false,
    branch: 'proche' as FamilyBranch,
    country: 'France',
    originCity: 'Paris',
    bio: 'Étudiante en médecine|Lecture, Voyage, Cuisine',
    languages: ['Français', 'Wolof', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    displayName: 'Yacine',
    nickname: 'Cousin',
    birthDate: '2000-12-05',
    isMemorial: false,
    branch: 'maternelle' as FamilyBranch,
    country: 'Côte d\'Ivoire',
    originCity: 'Abidjan',
    languages: ['Français', 'Dioula'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    displayName: 'Hawa',
    nickname: 'Cousine',
    birthDate: '2004-03-15',
    isMemorial: false,
    branch: 'maternelle' as FamilyBranch,
    country: 'Côte d\'Ivoire',
    originCity: 'Abidjan',
    languages: ['Français'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80'
  },

  // G5 - Petits-enfants
  {
    id: '00000000-0000-0000-0000-000000000015',
    displayName: 'Ali',
    nickname: 'Neveu',
    birthDate: '2021-08-10',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Wolof'],
    isMinor: true,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000016',
    displayName: 'Mariam',
    nickname: 'Nièce',
    birthDate: '2023-11-22',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Wolof'],
    isMinor: true,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80'
  },

  // Cousins supplémentaires pour la liste des 24
  {
    id: '00000000-0000-0000-0000-000000000017',
    displayName: 'Fatima Diop',
    nickname: 'Ma cousine',
    birthDate: '1996-03-14',
    isMemorial: false,
    branch: 'paternelle' as FamilyBranch,
    country: 'Sénégal',
    originCity: 'Dakar',
    languages: ['Français', 'Wolof'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000018',
    displayName: 'Abdoulaye Diop',
    nickname: 'Mon cousin',
    birthDate: '1997-09-02',
    isMemorial: false,
    branch: 'proche' as FamilyBranch,
    country: 'France',
    originCity: 'Paris',
    languages: ['Français', 'Anglais'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000019',
    displayName: 'Ndeye Diop',
    nickname: 'Ma cousine',
    birthDate: '1999-06-25',
    isMemorial: false,
    branch: 'autre' as FamilyBranch,
    country: 'USA',
    originCity: 'New York',
    languages: ['Anglais', 'Français'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000020',
    displayName: 'Youssouf Diop',
    nickname: 'Mon cousin',
    birthDate: '1998-11-12',
    isMemorial: false,
    branch: 'maternelle' as FamilyBranch,
    country: 'Côte d\'Ivoire',
    originCity: 'Abidjan',
    languages: ['Français'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000021',
    displayName: 'Khady Diop',
    nickname: 'Ma cousine',
    birthDate: '2000-01-30',
    isMemorial: false,
    branch: 'autre' as FamilyBranch,
    country: 'France',
    originCity: 'Marseille',
    languages: ['Français'],
    isMinor: false,
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=256&h=256&q=80'
  }
];

export const DEMO_RELATIONSHIPS = [
  // G1 conjoint
  { id: '00000000-0000-0000-0000-000000000101', sourceProfileId: '00000000-0000-0000-0000-000000000001', targetProfileId: '00000000-0000-0000-0000-000000000002', relationshipType: 'conjoint' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000102', sourceProfileId: '00000000-0000-0000-0000-000000000002', targetProfileId: '00000000-0000-0000-0000-000000000001', relationshipType: 'conjoint' as FamilyRelationshipType },

  // G1 parents de G2
  { id: '00000000-0000-0000-0000-000000000103', sourceProfileId: '00000000-0000-0000-0000-000000000001', targetProfileId: '00000000-0000-0000-0000-000000000003', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000104', sourceProfileId: '00000000-0000-0000-0000-000000000001', targetProfileId: '00000000-0000-0000-0000-000000000004', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000105', sourceProfileId: '00000000-0000-0000-0000-000000000001', targetProfileId: '00000000-0000-0000-0000-000000000005', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000106', sourceProfileId: '00000000-0000-0000-0000-000000000001', targetProfileId: '00000000-0000-0000-0000-000000000006', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000107', sourceProfileId: '00000000-0000-0000-0000-000000000002', targetProfileId: '00000000-0000-0000-0000-000000000003', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000108', sourceProfileId: '00000000-0000-0000-0000-000000000002', targetProfileId: '00000000-0000-0000-0000-000000000004', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000109', sourceProfileId: '00000000-0000-0000-0000-000000000002', targetProfileId: '00000000-0000-0000-0000-000000000005', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000110', sourceProfileId: '00000000-0000-0000-0000-000000000002', targetProfileId: '00000000-0000-0000-0000-000000000006', relationshipType: 'parent' as FamilyRelationshipType },

  // G2 conjoint
  { id: '00000000-0000-0000-0000-000000000111', sourceProfileId: '00000000-0000-0000-0000-000000000004', targetProfileId: '00000000-0000-0000-0000-000000000007', relationshipType: 'conjoint' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000112', sourceProfileId: '00000000-0000-0000-0000-000000000007', targetProfileId: '00000000-0000-0000-0000-000000000004', relationshipType: 'conjoint' as FamilyRelationshipType },

  // G2 parents de G3 (Foyers)
  { id: '00000000-0000-0000-0000-000000000181', sourceProfileId: '00000000-0000-0000-0000-000000000003', targetProfileId: '00000000-0000-0000-0000-000000000031', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000182', sourceProfileId: '00000000-0000-0000-0000-000000000004', targetProfileId: '00000000-0000-0000-0000-000000000032', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000183', sourceProfileId: '00000000-0000-0000-0000-000000000007', targetProfileId: '00000000-0000-0000-0000-000000000032', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000184', sourceProfileId: '00000000-0000-0000-0000-000000000005', targetProfileId: '00000000-0000-0000-0000-000000000033', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000185', sourceProfileId: '00000000-0000-0000-0000-000000000006', targetProfileId: '00000000-0000-0000-0000-000000000034', relationshipType: 'parent' as FamilyRelationshipType },

  // G3 (Foyers) parents de G4 (Enfants)
  // Enfants Ibrahima
  { id: '00000000-0000-0000-0000-000000000113', sourceProfileId: '00000000-0000-0000-0000-000000000031', targetProfileId: '00000000-0000-0000-0000-000000000008', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000114', sourceProfileId: '00000000-0000-0000-0000-000000000031', targetProfileId: '00000000-0000-0000-0000-000000000009', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000115', sourceProfileId: '00000000-0000-0000-0000-000000000031', targetProfileId: '00000000-0000-0000-0000-000000000010', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000116', sourceProfileId: '00000000-0000-0000-0000-000000000031', targetProfileId: '00000000-0000-0000-0000-000000000017', relationshipType: 'parent' as FamilyRelationshipType },

  // Enfants Fatou & Mamadou
  { id: '00000000-0000-0000-0000-000000000117', sourceProfileId: '00000000-0000-0000-0000-000000000032', targetProfileId: '00000000-0000-0000-0000-000000000011', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000118', sourceProfileId: '00000000-0000-0000-0000-000000000032', targetProfileId: '00000000-0000-0000-0000-000000000012', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000119', sourceProfileId: '00000000-0000-0000-0000-000000000032', targetProfileId: '00000000-0000-0000-0000-000000000018', relationshipType: 'parent' as FamilyRelationshipType },

  // Enfants Moussa
  { id: '00000000-0000-0000-0000-000000000123', sourceProfileId: '00000000-0000-0000-0000-000000000033', targetProfileId: '00000000-0000-0000-0000-000000000013', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000124', sourceProfileId: '00000000-0000-0000-0000-000000000033', targetProfileId: '00000000-0000-0000-0000-000000000014', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000125', sourceProfileId: '00000000-0000-0000-0000-000000000033', targetProfileId: '00000000-0000-0000-0000-000000000020', relationshipType: 'parent' as FamilyRelationshipType },

  // Enfants Awa (via Mariama / Branche Awa)
  { id: '00000000-0000-0000-0000-000000000126', sourceProfileId: '00000000-0000-0000-0000-000000000034', targetProfileId: '00000000-0000-0000-0000-000000000019', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000186', sourceProfileId: '00000000-0000-0000-0000-000000000034', targetProfileId: '00000000-0000-0000-0000-000000000021', relationshipType: 'parent' as FamilyRelationshipType },

  // G4 parents de G5 (Petits-enfants)
  { id: '00000000-0000-0000-0000-000000000127', sourceProfileId: '00000000-0000-0000-0000-000000000008', targetProfileId: '00000000-0000-0000-0000-000000000015', relationshipType: 'parent' as FamilyRelationshipType },
  { id: '00000000-0000-0000-0000-000000000128', sourceProfileId: '00000000-0000-0000-0000-000000000008', targetProfileId: '00000000-0000-0000-0000-000000000016', relationshipType: 'parent' as FamilyRelationshipType }
];

export const DEMO_EVENTS = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    eventType: 'anniversaire' as const,
    title: 'Anniversaire de Aïcha Diop',
    eventDate: '2025-05-12',
    repeatsYearly: true,
    visibility: 'famille' as const
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    eventType: 'mariage' as const,
    title: 'Mariage de Fatou & Mamadou',
    eventDate: '2025-12-20',
    repeatsYearly: true,
    visibility: 'famille' as const
  }
];

export const DEMO_MEMORIES = [
  {
    id: '00000000-0000-0000-0000-000000000301',
    profileId: '00000000-0000-0000-0000-000000000012',
    title: 'Sortie en forêt en famille',
    note: 'Super après-midi à ramasser des feuilles d\'automne.',
    memoryDate: '2024-10-15',
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=512&h=384&q=80'
  },
  {
    id: '00000000-0000-0000-0000-000000000302',
    profileId: '00000000-0000-0000-0000-000000000012',
    title: 'Anniversaire surprise d\'Aïcha',
    note: 'Tout le monde s\'est réuni pour fêter ses 18 ans !',
    memoryDate: '2024-05-12',
    visibility: 'famille' as const,
    photoUrl: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=512&h=384&q=80'
  }
];
