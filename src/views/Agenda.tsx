import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MapPin, 
  Clock, 
  Info,
  CheckSquare,
  Square,
  RefreshCw,
  SlidersHorizontal,
  GripHorizontal
} from 'lucide-react';
import type { FamilyEvent, Member, EventType } from '../types';

interface AgendaProps {
  events: FamilyEvent[];
  members: Member[];
  onAddEventClick: () => void;
  onToggleEventDone: (id: string) => void;
  onMoveEvent: (eventId: string, newDate: string) => void;
  activeMemberId?: string;
}

export const Agenda: React.FC<AgendaProps> = ({
  events,
  members,
  onAddEventClick,
  onToggleEventDone,
  onMoveEvent,
  activeMemberId = '1'
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-05-18');
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [googleSynced, setGoogleSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isChild = activeMemberId === '3' || activeMemberId === '4';

  const visibleEvents = useMemo(() => {
    return events.filter(e => {
      if (!isChild) return true;
      if (e.memberId === activeMemberId) return true;
      if (e.type === 'school' || e.type === 'social') return true;
      if (!e.memberId) return true;
      return false;
    });
  }, [events, isChild, activeMemberId]);

  // May 2026 Calendar grid data
  const daysInMonth = 31;
  const startOffset = 4; // Lundi=0, Mar=1, Mer=2, Jeu=3, Ven=4
  
  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      cells.push({ day: d, dateStr: `2026-05-${dayStr}` });
    }
    return cells;
  }, []);

  const weekCells = useMemo(() => {
    // Current demo week starting 18 May 2026
    return [
      { day: 18, dateStr: '2026-05-18', name: 'Lun' },
      { day: 19, dateStr: '2026-05-19', name: 'Mar' },
      { day: 20, dateStr: '2026-05-20', name: 'Mer' },
      { day: 21, dateStr: '2026-05-21', name: 'Jeu' },
      { day: 22, dateStr: '2026-05-22', name: 'Ven' },
      { day: 23, dateStr: '2026-05-23', name: 'Sam' },
      { day: 24, dateStr: '2026-05-24', name: 'Dim' }
    ];
  }, []);

  const memberColors: { [key: string]: string } = {
    '1': 'bg-[#4F8CFF]', // Papa (Bleu)
    '2': 'bg-[#6C5CFF]', // Maman (Violet)
    '3': 'bg-[#FFB020]', // Amadou (Orange)
    '4': 'bg-[#FF4D6D]', // Awa (Rose/Rouge)
    '5': 'bg-[#00D26A]'  // Ibrahima (Vert)
  };

  const typeLabels: { [key in EventType]: string } = {
    medical: 'Médical',
    school: 'École',
    bill: 'Factures',
    grocery: 'Courses',
    social: 'Loisirs',
    other: 'Autre'
  };

  const getDotsForDay = (dateStr: string) => {
    const dayEvents = visibleEvents.filter(e => e.dateTime.startsWith(dateStr));
    return dayEvents.map(e => e.memberId ? memberColors[e.memberId] : 'bg-white/50').slice(0, 3);
  };

  const triggerGoogleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setGoogleSynced(true);
    }, 1200);
  };

  const filteredEvents = useMemo(() => {
    return visibleEvents.filter(event => {
      const matchesDate = event.dateTime.startsWith(selectedDate);
      const matchesType = selectedTypeFilter === 'all' || event.type === selectedTypeFilter;
      const matchesMember = selectedMemberFilter === 'all' || event.memberId === selectedMemberFilter;
      return matchesDate && matchesType && matchesMember;
    });
  }, [visibleEvents, selectedDate, selectedTypeFilter, selectedMemberFilter]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('eventId', eventId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('eventId');
    if (eventId) {
      onMoveEvent(eventId, targetDate);
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Agenda</h1>
            <p className="text-xs text-white/50 font-medium">Calendrier partagé de la maison</p>
          </div>
        </div>
        
        <button 
          onClick={onAddEventClick}
          className="p-3 rounded-2xl bg-[#6C5CFF] text-white hover:opacity-90 transition-all cursor-pointer shadow-[0_4px_12px_rgba(108,92,255,0.4)]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Google Calendar Sync Card */}
      <div className="glass-panel rounded-[28px] p-4 border border-white/6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-[#6C5CFF]' : ''}`} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Synchronisation Google Calendar</h4>
            <p className="text-[10px] text-white/50">Mise à jour en temps réel activée</p>
          </div>
        </div>
        <button 
          onClick={triggerGoogleSync}
          disabled={syncing}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            googleSynced 
              ? 'bg-[#00D26A]/10 border border-[#00D26A]/30 text-[#00D26A]' 
              : 'bg-[#6C5CFF] text-white hover:opacity-90'
          }`}
        >
          {syncing ? 'Synchro...' : googleSynced ? 'Synchronisé' : 'Synchroniser'}
        </button>
      </div>

      {/* Main Container */}
      <div className={viewType === 'month' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-6"}>
        
        {/* Calendar Widget */}
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 space-y-3 sm:space-y-0">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mai 2026</h3>
            <div className="flex bg-[#112240] p-1 rounded-xl border border-white/5">
              <button onClick={() => setViewType('month')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewType === 'month' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'}`}>Mois</button>
              <button onClick={() => setViewType('week')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewType === 'week' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'}`}>Semaine</button>
            </div>
          </div>

          {viewType === 'month' ? (
            /* Month Grid */
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <span key={day} className="text-[9px] font-bold text-white/30 uppercase py-1">{day}</span>
              ))}

              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDate;
                const hasEvents = cell.dateStr ? visibleEvents.some(e => e.dateTime.startsWith(cell.dateStr!)) : false;
                
                return (
                  <button
                    key={idx}
                    disabled={!cell.day}
                    onClick={() => cell.dateStr && setSelectedDate(cell.dateStr)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => cell.dateStr && handleDrop(e, cell.dateStr)}
                    className={`relative aspect-square rounded-[14px] flex flex-col items-center justify-center transition-all ${
                      !cell.day 
                        ? 'opacity-0 pointer-events-none' 
                        : isSelected
                          ? 'bg-[#6C5CFF] text-white font-extrabold shadow-[0_4px_10px_rgba(108,92,255,0.4)] cursor-pointer'
                          : 'text-white/80 hover:bg-white/5 hover:text-white cursor-pointer'
                    }`}
                  >
                    <span className="text-xs font-semibold">{cell.day}</span>
                    {cell.day && cell.dateStr && hasEvents && (
                      <div className="absolute bottom-1.5 flex justify-center space-x-0.5 pointer-events-none">
                        {getDotsForDay(cell.dateStr).map((dotClass, dIdx) => (
                          <span key={dIdx} className={`w-1 h-1 rounded-full ${dotClass}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Week View Grid */
            <div className="grid grid-cols-7 gap-2 overflow-x-auto min-w-[600px] pb-4 no-scrollbar">
              {weekCells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDate;
                const dayEvents = visibleEvents.filter(e => e.dateTime.startsWith(cell.dateStr));
                
                return (
                  <div 
                    key={idx} 
                    className="flex flex-col h-[400px] bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-colors hover:border-[#6C5CFF]/30"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, cell.dateStr)}
                    onClick={() => setSelectedDate(cell.dateStr)}
                  >
                    <div className={`p-2 text-center border-b border-white/5 ${isSelected ? 'bg-[#6C5CFF]/20 text-[#6C5CFF]' : ''}`}>
                      <p className="text-[10px] font-bold uppercase">{cell.name}</p>
                      <p className="text-sm font-extrabold">{cell.day}</p>
                    </div>
                    
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto no-scrollbar">
                      {dayEvents.map(event => {
                         const member = members.find(m => m.id === event.memberId);
                         const dotColor = event.memberId ? memberColors[event.memberId] : 'bg-white/40';
                         return (
                           <div 
                             key={event.id}
                             draggable
                             onDragStart={(e) => handleDragStart(e, event.id)}
                             className="p-2 rounded-xl bg-[#112240] border border-white/10 text-xs shadow-md cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform"
                           >
                             <div className="flex items-center space-x-1.5 mb-1">
                               <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                               <span className="font-bold truncate text-white">{event.time}</span>
                             </div>
                             <p className="font-semibold text-white/90 truncate">{event.title}</p>
                             {member && <p className="text-[9px] text-white/50 mt-1 truncate">{member.name}</p>}
                           </div>
                         );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Color Legend */}
          <div className="pt-3 border-t border-white/5 flex flex-wrap gap-x-3 gap-y-2 justify-center">
            {members.map(m => (
              <div key={m.id} className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${memberColors[m.id]}`} />
                <span className="text-[10px] text-white/50 font-medium">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule List (Only visible in Month view for layout reasons) */}
        {viewType === 'month' && (
          <div className="space-y-4">
            
            {/* Controls / Filters */}
            <div className="glass-panel rounded-[24px] p-3 border border-white/6 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider pb-2 border-b border-white/5">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#6C5CFF]" />
                  <span>Filtres de l'agenda</span>
                </span>
                <button 
                  onClick={() => { setSelectedTypeFilter('all'); setSelectedMemberFilter('all'); }}
                  className="text-[10px] text-[#4F8CFF] hover:underline cursor-pointer"
                >
                  Réinitialiser
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#07111F] border border-white/8 text-[11px] text-white focus:outline-none"
                >
                  <option value="all">Tous types</option>
                  <option value="medical">Médical</option>
                  <option value="school">École</option>
                  <option value="bill">Factures</option>
                  <option value="social">Loisirs</option>
                  <option value="other">Autre</option>
                </select>

                <select 
                  value={selectedMemberFilter}
                  onChange={(e) => setSelectedMemberFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#07111F] border border-white/8 text-[11px] text-white focus:outline-none"
                >
                  <option value="all">Tous membres</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">
                Événements du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>

              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => {
                  const member = members.find(m => m.id === event.memberId);
                  const dotColor = event.memberId ? memberColors[event.memberId] : 'bg-white/40';
                  
                  return (
                    <div 
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      className={`glass-panel rounded-[28px] p-4 border border-white/8 transition-all hover:bg-white/8 flex items-start justify-between cursor-grab active:cursor-grabbing ${
                        event.done ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button 
                          onClick={() => onToggleEventDone(event.id)}
                          className="text-white/40 hover:text-white transition-colors cursor-pointer mt-1"
                        >
                          {event.done ? (
                            <CheckSquare className="w-5 h-5 text-[#00D26A]" />
                          ) : (
                            <Square className="w-5 h-5 text-white/30" />
                          )}
                        </button>
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-[0_0_8px_currentColor]`} />
                            <h4 className={`text-xs sm:text-sm font-bold text-white ${event.done ? 'line-through text-white/40' : ''}`}>
                              {event.title}
                            </h4>
                          </div>
                          
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                            {typeLabels[event.type]} {member ? `• ${member.name}` : ''}
                          </p>
                          
                          {event.location && (
                            <div className="flex items-center space-x-1 text-[11px] text-white/50">
                              <MapPin className="w-3.5 h-3.5 text-[#FF4D6D]" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          
                          {event.description && (
                            <div className="flex items-start space-x-1 text-[11px] text-white/50">
                              <Info className="w-3.5 h-3.5 text-[#4F8CFF] shrink-0 mt-0.5" />
                              <span>{event.description}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2 shrink-0">
                        <span className="text-xs font-bold text-white/70 bg-white/5 px-2.5 py-1.5 rounded-[12px] border border-white/5 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-[#6C5CFF]" />
                          <span>{event.time}</span>
                        </span>
                        <GripHorizontal className="w-4 h-4 text-white/20" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="glass-panel rounded-[28px] border border-white/8 p-6 text-center text-white/30 text-xs">
                  Aucun événement prévu pour cette journée avec ces critères.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
