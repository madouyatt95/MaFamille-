import { useState } from 'react';
import { Store } from 'lucide-react';
import { findMerchantBrand, findMerchantBrandByExplicitAlias } from '../utils/merchantDirectory';

interface MerchantLogoProps {
  merchant: string;
  className?: string;
  strict?: boolean;
}

const LOCAL_MERCHANT_LOGOS = new Set([
  'carrefour', 'leclerc', 'auchan', 'auchan-senegal', 'intermarche', 'lidl', 'aldi', 'monoprix',
  'mcdonalds', 'burger-king', 'kfc', 'starbucks', 'amazon', 'fnac', 'ikea', 'decathlon', 'sncf',
  'uber', 'bolt', 'totalenergies', 'esso', 'orange', 'orange-money', 'free', 'free-money', 'sfr', 'netflix',
  'spotify', 'apple', 'franprix', 'picard', 'leroy-merlin', 'glovo', 'wave', 'jumia', 'air-senegal',
  'ratp', 'edk', 'exclusive', 'yassir', 'super-u', 'casino', 'cora', 'action', 'darty', 'boulanger',
  'deliveroo', 'uber-eats', 'shell', 'bp', 'air-france', 'canal-plus'
]);

const merchantLogoPath = (brandId: string): string | null => {
  if (!LOCAL_MERCHANT_LOGOS.has(brandId)) return null;
  const fileName = brandId === 'auchan-senegal' ? 'auchan' : brandId;
  return `/merchant-logos/${fileName}.svg`;
};

export function MerchantLogo({ merchant, className = 'h-9 w-9', strict = false }: MerchantLogoProps) {
  const brand = strict ? findMerchantBrandByExplicitAlias(merchant) : findMerchantBrand(merchant);
  const logoPath = brand ? merchantLogoPath(brand.id) : null;
  const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);

  if (!brand) {
    return (
      <span className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/55`}>
        <Store className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  if (logoPath && failedLogoPath !== logoPath) {
    return (
      <span
        className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm`}
        title={brand.name}
        aria-label={`Enseigne ${brand.name}`}
      >
        <img src={logoPath} alt="" className="h-full w-full object-contain" onError={() => setFailedLogoPath(logoPath)} />
      </span>
    );
  }

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl border border-black/10 px-1 text-center font-black leading-none shadow-sm`}
      style={{ color: brand.foreground, backgroundColor: brand.background }}
      title={brand.name}
      aria-label={`Enseigne ${brand.name}`}
    >
      <span className={brand.shortLabel.length > 3 ? 'text-[8px]' : brand.shortLabel.length > 1 ? 'text-[10px]' : 'text-base'}>
        {brand.shortLabel}
      </span>
    </span>
  );
}
