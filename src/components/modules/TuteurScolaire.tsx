import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  CheckCircle, 
  Clock, 
  Award, 
  BookOpen, 
  ChevronRight,
  UserCheck,
  Plus,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Trash2,
  Sparkles,
  Edit3,
  Flame,
  Star,
  Trophy,
  Gamepad2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShoppingBag,
  Send,
  Loader2,
  MapPin,
  BookOpenCheck
} from 'lucide-react';
import { getSupabaseClient } from '../../utils/supabase';
import type { SchoolTask } from '../../types';
import { staticAcademyQuestions, staticAcademyLessons } from '../../data/academyData';
import type { AcademyQuestion, Lesson } from '../../data/academyData';
import { generateProceduralQuestion, generateQuestionForLesson } from '../../utils/academyGenerator';

export interface GradeItem {
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

export interface ScheduleItem {
  id: string;
  studentId: string;
  studentName: string;
  day: string;
  subject: string;
  startTime: string;
  endTime: string;
  room?: string;
}

interface TuteurScolaireProps {
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  activeMemberId: string;
  members?: any[];
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  grades: GradeItem[];
  setGrades: React.Dispatch<React.SetStateAction<GradeItem[]>>;
  schedule: ScheduleItem[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  initialSubTab?: 'devoirs' | 'quizzes' | 'schedule' | 'grades';
}

interface LocalTutorLesson {
  title: string;
  subject: string;
  competence: 'lecture' | 'orthographe' | 'calcul' | 'conjugaison' | 'culture' | 'anglais' | 'sciences';
  content: string;
  example: string;
  keywords: string[];
}

const localLessons: LocalTutorLesson[] = [
  {
    title: "Les fractions simples 🍰",
    subject: "Mathématiques",
    competence: "calcul",
    content: "Une fraction représente le partage d'une unité en parts égales. Le numérateur (haut) indique le nombre de parts prises. Le dénominateur (bas) indique le nombre total de parts égales.",
    example: "1/2 désigne une moitié de gâteau, 3/4 désigne trois quarts du gâteau.",
    keywords: ["fraction", "partage", "denominateur", "numerateur", "diviser"]
  },
  {
    title: "Théorème de Pythagore 🔺",
    subject: "Mathématiques",
    competence: "calcul",
    content: "Dans un triangle rectangle, le carré de la longueur de l'hypoténuse (le plus grand côté opposé à l'angle droit) est égal à la somme des carrés des longueurs des deux autres côtés. Utile pour calculer des distances.",
    example: "Si les côtés adjacents mesurent 3 cm et 4 cm, alors hypoténuse² = 3² + 4² = 9 + 16 = 25. L'hypoténuse mesure donc 5 cm (car 5 × 5 = 25).",
    keywords: ["pythagore", "triangle", "rectangle", "hypotenuse", "angle droit", "cote"]
  },
  {
    title: "Les Dérivées de fonctions 📈",
    subject: "Mathématiques",
    competence: "calcul",
    content: "La dérivée f'(x) d'une fonction f(x) donne la pente de la tangente en tout point. C'est le taux de variation instantané de la fonction. Utile en physique et en économie.",
    example: "Si f(x) = x², alors sa dérivée est f'(x) = 2x. Si f(x) = ax + b, sa dérivée est f'(x) = a.",
    keywords: ["derivee", "fonction", "variation", "tangente", "calcul", "analyse"]
  },
  {
    title: "Le pluriel des noms en -al ✍️",
    subject: "Français",
    competence: "orthographe",
    content: "Les noms masculins en '-al' font leur pluriel en '-aux'. Exceptions à connaître : bal, cal, carnaval, chacal, festival, régal, qui prennent un 's'.",
    example: "Un cheval -> Des chevaux. Mais : Un festival -> Des festivals.",
    keywords: ["pluriel", "orthographe", "nom", "cheval", "aux", "singulier"]
  },
  {
    title: "Conditionnel Présent 🗣️",
    subject: "Français",
    competence: "conjugaison",
    content: "Le conditionnel présent exprime une action soumise à condition, un souhait ou une formule de politesse. Il se forme sur le radical du futur avec les terminaisons de l'imparfait (-ais, -ais, -ait, -ions, -iez, -aient).",
    example: "Si j'avais le temps, je viendrais (aimer -> j'aimerais, finir -> je finirais).",
    keywords: ["conditionnel", "souhait", "imparfait", "futur", "conjugaison"]
  },
  {
    title: "Les Pharaons d'Égypte 🏺",
    subject: "Découverte",
    competence: "culture",
    content: "Les pharaons régnaient sur l'Égypte ancienne et étaient considérés comme des dieux vivants. Ils faisaient construire d'immenses pyramides comme tombeaux pour conserver leur momie pour l'éternité.",
    example: "Ramsès II et Toutânkhamon sont deux des plus grands pharaons de l'histoire.",
    keywords: ["pharaon", "egypte", "pyramide", "antiquite", "momie", "histoire"]
  },
  {
    title: "Le Système Solaire 🌍",
    subject: "Découverte",
    competence: "sciences",
    content: "Notre système comprend une étoile, le Soleil, et 8 planètes majeures. Les planètes telluriques (rocheuses) sont Mercure, Vénus, Terre, Mars. Les géantes gazeuses sont Jupiter, Saturne, Uranus, Neptune.",
    example: "Mars est rougeâtre car son sol contient beaucoup de fer rouillé.",
    keywords: ["planete", "soleil", "terre", "mars", "astronomie", "espace"]
  },
  {
    title: "Wolof Vocabulaire de base 🇸🇳",
    subject: "Langues",
    competence: "culture",
    content: "Le Wolof est la langue nationale parlée au Sénégal. Apprends les formules d'accueil traditionnelles sénégalaises.",
    example: "Na nga def ? (Comment vas-tu ?) - Mangi fi (Je vais bien). Jërëjëf (Merci). Waaw (Oui), Déedéet (Non).",
    keywords: ["wolof", "senegal", "saluer", "traduction", "langue"]
  }
];

const matureFlashcards = [
  { subject: "Mathématiques", q: "Théorème de Pythagore 🔺", a: "Dans un triangle rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés : BC² = AB² + AC²." },
  { subject: "Mathématiques", q: "Dérivée de x² 📈", a: "La dérivée de la fonction f(x) = x² est f'(x) = 2x." },
  { subject: "Mathématiques", q: "Dérivée de 1/x 📈", a: "La dérivée de la fonction f(x) = 1/x est f'(x) = -1/x²." },
  { subject: "Mathématiques", q: "Formule de l'aire d'un disque 🍕", a: "L'aire d'un disque de rayon R est égale à A = π × R²." },
  { subject: "Français", q: "Qu'est-ce qu'un pléonasme ? 🗣️", a: "C'est une figure de style qui répète des termes de même sens, comme 'monter en haut' ou 'reculer en arrière'." },
  { subject: "Français", q: "Conditionnel Présent de 'Aimer' (Je) 🗣️", a: "J'aimerais (radical du futur 'aimer-' + terminaison de l'imparfait '-ais')." },
  { subject: "Français", q: "Comment accorder le participe passé avec 'Avoir' ? ✍️", a: "Le participe passé conjugué avec 'avoir' s'accorde en genre et en nombre avec le COD si celui-ci est placé avant le verbe." },
  { subject: "Sciences / SVT", q: "Composition de l'atmosphère terrestre 🌍", a: "Environ 78% de Diazote (N₂), 21% de Dioxygène (O₂), et 1% d'autres gaz (Argon, CO₂...)." },
  { subject: "Sciences / SVT", q: "Qu'est-ce que l'ADN ? 🧬", a: "L'Acide Désoxyribonucléique est le support de l'information génétique, structuré en double hélice." },
  { subject: "Langues", q: "Traduction de 'Merci' en Wolof 🇸🇳", a: "Jërëjëf." },
  { subject: "Langues", q: "Traduction de 'Comment vas-tu ?' en Wolof 🇸🇳", a: "Na nga def ?" }
];

export const TuteurScolaire: React.FC<TuteurScolaireProps> = ({ 
  schoolTasks, 
  setSchoolTasks, 
  activeMemberId,
  members,
  isPremium = false,
  onTriggerPaywall,
  grades,
  setGrades,
  schedule,
  setSchedule,
  initialSubTab
}) => {
  const activeMember = members?.find(m => m.id === activeMemberId);
  const isParent = activeMember 
    ? ['Chef de famille', 'Gestionnaire', 'admin', 'parent', 'Parent'].includes(activeMember.role)
    : (activeMemberId === '1' || activeMemberId === '2');

  // Default tab for teenager is 'cours', parent is 'devoirs'
  const [activeSubTab, setActiveSubTab] = useState<'academie' | 'devoirs' | 'tuteur' | 'notes' | 'schedule' | 'grades' | 'academie_preview' | 'coach' | 'cours' | 'revisions' | 'defis' | 'progression'>(() => {
    if (initialSubTab) {
      if (initialSubTab === 'quizzes') return isParent ? 'devoirs' : 'cours';
      if (initialSubTab === 'grades') return isParent ? 'grades' : 'notes';
      return initialSubTab as any;
    }
    return isParent ? 'devoirs' : 'cours';
  });

  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<string>('Lundi');

  const [targetAverage, setTargetAverage] = useState<number>(() => {
    const key = `academy_target_average_${activeMemberId}`;
    const stored = localStorage.getItem(key);
    return stored ? Number(stored) : 15;
  });

  useEffect(() => {
    const key = `academy_target_average_${activeMemberId}`;
    localStorage.setItem(key, String(targetAverage));
  }, [targetAverage, activeMemberId]);

  const [learningMode, setLearningMode] = useState<'guided' | 'library'>('guided');

  const [currentFlashIndex, setCurrentFlashIndex] = useState(0);
  const [isFlashFlipped, setIsFlashFlipped] = useState(false);

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'quizzes') {
        setActiveSubTab(isParent ? 'devoirs' : 'cours');
      } else if (initialSubTab === 'grades') {
        setActiveSubTab(isParent ? 'grades' : 'notes');
      } else {
        setActiveSubTab(initialSubTab as any);
      }
    }
  }, [initialSubTab, isParent]);

  // Teen Local Storage stats
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
    const key = `academy_stats_${activeMemberId}`;
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
        lecture: 30,
        orthographe: 30,
        calcul: 30,
        conjugaison: 30,
        culture: 30,
        anglais: 30,
        sciences: 30
      },
      completedQuizzesCount: 0,
      lastWeeklyEvalDate: ''
    };
  });

  // Save Stats
  useEffect(() => {
    if (!isParent) {
      const key = `academy_stats_${activeMemberId}`;
      localStorage.setItem(key, JSON.stringify(stats));
    }
  }, [stats, activeMemberId, isParent]);

  // Calculate age-based level
  const getSchoolGrade = (): 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée' => {
    const targetMember = activeMember || { age: '14', birthDate: undefined };
    let parsedAge = 14; // Default to 3e (14 years old)
    if (targetMember.age) {
      const num = parseInt(targetMember.age, 10);
      if (!isNaN(num)) parsedAge = num;
    } else if (targetMember.birthDate) {
      const birth = new Date(targetMember.birthDate);
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

  // Streak update on teenager load
  useEffect(() => {
    if (!isParent) {
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
    }
  }, [activeMemberId, isParent]);

  // Student list resolution
  const studentList = members && members.length > 0
    ? members.filter(m => {
        const r = (m.role || '').toLowerCase();
        return r.includes('enfant') || r.includes('ado') || r.includes('collège') || r.includes('lycée') || r.includes('primaire') || r.includes('ans') || m.id === '3' || m.id === '4';
      })
    : [
        { id: '3', name: 'Amadou', role: 'Ado' },
        { id: '4', name: 'Awa', role: 'Enfant' }
      ];

  const getChildName = (id: string) => {
    return studentList.find(s => s.id === id)?.name || (id === '3' ? 'Amadou' : 'Awa');
  };

  // Lesson & Multiplication Table States
  const [selectedLessonCategory, setSelectedLessonCategory] = useState<'maths' | 'français' | 'sciences' | 'langues' | 'histoire' | 'géographie' | 'anglais' | 'culture' | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<{
    type: 'quick' | 'daily' | 'weekly' | 'tutor' | 'teen_exercise' | 'teen_flash' | 'teen_exam';
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

  // Timed Flash Revision timer
  const [flashTimeLeft, setFlashTimeLeft] = useState<number>(0);
  const flashTimerRef = useRef<any>(null);

  const handleFlashTimeout = () => {
    if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    const score = activeQuiz?.score || 0;
    const count = activeQuiz?.currentIndex || 0;
    const finalBonusXp = score * 5;
    const finalBonusStars = Math.floor(score / 2);

    setStats(prev => {
      let newXp = prev.xp + finalBonusXp;
      let newLevel = prev.level;
      const threshold = newLevel * 100;
      if (newXp >= threshold) {
        newXp -= threshold;
        newLevel += 1;
      }
      return {
        ...prev,
        xp: newXp,
        stars: prev.stars + finalBonusStars,
        level: newLevel
      };
    });

    alert(`⏱️ Temps écoulé ! Tu as répondu correctement à ${score} questions sur ${count} tentées.\nTu gagnes +${finalBonusXp} XP et +${finalBonusStars} Étoiles ! ⭐`);
    setActiveQuiz(null);
  };

  useEffect(() => {
    if (activeQuiz && activeQuiz.type === 'teen_flash') {
      flashTimerRef.current = setInterval(() => {
        setFlashTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(flashTimerRef.current);
            setTimeout(() => {
              handleFlashTimeout();
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    };
  }, [activeQuiz]);

  // Launch functions for teen revision
  const launchTeenExercises = (lesson: Lesson) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < 5; i++) {
      questions.push(generateQuestionForLesson(lesson.id, currentGrade));
    }
    setActiveQuiz({
      type: 'teen_exercise',
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

  const launchTeenFlash = (subject: string, minutes: number) => {
    const questions: AcademyQuestion[] = [];
    const normSub = subject === 'Mathématiques' ? 'Mathématiques' : (subject === 'Français' ? 'Français' : 'Langues');
    for (let i = 0; i < 50; i++) {
      questions.push(generateProceduralQuestion(currentGrade, normSub));
    }
    setFlashTimeLeft(minutes * 60);
    setActiveQuiz({
      type: 'teen_flash',
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

  const launchTeenExam = (subject: string) => {
    const questions: AcademyQuestion[] = [];
    const normSub = subject === 'Mathématiques' ? 'Mathématiques' : (subject === 'Français' ? 'Français' : 'Langues');
    for (let i = 0; i < 10; i++) {
      questions.push(generateProceduralQuestion(currentGrade, normSub));
    }
    setActiveQuiz({
      type: 'teen_exam',
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

  // Chatbox (Tuteur Local) State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; action?: { label: string; onClick: () => void } }>>([
    { sender: 'ai', text: `Salut ! Je suis ton Tuteur Local. 🦾 Finis les appels aux serveurs externes ! Je suis équipé de fiches de cours et de générateurs procéduraux. Pose-moi une question sur le théorème de Pythagore, les fractions, les dérivées ou la conjugaison, et on révisera ensemble !` }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Helper: Shuffle Array
  const shuffle = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Helper: Unique Random Numbers for Distractors
  const getRandomDistractors = (correctVal: number, count = 3, range = 10): number[] => {
    const result = new Set<number>();
    while (result.size < count) {
      const offset = Math.floor(Math.random() * range * 2) - range;
      const val = correctVal + offset;
      if (val !== correctVal && val >= 0) result.add(val);
    }
    return Array.from(result);
  };

  // Launch quick 5-question test
  const launchQuickQuiz = () => {
    const quizQuestions: AcademyQuestion[] = [];
    for (let i = 0; i < 5; i++) {
      const mat = i % 3 === 0 ? 'Mathématiques' : (i % 3 === 1 ? 'Français' : 'Langues');
      quizQuestions.push(generateProceduralQuestion(currentGrade, mat));
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

  // Launch Daily Challenge (10 questions)
  const launchDailyChallenge = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `academy_daily_done_${activeMemberId}`;
    if (localStorage.getItem(key) === todayStr) {
      alert("Défi quotidien déjà complété aujourd'hui. 😉🏆");
      return;
    }

    const quizQuestions: AcademyQuestion[] = [];
    for (let i = 0; i < 5; i++) quizQuestions.push(generateProceduralQuestion(currentGrade, 'Mathématiques'));
    for (let i = 0; i < 3; i++) quizQuestions.push(generateProceduralQuestion(currentGrade, 'Français'));
    
    const staticDiscovery = staticAcademyQuestions.filter(q => q.niveau === currentGrade && q.matiere === 'Découverte');
    if (staticDiscovery.length >= 2) {
      quizQuestions.push(staticDiscovery[0], staticDiscovery[1]);
    } else {
      quizQuestions.push(generateProceduralQuestion(currentGrade, 'Langues'), generateProceduralQuestion(currentGrade, 'Mathématiques'));
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

  // Launch Weekly Evaluation
  const launchWeeklyEvaluation = () => {
    const quizQuestions: AcademyQuestion[] = [];
    for (let i = 0; i < 10; i++) {
      const mat = i % 3 === 0 ? 'Mathématiques' : (i % 3 === 1 ? 'Français' : 'Langues');
      quizQuestions.push(generateProceduralQuestion(currentGrade, mat));
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

  // Launch test for specific multiplication table
  const launchTableQuiz = (tableNum: number) => {
    const quizQuestions: AcademyQuestion[] = Array.from({ length: 5 }, (_, i) => {
      const mult = Math.floor(Math.random() * 10) + 1;
      const ans = tableNum * mult;
      const distractors = getRandomDistractors(ans, 3, 5);
      return {
        id: `table_${tableNum}_${mult}_${i}`,
        niveau: currentGrade,
        matiere: 'Mathématiques',
        competence: 'calcul',
        chapitre: `Table de multiplication de ${tableNum}`,
        question: `Combien font ${tableNum} × ${mult} ?`,
        options: shuffle([String(ans), ...distractors.map(String)]),
        reponse: String(ans),
        explication: `${tableNum} fois ${mult} font ${ans}.`,
        indice: `Répète ${tableNum} à lui-même ${mult} fois.`,
        difficulte: 1,
        xp: 10,
        etoiles: 1
      };
    });

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

  // Launch test for specific lesson
  const launchLessonQuiz = (lesson: Lesson) => {
    const quizQuestions: AcademyQuestion[] = [];
    const matchedStatic = staticAcademyQuestions.filter(q => q.niveau === currentGrade && q.matiere === lesson.matiere);
    
    for (let i = 0; i < 3; i++) {
      if (matchedStatic.length > i) {
        quizQuestions.push(matchedStatic[i]);
      } else {
        const mat = lesson.matiere === 'Mathématiques' ? 'Mathématiques' : (lesson.matiere === 'Français' ? 'Français' : 'Langues');
        quizQuestions.push(generateProceduralQuestion(currentGrade, mat));
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

  // Quiz submission handler
  const handleAnswerSubmit = (option: string) => {
    if (!activeQuiz || activeQuiz.showCorrection) return;

    const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
    const isCorrect = option === currentQ.reponse;
    
    const nextAnswers = [...activeQuiz.answers, isCorrect];
    const nextScore = activeQuiz.score + (isCorrect ? 1 : 0);
    
    let qXp = currentQ.xp || 10;
    let qStars = currentQ.etoiles || 1;

    if (activeQuiz.type === 'daily') {
      qXp *= 2;
      qStars *= 2;
    }

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

    // Update Skills progression dynamically
    const comp = currentQ.competence as keyof typeof stats.skills;
    setStats(prev => {
      const skillsCopy = { ...prev.skills };
      if (isCorrect) {
        skillsCopy[comp] = Math.min(100, (skillsCopy[comp] || 30) + 4);
      } else {
        skillsCopy[comp] = Math.max(10, (skillsCopy[comp] || 30) - 1);
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
            alert(`🎉 EXCELLENT ! Tu passes au Niveau ${newLevel} ! Ta persévérance paie ! 🚀🏆`);
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
      if (activeQuiz.type === 'daily' && cleanScore >= activeQuiz.questions.length * 0.7) {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem(`academy_daily_done_${activeMemberId}`, todayStr);
      }

      // Handle teen exam grade auto-saving
      if (activeQuiz.type === 'teen_exam') {
        const finalGrade = Math.round((cleanScore / activeQuiz.questions.length) * 20);
        const newGradeItem: GradeItem = {
          id: `grade-teen-exam-${Date.now()}`,
          studentId: activeMemberId,
          studentName: getChildName(activeMemberId),
          subject: selectedLessonCategory ? (
            selectedLessonCategory === 'maths' ? 'Mathématiques' :
            selectedLessonCategory === 'français' ? 'Français' :
            selectedLessonCategory === 'histoire' ? 'Histoire' :
            selectedLessonCategory === 'géographie' ? 'Géographie' :
            selectedLessonCategory === 'sciences' ? 'Sciences / SVT' :
            selectedLessonCategory === 'anglais' ? 'Anglais' :
            selectedLessonCategory === 'culture' ? 'Culture générale' : 'Langues'
          ) : 'Mathématiques',
          value: finalGrade,
          max: 20,
          coef: 1,
          examTitle: `Contrôle Blanc : ${activeQuiz.questions[0]?.chapitre || 'Académie'}`,
          date: new Date().toLocaleDateString('fr-FR')
        };
        setGrades(prev => [...prev, newGradeItem]);
        setTimeout(() => {
          alert(`📝 Examen terminé ! Tu as obtenu la note de ${finalGrade}/20. Cette note a été enregistrée dans ton bulletin ! 🏅`);
        }, 800);
      }

      setActiveQuiz(null);
      if (activeQuiz.type !== 'teen_flash' && activeQuiz.type !== 'teen_exam') {
        alert(`Entraînement terminé ! Score : ${cleanScore}/${activeQuiz.questions.length}\nVous remportez +${totalXp} XP et +${totalStars} Étoiles ! ⭐️`);
      }
    }
  };

  // Local Chat tutor submit
  const handleSendLocalMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      const cleanQuery = query.toLowerCase();
      let responseText = '';
      let matchedLesson: LocalTutorLesson | undefined;

      for (const lesson of localLessons) {
        if (lesson.keywords.some(k => cleanQuery.includes(k)) || cleanQuery.includes(lesson.subject.toLowerCase())) {
          matchedLesson = lesson;
          break;
        }
      }

      if (matchedLesson) {
        responseText = `J'ai trouvé une leçon utile pour toi ! 📚\n\n**${matchedLesson.title}** (${matchedLesson.subject})\n\n${matchedLesson.content}\n\n💡 *Exemple :* ${matchedLesson.example}\n\nEs-tu prêt à relever le défi avec un mini-test de 3 questions ?`;
        
        setChatMessages(prev => [
          ...prev,
          { 
            sender: 'ai', 
            text: responseText,
            action: {
              label: `Lancer le mini-test en ${matchedLesson?.subject} 🎯`,
              onClick: () => launchTutorQuiz(matchedLesson?.subject || 'Mathématiques')
            }
          }
        ]);
      } else {
        responseText = `Je n'ai pas trouvé de fiche spécifique pour "${query}". 🧐\n\nTu peux me poser des questions sur :\n- "Pythagore" 🔺\n- "Les dérivées" 📈\n- "Les fractions" 🍰\n- "Le conditionnel" 🗣️\n- "Les pharaons" 🏺\n- "Salutations en Wolof" 🇸🇳\n\nQue souhaites-tu réviser ?`;
        
        setChatMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
      }
      setIsTyping(false);
    }, 800);
  };

  const launchTutorQuiz = (subject: string) => {
    const quizQuestions: AcademyQuestion[] = [];
    for (let i = 0; i < 3; i++) {
      const normSubject = subject.toLowerCase().includes('math') ? 'Mathématiques' : (subject.toLowerCase().includes('lang') ? 'Langues' : 'Français');
      quizQuestions.push(generateProceduralQuestion(currentGrade, normSubject));
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

  // Parent homework management
  const [newHomeworkTitle, setNewHomeworkTitle] = useState('');
  const [newHomeworkSubject, setNewHomeworkSubject] = useState('Mathématiques');
  const [newHomeworkDifficulty, setNewHomeworkDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newHomeworkAssignee, setNewHomeworkAssignee] = useState('3');
  const [newHomeworkDueDate, setNewHomeworkDueDate] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskSubject, setEditTaskSubject] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskDifficulty, setEditTaskDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState('');

  const [subjectsList, setSubjectsList] = useState<string[]>(() => {
    const stored = localStorage.getItem('school_subjects');
    return stored ? JSON.parse(stored) : ["Mathématiques", "Histoire-Géographie", "Sciences / SVT", "Français"];
  });

  const handleSubjectChange = (val: string, setSubjectFn: (val: string) => void) => {
    if (val === 'AUTRE_MANUEL') {
      const custom = window.prompt("Saisir la nouvelle matière :");
      if (custom && custom.trim()) {
        const trimmed = custom.trim();
        if (!subjectsList.includes(trimmed)) {
          const next = [...subjectsList, trimmed];
          setSubjectsList(next);
          localStorage.setItem('school_subjects', JSON.stringify(next));
        }
        setSubjectFn(trimmed);
      } else {
        setSubjectFn(subjectsList[0]);
      }
    } else {
      setSubjectFn(val);
    }
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeworkTitle || !newHomeworkDueDate) return;
    
    const newTask: SchoolTask = {
      id: `task-${Date.now()}`,
      title: newHomeworkTitle,
      subject: newHomeworkSubject,
      difficulty: newHomeworkDifficulty,
      assignedMemberId: newHomeworkAssignee,
      dueDate: newHomeworkDueDate,
      done: false
    };

    setSchoolTasks(prev => [...prev, newTask]);
    setNewHomeworkTitle('');
    setNewHomeworkDueDate('');
    
    const client = getSupabaseClient();
    if (client) {
      await client.from('school_tasks').insert([{
        title: newTask.title,
        subject: newTask.subject,
        difficulty: newTask.difficulty,
        assigned_member_id: newTask.assignedMemberId,
        due_date: newTask.dueDate,
        done: false
      }]);
    }
    alert(`📚 Devoir ajouté avec succès !`);
  };

  const handleSaveHomeworkEdit = (id: string) => {
    if (!editTaskTitle.trim()) return;
    setSchoolTasks(prev => prev.map(t => t.id === id ? {
      ...t,
      title: editTaskTitle.trim(),
      subject: editTaskSubject,
      dueDate: editTaskDueDate,
      difficulty: editTaskDifficulty,
      assignedMemberId: editTaskAssigneeId
    } : t));
    setEditingTaskId(null);
    alert("Devoir modifié avec succès !");
  };

  const handleDeleteHomework = async (id: string) => {
    if (window.confirm("Voulez-vous supprimer ce devoir ?")) {
      setSchoolTasks(prev => prev.filter(t => t.id !== id));
      const client = getSupabaseClient();
      if (client) {
        await client.from('school_tasks').delete().eq('id', id);
      }
    }
  };

  const handleMarkCompleted = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: true } : t));
    setStats(s => ({ ...s, xp: s.xp + 10, stars: s.stars + 1 }));
    alert("Bravo ! Devoir marqué comme fait. Tu gagnes +10 XP et +1 Étoile ! 📚✨");
  };

  const handleParentValidate = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: true, grade: 'Validé' } : t));
    alert("Devoir validé avec succès ! Pts et récompenses attribués. 💰");
  };

  // Grade and Schedule Form states
  const [formGradeStudentId, setFormGradeStudentId] = useState(() => studentList[0]?.id || '3');
  const [formGradeSubject, setFormGradeSubject] = useState('Mathématiques');
  const [formGradeValue, setFormGradeValue] = useState(15);
  const [formGradeMax, setFormGradeMax] = useState(20);
  const [formGradeCoef, setFormGradeCoef] = useState(1);
  const [formGradeExamTitle, setFormGradeExamTitle] = useState('');

  const [formSchStudentId, setFormSchStudentId] = useState(() => studentList[0]?.id || '3');
  const [formSchDay, setFormSchDay] = useState('Lundi');
  const [formSchSubject, setFormSchSubject] = useState('Mathématiques');
  const [formSchStartTime, setFormSchStartTime] = useState('08:30');
  const [formSchEndTime, setFormSchEndTime] = useState('09:30');
  const [formSchRoom, setFormSchRoom] = useState('');

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGradeExamTitle) return;
    const newGrade: GradeItem = {
      id: `grade-${Date.now()}`,
      studentId: formGradeStudentId,
      studentName: getChildName(formGradeStudentId),
      subject: formGradeSubject,
      value: Number(formGradeValue),
      max: Number(formGradeMax),
      coef: Number(formGradeCoef),
      examTitle: formGradeExamTitle,
      date: new Date().toLocaleDateString('fr-FR')
    };
    setGrades(prev => [...prev, newGrade]);
    setFormGradeExamTitle('');
    alert("Note enregistrée avec succès ! 🎯");
  };

  const handleDeleteGrade = (id: string) => {
    if (window.confirm("Supprimer cette note ?")) {
      setGrades(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleAddSchItem = (e: React.FormEvent) => {
    e.preventDefault();
    const newSch: ScheduleItem = {
      id: `sch-${Date.now()}`,
      studentId: formSchStudentId,
      studentName: getChildName(formSchStudentId),
      day: formSchDay,
      subject: formSchSubject,
      startTime: formSchStartTime,
      endTime: formSchEndTime,
      room: formSchRoom || undefined
    };
    setSchedule(prev => [...prev, newSch]);
    setFormSchRoom('');
    alert("Cours ajouté à l'emploi du temps ! ⏰");
  };

  const handleDeleteSchItem = (id: string) => {
    if (window.confirm("Retirer ce cours ?")) {
      setSchedule(prev => prev.filter(s => s.id !== id));
    }
  };

  const getStudentAverage = (studentId: string) => {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    if (studentGrades.length === 0) return 'N/A';
    let totalWeighted = 0;
    let totalCoef = 0;
    studentGrades.forEach(g => {
      const normalized = (g.value / g.max) * 20;
      totalWeighted += normalized * g.coef;
      totalCoef += g.coef;
    });
    return (totalWeighted / totalCoef).toFixed(2) + ' / 20';
  };

  const myTasks = schoolTasks.filter(t => t.assignedMemberId === activeMemberId);
  const isPendingValidation = (task: SchoolTask) => task.done && !task.grade;
  const isCompleted = (task: SchoolTask) => task.done && task.grade === 'Validé';
  const isNew = (task: SchoolTask) => !task.done;

  // Split tasks for unified agenda
  const myHomeworks = myTasks.filter(t => !isHomeworkEvaluation(t));
  const myEvaluations = myTasks.filter(t => isHomeworkEvaluation(t));
  function isHomeworkEvaluation(task: SchoolTask) {
    const titleLower = task.title.toLowerCase();
    const subjectLower = task.subject.toLowerCase();
    return titleLower.includes('éval') || titleLower.includes('eval') || titleLower.includes('contrôle') || titleLower.includes('controle') || titleLower.includes('test') || titleLower.includes('examen') || subjectLower.includes('éval') || subjectLower.includes('contrôle');
  }

  const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todayClasses = schedule.filter(s => s.studentId === activeMemberId && s.day === todayDayName);

  const handleReviewWithTutor = (task: SchoolTask) => {
    const sub = task.subject.toLowerCase();
    const title = task.title.toLowerCase();
    const found = staticAcademyLessons.find(l => 
      l.matiere.toLowerCase().includes(sub) || 
      sub.includes(l.matiere.toLowerCase()) ||
      l.title.toLowerCase().split(' ').some(word => word.length > 3 && title.includes(word))
    );
    
    if (found) {
      setSelectedLesson(found);
      setSelectedLessonCategory(
        found.matiere === 'Mathématiques' ? 'maths' : 
        found.matiere === 'Français' ? 'français' : 
        found.matiere === 'Découverte' ? 'sciences' : 'langues'
      );
      setActiveSubTab('cours');
      alert(`📚 Lancement de la fiche de révision : ${found.title}`);
    } else {
      setActiveSubTab('revisions');
      setUserInput(`Aide-moi à réviser mon cours de ${task.subject} sur : ${task.title}`);
      alert(`🤖 Coach ouvert pour réviser : ${task.title}`);
    }
  };

  const parseDueDate = (dateStr: string): Date => {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    const months: Record<string, number> = {
      janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, décembre: 11
    };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const month = months[parts[1]];
      if (!isNaN(day) && month !== undefined) {
        const now = new Date();
        return new Date(now.getFullYear(), month, day);
      }
    }
    return new Date();
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  const getTaskStatusGroup = (task: SchoolTask): 'overdue' | 'today' | 'this_week' | 'soon' => {
    const date = parseDueDate(task.dueDate);
    date.setHours(0,0,0,0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 7) return 'this_week';
    return 'soon';
  };

  const getPoints = (difficulty: 'easy' | 'medium' | 'hard') => {
    return difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
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

  const parentRewards = [
    { label: "1 heure de console de jeux", cost: 15, icon: "🎮" },
    { label: "Cinéma en famille ce weekend", cost: 30, icon: "🍿" },
    { label: "Argent de poche supplémentaire (+5€)", cost: 50, icon: "💶" },
    { label: "Choix du dîner de ce soir", cost: 10, icon: "🍕" }
  ];

  // PARENT RENDER MODE
  if (isParent) {
    return (
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Gestion Scolaire (Parent)</h2>
              <p className="text-xs text-white/50">Suivi, devoirs, notes et emploi du temps</p>
            </div>
          </div>
        </div>

        {/* Parent subtab navigation */}
        <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveSubTab('devoirs')}
            className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'devoirs' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Devoirs
          </button>
          <button
            onClick={() => setActiveSubTab('schedule')}
            className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'schedule' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Emplois
          </button>
          <button
            onClick={() => setActiveSubTab('grades')}
            className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'grades' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveSubTab('academie_preview')}
            className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'academie_preview' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
            }`}
          >
            Suivi Académie
          </button>
        </div>

        {/* Parent tab: Devoirs */}
        {activeSubTab === 'devoirs' && (
          <div className="space-y-4">
            {/* Parent Validation Section */}
            {schoolTasks.some(isPendingValidation) && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest flex items-center space-x-1.5 bg-[#FFB020]/10 border border-[#FFB020]/20 p-2.5 rounded-2xl w-fit">
                  <UserCheck className="w-4 h-4 animate-bounce" />
                  <span>Devoirs en attente de validation</span>
                </span>
                
                <div className="space-y-2">
                  {schoolTasks.filter(isPendingValidation).map((task) => (
                    <div key={task.id} className="p-4 rounded-[24px] bg-[#FFB020]/10 border border-[#FFB020]/20 flex items-center justify-between transition-all">
                      <div>
                        <h4 className="text-xs font-bold text-white">{task.title}</h4>
                        <p className="text-[10px] text-white/50 mt-1">Élève: <span className="font-bold text-white">{getChildName(task.assignedMemberId)}</span> • Matière: {task.subject}</p>
                      </div>
                      
                      <button
                        onClick={() => handleParentValidate(task.id)}
                        className="px-4 py-2 rounded-xl bg-[#00D26A] text-white font-bold text-[10px] transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 flex items-center space-x-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Valider 💰</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List all homeworks */}
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Cahier de Textes Général :</span>
            
            <div className="space-y-3">
              {schoolTasks.map((task) => {
                const isPending = isPendingValidation(task);
                const isCompletedTask = isCompleted(task);
                const style = getSubjectStyle(task.subject);

                if (editingTaskId === task.id) {
                  return (
                    <div key={task.id} className="glass-panel border border-[#6C5CFF]/30 bg-[#6C5CFF]/5 rounded-[28px] p-5 space-y-4">
                      <div className="space-y-1.5 text-left font-medium">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Titre du Devoir</label>
                        <input 
                          type="text" 
                          value={editTaskTitle}
                          onChange={(e) => setEditTaskTitle(e.target.value)}
                          className="w-full bg-[#07111F] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="space-y-1.5 font-medium">
                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">Matière</label>
                          <select 
                            value={editTaskSubject}
                            onChange={(e) => handleSubjectChange(e.target.value, setEditTaskSubject)}
                            className="w-full bg-[#07111F] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                          >
                            {subjectsList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5 font-medium">
                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date Limite</label>
                          <input 
                            type="text" 
                            value={editTaskDueDate}
                            onChange={(e) => setEditTaskDueDate(e.target.value)}
                            className="w-full bg-[#07111F] border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-2 border-t border-white/5">
                        <button type="button" onClick={() => setEditingTaskId(null)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/80 text-[10px] font-bold">Annuler</button>
                        <button type="button" onClick={() => handleSaveHomeworkEdit(task.id)} className="px-3 py-1.5 bg-[#6C5CFF] rounded-lg text-white text-[10px] font-bold">Enregistrer</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={task.id} className="glass-panel border border-white/8 rounded-[24px] p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border ${style.bg} ${style.border} ${style.text}`}>{task.subject}</span>
                        <span className="text-[9px] text-white/40">Élève: {getChildName(task.assignedMemberId)}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">{task.title}</h4>
                      <p className="text-[9px] text-white/30">Limite: {task.dueDate}</p>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
                      <button onClick={() => {
                        setEditingTaskId(task.id);
                        setEditTaskTitle(task.title);
                        setEditTaskSubject(task.subject);
                        setEditTaskDueDate(task.dueDate);
                        setEditTaskDifficulty(task.difficulty || 'medium');
                        setEditTaskAssigneeId(task.assignedMemberId);
                      }} className="p-1.5 bg-white/5 hover:bg-[#6C5CFF]/20 rounded-lg text-white"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteHomework(task.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add homework form */}
            <form onSubmit={handleAddHomework} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
              <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block">Créer un nouveau devoir 📝</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Titre</label>
                  <input type="text" required placeholder="ex: Exercices 1 et 2..." value={newHomeworkTitle} onChange={(e) => setNewHomeworkTitle(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="space-y-1 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Matière</label>
                    <select value={newHomeworkSubject} onChange={(e) => handleSubjectChange(e.target.value, setNewHomeworkSubject)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white">
                      {subjectsList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      <option value="AUTRE_MANUEL">+ Autre...</option>
                    </select>
                  </div>
                  <div className="space-y-1 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Attribuer</label>
                    <select value={newHomeworkAssignee} onChange={(e) => setNewHomeworkAssignee(e.target.value)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white">
                      {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Difficulté</label>
                  <select value={newHomeworkDifficulty} onChange={(e) => setNewHomeworkDifficulty(e.target.value as any)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white">
                    <option value="easy">Facile (+20 Pts)</option>
                    <option value="medium">Moyen (+50 Pts)</option>
                    <option value="hard">Difficile (+100 Pts)</option>
                  </select>
                </div>
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date limite</label>
                  <input type="text" required placeholder="ex: 20 juin" value={newHomeworkDueDate} onChange={(e) => setNewHomeworkDueDate(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-[#6C5CFF] rounded-xl text-white font-bold text-xs shadow-md">Ajouter le devoir</button>
            </form>
          </div>
        )}

        {/* Parent tab: Schedule */}
        {activeSubTab === 'schedule' && (
          <div className="space-y-4 text-left">
            <div className="flex space-x-2">
              <button type="button" onClick={() => setScheduleViewMode('list')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${scheduleViewMode === 'list' ? 'bg-[#6C5CFF] text-white' : 'bg-white/5 text-white/50'}`}>Vue Liste</button>
              <button type="button" onClick={() => setScheduleViewMode('calendar')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${scheduleViewMode === 'calendar' ? 'bg-[#6C5CFF] text-white' : 'bg-white/5 text-white/50'}`}>Vue Calendrier</button>
            </div>
            
            {scheduleViewMode === 'list' ? (
              <>
                <div className="flex space-x-1 overflow-x-auto pb-1">
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => (
                    <button key={d} type="button" onClick={() => setSelectedDay(d)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${selectedDay === d ? 'bg-[#6C5CFF] text-white' : 'bg-white/5 text-white/50'}`}>{d}</button>
                  ))}
                </div>
                <div className="space-y-2">
                  {schedule.filter(s => s.day === selectedDay).map(item => (
                    <div key={item.id} className="glass-panel border border-white/5 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-bold text-[#6C5CFF] bg-[#6C5CFF]/10 px-2 py-0.5 rounded uppercase">{item.subject}</span>
                        <h4 className="text-xs font-bold text-white mt-1">{item.startTime} - {item.endTime}</h4>
                        <p className="text-[9px] text-white/40">Élève: {item.studentName}</p>
                      </div>
                      <button onClick={() => handleDeleteSchItem(item.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="glass-panel border border-white/8 rounded-2xl p-3 overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    <div className="text-[8px] font-bold text-white/30 uppercase text-center py-1">Heure</div>
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => (
                      <div key={d} className="text-[8px] font-bold text-white/60 uppercase text-center py-1 bg-white/5 rounded-lg">{d.slice(0, 3)}</div>
                    ))}
                  </div>
                  {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => (
                    <div key={hour} className="grid grid-cols-7 gap-0.5 mb-0.5">
                      <div className="text-[9px] font-bold text-white/30 text-center py-2">{String(hour).padStart(2, '0')}:00</div>
                      {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(day => {
                        const cls = schedule.find(s => s.day === day && parseInt(s.startTime.split(':')[0]) <= hour && parseInt(s.endTime.split(':')[0]) > hour);
                        return cls 
                          ? <div key={day} className="rounded p-1 text-center bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[7px] text-white font-extrabold flex flex-col justify-center"><span className="truncate">{cls.subject}</span><span className="text-white/40 truncate">{cls.studentName}</span></div>
                          : <div key={day} className="bg-white/[0.02] rounded border border-white/[0.03] min-h-[32px]" />;
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add class to schedule */}
            <form onSubmit={handleAddSchItem} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
              <span className="text-[10px] font-bold text-[#6C5CFF] uppercase block">Ajouter un cours ⏰</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Élève</label>
                  <select value={formSchStudentId} onChange={(e) => setFormSchStudentId(e.target.value)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white">
                    {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Matière</label>
                  <select value={formSchSubject} onChange={(e) => handleSubjectChange(e.target.value, setFormSchSubject)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white">
                    {subjectsList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    <option value="AUTRE_MANUEL">+ Autre...</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Jour</label>
                  <select value={formSchDay} onChange={(e) => setFormSchDay(e.target.value)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2 text-xs text-white">
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Début</label>
                  <input type="text" required placeholder="08:30" value={formSchStartTime} onChange={(e) => setFormSchStartTime(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase block">Fin</label>
                  <input type="text" required placeholder="09:30" value={formSchEndTime} onChange={(e) => setFormSchEndTime(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-[#6C5CFF] rounded-xl text-white font-bold text-xs">Planifier</button>
            </form>
          </div>
        )}

        {/* Parent tab: Grades */}
        {activeSubTab === 'grades' && (
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-3">
              {studentList.map(s => (
                <div key={s.id} className="glass-panel border border-[#6C5CFF]/20 bg-[#6C5CFF]/5 rounded-[24px] p-4 text-center">
                  <h4 className="text-xs font-bold text-white/60">Moyenne {s.name}</h4>
                  <p className="text-xl font-extrabold text-[#6C5CFF]">{getStudentAverage(s.id)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {grades.map(grade => (
                <div key={grade.id} className="glass-panel border border-white/5 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold text-[#FFB020] bg-[#FFB020]/15 px-2 py-0.5 rounded">{grade.value}/{grade.max}</span>
                    <h4 className="text-xs font-bold text-white mt-1">{grade.examTitle} ({grade.subject})</h4>
                    <p className="text-[9px] text-white/40">Élève: {grade.studentName} • Date: {grade.date}</p>
                  </div>
                  <button onClick={() => handleDeleteGrade(grade.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            {/* Add grade form */}
            <form onSubmit={handleAddGrade} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
              <span className="text-[10px] font-bold text-[#6C5CFF] uppercase block">Ajouter une note 🎯</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 block">Élève</label>
                  <select value={formGradeStudentId} onChange={(e) => setFormGradeStudentId(e.target.value)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white">
                    {studentList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 block">Matière</label>
                  <select value={formGradeSubject} onChange={(e) => handleSubjectChange(e.target.value, setFormGradeSubject)} className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white">
                    {subjectsList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    <option value="AUTRE_MANUEL">+ Autre...</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 block">Note</label>
                  <input type="number" required value={formGradeValue} onChange={(e) => setFormGradeValue(Number(e.target.value))} className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 block">Sur</label>
                  <input type="number" required value={formGradeMax} onChange={(e) => setFormGradeMax(Number(e.target.value))} className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div className="space-y-1 font-medium">
                  <label className="text-[9px] font-bold text-white/40 block">Coef</label>
                  <input type="number" required value={formGradeCoef} onChange={(e) => setFormGradeCoef(Number(e.target.value))} className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <div className="space-y-1 font-medium">
                <label className="text-[9px] font-bold text-white/40 block">Intitulé</label>
                <input type="text" required placeholder="ex: DST fractions..." value={formGradeExamTitle} onChange={(e) => setFormGradeExamTitle(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#6C5CFF] rounded-xl text-white font-bold text-xs">Enregistrer</button>
            </form>
          </div>
        )}

        {/* Parent tab: Academie Preview */}
        {activeSubTab === 'academie_preview' && (
          <div className="space-y-4 text-left">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Suivi d'activité des enfants (Académie locale) :</span>
            {studentList.map(s => {
              const kidKey = `academy_stats_${s.id}`;
              const kidRaw = localStorage.getItem(kidKey);
              let kidStats = { level: 1, xp: 0, stars: 0, streak: 0, completedQuizzesCount: 0 };
              if (kidRaw) {
                try { kidStats = JSON.parse(kidRaw); } catch (e) {}
              }

              return (
                <div key={s.id} className="glass-panel border border-white/8 rounded-[24px] p-5 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <h4 className="text-sm font-extrabold text-white">{s.name}</h4>
                    <span className="text-xs bg-[#6C5CFF]/15 text-[#6C5CFF] px-2.5 py-0.5 rounded-full font-bold">Niveau {kidStats.level}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-0.5 font-bold">
                      <p className="text-white/40">Étoiles remportées</p>
                      <p className="text-yellow-400 flex items-center space-x-1 text-sm"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> <span>{kidStats.stars}</span></p>
                    </div>
                    <div className="space-y-0.5 font-bold">
                      <p className="text-white/40">Série actuelle</p>
                      <p className="text-orange-400 flex items-center space-x-1 text-sm"><Flame className="w-4 h-4 fill-orange-400 text-orange-400" /> <span>{kidStats.streak} jours</span></p>
                    </div>
                    <div className="space-y-0.5 font-bold">
                      <p className="text-white/40">Quiz complétés</p>
                      <p className="text-white text-sm">{kidStats.completedQuizzesCount}</p>
                    </div>
                    <div className="space-y-0.5 font-bold">
                      <p className="text-white/40">XP actuelle</p>
                      <p className="text-emerald-400 text-sm">{kidStats.xp} XP</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // TEENAGER ADOLESCENT RENDER MODE (isParent === false)
  return (
    <div className="space-y-6">
      
      {/* Ado Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-left">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <GraduationCap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Espace École Ado</h2>
            <p className="text-[10px] text-white/50 font-bold">Classe : {currentGrade}</p>
          </div>
        </div>

        {/* Level Flame and Stars */}
        <div className="flex items-center space-x-2">
          {stats.streak > 0 && (
            <div className="flex items-center space-x-1 bg-orange-500/10 border border-orange-500/25 px-2 py-1 rounded-xl text-orange-400 font-extrabold text-[10px]">
              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              <span>{stats.streak} j</span>
            </div>
          )}
          <div className="flex items-center space-x-1 bg-yellow-500/10 border border-yellow-500/25 px-2 py-1 rounded-xl text-yellow-400 font-extrabold text-[10px]">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span>{stats.stars}</span>
          </div>
        </div>
      </div>

      {/* Segmented subtabs navigation */}
      <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-5 gap-1">
        <button
          onClick={() => { setActiveSubTab('cours' as any); setActiveQuiz(null); }}
          className={`py-2 rounded-xl text-[9px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'cours' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
          }`}
        >
          📚 Mes cours
        </button>
        <button
          onClick={() => { setActiveSubTab('devoirs' as any); setActiveQuiz(null); }}
          className={`py-2 rounded-xl text-[9px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'devoirs' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
          }`}
        >
          📝 Devoirs
        </button>
        <button
          onClick={() => { setActiveSubTab('revisions' as any); setActiveQuiz(null); }}
          className={`py-2 rounded-xl text-[9px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'revisions' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
          }`}
        >
          🎯 Flash
        </button>
        <button
          onClick={() => { setActiveSubTab('notes'); setActiveQuiz(null); }}
          className={`py-2 rounded-xl text-[9px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'notes' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
          }`}
        >
          📊 Bulletins
        </button>
        <button
          onClick={() => { setActiveSubTab('progression' as any); setActiveQuiz(null); }}
          className={`py-2 rounded-xl text-[9px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'progression' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white/60'
          }`}
        >
          🏆 Progrès
        </button>
      </div>

      {/* ACTIVE QUIZ OVERLAY */}
      {activeQuiz && (
        <div className="bg-[#112240] border-2 border-[#6C5CFF]/30 rounded-[32px] p-6 shadow-2xl space-y-6 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#6C5CFF] uppercase tracking-widest bg-[#6C5CFF]/10 px-3 py-1 rounded-full">
              {activeQuiz.type === 'daily' ? '🏆 Défi Quotidien' : 
               activeQuiz.type === 'weekly' ? '⚡ Évaluation Hebdomadaire' : 
               activeQuiz.type === 'teen_exercise' ? '✍️ Entraînement Cours' :
               activeQuiz.type === 'teen_flash' ? '⏱️ Révision Flash' :
               activeQuiz.type === 'teen_exam' ? '📝 Contrôle Blanc' :
               '📝 Entraînement'}
            </span>
            {activeQuiz.type === 'teen_flash' && (
              <div className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3 py-1 rounded-full text-xs font-black animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.floor(flashTimeLeft / 60)}:{String(flashTimeLeft % 60).padStart(2, '0')}</span>
              </div>
            )}
            <span className="text-xs text-white/50 font-bold">
              Question {activeQuiz.currentIndex + 1} {activeQuiz.type !== 'teen_flash' ? `sur ${activeQuiz.questions.length}` : ''}
            </span>
          </div>

          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] transition-all" style={{ width: `${((activeQuiz.currentIndex + 1) / activeQuiz.questions.length) * 100}%` }} />
          </div>

          <div className="space-y-2.5">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">
              {activeQuiz.questions[activeQuiz.currentIndex].chapitre} • {activeQuiz.questions[activeQuiz.currentIndex].matiere}
            </span>
            <h3 className="text-base font-extrabold text-white leading-snug">{activeQuiz.questions[activeQuiz.currentIndex].question}</h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {activeQuiz.questions[activeQuiz.currentIndex].options.map((option, idx) => {
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
                  key={idx}
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
                <button onClick={() => setActiveQuiz(prev => prev ? { ...prev, showHint: !prev.showHint } : null)} className="text-[10px] text-white/50 hover:text-white font-bold flex items-center space-x-1 cursor-pointer">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Indices ?</span>
                </button>
                {activeQuiz.showHint && (
                  <p className="text-[11px] text-yellow-300/80 italic font-semibold">💡 Hint: {activeQuiz.questions[activeQuiz.currentIndex].indice}</p>
                )}
              </div>
            )}

            {activeQuiz.showCorrection && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                <p className="text-xs font-black text-white/80">{activeQuiz.selectedOption === activeQuiz.questions[activeQuiz.currentIndex].reponse ? '✅ Excellent !' : '❌ Mauvaise réponse.'}</p>
                <p className="text-[11px] text-white/60 leading-relaxed font-medium">{activeQuiz.questions[activeQuiz.currentIndex].explication}</p>
                <button
                  onClick={handleNextQuestion}
                  className="w-full mt-2 py-2.5 bg-[#6C5CFF] rounded-xl text-white font-bold text-xs cursor-pointer hover:bg-[#5849E0] transition-all"
                >
                  {activeQuiz.currentIndex + 1 === activeQuiz.questions.length ? 'Terminer' : 'Question suivante'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'cours' && !activeQuiz && (
        <div className="space-y-6 text-left animate-fadeIn">
          {/* Top Card */}
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#6C5CFF]/10 blur-xl pointer-events-none" />
            <div className="space-y-1">
              <span className="text-[9px] font-black text-[#6C5CFF] uppercase tracking-wider">Bibliothèque de Cours</span>
              <h3 className="text-base font-black text-white">Classe de {currentGrade}</h3>
              <p className="text-[10px] text-white/50">Choisis une matière pour réviser tes fiches de cours.</p>
            </div>
            <span className="text-3xl">📚</span>
          </div>

          {/* Subject Categories */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Matières disponibles :</span>
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-4">
              
              {/* Learning Mode Toggle */}
              <div className="bg-[#07111F]/60 p-1.5 rounded-2xl border border-white/5 grid grid-cols-2 gap-1.5 max-w-xs mx-auto shadow-inner mb-2">
                <button
                  onClick={() => setLearningMode('guided')}
                  className={`py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    learningMode === 'guided'
                      ? 'bg-[#6C5CFF] text-white shadow-md'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  🛣️ Parcours Guidé
                </button>
                <button
                  onClick={() => setLearningMode('library')}
                  className={`py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    learningMode === 'library'
                      ? 'bg-[#6C5CFF] text-white shadow-md'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  📚 Bibliothèque
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'maths', label: '🧮 Maths' },
                  { id: 'français', label: '✍️ Français' },
                  { id: 'histoire', label: '🏺 Histoire' },
                  { id: 'géographie', label: '🗺️ Géographie' },
                  { id: 'sciences', label: '🧬 Sciences' },
                  { id: 'anglais', label: '🇬🇧 Anglais' },
                  { id: 'culture', label: '💡 Culture G' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedLessonCategory(cat.id as any);
                      setSelectedLesson(null);
                      setSelectedTable(null);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-black transition cursor-pointer ${
                      selectedLessonCategory === cat.id ? 'bg-[#6C5CFF]/25 border-[#6C5CFF] text-[#9E94FF]' : 'bg-white/5 border-white/5 text-white/70'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Subject Detailed Area */}
              {selectedLessonCategory !== null && !selectedLesson && (
                <div className="space-y-4 pt-4 border-t border-white/5 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Fiches en {
                        selectedLessonCategory === 'maths' ? 'Mathématiques' :
                        selectedLessonCategory === 'français' ? 'Français' :
                        selectedLessonCategory === 'histoire' ? 'Histoire' :
                        selectedLessonCategory === 'géographie' ? 'Géographie' :
                        selectedLessonCategory === 'sciences' ? 'Sciences' :
                        selectedLessonCategory === 'anglais' ? 'Anglais' :
                        'Culture générale'
                      }
                    </h5>
                    <button 
                      onClick={() => setSelectedLessonCategory(null)}
                      className="text-[9px] text-[#6C5CFF] hover:underline uppercase font-bold cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      const lessons = staticAcademyLessons.filter(l => 
                        (selectedLessonCategory === 'maths' ? l.matiere === 'Mathématiques' : 
                         selectedLessonCategory === 'français' ? l.matiere === 'Français' : 
                         selectedLessonCategory === 'histoire' ? l.matiere === 'Histoire' : 
                         selectedLessonCategory === 'géographie' ? l.matiere === 'Géographie' : 
                         selectedLessonCategory === 'sciences' ? (l.matiere === 'Sciences' || l.matiere === 'Découverte') : 
                         selectedLessonCategory === 'anglais' ? (l.matiere === 'Anglais' || l.matiere === 'Langues') : 
                         (l.matiere === 'Culture G' || l.matiere === 'Culture'))
                      );

                      if (lessons.length === 0) {
                        return <p className="text-xs text-white/30 italic py-2">Aucune fiche de cours disponible pour ce niveau.</p>;
                      }

                      return lessons.map((les, idx) => {
                        const isCompleted = stats.completedQuizzesCount > idx * 2;
                        const isUnlocked = learningMode === 'library' || idx === 0 || isCompleted;

                        return (
                          <button
                            key={les.id}
                            disabled={!isUnlocked}
                            onClick={() => setSelectedLesson(les)}
                            className={`w-full p-3.5 border rounded-2xl text-left text-xs font-black text-white flex justify-between items-center transition-all cursor-pointer ${
                              isUnlocked ? 'bg-white/3 hover:bg-[#6C5CFF]/15 border-white/5' : 'bg-white/1 border-white/2 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="text-sm">{isUnlocked ? '📖' : '🔒'}</span>
                              <span>{les.title}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              {isCompleted && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">Fait</span>}
                              <ChevronRight className="w-4.5 h-4.5 text-white/30" />
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Course detailed view */}
              {selectedLesson && (
                <div className="space-y-4 pt-4 border-t border-white/5 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setSelectedLesson(null)}
                      className="text-[10px] font-black text-white/50 hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Retour aux fiches</span>
                    </button>
                    <span className="text-[9px] font-bold text-white/40 uppercase bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
                      {selectedLesson.matiere}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <h4 className="text-sm font-extrabold text-white leading-snug">{selectedLesson.title}</h4>
                    
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-wider block">📖 Explication simple :</span>
                      <p className="text-xs text-white/80 leading-relaxed font-medium bg-black/20 p-4 rounded-2xl border border-white/5">
                        {selectedLesson.explication}
                      </p>
                    </div>

                    {selectedLesson.schemas && selectedLesson.schemas.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-wider block">🎨 Illustration visuelle :</span>
                        <div className="bg-black/35 p-4 rounded-2xl border border-white/5 font-mono text-[10px] text-[#9E94FF] whitespace-pre overflow-x-auto">
                          {selectedLesson.schemas.map((s, idx) => <div key={idx}>{s}</div>)}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 rounded-xl text-[10.5px] text-[#9E94FF] font-semibold italic">
                      <span className="font-bold text-white/40 uppercase tracking-wider text-[8.5px] not-italic mr-1.5 block">💡 Exemple concret :</span>
                      {selectedLesson.exemple}
                    </div>

                    {selectedLesson.pieges && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10.5px] text-red-300 font-semibold italic">
                        <span className="font-bold text-white/40 uppercase tracking-wider text-[8.5px] not-italic mr-1.5 block">⚠️ Piège à éviter :</span>
                        {selectedLesson.pieges}
                      </div>
                    )}

                    <div className="bg-white/3 border border-white/5 p-4 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-wider block">📌 Résumé / Mémo :</span>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-white/70 font-medium">
                        {selectedLesson.memo.split('\n').map((line, idx) => (
                          <li key={idx}>{line.replace(/^- /, '')}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => { launchTeenExercises(selectedLesson); setSelectedLesson(null); }}
                    className="w-full py-3 rounded-2xl bg-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:bg-[#5849E0] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>S'entraîner sur cette fiche (5 Qs) ✍️</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Study Methods */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">🧠 Méthodes de révision :</span>
            <div className="grid grid-cols-1 gap-3">
              {[
                { 
                  title: "💡 La Technique Feynman", 
                  desc: "Explique un concept difficile avec des mots très simples, comme si tu l'expliquais à un enfant de 10 ans. Si tu bloques, c'est là que réside ta lacune." 
                },
                { 
                  title: "⏱️ La Méthode Pomodoro", 
                  desc: "Répartis ton travail en sessions de 25 minutes de concentration intense, suivies de 5 minutes de pause complète. Répète cela 4 fois." 
                },
                { 
                  title: "⚡ L'Active Recall (Rappel Actif)", 
                  desc: "Ferme ton cours et essaie d'écrire de mémoire tout ce dont tu te souviens sur une feuille blanche. C'est 10x plus efficace que de relire passivement." 
                }
              ].map((m, idx) => (
                <div key={idx} className="bg-white/5 border border-white/8 rounded-2xl p-4 text-left space-y-1">
                  <h4 className="text-xs font-black text-[#9E94FF]">{m.title}</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed font-medium">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'revisions' && !activeQuiz && (
        <div className="space-y-6 text-left animate-fadeIn">
          {/* Flash Cards Card */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">📝 Flashcards de Révision :</span>
            <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 space-y-4">
              <div className="flex justify-between items-center text-[10px] text-white/40 font-bold">
                <span className="bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#9E94FF] px-2 py-0.5 rounded-full">
                  {matureFlashcards[currentFlashIndex].subject}
                </span>
                <span>Card {currentFlashIndex + 1} sur {matureFlashcards.length}</span>
              </div>

              {/* Flashcard Body */}
              <div 
                onClick={() => setIsFlashFlipped(!isFlashFlipped)}
                className={`w-full min-h-[140px] rounded-2xl border-2 p-5 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-300 ${
                  isFlashFlipped 
                    ? 'bg-[#6C5CFF]/10 border-[#6C5CFF]/50 text-white shadow-inner' 
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {isFlashFlipped ? (
                  <div className="space-y-2 animate-fadeIn">
                    <span className="text-[9px] font-black text-[#9E94FF] uppercase tracking-wider block">Réponse</span>
                    <p className="text-xs font-bold leading-relaxed">{matureFlashcards[currentFlashIndex].a}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-wider block">Question / Notion</span>
                    <p className="text-sm font-black leading-snug">{matureFlashcards[currentFlashIndex].q}</p>
                    <span className="text-[9px] text-white/30 font-bold block pt-2">(Clique pour révéler la réponse)</span>
                  </div>
                )}
              </div>

              {/* Flashcard Controls */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlashFlipped(false);
                    setCurrentFlashIndex(prev => prev === 0 ? matureFlashcards.length - 1 : prev - 1);
                  }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Précédent
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlashFlipped(!isFlashFlipped);
                  }}
                  className="px-4 py-2 bg-[#6C5CFF]/25 border border-[#6C5CFF]/40 text-[#9E94FF] rounded-xl text-xs font-bold cursor-pointer"
                >
                  🔄 Retourner
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlashFlipped(false);
                    setCurrentFlashIndex(prev => prev === matureFlashcards.length - 1 ? 0 : prev + 1);
                  }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>

          {/* Quick Quiz Chrono Launcher */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">⏱️ Révision Flash (Quiz Chronométré) :</span>
            <div className="bg-gradient-to-r from-[#6C5CFF]/15 to-[#4F8CFF]/5 border border-[#6C5CFF]/20 rounded-[32px] p-5 space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white">Chrono Challenge</h4>
                <p className="text-[11px] text-white/60 leading-snug">
                  Entraîne ton cerveau avec un maximum de questions générées localement. Choisis ta durée :
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[2, 5, 10].map(m => (
                  <button
                    key={m}
                    onClick={() => launchTeenFlash('Mathématiques', m)}
                    className="py-2.5 bg-[#6C5CFF] hover:bg-[#5849E0] text-white rounded-xl text-[10px] font-black cursor-pointer transition-all shadow-md"
                  >
                    ⏱️ {m} Min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contrôle Blanc Launcher */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">📝 Contrôle Blanc (Évaluation Finale) :</span>
            <div className="bg-gradient-to-r from-[#E040FB]/15 to-[#6C5CFF]/5 border border-[#E040FB]/20 rounded-[32px] p-5 space-y-3">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white">Évaluation Finale Mature</h4>
                <p className="text-[11px] text-white/60 leading-snug">
                  Un examen blanc de 10 questions sur la matière de ton choix. Ta note sur 20 sera enregistrée dans ton bulletin.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { label: "🧮 Maths", sub: "Mathématiques" },
                  { label: "✍️ Français", sub: "Français" },
                  { label: "🧬 Sciences", sub: "Sciences" },
                  { label: "🇬🇧 Anglais", sub: "Langues" }
                ].map(item => (
                  <button
                    key={item.sub}
                    onClick={() => launchTeenExam(item.sub)}
                    className="py-2.5 bg-[#E040FB] hover:bg-[#c513e0] text-white rounded-xl text-[10px] font-black cursor-pointer transition-all shadow-md animate-pulse"
                  >
                    📝 {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exercises Bank */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">🎯 Banque d'Exercices Directs :</span>
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-5 space-y-3">
              <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                Choisis une matière pour générer instantanément un test d'entraînement rapide de 5 questions.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { label: "🧮 Mathématiques", sub: "Mathématiques" },
                  { label: "✍️ Français", sub: "Français" },
                  { label: "🧬 Découverte & SVT", sub: "Découverte" },
                  { label: "🌍 Langues", sub: "Langues" }
                ].map(item => (
                  <button
                    key={item.sub}
                    onClick={() => {
                      const questions: AcademyQuestion[] = [];
                      for (let i = 0; i < 5; i++) {
                        questions.push(generateProceduralQuestion(currentGrade, item.sub as any));
                      }
                      setActiveQuiz({
                        type: 'teen_exercise',
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
                    }}
                    className="p-3 bg-white/5 border border-white/5 text-xs text-white rounded-2xl hover:bg-[#6C5CFF]/15 hover:border-[#6C5CFF]/30 transition-all font-black text-left cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dictionary search */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">🔍 Dictionnaire de recherche scolaire :</span>
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 space-y-3">
              <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
                Saisis un mot-clé (ex: "Pythagore", "fractions", "dérivée") pour obtenir instantanément une explication illustrée avec des emojis.
              </p>
              
              {chatMessages.length > 1 && (
                <div className="bg-[#112240] border border-white/5 p-3 rounded-2xl max-h-[160px] overflow-y-auto space-y-2">
                  {chatMessages.slice(-2).map((msg, idx) => (
                    <div key={idx} className={`p-2 rounded-xl text-[11px] ${msg.sender === 'ai' ? 'bg-black/20 text-white border border-white/5' : 'bg-[#6C5CFF]/10 text-[#9E94FF] font-bold text-right'}`}>
                      <span className="font-extrabold text-[9px] block uppercase text-white/30 mb-0.5">{msg.sender === 'ai' ? '📖 Tuteur' : '👦 Moi'}</span>
                      <p className="whitespace-pre-line leading-relaxed font-medium">{msg.text}</p>
                      {msg.action && (
                        <button onClick={msg.action.onClick} className="mt-1.5 px-2.5 py-1 rounded bg-[#6C5CFF] text-white font-black text-[9px] uppercase tracking-wider cursor-pointer block">{msg.action.label}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendLocalMessage} className="flex space-x-2">
                <input 
                  type="text" 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} 
                  placeholder="Ex: Pythagore, Dérivées, Wolof..." 
                  className="flex-1 bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#6C5CFF]" 
                />
                <button 
                  type="submit" 
                  disabled={isTyping || !userInput.trim()} 
                  className="p-3 bg-[#6C5CFF] text-white rounded-2xl hover:bg-[#5849E0] transition disabled:opacity-50 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'devoirs' && !activeQuiz && (
        <div className="space-y-6 text-left animate-fadeIn">
          {/* Homework Summary Card */}
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg space-y-3 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#6C5CFF]/10 blur-xl pointer-events-none" />
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-[#6C5CFF] uppercase tracking-wider">Cahier de Textes Ado</span>
                <h3 className="text-base font-black text-white">
                  {schoolTasks.filter(t => t.assignedMemberId === activeMemberId && t.done).length} sur {schoolTasks.filter(t => t.assignedMemberId === activeMemberId).length} devoirs faits !
                </h3>
              </div>
              <span className="text-3xl">📝</span>
            </div>
            
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] rounded-full transition-all" 
                style={{ 
                  width: `${schoolTasks.filter(t => t.assignedMemberId === activeMemberId).length > 0 
                    ? (schoolTasks.filter(t => t.assignedMemberId === activeMemberId && t.done).length / schoolTasks.filter(t => t.assignedMemberId === activeMemberId).length) * 100 
                    : 100}%` 
                }}
              />
            </div>
          </div>

          {/* Agenda Grid */}
          <div className="grid grid-cols-1 gap-4">
            
            {/* Overdue (Retards) or Priority Tasks */}
            {(() => {
              const myTasks = schoolTasks.filter(t => t.assignedMemberId === activeMemberId);
              const overdueTasks = myTasks.filter(t => !t.done && (t.dueDate.toLowerCase().includes('hier') || t.difficulty === 'hard'));
              if (overdueTasks.length === 0) return null;

              return (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full w-fit">
                    <span className="animate-pulse">⚠️</span>
                    <span>Tâches Prioritaires / Retards</span>
                  </span>
                  
                  <div className="space-y-2 animate-fadeIn">
                    {overdueTasks.map(task => {
                      const matchedLesson = staticAcademyLessons.find(l => 
                        task.title.toLowerCase().includes(l.title.toLowerCase()) ||
                        task.title.toLowerCase().includes(l.category.toLowerCase()) ||
                        task.subject.toLowerCase().includes(l.category.toLowerCase())
                      );

                      return (
                        <div key={task.id} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              {task.title}
                              <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-black uppercase">Urgent</span>
                            </h4>
                            <p className="text-[10px] text-white/50 mt-1">Matière: {task.subject} • Échéance: {task.dueDate}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            {matchedLesson && (
                              <button
                                onClick={() => {
                                  setSelectedLesson(matchedLesson);
                                  setSelectedLessonCategory(
                                    matchedLesson.matiere === 'Mathématiques' ? 'maths' :
                                    matchedLesson.matiere === 'Français' ? 'français' :
                                    matchedLesson.matiere === 'Sciences' || matchedLesson.matiere === 'Découverte' ? 'sciences' :
                                    'langues'
                                  );
                                  setActiveSubTab('cours');
                                }}
                                className="px-3 py-2 rounded-xl bg-[#6C5CFF]/20 border border-[#6C5CFF]/30 text-[#9E94FF] font-bold text-[9px] uppercase tracking-wider cursor-pointer"
                              >
                                Voir le cours 📖
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSchoolTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: true } : t));
                                setStats(s => ({ ...s, xp: s.xp + 15, stars: s.stars + 2 }));
                                alert("Bravo ! Devoir terminé ! Tu gagnes +15 XP et +2 Étoiles. 🏆");
                              }}
                              className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] uppercase tracking-wider cursor-pointer"
                            >
                              Terminer ✓
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* General Cahier de textes */}
            <div className="space-y-3 animate-fadeIn">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Agenda & Devoirs :</span>
              
              <div className="space-y-2.5">
                {(() => {
                  const myTasks = schoolTasks.filter(t => t.assignedMemberId === activeMemberId);
                  if (myTasks.length === 0) {
                    return <p className="text-xs text-white/40 italic">Aucun devoir programmé.</p>;
                  }

                  return myTasks.map(task => {
                    const matchedLesson = staticAcademyLessons.find(l => 
                      task.title.toLowerCase().includes(l.title.toLowerCase()) ||
                      task.title.toLowerCase().includes(l.category.toLowerCase()) ||
                      task.subject.toLowerCase().includes(l.category.toLowerCase())
                    );

                    return (
                      <div key={task.id} className={`p-4 rounded-2xl border transition-all ${task.done ? 'bg-white/2 border-white/5 opacity-60' : 'bg-white/5 border-white/8'}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className={`text-xs font-bold ${task.done ? 'line-through text-white/40' : 'text-white'}`}>{task.title}</h4>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full text-white/60 font-semibold">{task.subject}</span>
                              <span className="text-[9px] text-white/40 font-semibold">• Échéance: {task.dueDate}</span>
                              {task.difficulty === 'hard' && (
                                <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-rose-400 font-black uppercase">Difficile</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 shrink-0">
                            {matchedLesson && !task.done && (
                              <button
                                onClick={() => {
                                  setSelectedLesson(matchedLesson);
                                  setSelectedLessonCategory(
                                    matchedLesson.matiere === 'Mathématiques' ? 'maths' :
                                    matchedLesson.matiere === 'Français' ? 'français' :
                                    matchedLesson.matiere === 'Sciences' || matchedLesson.matiere === 'Découverte' ? 'sciences' :
                                    'langues'
                                  );
                                  setActiveSubTab('cours');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#9E94FF] font-bold text-[9px] uppercase transition hover:bg-[#6C5CFF]/25 cursor-pointer"
                              >
                                Réviser le cours
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setSchoolTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
                                if (!task.done) {
                                  setStats(s => ({ ...s, xp: s.xp + 10, stars: s.stars + 1 }));
                                  alert("Devoir coché ! Tu gagnes +10 XP. 📚✨");
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-[9px] uppercase transition cursor-pointer ${
                                task.done 
                                  ? 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]' 
                                  : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                            >
                              {task.done ? 'Fait ✓' : 'Marquer fait'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Study/Review Recommendations (Révisions conseillées) */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Révisions Conseillées :</span>
              <div className="bg-[#112240]/40 border border-white/5 rounded-[32px] p-5 space-y-3">
                <p className="text-[10px] text-white/50 leading-relaxed font-semibold">
                  Voici des fiches de cours clés recommandées pour tes évaluations à venir :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {staticAcademyLessons.slice(0, 4).map(les => (
                    <button
                      key={les.id}
                      onClick={() => {
                        setSelectedLesson(les);
                        setSelectedLessonCategory(
                          les.matiere === 'Mathématiques' ? 'maths' :
                          les.matiere === 'Français' ? 'français' :
                          les.matiere === 'Sciences' || les.matiere === 'Découverte' ? 'sciences' :
                          'langues'
                        );
                        setActiveSubTab('cours');
                      }}
                      className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-[#6C5CFF]/15 hover:border-[#6C5CFF]/30 transition text-left cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <span className="text-[8px] text-[#6C5CFF] font-black uppercase tracking-wider block">{les.matiere}</span>
                        <span className="text-xs font-bold text-white truncate block mt-0.5">{les.title}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === 'notes' && !activeQuiz && (
        <div className="space-y-6 text-left animate-fadeIn">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-3.5 text-center text-[10px] text-white/45 font-bold uppercase tracking-wider">
            🔒 Relevé officiel — Lecture seule (Parent)
          </div>

          {(() => {
            const myRealGrades = grades.filter(g => g.studentId === activeMemberId);
            
            let totalWeighted = 0;
            let totalCoef = 0;
            myRealGrades.forEach(g => {
              const norm = (g.value / g.max) * 20;
              totalWeighted += norm * (g.coef || 1);
              totalCoef += (g.coef || 1);
            });

            const avg = totalCoef > 0 
              ? Number((totalWeighted / totalCoef).toFixed(2))
              : null;

            if (avg === null) {
              return (
                <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center text-xs text-white/40 font-bold">
                  Aucune note n'a été saisie par tes parents pour le moment.
                </div>
              );
            }

            const gap = targetAverage - Number(avg);

            return (
              <div className="space-y-6">
                {/* Bulletin average card */}
                <div className="bg-[#112240] border border-white/8 rounded-[32px] p-6 text-center space-y-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-[#FFD700]/10 blur-xl pointer-events-none" />
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Moyenne Générale Pondérée</span>
                    <div className="inline-flex items-baseline space-x-1 bg-white/5 border border-white/8 px-6 py-2 rounded-3xl">
                      <span className="text-3xl font-black text-[#FFB020]">{avg}</span>
                      <span className="text-xs font-bold text-white/40">/ 20</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/75 font-semibold italic">
                    "{avg >= 15 ? 'Félicitations pour tes excellents résultats ! Continue comme ça 🏆' : avg >= 12 ? 'Travail satisfaisant, continue à réviser avec ton Tuteur ! 🚀' : 'Révise tes cours pour remonter tes moyennes !'}"
                  </p>
                </div>

                {/* Grade Objective Setting Card */}
                <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-white">🎯 Objectif de Moyenne</h4>
                      <p className="text-[9.5px] text-white/50">Définis ton objectif et mesure ton écart</p>
                    </div>
                    <span className="text-sm font-black text-[#FFB020] bg-[#FFB020]/10 px-3 py-1 rounded-xl">
                      {targetAverage} / 20
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input 
                      type="range" 
                      min="10" 
                      max="20" 
                      step="0.5" 
                      value={targetAverage} 
                      onChange={(e) => setTargetAverage(Number(e.target.value))} 
                      className="w-full h-1 bg-[#6C5CFF]/30 rounded-lg appearance-none cursor-pointer accent-[#6C5CFF]" 
                    />
                    <div className="flex justify-between text-[8px] font-black text-white/30">
                      <span>10.0</span>
                      <span>15.0</span>
                      <span>20.0</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center space-x-2.5">
                    <TrendingUp className="w-4 h-4 text-[#00D26A] shrink-0" />
                    <p className="text-[10px] text-white/70 font-semibold leading-snug">
                      {gap <= 0 ? (
                        <span className="text-emerald-400">✨ Objectif atteint ! Tu as dépassé ton objectif de {Math.abs(gap).toFixed(2)} points. Bravo !</span>
                      ) : (
                        <span>Encore <span className="text-[#FFB020] font-black">{gap.toFixed(2)} pts</span> à rattraper pour atteindre ta cible.</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Subject-wise averages summary */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">📊 Moyenne par Matière :</span>
                  <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 space-y-3.5">
                    {(() => {
                      const subjects = Array.from(new Set(myRealGrades.map(g => g.subject)));
                      return subjects.map(sub => {
                        const subGrades = myRealGrades.filter(g => g.subject === sub);
                        let subWeighted = 0;
                        let subCoef = 0;
                        subGrades.forEach(g => {
                          subWeighted += ((g.value / g.max) * 20) * (g.coef || 1);
                          subCoef += (g.coef || 1);
                        });
                        const subAvg = Number((subWeighted / subCoef).toFixed(2));
                        const pct = (subAvg / 20) * 100;

                        return (
                          <div key={sub} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-black">
                              <span className="text-white/80">{sub}</span>
                              <span className="text-[#FFB020]">{subAvg} / 20</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#FFB020] to-[#FF8C00] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeSubTab === 'progression' && !activeQuiz && (
        <div className="space-y-6 text-left animate-fadeIn">
          
          {/* Level & XP Overview */}
          <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#6C5CFF]/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-[#6C5CFF] uppercase tracking-wider">Statut Général</span>
                <h3 className="text-xl font-black text-white">Niveau {stats.level}</h3>
                <p className="text-[10px] text-white/50">XP totale : {stats.xp + (stats.level - 1) * 300} XP</p>
              </div>
              <div className="p-3 bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 rounded-2xl">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] rounded-full transition-all duration-500" style={{ width: `${(stats.xp / (stats.level * 100)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-white/40">
                <span>{stats.xp} XP</span>
                <span>Prochain niveau à {stats.level * 100} XP</span>
              </div>
            </div>
          </div>

          {/* Streak & Work Time Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#112240] border border-white/8 rounded-[32px] p-4 flex flex-col justify-between space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Série d'Activité</span>
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stats.streak} Jours</p>
                <p className="text-[9px] text-white/50 font-bold mt-0.5 leading-snug">
                  {stats.streak >= 3 ? '🔥 Super rythme !' : 'Régularité = Clé'}
                </p>
              </div>
            </div>

            {(() => {
              const workTimeMin = stats.completedQuizzesCount * 8 + Math.floor(stats.xp / 10) * 2;
              const hours = Math.floor(workTimeMin / 60);
              const mins = workTimeMin % 60;
              return (
                <div className="bg-[#112240] border border-white/8 rounded-[32px] p-4 flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Temps de Travail</span>
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{hours}h {mins}m</p>
                    <p className="text-[9px] text-white/50 font-bold mt-0.5 uppercase tracking-wider">Cette semaine</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Weekly Work time chart */}
          {(() => {
            const workTimeMin = stats.completedQuizzesCount * 8 + Math.floor(stats.xp / 10) * 2;
            const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
            const distribution = [
              Math.min(workTimeMin, 15),
              Math.max(0, Math.min(workTimeMin - 15, 30)),
              Math.max(0, Math.min(workTimeMin - 45, 10)),
              Math.max(0, Math.min(workTimeMin - 55, 45)),
              Math.max(0, Math.min(workTimeMin - 100, 20)),
              Math.max(0, Math.min(workTimeMin - 120, 15)),
              Math.max(0, Math.min(workTimeMin - 135, 25))
            ];
            
            return (
              <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 space-y-3.5">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">📊 Répartition hebdomadaire (Minutes) :</span>
                <div className="flex justify-between items-end h-[60px] px-2 pt-2">
                  {days.map((day, idx) => {
                    const mins = distribution[idx] || 0;
                    const maxVal = Math.max(...distribution, 10);
                    const pct = (mins / maxVal) * 100;
                    
                    return (
                      <div key={day} className="flex flex-col items-center space-y-1.5 w-7">
                        <span className="text-[8px] font-black text-[#9E94FF]">{mins}m</span>
                        <div className="w-2.5 bg-white/5 rounded-t-sm h-[30px] relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#6C5CFF] to-[#4F8CFF] rounded-t-sm" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="text-[8px] font-black text-white/30">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Badges System */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">🏅 Badges Débloqués :</span>
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-5">
              {(() => {
                const myRealGrades = grades.filter(g => g.studentId === activeMemberId);
                let totalWeighted = 0;
                let totalCoef = 0;
                myRealGrades.forEach(g => {
                  totalWeighted += ((g.value / g.max) * 20) * g.coef;
                  totalCoef += g.coef;
                });
                const avg = totalCoef > 0 ? totalWeighted / totalCoef : 0;
                const totalXp = stats.xp + (stats.level - 1) * 300;

                const badgesList = [
                  { id: 'premier_pas', title: '🎒 Premier Pas', desc: 'Débuter l\'aventure scolaire.', unlocked: stats.level >= 1 },
                  { id: 'assidu', title: '🔥 Assidu', desc: 'Avoir une série de 3 jours.', unlocked: stats.streak >= 3 },
                  { id: 'acier', title: '🧠 Cerveau d\'acier', desc: 'Atteindre le niveau 5.', unlocked: stats.level >= 5 },
                  { id: 'major', title: '🎓 Major de Promo', desc: 'Avoir une moyenne >= 15/20.', unlocked: avg >= 15 },
                  { id: 'incollable', title: '🛡️ Incollable', desc: 'Valider 5 questionnaires.', unlocked: stats.completedQuizzesCount >= 5 },
                  { id: 'chasseur', title: '⚡ Chasseur d\'XP', desc: 'Gagner 500 XP au total.', unlocked: totalXp >= 500 }
                ];

                return (
                  <div className="grid grid-cols-2 gap-3">
                    {badgesList.map(b => (
                      <div 
                        key={b.id} 
                        className={`p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all ${
                          b.unlocked 
                            ? 'bg-[#6C5CFF]/10 border-[#6C5CFF]/30 shadow-md shadow-[#6C5CFF]/5' 
                            : 'bg-white/3 border-white/5 opacity-40'
                        }`}
                      >
                        <span className="text-xl mt-0.5">{b.unlocked ? '🏆' : '🔒'}</span>
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-black text-white truncate">{b.title}</h5>
                          <p className="text-[9px] text-white/50 font-medium leading-snug">{b.desc}</p>
                          <span className={`text-[8px] font-black uppercase tracking-wider block mt-1 ${
                            b.unlocked ? 'text-emerald-400' : 'text-white/30'
                          }`}>
                            {b.unlocked ? 'Débloqué' : 'Verrouillé'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Reward Store Preview */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block flex items-center space-x-1.5 text-yellow-400">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Récompenses déblocables :</span>
            </span>
            <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 space-y-2">
              {parentRewards.map((rew, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/3 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{rew.icon}</span>
                    <span className="text-xs font-black text-white">{rew.label}</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1 rounded-xl text-yellow-400 font-extrabold text-[9px] uppercase">
                    <span>{rew.cost}</span>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Challenges & Leaderboard (Merged from old Defis tab) */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">🎯 Défis & Évaluations :</span>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={launchDailyChallenge} 
                className="bg-gradient-to-br from-[#FFB020]/15 to-[#FF8C00]/5 border-2 border-[#FFB020]/30 rounded-[28px] p-5 text-left flex items-start space-x-4 hover:border-[#FFB020]/50 transition-all cursor-pointer w-full"
              >
                <span className="p-3 bg-[#FFB020]/20 rounded-2xl text-xl shrink-0">🏆</span>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    Défi Quotidien 
                    <span className="text-[8px] bg-[#FFB020]/20 text-[#FFB020] px-1.5 py-0.5 rounded-full font-black uppercase">XP DOUBLE</span>
                  </h4>
                  <p className="text-[10px] text-white/60 font-semibold leading-snug">
                    10 questions mélangées. Reçois le double de récompenses (+100 XP / +10 Étoiles) !
                  </p>
                </div>
              </button>

              <button 
                onClick={launchWeeklyEvaluation} 
                className="bg-gradient-to-br from-[#E040FB]/15 to-[#6C5CFF]/5 border-2 border-[#E040FB]/25 rounded-[28px] p-5 text-left flex items-start space-x-4 hover:border-[#E040FB]/45 transition-all cursor-pointer w-full"
              >
                <span className="p-3 bg-[#E040FB]/20 rounded-2xl text-xl shrink-0">⚡</span>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    Évaluation Hebdomadaire
                    <span className="text-[8px] bg-[#E040FB]/20 text-[#E040FB] px-1.5 py-0.5 rounded-full font-black uppercase">Badge</span>
                  </h4>
                  <p className="text-[10px] text-white/60 font-semibold leading-snug">
                    10 questions pour valider ton assiduité de la semaine et débloquer ton badge.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 tracking-widest block">🏆 Classement Familial :</span>
            <div className="bg-[#112240] border border-white/8 rounded-[32px] p-5 space-y-3">
              {(() => {
                const leaderboardList = members && members.length > 0 
                  ? members.map(m => {
                      let memberXp = 120;
                      if (m.id === activeMemberId) {
                        memberXp = stats.xp + (stats.level - 1) * 300;
                      } else if (m.role?.toLowerCase().includes('ado') || m.id === '3') {
                        memberXp = 450;
                      } else if (m.role?.toLowerCase().includes('enfant') || m.id === '4') {
                        memberXp = 220;
                      } else {
                        memberXp = 90;
                      }
                      return {
                        id: m.id,
                        name: m.name,
                        photoUrl: m.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
                        xp: memberXp
                      };
                    }).sort((a, b) => b.xp - a.xp)
                  : [
                      { id: '3', name: 'Amadou', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', xp: 450 },
                      { id: activeMemberId, name: activeMember?.name || 'Ado', photoUrl: activeMember?.photoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80', xp: stats.xp + (stats.level - 1) * 300 },
                      { id: '4', name: 'Awa', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80', xp: 220 }
                    ].sort((a, b) => b.xp - a.xp);

                return leaderboardList.map((user, idx) => {
                  const isMe = user.id === activeMemberId;
                  const rankEmojis = ['👑', '🥈', '🥉'];
                  
                  return (
                    <div 
                      key={user.id} 
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                        isMe ? 'bg-[#6C5CFF]/15 border border-[#6C5CFF]/30' : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="text-xs shrink-0 w-5 text-center font-black text-white/40">
                          {rankEmojis[idx] || `${idx + 1}.`}
                        </span>
                        <img 
                          src={user.photoUrl} 
                          alt={user.name} 
                          className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                        />
                        <span className={`text-xs font-black truncate block ${isMe ? 'text-white' : 'text-white/80'}`}>
                          {user.name} {isMe ? '(Moi)' : ''}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-black text-[#FFB020] bg-[#FFB020]/10 px-2.5 py-1 rounded-xl">
                          {user.xp} XP
                        </span>
                        
                        {!isMe && (
                          <button
                            onClick={() => {
                              const questions: AcademyQuestion[] = [];
                              for (let i = 0; i < 10; i++) {
                                questions.push(generateProceduralQuestion(currentGrade, i % 2 === 0 ? 'Mathématiques' : 'Français'));
                              }
                              setActiveQuiz({
                                type: 'teen_exercise',
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
                              alert(`⚔️ Lancement du Duel contre ${user.name} ! Obtiens au moins 8/10 pour gagner.`);
                            }}
                            className="p-1.5 bg-[#E040FB]/10 border border-[#E040FB]/20 hover:bg-[#E040FB]/25 text-[#E040FB] rounded-xl text-[9px] font-black uppercase cursor-pointer transition-all"
                          >
                            ⚔️ Duel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
