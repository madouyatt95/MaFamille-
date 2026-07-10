import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { FamilyRootCoordinates } from '../utils/familyRootsGeo';
import type { FamilyTreeProfile } from '../services/familyRootsService';
import './family-roots-leaflet.css';

export type FamilyRootsMapMarker = {
  id: string;
  name: string;
  location: string;
  isLocal: boolean;
  profile: FamilyTreeProfile;
  coordinates: FamilyRootCoordinates;
};

type FamilyRootsWorldMapProps = {
  markers: FamilyRootsMapMarker[];
  onSelect: (profile: FamilyTreeProfile) => void;
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character] || character));

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

const markerIcon = (marker: FamilyRootsMapMarker) => {
  const photo = marker.profile.photoUrl
    ? `<img src="${escapeHtml(marker.profile.photoUrl)}" alt="" />`
    : `<span>${escapeHtml(initials(marker.profile.displayName))}</span>`;
  return L.divIcon({
    className: 'fr-leaflet-marker-shell',
    html: `<div class="fr-leaflet-marker ${marker.isLocal ? 'is-local' : ''}">${photo}<b>${escapeHtml(marker.name)}</b></div>`,
    iconSize: [72, 56],
    iconAnchor: [36, 28],
    popupAnchor: [0, -25]
  });
};

export default function FamilyRootsWorldMap({ markers, onSelect }: FamilyRootsWorldMapProps) {
  const [dark, setDark] = useState(() => !document.documentElement.classList.contains('theme-light') && !document.documentElement.classList.contains('theme-sepia'));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(!document.documentElement.classList.contains('theme-light') && !document.documentElement.classList.contains('theme-sepia')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const local = markers.find(marker => marker.isLocal) || markers[0];
  const routes = useMemo(() => local ? markers.filter(marker => marker.id !== local.id).map(marker => [
    [local.coordinates.latitude, local.coordinates.longitude],
    [marker.coordinates.latitude, marker.coordinates.longitude]
  ] as [[number, number], [number, number]]) : [], [local, markers]);

  return (
    <MapContainer className="fr-leaflet-map" center={[18, 0]} zoom={2} minZoom={1} maxZoom={8} worldCopyJump scrollWheelZoom>
      <TileLayer
        key={dark ? 'dark' : 'light'}
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url={dark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
      />
      {routes.map((route, index) => <Polyline key={index} positions={route} pathOptions={{ color: index % 2 ? '#2ea86b' : '#7b55da', weight: 2, opacity: 0.62, dashArray: '6 7' }} />)}
      {markers.map(marker => <Marker key={marker.id} position={[marker.coordinates.latitude, marker.coordinates.longitude]} icon={markerIcon(marker)} eventHandlers={{ click: () => onSelect(marker.profile) }}>
        <Popup><strong>{marker.name}</strong><br />{marker.location}<br />{marker.profile.displayName}</Popup>
      </Marker>)}
    </MapContainer>
  );
}
