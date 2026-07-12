import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

type UpdateReadyEvent = CustomEvent<{ registration?: ServiceWorkerRegistration }>;

export function PwaUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handleReady = (event: Event) => {
      const detail = (event as UpdateReadyEvent).detail;
      if (detail?.registration?.waiting) setRegistration(detail.registration);
    };
    window.addEventListener('myfamilyplus:pwa-update-ready', handleReady);
    void navigator.serviceWorker?.getRegistration('/')?.then(current => {
      if (current?.waiting) setRegistration(current);
    });
    return () => window.removeEventListener('myfamilyplus:pwa-update-ready', handleReady);
  }, []);

  if (!registration) return null;

  const installUpdate = () => {
    if (!registration.waiting) return;
    setUpdating(true);
    sessionStorage.setItem('mf_pwa_update_requested', 'true');
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <aside className="app-surface fixed bottom-[calc(92px+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[15000] mx-auto max-w-md rounded-2xl p-4 shadow-2xl" role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-family-primary/15 text-family-primary">
          {updating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block text-xs text-family-text">Nouvelle version disponible</strong>
          <span className="mt-1 block text-[10px] font-medium leading-relaxed text-family-text-secondary">Installez-la maintenant sans perdre votre travail en cours.</span>
        </div>
        <button type="button" onClick={() => setRegistration(null)} className="grid h-8 w-8 place-items-center rounded-lg text-family-text-secondary" aria-label="Plus tard"><X className="h-4 w-4" /></button>
      </div>
      <button type="button" onClick={installUpdate} disabled={updating} className="mt-3 min-h-11 w-full rounded-xl bg-family-primary px-4 text-xs font-black text-white disabled:opacity-60">
        {updating ? 'Mise à jour…' : 'Mettre à jour'}
      </button>
    </aside>
  );
}
