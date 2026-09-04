import type { SafeGroceryStatus, SafeVoiceDomain } from './safeGroceryParserV2.ts';

export type SafeGroceryCorpusCase = {
  id: string;
  text: string;
  expectedDomain: SafeVoiceDomain;
  expectedStatus: SafeGroceryStatus;
  expectedProduct?: string;
};

const PRODUCTS = [
  ['lait', 'Lait'],
  ['yaourts', 'Yaourts'],
  ['riz', 'Riz'],
  ['coca', 'Coca-Cola'],
  ["jus d'orange", "Jus d'orange"],
  ['pain de mie', 'Pain de mie'],
  ['tomates', 'Tomates'],
  ['oeufs', 'Œufs'],
  ['bananes', 'Bananes'],
  ['eau', 'Eau'],
  ['beurre', 'Beurre'],
  ['café', 'Café']
] as const;

const ADD_TEMPLATES = [
  (product: string) => `ajoute ${product}`,
  (product: string) => `rajoute ${product}`,
  (product: string) => `il faut ${product}`,
  (product: string) => `il n'y a plus de ${product}`,
  (product: string) => `on n'a plus de ${product}`,
  (product: string) => `plus de ${product}`,
  (product: string) => `2 ${product}`,
  (product: string) => `euh ajoute ${product} stp`,
  (product: string) => `3${product}`
];

const productCases: SafeGroceryCorpusCase[] = PRODUCTS.flatMap(([spoken, canonical], productIndex) =>
  ADD_TEMPLATES.map((template, templateIndex) => ({
    id: `product-${productIndex + 1}-${templateIndex + 1}`,
    text: template(spoken),
    expectedDomain: 'courses' as const,
    expectedStatus: 'proposed' as const,
    expectedProduct: canonical
  }))
);

const budgetCases: SafeGroceryCorpusCase[] = [
  "j'ai payé 32 euros chez Carrefour",
  'ajoute une dépense de 18 €',
  'prévois 50 euros pour les courses',
  'le budget courses est de 300 euros',
  'remboursement de 25 euros',
  'le repas coûte 42 €',
  'fais un virement de 20 euros',
  'mon salaire est arrivé',
  'quel est le prix de cette dépense',
  'j ai depense 12 euros en courses'
].map((text, index) => ({
  id: `budget-${index + 1}`,
  text,
  expectedDomain: 'budget',
  expectedStatus: 'out_of_scope'
}));

const planningCases: SafeGroceryCorpusCase[] = [
  'il faut prévoir de la boisson pour 3 personnes',
  'prépare des boissons pour 8 personnes',
  'organise les courses pour demain',
  'prévoir de quoi manger pour 5 personnes',
  'prépare un repas pour 4 personnes'
].map((text, index) => ({
  id: `planning-${index + 1}`,
  text,
  expectedDomain: 'courses',
  expectedStatus: 'needs_clarification'
}));

const rejectedCases: SafeGroceryCorpusCase[] = [
  'bonjour',
  'quelle heure est-il'
].map((text, index) => ({
  id: `rejected-${index + 1}`,
  text,
  expectedDomain: 'unknown',
  expectedStatus: 'rejected'
}));

const otherModuleCases: SafeGroceryCorpusCase[] = ['ouvre la fenêtre', 'raconte-moi une histoire', 'appelle maman'].map((text, index) => ({
  id: `other-module-${index + 1}`, text, expectedDomain: 'navigation', expectedStatus: 'out_of_scope'
}));

export const SAFE_GROCERY_V2_CORPUS: SafeGroceryCorpusCase[] = [
  ...productCases,
  ...budgetCases,
  ...planningCases,
  ...otherModuleCases,
  ...rejectedCases
];
