export type FamilyRootCoordinates = {
  latitude: number;
  longitude: number;
  label: string;
};

const normalize = (value?: string) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const cities: Record<string, FamilyRootCoordinates> = {
  'paris france': { latitude: 48.8566, longitude: 2.3522, label: 'Paris, France' },
  'marseille france': { latitude: 43.2965, longitude: 5.3698, label: 'Marseille, France' },
  'lyon france': { latitude: 45.764, longitude: 4.8357, label: 'Lyon, France' },
  'dakar senegal': { latitude: 14.7167, longitude: -17.4677, label: 'Dakar, Sénégal' },
  'bamako mali': { latitude: 12.6392, longitude: -8.0029, label: 'Bamako, Mali' },
  'abidjan cote d ivoire': { latitude: 5.36, longitude: -4.0083, label: 'Abidjan, Côte d’Ivoire' },
  'moroni comores': { latitude: -11.7172, longitude: 43.2473, label: 'Moroni, Comores' },
  'new york usa': { latitude: 40.7128, longitude: -74.006, label: 'New York, USA' },
  'new york etats unis': { latitude: 40.7128, longitude: -74.006, label: 'New York, USA' },
  'montreal canada': { latitude: 45.5019, longitude: -73.5674, label: 'Montréal, Canada' },
  'bruxelles belgique': { latitude: 50.8503, longitude: 4.3517, label: 'Bruxelles, Belgique' }
};

const countries: Record<string, FamilyRootCoordinates> = {
  france: { latitude: 46.2276, longitude: 2.2137, label: 'France' },
  senegal: { latitude: 14.4974, longitude: -14.4524, label: 'Sénégal' },
  mali: { latitude: 17.5707, longitude: -3.9962, label: 'Mali' },
  'cote d ivoire': { latitude: 7.54, longitude: -5.5471, label: 'Côte d’Ivoire' },
  comores: { latitude: -11.6455, longitude: 43.3333, label: 'Comores' },
  usa: { latitude: 39.7837, longitude: -100.4459, label: 'USA' },
  'etats unis': { latitude: 39.7837, longitude: -100.4459, label: 'USA' },
  canada: { latitude: 56.1304, longitude: -106.3468, label: 'Canada' },
  belgique: { latitude: 50.5039, longitude: 4.4699, label: 'Belgique' }
};

export const getFamilyRootCoordinates = (city?: string, country?: string): FamilyRootCoordinates | null => {
  const normalizedCity = normalize(city);
  const normalizedCountry = normalize(country);
  if (normalizedCity && normalizedCountry && cities[`${normalizedCity} ${normalizedCountry}`]) {
    return cities[`${normalizedCity} ${normalizedCountry}`];
  }
  if (normalizedCountry && countries[normalizedCountry]) return countries[normalizedCountry];
  return null;
};

export const getMapPosition = ({ latitude, longitude }: FamilyRootCoordinates) => ({
  left: `${Math.min(97, Math.max(3, ((longitude + 180) / 360) * 100))}%`,
  top: `${Math.min(91, Math.max(8, ((90 - latitude) / 180) * 100))}%`
});
