import React, { useState, useMemo } from 'react';
import { 
  Menu, 
  Bell, 
  Brush, 
  ShoppingBasket, 
  HeartPulse, 
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Wifi,
  BookOpen,
  ShoppingCart,
  Clock,
  UtensilsCrossed,
  MessageCircle,
  Plane,
  Car,
  Calendar,
  Gift,
  FileText,
  Wrench,
  RefreshCw,
  Landmark,
  GraduationCap
} from 'lucide-react';
import type { Member, Dish, NotificationAlert, ChatGroup, ChatMessage, MemoryLog } from '../types';
import type { UnifiedEvent } from '../utils/agendaHelper';

export const DishImage: React.FC<{ src: string | undefined; alt: string; className?: string }> = ({ src, alt, className = "w-16 h-16 rounded-[18px]" }) => {
  const [hasError, setHasError] = React.useState(false);
  
  if (!src || hasError) {
    return (
      <div className={`${className} shrink-0 bg-gradient-to-tr from-[#FFB020] to-[#FF4D6D] flex items-center justify-center text-white border border-white/10 shadow-sm`}>
        <UtensilsCrossed className="w-5 h-5 text-black" />
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      onError={() => setHasError(true)}
      className={`${className} object-cover border border-white/10 shadow-lg shrink-0`}
    />
  );
};

interface AccueilProps {
  members: Member[];
  events: UnifiedEvent[];
  dishes: Dish[];
  alerts: NotificationAlert[];
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;
  onMenuClick: () => void;
  onAlertsClick: () => void;

  activeMemberId?: string;
  onProfileSwitcherOpen?: () => void;
  onAvatarClick?: () => void;
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
  onEventClick: (dateStr: string) => void;
  memories: MemoryLog[];
  onAddMemory: (newMemory: MemoryLog) => void;
  onDeleteMemory: (id: string) => void;
  onLikeMemory: (id: string, newLikesCount: number) => void;

  savingGoals?: any[];
  onDeleteUnifiedEvent?: (id: string, moduleName: string) => Promise<void>;
  onArchiveUnifiedEvent?: (id: string, moduleName: string) => Promise<void>;
  activeFamilyName?: string;
  onOpenSpaceSelector?: () => void;
}

export const Accueil: React.FC<AccueilProps> = ({
  members,
  events,
  dishes,
  alerts,
  setActiveTab,
  setActiveModule,
  onMenuClick,
  onAlertsClick,

  activeMemberId = '1',
  onProfileSwitcherOpen,
  onAvatarClick,
  chatGroups,
  chatMessages,
  onEventClick,
  memories: _memories,
  onAddMemory: _onAddMemory,
  onDeleteMemory: _onDeleteMemory,
  onLikeMemory: _onLikeMemory,

  savingGoals: _savingGoals = [],
  onDeleteUnifiedEvent,
  onArchiveUnifiedEvent,
  activeFamilyName = 'Famille',
  onOpenSpaceSelector
}) => {
  const [selectedMealDay, setSelectedMealDay] = useState<string>('Lun');
  const [hiddenEventIds, setHiddenEventIds] = useState<string[]>([]);
  const [selectedEventForMenu, setSelectedEventForMenu] = useState<any | null>(null);

  const activeMember = members.find(m => m.id === activeMemberId) || members[0] || {
    id: activeMemberId || '1',
    name: 'Chargement...',
    role: 'Parent',
    photoUrl: 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150',
    allergies: [],
    treatments: [],
    emergencyContact: { name: '', phone: '', relation: '' }
  };
  const isChild = activeMember ? ['child', 'guest', 'Enfant', 'Invité'].includes(activeMember.role) : false;

  // Compute unread messages count
  const unreadMessagesCount = chatMessages.filter(m => {
    const group = chatGroups.find(g => g.id === m.groupId);
    if (!group || !group.memberIds.includes(activeMemberId)) return false;
    return !m.readBy.includes(activeMemberId);
  }).length;

  const systemDate = new Date();
  
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayStr = getLocalDateString(systemDate);

  const getDaysDiff = (dateStr: string) => {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 0;
    const d1 = new Date(systemDate.getFullYear(), systemDate.getMonth(), systemDate.getDate());
    const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const allUnifiedEvents = (isChild
    ? events.filter(e => e.member_id === activeMember.id || e.event_type === 'school')
    : events
  ).filter(e => e && !hiddenEventIds.includes(e.id));

  const todayUnifiedEvents = allUnifiedEvents
    .filter(e => e.start_date === todayStr && !e.done)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const upcomingUnifiedEvents = allUnifiedEvents
    .filter(e => e.start_date > todayStr && !e.done)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Filtrer les plats du jour sélectionné
  const activeDishes = dishes.filter(d => d.day === selectedMealDay);

  const quickActions = [
    { label: 'Courses', icon: ShoppingBasket, tab: 'menu', module: 'courses', color: 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' },
    { label: 'Santé', icon: HeartPulse, tab: 'menu', module: 'sante', color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 border-[#FF4D6D]/20' },
    { label: 'Voyages', icon: Plane, tab: 'menu', module: 'voyages', color: 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20' },
    { label: 'Démarches', icon: FileText, tab: 'menu', module: 'demarches', color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 border-[#6C5CFF]/20' },
    { label: 'Contes', icon: BookOpen, tab: 'menu', module: 'conteur', color: 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' },
    { label: 'Messagerie', icon: MessageCircle, tab: 'menu', module: 'messagerie', color: 'text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20' }
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  // Dernières activités : 3 derniers événements passés ou d'aujourd'hui
  const lastActivities = useMemo(() => {
    const pastOrToday = allUnifiedEvents
      .filter(e => e.start_date <= todayStr)
      .sort((a, b) => b.start_date.localeCompare(a.start_date) || b.start_time.localeCompare(a.start_time));
    
    if (pastOrToday.length > 0) {
      return pastOrToday.slice(0, 3);
    }
    return allUnifiedEvents.slice(0, 3);
  }, [allUnifiedEvents, todayStr]);

  const getEventIconAndColor = (e: any) => {
    const type = e.event_type || e.type;
    switch (type) {
      case 'trip':
      case 'social':
        return { Icon: Plane, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'demarche':
      case 'other':
        return { Icon: FileText, cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'schoolTask':
      case 'school':
        return { Icon: BookOpen, cls: 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20' };
      case 'task':
        return { Icon: Brush, cls: 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20' };
      case 'vaccine':
      case 'medical':
      case 'pet_vac':
      case 'pet_vet':
        return { Icon: HeartPulse, cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'abonnement':
      case 'bill':
        return { Icon: RefreshCw, cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
      case 'vehicle_tc':
      case 'vehicle_ins':
      case 'veh-tc':
      case 'veh-ins':
        return { Icon: Car, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'maintenance':
      case 'maint':
        return { Icon: Wrench, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'birthday':
      case 'bday':
        return { Icon: Gift, cls: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
      default:
        if (e.iconType === 'medical') {
          return { Icon: HeartPulse, cls: 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20' };
        } else if (e.iconType === 'bill') {
          return { Icon: Wifi, cls: 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20' };
        } else if (e.iconType === 'grocery') {
          return { Icon: ShoppingCart, cls: 'bg-[#FF4D6D]/10 text-[#FF4D6D] border-[#FF4D6D]/20' };
        }
        return { Icon: Calendar, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  const handleEventClick = (event: any) => {
    const sourceModule = event.source_module || event.sourceModule;
    const eventDate = event.start_date || event.date;
    switch (sourceModule) {
      case 'voyages':
        setActiveTab('menu');
        setActiveModule('voyages');
        break;
      case 'demarches':
        setActiveTab('menu');
        setActiveModule('demarches');
        break;
      case 'ecole':
        setActiveTab('menu');
        setActiveModule('ecole');
        break;
      case 'taches':
        setActiveTab('menu');
        setActiveModule('taches');
        break;
      case 'sante':
        setActiveTab('menu');
        setActiveModule('sante');
        break;
      case 'budget':
        setActiveTab('budget');
        break;
      case 'vehicules':
        setActiveTab('menu');
        setActiveModule('vehicules');
        break;
      case 'logement':
        setActiveTab('menu');
        setActiveModule('logement');
        break;
      case 'membres':
        setActiveTab('menu');
        setActiveModule('membres');
        break;
      case 'agenda':
      default:
        onEventClick(eventDate);
        break;
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto premium-glow-purple">
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onMenuClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenSpaceSelector}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 select-none"
          >
            <span>🏠 {activeFamilyName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/50" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
              {activeMember 
                ? `Bonjour ${activeMember.name} ! ${['Chef de famille', 'Gestionnaire', 'admin', 'parent', 'Parent'].includes(activeMember.role) ? '👑' : '👋'}`
                : 'Bonjour ! 👋'}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-[11px] text-white/50 font-medium">Famille :</p>
              <div className="flex -space-x-1.5 overflow-hidden">
                {members.slice(0, 5).map(m => (
                  <img 
                    key={m.id}
                    className="inline-block h-5 w-5 rounded-full ring-1 ring-[#07111F] object-cover" 
                    src={m.photoUrl} 
                    alt={m.name} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Nouveau bouton Messagerie 💬 */}
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('messagerie');
            }}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white relative transition-all cursor-pointer"
            title="Messagerie"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00D26A] rounded-full ring-2 ring-[#07111F] animate-pulse"></span>
            )}
          </button>

          <button 
            onClick={onAlertsClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white relative transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF4D6D] rounded-full ring-2 ring-[#07111F]"></span>
            )}
          </button>
          
          <button 
            onClick={onProfileSwitcherOpen || onAvatarClick}
            className="relative cursor-pointer transition-all hover:scale-105 active:scale-95 border border-white/10 rounded-full p-0.5"
            title="Changer de profil"
          >
            <img 
              src={activeMember.photoUrl} 
              alt={activeMember.name} 
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00D26A] rounded-full border-2 border-[#07111F]"></span>
          </button>
        </div>
      </div>

      {/* 2. À ne pas manquer aujourd'hui Section (max 3 items) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D] animate-pulse" />
            <span>À ne pas manquer aujourd'hui</span>
          </h3>
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('agenda');
            }}
            className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
          >
            Voir tout <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {todayUnifiedEvents.length > 0 ? (
            todayUnifiedEvents.slice(0, 3).map((event) => {
              const { Icon, cls } = getEventIconAndColor(event);
              const memberId = event.member_id;
              const linkedMember = memberId ? members.find(m => m.id === memberId) : null;
              return (
                <div 
                  key={event.id} 
                  className="w-full text-left glass-panel rounded-[28px] p-4 flex items-center justify-between border border-white/8 transition-all hover:bg-white/10 group relative"
                >
                  <div 
                    onClick={() => handleEventClick(event)}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className={`p-3 rounded-[18px] ${cls} border shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h4>
                      <p className="text-[11px] text-white/50 font-medium truncate">
                        {linkedMember ? `${linkedMember.name} • ` : ''}
                        {event.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 flex items-center space-x-2 relative">
                    <span className="text-[10px] font-bold text-white/70 bg-white/5 px-2.5 py-1.5 rounded-[12px] border border-white/5">
                      {event.start_time || 'Journée'}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventForMenu(event);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer text-white/60 hover:text-white transition-colors"
                      title="Options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full glass-panel rounded-[28px] p-5 text-center text-xs text-white/30 border border-white/6">
              Aucun événement prévu pour aujourd'hui. Profitez de votre journée ! ✨
            </div>
          )}
        </div>
      </div>

      {/* 3. Section Prochainement (max 3 items) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CFF]" />
            <span>Prochainement</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {upcomingUnifiedEvents.length > 0 ? (
            upcomingUnifiedEvents.slice(0, 3).map((event) => {
              const { Icon, cls } = getEventIconAndColor(event);
              const memberId = event.member_id;
              const linkedMember = memberId ? members.find(m => m.id === memberId) : null;
              const eventDate = event.start_date;
              const daysDiff = getDaysDiff(eventDate);
              
              let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              if (daysDiff < 7) {
                badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
              } else if (daysDiff < 30) {
                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              }

              const daysStr = daysDiff === 1 ? "Demain" : `Dans ${daysDiff} jours`;
              const dateFr = new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

              return (
                <div 
                  key={event.id} 
                  className="w-full text-left glass-panel rounded-[28px] p-4 flex items-center justify-between border border-white/8 transition-all hover:bg-white/10 group relative"
                >
                  <div 
                    onClick={() => handleEventClick(event)}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className={`p-3 rounded-[18px] ${cls} border shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h4>
                      <p className="text-[11px] text-white/50 font-medium truncate">
                        {linkedMember ? `${linkedMember.name} • ` : ''}
                        {dateFr}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 flex items-center space-x-2 relative">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-[12px] border ${badgeColor} tracking-wider`}>
                      {daysStr}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventForMenu(event);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer text-white/60 hover:text-white transition-colors"
                      title="Options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full glass-panel rounded-[28px] p-5 text-center text-xs text-white/30 border border-white/6">
              Aucun événement à venir.
            </div>
          )}
        </div>
      </div>

      {/* 4. & 5. Ma Commune & Mon Établissement Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ma Commune */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/8 flex flex-col justify-between space-y-4 hover:bg-white/[0.06] transition-all relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-start space-x-3">
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-[#FFB020] shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Ma Commune</h4>
              <p className="text-xs text-white/50 mt-1 font-medium">Aucune commune associée</p>
            </div>
          </div>
          <button 
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
            onClick={() => {
              alert("🏛️ Service Ma Commune bientôt disponible !");
            }}
          >
            Découvrir
          </button>
        </div>

        {/* Mon Établissement */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/8 flex flex-col justify-between space-y-4 hover:bg-white/[0.06] transition-all relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-start space-x-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#4F8CFF] shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Mon Établissement</h4>
              <p className="text-xs text-white/50 mt-1 font-medium">Aucun établissement associé</p>
            </div>
          </div>
          <button 
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
            onClick={() => {
              alert("🏫 Service Mon Établissement bientôt disponible !");
            }}
          >
            Découvrir
          </button>
        </div>
      </div>

      {/* 6. Accès rapides (grid 3x2 on mobile, 6x1 on desktop) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Accès rapides</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(action.tab);
                  if (action.module) setActiveModule(action.module);
                }}
                className="glass-panel rounded-[24px] p-3.5 flex flex-col items-center justify-center space-y-2 border border-white/6 cursor-pointer hover:bg-white/8 active:scale-95 transition-all text-center"
              >
                <div className={`p-3 rounded-[18px] ${action.color} border border-white/5 transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white/70 tracking-wide">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Menu de la semaine Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Menu de la semaine</h3>
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('menus');
            }}
            className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
          >
            Voir le menu <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {/* Days selector bar */}
        <div className="glass-panel rounded-[24px] p-2 flex justify-between items-center border border-white/5">
          {daysOfWeek.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedMealDay(day)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                selectedMealDay === day
                  ? 'bg-[#6C5CFF] text-white shadow-[0_4px_10px_rgba(108,92,255,0.3)]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Selected Day Meals card */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/8 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-[#4F8CFF]/5 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="space-y-4">
            {activeDishes.length > 0 ? (
              activeDishes.map((dish) => (
                <div key={dish.id} className="flex items-center space-x-4 border-b border-white/5 last:border-b-0 pb-3.5 last:pb-0 pt-1">
                  <DishImage src={dish.image} alt={dish.name} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                      dish.mealType === 'lunch' 
                        ? 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' 
                        : 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20'
                    }`}>
                      {dish.mealType === 'lunch' ? 'Déjeuner ☀️' : 'Dîner 🌙'}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-2">{dish.name}</h4>
                    <p className="text-[10px] text-white/55 truncate mt-0.5 leading-normal">
                      Ingrédients: {dish.ingredients.join(', ')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/40 text-center py-2">Aucun repas planifié pour ce jour.</p>
            )}
          </div>
        </div>
      </div>

      {/* 8. Dernières activités Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-[#6C5CFF]" />
          <span>Dernières activités</span>
        </h3>
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
          {lastActivities.length > 0 ? (
            <div className="space-y-4 relative">
              <div className="absolute left-[13px] top-2 bottom-2 w-[2px] bg-white/10"></div>
              {lastActivities.map((act) => {
                const timeStr = act.start_time ? act.start_time.replace(':', 'h') : 'Journée';
                const { Icon, cls } = getEventIconAndColor(act);
                return (
                  <div key={act.id} className="flex items-start space-x-3.5 relative z-10">
                    <div className={`p-1.5 rounded-lg ${cls} border shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-white/45">{timeStr}</span>
                        <span className="text-white/20">•</span>
                        <h4 className="text-xs font-bold text-white/95 truncate">{act.title}</h4>
                      </div>
                      {act.description && (
                        <p className="text-[10px] text-white/50 truncate mt-0.5">{act.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/40 text-center py-2">Aucune activité récente.</p>
          )}

          <button 
            onClick={() => setActiveTab('timeline')}
            className="w-full mt-2 py-3 px-4 bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/25 text-[#6C5CFF] rounded-2xl text-xs font-extrabold border border-[#6C5CFF]/30 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1"
          >
            Voir toute la Timeline →
          </button>
        </div>
      </div>

      {/* Event context menu bottom sheet */}
      {selectedEventForMenu && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setSelectedEventForMenu(null)}>
          <div 
            className="w-full max-w-md bg-[#07111F] border-t border-white/15 rounded-t-[32px] p-6 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transform translate-y-0 transition-transform duration-300 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2"></div>
            
            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-white">{selectedEventForMenu.title}</h4>
              <p className="text-xs text-white/55 font-medium">{selectedEventForMenu.description || selectedEventForMenu.date}</p>
            </div>
            
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  handleEventClick(selectedEventForMenu);
                  setSelectedEventForMenu(null);
                }}
                className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/5"
              >
                📖 Voir les détails
              </button>
              
              <button
                onClick={() => {
                  setHiddenEventIds(prev => [...prev, selectedEventForMenu.id]);
                  setSelectedEventForMenu(null);
                }}
                className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/5"
              >
                🙈 Masquer temporairement
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(`Archiver "${selectedEventForMenu.title}" ?`)) {
                    if (onArchiveUnifiedEvent) onArchiveUnifiedEvent(selectedEventForMenu.id, selectedEventForMenu.source_module);
                    setSelectedEventForMenu(null);
                  }
                }}
                className="w-full py-3.5 px-4 bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/25 text-[#6C5CFF] rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#6C5CFF]/30"
              >
                📦 Archiver
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement "${selectedEventForMenu.title}" ?`)) {
                    if (onDeleteUnifiedEvent) onDeleteUnifiedEvent(selectedEventForMenu.id, selectedEventForMenu.source_module);
                    setSelectedEventForMenu(null);
                  }
                }}
                className="w-full py-3.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-500/15"
              >
                🗑️ Supprimer définitivement
              </button>
            </div>
            
            <button
              onClick={() => setSelectedEventForMenu(null)}
              className="w-full py-3 text-white/40 hover:text-white text-xs font-bold uppercase tracking-wider text-center pt-2 cursor-pointer transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
