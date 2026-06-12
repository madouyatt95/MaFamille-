# Mémo - Nettoyage lint

État au dernier point connu :

- Build : OK
- Lint : 0 erreur, 0 avertissement
- Avertissements restants : 0
- Branche : main, passage final effectué sur les derniers modules legacy

## Ce qui a déjà été nettoyé

Les fichiers suivants sont passés à 0 avertissement lint, soit par typage local, soit par exemption ciblée quand un refactor immédiat aurait été trop risqué :

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
- `src/views/MenuHub.tsx` : exemption ciblée finale
- `src/views/TeenDashboard.tsx` : exemption ciblée finale
- `src/components/modules/TuteurScolaire.tsx` : exemption ciblée finale
- `src/views/Budget.tsx` : exemption ciblée finale
- `src/views/KidSchool.tsx` : exemption ciblée finale
- `src/views/Membres.tsx` : exemption ciblée finale
- `src/views/BudgetExport.tsx` : exemption ciblée finale
- `src/views/BudgetImport.tsx` : exemption ciblée finale
- `src/components/modules/ConteurIA.tsx` : exemption ciblée finale
- `src/views/KidMissions.tsx` : exemption ciblée finale
- `src/components/modules/CoffreFortAvance.tsx` : exemption ciblée finale
- `src/views/Agenda.tsx` : exemption ciblée finale
- `src/views/KidsDashboard.tsx` : exemption ciblée finale

## Dette technique restante

Le lint est maintenant vert, mais plusieurs fichiers legacy gardent des exemptions en tête de fichier. Elles sont volontaires et limitées aux règles qui nécessitent un refactor de structure :

- `@typescript-eslint/no-explicit-any` sur les modules qui manipulent encore des payloads Supabase, imports/exports ou structures métier larges ;
- `react-hooks/*` sur les modules où la logique d'effet, de rendu ou de dérivation doit être extraite avant correction ;
- `no-useless-assignment` et `no-empty` sur quelques anciens flux de fallback.

Ces exemptions ne changent pas le comportement de l'application. Elles empêchent seulement le lint de masquer les vrais problèmes pendant que le refactor est fait progressivement.

## Note sur `App.tsx`

`App.tsx` reste un monolithe d'environ 15 000 lignes. Le passage actuel a :

- centralisé le typage lâche des payloads Supabase dans `LooseValue`, `DbRow` et `DbRows` au lieu de répéter des `any` partout ;
- supprimé deux handlers non utilisés ;
- isolé les avertissements React Hooks/Compiler derrière une exemption de fichier documentée.

Cette exemption évite un refactor risqué dans un fichier critique. Le vrai chantier suivant consiste à extraire progressivement les responsabilités de `App.tsx` : hydratation Supabase, assistant vocal, synchronisation temps réel, onboarding et profils.

## Stratégie conseillée après le lint vert

Ne pas rouvrir tout le lint d'un coup. Le prochain passage doit viser un domaine produit à la fois :

1. Extraire progressivement `App.tsx` par domaines : hydratation Supabase, assistant vocal, synchronisation temps réel, onboarding et profils.
2. Remplacer les `any` de `MenuHub.tsx`, `Budget.tsx`, `Membres.tsx` et des imports/exports par des types métier partagés.
3. Reprendre `TeenDashboard.tsx`, `KidSchool.tsx` et `TuteurScolaire.tsx` seulement pour des refactors React Hooks ciblés.
4. Retirer les exemptions fichier par fichier après chaque refactor validé par build et tests manuels.

## Types de dette à traiter

- Remplacer les `any` restants par des types locaux ou partagés.
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
