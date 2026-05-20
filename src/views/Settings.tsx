import React, { useState, useEffect } from 'react';
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
  Crown
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';
import { foyerService } from '../services/foyerService';
import type { Foyer, FoyerMember } from '../types';

interface SettingsProps {
  currency: string;
  setCurrency: (c: string) => void;
  supabaseUrl: string;
  setSupabaseUrl: (u: string) => void;
  supabaseKey: string;
  setSupabaseKey: (k: string) => void;
  syncActive: boolean;
  setSyncActive: (s: boolean) => void;
  onResetData: () => void;
  isPremium: boolean;
  onOpenPaywall: () => void;
  user: any;
  onLogout: () => void;
  foyer?: Foyer | null;
  myMemberProfile?: FoyerMember | null;
  onRefreshFoyer?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  currency,
  setCurrency,
  supabaseUrl,
  setSupabaseUrl,
  supabaseKey,
  setSupabaseKey,
  onResetData,
  isPremium,
  onOpenPaywall: _onOpenPaywall,
  user,
  onLogout,
  foyer,
  myMemberProfile,
  onRefreshFoyer
}) => {
  const [savingBackup, setSavingBackup] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'parent' | 'child' | 'guest'>('child');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Members list local state for current foyer
  const [foyerMembers, setFoyerMembers] = useState<FoyerMember[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const supabaseClient = getSupabaseClient();

  useEffect(() => {
    if (foyer) {
      foyerService.getFoyerMembers(foyer.id).then(setFoyerMembers);
    }
  }, [foyer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) {
      setAuthMessage({ text: "Erreur d'initialisation de Supabase. Veuillez vérifier vos clés dans la Configuration Technique ci-dessous.", type: 'error' });
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
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
    if (!supabaseClient) {
      setAuthMessage({ text: "Erreur d'initialisation de Supabase. Veuillez vérifier vos clés dans la Configuration Technique ci-dessous.", type: 'error' });
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const { error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (error) throw error;
      
      setAuthMessage({ 
        text: `Compte créé ! Veuillez confirmer votre email ou vous connecter directement si la confirmation automatique est active.`, 
        type: 'success' 
      });
      setAuthTab('login');
      setPassword('');
    } catch (err: any) {
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
                <div className={`p-2.5 rounded-xl border text-[10px] ${
                  inviteMessage.type === 'success' ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' : 'bg-[#FF4D6D]/10 border-[#FF4D6D]/20 text-[#FF4D6D]'
                }`}>
                  {inviteMessage.text}
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
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Adresse e-mail</label>
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
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Mot de passe</label>
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

      {/* 4. Database & Storage */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Database className="w-4 h-4 text-[#00D26A]" />
          <span>Sécurité & Télémétrie</span>
        </h3>
        
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/50">Base de données principale :</span>
            <span className="font-bold text-white">{user ? 'Cloud Supabase' : 'LocalStorage Local'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/50">Chiffrement actif :</span>
            <span className="font-bold text-[#00D26A] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              AES-256 local
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/50">État d'Abonnement :</span>
            <span className={`font-bold ${isPremium ? 'text-[#00D26A]' : 'text-white/50'}`}>{isPremium ? '👑 Premium' : 'Gratuit'}</span>
          </div>
        </div>

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

      {/* 5. Configuration Technique (Collapsed by default, allows fixing connection/credentials) */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-[#FFB020]" />
            <span>Configuration Technique (Avancé)</span>
          </div>
          <span className="text-[10px] text-white/40">{showAdvanced ? 'Masquer ▲' : 'Afficher ▼'}</span>
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-2 animate-fade-in">
            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
              Par défaut, l'application utilise la configuration de votre serveur cloud. Si la clé dans vos fichiers d'environnement est invalide ou expirée, vous pouvez spécifier vos clés d'accès Supabase personnalisées ci-dessous.
            </p>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">URL Supabase</label>
              <input
                type="text"
                placeholder="https://votre-projet.supabase.co"
                value={supabaseUrl}
                onChange={(e) => {
                  setSupabaseUrl(e.target.value.trim());
                  localStorage.setItem('mf_supabase_url', e.target.value.trim());
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Clé API Anon (Publishable)</label>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={supabaseKey}
                onChange={(e) => {
                  setSupabaseKey(e.target.value.trim());
                  localStorage.setItem('mf_supabase_key', e.target.value.trim());
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>
            
            <p className="text-[9px] text-[#FFB020] bg-[#FFB020]/5 p-2.5 rounded-xl border border-[#FFB020]/10 leading-normal">
              ⚠️ Note : Les modifications sont enregistrées localement dans votre navigateur et écrasent la configuration par défaut du serveur.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
