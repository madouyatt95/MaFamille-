import { foldVoice, normalizeSafeVoiceText, validCustomName } from './safeGroceryEntities.ts';

const protectedTerms = /[€$£\d]|\b(?:euros?|prix|budget|depense|rdv|rendez|medecin|medicament|traitement|message|envoie|appelle|ouvre|devoir|voyage)\b/;
const distance = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const before = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + Number(a[i - 1] !== b[j - 1])); diagonal = before; }
  }
  return row[b.length];
};

// Suggestions never replace the heard sentence: the caller must ask for a choice.
export function suggestGroceryTranscriptions(raw: string, vocabulary: string[] = []): string[] {
  const text = normalizeSafeVoiceText(raw);
  if (text.length > 500 || protectedTerms.test(foldVoice(text).replace(/\b\d+(?:[.,]\d+)?\b/g, ''))) return [];
  const suggestions = new Set<string>();
  if (/\bjours? orange\b/.test(text)) suggestions.add(text.replace(/\bjours? orange\b/g, "jus d'orange"));
  const match = text.match(/^(?:(?:ajoute|rajoute|achete)\s+)?(?:(?:\d+|un|une|deux|trois)\s+)?([\p{L}]{5,30})$/u);
  if (match && !protectedTerms.test(foldVoice(match[1]))) {
    for (const candidate of vocabulary.slice(0, 100).filter(validCustomName)) {
      if (!/^[\p{L}]{5,30}$/u.test(candidate)) continue;
      if (distance(foldVoice(match[1]), foldVoice(candidate)) === 1) suggestions.add(text.slice(0, -match[1].length) + candidate);
    }
  }
  return [...suggestions].filter(value => value !== text).slice(0, 3);
}
