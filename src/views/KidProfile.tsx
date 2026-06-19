import React, { useState } from 'react';
import { ArrowLeft, Star, Wallet, Shield, Landmark, GraduationCap, FileText, PawPrint, X } from 'lucide-react';
import type { Member, ChoreTask, SchoolTask, Trip, PetRecord, DocumentFile, Foyer, PocketMoneyChild } from '../types';

type KidProfileFoyer = Partial<Foyer> & {
  schoolName?: string;
  communeName?: string;
};

interface KidProfileProps {
  member: Member;
  pocketMoney: PocketMoneyChild[];
  tasks: ChoreTask[];
  schoolTasks: SchoolTask[];
  trips: Trip[];
  pets: PetRecord[];
  members: Member[];
  foyer: KidProfileFoyer | null;
  documents?: DocumentFile[];
  onBack: () => void;
  onOpenChatWithMember?: (memberId: string) => void;
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
  documents = [],
  onBack,
  onOpenChatWithMember
}) => {
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const memberInitial = member.name.trim().charAt(0).toUpperCase() || '?';
  const ageLabel = member.age && /^\d+$/.test(String(member.age).trim())
    ? `${member.age} ans`
    : 'Âge à compléter';

  const myRealDocs = documents.filter(d => d && d.memberId === member.id && !d.isSecure);
  // Find pocket money account
  const myAccount = pocketMoney.find(p => p.id === member.id) || { balance: 0.0, points: 0 };

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

  return (
    <div className="min-h-screen bg-[#07111F] text-white p-4 font-sans pb-32 relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top,0px))] mb-6">
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
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-white relative z-10"
            />
          ) : (
            <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-[#6C5CFF] text-4xl font-black text-white">
              {memberInitial}
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 bg-[#FFB020] text-[#07111F] font-black text-xs px-3.5 py-1.5 rounded-full border-2 border-white z-20 shadow-md">
            Niv. {level}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">{member.name} 👋</h2>
          <p className="text-xs text-white/60 font-bold">Membre junior • {ageLabel}</p>
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
              <span className="text-xs font-extrabold text-white">{foyer?.schoolName || member.schoolOrEmployer || 'À compléter par un parent'}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-2xl">
            <Landmark className="w-5 h-5 text-[#FFB020]" />
            <div>
              <span className="text-[9px] font-bold text-white/40 block">Ma Commune :</span>
              <span className="text-xs font-extrabold text-white">{foyer?.communeName || 'À compléter dans les réglages du foyer'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-2xl">
            <Shield className="w-5 h-5 text-[#6C5CFF]" />
            <div>
              <span className="text-[9px] font-bold text-white/40 block">Foyer Familial :</span>
              <span className="text-xs font-extrabold text-white">{foyer?.name || 'Foyer non renseigné'}</span>
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
          {myRealDocs.length === 0 ? (
            <p className="text-xs text-center text-white/30 py-6">Aucun document autorisé partagé pour le moment.</p>
          ) : (
            myRealDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-white/35 shrink-0" />
                  <div className="max-w-[180px]">
                    <h4 className="text-xs font-extrabold text-white truncate">{doc.name}</h4>
                    <p className="text-[9px] text-white/30 font-bold">{doc.fileSize || 'N/A'} • Ajouté le {doc.uploadDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="text-[9.5px] font-black bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/30 text-[#9d94ff] px-2.5 py-1.5 rounded-xl uppercase tracking-wider cursor-pointer transition active:scale-95 border-none"
                >
                  Voir
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Family members */}
      <div className="space-y-3 mt-6">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Ma Famille :</span>
        <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar">
          {members.map(m => {
            const isSelf = m.id === member.id;
            return (
              <div 
                key={m.id} 
                onClick={() => {
                  if (!isSelf && onOpenChatWithMember) {
                    onOpenChatWithMember(m.id);
                  }
                }}
                className={`bg-[#112240] border rounded-3xl p-3 flex flex-col items-center justify-center text-center w-24 shrink-0 space-y-2 select-none ${
                  isSelf 
                    ? 'border-white/5 opacity-50 cursor-not-allowed' 
                    : 'border-white/5 cursor-pointer hover:border-[#6C5CFF]/40 active:scale-95 transition-all'
                }`}
              >
                {m.photoUrl ? (
                  <img
                    src={m.photoUrl}
                    alt={m.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#6C5CFF]/20 text-sm font-black text-white">
                    {m.name.trim().charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <h4 className="text-[10px] font-black text-white leading-tight truncate w-20">{m.name}</h4>
                  <p className="text-[8px] text-white/45 font-bold uppercase tracking-wider truncate w-20">
                    {isSelf ? 'Moi ⭐' : (m.role || 'Membre')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[#112240] w-full max-w-lg rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#6C5CFF]" />
                <div className="text-left">
                  <h3 className="text-xs font-bold truncate max-w-[200px] text-white">{previewDoc.name}</h3>
                  <p className="text-[9px] text-white/40">{previewDoc.uploadDate} • {previewDoc.fileSize || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition cursor-pointer border-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="p-6 flex-1 overflow-y-auto flex items-center justify-center bg-black/10">
              {(previewDoc.fileUrl || previewDoc.fileBase64) ? (
                ((previewDoc.fileUrl || previewDoc.fileBase64 || '').startsWith('data:image/') || (previewDoc.fileUrl || previewDoc.fileBase64 || '').includes(';base64,') || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(previewDoc.fileUrl || '')) ? (
                  <img src={previewDoc.fileUrl || previewDoc.fileBase64} alt={previewDoc.name} className="max-w-full h-auto max-h-[50vh] object-contain rounded-2xl shadow-lg border border-white/5" />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <span className="text-5xl">📄</span>
                    <p className="text-xs text-white/50">Ce document est un fichier ou PDF.</p>
                  </div>
                )
              ) : (
                <div className="text-center p-6 space-y-2 text-white/40">
                  <span className="text-4xl">📂</span>
                  <p className="text-xs">Aucun aperçu disponible pour ce document.</p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex space-x-3">
              <button
                onClick={() => setPreviewDoc(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase text-white/70 tracking-wider cursor-pointer border-none"
              >
                Fermer
              </button>
              {(previewDoc.fileUrl || previewDoc.fileBase64) && (
                <a 
                  href={previewDoc.fileUrl || previewDoc.fileBase64} 
                  download={previewDoc.name}
                  className="flex-1 py-3 bg-[#6C5CFF] hover:bg-[#5b4eff] rounded-2xl text-xs font-black uppercase text-white tracking-wider cursor-pointer text-center flex items-center justify-center space-x-1.5 shadow-lg shadow-[#6C5CFF]/20 no-underline"
                >
                  <span>Télécharger</span>
                </a>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
