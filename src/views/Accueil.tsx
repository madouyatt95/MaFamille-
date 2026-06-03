import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Users, 
  Brush, 
  ShoppingBasket, 
  FolderLock, 
  HeartPulse, 
  MoreHorizontal,
  ChevronRight,
  Wifi,
  BookOpen,
  ShoppingCart,
  Clock,
  Lightbulb,
  Droplet,
  UtensilsCrossed,
  MessageCircle,
  Camera,
  Heart,
  Smile,
  Plus,
  Trash2,
  Download,
  Share2,
  X,
  Plane,
  Car,
  Calendar,
  Gift,
  FileText,
  Wrench,
  RefreshCw
} from 'lucide-react';
import type { Member, FamilyEvent, Dish, NotificationAlert, ChatGroup, ChatMessage, MemoryLog } from '../types';

const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(objectUrl);
        resolve(compressedBase64);
      } else {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };
  });
};

export const DishImage: React.FC<{ src: string | undefined; alt: string; className?: string }> = ({ src, alt, className = "w-16 h-16 rounded-[18px]" }) => {
  const [hasError, setHasError] = React.useState(false);
  
  if (!src || hasError) {
    return (
      <div className={`${className} shrink-0 bg-gradient-to-tr from-[#FFB020] to-[#FF4D6D] flex items-center justify-center text-white border border-white/10 shadow-sm`}>
        <UtensilsCrossed className="w-5 h-5 text-black" />
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      onError={() => setHasError(true)}
      className={`${className} object-cover border border-white/10 shadow-lg shrink-0`}
    />
  );
};

interface AccueilProps {
  members: Member[];
  events: FamilyEvent[];
  dishes: Dish[];
  alerts: NotificationAlert[];
  formatMoney: (amount: number) => string;
  setActiveTab: (tab: string) => void;
  setActiveModule: (moduleName: string) => void;
  onMenuClick: () => void;
  onAlertsClick: () => void;

  activeMemberId?: string;
  onProfileSwitcherOpen?: () => void;
  onAvatarClick?: () => void;
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
  onEventClick: (dateStr: string) => void;
  memories: MemoryLog[];
  onAddMemory: (newMemory: MemoryLog) => void;
  onDeleteMemory: (id: string) => void;
  onLikeMemory: (id: string, newLikesCount: number) => void;

  trips?: any[];
  demarches?: any[];
  schoolTasks?: any[];
  tasks?: any[];
  vehicles?: any[];
  maintenance?: any[];
  abonnements?: any[];
  vaccines?: any[];
  savingGoals?: any[];
  pets?: any[];
}

export const Accueil: React.FC<AccueilProps> = ({
  members,
  events,
  dishes,
  alerts,
  formatMoney,
  setActiveTab,
  setActiveModule,
  onMenuClick,
  onAlertsClick,

  activeMemberId = '1',
  onProfileSwitcherOpen,
  onAvatarClick,
  chatGroups,
  chatMessages,
  onEventClick,
  memories,
  onAddMemory,
  onDeleteMemory,
  onLikeMemory,

  trips = [],
  demarches = [],
  schoolTasks = [],
  tasks = [],
  vehicles = [],
  maintenance = [],
  abonnements = [],
  vaccines = [],
  savingGoals: _savingGoals = [],
  pets = []
}) => {
  const [selectedMealDay, setSelectedMealDay] = useState<string>('Lun');

  const activeMember = members.find(m => m.id === activeMemberId) || members[0] || {
    id: activeMemberId || '1',
    name: 'Chargement...',
    role: 'Parent',
    photoUrl: 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150',
    allergies: [],
    treatments: [],
    emergencyContact: { name: '', phone: '', relation: '' }
  };
  const isChild = activeMember ? ['child', 'guest', 'Enfant', 'Invité'].includes(activeMember.role) : false;

  // Expiration helpers for moments on the wall
  const getMomentExpiration = (moment: MemoryLog) => {
    if (!moment.theme || !moment.theme.startsWith('Exp: ')) return null;
    const parts = moment.theme.split(' | ');
    if (parts.length < 2) return null;
    const expiresAt = parseInt(parts[1]);
    const label = parts[0].replace('Exp: ', '');
    return { expiresAt, label };
  };

  const getRemainingTimeStr = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // State to force re-render of remaining time countdowns every second
  const [tick, setTick] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => {
        const nextTick = prev + 1;
        
        // Safety check: do not run cleanup while profile is loading
        if (activeMember.name === 'Chargement...') {
          return nextTick;
        }

        // Secure cleanup: run only once every 5 seconds (every 5 ticks) to reduce DB load
        if (nextTick % 5 === 0) {
          const now = Date.now();
          const expiredIds = memories
            .filter(moment => {
              const exp = getMomentExpiration(moment);
              // Only trigger DB cleanup if it is truly expired (with a safe 1-hour grace window to prevent clock mismatch deletions)
              return exp && (exp.expiresAt + 3600000) < now;
            })
            .map(m => m.id);

          if (expiredIds.length > 0) {
            expiredIds.forEach(id => {
              const m = memories.find(item => item.id === id);
              // Only the author can automatically clean up their own expired moments from the database
              // (Parents/others can still delete them manually via the UI button, but not automatically to prevent clock skew deletions)
              if (m && m.authorName === activeMember.name) {
                onDeleteMemory(id);
              }
            });
          }
        }
        
        return nextTick;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [memories, onDeleteMemory, activeMember.name]);

  // Local state for tracking liked state of memories (so heart icon remains fully interactive per-user session)
  const [likedMemories, setLikedMemories] = useState<Record<string, boolean>>({});

  const handleLikeMoment = (id: string) => {
    const isLiked = !!likedMemories[id];
    setLikedMemories(prev => ({ ...prev, [id]: !isLiked }));
    const target = memories.find(m => m.id === id);
    if (target) {
      const newLikesCount = isLiked ? Math.max(0, target.likesCount - 1) : target.likesCount + 1;
      onLikeMemory(id, newLikesCount);
    }
  };

  const handleDeleteMoment = (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce souvenir du Mur des Moments ?")) {
      onDeleteMemory(id);
    }
  };

  const [selectedMemoryForModal, setSelectedMemoryForModal] = useState<MemoryLog | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const handleDownloadImage = (moment: MemoryLog) => {
    if (!moment.imageUrl) return;
    try {
      const link = document.createElement('a');
      link.href = moment.imageUrl;
      link.download = `souvenir-${moment.authorName}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erreur de téléchargement :", err);
      alert("Impossible de télécharger le fichier directement.");
    }
  };

  const handleShareImage = async (moment: MemoryLog) => {
    if (!moment.imageUrl) return;
    if (isSharing) return;
    setIsSharing(true);
    try {
      if (navigator.share) {
        let filesToShare: File[] = [];
        if (moment.imageUrl.startsWith('data:')) {
          try {
            const res = await fetch(moment.imageUrl);
            const blob = await res.blob();
            const file = new File([blob], `souvenir-${moment.id}.png`, { type: blob.type });
            filesToShare = [file];
          } catch (e) {
            console.warn("Could not convert base64 to file for sharing:", e);
          }
        }
        
        await navigator.share({
          title: moment.title || "Souvenir MaFamille+",
          text: `Regarde ce super souvenir de ${moment.authorName} : "${moment.title}"`,
          files: filesToShare.length > 0 ? filesToShare : undefined,
        });
      } else {
        await navigator.clipboard.writeText(`Regarde ce super souvenir de ${moment.authorName} : "${moment.title}"`);
        alert("Description du souvenir copiée dans le presse-papiers ! Collez-la pour la partager.");
      }
    } catch (err) {
      console.warn("Échec du partage natif :", err);
      try {
        await navigator.clipboard.writeText(`Regarde ce super souvenir de ${moment.authorName} : "${moment.title}"`);
        alert("Description du souvenir copiée dans le presse-papiers ! Collez-la pour la partager.");
      } catch (_) {}
    } finally {
      setIsSharing(false);
    }
  };

  // Compute unread messages count
  const unreadMessagesCount = chatMessages.filter(m => {
    const group = chatGroups.find(g => g.id === m.groupId);
    if (!group || !group.memberIds.includes(activeMemberId)) return false;
    return !m.readBy.includes(activeMemberId);
  }).length;

  // Helper to compute next birthday
  const getNextBirthday = (birthDateStr: string, sysDate: Date) => {
    if (!birthDateStr) return null;
    const parts = birthDateStr.split('-');
    if (parts.length !== 3) return null;
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay = parseInt(parts[2], 10);
    
    const currentYear = sysDate.getFullYear();
    const bdayThisYear = new Date(currentYear, birthMonth, birthDay);
    
    const normalizedToday = new Date(sysDate.getFullYear(), sysDate.getMonth(), sysDate.getDate());
    const normalizedBdayThisYear = new Date(bdayThisYear.getFullYear(), bdayThisYear.getMonth(), bdayThisYear.getDate());
    
    if (normalizedBdayThisYear >= normalizedToday) {
      return normalizedBdayThisYear;
    } else {
      return new Date(currentYear + 1, birthMonth, birthDay);
    }
  };

  const systemDate = new Date();
  
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayStr = getLocalDateString(systemDate);

  const getDaysDiff = (dateStr: string) => {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 0;
    const d1 = new Date(systemDate.getFullYear(), systemDate.getMonth(), systemDate.getDate());
    const d2 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const agendaUnified = (isChild
    ? events.filter(e => e.memberName === activeMember.name || e.type === 'school')
    : events
  ).map(e => {
    const eventDate = e.dateTime.split('T')[0];
    return {
      id: `agenda-${e.id}`,
      title: e.title,
      type: 'agenda',
      date: eventDate,
      time: e.time || '00:00',
      description: e.description || e.location || 'Événement familial',
      iconType: e.type,
      memberId: e.memberId,
      memberName: e.memberName,
      done: e.done,
      sourceModule: 'agenda'
    };
  });

  const tripsUnified = trips.map(t => ({
    id: `trip-${t.id}`,
    title: `Voyage : ${t.destination}`,
    type: 'trip',
    date: t.startDate,
    time: '09:00',
    description: `Budget prévu : ${t.budget}€`,
    iconType: 'trip',
    done: false,
    sourceModule: 'voyages'
  }));

  const demarchesUnified = demarches
    .filter(d => d.status !== 'completed')
    .map(d => {
      const dDate = d.dueDate || d.createdAt?.split('T')[0] || todayStr;
      return {
        id: `demarche-${d.id}`,
        title: `Démarche : ${d.title}`,
        type: 'demarche',
        date: dDate,
        time: '11:00',
        description: `Statut : ${d.status}`,
        iconType: 'demarche',
        memberId: d.assignedMemberId,
        done: false,
        sourceModule: 'demarches'
      };
    });

  const schoolTasksUnified = schoolTasks
    .filter(st => !st.done)
    .map(st => ({
      id: `school-${st.id}`,
      title: `Devoir : ${st.title} (${st.subject})`,
      type: 'schoolTask',
      date: st.dueDate,
      time: '17:00',
      description: `Difficulté : ${st.difficulty}`,
      iconType: 'school',
      memberId: st.assignedMemberId,
      done: false,
      sourceModule: 'ecole'
    }));

  const tasksUnified = tasks
    .filter(tk => !tk.done)
    .map(tk => ({
      id: `task-${tk.id}`,
      title: `Tâche : ${tk.title}`,
      type: 'task',
      date: tk.dueDate,
      time: '18:00',
      description: `Points : ${tk.rewardPoints}`,
      iconType: 'task',
      memberId: tk.assignedMemberId,
      done: false,
      sourceModule: 'taches'
    }));

  const vaccinesUnified = vaccines.map(v => {
    const vDate = v.nextDate || v.date;
    return {
      id: `vaccine-${v.id}`,
      title: `Vaccin : ${v.name}`,
      type: 'vaccine',
      date: vDate,
      time: '10:00',
      description: 'Rappel de vaccin',
      iconType: 'vaccine',
      memberId: v.memberId,
      done: false,
      sourceModule: 'sante'
    };
  });

  const petsUnified: any[] = [];
  (pets || []).forEach(p => {
    if (p.nextVaccine) {
      petsUnified.push({
        id: `pet-vac-${p.id}`,
        title: `🐱 Vaccin de ${p.name}`,
        type: 'pet_vac',
        date: p.nextVaccine,
        time: '10:00',
        description: `Vaccin de rappel pour ${p.name} (${p.species})`,
        iconType: 'medical',
        done: false,
        sourceModule: 'animaux'
      });
    }
    if (p.vetAppointment) {
      petsUnified.push({
        id: `pet-vet-${p.id}`,
        title: `🏥 RDV Vétérinaire : ${p.name}`,
        type: 'pet_vet',
        date: p.vetAppointment,
        time: '14:00',
        description: `Rendez-vous vétérinaire pour ${p.name}`,
        iconType: 'medical',
        done: false,
        sourceModule: 'animaux'
      });
    }
  });

  const abonnementsUnified = abonnements.map(a => ({
    id: `abonnement-${a.id}`,
    title: `Abonnement : ${a.name}`,
    type: 'abonnement',
    date: a.nextBillingDate,
    time: '08:00',
    description: `Montant : ${formatMoney(a.amount)}`,
    iconType: 'abonnement',
    done: false,
    sourceModule: 'budget',
    amount: a.amount
  }));

  const vehiclesUnified: any[] = [];
  vehicles.forEach(v => {
    if (v.technicalControl) {
      vehiclesUnified.push({
        id: `vehicle-tc-${v.id}`,
        title: `Contrôle Technique : ${v.name}`,
        type: 'vehicle_tc',
        date: v.technicalControl,
        time: '09:00',
        description: `Plaque : ${v.plate}`,
        iconType: 'vehicle',
        done: false,
        sourceModule: 'vehicules'
      });
    }
    if (v.insuranceExpiry) {
      vehiclesUnified.push({
        id: `vehicle-ins-${v.id}`,
        title: `Exp. Assurance : ${v.name}`,
        type: 'vehicle_ins',
        date: v.insuranceExpiry,
        time: '09:00',
        description: `Plaque : ${v.plate}`,
        iconType: 'vehicle',
        done: false,
        sourceModule: 'vehicules'
      });
    }
  });

  const maintenanceUnified = maintenance
    .filter(m => m.status !== 'completed')
    .map(m => ({
      id: `maintenance-${m.id}`,
      title: `Entretien : ${m.title}`,
      type: 'maintenance',
      date: m.date,
      time: '14:00',
      description: `Prestataire : ${m.provider}`,
      iconType: 'maintenance',
      done: false,
      sourceModule: 'logement'
    }));

  const birthdaysUnified = members
    .map(m => {
      if (!m.birthDate) return null;
      const nextBday = getNextBirthday(m.birthDate, systemDate);
      if (!nextBday) return null;
      const bdayStr = getLocalDateString(nextBday);
      return {
        id: `birthday-${m.id}`,
        title: `Anniversaire de ${m.name} !`,
        type: 'birthday',
        date: bdayStr,
        time: '00:00',
        description: `Joyeux anniversaire ${m.name} !`,
        iconType: 'birthday',
        memberId: m.id,
        done: false,
        sourceModule: 'membres'
      };
    })
    .filter((b): b is any => b !== null);

  // Deduplication: filter out agenda events that are already represented
  // by their module-specific cards (trips, vehicles, maintenance)
  const deduplicatedAgenda = agendaUnified.filter(ae => {
    // Check if the event description contains JSON metadata with sourceModule
    let sourceMeta: { sourceModule?: string; sourceId?: string } | null = null;
    try {
      if (ae.description && ae.description.trim().startsWith('{')) {
        sourceMeta = JSON.parse(ae.description);
      }
    } catch { /* not JSON metadata */ }

    // If metadata says it comes from a module, check if that module's card exists
    if (sourceMeta?.sourceModule) {
      const mod = sourceMeta.sourceModule;
      if (mod === 'voyages' && tripsUnified.length > 0) return false;
      if (mod === 'vehicules' && vehiclesUnified.length > 0) return false;
      if (mod === 'logement' && maintenanceUnified.length > 0) return false;
    }

    // Title-based heuristic deduplication for events created by MenuHub
    const titleLower = ae.title.toLowerCase();
    // Trip events: "✈️ Départ : X" or "🛬 Retour : X"
    if (titleLower.includes('départ :') || titleLower.includes('retour :')) {
      const dest = ae.title.split(':').slice(1).join(':').trim();
      if (dest && tripsUnified.some(t => t.title.toLowerCase().includes(dest.toLowerCase()))) {
        return false;
      }
    }
    // Maintenance events: "🔧 Maintenance : X"
    if (titleLower.includes('maintenance :')) {
      const maintTitle = ae.title.split(':').slice(1).join(':').trim();
      if (maintTitle && maintenanceUnified.some(m => m.title.toLowerCase().includes(maintTitle.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });

  const allUnifiedEvents = [
    ...deduplicatedAgenda,
    ...tripsUnified,
    ...demarchesUnified,
    ...schoolTasksUnified,
    ...tasksUnified,
    ...vaccinesUnified,
    ...petsUnified,
    ...abonnementsUnified,
    ...vehiclesUnified,
    ...maintenanceUnified,
    ...birthdaysUnified
  ];

  const todayUnifiedEvents = allUnifiedEvents
    .filter(e => e.date === todayStr && !e.done)
    .sort((a, b) => a.time.localeCompare(b.time));

  const upcomingUnifiedEvents = allUnifiedEvents
    .filter(e => e.date > todayStr && !e.done)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Filtrer les plats du jour sélectionné
  const activeDishes = dishes.filter(d => d.day === selectedMealDay);

  const quickActions = [
    { label: 'Conseil', icon: MessageCircle, tab: 'menu', module: 'conseil', color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { label: 'Contes', icon: BookOpen, tab: 'menu', module: 'conteur', color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { label: 'Membres', icon: Users, tab: 'menu', module: 'membres', color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { label: 'Tâches', icon: Brush, tab: 'menu', module: 'taches', color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { label: 'Courses', icon: ShoppingBasket, tab: 'menu', module: 'courses', color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { label: 'Documents', icon: FolderLock, tab: 'menu', module: 'documents', color: 'text-[#4F8CFF] bg-[#4F8CFF]/10' },
    { label: 'Santé', icon: HeartPulse, tab: 'menu', module: 'sante', color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { label: 'Plus', icon: MoreHorizontal, tab: 'menu', color: 'text-white/50 bg-white/5' }
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  const getEventIconAndColor = (e: any) => {
    switch (e.type) {
      case 'trip':
        return { Icon: Plane, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'demarche':
        return { Icon: FileText, cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'schoolTask':
      case 'school':
        return { Icon: BookOpen, cls: 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20' };
      case 'task':
        return { Icon: Brush, cls: 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20' };
      case 'vaccine':
      case 'pet_vac':
      case 'pet_vet':
        return { Icon: HeartPulse, cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'abonnement':
        return { Icon: RefreshCw, cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
      case 'vehicle_tc':
      case 'vehicle_ins':
        return { Icon: Car, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'maintenance':
        return { Icon: Wrench, cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'birthday':
        return { Icon: Gift, cls: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
      default:
        if (e.iconType === 'medical') {
          return { Icon: HeartPulse, cls: 'bg-[#6C5CFF]/10 text-[#6C5CFF] border-[#6C5CFF]/20' };
        } else if (e.iconType === 'bill') {
          return { Icon: Wifi, cls: 'bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20' };
        } else if (e.iconType === 'grocery') {
          return { Icon: ShoppingCart, cls: 'bg-[#FF4D6D]/10 text-[#FF4D6D] border-[#FF4D6D]/20' };
        }
        return { Icon: Calendar, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  const handleEventClick = (event: any) => {
    switch (event.sourceModule) {
      case 'voyages':
        setActiveTab('menu');
        setActiveModule('voyages');
        break;
      case 'demarches':
        setActiveTab('menu');
        setActiveModule('demarches');
        break;
      case 'ecole':
        setActiveTab('menu');
        setActiveModule('ecole');
        break;
      case 'taches':
        setActiveTab('menu');
        setActiveModule('taches');
        break;
      case 'sante':
        setActiveTab('menu');
        setActiveModule('sante');
        break;
      case 'budget':
        setActiveTab('budget');
        break;
      case 'vehicules':
        setActiveTab('menu');
        setActiveModule('vehicules');
        break;
      case 'logement':
        setActiveTab('menu');
        setActiveModule('logement');
        break;
      case 'membres':
        setActiveTab('menu');
        setActiveModule('membres');
        break;
      case 'agenda':
      default:
        onEventClick(event.date);
        break;
    }
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-7xl mx-auto premium-glow-purple">
      {tick > -1 && <span className="hidden" aria-hidden="true">{tick}</span>}
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onMenuClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
              {activeMember 
                ? `Bonjour ${activeMember.name} ! ${['Chef de famille', 'Gestionnaire', 'admin', 'parent'].includes(activeMember.role) ? '👑' : '👋'}`
                : 'Bonjour ! 👋'}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-[11px] text-white/50 font-medium">Famille :</p>
              <div className="flex -space-x-1.5 overflow-hidden">
                {members.slice(0, 5).map(m => (
                  <img 
                    key={m.id}
                    className="inline-block h-5 w-5 rounded-full ring-1 ring-[#07111F] object-cover" 
                    src={m.photoUrl} 
                    alt={m.name} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">


          <button 
            onClick={onAlertsClick}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white relative transition-all cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF4D6D] rounded-full ring-2 ring-[#07111F]"></span>
            )}
          </button>
          
          <button 
            onClick={onProfileSwitcherOpen || onAvatarClick}
            className="relative cursor-pointer transition-all hover:scale-105 active:scale-95 border border-white/10 rounded-full p-0.5"
            title="Changer de profil"
          >
            <img 
              src={activeMember.photoUrl} 
              alt={activeMember.name} 
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00D26A] rounded-full border-2 border-[#07111F]"></span>
          </button>
        </div>
      </div>

      {/* Le Mur des Moments Partagés (Positionné au sommet, à la place du solde familial) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-[#FF4D6D] animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Le Mur des Moments Partagés</h3>
          </div>
          
          <div>
            <input 
              id="polaroid-file-input" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const base64Url = await compressImage(file, 800, 800, 0.7);
                if (!base64Url) return;

                const caption = prompt("Quel souvenir ou moment marquant voulez-vous associer à cette photo ?");
                if (!caption) return;

                  const delayPrompt = prompt(
                    "Dans combien de temps cette photo doit-elle disparaître automatiquement ?\n" +
                    "Entrez un délai (ex: 24h, 12h, 2h, 30m) ou tapez 'jamais' pour un souvenir permanent :",
                    "24h"
                  );
                  
                  let themeStr = "🏖️ Famille";
                  if (delayPrompt && delayPrompt.toLowerCase().trim() !== 'jamais') {
                    const cleanDelay = delayPrompt.toLowerCase().trim();
                    let durationMs = 24 * 60 * 60 * 1000; // 24h default
                    
                    if (cleanDelay.endsWith('h')) {
                      const val = parseInt(cleanDelay.replace('h', ''));
                      if (!isNaN(val)) durationMs = val * 60 * 60 * 1000;
                    } else if (cleanDelay.endsWith('m')) {
                      const val = parseInt(cleanDelay.replace('m', ''));
                      if (!isNaN(val)) durationMs = val * 60 * 1000;
                    }
                    
                    themeStr = `Exp: ${cleanDelay} | ${Date.now() + durationMs}`;
                  }

                  const newMemory: MemoryLog = {
                    id: `mom-${Date.now()}`,
                    title: caption,
                    description: caption,
                    imageUrl: base64Url,
                    imageUrls: [base64Url],
                    authorName: activeMember.name,
                    authorPhoto: activeMember.photoUrl || '',
                    date: "Aujourd'hui",
                    likesCount: 0,
                    isPrivate: false,
                    theme: themeStr
                  };
                  onAddMemory(newMemory);
              }}
            />
            <button 
              onClick={() => document.getElementById('polaroid-file-input')?.click()}
              className="text-xs font-bold text-[#FF4D6D] bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 px-3.5 py-2 rounded-[14px] hover:bg-[#FF4D6D]/25 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Publier</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory">
          {memories
            .filter(moment => {
              const exp = getMomentExpiration(moment);
              return !exp || exp.expiresAt > Date.now();
            })
            .map((moment) => {
              const hasLiked = !!likedMemories[moment.id];
              const numericId = parseInt(moment.id.replace(/\D/g, '')) || 0;
              const rotation = numericId % 2 === 0 ? 1.5 : -1.5;
              const exp = getMomentExpiration(moment);
              const remainingStr = exp ? getRemainingTimeStr(exp.expiresAt) : null;
              
              return (
                <div 
                  key={moment.id}
                  className="w-[240px] shrink-0 snap-start bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-[28px] p-3.5 shadow-lg flex flex-col space-y-3 transform transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.06]"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <div 
                    onClick={() => setSelectedMemoryForModal(moment)}
                    className="relative aspect-[4/3] rounded-[20px] overflow-hidden border border-white/5 shadow-inner cursor-pointer hover:opacity-90 hover:scale-[1.01] active:scale-95 transition-all duration-200"
                  >
                    <img src={moment.imageUrl} alt={moment.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 text-[9px] font-extrabold uppercase bg-black/60 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full border border-white/5">
                      Par {moment.authorName}
                    </span>
                    
                    {/* Expiration badge / remaining time */}
                    {remainingStr && (
                      <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-[#FF4D6D] text-white px-2 py-0.5 rounded-md border border-white/10 shadow-sm animate-pulse z-10 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{remainingStr}</span>
                      </span>
                    )}

                    {/* Suppression du moment s'il s'agit de sa propre publication ou d'un parent */}
                    {(moment.authorName === activeMember.name || !isChild) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMoment(moment.id);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-xl bg-black/60 hover:bg-[#FF4D6D] text-white/80 hover:text-white backdrop-blur-sm transition-all border border-white/10 cursor-pointer shadow-md z-10 active:scale-90"
                        title="Supprimer ce souvenir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-[#FF4D6D]/95 text-white px-2.5 py-1 rounded-full border border-white/5 shadow-md">
                      {moment.date}
                    </span>
                  </div>
                  
                  <p className="text-xs text-white/90 leading-snug line-clamp-2 h-[34px] px-1 font-semibold italic">
                    "{moment.title}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-white/50">
                    <button 
                      onClick={() => handleLikeMoment(moment.id)}
                      className={`flex items-center space-x-1.5 hover:text-[#FF4D6D] transition-colors py-1 px-2 rounded-lg hover:bg-white/5 ${hasLiked ? 'text-[#FF4D6D] font-extrabold' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current animate-pulse' : ''}`} />
                      <span>{moment.likesCount}</span>
                    </button>

                    <button className="flex items-center space-x-1.5 hover:text-[#4F8CFF] transition-colors py-1 px-2 rounded-lg hover:bg-white/5">
                      <Smile className="w-4 h-4" />
                      <span>Réagir</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Messagerie Familiale Hero Tile */}
      <div 
        onClick={() => {
          setActiveTab('menu');
          setActiveModule('messagerie');
        }}
        className="glass-panel rounded-[32px] p-5 flex items-center justify-between border border-[#00D26A]/30 bg-gradient-to-r from-[#00D26A]/10 to-transparent cursor-pointer hover:bg-white/5 transition-all shadow-[0_10px_30px_rgba(0,210,106,0.15)]"
      >
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00D26A] to-[#6C5CFF] flex items-center justify-center shadow-lg">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF4D6D] border-2 border-[#07111F] rounded-full animate-pulse"></span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">Messagerie Familiale</h3>
            <p className={`text-xs font-medium mt-0.5 ${unreadMessagesCount > 0 ? 'text-[#00D26A]' : 'text-white/40'}`}>
              {unreadMessagesCount > 0 
                ? `${unreadMessagesCount} nouveau${unreadMessagesCount > 1 ? 'x' : ''} message${unreadMessagesCount > 1 ? 's' : ''}` 
                : 'Ouvrir les discussions'}
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white/50" />
        </div>
      </div>

      {/* 3. À ne pas manquer aujourd'hui Section */}
      <div className="space-y-4">
        {/* Section Aujourd'hui */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D] animate-pulse" />
              <span>À ne pas manquer aujourd'hui</span>
            </h3>
            <button 
              onClick={() => setActiveTab('agenda')}
              className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
            >
              Voir tout <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todayUnifiedEvents.length > 0 ? (
              todayUnifiedEvents.slice(0, 4).map((event) => {
                const { Icon, cls } = getEventIconAndColor(event);
                const linkedMember = event.memberId ? members.find(m => m.id === event.memberId) : null;
                return (
                  <button 
                    key={event.id} 
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left glass-panel rounded-[28px] p-4 flex items-center justify-between border border-white/8 transition-all hover:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`p-3 rounded-[18px] ${cls} border shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h4>
                        <p className="text-[11px] text-white/50 font-medium truncate">
                          {linkedMember ? `${linkedMember.name} • ` : ''}
                          {event.description}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      <span className="text-xs font-bold text-white/70 bg-white/5 px-3 py-1.5 rounded-[12px] border border-white/5">
                        {event.time}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full glass-panel rounded-[28px] p-5 text-center text-xs text-white/30 border border-white/6">
                Aucun événement prévu pour aujourd'hui. Profitez de votre journée ! ✨
              </div>
            )}
          </div>
        </div>

        {/* Section Prochainement */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6C5CFF]" />
              <span>Prochainement</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingUnifiedEvents.length > 0 ? (
              upcomingUnifiedEvents.slice(0, 6).map((event) => {
                const { Icon, cls } = getEventIconAndColor(event);
                const linkedMember = event.memberId ? members.find(m => m.id === event.memberId) : null;
                const daysDiff = getDaysDiff(event.date);
                
                let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if (daysDiff < 7) {
                  badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
                } else if (daysDiff < 30) {
                  badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                }

                const daysStr = daysDiff === 1 ? "Demain" : `Dans ${daysDiff} jours`;
                const dateFr = new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

                return (
                  <button 
                    key={event.id} 
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left glass-panel rounded-[28px] p-4 flex items-center justify-between border border-white/8 transition-all hover:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`p-3 rounded-[18px] ${cls} border shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">{event.title}</h4>
                        <p className="text-[11px] text-white/50 font-medium truncate">
                          {linkedMember ? `${linkedMember.name} • ` : ''}
                          {dateFr}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-[12px] border ${badgeColor} tracking-wider`}>
                        {daysStr}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full glass-panel rounded-[28px] p-5 text-center text-xs text-white/30 border border-white/6">
                Aucun événement à venir.
              </div>
            )}
          </div>
        </div>
      </div>


      {/* 4. Accès rapides (grid 2x4) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Accès rapides</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(action.tab);
                  if (action.module) setActiveModule(action.module);
                }}
                className="glass-panel rounded-[24px] p-3 flex flex-col items-center justify-center space-y-2 border border-white/6 cursor-pointer hover:bg-white/8 active:scale-95 transition-all text-center"
              >
                <div className={`p-3 rounded-[18px] ${action.color} border border-white/5 transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white/70 tracking-wide">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Menu de la semaine Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Menu de la semaine</h3>
          <button 
            onClick={() => {
              setActiveTab('menu');
              setActiveModule('menus');
            }}
            className="text-xs font-semibold text-[#6C5CFF] hover:text-[#4F8CFF] flex items-center cursor-pointer transition-colors"
          >
            Voir le menu <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {/* Days selector bar */}
        <div className="glass-panel rounded-[24px] p-2 flex justify-between items-center border border-white/5">
          {daysOfWeek.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedMealDay(day)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                selectedMealDay === day
                  ? 'bg-[#6C5CFF] text-white shadow-[0_4px_10px_rgba(108,92,255,0.3)]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Selected Day Meals card */}
        <div className="glass-panel rounded-[28px] p-5 border border-white/8 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-[#4F8CFF]/5 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="space-y-4">
            {activeDishes.length > 0 ? (
              activeDishes.map((dish) => (
                <div key={dish.id} className="flex items-center space-x-4 border-b border-white/5 last:border-b-0 pb-3.5 last:pb-0 pt-1">
                  <DishImage src={dish.image} alt={dish.name} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                      dish.mealType === 'lunch' 
                        ? 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' 
                        : 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20'
                    }`}>
                      {dish.mealType === 'lunch' ? 'Déjeuner ☀️' : 'Dîner 🌙'}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-2">{dish.name}</h4>
                    <p className="text-[10px] text-white/55 truncate mt-0.5 leading-normal">
                      Ingrédients: {dish.ingredients.join(', ')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/40 text-center py-2">Aucun repas planifié pour ce jour.</p>
            )}
          </div>
        </div>
      </div>



      {/* 6. Astuce du jour Card (purple glow layout) */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/8 bg-gradient-to-r from-[#6C5CFF]/20 to-[#4F8CFF]/20 p-5 shadow-lg flex items-center justify-between">
        
        {/* Glow lights */}
        <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-[#6C5CFF]/10 to-[#4F8CFF]/10 opacity-30"></div>
        
        <div className="space-y-2 max-w-[70%] z-10">
          <div className="flex items-center space-x-2 text-[#FFB020]">
            <Lightbulb className="w-4 h-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Astuce du jour</span>
          </div>
          <h4 className="text-sm sm:text-base font-extrabold text-white leading-snug">
            Pensez à boire de l'eau régulièrement
          </h4>
          <p className="text-[11px] text-white/60 leading-normal">
            Hydratez-vous ! Un verre d'eau toutes les deux heures maintient toute la famille en forme et concentrée.
          </p>
        </div>

        {/* Visual cup with water droplet */}
        <div className="relative w-16 h-16 mr-2 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 z-10">
          <Droplet className="w-8 h-8 text-[#4F8CFF] animate-bounce" />
        </div>

      </div>

      {/* Polaroid Full-screen Modal with Download and Share */}
      {selectedMemoryForModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop close area */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedMemoryForModal(null)}></div>
          
          {/* Polaroid container */}
          <div className="relative w-full max-w-sm bg-white p-4 pb-6 rounded-[28px] shadow-2xl flex flex-col space-y-4 transform transition-all scale-100 animate-scaleUp z-10 text-black border-4 border-white">
            
            {/* Top Close Button */}
            <button 
              onClick={() => setSelectedMemoryForModal(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-black/70 hover:text-black transition-all cursor-pointer z-20"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Photo frame */}
            <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden bg-gray-100 border border-gray-200 shadow-inner">
              <img 
                src={selectedMemoryForModal.imageUrl} 
                alt={selectedMemoryForModal.title} 
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2.5 left-2.5 text-[9px] font-extrabold uppercase bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-white/5">
                Par {selectedMemoryForModal.authorName}
              </span>
            </div>

            {/* Description / Caption like a real Polaroid */}
            <div className="space-y-2 px-1 text-center">
              <p className="font-mono text-sm sm:text-base text-gray-800 italic leading-snug font-bold">
                "{selectedMemoryForModal.title}"
              </p>
              <p className="text-[9px] text-gray-400 font-extrabold tracking-wider uppercase">
                {selectedMemoryForModal.date}
              </p>
            </div>

            {/* Premium Action Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => handleDownloadImage(selectedMemoryForModal)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#6C5CFF] hover:bg-[#5b4eff] text-white text-xs font-black py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </button>

              <button
                onClick={() => handleShareImage(selectedMemoryForModal)}
                disabled={isSharing}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#00D26A] hover:bg-[#00b95d] text-white text-xs font-black py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isSharing ? 'Partage...' : 'Partager'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
