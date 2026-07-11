import { Capacitor, registerPlugin } from '@capacitor/core';
import { findMerchantBrandByExplicitAlias } from './merchantDirectory.ts';

export type ReceiptPaymentMethod = 'card' | 'cash' | 'check' | 'meal_voucher' | null;
export type ReceiptAmountConfidence = 'high' | 'medium' | 'low' | 'none';

export type ReceiptAmountCandidate = {
  value: number;
  currency: string;
  rawText: string;
  lineText: string;
  previousLine: string;
  nextLine: string;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  pagePosition: number;
  confidence: number | null;
  score: number;
  excluded: boolean;
  reasons: string[];
};

export type LocalReceiptOcrResult = {
  merchant: string;
  merchantRaw: string;
  merchantBrand: string | null;
  amount: number | null;
  category: string;
  categorySuggestion: string;
  date: string;
  time: string | null;
  currency: string;
  paymentMethod: ReceiptPaymentMethod;
  paymentMethodLabel: string;
  amountConfidence: ReceiptAmountConfidence;
  amountCandidates: ReceiptAmountCandidate[];
  alternateAmounts: number[];
  selectionReason: string;
  rawText: string;
};

export type LocalHomeworkOcrResult = {
  subject: string;
  title: string;
  rawText: string;
};

const todayISO = () => new Date().toISOString().split('T')[0];

type LocalOcrPlugin = {
  recognize(options: { imageBase64: string }): Promise<{ text: string; lines?: LocalOcrLineMetadata[] }>;
};

export type LocalOcrLineMetadata = {
  text: string;
  confidence: number | null;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  pageHeight?: number;
};

export type LocalOcrDocument = {
  text: string;
  lines: LocalOcrLineMetadata[];
};

const nativeLocalOcr = registerPlugin<LocalOcrPlugin>('LocalOcr');

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Image illisible.'));
  reader.readAsDataURL(blob);
});

export const recognizeImageDocument = async (image: File | Blob | string): Promise<LocalOcrDocument> => {
  if (Capacitor.getPlatform() === 'ios') {
    const imageBase64 = typeof image === 'string' ? image : await blobToDataUrl(image);
    const result = await nativeLocalOcr.recognize({ imageBase64 });
    return { text: result.text || '', lines: result.lines || [] };
  }

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('fra');
  try {
    const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
    const blocks = data.blocks || [];
    const pageHeight = Math.max(0, ...blocks.map(block => block.bbox?.y1 || 0));
    const lines = blocks.flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.map(line => ({
      text: line.text || '',
      confidence: Number.isFinite(line.confidence) ? line.confidence : null,
      boundingBox: line.bbox ? {
        x: line.bbox.x0,
        y: line.bbox.y0,
        width: Math.max(0, line.bbox.x1 - line.bbox.x0),
        height: Math.max(0, line.bbox.y1 - line.bbox.y0)
      } : null,
      pageHeight
    }))));
    return { text: data.text || '', lines };
  } finally {
    await worker.terminate();
  }
};

export const recognizeImageText = async (image: File | Blob | string): Promise<string> => (
  (await recognizeImageDocument(image)).text
);

const getTextLines = (text: string): string[] => (
  text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
);

export const normalizeReceiptAmount = (value?: string): number | null => {
  if (!value) return null;
  let normalized = value
    .replace(/[€]|EUR/gi, '')
    .replace(/[\u00a0\u202f\s]/g, '')
    .replace(/[Oo](?=\d{1,2}$)/g, '0')
    .replace(/[^\d,.-]/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  } else if ((normalized.match(/\./g) || []).length > 1) {
    const last = normalized.lastIndexOf('.');
    normalized = `${normalized.slice(0, last).replace(/\./g, '')}.${normalized.slice(last + 1)}`;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const detectReceiptCategory = (text: string): string => {
  const lower = text.toLowerCase();
  if (/\b(menu|nuggets?|frites?|burger|sandwich|pizza|restaurant|resto|coca(?:\s|-)?cola|à emporter|a emporter)\b/.test(lower)) return 'Restauration';
  if (/pharmacie|para|santé|sante|médicament|medicament|docteur|clinique/.test(lower)) return 'Santé';
  if (/station|carburant|essence|diesel|péage|peage|sncf|ratp|taxi|uber|parking/.test(lower)) return 'Transport';
  if (/école|ecole|librairie|papeterie|scolaire|formation|cours/.test(lower)) return 'Éducation';
  if (/cinema|cinéma|restaurant|resto|fast|loisir|jeu|sport|netflix/.test(lower)) return 'Loisirs';
  if (/loyer|edf|engie|eau|internet|box|assurance habitation/.test(lower)) return 'Logement';
  if (/market|super|carrefour|auchan|leclerc|lidl|aldi|franprix|monoprix|casino|intermarché|intermarche|boulangerie|épicerie|epicerie/.test(lower)) return 'Alimentation';
  return 'Divers';
};

const normalizeContext = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

const amountPattern = /(?:€\s*)?-?\d{1,3}(?:[ \u00a0\u202f.]\d{3})*[,.]\d{2}(?:\s*(?:€|EUR))?|(?:€\s*)?-?\d+[,.]\d{2}(?:\s*(?:€|EUR))?/gi;
const totalLabels: Array<[RegExp, number, string]> = [
  [/\bNET A PAYER\b/, 100, 'NET À PAYER'],
  [/\bMONTANT PAYE\b/, 98, 'MONTANT PAYÉ'],
  [/\bTOTAL A PAYER\b/, 95, 'TOTAL À PAYER'],
  [/\bTOTAL T T C\b|\bTOTAL TTC\b/, 90, 'TOTAL TTC'],
  [/\bTOTAL GENERAL\b/, 88, 'TOTAL GÉNÉRAL'],
  [/\bTOTAL DU\b|\bA PAYER\b/, 82, 'TOTAL DÛ'],
  [/\bTOTAL\b/, 35, 'TOTAL générique']
];
const paymentLabels: Array<[RegExp, ReceiptPaymentMethod, string]> = [
  [/\b(CARTE BLEUE|CARTE BANCAIRE|PAIEMENT CARTE|CB|VISA|MASTERCARD|APPLE PAY|GOOGLE PAY)\b/, 'card', 'paiement carte'],
  [/\b(ESPECES|CASH)\b/, 'cash', 'espèces'],
  [/\b(CHEQUE)\b/, 'check', 'chèque'],
  [/\b(TICKET RESTAURANT|TITRE RESTAURANT)\b/, 'meal_voucher', 'ticket restaurant']
];
const negativeLabels: Array<[RegExp, number, string]> = [
  [/\b(MT TVA|MONTANT TVA)\b/, -100, 'montant TVA'],
  [/\bBASE HT\b/, -90, 'base HT'],
  [/\b(TVA|TAXE|HORS TAXE|HT)\b/, -80, 'ligne fiscale'],
  [/\bBASE TTC\b/, -55, 'base TTC du tableau fiscal'],
  [/\b(PRIX UNITAIRE|PU|UNITE)\b/, -60, 'prix unitaire'],
  [/\b(SOUS TOTAL|REMISE|REDUCTION|RENDU|MONNAIE|ESPECES RECUES|ACOMPTE|POURBOIRE)\b/, -50, 'montant intermédiaire']
];

const detectPaymentMethod = (text: string): { method: ReceiptPaymentMethod; label: string } => {
  const normalized = normalizeContext(text);
  for (const [pattern, method, label] of paymentLabels) {
    if (pattern.test(normalized)) return { method, label };
  }
  return { method: null, label: 'Non détecté' };
};

const detectReceiptDate = (text: string): string | null => {
  const matches = Array.from(text.matchAll(/\b(\d{2})[./-](\d{2})[./-](\d{2,4})\b/g));
  for (const match of matches) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const yearText = match[3].length === 2 ? `20${match[3]}` : match[3];
    const year = Number(yearText);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (year >= 2000 && year <= 2099
      && date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day) {
      return `${yearText}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
};

const selectMerchant = (lines: string[]): { raw: string; brand: string | null } => {
  const ignored = /TICKET|FACTURE|RECU|TOTAL|SIRET|SIREN|TVA|NAF|COMMANDE|CAISSE|VENDEUR|FRANCE|CARTE|PAIEMENT|\d{2}[./-]\d{2}/i;
  const raw = lines.slice(0, 10).find(line => (
    line.length >= 3
    && line.length <= 50
    && !ignored.test(line)
    && !/^\d/.test(line)
    && !/@|WWW\.|HTTP/i.test(line)
  ))?.replace(/\s{2,}/g, ' ').trim() || 'Ticket de caisse';
  return { raw, brand: findMerchantBrandByExplicitAlias(raw)?.name || null };
};

const scoreReceiptAmounts = (lines: string[], metadata: LocalOcrLineMetadata[] = []): ReceiptAmountCandidate[] => {
  const candidates: ReceiptAmountCandidate[] = [];
  const lineCount = Math.max(lines.length, 1);
  lines.forEach((line, lineIndex) => {
    const matches = Array.from(line.matchAll(amountPattern));
    const previousLine = lines[lineIndex - 1] || '';
    const nextLine = lines[lineIndex + 1] || '';
    const normalizedLine = normalizeContext(line);
    const normalizedAround = normalizeContext(`${previousLine} ${line} ${nextLine}`);
    const negativeContext = /[A-Z]/.test(normalizedLine) ? normalizedLine : normalizedAround;
    const fiscalHeaders = /MT TVA/.test(normalizeContext(previousLine))
      && /BASE HT/.test(normalizeContext(previousLine))
      && /BASE TTC/.test(normalizeContext(previousLine));
    const lineMetadata = metadata.find(item => normalizeContext(item.text) === normalizedLine);

    matches.forEach((match, amountIndex) => {
      const value = normalizeReceiptAmount(match[0]);
      if (value === null || value >= 1_000_000) return;
      let score = 0;
      let excluded = false;
      const reasons: string[] = [];

      if (fiscalHeaders && matches.length >= 3) {
        if (amountIndex === matches.length - 3) { score -= 100; excluded = true; reasons.push('colonne Mt.TVA'); }
        else if (amountIndex === matches.length - 2) { score -= 90; excluded = true; reasons.push('colonne Base HT'); }
        else if (amountIndex === matches.length - 1) { score -= 55; reasons.push('colonne Base TTC fiscale'); }
      } else {
        for (const [pattern, penalty, reason] of negativeLabels) {
          if (pattern.test(negativeContext)) {
            score += penalty;
            reasons.push(reason);
            excluded = true;
            break;
          }
        }
      }

      if (!excluded) {
        for (const [pattern, bonus, reason] of totalLabels) {
          if (pattern.test(normalizedLine)) { score += bonus; reasons.push(reason); break; }
        }
        for (const [pattern, method, reason] of paymentLabels) {
          if (pattern.test(normalizedLine)) { score += method === 'card' ? 85 : 70; reasons.push(reason); break; }
        }
      }
      const pagePosition = lineMetadata?.boundingBox && lineMetadata.pageHeight
        ? Math.min(1, lineMetadata.boundingBox.y / lineMetadata.pageHeight)
        : lineCount === 1 ? 0.5 : lineIndex / (lineCount - 1);
      if (!excluded && pagePosition >= 0.65) { score += 20; reasons.push('bas du ticket'); }
      if (!excluded && match.index !== undefined && match.index >= line.length * 0.5) { score += 6; reasons.push('aligné à droite'); }

      candidates.push({
        value,
        currency: /EUR|€/i.test(match[0]) ? 'EUR' : 'EUR',
        rawText: match[0],
        lineText: line,
        previousLine,
        nextLine,
        boundingBox: lineMetadata?.boundingBox || null,
        pagePosition,
        confidence: lineMetadata?.confidence ?? null,
        score,
        excluded,
        reasons
      });
    });
  });

  const usable = candidates.filter(candidate => !candidate.excluded);
  for (const candidate of usable) {
    const confirmations = usable.filter(other => other !== candidate && Math.abs(other.value - candidate.value) < 0.005);
    const hasAuthoritativeContext = (item: ReceiptAmountCandidate) => item.reasons.some(reason => (
      reason === 'NET À PAYER'
      || reason === 'MONTANT PAYÉ'
      || reason === 'TOTAL À PAYER'
      || reason === 'TOTAL TTC'
      || reason === 'paiement carte'
      || reason === 'espèces'
      || reason === 'chèque'
    ));
    if (confirmations.length > 0 && (hasAuthoritativeContext(candidate) || confirmations.some(hasAuthoritativeContext))) {
      candidate.score += Math.min(45, confirmations.length * 30);
      candidate.reasons.push('montant répété');
    }
    if (confirmations.some(other => other.reasons.includes('paiement carte'))
      && candidate.reasons.some(reason => reason === 'TOTAL TTC' || reason === 'TOTAL À PAYER' || reason === 'NET À PAYER')) {
      candidate.score += 35;
      candidate.reasons.push('total confirmé par paiement carte');
    }
  }
  return candidates;
};

export const parseReceiptText = (text: string, metadata: LocalOcrLineMetadata[] = []): LocalReceiptOcrResult => {
  const lines = getTextLines(text);
  const merchant = selectMerchant(lines);
  let date = todayISO();
  const amountCandidates = scoreReceiptAmounts(lines, metadata);
  const ranked = amountCandidates.filter(candidate => !candidate.excluded).sort((left, right) => right.score - left.score);
  const selected = ranked[0] && ranked[0].score >= 35 ? ranked[0] : null;
  const amount = selected?.value || null;

  date = detectReceiptDate(text) || date;
  const timeMatch = text.match(/\b([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);
  const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] || '00'}` : null;
  const payment = detectPaymentMethod(text);
  const categorySuggestion = detectReceiptCategory(text);
  const amountConfidence: ReceiptAmountConfidence = !selected
    ? 'none'
    : selected.score >= 120 ? 'high' : selected.score >= 75 ? 'medium' : 'low';
  const alternateAmounts = Array.from(new Set(ranked.map(candidate => candidate.value)))
    .filter(value => amount === null || Math.abs(value - amount) >= 0.005)
    .slice(0, 4);
  const selectionReason = selected?.reasons.includes('total confirmé par paiement carte')
    ? 'TOTAL TTC confirmé par le paiement carte'
    : selected?.reasons.join(', ') || 'Montant à confirmer';

  if (import.meta.env?.DEV) {
    console.debug('[receipt-ocr]', {
      all_detected_amounts: amountCandidates.map(candidate => candidate.value),
      amount_contexts: amountCandidates.map(candidate => ({ value: candidate.value, line: candidate.lineText })),
      excluded_amounts: amountCandidates.filter(candidate => candidate.excluded).map(candidate => ({ value: candidate.value, reasons: candidate.reasons })),
      candidate_scores: amountCandidates.map(candidate => ({ value: candidate.value, score: candidate.score, reasons: candidate.reasons })),
      selected_amount: amount,
      selection_reason: selectionReason,
      merchant_raw: merchant.raw,
      merchant_brand: merchant.brand,
      date,
      payment_method: payment.method
    });
  }

  return {
    merchant: merchant.brand || merchant.raw,
    merchantRaw: merchant.raw,
    merchantBrand: merchant.brand,
    amount,
    category: categorySuggestion === 'Restauration' ? 'Alimentation' : categorySuggestion,
    categorySuggestion,
    date,
    time,
    currency: 'EUR',
    paymentMethod: payment.method,
    paymentMethodLabel: payment.label,
    amountConfidence,
    amountCandidates,
    alternateAmounts,
    selectionReason,
    rawText: text
  };
};

export const parseHomeworkText = (text: string): LocalHomeworkOcrResult => {
  const lines = getTextLines(text);
  const subjectMatch = text.match(/(maths?|mathématiques|mathematiques|français|francais|anglais|histoire|géographie|geographie|svt|physique|chimie|espagnol|lecture|dictée|dictee)/i);
  const subject = subjectMatch?.[1] || 'Devoir';
  const title = lines.find(line => line.length > 5 && line.length < 80) || 'Devoir scanné';
  return { subject, title, rawText: text };
};
