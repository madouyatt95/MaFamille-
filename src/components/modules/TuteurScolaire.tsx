/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/immutability, react-hooks/purity -- legacy Supabase and module payloads still use broad shapes; tracked in docs/lint_cleanup_remaining.md; legacy effects need dependency isolation before changing behavior; legacy state and payload updates need a dedicated immutable-data refactor; legacy render helpers use date/random/derived calls; tracked for a dedicated refactor */
import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  UserCheck,
  ArrowLeft,
  TrendingUp,
  Trash2,
  Edit3,
  Flame,
  Star,
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShoppingBag,
  Send
} from 'lucide-react';
import { getSupabaseClient } from '../../utils/supabase';
import type { SchoolTask } from '../../types';
import { staticAcademyQuestions, staticAcademyLessons } from '../../data/academyData';
import type { AcademyQuestion, Lesson, AcademySubject } from '../../data/academyData';
import { generateProceduralQuestion, generateQuestionForLesson } from '../../utils/academyGenerator';

const LEGACY_DEMO_SCHOOL_TASK_IDS = new Set(['st-1', 'st-2', 'st-3', 'st-4', 'st-5']);

export interface ChapterProgress {
  read: boolean;
  exercises: boolean;
  game: boolean;
  flash: boolean;
  challenge: boolean;
}

export interface StudentProfile {
  level: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée';
  country: string;
}

export interface WeeklyEvalItem {
  id: string;
  date: string;
  score: number;
  max: number;
  xpBonus: number;
  starsBonus: number;
  subjects: string[];
}

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
  const visibleSchoolTasks = schoolTasks.filter(task => task && !LEGACY_DEMO_SCHOOL_TASK_IDS.has(String(task.id || '')));

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
  const [showBasics, setShowBasics] = useState<boolean>(false);

  const [currentFlashIndex, setCurrentFlashIndex] = useState(0);
  const [isFlashFlipped, setIsFlashFlipped] = useState(false);

  useEffect(() => {
    if (initialSubTab) {
      queueMicrotask(() => {
        if (initialSubTab === 'quizzes') {
          setActiveSubTab(isParent ? 'devoirs' : 'cours');
        } else if (initialSubTab === 'grades') {
          setActiveSubTab(isParent ? 'grades' : 'notes');
        } else {
          setActiveSubTab(initialSubTab as any);
        }
      });
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
      try { return JSON.parse(stored); } catch {
        // Ignore corrupted local progress and start fresh.
      }
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

  // Student Profile
  const [studentProfile] = useState<StudentProfile>(() => {
    const key = `academy_student_profile_${activeMemberId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch {
        // Ignore corrupted local profile and infer it again.
      }
    }
    // Fallback: estimate from age
    let estimatedLevel: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée' = '3e';
    const targetMember = activeMember || { age: '14' };
    const parsedAge = parseInt(targetMember.age, 10);
    if (!isNaN(parsedAge)) {
      if (parsedAge <= 6) estimatedLevel = 'CP';
      else if (parsedAge === 7) estimatedLevel = 'CE1';
      else if (parsedAge === 8) estimatedLevel = 'CE2';
      else if (parsedAge === 9) estimatedLevel = 'CM1';
      else if (parsedAge === 10) estimatedLevel = 'CM2';
      else if (parsedAge === 11) estimatedLevel = '6e';
      else if (parsedAge === 12) estimatedLevel = '5e';
      else if (parsedAge === 13) estimatedLevel = '4e';
      else if (parsedAge === 14) estimatedLevel = '3e';
      else estimatedLevel = 'Lycée';
    }
    return { level: estimatedLevel, country: 'France' };
  });

  const getCycleForLevel = (lvl: string): 'Cycle 2' | 'Cycle 3' | 'Cycle 4' | 'Lycée' => {
    if (['CP', 'CE1', 'CE2'].includes(lvl)) return 'Cycle 2';
    if (['CM1', 'CM2', '6e'].includes(lvl)) return 'Cycle 3';
    if (['5e', '4e', '3e'].includes(lvl)) return 'Cycle 4';
    return 'Lycée';
  };

  const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>({
    'Cycle 2': false,
    'Cycle 3': false,
    'Cycle 4': true,
    'Lycée': false
  });

  // Save student profile and auto-expand cycle
  useEffect(() => {
    localStorage.setItem(`academy_student_profile_${activeMemberId}`, JSON.stringify(studentProfile));
    const cycle = getCycleForLevel(studentProfile.level);
    queueMicrotask(() => {
      setExpandedCycles({
        'Cycle 2': cycle === 'Cycle 2',
        'Cycle 3': cycle === 'Cycle 3',
        'Cycle 4': cycle === 'Cycle 4',
        'Lycée': cycle === 'Lycée'
      });
    });
  }, [studentProfile, activeMemberId]);

  const currentGrade = studentProfile.level;

  // Lesson states & Progress
  const [selectedSubject, setSelectedSubject] = useState<AcademySubject | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<number>(0);

  // Lesson progress
  const [lessonProgress, setLessonProgress] = useState<Record<string, ChapterProgress>>(() => {
    const key = `academy_lesson_progress_${activeMemberId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated: Record<string, ChapterProgress> = {};
        for (const k of Object.keys(parsed)) {
          const val = parsed[k];
          if (typeof val === 'string') {
            migrated[k] = {
              read: val !== 'none',
              exercises: val === 'exercises_done' || val === 'challenge_done' || val === 'completed',
              game: val === 'challenge_done' || val === 'completed',
              flash: val === 'completed',
              challenge: val === 'completed'
            };
          } else {
            migrated[k] = val;
          }
        }
        return migrated;
      } catch {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`academy_lesson_progress_${activeMemberId}`, JSON.stringify(lessonProgress));
  }, [lessonProgress, activeMemberId]);

  // Worked chapters tracking
  const [workedChapters, setWorkedChapters] = useState<string[]>(() => {
    const key = `academy_worked_chapters_${activeMemberId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  });

  const markChapterAsWorked = (id: string) => {
    if (!workedChapters.includes(id)) {
      const updated = [...workedChapters, id];
      setWorkedChapters(updated);
      localStorage.setItem(`academy_worked_chapters_${activeMemberId}`, JSON.stringify(updated));
    }
  };

  // Weekly Evaluations History
  const [weeklyEvals, setWeeklyEvals] = useState<WeeklyEvalItem[]>(() => {
    const key = `academy_weekly_evals_${activeMemberId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(`academy_weekly_evals_${activeMemberId}`, JSON.stringify(weeklyEvals));
  }, [weeklyEvals, activeMemberId]);

  // Helper to get chapter progress percentage
  const getChapterProgressPercent = (lesId: string): number => {
    const p = lessonProgress[lesId];
    if (!p) return 0;
    return (p.read ? 10 : 0) + (p.exercises ? 30 : 0) + (p.game ? 20 : 0) + (p.flash ? 20 : 0) + (p.challenge ? 20 : 0);
  };

  // Helper to update progress fields
  const updateProgressField = (lesId: string, field: keyof ChapterProgress, val: boolean) => {
    setLessonProgress(prev => {
      const current = prev[lesId] || { read: false, exercises: false, game: false, flash: false, challenge: false };
      const updated = { ...current, [field]: val };
      return { ...prev, [lesId]: updated };
    });
    markChapterAsWorked(lesId);
  };

  // Subject Categories Map
  const subjectCategories: Record<string, string[]> = {
    Mathématiques: ["Numération", "Additions", "Soustractions", "Multiplications", "Divisions", "Fractions", "Décimaux", "Géométrie", "Aires", "Volumes", "Pourcentages", "Proportionnalité", "Équations", "Fonctions", "Statistiques", "Probabilités", "Théorème de Pythagore", "Théorème de Thalès"],
    Français: ["Lecture", "Compréhension", "Orthographe", "Grammaire", "Nature des mots", "Analyse grammaticale", "Conjugaison", "Rédaction", "Dictées"],
    Histoire: ["Préhistoire", "Antiquité", "Égypte", "Rome", "Moyen Âge", "Renaissance", "Révolution française", "Première Guerre mondiale", "Seconde Guerre mondiale", "Monde contemporain"],
    Géographie: ["Continents et Océans", "Pays et Capitales", "Reliefs et Climats", "Populations du monde", "Cartographie", "Environnement"],
    Sciences: ["Corps humain", "Animaux", "Plantes", "Énergie", "Électricité", "Espace", "Planètes", "Génétique", "Chimie", "Physique"],
    Anglais: ["Les couleurs", "Les nombres", "Les salutations", "Les animaux", "Verbes irréguliers", "Vocabulaire du quotidien"],
    Langues: ["Wolof", "Espagnol de base", "Allemand de base"],
    Technologie: ["Fonctionnement de l'ordinateur", "Internet et le Web", "Algorithmes simples"],
    "Culture générale": ["Familles d'instruments", "Monuments célèbres", "Grandes découvertes"],
    EMC: ["Valeurs de la République", "Droits de l'enfant", "La citoyenneté"],
    SVT: ["ADN et Génétique", "Écosystèmes", "Corps humain et santé"],
    "Physique-Chimie": ["Circuits électriques", "Matière et mélanges", "Forces et mouvements"],
    Logique: ["Énigmes logiques", "Suites de nombres", "Formes et motifs"],
    Programmation: ["Découverte de Python", "Le binaire", "Créer sa première page HTML"],
    Orientation: ["Les métiers d'avenir", "Choisir son parcours scolaire", "CV et lettre de motivation"]
  };

  // Calculate subject progress
  const getSubjectProgress = (subj: AcademySubject): number => {
    const studentCycle = getCycleForLevel(studentProfile.level);
    const lessons = staticAcademyLessons.filter(l => l.matiere === subj && l.cycles.includes(studentCycle));
    if (lessons.length === 0) return 0;
    const total = lessons.reduce((acc, curr) => acc + getChapterProgressPercent(curr.id), 0);
    return Math.round(total / lessons.length);
  };

  // Memory game states
  const [memoryCards, setMemoryCards] = useState<Array<{ id: number; content: string; matchId: number; isFlipped: boolean; isMatched: boolean }>>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [activeGame, setActiveGame] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Streak update on teenager load
  useEffect(() => {
    if (!isParent) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (stats.lastActiveDate !== todayStr) {
        queueMicrotask(() => {
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
        });
      }
    }
  }, [activeMemberId, isParent, stats.lastActiveDate]);

  // Student list resolution
  const studentList = members && members.length > 0
    ? members.filter(m => {
        const r = (m.role || '').toLowerCase();
        return r === 'child' || r.includes('enfant') || r.includes('ado') || r.includes('collège') || r.includes('lycée') || r.includes('primaire') || r.includes('ans');
      })
    : activeMember
      ? [{ id: activeMemberId, name: activeMember.name || 'Moi', role: isParent ? 'Parent' : 'Élève' }]
      : [];

  const getChildName = (id: string) => {
    return studentList.find(s => s.id === id)?.name || id;
  };

  // Lesson & Multiplication Table States
  const [, setSelectedLessonCategory] = useState<'maths' | 'français' | 'sciences' | 'langues' | 'histoire' | 'géographie' | 'anglais' | 'culture' | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [, setSelectedTable] = useState<number | null>(null);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<{
    type: 'quick' | 'daily' | 'weekly' | 'tutor' | 'teen_exercise' | 'teen_flash' | 'teen_exam' | 'teen_flash_lesson' | 'teen_challenge' | 'teen_evaluation';
    questions: AcademyQuestion[];
    currentIndex: number;
    score: number;
    answers: boolean[];
    selectedOption: string | null;
    showCorrection: boolean;
    xpEarned: number;
    starsEarned: number;
    showHint: boolean;
    timerRemaining?: number;
    challengeCount?: number;
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

  // Challenge Timer loop (from KidSchool)
  useEffect(() => {
    if (activeQuiz && activeQuiz.type === 'teen_challenge') {
      if (activeQuiz.timerRemaining !== undefined && activeQuiz.timerRemaining > 0) {
        timerRef.current = setTimeout(() => {
          setActiveQuiz(prev => {
            if (!prev) return null;
            return {
              ...prev,
              timerRemaining: (prev.timerRemaining || 0) - 1
            };
          });
        }, 1000);
      } else if (activeQuiz.timerRemaining === 0) {
        // End of time!
        finishTimedChallenge();
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeQuiz]);

  const finishTimedChallenge = () => {
    if (!activeQuiz) return;
    const finalCount = activeQuiz.challengeCount || 0;
    const passed = finalCount >= 4;
    
    if (passed) {
      if (selectedLesson) {
        updateProgressField(selectedLesson.id, 'challenge', true);
        alert(`🏆 Défi validé ! Tu as donné ${finalCount} bonnes réponses en temps limité.\n+20 XP remportés ! ⭐`);
        setStats(prev => ({ ...prev, xp: prev.xp + 20 }));
        setActiveStepTab(5); // Move to Badge step
      }
    } else {
      alert(`😢 Défi échoué. Tu as donné ${finalCount} bonnes réponses, mais il en faut au moins 4. Entraîne-toi et réessaye !`);
    }
    setActiveQuiz(null);
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

  // Launch Weekly Evaluation (updated)
  const launchWeeklyEvaluation = () => {
    const questions: AcademyQuestion[] = [];
    const chaptersToUse = workedChapters.length > 0 ? workedChapters : staticAcademyLessons.filter(l => l.cycles.includes(getCycleForLevel(studentProfile.level))).map(l => l.id);
    const finalChapters = chaptersToUse.length > 0 ? chaptersToUse : staticAcademyLessons.map(l => l.id);
    
    for (let i = 0; i < 10; i++) {
      const randLessonId = finalChapters[Math.floor(Math.random() * finalChapters.length)];
      questions.push(generateQuestionForLesson(randLessonId, studentProfile.level));
    }

    setActiveQuiz({
      type: 'weekly',
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 100,
      starsEarned: 10,
      showHint: false
    });
  };

  // New chapter-step launcher helpers
  const startTeenExercises = (lesson: Lesson, qCount = 5) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < qCount; i++) {
      questions.push(generateQuestionForLesson(lesson.id, studentProfile.level));
    }
    setActiveQuiz({
      type: 'teen_exercise',
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 20,
      starsEarned: 2,
      showHint: false
    });
  };

  const startTeenFlash = (lesson: Lesson) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < 5; i++) {
      questions.push(generateQuestionForLesson(lesson.id, studentProfile.level));
    }
    setActiveQuiz({
      type: 'teen_flash_lesson',
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 20,
      starsEarned: 1,
      showHint: false
    });
  };

  const startTeenChallenge = (lesson: Lesson) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < 20; i++) {
      questions.push(generateQuestionForLesson(lesson.id, studentProfile.level));
    }
    setActiveQuiz({
      type: 'teen_challenge',
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 20,
      starsEarned: 3,
      showHint: false,
      timerRemaining: 45,
      challengeCount: 0
    });
  };

  // Memory game card generation
  const startMemoryGame = (lesson: Lesson) => {
    let pairs: Array<{ content: string; matchContent: string }>;
    if (lesson.id === 'les_3e_mat_pyth') {
      pairs = [
        { content: "Hypoténuse²", matchContent: "Somme des carrés" },
        { content: "Triangle", matchContent: "Rectangle" },
        { content: "Côté opposé", matchContent: "Angle droit" },
        { content: "Théorème", matchContent: "Pythagore" }
      ];
    } else if (lesson.id === 'les_3e_mat_thal') {
      pairs = [
        { content: "Thalès", matchContent: "Droites parallèles" },
        { content: "Rapports", matchContent: "AM/AB = AN/AC" },
        { content: "Configuration", matchContent: "Papillon ou triangle" },
        { content: "Théorème", matchContent: "Thalès" }
      ];
    } else if (lesson.id === 'les_ado_prog_python') {
      pairs = [
        { content: "print()", matchContent: "Afficher" },
        { content: "def my_func():", matchContent: "Fonction" },
        { content: "x = 5", matchContent: "Variable" },
        { content: "Python", matchContent: "Code" }
      ];
    } else {
      pairs = [
        { content: lesson.title, matchContent: "Titre" },
        { content: "Définition", matchContent: lesson.definition.substring(0, 20) + "..." },
        { content: "Matière", matchContent: lesson.matiere },
        { content: "Cycle", matchContent: lesson.cycles[0] }
      ];
    }

    const cardsList: Array<{ id: number; content: string; matchId: number; isFlipped: boolean; isMatched: boolean }> = [];
    pairs.forEach((p, idx) => {
      cardsList.push({ id: idx * 2, content: p.content, matchId: idx * 2 + 1, isFlipped: false, isMatched: false });
      cardsList.push({ id: idx * 2 + 1, content: p.matchContent, matchId: idx * 2, isFlipped: false, isMatched: false });
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
          // Check win
          setMemoryCards(prev => {
            const allMatched = prev.every(c => c.isMatched || c.id === first.id || c.id === second.id);
            if (allMatched) {
              setTimeout(() => {
                setActiveGame(false);
                if (selectedLesson) {
                  updateProgressField(selectedLesson.id, 'game', true);
                  setStats(prevStats => ({ ...prevStats, xp: prevStats.xp + 20 }));
                  alert("🎉 Incroyable ! Tu as trouvé toutes les paires ! Mini-Jeu validé (+20 XP) ! 🎮");
                }
              }, 500);
            }
            return prev;
          });
        }, 600);
      } else {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === first.id || c.id === second.id) ? { ...c, isFlipped: false } : c));
          setSelectedCards([]);
        }, 1000);
      }
    }
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
    const updatedChallengeCount = isCorrect && activeQuiz.type === 'teen_challenge' ? (activeQuiz.challengeCount || 0) + 1 : (activeQuiz.challengeCount || 0);

    setActiveQuiz(prev => prev ? {
      ...prev,
      score: nextScore,
      answers: nextAnswers,
      selectedOption: option,
      showCorrection: true,
      xpEarned: nextXp,
      starsEarned: nextStars,
      challengeCount: updatedChallengeCount
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

      // Handle lesson step logic
      if (activeQuiz.type === 'teen_exercise') {
        if (selectedLesson) {
          const exercisesPassed = cleanScore >= 4;
          if (exercisesPassed) {
            updateProgressField(selectedLesson.id, 'exercises', true);
            setActiveStepTab(2); // Jump to game!
            alert(`🎉 Entraînement validé ! Score : ${cleanScore}/5.\nLe Mini-Jeu est maintenant débloqué ! 🎮`);
          } else {
            alert(`😢 Entraînement non validé (Score : ${cleanScore}/5). Tu as besoin d'au moins 4/5. Relis la leçon et réessaye !`);
          }
        }
      } else if (activeQuiz.type === 'teen_flash_lesson') {
        if (selectedLesson) {
          const flashPassed = cleanScore >= 4;
          if (flashPassed) {
            updateProgressField(selectedLesson.id, 'flash', true);
            setActiveStepTab(4); // Jump to challenge!
            alert(`⚡ Flash Quiz validé ! Score : ${cleanScore}/5.\n+20 XP remportés !`);
          } else {
            alert(`😢 Flash Quiz non validé (Score : ${cleanScore}/5). Recommence pour obtenir au moins 4/5 !`);
          }
        }
      } else if (activeQuiz.type === 'teen_evaluation') {
        if (selectedLesson) {
          const evalPassed = cleanScore >= 8; // 80%
          if (evalPassed) {
            updateProgressField(selectedLesson.id, 'read', true);
            updateProgressField(selectedLesson.id, 'exercises', true);
            updateProgressField(selectedLesson.id, 'game', true);
            updateProgressField(selectedLesson.id, 'flash', true);
            updateProgressField(selectedLesson.id, 'challenge', true);
            
            setActiveStepTab(5); // index of Badge screen is 5 in the new 6-steps tab
            
            // Submit pocket money validation to parents
            const pocketMoneyTask: SchoolTask = {
              id: `pocket-${Date.now()}`,
              title: `Argent de poche : validation de la leçon "${selectedLesson.title}" pour ${activeMember?.name || 'Ado'}`,
              subject: 'Récompense',
              difficulty: 'medium',
              assignedMemberId: activeMemberId,
              dueDate: 'Aujourd\'hui',
              done: true,
              grade: undefined
            };
            setSchoolTasks(prev => [...prev, pocketMoneyTask]);
            alert(`🏆 ÉVALUATION RÉUSSIE ! Note : ${cleanScore}/10.\nLa leçon est 100% maîtrisée !\nTu obtiens ton Badge de Chapitre et une proposition d'argent de poche (+0.50€) a été envoyée ! 💶✨`);
          } else {
            alert(`😢 Évaluation non validée (Note : ${cleanScore}/10). Tu dois obtenir au moins 8/10. Réessaye après avoir révisé !`);
          }
        }
      } else if (activeQuiz.type === 'weekly') {
        const grade20 = Math.round((cleanScore / activeQuiz.questions.length) * 20);
        const bonusXp = grade20 >= 16 ? 100 : grade20 >= 12 ? 50 : 20;
        const bonusStars = grade20 >= 16 ? 10 : grade20 >= 12 ? 5 : 2;

        const newEval: WeeklyEvalItem = {
          id: `eval-${Date.now()}`,
          date: new Date().toLocaleDateString('fr-FR'),
          score: grade20,
          max: 20,
          xpBonus: bonusXp,
          starsBonus: bonusStars,
          subjects: workedChapters.map(id => staticAcademyLessons.find(l => l.id === id)?.matiere || 'Curriculum').filter((v, i, a) => a.indexOf(v) === i)
        };

        setWeeklyEvals(prev => [newEval, ...prev]);
        setStats(prev => ({ ...prev, xp: prev.xp + bonusXp, stars: prev.stars + bonusStars }));
        
        // Also add a grade to the report card
        const newGradeItem: GradeItem = {
          id: `grade-weekly-${Date.now()}`,
          studentId: activeMemberId,
          studentName: activeMember?.displayName || activeMember?.name || 'Ado',
          subject: 'Académie',
          value: grade20,
          max: 20,
          coef: 1,
          examTitle: 'Évaluation Hebdomadaire',
          date: new Date().toLocaleDateString('fr-FR')
        };
        setGrades(prev => [...prev, newGradeItem]);

        alert(`📝 Évaluation hebdomadaire terminée !\nNote : ${grade20}/20\nBonus remportés : +${bonusXp} XP et +${bonusStars} Étoiles ! ⭐️`);
        setActiveSubTab('cours' as any);
      }

      // Handle teen exam grade auto-saving
      if (activeQuiz.type === 'teen_exam') {
        const finalGrade = Math.round((cleanScore / activeQuiz.questions.length) * 20);
        const newGradeItem: GradeItem = {
          id: `grade-teen-exam-${Date.now()}`,
          studentId: activeMemberId,
          studentName: getChildName(activeMemberId),
          subject: selectedSubject || 'Mathématiques',
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
      if (activeQuiz.type !== 'teen_flash' && activeQuiz.type !== 'teen_exam' && activeQuiz.type !== 'teen_exercise' && activeQuiz.type !== 'teen_flash_lesson' && activeQuiz.type !== 'teen_evaluation' && activeQuiz.type !== 'weekly') {
        alert(`Entraînement terminé ! Score : ${cleanScore}/${activeQuiz.questions.length}\nVous remportez +${totalXp} XP et +${totalStars} Étoiles ! ⭐️`);
      }
    }
  };

  // Local Chat tutor submit
  const handleSendLocalMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setChatMessages((prev: any[]) => [...prev, { sender: 'user', text: query }]);
    setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      const cleanQuery = query.toLowerCase();
      let matchedLesson: Lesson | undefined;

      // 1. Exact match on subject or title or category
      matchedLesson = staticAcademyLessons.find(l => 
        cleanQuery.includes(l.title.toLowerCase()) ||
        cleanQuery.includes(l.category.toLowerCase()) ||
        cleanQuery.includes(l.matiere.toLowerCase())
      );

      // 2. Word occurrence match if no exact match
      if (!matchedLesson) {
        const words = cleanQuery.split(/\s+/).filter((w: string) => w.length > 3);
        let bestScore = 0;
        for (const lesson of staticAcademyLessons) {
          let score = 0;
          for (const w of words) {
            if (lesson.title.toLowerCase().includes(w)) score += 10;
            if (lesson.category.toLowerCase().includes(w)) score += 8;
            if (lesson.explication.toLowerCase().includes(w)) score += 3;
            if (lesson.memo.toLowerCase().includes(w)) score += 2;
          }
          if (score > bestScore && score >= 3) {
            bestScore = score;
            matchedLesson = lesson;
          }
        }
      }

      let responseText = '';
      if (matchedLesson) {
        responseText = `J'ai trouvé une fiche de cours sur **${matchedLesson.title}** (${matchedLesson.matiere}) ! 📖\n\n**Définition :** ${matchedLesson.definition}\n\n**Explication :** ${matchedLesson.explication}\n\n**Exemple :** ${matchedLesson.exemple}\n\n💡 *Méthode / Astuce (Pièges) :* ${matchedLesson.pieges}\n\nPrêt à réviser ce chapitre ? Clique sur le bouton ci-dessous !`;
        const targetLesson = matchedLesson;
        
        setChatMessages((prev: any[]) => [
          ...prev,
          { 
            sender: 'ai', 
            text: responseText,
            action: {
              label: `Ouvrir le cours : ${targetLesson.title} 📚`,
              onClick: () => {
                setSelectedSubject(targetLesson.matiere);
                setSelectedLesson(targetLesson);
                setActiveStepTab(0);
                setActiveSubTab('cours' as any);
              }
            }
          }
        ]);
      } else {
        responseText = `Je n'ai pas trouvé de fiche spécifique pour "${query}". 🧐\n\nPose-moi une question sur un sujet du programme comme :\n- "multiplications" ✖️\n- "fractions" 🍰\n- "corps humain" 🧠\n- "pharaons" 🏺\n- "pythagore" 🔺\n- "binaire" 💻\n- "python" 🐍\n- "wolof" 🗣️\n\nQuelle matière veux-tu étudier aujourd'hui ?`;
        setChatMessages((prev: any[]) => [...prev, { sender: 'ai', text: responseText }]);
      }
      setIsTyping(false);
    }, 800);
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
  const [homeworkNotice, setHomeworkNotice] = useState('');

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
    setHomeworkNotice(`Devoir ajouté pour ${getChildName(newTask.assignedMemberId)}.`);
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
    setHomeworkNotice('Devoir modifié.');
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

  const handleParentValidate = (taskId: string) => {
    setSchoolTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: true, grade: 'Validé' } : t));
    setHomeworkNotice('Devoir validé et récompense prise en compte.');
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

  const isPendingValidation = (task: SchoolTask) => task.done && !task.grade;

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
            {homeworkNotice && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
                <span className="font-bold">{homeworkNotice}</span>
                <button
                  type="button"
                  onClick={() => setHomeworkNotice('')}
                  className="text-emerald-100/60 hover:text-emerald-100 text-[10px] font-black uppercase tracking-wider"
                >
                  OK
                </button>
              </div>
            )}

            {/* Parent Validation Section */}
            {visibleSchoolTasks.some(isPendingValidation) && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest flex items-center space-x-1.5 bg-[#FFB020]/10 border border-[#FFB020]/20 p-2.5 rounded-2xl w-fit">
                  <UserCheck className="w-4 h-4 animate-bounce" />
                  <span>Devoirs en attente de validation</span>
                </span>
                
                <div className="space-y-2">
                  {visibleSchoolTasks.filter(isPendingValidation).map((task) => (
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
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Cahier de textes familial</span>
            
            <div className="space-y-3">
              {visibleSchoolTasks.length === 0 ? (
                <div className="glass-panel border border-dashed border-white/10 rounded-[24px] p-5 text-center space-y-2">
                  <GraduationCap className="w-7 h-7 mx-auto text-[#6C5CFF]" />
                  <h4 className="text-sm font-black text-white">Aucun devoir réel enregistré</h4>
                  <p className="text-xs text-white/45 leading-relaxed">
                    Ajoutez un devoir ci-dessous pour l'attribuer à un enfant et le faire apparaître dans son espace.
                  </p>
                </div>
              ) : (
                visibleSchoolTasks.map((task) => {
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
              }))}
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
              const statsKey = `academy_stats_${s.id}`;
              const statsRaw = localStorage.getItem(statsKey);
              let kidStats = { level: 1, xp: 0, stars: 0, streak: 0, completedQuizzesCount: 0 };
              if (statsRaw) {
                try { kidStats = JSON.parse(statsRaw); } catch {
                  // Ignore corrupted local academy stats for this child.
                }
              }

              const profileKey = `academy_student_profile_${s.id}`;
              const profileRaw = localStorage.getItem(profileKey);
              let profile = { level: 'CE2', country: 'France' };
              if (profileRaw) {
                try { profile = JSON.parse(profileRaw); } catch {
                  // Ignore corrupted local academy profile for this child.
                }
              }

              const progressKey = `academy_lesson_progress_${s.id}`;
              const progressRaw = localStorage.getItem(progressKey);
              let progress: Record<string, ChapterProgress> = {};
              if (progressRaw) {
                try { progress = JSON.parse(progressRaw); } catch {
                  // Ignore corrupted local academy progress for this child.
                }
              }

              const evalsKey = `academy_weekly_evals_${s.id}`;
              const evalsRaw = localStorage.getItem(evalsKey);
              let evalsList: WeeklyEvalItem[] = [];
              if (evalsRaw) {
                try { evalsList = JSON.parse(evalsRaw); } catch {
                  // Ignore corrupted local academy evaluations for this child.
                }
              }

              const getChildSubjectProgress = (subj: AcademySubject): number => {
                const childCycle = getCycleForLevel(profile.level);
                const lessons = staticAcademyLessons.filter(l => l.matiere === subj && l.cycles.includes(childCycle));
                if (lessons.length === 0) return 0;
                const total = lessons.reduce((acc, curr) => {
                  const p = progress[curr.id];
                  if (!p) return acc;
                  const pct = (p.read ? 10 : 0) + (p.exercises ? 30 : 0) + (p.game ? 20 : 0) + (p.flash ? 20 : 0) + (p.challenge ? 20 : 0);
                  return acc + pct;
                }, 0);
                return Math.round(total / lessons.length);
              };

              const getChildGlobalProgress = (): number => {
                const subjects = Object.keys(subjectCategories) as AcademySubject[];
                const total = subjects.reduce((acc, curr) => acc + getChildSubjectProgress(curr), 0);
                return Math.round(total / subjects.length);
              };

              const globalProgress = getChildGlobalProgress();

              return (
                <div key={s.id} className="glass-panel border border-white/8 rounded-[24px] p-5 space-y-4 bg-[#112240]/45">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-white">{s.name}</h4>
                      <p className="text-[9px] text-[#00D26A] font-bold uppercase tracking-wider mt-0.5">
                        🌍 {profile.country} • 🎓 Classe : {profile.level}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-white">{globalProgress}% Global</span>
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mt-0.5">
                        <div className="h-full bg-[#6C5CFF]" style={{ width: `${globalProgress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Micro stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-bold bg-black/15 p-3 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-white/40">Étoiles</p>
                      <p className="text-yellow-400 flex items-center space-x-1 mt-0.5"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> <span>{kidStats.stars}</span></p>
                    </div>
                    <div>
                      <p className="text-white/40">Série active</p>
                      <p className="text-orange-400 flex items-center space-x-1 mt-0.5"><Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" /> <span>{kidStats.streak} j</span></p>
                    </div>
                    <div>
                      <p className="text-white/40">Quiz faits</p>
                      <p className="text-white mt-0.5">{kidStats.completedQuizzesCount}</p>
                    </div>
                    <div>
                      <p className="text-white/40">XP du niveau</p>
                      <p className="text-emerald-400 mt-0.5">{kidStats.xp} XP</p>
                    </div>
                  </div>

                  {/* Competencies Progress details */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">📊 Détail des compétences (Matières) :</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] max-h-[160px] overflow-y-auto pr-1">
                      {Object.keys(subjectCategories).map(subj => {
                        const subProgress = getChildSubjectProgress(subj as AcademySubject);
                        return (
                          <div key={subj} className="bg-white/3 p-2 rounded-xl flex items-center justify-between border border-white/5">
                            <span className="text-white/80 font-bold truncate max-w-[90px]">{subj}</span>
                            <span className="font-extrabold text-[#00D26A]">{subProgress}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weekly Evaluations scores list */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">📝 Notes aux Évaluations Hebdomadaires :</span>
                    {evalsList.length === 0 ? (
                      <p className="text-[10px] text-white/30 italic">Aucune évaluation réalisée pour le moment.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {evalsList.map(ev => (
                          <div key={ev.id} className="flex justify-between items-center bg-white/3 px-3 py-2 rounded-xl text-[10px]">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-white/60">{ev.date}</span>
                              <span className="text-[8px] text-white/30 block truncate max-w-[180px]">{ev.subjects.join(', ')}</span>
                            </div>
                            <span className="font-extrabold text-[#FFB020]">{ev.score} / {ev.max}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
          {selectedSubject === null && (
            <div className="space-y-3">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Matières disponibles :</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'Mathématiques', label: '🧮 Mathématiques' },
                  { id: 'Français', label: '✍️ Français' },
                  { id: 'Histoire', label: '🏺 Histoire' },
                  { id: 'Géographie', label: '🗺️ Géographie' },
                  { id: 'Sciences', label: '🧬 Sciences' },
                  { id: 'SVT', label: '🌿 SVT' },
                  { id: 'Physique-Chimie', label: '🧪 Physique-Chimie' },
                  { id: 'Anglais', label: '🇬🇧 Anglais' },
                  { id: 'Langues', label: '🗣️ Langues' },
                  { id: 'Technologie', label: '💻 Technologie' },
                  { id: 'Culture générale', label: '💡 Culture générale' },
                  { id: 'EMC', label: '🗳️ EMC' },
                  { id: 'Logique', label: '🧩 Logique' },
                  { id: 'Programmation', label: '🐍 Programmation' },
                  { id: 'Orientation', label: '🎯 Orientation' }
                ].map(cat => {
                  const progress = getSubjectProgress(cat.id as AcademySubject);
                  const studentCycle = getCycleForLevel(studentProfile.level);
                  const count = staticAcademyLessons.filter(l => l.matiere === cat.id && l.cycles.includes(studentCycle)).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedSubject(cat.id as AcademySubject);
                        setSelectedLesson(null);
                        setSelectedTable(null);
                      }}
                      className="p-4 rounded-3xl bg-[#112240] border border-white/8 hover:bg-[#1b2f54] text-left transition flex items-center justify-between cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform">
                          {cat.id === 'Mathématiques' ? '🧮' :
                           cat.id === 'Français' ? '✍️' :
                           cat.id === 'Histoire' ? '🏺' :
                           cat.id === 'Géographie' ? '🗺️' :
                           cat.id === 'Sciences' ? '🧬' :
                           cat.id === 'SVT' ? '🌿' :
                           cat.id === 'Physique-Chimie' ? '🧪' :
                           cat.id === 'Anglais' ? '🇬🇧' :
                           cat.id === 'Langues' ? '🗣️' :
                           cat.id === 'Technologie' ? '💻' :
                           cat.id === 'Culture générale' ? '💡' :
                           cat.id === 'EMC' ? '🗳️' :
                           cat.id === 'Logique' ? '🧩' :
                           cat.id === 'Programmation' ? '🐍' : '🎯'}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">{cat.id}</h4>
                          <p className="text-[9px] text-white/40 font-extrabold uppercase mt-0.5">{count} chapitres</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-[#6C5CFF]">{progress}%</span>
                          <div className="w-14 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mt-0.5">
                            <div className="h-full bg-[#6C5CFF]" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subject Detailed Area with Cycle Grouping Accordions */}
          {selectedSubject !== null && !selectedLesson && (
            <div className="space-y-6 animate-fadeIn">
              {/* Back Bar */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSelectedSubject(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Matières</span>
                </button>
                <span className="text-[10px] font-black text-[#6C5CFF] bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 px-3 py-1 rounded-full uppercase">
                  {selectedSubject}
                </span>
              </div>

              {/* Mode switch */}
              <div className="bg-[#112240] p-1.5 rounded-2xl border border-white/5 grid grid-cols-2 gap-1.5 max-w-xs mx-auto shadow-inner">
                <button
                  onClick={() => setLearningMode('guided')}
                  className={`py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    learningMode === 'guided'
                      ? 'bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white shadow-md'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  🛣️ Parcours Guidé
                </button>
                <button
                  onClick={() => setLearningMode('library')}
                  className={`py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    learningMode === 'library'
                      ? 'bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white shadow-md'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  📚 Bibliothèque
                </button>
              </div>

              {learningMode === 'library' && (
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => setShowBasics(prev => !prev)}
                    className={`px-4 py-2 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center space-x-2 ${
                      showBasics
                        ? 'bg-[#6C5CFF] border-[#6C5CFF] text-white shadow-md'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>💡 Réviser les bases</span>
                    <span className="text-[10px] opacity-70">({showBasics ? 'Activé' : 'Désactivé'})</span>
                  </button>
                </div>
              )}

              {/* Cycles List Accordion */}
              <div className="space-y-3">
                {['Cycle 2', 'Cycle 3', 'Cycle 4', 'Lycée'].map(cycle => {
                  const lessons = staticAcademyLessons.filter(l => l.matiere === selectedSubject && l.cycles.includes(cycle as any));
                  if (lessons.length === 0) return null;

                  const studentCycle = getCycleForLevel(studentProfile.level);
                  const isUserCycle = studentCycle === cycle;

                  // Filter cycles based on learningMode and showBasics
                  if (learningMode === 'guided') {
                    if (cycle !== studentCycle) return null;
                  } else {
                    const cycleOrder = ['Cycle 2', 'Cycle 3', 'Cycle 4', 'Lycée'];
                    const studentCycleIndex = cycleOrder.indexOf(studentCycle);
                    const currentCycleIndex = cycleOrder.indexOf(cycle);
                    if (currentCycleIndex < studentCycleIndex && !showBasics) {
                      return null;
                    }
                  }

                  return (
                    <div key={cycle} className="glass-panel border border-white/5 rounded-3xl overflow-hidden bg-[#112240]/45">
                      {/* Header toggle */}
                      <button
                        onClick={() => setExpandedCycles(prev => ({ ...prev, [cycle]: !prev[cycle] }))}
                        className="w-full p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/3 transition cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-black text-white">{cycle}</h4>
                          {isUserCycle && (
                            <span className="text-[8px] bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20 px-2 py-0.5 rounded-full font-black uppercase">Recommandé</span>
                          )}
                        </div>
                        <span className="text-xs text-white/40 font-bold">{lessons.length} cours</span>
                      </button>

                      {/* Expanded lessons list */}
                      {expandedCycles[cycle] && (
                        <div className="p-3 divide-y divide-white/5">
                          {lessons.map((les) => {
                            const progressPct = getChapterProgressPercent(les.id);
                            const isUnlocked = true; // Toujours débloqué pour une exploration libre

                            return (
                              <button
                                key={les.id}
                                disabled={!isUnlocked}
                                onClick={() => {
                                  setSelectedLesson(les);
                                  setActiveStepTab(0);
                                }}
                                className={`w-full py-3.5 px-2 flex justify-between items-center text-left transition ${
                                  isUnlocked ? 'hover:bg-white/5 opacity-100 cursor-pointer' : 'opacity-35 cursor-not-allowed'
                                }`}
                              >
                                <div className="space-y-1">
                                  <h5 className="text-[11px] font-black text-white">{les.title}</h5>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[8px] font-bold text-white/40 uppercase">{les.category}</span>
                                    {isUnlocked && (
                                      <span className="text-[9px] font-black text-[#00D26A]">{progressPct}% complet</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {isUnlocked ? (
                                    progressPct === 100 ? (
                                      <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 flex items-center justify-center text-[9px] text-[#9E94FF] font-black">
                                        ▶
                                      </div>
                                    )
                                  ) : (
                                    <span className="text-xs">🔒</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chapter step view */}
          {selectedLesson && (
            <div className="space-y-6 animate-fadeIn">
              {/* Back Bar */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    setSelectedLesson(null);
                    setActiveGame(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Chapitres</span>
                </button>
                <span className="text-[9px] font-black text-[#9E94FF] bg-[#6C5CFF]/10 px-3 py-1 rounded-full uppercase">
                  {selectedLesson.title}
                </span>
              </div>

              {/* 6-step tabs scrollable indicator */}
              <div className="flex space-x-1 overflow-x-auto pb-1.5 scrollbar-thin">
                {[
                  { label: '📖 Leçon', idx: 0, field: 'read' },
                  { label: '✏️ Exercices', idx: 1, field: 'exercises' },
                  { label: '🎮 Mini-Jeu', idx: 2, field: 'game' },
                  { label: '⚡ Flash', idx: 3, field: 'flash' },
                  { label: '🏆 Défi', idx: 4, field: 'challenge' },
                  { label: '⭐ Badge', idx: 5, field: null }
                ].map((step) => {
                  const currentProgress = lessonProgress[selectedLesson.id] || { read: false, exercises: false, game: false, flash: false, challenge: false };
                  const isCurrent = activeStepTab === step.idx;
                  const isDone = step.field ? (currentProgress as any)[step.field] : getChapterProgressPercent(selectedLesson.id) === 100;
                  
                  let isLocked = false;
                  if (learningMode === 'guided') {
                    if (step.idx === 1 && !currentProgress.read) isLocked = true;
                    if (step.idx === 2 && !currentProgress.exercises) isLocked = true;
                    if (step.idx === 3 && !currentProgress.game) isLocked = true;
                    if (step.idx === 4 && !currentProgress.flash) isLocked = true;
                    if (step.idx === 5 && getChapterProgressPercent(selectedLesson.id) < 100) isLocked = true;
                  }

                  const btnStyle = isCurrent
                    ? "bg-[#6C5CFF]/25 border-[#6C5CFF]/40 text-[#9E94FF] font-black"
                    : isDone
                      ? "text-emerald-400 font-bold border-transparent"
                      : isLocked
                        ? "text-white/10 cursor-not-allowed opacity-35 border-transparent"
                        : "text-white/60 font-semibold border-transparent";

                  return (
                    <button
                      key={step.idx}
                      disabled={isLocked}
                      onClick={() => setActiveStepTab(step.idx)}
                      className={`px-3 py-1.5 rounded-xl border text-[9px] whitespace-nowrap transition cursor-pointer flex items-center space-x-1 shrink-0 ${btnStyle}`}
                    >
                      <span>{step.label}</span>
                      {isDone && <span className="text-[8px] text-emerald-400">✓</span>}
                      {isLocked && <span className="text-[8px]">🔒</span>}
                    </button>
                  );
                })}
              </div>

              {/* Step Content */}
              {activeStepTab === 0 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Définition</span>
                      <p className="text-xs text-white leading-relaxed font-semibold mt-1">
                        {selectedLesson.definition}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-[#6C5CFF] uppercase tracking-widest block">Explication Complète</span>
                      <p className="text-xs text-white/80 leading-relaxed font-medium mt-1">
                        {selectedLesson.explication}
                      </p>
                    </div>

                    {selectedLesson.schemas && selectedLesson.schemas.length > 0 && (
                      <div className="bg-black/30 p-3 rounded-2xl border border-white/5 font-mono text-[9px] text-[#00D26A] whitespace-pre overflow-x-auto">
                        {selectedLesson.schemas.join('\n')}
                      </div>
                    )}

                    <div className="border-t border-white/5 pt-3">
                      <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-widest block">Méthode à suivre</span>
                      <p className="text-xs text-white/80 leading-relaxed font-medium mt-1 whitespace-pre-line">
                        {selectedLesson.methode}
                      </p>
                    </div>

                    <div className="p-3.5 bg-rose-500/5 border border-rose-500/15 rounded-2xl space-y-1">
                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider block">⚠️ Pièges fréquents :</span>
                      <p className="text-xs text-white/80 font-medium leading-relaxed">
                        {selectedLesson.pieges}
                      </p>
                    </div>

                    {!(lessonProgress[selectedLesson.id]?.read) ? (
                      <button
                        onClick={() => {
                          updateProgressField(selectedLesson.id, 'read', true);
                          setStats(prev => ({ ...prev, xp: prev.xp + 10 }));
                          alert("📖 Leçon lue ! Tu gagnes +10 XP. Place aux exercices ! ✏️");
                          setActiveStepTab(1);
                        }}
                        className="w-full py-3 bg-[#00D26A] text-[#07111F] font-black text-xs rounded-2xl shadow-md hover:bg-[#00FF87] transition flex items-center justify-center space-x-2 cursor-pointer animate-pulse"
                      >
                        <span>J'ai compris le cours ! (+10 XP) 👍</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveStepTab(1)}
                        className="w-full py-3 bg-white/5 border border-white/10 text-white font-black text-xs rounded-2xl hover:bg-white/10 transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>Continuer vers les Exercices ✏️</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeStepTab === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                    <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                      <span className="text-xl">✏️</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 2 : Exercices d'entraînement</h4>
                    </div>
                    <p className="text-xs text-white/75 leading-relaxed font-semibold">
                      Entraîne-toi avec 5 questions interactives. Obtiens au moins 4/5 pour débloquer la suite.
                    </p>
                    <button
                      onClick={() => startTeenExercises(selectedLesson)}
                      className="w-full py-3.5 bg-[#6C5CFF] text-white font-black text-xs rounded-2xl shadow-md hover:bg-[#5849E0] transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Lancer les Exercices ✏️</span>
                    </button>
                  </div>
                </div>
              )}

              {activeStepTab === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                    <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                      <span className="text-xl">🎮</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 3 : Le Mini-Jeu Memory</h4>
                    </div>
                    <p className="text-xs text-white/75 leading-relaxed font-semibold">
                      Associe les concepts clés de cette leçon le plus vite possible !
                    </p>

                    {activeGame ? (
                      <div className="grid grid-cols-4 gap-2 pt-2 animate-scaleIn">
                        {memoryCards.map(card => (
                          <button
                            key={card.id}
                            onClick={() => handleCardClick(card.id)}
                            className={`aspect-square rounded-xl text-[8px] font-black border p-1 transition-all flex items-center justify-center ${
                              card.isMatched 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 opacity-60' 
                                : card.isFlipped 
                                ? 'bg-[#6C5CFF]/25 border-[#6C5CFF]/50 text-[#9E94FF]' 
                                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                            }`}
                          >
                            {(card.isFlipped || card.isMatched) ? card.content : '❓'}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => startMemoryGame(selectedLesson)}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-[#07111F] font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>Lancer le Jeu Memory 🎮</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeStepTab === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                    <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                      <span className="text-xl">⚡</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 4 : Le Flash Quiz</h4>
                    </div>
                    <p className="text-xs text-white/75 leading-relaxed font-semibold">
                      5 questions rapides. Il te faut 4/5 pour pouvoir relever le Défi Final.
                    </p>
                    <button
                      onClick={() => startTeenFlash(selectedLesson)}
                      className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-[#00D26A] text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Lancer le Flash Quiz ⚡</span>
                    </button>
                  </div>
                </div>
              )}

              {activeStepTab === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                    <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                      <span className="text-xl">🏆</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 5 : Le Défi Chronométré</h4>
                    </div>
                    <p className="text-xs text-white/75 leading-relaxed font-semibold">
                      Réponds à au moins 4 questions en moins de 45 secondes pour débloquer ton Badge de chapitre !
                    </p>
                    <button
                      onClick={() => startTeenChallenge(selectedLesson)}
                      className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Lancer le Défi (45s) 🏆</span>
                    </button>
                  </div>
                </div>
              )}

              {activeStepTab === 5 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-gradient-to-br from-[#FFB020]/15 to-[#FF8C00]/10 border-2 border-[#FFB020]/30 rounded-[32px] p-6 text-center space-y-5 relative overflow-hidden">
                    <span className="text-4xl animate-bounce block">🏆</span>
                    <h3 className="text-base font-black text-white">Leçon 100% Maîtrisée !</h3>
                    <p className="text-xs text-white/75 font-semibold">
                      Tu as validé toutes les compétences de ce chapitre. Voici tes récompenses :
                    </p>

                    <div className="flex items-center justify-center space-x-4">
                      <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-center">
                        <span className="text-[8px] text-white/40 font-black uppercase block">XP gagnés</span>
                        <span className="text-sm font-black text-emerald-400">+50 XP</span>
                      </div>
                      <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-center">
                        <span className="text-[8px] text-white/40 font-black uppercase block">Étoiles</span>
                        <span className="text-sm font-black text-yellow-400 flex items-center justify-center space-x-1">
                          <span>+5</span> <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        </span>
                      </div>
                      <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-center">
                        <span className="text-[8px] text-white/40 font-black uppercase block">Argent de poche</span>
                        <span className="text-sm font-black text-indigo-300">+0.50€ 💶</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-[9px] text-white/50 leading-relaxed font-bold">
                      💡 Une demande de validation d'argent de poche a été transmise aux parents.
                    </div>

                    <button
                      onClick={() => {
                        setSelectedLesson(null);
                        setActiveGame(false);
                      }}
                      className="w-full py-3 bg-[#6C5CFF] hover:bg-[#5849E0] text-white font-black text-xs rounded-2xl shadow-md transition cursor-pointer"
                    >
                      Retourner au Programme
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'revisions' && !activeQuiz && (
        <div className="space-y-6 text-left animate-fadeIn">
          {/* Weekly Evaluation Launcher & History */}
          <div className="space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">📝 Évaluation Hebdomadaire Ado :</span>
            <div className="bg-gradient-to-r from-[#6C5CFF]/15 to-[#E040FB]/5 border border-[#6C5CFF]/20 rounded-[32px] p-5 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white">Bilan Hebdomadaire (Note / 20)</h4>
                <p className="text-[11px] text-white/60 leading-snug">
                  Lance un test de 10 questions mélangées sur les matières que tu as travaillées cette semaine. Ta note sera enregistrée officiellement et visible par tes parents.
                </p>
              </div>

              <button
                onClick={launchWeeklyEvaluation}
                className="w-full py-3 bg-[#6C5CFF] text-white font-extrabold text-xs rounded-2xl shadow-md hover:bg-[#5849E0] transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Démarrer mon Évaluation Hebdomadaire 📝</span>
              </button>

              {/* History list */}
              {weeklyEvals.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Historique des notes :</span>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {weeklyEvals.map(ev => (
                      <div key={ev.id} className="flex justify-between items-center bg-white/3 px-3 py-2 rounded-xl text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-white">{ev.date}</span>
                          <span className="text-[8px] text-white/40 block truncate max-w-[180px]">{ev.subjects.join(', ')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#FFB020]">{ev.score} / {ev.max}</span>
                          <span className="text-[8px] text-emerald-400 block">+ {ev.xpBonus} XP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

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
                  {visibleSchoolTasks.filter(t => t.assignedMemberId === activeMemberId && t.done).length} sur {visibleSchoolTasks.filter(t => t.assignedMemberId === activeMemberId).length} devoirs faits !
                </h3>
              </div>
              <span className="text-3xl">📝</span>
            </div>
            
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] rounded-full transition-all" 
                style={{ 
                  width: `${visibleSchoolTasks.filter(t => t.assignedMemberId === activeMemberId).length > 0
                    ? (visibleSchoolTasks.filter(t => t.assignedMemberId === activeMemberId && t.done).length / visibleSchoolTasks.filter(t => t.assignedMemberId === activeMemberId).length) * 100
                    : 100}%` 
                }}
              />
            </div>
          </div>

          {/* Agenda Grid */}
          <div className="grid grid-cols-1 gap-4">
            
            {/* Overdue (Retards) or Priority Tasks */}
            {(() => {
              const myTasks = visibleSchoolTasks.filter(t => t.assignedMemberId === activeMemberId);
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
                  const myTasks = visibleSchoolTasks.filter(t => t.assignedMemberId === activeMemberId);
                  if (myTasks.length === 0) {
                    return (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-5 text-center">
                        <p className="text-xs font-bold text-white/55">Aucun devoir programmé.</p>
                        <p className="mt-1 text-[10px] text-white/35">Les devoirs ajoutés par un parent apparaîtront ici.</p>
                      </div>
                    );
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
                  {(() => {
                    const studentCycle = getCycleForLevel(studentProfile.level);
                    const recommended = staticAcademyLessons.filter(les => les.cycles.includes(studentCycle)).slice(0, 4);
                    const list = recommended.length > 0 ? recommended : staticAcademyLessons.slice(0, 4);
                    return list.map(les => (
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
                    ));
                  })()}
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
                      let memberXp: number;
                      if (m.id === activeMemberId) {
                        memberXp = stats.xp + (stats.level - 1) * 300;
                      } else if (m.role?.toLowerCase().includes('ado')) {
                        memberXp = 450;
                      } else if (m.role?.toLowerCase().includes('enfant')) {
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
                      { id: activeMemberId, name: activeMember?.name || 'Moi', photoUrl: activeMember?.photoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80', xp: stats.xp + (stats.level - 1) * 300 }
                    ];

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
