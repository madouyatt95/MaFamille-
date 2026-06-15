import React, { useState } from 'react';
import { 
  Home, 
  User, 
  ArrowRight,
  ShieldAlert,
  Mail,
  Lock,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Users,
  Bell,
  ShieldCheck,
  Crown,
  UserRound,
  Check
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';

interface OnboardingProps {
  onSuccess: (foyerId: string, memberRole: string) => void;
  onLogout: () => void;
  userEmail: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSuccess }) => {
  const [activeMode, setActiveMode] = useState<'login' | 'create' | 'forgot'>('login');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [familyRole, setFamilyRole] = useState<'admin' | 'parent' | 'child'>('admin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const presetAvatars = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sasha',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Cookie'
  ];

  const roleOptions = [
    {
      id: 'admin' as const,
      label: 'Chef',
      title: 'Chef de famille',
      description: "Administrateur du foyer : crée la famille, invite ou valide les membres, gère les rôles, la sécurité et l'abonnement.",
      icon: Crown
    },
    {
      id: 'parent' as const,
      label: 'Parent',
      title: 'Parent',
      description: "Membre adulte avec accès aux modules familiaux, aux validations et au suivi du quotidien.",
      icon: Users
    },
    {
      id: 'child' as const,
      label: 'Enfant',
      title: 'Enfant',
      description: "Profil enfant ou ado avec une expérience adaptée et des accès limités par les adultes.",
      icon: UserRound
    }
  ];

  const selectedRole = roleOptions.find(role => role.id === familyRole) || roleOptions[0];
  const passwordChecks = [
    { label: '6 caractères minimum', done: password.length >= 6 },
    { label: 'Confirmation identique', done: !!confirmPassword && password === confirmPassword },
    { label: 'E-mail renseigné', done: /\S+@\S+\.\S+/.test(email.trim()) }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    const supabase = getSupabaseClient();

    if (activeMode === 'forgot') {
      if (!email.trim()) {
        setErrorMessage("Veuillez saisir votre adresse e-mail.");
        return;
      }
      setLoading(true);
      try {
        if (!supabase) throw new Error("Supabase n'est pas disponible.");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setSuccessMessage("Un e-mail de récupération a été envoyé !");
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erreur lors de l'envoi");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Field Validations
    if (activeMode === 'create') {
      if (!firstName.trim()) {
        setErrorMessage("Veuillez saisir votre prénom.");
        return;
      }
      if (!lastName.trim()) {
        setErrorMessage("Veuillez saisir votre nom de famille.");
        return;
      }
    }

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Veuillez remplir les champs email et mot de passe.");
      return;
    }
    if (activeMode === 'create' && password.length < 6) {
      setErrorMessage("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (activeMode === 'create' && password !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      if (!supabase) throw new Error("Supabase n'est pas disponible.");

      if (activeMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
      } else {
        // Register account only
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              display_name: `${firstName.trim()} ${lastName.trim()}`,
              avatar_url: photoUrl.trim() || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName.trim()}`,
              family_role: familyRole
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage("Votre compte MaFamille+ est créé. Préparation de votre espace familial...");
          onSuccess('', familyRole);
        } else {
          setSuccessMessage("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.");
        }
        
        // Reset fields
        setFirstName('');
        setLastName('');
        setPhotoUrl('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        // Redirect to login tab
        setActiveMode('login');
      }
    } catch (err: unknown) {
      console.error("[Onboarding Error]", err);
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />

      {/* Container */}
      <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in">
        {/* Logo and Titles */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 rounded-3xl bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg animate-pulse">
            <Home className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            MaFamille+
          </h1>
          <p className="text-sm text-white/60 max-w-sm mx-auto leading-relaxed">
            Votre espace familial sécurisé pour organiser, partager et piloter le quotidien.
          </p>
        </div>

        {/* Tab Selection */}
        {activeMode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeMode === 'login' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('create');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeMode === 'create' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              Inscription
            </button>
          </div>
        )}

        {/* Panel Form */}
        <div className="glass-panel border border-white/8 rounded-[32px] p-6 sm:p-8 space-y-5 shadow-2xl relative bg-white/2 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6C5CFF]">
                {activeMode === 'create' ? 'Créer votre accès' : activeMode === 'forgot' ? 'Récupération' : 'Accès sécurisé'}
              </p>
              <h2 className="text-xl font-black text-white mt-1">
                {activeMode === 'create' ? 'Bienvenue dans MaFamille+' : activeMode === 'forgot' ? 'Réinitialiser le mot de passe' : 'Ravi de vous revoir'}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#00D26A]" />
            </div>
          </div>

          {activeMode === 'create' && (
            <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((item) => {
                const Icon = item.icon;
                const selected = familyRole === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFamilyRole(item.id as typeof familyRole)}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition active:scale-95 ${
                      selected
                        ? 'bg-[#6C5CFF]/20 border-[#6C5CFF]/40 text-white'
                        : 'bg-white/5 border-white/8 text-white/45'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-wide">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 p-3.5 text-sm leading-relaxed text-white/70">
              <span className="font-extrabold text-white">{selectedRole.title}</span> : {selectedRole.description}
            </div>
            </div>
          )}

          {activeMode === 'create' && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Compte', done: !!email && !!password && !!confirmPassword },
                { label: 'Profil', done: !!firstName && !!lastName },
                { label: 'Sécurité', done: passwordChecks.every(check => check.done), icon: Bell }
              ].map((step) => (
                <div key={step.label} className={`py-2.5 rounded-xl border text-xs font-black uppercase tracking-wide ${
                  step.done
                    ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]'
                    : 'bg-white/5 border-white/8 text-white/35'
                }`}>
                  {step.label}
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Prénom et Nom (S'inscrire seulement) */}
            {activeMode === 'create' && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wide block">
                    Prénom
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/30">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text" 
                      required
                      autoComplete="given-name"
                      placeholder="Ex: Issa"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wide block">
                    Nom
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/30">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text" 
                      required
                      autoComplete="family-name"
                      placeholder="Ex: Yattabare"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Photo Avatar (S'inscrire seulement) */}
            {activeMode === 'create' && (
              <div className="space-y-2.5 animate-fade-in">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wide block">
                  Photo de Profil (Optionnelle)
                </label>
                <div className="flex flex-col space-y-3 p-3 bg-white/3 rounded-2xl border border-white/5">
                  <div className="flex items-center space-x-3 justify-center">
                    <div className="relative shrink-0">
                      <img 
                        src={photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName || 'default'}`} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full object-cover border border-[#6C5CFF]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {presetAvatars.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPhotoUrl(url)}
                          className={`w-8 h-8 rounded-lg bg-white/5 border hover:bg-white/10 active:scale-95 transition-all overflow-hidden flex items-center justify-center cursor-pointer ${
                            photoUrl === url ? 'border-[#6C5CFF]' : 'border-transparent'
                          }`}
                        >
                          <img src={url} alt="preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="URL d'image optionnelle"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wide block">
                Adresse E-mail
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-white/30">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  required
                  autoComplete="email"
                  placeholder="Ex: issa.yatta@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* Password (except in forgot mode) */}
            {activeMode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wide block">
                    Mot de passe
                  </label>
                  {activeMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMode('forgot');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-[#8F83FF] hover:underline cursor-pointer focus:outline-none"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-white/30">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-white/30 hover:text-white/60 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeMode === 'create' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wide block">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-white/30">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Retapez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-white/30 hover:text-white/60 focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {passwordChecks.map(check => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold ${
                        check.done
                          ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]'
                          : 'bg-white/5 border-white/8 text-white/35'
                      }`}
                    >
                      <Check className="w-3 h-3 shrink-0" />
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMode === 'forgot' && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-semibold text-[#8F83FF] hover:underline cursor-pointer"
                >
                  Retour à la connexion
                </button>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-sm flex items-start space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D] text-sm flex items-start space-x-2 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-extrabold text-sm tracking-wide uppercase transition-all shadow-[0_4px_15px_rgba(108,92,255,0.3)] flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Traitement en cours...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {activeMode === 'login' 
                      ? "Se connecter" 
                      : activeMode === 'forgot'
                        ? "Recevoir le lien"
                        : "Créer mon compte"}
                  </span>
                </>
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

          </form>

        </div>

        {/* Footer info */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/40 font-bold uppercase tracking-wide">
          <span className="rounded-xl border border-white/5 bg-white/[0.03] py-2">RGPD</span>
          <span className="rounded-xl border border-white/5 bg-white/[0.03] py-2">Cloud sécurisé</span>
          <span className="rounded-xl border border-white/5 bg-white/[0.03] py-2">Famille privée</span>
        </div>

      </div>
    </div>
  );
};
