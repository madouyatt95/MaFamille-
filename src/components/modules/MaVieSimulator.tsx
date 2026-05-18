import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Briefcase, 
  Home, 
  Coins, 
  ShieldAlert, 
  CheckCircle,
  Lightbulb
} from 'lucide-react';

export const MaVieSimulator: React.FC = () => {
  const [career, setCareer] = useState('ia_engineer');
  const [housing, setHousing] = useState('studio');
  const [lifestyle, setLifestyle] = useState('moderate');
  const [results, setResults] = useState<any | null>(null);

  const careers = [
    { id: 'ia_engineer', name: 'Ingénieur IA de Pointe 🤖', salary: 6200, desc: 'Recherche et développement sur des modèles d\'agents autonomes.' },
    { id: 'esport_pro', name: 'Joueur E-Sport Pro 🎮', salary: 3800, desc: 'Tournois mondiaux et streaming compétitif.' },
    { id: 'eco_architect', name: 'Architecte Éco-Concepteur 🌿', salary: 4500, desc: 'Conception de villas solaires et immeubles zéro-carbone.' }
  ];

  const housings = [
    { id: 'studio', name: 'Studio parisien cosy 🏙️', cost: 950, desc: 'Proche du centre, parfait pour démarrer seul.' },
    { id: 'flatshare', name: 'Colocation branchée 🤝', cost: 650, desc: 'Grande cuisine, terrasse et ambiance conviviale.' },
    { id: 'villa', name: 'Villa connectée avec piscine 🏊‍♂️', cost: 2100, desc: 'Le grand luxe moderne avec jardin connecté.' }
  ];

  const lifestyles = [
    { id: 'frugal', name: 'Minimaliste écolo 🥗', cost: 400, desc: 'Vélo, cuisine maison, vêtements de seconde main.' },
    { id: 'moderate', name: 'Gamer / Fast-food 🍕', cost: 800, desc: 'Restos réguliers, abonnements de jeux et tech.' },
    { id: 'luxury', name: 'Luxe & Fashion Star 💎', cost: 1800, desc: 'Marques de créateurs, voyages d\'exception et sorties VIP.' }
  ];

  const handleSimulate = () => {
    const selectedCareer = careers.find(c => c.id === career)!;
    const selectedHousing = housings.find(h => h.id === housing)!;
    const selectedLifestyle = lifestyles.find(l => l.id === lifestyle)!;

    const totalExp = selectedHousing.cost + selectedLifestyle.cost;
    const savings = selectedCareer.salary - totalExp;

    let aiAdvice = '';
    let success = true;

    if (savings > 2500) {
      aiAdvice = "Incroyable ! Tu as fait des choix extrêmement judicieux. Tu épargnes une grande partie de ton revenu. En moins d'un an, tu pourras acheter ta première berline électrique ou investir dans de l'immobilier locatif virtuel ! Continue comme ça, futur tycoon. 🚀";
    } else if (savings > 500) {
      aiAdvice = "Excellent équilibre ! Tu profites de la vie tout en mettant de l'argent de côté pour tes futurs projets d'investissement. C'est la définition même d'une gestion financière saine. 📈";
    } else if (savings >= 0) {
      aiAdvice = "Budget serré ! Ton reste à vivre est faible. Une simple dépense imprévue (panne de voiture, tech en panne) pourrait te mettre dans le rouge. Pense à réduire un peu ton style de vie ou opter pour la colocation ! 💡";
    } else {
      success = false;
      aiAdvice = "Alerte Découvert ! 🚨 Tes dépenses dépassent largement tes revenus. Tu vis au-dessus de tes moyens réels. Dans le simulateur (comme dans la vraie vie), tu serais endetté en quelques mois. Ajuste tes dépenses ou vise un salaire plus élevé !";
    }

    setResults({
      salary: selectedCareer.salary,
      housing: selectedHousing.cost,
      lifestyle: selectedLifestyle.cost,
      savings,
      aiAdvice,
      success
    });
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">MaVie 2.0 : Le Simulateur d'Avenir</h2>
          <p className="text-xs text-white/50">Simulez votre future carrière, votre logement et votre indépendance financière</p>
        </div>
      </div>

      {/* Simulator panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Career card */}
        <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4" />
              <span>1. Choisis ta Carrière</span>
            </span>
            <div className="space-y-2 pt-2">
              {careers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCareer(c.id); setResults(null); }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    career === c.id 
                      ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white' 
                      : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/8'
                  }`}
                >
                  <h4 className="text-xs font-bold">{c.name}</h4>
                  <p className="text-[10px] text-white/40 mt-1 leading-normal font-sans font-medium">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Housing card */}
        <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#4F8CFF] uppercase tracking-widest flex items-center space-x-1.5">
              <Home className="w-4 h-4" />
              <span>2. Loue ton Appartement</span>
            </span>
            <div className="space-y-2 pt-2">
              {housings.map(h => (
                <button
                  key={h.id}
                  onClick={() => { setHousing(h.id); setResults(null); }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    housing === h.id 
                      ? 'bg-[#4F8CFF]/15 border-[#4F8CFF] text-white' 
                      : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/8'
                  }`}
                >
                  <h4 className="text-xs font-bold">{h.name}</h4>
                  <p className="text-[10px] text-white/40 mt-1 leading-normal font-sans font-medium">{h.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lifestyle card */}
        <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest flex items-center space-x-1.5">
              <Coins className="w-4 h-4" />
              <span>3. Style de Vie & Sorties</span>
            </span>
            <div className="space-y-2 pt-2">
              {lifestyles.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setLifestyle(l.id); setResults(null); }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    lifestyle === l.id 
                      ? 'bg-[#FFB020]/15 border-[#FFB020] text-white' 
                      : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/8'
                  }`}
                >
                  <h4 className="text-xs font-bold">{l.name}</h4>
                  <p className="text-[10px] text-white/40 mt-1 leading-normal font-sans font-medium">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Simulator Trigger */}
      <button
        onClick={handleSimulate}
        className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:opacity-95 shadow-md flex items-center justify-center space-x-2"
      >
        <Sparkles className="w-4 h-4" />
        <span>Calculer mon Avenir Financier 🚀</span>
      </button>

      {/* Simulation Results */}
      {results && (
        <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 relative overflow-hidden bg-gradient-to-br from-[#1A253F]/40 to-[#0C1224]/60">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Votre Bilan Prévisionnel Mensuel :</span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Salaire Net</span>
              <span className="text-sm font-extrabold text-[#00D26A] mt-0.5 block">+{results.salary} €</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Loyer Logement</span>
              <span className="text-sm font-extrabold text-[#FF4D6D] mt-0.5 block">-{results.housing} €</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Lifestyle / Tech</span>
              <span className="text-sm font-extrabold text-[#FF4D6D] mt-0.5 block">-{results.lifestyle} €</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Épargne / Reste</span>
              <span className={`text-sm font-extrabold mt-0.5 block ${
                results.savings >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D6D]'
              }`}>
                {results.savings >= 0 ? `+${results.savings}` : results.savings} €
              </span>
            </div>
          </div>

          {/* AI wisdom feedback panel */}
          <div className={`p-4 rounded-2xl flex items-start space-x-3 border ${
            results.success 
              ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-white' 
              : 'bg-[#FF4D6D]/10 border-[#FF4D6D]/20 text-white'
          }`}>
            {results.success ? (
              <CheckCircle className="w-5 h-5 text-[#00D26A] shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#FF4D6D] shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#FFB020]" />
                <span>Conseil de Sagesse Financière de l'IA</span>
              </p>
              <p className="text-xs text-white/80 font-medium mt-1 leading-relaxed">
                {results.aiAdvice}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
