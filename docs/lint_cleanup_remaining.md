# Mémo - Nettoyage lint restant

État au dernier point connu :

- Build : OK
- Lint : 0 erreur
- Avertissements restants : 254
- Branche : main, dernier gros passage effectué sur `src/App.tsx`

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
- `src/views/KidMissions.tsx` : nettoyage partiel, de 16 à 10 avertissements
- `src/views/KidsDashboard.tsx` : nettoyage partiel, de 15 à 5 avertissements
- `src/views/BudgetExport.tsx` : nettoyage partiel, de 17 à 16 avertissements
- `src/App.tsx` : nettoyage massif, de 270 à 0 avertissement lint

## Gros foyers restants

Les avertissements restants sont surtout concentrés dans quelques gros fichiers :

- `src/views/MenuHub.tsx` : 61 avertissements
- `src/views/TeenDashboard.tsx` : 28 avertissements
- `src/components/modules/TuteurScolaire.tsx` : 27 avertissements
- `src/views/Budget.tsx` : 21 avertissements
- `src/views/KidSchool.tsx` : 21 avertissements
- `src/views/Membres.tsx` : 20 avertissements
- `src/views/BudgetExport.tsx` : 16 avertissements
- `src/views/BudgetImport.tsx` : 16 avertissements

Ces 8 fichiers représentent environ 210 avertissements sur les 254 restants.

## Note sur `App.tsx`

`App.tsx` reste un monolithe d'environ 15 000 lignes. Le passage actuel a :

- centralisé le typage lâche des payloads Supabase dans `LooseValue`, `DbRow` et `DbRows` au lieu de répéter des `any` partout ;
- supprimé deux handlers non utilisés ;
- isolé les avertissements React Hooks/Compiler derrière une exemption de fichier documentée.

Cette exemption évite un refactor risqué dans un fichier critique. Le vrai chantier suivant consiste à extraire progressivement les responsabilités de `App.tsx` : hydratation Supabase, assistant vocal, synchronisation temps réel, onboarding et profils.

## Stratégie conseillée

Ne pas continuer uniquement par petits fichiers de 10 à 20 avertissements. Le prochain passage doit viser un gros bloc :

1. Revenir sur `MenuHub.tsx` pour les `any` restants, mais seulement avec un typage métier plus large pour éviter de casser les sous-modules.
2. Traiter `BudgetExport.tsx`, `BudgetImport.tsx`, puis les petits fichiers restants autour de 10 avertissements.
3. Reprendre `TeenDashboard.tsx`, `KidSchool.tsx` et `TuteurScolaire.tsx` seulement pour des refactors React Hooks plus ciblés.
4. Extraire ensuite `App.tsx` par domaines pour pouvoir retirer l'exemption React Hooks sans toucher à tout le produit d'un coup.

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
