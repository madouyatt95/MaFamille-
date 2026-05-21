import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Navigation } from 'lucide-react';
import type { Member } from '../types';

interface FamilyMapProps {
  members: Member[];
  activeMemberId: string;
  onUpdateMemberProfile?: (memberId: string, updates: any) => Promise<void>;
}

// Composant pour recentrer la carte sur la position actuelle
const CenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
};

export const FamilyMap: React.FC<FamilyMapProps> = ({ members, activeMemberId, onUpdateMemberProfile }) => {
  // Coordonnées par défaut (Paris)
  const [position, setPosition] = useState<[number, number]>([48.8566, 2.3522]);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('Actif maintenant');

  const me = members.find(m => m.id === activeMemberId);

  useEffect(() => {
    if (me && me.locationStatus) {
      setSelectedStatus(me.locationStatus);
    }
  }, [me]);

  useEffect(() => {
    // Demander la vraie géolocalisation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          setLoadingLoc(false);

          // Pousser la position en BDD si disponible
          if (onUpdateMemberProfile) {
            onUpdateMemberProfile(activeMemberId, {
              latitude: lat,
              longitude: lng,
              lastLocatedAt: new Date().toISOString()
            });
          }
        },
        (err) => {
          console.error("Erreur de géolocalisation :", err);
          setLoadingLoc(false);
          // Si le profil a déjà des coordonnées, recentrer dessus
          if (me && me.latitude && me.longitude) {
            setPosition([Number(me.latitude), Number(me.longitude)]);
          }
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLoadingLoc(false);
    }
  }, [activeMemberId]);

  // Création d'une icône de marqueur personnalisée avec l'avatar
  const createCustomIcon = (member: Member, isMe: boolean) => {
    const color = isMe ? '#00D26A' : '#6C5CFF';
    return L.divIcon({
      className: 'custom-avatar-marker',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute; 
            width: 100%; 
            height: 100%; 
            border-radius: 50%; 
            background: ${color}; 
            opacity: 0.3; 
            animation: ${isMe ? 'pulse 2s infinite' : 'none'};
          "></div>
          <img 
            src="${member.photoUrl}" 
            style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              border: 3px solid ${color}; 
              object-fit: cover; 
              z-index: 10;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            " 
          />
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  };

  const handleStatusChange = async (status: string) => {
    setSelectedStatus(status);
    if (onUpdateMemberProfile) {
      await onUpdateMemberProfile(activeMemberId, {
        latitude: position[0],
        longitude: position[1],
        locationStatus: status,
        lastLocatedAt: new Date().toISOString()
      });
    }
  };

  // Positions réelles ou simulées autour de la position actuelle
  const mappedMembers = members.map((m, idx) => {
    const isMe = m.id === activeMemberId;
    const hasCoords = m.latitude !== undefined && m.latitude !== null && 
                      m.longitude !== undefined && m.longitude !== null;
    
    let lat = position[0];
    let lng = position[1];

    if (!isMe) {
      if (hasCoords) {
        lat = Number(m.latitude);
        lng = Number(m.longitude);
      } else {
        // Décalage fixe basé sur l'index
        const offsetLat = (idx % 2 === 0 ? 0.0035 : -0.0025) * (idx + 1);
        const offsetLng = (idx % 3 === 0 ? -0.003 : 0.0045) * (idx + 1);
        lat = position[0] + offsetLat;
        lng = position[1] + offsetLng;
      }
    }

    const status = isMe ? selectedStatus : m.locationStatus || (idx === 1 ? '🏫 À l\'école' : idx === 2 ? '💼 Au bureau' : '🚗 En déplacement');
    const lastUpdate = m.lastLocatedAt ? new Date(m.lastLocatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : "à l'instant";

    return {
      ...m,
      isMe,
      pos: [lat, lng] as [number, number],
      status,
      lastUpdate
    };
  });

  const statuses = [
    { label: '🏠 Maison', value: '🏠 À la maison' },
    { label: '🏫 École', value: '🏫 À l\'école' },
    { label: '💼 Bureau', value: '💼 Au bureau' },
    { label: '🚗 Trajet', value: '🚗 En déplacement' },
    { label: '🚨 Urgence', value: '🚨 Urgence' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#07111F] text-white overflow-hidden relative">
      {/* En-tête */}
      <div className="px-6 pt-8 pb-3 shrink-0 relative z-20 bg-gradient-to-b from-[#07111F] to-transparent">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <span>📍 Carte Familiale</span>
        </h1>
        <p className="text-white/60 text-sm mt-1">Localisation en direct sécurisée</p>
      </div>

      {/* Conteneur de la Carte Leaflet */}
      <div className="flex-1 w-full relative z-10 rounded-t-[32px] overflow-hidden border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-end">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .leaflet-container { background: #07111F; font-family: inherit; }
          .leaflet-popup-content-wrapper { background: #112240; color: white; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
          .leaflet-popup-tip { background: #112240; }
          .leaflet-popup-content { margin: 12px; }
        `}} />

        <div className="absolute inset-0 z-0">
          <MapContainer 
            center={position} 
            zoom={14} 
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            <CenterMap center={position} />

            {mappedMembers.map((m) => (
              <Marker key={m.id} position={m.pos} icon={createCustomIcon(m as Member, m.isMe)}>
                <Popup closeButton={false}>
                  <div className="text-center min-w-[120px]">
                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                      <span className="font-extrabold text-sm text-white">{m.name}</span>
                      {m.isMe && <span className="bg-[#00D26A]/20 text-[#00D26A] text-[9px] px-1.5 py-0.5 rounded-full font-bold">Moi</span>}
                    </div>
                    <p className="text-xs text-white/80 font-medium bg-white/5 py-1 px-2 rounded-lg inline-block border border-white/5">{m.status}</p>
                    <p className="text-[9px] text-[#00D26A] mt-1.5 font-semibold flex items-center justify-center">
                      <span className="inline-block w-1.5 height-1.5 bg-[#00D26A] rounded-full mr-1 animate-pulse"></span>
                      Mis à jour: {m.lastUpdate}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Bouton de centrage manuel */}
        <button 
          onClick={() => {
            if (navigator.geolocation) {
              setLoadingLoc(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setPosition([pos.coords.latitude, pos.coords.longitude]);
                  setLoadingLoc(false);
                },
                (err) => {
                  console.error(err);
                  setLoadingLoc(false);
                }
              );
            }
          }}
          className="absolute top-4 right-4 z-20 p-3.5 bg-[#0F1E36]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl hover:bg-[#162C4E] transition-all text-white active:scale-95 flex items-center justify-center"
        >
          <Crosshair className={`w-5 h-5 ${loadingLoc ? 'animate-spin text-[#00D26A]' : 'text-white'}`} />
        </button>

        {/* Panneau de Contrôle Inférieur (Statuts Rapides) */}
        <div className="relative z-20 px-4 pb-6 pt-4 bg-gradient-to-t from-[#07111F] via-[#07111F]/95 to-transparent">
          <div className="bg-[#0F1E36]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center space-x-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#6C5CFF]" />
                <span>Mon statut en direct</span>
              </span>
              <span className="text-[10px] text-[#00D26A] font-bold bg-[#00D26A]/10 px-2 py-0.5 rounded-full border border-[#00D26A]/20">
                Géopartage actif
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {statuses.map((s) => {
                const isActive = selectedStatus === s.value;
                const isUrgent = s.value === '🚨 Urgence';
                
                return (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center space-y-1 active:scale-95 border ${
                      isActive
                        ? isUrgent
                          ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/30 font-black'
                          : 'bg-gradient-to-r from-[#00D26A] to-[#00F5A0] border-[#00D26A] text-[#07111F] shadow-lg shadow-[#00D26A]/20 font-black'
                        : isUrgent
                        ? 'bg-transparent border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/10'
                        : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{s.label.split(' ')[0]}</span>
                    <span className="scale-90 font-semibold">{s.label.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
