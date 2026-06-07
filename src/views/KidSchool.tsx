import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  GraduationCap, 
  Calendar, 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  MessageSquare, 
  CheckSquare, 
  Award, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Plus,
  Send,
  Loader2,
  Trash2,
  BookOpenCheck,
  MapPin,
  Flame,
  Star,
  ChevronRight,
  Smile
} from 'lucide-react';
import type { Member, SchoolTask, Dish, FamilyEvent } from '../types';
import { aiQuotaService } from '../services/aiQuotaService';

export interface KidSchoolProps {
  member: Member;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  dishes: Dish[];
  grades?: any[];
  setGrades?: React.Dispatch<React.SetStateAction<any[]>>;
  schedule?: any[];
  setSchedule?: React.Dispatch<React.SetStateAction<any[]>>;
  events?: FamilyEvent[];
  members?: any[];
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  onBack: () => void;
}

interface GradeItem {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  value: number;
  max: number;
  coef: number;
  examTitle: string;
  date: string;
}

export const KidSchool: React.FC<KidSchoolProps> = ({
  member,
  schoolTasks,
  setSchoolTasks,
  dishes,
  grades = [],
  setGrades = () => {},
  schedule = [],
  setSchedule = () => {},
  events = [],
  members = [],
  isPremium = false,
  onTriggerPaywall,
  onBack
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'devoirs' | 'tuteur' | 'emploi' | 'notes'>('devoirs');
  
  // AI Tutor state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: `Salut ${member.name} ! Je suis ton super Tuteur IA. 🦸‍♂️ Tu as une question sur tes devoirs ou un sujet d'école ? Tape ta question ci-dessous !` }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [tutorNotice, setTutorNotice] = useState<boolean>(false);
  const [selectedTaskForRevision, setSelectedTaskForRevision] = useState<SchoolTask | null>(null);

  const handleReviewWithAI = (task: SchoolTask) => {
    setSelectedTaskForRevision(task);
    setActiveSubTab('tuteur');
  };

  // Schedule sub-tab state
  const [scheduleViewMode, setScheduleViewMode] = useState<'today' | 'week'>('today');
  const [selectedDay, setSelectedDay] = useState<string>('Lundi');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Helper: check if a task is an evaluation
  const isEvaluation = (task: SchoolTask) => {
    const titleLower = task.title.toLowerCase();
    const subjectLower = task.subject.toLowerCase();
    return titleLower.includes('éval') || 
           titleLower.includes('eval') || 
           titleLower.includes('contrôle') || 
           titleLower.includes('controle') || 
           titleLower.includes('test') || 
           titleLower.includes('examen') || 
           titleLower.includes('exam') || 
           subjectLower.includes('éval') || 
           subjectLower.includes('contrôle');
  };

  // Filter tasks for this specific child
  const myTasks = schoolTasks.filter(t => t.assignedMemberId === member.id);
  
  // Split homeworks vs evaluations
  const myHomeworks = myTasks.filter(t => !isEvaluation(t));
  const pendingHomeworks = myHomeworks.filter(t => !t.done);
  const completedHomeworks = myHomeworks.filter(t => t.done);
  
  const upcomingEvaluations = myTasks.filter(t => isEvaluation(t) && !t.done);

  // Progression calculation (percentage of tasks completed)
  const totalTasks = myTasks.length;
  const completedTasksCount = myTasks.filter(t => t.done).length;
  const progression = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 100;

  // Real grades filtered for this child
  const myRealGrades = grades.filter(g => g.studentId === member.id);

  // Overall average normalized to 20
  const normalizedGrades = myRealGrades.map(g => (g.value / g.max) * 20);
  const overallAverage = normalizedGrades.length > 0 
    ? Number((normalizedGrades.reduce((sum, val) => sum + val, 0) / normalizedGrades.length).toFixed(2))
    : null;

  // Filter events of type 'school' for this member
  const schoolEvents = events.filter(e => 
    e.type === 'school' && 
    (!e.memberId || e.memberId === member.id || e.memberName?.toLowerCase() === member.name?.toLowerCase())
  );

  // Dynamic system prompt constructor for AI Tutor
  const getAIContextPrompt = () => {
    const homeworkList = myTasks.map(t => `- [${t.subject}] ${t.title} (Difficulté: ${t.difficulty || 'medium'}, Statut: ${t.done ? (t.grade === 'Validé' ? 'Terminé & Validé' : 'Fait, en attente de validation') : 'À faire'}, Limite: ${t.dueDate})`).join('\n');
    const gradeList = myRealGrades.map(g => `- [${g.subject}] ${g.examTitle} : ${g.value}/${g.max} (coef ${g.coef})`).join('\n');
    
    // Calculate subject averages to find difficulties
    const subjectGrades: Record<string, { total: number; count: number }> = {};
    myRealGrades.forEach(g => {
      if (!subjectGrades[g.subject]) {
        subjectGrades[g.subject] = { total: 0, count: 0 };
      }
      subjectGrades[g.subject].total += (g.value / g.max) * 20;
      subjectGrades[g.subject].count += 1;
    });
    
    const strugglingSubjects: string[] = [];
    Object.entries(subjectGrades).forEach(([subject, data]) => {
      const avg = data.total / data.count;
      if (avg < 12) strugglingSubjects.push(subject);
    });
    
    const difficultTasks = myTasks.filter(t => !t.done && t.difficulty === 'hard');

    return `Tu es un super Tuteur IA drôle, pédagogue et hyper encourageant pour un enfant de 8 à 11 ans nommé ${member.name}.
Réponds à sa question de manière simple, ludique, claire et encourageante, en utilisant des émojis.
Garde ta réponse concise (maximum 4-5 phrases) et adaptée à son niveau scolaire (primaire).

Voici les vraies données scolaires de l'enfant pour adapter tes réponses et lui proposer des encouragements ou révisions ciblées :
Devoirs en cours :
${homeworkList || 'Aucun devoir pour le moment.'}

Notes obtenues :
${gradeList || 'Aucune note pour le moment.'}

Difficultés identifiées (moyennes < 12/20 ou tâches complexes) :
${strugglingSubjects.length > 0 ? `Matières en difficulté : ${strugglingSubjects.join(', ')}` : 'Aucune matière en difficulté pour le moment, très bon niveau !'}
${difficultTasks.length > 0 ? `Devoirs difficiles à faire : ${difficultTasks.map(t => t.title).join(', ')}` : ''}

Consignes :
1. Si l'enfant te demande de réviser un devoir, propose-lui un mini-quiz amusant de 1 ou 2 questions ou une explication simplifiée.
2. Encourage-le régulièrement en te basant sur ses bonnes notes ou en le soutenant sur ses matières en difficulté.
3. Reste toujours bienveillant, utilise des métaphores enfantines et un ton dynamique.
`;
  };

  // Call Gemini API with safety checks
  const callGemini = async (prompt: string) => {
    try {
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
      } else {
        throw new Error('Empty response');
      }
    } catch (err) {
      console.warn("[KidSchool IA] Échec appel Gemini, repli sur simulateur local :", err);
      setTutorNotice(true);
      simulateLocalAiResponse();
    }
  };

  // Simulate local AI response based on topic/query
  const simulateLocalAiResponse = (optSubject?: string, optTitle?: string) => {
    setTimeout(() => {
      let aiResponse = '';
      const subj = optSubject ? optSubject.toLowerCase() : '';
      const title = optTitle ? optTitle.toLowerCase() : '';

      if (subj.includes('math') || title.includes('fraction') || title.includes('géométrie') || title.includes('multiplic')) {
        aiResponse = `Super, révisons les Mathématiques ! 📐 Sais-tu par exemple ce qu'est le dénominateur dans une fraction ? C'est le nombre du bas ! Il indique en combien de parts égales on a coupé un gâteau. Si tu coupes un gâteau en 4 parts, le dénominateur est 4. Est-ce que c'est clair pour toi ? 😉`;
      } else if (subj.includes('fran') || title.includes('lecture') || title.includes('verbe') || title.includes('grammaire')) {
        aiResponse = `Génial, révisons le Français ! 📖 Pour repérer un verbe d'action dans une phrase, tu peux essayer de dire 'Ne ... pas' autour. Exemple : 'Le chien dort' -> 'Le chien NE dort PAS'. Le mot coincé au milieu est 'dort', c'est notre verbe ! Prêt pour un autre défi ? 🐕`;
      } else if (subj.includes('hist') || title.includes('pharaon') || title.includes('pyramide') || title.includes('révolution')) {
        aiResponse = `En route pour l'Histoire ! 🏺 Sais-tu que la plus grande pyramide d'Égypte est celle de Khéops ? Elle a été construite il y a plus de 4500 ans pour servir de tombeau au pharaon Khéops. C'est incroyable, non ? 🏜️`;
      } else {
        aiResponse = `D'accord ! C'est parti pour réviser ton travail scolaire. 💡 Prends ton temps pour bien lire les leçons et fais des schémas colorés. Si tu as une question précise sur un sujet, écris-la moi et je t'expliquerai simplement ! 🌟`;
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
      setIsTyping(false);
    }, 1200);
  };

  // Deep-link trigger when child clicks "Réviser avec le Tuteur IA"
  useEffect(() => {
    if (selectedTaskForRevision && activeSubTab === 'tuteur') {
      const task = selectedTaskForRevision;
      setSelectedTaskForRevision(null); // Clear first
      
      const userText = `Aide-moi à réviser mon devoir de ${task.subject} : "${task.title}" 📖`;
      setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
      setIsTyping(true);

      const prompt = `${getAIContextPrompt()}\n\nL'enfant clique sur "Réviser avec le Tuteur IA" pour le devoir "${task.title}" de la matière ${task.subject}. Pose-lui une question de révision amusante (mini-quiz) ou explique-lui brièvement une notion clé de ce devoir (en 3-4 phrases).`;
      
      const callRealAI = aiQuotaService.consumeAIQuota(isPremium);
      if (callRealAI) {
        callGemini(prompt);
      } else {
        simulateLocalAiResponse(task.subject, task.title);
      }
    }
  }, [selectedTaskForRevision, activeSubTab]);

  // Main message sender for AI Tutor Chatbox
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setUserInput('');
    setIsTyping(true);
    setTutorNotice(false);

    const prompt = `${getAIContextPrompt()}\n\nQuestion de l'enfant : "${query}"`;
    const callRealAI = aiQuotaService.consumeAIQuota(isPremium);
    if (callRealAI) {
      callGemini(prompt);
    } else {
      // Local simulator fallback
      setTimeout(() => {
        let aiResponse = '';
        const cleanQuery = query.toLowerCase();
        
        const matchedTask = pendingHomeworks.find(t => cleanQuery.includes(t.subject.toLowerCase()) || cleanQuery.includes(t.title.toLowerCase()));
        const matchedEval = upcomingEvaluations.find(e => cleanQuery.includes(e.subject.toLowerCase()) || cleanQuery.includes(e.title.toLowerCase()));
        
        if (matchedTask || matchedEval) {
          const item = matchedTask || matchedEval;
          aiResponse = `Oh, je vois que tu as justement un devoir de ${item?.subject} à faire : "${item?.title}" ! 📚 C'est prévu pour le ${item?.dueDate}. Pour t'aider, commence par bien relire ta leçon, puis essaie de faire les questions une par une. N'oublie pas : chaque petit effort compte ! Bon courage ! 💪✨`;
        } else if (cleanQuery.includes('fraction')) {
          aiResponse = "Une fraction, c'est comme découper un bon gâteau ! 🍰 Si tu coupes le gâteau en 4 parts égales, et que tu en manges 1 part, tu as mangé 1/4 (un quart). Le chiffre du bas (4) s'indique le dénominateur (combien de parts). Le chiffre du haut (1) est le numérateur (combien de parts tu manges) ! Miam ! 😋";
        } else if (cleanQuery.includes('table') || cleanQuery.includes('multiplic')) {
          aiResponse = "Les multiplications sont des super raccourcis ! 🚀 Par exemple, au lieu de faire 3 + 3 + 3 + 3 + 3 (ce qui fait 15), tu peux juste faire 3 x 5 = 15 ! Ma petite astuce pour la table de 9 : pour faire 9 x 4, plie ton 4ème doigt. Tu auras 3 doigts levés à gauche et 6 à droite... cela fait 36 ! Magique ! 🖐️✨";
        } else if (cleanQuery.includes('pharaon') || cleanQuery.includes('egypte') || cleanQuery.includes('pyramide')) {
          aiResponse = "Les pharaons étaient les grands rois de l'Égypte antique ! 👑 Ils étaient enterrés dans d'immenses pyramides en pierre. La plus grande est la pyramide de Khéops, bâtie il y a plus de 4500 ans ! 🏺🏜️";
        } else if (cleanQuery.includes('note') || cleanQuery.includes('bulletin') || cleanQuery.includes('moyenne')) {
          if (myRealGrades.length > 0) {
            const avg = myRealGrades.reduce((acc, g) => acc + (g.value / g.max) * 20, 0) / myRealGrades.length;
            aiResponse = `Ton bulletin est super intéressant ! 🏅 Ta moyenne générale est de ${avg.toFixed(1)}/20. Tu as notamment eu un ${myRealGrades[0].value}/${myRealGrades[0].max} en ${myRealGrades[0].subject}. Continue comme ça, tu es un vrai champion ! 🌟`;
          } else {
            aiResponse = "Tu n'as pas encore de notes enregistrées dans ton bulletin pour le moment ! C'est le début de l'aventure, continue de travailler fort ! 🚀";
          }
        } else {
          aiResponse = `Oh, super question sur "${query}" ! 💡 Pour réussir ton apprentissage sur ce sujet, je te conseille de lire attentivement ta leçon, de faire un petit schéma en couleur, et d'en parler à ton enseignant ou à tes parents ce soir. L'important est d'être curieux ! Que veux-tu savoir d'autre ? 🌟`;
        }
        
        setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        setIsTyping(false);
      }, 1200);
    }
  };

  // Toggle child task done status
  const toggleTaskDone = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextState = !t.done;
        if (nextState) {
          alert("Génial ! Devoir coché. Tu l'as envoyé à tes parents pour validation. 📚🌟");
        }
        return { ...t, done: nextState, grade: undefined };
      }
      return t;
    }));
  };

  // Helper icons/styles for subjects
  const getSubjectStyle = (subj: string) => {
    const lower = subj.toLowerCase();
    if (lower.includes('math')) return { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-300' };
    if (lower.includes('hist') || lower.includes('géo') || lower.includes('geo')) return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-300' };
    if (lower.includes('scien') || lower.includes('svt') || lower.includes('bio')) return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300' };
    if (lower.includes('fran') || lower.includes('dictée')) return { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-300' };
    if (lower.includes('angl')) return { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-300' };
    return { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-300' };
  };

  const getDifficultyBadge = (diff: 'easy' | 'medium' | 'hard') => {
    if (diff === 'easy') return { label: '🟢 Facile', style: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25' };
    if (diff === 'medium') return { label: '🟡 Moyen', style: 'text-amber-400 bg-amber-500/10 border border-amber-500/25' };
    return { label: '🔴 Défi', style: 'text-rose-400 bg-rose-500/10 border border-rose-500/25' };
  };

  // Grades status color mapping
  const getGradeStatus = (val: number, max: number) => {
    const ratio = val / max;
    if (ratio >= 0.8) return { label: 'Excellent 🌟', style: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' };
    if (ratio >= 0.7) return { label: 'Très Bien ✨', style: 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20' };
    if (ratio >= 0.6) return { label: 'Bien 👍', style: 'text-blue-400 bg-blue-500/10 border border-blue-500/20' };
    if (ratio >= 0.5) return { label: 'Moyen 🧐', style: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' };
    return { label: 'À travailler 📚', style: 'text-rose-400 bg-rose-500/10 border border-rose-500/20' };
  };

  // Appréciation generator based on subject average
  const getSubjectAppreciation = (avg: number) => {
    if (avg >= 16) return "Excellent travail ! Autonomie et rigueur remarquables. 🌟";
    if (avg >= 14) return "Très bon trimestre. Les résultats sont solides et réguliers. 👍";
    if (avg >= 12) return "Trimestre satisfaisant. Poursuis tes efforts pour encore progresser. 🎯";
    return "Ensemble fragile. Concentre-toi bien sur tes révisions et fais-toi aider par l'IA. 🚀";
  };

  // General average badge generator
  const getBadgeDetails = (avg: number) => {
    if (avg >= 16) return { label: 'Félicitations 🏆🌟', color: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-white', text: 'Un niveau exceptionnel ! Tu es une véritable star de la classe !' };
    if (avg >= 14) return { label: 'Tableau d\'Honneur 🎖️✨', color: 'bg-gradient-to-r from-teal-400 to-blue-500 text-white', text: 'Très bon travail ! Tes efforts de révision portent leurs fruits !' };
    if (avg >= 12) return { label: 'Encouragements 🎯👍', color: 'bg-gradient-to-r from-indigo-400 to-purple-500 text-white', text: 'Bonne moyenne générale. Continue d\'étudier, tu progresses bien !' };
    return { label: 'Objectif Progression 🚀', color: 'bg-gradient-to-r from-orange-400 to-red-500 text-white', text: 'Chaque jour est une chance de t\'améliorer. Révise avec ton tuteur IA !' };
  };

  // Group grades by subject
  const gradesBySubject: Record<string, { sum: number; count: number; maxTotal: number }> = {};
  myRealGrades.forEach(g => {
    if (!gradesBySubject[g.subject]) {
      gradesBySubject[g.subject] = { sum: 0, count: 0, maxTotal: 0 };
    }
    gradesBySubject[g.subject].sum += g.value;
    gradesBySubject[g.subject].count += 1;
    gradesBySubject[g.subject].maxTotal += g.max;
  });

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00D26A]/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>🎒</span>
              <span>Mon Espace École</span>
            </h1>
            <p className="text-xs text-white/50 font-bold">Consulte ton agenda, tes notes et révise avec l'IA !</p>
          </div>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-white text-xl">
          🏫
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/5 p-1 rounded-2xl border border-white/5 grid grid-cols-4 gap-1 mb-6">
        <button
          onClick={() => setActiveSubTab('devoirs')}
          className={`py-3.5 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'devoirs' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          📚 Devoirs
        </button>
        <button
          onClick={() => setActiveSubTab('tuteur')}
          className={`py-3.5 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'tuteur' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          🤖 Tuteur IA
        </button>
        <button
          onClick={() => setActiveSubTab('emploi')}
          className={`py-3.5 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'emploi' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          📅 Agenda
        </button>
        <button
          onClick={() => setActiveSubTab('notes')}
          className={`py-3.5 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'notes' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          🏅 Notes
        </button>
      </div>

      {/* CONTENT: DEVOIRS */}
      {activeSubTab === 'devoirs' && (
        <div className="space-y-6">
          
          {/* Progression Header */}
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg space-y-3 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#00D26A]/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-[#00D26A] uppercase tracking-wider">Ma Progression</span>
                <h3 className="text-sm font-extrabold text-white">
                  {completedTasksCount} sur {totalTasks} devoirs cochés !
                </h3>
              </div>
              <span className="text-2xl">{progression === 100 ? '🥇' : '🚀'}</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#00D26A] to-[#00FF87] rounded-full transition-all duration-500" 
                  style={{ width: `${progression}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-white/40">
                <span>0%</span>
                <span>{progression}% accomplis</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Section: Devoirs à réaliser */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block flex items-center space-x-1">
              <span>📖 Devoirs à faire ({pendingHomeworks.length})</span>
            </span>
            
            {pendingHomeworks.length === 0 ? (
              <div className="bg-white/5 border border-white/8 rounded-[32px] p-6 text-center space-y-2">
                <span className="text-3xl block">⭐️</span>
                <p className="text-sm font-black text-white">Aucun devoir à faire !</p>
                <p className="text-xs text-white/40">Tu as terminé tout ton travail scolaire. Beau travail !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingHomeworks.map(task => {
                  const subStyle = getSubjectStyle(task.subject);
                  const diffBadge = getDifficultyBadge(task.difficulty || 'medium');
                  return (
                    <div 
                      key={task.id} 
                      className="bg-[#112240] border-2 border-[#00D26A]/15 rounded-[28px] p-4 flex flex-col space-y-3 shadow-lg hover:border-[#00D26A]/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${subStyle.bg} ${subStyle.border} ${subStyle.text}`}>
                              {task.subject}
                            </span>
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${diffBadge.style}`}>
                              {diffBadge.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-white leading-snug">
                            {task.title}
                          </h3>
                        </div>
                        <button 
                          onClick={() => toggleTaskDone(task.id)}
                          className="w-9 h-9 rounded-xl border border-white/20 hover:border-[#00D26A]/60 flex items-center justify-center cursor-pointer hover:bg-[#00D26A]/10 active:scale-95 transition-all shrink-0 ml-2 mt-0.5"
                        >
                          {task.done ? '✅' : ''}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                        <p className="text-[10px] text-white/50 font-bold flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-white/40" />
                          <span>Pour le : {task.dueDate}</span>
                        </p>
                        <button 
                          onClick={() => handleReviewWithAI(task)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] hover:from-[#5849E0] hover:to-[#3A75E0] text-white font-black text-[9px] uppercase tracking-wider flex items-center space-x-1 shadow transition-all active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-white" />
                          <span>Réviser avec l'IA</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Évaluations à venir */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block flex items-center space-x-1 text-[#FFB020]">
              <span>🔥 Évaluations à venir ({upcomingEvaluations.length})</span>
            </span>
            
            {upcomingEvaluations.length === 0 ? (
              <div className="bg-white/5 border border-white/8 rounded-[32px] p-6 text-center">
                <p className="text-xs text-white/30">Aucun contrôle ou évaluation programmés bientôt ! 👍</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvaluations.map(task => {
                  const subStyle = getSubjectStyle(task.subject);
                  const diffBadge = getDifficultyBadge(task.difficulty || 'medium');
                  return (
                    <div 
                      key={task.id} 
                      className="bg-[#112240] border-2 border-[#FFB020]/20 rounded-[28px] p-4 flex flex-col space-y-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]">
                              ⚠️ Contrôle
                            </span>
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${subStyle.bg} ${subStyle.border} ${subStyle.text}`}>
                              {task.subject}
                            </span>
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${diffBadge.style}`}>
                              {diffBadge.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-white leading-snug">
                            {task.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                        <p className="text-[10px] text-[#FFB020] font-bold flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-[#FFB020]/70" />
                          <span>Prévu le : {task.dueDate}</span>
                        </p>
                        <button 
                          onClick={() => handleReviewWithAI(task)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFB020] to-[#FF8C00] text-white font-black text-[9px] uppercase tracking-wider flex items-center space-x-1 shadow transition-all active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-white" />
                          <span>Réviser avec l'IA</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Devoirs Terminés */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              ✅ Devoirs Terminés ({completedHomeworks.length})
            </span>
            
            {completedHomeworks.length === 0 ? (
              <div className="p-4 text-center text-xs text-white/20 italic">
                Pas encore de devoirs terminés aujourd'hui.
              </div>
            ) : (
              <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 space-y-3">
                {completedHomeworks.map(task => {
                  const subStyle = getSubjectStyle(task.subject);
                  const isParentValidated = task.grade === 'Validé';
                  return (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl text-xs opacity-75">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase ${subStyle.bg} ${subStyle.border} ${subStyle.text}`}>
                            {task.subject}
                          </span>
                          <span className="text-[9px] text-white/30 font-bold">Fait</span>
                        </div>
                        <h4 className="font-bold text-white line-through decoration-white/30">{task.title}</h4>
                      </div>
                      <div className="text-right shrink-0">
                        {isParentValidated ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-[9px] font-black uppercase">
                            Validé ✓
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020] text-[9px] font-black uppercase flex items-center space-x-1">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Attente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* CONTENT: TUTEUR IA */}
      {activeSubTab === 'tuteur' && (
        <div className="space-y-4 flex flex-col min-h-[calc(100vh-250px)]">
          
          {/* Chat Window */}
          <div className="flex-1 bg-white/5 border border-white/8 rounded-[32px] p-4 flex flex-col space-y-4 overflow-y-auto max-h-[480px] shadow-inner relative">
            
            {tutorNotice && (
              <div className="bg-[#FFB020]/10 border border-[#FFB020]/20 rounded-2xl p-3 text-xs text-[#FFB020] flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Connexion restreinte ou quota local. Le Tuteur IA tourne en mode local intelligent ! 🤖✨</p>
              </div>
            )}

            {chatMessages.map((msg, idx) => {
              const isAi = msg.sender === 'ai';
              return (
                <div 
                  key={idx} 
                  className={`flex items-start space-x-2.5 ${!isAi ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg shadow-md ${
                    isAi ? 'bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF]' : 'bg-[#00D26A]/20 border border-[#00D26A]/30 text-white'
                  }`}>
                    {isAi ? '🤖' : '👦'}
                  </div>
                  
                  {/* Bubble */}
                  <div className={`p-4 rounded-3xl max-w-[80%] text-xs font-medium leading-relaxed shadow-sm ${
                    isAi 
                      ? 'bg-[#112240] border border-white/8 text-white rounded-tl-none' 
                      : 'bg-[#00D26A] text-[#07111F] font-bold rounded-tr-none'
                  }`}>
                    {msg.text.split('\n').map((line, lIdx) => (
                      <p key={lIdx} className={lIdx > 0 ? 'mt-1.5' : ''}>{line}</p>
                    ))}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF] flex items-center justify-center shrink-0 text-lg shadow-md animate-pulse">
                  🤖
                </div>
                <div className="bg-[#112240] border border-white/8 p-3 rounded-2xl text-xs flex items-center space-x-2 text-white/50 rounded-tl-none">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Le Tuteur IA réfléchit...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="flex space-x-2 mt-auto">
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Pose une question à ton tuteur IA... (ex: fractions, Égypte)"
              className="flex-1 bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A] transition-all"
            />
            <button 
              type="submit"
              disabled={isTyping || !userInput.trim()}
              className="p-3.5 rounded-2xl bg-[#00D26A] text-[#07111F] hover:bg-[#00FF87] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center shadow-lg active:scale-95 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* CONTENT: AGENDA (EMPLOI DU TEMPS) */}
      {activeSubTab === 'emploi' && (
        <div className="space-y-6">
          
          {/* Read only Warning */}
          <div className="bg-white/3 border border-white/5 rounded-2xl p-3.5 text-center text-[10px] text-white/45 font-bold uppercase tracking-wider">
            🔒 Vue en lecture seule — Gérée par les parents
          </div>

          {/* View Toggles */}
          <div className="bg-white/5 p-1 rounded-xl border border-white/5 grid grid-cols-2 gap-1">
            <button 
              onClick={() => setScheduleViewMode('today')}
              className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
                scheduleViewMode === 'today' ? 'bg-[#00D26A] text-[#07111F]' : 'text-white/50'
              }`}
            >
              📅 Aujourd'hui
            </button>
            <button 
              onClick={() => setScheduleViewMode('week')}
              className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
                scheduleViewMode === 'week' ? 'bg-[#00D26A] text-[#07111F]' : 'text-white/50'
              }`}
            >
              🗓️ Semaine
            </button>
          </div>

          {/* Schedule List */}
          {scheduleViewMode === 'today' ? (
            <div className="space-y-3">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                Mes Cours d'aujourd'hui :
              </span>
              
              {(() => {
                const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                const today = days[new Date().getDay()];
                const todayClasses = schedule
                  .filter(item => item && (item.studentId === member.id || item.studentName?.toLowerCase() === member.name?.toLowerCase()) && item.day === today)
                  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                if (todayClasses.length === 0) {
                  return (
                    <div className="bg-white/5 border border-white/8 rounded-[32px] p-8 text-center space-y-2">
                      <span className="text-4xl block">🎉</span>
                      <p className="text-sm font-black text-white">Pas de cours aujourd'hui !</p>
                      <p className="text-xs text-white/40 leading-relaxed font-bold">Profites-en pour te reposer ou réviser tes chapitres avec l'IA.</p>
                    </div>
                  );
                }

                return todayClasses.map(cls => {
                  const subStyle = getSubjectStyle(cls.subject);
                  return (
                    <div key={cls.id} className="bg-[#112240] border border-white/8 rounded-[24px] p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${subStyle.bg} ${subStyle.border} ${subStyle.text}`}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${subStyle.bg} ${subStyle.border} ${subStyle.text}`}>
                            {cls.subject}
                          </span>
                          <h4 className="text-xs font-black text-white mt-1.5">
                            {cls.startTime} - {cls.endTime}
                          </h4>
                          {cls.room && (
                            <p className="text-[10px] text-white/40 font-bold mt-0.5 flex items-center space-x-0.5">
                              <MapPin className="w-3 h-3 text-white/30" />
                              <span>Salle : {cls.room}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xl">🏫</span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map((day) => {
                const dayClasses = schedule
                  .filter(item => item && (item.studentId === member.id || item.studentName?.toLowerCase() === member.name?.toLowerCase()) && item.day === day)
                  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                if (dayClasses.length === 0) return null;

                return (
                  <div key={day} className="bg-white/5 border border-white/8 rounded-[28px] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-black text-[#00D26A]">{day}</span>
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Jour d'école</span>
                    </div>

                    <div className="space-y-2">
                      {dayClasses.map(cls => {
                        const subStyle = getSubjectStyle(cls.subject);
                        return (
                          <div key={cls.id} className="p-3 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5">
                            <div>
                              <h4 className="text-xs font-extrabold text-white">{cls.subject}</h4>
                              <p className="text-[10px] text-white/40 font-bold mt-0.5">
                                ⏰ {cls.startTime} - {cls.endTime} {cls.room ? `• 📍 ${cls.room}` : ''}
                              </p>
                            </div>
                            <span className="text-lg">📚</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {schedule.filter(item => item && (item.studentId === member.id || item.studentName?.toLowerCase() === member.name?.toLowerCase())).length === 0 && (
                <div className="bg-white/5 border border-white/8 rounded-[32px] p-8 text-center space-y-2">
                  <span className="text-4xl block">📅</span>
                  <p className="text-sm font-black text-white">Aucun cours planifié</p>
                  <p className="text-xs text-white/40 font-bold leading-relaxed">Ton emploi du temps n'a pas encore été configuré par tes parents.</p>
                </div>
              )}
            </div>
          )}

          {/* Section: Sorties & Activités scolaires */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block flex items-center space-x-1 text-[#00D26A]">
              <span>⛺ Sorties & Événements Scolaires ({schoolEvents.length})</span>
            </span>

            {schoolEvents.length === 0 ? (
              <div className="bg-white/3 border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-xs text-white/20">Aucun événement ou sortie scolaire de planifié. 🎒</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schoolEvents.map(event => (
                  <div key={event.id} className="bg-[#112240] border border-[#00D26A]/10 rounded-2xl p-4 flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] shrink-0 text-lg">
                      🎒
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-white leading-tight">{event.title}</h4>
                      <p className="text-[10px] text-[#00D26A] font-bold">
                        📅 Le {event.dateTime} {event.time ? `à ${event.time}` : ''}
                      </p>
                      {event.location && (
                        <p className="text-[9.5px] text-white/40 font-bold flex items-center space-x-0.5">
                          <MapPin className="w-3 h-3 text-white/30 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </p>
                      )}
                      {event.description && (
                        <p className="text-[9.5px] text-white/50 leading-relaxed font-bold bg-white/3 p-2 rounded-xl mt-1 border border-white/5">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* CONTENT: NOTES & BULLETINS */}
      {activeSubTab === 'notes' && (
        <div className="space-y-6">
          
          {/* Read only Warning */}
          <div className="bg-white/3 border border-white/5 rounded-2xl p-3.5 text-center text-[10px] text-white/45 font-bold uppercase tracking-wider">
            🔒 Vue en lecture seule — Gérée par les parents
          </div>

          {/* Moyenne générale & badge */}
          {overallAverage !== null ? (
            (() => {
              const badge = getBadgeDetails(overallAverage);
              return (
                <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center space-y-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-[#FFD700]/10 blur-xl pointer-events-none" />
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block">Ma Moyenne Générale</span>
                    <div className="inline-flex items-baseline space-x-1 bg-white/5 border border-white/8 px-6 py-2.5 rounded-3xl">
                      <span className="text-3xl font-black text-[#FFB020]">{overallAverage}</span>
                      <span className="text-xs font-bold text-white/40">/ 20</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className={`inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-black shadow ${badge.color}`}>
                      <span>{badge.label}</span>
                    </span>
                    <p className="text-xs text-white/60 font-bold max-w-xs mx-auto leading-relaxed">
                      "{badge.text}"
                    </p>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-[#112240] border border-white/8 rounded-[32px] p-8 text-center space-y-3">
              <span className="text-4xl block">🏅</span>
              <p className="text-sm font-black text-white">Pas encore de moyenne générale</p>
              <p className="text-xs text-white/40 leading-relaxed font-bold">Travaille bien en classe pour recevoir tes premières notes de tes parents !</p>
            </div>
          )}

          {/* Bulletin Scolaire (Subject averages) */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              📊 Mon Bulletin Trimestriel :
            </span>

            {Object.keys(gradesBySubject).length > 0 ? (
              <div className="space-y-3.5">
                {Object.entries(gradesBySubject).map(([subj, data]) => {
                  const avg = Number(((data.sum / data.maxTotal) * 20).toFixed(2));
                  const subStyle = getSubjectStyle(subj);
                  return (
                    <div key={subj} className="bg-white/5 border border-white/8 rounded-[28px] p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${subStyle.bg} ${subStyle.border} ${subStyle.text}`}>
                          {subj}
                        </span>
                        <div className="inline-flex items-baseline space-x-0.5">
                          <span className="text-base font-black text-white">{avg}</span>
                          <span className="text-[10px] font-bold text-white/40">/20</span>
                        </div>
                      </div>

                      {/* Micro progress bar for subject average */}
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] rounded-full"
                          style={{ width: `${(avg / 20) * 100}%` }}
                        />
                      </div>

                      {/* Feedback / Appréciation */}
                      <div className="p-3 bg-white/3 border border-white/5 rounded-xl text-[11px] text-white/70 font-medium leading-relaxed italic">
                        💬 <span className="font-bold text-white/40 uppercase tracking-wider text-[8px] not-italic mr-1.5">Avis Tuteur :</span>
                        {getSubjectAppreciation(avg)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-6">Aucune matière avec note pour le moment.</p>
            )}
          </div>

          {/* Historique des Notes */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              📜 Historique de Mes Notes :
            </span>

            {myRealGrades.length > 0 ? (
              <div className="space-y-3">
                {[...myRealGrades].reverse().map(grade => {
                  const subStyle = getSubjectStyle(grade.subject);
                  const status = getGradeStatus(grade.value, grade.max);
                  return (
                    <div 
                      key={grade.id} 
                      className="bg-[#112240] border border-white/5 rounded-[24px] p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                          <span className="text-sm font-black text-[#FFB020]">
                            {grade.value}/{grade.max}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${subStyle.bg} ${subStyle.border} ${subStyle.text}`}>
                              {grade.subject}
                            </span>
                            <span className="text-[8.5px] text-white/30 font-bold">
                              Coef: {grade.coef}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-white mt-1.5 leading-snug">
                            {grade.examTitle}
                          </h4>
                          <p className="text-[9.5px] text-white/40 font-bold mt-0.5">
                            Reçu le {grade.date}
                          </p>
                        </div>
                      </div>
                      
                      <div className="shrink-0 ml-2">
                        <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${status.style}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/30 text-center py-6">Aucune note reçue dans l'historique.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
