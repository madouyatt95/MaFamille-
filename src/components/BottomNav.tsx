import React from 'react';
import { Home, Clock, Mic, Wallet, Plus, BookOpen, MessageSquare, Star, GraduationCap, User } from 'lucide-react';
import type { MemberRole } from '../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeModule?: string;
  setActiveModule?: (module: string) => void;
  onMicClick: () => void;
  activeMemberId?: string;
  members?: any[];
  isPremium?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  setActiveTab, 
  activeModule,
  setActiveModule,
  onMicClick,
  activeMemberId,
  members,
  isPremium = false
}) => {
  const activeMember = members?.find(m => m.id === activeMemberId);
  
  // Find precise role
  let role = 'enfant';
  if (activeMember) {
    const roleClean = (activeMember.role || '').toLowerCase();
    if (roleClean.includes('chef') || roleClean.includes('admin')) role = 'chef_famille';
    else if (roleClean.includes('gestionnaire')) role = 'gestionnaire';
    else if (roleClean.includes('adulte') || roleClean.includes('membre adulte')) role = 'adulte';
    else if (roleClean.includes('parent')) role = 'parent';
    else if (roleClean.includes('adolescent')) role = 'adolescent';
    else if (roleClean.includes('enfant')) role = 'enfant';
    else if (roleClean.includes('invit') || roleClean.includes('guest')) role = 'invite';
    else {
      const ageNum = parseInt(activeMember.age || '0');
      if (ageNum > 0 && ageNum < 11) role = 'enfant';
      else if (ageNum >= 11 && ageNum < 18) role = 'adolescent';
      else role = 'adulte';
    }
  } else {
    // Fallback mapping
    if (activeMemberId === '1') role = 'chef_famille';
    else if (activeMemberId === '2') role = 'parent';
    else if (activeMemberId === '3') role = 'enfant';
    else if (activeMemberId === '4') role = 'adolescent';
  }

  const isAdult = ['chef_famille', 'parent', 'gestionnaire', 'adulte'].includes(role);
  const isTeen = role === 'adolescent';
  const isKid = role === 'enfant';
  const isGuest = role === 'invite';

  // Helper to check if a navigation tab is active
  const isTabActive = (tabId: string, moduleName?: string) => {
    if (moduleName) {
      const activeModuleFromHash = window.location.hash || ''; // fallback check
      return activeTab === tabId && (activeModuleFromHash.includes(moduleName) || true);
    }
    return activeTab === tabId;
  };

  const handleNavClick = (tabId: string, moduleName = '') => {
    setActiveTab(tabId);
    if (setActiveModule) {
      setActiveModule(moduleName);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2 md:px-8 max-w-7xl mx-auto pointer-events-none ios-safe-bottom-nav">
      <div className="glass-panel family-bottom-nav rounded-t-[32px] rounded-b-[24px] pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.5)] border-t border-white/10 px-2.5 sm:px-4 py-2 flex items-center justify-around gap-1 bg-[#081225]/90 backdrop-blur-md">
        
        {/* ======================================================== */}
        {/* 1. ADULT BOTTOM NAV: Accueil, Timeline, Mic, Budget, Plus */}
        {/* ======================================================== */}
        {isAdult && (
          <>
            {/* Accueil */}
            <button 
              onClick={() => handleNavClick('accueil')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'accueil' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Home className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Accueil</span>
            </button>

            {/* Timeline */}
            <button 
              onClick={() => handleNavClick('timeline')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'timeline' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Clock className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Timeline</span>
            </button>

            {/* Mic floating button */}
            <div className="family-nav-mic-wrap relative -top-3.5 flex justify-center">
              <div className="absolute w-14 h-14 rounded-full bg-red-500/20 blur-lg animate-pulse-slow"></div>
              {!isPremium && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#FFB020]/30 bg-[#081225]/95 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#FFB020] shadow-lg">
                  Premium
                </span>
              )}
              <button 
                onClick={onMicClick}
                className="family-nav-mic relative flex items-center justify-center w-12 h-12 rounded-full bg-[#081225] border-2 border-red-500 text-white hover:text-red-400 float-btn-halo cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group animate-pulse-slow shadow-lg"
                title={isPremium ? "Micro principal" : "Premium : contrôle vocal des courses, dépenses, voyages et modules"}
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Budget */}
            <button 
              onClick={() => handleNavClick('budget')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'budget' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Wallet className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Budget</span>
            </button>

            {/* Plus */}
            <button 
              onClick={() => handleNavClick('menu')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Plus className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Plus</span>
            </button>
          </>
        )}

        {/* ======================================================== */}
        {/* 2. TEEN BOTTOM NAV: Accueil, École, Messages, Timeline, Plus */}
        {/* ======================================================== */}
        {isTeen && (
          <>
            {/* Accueil */}
            <button 
              onClick={() => handleNavClick('accueil')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'accueil' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Home className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Accueil</span>
            </button>

            {/* École */}
            <button 
              onClick={() => handleNavClick('menu', 'ecole')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' && ['ecole', 'ecole_devoirs', 'tuteur_ia', 'notes_bulletins', 'emploi_temps'].includes(activeModule || '') ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <BookOpen className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">École</span>
            </button>

            {/* Messages */}
            <button 
              onClick={() => handleNavClick('menu', 'messagerie')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' && activeModule === 'messagerie' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <MessageSquare className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Messages</span>
            </button>

            {/* Timeline */}
            <button 
              onClick={() => handleNavClick('timeline')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'timeline' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Clock className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Timeline</span>
            </button>

            {/* Plus */}
            <button 
              onClick={() => handleNavClick('menu')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' && !['ecole', 'ecole_devoirs', 'tuteur_ia', 'notes_bulletins', 'emploi_temps', 'messagerie'].includes(activeModule || '') ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Plus className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Plus</span>
            </button>
          </>
        )}

        {/* ======================================================== */}
        {/* 3. CHILD BOTTOM NAV: Accueil, Missions, École, Histoires, Moi */}
        {/* ======================================================== */}
        {isKid && (
          <>
            {/* Accueil */}
            <button 
              onClick={() => handleNavClick('accueil')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'accueil' ? 'text-[#FFB020] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Home className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Accueil</span>
            </button>

            {/* Missions */}
            <button 
              onClick={() => handleNavClick('menu', 'taches')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' && activeModule === 'taches' ? 'text-[#FFB020] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Star className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Missions</span>
            </button>

            {/* École */}
            <button 
              onClick={() => handleNavClick('menu', 'ecole')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' && activeModule === 'ecole' ? 'text-[#FFB020] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <GraduationCap className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">École</span>
            </button>

            {/* Histoires */}
            <button 
              onClick={() => handleNavClick('menu', 'conteur')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' && activeModule === 'conteur' ? 'text-[#FFB020] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <BookOpen className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Histoires</span>
            </button>

            {/* Moi */}
            <button 
              onClick={() => handleNavClick('menu', 'membres')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' && activeModule === 'membres' ? 'text-[#FFB020] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <User className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Moi</span>
            </button>
          </>
        )}

        {/* ======================================================== */}
        {/* 4. GUEST BOTTOM NAV: Accueil, Profil */}
        {/* ======================================================== */}
        {isGuest && (
          <>
            {/* Accueil */}
            <button 
              onClick={() => handleNavClick('accueil')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'accueil' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Home className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Accueil</span>
            </button>

            {/* Profil */}
            <button 
              onClick={() => handleNavClick('menu', 'settings')}
              className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                activeTab === 'menu' ? 'text-[#6C5CFF] scale-105 font-bold' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <User className="w-5.5 h-5.5" />
              <span className="text-[9px] tracking-wide font-sans">Profil</span>
            </button>
          </>
        )}

      </div>
    </div>
  );
};
