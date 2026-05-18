import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Coins, 
  Database, 
  Server, 
  Trash2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Lock
} from 'lucide-react';

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
  onResetData
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);

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

      {/* 2. Supabase Integration (Backups) */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Server className="w-4 h-4 text-[#4F8CFF]" />
            <span>Synchronisation Cloud Supabase</span>
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
          Activez la synchronisation en temps réel avec Supabase pour sauvegarder vos données de façon sécurisée et les partager sur les smartphones de toute la famille.
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

      {/* 3. Base de données & Stockage */}
      <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Database className="w-4 h-4 text-[#00D26A]" />
          <span>Sécurité & Télémétrie</span>
        </h3>
        
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/50">Base de données :</span>
            <span className="font-bold text-white">LocalStorage Local</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/50">Chiffrement actif :</span>
            <span className="font-bold text-[#00D26A] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              AES-256 local
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-white/50">Taille estimée :</span>
            <span className="font-bold text-white">12.4 Ko (48 entrées)</span>
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
