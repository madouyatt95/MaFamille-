import { lazy, Suspense } from 'react';
import { MarketingLanding } from './MarketingLanding';

const App = lazy(() => import('./App'));
const MarketingDemoCapture = lazy(() => import('./MarketingDemoCapture').then(module => ({ default: module.MarketingDemoCapture })));

const shouldRenderApp = () => {
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(search);
  if (pathname.startsWith('/app') || pathname.startsWith('/quick-micro') || pathname.startsWith('/share') || pathname.startsWith('/share-target')) return true;
  if (hash.includes('access_token=') || hash.includes('type=recovery') || hash.includes('type=signup')) return true;
  if (hash.startsWith('#share_') || hash.startsWith('#sharelink_')) return true;
  return ['join', 'tab', 'module', 'action', 'premium', 'shareId', 'groupId'].some(param => params.has(param));
};

export function Root() {
  if (window.location.pathname.startsWith('/demo-vitrine')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F7F8FC]" />}>
        <MarketingDemoCapture />
      </Suspense>
    );
  }

  if (!shouldRenderApp()) {
    return <MarketingLanding />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07111F]" />}>
      <App />
    </Suspense>
  );
}
