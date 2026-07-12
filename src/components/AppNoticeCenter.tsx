import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type AppNotice = {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
};

const noticeTone = (message: string): AppNotice['tone'] => {
  const normalized = message.toLocaleLowerCase('fr-FR');
  if (/erreur|impossible|échou|echec|refus|insuffisant/.test(normalized)) return 'error';
  if (/succès|succes|bravo|validé|valide|ajouté|ajoute|enregistré|enregistre|copié|copie/.test(normalized)) return 'success';
  return 'info';
};

export function AppNoticeCenter() {
  const [queue, setQueue] = useState<AppNotice[]>([]);
  const current = queue[0] || null;

  useEffect(() => {
    const nativeAlert = window.alert.bind(window);
    window.alert = (value?: unknown) => {
      const message = String(value ?? '').trim();
      if (!message) return;
      setQueue(items => [...items, {
        id: globalThis.crypto?.randomUUID?.() || `notice-${Date.now()}`,
        message,
        tone: noticeTone(message)
      }]);
    };
    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  if (!current) return null;

  const Icon = current.tone === 'success' ? CheckCircle2 : current.tone === 'error' ? AlertCircle : Info;
  const color = current.tone === 'success' ? '#00D26A' : current.tone === 'error' ? '#FF4D6D' : '#6C5CFF';

  return (
    <div className="app-overlay fixed inset-0 z-[20000] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <section className="app-surface w-full max-w-sm rounded-2xl p-5 shadow-2xl" role="alertdialog" aria-modal="true" aria-label="Information MyFamily+">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ color, backgroundColor: `${color}18` }}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-family-text">MyFamily+</h2>
            <p className="mt-1 whitespace-pre-line text-xs font-semibold leading-relaxed text-family-text-secondary">{current.message}</p>
          </div>
          <button type="button" onClick={() => setQueue(items => items.slice(1))} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-family-border text-family-text-secondary" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button type="button" autoFocus onClick={() => setQueue(items => items.slice(1))} className="mt-5 min-h-12 w-full rounded-xl bg-family-primary px-4 text-xs font-black text-white">
          Continuer
        </button>
      </section>
    </div>
  );
}
