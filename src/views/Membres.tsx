import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  ChevronRight, 
  X, 
  Calendar, 
  ShieldAlert, 
  PhoneCall, 
  GraduationCap, 
  Activity,
  Edit,
  Lock
} from 'lucide-react';
import type { Member } from '../types';

interface MembresProps {
  members: Member[];
  onAddMemberClick: () => void;
  activeMemberId?: string;
}

export const Membres: React.FC<MembresProps> = ({ 
  members, 
  onAddMemberClick,
  activeMemberId = '1'
}) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isChild = activeMemberId === '3' || activeMemberId === '4';

  // Local storage persisted state for vaccineList
  const [vaccineList, setVaccineList] = useState(() => {
    const saved = localStorage.getItem('mf_vaccines');
    return saved ? JSON.parse(saved) : [
      { id: 'v1', memberId: '3', name: 'ROR (Rappel)', date: '12/04/2026', status: 'Fait', doctor: 'Dr. Martin' },
      { id: 'v2', memberId: '3', name: 'Hépatite B', date: '18/10/2026', status: 'À faire', doctor: 'Dr. Martin' },
      { id: 'v3', memberId: '4', name: 'DTC (Rappel 12 ans)', date: '05/01/2026', status: 'Fait', doctor: 'Dr. Martin' },
      { id: 'v4', memberId: '1', name: 'Grippe Annuelle', date: '15/11/2026', status: 'À faire', doctor: 'Pharmacie' },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('mf_vaccines', JSON.stringify(vaccineList));
  }, [vaccineList]);

  // Tab state inside selected dossier
  const [healthSubTab, setHealthSubTab] = useState<'suivi' | 'vaccins' | 'ajouter'>('suivi');

  // Addition form states
  const [newVacName, setNewVacName] = useState('');
  const [newVacDate, setNewVacDate] = useState('');
  const [newVacStatus, setNewVacStatus] = useState<'Fait' | 'À faire'>('À faire');
  const [newVacDoctor, setNewVacDoctor] = useState('');

  const handleAddVaccine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !newVacName) return;
    const newV = {
      id: `v-${Date.now()}`,
      memberId: selectedMember.id,
      name: newVacName,
      date: newVacDate || new Date().toLocaleDateString('fr-FR'),
      status: newVacStatus,
      doctor: newVacDoctor || 'Médecin Traitant'
    };
    setVaccineList((prev: any) => [...prev, newV]);
    setNewVacName('');
    setNewVacDate('');
    setNewVacStatus('À faire');
    setNewVacDoctor('');
    alert('💉 Acte médical / Vaccin enregistré avec succès !');
    setHealthSubTab('vaccins');
  };

  // Form states for editing
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editBirth, setEditBirth] = useState('');
  const [editBlood, setEditBlood] = useState('A+');
  const [editSchool, setEditSchool] = useState('');

  const openDossier = (member: Member) => {
    setSelectedMember(member);
    setIsEditing(false);
  };

  const handleEditClick = (member: Member) => {
    setEditName(member.name);
    setEditRole(member.role);
    setEditAge(member.age);
    setEditBirth(member.birthDate);
    setEditBlood(member.bloodGroup);
    setEditSchool(member.schoolOrEmployer);
    setIsEditing(true);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    // Simuler la modification locale dans le state temporaire de l'objet sélectionné
    selectedMember.name = editName;
    selectedMember.role = editRole;
    selectedMember.age = editAge;
    selectedMember.birthDate = editBirth;
    selectedMember.bloodGroup = editBlood;
    selectedMember.schoolOrEmployer = editSchool;
    
    setIsEditing(false);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-4xl mx-auto premium-glow-blue">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Membres</h1>
            <p className="text-xs text-white/50 font-medium">Portail de dossiers de votre famille</p>
          </div>
        </div>
        
        {!isChild && (
          <button 
            onClick={onAddMemberClick}
            className="p-3 rounded-2xl bg-[#6C5CFF] text-white hover:opacity-90 transition-all cursor-pointer shadow-[0_4px_12px_rgba(108,92,255,0.4)]"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Grid view containing List and Dossier side-by-side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Members List */}
        <div className="space-y-3">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => openDossier(member)}
              className={`w-full glass-panel rounded-[28px] p-4 flex items-center justify-between border transition-all cursor-pointer text-left hover:bg-white/8 ${
                selectedMember?.id === member.id 
                  ? 'border-[#6C5CFF] bg-[#6C5CFF]/5 shadow-[0_0_15px_rgba(108,92,255,0.15)]' 
                  : 'border-white/8'
              }`}
            >
              <div className="flex items-center space-x-4">
                <img 
                  src={member.photoUrl} 
                  alt={member.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">{member.name}</h3>
                  <p className="text-[11px] text-white/50 mt-0.5">{member.role}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </button>
          ))}

          {/* Inviter Member Row (Only parents) */}
          {!isChild && (
            <button
              onClick={onAddMemberClick}
              className="w-full glass-panel rounded-[28px] p-4 flex items-center justify-between border border-dashed border-white/20 transition-all cursor-pointer text-left hover:bg-white/5 hover:border-[#6C5CFF]/40"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 flex items-center justify-center text-[#6C5CFF]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ajouter un membre</h3>
                  <p className="text-[11px] text-white/50 mt-0.5">Inviter un nouveau membre dans la famille</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30" />
            </button>
          )}
        </div>

        {/* Member Dossier Details Sheet */}
        <div className="glass-panel rounded-[28px] border border-white/8 p-6 space-y-6 relative overflow-hidden min-h-[350px]">
          {selectedMember ? (
            <>
              {/* Close Button (mobile utility) */}
              <div className="absolute right-4 top-4 flex space-x-2">
                {!isChild && (
                  <button 
                    onClick={() => handleEditClick(selectedMember)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer border border-white/5"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer border border-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isEditing ? (
                /* Edit Form */
                <form onSubmit={saveEdit} className="space-y-4 pt-4">
                  <h3 className="text-md font-bold text-white border-b border-white/5 pb-2">Modifier le dossier</h3>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Nom complet</label>
                    <input 
                      type="text" 
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Rôle / Statut</label>
                    <input 
                      type="text" 
                      required
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Âge</label>
                      <input 
                        type="text" 
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Date de naissance</label>
                      <input 
                        type="text" 
                        value={editBirth}
                        onChange={(e) => setEditBirth(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Groupe Sanguin</label>
                    <select 
                      value={editBlood}
                      onChange={(e) => setEditBlood(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">École / Employeur</label>
                    <input 
                      type="text" 
                      value={editSchool}
                      onChange={(e) => setEditSchool(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/5"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 rounded-xl bg-[#6C5CFF] text-white font-semibold text-xs shadow-md"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              ) : (
                /* Dossier Content */
                <>
                  {/* Photo & Identity Heading */}
                  <div className="flex flex-col items-center text-center space-y-3 pt-4">
                    <img 
                      src={selectedMember.photoUrl} 
                      alt={selectedMember.name} 
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#6C5CFF]/20"
                    />
                    <div>
                      <h2 className="text-lg font-extrabold text-white">{selectedMember.name}</h2>
                      <p className="text-xs text-[#4F8CFF] font-semibold">{selectedMember.role}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    
                    {/* DOB & School */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 text-white/40">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Naissance</span>
                        </div>
                        <p className="text-xs font-semibold text-white">{selectedMember.birthDate}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 text-white/40">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Scolarité / Pro</span>
                        </div>
                        <p className="text-xs font-semibold text-white truncate">{selectedMember.schoolOrEmployer}</p>
                      </div>
                    </div>

                    {/* Medical Section Header & Confidential Lock */}
                    {isChild && selectedMember.id !== activeMemberId ? (
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center py-10 space-y-4">
                        <div className="p-3.5 rounded-full bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/20 animate-pulse">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fiche Médicale Confidentielle</h4>
                          <p className="text-[10px] text-white/40 max-w-[200px] mt-2 mx-auto leading-relaxed">
                            Les informations médicales de ce membre sont confidentielles et réservées à l'accès parental.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 pt-3 border-t border-white/5">
                          <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center space-x-1">
                            <Activity className="w-3.5 h-3.5 text-[#FF4D6D]" />
                            <span>Fiche Médicale Privée</span>
                          </h4>

                          {/* Blood, Allergies, Treatment */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Sang</span>
                              <span className="text-sm font-extrabold text-[#FF4D6D] mt-0.5 block">{selectedMember.bloodGroup}</span>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center col-span-2">
                              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Allergies</span>
                              <span className="text-[10px] font-bold text-white truncate mt-1 block">
                                {selectedMember.allergies.join(', ')}
                              </span>
                            </div>
                          </div>

                          {selectedMember.treatments.length > 0 && selectedMember.treatments[0] !== 'Aucun' && (
                            <div className="p-3 rounded-2xl bg-[#FFB020]/10 border border-[#FFB020]/20 flex items-start space-x-2">
                              <ShieldAlert className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[9px] font-bold text-[#FFB020] uppercase tracking-wider">Traitement requis</p>
                                <p className="text-[10px] text-white/80 font-medium mt-0.5">
                                  {selectedMember.treatments.join(', ')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Emergency Contact */}
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                          <div className="flex items-center space-x-1.5 text-white/40">
                            <PhoneCall className="w-3.5 h-3.5 text-[#00D26A]" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Contact d'urgence</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">{selectedMember.emergencyContact.name}</p>
                              <p className="text-[10px] text-white/50">{selectedMember.emergencyContact.relation} • {selectedMember.emergencyContact.phone}</p>
                            </div>
                            <a 
                              href={`tel:${selectedMember.emergencyContact.phone}`}
                              className="px-3 py-1.5 rounded-xl bg-[#00D26A] text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
                            >
                              Appeler
                            </a>
                          </div>
                        </div>

                        {/* Onglets Carnet de Santé */}
                        <div className="flex border-t border-white/5 pb-2 pt-4 gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => setHealthSubTab('suivi')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                              healthSubTab === 'suivi' 
                                ? 'bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/30' 
                                : 'text-white/40 hover:text-white/70 bg-white/5'
                            }`}
                          >
                            📈 Courbe
                          </button>
                          <button
                            type="button"
                            onClick={() => setHealthSubTab('vaccins')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                              healthSubTab === 'vaccins' 
                                ? 'bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/30' 
                                : 'text-white/40 hover:text-white/70 bg-white/5'
                            }`}
                          >
                            💉 Vaccins & Examens
                          </button>
                          {!isChild && (
                            <button
                              type="button"
                              onClick={() => setHealthSubTab('ajouter')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                healthSubTab === 'ajouter' 
                                  ? 'bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/30' 
                                  : 'text-white/40 hover:text-white/70 bg-white/5'
                              }`}
                            >
                              ➕ Ajouter un Acte
                            </button>
                          )}
                        </div>

                        {/* Onglet 1: Courbes de Suivi */}
                        {healthSubTab === 'suivi' && (
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            {['3', '4'].includes(selectedMember.id) ? (
                              <>
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block text-center">
                                  Courbe Pédiatrique de Croissance (Standard vs Réel)
                                </span>
                                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl relative">
                                  <svg viewBox="0 0 240 120" className="w-full h-auto text-white">
                                    <line x1="20" y1="10" x2="220" y2="10" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="35" x2="220" y2="35" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="60" x2="220" y2="60" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="85" x2="220" y2="85" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="110" x2="220" y2="110" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
                                    
                                    {/* Standard/Theoretical Curve (Green) */}
                                    <path 
                                      d="M 20 100 Q 120 70 220 20" 
                                      fill="none" 
                                      stroke="#00D26A" 
                                      strokeWidth="1.5" 
                                      strokeDasharray="2,2" 
                                      strokeOpacity="0.7" 
                                    />
                                    
                                    {/* Actual Member growth Curve (Purple) */}
                                    <path 
                                      d={selectedMember.id === '3' ? "M 20 102 C 60 90, 100 82, 140 68" : "M 20 102 C 80 85, 140 50, 220 22"} 
                                      fill="none" 
                                      stroke="#6C5CFF" 
                                      strokeWidth="2.5" 
                                      strokeLinecap="round" 
                                    />
                                    
                                    {/* Dot on last measured height */}
                                    <circle 
                                      cx={selectedMember.id === '3' ? "140" : "220"} 
                                      cy={selectedMember.id === '3' ? "68" : "22"} 
                                      r="4" 
                                      fill="#FF4D6D" 
                                    />
                                    
                                    {/* Labels */}
                                    <text x="25" y="105" fontSize="6" fill="white" fillOpacity="0.5">8 ans</text>
                                    <text x="120" y="105" fontSize="6" fill="white" fillOpacity="0.5">10 ans</text>
                                    <text x="200" y="105" fontSize="6" fill="white" fillOpacity="0.5">12 ans</text>
                                  </svg>
                                  <div className="flex justify-between items-center mt-2 text-[10px]">
                                    <span className="text-white/40">Dernier relevé :</span>
                                    <span className="font-bold text-white">
                                      {selectedMember.id === '3' ? '128 cm • 27 kg (Normal)' : '146 cm • 38 kg (Normal)'}
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block text-center">
                                  Suivi Cardiovasculaire & Sommeil (Adulte)
                                </span>
                                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl relative">
                                  <svg viewBox="0 0 240 120" className="w-full h-auto text-white">
                                    <line x1="20" y1="10" x2="220" y2="10" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="35" x2="220" y2="35" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="60" x2="220" y2="60" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="85" x2="220" y2="85" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
                                    <line x1="20" y1="110" x2="220" y2="110" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />

                                    {/* Pulse curve (Red) */}
                                    <path 
                                      d="M 20 60 L 50 60 L 55 40 L 60 80 L 65 60 L 110 60 L 115 20 L 120 100 L 125 60 L 170 60 L 175 40 L 180 75 L 185 60 L 220 60"
                                      fill="none" 
                                      stroke="#FF4D6D" 
                                      strokeWidth="1.5" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    />
                                    
                                    {/* Sleep score bar graph overlay */}
                                    <rect x="30" y="80" width="10" height="30" fill="#6C5CFF" fillOpacity="0.3" rx="2" />
                                    <rect x="90" y="70" width="10" height="40" fill="#6C5CFF" fillOpacity="0.3" rx="2" />
                                    <rect x="150" y="65" width="10" height="45" fill="#6C5CFF" fillOpacity="0.3" rx="2" />
                                    <rect x="210" y="75" width="10" height="35" fill="#6C5CFF" fillOpacity="0.3" rx="2" />

                                    {/* Labels */}
                                    <text x="30" y="117" fontSize="5" fill="white" fillOpacity="0.4">Lun</text>
                                    <text x="90" y="117" fontSize="5" fill="white" fillOpacity="0.4">Mer</text>
                                    <text x="150" y="117" fontSize="5" fill="white" fillOpacity="0.4">Ven</text>
                                    <text x="210" y="117" fontSize="5" fill="white" fillOpacity="0.4">Dim</text>
                                  </svg>
                                  <div className="flex justify-between items-center mt-2 text-[10px]">
                                    <span className="text-white/40">Tension Artérielle moyenne :</span>
                                    <span className="font-bold text-[#00D26A]">12/7 (Excellente)</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Onglet 2: Vaccins & Rappels */}
                        {healthSubTab === 'vaccins' && (
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">
                              Calendrier des Vaccins & Rappels
                            </span>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {vaccineList.filter((v: any) => v.memberId === selectedMember.id).length === 0 ? (
                                <p className="text-[10px] text-white/40 text-center py-4 font-medium">Aucun vaccin ou examen enregistré pour ce membre.</p>
                              ) : (
                                vaccineList
                                  .filter((v: any) => v.memberId === selectedMember.id)
                                  .map((v: any) => (
                                    <div key={v.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs font-sans text-left">
                                      <div>
                                        <p className="font-bold text-white">{v.name}</p>
                                        <p className="text-[10px] text-white/40 mt-0.5">Le {v.date} • {v.doctor}</p>
                                      </div>
                                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                        v.status === 'Fait'
                                          ? 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]'
                                          : 'bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020]'
                                      }`}>
                                        {v.status}
                                      </span>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Onglet 3: Ajouter un Acte (uniquement pour les parents) */}
                        {healthSubTab === 'ajouter' && !isChild && (
                          <form onSubmit={handleAddVaccine} className="space-y-3 pt-2 text-left border-t border-white/5">
                            <span className="text-[9px] font-bold text-[#FF4D6D] uppercase tracking-widest block text-center">
                              Ajouter un Acte Médical (Parent🔒)
                            </span>
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nom de l'Acte / Vaccin</label>
                              <input 
                                type="text" 
                                required
                                placeholder="ex: Rappel ROR, Consultation..."
                                value={newVacName}
                                onChange={(e) => setNewVacName(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date prévue</label>
                                <input 
                                  type="text" 
                                  placeholder="ex: 12/09/2026"
                                  value={newVacDate}
                                  onChange={(e) => setNewVacDate(e.target.value)}
                                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Statut</label>
                                <select
                                  value={newVacStatus}
                                  onChange={(e) => setNewVacStatus(e.target.value as any)}
                                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                                >
                                  <option value="À faire">À faire</option>
                                  <option value="Fait">Fait</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Médecin / Établissement</label>
                              <input 
                                type="text" 
                                placeholder="ex: Dr. Martin, Cabinet Pédiatrique..."
                                value={newVacDoctor}
                                onChange={(e) => setNewVacDoctor(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FF4D6D]/20"
                            >
                              <Plus className="w-4 h-4 text-white" />
                              <span>Enregistrer l'Acte Médical</span>
                            </button>
                          </form>
                        )}
                      </>
                    )}

                  </div>
                </>
              )}
            </>
          ) : (
            /* No selected member view */
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-4 space-y-4">
              <div className="p-4 rounded-full bg-white/5 border border-white/5 text-white/20">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sélectionnez un membre</h3>
                <p className="text-xs text-white/40 max-w-[250px] mt-1 mx-auto leading-relaxed">
                  Cliquez sur un profil familial pour ouvrir son coffre-fort d'identité sécurisé.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
