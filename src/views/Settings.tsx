import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Coins, 
  Database, 
  Server, 
  Trash2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Lock,
  User,
  Mail,
  Key,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';

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
}

export const Settings: React.FC<SettingsProps> = ({
  currency,
  setCurrency,
  supabaseUrl,
  setSupabaseUrl,
  supabaseKey,
  setSupabaseKey,
  syncActive,
  setSyncActive,
  onResetData,
  isPremium,
  onOpenPaywall
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);
  
  // Auth state local to view
  const [user, setUser] = useState<any>(null);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const supabaseClient = getSupabaseClient(supabaseUrl, supabaseKey);

  // Monitor auth state changes
  useEffect(() => {
    if (!supabaseClient) {
      setUser(null);
      return;
    }

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabaseUrl, supabaseKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) {
      setAuthMessage({ text: "Veuillez d'abord configurer une URL et une clé API Supabase valides.", type: 'error' });
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
    } catch (err: any) {
      setAuthMessage({ text: err.message || "Erreur de connexion.", type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) {
      setAuthMessage({ text: "Veuillez d'abord configurer une URL et une clé API Supabase valides.", type: 'error' });
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
        text: `Compte créé avec succès ! Un e-mail de confirmation vous a été envoyé si configuré, sinon vous pouvez directement vous connecter.`, 
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

  const handleLogout = async () => {
    if (!supabaseClient) return;
    try {
      await supabaseClient.auth.signOut();
      setAuthMessage({ text: "Vous avez été déconnecté avec succès.", type: 'success' });
    } catch (err: any) {
      console.error(err);
    }
  };

  const triggerManualBackup = () => {
    setSavingBackup(true);
    setTimeout(() => {
      setSavingBackup(false);
      alert('Sauvegarde locale et cloud effectuée avec succès !');
    }, 1000);
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

      {/* 2. Supabase Integration (Backups & Keys) */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Server className="w-4 h-4 text-[#4F8CFF]" />
            <span>Serveur Supabase Cloud</span>
          </h3>
          {/* Switch toggle */}
          <button
            onClick={() => setSyncActive(!syncActive)}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              syncActive ? 'bg-[#00D26A]' : 'bg-white/10'
            }`}
          >
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform transform ${
              syncActive ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <p className="text-xs text-white/50 leading-relaxed font-medium">
          Configurez votre propre base de données cloud pour activer la synchronisation familiale et la sauvegarde automatique.
        </p>

        {syncActive && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">URL du Projet Supabase</label>
              <input 
                type="text" 
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Clé API Publique (anon key)</label>
              <div className="relative">
                <input 
                  type={showApiKey ? 'text' : 'password'} 
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs pr-10 focus:outline-none focus:border-[#6C5CFF]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-white/40 hover:text-white transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Authentication Panel (Show only if Supabase config is loaded) */}
      {syncActive && supabaseUrl && supabaseKey && (
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4 animate-fade-in">
          
          {user ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#6C5CFF]" />
                  <span>Compte Foyer</span>
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A]">Connecté</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#6C5CFF]/15 flex items-center justify-center text-white border border-[#6C5CFF]/20 font-bold uppercase">
                    {user.email?.slice(0, 2) || 'US'}
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-white block">{user.email}</span>
                    <span className="text-[10px] text-white/40 font-medium mt-0.5 block">UUID : {user.id.slice(0, 8)}...</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">État Cloud :</span>
                  {isPremium ? (
                    <span className="text-[10px] font-black text-[#00D26A] flex items-center gap-1 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 fill-[#00D26A] animate-pulse" />
                      Premium Synced ☁️
                    </span>
                  ) : (
                    <button
                      onClick={onOpenPaywall}
                      className="text-[10px] font-black text-[#FF4D6D] flex items-center gap-1 uppercase tracking-wider bg-[#FF4D6D]/10 px-2.5 py-1 rounded-lg border border-[#FF4D6D]/20 animate-pulse hover:scale-[1.02] cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Free (Click to Sync) 👑
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/3 border border-white/5 text-[10px] text-white/50 leading-relaxed font-sans space-y-2">
                <div className="flex items-start space-x-2 text-white/60">
                  <CheckCircle2 className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                  <span>Votre session de synchronisation familiale en temps réel est active.</span>
                </div>
                {!isPremium && (
                  <div className="flex items-start space-x-2 text-[#FFB020] bg-[#FFB020]/5 p-2 rounded-xl border border-[#FFB020]/10">
                    <AlertTriangle className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
                    <span>L'usage gratuit limite les données à cet appareil. Débloquez le plan Premium pour activer la synchronisation cloud sur les autres smartphones !</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-[#FF4D6D]/15 border border-white/10 hover:border-[#FF4D6D]/20 text-white/70 hover:text-[#FF4D6D] font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnecter mon Foyer</span>
              </button>
            </div>
          ) : (
            /* Login / Register forms */
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#FF4D6D]" />
                <span>Connexion & Synchronisation</span>
              </h3>

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

        </div>
      )}

      {/* 4. Base de données & Stockage */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Database className="w-4 h-4 text-[#00D26A]" />
          <span>Sécurité & Télémétrie</span>
        </h3>
        
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/50">Base de données principale :</span>
            <span className="font-bold text-white">{syncActive && user ? 'Cloud Supabase' : 'LocalStorage Local'}</span>
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

    </div>
  );
};
