import { useState, useEffect, useRef } from 'react';
import { parseSmartNaturalSentence } from './utils/groceryParser';
import { 
  demoMembers, 
  demoEvents, 
  demoTransactions, 
  demoDishes, 
  demoDocuments, 
  demoTasks, 
  demoGroceries, 
  demoVehicles, 
  demoMaintenance, 
  demoTrips, 
  demoPets, 
  demoSavingGoals,
  demoAlerts,
  demoMemories,
  demoFamilyVotes,
  demoSchoolTasks,
  demoChatGroups,
  demoChatMessages,
  demoDemarches,
  demoPacks,
  demoArtisans
} from './data/demoData';
import type { 
  Member, 
  FamilyEvent, 
  Transaction, 
  Dish, 
  DocumentFile, 
  ChoreTask, 
  GroceryItem, 
  Vehicle, 
  HomeMaintenance, 
  Trip, 
  PetRecord, 
  SavingGoal,
  NotificationAlert,
  MemoryLog,
  FamilyVote,
  SchoolTask,
  Demarche,
  JustificatifPack,
  Artisan,
  ArchivedList
} from './types';

// Component imports
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { QuickActionsSheet } from './components/QuickActionsSheet';

// Views imports
import { Accueil } from './views/Accueil';
import { Agenda } from './views/Agenda';
import { Finances } from './views/Finances';
import { MenuHub } from './views/MenuHub';
import { Settings } from './views/Settings';
import { Membres } from './views/Membres';
import { SharedPackView } from './components/modules/SharedPackView';
import { KidsDashboard } from './views/KidsDashboard';
import { Paywall } from './components/Paywall';
import { Onboarding } from './views/Onboarding';
import { foyerService } from './services/foyerService';
import { getSupabaseClient } from './utils/supabase';
import { notificationService } from './services/notificationService';
import type { Foyer, FoyerMember } from './types';

// Lucide icon for inline notifications
import { Bell, X, ChevronRight, Mic, MicOff, Volume2, Phone, Settings as SettingsIcon, Lock, AlertTriangle, Sparkles } from 'lucide-react';

function App() {
  // Safe localStorage helper functions to prevent any corrupt cache startup crashes
  const safeGetLocalStorage = <T,>(key: string, fallback: T): T => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return fallback;
      return JSON.parse(val) as T;
    } catch (e) {
      console.warn(`Error parsing localStorage key "${key}":`, e);
      return fallback;
    }
  };

  const safeSetLocalStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Storage quota exceeded or error saving key "${key}":`, e);
    }
  };

  // If a cloud foyer was active last session, start empty (cloud data will load)
  const hadCloudFoyer = !!localStorage.getItem('mf_cloud_foyer_id');

  const [members, setMembers] = useState<Member[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_members', demoMembers);
  });

  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return localStorage.getItem('mf_active_member_id') || '1';
  });

  const [events, setEvents] = useState<FamilyEvent[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_events', demoEvents);
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_transactions', demoTransactions);
  });

  const [dishes, setDishes] = useState<Dish[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_dishes', demoDishes);
  });

  const [documents, setDocuments] = useState<DocumentFile[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_documents', demoDocuments);
  });

  const [tasks, setTasks] = useState<ChoreTask[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_tasks', demoTasks);
  });

  const [groceries, setGroceries] = useState<GroceryItem[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_groceries', demoGroceries);
  });

  const [archivedLists, setArchivedLists] = useState<ArchivedList[]>([]);
  const [initialChatGroupId, setInitialChatGroupId] = useState<string | undefined>(undefined);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_vehicles', demoVehicles);
  });
  const [maintenance, setMaintenance] = useState<HomeMaintenance[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_maintenance', demoMaintenance);
  });
  const [trips, setTrips] = useState<Trip[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_trips', demoTrips);
  });
  const [pets, setPets] = useState<PetRecord[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_pets', demoPets);
  });
  const [pocketMoney, setPocketMoney] = useState<{ id: string; name: string; balance: number; points: number; avatar: string; }[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_pocket_money', [
      { id: '3', name: 'Amadou', balance: 15.00, points: 150, avatar: 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150' },
      { id: '4', name: 'Awa', balance: 22.50, points: 225, avatar: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=150' }
    ]);
  });

  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_saving_goals', demoSavingGoals);
  });

  const [alerts, setAlerts] = useState<NotificationAlert[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_alerts', demoAlerts);
  });

  const [chatGroups, setChatGroups] = useState(() => {
    return safeGetLocalStorage('mf_chat_groups', demoChatGroups);
  });

  const [chatMessages, setChatMessages] = useState(() => {
    return safeGetLocalStorage('mf_chat_messages', demoChatMessages);
  });

  const [demarches, setDemarches] = useState<Demarche[]>(() => {
    return safeGetLocalStorage('mf_demarches', demoDemarches);
  });

  const [artisans, setArtisans] = useState<Artisan[]>(() => {
    return safeGetLocalStorage('mf_artisans', demoArtisans);
  });

  const [justificatifPacks, setJustificatifPacks] = useState<JustificatifPack[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_packs', demoPacks);
  });

  const [agendaSelectedDate, setAgendaSelectedDate] = useState<string>('');

  // Settings State
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('mf_currency') || 'EUR (€)';
  });
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    const raw = (import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('mf_sb_url') || '').trim();
    return raw.replace(/^['"]|['"]$/g, '');
  });
  const [supabaseKey, setSupabaseKey] = useState(() => {
    const raw = (import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('mf_sb_key') || '').trim();
    return raw.replace(/^['"]|['"]$/g, '');
  });
  const [syncActive, setSyncActive] = useState(() => {
    const cached = localStorage.getItem('mf_sync_active');
    if (cached !== null) return cached === 'true';
    const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    return !!(envUrl && envKey && envKey.replace(/^['"]|['"]$/g, '').startsWith('eyJ'));
  });

  // New modules states
  const [memories, setMemories] = useState<MemoryLog[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_memories', demoMemories);
  });

  const [votes, setVotes] = useState<FamilyVote[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_votes', demoFamilyVotes);
  });

  const [schoolTasks, setSchoolTasks] = useState<SchoolTask[]>(() => {
    if (hadCloudFoyer) return [];
    return safeGetLocalStorage('mf_school_tasks', demoSchoolTasks);
  });

  const [grades, setGrades] = useState<any[]>(() => {
    const stored = localStorage.getItem('school_grades');
    return stored ? JSON.parse(stored) : [
      { id: 'g-1', studentId: '3', studentName: 'Amadou', subject: 'Mathématiques', value: 16, max: 20, coef: 2, examTitle: 'Contrôle Algèbre', date: '10/05/2026' },
      { id: 'g-2', studentId: '3', studentName: 'Amadou', subject: 'Histoire-Géographie', value: 15, max: 20, coef: 1, examTitle: 'Examen Révolution', date: '12/05/2026' },
      { id: 'g-3', studentId: '4', studentName: 'Awa', subject: 'Français', value: 18, max: 20, coef: 1, examTitle: 'Dictée de Printemps', date: '14/05/2026' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('school_grades', JSON.stringify(grades));
  }, [grades]);

  const [schedule, setSchedule] = useState<any[]>(() => {
    const stored = localStorage.getItem('school_schedule');
    return stored ? JSON.parse(stored) : [
      { id: 's-1', studentId: '3', studentName: 'Amadou', day: 'Lundi', subject: 'Mathématiques', startTime: '08:30', endTime: '09:30', room: 'Salle 102' },
      { id: 's-2', studentId: '3', studentName: 'Amadou', day: 'Lundi', subject: 'Histoire-Géographie', startTime: '09:30', endTime: '10:30', room: 'Salle 204' },
      { id: 's-3', studentId: '4', studentName: 'Awa', day: 'Mardi', subject: 'Français', startTime: '10:45', endTime: '11:45', room: 'Classe A2' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('school_schedule', JSON.stringify(schedule));
  }, [schedule]);


  const [vaccines, setVaccines] = useState<any[]>(() => {
    return safeGetLocalStorage('mf_vaccines', [
      { id: 'v1', memberId: '3', name: 'ROR (Rappel)', date: '2026-04-12', status: 'Fait', doctor: 'Dr. Martin' },
      { id: 'v2', memberId: '3', name: 'Hépatite B', date: '2026-10-18', status: 'À faire', doctor: 'Dr. Martin' },
      { id: 'v3', memberId: '4', name: 'DTC (Rappel 12 ans)', date: '2026-01-05', status: 'Fait', doctor: 'Dr. Martin' },
      { id: 'v4', memberId: '1', name: 'Grippe Annuelle', date: '2026-11-15', status: 'À faire', doctor: 'Pharmacie' },
    ]);
  });

  const [memberMoods, setMemberMoods] = useState<Record<string, string>>(() => {
    return safeGetLocalStorage('mf_moods', { '1': '☀️', '2': '☀️', '3': '🌈', '4': '☁️' });
  });

  // Navigation and Sheets UI State
  const [activeTab, setActiveTab] = useState('accueil');
  const [activeModule, rawSetActiveModule] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);
  const [pinVerificationOpen, setPinVerificationOpen] = useState(false);
  const [pinTargetMemberId, setPinTargetMemberId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [sharedPackId, setSharedPackId] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [receivedSos, setReceivedSos] = useState<{ senderId: string; senderName: string; location: string; timestamp: number } | null>(null);

  // PWA Install Prompt States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Sync SOS state across household members
  useEffect(() => {
    const checkSos = () => {
      try {
        const rawSos = localStorage.getItem('mf_active_sos');
        if (rawSos) {
          const sos = JSON.parse(rawSos);
          if (sos && sos.active) {
            if (sos.senderId === activeMemberId) {
              setSosActive(true);
              setReceivedSos(null);
            } else {
              setSosActive(false);
              setReceivedSos(sos);
            }
            return;
          }
        }
        setSosActive(false);
        setReceivedSos(null);
      } catch (e) {
        console.error("Error reading active SOS state:", e);
      }
    };

    checkSos();
    const interval = setInterval(checkSos, 1000);
    return () => clearInterval(interval);
  }, [activeMemberId]);

  const triggerSosAlarm = () => {
    setSosActive(true);
    const activeMember = members.find(m => m.id === activeMemberId) || members[0];
    const sosData = {
      active: true,
      senderId: activeMemberId,
      senderName: activeMember?.name || 'Un membre de la famille',
      timestamp: Date.now(),
      location: 'Forêt de Chevreuse 🌲'
    };
    localStorage.setItem('mf_active_sos', JSON.stringify(sosData));

    // Create a persistent notification alert
    const newAlert: NotificationAlert = {
      id: `alert-sos-${Date.now()}-by-${activeMemberId}`,
      title: `🚨 ALERTE SOS ACTIVÉE`,
      description: `${activeMember?.name || 'Un membre'} a déclenché l'alerte d'urgence (SOS).`,
      time: 'À l\'instant',
      type: 'error',
      read: false,
      module: 'sos'
    };
    setAlerts(prev => [newAlert, ...prev]);
    saveAlertToCloud(newAlert);
    try {
      const savedAlerts = localStorage.getItem('mf_alerts');
      const parsedAlerts = savedAlerts ? JSON.parse(savedAlerts) : [];
      localStorage.setItem('mf_alerts', JSON.stringify([newAlert, ...parsedAlerts]));
    } catch (_) {}
  };

  const turnOffSosAlarm = () => {
    setSosActive(false);
    setReceivedSos(null);
    localStorage.removeItem('mf_active_sos');
  };

  // Listen for PWA installation events
  useEffect(() => {
    // Detect if app is already run in standalone (PWA installed) mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed it in this browser session
      if (!sessionStorage.getItem('mf_pwa_dismissed')) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show installation guidelines after 4 seconds if not dismissed
    if (isIosDevice && !sessionStorage.getItem('mf_pwa_dismissed')) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 4000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      setShowInstallPrompt(false);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowInstallPrompt(false);
        }
      } catch (err) {
        console.error("Installation choice failed:", err);
      }
    } else {
      // Fallback guide for other browsers
      alert("Pour installer MaFamille+ sur votre écran d'accueil :\n1. Cliquez sur le bouton Menu de votre navigateur (3 points ou bouton de partage).\n2. Sélectionnez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
    }
  };

  const saveAlertToCloud = async (alert: NotificationAlert) => {
    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').upsert({
          id: alert.id,
          foyer_id: foyer.id,
          title: alert.title,
          description: alert.description,
          time: alert.time,
          type: alert.type,
          read: alert.read,
          module: alert.module
        });
        console.log(`[Supabase Alerts] Alert successfully synchronized to cloud: ${alert.title}`);
      }
    } catch (err) {
      console.error("[Supabase Alerts] Failed to save alert to cloud:", err);
    }
  };

  const updateAlertReadStatusInCloud = async (alertId: string, read: boolean) => {
    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').update({ read }).eq('foyer_id', foyer.id).eq('id', alertId);
        console.log(`[Supabase Alerts] Alert read status updated to ${read} in cloud for ID: ${alertId}`);
      }
    } catch (err) {
      console.error("[Supabase Alerts] Failed to update read status in cloud:", err);
    }
  };

  const markAllAlertsAsReadInCloud = async () => {
    try {
      const client = getSupabaseClient();
      if (client && foyer) {
        await client.from('alerts').update({ read: true }).eq('foyer_id', foyer.id);
        console.log(`[Supabase Alerts] All alerts marked as read in cloud`);
      }
    } catch (err) {
      console.error("[Supabase Alerts] Failed to mark all alerts as read in cloud:", err);
    }
  };

  // Voice Command Assistant State
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [voiceWave, setVoiceWave] = useState(false);
  const [manualVoiceCommand, setManualVoiceCommand] = useState('');
  const voiceRecognitionRef = useRef<any>(null);

  const [foyer, setFoyer] = useState<Foyer | null>(null);
  const [myMemberProfile, setMyMemberProfile] = useState<FoyerMember | null>(null);
  const [onboardingActive, setOnboardingActive] = useState(false);

  // Nettoyage automatique des notes/cours d'Amadou et d'Awa si un foyer personnalisé sans eux est chargé
  useEffect(() => {
    if (foyer && members.length > 0) {
      setGrades(prev => {
        const filtered = prev.filter(g => members.some(m => m.id === g.studentId));
        if (filtered.length !== prev.length) {
          localStorage.setItem('school_grades', JSON.stringify(filtered));
          return filtered;
        }
        return prev;
      });
      setSchedule(prev => {
        const filtered = prev.filter(s => members.some(m => m.id === s.studentId));
        if (filtered.length !== prev.length) {
          localStorage.setItem('school_schedule', JSON.stringify(filtered));
          return filtered;
        }
        return prev;
      });
    }
  }, [members, foyer]);
  const [discoverMode, setDiscoverMode] = useState<boolean>(() => {
    return localStorage.getItem('mf_discover_mode') === 'true';
  });

  // Premium Freemium States
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('mf_is_premium') === 'true';
  });
  const [paywallOpen, setPaywallOpen] = useState(false);
  
  const setActiveModule = (modName: string) => {
    if (['conteur', 'atelier_art', 'peacemaker'].includes(modName) && !isPremium) {
      setPaywallOpen(true);
      return;
    }
    rawSetActiveModule(modName);
  };

  const handleVerifyPin = (inputCode: string) => {
    const savedPin = foyer?.parentPin || localStorage.getItem('mf_parent_pin') || '0000';
    if (inputCode === savedPin) {
      if (pinTargetMemberId) {
        setActiveMemberId(pinTargetMemberId);
      }
      setPinVerificationOpen(false);
      setProfileSwitcherOpen(false);
      setPinTargetMemberId(null);
      setActiveTab('accueil');
      setActiveModule('');
    } else {
      setPinError(true);
      setTimeout(() => {
        setPinInput('');
        setPinError(false);
      }, 1000);
    }
  };

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('mf_is_premium', String(isPremium));
  }, [isPremium]);
  // Chargement et application du thème visuel au démarrage
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_appearance_mode') || 'dark';
    document.body.classList.remove('theme-light', 'theme-sepia');
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
    } else if (savedTheme === 'sepia') {
      document.body.classList.add('theme-sepia');
    }
  }, []);

  // Gestion de la redirection depuis les notifications push (via paramètres URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const moduleParam = params.get('module');
    const groupIdParam = params.get('groupId');
    const actionParam = params.get('action');
    
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (moduleParam) {
      setActiveModule(moduleParam);
    }
    if (groupIdParam) {
      setInitialChatGroupId(groupIdParam);
    }
    
    if (actionParam === 'add-expense') {
      setActiveTab('finances');
      setActiveModule('');
      setQuickActionsOpen(true);
    } else if (actionParam === 'share-receipt') {
      setActiveTab('finances');
      setActiveModule('');
      setQuickActionsOpen(true);
      setTimeout(() => {
        alert("📷 Ticket de caisse partagé reçu ! MaFamille+ l'analyse avec l'IA...");
      }, 500);
    }
    
    if (tabParam || moduleParam || groupIdParam || actionParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);  // Configuration des notifications push FCM au chargement du membre actif
  useEffect(() => {
    const isPushDisabled = localStorage.getItem('mf_fcm_active') === 'false';
    if (activeMemberId && !isPushDisabled) {
      const setupPushNotifications = async () => {
        try {
          await notificationService.initializeFCM(activeMemberId, (payload) => {
            console.log("[App] Notification push reçue au premier plan :", payload);
            const newAlert = {
              id: payload.data?.id || `alert-${Date.now()}`,
              title: payload.notification?.title || 'Notification MaFamille+',
              description: payload.notification?.body || '',
              time: "À l'instant",
              type: (payload.data?.type || 'info') as any,
              read: false,
              module: payload.data?.module || 'other'
            };
            setAlerts(prev => [newAlert, ...prev]);
            saveAlertToCloud(newAlert);

            // Afficher une notification système si autorisé
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newAlert.title, {
                body: newAlert.description,
                icon: '/pwa-192x192.png'
              });
            }
          });
        } catch (err) {
          console.error("[App] Échec de l'initialisation des notifications push :", err);
        }
      };
      setupPushNotifications();
    }
  }, [activeMemberId]);

  // Helper map function from FoyerMember to UI Member
  const mapFoyerMemberToMember = (fm: FoyerMember): Member => ({
    id: fm.id,
    name: fm.displayName,
    role: fm.role === 'admin' ? 'Chef de famille' : fm.role === 'parent' ? 'Gestionnaire' : fm.role === 'child' ? 'Enfant' : 'Invité',
    age: fm.age || '30 ans',
    birthDate: fm.birthDate || '',
    bloodGroup: fm.bloodGroup || 'O+',
    allergies: fm.allergies || [],
    treatments: fm.treatments || [],
    emergencyContact: {
      name: fm.emergencyContactName || '',
      phone: fm.emergencyContactPhone || '',
      relation: fm.emergencyContactRelation || ''
    },
    schoolOrEmployer: fm.schoolOrEmployer || '',
    photoUrl: fm.photoUrl || 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150',
    hasExemption: fm.hasExemption || false,
    approved: fm.approved !== false,
    medicalHistory: []
  });

  // Check foyer session on startup or login
  const checkUserFoyerSession = async (currentUser: any) => {
    if (!currentUser) {
      setFoyer(null);
      setMyMemberProfile(null);
      setOnboardingActive(false);
      return;
    }

    try {
      const { foyer: myFoyer, member: myMember } = await foyerService.getMyFoyer();
      if (myFoyer && myMember) {
        // Clear all local states to avoid syncAllData pushing offline demo data to cloud
        setEvents([]);
        setGroceries([]);
        setTransactions([]);
        setDocuments([]);
        setDishes([]);
        setTasks([]);
        setSavingGoals([]);
        setAlerts([]);
        setMemories([]);
        setVotes([]);
        setSchoolTasks([]);
        setChatGroups([]);
        setChatMessages([]);
        setDemarches([]);
        setJustificatifPacks([]);
        setVehicles([]);
        setMaintenance([]);
        setTrips([]);
        setPets([]);
        setPocketMoney([]);

        setFoyer(myFoyer);
        setMyMemberProfile(myMember);
        setActiveMemberId(myMember.id);
        
        // Respect le choix de test manuel stocké localement s'il existe
        const localPremium = localStorage.getItem('mf_is_premium');
        if (localPremium !== null) {
          setIsPremium(localPremium === 'true');
        } else {
          setIsPremium(myFoyer.isPremium);
        }
        setOnboardingActive(false);
        // Mark that a cloud foyer is active (persists across reloads)
        localStorage.setItem('mf_cloud_foyer_id', myFoyer.id);
        // Hydrate all granular tables
        await loadFoyerData(myFoyer.id);
      } else {
        // Check for automatic onboarding inputs from signup
        const pendingInviteCode = localStorage.getItem('pending_invite_code');
        const pendingDisplayName = localStorage.getItem('pending_display_name');
        const pendingRole = localStorage.getItem('pending_role') || 'child';
        
        if (pendingDisplayName) {
          try {
            if (pendingInviteCode) {
              console.log("[MaFamille+ Sync] Automatic join triggered for code:", pendingInviteCode);
              await foyerService.joinFoyer(pendingInviteCode.trim(), pendingDisplayName.trim(), pendingRole as any);
              localStorage.removeItem('pending_invite_code');
              localStorage.removeItem('pending_display_name');
              localStorage.removeItem('pending_role');
            } else {
              console.log("[MaFamille+ Sync] Automatic foyer creation triggered for:", pendingDisplayName);
              const defaultFoyerName = `Foyer ${pendingDisplayName}`;
              await foyerService.createFoyer(defaultFoyerName, pendingDisplayName.trim(), false);
              localStorage.removeItem('pending_display_name');
            }
            
            // Re-fetch now that the foyer is linked
            const { foyer: newFoyer, member: newMember } = await foyerService.getMyFoyer();
            if (newFoyer && newMember) {
              setFoyer(newFoyer);
              setMyMemberProfile(newMember);
              setActiveMemberId(newMember.id);
              
              // Respect le choix de test manuel stocké localement s'il existe
              const localPremium = localStorage.getItem('mf_is_premium');
              if (localPremium !== null) {
                setIsPremium(localPremium === 'true');
              } else {
                setIsPremium(newFoyer.isPremium);
              }
              setOnboardingActive(false);
              localStorage.setItem('mf_cloud_foyer_id', newFoyer.id);
              await loadFoyerData(newFoyer.id);
              return;
            }
          } catch (autoErr: any) {
            console.error("[MaFamille+ Sync] Automatic onboarding failed:", autoErr);
            localStorage.removeItem('pending_invite_code');
            localStorage.removeItem('pending_display_name');
            alert(`L'onboarding automatique a échoué : ${autoErr.message || autoErr}. Veuillez configurer votre foyer manuellement.`);
          }
        }
        
        setOnboardingActive(true);
      }
    } catch (err) {
      console.error("Erreur lors de la vérification de session foyer :", err);
      setOnboardingActive(true);
    }
  };

  // Monitor Supabase Auth changes
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setUser(null);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        setDiscoverMode(false);
        localStorage.removeItem('mf_discover_mode');
      }
      checkUserFoyerSession(currentUser);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        setDiscoverMode(false);
        localStorage.removeItem('mf_discover_mode');
      }
      checkUserFoyerSession(currentUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Onboarding success handler
  const handleOnboardingSuccess = async (_foyerId: string, _memberRole: string) => {
    setOnboardingActive(false);
    const client = getSupabaseClient();
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        checkUserFoyerSession(session.user);
      }
    }
  };

  // 1. Fetch & Hydrate all tables for active foyer
  const loadFoyerData = async (foyerId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    // Load members — always replace local data with cloud data (even if empty)
    const membersList = await foyerService.getFoyerMembers(foyerId);
    setMembers(membersList.length > 0 ? membersList.map(mapFoyerMemberToMember) : []);
    
    // Dynamically refresh active user's own profile to match role changes instantly
    if (myMemberProfile) {
      const updatedSelf = membersList.find(m => m.id === myMemberProfile.id);
      if (updatedSelf) {
        setMyMemberProfile(updatedSelf);
      }
    }

    // Load Events
    const { data: eventsData } = await client.from('events').select('*').eq('foyer_id', foyerId);
    setEvents(eventsData ? eventsData.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      dateTime: e.date_time,
      time: e.time,
      memberId: e.member_id,
      memberName: e.member_name,
      location: e.location,
      description: e.description,
      done: e.done,
      amount: e.amount ? Number(e.amount) : undefined
    })) : []);

    // Load Groceries
    const { data: groceriesData } = await client.from('groceries').select('*').eq('foyer_id', foyerId);
    setGroceries(groceriesData ? groceriesData.map(g => ({
      id: g.id,
      name: g.name,
      category: g.category,
      quantity: g.quantity,
      checked: g.checked,
      inStock: g.in_stock,
      expiryDate: g.expiry_date,
      meal: g.meal || undefined,
      addedBy: g.added_by || undefined,
      isFavorite: !!g.is_favorite
    })) : []);

    // Load Archived Lists
    const { data: archivedListData } = await client.from('archived_lists').select('*').eq('foyer_id', foyerId);
    setArchivedLists(archivedListData ? archivedListData.map(al => ({
      id: al.id,
      name: al.name,
      date: al.date,
      items: typeof al.items === 'string' ? JSON.parse(al.items) : al.items || [],
      store: al.store || undefined,
      createdBy: al.created_by
    })) : []);

    // Load Transactions
    const { data: transactionsData } = await client.from('transactions').select('*').eq('foyer_id', foyerId);
    setTransactions(transactionsData ? transactionsData.map(t => ({
      id: t.id,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      date: t.date,
      title: t.title,
      memberId: t.member_id,
      memberName: t.member_name
    })) : []);

    // Load Documents
    const { data: documentsData } = await client.from('documents').select('*').eq('foyer_id', foyerId);
    setDocuments(documentsData ? documentsData.map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      subCategory: d.sub_category,
      memberId: d.member_id,
      memberName: d.member_name,
      tags: d.tags || [],
      uploadDate: d.upload_date,
      expiryDate: d.expiry_date,
      fileSize: d.file_size,
      isExpired: d.is_expired,
      description: d.description,
      fileBase64: d.file_base64,
      isSecure: d.is_secure
    })) : []);

    // Load Dishes
    const { data: dishesData } = await client.from('dishes').select('*').eq('foyer_id', foyerId);
    setDishes(dishesData ? dishesData.map(d => ({
      id: d.id,
      day: d.day,
      mealType: d.meal_type,
      name: d.name,
      image: d.image,
      ingredients: d.ingredients || []
    })) : []);

    // Load Tasks
    const { data: tasksData } = await client.from('chore_tasks').select('*').eq('foyer_id', foyerId);
    setTasks(tasksData ? tasksData.map(t => ({
      id: t.id,
      title: t.title,
      rewardPoints: t.reward_points,
      assignedMemberId: t.assigned_member_id,
      assignedMemberName: t.assigned_member_name,
      done: t.done,
      rotation: t.rotation,
      validatedByParent: t.validated_by_parent,
      dueDate: t.due_date
    })) : []);

    // Load Saving Goals
    const { data: savingGoalsData } = await client.from('saving_goals').select('*').eq('foyer_id', foyerId);
    setSavingGoals(savingGoalsData ? savingGoalsData.map(s => ({
      id: s.id,
      title: s.title,
      targetAmount: Number(s.target_amount),
      currentAmount: Number(s.current_amount),
      targetDate: s.target_date,
      category: s.category
    })) : []);

    // Load Alerts
    const { data: alertsData } = await client.from('alerts').select('*').eq('foyer_id', foyerId);
    setAlerts(alertsData ? alertsData.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      time: a.time,
      type: a.type,
      read: a.read,
      module: a.module
    })) : []);

    // Load Memories
    const { data: memoriesData } = await client.from('memories').select('*').eq('foyer_id', foyerId);
    setMemories(memoriesData ? memoriesData.map(m => ({
      id: m.id,
      date: m.date,
      title: m.title,
      description: m.description,
      authorName: m.author_name,
      authorPhoto: m.author_photo,
      imageUrl: m.image_url,
      imageUrls: m.image_urls || [],
      likesCount: m.likes_count,
      isPrivate: m.is_private,
      theme: m.theme
    })) : []);

    // Load Votes
    const { data: votesData } = await client.from('votes').select('*').eq('foyer_id', foyerId);
    setVotes(votesData ? votesData.map(v => ({
      id: v.id,
      question: v.question,
      options: typeof v.options === 'string' ? JSON.parse(v.options) : v.options || [],
      authorName: v.author_name,
      active: v.active,
      dueDate: v.due_date
    })) : []);

    // Load School Tasks
    const { data: schoolTasksData } = await client.from('school_tasks').select('*').eq('foyer_id', foyerId);
    setSchoolTasks(schoolTasksData ? schoolTasksData.map(s => ({
      id: s.id,
      subject: s.subject,
      title: s.title,
      dueDate: s.due_date,
      done: s.done,
      assignedMemberId: s.assigned_member_id,
      difficulty: s.difficulty,
      grade: s.grade
    })) : []);

    // Load Chat Groups
    const { data: chatGroupsData } = await client.from('chat_groups').select('*').eq('foyer_id', foyerId);
    setChatGroups(chatGroupsData ? chatGroupsData.map(c => ({
      id: c.id,
      name: c.name,
      isPrivate: c.is_private,
      memberIds: c.member_ids || [],
      lastMessage: c.last_message,
      lastMessageTime: c.last_message_time,
      unreadCount: c.unread_count
    })) : []);

    // Load Chat Messages
    const { data: chatMessagesData } = await client.from('chat_messages').select('*').eq('foyer_id', foyerId);
    setChatMessages(chatMessagesData ? chatMessagesData.map(c => ({
      id: c.id,
      groupId: c.group_id,
      senderId: c.sender_id,
      senderName: c.sender_name,
      type: c.type,
      content: c.content,
      timestamp: c.timestamp,
      readBy: c.read_by || [],
      reactions: typeof c.reactions === 'string' ? JSON.parse(c.reactions) : c.reactions || []
    })) : []);

    // Load Demarches
    const { data: demarchesData } = await client.from('demarches').select('*').eq('foyer_id', foyerId);
    setDemarches(demarchesData ? demarchesData.map(d => ({
      id: d.id,
      templateId: d.template_id,
      title: d.title,
      icon: d.icon,
      status: d.status,
      assignedMemberId: d.assigned_member_id,
      assignedMemberName: d.assigned_member_name,
      steps: typeof d.steps === 'string' ? JSON.parse(d.steps) : d.steps || [],
      pieces: typeof d.pieces === 'string' ? JSON.parse(d.pieces) : d.pieces || [],
      createdAt: d.created_at_text,
      notes: d.notes
    })) : []);

    // Load Packs
    const { data: packsData } = await client.from('justificatif_packs').select('*').eq('foyer_id', foyerId);
    setJustificatifPacks(packsData ? packsData.map(p => ({
      id: p.id,
      name: p.name,
      templateType: p.template_type,
      documentIds: p.document_ids || [],
      createdAt: p.created_at_text
    })) : []);

    // Load Vehicles
    const { data: vehiclesData } = await client.from('vehicles').select('*').eq('foyer_id', foyerId);
    setVehicles(vehiclesData ? vehiclesData.map(v => ({
      id: v.id,
      name: v.name,
      plate: v.plate || '',
      insuranceExpiry: v.insurance_expiry || '',
      technicalControl: v.technical_control || '',
      lastService: v.last_service || '',
      nextService: v.next_service || '',
      mileage: v.mileage ? Number(v.mileage) : 0
    })) : []);

    // Load Maintenance
    const { data: maintData } = await client.from('maintenance').select('*').eq('foyer_id', foyerId);
    setMaintenance(maintData ? maintData.map(m => ({
      id: m.id,
      title: m.title,
      provider: m.provider || '',
      date: m.date || '',
      cost: Number(m.cost || 0),
      status: (m.status as any) || 'scheduled'
    })) : []);

    // Load Trips
    const { data: tripsData } = await client.from('trips').select('*').eq('foyer_id', foyerId);
    setTrips(tripsData ? tripsData.map(t => ({
      id: t.id,
      destination: t.destination,
      startDate: t.start_date || '',
      endDate: t.end_date || '',
      budget: Number(t.budget || 0),
      checklist: typeof t.checklist === 'string' ? JSON.parse(t.checklist) : t.checklist || [],
      bookingRefs: t.booking_refs || []
    })) : []);

    // Load Pets
    const { data: petsData } = await client.from('pets').select('*').eq('foyer_id', foyerId);
    setPets(petsData ? petsData.map(p => ({
      id: p.id,
      name: p.name,
      species: p.species || '',
      lastVaccine: p.last_vaccine || '',
      nextVaccine: p.next_vaccine || '',
      vetAppointment: p.vet_appointment || undefined,
      notes: p.notes || undefined,
      weightHistory: typeof p.weight_history === 'string' ? JSON.parse(p.weight_history) : p.weight_history || [],
      documentIds: p.document_ids || []
    })) : []);

    // Load Pocket Money
    const { data: pmData } = await client.from('pocket_money').select('*').eq('foyer_id', foyerId);
    setPocketMoney(pmData ? pmData.map(p => ({
      id: p.id,
      name: p.name,
      balance: Number(p.balance || 0),
      points: Number(p.points || 0),
      avatar: p.avatar || '',
      goalTitle: p.goal_title || undefined,
      goalAmount: p.goal_amount ? Number(p.goal_amount) : undefined
    })) : []);

    // Load Artisans
    const { data: artisansData } = await client.from('artisans').select('*').eq('foyer_id', foyerId);
    setArtisans(artisansData ? artisansData.map(a => ({
      id: a.id,
      name: a.name,
      specialty: a.specialty,
      phone: a.phone || '',
      email: a.email || '',
      rating: a.rating || 5,
      notes: a.notes || ''
    })) : []);
  };

  // 2. Realtime collaborative subscriptions
  useEffect(() => {
    if (!foyer) return;

    const subEvents = foyerService.subscribeToChanges('events', foyer.id, () => {
      foyerService.fetchTableData('events', foyer.id).then(eventsData => {
        if (eventsData) {
          const mapped = eventsData.map(e => ({
            id: e.id,
            title: e.title,
            type: e.type,
            dateTime: e.date_time,
            time: e.time,
            memberId: e.member_id,
            memberName: e.member_name,
            location: e.location,
            description: e.description,
            done: e.done,
            amount: e.amount ? Number(e.amount) : undefined
          }));
          setEvents(prev => {
            const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
            const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
            if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
            return mapped;
          });
        }
      });
    });

    const subGroceries = foyerService.subscribeToChanges('groceries', foyer.id, (payload: any) => {
      if (!payload) return;
      console.log("[Groceries Realtime Change] Received payload:", payload.eventType, "new:", payload.new, "old:", payload.old);

      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setGroceries(prev => prev.filter(g => g.id !== deletedId));
      } 
      else if (payload.eventType === 'INSERT') {
        const newItem: GroceryItem = {
          id: payload.new.id,
          name: payload.new.name,
          category: payload.new.category || 'Général',
          quantity: payload.new.quantity || '',
          checked: !!payload.new.checked,
          inStock: !!payload.new.in_stock,
          expiryDate: payload.new.expiry_date || undefined,
          meal: payload.new.meal || undefined,
          addedBy: payload.new.added_by || undefined,
          isFavorite: !!payload.new.is_favorite
        };
        setGroceries(prev => {
          if (prev.some(g => g.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
      } 
      else if (payload.eventType === 'UPDATE') {
        const updatedId = payload.new.id;
        console.log("[Groceries Realtime Change] Updating item", updatedId, "checked from new payload:", payload.new.checked);
        setGroceries(prev => prev.map(g => {
          if (g.id === updatedId) {
            return {
              ...g,
              name: payload.new.name,
              category: payload.new.category || g.category,
              quantity: payload.new.quantity || g.quantity,
              checked: !!payload.new.checked,
              inStock: !!payload.new.in_stock,
              expiryDate: payload.new.expiry_date || g.expiryDate,
              meal: payload.new.meal || undefined,
              addedBy: payload.new.added_by || undefined,
              isFavorite: !!payload.new.is_favorite
            };
          }
          return g;
        }));
      }
    });

    const subArchivedLists = foyerService.subscribeToChanges('archived_lists', foyer.id, (payload: any) => {
      if (!payload) return;
      console.log("[ArchivedLists Realtime Change] Received payload:", payload.eventType);

      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setArchivedLists(prev => prev.filter(l => l.id !== deletedId));
      }
      else if (payload.eventType === 'INSERT') {
        const newList: ArchivedList = {
          id: payload.new.id,
          name: payload.new.name,
          date: payload.new.date,
          items: typeof payload.new.items === 'string' ? JSON.parse(payload.new.items) : payload.new.items || [],
          store: payload.new.store || undefined,
          createdBy: payload.new.created_by
        };
        setArchivedLists(prev => {
          if (prev.some(l => l.id === newList.id)) return prev;
          return [newList, ...prev];
        });
      }
      else if (payload.eventType === 'UPDATE') {
        const updatedId = payload.new.id;
        setArchivedLists(prev => prev.map(l => {
          if (l.id === updatedId) {
            return {
              ...l,
              name: payload.new.name,
              date: payload.new.date,
              items: typeof payload.new.items === 'string' ? JSON.parse(payload.new.items) : payload.new.items || [],
              store: payload.new.store || undefined,
              createdBy: payload.new.created_by
            };
          }
          return l;
        }));
      }
    });

    const subTasks = foyerService.subscribeToChanges('chore_tasks', foyer.id, () => {
      foyerService.fetchTableData('chore_tasks', foyer.id).then(tasksData => {
        if (tasksData) {
          const mapped = tasksData.map(t => ({
            id: t.id,
            title: t.title,
            rewardPoints: t.reward_points,
            assignedMemberId: t.assigned_member_id,
            assignedMemberName: t.assigned_member_name,
            done: t.done,
            rotation: t.rotation,
            validatedByParent: t.validated_by_parent,
            dueDate: t.due_date
          }));
          setTasks(prev => {
            const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
            const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
            if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
            return mapped;
          });
        }
      });
    });

    const subMessages = foyerService.subscribeToChanges('chat_messages', foyer.id, () => {
      foyerService.fetchTableData('chat_messages', foyer.id).then(chatMessagesData => {
        if (chatMessagesData) {
          const mapped = chatMessagesData.map(c => ({
            id: c.id,
            groupId: c.group_id,
            senderId: c.sender_id,
            senderName: c.sender_name,
            type: c.type,
            content: c.content,
            timestamp: c.timestamp,
            readBy: c.read_by || [],
            reactions: typeof c.reactions === 'string' ? JSON.parse(c.reactions) : c.reactions || []
          }));
          setChatMessages(prev => {
            const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
            const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
            if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
            return mapped;
          });
        }
      });
    });

    const subMemories = foyerService.subscribeToChanges('memories', foyer.id, (payload: any) => {
      if (!payload) return;

      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        setMemories(prev => prev.filter(m => m.id !== deletedId));
      } 
      else if (payload.eventType === 'INSERT') {
        const newItem: MemoryLog = {
          id: payload.new.id,
          date: payload.new.date,
          title: payload.new.title,
          description: payload.new.description,
          authorName: payload.new.author_name,
          authorPhoto: payload.new.author_photo,
          imageUrl: payload.new.image_url,
          imageUrls: payload.new.image_urls || [],
          likesCount: payload.new.likes_count || 0,
          isPrivate: !!payload.new.is_private,
          theme: payload.new.theme
        };
        setMemories(prev => {
          if (prev.some(m => m.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });

        // Trigger browser notification for other family members
        const activeMemberName = members.find(m => m.id === activeMemberId)?.name;
        if (payload.new.author_name !== activeMemberName) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`📸 Nouveau moment partagé par ${payload.new.author_name} !`, {
              body: `« ${payload.new.title} » a été ajouté au Mur des Moments.`,
              icon: '/favicon.svg'
            });
          }
        }
      }
      else if (payload.eventType === 'UPDATE') {
        const updatedItem: MemoryLog = {
          id: payload.new.id,
          date: payload.new.date,
          title: payload.new.title,
          description: payload.new.description,
          authorName: payload.new.author_name,
          authorPhoto: payload.new.author_photo,
          imageUrl: payload.new.image_url,
          imageUrls: payload.new.image_urls || [],
          likesCount: payload.new.likes_count || 0,
          isPrivate: !!payload.new.is_private,
          theme: payload.new.theme
        };
        setMemories(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
      }
    });

    const subMembers = foyerService.subscribeToChanges('foyer_members', foyer.id, () => {
      foyerService.getFoyerMembers(foyer.id).then(membersList => {
        const mapped = (membersList || []).map(mapFoyerMemberToMember);
        setMembers(prev => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedNew = [...mapped].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedNew)) return prev;
          return mapped;
        });

        // Instant Realtime Role and Exemption synchronization for the connected user
        if (myMemberProfile) {
          const updatedSelf = membersList.find(m => m.id === myMemberProfile.id);
          if (updatedSelf) {
            setMyMemberProfile(updatedSelf);
          }
        }
      });
    });

    const subVehicles = foyerService.subscribeToChanges('vehicles', foyer.id, () => {
      foyerService.fetchTableData('vehicles', foyer.id).then(vehiclesData => {
        if (vehiclesData) {
          setVehicles(vehiclesData.map(v => ({
            id: v.id,
            name: v.name,
            plate: v.plate || '',
            insuranceExpiry: v.insurance_expiry || '',
            technicalControl: v.technical_control || '',
            lastService: v.last_service || '',
            nextService: v.next_service || '',
            mileage: v.mileage ? Number(v.mileage) : 0
          })));
        }
      });
    });

    const subMaintenance = foyerService.subscribeToChanges('maintenance', foyer.id, () => {
      foyerService.fetchTableData('maintenance', foyer.id).then(maintData => {
        if (maintData) {
          setMaintenance(maintData.map(m => ({
            id: m.id,
            title: m.title,
            provider: m.provider || '',
            date: m.date || '',
            cost: Number(m.cost || 0),
            status: (m.status as any) || 'scheduled'
          })));
        }
      });
    });

    const subTrips = foyerService.subscribeToChanges('trips', foyer.id, () => {
      foyerService.fetchTableData('trips', foyer.id).then(tripsData => {
        if (tripsData) {
          setTrips(tripsData.map(t => ({
            id: t.id,
            destination: t.destination,
            startDate: t.start_date || '',
            endDate: t.end_date || '',
            budget: Number(t.budget || 0),
            checklist: typeof t.checklist === 'string' ? JSON.parse(t.checklist) : t.checklist || [],
            bookingRefs: t.booking_refs || []
          })));
        }
      });
    });

    const subPets = foyerService.subscribeToChanges('pets', foyer.id, () => {
      foyerService.fetchTableData('pets', foyer.id).then(petsData => {
        if (petsData) {
          setPets(petsData.map(p => ({
            id: p.id,
            name: p.name,
            species: p.species || '',
            lastVaccine: p.last_vaccine || '',
            nextVaccine: p.next_vaccine || '',
            vetAppointment: p.vet_appointment || undefined,
            notes: p.notes || undefined,
            weightHistory: typeof p.weight_history === 'string' ? JSON.parse(p.weight_history) : p.weight_history || [],
            documentIds: p.document_ids || []
          })));
        }
      });
    });

    const subPocketMoney = foyerService.subscribeToChanges('pocket_money', foyer.id, () => {
      foyerService.fetchTableData('pocket_money', foyer.id).then(pmData => {
        if (pmData) {
          setPocketMoney(pmData.map(p => ({
            id: p.id,
            name: p.name,
            balance: Number(p.balance || 0),
            points: Number(p.points || 0),
            avatar: p.avatar || '',
            goalTitle: p.goal_title || undefined,
            goalAmount: p.goal_amount ? Number(p.goal_amount) : undefined
          })));
        }
      });
    });

    const subArtisans = foyerService.subscribeToChanges('artisans', foyer.id, () => {
      foyerService.fetchTableData('artisans', foyer.id).then(artisansData => {
        if (artisansData) {
          setArtisans(artisansData.map(a => ({
            id: a.id,
            name: a.name,
            specialty: a.specialty,
            phone: a.phone || '',
            email: a.email || '',
            rating: a.rating || 5,
            notes: a.notes || ''
          })));
        }
      });
    });

    const subAlerts = foyerService.subscribeToChanges('alerts', foyer.id, () => {
      const client = getSupabaseClient();
      if (!client) return;
      client.from('alerts').select('*').eq('foyer_id', foyer.id).then(({ data: alertsData }) => {
        if (alertsData) {
          setAlerts(alertsData.map(a => ({
            id: a.id,
            title: a.title,
            description: a.description,
            time: a.time,
            type: a.type,
            read: a.read,
            module: a.module
          })));
        }
      });
    });

    return () => {
      if (subEvents) subEvents.unsubscribe();
      if (subGroceries) subGroceries.unsubscribe();
      if (subArchivedLists) subArchivedLists.unsubscribe();
      if (subTasks) subTasks.unsubscribe();
      if (subMessages) subMessages.unsubscribe();
      if (subMemories) subMemories.unsubscribe();
      if (subMembers) subMembers.unsubscribe();
      if (subVehicles) subVehicles.unsubscribe();
      if (subMaintenance) subMaintenance.unsubscribe();
      if (subTrips) subTrips.unsubscribe();
      if (subPets) subPets.unsubscribe();
      if (subPocketMoney) subPocketMoney.unsubscribe();
      if (subArtisans) subArtisans.unsubscribe();
      if (subAlerts) subAlerts.unsubscribe();
    };
  }, [foyer]);

  // 3. Granular database background sync on mutations
  useEffect(() => {
    if (!foyer) return;

    const syncAllData = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      // Helper function to sync a table cleanly
      const syncTable = async (tableName: string, localItems: any[], mapToDb: (item: any) => any, allowDelete: boolean = true) => {
        try {
          const { data: cloudItems } = await client.from(tableName).select('id').eq('foyer_id', foyer.id);
          const cloudIds = (cloudItems || []).map(item => item.id);
          const localIds = localItems.map(item => item.id);

          // Delete missing
          if (allowDelete) {
            const deletedIds = cloudIds.filter(id => !localIds.includes(id));
            if (deletedIds.length > 0) {
              await client.from(tableName).delete().eq('foyer_id', foyer.id).in('id', deletedIds);
            }
          }

          // Upsert current
          if (localItems.length > 0) {
            await client.from(tableName).upsert(localItems.map(mapToDb));
          }
        } catch (err) {
          console.warn(`Sync error for table ${tableName}:`, err);
        }
      };

      // Events
      await syncTable('events', events, e => ({
        id: e.id,
        foyer_id: foyer.id,
        title: e.title,
        type: e.type,
        date_time: e.dateTime || null,
        time: e.time || null,
        member_id: e.memberId || null,
        member_name: e.memberName || null,
        location: e.location || null,
        description: e.description || null,
        done: e.done,
        amount: e.amount || null
      }));


      // Transactions
      await syncTable('transactions', transactions, t => ({
        id: t.id,
        foyer_id: foyer.id,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        title: t.title,
        member_id: t.memberId || null,
        member_name: t.memberName || null
      }));

      // Documents
      await syncTable('documents', documents, d => ({
        id: d.id,
        foyer_id: foyer.id,
        name: d.name,
        category: d.category,
        sub_category: d.subCategory || null,
        member_id: d.memberId || null,
        member_name: d.memberName || null,
        tags: d.tags || [],
        upload_date: d.uploadDate,
        expiry_date: d.expiryDate || null,
        file_size: d.fileSize,
        is_expired: d.isExpired,
        description: d.description || null,
        file_base64: d.fileBase64 || null,
        is_secure: d.isSecure
      }));

      // Dishes
      await syncTable('dishes', dishes, d => ({
        id: d.id,
        foyer_id: foyer.id,
        day: d.day,
        meal_type: d.mealType,
        name: d.name,
        image: d.image,
        ingredients: d.ingredients || []
      }));

      // Chore tasks
      await syncTable('chore_tasks', tasks, t => ({
        id: t.id,
        foyer_id: foyer.id,
        title: t.title,
        reward_points: t.rewardPoints,
        assigned_member_id: t.assignedMemberId || null,
        assigned_member_name: t.assignedMemberName || null,
        done: t.done,
        rotation: t.rotation,
        validated_by_parent: t.validatedByParent,
        due_date: t.dueDate || null
      }));

      // Saving Goals
      await syncTable('saving_goals', savingGoals, s => ({
        id: s.id,
        foyer_id: foyer.id,
        title: s.title,
        target_amount: s.targetAmount,
        current_amount: s.currentAmount,
        target_date: s.targetDate,
        category: s.category
      }));

      // Alerts
      await syncTable('alerts', alerts, a => ({
        id: a.id,
        foyer_id: foyer.id,
        title: a.title,
        description: a.description,
        time: a.time,
        type: a.type,
        read: a.read,
        module: a.module || null
      }), false);


      // Votes
      await syncTable('votes', votes, v => ({
        id: v.id,
        foyer_id: foyer.id,
        question: v.question,
        options: v.options,
        author_name: v.authorName,
        active: v.active,
        due_date: v.dueDate
      }), false);

      // School tasks
      await syncTable('school_tasks', schoolTasks, s => ({
        id: s.id,
        foyer_id: foyer.id,
        subject: s.subject,
        title: s.title,
        due_date: s.dueDate,
        done: s.done,
        assigned_member_id: s.assignedMemberId || null,
        difficulty: s.difficulty,
        grade: s.grade || null
      }), false);

      // Chat groups
      await syncTable('chat_groups', chatGroups, c => ({
        id: c.id,
        foyer_id: foyer.id,
        name: c.name,
        is_private: c.isPrivate,
        member_ids: c.memberIds || [],
        last_message: c.lastMessage || null,
        last_message_time: c.lastMessageTime || null,
        unread_count: c.unreadCount || 0
      }), false);

      // Chat messages
      await syncTable('chat_messages', chatMessages, c => ({
        id: c.id,
        foyer_id: foyer.id,
        group_id: c.groupId,
        sender_id: c.senderId,
        sender_name: c.senderName,
        type: c.type,
        content: c.content,
        timestamp: c.timestamp,
        read_by: c.readBy || [],
        reactions: c.reactions || []
      }), false);

      // Demarches
      await syncTable('demarches', demarches, d => ({
        id: d.id,
        foyer_id: foyer.id,
        template_id: d.templateId || null,
        title: d.title,
        icon: d.icon,
        status: d.status,
        assigned_member_id: d.assignedMemberId || null,
        assigned_member_name: d.assignedMemberName || null,
        steps: d.steps,
        pieces: d.pieces,
        created_at_text: d.createdAt,
        notes: d.notes || null
      }));

      // Packs
      await syncTable('justificatif_packs', justificatifPacks, p => ({
        id: p.id,
        foyer_id: foyer.id,
        name: p.name,
        template_type: p.templateType,
        document_ids: p.documentIds || [],
        created_at_text: p.createdAt
      }));

      // Vehicles
      await syncTable('vehicles', vehicles, v => ({
        id: v.id,
        foyer_id: foyer.id,
        name: v.name,
        plate: v.plate || null,
        insurance_expiry: v.insuranceExpiry || null,
        technical_control: v.technicalControl || null,
        last_service: v.lastService || null,
        next_service: v.nextService || null,
        mileage: v.mileage || 0
      }));

      // Maintenance
      await syncTable('maintenance', maintenance, m => ({
        id: m.id,
        foyer_id: foyer.id,
        title: m.title,
        date: m.date || null,
        cost: m.cost || 0,
        status: m.status || 'scheduled',
        provider: m.provider || null
      }));

      // Trips
      await syncTable('trips', trips, t => ({
        id: t.id,
        foyer_id: foyer.id,
        destination: t.destination,
        start_date: t.startDate || null,
        end_date: t.endDate || null,
        budget: t.budget || 0,
        checklist: t.checklist || [],
        booking_refs: t.bookingRefs || []
      }));

      // Pets
      await syncTable('pets', pets, p => ({
        id: p.id,
        foyer_id: foyer.id,
        name: p.name,
        species: p.species || null,
        last_vaccine: p.lastVaccine || null,
        next_vaccine: p.nextVaccine || null,
        vet_appointment: p.vetAppointment || null,
        notes: p.notes || null,
        weight_history: p.weightHistory || [],
        document_ids: p.documentIds || []
      }));

      // Pocket Money
      await syncTable('pocket_money', pocketMoney, p => ({
        id: p.id,
        foyer_id: foyer.id,
        name: p.name,
        balance: p.balance || 0,
        points: p.points || 0,
        avatar: p.avatar || null,
        goal_title: p.goalTitle || null,
        goal_amount: p.goalAmount || null
      }));

      // Artisans
      await syncTable('artisans', artisans, a => ({
        id: a.id,
        foyer_id: foyer.id,
        name: a.name,
        specialty: a.specialty,
        phone: a.phone || null,
        email: a.email || null,
        rating: a.rating || 5,
        notes: a.notes || null
      }));
    };

    const timer = setTimeout(() => {
      syncAllData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    foyer,
    events, transactions, documents, dishes, tasks, savingGoals,
    alerts, votes, schoolTasks, chatGroups, chatMessages, demarches,
    justificatifPacks, vehicles, maintenance, trips, pets, pocketMoney, artisans
  ]);

  const startVoiceAssistant = () => {
    if (!isPremium) {
      setPaywallOpen(true);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas l'API de reconnaissance vocale.");
      return;
    }

    if (voiceActive) {
      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.stop();
      }
      setVoiceActive(false);
      return;
    }

    setVoiceActive(true);
    setVoiceTranscript('Je vous écoute...');
    setVoiceFeedback('');
    setVoiceWave(true);

    const recognition = new SpeechRecognition();
    voiceRecognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(`"${transcript}"`);
      setVoiceWave(false);
      
      // Parse Voice Command
      setTimeout(() => {
        parseVoiceCommand(transcript);
      }, 1000);
    };

    recognition.onerror = (event: any) => {
      console.error("Vocal search error", event.error);
      setVoiceTranscript("🎙️ Micro non autorisé ou inactif. Saisissez votre commande ci-dessous :");
      setVoiceWave(false);
    };

    recognition.onend = () => {
      setVoiceWave(false);
    };

    recognition.start();
  };

  const parseVoiceCommand = (text: string) => {
    const promptLower = text.toLowerCase().trim();
    let feedback = "";

    // Check if voice command is about a financial transaction/expense first (prioritize money terms)
    const hasEuro = promptLower.includes('euro') || promptLower.includes('€');
    const isFinancial = hasEuro || promptLower.includes('dépense') || promptLower.includes('depense') || promptLower.includes('revenu') || promptLower.includes('salaire');

    if (isFinancial && (promptLower.includes('ajoute') || promptLower.includes('ajouter') || promptLower.includes('enregistre') || promptLower.includes('enregistrer') || promptLower.includes('noter') || promptLower.includes('note') || promptLower.includes('mets') || promptLower.includes('mettre') || promptLower.includes('payé') || promptLower.includes('paye'))) {
      const amountRegex = /(\d+[\.,]?\d*)\s*(?:euros?|€)/i;
      const amountMatch = promptLower.match(amountRegex);
      
      if (amountMatch) {
        const amountVal = parseFloat(amountMatch[1].replace(',', '.'));
        
        let category = 'Divers';
        if (promptLower.includes('course') || promptLower.includes('aliment') || promptLower.includes('supermarché') || promptLower.includes('manger') || promptLower.includes('carrefour') || promptLower.includes('auchan')) {
          category = 'Alimentation';
        } else if (promptLower.includes('essence') || promptLower.includes('carburant') || promptLower.includes('péage') || promptLower.includes('voiture') || promptLower.includes('transport') || promptLower.includes('total')) {
          category = 'Transport';
        } else if (promptLower.includes('loyer') || promptLower.includes('logement') || promptLower.includes('maison') || promptLower.includes('électricité') || promptLower.includes('eau')) {
          category = 'Logement';
        } else if (promptLower.includes('santé') || promptLower.includes('médecin') || promptLower.includes('pharmacie') || promptLower.includes('médicament')) {
          category = 'Santé';
        } else if (promptLower.includes('école') || promptLower.includes('cahier') || promptLower.includes('livre') || promptLower.includes('études')) {
          category = 'Éducation';
        } else if (promptLower.includes('cinéma') || promptLower.includes('restaurant') || promptLower.includes('jeu') || promptLower.includes('sport') || promptLower.includes('loisir')) {
          category = 'Loisirs';
        }

        let type: 'expense' | 'income' | 'savings' = 'expense';
        if (promptLower.includes('salaire') || promptLower.includes('revenu') || promptLower.includes('reçu') || promptLower.includes('gagné')) {
          type = 'income';
        } else if (promptLower.includes('épargne') || promptLower.includes('cagnotte')) {
          type = 'savings';
        }

        let title = 'Achat rapide';
        let cleanTitle = text.replace(/ajoute|ajouter|enregistre|enregistrer|noter|note|mets|mettre/gi, '').trim();
        cleanTitle = cleanTitle.replace(amountRegex, '').trim();
        cleanTitle = cleanTitle.replace(/en\s+\w+/gi, '').trim(); 
        if (cleanTitle) {
          title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        }

        const activeMemberObj = members.find(m => m.id === activeMemberId);

        handleAddTransaction({
          amount: amountVal,
          type,
          category,
          date: new Date().toISOString().split('T')[0],
          title,
          memberId: activeMemberId,
          memberName: activeMemberObj?.name || 'Famille'
        });

        feedback = `💰 Finance : J'ai enregistré une dépense de ${amountVal}€ (${category}) pour "${title}" !`;
        
        setActiveTab('finances');
        setActiveModule('');
      }
    }

    // 1. Action commands (e.g. ajoute des bananes) - PRIORITÉ ABSOLUE
    if (
      promptLower.includes('ajoute') || 
      promptLower.includes('ajouter') || 
      promptLower.includes('mets') || 
      promptLower.includes('mettre') || 
      promptLower.includes('rajoute') || 
      promptLower.includes('rajouter') ||
      promptLower.includes('prépare') ||
      promptLower.includes('prepare')
    ) {
      const activeMemberObj = members.find(m => m.id === activeMemberId);
      const activeMemberName = activeMemberObj?.name || 'Foyer';
      const parsedItems = parseSmartNaturalSentence(text, activeMemberName);

      if (parsedItems.length > 0) {
        parsedItems.forEach(item => {
          handleAddGroceryItem(item.name, item.category, item.quantity, item.meal, item.addedBy, !!item.isFavorite);
        });

        if (parsedItems.length === 1) {
          feedback = `🛒 Action : J'ai ajouté "${parsedItems[0].name}" (${parsedItems[0].quantity}) dans la catégorie *${parsedItems[0].category}* !`;
        } else {
          feedback = `🛒 Action : J'ai ajouté ${parsedItems.length} articles à vos courses (${parsedItems.map(i => i.name).join(', ')}) !`;
        }

        // Open the grocery list interface instantly
        setActiveTab('menu');
        setActiveModule('courses');
      } else {
        feedback = "🤔 Je n'ai pas compris quel article ajouter à vos courses...";
      }
    } 
    else if (promptLower.includes('alerte') || promptLower.includes('sos') || promptLower.includes('danger')) {
      triggerSosAlarm();
      feedback = "🚨 ACTION CRITIQUE : Alerte SOS activée ! Vos proches ont été notifiés.";
    }
    // 2. Navigation to tabs
    else if (promptLower.includes('carte') || promptLower.includes('gps') || promptLower.includes('position') || promptLower.includes('itiné')) {
      setActiveTab('menu');
      setActiveModule('carte');
      feedback = "🧭 Navigation : J'affiche la Carte Familiale.";
    } 
    else if (promptLower.includes('agenda') || promptLower.includes('planning') || promptLower.includes('calendrier') || promptLower.includes('évènement') || promptLower.includes('rdv') || promptLower.includes('rendez')) {
      setActiveTab('agenda');
      setActiveModule('');
      feedback = "📅 Navigation : J'ouvre l'Agenda Familial.";
    } 
    else if (promptLower.includes('finance') || promptLower.includes('budget') || promptLower.includes('dépense') || promptLower.includes('argent') || promptLower.includes('cagnotte') || promptLower.includes('solde')) {
      setActiveTab('finances');
      setActiveModule('');
      feedback = "💰 Navigation : J'ouvre le module Finances & Épargne.";
    } 
    // 3. Navigation to specific submodules inside Menu
    else if (promptLower.includes('course') || promptLower.includes('caddie') || promptLower.includes('achat') || promptLower.includes('épicerie') || promptLower.includes('supermar')) {
      setActiveTab('menu');
      setActiveModule('courses');
      feedback = "🛒 Navigation : J'affiche la liste de courses partagée (Éco-Chef).";
    } 
    else if (promptLower.includes('capsule') || promptLower.includes('temps') || promptLower.includes('souvenir') || promptLower.includes('moment')) {
      setActiveTab('menu');
      setActiveModule('capsule');
      feedback = "🔒 Navigation : J'ouvre la Capsule Temporelle de vos souvenirs.";
    } 
    else if (promptLower.includes('peacemaker') || promptLower.includes('dispute') || promptLower.includes('arbitre') || promptLower.includes('juge')) {
      setActiveTab('menu');
      setActiveModule('peacemaker');
      feedback = "⚖️ Navigation : J'active le PeaceMaker IA pour résoudre le conflit.";
    } 
    else if (promptLower.includes('simul') || promptLower.includes('mavie') || promptLower.includes('vie')) {
      setActiveTab('menu');
      setActiveModule('mavie');
      feedback = "🎮 Navigation : Je lance le simulateur d'éducation MaVie.";
    } 
    else if (promptLower.includes('conseil') || promptLower.includes('vote') || promptLower.includes('décision') || promptLower.includes('scrutin')) {
      setActiveTab('menu');
      setActiveModule('conseil');
      feedback = "🗳️ Navigation : J'ouvre le Conseil de Famille.";
    } 
    else if (promptLower.includes('messagerie') || promptLower.includes('discussion') || promptLower.includes('tchat') || promptLower.includes('chat') || promptLower.includes('parle')) {
      setActiveTab('menu');
      setActiveModule('messagerie');
      feedback = "💬 Navigation : J'affiche la messagerie familiale.";
    }
    else if (promptLower.includes('devoir') || promptLower.includes('tuteur') || promptLower.includes('école') || promptLower.includes('prof')) {
      setActiveTab('menu');
      setActiveModule('devoirs');
      feedback = "🎓 Navigation : J'ouvre le Tuteur Scolaire IA.";
    }
    else if (promptLower.includes('coffre') || promptLower.includes('document') || promptLower.includes('papier') || promptLower.includes('cni')) {
      setActiveTab('menu');
      setActiveModule('documents');
      feedback = "📂 Navigation : J'ouvre le Coffre-Fort administratif.";
    }
    else if (promptLower.includes('voyage') || promptLower.includes('vacance') || promptLower.includes('bagage')) {
      setActiveTab('menu');
      setActiveModule('voyage');
      feedback = "✈️ Navigation : Je lance l'Assistant Voyage IA.";
    }
    else {
      feedback = `🔍 Recherche : Commande "${text}" non reconnue. Essayez : "Ouvre l'agenda", "Affiche la carte" ou "Ajoute du lait".`;
    }

    setVoiceFeedback(feedback);
    
    // Automatically close overlay after 2.5 seconds
    setTimeout(() => {
      setVoiceActive(false);
    }, 2500);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#share_')) {
        setSharedPackId(hash.replace('#share_', ''));
      } else {
        setSharedPackId(null);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Robust Versioned Migration: Force override corrupted cache with correct data
  useEffect(() => {
    // Skip migration reset if a cloud foyer is active — cloud data takes priority
    if (hadCloudFoyer) return;

    const appVersion = localStorage.getItem('mf_app_version');
    if (appVersion !== '1.2') {
      // 1. Purge corrupted avatars
      localStorage.setItem('mf_members', JSON.stringify(demoMembers));
      setMembers(demoMembers);
      
      const resetPocketMoney = [
        { id: '3', name: 'Amadou', balance: 15.00, points: 150, avatar: '/avatars/amadou.png' },
        { id: '4', name: 'Awa', balance: 22.50, points: 225, avatar: '/avatars/awa.png' }
      ];
      localStorage.setItem('mf_pocket_money', JSON.stringify(resetPocketMoney));
      setPocketMoney(resetPocketMoney);

      // 2. Purge old dishes
      localStorage.setItem('mf_dishes', JSON.stringify(demoDishes));
      setDishes(demoDishes);

      // 3. Mark version as upgraded
      localStorage.setItem('mf_app_version', '1.2');
    }
  }, []);

  // Sync state to localStorage safely on modification
  useEffect(() => {
    safeSetLocalStorage('mf_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    safeSetLocalStorage('mf_dishes', JSON.stringify(dishes));
  }, [dishes]);

  useEffect(() => {
    safeSetLocalStorage('mf_active_member_id', activeMemberId);
  }, [activeMemberId]);

  useEffect(() => {
    safeSetLocalStorage('mf_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    safeSetLocalStorage('mf_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    safeSetLocalStorage('mf_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    safeSetLocalStorage('mf_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    safeSetLocalStorage('mf_groceries', JSON.stringify(groceries));
  }, [groceries]);

  useEffect(() => {
    safeSetLocalStorage('mf_saving_goals', JSON.stringify(savingGoals));
  }, [savingGoals]);

  useEffect(() => {
    safeSetLocalStorage('mf_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    safeSetLocalStorage('mf_vaccines', JSON.stringify(vaccines));
  }, [vaccines]);

  useEffect(() => {
    safeSetLocalStorage('mf_chat_groups', JSON.stringify(chatGroups));
  }, [chatGroups]);

  useEffect(() => {
    safeSetLocalStorage('mf_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    safeSetLocalStorage('mf_demarches', JSON.stringify(demarches));
  }, [demarches]);

  useEffect(() => {
    safeSetLocalStorage('mf_packs', JSON.stringify(justificatifPacks));
  }, [justificatifPacks]);

  useEffect(() => {
    safeSetLocalStorage('mf_currency', currency);
  }, [currency]);

  useEffect(() => {
    safeSetLocalStorage('mf_sb_url', supabaseUrl);
    safeSetLocalStorage('mf_sb_key', supabaseKey);
    safeSetLocalStorage('mf_sync_active', String(syncActive));
  }, [supabaseUrl, supabaseKey, syncActive]);

  useEffect(() => {
    safeSetLocalStorage('mf_memories', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    safeSetLocalStorage('mf_votes', JSON.stringify(votes));
  }, [votes]);

  useEffect(() => {
    safeSetLocalStorage('mf_school_tasks', JSON.stringify(schoolTasks));
  }, [schoolTasks]);

  useEffect(() => {
    safeSetLocalStorage('mf_moods', JSON.stringify(memberMoods));
  }, [memberMoods]);

  useEffect(() => {
    safeSetLocalStorage('mf_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    safeSetLocalStorage('mf_maintenance', JSON.stringify(maintenance));
  }, [maintenance]);

  useEffect(() => {
    safeSetLocalStorage('mf_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    safeSetLocalStorage('mf_pets', JSON.stringify(pets));
  }, [pets]);

  useEffect(() => {
    safeSetLocalStorage('mf_pocket_money', JSON.stringify(pocketMoney));
  }, [pocketMoney]);

  useEffect(() => {
    safeSetLocalStorage('mf_artisans', JSON.stringify(artisans));
  }, [artisans]);

  // ----------------------------------------------------
  // Dynamic Currency Converter Engine
  // ----------------------------------------------------
  const getCurrencySymbol = () => {
    if (currency.includes('FCFA')) return 'FCFA';
    if (currency.includes('USD')) return '$';
    return '€';
  };

  const getExchangeRate = () => {
    // Les données initiales de démo sont stockées en Euros
    if (currency.includes('FCFA')) return 655; // 1 EUR = 655 FCFA
    if (currency.includes('USD')) return 1.10; // 1 EUR = 1.10 USD
    return 1.0;
  };

  const formatMoney = (amountInEuro: number) => {
    const rate = getExchangeRate();
    const symbol = getCurrencySymbol();
    const converted = amountInEuro * rate;
    
    // Formatage français élégant avec espaces pour milliers
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0
    }).format(converted) + ' ' + symbol;
  };



  // ----------------------------------------------------
  // Callbacks and Form Submissions
  // ----------------------------------------------------
  const handleAddEvent = async (newEvent: any) => {
    if (!isPremium) {
      const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
      const monthlyEventsCount = events.filter(e => e.dateTime.startsWith(currentMonth)).length;
      if (monthlyEventsCount >= 10) {
        setPaywallOpen(true);
        return;
      }
    }
    const id = `ev-${Date.now()}`;
    setEvents(prev => [{ ...newEvent, id }, ...prev]);

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          // 1. Sauvegarder l'événement dans Supabase
          const { error } = await client.from('events').insert({
            id,
            foyer_id: foyer.id,
            title: newEvent.title,
            type: newEvent.type || 'other',
            date_time: newEvent.dateTime,
            time: newEvent.time || '',
            member_id: newEvent.memberId || '',
            member_name: newEvent.memberName || '',
            location: newEvent.location || '',
            description: newEvent.description || '',
            done: newEvent.done || false,
            amount: newEvent.amount || null
          });
          if (error) {
            console.error("Erreur lors de la création de l'événement cloud :", error);
            return;
          }

          // 2. Générer une alerte cloud d'événement pour notifier toute la famille
          const activeMemberObj = members.find(m => m.id === activeMemberId);
          const activeMemberName = activeMemberObj ? activeMemberObj.name : 'Un parent';

          const newAlert = {
            id: `a-ev-${Date.now()}-by-${activeMemberId}`,
            title: `📅 Nouvel événement : ${newEvent.title}`,
            description: `Ajouté pour le ${newEvent.dateTime.split('T')[0]} par ${activeMemberName}.`,
            time: 'À l\'instant',
            type: 'info' as const,
            read: false,
            module: 'agenda'
          };

          await client.from('alerts').insert({
            id: newAlert.id,
            foyer_id: foyer.id,
            title: newAlert.title,
            description: newAlert.description,
            time: newAlert.time,
            type: newAlert.type,
            read: newAlert.read,
            module: newAlert.module
          });
        } catch (err) {
          console.error("Erreur lors de l'ajout cloud de l'événement :", err);
        }
      }
    }
  };

  const handleAddTransaction = async (newTrans: any) => {
    const id = `tx-${Date.now()}`;
    setTransactions(prev => [{ ...newTrans, id }, ...prev]);

    // Si la transaction est de type Épargne, mettre à jour l'objectif d'épargne principal
    if (newTrans.type === 'savings') {
      setSavingGoals(prev => prev.map((goal, idx) => {
        if (idx === 0) { // On incrémente le premier objectif par défaut
          return {
            ...goal,
            currentAmount: goal.currentAmount + newTrans.amount
          };
        }
        return goal;
      }));
    }

    // Sauvegarde en ligne vers Supabase
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const activeFoyerId = foyer?.id || localStorage.getItem('mf_cloud_foyer_id') || 'foyer-simulated';
          await supabase.from('transactions').insert({
            family_id: activeFoyerId,
            user_id: user.id,
            amount: newTrans.amount,
            type: newTrans.type,
            category: newTrans.category,
            date: newTrans.date || new Date().toISOString().split('T')[0],
            title: newTrans.title,
            note: newTrans.note || '',
            image_url: newTrans.imageUrl || null
          });
        }
      }
    } catch (e) {
      console.warn("Dépense sauvegardée localement (Supabase hors ligne ou non configuré):", e);
    }
  };

  const handleAddTask = (newTask: any) => {
    const id = `tk-${Date.now()}`;
    setTasks(prev => [{ ...newTask, id }, ...prev]);
  };

  const handleAddMember = async (newMem: any) => {
    if (!isPremium && members.length >= 3) {
      setPaywallOpen(true);
      return;
    }
    if (foyer) {
      try {
        const addedMem = await foyerService.addMemberToFoyer(foyer.id, newMem);
        // Traduire le membre retourné de Supabase au format UI frontend
        const mappedMember = {
          id: addedMem.id,
          name: addedMem.displayName,
          role: addedMem.role === 'admin' ? 'Chef de famille' :
                addedMem.role === 'parent' ? 'Gestionnaire' :
                addedMem.role === 'guest' ? 'Invité' : 'Enfant',
          age: addedMem.age || 'Nouveau',
          birthDate: addedMem.birthDate || 'Inconnue',
          bloodGroup: addedMem.bloodGroup || 'A+',
          allergies: addedMem.allergies || ['Aucune'],
          treatments: addedMem.treatments || ['Aucun'],
          emergencyContact: {
            name: addedMem.emergencyContactName || 'Maman',
            phone: addedMem.emergencyContactPhone || '',
            relation: addedMem.emergencyContactRelation || 'Mère'
          },
          schoolOrEmployer: addedMem.schoolOrEmployer || 'Non renseigné',
          photoUrl: addedMem.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${addedMem.displayName}`,
          hasExemption: addedMem.hasExemption || false,
          medicalHistory: []
        };
        setMembers(prev => [...prev, mappedMember]);
        alert(`🎉 Fiche membre de ${mappedMember.name} créée et enregistrée avec succès dans le Cloud ! ✨`);
      } catch (err: any) {
        console.error("Erreur lors de la création du membre sur Supabase :", err);
        alert(`Impossible d'enregistrer le membre dans le cloud : ${err.message || err}`);
      }
    } else {
      const id = `${members.length + 1}`;
      setMembers(prev => [...prev, { ...newMem, id, hasExemption: newMem.hasExemption || false }]);
    }
  };

  const handleToggleEventDone = async (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, done: !e.done } : e));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const currentEvent = events.find(e => e.id === id);
          if (currentEvent) {
            const { error } = await client
              .from('events')
              .update({ done: !currentEvent.done })
              .eq('foyer_id', foyer.id)
              .eq('id', id);
            if (error) {
              console.error("Erreur lors de la mise à jour cloud du statut de l'événement :", error);
            }
          }
        } catch (err) {
          console.error("Erreur de modification de l'événement :", err);
        }
      }
    }
  };

  const handleUpdateMemberProfile = async (memberId: string, updates: Partial<FoyerMember>) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const convertedUpdates: any = {};
        if (updates.displayName !== undefined) convertedUpdates.name = updates.displayName;
        if (updates.photoUrl !== undefined) convertedUpdates.photoUrl = updates.photoUrl;
        if (updates.role !== undefined) {
          convertedUpdates.role = 
            updates.role === 'admin' ? 'Chef de famille' :
            updates.role === 'parent' ? 'Gestionnaire' :
            updates.role === 'child' ? 'Enfant' :
            'Invité';
        }
        if (updates.age !== undefined) convertedUpdates.age = updates.age;
        if (updates.birthDate !== undefined) convertedUpdates.birthDate = updates.birthDate;
        if (updates.bloodGroup !== undefined) convertedUpdates.bloodGroup = updates.bloodGroup;
        if (updates.schoolOrEmployer !== undefined) convertedUpdates.schoolOrEmployer = updates.schoolOrEmployer;
        if (updates.hasExemption !== undefined) convertedUpdates.hasExemption = updates.hasExemption;
        
        return { ...m, ...convertedUpdates };
      }
      return m;
    }));
    
    // Instant update of active user's own profile state if they edited their own profile
    if (myMemberProfile && memberId === myMemberProfile.id) {
      setMyMemberProfile(prev => prev ? { ...prev, ...updates } : null);
    }

    if (foyer) {
      try {
        await foyerService.updateMemberProfile(memberId, updates);
      } catch (e) {
        console.error("Erreur lors de la mise à jour du profil membre :", e);
      }
    }
  };

  const handleMoveEvent = async (id: string, newDate: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id === id) {
        const timePart = e.dateTime.split('T')[1];
        return { ...e, dateTime: timePart ? `${newDate}T${timePart}` : newDate };
      }
      return e;
    }));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const currentEvent = events.find(e => e.id === id);
          if (currentEvent) {
            const timePart = currentEvent.dateTime.split('T')[1];
            const newDateTime = timePart ? `${newDate}T${timePart}` : newDate;
            const { error } = await client
              .from('events')
              .update({ date_time: newDateTime })
              .eq('foyer_id', foyer.id)
              .eq('id', id);
            if (error) {
              console.error("Erreur lors du déplacement cloud de l'événement :", error);
            }
          }
        } catch (err) {
          console.error("Erreur de déplacement de l'événement :", err);
        }
      }
    }
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleValidateTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        // Ajouter la récompense financière correspondante au budget épargne
        // Ex: 10 points = 1.00 € / Equivalent devise
        handleAddTransaction({
          amount: t.rewardPoints / 10,
          type: 'savings',
          category: 'Argent de Poche',
          date: new Date().toISOString().split('T')[0],
          title: `Récompense : ${t.title}`,
          memberName: t.assignedMemberName
        });
        
        // Mettre à jour l'argent de poche de l'enfant (points)
        if (t.assignedMemberId || t.assignedMemberName) {
          setPocketMoney(prev => prev.map(child => {
            if (child.id === t.assignedMemberId || child.name.toLowerCase() === t.assignedMemberName?.toLowerCase()) {
              return {
                ...child,
                points: child.points + t.rewardPoints
              };
            }
            return child;
          }));
        }
        
        return { ...t, validatedByParent: true };
      }
      return t;
    }));
  };

  const handleToggleGrocery = async (id: string) => {
    const item = groceries.find(g => g.id === id);
    if (!item) return;

    const newCheckedVal = !item.checked;

    setGroceries(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, checked: newCheckedVal, inStock: newCheckedVal };
      }
      return g;
    }));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        const { data, error, count } = await client.from('groceries').update({ 
          checked: newCheckedVal,
          in_stock: newCheckedVal
        }, { count: 'exact' }).eq('foyer_id', foyer.id).eq('id', id).select();

        if (error) {
          console.error("[Groceries Toggle] Supabase error:", error.message, error.details, error.hint);
          setGroceries(prev => prev.map(g => {
            if (g.id === id) return { ...g, checked: !newCheckedVal, inStock: !newCheckedVal };
            return g;
          }));
        } else if (count === 0) {
          // Row doesn't exist in DB — insert it first, then it will work
          console.warn(`[Groceries Toggle] 0 rows matched for id=${id} — inserting row into DB`);
          await client.from('groceries').insert({
            id: item.id,
            foyer_id: foyer.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            checked: newCheckedVal,
            in_stock: newCheckedVal
          });
          console.log(`[Groceries Toggle] Inserted missing row id=${id}, checked=${newCheckedVal}`);
        } else {
          console.log(`[Groceries Toggle] OK — id=${id}, checked=${newCheckedVal}, returned JSON:`, JSON.stringify(data));
        }
      }
    }
  };

  const handleAddGroceryItem = async (
    name: string, 
    category: string, 
    qty: string, 
    meal?: string, 
    addedBy?: string, 
    isFavorite: boolean = false
  ) => {
    const id = `gr-${Date.now()}`;
    const activeMember = members.find(m => m.id === activeMemberId);
    const defaultAddedBy = addedBy || activeMember?.name || 'Foyer';
    const newItem: GroceryItem = {
      id,
      name,
      category,
      quantity: qty,
      checked: false,
      inStock: false,
      meal,
      addedBy: defaultAddedBy,
      isFavorite
    };

    setGroceries(prev => [newItem, ...prev]);

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('groceries').insert({
            id,
            foyer_id: foyer.id,
            name,
            category,
            quantity: qty,
            checked: false,
            in_stock: false,
            meal: meal || null,
            added_by: defaultAddedBy,
            is_favorite: isFavorite
          });
        } catch (err) {
          console.error("Erreur lors de l'ajout cloud de la course :", err);
        }
      }
    }
  };

  const handleToggleFavoriteGrocery = async (id: string) => {
    const item = groceries.find(g => g.id === id);
    if (!item) return;

    const newFavVal = !item.isFavorite;

    setGroceries(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, isFavorite: newFavVal };
      }
      return g;
    }));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('groceries').update({ 
            is_favorite: newFavVal
          }).eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la modification favorite de la course :", err);
        }
      }
    }
  };

  const handleArchiveCurrentList = async (name: string, store?: string) => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) return;

    const listId = `al-${Date.now()}`;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const activeMember = members.find(m => m.id === activeMemberId);
    const currentMemberName = activeMember?.name || 'Foyer';

    const newList: ArchivedList = {
      id: listId,
      name,
      date: dateStr,
      items: [...groceries],
      store: store || undefined,
      createdBy: currentMemberName
    };

    setArchivedLists(prev => [newList, ...prev]);

    try {
      await client.from('archived_lists').insert({
        id: listId,
        foyer_id: foyer.id,
        name,
        date: dateStr,
        items: groceries,
        store: store || null,
        created_by: currentMemberName
      });
    } catch (err) {
      console.error("Erreur lors de l'archivage cloud :", err);
    }
  };

  const handleReuseArchivedList = async (listId: string) => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) return;

    const list = archivedLists.find(l => l.id === listId);
    if (!list) return;

    const newItemsToInsert: GroceryItem[] = list.items.map((item, idx) => ({
      id: `gr-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      checked: false,
      inStock: false,
      meal: item.meal,
      addedBy: item.addedBy,
      isFavorite: item.isFavorite
    }));

    setGroceries(prev => [...newItemsToInsert, ...prev]);

    try {
      const inserts = newItemsToInsert.map(item => ({
        id: item.id,
        foyer_id: foyer.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        checked: false,
        in_stock: false,
        meal: item.meal || null,
        added_by: item.addedBy || null,
        is_favorite: !!item.isFavorite
      }));
      await client.from('groceries').insert(inserts);
    } catch (err) {
      console.error("Erreur lors de la réutilisation de la liste :", err);
    }
  };

  const handleDeleteArchivedList = async (listId: string) => {
    setArchivedLists(prev => prev.filter(l => l.id !== listId));
    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('archived_lists').delete().eq('foyer_id', foyer.id).eq('id', listId);
        } catch (err) {
          console.error("Erreur lors de la suppression de la liste archivée :", err);
        }
      }
    }
  };

  const handleCleanGroceryList = async (option: 'checked' | 'all' | 'archive_first' | 'favorites_only') => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) return;

    let itemsToDelete: GroceryItem[] = [];
    let remainingItems: GroceryItem[] = [];

    if (option === 'checked') {
      itemsToDelete = groceries.filter(g => g.checked);
      remainingItems = groceries.filter(g => !g.checked);
    } else if (option === 'all') {
      itemsToDelete = [...groceries];
      remainingItems = [];
    } else if (option === 'favorites_only') {
      itemsToDelete = groceries.filter(g => !g.isFavorite);
      remainingItems = groceries.filter(g => g.isFavorite);
    }

    setGroceries(remainingItems);

    if (itemsToDelete.length > 0) {
      try {
        const ids = itemsToDelete.map(g => g.id);
        await client.from('groceries').delete().eq('foyer_id', foyer.id).in('id', ids);
      } catch (err) {
        console.error("Erreur lors du nettoyage de la liste :", err);
      }
    }
  };

  const handleDeleteGroceryItem = async (id: string) => {
    setGroceries(prev => prev.filter(g => g.id !== id));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('groceries').delete().eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la suppression cloud de la course :", err);
        }
      }
    }
  };

  const handleEditGroceryItem = async (id: string, name: string, qty: string) => {
    setGroceries(prev => prev.map(g => g.id === id ? { ...g, name, quantity: qty } : g));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('groceries').update({ name, quantity: qty }).eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la modification cloud de la course :", err);
        }
      }
    }
  };

  const handleAddMemory = async (newMemory: MemoryLog) => {
    setMemories(prev => {
      if (prev.some(m => m.id === newMemory.id)) return prev;
      return [newMemory, ...prev];
    });

    // Generate a beautiful persistent notification alert locally
    const newAlert = {
      id: `a-mem-${Date.now()}-by-${activeMemberId}`,
      title: `📸 Nouveau moment partagé par ${newMemory.authorName} !`,
      description: `« ${newMemory.title} » a été ajouté au Mur des Moments.`,
      time: 'À l\'instant',
      type: 'info' as const,
      read: false,
      module: 'capsule'
    };
    setAlerts(prev => [newAlert, ...prev]);
    saveAlertToCloud(newAlert);

    // Push standard browser notification if permission is active
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(newAlert.title, {
        body: newAlert.description,
        icon: '/favicon.svg'
      });
    }

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('memories').insert({
            id: newMemory.id,
            foyer_id: foyer.id,
            date: newMemory.date || "Aujourd'hui",
            title: newMemory.title,
            description: newMemory.description || '',
            image_url: newMemory.imageUrl,
            image_urls: newMemory.imageUrls || [newMemory.imageUrl],
            author_name: newMemory.authorName,
            author_photo: newMemory.authorPhoto || '',
            likes_count: newMemory.likesCount || 0,
            is_private: newMemory.isPrivate || false,
            theme: newMemory.theme || '🏖️ Famille'
          });
        } catch (err) {
          console.error("Erreur lors de l'ajout cloud du souvenir :", err);
        }
      }
    }
  };

  const handleDeleteMemory = async (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('memories').delete().eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors de la suppression cloud du souvenir :", err);
        }
      }
    }
  };

  const handleLikeMemory = async (id: string, newLikesCount: number) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, likesCount: newLikesCount } : m));

    if (foyer) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('memories').update({ likes_count: newLikesCount }).eq('foyer_id', foyer.id).eq('id', id);
        } catch (err) {
          console.error("Erreur lors du like cloud du souvenir :", err);
        }
      }
    }
  };

  const handleResetData = () => {
    const client = getSupabaseClient();
    if (client) {
      client.auth.signOut().catch(err => console.warn("SignOut during reset warning:", err));
    }

    localStorage.clear();
    setFoyer(null);
    setMyMemberProfile(null);
    setOnboardingActive(false);

    setMembers(demoMembers);
    setEvents(demoEvents);
    setTransactions(demoTransactions);
    setDocuments(demoDocuments);
    setTasks(demoTasks);
    setGroceries(demoGroceries);
    setSavingGoals(demoSavingGoals);
    setAlerts(demoAlerts);
    setChatGroups(demoChatGroups);
    setChatMessages(demoChatMessages);
    setDemarches(demoDemarches);
    setJustificatifPacks(demoPacks);
    setVehicles(demoVehicles);
    setMaintenance(demoMaintenance);
    setTrips(demoTrips);
    setPets(demoPets);
    setArtisans(demoArtisans);
    setSchoolTasks(demoSchoolTasks);
    setGrades([
      { id: 'g-1', studentId: '3', studentName: 'Amadou', subject: 'Mathématiques', value: 16, max: 20, coef: 2, examTitle: 'Contrôle Algèbre', date: '10/05/2026' },
      { id: 'g-2', studentId: '3', studentName: 'Amadou', subject: 'Histoire-Géographie', value: 15, max: 20, coef: 1, examTitle: 'Examen Révolution', date: '12/05/2026' },
      { id: 'g-3', studentId: '4', studentName: 'Awa', subject: 'Français', value: 18, max: 20, coef: 1, examTitle: 'Dictée de Printemps', date: '14/05/2026' }
    ]);
    setSchedule([
      { id: 's-1', studentId: '3', studentName: 'Amadou', day: 'Lundi', subject: 'Mathématiques', startTime: '08:30', endTime: '09:30', room: 'Salle 102' },
      { id: 's-2', studentId: '3', studentName: 'Amadou', day: 'Lundi', subject: 'Histoire-Géographie', startTime: '09:30', endTime: '10:30', room: 'Salle 204' },
      { id: 's-3', studentId: '4', studentName: 'Awa', day: 'Mardi', subject: 'Français', startTime: '10:45', endTime: '11:45', room: 'Classe A2' }
    ]);
    setMemories(demoMemories);
    setPocketMoney([
      { id: '3', name: 'Amadou', balance: 15.00, points: 150, avatar: 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150' },
      { id: '4', name: 'Awa', balance: 22.50, points: 225, avatar: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=150' }
    ]);
    setCurrency('EUR (€)');
    setSyncActive(false);
    setSupabaseUrl('');
    setSupabaseKey('');
    setActiveTab('accueil');
    setActiveModule('');
    alert('Système réinitialisé avec succès !');
  };

  const handleLogout = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.auth.signOut();
      setFoyer(null);
      setMyMemberProfile(null);
      setOnboardingActive(false);
      setDiscoverMode(false);
      localStorage.removeItem('mf_discover_mode');
      localStorage.removeItem('mf_cloud_foyer_id');
      localStorage.removeItem('school_grades');
      localStorage.removeItem('school_schedule');
      // Restore demo data for offline browsing
      setMembers(demoMembers);
      setEvents(demoEvents);
      setTransactions(demoTransactions);
      setTasks(demoTasks);
      setGroceries(demoGroceries);
      setDocuments(demoDocuments);
      setDishes(demoDishes);
      setVehicles(demoVehicles);
      setMaintenance(demoMaintenance);
      setTrips(demoTrips);
      setPets(demoPets);
      setArtisans(demoArtisans);
      setSchoolTasks(demoSchoolTasks);
      setGrades([
        { id: 'g-1', studentId: '3', studentName: 'Amadou', subject: 'Mathématiques', value: 16, max: 20, coef: 2, examTitle: 'Contrôle Algèbre', date: '10/05/2026' },
        { id: 'g-2', studentId: '3', studentName: 'Amadou', subject: 'Histoire-Géographie', value: 15, max: 20, coef: 1, examTitle: 'Examen Révolution', date: '12/05/2026' },
        { id: 'g-3', studentId: '4', studentName: 'Awa', subject: 'Français', value: 18, max: 20, coef: 1, examTitle: 'Dictée de Printemps', date: '14/05/2026' }
      ]);
      setSchedule([
        { id: 's-1', studentId: '3', studentName: 'Amadou', day: 'Lundi', subject: 'Mathématiques', startTime: '08:30', endTime: '09:30', room: 'Salle 102' },
        { id: 's-2', studentId: '3', studentName: 'Amadou', day: 'Lundi', subject: 'Histoire-Géographie', startTime: '09:30', endTime: '10:30', room: 'Salle 204' },
        { id: 's-3', studentId: '4', studentName: 'Awa', day: 'Mardi', subject: 'Français', startTime: '10:45', endTime: '11:45', room: 'Classe A2' }
      ]);
      setMemories(demoMemories);
      setPocketMoney([
        { id: '3', name: 'Amadou', balance: 15.00, points: 150, avatar: 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150' },
        { id: '4', name: 'Awa', balance: 22.50, points: 225, avatar: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=150' }
      ]);
      alert("Foyer déconnecté. Les données de démonstration ont été restaurées.");
    } catch (err: any) {
      console.error("Erreur lors de la déconnexion :", err);
    }
  };

  const handlePurgeDemoData = async () => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) {
      alert("Erreur de connexion à Supabase.");
      return;
    }

    const confirmPurge = window.confirm(
      "Voulez-vous vraiment purger toutes les données d'exemple MaFamille+ (Amadou, Awa, etc.) de votre base de données en ligne ? \n\n" +
      "Les données personnelles que vous avez créées vous-même ne seront pas supprimées."
    );
    if (!confirmPurge) return;

    try {
      const tableDemoIds: Record<string, string[]> = {
        events: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
        transactions: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9'],
        groceries: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'],
        dishes: ['di1', 'di2', 'di3', 'di4', 'di5', 'di6', 'di7', 'di8', 'di9', 'di10', 'di11', 'di12', 'di13', 'di14'],
        chore_tasks: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'],
        saving_goals: ['sg1', 'sg2', 'sg3'],
        alerts: ['a0', 'a1', 'a2', 'a3', 'a4'],
        memories: ['mem-1', 'mem-2'],
        votes: ['vote-1', 'vote-2'],
        school_tasks: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5'],
        chat_groups: ['g_family', 'g_parents', 'g_ai_assistant'],
        chat_messages: ['m1', 'm2', 'm3', 'm_ai_init'],
        demarches: ['dem-1'],
        justificatif_packs: ['pack-1'],
        vehicles: ['v1', 'v2'],
        maintenance: ['hm1', 'hm2'],
        trips: ['tr1'],
        pets: ['p1']
      };

      for (const [table, ids] of Object.entries(tableDemoIds)) {
        await client.from(table).delete().eq('foyer_id', foyer.id).in('id', ids);
      }

      if (myMemberProfile) {
        await client.from('foyer_members')
          .delete()
          .eq('foyer_id', foyer.id)
          .neq('id', myMemberProfile.id)
          .in('display_name', ['Papa Amadou', 'Maman Yatta', 'Amadou', 'Awa', 'Yatta']);
      }

      await loadFoyerData(foyer.id);
      localStorage.removeItem('school_grades');
      localStorage.removeItem('school_schedule');
      setGrades([]);
      setSchedule([]);
      alert("✨ Toutes les données d'exemples et de démonstration ont été purgées avec succès de votre compte en ligne !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la purge : " + err.message);
    }
  };

  const handleClearAllFoyerData = async () => {
    if (!foyer) return;
    const client = getSupabaseClient();
    if (!client) {
      alert("Erreur de connexion à Supabase.");
      return;
    }

    const confirmClear = window.confirm(
      "⚠️ DANGER : Êtes-vous ABSOLUMENT sûr de vouloir vider ENTIÈREMENT votre foyer en ligne ?\n\n" +
      "Toutes vos données (événements, transactions, tâches, documents, etc.) seront supprimées définitivement de la base de données. Cette action est irréversible !"
    );
    if (!confirmClear) return;

    try {
      const tables = [
        'events', 'transactions', 'groceries', 'dishes', 'chore_tasks', 
        'saving_goals', 'alerts', 'memories', 'votes', 'school_tasks', 
        'chat_groups', 'chat_messages', 'demarches', 'justificatif_packs', 
        'vehicles', 'maintenance', 'trips', 'pets', 'pocket_money', 'documents'
      ];

      for (const table of tables) {
        await client.from(table).delete().eq('foyer_id', foyer.id);
      }

      if (myMemberProfile) {
        await client.from('foyer_members')
          .delete()
          .eq('foyer_id', foyer.id)
          .neq('id', myMemberProfile.id);
      }

      await loadFoyerData(foyer.id);
      localStorage.removeItem('school_grades');
      localStorage.removeItem('school_schedule');
      setGrades([]);
      setSchedule([]);
      alert("🗑️ Votre foyer en ligne a été entièrement vidé et réinitialisé avec succès !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la remise à zéro : " + err.message);
    }
  };

  // ----------------------------------------------------
  // Dynamic Tab Router Panel
  // ----------------------------------------------------  // View rendering logic
  const renderContent = () => {
    if (sharedPackId) {
      const pack = justificatifPacks.find(p => p.id === sharedPackId);
      if (pack) {
        return <SharedPackView pack={pack} documents={documents} />;
      }
      return (
        <div className="min-h-screen bg-[#07111F] text-white flex flex-col items-center justify-center p-4">
          <div className="glass-panel border-red-500/20 p-6 rounded-[28px] text-center max-w-sm">
            <h2 className="text-lg font-bold text-[#FF4D6D] mb-2">Dossier introuvable</h2>
            <p className="text-sm text-white/50 mb-6">Ce lien de partage est invalide ou le dossier a été supprimé par son propriétaire.</p>
            <button onClick={() => window.location.hash = ''} className="px-6 py-3 bg-[#6C5CFF] rounded-xl text-sm font-bold shadow-lg">Retour à l'accueil</button>
          </div>
        </div>
      );
    }

    if (activeTab === 'accueil') {
      const activeMemberObj = members.find(m => m.id === activeMemberId);
      const isKidMode = activeMemberObj && activeMemberObj.age && parseInt(activeMemberObj.age) < 11;
      
      if (isKidMode && activeMemberObj) {
        return (
          <KidsDashboard 
            member={activeMemberObj}
            tasks={tasks}
            setTasks={setTasks}
            pocketMoney={pocketMoney}
            events={events}
            setActiveTab={setActiveTab}
            setActiveModule={setActiveModule}
            onTriggerSos={triggerSosAlarm}
          />
        );
      }
      
      return (
        <Accueil 
          members={members}
          activeMemberId={activeMemberId}
          onProfileSwitcherOpen={() => setProfileSwitcherOpen(true)}
          onAvatarClick={() => setProfileSwitcherOpen(true)}
          events={events}
          dishes={dishes}
          alerts={alerts.filter(al => !al.id.includes(`-by-${activeMemberId}`))}
          formatMoney={formatMoney}
          setActiveTab={setActiveTab}
          setActiveModule={setActiveModule}
          onMenuClick={() => setSidebarOpen(true)}
          onAlertsClick={() => setAlertsPanelOpen(true)}
          onTriggerSos={triggerSosAlarm}
          chatGroups={chatGroups}
          chatMessages={chatMessages}
          onEventClick={(dateStr) => {
            setAgendaSelectedDate(dateStr.split('T')[0]);
            setActiveTab('agenda');
          }}
          memories={memories}
          onAddMemory={handleAddMemory}
          onDeleteMemory={handleDeleteMemory}
          onLikeMemory={handleLikeMemory}
        />
      );
    }
    
    if (activeTab === 'agenda') {
      return (
        <Agenda 
          events={events}
          members={members}
          activeMemberId={activeMemberId}
          onAddEventClick={() => {
            setActiveModule('');
            setQuickActionsOpen(true);
          }}
          onToggleEventDone={handleToggleEventDone}
          onMoveEvent={handleMoveEvent}
          defaultSelectedDate={agendaSelectedDate}
        />
      );
    }

    if (activeTab === 'finances') {
      return (
        <Finances 
          transactions={transactions}
          setTransactions={setTransactions}
          savingGoals={savingGoals}
          setSavingGoals={setSavingGoals}
          members={members}
          activeMemberId={activeMemberId}
          currencySymbol={getCurrencySymbol()}
          formatMoney={formatMoney}
          onAddTransactionClick={() => {
            setActiveModule('');
            setQuickActionsOpen(true);
          }}
        />
      );
    }

    if (activeTab === 'menu') {
      if (activeModule === 'objectifs') {
        // Rediriger immédiatement vers le module Finances
        setTimeout(() => {
          setActiveTab('finances');
          setActiveModule('');
        }, 0);
        return null;
      }

      // Si un module secondaire est ouvert
      if (activeModule === 'membres') {
        return (
          <Membres 
            members={members}
            setMembers={setMembers}
            activeMemberId={activeMemberId}
            onAddMemberClick={() => setQuickActionsOpen(true)}
            onAddMember={handleAddMember}
            onUpdateMemberProfile={handleUpdateMemberProfile}
            foyer={foyer}
            myMemberProfile={myMemberProfile}
            setActiveTab={setActiveTab}
            setActiveModule={setActiveModule}
          />
        );
      }


      if (activeModule === 'settings') {
        return (
          <Settings 
            currency={currency}
            setCurrency={setCurrency}
            onResetData={handleResetData}
            onPurgeDemoData={handlePurgeDemoData}
            onClearAllFoyerData={handleClearAllFoyerData}
            onOpenPaywall={() => setPaywallOpen(true)}
            user={user}
            onLogout={handleLogout}
            foyer={foyer}
            myMemberProfile={myMemberProfile}
            onRefreshFoyer={async () => {
              if (foyer) {
                await loadFoyerData(foyer.id);
                const { member } = await foyerService.getMyFoyer();
                if (member) setMyMemberProfile(member);
              }
            }}
            onUpdateMemberProfile={handleUpdateMemberProfile}
            members={members}
            setMembers={setMembers}
            activeMemberId={activeMemberId}
            setActiveTab={setActiveTab}
            setActiveModule={setActiveModule}
            onOpenOnboarding={() => {
              setOnboardingActive(true);
              setDiscoverMode(false);
            }}
          />
        );
      }

      // Rendu du hub modulaire avec tous les modules demandés
      return (
        <MenuHub 
          initialChatGroupId={initialChatGroupId}
          documents={documents}
          setDocuments={setDocuments}
          tasks={tasks}
          groceries={groceries}
          members={members}
          setMembers={setMembers}
          vehicles={vehicles}
          setVehicles={setVehicles}
          maintenance={maintenance}
          setMaintenance={setMaintenance}
          trips={trips}
          setTrips={setTrips}
          pets={pets}
          setPets={setPets}
          pocketMoney={pocketMoney}
          setPocketMoney={setPocketMoney}
          artisans={artisans}
          setArtisans={setArtisans}
          onUpdateMemberProfile={handleUpdateMemberProfile}
          goals={savingGoals}
          alerts={alerts.filter(al => !al.id.includes(`-by-${activeMemberId}`))}
          currencySymbol={getCurrencySymbol()}
          formatMoney={formatMoney}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          vaccines={vaccines}
          setVaccines={setVaccines}
          onAddTask={handleAddTask}
          onAddGrocery={handleToggleGrocery}
          onToggleTask={handleToggleTask}
          onValidateTask={handleValidateTask}
          onToggleGrocery={handleToggleGrocery}
          onAddGroceryItem={handleAddGroceryItem}
          onDeleteGroceryItem={handleDeleteGroceryItem}
          onEditGroceryItem={handleEditGroceryItem}
          setActiveTab={setActiveTab}
          activeMemberId={activeMemberId}
          archivedLists={archivedLists}
          onArchiveCurrentList={handleArchiveCurrentList}
          onReuseArchivedList={handleReuseArchivedList}
          onDeleteArchivedList={handleDeleteArchivedList}
          onCleanGroceryList={handleCleanGroceryList}
          onToggleFavoriteGrocery={handleToggleFavoriteGrocery}
          chatGroups={chatGroups}
          setChatGroups={setChatGroups}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          demarches={demarches}
          setDemarches={setDemarches}
          justificatifPacks={justificatifPacks}
          setJustificatifPacks={setJustificatifPacks}
          onAddTransaction={handleAddTransaction}
          onAddEventDirect={handleAddEvent}
          onAddEvent={(title, dateTime) => {
            if (!isPremium) {
              const currentMonth = new Date().toISOString().substring(0, 7);
              const monthlyEventsCount = events.filter(e => e.dateTime.startsWith(currentMonth)).length;
              if (monthlyEventsCount >= 10) {
                setPaywallOpen(true);
                return;
              }
            }
            const newEvent: FamilyEvent = {
              id: `evt-dem-${Date.now()}`,
              title: `📋 ${title}`,
              type: 'other',
              dateTime: dateTime,
              time: '09:00',
              done: false
            };
            setEvents(prev => [newEvent, ...prev]);
          }}
          memories={memories}
          setMemories={setMemories}
          votes={votes}
          setVotes={setVotes}
          schoolTasks={schoolTasks}
          setSchoolTasks={setSchoolTasks}
          grades={grades}
          setGrades={setGrades}
          schedule={schedule}
          setSchedule={setSchedule}
          dishes={dishes}
          setDishes={setDishes}
          isPremium={isPremium}
          setIsPremium={setIsPremium}
          onTriggerPaywall={() => setPaywallOpen(true)}
          onTriggerSos={triggerSosAlarm}
        />
      );
    }

    return null;
  };

  const shouldShowOnboarding = !discoverMode && (!user || onboardingActive);

  if (shouldShowOnboarding) {
    return (
      <Onboarding 
        onSuccess={handleOnboardingSuccess} 
        onLogout={handleLogout} 
        userEmail={user?.email || ''} 
        onEnterDiscoverMode={() => {
          localStorage.setItem('mf_discover_mode', 'true');
          setDiscoverMode(true);
        }}
      />
    );
  }

  if (user && foyer && myMemberProfile && myMemberProfile.approved === false) {
    return (
      <div className="min-h-screen bg-[#07111F] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#6C5CFF]/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF4D6D]/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in text-center">
          <div className="inline-flex p-4 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 animate-pulse">
            <span className="text-3xl">🕒</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Adhésion en Attente
            </h1>
            <p className="text-sm text-white/60">
              Votre profil <span className="text-[#6C5CFF] font-semibold">{myMemberProfile.displayName}</span> est en cours de validation.
            </p>
          </div>

          <div className="glass-panel border border-white/8 rounded-[28px] p-6 space-y-4 text-left">
            <p className="text-xs text-white/70 leading-relaxed">
              Votre demande pour rejoindre le foyer <span className="text-white font-bold">{foyer.name}</span> (code d'invitation <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[#6C5CFF]">{foyer.inviteCode}</span>) a bien été enregistrée.
            </p>
            <p className="text-xs text-white/55 leading-relaxed">
              Pour des raisons de sécurité, le Chef de famille ou un parent gestionnaire doit approuver votre accès depuis son tableau de bord.
            </p>
            
            <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-white/40">
              <span className="text-base">ℹ️</span>
              <span>Une fois validé, cette page se mettra à jour automatiquement.</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-[#FF4D6D]/10 hover:bg-[#FF4D6D]/20 border border-[#FF4D6D]/20 text-[#FF4D6D] text-xs font-bold transition-all cursor-pointer"
          >
            Se déconnecter / Annuler la demande
          </button>
        </div>
      </div>
    );
  }

  if (sharedPackId) {
    return renderContent();
  }

  const activeMemberObj = members.find(m => m.id === activeMemberId);
  const isKidMode = activeMemberObj && activeMemberObj.age && parseInt(activeMemberObj.age) < 11;

  return (
    <div className={`min-h-screen ${syncActive ? 'bg-[#1a2b4c]' : 'bg-[var(--family-bg)]'} text-[var(--family-text)] font-sans transition-colors duration-1000 relative`}>
      
      {/* Dynamic render active layout page views */}
      <main className="w-full">
        {renderContent()}
      </main>

      {/* Global Sidebar hamburger drawer menu */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        setActiveTab={setActiveTab}
        setActiveModule={setActiveModule}
        members={members}
        activeMemberId={activeMemberId}
        user={user}
        onLogout={handleLogout}
        onOpenOnboarding={() => {
          setOnboardingActive(true);
          setDiscoverMode(false);
        }}
      />

      {/* Floating Bottom sheet dialog form (Quick Actions Sheet) */}
      <QuickActionsSheet 
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        members={members}
        onAddEvent={handleAddEvent}
        onAddTransaction={handleAddTransaction}
        onAddTask={handleAddTask}
        onNavigateToVault={() => {
          setActiveTab('menu');
          setActiveModule('documents');
          setQuickActionsOpen(false);
        }}
        onNavigateToMembers={() => {
          setActiveTab('menu');
          setActiveModule('membres');
          setQuickActionsOpen(false);
        }}
        onTriggerSos={triggerSosAlarm}
      />

      {/* Shared bottom iOS premium nav bar with quick actions central (+) trigger */}
      <BottomNav 
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActiveModule('');
        }}
        onAddClick={() => setQuickActionsOpen(true)}
        activeMemberId={activeMemberId}
      />

      <Paywall 
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlockPremium={async () => {
          setIsPremium(true);
          if (foyer) {
            try {
              await foyerService.updateFoyerPremium(foyer.id, true);
              setFoyer(prev => prev ? { ...prev, isPremium: true } : null);
            } catch (err) {
              console.error("[MaFamille+ Paywall] Failed to update premium status in database:", err);
            }
          }
        }}
      />

      {/* Floating Global Voice Assistant Button (fixed bottom-24 right-6, just above the Menu tab on the right) */}
      <button 
        onClick={startVoiceAssistant}
        className={`fixed bottom-24 right-6 z-[39] w-14 h-14 rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white flex items-center justify-center shadow-lg shadow-[#6C5CFF]/30 hover:scale-110 active:scale-95 transition-all cursor-pointer group ${voiceActive ? 'scale-110' : ''}`}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] blur-md opacity-40 group-hover:opacity-70 transition-opacity animate-pulse"></div>
        {voiceActive ? (
          <MicOff className="w-6 h-6 relative z-10 text-white animate-pulse" />
        ) : (
          <Mic className="w-6 h-6 relative z-10 text-white animate-bounce" style={{ animationDuration: '3s' }} />
        )}
      </button>

      {/* Voice Command pulsing HUD overlay */}
      {voiceActive && (
        <div className="fixed inset-0 bg-[#07111F]/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="glass-panel border border-white/15 rounded-[40px] p-8 max-w-sm w-full space-y-6 shadow-[0_20px_50px_rgba(108,92,255,0.3)]">
            
            {/* Pulsing microphone or waveform icon */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg">
              {voiceWave ? (
                <>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] animate-ping opacity-60"></div>
                  <div className="absolute -inset-4 rounded-full border-2 border-[#6C5CFF]/30 animate-pulse"></div>
                  <Volume2 className="w-10 h-10 relative z-10 animate-bounce" />
                </>
              ) : (
                <Mic className="w-10 h-10 relative z-10 animate-pulse" />
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF4D6D] animate-pulse">Contrôle Vocal Global</span>
              <p className="text-lg font-bold text-white leading-snug">{voiceTranscript}</p>
            </div>

            {/* Formulaire de saisie manuelle de secours */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualVoiceCommand.trim()) return;
                const cmd = manualVoiceCommand.trim();
                setVoiceTranscript(`"${cmd}"`);
                setVoiceWave(false);
                setTimeout(() => {
                  parseVoiceCommand(cmd);
                }, 500);
                setManualVoiceCommand('');
              }}
              className="space-y-3 pt-2"
            >
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Écrivez votre commande ici..."
                  value={manualVoiceCommand}
                  onChange={(e) => setManualVoiceCommand(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020] pr-12 text-center"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-[#FFB020] text-black text-[10px] font-extrabold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  Go
                </button>
              </div>
              <p className="text-[9px] text-white/30 italic">
                Ex : "Ajoute du lait", "Ouvre la carte", "Affiche l'agenda"
              </p>
            </form>

            {voiceFeedback && (
              <div className="bg-white/5 border border-white/10 rounded-[20px] p-4 text-xs font-semibold text-[#00D26A] leading-normal animate-fade-in">
                {voiceFeedback}
              </div>
            )}

            <button 
              onClick={() => {
                if (voiceRecognitionRef.current) voiceRecognitionRef.current.stop();
                setVoiceActive(false);
              }}
              className="text-xs font-extrabold uppercase text-white/40 hover:text-white pt-2 cursor-pointer transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Floating Profile Switcher for Kids Mode Escape */}
      {isKidMode && activeMemberObj && (
        <button 
          onClick={() => setProfileSwitcherOpen(true)}
          className="fixed top-4 right-4 z-[40] w-12 h-12 rounded-full border-2 border-white/20 shadow-[0_0_15px_rgba(108,92,255,0.4)] overflow-hidden active:scale-95 transition-transform"
        >
          <img src={activeMemberObj.photoUrl} alt="Profil" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Inline Notification Tray Panel */}
      {alertsPanelOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border border-white/10 rounded-[32px] max-w-md w-full p-6 space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2 text-white">
                <Bell className="w-5 h-5 text-[#6C5CFF]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Centre de Notifications</h3>
              </div>
              <button 
                onClick={() => setAlertsPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pulsing Push Notification Permission Banner */}
            {'Notification' in window && Notification.permission !== 'granted' && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#6C5CFF]/15 to-[#FF4D6D]/5 border border-[#6C5CFF]/20 flex flex-col space-y-2.5 text-left animate-pulse" style={{ animationDuration: '4s' }}>
                <div className="flex items-start space-x-2.5">
                  <span className="text-lg">🔔</span>
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Activer les Notifications Push</h4>
                    <p className="text-[9px] text-white/50 leading-relaxed font-sans font-medium">Restez informé en direct quand un membre publie une photo, envoie un SOS ou modifie l'agenda !</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const token = await notificationService.initializeFCM(activeMemberId, (payload) => {
                        console.log("[App Gesture] FCM notification received:", payload);
                        const newAlert = {
                          id: payload.data?.id || `alert-${Date.now()}`,
                          title: payload.notification?.title || 'Notification MaFamille+',
                          description: payload.notification?.body || '',
                          time: "À l'instant",
                          type: (payload.data?.type || 'info') as any,
                          read: false,
                          module: payload.data?.module || 'other'
                        };
                        setAlerts(prev => [newAlert, ...prev]);
                        saveAlertToCloud(newAlert);
                        if ('Notification' in window && Notification.permission === 'granted') {
                          new Notification(newAlert.title, {
                            body: newAlert.description,
                            icon: '/favicon.svg'
                          });
                        }
                      });
                      if (token) {
                        alert("🎉 Notifications push activées avec succès sur cet appareil !");
                        setAlertsPanelOpen(false);
                      } else {
                        alert("⚠️ Impossible d'activer les notifications. Veuillez vérifier les permissions de votre navigateur.");
                      }
                    } catch (err) {
                      console.error("Permission request error:", err);
                    }
                  }}
                  className="w-full py-2 bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:brightness-105 active:scale-98 transition-all cursor-pointer text-center shadow-md shadow-[#6C5CFF]/20"
                >
                  Autoriser les notifications
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
              {alerts
                .filter(al => !al.id.includes(`-by-${activeMemberId}`))
                .map((al) => {
                const targetModule = al.module || '';
                const iconColor = al.type === 'success' ? '#00D26A' : al.type === 'warning' ? '#FFB020' : al.type === 'error' ? '#FF4D6D' : '#6C5CFF';
                return (
                  <div 
                    key={al.id} 
                    onClick={() => {
                      setAlerts(prev => prev.map(a => a.id === al.id ? { ...a, read: true } : a));
                      updateAlertReadStatusInCloud(al.id, true);
                      if (targetModule) {
                        setActiveTab('menu');
                        setActiveModule(targetModule);
                        setAlertsPanelOpen(false);
                      }
                    }}
                    className={`p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start space-x-3 transition-all ${targetModule ? 'cursor-pointer hover:bg-white/10 hover:border-white/15 active:scale-[0.98]' : ''}`}
                  >
                    <div className="p-2.5 rounded-xl border shrink-0 mt-0.5" style={{ backgroundColor: `${iconColor}15`, borderColor: `${iconColor}30`, color: iconColor }}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        {al.title}
                        {!al.read && <span className="w-2 h-2 rounded-full bg-[#FFB020] animate-pulse"></span>}
                      </h4>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-1">{al.description}</p>
                      <span className="text-[9px] text-white/30 block mt-2 font-bold tracking-wider">{al.time}</span>
                    </div>
                    {targetModule && (
                      <ChevronRight className="w-4 h-4 text-white/20 shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => {
                setAlerts(prev => prev.map(a => ({ ...a, read: true })));
                markAllAlertsAsReadInCloud();
                setAlertsPanelOpen(false);
              }}
              className="w-full py-3 rounded-[18px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all cursor-pointer text-center"
            >
              Tout marquer comme lu
            </button>
          </div>
        </div>
      )}


      {/* Interactive Profile Switcher Bottom Drawer */}
      {profileSwitcherOpen && (
        <div className="fixed inset-0 bg-[#07111F]/80 backdrop-blur-sm z-50 flex items-end justify-center">
          <div 
            onClick={() => setProfileSwitcherOpen(false)} 
            className="absolute inset-0"
          />
          <div className="relative glass-panel border-t border-white/10 rounded-t-[32px] w-full max-w-md p-6 space-y-5 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] animate-slide-up pointer-events-auto z-50">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Changer de profil</h3>
                <p className="text-[10px] text-white/40 mt-1">Basculez entre les membres de la famille {foyer?.name ? `"${foyer.name}"` : ''}</p>
              </div>
              <button 
                onClick={() => setProfileSwitcherOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-1">
              {members.filter(m => m.id !== '5').map((m) => {
                const isParent = ['admin', 'parent', 'Chef de famille', 'Gestionnaire'].includes(m.role);
                const isActive = m.id === activeMemberId;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isParent) {
                        setPinTargetMemberId(m.id);
                        setPinInput('');
                        setPinError(false);
                        setPinVerificationOpen(true);
                      } else {
                        setActiveMemberId(m.id);
                        setProfileSwitcherOpen(false);
                        setActiveTab('accueil');
                        setActiveModule('');
                      }
                    }}
                    className={`p-4 rounded-[24px] border text-left transition-all relative cursor-pointer flex flex-col items-center justify-center text-center space-y-2.5 ${
                      isActive 
                        ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] shadow-[0_0_15px_rgba(108,92,255,0.25)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8'
                    }`}
                  >
                    <div className="relative">
                      <img 
                        src={m.photoUrl} 
                        alt={m.name} 
                        className="w-14 h-14 rounded-full object-cover border border-white/10"
                      />
                      <span className="absolute bottom-0 right-0 text-xs bg-[#07111F] rounded-full w-5 h-5 flex items-center justify-center border border-white/10">
                        {memberMoods[m.id] || '☀️'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">{m.name}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                        isParent ? 'bg-[#6C5CFF]/20 text-[#6C5CFF]' : 'bg-[#FFB020]/20 text-[#FFB020]'
                      }`}>
                        {isParent ? 'Parent 👑' : 'Enfant ⭐️'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Météo Mentale active check-in */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2.5">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Météo Mentale de {members.find(m => m.id === activeMemberId)?.name}</span>
              <div className="flex justify-between items-center bg-[#07111F]/50 p-2.5 rounded-xl border border-white/5">
                <span className="text-[11px] font-bold text-white/70">Comment vous sentez-vous ?</span>
                <div className="flex space-x-1.5">
                  {['☀️', '🌈', '☁️', '⛈️'].map((mood) => {
                    const activeMood = memberMoods[activeMemberId] === mood;
                    return (
                      <button
                        key={mood}
                        onClick={() => {
                          setMemberMoods(prev => ({
                            ...prev,
                            [activeMemberId]: mood
                          }));
                          
                          // Parent secret empathic warning in alerts panel
                          if ((activeMemberId === '3' || activeMemberId === '4') && (mood === '⛈️' || mood === '☁️')) {
                            const kidName = members.find(m => m.id === activeMemberId)?.name;
                            const newAlert = {
                              id: `a-mood-${Date.now()}-by-${activeMemberId}`,
                              title: `Écho Émotionnel : ${kidName} a besoin de vous 🧡`,
                              description: `${kidName} a réglé sa météo mentale sur "${mood === '⛈️' ? 'Tempête ⛈️' : 'Nuageux ☁️'}". Conseil IA : passez 15 minutes en tête-à-tête avec lui aujourd'hui.`,
                              time: 'À l\'instant',
                              type: 'warning' as const,
                              read: false
                            };
                            setAlerts(prev => [newAlert, ...prev]);
                            saveAlertToCloud(newAlert);
                          }
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all hover:scale-110 active:scale-95 ${
                          activeMood ? 'bg-white/10 border border-white/20' : 'bg-transparent border border-transparent'
                        }`}
                      >
                        {mood}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Link to Settings/Manage profiles */}
            <button
              onClick={() => {
                setProfileSwitcherOpen(false);
                setActiveTab('menu');
                setActiveModule('settings');
              }}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/8 text-white/85 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
            >
              <SettingsIcon className="w-4 h-4 text-[#6C5CFF]" />
              <span>Gérer les profils (Paramètres)</span>
            </button>
          </div>
        </div>
      )}

      {/* PARENT PIN LOCK SCREEN OVERLAY */}
      {pinVerificationOpen && (
        <div className="fixed inset-0 bg-[#07111F]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-fade-in text-white">
          <div className="max-w-xs w-full space-y-8 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#FF4D6D]/15 border border-[#FF4D6D]/30 flex items-center justify-center text-[#FF4D6D] shadow-lg animate-bounce">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider">Contrôle Parental</h2>
              <p className="text-xs text-white/50 leading-relaxed">
                Veuillez saisir le code PIN parent à 4 chiffres pour accéder à ce profil.
              </p>
            </div>

            {/* PIN Code Dots Indicator */}
            <div className="flex justify-center space-x-4 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-all duration-200 ${
                    pinInput.length > idx 
                      ? 'bg-[#6C5CFF] border-[#6C5CFF] scale-110 shadow-[0_0_8px_rgba(108,92,255,0.8)]' 
                      : 'bg-white/5'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 4) {
                      const val = pinInput + num;
                      setPinInput(val);
                      if (val.length === 4) {
                        handleVerifyPin(val);
                      }
                    }
                  }}
                  className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-lg font-bold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95"
                >
                  {num}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setPinVerificationOpen(false);
                  setPinTargetMemberId(null);
                }}
                className="w-14 h-14 rounded-full bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 text-xs font-black uppercase flex items-center justify-center transition-all cursor-pointer text-red-400 active:scale-95"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pinInput.length < 4) {
                    const val = pinInput + '0';
                    setPinInput(val);
                    if (val.length === 4) {
                      handleVerifyPin(val);
                    }
                  }
                }}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-lg font-bold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pinInput.length > 0) {
                    setPinInput(prev => prev.slice(0, -1));
                  }
                }}
                className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 text-sm flex items-center justify-center transition-all cursor-pointer text-white/60 active:scale-95"
              >
                ⌫
              </button>
            </div>

            {pinError && (
              <p className="text-xs font-bold text-[#FF4D6D] uppercase tracking-wider animate-shake">
                Code PIN Incorrect
              </p>
            )}
          </div>
        </div>
      )}

      {/* SOS EMERGENCY FULLSCREEN OVERLAY */}
      {sosActive && (() => {
        // Load urgent contacts dynamically
        let urgentContacts = [
          { id: 'c1', name: 'SAMU (Urgences)', phone: '15' },
          { id: 'c2', name: 'Sapeurs-Pompiers', phone: '18' },
          { id: 'c3', name: 'Police Secours', phone: '17' }
        ];
        try {
          const saved = localStorage.getItem('mf_important_contacts');
          if (saved) {
            const parsed = JSON.parse(saved);
            const filtered = parsed.filter((c: any) => c.isUrgent);
            if (filtered.length > 0) {
              urgentContacts = filtered;
            }
          }
        } catch (e) {}

        return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-red-950/95 backdrop-blur-lg animate-pulse overflow-y-auto no-scrollbar">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes flash-bg {
                0%, 100% { background-color: rgba(69, 10, 10, 0.95); }
                50% { background-color: rgba(153, 27, 27, 0.98); }
              }
              .animate-flash { animation: flash-bg 1.2s infinite; }
            `}} />
            <div className="absolute inset-0 animate-flash -z-10"></div>
            
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center border-4 border-white shadow-[0_0_50px_rgba(239,68,68,0.8)] mb-4 animate-bounce shrink-0">
              <Bell className="w-10 h-10 text-white fill-white animate-pulse" />
            </div>

            <h1 className="text-2xl font-black text-white text-center tracking-tight mb-1">ALERTE SOS ENVOYÉE</h1>
            <p className="text-[10px] font-bold text-red-300 text-center uppercase tracking-widest mb-4">Géolocalisation activée</p>
            
            <div className="glass-panel border-white/10 bg-white/5 rounded-3xl p-5 text-center max-w-sm space-y-3 mb-5 shrink-0">
              <p className="text-xs text-white/80 leading-relaxed">
                Votre position exacte a été transmise en direct à **Papa, Maman** ainsi qu'aux contacts d'urgence.
              </p>
              <p className="text-[10px] text-white/50">
                Restez calme. Quelqu'un a été prévenu et est en route.
              </p>
            </div>

            {/* Emergency Direct Call Panel */}
            <div className="w-full max-w-sm space-y-2 mb-6">
              <span className="text-[9px] font-bold text-red-300/60 uppercase tracking-widest block text-center">
                Appel d'urgence immédiat
              </span>
              
              <div className="grid grid-cols-1 gap-2">
                {urgentContacts.map(uc => (
                  <a
                    key={uc.id}
                    href={`tel:${uc.phone}`}
                    className="p-3.5 bg-red-600 hover:bg-red-500 border border-red-500/30 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-between shadow-lg shadow-red-900/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-white/10">
                        <Phone className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="truncate text-left">{uc.name}</span>
                    </div>
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-lg font-mono text-[10px]">
                      {uc.phone}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <button
              onClick={turnOffSosAlarm}
              className="px-8 py-3.5 bg-white text-red-600 font-extrabold rounded-2xl shadow-xl hover:bg-red-50 active:scale-95 transition-all text-xs uppercase tracking-wider cursor-pointer shrink-0"
            >
              Désactiver l'Alerte
            </button>
          </div>
        );
      })()}

      {/* RECEIVED SOS EMERGENCY FULLSCREEN OVERLAY (FOR OTHER MEMBERS) */}
      {receivedSos && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-red-950/95 backdrop-blur-lg animate-pulse overflow-y-auto no-scrollbar">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes flash-bg-received {
              0%, 100% { background-color: rgba(90, 6, 6, 0.96); }
              50% { background-color: rgba(180, 10, 10, 0.99); }
            }
            .animate-flash-received { animation: flash-bg-received 1.2s infinite; }
          `}} />
          <div className="absolute inset-0 animate-flash-received -z-10"></div>
          
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-red-600 shadow-[0_0_60px_rgba(239,68,68,1)] mb-6 animate-bounce shrink-0">
            <AlertTriangle className="w-12 h-12 text-red-600 animate-pulse" />
          </div>

          <h1 className="text-3xl font-black text-white text-center tracking-tight mb-2 uppercase">
            🚨 SOS EN COURS 🚨
          </h1>
          <p className="text-sm font-extrabold text-red-200 text-center uppercase tracking-widest mb-6">
            {receivedSos.senderName} a besoin d'aide !
          </p>
          
          <div className="glass-panel border-white/10 bg-white/5 rounded-3xl p-5 text-center max-w-sm space-y-4 mb-6 shrink-0 text-white">
            <p className="text-xs text-white/90 leading-relaxed font-bold">
              Une alerte d'urgence majeure a été émise à l'instant.
            </p>
            <div className="p-3 bg-black/30 rounded-2xl border border-white/5 flex items-center justify-center gap-2">
              <span className="text-[10px] uppercase font-bold text-red-300">Dernière Position :</span>
              <span className="text-xs font-semibold text-white">{receivedSos.location}</span>
            </div>
            <p className="text-[10px] text-white/50 leading-normal font-medium">
              Prenez contact immédiatement pour prêter assistance.
            </p>
          </div>

          {/* Quick Actions Panel */}
          <div className="w-full max-w-sm space-y-3 mb-6 shrink-0">
            <button
              onClick={() => {
                setActiveTab('menu');
                setActiveModule('carte');
                setReceivedSos(null); // locally dismiss to view map
              }}
              className="w-full p-4 bg-white text-red-700 hover:bg-red-50 border border-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>🧭 Ouvrir la carte de géolocalisation</span>
            </button>

            <button
              onClick={turnOffSosAlarm}
              className="w-full p-4 bg-red-600 hover:bg-red-500 border border-red-500/30 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>✅ Signaler résolu / Éteindre l'alarme</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating PWA Install Prompt Banner */}
      {showInstallPrompt && (
        <div className="fixed bottom-24 left-4 right-4 z-[45] glass-panel border border-[#6C5CFF]/30 p-4 rounded-[24px] shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in bg-[#07111F]/90 backdrop-blur-md">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#6C5CFF]/20 to-[#FF4D6D]/10 border border-[#6C5CFF]/30 text-[#6C5CFF] shrink-0">
              <Sparkles className="w-5 h-5 text-[#FFB020] animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Installer l'application MaFamille+</h4>
              <p className="text-[10px] text-white/60 leading-relaxed mt-0.5">Profitez de l'affichage plein écran, d'une rapidité accrue, et des raccourcis "+ Dépense" d'appui long !</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 justify-end">
            <button 
              onClick={() => {
                sessionStorage.setItem('mf_pwa_dismissed', 'true');
                setShowInstallPrompt(false);
              }}
              className="px-3.5 py-2 rounded-xl text-[10px] font-black text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider"
            >
              Plus tard
            </button>
            <button 
              onClick={handleInstallApp}
              className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#6C5CFF] to-[#FF4D6D] text-white text-[10px] font-extrabold shadow-md shadow-[#6C5CFF]/20 hover:brightness-105 active:scale-95 transition-all uppercase tracking-widest flex items-center space-x-1"
            >
              <span>Installer</span>
            </button>
          </div>
        </div>
      )}

      {/* iOS Custom PWA Step-by-Step Install Guide Overlay */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-[#07111F]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-[32px] max-w-sm w-full p-6 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-60 h-60 rounded-full bg-[#6C5CFF]/15 blur-[60px] pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6C5CFF] to-[#FF4D6D] text-white shadow-lg">
                <Sparkles className="w-8 h-8 text-[#FFB020] animate-pulse" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">Installer MaFamille+</h3>
                <p className="text-xs text-white/60">Ajoutez le raccourci sur votre écran d'accueil en 3 étapes simples :</p>
              </div>

              <div className="space-y-3.5 text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center space-x-3 text-xs text-white/80">
                  <span className="w-5 h-5 rounded-full bg-[#6C5CFF] text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 font-sans">1</span>
                  <span>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block bg-white/10 p-1 rounded font-mono">📤</span> (en bas de votre écran Safari).</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-white/80">
                  <span className="w-5 h-5 rounded-full bg-[#6C5CFF] text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 font-sans">2</span>
                  <span>Faites défiler et sélectionnez <strong>Sur l'écran d'accueil</strong> <span className="inline-block bg-white/10 p-0.5 px-1.5 rounded font-bold text-[#FFB020]">+</span>.</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-white/80">
                  <span className="w-5 h-5 rounded-full bg-[#6C5CFF] text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 font-sans">3</span>
                  <span>Confirmez en haut à droite en cliquant sur <strong>Ajouter</strong>.</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowIosGuide(false);
                  sessionStorage.setItem('mf_pwa_dismissed', 'true');
                }}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition-all uppercase tracking-wider active:scale-[0.98]"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
