import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Récupère le client Supabase unique.
 * Priorité : arguments passés -> localStorage (saisie utilisateur facultative) -> variables d'environnement (.env).
 */
export const getSupabaseClient = (customUrl?: string, customKey?: string): SupabaseClient | null => {
  const url = customUrl || localStorage.getItem('mf_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const key = customKey || localStorage.getItem('mf_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) return null;

  try {
    return createClient(url, key, {
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
};
