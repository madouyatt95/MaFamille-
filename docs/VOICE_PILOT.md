# Mode d'essai du parseur PWA

## Livraison

Le parseur historique Courses et le routage Budget ne sont pas modifies.
Le nouveau parcours est desactive par defaut, limite a la PWA et au propre
profil parent approuve de l'utilisateur. Le micro principal conserve son
controle Premium. Aucun appel a un modele generatif n'est ajoute.

Les ajouts couvrent les lots repartis par variante, les corrections ciblees,
les quantites manquantes, les propositions explicites de transcription,
les cas de regression locaux et le deplacement confirme d'un rendez-vous.

## Activation apres publication

1. Appliquer `supabase/migrations/20260914001000_voice_pilot.sql` sur le bon
   projet Supabase. La migration ne change pas les politiques des tables
   existantes. Elle ajoute deux RPC et une table privee de recus.
2. Se connecter a la PWA avec son propre profil parent, ouvrir `/ai-lab`,
   puis Mon foyer et charger son contexte.
3. Activer explicitement « Mode d'essai du micro PWA ».
4. Revenir dans l'application et utiliser le micro principal. Relire la
   proposition, la confirmer, puis cliquer sur « Enregistrer dans mon foyer ».

Sans migration, l'activation est refusee. La desactivation depuis le labo ou
« Revenir au micro habituel » supprime uniquement le choix local : elle ne
supprime pas les donnees du foyer. iOS conserve le parcours existant.

## Bornes et garanties

- Instantane expire apres deux minutes. Un autre changement de liste ou
  d'agenda bloque l'ecriture au lieu d'ecraser des modifications recentes.
- Chaque commande dispose d'un identifiant de recu. Son rejeu identique
  n'applique pas l'action deux fois. Les recus ne contiennent ni audio ni
  phrases, sont limites a 200 par foyer et purges lors d'une utilisation
  ulterieure apres un jour. Le dernier lot reste stocke tant que le foyer
  n'utilise plus le pilote.
- Au maximum 200 produits charges et 40 lignes modifiees par commande.
  Les listes avec doublons ou formats ininterpretables restent dans Courses.
- Les rendez-vous natifs dates et horaires precis peuvent etre avances ou
  retardes le meme jour. Les imports ICS sont consultes pour les conflits,
  jamais modifies. Choix du rendez-vous obligatoire, meme pour un seul resultat.
- Les durees manquantes sont declarees par l'utilisateur pour ce controle.
  Elles ne sont pas inventees ni enregistrees dans l'agenda. Le controle est
  conservateur et inclut les autres membres ainsi que la veille. Il ne prouve
  pas la disponibilite au-dela des donnees et durees fournies.
- Une courte transaction verrouille les tables concernees pour proteger
  egalement des ecritures historiques concurrentes (attente maximale 2 s).
  Le pilote doit rester restreint avant toute generalisation a fort trafic.
- Budget, sante, messagerie et navigation ne sont pas executes par ce pilote.
  Un changement de compte/profil, une erreur ou un doute n'autorise aucune
  execution automatique d'une proposition.

## Retours et validation

Dans l'onglet parseur du labo, « Ce n'est pas ce que j'ai demande » permet de
choisir des phrases de test, le resultat et les produits attendus. La
conservation exige un accord explicite ; l'export est local. Aucune correction
n'est apprise automatiquement. Les cas sont rejoues depuis une liste vide.

```sh
node --experimental-strip-types --test tests/*.test.ts
node --experimental-strip-types scripts/replay-parser-feedback.mjs chemin/export.json
PGLITE_MODULE=/chemin/pglite/dist/index.js node scripts/check-voice-pilot.mjs
PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs node scripts/check-voice-pilot-ui.mjs
npm run build
```

Le test UI necessite Vite sur `127.0.0.1:4183`. Il utilise des fixtures et bloque
tout reseau externe. Il ne valide pas une reconnaissance vocale sur un vrai
iPhone ni l'application de la migration sur le projet Supabase de production.
