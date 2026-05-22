import React, { useState, useEffect } from 'react';
import { 
  Home, 
  User, 
  Key, 
  ArrowRight,
  ShieldAlert,
  Mail,
  Lock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { foyerService } from '../services/foyerService';
import { getSupabaseClient } from '../utils/supabase';

interface OnboardingProps {
  onSuccess: (foyerId: string, memberRole: string) => void;
  onLogout: () => void;
  userEmail: string;
  onEnterDiscoverMode?: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ 
  onSuccess, 
  onLogout, 
  userEmail, 
  onEnterDiscoverMode 
}) => {
  const isInitiallyAuthenticated = !!userEmail;
  const [activeMode, setActiveMode] = useState<'login' | 'join' | 'create'>(
    isInitiallyAuthenticated ? 'create' : 'login'
  );
  
  const [displayName, setDisplayName] = useState('');
  const [foyerName, setFoyerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState<'parent' | 'child' | 'guest'>('child');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update default foyer name when user writes their prénom
  useEffect(() => {
    if (displayName && !foyerName) {
      setFoyerName(`Foyer de ${displayName}`);
    }
  }, [displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    const supabase = getSupabaseClient();

    // Field Validations
    if (activeMode !== 'login' && !displayName.trim()) {
      setErrorMessage("Veuillez saisir votre prénom.");
      return;
    }

    if (activeMode === 'create' && !foyerName.trim()) {
      setErrorMessage("Veuillez donner un nom à votre foyer.");
      return;
    }

    if (activeMode === 'join' && !inviteCode.trim()) {
      setErrorMessage("Veuillez entrer le code d'invitation.");
      return;
    }

    if (!isInitiallyAuthenticated && activeMode !== 'login') {
      if (!email.trim() || !password.trim()) {
        setErrorMessage("Veuillez remplir les champs email et mot de passe.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Le mot de passe doit faire au moins 6 caractères.");
        return;
      }
    }

    setLoading(true);

    try {
      if (activeMode === 'login') {
        // Authenticate existing user
        if (!supabase) throw new Error("Supabase n'est pas disponible.");
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        // The App component detects session changes, so it will update state
      } else if (isInitiallyAuthenticated) {
        // Already logged in - perform foyer actions immediately
        if (activeMode === 'create') {
          const data = await foyerService.createFoyer(foyerName.trim(), displayName.trim(), false);
          onSuccess(data.foyer_id, 'admin');
        } else {
          // Join existing foyer (needs head-of-family approval)
          const data = await foyerService.joinFoyer(inviteCode.trim(), displayName.trim(), role);
          onSuccess(data.foyer_id, data.role);
        }
      } else {
        // Not logged in - register first, saving details to localStorage for post-auth trigger
        if (!supabase) throw new Error("Supabase n'est pas disponible.");
        
        localStorage.setItem('pending_display_name', displayName.trim());
        if (activeMode === 'join') {
          localStorage.setItem('pending_invite_code', inviteCode.trim().toUpperCase());
          localStorage.setItem('pending_role', role);
        } else {
          localStorage.removeItem('pending_invite_code');
          localStorage.removeItem('pending_role');
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });

        if (error) throw error;

        setSuccessMessage(
          activeMode === 'join' 
            ? "Compte créé ! Votre demande d'adhésion a été enregistrée et sera soumise à validation du Chef de famille dès votre connexion."
            : "Compte créé ! Votre foyer sera automatiquement créé lors de votre première connexion."
        );
        
        // Reset fields
        setEmail('');
        setPassword('');
        setDisplayName('');
        setFoyerName('');
        setInviteCode('');
        
        // Redirect to login tab
        setActiveMode('login');
      }
    } catch (err: any) {
      console.error("[Onboarding Error]", err);
      // Clear localStorage on error
      localStorage.removeItem('pending_display_name');
      localStorage.removeItem('pending_invite_code');
      localStorage.removeItem('pending_role');
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
            {isInitiallyAuthenticated 
              ? `Authentifié en tant que ${userEmail}` 
              : "Le centre opérationnel de votre quotidien familial"}
          </p>
        </div>

        {/* Tab Selection */}
        {!isInitiallyAuthenticated && (
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveMode('login');
                setErrorMessage(null);
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
                setActiveMode('join');
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'join' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              Rejoindre
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('create');
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'create' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              S'inscrire
            </button>
          </div>
        )}

        {isInitiallyAuthenticated && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveMode('create');
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'create' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              Créer un Foyer
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('join');
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'join' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'
              }`}
            >
              Rejoindre un Foyer
            </button>
          </div>
        )}

        {/* Panel Form */}
        <div className="glass-panel border border-white/8 rounded-[32px] p-6 sm:p-8 space-y-5 shadow-2xl relative">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Prénom (Only if joining or creating) */}
            {activeMode !== 'login' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Votre Prénom
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-white/30">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Amadou, Sarah, Papa..."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                  />
                </div>
              </div>
            )}

            {/* If S'inscrire (create foyer) */}
            {activeMode === 'create' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Nom du Foyer
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-white/30">
                    <Home className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Famille Martin, Notre Foyer..."
                    value={foyerName}
                    onChange={(e) => setFoyerName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                  />
                </div>
                <p className="text-[9px] text-white/30 leading-normal">
                  Vous serez le créateur et l'administrateur principal (Chef de famille) de ce foyer.
                </p>
              </div>
            )}

            {/* If Rejoindre (join foyer) */}
            {activeMode === 'join' && (
              <div className="space-y-4 animate-fade-in">
                {/* Code d'invitation */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Code d'Invitation (ex: FAM-XXXXX)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-white/30">
                      <Key className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      required
                      placeholder="FAM-XXXXX"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Votre Rôle
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['parent', 'child', 'guest'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer capitalize ${
                          role === r 
                            ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-sm' 
                            : 'bg-white/5 border-transparent text-white/50 hover:text-white hover:bg-white/8'
                        }`}
                      >
                        {r === 'parent' ? 'Parent 👨‍👩‍👧' : r === 'child' ? 'Enfant 🧒' : 'Invité 👥'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-yellow-500/80 leading-normal flex items-start space-x-1.5 mt-1 bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10">
                    <span className="text-xs">⚠️</span>
                    <span>Cette demande est soumise à validation et approbation du Chef de Famille avant d'être effective.</span>
                  </p>
                </div>
              </div>
            )}

            {/* Email and Password inputs (If NOT authenticated) */}
            {!isInitiallyAuthenticated && (
              <div className="space-y-4 border-t border-white/5 pt-4 animate-fade-in">
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
                      placeholder="Ex: amadou@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-white/30">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>
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
              className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(108,92,255,0.3)] hover:shadow-[0_4px_20px_rgba(108,92,255,0.5)] flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span>Traitement en cours...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {activeMode === 'login' 
                      ? "Se Connecter" 
                      : activeMode === 'create' 
                        ? (isInitiallyAuthenticated ? "Créer le Foyer" : "S'inscrire et Créer un Foyer")
                        : (isInitiallyAuthenticated ? "Envoyer la demande d'adhésion" : "S'inscrire et Rejoindre le Foyer")}
                  </span>
                </>
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

          </form>

        </div>

        {/* Footer actions */}
        <div className="flex flex-col items-center space-y-3.5 pt-2">
          {isInitiallyAuthenticated ? (
            <button
              onClick={onLogout}
              className="text-white/40 hover:text-[#FF4D6D] text-xs font-semibold underline underline-offset-4 transition-colors cursor-pointer"
            >
              Se déconnecter de mon compte
            </button>
          ) : (
            onEnterDiscoverMode && (
              <button
                type="button"
                onClick={onEnterDiscoverMode}
                className="text-xs font-semibold text-white/50 hover:text-[#00D26A] transition-colors flex items-center space-x-1 cursor-pointer bg-white/5 px-4 py-2 rounded-full border border-white/5"
              >
                <span>Découvrir l'application (Mode Démo)</span>
                <span>➔</span>
              </button>
            )
          )}
        </div>

      </div>
    </div>
  );
};
