import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Users, 
  Brush, 
  ShoppingBasket, 
  FolderLock, 
  HeartPulse, 
  MoreHorizontal,
  ChevronRight,
  Wifi,
  BookOpen,
  ShoppingCart,
  Clock,
  Lightbulb,
  Droplet,
  UtensilsCrossed,
  MessageCircle,
  ShieldAlert,
  Camera,
  Heart,
  Smile,
  Plus,
  Trash2
} from 'lucide-react';
import type { Member, FamilyEvent, Dish, NotificationAlert, ChatGroup, ChatMessage, MemoryLog } from '../types';

interface AccueilProps {
  members: Member[];
  events: FamilyEvent[];
  dishes: Dish[];
  alerts: NotificationAlert[];
  formatMoney: (amount: number) => string;
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;
  onMenuClick: () => void;
  onAlertsClick: () => void;
  onTriggerSos: () => void;
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
}

export const Accueil: React.FC<AccueilProps> = ({
  members,
  events,
  dishes,
  alerts,
  formatMoney,
  setActiveTab,
  setActiveModule,
  onMenuClick,
  onAlertsClick,
  onTriggerSos,
  activeMemberId = '1',
  onProfileSwitcherOpen,
  onAvatarClick,
  chatGroups,
  chatMessages,
  onEventClick,
  memories,
  onAddMemory,
  onDeleteMemory,
  onLikeMemory
}) => {
  const [selectedMealDay, setSelectedMealDay] = useState<string>('Lun');

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

  // Expiration helpers for moments on the wall
  const getMomentExpiration = (moment: MemoryLog) => {
    if (!moment.theme || !moment.theme.startsWith('Exp: ')) return null;
    const parts = moment.theme.split(' | ');
    if (parts.length < 2) return null;
    const expiresAt = parseInt(parts[1]);
    const label = parts[0].replace('Exp: ', '');
    return { expiresAt, label };
  };

  const getRemainingTimeStr = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // State to force re-render of remaining time countdowns every second
  const [tick, setTick] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => {
        const nextTick = prev + 1;
        
        // Secure cleanup: run only once every 5 seconds (every 5 ticks) to reduce DB load
        if (nextTick % 5 === 0) {
          const now = Date.now();
          const expiredIds = memories
            .filter(moment => {
              const exp = getMomentExpiration(moment);
              // Only trigger DB cleanup if it is truly expired (with a safe 5-minute grace window to prevent clock mismatch deletions)
              return exp && (exp.expiresAt + 300000) < now;
            })
            .map(m => m.id);

          if (expiredIds.length > 0) {
            expiredIds.forEach(id => {
              const m = memories.find(item => item.id === id);
              // Only the author or an admin/parent can delete from database
              if (m && (m.authorName === activeMember.name || !isChild)) {
                onDeleteMemory(id);
              }
            });
          }
        }
        
        return nextTick;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [memories, onDeleteMemory, activeMember.name, isChild]);

  // Local state for tracking liked state of memories (so heart icon remains fully interactive per-user session)
  const [likedMemories, setLikedMemories] = useState<Record<string, boolean>>({});

  const handleLikeMoment = (id: string) => {
    const isLiked = !!likedMemories[id];
    setLikedMemories(prev => ({ ...prev, [id]: !isLiked }));
    const target = memories.find(m => m.id === id);
    if (target) {
      const newLikesCount = isLiked ? Math.max(0, target.likesCount - 1) : target.likesCount + 1;
      onLikeMemory(id, newLikesCount);
    }
  };

  const handleDeleteMoment = (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce souvenir du Mur des Moments ?")) {
      onDeleteMemory(id);
    }
  };

  // Compute unread messages count
  const unreadMessagesCount = chatMessages.filter(m => {
    const group = chatGroups.find(g => g.id === m.groupId);
    if (!group || !group.memberIds.includes(activeMemberId)) return false;
    return !m.readBy.includes(activeMemberId);
  }).length;

  // Filtrer les événements d'aujourd'hui pour la section "À ne pas manquer"
  const filteredEvents = isChild
    ? events.filter(e => e.memberName === activeMember.name || e.type === 'school')
    : events;
  const todayEvents = filteredEvents.slice(0, 4);

  // Filtrer les plats du jour sélectionné
  const activeDishes = dishes.filter(d => d.day === selectedMealDay);

  const quickActions = [
    { label: 'Conseil', icon: MessageCircle, tab: 'menu', module: 'conseil', color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { label: 'Contes', icon: BookOpen, tab: 'menu', module: 'conteur', color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { label: 'Membres', icon: Users, tab: 'menu', module: 'membres', color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { label: 'Tâches', icon: Brush, tab: 'menu', module: 'taches', color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { label: 'Courses', icon: ShoppingBasket, tab: 'menu', module: 'courses', color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { label: 'Documents', icon: FolderLock, tab: 'menu', module: 'documents', color: 'text-[#4F8CFF] bg-[#4F8CFF]/10' },
    { label: 'Santé', icon: HeartPulse, tab: 'menu', module: 'sante', color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { label: 'Plus', icon: MoreHorizontal, tab: 'menu', color: 'text-white/50 bg-white/5' }
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto premium-glow-purple">
      {tick > -1 && <span className="hidden" aria-hidden="true">{tick}</span>}
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onMenuClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
              {activeMember 
                ? `Bonjour ${activeMember.name} ! ${['Chef de famille', 'Gestionnaire', 'admin', 'parent'].includes(activeMember.role) ? '👑' : '👋'}`
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
        
        <div className="flex items-center space-x-3">
          {/* Flashing SOS button */}
          <button 
            onClick={onTriggerSos}
            className="px-3.5 py-2.5 bg-[#FF4D6D] hover:bg-[#FF4D6D]/90 text-white rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center space-x-1.5 shadow-md shadow-[#FF4D6D]/20 cursor-pointer animate-pulse shrink-0"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SOS</span>
          </button>

          <button 
            onClick={onAlertsClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white relative transition-all cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF4D6D] rounded-full ring-2 ring-[#07111F]"></span>
            )}
          </button>
          
          <button 
            onClick={onAvatarClick || onProfileSwitcherOpen}
            className="relative cursor-pointer transition-all hover:scale-105 active:scale-95 border border-white/10 rounded-full p-0.5"
            title="Modifier mon profil"
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

      {/* Le Mur des Moments Partagés (Positionné au sommet, à la place du solde familial) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-[#FF4D6D] animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Le Mur des Moments Partagés</h3>
          </div>
          
          <div>
            <input 
              id="polaroid-file-input" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                  const base64Url = event.target?.result as string;
                  const caption = prompt("Quel souvenir ou moment marquant voulez-vous associer à cette photo ?");
                  if (!caption) return;

                  const delayPrompt = prompt(
                    "Dans combien de temps cette photo doit-elle disparaître automatiquement ?\n" +
                    "Entrez un délai (ex: 24h, 12h, 2h, 30m) ou tapez 'jamais' pour un souvenir permanent :",
                    "24h"
                  );
                  
                  let themeStr = "🏖️ Famille";
                  if (delayPrompt && delayPrompt.toLowerCase().trim() !== 'jamais') {
                    const cleanDelay = delayPrompt.toLowerCase().trim();
                    let durationMs = 24 * 60 * 60 * 1000; // 24h default
                    
                    if (cleanDelay.endsWith('h')) {
                      const val = parseInt(cleanDelay.replace('h', ''));
                      if (!isNaN(val)) durationMs = val * 60 * 60 * 1000;
                    } else if (cleanDelay.endsWith('m')) {
                      const val = parseInt(cleanDelay.replace('m', ''));
                      if (!isNaN(val)) durationMs = val * 60 * 1000;
                    }
                    
                    themeStr = `Exp: ${cleanDelay} | ${Date.now() + durationMs}`;
                  }

                  const newMemory: MemoryLog = {
                    id: `mom-${Date.now()}`,
                    title: caption,
                    description: caption,
                    imageUrl: base64Url,
                    imageUrls: [base64Url],
                    authorName: activeMember.name,
                    authorPhoto: activeMember.photoUrl || '',
                    date: "Aujourd'hui",
                    likesCount: 0,
                    isPrivate: false,
                    theme: themeStr
                  };
                  onAddMemory(newMemory);
                };
                reader.readAsDataURL(file);
              }}
            />
            <button 
              onClick={() => document.getElementById('polaroid-file-input')?.click()}
              className="text-xs font-bold text-[#FF4D6D] bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 px-3.5 py-2 rounded-[14px] hover:bg-[#FF4D6D]/25 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Publier</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory">
          {memories
            .filter(moment => {
              const exp = getMomentExpiration(moment);
              return !exp || exp.expiresAt > Date.now();
            })
            .map((moment) => {
              const hasLiked = !!likedMemories[moment.id];
              const numericId = parseInt(moment.id.replace(/\D/g, '')) || 0;
              const rotation = numericId % 2 === 0 ? 1.5 : -1.5;
              const exp = getMomentExpiration(moment);
              const remainingStr = exp ? getRemainingTimeStr(exp.expiresAt) : null;
              
              return (
                <div 
                  key={moment.id}
                  className="w-[240px] shrink-0 snap-start bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-[28px] p-3.5 shadow-lg flex flex-col space-y-3 transform transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.06]"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden border border-white/5 shadow-inner">
                    <img src={moment.imageUrl} alt={moment.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 text-[9px] font-extrabold uppercase bg-black/60 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full border border-white/5">
                      Par {moment.authorName}
                    </span>
                    
                    {/* Expiration badge / remaining time */}
                    {remainingStr && (
                      <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-[#FF4D6D] text-white px-2 py-0.5 rounded-md border border-white/10 shadow-sm animate-pulse z-10 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{remainingStr}</span>
                      </span>
                    )}

                    {/* Suppression du moment s'il s'agit de sa propre publication ou d'un parent */}
                    {(moment.authorName === activeMember.name || !isChild) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMoment(moment.id);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-xl bg-black/60 hover:bg-[#FF4D6D] text-white/80 hover:text-white backdrop-blur-sm transition-all border border-white/10 cursor-pointer shadow-md z-10 active:scale-90"
                        title="Supprimer ce souvenir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-[#FF4D6D]/95 text-white px-2.5 py-1 rounded-full border border-white/5 shadow-md">
                      {moment.date}
                    </span>
                  </div>
                  
                  <p className="text-xs text-white/90 leading-snug line-clamp-2 h-[34px] px-1 font-semibold italic">
                    "{moment.title}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-white/50">
                    <button 
                      onClick={() => handleLikeMoment(moment.id)}
                      className={`flex items-center space-x-1.5 hover:text-[#FF4D6D] transition-colors py-1 px-2 rounded-lg hover:bg-white/5 ${hasLiked ? 'text-[#FF4D6D] font-extrabold' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current animate-pulse' : ''}`} />
                      <span>{moment.likesCount}</span>
                    </button>

                    <button className="flex items-center space-x-1.5 hover:text-[#4F8CFF] transition-colors py-1 px-2 rounded-lg hover:bg-white/5">
                      <Smile className="w-4 h-4" />
                      <span>Réagir</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Messagerie Familiale Hero Tile */}
      <div 
        onClick={() => {
          setActiveTab('menu');
          setActiveModule('messagerie');
        }}
        className="glass-panel rounded-[32px] p-5 flex items-center justify-between border border-[#00D26A]/30 bg-gradient-to-r from-[#00D26A]/10 to-transparent cursor-pointer hover:bg-white/5 transition-all shadow-[0_10px_30px_rgba(0,210,106,0.15)]"
      >
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00D26A] to-[#6C5CFF] flex items-center justify-center shadow-lg">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF4D6D] border-2 border-[#07111F] rounded-full animate-pulse"></span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">Messagerie Familiale</h3>
            <p className={`text-xs font-medium mt-0.5 ${unreadMessagesCount > 0 ? 'text-[#00D26A]' : 'text-white/40'}`}>
              {unreadMessagesCount > 0 
                ? `${unreadMessagesCount} nouveau${unreadMessagesCount > 1 ? 'x' : ''} message${unreadMessagesCount > 1 ? 's' : ''}` 
                : 'Ouvrir les discussions'}
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white/50" />
        </div>
      </div>

      {/* 3. À ne pas manquer aujourd'hui Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">À ne pas manquer aujourd'hui</h3>
          <button 
            onClick={() => setActiveTab('agenda')}
            className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
          >
            Voir tout <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {todayEvents.map((event) => {
            let ActiveIcon = BookOpen;
            let colorClass = 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20';
            let badgeEl = <span className="text-xs font-bold text-white/70 bg-white/5 px-3 py-1.5 rounded-[12px] border border-white/5">{event.time}</span>;

            if (event.type === 'medical') {
              ActiveIcon = HeartPulse;
              colorClass = 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20';
            } else if (event.type === 'bill') {
              ActiveIcon = Wifi;
              colorClass = 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20';
              badgeEl = <span className="text-xs font-bold text-[#00D26A] bg-[#00D26A]/10 px-3 py-1.5 rounded-[12px] border border-[#00D26A]/20">{formatMoney(event.amount || 250)}</span>;
            } else if (event.type === 'school') {
              ActiveIcon = BookOpen;
              colorClass = 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20';
              badgeEl = <div className="p-2 rounded-full text-white/30"><Clock className="w-4 h-4" /></div>;
            } else if (event.type === 'grocery') {
              ActiveIcon = ShoppingCart;
              colorClass = 'bg-[#FF4D6D]/10 text-[#FF4D6D] border-[#FF4D6D]/20';
              badgeEl = <span className="text-[10px] font-bold text-[#FF4D6D] bg-[#FF4D6D]/10 px-2.5 py-1 rounded-[12px] border border-[#FF4D6D]/20 uppercase tracking-wide">Urgent</span>;
            }

            const sub = event.memberName 
              ? `${event.memberName}${event.location ? ` — ${event.location}` : ''}`
              : event.description || 'Événement familial';

            return (
              <button 
                key={event.id} 
                onClick={() => onEventClick(event.dateTime)}
                className="w-full text-left glass-panel rounded-[28px] p-4 flex items-center justify-between border border-white/8 transition-all hover:bg-white/10 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-[18px] ${colorClass} border shrink-0`}>
                    <ActiveIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h4>
                    <p className="text-[11px] text-white/50 font-medium truncate">{sub}</p>
                  </div>
                </div>
                <div className="shrink-0 ml-2">
                  {badgeEl}
                </div>
              </button>
            );
          })}

        </div>
      </div>


      {/* 4. Accès rapides (grid 2x4) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Accès rapides</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(action.tab);
                  if (action.module) setActiveModule(action.module);
                }}
                className="glass-panel rounded-[24px] p-3 flex flex-col items-center justify-center space-y-2 border border-white/6 cursor-pointer hover:bg-white/8 active:scale-95 transition-all text-center"
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

      {/* 5. Menu de la semaine Section */}
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
                  {dish.image && dish.image.startsWith('http') ? (
                    <img 
                      src={dish.image} 
                      alt={dish.name} 
                      className="w-16 h-16 rounded-[18px] object-cover border border-white/10 shadow-lg shrink-0"
                    />
                  ) : (
                    <div className="p-3.5 rounded-[18px] bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF] shrink-0">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                  )}
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



      {/* 6. Astuce du jour Card (purple glow layout) */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/8 bg-gradient-to-r from-[#6C5CFF]/20 to-[#4F8CFF]/20 p-5 shadow-lg flex items-center justify-between">
        
        {/* Glow lights */}
        <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-[#6C5CFF]/10 to-[#4F8CFF]/10 opacity-30"></div>
        
        <div className="space-y-2 max-w-[70%] z-10">
          <div className="flex items-center space-x-2 text-[#FFB020]">
            <Lightbulb className="w-4 h-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Astuce du jour</span>
          </div>
          <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
            Pensez à boire de l'eau régulièrement
          </h4>
          <p className="text-[11px] text-white/60 leading-normal">
            Hydratez-vous ! Un verre d'eau toutes les deux heures maintient toute la famille en forme et concentrée.
          </p>
        </div>

        {/* Visual cup with water droplet */}
        <div className="relative w-16 h-16 mr-2 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 z-10">
          <Droplet className="w-8 h-8 text-[#4F8CFF] animate-bounce" />
        </div>

      </div>

    </div>
  );
};
