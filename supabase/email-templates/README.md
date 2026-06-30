# E-mails Supabase MyFamily+

## Confirmation d'inscription

Dans Supabase :

1. Ouvrir `Authentication` puis `Emails`.
2. Sélectionner le modèle `Confirm signup`.
3. Utiliser comme objet :

```text
Confirmez votre adresse e-mail MyFamily+
```

4. Copier le contenu de `confirm-signup.html` dans le champ `Source`.
5. Enregistrer puis effectuer une inscription avec une adresse de test.

Le bouton utilise `{{ .ConfirmationURL }}`. Il ne faut pas remplacer cette
variable manuellement : Supabase construit le lien sécurisé pour chaque
inscription.

## Nom de l'expéditeur

Le modèle change le contenu du message, mais l'expéditeur restera celui de
Supabase tant qu'un SMTP personnalisé n'est pas configuré.

Dans `Authentication > Emails`, choisir `Set up SMTP`, puis renseigner :

- nom d'expéditeur : `MyFamily+`
- adresse d'expéditeur : `ne-pas-repondre@auth.myfamilyplus.fr`
- serveur : `smtp.resend.com`
- port : `587`
- identifiant : `resend`
- mot de passe : cle API SMTP Resend

Configurer SPF, DKIM et DMARC sur le domaine avant la mise en production afin
de limiter les classements en courrier indésirable.

## URL de retour

Dans `Authentication > URL Configuration` :

- `Site URL` doit être l'URL HTTPS de production ;
- cette même URL doit figurer dans `Redirect URLs`.

L'application utilise `VITE_SITE_URL` quand cette variable est définie, avec
`https://myfamilyplus.fr` comme valeur de secours.

Pour la production, utiliser `https://myfamilyplus.fr` en `Site URL` et ajouter
`https://myfamilyplus.fr/**` dans les redirections autorisees.
