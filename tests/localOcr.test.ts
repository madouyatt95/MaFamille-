import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReceiptAmount, parseReceiptText } from '../src/utils/localOcr.ts';

const gidMontignyTicket = `
GID MONTIGNY
33 BD VICTOR BORDIER
95370 MONTIGNY-LES-CORMEILLES
Code NAF : 56I0C
Siret : 89052729400015
TVA intra : FR37890527294
Commande N° B 1581
Ticket N°72795 CAISSE 8808
10/07/2026 - 15:17:42 - A EMPORTER
QTE DESIGNATION PRIX TOTAL TVA
1 MENU 8 NUGGETS 8,50 € 8,50 € 2
Frites
Coca cola
1 NUGGETS : 4 PIECES 3,40 € 3,40 € 2
Nb. Article : 2
TVA Mt.TVA Base HT Base TTC
2 à 10% 1,08 € 10,82 € 11,90 €
Total 1,08 € 10,82 € 11,90 €
Total T.T.C. 11,90 €
Mode de paiement
CARTE BLEUE 11,90 €
`;

test('GID MONTIGNY: selects TTC confirmed by card, never VAT', () => {
  const result = parseReceiptText(gidMontignyTicket);
  assert.equal(result.merchantRaw, 'GID MONTIGNY');
  assert.equal(result.merchantBrand, null);
  assert.equal(result.amount, 11.90);
  assert.notEqual(result.amount, 1.08);
  assert.equal(result.currency, 'EUR');
  assert.equal(result.date, '2026-07-10');
  assert.equal(result.time, '15:17:42');
  assert.equal(result.paymentMethod, 'card');
  assert.equal(result.categorySuggestion, 'Restauration');
  assert.equal(result.amountConfidence, 'high');
  assert.ok(result.amountCandidates.some(candidate => candidate.value === 1.08 && candidate.excluded));
  assert.match(result.selectionReason, /confirmé par le paiement carte/i);
});

const amountCases: Array<[string, number]> = [
  ['TOTAL TTC 24,90 €\nTVA 2,26 €', 24.90],
  ['Sous-total 50,00 €\nRemise 10,00 €\nNet à payer 40,00 €\nCarte bancaire 40,00 €', 40.00],
  ['Base HT 18,18 €\nTVA 1,82 €\nTotal TTC 20,00 €', 20.00],
  ['Total 35,00 €\nEspèces reçues 50,00 €\nRendu monnaie 15,00 €', 35.00],
  ['Montant payé 9,99 €', 9.99],
  ['TOTAL TTC 11.90 EUR\nVISA 11.90 EUR', 11.90],
  ['TOTAL TTC 1\u202f999,99 €', 1999.99],
  ['ticket partiellement coupé\nCB 7,50', 7.50]
];

for (const [text, expected] of amountCases) {
  test(`selects paid amount ${expected} from ${text.split('\n')[0]}`, () => {
    assert.equal(parseReceiptText(text).amount, expected);
  });
}

test('normalizes European and international amount formats', () => {
  assert.equal(normalizeReceiptAmount('11,90 €'), 11.90);
  assert.equal(normalizeReceiptAmount('1 999,99 €'), 1999.99);
  assert.equal(normalizeReceiptAmount('11.90 EUR'), 11.90);
  assert.equal(normalizeReceiptAmount('€ 11,90'), 11.90);
  assert.equal(normalizeReceiptAmount('0,00 €'), null);
  assert.equal(normalizeReceiptAmount('-2,00 €'), null);
  assert.equal(normalizeReceiptAmount(undefined), null);
});

test('keeps ambiguity visible when only weak amounts exist', () => {
  const result = parseReceiptText('PETIT COMMERCE\nArticle 3,20 €\nArticle 4,10 €');
  assert.equal(result.amount, null);
  assert.equal(result.amountConfidence, 'none');
  assert.ok(result.amountCandidates.length >= 2);
});

test('preserves low OCR confidence for user review', () => {
  const result = parseReceiptText('BOUTIQUE TEST\nTOTAL TTC 12,00 €', [{
    text: 'TOTAL TTC 12,00 €',
    confidence: 42,
    boundingBox: { x: 80, y: 700, width: 220, height: 30 },
    pageHeight: 800
  }]);
  assert.equal(result.amount, 12);
  assert.equal(result.amountCandidates.find(candidate => candidate.value === 12)?.confidence, 42);
});

test('does not treat repeated product prices as a paid total', () => {
  const result = parseReceiptText('BOUTIQUE TEST\nArticle A 8,50 €\nArticle A 8,50 €');
  assert.equal(result.amount, null);
  assert.equal(result.amountConfidence, 'none');
});

test('excludes cash received and change from the expense amount', () => {
  const result = parseReceiptText('Total 35,00 €\nESPÈCES REÇUES 50,00 €\nRENDU MONNAIE 15,00 €');
  assert.equal(result.amount, 35);
  assert.ok(result.amountCandidates.some(candidate => candidate.value === 50 && candidate.excluded));
  assert.ok(result.amountCandidates.some(candidate => candidate.value === 15 && candidate.excluded));
});
