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
  if (localStorage.getItem('mf_demo_active') === 'true') {
    return null;
  }

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

export function getModuleIdFromTransaction(t: any): string | null {
  if (t.moduleSource && t.moduleSource !== 'budget') {
    return t.moduleSource;
  }
  const cat = (t.category || '').toLowerCase().trim();
  if (cat === 'alimentation' || cat === 'courses') return 'courses';
  if (cat === 'santé' || cat === 'sante') return 'sante';
  if (cat === 'transport' || cat === 'véhicules' || cat === 'vehicules') return 'vehicules';
  if (cat === 'logement') return 'logement';
  if (cat === 'voyages' || cat === 'voyage') return 'voyages';
  if (cat === 'éducation' || cat === 'education' || cat === 'école' || cat === 'ecole') return 'ecole';
  if (cat === 'administratif' || cat === 'démarches' || cat === 'demarches') return 'demarches';
  if (cat === 'animaux') return 'animaux';
  if (cat === 'argent de poche') return 'argent_de_poche';
  if (cat === 'tâches' || cat === 'taches') return 'taches';
  return null;
}

export interface EventDescriptionMetadata {
  doctor?: string;
  reminder?: string;
  note?: string;
  documentUrl?: string;
  isArchived?: boolean;
  [key: string]: any;
}

export function serializeEventDescription(descriptionText: string | null | undefined, metadata: EventDescriptionMetadata): string {
  const cleanDesc = descriptionText || '';
  const cleanMeta: EventDescriptionMetadata = {};
  for (const k in metadata) {
    if (metadata[k] !== undefined && metadata[k] !== null) {
      cleanMeta[k] = metadata[k];
    }
  }
  if (Object.keys(cleanMeta).length === 0) {
    return cleanDesc;
  }
  return `__METADATA__:${JSON.stringify(cleanMeta)}__DESCRIPTION__:${cleanDesc}`;
}

export function deserializeEventDescription(serialized: string | null | undefined): { description: string; metadata: EventDescriptionMetadata } {
  if (!serialized) {
    return { description: '', metadata: {} };
  }
  const str = serialized.trim();
  if (str.startsWith('__METADATA__:') && str.includes('__DESCRIPTION__:')) {
    const idx = str.indexOf('__DESCRIPTION__:');
    const metaStr = str.substring('__METADATA__:'.length, idx);
    const description = str.substring(idx + '__DESCRIPTION__:'.length);
    try {
      const metadata = JSON.parse(metaStr);
      return { description, metadata };
    } catch {
      // ignore
    }
  }
  return { description: serialized, metadata: { doctor: serialized } };
}

/**
 * Log the volume of data fetched from Supabase for a given table and action.
 */
export function logQueryVolume(tableName: string, action: string, data: any) {
  if (!data) return;
  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;
    const sizeInKb = (sizeInBytes / 1024).toFixed(2);
    
    console.log(
      `📊 [Supabase Network Log] Table: "${tableName}" | Action: ${action} | ` +
      `Rows: ${Array.isArray(data) ? data.length : 1} | Est. Size: ${sizeInKb} KB`
    );
    
    if (sizeInBytes > 500 * 1024) {
      console.warn(
        `⚠️ [ALERTE CHARGE UTILE] La table "${tableName}" a renvoyé une charge lourde de ${sizeInKb} KB ! ` +
        `Contient probablement des fichiers Base64.`
      );
    }
  } catch (e) {
    console.warn("[Supabase Network Log] Failed to calculate size:", e);
  }
}
