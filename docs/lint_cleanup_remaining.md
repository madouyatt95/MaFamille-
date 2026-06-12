# Mémo - Nettoyage lint restant

État au dernier point connu :

- Build : OK
- Lint : 0 erreur
- Avertissements restants : 541
- Branche : main, modifications locales en cours sur `Membres.tsx` et le mémo lint

## Ce qui a déjà été nettoyé

Les fichiers suivants sont passés à 0 avertissement lint :

- `src/components/modules/Messagerie.tsx`
- `src/views/Timeline.tsx`
- `src/components/modules/CapsuleTemporelle.tsx`
- `src/views/Settings.tsx`
- `src/views/Accueil.tsx`
- `src/views/FamilyMap.tsx`
- `src/views/MenuHub.tsx` : premier nettoyage partiel, de 105 à 61 avertissements
- `src/components/modules/TuteurScolaire.tsx` : nettoyage partiel, de 82 à 27 avertissements
- `src/views/KidSchool.tsx` : nettoyage partiel, de 55 à 21 avertissements
- `src/views/TeenDashboard.tsx` : nettoyage partiel, de 56 à 28 avertissements
- `src/views/Budget.tsx` : nettoyage partiel, de 28 à 21 avertissements
- `src/views/Membres.tsx` : nettoyage partiel, de 26 à 20 avertissements

## Gros foyers restants

Les avertissements restants sont surtout concentrés dans quelques gros fichiers :

- `src/App.tsx` : environ 270 avertissements
- `src/views/MenuHub.tsx` : environ 61 avertissements
- `src/views/TeenDashboard.tsx` : environ 28 avertissements
- `src/components/modules/TuteurScolaire.tsx` : environ 27 avertissements
- `src/views/Budget.tsx` : environ 21 avertissements
- `src/views/KidSchool.tsx` : environ 21 avertissements
- `src/views/Membres.tsx` : environ 20 avertissements

Ces 7 fichiers représentent environ 448 avertissements sur les 541 restants.

## Stratégie conseillée

Ne pas continuer uniquement par petits fichiers de 10 à 20 avertissements. Le prochain passage doit viser un gros bloc :

1. Revenir sur `MenuHub.tsx` pour les `any` restants, mais seulement avec un typage métier plus large pour éviter de casser les sous-modules.
2. Traiter `BudgetExport.tsx`, `BudgetImport.tsx`, `KidMissions.tsx` et `KidsDashboard.tsx` en lots plus courts.
3. Reprendre `TeenDashboard.tsx`, `KidSchool.tsx` et `TuteurScolaire.tsx` seulement pour des refactors React Hooks plus ciblés.
4. Garder `App.tsx` pour un chantier dédié, car le fichier est très gros et mélange beaucoup de responsabilités.

## Types d'avertissements à traiter

- Remplacer les `any` évidents par des types locaux.
- Supprimer les variables/imports inutilisés.
- Remplacer les `catch` vides par des commentaires ou une gestion minimale.
- Pour les warnings React Hooks, agir prudemment : certains peuvent être corrigés mécaniquement, d'autres demandent de restructurer la logique.

## Règle de travail

Pour chaque lot :

1. Nettoyer un fichier ou un groupe cohérent.
2. Vérifier le fichier avec ESLint.
3. Lancer `npm run build`.
4. Mesurer le lint global.
5. Commit + push seulement si le build reste OK et le dépôt est propre.
