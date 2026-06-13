import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  HeartHandshake
} from 'lucide-react';
import { aiQuotaService } from '../../services/aiQuotaService';

interface PeaceMakerProps {
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  onMediationSuccess?: () => void;
}

interface MediationResult {
  feelingA: string;
  needA: string;
  feelingB: string;
  needB: string;
  compromiseText: string;
  mediationTip: string;
}

export const PeaceMaker: React.FC<PeaceMakerProps> = ({ isPremium = false, onTriggerPaywall, onMediationSuccess }) => {
  const [conflictDesc, setConflictDesc] = useState('');
  const [mediating, setMediating] = useState(false);
  const [compromise, setCompromise] = useState<MediationResult | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState('');

  const presets = [
    { id: '1', label: 'Partage d’un jeu 🎮', text: 'Deux enfants se disputent un jeu vidéo : l’un l’utilise depuis longtemps, l’autre aimerait aussi avoir son tour.' },
    { id: '2', label: 'Bruit pendant les devoirs 📚', text: 'Un enfant essaie de se concentrer sur ses devoirs pendant qu’un autre joue bruyamment dans la même pièce.' },
    { id: '3', label: 'Corvée oubliée 🍽️', text: 'Une tâche prévue dans la maison n’a pas été faite, ce qui crée de la frustration chez le parent et de la résistance chez l’enfant.' },
    { id: '4', label: 'Temps d’écran dépassé 📱', text: 'Un enfant refuse d’arrêter l’écran alors que la limite familiale est dépassée et que le repas approche.' },
    { id: '5', label: 'Chambre en désordre 🧸', text: 'La chambre est très en désordre et l’enfant refuse de ranger, pendant que le parent souhaite retrouver un cadre plus calme.' }
  ];

  const handleSelectPreset = (text: string) => {
    setConflictDesc(text);
    setCompromise(null);
  };

  const runMediation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictDesc) return;

    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      return;
    }

    setMediating(true);
    setCompromise(null);
    setFallbackMessage('');
    let fallbackReason = '';

    // Tente d'utiliser l'IA réelle si le quota est disponible (soit via clé locale VITE_, soit via le proxy serveurless)
    const useRealAI = aiQuotaService.consumeAIQuota(isPremium);

    if (useRealAI) {
      try {
        const prompt = `Tu es PeaceMaker IA, un médiateur de conflits familiaux expert en Communication Non Violente (CNV) pour l'application MaFamille+.
Analyse le litige familial suivant : "${conflictDesc}".
Identifie les sentiments sous-jacents et les besoins profonds des deux parties, puis propose un compromis bienveillant, équitable et ludique.

Renvoie STRICTEMENT un objet JSON brut valide, sans balises markdown (pas de \`\`\`json), sans texte d'accompagnement, contenant cette structure exacte :
{
  "feelingA": "Sentiments de la partie A (court ex: Frustrée & Blessée)",
  "needA": "Besoins profonds de la partie A (court)",
  "feelingB": "Sentiments de la partie B (court ex: Stressé & Irrité)",
  "needB": "Besoins profonds de la partie B (court)",
  "compromiseText": "Proposition concrète de compromis en français (très claire, 2-3 phrases)",
  "mediationTip": "Conseil de médiation de paix en français pour la famille (1 phrase)"
}`;

        const groqEndpoint = import.meta.env.DEV ? 'https://ma-famille-nu.vercel.app/api/groq' : '/api/groq';
        const headers = await aiQuotaService.getAIProxyHeaders();

        const response = await fetch(groqEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });

        if (!response.ok) throw await aiQuotaService.getAIResponseError(response, 'Groq');
        const data = await response.json();
        let textResult = data.choices?.[0]?.message?.content || '';
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedCompromise = JSON.parse(textResult);
        if (parsedCompromise.feelingA && parsedCompromise.feelingB && parsedCompromise.compromiseText) {
          const { remaining, limit } = aiQuotaService.getQuotaFromResponse(response, isPremium);
          
          setCompromise({
            ...parsedCompromise,
            mediationTip: `${parsedCompromise.mediationTip} ✨ (Médiation dynamique Groq Llama 3 • Quota restant : ${remaining}/${limit} aujourd'hui)`
          });
          setMediating(false);
          alert("🕊️ Compromis de paix bienveillant calculé en temps réel par l'IA Groq !");
          return;
        } else {
          throw new Error('Structure JSON reçue incorrecte');
        }
      } catch (err) {
        console.warn("[PeaceMaker] Erreur lors de l'appel de l'IA réelle Groq, repli local :", err);
        fallbackReason = aiQuotaService.getFallbackLabel(err);
        setFallbackMessage(fallbackReason);
      }
    }

    // Version locale de repli
    setTimeout(() => {
      let analysis = {
        feelingA: 'Frustrée & Oubliée',
        needA: 'Reconnaissance de son espace de jeu & Respect du partage',
        feelingB: 'Irrité & Stressé',
        needB: 'Calme & Concentration pour ses examens scolaires',
        compromiseText: 'La personne qui joue termine sa partie en cours avec un minuteur court, puis laisse un vrai tour à l’autre. En échange, l’autre accepte d’attendre ce délai sans interrompre.',
        mediationTip: 'Chacun fait un pas vers l\'autre : le temps de révision d\'abord, le jeu partagé ensuite. Accord scellé sous le regard bienveillant des parents !'
      };

      if (conflictDesc.includes('bruit') || conflictDesc.includes('concentrer')) {
        analysis = {
          feelingA: 'Énervé & Distrait',
          needA: 'Silence pour mener à bien ses objectifs du Tuteur IA',
          feelingB: 'Pleine d\'énergie & Amusée',
          needB: 'Espace d\'expression créative & divertissement',
          compromiseText: 'La personne qui fait du bruit choisit une activité plus calme ou change de pièce pendant le temps de devoirs. En échange, un moment de jeu partagé est prévu juste après.',
          mediationTip: 'Le calme est préservé sans bloquer le besoin de jeu. La collaboration renforce l\'empathie fraternelle !'
        };
      } else if (conflictDesc.includes('vaisselle') || conflictDesc.includes('table')) {
        analysis = {
          feelingA: 'Fatiguée & Surchargée',
          needA: 'Soutien concret dans le foyer & Respect de la répartition des tâches',
          feelingB: 'Fatigué par l\'école & Distrait',
          needB: 'Repos de fin de journée & temps libre immédiat',
          compromiseText: 'La tâche est faite immédiatement avec un minuteur court pour éviter que cela traîne. Une fois terminée, le parent reconnaît l’effort et laisse un vrai temps libre.',
          mediationTip: 'Une tâche rapide d\'abord, la liberté ensuite (méthode de la récompense immédiate) !'
        };
      } else if (conflictDesc.includes('tablette') || conflictDesc.includes('écran') || conflictDesc.includes('téléphone')) {
        analysis = {
          feelingA: 'Inquiet & Soucieux',
          needA: 'Respect des règles familiales & Sommeil de qualité',
          feelingB: 'Captivée & Résistante',
          needB: 'Finir son activité ludique & Besoin d\'autonomie',
          compromiseText: 'L’écran est posé et chargé dans un endroit commun, sans négociation supplémentaire. En échange, l’enfant choisit une activité calme de transition avant le coucher.',
          mediationTip: 'Remplacer une transition d\'écran par une transition de connexion humaine et douce facilitera grandement le coucher !'
        };
      } else if (conflictDesc.includes('chambre') || conflictDesc.includes('ranger') || conflictDesc.includes('désordre')) {
        analysis = {
          feelingA: 'Exaspérée & Impatiente',
          needA: 'Ordre visuel, clarté dans la maison & Respect du travail partagé',
          feelingB: 'Fatigué & Surchargé',
          needB: 'Liberté de son espace personnel & Repos après l\'entraînement',
          compromiseText: 'L’enfant range une petite zone prioritaire pendant 5 minutes avec un minuteur. Le reste peut être planifié pour plus tard afin d’éviter une demande trop lourde d’un coup.',
          mediationTip: 'Ranger en musique par petits blocs rend la corvée ludique et évite le sentiment d\'oppression !'
        };
      }

      setCompromise(analysis);
      setMediating(false);
      setFallbackMessage(prev => prev || fallbackReason || aiQuotaService.getFallbackLabel());
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">Médiateur familial IA</h2>
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
            placeholder="Exprimez ce qui ne va pas (ex: un pull emprunté sans demander, un désaccord sur le film de ce soir)..."
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

          {fallbackMessage && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold leading-relaxed">
              {fallbackMessage}
            </div>
          )}

          <div className="flex items-center space-x-2 text-[#00D26A] border-b border-white/5 pb-3">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Résolution guidée</span>
          </div>

          {/* Underling feelings */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest block">Pour la partie A :</span>
              <p className="text-white"><span className="text-white/40">Émotion:</span> {compromise.feelingB}</p>
              <p className="text-white/70 mt-1 leading-normal"><span className="text-white/40">Besoin:</span> {compromise.needB}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest block">Pour la partie B :</span>
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
              if (onMediationSuccess) {
                onMediationSuccess();
              }
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
