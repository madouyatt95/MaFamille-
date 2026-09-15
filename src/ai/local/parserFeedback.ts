import { parseFamilyLabVoice, emptyFamilyVoiceContext } from './familyVoiceDialogue.ts';
import { foldVoice } from './safeGroceryEntities.ts';

export type ParserFeedback = { id: string; createdAt: string; turns: string[]; expectedStatus: 'proposed' | 'needs_clarification' | 'out_of_scope' | 'cancelled'; expectedNames: string[]; expectedItems?: { name: string; quantity: string }[]; maxQuestions?: number };
export const feedbackKey = (scope: string) => `mf_parser_feedback_v1:${scope}`;
export function validFeedback(value: unknown): value is ParserFeedback {
  if (!value || typeof value !== 'object') return false;
  const row = value as ParserFeedback;
  return typeof row.id === 'string' && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt))
    && Array.isArray(row.turns) && row.turns.length > 0 && row.turns.length <= 10 && row.turns.every(turn => typeof turn === 'string' && turn.length > 0 && turn.length <= 500)
    && ['proposed', 'needs_clarification', 'out_of_scope', 'cancelled'].includes(row.expectedStatus)
    && Array.isArray(row.expectedNames) && row.expectedNames.length <= 20 && row.expectedNames.every(name => typeof name === 'string' && name.length <= 70)
    && (row.maxQuestions === undefined || Number.isInteger(row.maxQuestions) && row.maxQuestions >= 0 && row.maxQuestions <= 10)
    && (row.expectedItems === undefined || Array.isArray(row.expectedItems) && row.expectedItems.length <= 20 && row.expectedItems.every(item => item && typeof item.name === 'string' && item.name.length <= 70 && typeof item.quantity === 'string' && item.quantity.length <= 80));
}
export function replayFeedback(row: ParserFeedback) {
  if (!validFeedback(row)) throw new Error('Cas de test invalide.');
  let context = emptyFamilyVoiceContext();
  let result = parseFamilyLabVoice('annule');
  let questions = 0;
  for (const [index, turn] of row.turns.entries()) {
    result = parseFamilyLabVoice(turn, context, { now: 1000 + index, scopeKey: 'feedback-test', utteranceId: `test-${index}` });
    context = result.context;
    questions += Number(result.status === 'needs_clarification');
  }
  const names = (result.receipt?.after || context.grocery.proposal).map(item => item.name);
  const items = (result.receipt?.after || context.grocery.proposal).map(item => ({ name: item.name, quantity: item.quantity }));
  const signature = (values: { name: string; quantity: string }[]) => JSON.stringify(values.map(item => [foldVoice(item.name), item.quantity]).sort((a, b) => a[0].localeCompare(b[0])));
  return { passed: result.status === row.expectedStatus && JSON.stringify(names.map(foldVoice).sort()) === JSON.stringify(row.expectedNames.map(foldVoice).sort()) && (!row.expectedItems || signature(items) === signature(row.expectedItems)) && (row.maxQuestions === undefined || questions <= row.maxQuestions), status: result.status, names, items, questions };
}
