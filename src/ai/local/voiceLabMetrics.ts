import { foldVoice } from './safeGroceryEntities.ts';
export function transcriptionMetrics(expected: string, actual: string) {
  const tokenize = (text: string) => foldVoice(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 150);
  const reference = tokenize(expected);
  const hypothesis = tokenize(actual);
  if (!reference.length) return null;
  let row = Array.from({ length: hypothesis.length + 1 }, (_, index) => index);
  for (let i = 1; i <= reference.length; i++) {
    const next = [i];
    for (let j = 1; j <= hypothesis.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (reference[i - 1] === hypothesis[j - 1] ? 0 : 1));
    row = next;
  }
  return { edits: row[hypothesis.length], words: reference.length, wordErrorRate: row[hypothesis.length] / reference.length };
}
