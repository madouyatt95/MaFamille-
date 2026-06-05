import React, { useState } from 'react';
import { 
  Landmark, 
  GraduationCap, 
  AlertTriangle, 
  CheckSquare, 
  Plus, 
  Send, 
  UserCheck, 
  BookOpen, 
  ClipboardList, 
  ArrowLeft
} from 'lucide-react';

// ==========================================
// 🏛️ MODULE DE LA COMMUNE (DEMO)
// ==========================================
interface DemoCommuneProps {
  demoProfileId: string;
  demoCommuneAlerts: any[];
  setDemoCommuneAlerts: React.Dispatch<React.SetStateAction<any[]>>;
  demoCommunePoll: any;
  setDemoCommunePoll: React.Dispatch<React.SetStateAction<any>>;
  demoSignalements: any[];
  setDemoSignalements: React.Dispatch<React.SetStateAction<any[]>>;
  onBack: () => void;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
}

export const DemoCommune: React.FC<DemoCommuneProps> = ({
  demoProfileId,
  demoCommuneAlerts,
  setDemoCommuneAlerts,
  demoCommunePoll,
  setDemoCommunePoll,
  demoSignalements,
  setDemoSignalements,
  onBack,
  triggerDemoNotification
}) => {
  const isCommuneAdmin = demoProfileId === 'demo_commune_admin';
  const isCommuneAgent = demoProfileId === 'demo_commune_agent';
  const isCitizen = !isCommuneAdmin && !isCommuneAgent;

  // Local state for reporting damage form
  const [newSignalementTitle, setNewSignalementTitle] = useState('');
  const [newSignalementDesc, setNewSignalementDesc] = useState('');

  // Local state for creating alerts (Admin)
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertDesc, setNewAlertDesc] = useState('');

  // Handle citizen reporting
  const handleAddSignalement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSignalementTitle.trim() || !newSignalementDesc.trim()) return;

    const newSig = {
      id: `sig-${Date.now()}`,
      title: newSignalementTitle.trim(),
      description: newSignalementDesc.trim(),
      status: 'En attente',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      author: demoProfileId === 'demo_papa' ? 'Mamadou Diop' : 'Aminata Diop'
    };

    setDemoSignalements(prev => [newSig, ...prev]);
    setNewSignalementTitle('');
    setNewSignalementDesc('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "📢 Nouveau Signalement",
        `${newSig.author} a signalé : "${newSig.title}"`,
        "commune"
      );
    }
    alert("📢 Signalement envoyé avec succès ! L'agent municipal va recevoir votre demande.");
  };

  // Handle admin creating alert
  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertTitle.trim() || !newAlertDesc.trim()) return;

    const newAlert = {
      id: `ca-${Date.now()}`,
      title: newAlertTitle.trim(),
      description: newAlertDesc.trim(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type: 'warning'
    };

    setDemoCommuneAlerts(prev => [newAlert, ...prev]);
    setNewAlertTitle('');
    setNewAlertDesc('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🚧 Alerte Mairie",
        `Nouvelle alerte vigilance : "${newAlert.title}"`,
        "commune"
      );
    }
    alert("🚧 Alerte communale publiée ! Elle apparaîtra sur l'accueil des familles et sur la Timeline.");
  };

  // Handle citizen voting in the consultation
  const handleVote = (optionIndex: number) => {
    if (demoProfileId !== 'demo_papa' && demoProfileId !== 'demo_maman') {
      alert("🔒 Seuls les parents (Mamadou & Aminata) peuvent voter dans cette consultation municipale.");
      return;
    }

    let optionText = '';
    setDemoCommunePoll((prev: any) => {
      optionText = prev.options[optionIndex]?.text || '';
      const updatedOptions = prev.options.map((opt: any, idx: number) => {
        // Remove vote if already present in any option
        let votes = opt.votes.filter((v: string) => v !== demoProfileId);
        if (idx === optionIndex) {
          votes.push(demoProfileId);
        }
        return { ...opt, votes };
      });
      return { ...prev, options: updatedOptions };
    });

    if (triggerDemoNotification) {
      const voterName = demoProfileId === 'demo_papa' ? 'Mamadou' : 'Aminata';
      triggerDemoNotification(
        "🗳️ Consultation Mairie",
        `${voterName} a voté pour : "${optionText}"`,
        "commune"
      );
    }
    alert("🗳️ Vote enregistré ! Les résultats cumulés sont mis à jour en temps réel à la mairie.");
  };

  // Handle agent updating signalement status
  const handleUpdateSignalementStatus = (sigId: string, newStatus: string) => {
    setDemoSignalements(prev => prev.map(s => {
      if (s.id === sigId) {
        if (triggerDemoNotification) {
          triggerDemoNotification(
            "🛠️ Suivi Signalement",
            `Le signalement "${s.title}" est désormais : ${newStatus}`,
            "commune"
          );
        }
        return { ...s, status: newStatus };
      }
      return s;
    }));
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 rounded-2xl bg-[#FF9F1C]/10 border border-[#FF9F1C]/20 text-[#FF9F1C]">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Ma Commune</h1>
            <p className="text-xs text-white/50 font-medium">Portail municipal connecté de Cormeilles-en-Parisis</p>
          </div>
        </div>
        
        <span className="text-[10px] font-bold uppercase bg-[#FF9F1C]/10 border border-[#FF9F1C]/25 text-[#FF9F1C] px-3 py-1.5 rounded-full">
          {isCommuneAdmin ? '🏛️ Espace Maire / Admin' : isCommuneAgent ? '👷 Espace Agent' : '👨‍👩‍👧‍👦 Citoyen'}
        </span>
      </div>

      {/* CITIZEN VIEW */}
      {isCitizen && (
        <div className="space-y-6">
          {/* Active Alerts */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider block">🚨 Vigilance & Alertes Locales</h3>
            {demoCommuneAlerts.length > 0 ? (
              <div className="space-y-2.5">
                {demoCommuneAlerts.map(alert => (
                  <div key={alert.id} className="glass-panel border-red-500/25 bg-gradient-to-r from-red-500/10 to-transparent p-4 rounded-2xl flex items-start space-x-3 animate-fade-in">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                      <p className="text-[11px] text-white/60 font-sans mt-0.5">{alert.description}</p>
                      <span className="text-[9px] text-white/30 font-semibold block mt-1.5">Publié à {alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-white/40 font-sans">
                Aucune alerte active dans la commune.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Public Consultation (Poll) */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🗳️</span>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Consultation Citoyenne</h4>
              </div>
              <div className="bg-[#07111F]/50 p-4 rounded-2xl border border-white/5 space-y-3">
                <div>
                  <h5 className="text-xs font-bold text-white">{demoCommunePoll.question}</h5>
                  <p className="text-[10px] text-white/50 font-sans mt-0.5 leading-relaxed">{demoCommunePoll.description}</p>
                </div>

                <div className="space-y-2 pt-2">
                  {demoCommunePoll.options.map((opt: any, idx: number) => {
                    const hasVoted = opt.votes.includes(demoProfileId);
                    const totalVotes = demoCommunePoll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                    const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleVote(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all relative overflow-hidden group cursor-pointer ${
                          hasVoted 
                            ? 'bg-[#FF9F1C]/15 border-[#FF9F1C] text-white font-bold' 
                            : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {/* Progress Bar background */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-[#FF9F1C]/10 transition-all duration-500 z-0"
                          style={{ width: `${percent}%` }}
                        />
                        <div className="relative z-10 flex justify-between items-center">
                          <span>{opt.text}</span>
                          <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md font-bold text-[#FF9F1C]">
                            {percent}% ({opt.votes.length} vote{opt.votes.length > 1 ? 's' : ''})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Signalements Citoyens (Citizen Damage Reporting) */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📢</span>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Signaler un Incident</h4>
              </div>

              {/* Form */}
              <form onSubmit={handleAddSignalement} className="space-y-3 text-xs">
                <input 
                  type="text"
                  placeholder="Ex: Réverbère en panne, Dépôt sauvage..."
                  required
                  value={newSignalementTitle}
                  onChange={(e) => setNewSignalementTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#FF9F1C]/65 transition-all"
                />
                <textarea 
                  placeholder="Décrivez précisément l'incident et sa localisation (ex: Rue Jeanne d'Arc)"
                  required
                  rows={2}
                  value={newSignalementDesc}
                  onChange={(e) => setNewSignalementDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#FF9F1C]/65 transition-all font-sans"
                />
                <button 
                  type="submit" 
                  className="w-full py-2.5 rounded-xl bg-[#FF9F1C] text-[#07111F] font-bold hover:opacity-90 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer à la Mairie</span>
                </button>
              </form>

              {/* List of reports */}
              <div className="space-y-2.5 pt-2 max-h-[220px] overflow-y-auto no-scrollbar">
                <h5 className="text-[10px] font-black uppercase text-white/45 tracking-wider">Suivi des Signalements</h5>
                {demoSignalements.map(sig => (
                  <div key={sig.id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-extrabold text-white">{sig.title}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        sig.status === 'Résolu' 
                          ? 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]' 
                          : sig.status === 'En cours' 
                            ? 'bg-[#FF9F1C]/10 border border-[#FF9F1C]/25 text-[#FF9F1C]' 
                            : 'bg-white/10 text-white/50'
                      }`}>
                        {sig.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50 font-sans leading-relaxed">{sig.description}</p>
                    <span className="text-[9px] text-white/30 block font-semibold">{sig.author} • {sig.date} à {sig.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MUNICIPAL VIEW */}
      {isCommuneAdmin && (
        <div className="space-y-6">
          {/* Key Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Population</span>
              <p className="text-xl font-black text-white">18 200</p>
            </div>
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Agents actifs</span>
              <p className="text-xl font-black text-[#FF9F1C]">42</p>
            </div>
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Interventions</span>
              <p className="text-xl font-black text-[#00D26A]">12 en cours</p>
            </div>
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Satisfaction</span>
              <p className="text-xl font-black text-[#FF9F1C]">89%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Alert */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">🚧 Publier une Alerte Travaux / Vigilance</h4>
              <form onSubmit={handleAddAlert} className="space-y-3 text-xs">
                <input 
                  type="text"
                  placeholder="Titre de l'alerte (ex: Alerte Vigilance Orages)"
                  required
                  value={newAlertTitle}
                  onChange={(e) => setNewAlertTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FF9F1C]/65 transition-all"
                />
                <textarea 
                  placeholder="Détails de l'alerte..."
                  required
                  rows={3}
                  value={newAlertDesc}
                  onChange={(e) => setNewAlertDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FF9F1C]/65 transition-all font-sans"
                />
                <button 
                  type="submit" 
                  className="w-full py-2.5 rounded-xl bg-[#FF9F1C] text-[#07111F] font-bold hover:opacity-90 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>Publier l'Alerte aux Habitants</span>
                </button>
              </form>
            </div>

            {/* Admin poll results (live) */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">🗳️ Suivi de la Consultation en Mairie</h4>
              <div className="bg-[#07111F]/50 p-4 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-[#FF9F1C]">{demoCommunePoll.question}</h5>
                  <p className="text-[10px] text-white/45 font-sans mt-0.5 leading-relaxed">Résultats des votes cumulés en temps réel dans Cormeilles-en-Parisis.</p>
                </div>

                <div className="space-y-3 pt-1">
                  {demoCommunePoll.options.map((opt: any, idx: number) => {
                    const totalVotes = demoCommunePoll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                    const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                    return (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex justify-between text-[11px] font-medium text-white/80">
                          <span>{opt.text}</span>
                          <span className="font-bold">{percent}% ({opt.votes.length} vote{opt.votes.length > 1 ? 's' : ''})</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#FF9F1C] to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MUNICIPAL AGENT VIEW */}
      {isCommuneAgent && (
        <div className="space-y-4">
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">👷 Queue des Interventions Techniques</h4>
          
          {demoSignalements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demoSignalements.map(sig => (
                <div key={sig.id} className="glass-panel border-white/8 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white">{sig.title}</h4>
                      <p className="text-[10px] text-white/40 mt-0.5 font-sans">Signalé par {sig.author} le {sig.date}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                      sig.status === 'Résolu' 
                        ? 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]' 
                        : sig.status === 'En cours' 
                          ? 'bg-[#FF9F1C]/10 border border-[#FF9F1C]/25 text-[#FF9F1C]' 
                          : 'bg-white/10 text-white/50'
                    }`}>
                      {sig.status}
                    </span>
                  </div>

                  <p className="text-xs text-white/65 font-sans bg-white/5 p-3 rounded-xl leading-relaxed border border-white/5">
                    {sig.description}
                  </p>

                  <div className="flex space-x-2 pt-1">
                    <button 
                      onClick={() => handleUpdateSignalementStatus(sig.id, 'En cours')}
                      disabled={sig.status === 'En cours'}
                      className="flex-1 py-1.5 rounded-lg border border-[#FF9F1C]/35 text-[#FF9F1C] hover:bg-[#FF9F1C]/10 text-[10px] font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      🛠️ Prendre en charge
                    </button>
                    <button 
                      onClick={() => {
                        handleUpdateSignalementStatus(sig.id, 'Résolu');
                        alert("✅ Signalement marqué résolu ! L'habitant verra son statut mis à jour.");
                      }}
                      disabled={sig.status === 'Résolu'}
                      className="flex-1 py-1.5 rounded-lg bg-[#00D26A] text-[#07111F] text-[10px] font-bold transition-all hover:opacity-95 disabled:opacity-40 cursor-pointer"
                    >
                      ✓ Résoudre l'incident
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center glass-panel border-white/5 rounded-2xl text-xs text-white/45 font-sans">
              Aucun incident signalé en cours de traitement.
            </div>
          )}
        </div>
      )}

    </div>
  );
};


// ==========================================
// 🏫 ECOLE & ETABLISSEMENTS SCOLARDS (DEMO)
// ==========================================
interface DemoEtablissementProps {
  demoProfileId: string;
  demoSchoolPresence: any;
  setDemoSchoolPresence: React.Dispatch<React.SetStateAction<any>>;
  demoSchoolCantine: any;
  setDemoSchoolCantine: React.Dispatch<React.SetStateAction<any>>;
  demoTransactions: any[];
  setDemoTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolHomework: any[];
  setDemoSchoolHomework: React.Dispatch<React.SetStateAction<any[]>>;
  demoSchoolComms: any[];
  setDemoSchoolComms: React.Dispatch<React.SetStateAction<any[]>>;
  onBack: () => void;
  triggerDemoNotification?: (title: string, message: string, moduleName: string) => void;
}

export const DemoEtablissement: React.FC<DemoEtablissementProps> = ({
  demoProfileId,
  demoSchoolPresence,
  setDemoSchoolPresence,
  demoSchoolCantine,
  setDemoSchoolCantine,
  demoTransactions: _demoTransactions,
  setDemoTransactions,
  demoSchoolHomework,
  setDemoSchoolHomework,
  demoSchoolComms,
  setDemoSchoolComms,
  onBack,
  triggerDemoNotification
}) => {
  const isSchoolAdmin = demoProfileId === 'demo_school_admin';
  const isSchoolTeacher = demoProfileId === 'demo_school_teacher';
  const isIssa = demoProfileId === 'demo_issa';
  const isLyna = demoProfileId === 'demo_lyna';
  const isParent = demoProfileId === 'demo_papa' || demoProfileId === 'demo_maman';

  // State for parents to switch children
  const [selectedChild, setSelectedChild] = useState<'demo_issa' | 'demo_lyna'>('demo_issa');

  // Input homework (teacher)
  const [newHomeworkSubject, setNewHomeworkSubject] = useState('');
  const [newHomeworkTitle, setNewHomeworkTitle] = useState('');
  const [newHomeworkClass, setNewHomeworkClass] = useState<'CE2' | 'Première'>('CE2');

  // Input school direction message
  const [newCommText, setNewCommText] = useState('');

  // Handle pupil marking homework done
  const handleToggleHomeworkDone = (hwId: string) => {
    setDemoSchoolHomework(prev => prev.map(h => {
      if (h.id === hwId) {
        const nextDone = !h.done;
        if (triggerDemoNotification && nextDone) {
          const studentName = demoProfileId === 'demo_issa' ? 'Issa' : 'Lyna';
          triggerDemoNotification(
            "📚 Devoir Terminé",
            `${studentName} a marqué comme fait le devoir de ${h.subject}`,
            "ecole"
          );
        }
        return { ...h, done: nextDone };
      }
      return h;
    }));
  };

  // Handle teacher adding homework
  const handleAddHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeworkSubject.trim() || !newHomeworkTitle.trim()) return;

    const newHw = {
      id: `hw-${Date.now()}`,
      subject: newHomeworkSubject.trim(),
      title: newHomeworkTitle.trim(),
      class: newHomeworkClass,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
      done: false
    };

    setDemoSchoolHomework(prev => [...prev, newHw]);
    setNewHomeworkSubject('');
    setNewHomeworkTitle('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "📚 Nouveau Devoir",
        `Devoir de ${newHw.subject} assigné à la classe de ${newHw.class}`,
        "ecole"
      );
    }
    alert(`📚 Devoir de ${newHw.subject} assigné à la classe de ${newHw.class} !`);
  };

  // Handle school admin broadcasting announcement
  const handleAddComm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommText.trim()) return;

    const newComm = {
      id: `comm-${Date.now()}`,
      content: newCommText.trim(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      sender: 'Direction de l\'Établissement'
    };

    setDemoSchoolComms(prev => [newComm, ...prev]);
    setNewCommText('');
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "📢 Annonce École",
        newComm.content,
        "ecole"
      );
    }
    alert("📢 Annonce envoyée avec succès à tous les parents et élèves !");
  };

  // Handle teacher marking pupil attendance
  const handleMarkAttendance = (childId: string, status: 'Présent' | 'Absent') => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setDemoSchoolPresence((prev: any) => ({
      ...prev,
      [childId]: { status, time }
    }));
    const studentName = childId === 'demo_issa' ? 'Issa Diop' : 'Lyna Diop';
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🏫 Appel Scolaire",
        `${studentName} a été marqué ${status} à ${time}`,
        "ecole"
      );
    }
    alert(`✅ ${studentName} est marqué ${status} (Appel enregistré à ${time}).`);
  };

  // Handle parent confirming cantine presence and charging the budget
  const handleConfirmCantine = (childId: string) => {
    if (demoSchoolCantine[childId]?.confirmed) {
      alert("🍽️ Ce repas à la cantine a déjà été confirmé.");
      return;
    }

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // 1. Confirm cantine presence
    setDemoSchoolCantine((prev: any) => ({
      ...prev,
      [childId]: { confirmed: true, time }
    }));

    // 2. Add expense of 45€ to budget transactions
    const cantineExpense = {
      id: `dt-cantine-${Date.now()}`,
      amount: -45.00,
      type: 'expense' as const,
      category: 'Éducation',
      title: `Paiement Cantine ${childId === 'demo_issa' ? 'Issa' : 'Lyna'}`,
      date: new Date().toISOString().split('T')[0],
      time,
      memberId: 'demo_papa'
    };

    setDemoTransactions((prev: any) => [cantineExpense, ...prev]);
    const studentName = childId === 'demo_issa' ? 'Issa' : 'Lyna';
    if (triggerDemoNotification) {
      triggerDemoNotification(
        "🍽️ Cantine Scolaire",
        `Repas cantine de ${studentName} confirmé & réglé (45€)`,
        "ecole"
      );
    }
    alert(`🍽️ Repas Cantine confirmé pour ${studentName} ! Un paiement de 45€ a été facturé et ajouté à votre budget et à la Timeline.`);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Mon Établissement</h1>
            <p className="text-xs text-white/50 font-medium">Portail Éducation connecté (Victor Hugo & Simone Veil)</p>
          </div>
        </div>
        
        <span className="text-[10px] font-bold uppercase bg-[#00D26A]/10 border border-[#00D26A]/25 text-[#00D26A] px-3 py-1.5 rounded-full">
          {isSchoolAdmin 
            ? '🏫 Direction' 
            : isSchoolTeacher 
              ? '👨‍🏫 Enseignant' 
              : isParent 
                ? '👨‍👩‍👧‍👦 Parent d\'Élève' 
                : '🎓 Élève'}
        </span>
      </div>

      {/* 1. STUDENT VIEW */}
      {(isIssa || isLyna) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Homework list */}
          <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider block">📚 Mes Devoirs à faire</h3>
            
            <div className="space-y-2.5">
              {demoSchoolHomework
                .filter(h => h.class === (isIssa ? 'CE2' : 'Première'))
                .map(hw => (
                  <button
                    key={hw.id}
                    onClick={() => handleToggleHomeworkDone(hw.id)}
                    className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] px-2 py-0.5 rounded-md font-bold uppercase">
                        {hw.subject}
                      </span>
                      <h4 className={`text-xs font-bold mt-1 text-white ${hw.done ? 'line-through text-white/40' : ''}`}>{hw.title}</h4>
                      <span className="text-[9px] text-white/30 block font-semibold">À rendre pour le : {hw.dueDate}</span>
                    </div>

                    <div className={`p-2 rounded-xl transition-all ${hw.done ? 'bg-[#00D26A]/20 text-[#00D26A]' : 'bg-white/5 text-white/20 group-hover:text-white/40'}`}>
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Schedule & Notes */}
          <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider block">
              {isIssa ? '🕒 Mon Emploi du Temps' : '📈 Mon Carnet de Notes'}
            </h3>

            {isIssa ? (
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#07111F]/50 border border-white/5">
                  <span className="font-bold text-white">08h30 - 10h00</span>
                  <span className="text-white/60">📚 Mathématiques</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#07111F]/50 border border-white/5">
                  <span className="font-bold text-white">10h15 - 11h45</span>
                  <span className="text-white/60">📚 Français (Lecture)</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#07111F]/50 border border-white/5">
                  <span className="font-bold text-white">13h30 - 15h00</span>
                  <span className="text-white/60">⚽ Éducation Physique</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#07111F]/50 border border-white/5">
                  <span className="text-xs font-bold text-white">Commentaire Phèdre (Français)</span>
                  <span className="font-mono text-xs font-bold bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/25 px-2 py-0.5 rounded-md">15/20</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#07111F]/50 border border-white/5">
                  <span className="text-xs font-bold text-white">DM Optique (Physique-Chimie)</span>
                  <span className="font-mono text-xs font-bold bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/25 px-2 py-0.5 rounded-md">14/20</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#07111F]/50 border border-white/5">
                  <span className="text-xs font-bold text-white">Devoir Espagnol (LVB)</span>
                  <span className="font-mono text-xs font-bold bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/25 px-2 py-0.5 rounded-md">16/20</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PARENT VIEW */}
      {isParent && (
        <div className="space-y-6 animate-fade-in">
          {/* Child Selector */}
          <div className="flex justify-center bg-white/5 p-1 rounded-2xl border border-white/5 max-w-xs mx-auto">
            <button 
              onClick={() => setSelectedChild('demo_issa')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedChild === 'demo_issa' ? 'bg-[#00D26A] text-[#07111F] shadow-md' : 'text-white/45 hover:text-white'
              }`}
            >
              👦 Issa (8 ans)
            </button>
            <button 
              onClick={() => setSelectedChild('demo_lyna')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedChild === 'demo_lyna' ? 'bg-[#00D26A] text-[#07111F] shadow-md' : 'text-white/45 hover:text-white'
              }`}
            >
              👧 Lyna (16 ans)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School track */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📁 Suivi Académique</h4>
              
              <div className="space-y-3 font-sans">
                {/* Attendance */}
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#07111F]/50 border border-white/5 text-xs">
                  <span className="text-white/70 font-semibold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#00D26A]" />
                    <span>Statut de Présence ce matin</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    demoSchoolPresence[selectedChild]?.status === 'Présent' 
                      ? 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]' 
                      : 'bg-red-500/10 border border-red-500/20 text-red-500'
                  }`}>
                    {demoSchoolPresence[selectedChild]?.status || 'Non renseigné'}
                  </span>
                </div>

                {/* Cantine */}
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#07111F]/50 border border-white/5 text-xs">
                  <span className="text-white/70 font-semibold flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-[#FF9F1C]" />
                    <span>Cantine ce midi</span>
                  </span>
                  
                  {demoSchoolCantine[selectedChild]?.confirmed ? (
                    <span className="bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] px-2 py-0.5 rounded-full font-bold text-[10px]">
                      Confirmée
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConfirmCantine(selectedChild)}
                      className="px-3 py-1.5 rounded-lg bg-[#FF9F1C] text-[#07111F] text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                    >
                      🍽️ Confirmer & Payer (45€)
                    </button>
                  )}
                </div>

                {/* Homework Count */}
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#07111F]/50 border border-white/5 text-xs">
                  <span className="text-white/70 font-semibold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#4F8CFF]" />
                    <span>Devoirs en attente</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-md">
                    {demoSchoolHomework.filter(h => h.class === (selectedChild === 'demo_issa' ? 'CE2' : 'Première') && !h.done).length} de devoirs
                  </span>
                </div>
              </div>
            </div>

            {/* School direction communications */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📢 Communications de la Direction</h4>
              
              <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                {demoSchoolComms.map(comm => (
                  <div key={comm.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
                    <span className="font-extrabold text-[#00D26A] text-[10px] uppercase tracking-wider block">{comm.sender}</span>
                    <p className="text-white/75 font-sans leading-relaxed">{comm.content}</p>
                    <span className="text-[9px] text-white/30 block font-semibold">{comm.date} à {comm.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TEACHER VIEW */}
      {isSchoolTeacher && (
        <div className="space-y-6 animate-fade-in">
          {/* Appel & Présences */}
          <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">👨‍🏫 Faire l'appel de ma classe (CE2 Victor Hugo)</h4>
            
            <div className="space-y-3 font-sans">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-[#07111F]/50 border border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFB020]/20 text-[#FFB020] flex items-center justify-center font-bold text-sm">ID</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Issa Diop</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Statut actuel : {demoSchoolPresence.demo_issa?.status || 'Non marqué'}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleMarkAttendance('demo_issa', 'Présent')}
                    className="px-3 py-1.5 rounded-lg bg-[#00D26A] text-[#07111F] text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    Marquer Présent
                  </button>
                  <button 
                    onClick={() => handleMarkAttendance('demo_issa', 'Absent')}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:opacity-90 cursor-pointer"
                  >
                    Marquer Absent
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Add Devoirs */}
          <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📚 Assigner des Devoirs aux élèves</h4>
            <form onSubmit={handleAddHomework} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input 
                type="text"
                placeholder="Matière (ex: Mathématiques)"
                required
                value={newHomeworkSubject}
                onChange={(e) => setNewHomeworkSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00D26A]/65 transition-all"
              />
              <input 
                type="text"
                placeholder="Consigne (ex: Faire exercices 2 et 3 p. 45)"
                required
                value={newHomeworkTitle}
                onChange={(e) => setNewHomeworkTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00D26A]/65 transition-all"
              />
              <div className="flex space-x-2">
                <select
                  value={newHomeworkClass}
                  onChange={(e: any) => setNewHomeworkClass(e.target.value)}
                  className="bg-white/5 text-white border border-white/10 rounded-xl px-2 py-2.5 text-xs font-bold outline-none flex-1"
                >
                  <option value="CE2" className="bg-[#07111F]">Classe CE2</option>
                  <option value="Première" className="bg-[#07111F]">Première</option>
                </select>
                <button 
                  type="submit" 
                  className="px-4 py-2.5 rounded-xl bg-[#00D26A] text-[#07111F] font-bold hover:opacity-90 transition-all flex items-center justify-center cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DIRECTION VIEW */}
      {isSchoolAdmin && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Total Élèves</span>
              <p className="text-xl font-black text-white">412</p>
            </div>
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Enseignants</span>
              <p className="text-xl font-black text-[#00D26A]">28</p>
            </div>
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Présences (Auj.)</span>
              <p className="text-xl font-black text-[#00D26A]">97.8%</p>
            </div>
            <div className="glass-panel border-white/8 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-white/40 uppercase">Retards (Auj.)</span>
              <p className="text-xl font-black text-red-400">4</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Communication Broadcast */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📢 Diffuser une Note d'Information aux parents</h4>
              <form onSubmit={handleAddComm} className="space-y-3 text-xs font-sans">
                <textarea 
                  placeholder="Écrivez le message de la direction..."
                  required
                  rows={3}
                  value={newCommText}
                  onChange={(e) => setNewCommText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#00D26A]/65 transition-all font-sans"
                />
                <button 
                  type="submit" 
                  className="w-full py-2.5 rounded-xl bg-[#00D26A] text-[#07111F] font-bold hover:opacity-90 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>Diffuser l'Annonce</span>
                </button>
              </form>
            </div>

            {/* Attendance tracking */}
            <div className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider block">📋 Suivi des Absences du Jour</h4>
              <div className="bg-[#07111F]/50 p-4 rounded-2xl border border-white/5 space-y-3 text-xs font-sans">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="font-bold text-white">Élève</span>
                  <span className="font-bold text-white">Classe</span>
                  <span className="font-bold text-white">Statut</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/80">Issa Diop</span>
                  <span className="text-white/60">CE2</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    demoSchoolPresence.demo_issa?.status === 'Présent' ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-red-500/10 text-red-500'
                  }`}>{demoSchoolPresence.demo_issa?.status || 'Non marqué'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-white/80">Lyna Diop</span>
                  <span className="text-white/60">Première</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    demoSchoolPresence.demo_lyna?.status === 'Présent' ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-red-500/10 text-red-500'
                  }`}>{demoSchoolPresence.demo_lyna?.status || 'Non marqué'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
