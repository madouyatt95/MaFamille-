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
supabase link --project-ref ravkssbaxcfhnzsemfrh

# Déployer la fonction
supabase functions deploy send-push
```

---

## 2. Configurer les variables d'environnement dans Supabase

Pour signer les requêtes vers l'API Firebase FCM v1, la fonction requiert la clé de votre compte de service Google Firebase et un secret partagé pour refuser les appels externes non autorisés.

1. Allez sur votre **Firebase Console** > **Paramètres du projet** > **Comptes de service**.
2. Cliquez sur **Générer une nouvelle clé privée** pour télécharger un fichier JSON (ex: `service-account.json`).
3. Convertissez le contenu de ce fichier en une seule ligne JSON (sans sauts de ligne).
4. Configurez-le dans les secrets de votre console Supabase en exécutant :

```bash
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", "project_id": "mafamilleplus", ...}'
supabase secrets set PUSH_WEBHOOK_SECRET='remplacez-par-une-longue-valeur-aleatoire'
```

*(Vous pouvez aussi le faire depuis l'interface web Supabase dans **Settings** > **Edge Functions** > **Add Secret**).*

Le meme secret doit aussi etre configure cote base de donnees pour que le trigger SQL puisse appeler l'Edge Function :

```sql
ALTER DATABASE postgres SET app.send_push_url = 'https://ravkssbaxcfhnzsemfrh.supabase.co/functions/v1/send-push';
ALTER DATABASE postgres SET app.supabase_anon_key = '<votre-supabase-anon-key>';
ALTER DATABASE postgres SET app.push_webhook_secret = '<la-meme-valeur-que-PUSH_WEBHOOK_SECRET>';
```

Apres ces `ALTER DATABASE`, reconnectez la session SQL ou relancez `supabase db push` pour que les fonctions utilisent les nouveaux reglages.

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
