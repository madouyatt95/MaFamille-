const STORAGE_KEY = 'mf_pending_transaction_sync_v1';

export type PendingTransactionSync = {
  id: string;
  foyerId: string;
  transaction: Record<string, unknown>;
  accountUpdate?: { id: string; balance: number };
  accountDelta?: { id: string; delta: number };
  queuedAt: string;
};

export const readPendingTransactionSync = (): PendingTransactionSync[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const queueTransactionSync = (item: PendingTransactionSync): void => {
  try {
    const current = readPendingTransactionSync().filter(entry => entry.id !== item.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, item].slice(-100)));
  } catch {
    // The transaction itself remains in the app's local transaction store.
  }
};

export const removePendingTransactionSync = (id: string): void => {
  try {
    const next = readPendingTransactionSync().filter(entry => entry.id !== id);
    if (next.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep the existing queue if storage cannot be updated.
  }
};
