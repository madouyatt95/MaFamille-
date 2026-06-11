import React, { useState } from 'react';
import { 
  Building2, 
  Info, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Calendar, 
  Newspaper, 
  Link2,
  ArrowLeft,
  BellRing
} from 'lucide-react';

interface CommuneHubProps {
  communeName: string;
  onBack?: () => void;
}

export const CommuneHub: React.FC<CommuneHubProps> = ({ communeName, onBack }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'waste' | 'info'>('news');
  const cleanName = communeName.trim() || 'Ma Commune';

  const defaultNews = [
    { id: 1, title: 'Budget Participatif 2026', desc: 'Proposez vos projets d\'aménagement pour notre ville ! Les votes sont ouverts jusqu\'au 30 juin.', date: '06 Juin 2026', type: 'Citoyenneté' },
    { id: 2, title: 'Inscriptions scolaires et périscolaires', desc: 'Pensez à inscrire vos enfants pour la rentrée de septembre. Les dossiers doivent être soumis sur le portail famille.', date: '02 Juin 2026', type: 'Éducation' },
    { id: 3, title: 'Travaux de voirie - Boulevard Jaurès', desc: 'Rénovation de la chaussée et création de pistes cyclables du 10 juin au 5 juillet. Des déviations seront mises en place.', date: '28 Mai 2026', type: 'Travaux' }
  ];

  const defaultEvents = [
    { id: 1, title: 'Fête de la Musique 🎸', desc: 'Scènes ouvertes et concerts gratuits sur la place de la Mairie.', date: '21 Juin 2026 à 18:00' },
    { id: 2, title: 'Cinéma en plein air 🎬', desc: 'Projection gratuite du film "Le Grand Bain" au parc municipal.', date: '05 Juillet 2026 à 21:30' },
    { id: 3, title: 'Marché des créateurs locaux 🎨', desc: 'Rencontrez nos artisans d\'art au gymnase du centre.', date: '14 Juin 2026 à 09:00' }
  ];

  const wasteSchedules = [
    { id: 'ordinary', type: 'Ordures ménagères (Bac Marron)', frequency: 'Lundi & Jeudi matin', color: 'border-amber-700 bg-amber-700/5 text-amber-500' },
    { id: 'recycling', type: 'Tri sélectif (Bac Jaune)', frequency: 'Mercredi matin', color: 'border-yellow-500 bg-yellow-500/5 text-yellow-500' },
    { id: 'glass', type: 'Bornes d\'apport volontaire (Verre)', frequency: 'En continu', color: 'border-emerald-500 bg-emerald-500/5 text-emerald-500' },
    { id: 'green', type: 'Déchets verts / Jardinage', frequency: 'Mardi (Semaines paires)', color: 'border-green-600 bg-green-600/5 text-green-500' }
  ];

  const townHallContacts = {
    phone: '01 39 30 11 11',
    email: `contact@mairie-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.fr`,
    address: 'Place de l\'Hôtel de Ville, 95220 ' + cleanName,
    hours: [
      { days: 'Lundi au Vendredi', time: '8h30 - 12h00, 13h30 - 17h30' },
      { days: 'Samedi (Accueil uniquement)', time: '9h00 - 12h00' }
    ]
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-32 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] px-4 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all cursor-pointer mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-3 rounded-2xl bg-[#FF9F1C]/10 border border-[#FF9F1C]/20 text-[#FF9F1C]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Mairie de {cleanName}</h2>
            <p className="text-xs text-white/50">Portail communal et informations citoyennes</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#07111F]/60 p-1 rounded-2xl border border-white/5 grid grid-cols-3 gap-1">
        <button
          onClick={() => setActiveTab('news')}
          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'news' 
              ? 'bg-[#FF9F1C] text-[#07111F] shadow-md font-black' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Actualités & Événements
        </button>
        <button
          onClick={() => setActiveTab('waste')}
          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'waste' 
              ? 'bg-[#FF9F1C] text-[#07111F] shadow-md font-black' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Gestion Déchets
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'info' 
              ? 'bg-[#FF9F1C] text-[#07111F] shadow-md font-black' 
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Pratique & Mairie
        </button>
      </div>

      {/* News and Events Tab */}
      {activeTab === 'news' && (
        <div className="space-y-5">
          {/* News List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center space-x-1.5 px-1">
              <Newspaper className="w-4 h-4 text-[#FF9F1C]" />
              <span>Dernières Actualités</span>
            </h3>
            
            <div className="space-y-3">
              {defaultNews.map((news) => (
                <div key={news.id} className="glass-panel rounded-[24px] border border-white/8 p-5 space-y-2 text-left relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-[#FF9F1C] bg-[#FF9F1C]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {news.type}
                    </span>
                    <span className="text-[9px] text-white/30 font-bold">{news.date}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white">{news.title}</h4>
                  <p className="text-xs text-white/60 leading-relaxed">{news.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center space-x-1.5 px-1">
              <Calendar className="w-4 h-4 text-[#FF9F1C]" />
              <span>Agenda de la ville</span>
            </h3>

            <div className="space-y-2.5">
              {defaultEvents.map((evt) => (
                <div key={evt.id} className="p-4 rounded-[22px] bg-white/3 border border-white/5 flex items-start space-x-3 text-left">
                  <div className="p-2.5 rounded-xl bg-[#FF9F1C]/10 text-[#FF9F1C] border border-[#FF9F1C]/20 shrink-0">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{evt.title}</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">{evt.desc}</p>
                    <span className="inline-block mt-2 text-[9px] font-black text-[#FF9F1C] bg-[#FF9F1C]/10 px-2 py-0.5 rounded-md">
                      🕒 {evt.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waste Tab */}
      {activeTab === 'waste' && (
        <div className="space-y-5">
          <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3 text-left">
            <div className="flex items-center space-x-2 text-[#FF9F1C]">
              <Info className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Consignes de ramassage</h4>
            </div>
            <p className="text-xs text-white/50 leading-relaxed font-medium">
              Veuillez sortir vos conteneurs la veille au soir du ramassage à partir de 19h00 et les rentrer dès que possible après le passage des camions.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Calendrier des collectes</h3>
            <div className="grid grid-cols-1 gap-3">
              {wasteSchedules.map((schedule) => (
                <div key={schedule.id} className={`p-4 rounded-[24px] border ${schedule.color} flex items-center justify-between text-left`}>
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-white">{schedule.type}</h4>
                    <p className="text-xs opacity-70 font-semibold">{schedule.frequency}</p>
                  </div>
                  <span className="text-xl">🗑️</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Townhall Tab */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          {/* Main Info */}
          <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 text-left">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">
              Coordonnées de l'Hôtel de Ville
            </h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-xs">
                <MapPin className="w-4 h-4 text-[#FF9F1C] shrink-0" />
                <span className="text-white/80 font-medium">{townHallContacts.address}</span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <Phone className="w-4 h-4 text-[#FF9F1C] shrink-0" />
                <a href={`tel:${townHallContacts.phone}`} className="text-white/80 hover:text-[#FF9F1C] transition-colors font-bold underline">
                  {townHallContacts.phone}
                </a>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <Mail className="w-4 h-4 text-[#FF9F1C] shrink-0" />
                <a href={`mailto:${townHallContacts.email}`} className="text-white/80 hover:text-[#FF9F1C] transition-colors font-bold truncate">
                  {townHallContacts.email}
                </a>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-3.5 text-left">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#FF9F1C]" />
              <span>Horaires d'ouverture</span>
            </h3>

            <div className="space-y-2.5">
              {townHallContacts.hours.map((h, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="font-bold text-white/80">{h.days}</span>
                  <span className="font-extrabold text-[#FF9F1C]">{h.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fast Links */}
          <div className="p-5 rounded-[28px] bg-[#FF9F1C]/5 border border-[#FF9F1C]/15 space-y-3.5 text-left">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-[#FF9F1C]" />
              <span>Démarches administratives en ligne</span>
            </h4>
            
            <div className="grid grid-cols-1 gap-2">
              {[
                { title: 'Demander un acte d\'état civil (naissance, mariage)', url: '#' },
                { title: 'Prendre RDV pour Passeport & CNI', url: '#' },
                { title: 'Paiement en ligne de la cantine / portail famille', url: '#' },
                { title: 'Signaler un problème sur la voirie municipale', url: '#' }
              ].map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => alert(`🔗 Ouverture du lien externe vers : ${link.title}`)}
                  className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/10 text-white font-bold text-[10.5px] transition-all text-left flex items-center justify-between cursor-pointer active:scale-98"
                >
                  <span>{link.title}</span>
                  <span className="text-[#FF9F1C] font-black">➔</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
