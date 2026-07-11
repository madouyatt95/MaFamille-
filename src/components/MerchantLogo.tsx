import { Store } from 'lucide-react';
import { findMerchantBrand, findMerchantBrandByExplicitAlias } from '../utils/merchantDirectory';

interface MerchantLogoProps {
  merchant: string;
  className?: string;
  strict?: boolean;
}

export function MerchantLogo({ merchant, className = 'h-9 w-9', strict = false }: MerchantLogoProps) {
  const brand = strict ? findMerchantBrandByExplicitAlias(merchant) : findMerchantBrand(merchant);

  if (!brand) {
    return (
      <span className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/55`}>
        <Store className="h-4 w-4" aria-hidden="true" />
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
