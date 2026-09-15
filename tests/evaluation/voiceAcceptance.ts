import { parseFamilyLabVoice, emptyFamilyVoiceContext, type FamilyVoiceResult } from '../../src/ai/local/familyVoiceDialogue.ts';
import { parseGroceryEntities } from '../../src/ai/local/safeGroceryEntities.ts';

// Independent acceptance inputs, never imported by the production parser.
type Case = { id: string; turns: string[]; list?: string; status: FamilyVoiceResult['status']; items?: [string, string][]; maxQuestions: number };
export const acceptanceCases: Case[] = [
  { id: 'polite-weight', turns: ['tu peux ajouter un kilo de tomates'], status: 'proposed', items: [['Tomates', '1 kg']], maxQuestions: 0 },
  { id: 'postfix-bottle', turns: ['rajoute du lait, quatre bouteilles'], status: 'proposed', items: [['Lait', '4 bouteilles']], maxQuestions: 0 },
  { id: 'postfix-multiple', turns: ['ajoute du lait, deux bouteilles, et du pain, trois pièces'], status: 'proposed', items: [['Lait', '2 bouteilles'], ['Pain', '3 pièces']], maxQuestions: 0 },
  { id: 'correction-after-qualifier', turns: ['ajoute cinq jus de pomme', 'le jus de pomme sans sucre ajouté', 'trois finalement'], status: 'proposed', items: [['Jus de pomme sans sucre ajouté', '3 pièces']], maxQuestions: 0 },
  { id: 'negated-order', turns: ['peux-tu ajouter du lait mais pas de beurre'], status: 'proposed', items: [['Lait', '1 pièce']], maxQuestions: 0 },
  { id: 'unit-inheritance', turns: ['ajoute quatre packs de six yaourts', 'deux finalement'], status: 'proposed', items: [['Yaourts', '2 packs de 6']], maxQuestions: 0 },
  { id: 'insufficient-scope', turns: ['pour dimanche ajoute un litre de lait', 'oui'], status: 'needs_clarification', items: [], maxQuestions: 2 },
  { id: 'no-recipient-loss', turns: ['ajoute du lait pour Alice', 'confirme'], status: 'needs_clarification', items: [], maxQuestions: 2 },
  { id: 'known-shortage', list: 'trois bouteilles de coca', turns: ['il manque du coca', 'deux bouteilles', 'confirme'], status: 'confirmed', items: [['Coca-Cola', '5 bouteilles']], maxQuestions: 1 },
  { id: 'keep-existing', list: 'deux litres de lait', turns: ['il manque du lait', 'annule'], status: 'cancelled', items: [], maxQuestions: 1 },
  { id: 'not-stock', list: 'trois yaourts', turns: ['on a encore des yaourts'], status: 'proposed', items: [], maxQuestions: 0 },
  { id: 'new-shortage', turns: ['nous avons fini les yaourts'], status: 'proposed', items: [['Yaourts', '1 pièce']], maxQuestions: 0 },
  { id: 'ambiguous-fruit', turns: ['ajoute quatre jus d orange', 'et un pomme', 'option 1'], status: 'proposed', items: [["Jus d'orange", '4 pièces'], ['Jus de pomme', '1 pièce']], maxQuestions: 1 },
  { id: 'explicit-fruit', turns: ['ajoute quatre jus d orange', 'et un pomme', 'option 2'], status: 'proposed', items: [["Jus d'orange", '4 pièces'], ['Pommes', '1 pièce']], maxQuestions: 1 },
  { id: 'noise-repair', turns: ['euh ajoute trois bouteilles de coca non deux et sans sucre'], status: 'proposed', items: [['Coca-Cola sans sucre', '2 bouteilles']], maxQuestions: 0 },
  { id: 'compact-transcript', turns: ['ajoute 3jus d orange'], status: 'proposed', items: [["Jus d'orange", '3 pièces']], maxQuestions: 0 },
  { id: 'no-price-as-product', turns: ['le lait coûte deux euros'], status: 'out_of_scope', items: [], maxQuestions: 0 },
  { id: 'no-implicit-expense', turns: ['j ai payé vingt euros pour le lait'], status: 'out_of_scope', items: [], maxQuestions: 0 },
  { id: 'no-medical-interpretation', turns: ['ajoute deux médicaments'], status: 'out_of_scope', items: [], maxQuestions: 0 },
  { id: 'no-conditional-action', turns: ['si le lait manque ajoute deux bouteilles'], status: 'rejected', items: [], maxQuestions: 0 },
  { id: 'no-negative', turns: ['ajoute moins trois yaourts'], status: 'rejected', items: [], maxQuestions: 0 },
  { id: 'no-zero', turns: ['ajoute zéro bouteille de lait'], status: 'rejected', items: [], maxQuestions: 0 },
  { id: 'stop-after-proposal', turns: ['ajoute deux pains', 'stop'], status: 'cancelled', items: [], maxQuestions: 0 },
  { id: 'explicit-selection', turns: ['ajoute deux laits et trois yaourts', 'finalement quatre', 'le deuxième'], status: 'proposed', items: [['Lait', '2 pièces'], ['Yaourts', '4 pièces']], maxQuestions: 1 },
];

export function evaluateAcceptance(cases = acceptanceCases) {
  const results = cases.map(row => {
    let context = emptyFamilyVoiceContext();
    let result: FamilyVoiceResult | undefined;
    let questions = 0;
    const parseTimes: number[] = [];
    for (const [index, text] of row.turns.entries()) {
      const start = performance.now();
      result = parseFamilyLabVoice(text, context, { now: 1000 + index, scopeKey: row.id, utteranceId: `${row.id}:${index}`, list: row.list ? parseGroceryEntities(row.list).items : [] });
      parseTimes.push(performance.now() - start);
      questions += Number(result.status === 'needs_clarification'); context = result.context;
    }
    const items = (result?.receipt?.after || context.grocery.proposal).map(item => [item.name, item.quantity]);
    const passed = result?.status === row.status && questions <= row.maxQuestions && (!row.items || JSON.stringify(items) === JSON.stringify(row.items));
    return { id: row.id, passed, status: result?.status, questions, items, parseTimes, unexpectedConfirmation: result?.status === 'confirmed' && row.status !== 'confirmed' };
  });
  const times = results.flatMap(row => row.parseTimes).sort((a, b) => a - b);
  return {
    cases: results.length, passed: results.filter(row => row.passed).length,
    unexpectedConfirmations: results.filter(row => row.unexpectedConfirmation).length,
    questions: results.reduce((sum, row) => sum + row.questions, 0),
    parseP95Ms: times[Math.max(0, Math.ceil(times.length * .95) - 1)] || 0,
    failures: results.filter(row => !row.passed),
    boundary: 'Text-only scripted acceptance, not a real microphone or unseen-user accuracy measurement.',
  };
}
