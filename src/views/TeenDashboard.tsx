import React, { useState } from 'react';
import { Star, CheckCircle2, Calendar, Gift, MapPin, MessageSquare, GraduationCap, Clock } from 'lucide-react';
import type { Member, ChoreTask, FamilyEvent, SchoolTask } from '../types';

interface TeenDashboardProps {
  member: Member;
  tasks: ChoreTask[];
  setTasks: React.Dispatch<React.SetStateAction<ChoreTask[]>>;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  pocketMoney: any[];
  events: FamilyEvent[];
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;
}

export const TeenDashboard: React.FC<TeenDashboardProps> = ({
  member,
  tasks,
  setTasks,
  schoolTasks,
  setSchoolTasks,
  pocketMoney,
  events,
  setActiveTab,
  setActiveModule
}) => {
  // Filter tasks assigned to this teen
  const myTasks = tasks.filter(t => t.assignedMemberId === member.id && !t.done);
  
  // Filter school tasks (homework) assigned to this teen
  const mySchoolTasks = schoolTasks.filter(t => t.assignedMemberId === member.id && !t.done);

  // Get pocket money account
  const myMoney = pocketMoney.find((p: any) => p.id === member.id);

  // Filter events involving this teen
  const myEvents = events.filter(e => e.memberId === member.id || e.title.toLowerCase().includes(member.name.toLowerCase()));

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: true } : t));
  };

  const handleCompleteSchoolTask = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: true } : t));
  };

  return (
    <div className="min-h-screen bg-[var(--family-bg)] text-[var(--family-text)] p-4 font-sans pb-32">
      {/* Header Profile */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] rounded-full blur-lg opacity-50 animate-pulse"></div>
          <img 
            src={member.photoUrl} 
            alt={member.name} 
            className="w-24 h-24 rounded-full object-cover border-4 border-[#6C5CFF]/30 relative z-10"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#6C5CFF] text-white font-black text-xs px-3 py-1 rounded-full border-2 border-white z-20">
            Ado
          </div>
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Salut {member.name} ! ⚡</h1>
          <p className="text-white/50 text-xs font-medium">Espace Autonomie & Études</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#6C5CFF]/20 to-[#6C5CFF]/5 border border-[#6C5CFF]/30 rounded-[28px] p-4 flex flex-col items-center justify-center text-center space-y-1 font-sans">
          <Star className="w-7 h-7 text-[#9E94FF]" />
          <div>
            <p className="text-xl font-black text-white">{myMoney?.points || 0}</p>
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Points Gagnés</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#FF4D6D]/20 to-[#FF4D6D]/5 border border-[#FF4D6D]/30 rounded-[28px] p-4 flex flex-col items-center justify-center text-center space-y-1 font-sans">
          <Gift className="w-7 h-7 text-[#FF708A]" />
          <div>
            <p className="text-xl font-black text-white">{myMoney?.balance.toFixed(2) || '0.00'} €</p>
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Mon Solde</p>
          </div>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="mb-6 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 px-1">Raccourcis rapides</h2>
        <div className="grid grid-cols-4 gap-2">
          <button 
            onClick={() => { setActiveTab('menu'); setActiveModule('ecole'); }}
            className="bg-[#112240] border border-white/10 rounded-2xl py-3 px-2 flex flex-col items-center text-center space-y-1.5 cursor-pointer hover:bg-white/5 transition"
          >
            <GraduationCap className="w-5 h-5 text-[#6C5CFF]" />
            <span className="text-[10px] font-extrabold text-white/90">École</span>
          </button>
          <button 
            onClick={() => { setActiveTab('menu'); setActiveModule('messagerie'); }}
            className="bg-[#112240] border border-white/10 rounded-2xl py-3 px-2 flex flex-col items-center text-center space-y-1.5 cursor-pointer hover:bg-white/5 transition"
          >
            <MessageSquare className="w-5 h-5 text-[#00D26A]" />
            <span className="text-[10px] font-extrabold text-white/90">Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className="bg-[#112240] border border-white/10 rounded-2xl py-3 px-2 flex flex-col items-center text-center space-y-1.5 cursor-pointer hover:bg-white/5 transition"
          >
            <Clock className="w-5 h-5 text-[#FFB020]" />
            <span className="text-[10px] font-extrabold text-white/90">Timeline</span>
          </button>
          <button 
            onClick={() => { setActiveTab('menu'); setActiveModule('carte'); }}
            className="bg-[#112240] border border-white/10 rounded-2xl py-3 px-2 flex flex-col items-center text-center space-y-1.5 cursor-pointer hover:bg-white/5 transition"
          >
            <MapPin className="w-5 h-5 text-[#FF4D6D]" />
            <span className="text-[10px] font-extrabold text-white/90">Carte</span>
          </button>
        </div>
      </div>

      {/* Homework (Devoirs) */}
      <div className="mb-6 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 px-1 flex items-center justify-between">
          <span>📚 Devoirs à faire</span>
          {mySchoolTasks.length > 0 && (
            <span className="text-[9px] bg-[#6C5CFF]/20 text-[#9E94FF] px-2 py-0.5 rounded-full font-black font-sans">
              {mySchoolTasks.length}
            </span>
          )}
        </h2>
        <div className="space-y-2">
          {mySchoolTasks.length === 0 ? (
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
              <p className="text-xs text-white/40">Pas de devoirs en attente ! 🎉</p>
            </div>
          ) : (
            mySchoolTasks.map(task => (
              <div key={task.id} className="bg-[#112240] border border-white/8 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex-1 pr-3 min-w-0">
                  <span className="text-[8px] font-extrabold text-[#6C5CFF] uppercase bg-[#6C5CFF]/10 px-1.5 py-0.5 rounded-md font-sans">
                    {task.subject}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-1 truncate">{task.title}</h4>
                  <p className="text-[9px] text-white/40 mt-0.5">Pour le : {task.dueDate}</p>
                </div>
                <button 
                  onClick={() => handleCompleteSchoolTask(task.id)}
                  className="p-1.5 bg-[#00D26A]/20 hover:bg-[#00D26A] text-[#00D26A] hover:text-white border border-[#00D26A]/30 rounded-xl transition active:scale-90 cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tâches familiales */}
      <div className="mb-6 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 px-1 flex items-center justify-between">
          <span>🧹 Mes missions</span>
          {myTasks.length > 0 && (
            <span className="text-[9px] bg-[#FFB020]/20 text-[#FFB020] px-2 py-0.5 rounded-full font-black font-sans">
              {myTasks.length}
            </span>
          )}
        </h2>
        <div className="space-y-2">
          {myTasks.length === 0 ? (
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
              <p className="text-xs text-white/40">Aucune mission assignée pour aujourd'hui ! 👍</p>
            </div>
          ) : (
            myTasks.map(task => (
              <div key={task.id} className="bg-[#112240] border border-white/8 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex-1 pr-3">
                  <h4 className="text-xs font-bold text-white">{task.title}</h4>
                  <p className="text-[9px] font-bold text-[#FFB020] mt-0.5 font-sans">+{task.rewardPoints} Pts</p>
                </div>
                <button 
                  onClick={() => handleCompleteTask(task.id)}
                  className="p-1.5 bg-[#00D26A]/20 hover:bg-[#00D26A] text-[#00D26A] hover:text-white border border-[#00D26A]/30 rounded-xl transition active:scale-90 cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Programme */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 px-1">Mon Agenda</h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-2 space-y-2">
          {myEvents.length === 0 ? (
            <p className="text-[10px] text-center text-white/40 py-3">Aucun événement prévu !</p>
          ) : (
            myEvents.slice(0, 3).map(event => (
              <div key={event.id} className="bg-white/5 rounded-xl p-3 flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex flex-col items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-white/60 mb-0.5" />
                  <span className="text-[9px] font-bold text-white/80 font-sans">{event.time}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{event.title}</h4>
                  <p className="text-[9px] text-white/40 font-sans">{(event.dateTime || '').split('T')[0] || 'Toute la journée'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
