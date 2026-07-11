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
  ,{ id: 'auchan-senegal', name: 'Auchan Sénégal', aliases: ['auchan senegal', 'auchan dakar', 'auchan keur massar', 'auchan mermoz'], shortLabel: 'A', foreground: '#E11D2E', background: '#FFFFFF', category: 'Alimentation', subCategory: 'Supermarché' }
  ,{ id: 'edk', name: 'EDK', aliases: ['edk senegal', 'edk oil', 'edk supermarket'], shortLabel: 'EDK', foreground: '#FFFFFF', background: '#E31E24', category: 'Alimentation', subCategory: 'Supermarché' }
  ,{ id: 'exclusive', name: 'Exclusive', aliases: ['exclusive senegal', 'exclusive supermarche'], shortLabel: 'EX', foreground: '#FFFFFF', background: '#128B45', category: 'Alimentation', subCategory: 'Supermarché' }
  ,{ id: 'wave', name: 'Wave', aliases: ['wave mobile money', 'wave senegal', 'wave mali', 'wave ci'], shortLabel: 'W', foreground: '#111827', background: '#6AD5FF', category: 'Autres', subCategory: 'Divers' }
  ,{ id: 'orange-money', name: 'Orange Money', aliases: ['orange money', 'om senegal', 'om mali'], shortLabel: 'OM', foreground: '#FFFFFF', background: '#F16E00', category: 'Autres', subCategory: 'Divers' }
  ,{ id: 'free-money', name: 'Free Money', aliases: ['free money senegal', 'free money'], shortLabel: 'FM', foreground: '#FFFFFF', background: '#D71920', category: 'Autres', subCategory: 'Divers' }
  ,{ id: 'glovo', name: 'Glovo', aliases: ['glovoapp', 'glovo senegal', 'glovo france'], shortLabel: 'G', foreground: '#1D1D1B', background: '#FFC244', category: 'Alimentation', subCategory: 'Restaurant' }
  ,{ id: 'yassir', name: 'Yassir', aliases: ['yassir ride', 'yassir senegal', 'yassir france'], shortLabel: 'Y', foreground: '#FFFFFF', background: '#6C3BFF', category: 'Transport', subCategory: 'Taxi' }
  ,{ id: 'jumia', name: 'Jumia', aliases: ['jumia senegal', 'jumia pay', 'jumia food'], shortLabel: 'J', foreground: '#FFFFFF', background: '#F68B1E', category: 'Autres', subCategory: 'Divers' }
  ,{ id: 'air-senegal', name: 'Air Sénégal', aliases: ['air senegal', 'airsenegal'], shortLabel: 'AS', foreground: '#FFFFFF', background: '#00853F', category: 'Voyages', subCategory: 'Billets' }
];

const levenshteinDistance = (left: string, right: string): number => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return previous[right.length];
};

export const normalizeMerchantKey = (merchant: string): string => normalizeMerchantText(merchant)
  .replace(/\b\d{2,}\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const findMerchantBrandByExplicitAlias = (merchant: string): MerchantBrand | null => {
  const normalized = normalizeMerchantKey(merchant);
  if (!normalized) return null;
  return MERCHANT_BRANDS
    .flatMap(brand => [brand.name, ...brand.aliases].map(alias => ({ brand, alias: normalizeMerchantText(alias) })))
    .filter(candidate => candidate.alias && (
      normalized === candidate.alias
      || normalized.startsWith(`${candidate.alias} `)
      || normalized.endsWith(` ${candidate.alias}`)
      || normalized.includes(` ${candidate.alias} `)
    ))
    .sort((left, right) => right.alias.length - left.alias.length)[0]?.brand || null;
};

export const findMerchantBrand = (merchant: string): MerchantBrand | null => {
  const normalized = normalizeMerchantKey(merchant);
  if (!normalized) return null;

  const exactMatches = MERCHANT_BRANDS.flatMap((brand) => (
    [brand.name, ...brand.aliases]
      .map(normalizeMerchantText)
      .filter((candidate) => normalized === candidate || normalized.includes(candidate) || candidate.includes(normalized))
      .map((candidate) => ({ brand, score: candidate.length }))
  )).sort((left, right) => right.score - left.score);
  if (exactMatches[0]) return exactMatches[0].brand;

  const merchantTokens = normalized.split(' ').filter((token) => token.length >= 4);
  return MERCHANT_BRANDS.find((brand) => [brand.name, ...brand.aliases].some((candidate) => {
    const candidateTokens = normalizeMerchantText(candidate).split(' ').filter((token) => token.length >= 4);
    return merchantTokens.some((token) => candidateTokens.some((candidateToken) => {
      const maxDistance = Math.max(token.length, candidateToken.length) >= 8 ? 2 : 1;
      return levenshteinDistance(token, candidateToken) <= maxDistance;
    }));
  })) || null;
};

export const cleanMerchantName = (merchant: string): string => {
  const trimmed = merchant
    .replace(/^\s*(?:cb|carte|paiement|payment|apple pay)\s*[-*:]*\s*/i, '')
    .replace(/\b(?:france|sas|sarl|sa)\b/gi, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return findMerchantBrand(trimmed)?.name || trimmed || 'Dépense';
};

export interface MerchantPreference {
  category?: string;
  subCategory?: string;
  accountId?: string;
  updatedAt: string;
}

const MERCHANT_PREFERENCES_KEY = 'mf_merchant_preferences_v1';

const readMerchantPreferences = (): Record<string, MerchantPreference> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(MERCHANT_PREFERENCES_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getMerchantPreference = (merchant: string): MerchantPreference | null => {
  const key = findMerchantBrand(merchant)?.id || normalizeMerchantKey(merchant);
  if (!key) return null;
  return readMerchantPreferences()[key] || null;
};

export const saveMerchantPreference = (merchant: string, preference: Omit<MerchantPreference, 'updatedAt'>): void => {
  const key = findMerchantBrand(merchant)?.id || normalizeMerchantKey(merchant);
  if (!key) return;
  try {
    const current = readMerchantPreferences();
    current[key] = { ...preference, updatedAt: new Date().toISOString() };
    localStorage.setItem(MERCHANT_PREFERENCES_KEY, JSON.stringify(current));
  } catch {
    // The expense still saves when private storage is unavailable.
  }
};
