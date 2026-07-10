import React, { useEffect, useState } from 'react';
import {
  AppWindow,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  ClipboardCheck,
  Copy,
  Hand,
  Link2,
  MessageCircleMore,
  Mic,
  Nfc,
  PanelTop,
  ReceiptText,
  ScanLine,
  ShoppingCart,
  Smartphone
} from 'lucide-react';
import { quickActionLink } from '../utils/nativeSharedInbox';

export type QuickActionId = 'open-micro' | 'paid' | 'scan-receipt' | 'scan-homework' | 'add-grocery';
type ShortcutGuideTab = 'actions' | 'iphone' | 'nfc';

export const QUICK_ACTION_GUIDES = [
  {
    id: 'open-micro',
    label: 'Micro principal',
    description: 'Ouvre directement le micro principal, prêt à recevoir une commande familiale.',
    phrase: 'Ouvre le micro avec MyFamily+',
    icon: Mic,
    color: '#FF4D6D'
  },
  {
    id: 'paid',
    label: 'J’ai payé',
    description: 'Ouvre une dépense préremplie à vérifier avant son enregistrement.',
    phrase: 'J’ai payé avec MyFamily+',
    icon: CircleDollarSign,
    color: '#00D26A'
  },
  {
    id: 'scan-receipt',
    label: 'Scanner un ticket',
    description: 'Propose l’appareil photo, la photothèque ou un fichier, puis lit le ticket sur l’appareil.',
    phrase: 'Scanner un ticket avec MyFamily+',
    icon: ReceiptText,
    color: '#FFB020'
  },
  {
    id: 'scan-homework',
    label: 'Scanner un devoir',
    description: 'Importe un devoir et prépare son contenu après lecture locale.',
    phrase: 'Scanner un devoir avec MyFamily+',
    icon: BookOpenCheck,
    color: '#4F8CFF'
  },
  {
    id: 'add-grocery',
    label: 'Ajouter aux courses',
    description: 'Ouvre les courses avec le micro prêt à ajouter les produits dictés.',
    phrase: 'Ajouter aux courses avec MyFamily+',
    icon: ShoppingCart,
    color: '#9E94FF'
  }
] as const;

interface ShortcutCenterProps {
  isOpen: boolean;
  isNativeApp: boolean;
  onClose: () => void;
  onTestQuickAction?: (action: QuickActionId) => void;
}

const IPHONE_METHODS = [
  {
    title: 'Avec Siri',
    icon: MessageCircleMore,
    color: '#9E94FF',
    steps: [
      'Lancez MyFamily+ une première fois et connectez-vous.',
      'Dites l’une des phrases indiquées dans l’onglet Actions.',
      'Si Siri ne la reconnaît pas, ouvrez Raccourcis, puis Apps et MyFamily+ pour vérifier que les actions sont présentes.'
    ]
  },
  {
    title: 'Avec le bouton Action',
    icon: CircleDollarSign,
    color: '#00D26A',
    steps: [
      'Ouvrez Réglages, puis Bouton Action.',
      'Choisissez Raccourci, puis sélectionnez une action MyFamily+.',
      'Maintenez le bouton Action pour la lancer.'
    ]
  },
  {
    title: 'Avec Toucher le dos',
    icon: Hand,
    color: '#FFB020',
    steps: [
      'Ouvrez Réglages, Accessibilité, Toucher, puis Toucher le dos.',
      'Choisissez Toucher 2 fois ou Toucher 3 fois.',
      'Dans Raccourcis, sélectionnez l’action MyFamily+ souhaitée.'
    ]
  },
  {
    title: 'Depuis le centre de contrôle',
    icon: PanelTop,
    color: '#4F8CFF',
    steps: [
      'Ouvrez le centre de contrôle et maintenez un espace vide.',
      'Ajoutez la commande Raccourci.',
      'Associez-la à l’action MyFamily+ de votre choix.'
    ]
  },
  {
    title: 'Par appui long sur l’icône',
    icon: AppWindow,
    color: '#FF4D6D',
    steps: [
      'Revenez à l’écran d’accueil de l’iPhone.',
      'Maintenez l’icône MyFamily+.',
      'Choisissez Micro, Dépense, Ticket ou Devoir dans le menu.'
    ]
  }
] as const;

const NFC_STEPS = [
  'Ouvrez l’app Raccourcis, puis l’onglet Automatisation.',
  'Touchez +, Nouvelle automatisation, puis NFC.',
  'Scannez votre tag et donnez-lui un nom clair.',
  'Ajoutez l’action Ouvrir les URL, puis collez l’un des liens ci-dessous.',
  'Choisissez Exécuter immédiatement et désactivez la confirmation si iOS le propose.',
  'Approchez l’iPhone du tag pour tester l’ouverture.'
] as const;

export const ShortcutCenter: React.FC<ShortcutCenterProps> = ({
  isOpen,
  isNativeApp,
  onClose,
  onTestQuickAction
}) => {
  const [activeTab, setActiveTab] = useState<ShortcutGuideTab>('actions');
  const [expandedShortcut, setExpandedShortcut] = useState<QuickActionId>('open-micro');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyValue = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(key);
      window.setTimeout(() => setCopiedValue(null), 1800);
    } catch {
      setCopiedValue(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10020] overflow-y-auto bg-[#07111F] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Configurer les raccourcis MyFamily+"
    >
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07111F]/95 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Fermer le guide des raccourcis"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black text-white">Raccourcis MyFamily+</h2>
            <p className="truncate text-[11px] font-medium text-white/45">Choisissez une action, puis où la déclencher.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${isNativeApp ? 'bg-[#00D26A]/15 text-[#00D26A]' : 'bg-[#6C5CFF]/15 text-[#9E94FF]'}`}>
            {isNativeApp ? 'iPhone natif' : 'Web'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-4">
        <section className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.035] p-4">
          <div className="flex items-start gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isNativeApp ? 'bg-[#00D26A]/12 text-[#00D26A]' : 'bg-[#6C5CFF]/12 text-[#9E94FF]'}`}>
              {isNativeApp ? <Smartphone className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
            </span>
            <div>
              <strong className="block text-sm text-white">{isNativeApp ? 'Application iPhone détectée' : 'Version web détectée'}</strong>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/50">
                {isNativeApp
                  ? 'Les actions natives peuvent apparaître dans Siri et l’app Raccourcis après le premier lancement de cette version.'
                  : 'Siri et l’appui long natif nécessitent l’application iPhone. Les liens restent utilisables avec Raccourcis et les tags NFC.'}
              </p>
            </div>
          </div>
        </section>

        <nav className="grid grid-cols-3 gap-1 rounded-2xl border border-white/8 bg-white/[0.035] p-1" aria-label="Sections des raccourcis">
          {([
            ['actions', 'Actions', ScanLine],
            ['iphone', 'Sur iPhone', Smartphone],
            ['nfc', 'Tags NFC', Nfc]
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-[10px] font-black transition ${activeTab === id ? 'bg-[#6C5CFF] text-white shadow-lg' : 'text-white/45 hover:text-white/75'}`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'actions' && (
          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-white">Les actions disponibles</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">Touchez une action pour voir sa phrase Siri, la tester ou copier son lien direct.</p>
            </div>

            {QUICK_ACTION_GUIDES.map((shortcut) => {
              const Icon = shortcut.icon;
              const isExpanded = expandedShortcut === shortcut.id;
              return (
                <article key={shortcut.id} className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.035]">
                  <button
                    type="button"
                    onClick={() => setExpandedShortcut(shortcut.id)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border" style={{ color: shortcut.color, borderColor: `${shortcut.color}38`, backgroundColor: `${shortcut.color}17` }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-white">{shortcut.label}</strong>
                      <small className="mt-1 block text-[10px] leading-relaxed text-white/45">{shortcut.description}</small>
                    </span>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-white/30 transition ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-white/7 px-4 pb-4 pt-3">
                      <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 p-3">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#9E94FF]">
                          <MessageCircleMore className="h-3.5 w-3.5" /> Phrase Siri
                        </span>
                        <div className="mt-2 flex items-center gap-2">
                          <strong className="min-w-0 flex-1 text-[11px] leading-relaxed text-white">« {shortcut.phrase} »</strong>
                          <button
                            type="button"
                            onClick={() => void copyValue(shortcut.phrase, `phrase-${shortcut.id}`)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/5 text-white/60"
                            aria-label={`Copier la phrase ${shortcut.label}`}
                          >
                            {copiedValue === `phrase-${shortcut.id}` ? <CheckCircle2 className="h-4 w-4 text-[#00D26A]" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        {!isNativeApp && <p className="mt-2 text-[9px] leading-relaxed text-white/40">Cette phrase nécessite l’application iPhone. Sur la version web, utilisez le lien direct.</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onTestQuickAction?.(shortcut.id)}
                          disabled={!onTestQuickAction}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6C5CFF] px-3 text-[10px] font-black text-white transition active:scale-[0.98] disabled:opacity-40"
                        >
                          <ClipboardCheck className="h-4 w-4" /> Tester maintenant
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyValue(quickActionLink(shortcut.id), `link-${shortcut.id}`)}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[10px] font-black text-white/70 transition hover:text-white"
                        >
                          {copiedValue === `link-${shortcut.id}` ? <CheckCircle2 className="h-4 w-4 text-[#00D26A]" /> : <Link2 className="h-4 w-4" />}
                          {copiedValue === `link-${shortcut.id}` ? 'Lien copié' : 'Copier le lien'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {activeTab === 'iphone' && (
          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-white">Choisir où lancer l’action</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">Commencez par ouvrir l’application une fois après chaque nouvelle installation.</p>
            </div>

            {IPHONE_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <details key={method.title} className="group overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.035]">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ color: method.color, backgroundColor: `${method.color}16` }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <strong className="min-w-0 flex-1 text-xs text-white">{method.title}</strong>
                    <ChevronRight className="h-4 w-4 text-white/30 transition group-open:rotate-90" />
                  </summary>
                  <ol className="space-y-3 border-t border-white/7 px-4 pb-4 pt-3">
                    {method.steps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-[11px] font-medium leading-relaxed text-white/55">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/7 text-[9px] font-black text-white/70">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              );
            })}

            {!isNativeApp && (
              <div className="flex gap-3 rounded-[22px] border border-[#FFB020]/20 bg-[#FFB020]/8 p-4">
                <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB020]" />
                <p className="text-[11px] font-medium leading-relaxed text-white/55">Sur la version web installée, iOS peut ouvrir le navigateur par défaut au lieu de MyFamily+. Pour Siri, l’appui long et le bouton Action les plus fiables, utilisez l’application iPhone.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'nfc' && (
          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-white">Programmer un tag NFC</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">Un tag peut ouvrir instantanément une action depuis la cuisine, le portefeuille ou un bureau.</p>
            </div>

            <div className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
              <ol className="space-y-3">
                {NFC_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3 text-[11px] font-medium leading-relaxed text-white/60">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#6C5CFF]/15 text-[10px] font-black text-[#9E94FF]">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-2">
              {QUICK_ACTION_GUIDES.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <div key={shortcut.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ color: shortcut.color, backgroundColor: `${shortcut.color}16` }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-xs text-white">{shortcut.label}</strong>
                      <small className="mt-0.5 block truncate text-[9px] text-white/35">{quickActionLink(shortcut.id)}</small>
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyValue(quickActionLink(shortcut.id), `link-${shortcut.id}`)}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/5 text-white/55"
                      aria-label={`Copier le lien NFC ${shortcut.label}`}
                    >
                      {copiedValue === `link-${shortcut.id}` ? <CheckCircle2 className="h-4 w-4 text-[#00D26A]" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 rounded-[22px] border border-[#00D26A]/18 bg-[#00D26A]/7 p-4">
              <Nfc className="mt-0.5 h-5 w-5 shrink-0 text-[#00D26A]" />
              <p className="text-[11px] font-medium leading-relaxed text-white/55">Le tag contient uniquement un lien d’ouverture. Il ne contient ni compte, ni dépense, ni donnée familiale.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
