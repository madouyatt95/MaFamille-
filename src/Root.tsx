import { lazy, Suspense } from 'react';

const App = lazy(() => import('./App'));

export function Root() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07111F]" />}>
      <App />
    </Suspense>
  );
}
