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
  Camera
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';

interface OnboardingProps {
  onSuccess: (foyerId: string, memberRole: string) => void;
  onLogout: () => void;
  userEmail: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ 
  onLogout, 
  userEmail
}) => {
  const [activeMode, setActiveMode] = useState<'login' | 'create' | 'forgot'>('login');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur lors de l'envoi");
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
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              display_name: `${firstName.trim()} ${lastName.trim()}`,
              avatar_url: photoUrl.trim() || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName.trim()}`
            }
          }
        });

        if (error) throw error;

        setSuccessMessage("Votre compte MaFamille+ a été créé avec succès ! Connectez-vous maintenant pour commencer.");
        
        // Reset fields
        setFirstName('');
        setLastName('');
        setPhotoUrl('');
        setEmail('');
        setPassword('');
        
        // Redirect to login tab
        setActiveMode('login');
      }
    } catch (err: any) {
      console.error("[Onboarding Error]", err);
      setErrorMessage(err.message || "Une erreur est survenue.");
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
          <p className="text-xs sm:text-sm text-white/50 max-w-xs mx-auto">
            Le centre opérationnel de votre quotidien familial
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
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'login' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              Se Connecter
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('create');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'create' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* Panel Form */}
        <div className="glass-panel border border-white/8 rounded-[32px] p-6 sm:p-8 space-y-5 shadow-2xl relative bg-white/2 backdrop-blur-md">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Prénom et Nom (S'inscrire seulement) */}
            {activeMode === 'create' && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Prénom
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/30">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Issa"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Nom
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/30">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Yattabare"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Photo Avatar (S'inscrire seulement) */}
            {activeMode === 'create' && (
              <div className="space-y-2.5 animate-fade-in">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
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
                    placeholder="Ou collez l'URL d'une image"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                Adresse E-mail
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-white/30">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  required
                  placeholder="Ex: issa.yatta@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* Password (except in forgot mode) */}
            {activeMode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
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
                      className="text-[10px] font-semibold text-[#6C5CFF] hover:underline cursor-pointer focus:outline-none"
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
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

            {activeMode === 'forgot' && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[10px] font-semibold text-[#6C5CFF] hover:underline cursor-pointer"
                >
                  Retour à la connexion
                </button>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-[11px] flex items-start space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D] text-[11px] flex items-start space-x-2 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(108,92,255,0.3)] flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Traitement en cours...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {activeMode === 'login' 
                      ? "Se Connecter" 
                      : activeMode === 'forgot'
                        ? "Récupérer mon mot de passe"
                        : "S'inscrire"}
                  </span>
                </>
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

          </form>

        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-white/30 font-medium">
          MaFamille+ respecte la charte RGPD et protège vos données personnelles.
        </div>

      </div>
    </div>
  );
};
