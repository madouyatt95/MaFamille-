import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Users, 
  GraduationCap, 
  HeartPulse, 
  Wallet, 
  Plane, 
  Landmark, 
  Search,
  ArrowLeft
} from 'lucide-react';
import type { Member } from '../types';
import type { UnifiedEvent } from '../utils/agendaHelper';

interface TimelineProps {
  events: UnifiedEvent[];
  members: Member[];
  onBack?: () => void;
  activeMemberId?: string;
}

type TimelineCategory = 'Tous' | 'Famille' | 'École' | 'Santé' | 'Budget' | 'Voyages' | 'Commune';

interface CategoryDetail {
  label: string;
  icon?: any;
  colorClass: string;
  dotColor?: string;
  shadowColor?: string;
  borderColor?: string;
  segmentColor?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  members,
  onBack,
  activeMemberId: _activeMemberId
}) => {
  const [activeFilter, setActiveFilter] = useState<TimelineCategory>('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Inject mock commune events to make the "Commune" tab lively
  const allEventsWithCommune = useMemo(() => {
    const mockCommuneEvents: UnifiedEvent[] = [
      {
        id: 'commune-mock-1',
        family_id: 'default',
        title: 'Réunion publique de quartier',
        description: 'Présentation du projet d\'aménagement des pistes cyclables et espaces verts de la mairie.',
        start_date: todayStr,
        end_date: todayStr,
        start_time: '18:00',
        end_time: '',
        all_day: false,
        source_module: 'external',
        source_id: 'mock-1',
        event_type: 'other',
        done: false
      },
      {
        id: 'commune-mock-2',
        family_id: 'default',
        title: 'Alerte météo : Vigilance Orages',
        description: 'Vigilance orange orages et vents violents de 20h à minuit. Restez à l\'abri.',
        start_date: todayStr,
        end_date: todayStr,
        start_time: '20:00',
        end_time: '',
        all_day: false,
        source_module: 'external',
        source_id: 'mock-2',
        event_type: 'other',
        done: false
      },
      {
        id: 'commune-mock-3',
        family_id: 'default',
        title: 'Collecte des déchets encombrants',
        description: 'Passage mensuel de la benne de collecte à partir de 8h00 dans la rue principale.',
        start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
        end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '',
        all_day: false,
        source_module: 'external',
        source_id: 'mock-3',
        event_type: 'other',
        done: false
      }
    ];

    // Combine standard events with Commune mock events
    return [...events, ...mockCommuneEvents].sort((a, b) => {
      const dateComp = a.start_date.localeCompare(b.start_date);
      if (dateComp !== 0) return dateComp;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [events, todayStr]);

  // Map source_module / event_type to a category
  const getEventCategory = (e: UnifiedEvent): TimelineCategory => {
    if (e.id.startsWith('commune-mock')) return 'Commune';

    const module = e.source_module;
    const type = e.event_type as string;

    if (module === 'ecole' || type === 'school' || type === 'schoolTask') return 'École';
    if (module === 'sante' || module === 'animaux' || type === 'vaccine' || type === 'pet_vac' || type === 'pet_vet') return 'Santé';
    if (module === 'budget' || type === 'bill' || type === 'abonnement') return 'Budget';
    if (module === 'voyages' || type === 'trip') return 'Voyages';
    
    // Everything else maps to family/home
    return 'Famille';
  };

  const categoryDetails: Record<TimelineCategory, CategoryDetail> = {
    Tous: { label: 'Tous', colorClass: 'bg-[#6C5CFF]/15 text-[#6C5CFF] border-[#6C5CFF]/30 hover:bg-[#6C5CFF]/25' },
    Famille: { label: 'Famille', icon: Users, colorClass: 'bg-[#6C5CFF]/15 text-[#9d94ff] border-[#6C5CFF]/30 hover:bg-[#6C5CFF]/25', dotColor: 'bg-[#6C5CFF]', shadowColor: 'shadow-[0_0_15px_rgba(108,92,255,0.6)]', borderColor: 'border-[#6C5CFF]/45 hover:border-[#6C5CFF]/85', segmentColor: 'bg-[#6C5CFF]' },
    École: { label: 'École', icon: GraduationCap, colorClass: 'bg-[#00D26A]/15 text-[#00D26A] border-[#00D26A]/30 hover:bg-[#00D26A]/25', dotColor: 'bg-[#00D26A]', shadowColor: 'shadow-[0_0_15px_rgba(0,210,106,0.6)]', borderColor: 'border-[#00D26A]/45 hover:border-[#00D26A]/85', segmentColor: 'bg-[#00D26A]' },
    Santé: { label: 'Santé', icon: HeartPulse, colorClass: 'bg-[#FF4D6D]/15 text-[#FF4D6D] border-[#FF4D6D]/30 hover:bg-[#FF4D6D]/25', dotColor: 'bg-[#FF4D6D]', shadowColor: 'shadow-[0_0_15px_rgba(255,77,109,0.6)]', borderColor: 'border-[#FF4D6D]/45 hover:border-[#FF4D6D]/85', segmentColor: 'bg-[#FF4D6D]' },
    Budget: { label: 'Budget', icon: Wallet, colorClass: 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/25', dotColor: 'bg-[#FFD700]', shadowColor: 'shadow-[0_0_15px_rgba(255,215,0,0.6)]', borderColor: 'border-[#FFD700]/45 hover:border-[#FFD700]/85', segmentColor: 'bg-[#FFD700]' },
    Voyages: { label: 'Voyages', icon: Plane, colorClass: 'bg-[#4F8CFF]/15 text-[#4F8CFF] border-[#4F8CFF]/30 hover:bg-[#4F8CFF]/25', dotColor: 'bg-[#4F8CFF]', shadowColor: 'shadow-[0_0_15px_rgba(79,140,255,0.6)]', borderColor: 'border-[#4F8CFF]/45 hover:border-[#4F8CFF]/85', segmentColor: 'bg-[#4F8CFF]' },
    Commune: { label: 'Commune', icon: Landmark, colorClass: 'bg-[#FF9F1C]/15 text-[#FF9F1C] border-[#FF9F1C]/30 hover:bg-[#FF9F1C]/25', dotColor: 'bg-[#FF9F1C]', shadowColor: 'shadow-[0_0_15px_rgba(255,159,28,0.6)]', borderColor: 'border-[#FF9F1C]/45 hover:border-[#FF9F1C]/85', segmentColor: 'bg-[#FF9F1C]' }
  };

  // Filter and sort the events list
  const filteredEvents = useMemo(() => {
    return allEventsWithCommune.filter(e => {
      const cat = getEventCategory(e);
      const matchesCategory = activeFilter === 'Tous' || cat === activeFilter;
      const matchesSearch = searchQuery.trim() === '' || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allEventsWithCommune, activeFilter, searchQuery]);

  const getTimelineDateLabel = (dateStr: string, timeStr: string) => {
    if (dateStr === todayStr) {
      return timeStr ? timeStr.replace(':', 'h') : 'Auj.';
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const monthsFr = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
    return `${d.getDate()} ${monthsFr[d.getMonth()]}`;
  };

  const getCategoryEmoji = (cat: TimelineCategory) => {
    switch (cat) {
      case 'École': return '🏫';
      case 'Santé': return '❤️';
      case 'Budget': return '💰';
      case 'Voyages': return '✈️';
      case 'Commune': return '🏛️';
      case 'Famille':
      default:
        return '👨‍👩‍👧‍👦';
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all cursor-pointer mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Timeline</h1>
            <p className="text-xs text-white/50 font-medium">Flux d'activités et événements familiaux</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/35" />
          <input 
            type="text" 
            placeholder="Rechercher une activité..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]/65 focus:bg-white/8 transition-all"
          />
        </div>

        {/* Categories filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
          {(Object.keys(categoryDetails) as TimelineCategory[]).map((cat) => {
            const details = categoryDetails[cat];
            const isActive = activeFilter === cat;
            const Icon = details.icon;

            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-300 shrink-0 flex items-center space-x-2 cursor-pointer ${
                  isActive 
                    ? 'bg-[#6C5CFF] border-[#6C5CFF] text-white shadow-[0_4px_12px_rgba(108,92,255,0.4)]' 
                    : details.colorClass
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{details.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Neon Timeline Section */}
      <div className="relative min-h-[400px]">
        {filteredEvents.length > 0 ? (
          <div className="relative flex flex-col space-y-8 py-4">
            
            {/* Central glowing vertical line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-[3px] bg-gradient-to-b from-[#6C5CFF] via-[#00D26A] to-[#FF4D6D] shadow-[0_0_15px_rgba(108,92,255,0.5)] z-0 rounded-full" />

            {/* Alternating Events */}
            {filteredEvents.map((event, idx) => {
              const cat = getEventCategory(event);
              const isEven = idx % 2 === 0;
              const details = categoryDetails[cat];
              const emoji = getCategoryEmoji(cat);
              const dateLabel = getTimelineDateLabel(event.start_date, event.start_time);
              const linkedMember = event.member_id && event.member_id !== 'Foyer' 
                ? members.find(m => m.id === event.member_id) 
                : null;

              return (
                <div 
                  key={event.id}
                  className={`relative flex items-center w-full z-10 ${
                    isEven ? 'justify-start' : 'justify-end'
                  }`}
                >
                  
                  {/* Glowing dot on the timeline line */}
                  <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full border-2 border-[#07111F] z-20 ${details.dotColor || 'bg-[#6C5CFF]'} ${details.shadowColor || ''}`} />

                  {/* Horizontal Segment Connector */}
                  {isEven ? (
                    <div className={`absolute left-[45%] w-[5%] h-[2px] top-1/2 transform -translate-y-1/2 z-10 ${details.segmentColor || 'bg-[#6C5CFF]'}`} />
                  ) : (
                    <div className={`absolute left-[50%] w-[5%] h-[2px] top-1/2 transform -translate-y-1/2 z-10 ${details.segmentColor || 'bg-[#6C5CFF]'}`} />
                  )}

                  {/* Timeline card */}
                  <div 
                    className={`w-[45%] glass-panel rounded-[24px] p-3 sm:p-5 border transition-all duration-300 hover:scale-[1.01] hover:bg-white/8 relative ${details.borderColor || 'border-white/10'} ${details.shadowColor || ''}`}
                  >
                    
                    {/* Header: Date | Category */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider text-white/40">
                        <span>📍 {dateLabel}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <span>{emoji}</span>
                          <span className="text-white/60">{cat}</span>
                        </span>
                      </div>

                      {linkedMember && (
                        <div className="flex items-center space-x-1">
                          <img 
                            src={linkedMember.photoUrl} 
                            alt={linkedMember.name} 
                            className="w-4.5 h-4.5 rounded-full object-cover border border-white/10"
                          />
                          <span className="text-[10px] text-white/55 font-semibold">{linkedMember.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                      {event.title}
                    </h3>

                    {/* Description */}
                    {event.description && (
                      <p className="text-xs text-white/50 mt-1.5 leading-relaxed font-sans">
                        {event.description}
                      </p>
                    )}

                    {/* Done / Check Status if applicable */}
                    {event.done && (
                      <div className="mt-3 inline-flex items-center space-x-1 text-[10px] font-extrabold text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <span>✓</span>
                        <span>Confirmé / Fait</span>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 text-white/20">
              <Clock className="w-12 h-12" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Aucun événement à afficher</h4>
              <p className="text-xs text-white/40 mt-1">
                Aucune activité ne correspond à vos filtres de recherche actuels.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
