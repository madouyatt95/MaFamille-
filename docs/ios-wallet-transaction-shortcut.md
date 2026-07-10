# Automatisation iPhone apres un paiement

MyFamily+ accepte une depense pre-remplie sur cette route :

```text
https://myfamilyplus.fr/quick-expense?amount=32.50&merchant=Carrefour%20Market&date=2026-07-10T14%3A30%3A00%2B02%3A00&currency=EUR
```

Parametres acceptes :

- `amount` : montant positif, avec point ou virgule ;
- `merchant` : nom du commerce transmis par Wallet ;
- `date` : date simple `YYYY-MM-DD` ou date ISO complete ;
- `currency` : code ISO, par exemple `EUR`, `USD` ou `XOF` ;
- `category`, `subCategory` et `accountId` : valeurs facultatives.

Dans Raccourcis sur iPhone :

1. Ouvrir `Automatisation`, puis creer une automatisation `Transaction`.
2. Selectionner la carte et le type `Paiement`.
3. Construire l'URL ci-dessus avec les variables fournies par la transaction.
4. Ajouter l'action `Ouvrir les URL`.
5. Choisir `Executer immediatement`.

L'application ouvre toujours le formulaire Budget existant. La transaction n'est jamais enregistree sans validation de l'utilisateur. Si la devise recue n'est pas l'euro, le formulaire le signale dans le commentaire afin d'eviter une conversion silencieuse.
