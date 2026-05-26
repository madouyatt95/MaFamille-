import React, { useState, useRef } from 'react';
import { 
  X, 
  Calendar, 
  Wallet, 
  Brush, 
  FolderLock, 
  UserPlus, 
  CheckCircle2,
  FileText,
  ShieldAlert,
  Camera,
  Sparkles,
  Loader
} from 'lucide-react';
import type { Member, EventType, TransactionType } from '../types';

interface QuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onAddEvent: (event: any) => void;
  onAddTransaction: (transaction: any) => void;
  onAddTask: (task: any) => void;
  onNavigateToVault?: () => void;
  onNavigateToMembers?: () => void;
  onTriggerSos?: () => void;
}

type AddTab = 'event' | 'transaction' | 'task' | 'document' | 'member';

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({
  isOpen,
  onClose,
  members,
  onAddEvent,
  onAddTransaction,
  onAddTask,
  onNavigateToVault,
  onNavigateToMembers,
  onTriggerSos
}) => {
  const [activeTab, setActiveTab] = useState<AddTab>('event');
  const [showSuccess, setShowSuccess] = useState(false);

  // Gemini AI OCR Receipt scanner state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const mimeType = file.type || 'image/jpeg';
          
          const useProxy = !import.meta.env.DEV || !import.meta.env.VITE_GEMINI_API_KEY;
          const geminiEndpoint = useProxy
            ? (import.meta.env.DEV ? 'https://ma-famille-nu.vercel.app/api/gemini' : '/api/gemini')
            : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

          const requestBody = {
            contents: [
              {
                parts: [
                  {
                    text: "Analyse ce ticket de caisse et renvoie uniquement un objet JSON valide (SANS blocs de code markdown ```json, SANS texte autour) contenant exactement ces clés : 'merchant' (nom du magasin/titre de l'achat), 'amount' (montant total en nombre décimal, ex: 12.50), 'category' (parmi: 'Alimentation', 'Logement', 'Transport', 'Santé', 'Éducation', 'Loisirs', 'Divers')."
                  },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          };

          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (!useProxy && import.meta.env.VITE_GEMINI_API_KEY) {
            headers['Authorization'] = `Bearer ${import.meta.env.VITE_GEMINI_API_KEY}`;
          }

          const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            throw new Error(`Erreur API Gemini: ${response.status}`);
          }

          const result = await response.json();
          const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (textResponse) {
            const cleanJsonText = textResponse.replace(/```json/i, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanJsonText);
            
            if (parsedData.merchant) setTransTitle(parsedData.merchant);
            if (parsedData.amount) setTransAmount(String(parsedData.amount));
            if (parsedData.category) setTransCat(parsedData.category);
          } else {
            throw new Error("L'IA n'a pas pu extraire de texte du ticket.");
          }
        } catch (err: any) {
          console.error("OCR Extraction error:", err);
          setOcrError("L'IA n'a pas réussi à analyser ce ticket. Saisie manuelle disponible.");
        } finally {
          setOcrLoading(false);
        }
      };

      reader.onerror = () => {
        setOcrError("Impossible de lire le fichier de l'image.");
        setOcrLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setOcrError("Erreur lors de la préparation de l'image.");
      setOcrLoading(false);
    }
  };

  // Form states
  // Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('social');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventMemberId, setEventMemberId] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // Transaction
  const [transTitle, setTransTitle] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transType, setTransType] = useState<TransactionType>('expense');
  const [transCat, setTransCat] = useState('Alimentation');
  const [transMemberId, setTransMemberId] = useState('');

  // Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPoints, setTaskPoints] = useState('10');
  const [taskMemberId, setTaskMemberId] = useState('');
  const [taskRotation, setTaskRotation] = useState<'daily' | 'weekly' | 'none'>('daily');
  const [taskDue, setTaskDue] = useState('Ce soir');




  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
      // Reset forms
      resetForms();
    }, 1500);
  };

  const resetForms = () => {
    setEventTitle(''); setEventDate(''); setEventTime(''); setEventMemberId(''); setEventLoc(''); setEventDesc('');
    setTransTitle(''); setTransAmount(''); setTransMemberId('');
    setTaskTitle(''); setTaskMemberId('');
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate) return;
    const member = members.find(m => m.id === eventMemberId);
    onAddEvent({
      title: eventTitle,
      type: eventType,
      dateTime: `${eventDate}T${eventTime || '12:00'}:00`,
      time: eventTime || 'Toute la journée',
      memberId: eventMemberId || undefined,
      memberName: member?.name || undefined,
      location: eventLoc || undefined,
      description: eventDesc || undefined,
      done: false
    });
    triggerSuccess();
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transTitle || !transAmount) return;
    const member = members.find(m => m.id === transMemberId);
    onAddTransaction({
      amount: parseFloat(transAmount),
      type: transType,
      category: transCat,
      date: new Date().toISOString().split('T')[0],
      title: transTitle,
      memberId: transMemberId || undefined,
      memberName: member?.name || undefined
    });
    triggerSuccess();
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskMemberId) return;
    const member = members.find(m => m.id === taskMemberId);
    onAddTask({
      title: taskTitle,
      rewardPoints: parseInt(taskPoints) || 10,
      assignedMemberId: taskMemberId,
      assignedMemberName: member?.name || 'Inconnu',
      done: false,
      rotation: taskRotation,
      validatedByParent: false,
      dueDate: taskDue
    });
    triggerSuccess();
  };



  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Modal panel container */}
      <div 
        className={`fixed bottom-0 left-0 right-0 max-h-[85vh] glass-panel border-t border-white/10 z-50 rounded-t-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-300 ease-out transform ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        } max-w-2xl mx-auto`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide">Ajouter un élément</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showSuccess ? (
          /* Success Screen */
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#00D26A] animate-bounce" />
            <h3 className="text-xl font-bold text-white">Ajouté avec succès !</h3>
            <p className="text-sm text-white/50">Mise à jour de votre OS familial en cours...</p>
          </div>
        ) : (
          /* Forms Interface */
          <>
            {/* SOS Emergency Button */}
            <div className="px-4 pt-4 shrink-0">
              <button 
                onClick={() => {
                  if (onTriggerSos) onTriggerSos();
                  onClose();
                }}
                className="w-full py-3 bg-[#FF4D6D] text-white rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-[#FF4D6D]/95 active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#FF4D6D]/30 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 animate-pulse" />
                <span>🚨 Déclencher Alerte SOS 🚨</span>
              </button>
            </div>

            {/* Tabs selector */}
            <div className="px-4 pt-2 flex space-x-2 overflow-x-auto no-scrollbar border-b border-white/5 pb-3">
              <button
                onClick={() => setActiveTab('event')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all border shrink-0 cursor-pointer ${
                  activeTab === 'event'
                    ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-[0_0_12px_rgba(108,92,255,0.2)]'
                    : 'bg-white/5 border-transparent text-white/50 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>
              
              <button
                onClick={() => setActiveTab('transaction')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all border shrink-0 cursor-pointer ${
                  activeTab === 'transaction'
                    ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-[0_0_12px_rgba(108,92,255,0.2)]'
                    : 'bg-white/5 border-transparent text-white/50 hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Finance</span>
              </button>
              
              <button
                onClick={() => setActiveTab('task')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all border shrink-0 cursor-pointer ${
                  activeTab === 'task'
                    ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-[0_0_12px_rgba(108,92,255,0.2)]'
                    : 'bg-white/5 border-transparent text-white/50 hover:text-white'
                }`}
              >
                <Brush className="w-3.5 h-3.5" />
                <span>Tâche</span>
              </button>
              
              <button
                onClick={() => setActiveTab('document')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all border shrink-0 cursor-pointer ${
                  activeTab === 'document'
                    ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-[0_0_12px_rgba(108,92,255,0.2)]'
                    : 'bg-white/5 border-transparent text-white/50 hover:text-white'
                }`}
              >
                <FolderLock className="w-3.5 h-3.5" />
                <span>Document</span>
              </button>

              <button
                onClick={() => setActiveTab('member')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider transition-all border shrink-0 cursor-pointer ${
                  activeTab === 'member'
                    ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-[0_0_12px_rgba(108,92,255,0.2)]'
                    : 'bg-white/5 border-transparent text-white/50 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Membre</span>
              </button>
            </div>

            {/* Active Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              
              {/* Event Form */}
              {activeTab === 'event' && (
                <form onSubmit={handleEventSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Titre de l'événement</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Rendez-vous dentiste, Devoirs d'anglais..." 
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-[18px] bg-white/5 border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] focus:ring-1 focus:ring-[#6C5CFF] transition-all placeholder-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Type</label>
                      <select 
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value as EventType)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="social">Social / Loisirs</option>
                        <option value="medical">Médical</option>
                        <option value="school">École</option>
                        <option value="bill">Facture</option>
                        <option value="grocery">Courses</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Membre concerné</label>
                      <select 
                        value={eventMemberId}
                        onChange={(e) => setEventMemberId(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="">Famille complète</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Date</label>
                      <input 
                        type="date" 
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Heure</label>
                      <input 
                        type="time" 
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Lieu</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Clinique de la Paix, École, Zoom..." 
                      value={eventLoc}
                      onChange={(e) => setEventLoc(e.target.value)}
                      className="w-full px-4 py-3 rounded-[18px] bg-white/5 border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all placeholder-white/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Description</label>
                    <textarea 
                      rows={2}
                      placeholder="Détails supplémentaires..." 
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      className="w-full px-4 py-3 rounded-[18px] bg-white/5 border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all placeholder-white/30 resize-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-4 rounded-[22px] bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white font-semibold text-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-[0_4px_15px_rgba(108,92,255,0.4)]"
                  >
                    Confirmer l'événement
                  </button>
                </form>
              )}

              {/* Transaction Form */}
              {activeTab === 'transaction' && (
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  {/* AI Ticket Scan Section */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6C5CFF]/10 to-[#4F8CFF]/10 border border-[#6C5CFF]/25 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[#6C5CFF] animate-pulse" />
                        <span className="text-xs font-black text-white uppercase tracking-wider">Scanner Intelligent IA</span>
                      </div>
                      <span className="text-[10px] text-white/40 font-semibold uppercase">Propulsé par Gemini</span>
                    </div>
                    
                    <p className="text-[11px] text-white/60 leading-normal">
                      Scannez ou importez une photo de votre ticket de caisse. Notre IA en extraira automatiquement le montant, le marchand et la catégorie !
                    </p>

                    <input 
                      type="file" 
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleOcrFileChange}
                      className="hidden"
                    />

                    {ocrLoading ? (
                      <div className="py-3 flex items-center justify-center space-x-2 text-xs font-bold text-[#6C5CFF] bg-[#6C5CFF]/5 border border-[#6C5CFF]/20 rounded-xl">
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyse du ticket par Gemini...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 bg-[#6C5CFF] hover:bg-[#6C5CFF]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Prendre en photo / Importer le ticket</span>
                      </button>
                    )}

                    {ocrError && (
                      <p className="text-[10px] font-bold text-red-400 text-center">{ocrError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Description de la transaction</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Plein carburant, Achat Supermarché, Salaire..." 
                      value={transTitle}
                      onChange={(e) => setTransTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-[18px] bg-white/5 border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all placeholder-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Montant (Euros)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="0.00" 
                        value={transAmount}
                        onChange={(e) => setTransAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-white/5 border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all placeholder-white/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Type</label>
                      <select 
                        value={transType}
                        onChange={(e) => setTransType(e.target.value as TransactionType)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="expense">Dépense (-)</option>
                        <option value="income">Revenu (+)</option>
                        <option value="savings">Épargne (→)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Catégorie</label>
                      <select 
                        value={transCat}
                        onChange={(e) => setTransCat(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="Alimentation">Alimentation</option>
                        <option value="Logement">Logement</option>
                        <option value="Transport">Transport</option>
                        <option value="Santé">Santé</option>
                        <option value="Éducation">Éducation</option>
                        <option value="Loisirs">Loisirs</option>
                        <option value="Divers">Divers</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Auteur</label>
                      <select 
                        value={transMemberId}
                        onChange={(e) => setTransMemberId(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="">Non assigné</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-4 rounded-[22px] bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white font-semibold text-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-[0_4px_15px_rgba(108,92,255,0.4)]"
                  >
                    Enregistrer la transaction
                  </button>
                </form>
              )}

              {/* Task Form */}
              {activeTab === 'task' && (
                <form onSubmit={handleTaskSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Titre de la tâche</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Passer l'aspirateur, Sortir le chien..." 
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-[18px] bg-white/5 border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all placeholder-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Attribuer à</label>
                      <select 
                        required
                        value={taskMemberId}
                        onChange={(e) => setTaskMemberId(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="">Sélectionner...</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Récompense (Points)</label>
                      <select 
                        value={taskPoints}
                        onChange={(e) => setTaskPoints(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="5">5 points (0,50 €)</option>
                        <option value="10">10 points (1,00 €)</option>
                        <option value="15">15 points (1,50 €)</option>
                        <option value="20">20 points (2,00 €)</option>
                        <option value="50">50 points (5,00 €)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Rotation</label>
                      <select 
                        value={taskRotation}
                        onChange={(e) => setTaskRotation(e.target.value as any)}
                        className="w-full px-4 py-3 rounded-[18px] bg-[#07111F] border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all"
                      >
                        <option value="daily">Quotidienne</option>
                        <option value="weekly">Hebdomadaire</option>
                        <option value="none">Pas de rotation</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Échéance</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Ce soir, 19h00, Samedi..." 
                        value={taskDue}
                        onChange={(e) => setTaskDue(e.target.value)}
                        className="w-full px-4 py-3 rounded-[18px] bg-white/5 border border-white/8 text-white focus:outline-none focus:border-[#6C5CFF] transition-all placeholder-white/30"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-4 rounded-[22px] bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white font-semibold text-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-[0_4px_15px_rgba(108,92,255,0.4)]"
                  >
                    Créer la tâche
                  </button>
                </form>
              )}

              {/* Document Form */}
              {activeTab === 'document' && (
                <div className="space-y-6 flex flex-col items-center justify-center py-6">
                  <div className="p-4 bg-[#6C5CFF]/10 rounded-full mb-2">
                    <FileText className="w-10 h-10 text-[#6C5CFF]" />
                  </div>
                  <h3 className="text-base font-bold text-white text-center">Coffre-Fort Avancé</h3>
                  <p className="text-xs text-white/50 text-center px-4 max-w-sm">
                    L'ajout de documents utilise désormais le nouveau système intelligent. Scannez vos fichiers et classez-les facilement.
                  </p>
                  
                  <button 
                    type="button" 
                    onClick={() => {
                      if (onNavigateToVault) onNavigateToVault();
                      onClose();
                    }}
                    className="w-full mt-4 py-4 rounded-[22px] bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white font-semibold text-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-[0_4px_15px_rgba(108,92,255,0.4)] flex justify-center items-center space-x-2"
                  >
                    <span>Ouvrir le Coffre-Fort</span>
                  </button>
                </div>
              )}

              {/* Member Form */}
              {activeTab === 'member' && (
                <div className="space-y-4 py-2 text-center">
                  <div className="inline-flex p-3 rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 animate-pulse">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Unification de la Gestion 👨‍👩‍👧</h4>
                    <p className="text-xs text-white/50 leading-relaxed max-w-xs mx-auto mt-1.5 font-medium">
                      Pour garantir une sécurité et une cohérence absolue, l'ajout local de profils de santé et l'envoi d'invitations officielles par e-mail avec codes de foyer se font désormais depuis le panneau principal.
                    </p>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      if (onNavigateToMembers) onNavigateToMembers();
                      onClose();
                    }}
                    className="w-full py-4 rounded-[22px] bg-gradient-to-r from-[#6C5CFF] to-[#4F8CFF] text-white font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-[0_4px_15px_rgba(108,92,255,0.4)] flex justify-center items-center space-x-2"
                  >
                    <span>Aller à la Gestion des Membres ➔</span>
                  </button>
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </>
  );
};
