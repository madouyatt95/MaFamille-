import React from 'react';
import { Star, CheckCircle2, Calendar, Gift } from 'lucide-react';
import type { Member, ChoreTask, FamilyEvent } from '../types';

interface KidsDashboardProps {
  member: Member;
  tasks: ChoreTask[];
  setTasks: React.Dispatch<React.SetStateAction<ChoreTask[]>>;
  pocketMoney: any; // Using the type from App.tsx
  events: FamilyEvent[];
}

export const KidsDashboard: React.FC<KidsDashboardProps> = ({ member, tasks, setTasks, pocketMoney, events }) => {
  // Filter tasks assigned to this kid that are not done
  const myTasks = tasks.filter(t => t.assignedMemberId === member.id && !t.done);
  
  // Get pocket money account
  const myMoney = pocketMoney.find((p: any) => p.id === member.id);

  // Filter events involving this kid
  const myEvents = events.filter(e => e.memberId === member.id || e.title.toLowerCase().includes(member.name.toLowerCase()));

  const handleCompleteTask = (taskId: string) => {
    // In a real app, we might trigger confetti here!
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: true } : t));
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-24">
      {/* Header Profile */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#6C5CFF] to-[#00D26A] rounded-full blur-lg opacity-50 animate-pulse"></div>
          <img 
            src={member.photoUrl} 
            alt={member.name} 
            className="w-24 h-24 rounded-full object-cover border-4 border-white relative z-10"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#FFB020] text-[#07111F] font-black text-xs px-3 py-1 rounded-full border-2 border-white z-20">
            Niv. {Math.floor((myMoney?.points || 0) / 50) + 1}
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight">Salut {member.name} ! ✌️</h1>
          <p className="text-white/60 font-medium">Prêt pour de nouvelles missions ?</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#FFB020]/20 to-[#FFB020]/5 border border-[#FFB020]/30 rounded-[32px] p-5 flex flex-col items-center justify-center text-center space-y-2">
          <Star className="w-8 h-8 text-[#FFB020] fill-[#FFB020]" />
          <div>
            <p className="text-2xl font-black text-[#FFB020]">{myMoney?.points || 0}</p>
            <p className="text-[10px] font-bold text-[#FFB020]/70 uppercase tracking-wider">Points Étoile</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 border border-[#00D26A]/30 rounded-[32px] p-5 flex flex-col items-center justify-center text-center space-y-2">
          <Gift className="w-8 h-8 text-[#00D26A]" />
          <div>
            <p className="text-2xl font-black text-[#00D26A]">{myMoney?.balance.toFixed(2) || '0.00'} €</p>
            <p className="text-[10px] font-bold text-[#00D26A]/70 uppercase tracking-wider">Argent de poche</p>
          </div>
        </div>
      </div>

      {/* Missions */}
      <div className="mb-8 space-y-4">
        <h2 className="text-xl font-black px-2 flex items-center space-x-2">
          <span>🎯</span>
          <span>Mes Missions du Jour</span>
        </h2>
        <div className="space-y-3">
          {myTasks.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 text-center">
              <span className="text-4xl block mb-2">🎉</span>
              <p className="text-sm font-bold text-white/80">Toutes tes missions sont terminées !</p>
            </div>
          ) : (
            myTasks.map(task => (
              <div key={task.id} className="bg-[#112240] border-2 border-[#6C5CFF]/30 rounded-[28px] p-4 flex items-center justify-between shadow-lg shadow-[#6C5CFF]/10">
                <div className="flex-1 pr-4">
                  <h3 className="text-base font-bold text-white leading-tight">{task.title}</h3>
                  <p className="text-xs font-bold text-[#FFB020] mt-1">+{task.rewardPoints} points</p>
                </div>
                <button 
                  onClick={() => handleCompleteTask(task.id)}
                  className="w-14 h-14 bg-[#00D26A] rounded-[20px] flex items-center justify-center shadow-lg shadow-[#00D26A]/30 active:scale-90 transition-transform cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Agenda */}
      <div className="space-y-4">
        <h2 className="text-xl font-black px-2 flex items-center space-x-2">
          <span>📅</span>
          <span>Mon Programme</span>
        </h2>
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-2 space-y-2">
          {myEvents.length === 0 ? (
            <p className="text-xs text-center text-white/40 py-4 font-medium">Rien de prévu pour le moment !</p>
          ) : (
            myEvents.slice(0, 3).map(event => (
              <div key={event.id} className="bg-white/5 rounded-[24px] p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex flex-col items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-white/60 mb-1" />
                  <span className="text-[10px] font-bold text-white/80">{event.time}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{event.title}</h4>
                  <p className="text-[10px] font-bold text-white/40 mt-0.5">{event.dateTime.split('T')[0]}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
