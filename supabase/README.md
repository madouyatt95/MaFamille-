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

Le meme secret doit aussi etre configure cote base de donnees pour que le trigger SQL puisse appeler l'Edge Function. Dans le SQL Editor Supabase, utilisez Vault :

```sql
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

SELECT vault.create_secret(
  'https://ravkssbaxcfhnzsemfrh.supabase.co/functions/v1/send-push',
  'send_push_url_v2'
);

SELECT vault.create_secret(
  '<votre-supabase-anon-key>',
  'supabase_anon_key_v2'
);

SELECT vault.create_secret(
  '<la-meme-valeur-que-PUSH_WEBHOOK_SECRET>',
  'push_webhook_secret_v2'
);
```

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

---

## 5. Activer les rappels planifies

La migration `20260612001000_add_scheduled_push_reminders.sql` ajoute le moteur serveur des rappels planifies. Il reutilise la meme Edge Function `send-push` et les memes preferences de notifications.

Pour un premier test manuel dans le SQL Editor :

```sql
SELECT * FROM public.process_scheduled_push_reminders();
```

Pour l'automatiser, activez `pg_cron` dans Supabase puis planifiez l'appel toutes les 5 minutes :

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'mafamille-scheduled-push-reminders',
  '*/5 * * * *',
  $$SELECT public.process_scheduled_push_reminders();$$
);
```

Les calendriers ICS importes par l'app sont synchronises dans `external_calendar_events`; Supabase peut ensuite envoyer les rappels meme si la PWA ou l'app iOS n'est pas ouverte.

Garde-fous de stockage :

- l'app ne synchronise vers Supabase que les evenements entre 3 mois passes et 18 mois futurs ;
- un maximum de 2000 evenements ICS est envoye par foyer/appareil lors d'une synchronisation ;
- les rappels envoyes ou echoues sont nettoyes apres 90 jours ;
- les rappels restes en attente trop anciens sont nettoyes apres 7 jours ;
- les evenements ICS trop anciens ou trop lointains sont nettoyes automatiquement.
