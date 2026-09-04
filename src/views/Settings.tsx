import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Coins, 
  Database, 
  Trash2, 
  RefreshCw, 
  Lock,
  Sparkles,
  Users,
  Camera,
  ImagePlus,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  UserRound,
  Palette,
  Shield,
  Home,
  SlidersHorizontal,
  ExternalLink,
  AlertTriangle,
  Accessibility,
  CaseSensitive,
  Contrast,
  Gauge,
  X,
  Crown,
  CreditCard,
  RadioTower,
  ChevronRight,
  CalendarDays,
  FolderLock,
  HeartPulse,
  ListTodo,
  MessageCircle,
  ShoppingCart,
  Wallet,
  Download,
  LogOut,
  MonitorSmartphone,
  Search,
  FlaskConical,
  UploadCloud
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';
import { foyerService } from '../services/foyerService';
import { billingService } from '../services/billingService';
import { notificationService } from '../services/notificationService';
import type { Account, Foyer, FoyerMember, Member } from '../types';
import type { User } from '@supabase/supabase-js';
import { defaultSmartFamilyPreferences, type SmartFamilyPreferences } from '../utils/smartFamily';
import { MemberAvatar } from '../components/MemberAvatar';
import { ShortcutCenter } from '../components/ShortcutCenter';
import { AppDiagnosticsPanel } from '../components/AppDiagnosticsPanel';
import { QUICK_ACTION_GUIDES } from '../constants/quickActionGuides';
import type { QuickActionId } from '../utils/quickActionPreferences';
import { createLocalBackup, downloadLocalBackup, restoreLocalBackup } from '../utils/localBackup';
import { openExternalUrl, openLegalPage } from '../services/externalLinkService';

type NotificationPrefs = Record<string, boolean>;

const defaultNotificationPrefs: NotificationPrefs = {
  groceries: true,
  tasks: true,
  agenda: true,
  finances: true,
  chat: true,
  health: true,
  vault: true
};

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const SETTINGS_REFERENCE_TIME = Date.now();

const SETTINGS_SEARCH_ITEMS = [
  { tab: 'compte', target: 'settings-profile', title: 'Profil', description: 'Nom et photo de profil' },
  { tab: 'compte', target: 'settings-security', title: 'Mot de passe', description: 'Sécurité du compte' },
  { tab: 'compte', target: 'settings-delete-account', title: 'Supprimer mon compte', description: 'Suppression définitive du compte et des données' },
  { tab: 'compte', target: 'settings-appearance', title: 'Apparence', description: 'Mode sombre, clair ou sépia' },
  { tab: 'compte', target: 'settings-accessibility', title: 'Accessibilité', description: 'Texte, contraste et animations' },
  { tab: 'compte', target: 'settings-voice-lab', title: 'Laboratoire vocal', description: 'Essai du micro, assistant familial et parseur Courses' },
  { tab: 'compte', target: 'settings-currency', title: 'Devise', description: 'Euro, franc CFA ou dollar' },
  { tab: 'famille', target: 'settings-household', title: 'Foyer et abonnement', description: 'Premium, membres et invitations' },
  { tab: 'alertes', target: 'settings-push', title: 'Notifications', description: 'Notifications sur cet appareil' },
  { tab: 'alertes', target: 'settings-alert-modules', title: 'Alertes par module', description: 'Courses, budget, santé et messages' },
  { tab: 'avance', target: 'settings-parental', title: 'Contrôle parental', description: 'PIN, récompenses et protections' },
  { tab: 'avance', target: 'settings-local-backup', title: 'Sauvegarde locale', description: 'Exporter ou restaurer sur cet appareil' },
  { tab: 'avance', target: 'settings-devices', title: 'Appareils connectés', description: 'Session actuelle et autres appareils' },
  { tab: 'avance', target: 'settings-diagnostics', title: 'État de MyFamily+', description: 'Synchronisation, notifications et mises à jour' },
  { tab: 'avance', target: 'settings-shortcuts', title: 'Raccourcis iPhone', description: 'Wallet, Siri, NFC et bouton Action' },
  { tab: 'avance', target: 'settings-privacy', title: 'Confidentialité', description: 'Vie privée, droits et documents légaux' }
] as const;

interface SettingsProps {
  currency: string;
  setCurrency: (c: string) => void;
  onResetData: () => void;
  onPurgeDemoData?: () => Promise<void> | void;
  onClearAllFoyerData?: () => Promise<void> | void;
  onOpenPaywall: () => void;
  user: User | null;
  foyer?: Foyer | null;
  myMemberProfile?: FoyerMember | null;
  onRefreshFoyer?: () => void;
  onUpdateMemberProfile?: (memberId: string, updates: Partial<FoyerMember>) => Promise<void> | void;
  members?: Member[];
  setMembers?: React.Dispatch<React.SetStateAction<Member[]>>;
  activeMemberId?: string;
  setActiveTab?: (tab: string) => void;
  setActiveModule?: (moduleName: string) => void;
  onOpenOnboarding?: () => void;
  onNotificationPrefsChange?: (prefs: NotificationPrefs) => void;
  smartFamilyPrefs?: SmartFamilyPreferences;
  onSmartFamilyPrefsChange?: (prefs: SmartFamilyPreferences) => void;
  communeName?: string;
  schoolName?: string;
  onUpdateFoyerConfig?: (commune: string, school: string) => Promise<void> | void;
  onDeleteAccount?: () => Promise<void>;
  isNativeApp?: boolean;
  accounts?: Account[];
  onTestQuickAction?: (action: QuickActionId, params?: Record<string, string | number | undefined>) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  currency,
  setCurrency,
  onResetData,
  onOpenPaywall,
  user,
  foyer,
  myMemberProfile,
  onRefreshFoyer,
  onUpdateMemberProfile,
  members = [],
  setMembers,
  activeMemberId,
  setActiveTab,
  setActiveModule,
  onOpenOnboarding,
  onNotificationPrefsChange,
  smartFamilyPrefs = defaultSmartFamilyPreferences,
  onSmartFamilyPrefsChange,
  communeName = '',
  schoolName = '',
  onUpdateFoyerConfig,
  onDeleteAccount,
  isNativeApp = false,
  accounts = [],
  onTestQuickAction
}) => {
  const [savingBackup, setSavingBackup] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'compte' | 'famille' | 'alertes' | 'avance'>('compte');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [openingStripePortal, setOpeningStripePortal] = useState(false);
  const [stripePortalError, setStripePortalError] = useState('');
  const [shortcutCenterOpen, setShortcutCenterOpen] = useState(false);
  const [shortcutCenterInitialTab, setShortcutCenterInitialTab] = useState<'actions' | 'iphone'>('actions');
  const [focusWalletSetup, setFocusWalletSetup] = useState(false);
  const [settingsSearch, setSettingsSearch] = useState('');
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [disconnectingOthers, setDisconnectingOthers] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const restoreBackupInputRef = useRef<HTMLInputElement>(null);

  const premiumExpiresAt = foyer?.premiumExpiresAt ? new Date(foyer.premiumExpiresAt) : null;
  const hasValidPremiumDate = Boolean(premiumExpiresAt && Number.isFinite(premiumExpiresAt.getTime()));
  const premiumDaysLeft = hasValidPremiumDate && premiumExpiresAt
    ? Math.max(0, Math.ceil((premiumExpiresAt.getTime() - SETTINGS_REFERENCE_TIME) / (24 * 60 * 60 * 1000)))
    : null;
  const premiumStatusLabel = (() => {
    if (!foyer?.isPremium) return 'Gratuit';
    if (foyer.premiumStatus === 'trialing') return 'Premium';
    if (foyer.premiumStatus === 'past_due') return 'Paiement à vérifier';
    if (foyer.premiumStatus === 'canceled') return 'Abonnement annulé';
    if (foyer.premiumSource === 'stripe') return 'Premium Stripe';
    if (foyer.premiumSource === 'appstore') return 'Premium App Store';
    if (foyer.premiumSource === 'test') return 'Premium test';
    return 'Premium actif';
  })();
  const premiumPlanLabel = foyer?.premiumPlan === 'monthly'
    ? 'Mensuel'
    : foyer?.premiumPlan === 'yearly'
      ? 'Annuel'
      : foyer?.isPremium
        ? 'Forfait actif'
        : 'Aucun forfait';
  const premiumRenewalLabel = hasValidPremiumDate && premiumExpiresAt
    ? `Échéance ${premiumExpiresAt.toLocaleDateString('fr-FR')}`
    : foyer?.isPremium
      ? 'Échéance gérée par le fournisseur'
      : 'Aucun abonnement actif';

  const activeMember = members.find(member => member.id === activeMemberId);
  const settingsTabs = [
    { id: 'compte', label: 'Moi', title: 'Mon espace', description: 'Profil, apparence et confort de lecture', icon: UserRound, color: '#9E94FF' },
    { id: 'famille', label: 'Foyer', title: 'Mon foyer', description: 'Membres, abonnement et règles familiales', icon: Home, color: '#00D26A' },
    { id: 'alertes', label: 'Alertes', title: 'Mes alertes', description: 'Choisissez ce qui mérite votre attention', icon: Bell, color: '#FFB020' },
    { id: 'avance', label: 'Plus', title: 'Outils et confidentialité', description: 'Raccourcis, données et informations légales', icon: SlidersHorizontal, color: '#4F8CFF' }
  ] as const;
  const activeSettingsTab = settingsTabs.find(tab => tab.id === settingsTab) || settingsTabs[0];
  const ActiveSettingsIcon = activeSettingsTab.icon;
  const normalizedSettingsSearch = settingsSearch.trim().toLocaleLowerCase('fr-FR');
  const settingsSearchResults = normalizedSettingsSearch.length >= 2
    ? SETTINGS_SEARCH_ITEMS.filter(item => (!isNativeApp || item.target !== 'settings-voice-lab') && `${item.title} ${item.description}`.toLocaleLowerCase('fr-FR').includes(normalizedSettingsSearch)).slice(0, 6)
    : [];

  const currentDevice = (() => {
    const userAgent = navigator.userAgent;
    const platform = /iPad|iPhone|iPod/i.test(userAgent)
      ? 'iPhone ou iPad'
      : /Android/i.test(userAgent)
        ? 'Appareil Android'
        : /Macintosh|Mac OS X/i.test(userAgent)
          ? 'Mac'
          : /Windows/i.test(userAgent)
            ? 'PC Windows'
            : 'Appareil actuel';
    const browser = /CriOS|Chrome/i.test(userAgent)
      ? 'Chrome'
      : /FxiOS|Firefox/i.test(userAgent)
        ? 'Firefox'
        : /Safari/i.test(userAgent)
          ? 'Safari'
          : 'Application';
    const context = isNativeApp
      ? 'Application iPhone'
      : window.matchMedia('(display-mode: standalone)').matches
        ? 'Application web installée'
        : browser;
    return { platform, context };
  })();

  const handleOpenStripePortal = async () => {
    if (!foyer?.id || openingStripePortal) return;
    setOpeningStripePortal(true);
    setStripePortalError('');
    try {
      const portalUrl = await billingService.openStripePortal(foyer.id);
      window.location.assign(portalUrl);
      window.setTimeout(() => setOpeningStripePortal(false), 8000);
    } catch (err) {
      setStripePortalError(getErrorMessage(err, "Impossible d'ouvrir la gestion de l'abonnement."));
      setOpeningStripePortal(false);
    }
  };

  useEffect(() => {
    const resetStripePortalState = () => setOpeningStripePortal(false);
    window.addEventListener('pageshow', resetStripePortalState);
    window.addEventListener('focus', resetStripePortalState);
    return () => {
      window.removeEventListener('pageshow', resetStripePortalState);
      window.removeEventListener('focus', resetStripePortalState);
    };
  }, []);

  const handleDeleteAccount = async () => {
    if (!onDeleteAccount || deleteAccountConfirmation !== 'SUPPRIMER' || deletingAccount) return;
    setDeletingAccount(true);
    setDeleteAccountError('');
    try {
      await onDeleteAccount();
    } catch (err) {
      setDeleteAccountError(getErrorMessage(err, 'La suppression du compte a échoué.'));
      setDeletingAccount(false);
    }
  };

  const [parentPinInput, setParentPinInput] = useState('');
  const [parentPinConfirm, setParentPinConfirm] = useState('');
  const [showParentPin, setShowParentPin] = useState(false);
  const [savingParentPin, setSavingParentPin] = useState(false);
  const [parentPinMessage, setParentPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveParentPin = async () => {
    if (!foyer || !user || savingParentPin) return;
    if (parentPinInput !== parentPinConfirm) {
      setParentPinMessage({ type: 'error', text: 'Les deux codes PIN ne correspondent pas.' });
      return;
    }
    setSavingParentPin(true);
    setParentPinMessage(null);
    try {
        await foyerService.updateFoyerParentPin(foyer.id, parentPinInput);
      localStorage.removeItem('mf_parent_pin');
      setParentPinInput('');
      setParentPinConfirm('');
      setShowParentPin(false);
      setParentPinMessage({ type: 'success', text: 'PIN enregistré et protégé côté serveur.' });
      if (onRefreshFoyer) await onRefreshFoyer();
    } catch (err) {
      console.error("Error saving parent pin to database:", err);
      setParentPinMessage({ type: 'error', text: getErrorMessage(err, "Impossible d'enregistrer le PIN.") });
    } finally {
      setSavingParentPin(false);
    }
  };

  const [localCommune, setLocalCommune] = useState(communeName);
  const [localSchool, setLocalSchool] = useState(schoolName);

  const [malusSettings, setMalusSettings] = useState(() => {
    return foyer?.malusSettings || {
      enabled: true,
      shields_enabled: true,
      weekly_shields: 3,
      reparation_enabled: true,
      max_malus_per_day: 3
    };
  });

  useEffect(() => {
    if (foyer?.malusSettings) {
      queueMicrotask(() => setMalusSettings(foyer.malusSettings!));
    }
  }, [foyer]);

  const handleSaveMalusSettings = async (updates: Partial<typeof malusSettings>) => {
    const newSettings = { ...malusSettings, ...updates };
    setMalusSettings(newSettings);
    if (foyer && user) {
      try {
        await foyerService.updateFoyerMalusSettings(foyer.id, newSettings);
        if (onRefreshFoyer) onRefreshFoyer();
      } catch (err) {
        console.error("Error saving malus settings to database:", err);
      }
    }
  };

  useEffect(() => {
    queueMicrotask(() => setLocalCommune(communeName));
  }, [communeName]);

  useEffect(() => {
    queueMicrotask(() => setLocalSchool(schoolName));
  }, [schoolName]);

  // État des notifications push FCM
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('mf_fcm_active') === 'true';
  });

  const handleTogglePush = async () => {
    if (!activeMemberId) return;

    if (pushEnabled) {
      try {
        await notificationService.disableNotifications(activeMemberId);
        setPushEnabled(false);
      } catch (err) {
        console.error("[Settings] Failed to disable push notifications:", err);
      }
    } else {
      try {
        const token = await notificationService.initializeFCM(activeMemberId);
        if (token) {
          setPushEnabled(true);
        } else {
          alert("L'activation a échoué. Veuillez autoriser les notifications dans les paramètres de votre navigateur.");
        }
      } catch (err) {
        console.error("[Settings] Failed to enable push notifications:", err);
      }
    }
  };

  // Apparence thématique (Sombre / Clair / Sépia)
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>(() => {
    const savedTheme = localStorage.getItem('app_appearance_mode');
    return savedTheme === 'light' || savedTheme === 'sepia' ? savedTheme : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-sepia');
    document.body.classList.remove('theme-light', 'theme-sepia');
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
    } else if (theme === 'sepia') {
      document.documentElement.classList.add('theme-sepia');
      document.body.classList.add('theme-sepia');
    }
    localStorage.setItem('app_appearance_mode', theme);
  }, [theme]);

  const [textSize, setTextSize] = useState<'standard' | 'large' | 'extra-large'>(() => {
    const saved = localStorage.getItem('mf_accessibility_text_size');
    return saved === 'large' || saved === 'extra-large' ? saved : 'standard';
  });
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('mf_accessibility_high_contrast') === 'true');
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('mf_accessibility_reduce_motion') === 'true');

  useEffect(() => {
    document.documentElement.classList.remove('text-size-large', 'text-size-extra-large', 'high-contrast', 'reduce-motion');
    if (textSize === 'large') document.documentElement.classList.add('text-size-large');
    if (textSize === 'extra-large') document.documentElement.classList.add('text-size-extra-large');
    if (highContrast) document.documentElement.classList.add('high-contrast');
    if (reduceMotion) document.documentElement.classList.add('reduce-motion');
    localStorage.setItem('mf_accessibility_text_size', textSize);
    localStorage.setItem('mf_accessibility_high_contrast', String(highContrast));
    localStorage.setItem('mf_accessibility_reduce_motion', String(reduceMotion));
  }, [highContrast, reduceMotion, textSize]);

  // Notification module preferences (groceries, tasks, agenda, finances, chat, health, vault, sos)
  const [localPrefs, setLocalPrefs] = useState<NotificationPrefs>(() => {
    if (myMemberProfile?.notificationPrefs && Object.keys(myMemberProfile.notificationPrefs).length > 0) {
      return myMemberProfile.notificationPrefs;
    }

    const key = `mf_notif_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached) as NotificationPrefs;
      } catch {
        // Ignore malformed cached notification preferences.
      }
    }
    return defaultNotificationPrefs;
  });

  useEffect(() => {
    const key = `mf_notif_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    if (myMemberProfile?.notificationPrefs && Object.keys(myMemberProfile.notificationPrefs).length > 0) {
      queueMicrotask(() => setLocalPrefs(myMemberProfile.notificationPrefs!));
      localStorage.setItem(key, JSON.stringify(myMemberProfile.notificationPrefs));
      return;
    }

    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as NotificationPrefs;
        queueMicrotask(() => setLocalPrefs(parsed));
      } catch {
        // Ignore malformed cached notification preferences.
      }
    }
  }, [foyer?.id, user?.id, myMemberProfile?.notificationPrefs]);

  const handleTogglePref = async (prefKey: string) => {
    const updated = {
      ...localPrefs,
      [prefKey]: !localPrefs[prefKey]
    };
    setLocalPrefs(updated);
    const storageKey = `mf_notif_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
    if (onNotificationPrefsChange) {
      onNotificationPrefsChange(updated);
    }

    const client = getSupabaseClient();
    if (client && activeMemberId) {
      const { error } = await client
        .from('foyer_members')
        .update({ notification_prefs: updated })
        .eq('id', activeMemberId);

      if (error) {
        console.error("[Settings] Failed to save notification preferences:", error.message);
      }
    }
  };

  const handleSmartPrefChange = (updates: Partial<SmartFamilyPreferences>) => {
    const updated = { ...smartFamilyPrefs, ...updates };
    if (onSmartFamilyPrefsChange) {
      onSmartFamilyPrefsChange(updated);
    }
  };

  // Profil et avatars
  const [profileName, setProfileName] = useState(() => {
    if (members && activeMemberId) {
      const activeMem = members.find(m => m.id === activeMemberId);
      if (activeMem) return activeMem.name;
    }
    if (myMemberProfile) return myMemberProfile.displayName;
    return '';
  });
  const [profilePhoto, setProfilePhoto] = useState(() => {
    if (members && activeMemberId) {
      const activeMem = members.find(m => m.id === activeMemberId);
      if (activeMem) return activeMem.photoUrl || '';
    }
    if (myMemberProfile) return myMemberProfile.photoUrl || '';
    return '';
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const compressAndConvert = (file: File, maxSize = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = reject;
        img.src = ev.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      // Try Supabase Storage upload first
      const supabase = getSupabaseClient();
      const targetMemberId = activeMemberId || (myMemberProfile ? myMemberProfile.id : null);
      if (supabase && targetMemberId) {
        const ext = file.name.split('.').pop() || 'jpg';
        const filePath = `avatars/${targetMemberId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true, contentType: file.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            setProfilePhoto(urlData.publicUrl);
            setUploadingPhoto(false);
            return;
          }
        }
      }
      if (myMemberProfile || activeMemberId) {
        throw new Error("Upload Storage impossible pour cette photo.");
      }
      // Fallback: compress to data URL
      const dataUrl = await compressAndConvert(file);
      setProfilePhoto(dataUrl);
    } catch (err) {
      console.error('Photo upload error:', err);
      if (myMemberProfile || activeMemberId) {
        setProfileMsg({ text: "Impossible d'envoyer la photo vers Storage. Réessayez dans un instant.", type: 'error' });
      } else {
        const dataUrl = await compressAndConvert(file);
        setProfilePhoto(dataUrl);
      }
    } finally {
      setUploadingPhoto(false);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  const lastActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentTargetId = activeMemberId || (myMemberProfile ? myMemberProfile.id : 'default');
    if (lastActiveIdRef.current !== currentTargetId) {
      lastActiveIdRef.current = currentTargetId;
      if (members && activeMemberId) {
        const activeMem = members.find(m => m.id === activeMemberId);
        if (activeMem) {
          queueMicrotask(() => {
            setProfileName(activeMem.name);
            setProfilePhoto(activeMem.photoUrl || '');
          });
          return;
        }
      }
      if (myMemberProfile) {
        queueMicrotask(() => {
          setProfileName(myMemberProfile.displayName);
          setProfilePhoto(myMemberProfile.photoUrl || '');
        });
      }
    }
  }, [myMemberProfile, members, activeMemberId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const targetMemberId = activeMemberId || (myMemberProfile ? myMemberProfile.id : null);
      if (!targetMemberId) throw new Error("Aucun membre actif trouvé");

      if (myMemberProfile) {
        // Mode Cloud (Supabase)
        const updates = {
          displayName: profileName.trim(),
          photoUrl: profilePhoto
        };
        if (onUpdateMemberProfile) {
          await onUpdateMemberProfile(targetMemberId, updates);
        } else {
          await foyerService.updateMemberProfile(targetMemberId, updates);
        }

        // Optimistic local update — immediately reflect in UI
        if (setMembers) {
          setMembers(prev => prev.map(m => m.id === targetMemberId ? {
            ...m,
            name: profileName.trim(),
            photoUrl: profilePhoto
          } : m));
        }
        setProfileMsg({ text: 'Profil cloud mis à jour avec succès ! ✨', type: 'success' });
      } else if (members && setMembers) {
        // Mode Local (Demo)
        setMembers(prev => prev.map(m => m.id === targetMemberId ? {
          ...m,
          name: profileName.trim(),
          photoUrl: profilePhoto
        } : m));
        setProfileMsg({ text: 'Profil local mis à jour avec succès ! ✨', type: 'success' });
      } else {
        throw new Error("Impossible de mettre à jour le profil");
      }
    } catch (err) {
      setProfileMsg({ text: getErrorMessage(err, 'Erreur de mise à jour.'), type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };
  




  const openSettingsSearchResult = (tab: 'compte' | 'famille' | 'alertes' | 'avance', target: string) => {
    setSettingsTab(tab);
    setSettingsSearch('');
    window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const triggerManualBackup = async () => {
    setSavingBackup(true);
    setBackupMessage(null);
    try {
      const backup = createLocalBackup();
      const saved = await downloadLocalBackup(backup);
      if (!saved) return;
      localStorage.setItem('mf_last_local_backup_at', backup.createdAt);
      setBackupMessage({ type: 'success', text: `${backup.itemCount} réglages et données locales sauvegardés.` });
    } catch (error) {
      setBackupMessage({ type: 'error', text: getErrorMessage(error, 'Impossible de créer la sauvegarde locale.') });
    } finally {
      setSavingBackup(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!window.confirm('Restaurer cette sauvegarde locale ? Les réglages présents dans le fichier remplaceront ceux de cet appareil.')) return;
    setRestoringBackup(true);
    setBackupMessage(null);
    try {
      const result = await restoreLocalBackup(file);
      setBackupMessage({ type: 'success', text: `${result.restored} éléments restaurés. L’application va actualiser les réglages.` });
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setBackupMessage({ type: 'error', text: getErrorMessage(error, 'Impossible de restaurer cette sauvegarde.') });
      setRestoringBackup(false);
    }
  };

  const disconnectOtherDevices = async () => {
    if (!window.confirm('Déconnecter MyFamily+ de tous vos autres appareils ? La session de cet appareil restera active.')) return;
    setDisconnectingOthers(true);
    setSessionMessage(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Service de connexion indisponible.');
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      setSessionMessage({ type: 'success', text: 'Les autres appareils ont été déconnectés.' });
    } catch (error) {
      setSessionMessage({ type: 'error', text: getErrorMessage(error, 'Impossible de déconnecter les autres appareils.') });
    } finally {
      setDisconnectingOthers(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Chef de famille';
      case 'parent': return 'Parent';
      case 'child': return 'Enfant';
      case 'guest': return 'Invité';
      default: return role;
    }
  };

  return (
    <div className="settings-page mx-auto max-w-3xl space-y-5 px-4 pb-32 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] md:px-8 premium-glow-blue">
      
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/8 pb-5">
        <MemberAvatar
          name={activeMember?.name || myMemberProfile?.displayName || user?.email || 'Profil'}
          photoUrl={profilePhoto}
          className="h-12 w-12 shrink-0 rounded-2xl border border-[#6C5CFF]/35 shadow-[0_10px_28px_rgba(108,92,255,0.18)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-white">Réglages</h1>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${foyer?.isPremium ? 'bg-[#FFB020]/12 text-[#FFB020]' : 'bg-white/6 text-white/40'}`}>
              {foyer?.isPremium ? 'Premium' : 'Gratuit'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] font-medium text-white/45">{activeMember?.name || myMemberProfile?.displayName || user?.email || 'Votre espace personnel'}</p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/4 text-white/50">
          <SettingsIcon className="h-5 w-5" />
        </div>
      </header>

      <div className="relative z-20">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 shadow-[0_12px_30px_rgba(0,0,0,0.06)] focus-within:border-[#6C5CFF]/45 focus-within:bg-white/6">
          <Search className="h-4 w-4 shrink-0 text-white/35" />
          <input
            type="search"
            value={settingsSearch}
            onChange={event => setSettingsSearch(event.target.value)}
            placeholder="Rechercher dans les réglages"
            className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/30"
          />
          {settingsSearch && (
            <button type="button" onClick={() => setSettingsSearch('')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/40 hover:bg-white/6 hover:text-white" aria-label="Effacer la recherche">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        {normalizedSettingsSearch.length >= 2 && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0B1728] p-2 shadow-2xl">
            {settingsSearchResults.length > 0 ? settingsSearchResults.map(result => (
              <button
                key={result.target}
                type="button"
                onClick={() => openSettingsSearchResult(result.tab, result.target)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/6"
              >
                <Search className="h-4 w-4 shrink-0 text-[#9E94FF]" />
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs text-white">{result.title}</strong>
                  <small className="mt-0.5 block truncate text-[9px] text-white/40">{result.description}</small>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
              </button>
            )) : (
              <p className="px-3 py-4 text-center text-[10px] font-semibold text-white/40">Aucun réglage correspondant.</p>
            )}
          </div>
        )}
      </div>

      {!isNativeApp && (
        <a
          id="settings-voice-lab"
          href="/ai-lab"
          className="flex min-h-14 scroll-mt-5 items-center gap-3 border-y border-family-border py-3 text-family-text"
        >
          <FlaskConical className="h-5 w-5 shrink-0 text-family-primary" />
          <span className="min-w-0 flex-1 text-sm font-bold">Laboratoire vocal</span>
          <span className="text-xs font-medium text-family-text-secondary">Essai</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-family-text-secondary" />
        </a>
      )}

      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/8 bg-white/4 p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.08)]">
        {settingsTabs.map((tab) => (
          (() => {
            const Icon = tab.icon;
            return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSettingsTab(tab.id as typeof settingsTab)}
            className={`flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold transition-all ${
              settingsTab === tab.id
                ? 'bg-[#6C5CFF] text-white shadow-[0_8px_20px_rgba(108,92,255,0.25)]'
                : 'text-white/45 hover:bg-white/5 hover:text-white'
            }`}
            aria-current={settingsTab === tab.id ? 'page' : undefined}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
            );
          })()
        ))}
      </div>

      <div className="flex items-center gap-3 px-1 py-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ color: activeSettingsTab.color, backgroundColor: `${activeSettingsTab.color}16` }}>
          <ActiveSettingsIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-white">{activeSettingsTab.title}</h2>
          <p className="mt-0.5 text-[10px] font-medium text-white/42">{activeSettingsTab.description}</p>
        </div>
      </div>

      {settingsTab === 'compte' && user && onDeleteAccount && (
        <section id="settings-delete-account" className="scroll-mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.055] p-5 shadow-[0_14px_34px_rgba(127,29,29,0.06)]">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/12 text-red-400">
              <Trash2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-white">Compte et données</h3>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/50">
                Vous pouvez supprimer définitivement votre compte MyFamily+ et les données personnelles associées.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteAccountConfirmation('');
              setDeleteAccountError('');
              setDeleteAccountOpen(true);
            }}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/12 px-4 text-xs font-black text-red-300 transition hover:bg-red-500/18 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer définitivement mon compte
          </button>
        </section>
      )}

      {/* 0. Mon Profil */}
      {settingsTab === 'compte' && (myMemberProfile || activeMemberId) && (
        <form id="settings-profile" onSubmit={handleSaveProfile} className="glass-panel animate-fade-in scroll-mt-5 space-y-5 rounded-2xl border border-white/8 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#6C5CFF]" />
              <span>Mon Profil</span>
            </h3>
            <span className="max-w-[48%] truncate rounded-full bg-[#6C5CFF]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-[#9E94FF]">
              {getRoleLabel((members.find(m => m.id === activeMemberId)?.role) || (myMemberProfile ? myMemberProfile.role : 'admin'))}
            </span>
          </div>

          {/* Profile Photo selector */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/7 bg-white/3 p-4">
            <div className="group relative shrink-0">
              {uploadingPhoto ? (
                <div className="w-20 h-20 rounded-full border-2 border-[#6C5CFF] bg-white/5 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-[#6C5CFF] animate-spin" />
                </div>
              ) : (
                <MemberAvatar
                  name={members.find(member => member.id === activeMemberId)?.name || myMemberProfile?.displayName}
                  photoUrl={profilePhoto}
                  className="h-16 w-16 rounded-2xl border-2 border-[#6C5CFF] shadow-[0_8px_24px_rgba(108,92,255,0.22)]"
                />
              )}
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-lg border border-[#07111F] bg-[#6C5CFF] text-white">
                <Camera className="h-3 w-3" />
              </span>
            </div>

            {/* Camera & Gallery buttons */}
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-white">{profileName || 'Votre profil'}</strong>
              <span className="mt-1 block text-[10px] font-medium leading-relaxed text-white/42">Choisissez une photo nette et bien cadrée.</span>
              <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 px-2 text-[9px] font-black text-white transition-all hover:bg-[#6C5CFF]/20 active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-[#6C5CFF]" />
                <span>Appareil</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#00D26A]/20 bg-[#00D26A]/10 px-2 text-[9px] font-black text-white transition-all hover:bg-[#00D26A]/20 active:scale-95"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#00D26A]" />
                <span>Galerie</span>
              </button>
              </div>
            </div>
            {/* Hidden file inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} className="hidden" />
            <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />

          </div>

          {/* Display Name input */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Mon Prénom / Nom d'affichage</label>
            <input
              type="text"
              required
              placeholder="Votre nom d’affichage"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#6C5CFF]"
            />
          </div>

          {profileMsg && (
            <div className={`p-3 rounded-xl border text-[11px] font-medium leading-normal animate-fade-in ${
              profileMsg.type === 'success' ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {profileMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-3 rounded-xl bg-[#6C5CFF] hover:bg-[#5B4EFA] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[#6C5CFF]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            {savingProfile ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Enregistrer mon profil</span>
            )}
          </button>
        </form>
      )}

      {/* Modifier mon mot de passe */}
      {settingsTab === 'compte' && user && (
        <details id="settings-security" className="group glass-panel scroll-mt-5 rounded-2xl border border-white/8 p-5 space-y-4 animate-fade-in">
          <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#FF4D6D]" />
              <span>Sécurité</span>
            </span>
            <span className="text-[10px] text-white/35 font-black uppercase group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-xs text-white/50 leading-relaxed font-medium pt-1">
            Modifier le mot de passe du compte connecté.
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            const pwd = String(formData.get('newPassword') || '');
            if (pwd.length < 6) {
              alert("Le mot de passe doit faire au moins 6 caractères.");
              return;
            }
            try {
              const supabase = getSupabaseClient();
              if (!supabase) throw new Error("Supabase n'est pas disponible.");
              const { error } = await supabase.auth.updateUser({ password: pwd });
              if (error) throw error;
              alert("Mot de passe mis à jour avec succès ! ✨");
              form.reset();
            } catch (err) {
              alert(getErrorMessage(err, "Impossible de mettre à jour le mot de passe."));
            }
          }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nouveau mot de passe</label>
              <input
                type="password"
                name="newPassword"
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/25 border border-[#6C5CFF]/30 text-white text-xs font-bold active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Mettre à jour le mot de passe</span>
            </button>
          </form>
        </details>
      )}

      {/* Sélecteur de Mode d'Apparence */}
      {settingsTab === 'compte' && (
      <div id="settings-appearance" className="glass-panel scroll-mt-5 rounded-2xl border border-white/8 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Palette className="w-4 h-4 text-[#6C5CFF]" />
          <span>Apparence & Mode visuel</span>
        </h3>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Choisissez une ambiance vraiment adaptée : sombre, clair ou lecture chaude.
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'dark', label: 'Sombre', desc: 'nuit', bg: 'from-[#07111F] to-[#111C33]', dot: 'bg-[#6C5CFF]' },
            { id: 'light', label: 'Clair', desc: 'jour', bg: 'from-[#FFFFFF] to-[#EAF0FA]', dot: 'bg-[#2563EB]' },
            { id: 'sepia', label: 'Sépia', desc: 'doux', bg: 'from-[#FFF7E8] to-[#EAD8B8]', dot: 'bg-[#9A650F]' }
          ].map((mode) => (
            <button
              type="button"
              key={mode.id}
              onClick={() => setTheme(mode.id as typeof theme)}
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-stretch justify-center space-y-2 active:scale-95 ${
                theme === mode.id
                  ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-md shadow-[#6C5CFF]/10 font-black'
                  : 'bg-white/5 border-transparent text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className={`h-9 rounded-lg bg-gradient-to-br ${mode.bg} border border-white/20 flex items-end justify-end p-1.5`}>
                <span className={`w-3 h-3 rounded-full ${mode.dot} shadow-sm`} />
              </span>
              <span>{mode.label}</span>
              <span className="text-[8px] font-bold opacity-55 uppercase -mt-1">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {settingsTab === 'compte' && (
        <div id="settings-accessibility" className="glass-panel scroll-mt-5 rounded-2xl border border-white/8 p-5 space-y-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
            <Accessibility className="h-4 w-4 text-[#00D26A]" />
            Accessibilité
          </h3>
          <div className="space-y-3">
            <div>
              <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase text-white/45">
                <CaseSensitive className="h-4 w-4" /> Taille du texte
              </span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['standard', 'Standard'],
                  ['large', 'Grand'],
                  ['extra-large', 'Très grand']
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTextSize(value)}
                    className={`rounded-xl border px-2 py-3 text-[10px] font-black ${textSize === value ? 'border-[#6C5CFF] bg-[#6C5CFF]/15 text-white' : 'border-white/8 bg-white/5 text-white/50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setHighContrast(value => !value)} className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/3 p-3 text-left">
              <span>
                <strong className="flex items-center gap-2 text-xs text-white"><Contrast className="h-4 w-4 text-[#FFB020]" /> Contraste renforcé</strong>
                <small className="mt-1 block text-[9px] text-white/40">Textes secondaires et contours plus visibles.</small>
              </span>
              <span className={`relative h-6 w-11 rounded-full ${highContrast ? 'bg-[#00D26A]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${highContrast ? 'translate-x-5' : ''}`} /></span>
            </button>
            <button type="button" onClick={() => setReduceMotion(value => !value)} className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/3 p-3 text-left">
              <span>
                <strong className="flex items-center gap-2 text-xs text-white"><Gauge className="h-4 w-4 text-[#4F8CFF]" /> Réduire les animations</strong>
                <small className="mt-1 block text-[9px] text-white/40">Limite retournements, pulsations et transitions.</small>
              </span>
              <span className={`relative h-6 w-11 rounded-full ${reduceMotion ? 'bg-[#00D26A]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${reduceMotion ? 'translate-x-5' : ''}`} /></span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications Push */}
      {settingsTab === 'alertes' && (
      <div id="settings-push" className="glass-panel scroll-mt-5 rounded-2xl border border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            {pushEnabled ? <Bell className="w-4 h-4 text-[#00D26A]" /> : <BellOff className="w-4 h-4 text-white/40" />}
            <span>Notifications Push</span>
          </h3>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${pushEnabled ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-white/5 text-white/30'}`}>
            {pushEnabled ? 'Activées' : 'Désactivées'}
          </span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Recevez des alertes en temps réel (Urgences, Chat, Tâches, Argent de poche) directement sur l'écran d'accueil de votre appareil.
        </p>

        <button
          type="button"
          onClick={handleTogglePush}
          className={`w-full py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.98] ${
            pushEnabled
              ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg shadow-[#6C5CFF]/15 hover:opacity-95'
          }`}
        >
          {pushEnabled ? (
            <>
              <BellOff className="w-4 h-4" />
              <span>Désactiver les notifications</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 animate-bounce" style={{ animationDuration: '3s' }} />
              <span>Activer les notifications</span>
            </>
          )}
        </button>
      </div>
      )}

      {/* Recommandations intelligentes */}
      {settingsTab === 'alertes' && (
      <div className="glass-panel rounded-2xl border border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#FFB020]" />
            <span>Recommandations intelligentes</span>
          </h3>
          <button
            type="button"
            onClick={() => handleSmartPrefChange({ enabled: !smartFamilyPrefs.enabled })}
            className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
              smartFamilyPrefs.enabled ? 'bg-[#00D26A]' : 'bg-white/10'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform duration-200 ${smartFamilyPrefs.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Contrôlez les actions recommandées sur l’accueil et les alertes internes calculées par l’app. Cela ne modifie pas les notifications push.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'showSetup', label: 'Démarrage guidé' },
            { key: 'showPriority', label: 'Priorités' },
            { key: 'showParent', label: 'Parent' },
            { key: 'showChild', label: 'Enfant / ado' },
            { key: 'showRoutine', label: 'Routines' },
            { key: 'internalAlerts', label: 'Alertes internes' }
          ].map((item) => {
            const key = item.key as keyof SmartFamilyPreferences;
            const enabled = smartFamilyPrefs[key] !== false;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSmartPrefChange({ [key]: !enabled } as Partial<SmartFamilyPreferences>)}
                className={`rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                  enabled
                    ? 'bg-[#6C5CFF]/12 border-[#6C5CFF]/25 text-white'
                    : 'bg-white/[0.03] border-white/8 text-white/35'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider block">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-2xl bg-white/3 border border-white/5 space-y-2">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Niveau d’alerte interne minimum</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'medium', label: 'Important + urgent' },
              { id: 'high', label: 'Urgent seulement' }
            ].map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => handleSmartPrefChange({ minAlertPriority: level.id as SmartFamilyPreferences['minAlertPriority'] })}
                className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${
                  smartFamilyPrefs.minAlertPriority === level.id
                    ? 'bg-[#FFB020]/15 border-[#FFB020]/30 text-[#FFB020]'
                    : 'bg-white/5 border-white/8 text-white/45'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Toggles de personnalisation par module */}
      {settingsTab === 'alertes' && (
      <div id="settings-alert-modules" className="glass-panel scroll-mt-5 rounded-2xl border border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Bell className="w-4 h-4 text-[#6C5CFF]" />
            <span>Personnalisation des alertes</span>
          </h3>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Personnalisez la visibilité des notifications et des badges pour chaque module de la famille.
        </p>

        <div className="space-y-3 pt-2">
          {[
            { key: 'groceries', label: 'Courses et listes', icon: ShoppingCart, color: '#FFB020' },
            { key: 'tasks', label: 'Tâches familiales', icon: ListTodo, color: '#9E94FF' },
            { key: 'agenda', label: 'Agenda et événements', icon: CalendarDays, color: '#4F8CFF' },
            { key: 'finances', label: 'Budget et épargne', icon: Wallet, color: '#00D26A' },
            { key: 'chat', label: 'Messages', icon: MessageCircle, color: '#37C9FF' },
            { key: 'health', label: 'Santé', icon: HeartPulse, color: '#FF4D6D' },
            { key: 'vault', label: 'Coffre-fort', icon: FolderLock, color: '#9E94FF' }
          ].map((item) => {
            const isEnabled = localPrefs[item.key] !== false;
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex min-h-14 items-center justify-between rounded-xl border border-white/6 bg-white/3 p-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ color: item.color, backgroundColor: `${item.color}16` }}><Icon className="h-4 w-4" /></span>
                  <span className="truncate text-xs font-bold text-white">{item.label}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleTogglePref(item.key)}
                  aria-pressed={isEnabled}
                  aria-label={`${isEnabled ? 'Désactiver' : 'Activer'} les alertes ${item.label}`}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    isEnabled ? 'bg-[#00D26A]' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform duration-200 ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 1. Devise Section */}
      {settingsTab === 'compte' && (
      <div id="settings-currency" className="glass-panel scroll-mt-5 rounded-2xl border border-white/8 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Coins className="w-4 h-4 text-[#FFB020]" />
          <span>Devise par défaut</span>
        </h3>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Choisissez la devise monétaire dans laquelle s'affichent les soldes, dépenses et argent de poche de la famille.
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'EUR (€)', label: 'Euro (€)' },
            { id: 'FCFA (FCFA)', label: 'CFA (FCFA)' },
            { id: 'USD ($)', label: 'Dollar ($)' }
          ].map((dev) => (
            <button
              key={dev.id}
              onClick={() => setCurrency(dev.id)}
              className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                currency === dev.id
                  ? 'bg-[#6C5CFF]/10 border-[#6C5CFF] text-white shadow-md'
                  : 'bg-white/5 border-transparent text-white/50 hover:text-white'
              }`}
            >
              {dev.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* 2. Foyer Management Section */}
      {settingsTab === 'famille' && (user && foyer ? (
        <div id="settings-household" className="glass-panel animate-fade-in scroll-mt-5 space-y-5 rounded-2xl border border-white/8 p-5">
          
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2 min-w-0">
              <Users className="w-4 h-4 text-[#6C5CFF] shrink-0" />
              <span className="truncate">Foyer : {foyer.name}</span>
            </h3>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A]">Compte Actif</span>
          </div>

          <div className="rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="rounded-2xl bg-[#FFB020]/10 p-3 text-[#FFB020] border border-[#FFB020]/20">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-white">Abonnement Premium</h4>
                  <p className="text-[11px] text-white/60 font-semibold mt-0.5">{premiumStatusLabel}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/80">
                {premiumPlanLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/20 border border-white/8 p-3">
                <span className="block text-[9px] font-black uppercase tracking-wider text-white/40">Temps restant</span>
                <strong className="block mt-1 text-sm text-white">
                  {premiumDaysLeft !== null
                    ? `${premiumDaysLeft} jour${premiumDaysLeft > 1 ? 's' : ''}`
                    : foyer.isPremium ? 'Actif' : 'Non actif'}
                </strong>
              </div>
              <div className="rounded-xl bg-black/20 border border-white/8 p-3">
                <span className="block text-[9px] font-black uppercase tracking-wider text-white/40">Échéance</span>
                <strong className="block mt-1 text-sm text-white">{premiumRenewalLabel}</strong>
              </div>
            </div>

            {foyer.premiumSource === 'stripe' && (
              <button
                type="button"
                onClick={handleOpenStripePortal}
                disabled={openingStripePortal || !foyer.stripeCustomerId}
                className="w-full py-3 rounded-xl bg-white text-[#101426] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className={`w-4 h-4 ${openingStripePortal ? 'animate-pulse' : ''}`} />
                {openingStripePortal ? 'Ouverture...' : "Gérer l'abonnement Stripe"}
              </button>
            )}

            {foyer.premiumSource === 'appstore' && (
              <a
                href="https://apps.apple.com/account/subscriptions"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-white text-[#101426] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:opacity-90 active:scale-[0.99] transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Gérer sur l'App Store
              </a>
            )}

            {!foyer.isPremium && (
              <button
                type="button"
                onClick={onOpenPaywall}
                className="w-full py-3 rounded-xl bg-[#6C5CFF] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#6C5CFF]/15 hover:opacity-90 active:scale-[0.99] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Découvrir Premium
              </button>
            )}

            {foyer.premiumSource === 'stripe' && !foyer.stripeCustomerId && (
              <p className="text-[10px] text-[#FFB020] font-semibold leading-relaxed">
                L'abonnement est actif, mais le lien de gestion Stripe n'est pas encore rattaché à ce foyer.
              </p>
            )}
            {stripePortalError && (
              <p role="alert" className="text-[10px] text-[#FF4D6D] font-semibold leading-relaxed">
                {stripePortalError}
              </p>
            )}
            <p className="text-[10px] text-white/45 leading-relaxed font-medium">
              Annulation, carte bancaire et factures restent gérées dans le portail sécurisé du fournisseur.
            </p>
          </div>

          {/* Premium Shortcut to Unified Member Manager */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#6C5CFF]/10 to-[#FF4D6D]/10 border border-[#6C5CFF]/20 text-center space-y-3">
            <div className="inline-flex p-3.5 rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 animate-pulse">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Membres & invitations</h4>
              <p className="text-[9.5px] text-white/50 leading-relaxed max-w-[300px] mx-auto mt-1">
                Gérez les membres, invitations, rôles et dérogations enfants depuis le panneau dédié.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (setActiveTab && setActiveModule) {
                  setActiveTab('menu');
                  setActiveModule('membres');
                }
              }}
              className="w-full mt-2 py-3.5 rounded-xl bg-[#6C5CFF] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#6C5CFF]/15 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Ouvrir la gestion des membres
            </button>
          </div>

          <div className="pt-2"></div>

          {/* Rattachements Card */}
          {(!myMemberProfile || ['admin', 'parent'].includes(myMemberProfile.role)) && (
            <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
              <div className="flex items-center space-x-2 text-[#6C5CFF]">
                <Sparkles className="w-4 h-4 font-sans" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Commune & école</h4>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                Renseignez les informations utilisées par les cartes Accueil et les espaces famille.
              </p>
              <div className="space-y-3 font-sans">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Commune Rattachée</label>
                  <input
                    type="text"
                    placeholder="Ex: votre commune"
                    value={localCommune}
                    onChange={(e) => setLocalCommune(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Établissement Scolaire (École)</label>
                  <input
                    type="text"
                    placeholder="Ex: école du quartier"
                    value={localSchool}
                    onChange={(e) => setLocalSchool(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (onUpdateFoyerConfig) {
                      await onUpdateFoyerConfig(localCommune, localSchool);
                      alert("Rattachements officiels enregistrés avec succès ! ✨");
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-extrabold text-[11px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          <div className="pt-2"></div>

        </div>
      ) : (
        /* 3. Authentication Panel (Show if not logged in) */
        <div className="glass-panel rounded-2xl border border-white/8 p-5 space-y-4 animate-fade-in text-center">
          <div className="space-y-2 py-4">
            <div className="w-12 h-12 rounded-full bg-[#6C5CFF]/10 flex items-center justify-center mx-auto text-[#6C5CFF]">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Portail de Connexion
              </h3>
              <p className="text-[10px] text-white/50 max-w-xs mx-auto leading-normal">
                Rejoignez votre famille ou créez votre propre foyer pour synchroniser vos agendas, listes et photos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenOnboarding) {
                onOpenOnboarding();
              }
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Se connecter / Rejoindre / S'inscrire
          </button>
        </div>
      ))}

      {/* Réglages parentaux avancés */}
      {settingsTab === 'avance' && user && foyer && (!myMemberProfile || ['admin', 'parent'].includes(myMemberProfile.role)) && (
        <div id="settings-parental" className="glass-panel animate-fade-in scroll-mt-5 space-y-5 rounded-2xl border border-white/8 p-5">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#FFB020]" />
              <span>Contrôle parental</span>
            </h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Code PIN et règles enfants.
            </p>
          </div>

          {/* Malus Settings Card */}
          {
            <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
              <div className="flex items-center space-x-2 text-[#FFB020]">
                <SettingsIcon className="w-4 h-4 text-[#FFB020]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Système de Malus & Boucliers</h4>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                Configurez le système de malus pour responsabiliser vos enfants de manière positive et bienveillante.
              </p>
              
              <div className="space-y-4 pt-1 font-sans">
                {/* Enable Malus */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Activer les Malus</span>
                    <span className="text-[9px] text-white/40">Permet d'appliquer des pénalités configurées</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveMalusSettings({ enabled: !malusSettings.enabled })}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                      malusSettings.enabled ? 'bg-[#00D26A]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform duration-200 ${
                        malusSettings.enabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Enable Shields */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Boucliers protecteurs</span>
                    <span className="text-[9px] text-white/40">Permet d'annuler les malus avec des boucliers</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveMalusSettings({ shields_enabled: !malusSettings.shields_enabled })}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                      malusSettings.shields_enabled ? 'bg-[#00D26A]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform duration-200 ${
                        malusSettings.shields_enabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Weekly Shields Count */}
                {malusSettings.shields_enabled && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Boucliers par semaine</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={malusSettings.weekly_shields}
                        onChange={(e) => handleSaveMalusSettings({ weekly_shields: Math.max(1, parseInt(e.target.value) || 3) })}
                        className="w-20 px-3.5 py-2 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#6C5CFF]"
                      />
                      <span className="text-[10px] text-white/55">bouclier(s) par enfant (renouvelé le lundi)</span>
                    </div>
                  </div>
                )}

                {/* Enable Reparation / Recovery tasks */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Missions de rattrapage</span>
                    <span className="text-[9px] text-white/40">Permet de récupérer les points perdus après une tâche</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveMalusSettings({ reparation_enabled: !malusSettings.reparation_enabled })}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                      malusSettings.reparation_enabled ? 'bg-[#00D26A]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform duration-200 ${
                        malusSettings.reparation_enabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Max Malus Per Day */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Limite de malus par jour</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={malusSettings.max_malus_per_day}
                      onChange={(e) => handleSaveMalusSettings({ max_malus_per_day: Math.max(1, parseInt(e.target.value) || 3) })}
                      className="w-20 px-3.5 py-2 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#6C5CFF]"
                    />
                    <span className="text-[10px] text-white/55">malus maximum par jour par enfant</span>
                  </div>
                </div>
              </div>
            </div>
          }

          <div className="rounded-2xl border border-[#00D26A]/15 bg-[#00D26A]/5 p-5 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Récompenses transversales</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-white/50">Un même cadre pour les tâches, l’école et les jeux.</p>
            </div>
            <button type="button" onClick={() => handleSaveMalusSettings({ rewards_enabled: malusSettings.rewards_enabled === false })} className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/3 p-3 text-left">
              <span className="text-xs font-bold text-white">Activer les récompenses</span>
              <span className={`relative h-6 w-11 rounded-full ${malusSettings.rewards_enabled !== false ? 'bg-[#00D26A]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${malusSettings.rewards_enabled !== false ? 'translate-x-5' : ''}`} /></span>
            </button>
            <button type="button" onClick={() => handleSaveMalusSettings({ reward_parent_validation: malusSettings.reward_parent_validation === false })} className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/3 p-3 text-left">
              <span>
                <strong className="block text-xs text-white">Validation parentale</strong>
                <small className="text-[9px] text-white/40">Recommandée avant d’ajouter des points.</small>
              </span>
              <span className={`relative h-6 w-11 rounded-full ${malusSettings.reward_parent_validation !== false ? 'bg-[#00D26A]' : 'bg-white/15'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${malusSettings.reward_parent_validation !== false ? 'translate-x-5' : ''}`} /></span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[9px] font-bold uppercase text-white/40">Plafond quotidien
                <input type="number" min={1} max={500} value={malusSettings.reward_daily_cap || 50} onChange={(event) => handleSaveMalusSettings({ reward_daily_cap: Math.max(1, Number(event.target.value) || 50) })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#07111F] px-3 py-2 text-xs text-white" />
              </label>
              <label className="text-[9px] font-bold uppercase text-white/40">Victoire à un jeu
                <input type="number" min={1} max={50} value={malusSettings.reward_game_points || 5} onChange={(event) => handleSaveMalusSettings({ reward_game_points: Math.max(1, Number(event.target.value) || 5) })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#07111F] px-3 py-2 text-xs text-white" />
              </label>
            </div>
            <div>
              <span className="mb-2 block text-[9px] font-bold uppercase text-white/40">Modules autorisés</span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['tasks', 'Tâches'],
                  ['school', 'École'],
                  ['games', 'Jeux']
                ] as const).map(([source, label]) => {
                  const sources = malusSettings.reward_sources || { tasks: true, school: true, games: true };
                  const active = sources[source] !== false;
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => handleSaveMalusSettings({ reward_sources: { ...sources, [source]: !active } })}
                      className={`rounded-xl border px-2 py-2.5 text-[9px] font-black ${active ? 'border-[#00D26A]/30 bg-[#00D26A]/10 text-[#00D26A]' : 'border-white/8 bg-white/3 text-white/35'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2"></div>

          {/* Parent PIN Lock Card */}
          {
            <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
              <div className="flex items-center space-x-2 text-[#FF4D6D]">
                <Lock className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Code PIN de Contrôle Parental</h4>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">
                Définissez un code PIN à 4 chiffres requis pour basculer d'un profil enfant vers un profil parent/admin.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="relative">
                  <input
                    type={showParentPin ? "text" : "password"}
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Nouveau PIN"
                    value={parentPinInput}
                    onChange={(e) => {
                      setParentPinInput(e.target.value.replace(/\D/g, ''));
                      setParentPinMessage(null);
                    }}
                    className="w-full pl-3 pr-9 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-extrabold tracking-widest text-center text-sm focus:outline-none focus:border-[#6C5CFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowParentPin(!showParentPin)}
                    className="absolute right-2.5 top-3.5 text-white/30 hover:text-white/60 focus:outline-none cursor-pointer"
                  >
                    {showParentPin ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <input
                  type={showParentPin ? "text" : "password"}
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Confirmer"
                  value={parentPinConfirm}
                  onChange={(e) => {
                    setParentPinConfirm(e.target.value.replace(/\D/g, ''));
                    setParentPinMessage(null);
                  }}
                  className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-extrabold tracking-widest text-center text-sm focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSaveParentPin}
                  disabled={parentPinInput.length !== 4 || parentPinConfirm.length !== 4 || savingParentPin}
                  className="w-full py-3.5 rounded-xl bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/25 border border-[#6C5CFF]/30 disabled:opacity-50 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center"
                >
                  {savingParentPin ? 'Protection...' : 'Enregistrer le PIN'}
                </button>
              </div>
              {parentPinMessage && (
                <p className={`text-[10px] font-bold ${
                  parentPinMessage.type === 'success' ? 'text-[#00D26A]' : 'text-[#FF4D6D]'
                }`}>
                  {parentPinMessage.text}
                </p>
              )}
              <p className="text-[9px] text-white/35 leading-normal">
                Évitez les suites simples et les chiffres répétés. Après 5 erreurs, la saisie est bloquée pendant 5 minutes.
              </p>
            </div>
          }
        </div>
      )}



      {/* 4. Données locales & Sauvegarde */}
      {settingsTab === 'avance' && (
        <div id="settings-local-backup" className="glass-panel scroll-mt-5 space-y-4 rounded-2xl border border-white/8 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                <Database className="h-4 w-4 text-[#00D26A]" />
                <span>Sauvegarde locale</span>
              </h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-white/50">Créez un fichier privé à conserver sur votre appareil. Rien n’est envoyé dans le cloud.</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#00D26A]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-[#00D26A]">Hors ligne</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/7 bg-white/3 p-3">
            <span>
              <strong className="block text-[11px] text-white">Dernière sauvegarde</strong>
              <small className="mt-0.5 block text-[9px] text-white/40">
                {(() => {
                  const rawDate = localStorage.getItem('mf_last_local_backup_at');
                  if (!rawDate) return 'Aucune sauvegarde créée sur cet appareil';
                  const date = new Date(rawDate);
                  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
                })()}
              </small>
            </span>
            <Download className="h-4 w-4 shrink-0 text-white/30" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void triggerManualBackup()}
              disabled={savingBackup || restoringBackup}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6C5CFF] px-3 text-[10px] font-black text-white shadow-lg shadow-[#6C5CFF]/15 disabled:opacity-50"
            >
              {savingBackup ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {savingBackup ? 'Préparation…' : 'Créer le fichier'}
            </button>
            <button
              type="button"
              onClick={() => restoreBackupInputRef.current?.click()}
              disabled={savingBackup || restoringBackup}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[10px] font-black text-white/75 disabled:opacity-50"
            >
              {restoringBackup ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Restaurer
            </button>
          </div>
          <input ref={restoreBackupInputRef} type="file" accept="application/json,.json" onChange={event => void handleRestoreBackup(event)} className="hidden" />

          {backupMessage && (
            <p className={`rounded-xl border px-3 py-2.5 text-[10px] font-bold ${backupMessage.type === 'success' ? 'border-[#00D26A]/20 bg-[#00D26A]/8 text-[#00D26A]' : 'border-red-500/20 bg-red-500/8 text-red-400'}`}>{backupMessage.text}</p>
          )}

          <details className="group border-t border-white/7 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-bold text-white/40">
              Réinitialiser les données de cet appareil
              <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
            </summary>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Effacer les données locales de cet appareil ? Les données synchronisées du foyer ne seront pas supprimées.')) onResetData();
              }}
              className="mt-3 flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 text-[10px] font-black text-red-400"
            >
              <Trash2 className="h-4 w-4" /> Réinitialiser cet appareil
            </button>
          </details>
        </div>
      )}

      {settingsTab === 'avance' && user && (
        <div id="settings-devices" className="glass-panel scroll-mt-5 space-y-4 rounded-2xl border border-white/8 p-5">
          <div>
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white"><MonitorSmartphone className="h-4 w-4 text-[#4F8CFF]" /> Appareils connectés</h3>
            <p className="mt-2 text-xs font-medium leading-relaxed text-white/50">Contrôlez l’accès à votre compte sans conserver une liste supplémentaire d’appareils.</p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#00D26A]/15 bg-[#00D26A]/6 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00D26A]/12 text-[#00D26A]"><MonitorSmartphone className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs text-white">{currentDevice.platform}</strong>
              <small className="mt-0.5 block truncate text-[9px] text-white/45">{currentDevice.context} · Session actuelle</small>
            </span>
            <span className="shrink-0 rounded-full bg-[#00D26A]/12 px-2 py-1 text-[8px] font-black uppercase text-[#00D26A]">Actif</span>
          </div>

          <button
            type="button"
            onClick={() => void disconnectOtherDevices()}
            disabled={disconnectingOthers}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#FFB020]/20 bg-[#FFB020]/8 px-3 text-[10px] font-black text-[#FFB020] disabled:opacity-50"
          >
            {disconnectingOthers ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {disconnectingOthers ? 'Déconnexion…' : 'Déconnecter les autres appareils'}
          </button>
          <p className="text-[9px] font-medium leading-relaxed text-white/35">Pour votre sécurité, les détails des autres sessions ne sont pas exposés. Cette action révoque toutes les autres connexions sans fermer celle-ci.</p>
          {sessionMessage && <p className={`rounded-xl border px-3 py-2.5 text-[10px] font-bold ${sessionMessage.type === 'success' ? 'border-[#00D26A]/20 bg-[#00D26A]/8 text-[#00D26A]' : 'border-red-500/20 bg-red-500/8 text-red-400'}`}>{sessionMessage.text}</p>}
        </div>
      )}

      {settingsTab === 'avance' && <AppDiagnosticsPanel isNativeApp={isNativeApp} />}

      {settingsTab === 'avance' && (
        <div id="settings-shortcuts" className="glass-panel scroll-mt-5 space-y-4 rounded-2xl border border-white/8 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                <RadioTower className="h-4 w-4 text-[#9E94FF]" />
                <span>Raccourcis MyFamily+</span>
              </h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-white/50">
                {isNativeApp
                  ? 'Configurez Siri, le bouton Action, Toucher le dos et vos tags NFC.'
                  : 'Préparez les liens rapides de la version web et vos tags NFC.'}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${isNativeApp ? 'bg-[#00D26A]/12 text-[#00D26A]' : 'bg-[#6C5CFF]/12 text-[#9E94FF]'}`}>
              {isNativeApp ? 'App iPhone' : 'Version web'}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <div className="flex -space-x-1.5">
              {QUICK_ACTION_GUIDES.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <span
                    key={shortcut.id}
                    className="grid h-9 w-9 place-items-center rounded-xl border-2 border-white/10"
                    style={{ color: shortcut.color, backgroundColor: `${shortcut.color}1D` }}
                    title={shortcut.label}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                );
              })}
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs text-white">6 actions disponibles</strong>
              <span className="mt-0.5 block truncate text-[10px] text-white/45">Micro, dépense, scans, courses et coffre-fort</span>
            </div>
          </div>

          {isNativeApp && (
            <button
              type="button"
              onClick={() => {
                setShortcutCenterInitialTab('iphone');
                setFocusWalletSetup(true);
                setShortcutCenterOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#00D26A]/20 bg-[#00D26A]/7 p-3 text-left transition hover:bg-[#00D26A]/10 active:scale-[0.99]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#00D26A]/14 text-[#00D26A]">
                <CreditCard className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-xs text-white">Paiement Wallet vers Budget</strong>
                <small className="mt-1 block text-[10px] leading-relaxed text-white/50">Installer l’automatisation et tester le formulaire prérempli.</small>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#00D26A]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShortcutCenterInitialTab('actions');
              setFocusWalletSetup(false);
              setShortcutCenterOpen(true);
            }}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#6C5CFF] px-4 py-3.5 text-left text-white shadow-[0_12px_28px_rgba(108,92,255,0.22)] transition hover:bg-[#7A6BFF] active:scale-[0.99]"
          >
            <span>
              <strong className="block text-xs">Configurer mes raccourcis</strong>
              <small className="mt-1 block text-[10px] text-white/70">Guide complet et boutons de test</small>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </button>
        </div>
      )}

      <ShortcutCenter
        isOpen={shortcutCenterOpen}
        isNativeApp={isNativeApp}
        initialTab={shortcutCenterInitialTab}
        focusWalletSetup={focusWalletSetup}
        accounts={accounts}
        onClose={() => setShortcutCenterOpen(false)}
        onTestQuickAction={onTestQuickAction}
      />

      {/* 5. Charte RGPD & Mentions Légales */}
      {settingsTab === 'avance' && (
      <div id="settings-privacy" className="glass-panel scroll-mt-5 space-y-4 rounded-2xl border border-white/8 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Lock className="w-4 h-4 text-[#00D26A]" />
            <span>Confidentialité et droits</span>
          </h3>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A]">Informations</span>
        </div>
        
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Consultez les informations sur vos données, vos droits et les engagements de MyFamily+.
        </p>

        <div className="space-y-2 pt-2">
          <details className="group overflow-hidden rounded-xl border border-white/6 bg-white/3 transition-all">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-xs font-bold text-white select-none">
              <Shield className="h-4 w-4 shrink-0 text-[#9E94FF]" />
              <span className="min-w-0 flex-1">Informations légales</span>
              <ChevronRight className="h-4 w-4 text-white/30 transition group-open:rotate-90" />
            </summary>
            <div className="space-y-2 border-t border-white/5 p-4 text-[10px] leading-relaxed text-white/45">
              <p><strong className="text-white/70">Éditeur :</strong> Yatta Digital.</p>
              <p><strong className="text-white/70">Services d’hébergement :</strong> Supabase et Vercel.</p>
              <p><strong className="text-white/70">Confidentialité :</strong> dpo@myfamilyplus.fr.</p>
            </div>
          </details>

          <details className="group overflow-hidden rounded-xl border border-white/6 bg-white/3 transition-all">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-xs font-bold text-white select-none">
              <Lock className="h-4 w-4 shrink-0 text-[#00D26A]" />
              <span className="min-w-0 flex-1">Protection de vos données</span>
              <ChevronRight className="h-4 w-4 text-white/30 transition group-open:rotate-90" />
            </summary>
            <div className="space-y-3 border-t border-white/5 p-4 text-[10px] leading-relaxed text-white/45">
              <div>
                <p className="mb-0.5 font-bold text-white/75">Données utiles uniquement</p>
                <p>Seules les informations nécessaires aux fonctions choisies sont traitées.</p>
              </div>
              <div>
                <p className="mb-0.5 font-bold text-white/75">Localisation sous votre contrôle</p>
                <p>Le partage de position nécessite votre autorisation et peut être interrompu à tout moment.</p>
              </div>
              <div>
                <p className="mb-0.5 font-bold text-white/75">Profils des enfants</p>
                <p>Les profils mineurs sont administrés par le parent ou représentant légal du foyer.</p>
              </div>
            </div>
          </details>

          <details className="group overflow-hidden rounded-xl border border-white/6 bg-white/3 transition-all">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-xs font-bold text-white select-none">
              <Database className="h-4 w-4 shrink-0 text-[#4F8CFF]" />
              <span className="min-w-0 flex-1">Stockage sur votre appareil</span>
              <ChevronRight className="h-4 w-4 text-white/30 transition group-open:rotate-90" />
            </summary>
            <div className="space-y-2 border-t border-white/5 p-4 text-[10px] leading-relaxed text-white/45">
              <p><strong className="text-white/70">Aucune publicité ciblée :</strong> MyFamily+ n’utilise pas de traceur publicitaire.</p>
              <p><strong className="text-white/70">Préférences locales :</strong> certains choix sont mémorisés uniquement sur votre appareil pour faciliter l’utilisation de l’application.</p>
            </div>
          </details>

          <button
            type="button"
            onClick={() => void openLegalPage('/legal/privacy.html')}
            className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/3 p-4 text-xs font-bold text-white hover:bg-white/5"
          >
            <span>Politique de confidentialité complète</span>
            <ExternalLink className="h-4 w-4 text-white/35" />
          </button>
          <button
            type="button"
            onClick={() => void openLegalPage('/legal/terms.html')}
            className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/3 p-4 text-xs font-bold text-white hover:bg-white/5"
          >
            <span>Conditions d’utilisation</span>
            <ExternalLink className="h-4 w-4 text-white/35" />
          </button>
          <button
            type="button"
            onClick={() => void openLegalPage('/legal/account-deletion.html')}
            className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/3 p-4 text-xs font-bold text-white hover:bg-white/5"
          >
            <span>Informations sur la suppression du compte</span>
            <ExternalLink className="h-4 w-4 text-white/35" />
          </button>
        </div>
      </div>
      )}

      {deleteAccountOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-md rounded-2xl border border-red-500/25 bg-[#0B1728] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-red-500/10 p-3 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="delete-account-title" className="text-base font-black text-white">Suppression définitive</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">Cette action est irréversible.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !deletingAccount && setDeleteAccountOpen(false)}
                className="rounded-xl bg-white/5 p-2 text-white/55 hover:text-white"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-white/7 bg-white/3 p-4 text-xs leading-relaxed text-white/60">
              <p>Votre compte de connexion et vos données personnelles seront supprimés.</p>
              <p>Si un autre adulte administre le foyer, sa responsabilité lui sera transférée. Sinon, le foyer et ses données seront supprimés.</p>
              <p>Un abonnement App Store reste géré par Apple. Annulez-le avant de continuer.</p>
              <button type="button" onClick={() => void openExternalUrl('https://apps.apple.com/account/subscriptions')} className="inline-flex items-center gap-1.5 font-bold text-[#9E94FF]">
                Gérer mes abonnements Apple
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            <label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-white/45">
              Tapez SUPPRIMER pour confirmer
            </label>
            <input
              value={deleteAccountConfirmation}
              onChange={(event) => setDeleteAccountConfirmation(event.target.value.toUpperCase())}
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white outline-none focus:border-red-500/50"
              placeholder="SUPPRIMER"
            />

            {deleteAccountError && (
              <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                {deleteAccountError}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setDeleteAccountOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white/70 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteAccountConfirmation !== 'SUPPRIMER' || deletingAccount}
                onClick={handleDeleteAccount}
                className="rounded-xl bg-red-500 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                {deletingAccount ? 'Suppression...' : 'Supprimer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
