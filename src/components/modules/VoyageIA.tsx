import React, { useState } from 'react';
import { 
  Plane, 
  Sparkles, 
  Sun, 
  CloudRain, 
  Snowflake
} from 'lucide-react';
import type { Member, Trip } from '../../types';
import { aiQuotaService } from '../../services/aiQuotaService';

interface VoyageIAProps {
  trips: Trip[];
  members: Member[];
  formatMoney: (amount: number) => string;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
}

type PackingListItem = { text: string; checked: boolean };
type MemberPackingList = {
  memberId: string;
  memberName: string;
  memberLabel: string;
  items: PackingListItem[];
};

export const VoyageIA: React.FC<VoyageIAProps> = ({ 
  trips, 
  members,
  formatMoney, 
  isPremium = false, 
  onTriggerPaywall 
}) => {
  const [destination, setDestination] = useState('Dakar, Sénégal 🇸🇳');
  const [days, setDays] = useState('7');
  const [weather, setWeather] = useState('sunny');
  const [generating, setGenerating] = useState(false);
  const [packingLists, setPackingLists] = useState<MemberPackingList[] | null>(null);

  const travelMembers = members.slice(0, 5).map((member, index) => {
    const age = member.age ? `, ${member.age} ans` : '';
    const role = member.role ? `, rôle ${member.role}` : '';
    return {
      ...member,
      label: `${member.name}${age}${role}`,
      key: `member_${index + 1}`
    };
  });

  const fallbackMembers = travelMembers.length > 0
    ? travelMembers
    : [{ id: 'family', name: 'Famille', label: 'Famille', key: 'member_1' } as Member & { label: string; key: string }];

  const buildLocalItemsForMember = (memberName: string): PackingListItem[] => [
    { text: `Papiers et documents utiles pour ${memberName}`, checked: false },
    { text: 'Chargeur, câble et batterie externe', checked: false },
    { text: `Vêtements adaptés à ${destination}`, checked: false },
    { text: weather === 'rainy' ? 'Veste imperméable ou parapluie' : weather === 'snowy' ? 'Vêtements chauds et gants' : 'Protection solaire et lunettes', checked: false },
    { text: 'Trousse de toilette et médicaments personnels', checked: false }
  ];

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
        const memberLines = fallbackMembers
          .map((member, index) => `${index + 1}. ${member.label}`)
          .join('\n');
        const expectedJsonShape = fallbackMembers
          .map(member => `  "${member.key}": [\n    {"text": "Objet précis à emporter pour ${member.name}", "checked": false}\n  ]`)
          .join(',\n');

        const prompt = `Tu es le planificateur de voyages IA de l'application MaFamille+.
Génère des checklists de bagages extrêmement pertinentes et personnalisées pour ces membres réels du foyer :
${memberLines}

Le voyage est prévu pour la destination : ${destination}, pour une durée de ${days} jours, sous une météo de type : ${weather === 'sunny' ? 'ensoleillée et chaude ☀️' : weather === 'rainy' ? 'pluvieuse et humide 🌧️' : 'hivernale et froide ❄️'}.

Renvoie STRICTEMENT un objet JSON brut valide, sans balises markdown (pas de \`\`\`json), sans texte explicatif avant ou après, contenant exactement cette structure :
{
${expectedJsonShape}
}
Génère EXACTEMENT 5 éléments ultra-pertinents par membre. N'invente aucun prénom absent de la liste.`;

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

        const parsedLists = JSON.parse(textResult);
        const normalizedLists = fallbackMembers.map(member => ({
          memberId: member.id,
          memberName: member.name,
          memberLabel: member.label,
          items: Array.isArray(parsedLists[member.key]) ? parsedLists[member.key] : buildLocalItemsForMember(member.name)
        }));

        if (normalizedLists.every(list => list.items.length > 0)) {
          setPackingLists(normalizedLists);
          setGenerating(false);
          const { remaining, limit } = aiQuotaService.getQuotaFromResponse(response, isPremium);
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

      const lists = fallbackMembers.map(member => ({
        memberId: member.id,
        memberName: member.name,
        memberLabel: member.label,
        items: buildLocalItemsForMember(member.name)
      }));

      setPackingLists(lists);
      setGenerating(false);

      if (isQuotaFallback) {
        console.info("[VoyageIA] Quota quotidien d'IA réelle épuisé. Basculement sur le planificateur local.");
      } else {
        console.info("[VoyageIA] Basculement sur le planificateur de voyage local.");
      }
    }, 1000);
  };

  const handleToggleItem = (memberId: string, idx: number) => {
    if (!packingLists) return;
    const updated = packingLists.map(list => {
      if (list.memberId !== memberId) return list;
      return {
        ...list,
        items: list.items.map((item, itemIdx) => itemIdx === idx ? { ...item, checked: !item.checked } : item)
      };
    });
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
            {packingLists.map((list, listIndex) => {
              const colors = ['text-[#4F8CFF]', 'text-[#FFB020]', 'text-[#FF4D6D]', 'text-[#00D26A]', 'text-[#A78BFA]'];
              return (
                <div key={list.memberId} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${colors[listIndex % colors.length]}`}>
                    Valise {list.memberName} ✨
                  </span>
                  <div className="space-y-2">
                    {list.items.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleToggleItem(list.memberId, idx)}
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
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
