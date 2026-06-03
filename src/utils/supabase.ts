import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const capacitorPreferencesStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (e) {
      return localStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await Preferences.remove({ key });
    } catch (e) {
      localStorage.removeItem(key);
    }
  }
};

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
          autoRefreshToken: true,
          storage: capacitorPreferencesStorage
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

export function serializeCategoryIcon(icon: string | undefined, subcategories?: string[], isArchived?: boolean): string {
  const data = {
    icon: icon || '✨',
    subcategories: subcategories || [],
    isArchived: !!isArchived
  };
  return JSON.stringify(data);
}

export function deserializeCategoryIcon(serialized: string | undefined): { icon: string; subcategories: string[]; isArchived: boolean } {
  if (!serialized) {
    return { icon: '✨', subcategories: [], isArchived: false };
  }
  const trimmed = serialized.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        icon: parsed.icon || '✨',
        subcategories: Array.isArray(parsed.subcategories) ? parsed.subcategories : [],
        isArchived: !!parsed.isArchived
      };
    } catch (e) {
      // Fallback
    }
  }
  return { icon: serialized, subcategories: [], isArchived: false };
}

export interface TransactionMetadata {
  moduleSource?: string;
  entryTime?: string;
  entryDate?: string;
  travelId?: string;
  recurrenceInterval?: number;
  startDate?: string;
  endDate?: string;
  nextOccurrence?: string;
  createdBy?: string;
  categoryId?: string;
  subCategoryId?: string;
  [key: string]: any;
}

export function serializeTransactionComment(comment: string | null | undefined, metadata: TransactionMetadata): string {
  const cleanComment = comment || '';
  // filter out undefined/null properties from metadata to keep JSON small
  const cleanMeta: TransactionMetadata = {};
  for (const k in metadata) {
    if (metadata[k] !== undefined && metadata[k] !== null) {
      cleanMeta[k] = metadata[k];
    }
  }
  if (Object.keys(cleanMeta).length === 0) {
    return cleanComment;
  }
  return `__METADATA__:${JSON.stringify(cleanMeta)}__COMMENT__:${cleanComment}`;
}

export function deserializeTransactionComment(serialized: string | null | undefined): { comment: string; metadata: TransactionMetadata } {
  if (!serialized) {
    return { comment: '', metadata: {} };
  }
  const str = serialized.trim();
  if (str.startsWith('__METADATA__:') && str.includes('__COMMENT__:')) {
    const idx = str.indexOf('__COMMENT__:');
    const metaStr = str.substring('__METADATA__:'.length, idx);
    const comment = str.substring(idx + '__COMMENT__:'.length);
    try {
      const metadata = JSON.parse(metaStr);
      return { comment, metadata };
    } catch {
      // ignore
    }
  }
  return { comment: serialized, metadata: {} };
}

