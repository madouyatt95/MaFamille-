import React, { useState } from 'react';
import { 
  Home, GraduationCap, Trophy, Gamepad2, User, BookOpen, Calendar, 
  MessageSquare, Plus, Send, UserCheck, ClipboardList, ArrowLeft, 
  Landmark, AlertTriangle, CheckSquare, Volume2, Mic, Megaphone, 
  BarChart2, Settings, Clock, Coins, Trash2, Edit3, Camera, 
  CheckCircle2, Star, Gift, Check, ShieldAlert, Info, MapPin, Users,
  PlusCircle, CheckCircle, FileText, ChevronRight, MessageCircle, RefreshCw, X, Vote,
  UtensilsCrossed
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
  { id: 'student-1ere-15', name: 'Louise Bonnet' },
  { id: 'student-1ere-16', name: 'Maxime Lemaire' },
  { id: 'student-1ere-17', name: 'Camille Petit' },
  { id: 'student-1ere-18', name: 'Antoine Giraud' },
  { id: 'student-1ere-19', name: 'Jade Moreau' },
  { id: 'student-1ere-20', name: 'Paul Fontaine' },
  { id: 'student-1ere-21', name: 'Inès Dubois' },
  { id: 'student-1ere-22', name: 'Jules Roux' },
  { id: 'student-1ere-23', name: 'Chloé Martinez' },
  { id: 'student-1ere-24', name: 'Lucas Collin' },
  { id: 'student-1ere-25', name: 'Sarah Vidal' },
  { id: 'student-1ere-26', name: 'Thomas Nguyen' },
  { id: 'student-1ere-27', name: 'Emma Chevalier' },
  { id: 'student-1ere-28', name: 'Louis Michel' },
  { id: 'student-1ere-29', name: 'Eva David' },
  { id: 'student-1ere-30', name: 'Nathan Royer' }
];

// ==========================================
// 📱 CONTEXTUAL BOTTOM NAV
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
      { id: 'accueil', label: 'Mon Foyer', icon: Home },
      { id: 'ecole', label: 'Mon École', icon: BookOpen },
      { id: 'recompenses', label: 'Étoiles', icon: Star },
      { id: 'activites', label: 'Fun & Peace', icon: Gamepad2 }
    ];
  } else if (demoProfileId === 'demo_lyna') {
    tabs = [
      { id: 'accueil', label: 'Foyer & Ado', icon: Home },
      { id: 'ecole', label: 'Mon Lycée', icon: BookOpen },
      { id: 'messages', label: 'Messages', icon: MessageSquare }
    ];
  } else if (['demo_school_primary_admin', 'demo_school_high_admin'].includes(demoProfileId)) {
    tabs = [
      { id: 'accueil', label: 'Dashboard', icon: Home },
      { id: 'listes', label: 'Présences', icon: ClipboardList },
      { id: 'sorties', label: 'Sorties', icon: Calendar },
      { id: 'enseignants', label: 'Enseignants', icon: Users }
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
// 👦 ISSA - PORTAL (CHILD MODE - 8 YEARS)
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

  // PeaceMaker & Sibling Conflict Helper
  const [conflictType, setConflictType] = useState<string | null>(null);
  const [peaceFeedback, setPeaceFeedback] = useState('');

  // Capsule Temporelle
  const [capsuleMessage, setCapsuleMessage] = useState('');
  const [capsuleSaved, setCapsuleSaved] = useState(false);

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

  const handleResolveConflict = (type: string) => {
    setConflictType(type);
    let feedback = "";
    if (type === 'lyna') {
      feedback = "🕊️ PeaceMaker suggère : Discute calmement avec Lyna et propose un pierre-feuille-ciseaux pour décider ! Fais-lui un câlin ou un check complice. +5 points Étoile pour avoir choisi la paix !";
      setDemoPocketMoney((money: any[]) => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + 5 } : m));
    } else if (type === 'rangement') {
      feedback = "🕊️ PeaceMaker suggère : Propose à Papa/Maman de faire un chrono de 2 minutes pour ranger tous les jouets en musique ! +5 points Étoile pour ton esprit d'équipe.";
      setDemoPocketMoney((money: any[]) => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + 5 } : m));
    } else {
      feedback = "🕊️ PeaceMaker suggère : Lancez une pièce ou demandez à l'IA de choisir au hasard ! Chaque membre de la famille aura son tour le week-end prochain. +5 points Étoile.";
      setDemoPocketMoney((money: any[]) => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + 5 } : m));
    }
    setPeaceFeedback(feedback);
  };

  const handleSaveCapsule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsuleMessage.trim()) return;
    setCapsuleSaved(true);
    setDemoPocketMoney((money: any[]) => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + 15 } : m));
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "⏳ Capsule Temporelle",
        "Issa Diop a scellé un message secret pour l'avenir ! (+15 Pts)",
        "agenda"
      );
    }
    setTimeout(() => {
      setCapsuleMessage('');
      setCapsuleSaved(false);
    }, 4000);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto font-sans text-white">
      
      {/* HEADER HERO */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-3.5 text-center">
        <div className="relative animate-fade-in">
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
          <p className="text-xs text-white/60 mt-1">Espace Super-Héros • Famille Diop</p>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'accueil' && (
        <div className="space-y-5 animate-fade-in">
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
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Mon Trésor (€)</p>
              </div>
            </div>
          </div>

          {/* CE SOIR / À NE PAS MANQUER (VIDE COMPLÈTEMENT LE METIER CLASSIQUE POUR S'IMPLANTATION FAMILLE) */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3.5 bg-gradient-to-br from-[#6C5CFF]/10 to-transparent">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest block">🏠 Ma Vie de Famille</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center space-x-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-lg">🍝</span>
                <div>
                  <h4 className="font-bold text-white">Menu ce soir : Lasagnes maison</h4>
                  <p className="text-[10px] text-white/40 font-medium">Préparé par Maman avec amour</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-lg">🛒</span>
                <div>
                  <h4 className="font-bold text-white">Mission courses : Vérifier le lait</h4>
                  <p className="text-[10px] text-white/40 font-medium">Regarder s'il reste une bouteille dans le frigo</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-lg">✈️</span>
                <div>
                  <h4 className="font-bold text-white">Voyage : Départ Maroc dans 10 jours</h4>
                  <p className="text-[10px] text-white/40 font-medium">Préparer ma petite valise bleue</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-lg">👨‍👩‍👧‍👦</span>
                <div>
                  <h4 className="font-bold text-white">Conseil de famille dimanche</h4>
                  <p className="text-[10px] text-white/40 font-medium">À 18h00 - Choix des activités de vacances</p>
                </div>
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

          {/* MISSION PREVIEW */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🧹 Mes tâches familiales</h3>
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
        <div className="space-y-4 animate-fade-in">
          {/* DEVOIRS */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4 bg-[#112240]/40">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Mes devoirs CE2</h3>
              <span className="text-[9px] font-bold text-white/40">École Victor Hugo</span>
            </div>
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

          {/* Cantine Menu */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🥗 Menu de la Cantine</h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#FFB020]">Lundi</span>
                <span className="text-white/70 text-right">Carottes râpées, Rôti de dinde & Frites</span>
              </div>
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#FFB020]">Mardi</span>
                <span className="text-white/70 text-right">Lasagnes Bolognaises, Salade verte</span>
              </div>
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#FFB020]">Jeudi</span>
                <span className="text-white/70 text-right">Poisson pané, Purée maison & Compote</span>
              </div>
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#FFB020]">Vendredi</span>
                <span className="text-white/70 text-right">Poulet rôti, Petits pois & Glace</span>
              </div>
            </div>
          </div>

          {/* EMPLOI DU TEMPS */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🕒 Mon Emploi du Temps</h3>
              <span className="text-[10px] text-white/40 font-medium">Maître : M. Bernard</span>
            </div>
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
        <div className="space-y-4 animate-fade-in">
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
                { title: "🍿 Aller au cinéma en famille", cost: 200, emoji: "🎬" },
                { title: "🕹️ 1 heure de console de jeux", cost: 100, emoji: "🎮" },
                { title: "📚 Choisir une nouvelle BD", cost: 150, emoji: "📖" }
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
                      Réclamer
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activites' && (
        <div className="space-y-5 animate-fade-in">
          {/* PEACEMAKER */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🕊️</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">PeaceMaker - Résolution de Conflits</h3>
            </div>
            <p className="text-[10px] text-white/55 leading-relaxed font-sans">Tu as un petit conflit à la maison ? Sélectionne-le pour trouver une solution de paix !</p>
            
            <div className="grid grid-cols-3 gap-2 text-[10px] font-sans text-center">
              <button 
                onClick={() => handleResolveConflict('lyna')}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-[#6C5CFF]/15 transition cursor-pointer text-white font-bold"
              >
                Dispute avec Lyna
              </button>
              <button 
                onClick={() => handleResolveConflict('rangement')}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-[#6C5CFF]/15 transition cursor-pointer text-white font-bold"
              >
                Jouets à ranger
              </button>
              <button 
                onClick={() => handleResolveConflict('ecran')}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-[#6C5CFF]/15 transition cursor-pointer text-white font-bold"
              >
                Choix du film
              </button>
            </div>

            {peaceFeedback && (
              <div className="p-3 bg-[#6C5CFF]/15 border border-[#6C5CFF]/25 text-xs text-purple-200 rounded-xl leading-relaxed animate-fade-in font-sans">
                {peaceFeedback}
              </div>
            )}
          </div>

          {/* CAPSULE TEMPORELLE */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏳</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Capsule Temporelle Secrète</h3>
            </div>
            <p className="text-[10px] text-white/55 leading-relaxed font-sans">Écris un souhait ou un secret pour le futur. Il sera scellé et ne pourra être ouvert que dans 5 ans !</p>
            
            <form onSubmit={handleSaveCapsule} className="space-y-3 font-sans">
              <input 
                type="text" 
                placeholder="Mon souhait (ex: devenir pilote de navette...)"
                value={capsuleMessage}
                onChange={(e) => setCapsuleMessage(e.target.value)}
                disabled={capsuleSaved}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button 
                type="submit"
                disabled={capsuleSaved || !capsuleMessage.trim()}
                className="w-full py-2 bg-[#FFB020] text-[#07111F] rounded-xl text-xs font-black transition active:scale-95 shadow cursor-pointer"
              >
                {capsuleSaved ? "🔒 Scellé avec succès !" : "Fermer la capsule (+15 Pts)"}
              </button>
            </form>
          </div>

          {/* MENTAL MATH */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🕹️ Calcul Mental : Défi Étoiles</h3>
            <form onSubmit={handleSubmitQuiz} className="space-y-3 font-sans">
              <div className="flex items-center justify-center space-x-4 bg-white/5 p-4 rounded-2xl border border-white/5 font-mono text-xl font-bold">
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
                  className="w-16 bg-white/10 border border-[#FFB020] rounded-xl text-center text-white focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#00D26A] text-[#07111F] rounded-xl text-xs font-extrabold uppercase tracking-wide cursor-pointer">
                Valider ma réponse
              </button>
              {quizFeedback && (
                <p className="text-center text-xs font-bold text-[#FFB020] animate-pulse">{quizFeedback}</p>
              )}
            </form>
          </div>

          {/* STORY GENERATOR */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📖 Les histoires du soir de Toby</h3>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center">
              <button onClick={() => generateStory('espace')} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer">🚀 Espace</button>
              <button onClick={() => generateStory('dinos')} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer">🦖 Dinosaures</button>
              <button onClick={() => generateStory('magie')} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer">🏰 Château</button>
            </div>
            {storyText && (
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs font-sans text-white/80 leading-relaxed space-y-2">
                <span className="font-extrabold text-[#FFB020] block uppercase text-[9px] tracking-wider">
                  📖 Histoire : {selectedTheme === 'espace' ? 'L\'espace lointain' : selectedTheme === 'dinos' ? 'Le Safari Jurassique' : 'La Baguette Magique'}
                </span>
                <p className="italic">{storyText}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 👧 LYNA - PORTAL (TEEN MODE - 16 YEARS)
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
  demoTeacherParentMessages,
  setDemoTeacherParentMessages,
  triggerDemoNotification
}) => {
  const myHomework = demoSchoolHomework.filter(h => h.class === 'Première');
  const myComms = demoSchoolComms;
  const myTrips = demoSchoolTrips.filter(t => t.school.includes('1ère') && (t.status === 'approved_parent' || t.status === 'validated_admin'));
  const myVaccine = demoVaccines.find(v => v.memberId === 'demo_lyna') || { name: 'ROR', date: '2026-06-20', status: 'À faire' };

  // Local state for interactive actions
  const [teenBudget, setTeenBudget] = useState(48.50);
  const [teenTransactions, setTeenTransactions] = useState([
    { id: 'tt-1', title: 'Librairie Mots et Cie', amount: -12.50, date: 'Aujourd\'hui' },
    { id: 'tt-2', title: 'Cinéma Pathé', amount: -9.00, date: 'Hier' }
  ]);
  const [capsuleMsg, setCapsuleMsg] = useState('');
  const [capsuleSaved, setCapsuleSaved] = useState(false);

  // PeaceMaker
  const [conflictReason, setConflictReason] = useState<string | null>(null);
  const [peaceText, setPeaceText] = useState('');

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

  const handleResolveConflict = (reason: string) => {
    setConflictReason(reason);
    if (reason === 'homework') {
      setPeaceText("🕊️ PeaceMaker Ado : Isole-toi dans un endroit calme. Explique poliment à tes parents que tu as besoin de concentration pour ton DM de physique, et définissez ensemble un créneau de retour au calme. Tu gères !");
    } else if (reason === 'issa') {
      setPeaceText("🕊️ PeaceMaker Ado : Issa n'a que 8 ans. Lance-lui un petit défi drôle pour le motiver à ranger ou propose de faire une pause ensemble. La patience est ta meilleure alliée !");
    } else {
      setPeaceText("🕊️ PeaceMaker Ado : Demande à en parler calmement pendant le Conseil de Famille de ce dimanche. C'est l'espace idéal pour proposer une nouvelle répartition des tâches.");
    }
  };

  const handleSaveCapsule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsuleMsg.trim()) return;
    setCapsuleSaved(true);
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "⏳ Capsule Temporelle Ado",
        "Lyna Diop a scellé ses pensées d'adolescente pour le futur.",
        "agenda"
      );
    }
    setTimeout(() => {
      setCapsuleMsg('');
      setCapsuleSaved(false);
    }, 4000);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto font-sans text-white">
      
      {/* HEADER HERO */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-3 text-center animate-fade-in">
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
          <p className="text-xs text-white/50 mt-1">Lycée Simone Veil • Famille Diop</p>
        </div>
      </div>

      {activeTab === 'accueil' && (
        <div className="space-y-4 animate-fade-in">
          {/* BUDGET PARTAGÉ */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">💳 Budget Partagé Autorisé</h3>
              <span className="text-xs font-black text-[#00D26A]">{teenBudget.toFixed(2)} €</span>
            </div>
            <p className="text-[10px] text-white/50 font-medium">Fonds hebdomadaires alloués par Mamadou (Papa)</p>
            <div className="space-y-2 pt-2 border-t border-white/5">
              {teenTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between text-xs font-sans">
                  <span className="text-white/70">{tx.title}</span>
                  <span className="font-bold text-red-400">{tx.amount.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          </div>

          {/* ADO LIFE - CE SOIR / À NE PAS MANQUER */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3.5 bg-gradient-to-br from-[#6C5CFF]/10 to-transparent">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest block">📅 Vie Familiale & Planning</h3>
            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex items-center space-x-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-lg">🏕️</span>
                <div>
                  <h4 className="font-bold text-white">Voyage : Camping à Lacanau</h4>
                  <p className="text-[10px] text-white/40 font-medium">Départ planifié le 12 juillet • Budget approuvé</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-lg">👨‍👩‍👧‍👦</span>
                <div>
                  <h4 className="font-bold text-white">Conseil de Famille</h4>
                  <p className="text-[10px] text-white/40 font-medium">Ce dimanche à 18h00 • Sujet : règles d'écrans</p>
                </div>
              </div>
            </div>
          </div>

          {/* PEACEMAKER ADO */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🕊️</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">PeaceMaker - Médiateur Ado</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-sans text-center">
              <button onClick={() => handleResolveConflict('homework')} className="p-2.5 rounded-xl bg-white/5 hover:bg-[#6C5CFF]/10 border border-white/5 font-bold cursor-pointer text-white">Pression Devoirs</button>
              <button onClick={() => handleResolveConflict('issa')} className="p-2.5 rounded-xl bg-white/5 hover:bg-[#6C5CFF]/10 border border-white/5 font-bold cursor-pointer text-white">Agaçé par Issa</button>
              <button onClick={() => handleResolveConflict('tasks')} className="p-2.5 rounded-xl bg-white/5 hover:bg-[#6C5CFF]/10 border border-white/5 font-bold cursor-pointer text-white">Tâches Ménagères</button>
            </div>
            {peaceText && (
              <div className="p-3 bg-[#6C5CFF]/15 border border-[#6C5CFF]/25 text-xs text-purple-200 rounded-xl leading-relaxed font-sans">
                {peaceText}
              </div>
            )}
          </div>

          {/* CAPSULE TEMPORELLE */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏳</span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Journal & Capsule de Première</h3>
            </div>
            <form onSubmit={handleSaveCapsule} className="space-y-3 font-sans">
              <textarea 
                rows={2}
                placeholder="Rédiger mes pensées à relire dans 5 ans..."
                value={capsuleMsg}
                onChange={(e) => setCapsuleMsg(e.target.value)}
                disabled={capsuleSaved}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-xs"
              />
              <button type="submit" disabled={capsuleSaved || !capsuleMsg.trim()} className="w-full py-2 bg-[#6C5CFF] text-white rounded-xl text-xs font-bold transition active:scale-95 shadow cursor-pointer">
                {capsuleSaved ? "🔒 Journal verrouillé !" : "Sauvegarder dans ma capsule"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'ecole' && (
        <div className="space-y-4 animate-fade-in">
          {/* GRADES */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📈 Mes Notes - 1ère</h3>
              <span className="text-[10px] font-bold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-full">Moyenne : 14.8/20</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span>Français (Phèdre Racine)</span>
                <strong className="font-mono text-[#00D26A]">15 / 20</strong>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span>Physique (TP Optique)</span>
                <strong className="font-mono text-[#00D26A]">14 / 20</strong>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                <span>Mathématiques (Algèbre)</span>
                <strong className="font-mono text-[#00D26A]">15.5 / 20</strong>
              </div>
            </div>
          </div>

          {/* CAHIER DE TEXTES */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Mon Cahier de textes</h3>
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

          {/* PARCOURSUP */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-gradient-to-r from-[#6C5CFF]/15 to-transparent">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🧭</span>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Orientation & Parcoursup</h3>
            </div>
            <p className="text-[10px] text-white/55 leading-relaxed font-sans">Orientation 1ère : Choix des spécialités scientifiques et littéraires pour l'année prochaine.</p>
            <div className="space-y-2.5 pt-2 font-sans text-xs">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span>Régler les spécialités de Terminale</span>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">En réflexion</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span>Découvrir les formations d'ingénieurs</span>
                <span className="text-[9px] font-bold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-full">Validé</span>
              </div>
            </div>
          </div>

          {/* TIMETABLE */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-[#112240]/40">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📅 Emploi du Temps Lycée</h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="p-3 rounded-xl bg-white/5 border-l-4 border-[#6C5CFF] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">08h30 - 10h30 : Français (Bac)</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Mme Leroy • Salle 102</p>
                </div>
                <span className="text-[9px] font-bold bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/25 px-2 py-0.5 rounded">Cours</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border-l-4 border-emerald-500 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">10h45 - 12h45 : Physique-Chimie</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">M. Martin • Labo 30</p>
                </div>
                <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 py-0.5 rounded">TP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-4 animate-fade-in font-sans">
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">💬 Discussion : Mme Leroy (Prof. Principal)</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {lynaMessages.map(m => (
                <div key={m.id} className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                  m.senderId === 'demo_lyna' 
                    ? 'bg-[#6C5CFF] text-white ml-auto' 
                    : 'bg-white/5 border border-white/5 text-white mr-auto'
                }`}>
                  <span className="text-[8px] opacity-60 block mb-1">{m.senderName} • {m.timestamp}</span>
                  <p className="leading-relaxed font-sans">{m.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendTeacherMsg} className="flex space-x-2 pt-2 border-t border-white/5">
              <input
                type="text"
                placeholder="Écrire à Mme Leroy..."
                value={teacherMsgInput}
                onChange={(e) => setTeacherMsgInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button type="submit" className="p-2.5 bg-[#6C5CFF] text-white rounded-xl hover:bg-[#6D5DFF] transition cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🏛️ CITIZEN PORTAL [NEW] (COMMUNE CITOYEN VIEW)
// ==========================================
interface DemoCommuneCitizenPortalProps {
  demoProfileId: string;
  demoCommuneAlerts: any[];
  demoCommuneNews: any[];
  demoCommuneEvents: any[];
  demoCommunePolls: any[];
  setDemoCommunePolls: React.SetStateAction<any>;
  demoSignalements: any[];
  setDemoSignalements: React.SetStateAction<any>;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
  onBack: () => void;
}

export const DemoCommuneCitizenPortal: React.FC<DemoCommuneCitizenPortalProps> = ({
  demoProfileId,
  demoCommuneAlerts,
  demoCommuneNews,
  demoCommuneEvents,
  demoCommunePolls,
  setDemoCommunePolls,
  demoSignalements,
  setDemoSignalements,
  triggerDemoNotification,
  onBack
}) => {
  const [activeCitizenTab, setActiveCitizenTab] = useState<'news' | 'agenda' | 'demarches' | 'signalements' | 'sondages'>('news');

  // Local state for online procedures
  const [myProcedures, setMyProcedures] = useState([
    { id: 'dp-1', title: "Demande d'acte de naissance", status: "En cours", date: '2026-05-22' },
    { id: 'dp-2', title: "Inscription centre de loisirs", status: "En cours", date: '2026-05-25' },
    { id: 'dp-3', title: "Demande d'autorisation d'occupation de voirie", status: "Validée", date: '2026-05-28' },
    { id: 'dp-4', title: "Paiement des taxes locales", status: "En cours", date: '2026-06-01' }
  ]);

  // Modal for adding report / signalement
  const [showSignalementModal, setShowSignalementModal] = useState(false);
  const [sigTitle, setSigTitle] = useState('');
  const [sigDesc, setSigDesc] = useState('');
  const [sigCat, setSigCat] = useState('Voirie');

  const handleAddProcedure = () => {
    const title = prompt("Titre de la nouvelle démarche administrative :", "Demande de carte d'identité");
    if (!title) return;
    const newProc = {
      id: `dp-${Date.now()}`,
      title,
      status: "En cours",
      date: new Date().toISOString().split('T')[0]
    };
    setMyProcedures(prev => [newProc, ...prev]);
    alert("📝 Démarche créée avec succès !");
  };

  const handleVotePoll = (pollId: string, optionIndex: number) => {
    setDemoCommunePolls((polls: any[]) => polls.map(p => {
      if (p.id === pollId) {
        // Remove vote from other options if any, and add to chosen option
        const nextOptions = p.options.map((opt: any, idx: number) => {
          let nextVotes = [...opt.votes];
          if (idx === optionIndex) {
            if (!nextVotes.includes(demoProfileId)) nextVotes.push(demoProfileId);
          } else {
            nextVotes = nextVotes.filter(v => v !== demoProfileId);
          }
          return { ...opt, votes: nextVotes };
        });
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "🗳️ Vote Citoyen",
            `M. Diop a voté au sondage : "${p.question}"`,
            "commune"
          );
        }
        return { ...p, options: nextOptions };
      }
      return p;
    }));
    alert("🗳️ Vote enregistré ! Merci pour votre participation.");
  };

  const handleAddSignalementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sigTitle.trim() || !sigDesc.trim()) return;

    const newSig = {
      id: `sig-${Date.now()}`,
      title: sigTitle.trim(),
      description: sigDesc.trim(),
      category: sigCat,
      date: new Date().toISOString().split('T')[0],
      status: 'Nouveau',
      assignedAgentId: null,
      assignedAgentName: null,
      agentComment: null
    };

    setDemoSignalements((prev: any[]) => [newSig, ...prev]);
    setShowSignalementModal(false);
    setSigTitle('');
    setSigDesc('');
    
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "⚠️ Signalement Citoyen",
        `Nouvel incident signalé : "${newSig.title}" (${newSig.category}) par M. Diop.`,
        "commune"
      );
    }
    alert("⚠️ Signalement envoyé aux services techniques ! Un agent interviendra rapidement.");
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto font-sans text-white relative">
      
      {/* HEADER CITOYEN */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-[#FFB020]">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Cormeilles-en-Parisis</h1>
            <p className="text-xs text-[#FFB020] font-bold">Portail Citoyen 🏛️</p>
          </div>
        </div>
      </div>

      {/* HERO BANNER */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/8 shadow-xl h-44 flex flex-col justify-end p-5">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80" 
          alt="Cormeilles-en-Parisis" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 space-y-1">
          <h2 className="text-base font-black tracking-tight text-white">Cormeilles-en-Parisis, France</h2>
          <p className="text-[10px] text-white/75 font-sans leading-relaxed">Ensemble, construisons notre ville de demain.</p>
          <a href="https://www.ville-cormeilles95.fr" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-3 py-1 bg-white/10 border border-white/20 hover:bg-white/20 text-white rounded-lg text-[9px] font-bold transition">
            Voir le site officiel ↗
          </a>
        </div>
      </div>

      {/* INTERACTIVE ACTION ICONS GRID */}
      <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
        {[
          { id: 'news', label: 'Actualités', icon: Megaphone, color: 'text-blue-400' },
          { id: 'agenda', label: 'Agenda', icon: Calendar, color: 'text-purple-400' },
          { id: 'demarches', label: 'Démarches', icon: FileText, color: 'text-emerald-400' },
          { id: 'signalements', label: 'Incidents', icon: AlertTriangle, color: 'text-amber-400' },
          { id: 'sondages', label: 'Sondages', icon: Vote, color: 'text-[#FF4D6D]' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveCitizenTab(item.id as any)}
            className={`p-2.5 rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition border cursor-pointer ${
              activeCitizenTab === item.id 
                ? 'bg-white/10 border-[#FFB020]/30 text-white scale-105' 
                : 'bg-[#112240]/40 border-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-[8px] font-bold tracking-tight truncate w-full">{item.label}</span>
          </button>
        ))}
      </div>

      {/* SECTION CITIZEN CONTENT */}
      {activeCitizenTab === 'news' && (
        <div className="space-y-4 animate-fade-in">
          {/* WARNING ALERTS */}
          {demoCommuneAlerts.slice(0, 2).map(alert => (
            <div key={alert.id} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-[#FFB020] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-[#FFB020]">{alert.title}</h4>
                <p className="text-white/80 font-sans leading-relaxed text-[11px]">{alert.description}</p>
                <span className="text-[9px] text-white/40 block mt-1">Publié le {alert.date}</span>
              </div>
            </div>
          ))}

          {/* NEWS LIST */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest block">📢 Actualités Municipales</h3>
            {demoCommuneNews.map(n => (
              <div key={n.id} className="glass-panel p-4.5 border-white/8 rounded-2xl bg-[#112240]/40 space-y-2 font-sans text-xs">
                <h4 className="font-extrabold text-white leading-snug">{n.title}</h4>
                <p className="text-white/75 font-sans leading-relaxed text-[11px]">{n.content}</p>
                <span className="text-[9px] text-white/30 block">Actualité du {n.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCitizenTab === 'agenda' && (
        <div className="space-y-3.5 animate-fade-in font-sans text-xs">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest block">📅 Événements Communaux</h3>
          {demoCommuneEvents.map(evt => (
            <div key={evt.id} className="p-4 bg-[#112240]/40 border border-white/8 rounded-2xl flex justify-between items-center">
              <div className="space-y-1.5 pr-4">
                <h4 className="font-bold text-white text-[13px]">{evt.title}</h4>
                <p className="text-[11px] text-white/60 leading-relaxed font-sans">{evt.description}</p>
              </div>
              <div className="text-center shrink-0 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl min-w-[64px]">
                <span className="text-[13px] font-black text-purple-300 block leading-none">{evt.date.split('-')[2]}</span>
                <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wide block mt-1">Juin</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCitizenTab === 'demarches' && (
        <div className="space-y-4 animate-fade-in font-sans text-xs">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest block">📝 Mes Démarches en Ligne</h3>
            <button 
              onClick={handleAddProcedure}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-[#07111F] rounded-lg text-[9px] font-black uppercase transition cursor-pointer"
            >
              + Nouvelle Démarche
            </button>
          </div>

          <div className="space-y-2.5">
            {myProcedures.map(proc => (
              <div key={proc.id} className="p-3.5 bg-[#112240]/40 border border-white/8 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">{proc.title}</h4>
                  <p className="text-[9px] text-white/40 mt-0.5">Créée le {proc.date}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-bold ${
                  proc.status === 'Validée' 
                    ? 'bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30' 
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {proc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCitizenTab === 'signalements' && (
        <div className="space-y-4 animate-fade-in font-sans text-xs">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest block">⚠️ Mes Signalements d'incidents</h3>
            <button 
              onClick={() => setShowSignalementModal(true)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-[#07111F] rounded-lg text-[9px] font-black uppercase transition cursor-pointer"
            >
              + Signaler anomalie
            </button>
          </div>

          {/* Incidents List */}
          <div className="space-y-3">
            {demoSignalements.map(sig => (
              <div key={sig.id} className="p-4 bg-[#112240]/40 border border-white/8 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-extrabold uppercase">
                      {sig.category}
                    </span>
                    <h4 className="font-bold text-white mt-1.5">{sig.title}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    sig.status === 'Résolu' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : sig.status === 'En cours'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-white/10 text-white/50'
                  }`}>
                    {sig.status}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed font-sans">{sig.description}</p>
                {sig.agentComment && (
                  <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[10px] text-amber-300 font-sans">
                    <strong>Log Intervention :</strong> {sig.agentComment}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCitizenTab === 'sondages' && (
        <div className="space-y-4 animate-fade-in font-sans text-xs">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest block">🗳️ Consultations citoyennes actives</h3>
          {demoCommunePolls.map(poll => {
            const hasVoted = poll.options.some((opt: any) => opt.votes.includes(demoProfileId));
            return (
              <div key={poll.id} className="p-5 bg-[#112240]/40 border border-white/8 rounded-2xl space-y-3">
                <h4 className="font-extrabold text-white text-[13px]">{poll.question}</h4>
                <p className="text-[11px] text-white/60 leading-relaxed font-sans">{poll.description}</p>
                
                <div className="space-y-2 pt-2">
                  {poll.options.map((opt: any, optIdx: number) => {
                    const optVotes = opt.votes.length;
                    const totalVotes = poll.options.reduce((acc: number, curr: any) => acc + curr.votes.length, 0) || 1;
                    const percentage = Math.round((optVotes / totalVotes) * 100);
                    const userVotedForThis = opt.votes.includes(demoProfileId);

                    return (
                      <button
                        key={optIdx}
                        disabled={hasVoted}
                        onClick={() => handleVotePoll(poll.id, optIdx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs relative overflow-hidden font-sans cursor-pointer ${
                          userVotedForThis 
                            ? 'border-[#FFB020] bg-[#FFB020]/10' 
                            : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="absolute left-0 top-0 bottom-0 bg-[#FFB020]/10 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                        <div className="relative z-10 flex justify-between items-center">
                          <span className="font-semibold text-white">{opt.text}</span>
                          <span className="font-bold text-[#FFB020] font-mono">{percentage}% ({optVotes})</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SIGNALEMENT CREATION MODAL */}
      {showSignalementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="glass-panel border-white/15 bg-[#0a1424] p-6 rounded-[28px] max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-black text-white">Signaler un Incident technique</h3>
              <button onClick={() => setShowSignalementModal(false)} className="p-1 text-white/40 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSignalementSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] text-white/50 uppercase font-bold">Catégorie</label>
                <select 
                  value={sigCat} 
                  onChange={(e) => setSigCat(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-[#FFB020]"
                >
                  <option value="Voirie" className="bg-[#0a1424] text-white">Voirie (Nid de poule...)</option>
                  <option value="Éclairage Public" className="bg-[#0a1424] text-white">Éclairage Public</option>
                  <option value="Propreté" className="bg-[#0a1424] text-white">Propreté (Déchets sauvages...)</option>
                  <option value="Assainissement" className="bg-[#0a1424] text-white">Assainissement (Caniveau...)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-white/50 uppercase font-bold">Titre succinct</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Nid de poule Avenue Foch"
                  value={sigTitle}
                  onChange={(e) => setSigTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-white/50 uppercase font-bold">Description complète</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Expliquez la localisation exacte de l'anomalie..."
                  value={sigDesc}
                  onChange={(e) => setSigDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs focus:outline-none"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-[#FFB020] text-[#07111F] rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-md"
              >
                Envoyer le signalement
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// 🏫 SCHOOL PARENT PORTAL [NEW] (MON ÉTABLISSEMENT)
// ==========================================
interface DemoSchoolParentPortalProps {
  demoProfileId: string;
  demoSchoolPresence: any;
  demoSchoolPresenceHistory: any[];
  setDemoSchoolPresenceHistory: React.SetStateAction<any>;
  demoSchoolCantine: any;
  setDemoSchoolCantine: React.SetStateAction<any>;
  demoSchoolCantineHistory: any[];
  setDemoSchoolCantineHistory: React.SetStateAction<any>;
  demoTransactions: any[];
  setDemoTransactions: React.SetStateAction<any>;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.SetStateAction<any>;
  demoSchoolComms: any[];
  demoTeacherParentMessages: any[];
  setDemoTeacherParentMessages: React.SetStateAction<any>;
  demoSchoolTrips: any[];
  setDemoSchoolTrips: React.SetStateAction<any>;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
  onBack: () => void;
}

export const DemoSchoolParentPortal: React.FC<DemoSchoolParentPortalProps> = ({
  demoProfileId,
  demoSchoolPresence,
  demoSchoolCantine,
  demoTransactions,
  setDemoTransactions,
  demoSchoolHomework,
  demoSchoolComms,
  demoTeacherParentMessages,
  setDemoTeacherParentMessages,
  demoSchoolTrips,
  setDemoSchoolTrips,
  triggerDemoNotification,
  onBack
}) => {
  const [selectedChild, setSelectedChild] = useState<'demo_issa' | 'demo_lyna'>('demo_issa');
  const [activeParentTab, setActiveParentTab] = useState<'presence' | 'devoirs' | 'agenda' | 'messages' | 'cantine'>('presence');

  const childName = selectedChild === 'demo_issa' ? 'Issa' : 'Lyna';
  const childClass = selectedChild === 'demo_issa' ? 'CE2' : 'Première';
  const childSchool = selectedChild === 'demo_issa' ? 'École Victor Hugo' : 'Lycée Simone Veil';
  const teacherName = selectedChild === 'demo_issa' ? 'M. Bernard' : 'Mme Leroy';
  const teacherId = selectedChild === 'demo_issa' ? 'demo_school_primary_teacher' : 'demo_school_high_teacher';

  const childPresence = demoSchoolPresence[selectedChild] || { status: 'Non fait', time: '08:00' };
  const childHomework = demoSchoolHomework.filter(hw => hw.class === childClass);
  const childTrips = demoSchoolTrips.filter(t => t.school.includes(childClass));

  // Chat messaging
  const [parentMsgInput, setParentMsgInput] = useState('');
  const chatMessages = demoTeacherParentMessages.filter(
    m => (m.senderId === 'demo_papa' && m.receiverId === teacherId) ||
         (m.senderId === teacherId && m.receiverId === 'demo_papa')
  );

  const handleSendSchoolMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentMsgInput.trim()) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];
    const newMsg = {
      id: `tm-dynamic-${Date.now()}`,
      senderId: 'demo_papa',
      senderName: 'Mamadou Diop',
      receiverId: teacherId,
      receiverName: teacherName,
      content: parentMsgInput.trim(),
      timestamp: time,
      date: dateStr,
      read: true
    };

    setDemoTeacherParentMessages((prev: any[]) => [...prev, newMsg]);
    setParentMsgInput('');

    setTimeout(() => {
      const reply = {
        id: `tm-dynamic-reply-${Date.now()}`,
        senderId: teacherId,
        senderName: teacherName,
        receiverId: 'demo_papa',
        receiverName: 'Mamadou Diop',
        content: `Bonjour M. Diop, j'ai bien pris note de votre message concernant ${childName}. À votre disposition.`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: dateStr,
        read: false
      };
      setDemoTeacherParentMessages((prev: any[]) => [...prev, reply]);
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "💬 Nouveau Message",
          `${teacherName} (Enseignant) a répondu à votre message.`,
          "chat"
        );
      }
    }, 1500);
  };

  const handleApproveTrip = (tripId: string) => {
    setDemoSchoolTrips((prev: any[]) => prev.map((t: any) => {
      if (t.id === tripId) {
        // Charge transaction from account
        const chargeTx = {
          id: `dt-dynamic-${Date.now()}`,
          amount: -t.cost,
          type: 'expense',
          category: 'Éducation',
          title: `Paiement ${t.title} (${childName})`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          memberId: 'demo_papa'
        };
        setDemoTransactions((prevTx: any[]) => [chargeTx, ...prevTx]);

        if (triggerDemoNotification) {
          triggerDemoNotification(
            "🚌 Autorisation Accordée",
            `M. Diop a autorisé la sortie "${t.title}" pour ${childName} (-${t.cost}€)`,
            "ecole"
          );
        }
        return { ...t, status: 'validated_admin', parentPermission: true, paid: true };
      }
      return t;
    }));
    alert("✅ Autorisation signée et transaction de cantine/scolaire réglée avec succès !");
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto font-sans text-white">
      
      {/* HEADER PORTAIL */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#4F8CFF]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Mon Établissement</h1>
            <p className="text-xs text-white/50 font-medium">Espace Parent d'Élève 🏫</p>
          </div>
        </div>
      </div>

      {/* CHILD SWITCHER DROP-DOWN */}
      <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/8 font-sans text-xs">
        <span className="text-white/50 font-bold">Élève suivi :</span>
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value as any)}
          className="bg-[#0e172a] text-[#4F8CFF] border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none font-bold text-xs cursor-pointer"
        >
          <option value="demo_issa">Issa Diop (CE2 - Victor Hugo)</option>
          <option value="demo_lyna">Lyna Diop (1ère - Simone Veil)</option>
        </select>
      </div>

      {/* HERO BANNER CARD */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/8 shadow-xl h-44 flex flex-col justify-end p-5">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
        <img 
          src={selectedChild === 'demo_issa' 
            ? "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80"
            : "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=80"
          } 
          alt={childSchool} 
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        />
        <div className="relative z-20 space-y-1">
          <h2 className="text-base font-black tracking-tight text-white">{childSchool}</h2>
          <p className="text-[10px] text-white/75 font-sans leading-relaxed">Bienvenue dans l'espace de suivi scolaire de {childName}.</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-md text-[9px] font-black uppercase">
            Classe : {childClass}
          </span>
        </div>
      </div>

      {/* INTERACTIVE ACTION ICONS GRID */}
      <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
        {[
          { id: 'presence', label: 'Présences', icon: UserCheck, color: 'text-emerald-400' },
          { id: 'devoirs', label: 'Devoirs', icon: BookOpen, color: 'text-blue-400' },
          { id: 'agenda', label: 'Agenda', icon: Calendar, color: 'text-purple-400' },
          { id: 'messages', label: 'Messages', icon: MessageSquare, color: 'text-[#FF4D6D]' },
          { id: 'cantine', label: 'Cantine', icon: UtensilsCrossed, color: 'text-amber-400' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveParentTab(item.id as any)}
            className={`p-2.5 rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition border cursor-pointer ${
              activeParentTab === item.id 
                ? 'bg-white/10 border-[#4F8CFF]/30 text-white scale-105' 
                : 'bg-[#112240]/40 border-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-[8px] font-bold tracking-tight truncate w-full">{item.label}</span>
          </button>
        ))}
      </div>

      {/* SECTION PARENT CONTENT */}
      {activeParentTab === 'presence' && (
        <div className="space-y-4 animate-fade-in text-xs font-sans">
          {/* PRÉSENCE TODAY */}
          <div className="glass-panel p-4 rounded-2xl border border-white/8 bg-[#112240]/40 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{childPresence.status === 'Présent' ? '✅' : '⏳'}</span>
              <div>
                <h4 className="font-extrabold text-white">Statut présence du jour</h4>
                <p className="text-[10px] text-white/50 font-medium">
                  {childPresence.status === 'Présent' 
                    ? `${childName} a été enregistré présent à ${childPresence.time || '08h12'}.`
                    : `${childName} n'a pas encore fait l'appel de classe ce matin.`
                  }
                </p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
              childPresence.status === 'Présent' ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {childPresence.status}
            </span>
          </div>

          {/* PRESENCE HISTORY LOGS */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Historique des présences</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between">
                <span className="text-white/70">Hier ({new Date(Date.now() - 86400000).toISOString().split('T')[0]})</span>
                <span className="text-[#00D26A] font-bold">Présent</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between">
                <span className="text-white/70">Avant-hier ({new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]})</span>
                <span className="text-[#00D26A] font-bold">Présent</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between">
                <span className="text-white/70">Il y a 3 jours ({new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0]})</span>
                <span className="text-amber-400 font-bold">Retard (15 min)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeParentTab === 'devoirs' && (
        <div className="space-y-4 animate-fade-in text-xs font-sans">
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Cahier de textes de {childName}</h3>
            <div className="space-y-2.5">
              {childHomework.map(hw => (
                <div key={hw.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-extrabold uppercase">
                      {hw.subject}
                    </span>
                    <h4 className="font-bold text-white mt-1.5">{hw.title}</h4>
                    <span className="text-[9px] text-white/40 block mt-0.5">Pour le : {hw.dueDate}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    hw.done ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {hw.done ? 'Fait' : 'À faire'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeParentTab === 'agenda' && (
        <div className="space-y-4 animate-fade-in text-xs font-sans">
          {/* SORTIES SCOLAIRES */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">🚌 Voyages & Sorties Scolaires</h3>
            <div className="space-y-3">
              {childTrips.length > 0 ? (
                childTrips.map(trip => (
                  <div key={trip.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white">{trip.title}</h4>
                        <p className="text-[10px] text-white/50">{trip.date} • {trip.description}</p>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold shrink-0">{trip.cost} €</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px]">
                      <span className="text-white/40">Statut :</span>
                      {trip.status === 'pending_parent' ? (
                        <button
                          onClick={() => handleApproveTrip(trip.id)}
                          className="px-3 py-1.5 bg-[#4F8CFF] hover:bg-blue-600 text-white rounded-lg font-black uppercase transition active:scale-95 cursor-pointer shadow-md"
                        >
                          Signer & Payer
                        </button>
                      ) : (
                        <span className="text-[#00D26A] font-extrabold uppercase bg-[#00D26A]/15 px-2 py-0.5 rounded border border-[#00D26A]/20">
                          {trip.status === 'validated_admin' ? 'Approuvé & Réglé' : 'En attente direction'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/40 text-center">Aucune sortie planifiée.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeParentTab === 'messages' && (
        <div className="space-y-4 animate-fade-in font-sans text-xs">
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">✉️ Enseignant : {teacherName}</h3>
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {chatMessages.length > 0 ? (
                chatMessages.map(m => (
                  <div key={m.id} className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                    m.senderId === 'demo_papa' 
                      ? 'bg-[#4F8CFF] text-white ml-auto' 
                      : 'bg-white/5 border border-white/5 text-white mr-auto'
                  }`}>
                    <span className="text-[8px] opacity-60 block mb-1">{m.senderName} • {m.timestamp}</span>
                    <p className="leading-relaxed font-sans">{m.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/40 text-center">Aucune discussion en cours.</p>
              )}
            </div>
            <form onSubmit={handleSendSchoolMsg} className="flex space-x-2 pt-2 border-t border-white/5">
              <input
                type="text"
                placeholder={`Poser une question à ${teacherName}...`}
                value={parentMsgInput}
                onChange={(e) => setParentMsgInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button type="submit" className="p-2.5 bg-[#4F8CFF] text-white rounded-xl transition cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {activeParentTab === 'cantine' && (
        <div className="space-y-4 animate-fade-in text-xs font-sans">
          {/* CANTINE MENU */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🥗 Menu Scolaire de la semaine</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#4F8CFF]">Lundi</span>
                <span className="text-white/70 text-right">Carottes râpées, Rôti de dinde & Frites</span>
              </div>
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#4F8CFF]">Mardi</span>
                <span className="text-white/70 text-right">Lasagnes Bolognaises, Salade verte</span>
              </div>
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#4F8CFF]">Jeudi</span>
                <span className="text-white/70 text-right">Poisson pané, Purée maison & Compote</span>
              </div>
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="font-bold text-[#4F8CFF]">Vendredi</span>
                <span className="text-white/70 text-right">Poulet rôti, Petits pois & Glace</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// 🏫 SCHOOL PORTAL (DIRECTION & TEACHER PORTAL)
// ==========================================
interface DemoSchoolSpaceProps {
  demoProfileId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoSchoolPresence: any;
  setDemoSchoolPresence: React.SetStateAction<any>;
  demoSchoolPresenceHistory: any[];
  setDemoSchoolPresenceHistory: React.SetStateAction<any>;
  demoSchoolCantine: any;
  setDemoSchoolCantine: React.SetStateAction<any>;
  demoSchoolCantineHistory: any[];
  setDemoSchoolCantineHistory: React.SetStateAction<any>;
  demoTransactions: any[];
  setDemoTransactions: React.SetStateAction<any>;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.SetStateAction<any>;
  demoSchoolComms: any[];
  setDemoSchoolComms: React.SetStateAction<any>;
  demoTeacherParentMessages: any[];
  setDemoTeacherParentMessages: React.SetStateAction<any>;
  demoSchoolTrips: any[];
  setDemoSchoolTrips: React.SetStateAction<any>;
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

    setDemoSchoolComms((prev: any[]) => [newComm, ...prev]);
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
    setDemoSchoolTrips((prev: any[]) => prev.map((t: any) => {
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
    setDemoSchoolComms((prev: any[]) => prev.filter((c: any) => c.id !== id));
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

    setDemoSchoolHomework((prev: any[]) => [newHw, ...prev]);
    setHwSubject('');
    setHwTitle('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "📚 Nouveau Devoir",
        `Enseignant a assigné un devoir en ${newHw.subject} pour la classe de ${activeClass}`,
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

    setDemoSchoolTrips((prev: any[]) => [newTrip, ...prev]);
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

    setDemoTeacherParentMessages((prev: any[]) => [...prev, newMsg]);
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
      setDemoTeacherParentMessages((prev: any[]) => [...prev, reply]);
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
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📋 Registre des absences & retards ({activeClass})</h3>
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

          {/* TEACHERS LIST INSTEAD OF PEDAGOGIE DEVOIRS DETAILED */}
          {activeTab === 'enseignants' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">👥 Corps Enseignant de l'Établissement</h3>
              <div className="space-y-3">
                {isPrimary ? (
                  <>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans">
                      <div>
                        <h4 className="font-bold text-white">M. Bernard</h4>
                        <p className="text-[10px] text-white/50 mt-0.5">Enseignant Principal - Classe de CE2</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#00D26A]/20 text-[#00D26A] rounded text-[9px] font-extrabold uppercase">Actif</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans opacity-70">
                      <div>
                        <h4 className="font-bold text-white">Mme Petit</h4>
                        <p className="text-[10px] text-white/50 mt-0.5">Enseignante CM1</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-white/10 text-white/60 rounded text-[9px] font-extrabold uppercase">Hors Ligne</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans">
                      <div>
                        <h4 className="font-bold text-white">Mme Leroy</h4>
                        <p className="text-[10px] text-white/50 mt-0.5">Professeur Principal - Classe de Première</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#00D26A]/20 text-[#00D26A] rounded text-[9px] font-extrabold uppercase">Actif</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans opacity-70">
                      <div>
                        <h4 className="font-bold text-white">M. Fournier</h4>
                        <p className="text-[10px] text-white/50 mt-0.5">Enseignant Mathématiques</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-white/10 text-white/60 rounded text-[9px] font-extrabold uppercase">Hors Ligne</span>
                    </div>
                  </>
                )}
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
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1 col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Élèves suivis</span>
                  <p className="text-xl font-black text-[#6C5CFF]">{totalStudents} inscrits</p>
                </div>
              </div>

              {/* LISTE CLASSE ROSTER */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">👥 Trombinoscope de la classe ({activeClass})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                  {roster.map(student => (
                    <div key={student.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                          {student.id === 'demo_issa' ? '👦' : student.id === 'demo_lyna' ? '👧' : '👤'}
                        </div>
                        <span className="font-semibold text-white">{student.name}</span>
                      </div>
                      <span className="text-[9px] text-white/40">{student.id === 'demo_issa' || student.id === 'demo_lyna' ? 'Foyer Diop' : 'Élève'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📝 Faire l'appel en direct ({activeClass})</h3>
              <div className="space-y-2.5">
                {roster.map(student => {
                  const state = demoSchoolPresence[student.id] || { status: 'Non fait', time: '' };
                  return (
                    <div key={student.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 text-xs">
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-white">{student.name}</h4>
                        {state.time && <p className="text-[9px] text-white/45">Pointé à {state.time}</p>}
                      </div>
                      <div className="flex space-x-1">
                        {(['Présent', 'Absent', 'Retard'] as const).map(st => (
                          <button
                            key={st}
                            onClick={() => handleMarkPresence(student.id, st)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase border transition active:scale-95 cursor-pointer ${
                              state.status === st 
                                ? st === 'Présent' 
                                  ? 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/30'
                                  : st === 'Absent'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'devoirs' && (
            <div className="space-y-6">
              {/* ASSIGN HOMEWORK */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📝 Assigner un nouveau devoir de {activeClass}</h3>
                <form onSubmit={handleAddHomework} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Matière (ex: Mathématiques)"
                      required
                      value={hwSubject}
                      onChange={(e) => setHwSubject(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Titre du devoir (ex: Exercices multiplication)"
                      required
                      value={hwTitle}
                      onChange={(e) => setHwTitle(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#00D26A] text-[#07111F] rounded-xl font-bold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer text-xs">
                    <Plus className="w-4 h-4" />
                    <span>Assigner le devoir</span>
                  </button>
                </form>
              </div>

              {/* LIST DEVOIRS */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Historique des devoirs de classe</h3>
                <div className="space-y-2">
                  {demoSchoolHomework.filter(h => h.class === activeClass).map(h => (
                    <div key={h.id} className="p-3.5 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center font-sans">
                      <div>
                        <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">{h.subject}</span>
                        <h4 className="font-bold text-white mt-1">{h.title}</h4>
                        <span className="text-[9px] text-white/40 block">Pour : {h.dueDate}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        h.done ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {h.done ? 'Rendu par l\'élève' : 'Non rendu'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sorties' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">🚌 Planifier une sortie scolaire</h3>
                <button 
                  onClick={handleCreateTrip}
                  className="px-3 py-1.5 bg-[#00D26A] text-[#07111F] rounded-xl text-[10px] font-black uppercase transition active:scale-95 cursor-pointer"
                >
                  + Nouvelle Sortie
                </button>
              </div>
              
              <div className="space-y-3">
                {demoSchoolTrips.filter(t => t.school.includes(activeClass)).map(trip => (
                  <div key={trip.id} className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center font-sans">
                    <div>
                      <h4 className="font-bold text-white">{trip.title}</h4>
                      <p className="text-[10px] text-white/50">{trip.date} • {trip.description} • Coût: {trip.cost} €</p>
                      <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md mt-1 border ${
                        trip.status === 'validated_admin' 
                          ? 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/30'
                          : trip.status === 'pending_parent'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {trip.status === 'validated_admin' ? 'Validée & Payée' : trip.status === 'pending_parent' ? 'En attente parents' : 'En attente direction'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">💬 Discussion avec les parents Diop ({chatStudentName})</h3>
              
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {classMessages.map(m => (
                  <div key={m.id} className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                    m.senderId === demoProfileId 
                      ? 'bg-[#00D26A] text-[#07111F] ml-auto font-medium' 
                      : 'bg-white/5 border border-white/5 text-white mr-auto'
                  }`}>
                    <span className="text-[8px] opacity-60 block mb-1">{m.senderName} • {m.timestamp}</span>
                    <p className="leading-relaxed font-sans">{m.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendParentMsg} className="flex space-x-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  placeholder="Écrire aux parents..."
                  value={parentChatMsg}
                  onChange={(e) => setParentChatMsg(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button type="submit" className="p-2.5 bg-[#00D26A] text-[#07111F] rounded-xl transition cursor-pointer">
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
// 🏛️ COMMUNE SPACE (ADMIN / TECHNICAL AGENT PORTALS)
// ==========================================
interface DemoCommuneSpaceProps {
  demoProfileId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoCommuneAlerts: any[];
  setDemoCommuneAlerts: React.SetStateAction<any>;
  demoCommuneNews: any[];
  setDemoCommuneNews: React.SetStateAction<any>;
  demoCommuneEvents: any[];
  setDemoCommuneEvents: React.SetStateAction<any>;
  demoCommunePolls: any[];
  setDemoCommunePolls: React.SetStateAction<any>;
  demoSignalements: any[];
  setDemoSignalements: React.SetStateAction<any>;
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

    setDemoCommuneNews((prev: any[]) => [newNews, ...prev]);
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
    setDemoCommuneNews((prev: any[]) => prev.filter((n: any) => n.id !== id));
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

    setDemoCommuneAlerts((prev: any[]) => [newAlert, ...prev]);
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
    setDemoCommuneAlerts((prev: any[]) => prev.filter((a: any) => a.id !== id));
  };

  // --- MAYOR CRUD EVENTS ---
  const [newEvtTitle, setNewEvtTitle] = useState('');
  const [newEvtDesc, setNewEvtDesc] = useState('');
  
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvtTitle.trim() || !newEvtDesc.trim()) return;

    const newEvt = {
      id: `ce-${Date.now()}`,
      title: newEvtTitle.trim(),
      description: newEvtDesc.trim(),
      date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      time: '14:00'
    };

    setDemoCommuneEvents((prev: any[]) => [newEvt, ...prev]);
    setNewEvtTitle('');
    setNewEvtDesc('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "📅 Nouvel Événement Mairie",
        `Événement communal : "${newEvt.title}"`,
        "commune"
      );
    }
    alert("📅 Événement ajouté à l'agenda communal !");
  };

  const handleCancelEvent = (id: string) => {
    setDemoCommuneEvents((prev: any[]) => prev.filter((e: any) => e.id !== id));
    alert("❌ Événement annulé !");
  };

  // --- MAYOR CRUD POLLS ---
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollDesc, setNewPollDesc] = useState('');
  const [newPollOpt1, setNewPollOpt1] = useState('');
  const [newPollOpt2, setNewPollOpt2] = useState('');

  const handleAddPoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollQuestion.trim() || !newPollDesc.trim() || !newPollOpt1.trim() || !newPollOpt2.trim()) return;

    const newPoll = {
      id: `cp-${Date.now()}`,
      question: newPollQuestion.trim(),
      description: newPollDesc.trim(),
      options: [
        { text: newPollOpt1.trim(), votes: [] },
        { text: newPollOpt2.trim(), votes: [] }
      ],
      active: true,
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
    };

    setDemoCommunePolls((prev: any[]) => [newPoll, ...prev]);
    setNewPollQuestion('');
    setNewPollDesc('');
    setNewPollOpt1('');
    setNewPollOpt2('');
    
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🗳️ Nouvelle Consultation",
        `Sondage citoyen : "${newPoll.question}"`,
        "commune"
      );
    }
    alert("🗳️ Consultation citoyenne publiée en ligne !");
  };

  const handleClosePoll = (id: string) => {
    setDemoCommunePolls((polls: any[]) => polls.map(p => p.id === id ? { ...p, active: false } : p));
    alert("🗳️ Consultation clôturée.");
  };

  // --- AGENT INTERVENTIONS ---
  const [agentComments, setAgentComments] = useState<Record<string, string>>({});

  const handleTakeCharge = (sigId: string) => {
    setDemoSignalements((prev: any[]) => prev.map(s => {
      if (s.id === sigId) {
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "🛠️ Intervention en cours",
            `L'agent municipal a pris en charge l'anomalie: "${s.title}"`,
            "commune"
          );
        }
        return { ...s, status: 'En cours', assignedAgentId: 'agent-1', assignedAgentName: 'Agent Terrain' };
      }
      return s;
    }));
  };

  const handleAddAgentComment = (sigId: string, comment: string) => {
    if (!comment.trim()) return;
    setDemoSignalements((prev: any[]) => prev.map(s => {
      if (s.id === sigId) {
        return { ...s, agentComment: comment.trim() };
      }
      return s;
    }));
    setAgentComments(prev => ({ ...prev, [sigId]: '' }));
    alert("📝 Commentaire technique enregistré !");
  };

  const handleTransferTask = (sigId: string, service: string) => {
    setDemoSignalements((prev: any[]) => prev.map(s => {
      if (s.id === sigId) {
        return { ...s, category: service, agentComment: `Transféré au service technique : ${service}` };
      }
      return s;
    }));
    alert(`💼 Ticket transféré avec succès au service : ${service}`);
  };

  const handleResolveSignalement = (sigId: string) => {
    setDemoSignalements((prev: any[]) => prev.map(s => {
      if (s.id === sigId) {
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "✅ Signalement Résolu",
            `L'incident "${s.title}" a été réparé par les services techniques municipaux.`,
            "commune"
          );
        }
        return { ...s, status: 'Résolu', agentComment: "Intervention technique terminée. Problème résolu." };
      }
      return s;
    }));
    alert("✅ Intervention clôturée ! Une notification de fermeture a été envoyée.");
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
          <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-[#FFB020]">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Ville de Cormeilles</h1>
            <p className="text-xs text-white/50 font-medium">Espace {isAgent ? "Technique Terrain" : "Mairie M. Le Maire"}</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase bg-yellow-500/10 border border-yellow-500/25 text-[#FFB020] px-3.5 py-1.5 rounded-full tracking-wider">
          {isAgent ? '👷 SERVICES TECHNIQUES' : '🏛️ MAIRIE ADMIN'}
        </span>
      </div>

      {/* ====================================================
          A. MAYOR PORTAL (Mairie M. Le Maire)
          ==================================================== */}
      {!isAgent && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6 animate-fade-in">
              {/* STATS GENERALS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Habitants enregistrés</span>
                  <p className="text-2xl font-black text-white">8 450 foyers</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Signalements actifs</span>
                  <p className="text-2xl font-black text-amber-400">{demoSignalements.filter(s => s.status !== 'Résolu').length} tickets</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Taux Participation</span>
                  <p className="text-2xl font-black text-emerald-400">74 %</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Écoles connectées</span>
                  <p className="text-2xl font-black text-[#6C5CFF]">2 / 2 complexes</p>
                </div>
              </div>

              {/* CRUD NEWS */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📢 Publier une actualité municipale (Mairie)</h3>
                <form onSubmit={handleAddNews} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      placeholder="Titre de l'actualité"
                      required
                      value={newNewsTitle}
                      onChange={(e) => setNewNewsTitle(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    />
                    <textarea
                      placeholder="Contenu éditorial détaillé de la communication..."
                      required
                      rows={3}
                      value={newNewsContent}
                      onChange={(e) => setNewNewsContent(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFB020] font-sans text-xs"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#FFB020] text-[#07111F] rounded-xl font-extrabold uppercase flex items-center justify-center space-x-2 text-xs tracking-wider cursor-pointer">
                    <Send className="w-4 h-4" />
                    <span>Diffuser l'actualité</span>
                  </button>
                </form>

                {/* News list admin */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h4 className="text-[10px] font-black uppercase text-white/45 tracking-widest">Dernières publications</h4>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {demoCommuneNews.map(n => (
                      <div key={n.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-start font-sans">
                        <div>
                          <h5 className="font-bold text-white">{n.title}</h5>
                          <p className="text-[10px] text-white/50">{n.date} • {n.content.substring(0, 70)}...</p>
                        </div>
                        <button onClick={() => handleDeleteNews(n.id)} className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg">
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
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🚧 Publier une alerte de travaux / coupure (Push)</h3>
              <form onSubmit={handleAddAlert} className="space-y-3 text-xs">
                <input
                  type="text"
                  placeholder="Titre de l'alerte (ex: Travaux Rue Verte)"
                  required
                  value={newAlertTitle}
                  onChange={(e) => setNewAlertTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                />
                <textarea
                  placeholder="Conséquences (ex: circulation coupée de 9h à 17h, coupure d'eau)..."
                  required
                  rows={2}
                  value={newAlertDesc}
                  onChange={(e) => setNewAlertDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#FFB020]"
                />
                <button type="submit" className="w-full py-2.5 bg-[#FFB020] text-[#07111F] rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer">
                  Alerter les habitants en direct
                </button>
              </form>

              {/* Alert list */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <h4 className="text-[10px] font-black uppercase text-white/45 tracking-widest font-sans">Alertes actives</h4>
                <div className="space-y-2">
                  {demoCommuneAlerts.map(a => (
                    <div key={a.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center font-sans">
                      <div>
                        <h5 className="font-bold text-white">{a.title}</h5>
                        <p className="text-[10px] text-white/45">{a.description}</p>
                      </div>
                      <button onClick={() => handleDeleteAlert(a.id)} className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evenements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📅 Créer un événement communal (Agenda citoyen)</h3>
              <form onSubmit={handleAddEvent} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nom de l'événement"
                    required
                    value={newEvtTitle}
                    onChange={(e) => setNewEvtTitle(e.target.value)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    placeholder="Description (ex: Brocante)"
                    required
                    value={newEvtDesc}
                    onChange={(e) => setNewEvtDesc(e.target.value)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#FFB020] text-[#07111F] rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer">
                  Planifier l'événement
                </button>
              </form>

              {/* Event list */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                {demoCommuneEvents.map(e => (
                  <div key={e.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center font-sans">
                    <div>
                      <h5 className="font-bold text-white">{e.title}</h5>
                      <p className="text-[9px] text-white/45">{e.date} • {e.description}</p>
                    </div>
                    <button onClick={() => handleCancelEvent(e.id)} className="text-red-400 text-[9px] font-bold uppercase hover:bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20">
                      Annuler
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sondages' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">🗳️ Créer une Consultation citoyenne</h3>
              <form onSubmit={handleAddPoll} className="space-y-3 text-xs">
                <input
                  type="text"
                  placeholder="Question posée (ex: Réaménagement parc)"
                  required
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Description détaillée de la consultation..."
                  required
                  value={newPollDesc}
                  onChange={(e) => setNewPollDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Option A"
                    required
                    value={newPollOpt1}
                    onChange={(e) => setNewPollOpt1(e.target.value)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    placeholder="Option B"
                    required
                    value={newPollOpt2}
                    onChange={(e) => setNewPollOpt2(e.target.value)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#FFB020] text-[#07111F] rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer">
                  Diffuser le sondage
                </button>
              </form>

              {/* Poll list */}
              <div className="space-y-3 pt-3 border-t border-white/5 font-sans">
                {demoCommunePolls.map(p => (
                  <div key={p.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <h5 className="font-bold text-white">{p.question}</h5>
                      {p.active ? (
                        <button onClick={() => handleClosePoll(p.id)} className="text-amber-400 text-[9px] font-bold border border-amber-500/20 px-2 py-0.5 rounded">Clôturer</button>
                      ) : (
                        <span className="text-white/40 text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded">Clôturé</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'signalements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 animate-fade-in font-sans text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">⚠️ Dossier technique des incidents signalés</h3>
              <div className="space-y-3">
                {demoSignalements.map(sig => (
                  <div key={sig.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-extrabold uppercase">
                          {sig.category}
                        </span>
                        <h4 className="font-bold text-white mt-1.5">{sig.title}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        sig.status === 'Résolu' ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-amber-500/20 text-[#FFB020]'
                      }`}>
                        {sig.status}
                      </span>
                    </div>
                    <p className="text-white/60 font-sans">{sig.description}</p>
                    {sig.agentComment && <p className="p-2 bg-white/5 rounded border border-white/5 text-[9px] text-[#FF9F1C] italic">Agent : {sig.agentComment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ====================================================
          B. TECHNICAL AGENT PORTAL (Agent Municipal)
          ==================================================== */}
      {isAgent && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1 text-center">
                  <span className="text-[8px] font-bold text-white/45 uppercase tracking-wider block">Mes Interventions</span>
                  <p className="text-2xl font-black text-white">{demoSignalements.filter(s => s.status === 'En cours').length}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1 text-center">
                  <span className="text-[8px] font-bold text-white/45 uppercase tracking-wider block">Tickets en attente</span>
                  <p className="text-2xl font-black text-[#FFB020]">{demoSignalements.filter(s => s.status === 'Nouveau' || s.status === 'En attente').length}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-[#112240]/40 space-y-1 text-center">
                  <span className="text-[8px] font-bold text-white/45 uppercase tracking-wider block">Clôturés (24h)</span>
                  <p className="text-2xl font-black text-[#00D26A]">4</p>
                </div>
              </div>

              {/* LIST ANOMALIES */}
              <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🛠️ Tâches urgentes assignées / interventions</h3>
                <div className="space-y-3 font-sans text-xs">
                  {demoSignalements.filter(s => s.status === 'En cours').map(sig => (
                    <div key={sig.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] bg-[#6C5CFF]/20 border border-[#6C5CFF]/30 text-[#9E94FF] px-2 py-0.5 rounded font-extrabold uppercase">
                            {sig.category}
                          </span>
                          <h4 className="font-bold text-white mt-1.5">{sig.title}</h4>
                        </div>
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">En cours</span>
                      </div>
                      
                      <p className="text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{sig.description}</p>
                      
                      {sig.agentComment && (
                        <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-[#FF9F1C] rounded-lg">
                          <strong>Log Agent :</strong> {sig.agentComment}
                        </div>
                      )}

                      {/* Interactive actions for agents */}
                      <div className="space-y-3 pt-2 border-t border-white/5">
                        {/* Live Comment Form */}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Ajouter un commentaire agent..."
                            value={agentComments[sig.id] || ''}
                            onChange={(e) => setAgentComments(prev => ({ ...prev, [sig.id]: e.target.value }))}
                            className="flex-1 bg-[#0a1424] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                          <button
                            onClick={() => handleAddAgentComment(sig.id, agentComments[sig.id])}
                            className="px-3 bg-white/10 rounded-xl text-white font-bold transition hover:bg-white/20 text-xs"
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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signalements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 animate-fade-in font-sans text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block font-sans">📋 File globale des anomalies signalées</h3>
              <div className="space-y-3">
                {demoSignalements.map(sig => (
                  <div key={sig.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-extrabold uppercase">
                          {sig.category}
                        </span>
                        <h4 className="font-bold text-white mt-1.5">{sig.title}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        sig.status === 'Résolu' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : sig.status === 'En cours'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-white/10 text-white/50'
                      }`}>
                        {sig.status}
                      </span>
                    </div>

                    <p className="text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{sig.description}</p>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      {sig.status !== 'Résolu' && sig.status !== 'En cours' && (
                        <button
                          onClick={() => handleTakeCharge(sig.id)}
                          className="w-full py-2 rounded-xl border border-[#FF9F1C] text-[#FF9F1C] font-extrabold transition active:scale-95 cursor-pointer hover:bg-[#FF9F1C]/10 text-[11px]"
                        >
                          🛠️ Prendre en charge l'intervention
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl bg-[#112240]/40 space-y-4 animate-fade-in">
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
