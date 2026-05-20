import React, { useState } from 'react';
import { 
  Home, 
  Link as LinkIcon, 
  User, 
  Plus, 
  Key, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { foyerService } from '../services/foyerService';

interface OnboardingProps {
  onSuccess: (foyerId: string, memberRole: string) => void;
  onLogout: () => void;
  userEmail: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSuccess, onLogout, userEmail }) => {
  const [activeMode, setActiveMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [foyerName, setFoyerName] = useState("Foyer " + (userEmail.split('@')[0] || ''));
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState<'parent' | 'child' | 'guest'>('parent');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage("Veuillez saisir votre nom d'affichage.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (activeMode === 'create') {
        if (!foyerName.trim()) {
          setErrorMessage("Veuillez donner un nom à votre foyer.");
          setLoading(false);
          return;
        }
        const data = await foyerService.createFoyer(foyerName.trim(), displayName.trim(), false);
        onSuccess(data.foyer_id, 'admin');
      } else {
        if (!inviteCode.trim()) {
          setErrorMessage("Veuillez entrer un code d'invitation.");
          setLoading(false);
          return;
        }
        const data = await foyerService.joinFoyer(inviteCode.trim(), displayName.trim(), role);
        onSuccess(data.foyer_id, data.role);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Une erreur est survenue lors de l'opération.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-3xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF] animate-pulse">
            <Home className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Rejoignez l'Aventure Familiale
          </h1>
          <p className="text-xs sm:text-sm text-white/50 max-w-xs mx-auto">
            Connecté avec <span className="text-[#6C5CFF] font-semibold">{userEmail}</span>
          </p>
        </div>

        {/* Form panel */}
        <div className="glass-panel border border-white/8 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative">
          
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => {
                setActiveMode('create');
                setRole('parent');
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeMode === 'create' ? 'bg-[#6C5CFF] text-white shadow-lg' : 'text-white/40 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer un Foyer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('join');
                setRole('child');
                setErrorMessage(null);
              }}
              className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeMode === 'join' ? 'bg-[#6C5CFF] text-white shadow-lg' : 'text-white/40 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Rejoindre</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                Votre Nom d'Affichage
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-white/30">
                  <User className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Papa, Maman, Amadou..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* Mode Specific Inputs */}
            {activeMode === 'create' ? (
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
                <p className="text-[10px] text-white/40 pt-1 leading-normal">
                  Vous serez le créateur et l'administrateur principal de ce nouveau foyer.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                
                {/* Invite Code Input */}
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
                      placeholder="Saisissez le code reçu..."
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF] focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Votre Rôle
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['parent', 'child', 'guest'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r as any)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer capitalize ${
                          role === r 
                            ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white' 
                            : 'bg-white/5 border-transparent text-white/50 hover:text-white hover:bg-white/8'
                        }`}
                      >
                        {r === 'parent' ? 'Parent 👨‍👩‍👧' : r === 'child' ? 'Enfant 🧒' : 'Invité 👥'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] flex items-start space-x-2 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? "Chargement..." : activeMode === 'create' ? "Créer mon Foyer" : "Rejoindre le Foyer"}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

          </form>

        </div>

        {/* Secondary controls */}
        <div className="text-center pt-2">
          <button
            onClick={onLogout}
            className="text-white/40 hover:text-[#FF4D6D] text-xs font-semibold underline underline-offset-4 transition-colors cursor-pointer"
          >
            Se déconnecter de mon compte
          </button>
        </div>

      </div>
    </div>
  );
};
