import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  Crown,
  FileText,
  Gamepad2,
  LockKeyhole,
  MessageCircle,
  Mic,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards
} from 'lucide-react';

type DemoScreen = {
  title: string;
  subtitle: string;
  accent: string;
  icon: LucideIcon;
  content: 'home' | 'budget' | 'safe' | 'games' | 'invite' | 'premium';
};

const demoScreens: DemoScreen[] = [
  {
    title: 'Accueil famille',
    subtitle: 'La journée du foyer en un coup d’œil.',
    accent: '#6C5CFF',
    icon: CalendarDays,
    content: 'home'
  },
  {
    title: 'Budget familial',
    subtitle: 'Comptes, dépenses et argent de poche restent lisibles.',
    accent: '#00A957',
    icon: WalletCards,
    content: 'budget'
  },
  {
    title: 'Coffre-fort',
    subtitle: 'Documents et partages sensibles restent maîtrisés.',
    accent: '#111827',
    icon: LockKeyhole,
    content: 'safe'
  },
  {
    title: 'Jeux en famille',
    subtitle: 'Des moments prêts à lancer, seul foyer ou invités.',
    accent: '#FF9F1C',
    icon: Gamepad2,
    content: 'games'
  },
  {
    title: 'Invitation foyer',
    subtitle: 'Un proche rejoint le bon foyer sans confusion.',
    accent: '#FF4D6D',
    icon: Users,
    content: 'invite'
  },
  {
    title: 'Premium',
    subtitle: 'Le confort avancé pour les foyers qui veulent aller plus loin.',
    accent: '#6C5CFF',
    icon: Crown,
    content: 'premium'
  }
];

const familyMembers = ['Maman', 'Papa', 'Lina', 'Noah'];

function PhoneFrame({ screen }: { screen: DemoScreen }) {
  const Icon = screen.icon;

  return (
    <article className="mx-auto w-full max-w-[390px]">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-[#101426]">{screen.title}</h2>
        <p className="mt-1 text-sm font-semibold text-[#667085]">{screen.subtitle}</p>
      </div>
      <div className="overflow-hidden rounded-[42px] border border-[#101426]/10 bg-[#08111F] p-3 shadow-2xl shadow-[#101426]/20">
        <div className="min-h-[760px] overflow-hidden rounded-[32px] bg-[#07111F] text-white">
          <div className="relative p-5">
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background: `radial-gradient(circle at 18% 0%, ${screen.accent}66, transparent 32%), radial-gradient(circle at 96% 16%, rgba(255,176,32,0.22), transparent 28%)`
              }}
            />
            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
                <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8" aria-label="Retour">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${screen.accent}22`, color: screen.accent }}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <span className="text-xs font-black uppercase tracking-wide text-white/45">MyFamily+</span>
              <h1 className="mt-2 text-3xl font-black leading-tight">{screen.title}</h1>
              <p className="mt-2 max-w-[290px] text-sm font-semibold leading-6 text-white/58">{screen.subtitle}</p>
              <ScreenContent type={screen.content} accent={screen.accent} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ScreenContent({ type, accent }: { type: DemoScreen['content']; accent: string }) {
  if (type === 'home') {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-[28px] border border-white/8 bg-white/7 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black">Vue famille</h3>
              <p className="text-xs font-semibold text-white/42">Ce qui compte aujourd’hui.</p>
            </div>
            <Mic className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Planning', '3 temps forts'],
              ['À lire', '1 message'],
              ['Courses', '8 articles'],
              ['Budget', '0 alerte']
            ].map(([title, value]) => (
              <div key={title} className="rounded-2xl bg-[#0D1930] p-3">
                <span className="text-[10px] font-black uppercase text-white/34">{title}</span>
                <strong className="mt-2 block text-lg" style={{ color: title === 'Budget' ? '#00D26A' : '#FFFFFF' }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-[#00D26A]/18 bg-[#00D26A]/10 p-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-[#00D26A]" />
            <div>
              <strong className="block text-sm">Rien ne bloque la journée</strong>
              <span className="text-xs font-semibold text-white/48">Le foyer est à jour.</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {familyMembers.map(member => (
            <div key={member} className="rounded-2xl bg-white/7 p-3 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-black">{member.slice(0, 1)}</div>
              <span className="text-[10px] font-bold text-white/48">{member}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'budget') {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-[28px] bg-[#00D26A]/12 p-5">
          <span className="text-xs font-black uppercase tracking-wide text-[#00D26A]">Budget du mois</span>
          <strong className="mt-2 block text-4xl font-black">1 248 €</strong>
          <p className="mt-1 text-sm font-semibold text-white/55">Disponible après dépenses prévues.</p>
        </div>
        {[
          ['Courses', '82,40 €', '#FFB020'],
          ['Argent de poche', '12,00 €', '#8AB5FF'],
          ['Abonnement', '29,99 €', '#FF4D6D']
        ].map(([title, amount, color]) => (
          <div key={title} className="flex items-center justify-between rounded-3xl border border-white/8 bg-white/7 p-4">
            <div className="flex items-center gap-3">
              <PiggyBank className="h-5 w-5" style={{ color }} />
              <span className="font-bold">{title}</span>
            </div>
            <strong>{amount}</strong>
          </div>
        ))}
        <div className="rounded-[28px] border border-white/8 bg-[#0D1930] p-4">
          <span className="text-xs font-black uppercase text-white/36">À retenir</span>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/62">Les dépenses importantes sont visibles avant qu’elles ne surprennent le foyer.</p>
        </div>
      </div>
    );
  }

  if (type === 'safe') {
    return (
      <div className="mt-6 space-y-4">
        {[
          ['Carnet de santé', 'Partage expirant demain'],
          ['Assurance habitation', 'Protégé'],
          ['Passeports famille', 'Pack voyage']
        ].map(([title, status]) => (
          <div key={title} className="rounded-[28px] border border-white/8 bg-white/7 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <strong className="block">{title}</strong>
                <span className="text-xs font-semibold text-white/46">{status}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="rounded-[28px] bg-white p-4 text-[#101426]">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#00A957]" />
            <strong>Partage maîtrisé</strong>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#667085]">Le lien se ferme automatiquement à la date choisie.</p>
        </div>
      </div>
    );
  }

  if (type === 'games') {
    return (
      <div className="mt-6 space-y-4">
        <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-[#19172D] to-[#4A2142] p-5">
          <span className="rounded-full bg-[#FFB020]/18 px-3 py-1 text-xs font-black uppercase text-[#FFB020]">Vedette</span>
          <h3 className="mt-16 text-2xl font-black">Village Secret</h3>
          <p className="mt-2 text-sm font-semibold text-white/58">Rôles cachés, narration, votes et révélations.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['Défi famille', 'Memory', 'Agent caché', 'Mimes'].map(game => (
            <div key={game} className="rounded-2xl bg-white/7 p-4">
              <Gamepad2 className="mb-3 h-5 w-5 text-[#FFB020]" />
              <strong className="text-sm">{game}</strong>
            </div>
          ))}
        </div>
        <button className="w-full rounded-full bg-[#6C5CFF] py-4 text-sm font-black uppercase">Lancer une partie</button>
      </div>
    );
  }

  if (type === 'invite') {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-[30px] border border-white/8 bg-white/7 p-5">
          <span className="text-xs font-black uppercase tracking-wide text-white/42">Invitation</span>
          <div className="mt-4 rounded-3xl bg-white p-5 text-center text-[#101426]">
            <span className="text-xs font-black uppercase text-[#667085]">Code foyer</span>
            <strong className="mt-2 block text-4xl font-black tracking-widest">MFP-482</strong>
          </div>
        </div>
        {['Lien prêt à partager', 'Validation du foyer', 'Accès adapté au rôle'].map(item => (
          <div key={item} className="flex items-center gap-3 rounded-3xl bg-white/7 p-4">
            <Check className="h-5 w-5 text-[#00D26A]" />
            <span className="text-sm font-bold text-white/70">{item}</span>
          </div>
        ))}
        <div className="rounded-[28px] bg-[#FF4D6D]/12 p-4">
          <MessageCircle className="mb-3 h-5 w-5 text-[#FF4D6D]" />
          <p className="text-sm font-semibold leading-6 text-white/64">“Lina a rejoint le foyer Martin.”</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-[30px] bg-[#6C5CFF] p-5">
        <Crown className="mb-5 h-8 w-8 text-[#FFB020]" />
        <h3 className="text-2xl font-black">MyFamily+ Premium</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/70">Assistant vocal, coffre-fort avancé, jeux privés et personnalisation.</p>
      </div>
      {['Assistant vocal familial', 'Liens de partage temporaires', 'Progression et statistiques', 'Packs de jeux complets'].map(item => (
        <div key={item} className="flex items-center gap-3 rounded-3xl bg-white/7 p-4">
          <Sparkles className="h-5 w-5 text-[#FFB020]" />
          <span className="text-sm font-bold text-white/70">{item}</span>
        </div>
      ))}
      <button className="w-full rounded-full bg-white py-4 text-sm font-black uppercase text-[#101426]">Découvrir Premium</button>
    </div>
  );
}

export function MarketingDemoCapture() {
  return (
    <div className="min-h-screen bg-[#F7F8FC] px-4 py-10 text-[#101426] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Kit captures MyFamily+</span>
            <h1 className="mt-2 text-4xl font-black tracking-normal sm:text-5xl">Écrans démo officiels</h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[#667085]">
              Données fictives, aucun compte réel. Utilisez ces écrans pour les captures du site, de l’App Store et des supports de présentation.
            </p>
          </div>
          <a href="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#101426] px-5 py-3 text-sm font-black uppercase text-white">
            Retour vitrine <ArrowRight className="h-4 w-4" />
          </a>
        </header>
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {demoScreens.map(screen => (
            <PhoneFrame key={screen.title} screen={screen} />
          ))}
        </div>
      </div>
    </div>
  );
}
