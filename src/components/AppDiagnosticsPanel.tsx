import { useCallback, useEffect, useState } from 'react';
import { Activity, Bell, CheckCircle2, Cloud, Copy, RefreshCw, Share2, Wifi, WifiOff } from 'lucide-react';
import { getNativeSharedInboxHealth } from '../utils/nativeSharedInbox';
import {
  countPendingGameResults,
  countPendingTransactions,
  formatDiagnosticReport,
  type AppDiagnosticSnapshot
} from '../utils/appDiagnostics';

const readServiceWorkerState = async (): Promise<AppDiagnosticSnapshot['serviceWorker']> => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return 'absent';
  if (registration.waiting) return 'waiting';
  if (registration.installing) return 'installing';
  return registration.active ? 'active' : 'absent';
};

const readableDate = (value: string | null) => {
  if (!value) return 'Jamais sur cet appareil';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
};

export function AppDiagnosticsPanel({ isNativeApp }: { isNativeApp: boolean }) {
  const [snapshot, setSnapshot] = useState<AppDiagnosticSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async (requestSync = false) => {
    setRefreshing(true);
    if (requestSync) {
      window.dispatchEvent(new Event('online'));
      const registration = await navigator.serviceWorker?.getRegistration('/');
      await registration?.update().catch(() => undefined);
    }
    const nativeHealth = isNativeApp ? await getNativeSharedInboxHealth() : null;
    const context: AppDiagnosticSnapshot['context'] = isNativeApp
      ? 'ios'
      : window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
        ? 'pwa'
        : 'web';
    setSnapshot({
      generatedAt: new Date().toISOString(),
      context,
      online: navigator.onLine,
      notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
      serviceWorker: await readServiceWorkerState(),
      pendingTransactions: countPendingTransactions(localStorage),
      pendingGameResults: countPendingGameResults(localStorage),
      pendingQuickAction: Boolean(localStorage.getItem('mf_pending_system_quick_action')),
      lastCloudSyncAt: localStorage.getItem('mf_last_cloud_sync_at'),
      lastCloudSyncError: localStorage.getItem('mf_last_cloud_sync_error'),
      appVersion: localStorage.getItem('mf_app_version') || '1.2',
      shareExtension: nativeHealth ? (nativeHealth.appGroupReady ? 'ready' : 'unavailable') : isNativeApp ? 'unknown' : undefined
    });
    setRefreshing(false);
  }, [isNativeApp]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(false), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const copyReport = async () => {
    if (!snapshot) return;
    await navigator.clipboard.writeText(formatDiagnosticReport(snapshot));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const pendingCount = (snapshot?.pendingTransactions || 0) + (snapshot?.pendingGameResults || 0);
  const statusOk = Boolean(snapshot?.online && pendingCount === 0 && !snapshot.lastCloudSyncError);

  return (
    <section id="settings-diagnostics" className="app-surface scroll-mt-5 space-y-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-family-text"><Activity className="h-4 w-4 text-family-secondary" /> État de MyFamily+</h3>
          <p className="mt-2 text-xs font-medium leading-relaxed text-family-text-secondary">Vérifiez cet appareil sans envoyer de données personnelles.</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusOk ? 'bg-family-success/12 text-family-success' : 'bg-family-warning/12 text-family-warning'}`}>
          {statusOk ? 'Tout va bien' : 'À vérifier'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DiagnosticCell icon={snapshot?.online ? Wifi : WifiOff} label="Connexion" value={snapshot?.online ? 'En ligne' : 'Hors ligne'} good={snapshot?.online} />
        <DiagnosticCell icon={Cloud} label="Synchronisation" value={readableDate(snapshot?.lastCloudSyncAt || null)} good={!snapshot?.lastCloudSyncError} />
        <DiagnosticCell icon={Bell} label="Notifications" value={snapshot?.notificationPermission === 'granted' ? 'Autorisées' : snapshot?.notificationPermission || 'Lecture…'} good={snapshot?.notificationPermission === 'granted'} />
        <DiagnosticCell icon={RefreshCw} label="Mise à jour" value={snapshot?.serviceWorker === 'waiting' ? 'Prête à installer' : snapshot?.serviceWorker || 'Lecture…'} good={snapshot?.serviceWorker === 'active' || snapshot?.serviceWorker === 'unsupported'} />
        <DiagnosticCell icon={Activity} label="Actions en attente" value={`${pendingCount}`} good={pendingCount === 0} />
        {isNativeApp && <DiagnosticCell icon={Share2} label="Partage iOS" value={snapshot?.shareExtension === 'ready' ? 'Disponible' : 'À vérifier'} good={snapshot?.shareExtension === 'ready'} />}
      </div>

      {snapshot?.lastCloudSyncError && <p className="rounded-xl border border-family-danger/20 bg-family-danger/8 px-3 py-2.5 text-[10px] font-bold text-family-danger">{snapshot.lastCloudSyncError}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void refresh(true)} disabled={refreshing} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-family-primary px-3 text-[10px] font-black text-white disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Vérifier maintenant
        </button>
        <button type="button" onClick={() => void copyReport()} disabled={!snapshot} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-family-border bg-family-surface px-3 text-[10px] font-black text-family-text-secondary disabled:opacity-50">
          {copied ? <CheckCircle2 className="h-4 w-4 text-family-success" /> : <Copy className="h-4 w-4" />} {copied ? 'Copié' : 'Copier le diagnostic'}
        </button>
      </div>
    </section>
  );
}

function DiagnosticCell({ icon: Icon, label, value, good }: { icon: typeof Activity; label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-family-border bg-family-surface p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${good ? 'text-family-success' : 'text-family-warning'}`} />
        <span className="text-[9px] font-black uppercase tracking-wider text-family-text-secondary">{label}</span>
      </div>
      <strong className="mt-2 block line-clamp-2 text-[11px] leading-relaxed text-family-text">{value}</strong>
    </div>
  );
}
