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
export function pilotPartition(rows: PilotGroceryRow[]) {
  const items: SafeGroceryItem[] = [];
  const preserved: PilotGroceryRow[] = [];
  for (const row of rows) {
    const parsed = parseGroceryEntities(`${row.quantity || '1'} ${row.name}`);
    if (parsed.error || parsed.items.length !== 1) { preserved.push(row); continue; }
    items.push({ ...parsed.items[0], recordId: row.id, name: row.name, category: row.category || parsed.items[0].category, completed: Boolean(row.checked) });
  }
  return { items, preserved };
}
export function preservedTarget(text: string, rows: PilotGroceryRow[]) {
  const folded = ` ${foldVoice(normalizeSafeVoiceText(text)).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return pilotPartition(rows).preserved.find(row => {
    const name = foldVoice(row.name).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    return name && folded.includes(` ${name} `);
  });
}
export function pilotMealIntent(text: string): 'meal' | 'menu' | null {
  const t = foldVoice(normalizeSafeVoiceText(text));
  if (!['courses', 'unknown'].includes(detectProtectedVoiceDomain(text))) return null;
  if (/^(?:on mange quoi|qu'est-ce qu'on mange|quoi manger|une idee de (?:menu|repas)|propose(?:-moi| moi)? (?:un |une )?(?:menu|repas|recette))\b/.test(t)) return 'menu';
  return /^(?:prepare|preparer|prevois|prevoir|organise|organiser)\s+(?:un |une |le |la )?(?:diner|dejeuner|souper|repas)\b/.test(t) ? 'meal' : null;
}
const sameRow = (a: PilotGroceryRow, b: PilotGroceryRow) => a.id === b.id && a.name === b.name && a.category === b.category && a.quantity === b.quantity && a.checked === b.checked;
export function rebasePilotGroceries(before: PilotGroceryRow[], desired: PilotGroceryRow[], fresh: PilotGroceryRow[]) {
  const old = new Map(before.map(row => [row.id, row]));
  const wanted = new Map(desired.map(row => [row.id, row]));
  const touched = before.filter(row => !wanted.has(row.id) || !sameRow(row, wanted.get(row.id)!));
  for (const row of touched) {
    const latest = fresh.find(value => value.id === row.id);
    if (!latest || !sameRow(row, latest)) throw new Error(`« ${row.name} » a changé depuis votre demande. Rien n’est enregistré. Recommencez à partir de la liste actualisée.`);
  }
  const touchedIds = new Set(touched.map(row => row.id));
  const next = fresh.flatMap(row => touchedIds.has(row.id) ? wanted.has(row.id) ? [wanted.get(row.id)!] : [] : [row]);
  for (const row of desired.filter(value => !old.has(value.id))) {
    if (fresh.some(value => value.id === row.id || foldVoice(value.name) === foldVoice(row.name))) throw new Error(`« ${row.name} » est déjà présent dans la liste actualisée. Vérifiez la quantité avant de recommencer.`);
    next.push(row);
  }
  if (next.length > 200) throw new Error('Liste trop longue pour cet essai.');
  return next;
}
export function pilotList(rows: PilotGroceryRow[]): SafeGroceryItem[] {
  if (rows.length > 200) throw new Error('Liste trop longue pour le mode d’essai. Utilisez les Courses.');
  const seen = new Set<string>();
  return pilotPartition(rows).items.map(item => {
    const name = foldVoice(item.name);
    if (seen.has(name)) throw new Error('La liste contient des doublons. Regroupez-les dans les Courses avant cet essai.');
    seen.add(name); return item;
  });
}
export function pilotAfter(before: PilotGroceryRow[], items: SafeGroceryItem[], id: () => string): PilotGroceryRow[] {
  if (items.length > 200 || new Set(items.map(item => foldVoice(item.name))).size !== items.length) throw new Error('Proposition invalide ou doublons.');
  const preserved = pilotPartition(before).preserved;
  const after = items.map(item => {
    if (preserved.some(row => row.id === item.recordId || foldVoice(row.name) === foldVoice(item.name))) throw new Error('Cet article doit être modifié directement dans les Courses.');
    const original = before.find(row => row.id === item.recordId);
    if (item.recordId && !original) throw new Error('Produit source inconnu.');
    // Keep untouched stored fields byte-for-byte: parsing must not rewrite the list.
    if (original) {
      const parsed = pilotList([original])[0];
      if (item.name === parsed.name && item.category === parsed.category && JSON.stringify(item.amount) === JSON.stringify(parsed.amount) && Boolean(item.completed) === Boolean(parsed.completed)) return { ...original };
    }
    return { id: original?.id || id(), name: item.name, category: item.category, quantity: item.quantity, checked: Boolean(item.completed) };
  });
  after.push(...preserved.map(row => ({ ...row })));
  if (after.length > 200 || new Set(after.map(row => row.id)).size !== after.length) throw new Error('Identifiants de produits ambigus ou liste trop longue.');
  return after;
}
