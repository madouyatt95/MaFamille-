/**
 * Service centralisé pour la gestion de l'accès Premium et des quotas d'IA réelle.
 */

interface DailyAiUsage {
  date: string;
  count: number;
}

const DAILY_LIMIT = 20;

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
   * Consomme une unité du quota d'IA réelle si l'utilisateur est Premium et a du quota disponible.
   * Renvoie `true` si le quota d'IA réelle est alloué avec succès (utilisation de la vraie IA).
   * Renvoie `false` si le quota est dépassé (ou si non Premium), forçant le basculement transparent vers la version locale simulée.
   */
  consumeAIQuota(isPremium: boolean): boolean {
    if (!isPremium) {
      return false;
    }

    const usage = this.getUsage();
    if (usage.count < DAILY_LIMIT) {
      usage.count += 1;
      this.saveUsage(usage);
      console.log(`[aiQuotaService] Appel IA réelle consommé. (${usage.count}/${DAILY_LIMIT} aujourd'hui)`);
      return true;
    }

    console.warn(`[aiQuotaService] Quota d'IA réelle épuisé (${usage.count}/${DAILY_LIMIT}). Basculement vers l'IA simulée locale.`);
    return false;
  },

  /**
   * Retourne le nombre d'appels d'IA réelle restants pour la journée.
   */
  getRemainingCalls(isPremium: boolean): number {
    if (!isPremium) {
      return 0;
    }
    const usage = this.getUsage();
    return Math.max(0, DAILY_LIMIT - usage.count);
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
  }
};
