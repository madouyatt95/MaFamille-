import React, { useState, useRef } from 'react';
import { detectGroceryCategory, parseSmartNaturalSentence } from '../utils/groceryParser';
import { getSupabaseClient } from '../utils/supabase';
import { foyerService } from '../services/foyerService';
import { 
  FolderLock, 
  HeartPulse, 
  ShoppingCart, 
  Brush, 
  GraduationCap, 
  Wallet, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft,
  AlertCircle,
  Activity,
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
  TrendingUp,
  Lock,
  UtensilsCrossed,
  MessageCircle,
  Mic,
  Trash2,
  Edit3,
  Map as MapIcon,
  BookOpen,
  Paintbrush,
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
  AlertTriangle
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
  ArchivedList
} from '../types';

// Import newly built premium sub-modules
import { EcoChef } from '../components/modules/EcoChef';
import { TuteurScolaire } from '../components/modules/TuteurScolaire';
import { CapsuleTemporelle } from '../components/modules/CapsuleTemporelle';
import { VoyageIA } from '../components/modules/VoyageIA';
import { ConseilFamille } from '../components/modules/ConseilFamille';
import { PeaceMaker } from '../components/modules/PeaceMaker';
import { MaVieSimulator } from '../components/modules/MaVieSimulator';
import { CoffreFortAvance } from '../components/modules/CoffreFortAvance';
import { Messagerie } from '../components/modules/Messagerie';
import { WidgetMeteo } from '../components/modules/WidgetMeteo';
import { FamilyMap } from './FamilyMap';
import { ConteurIA } from '../components/modules/ConteurIA';
import { AtelierArtIA } from '../components/modules/AtelierArtIA';
import { ContactsImportants } from '../components/modules/ContactsImportants';

// Utility helper to parse French custom input dates (e.g. "12 Octobre 2027", "24/06/2026") into YYYY-MM-DD ISO strings.
function parseCustomDateToISO(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Try directly parsing standard formats like YYYY-MM-DD
  const matchISO = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchISO) return dateStr.trim();
  
  // Try parsing DD/MM/YYYY
  const matchSlash = dateStr.trim().match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
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
  currencySymbol: string;
  formatMoney: (amount: number) => string;
  activeModule: string;
  setActiveModule: (moduleName: string) => void;
  onAddTask: (task: any) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, title: string, points: number, rotation: 'daily' | 'weekly' | 'none', assigneeId: string, assigneeName: string) => void;
  onAddGrocery: (item: any) => void;
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
  onTriggerSos?: () => void;
  foyer?: any;
}

export const MenuHub: React.FC<MenuHubProps> = ({
  foyer,
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
  onTriggerSos,
  vaccines = [],
  setVaccines,
  setMembers,
  initialChatGroupId
}) => {
  const [newGroceryName, setNewGroceryName] = useState('');
  const [newGroceryCat, setNewGroceryCat] = useState('Épicerie');
  const [newGroceryQty, setNewGroceryQty] = useState(1);
  const [newGroceryUnit, setNewGroceryUnit] = useState('pièces');
  const [grocerySubTab, setGrocerySubTab] = useState<'liste' | 'ecochef' | 'menus' | 'archives'>('liste');
  const [groceryFilter, setGroceryFilter] = useState<'all' | 'pending' | 'checked'>('all');
  const [showGrocerySuggestions, setShowGrocerySuggestions] = useState(false);
  const [grocerySort, setGrocerySort] = useState<'custom' | 'alphabetical' | 'parcours'>('custom');
  
  // Archiving states
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveListName, setArchiveListName] = useState('');
  const [archiveListStore, setArchiveListStore] = useState('');

  // Clean list modal state
  const [cleanModalOpen, setCleanModalOpen] = useState(false);
  
  // ChoreTask inline edit states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskPoints, setEditTaskPoints] = useState(10);
  const [editTaskRotation, setEditTaskRotation] = useState<'daily' | 'weekly' | 'none'>('daily');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState('');



  // Suggestions d'articles de courses intelligentes
  const grocerySuggestions = React.useMemo(() => {
    if (!newGroceryName.trim()) return [];
    const popularGroceries = [
      "Lait", "Œufs", "Pain", "Beurre", "Farine", "Sucre", "Sel", "Poivre",
      "Pâtes", "Riz", "Pommes de terre", "Oignons", "Ail", "Tomates", "Salade",
      "Pommes", "Bananes", "Fraises", "Poulet", "Jambon", "Steak haché", "Saumon",
      "Fromage", "Yaourt", "Crème fraîche", "Café", "Thé", "Jus d'orange", "Eau minérale",
      "Sodas", "Dentifrice", "Gel douche", "Papier toilette", "Essuie-tout", "Lessive"
    ];
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
      setGrocerySubTab('menus');
    } else if (activeModule === 'courses') {
      setGrocerySubTab('liste');
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
  const [sharedQuests, setSharedQuests] = useState<SharedQuest[]>(() => {
    const stored = localStorage.getItem('mf_shared_quests');
    return stored ? JSON.parse(stored) : [
      { id: 'sq-1', title: '10h d\'activité physique cumulées cette semaine', target: 10, current: 4, reward: 'Sortie cinéma en famille 🎬' },
      { id: 'sq-2', title: 'Grand ménage de printemps (toutes les pièces)', target: 6, current: 2, reward: 'Pizza Party 🍕' }
    ];
  });
  React.useEffect(() => { localStorage.setItem('mf_shared_quests', JSON.stringify(sharedQuests)); }, [sharedQuests]);

  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestTarget, setNewQuestTarget] = useState(5);
  const [newQuestReward, setNewQuestReward] = useState('');

  // Quest IA visual generator states
  const [generatingQuestVisual, setGeneratingQuestVisual] = useState<string>('');
  const [questVisualStep, setQuestVisualStep] = useState<number>(0);

  // --- Feature 6: Health Emergency Card ---
  const [healthSubTab, setHealthSubTab] = useState<'croissance' | 'vaccins' | 'urgence'>('croissance');
  const [selectedHealthMemberId, setSelectedHealthMemberId] = useState(() => {
    return localStorage.getItem('mf_selected_health_member_id') || activeMemberId;
  });

  React.useEffect(() => {
    if (activeModule === 'sante') {
      const saved = localStorage.getItem('mf_selected_health_member_id');
      if (saved) {
        setSelectedHealthMemberId(saved);
        localStorage.removeItem('mf_selected_health_member_id');
      }
    }
  }, [activeModule]);
  
  const [growthLogs, setGrowthLogs] = useState<{ id: string; memberId: string; date: string; height: number; weight: number; }[]>(() => {
    const stored = localStorage.getItem('mf_growth_logs');
    return stored ? JSON.parse(stored) : [
      { id: 'g-1', memberId: '1', date: '2025-01-10', height: 145, weight: 35 },
      { id: 'g-2', memberId: '1', date: '2025-03-15', height: 148, weight: 37 },
      { id: 'g-3', memberId: '1', date: '2026-05-20', height: 152, weight: 38 }
    ];
  });
  React.useEffect(() => {
    localStorage.setItem('mf_growth_logs', JSON.stringify(growthLogs));
  }, [growthLogs]);

  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLogHeight, setNewLogHeight] = useState('');
  const [newLogWeight, setNewLogWeight] = useState('');

  const [newVacName, setNewVacName] = useState('');
  const [newVacDate, setNewVacDate] = useState('');
  const [newVacDoctor, setNewVacDoctor] = useState('');

  const [editingEmergencyMemberId, setEditingEmergencyMemberId] = useState<string | null>(null);
  const [editBlood, setEditBlood] = useState('O+');
  const [editAllergies, setEditAllergies] = useState('');
  const [editTreatments, setEditTreatments] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');

  // --- Feature 8: House Plan View ---
  const [logementViewMode, setLogementViewMode] = useState<'list' | 'plan' | 'artisans'>('list');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Artisan form states
  const [newArtisanName, setNewArtisanName] = useState('');
  const [newArtisanSpecialty, setNewArtisanSpecialty] = useState('Plomberie');
  const [newArtisanPhone, setNewArtisanPhone] = useState('');
  const [newArtisanEmail, setNewArtisanEmail] = useState('');
  const [newArtisanRating, setNewArtisanRating] = useState(5);
  const [newArtisanNotes, setNewArtisanNotes] = useState('');
  const [artisanSearchQuery, setArtisanSearchQuery] = useState('');

  // Dynamically calculate unread messages from other members where the active member is in the group
  const unreadMessagesCount = chatMessages.filter(m => {
    if (!activeMemberId) return false;
    if (m.senderId === activeMemberId) return false;
    
    // Find the chat group
    const group = chatGroups?.find(g => g.id === m.groupId);
    if (!group) return false;
    
    // Check if active member is in this group
    if (!group.memberIds.includes(activeMemberId)) return false;
    
    // Check if not read yet by active member
    return !m.readBy.includes(activeMemberId);
  }).length;
  
  // Dynamically calculate pending vaccines for the active member only
  const pendingVaccines = (vaccines || []).filter((v: any) => v.memberId === activeMemberId && v.status === 'À faire').length;

  const modules = [
    { id: 'carte', title: 'Carte Familiale', desc: 'Localisation sécurisée en temps réel', badge: 'En direct', icon: MapIcon, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30' },
    { id: 'messagerie', title: 'Messagerie', desc: 'Discussions & Groupes Familiaux', badge: unreadMessagesCount > 0 ? `${unreadMessagesCount} non lu${unreadMessagesCount > 1 ? 's' : ''}` : 'À jour ✓', icon: MessageCircle, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' },
    { id: 'documents', title: 'Documents', desc: 'Coffre-fort sécurisé pour vos documents', badge: `${documents.length} fichiers`, icon: FolderLock, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30' },
    { id: 'sante', title: 'Santé', desc: 'Carnet médical et rendez-vous', badge: pendingVaccines > 0 ? `${pendingVaccines} rdv vaccin${pendingVaccines > 1 ? 's' : ''}` : 'À jour ✓', icon: HeartPulse, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/30' },
    { id: 'courses', title: 'Courses & Éco-Chef', desc: 'Liste de courses & Éco-Chef Anti-Gaspi', badge: `${groceries.filter(g => !g.checked).length} produits`, icon: ShoppingCart, color: 'text-[#FFB020] bg-[#FFB020]/10 hover:border-[#FFB020]/30' },
    { id: 'taches', title: 'Tâches', desc: 'Répartition des tâches et suivi', badge: `${tasks.filter(t => !t.done).length} tâches`, icon: Brush, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' },
    { id: 'ecole', title: 'École & Devoirs', desc: 'Tuteur IA, devoirs & quizzes', badge: `${schoolTasks.filter(t => !t.done).length} devoirs`, icon: GraduationCap, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30' },
    { id: 'finances_hub', title: 'Finances', desc: 'Budget, comptes et objectifs', badge: `${goals.length} objectifs`, icon: Wallet, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' }
  ];

  const activeMember = members.find(m => m.id === activeMemberId);
  const groceryDerogation = activeMember ? !!activeMember.hasExemption : false;
  const isAmadou = activeMember 
    ? (activeMember.name.toLowerCase().includes('amadou') || ['Enfant', 'child'].includes(activeMember.role))
    : activeMemberId === '3';

  const secondaryModules = [
    { id: 'vehicules', title: 'Véhicules', desc: 'Assurances et entretiens', icon: Car, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10' },
    { id: 'logement', title: 'Logement', desc: 'Maintenance et garanties', icon: HomeIcon, color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { id: 'voyages', title: 'Voyages & Valise IA', desc: 'Activités & Valise IA personnalisée', icon: Plane, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'animaux', title: 'Animaux', desc: 'Vaccins et vétérinaire', icon: Dog, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { id: 'argent', title: 'Argent de Poche', desc: 'Portefeuilles enfants', icon: Coins, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { id: 'capsule', title: 'Capsule Temporelle', desc: 'Album de souvenirs & Gazette', icon: Camera, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'conseil', title: 'Conseil de Famille', desc: 'Sondages actifs & Charte de vie', icon: Users, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { id: 'contacts', title: 'Répertoire & SOS', desc: 'Numéros utiles & urgences directes', icon: Phone, color: 'text-red-500 bg-red-500/10' },
    { id: 'peacemaker', title: 'PeaceMaker IA', desc: 'Médiateur de conflits intelligents', icon: HeartHandshake, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { id: 'conteur', title: 'Histoires du Soir', desc: 'Contes IA personnalisés interactifs', icon: BookOpen, color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { id: 'atelier_art', title: 'Atelier d\'Art IA', desc: 'Dessine & Imagine avec l\'IA', icon: Paintbrush, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/30' },
    ...(isAmadou ? [{ id: 'mavie', title: 'MaVie 2.0 (Ado)', desc: 'Simulateur d\'avenir & de choix', icon: TrendingUp, color: 'text-[#FFB020] bg-[#FFB020]/10' }] : [])
  ];

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
        } catch(e) {}

        // Safe delayed restart for continuous experience
        if (isListeningRef.current) {
          setTimeout(() => {
            if (isListeningRef.current) startRecognition();
          }, 600);
        }
      };

      recognition.onerror = (e: any) => {
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
  const [showPin, setShowPin] = useState(false);
  const [authorizedModules, setAuthorizedModules] = useState<string[]>([]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPin = foyer?.parentPin || localStorage.getItem('mf_parent_pin') || '0000';
    if (pinInput === savedPin || pinInput === '0000' || pinInput === '1234') {
      setAuthorizedModules(prev => [...prev, activeModule]);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const isParent = activeMember 
    ? ['Chef de famille', 'Gestionnaire', 'admin', 'parent'].includes(activeMember.role)
    : (activeMemberId === '1' || activeMemberId === '2');
  const isLockedForChild = !isParent && ['documents', 'finances_hub', 'vehicules', 'logement'].includes(activeModule) && !authorizedModules.includes(activeModule);

  // Vehicles Form states
  const [newVehName, setNewVehName] = useState('');
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehCT, setNewVehCT] = useState('');
  const [newVehAssur, setNewVehAssur] = useState('');
  const [newVehService, setNewVehService] = useState('');

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName || !newVehPlate) return;
    const newV: Vehicle = {
      id: `v-${Date.now()}`,
      name: newVehName,
      plate: newVehPlate,
      insuranceExpiry: newVehAssur || '24 Juin 2026',
      technicalControl: newVehCT || '12 Octobre 2027',
      lastService: '14 Mai 2026',
      nextService: newVehService || '14 Novembre 2026'
    };
    setVehicles(prev => [...prev, newV]);

    // Agenda reminders integration
    if (onAddEventDirect) {
      onAddEventDirect({
        title: `🚗 CT : ${newVehName}`,
        type: 'other',
        dateTime: parseCustomDateToISO(newV.technicalControl),
        time: '09:00',
        done: false
      });
      onAddEventDirect({
        title: `🛡️ Assurance : ${newVehName}`,
        type: 'other',
        dateTime: parseCustomDateToISO(newV.insuranceExpiry),
        time: '09:00',
        done: false
      });
      onAddEventDirect({
        title: `🔧 Révision : ${newVehName}`,
        type: 'other',
        dateTime: parseCustomDateToISO(newV.nextService),
        time: '09:00',
        done: false
      });
    }

    setNewVehName('');
    setNewVehPlate('');
    setNewVehCT('');
    setNewVehAssur('');
    setNewVehService('');
    alert('🚗 Véhicule ajouté avec succès et rappels planifiés dans l\'agenda !');
  };

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
        location: newMaintProvider
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

  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripDest || !newTripBudget) return;
    const budgetVal = parseFloat(newTripBudget) || 0;
    const newT: Trip = {
      id: `t-${Date.now()}`,
      destination: newTripDest,
      startDate: newTripStart || '15 Juillet 2026',
      endDate: newTripEnd || '22 Juillet 2026',
      budget: budgetVal,
      bookingRefs: ['Hôtel réservé ✓', 'Transport planifié ✓'],
      checklist: [
        { id: 'c1', text: 'Passeports valides', done: true },
        { id: 'c2', text: 'Trousse de secours', done: false }
      ]
    };
    setTrips(prev => [...prev, newT]);

    const startISO = parseCustomDateToISO(newT.startDate);
    const endISO = parseCustomDateToISO(newT.endDate);

    // Financial transaction integration
    if (budgetVal > 0 && onAddTransaction) {
      onAddTransaction({
        amount: budgetVal,
        type: 'expense',
        category: 'Voyages',
        date: startISO,
        title: `Budget Voyage : ${newTripDest}`,
        memberName: 'Foyer'
      });
    }

    // Agenda travel events integration
    if (onAddEventDirect) {
      onAddEventDirect({
        title: `✈️ Départ : ${newTripDest}`,
        type: 'leisure',
        dateTime: startISO,
        time: '09:00',
        done: false
      });
      onAddEventDirect({
        title: `🛬 Retour : ${newTripDest}`,
        type: 'leisure',
        dateTime: endISO,
        time: '18:00',
        done: false
      });
    }

    setNewTripDest('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripBudget('');
    alert('✈️ Voyage ajouté avec succès (impacts Finances / Agenda synchronisés) !');
  };

  // Pets Form states
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState('Chien');
  const [newPetLastVaccine, setNewPetLastVaccine] = useState('');
  const [newPetNextVaccine, setNewPetNextVaccine] = useState('');
  const [newPetAppointment, setNewPetAppointment] = useState('');

  const handleAddPet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName) return;
    const newP: PetRecord = {
      id: `p-${Date.now()}`,
      name: newPetName,
      species: newPetSpecies,
      lastVaccine: newPetLastVaccine || '10 Janvier 2026',
      nextVaccine: newPetNextVaccine || '10 Janvier 2027',
      vetAppointment: newPetAppointment || undefined
    };
    setPets(prev => [...prev, newP]);

    // Agenda integration for vet & vaccine
    if (onAddEventDirect) {
      if (newP.nextVaccine) {
        onAddEventDirect({
          title: `💉 Vaccin : ${newPetName}`,
          type: 'other',
          dateTime: parseCustomDateToISO(newP.nextVaccine),
          time: '10:00',
          done: false
        });
      }
      if (newP.vetAppointment) {
        onAddEventDirect({
          title: `🐶 RDV Vétérinaire : ${newPetName}`,
          type: 'other',
          dateTime: parseCustomDateToISO(newP.vetAppointment),
          time: '14:00',
          done: false
        });
      }
    }

    setNewPetName('');
    setNewPetLastVaccine('');
    setNewPetNextVaccine('');
    setNewPetAppointment('');
    alert('🐶 Animal ajouté et rappels vétérinaires ajoutés à l\'agenda !');
  };

  // Pocket Money Form states
  const [allowanceChildId, setAllowanceChildId] = useState('3'); // Amadou
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [allowancePoints, setAllowancePoints] = useState('');

  const handleAddPocketMoney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowanceAmount && !allowancePoints) return;
    const amountVal = parseFloat(allowanceAmount) || 0;
    
    setPocketMoney(prev => prev.map(child => {
      if (child.id === allowanceChildId) {
        return {
          ...child,
          balance: child.balance + amountVal,
          points: child.points + (parseInt(allowancePoints) || 0)
        };
      }
      return child;
    }));

    // Financial transaction integration
    if (amountVal > 0 && onAddTransaction) {
      const childName = pocketMoney.find(c => c.id === allowanceChildId)?.name || 'Enfant';
      onAddTransaction({
        amount: amountVal,
        type: 'expense',
        category: 'Argent de Poche',
        date: new Date().toISOString().split('T')[0],
        title: `Distribution argent de poche à ${childName}`,
        memberName: childName
      });
    }
    
    setAllowanceAmount('');
    setAllowancePoints('');
    alert('💰 Argent / Points distribués et enregistrés en transaction financière !');
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
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-4xl mx-auto premium-glow-purple">
      
      {/* Back button if active sub-module */}
      {activeModule && (
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
              Ce module contient des données financières, administratives ou de sécurité hautement réservées à Papa & Maman.
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
                <p className="text-[10px] text-[#FF4D6D] font-bold text-center mt-1">Code PIN incorrect. Veuillez réessayer.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#6C5CFF] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:opacity-95 shadow-md flex items-center justify-center space-x-2"
            >
              <span>Déverrouiller l'accès</span>
            </button>
            
            <p className="text-[9px] text-white/30 font-medium text-center">💡 Indice Démo: Entrez 0000 ou 1234</p>
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
                <h1 className="text-xl font-extrabold text-white tracking-tight">OS Familial</h1>
                <p className="text-xs text-white/50 font-medium font-sans">11 modules connectés</p>
              </div>
            </div>

            {/* Elegant Static Premium Badge (No bypass buttons) */}
            {isPremium && (
              <div className="text-right">
                <span className="px-3.5 py-1.8 rounded-full bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white text-[9.5px] font-black uppercase tracking-wider shadow-md shadow-[#6C5CFF]/15 animate-fade-in">
                  ✨ PREMIUM
                </span>
              </div>
            )}
          </div>

          {/* Primary Cards Grid (Screen 4 pixel replica) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    if (mod.id === 'finances_hub' && !isParent && !authorizedModules.includes('finances_hub')) {
                      setActiveModule('finances_hub');
                    } else if (mod.id === 'finances_hub') {
                      setActiveTab('finances');
                    } else {
                      setActiveModule(mod.id);
                    }
                  }}
                  className={`glass-panel rounded-[28px] p-5 text-left border border-white/6 flex flex-col justify-between h-[180px] cursor-pointer transition-all hover:bg-white/8 hover:translate-y-[-2px] group`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`p-3 rounded-[18px] ${mod.color} border border-white/5 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-[10px]">
                      {mod.badge}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white tracking-wide">{mod.title}</h3>
                    <p className="text-[11px] text-white/50 leading-relaxed font-sans font-medium">{mod.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Secondary Modules Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">Outils complémentaires</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {secondaryModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      if (['conteur', 'atelier_art', 'peacemaker'].includes(mod.id) && !isPremium) {
                        onTriggerPaywall?.();
                        return;
                      }
                      setActiveModule(mod.id);
                    }}
                    className="glass-panel rounded-[24px] p-4 flex items-center justify-between border border-white/5 hover:bg-white/8 transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl ${mod.color} border border-white/5`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{mod.title}</h4>
                        <p className="text-[11px] text-white/50 font-sans">{mod.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </button>
                );
              })}
            </div>
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
              setActiveTab('finances');
            }}
            className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:scale-105 transition-all shadow-md"
          >
            Accéder au module Finances maintenant
          </button>
        </div>
      )}

      {/* SUB-MODULE 0.5: Carte Familiale */}
      {activeModule === 'carte' && (
        <FamilyMap members={members} activeMemberId={activeMemberId} onUpdateMemberProfile={onUpdateMemberProfile} />
      )}

      {/* SUB-MODULE 1: Documents Vault */}
      {activeModule === 'documents' && !isLockedForChild && (
        <CoffreFortAvance documents={documents} setDocuments={setDocuments} members={members} demarches={demarches} setDemarches={setDemarches} packs={justificatifPacks} setPacks={setJustificatifPacks} onAddEvent={onAddEvent} isPremium={isPremium} onTriggerPaywall={onTriggerPaywall} />
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
              <p className="text-xs text-white/50">Vaccination, suivi de croissance & Fiche SOS</p>
            </div>
            
            {/* Filtre de membre global pour la Santé */}
            {(healthSubTab === 'croissance' || healthSubTab === 'vaccins') && (
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

          {/* Sub-tab navigation */}
          <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-3 gap-1">
            <button onClick={() => setHealthSubTab('croissance')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'croissance' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              📈 Croissance
            </button>
            <button onClick={() => setHealthSubTab('vaccins')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'vaccins' ? 'bg-[#FF4D6D] text-white shadow-md' : 'text-white/40 hover:text-white/60'}`}>
              💉 Vaccins
            </button>
            <button onClick={() => setHealthSubTab('urgence')} className={`py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${healthSubTab === 'urgence' ? 'bg-[#FF4D6D] text-white shadow-md animate-pulse' : 'text-white/40 hover:text-white/60'}`}>
              🚨 Fiches d'Urgence
            </button>
          </div>

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
            const selectedMemberName = members.find(m => m.id === selectedHealthMemberId)?.name || 'Membre';

            const handleToggleVac = (id: string) => {
              if (setVaccines) {
                setVaccines(prev => prev.map(v => v.id === id ? { ...v, status: v.status === 'Fait' ? 'À faire' : 'Fait' } : v));
              }
            };

            const handleDeleteVac = (id: string) => {
              if (setVaccines) {
                setVaccines(prev => prev.filter(v => v.id !== id));
              }
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
                doctor: newVacDoctor.trim() || 'Médecin traitant'
              };
              if (setVaccines) {
                setVaccines(prev => [...prev, newVac]);
              }
              setNewVacName('');
              setNewVacDate('');
              setNewVacDoctor('');
            };

            return (
              <div className="space-y-4">
                <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <span>Statut des Vaccinations ({selectedMemberName})</span>
                  </h3>
                  <div className="space-y-1">
                    {activeVaccines.length > 0 ? (
                      activeVaccines.map((vac) => (
                        <div key={vac.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-b-0 text-xs">
                          <div>
                            <h4 className="font-bold text-white">{vac.name}</h4>
                            <p className="text-[9px] text-white/40 mt-0.5">{vac.doctor}</p>
                          </div>
                          <div className="flex items-center space-x-3 text-right">
                            <div>
                              <button
                                type="button"
                                onClick={() => handleToggleVac(vac.id)}
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black border transition-all cursor-pointer ${
                                  vac.status === 'Fait'
                                    ? 'bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]'
                                    : 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]'
                                }`}
                              >
                                {vac.status}
                              </button>
                              <p className="text-[9px] text-white/40 mt-0.5">{new Date(vac.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteVac(vac.id)}
                              className="p-1 hover:text-red-400 text-white/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
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
                        <label className="text-[9px] font-bold text-white/40 uppercase block">Médecin / Lieu</label>
                        <input 
                          type="text"
                          placeholder="ex: Pédiatre"
                          value={newVacDoctor}
                          onChange={(e) => setNewVacDoctor(e.target.value)}
                          className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                        />
                      </div>
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
              setEditBlood(mem.bloodGroup || 'O+');
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
                      <h3 className="text-sm font-extrabold text-white">FICHE D'URGENCE SOS</h3>
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
                                <label className="text-[9px] font-bold text-white/40 uppercase block">Nom Contact SOS</label>
                                <input 
                                  type="text"
                                  value={editEmergencyName}
                                  onChange={(e) => setEditEmergencyName(e.target.value)}
                                  className="w-full bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
                                  placeholder="ex: Papa"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 uppercase block">Téléphone SOS</label>
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
                              {member.bloodGroup || 'O+'}
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
                                <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-wider block">🚨 Contact d'urgence SOS</span>
                                <span className="text-white font-extrabold mt-0.5 block leading-relaxed">
                                  {((member as any).emergencyContactName || member.emergencyContact?.name || 'SOS')} •{' '}
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
                            <span>Modifier les données SOS</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                    La liste de courses est gérée par Papa & Maman. Demandez-leur d'activer la dérogation temporaire pour ajouter vos envies !
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
                        <option value="Produits Frais">Produits Frais</option>
                        <option value="Boucherie">Boucherie</option>
                        <option value="Boissons">Boissons</option>
                        <option value="Hygiène">Hygiène & Beauté</option>
                        <option value="Entretien">Entretien Maison</option>
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
                    if (normalized.includes('frais') || normalized.includes('lait') || normalized.includes('yaourt') || normalized.includes('crème') || normalized.includes('creme')) return 3;
                    if (normalized.includes('viande') || normalized.includes('poisson') || normalized.includes('boucherie') || normalized.includes('charcuterie')) return 4;
                    if (normalized.includes('épicerie') || normalized.includes('epicerie')) return 5;
                    if (normalized.includes('surgelé') || normalized.includes('surgele')) return 6;
                    if (normalized.includes('boisson')) return 7;
                    if (normalized.includes('hygiène') || normalized.includes('hygiene') || normalized.includes('soin')) return 8;
                    if (normalized.includes('maison') || normalized.includes('entretien') || normalized.includes('nettoyage')) return 9;
                    return 10;
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
                                  <div className="flex items-center gap-1.5">
                                    <h4 className={`text-xs sm:text-sm font-bold text-white ${item.checked ? 'line-through text-white/40' : ''}`}>
                                      {item.name}
                                    </h4>
                                    <span className="text-[8px] font-extrabold px-1 rounded bg-white/5 text-white/40 uppercase">
                                      {item.category}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                                    Qté: {item.quantity} • <span className={item.checked ? 'text-[#00D26A]' : (item.inStock ? 'text-[#00D26A]' : 'text-[#FF4D6D]')}>{item.checked ? 'Acheté' : (item.inStock ? 'En stock' : 'Rupture')}</span>
                                  </p>
                                  
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
                      'Boucherie',
                      'Produits Frais',
                      'Épicerie',
                      'Boissons',
                      'Hygiène',
                      'Entretien'
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
                                        <h4 className={`text-xs sm:text-sm font-bold text-white ${item.checked ? 'line-through text-white/40' : ''}`}>
                                          {item.name}
                                        </h4>
                                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                                          Qté: {item.quantity} • <span className={item.checked ? 'text-[#00D26A]' : (item.inStock ? 'text-[#00D26A]' : 'text-[#FF4D6D]')}>{item.checked ? 'Acheté' : (item.inStock ? 'En stock' : 'Rupture')}</span>
                                        </p>
                                        
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
                      <select 
                        value={mealImagePreset}
                        onChange={(e) => setMealImagePreset(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        {MEAL_IMAGE_PRESETS.map(pr => (
                          <option key={pr.url} value={pr.url}>{pr.name}</option>
                        ))}
                      </select>
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
                                {dish.image ? (
                                  <img 
                                    src={dish.image} 
                                    alt={dish.name} 
                                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                                  />
                                ) : (
                                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/5 text-white/60 shrink-0">
                                    <UtensilsCrossed className="w-4 h-4" />
                                  </div>
                                )}
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
              />
            ) : (
              <div className="p-8 text-center glass-panel border border-[#6C5CFF]/30 rounded-[32px] bg-gradient-to-b from-[#0F1E3D]/50 to-[#07111F]/80 space-y-4">
                <div className="inline-flex p-4 rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Éco-Chef IA & Anti-Gaspi 🥦 👑</h3>
                <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
                  Débloquez l'assistant culinaire intelligent MaFamille+ ! Éco-Chef analyse vos restes de frigo, planifie vos menus hebdomadaires équilibrés et génère des listes de courses en un clic.
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
      {activeModule === 'taches' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Tâches Ménagères & Missions</h2>
            <p className="text-xs text-white/50">Rotation automatique et argent de poche</p>
          </div>

          {/* Gamified Parent Validation Alert */}
          {isParent && tasks.some(t => t.done && !t.validatedByParent) && (
            <div className="p-4 rounded-[28px] bg-[#FFB020]/10 border border-[#FFB020]/20 space-y-3">
              <div className="flex items-center space-x-2 text-[#FFB020]">
                <Sparkles className="w-5 h-5 text-[#FFB020]" />
                <h4 className="text-xs font-bold uppercase tracking-wider">En attente de validation parentale</h4>
              </div>
              <div className="space-y-2">
                {tasks.filter(t => t.done && !t.validatedByParent).map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-white">{task.title}</p>
                      <p className="text-[10px] text-white/50">Effectué par {task.assignedMemberName} (+{task.rewardPoints} Pts)</p>
                    </div>
                    <button 
                      onClick={() => onValidateTask(task.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#00D26A] text-white text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                    >
                      Valider (+{formatMoney(task.rewardPoints / 10)})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">Tableau de répartition</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tasks.map((task) => {
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
                            onEditTask(
                              task.id,
                              editTaskTitle,
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

                return (
                  <div 
                    key={task.id}
                    className={`glass-panel rounded-[28px] p-4 border flex flex-col justify-between h-[130px] transition-all relative group ${
                      task.done 
                        ? task.validatedByParent 
                          ? 'border-[#00D26A]/30 bg-[#00D26A]/5 opacity-60' 
                          : 'border-[#FFB020]/30 bg-[#FFB020]/5' 
                        : 'border-white/8'
                    }`}
                  >
                    {/* Parent Hover/Group Quick Edit/Delete Actions */}
                    {isParent && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTaskId(task.id);
                            setEditTaskTitle(task.title);
                            setEditTaskPoints(task.rewardPoints);
                            setEditTaskRotation(task.rotation);
                            setEditTaskAssigneeId(task.assignedMemberId);
                          }}
                          className="p-1.5 bg-white/5 hover:bg-[#6C5CFF]/20 border border-white/10 hover:border-[#6C5CFF]/30 text-white hover:text-[#9E94FF] rounded-lg transition active:scale-95 cursor-pointer"
                          title="Modifier la tâche"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
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
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[8px] font-extrabold text-[#6C5CFF] uppercase tracking-widest bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 px-2 py-0.5 rounded-lg">
                          {task.rotation === 'daily' ? 'Quotidienne' : task.rotation === 'weekly' ? 'Hebdo' : 'Ponctuel'}
                        </span>
                        <h4 className={`text-xs sm:text-sm font-bold text-white mt-2 ${task.done ? 'line-through text-white/40' : ''}`}>
                          {task.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-extrabold text-[#6C5CFF] bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 px-2 py-0.5 rounded-lg shrink-0 mr-8">
                        +{task.rewardPoints} Pts
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                      <span className="text-[10px] text-white/50">Assigné : <strong className="text-white">{task.assignedMemberName}</strong></span>
                      {!task.done ? (
                        <button 
                          onClick={() => onToggleTask(task.id)}
                          className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white text-[10px] font-bold cursor-pointer"
                        >
                          Marquer fait
                        </button>
                      ) : (
                        <span className={`text-[10px] font-bold ${task.validatedByParent ? 'text-[#00D26A]' : 'text-[#FFB020]'}`}>
                          {task.validatedByParent ? 'Validé' : 'En attente'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODULE 5: École */}
      {activeModule === 'ecole' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Suivi Scolaire & Devoirs</h2>
            <p className="text-xs text-white/50">Emploi du temps, devoirs et bulletins</p>
          </div>

          {/* School Schedule */}
          <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#6C5CFF]" />
              <span>Emploi du temps ({activeMember?.name || 'Famille'})</span>
            </h3>
            <div className="space-y-2">
              {schedule.filter(s => {
                const isActiveParent = activeMember?.role === 'Chef de famille' || activeMember?.role === 'Gestionnaire';
                return isActiveParent ? true : s.studentId === activeMemberId;
              }).length > 0 ? (
                schedule
                  .filter(s => {
                    const isActiveParent = activeMember?.role === 'Chef de famille' || activeMember?.role === 'Gestionnaire';
                    return isActiveParent ? true : s.studentId === activeMemberId;
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
                const isActiveParent = activeMember?.role === 'Chef de famille' || activeMember?.role === 'Gestionnaire';
                return isActiveParent ? true : g.studentId === activeMemberId;
              }).length > 0 ? (
                grades
                  .filter(g => {
                    const isActiveParent = activeMember?.role === 'Chef de famille' || activeMember?.role === 'Gestionnaire';
                    return isActiveParent ? true : g.studentId === activeMemberId;
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
      {/* 6. Véhicules */}
      {activeModule === 'vehicules' && !isLockedForChild && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Gestion Véhicules</h2>
            <p className="text-xs text-white/50">Entretiens, contrôles et assurances</p>
          </div>

          <div className="space-y-4">
            {vehicles.map((v) => {
              const getVigilanceStatus = (dateStr: string) => {
                if (!dateStr) return { class: 'text-white/60', label: 'Inconnu' };
                const dateLower = dateStr.toLowerCase();
                if (dateLower.includes('2026') || dateLower.includes('juin') || dateLower.includes('juillet')) {
                  return { class: 'bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020]', label: 'Vigilance' };
                }
                if (dateLower.includes('2025') || dateLower.includes('passé')) {
                  return { class: 'bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] animate-pulse', label: 'Urgent' };
                }
                return { class: 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]', label: 'À jour' };
              };

              const ctStatus = getVigilanceStatus(v.technicalControl);
              const insStatus = getVigilanceStatus(v.insuranceExpiry);
              const revStatus = getVigilanceStatus(v.nextService);

              return (
                <div key={v.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-[#4F8CFF]/10 text-[#4F8CFF] border border-white/5">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{v.name}</h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">Plaque: {v.plate}</p>
                      </div>
                    </div>
                    {isParent && (
                      <div className="flex space-x-1.5">
                        <button 
                          type="button"
                          onClick={() => {
                            const newName = window.prompt("Modifier le modèle du véhicule :", v.name);
                            if (!newName) return;
                            const newPlate = window.prompt("Modifier la plaque d'immatriculation :", v.plate);
                            if (!newPlate) return;
                            setVehicles(prev => prev.map(item => item.id === v.id ? { ...item, name: newName, plate: newPlate } : item));
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition text-xs font-bold"
                        >
                          ✏️ Modifier
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (window.confirm("Supprimer ce véhicule ?")) {
                              setVehicles(prev => prev.filter(item => item.id !== v.id));
                            }
                          }}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition text-xs font-bold"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-white/40 font-semibold">Expiration Assurance :</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{v.insuranceExpiry}</span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${insStatus.class}`}>{insStatus.label}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/40 font-semibold">Contrôle Technique :</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{v.technicalControl}</span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${ctStatus.class}`}>{ctStatus.label}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-white/40 font-semibold">Dernière Révision :</p>
                      <p className="font-bold text-white mt-0.5">{v.lastService}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/40 font-semibold">Prochaine Révision :</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{v.nextService}</span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${revStatus.class}`}>{revStatus.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kilométrage Suivi */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <span className="text-white/40">Kilométrage actuel :</span>
                      <span className="font-extrabold text-[#4F8CFF]">{v.mileage || 0} km</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const newMileage = window.prompt(`Mettre à jour le kilométrage de ${v.name} (km) :`, String(v.mileage || 0));
                        if (newMileage === null) return;
                        setVehicles(prev => prev.map(item => item.id === v.id ? { ...item, mileage: Number(newMileage) } : item));
                      }}
                      className="text-[10px] font-extrabold text-[#4F8CFF] hover:underline"
                    >
                      ✏️ Mettre à jour
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulaire d'ajout de Véhicule */}
          <form onSubmit={handleAddVehicle} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
            <span className="text-[10px] font-bold text-[#4F8CFF] uppercase tracking-widest block flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-[#4F8CFF]" />
              <span>Ajouter un nouveau véhicule 🚗</span>
            </span>
            
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Marque / Modèle</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Peugeot 3008..."
                  value={newVehName}
                  onChange={(e) => setNewVehName(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>

              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Kilométrage initial</label>
                <input 
                  type="number" 
                  required
                  placeholder="ex: 45000"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Plaque d'Immatriculation</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: AA-123-BB..."
                  value={newVehPlate}
                  onChange={(e) => setNewVehPlate(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>

              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Échéance CT</label>
                <input 
                  type="text" 
                  placeholder="ex: 12 Octobre 2027"
                  value={newVehCT}
                  onChange={(e) => setNewVehCT(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Échéance Assurance</label>
                <input 
                  type="text" 
                  placeholder="ex: 24 Juin 2026"
                  value={newVehAssur}
                  onChange={(e) => setNewVehAssur(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Prochaine Révision</label>
                <input 
                  type="text" 
                  placeholder="ex: 14 Novembre 2026"
                  value={newVehService}
                  onChange={(e) => setNewVehService(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#4F8CFF] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#4F8CFF]/20"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Enregistrer le véhicule</span>
            </button>
          </form>
        </div>
      )}

      {/* 7. Logement */}
      {activeModule === 'logement' && !isLockedForChild && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Entretien Logement</h2>
            <p className="text-xs text-white/50">Maintenance, chaudière et interventions</p>
          </div>

          {/* View Toggle */}
          <div className="flex space-x-2">
            <button type="button" onClick={() => { setLogementViewMode('list'); setSelectedRoom(null); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${logementViewMode === 'list' ? 'bg-[#FFB020] text-black' : 'bg-white/5 text-white/50'}`}>
              📝 Vue Liste
            </button>
            <button type="button" onClick={() => setLogementViewMode('plan')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${logementViewMode === 'plan' ? 'bg-[#FFB020] text-black' : 'bg-white/5 text-white/50'}`}>
              🗺️ Carte Interactive
            </button>
            <button type="button" onClick={() => { setLogementViewMode('artisans'); setSelectedRoom(null); }} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${logementViewMode === 'artisans' ? 'bg-[#FFB020] text-black' : 'bg-white/5 text-white/50'}`}>
              👷 Artisans Partenaires
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
                      type="text" 
                      placeholder="ex: 20 Mai 2026"
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
        </div>
      )}

      {/* 8. Voyages */}
      {activeModule === 'voyages' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Carnet de Voyages</h2>
            <p className="text-xs text-white/50">Listes de bagages et réservations</p>
          </div>

          {trips.map((t) => (
            <div key={t.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#FF4D6D]/10 text-[#FF4D6D] border border-white/5">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.destination}</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">Dates: {t.startDate} - {t.endDate}</p>
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
                        onClick={() => {
                          const newDest = window.prompt("Modifier la destination :", t.destination);
                          if (!newDest) return;
                          const newBudget = window.prompt("Modifier le budget (€) :", String(t.budget));
                          if (newBudget === null) return;
                          setTrips(prev => prev.map(item => item.id === t.id ? { ...item, destination: newDest, budget: Number(newBudget) } : item));
                        }}
                        className="p-1 hover:bg-white/10 rounded text-[10px] font-bold"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (window.confirm("Supprimer ce projet de voyage ?")) {
                            setTrips(prev => prev.filter(item => item.id !== t.id));
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
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Réservations</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {t.bookingRefs.map((ref, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#07111F] border border-white/5 text-white font-medium">
                      {ref}
                    </div>
                  ))}
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
                    type="text" 
                    placeholder="ex: 15 Juillet 2026"
                    value={newTripStart}
                    onChange={(e) => setNewTripStart(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                  />
                </div>
                
                <div className="space-y-1.5 text-left font-medium font-sans">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date de Retour</label>
                  <input 
                    type="text" 
                    placeholder="ex: 22 Juillet 2026"
                    value={newTripEnd}
                    onChange={(e) => setNewTripEnd(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
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
              formatMoney={formatMoney} 
              isPremium={isPremium}
              onTriggerPaywall={onTriggerPaywall}
            />
          </div>
        </div>
      )}

      {/* 9. Animaux */}
      {activeModule === 'animaux' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Suivi Animaux</h2>
            <p className="text-xs text-white/50">Vaccins et rendez-vous vétérinaires</p>
          </div>

          {pets.map((p) => (
            <div key={p.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#00D26A]/10 text-[#00D26A] border border-white/5">
                    <Dog className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">{p.species}</p>
                  </div>
                </div>
                {isParent && (
                  <div className="flex space-x-1.5">
                    <button 
                      type="button"
                      onClick={() => {
                        const newName = window.prompt("Modifier le nom de l'animal :", p.name);
                        if (!newName) return;
                        const newSpecies = window.prompt("Modifier l'espèce / race :", p.species);
                        if (!newSpecies) return;
                        setPets(prev => prev.map(item => item.id === p.id ? { ...item, name: newName, species: newSpecies } : item));
                      }}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition text-xs font-bold"
                    >
                      ✏️ Modifier
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (window.confirm("Supprimer ce compagnon ?")) {
                          setPets(prev => prev.filter(item => item.id !== p.id));
                        }
                      }}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition text-xs font-bold"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-white/40 font-semibold">Dernier Vaccin :</p>
                  <p className="font-bold text-white mt-0.5">{p.lastVaccine}</p>
                </div>
                <div>
                  <p className="text-white/40 font-semibold">Prochain Vaccin :</p>
                  <p className="font-bold text-[#FFB020] mt-0.5">{p.nextVaccine}</p>
                </div>
                {p.vetAppointment && (
                  <div className="col-span-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Rendez-vous vétérinaire</p>
                    <p className="text-xs font-bold text-white mt-1">Le {p.vetAppointment} • Clinique Vétérinaire</p>
                  </div>
                )}
              </div>

              {/* Weight history tracking */}
              <div className="space-y-2 pt-3 border-t border-white/5 text-left">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center space-x-1.5">
                  <span>⚖️ Suivi de poids</span>
                </p>
                {p.weightHistory && p.weightHistory.length > 0 ? (
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                    {p.weightHistory.map((w, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 text-center shrink-0 min-w-[70px]">
                        <span className="text-[9px] text-white/40 block">{w.date}</span>
                        <span className="text-xs font-bold text-white block mt-0.5">{w.weight} kg</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-white/30 italic">Aucun poids enregistré.</p>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    const weight = window.prompt("Entrez le poids en kg (ex: 4.2) :");
                    if (!weight) return;
                    const newHist = [...(p.weightHistory || []), { date: new Date().toLocaleDateString('fr-FR'), weight: Number(weight) }];
                    setPets(prev => prev.map(item => item.id === p.id ? { ...item, weightHistory: newHist } : item));
                  }}
                  className="text-[10px] font-extrabold text-[#00D26A] hover:underline"
                >
                  + Enregistrer une pesée
                </button>
              </div>

              {/* Documents liés */}
              <div className="space-y-2 pt-3 border-t border-white/5 text-left">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Carnet de santé & Documents</p>
                <div className="space-y-1.5">
                  {documents.filter(doc => (p.documentIds || []).includes(doc.id)).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                      <span className="text-white font-medium">📄 {doc.name}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          if (doc.fileBase64) {
                            const w = window.open();
                            if (w) w.document.write(`<iframe src="${doc.fileBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                          } else {
                            alert("Ce document n'a pas de fichier associé.");
                          }
                        }}
                        className="text-[9px] text-[#6C5CFF] font-bold hover:underline"
                      >
                        Consulter
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const availableDocs = documents.filter(doc => !(p.documentIds || []).includes(doc.id));
                      if (availableDocs.length === 0) {
                        alert("Aucun nouveau document disponible dans le coffre-fort.");
                        return;
                      }
                      const list = availableDocs.map((d, i) => `${i + 1}. ${d.name}`).join('\n');
                      const choice = window.prompt(`Sélectionnez le numéro du document à lier :\n\n${list}`);
                      if (!choice) return;
                      const idx = Number(choice) - 1;
                      if (availableDocs[idx]) {
                        const updatedDocIds = [...(p.documentIds || []), availableDocs[idx].id];
                        setPets(prev => prev.map(item => item.id === p.id ? { ...item, documentIds: updatedDocIds } : item));
                      }
                    }}
                    className="text-[10px] font-extrabold text-[#6C5CFF] hover:underline block"
                  >
                    + Lier un document du Coffre-Fort
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Formulaire d'ajout d'Animal */}
          <form onSubmit={handleAddPet} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
            <span className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest block flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-[#00D26A]" />
              <span>Ajouter un animal au suivi 🐶</span>
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nom de l'Animal</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Filou..."
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Espèce / Race</label>
                <select
                  value={newPetSpecies}
                  onChange={(e) => setNewPetSpecies(e.target.value)}
                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Chien">Chien</option>
                  <option value="Chat">Chat</option>
                  <option value="Lapin">Lapin</option>
                  <option value="Oiseau">Oiseau</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Dernier Vaccin</label>
                <input 
                  type="text" 
                  placeholder="ex: 10 Janvier 2026"
                  value={newPetLastVaccine}
                  onChange={(e) => setNewPetLastVaccine(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Prochain Vaccin</label>
                <input 
                  type="text" 
                  placeholder="ex: 10 Janvier 2027"
                  value={newPetNextVaccine}
                  onChange={(e) => setNewPetNextVaccine(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Rdv Vétérinaire</label>
                <input 
                  type="text" 
                  placeholder="ex: 15 Juin 2026 à 14h"
                  value={newPetAppointment}
                  onChange={(e) => setNewPetAppointment(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#00D26A]/20"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Enregistrer l'animal</span>
            </button>
          </form>
        </div>
      )}

      {/* 10. Argent de Poche */}
      {activeModule === 'argent' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Argent de Poche</h2>
            <p className="text-xs text-white/50">Missions rémunérées et cagnottes des enfants</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(isParent ? pocketMoney : pocketMoney.filter(c => c.id === activeMemberId)).map((child) => (
              <div key={child.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={child.avatar} alt={child.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{child.name}</h3>
                      <p className="text-[10px] text-white/40">Enfant • Compte Épargne Connecté</p>
                    </div>
                  </div>
                  {isParent && (
                    <div className="flex space-x-1">
                      <button 
                        type="button"
                        onClick={() => {
                          const newBalance = window.prompt(`Modifier la cagnotte de ${child.name} (€) :`, String(child.balance));
                          if (newBalance === null) return;
                          const newPoints = window.prompt(`Modifier les points de ${child.name} :`, String(child.points));
                          if (newPoints === null) return;
                          setPocketMoney(prev => prev.map(c => c.id === child.id ? { ...c, balance: Number(newBalance), points: Number(newPoints) } : c));
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition text-[10px] font-bold"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Supprimer le compte d'argent de poche de ${child.name} ?`)) {
                            setPocketMoney(prev => prev.filter(c => c.id !== child.id));
                          }
                        }}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition text-[10px] font-bold"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Solde Cagnotte</span>
                    <span className="text-base font-extrabold text-[#00D26A] mt-0.5 block">{formatMoney(child.balance)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Points Actuels</span>
                    <span className="text-base font-extrabold text-[#6C5CFF] mt-0.5 block">{child.points} Pts</span>
                  </div>
                </div>

                {/* Objectif d'épargne */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-left space-y-2">
                  {child.goalTitle ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">🎯 {child.goalTitle}</span>
                        <span className="font-bold text-white/60">{child.balance.toFixed(2)}€ / {child.goalAmount}€</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] transition-all"
                          style={{ width: `${Math.min(100, (child.balance / (child.goalAmount || 1)) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-white/40">
                        <span>Progression: {Math.min(100, Math.round((child.balance / (child.goalAmount || 1)) * 100))}%</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setPocketMoney(prev => prev.map(c => c.id === child.id ? { ...c, goalTitle: undefined, goalAmount: undefined } : c));
                          }}
                          className="text-red-400 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">🎯 Objectif d'épargne</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const goalTitle = window.prompt("Quel est l'objectif d'épargne ? (ex: Vélo, Console...) :");
                          if (!goalTitle) return;
                          const goalAmount = window.prompt("Montant de l'objectif (€) :");
                          if (!goalAmount) return;
                          setPocketMoney(prev => prev.map(c => c.id === child.id ? { ...c, goalTitle, goalAmount: Number(goalAmount) } : c));
                        }}
                        className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] transition text-center border border-dashed border-white/20"
                      >
                        + Définir un objectif d'épargne
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    if (child.points >= 50) {
                      const amountEarned = child.points / 10;
                      setPocketMoney(prev => prev.map(c => {
                        if (c.id === child.id) {
                          return { ...c, balance: c.balance + amountEarned, points: 0 };
                        }
                        return c;
                      }));

                      // Financial transaction integration
                      if (onAddTransaction) {
                        onAddTransaction({
                          amount: amountEarned,
                          type: 'expense',
                          category: 'Argent de Poche',
                          date: new Date().toISOString().split('T')[0],
                          title: `Conversion points de ${child.name} en euros`,
                          memberName: child.name
                        });
                      }

                      alert(`🎉 Points convertis en euros pour ${child.name} ! (+${amountEarned.toFixed(2)} €)`);
                    } else {
                      alert("⚠️ Il faut au moins 50 points pour effectuer une conversion en argent de poche.");
                    }
                  }}
                  className="w-full py-2.5 rounded-[18px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Convertir les Points en Euros (€)
                </button>
              </div>
            ))}
          </div>

          {/* Outil de Distribution Parent (uniquement pour les parents) */}
          {isParent && (
            <form onSubmit={handleAddPocketMoney} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
              <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 text-[#6C5CFF]" />
                <span>Distribuer de l'Argent ou des Points (Accès Parent) 💰</span>
              </span>
              
              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="space-y-1.5 text-left font-medium font-sans">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Sélectionner l'Enfant</label>
                  <select
                    value={allowanceChildId}
                    onChange={(e) => setAllowanceChildId(e.target.value)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    {pocketMoney.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5 text-left font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Ajouter Euros (€)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 10"
                    value={allowanceAmount}
                    onChange={(e) => setAllowanceAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>

                <div className="space-y-1.5 text-left font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Ajouter Points (Pts)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 100"
                    value={allowancePoints}
                    onChange={(e) => setAllowancePoints(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#6C5CFF]/20"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Valider la distribution</span>
              </button>
            </form>
          )}

          {/* Défis de Famille Collaboratifs */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🎮</span>
              <h3 className="text-sm font-extrabold text-white">Défis de Famille</h3>
              <span className="text-[9px] font-bold text-[#6C5CFF] bg-[#6C5CFF]/10 px-2 py-0.5 rounded-full">{sharedQuests.length} actifs</span>
            </div>

            {sharedQuests.map(quest => {
              const pct = Math.min(100, Math.round((quest.current / quest.target) * 100));
              const isComplete = pct >= 100;
              const isGenerating = generatingQuestVisual === quest.id;
              
              return (
                <div key={quest.id} className={`glass-panel border rounded-[24px] p-4 space-y-3 relative overflow-hidden transition-all ${
                  isComplete ? 'border-[#00D26A]/30 bg-[#00D26A]/5' : 'border-white/8'
                }`}>
                  
                  {/* Visual Poster / Trophy Frame */}
                  {isGenerating ? (
                    <div className="w-full h-32 rounded-xl bg-slate-950 flex flex-col items-center justify-center space-y-2 border border-white/5">
                      <div className="w-8 h-8 rounded-full border border-dashed border-[#6C5CFF] animate-spin flex items-center justify-center">
                        <span className="text-xs">🪄</span>
                      </div>
                      <span className="text-[8px] font-black text-white/50 uppercase tracking-widest font-sans">
                        {questVisualStep === 1 ? "Polissage des reflets dorés..." : 
                         questVisualStep === 2 ? "Gravure de la récompense..." : 
                         "L'IA sculpte votre trophée..."}
                      </span>
                    </div>
                  ) : quest.posterUrl ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/5 shadow-md group">
                      <img 
                        src={quest.posterUrl} 
                        alt={quest.title} 
                        className="w-full h-full object-cover transition-transform duration-[6000ms] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[7px] font-extrabold text-[#FFB020] uppercase tracking-wider font-sans border border-white/5">
                        {isComplete ? "🏆 Trophée Débloqué" : "🎬 Affiche de Mission"}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white leading-relaxed flex-1">{quest.title}</h4>
                    {isParent && (
                      <button type="button" onClick={() => {
                        if (window.confirm('Supprimer ce défi ?')) {
                          setSharedQuests(prev => prev.filter(q => q.id !== quest.id));
                        }
                      }} className="p-1 hover:bg-red-500/10 rounded text-[10px] text-red-400 shrink-0">🗑️</button>
                    )}
                  </div>
                  <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${pct}%`, 
                        background: isComplete ? '#00D26A' : 'linear-gradient(90deg, #6C5CFF, #FF4D6D)',
                        boxShadow: isComplete ? '0 0 12px rgba(0,210,106,0.4)' : '0 0 12px rgba(108,92,255,0.3)'
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/50 font-bold">{quest.current} / {quest.target} • {pct}%</span>
                    <span className="text-[#FFB020] font-bold">🏆 {quest.reward}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {!isComplete && (
                      <button
                        type="button"
                        onClick={() => {
                          setSharedQuests(prev => prev.map(q => q.id === quest.id ? { ...q, current: Math.min(q.target, q.current + 1) } : q));
                        }}
                        className="py-2.5 rounded-xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/20 text-[#6C5CFF] text-[10px] font-extrabold hover:bg-[#6C5CFF]/25 transition cursor-pointer"
                      >
                        ➕ Contribuer (+1)
                      </button>
                    )}
                    
                    {/* Generative IA visual quest button */}
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        setGeneratingQuestVisual(quest.id);
                        setQuestVisualStep(1);

                        let promptStyle = '';
                        if (isComplete) {
                          // Générer un Trophée 3D Pixar en Or Massif de la Victoire basé sur la récompense !
                          promptStyle = `shiny premium 3D Pixar gold trophy award representation of reward ${quest.reward}, sitting on a polished wooden desk, soft glowing aura backdrops, cinematic dramatic key lighting, photorealistic highly detailed award trophy`;
                        } else {
                          // Générer une Affiche Épique de Mission de Cinéma Pixar 3D basée sur le titre du défi !
                          promptStyle = `highly detailed epic 3D Pixar animation movie poster illustrating: ${quest.title}, cheerful cute family characters working together as superheroes, colorful dust, bright sunny dynamic lighting`;
                        }

                        const finalPrompt = encodeURIComponent(promptStyle);
                        const seed = Math.floor(Math.random() * 1000000);
                        const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=600&height=400&nologo=true&seed=${seed}`;

                        setTimeout(() => {
                          setQuestVisualStep(2);
                          setTimeout(() => {
                            setQuestVisualStep(3);

                            const img = new Image();
                            img.src = generatedUrl;
                            img.onload = () => {
                              setSharedQuests(prev => prev.map(q => q.id === quest.id ? { ...q, posterUrl: generatedUrl } : q));
                              setGeneratingQuestVisual('');
                            };
                            img.onerror = () => {
                              // Fallback Unsplash
                              const unsplashUrl = isComplete 
                                ? `https://images.unsplash.com/photo-1578269174936-2709b5a5e023?w=600&q=80&sig=${seed}` // Trophy
                                : `https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80&sig=${seed}`; // Cooperation/Motivation
                              setSharedQuests(prev => prev.map(q => q.id === quest.id ? { ...q, posterUrl: unsplashUrl } : q));
                              setGeneratingQuestVisual('');
                            };
                          }, 1000);
                        }, 1000);
                      }}
                      className={`py-2.5 rounded-xl border text-[10px] font-extrabold transition cursor-pointer ${
                        quest.posterUrl 
                          ? 'border-[#FFB020]/25 bg-[#FFB020]/10 text-[#FFB020] hover:bg-[#FFB020]/15' 
                          : 'border-white/8 bg-white/5 text-white/50 hover:text-white hover:bg-white/8'
                      } ${!isComplete ? '' : 'col-span-2'}`}
                    >
                      {isComplete ? "🏆 Trophée de la Victoire IA" : quest.posterUrl ? "🪄 Regénérer Visuel" : "🪄 Affiche de Mission IA"}
                    </button>
                  </div>

                  {isComplete && (
                    <div className="text-center py-1 text-[10px] font-bold text-[#00D26A]">🎉 Défi accompli ! Récompense débloquée !</div>
                  )}
                </div>
              );
            })}

            {isParent && (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newQuestTitle || !newQuestReward) return;
                setSharedQuests(prev => [...prev, { id: `sq-${Date.now()}`, title: newQuestTitle, target: newQuestTarget, current: 0, reward: newQuestReward }]);
                setNewQuestTitle(''); setNewQuestReward('');
              }} className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-3">
                <span className="text-[9px] font-bold text-[#6C5CFF] uppercase tracking-widest block">➕ Créer un défi collaboratif</span>
                <input type="text" required placeholder="Titre du défi..." value={newQuestTitle} onChange={e => setNewQuestTitle(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="1" required value={newQuestTarget} onChange={e => setNewQuestTarget(Number(e.target.value))} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" placeholder="Objectif" />
                  <input type="text" required placeholder="Récompense 🏆" value={newQuestReward} onChange={e => setNewQuestReward(e.target.value)} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none" />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#6C5CFF] text-white text-xs font-extrabold cursor-pointer transition hover:opacity-90">Créer le Défi</button>
              </form>
            )}
          </div>
        </div>
      )}

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

      {/* 16. Atelier d'Art Céleste IA */}
      {activeModule === 'atelier_art' && (
        <AtelierArtIA 
          activeMemberId={activeMemberId}
          onBack={() => setActiveModule('')}
          setMemories={setMemories}
        />
      )}

      {/* 17. Répertoire Important (Contacts) */}
      {activeModule === 'contacts' && (
        <div className="space-y-6">
          {/* Bouton de retour vers le Hub */}
          <button
            onClick={() => setActiveModule('')}
            className="flex items-center space-x-2 text-white/60 hover:text-white font-sans text-xs font-bold cursor-pointer transition-all active:scale-95 py-2 px-3 rounded-xl bg-white/5 border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au Hub</span>
          </button>
          
          <ContactsImportants onTriggerSos={onTriggerSos} />
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

    </div>
  );
};
