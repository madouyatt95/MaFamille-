# Mémo - Nettoyage lint restant

État au dernier point connu :

- Build : OK
- Lint : 0 erreur
- Avertissements restants : 715
- Branche : main, alignée avec origin/main après le commit `bb65ab9`

## Ce qui a déjà été nettoyé

Les fichiers suivants sont passés à 0 avertissement lint :

- `src/components/modules/Messagerie.tsx`
- `src/views/Timeline.tsx`
- `src/components/modules/CapsuleTemporelle.tsx`
- `src/views/Settings.tsx`
- `src/views/Accueil.tsx`
- `src/views/FamilyMap.tsx`

## Gros foyers restants

Les avertissements restants sont surtout concentrés dans quelques gros fichiers :

- `src/App.tsx` : environ 270 avertissements
- `src/views/MenuHub.tsx` : environ 105 avertissements
- `src/components/modules/TuteurScolaire.tsx` : environ 82 avertissements
- `src/views/TeenDashboard.tsx` : environ 56 avertissements
- `src/views/KidSchool.tsx` : environ 55 avertissements

Ces 5 fichiers représentent environ 568 avertissements sur les 715 restants.

## Stratégie conseillée

Ne pas continuer uniquement par petits fichiers de 10 à 20 avertissements. Le prochain passage doit viser un gros bloc :

1. `MenuHub.tsx` ou `TuteurScolaire.tsx` en priorité pour retirer 50 à 80 avertissements d'un coup.
2. Ensuite `TeenDashboard.tsx` et `KidSchool.tsx`.
3. Garder `App.tsx` pour un chantier dédié, car le fichier est très gros et mélange beaucoup de responsabilités.

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
