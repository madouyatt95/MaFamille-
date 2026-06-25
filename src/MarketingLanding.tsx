import { useState } from 'react';
import {
  Apple,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Download,
  Gamepad2,
  HeartHandshake,
  LockKeyhole,
  MessageCircle,
  Mic,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards
} from 'lucide-react';

const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || '';
const appUrl = '/app';

const pillars = [
  {
    icon: CalendarDays,
    title: 'Un foyer qui respire',
    text: 'Agenda, rappels, école, courses et documents restent au même endroit, sans multiplier les applis.'
  },
  {
    icon: PiggyBank,
    title: 'Le budget devient clair',
    text: 'Comptes, argent de poche, dépenses et abonnements prennent une forme lisible pour toute la famille.'
  },
  {
    icon: Gamepad2,
    title: 'Des moments à partager',
    text: 'Jeux familiaux, défis privés et rituels du soir transforment l’organisation en expérience vivante.'
  }
];

const premiumItems = [
  'Micro intelligent pour ouvrir les modules et piloter les actions',
  'Coffre-fort familial et packs de partage sécurisés',
  'Jeux privés, progression, packs et statistiques',
  'Organisation avancée du foyer et personnalisation'
];

const modules = [
  { label: 'Planning', value: 'Aujourd’hui', icon: CalendarDays, tone: 'text-[#6C5CFF]' },
  { label: 'Budget jour', value: '0 alerte', icon: WalletCards, tone: 'text-[#00D26A]' },
  { label: 'Messages', value: 'Famille', icon: MessageCircle, tone: 'text-[#8AB5FF]' },
  { label: 'Jeux', value: 'Soirée prête', icon: Gamepad2, tone: 'text-[#FFB020]' }
];

export function MarketingLanding() {
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-hidden bg-[#F7F8FC] text-[#101426]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/25 bg-white/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-3" aria-label="MyFamily+ accueil">
            <img src="/icon-192x192.png" alt="" className="h-10 w-10 rounded-2xl shadow-lg shadow-[#6C5CFF]/20" />
            <span className="text-lg font-black tracking-tight">MyFamily+</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-bold text-[#536073] md:flex">
            <a href="#modules" className="hover:text-[#101426]">Modules</a>
            <a href="#premium" className="hover:text-[#101426]">Premium</a>
            <a href="#telecharger" className="hover:text-[#101426]">Télécharger</a>
          </nav>
          <a
            href={appUrl}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#101426] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-xl shadow-[#101426]/15"
          >
            Ouvrir <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main>
        <section className="relative min-h-[92vh] pt-24">
          <div className="absolute inset-0">
            <img
              src="/landing-hero-family.jpg"
              alt=""
              className="h-full w-full object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,252,0.98)_0%,rgba(247,248,252,0.92)_32%,rgba(247,248,252,0.54)_62%,rgba(247,248,252,0.22)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,248,252,0.90)_0%,rgba(247,248,252,0.34)_45%,rgba(247,248,252,0.94)_100%)]" />
          </div>
          <div className="relative mx-auto grid min-h-[calc(92vh-6rem)] max-w-6xl items-center gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6C5CFF]/18 bg-white/82 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#5B4EFA] shadow-lg shadow-[#6C5CFF]/8">
                <Sparkles className="h-4 w-4" />
                L’application familiale tout-en-un
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-normal text-[#101426] sm:text-6xl lg:text-7xl">
                MyFamily+
              </h1>
              <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-[#536073] sm:text-xl">
                Le cockpit doux et puissant pour organiser le foyer, suivre le budget, protéger les documents et créer des moments en famille.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={appUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#6C5CFF] px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-2xl shadow-[#6C5CFF]/25"
                >
                  Essayer maintenant <ChevronRight className="h-5 w-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setInstallHelpOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#101426]/10 bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#101426] shadow-xl shadow-[#101426]/8"
                >
                  Installer la PWA <Download className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-[#536073]">
                {['Foyer', 'Budget', 'Agenda', 'Coffre-fort', 'Jeux', 'IA'].map(item => (
                  <span key={item} className="rounded-full border border-[#101426]/8 bg-white/78 px-3 py-2">{item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[430px]">
              <div className="absolute -left-8 top-12 hidden rounded-3xl border border-white/70 bg-white/85 p-4 shadow-2xl shadow-[#6C5CFF]/16 backdrop-blur-xl sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00D26A]/12 text-[#00A957]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <strong className="block text-sm">Foyer à jour</strong>
                    <span className="text-xs font-semibold text-[#667085]">Rien ne bloque la journée</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-6 bottom-20 hidden rounded-3xl border border-white/70 bg-white/88 p-4 shadow-2xl shadow-[#FFB020]/18 backdrop-blur-xl sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFB020]/14 text-[#B7791F]">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <strong className="block text-sm">Premium</strong>
                    <span className="text-xs font-semibold text-[#667085]">Micro, jeux, coffre-fort</span>
                  </div>
                </div>
              </div>

              <div className="relative rounded-[42px] border border-[#101426]/10 bg-[#101426] p-3 shadow-[0_38px_90px_rgba(16,20,38,0.28)]">
                <div className="overflow-hidden rounded-[32px] bg-[#08111F] text-white">
                  <div className="relative p-5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(108,92,255,0.42),transparent_34%),radial-gradient(circle_at_90%_14%,rgba(255,176,32,0.18),transparent_26%)]" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white/55">Bonjour</span>
                        <h2 className="text-2xl font-black">Famille Yatta</h2>
                      </div>
                      <img src="/icon-192x192.png" alt="" className="h-11 w-11 rounded-2xl" />
                    </div>
                    <div className="relative mt-5 rounded-3xl border border-white/8 bg-white/7 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black">Vue famille</h3>
                          <p className="text-xs font-semibold text-white/50">Ce qui mérite attention.</p>
                        </div>
                        <Mic className="h-5 w-5 text-[#FF4D6D]" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {modules.map(module => {
                          const Icon = module.icon;
                          return (
                            <div key={module.label} className="rounded-2xl border border-white/8 bg-[#0D1930] p-3">
                              <Icon className={`mb-3 h-5 w-5 ${module.tone}`} />
                              <span className="block text-[10px] font-black uppercase text-white/38">{module.label}</span>
                              <strong className="mt-1 block text-sm">{module.value}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="relative mt-4 rounded-3xl border border-[#00D26A]/18 bg-[#00D26A]/10 p-4">
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-[#00D26A]" />
                        <div>
                          <strong className="block text-sm">Journée prête</strong>
                          <span className="text-xs font-semibold text-white/50">Planning, courses et budget alignés.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Pourquoi ça change tout</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal text-[#101426] sm:text-5xl">Une seule maison pour toute la vie familiale.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {pillars.map(item => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-[28px] border border-[#101426]/8 bg-[#F7F8FC] p-6 shadow-xl shadow-[#101426]/5">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#6C5CFF] shadow-lg shadow-[#6C5CFF]/8">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-black">{item.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#667085]">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#101426] py-20 text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="text-sm font-black uppercase tracking-wide text-[#FFB020]">Une app qui vit avec vous</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Du matin pressé au soir tranquille.</h2>
              <p className="mt-5 text-base font-semibold leading-7 text-white/62">
                MyFamily+ rassemble les petites décisions du quotidien, les documents importants et les moments de lien dans une interface pensée pour les parents, les enfants et les ados.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Agenda partagé', 'Rappels, école, rendez-vous et routines.'],
                ['Coffre-fort familial', 'Documents, packs de partage et expiration de liens.'],
                ['Argent de poche', 'Soldes, mouvements et règles claires.'],
                ['Jeux en famille', 'Memory, Défi famille, Village Secret, Agent caché.'],
                ['Carte familiale', 'Lieux utiles, zones et favoris.'],
                ['Messagerie', 'Échanges internes et informations du foyer.']
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-white/8 bg-white/6 p-5">
                  <Star className="mb-4 h-5 w-5 text-[#FFB020]" />
                  <strong className="block text-lg">{title}</strong>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/55">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="premium" className="bg-[#F7F8FC] py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[34px] border border-[#101426]/8 bg-white p-6 shadow-2xl shadow-[#101426]/8 sm:p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FFB020]/12 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#9A650F]">
                <Crown className="h-4 w-4" />
                MyFamily+ Premium
              </div>
              <h2 className="text-4xl font-black tracking-normal">La version qui donne au foyer un vrai pilote automatique.</h2>
              <div className="mt-7 space-y-3">
                {premiumItems.map(item => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#F7F8FC] p-4">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#00A957]" />
                    <span className="text-sm font-bold leading-6 text-[#536073]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[30px] bg-[#6C5CFF] p-6 text-white shadow-2xl shadow-[#6C5CFF]/22">
                <Mic className="mb-5 h-8 w-8" />
                <strong className="block text-2xl font-black">Micro principal intelligent</strong>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/72">
                  Ouvrez rapidement les modules et gardez le contrôle vocal des courses, dépenses, voyages et routines.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[26px] bg-white p-5 shadow-xl shadow-[#101426]/6">
                  <LockKeyhole className="mb-4 h-6 w-6 text-[#101426]" />
                  <strong className="block">Privé</strong>
                  <span className="mt-2 block text-xs font-semibold leading-5 text-[#667085]">Données du foyer séparées et contrôlées.</span>
                </div>
                <div className="rounded-[26px] bg-white p-5 shadow-xl shadow-[#101426]/6">
                  <HeartHandshake className="mb-4 h-6 w-6 text-[#FF4D6D]" />
                  <strong className="block">Humain</strong>
                  <span className="mt-2 block text-xs font-semibold leading-5 text-[#667085]">Pensé pour être utilisé tous les jours.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="telecharger" className="bg-white py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <img src="/icon-512x512.png" alt="" className="mx-auto h-20 w-20 rounded-[24px] shadow-2xl shadow-[#6C5CFF]/18" />
            <h2 className="mt-6 text-4xl font-black tracking-normal sm:text-5xl">Prêt à inviter votre foyer ?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-[#667085]">
              Commencez dans le navigateur, installez la PWA sur le téléphone, puis passez à l’App Store dès la publication.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <a href={appUrl} className="flex items-center justify-center gap-2 rounded-2xl bg-[#101426] px-5 py-4 text-sm font-black uppercase text-white">
                Ouvrir l’app <ArrowRight className="h-5 w-5" />
              </a>
              <button type="button" onClick={() => setInstallHelpOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl border border-[#101426]/10 bg-[#F7F8FC] px-5 py-4 text-sm font-black uppercase text-[#101426]">
                Installer <Download className="h-5 w-5" />
              </button>
              {APP_STORE_URL ? (
                <a href={APP_STORE_URL} className="flex items-center justify-center gap-2 rounded-2xl border border-[#101426]/10 bg-[#F7F8FC] px-5 py-4 text-sm font-black uppercase text-[#101426]">
                  App Store <Apple className="h-5 w-5" />
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#101426]/10 bg-[#F7F8FC] px-5 py-4 text-sm font-black uppercase text-[#667085]">
                  App Store bientôt <Apple className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="mt-5 text-xs font-semibold text-[#8A94A6]">
              Sur iPhone ou Android : ouvrez l’app, puis utilisez le menu du navigateur pour l’ajouter à l’écran d’accueil.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#101426]/8 bg-[#F7F8FC] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm font-semibold text-[#667085] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© MyFamily+ 2026</span>
          <div className="flex flex-wrap gap-4">
            <a href="/legal/privacy.html" className="hover:text-[#101426]">Confidentialité</a>
            <a href="/legal/terms.html" className="hover:text-[#101426]">Conditions</a>
            <a href={appUrl} className="hover:text-[#101426]">Accès application</a>
          </div>
        </div>
      </footer>

      {installHelpOpen && (
        <div className="fixed inset-0 z-[80] flex items-end bg-[#101426]/55 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl shadow-[#101426]/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wide text-[#6C5CFF]">Installation PWA</span>
                <h3 className="mt-2 text-2xl font-black">Ajoutez MyFamily+ à l’écran d’accueil</h3>
              </div>
              <button
                type="button"
                onClick={() => setInstallHelpOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F2F4F8] text-xl font-black"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-[#536073]">
              <p><strong className="text-[#101426]">Sur iPhone :</strong> ouvrez l’app, touchez Partager, puis “Sur l’écran d’accueil”.</p>
              <p><strong className="text-[#101426]">Sur Android :</strong> ouvrez l’app, puis choisissez “Installer l’application” ou “Ajouter à l’écran d’accueil”.</p>
            </div>
            <a
              href={appUrl}
              className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#6C5CFF] px-5 py-4 text-sm font-black uppercase text-white"
            >
              Ouvrir l’app <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
