import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Sparkles, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';

interface PasswordRecoveryViewProps {
  onClose: () => void;
}

export const PasswordRecoveryView: React.FC<PasswordRecoveryViewProps> = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase n'est pas disponible.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Impossible de réinitialiser le mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111F] text-white flex flex-col justify-center px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto space-y-6 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Nouveau Mot de Passe
          </h1>
          <p className="text-xs sm:text-sm text-white/50 max-w-xs mx-auto">
            Saisissez votre nouveau mot de passe pour sécuriser votre compte.
          </p>
        </div>

        <div className="glass-panel border border-white/8 rounded-[32px] p-6 sm:p-8 space-y-5 shadow-2xl">
          {success ? (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="inline-flex p-4 rounded-3xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] mb-2 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold">Mot de passe réinitialisé !</h2>
              <p className="text-xs text-white/50 leading-relaxed">
                Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter à votre compte.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(108,92,255,0.3)] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Accéder à la connexion</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Nouveau mot de passe
                </label>
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
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D] text-[11px] flex items-start space-x-2 animate-shake">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#6C5CFF] hover:bg-[#5b4eff] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_4px_15px_rgba(108,92,255,0.3)] hover:shadow-[0_4px_20px_rgba(108,92,255,0.5)] flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span>Mise à jour en cours...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sauvegarder le mot de passe</span>
                  </>
                )}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
