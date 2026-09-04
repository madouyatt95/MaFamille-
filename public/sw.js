// Service Worker MyFamily+ (Fusionné avec Firebase Cloud Messaging)

// Clic sur la notification.
// Doit rester avant l'import Firebase pour éviter que FCM ne remplace ce comportement.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const module = notificationData.module || '';
  const clickAction = notificationData.click_action || notificationData.clickAction;
  
  let targetUrl = clickAction || '/app';
  if (!clickAction && (module === 'chat' || module === 'messagerie')) {
    const groupId = notificationData.groupId || notificationData.chatGroupId || '';
    targetUrl = `/app?tab=menu&module=messagerie${groupId ? `&groupId=${groupId}` : ''}`;
  } else if (!clickAction && (module === 'agenda' || module === 'calendar')) {
    targetUrl = '/app?tab=menu&module=agenda';
  } else if (!clickAction && module) {
    targetUrl = `/app?tab=menu&module=${module}`;
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
const CACHE_NAME = 'myfamily-plus-cache-v13-local-ai-lab';
const PERSISTENT_CACHE_PREFIXES = ['myfamily-qwen-model-', 'transformers-cache'];
const ASSETS_TO_CACHE = [
  '/',
  '/app',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
  '/landing-hero-family.jpg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-192x192.png',
  '/icon-maskable-512x512.png',
  '/merchant-logos/carrefour.svg',
  '/merchant-logos/leclerc.svg',
  '/merchant-logos/auchan.svg',
  '/merchant-logos/intermarche.svg',
  '/merchant-logos/lidl.svg',
  '/merchant-logos/aldi.svg',
  '/merchant-logos/monoprix.svg',
  '/merchant-logos/franprix.svg',
  '/merchant-logos/picard.svg',
  '/merchant-logos/mcdonalds.svg',
  '/merchant-logos/burger-king.svg',
  '/merchant-logos/kfc.svg',
  '/merchant-logos/starbucks.svg',
  '/merchant-logos/amazon.svg',
  '/merchant-logos/fnac.svg',
  '/merchant-logos/ikea.svg',
  '/merchant-logos/leroy-merlin.svg',
  '/merchant-logos/decathlon.svg',
  '/merchant-logos/sncf.svg',
  '/merchant-logos/ratp.svg',
  '/merchant-logos/uber.svg',
  '/merchant-logos/bolt.svg',
  '/merchant-logos/totalenergies.svg',
  '/merchant-logos/esso.svg',
  '/merchant-logos/orange.svg',
  '/merchant-logos/orange-money.svg',
  '/merchant-logos/free.svg',
  '/merchant-logos/free-money.svg',
  '/merchant-logos/sfr.svg',
  '/merchant-logos/netflix.svg',
  '/merchant-logos/spotify.svg',
  '/merchant-logos/apple.svg',
  '/merchant-logos/glovo.svg',
  '/merchant-logos/wave.svg',
  '/merchant-logos/jumia.svg',
  '/merchant-logos/air-senegal.svg',
  '/merchant-logos/edk.svg',
  '/merchant-logos/exclusive.svg',
  '/merchant-logos/yassir.svg',
  '/merchant-logos/super-u.svg',
  '/merchant-logos/casino.svg',
  '/merchant-logos/cora.svg',
  '/merchant-logos/action.svg',
  '/merchant-logos/darty.svg',
  '/merchant-logos/boulanger.svg',
  '/merchant-logos/deliveroo.svg',
  '/merchant-logos/uber-eats.svg',
  '/merchant-logos/shell.svg',
  '/merchant-logos/bp.svg',
  '/merchant-logos/air-france.svg',
  '/merchant-logos/canal-plus.svg'
];

const SHARE_DB_NAME = 'myfamily-plus-share-target';
const SHARE_STORE_NAME = 'payloads';

const openShareDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(SHARE_DB_NAME, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
      db.createObjectStore(SHARE_STORE_NAME, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const saveSharedPayload = async (payload) => {
  const db = await openShareDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE_NAME, 'readwrite');
    tx.objectStore(SHARE_STORE_NAME).put(payload);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          const isPersistentModelCache = PERSISTENT_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix));
          if (name !== CACHE_NAME && !isPersistentModelCache) {
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
  const requestUrl = new URL(request.url);
  const url = request.url;

  if (request.method === 'POST' && requestUrl.pathname === '/share-target/') {
    event.respondWith((async () => {
      const formData = await request.formData();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const files = formData.getAll('receipt').filter((item) => item instanceof File);
      await saveSharedPayload({
        id,
        title: String(formData.get('title') || ''),
        text: String(formData.get('text') || ''),
        url: String(formData.get('url') || ''),
        files,
        receivedAt: new Date().toISOString()
      });
      return Response.redirect(`/app?action=share-intake&shareId=${encodeURIComponent(id)}`, 303);
    })());
    return;
  }

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
  const isManifest = url.endsWith('/manifest.json');
  const isAppShellAsset = url.includes('/assets/') || url.endsWith('/index.html');

  if (isNavigation || isAppShellAsset || isManifest) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then((response) => {
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
