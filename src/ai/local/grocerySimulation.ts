import { formatSafeAmount, validAmount, validCustomName, type SafeGroceryItem } from './safeGroceryEntities.ts';
import { groceryListSignature, type SafeGroceryParseResult } from './safeGroceryParserV2.ts';

export type GrocerySimulation = {
  scopeKey: string;
  revision: number;
  list: SafeGroceryItem[];
  appliedProposalIds: string[];
  appliedUtteranceIds: string[];
  undo?: { before: SafeGroceryItem[]; revision: number; afterSignature: string };
};
export type SimulationPolicy = { scopeKey: string; canWrite: boolean };
export type SimulationOutcome = { status: 'applied' | 'blocked' | 'duplicate' | 'undone'; reason: string; state: GrocerySimulation };
export const createGrocerySimulation = (scopeKey: string): GrocerySimulation => ({ scopeKey, revision: 0, list: [], appliedProposalIds: [], appliedUtteranceIds: [] });

// This reducer only transforms a caller-owned sandbox. It is not backend authorization.
export function simulateGroceryCommit(state: GrocerySimulation, result: SafeGroceryParseResult, policy: SimulationPolicy, now = Date.now()): SimulationOutcome {
  const blocked = (reason: string): SimulationOutcome => ({ status: 'blocked', reason, state });
  const receipt = result.confirmedProposal;
  if (!policy.canWrite || policy.scopeKey !== state.scopeKey) return blocked('Ce profil ne peut pas modifier cette liste simulée.');
  if (result.status !== 'confirmed' || result.domain !== 'courses' || !receipt) return blocked('Une confirmation explicite est requise.');
  if (receipt.scopeKey !== state.scopeKey || now >= receipt.expiresAt) return blocked('La proposition a expiré ou appartient à un autre profil.');
  if (state.appliedProposalIds.includes(receipt.id) || receipt.utteranceIds.some(id => state.appliedUtteranceIds.includes(id))) return { status: 'duplicate', reason: 'Proposition déjà appliquée : aucun doublon.', state };
  if (groceryListSignature(state.list) !== groceryListSignature(receipt.before)) return blocked('La liste a changé. Relisez et confirmez une nouvelle proposition.');
  if (receipt.after.some(item => !validAmount(item.amount) || !validCustomName(item.name) || item.quantity !== formatSafeAmount(item.amount) || item.completed !== undefined && typeof item.completed !== 'boolean')) return blocked('La proposition contient une quantité ou un produit invalide.');
  if (new Set(receipt.after.map(item => item.name.toLowerCase())).size !== receipt.after.length) return blocked('La proposition contient des produits en doublon.');
  return { status: 'applied', reason: 'Modification appliquée uniquement dans la simulation.', state: {
    ...state, revision: state.revision + 1, list: structuredClone(receipt.after),
    appliedProposalIds: [...state.appliedProposalIds, receipt.id],
    appliedUtteranceIds: [...state.appliedUtteranceIds, ...receipt.utteranceIds],
    undo: { before: structuredClone(state.list), revision: state.revision + 1, afterSignature: groceryListSignature(receipt.after) }
  } };
}

export function undoGrocerySimulation(state: GrocerySimulation, policy: SimulationPolicy): SimulationOutcome {
  if (!policy.canWrite || policy.scopeKey !== state.scopeKey || !state.undo || state.undo.revision !== state.revision || state.undo.afterSignature !== groceryListSignature(state.list)) return { status: 'blocked', reason: 'Aucune modification annulable pour ce profil ou la liste a changé.', state };
  return { status: 'undone', reason: 'Dernière modification simulée annulée.', state: { ...state, list: structuredClone(state.undo.before), revision: state.revision + 1, undo: undefined } };
}
