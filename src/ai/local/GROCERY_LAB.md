# Dialogue Courses V2 : perimetre de validation

Cette V2 ne remplace ni le microphone principal, ni le parseur Budget, ni le
parseur Courses de production. Elle est chargee par `src/dev/GroceryParserLab.tsx`
depuis `/ai-lab`. Qwen et les API ne sont pas invoques par ce dialogue.

## Huit protections et fonctions

1. Routage Budget, Agenda, Sante, Messagerie, Taches et Navigation avant les
   questions en attente et les corrections. Verification avant et apres alias.
   Une demande multi-module est transmise hors du dialogue Courses en entier.
2. Etats de dialogue explicites : produits attendus, confirmation, nom inconnu,
   choix d'un produit. Reponses oui/non et positions ordinales. Expiration fixe
   apres deux minutes, isolement par `scopeKey`, contexte abandonne au changement
   de module/profil. Une nouvelle commande explicite peut remplacer une question.
3. Negations et conditions sans ajout implicite. Les conditions ne deviennent
   pas des regles automatiques et ne consultent aucun stock suppose.
4. Quantites structurees : valeur, unite, taille de pack. Conversion g/kg et
   ml/litre. Valeurs nulles, negatives, non finies, fractions de pieces et
   conditionnements incoherents refuses. Pas de bouteille inventee pour eau.
5. Correspondance exacte au catalogue. Une marque inconnue est conservee, puis
   son nom et la proposition sont confirmes separement. Le vocabulaire personnel
   exige encore un consentement et reste uniquement en memoire de session.
6. Liste courante injectee explicitement : ajout cumulatif, remplacement de
   quantite, correction ciblee, choix ordinal, absence de produit signalee.
   Les unites incompatibles declenchent une clarification.
7. Reducteur de simulation distinct : confirmation, droits explicites, profil,
   expiration, comparaison de la liste de depart, identifiants de proposition
   et de transcription, annulation locale avec controle de revision.
8. Corpus de 128 formulations et tests de dialogues contradictoires : routage
   dans plusieurs etats, alias, repetitions STT, expiration, droits et conflits.
   Les indices affiches sont heuristiques, pas des probabilites mesurees.

## Verification locale

```sh
npm test
npx eslint src/ai/local src/dev/AiLab.tsx src/dev/GroceryParserLab.tsx tests/groceryDialogueSafety.test.ts tests/safeGroceryParserV2.test.ts
npm run build
npm run preview -- --host localhost --port 4178 --strictPort
```

Sur le build de previsualisation, ouvrir `/ai-lab?access=local-qwen`, puis Courses.
L'acces au laboratoire n'est pas une autorisation d'acces aux donnees du foyer.
Dans le dialogue : demande de boissons, precision des produits, correction,
confirmation, application a la liste simulee, tentative repetee et annulation.
L'ecriture simulee est desactivee au depart. Aucune donnee de test n'est envoyee.

## Limites avant production

- Les tests automatises utilisent du texte et un double de reconnaissance vocale :
  aucune performance micro iOS/PWA n'est certifiee par ces tests sous Node.
- Les protections de simulation ne remplacent pas les permissions serveur,
  transactions et garanties d'idempotence persistantes de la vraie application.
- Le routeur reconnait des formes explicites, pas tous les synonymes possibles.
  Les produits inconnus et demandes non prises en charge restent confirmables
  ou refuses. Tous les nombres complexes en francais ne sont pas pris en charge.
- Les droits, la liste et le vocabulaire du labo ne sont pas les donnees reelles.
  Changer l'entree initiale ou recharger la page reinitialise la simulation.
- Avant branchement au micro : tests de transcription consentis sur les vrais
  appareils, comparaisons sans execution, puis activation progressive avec
  retour au parseur historique et validation des autorisations cote serveur.

## Six extensions du laboratoire (septembre 2026)

Le composant de test passe maintenant par `familyVoiceDialogue.ts`, qui compose
la V2 et des propositions de depense specifiques au laboratoire. La V2 seule
continue de refuser une phrase mixte ; le routeur de production reste intact.

1. Demandes mixtes : `ajoute du lait et note 25 euros de courses` donne deux
   propositions et une confirmation globale. Seuls les verbes explicites
   separent les modules. Budget : montant positif en EUR et motif
   explicite, sans date ni virement. Les formes non reconnues sont refusees,
   pas envoyees au vrai Budget. Un echec ne produit pas d'application partielle.
2. Hesitations : `prends trois bouteilles de coca... non, deux et sans sucre`
   conserve deux bouteilles. Les variantes sans ponctuation `non deux` et
   `non plutot deux` sont reconnues. Une correction non resolue bloque la phrase.
3. References : `le lait, prends-le sans lactose`, puis `finalement quatre`.
   Les variantes restent distinctes. Une reference plurielle ou ambigue pose
   une question ; selection par nom ou position. Precisions reconnues : sans
   sucre, sans lactose, bio, entier, ecreme, demi-ecreme. Pas de conseil medical.
4. Planification : les personnes restent dans le contexte court. Si la reponse
   est `du coca`, on demande sa quantite, sans la deduire des trois personnes.
   `deux bouteilles` complete le produit et une seule confirmation suffit.
   Les noms inconnus gardent leur validation specifique avant confirmation.
5. Vocabulaire local : raccourci explicite `lait habituel` vers un seul produit.
   Ajout et modification exigent une case de consentement. Edition, suppression,
   relecture apres rechargement, limites et validation du JSON. Stockage sous
   `myfamily:voice-lab:vocabulary:v1:<profil>`, distinct des donnees familiales.
   Aucun cloud, apprentissage silencieux ou synchronisation inter-appareils.
6. Micro independant : `VoiceBench.tsx` / `labSpeechRecognition.ts`, seulement
   apres consentement et clic. Reconnaissance fr-FR si disponible en contexte
   securise. Les segments finaux sont reunis une seule fois en fin d'ecoute ;
   les intermediaires restent visuels. Arret, refus, erreurs, delais, changement
   de profil, masquage et demontage n'appliquent aucune transcription partielle.

La simulation mixte utilise les verifications de liste, droits fictifs, revision
et identifiants existantes. Courses et depenses sont appliquees et annulees
ensemble dans la memoire de la page seulement. Cela ne constitue pas une
transaction ou une autorisation serveur pour l'application reelle.

### Confidentialite et mesure vocale

La Web Speech API peut utiliser un service distant du navigateur. Ne pas
promettre une reconnaissance hors ligne, meme si Qwen n'est pas charge et
qu'aucune API IA de l'application n'est appelee. Aucune utilisation de
MediaRecorder ni de sauvegarde de l'audio par MyFamily+. Les transcriptions,
mesures et evaluations restent en memoire de la session.

Le banc compare les mots reconnus a une phrase attendue facultative (distance
d'edition / mots de reference). Ce taux peut depasser 100 % et ne mesure pas
la pertinence du parseur. L'interpretation est evaluee separement par la personne.
Le temps debut d'ecoute -> dernier resultat final inclut la parole et les pauses ;
ce n'est pas la latence pure du service. Le temps de parsing est mesure separement.

Source technique : https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

### Verification supplementaire

`tests/familyVoiceDialogue.test.ts` couvre les six extensions, la simulation
mixte et le stockage par profil. `tests/labSpeechRecognition.test.ts` utilise un
double pour les evenements intermediaires, finaux, repetes, annules et en erreur.
Le navigateur valide aussi l'ajout/edition/suppression du vocabulaire, sa
persistance, les permissions, l'annulation et la presentation mobile/bureau.
La reception de vraie parole sur un iPhone reste a tester sur l'appareil.

### Dialogue avance : exclusions, achats et mains libres

Ces extensions restent dans `/ai-lab`. Ni `App.tsx`, ni le parseur de production,
ni les donnees Supabase ne sont modifies par leur execution.

- `ajoute du lait et du pain mais pas de beurre` exclut seulement le beurre de
  cette demande. Un beurre deja present dans la liste n'est pas supprime.
- `j'ai achete le lait et les yaourts`, `coche le pain`, `decoche le lait`
  proposent un changement d'etat, jamais une depense. Les achats partiels et
  references ambigues demandent une precision. Aucun cochage partiel en cas
  d'echec. Un produit deja coche doit etre decoche avant d'ajouter une quantite.
- `un litre et demi`, `une douzaine d'oeufs`, `vingt et un yaourts` et
  `note vingt-cinq euros cinquante de courses` sont structures sans LLM.
  Le catalogue francais inverse de n2words 6.0.1 couvre zero a mille en lettres.
  Un nombre ecrit hors catalogue est refuse, jamais tronque. Les plafonds
  precedents restent applicables aux chiffres. Montants conserves en centimes.
- Les hypotheses effectivement renvoyees par la reconnaissance sont comparees.
  Si les interpretations different, choisir un numero ou la phrase exacte.
  Un simple oui ne choisit rien. Les variantes equivalentes evitent la question.
  Le relecteur manuel permet de tester ce cas sans activer de microphone.
- `annule ma derniere action` prepare un retour en arriere confirme. `annule`
  abandonne seulement une proposition en attente. `annule mon dernier ajout`
  ne cible jamais une coche ou une depense plus recente. Profil, revision,
  signature de la liste et des depenses sont verifies avant application.
- Le dialogue mains libres est volontaire : consentement, activation du mode,
  puis clic micro. TTS puis nouvelle ecoute uniquement apres fin de lecture.
  Arret visible, stop vocal, maximum 8 tours / 2 minutes, 20 secondes par ecoute,
  30 secondes par lecture. Silence de 1,6 seconde demande la finalisation ;
  aucune transcription intermediaire n'est soumise. Masquage, changement de
  profil, retrait du consentement, erreur ou demontage arretent le dialogue.
  La confirmation vocale ne clique jamais sur Appliquer a la simulation.

Le recapitulatif montre les changements, pas uniquement l'etat final. La voix
lit au plus cinq modifications et invite a relire l'ecran pour les suivantes.
La voix francaise locale est preferee si disponible ; la disponibilite et le
caractere hors ligne de la reconnaissance/synthese dependent du navigateur.

Tests supplementaires : `voiceLabAdvanced.test.ts`, `labHandsFree.test.ts` et
`labSpeechRecognition.test.ts`. Le cycle micro/TTS est teste par doubles
controles (erreurs, arret, callbacks tardifs, delais), pas par un enregistrement
reel de l'utilisateur. Une recette vocale sur iOS et PWA reste necessaire avant
toute integration dans le microphone principal.

References : [n2words](https://github.com/forzagreen/n2words),
[alternatives SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/maxAlternatives),
[fin de lecture TTS](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/end_event).
