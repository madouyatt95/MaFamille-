export interface MerchantBrand {
  id: string;
  name: string;
  aliases: string[];
  shortLabel: string;
  foreground: string;
  background: string;
  category?: string;
  subCategory?: string;
}

const normalizeMerchantText = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\b(?:cb|carte|paiement|payment|apple pay|france|sas|sarl|sa)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const MERCHANT_BRANDS: MerchantBrand[] = [
  { id: 'carrefour', name: 'Carrefour', aliases: ['carrefour market', 'carrefour city', 'carrefour contact', 'carrefour express'], shortLabel: 'C', foreground: '#FFFFFF', background: '#1557B0', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'leclerc', name: 'E.Leclerc', aliases: ['e leclerc', 'leclerc', 'leclerc drive'], shortLabel: 'L', foreground: '#FFFFFF', background: '#1674C8', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'auchan', name: 'Auchan', aliases: ['auchan retail', 'auchan supermarche'], shortLabel: 'A', foreground: '#E11D2E', background: '#FFFFFF', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'intermarche', name: 'Intermarché', aliases: ['intermarche', 'inter marche'], shortLabel: 'I', foreground: '#E30613', background: '#FFFFFF', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'lidl', name: 'Lidl', aliases: ['lidl france'], shortLabel: 'L', foreground: '#0050AA', background: '#FFED00', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'aldi', name: 'ALDI', aliases: ['aldi marche'], shortLabel: 'A', foreground: '#FFFFFF', background: '#001E50', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'monoprix', name: 'Monoprix', aliases: ['monop', 'monoprix'], shortLabel: 'M', foreground: '#FFFFFF', background: '#D71920', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'franprix', name: 'Franprix', aliases: ['franprix'], shortLabel: 'F', foreground: '#FFFFFF', background: '#F05A28', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'picard', name: 'Picard', aliases: ['picard surgeles'], shortLabel: 'P', foreground: '#FFFFFF', background: '#0069B4', category: 'Alimentation', subCategory: 'Supermarché' },
  { id: 'mcdonalds', name: "McDonald's", aliases: ['mcdonalds', 'mc donald', 'mcdo', 'mcd'], shortLabel: 'M', foreground: '#FFC72C', background: '#DA291C', category: 'Alimentation', subCategory: 'Restaurant' },
  { id: 'burger-king', name: 'Burger King', aliases: ['burger king', 'bk france'], shortLabel: 'BK', foreground: '#D62300', background: '#FFB500', category: 'Alimentation', subCategory: 'Restaurant' },
  { id: 'kfc', name: 'KFC', aliases: ['kfc france'], shortLabel: 'KFC', foreground: '#FFFFFF', background: '#E4002B', category: 'Alimentation', subCategory: 'Restaurant' },
  { id: 'starbucks', name: 'Starbucks', aliases: ['starbucks coffee'], shortLabel: 'S', foreground: '#FFFFFF', background: '#00754A', category: 'Alimentation', subCategory: 'Restaurant' },
  { id: 'amazon', name: 'Amazon', aliases: ['amazon eu', 'amazon fr', 'amzn', 'amazon marketplace'], shortLabel: 'a', foreground: '#FF9900', background: '#131A22', category: 'Autres', subCategory: 'Divers' },
  { id: 'fnac', name: 'Fnac', aliases: ['fnac direct', 'fnac paris'], shortLabel: 'fnac', foreground: '#111111', background: '#F4D000', category: 'Autres', subCategory: 'Divers' },
  { id: 'ikea', name: 'IKEA', aliases: ['ikea france'], shortLabel: 'IKEA', foreground: '#FFDA1A', background: '#0058A3', category: 'Logement', subCategory: 'Travaux' },
  { id: 'leroy-merlin', name: 'Leroy Merlin', aliases: ['leroy merlin'], shortLabel: 'LM', foreground: '#FFFFFF', background: '#57A639', category: 'Logement', subCategory: 'Travaux' },
  { id: 'decathlon', name: 'Decathlon', aliases: ['decathlon france'], shortLabel: 'D', foreground: '#FFFFFF', background: '#007DBC', category: 'Loisirs', subCategory: 'Sport' },
  { id: 'sncf', name: 'SNCF', aliases: ['sncf connect', 'sncf voyageurs', 'oui sncf'], shortLabel: 'SNCF', foreground: '#FFFFFF', background: '#8A0B5C', category: 'Transport', subCategory: 'Transport public' },
  { id: 'ratp', name: 'RATP', aliases: ['ratp', 'ratp smart systems'], shortLabel: 'RATP', foreground: '#FFFFFF', background: '#00A88F', category: 'Transport', subCategory: 'Transport public' },
  { id: 'uber', name: 'Uber', aliases: ['uber trip', 'uber bv'], shortLabel: 'U', foreground: '#FFFFFF', background: '#000000', category: 'Transport', subCategory: 'Uber' },
  { id: 'bolt', name: 'Bolt', aliases: ['bolt eu', 'bolt ride'], shortLabel: 'B', foreground: '#FFFFFF', background: '#2F8B57', category: 'Transport', subCategory: 'Taxi' },
  { id: 'totalenergies', name: 'TotalEnergies', aliases: ['total energies', 'totalenergies', 'total station'], shortLabel: 'T', foreground: '#FFFFFF', background: '#E1251B', category: 'Transport', subCategory: 'Essence' },
  { id: 'esso', name: 'Esso', aliases: ['esso station'], shortLabel: 'Esso', foreground: '#E31837', background: '#FFFFFF', category: 'Transport', subCategory: 'Essence' },
  { id: 'orange', name: 'Orange', aliases: ['orange france', 'orange sa'], shortLabel: 'orange', foreground: '#FFFFFF', background: '#F16E00', category: 'Abonnements', subCategory: 'Téléphone' },
  { id: 'free', name: 'Free', aliases: ['free mobile', 'free telecom'], shortLabel: 'free', foreground: '#D71920', background: '#FFFFFF', category: 'Abonnements', subCategory: 'Téléphone' },
  { id: 'sfr', name: 'SFR', aliases: ['sfr fibre', 'sfr mobile'], shortLabel: 'SFR', foreground: '#FFFFFF', background: '#E2001A', category: 'Abonnements', subCategory: 'Téléphone' },
  { id: 'netflix', name: 'Netflix', aliases: ['netflix com'], shortLabel: 'N', foreground: '#E50914', background: '#000000', category: 'Abonnements', subCategory: 'Streaming' },
  { id: 'spotify', name: 'Spotify', aliases: ['spotify france'], shortLabel: 'S', foreground: '#191414', background: '#1ED760', category: 'Abonnements', subCategory: 'Streaming' },
  { id: 'apple', name: 'Apple', aliases: ['apple com bill', 'apple store', 'itunes com bill'], shortLabel: 'A', foreground: '#FFFFFF', background: '#111111', category: 'Autres', subCategory: 'Divers' }
];

export const findMerchantBrand = (merchant: string): MerchantBrand | null => {
  const normalized = normalizeMerchantText(merchant);
  if (!normalized) return null;

  return MERCHANT_BRANDS.find((brand) => {
    const candidates = [brand.name, ...brand.aliases].map(normalizeMerchantText);
    return candidates.some((candidate) => normalized === candidate || normalized.includes(candidate));
  }) || null;
};

export const cleanMerchantName = (merchant: string): string => {
  const trimmed = merchant.replace(/\s+/g, ' ').trim();
  return findMerchantBrand(trimmed)?.name || trimmed;
};
