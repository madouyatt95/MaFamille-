import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Eye, 
  EyeOff, 
  Calendar as CalendarIcon, 
  Wallet, 
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
  Award,
  PiggyBank,
  MessageCircle
} from 'lucide-react';
import type { Member, FamilyEvent, Dish, NotificationAlert, ChatGroup, ChatMessage } from '../types';

interface AccueilProps {
  members: Member[];
  events: FamilyEvent[];
  dishes: Dish[];
  alerts: NotificationAlert[];
  currencySymbol: string;
  formatMoney: (amount: number) => string;
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;
  onMenuClick: () => void;
  onAlertsClick: () => void;
  quickBalance: {
    solde: number;
    revenus: number;
    depenses: number;
    epargne: number;
  };
  activeMemberId?: string;
  onProfileSwitcherOpen?: () => void;
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
  onEventClick: (dateStr: string) => void;
}

export const Accueil: React.FC<AccueilProps> = ({
  members,
  events,
  dishes,
  alerts,
  currencySymbol,
  formatMoney,
  setActiveTab,
  setActiveModule,
  onMenuClick,
  onAlertsClick,
  quickBalance,
  activeMemberId = '1',
  onProfileSwitcherOpen,
  chatGroups,
  chatMessages,
  onEventClick
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [selectedMealDay, setSelectedMealDay] = useState<string>('Lun');

  const activeMember = members.find(m => m.id === activeMemberId) || members[0];
  const isChild = activeMemberId === '3' || activeMemberId === '4';

  // Compute unread messages count
  const unreadMessagesCount = chatMessages.filter(m => {
    const group = chatGroups.find(g => g.id === m.groupId);
    if (!group || !group.memberIds.includes(activeMemberId)) return false;
    return !m.readBy.includes(activeMemberId);
  }).length;

  // Gamified allowance balances for kids
  const pocketMoneyBalance = activeMemberId === '3' ? 15.00 : activeMemberId === '4' ? 22.50 : 0;
  const rewardPoints = activeMemberId === '3' ? 150 : activeMemberId === '4' ? 85 : 0;
  const savingsGoal = activeMemberId === '3' ? { current: 30, target: 50, label: 'Nouveau jeu Switch 🎮' } : { current: 12, target: 20, label: 'Kit de dessin 🎨' };

  // Filtrer les événements d'aujourd'hui pour la section "À ne pas manquer"
  const filteredEvents = isChild
    ? events.filter(e => e.memberName === activeMember.name || e.type === 'school')
    : events;
  const todayEvents = filteredEvents.slice(0, 4);

  // Filtrer les plats du jour sélectionné
  const activeDishes = dishes.filter(d => d.day === selectedMealDay);

  const quickActions = [
    { label: 'Agenda', icon: CalendarIcon, tab: 'agenda', color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { label: isChild ? 'Cagnotte' : 'Finances', icon: Wallet, tab: 'finances', color: 'text-[#4F8CFF] bg-[#4F8CFF]/10' },
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
              {activeMemberId === '1' ? 'Bonjour Papa ! 👑' :
               activeMemberId === '2' ? 'Bonjour Maman ! 👑' :
               activeMemberId === '3' ? 'Salut Amadou ! 👋' :
               activeMemberId === '4' ? 'Salut Awa ! 👋' :
               'Bonjour, Fatou'}
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
            onClick={onProfileSwitcherOpen}
            className="relative cursor-pointer transition-all hover:scale-105 active:scale-95 border border-white/10 rounded-full p-0.5"
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

      {/* 2. Solde Familial / Kid allowance Card with house vector */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] bg-gradient-to-br from-[#1C2C4E]/90 to-[#0F1E3D]/95 p-6 flex flex-col justify-between min-h-[220px]">
        {/* Glow behind */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#6C5CFF]/15 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#4F8CFF]/15 rounded-full blur-2xl pointer-events-none"></div>

        {/* Vector House Graphic */}
        <div className="absolute right-3 bottom-0 w-44 h-44 opacity-85 pointer-events-none select-none hidden sm:block">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            {/* Ground */}
            <path d="M10,180 L190,180" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" />
            
            {/* Modern Villa Box */}
            <rect x="55" y="70" width="90" height="90" rx="12" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            
            {/* Upper floor balcony cantilever */}
            <rect x="40" y="55" width="95" height="50" rx="8" fill="rgba(108, 92, 255, 0.15)" stroke="rgba(108, 92, 255, 0.25)" strokeWidth="1.5" />
            
            {/* Windows lighted warm yellow */}
            <rect x="50" y="65" width="22" height="15" rx="3" fill="#FFB020" fillOpacity="0.85" className="animate-pulse" />
            <rect x="80" y="65" width="22" height="15" rx="3" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            
            {/* Large sliding glass door lower floor */}
            <rect x="68" y="115" width="40" height="35" rx="4" fill="rgba(79, 140, 255, 0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <line x1="88" y1="115" x2="88" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            
            {/* Warm pool light reflection */}
            <path d="M115,160 C135,160 145,150 165,150 C185,150 195,165 170,175 C145,185 125,175 115,160 Z" fill="rgba(79, 140, 255, 0.25)" filter="blur(4px)" />
            
            {/* Minimal Palm tree */}
            <path d="M165,165 C160,135 155,115 152,90" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
            <path d="M152,90 C135,80 120,85 115,90" stroke="#00D26A" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M152,90 C145,72 155,60 162,62" stroke="#00D26A" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M152,90 C168,82 178,92 182,102" stroke="#00D26A" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M152,90 C162,98 160,110 168,115" stroke="#00D26A" strokeWidth="2" strokeLinecap="round" />
            
            {/* Stars / sparkle lights */}
            <circle cx="35" cy="45" r="1.5" fill="#FFFFFF" className="animate-pulse" />
            <circle cx="175" cy="35" r="1" fill="#FFFFFF" />
            <circle cx="120" cy="25" r="1.5" fill="#6C5CFF" className="animate-pulse" />
          </svg>
        </div>

        {/* Content */}
        <div className="z-10 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">
              {isChild ? 'Mon Argent de Poche 💰' : 'Solde familial'}
            </span>
            <button 
              onClick={() => setShowBalance(!showBalance)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {showBalance 
              ? isChild ? formatMoney(pocketMoneyBalance) : formatMoney(quickBalance.solde) 
              : '•••••• ' + currencySymbol}
          </h2>
          
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/8 max-w-sm sm:max-w-md">
            {isChild ? (
              <>
                <div className="col-span-1">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1"><Award className="w-3.5 h-3.5 text-[#FFB020]" /> Points</p>
                  <p className="text-xs sm:text-sm font-extrabold text-[#FFB020] mt-0.5">
                    {showBalance ? `${rewardPoints} Pts` : '••••'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1"><PiggyBank className="w-3.5 h-3.5 text-[#4F8CFF]" /> Projet : {savingsGoal.label}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="h-1.5 bg-white/10 rounded-full grow overflow-hidden">
                      <div className="h-full bg-[#4F8CFF]" style={{ width: `${(savingsGoal.current / savingsGoal.target) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-white/70">{savingsGoal.current} / {savingsGoal.target}€</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Revenus</p>
                  <p className="text-xs sm:text-sm font-bold text-[#00D26A] mt-0.5">
                    {showBalance ? formatMoney(quickBalance.revenus) : '••••••'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dépenses</p>
                  <p className="text-xs sm:text-sm font-bold text-[#FF4D6D] mt-0.5">
                    {showBalance ? formatMoney(quickBalance.depenses) : '••••••'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Épargne</p>
                  <p className="text-xs sm:text-sm font-bold text-[#4F8CFF] mt-0.5">
                    {showBalance ? formatMoney(quickBalance.epargne) : '••••••'}
                  </p>
                </div>
              </>
            )}
          </div>
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
