import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let currentActiveUrl = '';
let currentActiveKey = '';

/**
 * Récupère le client Supabase unique.
 * Invalide et recrée l'instance si les clés ou l'URL changent (saisie en temps réel).
 */
export const getSupabaseClient = (customUrl?: string, customKey?: string): SupabaseClient | null => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');

  // Log de debug sécurisé pour aider l'utilisateur à voir si Vercel a bien injecté les variables
  console.log("[MaFamille+ DB Debug] VITE_SUPABASE_URL définie:", !!envUrl, "| VITE_SUPABASE_ANON_KEY valide:", envKey.startsWith('eyJ'));

  const isEnvValid = !!(envUrl && envKey && envKey.startsWith('eyJ'));

  const rawUrl = customUrl || (isEnvValid ? envUrl : localStorage.getItem('mf_sb_url')) || envUrl || '';
  const rawKey = customKey || (isEnvValid ? envKey : localStorage.getItem('mf_sb_key')) || envKey || '';

  const url = rawUrl.trim().replace(/^['"]|['"]$/g, '');
  const key = rawKey.trim().replace(/^['"]|['"]$/g, '');

  if (!url || !key) return null;

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
