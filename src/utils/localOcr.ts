import { Capacitor, registerPlugin } from '@capacitor/core';

export type LocalReceiptOcrResult = {
  merchant: string;
  amount: number | null;
  category: string;
  date: string;
  rawText: string;
};

export type LocalHomeworkOcrResult = {
  subject: string;
  title: string;
  rawText: string;
};

const todayISO = () => new Date().toISOString().split('T')[0];

type LocalOcrPlugin = {
  recognize(options: { imageBase64: string }): Promise<{ text: string }>;
};

const nativeLocalOcr = registerPlugin<LocalOcrPlugin>('LocalOcr');

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Image illisible.'));
  reader.readAsDataURL(blob);
});

export const recognizeImageText = async (image: File | Blob | string): Promise<string> => {
  if (Capacitor.getPlatform() === 'ios') {
    const imageBase64 = typeof image === 'string' ? image : await blobToDataUrl(image);
    const result = await nativeLocalOcr.recognize({ imageBase64 });
    return result.text || '';
  }

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('fra');
  try {
    const { data: { text } } = await worker.recognize(image);
    return text || '';
  } finally {
    await worker.terminate();
  }
};

const getTextLines = (text: string): string[] => (
  text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
);

const normalizeAmount = (value?: string): number | null => {
  if (!value) return null;
  const amount = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const detectReceiptCategory = (text: string): string => {
  const lower = text.toLowerCase();
  if (/pharmacie|para|santé|sante|médicament|medicament|docteur|clinique/.test(lower)) return 'Santé';
  if (/station|carburant|essence|diesel|péage|peage|sncf|ratp|taxi|uber|parking/.test(lower)) return 'Transport';
  if (/école|ecole|librairie|papeterie|scolaire|formation|cours/.test(lower)) return 'Éducation';
  if (/cinema|cinéma|restaurant|resto|fast|loisir|jeu|sport|netflix/.test(lower)) return 'Loisirs';
  if (/loyer|edf|engie|eau|internet|box|assurance habitation/.test(lower)) return 'Logement';
  if (/market|super|carrefour|auchan|leclerc|lidl|aldi|franprix|monoprix|casino|intermarché|intermarche|boulangerie|épicerie|epicerie/.test(lower)) return 'Alimentation';
  return 'Divers';
};

export const parseReceiptText = (text: string): LocalReceiptOcrResult => {
  const lines = getTextLines(text);
  let merchant = 'Ticket de caisse';
  let amount: number | null = null;
  let date = todayISO();

  for (const line of lines.slice(0, 8)) {
    if (
      line.length > 2 &&
      line.length < 42 &&
      !/\d{2}[./-]\d{2}/.test(line) &&
      !/ticket|facture|reçu|recu|total|siret|tva|cb|carte/i.test(line)
    ) {
      merchant = line.replace(/\s{2,}/g, ' ');
      break;
    }
  }

  const priorityPatterns = [
    /(?:total\s*(?:ttc)?|net\s*à\s*payer|net\s*a\s*payer|montant|somme|payé|paye)\D{0,16}(\d{1,5}(?:[.,]\d{2}))/i,
    /(?:cb|carte bancaire|visa|mastercard)\D{0,16}(\d{1,5}(?:[.,]\d{2}))/i
  ];

  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);
    amount = normalizeAmount(match?.[1]);
    if (amount) break;
  }

  if (!amount) {
    const totals = lines
      .filter(line => /total|ttc|payer|montant/i.test(line))
      .flatMap(line => Array.from(line.matchAll(/(\d{1,5}(?:[.,]\d{2}))/g)).map(match => normalizeAmount(match[1])))
      .filter((value): value is number => !!value);
    if (totals.length > 0) amount = Math.max(...totals);
  }

  if (!amount) {
    const candidates = Array.from(text.matchAll(/(\d{1,5}(?:[.,]\d{2}))/g))
      .map(match => normalizeAmount(match[1]))
      .filter((value): value is number => !!value && value < 10000);
    if (candidates.length > 0) amount = Math.max(...candidates);
  }

  const dateMatch = text.match(/(\d{2})[./-](\d{2})[./-](\d{2,4})/);
  if (dateMatch) {
    const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
    date = `${year}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  return {
    merchant,
    amount,
    category: detectReceiptCategory(text),
    date,
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
