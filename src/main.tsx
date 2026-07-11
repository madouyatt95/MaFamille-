import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { Root } from './Root.tsx'
import { APP_SERVICE_WORKER_URL, SERVICE_WORKER_UPDATE_INTERVAL_MS } from './config/serviceWorker.ts'

// Register Service Worker for PWA offline capabilities
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The next navigation will use the new worker. Reloading here can create
    // a visible loop when notification setup and app startup overlap.
    window.dispatchEvent(new Event('myfamilyplus:service-worker-updated'));
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(APP_SERVICE_WORKER_URL, { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        console.log('Service Worker registered successfully on scope:', reg.scope);
        const checkForUpdate = () => {
          if (document.visibilityState !== 'visible') return;
          const lastCheck = Number(localStorage.getItem('mf_sw_last_update_check') || 0);
          if (Date.now() - lastCheck < SERVICE_WORKER_UPDATE_INTERVAL_MS) return;
          localStorage.setItem('mf_sw_last_update_check', String(Date.now()));
          void reg.update();
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
