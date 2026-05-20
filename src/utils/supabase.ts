import { createClient } from '@supabase/supabase-js';

// Récupération des clés par défaut de l'environnement ou du localStorage
const defaultUrl = import.meta.env.VITE_SUPABASE_URL || '';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const getSupabaseClient = (customUrl?: string, customKey?: string) => {
  const url = customUrl || localStorage.getItem('mf_sb_url') || defaultUrl;
  const key = customKey || localStorage.getItem('mf_sb_key') || defaultKey;

  if (!url || !key) return null;
  
  try {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (err) {
    console.error("Erreur d'initialisation du client Supabase :", err);
    return null;
  }
};
