import { initializeApp, getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getSupabaseClient } from '../utils/supabase';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
};

// Vérifier si Firebase est correctement configuré dans l'environnement
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
);

export const notificationService = {
  /**
   * Vérifie si le navigateur supporte les notifications et FCM
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      'PushManager' in window
    );
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;

    try {
      const swUrl = '/firebase-messaging-sw.js';
      const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      console.log('[FCM] Service Worker enregistré avec succès, scope:', registration.scope);
      return registration;
    } catch (err) {
      console.error('[FCM] Échec de l\'enregistrement du Service Worker :', err);
      return null;
    }
  },

  /**
   * Demander la permission et enregistrer le token FCM pour le membre connecté
   */
  async initializeFCM(memberId: string, onMessageReceived?: (payload: any) => void): Promise<string | null> {
    if (!isFirebaseConfigured) {
      console.warn('[FCM] Firebase n\'est pas configuré dans les variables d\'environnement.');
      return null;
    }

    if (!this.isSupported()) {
      console.warn('[FCM] Les notifications push ne sont pas supportées par ce navigateur.');
      return null;
    }

    try {
      // 1. Demander la permission système si nécessaire
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FCM] Permission de notifications refusée par l\'utilisateur.');
        return null;
      }

      // 2. Initialiser l'application Firebase
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const messaging = getMessaging(app);

      // 3. Enregistrer le Service Worker FCM
      const swRegistration = await this.registerServiceWorker();
      if (!swRegistration) {
        console.error('[FCM] Impossible d\'enregistrer le Service Worker de fond.');
        return null;
      }

      // 4. Récupérer le token de notification de l'appareil
      // Si la clé VAPID publique n'est pas renseignée dans le .env, FCM utilisera la configuration par défaut
      const token = await getToken(messaging, {
        vapidKey: firebaseConfig.vapidKey || undefined,
        serviceWorkerRegistration: swRegistration
      });

      if (token) {
        console.log('[FCM] Token FCM généré avec succès :', token);
        
        // 5. Enregistrer le token en base de données Supabase
        const supabase = getSupabaseClient();
        if (supabase) {
          const { error } = await supabase
            .from('foyer_members')
            .update({ fcm_token: token })
            .eq('id', memberId);

          if (error) {
            console.error('[FCM] Impossible de sauvegarder le token FCM dans Supabase :', error.message);
          } else {
            console.log('[FCM] Token synchronisé avec succès dans Supabase pour le membre :', memberId);
          }
        }
        
        // Mémoriser localement que FCM est actif
        localStorage.setItem('mf_fcm_active', 'true');

        // 6. Écouter les messages reçus lorsque l'application est au premier plan (Foreground)
        onMessage(messaging, (payload) => {
          console.log('[FCM] Message reçu au premier plan :', payload);
          if (onMessageReceived) {
            onMessageReceived(payload);
          }
        });

        return token;
      } else {
        console.warn('[FCM] Aucun token d\'enregistrement reçu de Firebase.');
        return null;
      }
    } catch (err) {
      console.error('[FCM] Erreur lors de l\'initialisation des notifications :', err);
      return null;
    }
  },

  /**
   * Désactive les notifications en supprimant le token FCM de Supabase et du localStorage
   */
  async disableNotifications(memberId: string): Promise<void> {
    localStorage.setItem('mf_fcm_active', 'false');
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('foyer_members')
        .update({ fcm_token: null })
        .eq('id', memberId);

      if (error) {
        console.error('[FCM] Échec de la suppression du token FCM dans Supabase :', error.message);
        throw error;
      }
      console.log('[FCM] Token FCM supprimé avec succès en base de données.');
    }
  }
};
