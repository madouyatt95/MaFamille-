import React from 'react';
import { 
  X, 
  Home, 
  Users, 
  Calendar, 
  Wallet, 
  FolderLock, 
  HeartPulse, 
  GraduationCap, 
  ShoppingBasket, 
  UtensilsCrossed, 
  Brush, 
  Car, 
  Home as HomeIcon, 
  Plane, 
  Dog, 
  Target, 
  Coins, 
  Bot, 
  Settings, 
  Lock 
} from 'lucide-react';
import type { Member } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;
  members: Member[];
  activeMemberId: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  setActiveTab,
  setActiveModule,
  members,
  activeMemberId
}) => {
  const activeMember = members.find(m => m.id === activeMemberId) || {
    name: 'Papa',
    role: 'Chef de famille',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
  };

  const menuItems = [
    { id: 'accueil', label: 'Accueil', icon: Home, isTab: true },
    { id: 'membres', label: 'Membres de la Famille', icon: Users, isTab: false, module: 'membres' },
    { id: 'agenda', label: 'Agenda Partagé', icon: Calendar, isTab: true },
    { id: 'finances', label: 'Finances & Budgets', icon: Wallet, isTab: true },
    { id: 'documents', label: 'Coffre-fort Documents', icon: FolderLock, isTab: false, module: 'documents' },
    { id: 'sante', label: 'Santé & Vaccins', icon: HeartPulse, isTab: false, module: 'sante' },
    { id: 'ecole', label: 'École & Devoirs', icon: GraduationCap, isTab: false, module: 'ecole' },
    { id: 'courses', label: 'Liste de Courses', icon: ShoppingBasket, isTab: false, module: 'courses' },
    { id: 'menus', label: 'Menus de la Semaine', icon: UtensilsCrossed, isTab: false, module: 'menus' },
    { id: 'taches', label: 'Tâches Ménagères', icon: Brush, isTab: false, module: 'taches' },
    { id: 'vehicules', label: 'Gestion Véhicules', icon: Car, isTab: false, module: 'vehicules' },
    { id: 'logement', label: 'Entretien Logement', icon: HomeIcon, isTab: false, module: 'logement' },
    { id: 'voyages', label: 'Carnet de Voyages', icon: Plane, isTab: false, module: 'voyages' },
    { id: 'animaux', label: 'Suivi Animaux', icon: Dog, isTab: false, module: 'animaux' },
    { id: 'objectifs', label: 'Objectifs Familiaux', icon: Target, isTab: false, module: 'objectifs' },
    { id: 'argent', label: 'Argent de Poche', icon: Coins, isTab: false, module: 'argent' },
    { id: 'assistant', label: 'Assistant IA MaFamille+', icon: Bot, isTab: false, module: 'assistant' },
    { id: 'settings', label: 'Paramètres & Sécurité', icon: Settings, isTab: false, module: 'settings' }
  ];

  const handleItemClick = (item: typeof menuItems[0]) => {
    if (item.isTab) {
      setActiveTab(item.id);
      setActiveModule('');
    } else if (item.module) {
      setActiveTab('menu');
      setActiveModule(item.module);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 bottom-0 left-0 w-80 glass-panel border-r border-white/10 z-50 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src={activeMember.photoUrl} 
                alt={`${activeMember.name} Avatar`} 
                className="w-10 h-10 rounded-full border border-[#6C5CFF] object-cover"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00D26A] border-2 border-[#07111F] rounded-full"></span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{activeMember.name}</h3>
              <p className="text-xs text-white/50">{activeMember.role}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
          <p className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            OS Familial
          </p>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-[18px] text-white/70 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-left text-sm cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-white/5 text-white/50 group-hover:text-[#6C5CFF] group-hover:bg-[#6C5CFF]/10 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/8 bg-[#07111F]/50">
          <div className="flex items-center space-x-2 p-3 rounded-2xl bg-white/5 border border-white/5">
            <Lock className="w-4 h-4 text-[#00D26A]" />
            <div className="flex-1">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Sécurité active</p>
              <p className="text-[11px] text-white/80 font-medium">Données cryptées localement</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
