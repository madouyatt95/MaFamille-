import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair } from 'lucide-react';
import type { Member } from '../types';

interface FamilyMapProps {
  members: Member[];
  activeMemberId: string;
}

// Composant pour recentrer la carte sur la position actuelle
const CenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
};

export const FamilyMap: React.FC<FamilyMapProps> = ({ members, activeMemberId }) => {
  // Coordonnées par défaut (Paris)
  const [position, setPosition] = useState<[number, number]>([48.8566, 2.3522]);
  const [loadingLoc, setLoadingLoc] = useState(true);

  useEffect(() => {
    // Demander la vraie géolocalisation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setLoadingLoc(false);
        },
        (err) => {
          console.error("Erreur de géolocalisation :", err);
          setLoadingLoc(false); // On garde la position par défaut
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLoadingLoc(false);
    }
  }, []);

  // Création d'une icône de marqueur personnalisée avec l'avatar
  const createCustomIcon = (member: Member, isMe: boolean) => {
    return L.divIcon({
      className: 'custom-avatar-marker',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute; 
            width: 100%; 
            height: 100%; 
            border-radius: 50%; 
            background: ${isMe ? '#00D26A' : '#6C5CFF'}; 
            opacity: 0.3; 
            animation: ${isMe ? 'pulse 2s infinite' : 'none'};
          "></div>
          <img 
            src="${member.photoUrl}" 
            style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              border: 3px solid ${isMe ? '#00D26A' : '#6C5CFF'}; 
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

  // Simuler les positions des autres membres autour de la position actuelle
  const simulatedPositions = members.map((m, idx) => {
    const isMe = m.id === activeMemberId;
    // Décalage aléatoire fixe pour les autres membres
    const offsetLat = isMe ? 0 : (idx % 2 === 0 ? 0.005 : -0.003) * (idx + 1);
    const offsetLng = isMe ? 0 : (idx % 3 === 0 ? -0.004 : 0.006) * (idx + 1);
    
    return {
      ...m,
      isMe,
      pos: [position[0] + offsetLat, position[1] + offsetLng] as [number, number],
      status: isMe ? 'Actif maintenant' : idx === 1 ? 'À l\'école' : idx === 2 ? 'Au bureau' : 'En déplacement'
    };
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#07111F] text-white overflow-hidden relative">
      {/* En-tête */}
      <div className="px-6 pt-10 pb-4 shrink-0 relative z-20 bg-gradient-to-b from-[#07111F] to-transparent">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <span>📍 Carte Familiale</span>
        </h1>
        <p className="text-white/60 text-sm mt-1">Localisation en direct sécurisée</p>
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
              }
            );
          }
        }}
        className="absolute bottom-6 right-4 z-20 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg hover:bg-white/20 transition-all text-white active:scale-95"
      >
        <Crosshair className={`w-6 h-6 ${loadingLoc ? 'animate-spin' : ''}`} />
      </button>

      {/* Conteneur de la Carte Leaflet */}
      <div className="flex-1 w-full relative z-10 rounded-t-[32px] overflow-hidden border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* Style global pour les animations CSS ajoutées */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          .leaflet-container { background: #0f172a; font-family: inherit; }
          .leaflet-popup-content-wrapper { background: #112240; color: white; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
          .leaflet-popup-tip { background: #112240; }
          .leaflet-popup-content { margin: 12px; }
        `}} />

        <MapContainer 
          center={position} 
          zoom={13} 
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <CenterMap center={position} />

          {simulatedPositions.map((m) => (
            <Marker key={m.id} position={m.pos} icon={createCustomIcon(m as Member, m.isMe)}>
              <Popup closeButton={false}>
                <div className="text-center">
                  <h3 className="font-bold text-sm text-white">{m.name}</h3>
                  <p className="text-[10px] text-white/50">{m.status}</p>
                  <p className="text-[9px] text-[#00D26A] mt-1 font-bold">Mise à jour: à l'instant</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
