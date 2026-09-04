# Assistant familial transversal : laboratoire

## Limite volontaire

Route locale : `/ai-lab?access=local-qwen`, onglet **Assistant familial**.
Le contexte initial est vide. Le bouton de scénario fictif charge des exemples
explicitement étiquetés. Aucun foyer réel, historique Supabase ou profil connecté
n'est chargé. Le JSON importé reste dans la mémoire de la page ; l'export est
explicite. Recharger ou quitter l'outil efface ce contexte non exporté.

Ce moteur déterministe ne charge pas Qwen et n'appelle pas une API d'IA.
Il délègue les Courses et les dépenses ordinaires au dialogue sécurisé existant.
Le parseur et le microphone de production restent inchangés.

## Cinq parcours

1. **Besoin familial** : « On reçoit six personnes samedi soir ». Choisir repas,
   courses, agenda ou les trois, puis fournir le menu, les produits/quantités,
   l'heure et la durée. Aucun menu ou produit n'est inventé.
2. **Contexte fourni** : « Remets les courses de la semaine dernière sans les
   boissons », « Retrouve les dépenses pharmacie », « Retrouve les tâches
   cartable ». La semaine précédente est la semaine civile lundi-dimanche du
   fuseau déclaré. Les résultats proviennent uniquement de l'instantané fourni.
3. **Rendez-vous** : « Décale le dentiste à vendredi », puis « Non, celui
   d'Ismaël, et seulement l'après-midi ». Choisir un événement identifié et une
   heure précise. Les propositions évitent les chevauchements dans cet agenda.
4. **Actions précises** : « J'ai pris deux bouteilles de lait sur les trois »
   conserve trois prévues, deux achetées, une restante. « J'ai payé 42 euros
   dont 12 pour la pharmacie », puis « courses » produit 12 + 30 euros,
   sans ajouter à nouveau le total. « Ajoute ça pour maman, pas pour toute la
   famille » réaffecte uniquement les nouveaux ajouts.
5. **Routines définies par l'utilisateur** : éditer le nom, le déclencheur et
   les étapes (courses, tâches, rappels), puis prononcer le déclencheur et une
   date. Seules les étapes enregistrées sont proposées. Les courses sont ajoutées
   au lot courant ; les tâches et rappels portent leur date relative.

## Validation et droits simulés

- Les propositions n'écrivent rien. « Oui » confirme l'ensemble. L'application
  exige en plus l'autorisation de modifier la simulation et un clic explicite.
- Vérification atomique : validité de tous les éléments, droits, contexte,
  identifiants, fuseau, conflits, délais et absence de répétition.
- Changer de profil ou de données invalide les anciennes propositions. Un
  dialogue expire après deux minutes. Une annulation vérifie encore le profil
  et que les données n'ont pas changé depuis la dernière application.
- Un parent de test peut consulter tous les membres. Un enfant peut consulter
  ses données et celles partagées, mais modifier seulement les siennes. Les
  dépenses sont réservées aux parents. Ceci n'est pas une politique serveur.
- Le banc vocal existant transmet les transcriptions finales au même moteur.
  Les alternatives divergentes demandent un choix, jamais une sélection cachée.
  Une confirmation vocale ne déclenche pas une écriture réelle ou simulée.

## Hors de ce périmètre

Pas de réservation médicale, notification push, synchronisation cloud,
historique réel ni nouvelle connexion à un service. Les conflits concernent
uniquement le même membre ou les événements partagés fournis, pas les trajets
ou la disponibilité réelle d'un praticien. Les heures sont des heures locales
du contexte ; la conversion de rappels en instants serveur, notamment aux
changements d'heure, n'est pas implémentée ici. Les formulations et catégories
prises en charge sont bornées ; une ambiguïté non résolue ne doit rien appliquer.

## Vérification

`npm test` inclut les dialogues complets et les garde-fous dans
`tests/householdAssistant.test.ts`. `npm run build` vérifie TypeScript et Vite.
Le build et les tests ne prouvent ni la reconnaissance vocale sur iPhone ni la
lisibilité sur tous les appareils : la recette navigateur et iOS reste distincte.
