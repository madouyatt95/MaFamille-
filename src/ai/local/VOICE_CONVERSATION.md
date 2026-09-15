# Dialogue vocal : extensions du 15 septembre 2026

## Perimetre

Les extensions utilisent le moteur deterministe du laboratoire et du pilote PWA
volontaire. Aucun appel Qwen/LLM, changement de politique Supabase, apprentissage
silencieux ou modification du parseur Budget historique. Le microphone natif
iOS reste exclu du pilote. La reconnaissance du navigateur peut etre distante :
ces changements ne garantissent pas un fonctionnement vocal hors ligne.

## Six axes implementes

1. Structure : demandes polies et quantites postposees, y compris plusieurs
   produits delimites. Les dates et destinataires non pris en charge ne sont
   jamais supprimes de la demande pour obtenir artificiellement un ajout.
2. Contexte : corrections de quantite en suffixe, qualification nommee et
   conservation du produit cible apres remplacement. Une ellipse comme
   "et un pomme" apres un jus demande jus ou fruit au lieu de choisir.
3. Questions : un rendez-vous incomplet conserve sa selection/date source
   pendant les precisions de membre et d'heure. Une correction invalide bloque
   l'enregistrement, meme si l'ancienne proposition avait un horaire valide.
4. Donnees autorisees : consultation de la liste fournie, detection d'un manque
   deja inscrit et lecture des noms de membres approuves via les droits existants.
   Aucun stock reel n'est deduit de la liste. Aucun surnom ou routine invente.
5. Reconnaissance : alternatives de quantite sur un meme produit donnent une
   question courte, avec reponse en lettres ou avec unite. Un chiffre nu reste
   un numero de choix. Les hypotheses protegees ne deviennent pas des courses.
6. Evaluation : corpus separe de 24 conversations, assertions sur le resultat
   et les quantites, nombre maximal de questions, confirmations inattendues et
   temps de parsing. Les retours rejouables acceptent des quantites attendues et
   un plafond de questions, sans nouveau stockage ni transmission automatique.

## Verification

```sh
npm test
node --experimental-strip-types scripts/evaluate-voice-parser.mjs
npm run build
npx vite --config tests/fixtures/voice-pilot.vite.ts
```

La derniere commande sert une fixture isolee sur 127.0.0.1:4184, avec services
et authentification fictifs. Ouvrir /tests/fixtures/voice-pilot.html ; le faux
enregistrement ne touche que le DOM de test. Ce n'est pas une route de production.

332 tests et les 24 cas textuels passent. ESLint cible et compilation passent.
L'apercu isole a ete verifie dans le navigateur : sombre sur bureau 1280x900,
clair et sepia sur mobile 390x844. Correction fraise vers vanille, absence
d'ecriture apres simple confirmation, enregistrement fictif, selection du
membre puis horaire, et blocage apres une heure invalide verifies. Aucun
debordement horizontal constate sur le controle mobile clair. La recette avec
parole reelle sur telephone reste a effectuer.

## Limites explicites

Le corpus devient une suite de regression des qu'il sert a corriger le moteur :
son score n'est pas une mesure sur des utilisateurs inconnus. La latence mesuree
ne comprend ni la reconnaissance vocale ni le reseau.

L'agenda pilote change une heure dans la meme journee seulement. Les durees
restent a confirmer pour le controle serveur des conflits. La selection de
membre utilise son nom exact, pas un lien suppose entre "maman" et un compte.
Les associations courses/date/destinataire restent a traiter dans leurs modules.
Les routines et surnoms existants du laboratoire ne sont pas synchronises ni
generalises au micro reel par cette revision.

Cette revision ne necessite pas de nouvelle migration. Le pilote reste volontaire.
