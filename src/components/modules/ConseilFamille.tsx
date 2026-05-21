import React, { useState } from 'react';
import { 
  Users, 
  Check 
} from 'lucide-react';
import type { FamilyVote } from '../../types';

interface ConseilFamilleProps {
  votes: FamilyVote[];
  setVotes: React.Dispatch<React.SetStateAction<FamilyVote[]>>;
  activeMemberId: string;
  members?: any[];
}

export const ConseilFamille: React.FC<ConseilFamilleProps> = ({ 
  votes, 
  setVotes,
  activeMemberId,
  members
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sondages' | 'charte'>('sondages');
  const activeMember = members?.find(m => m.id === activeMemberId);
  const isParent = activeMember 
    ? ['Chef de famille', 'Gestionnaire', 'admin', 'parent'].includes(activeMember.role)
    : (activeMemberId === '1' || activeMemberId === '2');
  
  // Form states for adding new polls
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [newDueDate, setNewDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

  const handleAddPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newOptions.map(opt => opt.trim()).filter(Boolean);
    if (!newQuestion || validOptions.length < 2) {
      alert("⚠️ Veuillez saisir une question et au moins 2 options de vote.");
      return;
    }
    const newPoll: FamilyVote = {
      id: `poll-${Date.now()}`,
      question: newQuestion,
      dueDate: new Date(newDueDate).toLocaleDateString('fr-FR'),
      authorName: memberName,
      active: true,
      options: validOptions.map(text => ({ text, votes: [] }))
    };
    setVotes(prev => [...prev, newPoll]);
    setNewQuestion('');
    setNewOptions(['', '']);
    alert("🗳️ Nouveau scrutin démocratique publié avec succès au Conseil de Famille !");
  };

  // Charter signatures state indexed by member ID
  const [signatures, setSignatures] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('family_charter_signatures');
    if (stored) return JSON.parse(stored);
    
    // Default signatures
    return {
      '1': true, // Papa / Chef de famille
      '2': true, // Maman / Parent
      '3': false, // Amadou
      '4': false  // Awa
    };
  });

  const memberName = activeMember ? activeMember.name : (activeMemberId === '1' ? 'Papa' : activeMemberId === '2' ? 'Maman' : activeMemberId === '3' ? 'Amadou' : 'Awa');

  const handleVote = (pollId: string, optionIdx: number) => {
    let alreadyVoted = false;

    setVotes(prev =>
      prev.map(p => {
        if (p.id !== pollId) return p;

        // Check if member already voted in any option of this poll
        const hasVotedThisPoll = p.options.some(o => o.votes.includes(memberName));
        if (hasVotedThisPoll) {
          alreadyVoted = true;
          return p;
        }
        
        const updatedOpts = p.options.map((o, idx) => {
          if (idx !== optionIdx) return o;
          return {
            ...o,
            votes: [...o.votes, memberName]
          };
        });

        return {
          ...p,
          options: updatedOpts
        };
      })
    );

    if (alreadyVoted) {
      alert("Tu as déjà voté pour ce sondage ! Le scrutin est secret et unique. 😉");
    } else {
      alert("Votre vote démocratique a bien été enregistré au Conseil de Famille ! 🗳️");
    }
  };

  const handleSignCharter = () => {
    const next = { ...signatures, [activeMemberId]: true };
    setSignatures(next);
    localStorage.setItem('family_charter_signatures', JSON.stringify(next));
    alert("Charte signée numériquement avec fierté ! Faisons briller la maison ensemble. ✨");
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Le Conseil de Famille</h2>
            <p className="text-xs text-white/50">Démocratie familiale, sondages et charte de vie commune</p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 flex">
        <button
          onClick={() => setActiveSubTab('sondages')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'sondages' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Sondages Actifs 🗳️
        </button>
        <button
          onClick={() => setActiveSubTab('charte')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'charte' 
              ? 'bg-[#6C5CFF] text-white shadow-md' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Charte du Foyer 📜
        </button>
      </div>

      {/* POLLS VIEW */}
      {activeSubTab === 'sondages' && (
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Scrutins de la semaine :</span>
          
          <div className="space-y-4">
            {votes.map(poll => {
              const totalVotesCount = poll.options.reduce((sum: number, o: { votes: string[] }) => sum + o.votes.length, 0) || 1;
              const hasVoted = poll.options.some(o => o.votes.includes(memberName));
              const totalVotedCount = poll.options.reduce((sum: number, o: { votes: string[] }) => sum + o.votes.length, 0);

              return (
                <div key={poll.id} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-white leading-relaxed">{poll.question}</h3>
                      <p className="text-[10px] text-white/40 mt-1">Limite: {poll.dueDate} • {totalVotedCount} vote(s) exprimé(s)</p>
                    </div>
                    {isParent && (
                      <div className="flex space-x-1 bg-white/5 p-1 rounded-xl border border-white/5 ml-4">
                        <button 
                          type="button"
                          onClick={() => {
                            const newQ = window.prompt("Modifier la question du conseil :", poll.question);
                            if (!newQ) return;
                            setVotes(prev => prev.map(p => p.id === poll.id ? { ...p, question: newQ } : p));
                          }}
                          className="p-1 hover:bg-white/10 rounded text-[10px] font-bold"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (window.confirm("Supprimer ce scrutin du conseil ?")) {
                              setVotes(prev => prev.filter(p => p.id !== poll.id));
                            }
                          }}
                          className="p-1 hover:bg-red-500/10 rounded text-[10px] text-red-400 font-bold"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {poll.options.map((opt: { text: string; votes: string[] }, idx: number) => {
                      const percentage = Math.round((opt.votes.length / totalVotesCount) * 100);
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => handleVote(poll.id, idx)}
                          disabled={hasVoted}
                          className="w-full relative p-4 rounded-2xl border border-white/5 bg-white/5 overflow-hidden text-left transition-all hover:bg-white/8 flex justify-between items-center cursor-pointer group"
                        >
                          {/* Real-time result visual slider */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-[#6C5CFF]/15 transition-all duration-700 pointer-events-none"
                            style={{ width: `${percentage}%` }}
                          ></div>

                          <span className="text-xs font-bold text-white relative z-10 flex items-center space-x-2">
                            <span>{opt.text}</span>
                          </span>

                          <span className="text-xs font-extrabold text-[#6C5CFF] relative z-10">
                            {percentage}% ({opt.votes.length} voix)
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {hasVoted && (
                    <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center space-x-2 text-[10px] font-bold text-[#00D26A]">
                      <Check className="w-4 h-4" />
                      <span>Votre vote a été validé au Conseil. Merci pour votre participation !</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Formulaire d'ajout de scrutin pour parents */}
          {isParent && (
            <form onSubmit={handleAddPoll} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 my-6">
              <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                <span>Ajouter un nouveau sujet de vote 🗳️</span>
              </span>
              
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Question / Sujet de Conseil</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Quelle destination pour notre pique-nique de dimanche ?" 
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Options de vote (2 minimum)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {newOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input 
                          type="text" 
                          required={idx < 2}
                          placeholder={idx === 0 ? "Ex: La plage de Somone 🏖️" : idx === 1 ? "Ex: La forêt de Popenguine 🌳" : `Option de vote ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newOptions];
                            updated[idx] = e.target.value;
                            setNewOptions(updated);
                          }}
                          className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                        />
                        {newOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newOptions.filter((_, i) => i !== idx);
                              setNewOptions(updated);
                            }}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/25 rounded-xl text-red-400 border border-red-500/20 transition-all text-xs font-bold"
                            title="Supprimer cette option"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewOptions([...newOptions, ''])}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer mt-1"
                  >
                    <span>➕ Ajouter une option de vote</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date de clôture du vote</label>
                  <input 
                    type="date" 
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white font-extrabold text-xs shadow-md cursor-pointer transition-all hover:opacity-95 flex items-center justify-center space-x-2"
              >
                <span>Créer le Scrutin de Famille</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* CHARTER VIEW */}
      {/* CHARTER VIEW */}
      {activeSubTab === 'charte' && (
        <div className="space-y-6">
          
          {/* Parchment Styled rules */}
          <div className="glass-panel border border-white/8 rounded-[28px] p-6 space-y-6 relative overflow-hidden bg-gradient-to-b from-[#181B2B] to-[#0A0D18]">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#6C5CFF]/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="text-center border-b border-white/10 pb-4">
              <span className="text-[9px] font-bold text-[#6C5CFF] uppercase tracking-widest">Pacte de Bienveillance</span>
              <h3 className="text-lg font-serif font-extrabold text-white mt-1">
                LA CHARTE DE LA FAMILLE {(members && members.length > 0 ? (members.find(m => ['Chef de famille', 'parent'].includes(m.role))?.name || members[0].name) : 'FATOU').toUpperCase()}
              </h3>
            </div>

            <div className="space-y-4 text-xs font-medium text-white/70 leading-relaxed font-sans">
              <div className="flex items-start space-x-3">
                <span className="p-1 rounded bg-[#6C5CFF]/10 text-[#6C5CFF] font-bold text-[10px] shrink-0 mt-0.5">01</span>
                <p><span className="text-white font-bold">L'Écoute Mutuelle :</span> On s'exprime calmement, sans couper la parole et sans élever la voix.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="p-1 rounded bg-[#6C5CFF]/10 text-[#6C5CFF] font-bold text-[10px] shrink-0 mt-0.5">02</span>
                <p><span className="text-white font-bold">L'Aide Solidaire :</span> On aide aux tâches quotidiennes (vaisselle, tri, rangement) dans l'harmonie.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="p-1 rounded bg-[#6C5CFF]/10 text-[#6C5CFF] font-bold text-[10px] shrink-0 mt-0.5">03</span>
                <p><span className="text-white font-bold">Écrans & Sommeil :</span> Les écrans (consoles, téléphones) s'éteignent à 21h00 pour un sommeil réparateur.</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="p-1 rounded bg-[#6C5CFF]/10 text-[#6C5CFF] font-bold text-[10px] shrink-0 mt-0.5">04</span>
                <p><span className="text-white font-bold">Le Respect de l'Intimité :</span> On frappe toujours avant d'entrer dans la chambre des autres.</p>
              </div>
            </div>

            {/* Signature section */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block text-center">Signatures Électroniques :</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {members && members.length > 0 ? (
                  members.map(m => {
                    const isSigned = signatures[m.id] || false;
                    const canSign = activeMemberId === m.id && !isSigned;
                    
                    return (
                      <div key={m.id} className={`p-3 rounded-2xl border transition-all ${
                        isSigned 
                          ? 'bg-[#00D26A]/10 border-[#00D26A]/20' 
                          : 'bg-white/5 border-white/5'
                      }`}>
                        <span className="text-[10px] font-bold text-white block">{m.name}</span>
                        {isSigned ? (
                          <span className="text-[9px] text-[#00D26A] font-bold mt-1.5 block">✍️ Signé</span>
                        ) : canSign ? (
                          <button 
                            onClick={handleSignCharter}
                            className="mt-2 w-full py-1.5 rounded-lg bg-[#6C5CFF] text-white font-bold text-[8px] cursor-pointer"
                          >
                            Signer ✍️
                          </button>
                        ) : (
                          <span className="text-[9px] text-white/30 font-bold mt-1.5 block">En attente</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20">
                      <span className="text-[10px] font-bold text-white block">Papa</span>
                      <span className="text-[9px] text-[#00D26A] font-bold mt-1.5 block">✍️ Signé</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20">
                      <span className="text-[10px] font-bold text-white block">Maman</span>
                      <span className="text-[9px] text-[#00D26A] font-bold mt-1.5 block">✍️ Signé</span>
                    </div>
                    <div className={`p-3 rounded-2xl border transition-all ${
                      signatures['3'] 
                        ? 'bg-[#00D26A]/10 border-[#00D26A]/20' 
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <span className="text-[10px] font-bold text-white block">Amadou</span>
                      {signatures['3'] ? (
                        <span className="text-[9px] text-[#00D26A] font-bold mt-1.5 block">✍️ Signé</span>
                      ) : activeMemberId === '3' ? (
                        <button 
                          onClick={handleSignCharter}
                          className="mt-2 w-full py-1.5 rounded-lg bg-[#6C5CFF] text-white font-bold text-[8px] cursor-pointer"
                        >
                          Signer ✍️
                        </button>
                      ) : (
                        <span className="text-[9px] text-white/30 font-bold mt-1.5 block">En attente</span>
                      )}
                    </div>
                    <div className={`p-3 rounded-2xl border transition-all ${
                      signatures['4'] 
                        ? 'bg-[#00D26A]/10 border-[#00D26A]/20' 
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <span className="text-[10px] font-bold text-white block">Awa</span>
                      {signatures['4'] ? (
                        <span className="text-[9px] text-[#00D26A] font-bold mt-1.5 block">✍️ Signé</span>
                      ) : activeMemberId === '4' ? (
                        <button 
                          onClick={handleSignCharter}
                          className="mt-2 w-full py-1.5 rounded-lg bg-[#6C5CFF] text-white font-bold text-[8px] cursor-pointer"
                        >
                          Signer ✍️
                        </button>
                      ) : (
                        <span className="text-[9px] text-white/30 font-bold mt-1.5 block">En attente</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
