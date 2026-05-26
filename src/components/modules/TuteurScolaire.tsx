import React, { useState } from 'react';
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
  Edit3
} from 'lucide-react';
import type { SchoolTask } from '../../types';
import { aiQuotaService } from '../../services/aiQuotaService';

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
}

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
  setSchedule
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'devoirs' | 'quizzes' | 'schedule' | 'grades'>('devoirs');
  const activeMember = members?.find(m => m.id === activeMemberId);
  const isParent = activeMember 
    ? ['Chef de famille', 'Gestionnaire', 'admin', 'parent'].includes(activeMember.role)
    : (activeMemberId === '1' || activeMemberId === '2');

  // Dynamically calculate the list of children/students from the foyer members
  const studentList = members && members.length > 0
    ? members.filter(m => {
        const r = (m.role || '').toLowerCase();
        return r.includes('enfant') || r.includes('collège') || r.includes('primaire') || r.includes('ans') || m.id === '3' || m.id === '4';
      })
    : [
        { id: '3', name: 'Amadou' },
        { id: '4', name: 'Awa' }
      ];

  // Devoir inline edit states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskSubject, setEditTaskSubject] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskDifficulty, setEditTaskDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState('');

  const handleDeleteHomework = (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce devoir ?")) {
      setSchoolTasks(prev => prev.filter(t => t.id !== id));
      alert("Devoir supprimé avec succès.");
    }
  };

  const handleSaveHomeworkEdit = (id: string) => {
    if (!editTaskTitle.trim()) {
      alert("Le titre du devoir ne peut pas être vide.");
      return;
    }
    setSchoolTasks(prev => prev.map(t => t.id === id ? {
      ...t,
      title: editTaskTitle.trim(),
      subject: editTaskSubject,
      dueDate: editTaskDueDate || new Date().toISOString().split('T')[0],
      difficulty: editTaskDifficulty,
      assignedMemberId: editTaskAssigneeId
    } : t));
    setEditingTaskId(null);
    alert("Devoir modifié avec succès !");
  };

  // --- Subjects List ---
  const [subjectsList, setSubjectsList] = useState<string[]>(() => {
    const stored = localStorage.getItem('school_subjects');
    return stored ? JSON.parse(stored) : ["Mathématiques", "Histoire-Géographie", "Sciences / SVT", "Français"];
  });

  const handleSubjectChange = (val: string, setSubjectFn: (val: string) => void) => {
    if (val === 'AUTRE_MANUEL') {
      const custom = window.prompt("Saisir la nouvelle matière personnalisée :");
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

  // --- Global Schedule Dates ---
  const [scheduleStartDate, setScheduleStartDate] = useState(() => {
    return localStorage.getItem('school_sch_start') || '01/09/2025';
  });
  const [scheduleEndDate, setScheduleEndDate] = useState(() => {
    return localStorage.getItem('school_sch_end') || '30/06/2026';
  });



  // Form & UI States
  const [selectedDay, setSelectedDay] = useState<string>('Lundi');
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'calendar'>('list');
  
  // Form States Grade
  const [formGradeStudentId, setFormGradeStudentId] = useState(() => studentList[0]?.id || '3');
  const [formGradeSubject, setFormGradeSubject] = useState('Mathématiques');
  const [formGradeValue, setFormGradeValue] = useState(15);
  const [formGradeMax, setFormGradeMax] = useState(20);
  const [formGradeCoef, setFormGradeCoef] = useState(1);
  const [formGradeExamTitle, setFormGradeExamTitle] = useState('');
  
  // Form States Schedule
  const [formSchStudentId, setFormSchStudentId] = useState(() => studentList[0]?.id || '3');
  const [formSchDay, setFormSchDay] = useState('Lundi');
  const [formSchSubject, setFormSchSubject] = useState('Mathématiques');
  const [formSchStartTime, setFormSchStartTime] = useState('08:30');
  const [formSchEndTime, setFormSchEndTime] = useState('09:30');
  const [formSchRoom, setFormSchRoom] = useState('');

  // Keep student form IDs in sync when members are dynamically loaded or updated
  React.useEffect(() => {
    if (studentList && studentList.length > 0) {
      const firstId = studentList[0].id;
      setFormGradeStudentId(firstId);
      setFormSchStudentId(firstId);
    }
  }, [members]);

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
    alert("🎯 Note ajoutée avec succès !");
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
    alert("⏰ Cours ajouté à l'emploi du temps !");
  };

  const handleDeleteSchItem = (id: string) => {
    if (window.confirm("Retirer ce cours de l'emploi du temps ?")) {
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
  
  // Quiz State
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [eduSchemaUrl, setEduSchemaUrl] = useState<string>('');
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);
  
  const [dynamicQuiz, setDynamicQuiz] = useState<any[] | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const handleGenerateIAQuiz = async () => {
    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      return;
    }

    const topic = window.prompt("Sur quel sujet précis souhaitez-vous que le Tuteur IA crée votre quiz de révision ?\n(ex: Les Pharaons, Le cycle de l'eau, Addition de fractions, Le futur simple...)");
    if (!topic || !topic.trim()) return;

    setGeneratingQuiz(true);
    setDynamicQuiz(null);
    setSelectedSubject('ia-generated');
    setLoadingSchema(true);

    // Tente d'utiliser l'IA réelle si le quota est disponible (soit via clé locale VITE_, soit via le proxy serveurless)
    const useRealAI = aiQuotaService.consumeAIQuota(isPremium);

    if (useRealAI) {
      try {
        const prompt = `Tu es le Tuteur IA Scolaire de l'application MaFamille+.
Génère un quiz de révision interactif de 3 questions à choix multiples pour tester les connaissances d'un élève sur le sujet : ${topic.trim()}.
Renvoie STRICTEMENT un tableau JSON brut valide (sans markdown, sans enrobage de texte, pas de balise \`\`\`json, juste le tableau JSON).
Chaque question doit être un objet JSON contenant :
- q (la question claire, éducative et bienveillante en français)
- options (un tableau de 4 réponses possibles en français)
- correct (l'index de la bonne réponse, de 0 à 3)

Exemple de format valide :
[
  {"q": "Quelle est la capitale de la France ?", "options": ["Marseille", "Paris", "Lyon", "Nice"], "correct": 1}
]`;

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
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        if (!response.ok) throw new Error("Gemini API call failed");
        const data = await response.json();
        let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedQuiz = JSON.parse(textResult);
        if (Array.isArray(parsedQuiz) && parsedQuiz.length === 3) {
          setDynamicQuiz(parsedQuiz);
          setGeneratingQuiz(false);
          triggerEduSchemaGeneration(topic);
          return;
        } else {
          throw new Error("Format JSON invalide ou nombre de questions incorrect");
        }
      } catch (err) {
        console.warn("[TuteurScolaire] Échec génération IA réelle, basculement sur le simulateur local :", err);
      }
    }

    // Version locale de repli si quota dépassé ou clé manquante
    const remainingCalls = aiQuotaService.getRemainingCalls(isPremium);
    const isQuotaFallback = isPremium && remainingCalls === 0;

    let fallbackQuiz = [
      {
        q: `[Défi local : ${topic.trim()}] Quelle affirmation caractérise le mieux ce sujet d'étude ?`,
        options: [
          "C'est un domaine d'apprentissage fascinant et important !",
          "C'est un sujet totalement inutile au quotidien.",
          "Ça n'existe pas dans le monde réel.",
          "C'est trop mystérieux pour être appris."
        ],
        correct: 0
      },
      {
        q: `[Défi local : ${topic.trim()}] Quelle est la meilleure technique pour progresser sur ce sujet ?`,
        options: [
          "Attendre que l'évaluation passe.",
          "La curiosité intellectuelle, les quiz réguliers et apprendre de ses erreurs !",
          "N'étudier que 5 minutes par an.",
          "Espérer avoir de la chance le jour J."
        ],
        correct: 1
      },
      {
        q: `[Défi local : ${topic.trim()}] Quelle conclusion tirez-vous de cet entraînement ?`,
        options: [
          "Je ne veux plus jamais en entendre parler.",
          "Que l'apprentissage actif par le jeu est une excellente clé du succès !",
          "C'est beaucoup trop difficile.",
          "Je n'ai pas compris la question."
        ],
        correct: 1
      }
    ];

    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('eau') || lowerTopic.includes('pluie') || lowerTopic.includes('cycle')) {
      fallbackQuiz = [
        {
          q: "[Sciences 💧] Quel état prend l'eau lorsqu'elle s'évapore sous l'effet du soleil ?",
          options: ["Solide (glace)", "Liquide (pluie)", "Gazeux (vapeur d'eau)", "Plasma brillant"],
          correct: 2
        },
        {
          q: "[Sciences 💧] Comment appelle-t-on le phénomène où l'eau des nuages retombe sur Terre ?",
          options: ["La transpiration", "La condensation", "La précipitation (pluie, neige)", "La filtration"],
          correct: 2
        },
        {
          q: "[Sciences 💧] Quelle est la principale force qui fait redescendre l'eau sous forme de pluie ?",
          options: ["Le magnétisme", "La gravité de la Terre", "Le vent solaire", "La rotation de la Lune"],
          correct: 1
        }
      ];
    } else if (lowerTopic.includes('fraction') || lowerTopic.includes('math') || lowerTopic.includes('addition') || lowerTopic.includes('nombre')) {
      fallbackQuiz = [
        {
          q: "[Maths 📐] Si vous divisez une pizza en 8 parts égales et en mangez 3 parts, quelle fraction de la pizza reste-t-il ?",
          options: ["3/8", "5/8", "1/2", "8/3"],
          correct: 1
        },
        {
          q: "[Maths 📐] Quelle fraction est équivalente à un demi (1/2) ?",
          options: ["2/4", "3/9", "4/6", "1/3"],
          correct: 0
        },
        {
          q: "[Maths 📐] Comment appelle-t-on le nombre situé sous la barre de fraction ?",
          options: ["Le numérateur", "La somme", "Le quotient", "Le dénominateur"],
          correct: 3
        }
      ];
    } else if (lowerTopic.includes('pharaon') || lowerTopic.includes('egypte') || lowerTopic.includes('histoire') || lowerTopic.includes('pyramide')) {
      fallbackQuiz = [
        {
          q: "[Histoire 🏺] Quel jeune pharaon égyptien est devenu légendaire grâce à la découverte de son tombeau intact en 1922 ?",
          options: ["Ramsès II", "Toutânkhamon", "Khéops", "Akhenaton"],
          correct: 1
        },
        {
          q: "[Histoire 🏺] Quelle écriture sacrée composée de petits dessins était utilisée par les scribes en Égypte antique ?",
          options: ["Le cunéiforme", "L'alphabet grec", "Les hiéroglyphes", "L'alphabet phénicien"],
          correct: 2
        },
        {
          q: "[Histoire 🏺] Quel grand fleuve d'Afrique permettait l'agriculture en Égypte grâce à ses crues fertiles ?",
          options: ["Le Nil", "L'Amazone", "Le Congo", "Le Mississippi"],
          correct: 0
        }
      ];
    } else if (lowerTopic.includes('planète') || lowerTopic.includes('espace') || lowerTopic.includes('soleil') || lowerTopic.includes('astro')) {
      fallbackQuiz = [
        {
          q: "[Astronomie 🚀] Quelle planète du Système solaire est surnommée la 'Planète Rouge' ?",
          options: ["Vénus", "Jupiter", "Mars", "Saturne"],
          correct: 2
        },
        {
          q: "[Astronomie 🚀] Quelle étoile géante se trouve au centre de notre Système solaire ?",
          options: ["La Lune", "Proxima du Centaure", "Sirius", "Le Soleil"],
          correct: 3
        },
        {
          q: "[Astronomie 🚀] Combien de temps la Terre met-elle environ pour faire un tour complet autour du Soleil ?",
          options: ["24 heures", "30 jours", "365 jours (1 an)", "28 jours"],
          correct: 2
        }
      ];
    }

    setTimeout(() => {
      setDynamicQuiz(fallbackQuiz);
      setGeneratingQuiz(false);
      triggerEduSchemaGeneration(topic);
      
      if (isQuotaFallback) {
        console.info("[TuteurScolaire] Quota quotidien d'IA réelle épuisé. Basculement sur le Tuteur local.");
      } else if (!import.meta.env.VITE_GEMINI_API_KEY) {
        console.info("[TuteurScolaire] Clé VITE_GEMINI_API_KEY absente. Basculement sur le Tuteur local.");
      } else {
        console.info("[TuteurScolaire] Basculement sur le Tuteur local (compte non-Premium).");
      }
    }, 1000);
  };

  const triggerEduSchemaGeneration = (subj: string) => {
    setLoadingSchema(true);
    setEduSchemaUrl('');

    let promptKeywords = '';
    if (subj === 'maths') {
      promptKeywords = 'mathematical geometric figures, chalkboard drawings of a triangle and rectangle with colorful chalk formulas, architectural sketch style, clean educational graphic';
    } else if (subj === 'histoire') {
      promptKeywords = 'vintage ancient map of the world, Christopher Columbus sailing ship caravel detailed illustration, 3d historical cartoon style, warm parchment paper texture';
    } else if (subj === 'sciences') {
      promptKeywords = 'colorful solar system orbit map, glowing sun and planets in dark space, scientific educational graphic, detailed 3d rendering, bright kid-friendly design';
    } else {
      promptKeywords = 'vintage feather quill writing in a magical glowing wizard book of grammar, ancient calligraphy letters floating, 3d pixar book style, cozy lighting';
    }

    const seed = Math.floor(Math.random() * 1000000);
    const finalPrompt = encodeURIComponent(`educational school graphic, ${promptKeywords}, clear diagram, vibrant colors, white background border, vector design style`);
    const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=600&height=400&nologo=true&seed=${seed}`;

    const img = new Image();
    img.src = generatedUrl;

    img.onload = () => {
      setEduSchemaUrl(generatedUrl);
      setLoadingSchema(false);
    };

    img.onerror = () => {
      // Fallback Unsplash
      setEduSchemaUrl(`https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80&sig=${seed}`);
      setLoadingSchema(false);
    };
  };

  const mathQuiz = [
    {
      q: "Calcule l'aire d'un rectangle de 6cm de longueur et 4cm de largeur.",
      options: ["10 cm²", "24 cm²", "20 cm²", "12 cm²"],
      correct: 1
    },
    {
      q: "Combien font 7 x 8 ?",
      options: ["49", "54", "56", "64"],
      correct: 2
    },
    {
      q: "Résous : 3x + 5 = 20. Quelle est la valeur de x ?",
      options: ["x = 5", "x = 4", "x = 15", "x = 3"],
      correct: 0
    }
  ];

  const historyQuiz = [
    {
      q: "Qui était le roi de France surnommé le Roi-Soleil ?",
      options: ["Louis XIV", "Louis XVI", "Henri IV", "François Ier"],
      correct: 0
    },
    {
      q: "En quelle année a eu lieu la Révolution Française ?",
      options: ["1492", "1789", "1815", "1914"],
      correct: 1
    },
    {
      q: "Quel navigateur célèbre a découvert l'Amérique en 1492 ?",
      options: ["Vasco de Gama", "Marco Polo", "Christophe Colomb", "Magellan"],
      correct: 2
    }
  ];

  const sciencesQuiz = [
    {
      q: "Combien de planètes compte notre système solaire ?",
      options: ["7 planètes", "8 planètes", "9 planètes", "10 planètes"],
      correct: 1
    },
    {
      q: "Quel organe pompe le sang dans tout le corps humain ?",
      options: ["Le cerveau", "Les poumons", "Le foie", "Le cœur"],
      correct: 3
    },
    {
      q: "Par quel processus les plantes fabriquent-elles leur nourriture à partir de la lumière ?",
      options: ["La photosynthèse", "La respiration", "La transpiration", "La fermentation"],
      correct: 0
    }
  ];

  const francaisQuiz = [
    {
      q: "Choisissez la bonne orthographe : 'Ils ont ___ leurs devoirs.'",
      options: ["fini", "finis", "finie", "finisse"],
      correct: 0
    },
    {
      q: "Quel est le synonyme du mot 'magnifique' ?",
      options: ["Triste", "Superbe", "Simple", "Faible"],
      correct: 1
    },
    {
      q: "Dans la phrase 'Le chat noir dort sur le canapé', quel est l'adjectif ?",
      options: ["chat", "noir", "dort", "canapé"],
      correct: 1
    }
  ];

  const activeQuiz = dynamicQuiz || (
    selectedSubject === 'maths' ? mathQuiz : 
    selectedSubject === 'histoire' ? historyQuiz : 
    selectedSubject === 'sciences' ? sciencesQuiz : 
    francaisQuiz
  );

  // Parent homework creator form states
  const [newHomeworkTitle, setNewHomeworkTitle] = useState('');
  const [newHomeworkSubject, setNewHomeworkSubject] = useState('Mathématiques');
  const [newHomeworkDifficulty, setNewHomeworkDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newHomeworkAssignee, setNewHomeworkAssignee] = useState('3'); // 3 = Amadou, 4 = Awa
  const [newHomeworkDueDate, setNewHomeworkDueDate] = useState('');

  const handleAddHomework = (e: React.FormEvent) => {
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
    alert(`📚 Devoir ajouté avec succès pour ${getChildName(newHomeworkAssignee)} !`);
  };

  const handleSelectAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (idx === activeQuiz[currentQuestionIndex].correct) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    if (currentQuestionIndex + 1 < activeQuiz.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleResetQuiz = () => {
    setSelectedSubject('');
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setDynamicQuiz(null);
  };

  // Mark homework completed (waiting validation)
  const handleMarkCompleted = (taskId: string) => {
    setSchoolTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, done: true, grade: undefined } : t)
    );
    alert("Devoir envoyé aux parents pour validation ! Travail bien fait ! 👍");
  };

  // Parent validates homework and grants allowance!
  const handleParentValidate = (taskId: string) => {
    setSchoolTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, done: true, grade: 'Validé' } : t)
    );
    alert("Devoir validé avec succès ! Les Pts et l'argent de poche ont été transférés. 💰");
  };

  const getPoints = (difficulty: 'easy' | 'medium' | 'hard') => {
    return difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
  };

  const getChildName = (assignedMemberId: string) => {
    const found = members?.find(m => m.id === assignedMemberId);
    if (found) return found.name;
    return assignedMemberId === '3' ? 'Amadou' : assignedMemberId === '4' ? 'Awa' : 'Général';
  };

  // Filter based on active role
  const visibleTasks = isParent 
    ? schoolTasks 
    : schoolTasks.filter(t => t.assignedMemberId === activeMemberId);

  // Helper status flags
  const isPendingValidation = (task: SchoolTask) => task.done && !task.grade;
  const isCompleted = (task: SchoolTask) => task.done && task.grade === 'Validé';
  const isNew = (task: SchoolTask) => !task.done;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Le Tuteur IA Scolaire</h2>
            <p className="text-xs text-white/50">Soutien scolaire personnalisé et devoirs</p>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Controls */}
      <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-1">
        <button
          onClick={() => setActiveSubTab('devoirs')}
          className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'devoirs' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Devoirs & Pts
        </button>
        <button
          onClick={() => setActiveSubTab('quizzes')}
          className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'quizzes' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          IA & Quizzes
        </button>
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'schedule' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Emploi du Temps
        </button>
        <button
          onClick={() => setActiveSubTab('grades')}
          className={`py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'grades' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Notes & Bulletins
        </button>
      </div>

      {/* DEV TAB */}
      {activeSubTab === 'devoirs' && (
        <div className="space-y-4">
          
          {/* Parent Validation Section */}
          {isParent && schoolTasks.some(isPendingValidation) && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest flex items-center space-x-1.5 bg-[#FFB020]/10 border border-[#FFB020]/20 p-2.5 rounded-2xl w-fit">
                <UserCheck className="w-4 h-4 animate-bounce" />
                <span>Devoirs en attente de validation parentale</span>
              </span>
              
              <div className="space-y-2.5">
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
                      <span>Valider & Récompenser 💰</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Normal Tasks List */}
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Cahier de Textes :</span>
          
          <div className="space-y-3">
            {visibleTasks.length > 0 ? (
              visibleTasks.map((task) => {
                const isPending = isPendingValidation(task);
                const isCompletedTask = isCompleted(task);
                const isNewTask = isNew(task);

                if (editingTaskId === task.id) {
                  return (
                    <div 
                      key={task.id}
                      className="glass-panel border border-[#6C5CFF]/30 bg-[#6C5CFF]/5 rounded-[28px] p-5 space-y-4 text-left"
                    >
                      <div className="space-y-1.5 font-medium">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Titre du Devoir</label>
                        <input 
                          type="text" 
                          value={editTaskTitle}
                          onChange={(e) => setEditTaskTitle(e.target.value)}
                          className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                          placeholder="Ex: Exercices 1 à 5 p. 42"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5 font-medium">
                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Matière</label>
                          <select 
                            value={editTaskSubject}
                            onChange={(e) => handleSubjectChange(e.target.value, setEditTaskSubject)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                          >
                            {subjectsList.map((sub, sidx) => (
                              <option key={sidx} value={sub}>{sub}</option>
                            ))}
                            <option value="AUTRE_MANUEL">+ Autre matière...</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 font-medium">
                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date Limite</label>
                          <input 
                            type="date" 
                            value={editTaskDueDate}
                            onChange={(e) => setEditTaskDueDate(e.target.value)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5 font-medium">
                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Difficulté (Points)</label>
                          <select 
                            value={editTaskDifficulty}
                            onChange={(e) => setEditTaskDifficulty(e.target.value as any)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="easy">Facile (20 Pts)</option>
                            <option value="medium">Moyen (50 Pts)</option>
                            <option value="hard">Difficile (100 Pts)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 font-medium">
                          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Attribuer à</label>
                          <select 
                            value={editTaskAssigneeId}
                            onChange={(e) => setEditTaskAssigneeId(e.target.value)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                          >
                            {studentList.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3.5 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveHomeworkEdit(task.id)}
                          className="px-3.5 py-2 rounded-xl bg-[#6C5CFF] text-white font-bold text-[10px] hover:bg-[#5849E0] transition-all cursor-pointer shadow-md"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  );
                }

                // Beautiful dynamic colors for subjects
                let subjectBadgeClass = "bg-purple-500/15 text-purple-300 border-purple-500/30";
                if (task.subject.toLowerCase().includes('math')) {
                  subjectBadgeClass = "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
                } else if (task.subject.toLowerCase().includes('hist') || task.subject.toLowerCase().includes('géo')) {
                  subjectBadgeClass = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                } else if (task.subject.toLowerCase().includes('scien') || task.subject.toLowerCase().includes('svt')) {
                  subjectBadgeClass = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                } else if (task.subject.toLowerCase().includes('fran') || task.subject.toLowerCase().includes('dictée')) {
                  subjectBadgeClass = "bg-pink-500/15 text-pink-300 border-pink-500/30";
                } else if (task.subject.toLowerCase().includes('angl')) {
                  subjectBadgeClass = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
                }

                // Beautiful difficulty indicators
                let diffLabel = "🟢 Facile";
                let diffClass = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25";
                if (task.difficulty === 'medium') {
                  diffLabel = "🟡 Moyen";
                  diffClass = "text-amber-400 bg-amber-500/10 border border-amber-500/25";
                } else if (task.difficulty === 'hard') {
                  diffLabel = "🔴 Difficile";
                  diffClass = "text-rose-400 bg-rose-500/10 border border-rose-500/25";
                }

                return (
                  <div key={task.id} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3.5 relative overflow-hidden transition-all hover:bg-white/8 group pl-7">
                    {/* Left border indicator based on difficulty */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                      task.difficulty === 'hard' ? 'bg-gradient-to-b from-rose-500 to-pink-500' :
                      task.difficulty === 'medium' ? 'bg-gradient-to-b from-amber-500 to-yellow-500' :
                      'bg-gradient-to-b from-emerald-500 to-green-500'
                    }`} />

                    {/* Parent Action Buttons (Edit / Delete) - Always visible for touch screen support */}
                    {isParent && (
                      <div className="absolute top-4 right-4 flex items-center space-x-1.5 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTaskId(task.id);
                            setEditTaskTitle(task.title);
                            setEditTaskSubject(task.subject);
                            setEditTaskDueDate(task.dueDate);
                            setEditTaskDifficulty(task.difficulty);
                            setEditTaskAssigneeId(task.assignedMemberId);
                          }}
                          className="p-2 bg-white/5 hover:bg-[#6C5CFF]/20 border border-white/10 hover:border-[#6C5CFF]/30 text-white hover:text-[#9E94FF] rounded-xl transition duration-200 active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
                          title="Modifier le devoir"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHomework(task.id);
                          }}
                          className="p-2 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-[#FF3B30]/20 text-[#FF3B30] rounded-xl transition duration-200 active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
                          title="Supprimer le devoir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${subjectBadgeClass}`}>
                            {task.subject}
                          </span>
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${diffClass}`}>
                            {diffLabel}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-white mt-3.5 leading-relaxed mr-20">{task.title}</h3>
                        <p className="text-[10px] text-white/40 mt-1">Par: <span className="font-bold text-[#6C5CFF]">{getChildName(task.assignedMemberId)}</span> • Limite: <span className="text-[#FFB020] font-bold">{task.dueDate}</span></p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-extrabold text-[#FFB020] bg-[#FFB020]/10 px-3 py-1.5 rounded-xl block border border-[#FFB020]/20 shadow-inner">
                          +{getPoints(task.difficulty)} Pts
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3.5 border-t border-white/5">
                      <div className="flex items-center space-x-2 text-[10px] font-medium text-white/40">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Statut :</span>
                        <span className={`font-bold ${
                          isCompletedTask ? 'text-[#00D26A]' : isPending ? 'text-[#FFB020]' : 'text-[#4F8CFF]'
                        }`}>
                          {isCompletedTask ? 'Validé' : isPending ? 'En validation' : 'À faire'}
                        </span>
                      </div>

                      {!isParent && isNewTask && (
                        <button
                          onClick={() => handleMarkCompleted(task.id)}
                          className="px-3.5 py-2 rounded-xl bg-[#6C5CFF] text-white font-bold text-[10px] transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                        >
                          Marquer comme fait ✓
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center glass-panel rounded-2xl border border-white/5">
                <span className="text-xs text-white/30">Aucun devoir à faire. Profites-en pour réviser ! 📚</span>
              </div>
            )}
          </div>

          {/* Formulaire Parent d'ajout de devoir */}
          {isParent && (
            <form onSubmit={handleAddHomework} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 mt-6">
              <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 text-[#6C5CFF]" />
                <span>Créer un nouveau devoir (Accès Parent) 📝</span>
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Titre du Devoir</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: Révision des fractions..."
                    value={newHomeworkTitle}
                    onChange={(e) => setNewHomeworkTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">Matière</label>
                    <select
                      value={newHomeworkSubject}
                      onChange={(e) => handleSubjectChange(e.target.value, setNewHomeworkSubject)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      {subjectsList.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="AUTRE_MANUEL">✍️ Autre (Saisie manuelle)...</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Élève</label>
                    <select
                      value={newHomeworkAssignee}
                      onChange={(e) => setNewHomeworkAssignee(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      {studentList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role || 'Élève'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1.5 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Difficulté (Points)</label>
                  <select
                    value={newHomeworkDifficulty}
                    onChange={(e) => setNewHomeworkDifficulty(e.target.value as any)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="easy">Facile (+20 Pts)</option>
                    <option value="medium">Moyen (+50 Pts)</option>
                    <option value="hard">Difficile (+100 Pts)</option>
                  </select>
                </div>
                
                <div className="space-y-1.5 font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date limite</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: 25 Mai 2026"
                    value={newHomeworkDueDate}
                    onChange={(e) => setNewHomeworkDueDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#6C5CFF]/20"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Ajouter ce Devoir au Cahier de Textes</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* QUIZZES TAB */}
      {activeSubTab === 'quizzes' && (
        <div className="space-y-4">
          
          {generatingQuiz ? (
            <div className="glass-panel border border-[#6C5CFF]/30 rounded-[28px] p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#6C5CFF]/10 border-2 border-[#6C5CFF] text-[#6C5CFF] flex items-center justify-center mx-auto animate-spin">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Le Tuteur IA Scolaire réfléchit...</h3>
                <p className="text-xs text-white/50 mt-1">Conception sur-mesure de votre quiz personnalisé de 3 questions...</p>
              </div>
            </div>
          ) : !selectedSubject ? (
            /* Quiz selection */
            <div className="space-y-4">
              
              {/* Premium IA Quiz Generator */}
              <div className="glass-panel border border-[#6C5CFF]/30 rounded-[28px] p-5 bg-gradient-to-r from-[#6C5CFF]/10 to-[#00D26A]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="px-2.5 py-0.5 rounded bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-[8px] font-black text-white uppercase tracking-wider">Option Premium</span>
                  <h3 className="text-sm font-extrabold text-white flex items-center justify-center sm:justify-start space-x-1.5 mt-1">
                    <span>Générateur de Quiz IA ✨</span>
                  </h3>
                  <p className="text-[10px] text-white/50">Gemini 1.5 Flash crée un quiz sur-mesure sur n'importe quel sujet et niveau !</p>
                </div>
                
                <button
                  type="button"
                  onClick={handleGenerateIAQuiz}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer w-full sm:w-auto shrink-0 flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>Générer avec l'IA</span>
                </button>
              </div>

              <div className="border-t border-white/5 pt-4">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-3">Ou révisez avec les matières classiques :</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedSubject('maths'); triggerEduSchemaGeneration('maths'); }}
                  className="p-5 rounded-[28px] bg-white/5 border border-white/8 hover:border-[#6C5CFF] hover:bg-[#6C5CFF]/10 text-left transition-all cursor-pointer flex flex-col space-y-3 group"
                >
                  <div className="p-3 bg-[#6C5CFF]/10 rounded-2xl border border-[#6C5CFF]/20 text-[#6C5CFF] w-fit group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Mathématiques</h3>
                    <p className="text-[10px] text-white/40 mt-1">Niveau: CE2 - 5ème • 3 questions</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedSubject('histoire'); triggerEduSchemaGeneration('histoire'); }}
                  className="p-5 rounded-[28px] bg-white/5 border border-white/8 hover:border-[#6C5CFF] hover:bg-[#6C5CFF]/10 text-left transition-all cursor-pointer flex flex-col space-y-3 group"
                >
                  <div className="p-3 bg-[#FFB020]/10 rounded-2xl border border-[#FFB020]/20 text-[#FFB020] w-fit group-hover:scale-110 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Histoire-Géographie</h3>
                    <p className="text-[10px] text-white/40 mt-1">Niveau: CE2 - 5ème • 3 questions</p>
                  </div>
                </button>
                
                {/* SVT / Sciences */}
                <button
                  type="button"
                  onClick={() => { setSelectedSubject('sciences'); triggerEduSchemaGeneration('sciences'); }}
                  className="p-5 rounded-[28px] bg-white/5 border border-white/8 hover:border-[#00D26A] hover:bg-[#00D26A]/10 text-left transition-all cursor-pointer flex flex-col space-y-3 group"
                >
                  <div className="p-3 bg-[#00D26A]/10 rounded-2xl border border-[#00D26A]/20 text-[#00D26A] w-fit group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Sciences & SVT</h3>
                    <p className="text-[10px] text-white/40 mt-1">Niveau: CE2 - 5ème • 3 questions</p>
                  </div>
                </button>
                
                {/* Français */}
                <button
                  type="button"
                  onClick={() => { setSelectedSubject('francais'); triggerEduSchemaGeneration('francais'); }}
                  className="p-5 rounded-[28px] bg-white/5 border border-white/8 hover:border-[#FF4D6D] hover:bg-[#FF4D6D]/10 text-left transition-all cursor-pointer flex flex-col space-y-3 group"
                >
                  <div className="p-3 bg-[#FF4D6D]/10 rounded-2xl border border-[#FF4D6D]/20 text-[#FF4D6D] w-fit group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Français</h3>
                    <p className="text-[10px] text-white/40 mt-1">Niveau: CE2 - 5ème • 3 questions</p>
                  </div>
                </button>
              </div>
            </div>
          ) : quizFinished ? (
            /* Quiz Score Card */
            <div className="glass-panel border border-white/8 rounded-[28px] p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FFB020]/10 border-2 border-[#FFB020] text-[#FFB020] flex items-center justify-center mx-auto animate-bounce">
                <Award className="w-8 h-8" />
              </div>
              
              <div>
                <h3 className="text-base font-extrabold text-white">Quiz Terminé !</h3>
                <p className="text-xs text-white/50 mt-1">Ton score final est de :</p>
                <span className="text-3xl font-extrabold text-[#00D26A] mt-2 block">{quizScore} / {activeQuiz.length}</span>
              </div>

              {quizScore === activeQuiz.length ? (
                <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20">
                  <p className="text-[10px] font-bold text-[#00D26A] uppercase tracking-wider">Récompense bonus remportée 🏆</p>
                  <p className="text-xs text-white font-medium mt-1">Tu as gagné +15 Points d'argent de poche !</p>
                </div>
              ) : (
                <p className="text-[11px] text-white/50 leading-relaxed max-w-xs mx-auto">
                  Entraîne-toi à nouveau pour obtenir un score parfait de 3/3 et remporter des points bonus !
                </p>
              )}

              <button
                onClick={handleResetQuiz}
                className="w-full py-3.5 rounded-[18px] bg-[#6C5CFF] text-white font-bold text-xs cursor-pointer transition-all shadow-md"
              >
                Retour aux matières
              </button>
            </div>
          ) : (
            /* Quiz Active Question */
            <div className="glass-panel border border-white/8 rounded-[28px] p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <button 
                  type="button"
                  onClick={handleResetQuiz}
                  className="text-white/40 hover:text-white transition-all text-[9px] font-extrabold flex items-center space-x-1 cursor-pointer bg-white/5 px-2.5 py-1 rounded-xl border border-white/5"
                >
                  <ArrowLeft className="w-3 h-3 shrink-0" />
                  <span>Précédent</span>
                </button>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  {selectedSubject.toUpperCase()} • Q{currentQuestionIndex + 1}/{activeQuiz.length}
                </span>
                <span className="text-[9px] font-bold text-[#6C5CFF] bg-[#6C5CFF]/15 px-2 py-0.5 rounded shrink-0">
                  Score : {quizScore}
                </span>
              </div>

              {/* Educational IA Schema Frame */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/8 bg-black/40 shadow-inner flex items-center justify-center">
                {loadingSchema ? (
                  <div className="absolute inset-0 bg-white/3 flex flex-col items-center justify-center space-y-2 animate-pulse">
                    <span className="text-xl animate-bounce">✍️</span>
                    <span className="text-[8.5px] font-black text-white/40 uppercase tracking-widest font-sans">
                      L'IA dessine votre schéma de révision...
                    </span>
                  </div>
                ) : eduSchemaUrl ? (
                  <img 
                    src={eduSchemaUrl} 
                    alt="Schéma éducatif" 
                    className="w-full h-full object-cover brightness-95"
                  />
                ) : (
                  <div className="p-4 text-center">
                    <span className="text-xs text-white/30 italic">Aucun schéma disponible.</span>
                  </div>
                )}
                
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[7px] font-extrabold text-[#6C5CFF] uppercase tracking-wider">
                  Schéma IA explicatif
                </span>
              </div>

              <h3 className="text-sm font-bold text-white leading-relaxed">
                {activeQuiz[currentQuestionIndex].q}
              </h3>

              <div className="space-y-2.5">
                {activeQuiz[currentQuestionIndex].options.map((opt: string, idx: number) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === activeQuiz[currentQuestionIndex].correct;
                  const isWrong = isSelected && !isCorrect;

                  let btnStyle = "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8";
                  if (selectedAnswer !== null) {
                    if (isCorrect) btnStyle = "bg-[#00D26A]/15 border-[#00D26A] text-[#00D26A]";
                    else if (isWrong) btnStyle = "bg-[#FF4D6D]/15 border-[#FF4D6D] text-[#FF4D6D]";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-4 rounded-2xl border text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {selectedAnswer !== null && isCorrect && <span className="text-[#00D26A]">✓ Correct</span>}
                      {selectedAnswer !== null && isWrong && <span className="text-[#FF4D6D]">✗ Faux</span>}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer !== null && (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white font-bold text-xs cursor-pointer transition-all shadow-md flex items-center justify-center space-x-1.5 hover:scale-105 active:scale-95"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

          {/* SCHEDULE (EMPLOI DU TEMPS) TAB */}
          {activeSubTab === 'schedule' && (
            <div className="space-y-4 font-sans">
              {/* Validity Date Range */}
              <div className="glass-panel rounded-[24px] border border-white/8 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-white">
                  <Calendar className="w-4 h-4 text-[#6C5CFF]" />
                  <span>Validité :</span>
                  <span className="text-[#6C5CFF]">{scheduleStartDate}</span>
                  <span className="text-white/40 font-medium">au</span>
                  <span className="text-[#6C5CFF]">{scheduleEndDate}</span>
                </div>
                {isParent && (
                  <button
                    type="button"
                    onClick={() => {
                      const newStart = window.prompt("Modifier la date de début de l'emploi du temps (JJ/MM/AAAA) :", scheduleStartDate);
                      if (newStart) {
                        setScheduleStartDate(newStart);
                        localStorage.setItem('school_sch_start', newStart);
                      }
                      const newEnd = window.prompt("Modifier la date de fin de l'emploi du temps (JJ/MM/AAAA) :", scheduleEndDate);
                      if (newEnd) {
                        setScheduleEndDate(newEnd);
                        localStorage.setItem('school_sch_end', newEnd);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#6C5CFF]/10 hover:bg-[#6C5CFF]/20 border border-[#6C5CFF]/20 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer"
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex space-x-2 mb-2">
                <button type="button" onClick={() => setScheduleViewMode('list')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${scheduleViewMode === 'list' ? 'bg-[#6C5CFF] text-white' : 'bg-white/5 text-white/50'}`}>
                  📝 Vue Liste
                </button>
                <button type="button" onClick={() => setScheduleViewMode('calendar')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${scheduleViewMode === 'calendar' ? 'bg-[#6C5CFF] text-white' : 'bg-white/5 text-white/50'}`}>
                  📅 Vue Calendrier
                </button>
              </div>

              {scheduleViewMode === 'list' ? (
                <>
                  {/* Days Selector */}
                  <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDay(d)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                          selectedDay === d ? 'bg-[#6C5CFF] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  {/* Class list for selected day */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">
                      Cours du {selectedDay} :
                    </span>

                    {schedule.filter(s => s.day === selectedDay).length > 0 ? (
                      schedule
                        .filter(s => s.day === selectedDay)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map(item => (
                          <div key={item.id} className="glass-panel border border-white/8 rounded-[24px] p-4 flex items-center justify-between hover:bg-white/8 transition">
                            <div className="flex items-center space-x-3.5">
                              <div className="p-2.5 rounded-xl bg-[#6C5CFF]/15 text-[#6C5CFF] border border-[#6C5CFF]/20">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-[#6C5CFF] bg-[#6C5CFF]/10 px-2 py-0.5 rounded uppercase">
                                  {item.subject}
                                </span>
                                <h4 className="text-xs font-extrabold text-white mt-1.5">
                                  {item.startTime} - {item.endTime}
                                </h4>
                                <p className="text-[10px] text-white/40 mt-0.5">
                                  Élève: <span className="font-bold text-white">{item.studentName}</span>
                                  {item.room && ` • ${item.room}`}
                                </p>
                              </div>
                            </div>

                            {isParent && (
                              <button
                                onClick={() => handleDeleteSchItem(item.id)}
                                className="p-2 hover:bg-[#FF4D6D]/15 rounded-xl text-[#FF4D6D] transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-white/30 text-center py-8 glass-panel rounded-2xl border border-white/5">
                        Aucun cours planifié pour le {selectedDay}.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* CALENDAR GRID VIEW */
                <div className="glass-panel border border-white/8 rounded-[24px] p-3 overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Header row */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      <div className="text-[8px] font-bold text-white/30 uppercase text-center py-1">Heure</div>
                      {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(d => (
                        <div key={d} className="text-[8px] font-bold text-white/60 uppercase text-center py-1 bg-white/5 rounded-lg">
                          {d.slice(0, 3)}
                        </div>
                      ))}
                    </div>
                    {/* Time rows 8h to 17h */}
                    {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => {
                      const hStr = `${String(hour).padStart(2, '0')}:`;
                      const COLORS = ['#6C5CFF', '#FF4D6D', '#00D26A', '#FFB020', '#4F8CFF', '#E040FB'];
                      return (
                        <div key={hour} className="grid grid-cols-7 gap-0.5 mb-0.5">
                          <div className="text-[9px] font-bold text-white/30 text-center py-2">{hStr}00</div>
                          {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(day => {
                            const classesInSlot = schedule.filter(s => {
                              const sH = parseInt(s.startTime.split(':')[0]);
                              const eH = parseInt(s.endTime.split(':')[0]);
                              return s.day === day && sH <= hour && eH > hour;
                            });
                            const cls = classesInSlot[0];
                            if (!cls) return <div key={day} className="bg-white/[0.02] rounded border border-white/[0.03] min-h-[32px]" />;
                            const subIdx = subjectsList.indexOf(cls.subject) % COLORS.length;
                            const col = COLORS[subIdx >= 0 ? subIdx : 0];
                            return (
                              <div key={day} className="rounded border min-h-[32px] p-1 flex flex-col justify-center" style={{ backgroundColor: `${col}15`, borderColor: `${col}30` }}>
                                <span className="text-[7px] font-extrabold truncate" style={{ color: col }}>{cls.subject}</span>
                                <span className="text-[7px] text-white/40 truncate">{cls.studentName}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Class Form (Parents only) */}
              {isParent && (
                <form onSubmit={handleAddSchItem} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 mt-6">
                  <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#6C5CFF]" />
                    <span>Ajouter un cours à l'emploi du temps ⏰</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Élève</label>
                      <select
                        value={formSchStudentId}
                        onChange={(e) => setFormSchStudentId(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        {studentList.map(student => (
                          <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">Matière</label>
                      <select
                        value={formSchSubject}
                        onChange={(e) => handleSubjectChange(e.target.value, setFormSchSubject)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        {subjectsList.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="AUTRE_MANUEL">✍️ Autre (Saisie manuelle)...</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Jour</label>
                      <select
                        value={formSchDay}
                        onChange={(e) => setFormSchDay(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Lundi">Lundi</option>
                        <option value="Mardi">Mardi</option>
                        <option value="Mercredi">Mercredi</option>
                        <option value="Jeudi">Jeudi</option>
                        <option value="Vendredi">Vendredi</option>
                        <option value="Samedi">Samedi</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Début</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: 08:30"
                        value={formSchStartTime}
                        onChange={(e) => setFormSchStartTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Fin</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: 09:30"
                        value={formSchEndTime}
                        onChange={(e) => setFormSchEndTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Salle (Optionnel)</label>
                    <input
                      type="text"
                      placeholder="ex: Salle 102 ou Classe A1"
                      value={formSchRoom}
                      onChange={(e) => setFormSchRoom(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-[18px] bg-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#6C5CFF]/20"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Planifier ce cours</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* GRADES (NOTES SCHOLAIRES) TAB */}
          {activeSubTab === 'grades' && (
            <div className="space-y-6">
              {/* Averages cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel border border-[#6C5CFF]/20 bg-[#6C5CFF]/5 rounded-[28px] p-5 text-center space-y-2">
                  <TrendingUp className="w-6 h-6 text-[#6C5CFF] mx-auto animate-pulse" />
                  <h4 className="text-xs font-bold text-white/60">Moyenne Amadou</h4>
                  <p className="text-2xl font-extrabold text-[#6C5CFF]">{getStudentAverage('3')}</p>
                </div>
                <div className="glass-panel border border-[#00D26A]/20 bg-[#00D26A]/5 rounded-[28px] p-5 text-center space-y-2">
                  <TrendingUp className="w-6 h-6 text-[#00D26A] mx-auto animate-pulse" />
                  <h4 className="text-xs font-bold text-white/60">Moyenne Awa</h4>
                  <p className="text-2xl font-extrabold text-[#00D26A]">{getStudentAverage('4')}</p>
                </div>
              </div>

              {/* Grades List */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">
                  Dernières Notes Reçues :
                </span>

                {grades.length > 0 ? (
                  grades.map(grade => (
                    <div key={grade.id} className="glass-panel border border-white/8 rounded-[24px] p-4 flex items-center justify-between hover:bg-white/8 transition">
                      <div className="flex items-center space-x-3.5">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-extrabold text-[#FFB020]">
                            {grade.value}/{grade.max}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[9px] font-bold text-[#6C5CFF] bg-[#6C5CFF]/15 px-2 py-0.5 rounded">
                              {grade.subject}
                            </span>
                            <span className="text-[9px] font-bold text-white/40">
                              Coef: {grade.coef}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-white mt-1.5">
                            {grade.examTitle}
                          </h4>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            Élève: <span className="font-bold text-white">{grade.studentName}</span> • Reçu le {grade.date}
                          </p>
                        </div>
                      </div>

                      {isParent && (
                        <button
                          onClick={() => handleDeleteGrade(grade.id)}
                          className="p-2 hover:bg-[#FF4D6D]/15 rounded-xl text-[#FF4D6D] transition animate-pulse"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/30 text-center py-8 glass-panel rounded-2xl border border-white/5">
                    Aucune note enregistrée pour le moment.
                  </p>
                )}
              </div>

              {/* Add Grade Form (Parents only) */}
              {isParent && (
                <form onSubmit={handleAddGrade} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
                  <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#6C5CFF]" />
                    <span>Ajouter une note au bulletin 🎯</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Élève</label>
                      <select
                        value={formGradeStudentId}
                        onChange={(e) => setFormGradeStudentId(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        {studentList.map(student => (
                          <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">Matière</label>
                      <select
                        value={formGradeSubject}
                        onChange={(e) => handleSubjectChange(e.target.value, setFormGradeSubject)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      >
                        {subjectsList.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="AUTRE_MANUEL">✍️ Autre (Saisie manuelle)...</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Note</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={formGradeValue}
                        onChange={(e) => setFormGradeValue(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Sur</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formGradeMax}
                        onChange={(e) => setFormGradeMax(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                    <div className="space-y-1.5 font-medium text-left">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Coef</label>
                      <input
                        type="number"
                        required
                        min="0.25"
                        step="0.25"
                        value={formGradeCoef}
                        onChange={(e) => setFormGradeCoef(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Titre de l'évaluation</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: DST fractions ou Dictée de Printemps..."
                      value={formGradeExamTitle}
                      onChange={(e) => setFormGradeExamTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-[18px] bg-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#6C5CFF]/20"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Enregistrer cette note</span>
                  </button>
                </form>
              )}
            </div>
          )}

    </div>
  );
};
