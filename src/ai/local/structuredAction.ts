import type { LocalAiActionType } from './capabilityCatalog.ts';

export const LOCAL_AI_ACTION_TYPES: LocalAiActionType[] = [
  'shopping.add',
  'event.create',
  'task.create',
  'transaction.create',
  'trip.create',
  'reminder.create',
  'document.classify',
  'navigation.open',
  'none'
];

const ACTION_TYPES = new Set<string>(LOCAL_AI_ACTION_TYPES);

export type StructuredActionValidation = {
  validJson: boolean;
  validSchema: boolean;
  value: unknown;
  actionTypes: LocalAiActionType[];
  reason: string | null;
};

export function validateStructuredAction(text: string): StructuredActionValidation {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return { validJson: false, validSchema: false, value: null, actionTypes: [], reason: 'Aucun objet JSON trouvé.' };
  }

  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { validJson: false, validSchema: false, value: null, actionTypes: [], reason: 'JSON invalide.' };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { validJson: true, validSchema: false, value, actionTypes: [], reason: 'La racine doit être un objet.' };
  }

  const proposal = value as Record<string, unknown>;
  if (!Array.isArray(proposal.actions) || proposal.actions.length === 0) {
    return { validJson: true, validSchema: false, value, actionTypes: [], reason: 'La liste actions est vide ou absente.' };
  }
  if (proposal.clarification !== null && typeof proposal.clarification !== 'string') {
    return { validJson: true, validSchema: false, value, actionTypes: [], reason: 'clarification doit être un texte ou null.' };
  }

  const actionTypes: LocalAiActionType[] = [];
  for (const action of proposal.actions) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      return { validJson: true, validSchema: false, value, actionTypes, reason: 'Une action n’est pas un objet.' };
    }
    const candidate = action as Record<string, unknown>;
    if (typeof candidate.type !== 'string' || !ACTION_TYPES.has(candidate.type)) {
      return { validJson: true, validSchema: false, value, actionTypes, reason: 'Type d’action non autorisé.' };
    }
    actionTypes.push(candidate.type as LocalAiActionType);
    if (!candidate.payload || typeof candidate.payload !== 'object' || Array.isArray(candidate.payload)) {
      return { validJson: true, validSchema: false, value, actionTypes, reason: 'payload doit être un objet.' };
    }
    if (candidate.type !== 'none' && Object.keys(candidate.payload as Record<string, unknown>).length === 0) {
      return { validJson: true, validSchema: false, value, actionTypes, reason: 'payload ne peut pas être vide pour une action.' };
    }
    if (candidate.requiresConfirmation !== true) {
      return { validJson: true, validSchema: false, value, actionTypes, reason: 'La confirmation obligatoire est absente.' };
    }
  }

  return { validJson: true, validSchema: true, value, actionTypes, reason: null };
}
