import { createGrocerySimulation, simulateGroceryCommit, undoGrocerySimulation, type GrocerySimulation, type SimulationPolicy } from './grocerySimulation.ts';
import type { FamilyVoiceResult, LabExpense, LabUndoToken } from './familyVoiceDialogue.ts';
import { groceryListSignature } from './safeGroceryParserV2.ts';

export type FamilyVoiceSimulation = { groceries: GrocerySimulation; expenses: LabExpense[]; expenseUndo?: LabExpense[]; lastAction?: LabUndoToken };
export const createFamilySimulation = (scope: string): FamilyVoiceSimulation => ({ groceries: createGrocerySimulation(scope), expenses: [] });
const signature = (state: FamilyVoiceSimulation) => JSON.stringify([groceryListSignature(state.groceries.list), state.expenses]);
export const familyUndoToken = (state: FamilyVoiceSimulation) => state.lastAction && state.lastAction.signature === signature(state) && state.lastAction.revision === state.groceries.revision && state.groceries.undo ? structuredClone(state.lastAction) : undefined;

export function simulateFamilyCommit(state: FamilyVoiceSimulation, result: FamilyVoiceResult, policy: SimulationPolicy, now = Date.now()) {
  if (result.undoReceipt) {
    const { expiresAt, ...token } = result.undoReceipt;
    if (result.status !== 'confirmed' || expiresAt <= now || JSON.stringify(token) !== JSON.stringify(familyUndoToken(state))) return { state, status: 'blocked', reason: 'Annulation expirée ou modification plus récente.' };
    return undoFamilySimulation(state, policy);
  }
  const receipt = result.receipt;
  if (result.status !== 'confirmed' || !receipt || receipt.expenses.some(expense => !Number.isSafeInteger(expense.cents) || expense.cents <= 0 || expense.cents > 100000000 || expense.currency !== 'EUR' || !/^[a-z][a-z '-]{1,59}$/.test(expense.label))) {
    return { state, status: 'blocked', reason: 'Ensemble non confirmé ou dépense invalide.' };
  }
  const outcome = simulateGroceryCommit(state.groceries, { ...result.grocery, status: 'confirmed', domain: 'courses', confirmedProposal: receipt }, policy, now);
  if (outcome.status !== 'applied') return { ...outcome, state };
  const next: FamilyVoiceSimulation = { groceries: outcome.state, expenses: [...state.expenses, ...structuredClone(receipt.expenses)], expenseUndo: structuredClone(state.expenses) };
  const onlyAdd = !receipt.expenses.length && receipt.before.every(before => receipt.after.some(after => after.name === before.name && after.amount.unit === before.amount.unit && after.amount.packSize === before.amount.packSize && after.amount.value >= before.amount.value && Boolean(after.completed) === Boolean(before.completed))) && groceryListSignature(receipt.before) !== groceryListSignature(receipt.after);
  const changed = receipt.after.filter(after => !receipt.before.some(before => groceryListSignature([before]) === groceryListSignature([after])));
  const removed = receipt.before.filter(before => !receipt.after.some(after => after.name === before.name));
  const detail = [...changed.map(item => `${item.quantity} de ${item.name}${item.completed ? ' (acheté)' : ''}`), ...removed.map(item => `${item.name} supprimé`), ...receipt.expenses.map(item => `${(item.cents / 100).toFixed(2)} euros ${item.label}`)].join(', ');
  next.lastAction = { id: receipt.id, scopeKey: policy.scopeKey, revision: next.groceries.revision, signature: signature(next), label: `la modification de ${detail || 'la liste'}`, kind: onlyAdd ? 'add' : 'other' };
  return { status: 'applied', reason: 'Ensemble appliqué uniquement à la simulation.', state: next };
}

export function undoFamilySimulation(state: FamilyVoiceSimulation, policy: SimulationPolicy) {
  if (!familyUndoToken(state)) return { state, status: 'blocked', reason: 'Aucune action annulable ou la simulation a changé.' };
  const outcome = undoGrocerySimulation(state.groceries, policy);
  return outcome.status !== 'undone' ? { ...outcome, state } : { ...outcome, state: { groceries: outcome.state, expenses: state.expenseUndo || [], expenseUndo: undefined, lastAction: undefined } };
}
