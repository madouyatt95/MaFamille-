import React from 'react';
import { 
  Star, 
  CheckCircle2, 
  Calendar, 
  Gift, 
  MapPin, 
  MessageCircle, 
  GraduationCap, 
  BookOpen, 
  Utensils, 
  Plane, 
  Heart, 
  Vote, 
  Hourglass, 
  ShieldAlert, 
  Clock, 
  Activity 
} from 'lucide-react';
import type { Member, ChoreTask, FamilyEvent, Trip, SchoolTask, Dish } from '../types';
import { parseChoreTitle, serializeChoreTitle } from '../types';
import { getSupabaseClient } from '../utils/supabase';

interface KidsDashboardProps {
  member: Member;
  tasks: ChoreTask[];
  setTasks: React.Dispatch<React.SetStateAction<ChoreTask[]>>;
  pocketMoney: any[];
  events: FamilyEvent[];
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;

  // Real connected family data
  trips?: Trip[];
  schoolTasks?: SchoolTask[];
  dishes?: Dish[];
  votes?: any[];
  memories?: any[];
  members?: Member[];
  foyer?: any;
  onOpenProfileSwitcher?: () => void;
}

export const KidsDashboard: React.FC<KidsDashboardProps> = ({ 
  member, 
  tasks, 
  setTasks, 
  pocketMoney, 
  events,
  setActiveTab,
  setActiveModule,
  trips = [],
  schoolTasks = [],
  dishes = [],
  votes = [],
  memories = [],
  members = [],
  foyer,
  onOpenProfileSwitcher
}) => {
  
  // Parse chores from metadata
  const parsedTasks = (tasks || []).map(t => {
    if (!t) return null;
    const meta = parseChoreTitle(t.title);
    return {
      ...t,
      title: meta.title,
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

  // 1. Tasks assigned to this kid that are not done and not archived
  const myTasks = parsedTasks.filter(t => 
    !t.isArchived &&
    (t.status === 'todo' || t.status === 'in_progress' || t.status === 'refused') &&
    (t.assignedMemberId === member.id || t.assignedMemberIds?.includes(member.id))
  );
  
  // 2. School tasks (homework) assigned to this kid that are not done
  const myHomework = (schoolTasks || []).filter(t => t && t.assignedMemberId === member.id && !t.done);

  // 3. Pocket money account
  const myAccount = (pocketMoney || []).find(p => p && p.id === member.id) || { balance: 0.0, points: 0 };

  // 4. Closest upcoming family event
  const todayStr = new Date().toISOString().split('T')[0];
  const nextFamilyEvent = (events || [])
    .filter(e => e && e.dateTime && e.dateTime >= todayStr)
    .sort((a, b) => (a.dateTime || '').localeCompare(b.dateTime || ''))[0];

  // 5. Menu of the day
  const daysOfWeekFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const currentDayFr = daysOfWeekFr[new Date().getDay()];
  const dayMap: Record<string, string> = {
    'Lundi': 'Lun',
    'Mardi': 'Mar',
    'Mercredi': 'Mer',
    'Jeudi': 'Jeu',
    'Vendredi': 'Ven',
    'Samedi': 'Sam',
    'Dimanche': 'Dim'
  };
  const currentDayShort = dayMap[currentDayFr] || 'Lun';
  const todayDishes = (dishes || []).filter(d => d && (d.day === currentDayShort || d.day === currentDayFr));

  // 6. Next family trip
  const nextTrip = (trips || [])
    .filter(t => t && t.startDate && t.startDate >= todayStr)
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))[0];

  // 7. Birthday Countdown
  const calculateBirthdayCountdown = () => {
    if (!member.birthDate) return null;
    try {
      let birth: Date;
      if (member.birthDate.includes('/')) {
        const parts = member.birthDate.split('/');
        if (parts.length === 3) {
          birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          return null;
        }
      } else if (member.birthDate.includes('-')) {
        const parts = member.birthDate.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            birth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        } else {
          return null;
        }
      } else {
        birth = new Date(member.birthDate);
      }

      if (isNaN(birth.getTime())) return null;

      const today = new Date();
      const currentYear = today.getFullYear();
      const bdayThisYear = new Date(currentYear, birth.getMonth(), birth.getDate());
      
      if (bdayThisYear.getTime() < today.getTime() - 24 * 60 * 60 * 1000) {
        bdayThisYear.setFullYear(currentYear + 1);
      }
      
      const diffMs = bdayThisYear.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };
  const daysToBirthday = calculateBirthdayCountdown();

  // 8. Active Family Council (Votes)
  const activeVote = (votes || []).length > 0 ? votes[0] : null;

  // 9. Last activities (Timeline filtered for kids)
  const recentActivities = (events || [])
    .filter(e => e && !e.done && e.type !== 'vaccine' && !(e.title || '').includes('mock'))
    .slice(0, 3);

  // 10. Bedtime Story Recomended
  const bedtimeStoryTitle = `Les Aventures Spatiales de ${member.name} 🚀🌙`;

  // Formatted date
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const meta = parseChoreTitle(t.title);
        meta.status = 'pending_validation';
        const newTitle = serializeChoreTitle(meta);
        
        // Update in Supabase
        const client = getSupabaseClient();
        if (client) {
          client.from('chore_tasks')
            .update({ title: newTitle, done: true })
            .eq('id', t.id)
            .then(({ error }) => {
              if (error) console.error("Error completing task in Supabase:", error);
            });
        }
        
        return {
          ...t,
          title: newTitle,
          done: true,
          status: 'pending_validation'
        };
      }
      return t;
    }));
    alert("Mission accomplie ! Un parent va pouvoir la valider. Bien joué ! 🎉");
  };

  const level = Math.floor((myAccount.points || 0) / 50) + 1;

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFB020]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />

      {/* Top Bar Switcher */}
      <div className="flex justify-between items-center w-full px-2 pt-[calc(1rem+env(safe-area-inset-top,0px))] relative z-20">
        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">ESPACE ENFANT 🧸</span>
        {onOpenProfileSwitcher && (
          <button
            onClick={onOpenProfileSwitcher}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-extrabold text-[#FF4D6D] hover:bg-[#FF4D6D]/10 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 shadow-md"
          >
            <span>🚪</span>
            <span>Revenir au profil parent</span>
          </button>
        )}
      </div>

      {/* Header Profile */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#6C5CFF] to-[#FFB020] rounded-full blur-lg opacity-50 animate-pulse"></div>
          <img 
            src={member.photoUrl} 
            alt={member.name} 
            className="w-24 h-24 rounded-full object-cover border-4 border-white relative z-10"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#FFB020] text-[#07111F] font-black text-xs px-3 py-1.5 rounded-full border-2 border-white z-20 shadow-md">
            Niv. {level}
          </div>
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Bonjour {member.name} 👋</h1>
          <p className="text-xs text-white/55 font-bold capitalize">🗓️ {formattedDate}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div 
          onClick={() => {
            setActiveTab('menu');
            setActiveModule('boutique');
          }}
          className="bg-gradient-to-br from-[#FFB020]/20 to-[#FFB020]/5 border border-[#FFB020]/30 rounded-[32px] p-5 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:scale-[1.02] active:scale-98 transition-all"
        >
          <Star className="w-8 h-8 text-[#FFB020] fill-[#FFB020]" />
          <div>
            <p className="text-2xl font-black text-[#FFB020]">{myAccount.points || 0}</p>
            <p className="text-[10px] font-bold text-[#FFB020]/70 uppercase tracking-wider">Points Étoile</p>
          </div>
        </div>
        
        <div 
          onClick={() => {
            setActiveTab('menu');
            setActiveModule('argent');
          }}
          className="bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 border border-[#00D26A]/30 rounded-[32px] p-5 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:scale-[1.02] active:scale-98 transition-all"
        >
          <Gift className="w-8 h-8 text-[#00D26A]" />
          <div>
            <p className="text-2xl font-black text-[#00D26A]">{myAccount.balance.toFixed(2) || '0.00'} €</p>
            <p className="text-[10px] font-bold text-[#00D26A]/70 uppercase tracking-wider">Argent de poche</p>
          </div>
        </div>
      </div>

      {/* Main Widgets Section */}
      <div className="space-y-6">
        
        {/* Birthday Widget (Only if near, <= 30 days) */}
        {daysToBirthday !== null && daysToBirthday <= 30 && (
          <div className="bg-gradient-to-r from-[#FF4D6D]/20 to-[#FFB020]/10 border border-[#FF4D6D]/30 rounded-[32px] p-5 flex items-center space-x-4 shadow-lg">
            <span className="text-3xl">🎉</span>
            <div>
              <h4 className="text-sm font-black text-white">Bientôt ton anniversaire !</h4>
              <p className="text-xs text-white/60 font-bold">Plus que <span className="text-[#FF4D6D] font-black">{daysToBirthday}</span> {daysToBirthday > 1 ? 'jours' : 'jour'} d'attente ! 🥳</p>
            </div>
          </div>
        )}

        {/* Chores (Missions) Widget */}
        <div className="bg-[#112240] border-2 border-white/5 rounded-[32px] p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-white flex items-center space-x-2">
              <span>🎯</span>
              <span>Mes Missions du Jour ({myTasks.length})</span>
            </h3>
            <button 
              onClick={() => {
                setActiveTab('menu');
                setActiveModule('taches');
              }}
              className="text-[10px] font-black text-[#FFB020] uppercase tracking-wider cursor-pointer"
            >
              Voir tout
            </button>
          </div>
          
          <div className="space-y-2.5">
            {myTasks.length === 0 ? (
              <div className="p-4 bg-white/5 rounded-2xl text-center">
                <p className="text-xs font-bold text-white/50">🎉 Toutes tes missions sont terminées !</p>
              </div>
            ) : (
              myTasks.slice(0, 2).map(task => (
                <div key={task.id} className="bg-white/5 rounded-2xl p-3.5 flex items-center justify-between border border-white/5">
                  <div className="pr-3">
                    <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
                    <p className="text-[10px] font-black text-[#FFB020] mt-0.5">+{task.rewardPoints} points</p>
                  </div>
                  <button 
                    onClick={() => handleCompleteTask(task.id)}
                    className="w-9 h-9 bg-[#00D26A] rounded-xl flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Homework (Ecole) Widget */}
        <div className="bg-[#112240] border-2 border-white/5 rounded-[32px] p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-white flex items-center space-x-2">
              <span>📚</span>
              <span>Mes Devoirs ({myHomework.length})</span>
            </h3>
            <button 
              onClick={() => {
                setActiveTab('menu');
                setActiveModule('ecole');
              }}
              className="text-[10px] font-black text-[#00D26A] uppercase tracking-wider cursor-pointer"
            >
              Cahier de textes
            </button>
          </div>

          <div className="space-y-2">
            {myHomework.length === 0 ? (
              <div className="p-4 bg-white/5 rounded-2xl text-center">
                <p className="text-xs font-bold text-white/50">✍️ Pas de devoir pour le moment !</p>
              </div>
            ) : (
              myHomework.slice(0, 2).map(hw => (
                <div key={hw.id} className="bg-white/5 rounded-2xl p-3 flex items-center justify-between border border-white/5 text-left">
                  <div>
                    <span className="text-[8px] font-black bg-white/5 px-2 py-0.5 rounded text-white/40 uppercase">{hw.subject}</span>
                    <h4 className="text-xs font-bold text-white mt-1 leading-snug">{hw.title}</h4>
                  </div>
                  <span className="text-[10px] font-bold text-white/35 shrink-0">Pour le {hw.dueDate}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Menu & Next Trip & Next Family Event (Horizontal Scroll or Compact Widgets) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Prochain Événement Familial */}
          <div className="bg-white/5 border border-white/5 rounded-[32px] p-5 space-y-3">
            <h4 className="text-xs font-black text-white/40 uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-[#6C5CFF]" />
              <span>Prochain Événement</span>
            </h4>
            
            {nextFamilyEvent ? (
              <div className="p-3 bg-white/5 rounded-2xl space-y-1 text-left border border-white/5">
                <p className="text-xs font-bold text-white">{nextFamilyEvent.title}</p>
                <p className="text-[10px] text-white/40 font-bold">📅 Le {nextFamilyEvent.dateTime} à {nextFamilyEvent.time}</p>
              </div>
            ) : (
              <p className="text-xs text-white/40 font-bold">Rien de prévu à l'agenda pour le moment !</p>
            )}
          </div>

          {/* Le Menu de la Semaine */}
          <div className="bg-white/5 border border-white/5 rounded-[32px] p-5 space-y-3">
            <h4 className="text-xs font-black text-white/40 uppercase tracking-wider flex items-center space-x-1.5">
              <Utensils className="w-4 h-4 text-[#FF9F1C]" />
              <span>Au Menu Aujourd'hui ({currentDayFr})</span>
            </h4>
            
            {todayDishes.length > 0 ? (
              <div className="space-y-1.5">
                {todayDishes.map(dish => (
                  <div key={dish.id} className="p-3 bg-white/5 rounded-2xl text-left border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{dish.name}</p>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Type : {dish.mealType === 'lunch' ? 'Déjeuner' : 'Dîner'}</p>
                    </div>
                    <span className="text-xl">🍲</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white/5 rounded-2xl text-center">
                <p className="text-xs text-white/40 font-bold">Menu non programmé 🥣</p>
              </div>
            )}
          </div>

          {/* Prochain Voyage */}
          {nextTrip && (
            <div className="bg-white/5 border border-white/5 rounded-[32px] p-5 space-y-3 md:col-span-2 text-left">
              <h4 className="text-xs font-black text-white/40 uppercase tracking-wider flex items-center space-x-1.5">
                <Plane className="w-4 h-4 text-[#4F8CFF]" />
                <span>Prochain Voyage Familial ✈️</span>
              </h4>
              <div className="p-4 bg-gradient-to-r from-[#4F8CFF]/15 to-transparent rounded-2xl border border-[#4F8CFF]/15 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white">Voyage à {nextTrip.destination} 🌍</h4>
                  <p className="text-xs text-white/60 font-bold mt-1">Du {nextTrip.startDate} au {nextTrip.endDate}</p>
                </div>
                <span className="text-2xl animate-bounce">🎒</span>
              </div>
            </div>
          )}

        </div>

        {/* Stories Widget */}
        <div className="bg-[#112240] border-2 border-white/5 rounded-[32px] p-5 space-y-3 text-left">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-white flex items-center space-x-2">
              <span>🌙</span>
              <span>Mon Histoire du Soir</span>
            </h3>
            <button 
              onClick={() => {
                setActiveTab('menu');
                setActiveModule('conteur');
              }}
              className="text-[10px] font-black text-[#FF4D6D] uppercase tracking-wider cursor-pointer"
            >
              Ouvrir
            </button>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">{bedtimeStoryTitle}</h4>
              <p className="text-[9.5px] text-white/40 font-bold mt-0.5">Sélectionné spécialement pour toi ce soir</p>
            </div>
            <span className="text-2xl">🦎</span>
          </div>
        </div>

        {/* Conseil de Famille Widget (Active Votes) */}
        {activeVote && (
          <div className="bg-gradient-to-r from-[#6C5CFF]/20 to-transparent border-2 border-[#6C5CFF]/30 rounded-[32px] p-5 text-left space-y-3">
            <div className="flex items-center space-x-2">
              <Vote className="w-5 h-5 text-[#6C5CFF]" />
              <span className="text-xs font-black uppercase text-[#9d94ff] tracking-wider">Conseil de Famille Actif</span>
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">Sondage : {activeVote.question}</p>
              <p className="text-[10px] text-white/50 font-bold mt-1">Donne ton avis et vote avec ta famille !</p>
            </div>
            <button 
              onClick={() => {
                setActiveTab('menu');
                setActiveModule('conseil');
              }}
              className="px-4 py-2 bg-[#6C5CFF] text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
            >
              Participer au vote 🗳️
            </button>
          </div>
        )}

        {/* Time Capsule (Capsule Temporelle) */}
        <div className="bg-white/5 border border-white/5 rounded-[32px] p-5 text-left space-y-3">
          <div className="flex items-center space-x-2">
            <Hourglass className="w-4 h-4 text-[#FFB020]" />
            <span className="text-xs font-black uppercase text-white/40 tracking-wider">Capsule Temporelle ⏳</span>
          </div>
          <p className="text-xs text-white/60 font-bold leading-relaxed">
            Ajoute un dessin ou une photo souvenir dans la capsule de la famille pour t'en rappeler dans quelques années !
          </p>
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('capsule');
            }}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white/80 cursor-pointer"
          >
            Découvrir mes souvenirs
          </button>
        </div>

        {/* PeaceMaker Dispute Button */}
        <div className="bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 rounded-[32px] p-5 flex items-center justify-between space-x-4 text-left">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-[#FF4D6D]">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Alerte dispute ?</span>
            </div>
            <h4 className="text-xs font-black text-white">Besoin d'un arbitre ? ☮️</h4>
            <p className="text-[9.5px] text-white/50 font-bold">Déclenche le PeaceMaker pour vous réconcilier !</p>
          </div>
          
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('peacemaker');
            }}
            className="px-4 py-2.5 bg-[#FF4D6D] text-[#07111F] rounded-xl text-xs font-black shadow-lg cursor-pointer"
          >
            PeaceMaker !
          </button>
        </div>

        {/* Kid-Adapted Timeline Activities */}
        <div className="space-y-3 text-left">
          <div className="flex items-center space-x-1.5 text-xs text-white/40 uppercase tracking-wider px-1">
            <Activity className="w-4 h-4" />
            <span>Activités de ma famille :</span>
          </div>

          <div className="bg-white/5 border border-white/8 rounded-[32px] p-2 space-y-2">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-center text-white/40 py-6 font-bold">Pas de nouvelle activité aujourd'hui !</p>
            ) : (
              recentActivities.map(act => (
                <div key={act.id} className="bg-white/5 rounded-2xl p-4 flex items-center space-x-3">
                  <span className="text-xl">📅</span>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white">{act.title}</h4>
                    <p className="text-[9.5px] text-white/40 font-bold">{(act.dateTime || '').split('T')[0] || act.time || ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
