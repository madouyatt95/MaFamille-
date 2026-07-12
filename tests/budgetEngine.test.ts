import assert from 'node:assert/strict';
import test from 'node:test';
import type { Abonnement, Account, Transaction } from '../src/types.ts';
import {
  accountDeltasForMutation,
  applyRollover,
  buildUnifiedForecast,
  computeBudgetSummary,
  diagnoseBudget,
  expectedAccountBalance,
  forecastBalanceAt
} from '../src/utils/budgetEngine.ts';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1', amount: 20, type: 'expense', category: 'Autres', date: '2026-07-12', title: 'Test', ...overrides
});

test('mutation deltas reverse the previous effect and apply the next one', () => {
  assert.deepEqual(accountDeltasForMutation(
    transaction({ accountId: 'a', amount: 20 }),
    transaction({ accountId: 'b', amount: 30 })
  ), [{ accountId: 'a', delta: 20 }, { accountId: 'b', delta: -30 }]);
});

test('editing an amount on the same account only applies the difference', () => {
  assert.deepEqual(accountDeltasForMutation(
    transaction({ accountId: 'a', amount: 20 }),
    transaction({ accountId: 'a', amount: 25 })
  ), [{ accountId: 'a', delta: -5 }]);
});

test('summary does not subtract period expenses twice from account balances', () => {
  const summary = computeBudgetSummary([
    transaction({ amount: 50 }),
    transaction({ id: 'income', type: 'income', amount: 100 })
  ], [{ id: 'a', name: 'Compte', type: 'bank', balance: 450 }], 25);
  assert.equal(summary.accountBalance, 450);
  assert.equal(summary.availableBalance, 450);
  assert.equal(summary.netCashflow, 50);
});

test('expected account balance starts from the opening balance', () => {
  const account: Account = { id: 'a', name: 'Compte', type: 'bank', balance: 130, initialBalance: 100 };
  assert.equal(expectedAccountBalance(account, [
    transaction({ accountId: 'a', type: 'income', amount: 50 }),
    transaction({ id: 'expense', accountId: 'a', amount: 20 })
  ]), 130);
});

test('forecast merges duplicate subscription and recurring expense', () => {
  const subscriptions: Abonnement[] = [{ id: 'netflix', name: 'Netflix', amount: 15, period: 'monthly', nextBillingDate: '2026-07-15' }];
  const entries = buildUnifiedForecast(subscriptions, [
    transaction({ id: 'netflix-tx', title: 'Netflix', amount: 15, recurrence: 'monthly', date: '2026-07-15' })
  ], [], 40, new Date('2026-07-12T12:00:00'));
  assert.equal(entries.filter(entry => entry.date === '2026-07-15').length, 1);
  assert.equal(forecastBalanceAt(100, entries, 10, new Date('2026-07-12T12:00:00')), 85);
});

test('diagnostics find orphan transactions, duplicates and duplicate schedules', () => {
  const transactions = [
    transaction({ id: 'one', accountId: 'missing', title: 'Netflix', amount: 15, recurrence: 'monthly' }),
    transaction({ id: 'two', accountId: 'missing', title: 'Netflix', amount: 15 })
  ];
  const diagnostics = diagnoseBudget([], transactions, [{ id: 'sub', name: 'Netflix', amount: 15, period: 'monthly', nextBillingDate: '2026-07-15' }]);
  assert.ok(diagnostics.some(item => item.title === 'Compte introuvable'));
  assert.ok(diagnostics.some(item => item.title === 'Doublon possible'));
  assert.ok(diagnostics.some(item => item.title === 'Échéance comptée deux fois'));
});

test('rollover supports none, full and partial modes', () => {
  assert.equal(applyRollover(500, 400, 'none'), 0);
  assert.equal(applyRollover(500, 400, 'full'), 100);
  assert.equal(applyRollover(500, 400, 'partial', 25), 25);
});
