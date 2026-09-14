import type { SafeGroceryItem } from './safeGroceryEntities.ts';
import { parseGroceryEntities, foldVoice, normalizeSafeVoiceText } from './safeGroceryEntities.ts';
import { detectProtectedVoiceDomain } from './safeGroceryParserV2.ts';

export const pilotKey = (scope: string) => `mf_voice_pilot_v1:${scope}`;
export const pilotScope = (userId: string, foyerId: string, memberId: string) => `${userId}:${foyerId}:${memberId}`;
export function shouldUseVoicePilot(text: string, enabled: boolean, native: boolean, legacyPending: boolean) {
  if (!enabled || native || legacyPending) return false;
  const domain = detectProtectedVoiceDomain(text);
  const folded = foldVoice(normalizeSafeVoiceText(text));
  if (domain === 'agenda') return /^(?:decale|reporte|avance|deplace)\b/.test(folded);
  return domain === 'courses' || domain === 'unknown';
}
export type PilotGroceryRow = { id: string; name: string; category: string | null; quantity: string | null; checked: boolean | null };
export function pilotList(rows: PilotGroceryRow[]): SafeGroceryItem[] {
  if (rows.length > 200) throw new Error('Liste trop longue pour le mode d’essai. Utilisez les Courses.');
  const seen = new Set<string>();
  return rows.map(row => {
    const parsed = parseGroceryEntities(`${row.quantity || '1'} ${row.name}`);
    if (parsed.error || parsed.items.length !== 1) throw new Error(`Vérifiez le format de ${row.name} dans les Courses avant cet essai.`);
    const item = { ...parsed.items[0], recordId: row.id, name: row.name, category: row.category || parsed.items[0].category, completed: Boolean(row.checked) };
    const name = foldVoice(row.name);
    if (seen.has(name)) throw new Error('La liste contient des doublons. Regroupez-les dans les Courses avant cet essai.');
    seen.add(name); return item;
  });
}
export function pilotAfter(before: PilotGroceryRow[], items: SafeGroceryItem[], id: () => string): PilotGroceryRow[] {
  if (items.length > 200 || new Set(items.map(item => foldVoice(item.name))).size !== items.length) throw new Error('Proposition invalide ou doublons.');
  const after = items.map(item => {
    const original = before.find(row => row.id === item.recordId);
    if (item.recordId && !original) throw new Error('Produit source inconnu.');
    // Keep untouched stored fields byte-for-byte: parsing must not rewrite the list.
    if (original) {
      const parsed = pilotList([original])[0];
      if (item.name === parsed.name && item.category === parsed.category && JSON.stringify(item.amount) === JSON.stringify(parsed.amount) && Boolean(item.completed) === Boolean(parsed.completed)) return { ...original };
    }
    return { id: original?.id || id(), name: item.name, category: item.category, quantity: item.quantity, checked: Boolean(item.completed) };
  });
  if (new Set(after.map(row => row.id)).size !== after.length) throw new Error('Identifiants de produits ambigus.');
  return after;
}
