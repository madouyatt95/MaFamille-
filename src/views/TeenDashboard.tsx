import React, { useState, useEffect } from 'react';
import { 
  Star, CheckCircle2, Calendar, Gift, MapPin, MessageSquare, 
  GraduationCap, Clock, Award, ShieldAlert, Trophy, Zap, 
  Sparkles, BookOpen, HeartHandshake, Compass, Users, 
  PlusCircle, ArrowLeft, ArrowRight, Smile, Send, Trash2, 
  Coins, TrendingUp, Bell, Heart, Camera
} from 'lucide-react';
import type { Member, ChoreTask, FamilyEvent, SchoolTask, SavingGoal, Transaction, NotificationAlert, FamilyVote, Foyer, DocumentFile, Trip, MemoryLog, Dish, ChatGroup, ChatMessage, FamilyModule, ModulePermissions } from '../types';
import { parseChoreTitle, serializeChoreTitle, getDefaultPermissions } from '../types';
import { TuteurScolaire } from '../components/modules/TuteurScolaire';
import { PeaceMaker } from '../components/modules/PeaceMaker';
import { ConteurIA } from '../components/modules/ConteurIA';
import { ConseilFamille } from '../components/modules/ConseilFamille';
import { CapsuleTemporelle } from '../components/modules/CapsuleTemporelle';
import { CommuneHub } from '../components/modules/CommuneHub';
import { FamilyMap } from './FamilyMap';
import { MenuHub } from './MenuHub';
import { Agenda } from './Agenda';
import { getSupabaseClient } from '../utils/supabase';

interface TeenDashboardProps {
  member: Member;
  members: Member[];
  foyer: Foyer | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeModule: string;
  setActiveModule: (moduleName: string) => void;
  tasks: ChoreTask[];
  setTasks: React.Dispatch<React.SetStateAction<ChoreTask[]>>;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  pocketMoney: any[];
  setPocketMoney: React.Dispatch<React.SetStateAction<any[]>>;
  events: FamilyEvent[];
  onAddTask: (task: any) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, title: string, points: number, rotation: 'daily' | 'weekly' | 'none', assigneeId: string, assigneeName: string) => void;
  onValidateTask: (id: string) => void;
  goals: SavingGoal[];
  setSavingGoals?: React.Dispatch<React.SetStateAction<SavingGoal[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  alerts: NotificationAlert[];
  setAlerts?: React.Dispatch<React.SetStateAction<NotificationAlert[]>>;
  onAddTransaction: (tx: any) => void;
  onAddEvent?: (title: string, dateTime: string) => void;
  memories: MemoryLog[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
  votes: FamilyVote[];
  setVotes: React.Dispatch<React.SetStateAction<FamilyVote[]>>;
  grades: any[];
  setGrades: React.Dispatch<React.SetStateAction<any[]>>;
  schedule: any[];
  setSchedule: React.Dispatch<React.SetStateAction<any[]>>;
  dishes: Dish[];
  setDishes: React.Dispatch<React.SetStateAction<Dish[]>>;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  accounts: any[];
  onOpenProfileSwitcher?: () => void;
  chatGroups: ChatGroup[];
  setChatGroups: React.Dispatch<React.SetStateAction<ChatGroup[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialChatGroupId?: string;
  setInitialChatGroupId?: (id: string | undefined) => void;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  onApplyWallTask?: (taskId: string, memberId: string) => void;
  onAcceptCandidate?: (taskId: string, memberId: string) => void;
  onRefuseCandidate?: (taskId: string, memberId: string) => void;
  onTakeWallTask?: (taskId: string, memberId: string) => void;
  onToggleTask?: (taskId: string) => void;
  onSendNotification?: any;
  memberPermissions?: any;
  communeName?: string;
  schoolName?: string;
  onToggleEventDone?: (id: string) => void;
  onMoveEvent?: (eventId: string, newDate: string) => void;
}

export const TeenDashboard: React.FC<TeenDashboardProps> = ({
  member,
  members,
  foyer,
  activeTab,
  setActiveTab,
  activeModule,
  setActiveModule,
  tasks,
  setTasks,
  schoolTasks,
  setSchoolTasks,
  pocketMoney,
  setPocketMoney,
  events,
  onAddTask,
  onDeleteTask,
  onEditTask,
  onValidateTask,
  goals,
  setSavingGoals,
  transactions,
  setTransactions,
  alerts,
  setAlerts,
  onAddTransaction,
  onAddEvent,
  memories = [],
  setMemories,
  votes,
  setVotes,
  grades,
  setGrades,
  schedule,
  setSchedule,
  dishes = [],
  setDishes,
  isPremium = false,
  onTriggerPaywall,
  accounts,
  onOpenProfileSwitcher,
  chatGroups,
  setChatGroups,
  chatMessages,
  setChatMessages,
  initialChatGroupId,
  setInitialChatGroupId,
  trips = [],
  setTrips,
  documents = [],
  setDocuments,
  onApplyWallTask,
  onAcceptCandidate,
  onRefuseCandidate,
  onTakeWallTask,
  onToggleTask,
  onSendNotification,
  memberPermissions,
  communeName = 'Cormeilles-en-Parisis',
  schoolName = 'Collège Victor Hugo',
  onToggleEventDone = () => {},
  onMoveEvent = () => {}
}) => {
  // Navigation active tab index internally mapped
  // Teen space will render internally or listen to external tab routing
  const [internalTab, setInternalTab] = useState<'accueil' | 'ecole' | 'messages' | 'timeline' | 'plus'>('accueil');
  
  // Local state for reactions and comments
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>(() => {
    try {
      const stored = localStorage.getItem('mf_timeline_reactions');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleReact = (activityId: string, reactionType: string) => {
    setReactions(prev => {
      const current = prev[activityId] || { heart: [], haha: [], fire: [], clap: [] };
      const list = current[reactionType] || [];
      let newList;
      if (list.includes(member.name)) {
        newList = list.filter(n => n !== member.name);
      } else {
        newList = [...list, member.name];
      }
      const updated = {
        ...prev,
        [activityId]: {
          ...current,
          [reactionType]: newList
        }
      };
      localStorage.setItem('mf_timeline_reactions', JSON.stringify(updated));
      return updated;
    });
  };

  const [comments, setComments] = useState<Record<string, { id: string; authorName: string; text: string; date: string }[]>>(() => {
    try {
      const stored = localStorage.getItem('mf_timeline_comments');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const handleAddComment = (activityId: string) => {
    if (!commentText.trim()) return;
    setComments(prev => {
      const currentList = prev[activityId] || [];
      const newComment = {
        id: `comment-${Date.now()}`,
        authorName: member.name,
        text: commentText.trim(),
        date: new Date().toLocaleDateString('fr-FR')
      };
      const updated = {
        ...prev,
        [activityId]: [...currentList, newComment]
      };
      localStorage.setItem('mf_timeline_comments', JSON.stringify(updated));
      return updated;
    });
    setCommentText('');
  };

  const isModuleAllowed = (mod: FamilyModule): boolean => {
    if (memberPermissions && memberPermissions[member.id] && memberPermissions[member.id][mod]) {
      return memberPermissions[member.id][mod].voir;
    }
    const defaults = getDefaultPermissions(member.role);
    return defaults[mod]?.voir || false;
  };

  const [teenChoreSubTab, setTeenChoreSubTab] = useState<'my_tasks' | 'wall'>('my_tasks');
  const [externalEvents, setExternalEvents] = useState<any[]>([]);
  const [calendarSources, setCalendarSources] = useState<any[]>([]);
  const [currentCalendarCountry, setCurrentCalendarCountry] = useState<string>('France');

  const getAdoAverage = () => {
    const myGrades = (grades || []).filter(g => g.studentId === member.id);
    if (myGrades.length === 0) return 'N/A';
    let totalWeighted = 0;
    let totalCoef = 0;
    myGrades.forEach(g => {
      const normalized = (g.value / g.max) * 20;
      totalWeighted += normalized * g.coef;
      totalCoef += g.coef;
    });
    return (totalWeighted / totalCoef).toFixed(1);
  };

  const totalUnreadChat = (chatGroups || []).reduce((acc, g) => acc + (g.unreadCount || 0), 0);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionPts, setSuggestionPts] = useState(25);
  const [selectedRewardForRedeem, setSelectedRewardForRedeem] = useState<any | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Suggested rewards states
  const [sugRewardTitle, setSugRewardTitle] = useState('');
  const [sugRewardDesc, setSugRewardDesc] = useState('');
  const [sugRewardPoints, setSugRewardPoints] = useState(100);
  const [sugRewardMoney, setSugRewardMoney] = useState(10);
  const [sugRewardIcon, setSugRewardIcon] = useState('🎁');
  const [isSuggestingReward, setIsSuggestingReward] = useState(false);
  
  // Wallet goal edit states
  const [goalTitleInput, setGoalTitleInput] = useState('');
  const [goalAmountInput, setGoalAmountInput] = useState(100);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // New Memory (Timeline) creation states
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryDesc, setNewMemoryDesc] = useState('');
  const [newMemoryImg, setNewMemoryImg] = useState('');
  const [memoryType, setMemoryType] = useState<'souvenir' | 'capsule'>('souvenir');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  // Sync internalTab with activeTab prop
  useEffect(() => {
    if (activeTab === 'accueil') setInternalTab('accueil');
    else if (activeTab === 'timeline') setInternalTab('timeline');
    else if (activeTab === 'menu') {
      if (['ecole', 'ecole_devoirs', 'tuteur_ia', 'notes_bulletins', 'emploi_temps'].includes(activeModule || '')) {
        setInternalTab('ecole');
      } else if (activeModule === 'messagerie') {
        setInternalTab('messages');
      } else {
        setInternalTab('plus');
      }
    }
  }, [activeTab, activeModule]);

  // 1. DYNAMIC XP CALCULATION
  const calculateAdoXP = (mId: string, mName: string) => {
    let xp = 0;
    
    // Validated tasks (completed + validated by parents)
    const validTasks = tasks.filter(t => {
      const meta = parseChoreTitle(t.title);
      return (t.assignedMemberId === mId || meta.assignedMemberIds?.includes(mId)) && 
             (t.validatedByParent || meta.status === 'validated');
    });
    xp += validTasks.length * 20;

    // Completed homework (done: true)
    const compHomework = schoolTasks.filter(t => t.assignedMemberId === mId && t.done);
    xp += compHomework.length * 15;

    // Good grades (value/max >= 0.7 or score >= 14/20)
    const goodG = (grades || []).filter(g => g.studentId === mId && (g.value / g.max) >= 0.7);
    xp += goodG.length * 30;

    // Votes cast in Conseil de Famille
    const castV = (votes || []).filter(v => 
      v.options.some(opt => opt.votes.includes(mName) || opt.votes.includes(mId))
    );
    xp += castV.length * 10;

    // PeaceMaker mediations (stored in localStorage)
    const pmKey = `mf_peacemaker_mediations_${mId}`;
    const pmCount = Number(localStorage.getItem(pmKey) || '0');
    xp += pmCount * 25;

    // Stories created (stored in localStorage)
    const storyKey = `mf_stories_created_${mId}`;
    const storyCount = Number(localStorage.getItem(storyKey) || '0');
    xp += storyCount * 15;

    // Timeline memories posted by this member
    const myMem = (memories || []).filter(m => m.authorName === mName);
    xp += myMem.length * 10;

    // Saving goals reached
    const myAcc = pocketMoney.find(p => p.id === mId);
    if (myAcc && myAcc.goalAmount && myAcc.goalAmount > 0 && myAcc.balance >= myAcc.goalAmount) {
      xp += 50;
    }

    return xp;
  };

  const totalXP = calculateAdoXP(member.id, member.name);
  const xpPerLevel = 150;
  const level = Math.floor(totalXP / xpPerLevel) + 1;
  const currentXP = totalXP % xpPerLevel;
  const xpRemaining = xpPerLevel - currentXP;

  const getLevelTitle = (lvl: number) => {
    if (lvl <= 2) return "Jeune Recrue 🌟";
    if (lvl <= 5) return "Explorateur en Herbe 🧭";
    if (lvl <= 8) return "Grand Frère Exemplaire 🛡️";
    if (lvl <= 12) return "Champion des Missions 🧹";
    if (lvl <= 18) return "Petit Génie de l'École 🧠";
    if (lvl <= 25) return "Protecteur de la Famille 🏰";
    return "Légende du Foyer 👑";
  };

  // 2. DAILY CONNECTION STREAK
  const getDailyStreak = (mId: string) => {
    const streakKey = `mf_ado_streak_${mId}`;
    const dateKey = `mf_ado_last_active_${mId}`;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let streakCount = Number(localStorage.getItem(streakKey) || '0');
    const lastActive = localStorage.getItem(dateKey);
    
    if (!lastActive) {
      streakCount = 1;
      localStorage.setItem(streakKey, '1');
      localStorage.setItem(dateKey, todayStr);
    } else if (lastActive === yesterdayStr) {
      streakCount += 1;
      localStorage.setItem(streakKey, String(streakCount));
      localStorage.setItem(dateKey, todayStr);
    } else if (lastActive !== todayStr) {
      streakCount = 1;
      localStorage.setItem(streakKey, '1');
      localStorage.setItem(dateKey, todayStr);
    }
    
    return streakCount;
  };

  const streak = getDailyStreak(member.id);

  // 3. BADGES LIST
  const getAdoBadges = (mId: string, mName: string) => {
    const list = [];
    
    const completedHw = schoolTasks.filter(t => t.assignedMemberId === mId && t.done);
    if (completedHw.length >= 1) {
      list.push({ id: 'badge-hw', title: 'Premier devoir terminé 📚', desc: 'Tu as complété ton premier devoir scolaire.', icon: '📝' });
    }

    const completedCh = tasks.filter(t => {
      const meta = parseChoreTitle(t.title);
      return (t.assignedMemberId === mId || meta.assignedMemberIds?.includes(mId)) && 
             (t.validatedByParent || meta.status === 'validated');
    });
    if (completedCh.length >= 5) {
      list.push({ id: 'badge-task', title: 'Missionnaire Actif 🧹', desc: '5 missions d\'entraide familiale accomplies.', icon: '⚡' });
    }

    const castV = (votes || []).filter(v => 
      v.options.some(opt => opt.votes.includes(mName) || opt.votes.includes(mId))
    );
    if (castV.length >= 1) {
      list.push({ id: 'badge-vote', title: 'Citoyen du Foyer ⚖️', desc: 'Tu as participé aux votes du conseil de famille.', icon: '🗳️' });
    }

    const pmKey = `mf_peacemaker_mediations_${mId}`;
    const pmCount = Number(localStorage.getItem(pmKey) || '0');
    if (pmCount >= 1) {
      list.push({ id: 'badge-pm', title: 'Médiateur de Paix 🕊️', desc: 'Tu as résolu un conflit en utilisant PeaceMaker IA.', icon: '🕊️' });
    }

    const storyKey = `mf_stories_created_${mId}`;
    const storyCount = Number(localStorage.getItem(storyKey) || '0');
    if (storyCount >= 1) {
      list.push({ id: 'badge-story', title: 'Grand Conteur 🌙', desc: 'Tu as créé ton premier conte magique du soir.', icon: '📖' });
    }

    const myAcc = pocketMoney.find(p => p.id === mId);
    if (myAcc && myAcc.goalAmount && myAcc.goalAmount > 0) {
      list.push({ id: 'badge-save', title: 'Épargnant Sage 🪙', desc: 'Objectif d\'épargne personnel défini.', icon: '💰' });
    }

    if (trips && trips.length > 0) {
      list.push({ id: 'badge-trip', title: 'Aventurier ✈️', desc: 'Voyage familial prévu à l\'horizon.', icon: '🗺️' });
    }

    const studentGrades = grades.filter(g => g.studentId === mId);
    if (studentGrades.length > 0) {
      let totalW = 0;
      let totalC = 0;
      studentGrades.forEach(g => {
        const norm = (g.value / g.max) * 20;
        totalW += norm * g.coef;
        totalC += g.coef;
      });
      if (totalW / totalC >= 15) {
        list.push({ id: 'badge-brain', title: 'Major de Promo 🧠', desc: 'Moyenne générale scolaire supérieure à 15/20.', icon: '👑' });
      }
    }

    return list;
  };

  const myBadges = getAdoBadges(member.id, member.name);

  // 4. WEEKLY LEADERBOARD (Dynamic ranking of kids/teens)
  const getWeeklyLeaderboard = () => {
    const leaderboard = members.map(m => ({
      id: m.id,
      name: m.name,
      photoUrl: m.photoUrl,
      xp: calculateAdoXP(m.id, m.name),
      role: m.role
    }));
    return leaderboard.sort((a, b) => b.xp - a.xp);
  };

  const leaderboard = getWeeklyLeaderboard();

  // 5. DATA FILTERINGS FOR ADO
  const myAccount = pocketMoney.find(p => p.id === member.id) || {
    id: member.id, name: member.name, balance: 0.0, points: 0, avatar: member.photoUrl
  };

  const myRealTransactions = transactions.filter(tx => 
    (tx.category === 'Argent de poche' || tx.category === 'Argent de Poche') && 
    (tx.memberName === member.name || tx.memberId === member.id)
  );

  const parsedTasks = (tasks || []).map(t => {
    if (!t) return null;
    const meta = parseChoreTitle(t.title);
    return {
      ...t,
      title: meta.title || t.title,
      description: meta.description,
      priority: meta.priority,
      status: meta.status || (t.done ? (t.validatedByParent ? 'validated' : 'pending_validation') : 'todo'),
      validationRequired: meta.validationRequired,
      isArchived: meta.isArchived,
      time: meta.time,
      rewardAmount: meta.rewardAmount || t.rewardAmount,
      assignedMemberIds: meta.assignedMemberIds,
      recurrence: meta.recurrence
    };
  }).filter(Boolean) as ChoreTask[];

  const myTasks = parsedTasks.filter(t => 
    !t.isArchived &&
    (t.assignedMemberId === member.id || t.assignedMemberIds?.includes(member.id))
  );

  const todoTasks = myTasks.filter(t => t.status === 'todo' || t.status === 'in_progress' || t.status === 'refused');
  const pendingValidationTasks = myTasks.filter(t => t.status === 'pending_validation');
  const validatedTasks = myTasks.filter(t => t.status === 'validated');

  const mySchoolTasks = schoolTasks.filter(t => t.assignedMemberId === member.id && !t.done);
  const myEvents = events.filter(e => e.memberId === member.id || e.title.toLowerCase().includes(member.name.toLowerCase()));

  // Active Council Votes where the teen hasn't voted yet
  const pendingVotes = (votes || []).filter(v => 
    v.active && 
    !v.options.some(opt => opt.votes.includes(member.name) || opt.votes.includes(member.id))
  );

  // 9. Chronological Timeline Activities Parser for Teen Space
  interface TimelineItem {
    id: string;
    type: string;
    title: string;
    description: string;
    date: Date;
    dateText: string;
    icon: string;
    authorName?: string;
    authorPhoto?: string;
    imageUrl?: string;
    likesCount?: number;
  }

  const buildFamilyActivities = (): TimelineItem[] => {
    const list: TimelineItem[] = [];

    // 1. Missions / Tâches (Only show completed/validated chores, filter out plain to-dos)
    (tasks || []).forEach(t => {
      if (!t) return;
      const meta = parseChoreTitle(t.title);
      const title = meta.title || t.title;
      if (meta.status !== 'validated' && meta.status !== 'pending_validation') return;
      
      let dateVal = new Date();
      if (t.dueDate) dateVal = new Date(t.dueDate);
      
      list.push({
        id: `task-${t.id}`,
        type: 'Mission',
        title: meta.status === 'validated' ? `Mission validée : ${title} 🎉` : `Mission terminée : ${title} ⏳`,
        description: meta.description || `Récompense : ${t.rewardPoints} pts.`,
        date: dateVal,
        dateText: t.dueDate || 'Aujourd\'hui',
        icon: meta.status === 'validated' ? "✅" : "⏳"
      });
    });

    // 2. Achats / Gains tirelire (Transactions - Only show teen's own transactions, hide global budgets)
    if (isModuleAllowed('budget')) {
      (transactions || []).forEach(tx => {
        if (!tx || tx.isArchived) return;
        if (tx.memberId !== member.id && tx.memberName !== member.name) return;
        const dateVal = tx.date ? new Date(tx.date) : new Date();
        const isExpense = tx.type === 'expense';
        
        list.push({
          id: `tx-${tx.id}`,
          type: 'Finance',
          title: isExpense ? `Récompense obtenue : ${tx.title}` : `Gain d'argent de poche : ${tx.title}`,
          description: `Montant : ${tx.amount.toFixed(2)} €`,
          date: dateVal,
          dateText: tx.date,
          icon: isExpense ? "🛍️" : "🪙"
        });
      });
    }

    // 3. Anniversaires (Family birthdays)
    (members || []).forEach(m => {
      if (!m || !m.birthDate) return;
      try {
        let bdayStr = m.birthDate;
        let parts = bdayStr.includes('/') ? bdayStr.split('/') : bdayStr.split('-');
        if (parts.length === 3) {
          let month = parseInt(parts[1]) - 1;
          let day = parseInt(parts[0].length === 4 ? parts[2] : parts[0]);
          let year = new Date().getFullYear();
          let bdayThisYear = new Date(year, month, day);
          list.push({
            id: `bday-${m.id}`,
            type: 'Anniversaire',
            title: `Anniversaire de ${m.name} 🎂`,
            description: `Il/Elle fête ses ${year - parseInt(parts[0].length === 4 ? parts[0] : parts[2])} ans !`,
            date: bdayThisYear,
            dateText: bdayThisYear.toLocaleDateString('fr-FR'),
            icon: "🎉"
          });
        }
      } catch (e) {}
    });

    // 4. Événements (Only social/family events, hide admin/bill/boring parent events)
    if (isModuleAllowed('agenda')) {
      (events || []).forEach(e => {
        if (!e || e.type === 'vaccine' || e.type === 'bill' || (e.type as string) === 'administrative') return;
        
        // Exclude parent appointments, general days off, public holidays, banking, taxes, medical etc.
        const isBoring = /démarche|rdv administratif|facture|impôt|banque|férié|jour férié|travaux|réunion|professionnel|dentiste|médecin|contrôle/i.test(e.title || '');
        if (isBoring) return;

        const dateVal = e.dateTime ? new Date(e.dateTime) : new Date();
        list.push({
          id: `evt-${e.id}`,
          type: 'Événement',
          title: e.title,
          description: `${e.description || 'Événement familial prévu.'} à ${e.time || '09:00'}.`,
          date: dateVal,
          dateText: e.dateTime?.split('T')[0] || 'Aujourd\'hui',
          icon: "📅"
        });
      });
    }

    // 5. Voyages
    if (isModuleAllowed('voyages')) {
      (trips || []).forEach(tr => {
        if (!tr) return;
        const dateVal = tr.startDate ? new Date(tr.startDate) : new Date();
        list.push({
          id: `trip-${tr.id}`,
          type: 'Voyage',
          title: `Voyage à ${tr.destination} ✈️`,
          description: `Du ${tr.startDate} au ${tr.endDate}.`,
          date: dateVal,
          dateText: tr.startDate,
          icon: "🗺️"
        });
      });
    }

    // 6. Menus Spéciaux (Filter canteen meals to show only special family meals)
    if (isModuleAllowed('menu_semaine')) {
      (dishes || []).forEach(d => {
        if (!d) return;
        const isSpecial = /spécial|fête|anniversaire|pizza|burger|raclette|barbecue|crêpe|dîner|soirée/i.test(d.name);
        if (!isSpecial) return;
        list.push({
          id: `dish-${d.id}`,
          type: 'Menu',
          title: `Menu Spécial : ${d.name} 🍲`,
          description: `Prévu pour le ${d.mealType === 'lunch' ? 'Déjeuner' : 'Dîner'} (${d.day}).`,
          date: new Date(),
          dateText: d.day,
          icon: "😋"
        });
      });
    }

    // 7. Devoirs Complétés & Bonnes Notes
    if (isModuleAllowed('ecole')) {
      (schoolTasks || []).forEach(st => {
        if (!st || !st.done) return;
        const dateVal = st.dueDate ? new Date(st.dueDate) : new Date();
        list.push({
          id: `schooltask-${st.id}`,
          type: 'Devoir',
          title: `Devoir terminé : ${st.title} 📚`,
          description: `Matière : ${st.subject}. Félicitations !`,
          date: dateVal,
          dateText: st.dueDate || '',
          icon: "✅"
        });
      });

      (grades || []).forEach(g => {
        if (!g) return;
        const score = parseFloat(g.value);
        const isGood = score >= 14 || (g.gradeText && /félicitations|très bien|excellent/i.test(g.gradeText));
        if (!isGood) return;
        const dateVal = g.date ? new Date(g.date) : new Date();
        list.push({
          id: `grade-${g.id}`,
          type: 'Note',
          title: `Super note en ${g.subject} ! 🎓`,
          description: `Note : ${g.value}/${g.maxPossible || 20} (Coeff ${g.coefficient || 1}). ${g.comment || ''}`,
          date: dateVal,
          dateText: g.date || 'Récemment',
          icon: "🌟"
        });
      });
    }

    // 8. Conseil de Famille (Sondages/Décisions)
    if (isModuleAllowed('conseil_famille')) {
      (votes || []).forEach(v => {
        if (!v) return;
        const dateVal = v.dueDate ? new Date(v.dueDate) : new Date();
        list.push({
          id: `vote-${v.id}`,
          type: 'Sondage',
          title: v.active ? `Sondage familial actif : ${v.question}` : `Décision du Conseil : ${v.question}`,
          description: v.active ? `Donne ton avis ! Fin le ${v.dueDate}.` : `Sondage clos. Décision enregistrée !`,
          date: dateVal,
          dateText: v.dueDate || '',
          icon: v.active ? "🗳️" : "⚖️"
        });
      });
    }

    // 9. Souvenirs / Album / Capsule
    (memories || []).forEach(m => {
      if (!m) return;
      let dateVal = new Date();
      if (m.date) {
        const parts = m.date.split('/');
        if (parts.length === 3) {
          dateVal = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          dateVal = new Date(m.date);
        }
      }
      list.push({
        id: `mem-${m.id}`,
        type: m.theme ? 'Capsule' : 'Souvenir',
        title: m.title,
        description: m.description,
        date: dateVal,
        dateText: m.date,
        icon: m.theme ? "⏳" : "📸",
        authorName: m.authorName,
        authorPhoto: m.authorPhoto,
        imageUrl: m.imageUrl,
        likesCount: m.likesCount
      });
    });

    // 10. Messages importants / alertes (Excluding sensitive tech alerts)
    (alerts || []).forEach(al => {
      if (!al || al.read) return;
      if (al.type === 'error') return;
      const dateVal = al.time ? new Date(al.time) : new Date();
      list.push({
        id: `alert-${al.id}`,
        type: 'Alerte',
        title: `Message de famille : ${al.title}`,
        description: al.description,
        date: dateVal,
        dateText: al.time ? new Date(al.time).toLocaleDateString('fr-FR') : 'Aujourd\'hui',
        icon: "📢"
      });
    });

    // 11. Objectifs d'Épargne Atteints
    if (isModuleAllowed('budget')) {
      (goals || []).forEach(g => {
        if (!g || g.category === 'boutique_reward') return;
        const current = g.currentAmount || 0;
        const target = g.targetAmount || 1;
        if (current < target) return;
        const dateVal = g.targetDate ? new Date(g.targetDate) : new Date();
        list.push({
          id: `goal-reached-${g.id}`,
          type: 'Objectif Réussi',
          title: `Objectif atteint : ${g.title} 🎯`,
          description: `La cagnotte est remplie avec ${current.toFixed(2)} € !`,
          date: dateVal,
          dateText: g.targetDate || 'Aujourd\'hui',
          icon: "🎉"
        });
      });
    }

    // 12. Badges Débloqués
    myBadges.forEach(b => {
      list.push({
        id: `badge-${b.id}`,
        type: 'Badge Débloqué',
        title: `Badge débloqué : ${b.title} 🏅`,
        description: b.desc,
        date: new Date(),
        dateText: 'Récemment',
        icon: b.icon
      });
    });

    // 13. Activités PeaceMaker mediations count
    const pmCount = Number(localStorage.getItem(`mf_peacemaker_mediations_${member.id}`) || '0');
    if (pmCount > 0) {
      list.push({
        id: `peacemaker-activity`,
        type: 'Médiation',
        title: `Résolution PeaceMaker IA active 🕊️`,
        description: `Tu as participé à ${pmCount} médiation(s) bienveillante(s) avec l'IA.`,
        date: new Date(),
        dateText: 'Récemment',
        icon: "🕊️"
      });
    }

    // 14. Carte Familiale / Localisation (if authorized)
    if (isModuleAllowed('carte_familiale')) {
      list.push({
        id: `carte-familiale-feed`,
        type: 'Localisation',
        title: 'Carte Familiale Interactive 🗺️',
        description: 'La carte interactive est partagée. Localise tes proches en toute sécurité.',
        date: new Date(),
        dateText: 'En direct',
        icon: "📍"
      });
    }

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const familyActivities = buildFamilyActivities();

  // Load boutique reward items from saving_goals category = 'boutique_reward'
  const mapSavingGoalToReward = (sg: SavingGoal) => {
    let icon = '🎁';
    let costPoints = sg.targetAmount || 50;
    let costMoney = Math.round(costPoints / 10);
    let subCat = 'Cadeau';
    let avail = true;
    let valReq = true;
    if (sg.contributions && sg.contributions.length > 0) {
      const meta = sg.contributions[0] as any;
      if (meta.icon) icon = meta.icon;
      if (meta.costPoints !== undefined) costPoints = meta.costPoints;
      if (meta.costMoney !== undefined) costMoney = meta.costMoney;
      if (meta.subCategory) subCat = meta.subCategory;
      if (meta.avail !== undefined) avail = meta.avail;
      if (meta.validationRequired !== undefined) valReq = meta.validationRequired;
    }
    return {
      id: sg.id,
      title: sg.title,
      costPoints,
      costMoney,
      icon,
      category: subCat,
      avail,
      validationRequired: valReq
    };
  };

  const boutiqueRewards = (goals || [])
    .filter(sg => sg.category === 'boutique_reward')
    .map(mapSavingGoalToReward)
    .filter(r => r.avail);

  // 6. ADO INTERACTIONS HANDLERS
  
  // Complete a chore
  const handleCompleteTask = async (taskId: string, points: number) => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return;

    const meta = parseChoreTitle(target.title);
    meta.status = 'pending_validation';
    meta.title = meta.title || target.title;
    const serialized = serializeChoreTitle(meta);

    setTasks(prev => prev.map(t => t.id === taskId ? { 
      ...t, 
      title: serialized, 
      done: true, 
      status: 'pending_validation' 
    } : t));

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('chore_tasks')
          .update({ title: serialized, done: true, validated_by_parent: false })
          .eq('id', taskId);
      }
    } catch (err) {
      console.error("[TeenDashboard] Failed to complete task:", err);
    }

    alert(`Super travail ! Mission envoyée pour validation (+${points} pts en attente) 🌟`);
  };

  // Buy a boutique reward
  const handleRedeemReward = (reward: any) => {
    setSelectedRewardForRedeem(reward);
    setPaymentModalOpen(true);
  };

  const executePurchase = async (paymentMethod: 'points' | 'money') => {
    if (!selectedRewardForRedeem) return;
    const reward = selectedRewardForRedeem;
    const cost = paymentMethod === 'points' ? reward.costPoints : reward.costMoney;
    
    // Check balance
    const myPoints = myAccount.points || 0;
    const myBalance = myAccount.balance || 0;
    if (paymentMethod === 'points' && myPoints < reward.costPoints) return;
    if (paymentMethod === 'money' && myBalance < reward.costMoney) return;

    setPaymentModalOpen(false);

    if (reward.validationRequired !== false) {
      const timestamp = Date.now();
      const newAlert: NotificationAlert = {
        id: `req-rew-${member.id}-${reward.id}-${paymentMethod}-${timestamp}`,
        title: `Achat Ado : ${reward.title}`,
        description: `${member.name} souhaite dépenser ${paymentMethod === 'points' ? `${cost} points` : `${cost.toFixed(2)} €`} pour "${reward.title}".`,
        time: new Date().toISOString(),
        type: 'warning',
        read: false,
        module: 'argent',
        senderMemberId: member.id,
        senderName: member.name,
        senderAvatar: member.photoUrl
      };

      if (setAlerts) setAlerts(prev => [newAlert, ...prev]);

      try {
        const client = getSupabaseClient();
        if (client && foyer) {
          await client.from('alerts').insert({
            id: newAlert.id, foyer_id: foyer.id, title: newAlert.title,
            description: newAlert.description, time: newAlert.time, type: newAlert.type,
            read: newAlert.read, module: newAlert.module, sender_member_id: newAlert.senderMemberId,
            sender_name: newAlert.senderName, sender_avatar: newAlert.senderAvatar
          });
        }
      } catch (err) {
        console.error("[TeenDashboard] Failed to send reward alert:", err);
      }
      alert(`Demande d'achat envoyée aux parents ! Ils vont la valider très vite. 🚀`);
    } else {
      // Direct purchase (no validation required)
      const updatedPoints = (paymentMethod === 'points' ? (myAccount.points || 0) - cost : (myAccount.points || 0)) + 5;
      const updatedBalance = paymentMethod === 'money' ? (myAccount.balance || 0) - cost : (myAccount.balance || 0);
      setPocketMoney(prev => prev.map(p => p.id === member.id ? { ...p, points: updatedPoints, balance: updatedBalance } : p));

      const timestamp = Date.now();
      const newTx: Transaction = {
        id: `tx-rew-${member.id}-${reward.id}-${timestamp}`,
        amount: paymentMethod === 'money' ? -cost : 0,
        type: 'expense',
        category: 'Argent de Poche',
        date: new Date().toISOString().split('T')[0],
        title: `Achat boutique : ${reward.title} (-${paymentMethod === 'points' ? `${cost} pts` : `${cost.toFixed(2)} €`})`,
        memberId: member.id,
        memberName: member.name
      };

      try {
        const client = getSupabaseClient();
        if (client && foyer) {
          await client.from('pocket_money').update({ points: updatedPoints, balance: updatedBalance }).eq('id', member.id);
          await client.from('transactions').insert({
            id: newTx.id, foyer_id: foyer.id, amount: newTx.amount, type: newTx.type,
            category: newTx.category, date: newTx.date, title: newTx.title,
            member_id: newTx.memberId, member_name: newTx.memberName
          });
          setTransactions(prev => [newTx, ...prev]);
        }
      } catch (err) {
        console.error("[TeenDashboard] Direct redeem failed:", err);
      }
      alert(`Félicitations ! Achat direct réussi. ${paymentMethod === 'points' ? `${cost} points` : `${cost.toFixed(2)} €`} déduits ! 🎉 (+5 XP de bonus)`);
    }
  };

  // Propose a custom task/mission
  const handleProposeMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;

    const timestamp = Date.now();
    const newAlert: NotificationAlert = {
      id: `req-task-${member.id}-${timestamp}`,
      title: `Proposition de mission : ${suggestionText.trim()}`,
      description: `${member.name} propose d'accomplir : "${suggestionText.trim()}" pour ${suggestionPts} points.`,
      time: new Date().toISOString(),
      type: 'warning',
      read: false,
      module: 'taches',
      senderMemberId: member.id,
      senderName: member.name,
      senderAvatar: member.photoUrl
    };

    if (setAlerts) setAlerts(prev => [newAlert, ...prev]);

    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').insert({
          id: newAlert.id, foyer_id: foyer.id, title: newAlert.title,
          description: newAlert.description, time: newAlert.time, type: newAlert.type,
          read: newAlert.read, module: newAlert.module, sender_member_id: newAlert.senderMemberId,
          sender_name: newAlert.senderName, sender_avatar: newAlert.senderAvatar
        });
      }
    } catch (err) {
      console.error("[TeenDashboard] Failed to submit task proposal:", err);
    }

    alert(`Proposition envoyée ! Tes parents ont reçu une notification. 💬`);
    setSuggestionText('');
  };

  // Suggest a custom boutique reward
  const handleSuggestReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sugRewardTitle.trim()) return;

    const timestamp = Date.now();
    const newAlert: NotificationAlert = {
      id: `sug-rew-${member.id}-${timestamp}`,
      title: `Suggestion : ${sugRewardTitle.trim()}`,
      description: `${member.name} propose un nouveau cadeau : "${sugRewardTitle.trim()}" (${sugRewardDesc.trim()}) pour ${sugRewardPoints} Pts ou ${sugRewardMoney} €. Icone: ${sugRewardIcon}`,
      time: new Date().toISOString(),
      type: 'info',
      read: false,
      module: 'argent',
      senderMemberId: member.id,
      senderName: member.name,
      senderAvatar: member.photoUrl
    };

    if (setAlerts) setAlerts(prev => [newAlert, ...prev]);

    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').insert({
          id: newAlert.id,
          foyer_id: foyer.id,
          title: newAlert.title,
          description: newAlert.description,
          time: newAlert.time,
          type: newAlert.type,
          read: newAlert.read,
          module: newAlert.module,
          sender_member_id: newAlert.senderMemberId,
          sender_name: newAlert.senderName,
          sender_avatar: newAlert.senderAvatar
        });
      }
    } catch (err) {
      console.error("[TeenDashboard] Failed to suggest reward:", err);
    }

    alert(`Proposition de récompense envoyée aux parents ! 🚀`);
    setSugRewardTitle('');
    setSugRewardDesc('');
    setSugRewardPoints(100);
    setSugRewardMoney(10);
    setSugRewardIcon('🎁');
    setIsSuggestingReward(false);
  };

  // Edit saving goal title/amount
  const handleSaveGoal = async () => {
    if (!goalTitleInput.trim() || goalAmountInput <= 0) return;
    
    setPocketMoney(prev => prev.map(p => p.id === member.id ? { 
      ...p, goalTitle: goalTitleInput.trim(), goalAmount: goalAmountInput 
    } : p));

    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('pocket_money')
          .update({ goal_title: goalTitleInput.trim(), goal_amount: goalAmountInput })
          .eq('id', member.id);
      }
    } catch (err) {
      console.error("[TeenDashboard] Failed to update saving goal:", err);
    }
    
    setIsEditingGoal(false);
    alert(`Objectif d'épargne mis à jour ! 🪙`);
  };

  // Trigger XP addition internally when stories/mediations succeed
  const handleAwardAdoXP = (pointsToAdd: number, reason: string) => {
    // We add points to the pocket_money points database since points and XP are aligned.
    const updatedPoints = (myAccount.points || 0) + pointsToAdd;
    setPocketMoney(prev => prev.map(p => p.id === member.id ? { ...p, points: updatedPoints } : p));
    
    const pmKey = reason.includes('PeaceMaker') ? `mf_peacemaker_mediations_${member.id}` : `mf_stories_created_${member.id}`;
    localStorage.setItem(pmKey, String(Number(localStorage.getItem(pmKey) || '0') + 1));
    
    alert(`⚡ XP Débloqué ! +${pointsToAdd} XP : ${reason}`);
  };

  // Add memory to capsule/timeline
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryTitle.trim()) return;

    const newM: MemoryLog = {
      id: `mem-${Date.now()}`,
      title: newMemoryTitle.trim(),
      description: newMemoryDesc.trim(),
      imageUrl: newMemoryImg.trim() || undefined,
      date: new Date().toLocaleDateString('fr-FR'),
      authorName: member.name,
      authorPhoto: member.photoUrl || '',
      likesCount: 0,
      theme: memoryType === 'capsule' ? 'capsule' : undefined
    };

    if (setMemories) setMemories(prev => [newM, ...prev]);

    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('memories').insert({
          id: newM.id,
          foyer_id: foyer.id,
          title: newM.title,
          description: newM.description,
          image_url: newM.imageUrl || null,
          date_text: newM.date,
          author: newM.authorName,
          author_id: member.id,
          likes: newM.likesCount,
          liked_by: JSON.stringify([]),
          theme: newM.theme || null
        });
      }
    } catch (err) {
      console.error("[TeenDashboard] Failed to save memory:", err);
    }

    handleAwardAdoXP(10, `Publication d'un ${memoryType === 'capsule' ? 'souvenir scellé dans la capsule' : 'souvenir dans l\'album'}`);
    setNewMemoryTitle('');
    setNewMemoryDesc('');
    setNewMemoryImg('');
    setMemoryType('souvenir');
    setIsAddingMemory(false);
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden flex flex-col items-center">
      {/* Background decoration blur halos */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto space-y-6 relative z-10 flex flex-col justify-start">

      {/* ---------------------------------------------------------------------- */}
      {/* HEADER: Profile, Streak & Level Status */}
      {/* ---------------------------------------------------------------------- */}
      {internalTab === 'accueil' && (
        <div className="flex flex-col space-y-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] mb-6 animate-fade-in relative z-20">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">ESPACE ADO ⚡</span>
            {onOpenProfileSwitcher && (
              <button
                onClick={onOpenProfileSwitcher}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-extrabold text-[#FF4D6D] hover:bg-[#FF4D6D]/10 hover:text-white transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
              >
                <span>🚪</span>
                <span>Déconnexion / PIN</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4 bg-white/5 border border-white/8 rounded-[32px] p-5 shadow-xl backdrop-blur-md">
            <div className="relative">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] rounded-full blur animate-pulse" />
              <img 
                src={member.photoUrl} 
                alt={member.name} 
                className="w-16 h-16 rounded-full object-cover border-2 border-[#6C5CFF]/30 relative z-10"
              />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#FFB020] to-[#FF8C00] text-[#07111F] font-black text-[9px] w-6 h-6 rounded-full border border-[#07111F] flex items-center justify-center z-20 shadow-md">
                {level}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <h2 className="text-base font-black tracking-tight flex items-center gap-1.5 text-white">
                <span>{member.name}</span>
                {streak > 0 && (
                  <span className="text-xs bg-[#FF8C00]/20 text-[#FFA000] px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 font-sans animate-bounce">
                    🔥 {streak}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-[#FFB020] font-black uppercase tracking-wider">{getLevelTitle(level)}</p>
              
              {/* Duolingo style XP Progress Bar */}
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-[8px] font-black text-white/40 uppercase tracking-widest font-sans">
                  <span>XP : {currentXP} / 150</span>
                  <span>Niveau {level + 1}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] transition-all duration-500 rounded-full"
                    style={{ width: `${(currentXP / xpPerLevel) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SUBTAB RENDERING MODULES */}
      {/* ---------------------------------------------------------------------- */}

      {/* --- SUBTAB: ACCUEIL --- */}
      {internalTab === 'accueil' && (
        <div className="space-y-6 animate-fade-in relative z-10">
          
          {/* Revolut Junior Wallet Card */}
          <div className="bg-gradient-to-br from-[#00D26A]/15 to-[#6C5CFF]/15 border border-[#00D26A]/20 rounded-[36px] p-5 space-y-4 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Portefeuille Virtuel</span>
              <Coins className="w-4 h-4 text-[#00D26A]" />
            </div>
            
            <div className="flex items-end justify-between">
              <div className="text-left">
                <p className="text-3xl font-black text-[#00D26A] tracking-tight">{myAccount.balance.toFixed(2)} €</p>
                <p className="text-[9px] font-extrabold text-white/50 uppercase tracking-wider mt-0.5">Solde Argent de Poche</p>
              </div>
              <div className="bg-white/5 border border-white/8 px-4 py-2 rounded-2xl flex items-center space-x-1.5">
                <Star className="w-3.5 h-3.5 fill-[#FFB020] text-[#FFB020]" />
                <span className="text-xs font-black text-white">{myAccount.points || 0} pts</span>
              </div>
            </div>

            {/* Saving goal progress bar */}
            {myAccount.goalTitle ? (
              <div className="pt-2 border-t border-white/5 text-left space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white/70">🎯 Objectif : {myAccount.goalTitle}</span>
                  <span className="text-[#00D26A] font-black">{myAccount.balance.toFixed(2)} / {myAccount.goalAmount?.toFixed(2)} €</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00D26A] to-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, (myAccount.balance / (myAccount.goalAmount || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-white/5 text-left">
                <button 
                  onClick={() => setIsEditingGoal(true)}
                  className="text-[10px] font-black text-[#6C5CFF] uppercase tracking-wider hover:underline flex items-center gap-1"
                >
                  🎯 Configurer un objectif d'épargne
                </button>
              </div>
            )}
          </div>

          {/* Saving Goal configuration modal popup */}
          {isEditingGoal && (
            <div className="fixed inset-0 z-50 bg-[#07111F]/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#112240] border border-white/10 rounded-[32px] p-6 max-w-sm w-full space-y-4 shadow-2xl text-left">
                <h3 className="text-lg font-black text-white">Objectif d'épargne</h3>
                <div className="space-y-3 font-bold text-xs">
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1">Que souhaites-tu acheter ?</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Nintendo Switch, Vélo de sport, Sneakers..."
                      value={goalTitleInput}
                      onChange={(e) => setGoalTitleInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1">Montant requis (€)</label>
                    <input 
                      type="number" 
                      value={goalAmountInput}
                      onChange={(e) => setGoalAmountInput(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button 
                    onClick={handleSaveGoal}
                    className="flex-1 py-3 bg-[#00D26A] text-[#07111F] font-black rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Enregistrer 🎯
                  </button>
                  <button 
                    onClick={() => setIsEditingGoal(false)}
                    className="px-4 py-3 bg-white/5 border border-white/10 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Highlights grids (Missions, Homeworks, Events) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chores widget */}
            <div 
              onClick={() => { setActiveTab('menu'); setActiveModule('taches'); }}
              className="bg-[#112240] border border-white/8 rounded-[32px] p-5 text-left space-y-3 cursor-pointer hover:border-[#FFB020]/30 transition"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Missions Familiales</span>
                <span className="text-xs bg-[#FFB020]/15 text-[#FFB020] px-2.5 py-0.5 rounded-full font-black">{todoTasks.length} actives</span>
              </div>
              
              <div className="space-y-2">
                {todoTasks.slice(0, 2).map(task => (
                  <div key={task.id} className="flex justify-between items-center text-xs font-bold border-l-2 border-[#FFB020] pl-2">
                    <span className="truncate text-white/90">{task.title}</span>
                    <span className="text-[#FFB020] text-[10px] shrink-0">+{task.rewardPoints} pts</span>
                  </div>
                ))}
                {todoTasks.length === 0 && (
                  <p className="text-[10px] text-white/40 italic">Aucune mission en cours, bravo ! 🎉</p>
                )}
              </div>
            </div>

            {/* School tasks widget */}
            <div 
              onClick={() => { setActiveTab('menu'); setActiveModule('ecole'); }}
              className="bg-[#112240] border border-white/8 rounded-[32px] p-5 text-left space-y-3 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Devoirs & Études</span>
                <span className="text-xs bg-[#6C5CFF]/15 text-[#9E94FF] px-2.5 py-0.5 rounded-full font-black">{mySchoolTasks.length} devoirs</span>
              </div>
              
              <div className="space-y-2">
                {mySchoolTasks.slice(0, 2).map(task => (
                  <div key={task.id} className="flex flex-col text-xs font-bold border-l-2 border-[#6C5CFF] pl-2">
                    <span className="truncate text-white/90">{task.title}</span>
                    <span className="text-[9px] text-[#9E94FF]">{task.subject}</span>
                  </div>
                ))}
                {mySchoolTasks.length === 0 && (
                  <p className="text-[10px] text-white/40 italic">Pas de devoirs en attente, profite bien ! 🎮</p>
                )}
              </div>
            </div>

          </div>

          {/* Active Family Council Vote Widget */}
          {pendingVotes.length > 0 && (
            <div 
              onClick={() => { setActiveTab('menu'); setActiveModule('conseil'); }}
              className="bg-gradient-to-r from-[#FF8C00]/20 to-[#FF4D6D]/15 border border-[#FF8C00]/30 rounded-[28px] p-4 flex items-center justify-between cursor-pointer hover:brightness-110 transition text-left"
            >
              <div className="space-y-1">
                <span className="text-[8px] bg-[#FF8C00]/20 text-[#FF8C00] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Vote actif 🗳️</span>
                <h4 className="text-xs font-black text-white leading-tight">{pendingVotes[0].question}</h4>
                <p className="text-[9px] text-white/50">Exprime ton choix avant le {pendingVotes[0].dueDate} (+10 XP)</p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/40" />
            </div>
          )}

          {/* Weekly Gamified Leaderboard */}
          <div className="bg-[#112240] border border-white/8 rounded-[36px] p-5 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                <Trophy className="w-4 h-4 text-[#FFB020]" />
                Classement Familial (XP Hebdo)
              </span>
            </div>

            <div className="space-y-3.5">
              {leaderboard.slice(0, 4).map((user, idx) => {
                const isMe = user.id === member.id;
                const medals = ['👑', '🥈', '🥉'];
                const rankMark = medals[idx] || `${idx + 1}.`;
                
                return (
                  <div 
                    key={user.id} 
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                      isMe ? 'bg-[#6C5CFF]/15 border border-[#6C5CFF]/30' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-sm shrink-0 w-6 text-center font-bold text-white/40">{rankMark}</span>
                      <img 
                        src={user.photoUrl} 
                        alt={user.name} 
                        className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <span className={`text-xs font-extrabold truncate ${isMe ? 'text-white' : 'text-white/80'}`}>
                        {user.name} {isMe ? '(Moi)' : ''}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-[#FFB020] bg-[#FFB020]/10 px-2 py-1 rounded-xl shrink-0 font-sans">
                      {user.xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick interactive widgets (Trip, Birthday) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Trip Countdown widget */}
            {trips.length > 0 ? (
              <div 
                onClick={() => { setActiveTab('menu'); setActiveModule('voyages'); }}
                className="bg-white/5 border border-white/8 rounded-[28px] p-4 text-left space-y-2 cursor-pointer hover:bg-white/8 transition"
              >
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider block">✈️ Prochain Voyage</span>
                <h4 className="text-xs font-black text-white truncate">{trips[0].destination}</h4>
                <p className="text-[9px] text-[#00D26A] font-bold"> Checklist : {trips[0].checklist?.length || 0} tâches</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/8 rounded-[28px] p-4 text-center flex flex-col justify-center items-center h-full">
                <MapPin className="w-5 h-5 text-white/20 mb-1" />
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">Pas de voyage</span>
              </div>
            )}

            {/* Available Boutique Reward widget */}
            <div 
              onClick={() => { setActiveTab('menu'); setActiveModule('boutique'); }}
              className="bg-white/5 border border-white/8 rounded-[28px] p-4 text-left space-y-2 cursor-pointer hover:bg-white/8 transition flex flex-col justify-between"
            >
              {boutiqueRewards.length > 0 ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider block">🛍️ Boutique Cadeaux</span>
                    <p className="text-xs font-black text-white truncate">{boutiqueRewards[0].title}</p>
                  </div>
                  <span className="text-[9px] font-black text-[#FFB020] bg-[#FFB020]/15 px-2 py-0.5 rounded-lg w-fit font-sans">
                    {boutiqueRewards[0].costPoints} pts
                  </span>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider block">🛍️ Boutique Cadeaux</span>
                    <p className="text-xs font-bold text-white/50 truncate">Aucun cadeau disponible</p>
                  </div>
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider">
                    Demande à tes parents !
                  </span>
                </>
              )}
            </div>

          </div>

        </div>
      )}

      {/* --- SUBTAB: ÉCOLE & TUTEUR IA --- */}
      {internalTab === 'ecole' && (
        <div className="space-y-4 animate-fade-in relative z-10 text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule(''); }}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Espace Scolaire & Tuteur</h1>
              <p className="text-[10px] text-white/50 font-bold">Suis tes cours, tes devoirs et étudie avec l'IA</p>
            </div>
          </div>

          <div className="relative z-10">
            <TuteurScolaire 
              schoolTasks={schoolTasks}
              setSchoolTasks={setSchoolTasks}
              activeMemberId={member.id}
              members={members}
              isPremium={isPremium}
              onTriggerPaywall={onTriggerPaywall}
              grades={grades}
              setGrades={setGrades}
              schedule={schedule}
              setSchedule={setSchedule}
              initialSubTab={
                activeModule === 'tuteur_ia' ? 'quizzes' :
                activeModule === 'notes_bulletins' ? 'grades' :
                activeModule === 'emploi_temps' ? 'schedule' :
                'devoirs'
              }
            />
          </div>
        </div>
      )}

      {/* --- SUBTAB: MESSAGES --- */}
      {internalTab === 'messages' && (
        <div className="space-y-4 animate-fade-in relative z-10">
          <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))] text-left">
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule(''); }}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Discussions de Famille</h1>
              <p className="text-[10px] text-white/50 font-bold">Envoie des messages, photos et réactions</p>
            </div>
          </div>

          {/* Render real MenuHub in kid/ado mode with activeModule messagerie */}
          <div className="relative z-10 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl h-[calc(100vh-210px)]">
            <MenuHub 
              foyer={foyer}
              memberPermissions={{} as any}
              initialChatGroupId={initialChatGroupId}
              documents={documents}
              setDocuments={setDocuments}
              tasks={tasks}
              groceries={[]}
              externalGroceryFilter="all"
              members={members}
              setMembers={() => {}}
              vehicles={[]}
              setVehicles={() => {}}
              maintenance={[]}
              setMaintenance={() => {}}
              trips={trips}
              setTrips={setTrips}
              pets={[]}
              setPets={() => {}}
              pocketMoney={pocketMoney}
              setPocketMoney={setPocketMoney}
              artisans={[]}
              setArtisans={() => {}}
              onUpdateMemberProfile={async () => {}}
              goals={goals}
              transactions={transactions}
              setTransactions={setTransactions}
              alerts={alerts}
              setAlerts={setAlerts}
              currencySymbol="€"
              formatMoney={(a) => `${a}€`}
              activeModule="messagerie"
              setActiveModule={setActiveModule}
              vaccines={[]}
              setVaccines={() => {}}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
              onAddGrocery={async () => {}}
              onToggleTask={() => {}}
              onValidateTask={onValidateTask}
              onToggleGrocery={async () => {}}
              onAddGroceryItem={async () => {}}
              onDeleteGroceryItem={async () => {}}
              onEditGroceryItem={async () => {}}
              setActiveTab={setActiveTab}
              activeMemberId={member.id}
              archivedLists={[]}
              onArchiveCurrentList={async () => {}}
              onReuseArchivedList={async () => {}}
              onDeleteArchivedList={async () => {}}
              onCleanGroceryList={async () => {}}
              onToggleFavoriteGrocery={async () => {}}
              chatGroups={chatGroups}
              setChatGroups={setChatGroups}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              demarches={[]}
              setDemarches={() => {}}
              justificatifPacks={[]}
              setJustificatifPacks={() => {}}
              onAddTransaction={onAddTransaction}
              onAddEventDirect={() => {}}
              onAddEvent={() => {}}
              memories={memories}
              setMemories={setMemories}
              votes={votes}
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
              setIsPremium={() => {}}
              onTriggerPaywall={onTriggerPaywall}
              accounts={accounts}
              isKidMode={true}
            />
          </div>
        </div>
      )}

      {/* --- SUBTAB: TIMELINE --- */}
      {internalTab === 'timeline' && (
        <div className="space-y-6 animate-fade-in text-left relative z-10">
          
          <div className="flex justify-between items-center pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <div>
              <h1 className="text-xl font-black text-white">Timeline</h1>
              <p className="text-[10px] text-white/50 font-bold">Garde tes souvenirs intacts (+10 XP par post)</p>
            </div>
            
            <button 
              onClick={() => setIsAddingMemory(!isAddingMemory)}
              className="p-3 rounded-2xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#9E94FF] hover:bg-[#6C5CFF]/30 active:scale-95 transition-all cursor-pointer font-bold text-xs flex items-center space-x-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Publier</span>
            </button>
          </div>

          {/* Form: Add Memory */}
          {isAddingMemory && (
            <form onSubmit={handleAddMemory} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 animate-fade-in bg-white/5">
              <h3 className="text-xs font-black uppercase text-white/70 tracking-widest flex items-center gap-1.5">
                <span>📸</span> Nouveau souvenir de famille
              </h3>
              
              <div className="space-y-3 font-medium text-xs">
                <div className="grid grid-cols-2 gap-2 bg-[#07111F]/50 p-1 rounded-xl border border-white/5">
                  <button 
                    type="button"
                    onClick={() => setMemoryType('souvenir')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      memoryType === 'souvenir' ? 'bg-[#6C5CFF] text-white' : 'text-white/45 hover:text-white/70'
                    }`}
                  >
                    📸 Souvenir
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMemoryType('capsule')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      memoryType === 'capsule' ? 'bg-[#6C5CFF] text-white' : 'text-white/45 hover:text-white/70'
                    }`}
                  >
                    ⏳ Capsule
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder={memoryType === 'capsule' ? "Titre de la capsule (ex: Mon année de 3ème...)" : "Titre (ex: Sortie vélo, Gâteau de mamie...)"}
                  required
                  value={newMemoryTitle}
                  onChange={(e) => setNewMemoryTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF]"
                />
                <textarea 
                  placeholder="Description (ex: On a bien ri et Amadou a perdu sa chaussure !)"
                  value={newMemoryDesc}
                  onChange={(e) => setNewMemoryDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF] resize-none"
                />
                <input 
                  type="text" 
                  placeholder="Lien photo optionnel (URL ou laissez vide)"
                  value={newMemoryImg}
                  onChange={(e) => setNewMemoryImg(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-[#6C5CFF] text-white font-black rounded-xl text-xs uppercase cursor-pointer"
                >
                  Partager sur le feed 🚀
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddingMemory(false)}
                  className="px-4 py-3 bg-white/5 border border-white/10 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {/* Timeline Feed */}
          <div className="space-y-4">
            {familyActivities.map((act) => {
              const userHearted = reactions[act.id]?.heart?.includes(member.name);
              const userHahaed = reactions[act.id]?.haha?.includes(member.name);
              const userFireed = reactions[act.id]?.fire?.includes(member.name);
              const userClapped = reactions[act.id]?.clap?.includes(member.name);

              if (act.type === 'Localisation') {
                return (
                  <div key={act.id} className="bg-[#112240] border-2 border-emerald-500/30 rounded-[32px] p-5 flex flex-col justify-between shadow-lg animate-fade-in space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl shrink-0">📍</span>
                      <div className="space-y-1 text-left min-w-0 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">
                            {act.type} • {act.dateText}
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-white leading-snug">{act.title}</h3>
                        <p className="text-xs text-white/60 leading-relaxed">{act.description}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('menu'); setActiveModule('carte'); }}
                      className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-extrabold text-xs rounded-xl hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer text-center"
                    >
                      Ouvrir la carte familiale 🗺️
                    </button>
                  </div>
                );
              }

              if (act.type === 'Souvenir' || act.type === 'Capsule') {
                return (
                  <div key={act.id} className="bg-[#112240] border border-white/5 rounded-[32px] overflow-hidden shadow-xl animate-fade-in p-5 space-y-3">
                    {act.imageUrl && (
                      <img 
                        src={act.imageUrl} 
                        alt={act.title} 
                        className="w-full h-48 object-cover rounded-2xl border border-white/5"
                      />
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">
                          {act.icon} {act.type === 'Capsule' ? 'Capsule Temporelle ⏳' : 'Souvenir'} • {act.dateText} • par {act.authorName || 'Famille'}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white leading-snug">{act.title}</h3>
                      {act.description && (
                        <p className="text-xs text-white/60 leading-relaxed">{act.description}</p>
                      )}
                    </div>

                    {/* Reactions & Comments controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5 text-[10px] font-bold">
                      <button 
                        onClick={() => handleReact(act.id, 'heart')}
                        className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                          userHearted 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <span>❤️</span>
                        <span>{reactions[act.id]?.heart?.length || 0}</span>
                      </button>

                      <button 
                        onClick={() => handleReact(act.id, 'haha')}
                        className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                          userHahaed 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                            : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <span>😂</span>
                        <span>{reactions[act.id]?.haha?.length || 0}</span>
                      </button>

                      <button 
                        onClick={() => handleReact(act.id, 'fire')}
                        className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                          userFireed 
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                            : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <span>🔥</span>
                        <span>{reactions[act.id]?.fire?.length || 0}</span>
                      </button>

                      <button 
                        onClick={() => handleReact(act.id, 'clap')}
                        className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                          userClapped 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                            : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <span>👏</span>
                        <span>{reactions[act.id]?.clap?.length || 0}</span>
                      </button>

                      <button 
                        onClick={() => setActiveCommentId(activeCommentId === act.id ? null : act.id)}
                        className="px-3 py-1.5 rounded-full bg-white/5 text-white/50 hover:bg-white/10 transition cursor-pointer flex items-center space-x-1 ml-auto"
                      >
                        <span>💬</span>
                        <span>{comments[act.id]?.length || 0} Commentaire(s)</span>
                      </button>
                    </div>

                    {/* Expandable Comments list */}
                    {activeCommentId === act.id && (
                      <div className="pt-3 mt-3 border-t border-white/5 space-y-3 font-sans">
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {(comments[act.id] || []).map(cmt => (
                            <div key={cmt.id} className="bg-white/3 rounded-xl p-2.5 text-xs text-left relative">
                              <span className="font-extrabold text-[#9d94ff] block">{cmt.authorName}</span>
                              <span className="text-white/80 mt-0.5 block">{cmt.text}</span>
                              <span className="absolute top-2.5 right-2.5 text-[8px] text-white/30">{cmt.date}</span>
                            </div>
                          ))}
                          {(!comments[act.id] || comments[act.id].length === 0) && (
                            <p className="text-[10px] text-white/40 italic">Aucun commentaire pour le moment. Laisse un mot sympa ! ✍️</p>
                          )}
                        </div>

                        {/* Add Comment Input form */}
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Écrire un commentaire..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(act.id); }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF]"
                          />
                          <button 
                            onClick={() => handleAddComment(act.id)}
                            className="px-3.5 py-2 bg-[#6C5CFF] text-white font-extrabold text-xs rounded-xl cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              }

              // Visual decoration depending on activity type
              let borderStyle = "border-white/5";
              if (act.type === 'Mission') borderStyle = "border-[#6C5CFF]/30";
              else if (act.type === 'Anniversaire') borderStyle = "border-[#FFB020]/30";
              else if (act.type === 'Finance') borderStyle = "border-[#00D26A]/30";
              else if (act.type === 'Événement') borderStyle = "border-indigo-500/30";
              else if (act.type === 'Voyage') borderStyle = "border-teal-500/30";
              else if (act.type === 'Devoir') borderStyle = "border-rose-500/30";
              else if (act.type === 'Sondage') borderStyle = "border-cyan-500/30";

              return (
                <div 
                  key={act.id} 
                  className={`bg-[#112240] border-2 ${borderStyle} rounded-[32px] p-5 flex flex-col justify-between shadow-lg animate-fade-in space-y-3`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl shrink-0">{act.icon}</span>
                    <div className="space-y-1 text-left min-w-0 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">
                          {act.type} • {act.dateText}
                        </span>
                      </div>
                      <h3 className="text-xs font-black text-white leading-snug">{act.title}</h3>
                      {act.description && (
                        <p className="text-[11px] text-white/60 leading-relaxed">{act.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Reactions & Comments controls for default activities */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5 text-[10px] font-bold">
                    <button 
                      onClick={() => handleReact(act.id, 'heart')}
                      className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                        userHearted 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                          : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <span>❤️</span>
                      <span>{reactions[act.id]?.heart?.length || 0}</span>
                    </button>

                    <button 
                      onClick={() => handleReact(act.id, 'haha')}
                      className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                        userHahaed 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <span>😂</span>
                      <span>{reactions[act.id]?.haha?.length || 0}</span>
                    </button>

                    <button 
                      onClick={() => handleReact(act.id, 'fire')}
                      className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                        userFireed 
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                          : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <span>🔥</span>
                      <span>{reactions[act.id]?.fire?.length || 0}</span>
                    </button>

                    <button 
                      onClick={() => handleReact(act.id, 'clap')}
                      className={`px-3 py-1.5 rounded-full flex items-center space-x-1 transition cursor-pointer ${
                        userClapped 
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                          : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <span>👏</span>
                      <span>{reactions[act.id]?.clap?.length || 0}</span>
                    </button>

                    <button 
                      onClick={() => setActiveCommentId(activeCommentId === act.id ? null : act.id)}
                      className="px-3 py-1.5 rounded-full bg-white/5 text-white/50 hover:bg-white/10 transition cursor-pointer flex items-center space-x-1 ml-auto"
                    >
                      <span>💬</span>
                      <span>{comments[act.id]?.length || 0} Commentaire(s)</span>
                    </button>
                  </div>

                  {/* Expandable Comments list for default activities */}
                  {activeCommentId === act.id && (
                    <div className="pt-3 mt-3 border-t border-white/5 space-y-3 font-sans">
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(comments[act.id] || []).map(cmt => (
                          <div key={cmt.id} className="bg-white/3 rounded-xl p-2.5 text-xs text-left relative">
                            <span className="font-extrabold text-[#9d94ff] block">{cmt.authorName}</span>
                            <span className="text-white/80 mt-0.5 block">{cmt.text}</span>
                            <span className="absolute top-2.5 right-2.5 text-[8px] text-white/30">{cmt.date}</span>
                          </div>
                        ))}
                        {(!comments[act.id] || comments[act.id].length === 0) && (
                          <p className="text-[10px] text-white/40 italic">Aucun commentaire pour le moment. Laisse un mot sympa ! ✍️</p>
                        )}
                      </div>

                      {/* Add Comment Input form */}
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Écrire un commentaire..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(act.id); }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF]"
                        />
                        <button 
                          onClick={() => handleAddComment(act.id)}
                          className="px-3.5 py-2 bg-[#6C5CFF] text-white font-extrabold text-xs rounded-xl cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
            {familyActivities.length === 0 && (
              <p className="text-xs text-center text-white/40 py-8 font-bold">Aucune activité enregistrée pour le moment !</p>
            )}
          </div>

        </div>
      )}

      {/* --- SUBTAB: PLUS (MENU OF ACCESSIBLE MODULES) --- */}
      {internalTab === 'plus' && activeModule === '' && (
        <div className="space-y-6 animate-fade-in relative z-10 text-left">
          
          {/* Hub Header Styled Like Reference Visual */}
          <div className="flex justify-between items-center pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-2 border-b border-white/5">
            <div>
              <h1 className="text-xl font-black text-white">Hub d'Aventures Ado ⚡</h1>
              <p className="text-[10px] text-white/50 font-bold font-sans">Tout ce qu'il te faut, au même endroit.</p>
            </div>

            <div className="flex items-center space-x-3.5 bg-white/3 border border-white/5 rounded-2xl py-2 px-3 shadow-inner">
              <div className="relative">
                <img 
                  src={member.photoUrl} 
                  alt={member.name} 
                  className="w-10 h-10 rounded-full object-cover border border-[#6C5CFF]/30"
                />
              </div>
              <div className="text-left space-y-0.5">
                <h4 className="text-xs font-black text-white leading-none">{member.name}</h4>
                <p className="text-[9px] text-[#FFB020] font-black uppercase leading-none">Niveau {level}</p>
                
                {/* Micro progress bar */}
                <div className="w-20 mt-1">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] rounded-full"
                      style={{ width: `${(currentXP / xpPerLevel) * 100}%` }}
                    />
                  </div>
                  <span className="text-[7px] font-bold text-white/45 block text-right mt-0.5">
                    {currentXP} / {xpPerLevel} XP
                  </span>
                </div>
              </div>
              <button className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white relative cursor-pointer">
                <Bell className="w-4 h-4" />
                {alerts.filter(a => !a.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>
          </div>

          {/* Défi du jour Widget */}
          <div className="bg-[#112240] border border-[#6C5CFF]/30 rounded-[32px] p-5 flex items-center justify-between shadow-lg relative overflow-hidden text-left">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-2xl">
                🏆
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white flex items-center gap-1">
                  <span>Défi du jour</span>
                  <span>🔥</span>
                </h4>
                <p className="text-[10px] text-white/50 font-bold leading-tight">Termine tes devoirs et gagne 50 XP</p>
                
                {/* Progress bar */}
                <div className="flex items-center space-x-2 pt-1">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[30%] h-full bg-amber-500 rounded-full"></div>
                  </div>
                  <span className="text-[8px] font-bold text-white/40">0 / 1</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('taches'); setTeenChoreSubTab('my_tasks'); }}
              className="px-4 py-2.5 bg-[#6C5CFF] text-white hover:opacity-90 transition-all font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-[#6C5CFF]/25 flex items-center space-x-1"
            >
              <span>Voir mes missions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-6">
            
            {/* Section 1: Progression & Récompenses (🎮) */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/45 uppercase tracking-widest block font-sans">🎮 Progression & Récompenses</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {isModuleAllowed('taches') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('taches'); setTeenChoreSubTab('my_tasks'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🎯</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Missions</h4>
                      <p className="text-[8px] font-bold text-indigo-400 mt-0.5 leading-none">{tasks.filter(t => !t.done && parseChoreTitle(t.title).attributionMode !== 'wall').length} en cours</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('taches') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('taches'); setTeenChoreSubTab('wall'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">📋</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Mur des tâches</h4>
                      <p className="text-[8px] font-bold text-indigo-400 mt-0.5 leading-none">
                        {tasks.filter(t => parseChoreTitle(t.title).attributionMode === 'wall' && !t.done).length} tâche{tasks.filter(t => parseChoreTitle(t.title).attributionMode === 'wall' && !t.done).length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('taches') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('boutique'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🛍️</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Boutique</h4>
                      <p className="text-[8px] font-bold text-pink-400 mt-0.5 leading-none">{boutiqueRewards.length > 0 ? "Nouveau !" : "Disponible"}</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('budget') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('argent'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">👛</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Portefeuille</h4>
                      <p className="text-[8px] font-bold text-emerald-400 mt-0.5 leading-none">{myAccount.balance.toFixed(2)} €</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('budget') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('argent'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🐷</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Objectifs d'épargne</h4>
                      <p className="text-[8px] font-bold text-sky-400 mt-0.5 leading-none">{goals.filter(g => g.category !== 'boutique_reward').length} objectif{goals.filter(g => g.category !== 'boutique_reward').length > 1 ? 's' : ''}</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('taches') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('badges'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🎖️</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Badges</h4>
                      <p className="text-[8px] font-bold text-purple-400 mt-0.5 leading-none">{myBadges.length} badge{myBadges.length > 1 ? 's' : ''}</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 2: École & Organisation (📚) */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/45 uppercase tracking-widest block font-sans">📚 École & Organisation</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {isModuleAllowed('ecole') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('ecole_devoirs'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">📖</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">École & Devoirs</h4>
                      <p className="text-[8px] font-bold text-emerald-400 mt-0.5 leading-none">{schoolTasks.filter(t => !t.done).length} devoir{schoolTasks.filter(t => !t.done).length > 1 ? 's' : ''}</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('ecole') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('notes_bulletins'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">📈</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Notes & Bulletins</h4>
                      <p className="text-[8px] font-bold text-teal-400 mt-0.5 leading-none">Moy. {getAdoAverage()}</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('ecole') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('emploi_temps'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">📅</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Emploi du temps</h4>
                      <p className="text-[8px] font-bold text-blue-400 mt-0.5 leading-none">Semaine A</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('agenda') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('agenda'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">📆</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Agenda partagé familial</h4>
                      <p className="text-[8px] font-bold text-amber-400 mt-0.5 leading-none">{events.length} événement{events.length > 1 ? 's' : ''}</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('ecole') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('tuteur_ia'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Tuteur IA</h4>
                      <p className="text-[8px] font-bold text-pink-400 mt-0.5 leading-none">Besoin d'aide ?</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('messagerie') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('messagerie'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">💬</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Messages</h4>
                      <p className="text-[8px] font-bold text-indigo-400 mt-0.5 leading-none">{totalUnreadChat > 0 ? `${totalUnreadChat} nouveau${totalUnreadChat > 1 ? 'x' : ''}` : "Discussion"}</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Vie de Famille (👨‍👩‍👧‍👦) */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/45 uppercase tracking-widest block font-sans">👨‍👩‍👧‍👦 Vie de Famille</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {isModuleAllowed('menu_semaine') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('menus'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🥗</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Menu de la semaine</h4>
                      <p className="text-[8px] font-bold text-orange-400 mt-0.5 leading-none">À découvrir</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('courses') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('courses'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🛒</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Liste de courses</h4>
                      <p className="text-[8px] font-bold text-rose-400 mt-0.5 leading-none">Liste partagée</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('conseil_famille') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('conseil'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">👪</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Conseil de famille</h4>
                      <p className="text-[8px] font-bold text-pink-400 mt-0.5 leading-none">
                        {votes.filter(v => v.active).length > 0 
                          ? `${votes.filter(v => v.active).length} vote${votes.filter(v => v.active).length > 1 ? 's' : ''} en cours` 
                          : "Sondages"}
                      </p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('peacemaker') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('peacemaker'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">✌️</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">PeaceMaker IA</h4>
                      <p className="text-[8px] font-bold text-amber-400 mt-0.5 leading-none">Régler un souci</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('carte_familiale') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('carte'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🗺️</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Carte familiale</h4>
                      <p className="text-[8px] font-bold text-emerald-400 mt-0.5 leading-none">Explorer la carte</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 4: Souvenirs & Bien-être (💜) */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/45 uppercase tracking-widest block font-sans">💜 Souvenirs & Bien-être</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {isModuleAllowed('capsule_temporelle') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('capsule'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">⏳</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Capsule temporelle</h4>
                      <p className="text-[8px] font-bold text-amber-400 mt-0.5 leading-none">
                        {memories.filter(m => m.theme === 'capsule').length} souvenir{memories.filter(m => m.theme === 'capsule').length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('histoires_soir') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('conteur'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🌙</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Histoires du soir</h4>
                      <p className="text-[8px] font-bold text-indigo-400 mt-0.5 leading-none">Nouveau conte</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('voyages') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('voyages'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🧳</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Voyages</h4>
                      <p className="text-[8px] font-bold text-sky-400 mt-0.5 leading-none">{trips.length} voyage{trips.length > 1 ? 's' : ''}</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('documents') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('documents'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">📂</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Coffre-fort</h4>
                      <p className="text-[8px] font-bold text-cyan-400 mt-0.5 leading-none">Accès autorisé</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('sante') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('sante'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">💖</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Santé</h4>
                      <p className="text-[8px] font-bold text-rose-400 mt-0.5 leading-none">Bien-être</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('animaux') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('animaux'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🐾</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Animaux</h4>
                      <p className="text-[8px] font-bold text-amber-400 mt-0.5 leading-none">Nos compagnons</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 5: Ouverture extérieure (🌍) */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/45 uppercase tracking-widest block font-sans">🌍 Ouverture Extérieure</span>
              <div className="grid grid-cols-3 gap-3">
                {isModuleAllowed('commune') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('commune'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🏢</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Ma Commune</h4>
                      <p className="text-[8px] font-bold text-amber-400 mt-0.5 leading-none">Infos utiles</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('etablissement') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('etablissement'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">🎓</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Mon établissement</h4>
                      <p className="text-[8px] font-bold text-cyan-400 mt-0.5 leading-none">{schoolName || "Collège"}</p>
                    </div>
                  </button>
                )}

                {isModuleAllowed('repertoire_important') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('repertoire_important'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">📞</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Répertoire utile</h4>
                      <p className="text-[8px] font-bold text-emerald-400 mt-0.5 leading-none">Numéros utiles</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 6: Profil & Paramètres (⚙️) */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/45 uppercase tracking-widest block font-sans">⚙️ Profil & Paramètres</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button 
                  onClick={onOpenProfileSwitcher}
                  className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                >
                  <span className="text-2xl">👤</span>
                  <div>
                    <h4 className="text-[10px] font-black text-white leading-tight">Profil</h4>
                    <p className="text-[8px] font-bold text-indigo-400 mt-0.5 leading-none">Mes infos</p>
                  </div>
                </button>

                {isModuleAllowed('parametres') && (
                  <button 
                    onClick={() => { setActiveTab('menu'); setActiveModule('settings'); }}
                    className="bg-[#112240]/65 border border-white/10 rounded-2xl p-3 text-center flex flex-col items-center justify-center space-y-2 hover:bg-[#112240]/90 hover:border-[#6C5CFF]/40 active:scale-95 transition-all aspect-square cursor-pointer w-full"
                  >
                    <span className="text-2xl">⚙️</span>
                    <div>
                      <h4 className="text-[10px] font-black text-white leading-tight">Paramètres</h4>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5 leading-none">Préférences</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Ma journée Widget */}
          <div className="bg-gradient-to-r from-[#112240] to-[#1a2e5c] border border-white/5 rounded-[32px] p-5 flex items-center justify-between shadow-lg relative overflow-hidden text-left">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-2xl">
                ☀️
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-white">Ma journée</h4>
                <p className="text-[10px] text-white/60 leading-tight font-sans">Bonne journée {member.name} !</p>
                <p className="text-[9px] text-[#FFB020] font-black font-sans uppercase tracking-wider">Prêt à relever de nouveaux défis ? 💪</p>
              </div>
            </div>
            <span className="text-3xl shrink-0 animate-bounce">🚀</span>
          </div>
        </div>
      )}

      {/* --- RENDER MODULE: BADGES GALLERY --- */}
      {internalTab === 'plus' && activeModule === 'badges' && (
        <div className="space-y-6 animate-fade-in text-left relative z-10">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Mes Badges 🎖️</h1>
              <p className="text-[10px] text-white/50 font-bold">Relève des défis pour enrichir ta collection !</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { id: 'badge-hw', title: 'Premier devoir terminé 📚', desc: 'Tu as complété ton premier devoir scolaire.', icon: '📝' },
              { id: 'badge-task', title: 'Missionnaire Actif 🧹', desc: '5 missions d\'entraide familiale accomplies.', icon: '⚡' },
              { id: 'badge-vote', title: 'Citoyen du Foyer ⚖️', desc: 'Tu as participé aux votes du conseil de famille.', icon: '🗳️' },
              { id: 'badge-pm', title: 'Médiateur de Paix 🕊️', desc: 'Tu as résolu un conflit en utilisant PeaceMaker IA.', icon: '🕊️' },
              { id: 'badge-story', title: 'Grand Conteur 🌙', desc: 'Tu as créé ton premier conte magique du soir.', icon: '📖' },
              { id: 'badge-save', title: 'Épargnant Sage 🪙', desc: 'Objectif d\'épargne personnel défini.', icon: '💰' },
              { id: 'badge-trip', title: 'Aventurier ✈️', desc: 'Voyage familial prévu à l\'horizon.', icon: '🗺️' },
              { id: 'badge-brain', title: 'Major de Promo 🧠', desc: 'Moyenne générale scolaire supérieure à 15/20.', icon: '👑' }
            ].map((badge) => {
              const isUnlocked = myBadges.some(b => b.id === badge.id);
              return (
                <div 
                  key={badge.id} 
                  className={`bg-[#112240]/65 border rounded-2xl p-4 text-center flex flex-col items-center justify-between space-y-3 relative overflow-hidden transition-all ${
                    isUnlocked 
                      ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10 opacity-100' 
                      : 'border-white/5 opacity-40 grayscale'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-inner ${
                    isUnlocked ? 'bg-indigo-500/15 text-white' : 'bg-white/5 text-white/30'
                  }`}>
                    {badge.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white leading-tight">{badge.title}</h4>
                    <p className="text-[9px] text-white/50 leading-snug mt-1">{badge.desc}</p>
                  </div>
                  <div className="pt-1 w-full">
                    {isUnlocked ? (
                      <span className="inline-block text-[8px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full">
                        Débloqué 🎉
                      </span>
                    ) : (
                      <span className="inline-block text-[8px] font-black uppercase tracking-wider bg-white/5 text-white/30 px-2.5 py-1 rounded-full">
                        🔒 Verrouillé
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- RENDER MODULE: AGENDA DIRECT --- */}
      {internalTab === 'plus' && activeModule === 'agenda' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Agenda de Famille 📆</h1>
              <p className="text-[10px] text-white/50 font-bold">Calendrier partagé de la maison</p>
            </div>
          </div>
          <div className="relative z-10 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl p-1 bg-[#112240]">
            <Agenda 
              events={events}
              members={members}
              activeMemberId={member.id}
              onAddEventClick={() => {
                const title = prompt("Nom de l'événement :");
                if (title && onAddEvent) {
                  const now = new Date().toISOString().slice(0, 16);
                  onAddEvent(title, now);
                }
              }}
              onToggleEventDone={onToggleEventDone}
              onMoveEvent={onMoveEvent}
              defaultSelectedDate={new Date().toISOString().split('T')[0]}
              externalEvents={externalEvents}
              setExternalEvents={setExternalEvents}
              calendarSources={calendarSources}
              setCalendarSources={setCalendarSources}
              currentCalendarCountry={currentCalendarCountry}
              setCurrentCalendarCountry={setCurrentCalendarCountry}
              onBack={() => setActiveModule('')}
            />
          </div>
        </div>
      )}

      {/* --- RENDER MODULE: COMMUNE DIRECT --- */}
      {internalTab === 'plus' && activeModule === 'commune' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Ma Commune 🏢</h1>
              <p className="text-[10px] text-white/50 font-bold">Informations de la ville</p>
            </div>
          </div>
          <div className="relative z-10 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl p-1 bg-[#112240]">
            <CommuneHub 
              communeName={communeName} 
              onBack={() => setActiveModule('')} 
            />
          </div>
        </div>
      )}

      {/* --- RENDER MODULE: ETABLISSEMENT DIRECT --- */}
      {internalTab === 'plus' && activeModule === 'etablissement' && (
        <div className="space-y-6 animate-fade-in text-left relative z-10">
          
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Mon Établissement 🎓</h1>
              <p className="text-[10px] text-white/50 font-bold">Gère ta scolarité au quotidien</p>
            </div>
          </div>

          {/* School Card */}
          <div className="bg-[#112240] border border-[#6C5CFF]/30 rounded-[32px] p-6 space-y-4 shadow-lg text-left">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 rounded-2xl flex items-center justify-center text-2xl">
                🎓
              </div>
              <div>
                <h2 className="text-base font-black text-white">{schoolName}</h2>
                <p className="text-xs text-white/50">Classe de {member.age ? `${parseInt(member.age) - 6}ème` : 'Ado'}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#112240]/60 border border-white/5 rounded-[28px] p-5 space-y-2">
              <span className="text-[10px] font-black text-white/45 uppercase tracking-wider block">Moyenne Générale</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-black text-[#6C5CFF]">{getAdoAverage()}</span>
                <span className="text-xs text-white/45">/20</span>
              </div>
              <p className="text-[9px] text-white/50 leading-tight">Mise à jour par les parents</p>
            </div>

            <div className="bg-[#112240]/60 border border-white/5 rounded-[28px] p-5 space-y-2">
              <span className="text-[10px] font-black text-white/45 uppercase tracking-wider block">Devoirs Restants</span>
              <span className="text-2xl font-black text-[#FFB020]">{schoolTasks.filter(t => !t.done).length}</span>
              <p className="text-[9px] text-white/50 leading-tight">À faire cette semaine</p>
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-[#112240] border border-white/5 rounded-[32px] p-5 space-y-3 shadow-lg">
            <h3 className="text-xs font-black uppercase text-white/45 tracking-wider flex items-center gap-1.5">
              <span>📅</span> Emploi du Temps du Jour
            </h3>
            
            {schedule && schedule.length > 0 ? (
              <div className="space-y-2">
                {schedule.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/3 border border-white/5 text-xs">
                    <div>
                      <h4 className="font-bold text-white">{item.subject || item.title}</h4>
                      <p className="text-[10px] text-white/40">{item.time || 'Heure non précisée'}</p>
                    </div>
                    {item.room && (
                      <span className="text-[10px] font-extrabold text-[#6C5CFF] bg-[#6C5CFF]/10 px-2 py-0.5 rounded-md">
                        Salle {item.room}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/35 text-center py-4 font-bold">Aucun cours aujourd'hui !</p>
            )}

            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('emploi_temps'); }}
              className="w-full mt-2 py-2.5 bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/30 border border-[#6C5CFF]/25 text-[#9E94FF] font-extrabold text-xs rounded-xl cursor-pointer text-center active:scale-97 transition-all"
            >
              Voir tout l'emploi du temps ➔
            </button>
          </div>

          {/* Quick Actions / Homework List */}
          <div className="p-5 rounded-[28px] bg-white/3 border border-white/5 space-y-3 text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Accès Rapide</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setActiveTab('menu'); setActiveModule('ecole_devoirs'); }}
                className="p-4 rounded-2xl bg-[#112240] border border-white/5 hover:border-white/10 text-white font-bold text-xs transition-all text-left flex items-center justify-between cursor-pointer active:scale-98"
              >
                <div className="flex items-center space-x-2.5">
                  <span>📝</span>
                  <span>Consulter le Cahier de Textes</span>
                </div>
                <span className="text-[#6C5CFF]">➔</span>
              </button>
              <button
                onClick={() => { setActiveTab('menu'); setActiveModule('tuteur_ia'); }}
                className="p-4 rounded-2xl bg-[#112240] border border-white/5 hover:border-white/10 text-white font-bold text-xs transition-all text-left flex items-center justify-between cursor-pointer active:scale-98"
              >
                <div className="flex items-center space-x-2.5">
                  <span>🤖</span>
                  <span>Étudier avec le Tuteur Scolaire IA</span>
                </div>
                <span className="text-[#6C5CFF]">➔</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* --- RENDER MODULE: PEACEMAKER --- */}
      {internalTab === 'plus' && activeModule === 'peacemaker' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Médiateur PeaceMaker</h1>
              <p className="text-[10px] text-white/50 font-bold">Résous tes litiges familiaux (+25 XP par paix)</p>
            </div>
          </div>
          <PeaceMaker 
            isPremium={isPremium} 
            onTriggerPaywall={onTriggerPaywall}
            onMediationSuccess={() => handleAwardAdoXP(25, 'PeaceMaker Conflit Résolu 🕊️')}
          />
        </div>
      )}

      {/* --- RENDER MODULE: HISTOIRES CONTEUR --- */}
      {internalTab === 'plus' && activeModule === 'conteur' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Histoires du Soir</h1>
              <p className="text-[10px] text-white/50 font-bold">Génère tes propres contes IA (+15 XP par conte)</p>
            </div>
          </div>
          <ConteurIA 
            member={member} 
            members={members} 
            onBack={() => setActiveModule('')}
            isPremium={isPremium}
            onTriggerPaywall={onTriggerPaywall}
            isKidMode={true}
            onStorySuccess={() => handleAwardAdoXP(15, 'Conte de nuit créé 🌙')}
          />
        </div>
      )}

      {/* --- RENDER MODULE: CONSEIL --- */}
      {internalTab === 'plus' && activeModule === 'conseil' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Conseil de Famille</h1>
              <p className="text-[10px] text-white/50 font-bold">Donne ton avis et vote pour ton foyer (+10 XP)</p>
            </div>
          </div>
          <ConseilFamille 
            votes={votes} 
            setVotes={setVotes} 
            activeMemberId={member.id} 
            members={members}
          />
        </div>
      )}

      {/* --- RENDER MODULE: CAPSULE --- */}
      {internalTab === 'plus' && activeModule === 'capsule' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Capsule Temporelle</h1>
              <p className="text-[10px] text-white/50 font-bold">Mets des souvenirs au chaud pour plus tard</p>
            </div>
          </div>
          <CapsuleTemporelle 
            memories={memories} 
            setMemories={setMemories} 
            activeMemberId={member.id} 
            isPremium={isPremium}
            onTriggerPaywall={onTriggerPaywall}
            members={members}
          />
        </div>
      )}

      {/* --- RENDER MODULE: CARTE --- */}
      {internalTab === 'plus' && activeModule === 'carte' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Carte de la Famille</h1>
              <p className="text-[10px] text-white/50 font-bold">Localise tes proches en toute sécurité</p>
            </div>
          </div>
          <div className="rounded-[32px] overflow-hidden border border-white/10 shadow-2xl h-[calc(100vh-210px)] relative z-10">
            <FamilyMap 
              members={members} 
              activeMemberId={member.id} 
              onUpdateMemberProfile={async () => {}} 
            />
          </div>
        </div>
      )}

      {/* --- RENDER MODULE: MISSIONS DETAILS (taches) --- */}
      {internalTab === 'plus' && activeModule === 'taches' && (() => {
        const wallTasks = parsedTasks.filter(t => t.attributionMode === 'wall' && !t.isArchived);
        const dailySpecialTask = wallTasks.find(t => t.isDailySpecial);
        const regularWallTasks = wallTasks.filter(t => t.id !== dailySpecialTask?.id);

        const renderWallAction = (task: any) => {
          const isCandidate = task.candidates?.includes(member.id);
          const isAccepted = task.acceptedVolunteers?.includes(member.id);
          const isFull = (task.acceptedVolunteers?.length || 0) >= (task.maxParticipants || 1);

          if (isAccepted) {
            return (
              <button disabled className="w-full py-2.5 rounded-xl bg-[#00D26A]/20 text-[#00D26A] font-extrabold text-xs uppercase tracking-wider border border-[#00D26A]/30">
                Acceptée 🎉
              </button>
            );
          }
          if (isCandidate) {
            return (
              <button disabled className="w-full py-2.5 rounded-xl bg-[#FFB020]/20 text-[#FFB020] font-extrabold text-xs uppercase tracking-wider border border-[#FFB020]/30">
                Candidature envoyée ⏳
              </button>
            );
          }
          if (isFull) {
            return (
              <button disabled className="w-full py-2.5 rounded-xl bg-white/5 text-white/30 font-extrabold text-xs uppercase tracking-wider border border-white/5">
                Complète (Max atteint)
              </button>
            );
          }

          if (task.selectionMode === 'first_come') {
            return (
              <button 
                onClick={() => onTakeWallTask?.(task.id, member.id)}
                className="w-full py-2.5 rounded-xl bg-[#00D26A] text-[#07111F] font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg"
              >
                Je prends 🚀
              </button>
            );
          } else {
            return (
              <button 
                onClick={() => onApplyWallTask?.(task.id, member.id)}
                className="w-full py-2.5 rounded-xl bg-[#6C5CFF] text-white font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg"
              >
                Je postule 🙋‍♂️
              </button>
            );
          }
        };

        return (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
              <button 
                onClick={() => setActiveModule('')}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-black text-white">Missions Familiales</h1>
                <p className="text-[10px] text-white/50 font-bold">Gagne des points, de l'XP et de l'argent de poche</p>
              </div>
            </div>

            {/* Premium Sub-tabs navigation */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 relative z-20">
              <button
                onClick={() => setTeenChoreSubTab('my_tasks')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                  teenChoreSubTab === 'my_tasks'
                    ? 'bg-[#6C5CFF] text-white shadow-lg'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                📋
                <span>Mes tâches ({todoTasks.length})</span>
              </button>
              <button
                onClick={() => setTeenChoreSubTab('wall')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                  teenChoreSubTab === 'wall'
                    ? 'bg-gradient-to-r from-[#FF4D6D] to-[#FF8C00] text-white shadow-lg'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                🔥
                <span>Mur des tâches ({wallTasks.length})</span>
              </button>
            </div>

            {teenChoreSubTab === 'my_tasks' ? (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Missions à faire :</span>
                  
                  {todoTasks.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center space-y-2">
                      <span className="text-4xl block">🎉</span>
                      <p className="text-sm font-black text-white">Bravo ! Tout est fini !</p>
                      <p className="text-xs text-white/40 leading-relaxed font-bold">Tu as accompli toutes les tâches demandées par tes parents pour aujourd'hui.</p>
                    </div>
                  ) : (
                    todoTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="bg-[#112240] border-2 border-[#6C5CFF]/30 rounded-[28px] p-4 flex items-center justify-between shadow-lg"
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <span className="text-[8px] font-bold bg-[#6C5CFF]/20 text-[#9d94ff] px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Famille 🏠
                            </span>
                            {task.priority === 'high' && (
                              <span className="text-[8px] font-bold bg-[#FF4D6D]/20 text-[#FF4D6D] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                ⚠️ Urgent
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white mt-1 leading-snug">{task.title}</h3>
                          {task.description && (
                            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{task.description}</p>
                          )}
                          {task.status === 'refused' && (
                            <p className="text-xs text-[#FF4D6D] font-bold mt-1">❌ À corriger (demande de tes parents)</p>
                          )}
                          <div className="flex items-center flex-wrap gap-1.5 mt-2 text-[9px] font-bold">
                            <span className="text-[#FFB020] bg-[#FFB020]/10 border border-[#FFB020]/20 px-2 py-0.5 rounded-lg flex items-center space-x-1 shrink-0">
                              <Star className="w-3 h-3 fill-[#FFB020] text-[#FFB020]" />
                              <span>+{task.rewardPoints || 10} pts</span>
                            </span>
                            {task.rewardAmount ? (
                              <span className="text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-2 py-0.5 rounded-lg flex items-center shrink-0">
                                💰 +{task.rewardAmount.toFixed(2)} €
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleCompleteTask(task.id, task.rewardPoints || 10)}
                          className="w-12 h-12 bg-[#00D26A] rounded-[18px] flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer shrink-0"
                        >
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Form: Propose task */}
                <form onSubmit={handleProposeMission} className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-4">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white">
                    <PlusCircle className="w-5 h-5 text-[#FFB020]" />
                    <span>Proposer une nouvelle mission</span>
                  </div>
                  
                  <div className="space-y-3 font-bold">
                    <input 
                      type="text" 
                      placeholder="Ex: Nettoyer le balcon, tondre la pelouse, laver la voiture..."
                      value={suggestionText}
                      onChange={(e) => setSuggestionText(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#FFB020]/50"
                    />
                    
                    <div className="flex items-center justify-between bg-[#07111F] p-3 rounded-2xl border border-white/5">
                      <span className="text-xs text-white/60 font-medium">Points demandés :</span>
                      <div className="flex items-center space-x-3">
                        <button 
                          type="button" 
                          onClick={() => setSuggestionPts(Math.max(10, suggestionPts - 10))}
                          className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs text-[#FFB020] font-black">{suggestionPts} pts</span>
                        <button 
                          type="button" 
                          onClick={() => setSuggestionPts(Math.min(100, suggestionPts + 10))}
                          className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3.5 bg-[#FFB020] text-[#07111F] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Envoyer aux parents 💬
                  </button>
                </form>

                {/* Pending tasks */}
                {pendingValidationTasks.length > 0 && (
                  <div className="space-y-3 animate-fade-in">
                    <span className="text-[10px] font-black text-[#FFB020] uppercase tracking-wider block">En attente de validation parentale :</span>
                    <div className="space-y-2">
                      {pendingValidationTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-4 bg-[#112240] rounded-[24px] border border-white/10">
                          <div>
                            <h4 className="text-xs font-bold text-white/80">{task.title}</h4>
                            <p className="text-[10px] text-white/40">Soumis - En cours de vérification</p>
                          </div>
                          <span className="text-xs font-black text-[#FFB020] flex items-center space-x-1 bg-[#FFB020]/10 px-2 py-1 rounded-xl font-sans">
                            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                            <span>+{task.rewardPoints || 10} pts</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed history */}
                {validatedTasks.length > 0 && (
                  <div className="space-y-3 animate-fade-in">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Missions complétées :</span>
                    <div className="bg-white/5 rounded-[32px] p-2 space-y-2 border border-white/5">
                      {validatedTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                          <div>
                            <h4 className="text-xs font-bold text-white/60 line-through">{task.title}</h4>
                            <p className="text-[10px] text-white/35">Validé par les parents</p>
                          </div>
                          <span className="text-xs font-black text-[#00D26A] flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>+{task.rewardPoints || 10} pts</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Marketplace-style "Mur des tâches" 🔥
              <div className="space-y-6 animate-fade-in">
                
                {/* Mission du jour header card */}
                {dailySpecialTask ? (
                  <div className="relative overflow-hidden rounded-[32px] p-0.5 bg-gradient-to-tr from-[#FFB020] via-[#FF4D6D] to-[#6C5CFF] shadow-2xl animate-fade-in">
                    <div className="bg-[#0F1E3D]/95 rounded-[30px] p-5 space-y-4 text-left relative overflow-hidden backdrop-blur-md">
                      {/* Glow halo */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D6D]/20 blur-2xl pointer-events-none" />
                      
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-black text-white px-2.5 py-1 rounded-full bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] uppercase tracking-widest border border-white/20">
                          ⭐ Mission du jour
                        </span>
                        <span className="text-xs font-black text-[#FFB020] bg-[#FFB020]/15 px-2.5 py-1 rounded-xl">
                          +{dailySpecialTask.rewardPoints} Pts
                        </span>
                      </div>

                      {dailySpecialTask.imageUrl && (
                        <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/10 my-2 bg-[#07111F]">
                          <img src={dailySpecialTask.imageUrl} alt={dailySpecialTask.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <h3 className="text-base font-black text-white leading-snug">{dailySpecialTask.title}</h3>
                        {dailySpecialTask.description && (
                          <p className="text-xs text-white/70 leading-relaxed font-medium">{dailySpecialTask.description}</p>
                        )}
                      </div>

                      {/* Metadata Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] text-white/70 font-extrabold">
                        <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg flex items-center">📂 {dailySpecialTask.category}</span>
                        <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg flex items-center">⚡ {dailySpecialTask.difficulty === 'easy' ? 'Facile' : dailySpecialTask.difficulty === 'hard' ? 'Difficile' : 'Moyen'}</span>
                        {dailySpecialTask.estimatedTime && <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg flex items-center">⏱️ {dailySpecialTask.estimatedTime}</span>}
                        {dailySpecialTask.rewardAmount ? (
                          <span className="bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] px-2.5 py-1 rounded-lg flex items-center">💰 +{dailySpecialTask.rewardAmount.toFixed(2)} €</span>
                        ) : null}
                        {dailySpecialTask.xpReward && (
                          <span className="bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#9E94FF] px-2.5 py-1 rounded-lg flex items-center">✨ +{dailySpecialTask.xpReward} XP</span>
                        )}
                        <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg flex items-center">👥 {dailySpecialTask.acceptedVolunteers?.length || 0} / {dailySpecialTask.maxParticipants} pris</span>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {renderWallAction(dailySpecialTask)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-[24px] bg-[#6C5CFF]/10 border border-[#6C5CFF]/25 text-center text-xs font-bold text-white/60">
                    💡 Astuce : Les missions du Mur sont ouvertes à tous ! Premier arrivé, premier servi 🚀
                  </div>
                )}

                {/* Available missions grid */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Missions disponibles :</span>
                  
                  {regularWallTasks.length === 0 && !dailySpecialTask ? (
                    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center space-y-2">
                      <span className="text-4xl block">📭</span>
                      <p className="text-sm font-black text-white">Le mur est vide !</p>
                      <p className="text-xs text-white/40 leading-relaxed font-bold">Aucune mission ouverte n'est proposée pour le moment. Repasse plus tard !</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {regularWallTasks.map(task => {
                        const hasImg = !!task.imageUrl;
                        return (
                          <div 
                            key={task.id} 
                            className="bg-[#112240] border border-white/8 rounded-[32px] p-4 flex flex-col justify-between space-y-4 hover:border-[#6C5CFF]/30 transition duration-300"
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <span className="text-[8px] font-black bg-[#6C5CFF]/15 text-[#9E94FF] px-2 py-0.5 rounded-md uppercase tracking-wider border border-[#6C5CFF]/10">
                                  {task.category}
                                </span>
                                <span className="text-[10px] font-black text-[#FFB020] bg-[#FFB020]/10 px-2 py-0.5 rounded-lg font-sans">
                                  +{task.rewardPoints} Pts
                                </span>
                              </div>

                              {hasImg && (
                                <div className="w-full h-24 rounded-2xl overflow-hidden border border-white/5 bg-[#07111F]">
                                  <img src={task.imageUrl} alt={task.title} className="w-full h-full object-cover" />
                                </div>
                              )}

                              <div className="text-left space-y-1">
                                <h4 className="text-sm font-black text-white">{task.title}</h4>
                                {task.description && (
                                  <p className="text-xs text-white/60 font-medium leading-relaxed">{task.description}</p>
                                )}
                              </div>

                              {/* Badges row */}
                              <div className="flex flex-wrap gap-1.5 text-[9px] text-white/60 font-bold pt-1">
                                <span className="bg-white/5 px-2 py-0.5 rounded-md flex items-center">⚡ {task.difficulty === 'easy' ? 'Facile' : task.difficulty === 'hard' ? 'Difficile' : 'Moyen'}</span>
                                {task.estimatedTime && <span className="bg-white/5 px-2 py-0.5 rounded-md flex items-center">⏱️ {task.estimatedTime}</span>}
                                {task.rewardAmount ? (
                                  <span className="bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] px-2 py-0.5 rounded-md flex items-center">💰 +{task.rewardAmount.toFixed(2)} €</span>
                                ) : null}
                                {task.xpReward && (
                                  <span className="bg-[#6C5CFF]/15 text-[#9E94FF] px-2 py-0.5 rounded-md flex items-center">✨ +{task.xpReward} XP</span>
                                )}
                                <span className="bg-white/5 px-2 py-0.5 rounded-md flex items-center">👥 {task.acceptedVolunteers?.length || 0} / {task.maxParticipants} pris</span>
                              </div>
                            </div>

                            <div className="pt-1">
                              {renderWallAction(task)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        );
      })()}

      {/* --- RENDER MODULE: WALLET DETAIL (argent) --- */}
      {internalTab === 'plus' && activeModule === 'argent' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Mon Portefeuille Tirelire</h1>
              <p className="text-[10px] text-white/50 font-bold">Suivi financier et objectifs d'épargne</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 border border-[#00D26A]/30 rounded-[32px] p-6 text-center space-y-3 shadow-xl relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#00D26A]/10 blur-[50px] pointer-events-none" />
            <div className="w-14 h-14 bg-[#00D26A]/15 border border-[#00D26A]/30 text-[#00D26A] rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
              🪙
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-[#00D26A]">
                {myAccount.balance.toFixed(2)} €
              </p>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mt-1">
                Mon pécule disponible
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
              <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /> <span>Historique de la tirelire</span></span>
            </div>
            
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-2 space-y-2">
              {myRealTransactions.length === 0 ? (
                <p className="text-xs text-center text-white/40 py-6 font-bold">Pas encore d'activité enregistrée dans ta tirelire ! 🪙</p>
              ) : (
                myRealTransactions.map((tx: any) => {
                  const isCredit = tx.amount > 0 || (tx.type as string) === 'credit' || tx.type === 'income';
                  const displayAmount = Math.abs(tx.amount);
                  return (
                    <div key={tx.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-white leading-tight">{tx.title}</h4>
                        <p className="text-[10px] text-white/35 font-bold">{tx.date}</p>
                      </div>
                      
                      {tx.amount !== 0 ? (
                        <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                          isCredit ? 'text-[#00D26A] bg-[#00D26A]/10' : 'text-[#FF4D6D] bg-[#FF4D6D]/10'
                        }`}>
                          {isCredit ? '+' : '-'}{displayAmount.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-[#FFB020] bg-[#FFB020]/10 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center space-x-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Pris !</span>
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RENDER MODULE: BOUTIQUE DETAILS (boutique) --- */}
      {internalTab === 'plus' && activeModule === 'boutique' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Boutique de Récompenses</h1>
              <p className="text-[10px] text-white/50 font-bold">Échange tes points étoiles ou ton argent contre des cadeaux</p>
            </div>
          </div>

          {boutiqueRewards.length === 0 ? (
            <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[32px] space-y-3">
              <span className="text-4xl block">🎁</span>
              <p className="text-sm font-black text-white">Aucune récompense disponible pour le moment.</p>
              <p className="text-xs text-white/40 font-bold">Propose une idée à tes parents.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {boutiqueRewards.map(reward => {
                const myPoints = myAccount.points || 0;
                const myBalance = myAccount.balance || 0;
                const canAfford = myPoints >= reward.costPoints || myBalance >= reward.costMoney;
                return (
                  <div 
                    key={reward.id} 
                    className={`bg-[#112240] border-2 rounded-[28px] p-4 flex flex-col justify-between space-y-3 relative shadow-lg ${
                      canAfford ? 'border-[#FFB020]/40' : 'border-white/5 opacity-40 grayscale'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-xl shrink-0">
                        {reward.icon}
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase text-white/30 tracking-wider">
                          {reward.category}
                        </span>
                        <h3 className="text-xs font-extrabold text-white leading-snug mt-0.5 min-h-[32px]">
                          {reward.title}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-white/5 text-[10px] font-bold">
                      <div className="flex items-center justify-between">
                        <span className="text-white/55">Prix Étoiles :</span>
                        <span className="text-[#FFB020] flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-[#FFB020] text-[#FFB020]" />
                          <span>{reward.costPoints} pts</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-white/55">Prix Tirelire :</span>
                        <span className="text-[#00D26A]">
                          {reward.costMoney.toFixed(2)} €
                        </span>
                      </div>

                      <button
                        onClick={() => handleRedeemReward(reward)}
                        disabled={!canAfford}
                        className={`w-full py-2 mt-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          canAfford 
                            ? 'bg-[#FFB020] text-[#07111F] active:scale-95 shadow-md shadow-[#FFB020]/10' 
                            : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5 opacity-50'
                        }`}
                      >
                        {canAfford ? 'Acheter 🎁' : 'Fonds insuffisants'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form: Proposer une récompense */}
          <div className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-4">
            <button
              onClick={() => setIsSuggestingReward(!isSuggestingReward)}
              className="w-full py-3 bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#9E94FF] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#6C5CFF]/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>➕ Proposer une récompense</span>
            </button>

            {isSuggestingReward && (
              <form onSubmit={handleSuggestReward} className="space-y-4 pt-2 border-t border-white/5 animate-fade-in font-sans">
                <div className="space-y-3 font-bold text-xs">
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1">Nom de la récompense souhaitée</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Sortie cinéma, Jeu vidéo, Ballon..."
                      value={sugRewardTitle}
                      onChange={(e) => setSugRewardTitle(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1">Description / Rationale</label>
                    <textarea 
                      placeholder="Pourquoi mérites-tu ce cadeau ?"
                      value={sugRewardDesc}
                      onChange={(e) => setSugRewardDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-[#07111F] border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/35 focus:outline-none focus:border-[#6C5CFF] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-white/40 uppercase block mb-1">Prix suggéré (🌟 points)</label>
                      <input 
                        type="number" 
                        value={sugRewardPoints}
                        onChange={(e) => setSugRewardPoints(Number(e.target.value))}
                        className="w-full bg-[#07111F] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/40 uppercase block mb-1">Prix suggéré (💰 cash €)</label>
                      <input 
                        type="number" 
                        value={sugRewardMoney}
                        onChange={(e) => setSugRewardMoney(Number(e.target.value))}
                        className="w-full bg-[#07111F] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1">Émoticône représentatif</label>
                    <input 
                      type="text" 
                      value={sugRewardIcon}
                      onChange={(e) => setSugRewardIcon(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-[#6C5CFF] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Envoyer la proposition 🚀
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- RENDER OTHER MODULES VIA MENUHUB (with isKidMode={true}) --- */}
      {internalTab === 'plus' && [
        'courses', 'voyages', 'menus', 'documents', 'sante', 'animaux', 
        'repertoire_important'
      ].includes(activeModule) && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">
                {activeModule === 'courses' ? 'Courses & Provisions' :
                 activeModule === 'voyages' ? 'Voyages & Préparatifs' :
                 activeModule === 'menus' ? 'Menu de la Semaine' :
                 activeModule === 'documents' ? 'Documents & Fichiers' :
                 activeModule === 'sante' ? 'Santé & Suivi' :
                 activeModule === 'animaux' ? 'Nos Animaux' :
                 activeModule === 'repertoire_important' ? 'Répertoire de Contacts' : 'Module'}
              </h1>
            </div>
          </div>
          <div className="relative z-10 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl p-1 bg-[#112240]">
            <MenuHub 
              activeMemberId={member.id}
              members={members}
              foyer={foyer}
              setActiveTab={setActiveTab}
              activeModule={activeModule === 'repertoire_important' ? 'contacts' : activeModule}
              setActiveModule={setActiveModule}
              tasks={tasks}
              setTasks={setTasks}
              pocketMoney={pocketMoney}
              setPocketMoney={setPocketMoney}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
              onValidateTask={onValidateTask}
              goals={goals}
              setSavingGoals={setSavingGoals}
              transactions={transactions}
              setTransactions={setTransactions}
              alerts={alerts}
              setAlerts={setAlerts}
              onAddTransaction={onAddTransaction}
              onAddEventDirect={() => {}}
              onAddEvent={onAddEvent}
              isPremium={isPremium}
              onTriggerPaywall={onTriggerPaywall}
              accounts={accounts}
              chatGroups={chatGroups}
              setChatGroups={setChatGroups}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              initialChatGroupId={initialChatGroupId}
              trips={trips}
              setTrips={setTrips}
              documents={documents}
              setDocuments={setDocuments}
              isKidMode={true}
              groceries={[]}
              externalGroceryFilter="all"
              setMembers={() => {}}
              vehicles={[]}
              setVehicles={() => {}}
              maintenance={[]}
              setMaintenance={() => {}}
              pets={[]}
              setPets={() => {}}
              artisans={[]}
              setArtisans={() => {}}
              onUpdateMemberProfile={async () => {}}
              currencySymbol="€"
              formatMoney={(a) => `${a}€`}
              vaccines={[]}
              setVaccines={() => {}}
              onAddGrocery={async () => {}}
              onToggleTask={() => {}}
              onToggleGrocery={async () => {}}
              onAddGroceryItem={async () => {}}
              onDeleteGroceryItem={async () => {}}
              onEditGroceryItem={async () => {}}
              archivedLists={[]}
              onArchiveCurrentList={async () => {}}
              onReuseArchivedList={async () => {}}
              onDeleteArchivedList={async () => {}}
              onCleanGroceryList={async () => {}}
              onToggleFavoriteGrocery={async () => {}}
              demarches={[]}
              setDemarches={() => {}}
              justificatifPacks={[]}
              setJustificatifPacks={() => {}}
              memories={memories}
              setMemories={setMemories}
              votes={votes}
              setVotes={setVotes}
              schoolTasks={schoolTasks}
              setSchoolTasks={setSchoolTasks}
              grades={grades}
              setGrades={setGrades}
              schedule={schedule}
              setSchedule={setSchedule}
              dishes={dishes}
              setDishes={setDishes}
              setIsPremium={() => {}}
            />
          </div>
        </div>
      )}

      {/* Premium React Purchase Modal */}
      {paymentModalOpen && selectedRewardForRedeem && (() => {
        const reward = selectedRewardForRedeem;
        const myPoints = myAccount.points || 0;
        const myBalance = myAccount.balance || 0;
        const canPoints = myPoints >= reward.costPoints;
        const canMoney = myBalance >= reward.costMoney;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in font-sans text-white">
            <div className="bg-[#112240] border-2 border-[#FFB020]/50 rounded-[32px] p-6 text-center max-w-sm w-full space-y-5 shadow-2xl relative">
              <button 
                onClick={() => setPaymentModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer text-lg font-bold w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border-none"
              >
                ✕
              </button>
              
              <div className="w-16 h-16 bg-[#FFB020]/15 border border-[#FFB020]/30 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                {reward.icon}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-[#FFB020] uppercase tracking-widest">{reward.category}</span>
                <h3 className="text-lg font-extrabold text-white">{reward.title}</h3>
              </div>

              {/* Pricing comparison */}
              <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs">
                <div className="space-y-1 text-center">
                  <span className="text-white/50 block">Étoiles requises</span>
                  <span className="text-[#FFB020] font-black text-sm flex items-center justify-center space-x-1">
                    <Star className="w-4 h-4 fill-[#FFB020] text-[#FFB020]" />
                    <span>{reward.costPoints} pts</span>
                  </span>
                  <span className="text-[9px] text-white/35 block">Solde: {myPoints} pts</span>
                </div>
                <div className="space-y-1 border-l border-white/10 text-center">
                  <span className="text-white/50 block">Argent requis</span>
                  <span className="text-[#00D26A] font-black text-sm block">
                    {reward.costMoney.toFixed(2)} €
                  </span>
                  <span className="text-[9px] text-white/35 block">Solde: {myBalance.toFixed(2)} €</span>
                </div>
              </div>

              {/* Purchase options */}
              <div className="space-y-2">
                {/* Points Option */}
                {canPoints ? (
                  <button
                    onClick={() => executePurchase('points')}
                    className="w-full py-3 bg-gradient-to-r from-[#FFB020] to-[#FF8C00] text-[#07111F] font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-md"
                  >
                    🌟 Payer avec mes Étoiles
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPaymentModalOpen(false);
                      setActiveModule('taches');
                    }}
                    className="w-full py-3 bg-white/5 border border-white/10 text-[#FFB020] font-extrabold text-xs rounded-xl cursor-pointer hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center justify-center"
                  >
                    <span>⭐ Étoiles insuffisantes !</span>
                    <span className="text-[9px] text-white/40 mt-0.5">Clique pour gagner plus de points 🚀</span>
                  </button>
                )}

                {/* Cash Option */}
                {canMoney ? (
                  <button
                    onClick={() => executePurchase('money')}
                    className="w-full py-3 bg-[#00D26A] text-[#07111F] font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-md"
                  >
                    💰 Payer avec ma Tirelire
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 bg-white/5 border border-white/5 text-[#FF4D6D] font-extrabold text-xs rounded-xl opacity-60"
                  >
                    💸 Solde de tirelire insuffisant !
                  </button>
                )}
              </div>

              <p className="text-[9px] text-white/40 leading-normal font-medium">
                {reward.validationRequired !== false 
                  ? "⚠️ Une validation de tes parents est requise pour cette récompense."
                  : "⚡ Achat direct ! La récompense sera débloquée immédiatement."}
              </p>
            </div>
          </div>
        );
      })()}

      </div>
    </div>
  );
};
