import type { Abonnement, Account, Transaction } from '../types';

export type BudgetPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
export type AccountDelta = { accountId: string; delta: number };
export type ForecastEntry = {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  accountId?: string;
  source: 'subscription' | 'recurring';
};

const cents = (value: number): number => Math.round((Number(value) || 0) * 100) / 100;

export const budgetPeriodLabel = (period: BudgetPeriod): string => ({
  today: "aujourd'hui",
  yesterday: 'hier',
  week: 'cette semaine',
  month: 'ce mois',
  quarter: 'ce trimestre',
  year: 'cette année',
  all: 'toutes périodes',
  custom: 'sur la période'
}[period]);

export const transactionAccountEffect = (transaction?: Partial<Transaction> | null): number => {
  if (!transaction?.accountId) return 0;
  const amount = cents(Number(transaction.amount));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return transaction.type === 'income' ? amount : -amount;
};

export const accountDeltasForMutation = (
  previous?: Partial<Transaction> | null,
  next?: Partial<Transaction> | null
): AccountDelta[] => {
  const deltas = new Map<string, number>();
  if (previous?.accountId) {
    deltas.set(previous.accountId, cents((deltas.get(previous.accountId) || 0) - transactionAccountEffect(previous)));
  }
  if (next?.accountId) {
    deltas.set(next.accountId, cents((deltas.get(next.accountId) || 0) + transactionAccountEffect(next)));
  }
  return [...deltas.entries()]
    .map(([accountId, delta]) => ({ accountId, delta: cents(delta) }))
    .filter(item => Math.abs(item.delta) >= 0.005);
};

export const expectedAccountBalance = (account: Account, transactions: Transaction[]): number | null => {
  if (!Number.isFinite(account.initialBalance)) return null;
  return cents((account.initialBalance || 0) + transactions
    .filter(transaction => !transaction.isArchived && transaction.accountId === account.id)
    .reduce((sum, transaction) => sum + transactionAccountEffect(transaction), 0));
};

export const computeBudgetSummary = (
  transactions: Transaction[],
  accounts: Account[],
  savingsTotal: number
) => {
  const income = cents(transactions.filter(t => !t.isArchived && t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
  const expense = cents(transactions.filter(t => !t.isArchived && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
  const accountBalance = cents(accounts.reduce((sum, account) => sum + account.balance, 0));
  return {
    income,
    expense,
    netCashflow: cents(income - expense),
    accountBalance,
    availableBalance: accountBalance,
    savingsTotal: cents(savingsTotal)
  };
};

const normalizeScheduleKey = (title: string, amount: number): string => `${title
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()}|${cents(amount).toFixed(2)}`;

const addPeriod = (date: Date, period: string): Date => {
  const next = new Date(date);
  if (period === 'daily') next.setDate(next.getDate() + 1);
  else if (period === 'weekly') next.setDate(next.getDate() + 7);
  else if (period === 'quarterly') next.setMonth(next.getMonth() + 3);
  else if (period === 'semiannually') next.setMonth(next.getMonth() + 6);
  else if (period === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const validDate = (value?: string): Date | null => {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildUnifiedForecast = (
  abonnements: Abonnement[],
  transactions: Transaction[],
  suspendedIds: string[],
  horizonDays = 90,
  now = new Date()
): ForecastEntry[] => {
  const end = new Date(now);
  end.setDate(end.getDate() + horizonDays);
  const entries: ForecastEntry[] = [];
  const subscriptionKeys = new Set<string>();

  abonnements.filter(item => !suspendedIds.includes(item.id)).forEach(subscription => {
    subscriptionKeys.add(normalizeScheduleKey(subscription.name, subscription.amount));
    let occurrence = validDate(subscription.nextBillingDate) || new Date(now);
    let index = 0;
    while (occurrence <= end && index < 100) {
      if (occurrence >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        entries.push({
          id: `subscription-${subscription.id}-${index}`,
          title: subscription.name,
          amount: cents(subscription.amount),
          type: 'expense',
          date: occurrence.toISOString().slice(0, 10),
          source: 'subscription'
        });
      }
      occurrence = addPeriod(occurrence, subscription.period || 'monthly');
      index += 1;
    }
  });

  transactions.filter(transaction => transaction.recurrence && transaction.recurrence !== 'none').forEach(transaction => {
    if (transaction.type === 'expense' && subscriptionKeys.has(normalizeScheduleKey(transaction.title, transaction.amount))) return;
    let occurrence = validDate(transaction.nextOccurrence || transaction.date) || new Date(now);
    while (occurrence < now) occurrence = addPeriod(occurrence, transaction.recurrence || 'monthly');
    let index = 0;
    while (occurrence <= end && index < 100) {
      entries.push({
        id: `recurring-${transaction.id}-${index}`,
        title: transaction.title,
        amount: cents(transaction.amount),
        type: transaction.type === 'income' ? 'income' : 'expense',
        date: occurrence.toISOString().slice(0, 10),
        accountId: transaction.accountId,
        source: 'recurring'
      });
      occurrence = addPeriod(occurrence, transaction.recurrence || 'monthly');
      index += 1;
    }
  });

  return entries.sort((left, right) => left.date.localeCompare(right.date));
};

export const forecastBalanceAt = (
  startingBalance: number,
  entries: ForecastEntry[],
  horizonDays: number,
  now = new Date()
): number => {
  const end = new Date(now);
  end.setDate(end.getDate() + horizonDays);
  const endIso = end.toISOString().slice(0, 10);
  return cents(startingBalance + entries
    .filter(entry => entry.date <= endIso)
    .reduce((sum, entry) => sum + (entry.type === 'income' ? entry.amount : -entry.amount), 0));
};

export type BudgetDiagnostic = {
  id: string;
  level: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  transactionId?: string;
  accountId?: string;
};

export const diagnoseBudget = (
  accounts: Account[],
  transactions: Transaction[],
  abonnements: Abonnement[]
): BudgetDiagnostic[] => {
  const diagnostics: BudgetDiagnostic[] = [];
  const accountIds = new Set(accounts.map(account => account.id));
  const seen = new Map<string, Transaction>();

  transactions.filter(transaction => !transaction.isArchived).forEach(transaction => {
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
      diagnostics.push({ id: `invalid-${transaction.id}`, level: 'error', title: 'Montant incohérent', description: transaction.title, transactionId: transaction.id });
    }
    if (transaction.accountId && !accountIds.has(transaction.accountId)) {
      diagnostics.push({ id: `orphan-${transaction.id}`, level: 'warning', title: 'Compte introuvable', description: `${transaction.title} n’est plus rattachée à un compte existant.`, transactionId: transaction.id });
    }
    const key = `${transaction.date}|${normalizeScheduleKey(transaction.title, transaction.amount)}|${transaction.type}`;
    const duplicate = seen.get(key);
    if (duplicate) {
      diagnostics.push({ id: `duplicate-${transaction.id}`, level: 'warning', title: 'Doublon possible', description: `${transaction.title} apparaît plusieurs fois le ${transaction.date}.`, transactionId: transaction.id });
    } else seen.set(key, transaction);
  });

  accounts.forEach(account => {
    const expected = expectedAccountBalance(account, transactions);
    if (expected !== null && Math.abs(expected - account.balance) >= 0.01) {
      diagnostics.push({
        id: `balance-${account.id}`,
        level: 'error',
        title: 'Solde à rapprocher',
        description: `${account.name} présente un écart de ${cents(account.balance - expected).toFixed(2)}.`,
        accountId: account.id
      });
    }
  });

  const recurringExpenseKeys = new Set(transactions
    .filter(transaction => transaction.type === 'expense' && transaction.recurrence && transaction.recurrence !== 'none')
    .map(transaction => normalizeScheduleKey(transaction.title, transaction.amount)));
  abonnements.forEach(subscription => {
    if (recurringExpenseKeys.has(normalizeScheduleKey(subscription.name, subscription.amount))) {
      diagnostics.push({ id: `schedule-${subscription.id}`, level: 'warning', title: 'Échéance comptée deux fois', description: `${subscription.name} existe comme abonnement et comme opération récurrente.` });
    }
  });

  return diagnostics;
};

export const applyRollover = (limit: number, spent: number, mode: 'none' | 'full' | 'partial', percentage = 50): number => {
  const remaining = Math.max(0, cents(limit - spent));
  if (mode === 'none') return 0;
  if (mode === 'full') return remaining;
  return cents(remaining * Math.min(100, Math.max(0, percentage)) / 100);
};
