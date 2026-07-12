import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { AppNoticeCenter } from './components/AppNoticeCenter.tsx'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt.tsx'
import { Root } from './Root.tsx'
import { APP_SERVICE_WORKER_URL, SERVICE_WORKER_UPDATE_INTERVAL_MS } from './config/serviceWorker.ts'

const storedTheme = localStorage.getItem('app_appearance_mode');
document.documentElement.classList.toggle('theme-light', storedTheme === 'light');
document.documentElement.classList.toggle('theme-sepia', storedTheme === 'sepia');
document.body.classList.toggle('theme-light', storedTheme === 'light');
document.body.classList.toggle('theme-sepia', storedTheme === 'sepia');

// Register Service Worker for PWA offline capabilities
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('mf_pwa_update_requested') === 'true') {
      sessionStorage.removeItem('mf_pwa_update_requested');
      window.location.reload();
      return;
    }
    window.dispatchEvent(new Event('myfamilyplus:service-worker-updated'));
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(APP_SERVICE_WORKER_URL, { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        console.log('Service Worker registered successfully on scope:', reg.scope);
        const announceWaitingUpdate = () => {
          if (!reg.waiting || !navigator.serviceWorker.controller) return;
          window.dispatchEvent(new CustomEvent('myfamilyplus:pwa-update-ready', { detail: { registration: reg } }));
        };
        announceWaitingUpdate();
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed') announceWaitingUpdate();
          });
        });
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
      <AppNoticeCenter />
      <PwaUpdatePrompt />
      <Root />
    </AppErrorBoundary>
  </StrictMode>,
)
