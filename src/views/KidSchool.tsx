import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  GraduationCap, 
  Calendar, 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  MessageSquare, 
  Award, 
  Clock, 
  ArrowRight,
  Plus,
  Send,
  Loader2,
  Trash2,
  Flame,
  Star,
  ChevronRight,
  Smile,
  Trophy,
  Gamepad2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UserCheck,
  RotateCcw,
  BookOpenCheck,
  Check
} from 'lucide-react';
import type { Member, SchoolTask, FamilyEvent } from '../types';
import { staticAcademyQuestions, staticAcademyLessons } from '../data/academyData';
import type { AcademyQuestion, Lesson, AcademySubject } from '../data/academyData';
import { generateProceduralQuestion, generateQuestionForLesson } from '../utils/academyGenerator';

export interface KidSchoolProps {
  member: Member;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  grades?: any[];
  setGrades?: React.Dispatch<React.SetStateAction<any[]>>;
  schedule?: any[];
  setSchedule?: React.Dispatch<React.SetStateAction<any[]>>;
  events?: FamilyEvent[];
  members?: any[];
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  onBack: () => void;
  dishes?: any;
}

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
  // 1. Navigation & Basic State
  const [activeSubTab, setActiveSubTab] = useState<'academie' | 'devoirs' | 'eval_weekly' | 'tuteur'>('academie');
  const [selectedSubject, setSelectedSubject] = useState<AcademySubject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [learningMode, setLearningMode] = useState<'guided' | 'library'>('guided');
  const [activeStepTab, setActiveStepTab] = useState<number>(0);
  
  // Modals
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>({
    'Cycle 2': true,
    'Cycle 3': false,
    'Cycle 4': false,
    'Lycée': false
  });

  // 2. Student settings: level and country
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => {
    const key = `academy_student_profile_${member.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    // Fallback: estimate from age
    let estimatedLevel: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée' = 'CE2';
    const parsedAge = parseInt(member.age, 10);
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

  // Save student profile
  useEffect(() => {
    localStorage.setItem(`academy_student_profile_${member.id}`, JSON.stringify(studentProfile));
    // Also auto-expand the cycle matching the student's level
    const cycle = getCycleForLevel(studentProfile.level);
    setExpandedCycles({
      'Cycle 2': cycle === 'Cycle 2',
      'Cycle 3': cycle === 'Cycle 3',
      'Cycle 4': cycle === 'Cycle 4',
      'Lycée': cycle === 'Lycée'
    });
  }, [studentProfile, member.id]);

  // 3. Lesson progression: Record of chapter ID to ChapterProgress
  const [lessonProgress, setLessonProgress] = useState<Record<string, ChapterProgress>>(() => {
    const key = `academy_lesson_progress_${member.id}`;
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
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`academy_lesson_progress_${member.id}`, JSON.stringify(lessonProgress));
  }, [lessonProgress, member.id]);

  // Worked chapters tracking
  const [workedChapters, setWorkedChapters] = useState<string[]>(() => {
    const key = `academy_worked_chapters_${member.id}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  });

  const markChapterAsWorked = (id: string) => {
    if (!workedChapters.includes(id)) {
      const updated = [...workedChapters, id];
      setWorkedChapters(updated);
      localStorage.setItem(`academy_worked_chapters_${member.id}`, JSON.stringify(updated));
    }
  };

  // Weekly Evaluations History
  const [weeklyEvals, setWeeklyEvals] = useState<WeeklyEvalItem[]>(() => {
    const key = `academy_weekly_evals_${member.id}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(`academy_weekly_evals_${member.id}`, JSON.stringify(weeklyEvals));
  }, [weeklyEvals, member.id]);

  // 4. Student Stats State
  const [stats, setStats] = useState<{
    xp: number;
    stars: number;
    level: number;
    streak: number;
    lastActiveDate: string;
    completedQuizzesCount: number;
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
      completedQuizzesCount: 0
    };
  });

  useEffect(() => {
    localStorage.setItem(`academy_stats_${member.id}`, JSON.stringify(stats));
  }, [stats, member.id]);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<{
    type: 'kid_exercises' | 'kid_flash' | 'kid_challenge' | 'kid_evaluation' | 'kid_weekly';
    questions: AcademyQuestion[];
    currentIndex: number;
    score: number;
    answers: boolean[];
    selectedOption: string | null;
    showCorrection: boolean;
    xpEarned: number;
    starsEarned: number;
    showHint: boolean;
    timerRemaining?: number; // Timed challenges
    challengeCount?: number; // TIMED: correct answers
  } | null>(null);

  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [userInput, setUserInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; action?: { label: string; onClick: () => void } }>>([
    { sender: 'ai', text: `Salut ! Je suis ton Coach / Tuteur Scolaire personnel. 🤖\nJe connais toutes les fiches de cours de la bibliothèque sur le bout des doigts.\nDe quoi veux-tu qu'on parle ? Pose-moi une question sur le corps humain, les fractions, le Wolof, ou les pharaons !` }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Memory Game State
  const [memoryCards, setMemoryCards] = useState<Array<{ id: number; content: string; matchId: number; isFlipped: boolean; isMatched: boolean }>>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [activeGame, setActiveGame] = useState<boolean>(false);

  // Helper: Shuffle Array
  const shuffle = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Challenge Timer loop
  useEffect(() => {
    if (activeQuiz && activeQuiz.timerRemaining !== undefined) {
      if (activeQuiz.timerRemaining > 0) {
        timerRef.current = setTimeout(() => {
          setActiveQuiz(prev => {
            if (!prev) return null;
            return {
              ...prev,
              timerRemaining: (prev.timerRemaining || 0) - 1
            };
          });
        }, 1000);
      } else {
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
      }
    } else {
      alert(`😢 Défi échoué. Tu as donné ${finalCount} bonnes réponses, mais il en faut au moins 4. Entraîne-toi et réessaye !`);
    }
    setActiveQuiz(null);
  };

  // Helper to retrieve cycles
  const getCycleForLevel = (lvl: string): 'Cycle 2' | 'Cycle 3' | 'Cycle 4' | 'Lycée' => {
    if (['CP', 'CE1', 'CE2'].includes(lvl)) return 'Cycle 2';
    if (['CM1', 'CM2', '6e'].includes(lvl)) return 'Cycle 3';
    if (['5e', '4e', '3e'].includes(lvl)) return 'Cycle 4';
    return 'Lycée';
  };

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

  // Calculate subject progress
  const getSubjectProgress = (subj: AcademySubject): number => {
    const lessons = staticAcademyLessons.filter(l => l.matiere === subj);
    if (lessons.length === 0) return 0;
    const total = lessons.reduce((acc, curr) => acc + getChapterProgressPercent(curr.id), 0);
    return Math.round(total / lessons.length);
  };

  // Calculate global progress
  const getGlobalProgress = (): number => {
    const subjects = Object.keys(subjectCategories) as AcademySubject[];
    const total = subjects.reduce((acc, curr) => acc + getSubjectProgress(curr), 0);
    return Math.round(total / subjects.length);
  };

  // Subtab lists
  const myTasks = schoolTasks.filter(t => t.assignedMemberId === member.id);
  const isEvaluation = (task: SchoolTask) => {
    const titleLower = task.title.toLowerCase();
    const subjectLower = task.subject.toLowerCase();
    return titleLower.includes('éval') || titleLower.includes('eval') || titleLower.includes('contrôle') || titleLower.includes('controle') || titleLower.includes('test') || titleLower.includes('examen') || subjectLower.includes('éval') || subjectLower.includes('contrôle');
  };
  const myHomeworks = myTasks.filter(t => !isEvaluation(t));

  // Subject Categories Map (CP-Lycée, Kid accessible)
  const subjectCategories: Record<string, string[]> = {
    Mathématiques: ["Numération", "Additions", "Soustractions", "Multiplications", "Divisions", "Fractions", "Décimaux", "Géométrie", "Aires", "Volumes", "Pourcentages", "Proportionnalité", "Équations", "Fonctions", "Statistiques", "Probabilités", "Théorème de Pythagore", "Théorème de Thalès"],
    Français: ["Lecture", "Compréhension", "Orthographe", "Grammaire", "Nature des mots", "Analyse grammaticale", "Conjugaison", "Rédaction", "Dictées"],
    Histoire: ["Préhistoire", "Antiquité", "Égypte", "Rome", "Moyen Âge", "Renaissance", "Révolution française", "Première Guerre mondiale", "Seconde Guerre mondiale", "Monde contemporain"],
    Géographie: ["Continents et Océans", "Pays et Capitales", "Reliefs et Climats", "Populations du monde", "Cartographie", "Environnement"],
    Sciences: ["Corps humain", "Animaux", "Plantes", "Énergie", "Électricité", "Espace", "Planètes", "Génétique", "Chimie", "Physique"],
    SVT: ["ADN et Génétique", "Écosystèmes", "Corps humain et santé"],
    "Physique-Chimie": ["Circuits électriques", "Matière et mélanges", "Forces et mouvements"],
    Anglais: ["Les couleurs", "Les nombres", "Les salutations", "Les animals", "Verbes irréguliers", "Vocabulaire du quotidien"],
    Langues: ["Wolof", "Espagnol de base", "Allemand de base"],
    Technologie: ["Fonctionnement de l'ordinateur", "Internet et le Web", "Algorithmes simples"],
    "Culture générale": ["Familles d'instruments", "Monuments célèbres", "Grandes découvertes"],
    EMC: ["Valeurs de la République", "Droits de l'enfant", "La citoyenneté"],
    Logique: ["Énigmes logiques", "Suites de nombres", "Formes et motifs"],
    Programmation: ["Découverte de Python", "Le binaire", "Créer sa première page HTML"],
    Orientation: ["Les métiers d'avenir", "Choisir son parcours scolaire", "CV et lettre de motivation"]
  };

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
    } else if (lesson.id === 'les_cp_lan_colors') {
      pairs = [
        { content: "Red", matchContent: "Rouge" },
        { content: "Blue", matchContent: "Bleu" },
        { content: "Yellow", matchContent: "Jaune" },
        { content: "Green", matchContent: "Vert" }
      ];
    } else {
      pairs = [
        { content: lesson.title, matchContent: "Titre" },
        { content: "Définition", matchContent: lesson.definition.substring(0, 15) + "..." },
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

  // Launch Exercise session
  const startKidExercises = (lesson: Lesson, qCount = 5) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < qCount; i++) {
      questions.push(generateQuestionForLesson(lesson.id, studentProfile.level));
    }
    setActiveQuiz({
      type: 'kid_exercises',
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

  // Launch Flash Quiz
  const startKidFlash = (lesson: Lesson) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < 5; i++) {
      questions.push(generateQuestionForLesson(lesson.id, studentProfile.level));
    }
    setActiveQuiz({
      type: 'kid_flash',
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

  // Launch Challenge (Timed)
  const startKidChallenge = (lesson: Lesson) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < 20; i++) {
      questions.push(generateQuestionForLesson(lesson.id, studentProfile.level));
    }
    setActiveQuiz({
      type: 'kid_challenge',
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 20,
      starsEarned: 3,
      showHint: false,
      timerRemaining: 45, // 45 seconds countdown
      challengeCount: 0
    });
  };

  // Launch Evaluation
  const startKidEvaluation = (lesson: Lesson) => {
    const questions: AcademyQuestion[] = [];
    for (let i = 0; i < 10; i++) {
      questions.push(generateQuestionForLesson(lesson.id, studentProfile.level));
    }
    setActiveQuiz({
      type: 'kid_evaluation',
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
      selectedOption: null,
      showCorrection: false,
      xpEarned: 50,
      starsEarned: 5,
      showHint: false
    });
  };

  // Launch Weekly Evaluation
  const startWeeklyEvaluation = () => {
    const questions: AcademyQuestion[] = [];
    const chaptersToUse = workedChapters.length > 0 ? workedChapters : staticAcademyLessons.map(l => l.id);
    
    for (let i = 0; i < 10; i++) {
      const randLessonId = chaptersToUse[Math.floor(Math.random() * chaptersToUse.length)];
      questions.push(generateQuestionForLesson(randLessonId, studentProfile.level));
    }

    setActiveQuiz({
      type: 'kid_weekly',
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

  // Handle Answer submission
  const handleAnswerSubmit = (option: string) => {
    if (!activeQuiz || activeQuiz.showCorrection) return;

    const currentQuestion = activeQuiz.questions[activeQuiz.currentIndex];
    const isCorrect = option.toLowerCase() === currentQuestion.reponse.toLowerCase();

    setActiveQuiz(prev => {
      if (!prev) return null;
      const updatedAnswers = [...prev.answers, isCorrect];
      const updatedScore = isCorrect ? prev.score + 1 : prev.score;
      const updatedChallengeCount = isCorrect && prev.type === 'kid_challenge' ? (prev.challengeCount || 0) + 1 : (prev.challengeCount || 0);
      
      return {
        ...prev,
        score: updatedScore,
        answers: updatedAnswers,
        selectedOption: option,
        showCorrection: true,
        challengeCount: updatedChallengeCount
      };
    });
  };

  // Next Question
  const handleNextQuestion = () => {
    if (!activeQuiz) return;
    
    if (activeQuiz.currentIndex + 1 < activeQuiz.questions.length) {
      setActiveQuiz(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
          selectedOption: null,
          showCorrection: false,
          showHint: false
        };
      });
    } else {
      // Finished Quiz!
      const cleanScore = activeQuiz.score;
      const totalXp = activeQuiz.xpEarned;
      const totalStars = activeQuiz.starsEarned;

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
          const exercisesPassed = cleanScore >= 4; // 80%
          if (exercisesPassed) {
            updateProgressField(selectedLesson.id, 'exercises', true);
            setActiveStepTab(2); // Jump to game!
            alert(`🎉 Entraînement validé ! Score : ${cleanScore}/5.\nLe Mini-Jeu est maintenant débloqué ! 🎮`);
          } else {
            alert(`😢 Entraînement non validé (Score : ${cleanScore}/5). Tu as besoin d'au moins 4/5. Relis la leçon et réessaye !`);
          }
        }
      } else if (activeQuiz.type === 'kid_flash') {
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
      } else if (activeQuiz.type === 'kid_evaluation') {
        if (selectedLesson) {
          const evalPassed = cleanScore >= 8; // 80%
          if (evalPassed) {
            // Validate lessons badge step
            updateProgressField(selectedLesson.id, 'read', true); // ensure read is done
            updateProgressField(selectedLesson.id, 'exercises', true);
            updateProgressField(selectedLesson.id, 'game', true);
            updateProgressField(selectedLesson.id, 'flash', true);
            updateProgressField(selectedLesson.id, 'challenge', true);
            
            // Advance to badge screen
            setActiveStepTab(5); // index of Badge screen is 5 in the new 6-steps tab
            
            // Submit pocket money validation to parents
            const pocketMoneyTask: SchoolTask = {
              id: `pocket-${Date.now()}`,
              title: `Argent de poche : validation de la leçon "${selectedLesson.title}" pour ${member.name}`,
              subject: 'Récompense',
              difficulty: 'medium',
              assignedMemberId: member.id,
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
      } else if (activeQuiz.type === 'kid_weekly') {
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
        if (setGrades) {
          const newGradeItem = {
            id: `grade-weekly-${Date.now()}`,
            studentId: member.id,
            studentName: (member as any).displayName || member.name,
            subject: 'Académie',
            value: grade20,
            max: 20,
            coef: 1,
            examTitle: 'Évaluation Hebdomadaire',
            date: new Date().toLocaleDateString('fr-FR')
          };
          setGrades(prev => [...prev, newGradeItem]);
        }

        alert(`📝 Évaluation hebdomadaire terminée !\nNote : ${grade20}/20\nBonus remportés : +${bonusXp} XP et +${bonusStars} Étoiles ! ⭐️`);
        setActiveSubTab('academie');
      }

      setActiveQuiz(null);
    }
  };

  // Local Chatbot Coach response logic (Scans entire curriculum)
  const handleSendCoachMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setChatMessages((prev: any[]) => [...prev, { sender: 'user', text: query }]);
    setUserInput('');
    setIsTyping(true);

    setTimeout(() => {
      const cleanQuery = query.toLowerCase();
      
      // Moteur de recherche local sur la bibliothèque
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
        responseText = `J'ai trouvé une leçon complète sur **${matchedLesson.title}** (${matchedLesson.matiere}) ! 📖\n\n**Définition :** ${matchedLesson.definition}\n\n**Méthode :** ${matchedLesson.methode}\n\n**Exemple :** ${matchedLesson.exemple}\n\n💡 *Astuce du Coach (Pièges à éviter) :* ${matchedLesson.pieges}\n\nPrêt à réviser ce chapitre ? Clique sur le bouton ci-dessous !`;
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
                setActiveSubTab('academie');
              }
            }
          }
        ]);
      } else {
        responseText = `Je n'ai pas trouvé de fiche spécifique pour "${query}". 🧐\n\nPose-moi une question sur un sujet du programme comme :\n- "multiplications" ✖️\n- "fractions" 🍰\n- "corps humain" 🧠\n- "pharaons" 🏺\n- "pythagore" 🔺\n- "anglais" 🎨\n\nQuelle matière veux-tu étudier aujourd'hui ?`;
        setChatMessages((prev: any[]) => [...prev, { sender: 'ai', text: responseText }]);
      }
      setIsTyping(false);
    }, 800);
  };

  // Reset student progress
  const resetStudentProgress = () => {
    if (confirm("Es-tu sûr de vouloir réinitialiser ta progression ? Toutes tes leçons validées repasseront à 0%.")) {
      setLessonProgress({});
      setWorkedChapters([]);
      localStorage.setItem(`academy_lesson_progress_${member.id}`, JSON.stringify({}));
      localStorage.setItem(`academy_worked_chapters_${member.id}`, JSON.stringify([]));
      setStats(prev => ({ ...prev, xp: 0, stars: 0, level: 1 }));
      alert("Progression réinitialisée avec succès ! C'est parti pour apprendre ! 🚀");
      setShowProfileModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white flex flex-col font-sans pb-8 select-none">
      
      {/* 1. Header Widget */}
      <header className="p-4 bg-[#0a192f] border-b border-white/5 flex flex-col space-y-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Famille</span>
          </button>
          
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-[#07111F] px-3 py-1 rounded-full text-xs font-black shadow">
              <Star className="w-4 h-4 fill-[#07111F]" />
              <span>{stats.stars}</span>
            </div>
            <div className="flex items-center space-x-1 bg-gradient-to-r from-[#00D26A] to-[#00FF87] text-[#07111F] px-3 py-1 rounded-full text-xs font-black shadow">
              <Sparkles className="w-4 h-4" />
              <span>Niv. {stats.level}</span>
            </div>
          </div>
        </div>

        {/* Student Info Bar */}
        <div className="bg-[#112240] p-3 rounded-2xl border border-white/5 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C5CFF] to-[#4F8CFF] flex items-center justify-center text-white text-base font-black shadow-md">
              {member.name.charAt(0)}
            </div>
            <div className="text-left">
              <h3 className="text-xs font-black text-white">{member.name}</h3>
              <p className="text-[9px] text-[#00D26A] font-bold uppercase tracking-wider">
                🌍 {studentProfile.country} • 🎓 {studentProfile.level}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right hidden sm:block">
              <span className="text-[8px] text-white/40 font-black uppercase tracking-wider block">Progression</span>
              <span className="text-xs font-black text-white">{getGlobalProgress()}%</span>
            </div>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/8 text-[9px] font-black text-white/80 hover:bg-white/10 transition cursor-pointer"
            >
              ⚙️ Paramètres
            </button>
          </div>
        </div>
      </header>

      {/* Main navigation tabs */}
      <div className="px-4 py-3 bg-[#0a192f] border-b border-white/5 flex justify-between gap-1.5">
        {[
          { id: 'academie', label: '📚 Cours & Thèmes' },
          { id: 'devoirs', label: '📝 Mes devoirs' },
          { id: 'eval_weekly', label: '🎯 Éval Hebdo' },
          { id: 'tuteur', label: '💬 Mon Coach' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              setSelectedLesson(null);
            }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${
              activeSubTab === tab.id 
                ? 'bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white shadow-md' 
                : 'bg-white/3 text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2. Main Content Body */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">

        {/* ================= TAB 1: ACADEMIE ================= */}
        {activeSubTab === 'academie' && !selectedLesson && (
          <div className="space-y-6">
            
            {/* Subject Picker Screen */}
            {selectedSubject === null && (
              <div className="space-y-4">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block text-left">
                  🎯 Choisis une matière pour apprendre :
                </span>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.keys(subjectCategories).map(subj => {
                    const progress = getSubjectProgress(subj as AcademySubject);
                    return (
                      <button
                        key={subj}
                        onClick={() => setSelectedSubject(subj as AcademySubject)}
                        className="w-full p-4 rounded-3xl bg-[#112240] border border-white/8 hover:bg-[#1b2f54] text-left transition flex items-center justify-between cursor-pointer group shadow-sm active:scale-98"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform">
                            {subj === 'Mathématiques' ? '🧮' :
                             subj === 'Français' ? '✍️' :
                             subj === 'Histoire' ? '🏺' :
                             subj === 'Géographie' ? '🗺️' :
                             subj === 'Sciences' ? '🧬' :
                             subj === 'SVT' ? '🔬' :
                             subj === 'Physique-Chimie' ? '🧪' :
                             subj === 'Anglais' ? '🇬🇧' :
                             subj === 'Langues' ? '🗣️' :
                             subj === 'Technologie' ? '💻' :
                             subj === 'Culture générale' ? '💡' :
                             subj === 'EMC' ? '🇫🇷' :
                             subj === 'Logique' ? '🧩' :
                             subj === 'Programmation' ? '⚙️' :
                             subj === 'Orientation' ? '🧭' :
                             '🎓'}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white">{subj}</h4>
                            <p className="text-[9px] text-white/40 font-extrabold uppercase mt-0.5">{subjectCategories[subj].length} chapitres</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span className="text-[10px] font-black text-[#00D26A]">{progress}%</span>
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mt-0.5">
                              <div className="h-full bg-[#00D26A]" style={{ width: `${progress}%` }} />
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

            {/* Cycles and Chapters List for Selected Subject */}
            {selectedSubject !== null && (
              <div className="space-y-6">
                
                {/* Back bar */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Matières</span>
                  </button>
                  
                  <span className="text-[9px] font-black text-[#00D26A] bg-[#00D26A]/10 px-3 py-1 rounded-full uppercase">
                    {selectedSubject}
                  </span>
                </div>

                {/* Mode switch */}
                <div className="bg-[#112240] p-1.5 rounded-2xl border border-white/5 grid grid-cols-2 gap-1.5 max-w-xs mx-auto shadow-inner">
                  <button
                    onClick={() => setLearningMode('guided')}
                    className={`py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                      learningMode === 'guided'
                        ? 'bg-gradient-to-r from-[#00D26A] to-[#00FF87] text-[#07111F] shadow-md'
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

                {/* Cycles Expandable list */}
                <div className="space-y-3">
                  {['Cycle 2', 'Cycle 3', 'Cycle 4', 'Lycée'].map(cycle => {
                    const lessons = staticAcademyLessons.filter(l => l.matiere === selectedSubject && l.cycles.includes(cycle as any));
                    const isUserCycle = getCycleForLevel(studentProfile.level) === cycle;
                    
                    if (lessons.length === 0) return null;

                    return (
                      <div key={cycle} className="glass-panel border border-white/5 rounded-3xl overflow-hidden text-left bg-[#112240]/45">
                        
                        {/* Toggle header */}
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

                        {/* Lessons List inside expanded cycle */}
                        {expandedCycles[cycle] && (
                          <div className="p-3 divide-y divide-white/5">
                            {lessons.map((les, idx) => {
                              const progressPct = getChapterProgressPercent(les.id);
                              
                              // In Guided Mode, the chapter is locked if it's not the first,
                              // and the previous chapter has a progress < 40% (meaning read + exercises not completed)
                              const isFirst = idx === 0;
                              const prevLessonProgress = isFirst ? 100 : getChapterProgressPercent(lessons[idx - 1].id);
                              const isUnlocked = learningMode === 'library' || isFirst || prevLessonProgress >= 40;

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
          </div>
        )}

        {/* ================= TAB 2: DEVOIRS ================= */}
        {activeSubTab === 'devoirs' && (
          <div className="space-y-6 text-left animate-fadeIn">
            <div className="bg-[#112240] border border-white/8 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-black text-[#00D26A] uppercase tracking-wider block">Timeline devoirs</span>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    {myHomeworks.filter(t => t.done).length} sur {myHomeworks.length} devoirs faits !
                  </h3>
                </div>
                <span className="text-2xl animate-bounce">🚀</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00D26A] to-[#00FF87] rounded-full transition-all" 
                  style={{ width: `${myHomeworks.length > 0 ? (myHomeworks.filter(t => t.done).length / myHomeworks.length) * 100 : 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Liste de tes devoirs :</span>
              {myHomeworks.length === 0 ? (
                <div className="bg-[#112240] p-6 text-center text-xs text-white/30 font-extrabold rounded-3xl border border-white/5">
                  Aucun devoir programmé ! Relaxe-toi 🍦
                </div>
              ) : (
                myHomeworks.map(task => {
                  // Link logic substring
                  const matched = staticAcademyLessons.find(l => 
                    task.title.toLowerCase().includes(l.category.toLowerCase()) ||
                    task.title.toLowerCase().includes(l.title.toLowerCase())
                  );

                  return (
                    <div key={task.id} className="p-4 rounded-3xl bg-[#112240] border border-white/8 flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${task.done ? 'bg-[#00D26A]' : 'bg-red-500'}`} />
                          <h4 className="text-xs font-black text-white leading-tight">{task.title}</h4>
                        </div>
                        <p className="text-[9px] text-white/40 font-bold">Matière: {task.subject} • Rendu : {task.dueDate}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {matched && (
                          <button
                            onClick={() => {
                              setSelectedSubject(matched.matiere);
                              setSelectedLesson(matched);
                              setActiveStepTab(0);
                              setActiveSubTab('academie');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#6C5CFF]/15 text-[#9E94FF] border border-[#6C5CFF]/30 text-[9px] font-black hover:bg-[#6C5CFF]/25 cursor-pointer"
                          >
                            Réviser
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSchoolTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            task.done 
                              ? 'bg-[#00D26A]/20 border-[#00D26A]/40 text-[#00D26A]' 
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: WEEKLY EVALUATION ================= */}
        {activeSubTab === 'eval_weekly' && (
          <div className="space-y-6 text-left animate-fadeIn">
            
            {/* Intro and trigger */}
            <div className="glass-panel border-2 border-[#6C5CFF]/30 bg-[#112240]/60 p-5 rounded-[32px] text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 flex items-center justify-center mx-auto text-2xl shadow-inner">
                🎯
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white">Évaluation Hebdomadaire</h3>
                <p className="text-xs text-white/60 leading-relaxed font-semibold">
                  Obtiens un test personnalisé de 10 questions sur les chapitres que tu as étudiés récemment. Valide-le avec au moins 12/20 pour gagner de superbes bonus !
                </p>
              </div>

              <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-[9px] text-white/40 leading-normal font-bold">
                💡 Les notes obtenues sont automatiquement transmises dans le bulletin et visibles par tes parents.
              </div>

              <button
                onClick={startWeeklyEvaluation}
                className="w-full py-3.5 bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] hover:from-[#5849E0] hover:to-[#3F7CFF] text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Lancer l'Évaluation Hebdomadaire 📝</span>
              </button>
            </div>

            {/* History */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Historique de tes évaluations :</span>
              {weeklyEvals.length === 0 ? (
                <div className="bg-[#112240] p-6 text-center text-xs text-white/30 font-extrabold rounded-3xl border border-white/5">
                  Aucune évaluation passée pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {weeklyEvals.map(evalItem => (
                    <div key={evalItem.id} className="p-4 rounded-3xl bg-[#112240] border border-white/8 flex justify-between items-center shadow-sm">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white">Évaluation du {evalItem.date}</h4>
                        <p className="text-[9px] text-[#00D26A] font-extrabold uppercase">
                          Matières : {evalItem.subjects.join(', ') || 'Curriculum'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                          evalItem.score >= 16 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : evalItem.score >= 10 
                              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          {evalItem.score}/{evalItem.max}
                        </span>
                        <div className="text-[9px] text-white/30 font-bold mt-1.5 flex items-center justify-end space-x-1">
                          <span>+{evalItem.xpBonus} XP</span>
                          <span>•</span>
                          <span>+{evalItem.starsBonus} ⭐️</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: CHATBOT MON COACH ================= */}
        {activeSubTab === 'tuteur' && (
          <div className="flex flex-col h-[60vh] bg-[#112240] rounded-[32px] border border-white/8 shadow-lg overflow-hidden animate-fadeIn">
            
            {/* Chatbox Header */}
            <div className="p-4 bg-[#0a192f] border-b border-white/5 text-left flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 flex items-center justify-center text-base">
                🦾
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Mon Coach Académique</h4>
                <p className="text-[8px] text-[#00D26A] font-bold uppercase tracking-wider">Professeur local MaFamille+</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.map((msg: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`max-w-[85%] rounded-[24px] px-4 py-3 text-xs leading-relaxed text-left font-semibold ${
                    msg.sender === 'user'
                      ? 'bg-[#6C5CFF] text-white rounded-br-none'
                      : 'bg-white/5 border border-white/8 text-white/90 rounded-bl-none'
                  }`}>
                    <div className="whitespace-pre-line">{msg.text}</div>
                    
                    {msg.action && (
                      <button
                        onClick={msg.action.onClick}
                        className="mt-3 w-full py-2 bg-gradient-to-r from-[#00D26A] to-[#00FF87] text-[#07111F] font-black text-[10px] rounded-xl shadow-md cursor-pointer transition active:scale-95"
                      >
                        {msg.action.label}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/8 text-white/40 rounded-3xl rounded-bl-none px-4 py-2 text-xs flex items-center space-x-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Le Coach écrit...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendCoachMessage} className="p-3 bg-[#0a192f] border-t border-white/5 flex gap-2">
              <input
                type="text"
                placeholder="Pose-moi une question (ex: les fractions, Pythagore...)"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-1 bg-white/5 border border-white/8 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF] placeholder:text-white/30"
              />
              <button 
                type="submit"
                className="p-2.5 rounded-2xl bg-[#6C5CFF] text-white hover:bg-[#5849E0] transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ================= CHAPTER STEPS VIEW OVERLAY ================= */}
        {selectedLesson && !activeGame && !activeQuiz && (
          <div className="space-y-6 text-left animate-fadeIn">
            
            {/* Back action */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedLesson(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour</span>
              </button>
              
              <span className="text-[9px] font-black text-[#00D26A] bg-[#00D26A]/10 px-3 py-1 rounded-full uppercase">
                {selectedLesson.category}
              </span>
            </div>

            <div className="text-center space-y-3 py-4">
              <span className="text-[10px] font-black text-[#6C5CFF] uppercase tracking-widest block">Chapitre actif</span>
              <h2 className="text-2xl font-black text-white leading-tight">{selectedLesson.title}</h2>
              <div className="w-40 h-2 bg-white/5 rounded-full mx-auto mt-2 overflow-hidden border border-white/5">
                <div className="h-full bg-[#00D26A]" style={{ width: `${getChapterProgressPercent(selectedLesson.id)}%` }} />
              </div>
            </div>

            {/* Granular Game Step Selector (6 Steps map) */}
            <div className="flex justify-between items-center bg-white/3 border border-white/5 p-1.5 rounded-2xl overflow-x-auto gap-1 shadow-inner">
              {[
                { label: '📖 Leçon', idx: 0, field: 'read' },
                { label: '✏️ Exercices', idx: 1, field: 'exercises' },
                { label: '🎮 Mini-Jeu', idx: 2, field: 'game' },
                { label: '⚡ Flash', idx: 3, field: 'flash' },
                { label: '🏆 Défi', idx: 4, field: 'challenge' },
                { label: '⭐ Badge', idx: 5, field: null }
              ].map((step) => {
                const currentProgress = lessonProgress[selectedLesson.id] || { read: false, exercises: false, game: false, flash: false, challenge: false };
                
                // Status checks
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

                let btnStyle = "text-white/40 border-transparent hover:text-white/60";
                if (isCurrent) {
                  btnStyle = "bg-[#6C5CFF]/25 border-[#6C5CFF]/40 text-[#9E94FF] font-black";
                } else if (isDone) {
                  btnStyle = "text-emerald-400 font-bold border-transparent";
                } else if (isLocked) {
                  btnStyle = "text-white/10 cursor-not-allowed opacity-35 border-transparent";
                } else {
                  btnStyle = "text-white/60 font-semibold border-transparent";
                }

                return (
                  <button
                    key={step.idx}
                    disabled={isLocked}
                    onClick={() => {
                      setActiveStepTab(step.idx);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-[9px] whitespace-nowrap transition cursor-pointer flex items-center space-x-1 shrink-0 ${btnStyle}`}
                  >
                    <span>{step.label}</span>
                    {isDone && <span className="text-[8px] text-emerald-400">✓</span>}
                    {isLocked && <span className="text-[8px]">🔒</span>}
                  </button>
                );
              })}
            </div>

            {/* STEP CONTENT SWITCH */}
            
            {/* Step 0: Cours */}
            {activeStepTab === 0 && (
              <div className="space-y-6 animate-fadeIn">
                {selectedLesson.introduction && (
                  <p className="text-sm sm:text-base text-white/80 leading-relaxed font-semibold italic border-l-4 border-[#6C5CFF] pl-4 my-6">
                    {selectedLesson.introduction}
                  </p>
                )}

                {/* 1. Définition */}
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-3xl p-6 space-y-3 shadow-md">
                  <span className="text-xs font-black text-[#5c9eff] uppercase tracking-wider block">📚 Définition</span>
                  <p className="text-sm sm:text-base text-white leading-relaxed font-semibold">
                    {selectedLesson.definition}
                  </p>
                </div>

                {/* 2. Explication */}
                <div className="bg-[#112240]/80 border border-white/8 rounded-3xl p-6 space-y-3 shadow-md">
                  <span className="text-xs font-black text-[#6C5CFF] uppercase tracking-wider block">📝 Explication Complète</span>
                  <p className="text-sm sm:text-base text-white/95 leading-relaxed font-medium">
                    {selectedLesson.explication}
                  </p>
                </div>

                {/* 3. Exemple */}
                {(selectedLesson.exemple || (selectedLesson.schemas && selectedLesson.schemas.length > 0)) && (
                  <div className="bg-[#00D26A]/5 border border-[#00D26A]/15 rounded-3xl p-6 space-y-3 shadow-md">
                    <span className="text-xs font-black text-[#00D26A] uppercase tracking-wider block">🔍 Exemple & Illustration</span>
                    {selectedLesson.exemple && (
                      <p className="text-sm sm:text-base text-emerald-200/90 leading-relaxed font-semibold">
                        {selectedLesson.exemple}
                      </p>
                    )}
                    {selectedLesson.schemas && selectedLesson.schemas.length > 0 && (
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-xs text-[#00D26A] whitespace-pre overflow-x-auto mt-2 leading-relaxed">
                        {selectedLesson.schemas.join('\n')}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Astuce */}
                {selectedLesson.astuce && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-3xl p-6 space-y-3 shadow-md">
                    <span className="text-xs font-black text-[#FFB020] uppercase tracking-wider block">💡 Astuce du Professeur</span>
                    <p className="text-sm sm:text-base text-amber-200/90 leading-relaxed font-semibold">
                      {selectedLesson.astuce}
                    </p>
                  </div>
                )}

                {/* 5. Piège fréquent */}
                {selectedLesson.pieges && (
                  <div className="bg-rose-500/5 border border-rose-500/15 rounded-3xl p-6 space-y-3 shadow-md">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider block">⚠️ Pièges fréquents à éviter</span>
                    <p className="text-sm sm:text-base text-rose-200/90 leading-relaxed font-semibold">
                      {selectedLesson.pieges}
                    </p>
                  </div>
                )}

                {/* 6. À retenir */}
                {(selectedLesson.memo || selectedLesson.methode) && (
                  <div className="bg-purple-500/5 border border-purple-500/15 rounded-3xl p-6 space-y-3 shadow-md">
                    <span className="text-xs font-black text-[#9E94FF] uppercase tracking-wider block">📌 À retenir</span>
                    <p className="text-sm sm:text-base text-white/95 leading-relaxed font-medium whitespace-pre-line">
                      {selectedLesson.memo || selectedLesson.methode}
                    </p>
                  </div>
                )}

                <div className="pt-6 pb-8">
                  {!(lessonProgress[selectedLesson.id]?.read) ? (
                    <button
                      onClick={() => {
                        updateProgressField(selectedLesson.id, 'read', true);
                        setStats(prev => ({ ...prev, xp: prev.xp + 10 }));
                        alert("📖 Leçon lue ! Tu gagnes +10 XP. Place aux exercices ! ✏️");
                        setActiveStepTab(1);
                      }}
                      className="w-full py-4 bg-[#00D26A] text-[#07111F] font-black text-sm rounded-2xl shadow-lg hover:bg-[#00FF87] active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>J'ai compris le cours ! (+10 XP) 👍</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveStepTab(1)}
                      className="w-full py-4 bg-white/5 border border-white/10 text-white font-black text-sm rounded-2xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Continuer vers les Exercices ✏️</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Exercices */}
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
                    onClick={() => startKidExercises(selectedLesson)}
                    className="w-full py-3.5 bg-[#6C5CFF] text-white font-black text-xs rounded-2xl shadow-md hover:bg-[#5849E0] transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Lancer les Exercices ✏️</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Mini-jeu */}
            {activeStepTab === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <span className="text-xl">🎮</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 3 : Le Mini-Jeu Memory</h4>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed font-semibold">
                    Retourne les cartes et associe les paires correspondantes de la leçon !
                  </p>

                  <button
                    onClick={() => startMemoryGame(selectedLesson)}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-[#07111F] font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Lancer le Jeu Memory 🎮</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Flash Quiz */}
            {activeStepTab === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <span className="text-xl">⚡</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 4 : Le Flash Quiz</h4>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed font-semibold">
                    Réponds à 5 questions ultra-rapides pour tester tes réflexes. 4/5 requis !
                  </p>

                  <button
                    onClick={() => startKidFlash(selectedLesson)}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-[#00D26A] text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Lancer le Flash Quiz ⚡</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Timed Challenge */}
            {activeStepTab === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-[#112240] border border-white/5 rounded-3xl p-5 space-y-4 text-left">
                  <div className="flex items-center space-x-2 border-b border-white/5 pb-3">
                    <span className="text-xl">🏆</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Étape 5 : Le Défi Chronométré</h4>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed font-semibold">
                    Donne au moins 4 bonnes réponses avant la fin du temps (45 secondes) !
                  </p>

                  <button
                    onClick={() => startKidChallenge(selectedLesson)}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Lancer le Défi (45s) 🏆</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Validation / Badge */}
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
                      <span className="text-[8px] text-white/40 font-black uppercase block">Argent poche</span>
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
                    className="w-full py-3 bg-[#6C5CFF] hover:bg-[#5849E0] text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer"
                  >
                    Retourner au Programme
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= MEMORY GAME VIEW ================= */}
        {activeGame && (
          <div className="bg-[#112240] border-2 border-[#00D26A]/30 rounded-[32px] p-5 space-y-4 animate-fadeIn text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <span>🎮 Mini-Jeu : Le Memory de la leçon</span>
            </h4>
            <p className="text-[10px] text-white/60 leading-relaxed font-semibold">
              Trouve les paires correspondantes en retournant les cartes !
            </p>
            
            <div className="grid grid-cols-4 gap-2.5 pt-2">
              {memoryCards.map((card) => {
                const isFlipped = card.isFlipped || card.isMatched;
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    className={`h-20 rounded-xl font-black text-[9px] transition-all flex items-center justify-center p-1.5 border cursor-pointer select-none text-center ${
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
              className="w-full mt-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-bold cursor-pointer"
            >
              Quitter le Jeu
            </button>
          </div>
        )}

        {/* ================= INTERACTIVE QUIZ WINDOW ================= */}
        {activeQuiz && (
          <div className="bg-[#112240] border-2 border-[#6C5CFF]/30 rounded-[32px] p-5 space-y-5 animate-fadeIn text-left relative overflow-hidden">
            
            {/* Header: Progress & Timer */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[8px] font-black text-[#6C5CFF] uppercase tracking-wider block">Question</span>
                <span className="text-xs font-black text-white">
                  {activeQuiz.currentIndex + 1} sur {activeQuiz.questions.length}
                </span>
              </div>

              {/* Timer for Timed Challenge */}
              {activeQuiz.timerRemaining !== undefined && (
                <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-xl text-[10px] font-black flex items-center space-x-1 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activeQuiz.timerRemaining}s</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#6C5CFF] transition-all" 
                style={{ width: `${((activeQuiz.currentIndex) / activeQuiz.questions.length) * 100}%` }}
              />
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Consigne :</span>
              <h3 className="text-sm font-black text-white leading-relaxed">
                {activeQuiz.questions[activeQuiz.currentIndex]?.question}
              </h3>
            </div>

            {/* Quiz Options */}
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {activeQuiz.questions[activeQuiz.currentIndex]?.options.map((opt) => {
                const isSelected = activeQuiz.selectedOption === opt;
                const isCorrect = opt.toLowerCase() === activeQuiz.questions[activeQuiz.currentIndex]?.reponse.toLowerCase();
                
                let btnStyle = "bg-white/5 border-white/8 text-white/80 hover:bg-white/10";
                if (activeQuiz.showCorrection) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-300";
                  } else if (isSelected) {
                    btnStyle = "bg-rose-500/10 border-rose-500/40 text-rose-300";
                  } else {
                    btnStyle = "bg-white/3 border-white/5 text-white/20";
                  }
                }

                return (
                  <button
                    key={opt}
                    disabled={activeQuiz.showCorrection}
                    onClick={() => handleAnswerSubmit(opt)}
                    className={`w-full p-4 text-xs font-black text-left rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {activeQuiz.showCorrection && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {activeQuiz.showCorrection && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                  </button>
                );
              })}
            </div>

            {/* Hint Box */}
            {activeQuiz.showHint && !activeQuiz.showCorrection && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl text-[10px] text-blue-300 font-semibold leading-relaxed animate-fadeIn">
                💡 **Indice :** {activeQuiz.questions[activeQuiz.currentIndex]?.indice}
              </div>
            )}

            {/* Correction Explanation */}
            {activeQuiz.showCorrection && (
              <div className="p-4 bg-white/5 border border-white/8 rounded-2xl text-[10px] text-white/75 leading-relaxed font-semibold space-y-1.5 animate-fadeIn">
                <span className="text-[8px] font-black text-[#00D26A] uppercase block">Explication :</span>
                <p>{activeQuiz.questions[activeQuiz.currentIndex]?.explication}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-2 gap-3">
              {!activeQuiz.showCorrection && !activeQuiz.showHint && (
                <button
                  onClick={() => setActiveQuiz(prev => prev ? { ...prev, showHint: true } : null)}
                  className="px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black hover:bg-blue-500/20 cursor-pointer"
                >
                  Besoin d'un indice ? 💡
                </button>
              )}
              
              {activeQuiz.showCorrection && (
                <button
                  onClick={handleNextQuestion}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-[#6C5CFF] text-white text-[10px] font-black hover:bg-[#5849E0] transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <span>Suivant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ================= STUDENT PROFILE MODAL ================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#112240] border-2 border-white/8 rounded-[32px] p-6 max-w-sm w-full space-y-6 text-left shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-black text-white flex items-center space-x-2">
                <span>⚙️ Profil de l'élève</span>
              </h3>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="text-white/40 hover:text-white/70 text-xs font-bold"
              >
                Fermer
              </button>
            </div>

            {/* Settings Forms */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase block">Niveau Scolaire</label>
                <select 
                  value={studentProfile.level}
                  onChange={(e) => setStudentProfile(prev => ({ ...prev, level: e.target.value as any }))}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white"
                >
                  {['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e', 'Lycée'].map(lvl => (
                    <option key={lvl} value={lvl} className="bg-[#112240]">{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-white/40 uppercase block">Pays d'étude</label>
                <select 
                  value={studentProfile.country}
                  onChange={(e) => setStudentProfile(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white"
                >
                  {['France', 'Sénégal', 'Côte d\'Ivoire', 'Maroc', 'Cameroun', 'Autre'].map(c => (
                    <option key={c} value={c} className="bg-[#112240]">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Danger / Reset action */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <button
                onClick={resetStudentProgress}
                className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-[10px] font-black transition flex items-center justify-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser ma progression</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
