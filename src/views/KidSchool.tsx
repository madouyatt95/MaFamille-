import React, { useState } from 'react';
import { ArrowLeft, GraduationCap, Calendar, Sparkles, BookOpen, AlertCircle, MessageSquare, CheckSquare, Award, Clock, ArrowRight } from 'lucide-react';
import type { Member, SchoolTask, Dish } from '../types';

export interface KidSchoolProps {
  member: Member;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  dishes: Dish[];
  grades?: any[];
  onBack: () => void;
}

interface TeacherMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: string;
  avatar: string;
}

interface ExamItem {
  id: string;
  subject: string;
  topic: string;
  date: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const KidSchool: React.FC<KidSchoolProps> = ({
  member,
  schoolTasks,
  setSchoolTasks,
  dishes,
  grades = [],
  onBack
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'devoirs' | 'tuteur' | 'cantine' | 'vie'>('devoirs');
  const [tutorNotice, setTutorNotice] = useState<boolean>(false);

  // Devoirs / Tasks filtered for this member
  const pendingTasks = schoolTasks.filter(t => t.assignedMemberId === member.id);

  // Real grades filtered for this student
  const myRealGrades = grades.filter(g => g.studentId === member.id);

  // Canteen Menu mapped from foyer dishes
  const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const cantineMenu = weekdays.map(day => {
    // Find lunch dish for this day in family dishes
    const lunchDish = dishes.find(d => d.day === day && d.mealType === 'lunch');
    if (lunchDish) {
      return {
        day,
        starter: "Salade de saison bio 🥗",
        main: lunchDish.name,
        dessert: "Fruit frais ou yaourt local 🍏"
      };
    }

    // Default kid-friendly fallback canteen menu
    const defaultMenus: Record<string, { starter: string; main: string; dessert: string }> = {
      'Lundi': { starter: 'Carottes râpées bio 🥕', main: 'Pâtes fraîche Carbonara 🍝', dessert: 'Compote de pommes maison 🍏' },
      'Mardi': { starter: 'Salade de tomates & mozzarella 🍅', main: 'Poulet rôti croustillant & Frites dorées 🍗🍟', dessert: 'Yaourt crémeux aux fraises 🍓' },
      'Mercredi': { starter: 'Potage aux légumes magiques 🍲', main: 'Filet de poisson pané croustillant & Purée de pommes de terre 🐟🥔', dessert: 'Moelleux au chocolat intense 🍫' },
      'Jeudi': { starter: 'Salade coleslaw croquante 🥗', main: 'Lasagnes au boeuf de la maîtresse 🥩', dessert: 'Salade de fruits frais de saison 🍌' },
      'Vendredi': { starter: 'Salade de riz niçoise 🍚', main: 'Boulettes de boeuf gourmandes & sauce tomate provençale 🧆', dessert: 'Flan nappé de caramel fondant 🍮' }
    };

    return {
      day,
      ...(defaultMenus[day] || defaultMenus['Lundi'])
    };
  });

  // Teacher messages
  const teacherMessages: TeacherMessage[] = [
    { 
      id: 'msg-1', 
      sender: 'Mme. Mercier (Maîtresse)', 
      subject: 'Poésie à réciter 📖', 
      body: `Bonjour ${member.name} ! N'oublie pas d'apprendre les deux premières strophes de ta poésie pour lundi prochain. Excellent travail en classe cette semaine !`, 
      date: "Aujourd'hui",
      avatar: '👩‍🏫'
    },
    { 
      id: 'msg-2', 
      sender: 'M. Dubois (Prof de Sport)', 
      subject: 'Matériel athlétisme 🏃‍♂️', 
      body: 'Pense à prendre tes baskets propres et ta gourde d\'eau pour la séance de saut en longueur de jeudi.', 
      date: 'Hier',
      avatar: '👨‍'
    }
  ];

  // Mock evaluations (upcoming exams)
  const schoolExams: ExamItem[] = [
    { id: 'ex-1', subject: 'Mathématiques 📐', topic: 'Les tables de multiplication (6 à 9)', date: 'Mardi 9 Juin', difficulty: 'medium' },
    { id: 'ex-2', subject: 'Histoire 🏺', topic: 'Les Pharaons et la construction des pyramides', date: 'Vendredi 12 Juin', difficulty: 'hard' }
  ];

  // AI Tutor simulator state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: `Salut ${member.name} ! Je suis ton super Tuteur IA. 🦸‍♂️ Tu as une question sur tes devoirs ou un sujet d'école ? Tape ta question ci-dessous (ex: fractions, histoire, dinosaures...) !` }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setUserInput('');
    setIsTyping(true);
    setTutorNotice(false);

    try {
      const prompt = `Tu es un super Tuteur IA drôle et pédagogue pour un enfant de 8 à 11 ans nommé ${member.name}.
Réponds à sa question de manière simple, ludique, claire et encourageante, en utilisant des émojis.
Garde ta réponse concise (maximum 4-5 phrases) et adaptée à son niveau scolaire (primaire).
Question de l'enfant : "${query}"`;

      const useProxy = !import.meta.env.DEV || !import.meta.env.VITE_GEMINI_API_KEY;
      const geminiEndpoint = useProxy
        ? (import.meta.env.DEV ? 'https://ma-famille-nu.vercel.app/api/gemini' : '/api/gemini')
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!useProxy && import.meta.env.VITE_GEMINI_API_KEY) {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_GEMINI_API_KEY}`;
      }

      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      });

      if (!response.ok) throw new Error('Gemini API call failed');
      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (aiResponse.trim()) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse.trim() }]);
        setIsTyping(false);
        return;
      } else {
        throw new Error('Reponse vide de Gemini');
      }
    } catch (err) {
      console.warn("[KidSchool IA Tutor] Erreur lors de l'appel Gemini, repli sur le simulateur local :", err);
      setTutorNotice(true);
    }

    // AI logic simulation fallback
    setTimeout(() => {
      let aiResponse = '';
      const cleanQuery = query.toLowerCase();

      if (cleanQuery.includes('fraction')) {
        aiResponse = "Une fraction, c'est comme découper un bon gâteau ! 🍰 Si tu coupes le gâteau en 4 parts égales, et que tu en manges 1 part, tu as mangé 1/4 (un quart). Le chiffre du bas (4) s'appelle le dénominateur : il indique en combien de parts tu as coupé. Le chiffre du haut (1) est le numérateur : il dit combien de parts tu as prises ! Facile, non ? 😉";
      } else if (cleanQuery.includes('table') || cleanQuery.includes('multiplic')) {
        aiResponse = "Les multiplications sont des super raccourcis pour additionner très vite ! 🚀 Par exemple, au lieu de faire 3 + 3 + 3 + 3 + 3 (ce qui fait 15), tu peux juste faire 3 x 5 = 15 ! Ma petite astuce pour la table de 9 : pour faire 9 x 4, plie ton 4ème doigt. Tu auras 3 doigts levés à gauche et 6 à droite... cela fait 36 ! Magique ! 🖐️✨";
      } else if (cleanQuery.includes('pharaon') || cleanQuery.includes('egypte') || cleanQuery.includes('pyramide')) {
        aiResponse = "Les pharaons étaient les grands rois et reines de l'Égypte antique ! 👑 Ils étaient considérés comme des intermédiaires entre les dieux et le peuple. Pour leur tombeau, ils faisaient construire d'immenses pyramides en pierre. La plus grande est la pyramide de Khéops, bâtie il y a plus de 4500 ans ! 🏺🏜️";
      } else if (cleanQuery.includes('terre') || cleanQuery.includes('planete') || cleanQuery.includes('soleil') || cleanQuery.includes('espace')) {
        aiResponse = "Notre planète la Terre est la 3ème planète du Système Solaire ! 🌍 Elle tourne autour du Soleil à une vitesse incroyable en faisant un tour complet en 365 jours (soit un an). Et devine quoi ? Nous avons de l'eau liquide et de l'air, ce qui permet à la vie d'exister ! Mars, elle, est surnommée la Planète Rouge car son sol contient de la rouille ! 🚀☄️";
      } else if (cleanQuery.includes('verbe') || cleanQuery.includes('conjug') || cleanQuery.includes('grammaire')) {
        aiResponse = "Le verbe, c'est le mot magique de la phrase qui exprime l'action ou l'état ! 🎬 Pour le repérer, tu peux essayer de dire 'Ne ... pas' autour d'un mot. Ex: 'Le chat mange sa souris' -> 'Le chat NE mange PAS sa souris'. Le mot coincé au milieu est 'mange', c'est donc notre verbe à l'infinitif 'manger' ! 🐱🦁";
      } else {
        aiResponse = `Oh, super question sur "${query}" ! 💡 L'école regorge de mystères captivants. Pour réussir ton apprentissage sur ce sujet, je te conseille de lire attentivement ta leçon, de faire un petit schéma en couleur, et d'en parler à ton enseignant ou à tes parents ce soir. L'important est d'être curieux ! Que veux-tu savoir d'autre ? 🌟`;
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
      setIsTyping(false);
    }, 1200);
  };


  const toggleTaskDone = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextState = !t.done;
        if (nextState) {
          alert("Génial ! Devoir coché. Tu l'as envoyé à tes parents pour validation. 📚🌟");
        }
        return { ...t, done: nextState };
      }
      return t;
    }));
  };

  const getDifficultyEmoji = (diff: 'easy' | 'medium' | 'hard') => {
    return diff === 'easy' ? '🟢 Facile' : diff === 'medium' ? '🟡 Moyen' : '🔴 Défi';
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00D26A]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[100px] pointer-events-none" />

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
              <span>🎒</span>
              <span>Mon Espace École</span>
            </h1>
            <p className="text-xs text-white/50 font-bold">Consulte ton agenda, tes devoirs et étudie avec l'IA !</p>
          </div>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-xl">
          🏫
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 p-1 rounded-2xl border border-white/5 grid grid-cols-4 gap-1 mb-6">
        <button
          onClick={() => setActiveSubTab('devoirs')}
          className={`py-3 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'devoirs' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          Devoirs & Évals
        </button>
        <button
          onClick={() => setActiveSubTab('tuteur')}
          className={`py-3 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'tuteur' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          Tuteur IA 🤖
        </button>
        <button
          onClick={() => setActiveSubTab('cantine')}
          className={`py-3 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'cantine' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          Cantine 🍽️
        </button>
        <button
          onClick={() => setActiveSubTab('vie')}
          className={`py-3 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'vie' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          Vie Scolaire
        </button>
      </div>

      {/* CONTENT: Devoirs */}
      {activeSubTab === 'devoirs' && (
        <div className="space-y-6">
          {/* Homework Checklist */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Devoirs à faire :</span>
            
            {pendingTasks.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 text-center space-y-2">
                <span className="text-3xl block">⭐️</span>
                <p className="text-sm font-black text-white">Aucun devoir restant !</p>
                <p className="text-xs text-white/40">Tu as fini tout ton travail scolaire pour aujourd'hui !</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <div 
                  key={task.id} 
                  className="bg-[#112240] border-2 border-[#00D26A]/20 rounded-[28px] p-4 flex items-start justify-between shadow-lg"
                >
                  <div className="space-y-1.5 flex-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full uppercase text-white/60">
                        {task.subject}
                      </span>
                      <span className="text-[9px] font-black text-white/45">
                        {getDifficultyEmoji(task.difficulty || 'medium')}
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {task.title}
                    </h3>
                    
                    <p className="text-[10px] text-white/50 font-bold flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Pour le : {task.dueDate}</span>
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => toggleTaskDone(task.id)}
                    className="w-10 h-10 rounded-xl border-2 border-white/20 hover:border-[#00D26A]/60 flex items-center justify-center cursor-pointer hover:bg-[#00D26A]/10 active:scale-95 transition-all mt-1"
                  >
                    {task.done ? '✅' : ''}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Evaluations Section */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Évaluations à venir :</span>
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 space-y-3">
              {schoolExams.map(exam => (
                <div key={exam.id} className="flex items-start space-x-3 p-3 bg-white/5 rounded-2xl">
                  <div className="w-10 h-10 bg-[#FFB020]/15 border border-[#FFB020]/30 rounded-xl flex items-center justify-center text-lg shrink-0">
                    📝
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-black text-[#FFB020] uppercase">{exam.subject}</span>
                      <span className="text-[8px] font-bold text-white/35">({getDifficultyEmoji(exam.difficulty)})</span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-tight">{exam.topic}</h4>
                    <p className="text-[9.5px] text-white/40 font-bold mt-0.5">📅 Date : {exam.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Récentes Section */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Mes Notes Récentes :</span>
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 space-y-3">
              {myRealGrades.length > 0 ? (
                myRealGrades.map((grade, idx) => {
                  const getStatus = (val: number, max: number) => {
                    const ratio = val / max;
                    if (ratio >= 0.8) return 'Excellent 🌟';
                    if (ratio >= 0.7) return 'Très Bien ✨';
                    if (ratio >= 0.6) return 'Bien 👍';
                    if (ratio >= 0.5) return 'Moyen 🧐';
                    return 'À travailler 📚';
                  };
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl text-xs">
                      <div>
                        <h4 className="font-bold text-white">{grade.subject}</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">{grade.examTitle} • Coef {grade.coef}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#00D26A] text-sm">{grade.value} / {grade.max}</span>
                        <p className="text-[9px] text-white/45 mt-0.5">{getStatus(grade.value, grade.max)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-white/30 text-center py-4">Aucune note enregistrée dans ton bulletin pour le moment. 📝</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* CONTENT: AI Tutor Chat */}
      {activeSubTab === 'tuteur' && (
        <div className="space-y-4 flex flex-col min-h-[400px]">
          {tutorNotice && (
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-3 text-[10px] text-amber-200 font-bold flex items-center space-x-2 animate-pulse">
              <span className="text-sm">⚡️</span>
              <span>Connexion magique perturbée. Le Tuteur IA utilise sa mémoire locale ! ✨</span>
            </div>
          )}
          {/* Chat box */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-[32px] p-4 space-y-4 overflow-y-auto max-h-[350px] min-h-[250px] flex flex-col justify-end">
            <div className="space-y-3">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-[24px] px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#00D26A] text-[#07111F] font-black rounded-br-none'
                        : 'bg-[#112240] text-white/90 border border-white/5 rounded-bl-none font-bold'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#112240] border border-white/5 rounded-[24px] rounded-bl-none px-4 py-2 text-xs text-white/40 font-bold flex items-center space-x-1.5">
                    <span>Le Tuteur IA réfléchit</span>
                    <span className="flex space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Questions suggestion */}
          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
            <button 
              onClick={() => setUserInput("C'est quoi une fraction ?")}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white/60 hover:text-white shrink-0 cursor-pointer"
            >
              🍰 Les fractions
            </button>
            <button 
              onClick={() => setUserInput("Une astuce pour la table de 9 ?")}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white/60 hover:text-white shrink-0 cursor-pointer"
            >
              📐 Tables de multiplication
            </button>
            <button 
              onClick={() => setUserInput("Qui a construit les pyramides ?")}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white/60 hover:text-white shrink-0 cursor-pointer"
            >
              🏺 L'Égypte ancienne
            </button>
          </div>

          {/* Input field */}
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2 shrink-0">
            <input 
              type="text" 
              placeholder="Ex: Pourquoi le ciel est bleu ?"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]/50"
            />
            <button 
              type="submit" 
              className="p-3 bg-[#00D26A] text-[#07111F] rounded-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* CONTENT: Cantine */}
      {activeSubTab === 'cantine' && (
        <div className="space-y-4">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Menu de la cantine scolaire :</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cantineMenu.map((dayItem, idx) => (
              <div key={idx} className="bg-white/5 border border-white/8 rounded-[28px] p-5 space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-black text-[#00D26A]">{dayItem.day}</span>
                  <span className="text-[10px] font-bold text-white/30">Cantine Centrale 🏫</span>
                </div>
                
                <div className="space-y-2 text-xs font-medium">
                  <div>
                    <span className="text-[9px] font-bold text-white/40 block">Entrée :</span>
                    <span className="text-white/85">{dayItem.starter}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/40 block">Plat Principal :</span>
                    <span className="text-white/95 font-bold">{dayItem.main}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/40 block">Dessert :</span>
                    <span className="text-white/85">{dayItem.dessert}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT: Vie Scolaire */}
      {activeSubTab === 'vie' && (
        <div className="space-y-6">
          {/* Teacher Messages */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Messages des Enseignants :</span>
            <div className="space-y-2.5">
              {teacherMessages.map(msg => (
                <div key={msg.id} className="p-4 bg-white/5 border border-white/8 rounded-[28px] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">{msg.avatar}</span>
                      <span className="text-xs font-black text-white">{msg.sender}</span>
                    </div>
                    <span className="text-[9px] font-bold text-white/30">{msg.date}</span>
                  </div>
                  <div className="border-l-2 border-[#00D26A] pl-3 py-0.5 space-y-1">
                    <h4 className="text-xs font-bold text-white/90">{msg.subject}</h4>
                    <p className="text-[11px] text-white/50 leading-relaxed font-bold">{msg.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Stats and Badges */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/8 rounded-[28px] p-4 text-center space-y-2">
              <Award className="w-8 h-8 text-[#FFB020] mx-auto" />
              <div>
                <p className="text-lg font-black text-white">Élève Modèle 🌟</p>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Badge de Comportement</p>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/8 rounded-[28px] p-4 text-center space-y-2">
              <Clock className="w-8 h-8 text-[#4F8CFF] mx-auto" />
              <div>
                <p className="text-lg font-black text-white">100% Présent</p>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Cette semaine</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
