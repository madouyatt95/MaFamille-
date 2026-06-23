# Publication App Store MyFamily+

## Identifiants achats integres

Groupe d'abonnements App Store Connect :

- Nom : `MyFamily+ Premium`
- ID : `22177014`

Abonnements auto-renouvelables crees :

- Mensuel : `myfamilyplus.premium.monthly` (Apple ID `6783183076`, 5,99 EUR en France)
- Annuel : `myfamilyplus.premium.yearly` (Apple ID `6783183468`, 39,99 EUR en France)

L'essai gratuit de 7 jours est configure sur les deux abonnements, dans 175 pays ou regions,
du 23 juin 2026 au 23 juin 2030.

Cle App Store Server API / achats integres :

- Issuer ID : `a3467ac4-9f73-4093-97b0-2e3801067a01`
- Key ID : `4559CQKR33`
- Le fichier prive `.p8` ne doit jamais etre ajoute au depot Git.

Si les identifiants changent, mettre aussi ces variables dans le build iOS :

```env
VITE_APP_STORE_PREMIUM_MONTHLY_PRODUCT_ID=...
VITE_APP_STORE_PREMIUM_YEARLY_PRODUCT_ID=...
```

## Secrets Supabase requis

La fonction `verify-app-store-purchase` valide les transactions avec l'App Store Server API.

```bash
npx supabase secrets set \
  APP_STORE_ISSUER_ID="..." \
  APP_STORE_KEY_ID="..." \
  APP_STORE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----" \
  APP_STORE_BUNDLE_ID="fr.myfamilyplus.app" \
  APP_STORE_PRODUCT_ID_MONTHLY="myfamilyplus.premium.monthly" \
  APP_STORE_PRODUCT_ID_YEARLY="myfamilyplus.premium.yearly" \
  APP_STORE_ENVIRONMENT="auto"
```

Puis deployer :

```bash
npx supabase functions deploy verify-app-store-purchase
```

## Cote iOS

Le paywall utilise :

- Stripe uniquement sur web/PWA ;
- StoreKit sur iOS natif ;
- restauration App Store via le bouton `Restaurer mes achats`.

Le plugin natif est dans :

- `ios/App/App/AppStoreBillingPlugin.swift`
- `ios/App/App/BridgeViewController.swift`

## Avant envoi Apple Review

- Creer les achats integres dans App Store Connect.
- Renseigner les notes de review avec un compte demo.
- Verifier achat mensuel, achat annuel et restauration sur TestFlight.
- Verifier que la suppression de compte fonctionne.
- Verifier que le paywall iOS ne redirige jamais vers Stripe.
