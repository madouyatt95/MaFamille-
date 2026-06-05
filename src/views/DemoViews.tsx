import React, { useState } from 'react';
import { 
  Home, GraduationCap, Trophy, Gamepad2, User, BookOpen, Calendar, 
  MessageSquare, Plus, Send, UserCheck, ClipboardList, ArrowLeft, 
  Landmark, AlertTriangle, CheckSquare, Volume2, Mic, Megaphone, 
  BarChart2, Settings, Clock, Coins, Trash2, Edit3, Camera, 
  CheckCircle2, Star, Gift, Check, ShieldAlert, CheckSquare as CheckSquareIcon, Info
} from 'lucide-react';
import type { Member, ChoreTask, Transaction } from '../types';

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
  // Determine tabs depending on the profile
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
  } else if (demoProfileId === 'demo_school_admin' || demoProfileId === 'demo_school_teacher') {
    tabs = [
      { id: 'accueil', label: 'Espace Scolaire', icon: Home },
      { id: 'listes', label: 'Présences', icon: ClipboardList },
      { id: 'devoirs', label: 'Pédagogie', icon: GraduationCap },
      { id: 'stats', label: 'Rapports', icon: BarChart2 },
      { id: 'settings', label: 'Admin', icon: Settings }
    ];
  } else if (demoProfileId === 'demo_commune_admin' || demoProfileId === 'demo_commune_agent') {
    tabs = [
      { id: 'accueil', label: 'Espace Commune', icon: Home },
      { id: 'alertes', label: 'Alertes', icon: Megaphone },
      { id: 'signalements', label: 'Signalements', icon: ClipboardList },
      { id: 'sondages', label: 'Sondages', icon: BarChart2 },
      { id: 'settings', label: 'Admin', icon: Settings }
    ];
  }

  if (tabs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-2 md:px-8 max-w-7xl mx-auto pointer-events-none ios-safe-bottom-nav">
      <div className="glass-panel rounded-t-[32px] rounded-b-[24px] pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.5)] border-t border-white/10 px-4 py-2 flex items-center justify-around">
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
  setDemoTasks: React.Dispatch<React.SetStateAction<any[]>>;
  demoPocketMoney: any[];
  setDemoPocketMoney: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolPresence: any;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.Dispatch<React.SetStateAction<any[]>>;
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
  triggerDemoNotification
}) => {
  const isPresent = demoSchoolPresence.demo_issa?.status === 'Présent';
  const myMoney = demoPocketMoney.find(p => p.id === 'demo_issa') || { balance: 25, points: 140 };

  // Filter tasks assigned to Issa
  const myTasks = demoTasks.filter(t => t.assignedMemberId === 'demo_issa');

  // School homework for CE2
  const myHomework = demoSchoolHomework.filter(h => h.class === 'CE2');

  // Arithmetic Quiz States
  const [quizNum1, setQuizNum1] = useState(7);
  const [quizNum2, setQuizNum2] = useState(8);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState('');

  // Conteur States
  const [selectedTheme, setSelectedTheme] = useState('');
  const [storyText, setStoryText] = useState('');

  const handleCompleteTask = (taskId: string) => {
    setDemoTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (!t.done) {
          // Add points to Issa
          setDemoPocketMoney(money => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + t.rewardPoints } : m));
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
    setDemoSchoolHomework(prev => prev.map(h => {
      if (h.id === hwId) {
        const nextDone = !h.done;
        if (triggerDemoNotification && nextDone) {
          triggerDemoNotification(
            "📚 Devoir Terminé",
            `Issa Diop a marqué fait le devoir de ${h.subject}`,
            "ecole"
          );
        }
        return { ...h, done: nextDone };
      }
      return h;
    }));
  };

  // Submit quiz answer
  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = quizNum1 * quizNum2;
    if (parseInt(quizAnswer) === correct) {
      setQuizFeedback("🎉 BRAVO ! C'est la bonne réponse ! +10 points Étoile.");
      setDemoPocketMoney(money => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points + 10 } : m));
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "🎮 Quiz Réussi",
          "Issa Diop a résolu son quiz de calcul mental et a gagné +10 points !",
          "ecole"
        );
      }
      // Generate next question
      setTimeout(() => {
        const n1 = Math.floor(Math.random() * 5) + 5; // 5 to 9
        const n2 = Math.floor(Math.random() * 9) + 2; // 2 to 10
        setQuizNum1(n1);
        setQuizNum2(n2);
        setQuizAnswer('');
        setQuizFeedback('');
      }, 2000);
    } else {
      setQuizFeedback("❌ Oups, réessaye encore ! Tu vas y arriver.");
    }
  };

  // Generate IA Story
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
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto premium-glow-purple font-sans text-white">
      
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

      {/* 🏠 ACCUEIL CHILD TAB */}
      {activeTab === 'accueil' && (
        <div className="space-y-5">
          {/* STATS STARS & POCKET MONEY */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="glass-panel border-[#FFB020]/25 bg-gradient-to-br from-[#FFB020]/10 to-transparent p-4 rounded-3xl flex flex-col items-center text-center space-y-1.5">
              <Star className="w-8 h-8 text-[#FFB020] fill-[#FFB020] animate-bounce" />
              <div>
                <p className="text-xl font-black text-[#FFB020]">{myMoney.points}</p>
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Points Étoile</p>
              </div>
            </div>
            <div className="glass-panel border-[#00D26A]/25 bg-gradient-to-br from-[#00D26A]/10 to-transparent p-4 rounded-3xl flex flex-col items-center text-center space-y-1.5">
              <Gift className="w-8 h-8 text-[#00D26A]" />
              <div>
                <p className="text-xl font-black text-[#00D26A]">{myMoney.balance.toFixed(2)} €</p>
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Mon Argent de Poche</p>
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
                  {isPresent ? 'Marqué présent par le maître ce matin.' : 'Appel en cours...'}
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
                      <span className="text-[9px] font-bold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-md border border-[#00D26A]/20">Effectuée</span>
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

      {/* 🎒 ECOLE TAB */}
      {activeTab === 'ecole' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Mes devoirs de CE2</h3>
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

          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
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

      {/* ⭐ RECOMPENSES TAB */}
      {activeTab === 'recompenses' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl text-center space-y-2.5">
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
                        setDemoPocketMoney(money => money.map(m => m.id === 'demo_issa' ? { ...m, points: m.points - rec.cost } : m));
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

      {/* 🎮 ACTIVITES TAB */}
      {activeTab === 'activites' && (
        <div className="space-y-4">
          {/* Mini-Quiz math */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
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

          {/* Conteur d'histoire IA */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
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

      {/* 👤 PROFIL TAB */}
      {activeTab === 'profil' && (
        <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Mon Profil Élève</h3>
          <div className="space-y-3.5 text-xs font-medium">
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
              <span className="text-white/60">Enseignant</span>
              <span className="font-bold text-[#FFB020]">M. Diémé (Classe de CE2)</span>
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
  setDemoSchoolHomework: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolComms: any[];
  demoVaccines: any[];
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
}

export const DemoTeenDashboard: React.FC<DemoTeenDashboardProps> = ({
  activeTab,
  setActiveTab,
  demoSchoolHomework,
  setDemoSchoolHomework,
  demoSchoolComms,
  demoVaccines,
  triggerDemoNotification
}) => {
  // Homework for 1ère
  const myHomework = demoSchoolHomework.filter(h => h.class === 'Première');

  // School Comms (Simone Veil actualités)
  const myComms = demoSchoolComms;

  const handleToggleHomework = (hwId: string) => {
    setDemoSchoolHomework(prev => prev.map(h => {
      if (h.id === hwId) {
        const nextDone = !h.done;
        if (triggerDemoNotification && nextDone) {
          triggerDemoNotification(
            "📚 Devoir Terminé",
            `Lyna Diop a marqué comme fait le devoir de ${h.subject}`,
            "ecole"
          );
        }
        return { ...h, done: nextDone };
      }
      return h;
    }));
  };

  const myVaccine = demoVaccines.find(v => v.memberId === 'demo_lyna') || { name: 'ROR', date: '2026-06-20', status: 'À faire' };

  // Chat/Messages States (mocking conversation with teachers)
  const [activeChatTeacher, setActiveChatTeacher] = useState<'dubois' | 'martin'>('dubois');
  const [teacherMsgInput, setTeacherMsgInput] = useState('');
  const [chatLog, setChatLog] = useState<{ sender: 'lyna' | 'teacher'; text: string; time: string }[]>([
    { sender: 'teacher', text: "Bonjour Lyna, n'oublie pas de rendre ton commentaire de français pour jeudi.", time: "Hier" },
    { sender: 'lyna', text: "Bonjour, oui j'y travaille. C'est presque fini !", time: "Hier" }
  ]);

  const handleSendTeacherMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherMsgInput.trim()) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'lyna' as const, text: teacherMsgInput.trim(), time };

    setChatLog(prev => [...prev, userMsg]);
    setTeacherMsgInput('');

    // Simulated quick teacher response
    setTimeout(() => {
      const autoResponse = { 
        sender: 'teacher' as const, 
        text: activeChatTeacher === 'dubois'
          ? "Bien reçu. Bon courage pour la rédaction !"
          : "Bonjour Lyna, oui, le TP d'optique est facultatif mais vivement recommandé.",
        time 
      };
      setChatLog(prev => [...prev, autoResponse]);
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "💬 Nouveau Message",
          `M. Dubois (Professeur) a répondu à Lyna Diop.`,
          "chat"
        );
      }
    }, 1500);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-lg mx-auto premium-glow-purple font-sans text-white">
      
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

      {/* RENDER ACTIVE TAB */}

      {/* 🏠 ACCUEIL TEEN TAB */}
      {activeTab === 'accueil' && (
        <div className="space-y-4">
          {/* GRADES PREVIEW */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
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
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">⏳ Devoirs du jour</h3>
            <div className="space-y-2.5">
              {myHomework.slice(0, 2).map(hw => (
                <div key={hw.id} className="flex justify-between items-center text-xs p-2 rounded-xl bg-white/5">
                  <span className={`${hw.done ? 'line-through text-white/40' : 'text-white'}`}>{hw.title}</span>
                  <span className="text-[10px] text-[#6C5CFF] font-bold">{hw.subject}</span>
                </div>
              ))}
            </div>
          </div>

          {/* LYCEE NEWS */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
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

      {/* 📚 ECOLE TAB */}
      {activeTab === 'ecole' && (
        <div className="space-y-4">
          {/* DEVOIRS COMPLETS */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
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

          {/* PARCOURSUP / ORIENTATION SECTION */}
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3 bg-gradient-to-r from-[#6C5CFF]/15 to-transparent">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🧭</span>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Orientation & Parcoursup (Aperçu)</h3>
            </div>
            <p className="text-[10px] text-white/55 leading-relaxed font-sans">Préparez vos projets de Première et découvrez les métiers qui vous intéressent.</p>
            
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 text-xs">
                <span>Régler les options de Terminale</span>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">À faire</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 text-xs">
                <span>Découvrir les formations du supérieur</span>
                <span className="text-[9px] font-bold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-full">Validé</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📅 AGENDA TAB */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📅 Mon emploi du temps Simone Veil</h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="p-3.5 rounded-xl bg-white/5 border-l-4 border-[#6C5CFF] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">08h30 - 10h30 : Français</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">M. Dubois • Salle 102</p>
                </div>
                <span className="text-[9px] font-bold bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/25 px-2 py-0.5 rounded">Cours</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border-l-4 border-emerald-500 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">10h45 - 12h45 : Physique-Chimie</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Mme Martin • Labo 30</p>
                </div>
                <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 py-0.5 rounded">TP</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border-l-4 border-[#FF4D6D] flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-white">14h00 - 16h00 : Devoir d'Espagnol</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Mme Lopez • Salle 204</p>
                </div>
                <span className="text-[9px] font-bold bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/25 px-2 py-0.5 rounded">Examen</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💬 MESSAGES TAB */}
      {activeTab === 'messages' && (
        <div className="glass-panel p-4 border-white/8 rounded-3xl space-y-4 flex flex-col h-[400px]">
          {/* Selector */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveChatTeacher('dubois')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChatTeacher === 'dubois' ? 'bg-[#6C5CFF] text-white' : 'text-white/45 hover:text-white'
              }`}
            >
              👨‍🏫 M. Dubois (Français)
            </button>
            <button
              onClick={() => setActiveChatTeacher('martin')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChatTeacher === 'martin' ? 'bg-[#6C5CFF] text-white' : 'text-white/45 hover:text-white'
              }`}
            >
              👩‍🏫 Mme Martin (Physique)
            </button>
          </div>

          {/* Messages Logs */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans text-xs">
            {chatLog.map((msg, idx) => (
              <div 
                key={idx} 
                className={`max-w-[75%] p-3 rounded-2xl ${
                  msg.sender === 'lyna'
                    ? 'ml-auto bg-gradient-to-r from-[#6C5CFF] to-[#8B5CF6] text-white rounded-tr-sm'
                    : 'bg-white/5 border border-white/10 text-white rounded-tl-sm'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
                <span className="text-[8px] text-white/40 block text-right mt-1 font-semibold">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Message Form input */}
          <form onSubmit={handleSendTeacherMsg} className="flex items-center space-x-2 pt-2 border-t border-white/5">
            <input
              type="text"
              placeholder="Écrire un message au professeur..."
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

      {/* 👤 PROFIL TAB */}
      {activeTab === 'profil' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Carnet de Santé & Urgence</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span className="text-white/60">Groupe Sanguin</span>
                <span className="font-bold text-white">AB+</span>
              </div>
              
              {/* Vaccine alert */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 space-y-1.5">
                <div className="flex items-center space-x-2 text-red-400">
                  <ShieldAlert className="w-4.5 h-4.5" />
                  <span className="font-extrabold text-[10px] uppercase tracking-wider">Vigilance Vaccin</span>
                </div>
                <p className="text-[10px] text-white/70 leading-relaxed font-sans">
                  Le vaccin **{myVaccine.name}** est planifié pour le **{myVaccine.date}**. Pensez à planifier la consultation.
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
// 🏫 ECOLE - SPACE (DIRECTION / ENSEIGNANT)
// ==========================================
interface DemoSchoolSpaceProps {
  demoProfileId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoSchoolPresence: any;
  setDemoSchoolPresence: React.Dispatch<React.SetStateAction<any>>;
  demoSchoolCantine: any;
  setDemoSchoolCantine: React.Dispatch<React.SetStateAction<any>>;
  demoTransactions: any[];
  setDemoTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolComms: any[];
  setDemoSchoolComms: React.Dispatch<React.SetStateAction<any[]>>;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
  onBack: () => void;
}

export const DemoSchoolSpace: React.FC<DemoSchoolSpaceProps> = ({
  demoProfileId,
  activeTab,
  setActiveTab,
  demoSchoolPresence,
  setDemoSchoolPresence,
  demoSchoolCantine,
  setDemoSchoolCantine,
  demoTransactions,
  setDemoTransactions,
  demoSchoolHomework,
  setDemoSchoolHomework,
  demoSchoolComms,
  setDemoSchoolComms,
  triggerDemoNotification,
  onBack
}) => {
  const isTeacher = demoProfileId === 'demo_school_teacher';
  
  // 1. DIRECTION ESPACE STATES & ACTIONS
  const [newCommText, setNewCommText] = useState('');
  
  const handleDirectionComm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommText.trim()) return;

    const newComm = {
      id: `comm-${Date.now()}`,
      content: newCommText.trim(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      sender: 'Direction de l\'Établissement'
    };

    setDemoSchoolComms(prev => [newComm, ...prev]);
    setNewCommText('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🏫 Annonce École",
        `Simone Veil / Victor Hugo : "${newComm.content}"`,
        "ecole"
      );
    }
    alert("📢 Annonce administrative envoyée aux parents !");
  };

  // 2. ENSEIGNANT ESPACE STATES & ACTIONS
  const [newHwSubject, setNewHwSubject] = useState('');
  const [newHwTitle, setNewHwTitle] = useState('');
  const [newHwClass, setNewHwClass] = useState<'CE2' | 'Première'>('CE2');

  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHwSubject.trim() || !newHwTitle.trim()) return;

    const newHw = {
      id: `hw-${Date.now()}`,
      subject: newHwSubject.trim(),
      title: newHwTitle.trim(),
      class: newHwClass,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      done: false
    };

    setDemoSchoolHomework(prev => [...prev, newHw]);
    setNewHwSubject('');
    setNewHwTitle('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "📚 Nouveau Devoir",
        `Devoir de ${newHw.subject} assigné à la classe de ${newHw.class}`,
        "ecole"
      );
    }
    alert(`📚 Devoir de ${newHw.subject} publié aux élèves !`);
  };

  const handleMarkPresence = (studentId: string, status: 'Présent' | 'Absent') => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setDemoSchoolPresence((prev: any) => ({
      ...prev,
      [studentId]: { status, time }
    }));

    const studentName = studentId === 'demo_issa' ? 'Issa Diop' : 'Lyna Diop';
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🏫 Appel Scolaire",
        `${studentName} marqué ${status} ce matin.`,
        "ecole"
      );
    }
    alert(`✅ Appel enregistré : ${studentName} est marqué ${status}.`);
  };

  // 3. STATS COMPUTATIONS (Direction Dashboard)
  const totalStudents = 412;
  const isIssaPresent = demoSchoolPresence.demo_issa?.status === 'Présent';
  const isLynaPresent = demoSchoolPresence.demo_lyna?.status === 'Présent';
  const simulatedAbsents = (isIssaPresent ? 0 : 1) + (isLynaPresent ? 0 : 1);
  const presenceRate = (((totalStudents - simulatedAbsents) / totalStudents) * 100).toFixed(1);

  // Parents Chat States
  const [parentChatMsg, setParentChatMsg] = useState('');
  const [parentChatLog, setParentChatLog] = useState<{ sender: 'teacher' | 'parent'; text: string; time: string }[]>([
    { sender: 'parent', text: "Bonjour Monsieur, Issa a-t-il bien récupéré son cahier rouge ?", time: "Hier" },
    { sender: 'teacher', text: "Oui absolument, il est rangé dans son casier en classe.", time: "Hier" }
  ]);

  const handleSendParentMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentChatMsg.trim()) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newMsg = { sender: 'teacher' as const, text: parentChatMsg.trim(), time };
    setParentChatLog(prev => [...prev, newMsg]);
    setParentChatMsg('');

    setTimeout(() => {
      const response = { sender: 'parent' as const, text: "Parfait, je vous remercie pour votre retour.", time };
      setParentChatLog(prev => [...prev, response]);
      if (triggerDemoNotification) {
        triggerDemoNotification(
          "💬 Message Reçu",
          "M. Diop (Papa) a envoyé un message à l'enseignant.",
          "chat"
        );
      }
    }, 1500);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple font-sans text-white">
      
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
            <h1 className="text-xl font-extrabold text-white tracking-tight">Portail Éducation</h1>
            <p className="text-xs text-white/50 font-medium">Simone Veil & Victor Hugo</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase bg-[#00D26A]/10 border border-[#00D26A]/25 text-[#00D26A] px-3.5 py-1.5 rounded-full tracking-wider">
          {isTeacher ? '👨‍🏫 Enseignant (CE2)' : '🏫 Espace Direction'}
        </span>
      </div>

      {/* RENDER SPACE CHUNKS */}

      {/* A. DIRECTION SPACE */}
      {!isTeacher && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* KEY STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Total Élèves</span>
                  <p className="text-2xl font-black text-white">{totalStudents}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Taux Présence</span>
                  <p className="text-2xl font-black text-[#00D26A]">{presenceRate}%</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Retards (Auj)</span>
                  <p className="text-2xl font-black text-[#FFB020]">4</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Absences (Auj)</span>
                  <p className="text-2xl font-black text-red-400">{simulatedAbsents}</p>
                </div>
              </div>

              {/* LIVE LISTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📋 Absences du jour (Victor Hugo & Simone Veil)</h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 text-xs font-sans">
                      <span>Issa Diop (CE2)</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                        isIssaPresent ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {isIssaPresent ? 'Présent' : 'Absent'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 text-xs font-sans">
                      <span>Lyna Diop (Première)</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                        isLynaPresent ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {isLynaPresent ? 'Présent' : 'Absent'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">🍽️ Cantine & Réservations</h4>
                  <div className="space-y-2.5 text-xs font-sans">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span>Repas confirmés ce midi</span>
                      <span className="font-bold text-[#00D26A]">388 / 412</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <span>Solde Facturation École</span>
                      <span className="font-bold text-white">En ordre</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Appel de Présences (Statut Global)</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Issa Diop (CE2 - Victor Hugo)</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Appel enregistré : {demoSchoolPresence.demo_issa?.time || '--'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    isIssaPresent ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-red-500/10 text-red-500'
                  }`}>{isIssaPresent ? 'Présent' : 'Absent'}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="font-bold text-white">Lyna Diop (Première - Simone Veil)</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Appel enregistré : {demoSchoolPresence.demo_lyna?.time || '--'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    isLynaPresent ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-red-500/10 text-red-500'
                  }`}>{isLynaPresent ? 'Présent' : 'Absent'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devoirs' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🎓 Pédagogie & Devoirs Assignés</h3>
              <div className="space-y-3">
                {demoSchoolHomework.map(h => (
                  <div key={h.id} className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{h.title}</h4>
                      <p className="text-[10px] text-white/50 mt-0.5">Classe : {h.class} • Matière : {h.subject}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      h.done ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-amber-500/10 text-amber-400'
                    }`}>{h.done ? 'Fait' : 'À faire'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📢 Diffuser une Note de Direction aux Parents</h3>
              <form onSubmit={handleDirectionComm} className="space-y-3.5 text-xs">
                <textarea
                  placeholder="Tapez le message administratif à diffuser à tous les parents..."
                  required
                  rows={4}
                  value={newCommText}
                  onChange={(e) => setNewCommText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00D26A] transition-all font-sans"
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#00D26A] text-[#07111F] font-extrabold text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Diffuser l'annonce</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Configuration Établissement</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Interface de configuration réservée aux administrateurs de l'établissement scolaire Simone Veil / Victor Hugo.
              </p>
            </div>
          )}
        </>
      )}

      {/* B. TEACHER SPACE */}
      {isTeacher && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* TEACHER METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Ma Classe</span>
                  <p className="text-xl font-black text-white">CE2 (Victor Hugo)</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Présences</span>
                  <p className="text-xl font-black text-[#00D26A]">{isIssaPresent ? '27 / 28' : '26 / 28'}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Devoirs Actifs</span>
                  <p className="text-xl font-black text-[#6C5CFF]">2</p>
                </div>
              </div>

              <div className="glass-panel p-5 border-white/8 rounded-[28px] space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📅 Mon programme de cours (Aujourd'hui)</h4>
                <div className="space-y-2 text-xs font-sans">
                  <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-[#00D26A]">08h30 - 10h00</span>
                    <span>Calcul & Problèmes (CE2)</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-[#00D26A]">10h15 - 11h45</span>
                    <span>Français (CE2)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Faire l'appel (Classe de CE2)</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5 font-sans">
                  <div>
                    <h4 className="font-bold text-white">Issa Diop</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Statut actuel : {demoSchoolPresence.demo_issa?.status || 'Non fait'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleMarkPresence('demo_issa', 'Présent')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition active:scale-95 ${
                        isIssaPresent ? 'bg-[#00D26A] text-[#07111F]' : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      Présent
                    </button>
                    <button
                      onClick={() => handleMarkPresence('demo_issa', 'Absent')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition active:scale-95 ${
                        !isIssaPresent && demoSchoolPresence.demo_issa ? 'bg-red-500 text-white' : 'bg-white/5 text-white/60 border border-white/10'
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devoirs' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📚 Assigner des devoirs (CE2)</h3>
              <form onSubmit={handleAddHomework} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Matière</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Mathématiques"
                      value={newHwSubject}
                      onChange={(e) => setNewHwSubject(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Consigne</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Exercices tables..."
                      value={newHwTitle}
                      onChange={(e) => setNewHwTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#00D26A] text-[#07111F] font-extrabold text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  Publier aux élèves
                </button>
              </form>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="glass-panel p-4 border-white/8 rounded-3xl space-y-4 flex flex-col h-[350px]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">💬 Messagerie avec les parents</h3>
              
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-sans text-xs">
                {parentChatLog.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[75%] p-3 rounded-2xl ${
                      msg.sender === 'teacher'
                        ? 'ml-auto bg-gradient-to-r from-[#00D26A] to-emerald-500 text-[#07111F] rounded-tr-sm font-bold'
                        : 'bg-white/5 border border-white/10 text-white rounded-tl-sm'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className={`text-[8px] block text-right mt-1 ${
                      msg.sender === 'teacher' ? 'text-[#07111F]/60' : 'text-white/40'
                    }`}>{msg.time}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendParentMsg} className="flex items-center space-x-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  placeholder="Répondre aux parents Diop..."
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

          {activeTab === 'settings' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Profil Enseignant</h3>
              <p className="text-xs text-white/50 font-sans leading-relaxed">
                Connecté en tant que **M. Diémé**, professeur principal de la classe de CE2 à l'école Victor Hugo.
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
};


// ==========================================
// 🏛️ COMMUNE - SPACE (MAIRE / AGENT TERRAIN)
// ==========================================
interface DemoCommuneSpaceProps {
  demoProfileId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoCommuneAlerts: any[];
  setDemoCommuneAlerts: React.Dispatch<React.SetStateAction<any[]>>;
  demoCommunePoll: any;
  setDemoCommunePoll: React.Dispatch<React.SetStateAction<any>>;
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
  demoCommunePoll,
  setDemoCommunePoll,
  demoSignalements,
  setDemoSignalements,
  triggerDemoNotification,
  onBack
}) => {
  const isAgent = demoProfileId === 'demo_commune_agent';

  // 1. MAIRE ACTIONS
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

  // 2. AGENT ACTIONS
  const handleUpdateStatus = (sigId: string, newStatus: string) => {
    setDemoSignalements(prev => prev.map(s => {
      if (s.id === sigId) {
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "🛠️ Signalement Citoyen",
            `Le signalement "${s.title}" a été mis à jour : "${newStatus}".`,
            "commune"
          );
        }
        return { ...s, status: newStatus };
      }
      return s;
    }));
    alert(`✅ Statut du signalement mis à jour : "${newStatus}".`);
  };

  // Stats computations
  const familiesCount = 1240;
  const signalementsOpen = demoSignalements.filter(s => s.status !== 'Résolu').length;
  const signalementsClosed = demoSignalements.filter(s => s.status === 'Résolu').length;

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple font-sans text-white">
      
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
          {isAgent ? '👷 Agent Municipal' : '🏛️ Espace Maire'}
        </span>
      </div>

      {/* RENDER SPACE CHUNKS */}

      {/* A. MAIRE SPACE */}
      {!isAgent && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* COCKPIT MUNICIPAL */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Familles Connectées</span>
                  <p className="text-2xl font-black text-white">{familiesCount}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Écoles Partenaires</span>
                  <p className="text-2xl font-black text-[#FF9F1C]">2</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Signalements Ouverts</span>
                  <p className="text-2xl font-black text-red-400">{signalementsOpen}</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Signalements Résolus</span>
                  <p className="text-2xl font-black text-[#00D26A]">{signalementsClosed}</p>
                </div>
              </div>

              {/* LIVE LISTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📢 Vigilance & Alertes Actives</h4>
                  <div className="space-y-2.5">
                    {demoCommuneAlerts.map(alert => (
                      <div key={alert.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs space-y-1">
                        <h5 className="font-bold text-white">{alert.title}</h5>
                        <p className="text-white/60 font-sans">{alert.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">🗳️ Consultations en cours</h4>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 text-xs">
                    <h5 className="font-bold text-[#FF9F1C]">{demoCommunePoll.question}</h5>
                    <div className="space-y-2">
                      {demoCommunePoll.options.map((opt: any, idx: number) => {
                        const totalVotes = demoCommunePoll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                        const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between font-bold text-white/70">
                              <span>{opt.text}</span>
                              <span>{percent}% ({opt.votes.length})</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-[#FF9F1C] rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alertes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📢 Publier une Alerte Travaux / Vigilance</h3>
              <form onSubmit={handleAddAlert} className="space-y-3.5 text-xs font-sans">
                <div>
                  <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Titre de l'alerte</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Travaux Avenue Foch"
                    value={newAlertTitle}
                    onChange={(e) => setNewAlertTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/40 uppercase block mb-1">Message aux habitants</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Description détaillée de la vigilance..."
                    value={newAlertDesc}
                    onChange={(e) => setNewAlertDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none font-sans"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#FF9F1C] text-[#07111F] font-extrabold text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  Diffuser aux familles
                </button>
              </form>
            </div>
          )}

          {activeTab === 'signalements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Signalements Citoyens</h3>
              <div className="space-y-3">
                {demoSignalements.map(sig => (
                  <div key={sig.id} className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center font-sans">
                    <div>
                      <h4 className="font-bold text-white">{sig.title}</h4>
                      <p className="text-[10px] text-white/40 mt-0.5">Signalé par {sig.author} le {sig.date}</p>
                      <p className="text-[10px] text-white/70 mt-1">{sig.description}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl font-bold text-[9px] ${
                      sig.status === 'Résolu' 
                        ? 'bg-[#00D26A]/20 text-[#00D26A]' 
                        : sig.status === 'En cours' 
                          ? 'bg-[#FF9F1C]/20 text-[#FF9F1C]' 
                          : 'bg-white/10 text-white/50'
                    }`}>{sig.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sondages' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🗳️ Suivi Consultation Mairie</h3>
              <div className="p-4 bg-white/5 rounded-2xl text-xs space-y-3 font-sans">
                <h4 className="font-bold text-white">{demoCommunePoll.question}</h4>
                <p className="text-[10px] text-white/50 leading-relaxed font-sans">Sondage ouvert aux parents de Cormeilles-en-Parisis.</p>
                
                <div className="space-y-3.5 pt-2">
                  {demoCommunePoll.options.map((opt: any, idx: number) => {
                    const totalVotes = demoCommunePoll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                    const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-white/85">
                          <span>{opt.text}</span>
                          <span className="font-bold">{percent}% ({opt.votes.length})</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FF9F1C]" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Admin Mairie</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Interface administrative connectée de la mairie de Cormeilles-en-Parisis.
              </p>
            </div>
          )}
        </>
      )}

      {/* B. AGENT SPACE */}
      {isAgent && (
        <>
          {activeTab === 'accueil' && (
            <div className="space-y-6">
              {/* METRICS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Interventions urgentes</span>
                  <p className="text-xl font-black text-red-400">1</p>
                </div>
                <div className="glass-panel border-white/8 rounded-2xl p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider block">Tickets pris en charge</span>
                  <p className="text-xl font-black text-[#FF9F1C]">{demoSignalements.filter(s => s.status === 'En cours').length}</p>
                </div>
              </div>

              <div className="glass-panel p-5 border-white/8 rounded-[28px] space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">🛠️ Tâches assignées par Catégories</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                    <span className="font-extrabold text-white">Voirie 🕳️</span>
                    <span className="block text-[10px] text-white/45 mt-1">1 signalement</span>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                    <span className="font-extrabold text-white">Éclairage 💡</span>
                    <span className="block text-[10px] text-white/45 mt-1">0 signalement</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alertes' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🚨 Interventions urgentes</h3>
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl space-y-1 font-sans">
                  <h4 className="font-bold text-red-400">Nid de poule Rue de Paris</h4>
                  <p className="text-[10px] text-white/70">Risque de chute pour les vélos.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signalements' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📋 Liste des Interventions Terrain</h3>
              <div className="space-y-4">
                {demoSignalements.map(sig => (
                  <div key={sig.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3 text-xs font-sans">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white">{sig.title}</h4>
                        <p className="text-[9px] text-white/40 mt-0.5">Signalé par {sig.author} le {sig.date}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        sig.status === 'Résolu' 
                          ? 'bg-[#00D26A]/20 text-[#00D26A]' 
                          : sig.status === 'En cours' 
                            ? 'bg-[#FF9F1C]/20 text-[#FF9F1C]' 
                            : 'bg-white/10 text-white/50'
                      }`}>{sig.status}</span>
                    </div>

                    <p className="text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">{sig.description}</p>

                    <div className="flex space-x-2 pt-1.5">
                      <button
                        onClick={() => handleUpdateStatus(sig.id, 'En cours')}
                        disabled={sig.status === 'En cours' || sig.status === 'Résolu'}
                        className="flex-1 py-2 rounded-xl border border-[#FF9F1C]/35 text-[#FF9F1C] text-[10px] font-bold transition active:scale-95 disabled:opacity-30 cursor-pointer"
                      >
                        🛠️ Prendre en charge
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(sig.id, 'Résolu')}
                        disabled={sig.status === 'Résolu'}
                        className="flex-1 py-2 rounded-xl bg-[#00D26A] text-[#07111F] text-[10px] font-extrabold transition active:scale-95 disabled:opacity-30 cursor-pointer shadow-md"
                      >
                        ✓ Résoudre
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sondages' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">📊 Rapport de performance</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Tickets résolus ce mois-ci : **14**. Temps moyen de prise en charge : **2.4 heures**.
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel p-5 border-white/8 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider block">Profil Agent municipal</h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                Connecté en tant que **Agent technique terrain** - Service Propreté et Voirie.
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
};
