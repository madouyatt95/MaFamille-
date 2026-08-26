import { lazy, Suspense } from 'react';
import { VisualAuditGallery } from './dev/VisualAuditGallery';

const App = lazy(() => import('./App'));
const MarketingLanding = lazy(() => import('./MarketingLanding').then(module => ({ default: module.MarketingLanding })));

const isMarketingRoute = () => window.location.pathname.replace(/\/+$/, '') === '/decouvrir';

export function Root() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('visual-audit') === '1') {
    return <VisualAuditGallery />;
  }
  if (isMarketingRoute()) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F7F8FC]" />}>
        <MarketingLanding />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07111F]" />}>
      <App />
    </Suspense>
  );
}
