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
}

export const ConseilFamille: React.FC<ConseilFamilleProps> = ({ 
  votes, 
  setVotes,
  activeMemberId 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sondages' | 'charte'>('sondages');
  
  // Charter signatures state
  const [signatures, setSignatures] = useState({
    papa: true,
    maman: true,
    amadou: false,
    awa: false
  });

  const memberName = activeMemberId === '1' ? 'Papa' : activeMemberId === '2' ? 'Maman' : activeMemberId === '3' ? 'Amadou' : 'Awa';

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
    const key = activeMemberId === '3' ? 'amadou' : activeMemberId === '4' ? 'awa' : null;
    if (key) {
      setSignatures(prev => ({ ...prev, [key]: true }));
      alert("Charte signée numériquement avec fierté ! Faisons briller la maison ensemble. ✨");
    }
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
                  <div>
                    <h3 className="text-sm font-extrabold text-white leading-relaxed">{poll.question}</h3>
                    <p className="text-[10px] text-white/40 mt-1">Limite: {poll.dueDate} • {totalVotedCount} vote(s) exprimé(s)</p>
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
        </div>
      )}

      {/* CHARTER VIEW */}
      {activeSubTab === 'charte' && (
        <div className="space-y-6">
          
          {/* Parchment Styled rules */}
          <div className="glass-panel border border-white/8 rounded-[28px] p-6 space-y-6 relative overflow-hidden bg-gradient-to-b from-[#181B2B] to-[#0A0D18]">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#6C5CFF]/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="text-center border-b border-white/10 pb-4">
              <span className="text-[9px] font-bold text-[#6C5CFF] uppercase tracking-widest">Pacte de Bienveillance</span>
              <h3 className="text-lg font-serif font-extrabold text-white mt-1">LA CHARTE DE LA MAISON FATOU</h3>
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
                
                {/* Parents (always signed) */}
                <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20">
                  <span className="text-[10px] font-bold text-white block">Papa</span>
                  <span className="text-[9px] text-[#00D26A] font-bold mt-1.5 block">✍️ Signé</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20">
                  <span className="text-[10px] font-bold text-white block">Maman</span>
                  <span className="text-[9px] text-[#00D26A] font-bold mt-1.5 block">✍️ Signé</span>
                </div>

                {/* Amadou */}
                <div className={`p-3 rounded-2xl border transition-all ${
                  signatures.amadou 
                    ? 'bg-[#00D26A]/10 border-[#00D26A]/20' 
                    : 'bg-white/5 border-white/5'
                }`}>
                  <span className="text-[10px] font-bold text-white block">Amadou</span>
                  {signatures.amadou ? (
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

                {/* Awa */}
                <div className={`p-3 rounded-2xl border transition-all ${
                  signatures.awa 
                    ? 'bg-[#00D26A]/10 border-[#00D26A]/20' 
                    : 'bg-white/5 border-white/5'
                }`}>
                  <span className="text-[10px] font-bold text-white block">Awa</span>
                  {signatures.awa ? (
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

              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
