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
  ArrowLeft
} from 'lucide-react';
import type { SchoolTask } from '../../types';

interface TuteurScolaireProps {
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  activeMemberId: string;
}

export const TuteurScolaire: React.FC<TuteurScolaireProps> = ({ 
  schoolTasks, 
  setSchoolTasks, 
  activeMemberId 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'devoirs' | 'quizzes'>('devoirs');
  const isParent = activeMemberId === '1' || activeMemberId === '2';
  
  // Quiz State
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

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

  const activeQuiz = 
    selectedSubject === 'maths' ? mathQuiz : 
    selectedSubject === 'histoire' ? historyQuiz : 
    selectedSubject === 'sciences' ? sciencesQuiz : 
    francaisQuiz;

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
      <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 flex">
        <button
          onClick={() => setActiveSubTab('devoirs')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'devoirs' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Devoirs & Récompenses
        </button>
        <button
          onClick={() => setActiveSubTab('quizzes')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'quizzes' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Tuteur IA & Quizzes
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

                return (
                  <div key={task.id} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3.5 relative overflow-hidden transition-all hover:bg-white/8">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-extrabold text-[#6C5CFF] bg-[#6C5CFF]/15 px-2.5 py-0.5 rounded-full border border-[#6C5CFF]/20 uppercase tracking-wider">
                          {task.subject}
                        </span>
                        <h3 className="text-sm font-extrabold text-white mt-2 leading-relaxed">{task.title}</h3>
                        <p className="text-[10px] text-white/40 mt-1">Par: {getChildName(task.assignedMemberId)} • Limite: {task.dueDate}</p>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-[#FFB020] bg-[#FFB020]/10 px-2 py-1 rounded-lg block">
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
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Matière</label>
                    <select
                      value={newHomeworkSubject}
                      onChange={(e) => setNewHomeworkSubject(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="Mathématiques">Mathématiques</option>
                      <option value="Histoire-Géographie">Histoire-Géo</option>
                      <option value="Sciences / SVT">Sciences / SVT</option>
                      <option value="Français">Français</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5 font-medium">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Élève</label>
                    <select
                      value={newHomeworkAssignee}
                      onChange={(e) => setNewHomeworkAssignee(e.target.value)}
                      className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="3">Amadou (12 ans)</option>
                      <option value="4">Awa (8 ans)</option>
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
          
          {!selectedSubject ? (
            /* Quiz selection */
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Choisissez votre matière de révision :</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('maths')}
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
                  onClick={() => setSelectedSubject('histoire')}
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
                  onClick={() => setSelectedSubject('sciences')}
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
                  onClick={() => setSelectedSubject('francais')}
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

              <h3 className="text-sm font-bold text-white leading-relaxed">
                {activeQuiz[currentQuestionIndex].q}
              </h3>

              <div className="space-y-2.5">
                {activeQuiz[currentQuestionIndex].options.map((opt, idx) => {
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

    </div>
  );
};
