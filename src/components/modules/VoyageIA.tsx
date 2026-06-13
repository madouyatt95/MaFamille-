import React, { useEffect, useMemo, useState } from 'react';
import { 
  Plane, 
  Sparkles, 
  Sun, 
  CloudRain, 
  Snowflake,
  Users,
  WalletCards,
  CalendarDays,
  ClipboardList,
  Copy,
  CheckCircle2
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

const normalizePackingItems = (value: unknown): PackingListItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { text: string; checked?: boolean } => (
      typeof item === 'object' && item !== null && 'text' in item && typeof item.text === 'string'
    ))
    .map(item => ({ text: item.text, checked: item.checked === true }));
};

export const VoyageIA: React.FC<VoyageIAProps> = ({ 
  trips, 
  members,
  formatMoney, 
  isPremium = false, 
  onTriggerPaywall 
}) => {
  const upcomingTrips = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...trips]
      .filter(trip => !trip.startDate || trip.startDate >= today)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [trips]);

  const getTripDuration = (trip: Trip) => {
    if (!trip.startDate || !trip.endDate) return 7;
    const start = new Date(`${trip.startDate}T12:00:00`);
    const end = new Date(`${trip.endDate}T12:00:00`);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Number.isFinite(diff) && diff > 0 ? diff : 7;
  };

  const [destination, setDestination] = useState(() => upcomingTrips[0]?.destination || '');
  const [days, setDays] = useState(() => String(upcomingTrips[0] ? getTripDuration(upcomingTrips[0]) : 7));
  const [weather, setWeather] = useState('sunny');
  const [generating, setGenerating] = useState(false);
  const [packingLists, setPackingLists] = useState<MemberPackingList[] | null>(() => {
    try {
      const cached = localStorage.getItem('mf_voyage_packing_lists');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => members.slice(0, 5).map(member => member.id));
  const [quotaMessage, setQuotaMessage] = useState('');

  useEffect(() => {
    setSelectedMemberIds(prev => {
      const available = members.map(member => member.id);
      const kept = prev.filter(id => available.includes(id));
      return kept.length > 0 ? kept : members.slice(0, 5).map(member => member.id);
    });
  }, [members]);

  const travelMembers = members.slice(0, 5).map((member, index) => {
    const age = member.age ? `, ${member.age} ans` : '';
    const role = member.role ? `, rôle ${member.role}` : '';
    return {
      ...member,
      label: `${member.name}${age}${role}`,
      key: `member_${index + 1}`
    };
  });

  const selectedTravelMembers = travelMembers.filter(member => selectedMemberIds.includes(member.id));

  const fallbackMembers = selectedTravelMembers.length > 0
    ? selectedTravelMembers
    : travelMembers.length > 0
    ? travelMembers
    : [{ id: 'family', name: 'Famille', label: 'Famille', key: 'member_1' } as Member & { label: string; key: string }];

  const buildLocalItemsForMember = (memberName: string): PackingListItem[] => [
    { text: `Papiers et documents utiles pour ${memberName}`, checked: false },
    { text: 'Chargeur, câble et batterie externe', checked: false },
    { text: `Vêtements adaptés à ${destination}`, checked: false },
    { text: weather === 'rainy' ? 'Veste imperméable ou parapluie' : weather === 'snowy' ? 'Vêtements chauds et gants' : 'Protection solaire et lunettes', checked: false },
    { text: 'Trousse de toilette et médicaments personnels', checked: false }
  ];

  const persistPackingLists = (lists: MemberPackingList[] | null) => {
    setPackingLists(lists);
    if (lists) {
      localStorage.setItem('mf_voyage_packing_lists', JSON.stringify(lists));
    } else {
      localStorage.removeItem('mf_voyage_packing_lists');
    }
  };

  const handleUseTrip = (trip: Trip) => {
    setDestination(trip.destination);
    setDays(String(getTripDuration(trip)));
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(memberId)) {
        const next = prev.filter(id => id !== memberId);
        return next.length > 0 ? next : prev;
      }
      return [...prev, memberId].slice(0, 5);
    });
  };

  const generatePackingChecklist = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      return;
    }

    setGenerating(true);
    persistPackingLists(null);
    setFallbackMessage('');
    setQuotaMessage('');
    let fallbackReason = '';

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
        const normalizedLists: MemberPackingList[] = fallbackMembers.map(member => ({
          memberId: member.id,
          memberName: member.name,
          memberLabel: member.label,
          items: normalizePackingItems(parsedLists[member.key])
        }));

        normalizedLists.forEach(list => {
          if (list.items.length === 0) {
            list.items = buildLocalItemsForMember(list.memberName);
          }
        });

        if (normalizedLists.every(list => list.items.length > 0)) {
          persistPackingLists(normalizedLists);
          setGenerating(false);
          const { remaining, limit } = aiQuotaService.getQuotaFromResponse(response, isPremium);
          setQuotaMessage(`Préparation générée en direct. Requêtes restantes aujourd'hui : ${remaining}/${limit}.`);
          return;
        } else {
          throw new Error('Structure JSON reçue incorrecte');
        }
      } catch (err) {
        console.warn("[VoyageIA] Erreur de connexion avec l'IA réelle Groq, repli sur le planificateur local :", err);
        fallbackReason = aiQuotaService.getFallbackLabel(err);
        setFallbackMessage(fallbackReason);
      }
    }

    // Version locale de repli
    setTimeout(() => {
      const lists = fallbackMembers.map(member => ({
        memberId: member.id,
        memberName: member.name,
        memberLabel: member.label,
        items: buildLocalItemsForMember(member.name)
      }));

      persistPackingLists(lists);
      setFallbackMessage(prev => prev || fallbackReason || aiQuotaService.getFallbackLabel());
      setGenerating(false);
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
    persistPackingLists(updated);
  };

  const packingStats = useMemo(() => {
    const total = packingLists?.reduce((acc, list) => acc + list.items.length, 0) || 0;
    const done = packingLists?.reduce((acc, list) => acc + list.items.filter(item => item.checked).length, 0) || 0;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress };
  }, [packingLists]);

  const copyPackingLists = async () => {
    if (!packingLists) return;
    const text = [
      `Voyage : ${destination || 'Destination à préciser'} (${days} jour${Number(days) > 1 ? 's' : ''})`,
      '',
      ...packingLists.flatMap(list => [
        `Valise ${list.memberName}`,
        ...list.items.map(item => `${item.checked ? '[x]' : '[ ]'} ${item.text}`),
        ''
      ])
    ].join('\n');
    await navigator.clipboard.writeText(text);
    alert('Liste de valises copiée.');
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D]">
          <Plane className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">Préparation voyage familiale</h2>
          <p className="text-xs text-white/50">Valises par membre, budget indicatif et suivi avant départ.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
          <Users className="w-4 h-4 text-[#4F8CFF] mb-2" />
          <p className="text-lg font-extrabold text-white">{fallbackMembers.length}</p>
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">voyageurs</p>
        </div>
        <div className="rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/10 p-3">
          <WalletCards className="w-4 h-4 text-[#FFB020] mb-2" />
          <p className="text-lg font-extrabold text-white">{formatMoney(250 * Number(days) || 1500)}</p>
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">budget repère</p>
        </div>
        <div className="rounded-2xl border border-[#00D26A]/20 bg-[#00D26A]/10 p-3">
          <ClipboardList className="w-4 h-4 text-[#00D26A] mb-2" />
          <p className="text-lg font-extrabold text-white">{packingStats.progress}%</p>
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">préparé</p>
        </div>
      </div>

      {(quotaMessage || fallbackMessage) && (
        <div className={`p-3 rounded-2xl border text-xs font-bold leading-relaxed ${
          quotaMessage ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        }`}>
          {quotaMessage || "Connexion IA indisponible ou quota atteint : le planificateur local prend le relais pour continuer sans bloquer."}
        </div>
      )}

      {upcomingTrips.length > 0 && (
        <div className="glass-panel border border-white/8 rounded-[24px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Voyages enregistrés</span>
            <CalendarDays className="w-4 h-4 text-white/30" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {upcomingTrips.slice(0, 5).map(trip => (
              <button
                key={trip.id}
                type="button"
                onClick={() => handleUseTrip(trip)}
                className="shrink-0 min-w-[170px] text-left rounded-2xl border border-white/8 bg-white/[0.04] p-3 hover:bg-white/[0.07] transition"
              >
                <p className="text-xs font-extrabold text-white truncate">{trip.destination}</p>
                <p className="text-[10px] text-white/45 mt-1">{trip.startDate || 'Date à préciser'} • {getTripDuration(trip)} j</p>
                <p className="text-[10px] text-[#FFB020] font-bold mt-1">{formatMoney(trip.budget || 0)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trip generator form */}
      <form onSubmit={generatePackingChecklist} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Préparer les valises</span>
        
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

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Voyageurs</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {travelMembers.length > 0 ? travelMembers.map(member => {
              const selected = selectedMemberIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleToggleMember(member.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selected ? 'bg-[#4F8CFF]/15 border-[#4F8CFF]/35 text-white' : 'bg-white/5 border-white/5 text-white/45'
                  }`}
                >
                  <span className="text-[11px] font-bold block truncate">{member.name}</span>
                  <span className="text-[9px] opacity-60 truncate block">{member.age || member.role || 'Membre'}</span>
                </button>
              );
            }) : (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">
                Ajoutez les membres du foyer pour générer des valises personnalisées.
              </div>
            )}
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
          <span>{generating ? 'Préparation des valises...' : 'Générer les valises familiales'}</span>
        </button>
      </form>

      {/* Generated Packing Checklists */}
      {packingLists && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Valises personnalisées</span>
              <p className="text-[10px] text-white/40 mt-1">{packingStats.done}/{packingStats.total} élément(s) préparés</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyPackingLists}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier</span>
              </button>
              <button
                type="button"
                onClick={() => persistPackingLists(null)}
                className="px-3 py-2 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF8BA0] text-[10px] font-bold"
              >
                Réinitialiser
              </button>
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#00D26A] to-[#FFB020] transition-all" style={{ width: `${packingStats.progress}%` }} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packingLists.map((list, listIndex) => {
              const colors = ['text-[#4F8CFF]', 'text-[#FFB020]', 'text-[#FF4D6D]', 'text-[#00D26A]', 'text-[#A78BFA]'];
              return (
                <div key={list.memberId} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${colors[listIndex % colors.length]}`}>
                      Valise {list.memberName}
                    </span>
                    {list.items.every(item => item.checked) && <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />}
                  </div>
                  <div className="space-y-2">
                    {list.items.map((item, idx) => (
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
