export type QuickActionId =
  | 'open-micro'
  | 'paid'
  | 'scan-receipt'
  | 'scan-homework'
  | 'add-grocery'
  | 'open-vault';

export type ScannerInputMode = 'camera' | 'library' | 'files';

export interface QuickActionPreferences {
  expense: {
    accountId: string;
    category: string;
    merchant: string;
  };
  scanner: {
    receipt: ScannerInputMode;
    homework: ScannerInputMode;
  };
  favorites: QuickActionId[];
}

export interface QuickActionHistoryEntry {
  id: string;
  action: QuickActionId;
  label: string;
  detail: string;
  createdAt: string;
  params?: Record<string, string | number | undefined>;
}

const PREFERENCES_KEY = 'mf_quick_action_preferences_v2';
const HISTORY_KEY = 'mf_quick_action_history_v1';

export const defaultQuickActionPreferences: QuickActionPreferences = {
  expense: {
    accountId: '',
    category: 'Divers',
    merchant: ''
  },
  scanner: {
    receipt: 'camera',
    homework: 'library'
  },
  favorites: ['open-micro', 'paid', 'scan-receipt', 'add-grocery']
};

const isScannerInputMode = (value: unknown): value is ScannerInputMode => (
  value === 'camera' || value === 'library' || value === 'files'
);

const isQuickActionId = (value: unknown): value is QuickActionId => (
  value === 'open-micro'
  || value === 'paid'
  || value === 'scan-receipt'
  || value === 'scan-homework'
  || value === 'add-grocery'
  || value === 'open-vault'
);

export const getQuickActionPreferences = (): QuickActionPreferences => {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultQuickActionPreferences;
    const parsed = JSON.parse(raw) as Partial<QuickActionPreferences>;
    return {
      expense: {
        accountId: typeof parsed.expense?.accountId === 'string' ? parsed.expense.accountId : '',
        category: typeof parsed.expense?.category === 'string' && parsed.expense.category ? parsed.expense.category : 'Divers',
        merchant: typeof parsed.expense?.merchant === 'string' ? parsed.expense.merchant : ''
      },
      scanner: {
        receipt: isScannerInputMode(parsed.scanner?.receipt) ? parsed.scanner.receipt : defaultQuickActionPreferences.scanner.receipt,
        homework: isScannerInputMode(parsed.scanner?.homework) ? parsed.scanner.homework : defaultQuickActionPreferences.scanner.homework
      },
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter(isQuickActionId).slice(0, 4)
        : defaultQuickActionPreferences.favorites
    };
  } catch {
    return defaultQuickActionPreferences;
  }
};

export const saveQuickActionPreferences = (next: QuickActionPreferences): void => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // Preferences remain optional when storage is unavailable.
  }
};

export const getQuickActionHistory = (): QuickActionHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickActionHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && isQuickActionId(entry.action)).slice(0, 12);
  } catch {
    return [];
  }
};

const saveQuickActionHistory = (entries: QuickActionHistoryEntry[]): void => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 12)));
  } catch {
    // The history is a local convenience only.
  }
};

export const recordQuickActionHistory = (entry: Omit<QuickActionHistoryEntry, 'id' | 'createdAt'>): QuickActionHistoryEntry => {
  const current = getQuickActionHistory();
  const latest = current[0];
  if (latest?.action === entry.action && Date.now() - new Date(latest.createdAt).getTime() < 1500) {
    return latest;
  }
  const next: QuickActionHistoryEntry = {
    ...entry,
    id: `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  };
  saveQuickActionHistory([next, ...current]);
  return next;
};

export const removeQuickActionHistory = (id: string): QuickActionHistoryEntry[] => {
  const next = getQuickActionHistory().filter((entry) => entry.id !== id);
  saveQuickActionHistory(next);
  return next;
};

export const clearQuickActionHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};
