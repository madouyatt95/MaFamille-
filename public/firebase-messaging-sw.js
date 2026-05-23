// Service Worker Firebase Cloud Messaging (FCM) statique (Robuste pour mobiles et PWAs)
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

// Initialiser Firebase dans le service worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Intercepteur pour les messages reçus en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Message reçu en arrière-plan :', payload);

  const title = payload.notification?.title || 'MaFamille+';
  const options = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/pwa-192x192.png',
    badge: '/badge-72x72.png',
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
