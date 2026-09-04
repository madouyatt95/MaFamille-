import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { VisualAuditGallery } from './dev/VisualAuditGallery';

const App = lazy(() => import('./App'));
const MarketingLanding = lazy(() => import('./MarketingLanding').then(module => ({ default: module.MarketingLanding })));
const AiLab = lazy(() => import('./dev/AiLab').then(module => ({ default: module.AiLab })));

const isMarketingRoute = () => window.location.pathname.replace(/\/+$/, '') === '/decouvrir';
const isAiLabRoute = () => window.location.pathname.replace(/\/+$/, '') === '/ai-lab';

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
  if (isAiLabRoute() && !Capacitor.isNativePlatform()) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#07111F]" />}>
        <AiLab />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07111F]" />}>
      <App />
    </Suspense>
  );
}
