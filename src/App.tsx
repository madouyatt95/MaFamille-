/* eslint-disable react-hooks/immutability, react-hooks/purity, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization -- App.tsx is still a legacy monolith. These rules are tracked in docs/lint_cleanup_remaining.md for a dedicated refactor. */
import { lazy, Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { User } from '@supabase/supabase-js';
import { getConfiguredSupabaseAnonKey, getConfiguredSupabaseUrl } from './config/supabaseConfig';
import { parseSmartNaturalSentence, detectGroceryCategory, getGroceryItemEmoji, parseGroceryAction, formatGroceryQty } from './utils/groceryParser';
import { DICTIONARIES } from './utils/dictionaries';


import { parseChoreTitle, serializeChoreTitle, parsePocketMoneyTitle, serializePocketMoneyTitle } from './types';
import type { 
  PocketMoneyChild,
  Member, 
  FamilyJoinRequest,
  FamilyEvent, 
  Transaction, 
  Dish, 
  DocumentFile, 
  ChoreTask, 
  GroceryItem, 
  Vehicle, 
  HomeMaintenance, 
  Trip, 
  PetRecord, 
  SavingGoal,
  NotificationAlert,
  MemoryLog,
  FamilyVote,
  SchoolTask,
  Demarche,
  JustificatifPack,
  ChatMessage,
  ChatGroup,
  Artisan,
  ArchivedList,
  CustomCategory,
  Account,
  Abonnement,
  Debt,
  ModulePermissions,
  FamilyModule,
  MalusTemplate,
  AppliedMalus,
  FoyerMemberProfileUpdate
} from './types';

const LEGACY_DEMO_SCHOOL_TASK_IDS = new Set(['st-1', 'st-2', 'st-3', 'st-4', 'st-5']);
const removeLegacyDemoSchoolTasks = <T extends { id?: string }>(tasks: T[]): T[] =>
  tasks.filter(task => !LEGACY_DEMO_SCHOOL_TASK_IDS.has(String(task.id || '')));
const LEGACY_DEMO_MEMORY_IDS = new Set(['mem-1', 'mem-2']);
interface CloudMemoryRow {
  id?: string;
  date?: string;
  title?: string;
  description?: string;
  author_name?: string;
  author_photo?: string;
  image_url?: string;
  image_urls?: string[];
  likes_count?: number;
  is_private?: boolean;
  theme?: string;
}

interface CalendarSource {
  id: string;
  name: string;
  url: string;
  color: string;
  isActive: boolean;
}

type FoyerMembership = { foyer: Foyer; member: FoyerMember };
// Supabase returns loosely typed row payloads in this monolithic hydration layer.
// Keep the escape hatch local instead of repeating untyped payloads across every mapper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseValue = any;
type DbRow = Record<string, LooseValue>;
type DbRows = LooseValue[];

const storageUrlFromLegacy = (url?: string | null, legacy?: string | null): string | undefined => {
  if (isRemoteUrl(url)) return url;
  if (isRemoteUrl(legacy)) return legacy;
  return undefined;
};

const legacyDataUrlOnly = (value?: string | null): string | undefined => (isDataUrl(value) ? value : undefined);

const uploadJsonToStorage = async (foyerId: string, docId: string, jsonStr: string): Promise<string> => {
  const blob = new Blob([jsonStr], { type: 'application/json' });
  return uploadBlobToStorage('documents', `${foyerId}/${docId}.json`, blob);
};

const mapCloudMemory = (m: CloudMemoryRow): MemoryLog => {
  const imageUrls = Array.isArray(m.image_urls) ? m.image_urls.filter(Boolean) : [];
  return {
    id: m.id || '',
    date: m.date || '',
    title: m.title || '',
    description: m.description || '',
    authorName: m.author_name || '',
    authorPhoto: m.author_photo || '',
    imageUrl: m.image_url || imageUrls[0] || '',
    imageUrls,
    likesCount: m.likes_count || 0,
    isPrivate: !!m.is_private,
    theme: m.theme
  };
};
const removeLegacyDemoMemories = <T extends { id?: string }>(items: T[]): T[] =>
  items.filter(item => !LEGACY_DEMO_MEMORY_IDS.has(String(item.id || '')));

const formatRelativeTime = (dateInput: string | Date | undefined, fallback: string): string => {
  if (!dateInput) return fallback;
  
  let parsedDate: Date;
  if (typeof dateInput === 'string') {
    let cleanStr = dateInput.trim();
    // Replace space between date and time with 'T' for Safari compatibility
    if (cleanStr.includes(' ') && !cleanStr.includes('T')) {
      cleanStr = cleanStr.replace(' ', 'T');
    }
    // Truncate microsecond fractions to millisecond precision for Safari Date parser compatibility
    const dotIdx = cleanStr.indexOf('.');
    if (dotIdx !== -1) {
      const tzMatch = cleanStr.substring(dotIdx).match(/[Z+-]/);
      if (tzMatch && tzMatch.index !== undefined) {
        const tzIdx = dotIdx + tzMatch.index;
        const fraction = cleanStr.substring(dotIdx + 1, tzIdx);
        const tz = cleanStr.substring(tzIdx);
        cleanStr = cleanStr.substring(0, dotIdx + 1) + fraction.substring(0, 3) + tz;
      } else {
        const afterDot = cleanStr.substring(dotIdx + 1);
        cleanStr = cleanStr.substring(0, dotIdx + 1) + afterDot.substring(0, 3);
      }
    }
    parsedDate = new Date(cleanStr);
  } else {
    parsedDate = dateInput;
  }

  if (isNaN(parsedDate.getTime())) return fallback;
  
  const diffMs = Date.now() - parsedDate.getTime();
  // Safe clock skew handling: treat future-skewed timestamps as current
  const diffSec = diffMs < 0 ? 0 : Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return "À l'instant";
  } else if (diffMin < 60) {
    return `Il y a ${diffMin} min`;
  } else if (diffHr < 24) {
    return `Il y a ${diffHr} h`;
  } else if (diffDay === 1) {
    return "Hier";
  } else {
    return `Il y a ${diffDay} j`;
  }
};

// Component imports
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { QuickActionsSheet } from './components/QuickActionsSheet';

import { DEFAULT_CATEGORIES } from './data/budgetCategories';
import { Paywall } from './components/Paywall';
import { billingService } from './services/billingService';
import { PasswordRecoveryView } from './components/PasswordRecoveryView';
import { foyerService } from './services/foyerService';
import { spaceService, type Space } from './services/spaceService';
import { deleteExternalCalendarSourceForReminders, syncExternalCalendarEventsForReminders } from './services/calendarReminderService';
import { CommuneHub } from './components/modules/CommuneHub';
import { getSupabaseClient, deserializeCategoryIcon, serializeTransactionComment, deserializeTransactionComment, getModuleIdFromTransaction, serializeEventDescription, deserializeEventDescription, logQueryVolume, getCleanDescription } from './utils/supabase';
import type { Foyer, FoyerMember } from './types';
import { compressImageToBlob, dataUrlToBlob, extensionFromMimeType, isDataUrl, isRemoteUrl, uploadBlobToStorage } from './utils/imageCompressor';

import { getUnifiedEvents } from './utils/agendaHelper';
import { buildFamilyAssistantResponse, detectFamilyAssistantIntent } from './utils/familyAssistant';
import { buildSmartFamilyAlerts, defaultSmartFamilyPreferences, type SmartFamilyPreferences } from './utils/smartFamily';
import type { GlobalSearchResult } from './utils/globalSearch';
import type { ExternalEvent } from './utils/icalParser';
import { Volume2, Mic, Bell, X, ChevronRight, Settings as SettingsIcon, Lock, Sparkles, Home, ShieldAlert, Check, Star, ArrowLeft } from 'lucide-react';

const Accueil = lazy(() => import('./views/Accueil').then(module => ({ default: module.Accueil })));
const Timeline = lazy(() => import('./views/Timeline').then(module => ({ default: module.Timeline })));
const Agenda = lazy(() => import('./views/Agenda').then(module => ({ default: module.Agenda })));
const Budget = lazy(() => import('./views/Budget').then(module => ({ default: module.Budget })));
const MenuHub = lazy(() => import('./views/MenuHub').then(module => ({ default: module.MenuHub })));
const FamilyMap = lazy(() => import('./views/FamilyMap').then(module => ({ default: module.FamilyMap })));
const Settings = lazy(() => import('./views/Settings').then(module => ({ default: module.Settings })));
const Membres = lazy(() => import('./views/Membres').then(module => ({ default: module.Membres })));
const SharedPackView = lazy(() => import('./components/modules/SharedPackView').then(module => ({ default: module.SharedPackView })));
const ConteurIA = lazy(() => import('./components/modules/ConteurIA').then(module => ({ default: module.ConteurIA })));
const KidsDashboard = lazy(() => import('./views/KidsDashboard').then(module => ({ default: module.KidsDashboard })));
const TeenDashboard = lazy(() => import('./views/TeenDashboard').then(module => ({ default: module.TeenDashboard })));
const KidMissions = lazy(() => import('./views/KidMissions').then(module => ({ default: module.KidMissions })));
const KidSchool = lazy(() => import('./views/KidSchool').then(module => ({ default: module.KidSchool })));
const KidProfile = lazy(() => import('./views/KidProfile').then(module => ({ default: module.KidProfile })));
const PeaceMaker = lazy(() => import('./components/modules/PeaceMaker').then(module => ({ default: module.PeaceMaker })));
const CapsuleTemporelle = lazy(() => import('./components/modules/CapsuleTemporelle').then(module => ({ default: module.CapsuleTemporelle })));
const ConseilFamille = lazy(() => import('./components/modules/ConseilFamille').then(module => ({ default: module.ConseilFamille })));
const Onboarding = lazy(() => import('./views/Onboarding').then(module => ({ default: module.Onboarding })));

const AppLoadingFallback = () => (
  <div className="min-h-screen bg-[#07111F] text-white flex items-center justify-center px-4 font-sans">
    <div className="text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-3xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/25 flex items-center justify-center animate-pulse">
        <span className="text-2xl">👨‍👩‍👧‍👦</span>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Chargement</p>
    </div>
  </div>
);

const keywordRules = [
  // TRANSPORT
  { keywords: ['uber', 'bolt'], category: 'Transport', subCategory: 'Uber', moduleSource: 'budget', label: '🚗 Transport' },
  { keywords: ['taxi'], category: 'Transport', subCategory: 'Taxi', moduleSource: 'budget', label: '🚗 Transport' },
  { keywords: ['transport public', 'bus', 'train', 'metro', 'métro', 'rer'], category: 'Transport', subCategory: 'Transport public', moduleSource: 'budget', label: '🚗 Transport' },
  
  // SANTÉ
  { keywords: ['medecin', 'médecin', 'docteur', 'dentiste', 'pédiatre', 'pediatre', 'consultation', 'osteo', 'ostéopathe', 'visite medicale', 'sante', 'santé'], category: 'Santé', subCategory: 'Médecin', moduleSource: 'sante', label: '🩺 Santé' },
  { keywords: ['pharmacie', 'medicament', 'médicament', 'soin', 'analyses', 'analyse', 'mutuelle'], category: 'Santé', subCategory: 'Pharmacie', moduleSource: 'sante', label: '🩺 Santé' },
  
  // VÉHICULES
  { keywords: ['essence', 'carburant', 'diesel', 'gazole', 'sans plomb'], category: 'Véhicules', subCategory: 'Essence', moduleSource: 'vehicules', label: '🚗 Véhicule' },
  { keywords: ['peage', 'péage', 'parking', 'stationnement', 'lavage', 'garage', 'entretien voiture', 'réparation voiture', 'pneu', 'vidange'], category: 'Véhicules', subCategory: 'Entretien', moduleSource: 'vehicules', label: '🚗 Véhicule' },
  
  // LOGEMENT
  { keywords: ['loyer'], category: 'Logement', subCategory: 'Loyer', moduleSource: 'logement', label: '🏠 Logement' },
  { keywords: ['internet', 'wifi', 'box internet', 'fibre'], category: 'Logement', subCategory: 'Internet', moduleSource: 'logement', label: '🏠 Logement' },
  { keywords: ['edf', 'electricite', 'électricité', 'eau', 'gaz', 'charges', 'assurance habitation', 'travaux', 'maintenance maison'], category: 'Logement', subCategory: 'Charges', moduleSource: 'logement', label: '🏠 Logement' },
  
  // ÉDUCATION
  { keywords: ['cantine'], category: 'Éducation', subCategory: 'Cantine', moduleSource: 'ecole', label: '🎓 École' },
  { keywords: ['ecole', 'école', 'scolarite', 'scolarité', 'fournitures scolaires', 'livres scolaires', 'cahier', 'stylo', 'inscriptions scolaires', 'cours particuliers', 'devoirs'], category: 'Éducation', subCategory: 'Scolarité', moduleSource: 'ecole', label: '🎓 École' },
  
  // ADMINISTRATIF
  { keywords: ['passeport', 'visa', 'carte d\'identité', 'carte identite', 'cni', 'timbre fiscal', 'timbres fiscaux', 'démarche', 'demarche', 'frais administratif', 'administratif'], category: 'Administratif', subCategory: 'Passeport', moduleSource: 'documents', label: '📂 Démarches' },
  
  // ALIMENTATION
  { keywords: ['course', 'courses', 'supermarche', 'supermarché', 'carrefour', 'lidl', 'auchan', 'leclerc', 'intermarche', 'intermarché', 'alimentation', 'nourriture', 'manger', 'coca', 'lait', 'tomate', 'tomates', 'pomme', 'pommes', 'banane', 'bananes', 'eau', 'oignon', 'oignons', 'pain', 'pâtes', 'beurre'], category: 'Alimentation', subCategory: 'Supermarché', moduleSource: 'courses', label: '🛒 Courses' },
  { keywords: ['restaurant', 'resto', 'restau', 'mcdo', 'boulangerie', 'epicerie', 'épicerie', 'café', 'cafe', 'starbucks'], category: 'Alimentation', subCategory: 'Restaurant', moduleSource: 'courses', label: '🛒 Courses' },
  
  // VOYAGES
  { keywords: ['voyage', 'voyages', 'vacance', 'vacances', 'hotel', 'hôtel', 'avion', 'vol', 'billet avion', 'train billet', 'airbnb', 'booking'], category: 'Voyages', subCategory: 'Voyage', moduleSource: 'voyages', label: '✈️ Voyage' },
  
  // ANIMAUX
  { keywords: ['chien', 'chat', 'croquette', 'croquettes', 'veto', 'vétérinaire', 'litiere', 'litière', 'animaux', 'animal'], category: 'Animaux', subCategory: 'Nourriture', moduleSource: 'animaux', label: '🐶 Animaux' },
  
  // ARGENT DE POCHE
  { keywords: ['argent de poche', 'argent-de-poche', 'tirelire', 'allocation', 'recompense', 'récompense'], category: 'Argent de poche', subCategory: 'Allocation enfant', moduleSource: 'argent_de_poche', label: '🪙 Argent de poche' },
  
  // ABONNEMENTS
  { keywords: ['abonnement', 'abonnements', 'forfait', 'netflix', 'spotify', 'disney', 'amazon prime', 'canal', 'youtube premium', 'icloud', 'forfait mobile', 'forfait internet'], category: 'Abonnements', subCategory: 'Streaming', moduleSource: 'budget', label: '🔄 Abonnements' },
  
  // LOISIRS
  { keywords: ['cinema', 'cinéma', 'concert', 'musee', 'musée', 'cadeau', 'cadeaux', 'sport', 'match', 'loisir', 'loisirs'], category: 'Loisirs', subCategory: 'Cinéma', moduleSource: 'budget', label: '🎨 Loisirs' }
];

const cleanLabel = (lbl: string): string => {
  let s = lbl.trim();
  s = s.replace(/^(?:pour\s+l'|pour\s+l’|pour\s+le\s+|pour\s+la\s+|pour\s+les\s+|pour\s+|de\s+la\s+|de\s+l'|de\s+l’|de\s+|du\s+|des\s+|d'|d’|le\s+|la\s+|les\s+|l'|l’|en\s+|a\s+|à\s+)/i, '');
  return s.trim();
};


function App() {
  // Safe localStorage helper functions to prevent corrupt cache startup crashes
  const safeGetLocalStorage = <T,>(key: string, fallback: T): T => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return fallback;
      return JSON.parse(val) as T;
    } catch (e) {
      console.warn(`Error parsing localStorage key "${key}":`, e);
      return fallback;
    }
  };

  const safeSetLocalStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      const backupKeys = [
        'mf_sb_url', 
        'mf_sb_key', 
        'mf_cloud_foyer_id', 
        'mf_cached_foyer', 
        'mf_cached_member_profile',
        'mf_members',
        'mf_active_member_id'
      ];
      if (backupKeys.includes(key)) {
        Preferences.set({ key, value }).catch(err => console.warn(`Native backup error for ${key}:`, err));
      }
    } catch (e) {
      console.warn(`Storage quota exceeded or error saving key "${key}":`, e);
    }
  };

  const safeRemoveLocalStorage = (key: string) => {
    try {
      localStorage.removeItem(key);
      const backupKeys = [
        'mf_sb_url', 
        'mf_sb_key', 
        'mf_cloud_foyer_id', 
        'mf_cached_foyer', 
        'mf_cached_member_profile',
        'mf_members',
        'mf_active_member_id'
      ];
      if (backupKeys.includes(key)) {
        Preferences.remove({ key }).catch(err => console.warn(`Native removal error for ${key}:`, err));
      }
    } catch (e) {
      console.warn(`Error removing key "${key}":`, e);
    }
  };

  // If a cloud foyer was active last session, start empty (cloud data will load)
  const hadCloudFoyer = !!localStorage.getItem('mf_cloud_foyer_id');

  const [members, setMembers] = useState<Member[]>(() => {
    return safeGetLocalStorage('mf_members', []);
  });

  // Auto-clean legacy Papa/Maman mock profiles cache if cloud is active
  useEffect(() => {
    const hasDemoData = () => {
      try {
        const mems = localStorage.getItem('mf_members');
        if (mems) {
          const parsed = JSON.parse(mems);
          return Array.isArray(parsed) && parsed.some(m => m.id === '1' && m.name === 'Papa');
        }
      } catch {
        // Ignore malformed legacy cache and keep the default state.
      }
      return false;
    };

    if (hadCloudFoyer && hasDemoData()) {
      console.log("[MyFamily+] Legacy demo cache detected. Purging cache...");
      const keysToPurge = [
        'mf_members', 'mf_events', 'mf_transactions', 'mf_dishes', 'mf_documents', 
        'mf_tasks', 'mf_groceries', 'mf_vehicles', 'mf_maintenance', 'mf_trips', 
        'mf_pets', 'mf_saving_goals', 'mf_alerts', 'mf_memories', 'mf_votes', 
        'mf_school_tasks', 'mf_chat_groups', 'mf_chat_messages', 'mf_demarches', 
        'mf_packs', 'mf_artisans'
      ];
      keysToPurge.forEach(k => localStorage.removeItem(k));
      setMembers([]);
      setEvents([]);
      setTransactions([]);
      setDishes([]);
      setDocuments([]);
      setTasks([]);
      setGroceries([]);
      setVehicles([]);
      setMaintenance([]);
      setTrips([]);
      setPets([]);
      setPocketMoney([]);
      setSavingGoals([]);
      setAlerts([]);
      setMemories([]);
      setVotes([]);
      setSchoolTasks([]);
      setChatGroups([]);
      setChatMessages([]);
      setDemarches([]);
      setJustificatifPacks([]);
      setArtisans([]);
    }
  }, [hadCloudFoyer]);

  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return localStorage.getItem('mf_active_member_id') || '1';
  });

  const [events, setEvents] = useState<FamilyEvent[]>(() => {
    const loaded = safeGetLocalStorage<FamilyEvent[]>('mf_events', []);
    return loaded.filter(e => !['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].includes(e.id));
  });

  const [calendarSources, setCalendarSources] = useState<CalendarSource[]>(() => {
    const saved = localStorage.getItem('mf_external_calendar_sources');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>(() => {
    const saved = localStorage.getItem('mf_external_calendar_events');
    if (saved) return JSON.parse(saved);
    return [];
  });

  useEffect(() => {
    localStorage.setItem('mf_external_calendar_sources', JSON.stringify(calendarSources));
  }, [calendarSources]);

  useEffect(() => {
    localStorage.setItem('mf_external_calendar_events', JSON.stringify(externalEvents));
  }, [externalEvents]);

  const [currentCalendarCountry, setCurrentCalendarCountry] = useState<string>(() => {
    return localStorage.getItem('mf_calendar_country') || 'France';
  });



  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return safeGetLocalStorage('mf_transactions', []);
  });

  const [dishes, setDishes] = useState<Dish[]>(() => {
    return safeGetLocalStorage('mf_dishes', []);
  });

  const [documents, setDocuments] = useState<DocumentFile[]>(() => {
    return safeGetLocalStorage('mf_documents', []);
  });

  const [memberPermissions, setMemberPermissions] = useState<Record<string, Record<FamilyModule, ModulePermissions>>>(() => {
    return safeGetLocalStorage('mf_member_permissions', {} as Record<string, Record<FamilyModule, ModulePermissions>>);
  });

  const [tasks, setTasks] = useState<ChoreTask[]>(() => {
    return safeGetLocalStorage('mf_tasks', []);
  });

  const [groceries, setGroceries] = useState<GroceryItem[]>(() => {
    return safeGetLocalStorage('mf_groceries', []);
  });
  const [externalGroceryFilter, setExternalGroceryFilter] = useState<'all' | 'pending' | 'checked'>('all');

  const [archivedLists, setArchivedLists] = useState<ArchivedList[]>([]);
  const [initialChatGroupId, setInitialChatGroupId] = useState<string | undefined>(undefined);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    return safeGetLocalStorage('mf_vehicles', []);
  });
  const [maintenance, setMaintenance] = useState<HomeMaintenance[]>(() => {
    return safeGetLocalStorage('mf_maintenance', []);
  });
  const [trips, setTrips] = useState<Trip[]>(() => {
    return safeGetLocalStorage('mf_trips', []);
  });
  const [pets, setPets] = useState<PetRecord[]>(() => {
    return safeGetLocalStorage('mf_pets', []);
  });
  const [pocketMoney, setPocketMoney] = useState<PocketMoneyChild[]>(() => {
    return safeGetLocalStorage('mf_pocket_money', []);
  });
  const [malusTemplates, setMalusTemplates] = useState<MalusTemplate[]>(() => {
    return safeGetLocalStorage('mf_malus_templates', []);
  });
  const [appliedMaluses, setAppliedMaluses] = useState<AppliedMalus[]>(() => {
    return safeGetLocalStorage('mf_applied_maluses', []);
  });

  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>(() => {
    return safeGetLocalStorage('mf_saving_goals', []);
  });



  const [alerts, setAlerts] = useState<NotificationAlert[]>(() => {
    return safeGetLocalStorage('mf_alerts', []);
  });

  const [activeToast, setActiveToast] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  useEffect(() => {
    if (voiceToast) {
      const timer = setTimeout(() => {
        setVoiceToast(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [voiceToast]);

  const [chatGroups, setChatGroups] = useState<ChatGroup[]>(() => {
    return safeGetLocalStorage('mf_chat_groups', []);
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    return safeGetLocalStorage('mf_chat_messages', []);
  });

  const [demarches, setDemarches] = useState<Demarche[]>(() => {
    return safeGetLocalStorage('mf_demarches', []);
  });

  const [artisans, setArtisans] = useState<Artisan[]>(() => {
    return safeGetLocalStorage('mf_artisans', []);
  });

  const [justificatifPacks, setJustificatifPacks] = useState<JustificatifPack[]>(() => {
    return safeGetLocalStorage('mf_packs', []);
  });

  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    return safeGetLocalStorage('mf_custom_categories', []);
  });

  const getMergedCategories = (): { name: string; icon: string; subcategories: string[]; isArchived?: boolean }[] => {
    const merged: Record<string, { name: string; icon: string; subcategories: string[]; isArchived?: boolean }> = {};

    // 1. Add all system default categories
    if (typeof DEFAULT_CATEGORIES !== 'undefined' && Array.isArray(DEFAULT_CATEGORIES)) {
      DEFAULT_CATEGORIES.forEach(cat => {
        merged[cat.name.toLowerCase()] = {
          name: cat.name,
          icon: cat.icon,
          subcategories: [...(cat.sub || [])],
          isArchived: false
        };
      });
    }

    // 2. Merge user custom categories
    if (customCategories && Array.isArray(customCategories)) {
      customCategories.forEach(cat => {
        const key = cat.name.toLowerCase();
        const customSubs = cat.subcategories || [];
        if (merged[key]) {
          const existingSubsLower = new Set(merged[key].subcategories.map(s => s.toLowerCase()));
          customSubs.forEach(sub => {
            if (!existingSubsLower.has(sub.toLowerCase())) {
              merged[key].subcategories.push(sub);
            }
          });
          merged[key].icon = cat.icon || merged[key].icon;
          merged[key].isArchived = cat.isArchived;
        } else {
          merged[key] = {
            name: cat.name,
            icon: cat.icon || '✨',
            subcategories: [...customSubs],
            isArchived: cat.isArchived
          };
        }
      });
    }

    return Object.values(merged);
  };

  const [moduleBudgets, setModuleBudgets] = useState<Record<string, { budget: number; recurrence: string }>>(() => {
    try {
      const cached = localStorage.getItem('mf_module_budgets_global');
      return cached ? JSON.parse(cached) : {
        courses: { budget: 500, recurrence: 'monthly' },
        sante: { budget: 150, recurrence: 'monthly' },
        vehicules: { budget: 200, recurrence: 'monthly' },
        logement: { budget: 800, recurrence: 'monthly' },
        voyages: { budget: 1000, recurrence: 'custom' },
        ecole: { budget: 150, recurrence: 'monthly' },
        demarches: { budget: 100, recurrence: 'monthly' },
        animaux: { budget: 100, recurrence: 'monthly' },
        argent_de_poche: { budget: 50, recurrence: 'monthly' },
        taches: { budget: 50, recurrence: 'monthly' }
      };
    } catch {
      return {
        courses: { budget: 500, recurrence: 'monthly' },
        sante: { budget: 150, recurrence: 'monthly' },
        vehicules: { budget: 200, recurrence: 'monthly' },
        logement: { budget: 800, recurrence: 'monthly' },
        voyages: { budget: 1000, recurrence: 'custom' },
        ecole: { budget: 150, recurrence: 'monthly' },
        demarches: { budget: 100, recurrence: 'monthly' },
        animaux: { budget: 100, recurrence: 'monthly' },
        argent_de_poche: { budget: 50, recurrence: 'monthly' },
        taches: { budget: 50, recurrence: 'monthly' }
      };
    }
  });
  const [accounts, setAccounts] = useState<Account[]>(() => {
    return safeGetLocalStorage('mf_accounts', []);
  });
  const [abonnements, setAbonnements] = useState<Abonnement[]>(() => {
    return safeGetLocalStorage('mf_abonnements', []);
  });
  const [debts, setDebts] = useState<Debt[]>(() => {
    return safeGetLocalStorage('mf_debts', []);
  });

  const [isSyncReady, setIsSyncReady] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(false);
  const [agendaSelectedDate, setAgendaSelectedDate] = useState<string>('');

  // Settings State
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('mf_currency') || 'EUR (€)';
  });
  const [supabaseUrl] = useState(() => {
    const raw = (getConfiguredSupabaseUrl() || localStorage.getItem('mf_sb_url') || '').trim();
    return raw.replace(/^['"]|['"]$/g, '');
  });
  const [supabaseKey] = useState(() => {
    const raw = (getConfiguredSupabaseAnonKey() || localStorage.getItem('mf_sb_key') || '').trim();
    return raw.replace(/^['"]|['"]$/g, '');
  });
  const [syncActive, setSyncActive] = useState(() => {
    const cached = localStorage.getItem('mf_sync_active');
    if (cached !== null) return cached === 'true';
    const envUrl = getConfiguredSupabaseUrl().trim();
    const envKey = getConfiguredSupabaseAnonKey().trim();
    return !!(envUrl && envKey && envKey.replace(/^['"]|['"]$/g, '').startsWith('eyJ'));
  });

  // Universal space management states
  const [establishments, setEstablishments] = useState<Space[]>([]);
  const [activeEstablishmentId, setActiveEstablishmentId] = useState<string>('');
  const [communes, setCommunes] = useState<Space[]>([]);
  const [activeCommuneId, setActiveCommuneId] = useState<string>('');
  const [spaceSelectorOpen, setSpaceSelectorOpen] = useState(false);

  // New modules states
  const [memories, setMemories] = useState<MemoryLog[]>(() => {
    return removeLegacyDemoMemories(safeGetLocalStorage('mf_memories', []));
  });

  const [votes, setVotes] = useState<FamilyVote[]>(() => {
    return safeGetLocalStorage('mf_votes', []);
  });

  const [schoolTasks, setSchoolTasksState] = useState<SchoolTask[]>(() => {
    const activeEstId = localStorage.getItem('mf_active_establishment_id') || 'est-1';
    return removeLegacyDemoSchoolTasks(spaceService.getSchoolTasksForEstablishment(activeEstId));
  });

  const setSchoolTasks = (actionOrUpdater: SchoolTask[] | ((prev: SchoolTask[]) => SchoolTask[])) => {
    setSchoolTasksState((prev: SchoolTask[]) => {
      const next = typeof actionOrUpdater === 'function' ? actionOrUpdater(prev) : actionOrUpdater;
      const added = next.filter(n => !prev.some(p => p.id === n.id));
      added.forEach(t => {
        sendLocalNotification(
          "Nouveau devoir assigné",
          `📚 Le devoir de ${t.subject} "${t.title}" a été ajouté pour ${members.find(m => m.id === t.assignedMemberId)?.name || 'un élève'}.`,
          "ecole"
        );
      });
      return next;
    });
  };

  const [grades, setGrades] = useState<LooseValue[]>(() => {
    const activeEstId = localStorage.getItem('mf_active_establishment_id') || 'est-1';
    return spaceService.getGradesForEstablishment(activeEstId);
  });

  const [schedule, setSchedule] = useState<LooseValue[]>(() => {
    const activeEstId = localStorage.getItem('mf_active_establishment_id') || 'est-1';
    return spaceService.getScheduleForEstablishment(activeEstId);
  });

  const prevEstIdRef = useRef(activeEstablishmentId);

  useEffect(() => {
    if (activeEstablishmentId && activeEstablishmentId !== prevEstIdRef.current) {
      if (prevEstIdRef.current) {
        spaceService.saveGradesForEstablishment(prevEstIdRef.current, grades);
        spaceService.saveScheduleForEstablishment(prevEstIdRef.current, schedule);
        spaceService.saveSchoolTasksForEstablishment(prevEstIdRef.current, schoolTasks);
      }

      const nextGrades = spaceService.getGradesForEstablishment(activeEstablishmentId);
      const nextSchedule = spaceService.getScheduleForEstablishment(activeEstablishmentId);
      const nextTasks = spaceService.getSchoolTasksForEstablishment(activeEstablishmentId);

      setGrades(nextGrades);
      setSchedule(nextSchedule);
      setSchoolTasksState(nextTasks);

      prevEstIdRef.current = activeEstablishmentId;

      const currentEst = establishments.find(e => e.id === activeEstablishmentId);
      if (currentEst) {
        setSchoolName(currentEst.name);
      }
    }
  }, [activeEstablishmentId, establishments]);

  useEffect(() => {
    if (activeEstablishmentId) {
      spaceService.saveGradesForEstablishment(activeEstablishmentId, grades);
    }
  }, [grades, activeEstablishmentId]);

  useEffect(() => {
    if (activeEstablishmentId) {
      spaceService.saveScheduleForEstablishment(activeEstablishmentId, schedule);
    }
  }, [schedule, activeEstablishmentId]);

  useEffect(() => {
    if (activeEstablishmentId) {
      spaceService.saveSchoolTasksForEstablishment(activeEstablishmentId, schoolTasks);
    }
  }, [schoolTasks, activeEstablishmentId]);

  useEffect(() => {
    spaceService.getEstablishments().then(setEstablishments);
    const activeEstId = spaceService.getActiveEstablishmentId();
    setActiveEstablishmentId(activeEstId);

    spaceService.getCommunes().then(setCommunes);
    const activeComId = spaceService.getActiveCommuneId();
    setActiveCommuneId(activeComId);
  }, []);

  useEffect(() => {
    if (activeCommuneId) {
      const currentCom = communes.find(c => c.id === activeCommuneId);
      if (currentCom) {
        setCommuneName(currentCom.name);
      }
    }
  }, [activeCommuneId, communes]);


  const vaccines = useMemo(() => {
    return events
      .filter(e => e.type === 'vaccine')
      .map(e => {
        const { description, metadata } = deserializeEventDescription(e.description);
        return {
          id: e.id,
          memberId: e.memberId || '1',
          name: e.title,
          date: e.dateTime ? e.dateTime.split('T')[0] : '',
          status: metadata.isArchived ? 'Archivé' : (e.done ? 'Fait' : 'À faire'),
          doctor: metadata.doctor || description || 'Médecin traitant',
          time: e.time || '',
          reminder: metadata.reminder || '',
          note: metadata.note || '',
          documentUrl: metadata.documentUrl || '',
          isArchived: !!metadata.isArchived
        };
      });
  }, [events]);

  const setVaccines = async (actionOrUpdater: LooseValue) => {
    let nextVaccines: LooseValue[] = [];
    const currentVaccines = events
      .filter(e => e.type === 'vaccine')
      .map(e => {
        const { description, metadata } = deserializeEventDescription(e.description);
        return {
          id: e.id,
          memberId: e.memberId || '1',
          name: e.title,
          date: e.dateTime ? e.dateTime.split('T')[0] : '',
          status: metadata.isArchived ? 'Archivé' : (e.done ? 'Fait' : 'À faire'),
          doctor: metadata.doctor || description || 'Médecin traitant',
          time: e.time || '',
          reminder: metadata.reminder || '',
          note: metadata.note || '',
          documentUrl: metadata.documentUrl || '',
          isArchived: !!metadata.isArchived
        };
      });

    if (typeof actionOrUpdater === 'function') {
      nextVaccines = actionOrUpdater(currentVaccines);
    } else {
      nextVaccines = actionOrUpdater;
    }

    nextVaccines = nextVaccines.filter(v => !['v1', 'v2', 'v3', 'v4'].includes(v.id));

    const added = nextVaccines.filter((nv: DbRow) => !currentVaccines.some((cv: LooseValue) => cv.id === nv.id));
    const deleted = currentVaccines.filter((cv: DbRow) => !nextVaccines.some((nv: LooseValue) => nv.id === cv.id));
    const updated = nextVaccines.filter((nv: DbRow) => {
      const cv = currentVaccines.find((c: DbRow) => c.id === nv.id);
      return cv && (
        cv.status !== nv.status ||
        cv.date !== nv.date ||
        cv.name !== nv.name ||
        cv.doctor !== nv.doctor ||
        cv.time !== nv.time ||
        cv.reminder !== nv.reminder ||
        cv.note !== nv.note ||
        cv.documentUrl !== nv.documentUrl ||
        cv.memberId !== nv.memberId
      );
    });

    const client = getSupabaseClient();

    for (const v of added) {
      const newEvent: FamilyEvent = {
        id: v.id,
        title: v.name,
        type: 'vaccine',
        dateTime: v.time ? `${v.date}T${v.time}:00` : `${v.date}T00:00:00`,
        time: v.time || '',
        memberId: v.memberId,
        memberName: members.find(m => m.id === v.memberId)?.name || 'Membre',
        done: v.status === 'Fait',
        description: serializeEventDescription(v.doctor || '', {
          doctor: v.doctor || '',
          reminder: v.reminder || '',
          note: v.note || '',
          documentUrl: v.documentUrl || '',
          isArchived: v.status === 'Archivé'
        })
      };
      setEvents(prev => [newEvent, ...prev]);
      sendLocalNotification(
        "Vaccin planifié",
        `💉 Le vaccin "${v.name}" a été planifié pour ${members.find(m => m.id === v.memberId)?.name || 'un membre'}.`,
        "sante"
      );
      if (client && foyer) {
        try {
          await client.from('events').insert({
            id: newEvent.id,
            foyer_id: foyer.id,
            title: newEvent.title,
            type: newEvent.type,
            date_time: newEvent.dateTime,
            time: newEvent.time,
            member_id: newEvent.memberId,
            member_name: newEvent.memberName,
            description: newEvent.description,
            done: newEvent.done
          });
        } catch (err) {
          console.error("Error inserting vaccine event:", err);
        }
      }
    }

    for (const v of deleted) {
      setEvents(prev => prev.filter(e => e.id !== v.id));
      if (client && foyer) {
        try {
          await client.from('events').delete().eq('foyer_id', foyer.id).eq('id', v.id);
        } catch (err) {
          console.error("Error deleting vaccine event:", err);
        }
      }
    }

    for (const v of updated) {
      const updatedDescription = serializeEventDescription(v.doctor || '', {
        doctor: v.doctor || '',
        reminder: v.reminder || '',
        note: v.note || '',
        documentUrl: v.documentUrl || '',
        isArchived: v.status === 'Archivé'
      });
      const updatedTime = v.time || '';
      const updatedDateTime = v.time ? `${v.date}T${v.time}:00` : `${v.date}T00:00:00`;

      setEvents(prev => prev.map(e => e.id === v.id ? {
        ...e,
        title: v.name,
        dateTime: updatedDateTime,
        time: updatedTime,
        memberId: v.memberId,
        memberName: members.find(m => m.id === v.memberId)?.name || 'Membre',
        done: v.status === 'Fait',
        description: updatedDescription
      } : e));

      if (client && foyer) {
        try {
          await client.from('events').update({
            title: v.name,
            date_time: updatedDateTime,
            time: updatedTime,
            member_id: v.memberId,
            member_name: members.find(m => m.id === v.memberId)?.name || 'Membre',
            done: v.status === 'Fait',
            description: updatedDescription
          }).eq('foyer_id', foyer.id).eq('id', v.id);
        } catch (err) {
          console.error("Error updating vaccine event:", err);
        }
      }
    }
  };


  const [memberMoods, setMemberMoods] = useState<Record<string, string>>(() => {
    return safeGetLocalStorage('mf_moods', { '1': '☀️', '2': '☀️', '3': '🌈', '4': '☁️' });
  });

  // Navigation and Sheets UI State
  const [activeTab, setActiveTab] = useState('accueil');
  const [budgetActiveSubView, setBudgetActiveSubView] = useState<{ type: 'export' | 'import' | 'transaction_form' | 'tab', options?: LooseValue, tab?: string } | null>(null);

  const [activeModule, rawSetActiveModule] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [deletedAlertIds, setDeletedAlertIds] = useState<string[]>(() => {
    try {
      const key = `mf_deleted_alerts_${activeMemberId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  });
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    try {
      const key = `mf_read_alerts_${activeMemberId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  });
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);
  const [pinVerificationOpen, setPinVerificationOpen] = useState(false);
  const [pinTargetMemberId, setPinTargetMemberId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState('Code PIN incorrect');
  const [sharedPackId, setSharedPackId] = useState<string | null>(null);



  // React Refs to keep subscriptions updated and prevent stale closures
  const activeMemberIdRef = useRef(activeMemberId);
  const membersRef = useRef(members);
  const syncSessionIdRef = useRef(0);
  const pendingPinActionRef = useRef<(() => void | Promise<void>) | null>(null);

  useEffect(() => {
    localStorage.removeItem('mf_parent_pin');
  }, []);

  useEffect(() => {
    activeMemberIdRef.current = activeMemberId;
  }, [activeMemberId]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  // PWA Install Prompt States
  const [deferredPrompt, setDeferredPrompt] = useState<LooseValue>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);





  // Listen for PWA installation events
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setShowInstallPrompt(false);
      setShowIosGuide(false);
      return;
    }

    // Detect if app is already run in standalone (PWA installed) mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as LooseValue).standalone === true;
    if (isStandalone) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed it in this browser session
      if (!sessionStorage.getItem('mf_pwa_dismissed')) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show installation guidelines after 4 seconds if not dismissed
    if (isIosDevice && !sessionStorage.getItem('mf_pwa_dismissed')) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 4000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      setShowInstallPrompt(false);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowInstallPrompt(false);
        }
      } catch (err) {
        console.error("Installation choice failed:", err);
      }
    } else {
      // Fallback guide for other browsers
      alert("Pour installer MyFamily+ sur votre écran d'accueil :\n1. Cliquez sur le bouton Menu de votre navigateur (3 points ou bouton de partage).\n2. Sélectionnez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
    }
  };

  const saveAlertToCloud = async (alert: NotificationAlert) => {
    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').upsert({
          id: alert.id,
          foyer_id: foyer.id,
          title: alert.title,
          description: alert.description,
          time: alert.time,
          type: alert.type,
          read: alert.read,
          module: alert.module,
          sender_user_id: alert.senderUserId || user?.id,
          sender_member_id: alert.senderMemberId || myMemberProfile?.id,
          sender_name: alert.senderName || myMemberProfile?.displayName,
          sender_avatar: alert.senderAvatar || myMemberProfile?.photoUrl
        });
        console.log(`[Supabase Alerts] Alert successfully synchronized to cloud: ${alert.title}`);
      }
    } catch (err) {
      console.error("[Supabase Alerts] Failed to save alert to cloud:", err);
    }
  };

  const updateAlertReadStatusInCloud = async (alertId: string, read: boolean) => {
    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').update({ read }).eq('foyer_id', foyer.id).eq('id', alertId);
        console.log(`[Supabase Alerts] Alert read status updated to ${read} in cloud for ID: ${alertId}`);
      }
    } catch (err) {
      console.error("[Supabase Alerts] Failed to update read status in cloud:", err);
    }
  };

  const markAllAlertsAsReadInCloud = async () => {
    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').update({ read: true }).eq('foyer_id', foyer.id);
        console.log(`[Supabase Alerts] All alerts marked as read in cloud`);
      }
    } catch (err) {
      console.error("[Supabase Alerts] Failed to mark all alerts as read in cloud:", err);
    }
  };

  async function sendLocalNotification(title: string, description: string, moduleName?: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') {
    const newAlert: NotificationAlert = {
      id: crypto.randomUUID() + `-by-${activeMemberId}`,
      title,
      description,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false,
      module: moduleName,
      senderUserId: user?.id || undefined,
      senderMemberId: activeMemberId,
      senderName: myMemberProfile?.displayName || 'Membre',
      senderAvatar: myMemberProfile?.photoUrl || undefined,
      createdAt: new Date().toISOString()
    };

    setAlerts(prev => [newAlert, ...prev]);

    setActiveToast({
      title: newAlert.title,
      description: getCleanDescription(newAlert.description)
    });

    await saveAlertToCloud(newAlert);
  }

  const handleDeleteUnifiedEvent = async (id: string, moduleName: string) => {
    const rawId = id.replace(/^(agenda|trip-dep|trip-ret|trip|demarche|school-task|school|task|vac|pet-vac|pet-vet|abo|tx-rec|vehicle-tc|vehicle-ins|veh-tc|veh-ins|maint|maintenance)-/, '');
    const client = getSupabaseClient();
    
    if (moduleName === 'agenda') {
      setEvents(prev => prev.filter(e => e.id !== rawId));
      if (client) await client.from('events').delete().eq('id', rawId);
    } else if (moduleName === 'voyages') {
      if (window.confirm("Voulez-vous supprimer ce projet de voyage ?")) {
        const deleteExpenses = window.confirm(
          "Voulez-vous également SUPPRIMER toutes les dépenses liées à ce voyage ?\n\n(Cliquez sur 'Annuler' pour CONSERVER les dépenses en retirant simplement leur lien avec ce voyage)"
        );
        
        setTrips(prev => prev.filter(t => t.id !== rawId));
        if (client) await client.from('trips').delete().eq('id', rawId);
        
        if (deleteExpenses) {
          setTransactions(prev => prev.filter(tx => tx.travel_id !== rawId && tx.travelId !== rawId));
          if (client) await client.from('transactions').delete().eq('travel_id', rawId);
        } else {
          setTransactions(prev => prev.map(tx => {
            if (tx.travel_id === rawId || tx.travelId === rawId) {
              const cleanedComment = tx.comment ? tx.comment.replace(/__METADATA__:.*$/, '').trim() : '';
              return { ...tx, travel_id: undefined, travelId: undefined, comment: cleanedComment };
            }
            return tx;
          }));
          if (client) {
            client.from('transactions').select('*').eq('travel_id', rawId).then(({ data }) => {
              if (data) {
                data.forEach(async (row: DbRow) => {
                  const cleanedComment = row.comment ? row.comment.replace(/__METADATA__:.*$/, '').trim() : '';
                  await client.from('transactions').update({
                    travel_id: null,
                    comment: cleanedComment
                  }).eq('id', row.id);
                });
              }
            });
          }
        }
      }
    } else if (moduleName === 'demarches') {
      setDemarches(prev => prev.filter(d => d.id !== rawId));
      if (client) await client.from('demarches').delete().eq('id', rawId);
    } else if (moduleName === 'ecole') {
      setSchoolTasksState(prev => prev.filter(st => st.id !== rawId));
      if (client) await client.from('school_tasks').delete().eq('id', rawId);
    } else if (moduleName === 'taches') {
      setTasks(prev => prev.filter(tk => tk.id !== rawId));
      if (client) await client.from('chore_tasks').delete().eq('id', rawId);
    } else if (moduleName === 'sante') {
      setEvents(prev => prev.filter(e => e.id !== rawId));
      if (client) await client.from('events').delete().eq('id', rawId);
    } else if (moduleName === 'logement') {
      setMaintenance(prev => prev.filter(m => m.id !== rawId));
      if (client) await client.from('maintenance').delete().eq('id', rawId);
    } else if (moduleName === 'budget') {
      const baseAboId = rawId.split('-')[0];
      if (id.startsWith('tx-rec-')) {
        setTransactions(prev => prev.filter(t => t.id !== baseAboId));
        if (client) await client.from('transactions').delete().eq('id', baseAboId);
      } else {
        setAbonnements(prev => prev.filter(a => a.id !== baseAboId));
        if (client) await client.from('abonnements').delete().eq('id', baseAboId);
      }
    } else if (moduleName === 'animaux') {
      const isVac = id.startsWith('pet-vac-');
      const isVet = id.startsWith('pet-vet-');
      setPets(prev => prev.map(p => {
        if (p.id !== rawId) return p;
        return {
          ...p,
          nextVaccine: isVac ? "" : p.nextVaccine,
          vetAppointment: isVet ? "" : p.vetAppointment
        };
      }));
      if (client) {
        const updateData: DbRow = {};
        if (isVac) updateData.next_vaccine = null;
        if (isVet) updateData.vet_appointment = null;
        await client.from('pets').update(updateData).eq('id', rawId);
      }
    } else if (moduleName === 'vehicules') {
      const isTc = id.startsWith('veh-tc-');
      const isIns = id.startsWith('veh-ins-');
      setVehicles(prev => prev.map(v => {
        if (v.id !== rawId) return v;
        return {
          ...v,
          technicalControl: isTc ? "" : v.technicalControl,
          insuranceExpiry: isIns ? "" : v.insuranceExpiry
        };
      }));
      if (client) {
        const updateData: DbRow = {};
        if (isTc) updateData.technical_control = null;
        if (isIns) updateData.insurance_expiry = null;
        await client.from('vehicles').update(updateData).eq('id', rawId);
      }
    }
  };

  const handleArchiveUnifiedEvent = async (id: string, moduleName: string) => {
    const rawId = id.replace(/^(agenda|trip-dep|trip-ret|trip|demarche|school-task|school|task|vac|pet-vac|pet-vet|abo|vehicle-tc|vehicle-ins|veh-tc|veh-ins|maint|maintenance)-/, '');
    const client = getSupabaseClient();

    if (moduleName === 'agenda') {
      setEvents(prev => prev.map(e => e.id === rawId ? { ...e, done: true } : e));
      if (client) await client.from('events').update({ done: true }).eq('id', rawId);
    } else if (moduleName === 'demarches') {
      setDemarches(prev => prev.map(d => d.id === rawId ? { ...d, status: 'archived' as LooseValue } : d));
      if (client) await client.from('demarches').update({ status: 'archived' }).eq('id', rawId);
    } else if (moduleName === 'ecole') {
      setSchoolTasksState(prev => prev.map(st => st.id === rawId ? { ...st, done: true, grade: 'Validé' } : st));
      if (client) await client.from('school_tasks').update({ done: true, grade: 'Validé' }).eq('id', rawId);
    } else if (moduleName === 'taches') {
      setTasks(prev => prev.map(tk => tk.id === rawId ? { ...tk, done: true, validatedByParent: true } : tk));
      if (client) await client.from('chore_tasks').update({ done: true, validated_by_parent: true }).eq('id', rawId);
    } else if (moduleName === 'sante') {
      setEvents(prev => prev.map(e => e.id === rawId ? { ...e, done: true } : e));
      if (client) await client.from('events').update({ done: true }).eq('id', rawId);
    } else if (moduleName === 'logement') {
      setMaintenance(prev => prev.map(m => m.id === rawId ? { ...m, status: 'completed' as LooseValue } : m));
      if (client) await client.from('maintenance').update({ status: 'completed' }).eq('id', rawId);
    } else if (moduleName === 'voyages') {
      const activeFoyerId = foyer?.id || 'default';
      const key = `mf_archived_trips_${activeFoyerId}`;
      let archivedIds: string[] = [];
      try {
        archivedIds = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {
        // Ignore malformed archived-trip cache.
      }
      if (!archivedIds.includes(rawId)) {
        archivedIds.push(rawId);
        localStorage.setItem(key, JSON.stringify(archivedIds));
      }
      setTrips(prev => [...prev]);
    }
  };

  // Voice Command Assistant State
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [voiceWave, setVoiceWave] = useState(false);
  const [manualVoiceCommand, setManualVoiceCommand] = useState('');
  const [voiceAmbiguous, setVoiceAmbiguous] = useState(false);
  const [ambiguousChoices, setAmbiguousChoices] = useState<{ moduleSource: string; category: string; subCategory: string; label: string }[]>([]);
  const [voiceAmbiguousTravel, setVoiceAmbiguousTravel] = useState(false);
  const [ambiguousTravelChoices, setAmbiguousTravelChoices] = useState<{ id: string; destination: string; label: string; action: 'link' | 'create' | 'global' }[]>([]);
  const [pendingVoiceCommandData, setPendingVoiceCommandData] = useState<LooseValue | null>(null);
  const [voiceDebugInfo, setVoiceDebugInfo] = useState<{
    phrase: string;
    type: string;
    amount: string;
    category: string;
    subCategory: string;
    module: string;
    recurrence?: string;
    member?: string;
  } | null>(null);
  const [voiceTransactionAdded, setVoiceTransactionAdded] = useState<{
    type: 'expense' | 'income';
    amount: number;
    category: string;
    subCategory?: string;
    accountName: string;
  } | null>(null);
  const [devModeActive, setDevModeActive] = useState(() => localStorage.getItem('mf_dev_mode') === 'true');
  const devClicks = useRef(0);
  const [voiceDebugTrace, setVoiceDebugTrace] = useState<LooseValue | null>(null);
  if (voiceDebugTrace) { console.debug("voiceDebugTrace", voiceDebugTrace); }
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'asking_missing_field' | 'waiting_for_answer' | 'executing' | 'success' | 'error' | 'inactif' | 'ecoute' | 'traitement' | 'confirmation' | 'termine' | 'erreur'>('idle');
  const voiceTimeoutRef = useRef<LooseValue>(null);
  const voiceRecognitionRef = useRef<LooseValue>(null);
  const [pendingGroceryItems, setPendingGroceryItems] = useState<LooseValue[] | null>(null);
  const [isEditingPendingGrocery, setIsEditingPendingGrocery] = useState(false);

  // Context states for conversational voice assistant
  const [voiceContext, setVoiceContext] = useState<{
    pendingAction: 'create_trip' | string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    expenseTitle?: string;
    expenseAmount?: number;
    missingField?: 'destination' | 'budget' | 'date' | string;
    remainingSegments?: string[];
    lastActiveTime: number;
  } | null>(null);

  const [lastCreatedTrip, setLastCreatedTrip] = useState<{ id: string; destination: string } | null>(null);
  const [showGroceryPopup, setShowGroceryPopup] = useState(false);

  const parseVoiceCommandRef = useRef<LooseValue>(null);
  const voiceActionStatusRef = useRef<'waiting' | 'processing' | 'completed'>('waiting');
  const voiceInactivityTimerRef = useRef<LooseValue>(null);
  const voiceActiveRef = useRef(voiceActive);
  const voiceStateRef = useRef(voiceState);
  const voiceContextRef = useRef(voiceContext);
  useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);
  useEffect(() => { voiceContextRef.current = voiceContext; }, [voiceContext]);

  const [foyer, setFoyer] = useState<Foyer | null>(() => {
    return safeGetLocalStorage<Foyer | null>('mf_cached_foyer', null);
  });
  const foyerRef = useRef<Foyer | null>(foyer);
  useEffect(() => {
    foyerRef.current = foyer;
    if (foyer) {
      safeSetLocalStorage('mf_cached_foyer', JSON.stringify(foyer));
    } else {
      safeRemoveLocalStorage('mf_cached_foyer');
    }
  }, [foyer]);

  // Auto-initialize pocket money records for kids/teens
  useEffect(() => {
    if (!isSyncReady || !foyer || !members.length) return;
    
    // Find children/teens who don't have a pocket money record
    const kids = members.filter(m => {
      const r = (m.role || '').toLowerCase();
      return !['chef de famille', 'chef_famille', 'gestionnaire', 'admin', 'parent'].includes(r) && m.id !== '1' && m.id !== '2';
    });

    const missingKids = kids.filter(k => !pocketMoney.some(pm => pm.id === k.id));

    if (missingKids.length > 0) {
      const newPmRecords = missingKids.map(k => ({
        id: k.id,
        name: k.name,
        balance: 0,
        points: 0,
        avatar: k.photoUrl || ''
      }));

      // Update state
      setPocketMoney(prev => [...prev, ...newPmRecords]);

      // Insert into Supabase
      const client = getSupabaseClient();
      if (client) {
        Promise.all(newPmRecords.map(pm => {
          return client.from('pocket_money').insert({
            id: pm.id,
            foyer_id: foyer.id,
            name: pm.name,
            balance: 0,
            points: 0,
            avatar: pm.avatar
          });
        })).catch(err => {
          console.error("Failed to seed missing pocket money records:", err);
        });
      }
    }
  }, [isSyncReady, foyer, members, pocketMoney]);

  const [hasCheckedDefaultRewards, setHasCheckedDefaultRewards] = useState(false);

  useEffect(() => {
    if (!foyer) return;
    if (hasCheckedDefaultRewards) return;

    // Check if we already have default boutique_rewards seeded
    const hasDefaultRewards = (savingGoals || []).some(sg => sg.id.startsWith('sg-def-'));
    if (!hasDefaultRewards) {
      const defaults = [
        { title: "30 min console", points: 50, money: 5, icon: "🎮", cat: "Écran" },
        { title: "1h console", points: 100, money: 10, icon: "🎮", cat: "Écran" },
        { title: "Choisir le menu du soir", points: 20, money: 2, icon: "🍽️", cat: "Privilège" },
        { title: "Pizza maison", points: 30, money: 3, icon: "🍕", cat: "Repas" },
        { title: "Glace", points: 15, money: 1.5, icon: "🍦", cat: "Gourmandise" },
        { title: "Bonbons", points: 10, money: 1, icon: "🍬", cat: "Gourmandise" },
        { title: "Cinéma en famille", points: 150, money: 15, icon: "🍿", cat: "Sortie" },
        { title: "Piscine", points: 80, money: 8, icon: "🏊", cat: "Sortie" },
        { title: "Bowling", points: 100, money: 10, icon: "🎳", cat: "Sortie" },
        { title: "Inviter un ami", points: 40, money: 4, icon: "👥", cat: "Privilège" },
        { title: "Veillée +30 min", points: 30, money: 3, icon: "⏰", cat: "Privilège" },
        { title: "Choisir le film familial", points: 20, money: 2, icon: "🎬", cat: "Privilège" },
        { title: "Livre", points: 60, money: 6, icon: "📚", cat: "Cadeau" },
        { title: "Jouet", points: 120, money: 12, icon: "🧸", cat: "Cadeau" },
        { title: "Carte cadeau", points: 200, money: 20, icon: "💳", cat: "Cadeau" }
      ];

      const defaultRewardsList: SavingGoal[] = defaults.map((item, idx) => ({
        id: `sg-def-${foyer.id}-${idx + 1}`,
        title: item.title,
        targetAmount: item.points,
        currentAmount: 0,
        targetDate: '',
        category: 'boutique_reward',
        contributions: [
          {
            costPoints: item.points,
            costMoney: item.money,
            icon: item.icon,
            subCategory: item.cat,
            avail: true,
            validationRequired: true,
            modifiable: true,
            supprimable: true
          } as LooseValue
        ]
      }));

      console.log("[MyFamily+ Boutique] Populating default rewards...");
      setSavingGoals(prev => [...prev, ...defaultRewardsList]);

      const client = getSupabaseClient();
      if (client && foyer.id) {
        Promise.all(defaultRewardsList.map(sg => {
          return client.from('saving_goals').insert({
            id: sg.id,
            foyer_id: foyer.id,
            title: sg.title,
            target_amount: sg.targetAmount,
            current_amount: sg.currentAmount,
            target_date: sg.targetDate,
            category: sg.category,
            contributions: sg.contributions
          });
        })).then(() => {
          console.log("[MyFamily+ Boutique] Default rewards successfully uploaded to Supabase.");
        }).catch(err => {
          console.error("[MyFamily+ Boutique] Error uploading default rewards:", err);
        });
      }
      setHasCheckedDefaultRewards(true);
    } else {
      setHasCheckedDefaultRewards(true);
    }
  }, [foyer, savingGoals, hasCheckedDefaultRewards]);

  useEffect(() => {
    setVoiceContext(null);
    setLastCreatedTrip(null);
    voiceActionStatusRef.current = 'waiting';
  }, [foyer?.id, activeMemberId]);

  useEffect(() => {
    syncExternalCalendarEventsForReminders({
      foyer,
      activeMemberId,
      calendarSources,
      externalEvents
    });
  }, [foyer, activeMemberId, calendarSources, externalEvents]);

  const [myMemberProfile, setMyMemberProfile] = useState<FoyerMember | null>(() => {
    return safeGetLocalStorage<FoyerMember | null>('mf_cached_member_profile', null);
  });
  const myMemberProfileRef = useRef<FoyerMember | null>(myMemberProfile);
  useEffect(() => {
    myMemberProfileRef.current = myMemberProfile;
    if (myMemberProfile) {
      safeSetLocalStorage('mf_cached_member_profile', JSON.stringify(myMemberProfile));
    } else {
      safeRemoveLocalStorage('mf_cached_member_profile');
    }
  }, [myMemberProfile]);

  const [myFoyers, setMyFoyers] = useState<Array<{ foyer: Foyer; member: FoyerMember }>>([]);
  const [myActiveRequest, setMyActiveRequest] = useState<FamilyJoinRequest | null>(null);
  const [showRequestInterceptor, setShowRequestInterceptor] = useState(true);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);

  const [defaultFamilyId, setDefaultFamilyId] = useState<string | null>(() => localStorage.getItem('mf_default_family_id'));
  const [welcomeScreenMode, setWelcomeScreenMode] = useState<'select' | 'create' | 'join' | 'success'>('select');
  const [welcomeCreatedFoyer, setWelcomeCreatedFoyer] = useState<Foyer | null>(null);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [welcomeInviteCode, setWelcomeInviteCode] = useState("");
  const [welcomeDisplayName, setWelcomeDisplayName] = useState("");
  const [welcomeRole, setWelcomeRole] = useState<'parent' | 'child' | 'guest'>('parent');
  const [communeName, setCommuneName] = useState("Commune à configurer");
  const [schoolName, setSchoolName] = useState("Collège Victor Hugo");

  const unifiedEvents = useMemo(() => {
    return getUnifiedEvents({
      events,
      members,
      trips,
      vaccines,
      schoolTasks,
      tasks,
      demarches,
      vehicles,
      maintenance,
      abonnements,
      pets,
      externalEvents,
      country: currentCalendarCountry,
      foyerId: foyer?.id,
      transactions
    });
  }, [
    events,
    members,
    trips,
    vaccines,
    schoolTasks,
    tasks,
    demarches,
    vehicles,
    maintenance,
    abonnements,
    pets,
    externalEvents,
    currentCalendarCountry,
    foyer?.id,
    transactions
  ]);

  useEffect(() => {
    safeSetLocalStorage('mf_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    if (!foyer) return;
    const checkExpiringItems = async () => {
      try {
        const foyerId = foyer.id;
        const storageKey = `mf_alerted_expiries_${foyerId}`;
        let alertedIds: string[] = [];
        try {
          alertedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch {
          // Ignore malformed expiry-alert cache.
        }
        const newAlertedIds = [...alertedIds];
        let changed = false;
        const now = new Date();

        // 1. Check documents
        if (Array.isArray(documents)) {
          documents.forEach(doc => {
            if (doc.expiryDate) {
              const exp = new Date(doc.expiryDate);
              if (!isNaN(exp.getTime())) {
                const diffTime = exp.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const alertKey = `doc-${doc.id}-${doc.expiryDate}`;
                if (diffDays >= 0 && diffDays <= 30 && !alertedIds.includes(alertKey)) {
                  sendLocalNotification(
                    "⚠️ Document expirant bientôt",
                    `Le document "${doc.name}" pour ${doc.memberName || 'un membre'} expire le ${doc.expiryDate} (dans ${diffDays} jours).`,
                    "documents",
                    "warning"
                  );
                  newAlertedIds.push(alertKey);
                  changed = true;
                }
              }
            }
          });
        }

        // 2. Check vehicles (technicalControl & insuranceExpiry)
        if (Array.isArray(vehicles)) {
          vehicles.forEach(v => {
            if (v.technicalControl) {
              const tc = new Date(v.technicalControl);
              if (!isNaN(tc.getTime())) {
                const diffTime = tc.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const alertKey = `veh-tc-${v.id}-${v.technicalControl}`;
                if (diffDays >= 0 && diffDays <= 30 && !alertedIds.includes(alertKey)) {
                  sendLocalNotification(
                    "⚠️ Contrôle technique proche",
                    `Le contrôle technique pour le véhicule "${v.name}" (${v.plate}) arrive à échéance le ${v.technicalControl} (dans ${diffDays} jours).`,
                    "vehicules",
                    "warning"
                  );
                  newAlertedIds.push(alertKey);
                  changed = true;
                }
              }
            }

            if (v.insuranceExpiry) {
              const ins = new Date(v.insuranceExpiry);
              if (!isNaN(ins.getTime())) {
                const diffTime = ins.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const alertKey = `veh-ins-${v.id}-${v.insuranceExpiry}`;
                if (diffDays >= 0 && diffDays <= 30 && !alertedIds.includes(alertKey)) {
                  sendLocalNotification(
                    "⚠️ Échéance d'assurance proche",
                    `L'assurance pour le véhicule "${v.name}" (${v.plate}) expire le ${v.insuranceExpiry} (dans ${diffDays} jours).`,
                    "vehicules",
                    "warning"
                  );
                  newAlertedIds.push(alertKey);
                  changed = true;
                }
              }
            }
          });
        }

        // 3. Check member birthdays
        if (Array.isArray(members)) {
          members.forEach(m => {
            if (m.birthDate) {
              try {
                // Parse birthDate which can be YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY
                let bMonth = -1;
                let bDay = -1;
                
                if (m.birthDate.includes('/')) {
                  const parts = m.birthDate.split('/');
                  if (parts.length === 3) {
                    if (parts[2].length === 4) { // DD/MM/YYYY
                      bDay = parseInt(parts[0]);
                      bMonth = parseInt(parts[1]) - 1;
                    } else if (parts[0].length === 4) { // YYYY/MM/DD
                      bMonth = parseInt(parts[1]) - 1;
                      bDay = parseInt(parts[2]);
                    }
                  }
                } else if (m.birthDate.includes('-')) {
                  const parts = m.birthDate.split('-');
                  if (parts.length === 3) {
                    if (parts[2].length === 4) { // DD-MM-YYYY
                      bDay = parseInt(parts[0]);
                      bMonth = parseInt(parts[1]) - 1;
                    } else if (parts[0].length === 4) { // YYYY-MM-DD
                      bMonth = parseInt(parts[1]) - 1;
                      bDay = parseInt(parts[2]);
                    }
                  }
                }

                if (bMonth >= 0 && bDay > 0) {
                  const today = new Date();
                  const alertKey = `bday-${m.id}-${today.getFullYear()}-${bMonth}-${bDay}`;
                  
                  if (today.getMonth() === bMonth && today.getDate() === bDay && !alertedIds.includes(alertKey)) {
                    sendLocalNotification(
                      `🎂 Joyeux Anniversaire !`,
                      `C'est aujourd'hui l'anniversaire de ${m.name} ! Souhaitez-lui une excellente journée ! 🎉`,
                      "membres",
                      "info"
                    );
                    newAlertedIds.push(alertKey);
                    changed = true;
                  }
                }
              } catch (e) {
                console.warn("Failed to check birthday for member:", m.name, e);
              }
            }
          });
        }

        // 4. Check imported calendar events
        if (Array.isArray(externalEvents)) {
          externalEvents.forEach(event => {
            try {
              if (!event.startDate) return;
              const eventDateTime = new Date(`${event.startDate}T${event.startTime || '09:00'}:00`);
              if (isNaN(eventDateTime.getTime())) return;

              const diffMs = eventDateTime.getTime() - now.getTime();
              if (diffMs <= 0) return;

              const diffMinutes = Math.ceil(diffMs / (1000 * 60));
              const memberName = event.memberId ? members.find(m => m.id === event.memberId)?.name : '';
              const memberText = memberName ? ` pour ${memberName}` : '';
              const locationText = event.location ? ` Lieu : ${event.location}.` : '';

              const dayAlertKey = `external-event-day-${event.id}-${event.startDate}`;
              if (diffMinutes <= 24 * 60 && diffMinutes > 60 && !alertedIds.includes(dayAlertKey)) {
                sendLocalNotification(
                  `📅 Rappel demain : ${event.title}`,
                  `"${event.title}" est prévu${memberText} le ${new Date(event.startDate).toLocaleDateString('fr-FR')}${event.startTime ? ` à ${event.startTime}` : ''}.${locationText}`,
                  "agenda",
                  "info"
                );
                newAlertedIds.push(dayAlertKey);
                changed = true;
              }

              const hourAlertKey = `external-event-hour-${event.id}-${event.startDate}-${event.startTime || 'all-day'}`;
              if (event.startTime && diffMinutes <= 60 && !alertedIds.includes(hourAlertKey)) {
                sendLocalNotification(
                  `⏰ Dans 1h : ${event.title}`,
                  `"${event.title}" commence${memberText} à ${event.startTime}.${locationText}`,
                  "agenda",
                  "warning"
                );
                newAlertedIds.push(hourAlertKey);
                changed = true;
              }
            } catch (err) {
              console.warn("Failed to check imported calendar event reminder:", event.title, err);
            }
          });
        }

        if (changed) {
          localStorage.setItem(storageKey, JSON.stringify(newAlertedIds));
        }
      } catch (err) {
        console.error("Error in checkExpiringItems:", err);
      }
    };

    // Delay first check slightly, then keep reminders fresh while the app is open.
    const t = window.setTimeout(checkExpiringItems, 2000);
    const interval = window.setInterval(checkExpiringItems, 15 * 60 * 1000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(interval);
    };
  }, [documents, vehicles, members, externalEvents, foyer]);

  const [onboardingActive, setOnboardingActive] = useState(false);
  const isSessionCheckingRef = useRef(false);

  // Nettoyage automatique des notes/cours d'Amadou et d'Awa si un foyer personnalisé sans eux est chargé
  useEffect(() => {
    if (foyer && members.length > 0) {
      setGrades(prev => {
        const filtered = prev.filter(g => members.some(m => m.id === g.studentId));
        if (filtered.length !== prev.length) {
          localStorage.setItem('school_grades', JSON.stringify(filtered));
          return filtered;
        }
        return prev;
      });
      setSchedule(prev => {
        const filtered = prev.filter(s => members.some(m => m.id === s.studentId));
        if (filtered.length !== prev.length) {
          localStorage.setItem('school_schedule', JSON.stringify(filtered));
          return filtered;
        }
        return prev;
      });
    }
  }, [members, foyer]);

  // ----------------------------------------------------
  // MOTEUR D'ALLOCATIONS ET RÈGLES AUTOMATIQUES (POCKET MONEY)
  // ----------------------------------------------------
  const matchGradeCondition = (gradeValue: number, conditionStr: string): boolean => {
    if (!conditionStr) return true;
    const match = conditionStr.match(/^(\s*)([>=<!]+)?\s*([0-9.,]+)/);
    if (!match) return false;
    const op = match[2] || '>=';
    const val = parseFloat(match[3].replace(',', '.'));
    switch (op) {
      case '>=': return gradeValue >= val;
      case '>': return gradeValue > val;
      case '<=': return gradeValue <= val;
      case '<': return gradeValue < val;
      case '=':
      case '==': return gradeValue === val;
      default: return gradeValue >= val;
    }
  };

  const triggerSchoolRulesForChild = (studentId: string, grade: LooseValue) => {
    const parentAccountId = accounts.find(a => a.type === 'bank')?.id || accounts[0]?.id || null;
    
    setPocketMoney(prev => {
      let changed = false;
      const updatedList = prev.map(child => {
        if (child.id !== studentId) return child;
        
        let updatedBalance = child.balance;
        let pointsReward = child.points;
        let rulesChanged = false;

        const updatedRules = (child.rules || []).map(rule => {
          if (!rule.active) return rule;

          // 1. Règle "après note"
          if (rule.type === 'after_grade') {
            if (rule.lastPaymentDate === grade.id) return rule;

            const cond = rule.conditionValue || '>= 15';
            const normalizedValue = (grade.value / grade.max) * 20;
            const isMatch = matchGradeCondition(normalizedValue, cond);

            if (isMatch) {
              rulesChanged = true;
              if (rule.amount && rule.amount > 0) {
                updatedBalance += rule.amount;
                handleAddTransaction({
                  amount: rule.amount,
                  type: 'expense',
                  category: 'Argent de Poche',
                  date: new Date().toISOString().split('T')[0],
                  title: `Bonus scolaire (€) (Note: ${grade.value}/${grade.max} en ${grade.subject})`,
                  memberName: child.name,
                  accountId: parentAccountId,
                  moduleSource: 'school'
                });
              }
              if (rule.points && rule.points > 0) {
                pointsReward += rule.points;
                handleAddTransaction({
                  amount: rule.points / 10,
                  type: 'savings',
                  category: 'Argent de Poche',
                  date: new Date().toISOString().split('T')[0],
                  title: `Bonus scolaire (Points) (Note: ${grade.value}/${grade.max} en ${grade.subject})`,
                  memberName: child.name
                });
              }
              return { ...rule, lastPaymentDate: grade.id };
            }
          }

          // 2. Règle "après moyenne"
          if (rule.type === 'after_average') {
            const childGrades = grades.filter(g => g.studentId === studentId);
            if (!childGrades.some(g => g.id === grade.id)) {
              childGrades.push(grade);
            }

            if (childGrades.length > 0) {
              const totalSum = childGrades.reduce((sum, g) => sum + (g.value / g.max) * 20, 0);
              const avg = totalSum / childGrades.length;
              const threshold = parseFloat((rule.conditionValue || '15').replace(',', '.'));

              if (avg >= threshold) {
                const todayStr = new Date().toISOString().split('T')[0];
                if (rule.lastPaymentDate === todayStr) return rule;

                rulesChanged = true;
                if (rule.amount && rule.amount > 0) {
                  updatedBalance += rule.amount;
                  handleAddTransaction({
                    amount: rule.amount,
                    type: 'expense',
                    category: 'Argent de Poche',
                    date: todayStr,
                    title: `Bonus moyenne scolaire (€) (Moyenne générale: ${avg.toFixed(2)}/20)`,
                    memberName: child.name,
                    accountId: parentAccountId,
                    moduleSource: 'school'
                  });
                }
                if (rule.points && rule.points > 0) {
                  pointsReward += rule.points;
                  handleAddTransaction({
                    amount: rule.points / 10,
                    type: 'savings',
                    category: 'Argent de Poche',
                    date: todayStr,
                    title: `Bonus moyenne scolaire (Points) (Moyenne générale: ${avg.toFixed(2)}/20)`,
                    memberName: child.name
                  });
                }
                return { ...rule, lastPaymentDate: todayStr };
              }
            }
          }

          return rule;
        });

        if (rulesChanged || updatedBalance !== child.balance || pointsReward !== child.points) {
          changed = true;
          // Sync database
          const client = getSupabaseClient();
          const serializedTitle = serializePocketMoneyTitle({
            goalTitle: child.goalTitle || '',
            goalType: child.goalType || 'money',
            rules: updatedRules
          });

          if (client) {
            client.from('pocket_money')
              .update({ 
                balance: updatedBalance, 
                points: pointsReward, 
                goal_title: serializedTitle 
              })
              .eq('id', child.id)
              .then(({ error }) => {
                if (error) console.error("Error updating pocket money school rules in Supabase:", error);
              });
          }

          return {
            ...child,
            balance: updatedBalance,
            points: pointsReward,
            rules: updatedRules
          };
        }

        return child;
      });

      return changed ? updatedList : prev;
    });
  };

  const periodicCheckedRef = useRef(false);
  
  const checkPeriodicAllowances = () => {
    if (periodicCheckedRef.current) return;
    periodicCheckedRef.current = true;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const parentAccountId = accounts.find(a => a.type === 'bank')?.id || accounts[0]?.id || null;

    setPocketMoney(prev => {
      let changed = false;
      const updatedList = prev.map(child => {
        let childChanged = false;
        let updatedBalance = child.balance;
        let pointsReward = child.points;

        const updatedRules = (child.rules || []).map(rule => {
          if (!rule.active) return rule;
          if (rule.type !== 'weekly' && rule.type !== 'monthly') return rule;

          let shouldPay = false;
          if (!rule.lastPaymentDate) {
            shouldPay = true;
          } else {
            const lastPay = new Date(rule.lastPaymentDate);
            const diffTime = Math.abs(today.getTime() - lastPay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (rule.type === 'weekly' && diffDays >= 7) {
              shouldPay = true;
            } else if (rule.type === 'monthly' && diffDays >= 30) {
              shouldPay = true;
            }
          }

          if (shouldPay) {
            childChanged = true;
            changed = true;
            
            if (rule.amount && rule.amount > 0) {
              updatedBalance += rule.amount;
              handleAddTransaction({
                amount: rule.amount,
                type: 'expense',
                category: 'Argent de Poche',
                date: todayStr,
                title: `Versement périodique (€) (Règle ${rule.type === 'weekly' ? 'Hebdomadaire' : 'Mensuelle'})`,
                memberName: child.name,
                accountId: parentAccountId,
                moduleSource: 'pocket_money'
              });
            }
            if (rule.points && rule.points > 0) {
              pointsReward += rule.points;
              handleAddTransaction({
                amount: rule.points / 10,
                type: 'savings',
                category: 'Argent de Poche',
                date: todayStr,
                title: `Versement périodique (Points) (Règle ${rule.type === 'weekly' ? 'Hebdomadaire' : 'Mensuelle'})`,
                memberName: child.name
              });
            }
            return { ...rule, lastPaymentDate: todayStr };
          }

          return rule;
        });

        if (childChanged) {
          // Sync database
          const client = getSupabaseClient();
          const serializedTitle = serializePocketMoneyTitle({
            goalTitle: child.goalTitle || '',
            goalType: child.goalType || 'money',
            rules: updatedRules
          });

          if (client) {
            client.from('pocket_money')
              .update({ 
                balance: updatedBalance, 
                points: pointsReward, 
                goal_title: serializedTitle 
              })
              .eq('id', child.id)
              .then(({ error }) => {
                if (error) console.error("Error updating pocket money periodic rule in Supabase:", error);
              });
          }

          return {
            ...child,
            balance: updatedBalance,
            points: pointsReward,
            rules: updatedRules
          };
        }

        return child;
      });

      return changed ? updatedList : prev;
    });
  };

  useEffect(() => {
    if (isSyncReady && pocketMoney.length > 0) {
      checkPeriodicAllowances();
    }
  }, [isSyncReady, pocketMoney]);

  const processedGradeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (grades.length > 0 && processedGradeIdsRef.current.size === 0) {
      grades.forEach(g => processedGradeIdsRef.current.add(g.id));
      return;
    }

    const newGrades = grades.filter(g => !processedGradeIdsRef.current.has(g.id));
    if (newGrades.length > 0) {
      newGrades.forEach(g => {
        processedGradeIdsRef.current.add(g.id);
        triggerSchoolRulesForChild(g.studentId, g);
      });
    }
  }, [grades]);




  const [isRecoveringPassword, setIsRecoveringPassword] = useState<boolean>(false);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setIsRecoveringPassword(true);
    }
  }, []);

  // Premium Freemium States
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('mf_is_premium') === 'true';
  });
  const [paywallOpen, setPaywallOpen] = useState(false);
  
  const setActiveModule = (modName: string) => {
    if (['conteur', 'peacemaker'].includes(modName) && !isPremium) {
      setPaywallOpen(true);
      return;
    }
    rawSetActiveModule(modName);
  };

  const handleGlobalSearchResultOpen = (result: GlobalSearchResult) => {
    if (result.focus?.type === 'agenda_date') {
      setAgendaSelectedDate(result.focus.value);
      setActiveTab('menu');
      setActiveModule('agenda');
      return;
    }

    if (result.focus?.type === 'chat_group') {
      setInitialChatGroupId(result.focus.value);
      setActiveTab('menu');
      setActiveModule('messagerie');
      return;
    }

    if (result.focus?.type === 'module_query') {
      localStorage.setItem('mf_last_global_search_focus', JSON.stringify({
        module: result.target.module,
        tab: result.target.tab,
        query: result.focus.value,
        title: result.title,
        category: result.category,
        createdAt: new Date().toISOString()
      }));
    }

    setActiveTab(result.target.tab);
    setActiveModule(result.target.module);
  };

  const requestParentPin = (targetMemberId: string | null, pendingAction?: () => void | Promise<void>) => {
    pendingPinActionRef.current = pendingAction || null;
    setPinTargetMemberId(targetMemberId);
    setPinInput("");
    setPinError(false);
    setPinErrorMessage('Code PIN incorrect');
    setPinVerificationOpen(true);
  };

  const switchActiveMember = (targetMemberId: string) => {
    if (targetMemberId !== activeMemberId) {
      requestParentPin(targetMemberId);
      return;
    }
    setProfileSwitcherOpen(false);
    setActiveTab("accueil");
    setActiveModule("");
  };

  const switchActiveFoyerMembership = async (membership: FoyerMembership) => {
    setProfileSwitcherOpen(false);
    setSpaceSelectorOpen(false);
    setIsSyncReady(false);
    setFoyer(membership.foyer);
    setMyMemberProfile(membership.member);
    setActiveMemberId(membership.member.id);
    localStorage.setItem('mf_cloud_foyer_id', membership.foyer.id);
    localStorage.setItem('mf_active_foyer_id', membership.foyer.id);
    await loadFoyerData(membership.foyer.id);
    setActiveTab('accueil');
    setActiveModule('');
  };

  const requestActiveFoyerMembership = (membership: FoyerMembership) => {
    const sameFoyer = membership.foyer.id === foyer?.id;
    const sameMember = membership.member.id === activeMemberId;
    if (sameFoyer && sameMember) {
      setProfileSwitcherOpen(false);
      setSpaceSelectorOpen(false);
      return;
    }
    requestParentPin(null, () => switchActiveFoyerMembership(membership));
  };

  const handleVerifyPin = async (inputCode: string) => {
    if (!foyer) return;
    try {
      const verification = await foyerService.verifyFoyerParentPin(foyer.id, inputCode);
      if (!verification.allowed) {
        const lockedUntil = verification.lockedUntil ? new Date(verification.lockedUntil) : null;
        const messages: Record<string, string> = {
          incorrect: verification.attemptsRemaining !== undefined
            ? `Code incorrect · ${verification.attemptsRemaining} essai(s) restant(s)`
            : 'Code PIN incorrect',
          locked: lockedUntil
            ? `Trop de tentatives · réessayez à ${lockedUntil.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : 'Trop de tentatives · réessayez dans 5 minutes',
          not_configured: 'PIN non configuré · ouvrez les paramètres parentaux',
          forbidden: 'Accès refusé pour ce foyer',
          not_authenticated: 'Votre session a expiré',
          invalid_format: 'Le PIN doit contenir 4 chiffres'
        };
        setPinErrorMessage(messages[verification.reason] || 'Code PIN incorrect');
        setPinError(true);
        setTimeout(() => {
          setPinInput('');
          setPinError(false);
        }, 1800);
        return;
      }

      const pendingAction = pendingPinActionRef.current;
      pendingPinActionRef.current = null;
      if (pendingAction) {
        void pendingAction();
      } else if (pinTargetMemberId) {
        setActiveMemberId(pinTargetMemberId);
      }
      setPinVerificationOpen(false);
      setProfileSwitcherOpen(false);
      setPinTargetMemberId(null);
      setActiveTab('accueil');
      setActiveModule('');
    } catch (error) {
      console.error('Unable to verify parent PIN:', error);
      setPinErrorMessage('Vérification indisponible · contrôlez votre connexion');
      setPinError(true);
      setTimeout(() => {
        setPinInput('');
        setPinError(false);
      }, 1800);
    }
  };

  const [user, setUser] = useState<User | null>(null);

  // Notification module preferences
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    const key = `mf_notif_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Ignore malformed notification preferences.
      }
    }
    return {
      groceries: true,
      tasks: true,
      agenda: true,
      finances: true,
      chat: true,
      health: true,
      vault: true
    };
  });

  useEffect(() => {
    const key = `mf_notif_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    if (myMemberProfile?.notificationPrefs && Object.keys(myMemberProfile.notificationPrefs).length > 0) {
      setNotificationPrefs(myMemberProfile.notificationPrefs);
      localStorage.setItem(key, JSON.stringify(myMemberProfile.notificationPrefs));
      return;
    }

    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        setNotificationPrefs(JSON.parse(cached));
      } catch {
        // Ignore malformed notification preferences.
      }
    } else {
      setNotificationPrefs({
        groceries: true,
        tasks: true,
        agenda: true,
        finances: true,
        chat: true,
        health: true,
        vault: true
      });
    }
  }, [foyer?.id, user?.id, myMemberProfile?.notificationPrefs]);

  const [smartFamilyPrefs, setSmartFamilyPrefs] = useState<SmartFamilyPreferences>(() => {
    const key = `mf_smart_family_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    try {
      const cached = localStorage.getItem(key);
      return cached ? { ...defaultSmartFamilyPreferences, ...JSON.parse(cached) } : defaultSmartFamilyPreferences;
    } catch {
      return defaultSmartFamilyPreferences;
    }
  });

  useEffect(() => {
    const key = `mf_smart_family_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    try {
      const cached = localStorage.getItem(key);
      setSmartFamilyPrefs(cached ? { ...defaultSmartFamilyPreferences, ...JSON.parse(cached) } : defaultSmartFamilyPreferences);
    } catch {
      setSmartFamilyPrefs(defaultSmartFamilyPreferences);
    }
  }, [foyer?.id, user?.id]);

  const handleSmartFamilyPrefsChange = (prefs: SmartFamilyPreferences) => {
    setSmartFamilyPrefs(prefs);
    const key = `mf_smart_family_prefs_${foyer?.id || 'simulated'}_${user?.id || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(prefs));
  };

  useEffect(() => {
    localStorage.setItem('mf_is_premium', String(isPremium));
  }, [isPremium]);
  // Chargement et application du thème visuel au démarrage
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_appearance_mode') || 'dark';
    document.documentElement.classList.remove('theme-light', 'theme-sepia');
    document.body.classList.remove('theme-light', 'theme-sepia');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
    } else if (savedTheme === 'sepia') {
      document.documentElement.classList.add('theme-sepia');
      document.body.classList.add('theme-sepia');
    }
  }, []);

  // Gestion de la redirection depuis les notifications push (via paramètres URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const moduleParam = params.get('module');
    const groupIdParam = params.get('groupId');
    const actionParam = params.get('action');
    
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (moduleParam) {
      setActiveModule(moduleParam);
    }
    if (groupIdParam) {
      setInitialChatGroupId(groupIdParam);
    }
    
    if (actionParam === 'add-expense') {
      setActiveTab('budget');
      setActiveModule('');
      setQuickActionsOpen(true);
    } else if (actionParam === 'share-receipt') {
      setActiveTab('budget');
      setActiveModule('');
      setQuickActionsOpen(true);
      setTimeout(() => {
        alert("📷 Ticket de caisse partagé reçu ! MyFamily+ l'analyse avec l'IA...");
      }, 500);
    }
    
    if (tabParam || moduleParam || groupIdParam || actionParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Configuration des notifications push FCM pour le membre rattaché au compte connecté.
  useEffect(() => {
    const isPushDisabled = localStorage.getItem('mf_fcm_active') === 'false';
    const pushMemberId = myMemberProfile?.id || activeMemberId;
    if (pushMemberId && !isPushDisabled) {
      const setupPushNotifications = async () => {
        try {
          const { notificationService } = await import('./services/notificationService');
          await notificationService.initializeFCM(pushMemberId, (payload) => {
            console.log("[App] Notification push reçue au premier plan :", payload);
            const newAlert: NotificationAlert = {
              id: payload.data?.id || `alert-${Date.now()}`,
              title: payload.notification?.title || 'Notification MyFamily+',
              description: payload.notification?.body || '',
              time: "À l'instant",
              type: ['info', 'warning', 'error', 'success'].includes(payload.data?.type || '')
                ? payload.data?.type as NotificationAlert['type']
                : 'info',
              read: false,
              module: payload.data?.module || 'other',
              senderUserId: payload.data?.senderUserId || payload.data?.sender_user_id,
              senderMemberId: payload.data?.senderMemberId || payload.data?.sender_member_id,
              senderName: payload.data?.senderName || payload.data?.sender_name,
              senderAvatar: payload.data?.senderAvatar || payload.data?.sender_avatar,
              createdAt: new Date().toISOString()
            };
            setAlerts(prev => {
              if (prev.some(a => a.id === newAlert.id)) return prev;
              return [newAlert, ...prev];
            });

            // Les notifications système sont affichées par FCM/service worker.
            // Ici on ne met à jour que le centre de notifications interne.
          }, { requestPermission: false });
        } catch (err) {
          console.error("[App] Échec de l'initialisation des notifications push :", err);
        }
      };
      setupPushNotifications();
    }
  }, [activeMemberId, myMemberProfile?.id]);

  // Helper map function from FoyerMember to UI Member
  const mapFoyerMemberToMember = (fm: FoyerMember): Member => {
    let preciseRole: string;
    let bloodGroup = fm.bloodGroup || 'O+';
    let phone = '';
    
    if (fm.role === 'admin') {
      // The database role is authoritative for ownership. Older records can
      // still carry a stale ROLE:parent marker in blood_group.
      preciseRole = 'chef_famille';
      if (fm.bloodGroup?.startsWith('ROLE:')) {
        const parts = fm.bloodGroup.substring(5).split('|');
        bloodGroup = parts[1] || 'O+';
        phone = parts[2] || '';
      }
    } else if (fm.bloodGroup && fm.bloodGroup.startsWith('ROLE:')) {
      const parts = fm.bloodGroup.substring(5).split('|');
      preciseRole = parts[0];
      bloodGroup = parts[1] || 'O+';
      phone = parts[2] || '';
    } else {
      // Fallback inference if not yet serialized
      if (fm.role === 'parent') {
        preciseRole = 'parent';
      } else if (fm.role === 'child') {
        const ageNum = parseInt(fm.age || '0');
        if (ageNum >= 11 && ageNum < 18) preciseRole = 'adolescent';
        else preciseRole = 'enfant';
      } else {
        preciseRole = 'invite';
      }
    }

    const friendlyRole = 
      preciseRole === 'chef_famille' ? 'Chef de famille' :
      preciseRole === 'parent' ? 'Parent' :
      preciseRole === 'gestionnaire' ? 'Gestionnaire' :
      preciseRole === 'adulte' ? 'Membre adulte' :
      preciseRole === 'adolescent' ? 'Adolescent' :
      preciseRole === 'enfant' ? 'Enfant' :
      preciseRole === 'invite' ? 'Invité' :
      fm.role === 'admin' ? 'Chef de famille' : fm.role === 'parent' ? 'Parent' : fm.role === 'child' ? 'Enfant' : 'Invité';

    return {
      id: fm.id,
      userId: fm.userId || undefined,
      name: fm.displayName,
      role: friendlyRole,
      age: fm.age || '30 ans',
      birthDate: fm.birthDate || '',
      bloodGroup: bloodGroup,
      allergies: fm.allergies || [],
      treatments: fm.treatments || [],
      emergencyContact: {
        name: fm.emergencyContactName || '',
        phone: fm.emergencyContactPhone || '',
        relation: fm.emergencyContactRelation || ''
      },
      schoolOrEmployer: fm.schoolOrEmployer || '',
      photoUrl: fm.photoUrl || 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150',
      hasExemption: fm.hasExemption || false,
      approved: fm.approved !== false,
      medicalHistory: [],
      phone: phone
    };
  };

  // Check foyer session on startup or login
  const checkUserFoyerSession = async (currentUser: User | null) => {
    if (isSessionCheckingRef.current) {
      console.log("[MyFamily+ Session] checkUserFoyerSession lock active, ignoring parallel check.");
      return;
    }
    isSessionCheckingRef.current = true;
    setIsSessionChecking(true);

    if (!currentUser) {
      setIsSyncReady(false);
      setFoyer(null);
      setMyMemberProfile(null);
      setOnboardingActive(false);
      setMyFoyers([]);
      setShowWelcomeScreen(false);
      isSessionCheckingRef.current = false;
      setIsSessionChecking(false);
      return;
    }

    try {
      console.log("[MyFamily+ Session] Fetching join requests...");
      const joinRequests = await foyerService.getMyJoinRequests();
      const activeReq = joinRequests.find(r => r.status === 'pending' || r.status === 'rejected');
      setMyActiveRequest(activeReq || null);
      if (activeReq) {
        setShowRequestInterceptor(true);
      }

      console.log("[MyFamily+ Session] Fetching user foyers...");
      const foyersList = await foyerService.getMyFoyers();
      setMyFoyers(foyersList);

      if (foyersList.length > 0) {
        // Find active foyer ID
        const activeFoyerId = localStorage.getItem('mf_active_foyer_id') || localStorage.getItem('mf_cloud_foyer_id') || localStorage.getItem('mf_default_family_id');
        const activeMembership = foyersList.find(f => f.foyer.id === activeFoyerId) || foyersList[0];
        
        const myFoyer = activeMembership.foyer;
        const myMember = activeMembership.member;

        setIsSyncReady(false);
        setFoyer(myFoyer);
        setMyMemberProfile(myMember);
        setActiveMemberId(myMember.id);
        
        setIsPremium(billingService.isFoyerPremium(myFoyer));
        
        setOnboardingActive(false);
        setShowWelcomeScreen(false);
        localStorage.setItem('mf_cloud_foyer_id', myFoyer.id);
        localStorage.setItem('mf_active_foyer_id', myFoyer.id);
        await loadFoyerData(myFoyer.id);
      } else {
        console.log("[MyFamily+ Session] No foyer found in DB for user. Showing welcome screen.");
        setFoyer(null);
        setMyMemberProfile(null);
        localStorage.removeItem('mf_cached_foyer');
        localStorage.removeItem('mf_cached_member_profile');
        localStorage.removeItem('mf_cloud_foyer_id');
        localStorage.removeItem('mf_active_foyer_id');
        setOnboardingActive(false);
        setShowWelcomeScreen(true);
        setWelcomeScreenMode('select');
      }
    } catch (err) {
      console.error("Erreur lors de la vérification de session foyer :", err);
      if (!foyerRef.current) {
        setShowWelcomeScreen(true);
        setWelcomeScreenMode('select');
      }
    } finally {
      isSessionCheckingRef.current = false;
      setIsSessionChecking(false);
    }
  };

  const [isInitializingAuth, setIsInitializingAuth] = useState(true);

  // Restore session from native preferences on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const keys = [
          'mf_sb_url', 
          'mf_sb_key', 
          'mf_cloud_foyer_id', 
          'mf_cached_foyer', 
          'mf_cached_member_profile',
          'mf_members',
          'mf_active_member_id'
        ];
        
        const restoredData: Record<string, string | null> = {};
        for (const key of keys) {
          const { value } = await Preferences.get({ key });
          restoredData[key] = value;
          if (value) {
            localStorage.setItem(key, value);
          }
        }

        // Hydrate React states from restored native data
        if (restoredData['mf_cached_foyer']) {
          try {
            setFoyer(JSON.parse(restoredData['mf_cached_foyer']!));
          } catch {
            // Ignore malformed cached foyer data.
          }
        }
        let restoredMemberProfile: FoyerMember | null = null;
        if (restoredData['mf_cached_member_profile']) {
          try {
            restoredMemberProfile = JSON.parse(restoredData['mf_cached_member_profile']!);
            setMyMemberProfile(restoredMemberProfile);
          } catch {
            // Ignore malformed cached member data.
          }
        }
        if (restoredMemberProfile?.id) {
          setActiveMemberId(restoredMemberProfile.id);
        } else if (restoredData['mf_active_member_id']) {
          setActiveMemberId(restoredData['mf_active_member_id']!);
        }
        if (restoredData['mf_members']) {
          try {
            setMembers(JSON.parse(restoredData['mf_members']!));
          } catch {
            // Ignore malformed cached member list.
          }
        }
      } catch (e) {
        console.warn("Failed to restore native session keys:", e);
      } finally {
        setIsInitializingAuth(false);
      }
    };
    initSession();
  }, []);

  // Monitor Supabase Auth changes
  useEffect(() => {
    if (isInitializingAuth) return;

    // Request notification permission on startup
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const client = getSupabaseClient();
    if (!client) {
      setUser(null);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        
        localStorage.removeItem('mf_discover_mode');
        localStorage.removeItem('mf_is_premium');
        checkUserFoyerSession(currentUser);
      } else {
        checkUserFoyerSession(null);
      }
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        
        localStorage.removeItem('mf_discover_mode');
        localStorage.removeItem('mf_is_premium');
      }
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      } else {
        const hasLoadedFoyer = !!foyerRef.current;
        if (currentUser && (!hasLoadedFoyer || event !== 'TOKEN_REFRESHED')) {
          checkUserFoyerSession(currentUser);
        } else if (!currentUser) {
          checkUserFoyerSession(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isInitializingAuth]);

  // Onboarding success handler
  const handleOnboardingSuccess = async () => {
    setOnboardingActive(false);
    const client = getSupabaseClient();
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        checkUserFoyerSession(session.user);
      }
    }
  };

  // 1. Fetch & Hydrate all tables for active foyer
  const loadFoyerData = async (foyerId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    const wrapQuery = <T,>(tableName: string, promise: PromiseLike<T> | Promise<T>): Promise<{ success: boolean; data: DbRows }> => {
      return Promise.resolve(promise as PromiseLike<{ error?: unknown; data?: DbRows }>).then((res) => {
        if (res.error) throw res.error;
        return { success: true, data: res.data || [] };
      }).catch((err: unknown) => {
        console.error(`[loadFoyerData] Error fetching table data for ${tableName}:`, err);
        return { success: false, data: [] };
      });
    };

    // Load everything in parallel to minimize load times
    Promise.all([
      foyerService.getFoyerMembers(foyerId).catch(err => {
        console.error("Error loading members:", err);
        return [];
      }),
      client.auth.getUser().catch(err => {
        console.error("Error getting user:", err);
        return { data: { user: null } };
      }),
      wrapQuery('events', client.from('events').select('*').eq('foyer_id', foyerId)),
      wrapQuery('groceries', client.from('groceries').select('*').eq('foyer_id', foyerId)),
      wrapQuery('archived_lists', client.from('archived_lists').select('*').eq('foyer_id', foyerId)),
      wrapQuery('transactions', client.from('transactions').select('id, foyer_id, amount, type, category, date, title, member_id, member_name, sub_category, account_id, comment, modification_history, is_archived, recurrence, subscription_id, created_at').eq('foyer_id', foyerId)),
      wrapQuery('documents', client.from('documents').select('id, foyer_id, name, category, sub_category, member_id, member_name, tags, upload_date, expiry_date, file_size, is_expired, description, is_secure, created_at').eq('foyer_id', foyerId)),
      wrapQuery('dishes', client.from('dishes').select('*').eq('foyer_id', foyerId)),
      wrapQuery('chore_tasks', client.from('chore_tasks').select('*').eq('foyer_id', foyerId)),
      wrapQuery('saving_goals', client.from('saving_goals').select('*').eq('foyer_id', foyerId)),
      wrapQuery('alerts', client.from('alerts').select('*').eq('foyer_id', foyerId)),
      wrapQuery('memories', client.from('memories').select('*').eq('foyer_id', foyerId)),
      wrapQuery('votes', client.from('votes').select('*').eq('foyer_id', foyerId)),
      wrapQuery('school_tasks', client.from('school_tasks').select('*').eq('foyer_id', foyerId)),
      wrapQuery('chat_groups', client.from('chat_groups').select('*').eq('foyer_id', foyerId)),
      wrapQuery('chat_messages', client.from('chat_messages').select('*').eq('foyer_id', foyerId).order('created_at', { ascending: false }).limit(25)),
      wrapQuery('demarches', client.from('demarches').select('*').eq('foyer_id', foyerId)),
      wrapQuery('justificatif_packs', client.from('justificatif_packs').select('*').eq('foyer_id', foyerId)),
      wrapQuery('vehicles', client.from('vehicles').select('*').eq('foyer_id', foyerId)),
      wrapQuery('maintenance', client.from('maintenance').select('*').eq('foyer_id', foyerId)),
      wrapQuery('trips', client.from('trips').select('*').eq('foyer_id', foyerId)),
      wrapQuery('pets', client.from('pets').select('*').eq('foyer_id', foyerId)),
      wrapQuery('pocket_money', client.from('pocket_money').select('*').eq('foyer_id', foyerId)),
      wrapQuery('artisans', client.from('artisans').select('*').eq('foyer_id', foyerId)),
      wrapQuery('custom_categories', client.from('custom_categories').select('*').eq('foyer_id', foyerId)),
      wrapQuery('accounts', client.from('accounts').select('*').eq('foyer_id', foyerId)),
      wrapQuery('abonnements', client.from('abonnements').select('*').eq('foyer_id', foyerId)),
      wrapQuery('debts', client.from('debts').select('*').eq('foyer_id', foyerId)),
      wrapQuery('malus_templates', client.from('malus_templates').select('*').eq('foyer_id', foyerId)),
      wrapQuery('malus_applied', client.from('malus_applied').select('*').eq('foyer_id', foyerId))
    ]).then(([
      membersList,
      userRes,
      eventsRes,
      groceriesRes,
      archivedListsRes,
      transactionsRes,
      documentsRes,
      dishesRes,
      tasksRes,
      savingGoalsRes,
      alertsRes,
      memoriesRes,
      votesRes,
      schoolTasksRes,
      chatGroupsRes,
      chatMessagesRes,
      demarchesRes,
      packsRes,
      vehiclesRes,
      maintenanceRes,
      tripsRes,
      petsRes,
      pocketMoneyRes,
      artisansRes,
      customCategoriesRes,
      accountsRes,
      abonnementsRes,
      debtsRes,
      malusTemplatesRes,
      malusAppliedRes
    ]) => {
      // Log query volumes for optimization audit
      logQueryVolume('transactions', 'loadFoyerData', transactionsRes?.data);
      logQueryVolume('documents', 'loadFoyerData', documentsRes?.data);
      logQueryVolume('chat_messages', 'loadFoyerData', chatMessagesRes?.data);
      logQueryVolume('memories', 'loadFoyerData', memoriesRes?.data);

      // Set members
      setMembers(membersList.length > 0 ? membersList.map(mapFoyerMemberToMember) : []);
      
      const user = userRes?.data?.user;
      const currentActiveId = activeMemberIdRef.current || activeMemberId;
      const selfMember = membersList.find((m: FoyerMember) => (user && m.userId === user.id) || m.id === currentActiveId);
      let joinedAtDate: string | null = null;
      if (selfMember) {
        joinedAtDate = selfMember.joinedAt;
      }

      if (myMemberProfile) {
        const updatedSelf = membersList.find((m: FoyerMember) => m.id === myMemberProfile.id);
        if (updatedSelf) {
          setMyMemberProfile(updatedSelf);
        }
      }
      // Set events
      if (eventsRes.success && eventsRes.data) {
        setEvents(eventsRes.data.map((e: DbRow) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          dateTime: e.date_time,
          time: e.time,
          memberId: e.member_id,
          memberName: e.member_name,
          location: e.location,
          description: e.description,
          done: e.done,
          amount: e.amount ? Number(e.amount) : undefined
        })));
      }

      // Set groceries
      if (groceriesRes.success && groceriesRes.data) {
        setGroceries(groceriesRes.data.map((g: DbRow) => ({
          id: g.id,
          name: g.name,
          category: g.category,
          quantity: g.quantity,
          checked: g.checked,
          inStock: g.in_stock,
          expiryDate: g.expiry_date,
          meal: g.meal || undefined,
          addedBy: g.added_by || undefined,
          isFavorite: !!g.is_favorite
        })));
      }

      // Set archivedLists
      if (archivedListsRes.success && archivedListsRes.data) {
        setArchivedLists(archivedListsRes.data.map((al: DbRow) => ({
          id: al.id,
          name: al.name,
          date: al.date,
          items: typeof al.items === 'string' ? JSON.parse(al.items) : al.items || [],
          store: al.store || undefined,
          createdBy: al.created_by
        })));
      }

      // Set transactions
      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data.map((t: DbRow) => {
          const { comment, metadata } = deserializeTransactionComment(t.comment);
          return {
            id: t.id,
            amount: Number(t.amount),
            type: t.type,
            category: t.category,
            date: t.date,
            title: t.title,
            memberId: t.member_id,
            memberName: t.member_name,
            subCategory: t.sub_category,
            accountId: t.account_id,
            receiptUrl: storageUrlFromLegacy(t.receipt_url, t.receipt_base64),
            attachmentUrl: storageUrlFromLegacy(t.attachment_url, t.attachment_base64),
            receiptBase64: legacyDataUrlOnly(t.receipt_base64),
            attachmentBase64: legacyDataUrlOnly(t.attachment_base64),
            comment: comment,
            modificationHistory: typeof t.modification_history === 'string' ? JSON.parse(t.modification_history) : t.modification_history || [],
            isArchived: !!t.is_archived,
            recurrence: t.recurrence || 'none',
            subscriptionId: t.subscription_id,
            moduleSource: metadata.moduleSource || undefined,
            categoryId: metadata.moduleSource || undefined,
            subCategoryId: t.sub_category || undefined,
            currency: 'EUR',
            travelId: metadata.travelId || undefined,
            travel_id: metadata.travelId || undefined,
            recurrenceInterval: metadata.recurrenceInterval ? Number(metadata.recurrenceInterval) : undefined,
            startDate: metadata.startDate || undefined,
            endDate: metadata.endDate || undefined,
            nextOccurrence: metadata.nextOccurrence || undefined,
            entryTime: (() => {
              if (metadata.entryTime) return metadata.entryTime;
              if (t.created_at) {
                const d = new Date(t.created_at.replace(' ', 'T'));
                if (!isNaN(d.getTime())) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              }
              return undefined;
            })(),
            entryDate: metadata.entryDate || t.date || undefined,
            createdAt: t.created_at || undefined,
            updatedAt: t.created_at || undefined
          };
        }));
      }

      // Set documents
      if (documentsRes.success && documentsRes.data) {
        setDocuments(documentsRes.data.map((d: DbRow) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          subCategory: d.sub_category,
          memberId: d.member_id,
          memberName: d.member_name,
          tags: d.tags || [],
          uploadDate: d.upload_date,
          expiryDate: d.expiry_date,
          fileSize: d.file_size,
          isExpired: d.is_expired,
          description: d.description,
          fileUrl: storageUrlFromLegacy(d.file_url, d.file_base64),
          thumbnailUrl: d.thumbnail_url || undefined,
          fileBase64: legacyDataUrlOnly(d.file_base64),
          isSecure: d.is_secure
        })));
      }

      // Set dishes
      if (dishesRes.success && dishesRes.data) {
        setDishes(dishesRes.data.map((d: DbRow) => ({
          id: d.id,
          day: d.day,
          mealType: d.meal_type,
          name: d.name,
          image: d.image,
          ingredients: d.ingredients || []
        })));
      }

      // Set tasks
      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data.map((t: DbRow) => ({
          id: t.id,
          title: t.title,
          rewardPoints: t.reward_points,
          assignedMemberId: t.assigned_member_id,
          assignedMemberName: t.assigned_member_name,
          done: t.done,
          rotation: t.rotation,
          validatedByParent: t.validated_by_parent,
          dueDate: t.due_date,
          rewardAmount: t.reward_amount ? Number(t.reward_amount) : undefined
        })));
      }

      // Set savingGoals
      if (savingGoalsRes.success && savingGoalsRes.data) {
        setSavingGoals(savingGoalsRes.data.map((s: DbRow) => ({
          id: s.id,
          title: s.title,
          targetAmount: Number(s.target_amount),
          currentAmount: Number(s.current_amount),
          targetDate: s.target_date,
          category: s.category,
          contributions: typeof s.contributions === 'string' ? JSON.parse(s.contributions) : s.contributions || []
        })));
      }

      // Set customCategories
      if (customCategoriesRes.success && customCategoriesRes.data) {
        setCustomCategories(customCategoriesRes.data.map((cc: DbRow) => {
          const meta = deserializeCategoryIcon(cc.icon);
          return {
            id: cc.id,
            name: cc.name,
            icon: meta.icon,
            color: cc.color,
            budget: Number(cc.budget || 0),
            displayOrder: Number(cc.display_order || 0),
            subcategories: meta.subcategories.length > 0 ? meta.subcategories : undefined,
            isArchived: meta.isArchived || undefined
          };
        }));
      }

      // Set accounts
      if (accountsRes.success && accountsRes.data) {
        const metadataStr = localStorage.getItem('mf_accounts_metadata');
        const metadata = metadataStr ? JSON.parse(metadataStr) : {};
        setAccounts(accountsRes.data.map((a: DbRow) => {
          const meta = metadata[a.id] || {};
          return {
            id: a.id,
            name: a.name,
            type: a.type || 'bank',
            balance: Number(a.balance || 0),
            icon: meta.icon || undefined,
            color: meta.color || undefined,
            initialBalance: meta.initialBalance !== undefined ? Number(meta.initialBalance) : undefined
          };
        }));
      }

      // Set abonnements
      if (abonnementsRes.success && abonnementsRes.data) {
        setAbonnements(abonnementsRes.data.map((a: DbRow) => ({
          id: a.id,
          name: a.name,
          amount: Number(a.amount || 0),
          period: a.period || 'monthly',
          nextBillingDate: a.next_billing_date || '',
          category: a.category
        })));
      }

      // Set debts
      if (debtsRes.success && debtsRes.data) {
        setDebts(debtsRes.data.map((d: DbRow) => ({
          id: d.id,
          title: d.title,
          amount: Number(d.amount || 0),
          payerId: d.payer_id,
          payerName: d.payer_name,
          debtorId: d.debtor_id,
          debtorName: d.debtor_name,
          isRepaid: !!d.is_repaid
        })));
      }

      // Set alerts
      if (alertsRes.success && alertsRes.data) {
        let list = alertsRes.data;
        if (joinedAtDate) {
          list = list.filter((a: DbRow) => a.created_at >= joinedAtDate);
        }
        setAlerts(list.map((a: DbRow) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          time: a.time,
          type: a.type,
          read: a.read,
          module: a.module,
          senderUserId: a.sender_user_id,
          senderMemberId: a.sender_member_id,
          senderName: a.sender_name,
          senderAvatar: a.sender_avatar,
          createdAt: a.created_at,
          foyerId: a.foyer_id
        })));
      }

      // Set memories
      if (memoriesRes.success && memoriesRes.data) {
        setMemories(removeLegacyDemoMemories(memoriesRes.data).map(mapCloudMemory));
      }

      // Set votes
      if (votesRes.success && votesRes.data) {
        setVotes(votesRes.data.map((v: DbRow) => ({
          id: v.id,
          question: v.question,
          options: typeof v.options === 'string' ? JSON.parse(v.options) : v.options || [],
          authorName: v.author_name,
          active: v.active,
          dueDate: v.due_date
        })));
      }

      // Set schoolTasks
      if (schoolTasksRes.success && schoolTasksRes.data) {
        setSchoolTasks(removeLegacyDemoSchoolTasks(schoolTasksRes.data).map((s: DbRow) => ({
          id: s.id,
          subject: s.subject,
          title: s.title,
          dueDate: s.due_date,
          done: s.done,
          assignedMemberId: s.assigned_member_id,
          difficulty: s.difficulty,
          grade: s.grade
        })));
      }

      // Set chatGroups
      if (chatGroupsRes.success && chatGroupsRes.data) {
        setChatGroups(chatGroupsRes.data.map((c: DbRow) => ({
          id: c.id,
          name: c.name,
          isPrivate: c.is_private,
          memberIds: c.member_ids || [],
          lastMessage: c.last_message,
          lastMessageTime: c.last_message_time,
          unreadCount: c.unread_count
        })));
      }

      // Set chatMessages
      if (chatMessagesRes.success && chatMessagesRes.data) {
        const sortedMessages = [...chatMessagesRes.data].reverse();
        setChatMessages(sortedMessages.map((c: DbRow) => ({
          id: c.id,
          groupId: c.group_id,
          senderId: c.sender_id,
          senderUserId: c.sender_user_id,
          senderName: c.sender_name,
          type: c.type,
          content: c.content,
          timestamp: c.timestamp,
          readBy: c.read_by || [],
          reactions: typeof c.reactions === 'string' ? JSON.parse(c.reactions) : c.reactions || []
        })));
      }

      // Set demarches
      if (demarchesRes.success && demarchesRes.data) {
        setDemarches(demarchesRes.data.map((d: DbRow) => ({
          id: d.id,
          templateId: d.template_id,
          title: d.title,
          icon: d.icon,
          status: d.status,
          assignedMemberId: d.assigned_member_id,
          assignedMemberName: d.assigned_member_name,
          steps: typeof d.steps === 'string' ? JSON.parse(d.steps) : d.steps || [],
          pieces: typeof d.pieces === 'string' ? JSON.parse(d.pieces) : d.pieces || [],
          createdAt: d.created_at_text,
          notes: d.notes
        })));
      }

      // Set packs
      if (packsRes.success && packsRes.data) {
        setJustificatifPacks(packsRes.data.map((p: DbRow) => ({
          id: p.id,
          name: p.name,
          templateType: p.template_type,
          documentIds: p.document_ids || [],
          createdAt: p.created_at_text
        })));
      }

      // Set vehicles
      if (vehiclesRes.success && vehiclesRes.data) {
        setVehicles(vehiclesRes.data.map((v: DbRow) => ({
          id: v.id,
          name: v.name,
          plate: v.plate || '',
          insuranceExpiry: v.insurance_expiry || '',
          technicalControl: v.technical_control || '',
          lastService: v.last_service || '',
          nextService: v.next_service || '',
          mileage: v.mileage ? Number(v.mileage) : 0
        })));
      }

      // Set maintenance
      if (maintenanceRes.success && maintenanceRes.data) {
        setMaintenance(maintenanceRes.data.map((m: DbRow) => ({
          id: m.id,
          title: m.title,
          provider: m.provider || '',
          date: m.date || '',
          cost: Number(m.cost || 0),
          status: (m.status as LooseValue) || 'scheduled'
        })));
      }

      // Set trips
      if (tripsRes.success && tripsRes.data) {
        setTrips(tripsRes.data.map((t: DbRow) => ({
          id: t.id,
          destination: t.destination,
          startDate: t.start_date || '',
          endDate: t.end_date || '',
          budget: Number(t.budget || 0),
          checklist: typeof t.checklist === 'string' ? JSON.parse(t.checklist) : t.checklist || [],
          bookingRefs: t.booking_refs || []
        })));
      }

      // Set pets
      if (petsRes.success && petsRes.data) {
        setPets(petsRes.data.map((p: DbRow) => ({
          id: p.id,
          name: p.name,
          species: p.species || '',
          lastVaccine: p.last_vaccine || '',
          nextVaccine: p.next_vaccine || '',
          vetAppointment: p.vet_appointment || undefined,
          notes: p.notes || undefined,
          weightHistory: typeof p.weight_history === 'string' ? JSON.parse(p.weight_history) : p.weight_history || [],
          documentIds: p.document_ids || []
        })));
      }

      // Set pocketMoney
      if (pocketMoneyRes.success && pocketMoneyRes.data) {
        setPocketMoney(pocketMoneyRes.data.map((p: DbRow) => {
          const meta = parsePocketMoneyTitle(p.goal_title || '');
          return {
            id: p.id,
            name: p.name,
            balance: Number(p.balance || 0),
            points: Number(p.points || 0),
            avatar: p.avatar || '',
            shields: p.shields !== undefined && p.shields !== null ? Number(p.shields) : 3,
            streak: p.streak !== undefined && p.streak !== null ? Number(p.streak) : 0,
            lastShieldReset: p.last_shield_reset || undefined,
            lastConnection: p.last_connection || undefined,
            goalTitle: meta.goalTitle || '',
            goalAmount: p.goal_amount ? Number(p.goal_amount) : undefined,
            goalType: meta.goalType || 'money',
            rules: meta.rules || []
          };
        }));
      }

      // Set malusTemplates & defaultMaluses initialization
      if (malusTemplatesRes.success && malusTemplatesRes.data) {
        if (malusTemplatesRes.data.length === 0) {
          const defaultMaluses = [
            { title: "Chambre non rangée", emoji: "🛏️", category: "Rangement", starsRemoved: 5, xpRemoved: 10, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Devoir non fait", emoji: "📚", category: "Travail scolaire", starsRemoved: 10, xpRemoved: 20, lossStreak: true, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Retard", emoji: "⏰", category: "Ponctualité", starsRemoved: 5, xpRemoved: 10, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Téléphone après l'heure autorisée", emoji: "📱", category: "Écrans", starsRemoved: 10, xpRemoved: 15, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Insolence", emoji: "🗣️", category: "Comportement", starsRemoved: 15, xpRemoved: 30, lossStreak: true, lossShield: true, commentRequired: true, doubleParentValidation: false },
            { title: "Brosse à dents oubliée", emoji: "🪥", category: "Hygiène", starsRemoved: 2, xpRemoved: 5, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Sac d'école non préparé", emoji: "🎒", category: "Organisation", starsRemoved: 5, xpRemoved: 10, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Vêtements laissés au sol", emoji: "👕", category: "Rangement", starsRemoved: 3, xpRemoved: 5, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Aide refusée à la maison", emoji: "❌", category: "Entraide", starsRemoved: 5, xpRemoved: 10, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false },
            { title: "Temps d'écran dépassé", emoji: "⏳", category: "Écrans", starsRemoved: 8, xpRemoved: 15, lossStreak: false, lossShield: true, commentRequired: false, doubleParentValidation: false }
          ];

          const initialTemplates = defaultMaluses.map(dm => ({
            id: `malus_temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            foyer_id: foyerId,
            title: dm.title,
            emoji: dm.emoji,
            description: '',
            category: dm.category,
            stars_removed: dm.starsRemoved,
            xp_removed: dm.xpRemoved,
            loss_streak: dm.lossStreak,
            loss_shield: dm.lossShield,
            comment_required: dm.commentRequired,
            double_parent_validation: dm.doubleParentValidation
          }));

          client.from('malus_templates').insert(initialTemplates).then(({ error }) => {
            if (!error) {
              setMalusTemplates(initialTemplates.map(m => ({
                id: m.id,
                foyerId: m.foyer_id,
                title: m.title,
                emoji: m.emoji,
                description: m.description,
                category: m.category,
                starsRemoved: m.stars_removed,
                xpRemoved: m.xp_removed,
                lossStreak: m.loss_streak,
                lossShield: m.loss_shield,
                commentRequired: m.comment_required,
                doubleParentValidation: m.double_parent_validation
              })));
            }
          });
        } else {
          setMalusTemplates(malusTemplatesRes.data.map((m: DbRow) => ({
            id: m.id,
            foyerId: m.foyer_id,
            title: m.title,
            emoji: m.emoji,
            description: m.description || '',
            category: m.category,
            starsRemoved: Number(m.stars_removed || 0),
            xpRemoved: Number(m.xp_removed || 0),
            lossStreak: !!m.loss_streak,
            lossShield: !!m.loss_shield,
            commentRequired: !!m.comment_required,
            doubleParentValidation: !!m.double_parent_validation,
            createdAt: m.created_at
          })));
        }
      }

      // Set appliedMaluses
      if (malusAppliedRes.success && malusAppliedRes.data) {
        setAppliedMaluses(malusAppliedRes.data.map((m: DbRow) => ({
          id: m.id,
          foyerId: m.foyer_id,
          memberId: m.member_id,
          title: m.title,
          emoji: m.emoji,
          description: m.description || '',
          starsRemoved: Number(m.stars_removed || 0),
          xpRemoved: Number(m.xp_removed || 0),
          lossStreak: !!m.loss_streak,
          lossShield: !!m.loss_shield,
          comment: m.comment || '',
          shieldUsed: !!m.shield_used,
          repaired: !!m.repaired,
          repairedAt: m.repaired_at,
          reparationTaskId: m.reparation_task_id || '',
          createdAt: m.created_at
        })));
      }

      // Set artisans
      if (artisansRes.success && artisansRes.data) {
        setArtisans(artisansRes.data.map((a: DbRow) => ({
          id: a.id,
          name: a.name,
          specialty: a.specialty,
          phone: a.phone || '',
          email: a.email || '',
          rating: a.rating || 5,
          notes: a.notes || ''
        })));
      }

      setIsSyncReady(true);
      if (abonnementsRes.success && abonnementsRes.data) {
        const abos = abonnementsRes.data.map((a: DbRow) => ({
          id: a.id,
          name: a.name,
          amount: Number(a.amount || 0),
          period: a.period || 'monthly',
          nextBillingDate: a.next_billing_date || '',
          category: a.category
        }));
        processRecurringItems(foyerId, abos, transactionsRes.data || [], tasksRes.data || [], pocketMoneyRes.data || []);
      }
    }).catch((err: unknown) => {
      console.error("Error loading foyer tables background data:", err);
    });
  };

  const processRecurringItems = async (
    foyerId: string,
    currentAbonnements: DbRows,
    dbTransactions: DbRows,
    dbTasks: DbRows,
    dbPocketMoney: DbRows
  ) => {
    if (!foyerId) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    const client = getSupabaseClient();
    if (!client) return;

    // 1. Process recurring Abonnements
    for (const abonnement of currentAbonnements) {
      let nextDateStr = abonnement.nextBillingDate;
      if (!nextDateStr) continue;

      let updated = false;
      const transactionsToAdd: DbRows = [];
      let iterations = 0;
      while (nextDateStr && nextDateStr <= todayStr && iterations < 12) {
        iterations++;
        const newTrans = {
          id: crypto.randomUUID(),
          foyer_id: foyerId,
          amount: abonnement.amount,
          type: abonnement.category === 'Salaire' || abonnement.category === 'Revenus' ? 'income' : 'expense',
          category: abonnement.category || 'Abonnements',
          date: nextDateStr,
          title: `Récurrence : ${abonnement.name}`,
          member_id: activeMemberIdRef.current || activeMemberId || null,
          member_name: members.find(m => m.id === (activeMemberIdRef.current || activeMemberId))?.name || 'Système',
          recurrence: 'none',
          subscription_id: abonnement.id,
          comment: serializeTransactionComment('Généré automatiquement par le système', {
            moduleSource: 'budget'
          })
        };
        transactionsToAdd.push(newTrans);

        const nextDate = new Date(nextDateStr);
        if (abonnement.period === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (abonnement.period === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else if (abonnement.period === 'daily') {
          nextDate.setDate(nextDate.getDate() + 1);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        nextDateStr = nextDate.toISOString().split('T')[0];
        updated = true;
      }

      if (updated) {
        try {
          for (const trans of transactionsToAdd) {
            await client.from('transactions').insert(trans);
          }
          await client.from('abonnements').update({ next_billing_date: nextDateStr }).eq('id', abonnement.id);
        } catch (err) {
          console.error("Error processing recurring abonnement:", err);
        }
      }
    }

    // 2. Process recurring Transactions (universal budget scheduler)
    for (const t of dbTransactions) {
      if (!t.recurrence_type || t.recurrence_type === 'none') continue;
      
      let nextDateStr = t.next_occurrence || t.start_date || t.date;
      if (!nextDateStr) continue;
      
      let updated = false;
      const transactionsToAdd: DbRows = [];
      let iterations = 0;
      
      while (nextDateStr && nextDateStr <= todayStr && iterations < 12) {
        iterations++;
        const newTxId = crypto.randomUUID();
        const newTrans = {
          id: newTxId,
          foyer_id: foyerId,
          amount: Number(t.amount || 0),
          type: t.type,
          category: t.category,
          date: nextDateStr,
          title: `Récurrence : ${t.title}`,
          member_id: t.member_id,
          member_name: t.member_name,
          recurrence: 'none',
          account_id: t.account_id,
          comment: serializeTransactionComment('Généré automatiquement par le planificateur récurrent', {
            moduleSource: t.module_source,
            categoryId: t.category_id,
            subCategoryId: t.subcategory_id
          })
        };
        transactionsToAdd.push(newTrans);
        
        // Calculate next occurrence date
        const nextDate = new Date(nextDateStr);
        const interval = t.recurrence_interval || 1;
        if (t.recurrence_type === 'daily') {
          nextDate.setDate(nextDate.getDate() + interval);
        } else if (t.recurrence_type === 'weekly') {
          nextDate.setDate(nextDate.getDate() + (interval * 7));
        } else if (t.recurrence_type === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + interval);
        } else if (t.recurrence_type === 'quarterly') {
          nextDate.setMonth(nextDate.getMonth() + 3);
        } else if (t.recurrence_type === 'semiannually') {
          nextDate.setMonth(nextDate.getMonth() + 6);
        } else if (t.recurrence_type === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + interval);
        } else {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        
        const potentialNextDateStr = nextDate.toISOString().split('T')[0];
        if (t.end_date && potentialNextDateStr > t.end_date) {
          nextDateStr = null;
        } else {
          nextDateStr = potentialNextDateStr;
        }
        updated = true;
      }
      
      if (updated) {
        try {
          for (const tx of transactionsToAdd) {
            await client.from('transactions').insert(tx);
            
            // Debit or credit the account balance in Supabase
            if (tx.account_id) {
              const { data: accData } = await client.from('accounts').select('balance').eq('id', tx.account_id).single();
              if (accData) {
                const balanceChange = tx.type === 'income' ? tx.amount : -tx.amount;
                const newBalance = Number(accData.balance || 0) + balanceChange;
                await client.from('accounts').update({ balance: newBalance }).eq('id', tx.account_id);
              }
            }
            
            // Credit child's pocket money balance if generated by argent_de_poche
            if (tx.module_source === 'argent_de_poche') {
              const kid = dbPocketMoney.find(k => k.id === tx.member_id || k.name.toLowerCase() === tx.member_name?.toLowerCase());
              if (kid) {
                const newBal = Number(kid.balance || 0) + tx.amount;
                await client.from('pocket_money').update({ balance: newBal }).eq('id', kid.id);
              }
            }
            
            // Create budget alert notification
            const alertObj = {
              id: `alert-rec-${Date.now()}-${tx.id}`,
              foyer_id: foyerId,
              title: `🔄 Transaction récurrente générée`,
              description: `La transaction "${tx.title}" de ${tx.amount}€ a été exécutée pour le ${tx.date}.`,
              time: 'À l\'instant',
              type: 'info',
              read: false,
              module: 'budget'
            };
            await client.from('alerts').insert(alertObj);
          }
          
          // Update the template transaction's next billing date in comment metadata
          const { comment: cleanComment, metadata: currentMeta } = deserializeTransactionComment(t.comment);
          const updatedMeta = { ...currentMeta, nextOccurrence: nextDateStr };
          await client.from('transactions').update({
            comment: serializeTransactionComment(cleanComment, updatedMeta)
          }).eq('id', t.id);
        } catch (err) {
          console.error("Error processing recurring transaction template:", err);
        }
      }
    }

    // 3. Process recurring ChoreTask rotations
    for (const task of dbTasks) {
      if (!task.rotation || task.rotation === 'none') continue;
      
      const taskDueDate = task.due_date;
      // Rotate if task is completed or the due date is in the past
      if (taskDueDate && (taskDueDate <= todayStr || task.validated_by_parent || task.done)) {
        try {
          const nextDueDateObj = new Date(taskDueDate || todayStr);
          if (task.rotation === 'daily') {
            nextDueDateObj.setDate(nextDueDateObj.getDate() + 1);
          } else if (task.rotation === 'weekly') {
            nextDueDateObj.setDate(nextDueDateObj.getDate() + 7);
          }
          const nextDueDateStr = nextDueDateObj.toISOString().split('T')[0];
          
          // Reset task state and set next due date
          await client.from('chore_tasks').update({
            done: false,
            validated_by_parent: false,
            due_date: nextDueDateStr
          }).eq('id', task.id);
          
          // Trigger task alert notification
          const alertObj = {
            id: `alert-chore-${Date.now()}-${task.id}`,
            foyer_id: foyerId,
            title: `🧹 Tâche récurrente replanifiée`,
            description: `La tâche "${task.title}" a été renouvelée pour le ${nextDueDateStr}.`,
            time: 'À l\'instant',
            type: 'info',
            read: false,
            module: 'tasks'
          };
          await client.from('alerts').insert(alertObj);
        } catch (err) {
          console.error("Error updating recurring chore task rotation:", err);
        }
      }
    }

    // 4. Process weekly shield resets for kids
    const maxShields = foyer?.malusSettings?.weekly_shields !== undefined ? foyer.malusSettings.weekly_shields : 3;
    const nowIso = new Date().toISOString();

    const shouldResetWeeklyShields = (lastResetDateStr: string | undefined): boolean => {
      if (!lastResetDateStr) return true;
      const lastReset = new Date(lastResetDateStr);
      const now = new Date();
      
      const getStartOfWeek = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(date.setDate(diff));
        start.setHours(0, 0, 0, 0);
        return start;
      };
      
      const lastResetWeekStart = getStartOfWeek(lastReset);
      const currentWeekStart = getStartOfWeek(now);
      
      return currentWeekStart.getTime() > lastResetWeekStart.getTime();
    };

    for (const kid of dbPocketMoney) {
      if (shouldResetWeeklyShields(kid.last_shield_reset || kid.lastShieldReset)) {
        try {
          await client.from('pocket_money').update({
            shields: maxShields,
            last_shield_reset: nowIso
          }).eq('id', kid.id);
        } catch (err) {
          console.error(`Error resetting shields for kid ${kid.id}:`, err);
        }
      }
    }
  };

  // 1.5. Silent Collaborative Background Rehydration (guarantees profile sync across all features)
  const syncDataFromCloud = async (foyerId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const membersList = await foyerService.getFoyerMembers(foyerId);
      const mappedMembers = membersList.length > 0 ? membersList.map(mapFoyerMemberToMember) : [];
      setMembers(prev => {
        const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
        const sortedNew = [...mappedMembers].sort((a, b) => a.id.localeCompare(b.id));
        if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
        return mappedMembers;
      });

      const { data: { user } } = await client.auth.getUser();
      const currentActiveId = activeMemberIdRef.current || activeMemberId;
      const selfMember = membersList.find(m => (user && m.userId === user.id) || m.id === currentActiveId);
      if (myMemberProfile && selfMember) {
        setMyMemberProfile(prev => {
          if (JSON.stringify(prev) === JSON.stringify(selfMember)) return prev;
          return selfMember;
        });
      }

      // Parallelize queries to Supabase
      const [
        eventsRes,
        groceriesRes,
        transactionsRes,
        documentsRes,
        dishesRes,
        tasksRes,
        savingGoalsRes,
        memoriesRes,
        votesRes,
        schoolTasksRes,
        chatGroupsRes,
        demarchesRes,
        packsRes,
        vehiclesRes,
        maintenanceRes,
        tripsRes,
        petsRes,
        pocketMoneyRes,
        artisansRes,
        customCategoriesRes,
        accountsRes,
        abonnementsRes,
        debtsRes
      ] = await Promise.all([
        client.from('events').select('*').eq('foyer_id', foyerId),
        client.from('groceries').select('*').eq('foyer_id', foyerId),
        client.from('transactions').select('id, foyer_id, amount, type, category, date, title, member_id, member_name, sub_category, account_id, comment, modification_history, is_archived, recurrence, subscription_id, created_at').eq('foyer_id', foyerId),
        client.from('documents').select('id, foyer_id, name, category, sub_category, member_id, member_name, tags, upload_date, expiry_date, file_size, is_expired, description, is_secure, created_at').eq('foyer_id', foyerId),
        client.from('dishes').select('*').eq('foyer_id', foyerId),
        client.from('chore_tasks').select('*').eq('foyer_id', foyerId),
        client.from('saving_goals').select('*').eq('foyer_id', foyerId),
        client.from('memories').select('id, foyer_id, date, title, description, author_name, author_photo, image_url, likes_count, is_private, theme, created_at').eq('foyer_id', foyerId),
        client.from('votes').select('*').eq('foyer_id', foyerId),
        client.from('school_tasks').select('*').eq('foyer_id', foyerId),
        client.from('chat_groups').select('*').eq('foyer_id', foyerId),
        client.from('demarches').select('*').eq('foyer_id', foyerId),
        client.from('justificatif_packs').select('*').eq('foyer_id', foyerId),
        client.from('vehicles').select('*').eq('foyer_id', foyerId),
        client.from('maintenance').select('*').eq('foyer_id', foyerId),
        client.from('trips').select('*').eq('foyer_id', foyerId),
        client.from('pets').select('*').eq('foyer_id', foyerId),
        client.from('pocket_money').select('*').eq('foyer_id', foyerId),
        client.from('artisans').select('*').eq('foyer_id', foyerId),
        client.from('custom_categories').select('*').eq('foyer_id', foyerId),
        client.from('accounts').select('*').eq('foyer_id', foyerId),
        client.from('abonnements').select('*').eq('foyer_id', foyerId),
        client.from('debts').select('*').eq('foyer_id', foyerId)
      ]);

      // Log query volumes for optimization audit
      logQueryVolume('transactions', 'syncDataFromCloud', transactionsRes?.data);
      logQueryVolume('documents', 'syncDataFromCloud', documentsRes?.data);
      logQueryVolume('memories', 'syncDataFromCloud', memoriesRes?.data);

      // Map and set states conditionally to avoid unnecessary component renders and loops
      if (eventsRes.data) {
        const mapped = eventsRes.data.map(e => ({
          id: e.id, title: e.title, type: e.type, dateTime: e.date_time, time: e.time,
          memberId: e.member_id, memberName: e.member_name, location: e.location,
          description: e.description, done: e.done, amount: e.amount ? Number(e.amount) : undefined
        }));
        setEvents(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (groceriesRes.data) {
        const mapped = groceriesRes.data.map(g => ({
          id: g.id, name: g.name, category: g.category, quantity: g.quantity,
          checked: g.checked, inStock: g.in_stock, expiryDate: g.expiry_date,
          meal: g.meal || undefined, addedBy: g.added_by || undefined, isFavorite: !!g.is_favorite
        }));
        setGroceries(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (transactionsRes.data) {
        const mapped = transactionsRes.data.map((t: DbRow) => {
          const { comment, metadata } = deserializeTransactionComment(t.comment);
          return {
            id: t.id, amount: Number(t.amount), type: t.type, category: t.category,
            date: t.date, title: t.title, memberId: t.member_id, memberName: t.member_name,
            subCategory: t.sub_category, accountId: t.account_id,
            receiptUrl: storageUrlFromLegacy(t.receipt_url, t.receipt_base64), attachmentUrl: storageUrlFromLegacy(t.attachment_url, t.attachment_base64),
            receiptBase64: legacyDataUrlOnly(t.receipt_base64), attachmentBase64: legacyDataUrlOnly(t.attachment_base64), comment: comment,
            modificationHistory: typeof t.modification_history === 'string' ? JSON.parse(t.modification_history) : t.modification_history || [],
            isArchived: !!t.is_archived, recurrence: t.recurrence || 'none', subscriptionId: t.subscription_id,
            moduleSource: metadata.moduleSource || undefined,
            categoryId: metadata.moduleSource || undefined,
            subCategoryId: t.sub_category || undefined,
            currency: 'EUR',
            travelId: metadata.travelId || undefined,
            travel_id: metadata.travelId || undefined,
            recurrenceInterval: metadata.recurrenceInterval ? Number(metadata.recurrenceInterval) : undefined,
            startDate: metadata.startDate || undefined,
            endDate: metadata.endDate || undefined,
            nextOccurrence: metadata.nextOccurrence || undefined,
            entryTime: (() => {
              if (metadata.entryTime) return metadata.entryTime;
              if (t.created_at) {
                const d = new Date(t.created_at.replace(' ', 'T'));
                if (!isNaN(d.getTime())) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              }
              return undefined;
            })(),
            entryDate: metadata.entryDate || t.date || undefined,
            createdAt: t.created_at || undefined,
            updatedAt: t.created_at || undefined
          };
        });
        setTransactions(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (documentsRes.data) {
        const mapped = documentsRes.data.map((d: DbRow) => ({
          id: d.id, name: d.name, category: d.category, subCategory: d.sub_category,
          memberId: d.member_id, memberName: d.member_name, tags: d.tags || [],
          uploadDate: d.upload_date, expiryDate: d.expiry_date, fileSize: d.file_size,
          isExpired: d.is_expired, description: d.description, fileUrl: storageUrlFromLegacy(d.file_url, d.file_base64), thumbnailUrl: d.thumbnail_url || undefined, fileBase64: legacyDataUrlOnly(d.file_base64), isSecure: d.is_secure
        }));
        setDocuments(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (dishesRes.data) {
        const mapped = dishesRes.data.map(d => ({
          id: d.id, day: d.day, mealType: d.meal_type, name: d.name, image: d.image, ingredients: d.ingredients || []
        }));
        setDishes(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (tasksRes.data) {
        const mapped = tasksRes.data.map(t => {
          const meta = parseChoreTitle(t.title);
          return {
            id: t.id,
            title: meta.title || t.title,
            rewardPoints: t.reward_points,
            assignedMemberId: t.assigned_member_id,
            assignedMemberName: t.assigned_member_name,
            done: t.done,
            rotation: t.rotation,
            validatedByParent: t.validated_by_parent,
            dueDate: t.due_date,
            rewardAmount: t.reward_amount ? Number(t.reward_amount) : undefined,
            description: meta.description,
            priority: meta.priority,
            status: meta.status,
            validationRequired: meta.validationRequired,
            isArchived: meta.isArchived,
            time: meta.time,
            assignedMemberIds: meta.assignedMemberIds,
            recurrence: meta.recurrence
          };
        });
        setTasks(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (savingGoalsRes.data) {
        const mapped = savingGoalsRes.data.map(s => ({
          id: s.id, title: s.title, targetAmount: Number(s.target_amount),
          currentAmount: Number(s.current_amount), targetDate: s.target_date, category: s.category,
          contributions: typeof s.contributions === 'string' ? JSON.parse(s.contributions) : s.contributions || []
        }));
        setSavingGoals(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (memoriesRes.data) {
        const mapped = removeLegacyDemoMemories(memoriesRes.data).map(mapCloudMemory);
        setMemories(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (votesRes.data) {
        const mapped = votesRes.data.map(v => ({
          id: v.id, question: v.question, authorName: v.author_name, active: v.active,
          dueDate: v.due_date, options: v.options
        }));
        setVotes(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (schoolTasksRes.data) {
        const mapped = removeLegacyDemoSchoolTasks(schoolTasksRes.data).map(s => ({
          id: s.id, subject: s.subject, title: s.title, dueDate: s.due_date, done: s.done,
          assignedMemberId: s.assigned_member_id, difficulty: s.difficulty, grade: s.grade || undefined
        }));
        setSchoolTasks(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (chatGroupsRes.data) {
        const mapped = chatGroupsRes.data.map(c => ({
          id: c.id, name: c.name, isPrivate: c.is_private, memberIds: c.member_ids || [],
          lastMessage: c.last_message || undefined, lastMessageTime: c.last_message_time || undefined, unreadCount: c.unread_count || 0
        }));
        setChatGroups(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (demarchesRes.data) {
        const mapped = demarchesRes.data.map(d => ({
          id: d.id, templateId: d.template_id || undefined, title: d.title, icon: d.icon, status: d.status,
          assignedMemberId: d.assigned_member_id || undefined, assignedMemberName: d.assigned_member_name || undefined,
          steps: d.steps || [], pieces: d.pieces || [], createdAt: d.created_at_text, notes: d.notes || undefined
        }));
        setDemarches(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (packsRes.data) {
        const mapped = packsRes.data.map(p => ({
          id: p.id, name: p.name, templateType: p.template_type, documentIds: p.document_ids || [], createdAt: p.created_at_text
        }));
        setJustificatifPacks(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (vehiclesRes.data) {
        const mapped = vehiclesRes.data.map(v => ({
          id: v.id, name: v.name, plate: v.plate || '', insuranceExpiry: v.insurance_expiry || '',
          technicalControl: v.technical_control || '', lastService: v.last_service || '', nextService: v.next_service || '', mileage: v.mileage || 0
        }));
        setVehicles(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (maintenanceRes.data) {
        const mapped = maintenanceRes.data.map(m => ({
          id: m.id, title: m.title, date: m.date || '', cost: m.cost || 0, status: m.status || 'scheduled', provider: m.provider || ''
        }));
        setMaintenance(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (tripsRes.data) {
        const mapped = tripsRes.data.map(t => ({
          id: t.id, destination: t.destination, startDate: t.start_date || '', endDate: t.end_date || '',
          budget: t.budget || 0, checklist: t.checklist || [], bookingRefs: t.booking_refs || []
        }));
        setTrips(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (petsRes.data) {
        const mapped = petsRes.data.map(p => ({
          id: p.id, name: p.name, species: p.species || '', lastVaccine: p.last_vaccine || '', nextVaccine: p.next_vaccine || '',
          vetAppointment: p.vet_appointment || undefined, notes: p.notes || undefined,
          weightHistory: typeof p.weight_history === 'string' ? JSON.parse(p.weight_history) : p.weight_history || [], documentIds: p.document_ids || []
        }));
        setPets(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (pocketMoneyRes.data) {
        const mapped = pocketMoneyRes.data.map((p: DbRow) => {
          const meta = parsePocketMoneyTitle(p.goal_title || '');
          return {
            id: p.id,
            name: p.name,
            balance: Number(p.balance || 0),
            points: Number(p.points || 0),
            avatar: p.avatar || '',
            goalTitle: meta.goalTitle || '',
            goalAmount: p.goal_amount ? Number(p.goal_amount) : undefined,
            goalType: meta.goalType || 'money',
            rules: meta.rules || []
          };
        });
        setPocketMoney(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (artisansRes.data) {
        const mapped = artisansRes.data.map(a => ({
          id: a.id, name: a.name, specialty: a.specialty, phone: a.phone || '', email: a.email || '', rating: a.rating || 5, notes: a.notes || ''
        }));
        setArtisans(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (customCategoriesRes && customCategoriesRes.data) {
        const mapped = customCategoriesRes.data.map(cc => {
          const meta = deserializeCategoryIcon(cc.icon);
          return {
            id: cc.id, name: cc.name, icon: meta.icon, color: cc.color, budget: Number(cc.budget || 0), displayOrder: Number(cc.display_order || 0),
            subcategories: meta.subcategories.length > 0 ? meta.subcategories : undefined,
            isArchived: meta.isArchived || undefined
          };
        });
        setCustomCategories(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (accountsRes && accountsRes.data) {
        const metadataStr = localStorage.getItem('mf_accounts_metadata');
        const metadata = metadataStr ? JSON.parse(metadataStr) : {};
        const mapped = accountsRes.data.map(a => {
          const meta = metadata[a.id] || {};
          return {
            id: a.id,
            name: a.name,
            type: a.type || 'bank',
            balance: Number(a.balance || 0),
            icon: meta.icon || undefined,
            color: meta.color || undefined,
            initialBalance: meta.initialBalance !== undefined ? Number(meta.initialBalance) : undefined
          };
        });
        setAccounts(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (abonnementsRes && abonnementsRes.data) {
        const mapped = abonnementsRes.data.map(a => ({
          id: a.id, name: a.name, amount: Number(a.amount || 0), period: a.period || 'monthly', nextBillingDate: a.next_billing_date || '', category: a.category
        }));
        setAbonnements(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }

      if (debtsRes && debtsRes.data) {
        const mapped = debtsRes.data.map(d => ({
          id: d.id, title: d.title, amount: Number(d.amount || 0), payerId: d.payer_id, payerName: d.payer_name, debtorId: d.debtor_id, debtorName: d.debtor_name, isRepaid: !!d.is_repaid
        }));
        setDebts(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });
      }
    } catch (silentErr: LooseValue) {
      console.warn("[MyFamily+ Background Sync] Silent poll failure:", silentErr.message);
    }
  };

  // Timer loop for silent collaborative rehydration & Focus Sync.
  // Realtime covers live updates; this is only a safety net, so keep it quiet to avoid Postgres egress spikes.
  useEffect(() => {
    if (!foyer || !isSyncReady) return;
    let lastSyncAt = 0;
    const minFocusSyncIntervalMs = 2 * 60 * 1000;

    // Passive polling every 15 minutes, only while the tab is visible.
    const syncTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      syncDataFromCloud(foyer.id);
      lastSyncAt = Date.now();
    }, 900000);

    // Sync on tab active/refocus, throttled to avoid repeat egress from tab switching.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastSyncAt < minFocusSyncIntervalMs) return;
        console.log("[MyFamily+ Focus Sync] Tab focused, running immediate rehydration sync...");
        syncDataFromCloud(foyer.id);
        lastSyncAt = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [foyer, isSyncReady]);

  // 2. Realtime collaborative subscriptions
  useEffect(() => {
    if (!foyer) return;

    const subEvents = foyerService.subscribeToChanges('events', foyer.id, () => {
      foyerService.fetchTableData('events', foyer.id).then(eventsData => {
        if (eventsData) {
          const mapped = eventsData.map(e => ({
            id: e.id,
            title: e.title,
            type: e.type,
            dateTime: e.date_time,
            time: e.time,
            memberId: e.member_id,
            memberName: e.member_name,
            location: e.location,
            description: e.description,
            done: e.done,
            amount: e.amount ? Number(e.amount) : undefined
          }));
          setEvents(prev => {
            const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
            const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
            if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
            return mapped;
          });
        }
      });
    });

    const subGroceries = foyerService.subscribeToChanges('groceries', foyer.id, (payload: LooseValue) => {
      if (!payload) return;
      console.log("[Groceries Realtime Change] Received payload:", payload.eventType, "new:", payload.new, "old:", payload.old);

      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setGroceries(prev => prev.filter(g => g.id !== deletedId));
      } 
      else if (payload.eventType === 'INSERT') {
        const newItem: GroceryItem = {
          id: payload.new.id,
          name: payload.new.name,
          category: payload.new.category || 'Général',
          quantity: payload.new.quantity || '',
          checked: !!payload.new.checked,
          inStock: !!payload.new.in_stock,
          expiryDate: payload.new.expiry_date || undefined,
          meal: payload.new.meal || undefined,
          addedBy: payload.new.added_by || undefined,
          isFavorite: !!payload.new.is_favorite
        };
        setGroceries(prev => {
          if (prev.some(g => g.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
      } 
      else if (payload.eventType === 'UPDATE') {
        const updatedId = payload.new.id;
        console.log("[Groceries Realtime Change] Updating item", updatedId, "checked from new payload:", payload.new.checked);
        setGroceries(prev => prev.map(g => {
          if (g.id === updatedId) {
            return {
              ...g,
              name: payload.new.name,
              category: payload.new.category || g.category,
              quantity: payload.new.quantity || g.quantity,
              checked: !!payload.new.checked,
              inStock: !!payload.new.in_stock,
              expiryDate: payload.new.expiry_date || g.expiryDate,
              meal: payload.new.meal || undefined,
              addedBy: payload.new.added_by || undefined,
              isFavorite: !!payload.new.is_favorite
            };
          }
          return g;
        }));
      }
    });

    const subArchivedLists = foyerService.subscribeToChanges('archived_lists', foyer.id, (payload: LooseValue) => {
      if (!payload) return;
      console.log("[ArchivedLists Realtime Change] Received payload:", payload.eventType);

      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setArchivedLists(prev => prev.filter(l => l.id !== deletedId));
      }
      else if (payload.eventType === 'INSERT') {
        const newList: ArchivedList = {
          id: payload.new.id,
          name: payload.new.name,
          date: payload.new.date,
          items: typeof payload.new.items === 'string' ? JSON.parse(payload.new.items) : payload.new.items || [],
          store: payload.new.store || undefined,
          createdBy: payload.new.created_by
        };
        setArchivedLists(prev => {
          if (prev.some(l => l.id === newList.id)) return prev;
          return [newList, ...prev];
        });
      }
      else if (payload.eventType === 'UPDATE') {
        const updatedId = payload.new.id;
        setArchivedLists(prev => prev.map(l => {
          if (l.id === updatedId) {
            return {
              ...l,
              name: payload.new.name,
              date: payload.new.date,
              items: typeof payload.new.items === 'string' ? JSON.parse(payload.new.items) : payload.new.items || [],
              store: payload.new.store || undefined,
              createdBy: payload.new.created_by
            };
          }
          return l;
        }));
      }
    });

    const subTasks = foyerService.subscribeToChanges('chore_tasks', foyer.id, () => {
      foyerService.fetchTableData('chore_tasks', foyer.id).then(tasksData => {
        if (tasksData) {
          const mapped = tasksData.map(t => {
            const meta = parseChoreTitle(t.title);
            return {
              id: t.id,
              title: meta.title || t.title,
              rewardPoints: t.reward_points,
              assignedMemberId: t.assigned_member_id,
              assignedMemberName: t.assigned_member_name,
              done: t.done,
              rotation: t.rotation,
              validatedByParent: t.validated_by_parent,
              dueDate: t.due_date,
              rewardAmount: t.reward_amount ? Number(t.reward_amount) : undefined,
              description: meta.description,
              priority: meta.priority,
              status: meta.status,
              validationRequired: meta.validationRequired,
              isArchived: meta.isArchived,
              time: meta.time,
              assignedMemberIds: meta.assignedMemberIds,
              recurrence: meta.recurrence
            };
          });
          setTasks(prev => {
            const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
            const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
            if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
            return mapped;
          });
        }
      });
    });

    const subMessages = foyerService.subscribeToChanges('chat_messages', foyer.id, (payload: LooseValue) => {
      if (!payload) return;

      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setChatMessages(prev => prev.filter(m => m.id !== deletedId));
      } 
      else if (payload.eventType === 'INSERT') {
        const reactionsVal = payload.new.reactions;
        const reactionsParsed = typeof reactionsVal === 'string' 
          ? JSON.parse(reactionsVal) 
          : reactionsVal || [];

        const newMsg: ChatMessage = {
          id: payload.new.id,
          groupId: payload.new.group_id,
          senderId: payload.new.sender_id,
          senderUserId: payload.new.sender_user_id,
          senderName: payload.new.sender_name,
          type: payload.new.type,
          content: payload.new.content,
          timestamp: payload.new.timestamp,
          readBy: payload.new.read_by || [],
          reactions: reactionsParsed
        };

        setChatMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Update the last message preview of the group locally
        setChatGroups(prev => prev.map(g => g.id === newMsg.groupId ? { 
          ...g, 
          lastMessage: newMsg.type === 'voice' 
            ? '🎤 Message vocal' 
            : newMsg.content.startsWith('data:') 
              ? '📷 Photo' 
              : newMsg.content,
          lastMessageTime: newMsg.timestamp 
        } : g));

        // Le push système est géré par FCM. Le realtime met seulement l'UI à jour.
      }
      else if (payload.eventType === 'UPDATE') {
        const reactionsVal = payload.new.reactions;
        const reactionsParsed = typeof reactionsVal === 'string' 
          ? JSON.parse(reactionsVal) 
          : reactionsVal || [];

        const updatedMsg: ChatMessage = {
          id: payload.new.id,
          groupId: payload.new.group_id,
          senderId: payload.new.sender_id,
          senderName: payload.new.sender_name,
          type: payload.new.type,
          content: payload.new.content,
          timestamp: payload.new.timestamp,
          readBy: payload.new.read_by || [],
          reactions: reactionsParsed
        };

        setChatMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      }
    });

    const subMemories = foyerService.subscribeToChanges('memories', foyer.id, (payload: LooseValue) => {
      if (!payload) return;

      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setMemories(prev => prev.filter(m => m.id !== deletedId));
      } 
      else if (payload.eventType === 'INSERT') {
        if (LEGACY_DEMO_MEMORY_IDS.has(String(payload.new.id || ''))) return;
        const newItem = mapCloudMemory(payload.new);
        setMemories(prev => {
          if (prev.some(m => m.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });

        // Le push système est géré par FCM. Le realtime met seulement l'UI à jour.
      }
      else if (payload.eventType === 'UPDATE') {
        if (LEGACY_DEMO_MEMORY_IDS.has(String(payload.new.id || ''))) return;
        const updatedItem = mapCloudMemory(payload.new);
        setMemories(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
      }
    });

    const subMembers = foyerService.subscribeToChanges('foyer_members', foyer.id, () => {
      foyerService.getFoyerMembers(foyer.id).then(membersList => {
        const mapped = (membersList || []).map(mapFoyerMemberToMember);
        setMembers(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });

        // Instant Realtime Role and Exemption synchronization for the connected user
        if (myMemberProfile) {
          const updatedSelf = membersList.find(m => m.id === myMemberProfile.id);
          if (updatedSelf) {
            setMyMemberProfile(updatedSelf);
          }
        }
      });
    });

    const subVehicles = foyerService.subscribeToChanges('vehicles', foyer.id, () => {
      foyerService.fetchTableData('vehicles', foyer.id).then(vehiclesData => {
        if (vehiclesData) {
          setVehicles(vehiclesData.map(v => ({
            id: v.id,
            name: v.name,
            plate: v.plate || '',
            insuranceExpiry: v.insurance_expiry || '',
            technicalControl: v.technical_control || '',
            lastService: v.last_service || '',
            nextService: v.next_service || '',
            mileage: v.mileage ? Number(v.mileage) : 0
          })));
        }
      });
    });

    const subMaintenance = foyerService.subscribeToChanges('maintenance', foyer.id, () => {
      foyerService.fetchTableData('maintenance', foyer.id).then(maintData => {
        if (maintData) {
          setMaintenance(maintData.map(m => ({
            id: m.id,
            title: m.title,
            provider: m.provider || '',
            date: m.date || '',
            cost: Number(m.cost || 0),
            status: (m.status as LooseValue) || 'scheduled'
          })));
        }
      });
    });

    const subTrips = foyerService.subscribeToChanges('trips', foyer.id, () => {
      foyerService.fetchTableData('trips', foyer.id).then(tripsData => {
        if (tripsData) {
          setTrips(tripsData.map(t => ({
            id: t.id,
            destination: t.destination,
            startDate: t.start_date || '',
            endDate: t.end_date || '',
            budget: Number(t.budget || 0),
            checklist: typeof t.checklist === 'string' ? JSON.parse(t.checklist) : t.checklist || [],
            bookingRefs: t.booking_refs || []
          })));
        }
      });
    });

    const subPets = foyerService.subscribeToChanges('pets', foyer.id, () => {
      foyerService.fetchTableData('pets', foyer.id).then(petsData => {
        if (petsData) {
          setPets(petsData.map(p => ({
            id: p.id,
            name: p.name,
            species: p.species || '',
            lastVaccine: p.last_vaccine || '',
            nextVaccine: p.next_vaccine || '',
            vetAppointment: p.vet_appointment || undefined,
            notes: p.notes || undefined,
            weightHistory: typeof p.weight_history === 'string' ? JSON.parse(p.weight_history) : p.weight_history || [],
            documentIds: p.document_ids || []
          })));
        }
      });
    });

    const subPocketMoney = foyerService.subscribeToChanges('pocket_money', foyer.id, () => {
      foyerService.fetchTableData('pocket_money', foyer.id).then(pmData => {
        if (pmData) {
          setPocketMoney(pmData.map((p: DbRow) => {
            const meta = parsePocketMoneyTitle(p.goal_title || '');
            return {
              id: p.id,
              name: p.name,
              balance: Number(p.balance || 0),
              points: Number(p.points || 0),
              avatar: p.avatar || '',
              shields: p.shields !== undefined && p.shields !== null ? Number(p.shields) : 3,
              streak: p.streak !== undefined && p.streak !== null ? Number(p.streak) : 0,
              lastShieldReset: p.last_shield_reset || undefined,
              lastConnection: p.last_connection || undefined,
              goalTitle: meta.goalTitle || '',
              goalAmount: p.goal_amount ? Number(p.goal_amount) : undefined,
              goalType: meta.goalType || 'money',
              rules: meta.rules || []
            };
          }));
        }
      });
    });

    const subArtisans = foyerService.subscribeToChanges('artisans', foyer.id, () => {
      foyerService.fetchTableData('artisans', foyer.id).then(artisansData => {
        if (artisansData) {
          setArtisans(artisansData.map(a => ({
            id: a.id,
            name: a.name,
            specialty: a.specialty,
            phone: a.phone || '',
            email: a.email || '',
            rating: a.rating || 5,
            notes: a.notes || ''
          })));
        }
      });
    });

    const subAlerts = foyerService.subscribeToChanges('alerts', foyer.id, (payload: LooseValue) => {
      if (payload && payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setAlerts(prev => prev.filter(a => a.id !== deletedId));
          return;
        }
      }

      const client = getSupabaseClient();
      if (!client) return;
      
      let query = client.from('alerts').select('*').eq('foyer_id', foyer.id);
      const selfMember = myMemberProfileRef.current || myMemberProfile;
      const joinedAtVal = selfMember ? selfMember.joinedAt : null;
      if (joinedAtVal) {
        query = query.gte('created_at', joinedAtVal);
      }

      query.then(({ data: alertsData }) => {
        if (alertsData) {
          setAlerts(alertsData.map(a => ({
            id: a.id,
            title: a.title,
            description: a.description,
            time: a.time,
            type: a.type,
            read: a.read,
            module: a.module,
            senderUserId: a.sender_user_id,
            senderMemberId: a.sender_member_id,
            senderName: a.sender_name,
            senderAvatar: a.sender_avatar,
            createdAt: a.created_at
          })));
        }
      });

      if (payload && payload.eventType === 'INSERT') {
        const isCreatedByMe = payload.new.id && payload.new.id.includes(`-by-${activeMemberIdRef.current}`);
        const joinedAtVal = myMemberProfileRef.current?.joinedAt || myMemberProfile?.joinedAt;
        const isNewerThanJoined = !joinedAtVal || (payload.new.created_at && new Date(payload.new.created_at) >= new Date(joinedAtVal));
        if (!isCreatedByMe && isNewerThanJoined) {
          setActiveToast({
            title: payload.new.title || 'Nouvelle notification',
            description: payload.new.description || ''
          });
        }
      }
    });

    const subTransactions = foyerService.subscribeToChanges('transactions', foyer.id, () => {
      foyerService.fetchTableData('transactions', foyer.id).then(transData => {
        if (transData) {
          setTransactions(transData.map(t => {
            const { comment, metadata } = deserializeTransactionComment(t.comment);
            return {
              id: t.id,
              amount: Number(t.amount || 0),
              type: t.type,
              category: t.category,
              date: t.date,
              title: t.title,
              memberId: t.member_id,
              memberName: t.member_name,
              subCategory: t.sub_category,
              accountId: t.account_id,
              receiptUrl: storageUrlFromLegacy(t.receipt_url, t.receipt_base64),
              attachmentUrl: storageUrlFromLegacy(t.attachment_url, t.attachment_base64),
              receiptBase64: legacyDataUrlOnly(t.receipt_base64),
              attachmentBase64: legacyDataUrlOnly(t.attachment_base64),
              comment: comment,
              modificationHistory: typeof t.modification_history === 'string' ? JSON.parse(t.modification_history) : t.modification_history || [],
              isArchived: !!t.is_archived,
              recurrence: t.recurrence || 'none',
              subscriptionId: t.subscription_id,
              moduleSource: metadata.moduleSource || undefined,
              categoryId: metadata.moduleSource || undefined,
              subCategoryId: t.sub_category || undefined,
              currency: 'EUR',
              travelId: metadata.travelId || undefined,
              travel_id: metadata.travelId || undefined,
              recurrenceInterval: metadata.recurrenceInterval ? Number(metadata.recurrenceInterval) : undefined,
              startDate: metadata.startDate || undefined,
              endDate: metadata.endDate || undefined,
              nextOccurrence: metadata.nextOccurrence || undefined,
              entryTime: (() => {
                if (metadata.entryTime) return metadata.entryTime;
                if (t.created_at) {
                  const d = new Date(t.created_at.replace(' ', 'T'));
                  if (!isNaN(d.getTime())) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                }
                return undefined;
              })(),
              entryDate: metadata.entryDate || t.date || undefined,
              createdAt: t.created_at || undefined,
              updatedAt: t.created_at || undefined
            };
          }));
        }
      });
    });

    const subSavingGoals = foyerService.subscribeToChanges('saving_goals', foyer.id, () => {
      foyerService.fetchTableData('saving_goals', foyer.id).then(goalsData => {
        if (goalsData) {
          setSavingGoals(goalsData.map(g => ({
            id: g.id,
            title: g.title,
            targetAmount: Number(g.target_amount || 0),
            currentAmount: Number(g.current_amount || 0),
            targetDate: g.target_date || '',
            category: g.category || 'General',
            contributions: typeof g.contributions === 'string' ? JSON.parse(g.contributions) : g.contributions || []
          })));
        }
      });
    });

    const subCustomCategories = foyerService.subscribeToChanges('custom_categories', foyer.id, () => {
      foyerService.fetchTableData('custom_categories', foyer.id).then(data => {
        if (data) {
          setCustomCategories(data.map(cc => {
            const meta = deserializeCategoryIcon(cc.icon);
            return {
              id: cc.id,
              name: cc.name,
              icon: meta.icon,
              color: cc.color,
              budget: Number(cc.budget || 0),
              displayOrder: Number(cc.display_order || 0),
              subcategories: meta.subcategories.length > 0 ? meta.subcategories : undefined,
              isArchived: meta.isArchived || undefined
            };
          }));
        }
      });
    });

    const subAccounts = foyerService.subscribeToChanges('accounts', foyer.id, () => {
      foyerService.fetchTableData('accounts', foyer.id).then(data => {
        if (data) {
          const metadataStr = localStorage.getItem('mf_accounts_metadata');
          const metadata = metadataStr ? JSON.parse(metadataStr) : {};
          setAccounts(data.map(a => {
            const meta = metadata[a.id] || {};
            return {
              id: a.id,
              name: a.name,
              type: a.type || 'bank',
              balance: Number(a.balance || 0),
              icon: meta.icon || undefined,
              color: meta.color || undefined,
              initialBalance: meta.initialBalance !== undefined ? Number(meta.initialBalance) : undefined
            };
          }));
        }
      });
    });

    const subAbonnements = foyerService.subscribeToChanges('abonnements', foyer.id, () => {
      foyerService.fetchTableData('abonnements', foyer.id).then(data => {
        if (data) {
          setAbonnements(data.map(a => ({
            id: a.id,
            name: a.name,
            amount: Number(a.amount || 0),
            period: a.period || 'monthly',
            nextBillingDate: a.next_billing_date || '',
            category: a.category
          })));
        }
      });
    });

    const subDebts = foyerService.subscribeToChanges('debts', foyer.id, () => {
      foyerService.fetchTableData('debts', foyer.id).then(data => {
        if (data) {
          setDebts(data.map(d => ({
            id: d.id,
            title: d.title,
            amount: Number(d.amount || 0),
            payerId: d.payer_id,
            payerName: d.payer_name,
            debtorId: d.debtor_id,
            debtorName: d.debtor_name,
            isRepaid: !!d.is_repaid
          })));
        }
      });
    });

    const subVotes = foyerService.subscribeToChanges('votes', foyer.id, () => {
      foyerService.fetchTableData('votes', foyer.id).then(votesData => {
        if (votesData) {
          setVotes(votesData.map(v => ({
            id: v.id,
            question: v.question || v.title || '',
            options: typeof v.options === 'string' ? JSON.parse(v.options) : v.options || [],
            authorName: v.author_name || v.created_by_name || 'Parent',
            active: !!v.active,
            dueDate: v.due_date || v.deadline || ''
          })));
        }
      });
    });

    const subSchoolTasks = foyerService.subscribeToChanges('school_tasks', foyer.id, () => {
      foyerService.fetchTableData('school_tasks', foyer.id).then(tasksData => {
        if (tasksData) {
          setSchoolTasks(removeLegacyDemoSchoolTasks(tasksData).map(t => ({
            id: t.id,
            subject: t.subject,
            title: t.title,
            dueDate: t.due_date || '',
            done: !!t.done,
            assignedMemberId: t.assigned_member_id || '',
            difficulty: t.difficulty || 'easy',
            grade: t.grade
          })));
        }
      });
    });

    const subDemarches = foyerService.subscribeToChanges('demarches', foyer.id, () => {
      foyerService.fetchTableData('demarches', foyer.id).then(demarchesData => {
        if (demarchesData) {
          setDemarches(demarchesData.map(d => ({
            id: d.id,
            templateId: d.template_id,
            title: d.title,
            icon: d.icon || 'FileText',
            status: d.status || 'à faire',
            assignedMemberId: d.assigned_member_id,
            assignedMemberName: d.assigned_member_name,
            steps: typeof d.steps === 'string' ? JSON.parse(d.steps) : d.steps || [],
            pieces: typeof d.pieces === 'string' ? JSON.parse(d.pieces) : d.pieces || [],
            createdAt: d.created_at_text || '',
            notes: d.notes || ''
          })));
        }
      });
    });

    const subJustificatifPacks = foyerService.subscribeToChanges('justificatif_packs', foyer.id, () => {
      foyerService.fetchTableData('justificatif_packs', foyer.id).then(packsData => {
        if (packsData) {
          setJustificatifPacks(packsData.map(p => ({
            id: p.id,
            name: p.name || p.title || '',
            templateType: p.template_type || '',
            documentIds: p.document_ids || [],
            createdAt: p.created_at_text || ''
          })));
        }
      });
    });

    const subMalusTemplates = foyerService.subscribeToChanges('malus_templates', foyer.id, () => {
      foyerService.fetchTableData('malus_templates', foyer.id).then(templatesData => {
        if (templatesData) {
          setMalusTemplates(templatesData.map((m: DbRow) => ({
            id: m.id,
            foyerId: m.foyer_id,
            title: m.title,
            emoji: m.emoji,
            description: m.description || '',
            category: m.category,
            starsRemoved: Number(m.stars_removed || 0),
            xpRemoved: Number(m.xp_removed || 0),
            lossStreak: !!m.loss_streak,
            lossShield: !!m.loss_shield,
            commentRequired: !!m.comment_required,
            doubleParentValidation: !!m.double_parent_validation,
            createdAt: m.created_at
          })));
        }
      });
    });

    const subAppliedMaluses = foyerService.subscribeToChanges('malus_applied', foyer.id, () => {
      foyerService.fetchTableData('malus_applied', foyer.id).then(appliedData => {
        if (appliedData) {
          setAppliedMaluses(appliedData.map((m: DbRow) => ({
            id: m.id,
            foyerId: m.foyer_id,
            memberId: m.member_id,
            title: m.title,
            emoji: m.emoji,
            description: m.description || '',
            starsRemoved: Number(m.stars_removed || 0),
            xpRemoved: Number(m.xp_removed || 0),
            lossStreak: !!m.loss_streak,
            lossShield: !!m.loss_shield,
            comment: m.comment || '',
            shieldUsed: !!m.shield_used,
            repaired: !!m.repaired,
            repairedAt: m.repaired_at,
            reparationTaskId: m.reparation_task_id || '',
            createdAt: m.created_at
          })));
        }
      });
    });

    return () => {
      if (subEvents) subEvents.unsubscribe();
      if (subGroceries) subGroceries.unsubscribe();
      if (subArchivedLists) subArchivedLists.unsubscribe();
      if (subTasks) subTasks.unsubscribe();
      if (subMessages) subMessages.unsubscribe();
      if (subMemories) subMemories.unsubscribe();
      if (subMembers) subMembers.unsubscribe();
      if (subVehicles) subVehicles.unsubscribe();
      if (subMaintenance) subMaintenance.unsubscribe();
      if (subTrips) subTrips.unsubscribe();
      if (subPets) subPets.unsubscribe();
      if (subPocketMoney) subPocketMoney.unsubscribe();
      if (subArtisans) subArtisans.unsubscribe();
      if (subAlerts) subAlerts.unsubscribe();
      if (subTransactions) subTransactions.unsubscribe();
      if (subSavingGoals) subSavingGoals.unsubscribe();
      if (subVotes) subVotes.unsubscribe();
      if (subSchoolTasks) subSchoolTasks.unsubscribe();
      if (subDemarches) subDemarches.unsubscribe();
      if (subJustificatifPacks) subJustificatifPacks.unsubscribe();
      if (subCustomCategories) subCustomCategories.unsubscribe();
      if (subAccounts) subAccounts.unsubscribe();
      if (subAbonnements) subAbonnements.unsubscribe();
      if (subDebts) subDebts.unsubscribe();
      if (subMalusTemplates) subMalusTemplates.unsubscribe();
      if (subAppliedMaluses) subAppliedMaluses.unsubscribe();
    };
  }, [foyer]);

  // Trigger full foyer data load when approval status changes to true
  const prevApprovedRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (myMemberProfile) {
      const wasApproved = prevApprovedRef.current;
      const isApproved = myMemberProfile.approved !== false;
      prevApprovedRef.current = isApproved;

      if (foyer && isApproved && wasApproved === false) {
        console.log("[MyFamily+ Sync] User was approved! Fetching all foyer data...");
        setIsSyncReady(false);
        loadFoyerData(foyer.id).then(() => {
          setIsSyncReady(true);
        });
      }
    }
  }, [foyer, myMemberProfile]);

  // 3. Granular database background sync on mutations
  useEffect(() => {
    if (!foyer) return;

    const syncAllData = async () => {
      if (!isSyncReady) return;
      const client = getSupabaseClient();
      if (!client) return;

      const currentSessionId = ++syncSessionIdRef.current;

      // Pre-upload legacy data URLs to Storage before syncing Postgres rows.
      let hasUpdates = false;

      // 1. Documents
      const processedDocuments = await Promise.all(documents.map(async d => {
        if (isRemoteUrl(d.fileBase64) && !d.fileUrl) {
          hasUpdates = true;
          return { ...d, fileUrl: d.fileBase64, fileBase64: undefined };
        }
        if (isDataUrl(d.fileBase64)) {
          try {
            console.log(`[Sync] Compressing & uploading document: ${d.name}`);
            const originalBlob = await dataUrlToBlob(d.fileBase64);
            const ext = d.fileBase64.startsWith('data:image/')
              ? (await compressImageToBlob(d.fileBase64, 'document')).ext
              : extensionFromMimeType(originalBlob.type, 'bin');
            const docBlob = d.fileBase64.startsWith('data:image/')
              ? (await compressImageToBlob(d.fileBase64, 'document')).blob
              : originalBlob;
            const publicUrl = await uploadBlobToStorage('documents', `${foyer.id}/${d.id}.${ext}`, docBlob);
            let thumbnailUrl: string | undefined;
            
            // Also generate a thumbnail
            if (d.fileBase64.startsWith('data:image/')) try {
              const { blob: thumbBlob } = await compressImageToBlob(d.fileBase64, 'thumbnail');
              thumbnailUrl = await uploadBlobToStorage('documents', `${foyer.id}/thumb_${d.id}.webp`, thumbBlob);
            } catch (err) {
              console.warn("Failed to upload document thumbnail:", err);
            }

            hasUpdates = true;
            return { ...d, fileUrl: publicUrl, thumbnailUrl: thumbnailUrl || d.thumbnailUrl, fileBase64: undefined };
          } catch (err) {
            console.error("Failed to upload document image to Storage:", err);
          }
        }
        return d;
      }));
      if (hasUpdates) {
        setDocuments(processedDocuments);
        return; // Let the state change trigger a new sync cycle
      }

      // 2. Transactions
      let txUpdated = false;
      const processedTxs = await Promise.all(transactions.map(async t => {
        const updatedT = { ...t };
        if (isRemoteUrl(t.receiptBase64) && !t.receiptUrl) {
          updatedT.receiptUrl = t.receiptBase64;
          updatedT.receiptBase64 = undefined;
          txUpdated = true;
        }
        if (isRemoteUrl(t.attachmentBase64) && !t.attachmentUrl) {
          updatedT.attachmentUrl = t.attachmentBase64;
          updatedT.attachmentBase64 = undefined;
          txUpdated = true;
        }
        if (isDataUrl(t.receiptBase64)) {
          try {
            console.log(`[Sync] Compressing & uploading receipt for transaction: ${t.title}`);
            const { blob } = await compressImageToBlob(t.receiptBase64, 'classic');
            const url = await uploadBlobToStorage('receipts', `${foyer.id}/${t.id}_receipt.webp`, blob);
            updatedT.receiptUrl = url;
            updatedT.receiptBase64 = undefined;
            txUpdated = true;
          } catch (err) {
            console.error("Failed to upload transaction receipt to Storage:", err);
          }
        }
        if (isDataUrl(t.attachmentBase64)) {
          try {
            console.log(`[Sync] Compressing & uploading attachment for transaction: ${t.title}`);
            const { blob } = await compressImageToBlob(t.attachmentBase64, 'classic');
            const url = await uploadBlobToStorage('receipts', `${foyer.id}/${t.id}_attach.webp`, blob);
            updatedT.attachmentUrl = url;
            updatedT.attachmentBase64 = undefined;
            txUpdated = true;
          } catch (err) {
            console.error("Failed to upload transaction attachment to Storage:", err);
          }
        }
        return updatedT;
      }));
      if (txUpdated) {
        setTransactions(processedTxs);
        return;
      }

      // 3. Dishes
      let dishUpdated = false;
      const processedDishes = await Promise.all(dishes.map(async d => {
        if (d.image && d.image.startsWith('data:')) {
          try {
            console.log(`[Sync] Compressing & uploading image for dish: ${d.name}`);
            const { blob } = await compressImageToBlob(d.image, 'classic');
            const url = await uploadBlobToStorage('dishes', `${foyer.id}/${d.id}.webp`, blob);
            dishUpdated = true;
            return { ...d, image: url };
          } catch (err) {
            console.error("Failed to upload dish image to Storage:", err);
          }
        }
        return d;
      }));
      if (dishUpdated) {
        setDishes(processedDishes);
        return;
      }

      // 4. Chat Messages
      let chatUpdated = false;
      const processedChats = await Promise.all(chatMessages.map(async c => {
        if ((c.type === 'image' || c.type === 'document') && c.content && c.content.startsWith('data:')) {
          try {
            console.log(`[Sync] Uploading chat media message: ${c.id}`);
            const rawContent = c.content.split('|')[0];
            const suffix = c.content.includes('|') ? `|${c.content.split('|').slice(1).join('|')}` : '';
            const { blob, ext } = rawContent.startsWith('data:image/')
              ? await compressImageToBlob(rawContent, 'classic')
              : { blob: await dataUrlToBlob(rawContent), ext: extensionFromMimeType((await dataUrlToBlob(rawContent)).type, 'bin') };
            const url = await uploadBlobToStorage('chat-media', `${foyer.id}/${c.id}.${ext}`, blob);
            chatUpdated = true;
            return { ...c, content: `${url}${suffix}` };
          } catch (err) {
            console.error("Failed to upload chat media to Storage:", err);
          }
        }
        return c;
      }));
      if (chatUpdated) {
        setChatMessages(processedChats);
        return;
      }

      // Helper function to sync a table cleanly
      const syncTable = async (tableName: string, localItems: LooseValue[], mapToDb: (item: LooseValue) => LooseValue, allowDelete: boolean = false) => {
        if (currentSessionId !== syncSessionIdRef.current) return;
        try {
          const { data: cloudItems } = await client.from(tableName).select('*').eq('foyer_id', foyer.id);
          if (currentSessionId !== syncSessionIdRef.current) return;
          
          const localMapped = localItems.map(mapToDb);
          const cloudIds = (cloudItems || []).map(item => item.id);
          const localIds = localMapped.map(item => item.id);

          // Delete missing
          if (allowDelete) {
            const deletedIds = cloudIds.filter(id => !localIds.includes(id));
            if (deletedIds.length > 0) {
              await client.from(tableName).delete().eq('foyer_id', foyer.id).in('id', deletedIds);
              if (currentSessionId !== syncSessionIdRef.current) return;
            }
          }

          // Filter local items that are actually different from the cloud items
          const itemsToUpsert = localMapped.filter(localItem => {
            const cloudItem = (cloudItems || []).find(c => c.id === localItem.id);
            if (!cloudItem) return true; // New item

            // Check if LooseValue value is different
            for (const key of Object.keys(localItem)) {
              const valLocal = localItem[key];
              const valCloud = cloudItem[key];

              if (valLocal === null && valCloud === undefined) continue;
              if (valLocal === undefined && valCloud === null) continue;

              // If it's an object/array (like modification_history or contributions)
              if (typeof valLocal === 'object' && valLocal !== null) {
                if (JSON.stringify(valLocal) !== JSON.stringify(valCloud)) {
                  return true;
                }
              } else if (valLocal !== valCloud) {
                // If it is a string representation of an object (like JSON columns)
                if (typeof valLocal === 'string' && typeof valCloud === 'object' && valCloud !== null) {
                  try {
                    if (JSON.stringify(JSON.parse(valLocal)) !== JSON.stringify(valCloud)) {
                      return true;
                    }
                    continue; // They are equivalent JSON
                  } catch {
                    // Fall through to the regular value comparison.
                  }
                }
                if (typeof valCloud === 'string' && typeof valLocal === 'object' && valLocal !== null) {
                  try {
                    if (JSON.stringify(valLocal) !== JSON.stringify(JSON.parse(valCloud))) {
                      return true;
                    }
                    continue; // They are equivalent JSON
                  } catch {
                    // Fall through to the regular value comparison.
                  }
                }
                return true;
              }
            }
            return false;
          });

          // Upsert current only if different
          if (itemsToUpsert.length > 0) {
            await client.from(tableName).upsert(itemsToUpsert);
          }
        } catch (err) {
          console.warn(`Sync error for table ${tableName}:`, err);
        }
      };

      // Events
      await syncTable('events', events, e => ({
        id: e.id,
        foyer_id: foyer.id,
        title: e.title,
        type: e.type,
        date_time: e.dateTime || null,
        time: e.time || null,
        member_id: e.memberId || null,
        member_name: e.memberName || null,
        location: e.location || null,
        description: e.description || null,
        done: e.done,
        amount: e.amount || null
      }), true);

      // Groceries
      await syncTable('groceries', groceries, g => ({
        id: g.id,
        foyer_id: foyer.id,
        name: g.name,
        category: g.category,
        quantity: g.quantity,
        checked: g.checked,
        in_stock: g.inStock,
        meal: g.meal || null,
        added_by: g.addedBy || 'Foyer',
        is_favorite: g.isFavorite
      }), true);


      // Transactions
      await syncTable('transactions', transactions, t => ({
        id: t.id,
        foyer_id: foyer.id,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        title: t.title,
        member_id: t.memberId || null,
        member_name: t.memberName || null,
        sub_category: t.subCategory || null,
        account_id: t.accountId || null,
        receipt_url: t.receiptUrl || storageUrlFromLegacy(undefined, t.receiptBase64) || null,
        attachment_url: t.attachmentUrl || storageUrlFromLegacy(undefined, t.attachmentBase64) || null,
        receipt_base64: null,
        attachment_base64: null,
        comment: t.comment || null,
        modification_history: t.modificationHistory ? JSON.stringify(t.modificationHistory) : null,
        is_archived: !!t.isArchived,
        recurrence: t.recurrence || 'none',
        subscription_id: t.subscriptionId || null
      }), true);

      // Documents
      await syncTable('documents', documents, d => ({
        id: d.id,
        foyer_id: foyer.id,
        name: d.name,
        category: d.category,
        sub_category: d.subCategory || null,
        member_id: d.memberId || null,
        member_name: d.memberName || null,
        tags: d.tags || [],
        upload_date: d.uploadDate,
        expiry_date: d.expiryDate || null,
        file_size: d.fileSize,
        is_expired: d.isExpired,
        description: d.description || null,
        file_url: d.fileUrl || storageUrlFromLegacy(undefined, d.fileBase64) || null,
        thumbnail_url: d.thumbnailUrl || null,
        file_base64: null,
        is_secure: d.isSecure
      }), true);

      // Dishes
      await syncTable('dishes', dishes, d => ({
        id: d.id,
        foyer_id: foyer.id,
        day: d.day,
        meal_type: d.mealType,
        name: d.name,
        image: d.image,
        ingredients: d.ingredients || []
      }), true);

      // Chore tasks
      await syncTable('chore_tasks', tasks, t => ({
        id: t.id,
        foyer_id: foyer.id,
        title: t.title,
        reward_points: t.rewardPoints,
        assigned_member_id: t.assignedMemberId || null,
        assigned_member_name: t.assignedMemberName || null,
        done: t.done,
        rotation: t.rotation,
        validated_by_parent: t.validatedByParent,
        due_date: t.dueDate || null,
        reward_amount: t.rewardAmount || null
      }), true);

      // Saving Goals
      await syncTable('saving_goals', savingGoals, s => ({
        id: s.id,
        foyer_id: foyer.id,
        title: s.title,
        target_amount: s.targetAmount,
        current_amount: s.currentAmount,
        target_date: s.targetDate,
        category: s.category,
        contributions: s.contributions ? JSON.stringify(s.contributions) : null
      }), true);

      // Alerts
      await syncTable('alerts', alerts, a => ({
        id: a.id,
        foyer_id: foyer.id,
        title: a.title,
        description: a.description,
        time: a.time,
        type: a.type,
        read: a.read,
        module: a.module || null
      }), true);


      // Votes
      await syncTable('votes', votes, v => ({
        id: v.id,
        foyer_id: foyer.id,
        question: v.question,
        options: v.options,
        author_name: v.authorName,
        active: v.active,
        due_date: v.dueDate
      }), true);

      // School tasks
      await syncTable('school_tasks', schoolTasks, s => ({
        id: s.id,
        foyer_id: foyer.id,
        subject: s.subject,
        title: s.title,
        due_date: s.dueDate,
        done: s.done,
        assigned_member_id: s.assignedMemberId || null,
        difficulty: s.difficulty,
        grade: s.grade || null
      }), true);

      // Chat groups
      await syncTable('chat_groups', chatGroups, c => ({
        id: c.id,
        foyer_id: foyer.id,
        name: c.name,
        is_private: c.isPrivate,
        member_ids: c.memberIds || [],
        last_message: c.lastMessage || null,
        last_message_time: c.lastMessageTime || null,
        unread_count: c.unreadCount || 0
      }), true);

      // Chat messages
      await syncTable('chat_messages', chatMessages, c => ({
        id: c.id,
        foyer_id: foyer.id,
        group_id: c.groupId,
        sender_id: c.senderId,
        sender_user_id: c.senderUserId,
        sender_name: c.senderName,
        type: c.type,
        content: c.content,
        timestamp: c.timestamp,
        read_by: c.readBy || [],
        reactions: c.reactions || []
      }), true);

      // Demarches
      await syncTable('demarches', demarches, d => ({
        id: d.id,
        foyer_id: foyer.id,
        template_id: d.templateId || null,
        title: d.title,
        icon: d.icon,
        status: d.status,
        assigned_member_id: d.assignedMemberId || null,
        assigned_member_name: d.assignedMemberName || null,
        steps: d.steps,
        pieces: d.pieces,
        created_at_text: d.createdAt,
        notes: d.notes || null
      }), true);

      // Packs
      await syncTable('justificatif_packs', justificatifPacks, p => ({
        id: p.id,
        foyer_id: foyer.id,
        name: p.name,
        template_type: p.templateType,
        document_ids: p.documentIds || [],
        created_at_text: p.createdAt
      }), true);

      // Vehicles
      await syncTable('vehicles', vehicles, v => ({
        id: v.id,
        foyer_id: foyer.id,
        name: v.name,
        plate: v.plate || null,
        insurance_expiry: v.insuranceExpiry || null,
        technical_control: v.technicalControl || null,
        last_service: v.lastService || null,
        next_service: v.nextService || null,
        mileage: v.mileage || 0
      }), true);

      // Maintenance
      await syncTable('maintenance', maintenance, m => ({
        id: m.id,
        foyer_id: foyer.id,
        title: m.title,
        date: m.date || null,
        cost: m.cost || 0,
        status: m.status || 'scheduled',
        provider: m.provider || null
      }), true);

      // Trips
      await syncTable('trips', trips, t => ({
        id: t.id,
        foyer_id: foyer.id,
        destination: t.destination,
        start_date: t.startDate || null,
        end_date: t.endDate || null,
        budget: t.budget || 0,
        checklist: t.checklist || [],
        booking_refs: t.bookingRefs || []
      }), true);

      // Pets
      await syncTable('pets', pets, p => ({
        id: p.id,
        foyer_id: foyer.id,
        name: p.name,
        species: p.species || null,
        last_vaccine: p.lastVaccine || null,
        next_vaccine: p.nextVaccine || null,
        vet_appointment: p.vetAppointment || null,
        notes: p.notes || null,
        weight_history: p.weightHistory || [],
        document_ids: p.documentIds || []
      }), true);

      // Pocket Money
      await syncTable('pocket_money', pocketMoney, p => ({
        id: p.id,
        foyer_id: foyer.id,
        name: p.name,
        balance: p.balance || 0,
        points: p.points || 0,
        avatar: p.avatar || null,
        shields: p.shields !== undefined && p.shields !== null ? p.shields : 3,
        streak: p.streak !== undefined && p.streak !== null ? p.streak : 0,
        last_shield_reset: p.lastShieldReset || null,
        last_connection: p.lastConnection || null,
        goal_title: p.goalTitle || null,
        goal_amount: p.goalAmount || null
      }), true);

      // Artisans
      await syncTable('artisans', artisans, a => ({
        id: a.id,
        foyer_id: foyer.id,
        name: a.name,
        specialty: a.specialty,
        phone: a.phone || null,
        email: a.email || null,
        rating: a.rating || 5,
        notes: a.notes || null
      }), true);
    };

    const timer = setTimeout(() => {
      syncAllData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    foyer, isSyncReady,
    events, transactions, documents, dishes, tasks, savingGoals,
    alerts, votes, schoolTasks, chatGroups, chatMessages, demarches,
    justificatifPacks, vehicles, maintenance, trips, pets, pocketMoney, artisans
  ]);

  useEffect(() => {
    if (!foyer || !isSyncReady) return;
    const migrationKey = `mf_storage_payload_migration_v1_${foyer.id}`;
    if (localStorage.getItem(migrationKey) === 'done') return;

    let cancelled = false;

    const migrateLegacyPayloads = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      let hadError = false;
      const uploadDataUrl = async (bucket: string, pathBase: string, value: string, imagePreset: 'classic' | 'document') => {
        if (value.startsWith('data:image/')) {
          const { blob, ext } = await compressImageToBlob(value, imagePreset);
          return uploadBlobToStorage(bucket, `${pathBase}.${ext}`, blob);
        }
        const blob = await dataUrlToBlob(value);
        const ext = extensionFromMimeType(blob.type, 'bin');
        return uploadBlobToStorage(bucket, `${pathBase}.${ext}`, blob);
      };

      try {
        const { data: legacyTransactions, error: txError } = await client
          .from('transactions')
          .select('id, receipt_base64, attachment_base64, receipt_url, attachment_url')
          .eq('foyer_id', foyer.id)
          .or('receipt_base64.not.is.null,attachment_base64.not.is.null');
        if (txError) throw txError;

        for (const tx of legacyTransactions || []) {
          if (cancelled) return;
          const updates: DbRow = { receipt_base64: null, attachment_base64: null };
          if (!tx.receipt_url && isRemoteUrl(tx.receipt_base64)) updates.receipt_url = tx.receipt_base64;
          if (!tx.attachment_url && isRemoteUrl(tx.attachment_base64)) updates.attachment_url = tx.attachment_base64;
          if (!tx.receipt_url && isDataUrl(tx.receipt_base64)) {
            updates.receipt_url = await uploadDataUrl('receipts', `${foyer.id}/${tx.id}_receipt`, tx.receipt_base64, 'classic');
          }
          if (!tx.attachment_url && isDataUrl(tx.attachment_base64)) {
            updates.attachment_url = await uploadDataUrl('receipts', `${foyer.id}/${tx.id}_attach`, tx.attachment_base64, 'classic');
          }
          const { error } = await client.from('transactions').update(updates).eq('foyer_id', foyer.id).eq('id', tx.id);
          if (error) throw error;
        }

        const { data: legacyDocuments, error: docError } = await client
          .from('documents')
          .select('id, file_base64, file_url, thumbnail_url')
          .eq('foyer_id', foyer.id)
          .not('file_base64', 'is', null);
        if (docError) throw docError;

        for (const doc of legacyDocuments || []) {
          if (cancelled) return;
          const updates: DbRow = { file_base64: null };
          if (!doc.file_url && isRemoteUrl(doc.file_base64)) updates.file_url = doc.file_base64;
          if (!doc.file_url && isDataUrl(doc.file_base64)) {
            updates.file_url = await uploadDataUrl('documents', `${foyer.id}/${doc.id}`, doc.file_base64, 'document');
            if (!doc.thumbnail_url && doc.file_base64.startsWith('data:image/')) {
              try {
                const { blob: thumbBlob } = await compressImageToBlob(doc.file_base64, 'thumbnail');
                updates.thumbnail_url = await uploadBlobToStorage('documents', `${foyer.id}/thumb_${doc.id}.webp`, thumbBlob);
              } catch (err) {
                console.warn('[Storage Migration] document thumbnail skipped:', err);
              }
            }
          }
          const { error } = await client.from('documents').update(updates).eq('foyer_id', foyer.id).eq('id', doc.id);
          if (error) throw error;
        }

        const { data: legacyChatImages, error: chatImageError } = await client
          .from('chat_messages')
          .select('id, content')
          .eq('foyer_id', foyer.id)
          .like('content', 'data:%');
        if (chatImageError) throw chatImageError;

        const { data: legacyChatAttachments, error: chatAttachmentError } = await client
          .from('chat_messages')
          .select('id, content')
          .eq('foyer_id', foyer.id)
          .like('content', '%|data:%');
        if (chatAttachmentError) throw chatAttachmentError;

        const legacyChats = [...(legacyChatImages || []), ...(legacyChatAttachments || [])]
          .filter((chat, index, all) => all.findIndex(item => item.id === chat.id) === index);

        for (const chat of legacyChats) {
          if (cancelled) return;
          if (typeof chat.content !== 'string') continue;
          const parts = chat.content.split('|');
          const dataPartIndex = parts.findIndex((part: string) => part.startsWith('data:'));
          if (dataPartIndex === -1) continue;
          const url = await uploadDataUrl('chat-media', `${foyer.id}/${chat.id}`, parts[dataPartIndex], 'classic');
          parts[dataPartIndex] = url;
          const { error } = await client.from('chat_messages').update({ content: parts.join('|') }).eq('foyer_id', foyer.id).eq('id', chat.id);
          if (error) throw error;
        }
      } catch (err) {
        hadError = true;
        console.warn('[Storage Migration] legacy payload migration incomplete:', err);
      }

      if (!cancelled && !hadError) {
        localStorage.setItem(migrationKey, 'done');
      }
    };

    migrateLegacyPayloads();
    return () => {
      cancelled = true;
    };
  }, [foyer, isSyncReady]);

  const closeVoiceAssistantAfterDelay = (
    delayMs: number = 2500,
    nextState: 'idle' | 'listening' | 'inactif' | 'ecoute' = 'idle',
    redirection?: {
      tab: string;
      module: string;
      subView?: LooseValue;
      groceryFilter?: 'all' | 'pending' | 'checked';
      toastMessage: string;
    }
  ) => {
    const finalNextState: 'idle' | 'listening' = (nextState === 'ecoute' || nextState === 'listening') ? 'listening' : 'idle';

    if (finalNextState === 'listening') {
      setVoiceState('asking_missing_field');
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
      voiceTimeoutRef.current = setTimeout(() => {
        setVoiceState('waiting_for_answer');
        if (voiceRecognitionRef.current) {
          try {
            voiceRecognitionRef.current.start();
          } catch {
            // Recognition may already be active.
          }
        }
      }, delayMs);
      return;
    }

    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
    }
    
    // Process remaining segments if LooseValue before turning off
    if (finalNextState === 'idle' && voiceContext && voiceContext.remainingSegments && voiceContext.remainingSegments.length > 0) {
      if (redirection) {
        setActiveTab(redirection.tab);
        setActiveModule(redirection.module);
        if (redirection.subView !== undefined) {
          setBudgetActiveSubView(redirection.subView);
        }
        if (redirection.groceryFilter !== undefined) {
          setExternalGroceryFilter(redirection.groceryFilter);
        }
        setVoiceToast(redirection.toastMessage);
      }
      
      const nextSeg = voiceContext.remainingSegments[0];
      const nextRemaining = voiceContext.remainingSegments.slice(1);
      
      setVoiceContext({
        ...voiceContext,
        remainingSegments: nextRemaining,
        lastActiveTime: Date.now()
      });
      
      setVoiceState('processing');
      
      voiceTimeoutRef.current = setTimeout(() => {
        parseVoiceCommand(nextSeg);
      }, delayMs);
      return;
    }
    
    if (finalNextState === 'idle') {
      setVoiceState('success');
    }
    
    voiceTimeoutRef.current = setTimeout(() => {
      if (finalNextState === 'idle') {
        setVoiceActive(false);
        setVoiceState('idle');
        
        if (redirection) {
          setActiveTab(redirection.tab);
          setActiveModule(redirection.module);
          if (redirection.subView !== undefined) {
            setBudgetActiveSubView(redirection.subView);
          }
          if (redirection.groceryFilter !== undefined) {
            setExternalGroceryFilter(redirection.groceryFilter);
          }
          setVoiceToast(redirection.toastMessage);
        }
      } else {
        // Redémarrer le micro immédiatement
        setVoiceState('idle');
        startVoiceAssistant();
      }
    }, delayMs);
  };

  const startVoiceAssistant = () => {
    if (!isPremium) {
      setPaywallOpen(true);
      return;
    }
    const SpeechRecognition = (window as LooseValue).SpeechRecognition || (window as LooseValue).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas l'API de reconnaissance vocale.");
      return;
    }

    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }

    if (voiceState !== 'idle') {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.stop();
        } catch (e) {
          console.warn("Error stopping SpeechRecognition:", e);
        }
      }
      setVoiceState('idle');
      setVoiceActive(false);
      setVoiceContext(null);
      setVoiceDebugTrace(null);
      voiceActionStatusRef.current = 'waiting';
      return;
    }

    setVoiceActive(true);
    setVoiceState('listening');
    setVoiceTranscript('Je vous écoute...');
    setVoiceFeedback('');
    setVoiceWave(true);
    setVoiceAmbiguous(false);
    setPendingVoiceCommandData(null);
    setAmbiguousChoices([]);
    setVoiceDebugInfo(null);
    setVoiceDebugTrace(null);
    setVoiceTransactionAdded(null);
    setPendingGroceryItems(null);
    setIsEditingPendingGrocery(false);

    if (voiceInactivityTimerRef.current) {
      clearTimeout(voiceInactivityTimerRef.current);
    }
    voiceInactivityTimerRef.current = setTimeout(() => {
      if (voiceActiveRef.current) {
        setVoiceState('idle');
        setVoiceActive(false);
        setVoiceContext(null);
        voiceActionStatusRef.current = 'waiting';
      }
    }, 120000);

    try {
      const recognition = new SpeechRecognition();
      voiceRecognitionRef.current = recognition;
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: LooseValue) => {
        if (voiceInactivityTimerRef.current) {
          clearTimeout(voiceInactivityTimerRef.current);
        }
        voiceInactivityTimerRef.current = setTimeout(() => {
          if (voiceActiveRef.current) {
            setVoiceState('idle');
            setVoiceActive(false);
            setVoiceContext(null);
            voiceActionStatusRef.current = 'waiting';
          }
        }, 120000);

        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(`"${transcript}"`);
        setVoiceWave(false);
        setVoiceState('processing');
        
        // Parse Voice Command
        const timer = setTimeout(() => {
          if (parseVoiceCommandRef.current) {
            parseVoiceCommandRef.current(transcript);
          } else {
            parseVoiceCommand(transcript);
          }
        }, 1000);
        voiceTimeoutRef.current = timer;
      };

      recognition.onerror = (event: LooseValue) => {
        console.error("Vocal search error", event.error);
        setVoiceTranscript("🎙️ Impossible d'écouter votre commande. Réessayer.");
        setVoiceWave(false);
        setVoiceState('error');
      };

      recognition.onend = () => {
        setVoiceWave(false);
        const isConversational = voiceContextRef.current && voiceContextRef.current.pendingAction !== 'none';
        if (voiceActiveRef.current && isConversational && (voiceStateRef.current === 'listening' || voiceStateRef.current === 'asking_missing_field' || voiceStateRef.current === 'waiting_for_answer')) {
          try {
            recognition.start();
            setVoiceWave(true);
          } catch {
            // Recognition may already be active.
          }
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start SpeechRecognition:", err);
      setVoiceState('error');
      setVoiceTranscript("🎙️ Impossible d'écouter votre commande. Réessayer.");
    }
  };

  const convertFrenchNumbersToDigits = (txt: string): string => {
    let res = txt.toLowerCase();
    const replacements: [RegExp, string][] = [
      [/\bquatre[- ]vingt[- ]dix\b/g, '90'],
      [/\bquatre[- ]vingts\b/g, '80'],
      [/\bquatre[- ]vingt\b/g, '80'],
      [/\bsoixante[- ]dix\b/g, '70'],
      [/\bsoixante\b/g, '60'],
      [/\bcinquante\b/g, '50'],
      [/\bquarante\b/g, '40'],
      [/\btrente\b/g, '30'],
      [/\bvingt\b/g, '20'],
      [/\bdix[- ]neuf\b/g, '19'],
      [/\bdix[- ]huit\b/g, '18'],
      [/\bdix[- ]sept\b/g, '17'],
      [/\bseize\b/g, '16'],
      [/\bquinze\b/g, '15'],
      [/\bquatorze\b/g, '14'],
      [/\btreize\b/g, '13'],
      [/\bdouze\b/g, '12'],
      [/\bonze\b/g, '11'],
      [/\bdix\b/g, '10'],
      [/\bneuf\b/g, '9'],
      [/\bhuit\b/g, '8'],
      [/\bsept\b/g, '7'],
      [/\bsix\b/g, '6'],
      [/\bcinq\b/g, '5'],
      [/\bquatre\b/g, '4'],
      [/\btrois\b/g, '3'],
      [/\bdeux\b/g, '2'],
      [/\bune\b/g, '1'],
      [/\bun\b/g, '1'],
      [/\bcent\b/g, '100']
    ];
    for (const [regex, replacement] of replacements) {
      res = res.replace(regex, replacement);
    }
    return res;
  };

  const parseAgendaVoiceCommand = (prompt: string, text: string) => {
    const textLower = prompt.toLowerCase();
    
    const eventDate = new Date();
    let dateStr = eventDate.toISOString().split('T')[0];
    let dateLabel = "aujourd'hui";
    
    if (textLower.includes("demain")) {
      eventDate.setDate(eventDate.getDate() + 1);
      dateStr = eventDate.toISOString().split('T')[0];
      dateLabel = "demain";
    } else if (textLower.includes("après-demain") || textLower.includes("apres-demain") || textLower.includes("après demain")) {
      eventDate.setDate(eventDate.getDate() + 2);
      dateStr = eventDate.toISOString().split('T')[0];
      dateLabel = "après-demain";
    } else {
      const daysOfWeek = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
      for (let i = 0; i < 7; i++) {
        if (textLower.includes(daysOfWeek[i])) {
          const currentDay = eventDate.getDay();
          let daysToAdd = i - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7;
          eventDate.setDate(eventDate.getDate() + daysToAdd);
          dateStr = eventDate.toISOString().split('T')[0];
          dateLabel = daysOfWeek[i];
          break;
        }
      }
    }
    
    let timeStr = "12:00";
    let timeLabel = "";
    const timeRegex = /(?:à|a|vers)\s*(\d{1,2})\s*(?:h|heures?|:)\s*(\d{1,2})?/i;
    const match = textLower.match(timeRegex);
    if (match) {
      const hours = match[1].padStart(2, '0');
      const minutes = (match[2] || '00').padStart(2, '0');
      timeStr = `${hours}:${minutes}`;
      timeLabel = ` à ${hours}h${match[2] || ''}`;
    }
    
    let title = text
      .replace(/ajoute|ajouter|planifie|planifier|creer|créer|crée|cree|programme|programmer/gi, '')
      .replace(/rendez-vous|rendez vous|rdv/gi, 'Rendez-vous')
      .replace(/demain|après-demain|apres-demain/gi, '')
      .replace(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/gi, '')
      .replace(/(?:à|a|vers)\s*\d{1,2}\s*(?:h|heures?|:)\s*\d{0,2}/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    if (!title) {
      title = "Événement vocal";
    } else {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    const isHealth = /médecin|medecin|docteur|dentiste|pédiatre|pediatre|ophtalmo|ostéo|osteo|vaccin|clinique|hôpital|hopital|visite médicale|visite medicale|sante|santé/i.test(textLower);
    const type = isHealth ? 'health' : 'other';
    
    return {
      title,
      dateTime: dateStr,
      time: timeStr,
      type,
      dateLabel,
      timeLabel
    };
  };

  const splitVoiceCommand = (text: string): string[] => {
    const segments = text.split(/\s+puis\s+|\s+et\s+/i);
    const result: string[] = [];
    let lastActionVerb = "";
    
    const actionVerbs = ['ajoute', 'ajouter', 'crée', 'creer', 'créer', 'cree', 'planifie', 'planifier', 'programme', 'programmer', 'ouvre', 'montre', 'va', 'affiche', 'coche', 'valide', 'récupère', 'recupere', 'décoche', 'decoche', 'supprime', 'supprimer', 'remplace', 'remplacer', 'modifie', 'modifier'];
    
    for (let i = 0; i < segments.length; i++) {
      let segment = segments[i].trim();
      if (!segment) continue;
      
      const firstWord = segment.split(/\s+/)[0].toLowerCase();
      const startsWithVerb = actionVerbs.some(v => firstWord.startsWith(v) || v.startsWith(firstWord));
      
      if (startsWithVerb) {
        lastActionVerb = segment.split(/\s+/)[0];
      } else if (lastActionVerb && i > 0) {
        segment = `${lastActionVerb} ${segment}`;
      }
      result.push(segment);
    }
    return result;
  };

  const DESTINATION_DICTIONARY: Record<string, string> = {
    // Pays
    'itlie': 'Italie',
    'italie': 'Italie',
    'espange': 'Espagne',
    'espagne': 'Espagne',
    'marroc': 'Maroc',
    'maroc': 'Maroc',
    'france': 'France',
    'sénégal': 'Sénégal',
    'senegal': 'Sénégal',
    'mali': 'Mali',
    "côte d'ivoire": "Côte d'Ivoire",
    "cote d'ivoire": "Côte d'Ivoire",
    "côte d’ivoire": "Côte d'Ivoire",
    'comores': 'Comores',
    'algérie': 'Algérie',
    'algerie': 'Algérie',
    'tunisie': 'Tunisie',
    'égypte': 'Égypte',
    'egypte': 'Égypte',
    'turquie': 'Turquie',
    'arabie saoudite': 'Arabie Saoudite',
    'émirats arabes unis': 'Émirats Arabes Unis',
    'emirats arabes unis': 'Émirats Arabes Unis',
    'portugal': 'Portugal',
    'allemagne': 'Allemagne',
    'belgique': 'Belgique',
    'suisse': 'Suisse',
    'canada': 'Canada',
    'états-unis': 'États-Unis',
    'etats-unis': 'États-Unis',
    'usa': 'États-Unis',
    // Villes
    'paris': 'Paris',
    'dakar': 'Dakar',
    'rome': 'Rome',
    'milan': 'Milan',
    'madrid': 'Madrid',
    'barcelone': 'Barcelone',
    'casablanca': 'Casablanca',
    'marrakech': 'Marrakech',
    'bamako': 'Bamako',
    'abidjan': 'Abidjan',
    'moroni': 'Moroni'
  };

  const normalizeDestination = (dest: string): string => {
    let d = dest.trim();
    // Remove "pour l'", "pour la", "pour le", "pour les", "pour", "dans le", "dans la", "dans l'", "dans"
    // Remove "au", "en", "à", "a", "vers", "le", "la", "les", "l'" at the beginning of the string
    d = d.replace(/^(?:pour\s+l'|pour\s+la|pour\s+le|pour\s+les|pour\s+|dans\s+le|dans\s+la|dans\s+l'|dans\s+|au\s+|en\s+|à\s+|a\s+|vers\s+|le\s+|la\s+|les\s+|l')/i, '');
    d = d.replace(/^l'/i, '');
    return d.trim();
  };

  const correctSpelling = (dest: string): string => {
    const normalized = dest.toLowerCase().trim();
    if (DESTINATION_DICTIONARY[normalized]) {
      return DESTINATION_DICTIONARY[normalized];
    }
    return dest.charAt(0).toUpperCase() + dest.slice(1);
  };

  const findAllMemberMatches = (inputText: string, membersList: LooseValue[], activeId: string): LooseValue[] => {
    let cleanInput = inputText.toLowerCase().trim();
    if (cleanInput === 'yata' || cleanInput === 'yattah') {
      cleanInput = 'yatta';
    }
    const isMoi = cleanInput === 'moi' || 
                  cleanInput === "c'est pour moi" || 
                  cleanInput === 'pour moi' || 
                  cleanInput === 'moi-meme' || 
                  cleanInput === 'moi-même' ||
                  /\bmoi\b/i.test(cleanInput);
    if (isMoi) {
      const current = membersList.find(m => m.id === activeId);
      return current ? [current] : [];
    }

    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
    const normInput = norm(cleanInput);
    if (!normInput) return [];

    // Helper: Levenshtein distance
    const getLevDist = (a: string, b: string) => {
      const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
      for (let j = 1; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          dp[i][j] = Math.min(
            dp[i-1][j] + 1,
            dp[i][j-1] + 1,
            dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
          );
        }
      }
      return dp[a.length][b.length];
    };

    // --- CASCADE LEVEL 1: Exact matches on full name/role ---
    const exactMatches = membersList.filter(m => norm(m.name) === normInput || (m.role && norm(m.role) === normInput));
    if (exactMatches.length > 0) return exactMatches;

    // --- CASCADE LEVEL 2: Prefix match on words (e.g. "Yat" matches "Yatta" and "Yatta Junior") ---
    if (normInput.length >= 2) {
      const prefixMatches = membersList.filter(m => {
        const normName = norm(m.name);
        const nameWords = normName.split(/\s+/);
        return nameWords.some(w => w.startsWith(normInput));
      });
      if (prefixMatches.length > 0) return prefixMatches;
    }

    // --- CASCADE LEVEL 3: Levenshtein matches on full name/role ---
    const fullLevMatches: { member: LooseValue; dist: number }[] = [];
    for (const member of membersList) {
      const normName = norm(member.name);
      const normRole = member.role ? norm(member.role) : '';
      
      const targets = [normName];
      if (normRole) targets.push(normRole);

      let bestDist = 999;
      for (const target of targets) {
        const dist = getLevDist(normInput, target);
        const limit = target.length <= 4 ? 1 : 2;
        if (dist <= limit && dist < bestDist) {
          bestDist = dist;
        }
      }
      if (bestDist < 999) {
        fullLevMatches.push({ member, dist: bestDist });
      }
    }
    if (fullLevMatches.length > 0) {
      fullLevMatches.sort((a, b) => a.dist - b.dist);
      const minDist = fullLevMatches[0].dist;
      return fullLevMatches.filter(m => m.dist === minDist).map(m => m.member);
    }

    // --- CASCADE LEVEL 4: Full word match (substring) ---
    const inputWords = normInput.split(/\s+/);
    const wordMatches = membersList.filter(m => {
      const normName = norm(m.name);
      const nameWords = normName.split(/\s+/);
      return nameWords.some(w => inputWords.includes(w)) || inputWords.includes(normName);
    });
    if (wordMatches.length > 0) return wordMatches;

    // --- CASCADE LEVEL 5: Levenshtein on individual words ---
    const wordLevMatches: { member: LooseValue; dist: number }[] = [];
    for (const member of membersList) {
      const normName = norm(member.name);
      const nameWords = normName.split(/\s+/);
      const normRole = member.role ? norm(member.role) : '';
      
      const wordsToCompare = [normName, ...nameWords];
      if (normRole) {
        wordsToCompare.push(normRole);
        normRole.split(/\s+/).forEach(w => wordsToCompare.push(w));
      }

      let bestDistForMember = 999;
      for (const target of wordsToCompare) {
        if (!target || target.length < 2) continue;
        const targetsInput = [normInput, ...inputWords];
        for (const inp of targetsInput) {
          if (!inp || inp.length < 2) continue;
          const dist = getLevDist(inp, target);
          const limit = target.length <= 4 ? 1 : 2;
          if (dist <= limit) {
            if (dist < bestDistForMember) {
              bestDistForMember = dist;
            }
          }
        }
      }
      if (bestDistForMember < 999) {
        wordLevMatches.push({ member, dist: bestDistForMember });
      }
    }

    if (wordLevMatches.length > 0) {
      wordLevMatches.sort((a, b) => a.dist - b.dist);
      const minDist = wordLevMatches[0].dist;
      return wordLevMatches.filter(m => m.dist === minDist).map(m => m.member);
    }

    return [];
  };

  const findCategoryAndSubcategory = (
    promptLower: string,
    titleText: string,
    customCats: LooseValue[],
    pastTx: LooseValue[]
  ) => {
    const textLower = promptLower.toLowerCase();
    const titleLower = titleText.toLowerCase();

    // 1. Search in custom categories & subcategories
    for (const cat of customCats) {
      if (cat.subcategories && cat.subcategories.length > 0) {
        for (const sub of cat.subcategories) {
          const subLower = sub.toLowerCase();
          if (textLower.includes(subLower) || (titleText && titleLower.includes(subLower))) {
            let moduleSource = 'budget';
            if (cat.name === 'Santé') moduleSource = 'sante';
            else if (cat.name === 'Véhicules') moduleSource = 'vehicules';
            else if (cat.name === 'Logement') moduleSource = 'logement';
            else if (cat.name === 'Éducation' || cat.name === 'École') moduleSource = 'ecole';
            else if (cat.name === 'Alimentation' || cat.name === 'Courses') moduleSource = 'courses';
            else if (cat.name === 'Voyages') moduleSource = 'voyages';
            else if (cat.name === 'Animaux') moduleSource = 'animaux';
            else if (cat.name === 'Argent de poche') moduleSource = 'argent_de_poche';
            
            return {
              category: cat.name,
              subCategory: sub,
              moduleSource,
              found: true
            };
          }
        }
      }
      
      // Also match parent category name itself if no subcategory matched
      if (textLower.includes(cat.name.toLowerCase())) {
        let moduleSource = 'budget';
        if (cat.name === 'Santé') moduleSource = 'sante';
        else if (cat.name === 'Véhicules') moduleSource = 'vehicules';
        else if (cat.name === 'Logement') moduleSource = 'logement';
        else if (cat.name === 'Éducation' || cat.name === 'École') moduleSource = 'ecole';
        else if (cat.name === 'Alimentation' || cat.name === 'Courses') moduleSource = 'courses';
        else if (cat.name === 'Voyages') moduleSource = 'voyages';
        else if (cat.name === 'Animaux') moduleSource = 'animaux';
        else if (cat.name === 'Argent de poche') moduleSource = 'argent_de_poche';

        return {
          category: cat.name,
          subCategory: cat.subcategories && cat.subcategories.length > 0 ? cat.subcategories[0] : 'Divers',
          moduleSource,
          found: true
        };
      }
    }

    // 2. Search in past transactions (look for matching title)
    if (titleText && titleText.length > 2) {
      const matchTx = pastTx.find(tx => 
        tx.title && tx.title.toLowerCase().includes(titleLower)
      );
      if (matchTx && matchTx.category) {
        let moduleSource = 'budget';
        if (matchTx.comment && matchTx.comment.includes('moduleSource')) {
          try {
            const parsed = JSON.parse(matchTx.comment);
            if (parsed.moduleSource) moduleSource = parsed.moduleSource;
          } catch {
            // Ignore malformed transaction metadata.
          }
        } else {
          const catName = matchTx.category;
          if (catName === 'Santé') moduleSource = 'sante';
          else if (catName === 'Véhicules') moduleSource = 'vehicules';
          else if (catName === 'Logement') moduleSource = 'logement';
          else if (catName === 'Éducation' || catName === 'École') moduleSource = 'ecole';
          else if (catName === 'Alimentation' || catName === 'Courses') moduleSource = 'courses';
          else if (catName === 'Voyages') moduleSource = 'voyages';
          else if (catName === 'Animaux') moduleSource = 'animaux';
          else if (catName === 'Argent de poche') moduleSource = 'argent_de_poche';
        }
        return {
          category: matchTx.category,
          subCategory: matchTx.subCategory || 'Divers',
          moduleSource,
          found: true
        };
      }
    }

    return null;
  };

  const parseVoyageCommand = (text: string) => {
    const textLower = text.toLowerCase();
    
    let destination = "";
    // Match destination following keywords
    const destMatch = text.match(/(?:voyage|vacances|voyager)\s+(?:au|en|à|a|vers|pour\s+l'|pour\s+la|pour\s+le|pour\s+les|pour|de|du|d'|dans\s+le|dans\s+la|dans\s+l')\s+([a-zA-Z0-9éèàùçâêîôûäëïöü\s-]+)/i);
    if (destMatch) {
      const rawDest = destMatch[1].trim();
      const cleanMatch = rawDest.split(/\b(?:pour|et|le|la|de|du|avec|à\b|a\b|en\b|au\b|vers\b)/i)[0].trim();
      if (cleanMatch) {
        const normalized = normalizeDestination(cleanMatch);
        if (normalized) {
          destination = correctSpelling(normalized);
        }
      }
    }
    
    let startDateVal = "";
    let endDateVal = "";
    
    // Pattern 1: "du 22 au 26 juin"
    const rangeSameMonthMatch = text.match(/du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i);
    if (rangeSameMonthMatch) {
      const startDay = rangeSameMonthMatch[1];
      const endDay = rangeSameMonthMatch[2];
      const month = rangeSameMonthMatch[3];
      startDateVal = `${startDay} ${month}`;
      endDateVal = `${endDay} ${month}`;
    } else {
      // Pattern 2: "du 22 juin au 3 juillet"
      const rangeDiffMonthMatch = text.match(/du\s+(\d{1,2}\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))\s+au\s+(\d{1,2}\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i);
      if (rangeDiffMonthMatch) {
        startDateVal = rangeDiffMonthMatch[1];
        endDateVal = rangeDiffMonthMatch[2];
      } else {
        // Pattern 3: single date "le 22 juin"
        const singleDateMatch = text.match(/(?:pour le|le|du|au|partir du|dès le)\s+(\d{1,2}\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i);
        if (singleDateMatch) {
          startDateVal = singleDateMatch[1];
        }
      }
    }
    
    const isoStart = startDateVal ? parseFrenchDate(startDateVal) : (textLower.includes('demain') ? parseFrenchDate('demain') : undefined);
    const isoEnd = endDateVal ? parseFrenchDate(endDateVal) : undefined;
    
    // Parse budget first
    let budgetAmount = 0;
    const budgetMatch = text.match(/(?:budget\s*(?:de)?\s*(\d+[.,]?\d*))|(\d+[.,]?\d*)\s*(?:euros?|€|eur)?\s*(?:de\s+)?budget/i);
    if (budgetMatch) {
      budgetAmount = parseFloat((budgetMatch[1] || budgetMatch[2]).replace(',', '.'));
    }
    
    // Remove budget phrase to avoid double counting it as an expense
    let textWithoutBudget = text;
    if (budgetMatch) {
      textWithoutBudget = text.replace(budgetMatch[0], '');
    }
    
    // Parse expense only if explicitly requested in remaining text
    let expenseAmount = 0;
    const expenseKeywords = ['billet', 'billets', 'vol', 'vols', 'hotel', 'hôtel', 'hotels', 'hôtels', 'airbnb', 'activite', 'activité', 'activités', 'activites', 'hébergement', 'hebergement', 'repas', 'restaurant', 'resto', 'essence', 'location', 'dépense', 'depense', 'dépenses', 'depenses', 'frais'];
    const hasExpenseKeywords = expenseKeywords.some(kw => textWithoutBudget.toLowerCase().includes(kw));
    
    if (hasExpenseKeywords) {
      const amountMatch = textWithoutBudget.match(/(\d+[.,]?\d*)\s*(?:euros?|€|eur)/i);
      if (amountMatch) {
        expenseAmount = parseFloat(amountMatch[1].replace(',', '.'));
      }
    }
    
    let expenseTitle = "";
    for (const kw of expenseKeywords) {
      if (textWithoutBudget.toLowerCase().includes(kw)) {
        expenseTitle = kw.charAt(0).toUpperCase() + kw.slice(1);
        break;
      }
    }
    
    return {
      destination,
      startDate: isoStart,
      endDate: isoEnd,
      expenseAmount,
      expenseTitle,
      budgetAmount
    };
  };

  const getDynamicVoiceMapping = () => {
    const mapping: Record<string, { category: string; subCategory: string; moduleSource: string }> = {
      'taxi': { category: 'Transport', subCategory: 'Taxi', moduleSource: 'budget' },
      'uber': { category: 'Transport', subCategory: 'Uber', moduleSource: 'budget' },
      'vtc': { category: 'Transport', subCategory: 'VTC', moduleSource: 'budget' },
      'essence': { category: 'Véhicules', subCategory: 'Carburant', moduleSource: 'vehicules' },
      'carburant': { category: 'Véhicules', subCategory: 'Carburant', moduleSource: 'vehicules' },
      'pharmacie': { category: 'Santé', subCategory: 'Pharmacie', moduleSource: 'sante' },
      'médecin': { category: 'Santé', subCategory: 'Médecin', moduleSource: 'sante' },
      'medecin': { category: 'Santé', subCategory: 'Médecin', moduleSource: 'sante' },
      'dentiste': { category: 'Santé', subCategory: 'Dentiste', moduleSource: 'sante' },
      'internet': { category: 'Logement', subCategory: 'Internet', moduleSource: 'logement' },
      'loyer': { category: 'Logement', subCategory: 'Loyer', moduleSource: 'logement' },
      'électricité': { category: 'Logement', subCategory: 'Électricité', moduleSource: 'logement' },
      'electricite': { category: 'Logement', subCategory: 'Électricité', moduleSource: 'logement' },
      'cantine': { category: 'Éducation', subCategory: 'Cantine', moduleSource: 'ecole' },
      'passeport': { category: 'Administratif', subCategory: 'Passeport', moduleSource: 'documents' },
      'navigo': { category: 'Transport', subCategory: 'Pass Navigo', moduleSource: 'budget' },
      'pass navigo': { category: 'Transport', subCategory: 'Pass Navigo', moduleSource: 'budget' }
    };

    const merged = getMergedCategories();
    for (const cat of merged) {
      if (cat.isArchived) continue;
      
      let moduleSource = 'budget';
      if (cat.name === 'Santé') moduleSource = 'sante';
      else if (cat.name === 'Véhicules') moduleSource = 'vehicules';
      else if (cat.name === 'Logement') moduleSource = 'logement';
      else if (cat.name === 'Éducation' || cat.name === 'École') moduleSource = 'ecole';
      else if (cat.name === 'Alimentation' || cat.name === 'Courses') moduleSource = 'courses';
      else if (cat.name === 'Voyages') moduleSource = 'voyages';
      else if (cat.name === 'Animaux') moduleSource = 'animaux';
      else if (cat.name === 'Argent de poche') moduleSource = 'argent_de_poche';

      const catKey = cat.name.toLowerCase().trim();
      if (!mapping[catKey]) {
        mapping[catKey] = {
          category: cat.name,
          subCategory: cat.subcategories && cat.subcategories.length > 0 ? cat.subcategories[0] : 'Divers',
          moduleSource
        };
      }

      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const subKey = sub.toLowerCase().trim();
          if (!mapping[subKey]) {
            mapping[subKey] = {
              category: cat.name,
              subCategory: sub,
              moduleSource
            };
          }
        }
      }
    }
    
    return mapping;
  };

  const detectCreationContext = (promptLower: string, text: string) => {
    const hasCreationVerb = /ajoute|ajouter|crée|creer|créer|cree|planifie|planifier|programme|programmer|enregistre|enregistrer|note|noter|prends|prendre/i.test(promptLower);
    const hasMedicalKeyword = /médecin|medecin|docteur|dentiste|pédiatre|pediatre|ophtalmo|ostéo|osteo|kiné|kine|orthophoniste|dermato|cardio|hôpital|hopital|clinique|santé|sante/i.test(promptLower);
    const hasAppointmentKeyword = /\brdv\b|rendez-vous|rendez vous|visite|consultation/i.test(promptLower);
    const isMedicalAppointmentRequest = hasMedicalKeyword && hasAppointmentKeyword;
    const isCreation = hasCreationVerb || isMedicalAppointmentRequest;
    if (!isCreation) return null;

    // 1. VOYAGE
    if (promptLower.includes('voyage') || promptLower.includes('vacance') || promptLower.includes('vacances')) {
      const voyageDetails = parseVoyageCommand(text);
      return {
        pendingAction: 'create_trip',
        destination: voyageDetails.destination || undefined,
        budget: voyageDetails.budgetAmount || undefined,
        startDate: voyageDetails.startDate,
        endDate: voyageDetails.endDate || undefined,
        expenseAmount: voyageDetails.expenseAmount,
        expenseTitle: voyageDetails.expenseTitle || undefined
      };
    }

    // 2. SANTÉ / VACCIN
    if (promptLower.includes('vaccin')) {
      const dateRegex = /(?:le\s+)?(\d+\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i;
      const dateMatch = promptLower.match(dateRegex);
      const rawDateStr = dateMatch ? dateMatch[1] : (promptLower.includes('demain') ? 'demain' : undefined);
      const date = rawDateStr ? parseFrenchDate(rawDateStr) : undefined;
      
      console.log("DEBUG DATE 1: Date détectée dans le prompt:", rawDateStr, "-> parsed to:", date);

      const timeMatch = promptLower.match(/\b(\d+h\d*|\d+:\d+)\b/i);
      const time = timeMatch ? timeMatch[1] : undefined;

      let matchedMember = undefined;
      const pourMoi = /\bpour\s+moi\b/i.test(promptLower) || /\bc'est\s+pour\s+moi\b/i.test(promptLower) || /\bmoi\b/i.test(promptLower);
      if (pourMoi) {
        matchedMember = members.find(m => m.id === activeMemberId);
      } else {
        const found = findAllMemberMatches(promptLower, members, activeMemberId);
        if (found.length === 1) {
          const name = found[0].name.toLowerCase();
          const role = found[0].role ? found[0].role.toLowerCase() : '';
          if (promptLower.includes(name) || (role && promptLower.includes(role))) {
            matchedMember = found[0];
          }
        }
      }
      
      let title = 'Vaccin';
      const ror = promptLower.includes('ror');
      const grippe = promptLower.includes('grippe');
      const covid = promptLower.includes('covid');
      const hepatite = promptLower.includes('hépatite') || promptLower.includes('hepatite');
      if (ror) title = 'Vaccin ROR';
      else if (grippe) title = 'Vaccin Grippe';
      else if (covid) title = 'Vaccin Covid';
      else if (hepatite) title = 'Vaccin Hépatite';

      return {
        pendingAction: 'create_vaccine',
        title,
        date,
        time: time || undefined,
        memberId: matchedMember?.id || undefined
      };
    }

    // 3. ARGENT DE POCHE
    if (promptLower.includes('argent de poche') || promptLower.includes('pocket money')) {
      const matchedMember = findAllMemberMatches(promptLower, members, activeMemberId)[0];
      const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
      const amount = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : undefined;

      return {
        pendingAction: 'create_pocket_money',
        memberId: matchedMember?.id || undefined,
        amount
      };
    }

    // 4. VÉHICULES
    if (promptLower.includes('plein') || promptLower.includes('essence') || promptLower.includes('révision') || promptLower.includes('revision') || promptLower.includes('vidange')) {
      const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
      const amount = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : undefined;
      const matchedVehicle = vehicles.find(v => promptLower.includes(v.name.toLowerCase()));

      return {
        pendingAction: 'create_vehicle_expense',
        vehicleId: matchedVehicle?.id || undefined,
        vehicleName: matchedVehicle?.name || undefined,
        amount,
        category: promptLower.includes('plein') || promptLower.includes('essence') ? 'Essence' : 'Entretien'
      };
    }

    // 5. LOGEMENT / FACTURE
    if (promptLower.includes('facture') || promptLower.includes('loyer') || promptLower.includes('edf')) {
      const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
      const amount = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : undefined;
      
      let category = undefined;
      if (promptLower.includes('loyer')) category = 'Loyer';
      else if (promptLower.includes('internet') || promptLower.includes('wifi')) category = 'Internet';
      else if (promptLower.includes('edf') || promptLower.includes('électricité') || promptLower.includes('electricite')) category = 'Charges';

      return {
        pendingAction: 'create_bill',
        amount,
        category
      };
    }

    // 6. DÉMARCHES
    if (promptLower.includes('renouvellement') || promptLower.includes('passeport') || promptLower.includes('cni') || promptLower.includes('démarche') || promptLower.includes('demarche')) {
      const matchedMember = findAllMemberMatches(promptLower, members, activeMemberId)[0];
      const dateRegex = /(?:le\s+)?(\d+\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i;
      const dateMatch = promptLower.match(dateRegex);
      const rawDateStr = dateMatch ? dateMatch[1] : (promptLower.includes('demain') ? 'demain' : undefined);
      const date = rawDateStr ? parseFrenchDate(rawDateStr) : undefined;

      let title = 'Démarche administrative';
      if (promptLower.includes('passeport')) title = 'Renouvellement passeport';
      else if (promptLower.includes('cni') || promptLower.includes('carte d\'identité') || promptLower.includes('carte identite')) title = 'Renouvellement CNI';

      return {
        pendingAction: 'create_demarche',
        title,
        memberId: matchedMember?.id || undefined,
        date
      };
    }

    // 7. ÉCOLE / DEVOIRS
    if (promptLower.includes('devoir') || promptLower.includes('devoirs') || promptLower.includes('devoir de')) {
      const matchedMember = findAllMemberMatches(promptLower, members, activeMemberId)[0];
      const dateRegex = /(?:le\s+)?(\d+\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i;
      const dateMatch = promptLower.match(dateRegex);
      const rawDateStr = dateMatch ? dateMatch[1] : (promptLower.includes('demain') ? 'demain' : undefined);
      const date = rawDateStr ? parseFrenchDate(rawDateStr) : undefined;

      let category = undefined;
      const subjects = ['maths', 'mathématiques', 'français', 'francais', 'histoire', 'géo', 'géographie', 'anglais', 'sciences', 'physique', 'chimie'];
      const matchedSubject = subjects.find(s => promptLower.includes(s));
      if (matchedSubject) category = matchedSubject.charAt(0).toUpperCase() + matchedSubject.slice(1);

      return {
        pendingAction: 'create_school_task',
        memberId: matchedMember?.id || undefined,
        title: category,
        date
      };
    }

    // 8. AGENDA / EVENT
    if (
      promptLower.includes('rendez-vous') ||
      promptLower.includes('rendez vous') ||
      promptLower.includes('rdv') ||
      promptLower.includes('événement') ||
      promptLower.includes('evenement') ||
      promptLower.includes('réunion') ||
      promptLower.includes('reunion') ||
      promptLower.includes('visite') ||
      promptLower.includes('consultation') ||
      promptLower.includes('médecin') ||
      promptLower.includes('medecin') ||
      promptLower.includes('docteur') ||
      promptLower.includes('dentiste') ||
      promptLower.includes('pédiatre') ||
      promptLower.includes('pediatre') ||
      promptLower.includes('ophtalmo') ||
      promptLower.includes('ostéo') ||
      promptLower.includes('osteo') ||
      promptLower.includes('kiné') ||
      promptLower.includes('kine') ||
      promptLower.includes('orthophoniste') ||
      promptLower.includes('dermato') ||
      promptLower.includes('cardio') ||
      promptLower.includes('hôpital') ||
      promptLower.includes('hopital') ||
      promptLower.includes('clinique')
    ) {
      const dateRegex = /(?:le\s+)?(\d+\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i;
      const dateMatch = promptLower.match(dateRegex);
      const rawDateStr = dateMatch ? dateMatch[1] : (promptLower.includes('demain') ? 'demain' : undefined);
      const date = rawDateStr ? parseFrenchDate(rawDateStr) : undefined;

      const timeMatch = promptLower.match(/\b(\d+h\d*|\d+:\d+)\b/i);
      const time = timeMatch ? timeMatch[1] : undefined;

      let title = 'Rendez-vous';
      const restText = text
        .replace(/ajoute|ajouter|crée|creer|créer|cree|planifie|planifier|programme|programmer|prends|prendre|un|le|rdv|rendez-vous|rendez vous/gi, '')
        .replace(/\bchez\b/gi, '')
        .replace(/\b(\d+h\d*|\d+:\d+)\b/g, '')
        .replace(dateRegex, '')
        .trim();
      if (restText) title = restText.charAt(0).toUpperCase() + restText.slice(1);

      return {
        pendingAction: 'create_event',
        title,
        date,
        time
      };
    }

    // 9. DOCUMENTS
    if (promptLower.includes('document') || promptLower.includes('papier')) {
      const matchedMember = findAllMemberMatches(promptLower, members, activeMemberId)[0];
      
      let category = undefined;
      if (promptLower.includes('identité') || promptLower.includes('identite')) category = 'identity';
      else if (promptLower.includes('santé') || promptLower.includes('sante')) category = 'health';
      else if (promptLower.includes('école') || promptLower.includes('ecole')) category = 'school';
      else if (promptLower.includes('assurance')) category = 'insurance';

      return {
        pendingAction: 'create_document',
        memberId: matchedMember?.id || undefined,
        category
      };
    }

    // 10. ANIMAUX
    if (promptLower.includes('animal') || promptLower.includes('compagnon') || pets.some(p => promptLower.includes(p.name.toLowerCase()))) {
      const matchedPet = pets.find(p => promptLower.includes(p.name.toLowerCase()));
      const dateRegex = /(?:le\s+)?(\d+\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i;
      const dateMatch = promptLower.match(dateRegex);
      const date = dateMatch ? dateMatch[1] : (promptLower.includes('demain') ? 'demain' : undefined);

      return {
        pendingAction: 'create_pet_action',
        petId: matchedPet?.id || undefined,
        petName: matchedPet?.name || undefined,
        date
      };
    }

    // 11. MENUS
    if (promptLower.includes('repas') || promptLower.includes('menu') || promptLower.includes('dîner') || promptLower.includes('diner') || promptLower.includes('déjeuner') || promptLower.includes('dejeuner')) {
      let day = undefined;
      const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
      const matchedDay = days.find(d => promptLower.includes(d));
      if (matchedDay) day = matchedDay.charAt(0).toUpperCase() + matchedDay.slice(1);

      let mealType = undefined;
      if (promptLower.includes('midi') || promptLower.includes('déjeuner') || promptLower.includes('dejeuner')) mealType = 'lunch';
      else if (promptLower.includes('soir') || promptLower.includes('dîner') || promptLower.includes('diner')) mealType = 'dinner';

      return {
        pendingAction: 'create_meal',
        day,
        mealType
      };
    }

    // 12. OBJECTIFS D'ÉPARGNE
    if (promptLower.includes('objectif') || promptLower.includes('cagnotte') || promptLower.includes('épargne')) {
      const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
      const amount = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : undefined;

      let title = undefined;
      const titleMatch = promptLower.match(/(?:nommé|nommée|appelé|appelée|intitulé|intitulée)\s+([a-z0-9éèàùçâêîôûäëïöü\s]+)/i);
      if (titleMatch) title = titleMatch[1].trim();

      return {
        pendingAction: 'create_saving_goal',
        title,
        amount
      };
    }

    // 13. BUDGET GENERAL FALLBACK
    const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
    const amount = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : undefined;
    const hasBudgetKeyword = 
      /€|euros?|dépense|depense|payé|paye|payer|coût|coûte|coute|cout|facture|abonnement|prélèvement|prelevement|dollars?|\$|eur|usd/i.test(promptLower);
    if (amount && hasBudgetKeyword) {
      let title = 'Achat rapide';
      const pourMatch = promptLower.match(/(?:^|\s)(?:\d+[.,]?\d*)\s*(?:euros?|€|eur|dollars?|\$)?\s+(?:pour\s+l'|pour\s+l’|pour\s+le\s+|pour\s+la\s+|pour\s+les\s+|pour\s+|de\s+la\s+|de\s+l'|de\s+l’|de\s+|du\s+|des\s+|d'|d’|le\s+|la\s+|les\s+|l'|l’|en\s+|a\s+|à\s+)?([a-z0-9éèàùçâêîôûäëïöü’'\s-]+)/i);
      if (pourMatch) {
        const rawPour = pourMatch[1].trim();
        const pourKeyword = cleanLabel(rawPour);
        title = pourKeyword.charAt(0).toUpperCase() + pourKeyword.slice(1);
      } else {
        const amountRegexWithEuro = /(\d+[.,]?\d*)\s*(?:euros?|€|eur)/i;
        let cleanTitle = text.replace(/ajoute|ajouter|enregistre|enregistrer|noter|note|mets|mettre|dépense|depense|pour/gi, '').trim();
        cleanTitle = cleanTitle.replace(amountRegexWithEuro, '').replace(/(\d+[.,]?\d*)/, '').trim();
        cleanTitle = cleanTitle.replace(/tous les mois|chaque mois|mensuel|mensuelle|tous les jours|chaque jour|quotidien|quotidienne|chaque semaine|toutes les semaines|hebdomadaire|chaque (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)|chaque samedi|tous les ans|chaque année|chaque annee/gi, '').trim();
        const matchedMember = members.find(m => promptLower.includes(m.name.toLowerCase()));
        if (matchedMember) {
          const memberRegex = new RegExp(`\\b${matchedMember.name}\\b`, 'gi');
          cleanTitle = cleanTitle.replace(memberRegex, '').trim();
        }
        cleanTitle = cleanLabel(cleanTitle);
        if (cleanTitle) {
          title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        }
      }

      let category = 'Autres';
      let subCategory = 'Divers';
      let moduleSource = 'budget';

      const dynamicMapping = getDynamicVoiceMapping();
      const sortedKeys = Object.keys(dynamicMapping).sort((a, b) => b.length - a.length);
      
      let dynamicMatch = null;
      for (const key of sortedKeys) {
        if (promptLower.includes(key)) {
          dynamicMatch = dynamicMapping[key];
          break;
        }
      }

      if (dynamicMatch) {
        category = dynamicMatch.category;
        subCategory = dynamicMatch.subCategory;
        moduleSource = dynamicMatch.moduleSource;
      } else {
        const matchedRule = keywordRules.find(rule => 
          rule.keywords.some(kw => promptLower.includes(kw))
        );
        if (matchedRule) {
          category = matchedRule.category;
          subCategory = matchedRule.subCategory;
          moduleSource = matchedRule.moduleSource;
        } else {
          const searchMatch = findCategoryAndSubcategory(promptLower, title, getMergedCategories(), transactions);
          if (searchMatch) {
            category = searchMatch.category;
            subCategory = searchMatch.subCategory;
            moduleSource = searchMatch.moduleSource;
          }
        }
      }

      return {
        pendingAction: 'create_transaction',
        amount,
        title,
        category,
        subCategory,
        moduleSource
      };
    }

    return null;
  };

  const processVoiceContext = async (ctx: LooseValue) => {
    console.log("DEBUG DATE 2: Date stockée dans le contexte:", ctx.date);

    const missing = getMissingFields(ctx);
    const entities = getEntities(ctx);
    const hasMissing = missing.length > 0;
    const actionStr = hasMissing 
      ? `Question complémentaire : demande de ${missing[0]}` 
      : `Enregistrement en base de données de l'intention : ${ctx.pendingAction}`;

    const dateAuditObj = ctx.date ? {
      detected: ctx.dateRawDetected || ctx.dateText || ctx.date,
      context: ctx.date || '',
      creation: ctx.date || '',
      supabase: ctx.date || ''
    } : undefined;

    setVoiceDebugTrace((prev: LooseValue) => ({
      intention: ctx.pendingAction || 'unknown',
      entities,
      missingFields: missing,
      contextActive: true,
      actionExecuted: actionStr,
      contextFlow: prev?.contextFlow || null,
      dateAudit: dateAuditObj
    }));

    // Acquire voiceActionStatus lock to prevent duplicate runs
    if (voiceActionStatusRef.current === 'processing' || voiceActionStatusRef.current === 'completed') {
      console.log("processVoiceContext: execution locked, ignoring duplicate run.");
      return;
    }

    // 1. Check Missing Fields (1 question at a time)
    // 1a. create_trip
    if (ctx.pendingAction === 'create_trip') {
      if (!ctx.destination) {
        ctx.missingField = 'destination';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quelle destination souhaitez-vous créer ce voyage ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.startDate) {
        ctx.missingField = 'startDate';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quelle date de départ ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.endDate && !ctx.endDateAsked) {
        ctx.missingField = 'endDate';
        setVoiceContext(ctx);
        setVoiceFeedback("Souhaitez-vous ajouter une date de retour ? Vous pouvez répondre ‘non’.");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3500, 'ecoute');
        return;
      }
      if (!ctx.budget && !ctx.budgetAsked) {
        ctx.missingField = 'budget';
        setVoiceContext(ctx);
        setVoiceFeedback("Souhaitez-vous prévoir un budget ? Vous pouvez répondre ‘non’.");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3500, 'ecoute');
        return;
      }
    }

    // 1b. create_vaccine
    if (ctx.pendingAction === 'create_vaccine') {
      if (!ctx.date) {
        ctx.missingField = 'date';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quelle date souhaitez-vous planifier ce vaccin ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.title) {
        ctx.missingField = 'title';
        setVoiceContext(ctx);
        setVoiceFeedback("Quel est le nom du vaccin ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.memberId) {
        ctx.missingField = 'memberId';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour qui ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.time && !ctx.timeAsked) {
        ctx.missingField = 'time';
        setVoiceContext(ctx);
        setVoiceFeedback("Souhaitez-vous préciser une heure ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3500, 'ecoute');
        return;
      }
    }

    // 1c. create_pocket_money
    if (ctx.pendingAction === 'create_pocket_money') {
      if (!ctx.memberId) {
        ctx.missingField = 'memberId';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quel enfant souhaitez-vous ajouter cet argent de poche ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.amount) {
        ctx.missingField = 'amount';
        setVoiceContext(ctx);
        setVoiceFeedback("Quel montant d'argent de poche souhaitez-vous ajouter ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1d. create_vehicle_expense
    if (ctx.pendingAction === 'create_vehicle_expense') {
      if (!ctx.vehicleId) {
        ctx.missingField = 'vehicleId';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quel véhicule s'agit-il ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.amount) {
        ctx.missingField = 'amount';
        setVoiceContext(ctx);
        setVoiceFeedback("Quel est le montant de la dépense véhicule ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1e. create_bill
    if (ctx.pendingAction === 'create_bill') {
      if (!ctx.category) {
        ctx.missingField = 'category';
        setVoiceContext(ctx);
        setVoiceFeedback("De quel type de facture s'agit-il (EDF, loyer, internet...) ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.amount) {
        ctx.missingField = 'amount';
        setVoiceContext(ctx);
        setVoiceFeedback("Quel est le montant de la facture ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1f. create_demarche
    if (ctx.pendingAction === 'create_demarche') {
      if (!ctx.memberId) {
        ctx.missingField = 'memberId';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quel membre de la famille ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.date) {
        ctx.missingField = 'date';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quelle date souhaitez-vous planifier cette démarche ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1g. create_school_task
    if (ctx.pendingAction === 'create_school_task') {
      if (!ctx.memberId) {
        ctx.missingField = 'memberId';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quel enfant ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.title) {
        ctx.missingField = 'title';
        setVoiceContext(ctx);
        setVoiceFeedback("Quelle matière ? (Maths, Français...)");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.date) {
        ctx.missingField = 'date';
        setVoiceContext(ctx);
        setVoiceFeedback("Quelle est la date limite ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1h. create_event
    if (ctx.pendingAction === 'create_event') {
      if (!ctx.date) {
        ctx.missingField = 'date';
        setVoiceContext(ctx);
        setVoiceFeedback("À quelle date prévoyez-vous ce rendez-vous ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.time) {
        ctx.missingField = 'time';
        setVoiceContext(ctx);
        setVoiceFeedback("À quelle heure ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1i. create_document
    if (ctx.pendingAction === 'create_document') {
      if (!ctx.category) {
        ctx.missingField = 'category';
        setVoiceContext(ctx);
        setVoiceFeedback("Quelle catégorie de document souhaitez-vous ajouter (identité, santé, école, assurance) ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.memberId) {
        ctx.missingField = 'memberId';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quel membre de la famille ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1j. create_pet_action
    if (ctx.pendingAction === 'create_pet_action') {
      if (!ctx.petId) {
        ctx.missingField = 'petId';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quel animal ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.date) {
        ctx.missingField = 'date';
        setVoiceContext(ctx);
        setVoiceFeedback("À quelle date ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1k. create_meal
    if (ctx.pendingAction === 'create_meal') {
      if (!ctx.day) {
        ctx.missingField = 'day';
        setVoiceContext(ctx);
        setVoiceFeedback("Pour quel jour de la semaine (Lundi, Mardi...) ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.mealType) {
        ctx.missingField = 'mealType';
        setVoiceContext(ctx);
        setVoiceFeedback("Est-ce pour le midi ou pour le soir ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1l. create_saving_goal
    if (ctx.pendingAction === 'create_saving_goal') {
      if (!ctx.title) {
        ctx.missingField = 'title';
        setVoiceContext(ctx);
        setVoiceFeedback("Quel est le nom de cet objectif d'épargne ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
      if (!ctx.amount) {
        ctx.missingField = 'amount';
        setVoiceContext(ctx);
        setVoiceFeedback("Quel est le montant cible ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 1m. create_transaction
    if (ctx.pendingAction === 'create_transaction') {
      if (!ctx.category) {
        ctx.missingField = 'category';
        setVoiceContext(ctx);
        setVoiceFeedback("Dans quelle catégorie / type de dépense (Alimentation, Loisirs...) ?");
        setVoiceState('confirmation');
        setVoiceTranscript('');
        closeVoiceAssistantAfterDelay(3000, 'ecoute');
        return;
      }
    }

    // 2. Lock Execution
    voiceActionStatusRef.current = 'processing';
    const client = getSupabaseClient();
    let toastMessage = "";
    let feedback = "";
    let redirectPayload: LooseValue = undefined;

    // 3. Perform actions
    // 3a. create_trip
    if (ctx.pendingAction === 'create_trip') {
      if (ctx.startDate && ctx.endDate && ctx.startDate !== 'Non planifié' && ctx.endDate !== 'Non planifié') {
        const start = new Date(ctx.startDate);
        const end = new Date(ctx.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
          setVoiceFeedback("La date de retour doit être postérieure à la date de départ.");
          setVoiceWave(false);
          setVoiceActive(false);
          voiceActionStatusRef.current = 'completed';
          return;
        }
      }

      const duplicateExists = trips.some(t => 
        t.destination.toLowerCase() === ctx.destination.toLowerCase() &&
        t.startDate === ctx.startDate &&
        t.budget === Number(ctx.budget || 0)
      );
      if (duplicateExists) {
        console.log("processVoiceContext: duplicate trip detected, aborting creation.");
        voiceActionStatusRef.current = 'completed';
        return;
      }

      const newTripId = `t-${Date.now()}`;
      const newTrip = {
        id: newTripId,
        foyer_id: foyer?.id || '',
        destination: ctx.destination,
        startDate: ctx.startDate || 'Non planifié',
        endDate: ctx.endDate || ctx.startDate || 'Non planifié',
        budget: Number(ctx.budget || 0),
        bookingRefs: ['hotel:non_defini', 'transport:non_defini', 'billets:non_defini', 'activite:non_defini'],
        checklist: []
      };
      
      setTrips(prev => [...prev, newTrip]);
      if (client && foyer?.id) {
        try {
          await client.from('trips').insert({
            id: newTrip.id,
            foyer_id: foyer.id,
            destination: newTrip.destination,
            start_date: newTrip.startDate,
            end_date: newTrip.endDate,
            budget: newTrip.budget,
            booking_refs: JSON.stringify(newTrip.bookingRefs),
            checklist: JSON.stringify([])
          });
        } catch (err) {
          console.error("Error creating trip in Supabase:", err);
        }
      }
      
      setLastCreatedTrip({ id: newTripId, destination: ctx.destination });
      feedback = `✈️ Voyage ${ctx.destination} créé.`;
      toastMessage = `Voyage ${ctx.destination} créé`;
      
      if (ctx.expenseAmount > 0) {
        const expenseTitle = ctx.expenseTitle || 'Billets';
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const dateStr = now.toISOString().split('T')[0];
        
        const newTx = {
          id: crypto.randomUUID(),
          foyer_id: foyer?.id || '',
          title: `${expenseTitle} (Voyage ${ctx.destination})`,
          amount: ctx.expenseAmount,
          type: 'expense' as const,
          category: 'Voyages',
          subCategory: expenseTitle,
          date: dateStr,
          member_id: activeMemberId,
          member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
          comment: serializeTransactionComment(`Lié au voyage ${ctx.destination}`, {
            moduleSource: 'voyages',
            entryTime: timeStr,
            entryDate: dateStr,
            travelId: newTripId
          })
        };
        
        setTransactions(prev => [newTx, ...prev]);
        if (client && foyer?.id) {
          try {
            await client.from('transactions').insert({
              id: newTx.id,
              foyer_id: foyer.id,
              amount: newTx.amount,
              type: newTx.type,
              category: newTx.category,
              date: newTx.date,
              title: newTx.title,
              member_id: newTx.member_id,
              member_name: newTx.member_name,
              comment: newTx.comment
            });
          } catch (err) {
            console.error("Error inserting transaction in Supabase:", err);
          }
        }
        feedback += ` Dépense de ${ctx.expenseAmount}€ pour ${expenseTitle} ajoutée.`;
        toastMessage = `Voyage ${ctx.destination} mis à jour`;
      }

      redirectPayload = { tab: 'menu', module: 'voyages', toastMessage };
    }

    // 3b. create_vaccine
    else if (ctx.pendingAction === 'create_vaccine') {
      const newEventId = `ev-${Date.now()}`;
      const memberObj = members.find(m => m.id === ctx.memberId);
      const newEvent = {
        id: newEventId,
        title: ctx.title,
        type: 'vaccine' as const,
        dateTime: ctx.date,
        time: ctx.time || 'horaire à définir',
        memberId: ctx.memberId,
        memberName: memberObj?.name || 'Membre',
        description: 'Médecin traitant',
        done: false
      };

      console.log("DEBUG DATE 3: Date envoyée à la création:", newEvent.dateTime);

      setEvents(prev => [newEvent, ...prev]);

      // Envoi de la notification
      const timeStr = newEvent.time === 'horaire à définir' ? 'horaire à définir' : `à ${newEvent.time}`;
      sendLocalNotification(
        "Vaccin planifié",
        `💉 Le vaccin "${newEvent.title}" a été planifié pour ${newEvent.memberName} le ${ctx.date} (${timeStr}).`,
        "sante"
      );

      if (client && foyer?.id) {
        console.log("DEBUG DATE 4: Date enregistrée dans Supabase:", newEvent.dateTime);
        try {
          await client.from('events').insert({
            id: newEvent.id,
            foyer_id: foyer.id,
            title: newEvent.title,
            type: newEvent.type,
            date_time: newEvent.dateTime,
            time: newEvent.time,
            member_id: newEvent.memberId,
            member_name: newEvent.memberName,
            description: newEvent.description,
            done: newEvent.done
          });
        } catch (err) {
          console.error("Error inserting vaccine event in Supabase:", err);
        }
      }

      feedback = `🩺 Vaccin ${ctx.title} enregistré pour ${newEvent.memberName} le ${ctx.date} (${timeStr}).`;
      toastMessage = `${ctx.title} enregistré dans Santé`;
      redirectPayload = { tab: 'menu', module: 'sante', toastMessage };
    }

    // 3c. create_pocket_money
    else if (ctx.pendingAction === 'create_pocket_money') {
      const child = pocketMoney.find(c => c.id === ctx.memberId);
      if (child) {
        const newBal = child.balance + ctx.amount;
        setPocketMoney(prev => prev.map(c => c.id === ctx.memberId ? { ...c, balance: newBal } : c));
        if (client && foyer?.id) {
          try {
            await client.from('pocket_money').update({ balance: newBal }).eq('id', child.id);
            
            // Add transaction log
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const dateStr = now.toISOString().split('T')[0];
            await client.from('transactions').insert({
              id: crypto.randomUUID(),
              foyer_id: foyer.id,
              title: `Allocation : ${child.name}`,
              amount: ctx.amount,
              type: 'expense',
              category: 'Argent de poche',
              date: dateStr,
              member_id: activeMemberId,
              member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
              comment: serializeTransactionComment('Généré par commande vocale', {
                moduleSource: 'argent_de_poche',
                entryTime: timeStr,
                entryDate: dateStr
              })
            });
          } catch (err) {
            console.error("Error updating pocket money in Supabase:", err);
          }
        }
        feedback = `🪙 Allocation de ${ctx.amount}€ enregistrée pour ${child.name}.`;
        toastMessage = `Argent de poche mis à jour`;
      }
      redirectPayload = { tab: 'menu', module: 'argent', toastMessage };
    }

    // 3d. create_vehicle_expense
    else if (ctx.pendingAction === 'create_vehicle_expense') {
      const v = vehicles.find(item => item.id === ctx.vehicleId);
      const category = ctx.category || 'Entretien';
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateStr = now.toISOString().split('T')[0];

      const newTx = {
        id: crypto.randomUUID(),
        foyer_id: foyer?.id || '',
        title: `Voiture (${v?.name || 'Véhicule'}) : ${category}`,
        amount: ctx.amount,
        type: 'expense' as const,
        category: 'Véhicules',
        subCategory: category,
        date: dateStr,
        member_id: activeMemberId,
        member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
        comment: serializeTransactionComment(`Dépense véhicule pour ${v?.name || 'Véhicule'}`, {
          moduleSource: 'vehicules',
          entryTime: timeStr,
          entryDate: dateStr
        })
      };

      setTransactions(prev => [newTx, ...prev]);
      if (client && foyer?.id) {
        try {
          await client.from('transactions').insert({
            id: newTx.id,
            foyer_id: foyer.id,
            amount: newTx.amount,
            type: newTx.type,
            category: newTx.category,
            date: newTx.date,
            title: newTx.title,
            member_id: newTx.member_id,
            member_name: newTx.member_name,
            comment: newTx.comment
          });
        } catch (err) {
          console.error("Error creating vehicle transaction in Supabase:", err);
        }
      }

      feedback = `🚗 Dépense véhicule de ${ctx.amount}€ enregistrée pour ${v?.name || 'Véhicule'}.`;
      toastMessage = `Dépense véhicule enregistrée`;
      redirectPayload = { tab: 'menu', module: 'vehicule', toastMessage };
    }

    // 3e. create_bill
    else if (ctx.pendingAction === 'create_bill') {
      const category = ctx.category || 'Charges';
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateStr = now.toISOString().split('T')[0];

      const newTx = {
        id: crypto.randomUUID(),
        foyer_id: foyer?.id || '',
        title: `Facture : ${category}`,
        amount: ctx.amount,
        type: 'expense' as const,
        category: 'Logement',
        subCategory: category,
        date: dateStr,
        member_id: activeMemberId,
        member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
        comment: serializeTransactionComment(`Facture de logement ${category}`, {
          moduleSource: 'logement',
          entryTime: timeStr,
          entryDate: dateStr
        })
      };

      setTransactions(prev => [newTx, ...prev]);
      if (client && foyer?.id) {
        try {
          await client.from('transactions').insert({
            id: newTx.id,
            foyer_id: foyer.id,
            amount: newTx.amount,
            type: newTx.type,
            category: newTx.category,
            date: newTx.date,
            title: newTx.title,
            member_id: newTx.member_id,
            member_name: newTx.member_name,
            comment: newTx.comment
          });
        } catch (err) {
          console.error("Error inserting bill transaction in Supabase:", err);
        }
      }

      feedback = `🏠 Facture de ${ctx.amount}€ pour ${category} enregistrée.`;
      toastMessage = `Facture ${category} enregistrée`;
      redirectPayload = { tab: 'menu', module: 'logement', toastMessage };
    }

    // 3f. create_demarche
    else if (ctx.pendingAction === 'create_demarche') {
      const memberObj = members.find(m => m.id === ctx.memberId);
      const newDem = {
        id: `dem-${Date.now()}`,
        title: ctx.title || 'Démarche administrative',
        icon: '📄',
        status: 'todo' as const,
        assignedMemberId: ctx.memberId,
        assignedMemberName: memberObj?.name || 'Famille',
        steps: [{ id: 'step-1', title: 'Prendre rendez-vous', done: false }],
        pieces: [],
        createdAt: ctx.date || 'Non spécifié',
        notes: ''
      };

      setDemarches(prev => [...prev, newDem]);
      if (client && foyer?.id) {
        try {
          await client.from('demarches').insert({
            id: newDem.id,
            foyer_id: foyer.id,
            title: newDem.title,
            icon: newDem.icon,
            status: newDem.status,
            assigned_member_id: newDem.assignedMemberId,
            assigned_member_name: newDem.assignedMemberName,
            steps: JSON.stringify(newDem.steps),
            pieces: JSON.stringify([]),
            created_at_text: newDem.createdAt
          });
        } catch (err) {
          console.error("Error inserting demarche in Supabase:", err);
        }
      }

      feedback = `📂 Démarche "${newDem.title}" enregistrée pour ${newDem.assignedMemberName}.`;
      toastMessage = `Démarche administrative créée`;
      redirectPayload = { tab: 'menu', module: 'documents', toastMessage };
    }

    // 3g. create_school_task
    else if (ctx.pendingAction === 'create_school_task') {
      const memberObj = members.find(m => m.id === ctx.memberId);
      const newTask = {
        id: `sch-${Date.now()}`,
        subject: ctx.title || 'Matière générale',
        title: 'Devoir de classe',
        dueDate: ctx.date || 'Non planifié',
        done: false,
        assignedMemberId: ctx.memberId || '',
        difficulty: 'medium' as const,
        grade: ''
      };

      setSchoolTasks(prev => [...prev, newTask]);
      if (client && foyer?.id) {
        try {
          await client.from('school_tasks').insert({
            id: newTask.id,
            foyer_id: foyer.id,
            subject: newTask.subject,
            title: newTask.title,
            due_date: newTask.dueDate,
            done: newTask.done,
            assigned_member_id: newTask.assignedMemberId,
            difficulty: newTask.difficulty
          });
        } catch (err) {
          console.error("Error inserting school task in Supabase:", err);
        }
      }

      feedback = `🎓 Devoir de ${newTask.subject} enregistré pour ${memberObj?.name || 'Enfant'} le ${ctx.date}.`;
      toastMessage = `Devoir de ${newTask.subject} enregistré`;
      redirectPayload = { tab: 'menu', module: 'ecole', toastMessage };
    }

    // 3h. create_event
    else if (ctx.pendingAction === 'create_event') {
      const newEventId = `ev-${Date.now()}`;
      const targetMemberId = ctx.memberId || activeMemberId;
      const targetMember = members.find(m => m.id === targetMemberId);
      const isMedical = /médical|medical|dentiste|docteur|médecin|medecin|hopital|hôpital|sante|santé|vaccin/i.test(ctx.title || '');
      
      const newEvent = {
        id: newEventId,
        title: ctx.title || 'Rendez-vous',
        type: (isMedical ? 'medical' : 'other') as LooseValue,
        dateTime: ctx.date,
        time: ctx.time || 'horaire à définir',
        memberId: targetMemberId,
        memberName: targetMember?.name || 'Famille',
        done: false
      };

      setEvents(prev => [newEvent, ...prev]);
      
      // Envoi de la notification
      const timeStr = newEvent.time === 'horaire à définir' ? 'horaire à définir' : `à ${newEvent.time}`;
      sendLocalNotification(
        isMedical ? "Rendez-vous médical planifié" : "Événement planifié",
        `📅 Rendez-vous "${newEvent.title}" enregistré pour ${newEvent.memberName} le ${ctx.date} (${timeStr}).`,
        "agenda"
      );

      if (client && foyer?.id) {
        try {
          await client.from('events').insert({
            id: newEvent.id,
            foyer_id: foyer.id,
            title: newEvent.title,
            type: newEvent.type,
            date_time: newEvent.dateTime,
            time: newEvent.time,
            member_id: newEvent.memberId,
            member_name: newEvent.memberName,
            done: newEvent.done
          });
        } catch (err) {
          console.error("Error inserting event in Supabase:", err);
        }
      }

      feedback = `📅 Rendez-vous "${newEvent.title}" enregistré pour ${newEvent.memberName} le ${ctx.date} (${timeStr}).`;
      toastMessage = `Rendez-vous enregistré`;
      redirectPayload = isMedical 
        ? { tab: 'menu', module: 'sante', toastMessage }
        : { tab: 'agenda', toastMessage };
    }

    // 3i. create_document
    else if (ctx.pendingAction === 'create_document') {
      const memberObj = members.find(m => m.id === ctx.memberId);
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: `Nouveau document - ${ctx.category}`,
        category: ctx.category as LooseValue,
        memberId: ctx.memberId,
        memberName: memberObj?.name || 'Famille',
        tags: [ctx.category],
        uploadDate: new Date().toISOString().split('T')[0],
        fileSize: '0.1 MB',
        isExpired: false
      };

      setDocuments(prev => [newDoc, ...prev]);
      if (client && foyer?.id) {
        try {
          await client.from('documents').insert({
            id: newDoc.id,
            foyer_id: foyer.id,
            name: newDoc.name,
            category: newDoc.category,
            member_id: newDoc.memberId,
            member_name: newDoc.memberName,
            upload_date: newDoc.uploadDate,
            file_size: newDoc.fileSize,
            is_expired: newDoc.isExpired
          });
        } catch (err) {
          console.error("Error inserting document in Supabase:", err);
        }
      }

      feedback = `📂 Document de type ${ctx.category} ajouté pour ${newDoc.memberName}.`;
      toastMessage = `Document enregistré`;
      redirectPayload = { tab: 'menu', module: 'documents', toastMessage };
    }

    // 3j. create_pet_action
    else if (ctx.pendingAction === 'create_pet_action') {
      const p = pets.find(pet => pet.id === ctx.petId);
      if (p) {
        const nextVaccine = ctx.date;
        setPets(prev => prev.map(pet => pet.id === ctx.petId ? { ...pet, nextVaccine } : pet));
        if (client && foyer?.id) {
          try {
            await client.from('pets').update({ next_vaccine: nextVaccine }).eq('id', p.id);
          } catch (err) {
            console.error("Error updating pet record in Supabase:", err);
          }
        }
        feedback = `🐶 Suivi mis à jour : Prochain vaccin pour ${p.name} planifié le ${ctx.date}.`;
        toastMessage = `Vaccin de ${p.name} planifié`;
      }
      redirectPayload = { tab: 'menu', module: 'animaux', toastMessage };
    }

    // 3k. create_meal
    else if (ctx.pendingAction === 'create_meal') {
      const newDish = {
        id: `dish-${Date.now()}`,
        day: ctx.day,
        mealType: ctx.mealType,
        name: 'Plat à définir',
        image: 'utensils',
        ingredients: []
      };

      setDishes(prev => [...prev, newDish]);
      if (client && foyer?.id) {
        try {
          await client.from('dishes').insert({
            id: newDish.id,
            foyer_id: foyer.id,
            day: newDish.day,
            meal_type: newDish.mealType,
            name: newDish.name,
            image: newDish.image,
            ingredients: []
          });
        } catch (err) {
          console.error("Error inserting dish in Supabase:", err);
        }
      }

      feedback = `🍳 Repas du ${ctx.day} (${ctx.mealType === 'lunch' ? 'Midi' : 'Soir'}) ajouté aux menus.`;
      toastMessage = `Menu du ${ctx.day} mis à jour`;
      redirectPayload = { tab: 'menu', module: 'menus', toastMessage };
    }

    // 3l. create_saving_goal
    else if (ctx.pendingAction === 'create_saving_goal') {
      const newGoal = {
        id: `sg-${Date.now()}`,
        title: ctx.title || "Nouvel objectif",
        targetAmount: Number(ctx.amount || 100),
        currentAmount: 0,
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
        category: 'Projet',
        contributions: []
      };

      setSavingGoals(prev => [...prev, newGoal]);
      if (client && foyer?.id) {
        try {
          await client.from('saving_goals').insert({
            id: newGoal.id,
            foyer_id: foyer.id,
            title: newGoal.title,
            target_amount: newGoal.targetAmount,
            current_amount: newGoal.currentAmount,
            target_date: newGoal.targetDate,
            category: newGoal.category,
            contributions: JSON.stringify([])
          });
        } catch (err) {
          console.error("Error inserting saving goal in Supabase:", err);
        }
      }

      feedback = `🎯 Objectif d'épargne "${newGoal.title}" créé avec une cible de ${newGoal.targetAmount}€.`;
      toastMessage = `Objectif ${newGoal.title} créé`;
      redirectPayload = { tab: 'budget', subView: { type: 'tab', tab: 'cagnottes' }, toastMessage };
    }

    // 3m. create_transaction (fallback general budget)
    else if (ctx.pendingAction === 'create_transaction') {
      const category = ctx.category || 'Autres';
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateStr = now.toISOString().split('T')[0];

      const newTx = {
        id: crypto.randomUUID(),
        foyer_id: foyer?.id || '',
        title: ctx.title || 'Achat vocal',
        amount: ctx.amount,
        type: 'expense' as const,
        category: category,
        subCategory: ctx.subCategory || 'Divers',
        date: dateStr,
        member_id: activeMemberId,
        member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
        comment: serializeTransactionComment('Généré par commande vocale', {
          moduleSource: ctx.moduleSource || 'budget',
          entryTime: timeStr,
          entryDate: dateStr
        })
      };

      setTransactions(prev => [newTx, ...prev]);
      if (client && foyer?.id) {
        try {
          await client.from('transactions').insert({
            id: newTx.id,
            foyer_id: foyer.id,
            amount: newTx.amount,
            type: newTx.type,
            category: newTx.category,
            date: newTx.date,
            title: newTx.title,
            member_id: newTx.member_id,
            member_name: newTx.member_name,
            comment: newTx.comment
          });
        } catch (err) {
          console.error("Error inserting fallback transaction in Supabase:", err);
        }
      }

      feedback = `💸 Achat de ${ctx.amount}€ dans la catégorie ${category} enregistré.`;
      toastMessage = `${category} : transaction enregistrée`;
      redirectPayload = { tab: 'budget', subView: { type: 'tab', tab: 'transactions' }, toastMessage };
    }

    // 4. Wrap up execution
    setVoiceDebugTrace((prev: LooseValue) => ({
      ...prev,
      missingFields: [],
      actionExecuted: `Action exécutée avec succès ! (${ctx.pendingAction})`
    }));

    setVoiceFeedback(feedback);
    
    const remainingSegments = ctx.remainingSegments || [];
    if (remainingSegments.length > 0) {
      setVoiceContext({
        pendingAction: 'none',
        lastActiveTime: Date.now(),
        remainingSegments: remainingSegments.slice(1)
      });
      setTimeout(() => {
        if (parseVoiceCommandRef.current) {
          parseVoiceCommandRef.current(remainingSegments[0]);
        } else {
          parseVoiceCommand(remainingSegments[0]);
        }
      }, 2500);
    } else {
      setVoiceContext({
        pendingAction: 'none',
        lastActiveTime: Date.now()
      });
      if (redirectPayload) {
        closeVoiceAssistantAfterDelay(2500, 'inactif', redirectPayload);
      } else {
        closeVoiceAssistantAfterDelay(2500);
      }
    }
  };

  const parseFrenchDate = (input: string): string => {
    const months: Record<string, string> = {
      janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
      juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12'
    };
    const lower = input.toLowerCase().trim();
    
    if (lower.includes("aujourd'hui")) {
      return new Date().toISOString().split('T')[0];
    }
    if (lower.includes("demain")) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    if (lower.includes("après-demain") || lower.includes("apres demain")) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().split('T')[0];
    }
    
    const textMatch = lower.match(/(\d+)(?:er)?\s+([a-zàâäéèêëîïôöùûüç]+)/);
    if (textMatch) {
      const day = textMatch[1].padStart(2, '0');
      const monthStr = textMatch[2];
      const month = months[monthStr];
      if (month) {
        return `${new Date().getFullYear()}-${month}-${day}`;
      }
    }
    
    const numMatch = lower.match(/(\d+)[-/.](\d+)([-/.](\d+))?/);
    if (numMatch) {
      const day = numMatch[1].padStart(2, '0');
      const month = numMatch[2].padStart(2, '0');
      const year = numMatch[4] || String(new Date().getFullYear());
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month}-${day}`;
    }
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
      return lower;
    }
    
    const parsed = new Date(lower);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const getMissingFields = (ctx: LooseValue) => {
    const missing: string[] = [];
    if (!ctx) return missing;
    if (ctx.pendingAction === 'create_trip') {
      if (!ctx.destination) missing.push('destination');
      if (!ctx.startDate) missing.push('startDate');
      if (ctx.destination && ctx.startDate) {
        if (!ctx.endDate && !ctx.endDateAsked) missing.push('endDate');
        else if (!ctx.budget && !ctx.budgetAsked) missing.push('budget');
      }
    } else if (ctx.pendingAction === 'create_vaccine') {
      if (!ctx.date) missing.push('date');
      if (!ctx.title) missing.push('title');
      if (!ctx.memberId) missing.push('memberId');
      if (!ctx.time && !ctx.timeAsked) missing.push('time');
    } else if (ctx.pendingAction === 'create_pocket_money') {
      if (!ctx.memberId) missing.push('memberId');
      if (!ctx.amount) missing.push('amount');
    } else if (ctx.pendingAction === 'create_vehicle_expense') {
      if (!ctx.vehicleId) missing.push('vehicleId');
      if (!ctx.amount) missing.push('amount');
    } else if (ctx.pendingAction === 'create_bill') {
      if (!ctx.category) missing.push('category');
      if (!ctx.amount) missing.push('amount');
    } else if (ctx.pendingAction === 'create_demarche') {
      if (!ctx.memberId) missing.push('memberId');
      if (!ctx.date) missing.push('date');
    } else if (ctx.pendingAction === 'create_school_task') {
      if (!ctx.memberId) missing.push('memberId');
      if (!ctx.title) missing.push('title');
      if (!ctx.date) missing.push('date');
    } else if (ctx.pendingAction === 'create_event') {
      if (!ctx.date) missing.push('date');
      if (!ctx.time) missing.push('time');
    } else if (ctx.pendingAction === 'create_document') {
      if (!ctx.category) missing.push('category');
      if (!ctx.memberId) missing.push('memberId');
    } else if (ctx.pendingAction === 'create_pet_action') {
      if (!ctx.petId) missing.push('petId');
      if (!ctx.date) missing.push('date');
    } else if (ctx.pendingAction === 'create_meal') {
      if (!ctx.day) missing.push('day');
      if (!ctx.mealType) missing.push('mealType');
    } else if (ctx.pendingAction === 'create_saving_goal') {
      if (!ctx.title) missing.push('title');
      if (!ctx.amount) missing.push('amount');
    } else if (ctx.pendingAction === 'create_transaction') {
      if (!ctx.category) missing.push('category');
    }
    return missing;
  };

  const getEntities = (ctx: LooseValue) => {
    const entities: Record<string, LooseValue> = {};
    if (!ctx) return entities;
    const skip = ['pendingAction', 'remainingSegments', 'lastActiveTime', 'missingField'];
    Object.keys(ctx).forEach(key => {
      if (!skip.includes(key) && ctx[key] !== undefined && ctx[key] !== null) {
        entities[key] = ctx[key];
      }
    });
    return entities;
  };

  const parseVoiceCommand = async (rawInputText: string) => {
    try {
      // Normalisation des synonymes
      const normalizeTextForSynonym = (txt: string): string => {
        return txt
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
          .replace(/[.,/#!$%^&*;:{}=_`~()?-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const getProductToCheck = (normalizedText: string): string | null => {
        const checkPrefixes = [
          'retire le ', 'retire la ', 'retire les ', 'retire l\'', 'retire l’', 'retire ',
          'enlève le ', 'enlève la ', 'enlève les ', 'enlève l\'', 'enlève l’', 'enlève ',
          'enleve le ', 'enleve la ', 'enleve les ', 'enleve l\'', 'enleve l’', 'enleve ',
          'coche le ', 'coche la ', 'coche les ', 'coche l\'', 'coche l’', 'coche ',
          'termine pour le ', 'termine pour la ', 'termine pour les ', 'termine pour l\'', 'termine pour l’', 'termine pour ',
          'terminé pour le ', 'terminé pour la ', 'terminé pour les ', 'terminé pour l\'', 'terminé pour l’', 'terminé pour '
        ];

        for (const prefix of checkPrefixes) {
          const normPrefix = normalizeTextForSynonym(prefix);
          if (normalizedText.startsWith(normPrefix)) {
            return normalizedText.slice(normPrefix.length).trim();
          }
        }

        if (normalizedText.startsWith('marque ')) {
          let remainder = normalizedText.slice(7).trim();
          remainder = remainder.replace(/^(le|la|les|l'|l’)\s+/i, '').trim();
          const suffix = remainder.match(/(.+?)\s+comme\s+(?:achete|acheté|fait)$/i);
          if (suffix) {
            return suffix[1].trim();
          }
        }

        const checkSuffixes = [
          ' est achete', ' est acheté', ' sont achetes', ' sont achetés',
          ' c\'est bon', ' c’est bon', ' c est bon',
          ' c\'est fait', ' c’est fait', ' c est fait'
        ];

        for (const suffix of checkSuffixes) {
          if (normalizedText.endsWith(suffix)) {
            let prod = normalizedText.slice(0, normalizedText.length - suffix.length).trim();
            prod = prod.replace(/^(le|la|les|l'|l’)\s+/i, '').trim();
            return prod;
          }
        }

        return null;
      };

      const normalizedForSynonym = normalizeTextForSynonym(rawInputText);

      // Courses remaining synonyms
      const coursesRemainingSynonyms = [
        "que reste t il a acheter", "que reste-t-il a acheter", "que reste-t-il à acheter",
        "qu est ce qu il reste a acheter", "qu'est-ce qu'il reste à acheter", "qu'est-ce qu'il reste a acheter",
        "qu est ce qu il manque", "qu'est-ce qu'il manque", "il manque quoi", "il reste quoi",
        "on doit acheter quoi", "qu est ce qu on doit acheter", "qu'est-ce qu'on doit acheter",
        "montre les courses", "affiche les courses", "ouvre les courses", "fais voir les courses",
        "affiche la liste", "fais voir la liste", "voir la liste des courses", "voir les articles restants",
        "voir les achats restants", "courses restantes", "liste restante",
        "il reste quoi à acheter", "il reste quoi dans les courses", "il reste quoi sur la liste",
        "il reste quoi à prendre", "il reste quoi à faire comme courses", "il manque quoi à acheter",
        "il manque quoi dans les courses", "il manque quoi sur la liste", "il manque quoi à prendre",
        "qu’est-ce qu’il reste", "qu’est-ce qu’il reste à acheter", "qu’est-ce qui reste",
        "qu’est-ce qui reste à acheter", "qu’est-ce qui manque", "qu’est-ce qui manque à acheter",
        "que manque-t-il", "que manque-t-il à acheter", "c’est quoi ce qu’il reste",
        "c’est quoi ce qu’il manque", "montre ce qu’il reste", "montre ce qu’il reste à acheter",
        "montre les articles restants", "affiche ce qu’il reste", "affiche ce qu’il manque",
        "liste ce qu’il reste", "liste les courses restantes", "qu’est-ce qu’on doit encore acheter",
        "qu’est-ce qu’il faut encore acheter", "qu’est-ce qu’il faut acheter", "on doit encore acheter quoi",
        "il nous faut encore quoi", "il nous manque quoi", "il nous manque quoi à acheter"
      ];


      // Budget open synonyms
      const budgetSynonyms = [
        "montre le budget", "affiche le budget", "fais voir le budget", "combien il me reste",
        "ou j en suis", "ou j'en suis", "mes finances", "mes depenses", "mes dépenses",
        "mes comptes", "combien j ai depense", "combien j'ai dépensé", "combien j'ai depense",
        "etat des finances", "état des finances", "budget du mois"
      ];

      // Travel open synonyms
      const travelSynonyms = [
        "mes voyages", "affiche mes voyages", "ouvre mes voyages", "montre mon voyage",
        "voyage italie", "voyage maroc", "voyage senegal", "voyage sénégal", "budget voyage",
        "preparation voyage", "préparation voyage", "ou en est mon voyage", "où en est mon voyage"
      ];

      // Health open synonyms
      const healthSynonyms = [
        "mes vaccins", "les vaccins", "vaccins a venir", "vaccins à venir", "mes rendez vous medicaux",
        "mes rendez-vous médicaux", "sante", "santé", "carnet de sante", "carnet de santé",
        "prochains vaccins", "sante de yatta", "santé de yatta", "sante de mariam", "santé de mariam"
      ];

      // Agenda open synonyms
      const agendaSynonyms = [
        "mon agenda", "affiche mon agenda", "ouvre mon agenda", "mes rendez vous", "mes rendez-vous",
        "mes rdv", "mon calendrier", "cette semaine", "ce mois ci", "ce mois-ci", "mes evenements",
        "mes événements"
      ];

      // Housing open synonyms
      const housingSynonyms = [
        "mon logement", "la maison", "les depenses maison", "les dépenses maison", "les factures maison",
        "mes factures"
      ];

      // Vehicle open synonyms
      const vehicleSynonyms = [
        "ma voiture", "mes vehicules", "mes véhicules", "controle technique", "contrôle technique",
        "entretien voiture", "revision voiture", "révision voiture", "assurance voiture"
      ];

      // Administrative open synonyms
      const administrativeSynonyms = [
        "mes demarches", "mes démarches", "mes papiers", "mes documents", "mes formalites",
        "mes formalités", "mes demandes administratives"
      ];

      let preprocessedText = rawInputText;
      let matchedSynonym = false;

      if (coursesRemainingSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "que reste-t-il";
        matchedSynonym = true;
      } else if (budgetSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "ouvre le budget";
        matchedSynonym = true;
      } else if (travelSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "ouvre les voyages";
        matchedSynonym = true;
      } else if (healthSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "ouvre la santé";
        matchedSynonym = true;
      } else if (agendaSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "ouvre l'agenda";
        matchedSynonym = true;
      } else if (housingSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "ouvre le logement";
        matchedSynonym = true;
      } else if (vehicleSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "ouvre les véhicules";
        matchedSynonym = true;
      } else if (administrativeSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
        preprocessedText = "ouvre les démarches";
        matchedSynonym = true;
      } else {
        const productToCheck = getProductToCheck(normalizedForSynonym);
        if (productToCheck) {
          preprocessedText = `j'ai acheté ${productToCheck}`;
          matchedSynonym = true;
        }
      }

      if (matchedSynonym) {
        rawInputText = preprocessedText;
      }

      const textWithDigits = convertFrenchNumbersToDigits(rawInputText);
      let promptLower = textWithDigits.toLowerCase().trim();
      let text = rawInputText;
      let feedback = "";
      let intent = "unknown";
      let isSuccess = false;

      const logVoiceCommandToSupabase = async (cmdIntent: string, success: boolean, customFields: LooseValue = {}) => {
        const client = getSupabaseClient();
        if (client && foyer?.id) {
          try {
            await client.from('voice_commands').insert({
              id: crypto.randomUUID(),
              foyer_id: foyer.id,
              raw_text: rawInputText,
              parsed_intent: cmdIntent,
              is_success: success,
              ...customFields
            });
          } catch (err) {
            console.warn("Log command warning:", err);
          }
        }
      };

      // 1. Check Voice Context conversational memory
      const now = Date.now();
      const isContextActive = voiceContext && (now - voiceContext.lastActiveTime <= 120000);
      const isShortAnswer = text.split(/\s+/).length <= 4;
      
      if (voiceContext && voiceContext.pendingAction !== 'none') {
        if (!isContextActive) {
          setVoiceContext(null);
          voiceActionStatusRef.current = 'waiting';
          if (isShortAnswer) {
            feedback = "Je n'ai plus assez d'informations pour terminer l'action. Pouvez-vous recommencer ?";
            setVoiceFeedback(feedback);
            logVoiceCommandToSupabase("context_expired", false);
            closeVoiceAssistantAfterDelay(3500);
            return;
          }
        } else {
          let resolved = false;
          const updatedCtx = { ...voiceContext, lastActiveTime: now } as LooseValue;
          const textLower = promptLower.trim();

          let resolvedValue: LooseValue = text.trim();
          if (voiceContext.missingField === 'memberId') {
            const matchesList = findAllMemberMatches(text, members, activeMemberId);
            if (matchesList.length > 0) {
              resolvedValue = matchesList[0].name;
            } else {
              resolvedValue = text.trim();
            }
          } else if (voiceContext.missingField === 'date') {
            resolvedValue = parseFrenchDate(text.trim());
          } else if (voiceContext.missingField === 'amount' || voiceContext.missingField === 'budget') {
            const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
            if (numMatch) {
              resolvedValue = parseFloat(numMatch[1].replace(',', '.'));
            }
          }

          const waitingForFriendly: string = voiceContext.missingField === 'memberId' ? 'personne' : (voiceContext.missingField || 'unknown');
          
          const contextFlowObj: LooseValue = {
            context_active: true,
            waiting_for: waitingForFriendly,
            received: text.trim(),
            [waitingForFriendly]: resolvedValue
          };

          setVoiceDebugTrace({
            intention: voiceContext.pendingAction || 'unknown',
            entities: getEntities(updatedCtx),
            missingFields: getMissingFields(updatedCtx),
            contextActive: true,
            actionExecuted: `Réception de la réponse pour le champ : ${waitingForFriendly}`,
            contextFlow: contextFlowObj
          });

          // 1. Check for cancellation
          if (textLower === 'annuler' || textLower === 'annule' || textLower === 'stop' || textLower === 'quitter') {
            setVoiceFeedback("Action annulée.");
            setVoiceContext(null);
            voiceActionStatusRef.current = 'completed';
            setVoiceWave(false);
            closeVoiceAssistantAfterDelay(2000, 'idle');
            return;
          }
          
          const isSkipAnswer = (val: string) => {
            const norm = val.toLowerCase().trim();
            return norm === 'non' || 
                   norm === 'non merci' || 
                   norm === 'pas encore' || 
                   norm === 'je ne sais pas' || 
                   norm === 'plus tard' || 
                   norm === 'sans' || 
                   norm === 'aucune' || 
                   norm === 'aucun';
          };

          if (voiceContext.missingField === 'budget') {
            const val = text.trim();
            if (isSkipAnswer(val)) {
              updatedCtx.budget = 0;
              updatedCtx.budgetAsked = true;
              delete updatedCtx.missingField;
              resolved = true;
            } else {
              const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
              if (numMatch) {
                updatedCtx.budget = parseFloat(numMatch[1].replace(',', '.'));
                updatedCtx.budgetAsked = true;
                delete updatedCtx.missingField;
                resolved = true;
              } else if (val) {
                updatedCtx.budget = 0;
                updatedCtx.budgetAsked = true;
                delete updatedCtx.missingField;
                resolved = true;
              }
            }
          } else if (voiceContext.missingField === 'destination') {
            const destVal = text.trim();
            if (destVal) {
              const clean = normalizeDestination(destVal);
              if (clean) {
                updatedCtx.destination = correctSpelling(clean);
                delete updatedCtx.missingField;
                resolved = true;
              }
            }
          } else if (voiceContext.missingField === 'startDate') {
            const dateVal = text.trim();
            if (dateVal) {
              const isoDate = parseFrenchDate(dateVal);
              updatedCtx.startDate = isoDate;
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'endDate') {
            const val = text.trim();
            if (isSkipAnswer(val)) {
              updatedCtx.endDate = 'Non planifié';
              updatedCtx.endDateAsked = true;
              delete updatedCtx.missingField;
              resolved = true;
            } else if (val) {
              const isoDate = parseFrenchDate(val);
              updatedCtx.endDate = isoDate;
              updatedCtx.endDateAsked = true;
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'date') {
            const dateVal = text.trim();
            if (dateVal) {
              const isoDate = parseFrenchDate(dateVal);
              updatedCtx.startDate = isoDate;
              updatedCtx.endDate = isoDate;
              updatedCtx.date = isoDate;
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'memberId') {
            const matchesList = findAllMemberMatches(text, members, activeMemberId);
            if (matchesList.length === 1) {
              updatedCtx.memberId = matchesList[0].id;
              delete updatedCtx.missingField;
              resolved = true;
            } else if (matchesList.length > 1) {
              const namesList = matchesList.map(m => `• ${m.name}`).join('\n');
              const voicePrompt = `Voulez-vous dire :\n${namesList}`;
              setVoiceFeedback(voicePrompt);
              setVoiceState('confirmation');
              setVoiceTranscript('');
              closeVoiceAssistantAfterDelay(4500, 'ecoute');
              return;
            }
          } else if (voiceContext.missingField === 'petId') {
            const matchedPet = pets.find(p => textLower.includes(p.name.toLowerCase()));
            if (matchedPet) {
              updatedCtx.petId = matchedPet.id;
              updatedCtx.petName = matchedPet.name;
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'vehicleId') {
            const matchedVehicle = vehicles.find(v => textLower.includes(v.name.toLowerCase()));
            if (matchedVehicle) {
              updatedCtx.vehicleId = matchedVehicle.id;
              updatedCtx.vehicleName = matchedVehicle.name;
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'day') {
            const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
            const matchedDay = days.find(d => textLower.includes(d));
            if (matchedDay) {
              updatedCtx.day = matchedDay.charAt(0).toUpperCase() + matchedDay.slice(1);
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'mealType') {
            if (textLower.includes('midi') || textLower.includes('déjeuner') || textLower.includes('dejeuner') || textLower.includes('lunch')) {
              updatedCtx.mealType = 'lunch';
              delete updatedCtx.missingField;
              resolved = true;
            } else if (textLower.includes('soir') || textLower.includes('dîner') || textLower.includes('diner') || textLower.includes('dinner')) {
              updatedCtx.mealType = 'dinner';
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'category') {
            if (textLower) {
              updatedCtx.category = text.trim();
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'amount') {
            const numMatch = promptLower.match(/(\d+[.,]?\d*)/);
            if (numMatch) {
              updatedCtx.amount = parseFloat(numMatch[1].replace(',', '.'));
              updatedCtx.expenseAmount = updatedCtx.amount;
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'title') {
            if (text.trim()) {
              updatedCtx.title = text.trim();
              delete updatedCtx.missingField;
              resolved = true;
            }
          } else if (voiceContext.missingField === 'time') {
            const lowerVal = text.toLowerCase().trim();
            const isSkip = lowerVal.includes('sais pas') || 
                           lowerVal.includes('pas encore') || 
                           lowerVal.includes('non défini') || 
                           lowerVal.includes('non defini') || 
                           lowerVal.includes('aucune') || 
                           lowerVal.includes('aucun') || 
                           lowerVal.includes('plus tard') || 
                           lowerVal === 'non' || 
                           lowerVal === 'non merci';
            if (isSkip) {
              updatedCtx.time = 'horaire à définir';
              updatedCtx.timeAsked = true;
              delete updatedCtx.missingField;
              resolved = true;
            } else if (text.trim()) {
              const clean = lowerVal.replace(/heures|heure/gi, 'h').replace(/\s+/g, '').trim();
              const match = clean.match(/(\d+)h(\d*)/) || clean.match(/(\d+):(\d*)/) || clean.match(/(\d+)/);
              if (match) {
                const hh = match[1].padStart(2, '0');
                const mm = (match[2] || '00').padEnd(2, '0');
                updatedCtx.time = `${hh}:${mm}`;
              } else {
                updatedCtx.time = text.trim();
              }
              updatedCtx.timeAsked = true;
              delete updatedCtx.missingField;
              resolved = true;
            }
          }
          
          if (resolved) {
            setVoiceContext(updatedCtx);
            setVoiceState('processing');
            await processVoiceContext(updatedCtx);
            return;
          } else {
            const actionVerbs = ['ajoute', 'ajouter', 'crée', 'creer', 'créer', 'cree', 'ouvre', 'montre', 'va', 'affiche', 'coche', 'décoche', 'supprime'];
            const firstWord = promptLower.split(/\s+/)[0];
            const isInterrupt = actionVerbs.some(v => firstWord.startsWith(v) || v.startsWith(firstWord)) || promptLower.includes('voyage');
            
            if (isInterrupt) {
              setVoiceContext(null);
              voiceActionStatusRef.current = 'waiting';
            } else {
              let question = "Je n'ai pas compris votre réponse.";
              if (voiceContext.missingField === 'budget') question = "Quel budget souhaitez-vous prévoir ?";
              else if (voiceContext.missingField === 'destination') question = "Pour quelle destination ?";
              else if (voiceContext.missingField === 'date') question = "Pour quelle date ?";
              else if (voiceContext.missingField === 'memberId') question = "Pour quel membre de la famille ?";
              else if (voiceContext.missingField === 'petId') question = "Pour quel animal ?";
              else if (voiceContext.missingField === 'vehicleId') question = "Pour quel véhicule ?";
              else if (voiceContext.missingField === 'day') question = "Pour quel jour de la semaine ?";
              else if (voiceContext.missingField === 'mealType') question = "Est-ce pour le midi ou pour le soir ?";
              else if (voiceContext.missingField === 'category') question = "Dans quelle catégorie / type ?";
              else if (voiceContext.missingField === 'amount') question = "Quel montant ?";
              else if (voiceContext.missingField === 'title') question = "Quel est l'intitulé ?";
              else if (voiceContext.missingField === 'time') question = "À quelle heure (ou dites 'pas encore') ?";
              
              setVoiceFeedback(question);
              closeVoiceAssistantAfterDelay(3000, 'ecoute');
              return;
            }
          }
        }
      } else {
        voiceActionStatusRef.current = 'waiting';
      }

      // 2. Split multi-action command
      const segments = splitVoiceCommand(text);
      const currentSegmentText = segments[0];
      
      text = currentSegmentText;
      promptLower = convertFrenchNumbersToDigits(text).toLowerCase().trim();

      // 3. Intercept Creation for Conversational Memory
      const creationCtx = detectCreationContext(promptLower, text);
      if (creationCtx) {
        intent = creationCtx.pendingAction;

        const missing = getMissingFields(creationCtx);
        const entities = getEntities(creationCtx);
        setVoiceDebugTrace({
          intention: intent,
          entities,
          missingFields: missing,
          contextActive: false,
          actionExecuted: `Intention de création détectée : ${intent}`
        });

        await processVoiceContext({
          ...creationCtx,
          remainingSegments: segments.slice(1),
          lastActiveTime: Date.now()
        });
        return;
      }

      const executeGroceryVoiceAction = async (actionResult: LooseValue) => {
        const client = getSupabaseClient();
        const activeMemberObj = members.find(m => m.id === activeMemberId);
        const activeMemberName = activeMemberObj?.name || 'Foyer';
        
        let localFeedback = "";
        let localSuccess = false;
        
        switch (actionResult.action) {
          case 'check': {
            const updatedIds = actionResult.items.map((i: LooseValue) => i.item.id);
            setGroceries(prev => prev.map(g => {
              if (updatedIds.includes(g.id)) {
                return { ...g, checked: true, inStock: true };
              }
              return g;
            }));
            
            if (foyer && client) {
              await client.from('groceries').update({ checked: true, in_stock: true }).eq('foyer_id', foyer.id).in('id', updatedIds);
            }
            
            localFeedback = `✓ Cochés dans la liste : ${actionResult.items.map((i: LooseValue) => i.item.name).join(', ')}`;
            localSuccess = true;
            break;
          }
          
          case 'uncheck': {
            const updatedIds = actionResult.items.map((i: LooseValue) => i.item.id);
            setGroceries(prev => prev.map(g => {
              if (updatedIds.includes(g.id)) {
                return { ...g, checked: false, inStock: true };
              }
              return g;
            }));
            
            if (foyer && client) {
              await client.from('groceries').update({ checked: false, in_stock: true }).eq('foyer_id', foyer.id).in('id', updatedIds);
            }
            
            localFeedback = `⟲ Décochés dans la liste : ${actionResult.items.map((i: LooseValue) => i.item.name).join(', ')}`;
            localSuccess = true;
            break;
          }
          
          case 'out_of_stock': {
            const updatedIds = actionResult.items.map((i: LooseValue) => i.item.id);
            setGroceries(prev => prev.map(g => {
              if (updatedIds.includes(g.id)) {
                return { ...g, checked: false, inStock: false };
              }
              return g;
            }));
            
            if (foyer && client) {
              await client.from('groceries').update({ checked: false, in_stock: false }).eq('foyer_id', foyer.id).in('id', updatedIds);
            }
            
            localFeedback = `❌ Rupture signalée pour : ${actionResult.items.map((i: LooseValue) => i.item.name).join(', ')}`;
            localSuccess = true;
            break;
          }
          
          case 'delete': {
            const updatedIds = actionResult.items.map((i: LooseValue) => i.item.id);
            setGroceries(prev => prev.filter(g => !updatedIds.includes(g.id)));
            
            if (foyer && client) {
              await client.from('groceries').delete().eq('foyer_id', foyer.id).in('id', updatedIds);
            }
            
            localFeedback = `🗑️ Supprimés de la liste : ${actionResult.items.map((i: LooseValue) => i.item.name).join(', ')}`;
            localSuccess = true;
            break;
          }
          
          case 'update_qty': {
            const { item } = actionResult.items[0];
            const newQty = actionResult.items[0].details.newQty;
            
            setGroceries(prev => prev.map(g => {
              if (g.id === item.id) {
                return { ...g, quantity: newQty };
              }
              return g;
            }));
            
            if (foyer && client) {
              await client.from('groceries').update({ quantity: newQty }).eq('foyer_id', foyer.id).eq('id', item.id);
            }
            
            localFeedback = `📋 Quantité de ${item.name} mise à jour : ${newQty}`;
            localSuccess = true;
            break;
          }
          
          case 'replace': {
            const { item } = actionResult.items[0];
            const replaceWithName = actionResult.items[0].details.replaceWith;
            
            // Delete old
            setGroceries(prev => prev.filter(g => g.id !== item.id));
            if (foyer && client) {
              await client.from('groceries').delete().eq('foyer_id', foyer.id).eq('id', item.id);
            }
            
            // Add new
            const parsedDetails = parseSmartNaturalSentence(replaceWithName, activeMemberName);
            let finalName = replaceWithName.charAt(0).toUpperCase() + replaceWithName.slice(1);
            let finalQty = item.quantity;
            let finalCategory = detectGroceryCategory(finalName);
            
            if (parsedDetails.length > 0) {
              finalName = parsedDetails[0].name;
              finalCategory = parsedDetails[0].category;
              if (parsedDetails[0].quantity && parsedDetails[0].quantity !== '1 pièces') {
                finalQty = parsedDetails[0].quantity;
              }
            }
            
            await handleAddGroceryItem(finalName, finalCategory, finalQty, item.meal, activeMemberName, !!item.isFavorite);
            
            localFeedback = `🔄 Remplacé ${item.name} par ${finalName} (${finalQty})`;
            localSuccess = true;
            break;
          }
          case 'summary_remaining': {
            setExternalGroceryFilter('pending');
            setShowGroceryPopup(true);
            setVoiceActive(false);
            setVoiceState('inactif');
            logVoiceCommandToSupabase("grocery_summary_remaining", true);
            return;
          }
          
          case 'count_remaining': {
            const remaining = groceries.filter(g => !g.checked);
            localFeedback = `📋 Il reste ${remaining.length} article(s) à acheter dans votre liste.`;
            localSuccess = true;
            break;
          }
          
          case 'summary_bought': {
            const bought = groceries.filter(g => g.checked);
            setExternalGroceryFilter('checked');
            if (bought.length === 0) {
              localFeedback = "🛒 Vous n'avez encore acheté aucun article de la liste.";
            } else {
              localFeedback = `✓ Déjà acheté(s) (${bought.length}) : ${bought.map(g => `${getGroceryItemEmoji(g.name)} ${g.name}`).join(', ')}`;
            }
            localSuccess = true;
            break;
          }
        }
        
        let redirectPayload = undefined;
        if (localSuccess) {
          let toastMessage = "Liste de courses mise à jour";
          let groceryFilter: 'all' | 'pending' | 'checked' = 'all';

          if (actionResult.action === 'summary_remaining' || actionResult.action === 'count_remaining') {
            toastMessage = "Filtre : À acheter";
            groceryFilter = 'pending';
          } else if (actionResult.action === 'summary_bought') {
            toastMessage = "Filtre : Déjà achetés";
            groceryFilter = 'checked';
          } else {
            const names = actionResult.items ? actionResult.items.map((i: LooseValue) => i.item.name).join(', ') : '';
            if (actionResult.action === 'check') {
              toastMessage = names ? `${names} acheté` : "Article coché";
            } else if (actionResult.action === 'uncheck') {
              toastMessage = names ? `${names} décoché` : "Article décoché";
            } else if (actionResult.action === 'delete') {
              toastMessage = names ? `${names} supprimé` : "Article supprimé";
            } else if (actionResult.action === 'update_qty') {
              toastMessage = names ? `Quantité de ${names} mise à jour` : "Quantité mise à jour";
            } else if (actionResult.action === 'replace') {
              const oldName = actionResult.items[0]?.item.name || '';
              const newName = actionResult.items[0]?.details.replaceWith || '';
              toastMessage = `Remplacé ${oldName} par ${newName}`;
            }
          }

          redirectPayload = {
            tab: 'menu',
            module: 'courses',
            groceryFilter,
            toastMessage
          };
        }

        setVoiceFeedback(localFeedback);
        logVoiceCommandToSupabase(`grocery_${actionResult.action}`, localSuccess);
        closeVoiceAssistantAfterDelay(2500, 'inactif', redirectPayload);
      };

      // Determine explicit financial amount first
      const explicitAmountRegexes = [
        /(\d+[.,]?\d*)\s*(?:euros?|€|dollars?|\$|eur|usd)/i,
        /(?:dépense|revenu|salaire|montant|payé|paye|coûte|coute|couté|somme)\s+(?:de\s+|de\s+l'|de\s+l’|d')?(\d+[.,]?\d*)/i,
        /^(?:ajoute|ajouter|enregistre|enregistrer|noter|note|mets|mettre|crée|creer|créer)?\s*(\d+[.,]?\d*)\b/i
      ];

      let amountVal = 0;
      let hasExplicitAmount = false;
      const hasBudgetKeyword = 
        /€|euros?|dépense|depense|payé|paye|payer|coût|coûte|coute|cout|facture|abonnement|prélèvement|prelevement|dollars?|\$|eur|usd/i.test(promptLower);

      if (hasBudgetKeyword) {
        for (const rx of explicitAmountRegexes) {
          const m = promptLower.match(rx);
          if (m) {
            amountVal = parseFloat(m[1].replace(',', '.'));
            hasExplicitAmount = true;
            break;
          }
        }
      }

      // Priorité Course si dans le module Courses
      const isInCoursesModule = activeTab === 'menu' && activeModule === 'courses';
      if (isInCoursesModule) {
        const actionResult = parseGroceryAction(promptLower, groceries);
        if (actionResult) {
          await executeGroceryVoiceAction(actionResult);
          return;
        }
      }

      // 0. DICtiONNAIRE DE NAVIGATION VOCALE GLOBALE
      if (!hasExplicitAmount) {
        const navVerbs = [
          'ouvre-moi les', 'ouvre-moi le', 'ouvre-moi la', 'ouvre-moi l\'', 'ouvre-moi',
          'ouvre moi les', 'ouvre moi le', 'ouvre moi la', 'ouvre moi l\'', 'ouvre moi',
          'ouvre les', 'ouvre le', 'ouvre la', 'ouvre l\'', 'ouvre',
          'montre-moi les', 'montre-moi le', 'montre-moi la', 'montre-moi l\'', 'montre-moi',
          'montre moi les', 'montre moi le', 'montre moi la', 'montre moi l\'', 'montre moi',
          'montre les', 'montre le', 'montre la', 'montre l\'', 'montre',
          'affiche-moi les', 'affiche-moi le', 'affiche-moi la', 'affiche-moi l\'', 'affiche-moi',
          'affiche moi les', 'affiche moi le', 'affiche moi la', 'affiche moi l\'', 'affiche moi',
          'affiche les', 'affiche le', 'affiche la', 'affiche l\'', 'affiche',
          'va dans les', 'va dans le', 'va dans la', 'va dans l\'', 'va dans',
          'va au', 'va à', 'va a',
          'lance les', 'lance le', 'lance la', 'lance l\'', 'lance',
          'accède à les', 'accède à le', 'accède à la', 'accède à l\'', 'accède à',
          'accéde a les', 'accéde a le', 'accéde a la', 'accéde a l\'', 'accéde a',
          'accede a les', 'accede a le', 'accede a la', 'accede a l\'', 'accede a'
        ];
        
        let targetText = promptLower;
        let isNavCommand = false;
        
        for (const verb of navVerbs) {
          if (promptLower.startsWith(verb + ' ')) {
            targetText = promptLower.slice(verb.length).trim();
            isNavCommand = true;
            break;
          } else if (promptLower === verb) {
            targetText = '';
            isNavCommand = true;
            break;
          }
        }
        
        const navModules = [
          { keywords: ['accueil', 'l\'accueil', 'ecran d\'accueil', 'le menu', 'le hub'], tab: 'accueil', module: '', message: '🏠 Navigation : J\'ouvre l\'accueil.' },
          { keywords: ['agenda', 'l\'agenda', 'calendrier', 'le calendrier', 'planning', 'le planning'], tab: 'agenda', module: '', message: '📅 Navigation : J\'ouvre l\'agenda.' },
          { keywords: ['budget', 'le budget', 'finances', 'les finances'], tab: 'budget', module: '', message: '💰 Navigation : J\'ouvre le budget familial.' },
          { keywords: ['dépenses', 'les dépenses', 'depenses', 'les depenses', 'les transactions', 'transactions', 'opérations', 'les opérations'], tab: 'budget', module: '', subView: 'transactions', message: '💸 Navigation : J\'ouvre vos dépenses de budget.' },
          { keywords: ['courses', 'les courses', 'liste de courses', 'la liste de courses', 'liste des courses', 'la liste des courses'], tab: 'menu', module: 'courses', message: '🛒 Navigation : J\'ouvre la liste de courses.' },
          { keywords: ['santé', 'la santé', 'sante', 'la sante', 'carnet de santé', 'carnet de sante', 'médical', 'medical'], tab: 'menu', module: 'sante', message: '🩺 Navigation : J\'ouvre le carnet de santé.' },
          { keywords: ['documents', 'les documents', 'coffre-fort', 'le coffre-fort', 'coffre fort', 'le coffre fort', 'papiers', 'les papiers'], tab: 'menu', module: 'documents', message: '📂 Navigation : J\'ouvre le coffre-fort administratif.' },
          { keywords: ['voyages', 'les voyages', 'voyage', 'le voyage', 'vacances', 'les vacances'], tab: 'menu', module: 'voyages', message: '✈️ Navigation : J\'ouvre l\'assistant voyage IA.' },
          { keywords: ['véhicules', 'les véhicules', 'vehicules', 'les vehicules', 'véhicule', 'vehicule', 'le véhicule', 'voiture', 'la voiture', 'voitures'], tab: 'menu', module: 'vehicules', message: '🚗 Navigation : J\'ouvre le carnet d\'entretien véhicule.' },
          { keywords: ['logement', 'le logement', 'maison', 'la maison', 'foyer', 'le foyer'], tab: 'menu', module: 'logement', message: '🏠 Navigation : J\'ouvre le module logement.' },
          { keywords: ['école', 'l\'école', 'ecole', 'l\'ecole', 'devoirs', 'les devoirs', 'tuteur', 'le tuteur'], tab: 'menu', module: 'ecole', message: '🎓 Navigation : J\'ouvre l\'école et devoirs.' },
          { keywords: ['démarches', 'les démarches', 'demarches', 'les demarches', 'administratif', 'les démarches administratives'], tab: 'menu', module: 'documents', message: '📂 Navigation : J\'ouvre vos démarches administratives.' },
          { keywords: ['animaux', 'les animaux', 'animal', 'chien', 'chat', 'les chats', 'les chiens'], tab: 'menu', module: 'animaux', message: '🐶 Navigation : J\'ouvre le carnet animaux.' },
          { keywords: ['argent de poche', 'l\'argent de poche', 'argent', 'l\'argent', 'tirelire', 'pocket money'], tab: 'menu', module: 'argent', message: '🪙 Navigation : J\'ouvre l\'argent de poche.' },
          { keywords: ['tâches', 'les tâches', 'taches', 'les taches', 'ménage', 'le ménage', 'choses à faire'], tab: 'menu', module: 'taches', message: '🧹 Navigation : J\'ouvre les tâches ménagères.' },
          { keywords: ['messagerie', 'la messagerie', 'messages', 'les messages', 'tchat', 'chat', 'discussions', 'discussion'], tab: 'menu', module: 'messagerie', message: '💬 Navigation : J\'ouvre la messagerie familiale.' },
          { keywords: ['souvenirs', 'les souvenirs', 'mur des moments', 'moments', 'le mur des moments', 'capsule', 'capsule temporelle'], tab: 'menu', module: 'capsule', message: '🔒 Navigation : J\'ouvre la capsule temporelle des souvenirs.' },
          { keywords: ['carte', 'la carte', 'carte familiale', 'la carte familiale', 'position', 'gps', 'itinéraires'], tab: 'menu', module: 'carte', message: '🧭 Navigation : J\'affiche la carte familiale.' },
          { keywords: ['contacts', 'les contacts', 'contacts importants', 'les contacts importants'], tab: 'menu', module: 'contacts', message: '📞 Navigation : J\'affiche les contacts importants.' },
          { keywords: ['paramètres', 'les paramètres', 'parametres', 'les parametres', 'réglages', 'reglages', 'settings'], tab: 'menu', module: 'settings', message: '⚙️ Navigation : J\'ouvre les paramètres.' }
        ];

        let matched = null;
        if (isNavCommand) {
          matched = navModules.find(m => m.keywords.some(kw => targetText === kw || targetText.includes(kw)));
        } else {
          matched = navModules.find(m => m.keywords.some(kw => promptLower === kw));
        }

        if (matched) {
          const targetKey = matched.module || matched.tab;
          setVoiceDebugTrace({
            intention: "navigation",
            entities: { tab: matched.tab, module: matched.module || 'Aucun' },
            missingFields: [],
            contextActive: false,
            actionExecuted: `Navigation vers : ${matched.tab}${matched.module ? ' / ' + matched.module : ''}`
          });

          const moduleNames: Record<string, string> = {
            accueil: 'Accueil',
            agenda: 'Agenda',
            budget: 'Budget',
            courses: 'Courses',
            sante: 'Santé',
            documents: 'Démarches',
            voyages: 'Voyages',
            vehicules: 'Véhicules',
            logement: 'Logement',
            ecole: 'École',
            animaux: 'Animaux',
            argent: 'Argent de poche',
            taches: 'Tâches',
            messagerie: 'Messagerie',
            capsule: 'Souvenirs',
            carte: 'Carte',
            contacts: 'Contacts',
            settings: 'Paramètres'
          };
          const displayLabel = moduleNames[targetKey] || targetKey;
          
          let toastMessage = `${displayLabel} ouvert`;
          if (displayLabel === 'Courses' || displayLabel === 'Démarches' || displayLabel === 'Tâches') {
            toastMessage = `${displayLabel} ouvertes`;
          } else if (displayLabel === 'Santé' || displayLabel === 'Messagerie' || displayLabel === 'Carte' || displayLabel === 'École') {
            toastMessage = `${displayLabel} ouverte`;
          } else if (displayLabel === 'Voyages' || displayLabel === 'Véhicules' || displayLabel === 'Animaux' || displayLabel === 'Souvenirs' || displayLabel === 'Contacts' || displayLabel === 'Paramètres') {
            toastMessage = `${displayLabel} ouverts`;
          }

          setVoiceFeedback(matched.message);
          logVoiceCommandToSupabase("navigation", true, { target_module: matched.module || matched.tab });

          closeVoiceAssistantAfterDelay(2500, 'inactif', {
            tab: matched.tab,
            module: matched.module,
            subView: matched.subView === 'transactions' ? { type: 'tab', tab: 'transactions' } : null,
            toastMessage
          });
          return;
        }
      }

      // Nouvelle couche : Actions vocales avancées sur éléments existants de courses
      if (!isInCoursesModule) {
        const actionResult = parseGroceryAction(promptLower, groceries);
        if (actionResult) {
          await executeGroceryVoiceAction(actionResult);
          return;
        }
      }

      // Helper check function for dictionary matches
      const hasWordMatch = (dict: string[], textToCheck: string) => {
        return dict.some(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(textToCheck);
        });
      };

      // Détection de création d'événement d'agenda / médical
      const startsWithAgendaAction = /ajoute|ajouter|planifie|planifier|creer|créer|crée|cree|programme|programmer/i.test(promptLower);
      const containsSanteDictWord = hasWordMatch(DICTIONARIES.sante, promptLower);
      const isEventCreation = startsWithAgendaAction && 
        (promptLower.includes('rendez-vous') || 
         promptLower.includes('rendez vous') || 
         promptLower.includes('rdv') || 
         promptLower.includes('événement') || 
         promptLower.includes('evenement') || 
         promptLower.includes('réunion') || 
         promptLower.includes('reunion') || 
         promptLower.includes('visite') || 
         promptLower.includes('médecin') || 
         promptLower.includes('medecin') || 
         promptLower.includes('docteur') || 
         promptLower.includes('dentiste') || 
         promptLower.includes('pédiatre') || 
         promptLower.includes('pediatre') || 
         promptLower.includes('ophtalmo') || 
         promptLower.includes('ostéo') || 
         promptLower.includes('osteo') || 
         promptLower.includes('vaccin') || 
         promptLower.includes('agenda') || 
         promptLower.includes('calendrier') ||
         containsSanteDictWord);

      if (isEventCreation && !hasExplicitAmount) {
        intent = "event_create";
        const agendaData = parseAgendaVoiceCommand(promptLower, text);
        const activeMemberObj = members.find(m => m.id === activeMemberId);
        const activeMemberName = activeMemberObj?.name || 'Famille';
        
        const newEvent = {
          title: agendaData.title,
          type: agendaData.type,
          dateTime: agendaData.dateTime,
          time: agendaData.time,
          memberId: activeMemberId || '',
          memberName: activeMemberName,
          location: '',
          description: 'Créé par commande vocale',
          done: false
        };

        await handleAddEvent(newEvent);
        
        feedback = `📅 ${agendaData.title} créé pour le ${agendaData.dateTime}${agendaData.timeLabel ? ' à ' + agendaData.time : ''}`;
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase(intent, true);
        
        const isHealth = agendaData.type === 'health';
        const targetTab = isHealth ? 'menu' : 'agenda';
        const targetModule = isHealth ? 'sante' : '';
        const toastText = `${agendaData.title} ${agendaData.dateLabel}${agendaData.timeLabel} créé`;
        
        closeVoiceAssistantAfterDelay(2500, 'inactif', {
          tab: targetTab,
          module: targetModule,
          toastMessage: toastText
        });
        return;
      }

      // CLASSIFY INTENT IN ORDER OF PRIORITY

      // 1. Courses (Grocery)
      const hasGroceryKeywords = 
        promptLower.includes('courses') || 
        promptLower.includes('liste') || 
        promptLower.includes('acheter') || 
        promptLower.includes('ajoute dans les courses') || 
        promptLower.includes('ajoute à la liste') || 
        promptLower.includes('ajoute au panier') || 
        promptLower.includes('panier') || 
        promptLower.includes('caddie') || 
        promptLower.includes('épicerie') || 
        promptLower.includes('supermarché') || 
        promptLower.includes('supermarche') ||
        promptLower.includes('course') ||
        promptLower.includes('achat') ||
        promptLower.includes('achats');

      const startsWithActionVerb = 
        promptLower.startsWith('ajoute') || 
        promptLower.startsWith('ajouter') || 
        promptLower.startsWith('mets') || 
        promptLower.startsWith('mettre') || 
        promptLower.startsWith('rajoute') || 
        promptLower.startsWith('rajouter') || 
        promptLower.startsWith('prépare') || 
        promptLower.startsWith('prepare') || 
        promptLower.startsWith('acheter') || 
        promptLower.startsWith('achète');

      const hasFoodKeywords = 
        promptLower.includes('lait') || 
        promptLower.includes('coca') || 
        promptLower.includes('tomate') || 
        promptLower.includes('tomates') || 
        promptLower.includes('pomme') || 
        promptLower.includes('pommes') || 
        promptLower.includes('banane') || 
        promptLower.includes('bananes') || 
        promptLower.includes('eau') || 
        promptLower.includes('oignon') || 
        promptLower.includes('oignons') || 
        promptLower.includes('pain') || 
        promptLower.includes('pâtes') || 
        promptLower.includes('beurre') || 
        promptLower.includes('croissant') || 
        promptLower.includes('fromage') || 
        promptLower.includes('yaourt') || 
        promptLower.includes('viande') || 
        promptLower.includes('poulet') || 
        promptLower.includes('soda') || 
        promptLower.includes('jus') || 
        promptLower.includes('fruits') || 
        promptLower.includes('légumes') || 
        promptLower.includes('legumes') || 
        promptLower.includes('nourriture') || 
        promptLower.includes('manger') ||
        promptLower.includes('chips') ||
        promptLower.includes('crème') ||
        promptLower.includes('creme') ||
        promptLower.includes('fraîche') ||
        promptLower.includes('fraiche') ||
        promptLower.includes('bouteille') ||
        promptLower.includes('riz') ||
        promptLower.includes('œuf') ||
        promptLower.includes('oeuf') ||
        promptLower.includes('pot') ||
        promptLower.includes('paquet');

      const isFinancialTrigger = 
        promptLower.includes('dépense') || 
        promptLower.includes('depense') || 
        promptLower.includes('revenu') || 
        promptLower.includes('salaire') || 
        promptLower.includes('virement') || 
        promptLower.includes('transfert') || 
        promptLower.includes('cagnotte') || 
        promptLower.includes('épargne') || 
        promptLower.includes('solde') || 
        promptLower.includes('abonnement');

      const hasGroceryDictWord = hasWordMatch(DICTIONARIES.courses, promptLower);
      const isGroceryIntent = 
        (hasGroceryKeywords && !isFinancialTrigger) ||
        (startsWithActionVerb && !hasExplicitAmount && !isFinancialTrigger) ||
        (hasFoodKeywords && !hasExplicitAmount && !isFinancialTrigger) ||
        (hasGroceryDictWord && startsWithActionVerb && !hasExplicitAmount && !isFinancialTrigger);

      if (isGroceryIntent) {
        intent = "grocery_add";
        const activeMemberObj = members.find(m => m.id === activeMemberId);
        const activeMemberName = activeMemberObj?.name || 'Foyer';
        let parsedItems = parseSmartNaturalSentence(text, activeMemberName);

        // Fallback if groceryParser couldn't structure it (e.g. "Coca")
        if (parsedItems.length === 0) {
          let cleanItem = textWithDigits
            .replace(/ajoute|ajouter|mets|mettre|rajoute|rajouter|achete|achète|acheter/gi, '')
            .replace(/dans les courses|dans la liste|au panier|à la liste/gi, '')
            .trim();
          if (cleanItem) {
            cleanItem = cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1);
            parsedItems = [{
              name: cleanItem,
              category: detectGroceryCategory(cleanItem),
              quantity: '1 pièces',
              checked: false,
              inStock: true,
              meal: undefined,
              addedBy: activeMemberName
            }];
          }
        }

        if (parsedItems.length > 0) {
          // Insertion séquentielle directe de chaque article
          for (let i = 0; i < parsedItems.length; i++) {
            const item = parsedItems[i];
            await handleAddGroceryItem(item.name, item.category, item.quantity, item.meal, item.addedBy, false);
          }
          feedback = `Ajouté à la liste de courses : ${parsedItems.map(item => item.name).join(', ')}`;
          setVoiceFeedback(feedback);
          logVoiceCommandToSupabase(intent, true);
          
          const toastMsg = parsedItems.length === 1 
            ? `${parsedItems[0].name} ajouté à la liste` 
            : `${parsedItems.map(item => item.name).join(', ')} ajoutés à la liste`;

          closeVoiceAssistantAfterDelay(2500, 'inactif', {
            tab: 'menu',
            module: 'courses',
            toastMessage: toastMsg
          });
        } else {
          feedback = "🤔 Je n'ai pas compris quel article ajouter à vos courses...";
          setVoiceFeedback(feedback);
          logVoiceCommandToSupabase(intent, false);
          closeVoiceAssistantAfterDelay(2500);
        }
        return;
      }

      // 2. Agenda
      const isAgendaIntent = 
        (promptLower.includes('agenda') || 
         promptLower.includes('planning') || 
         promptLower.includes('calendrier') || 
         promptLower.includes('évènement') || 
         promptLower.includes('evenement') || 
         promptLower.includes('rdv') || 
         promptLower.includes('rendez-vous') || 
         promptLower.includes('rendez vous') || 
         promptLower.includes('planifier') || 
         promptLower.includes('planifie') || 
         promptLower.includes('ajouter un événement') || 
         promptLower.includes('ajouter un evenement')) && 
        !hasExplicitAmount;

      if (isAgendaIntent) {
        setActiveTab('menu');
        setActiveModule('agenda');
        feedback = "📅 Navigation : J'ouvre l'Agenda Familial.";
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase("agenda_nav", true);
        closeVoiceAssistantAfterDelay(2500);
        return;
      }

      // 3. Santé
      const isSanteIntent = 
        promptLower.includes('médecin') || 
        promptLower.includes('medecin') || 
        promptLower.includes('docteur') || 
        promptLower.includes('vaccin') || 
        promptLower.includes('dentiste') || 
        promptLower.includes('pédiatre') || 
        promptLower.includes('pediatre') || 
        promptLower.includes('visite médicale') || 
        promptLower.includes('visite medicale') || 
        promptLower.includes('ordonnance') || 
        promptLower.includes('pharmacie') || 
        promptLower.includes('médicament') || 
        promptLower.includes('medicament') || 
        promptLower.includes('malade') || 
        promptLower.includes('santé') || 
        promptLower.includes('sante') || 
        promptLower.includes('ophtalmo') || 
        promptLower.includes('ostéo') || 
        promptLower.includes('osteo') ||
        containsSanteDictWord;

      if (isSanteIntent) {
        if (hasExplicitAmount) {
          // Fall through to transaction creation but open Santé module too
        } else {
          setActiveTab('menu');
          setActiveModule('sante');
          feedback = "🩺 Navigation : J'ouvre le Carnet de Santé.";
          setVoiceFeedback(feedback);
          logVoiceCommandToSupabase("sante_nav", true);
          closeVoiceAssistantAfterDelay(2500);
          return;
        }
      }

      // 4. École
      const isEcoleIntent = 
        promptLower.includes('devoir') || 
        promptLower.includes('devoirs') || 
        promptLower.includes('classe') || 
        promptLower.includes('cours') || 
        promptLower.includes('professeur') || 
        promptLower.includes('prof') || 
        promptLower.includes('tuteur') || 
        promptLower.includes('tuteur scolaire') || 
        promptLower.includes('école') || 
        promptLower.includes('ecole') || 
        promptLower.includes('cantine');

      if (isEcoleIntent && !hasExplicitAmount) {
        setActiveTab('menu');
        setActiveModule('devoirs');
        feedback = "🎓 Navigation : J'ouvre le Tuteur Scolaire IA.";
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase("ecole_nav", true);
        closeVoiceAssistantAfterDelay(2500);
        return;
      }

      // 5. Démarches
      const containsDemarchesDictWord = hasWordMatch(DICTIONARIES.demarches, promptLower);
      const isDemarchesIntent = 
        promptLower.includes('démarche') || 
        promptLower.includes('demarche') || 
        promptLower.includes('démarches') || 
        promptLower.includes('demarches') || 
        promptLower.includes('administratif') || 
        promptLower.includes('timbre fiscal') || 
        promptLower.includes('timbres fiscaux') || 
        promptLower.includes('passeport') || 
        promptLower.includes('visa') || 
        promptLower.includes('justificatif') || 
        promptLower.includes('impôts') || 
        promptLower.includes('impot') ||
        containsDemarchesDictWord;

      if (isDemarchesIntent && !hasExplicitAmount) {
        setActiveTab('menu');
        setActiveModule('documents');
        feedback = "📂 Navigation : J'ouvre vos Démarches Administratives.";
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase("demarches_nav", true);
        closeVoiceAssistantAfterDelay(2500);
        return;
      }

      // 6. Voyages
      const containsVoyagesDictWord = hasWordMatch(DICTIONARIES.voyages, promptLower);
      const isVoyagesIntent = 
        promptLower.includes('voyage') || 
        promptLower.includes('voyages') || 
        promptLower.includes('vacance') || 
        promptLower.includes('vacances') || 
        promptLower.includes('bagage') || 
        promptLower.includes('bagages') || 
        promptLower.includes('vol') || 
        promptLower.includes('avion') || 
        promptLower.includes('hôtel') || 
        promptLower.includes('hotel') || 
        promptLower.includes('airbnb') || 
        promptLower.includes('valise') ||
        containsVoyagesDictWord;

      if (isVoyagesIntent && !hasExplicitAmount) {
        setActiveTab('menu');
        setActiveModule('voyages');
        feedback = "✈️ Navigation : Je lance l'Assistant Voyage IA.";
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase("voyages_nav", true);
        closeVoiceAssistantAfterDelay(2500);
        return;
      }

      // 7. Véhicules
      const isVehiculesIntent = 
        promptLower.includes('essence') || 
        promptLower.includes('carburant') || 
        promptLower.includes('diesel') || 
        promptLower.includes('gazole') || 
        promptLower.includes('peage') || 
        promptLower.includes('péage') || 
        promptLower.includes('vidange') || 
        promptLower.includes('pneu') || 
        promptLower.includes('pneus') || 
        promptLower.includes('garage') || 
        promptLower.includes('voiture') || 
        promptLower.includes('véhicule') || 
        promptLower.includes('vehicule') || 
        promptLower.includes('entretien voiture');

      if (isVehiculesIntent && !hasExplicitAmount) {
        setActiveTab('menu');
        setActiveModule('vehicule');
        feedback = "🚗 Navigation : J'ouvre le carnet d'entretien Véhicule.";
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase("vehicules_nav", true);
        closeVoiceAssistantAfterDelay(2500);
        return;
      }

      // 8. Documents
      const isDocumentsIntent = 
        promptLower.includes('coffre') || 
        promptLower.includes('document') || 
        promptLower.includes('documents') || 
        promptLower.includes('papier') || 
        promptLower.includes('papiers') || 
        promptLower.includes('cni') || 
        promptLower.includes('carte d\'identité') || 
        promptLower.includes('carte identite');

      if (isDocumentsIntent && !hasExplicitAmount) {
        setActiveTab('menu');
        setActiveModule('documents');
        feedback = "📂 Navigation : J'ouvre le Coffre-Fort administratif.";
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase("documents_nav", true);
        closeVoiceAssistantAfterDelay(2500);
        return;
      }

      // 9. Messagerie
      const isMessagerieIntent = 
        promptLower.includes('messagerie') || 
        promptLower.includes('discussion') || 
        promptLower.includes('tchat') || 
        promptLower.includes('chat') || 
        promptLower.includes('parle') || 
        promptLower.includes('discuter') || 
        promptLower.includes('message') || 
        promptLower.includes('envoyer');

      if (isMessagerieIntent && !hasExplicitAmount) {
        setActiveTab('menu');
        setActiveModule('messagerie');
        feedback = "💬 Navigation : J'ouvre la messagerie familiale.";
        setVoiceFeedback(feedback);
        logVoiceCommandToSupabase("messagerie_nav", true);
        closeVoiceAssistantAfterDelay(2500);
        return;
      }

      // 10. Budget / Transactions (requires explicit amount or financial trigger)
      if (hasExplicitAmount && amountVal > 0) {
        // 10a. Account Transfer Intent
        if (promptLower.includes('transférer') || promptLower.includes('transferer') || promptLower.includes('virement') || promptLower.includes('transfert')) {
          intent = "account_transfer";
          const srcMatch = accounts.find(a => promptLower.includes(a.name.toLowerCase()));
          const destMatch = accounts.find(a => promptLower.includes(a.name.toLowerCase()) && a.id !== srcMatch?.id);
          
          if (srcMatch && destMatch && amountVal > 0) {
            const client = getSupabaseClient();
            if (client && foyer?.id) {
              try {
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const dateStr = now.toISOString().split('T')[0];

                await client.from('transactions').insert({
                  id: crypto.randomUUID(),
                  foyer_id: foyer.id,
                  amount: amountVal,
                  type: 'expense',
                  category: 'Transfert',
                  account_id: srcMatch.id,
                  date: dateStr,
                  title: `Virement vers ${destMatch.name} (Vocal)`,
                  member_id: activeMemberId,
                  member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
                  comment: serializeTransactionComment('Généré par commande vocale', {
                    moduleSource: 'budget',
                    entryTime: timeStr,
                    entryDate: dateStr
                  })
                });

                await client.from('transactions').insert({
                  id: crypto.randomUUID(),
                  foyer_id: foyer.id,
                  amount: amountVal,
                  type: 'income',
                  category: 'Transfert',
                  account_id: destMatch.id,
                  date: dateStr,
                  title: `Virement reçu de ${srcMatch.name} (Vocal)`,
                  member_id: activeMemberId,
                  member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
                  comment: serializeTransactionComment('Généré par commande vocale', {
                    moduleSource: 'budget',
                    entryTime: timeStr,
                    entryDate: dateStr
                  })
                });

                await client.from('accounts').update({ balance: Math.max(0, srcMatch.balance - amountVal) }).eq('id', srcMatch.id);
                await client.from('accounts').update({ balance: destMatch.balance + amountVal }).eq('id', destMatch.id);

                feedback = `💸 Virement de ${amountVal}€ effectué de ${srcMatch.name} vers ${destMatch.name} !`;
                isSuccess = true;
              } catch (e: LooseValue) {
                feedback = `❌ Échec du virement : ${e.message}`;
              }
            }
          } else {
            feedback = "🤔 Comptes non identifiés pour le virement.";
          }
          
          setVoiceFeedback(feedback);
          logVoiceCommandToSupabase(intent, isSuccess);
          closeVoiceAssistantAfterDelay(2500, 'inactif', isSuccess ? {
            tab: 'budget',
            module: '',
            subView: { type: 'tab', tab: 'transactions' },
            toastMessage: feedback.replace('💸 ', '')
          } : undefined);
          return;
        }

        // 10b. Subscription Create Intent
        if (promptLower.includes('abonnement') || promptLower.includes('netflix') || promptLower.includes('spotify') || promptLower.includes('mensuel')) {
          intent = "abonnement_create";
          const client = getSupabaseClient();
          if (client && foyer?.id && amountVal > 0) {
            try {
              let name = 'Abonnement vocal';
              if (promptLower.includes('netflix')) name = 'Netflix';
              else if (promptLower.includes('spotify')) name = 'Spotify';
              else if (promptLower.includes('disney')) name = 'Disney+';
              else if (promptLower.includes('amazon')) name = 'Amazon Prime';
              else if (promptLower.includes('canal')) name = 'Canal+';

              await client.from('abonnements').insert({
                id: crypto.randomUUID(),
                foyer_id: foyer.id,
                name,
                amount: amountVal,
                period: 'monthly',
                next_billing_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
                category: 'Loisirs'
              });
              feedback = `🍿 Abonnement ${name} de ${amountVal}€/mois enregistré !`;
              isSuccess = true;
            } catch (e: LooseValue) {
              feedback = `❌ Échec : ${e.message}`;
            }
          }
          
          setVoiceFeedback(feedback);
          logVoiceCommandToSupabase(intent, isSuccess);
          closeVoiceAssistantAfterDelay(2500, 'inactif', isSuccess ? {
            tab: 'budget',
            module: '',
            subView: { type: 'tab', tab: 'abonnements' },
            toastMessage: `Abonnement ${name} enregistré`
          } : undefined);
          return;
        }

        // 10c. Saving Goal Contribution Intent
        if (promptLower.includes('cagnotte') || promptLower.includes('épargner') || promptLower.includes('contribuer') || promptLower.includes('retirer')) {
          intent = "saving_contribution";
          const isAdd = !promptLower.includes('retirer');
          const goalMatch = savingGoals.find(g => promptLower.includes(g.title.toLowerCase()) || (g.category && promptLower.includes(g.category.toLowerCase())));
          
          if (goalMatch && amountVal > 0) {
            const client = getSupabaseClient();
            if (client && foyer?.id) {
              try {
                const change = isAdd ? amountVal : -amountVal;
                const newCurrent = Math.max(0, goalMatch.currentAmount + change);
                const contribLog = {
                  id: crypto.randomUUID(),
                  date: new Date().toISOString(),
                  memberId: activeMemberId,
                  memberName: members.find(m => m.id === activeMemberId)?.name || 'Parent',
                  amount: change
                };
                const updatedContribs = [...(goalMatch.contributions || []), contribLog];

                await client.from('saving_goals').update({
                  current_amount: newCurrent,
                  contributions: JSON.stringify(updatedContribs)
                }).eq('id', goalMatch.id);

                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const dateStr = now.toISOString().split('T')[0];

                await client.from('transactions').insert({
                  id: crypto.randomUUID(),
                  foyer_id: foyer.id,
                  title: isAdd ? `Versement : ${goalMatch.title}` : `Retrait : ${goalMatch.title}`,
                  amount: amountVal,
                  type: isAdd ? 'expense' : 'income',
                  category: 'Épargne',
                  date: dateStr,
                  member_id: activeMemberId,
                  member_name: members.find(m => m.id === activeMemberId)?.name || 'Système',
                  comment: serializeTransactionComment('Généré par commande vocale', {
                    moduleSource: 'budget',
                    entryTime: timeStr,
                    entryDate: dateStr
                  })
                });

                feedback = `🎯 Cagnotte "${goalMatch.title}" : ${isAdd ? 'Ajout' : 'Retrait'} de ${amountVal}€ effectué !`;
                isSuccess = true;
              } catch (e: LooseValue) {
                feedback = `❌ Échec : ${e.message}`;
              }
            }
          } else {
            feedback = "🤔 Cagnotte non identifiée. Spécifiez le titre (ex: voyage).";
          }

          setVoiceFeedback(feedback);
          logVoiceCommandToSupabase(intent, isSuccess);
          closeVoiceAssistantAfterDelay(2500, 'inactif', (isSuccess && goalMatch) ? {
            tab: 'budget',
            module: '',
            subView: { type: 'tab', tab: 'cagnottes' },
            toastMessage: `Cagnotte ${goalMatch.title} mise à jour`
          } : undefined);
          return;
        }

        // 10d. General Transactions parser (fallback expense / income)
        let type: 'expense' | 'income' = 'expense';
        if (promptLower.includes('salaire') || promptLower.includes('revenu') || promptLower.includes('reçu') || promptLower.includes('gagné') || promptLower.includes('recu') || promptLower.includes('gagne')) {
          type = 'income';
        }
        intent = type === 'income' ? 'transaction_income' : 'transaction_expense';

        let currencyStr = 'EUR';
        if (promptLower.includes('dollar') || promptLower.includes('$')) currencyStr = 'USD';

        let recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'quarterly' | 'semiannually' | 'custom' = 'none';
        const recurrenceInterval = 1;
        if (/mensuel|mensuelle|tous les mois|chaque mois/i.test(promptLower)) {
          recurrenceType = 'monthly';
        } else if (/quotidien|quotidienne|tous les jours|chaque jour/i.test(promptLower)) {
          recurrenceType = 'daily';
        } else if (/hebdomadaire|toutes les semaines|chaque semaine|chaque samedi|chaque (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(promptLower)) {
          recurrenceType = 'weekly';
        } else if (/trimestriel|tous les trimestres/i.test(promptLower)) {
          recurrenceType = 'quarterly';
        } else if (/annuel|annuelle|tous les ans|chaque année|chaque annee/i.test(promptLower)) {
          recurrenceType = 'yearly';
        }

        const matchedMember = members.find(m => promptLower.includes(m.name.toLowerCase()));
        const matchedAccount = accounts.find(a => promptLower.includes(a.name.toLowerCase()));

        let title = 'Achat rapide';
        let pourKeyword = '';
        const pourMatch = promptLower.match(/(?:^|\s)(?:\d+[.,]?\d*)\s*(?:euros?|€|eur|dollars?|\$)?\s+(?:pour\s+l'|pour\s+l’|pour\s+le\s+|pour\s+la\s+|pour\s+les\s+|pour\s+|de\s+la\s+|de\s+l'|de\s+l’|de\s+|du\s+|des\s+|d'|d’|le\s+|la\s+|les\s+|l'|l’|en\s+|a\s+|à\s+)?([a-z0-9éèàùçâêîôûäëïöü’'\s-]+)/i);
        if (pourMatch) {
          const rawPour = pourMatch[1].trim();
          pourKeyword = cleanLabel(rawPour);
          title = pourKeyword.charAt(0).toUpperCase() + pourKeyword.slice(1);
        } else {
          const amountRegexWithEuro = /(\d+[.,]?\d*)\s*(?:euros?|€|eur)/i;
          let cleanTitle = textWithDigits.replace(/ajoute|ajouter|enregistre|enregistrer|noter|note|mets|mettre|dépense|depense|pour/gi, '').trim();
          cleanTitle = cleanTitle.replace(amountRegexWithEuro, '').replace(/(\d+[.,]?\d*)/, '').trim();
          cleanTitle = cleanTitle.replace(/tous les mois|chaque mois|mensuel|mensuelle|tous les jours|chaque jour|quotidien|quotidienne|chaque semaine|toutes les semaines|hebdomadaire|chaque (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)|chaque samedi|tous les ans|chaque année|chaque annee/gi, '').trim();
          if (matchedMember) {
            const memberRegex = new RegExp(`\\b${matchedMember.name}\\b`, 'gi');
            cleanTitle = cleanTitle.replace(memberRegex, '').trim();
          }
          cleanTitle = cleanLabel(cleanTitle);
          if (cleanTitle) {
            title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
          }
        }

        let matches: LooseValue[] = [];
        
        // Dynamic mapping first
        const dynamicMapping = getDynamicVoiceMapping();
        const sortedKeys = Object.keys(dynamicMapping).sort((a, b) => b.length - a.length);
        
        let dynamicMatch = null;
        for (const key of sortedKeys) {
          if (promptLower.includes(key)) {
            dynamicMatch = dynamicMapping[key];
            break;
          }
        }

        if (dynamicMatch) {
          matches.push({
            keywords: [],
            category: dynamicMatch.category,
            subCategory: dynamicMatch.subCategory,
            moduleSource: dynamicMatch.moduleSource,
            label: `💸 ${dynamicMatch.category}`
          });
        } else {
          // Standard matches lookup
          matches = keywordRules.filter(rule => 
            rule.keywords.some(kw => promptLower.includes(kw))
          ).map(r => ({ ...r, label: `💸 ${r.category}` }));
          
          if (matches.length === 0) {
            const searchMatch = findCategoryAndSubcategory(promptLower, title, getMergedCategories(), transactions);
            if (searchMatch) {
              matches.push({
                keywords: [],
                category: searchMatch.category,
                subCategory: searchMatch.subCategory,
                moduleSource: searchMatch.moduleSource,
                label: `💸 ${searchMatch.category}`
              });
            } else {
              matches.push({
                keywords: [],
                category: 'Autres',
                subCategory: 'Divers',
                moduleSource: 'budget',
                label: '💸 Autres'
              });
            }
          }
        }

        const parsedTxData = {
          amount: amountVal,
          type,
          category: 'Autres',
          subCategory: 'Divers',
          moduleSource: 'budget',
          date: new Date().toISOString().split('T')[0],
          title: title,
          memberId: matchedMember?.id || activeMemberId || null,
          memberName: matchedMember?.name || members.find(m => m.id === activeMemberId)?.name || 'Famille',
          accountId: matchedAccount?.id || null,
          recurrence: recurrenceType,
          recurrenceInterval,
          startDate: new Date().toISOString().split('T')[0],
          nextOccurrence: new Date().toISOString().split('T')[0],
          currency: currencyStr,
          intent,
          isVoice: true
        };

        // DÉTECTION DU VOYAGE CIBLE
        let travelId: string | null = null;
        let matchingTravels: LooseValue[] = [];
        let travelNameFound = '';
        let requiresTravelResolution = false;

        const travelMatch = promptLower.match(/(?:pour le|du|au|lié au|lié le|voyageant au)?\s*voyage\s+([a-z0-9éèàùçâêîôûäëïöü-]+)/i);
        if (travelMatch) {
          travelNameFound = travelMatch[1].trim();
          const searchDest = travelNameFound.toLowerCase();
          matchingTravels = trips.filter(t => t.destination.toLowerCase().includes(searchDest) || searchDest.includes(t.destination.toLowerCase()));
          
          if (matchingTravels.length === 1) {
            travelId = matchingTravels[0].id;
          } else {
            requiresTravelResolution = true;
          }
        } else if (lastCreatedTrip) {
          const hasTravelKeywords = /voyage|vacances|billet|vol|hôtel|hotel|airbnb/i.test(promptLower);
          if (hasTravelKeywords) {
            travelId = lastCreatedTrip.id;
            travelNameFound = lastCreatedTrip.destination;
            parsedTxData.category = 'Voyages';
            parsedTxData.moduleSource = 'voyages';
          }
        }

        // Si la résolution de voyage est requise ou si aucun voyage n'a été trouvé mais mentionné :
        if (travelMatch && (requiresTravelResolution || matchingTravels.length === 0)) {
          const choices: { id: string; destination: string; label: string; action: 'link' | 'create' | 'global' }[] = [];
          
          if (matchingTravels.length > 1) {
            matchingTravels.forEach(t => {
              choices.push({ id: t.id, destination: t.destination, label: `✈️ Lier au voyage ${t.destination}`, action: 'link' });
            });
          }
          
          choices.push({ id: 'create', destination: travelNameFound, label: `➕ Créer le voyage "${travelNameFound.charAt(0).toUpperCase() + travelNameFound.slice(1)}"`, action: 'create' });
          choices.push({ id: 'global', destination: travelNameFound, label: `💸 Dépense sans lier à un voyage`, action: 'global' });
          
          setPendingVoiceCommandData({
            ...parsedTxData,
            travelNameFound
          });
          
          setAmbiguousTravelChoices(choices);
          setVoiceAmbiguousTravel(true);
          setVoiceTranscript(`"${text}"`);
          setVoiceFeedback("Plusieurs voyages ou aucun voyage ne correspond. Que voulez-vous faire ?");
          setVoiceState('confirmation');
          return;
        }

        if (travelId || matches.length >= 1) {
          let categoryVal = 'Autres';
          let subCategoryVal = 'Divers';
          let moduleSourceVal = 'budget';
          let titleVal = title;

          if (travelId) {
          categoryVal = 'Voyages';
          moduleSourceVal = 'voyages';
          
          let deducedSub = 'Repas';
          if (/billet|vol|train|avion|transport/i.test(promptLower)) deducedSub = 'Billets';
          else if (/hotel|hôtel|hebergement|hébergement|airbnb|booking/i.test(promptLower)) deducedSub = 'Hôtel';
          else if (/activité|activite|visite|excursion|loisir/i.test(promptLower)) deducedSub = 'Activités';
          else if (/restaurant|resto|manger|repas/i.test(promptLower)) deducedSub = 'Repas';
          else deducedSub = 'Divers';
          
          subCategoryVal = deducedSub;
          titleVal = title === 'Achat rapide' ? `Voyage : ${deducedSub}` : title;
        } else if (matches.length >= 1) {
          const choice = matches[0];
          categoryVal = choice.category;
          subCategoryVal = choice.subCategory;
          moduleSourceVal = choice.moduleSource;
          titleVal = title === 'Achat rapide' ? `${choice.label.split(' ')[1] || 'Dépense'} ${choice.subCategory}` : title;
        }

        const finalTx = {
          ...parsedTxData,
          moduleSource: moduleSourceVal,
          category: categoryVal,
          subCategory: subCategoryVal,
          title: titleVal,
          travelId: travelId || undefined,
          travel_id: travelId || undefined
        };

        await handleAddTransaction(finalTx);

        setVoiceDebugTrace({
          intention: "create_transaction",
          entities: { amount: finalTx.amount, title: finalTx.title, category: finalTx.category, subCategory: finalTx.subCategory },
          missingFields: [],
          contextActive: false,
          actionExecuted: `Transaction créée immédiatement : ${finalTx.category} > ${finalTx.subCategory}`
        });

          if (finalTx.moduleSource === 'argent_de_poche' && finalTx.memberId) {
            setPocketMoney(prev => prev.map(child => {
              if (child.id === finalTx.memberId) {
                const newBal = child.balance + (type === 'income' ? finalTx.amount : -finalTx.amount);
                const client = getSupabaseClient();
                if (client) {
                  client.from('pocket_money').update({ balance: newBal }).eq('id', child.id);
                }
                return { ...child, balance: newBal };
              }
              return child;
            }));
          }

          setVoiceDebugInfo({
            phrase: text,
            type: type === 'expense' ? 'Dépense' : 'Revenu',
            amount: `${amountVal}€`,
            category: finalTx.category,
            subCategory: finalTx.subCategory,
            module: finalTx.moduleSource === 'budget' ? 'Budget' : (finalTx.moduleSource === 'sante' ? 'Santé' : finalTx.moduleSource === 'vehicules' ? 'Véhicules' : finalTx.moduleSource === 'logement' ? 'Logement' : finalTx.moduleSource === 'ecole' ? 'École' : finalTx.moduleSource === 'documents' ? 'Démarches' : finalTx.moduleSource === 'courses' ? 'Courses' : finalTx.moduleSource === 'voyages' ? 'Voyages' : finalTx.moduleSource === 'animaux' ? 'Animaux' : finalTx.moduleSource === 'argent_de_poche' ? 'Argent de poche' : finalTx.moduleSource),
            recurrence: recurrenceType !== 'none' ? (recurrenceType === 'monthly' ? 'Mensuelle' : recurrenceType === 'weekly' ? 'Hebdomadaire' : recurrenceType === 'daily' ? 'Quotidienne' : recurrenceType === 'yearly' ? 'Annuelle' : recurrenceType) : undefined,
            member: matchedMember ? matchedMember.name : undefined
          });

          setVoiceTransactionAdded({
            type: finalTx.type as LooseValue,
            amount: finalTx.amount,
            category: finalTx.category,
            subCategory: finalTx.subCategory || undefined,
            accountName: accounts.find(a => a.id === finalTx.accountId)?.name || 'Principal'
          });

          // Trouver le label du module pour le feedback
          const moduleLabels: Record<string, string> = {
            budget: 'Budget familial',
            sante: 'Carnet de Santé',
            vehicules: 'Entretien Véhicule',
            logement: 'Logement',
            ecole: 'École & Devoirs',
            documents: 'Coffre-fort administratif',
            courses: 'Courses',
            voyages: 'Voyages',
            animaux: 'Animaux',
            argent_de_poche: 'Argent de poche'
          };
          const modLabel = moduleLabels[finalTx.moduleSource] || finalTx.moduleSource;

          feedback = `💰 Transaction "${finalTx.title}" de ${amountVal}€ enregistrée dans le module ${modLabel}.`;
          isSuccess = true;
          
          let targetTab = 'budget';
          let targetModule = '';
          let targetSubView = undefined;
          
          if (finalTx.moduleSource === 'sante') {
            targetTab = 'menu';
            targetModule = 'sante';
          } else if (finalTx.moduleSource === 'vehicules') {
            targetTab = 'menu';
            targetModule = 'vehicules';
          } else if (finalTx.moduleSource === 'ecole') {
            targetTab = 'menu';
            targetModule = 'ecole';
          } else if (finalTx.moduleSource === 'documents') {
            targetTab = 'menu';
            targetModule = 'documents';
          } else if (finalTx.moduleSource === 'courses') {
            targetTab = 'menu';
            targetModule = 'courses';
          } else if (finalTx.moduleSource === 'voyages') {
            targetTab = 'menu';
            targetModule = 'voyages';
          } else if (finalTx.moduleSource === 'argent') {
            targetTab = 'menu';
            targetModule = 'argent';
          } else {
            targetTab = 'budget';
            targetModule = '';
            targetSubView = { type: 'tab', tab: 'transactions' };
          }

          let toastMessage = "";
          if (finalTx.moduleSource === 'voyages') {
            const destLabel = matchingTravels[0]?.destination || travelNameFound || 'Maroc';
            const capitalizedDest = destLabel.charAt(0).toUpperCase() + destLabel.slice(1);
            toastMessage = `Voyage ${capitalizedDest} mis à jour`;
          } else {
            const txTypeWord = finalTx.type === 'expense' ? 'Dépense' : 'Revenu';
            const txSuffix = finalTx.type === 'expense' ? 'ajoutée' : 'ajouté';
            toastMessage = `${txTypeWord} ${finalTx.title} ${txSuffix}`;
          }

          setVoiceFeedback(feedback);
          logVoiceCommandToSupabase(intent, isSuccess);
          closeVoiceAssistantAfterDelay(2500, 'inactif', {
            tab: targetTab,
            module: targetModule,
            subView: targetSubView,
            toastMessage
          });
          return;
        } else {
          const allCandidates = [
            { moduleSource: 'courses', category: 'Alimentation', subCategory: 'Supermarché', label: '🛒 Courses' },
            { moduleSource: 'sante', category: 'Santé', subCategory: 'Médecin', label: '🩺 Santé' },
            { moduleSource: 'budget', category: 'Transport', subCategory: 'Taxi', label: '🚗 Transport' },
            { moduleSource: 'budget', category: 'Autres', subCategory: 'Divers', label: '✨ Autre' }
          ];

          setVoiceDebugTrace({
            intention: "create_transaction",
            entities: { amount: parsedTxData.amount, title: parsedTxData.title },
            missingFields: ['category'],
            contextActive: false,
            actionExecuted: "Demande de clarification : Choix de la catégorie"
          });

          setPendingVoiceCommandData(parsedTxData);
          setVoiceAmbiguous(true);
          setAmbiguousChoices(allCandidates);
          setVoiceTranscript(`"${text}"`);
          setVoiceFeedback("À quoi correspond cette dépense ?");
          setVoiceState('confirmation');
          return;
        }
      }

      const familyAssistantIntent = detectFamilyAssistantIntent(text);
      if (familyAssistantIntent) {
        const assistantResult = buildFamilyAssistantResponse(familyAssistantIntent, {
          activeMemberId,
          members,
          events: unifiedEvents,
          tasks,
          groceries,
          transactions,
          documents,
          trips,
          dishes,
          schoolTasks,
          alerts,
          chatGroups,
          chatMessages
        });

        setVoiceDebugTrace({
          intention: `family_assistant_${assistantResult.intent}`,
          entities: assistantResult.target
            ? { tab: assistantResult.target.tab, module: assistantResult.target.module }
            : {},
          missingFields: [],
          contextActive: false,
          actionExecuted: assistantResult.feedback
        });
        setVoiceFeedback(`✨ ${assistantResult.feedback}`);
        logVoiceCommandToSupabase(`family_assistant_${assistantResult.intent}`, true);
        closeVoiceAssistantAfterDelay(assistantResult.target ? 3500 : 3000, 'inactif', assistantResult.target);
        return;
      }

      let fallbackTarget: { tab: string; module: string; toastMessage: string } | null = null;

      if (promptLower.includes('carte') || promptLower.includes('gps') || promptLower.includes('position') || promptLower.includes('itiné')) {
        feedback = "🧭 Navigation : J'affiche la Carte Familiale.";
        fallbackTarget = { tab: 'menu', module: 'carte', toastMessage: 'Carte ouverte' };
      } 
      else if (promptLower.includes('agenda') || promptLower.includes('planning') || promptLower.includes('calendrier') || promptLower.includes('évènement') || promptLower.includes('rdv') || promptLower.includes('rendez')) {
        feedback = "📅 Navigation : J'ouvre l'Agenda Familial.";
        fallbackTarget = { tab: 'agenda', module: '', toastMessage: 'Agenda ouvert' };
      } 
      else if (promptLower.includes('finance') || promptLower.includes('budget') || promptLower.includes('dépense') || promptLower.includes('argent') || promptLower.includes('cagnotte') || promptLower.includes('solde')) {
        feedback = "💰 Navigation : J'ouvre le budget familial.";
        fallbackTarget = { tab: 'budget', module: '', toastMessage: 'Budget ouvert' };
      } 
      else if (promptLower.includes('course') || promptLower.includes('caddie') || promptLower.includes('achat') || promptLower.includes('épicerie') || promptLower.includes('supermar')) {
        feedback = "🛒 Navigation : J'affiche la liste de courses partagée (Éco-Chef).";
        fallbackTarget = { tab: 'menu', module: 'courses', toastMessage: 'Courses ouvertes' };
      } 
      else if (promptLower.includes('capsule') || promptLower.includes('temps') || promptLower.includes('souvenir') || promptLower.includes('moment')) {
        feedback = "🔒 Navigation : J'ouvre la Capsule Temporelle de vos souvenirs.";
        fallbackTarget = { tab: 'menu', module: 'capsule', toastMessage: 'Souvenirs ouverts' };
      } 
      else if (
        promptLower.includes('peacemaker') ||
        promptLower.includes('médiateur') ||
        promptLower.includes('mediateur') ||
        promptLower.includes('médiation') ||
        promptLower.includes('mediation') ||
        promptLower.includes('dispute') ||
        promptLower.includes('conflit') ||
        promptLower.includes('arbitre') ||
        promptLower.includes('juge') ||
        promptLower.includes('réconcil') ||
        promptLower.includes('reconcil')
      ) {
        feedback = "⚖️ Navigation : J'ouvre le Médiateur familial pour apaiser le conflit.";
        fallbackTarget = { tab: 'menu', module: 'peacemaker', toastMessage: 'Médiateur familial ouvert' };
      } 
      else if (promptLower.includes('simul') || promptLower.includes('mavie') || promptLower.includes('vie')) {
        feedback = "🎮 Navigation : Je lance le simulateur d'éducation MaVie.";
        fallbackTarget = { tab: 'menu', module: 'mavie', toastMessage: 'MaVie ouvert' };
      } 
      else if (promptLower.includes('conseil') || promptLower.includes('vote') || promptLower.includes('décision') || promptLower.includes('scrutin')) {
        feedback = "🗳️ Navigation : J'ouvre le Conseil de Famille.";
        fallbackTarget = { tab: 'menu', module: 'conseil', toastMessage: 'Conseil de Famille ouvert' };
      } 
      else if (promptLower.includes('messagerie') || promptLower.includes('discussion') || promptLower.includes('tchat') || promptLower.includes('chat') || promptLower.includes('parle')) {
        feedback = "💬 Navigation : J'affiche la messagerie familiale.";
        fallbackTarget = { tab: 'menu', module: 'messagerie', toastMessage: 'Messagerie ouverte' };
      }
      else if (promptLower.includes('devoir') || promptLower.includes('tuteur') || promptLower.includes('école') || promptLower.includes('prof')) {
        feedback = "🎓 Navigation : J'ouvre le Tuteur Scolaire IA.";
        fallbackTarget = { tab: 'menu', module: 'devoirs', toastMessage: 'École ouverte' };
      }
      else if (promptLower.includes('coffre') || promptLower.includes('document') || promptLower.includes('papier') || promptLower.includes('cni')) {
        feedback = "📂 Navigation : J'ouvre le Coffre-Fort administratif.";
        fallbackTarget = { tab: 'menu', module: 'documents', toastMessage: 'Démarches ouvertes' };
      }
      else if (promptLower.includes('voyage') || promptLower.includes('vacance') || promptLower.includes('bagage')) {
        feedback = "✈️ Navigation : Je lance l'Assistant Voyage IA.";
        fallbackTarget = { tab: 'menu', module: 'voyages', toastMessage: 'Voyages ouverts' };
      }
      else {
        feedback = `🔍 Recherche : Commande "${text}" non reconnue. Essayez : "Ouvre l'agenda", "Affiche la carte" ou "Ajoute du lait".`;
      }

      setVoiceFeedback(feedback);
      if (fallbackTarget) {
        setVoiceDebugTrace({
          intention: "navigation",
          entities: { tab: fallbackTarget.tab, module: fallbackTarget.module },
          missingFields: [],
          contextActive: false,
          actionExecuted: `Navigation vers : ${fallbackTarget.tab} / ${fallbackTarget.module}`
        });
        closeVoiceAssistantAfterDelay(2500, 'inactif', fallbackTarget);
      } else {
        setVoiceDebugTrace({
          intention: "unknown",
          entities: {},
          missingFields: [],
          contextActive: false,
          actionExecuted: "Commande non reconnue"
        });
        closeVoiceAssistantAfterDelay(3500);
      }
    } catch (err: LooseValue) {
      console.error("Critical error in parseVoiceCommand:", err);
      closeVoiceAssistantAfterDelay(2500);
    }
  };

  useEffect(() => {
    parseVoiceCommandRef.current = parseVoiceCommand;
  }, [parseVoiceCommand]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#share_')) {
        setSharedPackId(hash.replace('#share_', ''));
      } else {
        setSharedPackId(null);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Robust Versioned Migration: Force override corrupted cache with correct data
  useEffect(() => {
    // Skip migration reset if a cloud foyer is active — cloud data takes priority
    if (hadCloudFoyer) return;

    const appVersion = localStorage.getItem('mf_app_version');
    if (appVersion !== '1.2') {
      localStorage.setItem('mf_members', JSON.stringify([]));
      setMembers([]);
      
      const resetPocketMoney: LooseValue[] = [];
      localStorage.setItem('mf_pocket_money', JSON.stringify(resetPocketMoney));
      setPocketMoney(resetPocketMoney);

      localStorage.setItem('mf_dishes', JSON.stringify([]));
      setDishes([]);

      // 3. Mark version as upgraded
      localStorage.setItem('mf_app_version', '1.2');
    }
  }, []);

  // Sync state to localStorage safely on modification
  useEffect(() => {
    safeSetLocalStorage('mf_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    safeSetLocalStorage('mf_dishes', JSON.stringify(dishes));
  }, [dishes]);

  useEffect(() => {
    safeSetLocalStorage('mf_active_member_id', activeMemberId);
  }, [activeMemberId]);

  useEffect(() => {
    safeSetLocalStorage('mf_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    safeSetLocalStorage('mf_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    safeSetLocalStorage('mf_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    safeSetLocalStorage('mf_member_permissions', JSON.stringify(memberPermissions));
  }, [memberPermissions]);

  useEffect(() => {
    const permDoc = documents.find(d => d.name === '__foyer_permissions__.json');
    const loadPermissions = async () => {
      if (!permDoc || (!permDoc.fileUrl && !permDoc.fileBase64)) {
        setCommuneName("Commune à configurer");
        setSchoolName("Collège Victor Hugo");
        return;
      }
      try {
        const decodedStr = permDoc.fileUrl
          ? await fetch(permDoc.fileUrl).then(res => res.text())
          : atob(permDoc.fileBase64 || '');
        const parsed = JSON.parse(decodedStr);
        
        if (parsed && parsed.__config__) {
          if (parsed.__config__.communeName && parsed.__config__.communeName !== communeName) {
            setCommuneName(parsed.__config__.communeName);
          }
          if (parsed.__config__.schoolName && parsed.__config__.schoolName !== schoolName) {
            setSchoolName(parsed.__config__.schoolName);
          }
        } else {
          setCommuneName("Commune à configurer");
          setSchoolName("Collège Victor Hugo");
        }

        const cleanPerms = { ...parsed };
        delete cleanPerms.__config__;

        if (JSON.stringify(cleanPerms) !== JSON.stringify(memberPermissions)) {
          console.log("[MyFamily+ Permissions] Syncing permissions from document:", cleanPerms);
          setMemberPermissions(cleanPerms);
        }
      } catch (e) {
        console.warn("Failed to parse __foyer_permissions__.json from documents", e);
      }
    };
    loadPermissions();
  }, [documents]);

  useEffect(() => {
    safeSetLocalStorage('mf_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    safeSetLocalStorage('mf_groceries', JSON.stringify(groceries));
  }, [groceries]);

  useEffect(() => {
    safeSetLocalStorage('mf_saving_goals', JSON.stringify(savingGoals));
  }, [savingGoals]);

  useEffect(() => {
    safeSetLocalStorage('mf_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Migrate legacy mf_vaccines to events table if present
  useEffect(() => {
    if (foyer && events.length > 0) {
      const localVacs = localStorage.getItem('mf_vaccines');
      if (localVacs) {
        try {
          const parsed = JSON.parse(localVacs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const migrable = parsed.filter((v: LooseValue) => {
              if (['v1', 'v2', 'v3', 'v4'].includes(v.id)) return false; // skip mock
              return !events.some(e => e.type === 'vaccine' && (e.id === v.id || (e.title === v.name && e.memberId === v.memberId)));
            });

            if (migrable.length > 0) {
              const client = getSupabaseClient();
              migrable.forEach(async (v: LooseValue) => {
                const id = v.id || `ev-vac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newEvent: FamilyEvent = {
                  id,
                  title: v.name,
                  type: 'vaccine',
                  dateTime: `${v.date}T10:00:00`,
                  time: '10:00',
                  memberId: v.memberId,
                  memberName: members.find(m => m.id === v.memberId)?.name || 'Membre',
                  description: v.doctor || '',
                  done: v.status === 'Fait'
                };
                setEvents(prev => [newEvent, ...prev]);
                if (client) {
                  await client.from('events').insert({
                    id: newEvent.id,
                    foyer_id: foyer.id,
                    title: newEvent.title,
                    type: newEvent.type,
                    date_time: newEvent.dateTime,
                    time: newEvent.time,
                    member_id: newEvent.memberId,
                    member_name: newEvent.memberName,
                    description: newEvent.description,
                    done: newEvent.done
                  });
                }
              });
            }
          }
          localStorage.removeItem('mf_vaccines');
        } catch (e) {
          console.error("Migration vaccines error:", e);
        }
      }
    }
  }, [foyer, events]);

  // Load foyer-specific module budgets when foyer changes
  useEffect(() => {
    if (foyer?.id) {
      const cached = localStorage.getItem(`mf_module_budgets_${foyer.id}`);
      if (cached) {
        try {
          setModuleBudgets(JSON.parse(cached));
        } catch (e) {
          console.error("Error parsing module budgets from cache", e);
        }
      }
    }
  }, [foyer]);

  // Migration of category limits to module budgets
  useEffect(() => {
    if (!foyer?.id) return;
    
    const migrationKey = `mf_category_limits_migrated_${foyer.id}`;
    const alreadyMigrated = localStorage.getItem(migrationKey);
    if (alreadyMigrated) return;

    // Load category budgets from localStorage (if LooseValue)
    const categoryBudgetsSaved = localStorage.getItem('mf_category_budgets');
    const localCategoryBudgets = categoryBudgetsSaved ? JSON.parse(categoryBudgetsSaved) : {};

    // Load module budgets (foyer-specific)
    const moduleBudgetsSaved = localStorage.getItem(`mf_module_budgets_${foyer.id}`);
    const currentModuleBudgets = moduleBudgetsSaved ? JSON.parse(moduleBudgetsSaved) : {
      courses: { budget: 500, recurrence: 'monthly' },
      sante: { budget: 150, recurrence: 'monthly' },
      vehicules: { budget: 200, recurrence: 'monthly' },
      logement: { budget: 800, recurrence: 'monthly' },
      voyages: { budget: 1000, recurrence: 'custom' },
      ecole: { budget: 150, recurrence: 'monthly' },
      demarches: { budget: 100, recurrence: 'monthly' },
      animaux: { budget: 100, recurrence: 'monthly' },
      argent_de_poche: { budget: 50, recurrence: 'monthly' },
      taches: { budget: 50, recurrence: 'monthly' }
    };

    const categoryToModuleId: Record<string, string> = {
      'alimentation': 'courses',
      'santé': 'sante',
      'transport': 'vehicules',
      'logement': 'logement',
      'voyages': 'voyages',
      'éducation': 'ecole',
      'administratif': 'demarches',
      'animaux': 'animaux',
      'argent de poche': 'argent_de_poche'
    };

    const updatedModuleBudgets = { ...currentModuleBudgets };
    let hasChanges = false;

    // 1. Migrate from localStorage 'mf_category_budgets'
    Object.entries(localCategoryBudgets).forEach(([catName, budgetVal]) => {
      const norm = catName.toLowerCase().trim();
      const modId = categoryToModuleId[norm];
      const budget = Number(budgetVal);
      if (modId && budget > 0) {
        const currentLimit = updatedModuleBudgets[modId]?.budget || 0;
        // Overwrite standard/unset defaults
        if (currentLimit === 0 || currentLimit === 500 || currentLimit === 150 || currentLimit === 200 || currentLimit === 800 || currentLimit === 1000 || currentLimit === 100) {
          updatedModuleBudgets[modId] = {
            budget,
            recurrence: updatedModuleBudgets[modId]?.recurrence || 'monthly'
          };
          hasChanges = true;
        }
      }
    });

    // 2. Migrate from customCategories in state
    customCategories.forEach(cc => {
      const norm = cc.name.toLowerCase().trim();
      const modId = categoryToModuleId[norm];
      const budget = Number(cc.budget || 0);
      if (modId && budget > 0) {
        const currentLimit = updatedModuleBudgets[modId]?.budget || 0;
        if (currentLimit === 0 || currentLimit === 500 || currentLimit === 150 || currentLimit === 200 || currentLimit === 800 || currentLimit === 1000 || currentLimit === 100) {
          updatedModuleBudgets[modId] = {
            budget,
            recurrence: updatedModuleBudgets[modId]?.recurrence || 'monthly'
          };
          hasChanges = true;
        }
      }
    });

    // Save migrated module budgets
    if (hasChanges) {
      setModuleBudgets(updatedModuleBudgets);
      localStorage.setItem(`mf_module_budgets_${foyer.id}`, JSON.stringify(updatedModuleBudgets));
    }

    // Update base de données : set budget to 0 on Supabase for custom categories
    const client = getSupabaseClient();
    customCategories.forEach(async (cc) => {
      if (cc.budget && cc.budget > 0) {
        if (client) {
          try {
            await client.from('custom_categories').update({
              budget: 0
            }).eq('id', cc.id);
          } catch (e) {
            console.error("Migration custom category budget error:", e);
          }
        }
      }
    });

    // Clear localCategoryBudgets
    localStorage.removeItem('mf_category_budgets');

    // Mark as migrated
    localStorage.setItem(migrationKey, 'true');

    // Set client customCategories budgets to 0
    setCustomCategories(prev => prev.map(c => ({ ...c, budget: 0 })));
  }, [foyer, customCategories]);

  useEffect(() => {
    safeSetLocalStorage('mf_chat_groups', JSON.stringify(chatGroups));
  }, [chatGroups]);

  useEffect(() => {
    safeSetLocalStorage('mf_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    safeSetLocalStorage('mf_demarches', JSON.stringify(demarches));
  }, [demarches]);

  useEffect(() => {
    safeSetLocalStorage('mf_packs', JSON.stringify(justificatifPacks));
  }, [justificatifPacks]);

  useEffect(() => {
    safeSetLocalStorage('mf_currency', currency);
  }, [currency]);

  useEffect(() => {
    safeSetLocalStorage('mf_sb_url', supabaseUrl);
    safeSetLocalStorage('mf_sb_key', supabaseKey);
    safeSetLocalStorage('mf_sync_active', String(syncActive));
  }, [supabaseUrl, supabaseKey, syncActive]);

  useEffect(() => {
    safeSetLocalStorage('mf_memories', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    safeSetLocalStorage('mf_votes', JSON.stringify(votes));
  }, [votes]);

  useEffect(() => {
    safeSetLocalStorage('mf_school_tasks', JSON.stringify(schoolTasks));
  }, [schoolTasks]);

  useEffect(() => {
    safeSetLocalStorage('mf_moods', JSON.stringify(memberMoods));
  }, [memberMoods]);

  useEffect(() => {
    safeSetLocalStorage('mf_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    safeSetLocalStorage('mf_maintenance', JSON.stringify(maintenance));
  }, [maintenance]);

  useEffect(() => {
    safeSetLocalStorage('mf_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    safeSetLocalStorage('mf_pets', JSON.stringify(pets));
  }, [pets]);

  useEffect(() => {
    safeSetLocalStorage('mf_pocket_money', JSON.stringify(pocketMoney));
  }, [pocketMoney]);

  useEffect(() => {
    safeSetLocalStorage('mf_malus_templates', JSON.stringify(malusTemplates));
  }, [malusTemplates]);

  useEffect(() => {
    safeSetLocalStorage('mf_applied_maluses', JSON.stringify(appliedMaluses));
  }, [appliedMaluses]);

  useEffect(() => {
    safeSetLocalStorage('mf_artisans', JSON.stringify(artisans));
  }, [artisans]);

  // ----------------------------------------------------
  // Dynamic Currency Converter Engine
  // ----------------------------------------------------
  const getCurrencySymbol = () => {
    if (currency.includes('FCFA')) return 'FCFA';
    if (currency.includes('USD')) return '$';
    return '€';
  };

  const getExchangeRate = () => {
    // Les données initiales de démo sont stockées en Euros
    if (currency.includes('FCFA')) return 655; // 1 EUR = 655 FCFA
    if (currency.includes('USD')) return 1.10; // 1 EUR = 1.10 USD
    return 1.0;
  };

  const formatMoney = (amountInEuro: number) => {
    const rate = getExchangeRate();
    const symbol = getCurrencySymbol();
    const converted = amountInEuro * rate;
    
    // Formatage français élégant avec espaces pour milliers
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0
    }).format(converted) + ' ' + symbol;
  };

  const dynamicBudgetAlerts = useMemo(() => {
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const moduleSums: Record<string, number> = {};
    
    transactions
      .filter(t => !t.isArchived && t.type === 'expense' && t.date.startsWith(currentMonthStr))
      .forEach(t => {
        const moduleId = getModuleIdFromTransaction(t);
        if (moduleId) {
          moduleSums[moduleId] = (moduleSums[moduleId] || 0) + t.amount;
        }
      });

    const generatedAlerts: LooseValue[] = [];
    const modulesList = [
      { id: 'courses', label: 'Courses & Achats', icon: '🛒' },
      { id: 'sante', label: 'Santé & Soins', icon: '🩺' },
      { id: 'vehicules', label: 'Véhicule & Auto', icon: '🚗' },
      { id: 'logement', label: 'Logement & Charges', icon: '🏠' },
      { id: 'voyages', label: 'Voyages & Vacances', icon: '✈️' },
      { id: 'ecole', label: 'École & Éducation', icon: '🎓' },
      { id: 'demarches', label: 'Démarches Admin', icon: '📂' },
      { id: 'animaux', label: 'Animaux & Veto', icon: '🐶' },
      { id: 'argent_de_poche', label: 'Argent de Poche', icon: '🪙' },
      { id: 'taches', label: 'Tâches Ménagères', icon: '🧹' }
    ];

    modulesList.forEach(m => {
      const budgetObj = moduleBudgets[m.id];
      const budgetLimit = budgetObj?.budget || 0;
      if (budgetLimit > 0) {
        const spent = moduleSums[m.id] || 0;
        
        if (spent > budgetLimit) {
          generatedAlerts.push({
            id: `budget-overrun-${m.id}-${currentMonthStr}`,
            title: `⚠️ Budget dépassé : ${m.label}`,
            description: `Le budget du module "${m.icon} ${m.label}" a été dépassé (${spent.toFixed(2)}€ dépensés / limite ${budgetLimit}€).`,
            time: 'Actuellement',
            type: 'error',
            read: false,
            module: 'budget',
            createdAt: new Date().toISOString(),
            foyerId: foyer?.id
          });
        } else if (spent >= budgetLimit * 0.9) {
          generatedAlerts.push({
            id: `budget-warning-${m.id}-${currentMonthStr}`,
            title: `⚠️ Budget bientôt atteint : ${m.label}`,
            description: `Le budget du module "${m.icon} ${m.label}" est presque atteint (${spent.toFixed(2)}€ dépensés / limite ${budgetLimit}€).`,
            time: 'Actuellement',
            type: 'warning',
            read: false,
            module: 'budget',
            createdAt: new Date().toISOString(),
            foyerId: foyer?.id
          });
        }
      }
    });

    return generatedAlerts;
  }, [transactions, moduleBudgets]);

  const dynamicSmartAlerts = useMemo(() => {
    return buildSmartFamilyAlerts({
      foyer,
      activeMemberId,
      members,
      events: unifiedEvents,
      tasks,
      groceries,
      transactions,
      trips,
      documents,
      dishes,
      schoolTasks,
      chatGroups,
      chatMessages
    }, smartFamilyPrefs);
  }, [
    foyer?.id,
    activeMemberId,
    members,
    unifiedEvents,
    tasks,
    groceries,
    transactions,
    trips,
    documents,
    dishes,
    schoolTasks,
    chatGroups,
    chatMessages,
    smartFamilyPrefs
  ]);

  const allAlertsCombined = useMemo(() => {
    return [...alerts, ...dynamicBudgetAlerts, ...dynamicSmartAlerts];
  }, [alerts, dynamicBudgetAlerts, dynamicSmartAlerts]);

  const isComputedAlertId = (id: string) => id.startsWith('budget-') || id.startsWith('smart-');

  const filteredAlerts = allAlertsCombined
    .filter((al: LooseValue) => !deletedAlertIds.includes(al.id))
    .filter((al: LooseValue) => !(al.read || readAlertIds.includes(al.id)))
    .filter((al: LooseValue) => {
      if (al.id.includes(`-by-${activeMemberId}`)) return false;
      
      const mod = al.module || '';
      if (mod === 'groceries' || mod === 'courses') return notificationPrefs.groceries;
      if (mod === 'tasks' || mod === 'chore_tasks') return notificationPrefs.tasks;
      if (mod === 'events' || mod === 'agenda' || mod === 'calendar') return notificationPrefs.agenda;
      if (mod === 'finances' || mod === 'budget' || mod === 'transactions' || mod === 'saving_goals') return notificationPrefs.finances;
      if (mod === 'chat' || mod === 'messages') return notificationPrefs.chat;
      if (mod === 'health' || mod === 'sante') return notificationPrefs.health;
      if (mod === 'vault' || mod === 'documents' || mod === 'demarches' || mod === 'justificatif_packs') return notificationPrefs.vault;

      return true;
    })
    .sort((a: LooseValue, b: LooseValue) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA && timeB) return timeB - timeA;
      const extractTime = (id: string) => {
        const match = id.match(/\d{10,}/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return extractTime(b.id) - extractTime(a.id);
    });

  const handleMarkAsRead = async (id: string) => {
    setReadAlertIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem(`mf_read_alerts_${activeMemberId}`, JSON.stringify(next));
      return next;
    });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    if (!isComputedAlertId(id)) {
      await updateAlertReadStatusInCloud(id, true);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    setDeletedAlertIds(prev => {
      const next = [...prev, id];
      localStorage.setItem(`mf_deleted_alerts_${activeMemberId}`, JSON.stringify(next));
      return next;
    });
    if (!isComputedAlertId(id)) {
      const client = getSupabaseClient();
      if (client) {
        await client.from('alerts').delete().eq('id', id);
      }
    }
  };

  // ----------------------------------------------------
  // Callbacks and Form Submissions
  // ----------------------------------------------------
  const handleAddEvent = async (newEvent: LooseValue) => {
    if (!isPremium) {
      const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
      const monthlyEventsCount = events.filter(e => e.dateTime.startsWith(currentMonth)).length;
      if (monthlyEventsCount >= 10) {
        setPaywallOpen(true);
        return;
      }
    }
    const id = `ev-${Date.now()}`;
    setEvents(prev => [{ ...newEvent, id }, ...prev]);

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          // 1. Sauvegarder l'événement dans Supabase
          const { error } = await client.from('events').insert({
            id,
            foyer_id: foyer.id,
            title: newEvent.title,
            type: newEvent.type || 'other',
            date_time: newEvent.dateTime,
            time: newEvent.time || '',
            member_id: newEvent.memberId || '',
            member_name: newEvent.memberName || '',
            location: newEvent.location || '',
            description: newEvent.description || '',
            done: newEvent.done || false,
            amount: newEvent.amount || null
          });
          if (error) {
            console.error("Erreur lors de la création de l'événement cloud :", error);
            return;
          }

          // 2. Générer une alerte cloud d'événement pour notifier toute la famille
          const activeMemberObj = members.find(m => m.id === activeMemberId);
          const activeMemberName = activeMemberObj ? activeMemberObj.name : 'Un parent';

          await sendLocalNotification(
            `📅 Nouvel événement : ${newEvent.title}`,
            `Ajouté pour le ${newEvent.dateTime.split('T')[0]} par ${activeMemberName}.`,
            "agenda"
          );
        } catch (err) {
          console.error("Erreur lors de l'ajout cloud de l'événement :", err);
        }
      }
    }
  };

  const handleAddTransaction = async (newTrans: LooseValue) => {
    const id = newTrans.id || `tx-${Date.now()}`;
    const nowStr = new Date().toISOString();
    const todayISO = nowStr.split('T')[0];
    
    // Custom French locale time extraction (HH:MM)
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    
    // Find active member name
    const activeMember = members.find(m => m.id === activeMemberId);
    const author = newTrans.createdBy || activeMember?.name || 'Système';
    
    // Deduce source module or prefix
    let deducedSource = '✍️ Saisi manuellement';
    if (newTrans.isVoice) {
      deducedSource = '🎙️ Créé par le micro';
    } else if (newTrans.moduleSource === 'voyages' || newTrans.category === 'Voyages') {
      deducedSource = '✈️ Créé depuis Voyage';
    } else if (newTrans.moduleSource === 'sante' || newTrans.category === 'Santé') {
      deducedSource = '🏥 Créé depuis Santé';
    } else if (newTrans.moduleSource === 'vehicules' || newTrans.category === 'Véhicules') {
      deducedSource = '🚗 Créé depuis Véhicules';
    } else if (newTrans.moduleSource === 'logement' || newTrans.category === 'Logement') {
      deducedSource = '🏠 Créé depuis Logement';
    } else if (newTrans.moduleSource === 'ecole' || newTrans.category === 'Éducation') {
      deducedSource = '🎓 Créé depuis École';
    } else if (newTrans.moduleSource === 'documents' || newTrans.category === 'Administratif') {
      deducedSource = '📄 Créé depuis Démarches';
    } else if (newTrans.moduleSource === 'import') {
      deducedSource = '📄 Importé CSV';
    } else if (newTrans.source_module) {
      deducedSource = newTrans.source_module;
    }

    const initialHistory = newTrans.modificationHistory || [
      { author, date: `${todayISO} à ${timeStr}`, action: 'Création' }
    ];

    const finalTx = {
      ...newTrans,
      id,
      transaction_id: id,
      family_id: foyer?.id || 'default',
      user_id: activeMember?.userId || 'default',
      member_id: newTrans.memberId || activeMemberId || 'default',
      amount: newTrans.amount,
      category_id: newTrans.categoryId || newTrans.category || 'Divers',
      subcategory_id: newTrans.subCategoryId || newTrans.subCategory || 'Divers',
      transaction_date: newTrans.date || todayISO,
      entryDate: todayISO,
      entryTime: timeStr,
      createdAt: nowStr,
      updatedAt: nowStr,
      created_at: nowStr,
      updated_at: nowStr,
      createdBy: author,
      created_by: author,
      source_module: deducedSource,
      modificationHistory: initialHistory,
      travelId: newTrans.travelId || newTrans.travel_id,
      travel_id: newTrans.travelId || newTrans.travel_id
    };

    setTransactions(prev => [finalTx, ...prev]);

    // Update bank account balance if accountId is provided
    if (finalTx.accountId) {
      setAccounts(prev => prev.map(acc => {
        if (acc.id === finalTx.accountId) {
          const change = finalTx.type === 'income' ? finalTx.amount : -finalTx.amount;
          const updatedBalance = acc.balance + change;
          
          // Update database asynchronously
          const supabase = getSupabaseClient();
          if (supabase) {
            supabase.from('accounts')
              .update({ balance: updatedBalance })
              .eq('id', acc.id)
              .then(({ error }) => {
                if (error) console.error("Error updating account balance in Supabase:", error);
              });
          }
          return { ...acc, balance: updatedBalance };
        }
        return acc;
      }));
    }

    // Si la transaction est de type Épargne, mettre à jour l'objectif d'épargne principal
    if (finalTx.type === 'savings') {
      setSavingGoals(prev => prev.map((goal, idx) => {
        if (idx === 0) { // On incrémente le premier objectif par défaut
          return {
            ...goal,
            currentAmount: goal.currentAmount + finalTx.amount
          };
        }
        return goal;
      }));
    }

    // Vérification du plafond budgétaire par module et génération d'une alerte si nécessaire
    if (finalTx.type === 'expense') {
      try {
        const moduleId = getModuleIdFromTransaction(finalTx);
        if (moduleId) {
          const budgetObj = moduleBudgets[moduleId];
          const limit = budgetObj?.budget || 0;
          if (limit > 0) {
            const transDate = finalTx.date || todayISO;
            let transMonth = '';
            let transYear = '';
            if (transDate.includes('/')) {
              const parts = transDate.split('/');
              transMonth = parts[1];
              transYear = parts[2];
            } else if (transDate.includes('-')) {
              const parts = transDate.split('-');
              transMonth = parts[1];
              transYear = parts[0];
            }

            // Filtrer les dépenses du même module pour le même mois
            const moduleTransactions = transactions.filter(t => {
              if (t.type !== 'expense') return false;
              if (getModuleIdFromTransaction(t) !== moduleId) return false;
              if (!t.date) return false;
              let tMonth = '';
              let tYear = '';
              if (t.date.includes('/')) {
                const parts = t.date.split('/');
                tMonth = parts[1];
                tYear = parts[2];
              } else if (t.date.includes('-')) {
                const parts = t.date.split('-');
                tMonth = parts[1];
                tYear = parts[0];
              }
              return tMonth === transMonth && tYear === transYear;
            });

            const previousExpenses = moduleTransactions.reduce((sum, t) => sum + t.amount, 0);
            const currentExpenses = previousExpenses + finalTx.amount;

            const prevRatio = (previousExpenses / limit) * 100;
            const currentRatio = (currentExpenses / limit) * 100;

            let triggered = false;
            let alertTitle = '';
            let alertDesc = '';
            let alertType: 'warning' | 'error' = 'warning';

            const modulesList: Record<string, { label: string; icon: string }> = {
              courses: { label: 'Courses & Achats', icon: '🛒' },
              sante: { label: 'Santé & Soins', icon: '🩺' },
              vehicules: { label: 'Véhicule & Auto', icon: '🚗' },
              logement: { label: 'Logement & Charges', icon: '🏠' },
              voyages: { label: 'Voyages & Vacances', icon: '✈️' },
              ecole: { label: 'École & Éducation', icon: '🎓' },
              demarches: { label: 'Démarches Admin', icon: '📂' },
              animaux: { label: 'Animaux & Veto', icon: '🐶' },
              argent_de_poche: { label: 'Argent de Poche', icon: '🪙' },
              taches: { label: 'Tâches Ménagères', icon: '🧹' }
            };
            const modInfo = modulesList[moduleId] || { label: moduleId, icon: '💰' };

            if (currentRatio >= 100 && prevRatio < 100) {
              triggered = true;
              alertTitle = `🚨 Dépassement Budget : ${modInfo.label}`;
              alertDesc = `Le plafond mensuel de ${limit}€ pour le module "${modInfo.icon} ${modInfo.label}" a été dépassé. Total : ${currentExpenses.toFixed(2)}€.`;
              alertType = 'error';
            } else if (currentRatio >= 90 && prevRatio < 90) {
              triggered = true;
              alertTitle = `⚠️ Alerte Budget 90% : ${modInfo.label}`;
              alertDesc = `Les dépenses pour le module "${modInfo.icon} ${modInfo.label}" ont atteint ${currentRatio.toFixed(0)}% du budget de ${limit}€ (Total : ${currentExpenses.toFixed(2)}€).`;
              alertType = 'warning';
            }

            if (triggered) {
              sendLocalNotification(alertTitle, alertDesc, 'budget', alertType);
            }
          }
        }
      } catch (err) {
        console.error("Error checking budget limit:", err);
      }
    }

    // Sauvegarde en ligne vers Supabase
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const activeFoyerId = foyer?.id || localStorage.getItem('mf_cloud_foyer_id');
          if (activeFoyerId && activeFoyerId !== 'foyer-simulated') {
            const { error } = await supabase.from('transactions').insert({
              id,
              foyer_id: activeFoyerId,
              amount: finalTx.amount,
              type: finalTx.type,
              category: finalTx.category,
              date: finalTx.date || todayISO,
              title: finalTx.title,
              member_id: finalTx.memberId || null,
              member_name: finalTx.memberName || 'Famille',
              sub_category: finalTx.subCategory || null,
              account_id: finalTx.accountId || null,
              comment: serializeTransactionComment(finalTx.comment, {
                moduleSource: finalTx.moduleSource || finalTx.source_module,
                entryTime: finalTx.entryTime,
                entryDate: finalTx.entryDate,
                travelId: finalTx.travelId || finalTx.travel_id,
                recurrenceInterval: finalTx.recurrenceInterval,
                startDate: finalTx.startDate,
                endDate: finalTx.endDate,
                nextOccurrence: finalTx.nextOccurrence
              }),
              modification_history: JSON.stringify(finalTx.modificationHistory),
              recurrence: finalTx.recurrence || 'none',
              subscription_id: finalTx.subscriptionId || null
            });
            if (error) {
              console.error("Error inserting transaction to Supabase:", error);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Dépense sauvegardée localement (Supabase hors ligne ou non configuré):", e);
    }
  };

  const handleAddTask = (newTask: LooseValue) => {
    const id = `tk-${Date.now()}`;
    setTasks(prev => [{ ...newTask, id }, ...prev]);
    const parsed = parseChoreTitle(newTask.title);
    sendLocalNotification(
      parsed.attributionMode === 'wall' ? "Nouvelle mission publiée" : "Nouvelle tâche assignée",
      parsed.attributionMode === 'wall' 
        ? `🔥 Une nouvelle mission ouverte "${parsed.title}" est disponible sur le Mur des tâches !`
        : `🧹 La tâche "${parsed.title}" a été assignée à ${newTask.assignedMemberName || 'un membre'}.`,
      "taches"
    );
  };

  const handleAddMember = async (newMem: LooseValue) => {
    if (!isPremium && members.length >= 3) {
      setPaywallOpen(true);
      return;
    }
    if (foyer) {
      try {
        const addedMem = await foyerService.addMemberToFoyer(foyer.id, newMem);
        // Traduire le membre retourné de Supabase au format UI frontend
        const mappedMember = mapFoyerMemberToMember(addedMem);
        setMembers(prev => [...prev, mappedMember]);
        alert(`🎉 Fiche membre de ${mappedMember.name} créée et enregistrée avec succès dans le Cloud ! ✨`);
      } catch (err: LooseValue) {
        console.error("Erreur lors de la création du membre sur Supabase :", err);
        alert(`Impossible d'enregistrer le membre dans le cloud : ${err.message || err}`);
      }
    } else {
      const id = `${members.length + 1}`;
      setMembers(prev => [...prev, { ...newMem, id, hasExemption: newMem.hasExemption || false }]);
    }
  };

  const handleToggleEventDone = async (id: string) => {
    const client = getSupabaseClient();
    
    // 1. Vaccine (in events table)
    if (id.startsWith('vac-')) {
      const rawId = id.replace('vac-', '');
      setEvents(prev => prev.map(e => e.id === rawId ? { ...e, done: !e.done } : e));
      if (client && foyer) {
        const currentEvent = events.find(e => e.id === rawId);
        if (currentEvent) {
          await client.from('events').update({ done: !currentEvent.done }).eq('foyer_id', foyer.id).eq('id', rawId);
        }
      }
    }
    // 2. School Task (school_tasks table)
    else if (id.startsWith('school-task-')) {
      const rawId = id.replace('school-task-', '');
      setSchoolTasksState(prev => prev.map(st => st.id === rawId ? { ...st, done: !st.done } : st));
      if (client) {
        const current = schoolTasks.find(st => st.id === rawId);
        if (current) {
          await client.from('school_tasks').update({ done: !current.done }).eq('id', rawId);
        }
      }
    }
    // 3. Chore Task (chore_tasks table)
    else if (id.startsWith('task-')) {
      const rawId = id.replace('task-', '');
      setTasks(prev => prev.map(tk => tk.id === rawId ? { ...tk, done: !tk.done } : tk));
      if (client) {
        const current = tasks.find(tk => tk.id === rawId);
        if (current) {
          await client.from('chore_tasks').update({ done: !current.done }).eq('id', rawId);
        }
      }
    }
    // 4. Demarche (demarches table)
    else if (id.startsWith('demarche-')) {
      const rawId = id.replace('demarche-', '');
      setDemarches(prev => prev.map(d => {
        if (d.id === rawId) {
          const nextStatus = d.status === 'completed' ? 'pending' : 'completed';
          if (client) client.from('demarches').update({ status: nextStatus }).eq('id', rawId);
          return { ...d, status: nextStatus as LooseValue };
        }
        return d;
      }));
    }
    // 5. Maintenance (maintenance table)
    else if (id.startsWith('maint-')) {
      const rawId = id.replace('maint-', '');
      setMaintenance(prev => prev.map(m => {
        if (m.id === rawId) {
          const nextStatus = m.status === 'completed' ? 'pending' : 'completed';
          if (client) client.from('maintenance').update({ status: nextStatus }).eq('id', rawId);
          return { ...m, status: nextStatus as LooseValue };
        }
        return m;
      }));
    }
    // 6. Agenda standard event
    else {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, done: !e.done } : e));
      if (client && foyer) {
        const currentEvent = events.find(e => e.id === id);
        if (currentEvent) {
          await client.from('events').update({ done: !currentEvent.done }).eq('foyer_id', foyer.id).eq('id', id);
        }
      }
    }
  };

  const handleUpdatePermissions = async (newPermissions: Record<string, Record<FamilyModule, ModulePermissions>>) => {
    setMemberPermissions(newPermissions);
    
    const dataToSave = {
      ...newPermissions,
      __config__: {
        communeName,
        schoolName
      }
    };
    
    const jsonStr = JSON.stringify(dataToSave);
    
    const docId = '__foyer_permissions__';
    const now = new Date().toISOString();
    
    const newDoc: DocumentFile = {
      id: docId,
      name: '__foyer_permissions__.json',
      category: 'other',
      tags: ['system'],
      uploadDate: now.split('T')[0],
      fileSize: `${jsonStr.length} B`,
      isExpired: false,
      fileUrl: undefined,
      isSecure: false
    };

    let updatedDocs: DocumentFile[];
    if (documents.some(d => d.id === docId)) {
      updatedDocs = documents.map(d => d.id === docId ? newDoc : d);
    } else {
      updatedDocs = [newDoc, ...documents];
    }
    
    setDocuments(updatedDocs);

    const client = getSupabaseClient();
    if (client && foyer) {
      try {
        const fileUrl = await uploadJsonToStorage(foyer.id, docId, jsonStr);
        const cloudDoc = { ...newDoc, fileUrl };
        setDocuments(prev => prev.some(d => d.id === docId) ? prev.map(d => d.id === docId ? cloudDoc : d) : [cloudDoc, ...prev]);

        const { data: existing } = await client
          .from('documents')
          .select('id')
          .eq('foyer_id', foyer.id)
          .eq('name', '__foyer_permissions__.json')
          .maybeSingle();

        if (existing) {
          await client.from('documents').update({
            file_url: fileUrl,
            file_base64: null,
            updated_at: now
          }).eq('id', existing.id);
        } else {
          await client.from('documents').insert({
            foyer_id: foyer.id,
            name: '__foyer_permissions__.json',
            category: 'other',
            tags: ['system'],
            upload_date: now.split('T')[0],
            file_size: `${jsonStr.length} B`,
            file_url: fileUrl,
            file_base64: null
          });
        }
      } catch (err) {
        console.error("Cloud permissions sync error:", err);
      }
    }
  };

  const handleUpdateFoyerConfig = async (newCommune: string, newSchool: string) => {
    setCommuneName(newCommune);
    setSchoolName(newSchool);

    const dataToSave = {
      ...memberPermissions,
      __config__: {
        communeName: newCommune,
        schoolName: newSchool
      }
    };

    const jsonStr = JSON.stringify(dataToSave);
    
    const docId = '__foyer_permissions__';
    const now = new Date().toISOString();
    
    const newDoc: DocumentFile = {
      id: docId,
      name: '__foyer_permissions__.json',
      category: 'other',
      tags: ['system'],
      uploadDate: now.split('T')[0],
      fileSize: `${jsonStr.length} B`,
      isExpired: false,
      fileUrl: undefined,
      isSecure: false
    };

    const updatedDocs = documents.some(d => d.id === docId)
      ? documents.map(d => d.id === docId ? newDoc : d)
      : [newDoc, ...documents];
    
    setDocuments(updatedDocs);

    const client = getSupabaseClient();
    if (client && foyer) {
      try {
        const fileUrl = await uploadJsonToStorage(foyer.id, docId, jsonStr);
        const cloudDoc = { ...newDoc, fileUrl };
        setDocuments(prev => prev.some(d => d.id === docId) ? prev.map(d => d.id === docId ? cloudDoc : d) : [cloudDoc, ...prev]);

        const { data: existing } = await client
          .from('documents')
          .select('id')
          .eq('foyer_id', foyer.id)
          .eq('name', '__foyer_permissions__.json')
          .maybeSingle();

        if (existing) {
          await client.from('documents').update({
            file_url: fileUrl,
            file_base64: null,
            updated_at: now
          }).eq('id', existing.id);
        } else {
          await client.from('documents').insert({
            foyer_id: foyer.id,
            name: '__foyer_permissions__.json',
            category: 'other',
            tags: ['system'],
            upload_date: now.split('T')[0],
            file_size: `${jsonStr.length} B`,
            file_url: fileUrl,
            file_base64: null
          });
        }
      } catch (err) {
        console.error("Cloud config sync error:", err);
      }
    }
  };

  const handleUpdateMemberPermissions = async (memberId: string, modulePermissions: Record<FamilyModule, ModulePermissions>) => {
    const updated = {
      ...memberPermissions,
      [memberId]: modulePermissions
    };
    await handleUpdatePermissions(updated);
  };

  const handleUpdateMemberProfile = async (memberId: string, updates: FoyerMemberProfileUpdate) => {
    const finalUpdates = { ...updates };
    if (updates.photoUrl && updates.photoUrl.startsWith('data:')) {
      try {
        console.log(`[Profile] Compressing & uploading profile picture for member: ${memberId}`);
        const { blob } = await compressImageToBlob(updates.photoUrl, 'profile');
        const storagePath = foyer ? `${foyer.id}/profile_${memberId}.webp` : `profile_${memberId}.webp`;
        const publicUrl = await uploadBlobToStorage('avatars', storagePath, blob);
        finalUpdates.photoUrl = publicUrl;
      } catch (err) {
        console.error("Failed to upload profile image to Storage:", err);
      }
    }

    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const convertedUpdates: LooseValue = {};
        if (finalUpdates.displayName !== undefined) convertedUpdates.name = finalUpdates.displayName;
        if (finalUpdates.photoUrl !== undefined) convertedUpdates.photoUrl = finalUpdates.photoUrl;
        if (finalUpdates.role !== undefined) {
          convertedUpdates.role = 
            finalUpdates.role === 'admin' ? 'Chef de famille' :
            finalUpdates.role === 'parent' ? 'Gestionnaire' :
            finalUpdates.role === 'child' ? 'Enfant' :
            'Invité';
        }
        if (finalUpdates.age !== undefined) convertedUpdates.age = finalUpdates.age;
        if (finalUpdates.birthDate !== undefined) convertedUpdates.birthDate = finalUpdates.birthDate;
        if (finalUpdates.bloodGroup !== undefined) convertedUpdates.bloodGroup = finalUpdates.bloodGroup;
        if (finalUpdates.schoolOrEmployer !== undefined) convertedUpdates.schoolOrEmployer = finalUpdates.schoolOrEmployer;
        if (finalUpdates.hasExemption !== undefined) convertedUpdates.hasExemption = finalUpdates.hasExemption;
        if (finalUpdates.userId !== undefined) convertedUpdates.userId = finalUpdates.userId;
        
        return { ...m, ...convertedUpdates };
      }
      return m;
    }));
    
    // Instant update of active user's own profile state if they edited their own profile
    if (myMemberProfile && memberId === myMemberProfile.id) {
      setMyMemberProfile(prev => prev ? { ...prev, ...finalUpdates } : null);
    }

    if (foyer) {
      try {
        await foyerService.updateMemberProfile(memberId, finalUpdates);
      } catch (e) {
        console.error("Erreur lors de la mise à jour du profil membre :", e);
      }
    }
  };

  const handleOpenChatWithMember = async (otherMemberId: string) => {
    if (!activeMemberId || !otherMemberId) return;

    // Check if a private group between activeMemberId and otherMemberId already exists
    const existingGroup = chatGroups.find(g => 
      g.isPrivate && 
      g.memberIds.length === 2 && 
      g.memberIds.includes(activeMemberId) && 
      g.memberIds.includes(otherMemberId)
    );

    if (existingGroup) {
      setInitialChatGroupId(existingGroup.id);
      setActiveModule('messagerie');
      return;
    }

    // Otherwise, create a new private chat group
    const otherMemberObj = appMembers.find(m => m.id === otherMemberId);
    const otherMemberName = otherMemberObj ? otherMemberObj.name : 'Membre';
    const activeMemberObj = appMembers.find(m => m.id === activeMemberId);
    const activeMemberName = activeMemberObj ? activeMemberObj.name : 'Moi';
    
    const newGroupId = `g-private-${Date.now()}`;
    const newGroup: ChatGroup = {
      id: newGroupId,
      name: `${activeMemberName} & ${otherMemberName}`,
      isPrivate: true,
      memberIds: [activeMemberId, otherMemberId],
      unreadCount: 0
    };

    // Update local state
    setChatGroups(prev => [newGroup, ...prev]);

    // Save to Supabase
    const client = getSupabaseClient();
    if (client && foyer) {
      try {
        await client.from('chat_groups').insert({
          id: newGroupId,
          foyer_id: foyer.id,
          name: newGroup.name,
          is_private: true,
          member_ids: [activeMemberId, otherMemberId],
          last_message: null,
          last_message_time: null,
          pinned_message_id: null
        });
      } catch (err) {
        console.error("Error creating chat group in Supabase:", err);
      }
    }

    setInitialChatGroupId(newGroupId);
    setActiveModule('messagerie');
  };

  const handleMoveEvent = async (id: string, newDate: string) => {
    const client = getSupabaseClient();

    // 1. Vaccine (in events table)
    if (id.startsWith('vac-')) {
      const rawId = id.replace('vac-', '');
      setEvents(prev => prev.map(e => {
        if (e.id === rawId) {
          const timePart = e.dateTime.split('T')[1];
          return { ...e, dateTime: timePart ? `${newDate}T${timePart}` : newDate };
        }
        return e;
      }));
      if (client && foyer) {
        const currentEvent = events.find(e => e.id === rawId);
        if (currentEvent) {
          const timePart = currentEvent.dateTime.split('T')[1];
          const newDateTime = timePart ? `${newDate}T${timePart}` : newDate;
          await client.from('events').update({ date_time: newDateTime }).eq('foyer_id', foyer.id).eq('id', rawId);
        }
      }
    }
    // 2. School Task (school_tasks table)
    else if (id.startsWith('school-task-')) {
      const rawId = id.replace('school-task-', '');
      setSchoolTasksState(prev => prev.map(st => st.id === rawId ? { ...st, dueDate: newDate } : st));
      if (client) {
        await client.from('school_tasks').update({ due_date: newDate }).eq('id', rawId);
      }
    }
    // 3. Chore Task (chore_tasks table)
    else if (id.startsWith('task-')) {
      const rawId = id.replace('task-', '');
      setTasks(prev => prev.map(tk => tk.id === rawId ? { ...tk, dueDate: newDate } : tk));
      if (client) {
        await client.from('chore_tasks').update({ due_date: newDate }).eq('id', rawId);
      }
    }
    // 4. Demarche (demarches table)
    else if (id.startsWith('demarche-')) {
      const rawId = id.replace('demarche-', '');
      setDemarches(prev => prev.map(d => d.id === rawId ? { ...d, dueDate: newDate } : d));
      if (client) {
        await client.from('demarches').update({ due_date: newDate }).eq('id', rawId);
      }
    }
    // 5. Trip (trips table)
    else if (id.startsWith('trip-dep-') || id.startsWith('trip-ret-')) {
      const isDep = id.startsWith('trip-dep-');
      const rawId = id.replace(isDep ? 'trip-dep-' : 'trip-ret-', '');
      setTrips(prev => prev.map(t => {
        if (t.id === rawId) {
          const updated = isDep ? { ...t, startDate: newDate } : { ...t, endDate: newDate };
          if (client) {
            client.from('trips').update(isDep ? { start_date: newDate } : { end_date: newDate }).eq('id', rawId);
          }
          return updated;
        }
        return t;
      }));
    }
    // 6. Vehicles (vehicles table)
    else if (id.startsWith('veh-tc-') || id.startsWith('veh-ins-')) {
      const isTc = id.startsWith('veh-tc-');
      const rawId = id.replace(isTc ? 'veh-tc-' : 'veh-ins-', '');
      setVehicles(prev => prev.map(v => {
        if (v.id === rawId) {
          const updated = isTc ? { ...v, technicalControl: newDate } : { ...v, insuranceExpiry: newDate };
          if (client) {
            client.from('vehicles').update(isTc ? { technical_control: newDate } : { insurance_expiry: newDate }).eq('id', rawId);
          }
          return updated;
        }
        return v;
      }));
    }
    // 7. Maintenance (maintenance table)
    else if (id.startsWith('maint-')) {
      const rawId = id.replace('maint-', '');
      setMaintenance(prev => prev.map(m => {
        if (m.id === rawId) {
          if (client) client.from('maintenance').update({ date: newDate }).eq('id', rawId);
          return { ...m, date: newDate };
        }
        return m;
      }));
    }
    // 8. Pet (pets table)
    else if (id.startsWith('pet-vac-') || id.startsWith('pet-vet-')) {
      const isVac = id.startsWith('pet-vac-');
      const rawId = id.replace(isVac ? 'pet-vac-' : 'pet-vet-', '');
      setPets(prev => prev.map(p => {
        if (p.id === rawId) {
          const updated = isVac ? { ...p, nextVaccine: newDate } : { ...p, vetAppointment: newDate };
          if (client) {
            client.from('pets').update(isVac ? { next_vaccine: newDate } : { vet_appointment: newDate }).eq('id', rawId);
          }
          return updated;
        }
        return p;
      }));
    }
    // 9. Recurring Billing / Abonnement (abonnements table)
    else if (id.startsWith('abo-')) {
      const rawId = id.replace('abo-', '').split('-')[0];
      setAbonnements(prev => prev.map(a => {
        if (a.id === rawId) {
          if (client) client.from('abonnements').update({ next_billing_date: newDate }).eq('id', rawId);
          return { ...a, nextBillingDate: newDate };
        }
        return a;
      }));
    }
    else if (id.startsWith('tx-rec-')) {
      const rawId = id.replace('tx-rec-', '').split('-')[0];
      setTransactions(prev => prev.map(t => {
        if (t.id === rawId) {
          if (client) client.from('transactions').update({ next_occurrence: newDate }).eq('id', rawId);
          return { ...t, nextOccurrence: newDate };
        }
        return t;
      }));
    }
    // 10. Agenda standard event
    else {
      setEvents(prev => prev.map(e => {
        if (e.id === id) {
          const timePart = e.dateTime.split('T')[1];
          return { ...e, dateTime: timePart ? `${newDate}T${timePart}` : newDate };
        }
        return e;
      }));
      if (client && foyer) {
        const currentEvent = events.find(e => e.id === id);
        if (currentEvent) {
          const timePart = currentEvent.dateTime.split('T')[1];
          const newDateTime = timePart ? `${newDate}T${timePart}` : newDate;
          await client.from('events').update({ date_time: newDateTime }).eq('foyer_id', foyer.id).eq('id', id);
        }
      }
    }
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette tâche ?")) {
      setTasks(prev => prev.filter(t => t.id !== id));
      try {
        const supabase = getSupabaseClient();
        if (supabase && foyer) {
          await supabase.from('chore_tasks').delete().eq('foyer_id', foyer.id).eq('id', id);
        }
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  const handleEditTask = (id: string, title: string, points: number, rotation: 'daily' | 'weekly' | 'none', assigneeId: string, assigneeName: string) => {
    setTasks(prev => prev.map(t => t.id === id ? {
      ...t,
      title,
      rewardPoints: points,
      rotation,
      assignedMemberId: assigneeId,
      assignedMemberName: assigneeName
    } : t));
  };

  const handleValidateTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        // Parent bank account to debit from
        const parentAccountId = accounts.find(a => a.type === 'bank')?.id || accounts[0]?.id || null;
        const client = getSupabaseClient();

        // Intercept reparation validation
        const linkedMalus = appliedMaluses.find(m => m.reparationTaskId === id);
        let refundStars = 0;
        if (linkedMalus && !linkedMalus.repaired) {
          refundStars = linkedMalus.starsRemoved;
          setAppliedMaluses(prev => prev.map(m => m.id === linkedMalus.id ? {
            ...m,
            repaired: true,
            repairedAt: new Date().toISOString()
          } : m));

          if (client) {
            client.from('malus_applied')
              .update({ repaired: true, repaired_at: new Date().toISOString() })
              .eq('id', linkedMalus.id)
              .then(({ error }) => {
                if (error) console.error("Error updating repaired status on malus_applied:", error);
              });
          }

          handleAddTransaction({
            amount: 0,
            type: 'income',
            category: 'Argent de Poche',
            date: new Date().toISOString().split('T')[0],
            title: `Rattrapage validé (+${refundStars} Pts) : ${t.title}`,
            memberName: t.assignedMemberName
          });
        }

        // Ajouter la récompense financière correspondante au budget épargne (points)
        // Ex: 10 points = 1.00 €
        handleAddTransaction({
          amount: t.rewardPoints / 10,
          type: 'savings',
          category: 'Argent de Poche',
          date: new Date().toISOString().split('T')[0],
          title: `Récompense (Points) : ${t.title}`,
          memberName: t.assignedMemberName
        });
        
        // Mettre à jour l'argent de poche de l'enfant
        if (t.assignedMemberId || t.assignedMemberName) {
          setPocketMoney(prev => prev.map(child => {
            if (child.id === t.assignedMemberId || child.name.toLowerCase() === t.assignedMemberName?.toLowerCase()) {
              let updatedBalance = child.balance;
              let pointsReward = child.points + t.rewardPoints + refundStars;

              // Si une récompense financière en cash (rewardAmount) est définie
              if (t.rewardAmount && t.rewardAmount > 0) {
                updatedBalance += t.rewardAmount;

                // Créer la transaction de débit parent / crédit enfant
                handleAddTransaction({
                  amount: t.rewardAmount,
                  type: 'expense',
                  category: 'Argent de Poche',
                  date: new Date().toISOString().split('T')[0],
                  title: `Tâche validée (Cash) : ${t.title}`,
                  memberName: t.assignedMemberName,
                  accountId: parentAccountId,
                  moduleSource: 'tasks'
                });
              }

              // Moteur d'allocations: Règle automatique "après mission"
              const afterMissionRules = (child.rules || []).filter(r => r.type === 'after_mission' && r.active);
              afterMissionRules.forEach(rule => {
                if (rule.amount && rule.amount > 0) {
                  updatedBalance += rule.amount;
                  handleAddTransaction({
                    amount: rule.amount,
                    type: 'expense',
                    category: 'Argent de Poche',
                    date: new Date().toISOString().split('T')[0],
                    title: `Règle auto après mission (€) : ${t.title}`,
                    memberName: child.name,
                    accountId: parentAccountId,
                    moduleSource: 'tasks'
                  });
                }
                if (rule.points && rule.points > 0) {
                  pointsReward += rule.points;
                  handleAddTransaction({
                    amount: rule.points / 10,
                    type: 'savings',
                    category: 'Argent de Poche',
                    date: new Date().toISOString().split('T')[0],
                    title: `Règle auto après mission (Points) : ${t.title}`,
                    memberName: child.name
                  });
                }
              });

              // Mettre à jour dans Supabase
              if (client) {
                client.from('pocket_money')
                  .update({ balance: updatedBalance, points: pointsReward })
                  .eq('id', child.id)
                  .then(({ error }) => {
                    if (error) console.error("Error updating child pocket money in Supabase:", error);
                  });
              }

              return {
                ...child,
                balance: updatedBalance,
                points: pointsReward
              };
            }
            return child;
          }));
        }
        
        const meta = parseChoreTitle(t.title);
        meta.status = 'validated';
        meta.isArchived = true;
        meta.title = meta.title || t.title;
        const serialized = serializeChoreTitle(meta);

        // Notify validated task
        sendLocalNotification(
          "Mission validée 🎉",
          `La mission "${meta.title || t.title}" a été validée par tes parents. Bien joué !`,
          "taches"
        );

        // Mettre à jour dans Supabase
        if (client) {
          client.from('chore_tasks')
            .update({ title: serialized, done: true, validated_by_parent: true })
            .eq('id', id)
            .then(({ error }) => {
              if (error) console.error("Error validating task in Supabase:", error);
            });
        }

        return { 
          ...t, 
          title: serialized, 
          done: true, 
          validatedByParent: true, 
          status: 'validated', 
          isArchived: true 
        };
      }
      return t;
    }));
  };

  const handleApplyWallTask = async (taskId: string, memberId: string) => {
    const memberObj = appMembers.find(m => m.id === memberId);
    const memberName = memberObj ? memberObj.name : 'Un membre';

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const meta = parseChoreTitle(t.title);
        const currentCandidates = meta.candidates || [];
        if (currentCandidates.includes(memberId)) return t;
        
        const newCandidates = [...currentCandidates, memberId];
        const updatedMeta = { ...meta, candidates: newCandidates };
        const serialized = serializeChoreTitle(updatedMeta);

        // Notify parents
        sendLocalNotification(
          "Nouvelle candidature 🙋‍♂️",
          `${memberName} a postulé pour la mission "${meta.title}".`,
          "taches"
        );

        return { ...t, title: serialized };
      }
      return t;
    }));
  };

  const handleAcceptCandidate = async (taskId: string, memberId: string) => {
    const memberObj = appMembers.find(m => m.id === memberId);
    const memberName = memberObj ? memberObj.name : 'Un membre';

    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;

      const meta = parseChoreTitle(task.title);
      const acceptedVolunteers = meta.acceptedVolunteers || [];
      const maxParticipants = meta.maxParticipants || 1;

      if (acceptedVolunteers.length >= maxParticipants) {
        alert("Le nombre maximum de participants a déjà été atteint pour cette mission.");
        return prev;
      }

      // Add to accepted, remove from candidates
      const updatedVolunteers = [...acceptedVolunteers, memberId];
      const updatedCandidates = (meta.candidates || []).filter(id => id !== memberId);
      
      const isFull = updatedVolunteers.length >= maxParticipants;
      const updatedMeta = { 
        ...meta, 
        acceptedVolunteers: updatedVolunteers, 
        candidates: updatedCandidates,
        isArchived: isFull ? true : meta.isArchived
      };
      const serializedWall = serializeChoreTitle(updatedMeta);

      // Create a cloned task for the child
      const cloneId = `tk-vol-${memberId}-${Date.now()}`;
      const clonedMeta = {
        title: meta.title,
        description: meta.description,
        priority: meta.priority,
        status: 'todo' as const,
        validationRequired: meta.validationRequired,
        isArchived: false,
        time: meta.time,
        rewardAmount: task.rewardAmount,
        assignedMemberIds: [memberId],
        recurrence: 'none' as const,
        attributionMode: 'single' as const,
        xpReward: meta.xpReward
      };
      const serializedClone = serializeChoreTitle(clonedMeta);

      const clonedTask: ChoreTask = {
        id: cloneId,
        title: serializedClone,
        rewardPoints: task.rewardPoints,
        assignedMemberId: memberId,
        assignedMemberName: memberName,
        done: false,
        rotation: 'none',
        validatedByParent: false,
        dueDate: task.dueDate,
        rewardAmount: task.rewardAmount
      };

      // Notify the child
      sendLocalNotification(
        "Candidature acceptée 🎉",
        `Félicitations ! Ta candidature pour la mission "${meta.title}" a été acceptée.`,
        "taches"
      );

      // Update task list
      return prev.map(t => t.id === taskId ? { ...t, title: serializedWall, isArchived: updatedMeta.isArchived } : t).concat(clonedTask);
    });
  };

  const handleRefuseCandidate = async (taskId: string, memberId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const meta = parseChoreTitle(t.title);
        const updatedCandidates = (meta.candidates || []).filter(id => id !== memberId);
        const updatedMeta = { ...meta, candidates: updatedCandidates };
        const serialized = serializeChoreTitle(updatedMeta);

        // Notify child
        sendLocalNotification(
          "Candidature refusée ⏳",
          `Ta candidature pour la mission "${meta.title}" n'a pas été retenue.`,
          "taches"
        );

        return { ...t, title: serialized };
      }
      return t;
    }));
  };

  const handleTakeWallTask = async (taskId: string, memberId: string) => {
    const memberObj = appMembers.find(m => m.id === memberId);
    const memberName = memberObj ? memberObj.name : 'Un membre';

    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;

      const meta = parseChoreTitle(task.title);
      const acceptedVolunteers = meta.acceptedVolunteers || [];
      const maxParticipants = meta.maxParticipants || 1;

      if (acceptedVolunteers.length >= maxParticipants) {
        alert("Cette mission a déjà été réservée.");
        return prev;
      }

      // Add to accepted
      const updatedVolunteers = [...acceptedVolunteers, memberId];
      const isFull = updatedVolunteers.length >= maxParticipants;
      const updatedMeta = { 
        ...meta, 
        acceptedVolunteers: updatedVolunteers, 
        isArchived: isFull ? true : meta.isArchived
      };
      const serializedWall = serializeChoreTitle(updatedMeta);

      // Create a cloned task for the child
      const cloneId = `tk-vol-${memberId}-${Date.now()}`;
      const clonedMeta = {
        title: meta.title,
        description: meta.description,
        priority: meta.priority,
        status: 'todo' as const,
        validationRequired: meta.validationRequired,
        isArchived: false,
        time: meta.time,
        rewardAmount: task.rewardAmount,
        assignedMemberIds: [memberId],
        recurrence: 'none' as const,
        attributionMode: 'single' as const,
        xpReward: meta.xpReward
      };
      const serializedClone = serializeChoreTitle(clonedMeta);

      const clonedTask: ChoreTask = {
        id: cloneId,
        title: serializedClone,
        rewardPoints: task.rewardPoints,
        assignedMemberId: memberId,
        assignedMemberName: memberName,
        done: false,
        rotation: 'none',
        validatedByParent: false,
        dueDate: task.dueDate,
        rewardAmount: task.rewardAmount
      };

      // Notify family/parent
      sendLocalNotification(
        "Mission réservée 🚀",
        `${memberName} a pris la mission "${meta.title}".`,
        "taches"
      );

      // Update task list
      return prev.map(t => t.id === taskId ? { ...t, title: serializedWall, isArchived: updatedMeta.isArchived } : t).concat(clonedTask);
    });
  };

  const handleToggleGrocery = async (id: string) => {
    const item = groceries.find(g => g.id === id);
    if (!item) return;

    const newCheckedVal = !item.checked;

    setGroceries(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, checked: newCheckedVal, inStock: newCheckedVal };
      }
      return g;
    }));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        const { data, error, count } = await client.from('groceries').update({ 
          checked: newCheckedVal,
          in_stock: newCheckedVal
        }, { count: 'exact' }).eq('foyer_id', foyer.id).eq('id', id).select();

        if (error) {
          console.error("[Groceries Toggle] Supabase error:", error.message, error.details, error.hint);
          setGroceries(prev => prev.map(g => {
            if (g.id === id) return { ...g, checked: !newCheckedVal, inStock: !newCheckedVal };
            return g;
          }));
        } else if (count === 0) {
          // Row doesn't exist in DB — insert it first, then it will work
          console.warn(`[Groceries Toggle] 0 rows matched for id=${id} — inserting row into DB`);
          await client.from('groceries').insert({
            id: item.id,
            foyer_id: foyer.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            checked: newCheckedVal,
            in_stock: newCheckedVal
          });
          console.log(`[Groceries Toggle] Inserted missing row id=${id}, checked=${newCheckedVal}`);
        } else {
          console.log(`[Groceries Toggle] OK — id=${id}, checked=${newCheckedVal}, returned JSON:`, JSON.stringify(data));
        }
      }
    }
  };

  const handleAddGroceryItem = async (
    name: string, 
    category: string, 
    qty: string, 
    meal?: string, 
    addedBy?: string, 
    isFavorite: boolean = false
  ) => {
    const id = `gr-${Date.now()}`;
    const activeMember = members.find(m => m.id === activeMemberId);
    const defaultAddedBy = addedBy || activeMember?.name || 'Foyer';
    const newItem: GroceryItem = {
      id,
      name,
      category,
      quantity: qty,
      checked: false,
      inStock: false,
      meal,
      addedBy: defaultAddedBy,
      isFavorite
    };

    setGroceries(prev => [newItem, ...prev]);
    setActiveToast({
      title: "Article ajouté aux courses",
      description: `L'article "${name}" (qté: ${qty || '1'}) a été ajouté aux courses.`
    });

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const groceryPayload = {
            id,
            foyer_id: foyer.id,
            name,
            category,
            quantity: qty,
            checked: false,
            in_stock: false,
            meal: meal || null,
            added_by: defaultAddedBy,
            is_favorite: isFavorite,
            sender_user_id: user?.id || null,
            sender_member_id: activeMemberId,
            sender_name: defaultAddedBy
          };
          const { error } = await client.from('groceries').insert(groceryPayload);
          if (error) {
            console.warn("[Groceries Add] Full insert failed, retrying with base columns:", error.message);
            const { error: fallbackError } = await client.from('groceries').insert({
              id,
              foyer_id: foyer.id,
              name,
              category,
              quantity: qty,
              checked: false,
              in_stock: false
            });
            if (fallbackError) throw fallbackError;
          }
        } catch (err) {
          console.error("Erreur lors de l'ajout cloud de la course :", err);
          setGroceries(prev => prev.filter(g => g.id !== id));
          setActiveToast({
            title: "Ajout impossible",
            description: "L'article n'a pas pu être enregistré dans la liste partagée."
          });
        }
      }
    }
  };

  const handleToggleFavoriteGrocery = async (id: string) => {
    const item = groceries.find(g => g.id === id);
    if (!item) return;

    const newFavVal = !item.isFavorite;

    setGroceries(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, isFavorite: newFavVal };
      }
      return g;
    }));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('groceries').update({ 
            is_favorite: newFavVal
          }).eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la modification favorite de la course :", err);
        }
      }
    }
  };

  const handleArchiveCurrentList = async (name: string, store?: string) => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) return;

    const listId = `al-${Date.now()}`;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const activeMember = members.find(m => m.id === activeMemberId);
    const currentMemberName = activeMember?.name || 'Foyer';

    const newList: ArchivedList = {
      id: listId,
      name,
      date: dateStr,
      items: [...groceries],
      store: store || undefined,
      createdBy: currentMemberName
    };

    setArchivedLists(prev => [newList, ...prev]);

    try {
      await client.from('archived_lists').insert({
        id: listId,
        foyer_id: foyer.id,
        name,
        date: dateStr,
        items: groceries,
        store: store || null,
        created_by: currentMemberName
      });
    } catch (err) {
      console.error("Erreur lors de l'archivage cloud :", err);
    }
  };

  const handleReuseArchivedList = async (listId: string) => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) return;

    const list = archivedLists.find(l => l.id === listId);
    if (!list) return;

    const newItemsToInsert: GroceryItem[] = list.items.map((item, idx) => ({
      id: `gr-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      checked: false,
      inStock: false,
      meal: item.meal,
      addedBy: item.addedBy,
      isFavorite: item.isFavorite
    }));

    setGroceries(prev => [...newItemsToInsert, ...prev]);

    try {
      const inserts = newItemsToInsert.map(item => ({
        id: item.id,
        foyer_id: foyer.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        checked: false,
        in_stock: false,
        meal: item.meal || null,
        added_by: item.addedBy || null,
        is_favorite: !!item.isFavorite
      }));
      await client.from('groceries').insert(inserts);
    } catch (err) {
      console.error("Erreur lors de la réutilisation de la liste :", err);
    }
  };

  const handleDeleteArchivedList = async (listId: string) => {
    setArchivedLists(prev => prev.filter(l => l.id !== listId));
    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('archived_lists').delete().eq('foyer_id', foyer.id).eq('id', listId);
        } catch (err) {
          console.error("Erreur lors de la suppression de la liste archivée :", err);
        }
      }
    }
  };

  const handleCleanGroceryList = async (option: 'checked' | 'all' | 'archive_first' | 'favorites_only') => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) return;

    let itemsToDelete: GroceryItem[] = [];
    let remainingItems: GroceryItem[] = [];

    if (option === 'checked') {
      itemsToDelete = groceries.filter(g => g.checked);
      remainingItems = groceries.filter(g => !g.checked);
    } else if (option === 'all') {
      itemsToDelete = [...groceries];
      remainingItems = [];
    } else if (option === 'favorites_only') {
      itemsToDelete = groceries.filter(g => !g.isFavorite);
      remainingItems = groceries.filter(g => g.isFavorite);
    }

    setGroceries(remainingItems);

    if (itemsToDelete.length > 0) {
      try {
        const ids = itemsToDelete.map(g => g.id);
        await client.from('groceries').delete().eq('foyer_id', foyer.id).in('id', ids);
      } catch (err) {
        console.error("Erreur lors du nettoyage de la liste :", err);
      }
    }
  };

  const handleDeleteGroceryItem = async (id: string) => {
    setGroceries(prev => prev.filter(g => g.id !== id));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('groceries').delete().eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la suppression cloud de la course :", err);
        }
      }
    }
  };

  const handleEditGroceryItem = async (id: string, name: string, qty: string) => {
    setGroceries(prev => prev.map(g => g.id === id ? { ...g, name, quantity: qty } : g));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('groceries').update({ name, quantity: qty }).eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la modification cloud de la course :", err);
        }
      }
    }
  };

  const handleAddMemory = async (newMemory: MemoryLog) => {
    setMemories(prev => {
      if (prev.some(m => m.id === newMemory.id)) return prev;
      return [newMemory, ...prev];
    });

    // Generate a beautiful persistent notification alert locally
    const newAlert = {
      id: `a-mem-${Date.now()}-by-${activeMemberId}`,
      title: `📸 Nouveau moment partagé par ${newMemory.authorName} !`,
      description: `« ${newMemory.title} » a été ajouté au Mur des Moments.`,
      time: 'À l\'instant',
      type: 'info' as const,
      read: false,
      module: 'capsule'
    };
    setAlerts(prev => [newAlert, ...prev]);
    saveAlertToCloud(newAlert);

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('memories').insert({
            id: newMemory.id,
            foyer_id: foyer.id,
            date: newMemory.date || "Aujourd'hui",
            title: newMemory.title,
            description: newMemory.description || '',
            image_url: newMemory.imageUrl,
            image_urls: newMemory.imageUrls?.filter(Boolean) || (newMemory.imageUrl ? [newMemory.imageUrl] : []),
            author_name: newMemory.authorName,
            author_photo: newMemory.authorPhoto || '',
            likes_count: newMemory.likesCount || 0,
            is_private: newMemory.isPrivate || false,
            theme: newMemory.theme || '🏖️ Famille'
          });
        } catch (err) {
          console.error("Erreur lors de l'ajout cloud du souvenir :", err);
        }
      }
    }
  };

  const handleDeleteMemory = async (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('memories').delete().eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la suppression cloud du souvenir :", err);
        }
      }
    }
  };

  const handleLikeMemory = async (id: string, newLikesCount: number) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, likesCount: newLikesCount } : m));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('memories').update({ likes_count: newLikesCount }).eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors du like cloud du souvenir :", err);
        }
      }
    }
  };

  const clearAllStatesAndCache = async () => {
    setFoyer(null);
    setMyMemberProfile(null);
    setOnboardingActive(false);
    
    // Backup custom Supabase settings if they exist to prevent user having to re-enter them
    const sbUrl = localStorage.getItem('mf_sb_url');
    const sbKey = localStorage.getItem('mf_sb_key');

    // Clear localStorage synchronously
    localStorage.clear();

    if (sbUrl) localStorage.setItem('mf_sb_url', sbUrl);
    if (sbKey) localStorage.setItem('mf_sb_key', sbKey);

    try {
      // Clear all Capacitor Preferences in a single native operation
      await Preferences.clear();
      // Restore custom Supabase settings to Preferences if they existed
      if (sbUrl) await Preferences.set({ key: 'mf_sb_url', value: sbUrl });
      if (sbKey) await Preferences.set({ key: 'mf_sb_key', value: sbKey });
    } catch (e) {
      console.warn("Preferences clear error:", e);
    }

    // Reset states to empty arrays or defaults
    setMembers([]);
    setEvents([]);
    setGroceries([]);
    setArchivedLists([]);
    setTransactions([]);
    setDocuments([]);
    setDishes([]);
    setTasks([]);
    setSavingGoals([]);
    setAlerts([]);
    setMemories([]);
    setVotes([]);
    setSchoolTasks([]);
    setChatGroups([]);
    setChatMessages([]);
    setDemarches([]);
    setJustificatifPacks([]);
    setVehicles([]);
    setMaintenance([]);
    setTrips([]);
    setPets([]);
    setPocketMoney([]);
    setArtisans([]);
    setGrades([]);
    setSchedule([]);
    setCustomCategories([]);
    setAccounts([]);
    setAbonnements([]);
    setDebts([]);
    setSyncActive(false);
  };

  const handleResetData = () => {
    const client = getSupabaseClient();
    if (client) {
      client.auth.signOut().catch(err => console.warn("SignOut during reset warning:", err));
    }
    clearAllStatesAndCache().then(() => {
      alert('Système réinitialisé avec succès !');
    });
  };

  const handleWelcomeCreateFoyer = async () => {
    setWelcomeLoading(true);
    setWelcomeError(null);
    try {
      const lastName = user?.user_metadata?.last_name || '';
      const firstName = user?.user_metadata?.first_name || user?.user_metadata?.display_name || 'Utilisateur';
      const familyName = lastName ? `Famille ${lastName}` : `Famille de ${firstName}`;
      
      const res = await foyerService.createFoyer(familyName, firstName, false);
      
      const newFoyerObj: Foyer = {
        id: res.foyer_id,
        name: familyName,
        inviteCode: res.invite_code,
        inviteLink: `mafamille.app/join/${res.invite_code}`,
        createdBy: user?.id || '',
        createdAt: new Date().toISOString(),
        isPremium: false,
        maxMembers: 3
      };
      
      setWelcomeCreatedFoyer(newFoyerObj);
      setWelcomeScreenMode('success');
    } catch (err: LooseValue) {
      console.error(err);
      setWelcomeError(err.message || "Impossible de créer le foyer.");
    } finally {
      setWelcomeLoading(false);
    }
  };

  const handleWelcomeJoinFoyer = async () => {
    if (!welcomeInviteCode.trim()) {
      setWelcomeError("Veuillez entrer un code d'invitation.");
      return;
    }
    if (!welcomeDisplayName.trim()) {
      setWelcomeError("Veuillez entrer votre nom d'affichage.");
      return;
    }
    setWelcomeLoading(true);
    setWelcomeError(null);
    try {
      const email = user?.email || '';
      const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${welcomeDisplayName.trim()}`;
      
      await foyerService.sendJoinRequest(
        welcomeInviteCode.trim(), 
        welcomeDisplayName.trim(), 
        email, 
        avatar,
        false
      );
      alert("🎉 Votre demande d'adhésion a été envoyée ! Elle sera soumise à validation du Chef de famille.");
      
      const joinRequests = await foyerService.getMyJoinRequests();
      const activeReq = joinRequests.find(r => r.status === 'pending' || r.status === 'rejected');
      setMyActiveRequest(activeReq || null);
      
      setShowWelcomeScreen(false);
    } catch (err: LooseValue) {
      console.error(err);
      setWelcomeError(err.message || "Code invalide ou impossible de rejoindre.");
    } finally {
      setWelcomeLoading(false);
    }
  };
  const handleWelcomeSuccessFinish = async () => {
    if (!welcomeCreatedFoyer) return;
    setWelcomeLoading(true);
    try {
      let list: LooseValue[] = [];
      let newlyCreated = null;

      // Retry up to 6 times (with 500ms delay) to handle DB replication latency
      for (let attempt = 1; attempt <= 6; attempt++) {
        console.log(`[Onboarding] Attempt ${attempt} to fetch the newly created foyer...`);
        list = await foyerService.getMyFoyers();
        newlyCreated = list.find(f => f.foyer.id === welcomeCreatedFoyer.id);
        if (newlyCreated) {
          console.log(`[Onboarding] Newly created foyer found on attempt ${attempt}.`);
          break;
        }
        if (attempt < 6) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (newlyCreated) {
        setMyFoyers(list);
        setFoyer(newlyCreated.foyer);
        setMyMemberProfile(newlyCreated.member);
        setActiveMemberId(newlyCreated.member.id);
        localStorage.setItem('mf_cloud_foyer_id', newlyCreated.foyer.id);
        localStorage.setItem('mf_active_foyer_id', newlyCreated.foyer.id);
        await loadFoyerData(newlyCreated.foyer.id);
        setShowWelcomeScreen(false);
      } else {
        console.warn("[Onboarding] Foyer not yet found in list. Informing user to retry.");
        alert("La synchronisation de votre nouveau foyer prend un peu plus de temps que prévu. Veuillez cliquer à nouveau sur 'Commencer' pour réessayer.");
      }
    } catch (err) {
      console.error("Error finalizing success screen:", err);
      alert("Une erreur est survenue lors de la synchronisation de votre foyer. Veuillez réessayer.");
    } finally {
      setWelcomeLoading(false);
    }
  };
  const handleLogout = async () => {
    const client = getSupabaseClient();
    if (client) {
      client.auth.signOut().catch((err: unknown) => {
        console.warn("Supabase signOut error (proceeding with local cleanup):", err);
      });
    }
    await clearAllStatesAndCache();
    alert("Déconnexion réussie.");
  };

  const handlePurgeDemoData = async () => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) {
      alert("Erreur de connexion à Supabase.");
      return;
    }

    const confirmPurge = window.confirm(
      "Voulez-vous vraiment purger les anciennes données d'exemple MyFamily+ de votre base de données en ligne ? \n\n" +
      "Les données personnelles que vous avez créées vous-même ne seront pas supprimées."
    );
    if (!confirmPurge) return;

    try {
      const tableDemoIds: Record<string, string[]> = {
        events: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
        transactions: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9'],
        groceries: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'],
        dishes: ['di1', 'di2', 'di3', 'di4', 'di5', 'di6', 'di7', 'di8', 'di9', 'di10', 'di11', 'di12', 'di13', 'di14'],
        chore_tasks: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'],
        saving_goals: ['sg1', 'sg2', 'sg3'],
        alerts: ['a0', 'a1', 'a2', 'a3', 'a4'],
        memories: ['mem-1', 'mem-2'],
        votes: ['vote-1', 'vote-2'],
        school_tasks: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5'],
        chat_groups: ['g_family', 'g_parents'],
        chat_messages: ['m1', 'm2', 'm3'],
        demarches: ['dem-1'],
        justificatif_packs: ['pack-1'],
        vehicles: ['v1', 'v2'],
        maintenance: ['hm1', 'hm2'],
        trips: ['tr1'],
        pets: ['p1']
      };

      for (const [table, ids] of Object.entries(tableDemoIds)) {
        await client.from(table).delete().eq('foyer_id', foyer.id).in('id', ids);
      }

      if (myMemberProfile) {
        await client.from('foyer_members')
          .delete()
          .eq('foyer_id', foyer.id)
          .neq('id', myMemberProfile.id)
          .in('display_name', ['Papa Amadou', 'Maman Yatta', 'Amadou', 'Awa', 'Yatta']);
      }

      await loadFoyerData(foyer.id);
      localStorage.removeItem('school_grades');
      localStorage.removeItem('school_schedule');
      setGrades([]);
      setSchedule([]);
      alert("✨ Toutes les données d'exemples et de démonstration ont été purgées avec succès de votre compte en ligne !");
    } catch (err: LooseValue) {
      console.error(err);
      alert("Erreur lors de la purge : " + err.message);
    }
  };

  const handleClearAllFoyerData = async () => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) {
      alert("Erreur de connexion à Supabase.");
      return;
    }

    const confirmClear = window.confirm(
      "⚠️ DANGER : Êtes-vous ABSOLUMENT sûr de vouloir vider ENTIÈREMENT votre foyer en ligne ?\n\n" +
      "Toutes vos données (événements, transactions, tâches, documents, etc.) seront supprimées définitivement de la base de données. Cette action est irréversible !"
    );
    if (!confirmClear) return;

    try {
      const tables = [
        'events', 'transactions', 'groceries', 'dishes', 'chore_tasks', 
        'saving_goals', 'alerts', 'memories', 'votes', 'school_tasks', 
        'chat_groups', 'chat_messages', 'demarches', 'justificatif_packs', 
        'vehicles', 'maintenance', 'trips', 'pets', 'pocket_money', 'documents'
      ];

      for (const table of tables) {
        await client.from(table).delete().eq('foyer_id', foyer.id);
      }

      if (myMemberProfile) {
        await client.from('foyer_members')
          .delete()
          .eq('foyer_id', foyer.id)
          .neq('id', myMemberProfile.id);
      }

      await loadFoyerData(foyer.id);
      localStorage.removeItem('school_grades');
      localStorage.removeItem('school_schedule');
      setGrades([]);
      setSchedule([]);
      alert("🗑️ Votre foyer en ligne a été entièrement vidé et réinitialisé avec succès !");
    } catch (err: LooseValue) {
      console.error(err);
      alert("Erreur lors de la remise à zéro : " + err.message);
    }
  };

  // ----------------------------------------------------
  // Dynamic Tab Router Panel
  // ----------------------------------------------------  // View rendering logic
  const renderContent = () => {
    const appFoyer = foyer;
    const appMembers = members;
    const appActiveMemberId = activeMemberId;
    const appActiveMemberObj = appMembers.find(m => m.id === appActiveMemberId);
    const appTransactions = transactions;
    const appVaccines = vaccines;
    const appTrips = trips;
    const appGroceries = groceries;
    const appTasks = tasks;
    const appDocuments = documents;
    const appVehicles = vehicles;
    const appMaintenance = maintenance;
    const appPets = pets;
    const appDemarches = demarches;
    const appVotes = votes;
    const appSavingGoals = savingGoals;
    const appPocketMoney = pocketMoney;
    const appFilteredAlerts = filteredAlerts;
    const appEvents = unifiedEvents;

    if (sharedPackId) {
      const pack = justificatifPacks.find(p => p.id === sharedPackId);
      if (pack) {
        return <SharedPackView pack={pack} documents={documents} />;
      }
      return (
        <div className="min-h-screen bg-[#07111F] text-white flex flex-col items-center justify-center p-4">
          <div className="glass-panel border-red-500/20 p-6 rounded-[28px] text-center max-w-sm">
            <h2 className="text-lg font-bold text-[#FF4D6D] mb-2">Dossier introuvable</h2>
            <p className="text-sm text-white/50 mb-6">Ce lien de partage est invalide ou le dossier a été supprimé par son propriétaire.</p>
            <button onClick={() => window.location.hash = ''} className="px-6 py-3 bg-[#6C5CFF] rounded-xl text-sm font-bold shadow-lg">Retour à l'accueil</button>
          </div>
        </div>
      );
    }

    if (!foyer) {
      return (
        <div className="min-h-screen bg-[#07111F] text-white flex flex-col font-sans relative overflow-hidden">
          {/* Background decorative glows */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#6C5CFF]/10 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#FF4D6D]/10 blur-[130px] pointer-events-none" />

          {/* Header bar */}
          <header className="w-full max-w-4xl mx-auto px-6 pt-6 pb-2 flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70">
                MyFamily+
              </h1>
            </div>
            
            <button
              onClick={() => {
                setActiveTab('menu');
                setActiveModule('settings');
              }}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer font-sans"
            >
              <SettingsIcon className="w-5 h-5 text-white/70" />
            </button>
          </header>

          {/* Main Empty State Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto relative z-10 text-center space-y-8">
            <div className="space-y-4">
              {/* Premium Icon Ring */}
              <div className="inline-flex p-5 rounded-[32px] bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-[0_10px_25px_rgba(108,92,255,0.3)] animate-pulse">
                <span className="text-4xl">🏠</span>
              </div>
              
              <div className="space-y-2 font-sans">
                <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Aucun foyer actif
                </h2>
                <p className="text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
                  Vous êtes connecté à votre compte unique MyFamily+, mais vous ne faites partie d'aucun foyer pour le moment.
                </p>
              </div>
            </div>

            {/* Actions Card */}
            <div className="w-full glass-panel border border-white/8 rounded-[28px] p-6 space-y-4 shadow-2xl">
              <span className="text-[10px] font-black text-[#6C5CFF] uppercase tracking-widest block font-sans">
                Commencer l'aventure 🚀
              </span>
              
              <div className="space-y-3 font-sans">
                <button
                  onClick={() => {
                    setWelcomeError(null);
                    setWelcomeScreenMode('create');
                    setShowWelcomeScreen(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#6C5CFF]/15 active:scale-97 hover:opacity-95 transition-all cursor-pointer"
                >
                  🏠 Créer une Famille
                </button>

                <button
                  onClick={() => {
                    setWelcomeError(null);
                    setWelcomeScreenMode('join');
                    setShowWelcomeScreen(true);
                  }}
                  className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white font-extrabold text-xs uppercase tracking-wider active:scale-97 transition-all cursor-pointer"
                >
                  👨‍👩‍👧‍👦 Rejoindre une Famille
                </button>
              </div>
              
              <p className="text-[9.5px] text-white/40 leading-normal max-w-[300px] mx-auto pt-1 font-sans">
                La création d'un foyer vous nomme Chef de famille. Si vous rejoignez un foyer existant, une validation par un parent sera requise.
              </p>
            </div>

            {/* Logout/Account button */}
            <button
              onClick={handleLogout}
              className="py-2.5 px-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white font-bold text-xs transition-all cursor-pointer font-sans"
            >
              Se déconnecter / Autre compte
            </button>
          </main>
        </div>
      );
    }

    let isTeen = false;
    if (appActiveMemberObj) {
      const rClean = (appActiveMemberObj.role || '').toLowerCase();
      if (rClean === 'adolescent' || rClean.includes('adolescent')) {
        isTeen = true;
      } else {
        const ageNum = parseInt(appActiveMemberObj.age || '0');
        if (ageNum >= 11 && ageNum < 18) isTeen = true;
      }
    }
    if (isTeen && appActiveMemberObj) {
      return (
        <TeenDashboard 
          member={appActiveMemberObj}
          members={appMembers}
          foyer={appFoyer}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          malusTemplates={malusTemplates}
          setMalusTemplates={setMalusTemplates}
          appliedMaluses={appliedMaluses}
          setAppliedMaluses={setAppliedMaluses}
          tasks={appTasks}
          setTasks={setTasks}
          schoolTasks={schoolTasks}
          setSchoolTasks={setSchoolTasks}
          pocketMoney={appPocketMoney}
          setPocketMoney={setPocketMoney}
          events={appEvents as LooseValue}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleEditTask}
          onValidateTask={handleValidateTask}
          onApplyWallTask={handleApplyWallTask}
          onAcceptCandidate={handleAcceptCandidate}
          onRefuseCandidate={handleRefuseCandidate}
          onTakeWallTask={handleTakeWallTask}
          onSendNotification={sendLocalNotification}
          onToggleTask={handleToggleTask}
          goals={appSavingGoals}
          setSavingGoals={setSavingGoals}
          transactions={appTransactions}
          setTransactions={setTransactions}
          alerts={appFilteredAlerts}
          setAlerts={setAlerts}
          onAddTransaction={handleAddTransaction}
          onAddEvent={handleAddEvent}
          memories={memories}
          setMemories={setMemories}
          votes={appVotes}
          setVotes={setVotes}
          grades={grades}
          setGrades={setGrades}
          schedule={schedule}
          setSchedule={setSchedule}
          dishes={dishes}
          setDishes={setDishes}
          isPremium={isPremium}
          onTriggerPaywall={() => setPaywallOpen(true)}
          accounts={accounts}
          onOpenProfileSwitcher={() => setProfileSwitcherOpen(true)}
          chatGroups={chatGroups}
          setChatGroups={setChatGroups}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          initialChatGroupId={initialChatGroupId}
          setInitialChatGroupId={setInitialChatGroupId}
          trips={appTrips}
          setTrips={setTrips}
          documents={appDocuments}
          setDocuments={setDocuments}
          communeName={communeName}
          schoolName={schoolName}
          onToggleEventDone={handleToggleEventDone}
          onMoveEvent={handleMoveEvent}
        />
      );
    }
    if (activeTab === 'accueil') {
      let isKid = false;
      if (appActiveMemberObj) {
        const rClean = (appActiveMemberObj.role || '').toLowerCase();
        if (rClean === 'enfant' || rClean.includes('enfant')) {
          isKid = true;
        } else {
          const ageNum = parseInt(appActiveMemberObj.age || '0');
          if (ageNum > 0 && ageNum < 11) isKid = true;
        }
      }
      
      if (isKid && appActiveMemberObj) {
        return (
          <KidsDashboard 
            member={appActiveMemberObj}
            tasks={appTasks}
            setTasks={setTasks}
            pocketMoney={appPocketMoney}
            events={appEvents as LooseValue}
            setActiveTab={setActiveTab}
            setActiveModule={setActiveModule}
            trips={appTrips}
            schoolTasks={schoolTasks}
            dishes={dishes}
            votes={appVotes}
            memories={memories}
            members={appMembers}
            foyer={appFoyer}
            documents={appDocuments}
            transactions={appTransactions}
            goals={appSavingGoals}
            alerts={appFilteredAlerts}
            onOpenProfileSwitcher={() => setProfileSwitcherOpen(true)}
          />
        );
      }
      return (
        <Accueil 
          members={appMembers}
          activeMemberId={appActiveMemberId}
          onProfileSwitcherOpen={() => setProfileSwitcherOpen(true)}
          onAvatarClick={() => setProfileSwitcherOpen(true)}
          events={appEvents as LooseValue}
          dishes={dishes}
          tasks={appTasks}
          groceries={appGroceries}
          transactions={appTransactions}
          trips={appTrips}
          documents={appDocuments}
          schoolTasks={schoolTasks}
          alerts={appFilteredAlerts}
          setActiveTab={setActiveTab}
          setActiveModule={setActiveModule}
          onMenuClick={() => setSidebarOpen(true)}
          onAlertsClick={() => setAlertsPanelOpen(true)}
          chatGroups={chatGroups}
          chatMessages={chatMessages}
          onEventClick={(dateStr) => {
            setAgendaSelectedDate(dateStr.split('T')[0]);
            setActiveTab('menu');
            setActiveModule('agenda');
          }}
          memories={memories}
          onAddMemory={handleAddMemory}
          onDeleteMemory={handleDeleteMemory}
          onLikeMemory={handleLikeMemory}
          savingGoals={appSavingGoals}
          onDeleteUnifiedEvent={handleDeleteUnifiedEvent}
          onArchiveUnifiedEvent={handleArchiveUnifiedEvent}
          activeFamilyName={appFoyer?.name}
          activeFoyerId={appFoyer?.id}
          onOpenSpaceSelector={() => setSpaceSelectorOpen(true)}
          smartPreferences={smartFamilyPrefs}
          onGlobalSearchResultOpen={handleGlobalSearchResultOpen}
        />
      );
    }

    if (activeTab === 'timeline') {
      return (
        <Timeline 
          events={appEvents as LooseValue}
          transactions={appTransactions}
          vaccines={appVaccines}
          trips={appTrips}
          documents={appDocuments}
          groceries={appGroceries}
          tasks={appTasks}
          demarches={appDemarches}
          vehicles={appVehicles}
          maintenance={appMaintenance}
          pets={appPets}
          votes={appVotes}
          members={appMembers}
          activeMemberId={appActiveMemberId}
          onBack={() => setActiveTab('accueil')}
        />
      );
    }

    if (activeTab === 'budget') {
      return (
        <Budget 
          transactions={appTransactions}
          setTransactions={setTransactions}
          savingGoals={appSavingGoals}
          setSavingGoals={setSavingGoals}
          members={appMembers}
          activeMemberId={appActiveMemberId}
          currencySymbol={getCurrencySymbol()}
          formatMoney={formatMoney}
          onAddTransactionClick={() => {
            setActiveModule('');
            setQuickActionsOpen(true);
          }}
          onAddTransaction={handleAddTransaction}
          foyerId={foyer?.id || ''}
          userId={user?.id || ''}
          myMemberProfile={myMemberProfile}
          customCategories={customCategories}
          setCustomCategories={setCustomCategories}
          accounts={accounts}
          setAccounts={setAccounts}
          abonnements={abonnements}
          setAbonnements={setAbonnements}
          debts={debts}
          setDebts={setDebts}
          activeSubView={budgetActiveSubView}
          onClearActiveSubView={() => setBudgetActiveSubView(null)}
          moduleBudgets={moduleBudgets}
          setModuleBudgets={setModuleBudgets}
          isPremium={isPremium}
          onTriggerPaywall={() => setPaywallOpen(true)}
        />
      );
    }

    if (activeTab === 'menu') {
      let isKid = false;
      if (appActiveMemberObj) {
        const rClean = (appActiveMemberObj.role || '').toLowerCase();
        if (rClean === 'enfant' || rClean.includes('enfant')) {
          isKid = true;
        } else {
          const ageNum = parseInt(appActiveMemberObj.age || '0');
          if (ageNum > 0 && ageNum < 11) isKid = true;
        }
      }

      if (isKid) {
        if (activeModule === '') {
          setTimeout(() => {
            setActiveTab('accueil');
          }, 0);
          return null;
        }
        if (activeModule === 'taches' || activeModule === 'argent' || activeModule === 'boutique') {
          return (
            <KidMissions 
              member={appActiveMemberObj!}
              tasks={appTasks}
              setTasks={setTasks}
              pocketMoney={appPocketMoney}
              setPocketMoney={setPocketMoney}
              appliedMaluses={appliedMaluses}
              setAppliedMaluses={setAppliedMaluses}
              onBack={() => setActiveModule('')}
              defaultTab={activeModule === 'argent' ? 'argent' : activeModule === 'boutique' ? 'boutique' : 'missions'}
              setAlerts={setAlerts}
              alerts={appFilteredAlerts}
              foyer={appFoyer}
              transactions={appTransactions}
              setTransactions={setTransactions}
              savingGoals={savingGoals}
              setSavingGoals={setSavingGoals}
              onApplyWallTask={handleApplyWallTask}
              onTakeWallTask={handleTakeWallTask}
              onSendNotification={sendLocalNotification}
            />
          );
        }
        if (activeModule === 'ecole') {
          return (
            <KidSchool 
              member={appActiveMemberObj!}
              schoolTasks={schoolTasks}
              setSchoolTasks={setSchoolTasks}
              dishes={dishes}
              grades={grades}
              setGrades={setGrades}
              schedule={schedule}
              setSchedule={setSchedule}
              events={events}
              members={appMembers}
              isPremium={isPremium}
              onTriggerPaywall={() => setPaywallOpen(true)}
              onBack={() => setActiveModule('')}
            />
          );
        }
        if (activeModule === 'conteur') {
          return (
            <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB020]/10 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />
              
              {/* Kid Header */}
              <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setActiveModule('')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>🌙</span>
                      <span>Histoires du Soir</span>
                    </h1>
                    <p className="text-xs text-white/55 font-bold">Crée ton conte magique avec l'IA !</p>
                  </div>
                </div>
              </div>

              <ConteurIA 
                member={appActiveMemberObj!}
                members={appMembers}
                isPremium={isPremium}
                onTriggerPaywall={() => setPaywallOpen(true)}
                onBack={() => setActiveModule('')}
                isKidMode={true}
              />
            </div>
          );
        }

        if (activeModule === 'carte') {
          return (
            <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00D26A]/10 blur-[100px] pointer-events-none" />
              
              {/* Kid Header */}
              <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-4">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setActiveModule('')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>🗺️</span>
                      <span>Carte de la Famille</span>
                    </h1>
                    <p className="text-xs text-white/55 font-bold">Retrouve ta famille en toute sécurité !</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] overflow-hidden border border-white/10 shadow-2xl h-[calc(100vh-220px)] relative z-10">
                <FamilyMap 
                  members={appMembers} 
                  activeMemberId={appActiveMemberId} 
                  onUpdateMemberProfile={handleUpdateMemberProfile} 
                />
              </div>
            </div>
          );
        }

        if (activeModule === 'courses') {
          return (
            <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB020]/10 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />
              
              {/* Kid Header */}
              <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setActiveModule('')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>🛒</span>
                      <span>Courses de la Famille</span>
                    </h1>
                    <p className="text-xs text-white/55 font-bold font-sans">Aide tes parents à faire les courses !</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <MenuHub 
                  foyer={appFoyer}
                  memberPermissions={memberPermissions}
                  malusTemplates={malusTemplates}
                  setMalusTemplates={setMalusTemplates}
                  appliedMaluses={appliedMaluses}
                  setAppliedMaluses={setAppliedMaluses}
                  initialChatGroupId={initialChatGroupId}
                  documents={appDocuments}
                  setDocuments={setDocuments}
                  tasks={appTasks}
                  groceries={appGroceries}
                  externalGroceryFilter={externalGroceryFilter}
                  members={appMembers}
                  setMembers={setMembers}
                  vehicles={appVehicles}
                  setVehicles={setVehicles}
                  maintenance={appMaintenance}
                  setMaintenance={setMaintenance}
                  trips={appTrips}
                  setTrips={setTrips}
                  pets={appPets}
                  setPets={setPets}
                  pocketMoney={appPocketMoney}
                  setPocketMoney={setPocketMoney}
                  artisans={artisans}
                  setArtisans={setArtisans}
                  onUpdateMemberProfile={handleUpdateMemberProfile}
                  goals={appSavingGoals}
                  transactions={appTransactions}
                  setTransactions={setTransactions}
                  alerts={appFilteredAlerts}
                  setAlerts={setAlerts}
                  currencySymbol={getCurrencySymbol()}
                  formatMoney={formatMoney}
                  activeModule={activeModule}
                  setActiveModule={setActiveModule}
                  vaccines={appVaccines}
                  setVaccines={setVaccines}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleEditTask}
                  onAddGrocery={handleToggleGrocery}
                  onToggleTask={handleToggleTask}
                  onValidateTask={handleValidateTask}
                  onAcceptCandidate={handleAcceptCandidate}
                  onRefuseCandidate={handleRefuseCandidate}
                  onSendNotification={sendLocalNotification}
                  onToggleGrocery={handleToggleGrocery}
                  onAddGroceryItem={handleAddGroceryItem}
                  onDeleteGroceryItem={handleDeleteGroceryItem}
                  onEditGroceryItem={handleEditGroceryItem}
                  setActiveTab={setActiveTab}
                  activeMemberId={appActiveMemberId}
                  archivedLists={archivedLists}
                  onArchiveCurrentList={handleArchiveCurrentList}
                  onReuseArchivedList={handleReuseArchivedList}
                  onDeleteArchivedList={handleDeleteArchivedList}
                  onCleanGroceryList={handleCleanGroceryList}
                  onToggleFavoriteGrocery={handleToggleFavoriteGrocery}
                  chatGroups={chatGroups}
                  setChatGroups={setChatGroups}
                  chatMessages={chatMessages}
                  setChatMessages={setChatMessages}
                  demarches={appDemarches}
                  setDemarches={setDemarches}
                  justificatifPacks={justificatifPacks}
                  setJustificatifPacks={setJustificatifPacks}
                  onAddTransaction={handleAddTransaction}
                  onAddEventDirect={handleAddEvent}
                  onAddEvent={handleAddEvent}
                  memories={memories}
                  setMemories={setMemories}
                  votes={appVotes}
                  setVotes={setVotes}
                  schoolTasks={schoolTasks}
                  setSchoolTasks={setSchoolTasks}
                  grades={grades}
                  setGrades={setGrades}
                  schedule={schedule}
                  setSchedule={setSchedule}
                  dishes={dishes}
                  setDishes={setDishes}
                  isPremium={isPremium}
                  setIsPremium={setIsPremium}
                  onTriggerPaywall={() => setPaywallOpen(true)}
                  accounts={accounts}
                  isKidMode={true}
                />
              </div>
            </div>
          );
        }
        if (activeModule === 'membres') {
          return (
            <KidProfile 
              member={appActiveMemberObj!}
              pocketMoney={appPocketMoney}
              tasks={appTasks}
              schoolTasks={schoolTasks}
              trips={appTrips}
              pets={appPets}
              members={appMembers}
              foyer={appFoyer}
              documents={documents}
              onBack={() => setActiveModule('')}
              onOpenChatWithMember={handleOpenChatWithMember}
            />
          );
        }
        if (activeModule === 'peacemaker') {
          return (
            <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[100px] pointer-events-none" />
              
              {/* Kid Header */}
              <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setActiveModule('')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>🕊️</span>
                      <span>PeaceMaker</span>
                    </h1>
                    <p className="text-xs text-white/50 font-bold">Réglez vos disputes calmement avec l'IA !</p>
                  </div>
                </div>
              </div>

              <PeaceMaker 
                isPremium={isPremium}
                onTriggerPaywall={() => setPaywallOpen(true)}
              />
            </div>
          );
        }
        if (activeModule === 'capsule') {
          return (
            <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB020]/10 blur-[100px] pointer-events-none" />
              
              {/* Kid Header */}
              <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setActiveModule('')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>⏳</span>
                      <span>Capsule Temporelle</span>
                    </h1>
                    <p className="text-xs text-white/50 font-bold">Tes souvenirs de famille magiques !</p>
                  </div>
                </div>
              </div>

              <CapsuleTemporelle 
                memories={memories} 
                setMemories={setMemories} 
                activeMemberId={appActiveMemberId} 
                isPremium={isPremium}
                onTriggerPaywall={() => setPaywallOpen(true)}
                members={appMembers}
              />
            </div>
          );
        }
        if (activeModule === 'conseil') {
          return (
            <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />
              
              {/* Kid Header */}
              <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setActiveModule('')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>🗳️</span>
                      <span>Conseil de Famille</span>
                    </h1>
                    <p className="text-xs text-white/50 font-bold">Participe aux choix de ta famille !</p>
                  </div>
                </div>
              </div>

              <ConseilFamille 
                votes={appVotes} 
                setVotes={setVotes} 
                activeMemberId={appActiveMemberId} 
                members={appMembers}
              />
            </div>
          );
        }

        if (activeModule === 'messagerie') {
          return (
            <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB020]/10 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />
              
              {/* Kid Header */}
              <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setActiveModule('')}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>💬</span>
                      <span>Discussions</span>
                    </h1>
                    <p className="text-xs text-white/55 font-bold font-sans">Parle avec ta famille !</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <MenuHub 
                  foyer={appFoyer}
                  memberPermissions={memberPermissions}
                  malusTemplates={malusTemplates}
                  setMalusTemplates={setMalusTemplates}
                  appliedMaluses={appliedMaluses}
                  setAppliedMaluses={setAppliedMaluses}
                  initialChatGroupId={initialChatGroupId}
                  documents={appDocuments}
                  setDocuments={setDocuments}
                  tasks={appTasks}
                  groceries={appGroceries}
                  externalGroceryFilter={externalGroceryFilter}
                  members={appMembers}
                  setMembers={setMembers}
                  vehicles={appVehicles}
                  setVehicles={setVehicles}
                  maintenance={appMaintenance}
                  setMaintenance={setMaintenance}
                  trips={appTrips}
                  setTrips={setTrips}
                  pets={appPets}
                  setPets={setPets}
                  pocketMoney={appPocketMoney}
                  setPocketMoney={setPocketMoney}
                  artisans={artisans}
                  setArtisans={setArtisans}
                  onUpdateMemberProfile={handleUpdateMemberProfile}
                  goals={appSavingGoals}
                  transactions={appTransactions}
                  setTransactions={setTransactions}
                  alerts={appFilteredAlerts}
                  setAlerts={setAlerts}
                  currencySymbol={getCurrencySymbol()}
                  formatMoney={formatMoney}
                  activeModule={activeModule}
                  setActiveModule={setActiveModule}
                  vaccines={appVaccines}
                  setVaccines={setVaccines}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleEditTask}
                  onAddGrocery={handleToggleGrocery}
                  onToggleTask={handleToggleTask}
                  onValidateTask={handleValidateTask}
                  onAcceptCandidate={handleAcceptCandidate}
                  onRefuseCandidate={handleRefuseCandidate}
                  onSendNotification={sendLocalNotification}
                  onToggleGrocery={handleToggleGrocery}
                  onAddGroceryItem={handleAddGroceryItem}
                  onDeleteGroceryItem={handleDeleteGroceryItem}
                  onEditGroceryItem={handleEditGroceryItem}
                  setActiveTab={setActiveTab}
                  activeMemberId={appActiveMemberId}
                  archivedLists={archivedLists}
                  onArchiveCurrentList={handleArchiveCurrentList}
                  onReuseArchivedList={handleReuseArchivedList}
                  onDeleteArchivedList={handleDeleteArchivedList}
                  onCleanGroceryList={handleCleanGroceryList}
                  onToggleFavoriteGrocery={handleToggleFavoriteGrocery}
                  chatGroups={chatGroups}
                  setChatGroups={setChatGroups}
                  chatMessages={chatMessages}
                  setChatMessages={setChatMessages}
                  demarches={appDemarches}
                  setDemarches={setDemarches}
                  justificatifPacks={justificatifPacks}
                  setJustificatifPacks={setJustificatifPacks}
                  onAddTransaction={handleAddTransaction}
                  onAddEventDirect={handleAddEvent}
                  onAddEvent={handleAddEvent}
                  memories={memories}
                  setMemories={setMemories}
                  votes={appVotes}
                  setVotes={setVotes}
                  schoolTasks={schoolTasks}
                  setSchoolTasks={setSchoolTasks}
                  grades={grades}
                  setGrades={setGrades}
                  schedule={schedule}
                  setSchedule={setSchedule}
                  dishes={dishes}
                  setDishes={setDishes}
                  isPremium={isPremium}
                  setIsPremium={setIsPremium}
                  onTriggerPaywall={() => setPaywallOpen(true)}
                  accounts={accounts}
                  isKidMode={true}
                  setSavingGoals={setSavingGoals}
                  setTasks={setTasks}
                />
              </div>
            </div>
          );
        }
      }

      if (activeModule === "commune") {
        return (
          <div className="min-h-screen bg-[#07111F] text-white">
            <div className="max-w-xl mx-auto px-4 pt-6 flex items-center justify-between">
              <button 
                onClick={() => setActiveModule('')}
                className="flex items-center space-x-2 text-white/60 hover:text-white font-bold text-xs cursor-pointer bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-sans"
              >
                <span>← Retour au hub</span>
              </button>
            </div>
            <CommuneHub communeName={communeName} onBack={() => setActiveModule('')} />
          </div>
        );
      }

      if (activeModule === 'agenda') {
        return (
          <Agenda 
            events={appEvents as LooseValue}
            members={appMembers}
            activeMemberId={appActiveMemberId}
            onAddEventClick={() => {
              setActiveModule('');
              setQuickActionsOpen(true);
            }}
            onToggleEventDone={handleToggleEventDone}
            onMoveEvent={handleMoveEvent}
            defaultSelectedDate={agendaSelectedDate}
            externalEvents={externalEvents}
            setExternalEvents={setExternalEvents}
            calendarSources={calendarSources}
            setCalendarSources={setCalendarSources}
            currentCalendarCountry={currentCalendarCountry}
            setCurrentCalendarCountry={setCurrentCalendarCountry}
            onCalendarImportComplete={(sourceName, importedEvents) => {
              const upcoming = [...importedEvents]
                .filter(event => new Date(`${event.startDate}T${event.startTime || '00:00'}:00`).getTime() >= Date.now())
                .sort((a, b) => new Date(`${a.startDate}T${a.startTime || '00:00'}:00`).getTime() - new Date(`${b.startDate}T${b.startTime || '00:00'}:00`).getTime())[0];
              const nextText = upcoming
                ? ` Prochain événement : "${upcoming.title}" le ${new Date(upcoming.startDate).toLocaleDateString('fr-FR')}${upcoming.startTime ? ` à ${upcoming.startTime}` : ''}.`
                : '';
              sendLocalNotification(
                '📅 Calendrier importé',
                `${importedEvents.length} événement${importedEvents.length > 1 ? 's' : ''} ajouté${importedEvents.length > 1 ? 's' : ''} depuis "${sourceName}".${nextText}`,
                'agenda',
                'success'
              );
            }}
            onCalendarSourceDeleted={(sourceName) => {
              deleteExternalCalendarSourceForReminders(foyer, sourceName);
            }}
            onBack={() => setActiveModule('')}
          />
        );
      }

      if (activeModule === 'objectifs') {
        // Rediriger immédiatement vers le module Budget
        setTimeout(() => {
          setActiveTab('budget');
          setActiveModule('');
        }, 0);
        return null;
      }

      if (activeModule === 'membres') {
        return (
          <div className="min-h-screen bg-[#07111F] text-white">
            <div className="max-w-4xl mx-auto px-4 pt-6 flex items-center justify-between">
              <button 
                onClick={() => setActiveModule('')}
                className="flex items-center space-x-2 text-white/60 hover:text-white font-bold text-xs cursor-pointer bg-white/5 border border-white/10 rounded-xl px-4 py-2"
              >
                <span>← Retour au hub</span>
              </button>
            </div>
            <Membres 
              members={appMembers}
              setMembers={setMembers}
              foyer={appFoyer}
              activeMemberId={appActiveMemberId}
              onUpdateMemberProfile={handleUpdateMemberProfile}
              onAddMember={handleAddMember}
              memberPermissions={memberPermissions}
              onUpdatePermissions={handleUpdateMemberPermissions}
              myMemberProfile={myMemberProfile}
              isPremium={isPremium}
              onTriggerPaywall={() => setPaywallOpen(true)}
            />
          </div>
        );
      }

      if (activeModule === 'settings') {
        return (
          <div className="min-h-screen bg-[#07111F] text-white">
            <div className="max-w-xl mx-auto px-4 pt-6 flex items-center justify-between">
              <button 
                onClick={() => setActiveModule('')}
                className="flex items-center space-x-2 text-white/60 hover:text-white font-bold text-xs cursor-pointer bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-sans"
              >
                <span>← Retour au hub</span>
              </button>
            </div>
            <Settings 
              currency={currency}
              setCurrency={setCurrency}
              onResetData={handleResetData}
              onPurgeDemoData={handlePurgeDemoData}
              onClearAllFoyerData={handleClearAllFoyerData}
              onOpenPaywall={() => setPaywallOpen(true)}
              user={user}
              foyer={appFoyer}
              myMemberProfile={myMemberProfile}
              onRefreshFoyer={() => checkUserFoyerSession(user)}
              onUpdateMemberProfile={handleUpdateMemberProfile}
              members={appMembers}
              setMembers={setMembers}
              activeMemberId={appActiveMemberId}
              setActiveTab={setActiveTab}
              setActiveModule={setActiveModule}
              onOpenOnboarding={() => setOnboardingActive(true)}
              onNotificationPrefsChange={(prefs) => {
                setNotificationPrefs(prefs);
                const key = `mf_notif_prefs_${appFoyer?.id || 'simulated'}_${user?.id || 'guest'}`;
                localStorage.setItem(key, JSON.stringify(prefs));
              }}
              smartFamilyPrefs={smartFamilyPrefs}
              onSmartFamilyPrefsChange={handleSmartFamilyPrefsChange}
              communeName={communeName}
              schoolName={schoolName}
              onUpdateFoyerConfig={handleUpdateFoyerConfig}
            />
          </div>
        );
      }

      return (
        <MenuHub 
          foyer={appFoyer}
          memberPermissions={memberPermissions}
          malusTemplates={malusTemplates}
          setMalusTemplates={setMalusTemplates}
          appliedMaluses={appliedMaluses}
          setAppliedMaluses={setAppliedMaluses}
          initialChatGroupId={initialChatGroupId}
          documents={appDocuments}
          setDocuments={setDocuments}
          tasks={appTasks}
          groceries={appGroceries}
          externalGroceryFilter={externalGroceryFilter}
          members={appMembers}
          setMembers={setMembers}
          vehicles={appVehicles}
          setVehicles={setVehicles}
          maintenance={appMaintenance}
          setMaintenance={setMaintenance}
          trips={appTrips}
          setTrips={setTrips}
          pets={appPets}
          setPets={setPets}
          pocketMoney={appPocketMoney}
          setPocketMoney={setPocketMoney}
          artisans={artisans}
          setArtisans={setArtisans}
          onUpdateMemberProfile={handleUpdateMemberProfile}
          goals={appSavingGoals}
          transactions={appTransactions}
          setTransactions={setTransactions}
          alerts={appFilteredAlerts}
          setAlerts={setAlerts}
          currencySymbol={getCurrencySymbol()}
          formatMoney={formatMoney}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          vaccines={appVaccines}
          setVaccines={setVaccines}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleEditTask}
          onAddGrocery={handleToggleGrocery}
          onToggleTask={handleToggleTask}
          onValidateTask={handleValidateTask}
          onAcceptCandidate={handleAcceptCandidate}
          onRefuseCandidate={handleRefuseCandidate}
          onSendNotification={sendLocalNotification}
          onToggleGrocery={handleToggleGrocery}
          onAddGroceryItem={handleAddGroceryItem}
          onDeleteGroceryItem={handleDeleteGroceryItem}
          onEditGroceryItem={handleEditGroceryItem}
          setActiveTab={setActiveTab}
          activeMemberId={appActiveMemberId}
          archivedLists={archivedLists}
          onArchiveCurrentList={handleArchiveCurrentList}
          onReuseArchivedList={handleReuseArchivedList}
          onDeleteArchivedList={handleDeleteArchivedList}
          onCleanGroceryList={handleCleanGroceryList}
          onToggleFavoriteGrocery={handleToggleFavoriteGrocery}
          chatGroups={chatGroups}
          setChatGroups={setChatGroups}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          demarches={appDemarches}
          setDemarches={setDemarches}
          justificatifPacks={justificatifPacks}
          setJustificatifPacks={setJustificatifPacks}
          onAddTransaction={handleAddTransaction}
          onAddEventDirect={handleAddEvent}
          onAddEvent={(title, dateTime) => {
            if (!isPremium) {
              const currentMonth = new Date().toISOString().substring(0, 7);
              const monthlyEventsCount = events.filter(e => e.dateTime.startsWith(currentMonth)).length;
              if (monthlyEventsCount >= 10) {
                setPaywallOpen(true);
                return;
              }
            }
            const newEvent: FamilyEvent = {
              id: `evt-dem-${Date.now()}`,
              title: `📋 ${title}`,
              type: 'other',
              dateTime: dateTime,
              time: '09:00',
              done: false
            };
            setEvents(prev => [newEvent, ...prev]);
          }}
          memories={memories}
          setMemories={setMemories}
          votes={appVotes}
          setVotes={setVotes}
          schoolTasks={schoolTasks}
          setSchoolTasks={setSchoolTasks}
          grades={grades}
          setGrades={setGrades}
          schedule={schedule}
          setSchedule={setSchedule}
          dishes={dishes}
          setDishes={setDishes}
          isPremium={isPremium}
          setIsPremium={setIsPremium}
          onTriggerPaywall={() => setPaywallOpen(true)}
          accounts={accounts}
          setSavingGoals={setSavingGoals}
          setTasks={setTasks}
        />
      );
    }

    return null;
  };

  if (isRecoveringPassword) {
    return (
      <PasswordRecoveryView
        onClose={() => {
          setIsRecoveringPassword(false);
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          } else {
            window.location.hash = '';
          }
        }}
      />
    );
  }

  const showGlobalLoader = isInitializingAuth || (isSessionChecking && !foyer);

  if (showGlobalLoader) {
    return (
      <div className="min-h-screen bg-[#07111F] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/15 blur-[120px] pointer-events-none" />
        
        <div className="text-center space-y-6 relative z-10 animate-fade-in">
          {/* Pulsing premium logo ring */}
          <div className="inline-flex p-5 rounded-full bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF] animate-pulse">
            <span className="text-4xl">👨‍👩‍👧‍👦</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70">
              MyFamily+
            </h1>
            <p className="text-xs text-white/50 tracking-widest uppercase">
              Connexion en cours...
            </p>
          </div>
          <div className="flex justify-center space-x-1.5 pt-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CFF] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CFF] animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  const shouldShowOnboarding = !user || onboardingActive;

  if (shouldShowOnboarding) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <Onboarding 
          onSuccess={handleOnboardingSuccess} 
          onLogout={handleLogout} 
          userEmail={user?.email || ''} 
        />
      </Suspense>
    );
  }

  if (user && myActiveRequest && showRequestInterceptor) {
    const isRejected = myActiveRequest.status === 'rejected';

    // Handler to cancel/delete the request and redirect
    const handleCancelAndRedirect = async (mode: 'select' | 'join') => {
      try {
        await foyerService.cancelJoinRequest(myActiveRequest.id);
      } catch (err) {
        console.error("Error cancelling join request:", err);
      }
      
      setMyActiveRequest(null);
      
      localStorage.removeItem('mf_cloud_foyer_id');
      localStorage.removeItem('mf_active_foyer_id');
      localStorage.removeItem('mf_cached_foyer');
      localStorage.removeItem('mf_cached_member_profile');
      
      setFoyer(null);
      setMyMemberProfile(null);
      
      const list = await foyerService.getMyFoyers();
      setMyFoyers(list);

      setShowWelcomeScreen(true);
      setWelcomeScreenMode(mode);
    };

    // Handler to go back to home dashboard (empty dashboard) keeping the request
    const handleGoToEmptyDashboard = () => {
      setShowRequestInterceptor(false);
      setShowWelcomeScreen(false);
    };

    return (
      <div className="min-h-screen bg-[#07111F] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans animate-fade-in">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10 text-center">
          {isRejected ? (
            <>
              {/* REJECTED SCREEN */}
              <div className="inline-flex p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-[#FF4D6D] animate-bounce">
                <span className="text-3xl">❌</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FF4D6D]">
                  Demande Refusée
                </h1>
                <p className="text-sm text-white/60">
                  Votre demande pour rejoindre cette famille a été refusée.
                </p>
              </div>

              <div className="glass-panel border border-white/8 rounded-[28px] p-6 space-y-4 text-left">
                <p className="text-xs text-white/70 leading-relaxed">
                  Le Chef de famille du foyer <span className="text-white font-bold">{myActiveRequest.familyName}</span> n'a pas validé votre demande d'intégration.
                </p>
                <p className="text-xs text-white/55 leading-relaxed font-medium">
                  Vous pouvez choisir de saisir un autre code d'invitation ou de faire une nouvelle demande.
                </p>
              </div>

              <div className="flex flex-col space-y-3 pt-2">
                <button
                  onClick={() => handleCancelAndRedirect('join')}
                  className="w-full py-3.5 rounded-xl bg-[#6C5CFF] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md shadow-[#6C5CFF]/15"
                >
                  Saisir un autre code / Nouvelle demande ➔
                </button>
                <button
                  onClick={handleGoToEmptyDashboard}
                  className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Retour accueil
                </button>
              </div>
            </>
          ) : (
            <>
              {/* PENDING SCREEN */}
              <div className="inline-flex p-4 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 animate-pulse">
                <span className="text-3xl">🕒</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Demande Envoyée
                </h1>
                <p className="text-sm text-white/60">
                  Votre demande a été envoyée au chef de famille.
                </p>
              </div>

              <div className="glass-panel border border-white/8 rounded-[28px] p-6 space-y-4 text-left">
                <p className="text-xs text-white/70 leading-relaxed">
                  Votre demande pour rejoindre le foyer <span className="text-white font-bold">{myActiveRequest.familyName}</span> (code d'invitation <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[#6C5CFF]">{myActiveRequest.inviteCode}</span>) a bien été enregistrée.
                </p>
                <p className="text-xs text-white/55 leading-relaxed font-medium">
                  Pour des raisons de sécurité, le Chef de famille ou un parent gestionnaire doit approuver votre accès.
                </p>
                <div className="flex items-center space-x-2 p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white/40">
                  <span className="text-base">ℹ️</span>
                  <span>Une fois validée, l'application s'activera automatiquement.</span>
                </div>
              </div>

              <div className="flex flex-col space-y-3 pt-2">
                <button
                  onClick={() => handleCancelAndRedirect('select')}
                  className="w-full py-3.5 rounded-xl bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/20 border border-[#FF4D6D]/20 text-[#FF4D6D] text-xs font-bold transition-all cursor-pointer"
                >
                  Annuler ma demande
                </button>
                <button
                  onClick={() => handleCancelAndRedirect('join')}
                  className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Changer de code famille
                </button>
                <button
                  onClick={handleGoToEmptyDashboard}
                  className="w-full py-3.5 rounded-xl bg-transparent hover:bg-white/5 text-white/50 text-xs font-bold transition-all cursor-pointer"
                >
                  Retour accueil
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (sharedPackId) {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        {renderContent()}
      </Suspense>
    );
  }

  const appFoyer = foyer;
  const appMembers = members;
  const appActiveMemberId = activeMemberId;
  const activeMemberObj = appMembers.find(m => m.id === appActiveMemberId);
  const isKidMode = activeMemberObj && activeMemberObj.age && parseInt(activeMemberObj.age) < 11;

  const forceOnboarding = user && myFoyers.length === 0;

  if (forceOnboarding) {
    return (
      <div className="fixed inset-0 bg-[#07111F] z-[9999] flex items-center justify-center p-6 text-white overflow-y-auto">
        <div className="max-w-md w-full glass-panel border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden bg-white/2 backdrop-blur-lg">
          <div className="absolute top-[-20%] left-[-20%] w-60 h-60 rounded-full bg-[#6C5CFF]/15 blur-[60px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-60 h-60 rounded-full bg-[#FF4D6D]/15 blur-[60px] pointer-events-none" />

          {welcomeScreenMode === 'select' && (
            <div className="space-y-6 text-center relative z-10">
              <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                <Home className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Bienvenue sur MyFamily+</h2>
                <p className="text-xs text-white/50 leading-relaxed font-sans">Associez votre compte à une famille pour commencer l'aventure.</p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleWelcomeCreateFoyer}
                  disabled={welcomeLoading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(108,92,255,0.3)] flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <span>🏠 Créer une famille</span>
                </button>

                <button
                  onClick={() => {
                    setWelcomeError(null);
                    setWelcomeScreenMode('join');
                  }}
                  disabled={welcomeLoading}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <span>👨‍👩‍👧‍👦 Rejoindre une famille</span>
                </button>
              </div>
            </div>
          )}

          {welcomeScreenMode === 'create' && (
            <div className="space-y-5 relative z-10 text-center">
              <div className="space-y-1">
                <h2 className="text-lg font-black">🏠 Créer une Famille</h2>
                <p className="text-xs text-white/50">Créez votre propre espace familial sécurisé.</p>
              </div>

              <div className="space-y-4 pt-2">
                <button
                  onClick={handleWelcomeCreateFoyer}
                  disabled={welcomeLoading}
                  className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {welcomeLoading ? 'Création...' : 'Confirmer la création automatique'}
                </button>

                {welcomeError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2 text-left">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{welcomeError}</span>
                  </div>
                )}

                <button
                  onClick={() => setWelcomeScreenMode('select')}
                  disabled={welcomeLoading}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer"
                >
                  Retour
                </button>
              </div>
            </div>
          )}

          {welcomeScreenMode === 'join' && (
            <div className="space-y-4 relative z-10 text-left">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-black">👨‍👩‍👧‍👦 Rejoindre une Famille</h2>
                <p className="text-xs text-white/50">Saisissez le code d'invitation pour demander à rejoindre un foyer.</p>
              </div>

              <form onSubmit={handleWelcomeJoinFoyer} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Code d'invitation (Ex: FAM-XXXX)</label>
                  <input
                    type="text"
                    required
                    placeholder="FAM-W5ZP6"
                    value={welcomeInviteCode}
                    onChange={(e) => setWelcomeInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#07111F] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white uppercase font-bold focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Votre Prénom / Nom d'affichage</label>
                  <input
                    type="text"
                    required
                    placeholder="Mon prénom"
                    value={welcomeDisplayName}
                    onChange={(e) => setWelcomeDisplayName(e.target.value)}
                    className="w-full bg-[#07111F] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>

                {welcomeError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{welcomeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={welcomeLoading}
                  className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {welcomeLoading ? 'Envoi...' : 'Envoyer la demande d\'intégration'}
                </button>
              </form>

              <button
                onClick={() => setWelcomeScreenMode('select')}
                disabled={welcomeLoading}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer text-center"
              >
                Retour
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--family-bg)] text-[var(--family-text)] font-sans transition-colors duration-1000 relative ios-safe-container">
      

      {/* Dynamic render active layout page views */}
      <main className="w-full pb-28 md:pb-32">
        <Suspense fallback={<AppLoadingFallback />}>
          {renderContent()}
        </Suspense>
      </main>

      {/* Global Sidebar hamburger drawer menu */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        setActiveTab={setActiveTab}
        setActiveModule={setActiveModule}
        members={appMembers}
        activeMemberId={appActiveMemberId}
        user={user}
        onLogout={handleLogout}
        onOpenOnboarding={() => {
          setOnboardingActive(true);
        }}
        activeFamilyName={appFoyer?.name}
        onOpenSpaceSelector={() => setSpaceSelectorOpen(true)}
      />

      {/* Universal Space Selector Modal */}
      {spaceSelectorOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div 
            onClick={() => setSpaceSelectorOpen(false)} 
            className="absolute inset-0"
          />
          <div className="relative glass-panel border border-white/10 rounded-[32px] w-full max-w-md p-6 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-fade-in pointer-events-auto z-10 bg-white/2 backdrop-blur-lg">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Sélecteur d'Espaces</h3>
                <p className="text-[10px] text-white/40 mt-1">Naviguez entre vos familles, écoles et communes actives</p>
              </div>
              <button 
                onClick={() => setSpaceSelectorOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar text-white">
              
              {/* 1. FAMILIES SECTION */}
              <div className="space-y-2.5">
                <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-widest block px-1">🏠 Mes Familles</span>
                <div className="space-y-1.5">
                  {myFoyers.map((fItem) => {
                    const isActive = fItem.foyer.id === foyer?.id;
                    const isDefault = fItem.foyer.id === defaultFamilyId;
                    return (
                      <div 
                        key={fItem.foyer.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                          isActive 
                            ? "bg-[#6C5CFF]/15 border-[#6C5CFF]/30 text-white" 
                            : "bg-white/3 border-transparent hover:border-white/5 hover:bg-white/5 text-white/70"
                        }`}
                      >
                        <button
                          onClick={() => requestActiveFoyerMembership(fItem)}
                          className="flex-1 text-left flex items-center space-x-2.5 cursor-pointer font-bold text-xs bg-transparent border-0 text-white focus:outline-none"
                        >
                          <span>👨‍👩‍👧‍👦</span>
                          <span className="truncate">{fItem.foyer.name}</span>
                          {isActive && <span className="text-[8px] bg-[#6C5CFF] text-white px-1.5 py-0.5 rounded-full font-black uppercase">Actif</span>}
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              const nextDefault = isDefault ? null : fItem.foyer.id;
                              if (nextDefault) {
                                localStorage.setItem('mf_default_family_id', nextDefault);
                                setDefaultFamilyId(nextDefault);
                              } else {
                                localStorage.removeItem('mf_default_family_id');
                                setDefaultFamilyId(null);
                              }
                            }}
                            className={`p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer ${isDefault ? 'text-[#FFB020]' : 'text-white/20'} bg-transparent border-0`}
                            title={isDefault ? "Famille par défaut" : "Définir comme famille par défaut"}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSpaceSelectorOpen(false);
                      setWelcomeError(null);
                      setWelcomeScreenMode('create');
                      setShowWelcomeScreen(true);
                    }}
                    className="py-2.5 rounded-xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/20 text-[#6C5CFF] hover:bg-[#6C5CFF]/25 font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95"
                  >
                    + Créer une famille
                  </button>
                  <button
                    onClick={() => {
                      setSpaceSelectorOpen(false);
                      setWelcomeError(null);
                      setWelcomeScreenMode('join');
                      setShowWelcomeScreen(true);
                    }}
                    className="py-2.5 rounded-xl bg-[#00D26A]/15 border border-[#00D26A]/20 text-[#00D26A] hover:bg-[#00D26A]/25 font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95"
                  >
                    + Rejoindre
                  </button>
                </div>
              </div>

              {/* 2. ESTABLISHMENTS SECTION */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-widest block px-1">🎓 Mes Établissements</span>
                <div className="space-y-1.5">
                  {establishments.map((est) => {
                    const isActive = est.id === activeEstablishmentId;
                    return (
                      <button
                        key={est.id}
                        onClick={() => {
                          spaceService.setActiveEstablishmentId(est.id);
                          setActiveEstablishmentId(est.id);
                          setSpaceSelectorOpen(false);
                        }}
                        className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                          isActive 
                            ? "bg-[#6C5CFF]/15 border-[#6C5CFF]/30 text-white" 
                            : "bg-white/3 border-transparent hover:border-white/5 hover:bg-white/5 text-white/70"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 font-bold text-xs">
                          <span>🏫</span>
                          <span className="truncate">{est.name}</span>
                        </div>
                        {isActive && <span className="text-[8px] bg-[#6C5CFF] text-white px-1.5 py-0.5 rounded-full font-black uppercase">Actif</span>}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={async () => {
                    const name = prompt("Saisir le nom du nouvel établissement scolaire :");
                    if (name && name.trim()) {
                      const newEst = await spaceService.addEstablishment(name);
                      setEstablishments(prev => [...prev, newEst]);
                      spaceService.setActiveEstablishmentId(newEst.id);
                      setActiveEstablishmentId(newEst.id);
                      setSpaceSelectorOpen(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 text-white font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95"
                >
                  + Ajouter un établissement
                </button>
              </div>

              {/* 3. COMMUNES SECTION */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-widest block px-1">🏛️ Mes Communes</span>
                <div className="space-y-1.5">
                  {communes.map((com) => {
                    const isActive = com.id === activeCommuneId;
                    return (
                      <button
                        key={com.id}
                        onClick={() => {
                          spaceService.setActiveCommuneId(com.id);
                          setActiveCommuneId(com.id);
                          setSpaceSelectorOpen(false);
                        }}
                        className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                          isActive 
                            ? "bg-[#FF9F1C]/15 border-[#FF9F1C]/30 text-white" 
                            : "bg-white/3 border-transparent hover:border-white/5 hover:bg-white/5 text-white/70"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 font-bold text-xs">
                          <span>🏛️</span>
                          <span className="truncate">{com.name}</span>
                        </div>
                        {isActive && <span className="text-[8px] bg-[#FF9F1C] text-[#07111F] px-1.5 py-0.5 rounded-full font-black uppercase">Actif</span>}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={async () => {
                    const name = prompt("Saisir le nom de la nouvelle commune rattachée :");
                    if (name && name.trim()) {
                      const newCom = await spaceService.addCommune(name);
                      setCommunes(prev => [...prev, newCom]);
                      spaceService.setActiveCommuneId(newCom.id);
                      setActiveCommuneId(newCom.id);
                      setSpaceSelectorOpen(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 text-white font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95"
                >
                  + Ajouter une commune
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom sheet dialog form (Quick Actions Sheet) */}
      <QuickActionsSheet 
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        members={appMembers}
        onAddEvent={handleAddEvent}
        onAddTransaction={handleAddTransaction}
        onAddTask={handleAddTask}
        onNavigateToVault={() => {
          setActiveTab('menu');
          setActiveModule('documents');
          setQuickActionsOpen(false);
        }}
        onNavigateToMembers={() => {
          setActiveTab('menu');
          setActiveModule('membres');
          setQuickActionsOpen(false);
        }}
        isPremium={isPremium}
        onTriggerPaywall={() => setPaywallOpen(true)}

      />

      {/* Shared bottom iOS premium nav bar with quick actions central (+) trigger */}
      <BottomNav 
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActiveModule("");
        }}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onMicClick={() => startVoiceAssistant()}
        activeMemberId={appActiveMemberId}
        members={appMembers}
        isPremium={isPremium}
      />

      <Paywall 
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        foyerId={foyer?.id || null}
        onStartStripeCheckout={async ({ plan }) => {
          if (!foyer?.id) {
            throw new Error("Aucun foyer actif n'est chargé.");
          }
          await billingService.startStripeCheckout(foyer.id, plan);
        }}
        onUnlockPremium={async ({ platform, plan }) => {
          const subscription = billingService.createTestSubscription(platform, plan);
          setIsPremium(subscription.isPremium);
          if (foyer) {
            try {
              await foyerService.updateFoyerPremium(foyer.id, subscription.isPremium, {
                source: subscription.source,
                plan: subscription.plan,
                status: subscription.status,
                expiresAt: subscription.expiresAt
              });
              setFoyer(prev => prev ? {
                ...prev,
                isPremium: subscription.isPremium,
                maxMembers: 999,
                premiumSource: subscription.source,
                premiumPlan: subscription.plan,
                premiumStatus: subscription.status,
                premiumExpiresAt: subscription.expiresAt
              } : null);
            } catch (err) {
              console.error("[MyFamily+ Paywall] Failed to update premium status in database:", err);
            }
          }
        }}
      />



      {/* Voice Command pulsing HUD overlay */}
      {voiceActive && (
        <div className="fixed inset-0 bg-[#07111F]/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="glass-panel border border-white/15 rounded-[40px] p-8 max-w-sm w-full space-y-6 shadow-[0_20px_50px_rgba(108,92,255,0.3)]">
            
            {/* Pulsing microphone or waveform icon */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg">
              {voiceWave ? (
                <>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] animate-ping opacity-60"></div>
                  <div className="absolute -inset-4 rounded-full border-2 border-[#6C5CFF]/30 animate-pulse"></div>
                  <Volume2 className="w-10 h-10 relative z-10 animate-bounce" />
                </>
              ) : (
                <Mic className="w-10 h-10 relative z-10 animate-pulse" />
              )}
            </div>

            <div className="space-y-2">
              <span 
                onClick={() => {
                  devClicks.current += 1;
                  if (devClicks.current >= 7) {
                    const nextDevMode = !devModeActive;
                    setDevModeActive(nextDevMode);
                    localStorage.setItem('mf_dev_mode', String(nextDevMode));
                    alert(nextDevMode ? "Mode Développeur Activé 🛠️" : "Mode Développeur Désactivé 👤");
                    devClicks.current = 0;
                  }
                }}
                className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF4D6D] animate-pulse cursor-pointer select-none"
              >
                Contrôle Vocal Global
              </span>
              <p className="text-lg font-bold text-white leading-snug">{voiceTranscript}</p>
              
              {/* Indicateur visuel d'état */}
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest pt-1 flex items-center justify-center gap-1.5 select-none">
                {(voiceState === 'listening' || voiceState === 'ecoute') && (
                  <span className="text-blue-400 animate-pulse flex items-center gap-1">
                    <span>🎤</span> Écoute en cours...
                  </span>
                )}
                {(voiceState === 'processing' || voiceState === 'traitement') && (
                  <span className="text-[#FFB020] animate-pulse flex items-center gap-1">
                    <span>⏳</span> Traitement...
                  </span>
                )}
                {(voiceState === 'asking_missing_field' || voiceState === 'confirmation') && (
                  <span className="text-purple-400 flex items-center gap-1 animate-pulse">
                    <span>⚙️</span> Question complémentaire...
                  </span>
                )}
                {voiceState === 'waiting_for_answer' && (
                  <span className="text-pink-400 flex items-center gap-1 animate-pulse">
                    <span>🤔</span> En attente de votre réponse...
                  </span>
                )}
                {voiceState === 'executing' && (
                  <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                    <span>⚙️</span> Enregistrement...
                  </span>
                )}
                {(voiceState === 'success' || voiceState === 'termine') && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span>✓</span> Commande enregistrée
                  </span>
                )}
                {(voiceState === 'error' || voiceState === 'erreur') && (
                  <span className="text-rose-400 flex items-center gap-1">
                    <span>❌</span> Erreur
                  </span>
                )}
              </div>
            </div>

            {voiceState === 'erreur' && (
              <div className="space-y-3 pt-2 w-full animate-fade-in">
                <p className="text-xs text-white/60">
                  Impossible d'écouter votre commande. Réessayer.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceState('inactif');
                    setTimeout(() => startVoiceAssistant(), 100);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-[#6C5CFF] to-purple-600 hover:brightness-110 active:scale-95 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🎤</span> Réécouter
                </button>
              </div>
            )}

            {/* Formulaire de saisie manuelle de secours */}
            {!pendingGroceryItems && voiceState !== 'error' && voiceState !== 'erreur' && voiceState !== 'waiting_for_answer' && voiceState !== 'asking_missing_field' && !voiceTransactionAdded && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!manualVoiceCommand.trim()) return;
                  const cmd = manualVoiceCommand.trim();
                  setVoiceTranscript(`"${cmd}"`);
                  setVoiceWave(false);
                  setVoiceState('processing');
                  setTimeout(() => {
                    parseVoiceCommand(cmd);
                  }, 500);
                  setManualVoiceCommand('');
                }}
                className="space-y-3 pt-2"
              >
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Écrivez votre commande ici..."
                    value={manualVoiceCommand}
                    onChange={(e) => setManualVoiceCommand(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020] pr-12 text-center"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-[#FFB020] text-black text-[10px] font-extrabold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  >
                    Go
                  </button>
                </div>
                <p className="text-[9px] text-white/30 italic">
                  Ex : "Ajoute du lait", "Ouvre la carte", "Affiche l'agenda"
                </p>
              </form>
            )}

            {/* Formulaire pour répondre à la question active (waiting_for_answer) */}
            {!pendingGroceryItems && voiceState !== 'error' && voiceState !== 'erreur' && (voiceState === 'waiting_for_answer' || voiceState === 'asking_missing_field') && (
              <div className="space-y-4 pt-2 w-full border-t border-white/10 animate-fade-in">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualVoiceCommand.trim()) return;
                    const cmd = manualVoiceCommand.trim();
                    setManualVoiceCommand('');
                    setVoiceTranscript(`"${cmd}"`);
                    setVoiceState('processing');
                    setTimeout(() => {
                      if (parseVoiceCommandRef.current) {
                        parseVoiceCommandRef.current(cmd);
                      } else {
                        parseVoiceCommand(cmd);
                      }
                    }, 500);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Écrivez votre réponse ici..."
                    value={manualVoiceCommand}
                    onChange={(e) => setManualVoiceCommand(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 rounded-xl bg-[#FFB020] text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    Envoyer
                  </button>
                </form>
                
                <div className="flex justify-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceState('waiting_for_answer');
                      if (voiceRecognitionRef.current) {
                        try {
                          voiceRecognitionRef.current.start();
                          setVoiceWave(true);
                        } catch {
                          // Recognition may already be active.
                        }
                      }
                    }}
                    className="py-1.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer transition-all"
                  >
                    🎙️ Réactiver micro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceRecognitionRef.current) {
                        try {
                          voiceRecognitionRef.current.onresult = null;
                          voiceRecognitionRef.current.onerror = null;
                          voiceRecognitionRef.current.onend = null;
                          voiceRecognitionRef.current.stop();
                        } catch {
                          // Recognition may already be stopped.
                        }
                      }
                      setVoiceState('idle');
                      setVoiceActive(false);
                      setVoiceContext(null);
                      voiceActionStatusRef.current = 'waiting';
                    }}
                    className="py-1.5 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    ❌ Annuler
                  </button>
                </div>
              </div>
            )}

            {pendingGroceryItems && pendingGroceryItems.length > 0 && !isEditingPendingGrocery && (
              <div className="bg-white/5 border border-white/10 rounded-[20px] p-4 text-xs font-semibold text-white text-left space-y-4 animate-fade-in">
                <div className="text-white/60 font-bold border-b border-white/5 pb-2">
                  🛒 Ajouté à la liste de courses :
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {pendingGroceryItems.map((item, idx) => {
                    const emoji = getGroceryItemEmoji(item.name);
                    
                    return (
                      <div key={idx} className="flex flex-col space-y-1 bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <div className="text-white text-sm font-extrabold flex items-center gap-1.5">
                          <span>{emoji}</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="text-white/60 text-[10px] flex justify-between">
                          <span>Catégorie : {item.category}</span>
                          <span>Quantité : {item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (!pendingGroceryItems) return;
                      pendingGroceryItems.forEach(item => {
                        handleAddGroceryItem(item.name, item.category, item.quantity, item.meal, item.addedBy, !!item.isFavorite);
                      });
                      setVoiceFeedback(`🛒 Action : Articles ajoutés avec succès !`);
                      
                      const toastMsg = pendingGroceryItems.length === 1 
                        ? `${pendingGroceryItems[0].name} ajouté à la liste` 
                        : `${pendingGroceryItems.map(item => item.name).join(', ')} ajoutés à la liste`;

                      setPendingGroceryItems(null);
                      closeVoiceAssistantAfterDelay(1500, 'inactif', {
                        tab: 'menu',
                        module: 'courses',
                        toastMessage: toastMsg
                      });
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 active:scale-95 text-black font-extrabold uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center animate-pulse"
                  >
                    Valider
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingPendingGrocery(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-extrabold uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            )}

            {pendingGroceryItems && pendingGroceryItems.length > 0 && isEditingPendingGrocery && (
              <div className="bg-white/5 border border-white/10 rounded-[20px] p-4 text-xs text-white text-left space-y-4 animate-fade-in">
                <div className="text-white/60 font-bold border-b border-white/5 pb-2">
                  ✏️ Modifier les articles :
                </div>
                <div className="space-y-4 max-h-52 overflow-y-auto pr-1">
                  {pendingGroceryItems.map((item, idx) => (
                    <div key={idx} className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-black tracking-wider block mb-1">Nom du produit</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPendingGroceryItems(prev => {
                              if (!prev) return null;
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], name: val };
                              return updated;
                            });
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase font-black tracking-wider block mb-1">Catégorie</label>
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPendingGroceryItems(prev => {
                                if (!prev) return null;
                                const updated = [...prev];
                                updated[idx] = { ...updated[idx], category: val };
                                return updated;
                              });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                          >
                            <option value="Fruits & Légumes" className="bg-[#07111F]">Fruits & Légumes</option>
                            <option value="Produits Frais" className="bg-[#07111F]">Produits Frais</option>
                            <option value="Boulangerie" className="bg-[#07111F]">Boulangerie</option>
                            <option value="Boucherie" className="bg-[#07111F]">Boucherie</option>
                            <option value="Épicerie" className="bg-[#07111F]">Épicerie</option>
                            <option value="Boissons" className="bg-[#07111F]">Boissons</option>
                            <option value="Surgelés" className="bg-[#07111F]">Surgelés</option>
                            <option value="Hygiène" className="bg-[#07111F]">Hygiène</option>
                            <option value="Maison" className="bg-[#07111F]">Maison</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase font-black tracking-wider block mb-1">Quantité</label>
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPendingGroceryItems(prev => {
                                if (!prev) return null;
                                const updated = [...prev];
                                updated[idx] = { ...updated[idx], quantity: val };
                                return updated;
                              });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!pendingGroceryItems) return;
                      pendingGroceryItems.forEach(item => {
                        handleAddGroceryItem(item.name, item.category, item.quantity, item.meal, item.addedBy, !!item.isFavorite);
                      });
                      setVoiceFeedback(`🛒 Action : Articles ajoutés après modification !`);
                      
                      const toastMsg = pendingGroceryItems.length === 1 
                        ? `${pendingGroceryItems[0].name} ajouté à la liste` 
                        : `${pendingGroceryItems.map(item => item.name).join(', ')} ajoutés à la liste`;

                      setPendingGroceryItems(null);
                      setIsEditingPendingGrocery(false);
                      closeVoiceAssistantAfterDelay(1500, 'inactif', {
                        tab: 'menu',
                        module: 'courses',
                        toastMessage: toastMsg
                      });
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 active:scale-95 text-black font-extrabold uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center"
                  >
                    Enregistrer & Valider
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingPendingGrocery(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-extrabold uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}

            {voiceAmbiguousTravel && ambiguousTravelChoices.length > 0 && (
              <div className="space-y-2 pt-2 animate-fade-in border-t border-white/5">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-wider block mb-1">
                  À quel voyage correspond cette dépense ?
                </span>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1">
                  {ambiguousTravelChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={async () => {
                        if (pendingVoiceCommandData) {
                          let finalTravelId = choice.id;
                          
                          if (choice.action === 'create') {
                            const newTripId = `t-${Date.now()}`;
                            const newTripDest = choice.destination.charAt(0).toUpperCase() + choice.destination.slice(1);
                            const newT = {
                              id: newTripId,
                              foyer_id: foyer?.id || '',
                              destination: newTripDest,
                              startDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                              endDate: new Date(Date.now() + 7*24*3600*1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                              budget: pendingVoiceCommandData.amount * 3 || 1000,
                              bookingRefs: ['hotel:non_defini', 'transport:non_defini', 'billets:non_defini', 'activite:non_defini'],
                              checklist: []
                            };
                            
                            setTrips(prev => [...prev, newT]);
                            
                            const client = getSupabaseClient();
                            if (client && foyer?.id) {
                              try {
                                await client.from('trips').insert({
                                  id: newTripId,
                                  foyer_id: foyer.id,
                                  destination: newTripDest,
                                  start_date: newT.startDate,
                                  end_date: newT.endDate,
                                  budget: newT.budget,
                                  booking_refs: newT.bookingRefs,
                                  checklist: JSON.stringify(newT.checklist)
                                });
                              } catch (err) {
                                console.error("Error creating trip in Supabase:", err);
                              }
                            }
                            
                            setLastCreatedTrip({ id: newTripId, destination: newTripDest });
                            finalTravelId = newTripId;
                          } else if (choice.action === 'link') {
                            setLastCreatedTrip({ id: choice.id, destination: choice.destination });
                          }
                          
                          const finalTx = {
                            ...pendingVoiceCommandData,
                            moduleSource: choice.action === 'global' ? 'budget' : 'voyages',
                            category: choice.action === 'global' ? 'Autres' : 'Voyages',
                            subCategory: choice.action === 'global' ? 'Divers' : 'Voyage',
                            travelId: choice.action === 'global' ? undefined : finalTravelId,
                            travel_id: choice.action === 'global' ? undefined : finalTravelId
                          };
                          
                          await handleAddTransaction(finalTx);
                          
                          setVoiceDebugInfo({
                            phrase: voiceTranscript.replace(/^"|"$/g, ''),
                            type: finalTx.type === 'expense' ? 'Dépense' : 'Revenu',
                            amount: `${finalTx.amount}€`,
                            category: finalTx.category,
                            subCategory: finalTx.subCategory,
                            module: 'Voyages'
                          });

                          setVoiceTransactionAdded({
                            type: finalTx.type as LooseValue,
                            amount: finalTx.amount,
                            category: finalTx.category,
                            subCategory: finalTx.subCategory || undefined,
                            accountName: accounts.find(a => a.id === finalTx.accountId)?.name || 'Principal'
                          });
                          
                          const client = getSupabaseClient();
                          if (client && foyer?.id) {
                            try {
                              await client.from('voice_commands').insert({
                                id: crypto.randomUUID(),
                                foyer_id: foyer.id,
                                raw_text: voiceTranscript.replace(/^"|"$/g, ''),
                                parsed_intent: pendingVoiceCommandData.intent || 'transaction_expense',
                                is_success: true,
                                module_source: finalTx.moduleSource,
                                category_id: finalTx.category,
                                subcategory_id: finalTx.subCategory,
                                amount: finalTx.amount,
                                currency: finalTx.currency || 'EUR',
                                recurrence_type: finalTx.recurrence || 'none',
                                recurrence_interval: finalTx.recurrenceInterval || 1
                              });
                            } catch (err) {
                              console.warn("Log command error:", err);
                            }
                          }
                          
                          const actionMsg = choice.action === 'create' 
                            ? `Le voyage "${choice.destination}" a été créé et la dépense y a été liée.` 
                            : (choice.action === 'global' ? 'La dépense a été ajoutée au module Voyage global.' : 'La dépense a été liée au voyage.');
                            
                          setVoiceFeedback(`💰 ${actionMsg}`);
                          setVoiceAmbiguousTravel(false);
                          setAmbiguousTravelChoices([]);
                          setPendingVoiceCommandData(null);
                          
                          const destLabel = choice.destination;
                          const capitalizedDest = destLabel.charAt(0).toUpperCase() + destLabel.slice(1);
                          
                          if (choice.action !== 'global') {
                            closeVoiceAssistantAfterDelay(2500, 'inactif', {
                              tab: 'menu',
                              module: 'voyages',
                              toastMessage: choice.action === 'create' ? `Voyage ${capitalizedDest} créé` : `Voyage ${capitalizedDest} mis à jour`
                            });
                          } else {
                            closeVoiceAssistantAfterDelay(2500, 'inactif', {
                              tab: 'budget',
                              module: '',
                              subView: { type: 'tab', tab: 'transactions' },
                              toastMessage: 'Dépense ajoutée'
                            });
                          }
                        }
                      }}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white text-left cursor-pointer transition-all active:scale-95 hover:border-[#FF4D6D]"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {voiceAmbiguous && ambiguousChoices.length > 0 && (
              <div className="space-y-2 pt-2 animate-fade-in border-t border-white/5">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-wider block mb-1">
                  À quoi correspond cette dépense ?
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {ambiguousChoices.map((choice) => (
                    <button
                      key={choice.moduleSource + choice.category + choice.subCategory}
                      type="button"
                      onClick={async () => {
                        if (pendingVoiceCommandData) {
                          const updatedTx = {
                            ...pendingVoiceCommandData,
                            moduleSource: choice.moduleSource,
                            category: choice.category,
                            subCategory: choice.subCategory,
                            title: pendingVoiceCommandData.title === 'Achat rapide' 
                              ? `${choice.label.split(' ')[1] || 'Dépense'} ${choice.subCategory}`
                              : pendingVoiceCommandData.title
                          };
                          
                          await handleAddTransaction(updatedTx);
                          
                          if (choice.moduleSource === 'argent_de_poche' && updatedTx.memberId) {
                            setPocketMoney(prev => prev.map(child => {
                              if (child.id === updatedTx.memberId) {
                                const newBal = child.balance + (updatedTx.type === 'income' ? updatedTx.amount : -updatedTx.amount);
                                const client = getSupabaseClient();
                                if (client) {
                                  client.from('pocket_money').update({ balance: newBal }).eq('id', child.id);
                                }
                                return { ...child, balance: newBal };
                              }
                              return child;
                            }));
                          }

                          // Save debug info
                          const matchedMemberObj = members.find(m => m.id === updatedTx.memberId);
                          setVoiceDebugInfo({
                            phrase: voiceTranscript.replace(/^"|"$/g, ''),
                            type: updatedTx.type === 'expense' ? 'Dépense' : 'Revenu',
                            amount: `${updatedTx.amount}€`,
                            category: choice.category,
                            subCategory: choice.subCategory,
                            module: choice.moduleSource === 'budget' ? 'Budget' : (choice.moduleSource === 'sante' ? 'Santé' : choice.moduleSource === 'vehicules' ? 'Véhicules' : choice.moduleSource === 'logement' ? 'Logement' : choice.moduleSource === 'ecole' ? 'École' : choice.moduleSource === 'documents' ? 'Démarches' : choice.moduleSource === 'courses' ? 'Courses' : choice.moduleSource === 'voyages' ? 'Voyages' : choice.moduleSource === 'animaux' ? 'Animaux' : choice.moduleSource === 'argent_de_poche' ? 'Argent de poche' : choice.moduleSource),
                            recurrence: updatedTx.recurrence !== 'none' ? (updatedTx.recurrence === 'monthly' ? 'Mensuelle' : updatedTx.recurrence === 'weekly' ? 'Hebdomadaire' : updatedTx.recurrence === 'daily' ? 'Quotidienne' : updatedTx.recurrence === 'yearly' ? 'Annuelle' : updatedTx.recurrence) : undefined,
                            member: matchedMemberObj ? matchedMemberObj.name : undefined
                          });

                          setVoiceTransactionAdded({
                            type: updatedTx.type as LooseValue,
                            amount: updatedTx.amount,
                            category: choice.category,
                            subCategory: choice.subCategory || undefined,
                            accountName: accounts.find(a => a.id === updatedTx.accountId)?.name || 'Principal'
                          });
                          
                          // Save to voice commands logs
                          const client = getSupabaseClient();
                          if (client && foyer?.id) {
                            try {
                              await client.from('voice_commands').insert({
                                id: crypto.randomUUID(),
                                foyer_id: foyer.id,
                                raw_text: voiceTranscript.replace(/^"|"$/g, ''),
                                parsed_intent: pendingVoiceCommandData.intent || 'transaction_expense',
                                is_success: true,
                                module_source: choice.moduleSource,
                                category_id: choice.category,
                                subcategory_id: choice.subCategory,
                                amount: updatedTx.amount,
                                currency: updatedTx.currency || 'EUR',
                                recurrence_type: updatedTx.recurrence || 'none',
                                recurrence_interval: updatedTx.recurrenceInterval || 1
                              });
                            } catch (err) {
                              console.warn("Log command error:", err);
                            }
                          }
                          
                          setVoiceFeedback(`💰 Transaction "${updatedTx.title}" enregistrée dans ${choice.label.split(' ')[1] || choice.label} !`);
                          setVoiceAmbiguous(false);
                          setPendingVoiceCommandData(null);
                          setActiveTab('budget');
                          setActiveModule('');
                          closeVoiceAssistantAfterDelay(4000);
                        }
                      }}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white text-center cursor-pointer transition-all active:scale-95 hover:border-[#6C5CFF]"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {voiceFeedback && !voiceTransactionAdded && (
              <div className="bg-white/5 border border-white/10 rounded-[20px] p-4 text-xs font-semibold text-[#00D26A] leading-normal animate-fade-in">
                {voiceFeedback}
              </div>
            )}

            {voiceTransactionAdded && (
              <div className="glass-panel border border-emerald-500/20 bg-emerald-950/20 rounded-[24px] p-5 text-center space-y-3 shadow-[0_8px_32px_rgba(16,185,129,0.15)] animate-fade-in">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                  <span>✓</span>
                  <span>{voiceTransactionAdded.type === 'expense' ? 'Dépense ajoutée' : 'Revenu ajouté'}</span>
                </div>
                <div className="text-3xl font-black text-white">
                  {voiceTransactionAdded.amount}€
                </div>
                <div className="text-xs font-semibold text-white/80">
                  {voiceTransactionAdded.category} {voiceTransactionAdded.subCategory && `> ${voiceTransactionAdded.subCategory}`}
                </div>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                  Compte : {voiceTransactionAdded.accountName}
                </div>
              </div>
            )}

            {voiceDebugInfo && devModeActive && (
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-left text-white/90 space-y-1 mt-3 max-w-sm mx-auto shadow-inner animate-fade-in">
                <div className="text-white/40 font-bold border-b border-white/5 pb-1 mb-2 flex items-center justify-between">
                  <span>⚙️ MODE DEBUG DÉVELOPPEUR</span>
                  <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">Actif</span>
                </div>
                <div>Phrase : <span className="text-[#FFB020]">"{voiceDebugInfo.phrase}"</span></div>
                <div>✓ Type détecté : <span className="text-[#6C5CFF] font-bold">{voiceDebugInfo.type}</span></div>
                <div>✓ Montant extrait : <span className="text-emerald-400 font-bold">{voiceDebugInfo.amount}</span></div>
                <div>✓ Catégorie déduite : <span className="text-[#4F8CFF] font-bold">{voiceDebugInfo.category}</span></div>
                <div>✓ Sous-catégorie : <span className="text-[#FF4D6D] font-bold">{voiceDebugInfo.subCategory}</span></div>
                <div>✓ Module : <span className="text-[#FFB020] font-bold">{voiceDebugInfo.module}</span></div>
                {voiceDebugInfo.recurrence && <div>✓ Récurrence : <span className="text-violet-400 font-bold">{voiceDebugInfo.recurrence}</span></div>}
                {voiceDebugInfo.member && <div>✓ Membre : <span className="text-pink-400 font-bold">{voiceDebugInfo.member}</span></div>}
              </div>
            )}

            <button 
              onClick={() => {
                if (voiceRecognitionRef.current) {
                  try {
                    voiceRecognitionRef.current.onresult = null;
                    voiceRecognitionRef.current.onerror = null;
                    voiceRecognitionRef.current.onend = null;
                    voiceRecognitionRef.current.stop();
                  } catch {
                    // Recognition may already be stopped.
                  }
                }
                if (voiceTimeoutRef.current) {
                  clearTimeout(voiceTimeoutRef.current);
                  voiceTimeoutRef.current = null;
                }
                setVoiceState('inactif');
                setVoiceActive(false);
                setVoiceContext(null);
                setVoiceDebugTrace(null);
                voiceActionStatusRef.current = 'waiting';
                setPendingGroceryItems(null);
                setIsEditingPendingGrocery(false);
              }}
              className="text-xs font-extrabold uppercase text-white/40 hover:text-white pt-2 cursor-pointer transition-colors"
            >
              Annuler
            </button>
          </div>

        </div>
      )}

      {showGroceryPopup && (
        <div 
          onClick={() => {
            setShowGroceryPopup(false);
            setActiveTab('menu');
            setActiveModule('courses');
            setExternalGroceryFilter('pending');
          }}
          className="fixed inset-0 bg-[#07111F]/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel border border-white/15 rounded-[40px] p-6 sm:p-8 max-w-md w-full relative shadow-[0_20px_50px_rgba(255,77,109,0.25)] flex flex-col max-h-[85vh]"
          >
            {/* Close button X */}
            <button
              onClick={() => {
                setShowGroceryPopup(false);
                setActiveTab('menu');
                setActiveModule('courses');
                setExternalGroceryFilter('pending');
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/60 hover:text-white text-xs font-bold flex items-center justify-center border border-white/10 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="text-center space-y-2 pb-4 border-b border-white/5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF4D6D] bg-[#FF4D6D]/10 px-3 py-1 rounded-full">
                Courses
              </span>
              <h2 className="text-xl font-extrabold text-white">Articles restants</h2>
              <p className="text-xs text-white/50 font-bold uppercase tracking-wider">
                {groceries.filter(g => !g.checked).length} articles à acheter
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1 no-scrollbar min-h-[150px]">
              {groceries.filter(g => !g.checked).length === 0 ? (
                <div className="text-center py-8 text-white/40 text-xs italic">
                  🛒 Aucun article restant à acheter !
                </div>
              ) : (
                groceries.filter(g => !g.checked).map(g => (
                  <div 
                    key={g.id}
                    className="flex justify-between items-center bg-white/5 border border-white/5 px-4 py-3 rounded-2xl transition hover:bg-white/8 hover:border-white/10"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getGroceryItemEmoji(g.name)}</span>
                      <span className="text-xs font-bold text-white">{g.name}</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-white/40 bg-white/5 border border-white/8 px-2.5 py-1 rounded-lg">
                      {formatGroceryQty(g.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setShowGroceryPopup(false);
                  setActiveTab('menu');
                  setActiveModule('courses');
                  setExternalGroceryFilter('pending');
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF4D6D] to-[#FFB020] text-white text-xs font-bold tracking-wider uppercase shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                Ouvrir la Liste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Profile Switcher for Kids Mode Escape */}
      {isKidMode && activeMemberObj && (
        <button 
          onClick={() => setProfileSwitcherOpen(true)}
          className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 z-[40] w-12 h-12 rounded-full border-2 border-white/20 shadow-[0_0_15px_rgba(108,92,255,0.4)] overflow-hidden active:scale-95 transition-transform"
        >
          <img src={activeMemberObj.photoUrl} alt="Profil" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Inline Notification Tray Panel */}
      {alertsPanelOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-white/10 rounded-[32px] max-w-md w-full p-6 space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2 text-white">
                <Bell className="w-5 h-5 text-[#6C5CFF]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Centre de Notifications</h3>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Supprimer toutes les notifications affichées ?')) {
                    const currentIds = filteredAlerts.map((a: DbRow) => a.id);
                    const newDeleted = [...deletedAlertIds, ...currentIds];
                    setDeletedAlertIds(newDeleted);
                    localStorage.setItem(`mf_deleted_alerts_${activeMemberId}`, JSON.stringify(newDeleted));
                    
                    // Also delete DB alerts from cloud
                    const dbIds = currentIds.filter((id: string) => !isComputedAlertId(id));
                    if (dbIds.length > 0) {
                      const client = getSupabaseClient();
                      if (client && foyer) {
                        client.from('alerts').delete().eq('foyer_id', foyer.id).in('id', dbIds).then();
                      }
                    }
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 ml-auto"
              >
                🗑️ Tout supprimer
              </button>
              <button 
                onClick={() => setAlertsPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pulsing Push Notification Permission Banner */}
            {'Notification' in window && Notification.permission !== 'granted' && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#6C5CFF]/15 to-[#FF4D6D]/5 border border-[#6C5CFF]/20 flex flex-col space-y-2.5 text-left animate-pulse" style={{ animationDuration: '4s' }}>
                <div className="flex items-start space-x-2.5">
                  <span className="text-lg">🔔</span>
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Activer les Notifications Push</h4>
                    <p className="text-[9px] text-white/50 leading-relaxed font-sans font-medium">Restez informé en direct quand un membre publie une photo, signale une urgence ou modifie l'agenda !</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const { notificationService } = await import('./services/notificationService');
                      const token = await notificationService.initializeFCM(activeMemberId, (payload) => {
                        console.log("[App Gesture] FCM notification received:", payload);
                        const newAlert = {
                          id: payload.data?.id || `alert-${Date.now()}`,
                          title: payload.notification?.title || 'Notification MyFamily+',
                          description: payload.notification?.body || '',
                          time: "À l'instant",
                          type: (payload.data?.type || 'info') as LooseValue,
                          read: false,
                          module: payload.data?.module || 'other',
                          senderUserId: payload.data?.senderUserId || payload.data?.sender_user_id,
                          senderMemberId: payload.data?.senderMemberId || payload.data?.sender_member_id,
                          senderName: payload.data?.senderName || payload.data?.sender_name,
                          senderAvatar: payload.data?.senderAvatar || payload.data?.sender_avatar,
                          createdAt: new Date().toISOString()
                        };
                        setAlerts(prev => [newAlert, ...prev]);
                      });
                      if (token) {
                        alert("🎉 Notifications push activées avec succès sur cet appareil !");
                        setAlertsPanelOpen(false);
                      } else {
                        alert("⚠️ Impossible d'activer les notifications. Veuillez vérifier les permissions de votre navigateur.");
                      }
                    } catch (err) {
                      console.error("Permission request error:", err);
                    }
                  }}
                  className="w-full py-2 bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:brightness-105 active:scale-98 transition-all cursor-pointer text-center shadow-md shadow-[#6C5CFF]/20"
                >
                  Autoriser les notifications
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
              {filteredAlerts
                .map((al: DbRow) => {
                const targetModule = al.module || '';
                const iconColor = al.type === 'success' ? '#00D26A' : al.type === 'warning' ? '#FFB020' : al.type === 'error' ? '#FF4D6D' : '#6C5CFF';
                const isRead = al.read || readAlertIds.includes(al.id);
                return (
                  <div 
                    key={al.id} 
                    onClick={() => {
                      handleMarkAsRead(al.id);
                      if (targetModule) {
                        const mainTabs = ['accueil', 'timeline', 'budget'];
                        if (mainTabs.includes(targetModule)) {
                          setActiveTab(targetModule as LooseValue);
                          setActiveModule('');
                        } else {
                          setActiveTab('menu');
                          setActiveModule(targetModule);
                        }
                        setAlertsPanelOpen(false);
                      }
                    }}
                    className={`p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start space-x-3 transition-all ${targetModule ? 'cursor-pointer hover:bg-white/10 hover:border-white/15 active:scale-[0.98]' : ''}`}
                  >
                    {al.senderAvatar ? (
                      <img 
                        src={al.senderAvatar} 
                        alt={al.senderName || 'Auteur'} 
                        className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="p-2.5 rounded-xl border shrink-0 mt-0.5" style={{ backgroundColor: `${iconColor}15`, borderColor: `${iconColor}30`, color: iconColor }}>
                        <Bell className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {(() => {
                        const alertFoyerId = al.foyerId || al.foyer_id || foyer?.id;
                        const alertFoyerObj = myFoyers.find((f: LooseValue) => f.foyer.id === alertFoyerId)?.foyer;
                        let originBadge = '';
                        if (targetModule === 'commune') {
                          originBadge = `🏛️ Ville de ${communeName || 'Ma Commune'}`;
                        } else if (targetModule === 'ecole') {
                          originBadge = `🎓 Établissement ${schoolName || 'Mon École'}`;
                        } else if (alertFoyerObj) {
                          originBadge = `👨‍👩‍👧‍👦 ${alertFoyerObj.name}`;
                        }
                        if (!originBadge) return null;
                        return (
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#6C5CFF] bg-[#6C5CFF]/10 px-2 py-0.5 rounded-full inline-block font-sans">
                            {originBadge}
                          </span>
                        );
                      })()}
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          {al.title}
                          {!isRead && <span className="w-2 h-2 rounded-full bg-[#FFB020] animate-pulse"></span>}
                        </h4>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed">{getCleanDescription(al.description)}</p>
                      <span className="text-[9px] text-white/30 block font-bold tracking-wider">
                        {formatRelativeTime(al.createdAt, al.time)}
                      </span>
                      
                      <div className="flex items-center gap-2 pt-1">
                        {!isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(al.id);
                            }}
                            className="px-2 py-0.5 rounded bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#6C5CFF] text-[8.5px] font-black uppercase tracking-wider hover:bg-[#6C5CFF]/25 active:scale-95 transition-all cursor-pointer"
                          >
                            👁️ Lu
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlert(al.id);
                          }}
                          className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[8.5px] font-black uppercase tracking-wider hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                    {targetModule && (
                      <ChevronRight className="w-4 h-4 text-white/20 shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => {
                setAlerts(prev => prev.map(a => ({ ...a, read: true })));
                markAllAlertsAsReadInCloud();
                
                // Also mark dynamic alerts as read
                const currentIds = filteredAlerts.map((a: DbRow) => a.id);
                if (currentIds.length > 0) {
                  setReadAlertIds(prev => {
                    const next = Array.from(new Set([...prev, ...currentIds]));
                    localStorage.setItem(`mf_read_alerts_${activeMemberId}`, JSON.stringify(next));
                    return next;
                  });
                }
                setAlertsPanelOpen(false);
              }}
              className="w-full py-3 rounded-[18px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all cursor-pointer text-center"
            >
              Tout marquer comme lu
            </button>
          </div>
        </div>
      )}


      {/* Interactive Profile Switcher Bottom Drawer */}
      {profileSwitcherOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-end justify-center">
          <div 
            onClick={() => setProfileSwitcherOpen(false)} 
            className="absolute inset-0"
          />
          <div className="relative glass-panel border-t border-white/10 rounded-t-[32px] w-full max-w-md p-6 space-y-5 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] animate-slide-up pointer-events-auto z-50">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Changer de profil</h3>
                <p className="text-[10px] text-white/40 mt-1">Basculez entre les membres de la famille {appFoyer?.name ? `"${appFoyer.name}"` : ''}</p>
              </div>
              <button 
                onClick={() => setProfileSwitcherOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-1 max-h-[60vh] overflow-y-auto pr-1">
              {members.filter(m => m.id !== "5").map((m) => {
                const isParent = ["admin", "parent", "Parent", "Chef de famille", "Gestionnaire"].includes(m.role);
                const isActive = m.id === activeMemberId;
                return (
                  <button
                    key={m.id}
                    onClick={() => switchActiveMember(m.id)}
                    className={`p-4 rounded-[24px] border text-left transition-all relative cursor-pointer flex flex-col items-center justify-center text-center space-y-2.5 ${
                      isActive 
                        ? "bg-[#6C5CFF]/15 border-[#6C5CFF] shadow-[0_0_15px_rgba(108,92,255,0.25)]" 
                        : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8"
                    }`}
                  >
                    <div className="relative">
                      <img 
                        src={m.photoUrl} 
                        alt={m.name} 
                        className="w-14 h-14 rounded-full object-cover border border-white/10"
                      />
                      <span className="absolute bottom-0 right-0 text-xs bg-[#07111F] rounded-full w-5 h-5 flex items-center justify-center border border-white/10">
                        {memberMoods[m.id] || "☀️"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">{m.name}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        isParent ? "bg-[#6C5CFF]/20 text-[#6C5CFF]" : "bg-[#FFB020]/20 text-[#FFB020]"
                      }`}>
                        {isParent ? "Parent 👑" : "Enfant ⭐️"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Space/Family selector (Slack/Discord style) */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">🏢 Mes Espaces / Familles</span>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {myFoyers.map((fItem) => {
                  const isCurrent = fItem.foyer.id === foyer?.id;
                  return (
                    <button
                      key={fItem.foyer.id}
                      onClick={() => requestActiveFoyerMembership(fItem)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isCurrent 
                          ? "bg-[#6C5CFF]/15 border-[#6C5CFF]/30 text-white" 
                          : "bg-white/3 border-transparent hover:border-white/10 hover:bg-white/5 text-white/70"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">🏠</span>
                        <div>
                          <span className="text-xs font-bold block">{fItem.foyer.name}</span>
                          <span className="text-[9px] text-white/40 block mt-0.5">Rôle : {
                            fItem.member.role === 'admin' ? 'Chef de famille 👑' :
                            fItem.member.role === 'parent' ? 'Parent 👨‍👩‍👧' :
                            fItem.member.role === 'child' ? 'Enfant 🧒' : 'Invité 👥'
                          }</span>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-xs bg-[#6C5CFF] text-white px-2 py-0.5 rounded-full font-black uppercase">Actif</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setProfileSwitcherOpen(false);
                    setWelcomeInviteCode("");
                    setWelcomeError(null);
                    setWelcomeScreenMode('join');
                    setShowWelcomeScreen(true);
                  }}
                  className="py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Rejoindre</span>
                </button>
                <button
                  onClick={async () => {
                    setProfileSwitcherOpen(false);
                    setWelcomeError(null);
                    setWelcomeScreenMode('create');
                    setShowWelcomeScreen(true);
                  }}
                  className="py-2.5 rounded-xl border border-[#6C5CFF]/30 bg-[#6C5CFF]/10 hover:bg-[#6C5CFF]/20 text-[#6C5CFF] text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Créer</span>
                </button>
              </div>
            </div>

            {/* Météo Mentale active check-in */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2.5">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Météo Mentale de {members.find(m => m.id === activeMemberId)?.name}</span>
              <div className="flex justify-between items-center bg-[#07111F]/50 p-2.5 rounded-xl border border-white/5">
                <span className="text-[11px] font-bold text-white/70">Comment vous sentez-vous ?</span>
                <div className="flex space-x-1.5">
                  {['☀️', '🌈', '☁️', '⛈️'].map((mood) => {
                    const activeMood = memberMoods[activeMemberId] === mood;
                    return (
                      <button
                        key={mood}
                        onClick={() => {
                          setMemberMoods(prev => ({
                            ...prev,
                            [activeMemberId]: mood
                          }));
                          
                          // Parent secret empathic warning in alerts panel
                          if ((activeMemberId === '3' || activeMemberId === '4') && (mood === '⛈️' || mood === '☁️')) {
                            const kidName = members.find(m => m.id === activeMemberId)?.name;
                            const newAlert = {
                              id: `a-mood-${Date.now()}-by-${activeMemberId}`,
                              title: `Écho Émotionnel : ${kidName} a besoin de vous 🧡`,
                              description: `${kidName} a réglé sa météo mentale sur "${mood === '⛈️' ? 'Tempête ⛈️' : 'Nuageux ☁️'}". Conseil IA : passez 15 minutes en tête-à-tête avec lui aujourd'hui.`,
                              time: 'À l\'instant',
                              type: 'warning' as const,
                              read: false
                            };
                            setAlerts(prev => [newAlert, ...prev]);
                            saveAlertToCloud(newAlert);
                          }
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all hover:scale-110 active:scale-95 ${
                          activeMood ? 'bg-white/10 border border-white/20' : 'bg-transparent border border-transparent'
                        }`}
                      >
                        {mood}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Link to Settings/Manage profiles */}
            <button
              onClick={() => {
                setProfileSwitcherOpen(false);
                setActiveTab('menu');
                setActiveModule('settings');
              }}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/8 text-white/85 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
            >
              <SettingsIcon className="w-4 h-4 text-[#6C5CFF]" />
              <span>Gérer les profils (Paramètres)</span>
            </button>
          </div>
        </div>
      )}

      {/* PARENT PIN LOCK SCREEN OVERLAY */}
      {pinVerificationOpen && (
        <div className="fixed inset-0 bg-[#07111F]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-fade-in text-white">
          <div className="max-w-xs w-full space-y-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 flex items-center justify-center text-[#FF4D6D] shadow-lg animate-bounce">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider">Contrôle Parental</h2>
              <p className="text-xs text-white/50 leading-relaxed">
                Veuillez saisir le code PIN parent à 4 chiffres pour accéder à ce profil.
              </p>
            </div>

            {/* PIN Code Dots Indicator */}
            <div className="flex justify-center space-x-4 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-all duration-200 ${
                    pinInput.length > idx 
                      ? 'bg-[#6C5CFF] border-[#6C5CFF] scale-110 shadow-[0_0_8px_rgba(108,92,255,0.8)]' 
                      : 'bg-white/5'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 4) {
                      const val = pinInput + num;
                      setPinInput(val);
                      if (val.length === 4) {
                        void handleVerifyPin(val);
                      }
                    }
                  }}
                  className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-lg font-bold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95"
                >
                  {num}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setPinVerificationOpen(false);
                  setPinTargetMemberId(null);
                  pendingPinActionRef.current = null;
                }}
                className="w-14 h-14 rounded-full bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 text-xs font-black uppercase flex items-center justify-center transition-all cursor-pointer text-red-400 active:scale-95"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pinInput.length < 4) {
                    const val = pinInput + '0';
                    setPinInput(val);
                    if (val.length === 4) {
                      void handleVerifyPin(val);
                    }
                  }
                }}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-lg font-bold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pinInput.length > 0) {
                    setPinInput(prev => prev.slice(0, -1));
                  }
                }}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-sm flex items-center justify-center transition-all cursor-pointer text-white/60 active:scale-95"
              >
                ⌫
              </button>
            </div>

            {pinError && (
              <p className="text-xs font-bold text-[#FF4D6D] uppercase tracking-wider animate-shake">
                {pinErrorMessage}
              </p>
            )}
          </div>
        </div>
      )}



      {/* Floating PWA Install Prompt Banner */}
      {showInstallPrompt && (
        <div className="fixed bottom-24 left-4 right-4 z-[45] glass-panel border border-[#6C5CFF]/30 p-4 rounded-[24px] shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in bg-[#07111F]/90 backdrop-blur-md">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#6C5CFF]/20 to-[#FF4D6D]/10 border border-[#6C5CFF]/30 text-[#6C5CFF] shrink-0">
              <Sparkles className="w-5 h-5 text-[#FFB020] animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Installer l'application MyFamily+</h4>
              <p className="text-[10px] text-white/60 leading-relaxed mt-0.5">Profitez de l'affichage plein écran, d'une rapidité accrue, et des raccourcis "+ Dépense" d'appui long !</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 justify-end">
            <button 
              onClick={() => {
                sessionStorage.setItem('mf_pwa_dismissed', 'true');
                setShowInstallPrompt(false);
              }}
              className="px-3.5 py-2 rounded-xl text-[10px] font-black text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider"
            >
              Plus tard
            </button>
            <button 
              onClick={handleInstallApp}
              className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white text-[10px] font-extrabold shadow-md shadow-[#6C5CFF]/20 hover:brightness-105 active:scale-95 transition-all uppercase tracking-widest flex items-center space-x-1"
            >
              <span>Installer</span>
            </button>
          </div>
        </div>
      )}

      {/* iOS Custom PWA Step-by-Step Install Guide Overlay */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-[#07111F]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-[32px] max-w-sm w-full p-6 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-60 h-60 rounded-full bg-[#6C5CFF]/15 blur-[60px] pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg">
                <Sparkles className="w-8 h-8 text-[#FFB020] animate-pulse" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Installer MyFamily+</h3>
                <p className="text-xs text-white/60">Ajoutez le raccourci sur votre écran d'accueil en 3 étapes simples :</p>
              </div>

              <div className="space-y-3.5 text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center space-x-3 text-xs text-white/80">
                  <span className="w-5 h-5 rounded-full bg-[#6C5CFF] text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 font-sans">1</span>
                  <span>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block bg-white/10 p-1 rounded font-mono">📤</span> (en bas de votre écran Safari).</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-white/80">
                  <span className="w-5 h-5 rounded-full bg-[#6C5CFF] text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 font-sans">2</span>
                  <span>Faites défiler et sélectionnez <strong>Sur l'écran d'accueil</strong> <span className="inline-block bg-white/10 p-0.5 px-1.5 rounded font-bold text-[#FFB020]">+</span>.</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-white/80">
                  <span className="w-5 h-5 rounded-full bg-[#6C5CFF] text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 font-sans">3</span>
                  <span>Confirmez en haut à droite en cliquant sur <strong>Ajouter</strong>.</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowIosGuide(false);
                  sessionStorage.setItem('mf_pwa_dismissed', 'true');
                }}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition-all uppercase tracking-wider active:scale-[0.98]"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
       )}

      {/* Real-time In-App Notification Toast */}
      {activeToast && (
        <div className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999] p-4 rounded-2xl bg-slate-950/95 border border-[#6C5CFF]/30 shadow-2xl animate-slide-down flex items-start space-x-3 pointer-events-auto">
          <div className="p-2 rounded-xl bg-[#6C5CFF]/20 text-[#6C5CFF]">
            <span className="text-xl">🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{activeToast.title}</h4>
            <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed">{activeToast.description}</p>
          </div>
          <button 
            onClick={() => setActiveToast(null)}
            className="text-white/40 hover:text-white text-xs cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice Assistant Confirmation Toast */}
      {voiceToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-[0_8px_32px_rgba(0,210,106,0.15)] flex items-center gap-2 animate-fade-in whitespace-nowrap">
          <span>✨</span> {voiceToast}
        </div>
      )}

      {/* Welcome Screen Overlay Modal */}
      {showWelcomeScreen && (
        <div className="fixed inset-0 bg-[#07111F]/95 backdrop-blur-md z-[99] flex items-center justify-center p-6 animate-fade-in text-white overflow-y-auto">
          <div className="max-w-md w-full glass-panel border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden bg-white/2 backdrop-blur-lg">
            <div className="absolute top-[-20%] left-[-20%] w-60 h-60 rounded-full bg-[#6C5CFF]/15 blur-[60px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-60 h-60 rounded-full bg-[#FF4D6D]/15 blur-[60px] pointer-events-none" />

            {welcomeScreenMode === 'select' && (
              <div className="space-y-6 text-center relative z-10">
                <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg">
                  <Home className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Bienvenue sur MyFamily+</h2>
                  <p className="text-xs text-white/50 leading-relaxed">Que souhaitez-vous faire pour commencer ?</p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleWelcomeCreateFoyer}
                    disabled={welcomeLoading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(108,92,255,0.3)] flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>🏠 Créer une famille</span>
                  </button>

                  <button
                    onClick={() => {
                      setWelcomeError(null);
                      setWelcomeScreenMode('join');
                    }}
                    disabled={welcomeLoading}
                    className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>👨‍👩‍👧‍👦 Rejoindre une famille</span>
                  </button>

                  {myFoyers.length > 0 ? (
                    <button
                      onClick={() => setShowWelcomeScreen(false)}
                      disabled={welcomeLoading}
                      className="w-full py-3.5 rounded-2xl bg-transparent text-white/40 hover:text-white/60 text-xs font-bold transition-all cursor-pointer animate-fade-in"
                    >
                      Annuler
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {welcomeScreenMode === 'create' && (
              <div className="space-y-5 relative z-10 text-center">
                <div className="space-y-1">
                  <h2 className="text-lg font-black">🏠 Créer une Famille</h2>
                  <p className="text-xs text-white/50">Créez votre propre espace familial sécurisé.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <button
                    onClick={handleWelcomeCreateFoyer}
                    disabled={welcomeLoading}
                    className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {welcomeLoading ? 'Création...' : 'Confirmer la création automatique'}
                  </button>

                  {welcomeError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2 text-left">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{welcomeError}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setWelcomeScreenMode('select')}
                    disabled={welcomeLoading}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}

            {welcomeScreenMode === 'join' && (
              <div className="space-y-4 relative z-10 text-left">
                <div className="space-y-1">
                  <h2 className="text-lg font-black">👨‍👩‍👧‍👦 Rejoindre une Famille</h2>
                  <p className="text-xs text-white/50">Saisissez le code d'invitation pour demander à rejoindre un foyer.</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Code d'Invitation (ex: FAM-XXXXX)</label>
                    <input
                      type="text"
                      required
                      placeholder="FAM-XXXXX"
                      value={welcomeInviteCode}
                      onChange={(e) => setWelcomeInviteCode(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Votre Nom d'affichage</label>
                    <input
                      type="text"
                      required
                      placeholder="Votre nom"
                      value={welcomeDisplayName}
                      onChange={(e) => setWelcomeDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">Rôle souhaité</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['parent', 'child', 'guest'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setWelcomeRole(r)}
                          className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer capitalize ${
                            welcomeRole === r 
                              ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white' 
                              : 'bg-[#07111F] border-transparent text-white/50 hover:text-white'
                          }`}
                        >
                          {r === 'parent' ? 'Parent 👨‍👩‍👧' : r === 'child' ? 'Enfant 🧒' : 'Invité 👥'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {welcomeError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{welcomeError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col space-y-2">
                    <button
                      onClick={handleWelcomeJoinFoyer}
                      disabled={welcomeLoading}
                      className="w-full py-3 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {welcomeLoading ? 'Envoi...' : 'Envoyer la demande'}
                    </button>
                    <button
                      onClick={() => setWelcomeScreenMode('select')}
                      disabled={welcomeLoading}
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              </div>
            )}

            {welcomeScreenMode === 'success' && welcomeCreatedFoyer && (
              <div className="space-y-6 text-center relative z-10 animate-fade-in">
                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-black uppercase text-white">Foyer Créé !</h2>
                  <p className="text-xs text-white/50">Votre foyer "{welcomeCreatedFoyer.name}" est prêt.</p>
                </div>

                <div className="bg-[#07111F]/70 border border-white/5 rounded-2xl p-5 text-left space-y-4 font-sans text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Code Foyer</span>
                    <span className="text-sm font-mono font-bold text-white select-all block mt-0.5">{welcomeCreatedFoyer.inviteCode}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Lien de Partage</span>
                    <span className="text-[11px] font-mono text-[#6C5CFF] select-all block mt-0.5 break-all">{welcomeCreatedFoyer.inviteLink}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center pt-2">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-2">QR Code d'Invitation</span>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent("mafamille.app/join/" + welcomeCreatedFoyer.inviteCode)}`} 
                      alt="QR Code" 
                      className="w-36 h-36 border border-white/10 rounded-2xl p-2 bg-white" 
                    />
                  </div>
                </div>

                <button
                  onClick={handleWelcomeSuccessFinish}
                  disabled={welcomeLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  {welcomeLoading ? 'Chargement...' : "Commencer l'aventure ➔"}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
