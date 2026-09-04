import { decodeFamilyVocabulary, type FamilyVocabularyEntry } from '../ai/local/familyVocabulary.ts';

const keyFor = (scope: string) => `myfamily:voice-lab:vocabulary:v1:${encodeURIComponent(scope)}`;
export function loadLabVocabulary(scope: string): FamilyVocabularyEntry[] {
  try { return decodeFamilyVocabulary(localStorage.getItem(keyFor(scope))); } catch { return []; }
}
export function saveLabVocabulary(scope: string, entries: FamilyVocabularyEntry[], consent: boolean): boolean {
  if (!consent || entries.length > 50) return false;
  try {
    const data = JSON.stringify({ version: 1, entries });
    if (decodeFamilyVocabulary(data).length !== entries.length) return false;
    if (!entries.length) localStorage.removeItem(keyFor(scope));
    else localStorage.setItem(keyFor(scope), data);
    return true;
  } catch { return false; }
}
