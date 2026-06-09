import { getSupabaseClient } from '../utils/supabase';

/**
 * Service centralisé pour la gestion de l'accès Premium et des quotas d'IA réelle.
 */

interface DailyAiUsage {
  date: string;
  count: number;
}

const DAILY_LIMIT = 10;

export const aiQuotaService = {
  /**
   * Obtient la date actuelle au format YYYY-MM-DD en heure locale.
   */
  getLocalDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Lit les données d'utilisation actuelles depuis le localStorage.
   */
  getUsage(): DailyAiUsage {
    const raw = localStorage.getItem('mf_daily_ai_usage');
    const today = this.getLocalDateString();
    
    if (!raw) {
      return { date: today, count: 0 };
    }

    try {
      const parsed: DailyAiUsage = JSON.parse(raw);
      if (parsed.date !== today) {
        return { date: today, count: 0 };
      }
      return parsed;
    } catch {
      return { date: today, count: 0 };
    }
  },

  /**
   * Enregistre les données d'utilisation dans le localStorage.
   */
  saveUsage(usage: DailyAiUsage): void {
    localStorage.setItem('mf_daily_ai_usage', JSON.stringify(usage));
  },

  /**
   * Vérifie si l'utilisateur a accès aux fonctionnalités Premium de l'IA réelle.
   * Si l'utilisateur est gratuit, déclenche le paywall et renvoie false.
   */
  checkAIPremiumAccess(isPremium: boolean, onTriggerPaywall?: () => void): boolean {
    if (!isPremium) {
      if (onTriggerPaywall) {
        onTriggerPaywall();
      } else {
        console.warn("[aiQuotaService] isPremium is false, paywall triggered but onTriggerPaywall was undefined.");
      }
      return false;
    }
    return true;
  },

  /**
   * Vérifie si l'utilisateur Premium a encore du quota sans le consommer.
   */
  hasQuotaAvailable(isPremium: boolean): boolean {
    if (!isPremium) return false;
    const usage = this.getUsage();
    return usage.count < DAILY_LIMIT;
  },

  /**
   * Autorise une tentative d'IA réelle côté client.
   * Le quota réel est consommé côté serveur/Supabase pour être commun à PWA, iOS et autres appareils.
   * Renvoie `true` si le quota d'IA réelle est alloué avec succès (utilisation de la vraie IA).
   * Renvoie `false` si le quota est dépassé (ou si non Premium), forçant le basculement transparent vers la version locale simulée.
   */
  consumeAIQuota(isPremium: boolean): boolean {
    if (!isPremium) {
      return false;
    }

    return true;
  },

  /**
   * Retourne le nombre d'appels d'IA réelle restants pour la journée.
   */
  getRemainingCalls(isPremium: boolean): number {
    if (!isPremium) {
      return 0;
    }
    return DAILY_LIMIT;
  },

  /**
   * Retourne la limite quotidienne d'appels d'IA réelle.
   */
  getDailyLimit(): number {
    return DAILY_LIMIT;
  },

  /**
   * Réinitialise complètement le compteur de quota (utile pour le développement).
   */
  resetQuota(): void {
    localStorage.removeItem('mf_daily_ai_usage');
    console.log('[aiQuotaService] Quota réinitialisé avec succès.');
  },

  async getAIProxyHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const foyerId = localStorage.getItem('mf_cloud_foyer_id') || localStorage.getItem('mf_active_foyer_id');
    if (foyerId) {
      headers['X-Foyer-Id'] = foyerId;
    }

    const supabase = getSupabaseClient();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  },

  async getAIResponseError(response: Response, provider: string): Promise<Error> {
    let detail = '';
    try {
      const data = await response.clone().json();
      detail = data?.error?.message || data?.error || data?.quota?.reason || JSON.stringify(data);
    } catch {
      try {
        detail = await response.clone().text();
      } catch {
        detail = '';
      }
    }

    const message = detail
      ? `${provider} API ${response.status}: ${detail}`
      : `${provider} API ${response.status}`;

    return new Error(message);
  },

  getQuotaFromResponse(response: Response, isPremium: boolean): { remaining: number; limit: number } {
    const limit = Number(response.headers.get('X-AI-Quota-Limit')) || DAILY_LIMIT;
    const remainingHeader = response.headers.get('X-AI-Quota-Remaining');
    const remaining = remainingHeader === null
      ? this.getRemainingCalls(isPremium)
      : Math.max(0, Number(remainingHeader) || 0);

    return { remaining, limit };
  }
};
