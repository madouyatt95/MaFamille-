import React from 'react';
import { Home, Calendar, Plus, Wallet, LayoutGrid } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddClick: () => void;
  activeMemberId?: string;
  members?: any[];
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  setActiveTab, 
  onAddClick,
  activeMemberId,
  members
}) => {
  const activeMember = members?.find(m => m.id === activeMemberId);
  const isChild = activeMember
    ? ['enfant', 'child', 'guest', 'invité'].includes(activeMember.role?.toLowerCase() || '')
    : (activeMemberId === '3' || activeMemberId === '4');
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 md:px-8 max-w-7xl mx-auto pointer-events-none ios-safe-bottom-nav">
      <div className="glass-panel rounded-t-[32px] rounded-b-[24px] pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.5)] border-t border-white/10 px-6 py-2 flex items-center justify-between">
        
        {/* Accueil */}
        <button 
          onClick={() => setActiveTab('accueil')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'accueil' 
              ? 'text-[#6C5CFF] scale-105' 
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-semibold tracking-wider">Accueil</span>
          {activeTab === 'accueil' && (
            <div className="w-1 h-1 rounded-full bg-[#6C5CFF] shadow-[0_0_8px_#6C5CFF]" />
          )}
        </button>

        {/* Agenda */}
        <button 
          onClick={() => setActiveTab('agenda')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'agenda' 
              ? 'text-[#6C5CFF] scale-105' 
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-semibold tracking-wider">Agenda</span>
          {activeTab === 'agenda' && (
            <div className="w-1 h-1 rounded-full bg-[#6C5CFF] shadow-[0_0_8px_#6C5CFF]" />
          )}
        </button>

        {/* Floating Add (+) Button */}
        {!isChild && (
          <div className="relative -top-4 flex justify-center">
            <div className="absolute w-16 h-16 rounded-full bg-[#6C5CFF]/20 blur-xl animate-pulse-slow"></div>
            <button 
              onClick={onAddClick}
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[var(--family-bg)] border-2 border-[#6C5CFF] text-[var(--family-text)] hover:text-[#6C5CFF] float-btn-halo cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
            >
              <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#4F8CFF] opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <Plus className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        )}

        {/* Finances */}
        <button 
          onClick={() => setActiveTab('finances')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'finances' 
              ? 'text-[#6C5CFF] scale-105' 
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-semibold tracking-wider">
            {isChild ? 'Cagnotte' : 'Finances'}
          </span>
          {activeTab === 'finances' && (
            <div className="w-1 h-1 rounded-full bg-[#6C5CFF] shadow-[0_0_8px_#6C5CFF]" />
          )}
        </button>

        {/* Menu Hub */}
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'menu' 
              ? 'text-[#6C5CFF] scale-105' 
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] font-semibold tracking-wider">Menu</span>
          {activeTab === 'menu' && (
            <div className="w-1 h-1 rounded-full bg-[#6C5CFF] shadow-[0_0_8px_#6C5CFF]" />
          )}
        </button>

      </div>
    </div>
  );
};
