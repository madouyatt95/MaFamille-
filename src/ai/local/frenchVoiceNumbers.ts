import { toCardinal } from 'n2words/fr-FR';

const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
let lexicon: Map<string, number> | undefined;
const numbers = () => {
  if (!lexicon) {
    lexicon = new Map(Array.from({ length: 1001 }, (_, value) => [fold(toCardinal(value)), value]));
    lexicon.set('une', 1);
    for (let value = 21; value <= 1000; value++) {
      const spelling = fold(toCardinal(value));
      if (spelling.endsWith(' un')) lexicon.set(spelling.slice(0, -3) + ' une', value);
    }
  }
  return lexicon;
};
const NUMBER_WORD = /^(?:zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?|mille|millions?|milliards?)(?:\b|-)/;

// Closed reverse catalogue: unsupported continuations fail instead of being truncated.
export function readFrenchNumber(text: string): { value: number; rest: string; explicit: boolean } {
  const numeric = text.match(/^(\d+(?:[.,]\d+)?)(?=\s|$)/);
  if (numeric) return { value: Number(numeric[1].replace(',', '.')), rest: text.slice(numeric[0].length).trim(), explicit: true };
  const tokens = [...text.matchAll(/\S+/g)].slice(0, 14);
  let best: { value: number; end: number } | undefined;
  for (const token of tokens) {
    const end = token.index! + token[0].length;
    const value = numbers().get(fold(text.slice(0, end)));
    if (value !== undefined) best = { value, end };
  }
  if (!best) return { value: NUMBER_WORD.test(fold(text)) ? NaN : 1, rest: text, explicit: NUMBER_WORD.test(fold(text)) };
  const rest = text.slice(best.end).trim();
  const continuation = fold(rest).replace(/^et\s+(?=un\b|une\b|onze\b)/, '');
  return { value: NUMBER_WORD.test(continuation) ? NaN : best.value, rest, explicit: true };
}

export function readEuroCents(text: string): number | null {
  if (/^\s*(?:-|moins\b)/i.test(text)) return null;
  const match = fold(text).match(/^(.+?)\s*(?:euros?|eur|€)(?:\s+(?:et\s+)?(.+?)(?:\s+centimes?)?)?$/);
  if (!match) return null;
  const major = readFrenchNumber(match[1]);
  if (!major.explicit || major.rest || !Number.isFinite(major.value) || major.value < 0) return null;
  let cents: number;
  if (match[2]) {
    const minor = readFrenchNumber(match[2]);
    if (!Number.isInteger(major.value) || !minor.explicit || minor.rest || !Number.isInteger(minor.value) || minor.value < 0 || minor.value > 99) return null;
    cents = major.value * 100 + minor.value;
  } else {
    if (Math.abs(major.value * 100 - Math.round(major.value * 100)) > 0.000001) return null;
    cents = Math.round(major.value * 100);
  }
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100000000 ? cents : null;
}
