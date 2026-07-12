import assert from 'node:assert/strict';
import test from 'node:test';
import { countPendingGameResults, countPendingTransactions, formatDiagnosticReport } from '../src/utils/appDiagnostics.ts';

class FakeStorage {
  private readonly values: Record<string, string>;
  constructor(values: Record<string, string>) { this.values = values; }
  get length() { return Object.keys(this.values).length; }
  key(index: number) { return Object.keys(this.values)[index] ?? null; }
  getItem(key: string) { return this.values[key] ?? null; }
}

test('le diagnostic compte uniquement les files reconnues', () => {
  const storage = new FakeStorage({
    mf_pending_transaction_sync_v1: JSON.stringify([{ id: '1' }, { id: '2' }]),
    mf_pending_family_game_results_a: JSON.stringify([{ id: '3' }]),
    mf_pending_family_game_results_b: JSON.stringify([{ id: '4' }, { id: '5' }]),
    unrelated: JSON.stringify([1, 2, 3, 4])
  });
  assert.equal(countPendingTransactions(storage), 2);
  assert.equal(countPendingGameResults(storage), 3);
});

test('le rapport ne contient que des informations techniques locales', () => {
  const report = formatDiagnosticReport({
    generatedAt: '2026-07-12T10:00:00.000Z', context: 'pwa', online: true,
    notificationPermission: 'granted', serviceWorker: 'active', pendingTransactions: 0,
    pendingGameResults: 0, pendingQuickAction: false, lastCloudSyncAt: null,
    lastCloudSyncError: null, appVersion: '1.2'
  });
  assert.match(report, /Contexte: pwa/);
  assert.match(report, /Dépenses en attente: 0/);
  assert.doesNotMatch(report, /email|foyer_id|token/i);
});
