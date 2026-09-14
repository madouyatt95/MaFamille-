# Assistant familial : contexte reel et preparations

## Perimetre

Accessible dans le laboratoire vocal PWA, onglet **Mon foyer**. Aucun branchement
dans le microphone principal, le parseur Courses historique, le Budget ou iOS.

- Contexte autorise : membres, agenda, calendriers importes, recettes, courses et
  taches. Champs minimaux, periode de 90 jours, sources partielles signalees,
  contexte expire apres cinq minutes et efface au changement de compte/profil.
- Questions deterministes avec sources et clarification de date ; aucune IA
  distante ni transmission automatique des donnees du foyer a Qwen.
- Preparations de journee : 1 a 8 etapes ordonnees, membres, durees, dependance
  envers un rendez-vous, marges estimees, heure limite et trois alternatives.
  Aucune disponibilite affirmee si un agenda ou une duree manque.
- Recettes liees aux portions, ingredients et date : recalcul des quantites,
  rapprochement exact avec les courses existantes, aucune deduction de stock
  automatique ; revalidation quand la recette change.
- Memoire choisie : preferences et phrases exactes, consentement, visibilite
  personnelle ou familiale, edition, oubli et export. Pas d'apprentissage cache.
- Dialogue vocal : pause, reprise, interruption de la lecture, saisie textuelle
  pendant la pause ; callbacks tardifs neutralises, huit tours et deux minutes.
- Aides specialisees : quatre exercices verifies avec indices et transfert,
  mediation avec deux points de vue et accord explicite, recettes du carnet.
  Qwen local facultatif avec consentement, arret, delai maximal et evaluation
  utilisateur. Ses reponses restent des propositions non certifiees.

## Synchronisation

Migration `20260905001000_assistant_workspace.sql`, appliquee le 5 septembre 2026
via le SQL Editor du projet `ravkssbaxcfhnzsemfrh` apres refus 403 du CLI.
Resultat serveur observe : RLS activee, table nouvellement creee vide.

Table dediee `assistant_workspace_records`, limite de 150 lignes par foyer et
20 Ko de charge utile par ligne. Lecture RLS et mutations uniquement par RPC :
appartenance approuvee, droits parent/enfant, revision comparee avant ecriture.
Les preferences personnelles d'un parent ne sont pas visibles par l'autre.
Les changements d'un autre appareil apparaissent apres actualisation.

## Limites explicites

Les preparations sont synchronisees, mais **ne creent et ne deplacent aucun
evenement, rappel, repas ou produit reel**. Les modules d'origine restent les
points de validation. Les temps de trajet sont des estimations saisies, pas du GPS.
Les nouvelles aides ne remplacent pas les modules Devoirs/Mediation existants.
Le consentement STT rappelle que le navigateur peut utiliser son service vocal.

## Verification

- `npm test` : regressions Courses/Budget et nouveaux tests de contexte, dates,
  ICS, preparations, quantites, memoire, aides et pauses vocales.
- `npm run build` et ESLint cible sur les fichiers modifies.
- Tests SQL isoles avec PGlite, sans connexion aux donnees utilisateur :
  `PGLITE_MODULE=/chemin/pglite/dist/index.js node scripts/check-assistant-workspace.mjs`.
  Ils couvrent RLS, autre foyer, parent/enfant, anon, modifications concurrentes,
  suppression, quota, taille et idempotence de migration.
- Interface de preparations testee avec donnees fictives hors build applicatif.
  La recette authentifiee sur deux appareils et la qualite/vitesse reelle de
  Qwen sur telephone restent a verifier avec un compte connecte.
