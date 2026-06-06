import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Users, 
  GraduationCap, 
  HeartPulse, 
  Wallet, 
  Plane, 
  Landmark, 
  Search,
  ArrowLeft
} from 'lucide-react';
import type { 
  Member, 
  Transaction, 
  Trip, 
  DocumentFile, 
  GroceryItem, 
  ChoreTask, 
  Demarche, 
  Vehicle, 
  HomeMaintenance, 
  PetRecord, 
  FamilyVote,
  FamilyEvent,
  FamilyModule,
  ModulePermissions
} from '../types';
import { getDefaultPermissions } from '../types';

interface TimelineProps {
  members: Member[];
  onBack?: () => void;
  activeMemberId?: string;
  memberPermissions?: Record<string, Record<FamilyModule, ModulePermissions>>;

  // Real data sources
  events: FamilyEvent[];
  transactions: Transaction[];
  vaccines: any[];
  trips: Trip[];
  documents: DocumentFile[];
  groceries: GroceryItem[];
  tasks: ChoreTask[];
  demarches: Demarche[];
  vehicles: Vehicle[];
  maintenance: HomeMaintenance[];
  pets: PetRecord[];
  votes: FamilyVote[];
}

type TimelineCategory = 'Tous' | 'Famille' | 'École' | 'Santé' | 'Budget' | 'Voyages' | 'Commune';

interface ModuleStyle {
  label: string;
  dotColor: string;
  shadowColor: string;
  borderColor: string;
  segmentColor: string;
  badgeBg: string;
  badgeText: string;
}

const moduleConfig: Record<string, ModuleStyle> = {
  sante: { 
    label: 'Santé', 
    dotColor: 'bg-[#FF4D6D]', 
    shadowColor: 'shadow-[0_0_15px_rgba(255,77,109,0.6)]', 
    borderColor: 'border-[#FF4D6D]/45 hover:border-[#FF4D6D]/85', 
    segmentColor: 'bg-[#FF4D6D]',
    badgeBg: 'bg-[#FF4D6D]/15',
    badgeText: 'text-[#FF4D6D]'
  },
  budget: { 
    label: 'Budget', 
    dotColor: 'bg-[#FFD700]', 
    shadowColor: 'shadow-[0_0_15px_rgba(255,215,0,0.6)]', 
    borderColor: 'border-[#FFD700]/45 hover:border-[#FFD700]/85', 
    segmentColor: 'bg-[#FFD700]',
    badgeBg: 'bg-[#FFD700]/15',
    badgeText: 'text-[#FFD700]'
  },
  voyages: { 
    label: 'Voyages', 
    dotColor: 'bg-[#4F8CFF]', 
    shadowColor: 'shadow-[0_0_15px_rgba(79,140,255,0.6)]', 
    borderColor: 'border-[#4F8CFF]/45 hover:border-[#4F8CFF]/85', 
    segmentColor: 'bg-[#4F8CFF]',
    badgeBg: 'bg-[#4F8CFF]/15',
    badgeText: 'text-[#4F8CFF]'
  },
  courses: { 
    label: 'Courses', 
    dotColor: 'bg-[#00D26A]', 
    shadowColor: 'shadow-[0_0_15px_rgba(0,210,106,0.6)]', 
    borderColor: 'border-[#00D26A]/45 hover:border-[#00D26A]/85', 
    segmentColor: 'bg-[#00D26A]',
    badgeBg: 'bg-[#00D26A]/15',
    badgeText: 'text-[#00D26A]'
  },
  demarches: { 
    label: 'Démarches', 
    dotColor: 'bg-[#6C5CFF]', 
    shadowColor: 'shadow-[0_0_15px_rgba(108,92,255,0.6)]', 
    borderColor: 'border-[#6C5CFF]/45 hover:border-[#6C5CFF]/85', 
    segmentColor: 'bg-[#6C5CFF]',
    badgeBg: 'bg-[#6C5CFF]/15',
    badgeText: 'text-[#9d94ff]'
  },
  documents: { 
    label: 'Documents', 
    dotColor: 'bg-[#00F5FF]', 
    shadowColor: 'shadow-[0_0_15px_rgba(0,245,255,0.6)]', 
    borderColor: 'border-[#00F5FF]/45 hover:border-[#00F5FF]/85', 
    segmentColor: 'bg-[#00F5FF]',
    badgeBg: 'bg-[#00F5FF]/15',
    badgeText: 'text-[#00F5FF]'
  },
  taches: { 
    label: 'Tâches', 
    dotColor: 'bg-[#FF8C00]', 
    shadowColor: 'shadow-[0_0_15px_rgba(255,140,0,0.6)]', 
    borderColor: 'border-[#FF8C00]/45 hover:border-[#FF8C00]/85', 
    segmentColor: 'bg-[#FF8C00]',
    badgeBg: 'bg-[#FF8C00]/15',
    badgeText: 'text-[#FF8C00]'
  },
  agenda: { 
    label: 'Agenda', 
    dotColor: 'bg-[#6C5CFF]', 
    shadowColor: 'shadow-[0_0_15px_rgba(108,92,255,0.6)]', 
    borderColor: 'border-[#6C5CFF]/45 hover:border-[#6C5CFF]/85', 
    segmentColor: 'bg-[#6C5CFF]',
    badgeBg: 'bg-[#6C5CFF]/15',
    badgeText: 'text-[#9d94ff]'
  },
  logement: { 
    label: 'Logement', 
    dotColor: 'bg-[#FF8C00]', 
    shadowColor: 'shadow-[0_0_15px_rgba(255,140,0,0.6)]', 
    borderColor: 'border-[#FF8C00]/45 hover:border-[#FF8C00]/85', 
    segmentColor: 'bg-[#FF8C00]',
    badgeBg: 'bg-[#FF8C00]/15',
    badgeText: 'text-[#FF8C00]'
  },
  vehicules: { 
    label: 'Véhicules', 
    dotColor: 'bg-[#4F8CFF]', 
    shadowColor: 'shadow-[0_0_15px_rgba(79,140,255,0.6)]', 
    borderColor: 'border-[#4F8CFF]/45 hover:border-[#4F8CFF]/85', 
    segmentColor: 'bg-[#4F8CFF]',
    badgeBg: 'bg-[#4F8CFF]/15',
    badgeText: 'text-[#4F8CFF]'
  },
  animaux: { 
    label: 'Animaux', 
    dotColor: 'bg-[#00D26A]', 
    shadowColor: 'shadow-[0_0_15px_rgba(0,210,106,0.6)]', 
    borderColor: 'border-[#00D26A]/45 hover:border-[#00D26A]/85', 
    segmentColor: 'bg-[#00D26A]',
    badgeBg: 'bg-[#00D26A]/15',
    badgeText: 'text-[#00D26A]'
  },
  conseil: { 
    label: 'Conseil', 
    dotColor: 'bg-[#6C5CFF]', 
    shadowColor: 'shadow-[0_0_15px_rgba(108,92,255,0.6)]', 
    borderColor: 'border-[#6C5CFF]/45 hover:border-[#6C5CFF]/85', 
    segmentColor: 'bg-[#6C5CFF]',
    badgeBg: 'bg-[#6C5CFF]/15',
    badgeText: 'text-[#9d94ff]'
  }
};

const categoryDetails = {
  Tous: { label: 'Tous', colorClass: 'bg-[#6C5CFF]/15 text-[#6C5CFF] border-[#6C5CFF]/30 hover:bg-[#6C5CFF]/25' },
  Famille: { label: 'Famille', icon: Users, colorClass: 'bg-[#6C5CFF]/15 text-[#9d94ff] border-[#6C5CFF]/30 hover:bg-[#6C5CFF]/25' },
  École: { label: 'École', icon: GraduationCap, colorClass: 'bg-[#00D26A]/15 text-[#00D26A] border-[#00D26A]/30 hover:bg-[#00D26A]/25' },
  Santé: { label: 'Santé', icon: HeartPulse, colorClass: 'bg-[#FF4D6D]/15 text-[#FF4D6D] border-[#FF4D6D]/30 hover:bg-[#FF4D6D]/25' },
  Budget: { label: 'Budget', icon: Wallet, colorClass: 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/25' },
  Voyages: { label: 'Voyages', icon: Plane, colorClass: 'bg-[#4F8CFF]/15 text-[#4F8CFF] border-[#4F8CFF]/30 hover:bg-[#4F8CFF]/25' },
  Commune: { label: 'Commune', icon: Landmark, colorClass: 'bg-[#FF9F1C]/15 text-[#FF9F1C] border-[#FF9F1C]/30 hover:bg-[#FF9F1C]/25' }
};

export const Timeline: React.FC<TimelineProps> = ({
  events,
  transactions,
  vaccines,
  trips,
  documents,
  groceries,
  tasks,
  demarches,
  vehicles,
  maintenance,
  pets,
  votes,
  members,
  onBack,
  activeMemberId,
  memberPermissions
}) => {
  const [activeFilter, setActiveFilter] = useState<TimelineCategory>('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  const activePermissions = useMemo(() => {
    if (memberPermissions && activeMemberId && memberPermissions[activeMemberId]) {
      return memberPermissions[activeMemberId];
    }
    const activeMember = members.find(m => m.id === activeMemberId);
    let roleClean = 'enfant';
    if (activeMember) {
      const r = (activeMember.role || '').toLowerCase();
      if (r.includes('chef') || r.includes('admin')) roleClean = 'chef_famille';
      else if (r.includes('gestionnaire')) roleClean = 'gestionnaire';
      else if (r.includes('adulte') || r.includes('membre adulte')) roleClean = 'adulte';
      else if (r.includes('parent')) roleClean = 'parent';
      else if (r.includes('adolescent')) roleClean = 'adolescent';
      else if (r.includes('enfant')) roleClean = 'enfant';
      else if (r.includes('invit') || r.includes('guest')) roleClean = 'invite';
    } else {
      if (activeMemberId === 'demo_papa' || activeMemberId === '1') roleClean = 'chef_famille';
      else if (activeMemberId === 'demo_maman' || activeMemberId === '2') roleClean = 'parent';
      else if (activeMemberId === 'demo_issa' || activeMemberId === '3') roleClean = 'enfant';
      else if (activeMemberId === 'demo_lyna' || activeMemberId === '4') roleClean = 'adolescent';
    }
    return getDefaultPermissions(roleClean);
  }, [memberPermissions, activeMemberId, members]);

  const hasVoirPermission = (modId: string): boolean => {
    const modIdToFamilyModule: Record<string, FamilyModule> = {
      'conseil': 'conseil_famille',
      'taches': 'taches',
      'ecole': 'ecole',
      'logement': 'logement',
      'agenda': 'agenda',
      'courses': 'courses',
      'sante': 'sante',
      'voyages': 'voyages',
      'documents': 'documents',
      'vehicules': 'vehicules',
      'animaux': 'animaux',
      'demarches': 'demarches',
      'budget': 'budget'
    };
    const familyModKey = modIdToFamilyModule[modId];
    if (!familyModKey) return true;
    const perm = activePermissions[familyModKey];
    return perm ? perm.voir : true;
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const getTimelineItems = (): any[] => {
    const items: any[] = [];

    // 1. Budget (Transactions)
    if (hasVoirPermission('budget')) {
      (transactions || []).forEach(t => {
        if (t.isArchived) return;
        const trans = t as any;
        const date = trans.date || trans.entryDate || '';
        if (!date) return;
        items.push({
          id: `budget-${trans.id}`,
          source_module: 'budget',
          source_id: trans.id,
          title: trans.title || 'Dépense/Revenu',
          description: `${trans.amount > 0 ? '+' : ''}${trans.amount} € • Catégorie: ${trans.category || 'Autre'}`,
          date: date,
          time: trans.time || trans.entryTime || '12:00',
          icon: '💰',
          member_id: trans.memberId
        });
      });
    }

    // 2. Santé (Vaccines)
    if (hasVoirPermission('sante')) {
      (vaccines || []).forEach(v => {
        const date = v.date || '';
        if (!date) return;
        items.push({
          id: `sante-${v.id}`,
          source_module: 'sante',
          source_id: v.id,
          title: v.name || 'Suivi Santé',
          description: `Statut: ${v.status || 'À faire'} • Médecin: ${v.doctor || 'Non spécifié'}`,
          date: date,
          time: v.time || '09:00',
          icon: '❤️',
          member_id: v.memberId
        });
      });
    }

    // 3. Voyages (Trips)
    if (hasVoirPermission('voyages')) {
      (trips || []).forEach(tr => {
        const date = tr.startDate || '';
        if (!date) return;
        items.push({
          id: `voyages-${tr.id}`,
          source_module: 'voyages',
          source_id: tr.id,
          title: `Voyage à ${tr.destination}`,
          description: `Départ prévu jusqu'au ${tr.endDate || 'fin inconnue'} • Budget: ${tr.budget} €`,
          date: date,
          time: '08:00',
          icon: '✈️',
          member_id: undefined
        });
      });
    }

    // 4. Courses (Groceries)
    if (hasVoirPermission('courses')) {
      (groceries || []).forEach(g => {
        if (g.checked) return;
        const date = g.expiryDate || new Date().toISOString().split('T')[0];
        items.push({
          id: `courses-${g.id}`,
          source_module: 'courses',
          source_id: g.id,
          title: `Achat prévu : ${g.name}`,
          description: `Quantité: ${g.quantity || '1'} • Rayon: ${g.category || 'Alimentation'}`,
          date: date,
          time: '10:00',
          icon: '🛒',
          member_id: g.addedBy
        });
      });
    }

    // 5. Démarches
    if (hasVoirPermission('demarches')) {
      (demarches || []).forEach(d => {
        const date = d.dueDate || d.createdAt?.split('T')[0] || '';
        if (!date) return;
        items.push({
          id: `demarches-${d.id}`,
          source_module: 'demarches',
          source_id: d.id,
          title: `Démarche : ${d.title}`,
          description: `Statut: ${d.status || 'À faire'} • ${d.steps?.length || 0} étapes`,
          date: date,
          time: '09:00',
          icon: '📄',
          member_id: d.assignedMemberId
        });
      });
    }

    // 6. Documents
    if (hasVoirPermission('documents')) {
      (documents || []).forEach(doc => {
        const date = doc.uploadDate || '';
        if (!date) return;
        items.push({
          id: `documents-${doc.id}`,
          source_module: 'documents',
          source_id: doc.id,
          title: `Document ajouté : ${doc.name}`,
          description: `Catégorie: ${doc.category || 'Autre'} • Taille: ${doc.fileSize || 'Inconnue'}`,
          date: date.split('T')[0],
          time: '14:00',
          icon: '📁',
          member_id: doc.memberId
        });
      });
    }

    // 7. Agenda (Events)
    if (hasVoirPermission('agenda')) {
      (events || []).forEach(e => {
        const ev = e as any;
        if (ev.id?.startsWith('commune-mock') || ev.id?.startsWith('school-mock')) return;
        if (ev.sourceModule === 'fetes' || ev.type === 'vaccine') return;
        const date = ev.date || ev.dateTime?.split('T')[0] || '';
        if (!date) return;
        items.push({
          id: `agenda-${ev.id}`,
          source_module: 'agenda',
          source_id: ev.id,
          title: ev.title,
          description: ev.description || ev.notes || 'Événement de l\'agenda',
          date: date,
          time: ev.time || '09:00',
          icon: '📅',
          member_id: ev.memberId
        });
      });
    }

    // 8. Tâches (Chore Tasks)
    if (hasVoirPermission('taches')) {
      (tasks || []).forEach(t => {
        const date = t.dueDate || '';
        if (!date) return;
        items.push({
          id: `taches-${t.id}`,
          source_module: 'taches',
          source_id: t.id,
          title: `Tâche : ${t.title}`,
          description: `Attribué à: ${t.assignedMemberName || 'Tous'} • Points: ${t.rewardPoints || 0}`,
          date: date,
          time: '17:00',
          icon: '🧹',
          member_id: t.assignedMemberId
        });
      });
    }

    // 9. Logement (Maintenance)
    if (hasVoirPermission('logement')) {
      (maintenance || []).forEach(hm => {
        const date = hm.date || '';
        if (!date) return;
        items.push({
          id: `logement-${hm.id}`,
          source_module: 'logement',
          source_id: hm.id,
          title: `Entretien : ${hm.title}`,
          description: `Prestataire: ${hm.provider || 'Non spécifié'} • Coût: ${hm.cost || 0} €`,
          date: date,
          time: '10:00',
          icon: '🏠',
          member_id: undefined
        });
      });
    }

    // 10. Véhicules
    if (hasVoirPermission('vehicules')) {
      (vehicles || []).forEach(vh => {
        if (vh.technicalControl) {
          items.push({
            id: `vehicules-ct-${vh.id}`,
            source_module: 'vehicules',
            source_id: `${vh.id}-ct`,
            title: `CT : ${vh.name}`,
            description: `Date limite de contrôle technique (${vh.plate || ''})`,
            date: vh.technicalControl,
            time: '09:00',
            icon: '🚗',
            member_id: undefined
          });
        }
        if (vh.insuranceExpiry) {
          items.push({
            id: `vehicules-ins-${vh.id}`,
            source_module: 'vehicules',
            source_id: `${vh.id}-ins`,
            title: `Assurance : ${vh.name}`,
            description: `Date de renouvellement de l'assurance auto (${vh.plate || ''})`,
            date: vh.insuranceExpiry,
            time: '09:00',
            icon: '🚗',
            member_id: undefined
          });
        }
      });
    }

    // 11. Animaux
    if (hasVoirPermission('animaux')) {
      (pets || []).forEach(p => {
        if (p.nextVaccine) {
          items.push({
            id: `animaux-vac-${p.id}`,
            source_module: 'animaux',
            source_id: `${p.id}-vac`,
            title: `Vaccin de ${p.name}`,
            description: `Rappel de vaccin pour ${p.name} (${p.species || 'animal'})`,
            date: p.nextVaccine,
            time: '11:00',
            icon: '🐶',
            member_id: undefined
          });
        }
        if (p.vetAppointment) {
          items.push({
            id: `animaux-vet-${p.id}`,
            source_module: 'animaux',
            source_id: `${p.id}-vet`,
            title: `Vétérinaire : ${p.name}`,
            description: `Rendez-vous vétérinaire pour ${p.name}`,
            date: p.vetAppointment,
            time: '14:00',
            icon: '🐶',
            member_id: undefined
          });
        }
      });
    }

    // 12. Conseil de famille (Votes)
    if (hasVoirPermission('conseil')) {
      (votes || []).forEach(v => {
        const date = v.dueDate || '';
        if (!date) return;
        items.push({
          id: `conseil-${v.id}`,
          source_module: 'conseil',
          source_id: v.id,
          title: `Conseil : ${v.question}`,
          description: `Sondage familial actif. Auteur: ${v.authorName || 'Parent'}`,
          date: date,
          time: '19:00',
          icon: '👨‍👩‍👧‍👦',
          member_id: undefined
        });
      });
    }

    // Deduplicate items with: source_module + source_id + date
    const uniqueItems: any[] = [];
    const seen = new Set<string>();

    items.forEach(item => {
      const key = `${item.source_module}-${item.source_id}-${item.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    });

    // Sort chronologically (date, then time)
    return uniqueItems.sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.time.localeCompare(b.time);
    });
  };

  const getTabCategory = (module: string): TimelineCategory => {
    if (['sante', 'animaux'].includes(module)) return 'Santé';
    if (['budget'].includes(module)) return 'Budget';
    if (['voyages', 'vehicules'].includes(module)) return 'Voyages';
    // Famille maps to family/home
    return 'Famille';
  };

  // Filter and sort the events list
  const filteredEvents = useMemo(() => {
    return getTimelineItems().filter(e => {
      const cat = getTabCategory(e.source_module);
      const matchesCategory = activeFilter === 'Tous' || cat === activeFilter;
      const matchesSearch = searchQuery.trim() === '' || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [events, transactions, vaccines, trips, documents, groceries, tasks, demarches, vehicles, maintenance, pets, votes, activeFilter, searchQuery]);

  const getTimelineDateLabel = (dateStr: string, timeStr: string) => {
    if (dateStr === todayStr) {
      return timeStr ? timeStr.replace(':', 'h') : 'Auj.';
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const monthsFr = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
    return `${d.getDate()} ${monthsFr[d.getMonth()]}`;
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-5xl mx-auto premium-glow-purple">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all cursor-pointer mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Timeline</h1>
            <p className="text-xs text-white/50 font-medium">Flux d'activités et événements familiaux</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/35" />
          <input 
            type="text" 
            placeholder="Rechercher une activité..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]/65 focus:bg-white/8 transition-all"
          />
        </div>

        {/* Categories filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
          {(Object.keys(categoryDetails) as TimelineCategory[]).map((cat) => {
            const details = categoryDetails[cat];
            const isActive = activeFilter === cat;
            const Icon = (details as any).icon;

            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-300 shrink-0 flex items-center space-x-2 cursor-pointer ${
                  isActive 
                    ? 'bg-[#6C5CFF] border-[#6C5CFF] text-white shadow-[0_4px_12px_rgba(108,92,255,0.4)]' 
                    : details.colorClass
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{details.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Neon Timeline Section */}
      <div className="relative min-h-[400px]">
        {filteredEvents.length > 0 ? (
          <div className="relative flex flex-col space-y-8 py-4">
            
            {/* Central glowing vertical line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-[3px] bg-gradient-to-b from-[#6C5CFF] via-[#00D26A] to-[#FF4D6D] shadow-[0_0_15px_rgba(108,92,255,0.5)] z-0 rounded-full" />

            {/* Alternating Events */}
            {filteredEvents.map((event, idx) => {
              const config = moduleConfig[event.source_module] || moduleConfig['agenda'];
              const isEven = idx % 2 === 0;
              const dateLabel = getTimelineDateLabel(event.date, event.time);
              const linkedMember = event.member_id 
                ? members.find(m => m.id === event.member_id) 
                : null;

              return (
                <div 
                  key={event.id}
                  className={`relative flex items-center w-full z-10 ${
                    isEven ? 'justify-start' : 'justify-end'
                  }`}
                >
                  
                  {/* Glowing dot on the timeline line */}
                  <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full border-2 border-[#07111F] z-20 ${config.dotColor} ${config.shadowColor}`} />

                  {/* Horizontal Segment Connector */}
                  {isEven ? (
                    <div className={`absolute left-[45%] w-[5%] h-[2px] top-1/2 transform -translate-y-1/2 z-10 ${config.segmentColor}`} />
                  ) : (
                    <div className={`absolute left-[50%] w-[5%] h-[2px] top-1/2 transform -translate-y-1/2 z-10 ${config.segmentColor}`} />
                  )}

                  {/* Timeline card */}
                  <div 
                    className={`w-[45%] glass-panel rounded-[24px] p-3 sm:p-5 border transition-all duration-300 hover:scale-[1.01] hover:bg-white/8 relative ${config.borderColor} ${config.shadowColor}`}
                  >
                    
                    {/* Header: Date | Category */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-white/40">
                        <span>📍 {dateLabel}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <span>{event.icon}</span>
                          <span className="text-white/60">{config.label}</span>
                        </span>
                      </div>

                      {linkedMember && (
                        <div className="flex items-center space-x-1">
                          <img 
                            src={linkedMember.photoUrl} 
                            alt={linkedMember.name} 
                            className="w-4.5 h-4.5 rounded-full object-cover border border-white/10"
                          />
                          <span className="text-[10px] text-white/55 font-semibold">{linkedMember.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                      {event.title}
                    </h3>

                    {/* Description */}
                    {event.description && (
                      <p className="text-xs text-white/50 mt-1.5 leading-relaxed font-sans">
                        {event.description}
                      </p>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="p-5 rounded-[28px] bg-white/5 border border-white/5 text-white/20">
              <Clock className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white">Votre Timeline est encore vide</h4>
              <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                Les actions importantes de votre famille apparaîtront ici automatiquement.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
