import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Récupère le client Supabase unique.
 * Priorité : 
 * 1. Clés réelles fournies en arguments.
 * 2. Clés valides du fichier .env (si la clé commence bien par 'eyJ' pour éviter les fausses clés).
 * 3. Clés saisies par l'utilisateur dans localStorage en secours.
 */
export const getSupabaseClient = (customUrl?: string, customKey?: string): SupabaseClient | null => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  // Vérifie si les clés du .env sont réelles (les JWT de Supabase commencent toujours par 'eyJ')
  const isEnvValid = envUrl && envKey && envKey.trim().startsWith('eyJ');

  const url = customUrl || (isEnvValid ? envUrl : localStorage.getItem('mf_supabase_url')) || envUrl || '';
  const key = customKey || (isEnvValid ? envKey : localStorage.getItem('mf_supabase_key')) || envKey || '';

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
