/* eslint-disable @typescript-eslint/no-explicit-any -- legacy Supabase and module payloads still use broad shapes; tracked in docs/lint_cleanup_remaining.md */
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
  LogOut,
  Link,
  CheckCircle2
} from 'lucide-react';
import { foyerService } from '../services/foyerService';
import { getSupabaseClient } from '../utils/supabase';
import { shouldBlockMemberAdd } from '../utils/premiumFeatures';
import { ALL_FAMILY_MODULES, getDefaultPermissions } from '../types';
import type { Member, Foyer, FoyerMember, MemberRole, ModulePermissions, FamilyModule } from '../types';

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
  memberPermissions?: Record<string, Record<FamilyModule, ModulePermissions>>;
  onUpdatePermissions?: (memberId: string, modulePermissions: Record<FamilyModule, ModulePermissions>) => void;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
}

export const Membres: React.FC<MembresProps> = ({ 
  members, 
  setMembers,
  onAddMember,
  onUpdateMemberProfile,
  activeMemberId = '1',
  foyer,
  myMemberProfile,
  setActiveTab,
  setActiveModule,
  onLogout,
  onLeaveFoyer,
  memberPermissions,
  onUpdatePermissions,
  isPremium = false,
  onTriggerPaywall
}) => {
  // Invitation réelle & Ajout unifié
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addingTab, setAddingTab] = useState<'create' | 'invite'>('create');

  // Approval states
  const [memberToApprove, setMemberToApprove] = useState<Member | null>(null);
  const [approveRole, setApproveRole] = useState<string>('enfant');
  const [approveHasExemption, setApproveHasExemption] = useState(false);

  // Family join requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Load pending join requests when foyer changes
  React.useEffect(() => {
    if (foyer) {
      foyerService.getPendingJoinRequests(foyer.id).then((reqs: any) => {
        queueMicrotask(() => setPendingRequests(reqs));
      }).catch(err => {
        console.error("Failed to fetch pending join requests:", err);
      });
    } else {
      queueMicrotask(() => setPendingRequests([]));
    }
  }, [foyer]);

  // No-foyer state variables
  const [noFoyerAction, setNoFoyerAction] = useState<'join' | 'create'>('join');
  const [foyerNameInput, setFoyerNameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState(myMemberProfile?.displayName || '');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Create form states
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<string>('enfant');
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
  const [inviteRole, setInviteRole] = useState<string>('enfant');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const blockFreeMemberLimit = () => {
    if (!shouldBlockMemberAdd(isPremium, members.length)) return false;
    onTriggerPaywall?.();
    return true;
  };

  const handleAddMemberClick = () => {
    if (blockFreeMemberLimit()) return;
    setSelectedMember(null);
    setIsEditing(false);
    setIsAddingMember(true);
  };

  const handleCreateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddMember) return;
    if (blockFreeMemberLimit()) return;
    setSubmittingAdd(true);
    try {
      const dbRole: MemberRole = 
        addRole === 'chef_famille' ? 'admin' :
        ['parent', 'gestionnaire', 'adulte'].includes(addRole) ? 'parent' :
        ['adolescent', 'enfant'].includes(addRole) ? 'child' :
        'guest';

      const bloodGroupWithRole = `ROLE:${addRole}|${addBlood}|${addPhone}`;

      const newMemberPayload = {
        name: addName.trim(),
        role: dbRole,
        age: addAge.trim() || 'Nouveau',
        birthDate: addBirth.trim() || 'Inconnue',
        bloodGroup: bloodGroupWithRole,
        allergies: addAllergies.trim() ? addAllergies.split(',').map(a => a.trim()) : ['Aucune'],
        treatments: addTreatments.trim() ? addTreatments.split(',').map(t => t.trim()) : ['Aucun'],
        schoolOrEmployer: addSchool.trim() || 'Non renseigné',
        emergencyContact: {
          name: addEmergencyName.trim() || 'Contact parent',
          phone: addEmergencyPhone.trim() || '',
          relation: addEmergencyRelation.trim() || 'Mère'
        },
        hasExemption: dbRole === 'child' ? addHasExemption : false
      };

      await onAddMember(newMemberPayload);

      // Reset form states
      setAddName('');
      setAddRole('enfant');
      setAddAge('');
      setAddBirth('');
      setAddBlood('A+');
      setAddPhone('');
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
    if (blockFreeMemberLimit()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const dbRole: any = 
        inviteRole === 'chef_famille' ? 'admin' :
        ['parent', 'gestionnaire', 'adulte'].includes(inviteRole) ? 'parent' :
        ['adolescent', 'enfant'].includes(inviteRole) ? 'child' :
        'guest';
      await foyerService.inviteByEmail(foyer.id, inviteEmail.trim(), dbRole);
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
  const [editPhone, setEditPhone] = useState('');
  const [addPhone, setAddPhone] = useState('');

  const convertToYYYYMMDD = (dateStr: string): string => {
    if (!dateStr) return '';
    const partsSlash = dateStr.split('/');
    if (partsSlash.length === 3) {
      if (partsSlash[2].length === 4) { // DD/MM/YYYY
        return `${partsSlash[2]}-${partsSlash[1].padStart(2, '0')}-${partsSlash[0].padStart(2, '0')}`;
      }
    }
    const partsDash = dateStr.split('-');
    if (partsDash.length === 3) {
      if (partsDash[2].length === 4) { // DD-MM-YYYY
        return `${partsDash[2]}-${partsDash[1].padStart(2, '0')}-${partsDash[0].padStart(2, '0')}`;
      }
      return dateStr; // Already YYYY-MM-DD
    }
    return dateStr;
  };

  const handleBirthDateChange = (dateVal: string, isEditingForm: boolean) => {
    if (isEditingForm) {
      setEditBirth(dateVal);
    } else {
      setAddBirth(dateVal);
    }

    if (!dateVal) return;

    try {
      const birth = new Date(dateVal);
      if (isNaN(birth.getTime())) return;

      const today = new Date();
      let ageYears = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        ageYears--;
      }

      const ageStr = ageYears === 0 ? "Bébé" : ageYears === 1 ? "1 an" : `${ageYears} ans`;
      
      // Suggest role
      let suggestedRole = 'enfant';
      if (ageYears >= 18) {
        suggestedRole = 'parent'; // Adulte (Default to Parent / Gestionnaire)
      } else if (ageYears >= 11) {
        suggestedRole = 'adolescent';
      }

      if (isEditingForm) {
        setEditAge(ageStr);
        setEditRole(suggestedRole);
      } else {
        setAddAge(ageStr);
        setAddRole(suggestedRole);
      }
    } catch (e) {
      console.warn("Failed to calculate age from birthdate:", e);
    }
  };

  const openDossier = (member: Member) => {
    setSelectedMember(member);
    setIsEditing(false);
    setIsAddingMember(false);
  };

  const handleEditClick = (member: Member) => {
    setEditName(member.name);
    
    // map friendly role back to precise role key
    const friendly = member.role || '';
    let precise = 'enfant';
    if (friendly.includes('Chef')) precise = 'chef_famille';
    else if (friendly.includes('Gestionnaire')) precise = 'gestionnaire';
    else if (friendly.includes('adulte') || friendly.includes('Adulte')) precise = 'adulte';
    else if (friendly.includes('Parent')) precise = 'parent';
    else if (friendly.includes('Adolescent')) precise = 'adolescent';
    else if (friendly.includes('Enfant')) precise = 'enfant';
    else if (friendly.includes('Invité') || friendly.includes('invite')) precise = 'invite';
    
    setEditRole(precise);
    setEditAge(member.age);
    setEditBirth(convertToYYYYMMDD(member.birthDate));
    setEditBlood(member.bloodGroup);
    setEditSchool(member.schoolOrEmployer);
    setEditHasExemption(!!member.hasExemption);
    setEditPhone(member.phone || '');
    setIsEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setSavingProfile(true);
    try {
      // Map precise UI roles to database-compatible roles
      const dbRole: MemberRole = 
        editRole === 'chef_famille' ? 'admin' :
        ['parent', 'gestionnaire', 'adulte'].includes(editRole) ? 'parent' :
        ['adolescent', 'enfant'].includes(editRole) ? 'child' :
        'guest';

      const friendlyUIRole = 
        editRole === 'chef_famille' ? 'Chef de famille' :
        editRole === 'parent' ? 'Parent' :
        editRole === 'gestionnaire' ? 'Gestionnaire' :
        editRole === 'adulte' ? 'Membre adulte' :
        editRole === 'adolescent' ? 'Adolescent' :
        editRole === 'enfant' ? 'Enfant' :
        'Invité';

      // Encode precise role inside bloodGroup
      const bloodGroupWithRole = `ROLE:${editRole}|${editBlood}|${editPhone}`;

      const updates = {
        displayName: editName.trim(),
        role: dbRole,
        age: editAge.trim(),
        birthDate: editBirth.trim(),
        bloodGroup: bloodGroupWithRole,
        schoolOrEmployer: editSchool.trim(),
        hasExemption: dbRole === 'child' ? editHasExemption : false
      };

      // Transfer of ownership flow
      let isTransferringOwnership = false;
      if (dbRole === 'admin' && selectedMember.role !== 'Chef de famille' && selectedMember.role !== 'admin') {
        const confirmTransfer = window.confirm(
          `👑 TRANSFERT DE PROPRIÉTÉ\n\nÊtes-vous ABSOLUMENT sûr de vouloir transférer la propriété du foyer à ${editName.trim()} ?\n\nVous serez immédiatement rétrogradé au rôle de 'Gestionnaire / Parent' et perdrez le contrôle exclusif de l'administration du foyer.`
        );
        if (!confirmTransfer) {
          setSavingProfile(false);
          return;
        }
        isTransferringOwnership = true;
      }

      if (isTransferringOwnership) {
        const client = getSupabaseClient();
        if (client && foyer) {
          // 1. Promouvoir le membre sélectionné en admin
          await client.from('foyer_members').update(updates).eq('id', selectedMember.id);
          // 2. Rétrograder l'admin actuel en parent
          await client.from('foyer_members').update({ role: 'parent' }).eq('id', activeMemberId);
          // 3. Mettre à jour created_by sur le foyer
          if (selectedMember.userId) {
            await client.from('foyers').update({ created_by: selectedMember.userId }).eq('id', foyer.id);
          }
        }

        if (onUpdateMemberProfile) {
          onUpdateMemberProfile(selectedMember.id, updates);
          onUpdateMemberProfile(activeMemberId, { role: 'parent' });
        }
      } else {
        if (foyer) {
          // Persist to Supabase Cloud Foyer
          await foyerService.updateMemberProfile(selectedMember.id, updates);
        }

        if (onUpdateMemberProfile) {
          onUpdateMemberProfile(selectedMember.id, updates);
        }
      }

      setMembers(prev => prev.map(m => {
        if (m.id === selectedMember.id) {
          const updated = {
            ...m,
            name: editName.trim(),
            role: friendlyUIRole,
            age: editAge.trim(),
            birthDate: editBirth.trim(),
            bloodGroup: editBlood, // store raw blood group locally
            schoolOrEmployer: editSchool.trim(),
            hasExemption: dbRole === 'child' ? editHasExemption : false,
            phone: editPhone.trim()
          };
          setSelectedMember(updated);
          return updated;
        }
        if (isTransferringOwnership && m.id === activeMemberId) {
          return {
            ...m,
            role: 'Gestionnaire'
          };
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
      const supabase = getSupabaseClient();
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const email = session?.user?.email || '';
      const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayNameInput.trim()}`;
      
      const data = await foyerService.sendJoinRequest(
        inviteCodeInput.trim(), 
        displayNameInput.trim(), 
        email, 
        avatar,
        false
      );
      alert(`🎉 Demande envoyée ! Le Chef de famille du foyer "${data.familyName}" doit maintenant valider votre demande.`);
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
                  placeholder="Ex: Parent, Marie..."
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
                  placeholder="Ex: Parent, Jean..."
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
          {/* Section: Demandes d'adhésion */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3 mb-4 animate-fade-in bg-yellow-500/5 p-4 rounded-3xl border border-yellow-500/20 shadow-inner">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                <span>Demandes d'adhésion ({pendingRequests.length})</span>
              </h2>
              <div className="space-y-2 pt-1">
                {pendingRequests.map((req) => {
                  return (
                    <button 
                      key={req.id}
                      onClick={() => {
                        setSelectedRequest(req);
                        setSelectedMember(null);
                        setMemberToApprove(null);
                        setIsAddingMember(false);
                        setIsEditing(false);
                      }}
                      className={`w-full glass-panel rounded-2xl p-4 flex items-center justify-between border transition-all text-left ${
                        selectedRequest?.id === req.id 
                          ? 'border-[#6C5CFF] bg-[#6C5CFF]/5 shadow-[0_0_15px_rgba(108,92,255,0.15)]' 
                          : 'border-white/5 bg-white/2 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img 
                          src={req.applicantAvatar} 
                          alt={req.applicantName} 
                          className="w-10 h-10 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <h3 className="text-xs font-bold text-white">
                            <span className="text-[#6C5CFF]">{req.applicantName}</span> souhaite rejoindre
                          </h3>
                          <p className="text-[9px] text-white/40 font-medium">Demandé le {new Date(req.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/40" />
                    </button>
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
                {(selectedMember.id === activeMemberId || (!isChild && (selectedMember.role !== 'Chef de famille' || myMemberProfile?.role === 'admin'))) && (
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
                      value={editRole}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setEditRole(newRole);
                        if (onUpdatePermissions) {
                          onUpdatePermissions(selectedMember.id, getDefaultPermissions(newRole));
                        }
                      }}
                      disabled={savingProfile}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] disabled:opacity-50"
                    >
                      {(!myMemberProfile || myMemberProfile.role === 'admin') && (
                        <option value="chef_famille">👑 Chef de famille (Admin)</option>
                      )}
                      <option value="parent">👨 Parent</option>
                      <option value="gestionnaire">⚙️ Gestionnaire</option>
                      <option value="adulte">🧑 Membre adulte (18 ans et +)</option>
                      <option value="adolescent">👦 Adolescent (11-17 ans)</option>
                      <option value="enfant">🧒 Enfant (-11 ans)</option>
                      <option value="invite">👤 Invité</option>
                    </select>

                    {(editRole === 'enfant' || editRole === 'adolescent' || editRole === 'child') && (
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
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Date de naissance</label>
                      <input 
                        type="date" 
                        value={editBirth}
                        onChange={(e) => handleBirthDateChange(e.target.value, true)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Âge</label>
                      <input 
                        type="text" 
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Numéro de téléphone (Optionnel)</label>
                    <input 
                      type="tel" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Ex: +33 6 12 34 56 78"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                    />
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

                  {/* Droits & Permissions par Module */}
                  {(!myMemberProfile || ['admin', 'parent'].includes(myMemberProfile.role)) && (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">🔒 Droits & Permissions par Module</h4>
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdatePermissions) {
                              const defaults = getDefaultPermissions(editRole);
                              onUpdatePermissions(selectedMember.id, defaults);
                            }
                          }}
                          className="text-[9px] font-bold text-[#6C5CFF] hover:underline"
                        >
                          Réinitialiser par défaut
                        </button>
                      </div>
                      
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 select-none">
                        {ALL_FAMILY_MODULES.map((modName) => {
                          const modPerms = (memberPermissions?.[selectedMember.id]?.[modName]) || getDefaultPermissions(editRole)[modName];
                          
                          const togglePerm = (permKey: keyof ModulePermissions) => {
                            if (!onUpdatePermissions) return;
                            const currentMemberPerms = memberPermissions?.[selectedMember.id] || getDefaultPermissions(editRole);
                            const updatedMemberPerms = {
                              ...currentMemberPerms,
                              [modName]: {
                                ...currentMemberPerms[modName],
                                [permKey]: !modPerms[permKey]
                              }
                            };
                            onUpdatePermissions(selectedMember.id, updatedMemberPerms);
                          };

                          const moduleLabel = 
                            modName === 'accueil' ? '🏠 Accueil' :
                            modName === 'timeline' ? '🕒 Timeline' :
                            modName === 'budget' ? '💰 Budget' :
                            modName === 'agenda' ? '📅 Agenda' :
                            modName === 'courses' ? '🛒 Courses' :
                            modName === 'sante' ? '🏥 Santé' :
                            modName === 'voyages' ? '✈️ Voyages' :
                            modName === 'documents' ? '📂 Documents' :
                            modName === 'vehicules' ? '🚗 Véhicules' :
                            modName === 'logement' ? '🏠 Logement' :
                            modName === 'animaux' ? '🐱 Animaux' :
                            modName === 'ecole' ? '🎒 École & Devoirs' :
                            modName === 'taches' ? '🧹 Tâches' :
                            modName === 'conseil_famille' ? '👥 Conseil de famille' :
                            modName === 'histoires_soir' ? '📖 Histoires du soir' :
                            modName === 'messagerie' ? '💬 Messagerie' :
                            modName === 'capsule_temporelle' ? '⏳ Capsule temporelle' :
                            modName === 'repertoire_important' ? '📞 Répertoire important' :
                            modName === 'peacemaker' ? '🕊️ PeaceMaker' :
                            modName === 'carte_familiale' ? '🗺️ Carte familiale' :
                            modName === 'menu_semaine' ? '🍳 Menu de la semaine' :
                            modName === 'demarches' ? '📋 Démarches' :
                            modName === 'notifications' ? '🔔 Notifications' :
                            modName === 'parametres' ? '⚙️ Paramètres' :
                            modName === 'micro' ? '🎤 Micro principal' :
                            modName === 'commune' ? '🏛️ Ma Commune' :
                            '🏫 Mon Établissement';

                          return (
                            <div key={modName} className="p-3 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white">{moduleLabel}</span>
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={!!modPerms.voir}
                                    onChange={() => togglePerm('voir')}
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#6C5CFF]"></div>
                                  <span className="text-[9px] text-white/50 ml-1.5 font-bold uppercase">Voir</span>
                                </label>
                              </div>
                              
                              {modPerms.voir && (
                                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                                  {[
                                    { key: 'ajouter' as const, label: 'Ajouter' },
                                    { key: 'modifier' as const, label: 'Modifier' },
                                    { key: 'supprimer' as const, label: 'Suppr' },
                                    { key: 'valider' as const, label: 'Valider' },
                                    { key: 'archiver' as const, label: 'Archiver' },
                                    { key: 'recevoir_notifications' as const, label: 'Notifs' }
                                  ].map((action) => (
                                    <label key={action.key} className="flex items-center space-x-1.5 cursor-pointer">
                                      <input 
                                        type="checkbox"
                                        checked={!!modPerms[action.key]}
                                        onChange={() => togglePerm(action.key)}
                                        className="rounded bg-white/5 border-white/10 text-[#6C5CFF] focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                                      />
                                      <span className="text-[9px] text-white/40 font-semibold">{action.label}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                  {!isChild && selectedMember.id !== activeMemberId && (selectedMember.role !== 'Chef de famille' || myMemberProfile?.role === 'admin') && (
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
                              
                              const stylePrompt = avatarStyle === 'pixar'
                                ? 'highly detailed 3D Pixar disney character profile portrait, cute stylized rendering, glowing soft studio lighting, vibrantly colored background'
                                : avatarStyle === 'anime'
                                  ? 'modern bright anime character portrait, stunning studio ghibli illustration style, sparkling colorful details, clean lines'
                                  : avatarStyle === 'fantasy'
                                    ? 'magical heroic fantasy wizard knight character portrait, glowing magic sparks, high fantasy oil painting book cover style'
                                    : '16-bit cute retro pixel art profile icon, vibrant pixel colors, nostalgic game portrait';

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

                      {selectedMember.phone && (
                        <div className="space-y-1 col-span-2 pt-1">
                          <div className="flex items-center space-x-1.5 text-white/40">
                            <PhoneCall className="w-3.5 h-3.5 text-[#00D26A]" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Téléphone</span>
                          </div>
                          <p className="text-xs font-semibold text-white">
                            <a href={`tel:${selectedMember.phone}`} className="hover:underline hover:text-[#6C5CFF] transition-colors">{selectedMember.phone}</a>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Section Liaison de compte pour le Chef de famille / Admin */}
                    {(myMemberProfile?.role === 'admin' || myMemberProfile?.role === 'chef_famille' || myMemberProfile?.role === 'parent') && foyer && (
                      <div className="space-y-3 pt-3 border-t border-white/5">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center space-x-1">
                          <Link className="w-3.5 h-3.5 text-[#6C5CFF]" />
                          <span>Liaison de compte</span>
                        </h4>
                        
                        {selectedMember.userId ? (
                          <div className="p-3 rounded-2xl bg-white/3 border border-white/5 flex flex-col space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-[#00D26A] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Compte utilisateur lié
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm("Voulez-vous vraiment délier ce compte ?")) {
                                    try {
                                      if (onUpdateMemberProfile) {
                                        await onUpdateMemberProfile(selectedMember.id, { userId: null as any });
                                      }
                                      setSelectedMember(prev => prev ? { ...prev, userId: undefined } : null);
                                      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, userId: undefined } : m));
                                      alert("Compte délié avec succès !");
                                    } catch (err: any) {
                                      alert("Erreur lors de la déliaison : " + err.message);
                                    }
                                  }
                                }}
                                className="text-[9px] font-bold text-[#FF4D6D] hover:underline cursor-pointer"
                              >
                                Délier
                              </button>
                            </div>
                            <p className="text-[9px] text-white/50 font-mono select-all truncate">
                              ID: {selectedMember.userId}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-2xl bg-white/3 border border-white/5 space-y-2">
                            <p className="text-[9.5px] text-white/50 leading-normal">
                              Associez ce profil local à un compte utilisateur Supabase (UUID ou e-mail).
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="UUID de l'utilisateur ou Email"
                                id="link-account-input"
                                className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] focus:outline-none focus:border-[#6C5CFF]"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const input = (document.getElementById('link-account-input') as HTMLInputElement)?.value?.trim();
                                  if (!input) return;
                                  
                                  // Valid UUID format check
                                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                  if (uuidRegex.test(input)) {
                                    try {
                                      if (onUpdateMemberProfile) {
                                        await onUpdateMemberProfile(selectedMember.id, { userId: input });
                                      }
                                      setSelectedMember(prev => prev ? { ...prev, userId: input } : null);
                                      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, userId: input } : m));
                                      alert("🎉 Compte lié avec succès !");
                                      (document.getElementById('link-account-input') as HTMLInputElement).value = '';
                                    } catch (err: any) {
                                      alert("Erreur lors de la liaison : " + err.message);
                                    }
                                  } else if (input.includes('@')) {
                                    alert("ℹ️ Par mesure de sécurité RGPD et restrictions techniques de Supabase, la liaison par e-mail requiert de saisir directement l'UUID de l'utilisateur. Veuillez demander à l'utilisateur de vous transmettre son ID unique (disponible dans ses paramètres de profil).");
                                  } else {
                                    alert("⚠️ Format invalide. Veuillez saisir un UUID utilisateur Supabase valide (ex: 123e4567-e89b-12d3-a456-426614174000).");
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#6C5CFF] text-white text-[10px] font-extrabold cursor-pointer hover:bg-[#5b4eff] transition-colors"
                              >
                                Lier
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
          ) : selectedRequest ? (
            /* Fiche de Demande d'Adhésion */
            <div className="space-y-6 animate-scale-up pt-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Fiche de Demande d'Adhésion</h3>
                  <p className="text-[10px] text-white/40 mt-0.5">Détails de la demande de participation au foyer.</p>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Avatar & Identity */}
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                <img 
                  src={selectedRequest.applicantAvatar} 
                  alt={selectedRequest.applicantName} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-[#6C5CFF]/20"
                />
                <div>
                  <h2 className="text-lg font-extrabold text-white">{selectedRequest.applicantName}</h2>
                  <p className="text-xs text-[#4F8CFF] font-semibold">Demandeur d'adhésion</p>
                </div>
              </div>

              {/* Information Cards */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Adresse Email</span>
                  <span className="text-xs font-semibold text-white select-all">{selectedRequest.applicantEmail}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date de la demande</span>
                  <span className="text-xs font-semibold text-white">
                    {new Date(selectedRequest.createdAt).toLocaleDateString('fr-FR')} à {new Date(selectedRequest.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Méthode de demande</span>
                  <span className="text-xs font-semibold text-white">
                    {selectedRequest.requestedByQr ? '🔗 QR Code d\'invitation' : '✏️ Saisie du code d\'invitation'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-white/5">
                <button
                  onClick={async () => {
                    if (confirm(`Refuser la demande de ${selectedRequest.applicantName} ?`)) {
                      try {
                        await foyerService.rejectJoinRequest(selectedRequest.id);
                        setPendingRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
                        setSelectedRequest(null);
                        alert("La demande a été refusée.");
                      } catch (err: any) {
                        alert(`Erreur lors du rejet : ${err.message}`);
                      }
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/20 border border-[#FF4D6D]/25 text-[#FF4D6D] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  ❌ Refuser
                </button>
                <button
                  onClick={() => {
                    const tempMember: Member = {
                      id: selectedRequest.id,
                      name: selectedRequest.applicantName,
                      photoUrl: selectedRequest.applicantAvatar || '',
                      role: 'Invité',
                      age: '30 ans',
                      birthDate: '',
                      bloodGroup: '',
                      allergies: [],
                      treatments: [],
                      schoolOrEmployer: '',
                      emergencyContact: { name: '', phone: '', relation: '' },
                      medicalHistory: []
                    };
                    setMemberToApprove(tempMember);
                    setApproveRole('enfant');
                    setApproveHasExemption(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center shadow-md shadow-green-500/10"
                >
                  ✅ Accepter
                </button>
              </div>
            </div>
          ) : memberToApprove ? (
            /* Attribution du rôle et des permissions for memberToApprove */
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (blockFreeMemberLimit()) return;
                setSavingProfile(true);
                try {
                  const insertedMember = await foyerService.finalizeJoinRequest(memberToApprove.id, approveRole, approveHasExemption);
                  
                  if (onUpdatePermissions && insertedMember) {
                    onUpdatePermissions(insertedMember.id, getDefaultPermissions(approveRole));
                  }

                  const friendlyRole = 
                    approveRole === 'chef_famille' ? 'Chef de famille' :
                    approveRole === 'parent' ? 'Parent' :
                    approveRole === 'gestionnaire' ? 'Gestionnaire' :
                    approveRole === 'adulte' ? 'Membre adulte' :
                    approveRole === 'adolescent' ? 'Adolescent' :
                    approveRole === 'enfant' ? 'Enfant' : 'Invité';

                  const newMember: Member = {
                    id: insertedMember.id,
                    userId: insertedMember.user_id,
                    name: insertedMember.display_name,
                    role: friendlyRole,
                    age: insertedMember.age || '30 ans',
                    birthDate: insertedMember.birth_date || '',
                    bloodGroup: 'O+',
                    allergies: insertedMember.allergies || [],
                    treatments: insertedMember.treatments || [],
                    emergencyContact: {
                      name: insertedMember.emergency_contact_name || '',
                      phone: insertedMember.emergency_contact_phone || '',
                      relation: insertedMember.emergency_contact_relation || ''
                    },
                    schoolOrEmployer: insertedMember.school_or_employer || '',
                    photoUrl: insertedMember.photo_url || 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150',
                    hasExemption: insertedMember.has_exemption || false,
                    approved: true,
                    medicalHistory: []
                  };

                  setMembers(prev => [...prev.filter(m => m.id !== memberToApprove.id), newMember]);

                  if (foyer) {
                    const reqs = await foyerService.getPendingJoinRequests(foyer.id);
                    setPendingRequests(reqs);
                  }
                  
                  alert(`🎉 L'adhésion de ${memberToApprove.name} a été validée avec succès !`);
                  setMemberToApprove(null);
                } catch (err: any) {
                  alert(`Erreur d'approbation : ${err.message}`);
                } finally {
                  setSavingProfile(false);
                }
              }}
              className="space-y-4 pt-4 animate-scale-up"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white">Attribution du rôle et des permissions</h3>
                  <p className="text-[9px] text-white/40 mt-0.5">Configurez l'accès de {memberToApprove.name} avant de l'accepter définitivement.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setMemberToApprove(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Rôle select */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Rôle / Droits dans la famille</label>
                <select
                  value={approveRole}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setApproveRole(newRole);
                    if (onUpdatePermissions) {
                      onUpdatePermissions(memberToApprove.id, getDefaultPermissions(newRole));
                    }
                  }}
                  disabled={savingProfile}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] disabled:opacity-50"
                >
                  {(!myMemberProfile || myMemberProfile.role === 'admin') && (
                    <option value="chef_famille">👑 Chef de famille (Admin)</option>
                  )}
                  <option value="parent">👨 Parent</option>
                  <option value="gestionnaire">⚙️ Gestionnaire</option>
                  <option value="adulte">🧑 Membre adulte (18 ans et +)</option>
                  <option value="adolescent">👦 Adolescent (11-17 ans)</option>
                  <option value="enfant">🧒 Enfant (-11 ans)</option>
                  <option value="invite">👤 Invité</option>
                </select>

                {(approveRole === 'enfant' || approveRole === 'adolescent') && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-white/3 border border-[#6C5CFF]/20 flex items-center justify-between animate-fade-in animate-duration-300">
                    <div>
                      <span className="text-[10px] font-extrabold text-white block">🔓 Dérogation Spéciale Enfant</span>
                      <span className="text-[8.5px] text-white/50 block mt-0.5 max-w-[200px]">Autoriser l'écriture sur les listes de courses, agenda et tâches ménagères.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={approveHasExemption}
                        onChange={(e) => setApproveHasExemption(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00D26A]"></div>
                    </label>
                  </div>
                )}
              </div>

              {/* Permissions par Module Tree */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">🔒 Droits & Permissions par Module</h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdatePermissions) {
                        const defaults = getDefaultPermissions(approveRole);
                        onUpdatePermissions(memberToApprove.id, defaults);
                      }
                    }}
                    className="text-[9px] font-bold text-[#6C5CFF] hover:underline"
                  >
                    Réinitialiser par défaut
                  </button>
                </div>
                
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 select-none no-scrollbar">
                  {ALL_FAMILY_MODULES.map((modName) => {
                    const modPerms = (memberPermissions?.[memberToApprove.id]?.[modName]) || getDefaultPermissions(approveRole)[modName];
                    
                    const togglePerm = (permKey: keyof ModulePermissions) => {
                      if (!onUpdatePermissions) return;
                      const currentMemberPerms = memberPermissions?.[memberToApprove.id] || getDefaultPermissions(approveRole);
                      const updatedMemberPerms = {
                        ...currentMemberPerms,
                        [modName]: {
                          ...currentMemberPerms[modName],
                          [permKey]: !modPerms[permKey]
                        }
                      };
                      onUpdatePermissions(memberToApprove.id, updatedMemberPerms);
                    };

                    const moduleLabel = 
                      modName === 'accueil' ? '🏠 Accueil' :
                      modName === 'timeline' ? '🕒 Timeline' :
                      modName === 'budget' ? '💰 Budget' :
                      modName === 'agenda' ? '📅 Agenda' :
                      modName === 'courses' ? '🛒 Courses' :
                      modName === 'sante' ? '🏥 Santé' :
                      modName === 'voyages' ? '✈️ Voyages' :
                      modName === 'documents' ? '📂 Documents' :
                      modName === 'vehicules' ? '🚗 Véhicules' :
                      modName === 'logement' ? '🏠 Logement' :
                      modName === 'animaux' ? '🐱 Animaux' :
                      modName === 'ecole' ? '🎒 École & Devoirs' :
                      modName === 'taches' ? '🧹 Tâches' :
                      modName === 'conseil_famille' ? '👥 Conseil de famille' :
                      modName === 'histoires_soir' ? '📖 Histoires du soir' :
                      modName === 'messagerie' ? '💬 Messagerie' :
                      modName === 'capsule_temporelle' ? '⏳ Capsule temporelle' :
                      modName === 'repertoire_important' ? '📞 Répertoire important' :
                      modName === 'peacemaker' ? '🕊️ PeaceMaker' :
                      modName === 'carte_familiale' ? '🗺️ Carte familiale' :
                      modName === 'menu_semaine' ? '🍳 Menu de la semaine' :
                      modName === 'demarches' ? '📋 Démarches' :
                      modName === 'notifications' ? '🔔 Notifications' :
                      modName === 'parametres' ? '⚙️ Paramètres' :
                      modName === 'micro' ? '🎤 Micro principal' :
                      modName === 'commune' ? '🏛️ Ma Commune' :
                      '🏫 Mon Établissement';

                    return (
                      <div key={modName} className="p-3 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white">{moduleLabel}</span>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={!!modPerms.voir}
                              onChange={() => togglePerm('voir')}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#6C5CFF]"></div>
                            <span className="text-[9px] text-white/50 ml-1.5 font-bold uppercase">Voir</span>
                          </label>
                        </div>
                        
                        {modPerms.voir && (
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                            {[
                              { key: 'ajouter' as const, label: 'Ajouter' },
                              { key: 'modifier' as const, label: 'Modifier' },
                              { key: 'supprimer' as const, label: 'Suppr' },
                              { key: 'valider' as const, label: 'Valider' },
                              { key: 'archiver' as const, label: 'Archiver' },
                              { key: 'recevoir_notifications' as const, label: 'Notifs' }
                            ].map((action) => (
                              <label key={action.key} className="flex items-center space-x-1.5 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={!!modPerms[action.key]}
                                  onChange={() => togglePerm(action.key)}
                                  className="rounded bg-white/5 border-white/10 text-[#6C5CFF] focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                                />
                                <span className="text-[9px] text-white/40 font-semibold">{action.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setMemberToApprove(null)}
                  disabled={savingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/5 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={savingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-[#00D26A] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {savingProfile ? 'Enregistrement...' : 'Valider l’entrée dans la famille'}
                </button>
              </div>
            </form>
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
                        onChange={(e) => setAddRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                      >
                        <option value="chef_famille">👑 Chef de famille</option>
                        <option value="parent">👨 Parent</option>
                        <option value="gestionnaire">⚙️ Gestionnaire</option>
                        <option value="adulte">🧑 Membre adulte (18 ans et +)</option>
                        <option value="adolescent">👦 Adolescent (11-17 ans)</option>
                        <option value="enfant">🧒 Enfant (-11 ans)</option>
                        <option value="invite">👤 Invité</option>
                      </select>
                    </div>
                  </div>

                  {(addRole === 'enfant' || addRole === 'adolescent' || addRole === 'child') && (
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
                        type="date" 
                        value={addBirth}
                        onChange={(e) => handleBirthDateChange(e.target.value, false)}
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
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Numéro de téléphone (Optionnel)</label>
                    <input 
                      type="tel" 
                      placeholder="Ex: +33 6 12 34 56 78" 
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
                    />
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
                          <option value="chef_famille">👑 Chef de famille</option>
                          <option value="parent">👨 Parent</option>
                          <option value="gestionnaire">⚙️ Gestionnaire</option>
                          <option value="adulte">🧑 Membre adulte (18 ans et +)</option>
                          <option value="adolescent">👦 Adolescent (11-17 ans)</option>
                          <option value="enfant">🧒 Enfant (-11 ans)</option>
                          <option value="invite">👤 Invité</option>
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
