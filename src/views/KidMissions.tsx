import React, { useState } from 'react';
import { ArrowLeft, Star, Gift, CheckCircle2, ShieldCheck, PlusCircle, HelpCircle, History, Sparkles, Clock } from 'lucide-react';
import type { Member, ChoreTask, NotificationAlert, Transaction, Foyer } from '../types';
import { parseChoreTitle, serializeChoreTitle } from '../types';
import type { SavingGoal } from '../types';
import { getSupabaseClient } from '../utils/supabase';

interface KidMissionsProps {
  member: Member;
  tasks: ChoreTask[];
  setTasks: React.Dispatch<React.SetStateAction<ChoreTask[]>>;
  pocketMoney: any[];
  setPocketMoney: React.Dispatch<React.SetStateAction<any[]>>;
  onBack: () => void;
  defaultTab?: 'missions' | 'boutique' | 'argent';
  setAlerts?: React.Dispatch<React.SetStateAction<NotificationAlert[]>>;
  foyer?: Foyer | null;
  transactions?: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  savingGoals?: SavingGoal[];
  setSavingGoals?: React.Dispatch<React.SetStateAction<SavingGoal[]>>;
  onApplyWallTask?: (taskId: string, memberId: string) => void;
  onTakeWallTask?: (taskId: string, memberId: string) => void;
  onSendNotification?: any;
}

interface RewardItem {
  id: string;
  title: string;
  costPoints: number;
  costMoney: number;
  icon: string;
  category: string;
  avail: boolean;
  validationRequired?: boolean;
}

export const KidMissions: React.FC<KidMissionsProps> = ({
  member,
  tasks,
  setTasks,
  pocketMoney,
  setPocketMoney,
  onBack,
  defaultTab,
  setAlerts,
  foyer,
  transactions = [],
  setTransactions,
  savingGoals = [],
  setSavingGoals,
  onApplyWallTask,
  onTakeWallTask,
  onSendNotification
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'missions' | 'boutique' | 'argent'>(defaultTab || 'missions');
  const [requestText, setRequestText] = useState('');
  const [requestPoints, setRequestPoints] = useState(20);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiMessage, setConfettiMessage] = useState('');
  const [customRewardTitle, setCustomRewardTitle] = useState('');
  const [customRewardPoints, setCustomRewardPoints] = useState(100);
  const [customRewardMoney, setCustomRewardMoney] = useState(10);

  // Find pocket money account for this kid
  const myAccount = pocketMoney.find(p => p.id === member.id) || {
    id: member.id,
    name: member.name,
    balance: 0.0,
    points: 0
  };

  // Filter the real transactions history for this kid
  const myRealTransactions = transactions.filter(tx => 
    (tx.category === 'Argent de poche' || tx.category === 'Argent de Poche') && 
    (tx.memberName === member.name || tx.memberId === member.id)
  );

  // Parse chores from metadata
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
      rewardAmount: meta.rewardAmount,
      assignedMemberIds: meta.assignedMemberIds,
      recurrence: meta.recurrence
    };
  }).filter(Boolean) as ChoreTask[];

  // Filter tasks assigned to this kid
  const myTasks = parsedTasks.filter(t => 
    !t.isArchived &&
    (t.assignedMemberId === member.id || t.assignedMemberIds?.includes(member.id))
  );

  const todoTasks = myTasks.filter(t => t.status === 'todo' || t.status === 'in_progress' || t.status === 'refused');
  const pendingValidationTasks = myTasks.filter(t => t.status === 'pending_validation');
  const validatedTasks = myTasks.filter(t => t.status === 'validated');
  const wallTasks = parsedTasks.filter(t => t.attributionMode === 'wall' && !t.isArchived);

  // Mapper from SavingGoal to RewardItem
  const mapSavingGoalToReward = (sg: SavingGoal): RewardItem => {
    let icon = '🎁';
    let costPoints = sg.targetAmount || 50;
    let costMoney = Math.round(costPoints / 10);
    let subCategory = 'Cadeau';
    let avail = true;
    let validationRequired = true;
    
    if (sg.contributions && sg.contributions.length > 0) {
      const meta = sg.contributions[0] as any;
      if (meta.icon) icon = meta.icon;
      if (meta.costPoints !== undefined) costPoints = meta.costPoints;
      if (meta.costMoney !== undefined) costMoney = meta.costMoney;
      if (meta.subCategory) subCategory = meta.subCategory;
      if (meta.avail !== undefined) avail = meta.avail;
      if (meta.validationRequired !== undefined) validationRequired = meta.validationRequired;
    }
    
    return {
      id: sg.id,
      title: sg.title,
      costPoints,
      costMoney,
      icon,
      category: subCategory,
      avail,
      validationRequired
    };
  };

  // Load rewards from savingGoals category === 'boutique_reward'
  const dbRewards = (savingGoals || [])
    .filter(sg => sg.category === 'boutique_reward')
    .map(mapSavingGoalToReward)
    .filter(r => r.avail);

  const rewardsList = dbRewards;

  // Complete a task (needs parental validation)
  const handleCompleteTask = async (taskId: string, points: number) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const meta = parseChoreTitle(targetTask.title);
    meta.status = 'pending_validation';
    meta.title = meta.title || targetTask.title;
    const serializedTitle = serializeChoreTitle(meta);

    setTasks(prev => prev.map(t => t.id === taskId ? { 
      ...t, 
      title: serializedTitle,
      done: true,
      status: 'pending_validation'
    } : t));

    try {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client
          .from('chore_tasks')
          .update({ 
            title: serializedTitle,
            done: true,
            validated_by_parent: false 
          })
          .eq('id', taskId);
        if (error) throw error;
        console.log("[KidMissions] Task marked as pending validation in Supabase.");
      }
    } catch (err) {
      console.error("[KidMissions] Failed to update task in Supabase:", err);
    }

    setConfettiMessage(`Super ! Mission terminée. Tes parents ont été prévenus et vont bientôt la valider pour te donner +${points} points ! 🌟`);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  // Buy a reward (requests validation from parent, or direct redeem if validationRequired is false)
  const handleRedeemReward = async (reward: RewardItem) => {
    const myPoints = myAccount.points || 0;
    const myBalance = myAccount.balance || 0;
    const canPoints = myPoints >= reward.costPoints;
    const canMoney = myBalance >= reward.costMoney;

    if (!canPoints && !canMoney) {
      alert(`Oups ! Il te manque des étoiles (${reward.costPoints} pts requis) ou de l'argent dans ta tirelire (${reward.costMoney.toFixed(2)} € requis) pour t'offrir "${reward.title}" ! 💪`);
      return;
    }

    let paymentMethod: 'points' | 'money' | null = null;
    if (canPoints && canMoney) {
      const choice = window.confirm(
        `Comment souhaites-tu régler "${reward.title}" ?\n\n- Cliquez sur [OK] pour payer en Étoiles (🌟 ${reward.costPoints} pts)\n- Cliquez sur [Annuler] pour payer en Argent (💰 ${reward.costMoney.toFixed(2)} €)`
      );
      paymentMethod = choice ? 'points' : 'money';
    } else if (canPoints) {
      if (window.confirm(`Confirmer l'achat de "${reward.title}" avec tes Étoiles (🌟 ${reward.costPoints} pts) ?`)) {
        paymentMethod = 'points';
      }
    } else {
      if (window.confirm(`Confirmer l'achat de "${reward.title}" avec ta Tirelire (💰 ${reward.costMoney.toFixed(2)} €) ?`)) {
        paymentMethod = 'money';
      }
    }

    if (!paymentMethod) return;
    const cost = paymentMethod === 'points' ? reward.costPoints : reward.costMoney;

    if (reward.validationRequired !== false) {
      const timestamp = Date.now();
      const newAlert: NotificationAlert = {
        id: `req-rew-${member.id}-${reward.id}-${paymentMethod}-${timestamp}`,
        title: `Demande de récompense : ${reward.title}`,
        description: `${member.name} souhaite échanger ${paymentMethod === 'points' ? `${cost} étoiles` : `${cost.toFixed(2)} €`} contre "${reward.title}".`,
        time: new Date().toISOString(),
        type: 'warning',
        read: false,
        module: 'argent',
        senderMemberId: member.id,
        senderName: member.name,
        senderAvatar: member.photoUrl
      };

      if (setAlerts) {
        setAlerts(prev => [newAlert, ...prev]);
      }

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
        console.error("[KidMissions] Failed to save reward request alert to cloud:", err);
      }

      setConfettiMessage(`Ta demande pour "${reward.title}" a bien été envoyée à tes parents. Ils vont la valider très vite ! 🚀✨`);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } else {
      // Direct purchase (no validation required)
      const updatedPoints = paymentMethod === 'points' ? (myAccount.points || 0) - cost : (myAccount.points || 0);
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
          if (paymentMethod === 'points') {
            await client.from('pocket_money').update({ points: updatedPoints }).eq('id', member.id);
          } else {
            await client.from('pocket_money').update({ balance: updatedBalance }).eq('id', member.id);
          }
          await client.from('transactions').insert({
            id: newTx.id,
            foyer_id: foyer.id,
            amount: newTx.amount,
            type: newTx.type,
            category: newTx.category,
            date: newTx.date,
            title: newTx.title,
            member_id: newTx.memberId,
            member_name: newTx.memberName
          });
          if (setTransactions) {
            setTransactions(prev => [newTx, ...prev]);
          }
        }
      } catch (err) {
        console.error("[KidMissions] Direct redeem failed:", err);
      }
      setConfettiMessage(`Félicitations ! Achat direct réussi. ${paymentMethod === 'points' ? `${cost} points` : `${cost.toFixed(2)} €`} déduits ! 🎉`);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  };

  // Suggest a custom reward
  const handleSuggestCustomReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRewardTitle.trim()) return;

    const timestamp = Date.now();
    const newAlert: NotificationAlert = {
      id: `sug-rew-${member.id}-${timestamp}`,
      title: `Suggestion : ${customRewardTitle.trim()}`,
      description: `${member.name} propose un nouveau cadeau : "${customRewardTitle.trim()}" pour ${customRewardPoints} Pts ou ${customRewardMoney} €.`,
      time: new Date().toISOString(),
      type: 'info',
      read: false,
      module: 'argent',
      senderMemberId: member.id,
      senderName: member.name,
      senderAvatar: member.photoUrl
    };

    if (setAlerts) {
      setAlerts(prev => [newAlert, ...prev]);
    }

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
      console.error("[KidMissions] Failed to suggest reward:", err);
    }

    alert(`Proposition envoyée ! Tes parents ont reçu ton idée : "${customRewardTitle.trim()}".`);
    setCustomRewardTitle('');
  };

  // Ask for new mission
  const handleRequestMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    const timestamp = Date.now();
    const newAlert: NotificationAlert = {
      id: `req-task-${member.id}-${timestamp}`,
      title: `Proposition de mission : ${requestText.trim()}`,
      description: `${member.name} propose de faire : "${requestText.trim()}" pour ${requestPoints} points.`,
      time: new Date().toISOString(),
      type: 'warning',
      read: false,
      module: 'taches',
      senderMemberId: member.id,
      senderName: member.name,
      senderAvatar: member.photoUrl
    };

    if (setAlerts) {
      setAlerts(prev => [newAlert, ...prev]);
    }

    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        const { error } = await client.from('alerts').insert({
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
        if (error) throw error;
        console.log("[KidMissions] Task suggestion request successfully saved to cloud.");
      }
    } catch (err) {
      console.error("[KidMissions] Failed to save task suggestion request to cloud:", err);
    }

    alert(`Demande envoyée ! Papa et Maman ont reçu ta proposition : "${requestText.trim()}" pour ${requestPoints} points.`);
    setRequestText('');
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB020]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />

      {/* Confetti alert overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#112240] border-4 border-[#FFB020] rounded-[36px] p-8 text-center max-w-sm space-y-4 shadow-2xl relative">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-[#FFB020] rounded-full flex items-center justify-center text-4xl animate-bounce shadow-lg shadow-[#FFB020]/40">
              🎉
            </div>
            <div className="pt-8 space-y-2">
              <h3 className="text-2xl font-black text-[#FFB020] tracking-tight">Génial !</h3>
              <p className="text-sm font-bold text-white leading-relaxed">{confettiMessage}</p>
            </div>
            <button 
              onClick={() => setShowConfetti(false)}
              className="w-full py-3 bg-gradient-to-r from-[#FFB020] to-[#FF8C00] text-[#07111F] font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer"
            >
              C'est super ! ⭐️
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>🎯</span>
              <span>Mes Missions</span>
            </h1>
            <p className="text-xs text-white/50 font-bold">Gagne des points et des récompenses !</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-[#FFB020]/15 border border-[#FFB020]/30 px-4 py-2 rounded-2xl text-[#FFB020]">
          <Star className="w-4 h-4 fill-[#FFB020]" />
          <span className="text-xs font-black">{myAccount.points || 0} pts</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 p-1 rounded-2xl border border-white/5 grid grid-cols-3 gap-1 mb-6">
        <button
          onClick={() => setActiveSubTab('missions')}
          className={`py-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'missions' 
              ? 'bg-[#FFB020] text-[#07111F] shadow-md shadow-[#FFB020]/20' 
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <span>🎯</span>
          <span>Missions</span>
        </button>
        <button
          onClick={() => setActiveSubTab('boutique')}
          className={`py-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'boutique' 
              ? 'bg-[#FFB020] text-[#07111F] shadow-md shadow-[#FFB020]/20' 
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <span>🛍️</span>
          <span>Boutique</span>
        </button>
        <button
          onClick={() => setActiveSubTab('argent')}
          className={`py-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            activeSubTab === 'argent' 
              ? 'bg-[#FFB020] text-[#07111F] shadow-md shadow-[#FFB020]/20' 
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <span>🪙</span>
          <span>Argent</span>
        </button>
      </div>

      {/* CONTENT: Missions */}
      {activeSubTab === 'missions' && (
        <div className="space-y-6">
          {/* Active Tasks List */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Missions à accomplir :</span>
            
            {todoTasks.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center space-y-2">
                <span className="text-4xl block">🎉</span>
                <p className="text-sm font-black text-white">Bravo ! Tout est fini !</p>
                <p className="text-xs text-white/50 leading-relaxed font-bold">Tu as accompli toutes les tâches demandées par tes parents pour aujourd'hui.</p>
              </div>
            ) : (
              todoTasks.map(task => (
                <div 
                  key={task.id} 
                  className="bg-[#112240] border-2 border-[#6C5CFF]/30 rounded-[28px] p-4 flex items-center justify-between shadow-lg shadow-[#6C5CFF]/5"
                >
                  <div className="flex-1 pr-4 text-left">
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
                      <Star className="w-3.5 h-3.5 fill-[#FFB020]" />
                      <span>+{task.rewardPoints || 10} points</span>
                      {task.rewardAmount ? (
                        <span className="text-[#00D26A] ml-2">({task.rewardAmount.toFixed(2)} €)</span>
                      ) : null}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleCompleteTask(task.id, task.rewardPoints || 10)}
                    className="w-12 h-12 bg-[#00D26A] rounded-[18px] flex items-center justify-center shadow-lg shadow-[#00D26A]/20 active:scale-90 transition-transform cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Section: Missions disponibles */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block text-left">🌟 Missions disponibles sur le Mur :</span>
            
            {wallTasks.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-4 italic">Aucune mission disponible sur le Mur pour le moment.</p>
            ) : (
              wallTasks.map((task: any) => {
                const isCandidate = task.candidates?.includes(member.id);
                const isAccepted = task.acceptedVolunteers?.includes(member.id);
                const isFull = (task.acceptedVolunteers?.length || 0) >= (task.maxParticipants || 1);

                return (
                  <div 
                    key={task.id} 
                    className="bg-[#161B30]/60 border border-[#6C5CFF]/30 rounded-[28px] p-4 flex flex-col justify-between space-y-4 shadow-lg text-left"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-black bg-[#6C5CFF]/20 text-[#9E94FF] px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {task.category || 'Missions'}
                        </span>
                        <span className="text-[10px] font-black text-[#FFB020] bg-[#FFB020]/10 px-2 py-0.5 rounded-lg">
                          +{task.rewardPoints} Pts
                        </span>
                      </div>

                      {task.imageUrl && (
                        <div className="w-full h-24 rounded-2xl overflow-hidden border border-white/5 bg-[#07111F]">
                          <img src={task.imageUrl} alt={task.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <h3 className="text-sm font-bold text-white leading-snug">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-white/60 leading-relaxed">{task.description}</p>
                      )}

                      {/* Badges row */}
                      <div className="flex flex-wrap gap-1.5 text-[9px] text-white/60 font-bold pt-1">
                        <span className="bg-white/5 px-2 py-0.5 rounded-md flex items-center">⚡ {task.difficulty === 'easy' ? 'Facile' : task.difficulty === 'hard' ? 'Difficile' : 'Moyen'}</span>
                        {task.estimatedTime && <span className="bg-white/5 px-2 py-0.5 rounded-md flex items-center">⏱️ {task.estimatedTime}</span>}
                        {task.rewardAmount ? (
                          <span className="bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] px-2 py-0.5 rounded-md flex items-center">💰 +{task.rewardAmount.toFixed(2)} €</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="pt-1">
                      {isAccepted ? (
                        <button disabled className="w-full py-2.5 rounded-xl bg-[#00D26A]/20 text-[#00D26A] font-extrabold text-xs uppercase tracking-wider border border-[#00D26A]/30">
                          Acceptée 🎉
                        </button>
                      ) : isCandidate ? (
                        <button disabled className="w-full py-2.5 rounded-xl bg-[#FFB020]/20 text-[#FFB020] font-extrabold text-xs uppercase tracking-wider border border-[#FFB020]/30">
                          Candidature envoyée ⏳
                        </button>
                      ) : isFull ? (
                        <button disabled className="w-full py-2.5 rounded-xl bg-white/5 text-white/30 font-extrabold text-xs uppercase tracking-wider border border-white/5">
                          Complète
                        </button>
                      ) : task.selectionMode === 'first_come' ? (
                        <button 
                          onClick={() => onTakeWallTask?.(task.id, member.id)}
                          className="w-full py-2.5 rounded-xl bg-[#00D26A] text-[#07111F] font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg"
                        >
                          Je prends 🚀
                        </button>
                      ) : (
                        <button 
                          onClick={() => onApplyWallTask?.(task.id, member.id)}
                          className="w-full py-2.5 rounded-xl bg-[#6C5CFF] text-white font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg"
                        >
                          Je postule 🙋‍♂️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form: Ask for mission */}
          <form onSubmit={handleRequestMission} className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-white text-left">
              <PlusCircle className="w-5 h-5 text-[#FFB020]" />
              <span>Proposer une nouvelle mission</span>
            </div>
            
            <div className="space-y-3 font-bold">
              <input 
                type="text" 
                placeholder="Ex: Nettoyer la cage du lapin, Trier mes legos..."
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#FFB020]/50"
              />
              
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-xs text-white/60">Points demandés :</span>
                <div className="flex items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setRequestPoints(Math.max(10, requestPoints - 10))}
                    className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs text-[#FFB020] font-black">{requestPoints} pts</span>
                  <button 
                    type="button" 
                    onClick={() => setRequestPoints(Math.min(100, requestPoints + 10))}
                    className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-3 bg-[#FFB020] text-[#07111F] rounded-xl text-xs font-black uppercase tracking-wider active:scale-97 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Demander aux parents 💬</span>
            </button>
          </form>

          {/* Pending Validation Tasks List */}
          {pendingValidationTasks.length > 0 && (
            <div className="space-y-3 text-left">
              <span className="text-[10px] font-black text-[#FFB020] uppercase tracking-wider block">En attente de validation par tes parents :</span>
              <div className="space-y-2">
                {pendingValidationTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-[#112240] rounded-[24px] border border-white/10 text-left">
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

          {/* Completed Tasks Log */}
          {validatedTasks.length > 0 && (
            <div className="space-y-3 text-left">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Missions terminées :</span>
              <div className="bg-white/5 rounded-[32px] p-2 space-y-2 border border-white/5">
                {validatedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl text-left font-bold">
                    <div>
                      <h4 className="text-xs font-bold text-white/60 line-through">{task.title}</h4>
                      <p className="text-[10px] text-white/35">Terminé et validé par les parents</p>
                    </div>
                    <span className="text-xs font-black text-[#00D26A] flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>+{task.rewardPoints || 10} pts</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: Reward Store */}
      {activeSubTab === 'boutique' && (
        <div className="space-y-6">
          {rewardsList.length === 0 ? (
            <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[32px] space-y-3">
              <span className="text-4xl block">🎁</span>
              <p className="text-sm font-black text-white">Aucune récompense disponible pour le moment.</p>
              <p className="text-xs text-white/40 font-bold">Demande à tes parents d'en créer une !</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rewardsList.map(reward => {
                const myPoints = myAccount.points || 0;
                const myBalance = myAccount.balance || 0;
                const canAfford = myPoints >= reward.costPoints || myBalance >= reward.costMoney;

                return (
                  <div 
                    key={reward.id} 
                    className={`bg-[#112240] border-2 rounded-[28px] p-4 flex flex-col justify-between space-y-3 relative shadow-lg transition-all duration-300 ${
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
                        <h3 className="text-xs font-extrabold text-white leading-snug mt-0.5 min-h-[36px]">
                          {reward.title}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-white/5 text-[10px] font-bold">
                      <div className="flex items-center justify-between">
                        <span className="text-white/55">Prix Étoiles :</span>
                        <span className="text-[#FFB020] flex items-center space-x-1">
                          <Star className="w-3.5 h-3.5 fill-[#FFB020] text-[#FFB020]" />
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
                        className={`w-full py-2 mt-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          canAfford 
                            ? 'bg-[#FFB020] text-[#07111F] active:scale-95 shadow-md shadow-[#FFB020]/10' 
                            : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        Acheter 🎁
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form: Proposer un cadeau personnalisé */}
          <form onSubmit={handleSuggestCustomReward} className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-4 text-left font-sans">
            <div className="flex items-center space-x-2 text-sm font-bold text-white">
              <Sparkles className="w-5 h-5 text-[#FFB020]" />
              <span>Je voudrais cette récompense 💡</span>
            </div>
            <p className="text-[10px] text-white/50 font-bold">Tu as une idée de récompense sympa ? Suggère-la à tes parents ici !</p>
            <div className="space-y-3 font-bold">
              <input 
                type="text" 
                placeholder="Ex: Aller au trampoline park, Soirée pyjama..."
                value={customRewardTitle}
                onChange={(e) => setCustomRewardTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#FFB020]/50"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-white/40 uppercase block mb-1">Valeur Étoiles</label>
                  <input 
                    type="number"
                    placeholder="ex: 150"
                    value={customRewardPoints || ''}
                    onChange={(e) => setCustomRewardPoints(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#07111F] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 uppercase block mb-1">Valeur Cash (€)</label>
                  <input 
                    type="number"
                    step="any"
                    placeholder="ex: 15.00"
                    value={customRewardMoney || ''}
                    onChange={(e) => setCustomRewardMoney(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#07111F] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none text-center"
                  />
                </div>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-[#FFB020] text-[#07111F] rounded-xl text-xs font-black uppercase tracking-wider active:scale-97 transition-all cursor-pointer text-center"
            >
              Suggérer cette idée 💬
            </button>
          </form>
        </div>
      )}

      {/* CONTENT: Pocket Money Log */}
      {activeSubTab === 'argent' && (() => {
        // Kids ranking by points
        const kidsRanking = [...pocketMoney].sort((a, b) => (b.points || 0) - (a.points || 0));

        // Stats calculation
        const screenTimeSaved = validatedTasks.length * 30; // in minutes
        const screenTimeStr = screenTimeSaved >= 60 
          ? `${Math.floor(screenTimeSaved / 60)}h${screenTimeSaved % 60 ? screenTimeSaved % 60 : ''}`
          : `${screenTimeSaved} min`;

        const cashEarned = myRealTransactions
          .filter(t => t.amount > 0 && (t.type === 'income' || t.type === 'savings'))
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const starsEarned = validatedTasks.reduce((sum, t) => sum + (t.rewardPoints || 0), 0);
        const starsSpent = Math.max(0, starsEarned - (myAccount.points || 0));
        const badgeCount = Math.floor(starsEarned / 100);

        const completedTasksCount = validatedTasks.length;
        const taskHistoryStreak = myTasks.filter(t => t.done).length;
        const storedStreak = localStorage.getItem(`mf_kid_streak_${member.id}`);
        const missionStreak = storedStreak ? parseInt(storedStreak, 10) : Math.min(7, taskHistoryStreak);

        return (
          <div className="space-y-6">
            
            {/* Double Wallet Balances (Stars & Cash) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#FFB020]/20 to-[#FFB020]/5 border border-[#FFB020]/30 rounded-[32px] p-5 text-center space-y-2 shadow-xl relative overflow-hidden">
                <span className="text-3xl block">🌟</span>
                <p className="text-2xl font-black text-[#FFB020] tracking-tight">{myAccount.points || 0} Pts</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Mes Étoiles</p>
              </div>

              <div className="bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 border border-[#00D26A]/30 rounded-[32px] p-5 text-center space-y-2 shadow-xl relative overflow-hidden">
                <span className="text-3xl block">🪙</span>
                <p className="text-2xl font-black text-[#00D26A] tracking-tight">{myAccount.balance.toFixed(2)} €</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Ma Tirelire</p>
              </div>
            </div>

            {/* Savings Goal Thermometer */}
            {myAccount.goalTitle ? (
              <div className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-3 text-left">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-white/40 uppercase block">🎯 Objectif Cagnotte :</span>
                    <span className="font-extrabold text-white text-sm">✨ {myAccount.goalTitle}</span>
                  </div>
                  <span className="font-black text-[#FFB020]">
                    {myAccount.goalType === 'points'
                      ? `${myAccount.points} / ${myAccount.goalAmount} Pts`
                      : `${myAccount.balance.toFixed(2)} € / ${myAccount.goalAmount} €`
                    }
                  </span>
                </div>
                {(() => {
                  const current = myAccount.goalType === 'points' ? myAccount.points : myAccount.balance;
                  const target = myAccount.goalAmount || 1;
                  const pct = Math.min(100, Math.round((current / target) * 100));
                  return (
                    <div className="space-y-1">
                      <div className="w-full h-4 rounded-full bg-white/5 overflow-hidden border border-white/8 relative flex items-center pr-1">
                        <div 
                          className="h-full bg-gradient-to-r from-[#FFB020] to-[#FF8C00] transition-all duration-500 rounded-full flex items-center justify-end px-2"
                          style={{ width: `${pct}%` }}
                        >
                          {pct > 15 && <span className="text-[9px] text-[#07111F] font-black">{pct}%</span>}
                        </div>
                      </div>
                      <div className="text-[9px] text-white/45 text-right font-bold">
                        Plus que {myAccount.goalType === 'points' ? `${Math.max(0, target - current)} points` : `${Math.max(0, target - current).toFixed(2)} €`} pour atteindre ton objectif !
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/8 rounded-[32px] p-5 text-center space-y-2">
                <span className="text-2xl">🎯</span>
                <p className="text-xs text-white/50 leading-relaxed font-bold">Demande à tes parents de te fixer un objectif (comme une console ou un jouet) pour voir ta barre de progression ici !</p>
              </div>
            )}

            {/* Leaderboard Podium */}
            {kidsRanking.length > 0 && (
              <div className="bg-[#112240] border border-white/5 rounded-[32px] p-6 space-y-4 text-left">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">🏆 Podium de la famille :</span>
                
                <div className="flex justify-center items-end space-x-2 pt-8 pb-4">
                  {/* 2nd Place */}
                  {kidsRanking[1] && (
                    <div className="flex flex-col items-center space-y-1.5 flex-1 max-w-[80px]">
                      <div className="relative">
                        <img src={kidsRanking[1].avatar || '/placeholder_avatar.png'} alt={kidsRanking[1].name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-300" />
                        <div className="absolute -top-2 -right-2 bg-slate-300 text-slate-900 text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">2</div>
                      </div>
                      <span className="text-[10px] font-bold text-white truncate max-w-full block">{kidsRanking[1].name}</span>
                      <span className="text-[9px] text-[#6C5CFF] font-black">{kidsRanking[1].points} pts</span>
                      <div className="w-full h-12 bg-[#6C5CFF]/25 border-t-2 border-slate-300 rounded-t-xl"></div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {kidsRanking[0] && (
                    <div className="flex flex-col items-center space-y-1.5 flex-1 max-w-[90px] -translate-y-2">
                      <div className="relative">
                        <img src={kidsRanking[0].avatar || '/placeholder_avatar.png'} alt={kidsRanking[0].name} className="w-12 h-12 rounded-full object-cover border-2 border-[#FFB020]" />
                        <div className="absolute -top-2 -right-2 bg-[#FFB020] text-[#07111F] text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">1</div>
                      </div>
                      <span className="text-[11px] font-black text-white truncate max-w-full block">{kidsRanking[0].name}</span>
                      <span className="text-[10px] text-[#FFB020] font-black">{kidsRanking[0].points} pts</span>
                      <div className="w-full h-16 bg-[#FFB020]/20 border-t-2 border-[#FFB020] rounded-t-xl"></div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {kidsRanking[2] && (
                    <div className="flex flex-col items-center space-y-1.5 flex-1 max-w-[80px]">
                      <div className="relative">
                        <img src={kidsRanking[2].avatar || '/placeholder_avatar.png'} alt={kidsRanking[2].name} className="w-10 h-10 rounded-full object-cover border-2 border-amber-600" />
                        <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">3</div>
                      </div>
                      <span className="text-[10px] font-bold text-white truncate max-w-full block">{kidsRanking[2].name}</span>
                      <span className="text-[9px] text-[#6C5CFF] font-black">{kidsRanking[2].points} pts</span>
                      <div className="w-full h-8 bg-[#6C5CFF]/15 border-t-2 border-amber-600 rounded-t-xl"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Statistics Dashboard */}
            <div className="bg-[#112240] border border-white/5 rounded-[32px] p-5 space-y-3 text-left">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">📊 Mes Statistiques :</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-3.5 flex items-center space-x-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <span className="text-[9px] text-white/40 block font-bold">Écran évité</span>
                    <span className="text-xs font-black text-white">{screenTimeStr}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 flex items-center space-x-3">
                  <span className="text-2xl">🧹</span>
                  <div>
                    <span className="text-[9px] text-white/40 block font-bold">Missions faites</span>
                    <span className="text-xs font-black text-white">{completedTasksCount}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 flex items-center space-x-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <span className="text-[9px] text-white/40 block font-bold">Étoiles gagnées</span>
                    <span className="text-xs font-black text-[#FFB020]">{starsEarned} Pts</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 flex items-center space-x-3">
                  <span className="text-2xl">🛍️</span>
                  <div>
                    <span className="text-[9px] text-white/40 block font-bold">Étoiles dépensées</span>
                    <span className="text-xs font-black text-[#6C5CFF]">{starsSpent} Pts</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 flex items-center space-x-3">
                  <span className="text-2xl">💶</span>
                  <div>
                    <span className="text-[9px] text-white/40 block font-bold">Argent gagné</span>
                    <span className="text-xs font-black text-[#00D26A]">{cashEarned.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-3.5 flex items-center space-x-3">
                  <span className="text-2xl">🏅</span>
                  <div>
                    <span className="text-[9px] text-white/40 block font-bold">Badges obtenus</span>
                    <span className="text-xs font-black text-[#FF8C00]">{badgeCount} badge{badgeCount > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions History Log */}
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-[10px] text-white/40 uppercase tracking-wider px-1 text-left">
                <History className="w-3.5 h-3.5" />
                <span>Historique de ma tirelire :</span>
              </div>
              
              <div className="bg-white/5 border border-white/8 rounded-[32px] p-2 space-y-2">
                {(myRealTransactions.length === 0) ? (
                  <p className="text-xs text-center text-white/40 py-6 font-bold">Pas encore d'activité enregistrée dans ta tirelire ! 🪙</p>
                ) : (
                  myRealTransactions.map((tx: any) => {
                    const isCredit = tx.amount > 0 || tx.type === 'income' || tx.type === 'savings';
                    const displayAmount = Math.abs(tx.amount);
                    return (
                      <div key={tx.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-1 text-left">
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
                            <span>Opération</span>
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
};
