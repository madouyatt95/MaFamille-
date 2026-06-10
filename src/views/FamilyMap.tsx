import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
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
  Route,
  Edit3,
  Trash2,
  AlertCircle
} from 'lucide-react';
import type { Member } from '../types';

const DEFAULT_MAP_CENTER: [number, number] = [46.603354, 1.888334];
const FALLBACK_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=family-map';

const getMemberCoords = (member?: Member | null): [number, number] | null => {
  if (!member || member.latitude === undefined || member.latitude === null || member.longitude === undefined || member.longitude === null) {
    return null;
  }

  const lat = Number(member.latitude);
  const lng = Number(member.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

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

const MapClickHandler: React.FC<{ onClick: (coords: [number, number]) => void }> = ({ onClick }) => {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
};

export interface FavoritePlace {
  id: string;
  name: string;
  type: 'home' | 'work' | 'school' | 'other';
  detail: string;
  coords: [number, number];
}

const readStoredFavorites = (): FavoritePlace[] => {
  try {
    const stored = localStorage.getItem('mf_map_favorites');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const legacyDefaultIds = new Set(['fav-1', 'fav-2', 'fav-3']);
    return parsed.filter((fav: FavoritePlace) => {
      if (!fav || !fav.id || !fav.coords) return false;
      const isLegacyDefault =
        legacyDefaultIds.has(fav.id) &&
        ['Maison principale 🏠', 'Bureau familial 💼', 'École des enfants 🏫'].includes(fav.name);
      return !isLegacyDefault;
    });
  } catch (e) {
    console.error('Unable to parse map favorites:', e);
    return [];
  }
};

const getFavoriteIcon = (type: 'home' | 'work' | 'school' | 'other') => {
  switch (type) {
    case 'home': return HomeIcon;
    case 'work': return Briefcase;
    case 'school': return GraduationCap;
    default: return Map;
  }
};

const buildSearchUrl = (query: string, origin: [number, number] | null) => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: '6',
    addressdetails: '1',
    'accept-language': 'fr'
  });

  if (origin) {
    const [lat, lng] = origin;
    params.set('viewbox', `${lng - 1},${lat + 0.7},${lng + 1},${lat - 0.7}`);
    params.set('bounded', '0');
  }

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
};

const formatSearchResult = (result: any) => {
  const address = result?.address || {};
  const title =
    result?.name ||
    address.amenity ||
    address.road ||
    String(result?.display_name || 'Lieu').split(',')[0];
  const city = address.city || address.town || address.village || address.municipality || address.county;
  const parts = [address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road, city, address.postcode, address.country]
    .filter(Boolean);

  return {
    title,
    subtitle: parts.join(' · ') || result?.display_name || ''
  };
};

export const FamilyMap: React.FC<FamilyMapProps> = ({ members, activeMemberId, onUpdateMemberProfile }) => {
  // Decoupled Viewport Center & User GPS Location to prevent mass teleportation
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('Actif maintenant');
  const [isSharing, setIsSharing] = useState<boolean>(() => localStorage.getItem('mf_share_location') !== 'false');
  
  // Layer style: 'dark' | 'satellite'
  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite'>('dark');
  
  // Nominatim Real Search Bar States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Real OSRM route tracing states
  const [routeTarget, setRouteTarget] = useState<{
    name: string;
    coords: [number, number];
  } | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking'>('driving');

  // Dynamic Favorites saved in LocalStorage
  const [favorites, setFavorites] = useState<FavoritePlace[]>(readStoredFavorites);

  useEffect(() => {
    localStorage.setItem('mf_map_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Favorites editing state
  const [isEditingFavorites, setIsEditingFavorites] = useState(false);
  const [editingFavoriteId, setEditingFavoriteId] = useState<string | null>(null);
  const [editFavName, setEditFavName] = useState('');
  const [editFavDetail, setEditFavDetail] = useState('');
  const [editFavType, setEditFavType] = useState<'home' | 'work' | 'school' | 'other'>('other');

  // Adding favorite from search or map click
  const [addingFavoriteCoords, setAddingFavoriteCoords] = useState<[number, number] | null>(null);
  const [addingFavoriteName, setAddingFavoriteName] = useState('');
  const [addingFavoriteDetail, setAddingFavoriteDetail] = useState('');
  const [addingFavoriteType, setAddingFavoriteType] = useState<'home' | 'work' | 'school' | 'other'>('other');

  // Search Marker placed temporarily on the map
  const [searchMarker, setSearchMarker] = useState<{ name: string; coords: [number, number] } | null>(null);

  const searchPlaces = async (query: string, showEmptyMessage = true) => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(buildSearchUrl(query, routeOrigin));
      if (!response.ok) throw new Error('search_failed');
      const data = await response.json();
      setSearchResults(data);
      if (showEmptyMessage && Array.isArray(data) && data.length === 0) {
        setSearchError("Aucun lieu trouvé. Essayez avec une ville ou une adresse plus précise.");
      }
    } catch (err) {
      console.error("Nominatim search error:", err);
      setSearchError("La recherche d'adresse est momentanément indisponible.");
    } finally {
      setSearching(false);
    }
  };

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchPlaces(searchQuery, true);
  };

  // iOS-style bottom sheet state: 'collapsed' | 'half' | 'full'
  const [sheetState, setSheetState] = useState<'collapsed' | 'half'>('collapsed');

  const me = members.find(m => m.id === activeMemberId);
  const activeMemberStoredLocation = useMemo(() => getMemberCoords(me), [me?.latitude, me?.longitude]);
  const routeOrigin = userLocation || activeMemberStoredLocation;

  useEffect(() => {
    const bestCenter = userLocation || activeMemberStoredLocation || members.map(getMemberCoords).find(Boolean) || DEFAULT_MAP_CENTER;
    setMapCenter(bestCenter as [number, number]);
  }, [activeMemberId, members, userLocation]);

  useEffect(() => {
    if (me && me.locationStatus) {
      setSelectedStatus(me.locationStatus);
    }
  }, [me]);

  useEffect(() => {
    if (!isSharing) {
      setLoadingLoc(false);
      setLocationError(null);
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
      setLoadingLoc(true);
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);
          setMapCenter([lat, lng]);
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
          setLocationError("Position non disponible. Vérifiez l'autorisation GPS de l'appareil.");
          setLoadingLoc(false);
          if (activeMemberStoredLocation) {
            setUserLocation(activeMemberStoredLocation);
            setMapCenter(activeMemberStoredLocation);
          }
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError("La géolocalisation n'est pas disponible sur cet appareil.");
      setLoadingLoc(false);
    }
  }, [activeMemberId, activeMemberStoredLocation, isSharing]);

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
            src="${member.photoUrl || FALLBACK_AVATAR}" 
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
    const coords = routeOrigin;
    if (onUpdateMemberProfile) {
      await onUpdateMemberProfile(activeMemberId, {
        ...(coords ? { latitude: coords[0], longitude: coords[1] } : {}),
        locationStatus: status,
        lastLocatedAt: new Date().toISOString()
      });
    }
  };

  // Real-time Nominatim Address Suggestions Autocomplete with Debounce
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(buildSearchUrl(searchQuery, routeOrigin));
        if (!response.ok) throw new Error('search_failed');
        const data = await response.json();
        setSearchResults(data);
        setSearchError(null);
      } catch (err) {
        console.error("Nominatim autocompletion error:", err);
        setSearchError("La recherche d'adresse est momentanément indisponible.");
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [routeOrigin, searchQuery]);

  // Real OSRM Routing calculation
  useEffect(() => {
    if (!routeTarget || !routeOrigin) {
      setRoutePoints([]);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const start = routeOrigin;
        const end = routeTarget.coords;
        const profile = routeMode === 'walking' ? 'foot' : 'driving';
        const url = `https://router.project-osrm.org/route/v1/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          setRoutePoints(coords);
          setRouteDistance(route.distance / 1000); // km
          setRouteDuration(route.duration); // seconds
        } else {
          // Fallback to straight line
          setRoutePoints([start, end]);
          const d = getHaversineDistance(start[0], start[1], end[0], end[1]);
          setRouteDistance(d);
          setRouteDuration(null);
        }
      } catch (err) {
        console.error("OSRM Route calculation error:", err);
        // Fallback to straight line
        const start = routeOrigin;
        const end = routeTarget.coords;
        setRoutePoints([start, end]);
        const d = getHaversineDistance(start[0], start[1], end[0], end[1]);
        setRouteDistance(d);
        setRouteDuration(null);
      }
    };

    fetchRoute();
  }, [routeMode, routeOrigin, routeTarget]);

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h${rem > 0 ? rem : ''}`;
  };

  // Relocate map to searched address location and place searchMarker
  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setMapCenter([lat, lon]);
    setSearchMarker({
      name: result.display_name,
      coords: [lat, lon]
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const startRouteTo = (name: string, coords: [number, number]) => {
    setMapCenter(coords);
    if (!routeOrigin) {
      alert("Activez ou autorisez votre position pour calculer un itinéraire depuis votre emplacement.");
      return;
    }
    setRouteTarget({ name, coords });
  };

  const openRouteInNativeMaps = () => {
    if (!routeTarget) return;
    const [lat, lng] = routeTarget.coords;
    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
    const travelMode = routeMode === 'walking' ? 'walking' : 'driving';
    const appleMode = routeMode === 'walking' ? 'w' : 'd';
    const url = isAppleDevice
      ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=${appleMode}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${travelMode}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Mapped members with real coordinates only. Unknown locations stay explicit in the list.
  const mappedMembers = members.map((m, idx) => {
    const isMe = m.id === activeMemberId;
    const storedCoords = getMemberCoords(m);
    const pos = isMe ? routeOrigin : storedCoords;
    const hasLocation = !!pos;
    const distance = routeOrigin && pos ? getHaversineDistance(routeOrigin[0], routeOrigin[1], pos[0], pos[1]) : null;
    const eta = distance !== null ? getEstimatedTime(distance) : null;

    const status = isMe
      ? (isSharing ? selectedStatus : 'Position masquée 🔒')
      : m.locationStatus || (hasLocation ? 'Position partagée' : 'Position non partagée');
    const lastUpdate = m.lastLocatedAt ? new Date(m.lastLocatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : "à l'instant";

    return {
      ...m,
      isMe,
      pos,
      status,
      lastUpdate,
      distance,
      eta,
      hasLocation
    };
  });

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

        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {['École', 'Médecin', 'Pharmacie', 'Courses'].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setSearchQuery(label);
                searchPlaces(label, true);
              }}
              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-[#0F1E36]/85 border border-white/10 text-[9px] font-extrabold text-white/70 backdrop-blur-xl active:scale-95"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Nominatim Search Results Floating Panel */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-[#0F1E36]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 max-h-[180px] overflow-y-auto shadow-2xl space-y-1">
            {searchResults.map((res, idx) => {
              const formatted = formatSearchResult(res);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-2.5 rounded-xl text-white hover:bg-white/5 transition block font-medium"
                >
                  <span className="text-[11px] font-extrabold text-white flex items-center gap-1.5">
                    <span>📍</span>
                    <span className="truncate">{formatted.title}</span>
                  </span>
                  <span className="text-[9px] text-white/45 block truncate mt-0.5">{formatted.subtitle}</span>
                </button>
              );
            })}
          </div>
        )}

        {searchError && (
          <div className="mt-2 bg-[#FF4D6D]/15 backdrop-blur-xl border border-[#FF4D6D]/25 rounded-2xl p-3 shadow-2xl flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-[#FF4D6D] shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/80 font-semibold leading-normal">{searchError}</p>
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
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  setUserLocation([lat, lng]);
                  setMapCenter([lat, lng]);
                  setLocationError(null);
                  setLoadingLoc(false);
                },
                (err) => {
                  console.error(err);
                  setLocationError("Position non disponible. Vérifiez l'autorisation GPS de l'appareil.");
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
            center={mapCenter} 
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
            
            <CenterMap center={mapCenter} />

            <MapClickHandler onClick={(coords) => {
              setSearchMarker({
                name: "Point d'intérêt sélectionné 📍",
                coords
              });
              setMapCenter(coords);
            }} />

            {/* Render dynamic route tracing from OSRM road points if active */}
            {routeTarget && routePoints.length > 0 && (
              <>
                {/* 1. Deep black shadow line to anchor the road on streets */}
                <Polyline 
                  positions={routePoints} 
                  color="#000000" 
                  weight={10}
                  opacity={0.3}
                />
                {/* 2. Soft outer glowing cyan/blue line */}
                <Polyline 
                  positions={routePoints} 
                  color="#4F8CFF" 
                  weight={7}
                  opacity={0.65}
                />
                {/* 3. Bright neon green foreground GPS route line */}
                <Polyline 
                  positions={routePoints} 
                  color="#00D26A" 
                  weight={4}
                  opacity={1}
                />
                {/* 4. Custom start & destination emoji markers */}
                <Marker 
                  position={routePoints[0]}
                  icon={L.divIcon({
                    className: 'start-route-marker',
                    html: `<div style="font-size: 20px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${routeMode === 'walking' ? '🚶' : '🚗'}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                />
                <Marker 
                  position={routePoints[routePoints.length - 1]}
                  icon={L.divIcon({
                    className: 'end-route-marker',
                    html: `<div style="font-size: 20px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform-origin: bottom center; animation: bounce 1s infinite alternate;">🏁</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                />
              </>
            )}

            {/* Search Marker placed temporarily on the map */}
            {searchMarker && (
              <Marker 
                position={searchMarker.coords}
                icon={L.divIcon({
                  className: 'search-marker',
                  html: `
                    <div style="width: 36px; height: 36px; background: rgba(108, 92, 255, 0.2); border: 2px solid #6C5CFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); animation: pulse 2s infinite;">
                      <span style="font-size: 16px;">🔍</span>
                    </div>
                  `,
                  iconSize: [36, 36],
                  iconAnchor: [18, 18]
                })}
              >
                <Popup closeButton={false}>
                  {addingFavoriteCoords ? (
                    <div className="text-left min-w-[170px] p-2 space-y-2 text-white">
                      <span className="text-[10px] font-extrabold text-[#FFB020] uppercase tracking-wider block">⭐️ Ajouter aux Favoris</span>
                      
                      <div className="space-y-1.5">
                        <div>
                          <label className="text-[8px] font-extrabold text-white/50 block mb-0.5">NOM</label>
                          <input 
                            type="text"
                            value={addingFavoriteName}
                            onChange={(e) => setAddingFavoriteName(e.target.value)}
                            className="w-full bg-[#07111F] border border-white/20 rounded px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-[#FFB020]"
                            placeholder="Ex: Piscine"
                          />
                        </div>

                        <div>
                          <label className="text-[8px] font-extrabold text-white/50 block mb-0.5">CATÉGORIE</label>
                          <select
                            value={addingFavoriteType}
                            onChange={(e) => setAddingFavoriteType(e.target.value as any)}
                            className="w-full bg-[#07111F] border border-white/20 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none"
                          >
                            <option value="home">Maison 🏠</option>
                            <option value="work">Travail 💼</option>
                            <option value="school">École 🏫</option>
                            <option value="other">Autre 📍</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[8px] font-extrabold text-white/50 block mb-0.5">DESCRIPTION</label>
                          <input 
                            type="text"
                            value={addingFavoriteDetail}
                            onChange={(e) => setAddingFavoriteDetail(e.target.value)}
                            className="w-full bg-[#07111F] border border-white/20 rounded px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-[#FFB020]"
                            placeholder="Ex: Entraînement"
                          />
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-1.5 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            if (!addingFavoriteName.trim()) return alert("Veuillez saisir un nom.");
                            const newFav: FavoritePlace = {
                              id: `fav-${Date.now()}`,
                              name: addingFavoriteName.trim(),
                              type: addingFavoriteType,
                              detail: addingFavoriteDetail.trim() || "Lieu favori",
                              coords: addingFavoriteCoords
                            };
                            setFavorites(prev => [...prev, newFav]);
                            setAddingFavoriteCoords(null);
                            setSearchMarker(null);
                            alert("Lieu ajouté aux favoris ! ⭐️");
                          }}
                          className="flex-1 py-1 rounded bg-[#FFB020] text-black text-[9px] font-extrabold hover:opacity-90 transition cursor-pointer shadow-md text-center"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingFavoriteCoords(null);
                          }}
                          className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold transition cursor-pointer text-center"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center min-w-[140px] p-1 space-y-2">
                      <span className="font-extrabold text-xs text-white block truncate max-w-[150px]">{searchMarker.name}</span>
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => {
                            startRouteTo(searchMarker.name, searchMarker.coords);
                          }}
                          className="w-full py-1.5 rounded bg-[#00D26A] hover:bg-[#00B85C] text-white text-[9px] font-bold transition cursor-pointer"
                        >
                          🚘 Itinéraire vers ce lieu
                        </button>
                        <button
                          onClick={() => {
                            setAddingFavoriteCoords(searchMarker.coords);
                            setAddingFavoriteName(searchMarker.name.split(',')[0]);
                            setAddingFavoriteDetail(searchMarker.name.split(',').slice(1, 3).join(',').trim() || "Point d'intérêt");
                            setAddingFavoriteType('other');
                          }}
                          className="w-full py-1.5 rounded bg-[#FFB020] hover:bg-[#E0981B] text-black text-[9px] font-bold transition cursor-pointer"
                        >
                          ⭐️ Ajouter aux favoris
                        </button>
                        <button
                          onClick={() => setSearchMarker(null)}
                          className="w-full py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 text-[9px] font-bold transition cursor-pointer"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                </Popup>
              </Marker>
            )}

            {/* Mapped Family Members Markers */}
            {mappedMembers.filter((m) => m.pos).map((m) => (
              <Marker key={m.id} position={m.pos as [number, number]} icon={createCustomIcon(m as Member, m.isMe)}>
                <Popup closeButton={false}>
                  <div className="text-center min-w-[120px]">
                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                      <span className="font-extrabold text-xs text-white">{m.name}</span>
                      {m.isMe && <span className="bg-[#00D26A]/20 text-[#00D26A] text-[9px] px-1.5 py-0.5 rounded-full font-bold">Moi</span>}
                    </div>
                    <p className="text-[10px] text-white/80 font-medium bg-white/5 py-1 px-2 rounded-lg inline-block border border-white/5">{m.status}</p>
                    
                    {!m.isMe && m.distance !== null && m.eta && (
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
            {favorites.map((fav) => {
              return (
                <Marker 
                  key={fav.id} 
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
          <div className="absolute top-28 left-4 right-4 z-[999] bg-[#0F1E36]/95 backdrop-blur-xl text-white border border-[#00D26A]/30 px-3.5 py-3 rounded-2xl shadow-2xl space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <Route className="w-4 h-4 text-[#00D26A] shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00D26A]">Itinéraire</span>
                </div>
                <p className="text-xs font-extrabold truncate mt-0.5">{routeTarget.name}</p>
                <p className="text-[10px] text-white/55 font-bold mt-0.5">
                  {routeDistance ? `${routeDistance.toFixed(1)} km${routeDuration ? ` · ${formatDuration(routeDuration)}` : ' · estimation directe'}` : 'Calcul en cours...'}
                </p>
              </div>
              <button 
                onClick={() => setRouteTarget(null)}
                className="bg-white/5 hover:bg-white/10 text-white/70 px-2 py-1 rounded-lg text-[9px] font-black cursor-pointer shrink-0"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-1.5">
              <button
                type="button"
                onClick={() => setRouteMode('driving')}
                className={`py-2 rounded-xl text-[9px] font-black uppercase transition ${
                  routeMode === 'driving' ? 'bg-[#00D26A] text-[#07111F]' : 'bg-white/5 text-white/55'
                }`}
              >
                🚗 Voiture
              </button>
              <button
                type="button"
                onClick={() => setRouteMode('walking')}
                className={`py-2 rounded-xl text-[9px] font-black uppercase transition ${
                  routeMode === 'walking' ? 'bg-[#00D26A] text-[#07111F]' : 'bg-white/5 text-white/55'
                }`}
              >
                🚶 À pied
              </button>
              <button
                type="button"
                onClick={openRouteInNativeMaps}
                className="py-2 rounded-xl bg-[#6C5CFF] text-white text-[9px] font-black uppercase shadow-lg shadow-[#6C5CFF]/20"
              >
                Ouvrir Plans
              </button>
            </div>
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
            {locationError && (
              <div className="p-3 rounded-2xl bg-[#FFB020]/10 border border-[#FFB020]/20 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/70 font-semibold leading-normal">{locationError}</p>
              </div>
            )}

            {!isSharing && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/8 flex items-start space-x-2">
                <EyeOff className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/60 font-semibold leading-normal">
                  Votre position est masquée. Les autres membres ne verront pas votre position actuelle.
                </p>
              </div>
            )}

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
              <div className="pt-3 border-t border-white/5 space-y-4 max-h-[260px] overflow-y-auto no-scrollbar animate-fade-in">
                
                {/* 1. Address Favorites Panel */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Lieux favoris</span>
                    <button
                      onClick={() => {
                        setIsEditingFavorites(prev => !prev);
                        setEditingFavoriteId(null);
                      }}
                      className="text-[9px] text-[#FFB020] font-extrabold hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <span>{isEditingFavorites ? "Terminer ✓" : "Gérer ⚙️"}</span>
                    </button>
                  </div>

                  {routeOrigin && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Maison', type: 'home' as const, detail: 'Position du foyer' },
                        { label: 'Travail', type: 'work' as const, detail: 'Lieu de travail' },
                        { label: 'École', type: 'school' as const, detail: 'Établissement scolaire' }
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            const existing = favorites.find(f => f.type === item.type);
                            const nextFavorite: FavoritePlace = {
                              id: existing?.id || `fav-${Date.now()}-${item.type}`,
                              name: item.label,
                              type: item.type,
                              detail: item.detail,
                              coords: routeOrigin
                            };
                            setFavorites(prev => existing
                              ? prev.map(f => f.id === existing.id ? nextFavorite : f)
                              : [...prev, nextFavorite]
                            );
                          }}
                          className="py-2 rounded-xl bg-white/5 border border-white/8 text-[9px] text-white/65 font-extrabold active:scale-95"
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Add Favorite Inline Form */}
                  {addingFavoriteCoords && (
                    <div className="p-3 bg-[#0F1E36]/90 backdrop-blur-xl border border-[#FFB020]/30 rounded-2xl space-y-2.5 shadow-2xl text-left animate-slide-up">
                      <span className="text-[9px] font-extrabold text-[#FFB020] uppercase tracking-wider block">⭐️ Nouveau favori</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-bold text-white/40 uppercase block mb-0.5">Nom</label>
                          <input
                            type="text"
                            value={addingFavoriteName}
                            onChange={(e) => setAddingFavoriteName(e.target.value)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#FFB020]"
                            placeholder="Ex: Piscine"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-white/40 uppercase block mb-0.5">Catégorie</label>
                          <select
                            value={addingFavoriteType}
                            onChange={(e) => setAddingFavoriteType(e.target.value as any)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                          >
                            <option value="home">Maison 🏠</option>
                            <option value="work">Travail 💼</option>
                            <option value="school">École 🏫</option>
                            <option value="other">Autre 📍</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-white/40 uppercase block mb-0.5">Description</label>
                        <input
                          type="text"
                          value={addingFavoriteDetail}
                          onChange={(e) => setAddingFavoriteDetail(e.target.value)}
                          className="w-full bg-[#07111F]/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                          placeholder="Ex: Entraînement"
                        />
                      </div>
                      <div className="flex items-center justify-end space-x-1.5 pt-1.5 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setAddingFavoriteCoords(null)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-[9px] font-bold cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!addingFavoriteName.trim()) return alert("Veuillez saisir un nom.");
                            const newFav: FavoritePlace = {
                              id: `fav-${Date.now()}`,
                              name: addingFavoriteName.trim(),
                              type: addingFavoriteType,
                              detail: addingFavoriteDetail.trim() || "Lieu favori",
                              coords: addingFavoriteCoords
                            };
                            setFavorites(prev => [...prev, newFav]);
                            setAddingFavoriteCoords(null);
                            setSearchMarker(null);
                            alert("Lieu ajouté aux favoris ! ⭐️");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#FFB020] text-black text-[9px] font-bold hover:opacity-90 cursor-pointer shadow-md"
                        >
                          Sauver
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit Favorite Inline Form */}
                  {editingFavoriteId && (
                    <div className="p-3 bg-[#0F1E36]/90 backdrop-blur-xl border border-[#6C5CFF]/30 rounded-2xl space-y-2.5 shadow-2xl text-left animate-slide-up">
                      <span className="text-[9px] font-extrabold text-[#6C5CFF] uppercase tracking-wider block">📝 Modifier le favori</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-bold text-white/40 uppercase block mb-0.5">Nom</label>
                          <input
                            type="text"
                            value={editFavName}
                            onChange={(e) => setEditFavName(e.target.value)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#6C5CFF]"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-white/40 uppercase block mb-0.5">Catégorie</label>
                          <select
                            value={editFavType}
                            onChange={(e) => setEditFavType(e.target.value as any)}
                            className="w-full bg-[#07111F]/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                          >
                            <option value="home">Maison 🏠</option>
                            <option value="work">Travail 💼</option>
                            <option value="school">École 🏫</option>
                            <option value="other">Autre 📍</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-white/40 uppercase block mb-0.5">Description</label>
                        <input
                          type="text"
                          value={editFavDetail}
                          onChange={(e) => setEditFavDetail(e.target.value)}
                          className="w-full bg-[#07111F]/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end space-x-1.5 pt-1.5 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setEditingFavoriteId(null)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-[9px] font-bold cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editFavName.trim()) return alert("Veuillez saisir un nom.");
                            setFavorites(prev => prev.map(f => f.id === editingFavoriteId ? {
                              ...f,
                              name: editFavName.trim(),
                              type: editFavType,
                              detail: editFavDetail.trim()
                            } : f));
                            setEditingFavoriteId(null);
                            alert("Lieu modifié avec succès ! ⭐️");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#6C5CFF] text-white text-[9px] font-bold hover:opacity-90 cursor-pointer shadow-md"
                        >
                          Sauver
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {favorites.length === 0 && (
                      <div className="col-span-3 p-3 rounded-2xl bg-white/5 border border-dashed border-white/10 text-[10px] text-white/50 font-semibold leading-normal">
                        Aucun lieu favori. Recherchez une adresse ou touchez la carte pour ajouter maison, école ou travail.
                      </div>
                    )}

                    {favorites.map((fav) => {
                      const FavIcon = getFavoriteIcon(fav.type);
                      const dist = routeOrigin ? getHaversineDistance(routeOrigin[0], routeOrigin[1], fav.coords[0], fav.coords[1]) : null;
                      
                      return (
                        <div
                          key={fav.id}
                          className="relative p-2 bg-white/5 border border-white/5 rounded-xl text-left space-y-1 block group"
                        >
                          {/* Favorite Edit / Delete Actions */}
                          {isEditingFavorites && (
                            <div className="absolute top-1 right-1 flex items-center space-x-0.5 z-20 bg-[#07111F]/80 rounded p-0.5 border border-white/10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFavoriteId(fav.id);
                                  setEditFavName(fav.name);
                                  setEditFavDetail(fav.detail);
                                  setEditFavType(fav.type);
                                }}
                                className="p-0.5 text-white hover:text-[#9E94FF] transition active:scale-95 cursor-pointer"
                                title="Modifier"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Supprimer ${fav.name} des favoris ?`)) {
                                    setFavorites(prev => prev.filter(f => f.id !== fav.id));
                                  }
                                }}
                                className="p-0.5 text-white hover:text-[#FF3B30] transition active:scale-95 cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (isEditingFavorites) return;
                              startRouteTo(fav.name, fav.coords);
                            }}
                            className="w-full text-left space-y-1 transition active:scale-95 cursor-pointer block focus:outline-none"
                            disabled={isEditingFavorites}
                          >
                            <div className="flex items-center space-x-1 pr-6">
                              <FavIcon className="w-3.5 h-3.5 text-[#FFB020] shrink-0" />
                              <span className="text-[9px] font-bold text-white truncate">{fav.name.split(' ')[0]}</span>
                            </div>
                            <span className="text-[8px] text-white/40 block truncate">{fav.detail}</span>
                            {dist !== null ? (
                              <span className="text-[8px] text-[#00D26A] font-extrabold block">
                                {dist.toFixed(1)} km
                              </span>
                            ) : (
                              <span className="text-[8px] text-white/30 font-extrabold block">Distance inconnue</span>
                            )}
                          </button>
                        </div>
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
                          {!m.isMe && m.distance !== null && m.eta && (
                            <div className="text-right">
                              <span className="text-[9px] font-extrabold text-[#00D26A] block">{m.distance.toFixed(1)} km</span>
                              <span className="text-[8px] text-white/40 block font-medium">{m.eta}</span>
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              if (!m.pos) return;
                              if (m.isMe) {
                                setMapCenter(m.pos);
                              } else {
                                startRouteTo(m.name, m.pos);
                              }
                            }}
                            disabled={!m.pos}
                            className={`p-1.5 rounded-lg transition ${
                              m.pos
                                ? 'bg-[#6C5CFF]/15 hover:bg-[#6C5CFF]/35 text-[#9E94FF]'
                                : 'bg-white/5 text-white/20 cursor-not-allowed'
                            }`}
                            title={m.pos ? "Recentrer et tracer" : "Position non partagée"}
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
