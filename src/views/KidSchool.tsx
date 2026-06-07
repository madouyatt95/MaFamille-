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
import type { Member, SchoolTask, FamilyEvent } from '../types';
import { staticAcademyQuestions, staticAcademyLessons } from '../data/academyData';
import type { AcademyQuestion, Lesson } from '../data/academyData';
import { generateProceduralQuestion, generateQuestionForLesson } from '../utils/academyGenerator';

export interface KidSchoolProps {
  member: Member;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  dishes?: any[];
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

// Local Lessons Database for the local coach dictionary lookup
interface DictionaryEntry {
  keywords: string[];
  response: string;
  subject: string;
}

const localDictionary: DictionaryEntry[] = [
  {
    keywords: ["7x8", "7*8", "table de 7", "multiplication 7"],
    subject: "Mathématiques",
    response: `7 groupes de 8 font 56.
🍎🍎🍎🍎🍎🍎🍎🍎 (groupe 1)
🍎🍎🍎🍎🍎🍎🍎🍎 (groupe 2)
🍎🍎🍎🍎🍎🍎🍎🍎 (groupe 3)
🍎🍎🍎🍎🍎🍎🍎🍎 (groupe 4)
🍎🍎🍎🍎🍎🍎🍎🍎 (groupe 5)
🍎🍎🍎🍎🍎🍎🍎🍎 (groupe 6)
🍎🍎🍎🍎🍎🍎🍎🍎 (groupe 7)

Retiens bien : 7 × 8 = 56.
💡 Astuce mémo : 5, 6, 7, 8 ➔ 56 = 7 × 8 !`
  },
  {
    keywords: ["fraction", "partage", "quart", "demi"],
    subject: "Mathématiques",
    response: `Une fraction représente le partage d'une unité en parts égales.
🍰 ➔ Coupé en 2 parts égales. 1 part = 1/2 (un demi).
🍕 ➔ Coupé en 4 parts égales. 1 part = 1/4 (un quart).

- Numérateur (haut) : Le nombre de parts que tu prends.
- Dénominateur (bas) : Le nombre total de parts coupées.`
  },
  {
    keywords: ["pluriel", "orthographe", "noms en -al", "festival"],
    subject: "Français",
    response: `Les noms masculins en "-al" font leur pluriel en "-aux".
🐎 Un cheval ➔ Des chevaux
📰 Un journal ➔ Des journaux

⚠️ Piège / Exceptions à retenir (prennent un "s") :
bal, cal, carnaval, chacal, festival, régal, récital.
🎪 Un carnaval ➔ Des carnavals !`
  },
  {
    keywords: ["sujet", "accord", "verbe", "sujet verbe"],
    subject: "Français",
    response: `Le verbe s'accorde toujours avec son sujet !
- Si le sujet est singulier ➔ le verbe se termine par e, t, d... (ex: Le chat mange)
- Si le sujet est pluriel ➔ le verbe se termine par -ent (ex: Les chats mangent)

💡 Conseil : pour trouver le sujet, pose la question : "Qui est-ce qui ?" + verbe.`
  },
  {
    keywords: ["pharaon", "egypte", "pyramide", "momie"],
    subject: "Histoire",
    response: `Les pharaons régnaient sur l'Égypte ancienne il y a des milliers d'années.
▲ Pyramides : Tombeaux géants construits pour protéger la momie du pharaon.
𓀾 Toutânkhamon et Ramsès II sont deux pharaons très célèbres !`
  },
  {
    keywords: ["eau", "etats de l'eau", "glace", "vapeur"],
    subject: "Sciences",
    response: `L'eau existe sous 3 états différents :
💧 Liquide : l'eau de pluie, des rivières, du robinet.
❄️ Solide (sous 0°C) : la glace, la neige, le givre.
💨 Gazeux (au-dessus de 100°C) : la vapeur d'eau (invisible).`
  },
  {
    keywords: ["ocean", "continent", "terre", "carte"],
    subject: "Géographie",
    response: `La Terre possède :
🗺️ 6 Continents : Asie, Afrique, Amérique, Europe, Océanie, Antarctique.
🌊 5 Océans : Pacifique, Atlantique, Indien, Arctique, Antarctique.`
  },
  {
    keywords: ["musique", "instruments", "violon", "trompette"],
    subject: "Culture",
    response: `Les instruments de musique sont divisés en 3 grandes familles :
🎻 Les Cordes : violon, guitare, piano.
🎺 Les Vents : flûte, trompette, clarinette.
🥁 Les Percussions : tambour, triangle, xylophone.`
  }
];

export const KidSchool: React.FC<KidSchoolProps> = ({
  member,
  schoolTasks,
  setSchoolTasks,
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

  // Subjects, Categories, and Lesson Picker
  const [selectedSubject, setSelectedSubject] = useState<'Mathématiques' | 'Français' | 'Découverte' | 'Langues' | 'Sciences' | 'Histoire' | 'Géographie' | 'Lecture' | 'Culture' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Lesson progression tracking: 'none' | 'lesson_read' | 'exercises_done' | 'challenge_done' | 'completed'
  const [lessonProgress, setLessonProgress] = useState<Record<string, 'none' | 'lesson_read' | 'exercises_done' | 'challenge_done' | 'completed'>>(() => {
    const key = `academy_lesson_progress_${member.id}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    const key = `academy_lesson_progress_${member.id}`;
    localStorage.setItem(key, JSON.stringify(lessonProgress));
  }, [lessonProgress, member.id]);

  // Local stats state. All skills start at 0%
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
      try { return JSON.parse(stored); } catch (e) {}
    }
    return {
      xp: 0,
      stars: 0,
      level: 1,
      streak: 0,
      lastActiveDate: '',
      skills: {
        lecture: 0,
        orthographe: 0,
        calcul: 0,
        conjugaison: 0,
        culture: 0,
        anglais: 0,
        sciences: 0
      },
      completedQuizzesCount: 0,
      lastWeeklyEvalDate: ''
    };
  });

  // Save Stats
  useEffect(() => {
    const key = `academy_stats_${member.id}`;
    localStorage.setItem(key, JSON.stringify(stats));
  }, [stats, member.id]);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<{
    type: 'quick' | 'daily' | 'weekly' | 'tutor' | 'kid_exercises' | 'kid_evaluation';
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

  // Exercise config length state
  const [exerciseLength, setExerciseLength] = useState<number>(10);

  // Mini-game (Memory) States
  const [activeGame, setActiveGame] = useState<boolean>(false);
  const [memoryCards, setMemoryCards] = useState<Array<{ id: number; content: string; matchId: number; isFlipped: boolean; isMatched: boolean }>>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  // Local Chatbot (Coach) States
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; action?: { label: string; onClick: () => void } }>>([
    { sender: 'ai', text: `Bonjour ${member.name} ! Je suis ton Coach Scolaire. 🦾 Prêt à relever tes défis et à gagner de l'argent de poche ? Demande-moi n'importe quel cours (ex: "7x8" ou "les fractions") pour réviser !` }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Calculate age-based level
  const getSchoolGrade = (): 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée' => {
    let parsedAge = 8;
    if (member.age) {
      const num = parseInt(member.age, 10);
      if (!isNaN(num)) parsedAge = num;
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

  // Streak update on startup
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

  // Unified Devoirs & Agenda Feed
  const myTasks = schoolTasks.filter(t => t.assignedMemberId === member.id);
  const isEvaluation = (task: SchoolTask) => {
    const titleLower = task.title.toLowerCase();
    const subjectLower = task.subject.toLowerCase();
    return titleLower.includes('éval') || titleLower.includes('eval') || titleLower.includes('contrôle') || titleLower.includes('controle') || titleLower.includes('test') || titleLower.includes('examen') || subjectLower.includes('éval') || subjectLower.includes('contrôle');
  };

  const myHomeworks = myTasks.filter(t => !isEvaluation(t));
  const myEvaluations = myTasks.filter(t => isEvaluation(t));

  const schoolEvents = events.filter(e => 
    e.type === 'school' && 
    (!e.memberId || e.memberId === member.id || e.memberName?.toLowerCase() === member.name?.toLowerCase())
  );

  const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todayClasses = schedule.filter(s => (s.studentId === member.id || s.studentName === member.name) && s.day === todayDayName);

  // Subject Categories Map
  const subjectCategories: Record<string, string[]> = {
    Mathématiques: ["Tables de multiplication", "Additions", "Soustractions", "Divisions", "Fractions", "Géométrie", "Problèmes", "Calcul mental", "Mesures", "Heures", "Argent"],
    Français: ["Lecture", "Conjugaison", "Orthographe", "Grammaire", "Vocabulaire"],
    Découverte: ["Sciences", "Histoire", "Géographie", "Culture"],
    Sciences: ["Sciences"],
    Histoire: ["Histoire"],
    Géographie: ["Géographie"],
    Langues: ["Anglais", "Wolof"],
    Lecture: ["Lecture"],
    Culture: ["Culture"]
  };

  // Helper: Shuffle Array
  const shuffle = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Trigger Memory Game
  const startMemoryGame = (lesson: Lesson) => {
    let pairs: Array<{ content: string; matchContent: string }> = [];

    if (lesson.id === 'les_cp_mat_add') {
      pairs = [
        { content: "3 + 2", matchContent: "5" },
        { content: "4 + 4", matchContent: "8" },
        { content: "5 + 1", matchContent: "6" },
        { content: "7 + 2", matchContent: "9" }
      ];
    } else if (lesson.id === 'les_ce2_mat_mult7') {
      pairs = [
        { content: "7 × 2", matchContent: "14" },
        { content: "7 × 5", matchContent: "35" },
        { content: "7 × 7", matchContent: "49" },
        { content: "7 × 8", matchContent: "56" }
      ];
    } else if (lesson.id === 'les_cm1_mat_frac') {
      pairs = [
        { content: "1/2", matchContent: "Demi" },
        { content: "1/4", matchContent: "Quart" },
        { content: "3/4", matchContent: "Trois quarts" },
        { content: "2/2", matchContent: "Un entier" }
      ];
    } else if (lesson.id === 'les_cp_fra_ou') {
      pairs = [
        { content: "L-[ou]-p", matchContent: "Loup" },
        { content: "R-[ou]-e", matchContent: "Roue" },
        { content: "P-[ou]-le", matchContent: "Poule" },
        { content: "G-en-[ou]", matchContent: "Genou" }
      ];
    } else if (lesson.id === 'les_cp_lan_colors') {
      pairs = [
        { content: "Red", matchContent: "Rouge" },
        { content: "Blue", matchContent: "Bleu" },
        { content: "Yellow", matchContent: "Jaune" },
        { content: "Green", matchContent: "Vert" }
      ];
    } else {
      pairs = [
        { content: "Pharaon", matchContent: "Roi d'Égypte" },
        { content: "Nil", matchContent: "Fleuve Égypte" },
        { content: "Pacifique", matchContent: "Grand Océan" },
        { content: "Asie", matchContent: "Grand Continent" }
      ];
    }

    const cardsList: Array<{ id: number; content: string; matchId: number; isFlipped: boolean; isMatched: boolean }> = [];
    pairs.forEach((p, idx) => {
      cardsList.push({
        id: idx * 2,
        content: p.content,
        matchId: idx * 2 + 1,
        isFlipped: false,
        isMatched: false
      });
      cardsList.push({
        id: idx * 2 + 1,
        content: p.matchContent,
        matchId: idx * 2,
        isFlipped: false,
        isMatched: false
      });
    });

    setMemoryCards(shuffle(cardsList));
    setSelectedCards([]);
    setActiveGame(true);
  };

  const handleCardClick = (cardId: number) => {
    if (selectedCards.length >= 2) return;
    
    const target = memoryCards.find(c => c.id === cardId);
    if (!target || target.isFlipped || target.isMatched) return;

    setMemoryCards(prev => prev.map(c => c.id === cardId ? { ...c, isFlipped: true } : c));
    const nextSelected = [...selectedCards, cardId];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      const first = memoryCards.find(c => c.id === nextSelected[0])!;
      const second = memoryCards.find(c => c.id === cardId)!;

      if (first.matchId === second.id || second.matchId === first.id) {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === first.id || c.id === second.id) ? { ...c, isMatched: true } : c));
          setSelectedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === first.id || c.id === second.id) ? { ...c, isFlipped: false } : c));
          setSelectedCards([]);
        }, 1200);
      }
    }
  };

  useEffect(() => {
    if (activeGame && memoryCards.length > 0 && memoryCards.every(c => c.isMatched)) {
      setTimeout(() => {
        alert("🎉 Bravo ! Tu as trouvé toutes les paires ! Mini-jeu complété. Tu débloques l'Évaluation ! 🏆");
        if (selectedLesson) {
          setLessonProgress(prev => ({
            ...prev,
            [selectedLesson.id]: 'challenge_done'
          }));
          setStats(prev => ({
            ...prev,
            xp: prev.xp + 20,
            stars: prev.stars + 2
          }));
        }
        setActiveGame(false);
      }, 600);
    }
  }, [memoryCards, activeGame]);

  // Trigger exercise session (10, 20, 50, 100)
  const startKidExercises = (lesson: Lesson, count: number) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < count; i++) {
      questions.push(generateQuestionForLesson(lesson.id, currentGrade));
    }
    setActiveQuiz({
      type: 'kid_exercises',
      questions,
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

  const startKidEvaluation = (lesson: Lesson) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < 10; i++) {
      questions.push(generateQuestionForLesson(lesson.id, currentGrade));
    }
    setActiveQuiz({
      type: 'kid_evaluation',
      questions,
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

  const launchDailyChallenge = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `academy_daily_done_kid_${member.id}`;
    if (localStorage.getItem(key) === todayStr) {
      alert("Défi quotidien déjà complété aujourd'hui. 😉🏆");
      return;
    }

    const quizQuestions: AcademyQuestion[] = [];
    for (let i = 0; i < 5; i++) {
      const mat = i % 2 === 0 ? 'Mathématiques' : 'Français';
      quizQuestions.push(generateProceduralQuestion(currentGrade, mat));
    }

    setActiveQuiz({
      type: 'kid_evaluation',
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

  const launchWeeklyEvaluation = () => {
    const quizQuestions: AcademyQuestion[] = [];
    for (let i = 0; i < 10; i++) {
      const mat = i % 3 === 0 ? 'Mathématiques' : (i % 3 === 1 ? 'Français' : 'Langues');
      quizQuestions.push(generateProceduralQuestion(currentGrade, mat));
    }

    setActiveQuiz({
      type: 'kid_evaluation',
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

  const handleAnswerSubmit = (option: string) => {
    if (!activeQuiz || activeQuiz.showCorrection) return;

    const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
    const isCorrect = option === currentQ.reponse;
    const nextAnswers = [...activeQuiz.answers, isCorrect];
    const nextScore = activeQuiz.score + (isCorrect ? 1 : 0);

    let qXp = currentQ.xp || 10;
    let qStars = currentQ.etoiles || 1;

    const nextXp = activeQuiz.xpEarned + (isCorrect ? qXp : 0);
    const nextStars = activeQuiz.starsEarned + (isCorrect ? qStars : 0);

    setActiveQuiz(prev => prev ? {
      ...prev,
      score: nextScore,
      answers: nextAnswers,
      selectedOption: option,
      showCorrection: true,
      xpEarned: nextXp,
      starsEarned: nextStars
    } : null);

    // Update Skills progression
    const comp = currentQ.competence as keyof typeof stats.skills;
    setStats(prev => {
      const skillsCopy = { ...prev.skills };
      if (isCorrect) {
        skillsCopy[comp] = Math.min(100, (skillsCopy[comp] || 0) + 5);
      } else {
        skillsCopy[comp] = Math.max(0, (skillsCopy[comp] || 0) - 1);
      }
      return { ...prev, skills: skillsCopy };
    });
  };

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
      const totalXp = activeQuiz.xpEarned;
      const totalStars = activeQuiz.starsEarned;
      const cleanScore = activeQuiz.score;

      setStats(prev => {
        let newXp = prev.xp + totalXp;
        let newLevel = prev.level;
        const xpThreshold = newLevel * 100;
        if (newXp >= xpThreshold) {
          newXp -= xpThreshold;
          newLevel += 1;
          setTimeout(() => {
            alert(`🎉 BRAVO ! Tu passes au Niveau ${newLevel} ! Ta persévérance paie ! 🚀🏆`);
          }, 600);
        }
        return {
          ...prev,
          xp: newXp,
          stars: prev.stars + totalStars,
          level: newLevel,
          completedQuizzesCount: prev.completedQuizzesCount + 1
        };
      });

      if (activeQuiz.type === 'kid_exercises') {
        if (selectedLesson) {
          setLessonProgress(prev => ({
            ...prev,
            [selectedLesson.id]: 'exercises_done'
          }));
          setTimeout(() => {
            alert(`🎉 Entraînement réussi ! Score : ${cleanScore}/${activeQuiz.questions.length}\nLe Mini-jeu est maintenant débloqué ! 🎮`);
          }, 800);
        }
      } else if (activeQuiz.type === 'kid_evaluation') {
        if (cleanScore >= 8) {
          if (selectedLesson) {
            setLessonProgress(prev => ({
              ...prev,
              [selectedLesson.id]: 'completed'
            }));

            // Submit pocket money validation task to parents
            const pocketMoneyTask: SchoolTask = {
              id: `pocket-${Date.now()}`,
              title: `Argent de poche : validation de la leçon "${selectedLesson.title}" pour ${member.name}`,
              subject: 'Récompense',
              difficulty: 'medium',
              assignedMemberId: member.id,
              dueDate: 'Aujourd\'hui',
              done: true,
              grade: undefined // Pending parent validation
            };
            setSchoolTasks(prev => [...prev, pocketMoneyTask]);

            setTimeout(() => {
              alert(`🏆 Évaluation validée ! Score : ${cleanScore}/10.\nLa leçon "${selectedLesson.title}" est complétée !\nTu gagnes +50 XP, +5 Étoiles, et une suggestion d'argent de poche (+0.50€) a été envoyée aux parents ! 💶✨`);
            }, 800);
          }
        } else {
          setTimeout(() => {
            alert(`😢 Évaluation échouée (Score : ${cleanScore}/10). Tu dois obtenir au moins 8/10. Relis la leçon et réessaye !`);
          }, 800);
          setActiveQuiz(null);
          return;
        }
      }

      setActiveQuiz(null);
    }
  };

  // Local Coach Chatbot response (No Cloud AI)
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      const cleanQuery = query.toLowerCase();
      let matchedEntry: DictionaryEntry | undefined;

      for (const entry of localDictionary) {
        if (entry.keywords.some(k => cleanQuery.includes(k))) {
          matchedEntry = entry;
          break;
        }
      }

      if (matchedEntry) {
        setChatMessages(prev => [
          ...prev,
          { 
            sender: 'ai', 
            text: matchedEntry?.response || '',
            action: {
              label: `Lancer le mini-test d'entraînement en ${matchedEntry?.subject} 🎯`,
              onClick: () => launchTutorQuiz(matchedEntry?.subject || 'Mathématiques')
            }
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { 
            sender: 'ai', 
            text: `Je n'ai pas trouvé de fiche pour "${query}". 🧐\n\nTu peux essayer de me demander :\n- "table de 7" 🧮\n- "fractions" 🍰\n- "noms en -al" ✍️\n- "pharaons" 🏺\n- "états de l'eau" 💧\n- "océans" 🌎\n- "instruments" 🎵\n\nQue veux-tu réviser ?`
          }
        ]);
      }
      setIsTyping(false);
    }, 800);
  };

  const launchTutorQuiz = (subject: string) => {
    const quizQuestions: AcademyQuestion[] = [];
    const normalized = subject.toLowerCase().includes('math') ? 'Mathématiques' : (subject.toLowerCase().includes('lang') ? 'Langues' : 'Français');
    for (let i = 0; i < 3; i++) {
      quizQuestions.push(generateProceduralQuestion(currentGrade, normalized));
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

  // Coach recommendations triggers
  const handleReviewWithTutor = (task: SchoolTask) => {
    setActiveSubTab('tuteur');
    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: `Aide-moi à réviser mon cours de ${task.subject} : "${task.title}" 📖` }
    ]);
    setIsTyping(true);

    setTimeout(() => {
      const cleanSub = task.subject.toLowerCase();
      let responseText = `C'est parti pour réviser ton cours de **${task.subject}** : "${task.title}". 🌟\n\n`;

      const matched = localDictionary.find(d => cleanSub.includes(d.subject.toLowerCase()) || d.keywords.some(k => task.title.toLowerCase().includes(k)));
      if (matched) {
        responseText += matched.response;
      } else {
        responseText += `Pour réviser, lis attentivement ta fiche de cours. Prends ton temps pour comprendre les définitions.\n\nJe te propose un mini-test de 3 questions pour valider tes connaissances !`;
      }

      setChatMessages(prev => [
        ...prev,
        { 
          sender: 'ai', 
          text: responseText,
          action: {
            label: `Lancer le mini-test d'entraînement 🎯`,
            onClick: () => launchTutorQuiz(task.subject)
          }
        }
      ]);
      setIsTyping(false);
    }, 800);
  };

  const toggleHomeworkDone = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextState = !t.done;
        if (nextState) {
          setStats(s => ({ ...s, xp: s.xp + 10, stars: s.stars + 1 }));
          alert("Bravo ! Devoir coché. Tu gagnes +10 XP et +1 Étoile ! Envoyé aux parents pour validation. 📚✨");
        }
        return { ...t, done: nextState };
      }
      return t;
    }));
  };

  const getSubjectStyle = (subj: string) => {
    const lower = subj.toLowerCase();
    if (lower.includes('math')) return { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-300', icon: '🧮' };
    if (lower.includes('hist') || lower.includes('géo') || lower.includes('geo')) return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-300', icon: '🌍' };
    if (lower.includes('scien') || lower.includes('svt') || lower.includes('bio')) return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: '🧬' };
    if (lower.includes('fran') || lower.includes('dictée')) return { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-300', icon: '✍️' };
    if (lower.includes('angl')) return { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-300', icon: '🇬🇧' };
    return { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-300', icon: '📖' };
  };

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
            <p className="text-xs text-white/50 font-bold">Niveau scolaire : {currentGrade}</p>
          </div>
        </div>
        
        {/* Streak Flame and Stars */}
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
          🤖 Coach
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
      </div>

      {/* QUIZ SYSTEM POPUP/OVERLAY */}
      {activeQuiz && (
        <div className="bg-[#112240] border-2 border-[#00D26A]/30 rounded-[32px] p-6 shadow-2xl space-y-6 mb-6 relative text-left">
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#00D26A] uppercase tracking-widest bg-[#00D26A]/10 px-3 py-1 rounded-full">
              {activeQuiz.type === 'kid_exercises' ? '✍️ Exercices d\'entraînement' :
               activeQuiz.type === 'kid_evaluation' ? '📝 Évaluation Finale' :
               '📝 Entraînement'}
            </span>
            <span className="text-xs text-white/50 font-bold">
              Question {activeQuiz.currentIndex + 1} sur {activeQuiz.questions.length}
            </span>
          </div>

          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00D26A] to-[#00FF87] transition-all" 
              style={{ width: `${((activeQuiz.currentIndex + 1) / activeQuiz.questions.length) * 100}%` }}
            />
          </div>

          <div className="space-y-2.5">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">
              {activeQuiz.questions[activeQuiz.currentIndex].chapitre} • {activeQuiz.questions[activeQuiz.currentIndex].matiere}
            </span>
            <h3 className="text-base font-extrabold text-white leading-snug">
              {activeQuiz.questions[activeQuiz.currentIndex].question}
            </h3>
          </div>

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

          <div className="space-y-3 pt-2">
            {!activeQuiz.showCorrection && (
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setActiveQuiz(prev => prev ? { ...prev, showHint: !prev.showHint } : null)}
                  className="text-[10px] text-white/50 hover:text-white font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Indices ?</span>
                </button>
                {activeQuiz.showHint && (
                  <p className="text-[11px] text-yellow-300/80 italic font-semibold">
                    💡 Indice : {activeQuiz.questions[activeQuiz.currentIndex].indice}
                  </p>
                )}
              </div>
            )}

            {activeQuiz.showCorrection && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 text-left">
                <p className="text-xs font-black text-white/80">
                  {activeQuiz.selectedOption === activeQuiz.questions[activeQuiz.currentIndex].reponse ? '✅ Très bonne réponse !' : '❌ Mauvaise réponse.'}
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
        <div className="space-y-6 text-left animate-fadeIn">
          
          {/* XP & LEVEL STATS */}
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#00D26A]/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-wider">Académie Progression</span>
                <h3 className="text-xl font-black text-white">Niveau {stats.level}</h3>
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

          {/* CASE 1: SUBJECT PICKER */}
          {selectedSubject === null && (
            <div className="space-y-6">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                🎯 Sélectionne ta matière :
              </span>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Mathématiques', icon: '🧮', gradient: 'from-[#4F8CFF]/20 to-[#6C5CFF]/10', border: 'border-[#4F8CFF]/20' },
                  { name: 'Français', icon: '✍️', gradient: 'from-[#FF6C8F]/20 to-[#FF4572]/10', border: 'border-[#FF6C8F]/20' },
                  { name: 'Découverte', icon: '🌍', gradient: 'from-[#FFB020]/20 to-[#FF8C00]/10', border: 'border-[#FFB020]/20' },
                  { name: 'Langues', icon: '🌐', gradient: 'from-[#00D26A]/20 to-[#00FF87]/10', border: 'border-[#00D26A]/20' },
                  { name: 'Sciences', icon: '🔬', gradient: 'from-[#20C997]/20 to-[#12A57A]/10', border: 'border-[#20C997]/20' },
                  { name: 'Histoire', icon: '🏺', gradient: 'from-[#E040FB]/20 to-[#6C5CFF]/10', border: 'border-[#E040FB]/20' },
                  { name: 'Géographie', icon: '🌎', gradient: 'from-[#00E5FF]/20 to-[#00B0FF]/10', border: 'border-[#00E5FF]/20' },
                  { name: 'Lecture', icon: '📖', gradient: 'from-[#F50057]/20 to-[#C51162]/10', border: 'border-[#F50057]/20' },
                  { name: 'Culture', icon: '🎵', gradient: 'from-[#FFEA00]/20 to-[#FFC400]/10', border: 'border-[#FFEA00]/20' }
                ].map((subj) => {
                  const lessonsCount = staticAcademyLessons.filter(l => l.matiere === subj.name).length;
                  return (
                    <button
                      key={subj.name}
                      onClick={() => { setSelectedSubject(subj.name as any); setSelectedCategory(null); }}
                      className={`bg-gradient-to-br ${subj.gradient} border-2 ${subj.border} rounded-[28px] p-5 text-left flex flex-col justify-between space-y-4 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden`}
                    >
                      <span className="text-3xl">{subj.icon}</span>
                      <div>
                        <h4 className="text-sm font-black text-white">{subj.name}</h4>
                        <p className="text-[10px] text-white/60 font-bold mt-1">
                          {lessonsCount} fiche{lessonsCount > 1 ? 's' : ''} de cours
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* SKILLS PROGRESS BARS */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                  📊 Mes Compétences Réelles (Commencent à 0%) :
                </span>

                <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 space-y-4">
                  {Object.entries(stats.skills).map(([skill, val]) => (
                    <div key={skill} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-black">
                        <span className="capitalize text-white/80">{skill}</span>
                        <span className="text-[#00D26A]">{val}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00D26A] to-[#00FF87] rounded-full" 
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CASE 2: CATEGORY PICKER */}
          {selectedSubject !== null && selectedCategory === null && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Matières</span>
                </button>
                <span className="text-xs font-extrabold text-[#00D26A] bg-[#00D26A]/10 px-3 py-1 rounded-full uppercase">
                  {selectedSubject}
                </span>
              </div>

              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
                📂 Choisis un chapitre de {selectedSubject} :
              </span>

              <div className="grid grid-cols-1 gap-3">
                {subjectCategories[selectedSubject]?.map((cat) => {
                  const hasLessons = staticAcademyLessons.some(l => l.matiere === selectedSubject && l.category === cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full p-4 bg-white/5 hover:bg-white/10 border ${hasLessons ? 'border-white/10' : 'border-white/5 opacity-55'} rounded-2xl text-left text-xs font-black text-white flex justify-between items-center transition-all cursor-pointer`}
                    >
                      <span>{cat}</span>
                      <span className="text-[10px] text-white/40 font-bold">
                        {hasLessons ? '📖 Fiches disponibles' : '🔒 Niveau supérieur'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CASE 3: DUOLINGO PATH (LESSONS MAP) */}
          {selectedSubject !== null && selectedCategory !== null && selectedLesson === null && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Chapitres</span>
                </button>
                <span className="text-xs font-extrabold text-[#00D26A] bg-[#00D26A]/10 px-3 py-1 rounded-full uppercase">
                  {selectedCategory}
                </span>
              </div>

              {/* PATH MAP */}
              <div className="relative flex flex-col items-center py-6">
                <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-[#00D26A]/40 to-[#00D26A]/5 border-dashed border-l-2 border-[#00D26A]/20" />
                
                {(() => {
                  const filteredLessons = staticAcademyLessons.filter(l => l.matiere === selectedSubject && l.category === selectedCategory);
                  
                  if (filteredLessons.length === 0) {
                    return (
                      <div className="text-center p-8 bg-white/3 rounded-2xl border border-white/5 space-y-3 relative z-10 w-full">
                        <span className="text-3xl">🔒</span>
                        <h4 className="text-xs font-black text-white uppercase">Chapitre bientôt débloqué !</h4>
                        <p className="text-[10px] text-white/55 leading-relaxed">
                          Progresse dans les autres chapitres pour débloquer ces exercices locaux !
                        </p>
                      </div>
                    );
                  }

                  return filteredLessons.map((les, idx) => {
                    const progress = lessonProgress[les.id] || 'none';
                    const isCompleted = progress === 'completed';
                    const isUnlocked = idx === 0 || (lessonProgress[filteredLessons[idx - 1].id] === 'completed');

                    let bgStyle = "bg-white/5 border-white/10 text-white/40 cursor-not-allowed";
                    let icon = "🔒";
                    let badgeText = "Verrouillé";
                    let badgeStyle = "bg-white/5 text-white/40";

                    if (isUnlocked) {
                      if (isCompleted) {
                        bgStyle = "bg-gradient-to-br from-[#00D26A] to-[#00FF87] text-[#07111F] border-transparent cursor-pointer";
                        icon = "🏆";
                        badgeText = "Complété !";
                        badgeStyle = "bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30";
                      } else {
                        bgStyle = "bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF] text-white border-transparent cursor-pointer animate-pulse";
                        icon = "📖";
                        badgeText = progress === 'none' ? "Prêt" : progress === 'lesson_read' ? "Entraînement" : progress === 'exercises_done' ? "Mini-jeu" : "Évaluation";
                        badgeStyle = "bg-[#6C5CFF]/20 text-[#9E94FF] border border-[#6C5CFF]/30";
                      }
                    }

                    const offsets = ["translate-x-[-20px] sm:translate-x-[-40px]", "translate-x-0", "translate-x-[20px] sm:translate-x-[40px]"];
                    const offsetClass = offsets[idx % 3];

                    return (
                      <div key={les.id} className={`flex flex-col items-center space-y-2.5 my-6 relative z-10 transition-all ${offsetClass}`}>
                        <button
                          disabled={!isUnlocked}
                          onClick={() => setSelectedLesson(les)}
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-md border-2 transition-all active:scale-95 ${bgStyle}`}
                        >
                          {icon}
                        </button>
                        <div className="bg-[#112240] border border-white/5 rounded-2xl p-3 text-center w-48 sm:w-56 shadow-md">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeStyle}`}>
                            {badgeText}
                          </span>
                          <h4 className="text-[11px] font-extrabold text-white mt-1.5 leading-snug line-clamp-2">
                            {les.title}
                          </h4>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* CASE 4: SELECTED LESSON STEPS (5 PHASES) */}
          {selectedSubject !== null && selectedCategory !== null && selectedLesson !== null && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setSelectedLesson(null); setActiveGame(false); }}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour</span>
                </button>
                <span className="text-xs font-extrabold text-[#00D26A] bg-[#00D26A]/10 px-3 py-1 rounded-full uppercase">
                  {selectedCategory}
                </span>
              </div>

              <div className="text-center space-y-1">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Leçon Active</span>
                <h2 className="text-xl font-black text-white leading-tight">{selectedLesson.title}</h2>
              </div>

              {/* GAME VIEW OVERLAY */}
              {activeGame && (
                <div className="bg-[#112240] border-2 border-[#00D26A]/30 rounded-[32px] p-5 space-y-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <span>🎮 Mini-Jeu : Le Memory de la leçon</span>
                  </h4>
                  <p className="text-[10px] text-white/60 leading-relaxed font-bold">
                    Trouve les paires correspondantes en retournant les cartes !
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2.5 pt-2">
                    {memoryCards.map((card) => {
                      const isFlipped = card.isFlipped || card.isMatched;
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(card.id)}
                          className={`h-20 rounded-xl font-black text-[10px] transition-all flex items-center justify-center p-1.5 border cursor-pointer select-none text-center ${
                            card.isMatched 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                              : isFlipped 
                                ? 'bg-[#6C5CFF]/10 border-[#6C5CFF]/30 text-[#9E94FF]' 
                                : 'bg-white/5 border-white/10 text-white/0 hover:bg-white/10'
                          }`}
                        >
                          {isFlipped ? card.content : '❓'}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setActiveGame(false)}
                    className="w-full mt-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-bold"
                  >
                    Quitter le Jeu
                  </button>
                </div>
              )}

              {!activeGame && (
                <div className="space-y-4">
                  
                  {/* STEP 1: LESSON PAGE */}
                  <div className="bg-[#112240] border border-white/5 rounded-[32px] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📖</span>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 1 : Le Cours</h4>
                      </div>
                      {lessonProgress[selectedLesson.id] && lessonProgress[selectedLesson.id] !== 'none' ? (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Lu ✓</span>
                      ) : (
                        <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase">À Lire</span>
                      )}
                    </div>

                    <div className="space-y-3.5">
                      <p className="text-xs text-white/80 leading-relaxed font-medium">
                        {selectedLesson.explication}
                      </p>

                      {selectedLesson.schemas && selectedLesson.schemas.length > 0 && (
                        <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 font-mono text-[10px] text-emerald-400 whitespace-pre overflow-x-auto">
                          {selectedLesson.schemas.map((s, idx) => (
                            <div key={idx}>{s}</div>
                          ))}
                        </div>
                      )}

                      <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl space-y-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block">🎬 Exemple :</span>
                        <p className="text-xs text-white/85 font-medium leading-relaxed">
                          {selectedLesson.exemple}
                        </p>
                      </div>

                      <div className="p-4 bg-[#6C5CFF]/5 border border-[#6C5CFF]/15 rounded-2xl space-y-1">
                        <span className="text-[9px] font-black text-[#9E94FF] uppercase tracking-wider block">💡 Astuce :</span>
                        <p className="text-xs text-white/85 italic leading-relaxed">
                          {selectedLesson.astuce}
                        </p>
                      </div>

                      {selectedLesson.pieges && (
                        <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-2xl space-y-1">
                          <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider block">⚠️ Pièges à éviter :</span>
                          <p className="text-xs text-white/85 font-medium leading-relaxed">
                            {selectedLesson.pieges}
                          </p>
                        </div>
                      )}

                      <div className="bg-black/10 border border-white/5 p-4 rounded-2xl space-y-2">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-wider block">📝 Résumé Mémo :</span>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-white/70 font-medium">
                          {selectedLesson.memo.split('\n').map((line, lIdx) => (
                            <li key={lIdx}>{line.replace(/^- /, '')}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(!lessonProgress[selectedLesson.id] || lessonProgress[selectedLesson.id] === 'none') && (
                      <button
                        onClick={() => {
                          setLessonProgress(prev => ({ ...prev, [selectedLesson.id]: 'lesson_read' }));
                          setStats(prev => ({ ...prev, xp: prev.xp + 10 }));
                          alert("📖 Leçon lue ! Tu gagnes +10 XP. L'entraînement est débloqué ! ✍️");
                        }}
                        className="w-full mt-2 py-3 bg-[#00D26A] text-[#07111F] font-black text-xs rounded-2xl shadow-md hover:bg-[#00FF87] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>J'ai compris le cours ! (+10 XP) 👍</span>
                      </button>
                    )}
                  </div>

                  {/* STEP 2: PRACTICE */}
                  {(() => {
                    const progress = lessonProgress[selectedLesson.id] || 'none';
                    const isUnlocked = progress !== 'none';
                    const isCompleted = progress !== 'none' && progress !== 'lesson_read';

                    return (
                      <div className={`bg-[#112240] border border-white/5 rounded-[32px] p-5 space-y-4 ${!isUnlocked ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">✍️</span>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 2 : Je m'entraîne</h4>
                          </div>
                          {isCompleted ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Fait ✓</span>
                          ) : !isUnlocked ? (
                            <span className="text-[9px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full uppercase">Bloqué</span>
                          ) : (
                            <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase">Prêt</span>
                          )}
                        </div>

                        {isUnlocked && !isCompleted && (
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black text-white/40 uppercase block">Nombre d'exercices à générer :</span>
                              <div className="grid grid-cols-4 gap-2">
                                {[10, 20, 50, 100].map(cnt => (
                                  <button
                                    key={cnt}
                                    type="button"
                                    onClick={() => setExerciseLength(cnt)}
                                    className={`py-2 rounded-xl text-xs font-black border transition ${
                                      exerciseLength === cnt 
                                        ? 'bg-[#6C5CFF] border-[#6C5CFF] text-white shadow-md' 
                                        : 'bg-white/5 border-white/10 text-white/70'
                                    }`}
                                  >
                                    {cnt}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => startKidExercises(selectedLesson, exerciseLength)}
                              className="w-full py-3 bg-[#6C5CFF] text-white font-black text-xs rounded-2xl shadow-md hover:bg-[#5849E0] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                            >
                              <span>Lancer l'entraînement ({exerciseLength} exercices) ✍️</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* STEP 3: PLAY / MINI-GAME */}
                  {(() => {
                    const progress = lessonProgress[selectedLesson.id] || 'none';
                    const isUnlocked = progress === 'exercises_done' || progress === 'challenge_done' || progress === 'completed';
                    const isCompleted = progress === 'challenge_done' || progress === 'completed';

                    return (
                      <div className={`bg-[#112240] border border-white/5 rounded-[32px] p-5 space-y-4 ${!isUnlocked ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🎯</span>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 3 : Le Mini-Jeu</h4>
                          </div>
                          {isCompleted ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Réussi ✓</span>
                          ) : !isUnlocked ? (
                            <span className="text-[9px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full uppercase">Bloqué</span>
                          ) : (
                            <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase">Prêt</span>
                          )}
                        </div>

                        {isUnlocked && !isCompleted && (
                          <button
                            onClick={() => startMemoryGame(selectedLesson)}
                            className="w-full py-3 bg-gradient-to-r from-[#FFB020] to-[#FF8C00] text-[#07111F] font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <span>Lancer le Jeu (Memory interactif) 🎮</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* STEP 4: CONTROL */}
                  {(() => {
                    const progress = lessonProgress[selectedLesson.id] || 'none';
                    const isUnlocked = progress === 'challenge_done' || progress === 'completed';
                    const isCompleted = progress === 'completed';

                    return (
                      <div className={`bg-[#112240] border border-white/5 rounded-[32px] p-5 space-y-4 ${!isUnlocked ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">📝</span>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 4 : L'Évaluation</h4>
                          </div>
                          {isCompleted ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Validé ✓</span>
                          ) : !isUnlocked ? (
                            <span className="text-[9px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full uppercase">Bloqué</span>
                          ) : (
                            <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase">Prêt</span>
                          )}
                        </div>

                        {isUnlocked && !isCompleted && (
                          <button
                            onClick={() => startKidEvaluation(selectedLesson)}
                            className="w-full py-3 bg-[#00D26A] text-[#07111F] font-black text-xs rounded-2xl shadow-md hover:bg-[#00FF87] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <span>Lancer le Contrôle (10 questions) 📝</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* STEP 5: REWARDS */}
                  {lessonProgress[selectedLesson.id] === 'completed' && (
                    <div className="bg-gradient-to-br from-[#FFB020]/15 to-[#FF8C00]/10 border-2 border-[#FFB020]/30 rounded-[32px] p-6 text-center space-y-4 relative overflow-hidden">
                      <span className="text-3xl animate-bounce block">🏆</span>
                      <h3 className="text-base font-black text-white">Félicitations, Leçon validée !</h3>
                      <p className="text-xs text-white/75 font-semibold">
                        Tu as maîtrisé cette leçon avec succès. Voici tes récompenses :
                      </p>

                      <div className="flex items-center justify-center space-x-4">
                        <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-center">
                          <span className="text-[8px] text-white/40 font-black uppercase tracking-wider block">XP gagnés</span>
                          <span className="text-sm font-black text-emerald-400">+50 XP</span>
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-center">
                          <span className="text-[8px] text-white/40 font-black uppercase tracking-wider block">Étoiles</span>
                          <span className="text-sm font-black text-yellow-400 flex items-center justify-center space-x-1">
                            <span>+5</span> <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          </span>
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-center">
                          <span className="text-[8px] text-white/40 font-black uppercase tracking-wider block">Argent poche</span>
                          <span className="text-sm font-black text-indigo-300">+0.50€ 💶</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-[9px] text-white/50 leading-relaxed font-bold">
                        💡 Une demande de validation d'argent de poche a été transmise aux parents.
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: DEVOIRS & AGENDA (UNIFIED FEED) */}
      {activeSubTab === 'devoirs' && (
        <div className="space-y-6 text-left animate-fadeIn">
          
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg space-y-3">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-wider">Timeline Devoirs</span>
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

          <div className="space-y-5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              📅 Mon Agenda Scolaire Unifié :
            </span>

            {/* 1. Classes today */}
            {todayClasses.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[9px] font-black text-white/30 uppercase block">🏫 Cours de la journée ({todayDayName})</span>
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
                      <span className="text-[9px] font-bold text-white/30 uppercase">Classe</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Homeworks to do */}
            <div className="space-y-2.5">
              <span className="text-[9px] font-black text-white/30 uppercase block">📖 Devoirs et exercices à faire</span>
              {myHomeworks.filter(t => !t.done).length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-5 text-center text-xs text-white/40 font-bold">
                  Aucun devoir à faire ! Libre comme l'air 🎉
                </div>
              ) : (
                myHomeworks.filter(t => !t.done).map(task => {
                  const style = getSubjectStyle(task.subject);
                  return (
                    <div key={task.id} className="bg-[#112240] border-2 border-[#00D26A]/15 rounded-3xl p-4 space-y-3.5">
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

            {/* 3. School Evaluations */}
            <div className="space-y-2.5">
              <span className="text-[9px] font-black text-[#FFB020] uppercase block">⚠️ Évaluations et contrôles programmés</span>
              {myEvaluations.length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4 text-center text-xs text-white/30">
                  Aucun contrôle de prévu. 👍
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

            {/* 4. Outings */}
            <div className="space-y-2.5">
              <span className="text-[9px] font-black text-white/30 uppercase block">⛺ Sorties et vie scolaire</span>
              {schoolEvents.length === 0 ? (
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4 text-center text-xs text-white/30">
                  Aucune sortie de planifiée pour le moment.
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

      {/* SUB-TAB: TUTOR / COACH (NO AI CHATBOT UI) */}
      {activeSubTab === 'tuteur' && (
        <div className="space-y-6 text-left animate-fadeIn">
          
          {/* Greeting Dashboard */}
          <div className="bg-gradient-to-br from-[#6C5CFF]/20 to-[#4F8CFF]/10 border-2 border-[#6C5CFF]/30 rounded-[32px] p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#6C5CFF]/20 blur-xl pointer-events-none" />
            
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="text-base font-black text-white">Bonjour {member.name} 👋</h3>
                <p className="text-[10px] text-white/60 font-bold">Aujourd'hui, tu peux gagner jusqu'à **35 XP** en révisant !</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/80 font-bold">
              <div>
                <span className="text-emerald-400 mr-2">✅</span>
                <span>Terminé : Table de 2, Addition simple, Wolof saluer.</span>
              </div>
              <div>
                <span className="text-yellow-400 mr-2">🟡</span>
                <span>À revoir : Table de 7, Les fractions.</span>
              </div>
              <div className="text-[11px] text-[#9E94FF] italic mt-1">
                💡 Mon conseil : Continue à t'entraîner sur les multiplications pour débloquer le badge Multiplicateur ! (+20 XP, +10 Étoiles)
              </div>
            </div>

            {/* Coach Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <button
                onClick={() => { setSelectedSubject("Mathématiques"); setSelectedCategory("Tables de multiplication"); setActiveSubTab("academie"); }}
                className="py-2.5 bg-[#6C5CFF] rounded-xl text-white font-extrabold text-[10px] uppercase shadow-md hover:bg-[#5849E0] transition-all cursor-pointer text-center"
              >
                ▶ Continuer
              </button>
              <button
                onClick={() => { setSelectedSubject("Mathématiques"); setSelectedCategory(null); setActiveSubTab("academie"); }}
                className="py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-extrabold text-[10px] uppercase hover:bg-white/10 transition-all cursor-pointer text-center"
              >
                📖 Réviser
              </button>
              <button
                onClick={launchDailyChallenge}
                className="py-2.5 bg-gradient-to-r from-[#FFB020] to-[#FF8C00] text-[#07111F] rounded-xl font-black text-[10px] uppercase hover:shadow-lg transition-all cursor-pointer text-center"
              >
                🎮 Défi
              </button>
              <button
                onClick={launchWeeklyEvaluation}
                className="py-2.5 bg-[#00D26A] text-[#07111F] rounded-xl font-black text-[10px] uppercase hover:bg-[#00FF87] transition-all cursor-pointer text-center"
              >
                📝 Contrôle
              </button>
            </div>
          </div>

          {/* Interactive Search box (Local lookup database) */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              💬 Pose une question à ton Coach Scolaire (Hors-ligne) :
            </span>

            {/* Chat list */}
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 flex flex-col space-y-4 max-h-[300px] overflow-y-auto">
              {chatMessages.map((msg, idx) => {
                const isAi = msg.sender === 'ai';
                return (
                  <div key={idx} className={`flex items-start space-x-2.5 ${!isAi ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-md ${
                      isAi ? 'bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF]' : 'bg-[#00D26A]/20 border border-[#00D26A]/30 text-white'
                    }`}>
                      {isAi ? '🤖' : '👦'}
                    </div>
                    
                    <div className="space-y-2 max-w-[80%] text-left">
                      <div className={`p-4 rounded-3xl text-xs font-medium leading-relaxed shadow-sm whitespace-pre-line ${
                        isAi ? 'bg-[#112240] border border-white/8 text-white rounded-tl-none' : 'bg-[#00D26A] text-[#07111F] font-bold rounded-tr-none'
                      }`}>
                        {msg.text}
                      </div>

                      {msg.action && (
                        <button
                          onClick={msg.action.onClick}
                          className="px-4 py-2 rounded-xl bg-[#00D26A] text-[#07111F] font-black text-[9px] uppercase tracking-wider hover:bg-[#00FF87] active:scale-95 transition-all shadow-md cursor-pointer block"
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF] flex items-center justify-center shrink-0 text-sm animate-pulse">🤖</div>
                  <div className="bg-[#112240] border border-white/8 p-3 rounded-2xl text-xs flex items-center space-x-2 text-white/50 rounded-tl-none">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recherche locale...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="ex: Pourquoi 7x8=56 ? ou parle-moi des fractions..."
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

        </div>
      )}

      {/* SUB-TAB: NOTES & BULLETINS (READ ONLY) */}
      {activeSubTab === 'notes' && (
        <div className="space-y-6 text-left animate-fadeIn">
          
          <div className="bg-white/3 border border-white/5 rounded-2xl p-3.5 text-center text-[10px] text-white/45 font-bold uppercase tracking-wider">
            🔒 Relevé de Notes — Lecture seule (Parent)
          </div>

          {grades.filter(g => g.studentId === member.id).length > 0 ? (
            (() => {
              const myRealGrades = grades.filter(g => g.studentId === member.id);
              const normalized = myRealGrades.map(g => (g.value / g.max) * 20);
              const avg = normalized.length > 0 
                ? Number((normalized.reduce((sum, val) => sum + val, 0) / normalized.length).toFixed(2))
                : null;

              if (avg === null) {
                return (
                  <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center text-xs text-white/40 font-bold">
                    Pas encore de notes partagées par tes parents.
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  
                  {/* General average */}
                  <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-[#FFD700]/10 blur-xl pointer-events-none" />
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Moyenne Générale Trimestre</span>
                      <div className="inline-flex items-baseline space-x-1 bg-white/5 border border-white/8 px-6 py-2 rounded-3xl">
                        <span className="text-3xl font-black text-[#FFB020]">{avg}</span>
                        <span className="text-xs font-bold text-white/40">/ 20</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/75 font-semibold italic">
                      "{avg >= 15 ? 'Félicitations, excellent travail ! Continue comme ça 🏆' : 'Travail satisfaisant, continue à réviser avec ton Tuteur ! 🚀'}"
                    </p>
                  </div>

                  {/* Grades list */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">📋 Mes Notes :</span>
                    <div className="space-y-2.5">
                      {myRealGrades.map((grade, idx) => {
                        const style = getSubjectStyle(grade.subject);
                        return (
                          <div key={grade.id || idx} className="bg-[#112240] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3.5">
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-black text-[#FFB020]">{grade.value}/{grade.max}</span>
                              </div>
                              <div>
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border ${style.bg} ${style.border} ${style.text}`}>{grade.subject}</span>
                                <h4 className="text-xs font-black text-white mt-1 leading-snug">{grade.examTitle}</h4>
                                <p className="text-[9px] text-white/40 font-bold">Ajoutée le : {grade.date}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })()
          ) : (
            <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center text-xs text-white/40 font-bold">
              Aucun bulletin de notes n'a été importé du module parent.
            </div>
          )}

        </div>
      )}

    </div>
  );
};
