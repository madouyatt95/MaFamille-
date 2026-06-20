/* eslint-disable @typescript-eslint/no-explicit-any, no-useless-assignment -- legacy Supabase and module payloads still use broad shapes; tracked in docs/lint_cleanup_remaining.md; legacy branching keeps intermediate variables for clarity */
import React, { lazy, Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { detectGroceryCategory, parseSmartNaturalSentence, getGroceryItemEmoji, formatGroceryQty, POPULAR_GROCERIES } from '../utils/groceryParser';
import { getSupabaseClient } from '../utils/supabase';
import { foyerService } from '../services/foyerService';
import { PREMIUM_MODULE_FEATURES } from '../utils/premiumFeatures';
import { compressImageToBlob, dataUrlToBlob, extensionFromMimeType, isDataUrl, uploadBlobToStorage } from '../utils/imageCompressor';
import { 
  FolderLock, 
  HeartPulse, 
  ShoppingCart, 
  Brush, 
  GraduationCap, 
  ShieldCheck, 
  ArrowLeft,
  AlertCircle,
  Activity,
  Check,
  Plus,
  Calendar,
  Layers,
  Car,
  Home as HomeIcon,
  Plane,
  Dog,
  Coins,
  Sparkles,
  Camera,
  Users,
  HeartHandshake,
  Lock,
  UtensilsCrossed,
  Mic,
  Trash2,
  Edit3,
  Map as MapIcon,
  BookOpen,
  Wrench,
  Save,
  X,
  Phone,
  Mail,
  Star,
  Eye,
  EyeOff,
  Archive,
  RotateCcw,
  Filter,
  AlertTriangle,
  Gamepad2
} from 'lucide-react';
import type { 
  DocumentFile, 
  ChoreTask, 
  GroceryItem, 
  Member, 
  Vehicle, 
  HomeMaintenance, 
  Trip, 
  PetRecord, 
  SavingGoal,
  NotificationAlert,
  MemoryLog,
  FamilyVote,
  SchoolTask,
  Dish,
  ChatGroup,
  ChatMessage,
  Demarche,
  JustificatifPack,
  Artisan,
  PocketMoneyChild,
  PocketMoneyRule,
  ArchivedList,
  Account,
  Transaction,
  MalusTemplate,
  AppliedMalus
} from '../types';
import { getDefaultPermissions, parseChoreTitle, serializeChoreTitle, serializePocketMoneyTitle } from '../types';
import type { ModulePermissions, FamilyModule } from '../types';
import { MemberAvatar } from '../components/MemberAvatar';

const EcoChef = lazy(() => import('../components/modules/EcoChef').then(module => ({ default: module.EcoChef })));
const TuteurScolaire = lazy(() => import('../components/modules/TuteurScolaire').then(module => ({ default: module.TuteurScolaire })));
const CapsuleTemporelle = lazy(() => import('../components/modules/CapsuleTemporelle').then(module => ({ default: module.CapsuleTemporelle })));
const VoyageIA = lazy(() => import('../components/modules/VoyageIA').then(module => ({ default: module.VoyageIA })));
const ConseilFamille = lazy(() => import('../components/modules/ConseilFamille').then(module => ({ default: module.ConseilFamille })));
const PeaceMaker = lazy(() => import('../components/modules/PeaceMaker').then(module => ({ default: module.PeaceMaker })));
const MaVieSimulator = lazy(() => import('../components/modules/MaVieSimulator').then(module => ({ default: module.MaVieSimulator })));
const CoffreFortAvance = lazy(() => import('../components/modules/CoffreFortAvance').then(module => ({ default: module.CoffreFortAvance })));
const Messagerie = lazy(() => import('../components/modules/Messagerie').then(module => ({ default: module.Messagerie })));
const WidgetMeteo = lazy(() => import('../components/modules/WidgetMeteo').then(module => ({ default: module.WidgetMeteo })));
const FamilyMap = lazy(() => import('./FamilyMap').then(module => ({ default: module.FamilyMap })));
const ConteurIA = lazy(() => import('../components/modules/ConteurIA').then(module => ({ default: module.ConteurIA })));
const ContactsImportants = lazy(() => import('../components/modules/ContactsImportants').then(module => ({ default: module.ContactsImportants })));
const VehiclesModule = lazy(() => import('../components/modules/VehiclesModule').then(module => ({ default: module.VehiclesModule })));
const PetsModule = lazy(() => import('../components/modules/PetsModule').then(module => ({ default: module.PetsModule })));
const FamilyGames = lazy(() => import('./FamilyGames').then(module => ({ default: module.FamilyGames })));

// Utility helper to parse French custom input dates (e.g. "12 Octobre 2027", "24/06/2026") into YYYY-MM-DD ISO strings.
function parseCustomDateToISO(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Try directly parsing standard formats like YYYY-MM-DD
  const matchISO = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchISO) return dateStr.trim();
  
  // Try parsing DD/MM/YYYY
  const matchSlash = dateStr.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (matchSlash) {
    const day = matchSlash[1].padStart(2, '0');
    const month = matchSlash[2].padStart(2, '0');
    const year = matchSlash[3];
    return `${year}-${month}-${day}`;
  }

  // Parse text format like "24 Juin 2026"
  const cleanStr = dateStr.toLowerCase().trim();
  const months: Record<string, string> = {
    'janvier': '01', 'jan': '01',
    'février': '02', 'fevrier': '02', 'fév': '02', 'fev': '02',
    'mars': '03',
    'avril': '04', 'avr': '04',
    'mai': '05',
    'juin': '06',
    'juillet': '07', 'juil': '07',
    'août': '08', 'aout': '08',
    'septembre': '09', 'sept': '09', 'sep': '09',
    'octobre': '10', 'oct': '10',
    'novembre': '11', 'nov': '11',
    'décembre': '12', 'decembre': '12', 'déc': '12', 'dec': '12'
  };

  const words = cleanStr.split(/\s+/);
  let day = '01';
  let month = '01';
  let year = String(new Date().getFullYear());

  // Find month
  for (const word of words) {
    if (months[word]) {
      month = months[word];
      break;
    }
  }

  // Find day (1 or 2 digits)
  const dayMatch = cleanStr.match(/\b(\d{1,2})\b/);
  if (dayMatch) {
    day = dayMatch[1].padStart(2, '0');
  }

  // Find year (4 digits)
  const yearMatch = cleanStr.match(/\b(\d{4})\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  return `${year}-${month}-${day}`;
}

interface MenuHubProps {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  tasks: ChoreTask[];
  groceries: GroceryItem[];
  externalGroceryFilter?: 'all' | 'pending' | 'checked';
  members: Member[];
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  maintenance: HomeMaintenance[];
  setMaintenance: React.Dispatch<React.SetStateAction<HomeMaintenance[]>>;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  pets: PetRecord[];
  setPets: React.Dispatch<React.SetStateAction<PetRecord[]>>;
  pocketMoney: PocketMoneyChild[];
  setPocketMoney: React.Dispatch<React.SetStateAction<PocketMoneyChild[]>>;
  goals: SavingGoal[];
  alerts: NotificationAlert[];
  setAlerts?: React.Dispatch<React.SetStateAction<NotificationAlert[]>>;
  currencySymbol: string;
  formatMoney: (amount: number) => string;
  activeModule: string;
  setActiveModule: (moduleName: string) => void;
  onAddTask: (task: any) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, title: string, points: number, rotation: 'daily' | 'weekly' | 'none', assigneeId: string, assigneeName: string) => void;
  onAddGrocery: (item: any) => void;
  setTasks?: React.Dispatch<React.SetStateAction<ChoreTask[]>>;
  setSavingGoals?: React.Dispatch<React.SetStateAction<SavingGoal[]>>;
  onToggleTask: (id: string) => void;
  onValidateTask: (id: string) => void;
  onToggleGrocery: (id: string) => void;
  onAddGroceryItem: (
    name: string, 
    category: string, 
    qty: string, 
    meal?: string, 
    addedBy?: string, 
    isFavorite?: boolean
  ) => void;
  onDeleteGroceryItem: (id: string) => void;
  onEditGroceryItem: (id: string, name: string, qty: string) => void;
  setActiveTab: (tab: string) => void;
  archivedLists: ArchivedList[];
  onArchiveCurrentList: (name: string, store?: string) => void;
  onReuseArchivedList: (listId: string) => void;
  onDeleteArchivedList: (listId: string) => void;
  onCleanGroceryList: (option: 'checked' | 'all' | 'archive_first' | 'favorites_only') => void;
  onToggleFavoriteGrocery: (id: string) => void;
  
  // Custom states
  malusTemplates: MalusTemplate[];
  setMalusTemplates: React.Dispatch<React.SetStateAction<MalusTemplate[]>>;
  appliedMaluses: AppliedMalus[];
  setAppliedMaluses: React.Dispatch<React.SetStateAction<AppliedMalus[]>>;
  activeMemberId?: string;
  memories: MemoryLog[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
  votes: FamilyVote[];
  setVotes: React.Dispatch<React.SetStateAction<FamilyVote[]>>;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  grades: any[];
  setGrades: React.Dispatch<React.SetStateAction<any[]>>;
  schedule: any[];
  setSchedule: React.Dispatch<React.SetStateAction<any[]>>;
  dishes: Dish[];
  setDishes: React.Dispatch<React.SetStateAction<Dish[]>>;
  chatGroups: ChatGroup[];
  setChatGroups: React.Dispatch<React.SetStateAction<ChatGroup[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  demarches: Demarche[];
  setDemarches: React.Dispatch<React.SetStateAction<Demarche[]>>;
  justificatifPacks: JustificatifPack[];
  setJustificatifPacks: React.Dispatch<React.SetStateAction<JustificatifPack[]>>;
  onAddEvent?: (title: string, dateTime: string) => void;
  onAddTransaction?: (newTrans: any) => void;
  onAddEventDirect?: (newEvent: any) => void;
  isPremium?: boolean;
  setIsPremium?: (val: boolean) => void;
  onTriggerPaywall?: () => void;
  vaccines?: any[];
  setVaccines?: React.Dispatch<React.SetStateAction<any[]>>;
  setMembers?: React.Dispatch<React.SetStateAction<Member[]>>;
  artisans?: Artisan[];
  setArtisans?: React.Dispatch<React.SetStateAction<Artisan[]>>;
  onUpdateMemberProfile?: (memberId: string, updates: any) => Promise<void>;
  initialChatGroupId?: string;
  foyer?: any;
  accounts?: Account[];
  transactions?: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  memberPermissions?: Record<string, Record<FamilyModule, ModulePermissions>>;
  isKidMode?: boolean;
  onAcceptCandidate?: (taskId: string, memberId: string) => void;
  onRefuseCandidate?: (taskId: string, memberId: string) => void;
  onSendNotification?: (title: string, description: string, moduleName?: string, type?: 'info' | 'warning' | 'error' | 'success') => Promise<void>;
}

const modIdToFamilyModule: Record<string, FamilyModule> = {
  'conseil': 'conseil_famille',
  'conteur': 'histoires_soir',
  'taches': 'taches',
  'ecole': 'ecole',
  'logement': 'logement',
  'agenda': 'agenda',
  'courses': 'courses',
  'sante': 'sante',
  'voyages': 'voyages',
  'documents': 'documents',
  'vehicules': 'vehicules',
  'animaux': 'animaux',
  'capsule': 'capsule_temporelle',
  'contacts': 'repertoire_important',
  'peacemaker': 'peacemaker',
  'settings': 'parametres',
  'carte': 'carte_familiale',
  'menus': 'menu_semaine',
  'argent': 'taches',
  'games': 'jeux_famille'
};

const getTripDuration = (start: string, end: string) => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? `${diffDays} jour${diffDays > 1 ? 's' : ''}` : null;
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error("Erreur de chargement de l'image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
    reader.readAsDataURL(file);
  });
};

const DishImage: React.FC<{ src: string | undefined; alt: string; className?: string }> = ({ src, alt, className = "w-12 h-12 rounded-xl" }) => {
  const [hasError, setHasError] = React.useState(false);
  
  if (!src || hasError) {
    return (
      <div className={`${className} shrink-0 bg-gradient-to-tr from-[#FFB020] to-[#FF4D6D] flex items-center justify-center text-white border border-white/10 shadow-sm`}>
        <UtensilsCrossed className="w-5 h-5 text-black" />
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      onError={() => setHasError(true)}
      className={`${className} object-cover shrink-0 border border-white/10`}
    />
  );
};

export const MenuHub: React.FC<MenuHubProps> = ({
  foyer,
  memberPermissions,
  documents,
  setDocuments,
  members,
  tasks,
  groceries,
  vehicles,
  setVehicles,
  maintenance,
  setMaintenance,
  trips,
  setTrips,
  pets,
  setPets,
  pocketMoney,
  setPocketMoney,
  artisans = [],
  setArtisans,
  onUpdateMemberProfile,
  goals,
  formatMoney,
  activeModule,
  setActiveModule,
  onAddTask,
  setTasks,
  setSavingGoals,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onValidateTask,
  onToggleGrocery,
  onAddGroceryItem,
  onDeleteGroceryItem,
  onEditGroceryItem,
  setActiveTab,
  archivedLists = [],
  onArchiveCurrentList,
  onReuseArchivedList,
  onDeleteArchivedList,
  onCleanGroceryList,
  onToggleFavoriteGrocery,
  externalGroceryFilter,
  malusTemplates,
  setMalusTemplates,
  appliedMaluses,
  setAppliedMaluses,
  
  activeMemberId = '1',
  memories,
  setMemories,
  votes,
  setVotes,
  schoolTasks,
  setSchoolTasks,
  grades,
  setGrades,
  schedule,
  setSchedule,
  dishes,
  setDishes,
  chatGroups,
  setChatGroups,
  chatMessages,
  setChatMessages,
  demarches,
  setDemarches,
  justificatifPacks,
  setJustificatifPacks,
  onAddEvent,
  onAddTransaction,
  onAddEventDirect,
  isPremium = false,
  onTriggerPaywall,
  vaccines = [],
  setVaccines,
  setMembers,
  initialChatGroupId,
  accounts = [],
  transactions = [],
  setTransactions,
  alerts = [],
  setAlerts,
  isKidMode = false,
  onAcceptCandidate,
  onRefuseCandidate,
  onSendNotification,
}) => {
  const activePermissions = useMemo(() => {
    if (memberPermissions && activeMemberId && memberPermissions[activeMemberId]) {
      return memberPermissions[activeMemberId];
    }
    // Fallback based on inferred role
    const activeMember = members.find(m => m.id === activeMemberId);
    let roleClean = 'enfant';
    if (activeMember) {
      const r = (activeMember.role || '').toLowerCase();
      if (r.includes('chef') || r.includes('admin')) roleClean = 'chef_famille';
      else if (r.includes('gestionnaire')) roleClean = 'gestionnaire';
      else if (r.includes('adulte') || r.includes('membre adulte')) roleClean = 'adulte';
      else if (r.includes('parent')) roleClean = 'parent';
      else if (r.includes('adolescent')) roleClean = 'adolescent';
      else if (r.includes('enfant')) roleClean = 'enfant';
      else if (r.includes('invit') || r.includes('guest')) roleClean = 'invite';
    } else {
      if (activeMemberId === '1') roleClean = 'chef_famille';
      else if (activeMemberId === '2') roleClean = 'parent';
      else if (activeMemberId === '3') roleClean = 'enfant';
      else if (activeMemberId === '4') roleClean = 'adolescent';
    }
    return getDefaultPermissions(roleClean);
  }, [memberPermissions, activeMemberId, members]);

  const getPermission = (modId: string, action: keyof ModulePermissions): boolean => {
    if (!modId) return true;
    const familyModKey = modIdToFamilyModule[modId];
    if (!familyModKey) return true; // default true for non-managed or settings
    const perm = activePermissions[familyModKey];
    return perm ? perm[action] : true;
  };

  React.useEffect(() => {
    if (activeModule) {
      const familyModKey = modIdToFamilyModule[activeModule];
      if (familyModKey) {
        const perm = activePermissions[familyModKey];
        if (perm && !perm.voir) {
          // Access denied! Reset active module.
          setActiveModule('');
        }
      }
    }
  }, [activeModule, activePermissions, setActiveModule]);

  const [newGroceryName, setNewGroceryName] = useState('');
  const [newGroceryCat, setNewGroceryCat] = useState('Épicerie');
  const [newGroceryQty, setNewGroceryQty] = useState(1);
  const [newGroceryUnit, setNewGroceryUnit] = useState('pièces');
  const [grocerySubTab, setGrocerySubTab] = useState<'liste' | 'ecochef' | 'menus' | 'archives'>('liste');
  const [groceryFilter, setGroceryFilter] = useState<'all' | 'pending' | 'checked'>('all');

  React.useEffect(() => {
    if (externalGroceryFilter) {
      queueMicrotask(() => setGroceryFilter(externalGroceryFilter));
    }
  }, [externalGroceryFilter]);
  const [showGrocerySuggestions, setShowGrocerySuggestions] = useState(false);
  const [grocerySort, setGrocerySort] = useState<'custom' | 'alphabetical' | 'parcours'>('custom');
  
  // Archiving states
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveListName, setArchiveListName] = useState('');
  const [archiveListStore, setArchiveListStore] = useState('');

  // Clean list modal state
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  
  // Trip Archiving states
  const [archivedTripIds, setArchivedTripIds] = useState<string[]>(() => {
    try {
      const foyerId = foyer?.id || localStorage.getItem('mf_cloud_foyer_id') || 'default';
      const key = `mf_archived_trips_${foyerId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  });
  const [showArchivedTrips, setShowArchivedTrips] = useState(false);
  const [showArchivedVac, setShowArchivedVac] = useState(false);

  const toggleArchiveTrip = (tripId: string) => {
    const foyerId = foyer?.id || localStorage.getItem('mf_cloud_foyer_id') || 'default';
    const isCurrentlyArchived = archivedTripIds.includes(tripId);
    const updated = isCurrentlyArchived
      ? archivedTripIds.filter(id => id !== tripId)
      : [...archivedTripIds, tripId];
    setArchivedTripIds(updated);
    localStorage.setItem(`mf_archived_trips_${foyerId}`, JSON.stringify(updated));
  };
  
  // ChoreTask inline edit states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskPoints, setEditTaskPoints] = useState(10);
  const [editTaskRotation, setEditTaskRotation] = useState<'daily' | 'weekly' | 'none'>('daily');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState('');



  // Suggestions d'articles de courses intelligentes
  const grocerySuggestions = React.useMemo(() => {
    if (!newGroceryName.trim()) return [];
    const popularGroceries = POPULAR_GROCERIES;
    const existingNames = groceries ? groceries.map(g => g.name) : [];
    const allCandidates = Array.from(new Set([...existingNames, ...popularGroceries]));
    const query = newGroceryName.toLowerCase().trim();
    return allCandidates
      .filter(item => {
        const itemLower = item.toLowerCase();
        return itemLower.includes(query) && itemLower !== query;
      })
      .slice(0, 5);
  }, [newGroceryName, groceries]);

  // Form states for meals
  const [mealDay, setMealDay] = useState('Lun');
  const [mealType, setMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [mealName, setMealName] = useState('');
  const [mealImagePreset, setMealImagePreset] = useState('https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?w=300&auto=format&fit=crop&q=80');
  const [mealIngredients, setMealIngredients] = useState('');

  const MEAL_IMAGE_PRESETS = [
    { name: '🍗 Poulet Rôti & Frites', url: 'https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?w=300&auto=format&fit=crop&q=80' },
    { name: '🐟 Pavé de Saumon Grillé', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&auto=format&fit=crop&q=80' },
    { name: '🥗 Salade de Quinoa Bio', url: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=300&auto=format&fit=crop&q=80' },
    { name: '🍕 Pizzas Maison en Famille', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80' },
    { name: '🍲 Soupe Légumes Anti-Gaspi', url: 'https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=300&auto=format&fit=crop&q=80' }
  ];
  React.useEffect(() => {
    if (activeModule === 'menus') {
      queueMicrotask(() => setGrocerySubTab('menus'));
    } else if (activeModule === 'courses') {
      queueMicrotask(() => setGrocerySubTab('liste'));
    }
  }, [activeModule]);

  // --- Feature 1: Shared Family Quests ---
  interface SharedQuest {
    id: string;
    title: string;
    target: number;
    current: number;
    reward: string;
    posterUrl?: string;
  }
  const [sharedQuests] = useState<SharedQuest[]>(() => {
    const stored = localStorage.getItem('mf_shared_quests');
    return stored ? JSON.parse(stored) : [
      { id: 'sq-1', title: '10h d\'activité physique cumulées cette semaine', target: 10, current: 4, reward: 'Sortie cinéma en famille 🎬' },
      { id: 'sq-2', title: 'Grand ménage de printemps (toutes les pièces)', target: 6, current: 2, reward: 'Pizza Party 🍕' }
    ];
  });
  React.useEffect(() => { localStorage.setItem('mf_shared_quests', JSON.stringify(sharedQuests)); }, [sharedQuests]);

  // --- Feature 6: Health Emergency Card ---
  type HealthCareKind = 'consultation' | 'vaccine' | 'treatment' | 'prescription' | 'allergy' | 'document' | 'expense';
  interface HealthCareEntry {
    id: string;
    kind: HealthCareKind;
    memberId: string;
    memberName: string;
    title: string;
    date: string;
    time?: string;
    practitioner?: string;
    notes?: string;
    documentId?: string;
    createdAt: string;
  }

  const [healthSubTab, setHealthSubTab] = useState<'carnet' | 'soins' | 'documents' | 'croissance' | 'vaccins' | 'urgence' | 'frais'>('carnet');
  const [selectedHealthMemberId, setSelectedHealthMemberId] = useState(() => {
    return localStorage.getItem('mf_selected_health_member_id') || activeMemberId;
  });
  const [showHealthQuickAdd, setShowHealthQuickAdd] = useState(false);
  const [healthQuickKind, setHealthQuickKind] = useState<HealthCareKind>('consultation');
  const [healthQuickTitle, setHealthQuickTitle] = useState('');
  const [healthQuickDate, setHealthQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [healthQuickTime, setHealthQuickTime] = useState('');
  const [healthQuickPractitioner, setHealthQuickPractitioner] = useState('');
  const [healthQuickNotes, setHealthQuickNotes] = useState('');
  const [healthQuickAmount, setHealthQuickAmount] = useState('');
  const [healthDocFile, setHealthDocFile] = useState<File | null>(null);
  const [emergencyFullScreenMemberId, setEmergencyFullScreenMemberId] = useState<string | null>(null);
  const [healthCareEntries, setHealthCareEntries] = useState<HealthCareEntry[]>(() => {
    try {
      const foyerId = foyer?.id || localStorage.getItem('mf_cloud_foyer_id') || 'default';
      const raw = localStorage.getItem(`mf_health_care_entries_${foyerId}`) || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    const foyerId = foyer?.id || localStorage.getItem('mf_cloud_foyer_id') || 'default';
    localStorage.setItem(`mf_health_care_entries_${foyerId}`, JSON.stringify(healthCareEntries));
  }, [foyer?.id, healthCareEntries]);

  React.useEffect(() => {
    if (activeModule === 'sante') {
      const saved = localStorage.getItem('mf_selected_health_member_id');
      if (saved) {
        queueMicrotask(() => setSelectedHealthMemberId(saved));
        localStorage.removeItem('mf_selected_health_member_id');
      }
    }
  }, [activeModule]);
  
  const [growthLogs, setGrowthLogs] = useState<{ id: string; memberId: string; date: string; height: number; weight: number; }[]>(() => {
    const stored = localStorage.getItem('mf_growth_logs');
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(log => !['g-1', 'g-2', 'g-3'].includes(log.id));
    } catch {
      return [];
    }
  });
  React.useEffect(() => {
    localStorage.setItem('mf_growth_logs', JSON.stringify(growthLogs));
  }, [growthLogs]);

  const healthOverview = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const activeVaccines = (vaccines || []).filter((v: any) => v.status !== 'Fait' && v.status !== 'Archivé' && !v.isArchived);
    const overdueVaccines = activeVaccines.filter((v: any) => {
      if (!v.date) return false;
      const due = new Date(`${v.date}T00:00:00`);
      return !Number.isNaN(due.getTime()) && due < today;
    });
    const upcomingVaccines = activeVaccines
      .filter((v: any) => {
        if (!v.date) return false;
        const due = new Date(`${v.date}T00:00:00`);
        return !Number.isNaN(due.getTime()) && due >= today && due <= in30Days;
      })
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));

    const incompleteEmergencyMembers = members.filter(member => {
      const hasBlood = Boolean(member.bloodGroup);
      const hasContact = Boolean((member as any).emergencyContactPhone || member.emergencyContact?.phone);
      return !hasBlood || !hasContact;
    });

    const latestGrowth = [...growthLogs].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    const recentHealthExpenses = (transactions || []).filter((tx: any) => {
      const moduleSource = String(tx.moduleSource || tx.module_source || '').toLowerCase();
      const category = String(tx.category || '').toLowerCase();
      return moduleSource === 'sante' || category === 'santé' || category === 'sante';
    });
    const monthlyHealthTotal = recentHealthExpenses
      .filter((tx: any) => String(tx.date || '').slice(0, 7) === new Date().toISOString().slice(0, 7))
      .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0);

    return {
      activeVaccines,
      overdueVaccines,
      upcomingVaccines,
      incompleteEmergencyMembers,
      latestGrowth,
      monthlyHealthTotal
    };
  }, [growthLogs, members, transactions, vaccines]);

  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLogHeight, setNewLogHeight] = useState('');
  const [newLogWeight, setNewLogWeight] = useState('');

  const [newVacName, setNewVacName] = useState('');
  const [newVacDate, setNewVacDate] = useState('');
  const [newVacDoctor, setNewVacDoctor] = useState('');
  const [newVacTime, setNewVacTime] = useState('');
  const [newVacReminder, setNewVacReminder] = useState('');
  const [newVacNote, setNewVacNote] = useState('');
  const [newVacDoc, setNewVacDoc] = useState('');

  const [editingVaccine, setEditingVaccine] = useState<any | null>(null);
  const [editVacName, setEditVacName] = useState('');
  const [editVacDate, setEditVacDate] = useState('');
  const [editVacTime, setEditVacTime] = useState('');
  const [editVacDoctor, setEditVacDoctor] = useState('');
  const [editVacReminder, setEditVacReminder] = useState('');
  const [editVacNote, setEditVacNote] = useState('');
  const [editVacDoc, setEditVacDoc] = useState('');
  const [editVacMemberId, setEditVacMemberId] = useState('');
  const [editVacStatus, setEditVacStatus] = useState('');

  const handleSaveVac = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVaccine || !editVacName.trim() || !editVacDate) return;
    if (setVaccines) {
      setVaccines((prev: any[]) => prev.map(v => v.id === editingVaccine.id ? {
        ...v,
        memberId: editVacMemberId,
        name: editVacName.trim(),
        date: editVacDate,
        time: editVacTime,
        doctor: editVacDoctor.trim() || 'Médecin traitant',
        reminder: editVacReminder,
        note: editVacNote.trim(),
        documentUrl: editVacDoc.trim(),
        status: editVacStatus,
        isArchived: editVacStatus === 'Archivé'
      } : v));
    }
    setEditingVaccine(null);
  };

  const [editingEmergencyMemberId, setEditingEmergencyMemberId] = useState<string | null>(null);
  const [editBlood, setEditBlood] = useState('O+');
  const [editAllergies, setEditAllergies] = useState('');
  const [editTreatments, setEditTreatments] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');

  const selectedHealthMember = members.find(m => m.id === selectedHealthMemberId) || members[0];
  const healthDocuments = useMemo(() => {
    return (documents || [])
      .filter(doc => doc.category === 'health' || doc.tags?.some(tag => ['sante', 'santé', 'ordonnance', 'vaccin', 'analyse', 'mutuelle'].includes(String(tag).toLowerCase())))
      .sort((a, b) => String(b.uploadDate || '').localeCompare(String(a.uploadDate || '')));
  }, [documents]);

  const healthMedicalEvents = useMemo(() => {
    return (vaccines || [])
      .map((vac: any) => ({
        id: vac.id,
        kind: 'vaccine' as HealthCareKind,
        memberId: vac.memberId,
        memberName: members.find(m => m.id === vac.memberId)?.name || 'Membre',
        title: vac.name,
        date: vac.date,
        time: vac.time || '',
        practitioner: vac.doctor || 'Médecin traitant',
        notes: vac.note || vac.reminder || '',
        createdAt: vac.date || new Date().toISOString()
      }));
  }, [members, vaccines]);

  const healthTimeline = useMemo(() => {
    return [...healthCareEntries, ...healthMedicalEvents]
      .filter(entry => !selectedHealthMemberId || entry.memberId === selectedHealthMemberId)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [healthCareEntries, healthMedicalEvents, selectedHealthMemberId]);

  const readHealthFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Lecture du document impossible'));
      reader.readAsDataURL(file);
    });
  };

  const resetHealthQuickForm = () => {
    setHealthQuickTitle('');
    setHealthQuickDate(new Date().toISOString().split('T')[0]);
    setHealthQuickTime('');
    setHealthQuickPractitioner('');
    setHealthQuickNotes('');
    setHealthQuickAmount('');
    setHealthDocFile(null);
  };

  const handleHealthQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = selectedHealthMember;
    if (!member) return;
    const title = healthQuickTitle.trim() || (
      healthQuickKind === 'consultation' ? 'Consultation médicale' :
      healthQuickKind === 'vaccine' ? 'Vaccin / rappel' :
      healthQuickKind === 'treatment' ? 'Traitement en cours' :
      healthQuickKind === 'prescription' ? 'Ordonnance à renouveler' :
      healthQuickKind === 'allergy' ? 'Allergie à surveiller' :
      healthQuickKind === 'document' ? 'Document santé' :
      'Frais santé'
    );

    let linkedDocumentId = '';
    if ((healthQuickKind === 'document' || healthDocFile) && setDocuments) {
      linkedDocumentId = `health-doc-${Date.now()}`;
      const fileBase64 = healthDocFile ? await readHealthFileAsDataUrl(healthDocFile) : undefined;
      let fileUrl: string | undefined;
      let thumbnailUrl: string | undefined;
      if (fileBase64 && isDataUrl(fileBase64) && foyer?.id) {
        if (fileBase64.startsWith('data:image/')) {
          const { blob, ext } = await compressImageToBlob(fileBase64, 'document');
          fileUrl = await uploadBlobToStorage('documents', `${foyer.id}/${linkedDocumentId}.${ext}`, blob);
          try {
            const { blob: thumbBlob } = await compressImageToBlob(fileBase64, 'thumbnail');
            thumbnailUrl = await uploadBlobToStorage('documents', `${foyer.id}/thumb_${linkedDocumentId}.webp`, thumbBlob);
          } catch (err) {
            console.warn('Health document thumbnail warning:', err);
          }
        } else {
          const blob = await dataUrlToBlob(fileBase64);
          const ext = extensionFromMimeType(blob.type, 'bin');
          fileUrl = await uploadBlobToStorage('documents', `${foyer.id}/${linkedDocumentId}.${ext}`, blob);
        }
      }
      const newDoc: DocumentFile = {
        id: linkedDocumentId,
        name: healthDocFile?.name || title,
        category: 'health',
        subCategory: healthQuickKind === 'prescription' ? 'Ordonnance' : healthQuickKind === 'vaccine' ? 'Vaccination' : 'Santé',
        memberId: member.id,
        memberName: member.name,
        tags: ['sante', healthQuickKind, member.name],
        uploadDate: new Date().toISOString(),
        fileSize: healthDocFile ? `${Math.max(1, Math.round(healthDocFile.size / 1024))} Ko` : 'Référence',
        isExpired: false,
        description: healthQuickNotes.trim() || title,
        fileUrl,
        thumbnailUrl,
        fileBase64: fileUrl ? undefined : fileBase64,
        isSecure: true
      };
      setDocuments(prev => [newDoc, ...prev]);

      const supabase = getSupabaseClient();
      if (supabase && foyer?.id) {
        try {
          await supabase.from('documents').insert({
            id: newDoc.id,
            foyer_id: foyer.id,
            name: newDoc.name,
            category: newDoc.category,
            sub_category: newDoc.subCategory || null,
            member_id: newDoc.memberId || null,
            member_name: newDoc.memberName || null,
            tags: newDoc.tags,
            upload_date: newDoc.uploadDate,
            file_size: newDoc.fileSize,
            is_expired: false,
            description: newDoc.description || null,
            file_url: newDoc.fileUrl || null,
            thumbnail_url: newDoc.thumbnailUrl || null,
            file_base64: null,
            is_secure: true
          });
        } catch (err) {
          console.warn('Health document cloud sync warning:', err);
        }
      }
    }

    if (healthQuickKind === 'vaccine' && setVaccines) {
      setVaccines(prev => [...prev, {
        id: `v-${Date.now()}`,
        memberId: member.id,
        name: title,
        date: healthQuickDate,
        status: 'À faire',
        doctor: healthQuickPractitioner.trim() || 'Médecin traitant',
        time: healthQuickTime,
        reminder: '1 jour avant',
        note: healthQuickNotes.trim(),
        documentUrl: ''
      }]);
    } else if ((healthQuickKind === 'treatment' || healthQuickKind === 'allergy') && setMembers) {
      const updateListKey = healthQuickKind === 'treatment' ? 'treatments' : 'allergies';
      setMembers(prev => prev.map(m => {
        if (m.id !== member.id) return m;
        const current = Array.isArray((m as any)[updateListKey]) ? (m as any)[updateListKey] : [];
        const next = Array.from(new Set([...current, title]));
        return { ...m, [updateListKey]: next } as Member;
      }));

      try {
        await foyerService.updateMemberProfile(member.id, {
          [updateListKey]: Array.from(new Set([...((member as any)[updateListKey] || []), title]))
        });
      } catch (err) {
        console.warn('Health profile update warning:', err);
      }
    } else if ((healthQuickKind === 'consultation' || healthQuickKind === 'prescription' || healthQuickKind === 'treatment') && onAddEventDirect) {
      onAddEventDirect({
        title: healthQuickKind === 'prescription' ? `💊 Renouveler : ${title}` : `🩺 ${title}`,
        type: 'medical',
        dateTime: healthQuickTime ? `${healthQuickDate}T${healthQuickTime}:00` : `${healthQuickDate}T09:00:00`,
        time: healthQuickTime || '09:00',
        memberId: member.id,
        memberName: member.name,
        done: false,
        description: JSON.stringify({
          sourceModule: 'sante',
          kind: healthQuickKind,
          practitioner: healthQuickPractitioner.trim(),
          notes: healthQuickNotes.trim(),
          documentId: linkedDocumentId
        })
      });
    } else if (healthQuickKind === 'expense' && onAddTransaction) {
      const amount = parseFloat(healthQuickAmount);
      onAddTransaction({
        amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
        type: 'expense',
        category: 'Santé',
        subCategory: 'Soin',
        title: `Santé : ${title} - ${member.name}`,
        memberId: member.id,
        memberName: member.name,
        date: healthQuickDate,
        moduleSource: 'sante',
        comment: healthQuickNotes.trim()
      });
    }

    setHealthCareEntries(prev => [{
      id: `care-${Date.now()}`,
      kind: healthQuickKind,
      memberId: member.id,
      memberName: member.name,
      title,
      date: healthQuickDate,
      time: healthQuickTime,
      practitioner: healthQuickPractitioner.trim(),
      notes: healthQuickNotes.trim(),
      documentId: linkedDocumentId,
      createdAt: new Date().toISOString()
    }, ...prev]);
    resetHealthQuickForm();
    setShowHealthQuickAdd(false);
  };

  // --- Feature 8: House Plan View ---
  const [logementViewMode, setLogementViewMode] = useState<'list' | 'plan' | 'artisans' | 'charges'>('list');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Artisan form states
  const [newArtisanName, setNewArtisanName] = useState('');
  const [newArtisanSpecialty, setNewArtisanSpecialty] = useState('Plomberie');
  const [newArtisanPhone, setNewArtisanPhone] = useState('');
  const [newArtisanEmail, setNewArtisanEmail] = useState('');
  const [newArtisanRating, setNewArtisanRating] = useState(5);
  const [newArtisanNotes, setNewArtisanNotes] = useState('');
  const [artisanSearchQuery, setArtisanSearchQuery] = useState('');

  // --- States for Transversal Budget Integration ---
  const [isValiderAchatsOpen, setIsValiderAchatsOpen] = useState(false);
  const [validerAchatsCost, setValiderAchatsCost] = useState('');
  const [validerAchatsAccountId, setValiderAchatsAccountId] = useState('');

  useEffect(() => {
    if (isValiderAchatsOpen && !validerAchatsAccountId && accounts && accounts.length > 0) {
      const firstBank = accounts.find(a => a.type === 'bank') || accounts[0];
      if (firstBank) {
        queueMicrotask(() => setValiderAchatsAccountId(firstBank.id));
      }
    }
  }, [isValiderAchatsOpen, accounts, validerAchatsAccountId]);

  const [newFraisType, setNewFraisType] = useState('Consultation');
  const [newFraisAmount, setNewFraisAmount] = useState('');
  const [newFraisBaseReimbSecu, setNewFraisBaseReimbSecu] = useState('70');
  const [newFraisBaseReimbMutuelle, setNewFraisBaseReimbMutuelle] = useState('30');
  const [newFraisMemberId, setNewFraisMemberId] = useState(activeMemberId || '1');
  const [newFraisAccountId, setNewFraisAccountId] = useState('');

  const [newLogChargeType, setNewLogChargeType] = useState('Loyer');
  const [newLogChargeAmount, setNewLogChargeAmount] = useState('');
  const [newLogChargeIsRecurring, setNewLogChargeIsRecurring] = useState(false);
  const [newLogChargeRecurrenceType, setNewLogChargeRecurrenceType] = useState('monthly');
  const [newLogChargeAccountId, setNewLogChargeAccountId] = useState('');

  const [newVoyageExpenseType, setNewVoyageExpenseType] = useState('Dépense');
  const [newVoyageExpenseDescription, setNewVoyageExpenseDescription] = useState('');
  const [newVoyageExpenseAmount, setNewVoyageExpenseAmount] = useState('');
  const [newVoyageExpenseAccountId, setNewVoyageExpenseAccountId] = useState('');

  const [newSchoolFeeType, setNewSchoolFeeType] = useState('Cantine');
  const [newSchoolFeeAmount, setNewSchoolFeeAmount] = useState('');
  const [newSchoolFeeMemberId, setNewSchoolFeeMemberId] = useState(activeMemberId || '1');
  const [newSchoolFeeAccountId, setNewSchoolFeeAccountId] = useState('');
  const [newSchoolFeeIsRecurring, setNewSchoolFeeIsRecurring] = useState(false);
  const [newSchoolFeeRecurrenceType, setNewSchoolFeeRecurrenceType] = useState('monthly');

  const [newLocalTaskTitle, setNewLocalTaskTitle] = useState('');
  const [newLocalTaskPoints, setNewLocalTaskPoints] = useState(10);
  const [newLocalTaskRotation, setNewLocalTaskRotation] = useState('none');
  const [newLocalTaskRewardAmount, setNewLocalTaskRewardAmount] = useState('');
  const [newLocalTaskDescription, setNewLocalTaskDescription] = useState('');
  const [newLocalTaskDueDate, setNewLocalTaskDueDate] = useState('');
  const [newLocalTaskTime, setNewLocalTaskTime] = useState('');
  const [newLocalTaskPriority, setNewLocalTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newLocalTaskValidationRequired, setNewLocalTaskValidationRequired] = useState(true);
  const [newLocalTaskAssigneeIds, setNewLocalTaskAssigneeIds] = useState<string[]>([]);
  const [newLocalTaskAttributionMode, setNewLocalTaskAttributionMode] = useState<'single' | 'multiple' | 'wall'>('single');
  const [newLocalTaskMaxParticipants, setNewLocalTaskMaxParticipants] = useState(1);
  const [newLocalTaskSelectionMode, setNewLocalTaskSelectionMode] = useState<'first_come' | 'approval'>('first_come');
  const [newLocalTaskDifficulty, setNewLocalTaskDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newLocalTaskCategory, setNewLocalTaskCategory] = useState('Divers');
  const [newLocalTaskImageUrl, setNewLocalTaskImageUrl] = useState('');
  const [newLocalTaskEstimatedTime, setNewLocalTaskEstimatedTime] = useState('');
  const [newLocalTaskIsDailySpecial, setNewLocalTaskIsDailySpecial] = useState(false);
  const [newLocalTaskXpReward, setNewLocalTaskXpReward] = useState<number>(20);
  const [choresActiveSubTab, setChoresActiveSubTab] = useState<'actives' | 'historique'>('actives');
  const [choreHistoryFilter, setChoreHistoryFilter] = useState<'all' | 'wall' | 'accepted' | 'validated' | 'refused'>('all');

  const [pmSelectedChildId, setPmSelectedChildId] = useState<string | null>(() => {
    return localStorage.getItem('mf_last_selected_child_id');
  });

  useEffect(() => {
    if (pmSelectedChildId) {
      localStorage.setItem('mf_last_selected_child_id', pmSelectedChildId);
    } else {
      localStorage.removeItem('mf_last_selected_child_id');
    }
  }, [pmSelectedChildId]);

  const [pmSubTab, setPmSubTab] = useState<'finance' | 'boutique' | 'karma'>('finance');
  
  // Malus States
  const [newMalusTitle, setNewMalusTitle] = useState('');
  const [newMalusEmoji, setNewMalusEmoji] = useState('⚠️');
  const [newMalusCategory, setNewMalusCategory] = useState('Comportement');
  const [newMalusStarsRemoved, setNewMalusStarsRemoved] = useState(5);
  const [newMalusXpRemoved, setNewMalusXpRemoved] = useState(10);
  const [newMalusLossStreak, setNewMalusLossStreak] = useState(false);
  const [newMalusLossShield, setNewMalusLossShield] = useState(true);
  const [newMalusCommentRequired, setNewMalusCommentRequired] = useState(false);
  const [newMalusDoubleParentValidation, setNewMalusDoubleParentValidation] = useState(false);
  const [editingMalusId, setEditingMalusId] = useState<string | null>(null);
  
  // Edit Malus States
  const [editMalusTitle, setEditMalusTitle] = useState('');
  const [editMalusEmoji, setEditMalusEmoji] = useState('⚠️');
  const [editMalusCategory, setEditMalusCategory] = useState('Comportement');
  const [editMalusStarsRemoved, setEditMalusStarsRemoved] = useState(5);
  const [editMalusXpRemoved, setEditMalusXpRemoved] = useState(10);
  const [editMalusLossStreak, setEditMalusLossStreak] = useState(false);
  const [editMalusLossShield, setEditMalusLossShield] = useState(true);
  const [editMalusCommentRequired, setEditMalusCommentRequired] = useState(false);
  const [editMalusDoubleParentValidation, setEditMalusDoubleParentValidation] = useState(false);

  // Apply Malus States
  const [selectedMalusTemplateId, setSelectedMalusTemplateId] = useState<string | null>(null);
  const [applyMalusComment, setApplyMalusComment] = useState('');
  const [useShieldForMalus, setUseShieldForMalus] = useState(false);

  // Link Reparation Task State
  const [linkingMalusId, setLinkingMalusId] = useState<string | null>(null);
  const [reparationTaskTitle, setReparationTaskTitle] = useState('');

  // Boutique Config State
  const [newBoutiqueTitle, setNewBoutiqueTitle] = useState('');
  
  const [newBoutiqueCostPoints, setNewBoutiqueCostPoints] = useState(50);
  const [newBoutiqueCostMoney, setNewBoutiqueCostMoney] = useState(5);
  const [newBoutiqueIcon, setNewBoutiqueIcon] = useState('🎁');
  const [newBoutiqueSubCategory, setNewBoutiqueSubCategory] = useState('Cadeau');
  const [newBoutiqueValidationRequired, setNewBoutiqueValidationRequired] = useState(true);
  const [newBoutiqueAvail, setNewBoutiqueAvail] = useState(true);
  const [showQuickForm, setShowQuickForm] = useState(false);

  // Direct Adjustment State
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentAsset, setAdjustmentAsset] = useState<'money' | 'points'>('money');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentAccountId, setAdjustmentAccountId] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Dynamically calculate pending vaccines for the active member only
  const pendingVaccines = (vaccines || []).filter((v) => v.memberId === activeMemberId && v.status === 'À faire').length;

  const activeMember = members.find(m => m.id === activeMemberId);
  const groceryDerogation = activeMember ? !!activeMember.hasExemption : false;

  const modules = useMemo(() => [
    { id: 'conseil', title: 'Conseil de Famille', desc: 'Sondages actifs & Charte de vie', badge: 'Coopération', icon: Users, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30' },
    { id: 'conteur', title: 'Histoires du Soir', desc: 'Contes IA personnalisés interactifs', badge: 'Plus', icon: BookOpen, color: 'text-[#FFB020] bg-[#FFB020]/10 hover:border-[#FFB020]/30' },
    { id: 'taches', title: 'Tâches', desc: 'Répartition des tâches et suivi', badge: `${tasks.filter(t => !t.done).length} en cours`, icon: Brush, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' },
    { id: 'argent', title: 'Argent de poche & confiance', desc: 'Missions, récompenses et suivi familial', badge: 'Confiance', icon: Coins, color: 'text-[#FFB020] bg-[#FFB020]/10 hover:border-[#FFB020]/30' },
    { id: 'games', title: 'Jeux en famille', desc: 'Memory, Puissance 4 et défis à plusieurs', badge: 'Nouveau', icon: Gamepad2, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/30' },
    { id: 'ecole', title: 'École & Devoirs', desc: 'Tuteur IA, devoirs & quizzes', badge: `${schoolTasks.filter(t => !t.done).length} devoirs`, icon: GraduationCap, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30' },
    { id: 'logement', title: 'Logement', desc: 'Maintenance et garanties', badge: 'Équipements', icon: HomeIcon, color: 'text-[#FFB020] bg-[#FFB020]/10 hover:border-[#FFB020]/30' },
    { id: 'agenda', title: 'Agenda Familial', desc: 'Calendrier partagé de la maison', badge: 'Calendrier', icon: Calendar, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30' },
    { id: 'courses', title: 'Courses & Éco-Chef', desc: 'Liste de courses & Éco-Chef Anti-Gaspi', badge: `${groceries.filter(g => !g.checked).length} articles`, icon: ShoppingCart, color: 'text-[#FFB020] bg-[#FFB020]/10 hover:border-[#FFB020]/30' },
    { id: 'sante', title: 'Santé', desc: 'Carnet médical et rendez-vous', badge: pendingVaccines > 0 ? `${pendingVaccines} vaccin${pendingVaccines > 1 ? 's' : ''}` : 'À jour', icon: HeartPulse, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/30' },
    { id: 'voyages', title: 'Voyages & Valise IA', desc: 'Activités & Valise IA personnalisée', badge: 'Préparation', icon: Plane, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/30' },
    { id: 'documents', title: 'Documents', desc: 'Coffre-fort sécurisé pour vos documents', badge: `${documents.length} fichiers`, icon: FolderLock, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30' },
    { id: 'vehicules', title: 'Véhicules', desc: 'Assurances et entretiens', badge: 'Garage', icon: Car, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30' },
    { id: 'animaux', title: 'Animaux', desc: 'Vaccins et vétérinaire', badge: 'Compagnons', icon: Dog, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' },
    { id: 'capsule', title: 'Capsule Temporelle', desc: 'Album de souvenirs & Gazette', badge: 'Souvenirs', icon: Camera, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/30' },
    { id: 'contacts', title: 'Répertoire Important', desc: 'Numéros utiles & urgences directes', badge: 'Urgent', icon: Phone, color: 'text-red-500 bg-red-500/10 hover:border-red-500/30' },
    { id: 'peacemaker', title: 'Médiateur familial IA', desc: 'Aide à résoudre les petits conflits', badge: 'Médiation', icon: HeartHandshake, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' },
    { id: 'settings', title: 'Réglages', desc: 'Configuration de l\'application', badge: 'Système', icon: Wrench, color: 'text-white/50 bg-white/5 hover:border-white/20' },
    { id: 'carte', title: 'Carte Familiale', desc: 'Localisation sécurisée en temps réel', badge: 'En direct', icon: MapIcon, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30' }
  ], [documents.length, groceries, pendingVaccines, schoolTasks, tasks]);

  const visibleModules = useMemo(() => {
    return modules.filter(mod => {
      const familyModKey = modIdToFamilyModule[mod.id];
      if (!familyModKey) return true;
      const perm = activePermissions[familyModKey];
      return perm ? perm.voir : true;
    });
  }, [modules, activePermissions]);

  const handleGrocerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroceryName) return;
    const combinedQty = `${newGroceryQty} ${newGroceryUnit}`;
    onAddGroceryItem(newGroceryName, newGroceryCat, combinedQty);
    setNewGroceryName('');
    setNewGroceryQty(1);
    setNewGroceryUnit('pièces');
  };

  // Voice Dictation for Groceries
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  const handleDictation = () => {
    if (!isPremium) {
      onTriggerPaywall?.();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la dictée vocale.");
      return;
    }

    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    isListeningRef.current = true;
    setIsListening(true);

    const startRecognition = () => {
      if (!isListeningRef.current) return;

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        
        const activeMemberName = members.find(m => m.id === activeMemberId)?.name || 'Foyer';
        const parsedItems = parseSmartNaturalSentence(transcript, activeMemberName);
        parsedItems.forEach(item => {
          onAddGroceryItem(item.name, item.category, item.quantity, item.meal, item.addedBy, !!item.isFavorite);
        });

        // Force stop to release mic before any restart
        try {
          recognition.stop();
        } catch {
          // Recognition may already be stopped on mobile browsers.
        }

        // Safe delayed restart for continuous experience
        if (isListeningRef.current) {
          setTimeout(() => {
            if (isListeningRef.current) startRecognition();
          }, 600);
        }
      };

      recognition.onerror = (e: { error?: string }) => {
        console.error("Speech recognition error:", e.error);
        if (e.error === 'aborted') return;
        if (e.error === 'no-speech') {
          // Restart safe on no-speech
          if (isListeningRef.current) {
            setTimeout(() => {
              if (isListeningRef.current) startRecognition();
            }, 600);
          }
          return;
        }
        // Force fully stop listening if permission or hard error
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        if (!isListeningRef.current) {
          setIsListening(false);
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    };

    startRecognition();
  };

  // Parental PIN Lock States and Validator
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState('Code PIN incorrect. Veuillez réessayer.');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [authorizedModules, setAuthorizedModules] = useState<string[]>([]);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinVerifying) return;
    if (!foyer) {
      setPinErrorMessage('Vérification indisponible pour ce foyer.');
      setPinError(true);
      return;
    }
    setPinVerifying(true);
    try {
      const verification = await foyerService.verifyFoyerParentPin(foyer.id, pinInput);
      if (!verification.allowed) {
        setPinErrorMessage(
          verification.reason === 'locked'
            ? 'Trop de tentatives. Réessayez dans quelques minutes.'
            : verification.reason === 'not_configured'
            ? 'Le PIN doit être configuré dans les paramètres parentaux.'
            : verification.attemptsRemaining !== undefined
            ? `Code incorrect. ${verification.attemptsRemaining} essai(s) restant(s).`
            : 'Code PIN incorrect. Veuillez réessayer.'
        );
        setPinError(true);
        setPinInput('');
        return;
      }
      setAuthorizedModules(prev => [...prev, activeModule]);
      setPinInput('');
      setPinError(false);
    } catch (error) {
      console.error('Unable to verify module PIN:', error);
      setPinErrorMessage('Vérification indisponible. Contrôlez votre connexion.');
      setPinError(true);
      setPinInput('');
    } finally {
      setPinVerifying(false);
    }
  };

  const isParent = activeMember 
    ? ['Chef de famille', 'Gestionnaire', 'admin', 'parent', 'Parent'].includes(activeMember.role)
    : (activeMemberId === '1' || activeMemberId === '2');
  const isLockedForChild = !isParent && ['documents', 'demarches', 'finances_hub', 'vehicules', 'logement'].includes(activeModule) && !authorizedModules.includes(activeModule);

  // Maintenance Form states
  const [newMaintTitle, setNewMaintTitle] = useState('');
  const [newMaintProvider, setNewMaintProvider] = useState('');
  const [newMaintDate, setNewMaintDate] = useState('');
  const [newMaintCost, setNewMaintCost] = useState('');
  const [newMaintStatus, setNewMaintStatus] = useState<'scheduled' | 'completed' | 'urgent'>('scheduled');

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintTitle || !newMaintCost) return;
    const costVal = parseFloat(newMaintCost) || 0;
    const newM: HomeMaintenance = {
      id: `m-${Date.now()}`,
      title: newMaintTitle,
      provider: newMaintProvider || 'Artisan Local',
      date: newMaintDate || new Date().toISOString().split('T')[0],
      cost: costVal,
      status: newMaintStatus
    };
    setMaintenance(prev => [...prev, newM]);

    const dateISO = parseCustomDateToISO(newM.date);

    // Financial transaction integration
    if (costVal > 0 && onAddTransaction) {
      onAddTransaction({
        amount: costVal,
        type: 'expense',
        category: 'Logement',
        date: dateISO,
        title: `Maintenance : ${newMaintTitle}`,
        memberName: 'Foyer'
      });
    }

    // Agenda event integration
    if (newMaintStatus === 'scheduled' && onAddEventDirect) {
      onAddEventDirect({
        title: `🔧 Maintenance : ${newMaintTitle}`,
        type: 'other',
        dateTime: dateISO,
        time: '08:00',
        done: false,
        location: newMaintProvider,
        description: JSON.stringify({ sourceModule: 'logement', sourceId: newM.id, eventType: 'maintenance' })
      });
    }

    setNewMaintTitle('');
    setNewMaintProvider('');
    setNewMaintDate('');
    setNewMaintCost('');
    alert('🔧 Intervention logement ajoutée (impacts Finances / Agenda synchronisés) !');
  };

  const handleAddArtisan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtisanName || !newArtisanSpecialty) return;
    const newA: Artisan = {
      id: `art-${Date.now()}`,
      name: newArtisanName,
      specialty: newArtisanSpecialty,
      phone: newArtisanPhone,
      email: newArtisanEmail,
      rating: newArtisanRating,
      notes: newArtisanNotes
    };
    if (setArtisans) {
      setArtisans((prev: Artisan[]) => [...prev, newA]);
    }
    setNewArtisanName('');
    setNewArtisanPhone('');
    setNewArtisanEmail('');
    setNewArtisanRating(5);
    setNewArtisanNotes('');
    alert(`👷 Artisan ${newArtisanName} ajouté avec succès !`);
  };

  // Trips Form states
  const [newTripDest, setNewTripDest] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripBudget, setNewTripBudget] = useState('');

  // Booking items helpers
  const bookingTypeLabels = {
    hotel: '🏠 Hébergement / Hôtel',
    transport: '🚗 Transport sur place',
    billets: '✈️ Billets de transport',
    activite: '🎨 Activités & Loisirs'
  };

  const bookingStatusLabels = {
    non_defini: { label: 'Non défini', color: 'text-white/40 border-white/10 bg-white/5', icon: '⚪' },
    prevu: { label: 'Prévu', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', icon: '🟡' },
    reserve: { label: 'Réservé', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', icon: '🔵' },
    paye: { label: 'Payé', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: '🟢' },
    annule: { label: 'Annulé', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10', icon: '🔴' }
  };

  const parseBookingRefs = (refs?: string[]): { type: 'hotel' | 'transport' | 'billets' | 'activite'; label: string; status: 'non_defini' | 'prevu' | 'reserve' | 'paye' | 'annule' }[] => {
    const defaultItems: { type: 'hotel' | 'transport' | 'billets' | 'activite'; label: string; status: 'non_defini' | 'prevu' | 'reserve' | 'paye' | 'annule' }[] = [
      { type: 'hotel', label: bookingTypeLabels['hotel'], status: 'non_defini' },
      { type: 'transport', label: bookingTypeLabels['transport'], status: 'non_defini' },
      { type: 'billets', label: bookingTypeLabels['billets'], status: 'non_defini' },
      { type: 'activite', label: bookingTypeLabels['activite'], status: 'non_defini' }
    ];

    if (!refs || refs.length === 0) return defaultItems;

    const parsed = [...defaultItems];
    for (const ref of refs) {
      if (ref.includes(':')) {
        const [type, status] = ref.split(':') as [any, any];
        const index = parsed.findIndex(item => item.type === type);
        if (index !== -1) {
          parsed[index].status = status;
        }
      } else {
        const lower = ref.toLowerCase();
        if (lower.includes('hôtel') || lower.includes('hotel')) {
          parsed[0].status = lower.includes('✓') || lower.includes('réservé') || lower.includes('réserve') ? 'reserve' : 'non_defini';
        } else if (lower.includes('transport')) {
          parsed[1].status = lower.includes('✓') || lower.includes('planifié') || lower.includes('planifie') ? 'prevu' : 'non_defini';
        }
      }
    }
    return parsed;
  };

  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripDest || !newTripBudget || !newTripStart || !newTripEnd) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    const startISO = parseCustomDateToISO(newTripStart);
    const endISO = parseCustomDateToISO(newTripEnd);
    if (new Date(endISO) < new Date(startISO)) {
      alert("La date de retour doit être postérieure à la date de départ.");
      return;
    }
    const budgetVal = parseFloat(newTripBudget) || 0;
    const newT: Trip = {
      id: `t-${Date.now()}`,
      destination: newTripDest,
      startDate: newTripStart,
      endDate: newTripEnd,
      budget: budgetVal,
      bookingRefs: ['hotel:non_defini', 'transport:non_defini', 'billets:non_defini', 'activite:non_defini'],
      checklist: [
        { id: 'c1', text: 'Passeports valides', done: true },
        { id: 'c2', text: 'Trousse de secours', done: false }
      ]
    };
    setTrips(prev => [...prev, newT]);

    // Enregistrement de l'enveloppe budgétaire dans les configurations locales sans créer de transaction Dépense
    try {
      const activeFoyerId = localStorage.getItem('mf_cloud_foyer_id') || 'default';
      
      const updateEnvelopes = (key: string) => {
        const cached = localStorage.getItem(key);
        const budgets = cached ? JSON.parse(cached) : {};
        budgets['voyages'] = { budget: budgetVal, recurrence: 'project' };
        localStorage.setItem(key, JSON.stringify(budgets));
      };
      
      updateEnvelopes(`mf_module_budgets_${activeFoyerId}`);
      updateEnvelopes('mf_module_budgets');
    } catch (err) {
      console.error("Error setting voyages module budget:", err);
    }

    // Agenda travel events integration
    if (onAddEventDirect) {
      onAddEventDirect({
        title: `✈️ Départ : ${newTripDest}`,
        type: 'leisure',
        dateTime: startISO,
        time: '09:00',
        done: false,
        description: JSON.stringify({ sourceModule: 'voyages', sourceId: newT.id, eventType: 'departure' })
      });
      onAddEventDirect({
        title: `🛬 Retour : ${newTripDest}`,
        type: 'leisure',
        dateTime: endISO,
        time: '18:00',
        done: false,
        description: JSON.stringify({ sourceModule: 'voyages', sourceId: newT.id, eventType: 'return' })
      });
    }

    setNewTripDest('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripBudget('');
    alert('✈️ Voyage ajouté avec succès (impacts Finances / Agenda synchronisés) !');
  };

  const handleSaveMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName) return;

    setDishes(prev => {
      const exists = prev.some(d => d.day === mealDay && d.mealType === mealType);
      if (exists) {
        return prev.map(d => (d.day === mealDay && d.mealType === mealType) ? {
          ...d,
          name: mealName,
          image: mealImagePreset,
          ingredients: mealIngredients.split(',').map(i => i.trim()).filter(Boolean)
        } : d);
      } else {
        return [...prev, {
          id: `di-${Date.now()}`,
          day: mealDay,
          mealType: mealType,
          name: mealName,
          image: mealImagePreset,
          ingredients: mealIngredients.split(',').map(i => i.trim()).filter(Boolean)
        }];
      }
    });

    setMealName('');
    setMealIngredients('');
    alert(`🍳 Repas du ${mealDay} (${mealType === 'lunch' ? 'Déjeuner' : 'Dîner'}) enregistré !`);
  };

  return (
    <Suspense fallback={
      <div className="pb-32 pt-6 px-4 md:px-8 max-w-4xl mx-auto premium-glow-purple">
        <div className="glass-panel rounded-[28px] border border-white/8 p-6 text-center text-sm font-bold text-white/60">
          Chargement du module...
        </div>
      </div>
    }>
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-4xl mx-auto premium-glow-purple">
      
      {/* Back button if active sub-module */}
      {activeModule && !isKidMode && (
        <button 
          onClick={() => setActiveModule('')}
          className="flex items-center space-x-2 text-xs font-bold text-white/50 hover:text-white transition-all cursor-pointer py-1.5 px-3 rounded-xl bg-white/5 border border-white/5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au Tableau de Bord</span>
        </button>
      )}

      {/* Parental Lock Gate screen */}
      {activeModule && isLockedForChild && (
        <div className="glass-panel border border-[#FF4D6D]/30 rounded-[28px] p-8 max-w-md mx-auto text-center space-y-6 bg-gradient-to-br from-[#2D161F]/40 to-[#1A0A10]/60 my-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D6D]/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 rounded-full bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/30 animate-pulse shadow-[0_0_15px_rgba(255,77,109,0.2)]">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-base font-extrabold text-white tracking-tight">Accès Parent Privé 🔒</h3>
            <p className="text-xs text-[#FF4D6D] font-bold">Module confidentiel : {activeModule.toUpperCase()}</p>
            <p className="text-xs text-white/50 leading-relaxed max-w-[280px] mx-auto">
              Ce module contient des données financières, administratives ou de sécurité réservées aux parents.
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4 pt-4 border-t border-white/5">
            <div className="space-y-1.5 text-left font-medium">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block text-center">Saisir le Code PIN Parent pour débloquer :</label>
              <div className="relative w-32 mx-auto">
                <input 
                  type={showPin ? "text" : "password"}
                  required
                  maxLength={4}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  className={`w-full text-center tracking-[0.5em] font-mono text-lg bg-white/5 border rounded-xl pl-4 pr-9 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D] block ${
                    pinError ? 'border-[#FF4D6D] bg-[#FF4D6D]/10 animate-shake' : 'border-white/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-3 text-white/30 hover:text-white/60 focus:outline-none cursor-pointer"
                >
                  {showPin ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {pinError && (
                <p className="text-[10px] text-[#FF4D6D] font-bold text-center mt-1">{pinErrorMessage}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pinInput.length !== 4 || pinVerifying}
              className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#6C5CFF] disabled:opacity-50 text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:opacity-95 shadow-md flex items-center justify-center space-x-2"
            >
              <span>{pinVerifying ? 'Vérification...' : "Déverrouiller l'accès"}</span>
            </button>
            
          </form>
        </div>
      )}

      {/* Main Grid dashboard (Screen 4 Layout) */}
      {!activeModule && (
        <>
          <WidgetMeteo />
          
          {/* Dashboard Head */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Espaces famille</h1>
                <p className="text-xs text-white/50 font-medium font-sans">{visibleModules.length} module{visibleModules.length > 1 ? 's' : ''} disponible{visibleModules.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Elegant Static Premium Badge (No bypass buttons) */}
            {isPremium && (
              <div className="text-right">
                <span className="px-3.5 py-1.8 rounded-full bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white text-[9.5px] font-black uppercase tracking-wider shadow-md shadow-[#6C5CFF]/15 animate-fade-in">
                  ✨ PLUS
                </span>
              </div>
            )}
          </div>

          {/* Single Unified Modules Grid (17 modules) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {visibleModules.map((mod: any) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    const premiumFeature = PREMIUM_MODULE_FEATURES[mod.id];
                    if (premiumFeature && !isPremium) {
                      onTriggerPaywall?.();
                      return;
                    }
                    setActiveModule(mod.id);
                  }}
                  className="glass-panel rounded-[28px] p-5 text-left border border-white/6 flex flex-col justify-between h-[150px] cursor-pointer transition-all hover:bg-white/8 hover:translate-y-[-2px] group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`p-3 rounded-[18px] ${mod.color} border border-white/5 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {mod.badge && (
                      <span className="text-[9px] font-black text-[#6C5CFF] uppercase tracking-widest bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 px-2.5 py-1 rounded-[10px]">
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">{mod.title}</h3>
                    <p className="text-[11px] text-white/50 leading-relaxed font-sans font-medium line-clamp-2">{mod.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Security Shield Banner (Screen 4 pixel replica) */}
          <div className="rounded-[28px] border border-[#6C5CFF]/20 bg-gradient-to-r from-[#1C2C4E]/40 to-[#0F1E3D]/50 p-5 flex items-center space-x-4 shadow-sm">
            <div className="p-3.5 rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20">
              <ShieldCheck className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">Vos données sont 100% sécurisées</h4>
              <p className="text-[10px] sm:text-xs text-white/50 font-medium mt-1 leading-normal font-sans">
                Chiffrement de bout en bout • Sauvegarde cloud • Confidentialité garantie
              </p>
            </div>
          </div>
        </>
      )}

      {/* Family games */}
      {activeModule === 'games' && (
        <FamilyGames
          members={members}
          activeMemberId={activeMemberId}
          foyerId={foyer?.id}
          familyName={foyer?.name}
          isPremium={isPremium}
          pocketMoney={pocketMoney}
          setPocketMoney={setPocketMoney}
          memories={memories}
          setVotes={setVotes}
          onAddEventDirect={onAddEventDirect}
          onSendNotification={onSendNotification}
          onTriggerPaywall={onTriggerPaywall}
          onBack={() => setActiveModule('')}
        />
      )}

      {/* SUB-MODULE 0: Finances Hub Kid unlocked screen */}
      {activeModule === 'finances_hub' && !isLockedForChild && (
        <div className="glass-panel border border-[#00D26A]/30 rounded-[28px] p-8 max-w-md mx-auto text-center space-y-6 bg-gradient-to-br from-[#162D21]/40 to-[#0A1A10]/60 my-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 rounded-full bg-[#00D26A]/15 text-[#00D26A] border border-[#00D26A]/30 animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h3 className="text-base font-extrabold text-white">Accès Déverrouillé ! 🔓</h3>
            <p className="text-xs text-white/60">L'autorisation parentale a été validée avec succès.</p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setActiveModule('');
              setActiveTab('budget');
            }}
            className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:scale-105 transition-all shadow-md"
          >
            Accéder au module Budget maintenant
          </button>
        </div>
      )}

      {/* SUB-MODULE 0.5: Carte Familiale */}
      {activeModule === 'carte' && (
        <FamilyMap members={members} activeMemberId={activeMemberId} onUpdateMemberProfile={onUpdateMemberProfile} />
      )}

      {/* SUB-MODULE 1: Documents Vault & Démarches */}
      {(activeModule === 'documents' || activeModule === 'demarches') && !isLockedForChild && (
        <CoffreFortAvance 
          key={activeModule}
          documents={documents} 
          setDocuments={setDocuments} 
          members={members} 
          demarches={demarches} 
          setDemarches={setDemarches} 
          packs={justificatifPacks} 
          setPacks={setJustificatifPacks} 
          onAddEvent={onAddEvent} 
          isPremium={isPremium} 
          onTriggerPaywall={onTriggerPaywall} 
          onAddTransaction={onAddTransaction} 
          defaultTab={activeModule === 'demarches' ? 'demarches' : 'docs'}
          foyerId={foyer?.id}
        />
      )}

      {/* SUB-MODULE 1.5: Messagerie */}
      {activeModule === 'messagerie' && (
        <Messagerie 
          members={members} 
          activeMemberId={activeMemberId} 
          groups={chatGroups}
          setGroups={setChatGroups}
          messages={chatMessages}
          setMessages={setChatMessages}
          initialGroupId={initialChatGroupId}
          isPremium={isPremium}
          onTriggerPaywall={onTriggerPaywall}
        />
      )}

      {/* SUB-MODULE 2: Santé */}
      {activeModule === 'sante' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white">Carnet Santé & Vaccins</h2>
              <p className="text-xs text-white/50">Rappels serveur, carnet médical, documents & urgence</p>
            </div>
            
            {/* Filtre de membre global pour la Santé */}
            {(healthSubTab === 'carnet' || healthSubTab === 'soins' || healthSubTab === 'documents' || healthSubTab === 'croissance' || healthSubTab === 'vaccins') && (
              <select
                value={selectedHealthMemberId}
                onChange={(e) => setSelectedHealthMemberId(e.target.value)}
                className="bg-[#07111F]/80 text-white border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#FF4D6D] cursor-pointer"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({['parent', 'Parent'].includes(m.role) ? 'Parent' : 'Enfant'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded-[26px] border border-[#00D26A]/20 bg-[#00D26A]/8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-[#00D26A]/15 border border-[#00D26A]/25 text-[#00D26A]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Suivi santé avancé</h3>
                <p className="text-[11px] text-white/60 font-semibold leading-relaxed">
                  Les vaccins, rendez-vous médicaux, traitements et ordonnances peuvent alimenter les rappels push serveur.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHealthQuickAdd(true)}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF4D6D] to-[#FF8FA3] text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-[#FF4D6D]/15 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un soin</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setHealthSubTab('vaccins')}
              className={`text-left rounded-2xl border p-3 transition-all cursor-pointer ${
                healthOverview.overdueVaccines.length > 0
                  ? 'bg-[#FF4D6D]/10 border-[#FF4D6D]/30'
                  : 'bg-white/4 border-white/8 hover:bg-white/6'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/45">Vaccins</span>
                <HeartPulse className={`w-4 h-4 ${healthOverview.overdueVaccines.length > 0 ? 'text-[#FF4D6D]' : 'text-[#00D26A]'}`} />
              </div>
              <p className="mt-1 text-lg font-black text-white">
                {healthOverview.overdueVaccines.length > 0 ? healthOverview.overdueVaccines.length : healthOverview.upcomingVaccines.length}
              </p>
              <p className="text-[10px] font-bold text-white/55 leading-tight">
                {healthOverview.overdueVaccines.length > 0
                  ? 'en retard'
                  : healthOverview.upcomingVaccines.length > 0
                  ? 'à venir sous 30j'
                  : 'aucune échéance proche'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setHealthSubTab('urgence')}
              className={`text-left rounded-2xl border p-3 transition-all cursor-pointer ${
                healthOverview.incompleteEmergencyMembers.length > 0
                  ? 'bg-[#FFB020]/10 border-[#FFB020]/30'
                  : 'bg-white/4 border-white/8 hover:bg-white/6'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/45">Urgence</span>
                <ShieldCheck className={`w-4 h-4 ${healthOverview.incompleteEmergencyMembers.length > 0 ? 'text-[#FFB020]' : 'text-[#00D26A]'}`} />
              </div>
              <p className="mt-1 text-lg font-black text-white">
                {healthOverview.incompleteEmergencyMembers.length}
              </p>
              <p className="text-[10px] font-bold text-white/55 leading-tight">
                {healthOverview.incompleteEmergencyMembers.length > 0 ? 'fiche à compléter' : 'fiches complètes'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setHealthSubTab('croissance')}
              className="text-left rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 p-3 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/45">Croissance</span>
                <Activity className="w-4 h-4 text-[#6C5CFF]" />
              </div>
              <p className="mt-1 text-sm font-black text-white truncate">
                {healthOverview.latestGrowth ? `${healthOverview.latestGrowth.height} cm` : 'À renseigner'}
              </p>
              <p className="text-[10px] font-bold text-white/55 leading-tight">
                {healthOverview.latestGrowth
                  ? `${new Date(healthOverview.latestGrowth.date).toLocaleDateString('fr-FR')}`
                  : 'aucune mesure'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setHealthSubTab('frais')}
              className="text-left rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 p-3 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/45">Frais</span>
                <Coins className="w-4 h-4 text-[#00D26A]" />
              </div>
              <p className="mt-1 text-sm font-black text-white truncate">
                {formatMoney(healthOverview.monthlyHealthTotal)}
              </p>
              <p className="text-[10px] font-bold text-white/55 leading-tight">ce mois-ci</p>
            </button>
          </div>

          {(healthOverview.overdueVaccines.length > 0 || healthOverview.upcomingVaccines.length > 0 || healthOverview.incompleteEmergencyMembers.length > 0) && (
            <div className="rounded-[22px] border border-[#FFB020]/20 bg-[#FFB020]/8 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">À vérifier côté santé</h3>
                  <div className="mt-1 space-y-1 text-[11px] font-semibold text-white/65 leading-relaxed">
                    {healthOverview.overdueVaccines.slice(0, 2).map((vac: any) => {
                      const memberName = members.find(m => m.id === vac.memberId)?.name || 'un membre';
                      return <p key={`overdue-${vac.id}`}>• {vac.name} est en retard pour {memberName}.</p>;
                    })}
                    {healthOverview.upcomingVaccines.slice(0, Math.max(0, 2 - healthOverview.overdueVaccines.length)).map((vac: any) => {
                      const memberName = members.find(m => m.id === vac.memberId)?.name || 'un membre';
                      return <p key={`upcoming-${vac.id}`}>• {vac.name} arrive le {new Date(vac.date).toLocaleDateString('fr-FR')} pour {memberName}.</p>;
                    })}
                    {healthOverview.incompleteEmergencyMembers.length > 0 && (
                      <p>• Fiche urgence à compléter : {healthOverview.incompleteEmergencyMembers.slice(0, 3).map(m => m.name).join(', ')}.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab navigation */}
          <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
            <button onClick={() => setHealthSubTab('carnet')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'carnet' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              🩺 Carnet
            </button>
            <button onClick={() => setHealthSubTab('soins')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'soins' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              📋 Soins
            </button>
            <button onClick={() => setHealthSubTab('documents')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'documents' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              📄 Docs
            </button>
            <button onClick={() => setHealthSubTab('croissance')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'croissance' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              📈 Croissance
            </button>
            <button onClick={() => setHealthSubTab('vaccins')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'vaccins' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              💉 Vaccins
            </button>
            <button onClick={() => setHealthSubTab('urgence')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'urgence' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              🚨 Fiches d'Urgence
            </button>
            <button onClick={() => setHealthSubTab('frais')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'frais' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              💶 Frais Santé
            </button>
          </div>

          {showHealthQuickAdd && (
            <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
              <form onSubmit={handleHealthQuickSubmit} className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#0B1626] shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Ajouter un soin</h3>
                    <p className="text-[11px] text-white/50 font-semibold">Un seul parcours pour santé, documents et rappels.</p>
                  </div>
                  <button type="button" onClick={() => setShowHealthQuickAdd(false)} className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['consultation', 'Consultation'],
                    ['vaccine', 'Vaccin'],
                    ['treatment', 'Traitement'],
                    ['allergy', 'Allergie'],
                    ['prescription', 'Ordonnance'],
                    ['document', 'Document'],
                    ['expense', 'Dépense']
                  ] as [HealthCareKind, string][]).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setHealthQuickKind(kind)}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                        healthQuickKind === kind
                          ? 'bg-[#FF4D6D] border-[#FF4D6D] text-white'
                          : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Titre</label>
                    <input value={healthQuickTitle} onChange={(e) => setHealthQuickTitle(e.target.value)} placeholder="ex: Consultation pédiatre, Doliprane, ordonnance..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Date</label>
                    <input type="date" value={healthQuickDate} onChange={(e) => setHealthQuickDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Heure</label>
                    <input type="time" value={healthQuickTime} onChange={(e) => setHealthQuickTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D]" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Médecin / pharmacie / lieu</label>
                    <input value={healthQuickPractitioner} onChange={(e) => setHealthQuickPractitioner(e.target.value)} placeholder="ex: Dr Martin, Pharmacie centrale" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D]" />
                  </div>
                  {healthQuickKind === 'expense' && (
                    <div className="space-y-1 col-span-2">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Montant</label>
                      <input type="number" step="0.01" min="0" value={healthQuickAmount} onChange={(e) => setHealthQuickAmount(e.target.value)} placeholder="ex: 35.00" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D]" />
                    </div>
                  )}
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Document lié</label>
                    <input type="file" onChange={(e) => setHealthDocFile(e.target.files?.[0] || null)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/70 text-[11px] file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-wider">Notes</label>
                    <textarea value={healthQuickNotes} onChange={(e) => setHealthQuickNotes(e.target.value)} rows={3} placeholder="Posologie, consignes, symptômes, remboursement attendu..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D]" />
                  </div>
                </div>

                <button type="submit" className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF4D6D] to-[#FF8FA3] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer">
                  <Save className="w-4 h-4" />
                  <span>Enregistrer dans le carnet santé</span>
                </button>
              </form>
            </div>
          )}

          {emergencyFullScreenMemberId && (() => {
            const member = members.find(m => m.id === emergencyFullScreenMemberId);
            if (!member) return null;
            const emergencyPhone = (member as any).emergencyContactPhone || member.emergencyContact?.phone || '';
            const emergencyName = (member as any).emergencyContactName || member.emergencyContact?.name || 'Contact d’urgence';
            return (
              <div className="fixed inset-0 z-[90] bg-[#07111F] text-white p-5 overflow-y-auto">
                <div className="max-w-xl mx-auto min-h-full flex flex-col justify-center space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#FF4D6D]">Mode urgence</p>
                      <h2 className="text-3xl font-black text-white mt-1">{member.name}</h2>
                    </div>
                    <button type="button" onClick={() => setEmergencyFullScreenMemberId(null)} className="p-3 rounded-2xl bg-white/10 text-white cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[28px] bg-[#FF4D6D] p-5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/70">Groupe sanguin</span>
                      <p className="mt-2 text-4xl font-black text-white">{member.bloodGroup || '--'}</p>
                    </div>
                    <div className="rounded-[28px] bg-white/8 border border-white/10 p-5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/45">Âge</span>
                      <p className="mt-2 text-4xl font-black text-white">{member.age || '--'}</p>
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-[#FFB020]/12 border border-[#FFB020]/25 p-5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FFB020]">Allergies</span>
                    <p className="mt-2 text-xl font-black text-white leading-relaxed">{member.allergies?.length ? member.allergies.join(', ') : 'Aucune allergie connue'}</p>
                  </div>

                  <div className="rounded-[28px] bg-[#6C5CFF]/12 border border-[#6C5CFF]/25 p-5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8FA2FF]">Traitements</span>
                    <p className="mt-2 text-xl font-black text-white leading-relaxed">{member.treatments?.length ? member.treatments.join(', ') : 'Aucun traitement renseigné'}</p>
                  </div>

                  {emergencyPhone ? (
                    <a href={`tel:${emergencyPhone}`} className="w-full py-5 rounded-[28px] bg-[#00D26A] text-[#03130A] text-center font-black uppercase tracking-wider flex items-center justify-center gap-3">
                      <Phone className="w-6 h-6" />
                      <span>Appeler {emergencyName}</span>
                    </a>
                  ) : (
                    <div className="w-full py-5 rounded-[28px] bg-white/8 border border-white/10 text-center font-black text-white/50 uppercase tracking-wider">
                      Contact d’urgence non renseigné
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 0. Carnet médical */}
          {healthSubTab === 'carnet' && (() => {
            const member = selectedHealthMember;
            const memberDocs = healthDocuments.filter(doc => !doc.memberId || doc.memberId === member?.id);
            const memberCare = healthTimeline.slice(0, 5);
            const nextCare = [...healthTimeline]
              .filter(entry => entry.date >= new Date().toISOString().split('T')[0])
              .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];

            return (
              <div className="space-y-4">
                <div className="rounded-[30px] border border-white/8 bg-gradient-to-br from-white/8 to-white/3 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar name={member?.name} photoUrl={member?.photoUrl} className="w-14 h-14 rounded-2xl border border-white/10" />
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-white truncate">{member?.name || 'Membre'}</h3>
                        <p className="text-[11px] text-white/50 font-bold">
                          {member?.age ? `${member.age} ans` : 'Âge non renseigné'} • {member?.bloodGroup || 'Groupe sanguin à renseigner'}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => member && setEmergencyFullScreenMemberId(member.id)} className="px-3 py-2 rounded-xl bg-[#FF4D6D]/15 border border-[#FF4D6D]/25 text-[#FF4D6D] text-[10px] font-black uppercase cursor-pointer">
                      Urgence
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/8">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#FFB020]">Allergies</span>
                      <p className="mt-1 text-xs font-bold text-white leading-relaxed">{member?.allergies?.length ? member.allergies.join(', ') : 'Aucune renseignée'}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/8">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#6C5CFF]">Traitements</span>
                      <p className="mt-1 text-xs font-bold text-white leading-relaxed">{member?.treatments?.length ? member.treatments.join(', ') : 'Aucun renseigné'}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/8">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#00D26A]">Prochaine échéance</span>
                      <p className="mt-1 text-xs font-bold text-white leading-relaxed">{nextCare ? `${nextCare.title} • ${new Date(nextCare.date).toLocaleDateString('fr-FR')}` : 'Aucune échéance'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-panel rounded-[26px] border border-white/8 p-4 space-y-3">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Historique récent</h4>
                    {memberCare.length > 0 ? memberCare.map(entry => (
                      <div key={entry.id} className="p-3 rounded-2xl bg-white/4 border border-white/6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-white">{entry.title}</p>
                            <p className="text-[10px] text-white/45 font-bold">{new Date(entry.date).toLocaleDateString('fr-FR')} {entry.time ? `• ${entry.time}` : ''} {entry.practitioner ? `• ${entry.practitioner}` : ''}</p>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-[#FF4D6D]/12 text-[#FF8FA3] text-[9px] font-black uppercase">{entry.kind}</span>
                        </div>
                        {entry.notes && <p className="mt-2 text-[11px] text-white/60 leading-relaxed">{entry.notes}</p>}
                      </div>
                    )) : (
                      <div className="py-8 text-center text-white/35 text-xs font-bold">Aucun soin enregistré pour ce membre.</div>
                    )}
                  </div>

                  <div className="glass-panel rounded-[26px] border border-white/8 p-4 space-y-3">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Documents liés</h4>
                    {memberDocs.slice(0, 5).length > 0 ? memberDocs.slice(0, 5).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/4 border border-white/6">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{doc.name}</p>
                          <p className="text-[10px] text-white/45 font-bold">{doc.subCategory || 'Santé'} • {new Date(doc.uploadDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <span className="text-[10px] text-white/35 font-bold shrink-0">{doc.fileSize}</span>
                      </div>
                    )) : (
                      <div className="py-8 text-center text-white/35 text-xs font-bold">Aucun document santé relié.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 0.5 Soins */}
          {healthSubTab === 'soins' && (
            <div className="space-y-3">
              {healthTimeline.length > 0 ? healthTimeline.map(entry => (
                <div key={entry.id} className="glass-panel rounded-[24px] border border-white/8 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-white">{entry.title}</h3>
                      <span className="px-2 py-1 rounded-lg bg-white/8 text-white/55 text-[9px] font-black uppercase">{entry.kind}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/45 font-bold">
                      {entry.memberName} • {new Date(entry.date).toLocaleDateString('fr-FR')} {entry.time ? `à ${entry.time}` : ''} {entry.practitioner ? `• ${entry.practitioner}` : ''}
                    </p>
                    {entry.notes && <p className="mt-2 text-xs text-white/60 leading-relaxed">{entry.notes}</p>}
                  </div>
                  <button type="button" onClick={() => setHealthCareEntries(prev => prev.filter(item => item.id !== entry.id))} className="p-2 rounded-xl text-white/25 hover:text-[#FF4D6D] hover:bg-[#FF4D6D]/10 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )) : (
                <div className="glass-panel rounded-[28px] border border-white/8 p-8 text-center">
                  <p className="text-sm font-black text-white">Aucun soin enregistré</p>
                  <p className="mt-1 text-xs text-white/45 font-semibold">Utilisez “Ajouter un soin” pour créer une consultation, un traitement ou une ordonnance.</p>
                </div>
              )}
            </div>
          )}

          {/* 0.6 Documents santé */}
          {healthSubTab === 'documents' && (
            <div className="space-y-3">
              {healthDocuments.length > 0 ? healthDocuments
                .filter(doc => !selectedHealthMemberId || !doc.memberId || doc.memberId === selectedHealthMemberId)
                .map(doc => (
                  <div key={doc.id} className="glass-panel rounded-[24px] border border-white/8 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white truncate">{doc.name}</h3>
                      <p className="text-[11px] text-white/45 font-bold">
                        {doc.memberName || 'Famille'} • {doc.subCategory || 'Santé'} • {new Date(doc.uploadDate).toLocaleDateString('fr-FR')}
                      </p>
                      {doc.description && <p className="mt-1 text-[11px] text-white/55 truncate">{doc.description}</p>}
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-[10px] font-black shrink-0">
                      Sécurisé
                    </span>
                  </div>
                )) : (
                <div className="glass-panel rounded-[28px] border border-white/8 p-8 text-center">
                  <p className="text-sm font-black text-white">Aucun document santé</p>
                  <p className="mt-1 text-xs text-white/45 font-semibold">Ajoutez une ordonnance, analyse, mutuelle, certificat ou carnet de vaccination.</p>
                </div>
              )}
            </div>
          )}

          {/* 1. Croissance */}
          {healthSubTab === 'croissance' && (() => {
            const activeLogs = growthLogs.filter(log => log.memberId === selectedHealthMemberId).sort((a, b) => a.date.localeCompare(b.date));
            const selectedMemberName = members.find(m => m.id === selectedHealthMemberId)?.name || 'Membre';

            // Projection mathématique des points SVG (30 à 270 en X, 120 à 20 en Y)
            const minHeight = 40;
            const maxHeight = 180;
            const points = activeLogs.map((log, i) => {
              const x = activeLogs.length > 1 ? 30 + (240 * i) / (activeLogs.length - 1) : 150;
              const y = 120 - ((log.height - minHeight) / (maxHeight - minHeight)) * 90;
              return { ...log, x, y };
            });

            const pathD = points.length > 1 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') : '';

            const handleAddGrowthLog = (e: React.FormEvent) => {
              e.preventDefault();
              const h = parseFloat(newLogHeight);
              const w = parseFloat(newLogWeight);
              if (isNaN(h) || h <= 0) return;
              const newLog = {
                id: `g-${Date.now()}`,
                memberId: selectedHealthMemberId,
                date: newLogDate,
                height: h,
                weight: isNaN(w) ? 0 : w
              };
              setGrowthLogs(prev => [...prev, newLog]);
              setNewLogHeight('');
              setNewLogWeight('');
            };

            const handleDeleteGrowthLog = (id: string) => {
              setGrowthLogs(prev => prev.filter(log => log.id !== id));
            };

            return (
              <div className="space-y-4">
                <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-[#FF4D6D]" />
                    <span>Courbe de Croissance ({selectedMemberName})</span>
                  </h3>

                  <div className="h-44 w-full relative">
                    {points.length > 0 ? (
                      <svg className="w-full h-full" viewBox="0 0 300 140">
                        {/* Axes horizontal */}
                        <line x1="20" y1="20" x2="280" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="20" y1="65" x2="280" y2="65" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="20" y1="110" x2="280" y2="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        
                        {/* Courbe moyenne (percentile flou) */}
                        <path d="M30,115 Q150,75 270,35" fill="none" stroke="rgba(255, 77, 109, 0.1)" strokeWidth="8" strokeLinecap="round" />
                        
                        {/* Courbe réelle */}
                        {pathD && (
                          <path d={pathD} fill="none" stroke="#FF4D6D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        )}

                        {/* Points cliquables */}
                        {points.map((p) => (
                          <g key={p.id}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#FF4D6D" className="cursor-pointer hover:r-6 transition-all" />
                            <text x={p.x - 10} y={p.y - 8} fill="white" fontSize="7" fontWeight="bold">
                              {p.height}
                            </text>
                          </g>
                        ))}

                        <text x="25" y="130" fill="rgba(255,255,255,0.4)" fontSize="7">Début</text>
                        <text x="260" y="130" fill="rgba(255,255,255,0.4)" fontSize="7">Récent</text>
                      </svg>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        <span className="text-xl">📈</span>
                        <p className="text-xs text-white/40 mt-1 font-bold">Aucune mesure pour {selectedMemberName}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-white/30 text-center font-medium leading-relaxed">
                    Ajoutez régulièrement la taille pour tracer la courbe de croissance en temps réel de votre enfant.
                  </p>
                </div>

                {/* Formulaire ajout mesure */}
                <form onSubmit={handleAddGrowthLog} className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ajouter une mesure</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase block">Date</label>
                      <input 
                        type="date"
                        value={newLogDate}
                        onChange={(e) => setNewLogDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase block">Taille (cm)</label>
                      <input 
                        type="number"
                        placeholder="ex: 125"
                        value={newLogHeight}
                        onChange={(e) => setNewLogHeight(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase block">Poids (kg)</label>
                      <input 
                        type="number"
                        placeholder="ex: 28"
                        value={newLogWeight}
                        onChange={(e) => setNewLogWeight(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#FF4D6D] hover:bg-[#E03F5E] text-white text-xs font-bold cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Enregistrer la mesure
                  </button>
                </form>

                {/* Historique des mesures */}
                {activeLogs.length > 0 && (
                  <div className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historique</h4>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
                      {activeLogs.slice().reverse().map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0 text-xs">
                          <span className="font-bold text-white">{new Date(log.date).toLocaleDateString('fr-FR')}</span>
                          <span className="text-white/60 font-semibold">{log.height} cm • {log.weight > 0 ? `${log.weight} kg` : '--'}</span>
                          <button 
                            type="button"
                            onClick={() => handleDeleteGrowthLog(log.id)}
                            className="p-1 hover:text-red-400 text-white/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. Vaccins */}
          {healthSubTab === 'vaccins' && (() => {
            const activeVaccines = (vaccines || []).filter(v => v.memberId === selectedHealthMemberId);
            const filteredVaccines = activeVaccines.filter(v => 
              showArchivedVac ? (v.status === 'Archivé' || v.isArchived) : (v.status !== 'Archivé' && !v.isArchived)
            );
            const selectedMemberName = members.find(m => m.id === selectedHealthMemberId)?.name || 'Membre';

            const handleToggleVac = (id: string) => {
              if (setVaccines) {
                setVaccines(prev => prev.map(v => v.id === id ? { ...v, status: v.status === 'Fait' ? 'À faire' : 'Fait' } : v));
              }
            };

            const handleDeleteVac = (id: string) => {
              if (window.confirm("Supprimer ce vaccin ?")) {
                if (setVaccines) {
                  setVaccines(prev => prev.filter(v => v.id !== id));
                }
              }
            };

            const handleStartEditVac = (vac: any) => {
              setEditingVaccine(vac);
              setEditVacName(vac.name);
              setEditVacDate(vac.date);
              setEditVacTime(vac.time || '');
              setEditVacDoctor(vac.doctor || '');
              setEditVacReminder(vac.reminder || '');
              setEditVacNote(vac.note || '');
              setEditVacDoc(vac.documentUrl || '');
              setEditVacMemberId(vac.memberId);
              setEditVacStatus(vac.status);
            };

            const handleAddVac = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newVacName.trim() || !newVacDate) return;
              const newVac = {
                id: `v-${Date.now()}`,
                memberId: selectedHealthMemberId,
                name: newVacName.trim(),
                date: newVacDate,
                status: 'À faire',
                doctor: newVacDoctor.trim() || 'Médecin traitant',
                time: newVacTime,
                reminder: newVacReminder,
                note: newVacNote.trim(),
                documentUrl: newVacDoc.trim()
              };
              if (setVaccines) {
                setVaccines(prev => [...prev, newVac]);
              }
              setNewVacName('');
              setNewVacDate('');
              setNewVacDoctor('');
              setNewVacTime('');
              setNewVacReminder('');
              setNewVacNote('');
              setNewVacDoc('');
            };

            return (
              <div className="space-y-4">
                <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {showArchivedVac ? "Vaccins Archivés" : "Statut des Vaccinations"} ({selectedMemberName})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowArchivedVac(prev => !prev)}
                      className="text-[10px] text-[#FF4D6D] hover:underline font-bold transition-all cursor-pointer"
                    >
                      {showArchivedVac ? "📁 Voir les vaccins actifs" : "📦 Voir l'archivage"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {filteredVaccines.length > 0 ? (
                      filteredVaccines.map((vac) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dueDate = vac.date ? new Date(`${vac.date}T00:00:00`) : null;
                        const diffDays = dueDate && !Number.isNaN(dueDate.getTime())
                          ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                          : null;
                        const isOverdue = typeof diffDays === 'number' && diffDays < 0 && vac.status !== 'Fait';
                        const isSoon = typeof diffDays === 'number' && diffDays >= 0 && diffDays <= 30 && vac.status !== 'Fait';

                        return (
                        <div key={vac.id} className={`flex items-start justify-between py-2.5 border-b border-white/5 last:border-b-0 text-xs rounded-xl px-2 -mx-2 ${isOverdue ? 'bg-[#FF4D6D]/8' : isSoon ? 'bg-[#FFB020]/8' : ''}`}>
                          <div className="space-y-1">
                            <h4 className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                              {vac.name}
                              {vac.time && (
                                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/70 font-mono">
                                  {vac.time}
                                </span>
                              )}
                              {isOverdue && (
                                <span className="text-[8px] bg-[#FF4D6D]/15 border border-[#FF4D6D]/25 px-1.5 py-0.5 rounded text-[#FF4D6D] font-black uppercase">
                                  En retard
                                </span>
                              )}
                              {isSoon && !isOverdue && (
                                <span className="text-[8px] bg-[#FFB020]/15 border border-[#FFB020]/25 px-1.5 py-0.5 rounded text-[#FFB020] font-black uppercase">
                                  Bientôt
                                </span>
                              )}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-white/40">
                              <span>👨‍⚕️ {vac.doctor}</span>
                              {vac.reminder && <span>• 🔔 Rappel : {vac.reminder}</span>}
                            </div>
                            {vac.note && (
                              <p className="text-[10px] text-white/60 italic bg-white/5 px-2 py-1 rounded-lg inline-block mt-1">
                                {vac.note}
                              </p>
                            )}
                            {vac.documentUrl && (
                              <div className="mt-1">
                                <a 
                                  href={vac.documentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center space-x-1 text-[10px] text-[#FF4D6D] hover:underline font-semibold"
                                >
                                  <span>📄 Voir le document</span>
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-right">
                            <div>
                              <button
                                type="button"
                                onClick={() => handleToggleVac(vac.id)}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black border transition-all cursor-pointer ${
                                  vac.status === 'Fait'
                                    ? 'bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]'
                                    : vac.status === 'Archivé'
                                    ? 'bg-white/10 border-white/20 text-white/60'
                                    : 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]'
                                }`}
                              >
                                {vac.status}
                              </button>
                              <p className="text-[9px] text-white/40 mt-0.5">{new Date(vac.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditVac(vac)}
                                className="p-1 hover:text-[#00D26A] text-white/20 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVac(vac.id)}
                                className="p-1 hover:text-red-400 text-white/20 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-white/30 text-xs font-bold">
                        Aucun vaccin enregistré pour {selectedMemberName}.
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulaire ajout vaccin */}
                <form onSubmit={handleAddVac} className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ajouter un vaccin</h4>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase block">Nom du vaccin</label>
                      <input 
                        type="text"
                        placeholder="ex: DTC (Rappel coqueluche)"
                        value={newVacName}
                        onChange={(e) => setNewVacName(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/40 uppercase block">Date d'échéance</label>
                        <input 
                          type="date"
                          value={newVacDate}
                          onChange={(e) => setNewVacDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/40 uppercase block">Heure</label>
                        <input 
                          type="time"
                          value={newVacTime}
                          onChange={(e) => setNewVacTime(e.target.value)}
                          className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/40 uppercase block">Médecin / Lieu</label>
                        <input 
                          type="text"
                          placeholder="ex: Pédiatre"
                          value={newVacDoctor}
                          onChange={(e) => setNewVacDoctor(e.target.value)}
                          className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/40 uppercase block">Rappel</label>
                        <select
                          value={newVacReminder}
                          onChange={(e) => setNewVacReminder(e.target.value)}
                          className="w-full bg-[#07111F] text-white border border-white/10 rounded-xl px-2.5 py-1.5 text-xs"
                        >
                          <option value="">Aucun</option>
                          <option value="1 heure avant">1 heure avant</option>
                          <option value="2 heures avant">2 heures avant</option>
                          <option value="1 jour avant">1 jour avant</option>
                          <option value="2 jours avant">2 jours avant</option>
                          <option value="3 jours avant">3 jours avant</option>
                          <option value="1 semaine avant">1 semaine avant</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase block">Note</label>
                      <input 
                        type="text"
                        placeholder="Consignes, fièvre, rappel à faire, etc."
                        value={newVacNote}
                        onChange={(e) => setNewVacNote(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase block">Document lié (URL)</label>
                      <input 
                        type="text"
                        placeholder="https://lien-vers-ordonnance.pdf"
                        value={newVacDoc}
                        onChange={(e) => setNewVacDoc(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#FF4D6D] hover:bg-[#E03F5E] text-white text-xs font-bold cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Ajouter le vaccin
                  </button>
                </form>
              </div>
            );
          })()}

          {/* 3. Urgence */}
          {healthSubTab === 'urgence' && (() => {
            const handleSaveEmergency = async (memberId: string) => {
              try {
                const allergiesArr = editAllergies.split(',').map(s => s.trim()).filter(Boolean);
                const treatmentsArr = editTreatments.split(',').map(s => s.trim()).filter(Boolean);
                
                // Mode local
                if (setMembers) {
                  setMembers(prev => prev.map(m => m.id === memberId ? {
                    ...m,
                    bloodGroup: editBlood,
                    allergies: allergiesArr,
                    treatments: treatmentsArr,
                    emergencyContact: {
                      name: editEmergencyName,
                      phone: editEmergencyPhone,
                      relation: (m as any).emergencyContact?.relation || ''
                    },
                    emergencyContactName: editEmergencyName,
                    emergencyContactPhone: editEmergencyPhone
                  } as any : m));
                }

                // Mode cloud
                const supabase = getSupabaseClient();
                if (supabase) {
                  await foyerService.updateMemberProfile(memberId, {
                    bloodGroup: editBlood,
                    allergies: allergiesArr,
                    treatments: treatmentsArr,
                    emergencyContactName: editEmergencyName,
                    emergencyContactPhone: editEmergencyPhone
                  });
                }
                
                setEditingEmergencyMemberId(null);
              } catch (err) {
                console.error(err);
              }
            };

            const startEditingEmergency = (m: Member) => {
              const mem = m as any;
              setEditingEmergencyMemberId(m.id);
              setEditBlood(mem.bloodGroup || '');
              setEditAllergies((mem.allergies || []).join(', '));
              setEditTreatments((mem.treatments || []).join(', '));
              setEditEmergencyName(mem.emergencyContactName || mem.emergencyContact?.name || '');
              setEditEmergencyPhone(mem.emergencyContactPhone || mem.emergencyContact?.phone || '');
            };

            return (
              <div className="space-y-4 animate-fade-in">
                <div className="rounded-[28px] border-2 border-[#FF4D6D] bg-gradient-to-br from-[#FF4D6D]/15 to-[#FF4D6D]/5 p-5 space-y-4 shadow-[0_0_30px_rgba(255,77,109,0.15)]">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-[#FF4D6D] rounded-2xl text-white animate-pulse">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">FICHE D'URGENCE</h3>
                      <p className="text-[10px] text-white/60 font-bold">Informations vitales du foyer • Accès immédiat</p>
                    </div>
                  </div>
                </div>

                {members.map((member) => {
                  const isEditing = editingEmergencyMemberId === member.id;

                  return (
                    <div key={member.id} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 relative overflow-hidden">
                      {/* Background accent */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF4D6D]/3 rounded-full blur-2xl" />

                      {isEditing ? (
                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h4 className="text-sm font-extrabold text-white">Modifier {member.name}</h4>
                            <select
                              value={editBlood}
                              onChange={(e) => setEditBlood(e.target.value)}
                              className="bg-[#07111F] text-white border border-white/10 rounded-xl px-2.5 py-1 font-bold text-xs"
                            >
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-white/40 uppercase block">Allergies (séparées par virgules)</label>
                              <input 
                                type="text"
                                value={editAllergies}
                                onChange={(e) => setEditAllergies(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                                placeholder="ex: Arachides, Pénicilline"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-white/40 uppercase block">Traitements en cours</label>
                              <input 
                                type="text"
                                value={editTreatments}
                                onChange={(e) => setEditTreatments(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                                placeholder="ex: Stylo EpiPen, Aucun"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 uppercase block">Nom Contact d'Urgence</label>
                                <input 
                                  type="text"
                                  value={editEmergencyName}
                                  onChange={(e) => setEditEmergencyName(e.target.value)}
                                  className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                                  placeholder="ex: Contact parent"
                                  id="emergency_contact_name_input"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 uppercase block">Téléphone d'Urgence</label>
                                <input 
                                  type="text"
                                  value={editEmergencyPhone}
                                  onChange={(e) => setEditEmergencyPhone(e.target.value)}
                                  className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                                  placeholder="ex: 0612345678"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEmergency(member.id)}
                              className="flex-1 py-2 rounded-xl bg-[#00D26A] text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer active:scale-97 transition-all"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Enregistrer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEmergencyMemberId(null)}
                              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                                <span>{member.name}</span>
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                                  • {['parent', 'Parent'].includes(member.role) ? 'Parent' : 'Enfant'}
                                </span>
                              </h4>
                            </div>
                            <span className="px-3 py-1 rounded-xl bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 text-[#FF4D6D] text-xs font-black shadow-md shadow-[#FF4D6D]/5">
                              {member.bloodGroup || 'Non renseigné'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="p-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                              <span className="text-[9px] font-black text-[#FFB020] uppercase tracking-wider block">⚠️ Allergies connues</span>
                              <span className="text-white font-bold mt-0.5 block leading-relaxed">
                                {member.allergies && member.allergies.length > 0 
                                  ? member.allergies.join(', ') 
                                  : 'Aucune allergie connue'}
                              </span>
                            </div>
                            <div className="p-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                              <span className="text-[9px] font-black text-[#6C5CFF] uppercase tracking-wider block">💊 Traitements réguliers</span>
                              <span className="text-white font-bold mt-0.5 block leading-relaxed">
                                {member.treatments && member.treatments.length > 0 
                                  ? member.treatments.join(', ') 
                                  : 'Aucun traitement médical en cours'}
                              </span>
                            </div>
                            
                            {((member as any).emergencyContactName || (member as any).emergencyContactPhone || member.emergencyContact?.name || member.emergencyContact?.phone) ? (
                              <div className="p-3 bg-[#00D26A]/5 rounded-xl border border-[#00D26A]/20">
                                <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-wider block">🚨 Contact d'urgence</span>
                                <span className="text-white font-extrabold mt-0.5 block leading-relaxed">
                                  {((member as any).emergencyContactName || member.emergencyContact?.name || 'Urgence')} •{' '}
                                  <a href={`tel:${(member as any).emergencyContactPhone || member.emergencyContact?.phone}`} className="underline hover:text-[#00FF87] transition-colors">
                                    {((member as any).emergencyContactPhone || member.emergencyContact?.phone)}
                                  </a>
                                </span>
                              </div>
                            ) : (
                              <div className="p-3 bg-white/2 rounded-xl border border-dashed border-white/10 text-center">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-wider block">🚨 Aucun contact d'urgence défini</span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => startEditingEmergency(member)}
                            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modifier les données d'Urgence</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* 4. Frais Santé */}
          {healthSubTab === 'frais' && (() => {
            const handleAddHealthExpense = (e: React.FormEvent) => {
              e.preventDefault();
              const amt = parseFloat(newFraisAmount);
              if (isNaN(amt) || amt <= 0) return;
              
              const secuPct = parseFloat(newFraisBaseReimbSecu) || 0;
              const mutuellePct = parseFloat(newFraisBaseReimbMutuelle) || 0;
              const resteACharge = amt - (amt * (secuPct + mutuellePct) / 100);
              
              if (onAddTransaction) {
                const targetMemberName = members.find(m => m.id === newFraisMemberId)?.name || 'Famille';
                onAddTransaction({
                  amount: amt,
                  type: 'expense',
                  category: 'Santé',
                  subCategory: newFraisType,
                  title: `Santé : ${newFraisType} - ${targetMemberName}`,
                  memberId: newFraisMemberId,
                  memberName: targetMemberName,
                  date: new Date().toISOString().split('T')[0],
                  accountId: newFraisAccountId || null,
                  moduleSource: 'sante',
                  comment: `Remboursement attendu : Sécu ${secuPct}%, Mutuelle ${mutuellePct}%. Reste à charge : ${resteACharge.toFixed(2)}€`
                });
              }
              
              setNewFraisAmount('');
              alert(`💶 Frais de ${amt.toFixed(2)}€ ajoutés ! Reste à charge estimé : ${resteACharge.toFixed(2)}€`);
            };

            return (
              <form onSubmit={handleAddHealthExpense} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
                <span className="text-[10px] font-bold text-[#FF4D6D] uppercase tracking-widest block flex items-center space-x-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#FF4D6D]" />
                  <span>Enregistrer des frais médicaux 🏥</span>
                </span>
                
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Type de frais</label>
                    <select
                      value={newFraisType}
                      onChange={(e) => setNewFraisType(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Consultation">Consultation médecin / spécialiste</option>
                      <option value="Pharmacie">Médicaments / Pharmacie</option>
                      <option value="Traitements">Traitements médicaux</option>
                      <option value="Vaccins">Vaccination</option>
                      <option value="Autre">Autre frais médical</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Montant (€)</label>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      placeholder="ex: 35.00"
                      value={newFraisAmount}
                      onChange={(e) => setNewFraisAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Remboursement Sécu (%)</label>
                    <input 
                      type="number"
                      placeholder="ex: 70"
                      value={newFraisBaseReimbSecu}
                      onChange={(e) => setNewFraisBaseReimbSecu(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                    />
                  </div>

                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Remboursement Mutuelle (%)</label>
                    <input 
                      type="number"
                      placeholder="ex: 30"
                      value={newFraisBaseReimbMutuelle}
                      onChange={(e) => setNewFraisBaseReimbMutuelle(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Patient concerné</label>
                    <select
                      value={newFraisMemberId}
                      onChange={(e) => setNewFraisMemberId(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Compte à débiter</label>
                    <select
                      value={newFraisAccountId}
                      onChange={(e) => setNewFraisAccountId(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">Sélectionner un compte...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toFixed(2)}€)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#FF8FA3] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FF4D6D]/20"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Enregistrer les frais</span>
                </button>
              </form>
            );
          })()}
        </div>
      )}

      {/* SUB-MODULE 3: Courses */}
      {(activeModule === 'courses' || activeModule === 'menus') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white">Courses & Éco-Chef</h2>
              <p className="text-xs text-white/50">Gestion partagée et planification intelligente de repas</p>
            </div>
          </div>

          {/* Parental Waiver Switch (Only visible for Papa/Maman) */}
          {isParent && (
            <div className="glass-panel rounded-[24px] p-4 border border-[#FFB020]/20 flex items-center justify-between bg-[#FFB020]/5 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Droits & Dérogations Enfants 🔓</h4>
                  <p className="text-[9.5px] text-white/50 max-w-[200px] sm:max-w-xs mt-0.5 leading-normal">
                    Gérez les dérogations d'écriture de vos enfants de manière sécurisée et unifiée.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('membres')}
                className="px-3.5 py-2.5 rounded-xl bg-[#6C5CFF] text-white text-[9.5px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0 shadow-md shadow-[#6C5CFF]/15"
              >
                Gérer ➔
              </button>
            </div>
          )}

          {/* Sub-tab selection */}
          <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 flex space-x-1">
            <button
              onClick={() => setGrocerySubTab('liste')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                grocerySubTab === 'liste' 
                  ? 'bg-[#FFB020] text-black shadow-md' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Liste Courses
            </button>
            <button
              onClick={() => setGrocerySubTab('menus')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                grocerySubTab === 'menus' 
                  ? 'bg-[#FFB020] text-black shadow-md' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Menus 🍳
            </button>
            <button
              onClick={() => {
                if (!isPremium) {
                  onTriggerPaywall?.();
                } else {
                  setGrocerySubTab('ecochef');
                }
              }}
              className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                grocerySubTab === 'ecochef' 
                  ? 'bg-[#FFB020] text-black shadow-md' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Éco-Chef IA 🥦 👑
            </button>
            <button
              onClick={() => setGrocerySubTab('archives')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                grocerySubTab === 'archives' 
                  ? 'bg-[#FFB020] text-black shadow-md' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Archives 🗂️
            </button>
          </div>

          {grocerySubTab === 'liste' ? (
            <>
              {/* Quick add item form or Lock message for kids */}
              {!isParent && !groceryDerogation ? (
                <div className="p-6 rounded-[28px] bg-[#FF4D6D]/5 border border-[#FF4D6D]/15 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/20 animate-pulse">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ajout de courses verrouillé 🔒</h4>
                  <p className="text-[10px] text-white/60 leading-normal max-w-[285px] mx-auto">
                    La liste de courses est gérée par les parents. Demandez-leur d'activer la dérogation temporaire pour ajouter vos envies !
                  </p>
                </div>
              ) : (
                <form onSubmit={handleGrocerySubmit} className="glass-panel rounded-[24px] p-5 border border-white/6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ajouter un produit</h3>
                    {!isParent && groceryDerogation && (
                      <span className="text-[9px] font-extrabold text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Dérogation Active 🔓
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 relative">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Nom du produit</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Lait, Pommes, Pâtes..." 
                          value={newGroceryName}
                          onFocus={() => setShowGrocerySuggestions(true)}
                          onBlur={() => setTimeout(() => setShowGrocerySuggestions(false), 200)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewGroceryName(val);
                            // Realtime category auto-detection on type!
                            const detected = detectGroceryCategory(val);
                            if (detected) {
                              setNewGroceryCat(detected);
                            }
                          }}
                          className="w-full bg-white/5 border border-white/8 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                        />
                        <button
                          type="button"
                          onClick={handleDictation}
                          title="Dicter vocalement"
                          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                            isListening ? 'bg-[#FF4D6D] text-white animate-pulse shadow-[0_0_10px_rgba(255,77,109,0.5)]' : 'text-white/40 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                        </button>

                        {/* Suggestions d'articles */}
                        {showGrocerySuggestions && grocerySuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0b1726] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-fade-in divide-y divide-white/5">
                            {grocerySuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onMouseDown={() => {
                                  // Use onMouseDown to trigger click BEFORE onBlur closes it
                                  setNewGroceryName(suggestion);
                                  const detected = detectGroceryCategory(suggestion);
                                  if (detected) {
                                    setNewGroceryCat(detected);
                                  }
                                  setShowGrocerySuggestions(false);
                                }}
                                className="w-full text-left px-4 py-3 text-xs text-white/80 hover:text-white hover:bg-white/5 active:bg-white/10 transition-all font-medium flex items-center space-x-2"
                              >
                                <span className="text-[#FFB020] text-xs">🛍️</span>
                                <span>{suggestion}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Catégorie</label>
                      <select 
                        value={newGroceryCat}
                        onChange={(e) => setNewGroceryCat(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="Épicerie">Épicerie</option>
                        <option value="Fruits & Légumes">Fruits & Légumes</option>
                        <option value="Produits laitiers">Produits laitiers</option>
                        <option value="Viandes & poissons">Viandes & poissons</option>
                        <option value="Boulangerie">Boulangerie</option>
                        <option value="Boissons">Boissons</option>
                        <option value="Surgelés">Surgelés</option>
                        <option value="Hygiène">Hygiène</option>
                        <option value="Maison">Maison</option>
                        <option value="Bébé">Bébé</option>
                        <option value="Animaux">Animaux</option>
                        <option value="Pharmacie">Pharmacie</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Quantité</label>
                      <div className="flex items-center space-x-2">
                        <button 
                          type="button" 
                          onClick={() => setNewGroceryQty(prev => Math.max(1, prev - 1))}
                          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          min="1"
                          required
                          value={newGroceryQty}
                          onChange={(e) => setNewGroceryQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 bg-white/5 border border-white/8 rounded-xl py-2 text-center text-xs text-white focus:outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => setNewGroceryQty(prev => prev + 1)}
                          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Unité</label>
                      <select 
                        value={newGroceryUnit}
                        onChange={(e) => setNewGroceryUnit(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="pièces">pièces</option>
                        <option value="paquets">paquets</option>
                        <option value="bouteilles">bouteilles</option>
                        <option value="boîtes">boîtes</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3 rounded-xl bg-[#FFB020] text-black hover:opacity-95 transition-all cursor-pointer font-bold text-xs flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Ajouter à la liste commune</span>
                  </button>
                </form>
              )}

              {/* Intelligent Shelves / Aisles Sorted Checklist */}
              <div className="space-y-4">
                {/* Visual Aisle Filters Switcher */}
                <div className="bg-[#07111F]/40 p-1 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex space-x-1 flex-1">
                    <button
                      type="button"
                      onClick={() => setGroceryFilter('all')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                        groceryFilter === 'all' 
                          ? 'bg-white/10 text-white' 
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      Tout ({groceries.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroceryFilter('pending')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                        groceryFilter === 'pending' 
                          ? 'bg-[#FFB020]/20 text-[#FFB020]' 
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      À acheter ({groceries.filter(g => !g.checked).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroceryFilter('checked')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                        groceryFilter === 'checked' 
                          ? 'bg-[#00D26A]/20 text-[#00D26A]' 
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      Achetés ({groceries.filter(g => g.checked).length})
                    </button>
                  </div>
                </div>

                {/* Control Center Panel */}
                <div className="grid grid-cols-1 md:flex md:items-center md:justify-between gap-3 bg-[#07111F]/30 p-3 rounded-2xl border border-white/5">
                  {/* Sorting dropdown */}
                  <div className="flex items-center space-x-2 flex-1 max-w-xs">
                    <Filter className="w-3.5 h-3.5 text-[#FFB020] shrink-0" />
                    <span className="text-[10px] font-bold text-white/50 uppercase shrink-0">Tri :</span>
                    <select
                      value={grocerySort}
                      onChange={(e) => setGrocerySort(e.target.value as any)}
                      className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FFB020] cursor-pointer"
                    >
                      <option value="custom">Tri par catégorie</option>
                      <option value="parcours">Parcours magasin 🧭</option>
                      <option value="alphabetical">Tri alphabétique 🔤</option>
                    </select>
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2 shrink-0">

                    {groceries.some(g => g.checked) && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsValiderAchatsOpen(true);
                        }}
                        className="py-1.5 px-3 bg-[#00D26A]/15 border border-[#00D26A]/30 hover:bg-[#00D26A]/25 text-[#00D26A] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Valider mes achats</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setArchiveListName(`Courses du ${new Date().toLocaleDateString('fr-FR')}`);
                        setArchiveListStore('');
                        setArchiveModalOpen(true);
                      }}
                      className="py-1.5 px-3 bg-[#FFB020]/15 border border-[#FFB020]/30 hover:bg-[#FFB020]/25 text-[#FFB020] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archiver</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCleanModalOpen(true)}
                      className="py-1.5 px-3 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      title="Nettoyer la liste"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Nettoyer</span>
                    </button>
                  </div>
                </div>


                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {grocerySort === 'alphabetical' ? 'Liste alphabétique' : (grocerySort === 'parcours' ? 'Parcours magasin 🧭' : 'Liste par rayons')}
                  </h3>
                  <span className="text-[9px] font-extrabold text-[#FFB020] bg-[#FFB020]/10 border border-[#FFB020]/20 px-2 py-0.5 rounded flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-[#FFB020] rounded-full animate-ping"></span>
                    <span>{grocerySort === 'parcours' ? 'Ordre optimal' : 'Rayons ordonnés'}</span>
                  </span>
                </div>

                {(() => {
                  const getParcoursCategoryIndex = (catName: string) => {
                    const normalized = catName.trim().toLowerCase();
                    if (normalized.includes('fruit') || normalized.includes('légume') || normalized.includes('legume')) return 1;
                    if (normalized.includes('boulangerie') || normalized.includes('pain')) return 2;
                    if (normalized.includes('frais') || normalized.includes('lait') || normalized.includes('yaourt') || normalized.includes('crème') || normalized.includes('creme') || normalized.includes('laitier')) return 3;
                    if (normalized.includes('viande') || normalized.includes('poisson') || normalized.includes('boucherie') || normalized.includes('charcuterie')) return 4;
                    if (normalized.includes('épicerie') || normalized.includes('epicerie')) return 5;
                    if (normalized.includes('surgelé') || normalized.includes('surgele')) return 6;
                    if (normalized.includes('boisson')) return 7;
                    if (normalized.includes('hygiène') || normalized.includes('hygiene') || normalized.includes('soin')) return 8;
                    if (normalized.includes('maison') || normalized.includes('entretien') || normalized.includes('nettoyage')) return 9;
                    if (normalized.includes('bébé') || normalized.includes('bebe')) return 10;
                    if (normalized.includes('animaux') || normalized.includes('animal')) return 11;
                    if (normalized.includes('pharmacie') || normalized.includes('santé') || normalized.includes('sante')) return 12;
                    return 13;
                  };

                  const filteredGroceries = groceries.filter(item => {
                    if (groceryFilter === 'pending') return !item.checked;
                    if (groceryFilter === 'checked') return item.checked;
                    return true;
                  });

                  if (filteredGroceries.length === 0) {
                    return (
                      <div className="p-8 text-center glass-panel rounded-2xl border border-white/5">
                        <span className="text-xs text-white/30">Aucun produit ne correspond à ce filtre.</span>
                      </div>
                    );
                  }

                  if (grocerySort === 'alphabetical') {
                    const sortedItems = [...filteredGroceries].sort((a, b) => {
                      if (a.checked && !b.checked) return 1;
                      if (!a.checked && b.checked) return -1;
                      return a.name.localeCompare(b.name, 'fr');
                    });

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sortedItems.map((item) => (
                          <div key={item.id} className="relative group">
                            <button
                              onClick={() => {
                                if (!isParent && !groceryDerogation) {
                                  alert("🔒 Dérogation parentale requise pour cocher ou modifier les courses !");
                                  return;
                                }
                                onToggleGrocery(item.id);
                              }}
                              className={`w-full glass-panel rounded-[24px] p-4 pr-24 border transition-all text-left flex items-center justify-between hover:bg-white/8 cursor-pointer ${
                                item.checked ? 'border-[#00D26A]/30 bg-[#00D26A]/5 opacity-60' : 'border-white/8'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  item.checked ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                                }`}>
                                  ✓
                                </span>
                                <div>
                                  {(() => {
                                    const emoji = getGroceryItemEmoji(item.name);
                                    return (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <span className="text-base sm:text-lg shrink-0">{emoji}</span>
                                          <h4 className={`text-xs sm:text-sm font-bold text-white ${item.checked ? 'line-through text-white/40' : ''}`}>
                                            {item.name}
                                          </h4>
                                          <span className="text-[8px] font-extrabold px-1 rounded bg-white/5 text-white/40 uppercase">
                                            {item.category}
                                          </span>
                                        </div>
                                        <p className="text-xs text-white/70 font-semibold mt-0.5 flex items-center gap-1.5">
                                          <span>{formatGroceryQty(item.quantity)}</span>
                                          <span className="text-[9px] text-white/30 font-bold">•</span>
                                          <span className={`text-[9px] font-bold uppercase tracking-wider ${item.checked ? 'text-[#00D26A]' : (item.inStock ? 'text-[#00D26A]' : 'text-[#FF4D6D]')}`}>
                                            {item.checked ? 'Acheté' : (item.inStock ? 'En stock' : 'Rupture')}
                                          </span>
                                        </p>
                                      </>
                                    );
                                  })()}
                                  
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.addedBy && (
                                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 tracking-wide uppercase">
                                        👤 {item.addedBy}
                                      </span>
                                    )}
                                    {item.meal && (
                                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-[#FFB020]/15 border border-[#FFB020]/25 text-[#FFB020] tracking-wide uppercase">
                                        🍽️ {item.meal}
                                      </span>
                                    )}
                                    {item.isFavorite && (
                                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-[#FF4D6D]/15 border border-[#FF4D6D]/25 text-[#FF4D6D] tracking-wide uppercase">
                                        ★ Favori
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                            
                            <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center space-x-1 bg-[#112240] p-1.5 rounded-xl shadow-lg border border-white/10 backdrop-blur-md z-20">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFavoriteGrocery(item.id);
                                }}
                                className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer ${
                                  item.isFavorite ? 'text-[#FFB020]' : 'text-white/30 hover:text-white/60'
                                }`}
                                title={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                              >
                                <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-[#FFB020]' : ''}`} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isParent && !groceryDerogation) {
                                    alert("🔒 Dérogation parentale requise pour cocher ou modifier les courses !");
                                    return;
                                  }
                                  const newName = prompt('Modifier le nom du produit:', item.name);
                                  const newQty = prompt('Modifier la quantité:', item.quantity);
                                  if (newName && newQty) onEditGroceryItem(item.id, newName, newQty);
                                }}
                                title="Modifier"
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isParent && !groceryDerogation) {
                                    alert("🔒 Dérogation parentale requise pour supprimer les courses !");
                                    return;
                                  }
                                  if(window.confirm('Supprimer cet article ?')) onDeleteGroceryItem(item.id);
                                }}
                                title="Supprimer"
                                className="p-1.5 hover:bg-[#FF4D6D]/20 rounded-lg text-[#FF4D6D] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  const grouped: Record<string, typeof groceries> = {};
                  filteredGroceries.forEach(item => {
                    const cat = item.category || 'Épicerie';
                    if (!grouped[cat]) {
                      grouped[cat] = [];
                    }
                    grouped[cat].push(item);
                  });

                  const sortedCats = Object.keys(grouped).sort((a, b) => {
                    if (grocerySort === 'parcours') {
                      return getParcoursCategoryIndex(a) - getParcoursCategoryIndex(b);
                    }
                    const categoryOrder = [
                      'Fruits & Légumes',
                      'Boulangerie',
                      'Produits laitiers',
                      'Viandes & poissons',
                      'Épicerie',
                      'Surgelés',
                      'Boissons',
                      'Hygiène',
                      'Maison',
                      'Bébé',
                      'Animaux',
                      'Pharmacie'
                    ];
                    let indexA = categoryOrder.indexOf(a);
                    let indexB = categoryOrder.indexOf(b);
                    if (indexA === -1) indexA = 99;
                    if (indexB === -1) indexB = 99;
                    return indexA - indexB;
                  });

                  return (
                    <div className="space-y-5">
                      {sortedCats.map((catName) => {
                        const sortedItems = [...grouped[catName]].sort((a, b) => {
                          if (a.checked && !b.checked) return 1;
                          if (!a.checked && b.checked) return -1;
                          return a.name.localeCompare(b.name);
                        });

                        const totalShelfItems = groceries.filter(g => g.category === catName);
                        const boughtShelfItems = totalShelfItems.filter(g => g.checked);

                        return (
                          <div key={catName} className="space-y-2">
                            <div className="flex items-center justify-between px-1 py-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-black text-[#FFB020] uppercase tracking-widest">
                                  {catName}
                                </span>
                                <span className="text-[8px] font-bold text-white/30 font-mono">
                                  ({sortedItems.length})
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <span className="h-[1px] w-12 bg-white/10"></span>
                                <span className="text-[9px] font-extrabold text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-1.5 py-0.2 rounded font-mono">
                                  {boughtShelfItems.length}/{totalShelfItems.length} achetés
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sortedItems.map((item) => (
                                <div key={item.id} className="relative group">
                                  <button
                                    onClick={() => {
                                      if (!isParent && !groceryDerogation) {
                                        alert("🔒 Dérogation parentale requise pour cocher ou modifier les courses !");
                                        return;
                                      }
                                      onToggleGrocery(item.id);
                                    }}
                                    className={`w-full glass-panel rounded-[24px] p-4 pr-24 border transition-all text-left flex items-center justify-between hover:bg-white/8 cursor-pointer ${
                                      item.checked ? 'border-[#00D26A]/30 bg-[#00D26A]/5 opacity-60' : 'border-white/8'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                        item.checked ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                                      }`}>
                                        ✓
                                      </span>
                                      <div>
                                        {(() => {
                                          const emoji = getGroceryItemEmoji(item.name);
                                          return (
                                            <>
                                              <div className="flex items-center gap-2">
                                                <span className="text-base sm:text-lg shrink-0">{emoji}</span>
                                                <h4 className={`text-xs sm:text-sm font-bold text-white ${item.checked ? 'line-through text-white/40' : ''}`}>
                                                  {item.name}
                                                </h4>
                                              </div>
                                              <p className="text-xs text-white/70 font-semibold mt-0.5 flex items-center gap-1.5">
                                                <span>{formatGroceryQty(item.quantity)}</span>
                                                <span className="text-[9px] text-white/30 font-bold">•</span>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${item.checked ? 'text-[#00D26A]' : (item.inStock ? 'text-[#00D26A]' : 'text-[#FF4D6D]')}`}>
                                                  {item.checked ? 'Acheté' : (item.inStock ? 'En stock' : 'Rupture')}
                                                </span>
                                              </p>
                                            </>
                                          );
                                        })()}
                                        
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {item.addedBy && (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 tracking-wide uppercase">
                                              👤 {item.addedBy}
                                            </span>
                                          )}
                                          {item.meal && (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-[#FFB020]/15 border border-[#FFB020]/25 text-[#FFB020] tracking-wide uppercase">
                                              🍽️ {item.meal}
                                            </span>
                                          )}
                                          {item.isFavorite && (
                                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-[#FF4D6D]/15 border border-[#FF4D6D]/25 text-[#FF4D6D] tracking-wide uppercase">
                                              ★ Favori
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                  
                                  <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center space-x-1 bg-[#112240] p-1.5 rounded-xl shadow-lg border border-white/10 backdrop-blur-md z-20">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavoriteGrocery(item.id);
                                      }}
                                      className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer ${
                                        item.isFavorite ? 'text-[#FFB020]' : 'text-white/30 hover:text-white/60'
                                      }`}
                                      title={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                                    >
                                      <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-[#FFB020]' : ''}`} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isParent && !groceryDerogation) {
                                          alert("🔒 Dérogation parentale requise pour cocher ou modifier les courses !");
                                          return;
                                        }
                                        const newName = prompt('Modifier le nom du produit:', item.name);
                                        const newQty = prompt('Modifier la quantité:', item.quantity);
                                        if (newName && newQty) onEditGroceryItem(item.id, newName, newQty);
                                      }}
                                      title="Modifier"
                                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isParent && !groceryDerogation) {
                                          alert("🔒 Dérogation parentale requise pour supprimer les courses !");
                                          return;
                                        }
                                        if(window.confirm('Supprimer cet article ?')) onDeleteGroceryItem(item.id);
                                      }}
                                      title="Supprimer"
                                      className="p-1.5 hover:bg-[#FF4D6D]/20 rounded-lg text-[#FF4D6D] transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : grocerySubTab === 'archives' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#07111F]/40 border border-white/5 space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Archives des Listes de Courses</h3>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Retrouvez et réutilisez en un clic les listes de courses que vous avez archivées.
                </p>
              </div>

              {archivedLists.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-3xl border border-dashed border-white/10">
                  <span className="text-xs text-white/30 block mb-2">Aucune liste archivée pour le moment.</span>
                  <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                    Pour archiver votre liste active, cliquez sur le bouton "Archiver" dans l'onglet de la liste principale.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedLists.map((list) => (
                    <div key={list.id} className="glass-panel border-white/8 rounded-[24px] p-5 space-y-3 relative animate-scale-up">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">{list.name}</h4>
                          <p className="text-[9px] text-[#FFB020] font-bold uppercase tracking-wider mt-0.5">
                            Créée par {list.createdBy} le {list.date}
                          </p>
                          {list.store && (
                            <span className="inline-block mt-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-[#6C5CFF]/15 border border-[#6C5CFF]/20 text-[#6C5CFF] uppercase tracking-wide">
                              Magasin: {list.store}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Voulez-vous réinjecter les produits de cette liste dans votre liste de courses active ?')) {
                                onReuseArchivedList(list.id);
                                setGrocerySubTab('liste');
                              }
                            }}
                            className="px-3 py-1.5 bg-[#00D26A]/20 border border-[#00D26A]/30 text-[#00D26A] hover:bg-[#00D26A]/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Réutiliser</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Supprimer définitivement cette archive ?')) {
                                onDeleteArchivedList(list.id);
                              }
                            }}
                            className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer flex items-center"
                            title="Supprimer l'archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Items list preview */}
                      <div className="p-3 bg-black/25 rounded-2xl border border-white/5 max-h-36 overflow-y-auto no-scrollbar">
                        <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Aperçu ({list.items.length} articles) :</span>
                        <div className="flex flex-wrap gap-1.5">
                          {list.items.map((item, idx) => (
                            <span 
                              key={idx} 
                              className={`text-[8.5px] font-bold px-2 py-0.5 rounded-lg border flex items-center space-x-1 ${
                                item.isFavorite 
                                  ? 'bg-[#FF4D6D]/15 border-[#FF4D6D]/30 text-[#FF4D6D]' 
                                  : 'bg-white/5 border-white/5 text-white/60'
                              }`}
                            >
                              {item.name} ({item.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : grocerySubTab === 'menus' ? (
            <div className="space-y-6">
              
              {/* Form to edit/add menu (Only for parents) */}
              {isParent ? (
                <form onSubmit={handleSaveMeal} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Planifier ou modifier un repas :</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Jour</label>
                      <select 
                        value={mealDay}
                        onChange={(e) => setMealDay(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="Lun">Lundi</option>
                        <option value="Mar">Mardi</option>
                        <option value="Mer">Mercredi</option>
                        <option value="Jeu">Jeudi</option>
                        <option value="Ven">Vendredi</option>
                        <option value="Sam">Samedi</option>
                        <option value="Dim">Dimanche</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Moment</label>
                      <select 
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value as 'lunch' | 'dinner')}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="lunch">Déjeuner ☀️</option>
                        <option value="dinner">Dîner 🌙</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nom du plat</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Poulet Yassa traditionnel..." 
                        value={mealName}
                        onChange={(e) => setMealName(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Image Vignette Culinaire</label>
                      <div className="flex gap-2">
                        <select 
                          value={MEAL_IMAGE_PRESETS.some(p => p.url === mealImagePreset) ? mealImagePreset : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setMealImagePreset(e.target.value);
                            }
                          }}
                          className="flex-1 bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                        >
                          {MEAL_IMAGE_PRESETS.map(pr => (
                            <option key={pr.url} value={pr.url}>{pr.name}</option>
                          ))}
                          {!MEAL_IMAGE_PRESETS.some(p => p.url === mealImagePreset) && mealImagePreset && (
                            <option value="custom">📷 Image personnalisée</option>
                          )}
                        </select>
                        <input
                          type="file"
                          id="meal-image-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file);
                                setMealImagePreset(compressed);
                              } catch (err: any) {
                                alert(err.message);
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('meal-image-upload')?.click()}
                          className="px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl text-xs transition cursor-pointer shrink-0"
                        >
                          Téléverser
                        </button>
                      </div>
                      {mealImagePreset && (
                        <div className="mt-2 flex items-center space-x-2 bg-white/5 p-1.5 rounded-xl border border-white/5 max-w-max">
                          <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider pl-1">Aperçu :</span>
                          <DishImage src={mealImagePreset} alt="Aperçu du plat" className="w-8 h-8 rounded-lg" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Ingrédients (séparés par des virgules)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Poulet, Oignons, Citrons, Moutarde, Riz..." 
                      value={mealIngredients}
                      onChange={(e) => setMealIngredients(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-black font-extrabold text-xs shadow-md cursor-pointer transition-all hover:opacity-95 flex items-center justify-center space-x-2"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Enregistrer le Repas</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-white/50">
                  🔒 La planification des menus est gérée par les parents.
                </div>
              )}

              {/* Weekly visual cards list */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Menu Planifié de la semaine :</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => {
                    const dayDishes = dishes.filter(d => d.day === day);
                    const frenchDay = day === 'Lun' ? 'Lundi' : day === 'Mar' ? 'Mardi' : day === 'Mer' ? 'Mercredi' : day === 'Jeu' ? 'Jeudi' : day === 'Ven' ? 'Vendredi' : day === 'Sam' ? 'Samedi' : 'Dimanche';
                    
                    return (
                      <div key={day} className="glass-panel border border-white/6 rounded-[28px] p-4 space-y-3">
                        <div className="border-b border-white/5 pb-2">
                          <h4 className="text-xs font-extrabold text-[#FFB020] tracking-wide">{frenchDay}</h4>
                        </div>

                        {dayDishes.length > 0 ? (
                          <div className="space-y-3">
                            {dayDishes.map(dish => (
                              <div key={dish.id} className="flex items-center space-x-3 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                                <DishImage src={dish.image} alt={dish.name} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5">
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase border ${
                                      dish.mealType === 'lunch' 
                                        ? 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' 
                                        : 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20'
                                    }`}>
                                      {dish.mealType === 'lunch' ? 'Déjeuner ☀️' : 'Dîner 🌙'}
                                    </span>
                                  </div>
                                  <h5 className="text-[11px] sm:text-xs font-bold text-white truncate mt-1">{dish.name}</h5>
                                  <p className="text-[9px] text-white/40 truncate mt-0.5">
                                    {dish.ingredients.join(', ')}
                                  </p>
                                </div>
                                {dish.ingredients.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dish.ingredients.forEach(ing => {
                                        onAddGroceryItem(ing, 'Frais', '1 pièces');
                                      });
                                      alert(`🛒 ${dish.ingredients.length} ingrédient(s) ajouté(s) à la liste de courses !`);
                                    }}
                                    className="p-1.5 bg-[#00D26A]/10 hover:bg-[#00D26A]/20 rounded-lg border border-[#00D26A]/20 text-[#00D26A] transition shrink-0 cursor-pointer"
                                    title="Ajouter aux courses"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-white/30 py-2 text-center">Aucun repas planifié</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            isPremium ? (
              <EcoChef 
                onAddGroceryItem={onAddGroceryItem} 
                formatMoney={formatMoney} 
                isPremium={isPremium}
                onTriggerPaywall={onTriggerPaywall}
                activeFoyerId={foyer?.id}
                activeMemberName={members.find(member => member.id === activeMemberId)?.name || 'Famille'}
              />
            ) : (
              <div className="p-8 text-center glass-panel border border-[#6C5CFF]/30 rounded-[32px] bg-gradient-to-b from-[#0F1E3D]/50 to-[#07111F]/80 space-y-4">
                <div className="inline-flex p-4 rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Éco-Chef IA & Anti-Gaspi 🥦 👑</h3>
                <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
                  Débloquez l'assistant culinaire intelligent MyFamily+ ! Éco-Chef analyse vos restes de frigo, planifie vos menus hebdomadaires équilibrés et génère des listes de courses en un clic.
                </p>
                <button
                  type="button"
                  onClick={() => onTriggerPaywall?.()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition-all cursor-pointer"
                >
                  Débloquer Éco-Chef IA ⚡
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* SUB-MODULE 4: Tâches */}
      {activeModule === 'taches' && (() => {
        // Parse chores from metadata
        const parsedChores = (tasks || []).map(t => {
          if (!t) return null;
          const meta = parseChoreTitle(t.title);
          return {
            ...t,
            title: meta.title || t.title,
            description: meta.description,
            priority: meta.priority || 'medium',
            status: meta.status || (t.done ? (t.validatedByParent ? 'validated' : 'pending_validation') : 'todo'),
            validationRequired: meta.validationRequired !== false,
            isArchived: meta.isArchived || t.validatedByParent || false,
            time: meta.time,
            rewardAmount: meta.rewardAmount || t.rewardAmount,
            assignedMemberIds: meta.assignedMemberIds || (t.assignedMemberId ? [t.assignedMemberId] : []),
            recurrence: meta.recurrence || t.rotation,
            attributionMode: meta.attributionMode || 'single',
            maxParticipants: meta.maxParticipants || 1,
            selectionMode: meta.selectionMode || 'first_come',
            candidates: meta.candidates || [],
            acceptedVolunteers: meta.acceptedVolunteers || [],
            difficulty: meta.difficulty || 'medium',
            category: meta.category || 'Divers',
            imageUrl: meta.imageUrl || '',
            estimatedTime: meta.estimatedTime || '',
            isDailySpecial: !!meta.isDailySpecial,
            xpReward: meta.xpReward
          };
        }).filter(Boolean) as any[];

        const activeParsedTasks = parsedChores.filter(t => !t.isArchived);
        const archivedParsedTasks = parsedChores.filter(t => t.isArchived);

        const tasksToValidate = activeParsedTasks.filter(t => t.status === 'pending_validation');

        const handleRefuseTask = async (taskId: string) => {
          const target = tasks.find(t => t.id === taskId);
          if (!target) return;

          if (window.confirm(`Refuser cette tâche et demander des corrections ?`)) {
            const meta = parseChoreTitle(target.title);
            meta.status = 'refused';
            meta.title = meta.title || target.title;
            const serialized = serializeChoreTitle(meta);

            if (setTasks) {
              setTasks(prev => prev.map(t => t.id === taskId ? {
                ...t,
                title: serialized,
                done: false,
                validatedByParent: false
              } : t));
            }

            try {
              const client = getSupabaseClient();
              if (client) {
                await client.from('chore_tasks')
                  .update({ title: serialized, done: false, validated_by_parent: false })
                  .eq('id', taskId);
                console.log("[MenuHub] Task successfully marked as refused.");
              }
            } catch (err) {
              console.error("[MenuHub] Failed to refuse task on cloud:", err);
            }
          }
        };

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-white">Tâches Ménagères & Missions</h2>
              <p className="text-xs text-white/50">Rotation automatique et argent de poche</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
                <strong className="block text-lg font-black text-white">{activeParsedTasks.length}</strong>
                <span className="text-[9px] font-bold text-white/40">missions actives</span>
              </div>
              <div className="rounded-2xl border border-[#FFB020]/15 bg-[#FFB020]/5 p-3">
                <strong className="block text-lg font-black text-[#FFB020]">{tasksToValidate.length}</strong>
                <span className="text-[9px] font-bold text-white/40">à valider</span>
              </div>
              <div className="rounded-2xl border border-[#00D26A]/15 bg-[#00D26A]/5 p-3">
                <strong className="block text-lg font-black text-[#00D26A]">{archivedParsedTasks.filter(task => task.status === 'validated' || task.validatedByParent).length}</strong>
                <span className="text-[9px] font-bold text-white/40">terminées</span>
              </div>
            </div>

            {/* Formulaire ajout Tâche avec récompense financière */}
            {isParent && getPermission('taches', 'ajouter') && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newLocalTaskTitle.trim()) return;
                  if (newLocalTaskAttributionMode !== 'wall' && newLocalTaskAssigneeIds.length === 0) {
                    alert("Veuillez sélectionner au moins un membre assigné.");
                    return;
                  }

                  if (newLocalTaskAttributionMode === 'wall') {
                    // Create task on the Wall
                    const serialized = serializeChoreTitle({
                      title: newLocalTaskTitle,
                      description: newLocalTaskDescription,
                      priority: newLocalTaskPriority,
                      status: 'todo',
                      validationRequired: newLocalTaskValidationRequired,
                      isArchived: false,
                      time: newLocalTaskTime,
                      rewardAmount: parseFloat(newLocalTaskRewardAmount) || 0,
                      assignedMemberIds: [],
                      recurrence: newLocalTaskRotation as any,
                      attributionMode: 'wall',
                      maxParticipants: newLocalTaskMaxParticipants,
                      selectionMode: newLocalTaskSelectionMode,
                      difficulty: newLocalTaskDifficulty,
                      category: newLocalTaskCategory,
                      imageUrl: newLocalTaskImageUrl,
                      estimatedTime: newLocalTaskEstimatedTime,
                      isDailySpecial: newLocalTaskIsDailySpecial,
                      xpReward: newLocalTaskXpReward,
                      candidates: [],
                      acceptedVolunteers: []
                    });

                    onAddTask({
                      title: serialized,
                      rewardPoints: Number(newLocalTaskPoints) || 0,
                      rotation: newLocalTaskRotation,
                      assignedMemberId: '',
                      assignedMemberName: 'Ouverte (Mur)',
                      done: false,
                      validatedByParent: false,
                      dueDate: newLocalTaskDueDate || new Date().toISOString().split('T')[0],
                      rewardAmount: parseFloat(newLocalTaskRewardAmount) || undefined
                    });
                  } else if (newLocalTaskAttributionMode === 'multiple') {
                    // Create a separate task for each selected member
                    newLocalTaskAssigneeIds.forEach(memberId => {
                      const memberObj = members.find(m => m.id === memberId);
                      const assigneeName = memberObj ? memberObj.name : 'Membre';
                      const serialized = serializeChoreTitle({
                        title: newLocalTaskTitle,
                        description: newLocalTaskDescription,
                        priority: newLocalTaskPriority,
                        status: 'todo',
                        validationRequired: newLocalTaskValidationRequired,
                        isArchived: false,
                        time: newLocalTaskTime,
                        rewardAmount: parseFloat(newLocalTaskRewardAmount) || 0,
                        assignedMemberIds: [memberId],
                        recurrence: newLocalTaskRotation as any,
                        attributionMode: 'single'
                      });

                      onAddTask({
                        title: serialized,
                        rewardPoints: Number(newLocalTaskPoints) || 0,
                        rotation: newLocalTaskRotation,
                        assignedMemberId: memberId,
                        assignedMemberName: assigneeName,
                        done: false,
                        validatedByParent: false,
                        dueDate: newLocalTaskDueDate || new Date().toISOString().split('T')[0],
                        rewardAmount: parseFloat(newLocalTaskRewardAmount) || undefined
                      });
                    });
                  } else {
                    // Single assignment
                    const firstAssigneeId = newLocalTaskAssigneeIds[0] || '';
                    const firstAssigneeObj = members.find(m => m.id === firstAssigneeId);
                    const assigneeName = firstAssigneeObj ? firstAssigneeObj.name : 'Général';
                    const serialized = serializeChoreTitle({
                      title: newLocalTaskTitle,
                      description: newLocalTaskDescription,
                      priority: newLocalTaskPriority,
                      status: 'todo',
                      validationRequired: newLocalTaskValidationRequired,
                      isArchived: false,
                      time: newLocalTaskTime,
                      rewardAmount: parseFloat(newLocalTaskRewardAmount) || 0,
                      assignedMemberIds: [firstAssigneeId],
                      recurrence: newLocalTaskRotation as any,
                      attributionMode: 'single'
                    });

                    onAddTask({
                      title: serialized,
                      rewardPoints: Number(newLocalTaskPoints) || 0,
                      rotation: newLocalTaskRotation,
                      assignedMemberId: firstAssigneeId,
                      assignedMemberName: assigneeName,
                      done: false,
                      validatedByParent: false,
                      dueDate: newLocalTaskDueDate || new Date().toISOString().split('T')[0],
                      rewardAmount: parseFloat(newLocalTaskRewardAmount) || undefined
                    });
                  }

                  // Reset states
                  setNewLocalTaskTitle('');
                  setNewLocalTaskRewardAmount('');
                  setNewLocalTaskDescription('');
                  setNewLocalTaskDueDate('');
                  setNewLocalTaskTime('');
                  setNewLocalTaskPriority('medium');
                  setNewLocalTaskValidationRequired(true);
                  setNewLocalTaskAssigneeIds([]);
                  setNewLocalTaskAttributionMode('single');
                  setNewLocalTaskMaxParticipants(1);
                  setNewLocalTaskSelectionMode('first_come');
                  setNewLocalTaskDifficulty('medium');
                  setNewLocalTaskCategory('Divers');
                  setNewLocalTaskImageUrl('');
                  setNewLocalTaskEstimatedTime('');
                  setNewLocalTaskIsDailySpecial(false);
                  setNewLocalTaskXpReward(20);
                  alert(`🧹 Mission "${newLocalTaskTitle}" créée avec succès !`);
                }}
                className="glass-panel border border-[#6C5CFF]/20 rounded-[28px] p-5 space-y-4 text-left font-sans animate-fade-in"
              >
                <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#6C5CFF]" />
                  <span>Créer une mission / tâche (Accès Parent) 🧹</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-medium">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Intitulé de la tâche / mission</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Ranger la chambre, Tondre la pelouse..."
                      value={newLocalTaskTitle}
                      onChange={(e) => setNewLocalTaskTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Mode d'attribution</label>
                    <select
                      value={newLocalTaskAttributionMode}
                      onChange={(e) => setNewLocalTaskAttributionMode(e.target.value as any)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="single">Assignation unique (Membre spécifique)</option>
                      <option value="multiple">Assignations multiples (Clônée pour chacun)</option>
                      <option value="wall">Ouverte à tous les enfants 🔥</option>
                    </select>
                  </div>
                </div>

                {newLocalTaskAttributionMode !== 'wall' && (
                  <div className="flex flex-col text-left animate-slide-down">
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">
                      {newLocalTaskAttributionMode === 'single' ? "Assigné à (Sélectionnez un membre)" : "Assigné à (Sélection multiple)"}
                    </label>
                    <div className="flex flex-wrap gap-1.5 py-1 text-left">
                      {members.map(m => {
                        const checked = newLocalTaskAssigneeIds.includes(m.id);
                        return (
                          <label key={m.id} className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl border text-[10px] cursor-pointer select-none transition-all font-bold ${
                            checked 
                              ? 'bg-[#6C5CFF]/20 border-[#6C5CFF] text-[#9e94ff]' 
                              : 'bg-white/5 border-white/5 text-white/50 hover:text-white'
                          }`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (newLocalTaskAttributionMode === 'single') {
                                  setNewLocalTaskAssigneeIds([m.id]);
                                } else {
                                  if (checked) {
                                    setNewLocalTaskAssigneeIds(prev => prev.filter(id => id !== m.id));
                                  } else {
                                    setNewLocalTaskAssigneeIds(prev => [...prev, m.id]);
                                  }
                                }
                              }}
                              className="hidden"
                            />
                            <span>{m.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {newLocalTaskAttributionMode === 'wall' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left font-medium animate-slide-down">
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Participants max</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newLocalTaskMaxParticipants}
                        onChange={(e) => setNewLocalTaskMaxParticipants(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Règle d'attribution</label>
                      <select
                        value={newLocalTaskSelectionMode}
                        onChange={(e) => setNewLocalTaskSelectionMode(e.target.value as any)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="first_come">Premier arrivé, premier servi (direct)</option>
                        <option value="approval">Sur candidature (validation parentale)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Catégorie</label>
                      <select
                        value={newLocalTaskCategory}
                        onChange={(e) => setNewLocalTaskCategory(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Ménage">Ménage 🧹</option>
                        <option value="Cuisine">Cuisine 🍳</option>
                        <option value="Jardinage">Jardinage 🌱</option>
                        <option value="Courses">Courses 🛒</option>
                        <option value="Bricolage">Bricolage 🔨</option>
                        <option value="Animaux">Animaux 🐾</option>
                        <option value="Divers">Divers 📦</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Difficulté</label>
                      <select
                        value={newLocalTaskDifficulty}
                        onChange={(e) => setNewLocalTaskDifficulty(e.target.value as any)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="easy">Facile 🟢</option>
                        <option value="medium">Moyenne 🟡</option>
                        <option value="hard">Difficile 🔴</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Durée estimée</label>
                      <input
                        type="text"
                        placeholder="ex: 30 min, 1h..."
                        value={newLocalTaskEstimatedTime}
                        onChange={(e) => setNewLocalTaskEstimatedTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">XP Récompensée</label>
                      <input
                        type="number"
                        value={newLocalTaskXpReward}
                        onChange={(e) => setNewLocalTaskXpReward(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">URL de l'image (optionnelle)</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={newLocalTaskImageUrl}
                        onChange={(e) => setNewLocalTaskImageUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center space-x-2 py-2">
                      <input
                        type="checkbox"
                        id="newLocalTaskIsDailySpecial"
                        checked={newLocalTaskIsDailySpecial}
                        onChange={(e) => setNewLocalTaskIsDailySpecial(e.target.checked)}
                        className="rounded bg-[#07111F] border-white/10 text-[#6C5CFF] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="newLocalTaskIsDailySpecial" className="text-xs font-bold text-white cursor-pointer select-none">
                        ⭐ Mettre en valeur comme "Mission du jour"
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Description / Instructions</label>
                    <textarea
                      placeholder="Détaillez les instructions pour cette tâche..."
                      value={newLocalTaskDescription}
                      onChange={(e) => setNewLocalTaskDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white focus:outline-none h-16 resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left font-medium">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Date limite</label>
                    <input
                      type="date"
                      value={newLocalTaskDueDate}
                      onChange={(e) => setNewLocalTaskDueDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Heure limite</label>
                    <input
                      type="time"
                      value={newLocalTaskTime}
                      onChange={(e) => setNewLocalTaskTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Priorité</label>
                    <select
                      value={newLocalTaskPriority}
                      onChange={(e) => setNewLocalTaskPriority(e.target.value as any)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute / Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Validation requise</label>
                    <select
                      value={newLocalTaskValidationRequired ? 'true' : 'false'}
                      onChange={(e) => setNewLocalTaskValidationRequired(e.target.value === 'true')}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="true">Oui (Parent vérifie)</option>
                      <option value="false">Non (Validation auto)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-left font-medium">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Points récompensés</label>
                    <input
                      type="number"
                      value={newLocalTaskPoints}
                      onChange={(e) => setNewLocalTaskPoints(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Récompense (€ - Cash)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="ex: 5.00"
                      value={newLocalTaskRewardAmount}
                      onChange={(e) => setNewLocalTaskRewardAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Périodicité</label>
                    <select
                      value={newLocalTaskRotation}
                      onChange={(e) => setNewLocalTaskRotation(e.target.value as any)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="none">Unique / Ponctuelle</option>
                      <option value="daily">Quotidienne</option>
                      <option value="weekly">Hebdomadaire</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#6C5CFF]/20"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Créer la mission</span>
                </button>
              </form>
            )}

            {/* Gamified Parent Validation Alert */}
            {isParent && getPermission('taches', 'valider') && tasksToValidate.length > 0 && (
              <div className="p-4 rounded-[28px] bg-[#FFB020]/10 border border-[#FFB020]/20 space-y-3 text-left">
                <div className="flex items-center space-x-2 text-[#FFB020]">
                  <Sparkles className="w-5 h-5 text-[#FFB020]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">En attente de validation parentale</h4>
                </div>
                <div className="space-y-2 text-left">
                  {tasksToValidate.map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-white">{task.title}</p>
                        <p className="text-[10px] text-white/50">Effectué par {task.assignedMemberName} (+{task.rewardPoints} Pts)</p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleRefuseTask(task.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#FF4D6D] text-white text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                        >
                          Refuser
                        </button>
                        <button 
                          onClick={() => onValidateTask(task.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#00D26A] text-white text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                        >
                          Valider (+{formatMoney(task.rewardPoints / 10)})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex space-x-2 border-b border-white/5 pb-2 text-left items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setChoresActiveSubTab('actives');
                  setChoreHistoryFilter('all');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  choresActiveSubTab === 'actives' 
                    ? 'bg-[#6C5CFF] text-white shadow-md' 
                    : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}
              >
                Missions Actives ({activeParsedTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setChoresActiveSubTab('historique')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  choresActiveSubTab === 'historique' 
                    ? 'bg-[#6C5CFF] text-white shadow-md' 
                    : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}
              >
                Historique & Filtres ({archivedParsedTasks.length})
              </button>
            </div>

            {/* History filters */}
            {choresActiveSubTab === 'historique' && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-white/5 rounded-2xl border border-white/5 text-left animate-slide-down">
                {[
                  { id: 'all', label: 'Toutes les Archivées' },
                  { id: 'wall', label: 'Missions ouvertes' },
                  { id: 'accepted', label: 'Missions Acceptées / En cours' },
                  { id: 'validated', label: 'Missions Validées' },
                  { id: 'refused', label: 'Missions Refusées' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setChoreHistoryFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      choreHistoryFilter === f.id
                        ? 'bg-[#6C5CFF] text-white shadow-sm'
                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tasks List */}
            <div className="space-y-3 text-left">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1 text-left">
                {choresActiveSubTab === 'actives' ? 'Tableau de répartition' : `Missions : ${
                  choreHistoryFilter === 'wall' ? 'Ouvertes' :
                  choreHistoryFilter === 'accepted' ? 'Acceptées / En cours' :
                  choreHistoryFilter === 'validated' ? 'Validées' :
                  choreHistoryFilter === 'refused' ? 'Refusées' : 'Toutes les Archivées'
                }`}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  const filteredTasks = parsedChores.filter(t => {
                    if (choresActiveSubTab === 'actives') {
                      return !t.isArchived;
                    } else {
                      switch (choreHistoryFilter) {
                        case 'wall':
                          return t.attributionMode === 'wall' && !t.isArchived;
                        case 'accepted':
                          return t.id.startsWith('tk-vol-') && !t.validatedByParent;
                        case 'validated':
                          return t.status === 'validated' || t.validatedByParent;
                        case 'refused':
                          return t.status === 'refused';
                        case 'all':
                        default:
                          return t.isArchived;
                      }
                    }
                  });

                  return filteredTasks.map((task) => {
                    if (editingTaskId === task.id) {
                      return (
                        <div 
                          key={task.id}
                          className="glass-panel rounded-[28px] p-4 border border-[#6C5CFF]/30 bg-[#6C5CFF]/5 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest block">Titre de la tâche</label>
                            <input
                              type="text"
                              value={editTaskTitle}
                              onChange={(e) => setEditTaskTitle(e.target.value)}
                              className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                              placeholder="Faire la vaisselle..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest block mb-1">Points</label>
                              <input
                                type="number"
                                value={editTaskPoints}
                                onChange={(e) => setEditTaskPoints(parseInt(e.target.value) || 0)}
                                className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest block mb-1">Périodicité</label>
                              <select
                                value={editTaskRotation}
                                onChange={(e) => setEditTaskRotation(e.target.value as any)}
                                className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                              >
                                <option value="daily">Quotidienne</option>
                                <option value="weekly">Hebdomadaire</option>
                                <option value="none">Ponctuelle</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest block mb-1">Assigné à</label>
                            <select
                              value={editTaskAssigneeId}
                              onChange={(e) => setEditTaskAssigneeId(e.target.value)}
                              className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                            >
                              {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const assignee = members.find(m => m.id === editTaskAssigneeId);
                                const originalTask = tasks.find(t => t.id === task.id);
                                const originalMeta = parseChoreTitle(originalTask?.title || '');
                                const updatedMeta = {
                                  ...originalMeta,
                                  title: editTaskTitle,
                                  recurrence: editTaskRotation
                                };
                                const serialized = serializeChoreTitle(updatedMeta);

                                onEditTask(
                                  task.id,
                                  serialized,
                                  editTaskPoints,
                                  editTaskRotation,
                                  editTaskAssigneeId,
                                  assignee ? assignee.name : 'Général'
                                );
                                setEditingTaskId(null);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#6C5CFF] text-white text-[10px] font-bold hover:bg-[#5849E0] transition-all cursor-pointer shadow-md"
                            >
                              Sauver
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const isWallTask = task.attributionMode === 'wall';
                    const hasImage = isWallTask && task.imageUrl;

                    return (
                      <div 
                        key={task.id}
                        className={`glass-panel rounded-[28px] p-4 border flex flex-col justify-between min-h-[160px] h-auto transition-all relative group text-left ${
                          task.status === 'validated' || task.validatedByParent 
                            ? 'border-[#00D26A]/30 bg-[#00D26A]/5 opacity-70' 
                            : task.status === 'pending_validation'
                              ? 'border-[#FFB020]/30 bg-[#FFB020]/5' 
                              : task.status === 'refused'
                                ? 'border-[#FF4D6D]/30 bg-[#FF4D6D]/5'
                                : isWallTask
                                  ? 'border-[#6C5CFF]/30 bg-[#161B30]/40'
                                  : 'border-white/8'
                        }`}
                      >
                        {/* Parent Hover/Group Quick Edit/Delete Actions */}
                        {isParent && choresActiveSubTab === 'actives' && (getPermission('taches', 'modifier') || getPermission('taches', 'supprimer')) && (
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 z-20">
                            {getPermission('taches', 'modifier') && !isWallTask && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTaskId(task.id);
                                  setEditTaskTitle(task.title);
                                  setEditTaskPoints(task.rewardPoints);
                                  setEditTaskRotation(task.recurrence);
                                  setEditTaskAssigneeId(task.assignedMemberId);
                                }}
                                className="p-1.5 bg-white/5 hover:bg-[#6C5CFF]/20 border border-white/10 hover:border-[#6C5CFF]/30 text-white hover:text-[#9E94FF] rounded-lg transition active:scale-95 cursor-pointer"
                                title="Modifier la tâche"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                            {getPermission('taches', 'supprimer') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTask(task.id);
                                }}
                                className="p-1.5 bg-white/5 hover:bg-[#FF3B30]/25 border border-white/10 hover:border-[#FF3B30]/40 text-white hover:text-[#FF3B30] rounded-lg transition active:scale-95 cursor-pointer"
                                title="Supprimer la tâche"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-start justify-between space-x-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              {task.isDailySpecial && (
                                <span className="text-[8px] font-black text-white uppercase tracking-widest bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] px-2 py-0.5 rounded-lg border border-white/10">
                                  ⭐ Mission du jour
                                </span>
                              )}
                              <span className="text-[8px] font-extrabold text-[#6C5CFF] uppercase tracking-widest bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 px-2 py-0.5 rounded-lg">
                                {isWallTask ? 'Mission ouverte' : (task.recurrence === 'daily' ? 'Quotidienne' : task.recurrence === 'weekly' ? 'Hebdo' : 'Ponctuel')}
                              </span>
                              <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${
                                task.priority === 'high' 
                                  ? 'text-[#FF4D6D] bg-[#FF4D6D]/10 border border-[#FF4D6D]/20' 
                                  : task.priority === 'low' 
                                    ? 'text-white/40 bg-white/5 border border-white/5' 
                                    : 'text-[#9e94ff] bg-[#6C5CFF]/10 border border-[#6C5CFF]/10'
                              }`}>
                                {task.priority === 'high' ? 'Urgent' : task.priority === 'low' ? 'Priorité Basse' : 'Normal'}
                              </span>
                            </div>

                            {hasImage && (
                              <div className="w-full h-20 rounded-xl overflow-hidden my-1.5 border border-white/5 bg-white/5">
                                <img src={task.imageUrl} alt={task.title} className="w-full h-full object-cover" />
                              </div>
                            )}
                            
                            <h4 className={`text-xs sm:text-sm font-bold text-white mt-1 ${task.done && task.validatedByParent ? 'line-through text-white/40' : ''}`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{task.description}</p>
                            )}

                            {isWallTask && (
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-1 text-[9px] text-white/60 font-medium">
                                <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md flex items-center">📂 {task.category}</span>
                                <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md flex items-center">⚡ {task.difficulty === 'easy' ? 'Facile' : task.difficulty === 'hard' ? 'Difficile' : 'Moyen'}</span>
                                {task.estimatedTime && <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md flex items-center">⏱️ {task.estimatedTime}</span>}
                                {task.xpReward && <span className="bg-[#6C5CFF]/10 border border-[#6C5CFF]/10 text-[#9e94ff] px-1.5 py-0.5 rounded-md flex items-center">✨ +{task.xpReward} XP</span>}
                                <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md flex items-center">👥 {task.acceptedVolunteers?.length || 0} / {task.maxParticipants} pris</span>
                              </div>
                            )}

                            {task.status === 'refused' && (
                              <p className="text-[9px] text-[#FF4D6D] font-extrabold mt-1">❌ À corriger par l'enfant</p>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end shrink-0 space-y-1">
                            <span className="text-[10px] font-extrabold text-[#FFB020] bg-[#FFB020]/10 border border-[#FFB020]/20 px-2 py-0.5 rounded-lg mr-8 sm:mr-0">
                              +{task.rewardPoints} Pts
                            </span>
                            {task.rewardAmount ? (
                              <span className="text-[10px] font-extrabold text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-2 py-0.5 rounded-lg mr-8 sm:mr-0">
                                +{formatMoney(task.rewardAmount)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Candidates Approval block */}
                        {isParent && isWallTask && (task.candidates || []).length > 0 && (
                          <div className="mt-3 bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2 w-full text-left">
                            <p className="text-[9px] font-extrabold text-[#FFB020] uppercase tracking-wider">Candidatures en attente :</p>
                            <div className="space-y-1.5">
                              {(task.candidates || []).map((candidateId: string) => {
                                const cand = members.find(m => m.id === candidateId);
                                return (
                                  <div key={candidateId} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0 last:pb-0">
                                    <span className="font-bold text-white">{cand ? cand.name : 'Un enfant'}</span>
                                    <div className="flex space-x-1.5">
                                      <button
                                        type="button"
                                        onClick={() => onRefuseCandidate?.(task.id, candidateId)}
                                        className="px-2.5 py-1 rounded-xl bg-[#FF4D6D] text-white text-[9px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                                      >
                                        Refuser
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onAcceptCandidate?.(task.id, candidateId)}
                                        className="px-2.5 py-1 rounded-xl bg-[#00D26A] text-white text-[9px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                                      >
                                        Accepter
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                          <span className="text-[10px] text-white/50">
                            {isWallTask ? 'Attribution :' : 'Assigné :'} <strong className="text-white">{isWallTask ? 'Ouverte aux enfants' : task.assignedMemberName}</strong>
                          </span>
                          {task.status === 'validated' || task.validatedByParent ? (
                            <span className="text-[10px] font-bold text-[#00D26A] flex items-center space-x-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Validé</span>
                            </span>
                          ) : task.status === 'pending_validation' ? (
                            <div className="flex space-x-1.5">
                              <button 
                                onClick={() => handleRefuseTask(task.id)}
                                className="px-2.5 py-1 rounded-xl bg-[#FF4D6D] text-white text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer"
                              >
                                Refuser
                              </button>
                              <button 
                                onClick={() => onValidateTask(task.id)}
                                className="px-2.5 py-1 rounded-xl bg-[#00D26A] text-white text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer"
                              >
                                Valider
                              </button>
                            </div>
                          ) : task.status === 'refused' ? (
                            <span className="text-[10px] font-bold text-[#FF4D6D] italic">Refusé (correction)</span>
                          ) : !isWallTask && getPermission('taches', 'modifier') ? (
                            <button 
                              onClick={() => onToggleTask(task.id)}
                              className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white text-[10px] font-bold cursor-pointer"
                            >
                              Marquer fait
                            </button>
                          ) : isWallTask ? (
                            <span className="text-[10px] text-white/40 font-bold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5">Ouverte</span>
                          ) : (
                            <span className="text-[10px] text-white/30 italic">Non autorisé</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {(() => {
                const count = parsedChores.filter(t => {
                  if (choresActiveSubTab === 'actives') {
                    return !t.isArchived;
                  } else {
                    switch (choreHistoryFilter) {
                      case 'wall':
                        return t.attributionMode === 'wall' && !t.isArchived;
                      case 'accepted':
                        return t.id.startsWith('tk-vol-') && !t.validatedByParent;
                      case 'validated':
                        return t.status === 'validated' || t.validatedByParent;
                      case 'refused':
                        return t.status === 'refused';
                      case 'all':
                      default:
                        return t.isArchived;
                    }
                  }
                }).length;

                return count === 0 ? (
                  <p className="text-xs text-white/30 text-center py-8">Aucune mission dans cette liste.</p>
                ) : null;
              })()}
            </div>
          </div>
        );
      })()}

      {/* SUB-MODULE 5: École */}
      {activeModule === 'ecole' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Suivi Scolaire & Devoirs</h2>
            <p className="text-xs text-white/50">Emploi du temps, devoirs et bulletins</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
              <strong className="block text-lg font-black text-white">{schoolTasks.filter(task => !task.done).length}</strong>
              <span className="text-[9px] font-bold text-white/40">devoirs ouverts</span>
            </div>
            <div className="rounded-2xl border border-[#6C5CFF]/15 bg-[#6C5CFF]/5 p-3">
              <strong className="block text-lg font-black text-[#9E94FF]">{schedule.length}</strong>
              <span className="text-[9px] font-bold text-white/40">cours planifiés</span>
            </div>
            <div className="rounded-2xl border border-[#00D26A]/15 bg-[#00D26A]/5 p-3">
              <strong className="block text-lg font-black text-[#00D26A]">{grades.length}</strong>
              <span className="text-[9px] font-bold text-white/40">notes suivies</span>
            </div>
          </div>

          {/* School Schedule */}
          <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#6C5CFF]" />
              <span>Emploi du temps ({activeMember?.name || 'Famille'})</span>
            </h3>
            <div className="space-y-2">
              {schedule.filter(s => {
                return isParent ? true : s.studentId === activeMemberId;
              }).length > 0 ? (
                schedule
                  .filter(s => {
                    return isParent ? true : s.studentId === activeMemberId;
                  })
                  .slice(0, 4)
                  .map((course, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs">
                      <div>
                        <h4 className="font-bold text-white">{course.subject}</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">Élève: {course.studentName} {course.room ? `• ${course.room}` : ''}</p>
                      </div>
                      <span className="text-[10px] font-extrabold text-white/70 bg-white/5 px-2.5 py-1 rounded-[10px] border border-white/5 shrink-0">
                        {course.startTime} - {course.endTime}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-white/30 text-center py-6">Aucun cours planifié dans l'emploi du temps.</p>
              )}
            </div>
          </div>

          {/* School Grades summary */}
          <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dernières Notes</h3>
            <div className="space-y-2">
              {grades.filter(g => {
                return isParent ? true : g.studentId === activeMemberId;
              }).length > 0 ? (
                grades
                  .filter(g => {
                    return isParent ? true : g.studentId === activeMemberId;
                  })
                  .slice(0, 3)
                  .map((grade, idx) => {
                    const getStatus = (val: number, max: number) => {
                      const ratio = val / max;
                      if (ratio >= 0.8) return 'Excellent';
                      if (ratio >= 0.7) return 'Très Bien';
                      if (ratio >= 0.6) return 'Bien';
                      if (ratio >= 0.5) return 'Moyen';
                      return 'À travailler';
                    };
                    return (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0 text-xs">
                        <div>
                          <h4 className="font-bold text-white">{grade.subject} - {grade.examTitle}</h4>
                          <p className="text-[10px] text-white/40 mt-0.5">{grade.studentName}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#00D26A]">{grade.value} / {grade.max}</span>
                          <p className="text-[10px] text-white/40 mt-0.5">{getStatus(grade.value, grade.max)} • Coef {grade.coef}</p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-xs text-white/30 text-center py-6">Aucune note enregistrée dans le bulletin.</p>
              )}
            </div>
          </div>

          {/* Frais Scolaires & Scolarité */}
          {(() => {
            const handleAddSchoolFee = (e: React.FormEvent) => {
              e.preventDefault();
              const amt = parseFloat(newSchoolFeeAmount);
              if (isNaN(amt) || amt <= 0) return;

              if (onAddTransaction) {
                const targetMemberName = members.find(m => m.id === newSchoolFeeMemberId)?.name || 'Famille';
                onAddTransaction({
                  amount: amt,
                  type: 'expense',
                  category: 'Éducation',
                  subCategory: newSchoolFeeType,
                  title: `École : ${newSchoolFeeType} - ${targetMemberName}`,
                  memberId: newSchoolFeeMemberId,
                  memberName: targetMemberName,
                  date: new Date().toISOString().split('T')[0],
                  accountId: newSchoolFeeAccountId || null,
                  moduleSource: 'ecole',
                  recurrence: newSchoolFeeIsRecurring ? newSchoolFeeRecurrenceType : 'none',
                  recurrenceInterval: newSchoolFeeIsRecurring ? 1 : undefined,
                  startDate: newSchoolFeeIsRecurring ? new Date().toISOString().split('T')[0] : undefined,
                  nextOccurrence: newSchoolFeeIsRecurring ? new Date().toISOString().split('T')[0] : undefined
                });
              }

              setNewSchoolFeeAmount('');
              alert(`🎓 Frais de scolarité de ${amt.toFixed(2)}€ enregistrés !`);
            };

            return (
              <form onSubmit={handleAddSchoolFee} className="glass-panel border border-[#6C5CFF]/20 rounded-[28px] p-5 space-y-4 text-left">
                <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#6C5CFF]" />
                  <span>Enregistrer des frais scolaires 🎓</span>
                </span>

                <div className="grid grid-cols-2 gap-3 text-left font-medium">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Type de frais</label>
                    <select
                      value={newSchoolFeeType}
                      onChange={(e) => setNewSchoolFeeType(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Cantine">Cantine scolaire</option>
                      <option value="Fournitures">Fournitures / Manuels</option>
                      <option value="Activités">Sorties / Activités scolaires</option>
                      <option value="Cours">Cours particuliers / Soutien</option>
                      <option value="Autre">Autre frais d'études</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Montant (€)</label>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      placeholder="ex: 120"
                      value={newSchoolFeeAmount}
                      onChange={(e) => setNewSchoolFeeAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left font-medium">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Élève concerné</label>
                    <select
                      value={newSchoolFeeMemberId}
                      onChange={(e) => setNewSchoolFeeMemberId(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Compte de débit</label>
                    <select
                      value={newSchoolFeeAccountId}
                      onChange={(e) => setNewSchoolFeeAccountId(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">Sélectionner un compte...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toFixed(2)}€)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left font-medium">
                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      id="schoolFeeIsRecurring"
                      checked={newSchoolFeeIsRecurring}
                      onChange={(e) => setNewSchoolFeeIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded bg-white/5 border border-white/10 text-[#6C5CFF]"
                    />
                    <label htmlFor="schoolFeeIsRecurring" className="text-xs text-white font-bold cursor-pointer select-none">Frais récurrent ?</label>
                  </div>

                  {newSchoolFeeIsRecurring && (
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Fréquence de récurrence</label>
                      <select
                        value={newSchoolFeeRecurrenceType}
                        onChange={(e) => setNewSchoolFeeRecurrenceType(e.target.value as any)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="monthly">Chaque mois (Mensuel)</option>
                        <option value="quarterly">Chaque trimestre (Trimestriel)</option>
                        <option value="semiannually">Chaque semestre (Semestriel)</option>
                        <option value="yearly">Chaque année (Annuel)</option>
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#8B5CF6] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#6C5CFF]/20"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Enregistrer les frais d'école</span>
                </button>
              </form>
            );
          })()}

          {/* Interactive AI homework tutor & quizzes */}
          <div className="border-t border-white/5 pt-6">
            <TuteurScolaire 
              schoolTasks={schoolTasks} 
              setSchoolTasks={setSchoolTasks} 
              activeMemberId={activeMemberId} 
              members={members}
              isPremium={isPremium}
              onTriggerPaywall={onTriggerPaywall}
              grades={grades}
              setGrades={setGrades}
              schedule={schedule}
              setSchedule={setSchedule}
            />
          </div>
        </div>
      )}

      {/* OTHER SUB-MODULES (SECONDARY) */}
      {activeModule === 'vehicules' && !isLockedForChild && (
        <VehiclesModule
          vehicles={vehicles}
          setVehicles={setVehicles}
          accounts={accounts}
          transactions={transactions}
          isParent={isParent}
          onAddTransaction={onAddTransaction}
          onAddEventDirect={onAddEventDirect}
        />
      )}

      {/* 7. Logement */}
      {activeModule === 'logement' && !isLockedForChild && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Entretien Logement</h2>
            <p className="text-xs text-white/50">Maintenance, chaudière et interventions</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
              <strong className="block text-lg font-black text-white">{maintenance.length}</strong>
              <span className="text-[9px] font-bold text-white/40">interventions</span>
            </div>
            <div className="rounded-2xl border border-[#FFB020]/15 bg-[#FFB020]/5 p-3">
              <strong className="block text-lg font-black text-[#FFB020]">{maintenance.filter(item => item.status === 'scheduled').length}</strong>
              <span className="text-[9px] font-bold text-white/40">planifiées</span>
            </div>
            <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-3">
              <strong className="block text-lg font-black text-red-400">{maintenance.filter(item => item.status === 'urgent').length}</strong>
              <span className="text-[9px] font-bold text-white/40">urgentes</span>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setLogementViewMode('list'); setSelectedRoom(null); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${logementViewMode === 'list' ? 'bg-[#FFB020] text-black' : 'bg-white/5 text-white/50'}`}>
              📝 Vue Liste
            </button>
            <button type="button" onClick={() => setLogementViewMode('plan')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${logementViewMode === 'plan' ? 'bg-[#FFB020] text-black' : 'bg-white/5 text-white/50'}`}>
              🗺️ Carte Interactive
            </button>
            <button type="button" onClick={() => { setLogementViewMode('artisans'); setSelectedRoom(null); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${logementViewMode === 'artisans' ? 'bg-[#FFB020] text-black' : 'bg-white/5 text-white/50'}`}>
              👷 Artisans Partenaires
            </button>
            <button type="button" onClick={() => { setLogementViewMode('charges'); setSelectedRoom(null); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${logementViewMode === 'charges' ? 'bg-[#FFB020] text-black' : 'bg-white/5 text-white/50'}`}>
              ⚡ Charges & Loyers
            </button>
          </div>

          {logementViewMode === 'plan' && (
            <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Plan de la Maison</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Cuisine', emoji: '🍳', room: 'Cuisine' },
                  { name: 'Salon', emoji: '🛋️', room: 'Salon' },
                  { name: 'Garage', emoji: '🚗', room: 'Garage' },
                  { name: 'Chambre Parents', emoji: '🛏️', room: 'Chambre Parents' },
                  { name: 'Chambre Enfants', emoji: '👧', room: 'Chambre Enfants' },
                  { name: 'Jardin', emoji: '🌿', room: 'Jardin' },
                  { name: 'Salle de Bain', emoji: '🚿', room: 'Salle de Bain' },
                  { name: 'Buanderie', emoji: '🧺', room: 'Buanderie' },
                  { name: 'Entrée', emoji: '🚪', room: 'Entrée' }
                ].map(r => {
                  const roomTasks = maintenance.filter(m => m.title.toLowerCase().includes(r.room.toLowerCase()));
                  const hasPending = roomTasks.some(m => m.status === 'scheduled');
                  const color = hasPending ? '#FF4D6D' : roomTasks.length > 0 ? '#00D26A' : '#6C5CFF';
                  return (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() => setSelectedRoom(selectedRoom === r.room ? null : r.room)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer hover:scale-105 ${selectedRoom === r.room ? 'scale-105' : ''}`}
                      style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
                    >
                      <span className="text-2xl block">{r.emoji}</span>
                      <span className="text-[9px] font-bold text-white block mt-1">{r.name}</span>
                      <span className="text-[8px] font-bold block mt-0.5" style={{ color }}>
                        {hasPending ? '⚠️ Planifié' : roomTasks.length > 0 ? '✅ OK' : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedRoom && (
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest block">Interventions : {selectedRoom}</span>
                  {maintenance.filter(m => m.title.toLowerCase().includes(selectedRoom!.toLowerCase())).length > 0 ? (
                    maintenance.filter(m => m.title.toLowerCase().includes(selectedRoom!.toLowerCase())).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                        <div>
                          <span className="font-bold text-white">{m.title}</span>
                          <span className="text-white/40 block text-[10px]">{m.provider} • {m.date}</span>
                        </div>
                        <span className={`font-bold text-[10px] ${m.status === 'scheduled' ? 'text-[#FFB020]' : 'text-[#00D26A]'}`}>{m.status === 'scheduled' ? 'Planifié' : 'Effectué'}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-white/30 text-center py-4">Aucune intervention liée à cette pièce.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {logementViewMode === 'list' && (
            <>
              <div className="space-y-3">
                {maintenance.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 p-7 text-center">
                    <HomeIcon className="mx-auto mb-3 h-7 w-7 text-white/20" />
                    <p className="text-xs font-bold text-white/60">Aucune intervention enregistrée</p>
                    <p className="mt-1 text-[10px] text-white/35">Ajoutez un entretien prévu, un dépannage ou une réparation terminée.</p>
                  </div>
                )}
                {maintenance.map((m) => (
                  <div key={m.id} className="glass-panel rounded-[28px] border border-white/8 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-[#FFB020]/10 text-[#FFB020] border border-white/5">
                        <HomeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{m.title}</h4>
                        <p className="text-[10px] text-white/40 font-medium mt-0.5">Prestataire: {m.provider} • Date: {m.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wide ${
                          m.status === 'scheduled' 
                            ? 'bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020]' 
                            : 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]'
                        }`}>
                          {m.status === 'scheduled' ? 'Planifié' : 'Effectué'}
                        </span>
                        <p className="text-xs font-bold text-white mt-1.5">{formatMoney(m.cost)}</p>
                      </div>
                      {isParent && (
                        <div className="flex flex-col space-y-1">
                          <button 
                            type="button"
                            onClick={() => {
                              const newTitle = window.prompt("Modifier l'intervention :", m.title);
                              if (!newTitle) return;
                              const newProvider = window.prompt("Modifier le prestataire :", m.provider);
                              if (!newProvider) return;
                              const newCost = window.prompt("Modifier le coût :", String(m.cost));
                              if (newCost === null) return;
                              setMaintenance(prev => prev.map(item => item.id === m.id ? { ...item, title: newTitle, provider: newProvider, cost: Number(newCost) } : item));
                            }}
                            className="p-1 hover:bg-white/10 rounded text-[10px] text-white/60 font-bold"
                          >
                            ✏️
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (window.confirm("Supprimer cette intervention ?")) {
                                setMaintenance(prev => prev.filter(item => item.id !== m.id));
                              }
                            }}
                            className="p-1 hover:bg-red-500/10 rounded text-[10px] text-red-400 font-bold"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulaire d'ajout de Maintenance */}
              <form onSubmit={handleAddMaintenance} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
                <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest block flex items-center space-x-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#FFB020]" />
                  <span>Ajouter une intervention logement 🔧</span>
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5 text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Intitulé de l'Intervention</label>
                    <input 
                      type="text" 
                      required
                      placeholder="ex: Révision annuelle de la chaudière..."
                      value={newMaintTitle}
                      onChange={(e) => setNewMaintTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  </div>
                  
                  <div className="space-y-1.5 text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Prestataire / Artisan</label>
                    <input 
                      type="text" 
                      placeholder="ex: Engie Home Services..."
                      value={newMaintProvider}
                      onChange={(e) => setNewMaintProvider(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-left">
                  <div className="space-y-1.5 text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Coût (€)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="ex: 120"
                      value={newMaintCost}
                      onChange={(e) => setNewMaintCost(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  </div>
                  
                  <div className="space-y-1.5 text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date d'intervention</label>
                    <input 
                      type="date"
                      value={newMaintDate}
                      onChange={(e) => setNewMaintDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  </div>
                  
                  <div className="space-y-1.5 text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Statut</label>
                    <select
                      value={newMaintStatus}
                      onChange={(e) => setNewMaintStatus(e.target.value as any)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="scheduled">Planifié</option>
                      <option value="completed">Effectué</option>
                      <option value="urgent">Urgent 🚨</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FFB020]/20"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Enregistrer l'intervention</span>
                </button>
              </form>
            </>
          )}

          {logementViewMode === 'artisans' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="glass-panel border border-white/8 rounded-2xl p-3 flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Rechercher un artisan par nom ou spécialité..."
                  value={artisanSearchQuery}
                  onChange={(e) => setArtisanSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-0"
                />
              </div>

              {/* Artisans list */}
              <div className="space-y-3">
                {(artisans || [])
                  .filter((art: Artisan) => 
                    art.name.toLowerCase().includes(artisanSearchQuery.toLowerCase()) || 
                    art.specialty.toLowerCase().includes(artisanSearchQuery.toLowerCase())
                  )
                  .map((art: Artisan) => (
                    <div key={art.id} className="glass-panel rounded-[24px] border border-white/8 p-4 space-y-3 text-left">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">{art.name}</h4>
                          <span className="text-[9px] font-extrabold text-[#FFB020] bg-[#FFB020]/10 px-2 py-0.5 rounded-md mt-1 inline-block uppercase tracking-wider">{art.specialty}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: art.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-[#FFB020] fill-[#FFB020]" />
                          ))}
                          {Array.from({ length: 5 - art.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-white/20" />
                          ))}
                        </div>
                      </div>

                      {art.notes && (
                        <p className="text-[11px] text-white/60 italic bg-white/5 p-2 rounded-xl border border-white/5">{art.notes}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center space-x-2">
                          {art.phone && (
                            <a 
                              href={`tel:${art.phone}`}
                              className="p-2 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] hover:bg-[#00D26A]/20 transition flex items-center space-x-1.5 text-[10px] font-extrabold"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Appeler</span>
                            </a>
                          )}
                          {art.email && (
                            <a 
                              href={`mailto:${art.email}`}
                              className="p-2 rounded-xl bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 text-[#4F8CFF] hover:bg-[#4F8CFF]/20 transition flex items-center space-x-1.5 text-[10px] font-extrabold"
                            >
                              <Mail className="w-3 h-3" />
                              <span>E-mail</span>
                            </a>
                          )}
                        </div>

                        {isParent && (
                          <button 
                            type="button"
                            onClick={() => {
                              if (window.confirm("Supprimer cet artisan de l'annuaire ?")) {
                                if (setArtisans) {
                                  setArtisans((prev: Artisan[]) => prev.filter((a: Artisan) => a.id !== art.id));
                                }
                              }
                            }}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition text-[10px] font-bold"
                          >
                            🗑️ Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add Artisan Form */}
              {isParent && (
                <form onSubmit={handleAddArtisan} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
                  <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest block flex items-center space-x-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#FFB020]" />
                    <span>Ajouter un Artisan Partenaire 👷</span>
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-sans font-medium">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nom de l'Artisan / Entreprise</label>
                      <input 
                        type="text" 
                        required
                        placeholder="ex: Jean Depannage..."
                        value={newArtisanName}
                        onChange={(e) => setNewArtisanName(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Spécialité</label>
                      <select
                        value={newArtisanSpecialty}
                        onChange={(e) => setNewArtisanSpecialty(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Plomberie">Plomberie 🚰</option>
                        <option value="Électricité">Électricité ⚡</option>
                        <option value="Chauffage / Gaz">Chauffage / Gaz 🔥</option>
                        <option value="Serrurerie">Serrurerie 🔑</option>
                        <option value="Peinture / Rénovation">Peinture / Rénovation 🎨</option>
                        <option value="Jardinage">Jardinage 🌿</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-left font-sans font-medium">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Téléphone</label>
                      <input 
                        type="text" 
                        placeholder="ex: +33 6 12 34 56 78"
                        value={newArtisanPhone}
                        onChange={(e) => setNewArtisanPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Note (Étoiles)</label>
                      <select
                        value={newArtisanRating}
                        onChange={(e) => setNewArtisanRating(Number(e.target.value))}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="5">⭐⭐⭐⭐⭐</option>
                        <option value="4">⭐⭐⭐⭐</option>
                        <option value="3">⭐⭐⭐</option>
                        <option value="2">⭐⭐</option>
                        <option value="1">⭐</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left font-medium font-sans">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Adresse E-mail</label>
                    <input 
                      type="email" 
                      placeholder="ex: contact@jeandepannage.fr"
                      value={newArtisanEmail}
                      onChange={(e) => setNewArtisanEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  </div>

                  <div className="space-y-1.5 text-left font-medium font-sans">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Notes / Commentaires</label>
                    <textarea 
                      placeholder="Indiquez les horaires, tarifs moyens ou retours d'expérience..."
                      value={newArtisanNotes}
                      onChange={(e) => setNewArtisanNotes(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020] min-h-[60px]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FFB020] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FFB020]/20"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Enregistrer l'Artisan</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {logementViewMode === 'charges' && (
            <div className="space-y-4">
              {/* Formulaire ajout charge/facture */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = parseFloat(newLogChargeAmount);
                  if (isNaN(amt) || amt <= 0) return;

                  if (onAddTransaction) {
                    onAddTransaction({
                      amount: amt,
                      type: 'expense',
                      category: 'Logement',
                      subCategory: newLogChargeType,
                      title: `Logement : ${newLogChargeType}`,
                      date: new Date().toISOString().split('T')[0],
                      accountId: newLogChargeAccountId || null,
                      moduleSource: 'logement',
                      recurrence: newLogChargeIsRecurring ? newLogChargeRecurrenceType : 'none',
                      recurrenceInterval: newLogChargeIsRecurring ? 1 : undefined,
                      startDate: newLogChargeIsRecurring ? new Date().toISOString().split('T')[0] : undefined,
                      nextOccurrence: newLogChargeIsRecurring ? new Date().toISOString().split('T')[0] : undefined
                    });
                  }

                  setNewLogChargeAmount('');
                  alert(`⚡ Facture/charge de ${amt.toFixed(2)}€ enregistrée !`);
                }} 
                className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 text-left"
              >
                <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest block flex items-center space-x-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#FFB020]" />
                  <span>Enregistrer une facture ou charge de logement 🏠</span>
                </span>

                <div className="grid grid-cols-2 gap-3 text-left font-medium">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Type de charge</label>
                    <select
                      value={newLogChargeType}
                      onChange={(e) => setNewLogChargeType(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Loyer">Loyer / Mensualité crédit</option>
                      <option value="Électricité">Électricité (EDF/Engie)</option>
                      <option value="Eau">Eau courante</option>
                      <option value="Internet">Internet / Téléphone box</option>
                      <option value="Assurance">Assurance Logement</option>
                      <option value="Autre">Autre charge / Taxe</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Montant (€)</label>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      placeholder="ex: 150"
                      value={newLogChargeAmount}
                      onChange={(e) => setNewLogChargeAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left font-medium">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Compte de débit</label>
                    <select
                      value={newLogChargeAccountId}
                      onChange={(e) => setNewLogChargeAccountId(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">Sélectionner un compte...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toFixed(2)}€)</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      id="logChargeIsRecurring"
                      checked={newLogChargeIsRecurring}
                      onChange={(e) => setNewLogChargeIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded bg-white/5 border border-white/10 text-[#FFB020]"
                    />
                    <label htmlFor="logChargeIsRecurring" className="text-xs text-white font-bold cursor-pointer select-none">Paiement récurrent ?</label>
                  </div>
                </div>

                {newLogChargeIsRecurring && (
                  <div className="text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Fréquence de récurrence</label>
                    <select
                      value={newLogChargeRecurrenceType}
                      onChange={(e) => setNewLogChargeRecurrenceType(e.target.value as any)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="daily">Chaque jour (Quotidien)</option>
                      <option value="weekly">Chaque semaine (Hebdomadaire)</option>
                      <option value="monthly">Chaque mois (Mensuel)</option>
                      <option value="quarterly">Chaque trimestre (Trimestriel)</option>
                      <option value="semiannually">Chaque semestre (Semestriel)</option>
                      <option value="yearly">Chaque année (Annuel)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FFB020]/20"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Enregistrer la facture / charge</span>
                </button>
              </form>

              {/* Liste des charges enregistrées */}
              <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Charges Logement Récentes</h3>
                <div className="space-y-2">
                  {(transactions || [])
                    .filter(t => t.category === 'Logement' && t.moduleSource === 'logement')
                    .slice(0, 5)
                    .map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/3 border border-white/5 text-xs">
                        <div>
                          <p className="font-bold text-white">{tx.title}</p>
                          <p className="text-[10px] text-white/40">{tx.date} {tx.recurrence !== 'none' && `• Récurrent (${tx.recurrence})`}</p>
                        </div>
                        <span className="font-extrabold text-red-400">-{tx.amount.toFixed(2)}€</span>
                      </div>
                    ))}
                  {(transactions || []).filter(t => t.category === 'Logement' && t.moduleSource === 'logement').length === 0 && (
                    <p className="text-[10px] text-white/30 text-center py-4">Aucune facture enregistrée pour le moment.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. Voyages */}
      {activeModule === 'voyages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div>
              <h2 className="text-lg font-extrabold text-white">Carnet de Voyages</h2>
              <p className="text-xs text-white/50">Listes de bagages et réservations</p>
            </div>
            <button
              onClick={() => setShowArchivedTrips(prev => !prev)}
              className="px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-bold text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              {showArchivedTrips ? "📁 Voir les voyages actifs" : "📦 Voir les voyages archivés"}
            </button>
          </div>

          {trips.filter(t => showArchivedTrips ? archivedTripIds.includes(t.id) : !archivedTripIds.includes(t.id)).map((t) => (
            <div key={t.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#FF4D6D]/10 text-[#FF4D6D] border border-white/5">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.destination}</h3>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Dates: {t.startDate} - {t.endDate}</span>
                      {(() => {
                        const dur = getTripDuration(t.startDate, t.endDate);
                        return dur && (
                          <span className="px-1.5 py-0.5 text-[8px] font-extrabold rounded bg-[#FF4D6D]/15 text-[#FF4D6D] uppercase tracking-wider">
                            {dur}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#FF4D6D] bg-[#FF4D6D]/10 px-3 py-1 rounded-xl">
                    Budget: {formatMoney(t.budget)}
                  </span>
                  {isParent && (
                    <div className="flex space-x-1 bg-white/5 p-1 rounded-xl border border-white/5">
                      <button 
                        type="button"
                        onClick={() => toggleArchiveTrip(t.id)}
                        className="p-1 hover:bg-white/10 rounded text-[10px] font-bold"
                        title={archivedTripIds.includes(t.id) ? "Désarchiver" : "Archiver"}
                      >
                        {archivedTripIds.includes(t.id) ? "📁" : "📦"}
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const newDest = window.prompt("Modifier la destination :", t.destination);
                          if (!newDest) return;
                          const newBudget = window.prompt("Modifier le budget (€) :", String(t.budget));
                          if (newBudget === null) return;
                          
                          setTrips(prev => prev.map(item => item.id === t.id ? { ...item, destination: newDest, budget: Number(newBudget) } : item));
                          
                          const client = getSupabaseClient();
                          if (client) {
                            client.from('trips').update({ destination: newDest, budget: Number(newBudget) }).eq('id', t.id).then(({ error }) => {
                              if (error) console.error("Error updating trip in Supabase:", error);
                            });
                          }
                        }}
                        className="p-1 hover:bg-white/10 rounded text-[10px] font-bold"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (window.confirm("Voulez-vous supprimer ce projet de voyage ?")) {
                            const deleteExpenses = window.confirm(
                              "Voulez-vous également SUPPRIMER toutes les dépenses liées à ce voyage ?\n\n(Cliquez sur 'Annuler' pour CONSERVER les dépenses en retirant simplement leur lien avec ce voyage)"
                            );
                            
                            setTrips(prev => prev.filter(item => item.id !== t.id));
                            
                            const client = getSupabaseClient();
                            if (client) {
                              client.from('trips').delete().eq('id', t.id).then(({ error }) => {
                                if (error) console.error("Error deleting trip in Supabase:", error);
                              });
                            }
                            
                            if (setTransactions) {
                              if (deleteExpenses) {
                                setTransactions(prev => prev.filter(tx => tx.travel_id !== t.id && tx.travelId !== t.id));
                                if (client) {
                                  client.from('transactions').delete().eq('travel_id', t.id).then(({ error }) => {
                                    if (error) console.error("Error deleting trip transactions in Supabase:", error);
                                  });
                                }
                              } else {
                                setTransactions(prev => prev.map(tx => {
                                  if (tx.travel_id === t.id || tx.travelId === t.id) {
                                    const cleanedComment = tx.comment ? tx.comment.replace(/__METADATA__:.*$/, '').trim() : '';
                                    return { ...tx, travel_id: undefined, travelId: undefined, comment: cleanedComment };
                                  }
                                  return tx;
                                }));
                                if (client) {
                                  client.from('transactions').select('*').eq('travel_id', t.id).then(({ data }) => {
                                    if (data) {
                                      data.forEach(async (row: any) => {
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
                          }
                        }}
                        className="p-1 hover:bg-red-500/10 rounded text-[10px] text-red-400 font-bold"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Suivi Financier du Voyage */}
              {(() => {
                const tripExpenses = (transactions || []).filter(tx => 
                  tx.type === 'expense' && 
                  (tx.travelId === t.id || tx.travel_id === t.id)
                );
                const totalTripSpent = tripExpenses.reduce((sum, tx) => sum + tx.amount, 0);
                const matchingGoal = goals?.find(g => 
                  g.title.toLowerCase().includes(t.destination.toLowerCase()) || 
                  t.destination.toLowerCase().includes(g.title.toLowerCase())
                );
                const remainingBudget = t.budget - totalTripSpent;
                const spendPct = Math.min(100, Math.round((totalTripSpent / t.budget) * 100)) || 0;
                
                const handleAddVoyageExpense = (e: React.FormEvent) => {
                  e.preventDefault();
                  const amt = parseFloat(newVoyageExpenseAmount);
                  if (isNaN(amt) || amt <= 0) return;

                  let deducedSub = 'Repas';
                  if (newVoyageExpenseType === 'Billet') deducedSub = 'Billets';
                  else if (newVoyageExpenseType === 'Hôtel' || newVoyageExpenseType === 'Réservation') deducedSub = 'Hôtel';
                  else if (newVoyageExpenseType === 'Activité') deducedSub = 'Activités';
                  else if (newVoyageExpenseType === 'Dépense') deducedSub = 'Transport';

                  const detailSuffix = newVoyageExpenseDescription.trim() ? ` - ${newVoyageExpenseDescription.trim()}` : '';
                  const txTitle = `Voyage ${t.destination} : ${newVoyageExpenseType}${detailSuffix}`;

                  if (onAddTransaction) {
                    onAddTransaction({
                      amount: amt,
                      type: 'expense',
                      category: 'Voyages',
                      subCategory: deducedSub,
                      title: txTitle,
                      date: new Date().toISOString().split('T')[0],
                      accountId: newVoyageExpenseAccountId || null,
                      moduleSource: 'voyages',
                      comment: `Dépense voyage liée à la destination ${t.destination}`,
                      travelId: t.id,
                      travel_id: t.id
                    });
                  }

                  setNewVoyageExpenseAmount('');
                  setNewVoyageExpenseDescription('');
                  alert(`✈️ Dépense de voyage de ${amt.toFixed(2)}€ enregistrée pour ${t.destination} !`);
                };

                return (
                  <div className="space-y-4 p-4 rounded-2xl bg-white/3 border border-white/5 text-left font-sans">
                    <span className="text-[9px] font-black text-[#FF4D6D] uppercase tracking-widest block">Suivi Budget & Cagnotte Voyage 📈</span>
                    
                    {/* Columns Prévu / Réel / Reste */}
                    <div className="grid grid-cols-3 gap-3 border-b border-white/5 pb-3">
                      <div className="space-y-0.5 text-center">
                        <span className="text-[9px] font-bold text-white/40 uppercase block">Budget Prévu</span>
                        <span className="text-sm font-black text-white">{t.budget.toFixed(1)}€</span>
                      </div>
                      <div className="space-y-0.5 text-center border-l border-white/5">
                        <span className="text-[9px] font-bold text-white/40 uppercase block">Dépenses Réelles</span>
                        <span className="text-sm font-black text-rose-400">{totalTripSpent.toFixed(1)}€</span>
                      </div>
                      <div className="space-y-0.5 text-center border-l border-white/5">
                        <span className="text-[9px] font-bold text-white/40 uppercase block">Reste disponible</span>
                        <span className={`text-sm font-black ${remainingBudget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {remainingBudget.toFixed(1)}€
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Expenses */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-white/70">
                        <span>Consommation du budget</span>
                        <span>{spendPct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${spendPct >= 90 ? 'bg-red-500' : spendPct >= 75 ? 'bg-yellow-500' : 'bg-[#FF4D6D]'}`}
                          style={{ width: `${spendPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Progress Bar Savings Goal (if matches) */}
                    {matchingGoal ? (
                      <div className="space-y-1 pt-1 border-t border-white/5">
                        <div className="flex justify-between text-xs font-bold text-white">
                          <span>Cagnotte liée : {matchingGoal.title}</span>
                          <span>{matchingGoal.currentAmount}€ / {matchingGoal.targetAmount}€ ({Math.round(matchingGoal.currentAmount / matchingGoal.targetAmount * 100)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className="h-full bg-[#6C5CFF] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round(matchingGoal.currentAmount / matchingGoal.targetAmount * 100))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[9px] text-white/30 italic">Aucune cagnotte d'épargne détectée pour "{t.destination}".</p>
                    )}

                    {/* Detailed List of Voyage Expenses */}
                    {tripExpenses.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-white/5">
                        <span className="text-[9px] font-bold text-white/30 uppercase block">Détail des dépenses réelles :</span>
                        <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                          {tripExpenses.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-[10px] text-white/80 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                              <div>
                                <span className="font-bold block">{tx.title}</span>
                                <span className="text-[8px] text-white/40">{tx.date} • {tx.subCategory || 'Divers'}</span>
                              </div>
                              <span className="font-extrabold text-rose-300">-{tx.amount.toFixed(2)}€</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formulaire ajout dépense voyage */}
                    <form onSubmit={handleAddVoyageExpense} className="space-y-2 pt-2 border-t border-white/5 font-sans font-medium">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newVoyageExpenseType}
                          onChange={(e) => setNewVoyageExpenseType(e.target.value)}
                          className="bg-[#07111F] border border-white/8 rounded-xl px-2 py-1.5 text-[10px] text-white focus:outline-none"
                        >
                          <option value="Dépense">+ Dépense</option>
                          <option value="Réservation">+ Réservation</option>
                          <option value="Billet">+ Billet</option>
                          <option value="Hôtel">+ Hôtel</option>
                          <option value="Activité">+ Activité</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Description (ex: Vol Paris)"
                          value={newVoyageExpenseDescription}
                          onChange={(e) => setNewVoyageExpenseDescription(e.target.value)}
                          className="bg-white/5 border border-white/8 rounded-xl px-2 py-1.5 text-[10px] text-white placeholder-white/30 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          required
                          step="0.01"
                          placeholder="Montant (€)"
                          value={newVoyageExpenseAmount}
                          onChange={(e) => setNewVoyageExpenseAmount(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/8 rounded-xl px-2 py-1 text-[10px] text-white placeholder-white/30 focus:outline-none"
                        />

                        <select
                          value={newVoyageExpenseAccountId}
                          onChange={(e) => setNewVoyageExpenseAccountId(e.target.value)}
                          className="bg-[#07111F] border border-white/8 rounded-xl px-2 py-1 text-[10px] text-white focus:outline-none max-w-[100px]"
                        >
                          <option value="">Compte...</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-xl bg-[#FF4D6D] hover:bg-[#ff3356] text-[10px] text-white font-bold transition cursor-pointer"
                        >
                          Ajouter
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}

              {/* Widget Météo Local */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/15 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {t.destination.toLowerCase().includes('dakar') || t.destination.toLowerCase().includes('rome') || t.destination.toLowerCase().includes('marseille') ? '☀️' : '⛅'}
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Météo Locale Prévue</p>
                    <h4 className="text-xs font-bold text-white">
                      {t.destination.toLowerCase().includes('dakar') ? 'Dakar • Soleil éclatant' : t.destination.toLowerCase().includes('rome') ? 'Rome • Temps Radieux' : t.destination.toLowerCase().includes('marseille') ? 'Marseille • Grand Soleil' : `${t.destination} • Partiellement Nuageux`}
                    </h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-white">
                    {t.destination.toLowerCase().includes('dakar') ? '31°C' : t.destination.toLowerCase().includes('rome') ? '27°C' : t.destination.toLowerCase().includes('marseille') ? '28°C' : '20°C'}
                  </span>
                </div>
              </div>

              {/* Reservations lists */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Réservations (Statuts)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {parseBookingRefs(t.bookingRefs).map((item) => {
                    const statusMeta = bookingStatusLabels[item.status] || bookingStatusLabels.non_defini;
                    return (
                      <div key={item.type} className="flex items-center justify-between p-2.5 rounded-xl bg-[#07111F] border border-white/5 text-white">
                        <div className="space-y-1">
                          <span className="font-bold block text-[10px] text-white/80">{item.label}</span>
                          <span className={`inline-flex items-center space-x-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${statusMeta.color}`}>
                            <span>{statusMeta.icon}</span>
                            <span>{statusMeta.label}</span>
                          </span>
                        </div>
                        
                        <select
                          value={item.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as any;
                            const currentItems = parseBookingRefs(t.bookingRefs);
                            const updatedItems = currentItems.map(b => b.type === item.type ? { ...b, status: newStatus } : b);
                            const newRefs = updatedItems.map(b => `${b.type}:${b.status}`);
                            
                            setTrips(prev => prev.map(trip => trip.id === t.id ? { ...trip, bookingRefs: newRefs } : trip));
                            
                            const client = getSupabaseClient();
                            if (client) {
                              client.from('trips').update({ booking_refs: newRefs }).eq('id', t.id).then(({ error }) => {
                                if (error) console.error("Error updating trip booking status in Supabase:", error);
                              });
                            }
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-[#FF4D6D] cursor-pointer"
                        >
                          <option value="non_defini" className="bg-[#07111F] text-white">⚪ Non défini</option>
                          <option value="prevu" className="bg-[#07111F] text-white">🟡 Prévu</option>
                          <option value="reserve" className="bg-[#07111F] text-white">🔵 Réservé</option>
                          <option value="paye" className="bg-[#07111F] text-white">🟢 Payé</option>
                          <option value="annule" className="bg-[#07111F] text-white">🔴 Annulé</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-2">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Checklist Voyage</p>
                <div className="space-y-1.5">
                  {t.checklist.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        const updatedChecklist = t.checklist.map(c => c.id === item.id ? { ...c, done: !c.done } : c);
                        setTrips(prev => prev.map(trip => trip.id === t.id ? { ...trip, checklist: updatedChecklist } : trip));
                      }}
                      className="flex items-center space-x-2 text-xs cursor-pointer select-none py-1 hover:bg-white/5 px-2 rounded-lg transition"
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                        item.done ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                      }`}>
                        ✓
                      </span>
                      <span className={`${item.done ? 'line-through text-white/40' : 'text-white'}`}>{item.text}</span>
                    </div>
                  ))}
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem('newItem') as HTMLInputElement;
                    const text = input.value.trim();
                    if (!text) return;
                    const updatedChecklist = [...t.checklist, { id: `chk-${Date.now()}-${Math.random()}`, text, done: false }];
                    setTrips(prev => prev.map(trip => trip.id === t.id ? { ...trip, checklist: updatedChecklist } : trip));
                    input.value = '';
                  }}
                  className="flex items-center space-x-2 mt-2"
                >
                  <input 
                    name="newItem"
                    placeholder="Ajouter une tâche à emporter..." 
                    className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 text-[11px] text-white placeholder-white/30 focus:outline-none"
                  />
                  <button 
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] text-white font-bold transition shrink-0"
                  >
                    Ajouter
                  </button>
                </form>
              </div>
            </div>
          ))}

          {/* Formulaire d'ajout de Voyage */}
          {isParent && (
            <form onSubmit={handleAddTrip} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 my-6">
              <span className="text-[10px] font-bold text-[#FF4D6D] uppercase tracking-widest block flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 text-[#FF4D6D]" />
                <span>Ajouter un nouveau voyage ✈️</span>
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="space-y-1.5 text-left font-medium font-sans">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Destination</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: Séjour à Rome..."
                    value={newTripDest}
                    onChange={(e) => setNewTripDest(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
                
                <div className="space-y-1.5 text-left font-medium font-sans">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Budget Total (€)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="ex: 1500"
                    value={newTripBudget}
                    onChange={(e) => setNewTripBudget(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1.5 text-left font-medium font-sans">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date de Départ</label>
                  <input 
                    type="date" 
                    required
                    value={newTripStart}
                    onChange={(e) => setNewTripStart(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D] [color-scheme:dark]"
                  />
                </div>
                
                <div className="space-y-1.5 text-left font-medium font-sans">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date de Retour</label>
                  <input 
                    type="date" 
                    required
                    value={newTripEnd}
                    onChange={(e) => setNewTripEnd(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D] [color-scheme:dark]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FF4D6D]/20"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Enregistrer le voyage</span>
              </button>
            </form>
          )}

          {/* AI custom packing checklists generator */}
          <div className="border-t border-white/5 pt-6">
            <VoyageIA 
              trips={trips} 
              members={members}
              formatMoney={formatMoney} 
              isPremium={isPremium}
              onTriggerPaywall={onTriggerPaywall}
            />
          </div>
        </div>
      )}

      {/* 9. Animaux */}
      {activeModule === 'animaux' && (
        <PetsModule
          pets={pets}
          setPets={setPets}
          documents={documents}
          accounts={accounts}
          isParent={isParent}
          onAddTransaction={onAddTransaction}
          onAddEventDirect={onAddEventDirect}
        />
      )}

      {activeModule === 'argent' && (() => {
        // Find selected child or default to first child
        const foyerKids = members.filter(m => {
          return !['Chef de famille', 'Gestionnaire', 'admin', 'parent', 'Parent'].includes(m.role) && m.id !== '1' && m.id !== '2';
        });

        const selectedKid = foyerKids.find(k => k.id === pmSelectedChildId) || foyerKids[0];
        const pmChild = selectedKid ? pocketMoney.find(c => c.id === selectedKid.id) : null;
        const resolvedChild = selectedKid ? {
          id: selectedKid.id,
          name: selectedKid.name,
          balance: pmChild?.balance || 0,
          points: pmChild?.points || 0,
          avatar: selectedKid.photoUrl || pmChild?.avatar || '',
          shields: pmChild?.shields !== undefined ? pmChild.shields : 3,
          streak: pmChild?.streak !== undefined ? pmChild.streak : 0,
          goalTitle: pmChild?.goalTitle || '',
          goalAmount: pmChild?.goalAmount,
          goalType: pmChild?.goalType || 'money',
          rules: pmChild?.rules || []
        } : null;

        const getAge = (birthDate?: string) => {
          if (!birthDate) return 'Âge N/A';
          const birth = new Date(birthDate);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return `${age} ans`;
        };

        const getChildStreak = (childId: string) => {
          const completedTasks = tasks.filter(t => t.assignedMemberId === childId && t.done);
          const storedStreak = localStorage.getItem(`mf_kid_streak_${childId}`);
          if (storedStreak) return parseInt(storedStreak, 10);
          return Math.min(7, completedTasks.length);
        };

        const mapSavingGoalToReward = (sg: SavingGoal) => {
          let icon = '🎁';
          let costPoints = (sg.targetAmount !== undefined && sg.targetAmount !== null) ? sg.targetAmount : 50;
          let costMoney = Math.round(costPoints / 10);
          let category = 'Cadeau';
          let avail = true;
          const validationRequired = true;
          const modifiable = true;
          const supprimable = true;
          
          if (sg.contributions && sg.contributions.length > 0) {
            const meta = sg.contributions[0] as any;
            if (meta.icon) icon = meta.icon;
            if (meta.costPoints !== undefined) costPoints = meta.costPoints;
            if (meta.costMoney !== undefined) costMoney = meta.costMoney;
            if (meta.subCategory) category = meta.subCategory;
            if (meta.avail !== undefined) avail = meta.avail;
          }
          
          return {
            id: sg.id,
            title: sg.title,
            costPoints,
            costMoney,
            icon,
            category,
            avail,
            validationRequired,
            modifiable,
            supprimable
          };
        };

        const dbRewards = (goals || [])
          .filter(sg => sg.category === 'boutique_reward')
          .map(mapSavingGoalToReward);

        const rewardsList = dbRewards.length > 0 ? dbRewards : [
          { id: 'rew-1', title: '30 min console', costPoints: 50, costMoney: 5, icon: '🎮', category: 'Écran', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-2', title: '1h console', costPoints: 100, costMoney: 10, icon: '🎮', category: 'Écran', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-3', title: 'Choisir le menu du soir', costPoints: 20, costMoney: 2, icon: '🍽️', category: 'Privilège', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-4', title: 'Pizza maison', costPoints: 30, costMoney: 3, icon: '🍕', category: 'Repas', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-5', title: 'Glace', costPoints: 15, costMoney: 1.5, icon: '🍦', category: 'Gourmandise', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-6', title: 'Bonbons', costPoints: 10, costMoney: 1, icon: '🍬', category: 'Gourmandise', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-7', title: 'Cinéma en famille', costPoints: 150, costMoney: 15, icon: '🍿', category: 'Sortie', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-8', title: 'Piscine', costPoints: 80, costMoney: 8, icon: '🏊', category: 'Sortie', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-9', title: 'Bowling', costPoints: 100, costMoney: 10, icon: '🎳', category: 'Sortie', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-10', title: 'Inviter un ami', costPoints: 40, costMoney: 4, icon: '👥', category: 'Privilège', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-11', title: 'Veillée +30 min', costPoints: 30, costMoney: 3, icon: '⏰', category: 'Privilège', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-12', title: 'Choisir le film familial', costPoints: 20, costMoney: 2, icon: '🎬', category: 'Privilège', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-13', title: 'Livre', costPoints: 60, costMoney: 6, icon: '📚', category: 'Cadeau', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-14', title: 'Jouet', costPoints: 120, costMoney: 12, icon: '🧸', category: 'Cadeau', avail: true, validationRequired: true, modifiable: true, supprimable: true },
          { id: 'rew-15', title: 'Carte cadeau', costPoints: 200, costMoney: 20, icon: '💳', category: 'Cadeau', avail: true, validationRequired: true, modifiable: true, supprimable: true }
        ];

        // Quick adjust handler
        const handleApplyDirectAdjustment = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!resolvedChild || !adjustmentAmount) return;
          const amt = parseFloat(adjustmentAmount);
          if (isNaN(amt) || amt <= 0) return;

          let newBalance = resolvedChild.balance;
          let newPoints = resolvedChild.points;
          const isAdd = adjustmentType === 'add';

          if (adjustmentAsset === 'money') {
            newBalance = isAdd ? newBalance + amt : Math.max(0, newBalance - amt);
          } else {
            newPoints = isAdd ? newPoints + Math.round(amt) : Math.max(0, newPoints - Math.round(amt));
          }

          setPocketMoney(prev => prev.map(c => c.id === resolvedChild.id ? { ...c, balance: newBalance, points: newPoints } : c));

          const reasonText = adjustmentReason.trim() || (isAdd ? 'Ajustement positif' : 'Ajustement négatif');
          const parentAccountId = adjustmentAccountId || accounts.find(a => a.type === 'bank')?.id || accounts[0]?.id || null;

          if (adjustmentAsset === 'money' && onAddTransaction) {
            onAddTransaction({
              amount: amt,
              type: isAdd ? 'expense' : 'income',
              category: 'Argent de Poche',
              date: new Date().toISOString().split('T')[0],
              title: `${isAdd ? 'Crédit' : 'Débit'} tirelire : ${reasonText}`,
              memberName: resolvedChild.name,
              accountId: isAdd ? parentAccountId : null
            });
          } else if (onAddTransaction) {
            onAddTransaction({
              amount: 0,
              type: isAdd ? 'income' : 'expense',
              category: 'Argent de Poche',
              date: new Date().toISOString().split('T')[0],
              title: `${isAdd ? 'Attribution' : 'Retrait'} de points : ${reasonText} (${isAdd ? '+' : '-'}${Math.round(amt)} pts)`,
              memberName: resolvedChild.name
            });
          }

          let isSynced = false;
          let isDemoMode = true;

          setIsAdjusting(true);
          try {
            const client = getSupabaseClient();
            if (client && foyer && foyer.id !== 'foyer-simulated') {
              isDemoMode = false;
              const { error } = await client.from('pocket_money')
                .update({ balance: newBalance, points: newPoints })
                .eq('id', resolvedChild.id)
                .eq('foyer_id', foyer.id);
              if (!error) {
                isSynced = true;
              } else {
                console.error("Direct adjustment Supabase error:", error);
              }
            }
          } catch (err) {
            console.error("Direct adjustment error:", err);
          } finally {
            setIsAdjusting(false);
          }

          setAdjustmentAmount('');
          setAdjustmentReason('');
          setShowQuickForm(false);

          if (isDemoMode) {
            alert(`Ajustement appliqué localement pour ${resolvedChild.name} (mode démonstration).`);
          } else if (isSynced) {
            alert(`✅ Ajustement appliqué et synchronisé avec succès pour ${resolvedChild.name} !`);
          } else {
            alert(`⚠️ L'ajustement a été appliqué localement pour ${resolvedChild.name}, mais la synchronisation avec le serveur a échoué. Veuillez vérifier votre connexion.`);
          }
        };

        // Automatic Rules Save handler
        const handleSaveChildRules = async (childId: string, updatedRules: PocketMoneyRule[]) => {
          setPocketMoney(prev => prev.map(c => c.id === childId ? { ...c, rules: updatedRules } : c));
          const child = pocketMoney.find(c => c.id === childId);
          if (!child) return;

          const serialized = serializePocketMoneyTitle({
            goalTitle: child.goalTitle || '',
            goalType: child.goalType || 'money',
            rules: updatedRules
          });

          try {
            const client = getSupabaseClient();
            if (client && foyer) {
              await client.from('pocket_money')
                .update({ goal_title: serialized })
                .eq('id', childId)
                .eq('foyer_id', foyer.id);
              alert("Règles automatiques enregistrées avec succès !");
            }
          } catch (err) {
            console.error("Error saving rules:", err);
          }
        };

        // Goal setter handler
        const handleSaveGoal = async (childId: string, title: string, amount: number, type: 'points' | 'money') => {
          setPocketMoney(prev => prev.map(c => c.id === childId ? { 
            ...c, 
            goalTitle: title, 
            goalAmount: amount, 
            goalType: type 
          } : c));

          const child = pocketMoney.find(c => c.id === childId);
          if (!child) return;

          const serialized = serializePocketMoneyTitle({
            goalTitle: title,
            goalType: type,
            rules: child.rules || []
          });

          try {
            const client = getSupabaseClient();
            if (client && foyer) {
              await client.from('pocket_money')
                .update({ 
                  goal_title: serialized, 
                  goal_amount: amount 
                })
                .eq('id', childId)
                .eq('foyer_id', foyer.id);
              alert("Objectif de cagnotte mis à jour !");
            }
          } catch (err) {
            console.error("Error updating child savings goal:", err);
          }
        };

        // Approve boutique request
        const handleApproveBoutiqueRequest = async (alertItem: NotificationAlert, childId: string, rewardId: string, paymentMethod: string) => {
          let meta: any = null;
          const desc = alertItem.description || '';
          if (desc.startsWith('__METADATA__:') && desc.includes('__DESCRIPTION__:')) {
            try {
              const idx = desc.indexOf('__DESCRIPTION__:');
              const jsonStr = desc.substring('__METADATA__:'.length, idx);
              meta = JSON.parse(jsonStr);
            } catch (e) {
              console.error("Failed to parse alert metadata in approval:", e);
            }
          }

          const resolvedChildId = meta ? meta.child_id : childId;
          const resolvedRewardId = meta ? meta.reward_id : rewardId;
          const resolvedPaymentMethod = meta ? meta.payment_type : paymentMethod;

           let child = pocketMoney.find(c => c.id === resolvedChildId);
          if (!child) {
            const memberObj = members.find(m => m.id === resolvedChildId);
            if (memberObj) {
              const tempChildRecord = {
                id: resolvedChildId,
                name: memberObj.name,
                balance: 0,
                points: 0,
                avatar: memberObj.photoUrl || ''
              };
              child = tempChildRecord;
              // Save to Supabase on-the-fly
              try {
                const client = getSupabaseClient();
                if (client && foyer) {
                  await client.from('pocket_money').insert({
                    id: resolvedChildId,
                    foyer_id: foyer.id,
                    name: tempChildRecord.name,
                    balance: 0,
                    points: 0,
                    avatar: tempChildRecord.avatar
                  });
                }
              } catch (err) {
                console.error("Error creating pocket money row on the fly:", err);
              }
            }
          }
          if (!child) return;

          let reward: any = rewardsList.find(r => r.id === resolvedRewardId);
          if (!reward && meta) {
            reward = {
              id: meta.reward_id,
              title: meta.reward_title,
              costPoints: meta.reward_price_points,
              costMoney: meta.reward_price_money,
              icon: meta.reward_emoji || '🎁',
              category: meta.reward_category,
              avail: true
            } as any;
          }
          if (!reward) {
            reward = {
              id: resolvedRewardId,
              title: alertItem.title.replace("Achat Ado : ", "").replace("Achat Enfant : ", "").replace("Demande de récompense : ", ""),
              costPoints: resolvedPaymentMethod === 'points' ? 50 : 0,
              costMoney: resolvedPaymentMethod === 'money' ? 5 : 0,
              icon: '🎁',
              category: 'Cadeau',
              avail: true
            } as any;
          }

          const cost = resolvedPaymentMethod === 'points' ? reward.costPoints : reward.costMoney;
          
          if (resolvedPaymentMethod === 'points') {
            if (child.points < cost) {
              alert(`Solde insuffisant : ${child.name} a ${child.points} Pts, mais le cadeau coûte ${cost} Pts.`);
              return;
            }
          } else {
            if (child.balance < cost) {
              alert(`Solde insuffisant : ${child.name} a ${formatMoney(child.balance)}, mais le cadeau coûte ${formatMoney(cost)}.`);
              return;
            }
          }

          const updatedPoints = resolvedPaymentMethod === 'points' ? child.points - cost : child.points;
          const updatedBalance = resolvedPaymentMethod === 'money' ? child.balance - cost : child.balance;

           setPocketMoney(prev => {
            const exists = prev.some(c => c.id === resolvedChildId);
            if (exists) {
              return prev.map(c => c.id === resolvedChildId ? { ...c, points: updatedPoints, balance: updatedBalance } : c);
            } else {
              return [...prev, { ...child!, points: updatedPoints, balance: updatedBalance }];
            }
          });

          if (onAddTransaction) {
            onAddTransaction({
              amount: resolvedPaymentMethod === 'money' ? cost : 0,
              type: 'expense',
              category: 'Argent de Poche',
              date: new Date().toISOString().split('T')[0],
              title: `Achat boutique validé (${resolvedPaymentMethod === 'points' ? 'Points' : 'Cash'}) : ${reward.title}`,
              memberName: child.name
            });
          }

          if (setAlerts) {
            setAlerts(prev => prev.filter(a => a.id !== alertItem.id));
          }

          try {
            const client = getSupabaseClient();
            if (client) {
              await client.from('alerts').delete().eq('id', alertItem.id);
              await client.from('pocket_money')
                .update({ points: updatedPoints, balance: updatedBalance })
                .eq('id', resolvedChildId);
            }
          } catch (err) {
            console.error("Error approving request:", err);
          }

          alert(`🎉 Achat "${reward.title}" approuvé pour ${child.name} !`);
        };

        // Refuse alert
        const handleRefuseRequest = async (alertId: string) => {
          if (setAlerts) {
            setAlerts(prev => prev.filter(a => a.id !== alertId));
          }
          try {
            const client = getSupabaseClient();
            if (client) {
              await client.from('alerts').delete().eq('id', alertId);
            }
          } catch (err) {
            console.error("Error deleting alert:", err);
          }
          alert("Demande refusée.");
        };

        const handleCancelRecurringTransfer = async (txId: string) => {
          if (window.confirm("Voulez-vous annuler ce versement récurrent ?")) {
            if (setTransactions) {
              setTransactions(prev => prev.filter(t => t.id !== txId));
            }
            try {
              const client = getSupabaseClient();
              if (client && foyer) {
                await client.from('transactions').delete().eq('id', txId).eq('foyer_id', foyer.id);
              }
            } catch (err) {
              console.error("Failed to delete recurring transfer:", err);
            }
          }
        };

        // Create boutique item
        const handleCreateBoutiqueItem = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!newBoutiqueTitle.trim() || newBoutiqueCostPoints < 0 || newBoutiqueCostMoney < 0 || !setSavingGoals) return;

          const newGoal: SavingGoal = {
            id: `sg-rew-${Date.now()}`,
            title: newBoutiqueTitle.trim(),
            targetAmount: newBoutiqueCostPoints,
            currentAmount: 0,
            targetDate: '',
            category: 'boutique_reward',
            contributions: [
              {
                costPoints: newBoutiqueCostPoints,
                costMoney: newBoutiqueCostMoney,
                icon: newBoutiqueIcon,
                subCategory: newBoutiqueSubCategory,
                avail: newBoutiqueAvail
              } as any
            ]
          };

          setSavingGoals(prev => [...prev, newGoal]);

          try {
            const client = getSupabaseClient();
            if (client && foyer) {
              await client.from('saving_goals').insert({
                id: newGoal.id,
                foyer_id: foyer.id,
                title: newGoal.title,
                target_amount: newGoal.targetAmount,
                current_amount: newGoal.currentAmount,
                target_date: newGoal.targetDate,
                category: newGoal.category,
                contributions: newGoal.contributions
              });
            }
          } catch (err) {
            console.error("Error creating boutique reward:", err);
          }

          setNewBoutiqueTitle('');
          setNewBoutiqueCostPoints(50);
          setNewBoutiqueCostMoney(5);
          setNewBoutiqueIcon('🎁');
          setNewBoutiqueSubCategory('Cadeau');
          setNewBoutiqueAvail(true);
          alert("Récompense ajoutée à la boutique !");
        };

        // Toggle reward availability
        const handleToggleRewardAvailability = async (goalId: string, currentAvail: boolean) => {
          if (!setSavingGoals) return;
          
          setSavingGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            const firstCont = g.contributions?.[0] as any || {};
            return {
              ...g,
              contributions: [
                {
                  ...firstCont,
                  avail: !currentAvail
                } as any
              ]
            };
          }));

          try {
            const client = getSupabaseClient();
            if (client && foyer) {
              const goal = goals.find(g => g.id === goalId);
              if (goal) {
                const firstCont = goal.contributions?.[0] as any || {};
                const updatedContributions = [
                  {
                    ...firstCont,
                    avail: !currentAvail
                  }
                ];
                await client.from('saving_goals')
                  .update({ contributions: updatedContributions })
                  .eq('id', goalId)
                  .eq('foyer_id', foyer.id);
              }
            }
          } catch (err) {
            console.error("Error updating boutique reward availability:", err);
          }
        };

        const handleDeleteBoutiqueItem = async (goalId: string) => {
          if (!setSavingGoals) return;
          if (window.confirm("Voulez-vous supprimer cette récompense de la boutique ?")) {
            setSavingGoals(prev => prev.filter(g => g.id !== goalId));
            try {
              const client = getSupabaseClient();
              if (client && foyer) {
                await client.from('saving_goals').delete().eq('id', goalId).eq('foyer_id', foyer.id);
              }
            } catch (err) {
              console.error("Error deleting boutique item:", err);
            }
          }
        };

        const handleCreateMalusTemplate = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!newMalusTitle.trim() || !foyer) return;

          const newTemplate = {
            id: `malus_temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            foyer_id: foyer.id,
            title: newMalusTitle.trim(),
            emoji: newMalusEmoji,
            category: newMalusCategory,
            stars_removed: newMalusStarsRemoved,
            xp_removed: newMalusXpRemoved,
            loss_streak: newMalusLossStreak,
            loss_shield: newMalusLossShield,
            comment_required: newMalusCommentRequired,
            double_parent_validation: newMalusDoubleParentValidation
          };

          setMalusTemplates(prev => [...prev, {
            id: newTemplate.id,
            foyerId: newTemplate.foyer_id,
            title: newTemplate.title,
            emoji: newTemplate.emoji,
            category: newTemplate.category,
            starsRemoved: newTemplate.stars_removed,
            xpRemoved: newTemplate.xp_removed,
            lossStreak: newTemplate.loss_streak,
            lossShield: newTemplate.loss_shield,
            commentRequired: newTemplate.comment_required,
            doubleParentValidation: newTemplate.double_parent_validation
          }]);

          try {
            const client = getSupabaseClient();
            if (client) {
              await client.from('malus_templates').insert(newTemplate);
            }
          } catch (err) {
            console.error("Error creating malus template:", err);
          }

          setNewMalusTitle('');
          setNewMalusEmoji('⚠️');
          setNewMalusCategory('Comportement');
          setNewMalusStarsRemoved(5);
          setNewMalusXpRemoved(10);
          setNewMalusLossStreak(false);
          setNewMalusLossShield(true);
          setNewMalusCommentRequired(false);
          setNewMalusDoubleParentValidation(false);
          alert("Modèle de malus créé avec succès ! ✨");
        };

        const handleSaveEditedMalus = async (templateId: string) => {
          if (!editMalusTitle.trim() || !foyer) return;

          setMalusTemplates(prev => prev.map(m => m.id === templateId ? {
            ...m,
            title: editMalusTitle.trim(),
            emoji: editMalusEmoji,
            category: editMalusCategory,
            starsRemoved: editMalusStarsRemoved,
            xpRemoved: editMalusXpRemoved,
            lossStreak: editMalusLossStreak,
            lossShield: editMalusLossShield,
            commentRequired: editMalusCommentRequired,
            doubleParentValidation: editMalusDoubleParentValidation
          } : m));

          try {
            const client = getSupabaseClient();
            if (client) {
              await client.from('malus_templates').update({
                title: editMalusTitle.trim(),
                emoji: editMalusEmoji,
                category: editMalusCategory,
                stars_removed: editMalusStarsRemoved,
                xp_removed: editMalusXpRemoved,
                loss_streak: editMalusLossStreak,
                loss_shield: editMalusLossShield,
                comment_required: editMalusCommentRequired,
                double_parent_validation: editMalusDoubleParentValidation
              }).eq('id', templateId);
            }
          } catch (err) {
            console.error("Error updating malus template:", err);
          }

          setEditingMalusId(null);
          alert("Modèle de malus mis à jour ! ✨");
        };

        const handleDeleteMalusTemplate = async (templateId: string) => {
          if (window.confirm("Voulez-vous vraiment supprimer ce modèle de malus ?")) {
            setMalusTemplates(prev => prev.filter(m => m.id !== templateId));
            try {
              const client = getSupabaseClient();
              if (client) {
                await client.from('malus_templates').delete().eq('id', templateId);
              }
            } catch (err) {
              console.error("Error deleting malus template:", err);
            }
          }
        };

        const handleApplyMalusToChild = async (e: React.FormEvent, childId: string) => {
          e.preventDefault();
          if (!selectedMalusTemplateId || !foyer) return;

          const template = malusTemplates.find(t => t.id === selectedMalusTemplateId);
          if (!template) return;

          const child = pocketMoney.find(c => c.id === childId);
          if (!child) return;

          if (template.commentRequired && !applyMalusComment.trim()) {
            alert("Un commentaire est obligatoire pour ce type de malus.");
            return;
          }

          const maxMalusPerDay = foyer.malusSettings?.max_malus_per_day || 3;
          const todayStr = new Date().toISOString().split('T')[0];
          const todaysMaluses = appliedMaluses.filter(m => 
            m.memberId === childId && 
            m.createdAt.split('T')[0] === todayStr
          );
          if (todaysMaluses.length >= maxMalusPerDay) {
            alert(`Limite journalière atteinte : cet enfant a déjà reçu ${todaysMaluses.length} malus aujourd'hui.`);
            return;
          }

          const shieldEnabled = foyer.malusSettings?.shields_enabled !== false;
          const childHasShields = (child.shields || 0) > 0;
          const shieldWillBeUsed = shieldEnabled && useShieldForMalus && childHasShields && template.lossShield;

          let finalStarsRemoved = template.starsRemoved;
          let finalXpRemoved = template.xpRemoved;
          let finalLossStreak = template.lossStreak;
          let newShieldsCount = child.shields || 0;

          if (shieldWillBeUsed) {
            finalStarsRemoved = 0;
            finalXpRemoved = 0;
            finalLossStreak = false;
            newShieldsCount = Math.max(0, newShieldsCount - 1);
          }

          const appliedObj = {
            id: `malus_app_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            foyer_id: foyer.id,
            member_id: childId,
            title: template.title,
            emoji: template.emoji,
            description: template.description || '',
            stars_removed: finalStarsRemoved,
            xp_removed: finalXpRemoved,
            loss_streak: finalLossStreak,
            loss_shield: template.lossShield,
            comment: applyMalusComment.trim(),
            shield_used: shieldWillBeUsed,
            repaired: false,
            repaired_at: null,
            reparation_task_id: null,
            created_at: new Date().toISOString()
          };

          setAppliedMaluses(prev => [{
            id: appliedObj.id,
            foyerId: appliedObj.foyer_id,
            memberId: appliedObj.member_id,
            title: appliedObj.title,
            emoji: appliedObj.emoji,
            description: appliedObj.description,
            starsRemoved: appliedObj.stars_removed,
            xpRemoved: appliedObj.xp_removed,
            lossStreak: appliedObj.loss_streak,
            lossShield: appliedObj.loss_shield,
            comment: appliedObj.comment,
            shieldUsed: appliedObj.shield_used,
            repaired: appliedObj.repaired,
            reparationTaskId: '',
            createdAt: appliedObj.created_at
          }, ...prev]);

          const updatedPoints = Math.max(0, child.points - finalStarsRemoved);
          const updatedStreak = finalLossStreak ? 0 : (child.streak || 0);

          setPocketMoney(prev => prev.map(c => c.id === childId ? {
            ...c,
            points: updatedPoints,
            shields: newShieldsCount,
            streak: updatedStreak
          } : c));

          try {
            const client = getSupabaseClient();
            if (client) {
              await client.from('malus_applied').insert(appliedObj);
              await client.from('pocket_money').update({
                points: updatedPoints,
                shields: newShieldsCount,
                streak: updatedStreak
              }).eq('id', childId);

              if (onAddTransaction) {
                onAddTransaction({
                  amount: 0,
                  type: 'expense',
                  category: 'Argent de Poche',
                  date: todayStr,
                  title: `Malus appliqué : ${template.emoji} ${template.title}${shieldWillBeUsed ? ' (Bouclier consommé 🛡️)' : ` (-${finalStarsRemoved} Pts)`}`,
                  memberName: child.name,
                  comment: applyMalusComment.trim()
                });
              }
            }
          } catch (err) {
            console.error("Error applying malus:", err);
          }

          if (onSendNotification && appliedObj.stars_removed > 0) {
            onSendNotification(
              `⚠️ Info comportement`,
              `${child.name} a reçu un malus "${template.title}" (-${finalStarsRemoved} étoiles).`,
              'taches',
              'warning'
            );
          }

          setSelectedMalusTemplateId(null);
          setApplyMalusComment('');
          setUseShieldForMalus(false);
          alert(shieldWillBeUsed ? "Malus bloqué par le bouclier de l'enfant ! 🛡️" : "Malus appliqué avec succès !");
        };

        const handleLinkReparationTask = async (e: React.FormEvent, malusId: string) => {
          e.preventDefault();
          if (!reparationTaskTitle.trim() || !foyer) return;

          const malus = appliedMaluses.find(m => m.id === malusId);
          if (!malus) return;

          const taskId = `task-rep-${Date.now()}`;
          const newChore = {
            id: taskId,
            foyer_id: foyer.id,
            title: serializeChoreTitle({
              title: `🔧 Rattrapage : ${reparationTaskTitle.trim()}`,
              status: 'todo',
              attributionMode: 'wall',
              isArchived: false
            }),
            description: `Mission de rattrapage pour réparer le malus "${malus.title}". Une fois cette tâche validée, tu récupères tes étoiles perdues ! 💪`,
            reward_points: 0,
            reward_amount: 0,
            assigned_member_id: malus.memberId,
            assigned_member_name: members.find(m => m.id === malus.memberId)?.name || 'Enfant',
            done: false,
            validated_by_parent: false,
            difficulty: 'medium',
            category: 'Rattrapage',
            created_at_text: new Date().toLocaleDateString('fr-FR')
          };

          if (setTasks) {
            setTasks(prev => [{
              id: newChore.id,
              title: newChore.title,
              description: newChore.description,
              rewardPoints: 0,
              rewardAmount: 0,
              assignedMemberId: newChore.assigned_member_id,
              assignedMemberName: newChore.assigned_member_name,
              done: false,
              rotation: 'none',
              validatedByParent: false,
              dueDate: '',
              difficulty: 'medium',
              category: 'Rattrapage'
            }, ...prev]);
          }

          setAppliedMaluses(prev => prev.map(m => m.id === malusId ? {
            ...m,
            reparationTaskId: taskId
          } : m));

          try {
            const client = getSupabaseClient();
            if (client) {
              await client.from('chore_tasks').insert(newChore);
              await client.from('malus_applied').update({
                reparation_task_id: taskId
              }).eq('id', malusId);
            }
          } catch (err) {
            console.error("Error creating reparation task:", err);
          }

          setLinkingMalusId(null);
          setReparationTaskTitle('');
          alert("Mission de rattrapage créée et assignée à l'enfant ! 💪");
        };

        if (foyerKids.length === 0) {
          return (
            <div className="glass-panel rounded-[28px] border border-white/8 p-8 text-center space-y-2">
              <span className="text-3xl block">🪙</span>
              <p className="text-sm font-bold text-white">Aucun enfant trouvé</p>
              <p className="text-xs text-white/50 leading-relaxed font-bold">Pour utiliser le module argent de poche, vous devez d'abord ajouter des membres enfants à votre foyer.</p>
            </div>
          );
        }

        const pendingRequests = alerts.filter(a => {
          if (a.senderMemberId !== resolvedChild?.id) return false;
          return a.id.startsWith('req-rew-') || a.id.startsWith('sug-rew-');
        });

        const activeRulesCount = ((resolvedChild?.rules || []) as PocketMoneyRule[]).filter(r => r.active).length;
        const missionStreak = resolvedChild ? getChildStreak(resolvedChild.id) : 0;
        const childTransactions = transactions.filter(t => 
          (t.category === 'Argent de poche' || t.category === 'Argent de Poche') && 
          (t.memberName === resolvedChild?.name || t.memberId === resolvedChild?.id)
        );

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-white">Argent de Poche</h2>
              <p className="text-xs text-white/50">Missions rémunérées, règles automatiques et cagnottes des enfants</p>
            </div>

            {/* Carousel of Children Cards */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Sélectionnez un enfant :</label>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {foyerKids.map(k => {
                  const pmChild = pocketMoney.find(c => c.id === k.id) || { balance: 0, points: 0 };
                  const isSelected = resolvedChild?.id === k.id;
                  const childAge = getAge(k.birthDate);
                  return (
                    <button
                      type="button"
                      key={k.id}
                      onClick={() => setPmSelectedChildId(k.id)}
                      className={`flex-shrink-0 flex items-center space-x-3 p-3.5 rounded-[22px] border-2 text-left font-bold transition-all cursor-pointer relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-gradient-to-br from-[#6C5CFF]/15 to-[#00D26A]/15 border-[#6C5CFF] text-white shadow-md' 
                          : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/8'
                      }`}
                      style={{ minWidth: '220px' }}
                    >
                      <MemberAvatar name={k.name} photoUrl={k.photoUrl} className="w-10 h-10 rounded-full border border-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate font-extrabold text-white">{k.name}</p>
                        <p className="text-[9px] text-white/40 truncate">{childAge} • {k.schoolOrEmployer || 'Classe N/A'}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-black text-[#00D26A]">{formatMoney(pmChild.balance || 0)}</span>
                          <span className="text-[10px] font-black text-[#6C5CFF]">⭐ {pmChild.points || 0} pts</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {resolvedChild && (
              <div className="space-y-6 animate-fade-in">
                {/* Pocket Money Sub-Tabs Switcher */}
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white/5 border border-white/8 p-1">
                  {[
                    { id: 'finance', label: '💶 Soldes & Règles' },
                    { id: 'boutique', label: '🎁 Boutique Cadeaux' },
                    { id: 'karma', label: '🛡️ Confiance & rattrapage' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPmSubTab(tab.id as typeof pmSubTab)}
                      className={`py-2.5 rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer ${
                        pmSubTab === tab.id
                          ? 'bg-[#6C5CFF] text-white shadow-md shadow-[#6C5CFF]/20 font-black'
                          : 'text-white/45 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 6-Card Dashboard Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 text-center space-y-1">
                    <span className="text-xl">🌟</span>
                    <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wide">Points Dispo</span>
                    <p className="text-base font-black text-[#6C5CFF]">{resolvedChild.points}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 text-center space-y-1">
                    <span className="text-xl">💰</span>
                    <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wide">Argent Dispo</span>
                    <p className="text-base font-black text-[#00D26A]">{formatMoney(resolvedChild.balance)}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 text-center space-y-1">
                    <span className="text-xl">🛡️</span>
                    <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wide">Boucliers</span>
                    <p className="text-base font-black text-[#00D26A]">{resolvedChild.shields !== undefined ? resolvedChild.shields : 3}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 text-center space-y-1">
                    <span className="text-xl">🛒</span>
                    <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wide">En Attente</span>
                    <p className={`text-base font-black ${pendingRequests.length > 0 ? 'text-amber-500' : 'text-white'}`}>{pendingRequests.length}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 text-center space-y-1">
                    <span className="text-xl">📅</span>
                    <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wide">Règles Auto</span>
                    <p className="text-base font-black text-white">{activeRulesCount}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 text-center space-y-1">
                    <span className="text-xl">🔥</span>
                    <span className="text-[9px] font-bold text-white/40 block uppercase tracking-wide">Série</span>
                    <p className="text-base font-black text-[#FFB020]">{resolvedChild.streak !== undefined ? resolvedChild.streak : missionStreak} j</p>
                  </div>
                </div>

                {/* Sub-Tab 1: Finance */}
                {pmSubTab === 'finance' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Quick actions buttons */}
                    <div className="space-y-3">
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustmentType('add');
                            setAdjustmentAsset('points');
                            setShowQuickForm(prev => prev && adjustmentAsset === 'points' && adjustmentType === 'add' ? false : true);
                          }}
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-[#6C5CFF] to-[#6C5CFF]/70 text-white font-extrabold text-xs rounded-2xl shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <span>⭐ Ajuster les étoiles</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustmentType('add');
                            setAdjustmentAsset('money');
                            setShowQuickForm(prev => prev && adjustmentAsset === 'money' && adjustmentType === 'add' ? false : true);
                          }}
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-[#00D26A] to-[#00D26A]/70 text-white font-extrabold text-xs rounded-2xl shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <span>💶 Ajuster l'argent</span>
                        </button>
                      </div>

                      {/* Collapsible Adjustment Form */}
                      {showQuickForm && (
                        <form onSubmit={handleApplyDirectAdjustment} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 text-left font-sans">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Ajustement rapide</span>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Type d'opération</label>
                              <select 
                                value={adjustmentType}
                                onChange={e => setAdjustmentType(e.target.value as any)}
                                className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                              >
                                <option value="add">Créditer (+)</option>
                                <option value="remove">Débiter (-)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Actif ciblé</label>
                              <input 
                                type="text"
                                disabled 
                                value={adjustmentAsset === 'money' ? 'Argent (€)' : 'Étoiles (pts)'}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-2 py-2 text-xs text-white/60 focus:outline-none text-center"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Montant / Quantité</label>
                              <input
                                type="number"
                                required
                                min="0.01"
                                step="any"
                                placeholder={adjustmentAsset === 'money' ? 'ex: 2.50' : 'ex: 10'}
                                value={adjustmentAmount}
                                onChange={e => setAdjustmentAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-center"
                              />
                            </div>
                          </div>

                          {adjustmentAsset === 'money' && adjustmentType === 'add' && (
                            <div>
                              <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Compte bancaire parent débité</label>
                              <select
                                value={adjustmentAccountId}
                                onChange={e => setAdjustmentAccountId(e.target.value)}
                                className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                              >
                                <option value="">Choisir un compte...</option>
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toFixed(2)}€)</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Motif / Commentaire</label>
                            <input
                              type="text"
                              placeholder="ex: Récompense tâches ménagères, Bonne note en Maths..."
                              value={adjustmentReason}
                              onChange={e => setAdjustmentReason(e.target.value)}
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                              required
                            />
                          </div>

                          <div className="flex space-x-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowQuickForm(false)}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-bold"
                            >
                              Annuler
                            </button>
                            <button
                              type="submit"
                              disabled={isAdjusting}
                              className="flex-1 py-2 bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white text-xs font-bold rounded-xl disabled:opacity-50"
                            >
                              {isAdjusting ? 'Enregistrement...' : "Confirmer l'opération"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Goal Card (Tirelire & Objectif) */}
                    <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 text-left font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cagnotte & Objectif</span>
                        <span className="text-[10px] font-extrabold text-[#6C5CFF]">Épargne active</span>
                      </div>
                      
                      {resolvedChild.goalTitle ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <h4 className="font-extrabold text-white text-sm">🎯 {resolvedChild.goalTitle}</h4>
                              <p className="text-[10px] text-white/55 mt-0.5">
                                Cible : <span className="font-bold text-[#00D26A]">{resolvedChild.goalType === 'points' ? `${resolvedChild.goalAmount} points` : formatMoney(resolvedChild.goalAmount || 0)}</span>
                              </p>
                            </div>
                            <span className="text-sm font-black text-white">
                              {Math.round(
                                ((resolvedChild.goalType === 'points' ? resolvedChild.points : resolvedChild.balance) / (resolvedChild.goalAmount || 1)) * 100
                              )}%
                            </span>
                          </div>

                          {/* Progress Thermometer */}
                          <div className="w-full h-3 bg-white/5 border border-white/10 rounded-full overflow-hidden p-[1px]">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] transition-all duration-500 shadow-[0_0_8px_rgba(108,92,255,0.4)]"
                              style={{ 
                                width: `${Math.min(100, Math.round(
                                  ((resolvedChild.goalType === 'points' ? resolvedChild.points : resolvedChild.balance) / (resolvedChild.goalAmount || 1)) * 100
                                ))}%` 
                              }}
                            />
                          </div>

                          <button 
                            type="button"
                            onClick={() => {
                              const title = window.prompt("Modifier le nom de l'objectif :", resolvedChild.goalTitle || '');
                              if (!title) return;
                              const amt = parseFloat(window.prompt("Modifier le montant / score cible :", String(resolvedChild.goalAmount || 50)) || '');
                              if (isNaN(amt) || amt <= 0) return;
                              const type = window.confirm("Cible en Étoiles/Points ? (OK = Étoiles/Points, Annuler = Euros/Cash)") ? 'points' : 'money';
                              handleSaveGoal(resolvedChild.id, title, amt, type);
                            }}
                            className="text-[10px] text-[#6C5CFF] font-bold hover:underline"
                          >
                            ⚙️ Modifier l'objectif de cagnotte
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4 space-y-2">
                          <p className="text-xs text-white/50 italic">Aucun objectif de cagnotte défini pour cet enfant.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const title = window.prompt("Entrez le titre de l'objectif (ex: Vélo neuf, Console...) :");
                              if (!title) return;
                              const amt = parseFloat(window.prompt("Entrez le montant/points cible (ex: 150) :") || '');
                              if (isNaN(amt) || amt <= 0) return;
                              const type = window.confirm("Cible en Étoiles/Points ? (OK = Étoiles/Points, Annuler = Euros/Cash)") ? 'points' : 'money';
                              handleSaveGoal(resolvedChild.id, title, amt, type);
                            }}
                            className="px-4 py-2 bg-[#6C5CFF]/15 border border-[#6C5CFF]/20 rounded-xl text-xs font-bold text-white hover:bg-[#6C5CFF]/30 active:scale-95 transition-all cursor-pointer"
                          >
                            + Définir un objectif
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Automatic transfer rules */}
                    <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3 text-left font-sans">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Règles automatiques (Versements)</span>
                      
                      <div className="space-y-2">
                        {((resolvedChild.rules || []) as PocketMoneyRule[]).map((rule, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold">
                            <div>
                              <p className="text-white">💰 {rule.type === 'weekly' ? 'Versement hebdomadaire' : 'Versement mensuel'}</p>
                              <p className="text-[9px] text-white/40 mt-0.5">
                                {rule.amount > 0 && `${rule.amount.toFixed(2)} €`}
                                {rule.amount > 0 && rule.points > 0 && ' et '}
                                {rule.points > 0 && `${rule.points} Pts`}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-2 py-0.5 rounded-full uppercase">Actif</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm("Supprimer cette règle automatique ?")) {
                                    const updated = (resolvedChild.rules || []).filter((_, i) => i !== idx);
                                    handleSaveChildRules(resolvedChild.id, updated);
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 font-extrabold text-[10px]"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add Rule Button Form */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const amount = parseFloat(window.prompt("Entrez le montant automatique (€) (0 si aucun) :", "2.00") || '0');
                              const points = parseInt(window.prompt("Entrez le nombre d'étoiles/points automatique (0 si aucun) :", "10") || '0', 10);
                              if (amount <= 0 && points <= 0) return;
                              const type = window.confirm("Fréquence Hebdomadaire (OK) ou Mensuelle (Annuler) ?") ? 'weekly' : 'monthly';
                              
                              const newRule: PocketMoneyRule = {
                                id: Date.now().toString(),
                                type,
                                amount,
                                points,
                                active: true
                              };
                              const updated = [...(resolvedChild.rules || []), newRule];
                              handleSaveChildRules(resolvedChild.id, updated);
                            }}
                            className="text-[10px] font-extrabold text-[#00D26A] hover:underline"
                          >
                            + Ajouter un versement automatique récurrent
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Transactions history list for this child */}
                    <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3 text-left">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historique de la tirelire ({resolvedChild.name})</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {childTransactions.map(tx => {
                          const isCredit = tx.amount > 0 || (tx.type as string) === 'credit' || tx.type === 'income';
                          const displayAmt = Math.abs(tx.amount);
                          return (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold">
                              <div>
                                <p className="text-white">{tx.title}</p>
                                <p className="text-[9px] text-white/40">{tx.date}</p>
                              </div>
                              {tx.amount !== 0 ? (
                                <span className={isCredit ? 'text-[#00D26A]' : 'text-[#FF4D6D]'}>
                                  {isCredit ? '+' : '-'}{displayAmt.toFixed(2)} €
                                </span>
                              ) : (
                                <span className="text-[#FFB020] text-[10px] font-black">Opération points</span>
                              )}
                            </div>
                          );
                        })}
                        {childTransactions.length === 0 && (
                          <p className="text-xs text-white/30 text-center py-4">Aucune transaction enregistrée.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Boutique */}
                {pmSubTab === 'boutique' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Validation Requests (alerts req-rew-* & sug-rew-*) */}
                    {pendingRequests.length > 0 && (
                      <div className="glass-panel rounded-[28px] border-2 border-amber-500/20 bg-amber-500/5 p-5 space-y-3 text-left">
                        <div className="flex items-center space-x-2 text-amber-500">
                          <span>🔔</span>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider">Demandes en attente de validation ({resolvedChild.name})</h4>
                        </div>
                        <div className="space-y-2">
                          {pendingRequests.map(alertItem => {
                            const isPurchase = alertItem.id.startsWith('req-rew-');
                            if (isPurchase) {
                              let meta: any = null;
                              const desc = alertItem.description || '';
                              if (desc.startsWith('__METADATA__:') && desc.includes('__DESCRIPTION__:')) {
                                try {
                                  const idx = desc.indexOf('__DESCRIPTION__:');
                                  const jsonStr = desc.substring('__METADATA__:'.length, idx);
                                  meta = JSON.parse(jsonStr);
                                } catch (e) {
                                  console.error("Failed to parse alert metadata:", e);
                                }
                              }

                              const match = alertItem.id.match(/^req-rew-(.*?)-(.*?)-(points|money)-(\d+)$/);
                              const resolvedChildId = meta ? meta.child_id : (match ? match[1] : resolvedChild?.id);
                              const resolvedChildName = meta ? meta.child_name : (resolvedChild?.name || 'L\'enfant');
                              const rewardId = meta ? meta.reward_id : (match ? match[2] : '');
                              const paymentMethod = meta ? meta.payment_type : (match ? match[3] : 'points');

                              let rewardTitle = 'Cadeau';
                              let costPoints = 50;
                              let costMoney = 5.0;

                              if (meta) {
                                rewardTitle = meta.reward_title;
                                costPoints = meta.reward_price_points;
                                costMoney = meta.reward_price_money;
                              } else {
                                const dbReward = rewardsList.find(r => r.id === rewardId);
                                if (dbReward) {
                                  rewardTitle = dbReward.title;
                                  costPoints = dbReward.costPoints;
                                  costMoney = dbReward.costMoney;
                                } else {
                                  rewardTitle = alertItem.title.replace("Achat Ado : ", "").replace("Achat Enfant : ", "").replace("Demande de récompense : ", "");
                                  const ptsMatch = alertItem.description.match(/(\d+)\s*points/i);
                                  if (ptsMatch) costPoints = parseInt(ptsMatch[1]);
                                  const eurMatch = alertItem.description.match(/([\d.,]+)\s*(?:€|euro)/i);
                                  if (eurMatch) costMoney = parseFloat(eurMatch[1].replace(',', '.'));
                                }
                              }

                              const costText = paymentMethod === 'points' ? `${costPoints} étoiles` : `${costMoney.toFixed(2)} €`;

                              return (
                                <div key={alertItem.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                  <div>
                                    <p className="font-bold text-white">{resolvedChildName} demande : {rewardTitle}</p>
                                    <p className="text-[10px] text-white/50 mt-1">
                                      Paiement : <span className="font-bold text-[#FFB020]">{costText}</span>
                                    </p>
                                  </div>
                                  <div className="flex space-x-2 shrink-0">
                                    <button type="button" onClick={() => handleRefuseRequest(alertItem.id)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-xl font-bold cursor-pointer">Refuser</button>
                                    <button type="button" onClick={() => handleApproveBoutiqueRequest(alertItem, resolvedChildId, rewardId, paymentMethod)} className="px-3 py-1 bg-[#00D26A] text-[#07111F] rounded-xl font-bold cursor-pointer">Approuver</button>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Boutique Configuration Editor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      {/* Formulaire de création de récompense */}
                      <form onSubmit={handleCreateBoutiqueItem} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 text-left font-sans">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Ajouter une récompense à la boutique 🎁</span>
                        
                        <div className="space-y-1.5 font-medium">
                          <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Nom du cadeau / privilège</label>
                          <input
                            type="text"
                            required
                            placeholder="ex: 30 minutes de console supplémentaire..."
                            value={newBoutiqueTitle}
                            onChange={e => setNewBoutiqueTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Prix en étoiles (pts)</label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={newBoutiqueCostPoints}
                              onChange={e => setNewBoutiqueCostPoints(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-center"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Icône (Emoji)</label>
                            <input
                              type="text"
                              required
                              placeholder="🎮, 🍕, 🍦"
                              value={newBoutiqueIcon}
                              onChange={e => setNewBoutiqueIcon(e.target.value)}
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none text-center"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Catégorie</label>
                            <select
                              value={newBoutiqueSubCategory}
                              onChange={e => setNewBoutiqueSubCategory(e.target.value)}
                              className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                            >
                              <option value="Écran">Écran</option>
                              <option value="Repas">Repas</option>
                              <option value="Sommeil">Sommeil</option>
                              <option value="Gourmandise">Gourmandise</option>
                              <option value="Sortie">Sortie</option>
                              <option value="Cadeau">Cadeau</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Validation requise</label>
                            <select
                              value={newBoutiqueValidationRequired ? 'true' : 'false'}
                              onChange={e => setNewBoutiqueValidationRequired(e.target.value === 'true')}
                              className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                            >
                              <option value="true">Oui</option>
                              <option value="false">Non (Auto)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Visible pour enfants</label>
                            <select
                              value={newBoutiqueAvail ? 'true' : 'false'}
                              onChange={e => setNewBoutiqueAvail(e.target.value === 'true')}
                              className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                            >
                              <option value="true">Afficher</option>
                              <option value="false">Masquer</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white text-xs font-extrabold cursor-pointer border border-[#6C5CFF]/20 active:scale-95 transition-all text-center"
                        >
                          Ajouter l'article à la boutique
                        </button>
                      </form>

                      {/* Current boutique items list */}
                      <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 font-sans text-left">
                        <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block font-sans">🎁 Récompenses Boutique Actuelles</span>
                        
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {dbRewards.map(item => (
                            <div key={item.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between text-xs font-bold text-white">
                              <div className="flex items-center space-x-2.5">
                                <span className="text-xl shrink-0">{item.icon}</span>
                                <div>
                                  <h5 className="font-extrabold text-white leading-tight">{item.title}</h5>
                                  <p className="text-[9px] text-white/40 leading-none mt-1">
                                    {item.category} • {item.costPoints} pts / {item.costMoney ? `${item.costMoney.toFixed(2)} €` : '0.00 €'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-1.5 items-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRewardAvailability(item.id, item.avail)}
                                  className={`p-1 rounded text-[10px] ${item.avail ? 'text-amber-400' : 'text-gray-400'}`}
                                  title={item.avail ? 'Masquer' : 'Afficher'}
                                >
                                  {item.avail ? '👁️' : '👁️‍🗨️'}
                                </button>
                                {item.supprimable !== false && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBoutiqueItem(item.id)}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {dbRewards.length === 0 && (
                            <p className="text-xs text-white/30 text-center py-6 font-bold">Aucun cadeau configuré (les cadeaux par défaut s'affichent pour les enfants).</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: Karma & Malus */}
                {pmSubTab === 'karma' && (
                  <div className="space-y-6 animate-fade-in text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* CARD 1: Apply Malus */}
                      <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 font-sans">
                        <span className="text-[10px] font-bold text-[#FF4D6D] uppercase tracking-widest block">⚠️ Appliquer un malus ({resolvedChild.name})</span>
                        
                        {malusTemplates.length === 0 ? (
                          <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                            <p className="text-xs text-white/55 italic">Aucun modèle de malus configuré.</p>
                            <p className="text-[10px] text-white/35">Créez un modèle à droite pour pouvoir l'appliquer.</p>
                          </div>
                        ) : (
                          <form onSubmit={(e) => handleApplyMalusToChild(e, resolvedChild.id)} className="space-y-4">
                            <div>
                              <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Motif du malus</label>
                              <select
                                value={selectedMalusTemplateId || ''}
                                onChange={e => {
                                  setSelectedMalusTemplateId(e.target.value || null);
                                  const t = malusTemplates.find(x => x.id === e.target.value);
                                  setUseShieldForMalus(t ? t.lossShield : false);
                                }}
                                required
                                className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                              >
                                <option value="">-- Sélectionner un motif --</option>
                                {malusTemplates.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.emoji} {t.title} (-{t.starsRemoved}⭐, -{t.xpRemoved}XP)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {selectedMalusTemplateId && (() => {
                              const t = malusTemplates.find(x => x.id === selectedMalusTemplateId);
                              if (!t) return null;
                              const childShields = resolvedChild.shields !== undefined ? resolvedChild.shields : 3;
                              const shieldEnabled = foyer?.malusSettings?.shields_enabled !== false;
                              const canUseShield = shieldEnabled && childShields > 0 && t.lossShield;

                              return (
                                <div className="space-y-4 animate-fade-in bg-white/5 p-3 rounded-2xl border border-white/5">
                                  {t.lossShield && (
                                    <div className="flex items-center justify-between text-xs">
                                      <div>
                                        <p className="font-extrabold text-white">🛡️ Activer le bouclier de l'enfant</p>
                                        <p className="text-[9px] text-white/50">
                                          {canUseShield 
                                            ? `Consommera 1 bouclier (Reste : ${childShields}) pour annuler la perte.` 
                                            : !shieldEnabled ? "Les boucliers sont désactivés dans les paramètres." : "Aucun bouclier disponible."}
                                        </p>
                                      </div>
                                      <input 
                                        type="checkbox"
                                        disabled={!canUseShield}
                                        checked={useShieldForMalus && canUseShield}
                                        onChange={e => setUseShieldForMalus(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 text-[#6C5CFF] focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-40"
                                      />
                                    </div>
                                  )}

                                  <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">
                                      Commentaire {t.commentRequired && <span className="text-red-400">* (Obligatoire)</span>}
                                    </label>
                                    <input
                                      type="text"
                                      required={t.commentRequired}
                                      placeholder="ex: Retard ou chambre en désordre..."
                                      value={applyMalusComment}
                                      onChange={e => setApplyMalusComment(e.target.value)}
                                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            <button
                              type="submit"
                              className="w-full py-3 rounded-2xl bg-[#FF4D6D] hover:bg-[#FF4D6D]/90 text-[#07111F] text-xs font-extrabold cursor-pointer border border-[#FF4D6D]/20 active:scale-95 transition-all text-center"
                            >
                              Appliquer le malus ⚠️
                            </button>
                          </form>
                        )}
                      </div>

                      {/* CARD 2: Manage Templates */}
                      <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 font-sans">
                        <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block">⚙️ Modèles de malus</span>
                        
                        {editingMalusId ? (
                          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 animate-fade-in">
                            <span className="text-[10px] font-black uppercase text-[#FFB020] block">Modifier le modèle</span>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Titre</label>
                                <input
                                  type="text"
                                  value={editMalusTitle}
                                  onChange={e => setEditMalusTitle(e.target.value)}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Emoji / Icône</label>
                                <input
                                  type="text"
                                  value={editMalusEmoji}
                                  onChange={e => setEditMalusEmoji(e.target.value)}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none text-center"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Étoiles perdues</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editMalusStarsRemoved}
                                  onChange={e => setEditMalusStarsRemoved(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none text-center"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">XP retirés</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editMalusXpRemoved}
                                  onChange={e => setEditMalusXpRemoved(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none text-center"
                                />
                              </div>
                            </div>

                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/60">Le bouclier protège de ce malus 🛡️</span>
                                <input
                                  type="checkbox"
                                  checked={editMalusLossShield}
                                  onChange={e => setEditMalusLossShield(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 text-[#6C5CFF]"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/60">Commentaire obligatoire ✍️</span>
                                <input
                                  type="checkbox"
                                  checked={editMalusCommentRequired}
                                  onChange={e => setEditMalusCommentRequired(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 text-[#6C5CFF]"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/60">Brise la série de connexions 🔥</span>
                                <input
                                  type="checkbox"
                                  checked={editMalusLossStreak}
                                  onChange={e => setEditMalusLossStreak(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 text-[#6C5CFF]"
                                />
                              </div>
                            </div>

                            <div className="flex space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingMalusId(null)}
                                className="px-3 py-1.5 bg-white/5 text-white/70 hover:text-white rounded-xl text-[10.5px] font-bold"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedMalus(editingMalusId)}
                                className="flex-1 py-1.5 bg-[#00D26A] text-[#07111F] rounded-xl text-[10.5px] font-black"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleCreateMalusTemplate} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                            <span className="text-[10px] font-black uppercase text-[#6C5CFF] block">+ Créer un modèle</span>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Titre du modèle</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="ex: Chambre en désordre..."
                                  value={newMalusTitle}
                                  onChange={e => setNewMalusTitle(e.target.value)}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Emoji / Icône</label>
                                <input
                                  type="text"
                                  required
                                  value={newMalusEmoji}
                                  onChange={e => setNewMalusEmoji(e.target.value)}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none text-center"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Étoiles perdues</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  value={newMalusStarsRemoved}
                                  onChange={e => setNewMalusStarsRemoved(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none text-center"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">XP retirés</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  value={newMalusXpRemoved}
                                  onChange={e => setNewMalusXpRemoved(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white focus:outline-none text-center"
                                />
                              </div>
                            </div>

                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/60">Le bouclier protège de ce malus 🛡️</span>
                                <input
                                  type="checkbox"
                                  checked={newMalusLossShield}
                                  onChange={e => setNewMalusLossShield(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 text-[#6C5CFF]"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/60">Commentaire obligatoire ✍️</span>
                                <input
                                  type="checkbox"
                                  checked={newMalusCommentRequired}
                                  onChange={e => setNewMalusCommentRequired(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 text-[#6C5CFF]"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/60">Brise la série de connexions 🔥</span>
                                <input
                                  type="checkbox"
                                  checked={newMalusLossStreak}
                                  onChange={e => setNewMalusLossStreak(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 text-[#6C5CFF]"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white text-xs font-bold rounded-xl active:scale-95 transition-all text-center cursor-pointer"
                            >
                              Créer le modèle de malus
                            </button>
                          </form>
                        )}

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {malusTemplates.map(t => (
                            <div key={t.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between text-xs font-bold text-white">
                              <div className="flex items-center space-x-2.5">
                                <span className="text-xl shrink-0">{t.emoji}</span>
                                <div>
                                  <h5 className="font-extrabold text-white leading-tight">{t.title}</h5>
                                  <p className="text-[9px] text-white/40 leading-none mt-1">
                                    -{t.starsRemoved}⭐ • -{t.xpRemoved}XP {t.lossShield && '🛡️'} {t.commentRequired && '✍️'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-1.5 items-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMalusId(t.id);
                                    setEditMalusTitle(t.title);
                                    setEditMalusEmoji(t.emoji);
                                    setEditMalusCategory(t.category || 'Comportement');
                                    setEditMalusStarsRemoved(t.starsRemoved);
                                    setEditMalusXpRemoved(t.xpRemoved);
                                    setEditMalusLossStreak(t.lossStreak || false);
                                    setEditMalusLossShield(t.lossShield || false);
                                    setEditMalusCommentRequired(t.commentRequired || false);
                                    setEditMalusDoubleParentValidation(t.doubleParentValidation || false);
                                  }}
                                  className="p-1 text-[#FFB020] hover:bg-[#FFB020]/10 rounded transition cursor-pointer"
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMalusTemplate(t.id)}
                                  className="p-1 text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* SECTION 3: Behavioral History */}
                    <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 font-sans text-left">
                      <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest block font-sans">🛡️ Historique comportemental ({resolvedChild.name})</span>
                      
                      {(() => {
                        const childMaluses = appliedMaluses.filter(m => m.memberId === resolvedChild.id);
                        if (childMaluses.length === 0) {
                          return (
                            <p className="text-xs text-white/30 text-center py-6 font-bold">Aucun événement comportemental ou malus enregistré pour cet enfant.</p>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {childMaluses.map(m => {
                              const isShielded = m.shieldUsed;
                              const isRepaired = m.reparationTaskId && tasks.find(t => t.id === m.reparationTaskId)?.validatedByParent;
                              const isPendingReparation = m.reparationTaskId && !isRepaired;
                              
                              let statusLabel = "Appliqué";
                              let statusColor = "text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/20";
                              
                              if (isShielded) {
                                statusLabel = "Bloqué par bouclier 🛡️";
                                statusColor = "text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20";
                              } else if (isRepaired) {
                                statusLabel = "Réparé ✅";
                                statusColor = "text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20";
                              } else if (isPendingReparation) {
                                statusLabel = "Rattrapage en cours 🔧";
                                statusColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                              }

                              return (
                                <div key={m.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-lg">{m.emoji}</span>
                                      <span className="font-extrabold text-white text-sm">{m.title}</span>
                                      <span className={`text-[8.5px] px-2 py-0.5 rounded-full border font-black uppercase tracking-wider ${statusColor}`}>
                                        {statusLabel}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-white/45 font-bold">
                                      {new Date(m.createdAt).toLocaleDateString('fr-FR')} • Perte : {isShielded ? 'Aucune (Bouclier)' : `-${m.starsRemoved}⭐ / -${m.xpRemoved}XP`}
                                    </p>
                                    {m.comment && (
                                      <p className="text-[10.5px] text-white/70 italic font-medium bg-white/5 p-2 rounded-xl mt-1 border border-white/5">
                                        " {m.comment} "
                                      </p>
                                    )}
                                  </div>

                                  {!isShielded && !m.reparationTaskId && (
                                    <div className="shrink-0 flex items-center space-x-2 pt-2 md:pt-0">
                                      {linkingMalusId === m.id ? (
                                        <form onSubmit={(e) => handleLinkReparationTask(e, m.id)} className="flex items-center space-x-2">
                                          <input
                                            type="text"
                                            required
                                            placeholder="Tâche de rattrapage (ex: Nettoyer la cuisine)..."
                                            value={reparationTaskTitle}
                                            onChange={e => setReparationTaskTitle(e.target.value)}
                                            className="bg-[#07111F] border border-white/8 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none w-48"
                                          />
                                          <button type="submit" className="px-2.5 py-1.5 bg-[#00D26A] text-[#07111F] rounded-lg font-black text-[10px]">Assigner</button>
                                          <button type="button" onClick={() => setLinkingMalusId(null)} className="px-2 py-1.5 bg-white/5 text-white/60 rounded-lg text-[10px]">Annuler</button>
                                        </form>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setLinkingMalusId(m.id);
                                            setReparationTaskTitle('');
                                          }}
                                          className="px-3 py-2 bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-white font-extrabold text-[10px] rounded-xl hover:bg-[#6C5CFF]/30 active:scale-95 transition-all cursor-pointer"
                                        >
                                          🔧 Proposer un rattrapage
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {m.reparationTaskId && (() => {
                                    const linkedTask = tasks.find(t => t.id === m.reparationTaskId);
                                    if (!linkedTask) return null;
                                    return (
                                      <div className="text-[10px] bg-white/5 px-3 py-2 rounded-xl border border-white/5 text-left text-white/60 space-y-0.5">
                                        <span className="text-[8px] font-black uppercase text-[#FFB020] block">Mission de rattrapage</span>
                                        <p className="font-extrabold text-white text-xs truncate max-w-xs">{linkedTask.title.replace("🔧 Rattrapage : ", "")}</p>
                                        <p className="text-[8.5px] font-bold">
                                          Statut : {linkedTask.validatedByParent 
                                            ? <span className="text-[#00D26A] font-black">Validée (Étoiles récupérées ! 🎉)</span> 
                                            : linkedTask.done ? <span className="text-amber-400 font-black">À valider par parent ⏳</span> : "À faire par l'enfant"}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                )}

                {/* Recurring transfers list for this child */}
                {(() => {
                  const childRecurringTransfers = transactions.filter(t => 
                    t.recurrence && t.recurrence !== 'none' &&
                    (t.category === 'Argent de poche' || t.category === 'Argent de Poche') && 
                    (t.memberName === resolvedChild.name || t.memberId === resolvedChild.id)
                  );
                  if (childRecurringTransfers.length === 0) return null;

                  return (
                    <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3 text-left">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Versements récurrents programmés</h4>
                      <div className="space-y-2">
                        {childRecurringTransfers.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold">
                            <div>
                              <p className="text-white">{tx.title}</p>
                              <p className="text-[9px] text-white/40">Montant : {formatMoney(tx.amount)} • Récurrence : {tx.recurrence === 'weekly' ? 'Chaque semaine' : 'Chaque mois'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCancelRecurringTransfer(tx.id)}
                              className="px-2.5 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-bold font-sans cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Transactions history list for this child */}
                <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3 text-left">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historique de la tirelire ({resolvedChild.name})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {childTransactions.map(tx => {
                      const isCredit = tx.amount > 0 || (tx.type as string) === 'credit' || tx.type === 'income';
                      const displayAmt = Math.abs(tx.amount);
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-bold">
                          <div>
                            <p className="text-white">{tx.title}</p>
                            <p className="text-[9px] text-white/40">{tx.date}</p>
                          </div>
                          {tx.amount !== 0 ? (
                            <span className={isCredit ? 'text-[#00D26A]' : 'text-[#FF4D6D]'}>
                              {isCredit ? '+' : '-'}{displayAmt.toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-[#FFB020] text-[10px] font-black">Opération points</span>
                          )}
                        </div>
                      );
                    })}
                    {childTransactions.length === 0 && (
                      <p className="text-xs text-white/30 text-center py-4">Aucune transaction enregistrée.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        );
      })()}

      {/* 11. Capsule Temporelle */}
      {activeModule === 'capsule' && (
        <CapsuleTemporelle 
          memories={memories} 
          setMemories={setMemories} 
          activeMemberId={activeMemberId} 
          isPremium={isPremium}
          onTriggerPaywall={onTriggerPaywall}
          members={members}
        />
      )}

      {/* 12. Conseil de Famille */}
      {activeModule === 'conseil' && (
        <ConseilFamille 
          votes={votes} 
          setVotes={setVotes} 
          activeMemberId={activeMemberId} 
          members={members}
        />
      )}

      {/* 13. PeaceMaker IA */}
      {activeModule === 'peacemaker' && (
        <PeaceMaker 
          isPremium={isPremium}
          onTriggerPaywall={onTriggerPaywall}
        />
      )}

      {/* 14. MaVie Simulator */}
      {activeModule === 'mavie' && (
        <MaVieSimulator />
      )}

      {/* 15. Conteur IA d'Histoires du Soir */}
      {activeModule === 'conteur' && (
        <ConteurIA 
          onBack={() => setActiveModule('')} 
          members={members} 
          isPremium={isPremium}
          onTriggerPaywall={onTriggerPaywall}
        />
      )}



      {/* 17. Répertoire Important (Contacts) */}
      {activeModule === 'contacts' && (
        <div className="space-y-6">
          {/* Bouton de retour vers les espaces */}
          <button
            onClick={() => setActiveModule('')}
            className="flex items-center space-x-2 text-white/60 hover:text-white font-sans text-xs font-bold cursor-pointer transition-all active:scale-95 py-2 px-3 rounded-xl bg-white/5 border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux espaces</span>
          </button>
          
          <ContactsImportants canManage={isParent} />
        </div>
      )}

      {/* List Archiving Dialog Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Archiver la liste</h3>
              <button 
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">Nom de l'archive</label>
                <input
                  type="text"
                  value={archiveListName}
                  onChange={(e) => setArchiveListName(e.target.value)}
                  placeholder="Ex: Courses mensuelles"
                  className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">Enseigne / Magasin (Optionnel)</label>
                <input
                  type="text"
                  value={archiveListStore}
                  onChange={(e) => setArchiveListStore(e.target.value)}
                  placeholder="Ex: Carrefour, Lidl..."
                  className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer border border-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (archiveListName.trim()) {
                    onArchiveCurrentList(archiveListName.trim(), archiveListStore.trim() || undefined);
                    setArchiveModalOpen(false);
                    alert("✨ Votre liste active a été archivée avec succès !");
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#FFB020] text-black font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:opacity-90"
              >
                Archiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean List Dialog Modal */}
      {cleanModalOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Nettoyer la liste</h3>
              </div>
              <button 
                type="button"
                onClick={() => setCleanModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[10px] text-white/60 leading-relaxed">
              Choisissez l'option de nettoyage de votre liste de courses. Cette action supprimera les éléments sélectionnés.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  onCleanGroceryList('checked');
                  setCleanModalOpen(false);
                  alert("🧹 Articles achetés effacés !");
                }}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold text-white flex items-center justify-between"
              >
                <span>Effacer les articles cochés (achetés)</span>
                <span className="text-[9px] text-[#00D26A] font-extrabold uppercase bg-[#00D26A]/10 px-2 py-0.5 rounded">Cochés</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCleanGroceryList('favorites_only');
                  setCleanModalOpen(false);
                  alert("🧹 Liste nettoyée, seuls vos favoris ont été conservés !");
                }}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold text-white flex items-center justify-between"
              >
                <span>Garder uniquement les favoris ★</span>
                <span className="text-[9px] text-[#FFB020] font-extrabold uppercase bg-[#FFB020]/10 px-2 py-0.5 rounded">Favoris</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nameStr = `Archive auto - ${new Date().toLocaleDateString('fr-FR')}`;
                  onArchiveCurrentList(nameStr);
                  onCleanGroceryList('all');
                  setCleanModalOpen(false);
                  alert("🗂️ Liste active archivée sous '" + nameStr + "' puis entièrement vidée !");
                }}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold text-white flex items-center justify-between"
              >
                <span>Archiver d'abord, puis tout vider</span>
                <span className="text-[9px] text-[#6C5CFF] font-extrabold uppercase bg-[#6C5CFF]/10 px-2 py-0.5 rounded">Recommandé</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("⚠️ DANGER : Êtes-vous sûr de vouloir vider ENTIÈREMENT la liste sans l'archiver ?")) {
                    onCleanGroceryList('all');
                    setCleanModalOpen(false);
                    alert("🧹 Liste entièrement vidée !");
                  }
                }}
                className="w-full text-left p-3 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 transition-all text-xs font-bold text-red-400 flex items-center justify-between"
              >
                <span>Tout vider (sans archiver)</span>
                <span className="text-[9px] text-red-500 font-extrabold uppercase bg-red-500/10 px-2 py-0.5 rounded">Tout</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCleanModalOpen(false)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Valider Achats Modal */}
      {isValiderAchatsOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-white/10 rounded-[28px] w-full max-w-sm p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Valider mes achats</h3>
              <button 
                type="button"
                onClick={() => setIsValiderAchatsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">Montant Total (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={validerAchatsCost}
                  onChange={(e) => setValiderAchatsCost(e.target.value)}
                  placeholder="Ex: 45.50"
                  className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFB020]"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">Compte bancaire</label>
                <select
                  value={validerAchatsAccountId}
                  onChange={(e) => setValiderAchatsAccountId(e.target.value)}
                  className="w-full bg-[#07111F]/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020] cursor-pointer"
                >
                  <option value="">Sélectionner un compte...</option>
                  {(accounts || []).map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-[#0b1726]">
                      {acc.name} ({formatMoney(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsValiderAchatsOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer border border-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const costVal = parseFloat(validerAchatsCost);
                  if (isNaN(costVal) || costVal <= 0) {
                    alert("Veuillez saisir un montant valide.");
                    return;
                  }
                  if (onAddTransaction) {
                    onAddTransaction({
                      amount: costVal,
                      type: 'expense',
                      category: 'Alimentation',
                      title: `Courses validées`,
                      date: new Date().toISOString().split('T')[0],
                      accountId: validerAchatsAccountId || null,
                      moduleSource: 'courses'
                    });
                  }
                  
                  // Auto-archive and clean checked items
                  const checkedItems = groceries.filter(g => g.checked);
                  if (checkedItems.length > 0) {
                    onArchiveCurrentList(`Achats du ${new Date().toLocaleDateString('fr-FR')}`);
                    onCleanGroceryList('checked');
                  }
                  
                  setIsValiderAchatsOpen(false);
                  setValiderAchatsCost('');
                  setValiderAchatsAccountId('');

                  if (onSendNotification) {
                    const matchedAcc = accounts?.find(a => a.id === validerAchatsAccountId);
                    const accName = matchedAcc ? matchedAcc.name : 'Compte bancaire';
                    onSendNotification(
                      "🛒 Courses Validées",
                      `Les courses d'un montant de ${costVal.toFixed(2)}€ ont été validées et débitées du compte "${accName}".`,
                      "budget",
                      "success"
                    );
                  }

                  alert("🛒 Achats validés et ajoutés au Budget !");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#00D26A] text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:opacity-90"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
      {editingVaccine && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-white/10 rounded-[28px] w-full max-w-md p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Modifier le Vaccin</h3>
              <button 
                type="button"
                onClick={() => setEditingVaccine(null)}
                className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveVac} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase block">Membre concerné</label>
                <select
                  value={editVacMemberId}
                  onChange={(e) => setEditVacMemberId(e.target.value)}
                  className="w-full bg-[#07111F] text-white border border-white/10 rounded-xl px-2.5 py-1.5 font-bold text-xs"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase block">Nom du vaccin</label>
                <input 
                  type="text"
                  value={editVacName}
                  onChange={(e) => setEditVacName(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Date d'échéance</label>
                  <input 
                    type="date"
                    value={editVacDate}
                    onChange={(e) => setEditVacDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Heure</label>
                  <input 
                    type="time"
                    value={editVacTime}
                    onChange={(e) => setEditVacTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Médecin / Lieu</label>
                  <input 
                    type="text"
                    value={editVacDoctor}
                    onChange={(e) => setEditVacDoctor(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Rappel</label>
                  <select
                    value={editVacReminder}
                    onChange={(e) => setEditVacReminder(e.target.value)}
                    className="w-full bg-[#07111F] text-white border border-white/10 rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="">Aucun</option>
                    <option value="1 heure avant">1 heure avant</option>
                    <option value="2 heures avant">2 heures avant</option>
                    <option value="1 jour avant">1 jour avant</option>
                    <option value="2 jours avant">2 jours avant</option>
                    <option value="3 jours avant">3 jours avant</option>
                    <option value="1 semaine avant">1 semaine avant</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase block">Note</label>
                <input 
                  type="text"
                  value={editVacNote}
                  onChange={(e) => setEditVacNote(e.target.value)}
                  placeholder="Notes ou consignes particulières"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase block">Document lié (URL)</label>
                <input 
                  type="text"
                  value={editVacDoc}
                  onChange={(e) => setEditVacDoc(e.target.value)}
                  placeholder="Lien vers l'ordonnance ou le document"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-white/40 uppercase block">Statut</label>
                <select
                  value={editVacStatus}
                  onChange={(e) => setEditVacStatus(e.target.value)}
                  className="w-full bg-[#07111F] text-white border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                >
                  <option value="À faire">À faire</option>
                  <option value="Fait">Fait</option>
                  <option value="Archivé">Archivé</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00D26A] text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer active:scale-97 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
                
                {editVacStatus !== 'Archivé' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditVacStatus('Archivé');
                    }}
                    className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold cursor-pointer transition-colors text-[10px] uppercase tracking-wider"
                  >
                    🚀 Archiver
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Supprimer ce vaccin définitivement ?")) {
                      if (setVaccines) {
                        setVaccines((prev: any[]) => prev.filter(v => v.id !== editingVaccine.id));
                      }
                      setEditingVaccine(null);
                    }
                  }}
                  className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold cursor-pointer transition-colors text-[10px] uppercase tracking-wider"
                >
                  Supprimer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    </Suspense>
  );
};
