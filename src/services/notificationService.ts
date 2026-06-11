import { initializeApp, getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getSupabaseClient } from '../utils/supabase';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';

type InitializeFCMOptions = {
  requestPermission?: boolean;
};

type PushForegroundPayload = {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getDeviceId = async (): Promise<string> => {
  const key = 'mf_push_device_id';
  try {
    const { value } = await Preferences.get({ key });
    if (value) return value;
  } catch {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
  }

  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    await Preferences.set({ key, value: id });
  } catch {
    localStorage.setItem(key, id);
  }
  return id;
};

const getAppSource = (): string => {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() === 'ios' ? 'ios' : 'native';
  }
  return 'pwa';
};

const savePushSubscription = async (memberId: string, token: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: member, error: memberError } = await supabase
    .from('foyer_members')
    .select('id, foyer_id, user_id')
    .eq('id', memberId)
    .single();

  if (memberError || !member) {
    console.error('[FCM] Impossible de retrouver le membre pour le token :', memberError?.message);
    return;
  }

  const deviceId = await getDeviceId();
  const appSource = getAppSource();

  const { error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .upsert({
      foyer_id: member.foyer_id,
      member_id: member.id,
      user_id: member.user_id,
      token,
      device_id: deviceId,
      platform: Capacitor.getPlatform(),
      app_source: appSource,
      enabled: true
    }, { onConflict: 'member_id,device_id,app_source' });

  if (subscriptionError) {
    console.error('[FCM] Impossible de sauvegarder l’installation push :', subscriptionError.message);
  } else {
    console.log(`[FCM] Installation push synchronisée (${appSource}) pour le membre :`, memberId);
  }

  const { error: legacyError } = await supabase
    .from('foyer_members')
    .update({ fcm_token: token })
    .eq('id', memberId);

  if (legacyError) {
    console.warn('[FCM] Ancien champ fcm_token non mis à jour :', legacyError.message);
  }
};

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
  async initializeFCM(
    memberId: string,
    onMessageReceived?: (payload: PushForegroundPayload) => void,
    options: InitializeFCMOptions = {}
  ): Promise<string | null> {
    const { requestPermission = true } = options;

    if (!this.isSupported()) {
      console.warn('[FCM] Les notifications push ne sont pas supportées sur cette plateforme/navigateur.');
      return null;
    }

    // --- SUPPORT NATION NATIVE CAPACITOR (iOS / Android) ---
    if (Capacitor.isNativePlatform()) {
      const getNativeFcmTokenWithRetry = async (apnsToken: string): Promise<string | null> => {
        for (let attempt = 1; attempt <= 5; attempt += 1) {
          try {
            const fcmTokenRes = attempt === 1 ? await FCM.getToken() : await FCM.refreshToken();
            const fcmTokenValue = fcmTokenRes.token;
            if (fcmTokenValue && fcmTokenValue !== apnsToken) {
              return fcmTokenValue;
            }
          } catch (e) {
            console.warn(`[FCM Native] Token FCM indisponible tentative ${attempt}/5:`, e);
          }
          await wait(700);
        }
        return null;
      };

      return new Promise<string | null>((resolve) => {
        let resolved = false;

        const failNativeRegistration = (reason: string) => {
          if (resolved) return;
          resolved = true;
          console.warn('[FCM Native] Enregistrement abandonné :', reason);
          localStorage.setItem('mf_fcm_active', 'false');
          localStorage.removeItem('mf_fcm_token');
          resolve(null);
        };

        const timeoutId = setTimeout(() => {
          failNativeRegistration('aucun retour APNs/FCM après 15 secondes');
        }, 15000);

        void (async () => {
          try {
            // Supprimer les anciens écouteurs pour éviter les doublons
            try {
              await PushNotifications.removeAllListeners();
            } catch (e) {
              console.warn('[FCM Native] Impossible de supprimer les écouteurs précédents:', e);
            }

            try {
              await FCM.setAutoInit({ enabled: true });
            } catch (e) {
              console.warn('[FCM Native] Impossible d’activer l’auto-init FCM:', e);
            }

            // Écouteur de succès d'enregistrement du Token
            await PushNotifications.addListener('registration', async (token) => {
              clearTimeout(timeoutId);
              if (resolved) return;
              resolved = true;
              console.log('[FCM Native] Token d\'enregistrement APNs obtenu:', token.value);
              
              const fcmTokenValue = await getNativeFcmTokenWithRetry(token.value);

              if (!fcmTokenValue) {
                console.error('[FCM Native] Échec de la récupération du token FCM après plusieurs tentatives.');
                failNativeRegistration('token FCM indisponible');
                return;
              }
              console.log('[FCM Native] Token FCM obtenu via le plugin community FCM:', fcmTokenValue);
              
              await savePushSubscription(memberId, fcmTokenValue);
              
              localStorage.setItem('mf_fcm_active', 'true');
              localStorage.setItem('mf_fcm_token', fcmTokenValue);
              resolve(fcmTokenValue);
            });

            // Écouteur d'erreur d'enregistrement
            await PushNotifications.addListener('registrationError', (err) => {
              console.error('[FCM Native] Erreur lors de l\'enregistrement push natif:', err);
              clearTimeout(timeoutId);
              failNativeRegistration('erreur registration APNs');
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
            if (permStatus.receive === 'prompt' && !requestPermission) {
              clearTimeout(timeoutId);
              failNativeRegistration('permission non demandée hors action utilisateur');
              return;
            }
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
            failNativeRegistration('exception native');
          }
        })();
      });
    }

    // --- SUPPORT WEB PWA STANDARD (FCM Web SDK) ---
    if (!isFirebaseConfigured) {
      console.warn('[FCM] Firebase n\'est pas configuré dans les variables d\'environnement.');
      return null;
    }

    try {
      // 1. Demander la permission système
      let permission = Notification.permission;
      if (permission === 'default' && !requestPermission) {
        console.log('[FCM] Permission non demandée hors action utilisateur.');
        return null;
      }
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
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
        
        // 5. Enregistrer cette installation sans écraser les autres appareils du même membre
        await savePushSubscription(memberId, token);
        
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
    const token = localStorage.getItem('mf_fcm_token');
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
      if (token) {
        const { error: subscriptionError } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('member_id', memberId)
          .eq('token', token);

        if (subscriptionError) {
          console.warn('[FCM] Échec de la suppression de cette installation push :', subscriptionError.message);
        }
      }

      const { error } = await supabase
        .from('foyer_members')
        .update({ fcm_token: null })
        .eq('id', memberId)
        .eq('fcm_token', token || '');

      if (error) {
        console.error('[FCM] Échec de la suppression du token FCM dans Supabase :', error.message);
        throw error;
      }
      console.log('[FCM] Token FCM supprimé avec succès en base de données.');
    }
  }
};
