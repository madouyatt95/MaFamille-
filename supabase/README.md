# Déploiement des Notifications Push en temps réel avec Supabase & FCM

Pour que les notifications push de chat et d'alertes soient automatiquement distribuées entre les appareils de votre famille, vous devez déployer la Supabase Edge Function `send-push`.

## 📦 Étape 1 : Déployer l'Edge Function `send-push`

Si vous possédez le Supabase CLI sur votre machine, exécutez la commande suivante à la racine de votre projet :

```bash
# Se connecter à votre projet Supabase
supabase login
supabase link --project-ref zjhxombzoilbchxftszb

# Déployer la fonction
supabase functions deploy send-push
```

---

## 🔑 Étape 2 : Configurer les variables d'environnement dans Supabase

Pour signer les requêtes vers l'API Firebase FCM v1, la fonction requiert la clé de votre compte de service Google Firebase.

1. Allez sur votre **Firebase Console** > **Paramètres du projet** > **Comptes de service**.
2. Cliquez sur **Générer une nouvelle clé privée** pour télécharger un fichier JSON (ex: `service-account.json`).
3. Convertissez le contenu de ce fichier en une seule ligne JSON (sans sauts de ligne).
4. Configurez-le dans les secrets de votre console Supabase en exécutant :

```bash
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", "project_id": "mafamilleplus", ...}'
```

*(Vous pouvez aussi le faire depuis l'interface web Supabase dans **Settings** > **Edge Functions** > **Add Secret**).*

---

## ⚡ Étape 3 : Créer les Webhooks de base de données dans la console Supabase

Pour déclencher automatiquement la fonction lors d'un nouveau message ou d'une alerte :

1. Allez sur votre **Supabase Dashboard** > **Database** > **Webhooks**.
2. Cliquez sur **Enable Webhooks** (si non activé).
3. Créez un premier Webhook pour le Chat :
   * **Name** : `send_chat_push`
   * **Table** : `public.chat_messages`
   * **Events** : `Insert` uniquement
   * **Type** : `Supabase Edge Functions`
   * **Function** : Sélectionnez `send-push`
   * **HTTP Method** : `POST`
4. Créez un second Webhook pour les Alertes :
   * **Name** : `send_alert_push`
   * **Table** : `public.alerts`
   * **Events** : `Insert` uniquement
   * **Type** : `Supabase Edge Functions`
   * **Function** : Sélectionnez `send-push`
   * **HTTP Method** : `POST`

Dès qu'un membre écrira dans le Chat ou qu'une alerte sera créée, les autres membres du foyer recevront instantanément une notification push sur leur écran, même verrouillé !
