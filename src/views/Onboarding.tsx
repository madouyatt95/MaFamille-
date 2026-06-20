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
  ShieldCheck,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          redirectTo: 'https://ma-famille-nu.vercel.app'
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
            emailRedirectTo: 'https://ma-famille-nu.vercel.app',
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              display_name: `${firstName.trim()} ${lastName.trim()}`,
              avatar_url: null
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage("Votre compte MyFamily+ est créé. Préparation de votre espace familial...");
          onSuccess('', 'pending');
        } else {
          setSuccessMessage("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.");
        }
        
        // Reset fields
        setFirstName('');
        setLastName('');
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
            MyFamily+
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
                {activeMode === 'create' ? 'Bienvenue dans MyFamily+' : activeMode === 'forgot' ? 'Réinitialiser le mot de passe' : 'Ravi de vous revoir'}
              </h2>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#00D26A]" />
            </div>
          </div>

          {activeMode === 'create' && (
            <p className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 p-3 text-xs leading-relaxed text-white/65">
              Après confirmation de votre e-mail, vous pourrez créer une famille ou rejoindre un foyer avec son code d’invitation.
            </p>
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
                {(password || confirmPassword) && (
                  <p className={`flex items-center gap-1.5 text-xs font-bold ${
                    password.length >= 6 && password === confirmPassword ? 'text-[#00D26A]' : 'text-white/40'
                  }`}>
                    <Check className="w-3 h-3 shrink-0" />
                    6 caractères minimum et deux mots de passe identiques
                  </p>
                )}
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
