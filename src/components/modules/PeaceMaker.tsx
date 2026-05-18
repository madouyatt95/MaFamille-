import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  HeartHandshake
} from 'lucide-react';

export const PeaceMaker: React.FC = () => {
  const [conflictDesc, setConflictDesc] = useState('');
  const [mediating, setMediating] = useState(false);
  const [compromise, setCompromise] = useState<any | null>(null);

  const presets = [
    { id: '1', label: 'Partage de la manette 🎮', text: 'Amadou a pris ma manette de console de jeu sans me demander mon avis et y joue depuis plus d\'une heure ! (Awa)' },
    { id: '2', label: 'Bruit pendant les devoirs 📚', text: 'Awa fait trop de bruit dans le salon et crie pendant que j\'essaie de me concentrer sur mon devoir de maths du Tuteur IA ! (Amadou)' },
    { id: '3', label: 'Corvée de vaisselle 🍽️', text: 'C\'était au tour d\'Amadou de débarrasser la table ce soir, mais il fait semblant d\'avoir oublié pour aller jouer. (Maman)' }
  ];

  const handleSelectPreset = (text: string) => {
    setConflictDesc(text);
    setCompromise(null);
  };

  const runMediation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictDesc) return;
    setMediating(true);

    setTimeout(() => {
      // Formulate CNV-based compromise
      let analysis = {
        feelingA: 'Frustrée & Oubliée',
        needA: 'Reconnaissance de son espace de jeu & Respect du partage',
        feelingB: 'Irrité & Stressé',
        needB: 'Calme & Concentration pour ses examens scolaires',
        compromiseText: 'Amadou s\'engage à prêter la manette à Awa à partir de 17h30. En échange, Awa accepte de jouer calmement dans sa chambre pour préserver la révision d\'Amadou pendant encore 45 minutes.',
        mediationTip: 'Chacun fait un pas vers l\'autre : le temps de révision d\'abord, le jeu partagé ensuite. Accord scellé sous le regard bienveillant des parents !'
      };

      if (conflictDesc.includes('bruit') || conflictDesc.includes('concentrer')) {
        analysis = {
          feelingA: 'Énervé & Distrait',
          needA: 'Silence pour mener à bien ses objectifs du Tuteur IA',
          feelingB: 'Pleine d\'énergie & Amusée',
          needB: 'Espace d\'expression créative & divertissement',
          compromiseText: 'Awa accepte d\'utiliser son casque audio pour regarder son dessin animé, ou d\'aller jouer dans la salle de jeux. Amadou s\'engage en contrepartie à lui accorder 15 minutes d\'aide sur ses devoirs de dessin ensuite.',
          mediationTip: 'Le calme est préservé sans bloquer le besoin de jeu. La collaboration renforce l\'empathie fraternelle !'
        };
      } else if (conflictDesc.includes('vaisselle') || conflictDesc.includes('table')) {
        analysis = {
          feelingA: 'Fatiguée & Surchargée',
          needA: 'Soutien concret dans le foyer & Respect de la répartition des tâches',
          feelingB: 'Fatigué par l\'école & Distrait',
          needB: 'Repos de fin de journée & temps libre immédiat',
          compromiseText: 'Amadou s\'engage à débarrasser immédiatement les verres et assiettes en 3 minutes de chronomètre chrono. Maman l\'autorise ensuite à jouer sans culpabilité pour le reste de la soirée.',
          mediationTip: 'Une tâche rapide d\'abord, la liberté ensuite (méthode de la récompense immédiate) !'
        };
      }

      setCompromise(analysis);
      setMediating(false);
      alert("🕊️ Compromis de paix bienveillant généré avec succès par l'IA ! Accord prêt pour signature.");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">PeaceMaker IA</h2>
          <p className="text-xs text-white/50">Médiateur intelligent et gestion positive des conflits du quotidien</p>
        </div>
      </div>

      {/* Preset conflict selectors */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Sélectionner un conflit récurrent :</span>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.text)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mediation input */}
      <form onSubmit={runMediation} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Décrivez le litige familial</label>
          <textarea 
            required
            rows={3}
            placeholder="Exprimez ce qui ne va pas (ex: Awa a emprunté mon pull sans demander, on se chamaille pour le film de ce soir)..." 
            value={conflictDesc}
            onChange={(e) => setConflictDesc(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A] resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={mediating}
          className="w-full py-3.5 rounded-[18px] bg-[#00D26A] text-white font-semibold text-xs shadow-md cursor-pointer transition-all hover:opacity-95 flex items-center justify-center space-x-2"
        >
          <Sparkles className="w-4 h-4 animate-spin-slow" />
          <span>{mediating ? 'Écoute active & Calcul du compromis...' : 'Lancer la Médiation Bienveillante 🕊️'}</span>
        </button>
      </form>

      {/* Compromise Output Display */}
      {compromise && (
        <div className="glass-panel border border-[#00D26A]/30 rounded-[28px] p-5 space-y-4 relative overflow-hidden bg-gradient-to-br from-[#122A23]/40 to-[#0A1A15]/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D26A]/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center space-x-2 text-[#00D26A] border-b border-white/5 pb-3">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Résolution PeaceMaker IA</span>
          </div>

          {/* Underling feelings */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest block">Pour Amadou :</span>
              <p className="text-white"><span className="text-white/40">Émotion:</span> {compromise.feelingB}</p>
              <p className="text-white/70 mt-1 leading-normal"><span className="text-white/40">Besoin:</span> {compromise.needB}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest block">Pour Awa :</span>
              <p className="text-white"><span className="text-white/40">Émotion:</span> {compromise.feelingA}</p>
              <p className="text-white/70 mt-1 leading-normal"><span className="text-white/40">Besoin:</span> {compromise.needA}</p>
            </div>
          </div>

          {/* The Pact */}
          <div className="p-4 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 space-y-2">
            <span className="text-[9px] font-extrabold text-[#00D26A] uppercase tracking-wider block">LE COMPROMIS DE PAIX 🤝</span>
            <p className="text-xs font-bold text-white leading-relaxed">
              {compromise.compromiseText}
            </p>
            <p className="text-[10px] text-white/50 leading-relaxed italic mt-2">
              💡 {compromise.mediationTip}
            </p>
          </div>

          <button
            onClick={() => {
              setCompromise(null);
              setConflictDesc('');
              alert("🤝 Accord validé et signé par les deux parties ! Le calme et la bienveillance sont de retour.");
            }}
            className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:opacity-95 shadow-md"
          >
            Accepter le compromis 🤝
          </button>
        </div>
      )}

    </div>
  );
};
