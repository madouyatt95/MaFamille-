import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MapPin, 
  Clock, 
  Info,
  CheckSquare,
  Square,
  RefreshCw,
  SlidersHorizontal,
  GripHorizontal,
  Globe,
  Trash2,
  Settings2
} from 'lucide-react';
import type { FamilyEvent, Member, EventType } from '../types';
import { fetchExternalCalendar, type ExternalEvent } from '../utils/icalParser';

interface AgendaProps {
  events: FamilyEvent[];
  members: Member[];
  onAddEventClick: () => void;
  onToggleEventDone: (id: string) => void;
  onMoveEvent: (eventId: string, newDate: string) => void;
  activeMemberId?: string;
  defaultSelectedDate?: string;

  trips?: any[];
  vaccines?: any[];
  schoolTasks?: any[];
  tasks?: any[];
  demarches?: any[];
  vehicles?: any[];
  maintenance?: any[];
  abonnements?: any[];
  pets?: any[];
}

export interface CalendarSource {
  id: string;
  name: string;
  url: string;
  color: string;
  memberId?: string;
  isActive: boolean;
}

export const Agenda: React.FC<AgendaProps> = ({
  events,
  members,
  onAddEventClick,
  onToggleEventDone,
  onMoveEvent,
  activeMemberId = '1',
  defaultSelectedDate,
  trips = [],
  vaccines = [],
  schoolTasks = [],
  tasks = [],
  demarches = [],
  vehicles = [],
  maintenance = [],
  abonnements = [],
  pets = []
}) => {
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentPivotDate, setCurrentPivotDate] = useState<Date>(() => {
    if (defaultSelectedDate && !isNaN(new Date(defaultSelectedDate).getTime())) {
      return new Date(defaultSelectedDate);
    }
    return new Date();
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (defaultSelectedDate) return defaultSelectedDate;
    return getLocalDateString(new Date());
  });

  const [viewType, setViewType] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);

  // Sources iCal et Événements Externes
  const [calendarSources, setCalendarSources] = useState<CalendarSource[]>(() => {
    const saved = localStorage.getItem('mf_external_calendar_sources');
    if (saved) return JSON.parse(saved);
    const isCloud = !!localStorage.getItem('mf_cloud_foyer_id');
    if (isCloud) return [];
    return [
      {
        id: 'src-google-papa',
        name: 'Google Agenda Papa',
        url: 'https://calendar.google.com/calendar/ical/papa/public/basic.ics',
        color: '#2563EB',
        isActive: true
      },
      {
        id: 'src-school-awa',
        name: 'École Awa (Emploi du temps)',
        url: 'https://ecole.directe/awa/agenda.ics',
        color: '#EC4899',
        memberId: '4', // Awa
        isActive: true
      }
    ];
  });

  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>(() => {
    const saved = localStorage.getItem('mf_external_calendar_events');
    if (saved) return JSON.parse(saved);
    const isCloud = !!localStorage.getItem('mf_cloud_foyer_id');
    if (isCloud) return [];
    // Événements de démo pré-remplis pour Mai 2026 correspondants aux dates
    return [
      {
        id: 'ext-demo-1',
        title: 'Réunion d\'affaires importante',
        startDate: '2026-05-18',
        endDate: '2026-05-18',
        startTime: '10:00',
        endTime: '12:00',
        description: 'Point d\'étape sur les nouveaux projets de consulting.',
        location: 'Paris Offices',
        sourceName: 'Google Agenda Papa',
        sourceColor: '#2563EB',
        isAllDay: false
      },
      {
        id: 'ext-demo-2',
        title: 'Cours de Mathématiques',
        startDate: '2026-05-19',
        endDate: '2026-05-19',
        startTime: '08:30',
        endTime: '10:30',
        description: 'Géométrie et algèbre linéaire.',
        location: 'Salle 402 - Collège',
        sourceName: 'École Awa (Emploi du temps)',
        sourceColor: '#EC4899',
        memberId: '4',
        isAllDay: false
      },
      {
        id: 'ext-demo-3',
        title: 'Déjeuner client professionnel',
        startDate: '2026-05-20',
        endDate: '2026-05-20',
        startTime: '12:30',
        endTime: '14:00',
        description: 'Signature de contrat de partenariat.',
        location: 'L\'Atelier Bistrot',
        sourceName: 'Google Agenda Papa',
        sourceColor: '#2563EB',
        isAllDay: false
      },
      {
        id: 'ext-demo-4',
        title: 'Cours d\'Anglais',
        startDate: '2026-05-21',
        endDate: '2026-05-21',
        startTime: '14:00',
        endTime: '16:00',
        description: 'Préparation du brevet oral d\'anglais.',
        location: 'Salle 105 - Collège',
        sourceName: 'École Awa (Emploi du temps)',
        sourceColor: '#EC4899',
        memberId: '4',
        isAllDay: false
      }
    ];
  });

  const [showSourcesModal, setShowSourcesModal] = useState(false);
  
  // États de saisie d'un nouveau calendrier
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceColor, setNewSourceColor] = useState('#6C5CFF');
  const [newSourceMember, setNewSourceMember] = useState('none');

  // Sauvegarde persistante
  useEffect(() => {
    localStorage.setItem('mf_external_calendar_sources', JSON.stringify(calendarSources));
  }, [calendarSources]);

  useEffect(() => {
    localStorage.setItem('mf_external_calendar_events', JSON.stringify(externalEvents));
  }, [externalEvents]);

  // Invitation card states
  const [activeInvitationEvent, setActiveInvitationEvent] = useState<FamilyEvent | null>(null);
  const [invitationStyle, setInvitationStyle] = useState<'disney' | 'cyberpunk' | 'retro' | 'comics'>('disney');
  const [invitationDesc, setInvitationDesc] = useState<string>('');
  const [invitationUrl, setInvitationUrl] = useState<string>('');
  const [loadingInvitation, setLoadingInvitation] = useState<boolean>(false);
  const [invitationStep, setInvitationStep] = useState<number>(0);

  useEffect(() => {
    if (defaultSelectedDate) {
      setSelectedDate(defaultSelectedDate);
      if (!isNaN(new Date(defaultSelectedDate).getTime())) {
        setCurrentPivotDate(new Date(defaultSelectedDate));
      }
      setViewType('week');
    }
  }, [defaultSelectedDate]);

  const activeMember = members?.find(m => m.id === activeMemberId);
  const isChild = activeMember
    ? ['Enfant', 'child'].includes(activeMember.role)
    : (activeMemberId === '3' || activeMemberId === '4');
  
  const isWritable = activeMember 
    ? (activeMember.role !== 'child' || !!activeMember.hasExemption)
    : true;

  // Convertit les événements externes en événements de format FamilyEvent
  const mappedExternalEvents = useMemo(() => {
    return externalEvents
      .filter(ee => {
        // Ne garder que les événements dont la source est active
        const source = calendarSources.find(s => s.name === ee.sourceName);
        return source ? source.isActive : true;
      })
      .map(ee => ({
        id: ee.id,
        title: ee.title,
        dateTime: `${ee.startDate}T${ee.startTime || '00:00'}:00`,
        time: ee.startTime || '00:00',
        type: (ee.memberId ? 'school' : 'other') as EventType,
        memberId: ee.memberId,
        location: ee.location || '',
        notes: ee.description || '',
        done: false,
        isExternal: true,
        sourceName: ee.sourceName,
        sourceColor: ee.sourceColor
      }));
  }, [externalEvents, calendarSources]);

  const visibleEvents = useMemo(() => {
    const local = events.filter(e => {
      if (!isChild) return true;
      if (e.memberId === activeMemberId) return true;
      if (e.type === 'school' || e.type === 'social') return true;
      if (!e.memberId) return true;
      return false;
    }).map(e => ({ ...e, sourceModule: 'agenda' }));
    
    const ext = mappedExternalEvents.map(e => ({ ...e, sourceModule: 'external' }));

    const tripEvs: any[] = [];
    trips.forEach((t: any) => {
      if (t.startDate) {
        tripEvs.push({
          id: `trip-dep-${t.id}`,
          title: `✈️ Départ : ${t.destination}`,
          dateTime: `${t.startDate}T09:00:00`,
          time: '09:00',
          type: 'social' as EventType,
          memberId: 'Foyer',
          location: t.destination,
          notes: `Départ pour le voyage à ${t.destination}. Budget : ${t.budget}€`,
          done: false,
          sourceModule: 'voyages'
        });
      }
      if (t.endDate) {
        tripEvs.push({
          id: `trip-ret-${t.id}`,
          title: `🛬 Retour : ${t.destination}`,
          dateTime: `${t.endDate}T18:00:00`,
          time: '18:00',
          type: 'social' as EventType,
          memberId: 'Foyer',
          location: t.destination,
          notes: `Retour du voyage à ${t.destination}.`,
          done: false,
          sourceModule: 'voyages'
        });
      }
    });

    const vacEvs = vaccines.map((v: any) => ({
      id: `vac-${v.id}`,
      title: `🏥 Vaccin : ${v.name}`,
      dateTime: `${v.nextDate || v.date}T10:00:00`,
      time: '10:00',
      type: 'medical' as EventType,
      memberId: v.memberId || 'Foyer',
      notes: 'Rappel de vaccin',
      done: false,
      sourceModule: 'sante'
    }));

    const schoolEvs = schoolTasks.map((st: any) => ({
      id: `school-task-${st.id}`,
      title: `📚 Devoir : ${st.title} (${st.subject})`,
      dateTime: `${st.dueDate}T17:00:00`,
      time: '17:00',
      type: 'school' as EventType,
      memberId: st.assignedMemberId,
      notes: `Difficulté : ${st.difficulty}`,
      done: st.done,
      sourceModule: 'ecole'
    }));

    const choreEvs = tasks.map((tk: any) => ({
      id: `task-${tk.id}`,
      title: `🧹 Tâche : ${tk.title}`,
      dateTime: `${tk.dueDate}T18:00:00`,
      time: '18:00',
      type: 'other' as EventType,
      memberId: tk.assignedMemberId,
      notes: `Points : ${tk.rewardPoints}`,
      done: tk.done,
      sourceModule: 'taches'
    }));

    const demEvs = demarches.map((d: any) => ({
      id: `demarche-${d.id}`,
      title: `${d.icon || '📄'} Démarche : ${d.title}`,
      dateTime: `${d.dueDate || d.createdAt?.split('T')[0] || getLocalDateString()}T11:00:00`,
      time: '11:00',
      type: 'other' as EventType,
      memberId: d.assignedMemberId,
      notes: `Statut : ${d.status}`,
      done: d.status === 'completed',
      sourceModule: 'demarches'
    }));

    const vehEvs: any[] = [];
    vehicles.forEach((v: any) => {
      if (v.technicalControl) {
        vehEvs.push({
          id: `veh-tc-${v.id}`,
          title: `🚗 Contrôle Technique : ${v.name}`,
          dateTime: `${v.technicalControl}T09:00:00`,
          time: '09:00',
          type: 'other' as EventType,
          notes: `Plaque : ${v.plate}`,
          done: false,
          sourceModule: 'vehicules'
        });
      }
      if (v.insuranceExpiry) {
        vehEvs.push({
          id: `veh-ins-${v.id}`,
          title: `📄 Exp. Assurance : ${v.name}`,
          dateTime: `${v.insuranceExpiry}T09:00:00`,
          time: '09:00',
          type: 'other' as EventType,
          notes: `Plaque : ${v.plate}`,
          done: false,
          sourceModule: 'vehicules'
        });
      }
    });

    const maintEvs = maintenance.map((m: any) => ({
      id: `maint-${m.id}`,
      title: `🏠 Entretien : ${m.title}`,
      dateTime: `${m.date}T14:00:00`,
      time: '14:00',
      type: 'other' as EventType,
      notes: `Prestataire : ${m.provider}`,
      done: m.status === 'completed',
      sourceModule: 'logement'
    }));

    const petEvs: any[] = [];
    (pets || []).forEach((p: any) => {
      if (p.nextVaccine) {
        petEvs.push({
          id: `pet-vac-${p.id}`,
          title: `🐾 Vaccin de ${p.name}`,
          dateTime: `${p.nextVaccine}T10:00:00`,
          time: '10:00',
          type: 'medical' as EventType,
          memberId: 'Foyer',
          notes: `Vaccin pour ${p.name} (${p.species})`,
          done: false,
          sourceModule: 'animaux'
        });
      }
      if (p.vetAppointment) {
        petEvs.push({
          id: `pet-vet-${p.id}`,
          title: `🏥 RDV Vétérinaire : ${p.name}`,
          dateTime: `${p.vetAppointment}T14:00:00`,
          time: '14:00',
          type: 'medical' as EventType,
          memberId: 'Foyer',
          notes: `RDV vétérinaire pour ${p.name}`,
          done: false,
          sourceModule: 'animaux'
        });
      }
    });

    const aboEvs = (abonnements || []).map((a: any) => ({
      id: `abo-${a.id}`,
      title: `💸 Prélèvement : ${a.name}`,
      dateTime: `${a.nextBillingDate || getLocalDateString()}T08:00:00`,
      time: '08:00',
      type: 'bill' as EventType,
      notes: `Montant : ${a.amount}€ (${a.period === 'monthly' ? 'Mensuel' : a.period === 'yearly' ? 'Annuel' : a.period === 'weekly' ? 'Hebdomadaire' : a.period})`,
      done: false,
      sourceModule: 'budget'
    }));

    return [
      ...local,
      ...ext,
      ...tripEvs,
      ...vacEvs,
      ...schoolEvs,
      ...choreEvs,
      ...demEvs,
      ...vehEvs,
      ...maintEvs,
      ...aboEvs,
      ...petEvs
    ];
  }, [events, mappedExternalEvents, isChild, activeMemberId, trips, vaccines, schoolTasks, tasks, demarches, vehicles, maintenance, abonnements, pets]);

  const calendarCells = useMemo(() => {
    const cells = [];
    const year = currentPivotDate.getFullYear();
    const month = currentPivotDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: false });
    }
    
    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: true });
    }
    
    // Next month padding to fill standard 42 cell grid
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: false });
    }
    return cells;
  }, [currentPivotDate]);

  const weekCells = useMemo(() => {
    const pivot = new Date(currentPivotDate);
    const dayOfWeek = pivot.getDay();
    const diff = pivot.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(pivot.getFullYear(), pivot.getMonth(), diff);
    
    const cells = [];
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        day: d.getDate(),
        dateStr,
        name: dayNames[i]
      });
    }
    return cells;
  }, [currentPivotDate]);

  const memberColors: { [key: string]: string } = {
    '1': 'bg-[#4F8CFF]', // Papa (Bleu)
    '2': 'bg-[#6C5CFF]', // Maman (Violet)
    '3': 'bg-[#FFB020]', // Amadou (Orange)
    '4': 'bg-[#FF4D6D]', // Awa (Rose/Rouge)
    '5': 'bg-[#00D26A]'  // Ibrahima (Vert)
  };

  const typeLabels: Record<string, string> = {
    medical: 'Médical',
    school: 'École',
    bill: 'Factures',
    grocery: 'Courses',
    social: 'Loisirs',
    other: 'Autre'
  };

  const getDotsForDay = (dateStr: string) => {
    const dayEvents = visibleEvents.filter(e => e.dateTime.startsWith(dateStr));
    return dayEvents.map(e => {
      if ((e as any).isExternal && (e as any).sourceColor) {
        return { style: { backgroundColor: (e as any).sourceColor }, isStyle: true, className: '' };
      }
      const cls = e.memberId ? memberColors[e.memberId] : 'bg-white/50';
      return { className: cls, isStyle: false, style: {} };
    }).slice(0, 3);
  };

  // Synchronisation de toutes les sources iCal actives
  const syncAllExternalCalendars = async () => {
    setSyncing(true);
    let allEvents: ExternalEvent[] = [];
    
    for (const source of calendarSources) {
      if (!source.isActive) continue;
      try {
        // Démo locale
        if (source.url.includes('basic.ics') || source.url.includes('agenda.ics')) {
          const currentDemoEvents = externalEvents.filter(ee => ee.sourceName === source.name);
          allEvents = [...allEvents, ...currentDemoEvents];
          continue;
        }
        
        // Vrai fetch CORS
        const fetched = await fetchExternalCalendar(source.url, source.name, source.color, source.memberId);
        allEvents = [...allEvents, ...fetched];
      } catch (err) {
        console.error(`Erreur synchro source ${source.name}:`, err);
        const fallback = externalEvents.filter(ee => ee.sourceName === source.name);
        allEvents = [...allEvents, ...fallback];
      }
    }
    
    const uniqueEventsMap = new Map<string, ExternalEvent>();
    allEvents.forEach(e => uniqueEventsMap.set(e.id, e));
    
    setTimeout(() => {
      setExternalEvents(Array.from(uniqueEventsMap.values()));
      setSyncing(false);
      alert('📅 Tous vos calendriers externes et emplois du temps scolaires ont été synchronisés !');
    }, 1200);
  };

  // Synchronisation d'une seule source iCal spécifique
  const syncSingleSource = async (source: CalendarSource) => {
    setSyncing(true);
    try {
      const fetched = await fetchExternalCalendar(source.url, source.name, source.color, source.memberId);
      setExternalEvents(prev => {
        const filtered = prev.filter(ee => ee.sourceName !== source.name);
        return [...filtered, ...fetched];
      });
      alert(`✅ Source "${source.name}" synchronisée avec succès !`);
    } catch (err: any) {
      alert(`⚠️ Erreur d'import : ${err.message || 'Lien invalide ou problème de connexion.'}`);
    } finally {
      setSyncing(false);
    }
  };

  // Ajout d'une nouvelle source iCal
  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    
    const newSource: CalendarSource = {
      id: `src-${Date.now()}`,
      name: newSourceName.trim(),
      url: newSourceUrl.trim(),
      color: newSourceColor,
      memberId: newSourceMember === 'none' ? undefined : newSourceMember,
      isActive: true
    };
    
    setCalendarSources(prev => [...prev, newSource]);
    
    setNewSourceName('');
    setNewSourceUrl('');
    setNewSourceColor('#6C5CFF');
    setNewSourceMember('none');
    
    // Forcer la synchro de cette nouvelle source immédiatement
    setTimeout(() => {
      syncSingleSource(newSource);
    }, 200);
  };

  // Suppression d'une source iCal
  const handleDeleteSource = (id: string, name: string) => {
    if (window.confirm(`Supprimer la source "${name}" ? Ses événements importés seront retirés.`)) {
      setCalendarSources(prev => prev.filter(s => s.id !== id));
      setExternalEvents(prev => prev.filter(ee => ee.sourceName !== name));
    }
  };

  // Activer/Désactiver une source iCal
  const handleToggleSource = (id: string) => {
    setCalendarSources(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const getPivotHeaderLabel = () => {
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    const days = [
      "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"
    ];
    const y = currentPivotDate.getFullYear();
    const m = months[currentPivotDate.getMonth()];
    
    if (viewType === 'month' || viewType === 'list') {
      return `${m} ${y}`;
    }
    if (viewType === 'week') {
      const pivot = new Date(currentPivotDate);
      const dayOfWeek = pivot.getDay();
      const diff = pivot.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(pivot.getFullYear(), pivot.getMonth(), diff);
      return `Sem. du ${monday.getDate()} ${months[monday.getMonth()]}`;
    }
    // viewType === 'day'
    const dayName = days[currentPivotDate.getDay()];
    return `${dayName} ${currentPivotDate.getDate()} ${m}`;
  };

  const handlePrevPivot = () => {
    setCurrentPivotDate(prev => {
      const next = new Date(prev);
      if (viewType === 'month' || viewType === 'list') {
        next.setMonth(prev.getMonth() - 1);
      } else if (viewType === 'week') {
        next.setDate(prev.getDate() - 7);
      } else { // day
        next.setDate(prev.getDate() - 1);
      }
      return next;
    });
  };

  const handleNextPivot = () => {
    setCurrentPivotDate(prev => {
      const next = new Date(prev);
      if (viewType === 'month' || viewType === 'list') {
        next.setMonth(prev.getMonth() + 1);
      } else if (viewType === 'week') {
        next.setDate(prev.getDate() + 7);
      } else { // day
        next.setDate(prev.getDate() + 1);
      }
      return next;
    });
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentPivotDate(today);
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  useEffect(() => {
    if (viewType === 'day') {
      const y = currentPivotDate.getFullYear();
      const m = String(currentPivotDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentPivotDate.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
    }
  }, [currentPivotDate, viewType]);

  const listEvents = useMemo(() => {
    const prefix = `${currentPivotDate.getFullYear()}-${String(currentPivotDate.getMonth() + 1).padStart(2, '0')}`;
    return visibleEvents
      .filter(e => e.dateTime.startsWith(prefix))
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [visibleEvents, currentPivotDate]);

  const filteredEvents = useMemo(() => {
    return visibleEvents.filter(event => {
      const matchesDate = event.dateTime.startsWith(selectedDate);
      const matchesType = selectedTypeFilter === 'all' || event.type === selectedTypeFilter;
      const matchesMember = selectedMemberFilter === 'all' || event.memberId === selectedMemberFilter;
      return matchesDate && matchesType && matchesMember;
    });
  }, [visibleEvents, selectedDate, selectedTypeFilter, selectedMemberFilter]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('eventId', eventId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    if (!isWritable) {
      alert("🔒 Dérogation parentale requise pour déplacer des événements !");
      return;
    }
    const eventId = e.dataTransfer.getData('eventId');
    if (eventId) {
      onMoveEvent(eventId, targetDate);
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Agenda</h1>
            <p className="text-xs text-white/50 font-medium">Calendrier partagé de la maison</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (!isWritable) {
              alert("🔒 Dérogation parentale requise pour modifier l'agenda familial !");
              return;
            }
            onAddEventClick();
          }}
          className="p-3 rounded-2xl bg-[#6C5CFF] text-white hover:opacity-90 transition-all cursor-pointer shadow-[0_4px_12px_rgba(108,92,255,0.4)]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Panneau de Synchronisation Multi-Calendriers & ICS */}
      <div className="glass-panel rounded-[28px] p-4 border border-white/6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <Globe className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Synchronisation iCal / ICS & Emplois du Temps</span>
              <span className="text-[9px] bg-[#6C5CFF]/20 text-[#6C5CFF] px-1.5 py-0.5 rounded-full font-black">
                {calendarSources.filter(s => s.isActive).length} actifs
              </span>
            </h4>
            <p className="text-[10px] text-white/50 leading-relaxed font-medium">
              Google Calendar, Apple, Outlook et emplois scolaires synchronisés.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSourcesModal(true)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/8 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Gérer les calendriers"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          
          <button 
            onClick={syncAllExternalCalendars}
            disabled={syncing}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#6C5CFF] text-white hover:opacity-90 transition-all cursor-pointer shadow-md shadow-[#6C5CFF]/20 flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchro...' : 'Tout synchroniser'}</span>
          </button>
        </div>
      </div>

      <div className={(viewType === 'month' || viewType === 'day') ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-6"}>
        
        {/* Calendar Widget */}
        <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 text-white">
              <button 
                onClick={handlePrevPivot} 
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer text-xs font-bold transition-all text-white/80"
              >
                ◀
              </button>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider min-w-[120px] text-center">
                {getPivotHeaderLabel()}
              </h3>
              <button 
                onClick={handleNextPivot} 
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer text-xs font-bold transition-all text-white/80"
              >
                ▶
              </button>
              <button 
                onClick={handleGoToToday} 
                className="px-2.5 py-1.5 rounded-lg bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#6C5CFF] text-[10px] font-extrabold uppercase tracking-wide hover:bg-[#6C5CFF]/25 cursor-pointer transition-all active:scale-95"
              >
                Aujourd'hui
              </button>
            </div>
            
            <div className="flex bg-[#112240] p-1 rounded-xl border border-white/5">
              <button onClick={() => setViewType('month')} className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${viewType === 'month' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'}`}>Mois</button>
              <button onClick={() => setViewType('week')} className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${viewType === 'week' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'}`}>Semaine</button>
              <button onClick={() => setViewType('day')} className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${viewType === 'day' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'}`}>Jour</button>
              <button onClick={() => setViewType('list')} className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${viewType === 'list' ? 'bg-[#6C5CFF] text-white shadow-md' : 'text-white/40 hover:text-white'}`}>Liste</button>
            </div>
          </div>

          {viewType === 'month' && (
            /* Month Grid */
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <span key={day} className="text-[9px] font-bold text-white/30 uppercase py-1">{day}</span>
              ))}

              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDate;
                const hasEvents = cell.dateStr ? visibleEvents.some(e => e.dateTime.startsWith(cell.dateStr!)) : false;
                const isToday = cell.dateStr === getLocalDateString(new Date());
                
                return (
                  <button
                    key={idx}
                    disabled={!cell.dateStr}
                    onClick={() => cell.dateStr && setSelectedDate(cell.dateStr)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => cell.dateStr && handleDrop(e, cell.dateStr)}
                    className={`relative aspect-square rounded-[14px] flex flex-col items-center justify-center transition-all ${
                      !cell.isCurrentMonth
                        ? 'opacity-35 hover:bg-white/5 cursor-pointer text-white/40'
                        : isSelected
                          ? 'bg-[#6C5CFF] text-white font-extrabold shadow-[0_4px_10px_rgba(108,92,255,0.4)] cursor-pointer'
                          : isToday
                            ? 'border border-[#6C5CFF]/50 text-white font-extrabold hover:bg-white/5 cursor-pointer'
                            : 'text-white/80 hover:bg-white/5 hover:text-white cursor-pointer'
                    }`}
                  >
                    <span className="text-xs font-semibold">{cell.day}</span>
                    {cell.dateStr && hasEvents && (
                      <div className="absolute bottom-1.5 flex justify-center space-x-0.5 pointer-events-none">
                        {getDotsForDay(cell.dateStr).map((dot, dIdx) => (
                          <span 
                            key={dIdx} 
                            className={`w-1.5 h-1.5 rounded-full ${!dot.isStyle ? dot.className : ''}`} 
                            style={dot.isStyle ? dot.style : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {viewType === 'week' && (
            /* Week View */
            <div className="flex flex-col space-y-4">
              {/* Horizontal Days Carousel */}
              <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar px-1">
                {weekCells.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedDate;
                  const dayEventsCount = visibleEvents.filter(e => e.dateTime.startsWith(cell.dateStr)).length;
                  const isToday = cell.dateStr === getLocalDateString(new Date());
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className={`flex flex-col items-center justify-center min-w-[65px] h-[80px] rounded-[20px] transition-all shrink-0 border ${
                        isSelected 
                          ? 'bg-[#6C5CFF] border-[#6C5CFF] text-white shadow-[0_4px_15px_rgba(108,92,255,0.4)] cursor-pointer' 
                          : isToday
                            ? 'bg-white/5 border-[#6C5CFF]/50 text-white font-bold hover:bg-white/10 cursor-pointer'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white cursor-pointer'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase mb-1 tracking-wider">{cell.name}</span>
                      <span className="text-xl font-black">{cell.day}</span>
                      {dayEventsCount > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isSelected ? 'bg-white' : 'bg-[#00D26A]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Vertical Timeline for Selected Day */}
              <div 
                className="relative bg-[#07111F]/50 rounded-[28px] border border-white/5 overflow-y-auto h-[450px] no-scrollbar shadow-inner"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, selectedDate)}
              >
                {/* Hours background grid */}
                <div className="absolute top-0 left-0 w-full pointer-events-none">
                  {Array.from({ length: 15 }).map((_, i) => {
                    const hour = i + 7; // 7h to 21h
                    return (
                      <div key={hour} className="flex h-[60px] border-b border-white/5 w-full">
                        <div className="w-14 shrink-0 text-right pr-3 pt-2">
                          <span className="text-[10px] font-bold text-white/30">{hour}:00</span>
                        </div>
                        <div className="flex-1 border-l border-white/5"></div>
                      </div>
                    );
                  })}
                </div>

                {/* Events Overlaid */}
                <div className="relative pl-14 pt-2 w-full">
                  {visibleEvents
                    .filter(e => e.dateTime.startsWith(selectedDate))
                    .map(event => {
                      const member = !event.isExternal ? members.find(m => m.id === event.memberId) : null;
                      
                      // Calculate position based on time (assuming time is format "HH:MM")
                      let topOffset = 0;
                      if (event.time) {
                        const [hours, minutes] = event.time.split(':').map(Number);
                        const decimalHour = hours + (minutes / 60);
                        topOffset = Math.max(0, (decimalHour - 7) * 60); // 60px per hour, starting at 7h
                      }
                      
                      return (
                         <div 
                           key={event.id}
                           draggable={!event.isExternal && isWritable}
                           onDragStart={(e) => {
                             if (!isWritable || event.isExternal) {
                               e.preventDefault();
                               return;
                             }
                             handleDragStart(e, event.id);
                           }}
                           className={`absolute left-2 right-4 p-3 rounded-2xl border border-white/10 text-xs shadow-lg cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all z-10 overflow-hidden ${
                             event.done ? 'bg-[#112240]/50 opacity-60' : 'bg-[#1C2C4E]/90 backdrop-blur-md'
                           }`}
                           style={{ top: `${topOffset}px`, minHeight: '56px' }}
                         >
                           {/* Left color bar */}
                           <div 
                             className={`absolute left-0 top-0 bottom-0 w-1 ${event.memberId && !event.isExternal ? memberColors[event.memberId] : 'bg-white/40'}`}
                             style={event.isExternal && event.sourceColor ? { backgroundColor: event.sourceColor } : undefined}
                           ></div>
                           
                           <div className="flex justify-between items-start pl-1">
                             <div className="flex items-center space-x-1.5 mb-1">
                               <span className="font-bold text-white text-[11px] bg-white/10 px-1.5 py-0.5 rounded-md">{event.time}</span>
                             </div>
                             {event.isExternal ? (
                               <span className="text-[8px] font-black uppercase text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 shrink-0">
                                 <Globe className="w-2 h-2 text-[#4F8CFF]" />
                                 <span>{event.sourceName}</span>
                               </span>
                             ) : (
                               member && <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">{member.name}</span>
                             )}
                           </div>
                           <p className={`font-bold text-white/90 leading-tight pl-1 mt-1 ${event.done ? 'line-through text-white/50' : ''}`}>{event.title}</p>
                         </div>
                      );
                  })}
                  <div className="h-[900px]"></div>
                </div>
              </div>
            </div>
          )}

          {viewType === 'day' && (
            /* Day View */
            <div className="flex flex-col space-y-4">
              <div className="px-1 text-white">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Journée active :</span>
                <h4 className="text-xs sm:text-sm font-black uppercase mt-0.5">
                  {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h4>
              </div>

              {/* Vertical Timeline for Selected Day */}
              <div 
                className="relative bg-[#07111F]/50 rounded-[28px] border border-white/5 overflow-y-auto h-[450px] no-scrollbar shadow-inner"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, selectedDate)}
              >
                {/* Hours background grid */}
                <div className="absolute top-0 left-0 w-full pointer-events-none">
                  {Array.from({ length: 15 }).map((_, i) => {
                    const hour = i + 7;
                    return (
                      <div key={hour} className="flex h-[60px] border-b border-white/5 w-full">
                        <div className="w-14 shrink-0 text-right pr-3 pt-2">
                          <span className="text-[10px] font-bold text-white/30">{hour}:00</span>
                        </div>
                        <div className="flex-1 border-l border-white/5"></div>
                      </div>
                    );
                  })}
                </div>

                {/* Events Overlaid */}
                <div className="relative pl-14 pt-2 w-full">
                  {visibleEvents
                    .filter(e => e.dateTime.startsWith(selectedDate))
                    .map(event => {
                      const member = !event.isExternal ? members.find(m => m.id === event.memberId) : null;
                      
                      let topOffset = 0;
                      if (event.time) {
                        const [hours, minutes] = event.time.split(':').map(Number);
                        const decimalHour = hours + (minutes / 60);
                        topOffset = Math.max(0, (decimalHour - 7) * 60);
                      }
                      
                      return (
                         <div 
                           key={event.id}
                           draggable={!event.isExternal && isWritable}
                           onDragStart={(e) => {
                             if (!isWritable || event.isExternal) {
                               e.preventDefault();
                               return;
                             }
                             handleDragStart(e, event.id);
                           }}
                           className={`absolute left-2 right-4 p-3 rounded-2xl border border-white/10 text-xs shadow-lg cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all z-10 overflow-hidden ${
                             event.done ? 'bg-[#112240]/50 opacity-60' : 'bg-[#1C2C4E]/90 backdrop-blur-md'
                           }`}
                           style={{ top: `${topOffset}px`, minHeight: '56px' }}
                         >
                           <div 
                             className={`absolute left-0 top-0 bottom-0 w-1 ${event.memberId && !event.isExternal ? memberColors[event.memberId] : 'bg-white/40'}`}
                             style={event.isExternal && event.sourceColor ? { backgroundColor: event.sourceColor } : undefined}
                           ></div>
                           
                           <div className="flex justify-between items-start pl-1">
                             <div className="flex items-center space-x-1.5 mb-1">
                               <span className="font-bold text-white text-[11px] bg-white/10 px-1.5 py-0.5 rounded-md">{event.time}</span>
                             </div>
                             {event.isExternal ? (
                               <span className="text-[8px] font-black uppercase text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 shrink-0">
                                 <Globe className="w-2 h-2 text-[#4F8CFF]" />
                                 <span>{event.sourceName}</span>
                               </span>
                             ) : (
                               member && <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">{member.name}</span>
                             )}
                           </div>
                           <p className={`font-bold text-white/90 leading-tight pl-1 mt-1 ${event.done ? 'line-through text-white/50' : ''}`}>{event.title}</p>
                         </div>
                      );
                  })}
                  <div className="h-[900px]"></div>
                </div>
              </div>
            </div>
          )}

          {viewType === 'list' && (
            /* List View */
            <div className="flex flex-col space-y-3 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
              {listEvents.length > 0 ? (
                listEvents.map((event) => {
                  const member = !event.isExternal ? members.find(m => m.id === event.memberId) : null;
                  const dotColor = event.memberId ? memberColors[event.memberId] : 'bg-white/40';
                  
                  return (
                    <div 
                      key={event.id}
                      className={`glass-panel rounded-2xl p-3 border border-white/6 flex items-start justify-between ${
                        event.done ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl px-2.5 py-1.5 border border-white/5 shrink-0 min-w-[50px]">
                          <span className="text-[9px] text-white/40 font-bold uppercase">{new Date(event.dateTime.split('T')[0]).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                          <span className="text-xs text-white font-extrabold">{new Date(event.dateTime.split('T')[0]).getDate()}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span 
                              className={`w-2.5 h-2.5 rounded-full ${event.memberId && !event.isExternal ? dotColor : 'bg-white/40'}`} 
                              style={event.isExternal && event.sourceColor ? { backgroundColor: event.sourceColor } : undefined}
                            />
                            <h4 className="text-xs font-bold text-white">
                              {event.title}
                            </h4>
                          </div>
                          
                          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                            {event.isExternal ? (
                              <span className="text-[#4F8CFF] font-extrabold">🌐 {event.sourceName}</span>
                            ) : (
                              `${typeLabels[event.type]} ${member ? `• ${member.name}` : ''}`
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1 shrink-0">
                        <span className="text-[9px] font-bold text-white/70 bg-white/5 px-2 py-1 rounded-lg border border-white/5 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5 text-[#6C5CFF]" />
                          <span>{event.time}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="glass-panel rounded-[28px] border border-white/8 p-6 text-center text-white/30 text-xs">
                  Aucun événement pour ce mois.
                </div>
              )}
            </div>
          )}

          {/* Color Legend */}
          <div className="pt-3 border-t border-white/5 flex flex-wrap gap-x-3 gap-y-2 justify-center">
            {members.map(m => (
              <div key={m.id} className="flex items-center space-x-1.5 animate-fade-in">
                <span className={`w-2 h-2 rounded-full ${memberColors[m.id]} shadow-[0_0_6px_currentColor]`} />
                <span className="text-[10px] text-white/50 font-medium">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule List (Only visible in Month & Day views for layout reasons) */}
        {(viewType === 'month' || viewType === 'day') && (
          <div className="space-y-4">
            
            {/* Controls / Filters */}
            <div className="glass-panel rounded-[24px] p-3 border border-white/6 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider pb-2 border-b border-white/5">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#6C5CFF]" />
                  <span>Filtres de l'agenda</span>
                </span>
                <button 
                  onClick={() => { setSelectedTypeFilter('all'); setSelectedMemberFilter('all'); }}
                  className="text-[10px] text-[#4F8CFF] hover:underline cursor-pointer"
                >
                  Réinitialiser
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#07111F] border border-white/8 text-[11px] text-white focus:outline-none"
                >
                  <option value="all">Tous types</option>
                  <option value="medical">Médical</option>
                  <option value="school">École</option>
                  <option value="bill">Factures</option>
                  <option value="social">Loisirs</option>
                  <option value="other">Autre</option>
                </select>

                <select 
                  value={selectedMemberFilter}
                  onChange={(e) => setSelectedMemberFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#07111F] border border-white/8 text-[11px] text-white focus:outline-none"
                >
                  <option value="all">Tous membres</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">
                Événements du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>

              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => {
                  const member = !event.isExternal ? members.find(m => m.id === event.memberId) : null;
                  const dotColor = event.memberId ? memberColors[event.memberId] : 'bg-white/40';
                  
                  return (
                    <div 
                      key={event.id}
                      draggable={!event.isExternal}
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      className={`glass-panel rounded-[28px] p-4 border border-white/8 transition-all hover:bg-white/8 flex items-start justify-between cursor-grab active:cursor-grabbing ${
                        event.done ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {event.isExternal ? (
                          <div className="text-white/40 mt-1">
                            <Globe className="w-5 h-5 text-[#4F8CFF] shadow-[0_0_8px_rgba(79,140,255,0.3)] animate-pulse" />
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              if (!isWritable) {
                                alert("🔒 Dérogation parentale requise pour modifier les événements de l'agenda familial !");
                                return;
                              }
                              onToggleEventDone(event.id);
                            }}
                            className="text-white/40 hover:text-white transition-colors cursor-pointer mt-1"
                          >
                            {event.done ? (
                              <CheckSquare className="w-5 h-5 text-[#00D26A]" />
                            ) : (
                              <Square className="w-5 h-5 text-white/30" />
                            )}
                          </button>
                        )}
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span 
                              className={`w-2.5 h-2.5 rounded-full ${event.memberId && !event.isExternal ? dotColor : 'bg-white/40'} shadow-[0_0_8px_currentColor]`} 
                              style={event.isExternal && event.sourceColor ? { backgroundColor: event.sourceColor, color: event.sourceColor } : undefined}
                            />
                            <h4 className={`text-xs sm:text-sm font-bold text-white ${event.done ? 'line-through text-white/40' : ''}`}>
                              {event.title}
                            </h4>
                          </div>
                          
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                            {event.isExternal ? (
                              <span className="text-[#4F8CFF] font-extrabold">🌐 {event.sourceName}</span>
                            ) : (
                              `${typeLabels[event.type]} ${member ? `• ${member.name}` : ''}`
                            )}
                          </p>
                          
                          {event.location && (
                            <div className="flex items-center space-x-1 text-[11px] text-white/50">
                              <MapPin className="w-3.5 h-3.5 text-[#FF4D6D]" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          
                          {(event as any).description && (
                            <div className="flex items-start space-x-1 text-[11px] text-white/50">
                              <Info className="w-3.5 h-3.5 text-[#4F8CFF] shrink-0 mt-0.5" />
                              <span>{(event as any).description}</span>
                            </div>
                          )}

                          {event.type === 'social' && (
                            <button
                              type="button"
                              onClick={() => {
                                setInvitationUrl('');
                                setInvitationDesc('');
                                setActiveInvitationEvent(event);
                              }}
                              className="mt-2.5 px-3 py-1.5 rounded-xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 text-[#6C5CFF] text-[9.5px] font-black uppercase tracking-wider flex items-center space-x-1 hover:bg-[#6C5CFF]/20 active:scale-95 transition-all cursor-pointer"
                            >
                              <span>🎨 Carton d'Invitation IA</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2 shrink-0">
                        <span className="text-xs font-bold text-white/70 bg-white/5 px-2.5 py-1.5 rounded-[12px] border border-white/5 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-[#6C5CFF]" />
                          <span>{event.time}</span>
                        </span>
                        <GripHorizontal className="w-4 h-4 text-white/20" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="glass-panel rounded-[28px] border border-white/8 p-6 text-center text-white/30 text-xs">
                  Aucun événement prévu pour cette journée avec ces critères.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* DYNAMIC HIGH-FIDELITY AI INVITATION CARD CREATOR MODAL */}
      {activeInvitationEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg glass-panel rounded-[32px] border border-[#6C5CFF]/30 p-6 space-y-5 relative overflow-hidden">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div>
                <span className="text-[9px] font-black text-[#6C5CFF] uppercase tracking-widest block font-sans">
                  Visual Studio : Carton d'Invitation IA
                </span>
                <h3 className="text-sm font-black text-white mt-1 uppercase tracking-tight">
                  {activeInvitationEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveInvitationEvent(null)}
                className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white border border-white/5 cursor-pointer transition-all"
              >
                Fermer
              </button>
            </div>

            {loadingInvitation ? (
              <div className="py-12 text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-dashed border-[#6C5CFF] animate-spin"></div>
                  <span className="text-2xl animate-bounce">🎈</span>
                </div>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest font-sans">
                  {invitationStep === 1 ? "Configuration de l'ambiance visuelle..." : 
                   invitationStep === 2 ? "Dessin des ornements festifs..." : 
                   "Stable Diffusion finalise votre carton..."}
                </p>
              </div>
            ) : invitationUrl ? (
              <div className="space-y-4 text-center">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-[#00D26A] shadow-lg group">
                  <img 
                    src={invitationUrl} 
                    alt="AI Invitation Card" 
                    className="w-full h-full object-cover transition-transform duration-[5000ms] group-hover:scale-103"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  <div className="absolute bottom-3 left-3 text-left">
                    <span className="text-[8px] font-extrabold text-[#00D26A] uppercase tracking-widest block font-sans">
                      Carton prêt à envoyer !
                    </span>
                    <h4 className="text-xs font-black text-white uppercase mt-0.5">
                      {activeInvitationEvent.title}
                    </h4>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setInvitationUrl('')}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white border border-white/8 text-[10px] font-bold cursor-pointer transition-all hover:bg-white/8"
                  >
                    Recommencer ↺
                  </button>
                  <a
                    href={invitationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 rounded-xl bg-[#6C5CFF] text-white text-[10px] font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center space-x-1.5"
                  >
                    <span>📥 Ouvrir & Partager</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                
                {/* Style Selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">1. Style de l'Invitation</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'disney', label: 'Magie Disney', icon: '✨' },
                      { id: 'cyberpunk', label: 'Cyberpunk', icon: '🌌' },
                      { id: 'retro', label: 'Rétro Fête', icon: '🎉' },
                      { id: 'comics', label: 'Super-Héros', icon: '🦸' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setInvitationStyle(st.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          invitationStyle === st.id 
                            ? 'border-[#6C5CFF] bg-[#6C5CFF]/15 text-white' 
                            : 'border-white/5 bg-white/3 text-white/40 hover:text-white/60'
                        }`}
                      >
                        <span className="text-base block mb-0.5">{st.icon}</span>
                        <span className="text-[7.5px] font-black uppercase font-sans tracking-tight block truncate">{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">2. Thème ou Précisions (Facultatif)</label>
                  <input 
                    type="text"
                    value={invitationDesc}
                    onChange={(e) => setInvitationDesc(e.target.value)}
                    placeholder="ex: sur le thème de l'espace, avec un gâteau géant, couleurs bleues..."
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF] font-sans font-medium"
                  />
                </div>

                <div className="p-3 bg-white/3 border border-white/5 rounded-xl space-y-1">
                  <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest block font-sans">Détails inclus sur le carton :</span>
                  <p className="text-[10px] text-white/80 font-medium font-sans">
                    📅 Date : {new Date(activeInvitationEvent.dateTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {activeInvitationEvent.time}
                  </p>
                  {activeInvitationEvent.location && (
                    <p className="text-[10px] text-white/80 font-medium font-sans">
                      📍 Lieu : {activeInvitationEvent.location}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLoadingInvitation(true);
                    setInvitationStep(1);

                    let promptStyle = '';
                    if (invitationStyle === 'disney') {
                      promptStyle = 'beautiful disney Pixar magical fairy tale style, sparkling gold stars, warm glowing pastel colors';
                    } else if (invitationStyle === 'cyberpunk') {
                      promptStyle = 'neon futuristic cyberpunk city lights, synthwave neon pink and cosmic purple colors';
                    } else if (invitationStyle === 'retro') {
                      promptStyle = 'nostalgic vintage retro party poster style, cute warm colors, decorative flowers';
                    } else {
                      promptStyle = 'epic retro comic book style, bold pop art retro text borders, superhero family design';
                    }

                    const title = activeInvitationEvent.title;
                    const extra = invitationDesc.trim() ? `, themed ${invitationDesc.trim()}` : '';
                    const finalPrompt = encodeURIComponent(`high-resolution festive family invitation card poster for ${title}${extra}, ${promptStyle}, vibrant graphic layout, kid-friendly design, space for text, decorative borders`);
                    const seed = Math.floor(Math.random() * 1000000);
                    const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=800&height=600&nologo=true&seed=${seed}`;

                    setTimeout(() => {
                      setInvitationStep(2);
                      setTimeout(() => {
                        setInvitationStep(3);

                        const img = new Image();
                        img.src = generatedUrl;
                        img.onload = () => {
                          setInvitationUrl(generatedUrl);
                          setLoadingInvitation(false);
                        };
                        img.onerror = () => {
                          // Fallback standard
                          setInvitationUrl(`https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=80&sig=${seed}`);
                          setLoadingInvitation(false);
                        };
                      }, 1000);
                    }, 1000);
                  }}
                  className="w-full py-3.5 rounded-[18px] bg-[#6C5CFF] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>🪄 Peindre le Carton par IA</span>
                </button>

              </div>
            )}

          </div>
        </div>
      )}
      {/* Modal / Tiroir de Gestion des Sources iCal/ICS */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-lg bg-[#0D1B2A]/95 border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-[#6C5CFF]" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Flux Calendriers iCal / ICS
                </h3>
              </div>
              <button 
                onClick={() => setShowSourcesModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-all active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* List of Connected Calendars */}
            <div className="space-y-3">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">
                Flux connectés ({calendarSources.length})
              </span>
              
              {calendarSources.length === 0 ? (
                <p className="text-xs text-white/30 italic py-2">
                  Aucun calendrier externe configuré. Ajoutez-en un ci-dessous !
                </p>
              ) : (
                <div className="space-y-2">
                  {calendarSources.map(source => {
                    const linkedMember = source.memberId ? members.find(m => m.id === source.memberId) : null;
                    return (
                      <div 
                        key={source.id} 
                        className="p-3.5 bg-white/3 border border-white/5 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {/* Dot / Indicator */}
                          <span 
                            className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" 
                            style={{ backgroundColor: source.color, color: source.color }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {source.name}
                            </h4>
                            <p className="text-[8px] text-white/40 truncate max-w-[200px] font-mono mt-0.5">
                              {source.url}
                            </p>
                            {linkedMember && (
                              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-extrabold uppercase text-[#EC4899] tracking-wider">
                                🎓 Lié à : {linkedMember.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Toggle active state */}
                          <button
                            onClick={() => handleToggleSource(source.id)}
                            className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer flex ${
                              source.isActive ? 'bg-[#00D26A] justify-end' : 'bg-white/15 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                          </button>

                          {/* Delete source */}
                          <button
                            onClick={() => handleDeleteSource(source.id, source.name)}
                            className="p-2 rounded-lg bg-white/3 border border-white/5 text-white/50 hover:text-[#FF4D6D] hover:bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/20 transition-all cursor-pointer active:scale-90"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Source Form */}
            <form onSubmit={handleAddSource} className="space-y-4 pt-4 border-t border-white/5">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">
                Ajouter un calendrier iCal/ICS
              </span>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-white/50 font-bold font-sans">Nom du Calendrier</label>
                <input 
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="ex: Agenda Travail, Collège Amadou..."
                  className="w-full bg-white/3 border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF] font-sans font-medium"
                />
              </div>

              {/* URL */}
              <div className="space-y-1">
                <label className="text-[10px] text-white/50 font-bold font-sans flex items-center justify-between">
                  <span>URL du fichier ICS / iCal</span>
                  <span className="text-[8px] text-[#4F8CFF] font-medium font-sans">HTTP / HTTPS uniquement</span>
                </label>
                <input 
                  type="url"
                  required
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className="w-full bg-white/3 border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF] font-sans font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Member Linking */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 font-bold font-sans">Associer à un Membre</label>
                  <select 
                    value={newSourceMember}
                    onChange={(e) => setNewSourceMember(e.target.value)}
                    className="w-full bg-[#0D1B2A] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
                  >
                    <option value="none">Aucun (Tout le monde)</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Color Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 font-bold font-sans">Couleur d'Affichage</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color"
                      value={newSourceColor}
                      onChange={(e) => setNewSourceColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-white/50">{newSourceColor}</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-[18px] bg-[#6C5CFF] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer & Synchroniser</span>
              </button>
            </form>
            
          </div>
        </div>
      )}
    </div>
  );
};
