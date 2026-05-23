// Service Worker Firebase Cloud Messaging (FCM) dynamique
// Reçoit sa configuration via les paramètres d'URL de l'enregistrement

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Parser les paramètres d'URL
const params = new URLSearchParams(location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId')
};

// Vérifier que la configuration est bien présente
if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Écouteur des messages reçus en arrière-plan
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
} else {
  console.warn('[FCM SW] Configuration Firebase manquante dans les paramètres d\'enregistrement.');
}

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Ouvrir l'application ou rediriger vers un onglet actif
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
