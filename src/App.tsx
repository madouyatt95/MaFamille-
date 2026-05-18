import { useState, useEffect } from 'react';
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
  demoChatMessages
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
  SchoolTask
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

// Lucide icon for inline notifications
import { Bell, X, ChevronRight } from 'lucide-react';

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

  // Pre-calculated financial balances in Euro
  const getQuickBalances = () => {
    const totalRevenues = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalSavings = transactions
      .filter(t => t.type === 'savings')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      solde: totalRevenues - totalExpenses,
      revenus: totalRevenues,
      depenses: totalExpenses,
      epargne: totalSavings
    };
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
  // ----------------------------------------------------
  const renderActiveView = () => {
    if (activeTab === 'accueil') {
      return (
        <Accueil 
          members={members}
          activeMemberId={activeMemberId}
          onProfileSwitcherOpen={() => setProfileSwitcherOpen(true)}
          events={events}
          dishes={dishes}
          alerts={alerts}
          currencySymbol={getCurrencySymbol()}
          formatMoney={formatMoney}
          setActiveTab={setActiveTab}
          setActiveModule={setActiveModule}
          onMenuClick={() => setSidebarOpen(true)}
          onAlertsClick={() => setAlertsPanelOpen(true)}
          quickBalance={getQuickBalances()}
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

  return (
    <div className="min-h-screen text-white font-sans overflow-x-hidden pb-12">
      
      {/* Dynamic render active layout page views */}
      <main className="w-full">
        {renderActiveView()}
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

    </div>
  );
}

export default App;
