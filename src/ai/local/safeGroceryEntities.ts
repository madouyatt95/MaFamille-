import { PRODUCT_LIST } from '../../utils/groceryParser.ts';
import { readFrenchNumber } from './frenchVoiceNumbers.ts';

export type GroceryUnit = 'piece' | 'bottle' | 'pack' | 'box' | 'can' | 'kg' | 'g' | 'litre' | 'ml';
export type GroceryAmount = { value: number; unit: GroceryUnit; packSize?: number };
export type SafeGroceryItem = {
  name: string;
  category: string;
  quantity: string;
  amount: GroceryAmount;
  source: 'catalog' | 'personal' | 'unconfirmed';
  productName?: string;
  qualifiers?: string[];
  completed?: boolean;
};

export const foldVoice = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').toLowerCase();
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function normalizeSafeVoiceText(raw: string, aliases: Record<string, string> = {}): string {
  let text = raw.toLowerCase().trim().replace(/[’`]/g, "'")
    .replace(/(\d)(?=[a-zà-ÿ])/gi, '$1 ')
    .replace(/\bd\s+([aeiouyhàâäéèêëîïôöùûü])/gi, "d'$1")
    .replace(/\b(?:euh+|heu+|s'il te plaît|s'il te plait|stp)\b/gi, ' ')
    .replace(/[.!?]+$/g, '').replace(/\s+/g, ' ').trim();
  // One pass prevents an alias from rewriting the output of another alias.
  const entries = Object.entries(aliases).map(([from, to]) => [normalizeSafeVoiceText(from), to] as const)
    .filter(([from]) => from).sort((a, b) => b[0].length - a[0].length);
  if (entries.length) {
    const lookup = new Map(entries);
    text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}])(${entries.map(([from]) => escapeRegex(from)).join('|')})(?![\\p{L}\\p{N}])`, 'gu'),
      match => normalizeSafeVoiceText(lookup.get(match) || match));
  }
  return text;
}

const productByAlias = new Map(PRODUCT_LIST.flatMap(product => [product.name, ...product.keywords].map(alias => [foldVoice(normalizeSafeVoiceText(alias)), product] as const)));
const productPatterns = [...productByAlias.keys()].map(alias => new RegExp(`(?:^|[^a-z])${escapeRegex(alias)}(?:$|[^a-z])`));
export const containsGroceryProduct = (text: string) => productPatterns.some(pattern => pattern.test(foldVoice(text)));
export const stripArticle = (text: string) => text.trim().replace(/^(?:(?:du|de la|des|de|le|la|les|un|une)\s+|de l'|l'|d')/i, '').trim();

export const GROCERY_QUALIFIERS = ['sans sucre', 'sans lactose', 'bio', 'demi-écrémé', 'écrémé', 'entier'] as const;
export function qualifyGroceryItem(item: SafeGroceryItem, qualifier: string): SafeGroceryItem | null {
  const label = GROCERY_QUALIFIERS.find(value => foldVoice(value) === foldVoice(qualifier));
  if (!label) return null;
  const milkTypes: readonly string[] = GROCERY_QUALIFIERS.slice(3);
  const qualifiers = [...(item.qualifiers || []).filter(value => value !== label && !(milkTypes.includes(label) && milkTypes.includes(value))), label].sort();
  const productName = item.productName || item.name;
  return { ...item, productName, qualifiers, name: `${productName} ${qualifiers.join(' ')}` };
}

export function readAmountPrefix(text: string): { value: number; rest: string; explicit: boolean } {
  const negative = text.match(/^(?:moins\s+|-\s*)(.+)$/i);
  if (negative) {
    const parsed = readAmountPrefix(negative[1]);
    return { ...parsed, value: -Math.abs(parsed.value) };
  }
  const half = text.match(/^(?:(?:un|une)\s+)?demi(?:e)?(?:-|\s+)(.*)$/i);
  if (half) return { value: 0.5, rest: half[1], explicit: true };
  return readFrenchNumber(text);
}

const UNITS: Record<string, GroceryUnit> = { piece: 'piece', pieces: 'piece', bouteille: 'bottle', bouteilles: 'bottle', pack: 'pack', packs: 'pack', paquet: 'pack', paquets: 'pack', boite: 'box', boites: 'box', canette: 'can', canettes: 'can', kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramme: 'kg', kilogrammes: 'kg', g: 'g', gramme: 'g', grammes: 'g', l: 'litre', litre: 'litre', litres: 'litre', ml: 'ml', millilitre: 'ml', millilitres: 'ml' };
const LABELS: Record<GroceryUnit, [string, string]> = { piece: ['pièce', 'pièces'], bottle: ['bouteille', 'bouteilles'], pack: ['pack', 'packs'], box: ['boîte', 'boîtes'], can: ['canette', 'canettes'], kg: ['kg', 'kg'], g: ['g', 'g'], litre: ['litre', 'litres'], ml: ['ml', 'ml'] };

export const validAmount = (amount: GroceryAmount) => Number.isFinite(amount.value) && amount.value > 0 && amount.value <= 10000
  && Object.hasOwn(LABELS, amount.unit)
  && (!['piece', 'bottle', 'pack', 'box', 'can'].includes(amount.unit) || Number.isInteger(amount.value))
  && (amount.packSize === undefined || (amount.unit === 'pack' && Number.isInteger(amount.packSize) && amount.packSize > 0 && amount.packSize <= 1000));

export function formatSafeAmount(amount: GroceryAmount): string {
  return `${String(amount.value).replace('.', ',')} ${LABELS[amount.unit][amount.value > 1 ? 1 : 0]}${amount.packSize ? ` de ${amount.packSize}` : ''}`;
}

export function readGroceryAmount(text: string) {
  const prefix = readAmountPrefix(text);
  let rest = prefix.rest;
  let amount: GroceryAmount = { value: prefix.value, unit: 'piece' };
  if (/^douzaines?\b/.test(rest)) {
    amount.value *= 12;
    rest = rest.replace(/^douzaines?\s*/, '');
  }
  const unitMatch = foldVoice(rest).match(new RegExp(`^(${Object.keys(UNITS).join('|')})(?=\\s|$)(.*)$`));
  if (unitMatch) {
    amount = { ...amount, unit: UNITS[unitMatch[1]] };
    rest = rest.slice(unitMatch[1].length).trim();
    const fraction = rest.match(/^et\s+(demi(?:e)?|quart)\b\s*/);
    if (fraction) { amount.value += fraction[1] === 'quart' ? 0.25 : 0.5; rest = rest.slice(fraction[0].length); }
    if (amount.unit === 'pack') {
      const size = readAmountPrefix(rest.replace(/^de\s+/, ''));
      if (size.explicit) { amount.packSize = size.value; rest = size.rest; }
    }
  }
  return { amount, rest: stripArticle(rest), explicit: prefix.explicit || Boolean(unitMatch), unitExplicit: Boolean(unitMatch), valid: validAmount(amount) };
}

const UNSAFE_NAME = /\b(?:je|tu|il|elle|nous|vous|on|faut|pour|demain|si|quand|pas|plus|ajoute|retire|remplace|achete|prevoir|seulement|deja|personnes|euros|budget|depense|ouvre|rendez|appelle)\b/;
export const validCustomName = (name: string) => name.length >= 2 && name.length <= 70 && name.split(/\s+/).length <= 6
  && /^[\p{L}\p{N} '-]+$/u.test(name) && /\p{L}/u.test(name) && !UNSAFE_NAME.test(foldVoice(name));

export function parseGroceryEntities(text: string, vocabulary: string[] = []): { items: SafeGroceryItem[]; error: string | null; unknown: string[] } {
  const segments = splitGrocerySegments(text);
  if (!segments.length || segments.length > 20) return { items: [], error: 'Indiquez entre un et vingt produits.', unknown: [] };
  const items: SafeGroceryItem[] = [];
  for (const segment of segments) {
    const { amount, rest, valid } = readGroceryAmount(segment);
    if (!valid) return { items: [], error: 'La quantité ou le conditionnement doit être positif et cohérent.', unknown: [] };
    if (!validCustomName(rest)) return { items: [], error: 'Un nom de produit court et explicite est nécessaire.', unknown: [] };
    let core = rest;
    const qualifiers: string[] = [];
    for (let count = 0; count < GROCERY_QUALIFIERS.length; count++) {
      const qualifier = GROCERY_QUALIFIERS.find(value => foldVoice(core).endsWith(` ${foldVoice(value)}`));
      if (!qualifier) break;
      qualifiers.unshift(qualifier);
      core = core.slice(0, -(qualifier.length + 1)).trim();
    }
    const product = productByAlias.get(foldVoice(core));
    if (qualifiers.filter(value => GROCERY_QUALIFIERS.slice(3).includes(value as typeof GROCERY_QUALIFIERS[number])).length > 1) return { items: [], error: 'Les précisions du lait se contredisent. Choisissez entier, écrémé ou demi-écrémé.', unknown: [] };
    const personal = vocabulary.find(name => foldVoice(name) === foldVoice(core));
    const name = product?.name || personal || core.charAt(0).toUpperCase() + core.slice(1);
    let item: SafeGroceryItem = { name, category: product?.category || 'Autres', quantity: formatSafeAmount(amount), amount,
      source: product ? 'catalog' : personal ? 'personal' : 'unconfirmed' };
    for (const qualifier of qualifiers) item = qualifyGroceryItem(item, qualifier) || item;
    items.push(item);
  }
  return { items, error: null, unknown: items.filter(item => item.source === 'unconfirmed').map(item => item.name) };
}

export function splitGrocerySegments(text: string): string[] {
  const result: string[] = [];
  let start = 0;
  for (const match of text.matchAll(/\s+et\s+|\s+puis\s+|,(?!\d)|;/gi)) {
    const index = match.index!;
    const remaining = text.slice(start).trimStart();
    const number = readAmountPrefix(remaining);
    const consumed = remaining.length - number.rest.length;
    if (number.explicit && index - start < consumed) continue;
    if (/\bet\b/.test(match[0]) && /\b(?:litres?|kilos?|kg|grammes?|g|ml|l)\s*$/i.test(text.slice(start, index)) && /^(?:demi(?:e)?|quart)\b/i.test(text.slice(index + match[0].length))) continue;
    result.push(text.slice(start, index).trim()); start = index + match[0].length;
  }
  result.push(text.slice(start).trim());
  return result.filter(Boolean);
}

export function addGroceryAmounts(left: GroceryAmount, right: GroceryAmount): GroceryAmount | null {
  const conversion: Partial<Record<GroceryUnit, [GroceryUnit, number]>> = { kg: ['g', 1000], g: ['g', 1], litre: ['ml', 1000], ml: ['ml', 1] };
  const l = conversion[left.unit];
  const r = conversion[right.unit];
  const value = left.unit === right.unit && left.packSize === right.packSize ? left.value + right.value
    : l && r && l[0] === r[0] ? left.value + right.value * r[1] / l[1] : null;
  const result = value === null ? null : { ...left, value: Math.round(value * 1000000) / 1000000 };
  return result && validAmount(result) ? result : null;
}
