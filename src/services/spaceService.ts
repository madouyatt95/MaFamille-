import { getSupabaseClient } from '../utils/supabase';

export interface Space {
  id: string;
  name: string;
}

const DEFAULT_ESTABLISHMENTS: Space[] = [
  { id: 'est-1', name: 'Collège Victor Hugo' },
  { id: 'est-2', name: 'Lycée Simone Veil' }
];

const DEFAULT_COMMUNES: Space[] = [
  { id: 'com-1', name: 'Cormeilles-en-Parisis' },
  { id: 'com-2', name: 'Ville de Paris' }
];

const safeParseJSON = (key: string, fallback: any) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return fallback;
  }
};

export const spaceService = {
  /**
   * --- ESTABLISHMENTS ---
   */
  async getEstablishments(): Promise<Space[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('establishments').select('*');
        if (!error && data) return data;
      } catch (e) {
        // Fallback silently to localStorage on PGRST205 or other DB errors
      }
    }
    return safeParseJSON('mf_establishments', DEFAULT_ESTABLISHMENTS);
  },

  async addEstablishment(name: string): Promise<Space> {
    const newEst: Space = {
      id: `est-${Date.now()}`,
      name: name.trim()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('establishments').insert(newEst).select().single();
        if (!error && data) return data;
      } catch (e) {
        // Fallback
      }
    }

    const current = await this.getEstablishments();
    const next = [...current, newEst];
    localStorage.setItem('mf_establishments', JSON.stringify(next));
    return newEst;
  },

  getActiveEstablishmentId(): string {
    const active = localStorage.getItem('mf_active_establishment_id');
    if (active) return active;
    return DEFAULT_ESTABLISHMENTS[0].id;
  },

  setActiveEstablishmentId(id: string): void {
    localStorage.setItem('mf_active_establishment_id', id);
  },

  /**
   * --- COMMUNES ---
   */
  async getCommunes(): Promise<Space[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('communes').select('*');
        if (!error && data) return data;
      } catch (e) {
        // Fallback
      }
    }
    return safeParseJSON('mf_communes', DEFAULT_COMMUNES);
  },

  async addCommune(name: string): Promise<Space> {
    const newCom: Space = {
      id: `com-${Date.now()}`,
      name: name.trim()
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('communes').insert(newCom).select().single();
        if (!error && data) return data;
      } catch (e) {
        // Fallback
      }
    }

    const current = await this.getCommunes();
    const next = [...current, newCom];
    localStorage.setItem('mf_communes', JSON.stringify(next));
    return newCom;
  },

  getActiveCommuneId(): string {
    const active = localStorage.getItem('mf_active_commune_id');
    if (active) return active;
    return DEFAULT_COMMUNES[0].id;
  },

  setActiveCommuneId(id: string): void {
    localStorage.setItem('mf_active_commune_id', id);
  },

  /**
   * --- SCHOOL GRADES PER ESTABLISHMENT ---
   */
  getGradesForEstablishment(estId: string): any[] {
    return safeParseJSON(`school_grades_${estId}`, []);
  },

  saveGradesForEstablishment(estId: string, grades: any[]): void {
    localStorage.setItem(`school_grades_${estId}`, JSON.stringify(grades));
  },

  /**
   * --- SCHOOL SCHEDULE PER ESTABLISHMENT ---
   */
  getScheduleForEstablishment(estId: string): any[] {
    const key = `school_schedule_${estId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return [];
  },

  saveScheduleForEstablishment(estId: string, schedule: any[]): void {
    localStorage.setItem(`school_schedule_${estId}`, JSON.stringify(schedule));
  },

  /**
   * --- SCHOOL TASKS (HOMEWORK) PER ESTABLISHMENT ---
   */
  getSchoolTasksForEstablishment(estId: string): any[] {
    const key = `school_tasks_${estId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return [];
  },

  saveSchoolTasksForEstablishment(estId: string, tasks: any[]): void {
    localStorage.setItem(`school_tasks_${estId}`, JSON.stringify(tasks));
  }
};
