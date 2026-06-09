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
    title: 'IA reelle avec API',
    description: 'Acces aux appels IA reels au lieu des reponses locales simulees.'
  },
  exports: {
    id: 'exports',
    title: 'Exports PDF, Excel et historiques',
    description: 'Exportez les donnees budgetaires et familiales dans des formats professionnels.'
  },
  demarches: {
    id: 'demarches',
    title: 'Demarches administratives',
    description: 'Suivez vos procedures, pieces justificatives et echeances administratives.'
  },
  members_over_3: {
    id: 'members_over_3',
    title: 'Famille de plus de 3 membres',
    description: 'Ajoutez tous les membres du foyer au-dela de la limite gratuite.'
  },
  eco_chef_ai: {
    id: 'eco_chef_ai',
    title: 'Eco-Chef IA',
    description: 'Generez recettes, menus et idees anti-gaspi avec l IA.'
  },
  voyage_ai: {
    id: 'voyage_ai',
    title: 'Voyage IA',
    description: 'Generez des listes de valise et conseils de voyage personnalises.'
  },
  capsule_gazette_bd_ai: {
    id: 'capsule_gazette_bd_ai',
    title: 'Gazette BD IA',
    description: 'Transformez les souvenirs familiaux en gazette et BD assistees par IA.'
  },
  bedtime_stories_ai: {
    id: 'bedtime_stories_ai',
    title: 'Histoires du soir IA',
    description: 'Creez des contes du soir personnalises pour les enfants.'
  },
  peacemaker_ai: {
    id: 'peacemaker_ai',
    title: 'PeaceMaker IA',
    description: 'Mediation familiale assistee par IA pour apaiser les conflits.'
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
