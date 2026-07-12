import { Bell, CalendarDays, CheckCircle2, Gamepad2, Home, Mic, Settings, Wallet } from 'lucide-react';

const query = new URLSearchParams(window.location.search);
const role = query.get('role') || 'parent';
const theme = query.get('theme') || 'dark';

export function VisualAuditGallery() {
  document.documentElement.classList.toggle('theme-light', theme === 'light');
  document.documentElement.classList.toggle('theme-sepia', theme === 'sepia');
  document.body.classList.toggle('theme-light', theme === 'light');
  document.body.classList.toggle('theme-sepia', theme === 'sepia');

  return (
    <main className="min-h-screen bg-family-bg px-4 py-5 text-family-text">
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-family-primary text-lg font-black text-white">M+</span>
          <div className="min-w-0 flex-1"><h1 className="text-xl font-black">Contrôle visuel</h1><p className="text-xs text-family-text-secondary">{role} · {theme} · contenu long vérifié</p></div>
          <button className="grid h-11 w-11 place-items-center rounded-xl border border-family-border bg-family-surface" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
        </header>

        <section className="app-surface rounded-2xl p-5">
          <span className="text-[10px] font-black uppercase tracking-widest text-family-primary">Vue familiale</span>
          <h2 className="mt-2 text-lg font-black">Bonjour, une journée bien organisée commence ici</h2>
          <p className="mt-2 text-xs leading-relaxed text-family-text-secondary">Planning, budget, documents et jeux restent lisibles même avec une phrase volontairement plus longue.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric icon={CalendarDays} label="Aujourd’hui" value="3 événements" />
            <Metric icon={Wallet} label="Budget du jour" value="42,90 €" />
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-family-success/20 bg-family-success/10 p-3"><CheckCircle2 className="h-5 w-5 text-family-success" /><span className="text-xs font-bold">Tout est synchronisé sur cet appareil</span></div>
        </section>

        <section className="app-surface space-y-3 rounded-2xl p-5">
          <div><h2 className="text-sm font-black">Formulaire partagé</h2><p className="mt-1 text-[11px] text-family-text-secondary">Contrôle des champs, contrastes et textes secondaires.</p></div>
          <label className="block text-[10px] font-black uppercase text-family-text-secondary">Intitulé<input className="app-field mt-2 min-h-12 w-full rounded-xl px-3 text-xs" value="Courses familiales du week-end" readOnly /></label>
          <div className="grid grid-cols-2 gap-2"><button className="min-h-12 rounded-xl border border-family-border bg-family-surface text-xs font-black">Annuler</button><button className="min-h-12 rounded-xl bg-family-primary text-xs font-black text-white">Enregistrer</button></div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Feature icon={Gamepad2} title="Jeux en famille" text="Parties rapides et progression" color="#6C5CFF" />
          <Feature icon={Settings} title="Réglages" text="Confort et confidentialité" color="#00D26A" />
        </section>

        <nav className="app-surface sticky bottom-4 grid grid-cols-4 rounded-2xl p-2 shadow-2xl" aria-label="Navigation de contrôle">
          <NavIcon icon={Home} label="Accueil" active /><NavIcon icon={CalendarDays} label="Agenda" /><NavIcon icon={Mic} label="Micro" /><NavIcon icon={Settings} label="Plus" />
        </nav>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) {
  return <div className="rounded-xl border border-family-border bg-family-surface p-3"><Icon className="h-4 w-4 text-family-primary" /><span className="mt-2 block text-[9px] font-black uppercase text-family-text-secondary">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}

function Feature({ icon: Icon, title, text, color }: { icon: typeof Home; title: string; text: string; color: string }) {
  return <article className="app-surface rounded-2xl p-4"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color, backgroundColor: `${color}18` }}><Icon className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-black">{title}</h3><p className="mt-1 text-[10px] leading-relaxed text-family-text-secondary">{text}</p></article>;
}

function NavIcon({ icon: Icon, label, active = false }: { icon: typeof Home; label: string; active?: boolean }) {
  return <button className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black ${active ? 'bg-family-primary text-white' : 'text-family-text-secondary'}`}><Icon className="h-4 w-4" />{label}</button>;
}
