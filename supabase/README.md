# Déploiement des notifications push avec Supabase & FCM

Pour eviter les doublons, le projet utilise un seul circuit de push :

1. Les triggers SQL appellent l'Edge Function `send-push`.
2. Les lignes `alerts` alimentent le centre d'alertes interne de l'application.
3. Les `alerts` ne doivent pas avoir de webhook push separe dans le Dashboard Supabase.

Important : ne configurez pas en meme temps les triggers SQL du schema et des Webhooks Dashboard vers `send-push`, sinon une meme action peut envoyer plusieurs notifications identiques.

## 1. Deployer l'Edge Function `send-push`

Si vous possédez le Supabase CLI sur votre machine, exécutez la commande suivante à la racine de votre projet :

```bash
# Se connecter à votre projet Supabase
supabase login
supabase link --project-ref zjhxombzoilbchxftszb

# Déployer la fonction
supabase functions deploy send-push
```

---

## 2. Configurer les variables d'environnement dans Supabase

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

## 3. Appliquer les migrations

Les migrations creent la table anti-doublons, ajoutent les champs manquants pour les courses et desactivent le trigger push direct sur `alerts`.

```bash
supabase db push
```

---

## 4. Nettoyer les anciens Webhooks Dashboard

Dans **Supabase Dashboard > Database > Webhooks**, supprimez ou desactivez tout webhook qui appelle `send-push`, en particulier ceux sur :

- `public.alerts`
- `public.chat_messages`
- `public.groceries`
- `public.events`
- `public.chore_tasks`
- `public.memories`
- `public.votes`

Les triggers SQL du schema suffisent pour envoyer les notifications push.
