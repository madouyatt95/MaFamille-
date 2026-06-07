import React, { useState, useEffect } from 'react';
import { 
  Star, CheckCircle2, Calendar, Gift, MapPin, MessageSquare, 
  GraduationCap, Clock, Award, ShieldAlert, Trophy, Zap, 
  Sparkles, BookOpen, HeartHandshake, Compass, Users, 
  PlusCircle, ArrowLeft, ArrowRight, Smile, Send, Trash2, 
  Coins, TrendingUp, Bell, Heart, Camera
} from 'lucide-react';
import type { Member, ChoreTask, FamilyEvent, SchoolTask, SavingGoal, Transaction, NotificationAlert, FamilyVote, Foyer, DocumentFile, Trip, MemoryLog, Dish, ChatGroup, ChatMessage } from '../types';
import { parseChoreTitle, serializeChoreTitle } from '../types';
import { TuteurScolaire } from '../components/modules/TuteurScolaire';
import { PeaceMaker } from '../components/modules/PeaceMaker';
import { ConteurIA } from '../components/modules/ConteurIA';
import { ConseilFamille } from '../components/modules/ConseilFamille';
import { CapsuleTemporelle } from '../components/modules/CapsuleTemporelle';
import { FamilyMap } from './FamilyMap';
import { MenuHub } from './MenuHub';
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
  setDocuments
}) => {
  // Navigation active tab index internally mapped
  // Teen space will render internally or listen to external tab routing
  const [internalTab, setInternalTab] = useState<'accueil' | 'ecole' | 'messages' | 'timeline' | 'plus'>('accueil');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionPts, setSuggestionPts] = useState(25);
  
  // Wallet goal edit states
  const [goalTitleInput, setGoalTitleInput] = useState('');
  const [goalAmountInput, setGoalAmountInput] = useState(100);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // New Memory (Timeline) creation states
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryDesc, setNewMemoryDesc] = useState('');
  const [newMemoryImg, setNewMemoryImg] = useState('');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  // Sync internalTab with activeTab prop
  useEffect(() => {
    if (activeTab === 'accueil') setInternalTab('accueil');
    else if (activeTab === 'timeline') setInternalTab('timeline');
    else if (activeTab === 'menu') {
      if (activeModule === 'ecole') setInternalTab('ecole');
      else if (activeModule === 'messagerie') setInternalTab('messages');
      else setInternalTab('plus');
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

  // Load boutique reward items from saving_goals category = 'boutique_reward'
  const mapSavingGoalToReward = (sg: SavingGoal) => {
    let icon = '🎁';
    let valReq = true;
    let subCat = 'Cadeau';
    if (sg.contributions && sg.contributions.length > 0) {
      const meta = sg.contributions[0] as any;
      if (meta.icon) icon = meta.icon;
      if (meta.validationRequired !== undefined) valReq = meta.validationRequired;
      if (meta.subCategory) subCat = meta.subCategory;
    }
    return {
      id: sg.id,
      title: sg.title,
      cost: sg.targetAmount,
      icon,
      category: subCat,
      validationRequired: valReq
    };
  };

  const boutiqueRewards = (goals || [])
    .filter(sg => sg.category === 'boutique_reward')
    .map(mapSavingGoalToReward);

  const finalRewards = boutiqueRewards.length > 0 ? boutiqueRewards : [
    { id: 'rew-1', title: '30 min de console 🎮', cost: 50, icon: '⚡', category: 'Écran', validationRequired: true },
    { id: 'rew-2', title: 'Choisir le menu du dîner 🍕', cost: 80, icon: '😋', category: 'Repas', validationRequired: true },
    { id: 'rew-3', title: 'Coucher tardif (+30 min) 🌙', cost: 100, icon: '⏰', category: 'Sommeil', validationRequired: true },
    { id: 'rew-4', title: 'Double boule de glace 🍦', cost: 120, icon: '🍧', category: 'Gourmandise', validationRequired: true },
    { id: 'rew-5', title: 'Cinéma en famille 🎬', cost: 250, icon: '🍿', category: 'Sortie', validationRequired: true },
    { id: 'rew-6', title: 'Nouveau jouet au choix 🧸', cost: 400, icon: '🎁', category: 'Cadeau', validationRequired: true }
  ];

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
  const handleRedeemReward = async (reward: any) => {
    if ((myAccount.points || 0) < reward.cost) {
      alert(`Il te manque ${reward.cost - (myAccount.points || 0)} points pour t'offrir "${reward.title}" ! 💪`);
      return;
    }

    if (window.confirm(`Confirmer l'achat de "${reward.title}" pour ${reward.cost} points ?`)) {
      if (reward.validationRequired) {
        const timestamp = Date.now();
        const newAlert: NotificationAlert = {
          id: `req-rew-${member.id}-${reward.id}-${timestamp}`,
          title: `Achat Ado : ${reward.title}`,
          description: `${member.name} souhaite dépenser ${reward.cost} points pour "${reward.title}".`,
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
        const updatedPoints = (myAccount.points || 0) - reward.cost;
        setPocketMoney(prev => prev.map(p => p.id === member.id ? { ...p, points: updatedPoints } : p));

        const timestamp = Date.now();
        const newTx: Transaction = {
          id: `tx-rew-${member.id}-${reward.id}-${timestamp}`,
          amount: 0,
          type: 'expense',
          category: 'Argent de Poche',
          date: new Date().toISOString().split('T')[0],
          title: `Achat boutique : ${reward.title} (-${reward.cost} pts)`,
          memberId: member.id,
          memberName: member.name
        };

        try {
          const client = getSupabaseClient();
          if (client && foyer) {
            await client.from('pocket_money').update({ points: updatedPoints }).eq('id', member.id);
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
        alert(`Félicitations ! Achat direct réussi. ${reward.cost} points déduits ! 🎉`);
      }
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
      likesCount: 0
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
          liked_by: JSON.stringify([])
        });
      }
    } catch (err) {
      console.error("[TeenDashboard] Failed to save memory:", err);
    }

    alert(`📸 Souvenir magique ajouté à la Timeline ! (+10 XP)`);
    setNewMemoryTitle('');
    setNewMemoryDesc('');
    setNewMemoryImg('');
    setIsAddingMemory(false);
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
      {/* Background decoration blur halos */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />

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
              <div className="space-y-1">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider block">🛍️ Boutique Cadeaux</span>
                <p className="text-xs font-black text-white truncate">{finalRewards[0].title}</p>
              </div>
              <span className="text-[9px] font-black text-[#FFB020] bg-[#FFB020]/15 px-2 py-0.5 rounded-lg w-fit font-sans">
                {finalRewards[0].cost} pts
              </span>
            </div>

          </div>

        </div>
      )}

      {/* --- SUBTAB: ÉCOLE & TUTEUR IA --- */}
      {internalTab === 'ecole' && (
        <div className="space-y-4 animate-fade-in relative z-10 text-left">
          <div className="flex items-center space-x-3 mb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setInternalTab('accueil')}
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
            />
          </div>
        </div>
      )}

      {/* --- SUBTAB: MESSAGES --- */}
      {internalTab === 'messages' && (
        <div className="space-y-4 animate-fade-in relative z-10">
          <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))] text-left">
            <button 
              onClick={() => setInternalTab('accueil')}
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
              <h1 className="text-xl font-black text-white">L'Album de Famille</h1>
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
                <input 
                  type="text" 
                  placeholder="Titre (ex: Sortie vélo, Gâteau de mamie...)"
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
                  Publier sur l'album 🚀
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
            {memories.map((mem) => (
              <div key={mem.id} className="bg-[#112240] border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
                {mem.imageUrl && (
                  <img 
                    src={mem.imageUrl} 
                    alt={mem.title} 
                    className="w-full h-48 object-cover border-b border-white/5"
                  />
                )}
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">
                      📅 {mem.date} • par {mem.authorName}
                    </span>
                    <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                      <Heart className="w-3.5 h-3.5 fill-rose-400" />
                      {mem.likesCount || 0}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white leading-snug">{mem.title}</h3>
                  {mem.description && (
                    <p className="text-xs text-white/60 leading-relaxed">{mem.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* --- SUBTAB: PLUS (MENU OF ACCESSIBLE MODULES) --- */}
      {internalTab === 'plus' && activeModule === '' && (
        <div className="space-y-6 animate-fade-in relative z-10 text-left">
          
          <div className="pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <h1 className="text-xl font-black text-white">Menu Compléments</h1>
            <p className="text-[10px] text-white/50 font-bold">Accède aux applications et modules de ta famille</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            
            {/* 1. Missions Manager (taches) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('taches'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FFB020]/15 border border-[#FFB020]/30 text-xl flex items-center justify-center">
                🧹
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Missions</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Missions, argent & récompenses</p>
              </div>
            </button>

            {/* 2. Wallet & Boutique (argent) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('argent'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#00D26A]/15 border border-[#00D26A]/30 text-xl flex items-center justify-center">
                🪙
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Portefeuille</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Solde, transactions & objectifs</p>
              </div>
            </button>

            {/* 3. Boutique config & purchase (boutique) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('boutique'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 text-xl flex items-center justify-center">
                🛍️
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Boutique</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Échange tes points étoiles</p>
              </div>
            </button>

            {/* 4. PeaceMaker IA (peacemaker) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('peacemaker'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#9E94FF]/15 border border-[#9E94FF]/30 text-xl flex items-center justify-center">
                🕊️
              </div>
              <div>
                <h4 className="text-xs font-black text-white">PeaceMaker IA</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Résolution bienveillante</p>
              </div>
            </button>

            {/* 5. Capsule Temporelle (capsule) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('capsule'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FFB020]/15 border border-[#FFB020]/30 text-xl flex items-center justify-center">
                ⏳
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Capsule</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Boîte à souvenirs magique</p>
              </div>
            </button>

            {/* 6. Family Council (conseil) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('conseil'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-xl flex items-center justify-center">
                🗳️
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Conseil</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Sondages & décisions</p>
              </div>
            </button>

            {/* 7. Family Map (carte) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('carte'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-xl flex items-center justify-center">
                🗺️
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Carte</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Localisation sécurisée</p>
              </div>
            </button>

            {/* 8. Bedtime Stories (conteur) */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('conteur'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-xl flex items-center justify-center">
                🌙
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Histoires</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Contes merveilleux IA</p>
              </div>
            </button>

            {/* 9. Canteen & Menu Semaine */}
            <button 
              onClick={() => { setActiveTab('menu'); setActiveModule('courses'); }}
              className="bg-[#112240] border border-white/10 rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 cursor-pointer hover:border-[#6C5CFF]/30 transition col-span-2"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xl flex items-center justify-center">
                🛒
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Courses & Listes</h4>
                <p className="text-[9px] text-white/40 mt-0.5">Aide tes parents avec les provisions</p>
              </div>
            </button>

          </div>

          {/* Badges Gallery Widget */}
          <div className="bg-[#112240] border border-white/8 rounded-[36px] p-5 text-left space-y-3.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-[#FFB020]" />
              Galerie des Badges ({myBadges.length})
            </h4>
            
            <div className="grid grid-cols-4 gap-2 pt-1">
              {myBadges.map((badge) => (
                <div 
                  key={badge.id} 
                  className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center space-y-1 group relative cursor-pointer"
                  title={badge.desc}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="text-[8px] font-black text-white/70 truncate w-full">{badge.title.split(' ')[0] || badge.title}</span>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block w-40 bg-[#07111F] border border-white/10 p-2 rounded-xl text-[9px] leading-snug text-white z-30 shadow-2xl">
                    <p className="font-extrabold">{badge.title}</p>
                    <p className="text-white/60 mt-0.5">{badge.desc}</p>
                  </div>
                </div>
              ))}
              {myBadges.length === 0 && (
                <p className="text-[10px] text-white/40 italic col-span-4 text-center py-2">Pas encore de badges, continue tes efforts ! 🧭</p>
              )}
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
      {internalTab === 'plus' && activeModule === 'taches' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Mes Missions Familiales</h1>
              <p className="text-[10px] text-white/50 font-bold">Gagne des points et de l'argent de poche</p>
            </div>
          </div>

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
                    <span className="text-[9px] font-bold bg-[#6C5CFF]/20 text-[#9d94ff] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Famille 🏠 {task.priority === 'high' ? '⚠️ Urgent' : ''}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1 leading-snug">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-white/60 mt-0.5">{task.description}</p>
                    )}
                    {task.status === 'refused' && (
                      <p className="text-xs text-[#FF4D6D] font-bold mt-1">❌ À corriger (demande de tes parents)</p>
                    )}
                    <p className="text-xs font-black text-[#FFB020] mt-1 flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-[#FFB020] text-[#FFB020]" />
                      <span>+{task.rewardPoints || 10} points</span>
                      {task.rewardAmount ? (
                        <span className="text-[#00D26A] ml-2">({task.rewardAmount.toFixed(2)} €)</span>
                      ) : null}
                    </p>
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
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#FFB020]/50"
              />
              
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
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
            <div className="space-y-3">
              <span className="text-[10px] font-black text-[#FFB020] uppercase tracking-wider block">En attente de validation parentale :</span>
              <div className="space-y-2">
                {pendingValidationTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-[#112240] rounded-[24px] border border-white/10">
                    <div>
                      <h4 className="text-xs font-bold text-white/80">{task.title}</h4>
                      <p className="text-[10px] text-white/40">Soumis - En cours de vérification</p>
                    </div>
                    <span className="text-xs font-black text-[#FFB020] flex items-center space-x-1 bg-[#FFB020]/10 px-2 py-1 rounded-xl">
                      <Clock className="w-3.5 h-3.5" />
                      <span>+{task.rewardPoints || 10} pts</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed history */}
          {validatedTasks.length > 0 && (
            <div className="space-y-3">
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
      )}

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
              <p className="text-[10px] text-white/50 font-bold">Échange tes points étoiles contre des cadeaux</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {finalRewards.map(reward => {
              const canAfford = (myAccount.points || 0) >= reward.cost;
              return (
                <div 
                  key={reward.id} 
                  className={`bg-[#112240] border-2 rounded-[28px] p-4 flex flex-col justify-between space-y-3 relative shadow-lg ${
                    canAfford ? 'border-[#FFB020]/40' : 'border-white/5 opacity-80'
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
                  
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/55 font-bold">Prix :</span>
                      <span className="text-xs font-black text-[#FFB020] flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-[#FFB020] text-[#FFB020]" />
                        <span>{reward.cost} pts</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleRedeemReward(reward)}
                      className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        canAfford 
                          ? 'bg-[#FFB020] text-[#07111F] active:scale-95 shadow-md shadow-[#FFB020]/10' 
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      Acheter 🎁
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- RENDER MODULE: CANTEEN & COURSES (courses) --- */}
      {internalTab === 'plus' && activeModule === 'courses' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Courses & Menus</h1>
              <p className="text-[10px] text-white/50 font-bold">Consulte les menus de cantine et les provisions</p>
            </div>
          </div>

          <div className="relative z-10">
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
              activeModule="courses"
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

      {/* --- RENDER MODULE: VOYAGES --- */}
      {internalTab === 'plus' && activeModule === 'voyages' && (
        <div className="space-y-4 animate-fade-in text-left">
          <div className="flex items-center space-x-3 mb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
            <button 
              onClick={() => setActiveModule('')}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Voyages en Famille</h1>
              <p className="text-[10px] text-white/50 font-bold">Consulte les checklists et les préparatifs de voyages</p>
            </div>
          </div>

          <div className="relative z-10">
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
              activeModule="voyages"
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

    </div>
  );
};
