import React, { useState } from 'react';
import { ArrowLeft, Star, Gift, CheckCircle2, ShieldCheck, PlusCircle, HelpCircle, History, Sparkles } from 'lucide-react';
import type { Member, ChoreTask, NotificationAlert, Transaction, Foyer } from '../types';
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
}

interface RewardItem {
  id: string;
  title: string;
  cost: number;
  icon: string;
  category: string;
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
  transactions = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'missions' | 'boutique' | 'argent'>(defaultTab || 'missions');
  const [requestText, setRequestText] = useState('');
  const [requestPoints, setRequestPoints] = useState(20);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiMessage, setConfettiMessage] = useState('');

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

  // Filter tasks assigned to this kid
  const myTasks = tasks.filter(t => t.assignedMemberId === member.id);
  const pendingTasks = myTasks.filter(t => !t.done);
  const completedTasks = myTasks.filter(t => t.done);

  // Rewards list
  const rewardsList: RewardItem[] = [
    { id: 'rew-1', title: '30 min de console 🎮', cost: 50, icon: '⚡', category: 'Écran' },
    { id: 'rew-2', title: 'Choisir le menu du dîner 🍕', cost: 80, icon: '😋', category: 'Repas' },
    { id: 'rew-3', title: 'Coucher tardif (+30 min) 🌙', cost: 100, icon: '⏰', category: 'Sommeil' },
    { id: 'rew-4', title: 'Double boule de glace 🍦', cost: 120, icon: '🍧', category: 'Gourmandise' },
    { id: 'rew-5', title: 'Cinéma en famille 🎬', cost: 250, icon: '🍿', category: 'Sortie' },
    { id: 'rew-6', title: 'Nouveau jouet au choix 🧸', cost: 400, icon: '🎁', category: 'Cadeau' }
  ];

  // Complete a task (needs parental validation)
  const handleCompleteTask = (taskId: string, points: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: true } : t));

    setConfettiMessage(`Super ! Mission terminée. Tes parents ont été prévenus et vont bientôt la valider pour te donner +${points} points ! 🌟`);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  // Buy a reward (requests validation from parent)
  const handleRedeemReward = async (reward: RewardItem) => {
    if ((myAccount.points || 0) < reward.cost) {
      alert(`Oups ! Il te manque ${reward.cost - (myAccount.points || 0)} points pour acheter cette récompense. Continue tes missions ! 💪`);
      return;
    }

    if (window.confirm(`Es-tu sûr de vouloir demander cette récompense : "${reward.title}" pour ${reward.cost} points ?`)) {
      const timestamp = Date.now();
      const newAlert: NotificationAlert = {
        id: `req-rew-${member.id}-${reward.id}-${timestamp}`,
        title: `Demande de récompense : ${reward.title}`,
        description: `${member.name} souhaite échanger ${reward.cost} points contre "${reward.title}".`,
        time: new Date().toISOString(),
        type: 'warning',
        read: false,
        module: 'argent',
        senderMemberId: member.id,
        senderName: member.name,
        senderAvatar: member.photoUrl
      };

      // Save to state
      if (setAlerts) {
        setAlerts(prev => [newAlert, ...prev]);
      }

      // Save to Supabase
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
          console.log("[KidMissions] Reward request successfully saved to cloud.");
        }
      } catch (err) {
        console.error("[KidMissions] Failed to save reward request alert to cloud:", err);
      }

      setConfettiMessage(`Ta demande pour "${reward.title}" a bien été envoyée à tes parents. Ils vont la valider très vite ! 🚀✨`);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  };

  // Ask for new mission
  const handleRequestMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;

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
            
            {pendingTasks.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center space-y-2">
                <span className="text-4xl block">🎉</span>
                <p className="text-sm font-black text-white">Bravo ! Tout est fini !</p>
                <p className="text-xs text-white/50 leading-relaxed font-bold">Tu as accompli toutes les tâches demandées par tes parents pour aujourd'hui.</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <div 
                  key={task.id} 
                  className="bg-[#112240] border-2 border-[#6C5CFF]/30 rounded-[28px] p-4 flex items-center justify-between shadow-lg shadow-[#6C5CFF]/5"
                >
                  <div className="flex-1 pr-4">
                    <span className="text-[9px] font-bold bg-[#6C5CFF]/20 text-[#9d94ff] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Famille 🏠
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1 leading-snug">{task.title}</h3>
                    <p className="text-xs font-black text-[#FFB020] mt-1 flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-[#FFB020]" />
                      <span>+{task.rewardPoints || 10} points</span>
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

          {/* Form: Ask for mission */}
          <form onSubmit={handleRequestMission} className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-white">
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

          {/* Completed Tasks Log */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Missions terminées :</span>
              <div className="bg-white/5 rounded-[32px] p-2 space-y-2 border border-white/5">
                {completedTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-white/80 line-through">{task.title}</h4>
                      <p className="text-[10px] text-white/35">Terminé avec succès</p>
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
          <div className="grid grid-cols-2 gap-3">
            {rewardsList.map(reward => {
              const canAfford = (myAccount.points || 0) >= reward.cost;
              return (
                <div 
                  key={reward.id} 
                  className={`bg-[#112240] border-2 rounded-[28px] p-4 flex flex-col justify-between text-left space-y-3 relative shadow-lg ${
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
                        <Star className="w-3 h-3 fill-[#FFB020]" />
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
                      Acheter ⭐️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENT: Pocket Money Log */}
      {activeSubTab === 'argent' && (
        <div className="space-y-6">
          
          {/* Main Account Balance Card */}
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

          {/* Transactions list */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-xs text-white/40 uppercase tracking-wider px-1">
              <History className="w-3.5 h-3.5" />
              <span>Historique de ma tirelire :</span>
            </div>
            
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-2 space-y-2">
              {(myRealTransactions.length === 0) ? (
                <p className="text-xs text-center text-white/40 py-6 font-bold">Pas encore d'activité enregistrée dans ta tirelire ! 🪙</p>
              ) : (
                myRealTransactions.map((tx: any) => {
                  const isCredit = tx.amount > 0 || tx.type === 'credit' || tx.type === 'income';
                  const displayAmount = Math.abs(tx.amount);
                  return (
                    <div key={tx.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1">
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
    </div>
  );
};
