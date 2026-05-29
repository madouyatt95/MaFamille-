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
  Lock,
  Copy,
  Check,
  Camera,
  LogOut
} from 'lucide-react';
import { foyerService } from '../services/foyerService';
import type { Member, Foyer, FoyerMember, MemberRole } from '../types';

interface MembresProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  onAddMemberClick?: () => void;
  onAddMember?: (newMem: any) => Promise<void> | void;
  onUpdateMemberProfile?: (memberId: string, updates: Partial<FoyerMember>) => Promise<void> | void;
  activeMemberId?: string;
  foyer?: Foyer | null;
  myMemberProfile?: FoyerMember | null;
  setActiveTab?: (tab: string) => void;
  setActiveModule?: (module: string) => void;
  onLogout?: () => void;
  onLeaveFoyer?: () => Promise<void> | void;
}

export const Membres: React.FC<MembresProps> = ({ 
  members, 
  setMembers,
  onAddMemberClick: _onAddMemberClick,
  onAddMember,
  onUpdateMemberProfile,
  activeMemberId = '1',
  foyer,
  myMemberProfile,
  setActiveTab,
  setActiveModule,
  onLogout,
  onLeaveFoyer
}) => {
  // Invitation réelle & Ajout unifié
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addingTab, setAddingTab] = useState<'create' | 'invite'>('create');

  // No-foyer state variables
  const [noFoyerAction, setNoFoyerAction] = useState<'join' | 'create'>('join');
  const [foyerNameInput, setFoyerNameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState(myMemberProfile?.displayName || '');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Create form states
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<'parent' | 'child' | 'guest'>('child');
  const [addAge, setAddAge] = useState('');
  const [addBirth, setAddBirth] = useState('');
  const [addBlood, setAddBlood] = useState('A+');
  const [addAllergies, setAddAllergies] = useState('');
  const [addTreatments, setAddTreatments] = useState('');
  const [addSchool, setAddSchool] = useState('');
  const [addEmergencyName, setAddEmergencyName] = useState('');
  const [addEmergencyPhone, setAddEmergencyPhone] = useState('');
  const [addEmergencyRelation, setAddEmergencyRelation] = useState('');
  const [addHasExemption, setAddHasExemption] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'parent' | 'child' | 'guest'>('child');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleAddMemberClick = () => {
    setSelectedMember(null);
    setIsEditing(false);
    setIsAddingMember(true);
  };

  const handleCreateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddMember) return;
    setSubmittingAdd(true);
    try {
      const newMemberPayload = {
        name: addName.trim(),
        role: addRole,
        age: addAge.trim() || 'Nouveau',
        birthDate: addBirth.trim() || 'Inconnue',
        bloodGroup: addBlood,
        allergies: addAllergies.trim() ? addAllergies.split(',').map(a => a.trim()) : ['Aucune'],
        treatments: addTreatments.trim() ? addTreatments.split(',').map(t => t.trim()) : ['Aucun'],
        schoolOrEmployer: addSchool.trim() || 'Non renseigné',
        emergencyContact: {
          name: addEmergencyName.trim() || 'Maman',
          phone: addEmergencyPhone.trim() || '',
          relation: addEmergencyRelation.trim() || 'Mère'
        },
        hasExemption: addRole === 'child' ? addHasExemption : false
      };

      await onAddMember(newMemberPayload);

      // Reset form states
      setAddName('');
      setAddRole('child');
      setAddAge('');
      setAddBirth('');
      setAddBlood('A+');
      setAddAllergies('');
      setAddTreatments('');
      setAddSchool('');
      setAddEmergencyName('');
      setAddEmergencyPhone('');
      setAddEmergencyRelation('');
      setAddHasExemption(false);
      setIsAddingMember(false);
    } catch (err: any) {
      console.error("Erreur lors de l'ajout du membre :", err);
      alert(`Erreur : ${err.message || err}`);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foyer || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      await foyerService.inviteByEmail(foyer.id, inviteEmail.trim(), inviteRole);
      setInviteMessage({ text: `Invitation envoyée avec succès à ${inviteEmail} ! ✉️`, type: 'success' });
      setInviteEmail('');
    } catch (err: any) {
      setInviteMessage({ text: err.message || "Erreur lors de l'envoi de l'invitation.", type: 'error' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (!foyer) return;
    navigator.clipboard.writeText(foyer.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };
  const [selectedMember, setSelectedMember] = useState<Member | null>(() => members.length > 0 ? members[0] : null);
  const [isEditing, setIsEditing] = useState(false);

  // Generative AI Avatar states
  const [showAvatarGenerator, setShowAvatarGenerator] = useState<boolean>(false);
  const [avatarStyle, setAvatarStyle] = useState<'pixar' | 'anime' | 'fantasy' | 'pixel'>('pixar');
  const [avatarDesc, setAvatarDesc] = useState<string>('');
  const [generatedAvatar, setGeneratedAvatar] = useState<string>('');
  const [generatingAvatar, setGeneratingAvatar] = useState<boolean>(false);
  const [avatarStep, setAvatarStep] = useState<number>(0);

  const isChild = myMemberProfile 
    ? ['child', 'Enfant'].includes(myMemberProfile.role)
    : (activeMemberId === '3' || activeMemberId === '4');

  // vaccineList and setVaccineList are no longer needed as they are fully managed in the unified Santé module

  // Tab state inside selected dossier - completely handled via unified health page redirection

  // Form states for editing
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editBirth, setEditBirth] = useState('');
  const [editBlood, setEditBlood] = useState('A+');
  const [editSchool, setEditSchool] = useState('');
  const [editHasExemption, setEditHasExemption] = useState(false);

  const openDossier = (member: Member) => {
    setSelectedMember(member);
    setIsEditing(false);
    setIsAddingMember(false);
  };

  const handleEditClick = (member: Member) => {
    setEditName(member.name);
    setEditRole(member.role);
    setEditAge(member.age);
    setEditBirth(member.birthDate);
    setEditBlood(member.bloodGroup);
    setEditSchool(member.schoolOrEmployer);
    setEditHasExemption(!!member.hasExemption);
    setIsEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setSavingProfile(true);
    try {
      // Map friendly UI roles to database-compatible roles
      const dbRole: MemberRole = 
        editRole === 'Chef de famille' || editRole === 'Chef de famille (Admin)' || editRole === 'admin' ? 'admin' :
        editRole === 'Gestionnaire' || editRole === 'Gestionnaire / Parent' || editRole === 'parent' ? 'parent' :
        editRole === 'Enfant' || editRole === 'child' ? 'child' :
        'guest';

      const friendlyUIRole = 
        dbRole === 'admin' ? 'Chef de famille' :
        dbRole === 'parent' ? 'Gestionnaire' :
        dbRole === 'child' ? 'Enfant' :
        'Invité';

      const updates = {
        displayName: editName.trim(),
        role: dbRole,
        age: editAge.trim(),
        birthDate: editBirth.trim(),
        bloodGroup: editBlood,
        schoolOrEmployer: editSchool.trim(),
        hasExemption: dbRole === 'child' ? editHasExemption : false
      };

      if (foyer) {
        // Persist to Supabase Cloud Foyer
        await foyerService.updateMemberProfile(selectedMember.id, updates);
      }

      if (onUpdateMemberProfile) {
        onUpdateMemberProfile(selectedMember.id, updates);
      }

      setMembers(prev => prev.map(m => {
        if (m.id === selectedMember.id) {
          const updated = {
            ...m,
            name: editName.trim(),
            role: friendlyUIRole,
            age: editAge.trim(),
            birthDate: editBirth.trim(),
            bloodGroup: editBlood,
            schoolOrEmployer: editSchool.trim(),
            hasExemption: dbRole === 'child' ? editHasExemption : false
          };
          setSelectedMember(updated);
          return updated;
        }
        return m;
      }));
      
      setIsEditing(false);
      alert('✏️ Profil mis à jour avec succès ! ✨');
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour du profil :", err);
      alert(`Impossible de sauvegarder les modifications : ${err.message || err}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMember) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      if (!base64String) return;

      try {
        if (foyer) {
          await foyerService.updateMemberProfile(selectedMember.id, {
            photoUrl: base64String
          });
        }
        if (onUpdateMemberProfile) {
          onUpdateMemberProfile(selectedMember.id, { photoUrl: base64String });
        }
        setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, photoUrl: base64String } : m));
        setSelectedMember(prev => prev ? { ...prev, photoUrl: base64String } : null);
        alert("📷 Photo de profil mise à jour avec succès !");
      } catch (err: any) {
        console.error("Erreur lors de la sauvegarde de la photo :", err);
        alert(`Impossible de sauvegarder la photo : ${err.message || err}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleJoinFoyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || !displayNameInput.trim()) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    setActionLoading(true);
    try {
      const data = await foyerService.joinFoyer(inviteCodeInput.trim(), displayNameInput.trim(), 'child');
      alert(`🎉 Demande envoyée ! Le Chef de famille du foyer "${data.foyer_name}" doit maintenant valider votre demande.`);
      window.location.reload();
    } catch (err: any) {
      alert(`Erreur : ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFoyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foyerNameInput.trim() || !displayNameInput.trim()) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    setActionLoading(true);
    try {
      await foyerService.createFoyer(foyerNameInput.trim(), displayNameInput.trim(), false);
      alert("🎉 Foyer créé avec succès !");
      window.location.reload();
    } catch (err: any) {
      alert(`Erreur : ${err.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingMembers = members.filter(m => m.approved === false);
  const approvedMembers = members.filter(m => m.approved !== false);

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
            onClick={handleAddMemberClick}
            className="p-3 rounded-2xl bg-[#6C5CFF] text-white hover:opacity-90 transition-all cursor-pointer shadow-[0_4px_12px_rgba(108,92,255,0.4)]"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {!foyer ? (
        <div className="max-w-md mx-auto glass-panel rounded-[32px] border border-white/10 p-6 space-y-6 animate-scale-up">
          <div className="text-center space-y-2">
            <span className="text-3xl">🏡</span>
            <h2 className="text-lg font-extrabold text-white">Rejoindre ou Créer une Famille</h2>
            <p className="text-xs text-white/50">Vous n'êtes actuellement associé à aucun foyer.</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 rounded-2xl bg-black/20 border border-white/5">
            <button
              onClick={() => setNoFoyerAction('join')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                noFoyerAction === 'join'
                  ? 'bg-[#6C5CFF] text-white shadow-md'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Rejoindre un foyer ✉️
            </button>
            <button
              onClick={() => setNoFoyerAction('create')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                noFoyerAction === 'create'
                  ? 'bg-[#6C5CFF] text-white shadow-md'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Créer un foyer 🏡
            </button>
          </div>

          {noFoyerAction === 'join' ? (
            <form onSubmit={handleJoinFoyerSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Code d'invitation (6 caractères)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ABCDEF"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] font-mono text-center uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Votre nom d'affichage dans la famille
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Papa, Marie..."
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3.5 rounded-xl bg-[#6C5CFF] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md shadow-[#6C5CFF]/15"
              >
                {actionLoading ? 'Envoi...' : 'Envoyer la demande d\'adhésion ➔'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateFoyerSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Nom de votre famille / foyer
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Famille Martin"
                  value={foyerNameInput}
                  onChange={(e) => setFoyerNameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Votre nom d'affichage (Chef de famille)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Papa, Jean..."
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3.5 rounded-xl bg-[#00D26A] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md shadow-[#00D26A]/15"
              >
                {actionLoading ? 'Création...' : 'Créer le foyer et devenir Chef ➔'}
              </button>
            </form>
          )}

          {/* Standard Log Out Button when No Foyer */}
          {onLogout && (
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={onLogout}
                className="w-full py-3 px-4 rounded-[22px] bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/15 border border-[#FF4D6D]/20 text-[#FF4D6D] text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4 text-[#FF4D6D]" />
                <span>Se déconnecter de mon compte</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Members List */}
        <div className="space-y-3">
          {/* Pending Members Section */}
          {pendingMembers.length > 0 && (
            <div className="space-y-2 mb-4 animate-fade-in bg-yellow-500/5 p-4 rounded-3xl border border-yellow-500/20 shadow-inner">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                <span>Demandes d'adhésion en attente ({pendingMembers.length})</span>
              </h2>
              <div className="space-y-2 pt-1">
                {pendingMembers.map((member) => {
                  const isManagingAllowed = myMemberProfile?.role === 'admin' || myMemberProfile?.role === 'parent';
                  return (
                    <div 
                      key={member.id}
                      className="w-full glass-panel rounded-2xl p-3 flex items-center justify-between border border-white/5 bg-white/2"
                    >
                      <div className="flex items-center space-x-3">
                        <img 
                          src={member.photoUrl} 
                          alt={member.name} 
                          className="w-9 h-9 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <h3 className="text-xs font-bold text-white">{member.name}</h3>
                          <p className="text-[9px] text-white/40">Rôle : {member.role}</p>
                        </div>
                      </div>
                      
                      {isManagingAllowed ? (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const roleInput = prompt(
                                `Approuver la demande de ${member.name}.\n\nQuel rôle souhaitez-vous lui attribuer ?\n- parent : Droits d'écriture complets\n- child : Enfant (droits restreints)\n- guest : Invité (lecture seule)\n- admin : Co-administrateur`,
                                member.role || 'child'
                              );
                              if (roleInput === null) return; // Annulé
                              
                              const finalRole = roleInput.trim().toLowerCase() as any;
                              if (!['admin', 'parent', 'child', 'guest'].includes(finalRole)) {
                                alert("Rôle invalide. Les rôles valides sont : admin, parent, child, guest");
                                return;
                              }

                              try {
                                await foyerService.approveMember(member.id, finalRole);
                                setMembers(prev => prev.map(m => m.id === member.id ? { ...m, approved: true, role: finalRole } : m));
                                alert(`🎉 L'adhésion de ${member.name} a été approuvée avec le rôle : ${finalRole} !`);
                              } catch (err: any) {
                                alert(`Erreur d'approbation : ${err.message}`);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-all cursor-pointer flex items-center justify-center"
                            title="Accepter"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Refuser la demande de ${member.name} ?`)) {
                                try {
                                  await foyerService.removeMember(member.id);
                                  setMembers(prev => prev.filter(m => m.id !== member.id));
                                } catch (err: any) {
                                  alert(`Erreur de suppression : ${err.message}`);
                                }
                              }
                            }}
                            className="p-1.5 rounded-lg bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/20 text-[#FF4D6D] border border-[#FF4D6D]/20 transition-all cursor-pointer flex items-center justify-center"
                            title="Refuser"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[8px] bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 px-2 py-0.5 rounded-full font-bold">
                          En attente
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approved Members List */}
          {approvedMembers.map((member) => (
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
              onClick={handleAddMemberClick}
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

          {/* Foyer Settings Actions */}
          <div className="pt-6 border-t border-white/5 space-y-3">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest block font-sans">
              Gestion du Foyer & Connexion
            </h4>
            
            {onLeaveFoyer && (
              <button
                onClick={onLeaveFoyer}
                className="w-full py-3.5 px-4 rounded-[22px] bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/20 text-yellow-500 text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4 text-yellow-500" />
                <span>Quitter ce Foyer / Rejoindre une autre famille</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full py-3.5 px-4 rounded-[22px] bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/15 border border-[#FF4D6D]/20 text-[#FF4D6D] text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4 text-[#FF4D6D]" />
                <span>Se déconnecter de mon compte</span>
              </button>
            )}
          </div>
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
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Rôle / Droits dans la famille</label>
                    <select
                      value={
                        editRole === 'Chef de famille' || editRole === 'Chef de famille (Admin)' || editRole === 'admin' ? 'admin' :
                        editRole === 'Gestionnaire' || editRole === 'Gestionnaire / Parent' || editRole === 'parent' ? 'parent' :
                        editRole === 'Enfant' || editRole === 'child' ? 'child' :
                        'guest'
                      }
                      onChange={(e) => setEditRole(e.target.value)}
                      disabled={savingProfile}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] disabled:opacity-50"
                    >
                      <option value="admin">Chef de famille (Admin) 👑</option>
                      <option value="parent">Gestionnaire / Parent (Écriture complète) 👨‍👩‍👧</option>
                      <option value="child">Enfant (Droits d'écriture restreints) 🧒</option>
                      <option value="guest">Invité (Lecture seule) 👥</option>
                    </select>

                    {(editRole === 'child' || editRole === 'Enfant') && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-white/3 border border-[#6C5CFF]/20 flex items-center justify-between animate-fade-in">
                        <div>
                          <span className="text-[10px] font-extrabold text-white block">🔓 Dérogation Spéciale Enfant</span>
                          <span className="text-[8.5px] text-white/50 block mt-0.5 max-w-[200px]">Autoriser l'écriture sur les listes de courses, agenda et tâches ménagères.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={editHasExemption}
                            onChange={(e) => setEditHasExemption(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00D26A]"></div>
                        </label>
                      </div>
                    )}
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
                      disabled={savingProfile}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/5 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit" 
                      disabled={savingProfile}
                      className="flex-1 py-2.5 rounded-xl bg-[#6C5CFF] text-white font-semibold text-xs shadow-md disabled:opacity-50 flex items-center justify-center space-x-1.5"
                    >
                      {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>

                  {/* Profile Deletion (Only for parents, preventing self-deletion) */}
                  {!isChild && selectedMember.id !== activeMemberId && (
                    <button 
                      type="button" 
                      onClick={async () => {
                        if (window.confirm(`🚨 Êtes-vous ABSOLUMENT sûr de vouloir retirer le profil de ${selectedMember.name} de votre famille ? Cette action effacera définitivement ses données.`)) {
                          try {
                            if (foyer) {
                              await foyerService.removeMember(selectedMember.id);
                            }
                            setMembers(prev => prev.filter(m => m.id !== selectedMember.id));
                            setSelectedMember(null);
                            setIsEditing(false);
                            alert(`🗑️ Profil de ${selectedMember.name} retiré avec succès !`);
                          } catch (err: any) {
                            console.error("Erreur lors du retrait du membre :", err);
                            alert(`Impossible de retirer le membre du cloud : ${err.message || err}`);
                          }
                        }
                      }}
                      className="w-full mt-2 py-3 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 text-[#FF4D6D] hover:bg-[#FF4D6D]/20 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer text-center block"
                    >
                      Retirer de la famille 🗑️
                    </button>
                  )}
                </form>
              ) : (
                /* Dossier Content */
                <>
                  {/* Photo & Identity Heading */}
                  <div className="flex flex-col items-center text-center space-y-2 pt-4">
                    <div className="relative group">
                      <img 
                        src={selectedMember.photoUrl} 
                        alt={selectedMember.name} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-[#6C5CFF]/20"
                      />
                      <label
                        className="absolute -bottom-1.5 -left-1.5 p-2 rounded-full bg-[#00D26A] text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center"
                        title="Téléverser une photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedAvatar('');
                          setAvatarDesc('');
                          setShowAvatarGenerator(!showAvatarGenerator);
                        }}
                        className="absolute -bottom-1.5 -right-1.5 p-2 rounded-full bg-[#6C5CFF] text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                        title="Générer un avatar IA"
                      >
                        <span className="text-xs">🪄</span>
                      </button>
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-white flex items-center justify-center space-x-1.5">
                        <span>{selectedMember.name}</span>
                      </h2>
                      <p className="text-xs text-[#4F8CFF] font-semibold">{selectedMember.role}</p>
                    </div>
                  </div>

                  {/* GENERATIVE AI AVATAR CONFIGURATION PANEL */}
                  {showAvatarGenerator && (
                    <div className="p-5 rounded-[24px] bg-slate-900/90 border border-[#6C5CFF]/30 space-y-4 animate-scale-up">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-[10px] font-black text-[#6C5CFF] uppercase tracking-widest block font-sans">
                          Générateur d'Avatars IA Premium
                        </span>
                        <button
                          onClick={() => setShowAvatarGenerator(false)}
                          className="text-white/40 hover:text-white text-xs font-bold font-sans cursor-pointer"
                        >
                          Fermer
                        </button>
                      </div>

                      {generatingAvatar ? (
                        <div className="py-6 text-center space-y-3">
                          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-[#6C5CFF]/20 border-t-[#6C5CFF] animate-spin"></div>
                            <span className="text-xl animate-bounce">🎨</span>
                          </div>
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider font-sans">
                            {avatarStep === 1 ? "Séchage de la peinture d'avatar..." : 
                             avatarStep === 2 ? "Ajustement de l'éclat des yeux..." : 
                             "Stable Diffusion sculpte l'avatar..."}
                          </p>
                        </div>
                      ) : generatedAvatar ? (
                        <div className="space-y-4 text-center">
                          <img 
                            src={generatedAvatar} 
                            alt="Generated Avatar" 
                            className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-[#00D26A]"
                          />
                          <p className="text-[10px] text-white/50 leading-relaxed font-sans max-w-xs mx-auto">
                            Votre avatar d'IA personnalisé est prêt à embellir votre profil !
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setGeneratedAvatar('')}
                              className="flex-1 py-2.5 rounded-xl bg-white/5 text-white border border-white/8 text-[10px] font-bold cursor-pointer transition-all hover:bg-white/8"
                            >
                              Recommencer ↺
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  if (foyer) {
                                    await foyerService.updateMemberProfile(selectedMember.id, {
                                      photoUrl: generatedAvatar
                                    });
                                  }
                                  if (onUpdateMemberProfile) {
                                    onUpdateMemberProfile(selectedMember.id, { photoUrl: generatedAvatar });
                                  }
                                  // Mettre à jour le membre dans le state global
                                  setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, photoUrl: generatedAvatar } : m));
                                  // Mettre à jour l'entité locale
                                  setSelectedMember(prev => prev ? { ...prev, photoUrl: generatedAvatar } : null);
                                  setShowAvatarGenerator(false);
                                  alert("🎉 Photo de profil IA mise à jour et sauvegardée avec succès ! ✨");
                                } catch (err: any) {
                                  console.error("Erreur lors de la sauvegarde de l'avatar :", err);
                                  alert(`Impossible de sauvegarder la photo dans le cloud : ${err.message || err}`);
                                }
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-[#00D26A] text-white text-[10px] font-extrabold shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                            >
                              Appliquer l'Avatar ✅
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5 text-left">
                          
                          {/* Style Grid */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">1. Style Artistique</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[
                                { id: 'pixar', label: 'Pixar 3D', icon: '🧸' },
                                { id: 'anime', label: 'Anime', icon: '🌸' },
                                { id: 'fantasy', label: 'Fantasy', icon: '⚔️' },
                                { id: 'pixel', label: 'Pixel Art', icon: '👾' }
                              ].map(st => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => setAvatarStyle(st.id as any)}
                                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                    avatarStyle === st.id 
                                      ? 'border-[#6C5CFF] bg-[#6C5CFF]/10 text-white' 
                                      : 'border-white/5 bg-white/3 text-white/40 hover:text-white/60'
                                  }`}
                                >
                                  <span className="text-base block mb-0.5">{st.icon}</span>
                                  <span className="text-[7.5px] font-black uppercase font-sans tracking-tight block truncate">{st.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Traits Description */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">2. Traits physiques ou humeur</label>
                            <input 
                              type="text"
                              value={avatarDesc}
                              onChange={(e) => setAvatarDesc(e.target.value)}
                              placeholder="ex: souriant, cheveux bouclés bruns, yeux marrons, t-shirt bleu..."
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF] font-sans font-medium"
                            />
                          </div>

                          {/* Trigger Generation */}
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratingAvatar(true);
                              setAvatarStep(1);
                              
                              let stylePrompt = '';
                              if (avatarStyle === 'pixar') {
                                stylePrompt = 'highly detailed 3D Pixar disney character profile portrait, cute stylized rendering, glowing soft studio lighting, vibrantly colored background';
                              } else if (avatarStyle === 'anime') {
                                stylePrompt = 'modern bright anime character portrait, stunning studio ghibli illustration style, sparkling colorful details, clean lines';
                              } else if (avatarStyle === 'fantasy') {
                                stylePrompt = 'magical heroic fantasy wizard knight character portrait, glowing magic sparks, high fantasy oil painting book cover style';
                              } else {
                                stylePrompt = '16-bit cute retro pixel art profile icon, vibrant pixel colors, nostalgic game portrait';
                              }

                              const targetName = selectedMember.name;
                              const extraDesc = avatarDesc.trim() ? `, ${avatarDesc.trim()}` : '';
                              const finalPrompt = encodeURIComponent(`headshot profile avatar of a child named ${targetName}${extraDesc}, cute face, ${stylePrompt}, square avatar shape`);
                              const seed = Math.floor(Math.random() * 1000000);
                              const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=500&height=500&nologo=true&seed=${seed}`;

                              setTimeout(() => {
                                setAvatarStep(2);
                                setTimeout(() => {
                                  setAvatarStep(3);
                                  
                                  const img = new Image();
                                  img.src = generatedUrl;
                                  img.onload = () => {
                                    setGeneratedAvatar(generatedUrl);
                                    setGeneratingAvatar(false);
                                  };
                                  img.onerror = () => {
                                    // Fallback standard
                                    setGeneratedAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${targetName}`);
                                    setGeneratingAvatar(false);
                                  };
                                }, 1200);
                              }, 1200);
                            }}
                            className="w-full py-3 rounded-xl bg-[#6C5CFF] text-white font-extrabold text-[10px] uppercase tracking-wider cursor-pointer shadow-md hover:scale-103 active:scale-97 transition-all flex items-center justify-center space-x-1.5"
                          >
                            <span>🪄 Peindre mon Avatar par IA</span>
                          </button>

                        </div>
                      )}
                    </div>
                  )}

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

                        {/* Unification: Lien direct vers le carnet de santé complet */}
                        <div className="pt-4 border-t border-white/5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (setActiveTab && setActiveModule) {
                                localStorage.setItem('mf_selected_health_member_id', selectedMember.id);
                                setActiveTab('menu');
                                setActiveModule('sante');
                              } else {
                                alert("Redirection vers le carnet de santé...");
                              }
                            }}
                            className="w-full py-4 rounded-[22px] bg-gradient-to-r from-[#FF4D6D] to-[#FF4D6D]/80 text-white font-extrabold text-[10px] uppercase tracking-widest shadow-lg shadow-[#FF4D6D]/15 hover:scale-102 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Activity className="w-4 h-4 text-white animate-pulse" />
                            <span>Carnet Santé & Suivi Croissance ➔</span>
                          </button>
                          <p className="text-[9px] text-white/40 mt-2 italic">
                            Accédez aux courbes de croissance dynamiques, suivi vaccinal et historique des soins de {selectedMember.name}.
                          </p>
                        </div>

                        {/* Bouton d'accès rapide pour ajouter un membre depuis la fiche du chef de famille */}
                        {!isChild && (selectedMember.role === 'admin' || selectedMember.role === 'Chef de famille' || selectedMember.role === 'Chef de famille (Admin)') && (
                          <div className="pt-4 border-t border-white/5 space-y-3">
                            <div className="p-4 rounded-[22px] bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 space-y-2">
                              <p className="text-[10px] text-white/60 leading-normal">
                                En tant que Chef de famille, vous pouvez configurer de nouveaux profils ou inviter vos proches à rejoindre votre foyer.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingMember(true);
                                  setSelectedMember(null);
                                  setIsEditing(false);
                                }}
                                className="w-full py-3 rounded-xl bg-[#6C5CFF] text-white font-extrabold text-[10px] uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer text-center block shadow-md shadow-[#6C5CFF]/15"
                              >
                                Ajouter un membre à la famille ➕
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                  </div>
                </>
              )}
            </>
          ) : isAddingMember ? (
            /* Unified Add & Invite Member Panel */
            <div className="glass-panel rounded-[32px] border border-white/10 p-5 space-y-6 animate-scale-up">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Ajouter un Membre</h3>
                  <p className="text-[10px] text-white/40 mt-0.5">Configurez un nouveau profil ou invitez un proche.</p>
                </div>
                <button 
                  onClick={() => setIsAddingMember(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs Switcher */}
              <div className="flex p-1 rounded-2xl bg-black/20 border border-white/5">
                <button
                  type="button"
                  onClick={() => setAddingTab('create')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    addingTab === 'create' 
                      ? 'bg-[#6C5CFF] text-white shadow-md shadow-[#6C5CFF]/15' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Créer un Profil 🧒
                </button>
                {foyer && (
                  <button
                    type="button"
                    onClick={() => setAddingTab('invite')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      addingTab === 'invite' 
                        ? 'bg-[#6C5CFF] text-white shadow-md shadow-[#6C5CFF]/15' 
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    Inviter par Code/Mail ✉️
                  </button>
                )}
              </div>

              {addingTab === 'create' ? (
                /* CREATE LOCAL/IA PROFILE FORM */
                <form onSubmit={handleCreateMemberSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Nom complet</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Ibrahima" 
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Rôle / Droits</label>
                      <select 
                        value={addRole}
                        onChange={(e) => setAddRole(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                      >
                        <option value="parent">Gestionnaire / Parent 👨‍👩‍👧</option>
                        <option value="child">Enfant 🧒</option>
                        <option value="guest">Invité (Lecture seule) 👥</option>
                      </select>
                    </div>
                  </div>

                  {addRole === 'child' && (
                    <div className="p-3 rounded-2xl bg-[#6C5CFF]/5 border border-[#6C5CFF]/20 flex items-center justify-between animate-fade-in">
                      <div>
                        <span className="text-[10px] font-extrabold text-white block">🔓 Dérogation parentale d'écriture</span>
                        <span className="text-[8.5px] text-white/50 block mt-0.5 max-w-[200px]">Autorise cet enfant à modifier les courses, agenda et tâches ménagères.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={addHasExemption}
                          onChange={(e) => setAddHasExemption(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00D26A]"></div>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Date de naissance</label>
                      <input 
                        type="text" 
                        placeholder="JJ/MM/AAAA" 
                        value={addBirth}
                        onChange={(e) => setAddBirth(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Âge</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 8 ans, 38 ans..." 
                        value={addAge}
                        onChange={(e) => setAddAge(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Établissement (École / Employeur)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: École Primaire Condorcet" 
                      value={addSchool}
                      onChange={(e) => setAddSchool(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
                    />
                  </div>

                  {/* Medical Quick info */}
                  <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Informations Médicales</span>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Groupe Sanguin</label>
                        <select 
                          value={addBlood}
                          onChange={(e) => setAddBlood(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
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
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Allergies</label>
                        <input 
                          type="text" 
                          placeholder="Pénicilline, arachides..." 
                          value={addAllergies}
                          onChange={(e) => setAddAllergies(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={submittingAdd}
                    className="w-full py-3.5 rounded-2xl bg-[#6C5CFF] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#6C5CFF]/15 hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{submittingAdd ? 'Création en cours...' : 'Créer la Fiche Membre ✅'}</span>
                  </button>
                </form>
              ) : (
                /* INVITATION METHOD FOR CLOUD FOYER */
                foyer && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Share Invitation Code */}
                    <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-2">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">1. Partager le Code Unique</span>
                      <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                        Donnez ce code de foyer à vos proches. Ils pourront le saisir lors de leur inscription pour rejoindre instantanément votre foyer.
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyInviteCode}
                        className="w-full mt-1.5 py-3 px-4 rounded-xl bg-white/5 border border-white/8 text-white text-xs font-bold flex items-center justify-between hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
                      >
                        <div className="text-left font-sans">
                          <span className="text-[8px] text-white/40 block font-normal uppercase">Code à 6 caractères</span>
                          <span className="font-mono text-sm font-black text-[#6C5CFF] block mt-0.5">{foyer.inviteCode}</span>
                        </div>
                        {copiedCode ? (
                          <span className="text-[9px] font-bold text-[#00D26A] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Copié
                          </span>
                        ) : (
                          <span className="text-[9px] text-white/40 flex items-center gap-1 font-bold">
                            <Copy className="w-3.5 h-3.5" /> Copier
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Email Invitation Form */}
                    <form onSubmit={handleSendInvite} className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-3.5">
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">2. Envoyer par e-mail</span>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Adresse e-mail de l'invité</label>
                        <input
                          type="email"
                          required
                          placeholder="ex: epouse@gmail.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Rôle assigné</label>
                        <select
                          value={inviteRole}
                          onChange={(e: any) => setInviteRole(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                        >
                          <option value="parent">Parent / Co-gestionnaire 👨‍👩‍👧</option>
                          <option value="child">Enfant 🧒</option>
                          <option value="guest">Invité (Lecture seule) 👥</option>
                        </select>
                      </div>

                      {inviteMessage && (
                        <div className={`p-2.5 rounded-xl border text-[10px] font-medium leading-normal ${
                          inviteMessage.type === 'success' ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {inviteMessage.text}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={inviteLoading}
                        className="w-full py-3 rounded-xl bg-[#6C5CFF] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md shadow-[#6C5CFF]/15"
                      >
                        {inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation ✉️'}
                      </button>
                    </form>
                  </div>
                )
              )}
            </div>
          ) : (
            /* No selected member view */
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-4 space-y-4">
              <div className="p-4 rounded-full bg-white/5 border border-white/5 text-white/20">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sélectionnez un membre</h3>
                <p className="text-xs text-white/40 max-w-[250px] mt-1 mx-auto leading-relaxed">
                  Cliquez sur un profil familial pour ouvrir son coffre-fort d'identité sécurisé ou cliquez sur + pour en ajouter un.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

    </div>
  );
};
