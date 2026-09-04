import { foldVoice, normalizeSafeVoiceText, parseGroceryEntities, stripArticle, validCustomName, readGroceryAmount } from './safeGroceryEntities.ts';
import { detectProtectedVoiceDomain } from './safeGroceryParserV2.ts';

export type FamilyVocabularyEntry = { phrase: string; product: string };
export function validateVocabularyEntry(phrase: string, product: string): FamilyVocabularyEntry | null {
  const normalized = stripArticle(normalizeSafeVoiceText(phrase));
  const normalizedProduct = normalizeSafeVoiceText(product);
  if (!validCustomName(normalized) || !/\bhabituell?e?s?$/.test(foldVoice(normalized)) || !['courses', 'unknown'].includes(detectProtectedVoiceDomain(normalized))) return null;
  if (!['courses', 'unknown'].includes(detectProtectedVoiceDomain(normalizedProduct)) || readGroceryAmount(normalizedProduct).explicit) return null;
  const parsed = parseGroceryEntities(normalizedProduct);
  if (parsed.error || parsed.items.length !== 1) return null;
  return { phrase: normalized, product: parsed.items[0].name };
}
export function decodeFamilyVocabulary(raw: string | null): FamilyVocabularyEntry[] {
  try {
    const data: unknown = JSON.parse(raw || 'null');
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('entries' in data) || !Array.isArray(data.entries) || data.entries.length > 50) return [];
    const entries = data.entries.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || !('phrase' in entry) || typeof entry.phrase !== 'string' || !('product' in entry) || typeof entry.product !== 'string') return [];
      const valid = validateVocabularyEntry(entry.phrase, entry.product);
      return valid ? [valid] : [];
    });
    return [...new Map(entries.map(entry => [foldVoice(entry.phrase), entry])).values()];
  } catch { return []; }
}
export const vocabularyAliases = (entries: FamilyVocabularyEntry[]) => Object.fromEntries(entries.map(entry => [entry.phrase, entry.product]));
