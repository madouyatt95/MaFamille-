import type { FamilyEvent, Member, EventType } from '../types';
import type { ExternalEvent } from './icalParser';

export interface UnifiedEvent {
  id: string;
  family_id: string;
  title: string;
  description: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  start_time: string; // HH:MM or ""
  end_time: string;   // HH:MM or ""
  all_day: boolean;
  source_module: 'agenda' | 'sante' | 'voyages' | 'demarches' | 'ecole' | 'taches' | 'vehicules' | 'logement' | 'budget' | 'external' | 'fetes' | 'animaux' | 'membres';
  source_id: string;
  event_type: EventType | 'fete' | 'birthday';
  member_id?: string;
  color?: string;
  done?: boolean;
}

// Meeus/Jones/Butcher algorithm to calculate Gregorian Easter date
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Generates holidays for the specified country and year
export function getHolidays(country: string, year: number): { name: string; date: string }[] {
  const list: { name: string; date: string }[] = [];
  const fmt = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Christian movable holidays
  const easter = getEasterDate(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39); // 39 days after Easter Sunday (always a Thursday)
  
  const pentecostMonday = new Date(easter);
  pentecostMonday.setDate(easter.getDate() + 50); // 50 days after Easter Sunday

  if (country === 'France') {
    // Static holidays
    list.push({ name: "Jour de l'An", date: `${year}-01-01` });
    list.push({ name: "Fête du Travail", date: `${year}-05-01` });
    list.push({ name: "Victoire 1945", date: `${year}-05-08` });
    list.push({ name: "Fête Nationale", date: `${year}-07-14` });
    list.push({ name: "Assomption", date: `${year}-08-15` });
    list.push({ name: "Toussaint", date: `${year}-11-01` });
    list.push({ name: "Armistice 1918", date: `${year}-11-11` });
    list.push({ name: "Noël", date: `${year}-12-25` });

    // Movable
    list.push({ name: "Lundi de Pâques", date: fmt(easterMonday) });
    list.push({ name: "Ascension", date: fmt(ascension) });
    list.push({ name: "Lundi de Pentecôte", date: fmt(pentecostMonday) });
  } 
  else if (country === 'Sénégal') {
    // Static
    list.push({ name: "Jour de l'An", date: `${year}-01-01` });
    list.push({ name: "Fête de l'Indépendance", date: `${year}-04-04` });
    list.push({ name: "Fête du Travail", date: `${year}-05-01` });
    list.push({ name: "Assomption", date: `${year}-08-15` });
    list.push({ name: "Toussaint", date: `${year}-11-01` });
    list.push({ name: "Noël", date: `${year}-12-25` });

    // Movable Christian
    list.push({ name: "Lundi de Pâques", date: fmt(easterMonday) });
    list.push({ name: "Ascension", date: fmt(ascension) });
    list.push({ name: "Lundi de Pentecôte", date: fmt(pentecostMonday) });

    // Senegal also celebrates Muslim holidays. We hardcode approximations for 2026:
    if (year === 2026) {
      list.push({ name: "Korité (Aïd al-Fitr) *", date: "2026-03-20" });
      list.push({ name: "Tabaski (Aïd al-Adha) *", date: "2026-05-27" });
      list.push({ name: "Tamkharit (Achoura) *", date: "2026-06-25" });
      list.push({ name: "Maouloud (Mawlid) *", date: "2026-09-04" });
    }
  } 
  else if (country === 'Comores') {
    // Static Comoros
    list.push({ name: "Jour de l'An", date: `${year}-01-01` });
    list.push({ name: "Journée Ali Soilih", date: `${year}-01-26` });
    list.push({ name: "Fête du Travail", date: `${year}-05-01` });
    list.push({ name: "Fête de l'Indépendance", date: `${year}-07-06` });
    list.push({ name: "Journée de l'ONU", date: `${year}-11-12` });
    list.push({ name: "Noël", date: `${year}-12-25` });

    // Comoros Muslim holidays (2026):
    if (year === 2026) {
      list.push({ name: "Aïd al-Fitr (Korité) *", date: "2026-03-20" });
      list.push({ name: "Aïd al-Adha (Tabaski) *", date: "2026-05-27" });
      list.push({ name: "Nouvel An de l'Hégire *", date: "2026-06-16" });
      list.push({ name: "Achoura *", date: "2026-06-25" });
      list.push({ name: "Mawlid al-Nabi *", date: "2026-09-04" });
    }
  }

  return list.sort((a, b) => a.date.localeCompare(b.date));
}

interface GetUnifiedEventsArgs {
  events: FamilyEvent[];
  members: Member[];
  trips: any[];
  vaccines: any[];
  schoolTasks: any[];
  tasks: any[];
  demarches: any[];
  vehicles: any[];
  maintenance: any[];
  abonnements: any[];
  pets: any[];
  externalEvents: ExternalEvent[];
  country: string;
  foyerId?: string;
}

export function getUnifiedEvents({
  events,
  members,
  trips,
  vaccines,
  schoolTasks,
  tasks,
  demarches,
  vehicles,
  maintenance,
  abonnements,
  pets,
  externalEvents,
  country = 'France',
  foyerId = 'default'
}: GetUnifiedEventsArgs): UnifiedEvent[] {
  const unifiedList: UnifiedEvent[] = [];

  // Helper for safety checks
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());
  const currentYear = new Date().getFullYear();

  // 1. ADD HOLIDAYS (Fêtes et jours fériés)
  // Support current, past, and next year
  [currentYear - 1, currentYear, currentYear + 1].forEach(y => {
    const countryHolidays = getHolidays(country, y);
    countryHolidays.forEach((h, idx) => {
      unifiedList.push({
        id: `holiday-${country}-${y}-${idx}`,
        family_id: foyerId,
        title: `🎉 ${h.name}`,
        description: `Jour férié (${country})`,
        start_date: h.date,
        end_date: h.date,
        start_time: '',
        end_time: '',
        all_day: true,
        source_module: 'fetes',
        source_id: `holiday-${y}-${idx}`,
        event_type: 'fete',
        color: '#FFB020' // Gold/yellow color for holidays
      });
    });
  });

  // 2. ADD HEALTH (Vaccines)
  vaccines
    .filter(v => v.status !== 'Archivé' && !v.isArchived)
    .forEach(v => {
      const vDate = v.date || todayStr;
      unifiedList.push({
        id: `vac-${v.id}`,
        family_id: foyerId,
        title: `🏥 Vaccin : ${v.name}`,
        description: `Médecin: ${v.doctor || 'non précisé'}${v.note ? ' | Note: ' + v.note : ''}${v.reminder ? ' | Rappel: ' + v.reminder : ''}`,
        start_date: vDate,
        end_date: vDate,
        start_time: v.time || '',
        end_time: '',
        all_day: !v.time,
        source_module: 'sante',
        source_id: v.id,
        event_type: 'vaccine',
        member_id: v.memberId,
        done: v.status === 'Fait'
      });
    });

  // 3. ADD TRIPS (Departures and Returns)
  trips.forEach(t => {
    const isValidDate = (dStr: string) => {
      if (!dStr) return false;
      const lower = dStr.toLowerCase();
      if (lower.includes('invalid') || lower.includes('non') || lower.includes('planifi')) return false;
      const d = new Date(dStr);
      return !isNaN(d.getTime());
    };

    if (t.startDate && isValidDate(t.startDate)) {
      unifiedList.push({
        id: `trip-dep-${t.id}`,
        family_id: foyerId,
        title: `✈️ Départ : ${t.destination}`,
        description: `Départ pour le voyage à ${t.destination}. Budget : ${t.budget}€`,
        start_date: t.startDate,
        end_date: t.startDate,
        start_time: '09:00',
        end_time: '',
        all_day: false,
        source_module: 'voyages',
        source_id: t.id,
        event_type: 'social',
        member_id: 'Foyer'
      });
    }

    if (t.endDate && isValidDate(t.endDate)) {
      unifiedList.push({
        id: `trip-ret-${t.id}`,
        family_id: foyerId,
        title: `🛬 Retour : ${t.destination}`,
        description: `Retour du voyage à ${t.destination}.`,
        start_date: t.endDate,
        end_date: t.endDate,
        start_time: '18:00',
        end_time: '',
        all_day: false,
        source_module: 'voyages',
        source_id: t.id,
        event_type: 'social',
        member_id: 'Foyer'
      });
    }
  });

  // 4. ADD DEMARCHES (DocsBox)
  demarches
    .filter(d => d.status !== 'completed' && d.status !== 'archived')
    .forEach(d => {
      const dDate = d.dueDate || d.createdAt?.split('T')[0] || todayStr;
      unifiedList.push({
        id: `demarche-${d.id}`,
        family_id: foyerId,
        title: `${d.icon || '📄'} Démarche : ${d.title}`,
        description: `Statut : ${d.status}`,
        start_date: dDate,
        end_date: dDate,
        start_time: '11:00',
        end_time: '',
        all_day: false,
        source_module: 'demarches',
        source_id: d.id,
        event_type: 'other',
        member_id: d.assignedMemberId,
        done: false
      });
    });

  // 5. ADD SCHOOL TASKS (Devoirs)
  schoolTasks
    .filter(st => !st.done)
    .forEach(st => {
      const sDate = st.dueDate || todayStr;
      unifiedList.push({
        id: `school-task-${st.id}`,
        family_id: foyerId,
        title: `📚 Devoir : ${st.title} (${st.subject})`,
        description: `Difficulté : ${st.difficulty}`,
        start_date: sDate,
        end_date: sDate,
        start_time: '17:00',
        end_time: '',
        all_day: false,
        source_module: 'ecole',
        source_id: st.id,
        event_type: 'school',
        member_id: st.assignedMemberId,
        done: false
      });
    });

  // 6. ADD CHORES (Tâches ménagères)
  tasks
    .filter(tk => !tk.done)
    .forEach(tk => {
      const tDate = tk.dueDate || todayStr;
      unifiedList.push({
        id: `task-${tk.id}`,
        family_id: foyerId,
        title: `🧹 Tâche : ${tk.title}`,
        description: `Points : ${tk.rewardPoints}`,
        start_date: tDate,
        end_date: tDate,
        start_time: '18:00',
        end_time: '',
        all_day: false,
        source_module: 'taches',
        source_id: tk.id,
        event_type: 'other',
        member_id: tk.assignedMemberId,
        done: false
      });
    });

  // 7. ADD VEHICLES (Control tech and insurance)
  vehicles.forEach(v => {
    if (v.technicalControl) {
      unifiedList.push({
        id: `veh-tc-${v.id}`,
        family_id: foyerId,
        title: `🚗 Contrôle Technique : ${v.name}`,
        description: `Plaque : ${v.plate}`,
        start_date: v.technicalControl,
        end_date: v.technicalControl,
        start_time: '09:00',
        end_time: '',
        all_day: false,
        source_module: 'vehicules',
        source_id: v.id,
        event_type: 'other'
      });
    }

    if (v.insuranceExpiry) {
      unifiedList.push({
        id: `veh-ins-${v.id}`,
        family_id: foyerId,
        title: `📄 Exp. Assurance : ${v.name}`,
        description: `Plaque : ${v.plate}`,
        start_date: v.insuranceExpiry,
        end_date: v.insuranceExpiry,
        start_time: '09:00',
        end_time: '',
        all_day: false,
        source_module: 'vehicules',
        source_id: v.id,
        event_type: 'other'
      });
    }
  });

  // 8. ADD HOUSING MAINTENANCE (Entretien logement)
  maintenance
    .filter(m => m.status !== 'completed')
    .forEach(m => {
      const mDate = m.date || todayStr;
      unifiedList.push({
        id: `maint-${m.id}`,
        family_id: foyerId,
        title: `🏠 Entretien : ${m.title}`,
        description: `Prestataire : ${m.provider}`,
        start_date: mDate,
        end_date: mDate,
        start_time: '14:00',
        end_time: '',
        all_day: false,
        source_module: 'logement',
        source_id: m.id,
        event_type: 'other',
        done: false
      });
    });

  // 9. ADD BUDGET (Abonnements récurrents / prélèvements)
  abonnements.forEach(a => {
    const aDate = a.nextBillingDate || todayStr;
    unifiedList.push({
      id: `abo-${a.id}`,
      family_id: foyerId,
      title: `💸 Prélèvement : ${a.name}`,
      description: `Montant : ${a.amount}€ (${a.period === 'monthly' ? 'Mensuel' : a.period === 'yearly' ? 'Annuel' : a.period === 'weekly' ? 'Hebdomadaire' : a.period})`,
      start_date: aDate,
      end_date: aDate,
      start_time: '08:00',
      end_time: '',
      all_day: false,
      source_module: 'budget',
      source_id: a.id,
      event_type: 'bill',
      done: false
    });
  });

  // 10. ADD PETS (RDV & vaccins animaux)
  pets.forEach(p => {
    if (p.nextVaccine) {
      unifiedList.push({
        id: `pet-vac-${p.id}`,
        family_id: foyerId,
        title: `🐾 Vaccin de ${p.name}`,
        description: `Vaccin de rappel pour ${p.name} (${p.species})`,
        start_date: p.nextVaccine,
        end_date: p.nextVaccine,
        start_time: '10:00',
        end_time: '',
        all_day: false,
        source_module: 'animaux',
        source_id: p.id,
        event_type: 'medical',
        member_id: 'Foyer'
      });
    }

    if (p.vetAppointment) {
      unifiedList.push({
        id: `pet-vet-${p.id}`,
        family_id: foyerId,
        title: `🏥 RDV Vétérinaire : ${p.name}`,
        description: `RDV vétérinaire pour ${p.name}`,
        start_date: p.vetAppointment,
        end_date: p.vetAppointment,
        start_time: '14:00',
        end_time: '',
        all_day: false,
        source_module: 'animaux',
        source_id: p.id,
        event_type: 'medical',
        member_id: 'Foyer'
      });
    }
  });

  // 11. ADD BIRTHDAYS (Anniversaires)
  members.forEach(m => {
    if (!m.birthDate) return;
    try {
      // Find birthday this year
      const parts = m.birthDate.split('-');
      if (parts.length === 3) {
        const bMonth = parseInt(parts[1]) - 1;
        const bDay = parseInt(parts[2]);
        [currentYear - 1, currentYear, currentYear + 1].forEach(y => {
          const bdayDate = new Date(y, bMonth, bDay);
          const mm = String(bdayDate.getMonth() + 1).padStart(2, '0');
          const dd = String(bdayDate.getDate()).padStart(2, '0');
          const dateStr = `${y}-${mm}-${dd}`;
          unifiedList.push({
            id: `birthday-${m.id}-${y}`,
            family_id: foyerId,
            title: `🎂 Anniversaire de ${m.name} !`,
            description: `Joyeux anniversaire ${m.name} !`,
            start_date: dateStr,
            end_date: dateStr,
            start_time: '',
            end_time: '',
            all_day: true,
            source_module: 'membres',
            source_id: `bday-${m.id}`,
            event_type: 'birthday',
            member_id: m.id
          });
        });
      }
    } catch (e) {
      console.warn("Erreur calcul anniversaire membre :", m.name, e);
    }
  });

  // 12. ADD EXTERNAL ICAL EVENTS (Google, School, Outlook)
  externalEvents.forEach(ee => {
    unifiedList.push({
      id: ee.id,
      family_id: foyerId,
      title: ee.title,
      description: ee.description || ee.location || 'Événement importé',
      start_date: ee.startDate,
      end_date: ee.endDate,
      start_time: ee.startTime || '',
      end_time: ee.endTime || '',
      all_day: ee.isAllDay,
      source_module: 'external',
      source_id: ee.id,
      event_type: ee.memberId ? 'school' : 'other',
      member_id: ee.memberId,
      color: ee.sourceColor
    });
  });

  // 13. ADD AGENDA LOCAL/CLOUD EVENTS
  // Skip any events that are actually vaccines (already added via Vaccines)
  // Deduplicate against other source modules using description JSON metadata if exists
  events
    .filter(e => e.type !== 'vaccine')
    .forEach(e => {
      let sourceMeta: { sourceModule?: string; sourceId?: string } | null = null;
      try {
        if (e.description && e.description.trim().startsWith('{')) {
          sourceMeta = JSON.parse(e.description);
        }
      } catch { /* not JSON metadata */ }

      // If it corresponds to another module, check if it's already in the unified list
      if (sourceMeta?.sourceModule && sourceMeta?.sourceId) {
        const isDuplicate = unifiedList.some(ue => 
          ue.source_module === sourceMeta!.sourceModule && 
          ue.source_id === sourceMeta!.sourceId
        );
        if (isDuplicate) return; // Skip duplicate!
      }

      // Title-based heuristic deduplication (fallback)
      const titleLower = e.title.toLowerCase();
      if (titleLower.includes('départ :') || titleLower.includes('retour :')) {
        const dest = e.title.split(':').slice(1).join(':').trim();
        if (dest && trips.some(t => t.destination.toLowerCase().includes(dest.toLowerCase()))) {
          return; // Skip duplicate!
        }
      }
      if (titleLower.includes('entretien :')) {
        const maintTitle = e.title.split(':').slice(1).join(':').trim();
        if (maintTitle && maintenance.some(m => m.title.toLowerCase().includes(maintTitle.toLowerCase()))) {
          return; // Skip duplicate!
        }
      }

      const eDate = e.dateTime ? e.dateTime.split('T')[0] : todayStr;
      unifiedList.push({
        id: e.id,
        family_id: foyerId,
        title: e.title,
        description: e.description || e.location || 'Événement familial',
        start_date: eDate,
        end_date: eDate,
        start_time: e.time || '',
        end_time: '',
        all_day: !e.time,
        source_module: 'agenda',
        source_id: e.id,
        event_type: e.type,
        member_id: e.memberId,
        done: e.done
      });
    });

  return unifiedList.sort((a, b) => {
    // Sort by start_date, then start_time
    const dateComp = a.start_date.localeCompare(b.start_date);
    if (dateComp !== 0) return dateComp;
    return a.start_time.localeCompare(b.start_time);
  });
}
