import { parseFamilyLabVoice, emptyFamilyVoiceContext } from './familyVoiceDialogue.ts';
import { foldVoice } from './safeGroceryEntities.ts';

export type ParserFeedback = { id: string; createdAt: string; turns: string[]; expectedStatus: 'proposed' | 'needs_clarification' | 'out_of_scope' | 'cancelled'; expectedNames: string[] };
export const feedbackKey = (scope: string) => `mf_parser_feedback_v1:${scope}`;
export function validFeedback(value: unknown): value is ParserFeedback {
  if (!value || typeof value !== 'object') return false;
  const row = value as ParserFeedback;
  return typeof row.id === 'string' && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt))
    && Array.isArray(row.turns) && row.turns.length > 0 && row.turns.length <= 10 && row.turns.every(turn => typeof turn === 'string' && turn.length > 0 && turn.length <= 500)
    && ['proposed', 'needs_clarification', 'out_of_scope', 'cancelled'].includes(row.expectedStatus)
    && Array.isArray(row.expectedNames) && row.expectedNames.length <= 20 && row.expectedNames.every(name => typeof name === 'string' && name.length <= 70);
}
export function replayFeedback(row: ParserFeedback) {
  if (!validFeedback(row)) throw new Error('Cas de test invalide.');
  let context = emptyFamilyVoiceContext();
  let result = parseFamilyLabVoice('annule');
  for (const [index, turn] of row.turns.entries()) {
    result = parseFamilyLabVoice(turn, context, { now: 1000 + index, scopeKey: 'feedback-test', utteranceId: `test-${index}` });
    context = result.context;
  }
  const names = (result.receipt?.after || context.grocery.proposal).map(item => item.name);
  return { passed: result.status === row.expectedStatus && JSON.stringify(names.map(foldVoice).sort()) === JSON.stringify(row.expectedNames.map(foldVoice).sort()), status: result.status, names };
}
