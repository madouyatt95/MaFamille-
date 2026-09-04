import { parseSafeGroceryVoiceV2, EMPTY_GROCERY_CONVERSATION, GROCERY_DIALOGUE_TTL_MS, detectProtectedVoiceDomain, groceryListSignature, type SafeGroceryConversation, type SafeGroceryParseResult, type SafeGroceryParserOptions } from './safeGroceryParserV2.ts';
import { foldVoice, normalizeSafeVoiceText, type SafeGroceryItem } from './safeGroceryEntities.ts';
import { readEuroCents } from './frenchVoiceNumbers.ts';

export type LabExpense = { cents: number; currency: 'EUR'; label: string };
export type LabUndoToken = { id: string; revision: number; signature: string; label: string; kind: 'add' | 'other'; scopeKey: string };
export type FamilyVoiceContext = { grocery: SafeGroceryConversation; expenses: LabExpense[]; scopeKey?: string; expiresAt?: number; seen?: string[]; hearing?: { choices: string[]; previous: FamilyVoiceContext }; pendingUndo?: LabUndoToken };
export type FamilyVoiceOptions = SafeGroceryParserOptions & { alternatives?: string[]; undo?: LabUndoToken };
export type FamilyLabReceipt = { id: string; scopeKey: string; expiresAt: number; before: SafeGroceryItem[]; after: SafeGroceryItem[]; expenses: LabExpense[]; utteranceIds: string[] };
export type FamilyVoiceResult = {
  grocery: SafeGroceryParseResult;
  expenses: LabExpense[];
  status: SafeGroceryParseResult['status'];
  message: string;
  context: FamilyVoiceContext;
  interpreted: string[];
  receipt?: FamilyLabReceipt;
  undoReceipt?: LabUndoToken & { expiresAt: number };
};
export const emptyFamilyVoiceContext = (): FamilyVoiceContext => ({ grocery: { pending: null, proposal: [] }, expenses: [] });
const CONFIRM = /^(?:oui|oui merci|confirme|valide|c'est bon|c est bon|d'accord|d accord|ok)$/;
const CANCEL = /^(?:non|annule|annuler|laisse tomber|oublie|stop|arrete|coupe le micro|arrete le dialogue)$/;
const COMMAND = '(?:ajoute|rajoute|achete|prends|note|enregistre|retire|supprime|remplace|ouvre|envoie|rappelle|coche|d[eé]coche)\\b';

// Only explicit command boundaries split modules. A bare price never becomes a purchase.
export function splitLabCommands(raw: string): string[] {
  return normalizeSafeVoiceText(raw).split(new RegExp(`\\s+(?:et|puis|ensuite)\\s+(?=${COMMAND})|;\\s*(?=${COMMAND})`, 'i')).map(part => part.trim()).filter(Boolean);
}

export function parseLabExpense(text: string): LabExpense | null {
  const t = foldVoice(normalizeSafeVoiceText(text));
  const match = t.match(/^(?:note|ajoute|enregistre)\s+(?:(?:une\s+)?depense\s+(?:de\s+)?)?(.+?)\s+(?:de|pour|en)\s+([a-z][a-z '-]{1,59})$/);
  if (!match || /\b(?:pas|si|non|demain|annule|ajoute|virement|salaire|remboursement)\b/.test(match[2])) return null;
  const cents = readEuroCents(match[1]);
  return cents !== null ? { cents, currency: 'EUR', label: match[2] } : null;
}

// Preserve every segment: unsupported repairs cannot silently validate an earlier proposal.
export function expandLabRepairs(text: string): string[] {
  const normalized = normalizeSafeVoiceText(text).replace(/^(?:prends|prend)\s+/, 'ajoute ');
  return normalized.split(/\s*(?:\.{2,}|…|,)\s*non\s*[, :]?\s*|\s+non\s*[, :]?\s+(?=plut[oô]t\b|finalement\b|\d|un\b|une\b|deux\b|trois\b|quatre\b|cinq\b|six\b)/i)
    .flatMap((part, index) => {
      const qualifier = part.split(/\s+et\s+(?=sans sucre\b|sans lactose\b|bio\b)/i);
      return qualifier.map((value, position) => {
        const clean = value.replace(/\.{2,}|…/g, ' ').trim();
        if (position > 0) return clean;
        return index > 0 && !/^(?:plut[oô]t|finalement|remplace|retire)\b/i.test(clean) ? `finalement ${clean}` : clean;
      });
    });
}

function parseFamilyLabVoiceCore(raw: string, previous: FamilyVoiceContext = emptyFamilyVoiceContext(), options: SafeGroceryParserOptions = {}): FamilyVoiceResult {
  const now = options.now ?? Date.now();
  const scopeKey = options.scopeKey || 'lab';
  const input = normalizeSafeVoiceText(raw);
  const stale = previous.scopeKey && (previous.scopeKey !== scopeKey || !previous.expiresAt || previous.expiresAt <= now);
  let context = stale ? emptyFamilyVoiceContext() : structuredClone(previous);
  let grocery = parseSafeGroceryVoiceV2('', EMPTY_GROCERY_CONVERSATION, options);
  const interpreted: string[] = [];
  const answer = (status: FamilyVoiceResult['status'], message: string, receipt?: FamilyLabReceipt): FamilyVoiceResult => ({ grocery, expenses: context.expenses, status, message, context, interpreted, receipt });
  const abandon = (message: string, status: FamilyVoiceResult['status'] = 'rejected') => {
    context = emptyFamilyVoiceContext();
    return answer(status, message);
  };
  if (!input || input.length > 500) return abandon('La phrase est vide ou trop longue.');
  if (options.isFinal === false || options.utteranceId && context.seen?.includes(options.utteranceId)) return answer('ignored', 'Transcription intermédiaire ou déjà traitée.');
  context.scopeKey = scopeKey;
  context.expiresAt ??= now + GROCERY_DIALOGUE_TTL_MS;
  context.seen = [...(context.seen || []), ...(options.utteranceId ? [options.utteranceId] : [])].slice(-100);
  if (CANCEL.test(foldVoice(input))) return abandon('Toutes les propositions en attente sont annulées.', 'cancelled');

  if (CONFIRM.test(foldVoice(input))) {
    if (context.grocery.hasProposal || context.grocery.pending) {
      grocery = parseSafeGroceryVoiceV2(raw, context.grocery, options);
      context.grocery = grocery.nextContext;
      if (grocery.status !== 'confirmed') return answer(grocery.status, grocery.clarification || grocery.explanation);
    } else if (!context.expenses.length) return abandon(stale ? 'Le dialogue a expiré ou le profil a changé. Reformulez la demande.' : 'Aucune proposition à confirmer.', 'needs_clarification');
    const before = grocery.confirmedProposal?.before || options.list || [];
    const after = grocery.confirmedProposal?.after || before;
    const receipt: FamilyLabReceipt = { id: `${scopeKey}:${now}:${JSON.stringify([after, context.expenses])}`, scopeKey, expiresAt: context.expiresAt, before: structuredClone(before), after: structuredClone(after), expenses: structuredClone(context.expenses), utteranceIds: context.seen };
    const result = answer('confirmed', 'Ensemble confirmé. Aucune action réelle exécutée.', receipt);
    return { ...result, context: emptyFamilyVoiceContext() };
  }

  const clauses = splitLabCommands(raw);
  if (clauses.length > 5) return abandon('Limitez une demande à cinq actions.');
  // Check all raw clauses before any rewrite or proposal, including unsafe aliases.
  for (const clause of clauses) {
    for (const candidate of [clause, normalizeSafeVoiceText(clause, options.aliases)]) {
      const domain = detectProtectedVoiceDomain(candidate);
      if (domain === 'budget' && !parseLabExpense(candidate)) return abandon('Demande Budget à préciser séparément : indiquez un montant en euros et un motif, sans condition. Aucun ajout Courses effectué.', 'out_of_scope');
      if (!['budget', 'courses', 'unknown'].includes(domain)) return abandon(`Le module ${domain} reste hors de cette simulation. Aucune action partielle.`, 'out_of_scope');
    }
  }
  for (const [clauseIndex, clause] of clauses.entries()) {
    const expense = parseLabExpense(clause);
    if (expense) {
      context.expenses.push(expense);
      if (context.expenses.length > 10) return abandon('Trop de dépenses en attente. Recommencez par une demande plus courte.');
      interpreted.push(clause);
      continue;
    }
    if (clauseIndex > 0 && context.grocery.pending && context.grocery.pending.kind !== 'confirmation') return abandon('Une demande Courses reste à préciser. Reformulez les produits ensemble pour éviter d’en oublier un.', 'needs_clarification');
    const steps = expandLabRepairs(clause);
    if (steps.length > 5) return abandon('Trop de corrections dans une phrase. Reformulez la demande.');
    for (const [index, step] of steps.entries()) {
      interpreted.push(step);
      grocery = parseSafeGroceryVoiceV2(step, context.grocery, { ...options, utteranceId: options.utteranceId ? `${options.utteranceId}:${clauseIndex}:${index}` : undefined });
      context.grocery = grocery.nextContext;
      if (['rejected', 'out_of_scope', 'cancelled'].includes(grocery.status)) return abandon(grocery.clarification || grocery.explanation, grocery.status);
      if (grocery.status === 'needs_clarification' && steps.length > index + 1) return abandon(`${grocery.clarification} Reformulez la phrase complète pour éviter une correction partielle.`, 'needs_clarification');
    }
  }
  if (context.grocery.pending && context.grocery.pending.kind !== 'confirmation') return answer('needs_clarification', context.grocery.pending.clarification);
  if (!context.grocery.hasProposal && !context.expenses.length) return answer(grocery.status, grocery.clarification || grocery.explanation);
  return answer('proposed', `${grocery.explanation.includes('Exclus de cette demande') ? grocery.explanation + ' ' : ''}Relisez les propositions, puis confirmez l’ensemble une seule fois.`);
}

const undoCommand = /^(?:annule|annuler) (?:ma derniere action|la derniere action|la derniere modification|mon dernier ajout|le dernier ajout)$/;
const interpretationKey = (result: FamilyVoiceResult) => JSON.stringify([result.status, result.grocery.domain, result.context.grocery.proposal, result.receipt?.after, result.expenses, result.context.grocery.pending, result.context.pendingUndo, result.context.hearing?.choices, result.undoReceipt]);

export function parseFamilyLabVoice(raw: string, previous: FamilyVoiceContext = emptyFamilyVoiceContext(), options: FamilyVoiceOptions = {}): FamilyVoiceResult {
  const now = options.now ?? Date.now();
  const scopeKey = options.scopeKey || 'lab';
  const t = foldVoice(normalizeSafeVoiceText(raw));
  const stale = previous.scopeKey && (previous.scopeKey !== scopeKey || !previous.expiresAt || previous.expiresAt <= now);
  const context = stale ? emptyFamilyVoiceContext() : structuredClone(previous);
  const respond = (message: string, next = context, status: FamilyVoiceResult['status'] = 'needs_clarification'): FamilyVoiceResult => ({ grocery: parseSafeGroceryVoiceV2('', undefined, options), expenses: next.expenses, status, message, context: next, interpreted: [] });
  if (options.isFinal === false || options.utteranceId && context.seen?.includes(options.utteranceId)) return respond('Transcription intermédiaire ou déjà traitée.', context, 'ignored');
  if (!t || raw.length > 500) return respond('Reformulez une phrase courte.', emptyFamilyVoiceContext(), 'rejected');
  if (/^(?:stop|arrete|coupe le micro|arrete le dialogue)$/.test(t)) return parseFamilyLabVoiceCore(raw, emptyFamilyVoiceContext(), options);
  const candidates = [...new Set([raw, ...(options.alternatives || [])].map(value => normalizeSafeVoiceText(value)).filter(Boolean))];
  if (candidates.length > 1) {
    if (candidates.length > 5 || candidates.some(value => value.length > 500)) return respond('Trop de variantes vocales. Répétez une phrase courte.', emptyFamilyVoiceContext());
    const unique = new Map<string, string>();
    for (const candidate of candidates) {
      const result = parseFamilyLabVoice(candidate, context, { ...options, now, alternatives: undefined });
      unique.set(interpretationKey(result), candidate);
    }
    if (unique.size > 1) {
      const choices = [...unique.values()];
      return respond(`J’ai entendu plusieurs possibilités : ${choices.map((value, i) => `${i + 1}. « ${value} »`).join(' ; ')}. Laquelle choisissez-vous ?`, { ...context, scopeKey, expiresAt: context.expiresAt ?? now + GROCERY_DIALOGUE_TTL_MS, hearing: { choices, previous: context } });
    }
  }
  if (CANCEL.test(t)) return parseFamilyLabVoiceCore(raw, emptyFamilyVoiceContext(), options);
  if (context.hearing) {
    const choices = context.hearing.choices;
    const ordinal = t.match(/^(?:(?:le|la|choix|option)\s+)?(premier|premiere|deuxieme|second|seconde|troisieme|quatrieme|cinquieme|[1-5])$/);
    const index = ordinal ? ({ premier: 0, premiere: 0, deuxieme: 1, second: 1, seconde: 1, troisieme: 2, quatrieme: 3, cinquieme: 4 }[ordinal[1]] ?? Number(ordinal[1]) - 1) : choices.findIndex(value => foldVoice(value) === t);
    if (index < 0 || index >= choices.length || !Number.isInteger(index)) return respond(`Choisissez un numéro entre 1 et ${choices.length}, ou dites annule. Un simple « oui » ne choisit pas une transcription.`);
    return parseFamilyLabVoice(choices[index], context.hearing.previous, { ...options, now, alternatives: undefined });
  }
  if (undoCommand.test(t)) {
    if (context.grocery.hasProposal || context.grocery.pending || context.expenses.length) return respond('Une proposition est encore en attente. Dites « annule » pour l’abandonner avant d’annuler une action déjà appliquée.');
    const undo = options.undo;
    if (!undo || undo.scopeKey !== scopeKey) return respond('Aucune action appliquée annulable pour ce profil.', emptyFamilyVoiceContext());
    if (/ajout$/.test(t) && undo.kind !== 'add') return respond('La dernière action n’est pas un ajout Courses. Dites « annule ma dernière action » pour la consulter.', emptyFamilyVoiceContext());
    return respond(`Annuler ${undo.label} ? Confirmez pour préparer ce retour en arrière.`, { ...emptyFamilyVoiceContext(), scopeKey, expiresAt: now + GROCERY_DIALOGUE_TTL_MS, pendingUndo: structuredClone(undo) }, 'proposed');
  }
  if (context.pendingUndo) {
    if (JSON.stringify(context.pendingUndo) !== JSON.stringify(options.undo)) return respond('La simulation a changé. Cette annulation n’est plus applicable.', emptyFamilyVoiceContext(), 'rejected');
    if (!CONFIRM.test(t)) return respond(`Confirmez l’annulation de ${context.pendingUndo.label}, ou dites annule.`);
    return { ...respond('Annulation confirmée. Appliquez-la uniquement dans la simulation.', emptyFamilyVoiceContext(), 'confirmed'), undoReceipt: { ...context.pendingUndo, expiresAt: context.expiresAt! } };
  }
  return parseFamilyLabVoiceCore(raw, context, options);
}

export function sameLabList(left: SafeGroceryItem[], right: SafeGroceryItem[]) { return groceryListSignature(left) === groceryListSignature(right); }
