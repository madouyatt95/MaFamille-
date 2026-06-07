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
  Smile,
  Trophy,
  Gamepad2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShoppingBag
} from 'lucide-react';
import type { Member, SchoolTask, Dish, FamilyEvent } from '../types';
import { staticAcademyQuestions } from '../data/academyData';
import type { AcademyQuestion } from '../data/academyData';
import { generateProceduralQuestion } from '../utils/academyGenerator';

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

// Local Lessons Database for the local tutor
interface Lesson {
  title: string;
  subject: string;
  competence: 'lecture' | 'orthographe' | 'calcul' | 'conjugaison' | 'culture' | 'anglais' | 'sciences';
  content: string;
  example: string;
  keywords: string[];
}

const localLessons: Lesson[] = [
  {
    title: "Les fractions simples 🍰",
    subject: "Mathématiques",
    competence: "calcul",
    content: "Une fraction représente le partage d'une unité en parts égales. Le numérateur (chiffre du haut) désigne le nombre de parts que l'on prend. Le dénominateur (chiffre du bas) désigne en combien de parts égales l'unité a été coupée.",
    example: "Si tu coupes un gâteau en 4 parts égales et que tu en manges 1 part, tu as mangé 1/4 (un quart) du gâteau. S'il en reste 3 parts, il reste 3/4 (trois quarts).",
    keywords: ["fraction", "partage", "denominateur", "numerateur", "diviser"]
  },
  {
    title: "Astuces de multiplication 🧮",
    subject: "Mathématiques",
    competence: "calcul",
    content: "Multiplier c'est comme additionner plusieurs fois le même nombre. Pour retenir la table de 9, tu peux plier le doigt correspondant au multiplicateur : le nombre de doigts à gauche donne les dizaines, à droite les unités.",
    example: "Pour 9 × 4, plie le 4ème doigt. Tu as 3 doigts à gauche et 6 à droite, ce qui fait 36 !",
    keywords: ["multiplication", "table", "multiplier", "calcul", "fois"]
  },
  {
    title: "Le pluriel des noms en -al ✍️",
    subject: "Français",
    competence: "orthographe",
    content: "Les noms masculins qui se terminent par '-al' font généralement leur pluriel en '-aux'. Cependant, il existe quelques exceptions très connues à retenir : bal, cal, carnaval, chacal, festival, régal qui prennent simplement un 's'.",
    example: "Un cheval -> Des chevaux. Un journal -> Des journaux. Mais : Un festival -> Des festivals.",
    keywords: ["pluriel", "orthographe", "nom", "cheval", "aux", "singulier"]
  },
  {
    title: "Repérer le verbe d'action 📖",
    subject: "Français",
    competence: "conjugaison",
    content: "Le verbe est le cœur de la phrase. Pour le trouver facilement, tu peux changer le temps de la phrase (mettre au futur ou au passé) ou encadrer le mot par 'ne ... pas'. Le verbe est le mot qui change ou qui se fait encadrer.",
    example: "Dans 'Le chat dort sur le canapé' : 'Le chat NE dort PAS...' ou au futur 'Le chat dormira...'. Le mot qui change est 'dort', c'est le verbe.",
    keywords: ["verbe", "trouver", "conjugaison", "action", "phrase", "sujet"]
  },
  {
    title: "Les Pharaons d'Égypte 🏺",
    subject: "Découverte",
    competence: "culture",
    content: "Les pharaons étaient les souverains de l'Égypte antique, considérés comme des intermédiaires entre les dieux et les hommes. À leur mort, ils étaient souvent momifiés pour conserver leur corps et enterrés dans de gigantesques pyramides.",
    example: "Le pharaon Toutânkhamon est devenu célèbre car son tombeau a été retrouvé intact avec tout son trésor en or en 1922.",
    keywords: ["pharaon", "egypte", "pyramide", "antiquite", "momie", "histoire"]
  },
  {
    title: "Le Système Solaire 🌍",
    subject: "Découverte",
    competence: "sciences",
    content: "Notre système solaire comprend le Soleil (une étoile) et 8 planètes qui tournent autour. Les planètes proches du Soleil sont rocheuses (Mercure, Vénus, Terre, Mars) et les plus éloignées sont gazeuses et géantes (Jupiter, Saturne, Uranus, Neptune).",
    example: "La Terre est la 3ème planète à partir du Soleil. Elle est la seule connue à abriter de l'eau liquide en grande quantité et la vie.",
    keywords: ["planete", "soleil", "terre", "mars", "astronomie", "espace", "systeme solaire"]
  },
  {
    title: "Salutations en Wolof 🇸🇳",
    subject: "Langues",
    competence: "culture",
    content: "Le wolof est la langue la plus parlée au Sénégal. Pour saluer quelqu'un poliment, on lui demande comment il va et on répond chaleureusement. L'hospitalité est une valeur fondamentale appelée la Teranga.",
    example: "- Na nga def ? (Comment vas-tu ?)\n- Mangi fi rekk. (Je vais bien seulement.)\n- Jërëjëf. (Merci.)",
    keywords: ["wolof", "senegal", "saluer", "traduction", "teranga", "langue"]
  },
  {
    title: "Vocabulary Basics (Anglais) 🇬🇧",
    subject: "Langues",
    competence: "anglais",
    content: "Pour dialoguer en anglais, il est important de connaître le vocabulaire de base de la maison, des animaux de compagnie et des salutations quotidiennes.",
    example: "- Hello/Hi (Bonjour)\n- A dog (Un chien) / A cat (Un chat)\n- A house (Une maison) / School (L'école)",
    keywords: ["anglais", "english", "traduction", "vocabulaire", "mot", "hello"]
  }
];

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
  // Navigation: default subtab is 'academie'
  const [activeSubTab, setActiveSubTab] = useState<'academie' | 'devoirs' | 'tuteur' | 'notes'>('academie');

  // Local storage progression stats
  const [stats, setStats] = useState<{
    xp: number;
    stars: number;
    level: number;
    streak: number;
    lastActiveDate: string;
    skills: {
      lecture: number;
      orthographe: number;
      calcul: number;
      conjugaison: number;
      culture: number;
      anglais: number;
      sciences: number;
    };
    completedQuizzesCount: number;
    lastWeeklyEvalDate: string;
  }>(() => {
    const key = `academy_stats_${member.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn("Erreur lecture stats locales, réinitialisation", e);
      }
    }
    return {
      xp: 0,
      stars: 0,
      level: 1,
      streak: 0,
      lastActiveDate: '',
      skills: {
        lecture: 20,
        orthographe: 20,
        calcul: 20,
        conjugaison: 20,
        culture: 20,
        anglais: 20,
        sciences: 20
      },
      completedQuizzesCount: 0,
      lastWeeklyEvalDate: ''
    };
  });

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<{
    type: 'quick' | 'daily' | 'weekly' | 'tutor';
    questions: AcademyQuestion[];
    currentIndex: number;
    score: number;
    answers: boolean[];
    selectedOption: string | null;
    showCorrection: boolean;
    xpEarned: number;
    starsEarned: number;
    showHint: boolean;
  } | null>(null);

  // Chatbox (Tuteur Local) State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; action?: { label: string; onClick: () => void } }>>([
    { sender: 'ai', text: `Salut ${member.name} ! Je suis ton Tuteur Local. 🦸‍♂️ Pas besoin d'internet ou d'une IA complexe pour apprendre ! Pose-moi des questions sur les fractions, l'Égypte, la conjugaison ou l'anglais, et je t'aiderai à réviser avec des mini-tests.` }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-save stats to localStorage
  useEffect(() => {
    const key = `academy_stats_${member.id}`;
    localStorage.setItem(key, JSON.stringify(stats));
  }, [stats, member.id]);

  // Check and update Streak
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (stats.lastActiveDate !== todayStr) {
      setStats(prev => {
        let newStreak = prev.streak;
        if (prev.lastActiveDate) {
          const lastDate = new Date(prev.lastActiveDate);
          const diffTime = Math.abs(new Date(todayStr).getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
        return {
          ...prev,
          streak: newStreak,
          lastActiveDate: todayStr
        };
      });
    }
  }, [member.id]);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Get current grade based on Age
  const getSchoolGrade = (): 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée' => {
    let parsedAge = 8; // Default to CE2 (8 years old)
    if (member.age) {
      const num = parseInt(member.age, 10);
      if (!isNaN(num)) parsedAge = num;
    } else if (member.birthDate) {
      const birth = new Date(member.birthDate);
      if (!isNaN(birth.getTime())) {
        const ageDifMs = Date.now() - birth.getTime();
        const ageDate = new Date(ageDifMs);
        parsedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      }
    }
    
    if (parsedAge <= 6) return 'CP';
    if (parsedAge === 7) return 'CE1';
    if (parsedAge === 8) return 'CE2';
    if (parsedAge === 9) return 'CM1';
    if (parsedAge === 10) return 'CM2';
    if (parsedAge === 11) return '6e';
    if (parsedAge === 12) return '5e';
    if (parsedAge === 13) return '4e';
    if (parsedAge === 14) return '3e';
    return 'Lycée';
  };

  const currentGrade = getSchoolGrade();

  // Unified School Tasks & Events calculation
  const myTasks = schoolTasks.filter(t => t.assignedMemberId === member.id);
  const isEvaluation = (task: SchoolTask) => {
    const titleLower = task.title.toLowerCase();
    const subjectLower = task.subject.toLowerCase();
    return titleLower.includes('éval') || 
           titleLower.includes('eval') || 
           titleLower.includes('contrôle') || 
           titleLower.includes('controle') || 
           titleLower.includes('test') || 
           titleLower.includes('examen') || 
           subjectLower.includes('éval') || 
           subjectLower.includes('contrôle');
  };

  const myHomeworks = myTasks.filter(t => !isEvaluation(t));
  const myEvaluations = myTasks.filter(t => isEvaluation(t));
  const schoolEvents = events.filter(e => 
    e.type === 'school' && 
    (!e.memberId || e.memberId === member.id || e.memberName?.toLowerCase() === member.name?.toLowerCase())
  );

  // Group agenda items for today
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const todayDayName = days[new Date().getDay()];
  const todayClasses = schedule
    .filter(item => item && (item.studentId === member.id || item.studentName?.toLowerCase() === member.name?.toLowerCase()) && item.day === todayDayName)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Handle local revision trigger
  const handleReviewWithTutor = (task: SchoolTask) => {
    setActiveSubTab('tuteur');
    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: `Aide-moi à réviser mon devoir de ${task.subject} : "${task.title}" 📖` }
    ]);
    setIsTyping(true);

    setTimeout(() => {
      // Local helper keyword logic
      const cleanSubject = task.subject.toLowerCase();
      let responseText = `C'est parti pour réviser ton devoir de **${task.subject}** : "${task.title}". 🌟\n\n`;

      const lesson = localLessons.find(l => cleanSubject.includes(l.subject.toLowerCase()) || l.keywords.some(k => task.title.toLowerCase().includes(k)));
      if (lesson) {
        responseText += `Voici une petite fiche de révision :\n\n📚 **${lesson.title}**\n${lesson.content}\n\n💡 *Exemple :* ${lesson.example}`;
      } else {
        responseText += `Pour réviser, relis attentivement ton cahier de cours. Prends ton temps pour comprendre les définitions et refais les exercices faits en classe.\n\nJe te propose un petit test rapide de 3 questions pour valider tes connaissances !`;
      }

      setChatMessages(prev => [
        ...prev,
        { 
          sender: 'ai', 
          text: responseText,
          action: {
            label: "Commencer le mini-test d'entraînement 🎯",
            onClick: () => launchTutorQuiz(task.subject)
          }
        }
      ]);
      setIsTyping(false);
    }, 800);
  };

  // Launch a localized mini-quiz from the tutor
  const launchTutorQuiz = (subject: string) => {
    const quizQuestions: AcademyQuestion[] = [];
    
    // Filter questions that match the subject
    const subjectStatic = staticAcademyQuestions.filter(q => q.matiere.toLowerCase().includes(subject.toLowerCase()));
    
    for (let i = 0; i < 3; i++) {
      if (Math.random() > 0.5 && subjectStatic.length > i) {
        quizQuestions.push(subjectStatic[i]);
      } else {
        // Generate dynamically
        const normSubject = subject.toLowerCase().includes('math') ? 'Mathématiques' : (subject.toLowerCase().includes('lang') ? 'Langues' : 'Français');
        quizQuestions.push(generateProceduralQuestion(currentGrade, normSubject));
      }
    }

    setActiveQuiz({
      type: 'tutor',
      questions: quizQuestions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 0,
      starsEarned: 0,
      showHint: false
    });
  };

  // Launch Quick Quiz (5 questions based on errors/weaknesses)
  const launchQuickQuiz = () => {
    // Find weakest skill
    let weakestSkill: keyof typeof stats.skills = 'calcul';
    let minScore = 101;
    Object.entries(stats.skills).forEach(([skill, val]) => {
      if (val < minScore) {
        minScore = val;
        weakestSkill = skill as keyof typeof stats.skills;
      }
    });

    const quizQuestions: AcademyQuestion[] = [];
    
    // Add 2 questions from the weakest skill (if static exists, or procedural)
    const matchingStatic = staticAcademyQuestions.filter(q => q.competence === weakestSkill && q.niveau === currentGrade);
    
    for (let i = 0; i < 5; i++) {
      if (i < 2 && matchingStatic.length > i) {
        quizQuestions.push(matchingStatic[i]);
      } else {
        // Procedural generation
        const mat = i % 3 === 0 ? 'Mathématiques' : (i % 3 === 1 ? 'Français' : 'Langues');
        quizQuestions.push(generateProceduralQuestion(currentGrade, mat));
      }
    }

    setActiveQuiz({
      type: 'quick',
      questions: quizQuestions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 0,
      starsEarned: 0,
      showHint: false
    });
  };

  // Launch Daily Challenge (10 questions: 5 maths, 3 conjugation, 2 discovery)
  const launchDailyChallenge = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `academy_daily_done_${member.id}`;
    if (localStorage.getItem(key) === todayStr) {
      alert("Tu as déjà réussi ton défi quotidien aujourd'hui ! Reviens demain. 😉🏆");
      return;
    }

    const quizQuestions: AcademyQuestion[] = [];
    
    // 5 Maths (Procedural)
    for (let i = 0; i < 5; i++) {
      quizQuestions.push(generateProceduralQuestion(currentGrade, 'Mathématiques'));
    }
    // 3 Conjugation (Procedural)
    for (let i = 0; i < 3; i++) {
      quizQuestions.push(generateProceduralQuestion(currentGrade, 'Français'));
    }
    // 2 Discovery (Static)
    const discoveryStatic = staticAcademyQuestions.filter(q => q.niveau === currentGrade && q.matiere === 'Découverte');
    if (discoveryStatic.length >= 2) {
      quizQuestions.push(discoveryStatic[0], discoveryStatic[1]);
    } else {
      // Fallback procedural
      quizQuestions.push(
        generateProceduralQuestion(currentGrade, 'Mathématiques'),
        generateProceduralQuestion(currentGrade, 'Langues')
      );
    }

    setActiveQuiz({
      type: 'daily',
      questions: quizQuestions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 0,
      starsEarned: 0,
      showHint: false
    });
  };

  // Launch Weekly Evaluation (10 general questions)
  const launchWeeklyEvaluation = () => {
    const quizQuestions: AcademyQuestion[] = [];
    // Fetch 10 questions for this grade level
    const gradeStatic = staticAcademyQuestions.filter(q => q.niveau === currentGrade);
    
    for (let i = 0; i < 10; i++) {
      if (gradeStatic.length > i) {
        quizQuestions.push(gradeStatic[i]);
      } else {
        const mat = i % 3 === 0 ? 'Mathématiques' : (i % 3 === 1 ? 'Français' : 'Langues');
        quizQuestions.push(generateProceduralQuestion(currentGrade, mat));
      }
    }

    setActiveQuiz({
      type: 'weekly',
      questions: quizQuestions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 0,
      starsEarned: 0,
      showHint: false
    });
  };

  // Submit Answer in Quiz
  const handleAnswerSubmit = (option: string) => {
    if (!activeQuiz || activeQuiz.showCorrection) return;

    const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
    const isCorrect = option === currentQ.reponse;
    
    const nextAnswers = [...activeQuiz.answers, isCorrect];
    const nextScore = activeQuiz.score + (isCorrect ? 1 : 0);
    
    let qXp = currentQ.xp || 10;
    let qStars = currentQ.etoiles || 1;

    // Daily Challenge gives double rewards
    if (activeQuiz.type === 'daily') {
      qXp *= 2;
      qStars *= 2;
    }

    const nextXpEarned = activeQuiz.xpEarned + (isCorrect ? qXp : 0);
    const nextStarsEarned = activeQuiz.starsEarned + (isCorrect ? qStars : 0);

    setActiveQuiz(prev => prev ? {
      ...prev,
      score: nextScore,
      answers: nextAnswers,
      selectedOption: option,
      showCorrection: true,
      xpEarned: nextXpEarned,
      starsEarned: nextStarsEarned
    } : null);

    // Update Skills progression dynamically
    const comp = currentQ.competence as keyof typeof stats.skills;
    setStats(prev => {
      const skillsCopy = { ...prev.skills };
      if (isCorrect) {
        skillsCopy[comp] = Math.min(100, (skillsCopy[comp] || 20) + 4);
      } else {
        skillsCopy[comp] = Math.max(10, (skillsCopy[comp] || 20) - 1);
      }
      return {
        ...prev,
        skills: skillsCopy
      };
    });
  };

  // Go to next question or complete quiz
  const handleNextQuestion = () => {
    if (!activeQuiz) return;

    if (activeQuiz.currentIndex + 1 < activeQuiz.questions.length) {
      setActiveQuiz(prev => prev ? {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedOption: null,
        showCorrection: false,
        showHint: false
      } : null);
    } else {
      // Quiz Finished! Apply XP & Stars & Level up check
      const totalXp = activeQuiz.xpEarned;
      const totalStars = activeQuiz.starsEarned;
      const cleanScore = activeQuiz.score;

      setStats(prev => {
        let newXp = prev.xp + totalXp;
        let newLevel = prev.level;
        // Level up algorithm (100 XP per level)
        const xpThreshold = newLevel * 100;
        if (newXp >= xpThreshold) {
          newXp -= xpThreshold;
          newLevel += 1;
          setTimeout(() => {
            alert(`🎉 FÉLICITATIONS ! Tu passes au Niveau ${newLevel} ! Continue comme ça ! 🚀🏆`);
          }, 600);
        }

        return {
          ...prev,
          xp: newXp,
          stars: prev.stars + totalStars,
          level: newLevel,
          completedQuizzesCount: prev.completedQuizzesCount + 1,
          lastWeeklyEvalDate: activeQuiz.type === 'weekly' ? new Date().toISOString().split('T')[0] : prev.lastWeeklyEvalDate
        };
      });

      // If Daily Challenge, save today's date
      if (activeQuiz.type === 'daily' && cleanScore >= 7) {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem(`academy_daily_done_${member.id}`, todayStr);
      }

      // Propose parent notifications or parent validation
      if (activeQuiz.type === 'weekly' && cleanScore >= 8) {
        alert(`Superbe évaluation hebdomadaire (${cleanScore}/10) ! Tu as débloqué le badge "Génie du Trimestre" ! 🏅 Vos parents ont été notifiés de vos résultats.`);
      }

      setActiveQuiz(null);
      alert(`Quiz terminé ! Score : ${cleanScore}/${activeQuiz.questions.length} ⭐️\nVous gagnez +${totalXp} XP et +${totalStars} Étoiles !`);
    }
  };

  // Local Tutor Chatbot handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      const cleanQuery = query.toLowerCase();
      let responseText = '';
      let matchedLesson: Lesson | undefined;

      // Scan keyword matches
      for (const lesson of localLessons) {
        if (lesson.keywords.some(k => cleanQuery.includes(k)) || cleanQuery.includes(lesson.subject.toLowerCase())) {
          matchedLesson = lesson;
          break;
        }
      }

      if (matchedLesson) {
        responseText = `J'ai trouvé une leçon pour toi ! 📖\n\n**${matchedLesson.title}** (${matchedLesson.subject})\n\n${matchedLesson.content}\n\n💡 *Exemple :* ${matchedLesson.example}\n\nVeux-tu tester tes connaissances tout de suite avec un mini-quiz ?`;
        
        setChatMessages(prev => [
          ...prev,
          { 
            sender: 'ai', 
            text: responseText,
            action: {
              label: `Tester mes connaissances en ${matchedLesson?.subject} 🎯`,
              onClick: () => launchTutorQuiz(matchedLesson?.subject || 'Mathématiques')
            }
          }
        ]);
      } else {
        responseText = `Je n'ai pas trouvé de leçon spécifique pour "${query}". 🧐\n\nMais je peux t'aider sur de nombreux sujets ! Essaye de me demander :\n- "Les fractions" 🍰\n- "Les tables de multiplication" 🧮\n- "Les Pharaons" 🏺\n- "Le pluriel des noms" ✍️\n- "Saluer en Wolof" 🇸🇳\n- "Le Système Solaire" 🌍\n\nQue veux-tu réviser ?`;
        
        setChatMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
      }
      setIsTyping(false);
    }, 900);
  };

  // Toggle single child homework done state
  const toggleHomeworkDone = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextState = !t.done;
        if (nextState) {
          // Add small XP/Stars instantly
          setStats(s => ({
            ...s,
            xp: s.xp + 5,
            stars: s.stars + 1
          }));
          alert("Bravo ! Devoir coché. Tu gagnes +5 XP et +1 Étoile ! Envoyé aux parents pour validation. 📚✨");
        }
        return { ...t, done: nextState, grade: undefined };
      }
      return t;
    }));
  };

  // Style helper for subjects
  const getSubjectStyle = (subj: string) => {
    const lower = subj.toLowerCase();
    if (lower.includes('math')) return { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-300', icon: '🧮' };
    if (lower.includes('hist') || lower.includes('géo') || lower.includes('geo')) return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-300', icon: '🌍' };
    if (lower.includes('scien') || lower.includes('svt') || lower.includes('bio')) return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: '🧬' };
    if (lower.includes('fran') || lower.includes('dictée')) return { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-300', icon: '✍️' };
    if (lower.includes('angl')) return { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-300', icon: '🇬🇧' };
    return { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-300', icon: '📖' };
  };

  // Parent configuration mocks for rewards
  const parentRewards = [
    { label: "1 heure de console de jeux", cost: 15, icon: "🎮" },
    { label: "Cinéma en famille ce weekend", cost: 30, icon: "🍿" },
    { label: "Argent de poche supplémentaire (+5€)", cost: 50, icon: "💶" },
    { label: "Choix du dîner de ce soir", cost: 10, icon: "🍕" }
  ];

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
              <span>🎓</span>
              <span>MaFamille+ Académie</span>
            </h1>
            <p className="text-xs text-white/50 font-bold">Niveau scolaire actuel : {currentGrade}</p>
          </div>
        </div>
        
        {/* Flame Streak and Stars */}
        <div className="flex items-center space-x-2">
          {stats.streak > 0 && (
            <div className="flex items-center space-x-1 bg-orange-500/10 border border-orange-500/25 px-2.5 py-1.5 rounded-xl text-orange-400 font-extrabold text-xs">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
              <span>{stats.streak} j</span>
            </div>
          )}
          <div className="flex items-center space-x-1 bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1.5 rounded-xl text-yellow-400 font-extrabold text-xs">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{stats.stars}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white/5 p-1 rounded-2xl border border-white/5 grid grid-cols-4 gap-1 mb-6">
        <button
          onClick={() => { setActiveSubTab('academie'); setActiveQuiz(null); }}
          className={`py-3 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'academie' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          🎮 Académie
        </button>
        <button
          onClick={() => { setActiveSubTab('devoirs'); setActiveQuiz(null); }}
          className={`py-3 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'devoirs' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          📚 Devoirs
        </button>
        <button
          onClick={() => { setActiveSubTab('tuteur'); setActiveQuiz(null); }}
          className={`py-3 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'tuteur' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          🤖 Tuteur
        </button>
        <button
          onClick={() => { setActiveSubTab('notes'); setActiveQuiz(null); }}
          className={`py-3 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer text-center ${
            activeSubTab === 'notes' 
              ? 'bg-[#00D26A] text-[#07111F] shadow-md shadow-[#00D26A]/20' 
              : 'text-white/50 hover:text-white/85'
          }`}
        >
          🏅 Bulletins
        </button>
      </div>

      {/* QUIZ SYSTEM POPUP/OVERLAY */}
      {activeQuiz && (
        <div className="bg-[#112240] border-2 border-[#00D26A]/30 rounded-[32px] p-6 shadow-2xl space-y-6 mb-6 relative">
          
          {/* Quiz Header info */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#00D26A] uppercase tracking-widest bg-[#00D26A]/10 px-3 py-1 rounded-full">
              {activeQuiz.type === 'daily' ? '🏆 Défi Quotidien' : activeQuiz.type === 'weekly' ? '⚡ Évaluation Hebdomadaire' : '📝 Quiz d\'entraînement'}
            </span>
            <span className="text-xs text-white/50 font-bold">
              Question {activeQuiz.currentIndex + 1} sur {activeQuiz.questions.length}
            </span>
          </div>

          {/* Quiz Progress bar */}
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00D26A] to-[#00FF87] transition-all" 
              style={{ width: `${((activeQuiz.currentIndex + 1) / activeQuiz.questions.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="space-y-2.5">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">
              {activeQuiz.questions[activeQuiz.currentIndex].chapitre} • {activeQuiz.questions[activeQuiz.currentIndex].matiere}
            </span>
            <h3 className="text-base font-extrabold text-white leading-snug">
              {activeQuiz.questions[activeQuiz.currentIndex].question}
            </h3>
          </div>

          {/* Answer Options Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            {activeQuiz.questions[activeQuiz.currentIndex].options.map((option, oIdx) => {
              const isSelected = activeQuiz.selectedOption === option;
              const isCorrect = option === activeQuiz.questions[activeQuiz.currentIndex].reponse;
              
              let btnStyle = "bg-white/5 border-white/10 text-white hover:bg-white/10";
              if (activeQuiz.showCorrection) {
                if (isCorrect) {
                  btnStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
                } else if (isSelected) {
                  btnStyle = "bg-rose-500/20 border-rose-500/50 text-rose-300";
                } else {
                  btnStyle = "bg-white/3 border-white/5 text-white/40";
                }
              }

              return (
                <button
                  key={oIdx}
                  onClick={() => handleAnswerSubmit(option)}
                  disabled={activeQuiz.showCorrection}
                  className={`w-full p-4 rounded-2xl border text-left font-black text-xs transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{option}</span>
                  {activeQuiz.showCorrection && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {activeQuiz.showCorrection && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Indice & Correction Area */}
          <div className="space-y-3 pt-2">
            {!activeQuiz.showCorrection && (
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setActiveQuiz(prev => prev ? { ...prev, showHint: !prev.showHint } : null)}
                  className="text-[10px] text-white/50 hover:text-white font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Besoin d'un indice ?</span>
                </button>
                {activeQuiz.showHint && (
                  <p className="text-[11px] text-yellow-300/80 italic font-semibold">
                    💡 Hint: {activeQuiz.questions[activeQuiz.currentIndex].indice}
                  </p>
                )}
              </div>
            )}

            {activeQuiz.showCorrection && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 animate-fadeIn">
                <p className="text-xs font-black text-white/80">
                  {activeQuiz.selectedOption === activeQuiz.questions[activeQuiz.currentIndex].reponse ? '✅ Très bonne réponse !' : '❌ Ce n\'est pas tout à fait ça.'}
                </p>
                <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                  {activeQuiz.questions[activeQuiz.currentIndex].explication}
                </p>
                
                <button
                  onClick={handleNextQuestion}
                  className="w-full mt-3 py-3 rounded-xl bg-[#00D26A] text-[#07111F] font-black text-xs hover:bg-[#00FF87] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Continuer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: ACADEMIE (GAME HUB) */}
      {activeSubTab === 'academie' && !activeQuiz && (
        <div className="space-y-6">
          
          {/* XP & NIVEAU STATS CARD */}
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#00D26A]/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-wider">Académie Progression</span>
                <h3 className="text-xl font-black text-white">
                  Niveau {stats.level}
                </h3>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#00D26A] to-[#00FF87] rounded-full transition-all duration-500" 
                  style={{ width: `${(stats.xp / (stats.level * 100)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-white/40">
                <span>{stats.xp} XP</span>
                <span>Prochain niveau à {stats.level * 100} XP</span>
              </div>
            </div>
          </div>

          {/* CORE ACTIONS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* Daily Challenge Button */}
            <button
              onClick={launchDailyChallenge}
              className="bg-gradient-to-br from-[#FFB020]/15 to-[#FF8C00]/15 border-2 border-[#FFB020]/30 rounded-[28px] p-5 text-left flex items-start space-x-4 hover:border-[#FFB020]/50 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="p-3.5 bg-[#FFB020]/20 rounded-2xl text-2xl shrink-0">
                🏆
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white flex items-center space-x-1.5">
                  <span>Défi Quotidien</span>
                  <span className="text-[8px] bg-[#FFB020]/20 text-[#FFB020] px-1.5 py-0.5 rounded-full uppercase">10 Qs</span>
                </h4>
                <p className="text-[11px] text-white/60 font-bold leading-snug">
                  5 Maths, 3 Conjugaisons, 2 Découvertes. Double XP et Étoiles !
                </p>
              </div>
            </button>

            {/* Quick Quiz Button */}
            <button
              onClick={launchQuickQuiz}
              className="bg-gradient-to-br from-[#00D26A]/15 to-[#00FF87]/15 border-2 border-[#00D26A]/25 rounded-[28px] p-5 text-left flex items-start space-x-4 hover:border-[#00D26A]/45 transition-all cursor-pointer"
            >
              <div className="p-3.5 bg-[#00D26A]/20 rounded-2xl text-2xl shrink-0">
                ⚡
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white flex items-center space-x-1.5">
                  <span>Quiz Rapide</span>
                  <span className="text-[8px] bg-[#00D26A]/20 text-[#00D26A] px-1.5 py-0.5 rounded-full uppercase">5 Qs</span>
                </h4>
                <p className="text-[11px] text-white/60 font-bold leading-snug">
                  5 questions aléatoires ciblant vos compétences à améliorer.
                </p>
              </div>
            </button>

            {/* Weekly Evaluation */}
            <button
              onClick={launchWeeklyEvaluation}
              className="bg-gradient-to-br from-[#6C5CFF]/15 to-[#4F8CFF]/15 border-2 border-[#6C5CFF]/25 rounded-[28px] p-5 text-left flex items-start space-x-4 hover:border-[#6C5CFF]/45 transition-all cursor-pointer md:col-span-2"
            >
              <div className="p-3.5 bg-[#6C5CFF]/20 rounded-2xl text-2xl shrink-0">
                📝
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white flex items-center space-x-1.5">
                  <span>Évaluation Hebdomadaire</span>
                  <span className="text-[8px] bg-[#6C5CFF]/20 text-[#6C5CFF] px-1.5 py-0.5 rounded-full uppercase">10 Qs</span>
                </h4>
                <p className="text-[11px] text-white/60 font-bold leading-snug">
                  Évaluation complète de la semaine. Débloquez de prestigieux Badges !
                </p>
              </div>
            </button>
          </div>

          {/* SKILLS JAUGE SECTION */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              📊 Mes Compétences Académiques :
            </span>

            <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 space-y-4">
              {Object.entries(stats.skills).map(([skill, val]) => {
                let color = "from-indigo-500 to-indigo-400";
                if (skill === 'calcul') color = "from-emerald-500 to-emerald-400";
                if (skill === 'orthographe' || skill === 'conjugaison') color = "from-pink-500 to-pink-400";
                if (skill === 'culture') color = "from-amber-500 to-amber-400";
                
                return (
                  <div key={skill} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-black">
                      <span className="capitalize text-white/80">{skill}</span>
                      <span className="text-[#00D26A]">{val}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${color} rounded-full`} 
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PARENT REWARDS LIST */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block flex items-center space-x-1 text-yellow-400">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Boutique des Récompenses (Parents) :</span>
            </span>

            <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 space-y-2.5">
              {parentRewards.map((rew, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-white/3 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{rew.icon}</span>
                    <span className="text-xs font-black text-white">{rew.label}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1 rounded-xl text-yellow-400 font-extrabold text-[10px] uppercase">
                    <span>{rew.cost}</span>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB: DEVOIRS & AGENDA UNIFIED */}
      {activeSubTab === 'devoirs' && (
        <div className="space-y-6">
          
          {/* Progress overview */}
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg space-y-3">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-wider">Progression Devoirs</span>
                <h3 className="text-sm font-extrabold text-white">
                  {myHomeworks.filter(t => t.done).length} sur {myHomeworks.length} devoirs faits !
                </h3>
              </div>
              <span className="text-2xl">🚀</span>
            </div>
            
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-[#00D26A] to-[#00FF87] rounded-full transition-all" 
                style={{ width: `${myHomeworks.length > 0 ? (myHomeworks.filter(t => t.done).length / myHomeworks.length) * 100 : 100}%` }}
              />
            </div>
          </div>

          {/* CHRONOLOGICAL AGENDA FEED */}
          <div className="space-y-4">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              📅 Mon Agenda Scolaire (Aujourd'hui) :
            </span>

            {/* 1. Today's Classes */}
            {todayClasses.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">🏫 Cours de la journée ({todayDayName})</span>
                {todayClasses.map(cls => {
                  const style = getSubjectStyle(cls.subject);
                  return (
                    <div key={cls.id} className="bg-[#112240] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{style.icon}</span>
                        <div>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${style.bg} ${style.border} ${style.text}`}>
                            {cls.subject}
                          </span>
                          <h4 className="text-xs font-black text-white mt-1">
                            {cls.startTime} - {cls.endTime}
                          </h4>
                          {cls.room && <p className="text-[9px] text-white/40 font-bold">📍 Salle : {cls.room}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-white/30 uppercase">Classe</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Today's Homework / Tasks */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">📖 Devoirs et exercices à faire</span>
              
              {myHomeworks.filter(t => !t.done).length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-5 text-center text-xs text-white/40 font-bold">
                  Aucun devoir à faire pour le moment ! 🎉
                </div>
              ) : (
                myHomeworks.filter(t => !t.done).map(task => {
                  const style = getSubjectStyle(task.subject);
                  return (
                    <div key={task.id} className="bg-[#112240] border-2 border-[#00D26A]/10 rounded-3xl p-4 space-y-3.5 hover:border-[#00D26A]/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${style.bg} ${style.border} ${style.text}`}>
                            {task.subject}
                          </span>
                          <h4 className="text-xs font-extrabold text-white leading-snug">{task.title}</h4>
                        </div>
                        <button 
                          onClick={() => toggleHomeworkDone(task.id)}
                          className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 active:scale-95 transition-all shrink-0"
                        >
                          {task.done ? '✓' : ''}
                        </button>
                      </div>

                      <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                        <span className="text-[9.5px] text-white/40 font-bold flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Pour le : {task.dueDate}</span>
                        </span>
                        <button
                          onClick={() => handleReviewWithTutor(task)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] hover:from-[#5849E0] text-white font-black text-[9px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-white" />
                          <span>Réviser avec le Tuteur</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 3. Upcoming School Evaluations */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-[#FFB020] uppercase tracking-widest block">⚠️ Évaluations et contrôles programmés</span>
              {myEvaluations.length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4 text-center text-xs text-white/30">
                  Aucune évaluation programmée. 👍
                </div>
              ) : (
                myEvaluations.map(task => {
                  const style = getSubjectStyle(task.subject);
                  return (
                    <div key={task.id} className="bg-[#112240] border-2 border-[#FFB020]/20 rounded-3xl p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex space-x-1.5">
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-[#FFB020]/10 border border-[#FFB020]/30 text-[#FFB020]">Contrôle</span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border ${style.bg} ${style.border} ${style.text}`}>{task.subject}</span>
                        </div>
                        <h4 className="text-xs font-black text-white leading-tight">{task.title}</h4>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-[9px] text-[#FFB020] font-bold">Le : {task.dueDate}</span>
                        <button
                          onClick={() => handleReviewWithTutor(task)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FFB020] to-[#FF8C00] text-white font-black text-[9px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Réviser</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 4. Outings and events */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">⛺ Sorties et vie scolaire</span>
              {schoolEvents.length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4 text-center text-xs text-white/30">
                  Aucune sortie de planifiée.
                </div>
              ) : (
                schoolEvents.map(event => (
                  <div key={event.id} className="bg-[#112240] border border-white/5 rounded-2xl p-4 flex items-start space-x-3">
                    <span className="text-xl">⛺</span>
                    <div>
                      <h4 className="text-xs font-black text-white leading-tight">{event.title}</h4>
                      <p className="text-[9px] text-[#00D26A] font-bold">Le {event.dateTime} {event.time ? `à ${event.time}` : ''}</p>
                      {event.description && <p className="text-[9.5px] text-white/50 leading-relaxed mt-1 font-medium">{event.description}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB: TUTEUR LOCAL AUTONOME */}
      {activeSubTab === 'tuteur' && (
        <div className="space-y-4 flex flex-col min-h-[calc(100vh-250px)]">
          
          {/* Chat log window */}
          <div className="flex-1 bg-white/5 border border-white/8 rounded-[32px] p-4 flex flex-col space-y-4 overflow-y-auto max-h-[420px] shadow-inner relative">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-[10px] text-blue-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Moteur local actif. Le Tuteur utilise les fiches et les algorithmes internes de l'application ! 🤖✨</p>
            </div>

            {chatMessages.map((msg, idx) => {
              const isAi = msg.sender === 'ai';
              return (
                <div 
                  key={idx} 
                  className={`flex items-start space-x-2.5 ${!isAi ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-md ${
                    isAi ? 'bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF]' : 'bg-[#00D26A]/20 border border-[#00D26A]/30 text-white'
                  }`}>
                    {isAi ? '🤖' : '👦'}
                  </div>
                  
                  <div className="space-y-2 max-w-[80%]">
                    <div className={`p-4 rounded-3xl text-xs font-medium leading-relaxed shadow-sm ${
                      isAi 
                        ? 'bg-[#112240] border border-white/8 text-white rounded-tl-none' 
                        : 'bg-[#00D26A] text-[#07111F] font-bold rounded-tr-none'
                    }`}>
                      {msg.text.split('\n').map((line, lIdx) => (
                        <p key={lIdx} className={lIdx > 0 ? 'mt-1.5' : ''}>{line}</p>
                      ))}
                    </div>

                    {msg.action && (
                      <button
                        onClick={msg.action.onClick}
                        className="px-4 py-2.5 rounded-xl bg-[#00D26A] text-[#07111F] font-black text-[10px] uppercase tracking-wider hover:bg-[#00FF87] active:scale-95 transition-all shadow-md cursor-pointer block"
                      >
                        {msg.action.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF] flex items-center justify-center shrink-0 text-sm animate-pulse">
                  🤖
                </div>
                <div className="bg-[#112240] border border-white/8 p-3 rounded-2xl text-xs flex items-center space-x-2 text-white/50 rounded-tl-none">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Le tuteur consulte ses manuels...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick topic suggestion pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0">
            <span className="text-[9px] font-black text-white/30 uppercase shrink-0">Sujets :</span>
            <button 
              onClick={() => { setUserInput("Parle-moi des fractions"); }}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-white/80 font-black text-[10px] shrink-0 cursor-pointer"
            >
              🍰 Fractions
            </button>
            <button 
              onClick={() => { setUserInput("Aide-moi sur les tables de multiplication"); }}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-white/80 font-black text-[10px] shrink-0 cursor-pointer"
            >
              🧮 Multiplications
            </button>
            <button 
              onClick={() => { setUserInput("Qui étaient les pharaons ?"); }}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-white/80 font-black text-[10px] shrink-0 cursor-pointer"
            >
              🏺 Pharaons d'Égypte
            </button>
            <button 
              onClick={() => { setUserInput("Comment saluer en Wolof ?"); }}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-white/80 font-black text-[10px] shrink-0 cursor-pointer"
            >
              🇸🇳 Salutations Wolof
            </button>
          </div>

          {/* Chat send box */}
          <form onSubmit={handleSendMessage} className="flex space-x-2 mt-auto">
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Pose une question sur les fractions, la grammaire..."
              className="flex-1 bg-white/5 border border-white/8 rounded-2xl px-4 py-3.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A] transition-all"
            />
            <button 
              type="submit"
              disabled={isTyping || !userInput.trim()}
              className="p-4 rounded-2xl bg-[#00D26A] text-[#07111F] hover:bg-[#00FF87] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center shadow-lg active:scale-95 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* SUB-TAB: NOTES & BULLETINS (READ ONLY) */}
      {activeSubTab === 'notes' && (
        <div className="space-y-6">
          
          <div className="bg-white/3 border border-white/5 rounded-2xl p-3.5 text-center text-[10px] text-white/45 font-bold uppercase tracking-wider">
            🔒 Bulletins officiels — Lecture seule (Parent)
          </div>

          {/* Average Normalized Grade */}
          {grades.length > 0 ? (
            (() => {
              const myRealGrades = grades.filter(g => g.studentId === member.id);
              const normalized = myRealGrades.map(g => (g.value / g.max) * 20);
              const avg = normalized.length > 0 
                ? Number((normalized.reduce((sum, val) => sum + val, 0) / normalized.length).toFixed(2))
                : null;

              if (avg === null) {
                return (
                  <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center text-xs text-white/40 font-bold">
                    Aucune note n'a été partagée par les parents pour le moment. 🏅
                  </div>
                );
              }

              return (
                <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center space-y-3.5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-[#FFD700]/10 blur-xl pointer-events-none" />
                  
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Moyenne Générale Trimestre</span>
                    <div className="inline-flex items-baseline space-x-1 bg-white/5 border border-white/8 px-6 py-2.5 rounded-3xl">
                      <span className="text-3xl font-black text-[#FFB020]">{avg}</span>
                      <span className="text-xs font-bold text-white/40">/ 20</span>
                    </div>
                  </div>

                  <p className="text-xs text-white/70 font-semibold italic">
                    "{avg >= 15 ? 'Excellent trimestre. Le tuteur est fier de toi ! 🏆✨' : 'Trimestre satisfaisant, continue à t\'entraîner avec les défis quotidiens ! 🚀'}"
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center text-xs text-white/40 font-bold">
              Aucun bulletin configuré dans le module parent.
            </div>
          )}

          {/* Detailed Grades Feed */}
          {grades.filter(g => g.studentId === member.id).length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                📊 Relevé détaillé des notes :
              </span>

              <div className="space-y-3">
                {grades.filter(g => g.studentId === member.id).map((grade, idx) => {
                  const style = getSubjectStyle(grade.subject);
                  const isExcellent = (grade.value / grade.max) >= 0.8;
                  
                  return (
                    <div key={idx} className="bg-[#112240] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-black text-[#FFB020]">{grade.value}/{grade.max}</span>
                        </div>
                        <div>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${style.bg} ${style.border} ${style.text}`}>
                            {grade.subject}
                          </span>
                          <h4 className="text-xs font-black text-white mt-1 leading-snug">{grade.examTitle}</h4>
                          <p className="text-[9px] text-white/40 font-bold">Obtenue le : {grade.date}</p>
                        </div>
                      </div>

                      {isExcellent && (
                        <span className="text-xl">🌟</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
