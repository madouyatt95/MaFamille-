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
    description: 'Grok et Gemini réels sur les modules clés, 10 requêtes par foyer et par jour puis repli local.'
  },
  exports: {
    id: 'exports',
    title: 'Exports PDF, Excel et historiques',
    description: 'Rapports budget, historiques et exports propres pour garder une trace exploitable.'
  },
  demarches: {
    id: 'demarches',
    title: 'Démarches administratives',
    description: 'Onglet démarches, justificatifs, échéances et suivi administratif du foyer.'
  },
  members_over_3: {
    id: 'members_over_3',
    title: 'Famille de plus de 3 membres',
    description: 'La version gratuite reste limitée à 3 membres, Premium ouvre toute la famille.'
  },
  eco_chef_ai: {
    id: 'eco_chef_ai',
    title: 'Éco-Chef IA',
    description: 'Recettes anti-gaspi, idées repas et menus intelligents à partir du frigo.'
  },
  voyage_ai: {
    id: 'voyage_ai',
    title: 'Voyage IA',
    description: 'Valises personnalisées par membre et conseils pratiques selon la destination.'
  },
  capsule_gazette_bd_ai: {
    id: 'capsule_gazette_bd_ai',
    title: 'Gazette BD IA',
    description: 'Transformez les souvenirs de la capsule temporelle en gazette BD familiale.'
  },
  bedtime_stories_ai: {
    id: 'bedtime_stories_ai',
    title: 'Histoires du soir IA',
    description: 'Contes personnalisés, univers magiques et lecture vocale améliorée.'
  },
  peacemaker_ai: {
    id: 'peacemaker_ai',
    title: 'PeaceMaker IA',
    description: 'Aide à reformuler, comprendre les besoins et trouver un compromis familial.'
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
