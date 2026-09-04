import type { FamilyModule } from '../../types.ts';
import { DICTIONARIES } from '../../utils/dictionaries.ts';
import type { LocalAiActionType } from './capabilityCatalog.ts';

export type ParserDerivedExample = {
  id: string;
  module: FamilyModule;
  label: string;
  prompt: string;
  expectedActionType: LocalAiActionType;
  sourceDictionary: keyof typeof DICTIONARIES;
};

type DictionaryTemplate = {
  module: FamilyModule;
  actionType: LocalAiActionType;
  label: string;
  prompt: (term: string, index: number) => string;
};

const TEMPLATES: Record<keyof typeof DICTIONARIES, DictionaryTemplate> = {
  courses: {
    module: 'courses',
    actionType: 'shopping.add',
    label: 'Produit du parseur courses',
    prompt: (term, index) => index % 2 === 0
      ? `Ajoute ${term} à la liste de courses.`
      : `Il nous faut ${term} pour les prochaines courses.`
  },
  budget: {
    module: 'budget',
    actionType: 'transaction.create',
    label: 'Mot-clé du parseur budget',
    prompt: (term, index) => `J'ai payé ${18 + index * 3} euros pour ${term} aujourd'hui.`
  },
  voyages: {
    module: 'voyages',
    actionType: 'trip.create',
    label: 'Destination du parseur voyages',
    prompt: (term) => `Prépare un voyage à ${term} à partir du 12 octobre.`
  },
  sante: {
    module: 'sante',
    actionType: 'event.create',
    label: 'Professionnel du parseur santé',
    prompt: (term, index) => `Ajoute un rendez-vous ${term} le ${10 + index} novembre à 16 heures.`
  },
  demarches: {
    module: 'demarches',
    actionType: 'reminder.create',
    label: 'Démarche du parseur administratif',
    prompt: (term, index) => `Rappelle-moi de vérifier ${term} le ${15 + index} janvier.`
  }
};

function normalizeId(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function takeSpread(values: string[], count: number): string[] {
  const unique = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  if (unique.length <= count) return unique;
  return Array.from({ length: count }, (_, index) => {
    const position = Math.round(index * (unique.length - 1) / (count - 1));
    return unique[position];
  });
}

export function buildParserDerivedExamples(perDictionary = 8): ParserDerivedExample[] {
  return (Object.keys(DICTIONARIES) as Array<keyof typeof DICTIONARIES>).flatMap(dictionaryName => {
    const template = TEMPLATES[dictionaryName];
    return takeSpread(DICTIONARIES[dictionaryName], perDictionary).map((term, index) => ({
      id: `parser-${dictionaryName}-${normalizeId(term)}-${index + 1}`,
      module: template.module,
      label: template.label,
      prompt: template.prompt(term, index),
      expectedActionType: template.actionType,
      sourceDictionary: dictionaryName
    }));
  });
}

export const PARSER_DERIVED_EXAMPLES = buildParserDerivedExamples();
