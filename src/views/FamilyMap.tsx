import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CircleMarker, MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
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
  AlertCircle,
  Bell,
  Clock,
  ShieldCheck,
  UserX,
  MapPin,
  ExternalLink,
  Pill,
  Stethoscope,
  ShoppingBasket,
  TrainFront,
  Trees,
  X,
  Car,
  Footprints,
  ChevronDown,
  ChevronUp,
  LockKeyhole
} from 'lucide-react';
import type { FoyerMember, Member } from '../types';
import { MemberAvatar } from '../components/MemberAvatar';
import { getMemberInitials } from '../utils/avatar';

const DEFAULT_MAP_CENTER: [number, number] = [46.603354, 1.888334];
const createFavoriteId = (type: FavoritePlace['type']) => `fav-${Date.now()}-${type}`;
const MAX_SEARCH_RESULTS = 8;
const NEARBY_RADIUS_METERS = 5000;
const NEARBY_FETCH_LIMIT = 60;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const isValidMapCoords = (lat: number, lng: number) => (
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180 &&
  !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
);

const getMemberCoords = (member?: Member | null): [number, number] | null => {
  if (!member || member.latitude === undefined || member.latitude === null || member.longitude === undefined || member.longitude === null) {
    return null;
  }

  const lat = Number(member.latitude);
  const lng = Number(member.longitude);
  if (!isValidMapCoords(lat, lng)) return null;
  return [lat, lng];
};

interface FamilyMapProps {
  members: Member[];
  activeMemberId: string;
  onUpdateMemberProfile?: (memberId: string, updates: Partial<FoyerMember>) => Promise<void>;
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

const formatLocationFreshness = (timestamp?: string) => {
  if (!timestamp) return 'Jamais synchronisée';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Mise à jour inconnue';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (elapsedMinutes < 1) return "À l'instant";
  if (elapsedMinutes < 60) return `Il y a ${elapsedMinutes} min`;
  if (elapsedMinutes < 24 * 60) return `Il y a ${Math.floor(elapsedMinutes / 60)} h`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// Component to programmatically re-center the map
const CenterMap: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (!isValidMapCoords(center[0], center[1])) return;
    try {
      map.stop();
      map.setView(center, Math.max(map.getZoom(), 14), { animate: false });
    } catch (error) {
      console.error('Unable to center family map:', error);
    }
  }, [center, map]);
  return null;
};

const FitNearbyBounds: React.FC<{
  points: [number, number][];
  origin: [number, number] | null;
}> = ({ points, origin }) => {
  const map = useMap();
  useEffect(() => {
    const validPoints = points.filter(([lat, lon]) => isValidMapCoords(lat, lon));
    const validOrigin = origin && isValidMapCoords(origin[0], origin[1]) ? origin : null;
    if (validPoints.length === 0) return;
    try {
      const bounds = L.latLngBounds(validOrigin ? [validOrigin, ...validPoints] : validPoints);
      if (bounds.isValid()) {
        map.stop();
        map.fitBounds(bounds, { padding: [52, 52], maxZoom: 15, animate: false });
      }
    } catch (error) {
      console.error('Unable to fit nearby bounds:', error);
    }
  }, [map, origin, points]);
  return null;
};

class FamilyMapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean; retryKey: number }
> {
  state = { crashed: false, retryKey: 0 };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Family map rendering failed:', error);
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#07111F] p-6 text-center">
          <div className="max-w-xs">
            <AlertCircle className="mx-auto h-7 w-7 text-[#FFB020]" />
            <p className="mt-3 text-sm font-black text-white">La carte a rencontré un problème</p>
            <p className="mt-1 text-xs font-medium text-white/55">Vos lieux et votre position restent enregistrés.</p>
            <button
              type="button"
              onClick={() => this.setState(state => ({ crashed: false, retryKey: state.retryKey + 1 }))}
              className="mt-4 min-h-11 rounded-xl bg-[#6C5CFF] px-5 text-xs font-black text-white"
            >
              Recharger la carte
            </button>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

export interface FavoritePlace {
  id: string;
  name: string;
  type: 'home' | 'work' | 'school' | 'other';
  detail: string;
  coords: [number, number];
}

interface LocationHistoryEntry {
  memberId: string;
  memberName: string;
  coords: [number, number];
  status: string;
  timestamp: string;
}

interface MapSearchResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  distanceKm?: number;
  nearbyCategory?: NearbyCategory;
  address?: {
    amenity?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    house_number?: string;
    postcode?: string;
    country?: string;
  };
}

type NearbyCategory = 'school' | 'doctor' | 'pharmacy' | 'shopping' | 'station' | 'park';

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

const nearbyCategories: Array<{
  key: NearbyCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  filter: string;
}> = [
  { key: 'school', label: 'École', icon: GraduationCap, filter: '["amenity"~"school|kindergarten|college"]' },
  { key: 'doctor', label: 'Médecin', icon: Stethoscope, filter: '["amenity"~"doctors|clinic|hospital|dentist"]' },
  { key: 'pharmacy', label: 'Pharmacie', icon: Pill, filter: '["amenity"="pharmacy"]' },
  { key: 'shopping', label: 'Courses', icon: ShoppingBasket, filter: '["shop"~"supermarket|convenience|grocery"]' },
  { key: 'station', label: 'Gare', icon: TrainFront, filter: '["railway"~"station|halt"]' },
  { key: 'park', label: 'Parc', icon: Trees, filter: '["leisure"="park"]' }
];

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

const buildNearbyQuery = (category: NearbyCategory, origin: [number, number]) => {
  const definition = nearbyCategories.find(item => item.key === category);
  if (!definition) return '';
  const [lat, lng] = origin;
  return `[out:json][timeout:12];nwr${definition.filter}(around:${NEARBY_RADIUS_METERS},${lat},${lng});out center ${NEARBY_FETCH_LIMIT};`;
};

const buildNearbyFallbackUrl = (category: NearbyCategory, origin: [number, number]) => {
  const definition = nearbyCategories.find(item => item.key === category);
  const [lat, lng] = origin;
  const queryByCategory: Record<NearbyCategory, string> = {
    school: 'école',
    doctor: 'médecin',
    pharmacy: 'pharmacie',
    shopping: 'supermarché',
    station: 'gare',
    park: 'parc'
  };
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: queryByCategory[category] || definition?.label || 'lieu',
    limit: String(MAX_SEARCH_RESULTS),
    addressdetails: '1',
    'accept-language': 'fr',
    viewbox: `${lng - 0.08},${lat + 0.08},${lng + 0.08},${lat - 0.08}`,
    bounded: '1'
  });
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
};

const fetchNearbyElements = async (query: string): Promise<OverpassElement[]> => {
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`overpass_${response.status}`);
      const payload = await response.json() as { elements?: OverpassElement[] };
      return payload.elements || [];
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw lastError || new Error('overpass_unavailable');
};

const fetchNearbyFallbackResults = async (
  category: NearbyCategory,
  origin: [number, number]
): Promise<MapSearchResult[]> => {
  const response = await fetch(buildNearbyFallbackUrl(category, origin));
  if (!response.ok) throw new Error('nearby_fallback_failed');
  const data = await response.json() as MapSearchResult[];
  const results: MapSearchResult[] = [];
  data.forEach(result => {
      const lat = Number(result.lat);
      const lon = Number(result.lon);
      if (!isValidMapCoords(lat, lon)) return;
      results.push({
        ...result,
        distanceKm: getHaversineDistance(origin[0], origin[1], lat, lon),
        nearbyCategory: category
      });
    });

  return results
    .filter(result => typeof result.distanceKm === 'number' && result.distanceKm <= NEARBY_RADIUS_METERS / 1000)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
};

const nearbyMarkerColors: Record<NearbyCategory, string> = {
  school: '#6C5CFF',
  doctor: '#00A6FF',
  pharmacy: '#00D26A',
  shopping: '#FFB020',
  station: '#FF4D6D',
  park: '#2FD27E'
};

const getNearbyMarkerStyle = (category: NearbyCategory): L.PathOptions => ({
  color: '#FFFFFF',
  fillColor: nearbyMarkerColors[category],
  fillOpacity: 0.9,
  opacity: 0.95,
  weight: 2
});

const overpassElementToSearchResult = (
  element: OverpassElement,
  category: NearbyCategory,
  origin: [number, number]
): MapSearchResult | null => {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (!isValidMapCoords(Number(lat), Number(lon))) return null;

  const tags = element.tags || {};
  const name = tags.name || tags.brand || nearbyCategories.find(item => item.key === category)?.label || 'Lieu';
  const road = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'];
  const addressParts = [
    houseNumber && road ? `${houseNumber} ${road}` : road,
    city,
    tags['addr:postcode']
  ].filter(Boolean);

  return {
    lat: String(lat),
    lon: String(lon),
    name,
    display_name: [name, ...addressParts].join(', '),
    distanceKm: getHaversineDistance(origin[0], origin[1], lat as number, lon as number),
    nearbyCategory: category,
    address: {
      road,
      house_number: houseNumber,
      city,
      postcode: tags['addr:postcode']
    }
  };
};

const formatSearchResult = (result: MapSearchResult) => {
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

const normalizeMapSearchQuery = (query: string) => {
  const trimmed = query.trim();
  const aliases: Record<string, string> = {
    courses: 'supermarché',
    course: 'supermarché',
    supermarche: 'supermarché',
    magasin: 'supermarché',
    medecin: 'médecin',
    docteur: 'médecin',
    pediatre: 'pédiatre',
    dentiste: 'dentiste',
    pharmacie: 'pharmacie',
    ecole: 'école',
    école: 'école',
    hopital: 'hôpital',
    gare: 'gare',
    parc: 'parc',
    mairie: 'mairie'
  };
  return aliases[trimmed.toLowerCase()] || trimmed;
};

const compactSearchResults = (results: MapSearchResult[]) => {
  const seen = new Set<string>();
  return results.filter((result) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!isValidMapCoords(lat, lon)) return false;
    const key = `${lat.toFixed(5)}:${lon.toFixed(5)}:${formatSearchResult(result).title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_SEARCH_RESULTS);
};

const favoriteTypeLabels: Record<FavoritePlace['type'], string> = {
  home: 'Maison',
  work: 'Travail',
  school: 'École',
  other: 'Favori'
};

const getFavoriteTypeDescription = (type: FavoritePlace['type']) => {
  if (type === 'home') return 'votre maison';
  if (type === 'school') return 'un établissement scolaire';
  if (type === 'work') return 'un lieu de travail';
  return 'un lieu utile';
};

export const FamilyMap: React.FC<FamilyMapProps> = ({ members, activeMemberId, onUpdateMemberProfile }) => {
  // Decoupled Viewport Center & User GPS Location to prevent mass teleportation
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapNotice, setMapNotice] = useState<{ type: 'success' | 'info' | 'warning'; message: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('Actif maintenant');
  const [isSharing, setIsSharing] = useState<boolean>(() => localStorage.getItem('mf_share_location') !== 'false');
  const [emergencyConfirmOpen, setEmergencyConfirmOpen] = useState(false);
  const [emergencySharing, setEmergencySharing] = useState(false);
  const geolocationRequestRef = useRef(0);
  const nearbySearchRequestRef = useRef(0);
  const addressSearchRequestRef = useRef(0);
  const isSharingRef = useRef(isSharing);
  const selectedStatusRef = useRef(selectedStatus);
  const onUpdateMemberProfileRef = useRef(onUpdateMemberProfile);
  
  // Layer style: 'dark' | 'satellite'
  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite'>('dark');
  
  // Nominatim Real Search Bar States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeNearbyCategory, setActiveNearbyCategory] = useState<NearbyCategory | null>(null);
  
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
  const [hiddenMemberIds, setHiddenMemberIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mf_map_hidden_members') || '[]');
    } catch {
      return [];
    }
  });
  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mf_map_location_history') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mf_map_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('mf_map_hidden_members', JSON.stringify(hiddenMemberIds));
  }, [hiddenMemberIds]);

  useEffect(() => {
    localStorage.setItem('mf_map_location_history', JSON.stringify(locationHistory.slice(0, 30)));
  }, [locationHistory]);

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
  const [favoriteEditorOpen, setFavoriteEditorOpen] = useState(false);

  // Search Marker placed temporarily on the map
  const [searchMarker, setSearchMarker] = useState<{ name: string; coords: [number, number] } | null>(null);

  const searchPlaces = async (query: string, showEmptyMessage = true) => {
    if (!query.trim()) return;
    const requestId = ++addressSearchRequestRef.current;
    ++nearbySearchRequestRef.current;
    setActiveNearbyCategory(null);
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(buildSearchUrl(normalizeMapSearchQuery(query), routeOrigin));
      if (!response.ok) throw new Error('search_failed');
      const data = await response.json() as MapSearchResult[];
      if (requestId !== addressSearchRequestRef.current) return;
      const compacted = compactSearchResults(data);
      setSearchResults(compacted);
      if (showEmptyMessage && compacted.length === 0) {
        setSearchError("Aucun lieu trouvé. Essayez avec une ville ou une adresse plus précise.");
      }
    } catch (err) {
      if (requestId !== addressSearchRequestRef.current) return;
      console.error("Nominatim search error:", err);
      setSearchError("La recherche d'adresse est momentanément indisponible.");
    } finally {
      if (requestId === addressSearchRequestRef.current) setSearching(false);
    }
  };

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchPlaces(searchQuery, true);
  };

  // iOS-style bottom sheet state: 'collapsed' | 'half' | 'full'
  const [sheetState, setSheetState] = useState<'collapsed' | 'half'>('collapsed');

  const me = members.find(m => m.id === activeMemberId);
  const activeMemberLatitudeKey = me?.latitude === undefined || me?.latitude === null ? '' : String(me.latitude);
  const activeMemberLongitudeKey = me?.longitude === undefined || me?.longitude === null ? '' : String(me.longitude);
  const activeMemberName = String(me?.name || '');
  const activeMemberStoredLocation = useMemo<[number, number] | null>(() => {
    if (!activeMemberLatitudeKey || !activeMemberLongitudeKey) return null;
    const latitude = Number(activeMemberLatitudeKey);
    const longitude = Number(activeMemberLongitudeKey);
    return isValidMapCoords(latitude, longitude)
      ? [latitude, longitude]
      : null;
  }, [activeMemberLatitudeKey, activeMemberLongitudeKey]);
  const routeOrigin = isSharing ? (userLocation || activeMemberStoredLocation) : null;
  const nearbyResultCoords = useMemo<[number, number][]>(() => {
    return searchResults
      .filter(result => Boolean(result.nearbyCategory))
      .map(result => [Number(result.lat), Number(result.lon)] as [number, number])
      .filter(([lat, lon]) => isValidMapCoords(lat, lon));
  }, [searchResults]);
  const hasSearchOverlay = searching || searchResults.length > 0 || Boolean(searchError);

  const clearMapSearch = () => {
    ++addressSearchRequestRef.current;
    ++nearbySearchRequestRef.current;
    setActiveNearbyCategory(null);
    setSearchResults([]);
    setSearchError(null);
    setSearching(false);
  };

  useEffect(() => {
    isSharingRef.current = isSharing;
  }, [isSharing]);

  useEffect(() => {
    selectedStatusRef.current = selectedStatus;
  }, [selectedStatus]);

  useEffect(() => {
    onUpdateMemberProfileRef.current = onUpdateMemberProfile;
  }, [onUpdateMemberProfile]);

  const searchNearbyPlaces = async (category: NearbyCategory) => {
    const requestId = ++nearbySearchRequestRef.current;
    ++addressSearchRequestRef.current;
    const definition = nearbyCategories.find(item => item.key === category);
    const validOrigin = routeOrigin && isValidMapCoords(routeOrigin[0], routeOrigin[1])
      ? routeOrigin
      : null;
    if (!validOrigin || !definition) {
      setActiveNearbyCategory(null);
      setSearchResults([]);
      setSearchError("Activez votre position pour afficher les lieux réellement proches de vous.");
      setMapNotice({ type: 'warning', message: "La recherche de proximité nécessite votre position actuelle." });
      return;
    }

    setActiveNearbyCategory(category);
    setSearchResults([]);
    setSearchMarker(null);
    setSearching(true);
    setSearchError(null);
    try {
      const query = buildNearbyQuery(category, validOrigin);
      const elements = await fetchNearbyElements(query);
      const results = elements
        .map(element => overpassElementToSearchResult(element, category, validOrigin))
        .filter((result): result is MapSearchResult => Boolean(result))
        .filter(result => typeof result.distanceKm === 'number' && result.distanceKm <= NEARBY_RADIUS_METERS / 1000)
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      const compacted = compactSearchResults(results);
      if (requestId !== nearbySearchRequestRef.current) return;
      setSearchResults(compacted);
      if (compacted.length === 0) {
        setSearchError(`Aucun ${definition.label.toLowerCase()} trouvé dans un rayon de 5 km.`);
      } else {
        setMapNotice({
          type: 'success',
          message: `${compacted.length} ${definition.label.toLowerCase()}${compacted.length > 1 ? 's' : ''} affiché${compacted.length > 1 ? 's' : ''} à moins de 5 km.`
        });
      }
    } catch (err) {
      console.error('Nearby places search error:', err);
      try {
        const fallbackResults = compactSearchResults(await fetchNearbyFallbackResults(category, validOrigin));
        if (requestId !== nearbySearchRequestRef.current) return;
        setSearchResults(fallbackResults);
        if (fallbackResults.length === 0) {
          setActiveNearbyCategory(null);
          setSearchError(`Aucun ${definition.label.toLowerCase()} trouvé dans un rayon de 5 km.`);
          return;
        }
        setMapNotice({
          type: 'info',
          message: `${fallbackResults.length} résultat${fallbackResults.length > 1 ? 's' : ''} affiché${fallbackResults.length > 1 ? 's' : ''}. Source de secours utilisée.`
        });
      } catch (fallbackError) {
        if (requestId !== nearbySearchRequestRef.current) return;
        console.error('Nearby fallback search error:', fallbackError);
        setActiveNearbyCategory(null);
        setSearchError("Les lieux proches sont momentanément indisponibles. Réessayez dans quelques instants.");
      }
    } finally {
      if (requestId === nearbySearchRequestRef.current) setSearching(false);
    }
  };
  useEffect(() => {
    const otherMemberLocation = members
      .filter(member => member.id !== activeMemberId)
      .map(getMemberCoords)
      .find(Boolean);
    const bestCenter = isSharing
      ? userLocation || activeMemberStoredLocation || otherMemberLocation || favorites[0]?.coords || DEFAULT_MAP_CENTER
      : otherMemberLocation || favorites[0]?.coords || DEFAULT_MAP_CENTER;
    queueMicrotask(() => setMapCenter(bestCenter as [number, number]));
  }, [activeMemberId, activeMemberStoredLocation, favorites, isSharing, members, userLocation]);

  useEffect(() => {
    if (me && me.locationStatus) {
      queueMicrotask(() => setSelectedStatus(me.locationStatus || 'Actif maintenant'));
    }
  }, [me]);

  const addLocationHistoryEntry = useCallback((coords: [number, number], status: string) => {
    if (!activeMemberName) return;
    const entry: LocationHistoryEntry = {
      memberId: activeMemberId,
      memberName: activeMemberName,
      coords,
      status,
      timestamp: new Date().toISOString()
    };
    setLocationHistory(prev => {
      const last = prev[0];
      if (
        last &&
        last.memberId === entry.memberId &&
        getHaversineDistance(last.coords[0], last.coords[1], coords[0], coords[1]) < 0.03 &&
        Date.now() - new Date(last.timestamp).getTime() < 5 * 60 * 1000
      ) {
        return prev;
      }
      return [entry, ...prev].slice(0, 30);
    });
  }, [activeMemberId, activeMemberName]);

  useEffect(() => {
    const requestId = ++geolocationRequestRef.current;

    if (!isSharing) {
      queueMicrotask(() => {
        setUserLocation(null);
        setRouteTarget(null);
        setRoutePoints([]);
        setLoadingLoc(false);
        setLocationError(null);
      });
      return;
    }

    if (navigator.geolocation) {
      queueMicrotask(() => {
        setLoadingLoc(true);
        setLocationError(null);
      });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (requestId !== geolocationRequestRef.current || !isSharingRef.current) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const currentStatus = selectedStatusRef.current;
          setUserLocation([lat, lng]);
          setMapCenter([lat, lng]);
          setLoadingLoc(false);

          const updateMemberProfile = onUpdateMemberProfileRef.current;
          if (updateMemberProfile) {
            updateMemberProfile(activeMemberId, {
              latitude: lat,
              longitude: lng,
              locationStatus: currentStatus,
              lastLocatedAt: new Date().toISOString()
            }).catch((error) => {
              console.error('Unable to publish member location:', error);
              setMapNotice({ type: 'warning', message: "Votre position est visible sur cet appareil, mais sa synchronisation a échoué." });
            });
          }
          addLocationHistoryEntry([lat, lng], currentStatus);
        },
        (err) => {
          if (requestId !== geolocationRequestRef.current || !isSharingRef.current) return;
          console.error("GPS Access Error:", err);
          setLocationError("Position non disponible. Vérifiez l'autorisation GPS de l'appareil.");
          setLoadingLoc(false);
          if (activeMemberStoredLocation) {
            setUserLocation(activeMemberStoredLocation);
            setMapCenter(activeMemberStoredLocation);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    } else {
      queueMicrotask(() => {
        setLocationError("La géolocalisation n'est pas disponible sur cet appareil.");
        setLoadingLoc(false);
      });
    }
  }, [activeMemberId, activeMemberStoredLocation, addLocationHistoryEntry, isSharing]);

  const updateLocationSharing = async (nextVal: boolean) => {
    ++geolocationRequestRef.current;
    isSharingRef.current = nextVal;
    setIsSharing(nextVal);
    localStorage.setItem('mf_share_location', nextVal ? 'true' : 'false');

    if (!nextVal) {
      setUserLocation(null);
      setRouteTarget(null);
      setRoutePoints([]);
      setRouteDistance(null);
      setRouteDuration(null);
      setLocationError(null);
      if (onUpdateMemberProfile) {
        try {
          await onUpdateMemberProfile(activeMemberId, {
            latitude: null,
            longitude: null,
            locationStatus: 'Position masquée 🔒',
            lastLocatedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Unable to disable location sharing:', error);
          setMapNotice({
            type: 'warning',
            message: "La position est masquée sur cet appareil, mais la synchronisation avec le foyer a échoué."
          });
          return;
        }
      }
    }

    setMapNotice({
      type: nextVal ? 'success' : 'info',
      message: nextVal ? 'Partage de position activé.' : 'Position masquée. Votre marqueur disparaît de la carte familiale.'
    });
  };

  // Leaflet custom circular avatar marker creator
  const createCustomIcon = (member: Member, isMe: boolean) => {
    const color = isMe ? '#00D26A' : '#6C5CFF';
    const markerInitials = getMemberInitials(member.name).replace(/[^A-ZÀ-ÖØ-Ý]/g, '') || '?';
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
          <div style="width:40px;height:40px;border-radius:50%;border:3px solid ${color};z-index:10;box-shadow:0 4px 10px rgba(0,0,0,0.5);overflow:hidden;background:#10182b;display:flex;align-items:center;justify-content:center;">
            <span style="font:800 13px sans-serif;color:${color};">${markerInitials}</span>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  };

  const handleStatusChange = async (status: string) => {
    if (status === '🚨 Urgence') {
      setEmergencyConfirmOpen(true);
      return;
    }
    if (status === selectedStatus) return;
    setSelectedStatus(status);
    const coords = routeOrigin;
    try {
      const updateMemberProfile = onUpdateMemberProfileRef.current;
      if (updateMemberProfile) {
        await updateMemberProfile(activeMemberId, {
          locationStatus: status,
          lastLocatedAt: new Date().toISOString()
        });
      }
      if (coords) addLocationHistoryEntry(coords, status);
    } catch (error) {
      console.error('Unable to update location status:', error);
      setMapNotice({ type: 'warning', message: "Le statut n'a pas pu être synchronisé avec le foyer." });
    }
  };

  const handleEmergencyShare = async () => {
    if (emergencySharing) return;
    setEmergencySharing(true);
    setEmergencyConfirmOpen(false);
    setIsSharing(true);
    isSharingRef.current = true;
    localStorage.setItem('mf_share_location', 'true');
    setSelectedStatus('🚨 Urgence');

    const publishEmergency = async (coords: [number, number] | null) => {
      if (onUpdateMemberProfile) {
        await onUpdateMemberProfile(activeMemberId, {
          ...(coords ? { latitude: coords[0], longitude: coords[1] } : {}),
          locationStatus: '🚨 Urgence',
          lastLocatedAt: new Date().toISOString()
        });
      }
      if (coords) {
        setUserLocation(coords);
        setMapCenter(coords);
        addLocationHistoryEntry(coords, '🚨 Urgence');
      }
    };

    if (navigator.geolocation) {
      setLoadingLoc(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            await publishEmergency(coords);
            setLocationError(null);
            setMapNotice({ type: 'success', message: "Alerte et position partagées avec le foyer." });
          } catch (error) {
            console.error('Unable to publish emergency:', error);
            setMapNotice({ type: 'warning', message: "L'alerte d'urgence n'a pas pu être synchronisée. Réessayez." });
          } finally {
            setLoadingLoc(false);
            setEmergencySharing(false);
          }
        },
        async () => {
          try {
            await publishEmergency(routeOrigin);
            setLocationError("Position exacte indisponible. Le statut d'urgence a quand même été publié.");
            setMapNotice({ type: 'warning', message: "Alerte publiée, mais la position exacte reste indisponible." });
          } catch (error) {
            console.error('Unable to publish emergency fallback:', error);
            setMapNotice({ type: 'warning', message: "L'alerte d'urgence n'a pas pu être synchronisée. Réessayez." });
          } finally {
            setLoadingLoc(false);
            setEmergencySharing(false);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
      );
    } else {
      try {
        await publishEmergency(routeOrigin);
        setMapNotice({ type: 'warning', message: "Alerte publiée. La géolocalisation n'est pas disponible sur cet appareil." });
      } catch (error) {
        console.error('Unable to publish emergency without geolocation:', error);
        setMapNotice({ type: 'warning', message: "L'alerte d'urgence n'a pas pu être synchronisée. Réessayez." });
      } finally {
        setEmergencySharing(false);
      }
    }
  };

  // Real-time Nominatim Address Suggestions Autocomplete with Debounce
  useEffect(() => {
    const requestId = ++addressSearchRequestRef.current;
    if (activeNearbyCategory) return;

    if (searchQuery.trim().length < 3) {
      queueMicrotask(() => {
        if (requestId !== addressSearchRequestRef.current) return;
        setSearchResults([]);
        setSearchError(null);
      });
      return;
    }
    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(buildSearchUrl(normalizeMapSearchQuery(searchQuery), routeOrigin), {
          signal: controller.signal
        });
        if (!response.ok) throw new Error('search_failed');
        const data = await response.json() as MapSearchResult[];
        if (requestId !== addressSearchRequestRef.current) return;
        setSearchResults(compactSearchResults(data));
        setSearchError(null);
      } catch (err) {
        if (controller.signal.aborted || requestId !== addressSearchRequestRef.current) return;
        console.error("Nominatim autocompletion error:", err);
        setSearchError("La recherche d'adresse est momentanément indisponible.");
      }
    }, 400);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [activeNearbyCategory, routeOrigin, searchQuery]);

  // Real OSRM Routing calculation
  useEffect(() => {
    if (!routeTarget || !routeOrigin) {
      queueMicrotask(() => {
        setRoutePoints([]);
        setRouteDistance(null);
        setRouteDuration(null);
      });
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
  const handleSelectSearchResult = (result: MapSearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (!isValidMapCoords(lat, lon)) {
      setMapNotice({ type: 'warning', message: "Ce lieu n'a pas de coordonnées exploitables." });
      return;
    }
    const formatted = formatSearchResult(result);
    setMapCenter([lat, lon]);
    setSearchMarker({
      name: formatted.subtitle ? `${formatted.title}, ${formatted.subtitle}` : formatted.title,
      coords: [lat, lon]
    });
    setSearchResults([]);
    setSearchQuery('');
    setSheetState('half');
    setMapNotice({ type: 'info', message: "Lieu sélectionné. Définissez-le comme Maison, École, Travail ou lancez un itinéraire." });
  };

  const focusSearchResult = (result: MapSearchResult) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!isValidMapCoords(lat, lon)) {
      setMapNotice({ type: 'warning', message: "Ce lieu n'a pas de coordonnées exploitables." });
      return;
    }
    const formatted = formatSearchResult(result);
    setMapCenter([lat, lon]);
    setSearchMarker({
      name: formatted.subtitle ? `${formatted.title}, ${formatted.subtitle}` : formatted.title,
      coords: [lat, lon]
    });
    setMapNotice({ type: 'info', message: `${formatted.title} est maintenant centré sur la carte.` });
  };

  const routeToSearchResult = (result: MapSearchResult) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!isValidMapCoords(lat, lon)) return;
    const formatted = formatSearchResult(result);
    clearMapSearch();
    startRouteTo(formatted.title, [lat, lon]);
  };

  const startRouteTo = (name: string, coords: [number, number]) => {
    setMapCenter(coords);
    if (!routeOrigin) {
      setMapNotice({ type: 'warning', message: "Activez ou autorisez votre position pour calculer un itinéraire depuis votre emplacement." });
      return;
    }
    setRouteTarget({ name, coords });
    setMapNotice({ type: 'success', message: `Itinéraire vers ${name} prêt. Vous pouvez aussi l'ouvrir dans Plans.` });
  };

  const openRouteInNativeMaps = () => {
    if (!routeTarget) return;
    const [lat, lng] = routeTarget.coords;
    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
    const travelMode = routeMode === 'walking' ? 'walking' : 'driving';
    const appleMode = routeMode === 'walking' ? 'w' : 'd';
    const origin = routeOrigin ? `${routeOrigin[0]},${routeOrigin[1]}` : undefined;
    const url = isAppleDevice
      ? `https://maps.apple.com/?${origin ? `saddr=${origin}&` : ''}daddr=${lat},${lng}&dirflg=${appleMode}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${origin ? `&origin=${origin}` : ''}&travelmode=${travelMode}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveFavoriteAt = (coords: [number, number], type: FavoritePlace['type'], name?: string, detail?: string) => {
    const label = name || (type === 'home' ? 'Maison' : type === 'work' ? 'Travail' : type === 'school' ? 'École' : 'Lieu favori');
    const existing = favorites.find(f => f.type === type && type !== 'other');
    const nextId = existing?.id || createFavoriteId(type);
    const nextFavorite: FavoritePlace = {
      id: nextId,
      name: label,
      type,
      detail: detail || (type === 'home' ? 'Position du foyer' : type === 'work' ? 'Lieu de travail' : type === 'school' ? 'Établissement scolaire' : 'Lieu favori'),
      coords
    };
    setFavorites(prev => existing
      ? prev.map(f => f.id === existing.id ? nextFavorite : f)
      : [...prev, nextFavorite]
    );
    setMapNotice({
      type: 'success',
      message: existing
        ? `${favoriteTypeLabels[type]} mis à jour.`
        : `${favoriteTypeLabels[type]} ajouté aux lieux familiaux.`
    });
  };

  const openFavoriteEditor = (
    coords: [number, number],
    name: string,
    detail: string = '',
    type: FavoritePlace['type'] = 'other'
  ) => {
    setAddingFavoriteCoords(coords);
    setAddingFavoriteName(name);
    setAddingFavoriteDetail(detail);
    setAddingFavoriteType(type);
    setFavoriteEditorOpen(true);
  };

  const saveFavoriteFromEditor = () => {
    if (!addingFavoriteCoords || !addingFavoriteName.trim()) {
      setMapNotice({ type: 'warning', message: "Ajoutez un nom pour enregistrer ce lieu." });
      return;
    }
    saveFavoriteAt(
      addingFavoriteCoords,
      addingFavoriteType,
      addingFavoriteName.trim(),
      addingFavoriteDetail.trim()
    );
    setFavoriteEditorOpen(false);
    setAddingFavoriteCoords(null);
  };

  // Mapped members with real coordinates only. Unknown locations stay explicit in the list.
  const mappedMembers = members.map((m) => {
    const isMe = m.id === activeMemberId;
    const storedCoords = getMemberCoords(m);
    const pos = isMe ? (isSharing ? routeOrigin : null) : storedCoords;
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
      hasLocation,
      isHiddenOnMap: hiddenMemberIds.includes(m.id)
    };
  });

  const getMemberEtaTargets = (member: { pos: [number, number] | null }) => {
    if (!member.pos) return [];
    return favorites
      .filter(fav => fav.type === 'home' || fav.type === 'school')
      .slice(0, 2)
      .map(fav => {
        const dist = getHaversineDistance(member.pos![0], member.pos![1], fav.coords[0], fav.coords[1]);
        return {
          label: fav.type === 'home' ? 'Maison' : 'École',
          eta: getEstimatedTime(dist),
          distance: dist
        };
      });
  };

  const visibleLocatedMembers = mappedMembers.filter(m => m.pos && !m.isHiddenOnMap).length;
  const membersWithoutLocation = mappedMembers.filter(m => !m.pos).length;
  const locationFreshness = formatLocationFreshness(me?.lastLocatedAt);

  const statuses = [
    { label: 'Maison', value: '🏠 À la maison', icon: HomeIcon },
    { label: 'École', value: '🏫 À l\'école', icon: GraduationCap },
    { label: 'Bureau', value: '💼 Au bureau', icon: Briefcase },
    { label: 'Trajet', value: '🚗 En déplacement', icon: Navigation },
    { label: 'Urgence', value: '🚨 Urgence', icon: Bell }
  ];

  // TileLayer provider switcher
  const darkLayer = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const satLayer = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  return (
    <div className="family-map flex flex-col h-[calc(100vh-80px)] bg-[#07111F] text-white overflow-hidden relative">
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

      {emergencyConfirmOpen && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-[#020712]/75 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-[#FF3B30]/30 bg-[#0F1E36] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF3B30]/15 text-[#FF3B30]">
                <Bell className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={() => setEmergencyConfirmOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-black text-white">Alerter votre famille ?</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/65">
              Votre statut passera en urgence et votre position actuelle sera partagée avec les membres du foyer si elle est disponible.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEmergencyConfirmOpen(false)}
                className="min-h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white/70"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleEmergencyShare}
                disabled={emergencySharing}
                className="min-h-11 rounded-xl bg-[#FF3B30] text-sm font-black text-white shadow-lg shadow-[#FF3B30]/20 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {emergencySharing ? <Crosshair className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                Envoyer l'alerte
              </button>
            </div>
          </div>
        </div>
      )}

      {favoriteEditorOpen && addingFavoriteCoords && (
        <div className="absolute inset-0 z-[2100] flex items-end justify-center bg-[#020712]/70 px-4 pb-5 pt-16 backdrop-blur-sm sm:items-center">
          <div className="family-map-modal w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F1E36] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="family-map-modal-title text-base font-black text-white">Enregistrer ce lieu</p>
                <p className="family-map-muted mt-1 text-xs font-medium text-white/55">Il apparaîtra ensuite dans vos lieux enregistrés.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFavoriteEditorOpen(false);
                  setAddingFavoriteCoords(null);
                }}
                className="family-map-secondary-action flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/65"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="family-map-muted mt-5 block text-[10px] font-black uppercase text-white/45">Type de lieu</label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[
                { type: 'home' as const, label: 'Maison', icon: HomeIcon },
                { type: 'school' as const, label: 'École', icon: GraduationCap },
                { type: 'work' as const, label: 'Travail', icon: Briefcase },
                { type: 'other' as const, label: 'Autre', icon: MapPin }
              ].map(({ type, label, icon: TypeIcon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddingFavoriteType(type)}
                  className={`min-h-14 rounded-xl border px-1 py-2 text-[9px] font-black flex flex-col items-center justify-center gap-1 ${
                    addingFavoriteType === type
                      ? 'border-[#6C5CFF] bg-[#6C5CFF] text-white'
                      : 'family-map-secondary-action border-white/10 bg-white/5 text-white/65'
                  }`}
                >
                  <TypeIcon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <label className="family-map-muted mt-4 block text-[10px] font-black uppercase text-white/45">Nom</label>
            <input
              type="text"
              value={addingFavoriteName}
              onChange={(event) => setAddingFavoriteName(event.target.value)}
              className="family-map-input mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07111F] px-3 text-sm font-bold text-white outline-none"
              placeholder="Ex. Maison, école des enfants..."
            />

            <label className="family-map-muted mt-4 block text-[10px] font-black uppercase text-white/45">Précision facultative</label>
            <input
              type="text"
              value={addingFavoriteDetail}
              onChange={(event) => setAddingFavoriteDetail(event.target.value)}
              className="family-map-input mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07111F] px-3 text-sm font-medium text-white outline-none"
              placeholder="Adresse ou indication"
            />

            <button
              type="button"
              onClick={saveFavoriteFromEditor}
              className="mt-5 min-h-12 w-full rounded-xl bg-[#6C5CFF] text-sm font-black text-white"
            >
              Enregistrer le lieu
            </button>
          </div>
        </div>
      )}

      {/* Floating real search bar */}
      <div className="absolute top-4 left-4 right-4 z-[999] max-w-sm mx-auto">
        <form onSubmit={handleAddressSearch} className="family-map-panel flex items-center space-x-2 bg-[#0F1E36]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl">
          <Search className="family-map-muted w-4 h-4 text-white/50 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveNearbyCategory(null);
            }}
            placeholder="Adresse, école, médecin, commerce..."
            className="family-map-input flex-1 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="h-9 min-w-9 bg-[#6C5CFF] text-white text-[11px] font-extrabold px-3 rounded-xl cursor-pointer hover:bg-[#5849E0] transition disabled:opacity-60 flex items-center justify-center"
          >
            {searching ? <Crosshair className="h-4 w-4 animate-spin" /> : 'OK'}
          </button>
        </form>

        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {nearbyCategories.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => searchNearbyPlaces(key)}
              disabled={searching}
              aria-pressed={activeNearbyCategory === key}
              className={`shrink-0 min-h-9 px-3 py-2 rounded-xl border text-[10px] font-extrabold backdrop-blur-xl active:scale-95 flex items-center gap-1.5 ${
                activeNearbyCategory === key
                  ? 'bg-[#6C5CFF] border-[#8E82FF] text-white shadow-lg shadow-[#6C5CFF]/25'
                  : routeOrigin
                  ? 'family-map-panel border-white/10 text-white/75'
                  : 'family-map-panel border-white/5 text-white/35'
              } disabled:opacity-55`}
              title={routeOrigin ? `${label} à moins de 5 km` : 'Activez votre position pour rechercher à proximité'}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {mapNotice && !hasSearchOverlay && (
          <div className={`family-map-notice mt-2 rounded-2xl border px-3 py-2 backdrop-blur-xl shadow-2xl flex items-start justify-between gap-2 ${
            mapNotice.type === 'success'
              ? 'bg-[#00D26A]/15 border-[#00D26A]/25'
              : mapNotice.type === 'warning'
              ? 'bg-[#FFB020]/15 border-[#FFB020]/25'
              : 'bg-[#6C5CFF]/15 border-[#6C5CFF]/25'
          }`}>
            <p className="text-[10px] text-white/85 font-bold leading-normal">{mapNotice.message}</p>
            <button
              type="button"
              onClick={() => setMapNotice(null)}
              className="family-map-muted text-[10px] text-white/45 hover:text-white font-black"
            >
              OK
            </button>
          </div>
        )}

        {searching && searchResults.length === 0 && (
          <div className="family-map-panel mt-2 rounded-2xl border border-white/10 bg-[#0F1E36]/95 p-3 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="family-map-muted flex items-center gap-2 text-[11px] font-bold text-white/65">
                <Crosshair className="h-4 w-4 animate-spin text-[#00D26A]" />
                Recherche à moins de 5 km...
              </div>
              <button type="button" onClick={clearMapSearch} className="family-map-muted p-1 text-white/55" title="Annuler">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Nominatim Search Results Floating Panel */}
        {searchResults.length > 0 && (
          <div className="family-map-results mt-2 bg-[#0F1E36]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-1.5 pb-1.5">
              <p className="family-map-muted text-[10px] font-black text-white/60">
                {searchResults.length} lieu{searchResults.length > 1 ? 'x' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
              </p>
              <button type="button" onClick={clearMapSearch} className="family-map-muted p-1 text-white/55" title="Fermer les résultats">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[min(32vh,230px)] overflow-y-auto space-y-1">
            {searchResults.map((res, idx) => {
              const formatted = formatSearchResult(res);
              const isNearby = Boolean(res.nearbyCategory);
              return (
                <div
                  key={idx}
                  className="family-map-result-item w-full rounded-xl p-2.5 text-left text-white transition font-medium"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-white"
                      style={{ backgroundColor: isNearby ? nearbyMarkerColors[res.nearbyCategory as NearbyCategory] : '#6C5CFF' }}
                    />
                    <div className="min-w-0 flex-1">
                    <span className="text-[12px] font-extrabold text-white flex items-center gap-1.5">
                    <span className="truncate">{formatted.title}</span>
                    {typeof res.distanceKm === 'number' && (
                      <span className="family-map-distance ml-auto shrink-0 rounded-lg bg-[#00D26A]/10 px-2 py-1 text-[10px] text-[#00D26A]">
                        {res.distanceKm < 1 ? `${Math.round(res.distanceKm * 1000)} m` : `${res.distanceKm.toFixed(1)} km`}
                      </span>
                    )}
                    </span>
                    <span className="family-map-muted text-[10px] text-white/50 block truncate mt-1">{formatted.subtitle}</span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => focusSearchResult(res)}
                      className="family-map-secondary-action min-h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black text-white flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Voir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lat = Number(res.lat);
                        const lon = Number(res.lon);
                        if (!isValidMapCoords(lat, lon)) return;
                        openFavoriteEditor([lat, lon], formatted.title, formatted.subtitle);
                      }}
                      className="family-map-secondary-action min-h-9 rounded-lg border border-white/10 bg-white/5 px-1 text-[9px] font-black text-white flex items-center justify-center gap-1"
                    >
                      <HomeIcon className="h-3.5 w-3.5" />
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => routeToSearchResult(res)}
                      className="min-h-9 rounded-lg bg-[#00D26A] px-2 text-[10px] font-black text-[#07111F] flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Y aller
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {searchError && (
          <div className="family-map-error mt-2 bg-[#FF4D6D]/15 backdrop-blur-xl border border-[#FF4D6D]/25 rounded-2xl p-3 shadow-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#FF4D6D] shrink-0 mt-0.5" />
            <p className="min-w-0 flex-1 text-[10px] text-white/80 font-semibold leading-normal">{searchError}</p>
            <button type="button" onClick={clearMapSearch} className="family-map-muted p-1 text-white/55" title="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* FLOATING MAP LAYER STYLE SWITCHER */}
      <div className={`absolute top-[8.75rem] right-4 z-[998] flex flex-col space-y-2 transition-opacity ${
        hasSearchOverlay || routeTarget ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}>
        <button
          onClick={() => setEmergencyConfirmOpen(true)}
          className="p-3 bg-[#FF3B30]/90 backdrop-blur-md rounded-2xl border border-[#FF3B30]/60 shadow-xl transition active:scale-95 flex items-center justify-center cursor-pointer text-white"
          title="Déclencher une alerte familiale"
        >
          <Bell className="w-4.5 h-4.5" />
        </button>

        {/* Toggle Location Sharing */}
        <button
          onClick={() => updateLocationSharing(!isSharing)}
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
              setMapNotice({ type: 'warning', message: "Activez le partage de position pour vous géolocaliser." });
              return;
            }
            if (navigator.geolocation) {
              const requestId = ++geolocationRequestRef.current;
              setLoadingLoc(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  if (requestId !== geolocationRequestRef.current || !isSharingRef.current) return;
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  setUserLocation([lat, lng]);
                  setMapCenter([lat, lng]);
                  setLocationError(null);
                  setLoadingLoc(false);
                  addLocationHistoryEntry([lat, lng], selectedStatus);
                },
                (err) => {
                  if (requestId !== geolocationRequestRef.current || !isSharingRef.current) return;
                  console.error(err);
                  setLocationError("Position non disponible. Vérifiez l'autorisation GPS de l'appareil.");
                  setLoadingLoc(false);
                },
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
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
          <FamilyMapErrorBoundary>
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
            
            {nearbyResultCoords.length === 0 && <CenterMap center={mapCenter} />}
            <FitNearbyBounds points={nearbyResultCoords} origin={routeOrigin} />

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

            {searchResults.filter(result => result.nearbyCategory).map((result, index) => {
              const lat = Number(result.lat);
              const lon = Number(result.lon);
              const category = result.nearbyCategory as NearbyCategory;
              const formatted = formatSearchResult(result);
              if (!isValidMapCoords(lat, lon)) return null;
              return (
                <CircleMarker
                  key={`nearby-${category}-${lat.toFixed(5)}-${lon.toFixed(5)}-${index}`}
                  center={[lat, lon]}
                  radius={9}
                  pathOptions={getNearbyMarkerStyle(category)}
                >
                  <Popup closeButton={false}>
                    <div className="min-w-[180px] p-1 text-left text-white">
                      <span className="block text-xs font-black text-white">{formatted.title}</span>
                      <span className="mt-1 block text-[9px] leading-normal text-white/55">{formatted.subtitle}</span>
                      {typeof result.distanceKm === 'number' && (
                        <span className="mt-2 inline-flex rounded-lg bg-[#00D26A]/12 px-2 py-1 text-[9px] font-black text-[#00D26A]">
                          {result.distanceKm < 1 ? `${Math.round(result.distanceKm * 1000)} m` : `${result.distanceKm.toFixed(1)} km`} de vous
                        </span>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectSearchResult(result)}
                          className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-[9px] font-black text-white"
                        >
                          Détails
                        </button>
                        <button
                          type="button"
                          onClick={() => startRouteTo(formatted.title, [lat, lon])}
                          className="min-h-9 rounded-lg bg-[#6C5CFF] px-2 text-[9px] font-black text-white"
                        >
                          Itinéraire
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Search Marker placed temporarily on the map */}
            {searchMarker && (
              <CircleMarker
                center={searchMarker.coords}
                radius={11}
                pathOptions={{ color: '#FFFFFF', fillColor: '#6C5CFF', fillOpacity: 1, weight: 3 }}
              />
            )}

            {/* Mapped Family Members Markers */}
            {mappedMembers.filter((m) => m.pos && !m.isHiddenOnMap).map((m) => (
              <Marker
                key={m.id}
                position={m.pos as [number, number]}
                icon={createCustomIcon(m as Member, m.isMe)}
                bubblingMouseEvents={false}
                eventHandlers={{
                  click: () => {
                    if (m.isMe) setSheetState('half');
                  }
                }}
              >
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
                  bubblingMouseEvents={false}
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
          </FamilyMapErrorBoundary>
        </div>

        {/* Route Details Overlay Banner */}
        {routeTarget && (
          <div className="absolute top-[8.75rem] left-4 right-4 z-[998] bg-[#0F1E36]/95 backdrop-blur-xl text-white border border-[#00D26A]/30 px-3.5 py-3 rounded-2xl shadow-2xl space-y-2">
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
                <p className="text-[9px] text-white/40 font-semibold mt-1">
                  L'itinéraire local donne une estimation. Ouvrez Plans pour la navigation GPS complète.
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
                <span className="flex items-center justify-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  Voiture
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRouteMode('walking')}
                className={`py-2 rounded-xl text-[9px] font-black uppercase transition ${
                  routeMode === 'walking' ? 'bg-[#00D26A] text-[#07111F]' : 'bg-white/5 text-white/55'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Footprints className="h-3.5 w-3.5" />
                  À pied
                </span>
              </button>
              <button
                type="button"
                onClick={openRouteInNativeMaps}
                className="py-2 rounded-xl bg-[#6C5CFF] text-white text-[9px] font-black uppercase shadow-lg shadow-[#6C5CFF]/20 flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Plans
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
                <span className="text-[11px] font-bold text-white/65 flex items-center space-x-1.5">
                  <Navigation className="w-4 h-4 text-[#6C5CFF]" />
                    <span>Carte familiale ({visibleLocatedMembers}/{members.length})</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLocationSharing(!isSharing);
                    }}
                    className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                      isSharing
                        ? 'bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]'
                        : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
                    }`}
                  >
                    {isSharing ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {isSharing ? 'Partagée' : 'Masquée'}
                  </button>
                  {sheetState === 'collapsed'
                    ? <ChevronUp className="h-4 w-4 text-white/50" />
                    : <ChevronDown className="h-4 w-4 text-white/50" />}
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

            {sheetState === 'half' && <>
            {!isSharing && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/8 flex items-start space-x-2.5">
                <LockKeyhole className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-white/75 font-bold leading-normal">Position privée</p>
                  <p className="mt-0.5 text-[10px] text-white/50 font-semibold leading-normal">
                    Aucun membre du foyer ne voit votre position. Dernière synchronisation : {locationFreshness}.
                  </p>
                </div>
              </div>
            )}

            {isSharing && (
              <div className="p-3 rounded-2xl bg-[#00D26A]/8 border border-[#00D26A]/15 flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-white/80 font-bold leading-normal">Visible par votre foyer uniquement</p>
                  <p className="mt-0.5 text-[10px] text-white/50 font-semibold leading-normal">
                    Position synchronisée : {locationFreshness}. Vous pouvez la masquer à tout moment.
                  </p>
                </div>
              </div>
            )}

            <div>
            <p className="mb-2 text-[9px] font-black uppercase text-white/35">Mon statut</p>
            <div className="grid grid-cols-5 gap-1.5">
              {statuses.map((s) => {
                const isActive = selectedStatus === s.value;
                const isUrgent = s.value === '🚨 Urgence';
                const StatusIcon = s.icon;
                
                return (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={`min-h-14 py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center space-y-1.5 active:scale-95 border ${
                      isActive
                        ? isUrgent
                          ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/30 font-black'
                          : 'bg-[#00D26A] border-[#00D26A] text-[#07111F] shadow-lg shadow-[#00D26A]/20 font-black'
                        : isUrgent
                        ? 'bg-transparent border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/10'
                        : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    <span className="font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </div>
            </div>
            </>}

            {/* EXPANDED CONTENT: Favorites addresses & Family Members Cards */}
            {sheetState === 'half' && (
              <div className="pt-3 border-t border-white/5 space-y-4 max-h-[42vh] overflow-y-auto no-scrollbar animate-fade-in">
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-2xl border border-[#00D26A]/15 bg-[#00D26A]/8 p-2 text-center">
                    <p className="text-sm font-black text-[#00D26A]">{visibleLocatedMembers}</p>
                    <p className="text-[10px] font-bold text-white/50">Visibles</p>
                  </div>
                  <div className="rounded-2xl border border-[#6C5CFF]/15 bg-[#6C5CFF]/8 p-2 text-center">
                    <p className="text-sm font-black text-[#9E94FF]">{favorites.length}</p>
                    <p className="text-[10px] font-bold text-white/50">Lieux</p>
                  </div>
                  <div className="rounded-2xl border border-[#FFB020]/15 bg-[#FFB020]/8 p-2 text-center">
                    <p className="text-sm font-black text-[#FFB020]">{membersWithoutLocation}</p>
                    <p className="text-[10px] font-bold text-white/50">Masqués</p>
                  </div>
                </div>
                
                {/* 1. Address Favorites Panel */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Lieux enregistrés</span>
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
                    <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 p-3">
                      <button
                        type="button"
                        onClick={() => openFavoriteEditor(routeOrigin, 'Ma position actuelle', '', 'home')}
                        className="w-full min-h-11 rounded-xl bg-[#6C5CFF] px-3 text-xs font-black text-white flex items-center justify-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        Enregistrer ma position actuelle
                      </button>
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
                            onChange={(e) => setAddingFavoriteType(e.target.value as FavoritePlace['type'])}
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
                          onClick={() => {
                            setAddingFavoriteCoords(null);
                            setMapNotice({ type: 'info', message: "Ajout de lieu annulé." });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-[9px] font-bold cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!addingFavoriteName.trim()) {
                              setMapNotice({ type: 'warning', message: "Ajoutez un nom pour enregistrer ce lieu." });
                              return;
                            }
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
                            setMapNotice({ type: 'success', message: `${newFav.name} ajouté aux lieux familiaux.` });
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
                            onChange={(e) => setEditFavType(e.target.value as FavoritePlace['type'])}
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
                            if (!editFavName.trim()) {
                              setMapNotice({ type: 'warning', message: "Ajoutez un nom pour enregistrer ce lieu." });
                              return;
                            }
                            setFavorites(prev => prev.map(f => f.id === editingFavoriteId ? {
                              ...f,
                              name: editFavName.trim(),
                              type: editFavType,
                              detail: editFavDetail.trim()
                            } : f));
                            setEditingFavoriteId(null);
                            setMapNotice({ type: 'success', message: `${editFavName.trim()} mis à jour.` });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#6C5CFF] text-white text-[9px] font-bold hover:opacity-90 cursor-pointer shadow-md"
                        >
                          Sauver
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {favorites.length === 0 && (
                      <div className="col-span-3 p-3 rounded-2xl bg-white/5 border border-dashed border-white/10 text-[10px] text-white/50 font-semibold leading-normal">
                        Aucun lieu favori. Recherchez une adresse, sélectionnez un résultat, puis choisissez Maison, École ou Travail.
                      </div>
                    )}

                    {favorites.map((fav) => {
                      const FavIcon = getFavoriteIcon(fav.type);
                      const dist = routeOrigin ? getHaversineDistance(routeOrigin[0], routeOrigin[1], fav.coords[0], fav.coords[1]) : null;
                      
                      return (
                        <div
                          key={fav.id}
                          className="relative p-3 bg-white/5 border border-white/5 rounded-2xl text-left space-y-2 block group"
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
                              setMapCenter(fav.coords);
                            }}
                            className="w-full text-left space-y-1 transition active:scale-95 cursor-pointer block focus:outline-none"
                            disabled={isEditingFavorites}
                          >
                            <div className="flex items-center space-x-2 pr-6">
                              <div className="h-7 w-7 rounded-xl bg-[#FFB020]/12 border border-[#FFB020]/20 flex items-center justify-center shrink-0">
                                <FavIcon className="w-3.5 h-3.5 text-[#FFB020]" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] font-black text-white truncate block">{fav.name}</span>
                                <span className="text-[8px] text-[#FFB020] font-bold block">{favoriteTypeLabels[fav.type]} · {getFavoriteTypeDescription(fav.type)}</span>
                              </div>
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
                          {!isEditingFavorites && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
                              <button
                                type="button"
                                onClick={() => setMapCenter(fav.coords)}
                                className="py-1.5 rounded-xl bg-white/5 border border-white/8 text-[8px] font-black text-white/55 flex items-center justify-center gap-1"
                              >
                                <MapPin className="h-3 w-3" />
                                Voir
                              </button>
                              <button
                                type="button"
                                onClick={() => startRouteTo(fav.name, fav.coords)}
                                className="py-1.5 rounded-xl bg-[#00D26A]/15 border border-[#00D26A]/20 text-[8px] font-black text-[#00D26A] flex items-center justify-center gap-1"
                              >
                                <Route className="h-3 w-3" />
                                Itinéraire
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Family Members detailed list */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Statut complet de la famille</span>
                  
                  <div className="space-y-1.5">
                    {mappedMembers.map((m) => {
                      const etaTargets = getMemberEtaTargets(m);
                      return (
                        <div 
                          key={m.id}
                          className="p-2.5 bg-white/5 border border-white/5 rounded-2xl space-y-2 hover:bg-white/8 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <MemberAvatar name={m.name} photoUrl={m.photoUrl} className="w-8 h-8 rounded-full border border-white/10" />
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

                            <div className="flex items-center space-x-1.5 shrink-0">
                              {!m.isMe && m.distance !== null && m.eta && (
                                <div className="text-right">
                                  <span className="text-[9px] font-extrabold text-[#00D26A] block">{m.distance.toFixed(1)} km</span>
                                  <span className="text-[8px] text-white/40 block font-medium">{m.eta}</span>
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  setHiddenMemberIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]);
                                }}
                                className={`p-1.5 rounded-lg transition ${
                                  m.isHiddenOnMap
                                    ? 'bg-[#FFB020]/15 text-[#FFB020]'
                                    : 'bg-white/5 text-white/35 hover:text-white/70'
                                }`}
                                title={m.isHiddenOnMap ? "Réafficher sur la carte" : "Masquer localement sur la carte"}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                              
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
                                title={m.pos ? (m.isMe ? "Voir ma position" : "Itinéraire vers ce membre") : "Position non partagée"}
                              >
                                {m.isMe ? <Eye className="w-3.5 h-3.5" /> : <Route className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {(etaTargets.length > 0 || m.isHiddenOnMap) && (
                            <div className="flex flex-wrap gap-1.5 pl-10">
                              {etaTargets.map(target => (
                                <span key={`${m.id}-${target.label}`} className="text-[8px] font-black px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-white/45 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {target.label}: {target.eta}
                                </span>
                              ))}
                              {m.isHiddenOnMap && (
                                <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-[#FFB020]/10 border border-[#FFB020]/20 text-[#FFB020]">
                                  Masqué sur cette carte
                                </span>
                              )}
                            </div>
                          )}
                          {!m.pos && (
                            <div className="pl-10">
                              <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-white/40">
                                Position non partagée pour le moment
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block">Historique récent</span>
                    {locationHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLocationHistory([])}
                        className="text-[9px] text-white/35 font-bold hover:text-white/70"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  {locationHistory.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-white/5 border border-dashed border-white/10 text-[10px] text-white/45 font-semibold">
                      L'historique se remplit quand une position réelle est partagée.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {locationHistory.slice(0, 5).map((entry) => (
                        <button
                          key={`${entry.memberId}-${entry.timestamp}`}
                          type="button"
                          onClick={() => setMapCenter(entry.coords)}
                          className="w-full p-2 rounded-xl bg-white/5 border border-white/5 text-left flex items-center justify-between"
                        >
                          <span className="min-w-0">
                            <span className="text-[10px] font-bold text-white block truncate">{entry.memberName}</span>
                            <span className="text-[8px] text-white/40 block truncate">{entry.status}</span>
                          </span>
                          <span className="text-[8px] text-white/35 font-bold shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
