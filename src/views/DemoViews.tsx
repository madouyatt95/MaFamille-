import React, { useState } from 'react';
import { 
  Home, GraduationCap, Trophy, Gamepad2, User, BookOpen, Calendar, 
  MessageSquare, Plus, Send, UserCheck, ClipboardList, ArrowLeft, 
  Landmark, AlertTriangle, CheckSquare, Volume2, Mic, Megaphone, 
  BarChart2, Settings, Clock, Coins, Trash2, Edit3, Camera, 
  CheckCircle2, Star, Gift, Check, ShieldAlert, Info, MapPin, Users,
  PlusCircle, CheckCircle, FileText, ChevronRight, MessageCircle, RefreshCw, X, Vote
} from 'lucide-react';
import type { Member, ChoreTask, Transaction } from '../types';

// ==========================================
// 🎓 STUDENT ROSTERS (Victor Hugo & Simone Veil)
// ==========================================
export const CE2_ROSTER = [
  { id: 'student-ce2-1', name: 'Lucas Dubois' },
  { id: 'student-ce2-2', name: 'Emma Martinez' },
  { id: 'student-ce2-3', name: 'Louis Petit' },
  { id: 'student-ce2-4', name: 'Chloé Lemaire' },
  { id: 'student-ce2-5', name: 'Gabriel Moreau' },
  { id: 'student-ce2-6', name: 'Inès Roux' },
  { id: 'student-ce2-7', name: 'Jules Fontaine' },
  { id: 'demo_issa', name: 'Issa Diop' }, // Issa is CE2
  { id: 'student-ce2-9', name: 'Sarah Benali' },
  { id: 'student-ce2-10', name: 'Nathan Collin' },
  { id: 'student-ce2-11', name: 'Manon Bernard' },
  { id: 'student-ce2-12', name: 'Thomas Vidal' },
  { id: 'student-ce2-13', name: 'Zoe Gautier' },
  { id: 'student-ce2-14', name: 'Arthur Fournier' },
  { id: 'student-ce2-15', name: 'Léa Royer' },
  { id: 'student-ce2-16', name: 'Enzo Giraud' },
  { id: 'student-ce2-17', name: 'Camille Nguyen' },
  { id: 'student-ce2-18', name: 'Hugo Bertrand' },
  { id: 'student-ce2-19', name: 'Jade Lefevre' },
  { id: 'student-ce2-20', name: 'Leo Mercier' },
  { id: 'student-ce2-21', name: 'Alice Chevalier' },
  { id: 'student-ce2-22', name: 'Raphaël Clement' },
  { id: 'student-ce2-23', name: 'Clara Michel' },
  { id: 'student-ce2-24', name: 'Antoine Bourgeois' },
  { id: 'student-ce2-25', name: 'Maëlys David' },
  { id: 'student-ce2-26', name: 'Maxime Bertrand' },
  { id: 'student-ce2-27', name: 'Eva Francois' },
  { id: 'student-ce2-28', name: 'Paul Simon' }
];

export const PREMIERE_ROSTER = [
  { id: 'student-1ere-1', name: 'Théo Guerin' },
  { id: 'student-1ere-2', name: 'Clara Picard' },
  { id: 'student-1ere-3', name: 'Mathieu Bonnet' },
  { id: 'student-1ere-4', name: 'Lola Renard' },
  { id: 'student-1ere-5', name: 'Pauline Caron' },
  { id: 'student-1ere-6', name: 'Cyril Boyer' },
  { id: 'student-1ere-7', name: 'Bastien Marchand' },
  { id: 'student-1ere-8', name: 'Océane Aubry' },
  { id: 'demo_lyna', name: 'Lyna Diop' }, // Lyna is 1ère
  { id: 'student-1ere-10', name: 'Alexandre Roger' },
  { id: 'student-1ere-11', name: 'Amandine Pierre' },
  { id: 'student-1ere-12', name: 'Valentin Laurent' },
  { id: 'student-1ere-13', name: 'Marion Dupont' },
  { id: 'student-1ere-14', name: 'Julien Leroy' },
  { id: 'student-1ere-15', name: 'Charlotte Lambert' },
  { id: 'student-1ere-16', name: 'Florent Martin' },
  { id: 'student-1ere-17', name: 'Noémie Simon' },
  { id: 'student-1ere-18', name: 'Guillaume Michel' },
  { id: 'student-1ere-19', name: 'Audrey Garcia' },
  { id: 'student-1ere-20', name: 'Romain Thomas' },
  { id: 'student-1ere-21', name: 'Elisa Robert' },
  { id: 'student-1ere-22', name: 'Yasmine Bensaid' },
  { id: 'student-1ere-23', name: 'Nicolas Petit' },
  { id: 'student-1ere-24', name: 'Mélanie Dubois' },
  { id: 'student-1ere-25', name: 'Kévin Richard' },
  { id: 'student-1ere-26', name: 'Laura Morin' },
  { id: 'student-1ere-27', name: 'Maxime Lemaire' },
  { id: 'student-1ere-28', name: 'Julie Lefevre' },
  { id: 'student-1ere-29', name: 'Dylan Bertrand' },
  { id: 'student-1ere-30', name: 'Chloé Roux' }
];

// ==========================================
// 📱 DYNAMIC BOTTOM NAV BAR FOR DEMO MODE
// ==========================================
interface DemoBottomNavProps {
  demoProfileId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DemoBottomNav: React.FC<DemoBottomNavProps> = ({
  demoProfileId,
  activeTab,
  setActiveTab
}) => {
  let tabs: { id: string; label: string; icon: React.ComponentType<any> }[] = [];

  if (demoProfileId === 'demo_issa') {
    tabs = [
      { id: 'accueil', label: 'Accueil', icon: Home },
      { id: 'ecole', label: 'École', icon: BookOpen },
      { id: 'recompenses', label: 'Récompenses', icon: Star },
      { id: 'activites', label: 'Activités', icon: Gamepad2 },
      { id: 'profil', label: 'Profil', icon: User }
    ];
  } else if (demoProfileId === 'demo_lyna') {
    tabs = [
      { id: 'accueil', label: 'Accueil', icon: Home },
      { id: 'ecole', label: 'École', icon: BookOpen },
      { id: 'agenda', label: 'Agenda', icon: Calendar },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
      { id: 'profil', label: 'Profil', icon: User }
    ];
  } else if (['demo_school_primary_admin', 'demo_school_high_admin'].includes(demoProfileId)) {
    tabs = [
      { id: 'accueil', label: 'Dashboard', icon: Home },
      { id: 'listes', label: 'Présences', icon: ClipboardList },
      { id: 'sorties', label: 'Sorties', icon: Calendar },
      { id: 'pedagogie', label: 'Pédagogie', icon: GraduationCap }
    ];
  } else if (['demo_school_primary_teacher', 'demo_school_high_teacher'].includes(demoProfileId)) {
    tabs = [
      { id: 'accueil', label: 'Classe', icon: Home },
      { id: 'listes', label: 'Appel', icon: ClipboardList },
      { id: 'devoirs', label: 'Devoirs', icon: BookOpen },
      { id: 'sorties', label: 'Sorties', icon: PlusCircle },
      { id: 'messages', label: 'Parents', icon: MessageCircle }
    ];
  } else if (demoProfileId === 'demo_commune_admin') {
    tabs = [
      { id: 'accueil', label: 'Dashboard', icon: Home },
      { id: 'alertes', label: 'Alertes', icon: Megaphone },
      { id: 'evenements', label: 'Agenda', icon: Calendar },
      { id: 'sondages', label: 'Sondages', icon: Vote },
      { id: 'signalements', label: 'Signalements', icon: ClipboardList }
    ];
  } else if (demoProfileId === 'demo_commune_agent') {
    tabs = [
      { id: 'accueil', label: 'Interventions', icon: Home },
      { id: 'signalements', label: 'File Tâches', icon: ClipboardList },
      { id: 'performance', label: 'Rapports', icon: BarChart2 }
    ];
  }

  if (tabs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-2 md:px-8 max-w-7xl mx-auto pointer-events-none ios-safe-bottom-nav">
      <div className="glass-panel rounded-t-[32px] rounded-b-[24px] pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.5)] border-t border-white/10 px-4 py-2 flex items-center justify-around bg-[#081225]/90 backdrop-blur-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center space-y-1 py-1.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'text-[#6C5CFF] scale-105 font-bold' 
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">{tab.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[#6C5CFF] shadow-[0_0_8px_#6C5CFF]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 👦 ISSA - SPACE (CHILD MODE - 8 YEARS)
// ==========================================
interface DemoKidsDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoTasks: any[];
  setDemoTasks: React.SetStateAction<any>;
  demoPocketMoney: any[];
  setDemoPocketMoney: React.SetStateAction<any>;
  demoSchoolPresence: any;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.SetStateAction<any>;
  demoSchoolTrips: any[];
  setDemoSchoolTrips: React.SetStateAction<any>;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
}

export const DemoKidsDashboard: React.FC<DemoKidsDashboardProps> = ({
  activeTab,
  setActiveTab,
  demoTasks,
  setDemoTasks,
  demoPocketMoney,
  setDemoPocketMoney,
  demoSchoolPresence,
  demoSchoolHomework,
  setDemoSchoolHomework,
  demoSchoolTrips,
  setDemoSchoolTrips,
  triggerDemoNotification
}) => {
  const isPresent = demoSchoolPresence.demo_issa?.status === 'Présent';
  const myMoney = demoPocketMoney.find(p => p.id === 'demo_issa') || { balance: 25, points: 140 };

  const todayStr = new Date().toISOString().split('T')[0];
  const myTasks = demoTasks.filter(t => t.assignedMemberId === 'demo_issa' && (t.dueDate === todayStr || !t.done));
  const myHomework = demoSchoolHomework.filter(h => h.class === 'CE2');
  const myTrips = demoSchoolTrips.filter(t => t.school.includes('CE2') && (t.status === 'approved_parent' || t.status === 'validated_admin'));

  const [quizNum1, setQuizNum1] = useState(7);
  const [quizNum2, setQuizNum2] = useState(8);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [storyText, setStoryText] = useState('');

  const handleCompleteTask = (taskId: string) => {
    setDemoTasks((prev: any[]) => prev.map(t => {
      if (t.id === taskId) {
        if (!t.done) {
          setDemoPocketMoney((money: any[]) => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + t.rewardPoints } : m));
          if (triggerDemoNotification) {
            triggerDemoNotification(
              "🎯 Mission Complétée",
              `Issa Diop a terminé : "${t.title}". En attente de validation parentale pour obtenir +${t.rewardPoints} points !`,
              "taches"
            );
          }
        }
        return { ...t, done: true };
      }
      return t;
    }));
  };

  const handleToggleHomework = (hwId: string) => {
    setDemoSchoolHomework((prev: any[]) => prev.map(h => {
      if (h.id === hwId) {
        const nextDone = !h.done;
        if (triggerDemoNotification && nextDone) {
          triggerDemoNotification(
            "📚 Devoir Terminé",
            `Issa Diop a marqué fait le devoir de ${h.subject} : "${h.title}"`,
            "ecole"
          );
        }
        return { ...h, done: nextDone };
      }
      return h;
    }));
  };

  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = quizNum1 * quizNum2;
    if (parseInt(quizAnswer) === correct) {
      setQuizFeedback("🎉 BRAVO ! C'est la bonne réponse ! +10 points Étoile.");
      setDemoPocketMoney((money: any[]) => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + 10 } : m));
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "🎮 Quiz Réussi",
          "Issa Diop a résolu son quiz de calcul mental et a gagné +10 points !",
          "ecole"
        );
      }
      setTimeout(() => {
        const n1 = Math.floor(Math.random() * 5) + 5;
        const n2 = Math.floor(Math.random() * 9) + 2;
        setQuizNum1(n1);
        setQuizNum2(n2);
        setQuizAnswer('');
        setQuizFeedback('');
      }, 2000);
    } else {
      setQuizFeedback("❌ Oups, réessaye encore ! Tu vas y arriver.");
    }
  };

  const generateStory = (theme: string) => {
    setSelectedTheme(theme);
    let story = "";
    if (theme === 'espace') {
      story = "🚀 Issa enfile son scaphandre doré. Il monte à bord du vaisseau MaFamille+ et s'envole vers les étoiles ! Accompagné de son chien Toby et piloté par l'IA protectrice, il découvre une nouvelle planète faite entièrement de bonbons acidulés. Quelle aventure interstellaire !";
    } else if (theme === 'dinos') {
      story = "🦖 Issa traverse une porte temporelle et atterrit au jurassique. Un gentil tricératops lui propose de monter sur son dos pour faire la course contre un diplodocus géant. Issa rit aux éclats, c'est le plus beau safari préhistorique de Cormeilles-en-Parisis !";
    } else {
      story = "👑 Issa entre dans un château magique. Une fée lui remet la baguette de la sagesse et lui confie une quête : retrouver le grimoire des devoirs volé par le méchant dragon de la flemme. Issa réussit haut la main et ramène la paix au royaume.";
    }
    setStoryText(story);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto font-sans text-white">
      
      {/* HEADER HERO */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-3.5 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FFB020] to-[#00D26A] rounded-full blur-xl opacity-40 animate-pulse"></div>
          <div className="w-24 h-24 rounded-full border-4 border-[#FFB020] relative z-10 flex items-center justify-center bg-[#112240] text-5xl">
            👦
          </div>
          <div className="absolute -bottom-1 -right-1 bg-[#FFB020] text-[#07111F] font-black text-[10px] px-2.5 py-0.5 rounded-full border-2 border-white z-20">
            CE2 🏫
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Salut Issa ! ✌️</h1>
          <p className="text-xs text-white/60 mt-1">Espace Super-Héros connecté</p>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'accueil' && (
        <div className="space-y-5">
          {/* STATS STARS & POCKET MONEY */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="glass-panel border-[#FFB020]/25 bg-gradient-to-br from-[#FFB020]/10 to-transparent p-4 rounded-3xl flex flex-col items-center text-center space-y-1.5 bg-[#112240]/40">
              <Star className="w-8 h-8 text-[#FFB020] fill-[#FFB020] animate-bounce" />
              <div>
                <p className="text-xl font-black text-[#FFB020]">{myMoney.points}</p>
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Points Étoile</p>
              </div>
            </div>
            <div className="glass-panel border-[#00D26A]/25 bg-gradient-to-br from-[#00D26A]/10 to-transparent p-4 rounded-3xl flex flex-col items-center text-center space-y-1.5 bg-[#112240]/40">
              <Gift className="w-8 h-8 text-[#00D26A]" />
              <div>
                <p className="text-xl font-black text-[#00D26A]">{myMoney.balance.toFixed(2)} €</p>
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Argent de Poche</p>
              </div>
            </div>
          </div>

          {/* PRESENCE BADGE */}
          <div className={`glass-panel p-4 rounded-2xl flex items-center justify-between border ${
            isPresent ? 'border-[#00D26A]/25 bg-[#00D26A]/5' : 'border-red-500/25 bg-red-500/5'
          }`}>
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-xl">{isPresent ? '✅' : '⏳'}</span>
              <div>
                <h4 className="font-bold text-white">Ma Journée à l'École</h4>
                <p className="text-[10px] text-white/50 font-medium">
                  {isPresent ? 'Marqué présent par le maître ce matin.' : 'L\'appel de classe n\'a pas encore été fait.'}
                </p>
              </div>
            </div>
            <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              isPresent ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-red-500/20 text-red-500'
            }`}>
              {isPresent ? 'Présent' : 'Non marqué'}
            </span>
          </div>

          {/* SCHOOL TRIPS */}
          {myTrips.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🚌 Mes sorties scolaires</h3>
              {myTrips.map(t => (
                <div key={t.id} className="glass-panel p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
                  <div className="text-xs space-y-0.5">
                    <h4 className="font-bold text-white">{t.title}</h4>
                    <p className="text-[10px] text-white/50">{t.date} • {t.description}</p>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Autorisé</span>
                </div>
              ))}
            </div>
          )}

          {/* MISSION PREVIEW */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🎯 Mes Missions d'aujourd'hui</h3>
            <div className="space-y-2.5">
              {myTasks.length > 0 ? (
                myTasks.map(t => (
                  <div key={t.id} className={`glass-panel p-4 rounded-2xl flex items-center justify-between border ${
                    t.done ? 'border-[#00D26A]/20 bg-[#00D26A]/5 opacity-60' : 'border-[#6C5CFF]/20 bg-white/5'
                  }`}>
                    <div>
                      <h4 className={`text-xs font-bold text-white ${t.done ? 'line-through text-white/40' : ''}`}>{t.title}</h4>
                      <p className="text-[10px] text-[#FFB020] font-bold mt-0.5">+{t.rewardPoints} Pts</p>
                    </div>
                    {!t.done ? (
                      <button
                        onClick={() => handleCompleteTask(t.id)}
                        className="p-2 bg-[#00D26A] text-[#07111F] rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer shadow-md"
                      >
                        ✓ Fait
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-md border border-[#00D26A]/20">Fait !</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-white/5 border border-white/5 text-center text-xs text-white/40 rounded-2xl">Aucune mission assignée.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ecole' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Mes devoirs de CE2</h3>
            <div className="space-y-2.5">
              {myHomework.length > 0 ? (
                myHomework.map(hw => (
                  <button
                    key={hw.id}
                    onClick={() => handleToggleHomework(hw.id)}
                    className="w-full text-left p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-1 pr-3">
                      <span className="text-[9px] bg-[#6C5CFF]/20 border border-[#6C5CFF]/30 text-[#9E94FF] px-2 py-0.5 rounded font-extrabold uppercase">
                        {hw.subject}
                      </span>
                      <h4 className={`text-xs font-bold mt-1 text-white ${hw.done ? 'line-through text-white/40' : ''}`}>{hw.title}</h4>
                      <span className="text-[9px] text-white/30 block font-semibold">Pour : {hw.dueDate}</span>
                    </div>
                    <div className={`p-2 rounded-xl transition ${hw.done ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-white/5 text-white/20'}`}>
                      <Check className="w-4 h-4" />
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-xs text-white/45 text-center">Aucun devoir à faire.</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🕒 Emploi du Temps</h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-bold text-[#FFB020]">08h30 - 10h00</span>
                <span className="text-white/70">Calcul & Problèmes</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-bold text-[#FFB020]">10h15 - 11h45</span>
                <span className="text-white/70">Français (Lecture)</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-bold text-[#FFB020]">13h30 - 15h00</span>
                <span className="text-white/70">Sport (Stade municipal)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recompenses' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl text-center space-y-2.5 bg-[#112240]/40">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">Mon Trésor de Points</h4>
            <div className="flex items-center justify-center space-x-1.5">
              <Star className="w-7 h-7 text-[#FFB020] fill-[#FFB020]" />
              <span className="text-3xl font-black text-[#FFB020]">{myMoney.points} Pts</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🎁 Récompenses disponibles</h3>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { title: "🎬 Aller au cinéma en famille", cost: 200, emoji: "🍿" },
                { title: "🎮 1 heure de console", cost: 100, emoji: "🕹️" },
                { title: "📖 Choisir une BD à la librairie", cost: 150, emoji: "📚" }
              ].map((rec, idx) => {
                const canUnlock = myMoney.points >= rec.cost;
                return (
                  <div key={idx} className={`glass-panel p-4 rounded-2xl flex items-center justify-between border ${
                    canUnlock ? 'border-[#FFB020]/25 bg-white/5' : 'border-white/5 opacity-50'
                  }`}>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-2xl">{rec.emoji}</span>
                      <div>
                        <h4 className="font-bold text-white">{rec.title}</h4>
                        <p className="text-[10px] text-white/55">Coût : {rec.cost} points Étoile</p>
                      </div>
                    </div>
                    <button
                      disabled={!canUnlock}
                      onClick={() => {
                        setDemoPocketMoney((money: any[]) => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points - rec.cost } : m));
                        alert(`🎁 Récompense débloquée ! Amuse-toi bien !`);
                        if (triggerDemoNotification) {
                          triggerDemoNotification(
                            "🎁 Récompense débloquée",
                            `Issa Diop a réclamé sa récompense : "${rec.title}" (-${rec.cost} Pts)`,
                            "taches"
                          );
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition active:scale-95 ${
                        canUnlock ? 'bg-[#FFB020] text-[#07111F]' : 'bg-white/5 text-white/20'
                      }`}
                    >
                      Acheter
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activites' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🎮</span>
              <span>Calcul Mental Super-Héros</span>
            </h3>
            <p className="text-[10px] text-white/55">Trouve la bonne réponse pour gagner +10 points Étoile !</p>
            
            <form onSubmit={handleSubmitQuiz} className="space-y-3 pt-2">
              <div className="flex items-center justify-center space-x-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-2xl font-black text-[#FFB020]">
                <span>{quizNum1}</span>
                <span>×</span>
                <span>{quizNum2}</span>
                <span>=</span>
                <input
                  type="number"
                  required
                  placeholder="?"
                  value={quizAnswer}
                  onChange={(e) => setQuizAnswer(e.target.value)}
                  className="w-16 bg-[#07111F] text-center border-2 border-white/20 rounded-xl px-2 py-1 focus:outline-none focus:border-[#FFB020] text-2xl text-[#FFB020]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5849E0] text-white font-extrabold text-xs uppercase tracking-wider shadow-md cursor-pointer transition"
              >
                Vérifier ma réponse
              </button>
              {quizFeedback && (
                <p className="text-center text-xs font-extrabold text-white bg-white/5 p-2 rounded-lg animate-pulse">
                  {quizFeedback}
                </p>
              )}
            </form>
          </div>

          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📖</span>
              <span>Conteur Magique IA</span>
            </h3>
            <p className="text-[10px] text-white/55">Sélectionne un thème pour écouter l'assistant IA raconter une histoire avec toi.</p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { id: 'espace', label: '🚀 Espace', color: 'border-blue-500/30' },
                { id: 'dinos', label: '🦖 Dinos', color: 'border-green-500/30' },
                { id: 'magic', label: '🏰 Magie', color: 'border-pink-500/30' }
              ].map(theme => (
                <button
                  key={theme.id}
                  onClick={() => generateStory(theme.id)}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                    selectedTheme === theme.id 
                      ? 'bg-[#6C5CFF] border-[#6C5CFF] text-white font-black' 
                      : `bg-white/5 hover:bg-white/8 text-white/70 ${theme.color}`
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            {storyText && (
              <div className="bg-[#07111F]/50 border border-white/5 p-4 rounded-2xl text-xs leading-relaxed font-sans text-white/80 animate-fade-in relative mt-3 shadow-inner">
                <span className="text-lg block mb-1">🤖 Récit de l'Assistant :</span>
                {storyText}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profil' && (
        <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4 bg-[#112240]/40">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Mon Profil Élève</h3>
          <div className="space-y-3.5 text-xs font-medium font-sans">
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-white/60">Nom complet</span>
              <span className="font-bold text-white">Issa Diop</span>
            </div>
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-white/60">Âge</span>
              <span className="font-bold text-white">8 ans</span>
            </div>
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-white/60">Classe</span>
              <span className="font-bold text-white">CE2 (École Victor Hugo)</span>
            </div>
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-white/60">Enseignant Principal</span>
              <span className="font-bold text-[#FFB020]">M. Bernard (CE2)</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// 👧 LYNA - SPACE (TEEN DASHBOARD - 16 YEARS)
// ==========================================
interface DemoTeenDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.SetStateAction<any>;
  demoSchoolComms: any[];
  demoVaccines: any[];
  demoSchoolTrips: any[];
  setDemoSchoolTrips: React.SetStateAction<any>;
  demoTeacherParentMessages: any[];
  setDemoTeacherParentMessages: React.SetStateAction<any>;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
}

export const DemoTeenDashboard: React.FC<DemoTeenDashboardProps> = ({
  activeTab,
  setActiveTab,
  demoSchoolHomework,
  setDemoSchoolHomework,
  demoSchoolComms,
  demoVaccines,
  demoSchoolTrips,
  setDemoSchoolTrips,
  demoTeacherParentMessages,
  setDemoTeacherParentMessages,
  triggerDemoNotification
}) => {
  const myHomework = demoSchoolHomework.filter(h => h.class === 'Première');
  const myComms = demoSchoolComms;
  const myTrips = demoSchoolTrips.filter(t => t.school.includes('1ère') && (t.status === 'approved_parent' || t.status === 'validated_admin'));
  const myVaccine = demoVaccines.find(v => v.memberId === 'demo_lyna') || { name: 'ROR', date: '2026-06-20', status: 'À faire' };

  const handleToggleHomework = (hwId: string) => {
    setDemoSchoolHomework((prev: any[]) => prev.map(h => {
      if (h.id === hwId) {
        const nextDone = !h.done;
        if (triggerDemoNotification && nextDone) {
          triggerDemoNotification(
            "📚 Devoir Terminé",
            `Lyna Diop a marqué comme fait le devoir de ${h.subject} : "${h.title}"`,
            "ecole"
          );
        }
        return { ...h, done: nextDone };
      }
      return h;
    }));
  };

  const [teacherMsgInput, setTeacherMsgInput] = useState('');
  // Filter messages between Lyna's teacher (Mme Leroy) and Lyna
  const lynaMessages = demoTeacherParentMessages.filter(
    m => (m.senderId === 'demo_school_high_teacher' && m.receiverId === 'demo_lyna') ||
         (m.senderId === 'demo_lyna' && m.receiverId === 'demo_school_high_teacher')
  );

  const handleSendTeacherMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherMsgInput.trim()) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];
    const newMsg = {
      id: `tm-dynamic-${Date.now()}`,
      senderId: 'demo_lyna',
      senderName: 'Lyna Diop',
      receiverId: 'demo_school_high_teacher',
      receiverName: 'Mme Leroy',
      content: teacherMsgInput.trim(),
      timestamp: time,
      date: dateStr,
      read: true
    };

    setDemoTeacherParentMessages((prev: any[]) => [...prev, newMsg]);
    setTeacherMsgInput('');

    // Teacher auto response
    setTimeout(() => {
      const autoResponse = { 
        id: `tm-dynamic-reply-${Date.now()}`,
        senderId: 'demo_school_high_teacher',
        senderName: 'Mme Leroy',
        receiverId: 'demo_lyna',
        receiverName: 'Lyna Diop',
        content: "Bonjour Lyna, bien reçu. Continue ainsi, ton travail sur le commentaire est très prometteur. Bon courage !",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: dateStr,
        read: false
      };
      setDemoTeacherParentMessages((prev: any[]) => [...prev, autoResponse]);
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "💬 Nouveau Message",
          `Mme Leroy (Prof. Principal) a envoyé un message à Lyna Diop.`,
          "chat"
        );
      }
    }, 1500);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto font-sans text-white">
      
      {/* HEADER HERO */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-3 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] rounded-full blur-xl opacity-40 animate-pulse"></div>
          <div className="w-24 h-24 rounded-full border-4 border-[#6C5CFF] relative z-10 flex items-center justify-center bg-[#112240] text-5xl">
            👧
          </div>
          <div className="absolute -bottom-1 -right-1 bg-[#6C5CFF] text-white font-black text-[10px] px-2.5 py-0.5 rounded-full border-2 border-white z-20">
            Première 🎓
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Bonjour Lyna ! ✨</h1>
          <p className="text-xs text-white/50 mt-1">Lycée Simone Veil (Première)</p>
        </div>
      </div>

      {activeTab === 'accueil' && (
        <div className="space-y-4">
          {/* GRADES PREVIEW */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📈 Dernières Notes</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span>Français (Phèdre Racine)</span>
                <span className="font-mono font-bold bg-[#00D26A]/20 text-[#00D26A] px-2 py-0.5 rounded-md">15 / 20</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span>Physique (TP Optique)</span>
                <span className="font-mono font-bold bg-[#00D26A]/20 text-[#00D26A] px-2 py-0.5 rounded-md">14 / 20</span>
              </div>
            </div>
          </div>

          {/* HOMEWORK SUMMARY */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">⏳ Devoirs du jour</h3>
            <div className="space-y-2.5">
              {myHomework.slice(0, 2).map(hw => (
                <div key={hw.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className={`${hw.done ? 'line-through text-white/40' : 'text-white'}`}>{hw.title}</span>
                  <span className="text-[10px] text-[#6C5CFF] font-bold">{hw.subject}</span>
                </div>
              ))}
            </div>
          </div>

          {/* LYCEE NEWS */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📢 Actualités Lycée Simone Veil</h3>
            {myComms.map(c => (
              <div key={c.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                <span className="font-extrabold text-[#6C5CFF] text-[9px] uppercase tracking-wider">{c.sender}</span>
                <p className="text-white/70 font-sans leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ecole' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Cahier de textes</h3>
            <div className="space-y-2.5">
              {myHomework.map(hw => (
                <button
                  key={hw.id}
                  onClick={() => handleToggleHomework(hw.id)}
                  className="w-full text-left p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-1 pr-3">
                    <span className="text-[9px] bg-[#6C5CFF]/20 border border-[#6C5CFF]/30 text-[#9E94FF] px-2 py-0.5 rounded font-extrabold uppercase">
                      {hw.subject}
                    </span>
                    <h4 className={`text-xs font-bold mt-1 text-white ${hw.done ? 'line-through text-white/40' : ''}`}>{hw.title}</h4>
                    <span className="text-[9px] text-white/30 block font-semibold">Pour : {hw.dueDate}</span>
                  </div>
                  <div className={`p-2 rounded-xl transition ${hw.done ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-white/5 text-white/20'}`}>
                     <Check className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PARCOURSUP ORIENTATION */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-gradient-to-r from-[#6C5CFF]/15 to-transparent">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🧭</span>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Orientation & Parcoursup</h3>
            </div>
            <p className="text-[10px] text-white/55 leading-relaxed font-sans">Préparez vos projets de Première et découvrez les spécialités de Terminale.</p>
            
            <div className="space-y-2.5 pt-2 font-sans text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span>Régler les spécialités de Terminale</span>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">En réflexion</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span>Découvrir les formations (Portes Ouvertes)</span>
                <span className="text-[9px] font-bold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-full">Fait</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agenda' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📅 Emploi du temps Simone Veil</h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="p-3.5 rounded-xl bg-white/5 border-l-4 border-[#6C5CFF] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">08h30 - 10h30 : Français (Bac)</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Mme Leroy • Salle 102</p>
                </div>
                <span className="text-[9px] font-bold bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/25 px-2 py-0.5 rounded">Cours</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border-l-4 border-emerald-500 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">10h45 - 12h45 : Physique-Chimie</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">M. Martin • Labo 30</p>
                </div>
                <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 py-0.5 rounded">TP</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border-l-4 border-[#FF4D6D] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">14h00 - 16h00 : Espagnol LV2</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Mme Lopez • Salle 204</p>
                </div>
                <span className="text-[9px] font-bold bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/25 px-2 py-0.5 rounded">Cours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="glass-panel p-4 border-white/8 rounded-3xl space-y-4 flex flex-col h-[400px] bg-[#112240]/40">
          <div className="border-b border-white/5 pb-2 text-center">
            <h4 className="text-xs font-bold text-white">💬 Discussion avec Mme Leroy (Prof. Principal)</h4>
            <p className="text-[9px] text-white/50">Lycée Simone Veil • Classe de Première</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans text-xs">
            {lynaMessages.length > 0 ? (
              lynaMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    msg.senderId === 'demo_lyna'
                      ? 'ml-auto bg-gradient-to-r from-[#6C5CFF] to-[#8B5CF6] text-white rounded-tr-sm'
                      : 'bg-white/5 border border-white/10 text-white rounded-tl-sm'
                  }`}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                  <span className="text-[8px] text-white/40 block text-right mt-1 font-semibold">{msg.timestamp}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-white/30 py-8">Aucun message échangé. Envoyez un premier message !</div>
            )}
          </div>

          <form onSubmit={handleSendTeacherMsg} className="flex items-center space-x-2 pt-2 border-t border-white/5">
            <input
              type="text"
              placeholder="Écrire un message à Mme Leroy..."
              value={teacherMsgInput}
              onChange={(e) => setTeacherMsgInput(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF] transition-all font-sans"
            />
            <button
              type="submit"
              className="p-3 bg-[#6C5CFF] text-white rounded-xl transition active:scale-95 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'profil' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Carnet de Santé & Urgence</h3>
            <div className="space-y-3 text-xs font-sans">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span className="text-white/60">Groupe Sanguin</span>
                <span className="font-bold text-white">AB+</span>
              </div>
              
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 space-y-1.5">
                <div className="flex items-center space-x-2 text-red-400">
                  <ShieldAlert className="w-4.5 h-4.5" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Rappel Médical</span>
                </div>
                <p className="text-[10px] text-white/70 leading-relaxed font-sans">
                  Le vaccin **{myVaccine.name}** est planifié. Date préconisée : **{myVaccine.date}**.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// 🏫 SCHOOL PORTAL (Direction / Enseignants)
// ==========================================
interface DemoSchoolSpaceProps {
  demoProfileId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoSchoolPresence: any;
  setDemoSchoolPresence: React.Dispatch<React.SetStateAction<any>>;
  demoSchoolPresenceHistory: any[];
  setDemoSchoolPresenceHistory: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolCantine: any;
  setDemoSchoolCantine: React.Dispatch<React.SetStateAction<any>>;
  demoSchoolCantineHistory: any[];
  setDemoSchoolCantineHistory: React.Dispatch<React.SetStateAction<any[]>>;
  demoTransactions: any[];
  setDemoTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolComms: any[];
  setDemoSchoolComms: React.Dispatch<React.SetStateAction<any[]>>;
  demoTeacherParentMessages: any[];
  setDemoTeacherParentMessages: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolTrips: any[];
  setDemoSchoolTrips: React.Dispatch<React.SetStateAction<any[]>>;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
  onBack: () => void;
}

export const DemoSchoolSpace: React.FC<DemoSchoolSpaceProps> = ({
  demoProfileId,
  activeTab,
  setActiveTab,
  demoSchoolPresence,
  setDemoSchoolPresence,
  demoSchoolPresenceHistory,
  setDemoSchoolPresenceHistory,
  demoSchoolCantine,
  setDemoSchoolCantine,
  demoSchoolCantineHistory,
  setDemoSchoolCantineHistory,
  demoTransactions,
  setDemoTransactions,
  demoSchoolHomework,
  setDemoSchoolHomework,
  demoSchoolComms,
  setDemoSchoolComms,
  demoTeacherParentMessages,
  setDemoTeacherParentMessages,
  demoSchoolTrips,
  setDemoSchoolTrips,
  triggerDemoNotification,
  onBack
}) => {
  const isPrimary = demoProfileId.includes('primary');
  const isAdmin = demoProfileId.includes('admin');
  const currentSchoolName = isPrimary ? "École Victor Hugo" : "Lycée Simone Veil";
  const activeClass = isPrimary ? "CE2" : "Première";
  const roster = isPrimary ? CE2_ROSTER : PREMIERE_ROSTER;

  // --- STATS COMPUTATIONS ---
  const totalStudents = roster.length;
  // Calculate attendance rate dynamically based on present students today
  const markedPresentCount = roster.filter(student => demoSchoolPresence[student.id]?.status === 'Présent').length;
  const markedAbsentCount = roster.filter(student => demoSchoolPresence[student.id]?.status === 'Absent').length;
  const markedLateCount = roster.filter(student => demoSchoolPresence[student.id]?.status === 'Retard').length;
  const nonMarkedCount = totalStudents - (markedPresentCount + markedAbsentCount + markedLateCount);
  
  const todayAttendanceRate = totalStudents > 0 
    ? (((markedPresentCount + markedLateCount) / (totalStudents - nonMarkedCount || 1)) * 100).toFixed(1)
    : '100';

  // --- DIRECTION ACTIONS ---
  const [newAnnounceText, setNewAnnounceText] = useState('');
  
  const handleCreateAnnounce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceText.trim()) return;

    const newComm = {
      id: `dcm-${Date.now()}`,
      content: newAnnounceText.trim(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      sender: isAdmin ? `Direction - ${currentSchoolName}` : `Enseignant ${activeClass}`
    };

    setDemoSchoolComms(prev => [newComm, ...prev]);
    setNewAnnounceText('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🏫 Nouvelle Annonce Scolaire",
        `${newComm.sender} : "${newComm.content}"`,
        "ecole"
      );
    }
    alert("📢 Annonce publiée avec succès !");
  };

  const handleValidateTrip = (tripId: string) => {
    setDemoSchoolTrips(prev => prev.map(t => {
      if (t.id === tripId) {
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "🚌 Sortie Scolaire Validée",
            `La sortie "${t.title}" a été validée par la direction. Autorisation requise chez les parents.`,
            "ecole"
          );
        }
        return { ...t, status: 'pending_parent' };
      }
      return t;
    }));
    alert("✅ Sortie validée ! Elle est désormais soumise à l'autorisation des parents.");
  };

  const handleDeleteAnnounce = (id: string) => {
    setDemoSchoolComms(prev => prev.filter(c => c.id !== id));
  };

  // --- TEACHER ACTIONS ---
  const [hwSubject, setHwSubject] = useState('');
  const [hwTitle, setHwTitle] = useState('');

  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwSubject.trim() || !hwTitle.trim()) return;

    const newHw = {
      id: `dh-${Date.now()}`,
      subject: hwSubject.trim(),
      title: hwTitle.trim(),
      class: activeClass,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      done: false
    };

    setDemoSchoolHomework(prev => [newHw, ...prev]);
    setHwSubject('');
    setHwTitle('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "📚 Nouveau Devoir",
        `M. Bernard / Mme Leroy a assigné un devoir en ${newHw.subject} pour la classe de ${activeClass}`,
        "ecole"
      );
    }
    alert("📚 Devoir assigné aux élèves !");
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const title = prompt("Titre de la sortie scolaire :");
    if (!title) return;
    const desc = prompt("Description / Destination :");
    if (!desc) return;
    const cost = parseFloat(prompt("Coût de la sortie (€) :") || '0');

    const newTrip = {
      id: `st-${Date.now()}`,
      school: currentSchoolName + ` (${activeClass})`,
      title,
      description: desc,
      date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      cost,
      status: 'pending_validation',
      parentPermission: false,
      paid: false
    };

    setDemoSchoolTrips(prev => [newTrip, ...prev]);
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🚌 Sortie Scolaire Proposée",
        `Nouvelle sortie créée par l'enseignant: "${title}". En attente de validation de la direction.`,
        "ecole"
      );
    }
    alert("🚌 Sortie créée ! En attente de validation par la directrice/proviseure.");
  };

  const handleMarkPresence = (studentId: string, status: 'Présent' | 'Absent' | 'Retard') => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setDemoSchoolPresence((prev: any) => ({
      ...prev,
      [studentId]: { status, time }
    }));

    if (studentId === 'demo_issa' || studentId === 'demo_lyna') {
      const studentName = studentId === 'demo_issa' ? 'Issa Diop' : 'Lyna Diop';
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "🏫 Appel Scolaire",
          `${studentName} marqué ${status} à ${time}.`,
          "ecole"
        );
      }
    }
  };

  // --- TEACHER MESSAGING ---
  const [parentChatMsg, setParentChatMsg] = useState('');
  const chatStudentId = isPrimary ? 'demo_issa' : 'demo_lyna';
  const chatStudentName = isPrimary ? 'Issa Diop' : 'Lyna Diop';
  
  const classMessages = demoTeacherParentMessages.filter(
    m => (m.senderId === demoProfileId && m.receiverId === 'demo_papa') ||
         (m.senderId === 'demo_papa' && m.receiverId === demoProfileId)
  );

  const handleSendParentMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentChatMsg.trim()) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];
    const newMsg = {
      id: `tm-dynamic-${Date.now()}`,
      senderId: demoProfileId,
      senderName: isPrimary ? 'M. Bernard' : 'Mme Leroy',
      receiverId: 'demo_papa',
      receiverName: 'Mamadou Diop',
      content: parentChatMsg.trim(),
      timestamp: time,
      date: dateStr,
      read: true
    };

    setDemoTeacherParentMessages(prev => [...prev, newMsg]);
    setParentChatMsg('');

    setTimeout(() => {
      const reply = {
        id: `tm-dynamic-reply-${Date.now()}`,
        senderId: 'demo_papa',
        senderName: 'Mamadou Diop',
        receiverId: demoProfileId,
        receiverName: isPrimary ? 'M. Bernard' : 'Mme Leroy',
        content: "Merci beaucoup pour ces précisions, c'est très clair !",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: dateStr,
        read: false
      };
      setDemoTeacherParentMessages(prev => [...prev, reply]);
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "💬 Nouveau Message",
          "M. Diop (Papa) a répondu à l'enseignant.",
          "chat"
        );
      }
    }, 1500);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto font-sans text-white">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">{currentSchoolName}</h1>
            <p className="text-xs text-white/50 font-medium">Espace {isAdmin ? "Administration" : `Enseignant (${activeClass})`}</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase bg-[#00D26A]/10 border border-[#00D26A]/25 text-[#00D26A] px-3.5 py-1.5 rounded-full tracking-wider">
          {isAdmin ? '🏫 DIRECTION' : '👨‍🏫 ENSEIGNANT'}
        </span>
      </div>

      {/* ====================================================
          A. ADMIN SPACE (Directrice Mme Martin / Proviseure Mme Dubois)
          ==================================================== */}
      {isAdmin && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* STATS ROSTER */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Effectif total</span>
                  <p className="text-2xl font-black text-white">{totalStudents} élèves</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Taux Présence (appel)</span>
                  <p className="text-2xl font-black text-[#00D26A]">{nonMarkedCount === totalStudents ? '--' : `${todayAttendanceRate}%`}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Absences du jour</span>
                  <p className="text-2xl font-black text-red-400">{markedAbsentCount}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Retards du jour</span>
                  <p className="text-2xl font-black text-[#FFB020]">{markedLateCount}</p>
                </div>
              </div>

              {/* CRUD COMMS / NEWS SECTION */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📢 Publier une actualité / communication aux parents</h3>
                <form onSubmit={handleCreateAnnounce} className="space-y-3">
                  <textarea
                    placeholder="Contenu du message d'information..."
                    required
                    rows={3}
                    value={newAnnounceText}
                    onChange={(e) => setNewAnnounceText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00D26A] font-sans text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#00D26A] text-[#07111F] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Diffuser l'annonce</span>
                  </button>
                </form>

                {/* Comms List */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h4 className="text-[10px] font-black uppercase text-white/45 tracking-widest">Historique des annonces</h4>
                  {demoSchoolComms.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {demoSchoolComms.map(c => (
                        <div key={c.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-start">
                          <div className="space-y-1 pr-3">
                            <span className="font-extrabold text-[#00D26A] text-[9px] uppercase">{c.sender} • {c.date} {c.time}</span>
                            <p className="text-white/80 font-sans">{c.content}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteAnnounce(c.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 text-center">Aucune annonce diffusée.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Registre des absences & retards ({activeClass})</h3>
              <div className="space-y-2">
                {roster.map(student => {
                  const state = demoSchoolPresence[student.id] || { status: 'Non fait', time: '' };
                  return (
                    <div key={student.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans">
                      <div>
                        <h4 className="font-bold text-white">{student.name}</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {state.time ? `Enregistré à ${state.time}` : 'Aucun enregistrement'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        state.status === 'Présent' 
                          ? 'bg-[#00D26A]/10 text-[#00D26A]' 
                          : state.status === 'Absent' 
                            ? 'bg-red-500/10 text-red-400' 
                            : state.status === 'Retard'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-white/10 text-white/50'
                      }`}>
                        {state.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'sorties' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">🚌 Validation des sorties scolaires</h3>
              <div className="space-y-3">
                {demoSchoolTrips.filter(t => t.school.includes(activeClass)).map(trip => (
                  <div key={trip.id} className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white">{trip.title}</h4>
                      <p className="text-[10px] text-white/50">{trip.date} • {trip.description} • Coût: {trip.cost} €</p>
                      <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md mt-1 border ${
                        trip.status === 'validated_admin' 
                          ? 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/30'
                          : trip.status === 'pending_parent'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {trip.status === 'validated_admin' ? 'Clôturée' : trip.status === 'pending_parent' ? 'En attente parents' : 'En attente validation direction'}
                      </span>
                    </div>
                    {trip.status === 'pending_validation' && (
                      <button
                        onClick={() => handleValidateTrip(trip.id)}
                        className="px-3 py-2 bg-[#00D26A] text-[#07111F] rounded-xl text-xs font-extrabold shadow cursor-pointer transition active:scale-95"
                      >
                        Valider la sortie
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pedagogie' && (
            <div className="space-y-6">
              {/* HIGH SCHOOL PARCOURSUP OR GRADE STATISTICS */}
              {!isPrimary && (
                <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🧭 Suivi Orientation Parcoursup</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center space-y-1">
                      <span className="text-white/40 block text-[9px]">Dossiers créés</span>
                      <strong className="text-xl text-white">30 / 30 élèves</strong>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center space-y-1">
                      <span className="text-white/40 block text-[9px]">Vœux confirmés</span>
                      <strong className="text-xl text-emerald-400">92%</strong>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center space-y-1">
                      <span className="text-white/40 block text-[9px]">Avis académiques</span>
                      <strong className="text-xl text-[#6C5CFF]">Saisis</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📚 Travail & devoirs assignés ({activeClass})</h3>
                <div className="space-y-3">
                  {demoSchoolHomework.filter(h => h.class === activeClass).map(h => (
                    <div key={h.id} className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans">
                      <div>
                        <span className="text-[9px] bg-[#6C5CFF]/20 border border-[#6C5CFF]/30 text-[#9E94FF] px-2 py-0.5 rounded font-extrabold uppercase">
                          {h.subject}
                        </span>
                        <h4 className="font-bold text-white mt-1.5">{h.title}</h4>
                        <span className="text-[9px] text-white/40 block mt-0.5">Échéance : {h.dueDate}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        h.done ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-amber-500/10 text-amber-400'
                      }`}>{h.done ? 'Terminé (Issa/Lyna)' : 'En cours'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ====================================================
          B. TEACHER SPACE (M. Bernard CE2 / Mme Leroy 1ère)
          ==================================================== */}
      {!isAdmin && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* TEACHER METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Classe en charge</span>
                  <p className="text-xl font-black text-white">{activeClass}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Appel du jour</span>
                  <p className="text-xl font-black text-[#00D26A]">
                    {nonMarkedCount === totalStudents ? 'À faire ⏳' : `${markedPresentCount} / ${totalStudents} présents`}
                  </p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Devoirs actifs</span>
                  <p className="text-xl font-black text-[#6C5CFF]">{demoSchoolHomework.filter(h => h.class === activeClass).length}</p>
                </div>
              </div>

              {/* TIMETABLE */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📅 Mon programme de cours (Aujourd'hui)</h4>
                <div className="space-y-2.5 text-xs font-sans">
                  <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                    <span className="font-bold text-[#00D26A]">08h30 - 10h00</span>
                    <span>Français (Lecture & Grammaire)</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                    <span className="font-bold text-[#00D26A]">10h15 - 11h45</span>
                    <span>Calcul mental & Problèmes</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                    <span className="font-bold text-[#00D26A]">13h30 - 15h00</span>
                    <span>Géographie & Cartographie</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Faire l'appel ({activeClass})</h3>
                <span className="text-[10px] text-white/40">{totalStudents} élèves enregistrés</span>
              </div>

              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {roster.map(student => {
                  const state = demoSchoolPresence[student.id] || { status: 'Non fait', time: '' };
                  return (
                    <div key={student.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center font-sans text-xs">
                      <div>
                        <h4 className="font-bold text-white">{student.name}</h4>
                        <p className="text-[9px] text-white/40">{state.time ? `Marqué à ${state.time}` : 'En attente'}</p>
                      </div>
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => handleMarkPresence(student.id, 'Présent')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold cursor-pointer transition active:scale-95 ${
                            state.status === 'Présent' ? 'bg-[#00D26A] text-[#07111F]' : 'bg-white/5 text-white/60 border border-white/10'
                          }`}
                        >
                          Présent
                        </button>
                        <button
                          onClick={() => handleMarkPresence(student.id, 'Absent')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold cursor-pointer transition active:scale-95 ${
                            state.status === 'Absent' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/60 border border-white/10'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleMarkPresence(student.id, 'Retard')}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold cursor-pointer transition active:scale-95 ${
                            state.status === 'Retard' ? 'bg-[#FF9F1C] text-[#07111F]' : 'bg-white/5 text-white/60 border border-white/10'
                          }`}
                        >
                          Retard
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'devoirs' && (
            <div className="space-y-4">
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📚 Assigner de nouveaux devoirs ({activeClass})</h3>
                <form onSubmit={handleAddHomework} className="space-y-4 text-xs font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Matière</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Mathématiques"
                        value={hwSubject}
                        onChange={(e) => setHwSubject(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00D26A]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Consigne</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Résoudre l'exercice 4 page 12"
                        value={hwTitle}
                        onChange={(e) => setHwTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00D26A]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#00D26A] text-[#07111F] font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Publier le devoir
                  </button>
                </form>
              </div>

              {/* Homework List */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Devoirs publiés</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {demoSchoolHomework.filter(h => h.class === activeClass).map(h => (
                    <div key={h.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center font-sans">
                      <div>
                        <span className="font-bold text-[#00D26A]">{h.subject}</span>
                        <p className="text-white/80 mt-1">{h.title}</p>
                      </div>
                      <span className="text-[9px] text-white/40 font-semibold">Pour : {h.dueDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sorties' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🚌 Sorties scolaires planifiées</h3>
                <button
                  onClick={handleCreateTrip}
                  className="px-3 py-1.5 bg-[#00D26A] text-[#07111F] rounded-lg text-[10px] font-extrabold transition active:scale-95 cursor-pointer"
                >
                  + Nouvelle Sortie
                </button>
              </div>

              <div className="space-y-3 font-sans text-xs">
                {demoSchoolTrips.filter(t => t.school.includes(activeClass)).map(trip => (
                  <div key={trip.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white">{trip.title}</h4>
                        <p className="text-[10px] text-white/50">{trip.date} • {trip.description}</p>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                        trip.status === 'validated_admin' 
                          ? 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/30'
                          : trip.status === 'pending_parent'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {trip.status === 'validated_admin' ? 'Validé par Mairie' : trip.status === 'pending_parent' ? 'Attente parents' : 'Attente Directrice'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="glass-panel p-4 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 flex flex-col h-[400px]">
              <div className="border-b border-white/5 pb-2 text-center">
                <h4 className="text-xs font-bold text-white">💬 Messagerie avec les Parents ({chatStudentName})</h4>
                <p className="text-[9px] text-white/50">Canal de messagerie sécurisé MaFamille+</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans text-xs">
                {classMessages.length > 0 ? (
                  classMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[75%] p-3 rounded-2xl ${
                        msg.senderId === demoProfileId
                          ? 'ml-auto bg-gradient-to-r from-[#00D26A] to-emerald-500 text-[#07111F] rounded-tr-sm font-semibold'
                          : 'bg-white/5 border border-white/10 text-white rounded-tl-sm'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.content}</p>
                      <span className={`text-[8px] block text-right mt-1 ${
                        msg.senderId === demoProfileId ? 'text-[#07111F]/65' : 'text-white/40'
                      }`}>{msg.timestamp}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-white/30 py-8">Aucun message. Entamez la discussion !</div>
                )}
              </div>

              <form onSubmit={handleSendParentMsg} className="flex items-center space-x-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  placeholder={`Répondre aux parents de ${chatStudentName}...`}
                  value={parentChatMsg}
                  onChange={(e) => setParentChatMsg(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D26A] transition-all font-sans"
                />
                <button
                  type="submit"
                  className="p-3 bg-[#00D26A] text-[#07111F] rounded-xl transition active:scale-95 cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </>
      )}

    </div>
  );
};

// ==========================================
// 🏛️ PORTAL COMMUNE (Maire / Agent Municipal)
// ==========================================
interface DemoCommuneSpaceProps {
  demoProfileId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoCommuneAlerts: any[];
  setDemoCommuneAlerts: React.Dispatch<React.SetStateAction<any[]>>;
  demoCommuneNews: any[];
  setDemoCommuneNews: React.Dispatch<React.SetStateAction<any[]>>;
  demoCommuneEvents: any[];
  setDemoCommuneEvents: React.Dispatch<React.SetStateAction<any[]>>;
  demoCommunePolls: any[];
  setDemoCommunePolls: React.Dispatch<React.SetStateAction<any[]>>;
  demoSignalements: any[];
  setDemoSignalements: React.Dispatch<React.SetStateAction<any[]>>;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
  onBack: () => void;
}

export const DemoCommuneSpace: React.FC<DemoCommuneSpaceProps> = ({
  demoProfileId,
  activeTab,
  setActiveTab,
  demoCommuneAlerts,
  setDemoCommuneAlerts,
  demoCommuneNews,
  setDemoCommuneNews,
  demoCommuneEvents,
  setDemoCommuneEvents,
  demoCommunePolls,
  setDemoCommunePolls,
  demoSignalements,
  setDemoSignalements,
  triggerDemoNotification,
  onBack
}) => {
  const isAgent = demoProfileId === 'demo_commune_agent';

  // --- MAYOR CRUD NEWS ---
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');
  
  const handleAddNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsContent.trim()) return;

    const newNews = {
      id: `cn-${Date.now()}`,
      title: newNewsTitle.trim(),
      content: newNewsContent.trim(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setDemoCommuneNews(prev => [newNews, ...prev]);
    setNewNewsTitle('');
    setNewNewsContent('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🏛️ Actualité Municipale",
        `Nouvelle publication : "${newNews.title}"`,
        "commune"
      );
    }
    alert("📢 Actualité communale publiée avec succès !");
  };

  const handleDeleteNews = (id: string) => {
    setDemoCommuneNews(prev => prev.filter(n => n.id !== id));
  };

  // --- MAYOR CRUD ALERTS ---
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertDesc, setNewAlertDesc] = useState('');

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertTitle.trim() || !newAlertDesc.trim()) return;

    const newAlert = {
      id: `ca-${Date.now()}`,
      title: newAlertTitle.trim(),
      description: newAlertDesc.trim(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type: 'warning'
    };

    setDemoCommuneAlerts(prev => [newAlert, ...prev]);
    setNewAlertTitle('');
    setNewAlertDesc('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🚧 Alerte Mairie",
        `Vigilance travaux : "${newAlert.title}"`,
        "commune"
      );
    }
    alert("🚧 Alerte municipale publiée à tous les foyers !");
  };

  const handleDeleteAlert = (id: string) => {
    setDemoCommuneAlerts(prev => prev.filter(a => a.id !== id));
  };

  // --- MAYOR CRUD EVENTS ---
  const [newEvTitle, setNewEvTitle] = useState('');
  const [newEvDesc, setNewEvDesc] = useState('');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvTitle.trim() || !newEvDesc.trim()) return;

    const newEv = {
      id: `ce-${Date.now()}`,
      title: newEvTitle.trim(),
      description: newEvDesc.trim(),
      date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      time: '14:00'
    };

    setDemoCommuneEvents(prev => [newEv, ...prev]);
    setNewEvTitle('');
    setNewEvDesc('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🏛️ Nouvel Événement",
        `Inscrivez-vous : "${newEv.title}"`,
        "commune"
      );
    }
    alert("📅 Événement ajouté à l'agenda municipal !");
  };

  const handleDeleteEvent = (id: string) => {
    setDemoCommuneEvents(prev => prev.filter(e => e.id !== id));
  };

  // --- MAYOR CRUD POLLS ---
  const [newPollQ, setNewPollQ] = useState('');
  const [newPollOpt1, setNewPollOpt1] = useState('');
  const [newPollOpt2, setNewPollOpt2] = useState('');

  const handleAddPoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollQ.trim() || !newPollOpt1.trim() || !newPollOpt2.trim()) return;

    const newPoll = {
      id: `cp-${Date.now()}`,
      question: newPollQ.trim(),
      description: "Consultation citoyenne - Cormeilles-en-Parisis",
      options: [
        { text: newPollOpt1.trim(), votes: [] },
        { text: newPollOpt2.trim(), votes: [] }
      ],
      active: true,
      dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0]
    };

    setDemoCommunePolls(prev => [newPoll, ...prev]);
    setNewPollQ('');
    setNewPollOpt1('');
    setNewPollOpt2('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🗳️ Consultation Citoyenne",
        `Nouveau sondage disponible : "${newPoll.question}"`,
        "commune"
      );
    }
    alert("🗳️ Sondage publié avec succès aux citoyens !");
  };

  const handleClosePoll = (id: string) => {
    setDemoCommunePolls(prev => prev.map(p => p.id === id ? { ...p, active: false } : p));
    alert("🗳️ Consultation clôturée.");
  };

  // --- AGENT INTERVENTIONS ACTIONS ---
  const [agentComments, setAgentComments] = useState<{ [key: string]: string }>({});

  const handleTakeCharge = (sigId: string) => {
    setDemoSignalements(prev => prev.map(s => {
      if (s.id === sigId) {
        const updated = {
          ...s,
          status: 'En cours',
          agentComment: "Pris en charge par l'équipe technique de voirie.",
          photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&auto=format&fit=crop&q=80' // simulated work photo
        };
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "🛠️ Intervention en Cours",
            `Le signalement "${s.title}" a été pris en charge par un agent.`,
            "commune"
          );
        }
        return updated;
      }
      return s;
    }));
  };

  const handleAddAgentComment = (sigId: string, comment: string) => {
    if (!comment.trim()) return;
    setDemoSignalements(prev => prev.map(s => {
      if (s.id === sigId) {
        return {
          ...s,
          agentComment: comment
        };
      }
      return s;
    }));
    setAgentComments(prev => ({ ...prev, [sigId]: '' }));
    alert("💬 Commentaire ajouté au ticket !");
  };

  const handleTransferTask = (sigId: string, targetService: string) => {
    setDemoSignalements(prev => prev.map(s => {
      if (s.id === sigId) {
        return {
          ...s,
          service: targetService,
          agentComment: `Ticket transféré au service : ${targetService}.`
        };
      }
      return s;
    }));
    alert(`✈️ Ticket transféré au service ${targetService}.`);
  };

  const handleResolveSignalement = (sigId: string) => {
    setDemoSignalements(prev => prev.map(s => {
      if (s.id === sigId) {
        const resolved = {
          ...s,
          status: 'Résolu',
          agentComment: "Travaux terminés. Le problème est résolu !",
          photoUrlDone: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&auto=format&fit=crop&q=80' // simulated done photo
        };
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "✅ Signalement Résolu",
            `Le signalement "${s.title}" a été marqué résolu. Merci !`,
            "commune"
          );
        }
        return resolved;
      }
      return s;
    }));
    alert("✅ Ticket clôturé et résolu !");
  };

  // --- STATS COMPUTATIONS ---
  const signalementsOpen = demoSignalements.filter(s => s.status !== 'Résolu').length;
  const signalementsClosed = demoSignalements.filter(s => s.status === 'Résolu').length;

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto font-sans text-white">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 rounded-2xl bg-[#FF9F1C]/10 border border-[#FF9F1C]/20 text-[#FF9F1C]">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Portail Commune</h1>
            <p className="text-xs text-white/50 font-medium">Ville de Cormeilles-en-Parisis</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase bg-[#FF9F1C]/10 border border-[#FF9F1C]/25 text-[#FF9F1C] px-3.5 py-1.5 rounded-full tracking-wider">
          {isAgent ? '👷 AGENT TECH' : '🏛️ MAIRE / ADMIN'}
        </span>
      </div>

      {/* ====================================================
          A. MAYOR SPACE (Maire / Admin)
          ==================================================== */}
      {!isAgent && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* KEY STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Foyers inscrits</span>
                  <p className="text-2xl font-black text-white">1 240 foyers</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Écoles connectées</span>
                  <p className="text-2xl font-black text-[#FF9F1C]">2 écoles</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Signalements ouverts</span>
                  <p className="text-2xl font-black text-red-400">{signalementsOpen}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Signalements résolus</span>
                  <p className="text-2xl font-black text-[#00D26A]">{signalementsClosed}</p>
                </div>
              </div>

              {/* CRUD NEWS */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📢 Diffuser une Actualité Municipale</h3>
                <form onSubmit={handleAddNews} className="space-y-3 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Titre de l'actualité..."
                    value={newNewsTitle}
                    onChange={(e) => setNewNewsTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FF9F1C]"
                  />
                  <textarea
                    placeholder="Contenu de la publication..."
                    required
                    rows={3}
                    value={newNewsContent}
                    onChange={(e) => setNewNewsContent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FF9F1C] font-sans"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#FF9F1C] text-[#07111F] font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Publier l'actualité
                  </button>
                </form>

                {/* News List */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h4 className="text-[10px] font-black uppercase text-white/45 tracking-widest">Historique actualités</h4>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {demoCommuneNews.map(n => (
                      <div key={n.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-start">
                        <div className="space-y-1 pr-3">
                          <h5 className="font-extrabold text-[#FF9F1C]">{n.title}</h5>
                          <p className="text-white/70 font-sans">{n.content}</p>
                        </div>
                        <button onClick={() => handleDeleteNews(n.id)} className="text-red-400 p-1 hover:bg-white/5 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alertes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🚨 Gestion des alertes travaux & vigilances</h3>
              <form onSubmit={handleAddAlert} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Titre de l'alerte (ex: 🚧 Travaux Rue Verte)..."
                  value={newAlertTitle}
                  onChange={(e) => setNewAlertTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                />
                <textarea
                  required
                  placeholder="Détails de l'alerte..."
                  rows={2}
                  value={newAlertDesc}
                  onChange={(e) => setNewAlertDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none font-sans"
                />
                <button type="submit" className="w-full py-2.5 bg-[#FF9F1C] text-[#07111F] font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
                  Diffuser l'alerte travaux
                </button>
              </form>

              {/* Alerts List */}
              <div className="space-y-2.5 pt-3 border-t border-white/5 max-h-[200px] overflow-y-auto pr-1">
                {demoCommuneAlerts.map(a => (
                  <div key={a.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{a.title}</h4>
                      <p className="text-[10px] text-white/50">{a.description}</p>
                    </div>
                    <button onClick={() => handleDeleteAlert(a.id)} className="text-red-400 p-1 hover:bg-white/5 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'evenements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📅 Planifier un événement communal</h3>
              <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Nom de l'événement (ex: Fête du Sport)..."
                  value={newEvTitle}
                  onChange={(e) => setNewEvTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                />
                <textarea
                  required
                  placeholder="Lieu, horaires et description..."
                  rows={2}
                  value={newEvDesc}
                  onChange={(e) => setNewEvDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none font-sans"
                />
                <button type="submit" className="w-full py-2.5 bg-[#FF9F1C] text-[#07111F] font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
                  Enregistrer l'événement
                </button>
              </form>

              {/* Events List */}
              <div className="space-y-2 pt-3 border-t border-white/5 max-h-[200px] overflow-y-auto pr-1">
                {demoCommuneEvents.map(e => (
                  <div key={e.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center font-sans">
                    <div>
                      <h4 className="font-bold text-white">{e.title}</h4>
                      <p className="text-[10px] text-white/50">{e.date} • {e.description}</p>
                    </div>
                    <button onClick={() => handleDeleteEvent(e.id)} className="text-red-400 p-1 hover:bg-white/5 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sondages' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🗳️ Créer un sondage citoyen</h3>
              <form onSubmit={handleAddPoll} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Question de consultation..."
                  value={newPollQ}
                  onChange={(e) => setNewPollQ(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Option 1"
                    value={newPollOpt1}
                    onChange={(e) => setNewPollOpt1(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Option 2"
                    value={newPollOpt2}
                    onChange={(e) => setNewPollOpt2(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#FF9F1C] text-[#07111F] font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
                  Créer la consultation
                </button>
              </form>

              {/* Polls List & Results */}
              <div className="space-y-4 pt-3 border-t border-white/5 max-h-[300px] overflow-y-auto pr-1">
                <h4 className="text-[10px] font-black uppercase text-white/45 tracking-widest">Sondages actifs & résultats</h4>
                {demoCommunePolls.map(p => (
                  <div key={p.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 text-xs font-sans">
                    <div className="flex justify-between items-start">
                      <h5 className="font-bold text-[#FF9F1C]">{p.question}</h5>
                      {p.active ? (
                        <button 
                          onClick={() => handleClosePoll(p.id)}
                          className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[9px] font-bold cursor-pointer"
                        >
                          Clôturer
                        </button>
                      ) : (
                        <span className="text-[9px] bg-white/10 text-white/50 px-2 py-0.5 rounded">Clôturé</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {p.options.map((opt: any, oIdx: number) => {
                        const totalVotes = p.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                        const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                        return (
                          <div key={oIdx} className="space-y-1">
                            <div className="flex justify-between text-[11px] text-white/80">
                              <span>{opt.text}</span>
                              <span className="font-extrabold">{pct}% ({opt.votes.length} votes)</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-[#FF9F1C]" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'signalements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📋 Signalements Citoyens (Suivi)</h3>
              <div className="space-y-3">
                {demoSignalements.map(sig => (
                  <div key={sig.id} className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2 font-sans">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white">{sig.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        sig.status === 'Résolu' 
                          ? 'bg-[#00D26A]/20 text-[#00D26A]' 
                          : sig.status === 'En cours' 
                            ? 'bg-[#FF9F1C]/20 text-[#FF9F1C]' 
                            : 'bg-white/10 text-white/55'
                      }`}>{sig.status}</span>
                    </div>
                    <p className="text-white/70 leading-normal">{sig.description}</p>
                    <p className="text-[10px] text-white/40">Soumis par {sig.author} • {sig.date}</p>
                    {sig.agentComment && (
                      <div className="p-2.5 bg-white/5 border border-white/5 rounded-lg text-[10px] text-[#FF9F1C]">
                        <strong>Commentaire agent :</strong> {sig.agentComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ====================================================
          B. AGENT SPACE (Agent Municipal Terrain)
          ==================================================== */}
      {isAgent && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* METRICS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Tâches en attente</span>
                  <p className="text-2xl font-black text-white">{demoSignalements.filter(s => s.status === 'En cours').length} tickets</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Nouvelles urgences</span>
                  <p className="text-2xl font-black text-red-400">{demoSignalements.filter(s => s.status === 'Nouveau' || s.status === 'En attente').length} alertes</p>
                </div>
              </div>

              {/* SERVICES LIST */}
              <div className="glass-panel p-5 border-white/8 rounded-[28px] bg-[#112240]/40 space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">🛠️ Répartition par services techniques</h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                    <span className="font-extrabold text-white">Voirie 🕳️</span>
                    <span className="block text-[10px] text-white/45 mt-1">{demoSignalements.filter(s => s.title.includes('poule') || s.title.includes('route')).length} ticket(s)</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                    <span className="font-extrabold text-white">Propreté 🧹</span>
                    <span className="block text-[10px] text-white/45 mt-1">0 ticket</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                    <span className="font-extrabold text-white">Éclairage 💡</span>
                    <span className="block text-[10px] text-white/45 mt-1">0 ticket</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                    <span className="font-extrabold text-white">Espaces Verts 🌳</span>
                    <span className="block text-[10px] text-white/45 mt-1">0 ticket</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signalements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Signalements Terrain & File de travail</h3>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {demoSignalements.map(sig => (
                  <div key={sig.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3 text-xs font-sans">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white">{sig.title}</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">Signalé par {sig.author} le {sig.date}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        sig.status === 'Résolu' 
                          ? 'bg-[#00D26A]/20 text-[#00D26A]' 
                          : sig.status === 'En cours' 
                            ? 'bg-[#FF9F1C]/20 text-[#FF9F1C]' 
                            : 'bg-white/10 text-white/50'
                      }`}>{sig.status}</span>
                    </div>

                    <p className="text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{sig.description}</p>

                    {/* Agent Comment Log Display */}
                    {sig.agentComment && (
                      <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-[#FF9F1C] rounded-lg">
                        <strong>Log Agent :</strong> {sig.agentComment}
                      </div>
                    )}

                    {/* Interactive workflow buttons */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      {sig.status !== 'Résolu' && sig.status !== 'En cours' && (
                        <button
                          onClick={() => handleTakeCharge(sig.id)}
                          className="w-full py-2 rounded-xl border border-[#FF9F1C] text-[#FF9F1C] font-extrabold transition active:scale-95 cursor-pointer hover:bg-[#FF9F1C]/10 text-[11px]"
                        >
                          🛠️ Prendre en charge l'intervention
                        </button>
                      )}

                      {sig.status === 'En cours' && (
                        <div className="space-y-3">
                          {/* Live Comment Form */}
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Ajouter un commentaire agent..."
                              value={agentComments[sig.id] || ''}
                              onChange={(e) => setAgentComments(prev => ({ ...prev, [sig.id]: e.target.value }))}
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs"
                            />
                            <button
                              onClick={() => handleAddAgentComment(sig.id, agentComments[sig.id])}
                              className="px-3 bg-white/10 rounded-xl text-white font-bold transition hover:bg-white/20"
                            >
                              Ajouter
                            </button>
                          </div>

                          {/* Task Transfer */}
                          <div className="flex items-center justify-between text-[11px] bg-white/5 p-2 rounded-xl">
                            <span className="text-white/50">Transférer service :</span>
                            <div className="flex space-x-1">
                              {['Voirie', 'Espaces Verts', 'Propreté'].map(srv => (
                                <button
                                  key={srv}
                                  onClick={() => handleTransferTask(sig.id, srv)}
                                  className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[9px]"
                                >
                                  {srv}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Finalize Task */}
                          <button
                            onClick={() => handleResolveSignalement(sig.id)}
                            className="w-full py-2.5 bg-[#00D26A] text-[#07111F] font-black transition active:scale-95 cursor-pointer shadow-md rounded-xl text-[11px]"
                          >
                            ✓ Clôturer & Marquer résolu (Photo travaux terminée)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📊 Rapport de performance interventions</h3>
              <div className="space-y-4 font-sans text-xs">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                  <span>Tickets résolus ce mois-ci</span>
                  <strong className="text-lg text-[#00D26A]">18</strong>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                  <span>Temps moyen de résolution</span>
                  <strong className="text-lg text-white">4.2 heures</strong>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                  <span>Satisfaction citoyenne</span>
                  <strong className="text-lg text-[#FFB020]">4.9 / 5</strong>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
