import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let currentActiveUrl = '';
let currentActiveKey = '';

/**
 * Récupère le client Supabase unique.
 * Invalide et recrée l'instance si les clés ou l'URL changent (saisie en temps réel).
 */
export const getSupabaseClient = (customUrl?: string, customKey?: string): SupabaseClient | null => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  // Vérifie si les clés du .env sont réelles (les JWT de Supabase commencent toujours par 'eyJ')
  const isEnvValid = envUrl && envKey && envKey.trim().startsWith('eyJ');

  const url = customUrl || (isEnvValid ? envUrl : localStorage.getItem('mf_sb_url')) || envUrl || '';
  const key = customKey || (isEnvValid ? envKey : localStorage.getItem('mf_sb_key')) || envKey || '';

  if (!url || !key) return null;

  // Si l'URL ou la Clé a changé, on invalide l'ancienne instance pour en recréer une nouvelle
  if (url !== currentActiveUrl || key !== currentActiveKey) {
    supabaseInstance = null;
    currentActiveUrl = url;
    currentActiveKey = key;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        },
        realtime: {
          params: { eventsPerSecond: 10 }
        }
      });
    } catch (err) {
      console.error("Erreur d'initialisation du client Supabase :", err);
      return null;
    }
  }

  return supabaseInstance;
};
