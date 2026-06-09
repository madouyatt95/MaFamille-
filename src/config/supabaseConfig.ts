const cleanValue = (value: string | undefined): string => {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
};

export const FALLBACK_SUPABASE_URL = 'https://ravkssbaxcfhnzsemfrh.supabase.co';
export const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdmtzc2JheGNmaG56c2VtZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjE0MjQsImV4cCI6MjA5NjQzNzQyNH0.huIqaed9K0iD7fQaxdS89Tpl2HJ4vynvClyqvEjRm6o';

export const getConfiguredSupabaseUrl = (): string => {
  return cleanValue(import.meta.env.VITE_SUPABASE_URL) || FALLBACK_SUPABASE_URL;
};

export const getConfiguredSupabaseAnonKey = (): string => {
  return cleanValue(import.meta.env.VITE_SUPABASE_ANON_KEY) || FALLBACK_SUPABASE_ANON_KEY;
};

