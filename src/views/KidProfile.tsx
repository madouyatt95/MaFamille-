import React from 'react';
import { ArrowLeft, User, Star, Wallet, Award, Heart, Shield, Landmark, GraduationCap, FileText, PawPrint, Users } from 'lucide-react';
import type { Member, ChoreTask, SchoolTask, Trip, PetRecord } from '../types';

interface KidProfileProps {
  member: Member;
  pocketMoney: any[];
  tasks: ChoreTask[];
  schoolTasks: SchoolTask[];
  trips: Trip[];
  pets: PetRecord[];
  members: Member[];
  foyer: any;
  onBack: () => void;
}

export const KidProfile: React.FC<KidProfileProps> = ({
  member,
  pocketMoney,
  tasks,
  schoolTasks,
  trips,
  pets,
  members,
  foyer,
  onBack
}) => {
  // Find pocket money account
  const myAccount = pocketMoney.find(p => p.id === member.id) || { balance: 10.0, points: 120 };

  // Calculate statistics
  const completedChoresCount = tasks.filter(t => t.assignedMemberId === member.id && t.done).length;
  const completedSchoolCount = schoolTasks.filter(t => t.assignedMemberId === member.id && t.done).length;
  const level = Math.floor((myAccount.points || 0) / 50) + 1;
  const nextLevelProgress = ((myAccount.points || 0) % 50) * 2; // Progress out of 100% (50 points per level)

  // Badge list based on child achievements
  const badges = [
    { title: 'Super Chasseur 🧹', desc: 'Faire au moins 1 mission de rangement', active: completedChoresCount > 0, icon: '🧹' },
    { title: 'Petit Savant 📚', desc: 'Terminer un devoir scolaire', active: completedSchoolCount > 0, icon: '📚' },
    { title: 'Explorateur ✈️', desc: 'Partir en voyage familial', active: trips.length > 0, icon: '✈️' },
    { title: 'Ami des Bêtes 🐾', desc: 'Prendre soin des animaux du foyer', active: pets.length > 0, icon: '🐶' },
    { title: 'Aventurier ⛺', desc: 'Atteindre le niveau 2', active: level >= 2, icon: '⛺' }
  ];

  // Authorized documents for children
  const authorizedDocs = [
    { name: 'Carte d\'identité.pdf 🪪', size: '1.2 Mo', date: '05/01/2026' },
    { name: 'Carnet de santé - Page Vaccins.jpg 🩺', size: '2.4 Mo', date: '12/03/2026' },
    { name: 'Autorisation Sortie Scolaire.pdf 📝', size: '750 Ko', date: '01/06/2026' }
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">
      
      {/* Background magical glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#FFB020]/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pt-4 mb-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>👤</span>
              <span>Mon Profil</span>
            </h1>
            <p className="text-xs text-white/50 font-bold">Toutes tes informations de super-héros !</p>
          </div>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF] text-xl">
          ⚡
        </div>
      </div>

      {/* Main Avatar Card */}
      <div className="bg-gradient-to-br from-[#6C5CFF]/20 to-[#FFB020]/15 border-2 border-white/10 rounded-[36px] p-6 text-center space-y-4 shadow-xl relative">
        <div className="relative w-28 h-28 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#6C5CFF] to-[#FFB020] rounded-full blur-md opacity-60 animate-pulse"></div>
          <img 
            src={member.photoUrl} 
            alt={member.name} 
            className="w-28 h-28 rounded-full object-cover border-4 border-white relative z-10"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#FFB020] text-[#07111F] font-black text-xs px-3.5 py-1.5 rounded-full border-2 border-white z-20 shadow-md">
            Niv. {level}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">{member.name} 👋</h2>
          <p className="text-xs text-white/60 font-bold">Membre junior • {member.age} ans</p>
        </div>

        {/* Level progress bar */}
        <div className="space-y-1 max-w-[240px] mx-auto">
          <div className="flex justify-between text-[10px] font-black text-white/40">
            <span>Niveau {level}</span>
            <span>{myAccount.points % 50} / 50 pts</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-[#6C5CFF] to-[#FFB020] rounded-full transition-all duration-300"
              style={{ width: `${nextLevelProgress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[#07111F]/50 rounded-[24px] p-4 border border-white/5 flex flex-col items-center justify-center text-center">
            <Star className="w-6 h-6 text-[#FFB020] fill-[#FFB020] mb-1.5" />
            <span className="text-base font-black text-[#FFB020]">{myAccount.points}</span>
            <span className="text-[9px] font-bold text-white/40 uppercase">Points Étoiles</span>
          </div>
          <div className="bg-[#07111F]/50 rounded-[24px] p-4 border border-white/5 flex flex-col items-center justify-center text-center">
            <Wallet className="w-6 h-6 text-[#00D26A] mb-1.5" />
            <span className="text-base font-black text-[#00D26A]">{myAccount.balance.toFixed(2)} €</span>
            <span className="text-[9px] font-bold text-white/40 uppercase">Argent de poche</span>
          </div>
        </div>
      </div>

      {/* Badges store progress */}
      <div className="space-y-3 mt-6">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Mes Badges d'Honneur :</span>
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge, idx) => (
            <div 
              key={idx} 
              className={`rounded-[28px] p-4 border-2 text-left flex flex-col justify-between space-y-3 shadow-md ${
                badge.active 
                  ? 'bg-[#112240] border-[#FFB020]/30' 
                  : 'bg-white/5 border-white/5 opacity-40'
              }`}
            >
              <span className="text-2xl block">{badge.icon}</span>
              <div>
                <h4 className="text-xs font-black text-white">{badge.title}</h4>
                <p className="text-[9px] text-white/50 leading-snug font-bold mt-0.5">{badge.desc}</p>
              </div>
              
              <span className={`text-[8px] font-black uppercase w-fit px-2 py-0.5 rounded-full ${
                badge.active ? 'bg-[#FFB020]/15 text-[#FFB020]' : 'bg-white/5 text-white/30'
              }`}>
                {badge.active ? 'Débloqué 🏆' : 'Verrouillé'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Family information, Commune, School */}
      <div className="space-y-3 mt-6">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Ma Fiche d'Identité :</span>
        
        <div className="bg-white/5 border border-white/8 rounded-[32px] p-4 space-y-3 text-left">
          <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-2xl">
            <GraduationCap className="w-5 h-5 text-[#00D26A]" />
            <div>
              <span className="text-[9px] font-bold text-white/40 block">Établissement Scolaire :</span>
              <span className="text-xs font-extrabold text-white">{foyer?.schoolName || 'École Primaire Les Lilas 🏫'}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-2xl">
            <Landmark className="w-5 h-5 text-[#FFB020]" />
            <div>
              <span className="text-[9px] font-bold text-white/40 block">Ma Commune :</span>
              <span className="text-xs font-extrabold text-white">{foyer?.communeName || 'Commune de Belleville-sur-Seine 🏡'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-2xl">
            <Shield className="w-5 h-5 text-[#6C5CFF]" />
            <div>
              <span className="text-[9px] font-bold text-white/40 block">Foyer Familial :</span>
              <span className="text-xs font-extrabold text-white">{foyer?.name || 'Famille Royale 👑'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Family Pets */}
      {pets.length > 0 && (
        <div className="space-y-3 mt-6">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Mes Animaux de Compagnie :</span>
          <div className="grid grid-cols-2 gap-3">
            {pets.map(pet => (
              <div key={pet.id} className="bg-white/5 border border-white/5 rounded-[28px] p-4 flex items-center space-x-3 text-left">
                <div className="w-10 h-10 bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] rounded-2xl flex items-center justify-center text-xl shrink-0">
                  <PawPrint className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-white leading-tight">{pet.name}</h4>
                  <p className="text-[9px] text-white/45 font-bold">{pet.species} • Ami fidèle</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorized Documents */}
      <div className="space-y-3 mt-6">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Mes Documents Autorisés :</span>
        <div className="bg-white/5 border border-white/8 rounded-[32px] p-2 space-y-2 text-left">
          {authorizedDocs.map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-white/35" />
                <div>
                  <h4 className="text-xs font-extrabold text-white">{doc.name}</h4>
                  <p className="text-[9px] text-white/30 font-bold">{doc.size} • Ajouté le {doc.date}</p>
                </div>
              </div>
              <span className="text-[9.5px] font-black bg-[#6C5CFF]/15 text-[#9d94ff] px-2.5 py-1 rounded-xl uppercase tracking-wider">
                Voir
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Family members */}
      <div className="space-y-3 mt-6">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Ma Famille :</span>
        <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar">
          {members.map(m => (
            <div key={m.id} className="bg-[#112240] border border-white/5 rounded-3xl p-3 flex flex-col items-center justify-center text-center w-24 shrink-0 space-y-2">
              <img 
                src={m.photoUrl} 
                alt={m.name} 
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
              <div>
                <h4 className="text-[10px] font-black text-white leading-tight truncate w-20">{m.name}</h4>
                <p className="text-[8px] text-white/45 font-bold uppercase tracking-wider truncate w-20">{m.role || 'Membre'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
