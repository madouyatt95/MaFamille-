# Préparation des réponses App Privacy

Cette fiche doit être vérifiée dans App Store Connect selon la configuration réellement déployée.

## Données probablement collectées

- Coordonnées : adresse e-mail.
- Contenu utilisateur : messages, photos, fichiers, événements, tâches et notes.
- Informations financières : budget familial saisi par l’utilisateur, sans données de carte bancaire stockées dans l’application.
- Santé : informations ajoutées volontairement dans le carnet familial.
- Localisation précise : uniquement lorsque la carte familiale est activée.
- Identifiants : identifiant de compte et identifiants techniques du foyer.
- Diagnostics : journaux techniques strictement nécessaires si une solution de diagnostic est activée.

## Finalités

- Fonctionnalité de l’application.
- Authentification et sécurité.
- Personnalisation du foyer.
- Communications et notifications demandées.

## À déclarer comme non utilisé

- Publicité tierce.
- Publicité ou marketing du développeur fondé sur le suivi.
- Suivi entre applications et sites.
- Vente de données.

## Vérifications avant validation

- Confirmer si Vercel Analytics, Firebase Analytics, Sentry ou un autre SDK de mesure est actif.
- Confirmer la liste finale des fournisseurs IA et les données envoyées.
- Vérifier les durées de conservation Supabase et les sauvegardes.
- Remplacer `VOTRE-DOMAINE` dans les métadonnées.
- Faire valider l’identité juridique et les coordonnées de Yatta Digital.
