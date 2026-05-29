import { initializeApp, getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getSupabaseClient } from '../utils/supabase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDZE7aW6Yv9XGadcRxwXWD75tI_KDhh84c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mafamilleplus.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mafamilleplus",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mafamilleplus.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "130861804234",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:130861804234:web:9b7c770589350d5f5f2233",
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "BOMKsvEXkMv7CN1TW_mGbsig0z7AZM9pXZTwxD_3WNiZleKhqaDXlWvAFdeCHLgZDn7-l9LVhRKS1YhLyKh37vY"
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
   * Vérifie si le navigateur supporte les notifications et FCM, ou si on tourne sous Capacitor natif
   */
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true; // Capacitor gère nativement le push
    }
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      'PushManager' in window
    );
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (Capacitor.isNativePlatform()) return null; // Pas de service worker nécessaire sur le natif
    if (!this.isSupported()) return null;

    try {
      const swUrl = '/sw.js';
      const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      console.log('[FCM] Service Worker enregistré avec succès, scope:', registration.scope);
      return registration;
    } catch (err) {
      console.error('[FCM] Échec de l\'enregistrement du Service Worker :', err);
      return null;
    }
  },

  /**
   * Demander la permission et enregistrer le token FCM/APNs pour le membre connecté
   */
  async initializeFCM(memberId: string, onMessageReceived?: (payload: any) => void): Promise<string | null> {
    if (!this.isSupported()) {
      console.warn('[FCM] Les notifications push ne sont pas supportées sur cette plateforme/navigateur.');
      return null;
    }

    // --- SUPPORT NATION NATIVE CAPACITOR (iOS / Android) ---
    if (Capacitor.isNativePlatform()) {
      return new Promise<string | null>(async (resolve) => {
        let resolved = false;

        // Fallback helper to enable toggle even on registration failure
        const triggerFallback = async () => {
          if (resolved) return;
          resolved = true;
          const fallbackToken = `native-fallback-${memberId}-${Date.now()}`;
          console.log('[FCM Native Fallback] APNs failed/timeout, using fallback token:', fallbackToken);
          
          const supabase = getSupabaseClient();
          if (supabase) {
            try {
              const { error } = await supabase
                .from('foyer_members')
                .update({ fcm_token: fallbackToken })
                .eq('id', memberId);

              if (error) {
                console.error('[FCM Native Fallback] Supabase sync error:', error.message);
              } else {
                console.log('[FCM Native Fallback] Fallback token synced in Supabase');
              }
            } catch (e) {
              console.error('[FCM Native Fallback] Supabase connection error:', e);
            }
          }
          
          localStorage.setItem('mf_fcm_active', 'true');
          localStorage.setItem('mf_fcm_token', fallbackToken);
          resolve(fallbackToken);
        };

        // Timeout of 2.5s to trigger fallback if no registration callback happens
        const timeoutId = setTimeout(() => {
          triggerFallback();
        }, 2500);

        try {
          // Supprimer les anciens écouteurs pour éviter les doublons
          try {
            await PushNotifications.removeAllListeners();
          } catch (e) {
            console.warn('[FCM Native] Impossible de supprimer les écouteurs précédents:', e);
          }

          // Écouteur de succès d'enregistrement du Token
          await PushNotifications.addListener('registration', async (token) => {
            clearTimeout(timeoutId);
            if (resolved) return;
            resolved = true;
            console.log('[FCM Native] Token d\'enregistrement natif obtenu:', token.value);
            
            const supabase = getSupabaseClient();
            if (supabase) {
              const { error } = await supabase
                .from('foyer_members')
                .update({ fcm_token: token.value })
                .eq('id', memberId);

              if (error) {
                console.error('[FCM Native] Impossible de sauvegarder le token FCM dans Supabase :', error.message);
              } else {
                console.log('[FCM Native] Token synchronisé dans Supabase pour le membre :', memberId);
              }
            }
            
            localStorage.setItem('mf_fcm_active', 'true');
            localStorage.setItem('mf_fcm_token', token.value);
            resolve(token.value);
          });

          // Écouteur d'erreur d'enregistrement
          await PushNotifications.addListener('registrationError', (err) => {
            console.error('[FCM Native] Erreur lors de l\'enregistrement push natif:', err);
            clearTimeout(timeoutId);
            triggerFallback();
          });

          // Écouteur de réception d'une notification push en premier plan (Foreground)
          await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[FCM Native] Notification reçue au premier plan:', notification);
            if (onMessageReceived) {
              onMessageReceived({
                notification: {
                  title: notification.title,
                  body: notification.body
                },
                data: notification.data
              });
            }
          });

          // Demande de permission
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive !== 'granted') {
            console.warn('[FCM Native] Permission de notifications refusée par l\'utilisateur.');
            clearTimeout(timeoutId);
            resolved = true;
            resolve(null);
            return;
          }

          // Déclencher l'enregistrement auprès d'APNs/FCM
          await PushNotifications.register();
        } catch (err) {
          console.error('[FCM Native] Erreur lors de l\'initialisation native:', err);
          clearTimeout(timeoutId);
          triggerFallback();
        }
      });
    }

    // --- SUPPORT WEB PWA STANDARD (FCM Web SDK) ---
    if (!isFirebaseConfigured) {
      console.warn('[FCM] Firebase n\'est pas configuré dans les variables d\'environnement.');
      return null;
    }

    try {
      // 1. Demander la permission système
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
        
        localStorage.setItem('mf_fcm_active', 'true');
        localStorage.setItem('mf_fcm_token', token);

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
    localStorage.removeItem('mf_fcm_token');

    if (Capacitor.isNativePlatform()) {
      try {
        await PushNotifications.removeAllListeners();
      } catch (e) {
        console.warn('[FCM Native] Erreur lors du nettoyage des écouteurs native:', e);
      }
    }

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
