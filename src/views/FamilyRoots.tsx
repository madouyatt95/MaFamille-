import { useState } from 'react';
import {
  ArrowLeft,
  SlidersHorizontal,
  Search,
  MessageSquare,
  MoreHorizontal,
  Users,
  GitBranch,
  Globe,
  MapPin,
  Calendar,
  Phone,
  Plus,
  Compass,
  GraduationCap
} from 'lucide-react';

// Interfaces for our static data
interface Member {
  id: string;
  name: string;
  birthYear: string;
  deathYear?: string;
  avatar: string;
  role?: string;
  location?: string;
}

interface FamilyCard {
  id: string;
  name: string;
  location: string;
  membersCount: number;
  avatars: string[];
  borderColor: string;
}

export function FamilyRoots({
  foyerId,
  familyName,
  members,
  canManage,
  isPremium,
  onTriggerPaywall,
  onSendNotification,
  onAddAgendaEvent,
  onCreateBranchGroup
}: {
  foyerId?: string;
  familyName?: string;
  members?: any[];
  canManage?: boolean;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  onSendNotification?: (title: string, body: string, type?: string) => void;
  onAddAgendaEvent?: (event: any) => void;
  onCreateBranchGroup?: (name: string, members: any[]) => Promise<any>;
}) {
  const [activeTab, setActiveTab] = useState<'arbre' | 'cousins' | 'branches' | 'carte'>('arbre');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [profileViewMode, setProfileViewMode] = useState<'drawer' | 'full'>('full');
  const [cousinSearch, setCousinSearch] = useState('');
  const [cousinFilter, setCousinFilter] = useState<'Tous' | 'Proches' | 'Par pays' | 'Par branche'>('Tous');

  // Static reference data matching mockup
  const g1Members: Member[] = [
    { id: 'ousmane', name: 'Ousmane Diop', birthYear: '1946', deathYear: '2018', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'awa', name: 'Awa Ndiaye', birthYear: '1950', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80' }
  ];

  const g2Members: Member[] = [
    { id: 'ibrahima', name: 'Ibrahima', birthYear: '1970', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'fatou', name: 'Fatou', birthYear: '1975', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'moussa', name: 'Moussa', birthYear: '1978', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'mariama', name: 'Mariama', birthYear: '1980', avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=150&h=150&q=80' }
  ];

  const g3FamilyCards: FamilyCard[] = [
    {
      id: 'fam_ibrahima',
      name: 'Famille Ibrahima',
      location: 'Dakar, Sénégal',
      membersCount: 15,
      borderColor: 'border-[#00D26A]',
      avatars: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=100&h=100&q=80'
      ]
    },
    {
      id: 'fam_mamadou',
      name: 'Famille Mamadou',
      location: 'Paris, France',
      membersCount: 12,
      borderColor: 'border-[#6C5CFF]',
      avatars: [
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=100&h=100&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&h=100&q=80'
      ]
    },
    {
      id: 'fam_moussa',
      name: 'Famille Moussa',
      location: 'Abidjan, Côte d\'Ivoire',
      membersCount: 9,
      borderColor: 'border-[#FF7A1A]',
      avatars: [
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&h=100&q=80',
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&h=100&q=80'
      ]
    }
  ];

  const g4Members: Member[] = [
    { id: 'aminata', name: 'Aminata', birthYear: '1995', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'cheikh', name: 'Cheikh', birthYear: '1998', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'sokhna', name: 'Sokhna', birthYear: '2001', avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'mamadou_jr', name: 'Mamadou Jr.', birthYear: '2003', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'aicha', name: 'Aïcha', birthYear: '2006', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'yacine', name: 'Yacine', birthYear: '2000', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'hawa', name: 'Hawa', birthYear: '2004', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80' }
  ];

  const g5Members: Member[] = [
    { id: 'ali', name: 'Ali', birthYear: '2021', avatar: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'mariam', name: 'Mariam', birthYear: '2023', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80' }
  ];

  // 24 Cousins mockup data
  const cousinsList: Member[] = [
    { id: 'fatima_c', name: 'Fatima Diop', role: 'Cousine', location: 'Dakar, Sénégal', birthYear: '1996', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'abdoulaye_c', name: 'Abdoulaye Diop', role: 'Cousin', location: 'Paris, France', birthYear: '1997', avatar: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'ndeye_c', name: 'Ndeye Diop', role: 'Cousine', location: 'New York, USA', birthYear: '1999', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'youssouf_c', name: 'Youssouf Diop', role: 'Cousin', location: 'Abidjan, Côte d\'Ivoire', birthYear: '1998', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'khady_c', name: 'Khady Diop', role: 'Cousine', location: 'Marseille, France', birthYear: '2000', avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'aicha_c', name: 'Aïcha Diop', role: 'Cousine', location: 'Paris, France', birthYear: '2006', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: 'ibrahima_jr_c', name: 'Ibrahima Jr. Diop', role: 'Cousin', location: 'Dakar, Sénégal', birthYear: '1995', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80' }
  ];

  // Helper to filter cousins
  const filteredCousins = cousinsList.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(cousinSearch.toLowerCase()) || c.location?.toLowerCase().includes(cousinSearch.toLowerCase());
    if (cousinFilter === 'Tous') return matchesSearch;
    if (cousinFilter === 'Proches') return matchesSearch && c.role === 'Cousine';
    if (cousinFilter === 'Par pays') return matchesSearch && c.location?.includes('France');
    if (cousinFilter === 'Par branche') return matchesSearch && c.location?.includes('Dakar');
    return matchesSearch;
  });

  return (
    <div className="relative min-h-screen w-full bg-[#050C1A] text-white font-sans overflow-x-hidden pb-12 select-none">
      
      {/* Top Banner/Header */}
      <header className="px-4 pt-6 pb-4 border-b border-white/5 bg-[#050C1A]">
        <div className="flex items-center justify-between">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5 text-white/80" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide flex items-center justify-center gap-1.5">
              Racines familiales 🌳
            </h1>
            <p className="text-[10px] font-semibold text-white/40 mt-0.5">
              Notre histoire, nos liens, nos racines 🌳
            </p>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10">
            <SlidersHorizontal className="h-4 w-4 text-white/80" />
          </button>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="mt-6 flex justify-between gap-1 rounded-2xl bg-white/4 p-1">
          {(['arbre', 'cousins', 'branches', 'carte'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black capitalize transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-[#6C5CFF] text-white shadow-[0_4px_12px_rgba(108,92,255,0.3)]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area based on Tab */}
      <main className="px-4 py-5">
        
        {/* Tab 1: ARBRE (Family Tree Canvas) */}
        {activeTab === 'arbre' && (
          <div className="relative w-full flex flex-col items-center">
            {/* Scrollable container for the absolute positioned canvas */}
            <div className="w-full overflow-x-auto pb-6 scrollbar-hide">
              <div className="relative w-[820px] h-[850px] bg-[#050C1A]/50 rounded-3xl p-4 overflow-hidden">
                
                {/* SVG Connecting Lines behind elements */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                  {/* G1 to Heart to G2 connection */}
                  <path d="M 330 110 L 490 110" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M 410 110 L 410 170" stroke="white" strokeWidth="2" />
                  <path d="M 150 170 L 690 170" stroke="white" strokeWidth="2" />
                  
                  {/* Stems down to G2 */}
                  <line x1="150" y1="170" x2="150" y2="200" stroke="white" strokeWidth="2" />
                  <line x1="330" y1="170" x2="330" y2="200" stroke="white" strokeWidth="2" />
                  <line x1="510" y1="170" x2="510" y2="200" stroke="white" strokeWidth="2" />
                  <line x1="690" y1="170" x2="690" y2="200" stroke="white" strokeWidth="2" />

                  {/* G2 to G3 (Foyers) vertical branches */}
                  <line x1="150" y1="260" x2="150" y2="330" stroke="#00D26A" strokeWidth="2" />
                  <line x1="330" y1="260" x2="330" y2="330" stroke="#6C5CFF" strokeWidth="2" />
                  <line x1="510" y1="260" x2="510" y2="330" stroke="#FF7A1A" strokeWidth="2" />

                  {/* G3 (Foyers) to G4 (Children) lines */}
                  {/* Dakar branch (Green) */}
                  <path d="M 126 430 L 126 470" stroke="#00D26A" strokeWidth="2" />
                  <path d="M 50 470 L 200 470" stroke="#00D26A" strokeWidth="2" />
                  <line x1="50" y1="470" x2="50" y2="500" stroke="#00D26A" strokeWidth="2" />
                  <line x1="125" y1="470" x2="125" y2="500" stroke="#00D26A" strokeWidth="2" />
                  <line x1="200" y1="470" x2="200" y2="500" stroke="#00D26A" strokeWidth="2" />

                  {/* Paris branch (Purple) */}
                  <path d="M 326 430 L 326 470" stroke="#6C5CFF" strokeWidth="2" />
                  <path d="M 285 470 L 365 470" stroke="#6C5CFF" strokeWidth="2" />
                  <line x1="285" y1="470" x2="285" y2="500" stroke="#6C5CFF" strokeWidth="2" />
                  <line x1="365" y1="470" x2="365" y2="500" stroke="#6C5CFF" strokeWidth="2" />

                  {/* Abidjan branch (Orange) */}
                  <path d="M 526 430 L 526 470" stroke="#FF7A1A" strokeWidth="2" />
                  <path d="M 485 470 L 565 470" stroke="#FF7A1A" strokeWidth="2" />
                  <line x1="485" y1="470" x2="485" y2="500" stroke="#FF7A1A" strokeWidth="2" />
                  <line x1="565" y1="470" x2="565" y2="500" stroke="#FF7A1A" strokeWidth="2" />

                  {/* G4 to G5 Grandchildren (Aminata branch) */}
                  <path d="M 50 560 L 50 620" stroke="#00D26A" strokeWidth="2" />
                  <path d="M 50 620 L 170 620" stroke="#00D26A" strokeWidth="2" />
                  <line x1="170" y1="620" x2="170" y2="650" stroke="#00D26A" strokeWidth="2" />
                  <line x1="50" y1="620" x2="50" y2="650" stroke="#00D26A" strokeWidth="2" />
                </svg>

                {/* GENERATION 1 */}
                <div className="absolute top-[2px] left-[220px] w-[380px] flex items-center justify-between">
                  <span className="absolute top-[-20px] left-1/2 transform -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-white/30">Génération 1</span>
                  {/* Ousmane Diop */}
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full border-2 border-white/20 p-0.5 bg-[#050C1A]">
                      <img src={g1Members[0].avatar} alt={g1Members[0].name} className="h-full w-full rounded-full object-cover" />
                    </div>
                    <strong className="text-[10px] font-black text-white/90 mt-1.5">{g1Members[0].name}</strong>
                    <span className="text-[8px] font-bold text-white/30 mt-0.5">{g1Members[0].birthYear} - {g1Members[0].deathYear}</span>
                  </div>

                  {/* Connected Heart Button */}
                  <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#6C5CFF] to-[#8C7EFF] shadow-lg border border-white/10 hover:scale-110 transition-all duration-300">
                    <span className="text-white text-[10px] font-black">❤️</span>
                  </div>

                  {/* Awa Ndiaye */}
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full border-2 border-white/20 p-0.5 bg-[#050C1A]">
                      <img src={g1Members[1].avatar} alt={g1Members[1].name} className="h-full w-full rounded-full object-cover" />
                    </div>
                    <strong className="text-[10px] font-black text-white/90 mt-1.5">{g1Members[1].name}</strong>
                    <span className="text-[8px] font-bold text-white/30 mt-0.5">{g1Members[1].birthYear} - </span>
                  </div>
                </div>

                {/* GENERATION 2 */}
                <div className="absolute top-[200px] left-[80px] w-[660px] flex items-center justify-between">
                  <span className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-white/30">Génération 2</span>
                  {g2Members.map(member => (
                    <div key={member.id} className="flex flex-col items-center w-[120px]">
                      <div className="h-14 w-14 rounded-full border border-white/15 p-0.5 bg-[#050C1A]">
                        <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                      </div>
                      <strong className="text-[10px] font-black text-white/90 mt-1.5">{member.name}</strong>
                      <span className="text-[8px] font-bold text-white/30 mt-0.5">{member.birthYear} - </span>
                    </div>
                  ))}
                </div>

                {/* GENERATION 3: FAMILY HOUSEHOLDS (Foyers) */}
                <div className="absolute top-[340px] left-[60px] w-[620px] flex items-center justify-between">
                  <span className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-white/30">Génération 3</span>
                  {g3FamilyCards.map(card => (
                    <div
                      key={card.id}
                      className={`relative flex flex-col items-center justify-center w-[132px] h-[132px] rounded-[24px] border ${card.borderColor} bg-[#0A1224] p-3 text-center shadow-[0_8px_24px_rgba(0,0,0,0.4)] border-t-[3px] border-b-[3px]`}
                    >
                      {/* Overlapping Avatars */}
                      <div className="flex items-center -space-x-3 mb-2">
                        {card.avatars.map((av, idx) => (
                          <img
                            key={idx}
                            src={av}
                            alt=""
                            className="h-10 w-10 rounded-full border-2 border-[#0A1224] object-cover shadow-md"
                          />
                        ))}
                      </div>
                      <strong className="text-[11px] font-black leading-tight text-white mb-0.5">{card.name}</strong>
                      <span className="text-[8px] font-semibold text-white/40">{card.location}</span>
                      <span className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[8px] font-black text-white/60">
                        {card.membersCount}
                      </span>
                    </div>
                  ))}
                </div>

                {/* GENERATION 4: CHILDREN */}
                <div className="absolute top-[515px] left-[10px] w-[620px] flex items-start gap-4">
                  <span className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-white/30">Génération 4</span>
                  
                  {/* Children of Dakar Branch */}
                  <div className="flex gap-4 w-[220px] justify-between pl-2">
                    {g4Members.slice(0, 3).map(member => (
                      <div key={member.id} className="flex flex-col items-center">
                        <div className="h-11 w-11 rounded-full border border-white/15 p-0.5 bg-[#050C1A]">
                          <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                        </div>
                        <strong className="text-[9px] font-black text-white/90 mt-1">{member.name}</strong>
                        <span className="text-[7px] font-bold text-white/30 mt-0.5">{member.birthYear}</span>
                      </div>
                    ))}
                  </div>

                  {/* Children of Paris Branch */}
                  <div className="flex gap-4 w-[140px] justify-center pl-8">
                    {g4Members.slice(3, 5).map(member => (
                      <button
                        key={member.id}
                        onClick={() => {
                          if (member.id === 'aicha') {
                            setSelectedMember('00000000-0000-0000-0000-000000000012');
                            setProfileViewMode('full');
                          }
                        }}
                        className="flex flex-col items-center focus:outline-none hover:scale-105 transition-transform"
                      >
                        <div className={`h-11 w-11 rounded-full border p-0.5 bg-[#050C1A] ${member.id === 'aicha' ? 'border-[#6C5CFF] shadow-[0_0_8px_rgba(108,92,255,0.4)]' : 'border-white/15'}`}>
                          <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                        </div>
                        <strong className="text-[9px] font-black text-white/90 mt-1">{member.id === 'aicha' ? 'Aïcha' : member.name}</strong>
                        <span className="text-[7px] font-bold text-white/30 mt-0.5">{member.birthYear}</span>
                      </button>
                    ))}
                  </div>

                  {/* Children of Abidjan Branch */}
                  <div className="flex gap-4 w-[140px] justify-end pl-14">
                    {g4Members.slice(5, 7).map(member => (
                      <div key={member.id} className="flex flex-col items-center">
                        <div className="h-11 w-11 rounded-full border border-white/15 p-0.5 bg-[#050C1A]">
                          <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                        </div>
                        <strong className="text-[9px] font-black text-white/90 mt-1">{member.name}</strong>
                        <span className="text-[7px] font-bold text-white/30 mt-0.5">{member.birthYear}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GENERATION 5: GRANDCHILDREN */}
                <div className="absolute top-[670px] left-[15px] w-[200px] flex items-center justify-between">
                  <span className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-white/30">Génération 5</span>
                  {g5Members.map(member => (
                    <div key={member.id} className="flex flex-col items-center w-[90px]">
                      <div className="h-11 w-11 rounded-full border border-white/15 p-0.5 bg-[#050C1A]">
                        <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                      </div>
                      <strong className="text-[9px] font-black text-white/90 mt-1">{member.name}</strong>
                      <span className="text-[7px] font-bold text-white/30 mt-0.5">{member.birthYear}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Bottom Button */}
            <button className="mt-4 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#6C5CFF] py-4 text-sm font-black shadow-[0_4px_20px_rgba(108,92,255,0.25)] hover:bg-[#5b4eff] transition-all">
              <Plus className="h-4 w-4" /> Lier une nouvelle branche
            </button>
          </div>
        )}

        {/* Tab 2: COUSINS (List View) */}
        {activeTab === 'cousins' && (
          <div className="space-y-5">
            {/* Search Pill */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={cousinSearch}
                onChange={e => setCousinSearch(e.target.value)}
                placeholder="Rechercher un cousin, une cousine..."
                className="w-full rounded-2xl border border-white/5 bg-[#0D182E] px-4 py-3.5 pl-11 text-xs font-semibold text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF]/45"
              />
              <Search className="absolute left-4 h-4 w-4 text-white/30" />
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col rounded-2xl bg-[#0D182E] border border-white/5 p-3 text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Cousins</span>
                <span className="text-xl font-black text-[#6C5CFF] mt-1">24</span>
              </div>
              <div className="flex flex-col rounded-2xl bg-[#0D182E] border border-white/5 p-3 text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Branches</span>
                <span className="text-xl font-black text-[#00D26A] mt-1">7</span>
              </div>
              <div className="flex flex-col rounded-2xl bg-[#0D182E] border border-white/5 p-3 text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Pays</span>
                <span className="text-xl font-black text-[#00A3FF] mt-1">4</span>
              </div>
            </div>

            {/* Filters chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['Tous', 'Proches', 'Par pays', 'Par branche'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setCousinFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
                    cousinFilter === filter
                      ? 'bg-[#6C5CFF]/15 text-[#C9C3FF] border border-[#6C5CFF]/30'
                      : 'bg-[#0D182E] text-white/40 border border-white/5'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Section title */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white/90">Cousins & cousines (24)</h3>
              <Users className="h-4 w-4 text-[#6C5CFF]" />
            </div>

            {/* List box */}
            <div className="rounded-3xl bg-[#0A1224] border border-white/5 p-4 space-y-4 shadow-lg">
              {filteredCousins.map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedMember('00000000-0000-0000-0000-000000000012');
                      setProfileViewMode('full');
                    }}
                    className="flex items-center gap-3 text-left focus:outline-none flex-1"
                  >
                    <img src={c.avatar} alt={c.name} className="h-11 w-11 rounded-full object-cover border border-white/10" />
                    <div>
                      <h4 className="text-xs font-black text-white">{c.name}</h4>
                      <p className="text-[9px] font-bold text-white/40 mt-0.5">{c.role} · {c.location}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6C5CFF]/10 text-[#6C5CFF]">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/40">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* View all button */}
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0D182E] border border-white/5 py-4 text-xs font-black text-white/80 hover:bg-white/5 transition-all">
              Voir tous les cousins (24)
            </button>
          </div>
        )}

        {/* Tab 3: BRANCHES (World Map & List) */}
        {activeTab === 'branches' && (
          <div className="space-y-6">
            
            {/* World Map Component */}
            <div className="relative rounded-3xl bg-[#0A1224] border border-white/5 p-4 overflow-hidden h-[300px] shadow-lg flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-black text-white">Branches familiales</h3>
                  <p className="text-[9px] font-bold text-white/40 mt-0.5">Pays et villes déclarés dans les fiches.</p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/40">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Stylized SVG Map */}
              <div className="relative w-full h-[180px] mt-2">
                <svg className="w-full h-full opacity-20 pointer-events-none" viewBox="0 0 1000 500">
                  <path fill="currentColor" className="text-white" d="M150,150 Q250,100 450,220 T750,180" stroke="none" fillRule="evenodd" />
                  <path fill="currentColor" className="text-white" d="M300,320 Q500,280 650,400 T850,350" stroke="none" fillRule="evenodd" />
                </svg>

                {/* Connection paths */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 500">
                  {/* Curved connecting line */}
                  <path d="M 500 180 Q 300 240 250 340 T 450 430" fill="none" stroke="#6C5CFF" strokeWidth="2" strokeDasharray="5 5" />
                  <path d="M 250 340 Q 320 280 800 250" fill="none" stroke="#00D26A" strokeWidth="2" strokeDasharray="3 3" />
                </svg>

                {/* Paris, France Pin */}
                <div className="absolute top-[25%] left-[48%] flex items-center gap-1.5 bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 px-2 py-1 rounded-full backdrop-blur-sm">
                  <div className="flex -space-x-1">
                    <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=40&h=40&q=80" alt="" className="h-4 w-4 rounded-full border border-[#0A1224] object-cover" />
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=40&h=40&q=80" alt="" className="h-4 w-4 rounded-full border border-[#0A1224] object-cover" />
                  </div>
                  <span className="text-[7px] font-black text-white">Paris, France</span>
                </div>

                {/* Dakar, Sénégal Pin */}
                <div className="absolute top-[65%] left-[20%] flex items-center gap-1.5 bg-[#00D26A]/15 border border-[#00D26A]/30 px-2 py-1 rounded-full backdrop-blur-sm">
                  <div className="flex -space-x-1">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=40&h=40&q=80" alt="" className="h-4 w-4 rounded-full border border-[#0A1224] object-cover" />
                    <img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=40&h=40&q=80" alt="" className="h-4 w-4 rounded-full border border-[#0A1224] object-cover" />
                  </div>
                  <span className="text-[7px] font-black text-white">Dakar, Sénégal</span>
                </div>

                {/* New York, USA Pin */}
                <div className="absolute top-[42%] left-[76%] flex items-center gap-1.5 bg-[#00A3FF]/15 border border-[#00A3FF]/30 px-2 py-1 rounded-full backdrop-blur-sm">
                  <img src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=40&h=40&q=80" alt="" className="h-4 w-4 rounded-full border border-[#0A1224] object-cover" />
                  <span className="text-[7px] font-black text-white">New York, USA</span>
                </div>

                {/* Abidjan, Côte d'Ivoire Pin */}
                <div className="absolute top-[80%] left-[40%] flex items-center gap-1.5 bg-[#FF7A1A]/15 border border-[#FF7A1A]/30 px-2 py-1 rounded-full backdrop-blur-sm">
                  <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=40&h=40&q=80" alt="" className="h-4 w-4 rounded-full border border-[#0A1224] object-cover" />
                  <span className="text-[7px] font-black text-white">Abidjan, Côte d'Ivoire</span>
                </div>
              </div>
            </div>

            {/* Branches List */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white/90">Liste des branches</h3>
              
              <div className="rounded-3xl bg-[#0A1224] border border-white/5 p-4 space-y-3.5 shadow-lg">
                {/* Branch 1 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6C5CFF]/10 text-[#6C5CFF]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Famille Mamadou (Vous)</h4>
                      <p className="text-[9px] font-bold text-white/40 mt-0.5">Paris, France · 12 membres</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-[#6C5CFF] uppercase bg-[#6C5CFF]/10 px-2 py-1 rounded-full">Chef de famille</span>
                    <span className="text-white/20">&gt;</span>
                  </div>
                </div>

                {/* Branch 2 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00D26A]/10 text-[#00D26A]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Famille Ibrahima</h4>
                      <p className="text-[9px] font-bold text-white/40 mt-0.5">Dakar, Sénégal · 15 membres</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-[#00D26A] uppercase bg-[#00D26A]/10 px-2 py-1 rounded-full">Lié</span>
                    <span className="text-white/20">&gt;</span>
                  </div>
                </div>

                {/* Branch 3 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF7A1A]/10 text-[#FF7A1A]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Famille Moussa</h4>
                      <p className="text-[9px] font-bold text-white/40 mt-0.5">Abidjan, Côte d\'Ivoire · 9 membres</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-[#00D26A] uppercase bg-[#00D26A]/10 px-2 py-1 rounded-full">Lié</span>
                    <span className="text-white/20">&gt;</span>
                  </div>
                </div>

                {/* Branch 4 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00A3FF]/10 text-[#00A3FF]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Famille Awa</h4>
                      <p className="text-[9px] font-bold text-white/40 mt-0.5">New York, USA · 7 membres</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-[#FF9F1C] uppercase bg-[#FF9F1C]/10 px-2 py-1 rounded-full">En attente</span>
                    <span className="text-white/20">&gt;</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Button */}
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6C5CFF] py-4 text-sm font-black shadow-[0_4px_20px_rgba(108,92,255,0.25)]">
              <Plus className="h-4 w-4" /> Lier une nouvelle branche
            </button>
          </div>
        )}

        {/* Tab 4: CARTE */}
        {activeTab === 'carte' && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <Compass className="h-16 w-16 text-[#6C5CFF] animate-pulse" />
            <h3 className="text-lg font-black">Visualisation Cartographique</h3>
            <p className="text-xs text-white/40 max-w-xs">Découvrez la répartition géographique interactive de tous les membres de la famille.</p>
          </div>
        )}

      </main>

      {/* MEMBER DETAIL SHEET MODAL (Aïcha Diop) */}
      {selectedMember === '00000000-0000-0000-0000-000000000012' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          
          {/* Overlay switch control just for demonstration */}
          <div className="absolute top-4 right-4 z-50 flex bg-[#0A1224] rounded-full p-1 border border-white/10 gap-1">
            <button
              onClick={() => setProfileViewMode('drawer')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${profileViewMode === 'drawer' ? 'bg-[#6C5CFF] text-white' : 'text-white/40'}`}
            >
              Vue Tiroir
            </button>
            <button
              onClick={() => setProfileViewMode('full')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${profileViewMode === 'full' ? 'bg-[#6C5CFF] text-white' : 'text-white/40'}`}
            >
              Vue Complète
            </button>
          </div>

          {/* SCREEN 5: FULL MEMBER PROFILE SCREEN */}
          {profileViewMode === 'full' && (
            <div className="relative w-full max-w-lg h-[92vh] rounded-t-[36px] bg-[#050C1A] border-t border-white/10 overflow-y-auto px-5 py-6 pb-20 shadow-2xl scrollbar-hide">
              {/* Back Arrow & Menu */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5 text-white/80" />
                </button>
                <h3 className="text-sm font-black uppercase tracking-wider text-white/80">Profil de membre</h3>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                  <MoreHorizontal className="h-5 w-5 text-white/80" />
                </button>
              </div>

              {/* Avatar & Header */}
              <div className="flex flex-col items-center text-center mt-3">
                <div className="relative h-28 w-28 rounded-full p-1 bg-gradient-to-tr from-[#6C5CFF] to-[#C9C3FF] shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80"
                    alt="Aïcha Diop"
                    className="h-full w-full rounded-full object-cover border-2 border-[#050C1A]"
                  />
                </div>
                <h2 className="text-2xl font-black tracking-wide text-white mt-4">Aïcha Diop</h2>
                <span className="mt-1.5 rounded-full bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 px-4 py-1 text-[10px] font-black text-[#C9C3FF] uppercase tracking-wider">
                  Ma cousine
                </span>
                <p className="mt-3.5 text-[11px] font-bold text-white/56 leading-none">Née le 12 mai 2006 (18 ans)</p>
                <p className="mt-1.5 text-[11px] font-bold text-white/56 flex items-center justify-center gap-1">
                  🇫🇷 Paris, France
                </p>
              </div>

              {/* Action Buttons grid */}
              <div className="mt-6 grid grid-cols-4 gap-2.5">
                <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-2xl p-3 hover:bg-white/5 transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] mb-2">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-black text-white/60">Message</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-2xl p-3 hover:bg-white/5 transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] mb-2">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-black text-white/60">Appeler</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-2xl p-3 hover:bg-white/5 transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] mb-2">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-black text-white/60">Événement</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-2xl p-3 hover:bg-white/5 transition-all relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6C5CFF]/10 text-[#6C5CFF] mb-2">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-black text-white/60">Plus ⁵</span>
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="mt-7 flex justify-between gap-1 border-b border-white/5 pb-2">
                {['Infos', 'Famille', 'Médias', 'Liens'].map((subtab, sIdx) => (
                  <button
                    key={subtab}
                    className={`pb-1 text-xs font-black ${
                      sIdx === 0
                        ? 'text-[#6C5CFF] border-b-2 border-[#6C5CFF]'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {subtab}
                  </button>
                ))}
              </div>

              {/* About section */}
              <section className="mt-5 space-y-4">
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-widest">À propos</h4>
                
                <div className="rounded-3xl bg-[#0A1224] border border-white/5 p-4 space-y-3.5 shadow-lg">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/60">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-white/40 uppercase leading-none">Études</span>
                      <strong className="block text-[11px] font-black text-white mt-1 leading-none">Étudiante en médecine</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/60">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-white/40 uppercase leading-none">Langues</span>
                      <strong className="block text-[11px] font-black text-white mt-1 leading-none">Français, Wolof, Anglais</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/60">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-white/40 uppercase leading-none">Centres d'intérêt</span>
                      <strong className="block text-[11px] font-black text-white mt-1 leading-none">Lecture, Voyage, Cuisine</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Family section */}
              <section className="mt-6 space-y-4">
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-widest">Famille</h4>

                <div className="rounded-3xl bg-[#0A1224] border border-white/5 p-4 space-y-3.5 shadow-lg">
                  {/* Father Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=80&h=80&q=80" alt="" className="h-8 w-8 rounded-full object-cover border border-white/10" />
                      <div>
                        <span className="block text-[9px] font-semibold text-white/40 leading-none">Père</span>
                        <strong className="block text-xs font-black text-white mt-1 leading-none">Mamadou Diop</strong>
                      </div>
                    </div>
                    <span className="text-white/20 text-xs">&gt;</span>
                  </div>

                  {/* Mother Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80" alt="" className="h-8 w-8 rounded-full object-cover border border-white/10" />
                      <div>
                        <span className="block text-[9px] font-semibold text-white/40 leading-none">Mère</span>
                        <strong className="block text-xs font-black text-white mt-1 leading-none">Fatou Diop</strong>
                      </div>
                    </div>
                    <span className="text-white/20 text-xs">&gt;</span>
                  </div>

                  {/* Siblings Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80" alt="" className="h-8 w-8 rounded-full object-cover border-2 border-[#0A1224]" />
                        <img src="https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=80&h=80&q=80" alt="" className="h-8 w-8 rounded-full object-cover border-2 border-[#0A1224]" />
                      </div>
                      <div>
                        <span className="block text-[9px] font-semibold text-white/40 leading-none">Frères & Sœurs</span>
                        <strong className="block text-xs font-black text-white mt-1 leading-none">2 frères, 1 sœur</strong>
                      </div>
                    </div>
                    <span className="text-white/20 text-xs">&gt;</span>
                  </div>
                </div>
              </section>

              {/* Events section */}
              <section className="mt-6 space-y-4">
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-widest">Événements à venir</h4>

                <div className="rounded-3xl bg-[#0A1224] border border-white/5 p-4 space-y-3.5 shadow-lg">
                  {/* Event 1 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🎂</span>
                      <div>
                        <strong className="block text-xs font-black text-white leading-none">Anniversaire</strong>
                        <span className="text-[9px] font-bold text-white/40 mt-1 block">12 mai 2025</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#FF4D6D]/12 border border-[#FF4D6D]/20 px-3 py-1 text-[9px] font-black text-[#FF4D6D]">
                      J-45
                    </span>
                  </div>

                  {/* Event 2 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">💍</span>
                      <div>
                        <strong className="block text-xs font-black text-white leading-none">Mariage de Fatou</strong>
                        <span className="text-[9px] font-bold text-white/40 mt-1 block">20 déc. 2025</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#6C5CFF]/12 border border-[#6C5CFF]/20 px-3 py-1 text-[9px] font-black text-[#C9C3FF]">
                      J-267
                    </span>
                  </div>
                </div>
              </section>

              {/* Shared Albums Section */}
              <section className="mt-6 space-y-4">
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-widest">Albums partagés</h4>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <div className="h-16 w-20 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                    <img src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=120&h=90&q=80" alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="h-16 w-20 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                    <img src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=120&h=90&q=80" alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="h-16 w-20 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                    <img src="https://images.unsplash.com/photo-1542241647-9cbb2225278b?auto=format&fit=crop&w=120&h=90&q=80" alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="h-16 w-20 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                    <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=90&q=80" alt="" className="h-full w-full object-cover" />
                  </div>
                  {/* +12 Box */}
                  <div className="h-16 w-20 rounded-2xl bg-[#0D182E] border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-white/50">+12</span>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* SCREEN 4: SIDEBAR DRAWER OVERLAY */}
          {profileViewMode === 'drawer' && (
            <div className="relative w-full max-w-sm h-[88vh] rounded-t-[36px] bg-[#050C1A] border-t border-white/15 overflow-hidden flex flex-row shadow-2xl">
              
              {/* Vertical Sidebar Navigation menu */}
              <div className="w-[84px] bg-[#030914] border-r border-white/5 py-6 flex flex-col items-center justify-between">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 text-white/60" strokeWidth={3} />
                </button>

                <div className="flex flex-col gap-4 mt-6">
                  {['Infos', 'Famille', 'Liens', 'Photos'].map((menu, mIdx) => (
                    <button
                      key={menu}
                      className={`text-[9px] font-black uppercase tracking-wider py-2.5 px-1.5 rounded-xl transition-all ${
                        mIdx === 0
                          ? 'bg-[#6C5CFF]/15 text-[#C9C3FF] border border-[#6C5CFF]/30 font-black'
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      {menu}
                    </button>
                  ))}
                </div>

                <div className="h-10"></div>
              </div>

              {/* Main Content Area in Drawer */}
              <div className="flex-1 overflow-y-auto px-5 py-6 pb-20 scrollbar-hide space-y-6">
                
                {/* Hero profile inside drawer */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-24 w-24 rounded-full p-1 bg-gradient-to-tr from-[#6C5CFF] to-[#C9C3FF] shadow-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80"
                      alt="Aïcha Diop"
                      className="h-full w-full rounded-full object-cover border-2 border-[#050C1A]"
                    />
                  </div>
                  <h2 className="text-xl font-black tracking-wide text-white mt-3.5">Aïcha Diop</h2>
                  <span className="mt-1 rounded-full bg-[#6C5CFF]/15 border border-[#6C5CFF]/30 px-3 py-0.5 text-[8px] font-black text-[#C9C3FF] uppercase tracking-wider">
                    Ma cousine
                  </span>
                  <p className="mt-3 text-[10px] font-bold text-white/56">Née le 12 mai 2006 (18 ans)</p>
                  <p className="mt-1 text-[10px] font-bold text-white/56">🇫🇷 Paris, France</p>
                </div>

                {/* Vertical quick actions */}
                <div className="grid grid-cols-4 gap-2">
                  <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-xl p-2">
                    <MessageSquare className="h-3.5 w-3.5 text-[#6C5CFF] mb-1.5" />
                    <span className="text-[7px] font-black text-white/40">Message</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-xl p-2">
                    <Phone className="h-3.5 w-3.5 text-[#6C5CFF] mb-1.5" />
                    <span className="text-[7px] font-black text-white/40">Appeler</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-xl p-2">
                    <Calendar className="h-3.5 w-3.5 text-[#6C5CFF] mb-1.5" />
                    <span className="text-[7px] font-black text-white/40">Événement</span>
                  </button>
                  <button className="flex flex-col items-center justify-center bg-[#0D182E] border border-white/5 rounded-xl p-2">
                    <Plus className="h-3.5 w-3.5 text-[#6C5CFF] mb-1.5" />
                    <span className="text-[7px] font-black text-white/40">Plus ⁵</span>
                  </button>
                </div>

                {/* About list details in Drawer */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">À propos</h4>
                  <div className="rounded-2xl bg-[#0A1224] border border-white/5 p-3 space-y-3.5">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-4 w-4 text-white/40" />
                      <div>
                        <span className="block text-[7px] font-bold text-white/40 uppercase">Études</span>
                        <strong className="block text-[10px] font-black text-white">Étudiante en médecine</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-white/40" />
                      <div>
                        <span className="block text-[7px] font-bold text-white/40 uppercase">Langues</span>
                        <strong className="block text-[10px] font-black text-white">Français, Wolof, Anglais</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Family list details in Drawer */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Famille proche</h4>
                  <div className="rounded-2xl bg-[#0A1224] border border-white/5 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=80&h=80&q=80" alt="" className="h-6 w-6 rounded-full object-cover" />
                        <span className="text-[10px] text-white/40">Père</span>
                        <strong className="text-[10px] font-black text-white">Mamadou Diop</strong>
                      </div>
                      <span className="text-white/20 text-xs">&gt;</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80" alt="" className="h-6 w-6 rounded-full object-cover" />
                        <span className="text-[10px] text-white/40">Mère</span>
                        <strong className="text-[10px] font-black text-white">Fatou Diop</strong>
                      </div>
                      <span className="text-white/20 text-xs">&gt;</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
