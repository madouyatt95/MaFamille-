import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Crosshair, 
  Navigation, 
  Search, 
  Map, 
  Layers, 
  Home as HomeIcon, 
  Briefcase, 
  GraduationCap, 
  Eye,
  EyeOff, 
  Route 
} from 'lucide-react';
import type { Member } from '../types';

interface FamilyMapProps {
  members: Member[];
  activeMemberId: string;
  onUpdateMemberProfile?: (memberId: string, updates: any) => Promise<void>;
}

// Haversine distance calculator in kilometers
const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getEstimatedTime = (distKm: number) => {
  if (distKm < 1) {
    const min = Math.round(distKm * 12);
    return `${min > 0 ? min : 1} min à pied 🚶`;
  } else {
    const min = Math.round((distKm / 40) * 60);
    return `${min > 0 ? min : 1} min en voiture 🚗`;
  }
};

// Component to programmatically re-center the map
const CenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
};

export const FamilyMap: React.FC<FamilyMapProps> = ({ members, activeMemberId, onUpdateMemberProfile }) => {
  // Default coordinates (Paris center)
  const [position, setPosition] = useState<[number, number]>([48.8566, 2.3522]);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('Actif maintenant');
  const [isSharing, setIsSharing] = useState<boolean>(() => localStorage.getItem('mf_share_location') !== 'false');
  
  // Layer style: 'dark' | 'satellite'
  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite'>('dark');
  
  // Nominatim Real Search Bar States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Dynamic route tracing states
  const [routeTarget, setRouteTarget] = useState<{
    name: string;
    coords: [number, number];
  } | null>(null);

  // iOS-style bottom sheet state: 'collapsed' | 'half' | 'full'
  const [sheetState, setSheetState] = useState<'collapsed' | 'half'>('collapsed');

  const me = members.find(m => m.id === activeMemberId);

  useEffect(() => {
    if (me && me.locationStatus) {
      setSelectedStatus(me.locationStatus);
    }
  }, [me]);

  useEffect(() => {
    if (!isSharing) {
      setLoadingLoc(false);
      if (onUpdateMemberProfile) {
        onUpdateMemberProfile(activeMemberId, {
          locationStatus: 'Position masquée 🔒',
          lastLocatedAt: new Date().toISOString()
        });
      }
      return;
    }

    // True HTML5 GPS Geolocalisation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          setLoadingLoc(false);

          if (onUpdateMemberProfile) {
            onUpdateMemberProfile(activeMemberId, {
              latitude: lat,
              longitude: lng,
              locationStatus: selectedStatus,
              lastLocatedAt: new Date().toISOString()
            });
          }
        },
        (err) => {
          console.error("GPS Access Error:", err);
          setLoadingLoc(false);
          if (me && me.latitude && me.longitude) {
            setPosition([Number(me.latitude), Number(me.longitude)]);
          }
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLoadingLoc(false);
    }
  }, [activeMemberId, isSharing]);

  // Leaflet custom circular avatar marker creator
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

  // Real Address Search with Nominatim OpenStreetMap API
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=4`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Nominatim address lookup failed:", err);
    } finally {
      setSearching(false);
    }
  };

  // Relocate map to searched address location
  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setPosition([lat, lon]);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Mapped members with dynamically computed offsets and distances
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
        // Safe relative offsets
        const offsetLat = (idx % 2 === 0 ? 0.0025 : -0.0018) * (idx + 1);
        const offsetLng = (idx % 3 === 0 ? -0.0022 : 0.0035) * (idx + 1);
        lat = position[0] + offsetLat;
        lng = position[1] + offsetLng;
      }
    }

    const distance = getHaversineDistance(position[0], position[1], lat, lng);
    const eta = getEstimatedTime(distance);

    const status = isMe ? selectedStatus : m.locationStatus || (idx === 1 ? '🏫 À l\'école' : idx === 2 ? '💼 Au bureau' : '🚗 En déplacement');
    const lastUpdate = m.lastLocatedAt ? new Date(m.lastLocatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : "à l'instant";

    return {
      ...m,
      isMe,
      pos: [lat, lng] as [number, number],
      status,
      lastUpdate,
      distance,
      eta
    };
  });

  // Geographical Favorites markers & data
  const favorites = [
    { name: "Maison principale 🏠", icon: HomeIcon, coords: [position[0] - 0.001, position[1] + 0.002] as [number, number], detail: "Résidence Familiale" },
    { name: "Bureau de Papa 💼", icon: Briefcase, coords: [position[0] + 0.008, position[1] - 0.006] as [number, number], detail: "La Défense Paris" },
    { name: "École des Enfants 🏫", icon: GraduationCap, coords: [position[0] - 0.005, position[1] - 0.004] as [number, number], detail: "Lycée international" }
  ];

  const statuses = [
    { label: '🏠 Maison', value: '🏠 À la maison' },
    { label: '🏫 École', value: '🏫 À l\'école' },
    { label: '💼 Bureau', value: '💼 Au bureau' },
    { label: '🚗 Trajet', value: '🚗 En déplacement' },
    { label: '🚨 Urgence', value: '🚨 Urgence' }
  ];

  // TileLayer provider switcher
  const darkLayer = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const satLayer = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#07111F] text-white overflow-hidden relative">
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

      {/* Floating real search bar */}
      <div className="absolute top-4 left-4 right-4 z-[999] max-w-sm mx-auto">
        <form onSubmit={handleAddressSearch} className="flex items-center space-x-2 bg-[#0F1E36]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl">
          <Search className="w-4 h-4 text-white/50 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une adresse réelle..."
            className="flex-1 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-[#6C5CFF] text-white text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-xl cursor-pointer hover:bg-[#5849E0] transition"
          >
            {searching ? '...' : 'OK'}
          </button>
        </form>

        {/* Nominatim Search Results Floating Panel */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-[#0F1E36]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 max-h-[180px] overflow-y-auto shadow-2xl space-y-1">
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSearchResult(res)}
                className="w-full text-left p-2 rounded-xl text-[10px] text-white hover:bg-white/5 truncate transition block font-medium"
              >
                📍 {res.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING MAP LAYER STYLE SWITCHER */}
      <div className="absolute top-20 right-4 z-[999] flex flex-col space-y-2">
        {/* Toggle Location Sharing */}
        <button
          onClick={() => {
            const nextVal = !isSharing;
            setIsSharing(nextVal);
            localStorage.setItem('mf_share_location', nextVal ? 'true' : 'false');
          }}
          className={`p-3 backdrop-blur-md rounded-2xl border shadow-xl transition active:scale-95 flex items-center justify-center cursor-pointer ${
            isSharing 
              ? 'bg-[#00D26A]/20 border-[#00D26A]/40 text-[#00D26A] hover:bg-[#00D26A]/30' 
              : 'bg-[#FF3B30]/20 border-[#FF3B30]/40 text-[#FF3B30] hover:bg-[#FF3B30]/30'
          }`}
          title={isSharing ? "Partage de position : Actif (Cliquer pour masquer)" : "Partage de position : Masqué (Cliquer pour activer)"}
        >
          {isSharing ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
        </button>

        <button
          onClick={() => setMapLayer(prev => prev === 'dark' ? 'satellite' : 'dark')}
          className="p-3 bg-[#0F1E36]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl hover:bg-[#162C4E] transition text-white active:scale-95 flex items-center justify-center cursor-pointer"
          title="Changer de vue (Plan / Satellite)"
        >
          {mapLayer === 'dark' ? <Map className="w-4.5 h-4.5" /> : <Layers className="w-4.5 h-4.5 text-[#FFB020]" />}
        </button>

        {/* Manual Geolocate centering */}
        <button 
          onClick={() => {
            if (!isSharing) {
              alert("Veuillez activer le partage de position pour vous géolocaliser.");
              return;
            }
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
          className="p-3 bg-[#0F1E36]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl hover:bg-[#162C4E] transition text-white active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <Crosshair className={`w-4.5 h-4.5 ${loadingLoc ? 'animate-spin text-[#00D26A]' : 'text-white'}`} />
        </button>
      </div>

      {/* MAP RENDER CONTAINER */}
      <div className="flex-1 w-full relative z-10 rounded-t-[32px] overflow-hidden border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col justify-end">
        <div className="absolute inset-0 z-0">
          <MapContainer 
            center={position} 
            zoom={14} 
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url={mapLayer === 'dark' ? darkLayer : satLayer}
              attribution={mapLayer === 'dark' 
                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                : 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community'
              }
            />
            
            <CenterMap center={position} />

            {/* Render vector routing polyline if active */}
            {routeTarget && (
              <Polyline 
                positions={[position, routeTarget.coords]} 
                color="#00D26A" 
                weight={4}
                dashArray="8, 8"
                className="animate-pulse"
              />
            )}

            {/* Mapped Family Members Markers */}
            {mappedMembers.map((m) => (
              <Marker key={m.id} position={m.pos} icon={createCustomIcon(m as Member, m.isMe)}>
                <Popup closeButton={false}>
                  <div className="text-center min-w-[120px]">
                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                      <span className="font-extrabold text-xs text-white">{m.name}</span>
                      {m.isMe && <span className="bg-[#00D26A]/20 text-[#00D26A] text-[9px] px-1.5 py-0.5 rounded-full font-bold">Moi</span>}
                    </div>
                    <p className="text-[10px] text-white/80 font-medium bg-white/5 py-1 px-2 rounded-lg inline-block border border-white/5">{m.status}</p>
                    
                    {!m.isMe && (
                      <p className="text-[9px] text-[#FFB020] font-bold mt-1">
                        Distance: {m.distance.toFixed(2)} km ({m.eta})
                      </p>
                    )}

                    <p className="text-[8px] text-[#00D26A] mt-1 font-semibold flex items-center justify-center">
                      <span className="inline-block w-1.5 h-1.5 bg-[#00D26A] rounded-full mr-1 animate-pulse"></span>
                      Mis à jour: {m.lastUpdate}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Favorites markers */}
            {favorites.map((fav, idx) => {
              return (
                <Marker 
                  key={idx} 
                  position={fav.coords} 
                  icon={L.divIcon({
                    className: 'fav-marker',
                    html: `
                      <div style="width: 32px; height: 32px; background: rgba(255, 176, 32, 0.2); border: 2px solid #FFB020; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
                        <span style="font-size: 14px;">📍</span>
                      </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                  })}
                >
                  <Popup closeButton={false}>
                    <div className="text-center min-w-[100px] p-0.5">
                      <span className="font-extrabold text-xs text-white block">{fav.name}</span>
                      <span className="text-[9px] text-white/50 block mt-0.5">{fav.detail}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Route Details Overlay Banner */}
        {routeTarget && (
          <div className="absolute top-28 left-4 right-4 z-[999] bg-[#00D26A] text-black font-extrabold text-xs uppercase px-4 py-3 rounded-2xl flex items-center justify-between shadow-2xl animate-bounce">
            <div className="flex items-center space-x-2">
              <Route className="w-4 h-4 animate-spin" />
              <span>Itinéraire vers {routeTarget.name}</span>
            </div>
            <button 
              onClick={() => setRouteTarget(null)}
              className="bg-black/10 hover:bg-black/20 text-black px-2 py-0.5 rounded-lg text-[9px] font-black cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* iOS-STYLE SLIDING AND EXPANDABLE BOTTOM SHEET */}
        <div className="relative z-20 px-4 pb-4 pt-2 bg-gradient-to-t from-[#07111F] via-[#07111F]/95 to-transparent">
          
          {/* Quick status selector */}
          <div className="bg-[#0F1E36]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-3.5 shadow-2xl flex flex-col space-y-3">
            <div 
              onClick={() => setSheetState(prev => prev === 'collapsed' ? 'half' : 'collapsed')}
              className="flex flex-col items-center cursor-pointer py-1"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mb-2"></div>
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center space-x-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#6C5CFF]" />
                  <span>Mon statut & Membres ({members.length})</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Évite le dépliage automatique
                      const nextVal = !isSharing;
                      setIsSharing(nextVal);
                      localStorage.setItem('mf_share_location', nextVal ? 'true' : 'false');
                    }}
                    className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      isSharing
                        ? 'bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]'
                        : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
                    }`}
                  >
                    {isSharing ? '📍 Actif' : '🔒 Masqué'}
                  </button>
                  <span className="text-[9px] text-white/70 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    {sheetState === 'collapsed' ? 'Déplier 👆' : 'Replier 👇'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid of status changes */}
            <div className="grid grid-cols-5 gap-1.5 pt-1.5 border-t border-white/5">
              {statuses.map((s) => {
                const isActive = selectedStatus === s.value;
                const isUrgent = s.value === '🚨 Urgence';
                
                return (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={`py-2 px-1 rounded-xl text-[9px] font-bold transition-all flex flex-col items-center justify-center space-y-1 active:scale-95 border ${
                      isActive
                        ? isUrgent
                          ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/30 font-black'
                          : 'bg-[#00D26A] border-[#00D26A] text-[#07111F] shadow-lg shadow-[#00D26A]/20 font-black'
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

            {/* EXPANDED CONTENT: Favorites addresses & Family Members Cards */}
            {sheetState === 'half' && (
              <div className="pt-3 border-t border-white/5 space-y-4 max-h-[220px] overflow-y-auto no-scrollbar animate-fade-in">
                
                {/* 1. Address Favorites Panel */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Lieux favoris</span>
                  <div className="grid grid-cols-3 gap-2">
                    {favorites.map((fav, idx) => {
                      const FavIcon = fav.icon;
                      const dist = getHaversineDistance(position[0], position[1], fav.coords[0], fav.coords[1]);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setPosition(fav.coords);
                            setRouteTarget({ name: fav.name, coords: fav.coords });
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-left space-y-1 transition active:scale-95 cursor-pointer block"
                        >
                          <div className="flex items-center space-x-1">
                            <FavIcon className="w-3.5 h-3.5 text-[#FFB020]" />
                            <span className="text-[9px] font-bold text-white truncate">{fav.name.split(' ')[0]}</span>
                          </div>
                          <span className="text-[8px] text-white/40 block truncate">{fav.detail}</span>
                          <span className="text-[8px] text-[#00D26A] font-extrabold block">
                            {dist.toFixed(1)} km
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Family Members detailed list */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Statut complet de la famille</span>
                  
                  <div className="space-y-1.5">
                    {mappedMembers.map((m) => (
                      <div 
                        key={m.id}
                        className="p-2.5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/8 transition"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img src={m.photoUrl} className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-white truncate">{m.name}</span>
                              <span className="text-[8px] font-extrabold text-white/40 px-1 py-0.5 rounded bg-white/10 uppercase">
                                {m.role}
                              </span>
                            </div>
                            <span className="text-[9px] text-white/60 block truncate">{m.status}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {!m.isMe && (
                            <div className="text-right">
                              <span className="text-[9px] font-extrabold text-[#00D26A] block">{m.distance.toFixed(1)} km</span>
                              <span className="text-[8px] text-white/40 block font-medium">{m.eta}</span>
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              setPosition(m.pos);
                              if (!m.isMe) {
                                setRouteTarget({ name: m.name, coords: m.pos });
                              }
                            }}
                            className="p-1.5 bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/35 text-[#9E94FF] rounded-lg transition"
                            title="Recentrer et tracer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

