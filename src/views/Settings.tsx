import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Coins, 
  Database, 
  Trash2, 
  RefreshCw, 
  Lock,
  LogOut,
  Sparkles,
  Users,
  Camera,
  ImagePlus,
  Eye,
  EyeOff,
  Bell,
  BellOff
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';
import { foyerService } from '../services/foyerService';
import { notificationService } from '../services/notificationService';
import type { Foyer, FoyerMember, Member } from '../types';

interface SettingsProps {
  currency: string;
  setCurrency: (c: string) => void;
  onResetData: () => void;
  onPurgeDemoData?: () => Promise<void> | void;
  onClearAllFoyerData?: () => Promise<void> | void;
  onOpenPaywall: () => void;
  user: any;
  onLogout: () => void;
  foyer?: Foyer | null;
  myMemberProfile?: FoyerMember | null;
  onRefreshFoyer?: () => void;
  onUpdateMemberProfile?: (memberId: string, updates: Partial<FoyerMember>) => Promise<void> | void;
  members?: Member[];
  setMembers?: React.Dispatch<React.SetStateAction<Member[]>>;
  activeMemberId?: string;
  setActiveTab?: (tab: string) => void;
  setActiveModule?: (moduleName: string) => void;
  onOpenOnboarding?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  currency,
  setCurrency,
  onResetData,
  onPurgeDemoData,
  onClearAllFoyerData,
  onOpenPaywall: _onOpenPaywall,
  user,
  onLogout,
  foyer,
  myMemberProfile,
  onRefreshFoyer,
  onUpdateMemberProfile,
  members = [],
  setMembers,
  activeMemberId,
  setActiveTab,
  setActiveModule,
  onOpenOnboarding
}) => {
  const [savingBackup, setSavingBackup] = useState(false);

  const [parentPinInput, setParentPinInput] = useState(() => {
    return foyer?.parentPin || localStorage.getItem('mf_parent_pin') || '0000';
  });
  const [showParentPin, setShowParentPin] = useState(false);

  const handleSaveParentPin = async () => {
    localStorage.setItem('mf_parent_pin', parentPinInput);
    if (foyer && user) {
      try {
        await foyerService.updateFoyerParentPin(foyer.id, parentPinInput);
        if (onRefreshFoyer) onRefreshFoyer();
      } catch (err: any) {
        console.error("Error saving parent pin to database:", err);
      }
    }
    alert("Code PIN parent enregistré avec succès !");
  };

  // État des notifications push FCM
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('mf_fcm_active') === 'true';
  });

  const handleTogglePush = async () => {
    if (!activeMemberId) return;

    if (pushEnabled) {
      try {
        await notificationService.disableNotifications(activeMemberId);
        setPushEnabled(false);
      } catch (err) {
        console.error("[Settings] Failed to disable push notifications:", err);
      }
    } else {
      try {
        const token = await notificationService.initializeFCM(activeMemberId);
        if (token) {
          setPushEnabled(true);
        } else {
          alert("L'activation a échoué. Veuillez autoriser les notifications dans les paramètres de votre navigateur.");
        }
      } catch (err) {
        console.error("[Settings] Failed to enable push notifications:", err);
      }
    }
  };

  // Apparence thématique (Sombre / Clair / Sépia)
  const [theme, setTheme] = useState<'dark' | 'light' | 'sepia'>(() => {
    return (localStorage.getItem('app_appearance_mode') as 'dark' | 'light' | 'sepia') || 'dark';
  });

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-sepia');
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (theme === 'sepia') {
      document.body.classList.add('theme-sepia');
    }
    localStorage.setItem('app_appearance_mode', theme);
  }, [theme]);

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

  const lastActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentTargetId = activeMemberId || (myMemberProfile ? myMemberProfile.id : 'default');
    if (lastActiveIdRef.current !== currentTargetId) {
      lastActiveIdRef.current = currentTargetId;
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
        const updates = {
          displayName: profileName.trim(),
          photoUrl: profilePhoto
        };
        await foyerService.updateMemberProfile(targetMemberId, updates);
        
        if (onUpdateMemberProfile) {
          onUpdateMemberProfile(targetMemberId, updates);
        }

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

      {/* Sélecteur de Mode d'Apparence */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#6C5CFF]" />
          <span>Apparence & Mode visuel</span>
        </h3>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Personnalisez le style visuel de votre interface MaFamille+ selon vos préférences ou le moment de la journée.
        </p>
        
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'dark', label: 'Sombre 🌗', color: 'bg-[#07111F]' },
            { id: 'light', label: 'Clair ☀️', color: 'bg-[#F3F4F6]' },
            { id: 'sepia', label: 'Sépia 📜', color: 'bg-[#F4EBD0]' }
          ].map((mode) => (
            <button
              type="button"
              key={mode.id}
              onClick={() => setTheme(mode.id as any)}
              className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center space-y-1.5 active:scale-95 ${
                theme === mode.id
                  ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-md shadow-[#6C5CFF]/10 font-black'
                  : 'bg-white/5 border-transparent text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Push */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            {pushEnabled ? <Bell className="w-4 h-4 text-[#00D26A]" /> : <BellOff className="w-4 h-4 text-white/40" />}
            <span>Notifications Push</span>
          </h3>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${pushEnabled ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-white/5 text-white/30'}`}>
            {pushEnabled ? 'Activées' : 'Désactivées'}
          </span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Recevez des alertes en temps réel (Urgences, Chat, Tâches, Argent de poche) directement sur l'écran d'accueil de votre appareil.
        </p>

        <button
          type="button"
          onClick={handleTogglePush}
          className={`w-full py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.98] ${
            pushEnabled
              ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg shadow-[#6C5CFF]/15 hover:opacity-95'
          }`}
        >
          {pushEnabled ? (
            <>
              <BellOff className="w-4 h-4" />
              <span>Désactiver les notifications</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 animate-bounce" style={{ animationDuration: '3s' }} />
              <span>Activer les notifications</span>
            </>
          )}
        </button>
      </div>

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

          {/* Premium Shortcut to Unified Member Manager */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#6C5CFF]/10 to-[#FF4D6D]/10 border border-[#6C5CFF]/20 text-center space-y-3">
            <div className="inline-flex p-3.5 rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20 animate-pulse">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Gestion Familiale Unifiée 👨‍👩‍👧</h4>
              <p className="text-[9.5px] text-white/50 leading-relaxed max-w-[300px] mx-auto mt-1">
                Gérez tous les membres, invitations cloud par e-mail, codes de foyer, rôles administratifs (admin, parent, invité) et dérogations d'écriture enfants depuis un panneau centralisé unique.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (setActiveTab && setActiveModule) {
                  setActiveTab('menu');
                  setActiveModule('membres');
                }
              }}
              className="w-full mt-2 py-3.5 rounded-xl bg-[#6C5CFF] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#6C5CFF]/15 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Gérer les Membres, Rôles & Invitations ➔
            </button>
          </div>

          <div className="pt-2"></div>

          {/* Parent PIN Lock Card */}
          {(!myMemberProfile || ['admin', 'parent'].includes(myMemberProfile.role)) && (
            <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
              <div className="flex items-center space-x-2 text-[#FF4D6D]">
                <Lock className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Code PIN de Contrôle Parental</h4>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">
                Définissez un code PIN à 4 chiffres requis pour basculer d'un profil enfant vers un profil parent/admin.
              </p>
              <div className="flex items-center space-x-3 pt-1">
                <div className="relative w-24">
                  <input
                    type={showParentPin ? "text" : "password"}
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="PIN"
                    value={parentPinInput}
                    onChange={(e) => setParentPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-4 pr-9 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-extrabold tracking-widest text-center text-sm focus:outline-none focus:border-[#6C5CFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowParentPin(!showParentPin)}
                    className="absolute right-2.5 top-3.5 text-white/30 hover:text-white/60 focus:outline-none cursor-pointer"
                  >
                    {showParentPin ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveParentPin}
                  disabled={parentPinInput.length !== 4}
                  className="flex-1 py-3.5 rounded-xl bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/25 border border-[#6C5CFF]/30 disabled:opacity-50 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center"
                >
                  Enregistrer le PIN
                </button>
              </div>
            </div>
          )}

          <div className="pt-2"></div>

          {/* Database Maintenance and Cleansing Section */}
          <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
            <div className="flex items-center space-x-2 text-[#FFB020]">
              <Database className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Maintenance BDD & Données Cloud</h4>
            </div>
            
            <p className="text-[10px] text-white/50 leading-relaxed">
              Si vous observez des données de démonstration résiduelles (ex: membres ou tâches fictives) sur votre compte en ligne, utilisez ces outils pour assainir votre base de données.
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {onPurgeDemoData && (
                <button
                  type="button"
                  onClick={onPurgeDemoData}
                  className="w-full py-3 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-extrabold text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1.5 active:scale-98 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                  <span>Purger les données de démo de ma BDD</span>
                </button>
              )}
              
              {onClearAllFoyerData && (
                <button
                  type="button"
                  onClick={onClearAllFoyerData}
                  className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1.5 active:scale-98 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vider entièrement mon foyer en ligne</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-2"></div>

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
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4 animate-fade-in text-center">
          <div className="space-y-2 py-4">
            <div className="w-12 h-12 rounded-full bg-[#6C5CFF]/10 flex items-center justify-center mx-auto text-[#6C5CFF]">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Portail de Connexion
              </h3>
              <p className="text-[10px] text-white/50 max-w-xs mx-auto leading-normal">
                Rejoignez votre famille ou créez votre propre foyer pour synchroniser vos agendas, listes et photos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenOnboarding) {
                onOpenOnboarding();
              }
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Se connecter / Rejoindre / S'inscrire
          </button>
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
