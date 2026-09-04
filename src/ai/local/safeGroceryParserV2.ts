import { parseSmartNaturalSentence } from '../../utils/groceryParser.ts';
import {
  addGroceryAmounts, containsGroceryProduct, foldVoice, formatSafeAmount,
  normalizeSafeVoiceText, parseGroceryEntities, readGroceryAmount, stripArticle,
  validAmount, qualifyGroceryItem, GROCERY_QUALIFIERS, splitGrocerySegments, type GroceryAmount, type SafeGroceryItem
} from './safeGroceryEntities.ts';

export { normalizeSafeVoiceText } from './safeGroceryEntities.ts';
export type { SafeGroceryItem } from './safeGroceryEntities.ts';
export type SafeVoiceDomain = 'courses' | 'budget' | 'agenda' | 'navigation' | 'health' | 'tasks' | 'messages' | 'unknown';
export type SafeGroceryIntent = 'shopping.add' | 'shopping.remove' | 'shopping.replace' | 'shopping.complete' | 'shopping.quantity.update' | 'shopping.summary' | 'shopping.plan' | 'shopping.confirm' | 'shopping.cancel' | 'none';
export type SafeGroceryStatus = 'proposed' | 'needs_clarification' | 'out_of_scope' | 'rejected' | 'confirmed' | 'cancelled' | 'ignored';
type Change = { kind: 'add' | 'set' | 'remove' | 'replace' | 'qualify' | 'complete'; items: SafeGroceryItem[]; target?: string; amount?: GroceryAmount; incremental?: boolean; inheritUnit?: boolean; qualifier?: string; targets?: { name: string; amount?: GroceryAmount }[]; completed?: boolean; selectionIndex?: number };
export type SafeGroceryPending = {
  kind: 'products' | 'confirmation' | 'unknown_product' | 'selection' | 'correction' | 'planning_quantity';
  intent: 'shopping.plan' | 'shopping.add';
  expectedCategory: string | null;
  clarification: string;
  change?: Change;
  choices?: string[];
};
export type SafeGroceryConversation = {
  pending: SafeGroceryPending | null;
  proposal: SafeGroceryItem[];
  hasProposal?: boolean;
  baseList?: SafeGroceryItem[];
  scopeKey?: string;
  expiresAt?: number;
  proposalId?: string;
  selectedName?: string;
  seenUtteranceIds?: string[];
  planning?: { people?: number; expectedCategory: string | null };
};
export type SafeGroceryParserOptions = {
  memberName?: string;
  aliases?: Record<string, string>;
  vocabulary?: string[];
  list?: SafeGroceryItem[];
  scopeKey?: string;
  now?: number;
  utteranceId?: string;
  isFinal?: boolean;
};
export type ConfirmedGroceryProposal = {
  id: string;
  scopeKey: string;
  expiresAt: number;
  before: SafeGroceryItem[];
  after: SafeGroceryItem[];
  utteranceIds: string[];
};
export type SafeGroceryParseResult = {
  domain: SafeVoiceDomain;
  status: SafeGroceryStatus;
  intent: SafeGroceryIntent;
  confidence: number;
  confidenceKind: 'heuristic';
  normalizedText: string;
  items: SafeGroceryItem[];
  missingFields: string[];
  clarification: string | null;
  requiresConfirmation: boolean;
  explanation: string;
  nextContext: SafeGroceryConversation;
  confirmedProposal?: ConfirmedGroceryProposal;
  learnableProducts: string[];
};

export const EMPTY_GROCERY_CONVERSATION: SafeGroceryConversation = { pending: null, proposal: [] };
export const GROCERY_DIALOGUE_TTL_MS = 120_000;
const CONFIRM = /^(?:oui|oui merci|confirme|valide|c'est bon|c est bon|d'accord|d accord|ok)$/;
const CANCEL = /^(?:non|annule|annuler|laisse tomber|oublie|stop)$/;
const NEGATION = /\b(?:pas|deja|jamais|sans ajouter)\b|^(?:ne\s+|n'ajoute)/;
const CONDITIONAL = /\b(?:si|seulement|au cas ou|quand|eventuellement|peut etre)\b/;

export function detectProtectedVoiceDomain(text: string): SafeVoiceDomain {
  const t = foldVoice(normalizeSafeVoiceText(text));
  if (/[€$£]|\b(?:euros?|eur|dollars?|chf|cfa|centimes?|pay[eé](?:r|s|e)?|depens(?:e|es|er)|budget|prix|cout(?:e|ent)|virement|salaire|revenu|remboursement)\b/.test(t)) return 'budget';
  if (/\b(?:rdv|rendez vous|rendez-vous|agenda|calendrier|medecin|dentiste)\b/.test(t)) return 'agenda';
  if (/\b(?:traitement|vaccin|ordonnance|symptome|allergie|medicament)\b/.test(t)) return 'health';
  if (/\b(?:message|envoie|messagerie|discussion)\b/.test(t)) return 'messages';
  if (/\b(?:tache|menage|devoirs)\b/.test(t)) return 'tasks';
  if (/\b(?:ouvre|affiche|va dans|retourne|voyage|appelle|raconte)\b/.test(t)) return 'navigation';
  if (/\b(?:ajoute|rajoute|acheter|achete|courses|panier|frigo|placard|boissons?|repas|manger|boire|manque|quoi acheter)\b/.test(t) || containsGroceryProduct(t)) return 'courses';
  return 'unknown';
}

export const groceryListSignature = (items: SafeGroceryItem[]) => JSON.stringify(items.map(item => [item.name, item.category, item.amount, item.source, item.productName, item.qualifiers, Boolean(item.completed)]));
const cloneItems = (items: SafeGroceryItem[]) => items.map(item => ({ ...item, amount: { ...item.amount } }));
const emptyContext = (): SafeGroceryConversation => ({ pending: null, proposal: [] });
const intentFor = (change: Change): SafeGroceryIntent => change.kind === 'complete' ? 'shopping.complete' : change.kind === 'remove' ? 'shopping.remove' : change.kind === 'replace' ? 'shopping.replace' : change.kind === 'set' ? 'shopping.quantity.update' : 'shopping.add';
const shortageEntity = (text: string) => {
  const patterns = [
    /^(?:il n'y a|il n y a|il y a|on n'a|on n a|on a|nous n'avons) plus\s+(.+)$/,
    /^(?:il manque|il nous manque|on manque de|nous manquons de)\s+(.+)$/,
    /^(?:on a|nous avons) (?:fini|termine)\s+(.+)$/,
    /^plus de\s+(.+)$/
  ];
  for (const pattern of patterns) {
    const match = foldVoice(text).match(pattern);
    if (match) return stripArticle(text.slice(text.length - match[1].length));
  }
  return null;
};
const resolveTarget = (text: string, items: SafeGroceryItem[]) => {
  const t = stripArticle(text);
  const parsed = parseGroceryEntities(t);
  const canonical = parsed.items.length === 1 ? parsed.items[0].name : t;
  const matches = items.filter(item => foldVoice(item.name) === foldVoice(canonical) || foldVoice(item.productName || '') === foldVoice(canonical));
  return matches.length === 1 ? matches[0] : undefined;
};

export function parseSafeGroceryVoiceV2(rawText: string, inputContext: SafeGroceryConversation = EMPTY_GROCERY_CONVERSATION, options: SafeGroceryParserOptions = {}): SafeGroceryParseResult {
  const now = options.now ?? Date.now();
  const scopeKey = options.scopeKey || 'lab';
  const rawNormalized = normalizeSafeVoiceText(rawText);
  const rawFolded = foldVoice(rawNormalized);
  const text = normalizeSafeVoiceText(rawText, options.aliases);
  const t = foldVoice(text);
  const baseResult = (status: SafeGroceryStatus, explanation: string, overrides: Partial<SafeGroceryParseResult> = {}): SafeGroceryParseResult => ({
    domain: 'courses', status, intent: 'none', confidence: 0, confidenceKind: 'heuristic', normalizedText: text,
    items: [], missingFields: [], clarification: null, requiresConfirmation: false, explanation,
    nextContext: emptyContext(), learnableProducts: [], ...overrides
  });
  if (!text || text.length > 500) return baseResult('rejected', 'La transcription est vide ou trop longue.', { domain: 'unknown' });
  if (options.isFinal === false) return baseResult('ignored', 'Transcription intermédiaire ignorée.', { nextContext: structuredClone(inputContext) });

  // Routing precedes aliases, pending questions and corrections on every final turn.
  for (const candidate of [rawNormalized, text]) {
    const domain = detectProtectedVoiceDomain(candidate);
    if (domain !== 'courses' && domain !== 'unknown') return baseResult('out_of_scope', `La phrase reste réservée au module ${domain === 'budget' ? 'Budget' : domain}. Le dialogue Courses est fermé.`, { domain });
  }

  const stale = Boolean(inputContext.scopeKey && (inputContext.scopeKey !== scopeKey || !inputContext.expiresAt || now >= inputContext.expiresAt));
  const context = stale ? emptyContext() : structuredClone(inputContext);
  const seen = context.seenUtteranceIds || [];
  if (options.utteranceId && seen.includes(options.utteranceId)) return baseResult('ignored', 'Cette transcription finale a déjà été traitée.', { nextContext: context });
  const baseList = cloneItems(context.baseList ?? options.list ?? []);
  const current = cloneItems(context.hasProposal ? context.proposal : baseList);
  const nextSeen = options.utteranceId ? [...seen, options.utteranceId].slice(-100) : [...seen];
  const session = (overrides: Partial<SafeGroceryConversation> = {}): SafeGroceryConversation => ({
    ...context, scopeKey, baseList, expiresAt: context.expiresAt ?? now + GROCERY_DIALOGUE_TTL_MS,
    seenUtteranceIds: nextSeen, ...overrides
  });
  const clarify = (question: string, field: string, pending?: SafeGroceryPending): SafeGroceryParseResult => baseResult('needs_clarification', question, {
    confidence: 0.25, clarification: question, missingFields: [field],
    intent: pending?.intent || 'none', nextContext: session({ pending: pending ?? { kind: 'correction', intent: 'shopping.add', expectedCategory: null, clarification: question } })
  });
  const propose = (change: Change, approvedUnknown = false): SafeGroceryParseResult => {
    const unknown = change.items.filter(item => item.source === 'unconfirmed').map(item => item.name);
    if (unknown.length && !approvedUnknown) {
      const question = `Confirmez-vous ces noms de produits : ${unknown.join(', ')} ?`;
      return clarify(question, 'nom du produit', { kind: 'unknown_product', intent: 'shopping.add', expectedCategory: null, clarification: question, change });
    }
    let list = cloneItems(current);
    const target = change.target ? resolveTarget(change.target, list) : undefined;
    if (change.kind === 'complete') {
      const targets = structuredClone(change.targets || []);
      if (change.selectionIndex !== undefined && change.target) targets[change.selectionIndex].name = change.target;
      const resolved: string[] = [];
      for (const [index, requested] of targets.entries()) {
        const matches = list.filter(item => foldVoice(item.name) === foldVoice(requested.name) || foldVoice(item.productName || '') === foldVoice(requested.name));
        const exact = matches.find(item => foldVoice(item.name) === foldVoice(requested.name));
        const item = exact || (matches.length === 1 ? matches[0] : undefined);
        if (!item) {
          const question = matches.length ? `Quel ${requested.name} : ${matches.map((entry, i) => `${i + 1}. ${entry.name}`).join(', ')} ?` : `${requested.name} n’est pas dans la liste. Aucun produit coché. Reformulez les produits achetés.`;
          return clarify(question, 'produit acheté', matches.length ? { kind: 'selection', intent: 'shopping.add', expectedCategory: null, clarification: question, choices: matches.map(entry => entry.name), change: { ...change, targets, selectionIndex: index, target: undefined } } : undefined);
        }
        if (requested.amount && (JSON.stringify(requested.amount) !== JSON.stringify(item.amount))) return clarify(`La liste contient ${item.quantity} de ${item.name}. Pour un achat partiel, ajustez d’abord la quantité ; rien n’est coché.`, 'quantité achetée');
        resolved.push(item.name);
      }
      if (!resolved.length) return clarify('Quels produits souhaitez-vous cocher ou décocher ?', 'produits');
      if (list.filter(item => resolved.includes(item.name)).every(item => Boolean(item.completed) === Boolean(change.completed))) return baseResult('ignored', 'Ces produits ont déjà cet état. Aucun changement.', { nextContext: session() });
      list = list.map(item => resolved.includes(item.name) ? { ...item, completed: change.completed } : item);
    }
    if (!['add', 'complete'].includes(change.kind) && !target) return clarify('Ce produit ne figure pas dans la liste en cours. Lequel souhaitez-vous modifier ?', 'produit ciblé');
    if (change.kind === 'remove' || change.kind === 'replace') list = list.filter(item => item !== target);
    if (change.kind === 'set' && target && change.amount) {
      const requested = change.inheritUnit ? { ...target.amount, value: change.amount.value } : change.amount;
      const amount = change.incremental ? addGroceryAmounts(target.amount, requested) : requested;
      if (!amount || !validAmount(amount)) return clarify('Les unités ou quantités ne sont pas compatibles. Quelle quantité totale souhaitez-vous ?', 'quantité et unité');
      list = list.map(item => item === target ? { ...item, amount, quantity: formatSafeAmount(amount) } : item);
    }
    if (change.kind === 'qualify' && target && change.qualifier) {
      const updated = qualifyGroceryItem(target, change.qualifier);
      if (!updated || list.some(item => item !== target && item.name === updated.name)) return clarify('Cette précision crée un doublon. Indiquez les produits et quantités souhaités.', 'produit ciblé');
      list = list.map(item => item === target ? updated : item);
    }
    if (change.kind === 'add' || change.kind === 'replace') {
      for (const item of change.items) {
        const existing = list.find(candidate => foldVoice(candidate.name) === foldVoice(item.name));
        if (existing) {
          if (existing.completed) return clarify(`${item.name} est déjà coché comme acheté. Décochez-le d’abord, puis précisez la nouvelle quantité à acheter.`, 'produit déjà acheté');
          const amount = addGroceryAmounts(existing.amount, item.amount);
          if (!amount) return clarify(`Les unités de ${item.name} diffèrent. Précisez la quantité totale et son unité.`, 'quantité et unité');
          list = list.map(candidate => candidate === existing ? { ...candidate, amount, quantity: formatSafeAmount(amount) } : candidate);
        } else list.push({ ...item, amount: { ...item.amount } });
      }
    }
    const proposalId = `${scopeKey}:${now}:${groceryListSignature(list)}`;
    return baseResult('proposed', 'Proposition mise à jour, en attente de confirmation.', {
      intent: intentFor(change), confidence: approvedUnknown ? 0.7 : 0.95, items: cloneItems(list), requiresConfirmation: true,
      nextContext: session({ pending: null, proposal: list, hasProposal: true, proposalId, selectedName: change.kind === 'qualify' && target && change.qualifier ? qualifyGroceryItem(target, change.qualifier)?.name : target?.name || (change.items.length === 1 ? change.items[0].name : undefined) })
    });
  };
  const confirm = (): SafeGroceryParseResult => {
    if (context.pending && context.pending.kind !== 'confirmation') return clarify(context.pending.clarification, 'précision attendue', context.pending);
    if (!context.hasProposal || !context.proposalId || !context.expiresAt) return clarify(stale ? 'Le dialogue a expiré ou le profil a changé. Reformulez la demande.' : 'Quels produits souhaitez-vous ajouter ?', 'produits');
    return baseResult('confirmed', 'Proposition confirmée. Aucune action réelle n’est exécutée.', {
      intent: 'shopping.confirm', confidence: 1, items: cloneItems(context.proposal),
      confirmedProposal: { id: context.proposalId, scopeKey, expiresAt: context.expiresAt, before: baseList, after: cloneItems(context.proposal), utteranceIds: nextSeen },
      learnableProducts: context.proposal.filter(item => item.source === 'unconfirmed').map(item => item.name)
    });
  };

  if ([rawFolded, t].some(value => CONDITIONAL.test(value))) return baseResult('rejected', 'Une condition ne déclenche pas un achat. Formulez une demande explicite.');
  const exclusionPattern = /^(?:ajoute|rajoute|achete|achète|acheter|prends)\s+(.+?)\s*,?\s+(?:mais pas|mais sans|sauf)\s+(.+)$/;
  const exclusion = text.match(exclusionPattern);
  if (exclusion && exclusionPattern.test(rawNormalized)) {
    const additions = parseGroceryEntities(exclusion[1].replace(/,$/, ''), options.vocabulary);
    const exclusions = parseGroceryEntities(exclusion[2].replace(/\s+ni\s+/g, ' et '), options.vocabulary);
    if (additions.error || exclusions.error || exclusions.unknown.length) return clarify('Précisez les produits à ajouter et ceux à exclure de cette demande.', 'produits exclus');
    const items = additions.items.filter(item => !exclusions.items.some(excluded => foldVoice(excluded.name) === foldVoice(item.name) || foldVoice(excluded.name) === foldVoice(item.productName || '')));
    if (!items.length) return baseResult('cancelled', 'Tous les produits de cette demande sont exclus. La liste existante reste inchangée.');
    const result = propose({ kind: 'add', items });
    return { ...result, explanation: `${result.explanation} Exclus de cette demande : ${exclusions.items.map(item => item.name).join(', ')}. Aucun produit existant supprimé.` };
  }
  if ([rawFolded, t].some(value => CANCEL.test(value) || NEGATION.test(value))) return baseResult('cancelled', 'Aucun ajout : la demande est annulée ou nie un achat.', { intent: 'shopping.cancel', confidence: 1 });
  if (CONFIRM.test(rawFolded)) {
    if (context.pending?.kind === 'unknown_product' && context.pending.change) return propose(context.pending.change, true);
    return confirm();
  }

  if (/^(?:que reste(?:-t-il)?|quoi acheter|liste restante|courses restantes|combien reste|montre la liste)/.test(t)) return baseResult('proposed', 'Liste fournie au laboratoire, sans accès aux données du foyer.', { intent: 'shopping.summary', items: current, confidence: 0.95, nextContext: session() });

  const ordinal = t.match(/^(?:(?:le|la)\s+)?(premier|premiere|deuxieme|second|seconde|troisieme|[1-9])$/);
  if (ordinal) {
    const indices: Record<string, number> = { premier: 0, premiere: 0, deuxieme: 1, second: 1, seconde: 1, troisieme: 2 };
    const index = indices[ordinal[1]] ?? Number(ordinal[1]) - 1;
    const name = (context.pending?.choices || current.map(item => item.name))[index];
    if (!name) return clarify('Cette position ne correspond à aucun produit.', 'produit ciblé');
    if (context.pending?.kind === 'selection' && context.pending.change) return propose({ ...context.pending.change, target: name });
    context.selectedName = name;
    return clarify(`Que souhaitez-vous modifier pour ${name} ?`, 'modification');
  }

  if (context.pending?.kind === 'selection' && context.pending.change) {
    const target = resolveTarget(text, current);
    if (target && context.pending.choices?.includes(target.name)) return propose({ ...context.pending.change, target: target.name });
  }
  const qualifier = GROCERY_QUALIFIERS.find(value => t === foldVoice(value) || t.endsWith(` ${foldVoice(value)}`));
  const qualifierOnly = qualifier && (t === foldVoice(qualifier) || /^(?:prends?|mets?|je (?:le|les) veux|celui|ceux|celle|celles|les deux)\b/.test(t) || /[, :]\s*(?:prends?|mets?)\b/.test(t));
  if (qualifierOnly && qualifier) {
    const prefix = t.slice(0, -foldVoice(qualifier).length).trim();
    const command = prefix.match(/^(.*?)\s*(?:prends?|mets?)(?:[- ](?:le|la|les))?(?:\s+en)?$/);
    const name = command?.[1].replace(/[, :]$/g, '').trim() || '';
    const pronoun = /^(?:(?:celui|ceux|celle|celles)(?:-la)?|les deux|je (?:le|les) veux)(?: en)?$/;
    if (prefix && !command && !pronoun.test(prefix)) return clarify('Quel produit et quelle précision souhaitez-vous ?', 'produit ciblé');
    const named = name ? resolveTarget(name, current) : undefined;
    const selected = context.selectedName && current.find(item => item.name === context.selectedName);
    const plural = /^(?:ceux|celles|les deux)\b/.test(t);
    const target = named || (!name && !plural ? selected || (current.length === 1 ? current[0] : undefined) : undefined);
    const change: Change = { kind: 'qualify', items: [], target: target?.name, qualifier };
    if (!target) {
      const question = `Quel produit doit être ${qualifier} : ${current.map((item, index) => `${index + 1}. ${item.name}`).join(', ') || 'aucun produit en cours'} ?`;
      return clarify(question, 'produit ciblé', { kind: 'selection', intent: 'shopping.add', expectedCategory: null, clarification: question, choices: current.map(item => item.name), change });
    }
    return propose(change);
  }

  if (context.pending?.kind === 'planning_quantity' && context.pending.change) {
    const amount = readGroceryAmount(text);
    if (amount.explicit && !amount.rest && amount.valid && context.pending.change.items.length === 1) {
      const item = context.pending.change.items[0];
      return propose({ kind: 'add', items: [{ ...item, amount: amount.amount, quantity: formatSafeAmount(amount.amount) }] });
    }
  }

  const remove = t.match(/^(?:enleve|retire|supprime)\s+(.+)$/);
  const purchased = t.match(/^(j'ai achete|j ai achete|on a achete|nous avons achete|coche|decoche)\s+(.+)$/);
  if (purchased) {
    const payload = text.slice(text.length - purchased[2].length);
    const targets: NonNullable<Change['targets']> = [];
    for (const part of splitGrocerySegments(payload)) {
      const parsed = parseGroceryEntities(part, options.vocabulary);
      if (parsed.error || parsed.items.length !== 1) return clarify('Indiquez les produits achetés, sans prix ni autre action.', 'produits achetés');
      const requested = readGroceryAmount(part);
      targets.push({ name: parsed.items[0].name, amount: requested.explicit ? requested.amount : undefined });
    }
    return propose({ kind: 'complete', items: [], targets, completed: purchased[1] !== 'decoche' });
  }
  if (remove) return propose({ kind: 'remove', target: stripArticle(text.slice(text.length - remove[1].length)), items: [] });
  const replacement = text.match(/^remplace\s+(.+?)\s+par\s+(.+)$/);
  if (replacement) {
    const parsed = parseGroceryEntities(stripArticle(replacement[2]), options.vocabulary);
    if (parsed.error || parsed.items.length !== 1) return clarify(parsed.error || 'Indiquez un seul produit de remplacement.', 'produit de remplacement');
    return propose({ kind: 'replace', target: stripArticle(replacement[1]), items: parsed.items });
  }

  const quantity = t.match(/^(?:non\s+)?(?:finalement|plutot|mets?(?: a)?|ajoute encore|rajoute encore)\s+(.+)$/);
  if (quantity) {
    const payload = text.slice(text.length - quantity[1].length);
    const parsed = readGroceryAmount(payload);
    if (!parsed.explicit || (!parsed.valid && (parsed.unitExplicit || !Number.isFinite(parsed.amount.value) || parsed.amount.value <= 0 || parsed.amount.value > 10000))) return clarify('Indiquez une quantité positive et son unité.', 'quantité');
    const implicit = !parsed.rest || /^(?:en|de plus|encore)$/.test(parsed.rest);
    const selected = context.selectedName && current.find(item => item.name === context.selectedName);
    const target = implicit ? selected || (current.length === 1 ? current[0] : undefined) : resolveTarget(parsed.rest, current);
    const change: Change = { kind: 'set', target: target?.name, items: [], amount: parsed.amount, inheritUnit: !parsed.unitExplicit, incremental: /ajoute encore|rajoute encore/.test(t) };
    if (!target && implicit && current.length > 1) {
      const question = `Quel produit : ${current.map((item, index) => `${index + 1}. ${item.name}`).join(', ')} ?`;
      return clarify(question, 'produit ciblé', { kind: 'selection', intent: 'shopping.add', expectedCategory: null, clarification: question, choices: current.map(item => item.name), change });
    }
    return propose(change);
  }

  if (/\b(?:prevoir|prepare|organise|organiser)\b|\bpour\s+\d+\s+personnes?\b/.test(t)
      && /\b(?:boissons?|repas|nourriture|courses|de quoi manger|de quoi boire)\b/.test(t)) {
    const drinks = /boisson|boire/.test(t);
    const people = t.match(/pour\s+(\d+)\s+personnes?/);
    context.planning = { people: people ? Number(people[1]) : undefined, expectedCategory: drinks ? 'Boissons' : null };
    const question = drinks ? `Quelles boissons souhaitez-vous prévoir${people ? ` pour ${people[1]} personnes` : ''} ?` : 'Quels produits faut-il prévoir ?';
    return clarify(question, 'produits', { kind: 'products', intent: 'shopping.plan', expectedCategory: drinks ? 'Boissons' : null, clarification: question });
  }

  const shortage = shortageEntity(text);
  const addPrefix = t.match(/^(?:ajoute(?: aussi)?|rajoute(?: aussi)?|achete|acheter|il faut|et aussi)\s+/);
  if (addPrefix || shortage) context.pending = null;
  if (context.pending?.kind === 'unknown_product') return clarify(context.pending.clarification, 'confirmation du nom', context.pending);
  const payload = (shortage || (addPrefix ? text.slice(addPrefix[0].length) : text))
    .replace(addPrefix || shortage ? /\s+(?:(?:à|a|dans)\s+(?:la|ma|notre)\s+liste(?:\s+de courses)?|au panier)$/ : /$^/, '');
  const parsed = parseGroceryEntities(payload, options.vocabulary);
  const explicit = Boolean(shortage || addPrefix || readGroceryAmount(payload).explicit);
  if (parsed.error) return baseResult('rejected', parsed.error, { domain: detectProtectedVoiceDomain(text), nextContext: session() });
  if (context.pending?.kind === 'products' || context.pending?.kind === 'planning_quantity') {
    const expected = context.planning?.expectedCategory || context.pending.expectedCategory;
    if (expected && parsed.items.some(item => item.category !== expected)) return clarify(context.pending.clarification, 'produits attendus', context.pending);
    const segments = splitGrocerySegments(payload);
    if (segments.some(segment => !readGroceryAmount(segment.trim()).explicit)) {
      const question = `Quelle quantité${parsed.items.length === 1 ? ` de ${parsed.items[0].name}` : ' pour chaque produit'}${context.planning?.people ? ` pour ${context.planning.people} personnes` : ''} ?`;
      return clarify(question, 'quantités', { kind: 'planning_quantity', intent: 'shopping.plan', expectedCategory: expected, clarification: question, change: { kind: 'add', items: parsed.items } });
    }
    return propose({ kind: 'add', items: parsed.items });
  }
  if (!explicit && parsed.unknown.length) return baseResult('rejected', 'Aucune commande ni aucun produit connu.', { domain: 'unknown' });
  const result = propose({ kind: 'add', items: parsed.items });
  if (!explicit && result.status === 'proposed') {
    const question = `Faut-il ajouter ${parsed.items.map(item => item.name).join(', ')} à la liste ?`;
    return { ...result, status: 'needs_clarification', confidence: 0.55, clarification: question,
      missingFields: ['confirmation'], nextContext: { ...result.nextContext, pending: { kind: 'confirmation', intent: 'shopping.add', expectedCategory: null, clarification: question } } };
  }
  return result;
}

export function rememberConfirmedGroceryProducts(result: SafeGroceryParseResult, vocabulary: string[], consent: boolean): string[] {
  if (!consent || result.status !== 'confirmed' || !result.confirmedProposal) return [...vocabulary];
  return [...new Map([...vocabulary, ...result.learnableProducts].map(name => [foldVoice(name), name])).values()];
}

export function runGroceryShadowV2(rawText: string, context: SafeGroceryConversation = EMPTY_GROCERY_CONVERSATION, options: SafeGroceryParserOptions = {}) {
  const legacyItems = parseSmartNaturalSentence(rawText, options.memberName || 'Foyer').map(({ name, category, quantity }) => ({ name, category, quantity }));
  const safeResult = parseSafeGroceryVoiceV2(rawText, context, options);
  return { rawText, legacyItems, safeResult, diverged: JSON.stringify(legacyItems.map(item => [item.name, item.quantity])) !== JSON.stringify(safeResult.items.map(item => [item.name, item.quantity])) || safeResult.status !== 'proposed' };
}
