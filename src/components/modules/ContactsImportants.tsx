import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  MessageSquare, 
  MapPin, 
  Plus, 
  Trash2, 
  Search, 
  Users,
  ShieldAlert,
  HeartPulse,
  GraduationCap,
  Home,
  Wrench,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export interface ImportantContact {
  id: string;
  name: string;
  category: 'family' | 'emergency' | 'doctor' | 'school' | 'neighbor' | 'artisan' | 'other';
  role?: string;
  phone: string;
  sms?: string;
  whatsapp?: string;
  address?: string;
  isUrgent: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: Users, color: 'text-[#6C5CFF]' },
  { id: 'emergency', label: '🚨 Urgences', icon: ShieldAlert, color: 'text-red-500' },
  { id: 'family', label: '👨‍👩‍👧 Famille', icon: Users, color: 'text-[#4F8CFF]' },
  { id: 'doctor', label: '🩺 Médecins', icon: HeartPulse, color: 'text-[#00D26A]' },
  { id: 'school', label: '🏫 Écoles', icon: GraduationCap, color: 'text-[#FFB020]' },
  { id: 'neighbor', label: '🏡 Voisins', icon: Home, color: 'text-[#FF4D6D]' },
  { id: 'artisan', label: '🛠️ Artisans', icon: Wrench, color: 'text-amber-500' },
  { id: 'other', label: '💡 Autres', icon: HelpCircle, color: 'text-slate-400' }
];

export const ContactsImportants: React.FC = () => {
  const [contacts, setContacts] = useState<ImportantContact[]>(() => {
    const saved = localStorage.getItem('mf_important_contacts');
    if (saved) return JSON.parse(saved);
    const isCloud = !!localStorage.getItem('mf_cloud_foyer_id');
    if (isCloud) return [];
    
    // Contacts par défaut hyper-immersifs
    return [
      {
        id: 'c1',
        name: 'SAMU (Urgences Médicales)',
        category: 'emergency',
        role: 'Médecine d\'urgence nationale',
        phone: '15',
        isUrgent: true
      },
      {
        id: 'c2',
        name: 'Sapeurs-Pompiers',
        category: 'emergency',
        role: 'Incendies, secours routiers',
        phone: '18',
        isUrgent: true
      },
      {
        id: 'c3',
        name: 'Police Secours',
        category: 'emergency',
        role: 'Sécurité et ordre public',
        phone: '17',
        isUrgent: true
      },
      {
        id: 'c4',
        name: 'Dr. Martin (Pédiatre)',
        category: 'doctor',
        role: 'Pédiatre des enfants',
        phone: '+33612345678',
        sms: '+33612345678',
        whatsapp: '+33612345678',
        address: '12 Avenue Foch, Paris',
        isUrgent: true
      },
      {
        id: 'c5',
        name: 'Mme. Mercier (Enseignante Awa)',
        category: 'school',
        role: 'Professeur principal Collège',
        phone: '+33698765432',
        sms: '+33698765432',
        address: 'Collège de la Fontaine, Paris',
        isUrgent: false
      },
      {
        id: 'c6',
        name: 'Marc (Voisin de palier)',
        category: 'neighbor',
        role: 'Garde les doubles de clés',
        phone: '+33655501928',
        sms: '+33655501928',
        whatsapp: '+33655501928',
        isUrgent: false
      },
      {
        id: 'c7',
        name: 'Plombier Express Dépannage',
        category: 'artisan',
        role: 'Fuites d\'eau et urgences maison',
        phone: '+33140506070',
        address: '4 Rue St. Charles, Paris',
        isUrgent: false
      }
    ];
  });

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCategory, setNewCategory] = useState<'family' | 'emergency' | 'doctor' | 'school' | 'neighbor' | 'artisan' | 'other'>('family');
  const [newPhone, setNewPhone] = useState('');
  const [newSms, setNewSms] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newIsUrgent, setNewIsUrgent] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mf_important_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Filtrage intelligent
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesCategory = activeTab === 'all' || c.category === activeTab;
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.role && c.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            c.phone.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [contacts, activeTab, searchQuery]);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const contact: ImportantContact = {
      id: `contact-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || undefined,
      category: newCategory,
      phone: newPhone.trim(),
      sms: newSms.trim() || undefined,
      whatsapp: newWhatsapp.trim() || undefined,
      address: newAddress.trim() || undefined,
      isUrgent: newIsUrgent
    };

    setContacts(prev => [...prev, contact]);
    setShowAddForm(false);

    // Reset
    setNewName('');
    setNewRole('');
    setNewCategory('family');
    setNewPhone('');
    setNewSms('');
    setNewWhatsapp('');
    setNewAddress('');
    setNewIsUrgent(false);
  };

  const handleDeleteContact = (id: string, name: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le contact "${name}" ?`)) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight">Répertoire Important</h2>
          <p className="text-xs text-white/50 font-medium">Numéros utiles & d'urgence de la famille</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-3 rounded-2xl bg-[#6C5CFF] text-white hover:opacity-90 transition-all cursor-pointer shadow-md shadow-[#6C5CFF]/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Formulaire d'ajout rapide */}
      {showAddForm && (
        <form onSubmit={handleAddContact} className="glass-panel border-white/8 rounded-[28px] p-5 space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ajouter un contact important</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 font-bold">Nom complet *</label>
              <input 
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: Dr. Dupont..."
                className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-white/50 font-bold">Rôle / Relation</label>
              <input 
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="ex: Dentiste, Oncle..."
                className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 font-bold">Téléphone *</label>
              <input 
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="ex: +336..."
                className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-white/50 font-bold">Catégorie</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-[#0D1B2A] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6C5CFF]"
              >
                <option value="emergency">🚨 Urgence</option>
                <option value="family">👨‍👩‍👧 Famille</option>
                <option value="doctor">🩺 Médecin</option>
                <option value="school">🏫 École</option>
                <option value="neighbor">🏡 Voisin / Proche</option>
                <option value="artisan">🛠️ Artisan / Dépannage</option>
                <option value="other">💡 Autre</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-white/50 font-bold">Mobile (pour SMS)</label>
              <input 
                type="tel"
                value={newSms}
                onChange={(e) => setNewSms(e.target.value)}
                placeholder="Optionnel"
                className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-white/50 font-bold">WhatsApp</label>
              <input 
                type="tel"
                value={newWhatsapp}
                onChange={(e) => setNewWhatsapp(e.target.value)}
                placeholder="Optionnel"
                className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-white/50 font-bold">Adresse postale (Itinéraire)</label>
            <input 
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="ex: 12 Rue de la Paix, Paris"
              className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#6C5CFF]"
            />
          </div>

          <div className="flex items-center space-x-3 bg-white/3 p-3 rounded-xl border border-white/5">
            <input 
              type="checkbox"
              id="isUrgent"
              checked={newIsUrgent}
              onChange={(e) => setNewIsUrgent(e.target.checked)}
              className="w-4 h-4 rounded text-[#6C5CFF] focus:ring-0"
            />
            <label htmlFor="isUrgent" className="text-xs font-bold text-white select-none cursor-pointer flex items-center space-x-1">
              <span>🚨 Afficher dans l'Overlay SOS d'urgence global</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-3 rounded-xl bg-white/5 text-white border border-white/8 text-xs font-bold cursor-pointer hover:bg-white/10"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-[#6C5CFF] text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, rôle, téléphone..."
          className="w-full bg-white/5 border border-white/8 rounded-[20px] pl-10 pr-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#6C5CFF] font-sans font-medium"
        />
      </div>

      {/* Tabs Catégories Horizontales */}
      <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar px-0.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'bg-[#6C5CFF]/15 border-[#6C5CFF] text-white shadow-sm' 
                  : 'bg-white/3 border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contacts List */}
      <div className="space-y-3">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 glass-panel border-white/5 rounded-3xl">
            <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/40 italic">Aucun contact correspondant.</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div 
              key={contact.id}
              className="glass-panel border-white/6 rounded-[28px] p-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-all"
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div className={`p-2.5 rounded-xl bg-white/5 border border-white/5 ${contact.isUrgent ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-[#6C5CFF]'}`}>
                  {contact.isUrgent ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Users className="w-5 h-5" />}
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">{contact.name}</h4>
                    {contact.isUrgent && (
                      <span className="text-[7.5px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full tracking-wider animate-pulse">
                        SOS
                      </span>
                    )}
                  </div>
                  
                  {contact.role && (
                    <p className="text-[10px] text-white/40 font-semibold">{contact.role}</p>
                  )}
                  
                  <p className="text-[10px] text-[#4F8CFF] font-mono font-medium mt-1">{contact.phone}</p>
                  
                  {contact.address && (
                    <div className="flex items-center space-x-1 text-[9.5px] text-white/40 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-red-400" />
                      <span>{contact.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions directes natives */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Appel */}
                <a
                  href={`tel:${contact.phone}`}
                  className="p-2.5 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] hover:bg-[#00D26A]/20 active:scale-90 transition-all cursor-pointer"
                  title="Appeler"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>

                {/* SMS */}
                {contact.sms && (
                  <a
                    href={`sms:${contact.sms}`}
                    className="p-2.5 rounded-xl bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 text-[#4F8CFF] hover:bg-[#4F8CFF]/20 active:scale-90 transition-all cursor-pointer"
                    title="Envoyer un SMS"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* WhatsApp */}
                {contact.whatsapp && (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 active:scale-90 transition-all cursor-pointer"
                    title="WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Itinéraire routier direct */}
                {contact.address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(contact.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020] hover:bg-[#FFB020]/20 active:scale-90 transition-all cursor-pointer"
                    title="Itinéraire"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDeleteContact(contact.id, contact.name)}
                  className="p-2.5 rounded-xl bg-white/3 border border-white/5 text-white/30 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer active:scale-90"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
