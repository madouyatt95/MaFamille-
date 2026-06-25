import { useState } from 'react';
import {
  Apple,
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Download,
  FileText,
  Gamepad2,
  HeartHandshake,
  House,
  LockKeyhole,
  MessageCircle,
  Mic,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
  WalletCards
} from 'lucide-react';

const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || '';
const appUrl = '/app';

const pillars = [
  {
    icon: CalendarDays,
    title: 'Les journées se posent',
    text: 'Planning, école, rappels, courses et moments importants se retrouvent dans un espace clair.'
  },
  {
    icon: PiggyBank,
    title: 'L’argent devient lisible',
    text: 'Budget, comptes, argent de poche et dépenses prennent une forme simple, sans tableau compliqué.'
  },
  {
    icon: Gamepad2,
    title: 'La famille se retrouve',
    text: 'Jeux, histoires du soir et petits rituels donnent envie d’ouvrir l’application ensemble.'
  }
];

const premiumItems = [
  'Assistant vocal pour agir vite sans chercher dans les menus',
  'Coffre-fort familial avec liens de partage maîtrisés',
  'Jeux privés, progression, packs et souvenirs de partie',
  'Personnalisation avancée pour chaque foyer'
];

const modules = [
  { label: 'Planning', value: 'Aujourd’hui', icon: CalendarDays, tone: 'text-[#6C5CFF]' },
  { label: 'Budget jour', value: '0 alerte', icon: WalletCards, tone: 'text-[#00D26A]' },
  { label: 'Messages', value: 'Famille', icon: MessageCircle, tone: 'text-[#8AB5FF]' },
  { label: 'Jeux', value: 'Soirée prête', icon: Gamepad2, tone: 'text-[#FFB020]' }
];

const highlights = [
  { value: '1', label: 'lieu pour le foyer' },
  { value: '24h', label: 'de repères quotidiens' },
  { value: 'Premium', label: 'pour aller plus loin' }
];

const experiences = [
  ['Matin', 'Planning, école, trajets et rappels importants.'],
  ['Journée', 'Courses, budget, messages et documents à portée de main.'],
  ['Soir', 'Jeux, histoires, souvenirs et moments à partager.'],
  ['Urgence', 'Informations utiles, contacts et documents protégés.']
];

const productPreviews = [
  {
    title: 'Accueil familial',
    icon: House,
    tone: 'from-[#6C5CFF] to-[#9E94FF]',
    lines: ['Vue famille', 'Planning du jour', 'Actions rapides']
  },
  {
    title: 'Budget clair',
    icon: WalletCards,
    tone: 'from-[#00A957] to-[#4EE38A]',
    lines: ['Comptes', 'Argent de poche', 'Dépenses']
  },
  {
    title: 'Coffre-fort',
    icon: LockKeyhole,
    tone: 'from-[#101426] to-[#3B455A]',
    lines: ['Documents', 'Partage maîtrisé', 'Liens temporaires']
  },
  {
    title: 'Jeux du foyer',
    icon: Gamepad2,
    tone: 'from-[#FF9F1C] to-[#FF4D6D]',
    lines: ['Village Secret', 'Défi famille', 'Agent caché']
  }
];

const startSteps = [
  ['Créez votre foyer', 'Un espace privé pour votre famille, prêt en quelques instants.'],
  ['Invitez les proches', 'Partagez un code ou un lien, chacun rejoint le bon foyer.'],
  ['Organisez ensemble', 'Planning, budget, documents, jeux et messages se mettent en place naturellement.']
];

const audiences = [
  ['Parents', 'Une vue claire de ce qui compte, sans courir après les informations.'],
  ['Ados', 'Un accès adapté pour participer, suivre et gagner en autonomie.'],
  ['Enfants', 'Des repères simples, des jeux et des routines faciles à comprendre.'],
  ['Familles élargies', 'Grands-parents, foyers recomposés ou proches aidants gardent le bon niveau d’accès.']
];

const freePlan = ['Accueil du foyer', 'Agenda et budget essentiels', 'Premiers jeux familiaux', 'Invitations au foyer'];
const paidPlan = ['Assistant vocal familial', 'Coffre-fort avancé', 'Jeux privés et progression', 'Personnalisation et statistiques'];

const trustItems = [
  ['Espace privé', 'Aucun fil public, aucune recherche de familles inconnues.'],
  ['Partage maîtrisé', 'Les documents se partagent volontairement, avec des accès limités.'],
  ['Contrôle du foyer', 'Rôles, membres et invitations restent sous la main du foyer.'],
  ['Suppression possible', 'Les données du compte peuvent être supprimées depuis l’application.']
];

const faqs = [
  ['Est-ce gratuit ?', 'Oui. Le foyer peut démarrer gratuitement, puis Premium débloque les fonctions avancées.'],
  ['Comment inviter ma famille ?', 'Vous partagez un code ou un lien d’invitation, et le membre rejoint directement le bon foyer.'],
  ['Puis-je l’ajouter sur téléphone ?', 'Oui. MyFamily+ peut être ajoutée à l’écran d’accueil sur iPhone et Android.'],
  ['Les enfants ont-ils un accès adapté ?', 'Oui. Les interfaces enfants et ados sont pensées pour afficher moins, mais mieux.'],
  ['Où sont mes documents ?', 'Ils restent liés à votre foyer et les partages se font uniquement quand vous les déclenchez.']
];

export function MarketingLanding() {
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-hidden bg-[#F7F8FC] text-[#101426]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/30 bg-white/78 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-3" aria-label="MyFamily+ accueil">
            <img src="/icon-192x192.png" alt="" className="h-10 w-10 rounded-2xl shadow-lg shadow-[#6C5CFF]/20" />
            <span className="text-lg font-black tracking-tight">MyFamily+</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-bold text-[#536073] md:flex">
            <a href="#modules" className="hover:text-[#101426]">Découvrir</a>
            <a href="#premium" className="hover:text-[#101426]">Premium</a>
            <a href="#telecharger" className="hover:text-[#101426]">Commencer</a>
          </nav>
          <a
            href={appUrl}
            className="inline-flex items-center gap-2 rounded-full bg-[#101426] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-xl shadow-[#101426]/15"
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
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6C5CFF]/18 bg-white/88 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#5B4EFA] shadow-lg shadow-[#6C5CFF]/8">
                <Sparkles className="h-4 w-4" />
                L’espace privé des familles organisées
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-normal text-[#101426] sm:text-6xl lg:text-7xl">
                MyFamily+
              </h1>
              <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-[#536073] sm:text-xl">
                Le foyer s’organise. La famille respire. MyFamily+ rassemble planning, budget, documents, messages et jeux dans une expérience pensée pour tous les âges.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={appUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6C5CFF] px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-2xl shadow-[#6C5CFF]/25 transition hover:-translate-y-0.5 hover:shadow-[#6C5CFF]/35"
                >
                  Découvrir l’application <ChevronRight className="h-5 w-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setInstallHelpOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#101426]/10 bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#101426] shadow-xl shadow-[#101426]/8 transition hover:-translate-y-0.5"
                >
                  Ajouter à mon téléphone <Download className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                {highlights.map(item => (
                  <div key={item.label} className="rounded-3xl border border-white/70 bg-white/82 p-4 shadow-xl shadow-[#101426]/6 backdrop-blur-xl">
                    <strong className="block text-xl font-black text-[#101426]">{item.value}</strong>
                    <span className="mt-1 block text-[11px] font-bold uppercase leading-4 text-[#667085]">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-[#536073]">
                {['Foyer', 'Budget', 'Agenda', 'Coffre-fort', 'Jeux', 'Assistant'].map(item => (
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
                <div className="absolute -inset-1 rounded-[46px] bg-[linear-gradient(135deg,rgba(108,92,255,0.28),rgba(255,176,32,0.18),rgba(0,210,106,0.16))] blur-xl" />
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
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div className="max-w-2xl">
                <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Pensé pour le quotidien</span>
                <h2 className="mt-3 text-4xl font-black tracking-normal text-[#101426] sm:text-5xl">Une seule maison numérique pour toute la vie familiale.</h2>
              </div>
              <p className="text-base font-semibold leading-7 text-[#667085]">
                MyFamily+ n’ajoute pas une couche de plus à votre organisation. Elle remet de l’ordre, rend les priorités visibles et garde les informations importantes là où toute la famille peut les retrouver.
              </p>
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

        <section className="bg-[#F7F8FC] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Aperçu produit</span>
                <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">On comprend l’app avant même de créer son compte.</h2>
              </div>
              <a href={appUrl} className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#6C5CFF]">
                Voir l’application <ChevronRight className="h-5 w-5" />
              </a>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {productPreviews.map(item => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="group overflow-hidden rounded-[30px] border border-[#101426]/8 bg-white shadow-xl shadow-[#101426]/6 transition hover:-translate-y-1 hover:shadow-2xl">
                    <div className={`bg-gradient-to-br ${item.tone} p-5 text-white`}>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 backdrop-blur">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-8 text-xl font-black">{item.title}</h3>
                    </div>
                    <div className="space-y-3 p-5">
                      {item.lines.map(line => (
                        <div key={line} className="flex items-center gap-3 rounded-2xl bg-[#F7F8FC] px-3 py-2 text-sm font-bold text-[#536073]">
                          <Check className="h-4 w-4 text-[#00A957]" />
                          {line}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Commencer</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Trois gestes, et le foyer prend forme.</h2>
              <p className="mt-5 text-base font-semibold leading-7 text-[#667085]">
                L’entrée dans MyFamily+ doit rester simple : on crée, on invite, puis chaque membre retrouve ce qui le concerne.
              </p>
            </div>
            <div className="space-y-4">
              {startSteps.map(([title, text], index) => (
                <div key={title} className="flex gap-4 rounded-[28px] border border-[#101426]/8 bg-[#F7F8FC] p-5 shadow-lg shadow-[#101426]/4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#101426] text-sm font-black text-white">{index + 1}</div>
                  <div>
                    <h3 className="text-lg font-black">{title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#667085]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#101426] py-20 text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="text-sm font-black uppercase tracking-wide text-[#FFB020]">Du matin au soir</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Du matin pressé au soir tranquille.</h2>
              <p className="mt-5 text-base font-semibold leading-7 text-white/62">
                MyFamily+ rassemble les petites décisions du quotidien, les documents importants et les moments de lien dans une interface pensée pour les parents, les enfants et les ados.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {experiences.map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-white/8 bg-white/6 p-5">
                  <Star className="mb-4 h-5 w-5 text-[#FFB020]" />
                  <strong className="block text-lg">{title}</strong>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/55">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Pour toute la famille</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Chaque membre a sa place, sans avoir la même interface.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {audiences.map(([title, text]) => (
                <article key={title} className="rounded-[28px] border border-[#101426]/8 bg-[#F7F8FC] p-6">
                  <UserRound className="mb-5 h-6 w-6 text-[#6C5CFF]" />
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#667085]">{text}</p>
                </article>
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
              <h2 className="text-4xl font-black tracking-normal">La version qui donne au foyer une longueur d’avance.</h2>
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
                <strong className="block text-2xl font-black">Assistant vocal familial</strong>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/72">
                  Ouvrez rapidement les espaces utiles et gardez le contrôle des courses, dépenses, voyages et routines.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[26px] bg-white p-5 shadow-xl shadow-[#101426]/6">
                  <LockKeyhole className="mb-4 h-6 w-6 text-[#101426]" />
                  <strong className="block">Protégé</strong>
                  <span className="mt-2 block text-xs font-semibold leading-5 text-[#667085]">Chaque foyer garde son espace, ses accès et ses documents.</span>
                </div>
                <div className="rounded-[26px] bg-white p-5 shadow-xl shadow-[#101426]/6">
                  <BadgeCheck className="mb-4 h-6 w-6 text-[#FF4D6D]" />
                  <strong className="block">Soigné</strong>
                  <span className="mt-2 block text-xs font-semibold leading-5 text-[#667085]">Des détails utiles, visibles, et pensés pour les vrais usages.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Gratuit ou Premium</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Démarrez simplement, débloquez le confort quand le foyer grandit.</h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[34px] border border-[#101426]/8 bg-[#F7F8FC] p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#101426]">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wide text-[#667085]">Inclus</span>
                    <h3 className="text-2xl font-black">Gratuit</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {freePlan.map(item => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#536073]">
                      <Check className="h-4 w-4 text-[#00A957]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[34px] bg-[#101426] p-6 text-white shadow-2xl shadow-[#101426]/18">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFB020]/16 text-[#FFB020]">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wide text-[#FFB020]">Pour aller plus loin</span>
                    <h3 className="text-2xl font-black">Premium</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {paidPlan.map(item => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/7 px-4 py-3 text-sm font-bold text-white/74">
                      <Check className="h-4 w-4 text-[#FFB020]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F7F8FC] py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Confiance</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Une application familiale doit rester calme, privée et maîtrisée.</h2>
              <p className="mt-5 text-base font-semibold leading-7 text-[#667085]">
                MyFamily+ évite les mécaniques de réseau social. Le foyer choisit qui entre, ce qui se partage et ce qui reste protégé.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {trustItems.map(([title, text]) => (
                <article key={title} className="rounded-[28px] border border-[#101426]/8 bg-white p-6 shadow-xl shadow-[#101426]/5">
                  <ShieldCheck className="mb-5 h-6 w-6 text-[#00A957]" />
                  <h3 className="text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#667085]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-[38px] bg-[#101426] text-white shadow-2xl shadow-[#101426]/18">
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
                <div>
                  <span className="text-sm font-black uppercase tracking-wide text-[#FFB020]">Signature</span>
                  <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Toute la vie de famille, enfin au même endroit.</h2>
                  <p className="mt-5 text-base font-semibold leading-7 text-white/62">
                    Un espace unique pour anticiper, partager, protéger et respirer un peu plus dans le quotidien.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    [Bell, 'À ne pas oublier'],
                    [FileText, 'Documents utiles'],
                    [BookOpen, 'Histoires du soir'],
                    [HeartHandshake, 'Moments ensemble']
                  ].map(([Icon, label]) => {
                    const DisplayIcon = Icon as typeof Bell;
                    return (
                      <div key={label as string} className="rounded-3xl border border-white/8 bg-white/7 p-5">
                        <DisplayIcon className="mb-4 h-6 w-6 text-[#FFB020]" />
                        <strong className="text-lg">{label as string}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F7F8FC] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center">
              <span className="text-sm font-black uppercase tracking-wide text-[#6C5CFF]">Questions fréquentes</span>
              <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Avant d’inviter toute la famille.</h2>
            </div>
            <div className="mt-10 space-y-3">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group rounded-[24px] border border-[#101426]/8 bg-white p-5 shadow-lg shadow-[#101426]/4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-black">
                    {question}
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#6C5CFF] transition group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#667085]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="telecharger" className="bg-white py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <img src="/icon-512x512.png" alt="" className="mx-auto h-20 w-20 rounded-[24px] shadow-2xl shadow-[#6C5CFF]/18" />
            <h2 className="mt-6 text-4xl font-black tracking-normal sm:text-5xl">Prêt à inviter votre foyer ?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-[#667085]">
              Commencez depuis votre navigateur, ajoutez MyFamily+ à l’écran d’accueil, puis retrouvez bientôt l’application sur l’App Store.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <a href={appUrl} className="flex items-center justify-center gap-2 rounded-full bg-[#101426] px-5 py-4 text-sm font-black uppercase text-white">
                Ouvrir MyFamily+ <ArrowRight className="h-5 w-5" />
              </a>
              <button type="button" onClick={() => setInstallHelpOpen(true)} className="flex items-center justify-center gap-2 rounded-full border border-[#101426]/10 bg-[#F7F8FC] px-5 py-4 text-sm font-black uppercase text-[#101426]">
                Ajouter au téléphone <Download className="h-5 w-5" />
              </button>
              {APP_STORE_URL ? (
                <a href={APP_STORE_URL} className="flex items-center justify-center gap-2 rounded-full border border-[#101426]/10 bg-[#F7F8FC] px-5 py-4 text-sm font-black uppercase text-[#101426]">
                  App Store <Apple className="h-5 w-5" />
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-full border border-[#101426]/10 bg-[#F7F8FC] px-5 py-4 text-sm font-black uppercase text-[#667085]">
                  App Store bientôt <Apple className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="mt-5 text-xs font-semibold text-[#8A94A6]">
              Sur iPhone ou Android, MyFamily+ peut vivre directement sur votre écran d’accueil.
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
                <span className="text-xs font-black uppercase tracking-wide text-[#6C5CFF]">Sur votre téléphone</span>
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
              <p><strong className="text-[#101426]">Sur iPhone :</strong> ouvrez MyFamily+, touchez Partager, puis “Sur l’écran d’accueil”.</p>
              <p><strong className="text-[#101426]">Sur Android :</strong> ouvrez MyFamily+, puis choisissez “Installer l’application” ou “Ajouter à l’écran d’accueil”.</p>
            </div>
            <a
              href={appUrl}
              className="mt-6 flex items-center justify-center gap-2 rounded-full bg-[#6C5CFF] px-5 py-4 text-sm font-black uppercase text-white"
            >
              Ouvrir MyFamily+ <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
