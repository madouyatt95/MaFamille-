# MaFamille+

MaFamille+ est une application familiale tout-en-un pour centraliser l'organisation du foyer : agenda, budget, tâches, école, documents, messagerie et modules d'assistance IA.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Vercel
- Capacitor pour les usages mobiles

## Développement local

```bash
npm install
npm run dev
```

## Vérification avant déploiement

```bash
npm run build
npm run lint
```

## Déploiement

Le projet est prévu pour être déployé sur Vercel. La commande de build attendue est :

```bash
npm run build
```

Le dossier de sortie est :

```bash
dist
```

## Notes sécurité

`npm audit` signale actuellement une vulnérabilité connue dans `xlsx`, sans correctif direct disponible dans la version publiée. Les écrans Import/Export Budget sont chargés à la demande pour éviter d'envoyer cette dépendance au chargement initial de l'application. Pour supprimer l'alerte, il faudra remplacer `xlsx` par une alternative maintenue ou limiter les exports/imports aux formats CSV/PDF.
