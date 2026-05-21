import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let currentActiveUrl = '';
let currentActiveKey = '';

/**
 * Récupère le client Supabase unique.
 * Invalide et recrée l'instance si les clés ou l'URL changent (saisie en temps réel).
 */
const cleanInput = (val: string): string => {
  let cleaned = val.trim().replace(/^['"]|['"]$/g, '');
  if (cleaned.includes('=')) {
    cleaned = cleaned.substring(cleaned.indexOf('=') + 1).trim();
  }
  return cleaned.replace(/^['"]|['"]$/g, '');
};

export const getSupabaseClient = (customUrl?: string, customKey?: string): SupabaseClient | null => {
  const envUrl = cleanInput(import.meta.env.VITE_SUPABASE_URL || '');
  const envKey = cleanInput(import.meta.env.VITE_SUPABASE_ANON_KEY || '');

  // Log de debug sécurisé et informatif pour l'administrateur
  console.log("[MaFamille+ DB Debug] URL détectée :", envUrl ? `'${envUrl}'` : "VIDE", "| Clé valide :", envKey.startsWith('eyJ'));

  const isEnvValid = !!(envUrl && envKey && envKey.startsWith('eyJ') && (envUrl.startsWith('http://') || envUrl.startsWith('https://')));

  const rawUrl = customUrl || (isEnvValid ? envUrl : localStorage.getItem('mf_sb_url')) || envUrl || '';
  const rawKey = customKey || (isEnvValid ? envKey : localStorage.getItem('mf_sb_key')) || envKey || '';

  const url = cleanInput(rawUrl);
  const key = cleanInput(rawKey);

  // Validation stricte de format pour éviter l'exception d'initialisation Supabase
  if (!url || !key || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    console.warn("[MaFamille+ DB Warning] URL Supabase invalide ou non configurée :", url ? `'${url}'` : "VIDE");
    return null;
  }

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
