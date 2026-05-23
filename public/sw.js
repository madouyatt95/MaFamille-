// Service Worker MaFamille+ (Fusionné avec Firebase Cloud Messaging)

// Importations Firebase Compat
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDZE7aW6Yv9XGadcRxwXWD75tI_KDhh84c",
  authDomain: "mafamilleplus.firebaseapp.com",
  projectId: "mafamilleplus",
  storageBucket: "mafamilleplus.firebasestorage.app",
  messagingSenderId: "130861804234",
  appId: "1:130861804234:web:9b7c770589350d5f5f2233"
};

// Initialiser Firebase
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

// Intercepteur pour les messages reçus en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Message reçu en arrière-plan :', payload);

  const title = payload.notification?.title || 'MaFamille+';
  const options = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/favicon.svg',
    data: payload.data || {},
    tag: payload.data?.tag || 'mafamille-plus-alert',
    renotify: true
  };

  self.registration.showNotification(title, options);
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// PARTIE CACHING PWA
const CACHE_NAME = 'mafamille-plus-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Ne pas intercepter les requêtes de dev local
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return;
  }

  // Ne pas intercepter ni cacher les requêtes vers Supabase ou Firebase API
  if (
    url.includes('supabase.co') || 
    url.includes('googleapis.com') || 
    url.includes('firebase')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // stale-while-revalidate silencieux
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
