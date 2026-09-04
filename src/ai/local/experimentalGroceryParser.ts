import type { GroceryItem } from '../../types.ts';
import { getProductInfo, parseSmartNaturalSentence } from '../../utils/groceryParser.ts';

export type ExperimentalGroceryStatus = 'matched' | 'ambiguous' | 'rejected';

export type ExperimentalGroceryItem = Pick<GroceryItem, 'name' | 'category' | 'quantity'>;

export type ExperimentalGroceryResult = {
  status: ExperimentalGroceryStatus;
  confidence: number;
  normalizedPrompt: string;
  currentItems: ExperimentalGroceryItem[];
  safeItems: ExperimentalGroceryItem[];
  reason: string;
  clarification: string | null;
  pendingIntent?: 'group_drinks' | 'generic_products';
};

const normalizeText = (value: string) => value
  .trim()
  .replace(/[’`]/g, "'")
  .replace(/\s+/g, ' ');

const normalizeClarificationReply = (value: string) => normalizeText(value)
  .replace(/(\d)(?=[a-zà-ÿ])/gi, '$1 ')
  .replace(/\bd\s+([aeiouyhàâäéèêëîïôöùûü])/gi, "d'$1");

const SHORTAGE_PATTERNS = [
  /^(?:il n'y a|on n'a|nous n'avons) plus (?:du|de la|des|de l'|d'|de )?(.+)$/i,
  /^(?:il manque|il nous manque|on manque de|nous manquons de) (?:du|de la|des|de l'|d')?(.+)$/i,
  /^(?:on a|nous avons) (?:fini|termine|terminé) (?:le|la|les|du|de la|des|l')?(.+)$/i,
  /^plus de (?:du|de la|des|de l'|d')?(.+)$/i
];

const EXPLICIT_ADD_PATTERN = /^(?:ajoute|rajoute|achete|achète|acheter|il faut)\b/i;
const QUANTITY_PATTERN = /^(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\d+)\b/i;
const PRESET_PATTERN = /\b(?:prepare|prépare|faire les courses|fait les courses)\b.*\b(?:barbecue|petit[- ]dejeuner|petit[- ]déjeuner|gouter|goûter)\b/i;
const GROUP_PLANNING_PATTERN = /\b(?:prevoir|prévoir|prepare|prépare|organise|organiser)\b|\bpour\s+\d+\s+personnes?\b/i;
const GENERIC_NEED_PATTERN = /\b(?:boisson|boissons|repas|nourriture|courses|de quoi manger|de quoi boire)\b/i;
const SENTENCE_MARKERS = /\b(?:il|elle|on|nous|vous|je|tu|prepare|prépare|faut|manque|reste|courses|demain|aujourd'hui|pour)\b/i;

const normalizeQuantityLabel = (quantity: string) => quantity
  .replace(/^1 pièces\b/i, '1 pièce')
  .replace(/^1 bouteilles\b/i, '1 bouteille')
  .replace(/^1 paquets\b/i, '1 paquet')
  .replace(/^1 boîtes\b/i, '1 boîte')
  .replace(/^1 canettes\b/i, '1 canette');

const summarizeItems = (items: Omit<GroceryItem, 'id'>[]): ExperimentalGroceryItem[] => items.map(item => ({
  name: item.name,
  category: item.category,
  quantity: normalizeQuantityLabel(item.quantity)
}));

const findShortageEntity = (prompt: string): string | null => {
  for (const pattern of SHORTAGE_PATTERNS) {
    const match = prompt.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim().replace(/[.!?]+$/, '');
  }
  return null;
};

const isSafeItemName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed || trimmed.split(/\s+/).length > 7) return false;
  if (SENTENCE_MARKERS.test(trimmed)) return false;
  return true;
};

export function analyzeGroceryParserExperiment(
  prompt: string,
  memberName = 'Foyer'
): ExperimentalGroceryResult {
  const normalizedPrompt = normalizeText(prompt);
  const currentItems = summarizeItems(parseSmartNaturalSentence(normalizedPrompt, memberName));
  if (!normalizedPrompt) {
    return {
      status: 'rejected', confidence: 0, normalizedPrompt, currentItems, safeItems: [],
      reason: 'La demande est vide.', clarification: 'Quel produit faut-il ajouter ?'
    };
  }

  const shortageEntity = findShortageEntity(normalizedPrompt);
  const parserPrompt = shortageEntity ? `ajoute ${shortageEntity}` : normalizedPrompt;

  if (!shortageEntity && GROUP_PLANNING_PATTERN.test(normalizedPrompt) && GENERIC_NEED_PATTERN.test(normalizedPrompt)) {
    return {
      status: 'ambiguous', confidence: 0.25, normalizedPrompt: parserPrompt, currentItems, safeItems: [],
      reason: 'Un besoin collectif est détecté, mais aucun produit concret ne peut être déduit sans inventer.',
      clarification: /boisson/i.test(normalizedPrompt)
        ? 'Quelles boissons souhaitez-vous prévoir pour ces personnes ?'
        : 'Quels produits faut-il prévoir ?',
      pendingIntent: /boisson/i.test(normalizedPrompt) ? 'group_drinks' : 'generic_products'
    };
  }

  const parsedItems = summarizeItems(parseSmartNaturalSentence(parserPrompt, memberName));
  const safeItems = parsedItems.filter(item => isSafeItemName(item.name));
  const explicit = EXPLICIT_ADD_PATTERN.test(normalizedPrompt) || QUANTITY_PATTERN.test(normalizedPrompt);
  const preset = PRESET_PATTERN.test(normalizedPrompt);
  const allKnownProducts = safeItems.length > 0 && safeItems.every(item => Boolean(getProductInfo(item.name)));

  if (shortageEntity && safeItems.length > 0) {
    return {
      status: 'matched', confidence: 0.99, normalizedPrompt: parserPrompt, currentItems, safeItems,
      reason: 'Formulation de rupture reconnue avant le parseur.', clarification: null
    };
  }

  if ((explicit || preset) && safeItems.length > 0) {
    return {
      status: 'matched', confidence: preset ? 0.9 : 0.96, normalizedPrompt: parserPrompt, currentItems, safeItems,
      reason: explicit ? 'Commande d’ajout explicite.' : 'Liste type reconnue.', clarification: null
    };
  }

  if (allKnownProducts && safeItems.length === currentItems.length) {
    return {
      status: 'ambiguous', confidence: 0.55, normalizedPrompt: parserPrompt, currentItems, safeItems: [],
      reason: 'Des produits sont reconnaissables, mais aucune intention d’ajout explicite n’est détectée.',
      clarification: `Faut-il ajouter ${safeItems.map(item => item.name).join(', ')} à la liste ?`,
      pendingIntent: 'generic_products'
    };
  }

  return {
    status: 'ambiguous', confidence: 0.2, normalizedPrompt: parserPrompt, currentItems, safeItems: [],
    reason: 'Le texte ressemble à une phrase ou ne contient pas assez d’informations fiables.',
    clarification: 'Quel produit faut-il ajouter à la liste ?',
    pendingIntent: 'generic_products'
  };
}

export function resolveGroceryParserClarification(
  pending: ExperimentalGroceryResult,
  reply: string,
  memberName = 'Foyer'
): ExperimentalGroceryResult {
  if (pending.status !== 'ambiguous' || !pending.pendingIntent) {
    return analyzeGroceryParserExperiment(reply, memberName);
  }

  const normalizedReply = normalizeClarificationReply(reply);
  const currentItems = summarizeItems(parseSmartNaturalSentence(normalizeText(reply), memberName));
  if (!normalizedReply) {
    return {
      status: 'ambiguous', confidence: 0, normalizedPrompt: '', currentItems, safeItems: [],
      reason: 'La réponse à la clarification est vide.', clarification: pending.clarification,
      pendingIntent: pending.pendingIntent
    };
  }

  const parserPrompt = `ajoute ${normalizedReply}`;
  const parsedItems = summarizeItems(parseSmartNaturalSentence(parserPrompt, memberName));
  const safeItems = parsedItems.filter(item => isSafeItemName(item.name));
  const respectsIntent = pending.pendingIntent !== 'group_drinks'
    || safeItems.every(item => item.category === 'Boissons');

  if (safeItems.length > 0 && safeItems.length === parsedItems.length && respectsIntent) {
    return {
      status: 'matched', confidence: 0.98, normalizedPrompt: parserPrompt, currentItems, safeItems,
      reason: 'Réponse normalisée et rattachée à la clarification précédente.', clarification: null
    };
  }

  return {
    status: 'ambiguous', confidence: 0.2, normalizedPrompt: parserPrompt, currentItems, safeItems: [],
    reason: 'La réponse ne contient pas encore de produits compatibles avec la demande précédente.',
    clarification: pending.clarification,
    pendingIntent: pending.pendingIntent
  };
}
