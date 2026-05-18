import React, { useState } from 'react';
import { 
  FolderLock, 
  HeartPulse, 
  ShoppingCart, 
  Brush, 
  GraduationCap, 
  Wallet, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft,
  AlertCircle,
  Activity,
  Plus,
  Calendar,
  Layers,
  Car,
  Home as HomeIcon,
  Plane,
  Dog,
  Coins,
  Sparkles,
  Camera,
  Users,
  HeartHandshake,
  TrendingUp,
  Lock,
  UtensilsCrossed,
  MessageCircle
} from 'lucide-react';
import type { 
  DocumentFile, 
  ChoreTask, 
  GroceryItem, 
  Member, 
  Vehicle, 
  HomeMaintenance, 
  Trip, 
  PetRecord, 
  SavingGoal,
  NotificationAlert,
  MemoryLog,
  FamilyVote,
  SchoolTask,
  Dish
} from '../types';

// Import newly built premium sub-modules
import { EcoChef } from '../components/modules/EcoChef';
import { TuteurScolaire } from '../components/modules/TuteurScolaire';
import { CapsuleTemporelle } from '../components/modules/CapsuleTemporelle';
import { VoyageIA } from '../components/modules/VoyageIA';
import { ConseilFamille } from '../components/modules/ConseilFamille';
import { PeaceMaker } from '../components/modules/PeaceMaker';
import { MaVieSimulator } from '../components/modules/MaVieSimulator';
import { CoffreFortAvance } from '../components/modules/CoffreFortAvance';
import { Messagerie } from '../components/modules/Messagerie';
import { WidgetMeteo } from '../components/modules/WidgetMeteo';

interface MenuHubProps {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  tasks: ChoreTask[];
  groceries: GroceryItem[];
  members: Member[];
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  maintenance: HomeMaintenance[];
  setMaintenance: React.Dispatch<React.SetStateAction<HomeMaintenance[]>>;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  pets: PetRecord[];
  setPets: React.Dispatch<React.SetStateAction<PetRecord[]>>;
  pocketMoney: { id: string; name: string; balance: number; points: number; avatar: string; }[];
  setPocketMoney: React.Dispatch<React.SetStateAction<{ id: string; name: string; balance: number; points: number; avatar: string; }[]>>;
  goals: SavingGoal[];
  alerts: NotificationAlert[];
  currencySymbol: string;
  formatMoney: (amount: number) => string;
  activeModule: string;
  setActiveModule: (moduleName: string) => void;
  onAddTask: (task: any) => void;
  onAddGrocery: (item: any) => void;
  onToggleTask: (id: string) => void;
  onValidateTask: (id: string) => void;
  onToggleGrocery: (id: string) => void;
  onAddGroceryItem: (name: string, category: string, qty: string) => void;
  setActiveTab: (tab: string) => void;
  
  // Custom states
  activeMemberId?: string;
  memories: MemoryLog[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryLog[]>>;
  votes: FamilyVote[];
  setVotes: React.Dispatch<React.SetStateAction<FamilyVote[]>>;
  schoolTasks: SchoolTask[];
  setSchoolTasks: React.Dispatch<React.SetStateAction<SchoolTask[]>>;
  dishes: Dish[];
  setDishes: React.Dispatch<React.SetStateAction<Dish[]>>;
}

export const MenuHub: React.FC<MenuHubProps> = ({
  documents,
  setDocuments,
  members,
  tasks,
  groceries,
  vehicles,
  setVehicles,
  maintenance,
  setMaintenance,
  trips,
  setTrips,
  pets,
  setPets,
  pocketMoney,
  setPocketMoney,
  goals,
  formatMoney,
  activeModule,
  setActiveModule,
  onToggleTask,
  onValidateTask,
  onToggleGrocery,
  onAddGroceryItem,
  setActiveTab,
  
  activeMemberId = '1',
  memories,
  setMemories,
  votes,
  setVotes,
  schoolTasks,
  setSchoolTasks,
  dishes,
  setDishes
}) => {
  const [newGroceryName, setNewGroceryName] = useState('');
  const [newGroceryCat, setNewGroceryCat] = useState('Épicerie');
  const [newGroceryQty, setNewGroceryQty] = useState(1);
  const [newGroceryUnit, setNewGroceryUnit] = useState('pièces');
  const [grocerySubTab, setGrocerySubTab] = useState<'liste' | 'ecochef' | 'menus'>('liste');

  // Form states for meals
  const [mealDay, setMealDay] = useState('Lun');
  const [mealType, setMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [mealName, setMealName] = useState('');
  const [mealImagePreset, setMealImagePreset] = useState('https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?w=300&auto=format&fit=crop&q=80');
  const [mealIngredients, setMealIngredients] = useState('');

  const MEAL_IMAGE_PRESETS = [
    { name: '🍗 Poulet Rôti & Frites', url: 'https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?w=300&auto=format&fit=crop&q=80' },
    { name: '🐟 Pavé de Saumon Grillé', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&auto=format&fit=crop&q=80' },
    { name: '🥗 Salade de Quinoa Bio', url: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=300&auto=format&fit=crop&q=80' },
    { name: '🍕 Pizzas Maison en Famille', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80' },
    { name: '🍲 Soupe Légumes Anti-Gaspi', url: 'https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=300&auto=format&fit=crop&q=80' }
  ];
  React.useEffect(() => {
    if (activeModule === 'menus') {
      setGrocerySubTab('menus');
    }
  }, [activeModule]);

  const [groceryDerogation, setGroceryDerogation] = useState(() => {
    return localStorage.getItem('mf_grocery_derogation') === 'true';
  });

  const handleToggleDerogation = () => {
    const nextVal = !groceryDerogation;
    setGroceryDerogation(nextVal);
    localStorage.setItem('mf_grocery_derogation', String(nextVal));
    alert(nextVal ? '🔓 Dérogation accordée aux enfants !' : '🔒 Dérogation retirée. Accès restreint.');
  };

  const modules = [
    { id: 'documents', title: 'Documents', desc: 'Coffre-fort sécurisé pour vos documents', badge: `${documents.length} fichiers`, icon: FolderLock, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30' },
    { id: 'sante', title: 'Santé', desc: 'Carnet médical et rendez-vous', badge: '5 rendez-vous', icon: HeartPulse, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10 hover:border-[#FF4D6D]/30' },
    { id: 'courses', title: 'Courses & Éco-Chef', desc: 'Liste de courses & Éco-Chef Anti-Gaspi', badge: `${groceries.filter(g => !g.checked).length} produits`, icon: ShoppingCart, color: 'text-[#FFB020] bg-[#FFB020]/10 hover:border-[#FFB020]/30' },
    { id: 'taches', title: 'Tâches', desc: 'Répartition des tâches et suivi', badge: `${tasks.filter(t => !t.done).length} tâches`, icon: Brush, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' },
    { id: 'ecole', title: 'École & Devoirs', desc: 'Tuteur IA, devoirs & quizzes', badge: `${schoolTasks.filter(t => !t.done).length} devoirs`, icon: GraduationCap, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30' },
    { id: 'finances_hub', title: 'Finances', desc: 'Budget, comptes et objectifs', badge: `${goals.length} objectifs`, icon: Wallet, color: 'text-[#00D26A] bg-[#00D26A]/10 hover:border-[#00D26A]/30' }
  ];

  const isAmadou = activeMemberId === '3';

  const secondaryModules = [
    { id: 'messagerie', title: 'Chat Familial', desc: 'Discussions & Groupes', icon: MessageCircle, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { id: 'vehicules', title: 'Véhicules', desc: 'Assurances et entretiens', icon: Car, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10' },
    { id: 'logement', title: 'Logement', desc: 'Maintenance et garanties', icon: HomeIcon, color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { id: 'voyages', title: 'Voyages & Valise IA', desc: 'Activités & Valise IA personnalisée', icon: Plane, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'animaux', title: 'Animaux', desc: 'Vaccins et vétérinaire', icon: Dog, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { id: 'argent', title: 'Argent de Poche', desc: 'Portefeuilles enfants', icon: Coins, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { id: 'capsule', title: 'Capsule Temporelle', desc: 'Album de souvenirs & Gazette', icon: Camera, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'conseil', title: 'Conseil de Famille', desc: 'Sondages actifs & Charte de vie', icon: Users, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { id: 'peacemaker', title: 'PeaceMaker IA', desc: 'Médiateur de conflits intelligents', icon: HeartHandshake, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    ...(isAmadou ? [{ id: 'mavie', title: 'MaVie 2.0 (Ado)', desc: 'Simulateur d\'avenir & de choix', icon: TrendingUp, color: 'text-[#FFB020] bg-[#FFB020]/10' }] : [])
  ];

  const handleGrocerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroceryName) return;
    const combinedQty = `${newGroceryQty} ${newGroceryUnit}`;
    onAddGroceryItem(newGroceryName, newGroceryCat, combinedQty);
    setNewGroceryName('');
    setNewGroceryQty(1);
    setNewGroceryUnit('pièces');
  };

  // Parental PIN Lock States and Validator
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [authorizedModules, setAuthorizedModules] = useState<string[]>([]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '0000' || pinInput === '1234') {
      setAuthorizedModules(prev => [...prev, activeModule]);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const isParent = activeMemberId === '1' || activeMemberId === '2';
  const isLockedForChild = !isParent && ['documents', 'finances_hub', 'vehicules', 'logement'].includes(activeModule) && !authorizedModules.includes(activeModule);

  // Vehicles Form states
  const [newVehName, setNewVehName] = useState('');
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehCT, setNewVehCT] = useState('');
  const [newVehAssur, setNewVehAssur] = useState('');
  const [newVehService, setNewVehService] = useState('');

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName || !newVehPlate) return;
    const newV: Vehicle = {
      id: `v-${Date.now()}`,
      name: newVehName,
      plate: newVehPlate,
      insuranceExpiry: newVehAssur || '24 Juin 2026',
      technicalControl: newVehCT || '12 Octobre 2027',
      lastService: '14 Mai 2026',
      nextService: newVehService || '14 Novembre 2026'
    };
    setVehicles(prev => [...prev, newV]);
    setNewVehName('');
    setNewVehPlate('');
    setNewVehCT('');
    setNewVehAssur('');
    setNewVehService('');
    alert('🚗 Véhicule ajouté avec succès !');
  };

  // Maintenance Form states
  const [newMaintTitle, setNewMaintTitle] = useState('');
  const [newMaintProvider, setNewMaintProvider] = useState('');
  const [newMaintDate, setNewMaintDate] = useState('');
  const [newMaintCost, setNewMaintCost] = useState('');
  const [newMaintStatus, setNewMaintStatus] = useState<'scheduled' | 'completed' | 'urgent'>('scheduled');

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintTitle || !newMaintCost) return;
    const newM: HomeMaintenance = {
      id: `m-${Date.now()}`,
      title: newMaintTitle,
      provider: newMaintProvider || 'Artisan Local',
      date: newMaintDate || 'Aujourd\'hui',
      cost: parseFloat(newMaintCost) || 0,
      status: newMaintStatus
    };
    setMaintenance(prev => [...prev, newM]);
    setNewMaintTitle('');
    setNewMaintProvider('');
    setNewMaintDate('');
    setNewMaintCost('');
    alert('🔧 Intervention logement ajoutée !');
  };

  // Trips Form states
  const [newTripDest, setNewTripDest] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripBudget, setNewTripBudget] = useState('');

  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripDest || !newTripBudget) return;
    const newT: Trip = {
      id: `t-${Date.now()}`,
      destination: newTripDest,
      startDate: newTripStart || '15 Juillet 2026',
      endDate: newTripEnd || '22 Juillet 2026',
      budget: parseFloat(newTripBudget) || 0,
      bookingRefs: ['Hôtel réservé ✓', 'Transport planifié ✓'],
      checklist: [
        { id: 'c1', text: 'Passeports valides', done: true },
        { id: 'c2', text: 'Trousse de secours', done: false }
      ]
    };
    setTrips(prev => [...prev, newT]);
    setNewTripDest('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripBudget('');
    alert('✈️ Voyage ajouté avec succès !');
  };

  // Pets Form states
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState('Chien');
  const [newPetLastVaccine, setNewPetLastVaccine] = useState('');
  const [newPetNextVaccine, setNewPetNextVaccine] = useState('');
  const [newPetAppointment, setNewPetAppointment] = useState('');

  const handleAddPet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName) return;
    const newP: PetRecord = {
      id: `p-${Date.now()}`,
      name: newPetName,
      species: newPetSpecies,
      lastVaccine: newPetLastVaccine || '10 Janvier 2026',
      nextVaccine: newPetNextVaccine || '10 Janvier 2027',
      vetAppointment: newPetAppointment || undefined
    };
    setPets(prev => [...prev, newP]);
    setNewPetName('');
    setNewPetLastVaccine('');
    setNewPetNextVaccine('');
    setNewPetAppointment('');
    alert('🐶 Animal ajouté au suivi de la famille !');
  };

  // Pocket Money Form states
  const [allowanceChildId, setAllowanceChildId] = useState('3'); // Amadou
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [allowancePoints, setAllowancePoints] = useState('');

  const handleAddPocketMoney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowanceAmount && !allowancePoints) return;
    
    setPocketMoney(prev => prev.map(child => {
      if (child.id === allowanceChildId) {
        return {
          ...child,
          balance: child.balance + (parseFloat(allowanceAmount) || 0),
          points: child.points + (parseInt(allowancePoints) || 0)
        };
      }
      return child;
    }));
    
    setAllowanceAmount('');
    setAllowancePoints('');
    alert('💰 Argent / Points distribués avec succès !');
  };




  const handleSaveMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName) return;

    setDishes(prev => {
      const exists = prev.some(d => d.day === mealDay && d.mealType === mealType);
      if (exists) {
        return prev.map(d => (d.day === mealDay && d.mealType === mealType) ? {
          ...d,
          name: mealName,
          image: mealImagePreset,
          ingredients: mealIngredients.split(',').map(i => i.trim()).filter(Boolean)
        } : d);
      } else {
        return [...prev, {
          id: `di-${Date.now()}`,
          day: mealDay,
          mealType: mealType,
          name: mealName,
          image: mealImagePreset,
          ingredients: mealIngredients.split(',').map(i => i.trim()).filter(Boolean)
        }];
      }
    });

    setMealName('');
    setMealIngredients('');
    alert(`🍳 Repas du ${mealDay} (${mealType === 'lunch' ? 'Déjeuner' : 'Dîner'}) enregistré !`);
  };

  return (
    <div className="pb-32 pt-6 px-4 md:px-8 space-y-6 max-w-4xl mx-auto premium-glow-purple">
      
      {/* Back button if active sub-module */}
      {activeModule && (
        <button 
          onClick={() => setActiveModule('')}
          className="flex items-center space-x-2 text-xs font-bold text-white/50 hover:text-white transition-all cursor-pointer py-1.5 px-3 rounded-xl bg-white/5 border border-white/5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au Tableau de Bord</span>
        </button>
      )}

      {/* Parental Lock Gate screen */}
      {activeModule && isLockedForChild && (
        <div className="glass-panel border border-[#FF4D6D]/30 rounded-[28px] p-8 max-w-md mx-auto text-center space-y-6 bg-gradient-to-br from-[#2D161F]/40 to-[#1A0A10]/60 my-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D6D]/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 rounded-full bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/30 animate-pulse shadow-[0_0_15px_rgba(255,77,109,0.2)]">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-base font-extrabold text-white tracking-tight">Accès Parent Privé 🔒</h3>
            <p className="text-xs text-[#FF4D6D] font-bold">Module confidentiel : {activeModule.toUpperCase()}</p>
            <p className="text-xs text-white/50 leading-relaxed max-w-[280px] mx-auto">
              Ce module contient des données financières, administratives ou de sécurité hautement réservées à Papa & Maman.
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4 pt-4 border-t border-white/5">
            <div className="space-y-1.5 text-left font-medium">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block text-center">Saisir le Code PIN Parent pour débloquer :</label>
              <input 
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className={`w-32 mx-auto text-center tracking-[0.5em] font-mono text-lg bg-white/5 border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FF4D6D] block ${
                  pinError ? 'border-[#FF4D6D] bg-[#FF4D6D]/10 animate-shake' : 'border-white/10'
                }`}
              />
              {pinError && (
                <p className="text-[10px] text-[#FF4D6D] font-bold text-center mt-1">Code PIN incorrect. Veuillez réessayer.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#6C5CFF] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:opacity-95 shadow-md flex items-center justify-center space-x-2"
            >
              <span>Déverrouiller l'accès</span>
            </button>
            
            <p className="text-[9px] text-white/30 font-medium text-center">💡 Indice Démo: Entrez 0000 ou 1234</p>
          </form>
        </div>
      )}

      {/* Main Grid dashboard (Screen 4 Layout) */}
      {!activeModule && (
        <>
          <WidgetMeteo />
          
          {/* Dashboard Head */}
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 text-[#6C5CFF]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">OS Familial</h1>
              <p className="text-xs text-white/50 font-medium font-sans">11 modules connectés pour votre maison</p>
            </div>
          </div>

          {/* Primary Cards Grid (Screen 4 pixel replica) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    if (mod.id === 'finances_hub' && !isParent && !authorizedModules.includes('finances_hub')) {
                      setActiveModule('finances_hub');
                    } else if (mod.id === 'finances_hub') {
                      setActiveTab('finances');
                    } else {
                      setActiveModule(mod.id);
                    }
                  }}
                  className={`glass-panel rounded-[28px] p-5 text-left border border-white/6 flex flex-col justify-between h-[180px] cursor-pointer transition-all hover:bg-white/8 hover:translate-y-[-2px] group`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`p-3 rounded-[18px] ${mod.color} border border-white/5 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-[10px]">
                      {mod.badge}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white tracking-wide">{mod.title}</h3>
                    <p className="text-[11px] text-white/50 leading-relaxed font-sans font-medium">{mod.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Secondary Modules Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">Outils complémentaires</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {secondaryModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(mod.id)}
                    className="glass-panel rounded-[24px] p-4 flex items-center justify-between border border-white/5 hover:bg-white/8 transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl ${mod.color} border border-white/5`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{mod.title}</h4>
                        <p className="text-[11px] text-white/50 font-sans">{mod.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Shield Banner (Screen 4 pixel replica) */}
          <div className="rounded-[28px] border border-[#6C5CFF]/20 bg-gradient-to-r from-[#1C2C4E]/40 to-[#0F1E3D]/50 p-5 flex items-center space-x-4 shadow-sm">
            <div className="p-3.5 rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] border border-[#6C5CFF]/20">
              <ShieldCheck className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white">Vos données sont 100% sécurisées</h4>
              <p className="text-[10px] sm:text-xs text-white/50 font-medium mt-1 leading-normal font-sans">
                Chiffrement de bout en bout • Sauvegarde cloud • Confidentialité garantie
              </p>
            </div>
          </div>
        </>
      )}

      {/* SUB-MODULE 0: Finances Hub Kid unlocked screen */}
      {activeModule === 'finances_hub' && !isLockedForChild && (
        <div className="glass-panel border border-[#00D26A]/30 rounded-[28px] p-8 max-w-md mx-auto text-center space-y-6 bg-gradient-to-br from-[#162D21]/40 to-[#0A1A10]/60 my-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 rounded-full bg-[#00D26A]/15 text-[#00D26A] border border-[#00D26A]/30 animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h3 className="text-base font-extrabold text-white">Accès Déverrouillé ! 🔓</h3>
            <p className="text-xs text-white/60">L'autorisation parentale a été validée avec succès.</p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setActiveModule('');
              setActiveTab('finances');
            }}
            className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer hover:scale-105 transition-all shadow-md"
          >
            Accéder au module Finances maintenant
          </button>
        </div>
      )}

      {/* SUB-MODULE 1: Documents Vault */}
      {activeModule === 'documents' && !isLockedForChild && (
        <CoffreFortAvance documents={documents} setDocuments={setDocuments} members={members} />
      )}

      {/* SUB-MODULE 1.5: Messagerie */}
      {activeModule === 'messagerie' && (
        <Messagerie members={members} activeMemberId={activeMemberId} />
      )}

      {/* SUB-MODULE 2: Santé */}
      {activeModule === 'sante' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Carnet Santé & Vaccins</h2>
            <p className="text-xs text-white/50">Vaccination et suivi pédiatrique</p>
          </div>

          {/* Growth curve mockup rendered with gorgeous CSS/SVG paths */}
          <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#FF4D6D]" />
              <span>Courbe de Croissance (Amadou)</span>
            </h3>
            
            {/* Custom Interactive SVG growth lines chart */}
            <div className="h-44 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                {/* Horizontal grid lines */}
                <line x1="20" y1="20" x2="280" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="20" y1="60" x2="280" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="20" y1="100" x2="280" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                
                {/* Curve lines */}
                {/* Normal upper percentile border */}
                <path d="M20,130 Q120,80 280,30" fill="none" stroke="rgba(108, 92, 255, 0.15)" strokeWidth="5" strokeLinecap="round" />
                
                {/* Amadou actual growth path */}
                <path d="M20,128 C80,105 180,68 280,38" fill="none" stroke="#FF4D6D" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Node dots */}
                <circle cx="20" cy="128" r="4" fill="#FF4D6D" />
                <circle cx="100" cy="98" r="4" fill="#FF4D6D" />
                <circle cx="190" cy="65" r="4" fill="#FF4D6D" />
                <circle cx="280" cy="38" r="4" fill="#FF4D6D" />
                
                {/* Labels */}
                <text x="18" y="145" fill="rgba(255,255,255,0.4)" fontSize="8">Naissance</text>
                <text x="95" y="145" fill="rgba(255,255,255,0.4)" fontSize="8">3 ans</text>
                <text x="185" y="145" fill="rgba(255,255,255,0.4)" fontSize="8">6 ans</text>
                <text x="260" y="145" fill="rgba(255,255,255,0.4)" fontSize="8">12 ans</text>

                <text x="282" y="38" fill="#FF4D6D" fontSize="9" fontWeight="bold">152 cm</text>
              </svg>
            </div>
            <p className="text-[10px] text-white/40 text-center font-medium">Ligne rouge: courbe d'Amadou • Zone floue: percentile normal</p>
          </div>

          {/* Vaccination table */}
          <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Statut des Vaccinations</h3>
            <div className="space-y-2">
              {[
                { name: 'DTC (Diphtérie-Tétanos-Coqueluche)', status: 'À Jour', date: '05/02/2026', member: 'Amadou', color: 'text-[#00D26A]' },
                { name: 'ROR (Rougeole-Oreillons-Rubéole)', status: 'À Jour', date: '12/04/2026', member: 'Ibrahima', color: 'text-[#00D26A]' },
                { name: 'Méningocoque B', status: 'À faire', date: '02/10/2026', member: 'Ibrahima', color: 'text-[#FFB020]' },
                { name: 'Rappel Tétanos', status: 'Recommandé', date: '12/12/2026', member: 'Papa', color: 'text-white/40' }
              ].map((vac, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0 text-xs">
                  <div>
                    <h4 className="font-bold text-white">{vac.name}</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">{vac.member}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${vac.color}`}>{vac.status}</span>
                    <p className="text-[10px] text-white/40 mt-0.5">{vac.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODULE 3: Courses */}
      {(activeModule === 'courses' || activeModule === 'menus') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white">Courses & Éco-Chef</h2>
              <p className="text-xs text-white/50">Gestion partagée et planification intelligente de repas</p>
            </div>
          </div>

          {/* Parental Waiver Switch (Only visible for Papa/Maman) */}
          {isParent && (
            <div className="glass-panel rounded-[24px] p-4 border border-[#FFB020]/20 flex items-center justify-between bg-[#FFB020]/5 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Dérogation Enfants 🔓</h4>
                  <p className="text-[10px] text-white/50">Autoriser Amadou & Awa à éditer la liste</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleDerogation}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wider uppercase border transition-all cursor-pointer ${
                  groceryDerogation 
                    ? 'bg-[#00D26A] border-[#00D26A] text-white' 
                    : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                {groceryDerogation ? 'Accordée' : 'Bloquée'}
              </button>
            </div>
          )}

          {/* Sub-tab selection */}
          <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 flex space-x-1">
            <button
              onClick={() => setGrocerySubTab('liste')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                grocerySubTab === 'liste' 
                  ? 'bg-[#FFB020] text-black shadow-md' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Liste Courses
            </button>
            <button
              onClick={() => setGrocerySubTab('menus')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                grocerySubTab === 'menus' 
                  ? 'bg-[#FFB020] text-black shadow-md' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Menus 🍳
            </button>
            <button
              onClick={() => setGrocerySubTab('ecochef')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                grocerySubTab === 'ecochef' 
                  ? 'bg-[#FFB020] text-black shadow-md' 
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Éco-Chef IA 🥦
            </button>
          </div>

          {grocerySubTab === 'liste' ? (
            <>
              {/* Quick add item form or Lock message for kids */}
              {!isParent && !groceryDerogation ? (
                <div className="p-6 rounded-[28px] bg-[#FF4D6D]/5 border border-[#FF4D6D]/15 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/20 animate-pulse">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ajout de courses verrouillé 🔒</h4>
                  <p className="text-[10px] text-white/60 leading-normal max-w-[285px] mx-auto">
                    La liste de courses est gérée par Papa & Maman. Demandez-leur d'activer la dérogation temporaire pour ajouter vos envies !
                  </p>
                </div>
              ) : (
                <form onSubmit={handleGrocerySubmit} className="glass-panel rounded-[24px] p-5 border border-white/6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ajouter un produit</h3>
                    {!isParent && groceryDerogation && (
                      <span className="text-[9px] font-extrabold text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Dérogation Active 🔓
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Nom du produit</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Lait, Pommes, Pâtes..." 
                        value={newGroceryName}
                        onChange={(e) => setNewGroceryName(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Catégorie</label>
                      <select 
                        value={newGroceryCat}
                        onChange={(e) => setNewGroceryCat(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="Épicerie">Épicerie</option>
                        <option value="Fruits & Légumes">Fruits & Légumes</option>
                        <option value="Produits Frais">Produits Frais</option>
                        <option value="Boucherie">Boucherie</option>
                        <option value="Boissons">Boissons</option>
                        <option value="Hygiène">Hygiène & Beauté</option>
                        <option value="Entretien">Entretien Maison</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Quantité</label>
                      <div className="flex items-center space-x-2">
                        <button 
                          type="button" 
                          onClick={() => setNewGroceryQty(prev => Math.max(1, prev - 1))}
                          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          min="1"
                          required
                          value={newGroceryQty}
                          onChange={(e) => setNewGroceryQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 bg-white/5 border border-white/8 rounded-xl py-2 text-center text-xs text-white focus:outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => setNewGroceryQty(prev => prev + 1)}
                          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Unité</label>
                      <select 
                        value={newGroceryUnit}
                        onChange={(e) => setNewGroceryUnit(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="pièces">pièces</option>
                        <option value="paquets">paquets</option>
                        <option value="bouteilles">bouteilles</option>
                        <option value="boîtes">boîtes</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3 rounded-xl bg-[#FFB020] text-black hover:opacity-95 transition-all cursor-pointer font-bold text-xs flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Ajouter à la liste commune</span>
                  </button>
                </form>
              )}

              {/* Grocery items checklist */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">Liste commune</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groceries.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (!isParent && !groceryDerogation) {
                          alert("🔒 Dérogation parentale requise pour cocher ou modifier les courses !");
                          return;
                        }
                        onToggleGrocery(item.id);
                      }}
                      className={`glass-panel rounded-[24px] p-4 border transition-all text-left flex items-center justify-between hover:bg-white/8 cursor-pointer ${
                        item.checked ? 'border-[#00D26A]/30 bg-[#00D26A]/5 opacity-60' : 'border-white/8'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          item.checked ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                        }`}>
                          ✓
                        </span>
                        <div>
                          <h4 className={`text-xs sm:text-sm font-bold text-white ${item.checked ? 'line-through text-white/40' : ''}`}>
                            {item.name}
                          </h4>
                          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-0.5">{item.category} • Qté: {item.quantity}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        item.inStock 
                          ? 'bg-[#00D26A]/10 border-[#00D26A]/20 text-[#00D26A]' 
                          : 'bg-[#FF4D6D]/10 border-[#FF4D6D]/20 text-[#FF4D6D]'
                      }`}>
                        {item.inStock ? 'En stock' : 'Rupture'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : grocerySubTab === 'menus' ? (
            <div className="space-y-6">
              
              {/* Form to edit/add menu (Only for parents) */}
              {isParent ? (
                <form onSubmit={handleSaveMeal} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Planifier ou modifier un repas :</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Jour</label>
                      <select 
                        value={mealDay}
                        onChange={(e) => setMealDay(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="Lun">Lundi</option>
                        <option value="Mar">Mardi</option>
                        <option value="Mer">Mercredi</option>
                        <option value="Jeu">Jeudi</option>
                        <option value="Ven">Vendredi</option>
                        <option value="Sam">Samedi</option>
                        <option value="Dim">Dimanche</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Moment</label>
                      <select 
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value as 'lunch' | 'dinner')}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        <option value="lunch">Déjeuner ☀️</option>
                        <option value="dinner">Dîner 🌙</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nom du plat</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Poulet Yassa traditionnel..." 
                        value={mealName}
                        onChange={(e) => setMealName(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Image Vignette Culinaire</label>
                      <select 
                        value={mealImagePreset}
                        onChange={(e) => setMealImagePreset(e.target.value)}
                        className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFB020]"
                      >
                        {MEAL_IMAGE_PRESETS.map(pr => (
                          <option key={pr.url} value={pr.url}>{pr.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Ingrédients (séparés par des virgules)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Poulet, Oignons, Citrons, Moutarde, Riz..." 
                      value={mealIngredients}
                      onChange={(e) => setMealIngredients(e.target.value)}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-black font-extrabold text-xs shadow-md cursor-pointer transition-all hover:opacity-95 flex items-center justify-center space-x-2"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Enregistrer le Repas</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-white/50">
                  🔒 La planification des menus est gérée par les parents.
                </div>
              )}

              {/* Weekly visual cards list */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Menu Planifié de la semaine :</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => {
                    const dayDishes = dishes.filter(d => d.day === day);
                    const frenchDay = day === 'Lun' ? 'Lundi' : day === 'Mar' ? 'Mardi' : day === 'Mer' ? 'Mercredi' : day === 'Jeu' ? 'Jeudi' : day === 'Ven' ? 'Vendredi' : day === 'Sam' ? 'Samedi' : 'Dimanche';
                    
                    return (
                      <div key={day} className="glass-panel border border-white/6 rounded-[28px] p-4 space-y-3">
                        <div className="border-b border-white/5 pb-2">
                          <h4 className="text-xs font-extrabold text-[#FFB020] tracking-wide">{frenchDay}</h4>
                        </div>

                        {dayDishes.length > 0 ? (
                          <div className="space-y-3">
                            {dayDishes.map(dish => (
                              <div key={dish.id} className="flex items-center space-x-3 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                                {dish.image ? (
                                  <img 
                                    src={dish.image} 
                                    alt={dish.name} 
                                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                                  />
                                ) : (
                                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/5 text-white/60 shrink-0">
                                    <UtensilsCrossed className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5">
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase border ${
                                      dish.mealType === 'lunch' 
                                        ? 'text-[#FFB020] bg-[#FFB020]/10 border-[#FFB020]/20' 
                                        : 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/20'
                                    }`}>
                                      {dish.mealType === 'lunch' ? 'Déjeuner ☀️' : 'Dîner 🌙'}
                                    </span>
                                  </div>
                                  <h5 className="text-[11px] sm:text-xs font-bold text-white truncate mt-1">{dish.name}</h5>
                                  <p className="text-[9px] text-white/40 truncate mt-0.5">
                                    {dish.ingredients.join(', ')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-white/30 py-2 text-center">Aucun repas planifié</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <EcoChef onAddGroceryItem={onAddGroceryItem} formatMoney={formatMoney} />
          )}
        </div>
      )}

      {/* SUB-MODULE 4: Tâches */}
      {activeModule === 'taches' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Tâches Ménagères & Missions</h2>
            <p className="text-xs text-white/50">Rotation automatique et argent de poche</p>
          </div>

          {/* Gamified Parent Validation Alert */}
          {isParent && tasks.some(t => t.done && !t.validatedByParent) && (
            <div className="p-4 rounded-[28px] bg-[#FFB020]/10 border border-[#FFB020]/20 space-y-3">
              <div className="flex items-center space-x-2 text-[#FFB020]">
                <Sparkles className="w-5 h-5 text-[#FFB020]" />
                <h4 className="text-xs font-bold uppercase tracking-wider">En attente de validation parentale</h4>
              </div>
              <div className="space-y-2">
                {tasks.filter(t => t.done && !t.validatedByParent).map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-white">{task.title}</p>
                      <p className="text-[10px] text-white/50">Effectué par {task.assignedMemberName} (+{task.rewardPoints} Pts)</p>
                    </div>
                    <button 
                      onClick={() => onValidateTask(task.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#00D26A] text-white text-[10px] font-bold hover:opacity-90 transition-all cursor-pointer shadow-md"
                    >
                      Valider (+{formatMoney(task.rewardPoints / 10)})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">Tableau de répartition</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`glass-panel rounded-[28px] p-4 border flex flex-col justify-between h-[130px] transition-all ${
                    task.done 
                      ? task.validatedByParent 
                        ? 'border-[#00D26A]/30 bg-[#00D26A]/5 opacity-60' 
                        : 'border-[#FFB020]/30 bg-[#FFB020]/5' 
                      : 'border-white/8'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[8px] font-extrabold text-[#6C5CFF] uppercase tracking-widest bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 px-2 py-0.5 rounded-lg">
                        {task.rotation === 'daily' ? 'Quotidienne' : task.rotation === 'weekly' ? 'Hebdo' : 'Ponctuel'}
                      </span>
                      <h4 className={`text-xs sm:text-sm font-bold text-white mt-2 ${task.done ? 'line-through text-white/40' : ''}`}>
                        {task.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-extrabold text-[#6C5CFF] bg-[#6C5CFF]/10 border border-[#6C5CFF]/20 px-2 py-0.5 rounded-lg shrink-0">
                      +{task.rewardPoints} Pts
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                    <span className="text-[10px] text-white/50">Assigné : <strong className="text-white">{task.assignedMemberName}</strong></span>
                    {!task.done ? (
                      <button 
                        onClick={() => onToggleTask(task.id)}
                        className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white text-[10px] font-bold cursor-pointer"
                      >
                        Marquer fait
                      </button>
                    ) : (
                      <span className={`text-[10px] font-bold ${task.validatedByParent ? 'text-[#00D26A]' : 'text-[#FFB020]'}`}>
                        {task.validatedByParent ? 'Validé' : 'En attente'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODULE 5: École */}
      {activeModule === 'ecole' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Suivi Scolaire & Devoirs</h2>
            <p className="text-xs text-white/50">Emploi du temps, devoirs et bulletins</p>
          </div>

          {/* School Schedule */}
          <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#6C5CFF]" />
              <span>Emploi du temps (Amadou - Collège)</span>
            </h3>
            <div className="space-y-2">
              {[
                { time: '08h30 - 10h00', subject: 'Mathématiques', prof: 'M. Roche' },
                { time: '10h15 - 12h00', subject: 'Histoire-Géographie', prof: 'Mme. Dupuis' },
                { time: '13h30 - 15h00', subject: 'Sciences (SVT)', prof: 'M. Lemoine' },
                { time: '15h15 - 17h00', subject: 'Anglais (LV1)', prof: 'Mrs. Smith' }
              ].map((course, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 text-xs">
                  <div>
                    <h4 className="font-bold text-white">{course.subject}</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Prof: {course.prof}</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-white/70 bg-white/5 px-2.5 py-1 rounded-[10px] border border-white/5 shrink-0">
                    {course.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* School Grades summary */}
          <div className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dernières Notes</h3>
            <div className="space-y-2">
              {[
                { subject: 'Mathématiques - Algèbre', note: '16.5 / 20', member: 'Amadou', status: 'Très Bien' },
                { subject: 'Français - Dictée', note: '18 / 20', member: 'Awa', status: 'Excellent' },
                { subject: 'Histoire - Révolution', note: '14 / 20', member: 'Amadou', status: 'Satisfaisant' }
              ].map((grade, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0 text-xs">
                  <div>
                    <h4 className="font-bold text-white">{grade.subject}</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">{grade.member}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[#00D26A]">{grade.note}</span>
                    <p className="text-[10px] text-white/40 mt-0.5">{grade.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive AI homework tutor & quizzes */}
          <div className="border-t border-white/5 pt-6">
            <TuteurScolaire 
              schoolTasks={schoolTasks} 
              setSchoolTasks={setSchoolTasks} 
              activeMemberId={activeMemberId} 
            />
          </div>
        </div>
      )}

      {/* OTHER SUB-MODULES (SECONDARY) */}
      {/* 6. Véhicules */}
      {activeModule === 'vehicules' && !isLockedForChild && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Gestion Véhicules</h2>
            <p className="text-xs text-white/50">Entretiens, contrôles et assurances</p>
          </div>

          <div className="space-y-4">
            {vehicles.map((v) => (
              <div key={v.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#4F8CFF]/10 text-[#4F8CFF] border border-white/5">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{v.name}</h3>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">Plaque: {v.plate}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-white/40 font-semibold">Expiration Assurance :</p>
                    <p className="font-bold text-white mt-0.5">{v.insuranceExpiry}</p>
                  </div>
                  <div>
                    <p className="text-white/40 font-semibold">Contrôle Technique :</p>
                    <p className="font-bold text-white mt-0.5">{v.technicalControl}</p>
                  </div>
                  <div>
                    <p className="text-white/40 font-semibold">Dernière Révision :</p>
                    <p className="font-bold text-white mt-0.5">{v.lastService}</p>
                  </div>
                  <div>
                    <p className="text-white/40 font-semibold">Prochaine Révision :</p>
                    <p className="font-bold text-[#FFB020] mt-0.5">{v.nextService}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire d'ajout de Véhicule */}
          <form onSubmit={handleAddVehicle} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
            <span className="text-[10px] font-bold text-[#4F8CFF] uppercase tracking-widest block flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-[#4F8CFF]" />
              <span>Ajouter un nouveau véhicule 🚗</span>
            </span>
            
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Marque / Modèle</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Peugeot 3008..."
                  value={newVehName}
                  onChange={(e) => setNewVehName(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Plaque d'Immatriculation</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: AA-123-BB..."
                  value={newVehPlate}
                  onChange={(e) => setNewVehPlate(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Échéance CT</label>
                <input 
                  type="text" 
                  placeholder="ex: 12 Octobre 2027"
                  value={newVehCT}
                  onChange={(e) => setNewVehCT(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Échéance Assurance</label>
                <input 
                  type="text" 
                  placeholder="ex: 24 Juin 2026"
                  value={newVehAssur}
                  onChange={(e) => setNewVehAssur(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Prochaine Révision</label>
                <input 
                  type="text" 
                  placeholder="ex: 14 Novembre 2026"
                  value={newVehService}
                  onChange={(e) => setNewVehService(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4F8CFF]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#4F8CFF] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#4F8CFF]/20"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Enregistrer le véhicule</span>
            </button>
          </form>
        </div>
      )}

      {/* 7. Logement */}
      {activeModule === 'logement' && !isLockedForChild && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Entretien Logement</h2>
            <p className="text-xs text-white/50">Maintenance, chaudière et interventions</p>
          </div>

          <div className="space-y-3">
            {maintenance.map((m) => (
              <div key={m.id} className="glass-panel rounded-[28px] border border-white/8 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#FFB020]/10 text-[#FFB020] border border-white/5">
                    <HomeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">{m.title}</h4>
                    <p className="text-[10px] text-white/40 font-medium mt-0.5">Prestataire: {m.provider} • Date: {m.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wide ${
                    m.status === 'scheduled' 
                      ? 'bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020]' 
                      : 'bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]'
                  }`}>
                    {m.status === 'scheduled' ? 'Planifié' : 'Effectué'}
                  </span>
                  <p className="text-xs font-bold text-white mt-1.5">{formatMoney(m.cost)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire d'ajout de Maintenance */}
          <form onSubmit={handleAddMaintenance} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
            <span className="text-[10px] font-bold text-[#FFB020] uppercase tracking-widest block flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-[#FFB020]" />
              <span>Ajouter une intervention logement 🔧</span>
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Intitulé de l'Intervention</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Révision annuelle de la chaudière..."
                  value={newMaintTitle}
                  onChange={(e) => setNewMaintTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Prestataire / Artisan</label>
                <input 
                  type="text" 
                  placeholder="ex: Engie Home Services..."
                  value={newMaintProvider}
                  onChange={(e) => setNewMaintProvider(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Coût (€)</label>
                <input 
                  type="number" 
                  required
                  placeholder="ex: 120"
                  value={newMaintCost}
                  onChange={(e) => setNewMaintCost(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date d'intervention</label>
                <input 
                  type="text" 
                  placeholder="ex: 20 Mai 2026"
                  value={newMaintDate}
                  onChange={(e) => setNewMaintDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FFB020]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Statut</label>
                <select
                  value={newMaintStatus}
                  onChange={(e) => setNewMaintStatus(e.target.value as any)}
                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="scheduled">Planifié</option>
                  <option value="completed">Effectué</option>
                  <option value="urgent">Urgent 🚨</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FFB020]/20"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Enregistrer l'intervention</span>
            </button>
          </form>
        </div>
      )}

      {/* 8. Voyages */}
      {activeModule === 'voyages' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Carnet de Voyages</h2>
            <p className="text-xs text-white/50">Listes de bagages et réservations</p>
          </div>

          {trips.map((t) => (
            <div key={t.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-[#FF4D6D]/10 text-[#FF4D6D] border border-white/5">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.destination}</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">Dates: {t.startDate} - {t.endDate}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#FF4D6D] bg-[#FF4D6D]/10 px-3 py-1 rounded-xl">
                  Budget: {formatMoney(t.budget)}
                </span>
              </div>

              {/* Reservations lists */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Réservations</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {t.bookingRefs.map((ref, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#07111F] border border-white/5 text-white font-medium">
                      {ref}
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-2">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Checklist Voyage</p>
                <div className="space-y-1.5">
                  {t.checklist.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 text-xs">
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                        item.done ? 'bg-[#00D26A] border-[#00D26A] text-white' : 'border-white/30 text-transparent'
                      }`}>
                        ✓
                      </span>
                      <span className={`${item.done ? 'line-through text-white/40' : 'text-white'}`}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Formulaire d'ajout de Voyage */}
          <form onSubmit={handleAddTrip} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 my-6">
            <span className="text-[10px] font-bold text-[#FF4D6D] uppercase tracking-widest block flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-[#FF4D6D]" />
              <span>Ajouter un nouveau voyage ✈️</span>
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Destination</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Séjour à Rome..."
                  value={newTripDest}
                  onChange={(e) => setNewTripDest(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Budget Total (€)</label>
                <input 
                  type="number" 
                  required
                  placeholder="ex: 1500"
                  value={newTripBudget}
                  onChange={(e) => setNewTripBudget(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date de Départ</label>
                <input 
                  type="text" 
                  placeholder="ex: 15 Juillet 2026"
                  value={newTripStart}
                  onChange={(e) => setNewTripStart(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Date de Retour</label>
                <input 
                  type="text" 
                  placeholder="ex: 22 Juillet 2026"
                  value={newTripEnd}
                  onChange={(e) => setNewTripEnd(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF4D6D]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#FF4D6D] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#FF4D6D]/20"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Enregistrer le voyage</span>
            </button>
          </form>

          {/* AI custom packing checklists generator */}
          <div className="border-t border-white/5 pt-6">
            <VoyageIA trips={trips} formatMoney={formatMoney} />
          </div>
        </div>
      )}

      {/* 9. Animaux */}
      {activeModule === 'animaux' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Suivi Animaux</h2>
            <p className="text-xs text-white/50">Vaccins et rendez-vous vétérinaires</p>
          </div>

          {pets.map((p) => (
            <div key={p.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
              <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                <div className="p-2.5 rounded-xl bg-[#00D26A]/10 text-[#00D26A] border border-white/5">
                  <Dog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">{p.species}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-white/40 font-semibold">Dernier Vaccin :</p>
                  <p className="font-bold text-white mt-0.5">{p.lastVaccine}</p>
                </div>
                <div>
                  <p className="text-white/40 font-semibold">Prochain Vaccin :</p>
                  <p className="font-bold text-[#FFB020] mt-0.5">{p.nextVaccine}</p>
                </div>
                {p.vetAppointment && (
                  <div className="col-span-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Rendez-vous vétérinaire</p>
                    <p className="text-xs font-bold text-white mt-1">Le {p.vetAppointment} • Clinique Vétérinaire</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Formulaire d'ajout d'Animal */}
          <form onSubmit={handleAddPet} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
            <span className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest block flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-[#00D26A]" />
              <span>Ajouter un animal au suivi 🐶</span>
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nom de l'Animal</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Filou..."
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Espèce / Race</label>
                <select
                  value={newPetSpecies}
                  onChange={(e) => setNewPetSpecies(e.target.value)}
                  className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Chien">Chien</option>
                  <option value="Chat">Chat</option>
                  <option value="Lapin">Lapin</option>
                  <option value="Oiseau">Oiseau</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Dernier Vaccin</label>
                <input 
                  type="text" 
                  placeholder="ex: 10 Janvier 2026"
                  value={newPetLastVaccine}
                  onChange={(e) => setNewPetLastVaccine(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Prochain Vaccin</label>
                <input 
                  type="text" 
                  placeholder="ex: 10 Janvier 2027"
                  value={newPetNextVaccine}
                  onChange={(e) => setNewPetNextVaccine(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
              
              <div className="space-y-1.5 text-left font-medium">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Rdv Vétérinaire</label>
                <input 
                  type="text" 
                  placeholder="ex: 15 Juin 2026 à 14h"
                  value={newPetAppointment}
                  onChange={(e) => setNewPetAppointment(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#00D26A]/20"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Enregistrer l'animal</span>
            </button>
          </form>
        </div>
      )}

      {/* 10. Argent de Poche */}
      {activeModule === 'argent' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Argent de Poche</h2>
            <p className="text-xs text-white/50">Missions rémunérées et cagnottes des enfants</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pocketMoney.map((child) => (
              <div key={child.id} className="glass-panel rounded-[28px] border border-white/8 p-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <img src={child.avatar} alt={child.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{child.name}</h3>
                    <p className="text-[10px] text-white/40">Enfant • Compte Épargne Connecté</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Solde Cagnotte</span>
                    <span className="text-base font-extrabold text-[#00D26A] mt-0.5 block">{formatMoney(child.balance)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-wide block">Points Actuels</span>
                    <span className="text-base font-extrabold text-[#6C5CFF] mt-0.5 block">{child.points} Pts</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    if (child.points >= 50) {
                      setPocketMoney(prev => prev.map(c => {
                        if (c.id === child.id) {
                          return { ...c, balance: c.balance + (c.points / 10), points: 0 };
                        }
                        return c;
                      }));
                      alert(`🎉 Points convertis en euros pour ${child.name} ! (+${(child.points / 10).toFixed(2)} €)`);
                    } else {
                      alert("⚠️ Il faut au moins 50 points pour effectuer une conversion en argent de poche.");
                    }
                  }}
                  className="w-full py-2.5 rounded-[18px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Convertir les Points en Euros (€)
                </button>
              </div>
            ))}
          </div>

          {/* Outil de Distribution Parent (uniquement pour les parents) */}
          {isParent && (
            <form onSubmit={handleAddPocketMoney} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
              <span className="text-[10px] font-bold text-[#6C5CFF] uppercase tracking-widest block flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 text-[#6C5CFF]" />
                <span>Distribuer de l'Argent ou des Points (Accès Parent) 💰</span>
              </span>
              
              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="space-y-1.5 text-left font-medium font-sans">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Sélectionner l'Enfant</label>
                  <select
                    value={allowanceChildId}
                    onChange={(e) => setAllowanceChildId(e.target.value)}
                    className="w-full bg-[#07111F] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    {pocketMoney.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5 text-left font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Ajouter Euros (€)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 10"
                    value={allowanceAmount}
                    onChange={(e) => setAllowanceAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>

                <div className="space-y-1.5 text-left font-medium">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Ajouter Points (Pts)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 100"
                    value={allowancePoints}
                    onChange={(e) => setAllowancePoints(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-[18px] bg-gradient-to-r from-[#6C5CFF] to-[#00D26A] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#6C5CFF]/20"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Valider la distribution</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* 11. Capsule Temporelle */}
      {activeModule === 'capsule' && (
        <CapsuleTemporelle 
          memories={memories} 
          setMemories={setMemories} 
          activeMemberId={activeMemberId} 
        />
      )}

      {/* 12. Conseil de Famille */}
      {activeModule === 'conseil' && (
        <ConseilFamille 
          votes={votes} 
          setVotes={setVotes} 
          activeMemberId={activeMemberId} 
        />
      )}

      {/* 13. PeaceMaker IA */}
      {activeModule === 'peacemaker' && (
        <PeaceMaker />
      )}

      {/* 14. MaVie Simulator */}
      {activeModule === 'mavie' && (
        <MaVieSimulator />
      )}

    </div>
  );
};
