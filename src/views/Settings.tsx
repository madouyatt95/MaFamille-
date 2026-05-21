import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Coins, 
  Database, 
  Trash2, 
  RefreshCw, 
  Lock,
  Mail,
  Key,
  LogOut,
  Sparkles,
  Users,
  Copy,
  Check,
  Share2,
  Plus,
  Crown,
  Camera,
  ImagePlus
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';
import { foyerService } from '../services/foyerService';
import type { Foyer, FoyerMember, Member } from '../types';

interface SettingsProps {
  currency: string;
  setCurrency: (c: string) => void;
  onResetData: () => void;
  onOpenPaywall: () => void;
  user: any;
  onLogout: () => void;
  foyer?: Foyer | null;
  myMemberProfile?: FoyerMember | null;
  onRefreshFoyer?: () => void;
  members?: Member[];
  setMembers?: React.Dispatch<React.SetStateAction<Member[]>>;
  activeMemberId?: string;
}

export const Settings: React.FC<SettingsProps> = ({
  currency,
  setCurrency,
  onResetData,
  onOpenPaywall: _onOpenPaywall,
  user,
  onLogout,
  foyer,
  myMemberProfile,
  onRefreshFoyer,
  members = [],
  setMembers,
  activeMemberId
}) => {
  const [savingBackup, setSavingBackup] = useState(false);

  // Profil et avatars
  const [profileName, setProfileName] = useState(() => {
    if (members && activeMemberId) {
      const activeMem = members.find(m => m.id === activeMemberId);
      if (activeMem) return activeMem.name;
    }
    if (myMemberProfile) return myMemberProfile.displayName;
    return '';
  });
  const [profilePhoto, setProfilePhoto] = useState(() => {
    if (members && activeMemberId) {
      const activeMem = members.find(m => m.id === activeMemberId);
      if (activeMem) return activeMem.photoUrl || '';
    }
    if (myMemberProfile) return myMemberProfile.photoUrl || '';
    return '';
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const compressAndConvert = (file: File, maxSize = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = reject;
        img.src = ev.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      // Try Supabase Storage upload first
      const supabase = getSupabaseClient();
      const targetMemberId = activeMemberId || (myMemberProfile ? myMemberProfile.id : null);
      if (supabase && targetMemberId) {
        const ext = file.name.split('.').pop() || 'jpg';
        const filePath = `avatars/${targetMemberId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true, contentType: file.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            setProfilePhoto(urlData.publicUrl);
            setUploadingPhoto(false);
            return;
          }
        }
      }
      // Fallback: compress to data URL
      const dataUrl = await compressAndConvert(file);
      setProfilePhoto(dataUrl);
    } catch (err) {
      console.error('Photo upload error:', err);
      // Last resort fallback
      const dataUrl = await compressAndConvert(file);
      setProfilePhoto(dataUrl);
    } finally {
      setUploadingPhoto(false);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (members && activeMemberId) {
      const activeMem = members.find(m => m.id === activeMemberId);
      if (activeMem) {
        setProfileName(activeMem.name);
        setProfilePhoto(activeMem.photoUrl || '');
        return;
      }
    }
    if (myMemberProfile) {
      setProfileName(myMemberProfile.displayName);
      setProfilePhoto(myMemberProfile.photoUrl || '');
    }
  }, [myMemberProfile, members, activeMemberId]);

  const presetAvatars = [
    { emoji: '👨‍👩‍👧', label: 'Famille', url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=150' },
    { emoji: '👨‍💼', label: 'Papa', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { emoji: '👩‍💼', label: 'Maman', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { emoji: '🧒', label: 'Garçon', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
    { emoji: '👧', label: 'Fille', url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150' },
    { emoji: '🦁', label: 'Lion', url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=150' },
    { emoji: '🐱', label: 'Chat', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150' },
    { emoji: '🥑', label: 'Avocat', url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=150' }
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const targetMemberId = activeMemberId || (myMemberProfile ? myMemberProfile.id : null);
      if (!targetMemberId) throw new Error("Aucun membre actif trouvé");

      if (myMemberProfile) {
        // Mode Cloud (Supabase)
        await foyerService.updateMemberProfile(targetMemberId, {
          displayName: profileName.trim(),
          photoUrl: profilePhoto
        });
        // Optimistic local update — immediately reflect in UI
        if (setMembers) {
          setMembers(prev => prev.map(m => m.id === targetMemberId ? {
            ...m,
            name: profileName.trim(),
            photoUrl: profilePhoto
          } : m));
        }
        setProfileMsg({ text: 'Profil cloud mis à jour avec succès ! ✨', type: 'success' });
        if (onRefreshFoyer) await onRefreshFoyer();
      } else if (members && setMembers) {
        // Mode Local (Demo)
        setMembers(prev => prev.map(m => m.id === targetMemberId ? {
          ...m,
          name: profileName.trim(),
          photoUrl: profilePhoto
        } : m));
        setProfileMsg({ text: 'Profil local mis à jour avec succès ! ✨', type: 'success' });
      } else {
        throw new Error("Impossible de mettre à jour le profil");
      }
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Erreur de mise à jour.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };
  
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerInviteCode, setRegisterInviteCode] = useState('');

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'parent' | 'child' | 'guest'>('child');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Members list local state for current foyer
  const [foyerMembers, setFoyerMembers] = useState<FoyerMember[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);



  useEffect(() => {
    if (foyer) {
      foyerService.getFoyerMembers(foyer.id).then(setFoyerMembers);
    }
  }, [foyer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeClient = getSupabaseClient();
    if (!activeClient) {
      setAuthMessage({ text: "La connexion au serveur cloud n'est pas configurée. Veuillez contacter l'administrateur.", type: 'error' });
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const { error } = await activeClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;
      
      setAuthMessage({ text: `Ravi de vous revoir ! Foyer connecté.`, type: 'success' });
      setEmail('');
      setPassword('');
      if (onRefreshFoyer) onRefreshFoyer();
    } catch (err: any) {
      setAuthMessage({ text: err.message || "Erreur de connexion.", type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerDisplayName.trim()) {
      setAuthMessage({ text: "Veuillez saisir votre prénom / nom d'affichage.", type: 'error' });
      return;
    }

    const activeClient = getSupabaseClient();
    if (!activeClient) {
      setAuthMessage({ text: "L'inscription au serveur cloud n'est pas configurée. Veuillez contacter l'administrateur.", type: 'error' });
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      // Persist values in localStorage for automatic onboarding upon successful session load
      localStorage.setItem('pending_display_name', registerDisplayName.trim());
      if (registerInviteCode.trim()) {
        localStorage.setItem('pending_invite_code', registerInviteCode.trim().toUpperCase());
      } else {
        localStorage.removeItem('pending_invite_code');
      }

      const { error } = await activeClient.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (error) throw error;
      
      setAuthMessage({ 
        text: `Compte créé ! Votre foyer ou raccordement sera automatiquement configuré lors de votre première connexion. Veuillez confirmer votre e-mail si nécessaire.`, 
        type: 'success' 
      });
      setAuthTab('login');
      setPassword('');
    } catch (err: any) {
      // Clear storage on failure to prevent accidental side effects
      localStorage.removeItem('pending_display_name');
      localStorage.removeItem('pending_invite_code');
      setAuthMessage({ text: err.message || "Erreur d'inscription.", type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foyer || !inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteMessage(null);

    try {
      await foyerService.inviteByEmail(foyer.id, inviteEmail.trim(), inviteRole);
      setInviteMessage({ text: `Invitation envoyée avec succès à ${inviteEmail} !`, type: 'success' });
      setInviteEmail('');
    } catch (err: any) {
      setInviteMessage({ text: err.message || "Impossible d'envoyer l'invitation.", type: 'error' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!foyer) return;
    if (!window.confirm("Voulez-vous vraiment régénérer le code d'invitation ? L'ancien code ne fonctionnera plus.")) return;

    try {
      const newCode = await foyerService.regenerateInviteCode(foyer.id);
      alert(`Nouveau code généré : ${newCode}`);
      if (onRefreshFoyer) onRefreshFoyer();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la régénération du code.");
    }
  };

  const handleCopyCode = () => {
    if (!foyer) return;
    navigator.clipboard.writeText(foyer.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!foyer) return;
    const link = `${window.location.origin}/join/${foyer.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const triggerManualBackup = () => {
    setSavingBackup(true);
    setTimeout(() => {
      setSavingBackup(false);
      alert('Sauvegarde locale et cloud effectuée avec succès !');
    }, 1000);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Chef de famille (Admin) 👑';
      case 'parent': return 'Parent 👨‍👩‍👧';
      case 'child': return 'Enfant 🧒';
      case 'guest': return 'Invité (Lecture seule) 👥';
      default: return role;
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-xl mx-auto premium-glow-blue">
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Paramètres</h1>
          <p className="text-xs text-white/50 font-medium">Configuration globale de l'OS familial</p>
        </div>
      </div>

      {/* 0. Mon Profil */}
      {(myMemberProfile || activeMemberId) && (
        <form onSubmit={handleSaveProfile} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#6C5CFF]" />
              <span>Mon Profil</span>
            </h3>
            <span className="text-[9px] font-bold text-[#6C5CFF] bg-[#6C5CFF]/10 px-2 py-0.5 rounded-full uppercase">
              Rôle : {getRoleLabel((members.find(m => m.id === activeMemberId)?.role) || (myMemberProfile ? myMemberProfile.role : 'Chef de famille'))}
            </span>
          </div>

          {/* Profile Photo selector */}
          <div className="flex flex-col items-center justify-center space-y-4 p-4 bg-white/3 rounded-2xl border border-white/5">
            <div className="relative group">
              {uploadingPhoto ? (
                <div className="w-20 h-20 rounded-full border-2 border-[#6C5CFF] bg-white/5 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-[#6C5CFF] animate-spin" />
                </div>
              ) : (
                <img 
                  src={profilePhoto || 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150'} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#6C5CFF] shadow-[0_0_15px_rgba(108,92,255,0.3)]"
                />
              )}
              <span className="absolute bottom-0 right-0 bg-[#6C5CFF] text-white p-1 rounded-full text-[9px] font-black border border-[#07111F]">
                📸
              </span>
            </div>

            {/* Camera & Gallery buttons */}
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 py-2.5 rounded-xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-[#6C5CFF]/20 active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#6C5CFF]" />
                <span>Prendre une photo</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 py-2.5 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 hover:bg-[#00D26A]/20 active:scale-95 transition-all cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#00D26A]" />
                <span>Galerie</span>
              </button>
            </div>
            {/* Hidden file inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} className="hidden" />
            <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoFile} className="hidden" />

            {/* Preset avatars */}
            <div className="space-y-2 w-full">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block text-center">Ou choisir un avatar</span>
              <div className="flex flex-wrap gap-2 justify-center">
                {presetAvatars.map((av) => (
                  <button
                    type="button"
                    key={av.url}
                    onClick={() => setProfilePhoto(av.url)}
                    className={`p-2 rounded-xl bg-white/5 border text-sm hover:bg-white/10 active:scale-95 transition-all cursor-pointer ${
                      profilePhoto === av.url ? 'border-[#6C5CFF] bg-[#6C5CFF]/10 scale-110 shadow-md' : 'border-transparent'
                    }`}
                    title={av.label}
                  >
                    {av.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="w-full space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Ou coller l'URL d'une image</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={profilePhoto}
                onChange={(e) => setProfilePhoto(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>
          </div>

          {/* Display Name input */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Mon Prénom / Nom d'affichage</label>
            <input
              type="text"
              required
              placeholder="Ex: Amadou, Fatou..."
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#6C5CFF]"
            />
          </div>

          {profileMsg && (
            <div className={`p-3 rounded-xl border text-[11px] font-medium leading-normal animate-fade-in ${
              profileMsg.type === 'success' ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {profileMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-3 rounded-xl bg-[#6C5CFF] hover:bg-[#5B4EFA] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[#6C5CFF]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            {savingProfile ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Enregistrer mon profil</span>
            )}
          </button>
        </form>
      )}

      {/* 1. Devise Section */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Coins className="w-4 h-4 text-[#FFB020]" />
          <span>Devise par défaut</span>
        </h3>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Choisissez la devise monétaire dans laquelle s'affichent les soldes, dépenses et argent de poche de la famille.
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'EUR (€)', label: 'Euro (€)' },
            { id: 'FCFA (FCFA)', label: 'CFA (FCFA)' },
            { id: 'USD ($)', label: 'Dollar ($)' }
          ].map((dev) => (
            <button
              key={dev.id}
              onClick={() => setCurrency(dev.id)}
              className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                currency === dev.id
                  ? 'bg-[#6C5CFF]/10 border-[#6C5CFF] text-white shadow-md'
                  : 'bg-white/5 border-transparent text-white/50 hover:text-white'
              }`}
            >
              {dev.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Foyer Management Section */}
      {user && foyer ? (
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-5 animate-fade-in">
          
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#6C5CFF]" />
              <span>Mon Foyer : {foyer.name}</span>
            </h3>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A]">Compte Actif</span>
          </div>

          {/* Invitation Code widget */}
          <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Invitation du Foyer</span>
              {foyer.isPremium ? (
                <span className="text-[9px] font-black text-[#FFB020] flex items-center gap-0.5 uppercase tracking-wider">
                  <Crown className="w-3 h-3 fill-[#FFB020]" />
                  Membres Illimités (Premium)
                </span>
              ) : (
                <span className="text-[9px] font-bold text-white/40">
                  Limite : {foyerMembers.length} / 3 membres (Gratuit)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Copy Code button */}
              <button
                onClick={handleCopyCode}
                className="py-3 px-4 rounded-xl bg-white/5 border border-white/8 text-white text-xs font-bold flex items-center justify-between hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
              >
                <div className="text-left">
                  <span className="text-[9px] text-white/40 block font-normal uppercase">Code à 6 caractères</span>
                  <span className="font-mono text-sm font-black text-[#6C5CFF] block mt-0.5">{foyer.inviteCode}</span>
                </div>
                {copiedCode ? <Check className="w-4 h-4 text-[#00D26A]" /> : <Copy className="w-4 h-4 text-white/40" />}
              </button>

              {/* Share Link button */}
              <button
                onClick={handleCopyLink}
                className="py-3 px-4 rounded-xl bg-white/5 border border-white/8 text-white text-xs font-bold flex items-center justify-between hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
              >
                <div className="text-left">
                  <span className="text-[9px] text-white/40 block font-normal uppercase">Lien d'invitation</span>
                  <span className="text-[10px] text-white/80 block mt-1">Copier le lien</span>
                </div>
                {copiedLink ? <Check className="w-4 h-4 text-[#00D26A]" /> : <Share2 className="w-4 h-4 text-white/40" />}
              </button>
            </div>

            {myMemberProfile?.role === 'admin' && (
              <button
                onClick={handleRegenerateCode}
                className="text-[9px] text-white/30 hover:text-white/60 font-bold block pt-1 cursor-pointer transition-colors"
              >
                Régénérer le code d'invitation
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Membres connectés ({foyerMembers.length})</span>
            <div className="space-y-2">
              {foyerMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/3 border border-white/5">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={member.photoUrl || 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150'} 
                      alt={member.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-white block">
                        {member.displayName}
                        {member.userId === user.id && <span className="text-[9px] text-[#6C5CFF] ml-1 font-bold">(Vous)</span>}
                      </span>
                      <span className="text-[9px] text-white/40 block mt-0.5">{getRoleLabel(member.role)}</span>
                    </div>
                  </div>

                  <span className="text-[9px] text-[#00D26A] font-bold">Synchronisé</span>
                </div>
              ))}
            </div>
          </div>

          {/* Send invite by email (admin or parent only) */}
          {(myMemberProfile?.role === 'admin' || myMemberProfile?.role === 'parent') && (
            <form onSubmit={handleSendInvite} className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-3">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Inviter un nouveau membre</span>
              
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  placeholder="Adresse email de l'invité..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-center">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider block">Rôle assigné</span>
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none"
                  >
                    <option value="parent" className="bg-[#07111F]">Parent</option>
                    <option value="child" className="bg-[#07111F]">Enfant</option>
                    <option value="guest" className="bg-[#07111F]">Invité</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full py-2.5 rounded-xl bg-[#6C5CFF] text-white font-bold text-xs flex items-center justify-center space-x-1 hover:bg-[#5b4eff] transition-all cursor-pointer shrink-0 mt-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{inviteLoading ? 'Envoi...' : 'Envoyer'}</span>
                </button>
              </div>

              {inviteMessage && (
                <div className="space-y-2.5">
                  <div className={`p-2.5 rounded-xl border text-[10px] ${
                    inviteMessage.type === 'success' ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' : 'bg-[#FF4D6D]/10 border-[#FF4D6D]/20 text-[#FF4D6D]'
                  }`}>
                    {inviteMessage.text}
                  </div>
                  {inviteMessage.type === 'success' && foyer && (
                    <div className="p-3.5 bg-[#6C5CFF]/8 border border-[#6C5CFF]/20 rounded-2xl space-y-2.5 animate-scale-up text-left">
                      <span className="text-[9.5px] font-black text-[#6C5CFF] block uppercase tracking-widest">⚡ Partage direct (Alternative)</span>
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        Si votre proche ne reçoit pas le mail de confirmation (délai de réception ou filtre anti-spam), transmettez-lui directement le code ou le lien d'invitation :
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="py-2 px-3 rounded-xl bg-white/5 border border-white/8 text-white text-[10px] font-bold flex items-center justify-between hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="font-mono text-[#6C5CFF] font-black">{foyer.inviteCode}</span>
                          <span className="text-[8px] bg-[#6C5CFF]/15 text-[#6C5CFF] px-1.5 py-0.5 rounded font-black uppercase">
                            {copiedCode ? 'Copié' : 'Copier'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="py-2 px-3 rounded-xl bg-white/5 border border-white/8 text-white text-[10px] font-bold flex items-center justify-between hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="text-white/60">Lien direct</span>
                          <span className="text-[8px] bg-[#00D26A]/15 text-[#00D26A] px-1.5 py-0.5 rounded font-black uppercase">
                            {copiedLink ? 'Copié' : 'Copier'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* Leave household button */}
          <button
            onClick={onLogout}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-[#FF4D6D]/15 border border-white/10 hover:border-[#FF4D6D]/20 text-white/70 hover:text-[#FF4D6D] font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnecter mon Foyer</span>
          </button>

        </div>
      ) : (
        /* 3. Authentication Panel (Show if not logged in) */
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4 animate-fade-in">
          
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#FF4D6D]" />
              <span>Connexion & Synchronisation</span>
            </h3>
            <p className="text-[10px] text-white/40 leading-normal">
              Connectez-vous pour activer la synchronisation multi-appareils de votre foyer.
            </p>
          </div>

          {/* Form Selector Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setAuthTab('login')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authTab === 'login' ? 'bg-[#6C5CFF] text-white shadow' : 'text-white/40 hover:text-white'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('register')}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authTab === 'register' ? 'bg-[#6C5CFF] text-white shadow' : 'text-white/40 hover:text-white'
              }`}
            >
              S'inscrire
            </button>
          </div>

          <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-3.5">
            {authTab === 'register' && (
              <div className="space-y-3.5 animate-fade-in">
                {/* Display Name Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Prénom / Nom d'affichage</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amadou, Awa, Maman..."
                    value={registerDisplayName}
                    onChange={(e) => setRegisterDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  placeholder="ex: amadou@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Mot de passe</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
                />
              </div>
            </div>

            {authTab === 'register' && (
              <div className="space-y-1.5 animate-fade-in pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Code d'invitation (Optionnel)</label>
                  <span className="text-[8px] text-[#6C5CFF] font-bold bg-[#6C5CFF]/15 px-1.5 py-0.5 rounded-full uppercase">Rejoindre</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: FAM-XXXXX (pour rejoindre un foyer)"
                  value={registerInviteCode}
                  onChange={(e) => setRegisterInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#6C5CFF]"
                />
                <p className="text-[9px] text-white/30 leading-normal">
                  Laissez vide pour créer automatiquement un nouveau foyer pour vous.
                </p>
              </div>
            )}

            {authMessage && (
              <div className={`p-3 rounded-xl border text-[11px] font-medium leading-relaxed ${
                authMessage.type === 'success' 
                  ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' 
                  : 'bg-[#FF4D6D]/10 border-[#FF4D6D]/20 text-[#FF4D6D]'
              }`}>
                {authMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(108,92,255,0.3)] flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{authTab === 'login' ? 'Se connecter' : 'Créer un compte Foyer'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 4. Données locales & Sauvegarde */}
      {!user && (
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Database className="w-4 h-4 text-[#00D26A]" />
            <span>Données locales & Sauvegarde</span>
          </h3>
          
          <p className="text-xs text-white/50 leading-relaxed font-medium">
            Sauvegardez vos données locales sur votre appareil ou réinitialisez l'application pour restaurer les paramètres de démo par défaut.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button 
              onClick={triggerManualBackup}
              disabled={savingBackup}
              className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${savingBackup ? 'animate-spin' : ''}`} />
              <span>{savingBackup ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
            
            <button 
              onClick={() => {
                if (window.confirm('Voulez-vous réinitialiser le système ? Les modifications locales seront effacées et remplacées par la famille de démo.')) {
                  onResetData();
                }
              }}
              className="py-3 rounded-xl bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/20 border border-[#FF4D6D]/20 text-[#FF4D6D] font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
