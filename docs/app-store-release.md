# Publication App Store MyFamily+

## Identifiants achats integres

Groupe d'abonnements App Store Connect :

- Nom : `MyFamily+ Premium`
- ID : `22223298`

Abonnements auto-renouvelables crees :

- Mensuel : `fr.myfamilyplus.app.premium.monthly` (Apple ID `6789651598`, 5,99 EUR en France)
- Annuel : `fr.myfamilyplus.app.premium.yearly` (Apple ID `6789669705`, 39,99 EUR en France)

Avant la soumission, creer dans App Store Connect l'essai gratuit de 7 jours sur les deux
abonnements, puis les codes d'offre Apple de la campagne. Les codes sont geres et valides par Apple.

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
  APP_STORE_PRODUCT_ID_MONTHLY="fr.myfamilyplus.app.premium.monthly" \
  APP_STORE_PRODUCT_ID_YEARLY="fr.myfamilyplus.app.premium.yearly" \
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

Pour un vrai test Sandbox Apple par cable, le scheme principal `App` ne doit pas utiliser
de fichier StoreKit local. Si Apple ne renvoie pas les produits, l'app doit afficher une erreur
au lieu de simuler un achat.

Le fichier `ios/App/App/MyFamilyPlus.storekit` reste utile uniquement pour des tests locaux
simules. Dans ce cas, activer explicitement la variable de lancement Xcode :

```env
MYFAMILYPLUS_ALLOW_LOCAL_STOREKIT_FALLBACK=1
```

## Avant envoi Apple Review

- Creer les achats integres dans App Store Connect.
- Renseigner les notes de review avec un compte demo.
- Verifier achat mensuel, achat annuel et restauration sur TestFlight.
- Verifier que la suppression de compte fonctionne.
- Verifier que le paywall iOS ne redirige jamais vers Stripe.
