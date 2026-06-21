import React, { useEffect, useState } from 'react';
import { 
  Menu, 
  Bell, 
  Brush, 
  ShoppingBasket, 
  HeartPulse, 
  MoreHorizontal,
  ChevronRight,
  Wifi,
  BookOpen,
  ShoppingCart,
  Clock,
  UtensilsCrossed,
  MessageCircle,
  Plane,
  Car,
  Calendar,
  Gift,
  FileText,
  Wrench,
  RefreshCw,
  Landmark,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Users,
  Search,
  X,
  StickyNote,
  Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Member, Dish, NotificationAlert, ChatGroup, ChatMessage, MemoryLog, ChoreTask, GroceryItem, Transaction, Trip, DocumentFile, SchoolTask, SavingGoal } from '../types';
import type { UnifiedEvent } from '../utils/agendaHelper';
import { buildSmartFamilyActions, filterSmartFamilyActions, getSmartFamilySetupProgress, type SmartFamilyAction, type SmartFamilyPreferences } from '../utils/smartFamily';
import { buildGlobalSearchIndex, searchGlobalIndex, type GlobalSearchResult } from '../utils/globalSearch';
import { familyContentService, type CloudFamilyMemo } from '../services/familyContentService';
import { MemberAvatar } from '../components/MemberAvatar';

type AccueilUnifiedEvent = UnifiedEvent & {
  type?: string;
  iconType?: string;
  sourceModule?: string;
  date?: string;
};

type FamilyMemo = CloudFamilyMemo;

const readFamilyMemos = (): FamilyMemo[] => {
  try {
    const cached = localStorage.getItem('mf_family_memos');
    const parsed = cached ? JSON.parse(cached) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const DishImage: React.FC<{ src: string | undefined; alt: string; className?: string }> = ({ src, alt, className = "w-16 h-16 rounded-[18px]" }) => {
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
      className={`${className} object-cover border border-white/10 shadow-lg shrink-0`}
    />
  );
};

interface AccueilProps {
  members: Member[];
  events: UnifiedEvent[];
  dishes: Dish[];
  tasks?: ChoreTask[];
  groceries?: GroceryItem[];
  transactions?: Transaction[];
  trips?: Trip[];
  documents?: DocumentFile[];
  schoolTasks?: SchoolTask[];
  alerts: NotificationAlert[];
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;
  onMenuClick: () => void;
  onAlertsClick: () => void;

  activeMemberId?: string;
  onProfileSwitcherOpen?: () => void;
  onAvatarClick?: () => void;
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
  onEventClick: (dateStr: string) => void;
  memories: MemoryLog[];
  onAddMemory: (newMemory: MemoryLog) => void;
  onDeleteMemory: (id: string) => void;
  onLikeMemory: (id: string, newLikesCount: number) => void;

  savingGoals?: SavingGoal[];
  onDeleteUnifiedEvent?: (id: string, moduleName: string) => Promise<void>;
  onArchiveUnifiedEvent?: (id: string, moduleName: string) => Promise<void>;
  activeFamilyName?: string;
  activeFoyerId?: string;
  onOpenSpaceSelector?: () => void;
  smartPreferences?: SmartFamilyPreferences;
  onGlobalSearchResultOpen?: (result: GlobalSearchResult) => void;
}

export const Accueil: React.FC<AccueilProps> = ({
  members,
  events,
  dishes,
  tasks = [],
  groceries = [],
  transactions = [],
  trips = [],
  documents = [],
  schoolTasks = [],
  alerts,
  setActiveTab,
  setActiveModule,
  onMenuClick,
  onAlertsClick,

  activeMemberId = '1',
  onProfileSwitcherOpen,
  onAvatarClick,
  chatGroups,
  chatMessages,
  memories,
  savingGoals = [],
  onEventClick,
  onDeleteUnifiedEvent,
  onArchiveUnifiedEvent,
  activeFoyerId,
  smartPreferences,
  onGlobalSearchResultOpen
}) => {
  const [selectedMealDay, setSelectedMealDay] = useState<string>('Lun');
  const [hiddenEventIds, setHiddenEventIds] = useState<string[]>([]);
  const [selectedEventForMenu, setSelectedEventForMenu] = useState<AccueilUnifiedEvent | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [todayScope, setTodayScope] = useState<'me' | 'family'>('family');
  const [familyMemos, setFamilyMemos] = useState<FamilyMemo[]>(readFamilyMemos);
  const [memoText, setMemoText] = useState('');
  const [memoPriority, setMemoPriority] = useState<FamilyMemo['priority']>('normal');
  const [memoAssignee, setMemoAssignee] = useState('all');
  const [memoComposerOpen, setMemoComposerOpen] = useState(false);

  const activeMember = members.find(m => m.id === activeMemberId) || members[0] || {
    id: activeMemberId || '1',
    name: 'Chargement...',
    role: 'Parent',
    photoUrl: '',
    allergies: [],
    treatments: [],
    emergencyContact: { name: '', phone: '', relation: '' }
  };
  const isChild = activeMember ? ['child', 'guest', 'Enfant', 'Invité'].includes(activeMember.role) : false;

  const persistFamilyMemos = (next: FamilyMemo[]) => {
    const limited = next.slice(0, 30);
    setFamilyMemos(limited);
    localStorage.setItem('mf_family_memos', JSON.stringify(limited));
  };

  useEffect(() => {
    if (!activeFoyerId) return;
    let cancelled = false;

    const syncFamilyMemos = async () => {
      const localMemos = readFamilyMemos();
      const cloudMemos = await familyContentService.fetchMemos(activeFoyerId);
      if (cancelled) return;

      if (cloudMemos.length > 0) {
        persistFamilyMemos(cloudMemos);
        return;
      }

      if (localMemos.length > 0) {
        await familyContentService.migrateLocalMemos(activeFoyerId, localMemos);
        if (!cancelled) persistFamilyMemos(localMemos);
      }
    };

    void syncFamilyMemos();
    return () => {
      cancelled = true;
    };
  }, [activeFoyerId]);

  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoText.trim()) return;
    const nextMemo: FamilyMemo = {
      id: `memo-${Date.now()}`,
      text: memoText.trim(),
      priority: memoPriority,
      assignedTo: memoAssignee,
      createdBy: activeMember.name,
      createdAt: new Date().toISOString(),
      done: false
    };
    const next = [nextMemo, ...familyMemos];
    persistFamilyMemos(next);
    if (activeFoyerId) void familyContentService.upsertMemo(activeFoyerId, nextMemo).catch(console.warn);
    setMemoText('');
    setMemoPriority('normal');
    setMemoAssignee('all');
    setMemoComposerOpen(false);
  };

  const handleToggleMemo = (memoId: string) => {
    const next = familyMemos.map(memo => memo.id === memoId ? { ...memo, done: !memo.done } : memo);
    persistFamilyMemos(next);
    const updated = next.find(memo => memo.id === memoId);
    if (activeFoyerId && updated) void familyContentService.upsertMemo(activeFoyerId, updated).catch(console.warn);
  };

  const handleDeleteMemo = (memoId: string) => {
    persistFamilyMemos(familyMemos.filter(memo => memo.id !== memoId));
    if (activeFoyerId) void familyContentService.deleteMemo(activeFoyerId, memoId).catch(console.warn);
  };

  const visibleMemos = familyMemos
    .filter(memo => !memo.done)
    .filter(memo => memo.assignedTo === 'all' || memo.assignedTo === activeMember.id || !isChild)
    .slice(0, 8);
  const [memoEvaluationTime] = useState(() => Date.now());

  const getMemoCardStyle = (priority: FamilyMemo['priority'], index: number) => {
    if (priority === 'urgent') return 'bg-[#FFD8E3] text-[#4B1020] border-[#FF9BAF] rotate-[1.2deg]';
    if (priority === 'important') return 'bg-[#FFF1A8] text-[#3E2604] border-[#EEC85C] -rotate-[1deg]';
    return index % 2 === 0
      ? 'bg-[#FFF7C7] text-[#3E2604] border-[#E9D678] rotate-[0.8deg]'
      : 'bg-[#F9DDE8] text-[#451426] border-[#E9AFC2] -rotate-[0.7deg]';
  };

  const getMemoAgeLabel = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    if (!Number.isFinite(created)) return 'à l’instant';
    const minutes = Math.max(0, Math.floor((memoEvaluationTime - created) / 60000));
    if (minutes < 1) return 'à l’instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days} j`;
  };

  // Compute unread messages count
  const unreadMessagesCount = chatMessages.filter(m => {
    const group = chatGroups.find(g => g.id === m.groupId);
    if (!group || !group.memberIds.includes(activeMemberId)) return false;
    return !m.readBy.includes(activeMemberId);
  }).length;

  const systemDate = new Date();
  
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayStr = getLocalDateString(systemDate);

  const getDaysDiff = (dateStr: string) => {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 0;
    const d1 = new Date(systemDate.getFullYear(), systemDate.getMonth(), systemDate.getDate());
    const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const personalScope = isChild || todayScope === 'me';
  const allUnifiedEvents: AccueilUnifiedEvent[] = (personalScope
    ? events.filter(e => !e.member_id || e.member_id === activeMember.id || e.event_type === 'school')
    : events
  ).filter(e => e && !hiddenEventIds.includes(e.id));

  const todayUnifiedEvents = allUnifiedEvents
    .filter(e => e.start_date === todayStr && !e.done)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const upcomingUnifiedEvents = allUnifiedEvents
    .filter(e => e.start_date > todayStr && !e.done)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Filtrer les plats du jour sélectionné
  const activeDishes = dishes.filter(d => d.day === selectedMealDay);

  const quickActions = [
    { label: 'Courses', icon: ShoppingBasket, tab: 'menu', module: 'courses', color: 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' },
    { label: 'Santé', icon: HeartPulse, tab: 'menu', module: 'sante', color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/20' },
    { label: 'Voyages', icon: Plane, tab: 'menu', module: 'voyages', color: 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20' },
    { label: 'Démarches', icon: FileText, tab: 'menu', module: 'demarches', color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 border-[#6C5CFF]/20' },
    { label: 'Contes', icon: BookOpen, tab: 'menu', module: 'conteur', color: 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' },
    { label: 'Messagerie', icon: MessageCircle, tab: 'menu', module: 'messagerie', color: 'text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20' }
  ];

  const connectedJourneys = [
    {
      title: 'Préparer un voyage',
      detail: 'Valises, budget, documents et planning',
      Icon: Plane,
      module: 'voyages',
      accent: 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20'
    },
    {
      title: 'Organiser un rendez-vous santé',
      detail: 'Agenda, rappels et dossier médical',
      Icon: HeartPulse,
      module: 'sante',
      accent: 'text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/20'
    },
    {
      title: 'Cuisiner avec les courses',
      detail: 'Liste d’achats et idées Éco-Chef',
      Icon: ShoppingBasket,
      module: 'courses',
      accent: 'text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20'
    },
    {
      title: 'Préparer des démarches',
      detail: 'Documents, justificatifs et échéances',
      Icon: FileText,
      module: 'documents',
      accent: 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20'
    }
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  // Dernières activités : 3 derniers événements passés ou d'aujourd'hui
  const lastActivities = (() => {
    const pastOrToday = allUnifiedEvents
      .filter(e => e.start_date <= todayStr)
      .sort((a, b) => b.start_date.localeCompare(a.start_date) || b.start_time.localeCompare(a.start_time));
    
    if (pastOrToday.length > 0) {
      return pastOrToday.slice(0, 3);
    }
    return allUnifiedEvents.slice(0, 3);
  })();

  const urgentUpcoming = upcomingUnifiedEvents.filter(e => getDaysDiff(e.start_date) <= 7).slice(0, 2);

  const activeTasks = tasks.filter(task => {
    if (!task || task.done || task.isArchived || task.status === 'validated') return false;
    if (!personalScope) return true;
    return task.assignedMemberId === activeMember.id || task.assignedMemberIds?.includes(activeMember.id);
  });

  const overdueTasks = activeTasks.filter(task => task.dueDate && task.dueDate < todayStr);
  const todayTasks = activeTasks.filter(task => task.dueDate === todayStr);
  const pendingGroceries = groceries.filter(item => item && !item.checked);
  const todayTransactionsTotal = transactions
    .filter(tx => tx.date === todayStr && !tx.isArchived)
    .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  const nextTrip = trips
    .filter(trip => trip.startDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const expiringDocuments = documents.filter(doc => {
    if (!doc.expiryDate || doc.isExpired) return doc.isExpired;
    const diff = getDaysDiff(doc.expiryDate);
    return diff >= 0 && diff <= 30;
  });

  const cockpitStats = [
    {
      label: 'Aujourd’hui',
      value: todayUnifiedEvents.length + todayTasks.length,
      detail: todayTasks.length > 0 ? `${todayTasks.length} tâche${todayTasks.length > 1 ? 's' : ''}` : 'Planning',
      accent: 'text-[#6C5CFF]',
      onClick: () => {
        setActiveTab('menu');
        setActiveModule('agenda');
      }
    },
    {
      label: 'À lire',
      value: unreadMessagesCount + unreadAlertsCount,
      detail: unreadMessagesCount > 0 ? `${unreadMessagesCount} message${unreadMessagesCount > 1 ? 's' : ''}` : `${unreadAlertsCount} alerte${unreadAlertsCount > 1 ? 's' : ''}`,
      accent: 'text-[#00D26A]',
      onClick: unreadMessagesCount > 0
        ? () => {
          setActiveTab('menu');
          setActiveModule('messagerie');
        }
        : onAlertsClick
    },
    {
      label: 'Courses',
      value: pendingGroceries.length,
      detail: pendingGroceries[0]?.name || 'Liste',
      accent: 'text-[#FFB020]',
      onClick: () => {
        setActiveTab('menu');
        setActiveModule('courses');
      }
    },
    {
      label: 'Budget jour',
      value: todayTransactionsTotal > 0 ? Math.round(todayTransactionsTotal) : 0,
      detail: todayTransactionsTotal > 0 ? '€ sortis/entrés' : 'Aucun mouvement',
      accent: 'text-[#FF4D6D]',
      onClick: () => setActiveTab('budget')
    }
  ];

  const cockpitPriorities: {
    id: string;
    title: string;
    detail: string;
    Icon: LucideIcon;
    tone: string;
    onClick: () => void;
  }[] = [];

  if (overdueTasks.length > 0) {
    cockpitPriorities.push({
      id: 'overdue-tasks',
      title: `${overdueTasks.length} tâche${overdueTasks.length > 1 ? 's' : ''} en retard`,
      detail: overdueTasks[0]?.title || 'Ouvrir les missions',
      Icon: Brush,
      tone: 'border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]',
      onClick: () => {
        setActiveTab('menu');
        setActiveModule('taches');
      }
    });
  }

  if (pendingGroceries.length > 0) {
    cockpitPriorities.push({
      id: 'groceries',
      title: `${pendingGroceries.length} article${pendingGroceries.length > 1 ? 's' : ''} à acheter`,
      detail: pendingGroceries.slice(0, 2).map(item => item.name).join(', '),
      Icon: ShoppingCart,
      tone: 'border-[#FFB020]/25 bg-[#FFB020]/10 text-[#FFB020]',
      onClick: () => {
        setActiveTab('menu');
        setActiveModule('courses');
      }
    });
  }

  if (nextTrip) {
    const tripDays = getDaysDiff(nextTrip.startDate);
    const remainingItems = nextTrip.checklist?.filter(item => !item.done).length || 0;
    cockpitPriorities.push({
      id: 'next-trip',
      title: tripDays <= 0 ? `Départ aujourd'hui` : `Voyage dans ${tripDays} jour${tripDays > 1 ? 's' : ''}`,
      detail: `${nextTrip.destination}${remainingItems > 0 ? ` • ${remainingItems} point${remainingItems > 1 ? 's' : ''} à préparer` : ''}`,
      Icon: Plane,
      tone: 'border-[#4F8CFF]/25 bg-[#4F8CFF]/10 text-[#4F8CFF]',
      onClick: () => {
        setActiveTab('menu');
        setActiveModule('voyages');
      }
    });
  }

  if (expiringDocuments.length > 0) {
    cockpitPriorities.push({
      id: 'documents',
      title: `${expiringDocuments.length} document${expiringDocuments.length > 1 ? 's' : ''} à vérifier`,
      detail: expiringDocuments[0]?.name || 'Ouvrir le coffre-fort',
      Icon: FileText,
      tone: 'border-[#6C5CFF]/25 bg-[#6C5CFF]/10 text-[#9E94FF]',
      onClick: () => {
        setActiveTab('menu');
        setActiveModule('documents');
      }
    });
  }

  if (cockpitPriorities.length === 0) {
    cockpitPriorities.push({
      id: 'clear',
      title: 'Rien ne bloque la journée',
      detail: 'Le foyer est à jour pour le moment',
      Icon: CheckCircle2,
      tone: 'border-[#00D26A]/20 bg-[#00D26A]/10 text-[#00D26A]',
      onClick: () => setActiveTab('timeline')
    });
  }
  const activityCards = (() => {
    const cards: {
      id: string;
      title: string;
      detail: string;
      tone: string;
      Icon: LucideIcon;
      onClick: () => void;
    }[] = [];

    if (unreadMessagesCount > 0) {
      cards.push({
        id: 'messages',
        title: `${unreadMessagesCount} message${unreadMessagesCount > 1 ? 's' : ''} non lu${unreadMessagesCount > 1 ? 's' : ''}`,
        detail: 'Répondre aux conversations familiales',
        tone: 'from-[#00D26A]/20 to-[#00D26A]/5 border-[#00D26A]/20 text-[#00D26A]',
        Icon: MessageCircle,
        onClick: () => {
          setActiveTab('menu');
          setActiveModule('messagerie');
        }
      });
    }

    if (unreadAlertsCount > 0) {
      cards.push({
        id: 'alerts',
        title: `${unreadAlertsCount} alerte${unreadAlertsCount > 1 ? 's' : ''} à lire`,
        detail: 'Vérifier les notifications importantes',
        tone: 'from-[#FF4D6D]/20 to-[#FF4D6D]/5 border-[#FF4D6D]/20 text-[#FF4D6D]',
        Icon: Bell,
        onClick: onAlertsClick
      });
    }

    if (todayUnifiedEvents.length > 0) {
      cards.push({
        id: 'today',
        title: `${todayUnifiedEvents.length} action${todayUnifiedEvents.length > 1 ? 's' : ''} aujourd'hui`,
        detail: todayUnifiedEvents[0]?.title || 'Voir le planning du jour',
        tone: 'from-[#6C5CFF]/20 to-[#6C5CFF]/5 border-[#6C5CFF]/20 text-[#9E94FF]',
        Icon: Calendar,
        onClick: () => {
          setActiveTab('menu');
          setActiveModule('agenda');
        }
      });
    }

    urgentUpcoming.forEach((event) => {
      const days = getDaysDiff(event.start_date);
      cards.push({
        id: `upcoming-${event.id}`,
        title: days <= 1 ? 'À préparer demain' : `À préparer dans ${days} jours`,
        detail: event.title,
        tone: 'from-[#FFB020]/20 to-[#FFB020]/5 border-[#FFB020]/20 text-[#FFB020]',
        Icon: Clock,
        onClick: () => handleEventClick(event)
      });
    });

    if (cards.length === 0) {
      cards.push({
        id: 'calm',
        title: 'Tout est calme',
        detail: 'Aucune urgence familiale pour le moment',
        tone: 'from-white/10 to-white/5 border-white/8 text-white/60',
        Icon: CheckCircle2,
        onClick: () => {
          setActiveTab('timeline');
        }
      });
    }

    return cards.slice(0, 4);
  })();

  const rawSmartActions = buildSmartFamilyActions({
    activeMemberId,
    members,
    events,
    tasks,
    groceries,
    transactions,
    trips,
    documents,
    dishes,
    schoolTasks,
    chatGroups,
    chatMessages
  });
  const smartActions = filterSmartFamilyActions(rawSmartActions, smartPreferences);
  const smartContext = {
    activeMemberId,
    members,
    events,
    tasks,
    groceries,
    transactions,
    trips,
    documents,
    dishes,
    schoolTasks,
    chatGroups,
    chatMessages
  };
  const setupActions = smartActions.filter((action) => action.category === 'setup');
  const setupProgress = getSmartFamilySetupProgress(smartContext);
  const setupPercent = setupProgress.percent;

  const getSmartActionPresentation = (action: SmartFamilyAction) => {
    if (action.category === 'setup') {
      return { Icon: Users, tone: 'border-[#6C5CFF]/25 bg-[#6C5CFF]/10 text-[#9E94FF]' };
    }
    if (action.category === 'parent') {
      return { Icon: ShieldAlert, tone: 'border-[#FFB020]/25 bg-[#FFB020]/10 text-[#FFB020]' };
    }
    if (action.category === 'child') {
      return { Icon: GraduationCap, tone: 'border-[#4F8CFF]/25 bg-[#4F8CFF]/10 text-[#4F8CFF]' };
    }
    if (action.priority === 'high') {
      return { Icon: Bell, tone: 'border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]' };
    }
    return { Icon: Sparkles, tone: 'border-[#00D26A]/25 bg-[#00D26A]/10 text-[#00D26A]' };
  };

  const openSmartAction = (action: SmartFamilyAction) => {
    setActiveTab(action.target.tab);
    setActiveModule(action.target.module);
  };

  const globalSearchIndex = buildGlobalSearchIndex({
    members,
    events,
    tasks,
    groceries,
    transactions,
    documents,
    trips,
    schoolTasks,
    dishes,
    chatGroups,
    chatMessages,
    alerts,
    memories,
    savingGoals
  });

  const globalSearchResults = searchGlobalIndex(globalSearchQuery, globalSearchIndex, 10);

  const openSearchResult = (result: GlobalSearchResult) => {
    if (onGlobalSearchResultOpen) {
      onGlobalSearchResultOpen(result);
      setGlobalSearchOpen(false);
      setGlobalSearchQuery('');
      return;
    }
    if (result.focus?.type === 'agenda_date') {
      onEventClick(result.focus.value);
      setGlobalSearchOpen(false);
      setGlobalSearchQuery('');
      return;
    }
    setActiveTab(result.target.tab);
    setActiveModule(result.target.module);
    setGlobalSearchOpen(false);
    setGlobalSearchQuery('');
  };

  const getEventIconAndColor = (e: AccueilUnifiedEvent) => {
    const type = String(e.event_type || e.type || '');
    switch (type) {
      case 'trip':
      case 'social':
        return { Icon: Plane, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'demarche':
      case 'other':
        return { Icon: FileText, cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'schoolTask':
      case 'school':
        return { Icon: BookOpen, cls: 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20' };
      case 'task':
        return { Icon: Brush, cls: 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20' };
      case 'vaccine':
      case 'medical':
      case 'pet_vac':
      case 'pet_vet':
        return { Icon: HeartPulse, cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'abonnement':
      case 'bill':
        return { Icon: RefreshCw, cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
      case 'vehicle_tc':
      case 'vehicle_ins':
      case 'veh-tc':
      case 'veh-ins':
        return { Icon: Car, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'maintenance':
      case 'maint':
        return { Icon: Wrench, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'birthday':
      case 'bday':
        return { Icon: Gift, cls: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
      default:
        if (e.iconType === 'medical') {
          return { Icon: HeartPulse, cls: 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20' };
        } else if (e.iconType === 'bill') {
          return { Icon: Wifi, cls: 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20' };
        } else if (e.iconType === 'grocery') {
          return { Icon: ShoppingCart, cls: 'bg-[#FF4D6D]/10 text-[#FF4D6D] border-[#FF4D6D]/20' };
        }
        return { Icon: Calendar, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  const handleEventClick = (event: AccueilUnifiedEvent) => {
    const sourceModule = event.source_module || event.sourceModule;
    const eventDate = event.start_date || event.date || todayStr;
    switch (sourceModule) {
      case 'voyages':
        setActiveTab('menu');
        setActiveModule('voyages');
        break;
      case 'demarches':
        setActiveTab('menu');
        setActiveModule('demarches');
        break;
      case 'ecole':
        setActiveTab('menu');
        setActiveModule('ecole');
        break;
      case 'taches':
        setActiveTab('menu');
        setActiveModule('taches');
        break;
      case 'sante':
        setActiveTab('menu');
        setActiveModule('sante');
        break;
      case 'budget':
        setActiveTab('budget');
        break;
      case 'vehicules':
        setActiveTab('menu');
        setActiveModule('vehicules');
        break;
      case 'logement':
        setActiveTab('menu');
        setActiveModule('logement');
        break;
      case 'membres':
        setActiveTab('menu');
        setActiveModule('membres');
        break;
      case 'agenda':
      default:
        onEventClick(eventDate);
        break;
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto premium-glow-purple">
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onMenuClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
              {activeMember 
                ? `Bonjour ${activeMember.name} ! ${['Chef de famille', 'Gestionnaire', 'admin', 'parent', 'Parent'].includes(activeMember.role) ? '👑' : '👋'}`
                : 'Bonjour ! 👋'}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-[11px] text-white/50 font-medium">Famille :</p>
              <span className="text-[11px] font-bold text-white/65">
                {members.length} membre{members.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setGlobalSearchOpen(true)}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white relative transition-all cursor-pointer"
            title="Recherche globale"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Nouveau bouton Messagerie 💬 */}
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('messagerie');
            }}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white relative transition-all cursor-pointer"
            title="Messagerie"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00D26A] rounded-full ring-2 ring-[#07111F] animate-pulse"></span>
            )}
          </button>

          <button 
            onClick={onAlertsClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white relative transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF4D6D] rounded-full ring-2 ring-[#07111F]"></span>
            )}
          </button>
          
          <button 
            onClick={onProfileSwitcherOpen || onAvatarClick}
            className="relative cursor-pointer transition-all hover:scale-105 active:scale-95 border border-white/10 rounded-full p-0.5"
            title="Changer de profil"
          >
            <MemberAvatar name={activeMember.name} photoUrl={activeMember.photoUrl} className="w-10 h-10 rounded-full border border-white/10" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00D26A] rounded-full border-2 border-[#07111F]"></span>
          </button>
        </div>
      </div>

      {/* Vue familiale intelligente */}
      <div className="glass-panel rounded-[32px] border border-white/10 p-4 sm:p-5 space-y-4 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-40 h-40 bg-[#6C5CFF]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-32 h-32 bg-[#00D26A]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Vue famille</h2>
            <p className="text-[11px] text-white/50 font-semibold mt-1">
              Vue rapide de ce qui mérite votre attention maintenant.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isChild && (
              <div className="flex rounded-xl border border-white/8 bg-white/5 p-1">
                {([
                  ['me', 'Pour moi'],
                  ['family', 'Famille']
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTodayScope(value)}
                    className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black transition-colors ${todayScope === value ? 'bg-[#6C5CFF] text-white' : 'text-white/45 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className="px-3 py-2 rounded-2xl bg-white/5 border border-white/8 text-[10px] font-black text-white/65 hover:text-white hover:bg-white/10 transition-all"
            >
              Journal
            </button>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {cockpitStats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              className="rounded-[22px] bg-white/[0.035] hover:bg-white/[0.07] border border-white/8 p-3 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-[9px] font-black text-white/35 uppercase tracking-wider block">{stat.label}</span>
              <span className={`text-2xl font-black block mt-1 ${stat.accent}`}>{stat.value}</span>
              <span className="text-[10px] text-white/50 font-semibold truncate block mt-0.5">{stat.detail}</span>
            </button>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {cockpitPriorities.slice(0, 4).map((priority) => {
            const Icon = priority.Icon;
            return (
              <button
                key={priority.id}
                type="button"
                onClick={priority.onClick}
                className={`rounded-[24px] border p-4 text-left transition-all hover:bg-white/8 active:scale-[0.98] ${priority.tone}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-black/15 flex items-center justify-center border border-white/8 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-white truncate">{priority.title}</h3>
                    <p className="text-[10px] text-white/55 font-semibold mt-1 line-clamp-2">{priority.detail}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mots de la famille */}
      <div className="glass-panel rounded-[28px] border border-[#FFB020]/18 p-4 sm:p-5 space-y-4 bg-[#FFB020]/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-[#FFB020]" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Mots de la famille</h2>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="rounded-2xl border border-white/8 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white/55">
              {visibleMemos.length}
            </span>
            <button
              type="button"
              onClick={() => setMemoComposerOpen(prev => !prev)}
              className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] text-white/45 hover:text-white hover:bg-white/10 transition flex items-center justify-center"
              aria-label="Ajouter un mot"
            >
              {memoComposerOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {memoComposerOpen && (
          <form onSubmit={handleAddMemo} className="rounded-[24px] border border-white/10 bg-black/15 p-3 grid grid-cols-1 lg:grid-cols-[1fr_110px_150px_auto] gap-2">
            <input
              type="text"
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="ex: Papi & Mamie arrivent samedi midi..."
              className="rounded-2xl border border-white/8 bg-white/[0.06] px-4 py-3 text-xs font-semibold text-white placeholder-white/35 outline-none focus:border-[#FFB020]/40"
              autoFocus
            />
            <select
              value={memoPriority}
              onChange={(e) => setMemoPriority(e.target.value as FamilyMemo['priority'])}
              className="rounded-2xl border border-white/8 bg-[#0F1E36] px-3 py-3 text-xs font-bold text-white outline-none"
            >
              <option value="normal">Doux</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={memoAssignee}
              onChange={(e) => setMemoAssignee(e.target.value)}
              className="rounded-2xl border border-white/8 bg-[#0F1E36] px-3 py-3 text-xs font-bold text-white outline-none"
            >
              <option value="all">Toute la famille</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-[#FFB020] px-4 py-3 text-xs font-black text-[#07111F] flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Publier
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleMemos.map((memo, index) => {
              const assignee = memo.assignedTo === 'all'
                ? 'Toute la famille'
                : members.find(member => member.id === memo.assignedTo)?.name || 'Membre';
              return (
                <article
                  key={memo.id}
                  className={`relative min-h-[180px] rounded-[3px] border px-5 pb-5 pt-7 shadow-[0_18px_28px_rgba(0,0,0,0.22)] transition-transform hover:scale-[1.01] before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,0.35),rgba(255,255,255,0)_42%),repeating-linear-gradient(0deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_28px)] before:pointer-events-none ${getMemoCardStyle(memo.priority, index)}`}
                >
                  <div className="absolute left-1/2 -top-3 h-7 w-20 -translate-x-1/2 rotate-[-2deg] rounded-sm bg-white/45 shadow-sm backdrop-blur-[1px]" />
                  <div className="relative flex h-full flex-col justify-between gap-6">
                    <p className="font-serif text-[25px] sm:text-[28px] font-black italic leading-tight break-words drop-shadow-[0_1px_0_rgba(255,255,255,0.25)]">
                      {memo.text}
                    </p>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold opacity-70 truncate">pour {assignee}</p>
                        <p className="text-xs font-semibold opacity-60 truncate">par {memo.createdBy} · {getMemoAgeLabel(memo.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleMemo(memo.id)}
                          className="rounded-full bg-black/10 px-3 py-2 text-[10px] font-black hover:bg-black/15"
                        >
                          Fait
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemo(memo.id)}
                          className="rounded-full bg-black/10 p-2 hover:bg-black/15"
                          aria-label="Supprimer le mot"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>

        {visibleMemos.length === 0 && !memoComposerOpen && (
          <p className="text-xs font-bold text-white/35">Aucun mot affiché.</p>
        )}
      </div>

      {/* Démarrage guidé */}
      {setupActions.length > 0 && (
        <div className="glass-panel rounded-[28px] border border-[#6C5CFF]/20 p-4 sm:p-5 bg-[#6C5CFF]/5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFB020]" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Démarrage guidé</h2>
              </div>
              <p className="text-[11px] text-white/50 font-semibold mt-1">
                Quelques réglages suffisent pour rendre le foyer plus clair au quotidien.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-lg font-black text-[#9E94FF]">{setupPercent}%</span>
              <p className="text-[9px] text-white/35 font-black uppercase tracking-wider">configuré</p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6C5CFF] to-[#00D26A]"
              style={{ width: `${setupPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {setupActions.slice(0, 3).map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => openSmartAction(action)}
                className="rounded-[20px] bg-white/[0.04] border border-white/8 p-3 text-left hover:bg-white/8 transition-all active:scale-[0.98]"
              >
                <p className="text-xs font-black text-white truncate">{action.title}</p>
                <p className="text-[10px] text-white/45 font-semibold mt-1 line-clamp-2">{action.detail}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions recommandées */}
      {smartActions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFB020]" />
              <span>Actions recommandées</span>
            </h3>
            <span className="text-[10px] font-black text-white/35 uppercase tracking-wider">
              Sans IA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {smartActions.slice(0, 4).map((action) => {
              const { Icon, tone } = getSmartActionPresentation(action);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => openSmartAction(action)}
                  className={`rounded-[24px] border p-4 text-left transition-all hover:bg-white/8 active:scale-[0.98] ${tone}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-black/15 flex items-center justify-center border border-white/8 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-xs font-black text-white truncate">{action.title}</h4>
                        {action.priority === 'high' && <span className="w-2 h-2 rounded-full bg-[#FF4D6D] shrink-0" />}
                      </div>
                      <p className="text-[10px] text-white/55 font-semibold mt-1 line-clamp-2">{action.detail}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Centre d'activité familial */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D26A]" />
            <span>Centre d'activité</span>
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
          >
            Historique <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {activityCards.map((card) => {
            const Icon = card.Icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className={`text-left rounded-[24px] p-4 border bg-gradient-to-br ${card.tone} active:scale-[0.98] transition-all overflow-hidden relative`}
              >
                <div className="absolute -right-5 -bottom-6 w-20 h-20 rounded-full bg-white/5 blur-xl pointer-events-none" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">{card.title}</p>
                    <p className="text-[10px] text-white/55 font-semibold mt-1 line-clamp-2">{card.detail}</p>
                  </div>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. À ne pas manquer aujourd'hui Section (max 3 items) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D] animate-pulse" />
            <span>À ne pas manquer aujourd'hui</span>
          </h3>
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('agenda');
            }}
            className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
          >
            Voir tout <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {todayUnifiedEvents.length > 0 ? (
            todayUnifiedEvents.slice(0, 3).map((event) => {
              const { Icon, cls } = getEventIconAndColor(event);
              const memberId = event.member_id;
              const linkedMember = memberId ? members.find(m => m.id === memberId) : null;
              return (
                <div 
                  key={event.id} 
                  className="w-full text-left glass-panel rounded-[28px] p-4 flex items-center justify-between border border-white/8 transition-all hover:bg-white/10 group relative"
                >
                  <div 
                    onClick={() => handleEventClick(event)}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className={`p-3 rounded-[18px] ${cls} border shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h4>
                      <p className="text-[11px] text-white/50 font-medium truncate">
                        {linkedMember ? `${linkedMember.name} • ` : ''}
                        {event.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 flex items-center space-x-2 relative">
                    <span className="text-[10px] font-bold text-white/70 bg-white/5 px-2.5 py-1.5 rounded-[12px] border border-white/5">
                      {event.start_time || 'Journée'}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventForMenu(event);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer text-white/60 hover:text-white transition-colors"
                      title="Options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full glass-panel rounded-[28px] p-5 text-center text-xs text-white/30 border border-white/6">
              Aucun événement prévu pour aujourd'hui. Profitez de votre journée ! ✨
            </div>
          )}
        </div>
      </div>

      {/* 3. Section Prochainement (max 3 items) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CFF]" />
            <span>Prochainement</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {upcomingUnifiedEvents.length > 0 ? (
            upcomingUnifiedEvents.slice(0, 3).map((event) => {
              const { Icon, cls } = getEventIconAndColor(event);
              const memberId = event.member_id;
              const linkedMember = memberId ? members.find(m => m.id === memberId) : null;
              const eventDate = event.start_date;
              const daysDiff = getDaysDiff(eventDate);
              
              let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              if (daysDiff < 7) {
                badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
              } else if (daysDiff < 30) {
                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              }

              const daysStr = daysDiff === 1 ? "Demain" : `Dans ${daysDiff} jours`;
              const dateFr = new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

              return (
                <div 
                  key={event.id} 
                  className="w-full text-left glass-panel rounded-[28px] p-4 flex items-center justify-between border border-white/8 transition-all hover:bg-white/10 group relative"
                >
                  <div 
                    onClick={() => handleEventClick(event)}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className={`p-3 rounded-[18px] ${cls} border shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h4>
                      <p className="text-[11px] text-white/50 font-medium truncate">
                        {linkedMember ? `${linkedMember.name} • ` : ''}
                        {dateFr}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 flex items-center space-x-2 relative">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-[12px] border ${badgeColor} tracking-wider`}>
                      {daysStr}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventForMenu(event);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer text-white/60 hover:text-white transition-colors"
                      title="Options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full glass-panel rounded-[28px] p-5 text-center text-xs text-white/30 border border-white/6">
              Aucun événement à venir.
            </div>
          )}
        </div>
      </div>

      {/* 4. & 5. Ma Commune & Mon Établissement Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ma Commune */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/8 flex flex-col justify-between space-y-4 hover:bg-white/[0.06] transition-all relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-start space-x-3">
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-[#FFB020] shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Ma Commune</h4>
              <p className="text-xs text-white/50 mt-1 font-medium">Aucune commune associée</p>
            </div>
          </div>
          <button 
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
            onClick={() => {
              alert("🏛️ Service Ma Commune bientôt disponible !");
            }}
          >
            Découvrir
          </button>
        </div>

        {/* Mon Établissement */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/8 flex flex-col justify-between space-y-4 hover:bg-white/[0.06] transition-all relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-start space-x-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#4F8CFF] shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Mon Établissement</h4>
              <p className="text-xs text-white/50 mt-1 font-medium">Aucun établissement associé</p>
            </div>
          </div>
          <button 
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
            onClick={() => {
              alert("🏫 Service Mon Établissement bientôt disponible !");
            }}
          >
            Découvrir
          </button>
        </div>
      </div>

      {/* 6. Accès rapides (grid 3x2 on mobile, 6x1 on desktop) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Accès rapides</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(action.tab);
                  if (action.module) setActiveModule(action.module);
                }}
                className="glass-panel rounded-[24px] p-3.5 flex flex-col items-center justify-center space-y-2 border border-white/6 cursor-pointer hover:bg-white/8 active:scale-95 transition-all text-center"
              >
                <div className={`p-3 rounded-[18px] ${action.color} border border-white/5 transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white/70 tracking-wide">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parcours connectés */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parcours familiaux</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {connectedJourneys.map((journey) => {
            const Icon = journey.Icon;
            return (
              <button
                key={journey.title}
                type="button"
                onClick={() => {
                  setActiveTab('menu');
                  setActiveModule(journey.module);
                }}
                className="glass-panel rounded-[24px] p-4 border border-white/6 text-left hover:bg-white/8 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-[18px] border shrink-0 ${journey.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate">{journey.title}</h4>
                    <p className="text-[10px] text-white/45 font-semibold mt-1 leading-normal">{journey.detail}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Menu de la semaine Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Menu de la semaine</h3>
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('menus');
            }}
            className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
          >
            Voir le menu <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {/* Days selector bar */}
        <div className="glass-panel rounded-[24px] p-2 flex justify-between items-center border border-white/5">
          {daysOfWeek.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedMealDay(day)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                selectedMealDay === day
                  ? 'bg-[#6C5CFF] text-white shadow-[0_4px_10px_rgba(108,92,255,0.3)]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Selected Day Meals card */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/8 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-[#4F8CFF]/5 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="space-y-4">
            {activeDishes.length > 0 ? (
              activeDishes.map((dish) => (
                <div key={dish.id} className="flex items-center space-x-4 border-b border-white/5 last:border-b-0 pb-3.5 last:pb-0 pt-1">
                  <DishImage src={dish.image} alt={dish.name} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                      dish.mealType === 'lunch' 
                        ? 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' 
                        : 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20'
                    }`}>
                      {dish.mealType === 'lunch' ? 'Déjeuner ☀️' : 'Dîner 🌙'}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-2">{dish.name}</h4>
                    <p className="text-[10px] text-white/55 truncate mt-0.5 leading-normal">
                      Ingrédients: {dish.ingredients.join(', ')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/40 text-center py-2">Aucun repas planifié pour ce jour.</p>
            )}
          </div>
        </div>
      </div>

      {/* 8. Dernières activités Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-[#6C5CFF]" />
          <span>Dernières activités</span>
        </h3>
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
          {lastActivities.length > 0 ? (
            <div className="space-y-4 relative">
              <div className="absolute left-[13px] top-2 bottom-2 w-[2px] bg-white/10"></div>
              {lastActivities.map((act) => {
                const timeStr = act.start_time ? act.start_time.replace(':', 'h') : 'Journée';
                const { Icon, cls } = getEventIconAndColor(act);
                return (
                  <div key={act.id} className="flex items-start space-x-3.5 relative z-10">
                    <div className={`p-1.5 rounded-lg ${cls} border shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-white/45">{timeStr}</span>
                        <span className="text-white/20">•</span>
                        <h4 className="text-xs font-bold text-white/95 truncate">{act.title}</h4>
                      </div>
                      {act.description && (
                        <p className="text-[10px] text-white/50 truncate mt-0.5">{act.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/40 text-center py-2">Aucune activité récente.</p>
          )}

          <button 
            onClick={() => setActiveTab('timeline')}
            className="w-full mt-2 py-3 px-4 bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/25 text-[#6C5CFF] rounded-2xl text-xs font-extrabold border border-[#6C5CFF]/30 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1"
          >
            Voir toute la Timeline →
          </button>
        </div>
      </div>

      {/* Event context menu bottom sheet */}
      {globalSearchOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] animate-fade-in">
          <div className="w-full max-w-lg glass-panel border border-white/12 rounded-[28px] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-2xl bg-white/8 border border-white/10 px-3 py-3">
                <Search className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  autoFocus
                  value={globalSearchQuery}
                  onChange={(event) => setGlobalSearchQuery(event.target.value)}
                  placeholder="Rechercher un membre, document, course, message..."
                  className="w-full bg-transparent border-0 outline-none text-sm text-white placeholder-white/35 font-semibold"
                />
                {globalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGlobalSearchQuery('')}
                    className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setGlobalSearchOpen(false);
                  setGlobalSearchQuery('');
                }}
                className="w-11 h-11 rounded-2xl bg-white/5 border border-white/8 text-white/55 hover:text-white hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-[65vh] overflow-y-auto no-scrollbar">
              {!globalSearchQuery && (
                <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-4">
                  <p className="text-xs font-black text-white uppercase tracking-wider">Recherche globale</p>
                  <p className="text-[11px] text-white/45 font-semibold mt-1">
                    Tapez un prénom, une dépense, un document, une destination, un devoir ou un message.
                  </p>
                </div>
              )}

              {globalSearchQuery && globalSearchResults.length === 0 && (
                <div className="rounded-2xl bg-white/[0.035] border border-white/8 p-5 text-center">
                  <p className="text-sm font-black text-white">Aucun résultat</p>
                  <p className="text-[11px] text-white/45 font-semibold mt-1">Essayez avec un mot plus court ou un prénom.</p>
                </div>
              )}

              {globalSearchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => openSearchResult(result)}
                  className="w-full rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 p-3.5 text-left transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/8 border border-white/8 flex items-center justify-center text-lg shrink-0">
                      {result.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white truncate">{result.title}</h4>
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-[#9E94FF] bg-[#6C5CFF]/12 px-2 py-0.5 rounded-full">
                          {result.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 font-semibold mt-1 line-clamp-2">{result.detail}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/25 mt-3 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedEventForMenu && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setSelectedEventForMenu(null)}>
          <div 
            className="w-full max-w-md bg-[#07111F] border-t border-white/15 rounded-t-[32px] p-6 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transform translate-y-0 transition-transform duration-300 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2"></div>
            
            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-white">{selectedEventForMenu.title}</h4>
              <p className="text-xs text-white/55 font-medium">{selectedEventForMenu.description || selectedEventForMenu.date}</p>
            </div>
            
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  handleEventClick(selectedEventForMenu);
                  setSelectedEventForMenu(null);
                }}
                className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/5"
              >
                📖 Voir les détails
              </button>
              
              <button
                onClick={() => {
                  setHiddenEventIds(prev => [...prev, selectedEventForMenu.id]);
                  setSelectedEventForMenu(null);
                }}
                className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/5"
              >
                🙈 Masquer temporairement
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(`Archiver "${selectedEventForMenu.title}" ?`)) {
                    if (onArchiveUnifiedEvent) onArchiveUnifiedEvent(selectedEventForMenu.id, selectedEventForMenu.source_module);
                    setSelectedEventForMenu(null);
                  }
                }}
                className="w-full py-3.5 px-4 bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/25 text-[#6C5CFF] rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#6C5CFF]/30"
              >
                📦 Archiver
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement "${selectedEventForMenu.title}" ?`)) {
                    if (onDeleteUnifiedEvent) onDeleteUnifiedEvent(selectedEventForMenu.id, selectedEventForMenu.source_module);
                    setSelectedEventForMenu(null);
                  }
                }}
                className="w-full py-3.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-500/15"
              >
                🗑️ Supprimer définitivement
              </button>
            </div>
            
            <button
              onClick={() => setSelectedEventForMenu(null)}
              className="w-full py-3 text-white/40 hover:text-white text-xs font-bold uppercase tracking-wider text-center pt-2 cursor-pointer transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
