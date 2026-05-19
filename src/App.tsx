import { useState, useEffect, useRef } from 'react';
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
  demoPacks
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
  JustificatifPack
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
import { AssistantIA } from './views/AssistantIA';
import { Settings } from './views/Settings';
import { Membres } from './views/Membres';
import { SharedPackView } from './components/modules/SharedPackView';
import { KidsDashboard } from './views/KidsDashboard';

// Lucide icon for inline notifications
import { Bell, X, ChevronRight, Mic, MicOff, Volume2 } from 'lucide-react';

function App() {
  // ----------------------------------------------------
  // Local reactive storage initialization
  // ----------------------------------------------------
  const [members, setMembers] = useState<Member[]>(() => {
    const val = localStorage.getItem('mf_members');
    return val ? JSON.parse(val) : demoMembers;
  });

  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return localStorage.getItem('mf_active_member_id') || '1';
  });

  const [events, setEvents] = useState<FamilyEvent[]>(() => {
    const val = localStorage.getItem('mf_events');
    return val ? JSON.parse(val) : demoEvents;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const val = localStorage.getItem('mf_transactions');
    return val ? JSON.parse(val) : demoTransactions;
  });

  const [dishes, setDishes] = useState<Dish[]>(() => {
    const val = localStorage.getItem('mf_dishes');
    return val ? JSON.parse(val) : demoDishes;
  });

  const [documents, setDocuments] = useState<DocumentFile[]>(() => {
    const val = localStorage.getItem('mf_documents');
    return val ? JSON.parse(val) : demoDocuments;
  });

  const [tasks, setTasks] = useState<ChoreTask[]>(() => {
    const val = localStorage.getItem('mf_tasks');
    return val ? JSON.parse(val) : demoTasks;
  });

  const [groceries, setGroceries] = useState<GroceryItem[]>(() => {
    const val = localStorage.getItem('mf_groceries');
    return val ? JSON.parse(val) : demoGroceries;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const val = localStorage.getItem('mf_vehicles');
    return val ? JSON.parse(val) : demoVehicles;
  });
  const [maintenance, setMaintenance] = useState<HomeMaintenance[]>(() => {
    const val = localStorage.getItem('mf_maintenance');
    return val ? JSON.parse(val) : demoMaintenance;
  });
  const [trips, setTrips] = useState<Trip[]>(() => {
    const val = localStorage.getItem('mf_trips');
    return val ? JSON.parse(val) : demoTrips;
  });
  const [pets, setPets] = useState<PetRecord[]>(() => {
    const val = localStorage.getItem('mf_pets');
    return val ? JSON.parse(val) : demoPets;
  });
  const [pocketMoney, setPocketMoney] = useState<{ id: string; name: string; balance: number; points: number; avatar: string; }[]>(() => {
    const val = localStorage.getItem('mf_pocket_money');
    return val ? JSON.parse(val) : [
      { id: '3', name: 'Amadou', balance: 15.00, points: 150, avatar: 'https://images.unsplash.com/photo-1590031905406-f18a426d772d?w=150' },
      { id: '4', name: 'Awa', balance: 22.50, points: 225, avatar: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=150' }
    ];
  });

  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>(() => {
    const val = localStorage.getItem('mf_saving_goals');
    return val ? JSON.parse(val) : demoSavingGoals;
  });

  const [alerts, setAlerts] = useState<NotificationAlert[]>(() => {
    const val = localStorage.getItem('mf_alerts');
    return val ? JSON.parse(val) : demoAlerts;
  });

  const [chatGroups, setChatGroups] = useState(() => {
    const val = localStorage.getItem('mf_chat_groups');
    return val ? JSON.parse(val) : demoChatGroups;
  });

  const [chatMessages, setChatMessages] = useState(() => {
    const val = localStorage.getItem('mf_chat_messages');
    return val ? JSON.parse(val) : demoChatMessages;
  });

  const [demarches, setDemarches] = useState<Demarche[]>(() => {
    const val = localStorage.getItem('mf_demarches');
    return val ? JSON.parse(val) : demoDemarches;
  });

  const [justificatifPacks, setJustificatifPacks] = useState<JustificatifPack[]>(() => {
    const val = localStorage.getItem('mf_packs');
    return val ? JSON.parse(val) : demoPacks;
  });

  const [agendaSelectedDate, setAgendaSelectedDate] = useState<string>('');

  // Settings State
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('mf_currency') || 'EUR (€)';
  });
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    return localStorage.getItem('mf_sb_url') || '';
  });
  const [supabaseKey, setSupabaseKey] = useState(() => {
    return localStorage.getItem('mf_sb_key') || '';
  });
  const [syncActive, setSyncActive] = useState(() => {
    return localStorage.getItem('mf_sync_active') === 'true';
  });

  // New modules states
  const [memories, setMemories] = useState<MemoryLog[]>(() => {
    const val = localStorage.getItem('mf_memories');
    return val ? JSON.parse(val) : demoMemories;
  });

  const [votes, setVotes] = useState<FamilyVote[]>(() => {
    const val = localStorage.getItem('mf_votes');
    return val ? JSON.parse(val) : demoFamilyVotes;
  });

  const [schoolTasks, setSchoolTasks] = useState<SchoolTask[]>(() => {
    const val = localStorage.getItem('mf_school_tasks');
    return val ? JSON.parse(val) : demoSchoolTasks;
  });

  const [memberMoods, setMemberMoods] = useState<Record<string, string>>(() => {
    const val = localStorage.getItem('mf_moods');
    return val ? JSON.parse(val) : { '1': '☀️', '2': '☀️', '3': '🌈', '4': '☁️' };
  });

  // Navigation and Sheets UI State
  const [activeTab, setActiveTab] = useState('accueil');
  const [activeModule, setActiveModule] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);
  const [sharedPackId, setSharedPackId] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState(false);

  // Voice Command Assistant State
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [voiceWave, setVoiceWave] = useState(false);
  const [manualVoiceCommand, setManualVoiceCommand] = useState('');
  const voiceRecognitionRef = useRef<any>(null);

  const startVoiceAssistant = () => {
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

    // 1. Navigation to tabs
    if (promptLower.includes('carte') || promptLower.includes('gps') || promptLower.includes('position') || promptLower.includes('itiné')) {
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
    // 2. Navigation to specific submodules inside Menu
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
    // 3. Action commands (e.g. ajoute des bananes)
    else if (promptLower.includes('ajoute') || promptLower.includes('ajouter') || promptLower.includes('mets') || promptLower.includes('mettre') || promptLower.includes('rajoute') || promptLower.includes('rajouter')) {
      // Nettoyage des verbes de début
      let cleanText = promptLower
        .replace(/^(ajoute|ajouter|mets|mettre|rajoute|rajouter)\s+/, '')
        .replace(/^(des|de\s+la|du|un|une|le|la|de|d')\s+/, '')
        .trim();
      
      // Nettoyage des suffixes de destination
      cleanText = cleanText
        .replace(/\s+(à\s+la|dans\s+la|dans\s+le|au|sur\s+la|de|à\s+ma|ma)?\s*(liste|courses|caddie|panier|commun[e]?)\s*(commune|partagée|de\s+courses)?$/, '')
        .trim();

      if (cleanText.length >= 2) {
        const formattedName = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
        
        const itemLower = cleanText.toLowerCase();
        let category = 'Épicerie';
        if (itemLower.includes('banane') || itemLower.includes('pomme') || itemLower.includes('tomate') || itemLower.includes('salade') || itemLower.includes('carotte') || itemLower.includes('avocat') || itemLower.includes('fraise') || itemLower.includes('citron') || itemLower.includes('fruit') || itemLower.includes('légume')) {
          category = 'Fruits & Légumes';
        } else if (itemLower.includes('lait') || itemLower.includes('beurre') || itemLower.includes('fromage') || itemLower.includes('yaourt') || itemLower.includes('crème')) {
          category = 'Produits Frais';
        } else if (itemLower.includes('pain') || itemLower.includes('baguette') || itemLower.includes('croissant') || itemLower.includes('pain de mie')) {
          category = 'Épicerie';
        } else if (itemLower.includes('poulet') || itemLower.includes('viande') || itemLower.includes('steak') || itemLower.includes('jambon') || itemLower.includes('saumon') || itemLower.includes('poisson') || itemLower.includes('sardine')) {
          category = 'Boucherie';
        }

        handleAddGroceryItem(formattedName, category, '1 pièce');
        feedback = `🛒 Action : J'ai ajouté "${formattedName}" à votre liste commune !`;
        
        // Open the grocery list interface instantly
        setActiveTab('menu');
        setActiveModule('courses');
      } else {
        feedback = "🤔 Je n'ai pas compris quel article ajouter à vos courses...";
      }
    } 
    else if (promptLower.includes('alerte') || promptLower.includes('sos') || promptLower.includes('danger')) {
      setSosActive(true);
      feedback = "🚨 ACTION CRITIQUE : Alerte SOS activée ! Vos proches ont été notifiés.";
    }
    else {
      feedback = `🔍 Recherche : Commande "${text}" non reconnue. Essayez : "Ouvre l'agenda", "Affiche la carte" ou "Ajoute du lait".`;
    }

    setVoiceFeedback(feedback);
    
    // Automatically close overlay after 3.5 seconds
    setTimeout(() => {
      setVoiceActive(false);
    }, 3500);
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

  // Sync state to localStorage on modification
  useEffect(() => {
    localStorage.setItem('mf_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('mf_dishes', JSON.stringify(dishes));
  }, [dishes]);

  useEffect(() => {
    localStorage.setItem('mf_active_member_id', activeMemberId);
  }, [activeMemberId]);

  useEffect(() => {
    localStorage.setItem('mf_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('mf_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('mf_documents', JSON.stringify(documents));
    } catch (error) {
      console.error("Storage quota exceeded, failed to save documents in localStorage:", error);
    }
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('mf_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('mf_groceries', JSON.stringify(groceries));
  }, [groceries]);

  useEffect(() => {
    localStorage.setItem('mf_saving_goals', JSON.stringify(savingGoals));
  }, [savingGoals]);

  useEffect(() => {
    localStorage.setItem('mf_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('mf_chat_groups', JSON.stringify(chatGroups));
  }, [chatGroups]);

  useEffect(() => {
    localStorage.setItem('mf_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('mf_demarches', JSON.stringify(demarches));
  }, [demarches]);

  useEffect(() => {
    localStorage.setItem('mf_packs', JSON.stringify(justificatifPacks));
  }, [justificatifPacks]);

  useEffect(() => {
    localStorage.setItem('mf_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('mf_sb_url', supabaseUrl);
    localStorage.setItem('mf_sb_key', supabaseKey);
    localStorage.setItem('mf_sync_active', String(syncActive));
  }, [supabaseUrl, supabaseKey, syncActive]);

  useEffect(() => {
    localStorage.setItem('mf_memories', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem('mf_votes', JSON.stringify(votes));
  }, [votes]);

  useEffect(() => {
    localStorage.setItem('mf_school_tasks', JSON.stringify(schoolTasks));
  }, [schoolTasks]);

  useEffect(() => {
    localStorage.setItem('mf_moods', JSON.stringify(memberMoods));
  }, [memberMoods]);

  useEffect(() => {
    localStorage.setItem('mf_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('mf_maintenance', JSON.stringify(maintenance));
  }, [maintenance]);

  useEffect(() => {
    localStorage.setItem('mf_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('mf_pets', JSON.stringify(pets));
  }, [pets]);

  useEffect(() => {
    localStorage.setItem('mf_pocket_money', JSON.stringify(pocketMoney));
  }, [pocketMoney]);

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
  const handleAddEvent = (newEvent: any) => {
    const id = `ev-${Date.now()}`;
    setEvents(prev => [{ ...newEvent, id }, ...prev]);
  };

  const handleAddTransaction = (newTrans: any) => {
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
  };

  const handleAddTask = (newTask: any) => {
    const id = `tk-${Date.now()}`;
    setTasks(prev => [{ ...newTask, id }, ...prev]);
  };

  const handleAddMember = (newMem: any) => {
    const id = `${members.length + 1}`;
    setMembers(prev => [...prev, { ...newMem, id }]);
  };

  const handleToggleEventDone = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, done: !e.done } : e));
  };

  const handleMoveEvent = (id: string, newDate: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id === id) {
        const timePart = e.dateTime.split('T')[1];
        return { ...e, dateTime: timePart ? `${newDate}T${timePart}` : newDate };
      }
      return e;
    }));
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
        
        return { ...t, validatedByParent: true };
      }
      return t;
    }));
  };

  const handleToggleGrocery = (id: string) => {
    setGroceries(prev => prev.map(g => g.id === id ? { ...g, checked: !g.checked } : g));
  };

  const handleAddGroceryItem = (name: string, category: string, qty: string) => {
    const id = `gr-${Date.now()}`;
    const newItem: GroceryItem = {
      id,
      name,
      category,
      quantity: qty,
      checked: false,
      inStock: false
    };
    setGroceries(prev => [newItem, ...prev]);
  };

  const handleDeleteGroceryItem = (id: string) => {
    setGroceries(prev => prev.filter(g => g.id !== id));
  };

  const handleEditGroceryItem = (id: string, name: string, qty: string) => {
    setGroceries(prev => prev.map(g => g.id === id ? { ...g, name, quantity: qty } : g));
  };

  const handleResetData = () => {
    localStorage.clear();
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
    setCurrency('EUR (€)');
    setSyncActive(false);
    setSupabaseUrl('');
    setSupabaseKey('');
    setActiveTab('accueil');
    setActiveModule('');
    alert('Système réinitialisé avec succès !');
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
            onTriggerSos={() => setSosActive(true)}
          />
        );
      }
      
      return (
        <Accueil 
          members={members}
          activeMemberId={activeMemberId}
          onProfileSwitcherOpen={() => setProfileSwitcherOpen(true)}
          events={events}
          dishes={dishes}
          alerts={alerts}
          formatMoney={formatMoney}
          setActiveTab={setActiveTab}
          setActiveModule={setActiveModule}
          onMenuClick={() => setSidebarOpen(true)}
          onAlertsClick={() => setAlertsPanelOpen(true)}
          onTriggerSos={() => setSosActive(true)}
          chatGroups={chatGroups}
          chatMessages={chatMessages}
          onEventClick={(dateStr) => {
            setAgendaSelectedDate(dateStr.split('T')[0]);
            setActiveTab('agenda');
          }}
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
      if (activeModule === 'membres' || activeModule === 'sante') {
        return (
          <Membres 
            members={members}
            setMembers={setMembers}
            activeMemberId={activeMemberId}
            onAddMemberClick={() => setQuickActionsOpen(true)}
          />
        );
      }
      
      if (activeModule === 'assistant') {
        return (
          <AssistantIA 
            transactions={transactions}
            documents={documents}
            groceries={groceries}
            currencySymbol={getCurrencySymbol()}
            formatMoney={formatMoney}
            activeMemberId={activeMemberId}
            onAddGroceryItem={handleAddGroceryItem}
          />
        );
      }

      if (activeModule === 'settings') {
        return (
          <Settings 
            currency={currency}
            setCurrency={setCurrency}
            supabaseUrl={supabaseUrl}
            setSupabaseUrl={setSupabaseUrl}
            supabaseKey={supabaseKey}
            setSupabaseKey={setSupabaseKey}
            syncActive={syncActive}
            setSyncActive={setSyncActive}
            onResetData={handleResetData}
          />
        );
      }

      // Rendu du hub modulaire avec tous les modules demandés
      return (
        <MenuHub 
          documents={documents}
          setDocuments={setDocuments}
          tasks={tasks}
          groceries={groceries}
          members={members}
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
          goals={savingGoals}
          alerts={alerts}
          currencySymbol={getCurrencySymbol()}
          formatMoney={formatMoney}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
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
          chatGroups={chatGroups}
          setChatGroups={setChatGroups}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          demarches={demarches}
          setDemarches={setDemarches}
          justificatifPacks={justificatifPacks}
          setJustificatifPacks={setJustificatifPacks}
          onAddEvent={(title, dateTime) => {
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
          dishes={dishes}
          setDishes={setDishes}
        />
      );
    }

    return null;
  };

  if (sharedPackId) {
    return renderContent();
  }

  const activeMemberObj = members.find(m => m.id === activeMemberId);
  const isKidMode = activeMemberObj && activeMemberObj.age && parseInt(activeMemberObj.age) < 11;

  return (
    <div className={`min-h-screen ${syncActive ? 'bg-[#1a2b4c]' : 'bg-[#07111F]'} text-white font-sans transition-colors duration-1000 relative`}>
      
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
      />

      {/* Floating Bottom sheet dialog form (Quick Actions Sheet) */}
      <QuickActionsSheet 
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        members={members}
        onAddEvent={handleAddEvent}
        onAddTransaction={handleAddTransaction}
        onAddTask={handleAddTask}
        onAddMember={handleAddMember}
        onNavigateToVault={() => {
          setActiveTab('menu');
          setActiveModule('documents');
          setQuickActionsOpen(false);
        }}
        onTriggerSos={() => setSosActive(true)}
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

            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
              {alerts.map((al) => {
                const targetModule = al.module || '';
                const iconColor = al.type === 'success' ? '#00D26A' : al.type === 'warning' ? '#FFB020' : al.type === 'error' ? '#FF4D6D' : '#6C5CFF';
                return (
                  <div 
                    key={al.id} 
                    onClick={() => {
                      if (targetModule) {
                        setActiveTab('menu');
                        setActiveModule(targetModule);
                        setAlerts(prev => prev.map(a => a.id === al.id ? { ...a, read: true } : a));
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
                <p className="text-[10px] text-white/40 mt-1">Basculez entre les membres démo de la famille Fatou</p>
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
                const isParent = m.id === '1' || m.id === '2';
                const isActive = m.id === activeMemberId;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveMemberId(m.id);
                      setProfileSwitcherOpen(false);
                      setActiveTab('accueil');
                      setActiveModule('');
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
                              id: `a-mood-${Date.now()}`,
                              title: `Écho Émotionnel : ${kidName} a besoin de vous 🧡`,
                              description: `${kidName} a réglé sa météo mentale sur "${mood === '⛈️' ? 'Tempête ⛈️' : 'Nuageux ☁️'}". Conseil IA : passez 15 minutes en tête-à-tête avec lui aujourd'hui.`,
                              time: 'À l\'instant',
                              type: 'warning' as const,
                              read: false
                            };
                            setAlerts(prev => [newAlert, ...prev]);
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
          </div>
        </div>
      )}

      {/* SOS EMERGENCY FULLSCREEN OVERLAY */}
      {sosActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-red-950/95 backdrop-blur-lg animate-pulse">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes flash-bg {
              0%, 100% { background-color: rgba(69, 10, 10, 0.95); }
              50% { background-color: rgba(153, 27, 27, 0.98); }
            }
            .animate-flash { animation: flash-bg 1s infinite; }
          `}} />
          <div className="absolute inset-0 animate-flash -z-10"></div>
          
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center border-4 border-white shadow-[0_0_50px_rgba(239,68,68,0.8)] mb-6 animate-bounce">
            <Bell className="w-12 h-12 text-white fill-white animate-pulse" />
          </div>

          <h1 className="text-3xl font-black text-white text-center tracking-tight mb-2">ALERTE SOS ENVOYÉE</h1>
          <p className="text-sm font-bold text-red-300 text-center uppercase tracking-widest mb-6">Géolocalisation activée</p>
          
          <div className="glass-panel border-white/10 bg-white/5 rounded-3xl p-6 text-center max-w-sm space-y-4 mb-8">
            <p className="text-sm text-white/80 leading-relaxed">
              Votre position exacte a été transmise en direct à **Papa, Maman** ainsi qu'aux contacts d'urgence.
            </p>
            <p className="text-xs text-white/50">
              Restez calme. Quelqu'un a été prévenu et est en route.
            </p>
          </div>

          <button
            onClick={() => setSosActive(false)}
            className="px-8 py-4 bg-white text-red-600 font-extrabold rounded-2xl shadow-xl hover:bg-red-50 active:scale-95 transition-all text-sm uppercase tracking-wider cursor-pointer"
          >
            Désactiver l'Alerte
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
