export type PremiumFeatureId =
  | 'real_ai'
  | 'exports'
  | 'demarches'
  | 'members_over_3'
  | 'eco_chef_ai'
  | 'voyage_ai'
  | 'capsule_gazette_bd_ai'
  | 'bedtime_stories_ai'
  | 'peacemaker_ai';

export type PremiumFeature = {
  id: PremiumFeatureId;
  title: string;
  description: string;
};

export const FREE_MEMBER_LIMIT = 3;

export const PREMIUM_FEATURES: Record<PremiumFeatureId, PremiumFeature> = {
  real_ai: {
    id: 'real_ai',
    title: 'IA réelle avec API',
    description: 'Accès aux appels Grok/Gemini réels, avec 10 requêtes par foyer et par jour puis repli local.'
  },
  exports: {
    id: 'exports',
    title: 'Exports PDF, Excel et historiques',
    description: 'Exportez les données budgétaires et familiales dans des formats professionnels.'
  },
  demarches: {
    id: 'demarches',
    title: 'Démarches administratives',
    description: 'Suivez vos procédures, pièces justificatives et échéances administratives.'
  },
  members_over_3: {
    id: 'members_over_3',
    title: 'Famille de plus de 3 membres',
    description: 'Ajoutez tous les membres du foyer au-delà de la limite gratuite.'
  },
  eco_chef_ai: {
    id: 'eco_chef_ai',
    title: 'Éco-Chef IA',
    description: 'Générez recettes, menus et idées anti-gaspi avec l’IA.'
  },
  voyage_ai: {
    id: 'voyage_ai',
    title: 'Voyage IA',
    description: 'Générez des listes de valise et conseils de voyage personnalisés.'
  },
  capsule_gazette_bd_ai: {
    id: 'capsule_gazette_bd_ai',
    title: 'Gazette BD IA',
    description: 'Transformez les souvenirs familiaux en gazette BD assistée par IA.'
  },
  bedtime_stories_ai: {
    id: 'bedtime_stories_ai',
    title: 'Histoires du soir IA',
    description: 'Créez des contes du soir personnalisés pour les enfants.'
  },
  peacemaker_ai: {
    id: 'peacemaker_ai',
    title: 'PeaceMaker IA',
    description: 'Médiation familiale assistée par IA pour apaiser les conflits.'
  }
};

export const PREMIUM_MODULE_FEATURES: Record<string, PremiumFeatureId> = {
  conteur: 'bedtime_stories_ai',
  peacemaker: 'peacemaker_ai',
  demarches: 'demarches'
};

export function isPremiumFeatureEnabled(isPremium: boolean): boolean {
  return !!isPremium;
}

export function shouldBlockMemberAdd(isPremium: boolean, currentMemberCount: number): boolean {
  return !isPremium && currentMemberCount >= FREE_MEMBER_LIMIT;
}
