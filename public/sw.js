// Service Worker MyFamily+ (Fusionné avec Firebase Cloud Messaging)

// Clic sur la notification.
// Doit rester avant l'import Firebase pour éviter que FCM ne remplace ce comportement.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const module = notificationData.module || '';
  const clickAction = notificationData.click_action || notificationData.clickAction;
  
  let targetUrl = clickAction || '/';
  if (!clickAction && (module === 'chat' || module === 'messagerie')) {
    const groupId = notificationData.groupId || notificationData.chatGroupId || '';
    targetUrl = `/?tab=menu&module=messagerie${groupId ? `&groupId=${groupId}` : ''}`;
  } else if (!clickAction && (module === 'agenda' || module === 'calendar')) {
    targetUrl = '/?tab=menu&module=agenda';
  } else if (!clickAction && module) {
    targetUrl = `/?tab=menu&module=${module}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client && 'navigate' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

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

  // Si le payload contient déjà un objet notification, le SDK FCM/navigateur l'affichera automatiquement.
  // On ne l'affiche manuellement que pour les messages contenant uniquement des données pour éviter les doublons.
  if (!payload.notification) {
    const title = payload.data?.title || 'MyFamily+';
    const options = {
      body: payload.data?.body || '',
      icon: payload.data?.icon || '/icon-192x192.png',
      badge: '/favicon.svg',
      data: payload.data || {},
      tag: payload.data?.tag || 'mafamille-plus-alert',
      renotify: true
    };
    self.registration.showNotification(title, options);
  }
});

// PARTIE CACHING PWA
const CACHE_NAME = 'myfamily-plus-cache-v2';
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
  const request = event.request;
  const url = request.url;

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

  const isNavigation = request.mode === 'navigate';
  const isAppShellAsset = url.includes('/assets/') || url.endsWith('/index.html');

  if (isNavigation || isAppShellAsset) {
    event.respondWith(
      fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      }).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (isNavigation) return caches.match('/index.html');
          return undefined;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    })
  );
});
