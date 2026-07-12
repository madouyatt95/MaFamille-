export type StorageReader = Pick<Storage, 'getItem' | 'key' | 'length'>;

export type AppDiagnosticSnapshot = {
  generatedAt: string;
  context: 'ios' | 'pwa' | 'web';
  online: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  serviceWorker: 'active' | 'waiting' | 'installing' | 'absent' | 'unsupported';
  pendingTransactions: number;
  pendingGameResults: number;
  pendingQuickAction: boolean;
  lastCloudSyncAt: string | null;
  lastCloudSyncError: string | null;
  appVersion: string;
  shareExtension?: 'ready' | 'unavailable' | 'unknown';
};

const arrayLength = (raw: string | null): number => {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

export const countPendingGameResults = (storage: StorageReader): number => {
  let total = 0;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith('mf_pending_family_game_results_')) total += arrayLength(storage.getItem(key));
  }
  return total;
};

export const countPendingTransactions = (storage: StorageReader): number => (
  arrayLength(storage.getItem('mf_pending_transaction_sync_v1'))
);

export const formatDiagnosticReport = (snapshot: AppDiagnosticSnapshot): string => [
  'MyFamily+ - Diagnostic local',
  `Date: ${snapshot.generatedAt}`,
  `Contexte: ${snapshot.context}`,
  `Réseau: ${snapshot.online ? 'connecté' : 'hors ligne'}`,
  `Notifications: ${snapshot.notificationPermission}`,
  `Mise à jour web: ${snapshot.serviceWorker}`,
  `Dépenses en attente: ${snapshot.pendingTransactions}`,
  `Résultats de jeux en attente: ${snapshot.pendingGameResults}`,
  `Action rapide en attente: ${snapshot.pendingQuickAction ? 'oui' : 'non'}`,
  `Dernière synchronisation: ${snapshot.lastCloudSyncAt || 'inconnue'}`,
  `Dernière erreur: ${snapshot.lastCloudSyncError || 'aucune'}`,
  `Version: ${snapshot.appVersion}`,
  snapshot.shareExtension ? `Partage iOS: ${snapshot.shareExtension}` : ''
].filter(Boolean).join('\n');
