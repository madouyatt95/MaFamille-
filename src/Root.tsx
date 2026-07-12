import { lazy, Suspense } from 'react';
import { VisualAuditGallery } from './dev/VisualAuditGallery';

const App = lazy(() => import('./App'));

export function Root() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('visual-audit') === '1') {
    return <VisualAuditGallery />;
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07111F]" />}>
      <App />
    </Suspense>
  );
}
