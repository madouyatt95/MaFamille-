import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Client Supabase unique, initialisé depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseKey) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey, {
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
