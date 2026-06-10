const cleanValue = (value: string | undefined): string => {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
};

export const FALLBACK_SUPABASE_URL = 'https://ravkssbaxcfhnzsemfrh.supabase.co';
export const FALLBACK_SUPABASE_ANON_KEY = '';

export const getConfiguredSupabaseUrl = (): string => {
  return cleanValue(import.meta.env.VITE_SUPABASE_URL) || FALLBACK_SUPABASE_URL;
};

export const getConfiguredSupabaseAnonKey = (): string => {
  return cleanValue(import.meta.env.VITE_SUPABASE_ANON_KEY) || FALLBACK_SUPABASE_ANON_KEY;
};
