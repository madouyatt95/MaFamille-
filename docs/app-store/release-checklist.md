# Checklist de publication iOS

## Bloquants

- [ ] Choisir et enregistrer le Bundle ID de production.
- [ ] Remplacer `com.myfamilyplus.test` dans Capacitor et Xcode.
- [ ] Déployer la fonction Supabase `delete-account`.
- [ ] Tester la suppression avec un compte jetable, puis vérifier Auth, Storage et les tables.
- [ ] Publier les pages `/legal/` sur le domaine final.
- [ ] Remplacer les URL `VOTRE-DOMAINE` dans les métadonnées.
- [ ] Confirmer l’identité juridique, l’adresse et les e-mails de contact.
- [ ] Créer un compte de validation Apple avec des données fictives.

## Qualité

- [ ] Tester inscription, confirmation e-mail et première ouverture.
- [ ] Tester permissions refusées : localisation, micro, photos, caméra, notifications.
- [ ] Tester les modes clair, sombre et sépia.
- [ ] Tester sur un petit iPhone et un grand iPhone.
- [ ] Tester sur iPad ou retirer l’iPad de `TARGETED_DEVICE_FAMILY`.
- [ ] Vérifier VoiceOver, contraste et taille de texte.

## App Store Connect

- [ ] Renseigner description, sous-titre, mots-clés et catégories.
- [ ] Renseigner l’URL de confidentialité et l’URL d’assistance.
- [ ] Compléter App Privacy.
- [ ] Compléter la classification d’âge.
- [ ] Ajouter les captures iPhone et, si nécessaire, iPad.
- [ ] Fournir les instructions et identifiants de validation.
- [ ] Envoyer d’abord une version TestFlight interne.

## Commandes Supabase

```bash
supabase functions deploy delete-account
```

La fonction utilise automatiquement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans l’environnement Supabase.
