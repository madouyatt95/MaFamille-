import React, { useState } from 'react';
import { 
  Plane, 
  Sparkles, 
  Sun, 
  CloudRain, 
  Snowflake
} from 'lucide-react';
import type { Trip } from '../../types';
import { aiQuotaService } from '../../services/aiQuotaService';

interface VoyageIAProps {
  trips: Trip[];
  formatMoney: (amount: number) => string;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
}

export const VoyageIA: React.FC<VoyageIAProps> = ({ 
  trips, 
  formatMoney, 
  isPremium = false, 
  onTriggerPaywall 
}) => {
  const [destination, setDestination] = useState('Dakar, Sénégal 🇸🇳');
  const [days, setDays] = useState('7');
  const [weather, setWeather] = useState('sunny');
  const [generating, setGenerating] = useState(false);
  const [packingLists, setPackingLists] = useState<any | null>(null);

  const generatePackingChecklist = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      return;
    }

    setGenerating(true);
    setPackingLists(null);

    // Tente d'utiliser l'IA réelle si le quota est disponible (soit via clé locale VITE_, soit via le proxy serveurless)
    const useRealAI = aiQuotaService.consumeAIQuota(isPremium);

    if (useRealAI) {
      try {
        const prompt = `Tu es le planificateur de voyages IA de l'application MaFamille+.
Génère des checklists de bagages extrêmement pertinentes et personnalisées pour 3 membres de la famille :
1. Papa (affaires d'adulte responsable, papiers d'identité, chargeurs, pharmacie, etc.)
2. Amadou (garçon de 12 ans autonome, jeux de voyage, livres, vêtements adaptés)
3. Awa (fillette de 8 ans, doudou, cahier de coloriage, vêtements adaptés)

Le voyage est prévu pour la destination : ${destination}, pour une durée de ${days} jours, sous une météo de type : ${weather === 'sunny' ? 'ensoleillée et chaude ☀️' : weather === 'rainy' ? 'pluvieuse et humide 🌧️' : 'hivernale et froide ❄️'}.

Renvoie STRICTEMENT un objet JSON brut valide, sans balises markdown (pas de \`\`\`json), sans texte explicatif avant ou après, contenant exactement cette structure :
{
  "papa": [
    {"text": "Objet précis à emporter", "checked": false}
  ],
  "amadou": [
    {"text": "Objet précis à emporter", "checked": false}
  ],
  "awa": [
    {"text": "Objet précis à emporter", "checked": false}
  ]
}
Génère EXACTEMENT 5 éléments ultra-pertinents par personne.`;

        const groqEndpoint = import.meta.env.DEV ? 'https://ma-famille-nu.vercel.app/api/groq' : '/api/groq';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (import.meta.env.VITE_GROQ_API_KEY) {
          headers['Authorization'] = `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`;
        }

        const response = await fetch(groqEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });

        if (!response.ok) throw new Error('Groq API call failed');
        const data = await response.json();
        let textResult = data.choices?.[0]?.message?.content || '';
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedLists = JSON.parse(textResult);
        if (parsedLists.papa && parsedLists.amadou && parsedLists.awa) {
          setPackingLists(parsedLists);
          setGenerating(false);
          const remaining = aiQuotaService.getRemainingCalls(isPremium);
          const limit = aiQuotaService.getDailyLimit();
          alert(`💼 Valises personnalisées générées en temps réel par l'IA Groq Llama 3 ! (Quota réel restant : ${remaining}/${limit} aujourd'hui)`);
          return;
        } else {
          throw new Error('Structure JSON reçue incorrecte');
        }
      } catch (err) {
        console.warn("[VoyageIA] Erreur de connexion avec l'IA réelle Groq, repli sur le planificateur local :", err);
      }
    }

    // Version locale de repli
    setTimeout(() => {
      const remainingCalls = aiQuotaService.getRemainingCalls(isPremium);
      const isQuotaFallback = isPremium && remainingCalls === 0;

      const lists = {
        papa: [
          { text: 'Passeports & Billets d\'avion', checked: false },
          { text: 'Cartes bancaires & Devises', checked: true },
          { text: 'Dossier imprimé de réservations', checked: false },
          { text: 'Lunettes de soleil & Crème solaire 50+', checked: true },
          { text: 'Chargeurs et adaptateurs universels', checked: false },
        ],
        amadou: [
          { text: 'Console Nintendo Switch + Chargeur', checked: false },
          { text: '3 Shorts & 5 T-shirts légers', checked: true },
          { text: 'Livre de lecture vacances', checked: false },
          { text: 'Casquette & Maillot de bain', checked: false },
        ],
        awa: [
          { text: 'Peluche préférée (Doudou) 🧸', checked: true },
          { text: 'Cahier de coloriage & Feutres', checked: false },
          { text: 'Lunettes de soleil de piscine', checked: false },
          { text: 'Brassards & Chapeau de soleil', checked: true },
        ]
      };

      setPackingLists(lists);
      setGenerating(false);

      if (isQuotaFallback) {
        console.info("[VoyageIA] Quota quotidien d'IA réelle épuisé. Basculement sur le planificateur local.");
      } else {
        console.info("[VoyageIA] Basculement sur le planificateur de voyage local.");
      }
    }, 1000);
  };

  const handleToggleItem = (category: 'papa' | 'amadou' | 'awa', idx: number) => {
    if (!packingLists) return;
    const updated = { ...packingLists };
    updated[category][idx].checked = !updated[category][idx].checked;
    setPackingLists(updated);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D]">
          <Plane className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">Planificateur de Voyage & Valise IA ({trips.length} projets)</h2>
          <p className="text-xs text-white/50">Préparez vos checklists intelligentes. Budget suggéré : {formatMoney(250 * Number(days) || 1500)}</p>
        </div>
      </div>

      {/* Trip generator form */}
      <form onSubmit={generatePackingChecklist} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Nouveau projet de voyage :</span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Destination</label>
            <input 
              type="text" 
              required
              placeholder="ex: Dakar, Sénégal..." 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Durée (jours)</label>
            <input 
              type="number" 
              required
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF4D6D]"
            />
          </div>
        </div>

        {/* Weather selection */}
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Météo prévue</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sunny', label: 'Ensoleillé ☀️', icon: Sun, color: 'hover:border-[#FFB020] hover:text-[#FFB020]' },
              { id: 'rainy', label: 'Pluvieux 🌧️', icon: CloudRain, color: 'hover:border-[#4F8CFF] hover:text-[#4F8CFF]' },
              { id: 'snowy', label: 'Hivernal ❄️', icon: Snowflake, color: 'hover:border-[#FF4D6D] hover:text-[#FF4D6D]' }
            ].map(w => {
              const Icon = w.icon;
              const isActive = weather === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWeather(w.id)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                    isActive 
                      ? 'bg-[#FF4D6D]/15 border-[#FF4D6D] text-[#FF4D6D] shadow-[0_0_10px_rgba(255,77,109,0.15)]' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/8 ' + w.color
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{w.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={generating}
          className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#FFB020] text-white font-semibold text-xs shadow-md cursor-pointer transition-all hover:opacity-95 flex items-center justify-center space-x-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{generating ? 'Génération de valises IA...' : 'Générer ma Valise Intelligente'}</span>
        </button>
      </form>

      {/* Generated Packing Checklists */}
      {packingLists && (
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Valises personnalisées :</span>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Papa / Parents */}
            <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3">
              <span className="text-[10px] font-bold text-[#4F8CFF] uppercase tracking-wider block">Valise Papa 👑</span>
              <div className="space-y-2">
                {packingLists.papa.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleToggleItem('papa', idx)}
                    className="w-full flex items-center space-x-2 text-left text-xs cursor-pointer py-0.5"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                      item.checked ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className={`${item.checked ? 'line-through text-white/40' : 'text-white'}`}>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amadou */}
            <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3">
              <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-wider block">Valise Amadou ⭐️ (12 ans)</span>
              <div className="space-y-2">
                {packingLists.amadou.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleToggleItem('amadou', idx)}
                    className="w-full flex items-center space-x-2 text-left text-xs cursor-pointer py-0.5"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                      item.checked ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className={`${item.checked ? 'line-through text-white/40' : 'text-white'}`}>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Awa */}
            <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3">
              <span className="text-[10px] font-bold text-[#FF4D6D] uppercase tracking-wider block">Valise Awa ⭐️ (8 ans)</span>
              <div className="space-y-2">
                {packingLists.awa.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleToggleItem('awa', idx)}
                    className="w-full flex items-center space-x-2 text-left text-xs cursor-pointer py-0.5"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                      item.checked ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className={`${item.checked ? 'line-through text-white/40' : 'text-white'}`}>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
