# État des Notifications de MaFamille+ & Pistes d'Améliorations

Ce document récapitule le fonctionnement actuel des notifications de l'application et liste les fonctionnalités qui mériteraient d'y être reliées.

## Fonctionnement actuel des notifications

L'envoi des notifications s'appuie sur :
1. Un déclencheur au niveau de la base de données (**Supabase Trigger** sur `insert`) appelant la fonction SQL `trigger_send_push()`.
2. Cette fonction appelle de manière asynchrone l'Edge Function Supabase `send-push`.
3. L'Edge Function récupère les tokens FCM des membres du foyer (sauf l'expéditeur) et envoie la notification push via **Firebase Cloud Messaging (FCM) v1**.

### Tables actuellement connectées aux notifications push :
* **`chat_messages`** : Notifie les membres du foyer lors de la réception d'un nouveau message texte, image ou vocal.
* **`alerts`** : Notifie les parents/administrateurs lorsqu'un membre fait une demande d'adhésion au foyer (généré par le trigger `trigger_notify_member_join` sur la table `foyer_members`).

---

## Fonctionnalités non connectées aux notifications (Pistes d'amélioration)

Les modules suivants n'ont actuellement pas de déclencheur push :

### 1. Le Mur des Moments (`memories`)
* **État actuel** : Aucun envoi de notification lors de l'ajout d'une photo ou d'un moment.
* **Proposition** : Ajouter un trigger `after insert` sur la table `memories` pour notifier le foyer lorsqu'un nouveau souvenir est partagé.

### 2. L'Agenda partagé (`events`)
* **État actuel** : Les événements s'affichent uniquement à l'ouverture de l'application.
* **Proposition** : Ajouter un trigger pour alerter le foyer de la création d'un nouvel événement (ex. rdv médical, anniversaire) ou d'une modification.

### 3. Les Tâches ménagères (`chore_tasks`)
* **État actuel** : Pas de notification push.
* **Proposition** : 
  * Notifier un enfant lorsqu'une tâche lui est attribuée.
  * Notifier un parent lorsqu'une tâche est marquée terminée par l'enfant et qu'elle attend validation pour l'obtention des points.

### 4. Le Conseil de famille & Votes (`votes`)
* **État actuel** : Pas de notification push.
* **Proposition** : Alerter les membres dès qu'une nouvelle question est soumise au vote du foyer.

### 5. La Liste de courses (`groceries`)
* **État actuel** : Pas de notification push.
* **Proposition** : Notifier lorsqu'un article est marqué comme "Urgent" ou quand un membre déclare être parti faire les courses.
