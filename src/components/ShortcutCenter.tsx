import React, { useEffect, useState } from 'react';
import {
  AppWindow,
  ArrowLeft,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileText,
  FolderLock,
  Hand,
  History,
  Image,
  Link2,
  ListChecks,
  MessageCircleMore,
  Nfc,
  PanelTop,
  Plus,
  ScanLine,
  ShoppingCart,
  Smartphone,
  Tag,
  Trash2,
  Wallet
} from 'lucide-react';
import { quickActionLink } from '../utils/nativeSharedInbox';
import { createNativeQrCode } from '../utils/nativeQr';
import type { Account } from '../types';
import { QUICK_ACTION_GUIDES } from '../constants/quickActionGuides';
import {
  clearQuickActionHistory,
  defaultQuickActionPreferences,
  getQuickActionHistory,
  getQuickActionPreferences,
  recordQuickActionHistory,
  removeQuickActionHistory,
  saveQuickActionPreferences,
  type QuickActionId,
  type QuickActionPreferences,
  type ScannerInputMode
} from '../utils/quickActionPreferences';

type ShortcutGuideTab = 'actions' | 'iphone' | 'nfc' | 'preferences';

interface ShortcutCenterProps {
  isOpen: boolean;
  isNativeApp: boolean;
  initialTab?: ShortcutGuideTab;
  focusWalletSetup?: boolean;
  accounts?: Account[];
  onClose: () => void;
  onTestQuickAction?: (action: QuickActionId, params?: Record<string, string | number | undefined>) => void;
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
    title: 'Après un paiement Apple Pay',
    icon: Wallet,
    color: '#00D26A',
    steps: [
      'Ouvrez Raccourcis, puis Automatisation et Nouvelle automatisation.',
      'Choisissez Transaction, sélectionnez la carte souhaitée et cochez Paiement.',
      'Ajoutez l’action MyFamily+ « Transaction Wallet vers Budget ».',
      'Associez ses champs Montant, Commerçant, Date et heure, Devise et Carte aux informations proposées par l’automatisation Transaction.',
      'Choisissez Exécuter immédiatement. Après un paiement, vérifiez le compte et la catégorie dans MyFamily+ avant de valider.'
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
  },
  {
    title: 'Avec le widget MyFamily+',
    icon: ListChecks,
    color: '#37C9FF',
    steps: [
      'Maintenez un espace vide sur l’écran d’accueil, puis touchez Ajouter un widget.',
      'Recherchez MyFamily+ et choisissez le format compact ou moyen.',
      'Sur l’écran verrouillé, ajoutez MyFamily+ depuis Personnaliser pour accéder directement au micro.'
    ]
  }
] as const;

const WALLET_WEB_STEPS = [
  'Ouvrez Raccourcis, puis Automatisation et Nouvelle automatisation.',
  'Choisissez Transaction, sélectionnez la carte souhaitée et cochez Paiement.',
  'Ajoutez l’action Ouvrir les URL avec https://myfamilyplus.fr/quick-expense.',
  'Ajoutez les variables de la transaction dans l’URL : ?amount=Montant&merchant=Commerçant&date=Date&currency=Devise.',
  'Choisissez Exécuter immédiatement. iOS ouvrira le navigateur, puis vous pourrez vérifier la dépense dans MyFamily+.'
] as const;

const NFC_STEPS = [
  'Ouvrez l’app Raccourcis, puis l’onglet Automatisation.',
  'Touchez +, Nouvelle automatisation, puis NFC.',
  'Scannez votre tag et donnez-lui un nom clair.',
  'Ajoutez l’action Ouvrir les URL, puis collez l’un des liens ci-dessous.',
  'Choisissez Exécuter immédiatement et désactivez la confirmation si iOS le propose.',
  'Approchez l’iPhone du tag pour tester l’ouverture.'
] as const;

const NFC_PROFILES_KEY = 'mf_nfc_profiles_v1';

interface NfcProfile {
  id: string;
  name: string;
  action: QuickActionId;
  createdAt: string;
}

const readNfcProfiles = (): NfcProfile[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(NFC_PROFILES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is NfcProfile => (
      typeof entry?.id === 'string'
      && typeof entry?.name === 'string'
      && QUICK_ACTION_GUIDES.some((guide) => guide.id === entry?.action)
    ));
  } catch {
    return [];
  }
};

const writeNfcProfiles = (profiles: NfcProfile[]): void => {
  try {
    localStorage.setItem(NFC_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // NFC links remain available even when private storage is unavailable.
  }
};

const shortcutSetupSteps = (action: QuickActionId, label: string, isNativeApp: boolean): string[] => {
  if (isNativeApp) return [
    'Ouvrez l’app Raccourcis, touchez +, puis Ajouter une action.',
    `Choisissez Apps, MyFamily+, puis « ${label} ».`,
    'Donnez un nom au raccourci. Vous pourrez ensuite l’utiliser avec Siri, le bouton Action ou Toucher le dos.'
  ];
  return [
    'Ouvrez l’app Raccourcis, touchez +, puis Ajouter une action.',
    `Ajoutez Ouvrir les URL et collez ${quickActionLink(action)}.`,
    `Nommez le raccourci « ${label} », puis lancez-le une première fois.`
  ];
};

const InstructionText: React.FC<{ text: string }> = ({ text }) => {
  const match = text.match(/https?:\/\/\S+|\?[^\s]+/);
  if (!match || match.index === undefined) return <span className="min-w-0">{text}</span>;

  const trailingPunctuation = match[0].match(/[.,;:]$/)?.[0] || '';
  const value = trailingPunctuation ? match[0].slice(0, -1) : match[0];
  const before = text.slice(0, match.index).trimEnd();
  const after = `${trailingPunctuation}${text.slice(match.index + match[0].length)}`.trim();

  return (
    <span className="min-w-0 flex-1">
      {before && <span className="block">{before}</span>}
      <code className="mt-1 block max-w-full break-all whitespace-normal rounded-lg border border-white/8 bg-black/10 px-2 py-1.5 text-[9px] font-semibold leading-relaxed text-white/70">
        {value}
      </code>
      {after && <span className="mt-1 block">{after}</span>}
    </span>
  );
};

export const ShortcutCenter: React.FC<ShortcutCenterProps> = ({
  isOpen,
  isNativeApp,
  initialTab = 'actions',
  focusWalletSetup = false,
  accounts = [],
  onClose,
  onTestQuickAction
}) => {
  const [activeTab, setActiveTab] = useState<ShortcutGuideTab>('actions');
  const [expandedShortcut, setExpandedShortcut] = useState<QuickActionId | null>('open-micro');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<QuickActionPreferences>(getQuickActionPreferences);
  const [history, setHistory] = useState(getQuickActionHistory);
  const [qrAction, setQrAction] = useState<QuickActionId | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [nfcProfiles, setNfcProfiles] = useState<NfcProfile[]>(readNfcProfiles);
  const [nfcProfileName, setNfcProfileName] = useState('');
  const [nfcProfileAction, setNfcProfileAction] = useState<QuickActionId>('open-micro');

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

  useEffect(() => {
    if (!isOpen) return;
    const refreshTimer = window.setTimeout(() => {
      setActiveTab(initialTab);
      setPreferences(getQuickActionPreferences());
      setHistory(getQuickActionHistory());
      setNfcProfiles(readNfcProfiles());
    }, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [initialTab, isOpen]);

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

  const updatePreferences = (updater: (current: QuickActionPreferences) => QuickActionPreferences) => {
    setPreferences((current) => {
      const next = updater(current);
      saveQuickActionPreferences(next);
      return next;
    });
  };

  const runAction = (action: QuickActionId, params?: Record<string, string | number | undefined>) => {
    const shortcut = QUICK_ACTION_GUIDES.find((item) => item.id === action);
    const entry = recordQuickActionHistory({
      action,
      label: shortcut?.label || 'Raccourci MyFamily+',
      detail: shortcut?.description || 'Action rapide lancée.',
      params
    });
    setHistory((current) => [entry, ...current].slice(0, 12));
    onTestQuickAction?.(action, params);
  };

  const openShortcutsApp = () => {
    window.location.href = 'shortcuts://';
  };

  const testWalletForm = () => {
    runAction('paid', {
      amount: 12.5,
      merchant: 'Commerce test',
      currency: 'EUR',
      source: 'apple-wallet',
      paymentMethod: 'Apple Pay'
    });
  };

  const clearHistory = () => {
    clearQuickActionHistory();
    setHistory([]);
  };

  const removeHistory = (id: string) => {
    setHistory(removeQuickActionHistory(id));
  };

  const showQr = async (action: QuickActionId) => {
    if (!isNativeApp) return;
    setQrAction(action);
    setQrImage(null);
    setQrLoading(true);
    const image = await createNativeQrCode(quickActionLink(action));
    setQrImage(image);
    setQrLoading(false);
  };

  const addNfcProfile = () => {
    const name = nfcProfileName.trim();
    if (!name) return;
    const next = [
      ...nfcProfiles,
      {
        id: globalThis.crypto?.randomUUID?.() || `nfc-${Date.now()}`,
        name,
        action: nfcProfileAction,
        createdAt: new Date().toISOString()
      }
    ].slice(-12);
    setNfcProfiles(next);
    writeNfcProfiles(next);
    setNfcProfileName('');
  };

  const deleteNfcProfile = (id: string) => {
    const next = nfcProfiles.filter((profile) => profile.id !== id);
    setNfcProfiles(next);
    writeNfcProfiles(next);
  };

  const walletSetupSteps = isNativeApp ? IPHONE_METHODS[1].steps : WALLET_WEB_STEPS;

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
            <p className="truncate text-[11px] font-medium text-white/45">Lancez une fonction sans chercher dans l’application.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${isNativeApp ? 'bg-[#00D26A]/15 text-[#00D26A]' : 'bg-[#6C5CFF]/15 text-[#9E94FF]'}`}>
            {isNativeApp ? 'Application iPhone' : 'Version web'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-4">
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.035] p-4">
          <div className="flex items-start gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isNativeApp ? 'bg-[#00D26A]/12 text-[#00D26A]' : 'bg-[#6C5CFF]/12 text-[#9E94FF]'}`}>
              {isNativeApp ? <Smartphone className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
            </span>
            <div>
              <strong className="block text-sm text-white">{isNativeApp ? 'Application iPhone détectée' : 'Version web détectée'}</strong>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/50">
                {isNativeApp
                  ? 'Vos actions MyFamily+ sont disponibles dans Siri et l’app Raccourcis après le premier lancement.'
                  : 'Les liens rapides fonctionnent avec Raccourcis et les tags NFC. Certaines commandes Siri nécessitent l’application iPhone.'}
              </p>
            </div>
          </div>
        </section>

        <nav className="grid grid-cols-2 gap-1 rounded-2xl border border-white/8 bg-white/[0.035] p-1 sm:grid-cols-4" aria-label="Sections des raccourcis">
          {([
            ['actions', 'Choisir', ScanLine],
            ['iphone', 'Installer', Smartphone],
            ['nfc', 'Avec un tag', Nfc],
            ['preferences', 'Mes choix', Wallet]
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
              <h3 className="text-sm font-black text-white">Que voulez-vous faire ?</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">Choisissez une fonction. Vous pourrez d’abord l’essayer, puis décider comment la lancer.</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45"><ListChecks className="h-4 w-4 text-[#9E94FF]" /> Mes favoris</span>
                <button type="button" onClick={() => setActiveTab('preferences')} className="text-[10px] font-black text-[#9E94FF]">Modifier</button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {preferences.favorites.map((action) => {
                  const shortcut = QUICK_ACTION_GUIDES.find((item) => item.id === action);
                  if (!shortcut) return null;
                  const Icon = shortcut.icon;
                  return (
                    <button
                      key={shortcut.id}
                      type="button"
                      onClick={() => runAction(shortcut.id)}
                      className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.04] px-2 text-center transition active:scale-[0.98]"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ color: shortcut.color, backgroundColor: `${shortcut.color}18` }}><Icon className="h-4 w-4" /></span>
                      <span className="line-clamp-2 text-[10px] font-black leading-tight text-white/75">{shortcut.label.replace(' principal', '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#00D26A]/14 bg-[#00D26A]/6 p-3">
              <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-[#00D26A]">Raccourcis du foyer</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  ['add-grocery', 'Préparer les courses', 'Dictez ou ajoutez directement les produits.', ShoppingCart],
                  ['scan-homework', 'Ajouter un devoir', 'Scannez une feuille et préparez le devoir.', BookOpenCheck],
                  ['open-vault', 'Ouvrir le coffre-fort', 'Accédez aux documents et démarches du foyer.', FolderLock]
                ] as const).map(([action, label, detail, Icon]) => (
                  <button key={action} type="button" onClick={() => runAction(action)} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07] active:scale-[0.99]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#00D26A]/12 text-[#00D26A]"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0"><strong className="block text-[11px] text-white">{label}</strong><small className="mt-0.5 block text-[9px] leading-relaxed text-white/45">{detail}</small></span>
                  </button>
                ))}
              </div>
            </div>

            {QUICK_ACTION_GUIDES.map((shortcut) => {
              const Icon = shortcut.icon;
              const isExpanded = expandedShortcut === shortcut.id;
              return (
                <article key={shortcut.id} className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.035]">
                  <button
                    type="button"
                    onClick={() => setExpandedShortcut(current => current === shortcut.id ? null : shortcut.id)}
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
                          <MessageCircleMore className="h-3.5 w-3.5" /> À dire à Siri
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

                      <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-white/45">
                          <Smartphone className="h-3.5 w-3.5 text-[#9E94FF]" /> Comment le configurer
                        </span>
                        <ol className="mt-3 space-y-2.5">
                          {shortcutSetupSteps(shortcut.id, shortcut.label, isNativeApp).map((step, index) => (
                            <li key={step} className="flex gap-2.5 text-[10px] font-medium leading-relaxed text-white/55">
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/7 text-[9px] font-black text-white/65">{index + 1}</span>
                              <InstructionText text={step} />
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => runAction(shortcut.id)}
                          disabled={!onTestQuickAction}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6C5CFF] px-3 text-[10px] font-black text-white transition active:scale-[0.98] disabled:opacity-40"
                        >
                          <ClipboardCheck className="h-4 w-4" /> Essayer l’action
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

            <article className={`overflow-hidden rounded-[24px] border p-4 ${focusWalletSetup ? 'border-[#00D26A]/35 bg-[#00D26A]/8 shadow-[0_16px_40px_rgba(0,210,106,0.08)]' : 'border-white/8 bg-white/[0.035]'}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#00D26A]/14 text-[#00D26A]">
                  <Wallet className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#00D26A]">Installation guidée</span>
                  <h3 className="mt-1 text-sm font-black text-white">Paiement Wallet vers Budget</h3>
                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-white/50">Après un paiement Apple Pay, le vrai formulaire de dépense s’ouvre avec les informations disponibles, sans enregistrer automatiquement.</p>
                </div>
              </div>

              <ol className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-black/10 p-3">
                {walletSetupSteps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-[11px] font-medium leading-relaxed text-white/60">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#00D26A]/14 text-[9px] font-black text-[#00D26A]">{index + 1}</span>
                    {isNativeApp ? <span>{step}</span> : <InstructionText text={step} />}
                  </li>
                ))}
              </ol>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openShortcutsApp}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#00D26A] px-3 text-[10px] font-black text-[#04150D] transition active:scale-[0.98]"
                >
                  <ExternalLink className="h-4 w-4" /> Ouvrir Raccourcis
                </button>
                <button
                  type="button"
                  onClick={testWalletForm}
                  disabled={!onTestQuickAction}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[10px] font-black text-white/75 transition active:scale-[0.98] disabled:opacity-40"
                >
                  <ClipboardCheck className="h-4 w-4" /> Tester le formulaire
                </button>
              </div>
              <p className="mt-3 text-[9px] font-medium leading-relaxed text-white/35">Apple impose de créer cette automatisation personnelle dans Raccourcis. MyFamily+ ne peut pas l’activer à votre place.</p>
            </article>

            {IPHONE_METHODS.filter((method) => method.title !== 'Après un paiement Apple Pay').map((method) => {
              const Icon = method.icon;
              const steps = method.steps;
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
                    {steps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-[11px] font-medium leading-relaxed text-white/55">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/7 text-[9px] font-black text-white/70">{index + 1}</span>
                        <InstructionText text={step} />
                      </li>
                    ))}
                  </ol>
                </details>
              );
            })}

            {!isNativeApp && (
              <div className="flex gap-3 rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/8 p-4">
                <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB020]" />
                <p className="text-[11px] font-medium leading-relaxed text-white/55">Sur la version web installée, iOS peut ouvrir le navigateur par défaut au lieu de MyFamily+. Pour Siri, l’appui long et le bouton Action les plus fiables, utilisez l’application iPhone.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'preferences' && (
          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-white">Préférences rapides</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">Ces choix restent sur cet appareil et rendent les raccourcis plus immédiats.</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-[#00D26A]" /><strong className="text-xs text-white">J’ai payé</strong></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-white/40">Compte par défaut</span>
                  <select
                    value={preferences.expense.accountId}
                    onChange={(event) => updatePreferences((current) => ({ ...current, expense: { ...current.expense, accountId: event.target.value } }))}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white outline-none"
                  >
                    <option value="">Dernier compte utilisé</option>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-white/40">Catégorie par défaut</span>
                  <select
                    value={preferences.expense.category}
                    onChange={(event) => updatePreferences((current) => ({ ...current, expense: { ...current.expense, category: event.target.value } }))}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white outline-none"
                  >
                    {['Divers', 'Alimentation', 'Transport', 'Logement', 'Santé', 'Éducation', 'Loisirs', 'Voyages'].map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-white/40">Commerce ou libellé proposé</span>
                <input
                  value={preferences.expense.merchant}
                  onChange={(event) => updatePreferences((current) => ({ ...current, expense: { ...current.expense, merchant: event.target.value } }))}
                  placeholder="Ex. Carrefour"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white outline-none placeholder:text-white/25"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-[#FFB020]" /><strong className="text-xs text-white">Source proposée au scanner</strong></div>
              {([
                ['receipt', 'Ticket'],
                ['homework', 'Devoir']
              ] as const).map(([kind, label]) => (
                <div key={kind} className="mt-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                  <span className="mb-2 block text-[10px] font-black text-white/65">{label}</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      ['camera', 'Photo', Camera],
                      ['library', 'Galerie', Image],
                      ['files', 'Fichiers', FileText]
                    ] as const).map(([source, sourceLabel, Icon]) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => updatePreferences((current) => ({ ...current, scanner: { ...current.scanner, [kind]: source as ScannerInputMode } }))}
                        className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-black transition ${preferences.scanner[kind] === source ? 'bg-[#6C5CFF] text-white' : 'bg-white/5 text-white/45 hover:text-white/75'}`}
                      >
                        <Icon className="h-3.5 w-3.5" />{sourceLabel}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="mt-3 text-[9px] leading-relaxed text-white/38">Dans l’application iPhone, Photo et Galerie s’ouvrent directement. Fichiers est mis en avant pour que vous choisissiez le document. Sur la version web, iOS impose ce dernier geste de confirmation.</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-bold text-white"><ListChecks className="h-4 w-4 text-[#9E94FF]" /> Favoris de l’accueil</span><span className="text-[9px] font-black text-white/35">{preferences.favorites.length}/4</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {QUICK_ACTION_GUIDES.map((shortcut) => {
                  const selected = preferences.favorites.includes(shortcut.id);
                  return (
                    <button
                      key={shortcut.id}
                      type="button"
                      onClick={() => updatePreferences((current) => {
                        const alreadySelected = current.favorites.includes(shortcut.id);
                        if (alreadySelected) return { ...current, favorites: current.favorites.filter((id) => id !== shortcut.id) };
                        if (current.favorites.length >= 4) return current;
                        return { ...current, favorites: [...current.favorites, shortcut.id] };
                      })}
                      className={`rounded-xl border px-3 py-2.5 text-left text-[10px] font-black transition ${selected ? 'border-[#6C5CFF]/50 bg-[#6C5CFF]/16 text-white' : 'border-white/8 bg-white/[0.025] text-white/45'}`}
                    >
                      {selected ? '✓ ' : '+ '}{shortcut.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-bold text-white"><History className="h-4 w-4 text-[#37C9FF]" /> Dernières actions</span>{history.length > 0 && <button type="button" onClick={clearHistory} className="text-[10px] font-black text-white/40">Effacer</button>}</div>
              {history.length === 0 ? (
                <p className="mt-3 rounded-xl bg-white/[0.025] px-3 py-4 text-center text-[10px] font-medium text-white/40">Les actions lancées depuis ce centre apparaîtront ici.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {history.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-white/7 bg-white/[0.025] p-2.5">
                      <span className="min-w-0 flex-1"><strong className="block truncate text-[10px] text-white/75">{entry.label}</strong><small className="mt-0.5 block truncate text-[9px] text-white/38">{new Date(entry.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span>
                      <button type="button" onClick={() => runAction(entry.action, entry.params)} className="rounded-lg bg-[#6C5CFF]/15 px-2.5 py-2 text-[9px] font-black text-[#B7AFFF]">Reprendre</button>
                      <button type="button" onClick={() => removeHistory(entry.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/35"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => { updatePreferences(() => defaultQuickActionPreferences); setActiveTab('actions'); }} className="mt-3 w-full rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[10px] font-black text-white/50">Rétablir les choix initiaux</button>
            </div>
          </section>
        )}

        {activeTab === 'nfc' && (
          <section className="space-y-3">
            <div className="px-1">
              <h3 className="text-sm font-black text-white">Lancer une action avec un autocollant NFC</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/45">Approchez l’iPhone d’un tag placé dans la cuisine, le portefeuille ou près de l’entrée.</p>
            </div>

            <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/7 p-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#9E94FF]" />
                <strong className="text-xs text-white">Mes tags NFC</strong>
              </div>
              <p className="mt-1 text-[10px] font-medium leading-relaxed text-white/45">Donnez un nom à chaque emplacement pour retrouver immédiatement le bon lien.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={nfcProfileName}
                  onChange={(event) => setNfcProfileName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') addNfcProfile(); }}
                  placeholder="Ex. Courses cuisine"
                  maxLength={40}
                  className="min-h-11 min-w-0 rounded-xl border border-white/10 bg-black/10 px-3 text-xs font-bold text-white outline-none placeholder:text-white/30 focus:border-[#6C5CFF]"
                />
                <select
                  value={nfcProfileAction}
                  onChange={(event) => setNfcProfileAction(event.target.value as QuickActionId)}
                  className="min-h-11 min-w-0 rounded-xl border border-white/10 bg-[#11192A] px-3 text-xs font-bold text-white outline-none focus:border-[#6C5CFF]"
                >
                  {QUICK_ACTION_GUIDES.map((shortcut) => <option key={shortcut.id} value={shortcut.id}>{shortcut.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={addNfcProfile}
                  disabled={!nfcProfileName.trim()}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6C5CFF] px-4 text-[10px] font-black text-white disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </div>

              {nfcProfiles.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-white/8 pt-3">
                  {nfcProfiles.map((profile) => {
                    const shortcut = QUICK_ACTION_GUIDES.find((item) => item.id === profile.action);
                    const Icon = shortcut?.icon || Nfc;
                    return (
                      <div key={profile.id} className="rounded-xl border border-white/8 bg-black/10 p-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ color: shortcut?.color, backgroundColor: `${shortcut?.color || '#6C5CFF'}18` }}><Icon className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-white">{profile.name}</strong><small className="mt-0.5 block text-[9px] text-white/40">{shortcut?.label}</small></span>
                          {isNativeApp && <button type="button" onClick={() => void showQr(profile.action)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/8 bg-white/5 text-[#9E94FF]" aria-label={`Afficher le QR code ${profile.name}`}><ScanLine className="h-4 w-4" /></button>}
                          <button type="button" onClick={() => void copyValue(quickActionLink(profile.action), `profile-${profile.id}`)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/8 bg-white/5 text-white/60" aria-label={`Copier le lien ${profile.name}`}>{copiedValue === `profile-${profile.id}` ? <CheckCircle2 className="h-4 w-4 text-[#00D26A]" /> : <Copy className="h-4 w-4" />}</button>
                          <button type="button" onClick={() => deleteNfcProfile(profile.id)} className="grid h-9 w-9 place-items-center rounded-xl text-red-400/70" aria-label={`Supprimer ${profile.name}`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <code className="mt-2 block break-all whitespace-normal text-[9px] leading-relaxed text-white/45">{quickActionLink(profile.action)}</code>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <ol className="space-y-3">
                {NFC_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3 text-[11px] font-medium leading-relaxed text-white/60">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#6C5CFF]/15 text-[10px] font-black text-[#9E94FF]">{index + 1}</span>
                    <InstructionText text={step} />
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
                      <small className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-white/30">Lien à coller dans Raccourcis</small>
                      <code className="mt-1 block break-all whitespace-normal text-[9px] font-medium leading-relaxed text-white/55">{quickActionLink(shortcut.id)}</code>
                    </span>
                    <div className="flex shrink-0 gap-1.5">
                      {isNativeApp && (
                        <button
                          type="button"
                          onClick={() => void showQr(shortcut.id)}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-white/5 text-[#9E94FF]"
                          aria-label={`Afficher le code QR ${shortcut.label}`}
                        >
                          <ScanLine className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void copyValue(quickActionLink(shortcut.id), `link-${shortcut.id}`)}
                        className="flex h-10 items-center gap-1.5 rounded-xl border border-white/8 bg-white/5 px-3 text-[9px] font-black text-white/65"
                        aria-label={`Copier le lien NFC ${shortcut.label}`}
                      >
                        {copiedValue === `link-${shortcut.id}` ? <CheckCircle2 className="h-4 w-4 text-[#00D26A]" /> : <Copy className="h-4 w-4" />}
                        {copiedValue === `link-${shortcut.id}` ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isNativeApp && <p className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[10px] leading-relaxed text-white/45">Les codes QR se génèrent directement dans l’application iPhone. Ici, copiez le lien puis utilisez-le dans Raccourcis.</p>}

            <div className="flex gap-3 rounded-2xl border border-[#00D26A]/18 bg-[#00D26A]/7 p-4">
              <Nfc className="mt-0.5 h-5 w-5 shrink-0 text-[#00D26A]" />
              <p className="text-[11px] font-medium leading-relaxed text-white/55">Le tag contient uniquement un lien d’ouverture. Il ne contient ni compte, ni dépense, ni donnée familiale.</p>
            </div>
          </section>
        )}
      </main>

      {qrAction && (
        <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-[#020713]/78 p-5 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-2xl border border-white/12 bg-[#101827] p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <h3 className="text-base font-black text-white">Code QR NFC</h3>
            <p className="mt-1 text-[11px] text-white/48">{QUICK_ACTION_GUIDES.find((item) => item.id === qrAction)?.label}</p>
            <div className="mt-4 grid min-h-52 place-items-center rounded-2xl bg-white p-4">
              {qrLoading ? <span className="text-xs font-black text-[#6C5CFF]">Création…</span> : qrImage ? <img src={qrImage} alt="Code QR du raccourci" className="h-48 w-48 object-contain" /> : <span className="px-4 text-xs font-bold text-slate-500">Le code QR n’a pas pu être créé. Copiez le lien NFC à la place.</span>}
            </div>
            <button type="button" onClick={() => { setQrAction(null); setQrImage(null); }} className="mt-4 w-full rounded-2xl bg-[#6C5CFF] px-4 py-3 text-xs font-black text-white">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};
