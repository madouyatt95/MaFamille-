import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { Root } from './Root.tsx'

// Register Service Worker for PWA offline capabilities
if ('serviceWorker' in navigator) {
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=20260709-quick-actions', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        console.log('Service Worker registered successfully on scope:', reg.scope);
        void reg.update();
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') void reg.update();
        };
        document.addEventListener('visibilitychange', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
      })
      .catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <Root />
    </AppErrorBoundary>
  </StrictMode>,
)
