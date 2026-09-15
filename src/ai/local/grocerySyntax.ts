import { foldVoice, normalizeSafeVoiceText, parseGroceryEntities, readGroceryAmount, splitGrocerySegments, stripArticle, type SafeGroceryItem } from './safeGroceryEntities.ts';

// Only lossless rewrites are allowed here. Unsupported scope stays in the request.
export function grocerySyntax(raw: string, vocabulary: string[] = []) {
  let text = normalizeSafeVoiceText(raw)
    .replace(/^(?:est-ce que tu peux|peux-tu|peux tu|tu peux|pourrais-tu|pourrais tu)\s+(ajouter|retirer|supprimer|remplacer)\b/, (_, verb: string) => ({ ajouter: 'ajoute', retirer: 'retire', supprimer: 'supprime', remplacer: 'remplace' })[verb]!)
    .replace(/^j'aimerais ajouter\b/, 'ajoute');
  const suffix = text.match(/^(.+?)\s+(?:finalement|plutôt|plutot)$/);
  if (suffix && readGroceryAmount(suffix[1]).explicit) text = `finalement ${suffix[1]}`;
  // A comma-delimited amount belongs to the immediately preceding known product.
  const postfix = text.match(/^(?:(ajoute|rajoute)\s+)?(.+?),\s*(.+)$/);
  if (postfix) {
    const product = parseGroceryEntities(stripArticle(postfix[2]), vocabulary);
    const amount = readGroceryAmount(postfix[3]);
    if (!product.error && product.items.length === 1 && !product.unknown.length && !readGroceryAmount(postfix[2]).explicit && amount.explicit && amount.valid && !amount.rest) {
      text = `${postfix[1] || 'ajoute'} ${postfix[3]} de ${stripArticle(postfix[2])}`;
    }
  }
  const add = text.match(/^(ajoute|rajoute)\s+(.+)$/);
  if (add) {
    const parts = splitGrocerySegments(add[2]);
    const rewritten: string[] = [];
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const product = parseGroceryEntities(part, vocabulary);
      const following = parts[index + 1] && readGroceryAmount(parts[index + 1]);
      if (!product.error && !product.unknown.length && product.items.length === 1 && !readGroceryAmount(part).explicit && following && following.explicit && following.valid && !following.rest) {
        rewritten.push(`${parts[index + 1]} de ${stripArticle(part)}`); index++;
      } else rewritten.push(part);
    }
    if (rewritten.length !== parts.length) text = `${add[1]} ${rewritten.join(' et ')}`;
  }
  return text;
}

export function ellipticalJuiceChoices(raw: string, selected: SafeGroceryItem | undefined): string[] {
  if (!selected || !/^Jus (?:de |d')/.test(selected.productName || selected.name)) return [];
  const match = normalizeSafeVoiceText(raw).match(/^et\s+(.+?)\s+(pomme|orange)$/);
  if (!match) return [];
  const amount = readGroceryAmount(match[1]);
  if (!amount.explicit || !amount.valid || amount.rest || amount.unitExplicit) return [];
  const juice = match[2] === 'pomme' ? 'jus de pomme' : "jus d'orange";
  return [`ajoute ${match[1]} ${juice}`, `ajoute ${match[1]} ${match[2]}`];
}

export function groceryScopeQuestion(text: string): string | null {
  const t = foldVoice(text);
  const scope = t.match(/\bpour\s+(?!\d+\s+personnes?\b)(demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|maman|papa|[a-z]+)(?:\b|$)/);
  if (!scope) return null;
  return `J’ai entendu « pour ${scope[1]} ». Cet essai modifie la liste commune, sans date ni destinataire. Reformulez sans cette précision pour la liste commune, ou utilisez le module concerné.`;
}

export function groceryQuantityQuestion(choices: string[], vocabulary: string[] = []) {
  const parsed = choices.map(text => {
    const payload = grocerySyntax(text, vocabulary).replace(/^(?:ajoute|rajoute|achete)\s+/, '');
    const entities = parseGroceryEntities(payload, vocabulary);
    return !entities.error && !entities.unknown.length && entities.items.length === 1 ? entities.items[0] : null;
  });
  if (parsed.some(item => !item)) return null;
  const items = parsed as SafeGroceryItem[];
  if (!items.every(item => item.name === items[0].name) || new Set(items.map(item => item.quantity)).size < 2) return null;
  return `Pour ${items[0].name}, avez-vous dit ${items.map(item => item.quantity).join(' ou ')} ?`;
}

export function quantityChoice(reply: string, choices: string[], vocabulary: string[] = []): number {
  const amount = readGroceryAmount(reply);
  if (!amount.explicit || !amount.valid || amount.rest || !groceryQuantityQuestion(choices, vocabulary)) return -1;
  const matches = choices.flatMap((choice, index) => {
    const candidate = readGroceryAmount(grocerySyntax(choice, vocabulary).replace(/^(?:ajoute|rajoute|achete)\s+/, ''));
    return candidate.amount.value === amount.amount.value && (!amount.unitExplicit || JSON.stringify(candidate.amount) === JSON.stringify(amount.amount)) ? [index] : [];
  });
  return matches.length === 1 ? matches[0] : -1;
}
