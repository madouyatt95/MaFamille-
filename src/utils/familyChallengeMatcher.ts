import type { ChallengeAnswer, FamilyChallengeQuestion } from '../data/familyChallengeQuestions';

const STOP_WORDS = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'au', 'aux', 'en']);

export const normalizeChallengeAnswer = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token && !STOP_WORDS.has(token))
    .join(' ')
    .trim();

const levenshtein = (left: string, right: string): number => {
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
      diagonal = old;
    }
  }
  return previous[right.length];
};

const similarity = (left: string, right: string): number => {
  if (left === right) return 1;
  const longest = Math.max(left.length, right.length);
  if (!longest) return 1;
  return 1 - levenshtein(left, right) / longest;
};

const scoreVariant = (input: string, variant: string): number => {
  const normalizedInput = normalizeChallengeAnswer(input);
  const normalizedVariant = normalizeChallengeAnswer(variant);
  if (!normalizedInput || !normalizedVariant) return 0;
  if (normalizedInput === normalizedVariant) return 1;
  if (normalizedInput.includes(normalizedVariant) || normalizedVariant.includes(normalizedInput)) {
    const shortest = Math.min(normalizedInput.length, normalizedVariant.length);
    const longest = Math.max(normalizedInput.length, normalizedVariant.length);
    return shortest / longest >= 0.55 ? 0.94 : 0.72;
  }
  const inputTokens = new Set(normalizedInput.split(' '));
  const variantTokens = new Set(normalizedVariant.split(' '));
  const common = [...inputTokens].filter(token => variantTokens.has(token)).length;
  const tokenScore = common / Math.max(inputTokens.size, variantTokens.size);
  return Math.max(similarity(normalizedInput, normalizedVariant), tokenScore);
};

export type ChallengeMatch = {
  answer: ChallengeAnswer | null;
  answerIndex: number;
  confidence: number;
  status: 'accepted' | 'close' | 'rejected';
};

export const matchChallengeAnswer = (input: string, question: FamilyChallengeQuestion): ChallengeMatch => {
  let best: ChallengeMatch = { answer: null, answerIndex: -1, confidence: 0, status: 'rejected' };
  question.answers.forEach((candidate, answerIndex) => {
    const confidence = Math.max(...[candidate.label, ...candidate.aliases].map(variant => scoreVariant(input, variant)));
    if (confidence > best.confidence) {
      best = {
        answer: candidate,
        answerIndex,
        confidence,
        status: confidence >= 0.72 ? 'accepted' : confidence >= 0.58 ? 'close' : 'rejected'
      };
    }
  });
  return best;
};
