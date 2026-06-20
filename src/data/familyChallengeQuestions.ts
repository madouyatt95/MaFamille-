export type ChallengeAnswer = {
  label: string;
  aliases: string[];
  points: number;
};

export type FamilyChallengeQuestion = {
  id: string;
  category: 'Maison' | 'Quotidien' | 'Repas' | 'Vacances' | 'École' | 'Loisirs' | 'Famille' | 'Fêtes';
  difficulty: 'Facile' | 'Intermédiaire' | 'Difficile';
  ageGroup: 'Enfants' | 'Adolescents' | 'Famille' | 'Adultes';
  pack: 'Essentiel' | 'Enfants' | 'Adolescents' | 'Parents' | 'Vacances' | 'Fêtes' | 'Culture familiale' | 'Noël & hiver' | 'Été' | 'Grands-parents' | 'France & régions' | 'Monde & cultures';
  prompt: string;
  answers: ChallengeAnswer[];
};

const answer = (value: string, index: number): ChallengeAnswer => {
  const [label, ...aliases] = value.split('|');
  return { label, aliases, points: [40, 30, 25, 20, 15, 10, 5, 3][index] };
};

const EXTRA_ANSWERS: Record<string, string[]> = {
  'maison-01': ['Les lunettes', 'Le chargeur', 'Une chaussure'],
  'maison-02': ['Les toilettes', 'L’entrée', 'La salle à manger'],
  'maison-03': ['Sortir les poubelles', 'Faire les vitres', 'Changer les draps'],
  'maison-04': ['Une porte qui claque', 'Le téléphone', 'Le chien qui aboie'],
  'maison-05': ['Un sèche-linge', 'Un four', 'Des rangements'],
  'maison-06': ['Mettre la table', 'Allumer des bougies', 'Vérifier les toilettes'],
  'quotidien-01': ['Qui a fermé la porte', 'Attendez-moi', 'Tu as pris ton sac'],
  'quotidien-02': ['Ouvrir les volets', 'Prendre une douche', 'Boire de l’eau'],
  'quotidien-03': ['On a mal calculé le temps', 'Le réveil n’a pas sonné', 'On a changé de tenue'],
  'quotidien-04': ['Les écouteurs', 'La gourde', 'Un document'],
  'quotidien-05': ['Du soleil', 'Un bon repas', 'Voir quelqu’un qu’on aime'],
  'quotidien-06': ['La température de la maison', 'Le programme du week-end', 'Les achats'],
  'repas-01': ['Une salade', 'Des restes', 'Des céréales'],
  'repas-02': ['Des biscuits', 'Un soda', 'Des chips'],
  'repas-03': ['Le couscous', 'Les lasagnes', 'La raclette'],
  'repas-04': ['Des légumes', 'Une sauce', 'Des restes'],
  'repas-05': ['C’est trop chaud', 'Je mangerai plus tard', 'J’ai déjà goûté'],
  'repas-06': ['Le fromage', 'Le café', 'Les photos'],
  'vacances-01': ['La crème solaire', 'Les médicaments', 'Une serviette'],
  'vacances-02': ['Chercher la piscine', 'Prendre une photo', 'Regarder la télévision'],
  'vacances-03': ['La chaleur', 'Une réservation ratée', 'Un téléphone déchargé'],
  'vacances-04': ['Un porte-clés', 'Un coquillage', 'Un cadeau local'],
  'vacances-05': ['Un pique-nique', 'Une excursion', 'Une soirée spectacle'],
  'vacances-06': ['J’ai soif', 'Je m’ennuie', 'On écoute quoi'],
  'ecole-01': ['Un livre', 'Une règle', 'Les clés du casier'],
  'ecole-02': ['La chimie', 'La géographie', 'La grammaire'],
  'ecole-03': ['Mon ordinateur ne marchait pas', 'Le chien l’a abîmé', 'Je me suis trompé de jour'],
  'ecole-04': ['Les activités artistiques', 'Le cours préféré', 'Le trajet du retour'],
  'ecole-05': ['Demander de l’aide', 'Faire une fiche', 'Relire ses réponses'],
  'ecole-06': ['Un surligneur', 'De la colle', 'Des feuilles'],
  'loisirs-01': ['Faire une promenade', 'Cuisiner', 'Faire un puzzle'],
  'loisirs-02': ['La course', 'Le basket', 'Le tennis'],
  'loisirs-03': ['Faire un puzzle', 'Inviter des amis', 'Aller à la piscine'],
  'loisirs-04': ['De la crème solaire', 'Un livre', 'Des raquettes'],
  'loisirs-05': ['Dessiner', 'Cuisiner', 'Faire du sport'],
  'loisirs-06': ['Le Cluedo', 'La bataille', 'Le Puissance 4'],
  'famille-01': ['Le petit-déjeuner', 'Une sortie', 'Une réunion familiale'],
  'famille-02': ['Réparer les choses', 'Écouter', 'Conduire'],
  'famille-03': ['Un message', 'Préparer un repas', 'Passer du temps ensemble'],
  'famille-04': ['Raconter des histoires', 'Faire une sortie annuelle', 'Créer une tradition'],
  'famille-05': ['La confiance', 'La communication', 'Le pardon'],
  'famille-06': ['Les vacances', 'Le rangement', 'Le choix du repas'],
  'fetes-01': ['Des invités', 'Des boissons', 'Des photos'],
  'fetes-02': ['Faire la liste des invités', 'Choisir la musique', 'Installer la table'],
  'fetes-03': ['Les blagues', 'Un cadeau inattendu', 'Un enfant qui danse'],
  'fetes-04': ['Applaudir', 'Approcher le gâteau', 'Demander l’âge'],
  'fetes-05': ['Une décoration qui tombe', 'Un invité surprise', 'Une panne de musique'],
  'fetes-06': ['Le gâteau restant', 'Une décoration', 'Un cadeau symbolique']
};

const question = (
  id: string,
  category: FamilyChallengeQuestion['category'],
  difficulty: FamilyChallengeQuestion['difficulty'],
  prompt: string,
  values: string[]
): FamilyChallengeQuestion => ({
  id,
  category,
  difficulty,
  ageGroup: category === 'École' ? 'Enfants' : category === 'Famille' ? 'Famille' : 'Adultes',
  pack: category === 'Vacances' ? 'Vacances' : category === 'Fêtes' ? 'Fêtes' : 'Essentiel',
  prompt,
  answers: [...values, ...(EXTRA_ANSWERS[id] || [])].slice(0, 8).map(answer)
});

const CORE_FAMILY_CHALLENGE_QUESTIONS: FamilyChallengeQuestion[] = [
  question('maison-01', 'Maison', 'Facile', 'Quel objet disparaît le plus souvent à la maison ?', ['Les clés|clefs', 'La télécommande|commande télé', 'Le téléphone|portable|smartphone', 'Les chaussettes|chaussette', 'Un stylo|crayon']),
  question('maison-02', 'Maison', 'Facile', 'Quelle pièce de la maison se salit le plus vite ?', ['La cuisine', 'La salle de bain|sdb', 'Le salon|séjour', 'La chambre des enfants|chambre enfant', 'L’entrée|entree']),
  question('maison-03', 'Maison', 'Intermédiaire', 'Quelle corvée est le plus souvent repoussée ?', ['Ranger|rangement', 'Faire la vaisselle|vaisselle', 'Passer l’aspirateur|aspirateur', 'Plier le linge|linge', 'Nettoyer la salle de bain|nettoyage salle de bain']),
  question('maison-04', 'Maison', 'Facile', 'Quel bruit réveille toute la maison ?', ['Le réveil|alarme', 'Un enfant qui pleure|bébé qui pleure', 'La sonnette|interphone', 'Un objet qui tombe|chute', 'L’aspirateur|aspirateur']),
  question('maison-05', 'Maison', 'Difficile', 'Quel achat améliore immédiatement la vie à la maison ?', ['Un lave-vaisselle|lave vaisselle', 'Un aspirateur robot|robot aspirateur', 'Un canapé|sofa', 'Une machine à café|cafetière', 'Un grand réfrigérateur|frigo']),
  question('maison-06', 'Maison', 'Intermédiaire', 'Que fait-on juste avant l’arrivée des invités ?', ['Ranger rapidement|rangement', 'Nettoyer|faire le ménage', 'Préparer à manger|cuisiner', 'Cacher le désordre|cacher les affaires', 'Mettre de la musique|musique']),

  question('quotidien-01', 'Quotidien', 'Facile', 'Quelle phrase entend-on souvent avant de quitter la maison ?', ['On y va|allez on part', 'Dépêchez-vous|vite', 'Tu as tes clés|les clés', 'Où est mon téléphone|mon portable', 'J’arrive|deux minutes']),
  question('quotidien-02', 'Quotidien', 'Facile', 'Quelle est la première chose faite au réveil ?', ['Regarder l’heure|voir l heure', 'Éteindre le réveil|couper alarme', 'Regarder son téléphone|portable', 'Aller aux toilettes|toilettes', 'Boire un café|café']),
  question('quotidien-03', 'Quotidien', 'Intermédiaire', 'Pourquoi arrive-t-on en retard ?', ['On ne trouve pas ses affaires|chercher affaires', 'Les enfants ne sont pas prêts|enfants pas prêts', 'Les embouteillages|bouchons|trafic', 'On s’est rendormi|panne réveil', 'Un imprévu|contretemps']),
  question('quotidien-04', 'Quotidien', 'Facile', 'Qu’oublie-t-on souvent en partant ?', ['Le téléphone|portable|smartphone', 'Les clés|clefs', 'Le portefeuille|porte monnaie', 'Le chargeur|chargeur téléphone', 'Une veste|manteau']),
  question('quotidien-05', 'Quotidien', 'Intermédiaire', 'Quelle petite chose met rapidement de bonne humeur ?', ['Une bonne nouvelle|bonne nouvelle', 'Un câlin|calin', 'De la musique|chanson', 'Un café|cafe', 'Un message gentil|compliment']),
  question('quotidien-06', 'Quotidien', 'Difficile', 'Quelle décision quotidienne provoque le plus de débats ?', ['Quoi manger|repas', 'L’heure du coucher|coucher', 'Le programme télé|film|télévision', 'Qui fait une tâche|corvée', 'L’usage des écrans|temps écran']),

  question('repas-01', 'Repas', 'Facile', 'Que prépare-t-on quand personne ne sait quoi manger ?', ['Des pâtes|pates|spaghettis', 'Une pizza', 'Des œufs|oeufs|omelette', 'Des sandwiches|sandwich', 'On commande|livraison']),
  question('repas-02', 'Repas', 'Facile', 'Quel aliment les enfants réclament souvent ?', ['Des bonbons|sucreries', 'Du chocolat', 'Des frites', 'Une glace|crème glacée', 'Une pizza']),
  question('repas-03', 'Repas', 'Intermédiaire', 'Quel plat réunit facilement toute la famille ?', ['La pizza', 'Les pâtes|pates', 'Le poulet', 'Les crêpes|crepes', 'Le barbecue|grillades']),
  question('repas-04', 'Repas', 'Facile', 'Que trouve-t-on presque toujours dans un réfrigérateur familial ?', ['Du lait', 'Des œufs|oeufs', 'Du beurre', 'Du fromage', 'Des yaourts|yogourts']),
  question('repas-05', 'Repas', 'Difficile', 'Quelle excuse donne-t-on pour ne pas finir son assiette ?', ['Je n’ai plus faim|plus faim', 'Je n’aime pas|pas bon', 'J’en ai trop|trop servi', 'Je garde de la place pour le dessert|dessert', 'J’ai mal au ventre|mal ventre']),
  question('repas-06', 'Repas', 'Intermédiaire', 'Quel est le meilleur moment d’un repas de fête ?', ['Le dessert', 'L’apéritif|apero', 'Le plat principal|plat', 'Les discussions|parler', 'L’ouverture des cadeaux|cadeaux']),

  question('vacances-01', 'Vacances', 'Facile', 'Qu’oublie-t-on le plus souvent avant de partir en vacances ?', ['Le chargeur|chargeur téléphone', 'La brosse à dents|brosse dent', 'Les papiers|passeport|carte identité', 'Le maillot de bain|maillot', 'Les lunettes de soleil|lunettes']),
  question('vacances-02', 'Vacances', 'Facile', 'Que fait-on en premier en arrivant à l’hôtel ?', ['Poser les valises|défaire bagages', 'Visiter la chambre|regarder chambre', 'Tester le lit|s allonger', 'Regarder la vue|balcon', 'Se connecter au wifi|wifi']),
  question('vacances-03', 'Vacances', 'Intermédiaire', 'Qu’est-ce qui peut gâcher une journée de vacances ?', ['La pluie|mauvais temps', 'Une dispute', 'Un retard', 'Un objet perdu|perdre affaires', 'Être malade|maladie']),
  question('vacances-04', 'Vacances', 'Facile', 'Quel souvenir rapporte-t-on souvent de voyage ?', ['Des photos|photo', 'Un magnet|aimant', 'Une carte postale', 'Un vêtement|tee shirt', 'Une spécialité locale|nourriture']),
  question('vacances-05', 'Vacances', 'Difficile', 'Quelle activité de vacances plaît à presque tous les âges ?', ['La baignade|nager|piscine', 'Une promenade|balade', 'Un restaurant|manger dehors', 'Une visite|musée', 'Un jeu de société|jeu']),
  question('vacances-06', 'Vacances', 'Intermédiaire', 'Que demande-t-on souvent pendant un long trajet ?', ['On arrive quand|c est encore loin', 'On peut s’arrêter|pause', 'J’ai faim|manger', 'Je peux avoir le téléphone|écran', 'Je peux aller aux toilettes|toilettes']),

  question('ecole-01', 'École', 'Facile', 'Qu’oublie-t-on souvent dans son cartable ?', ['Un cahier', 'Une trousse', 'Les devoirs|devoir', 'Le goûter|gouter', 'La gourde|bouteille eau']),
  question('ecole-02', 'École', 'Facile', 'Quelle matière est souvent jugée difficile ?', ['Les mathématiques|maths', 'Le français|francais', 'L’anglais', 'La physique', 'L’histoire|histoire géographie']),
  question('ecole-03', 'École', 'Intermédiaire', 'Quelle excuse donne-t-on quand les devoirs ne sont pas faits ?', ['J’ai oublié|oubli', 'Je n’ai pas compris|pas compris', 'Je n’avais pas le temps|manque temps', 'Je ne savais pas|pas au courant', 'J’ai perdu la feuille|feuille perdue']),
  question('ecole-04', 'École', 'Facile', 'Quel est le meilleur moment de la journée d’école ?', ['La récréation|récré', 'La sortie|fin cours', 'La cantine|déjeuner', 'Le sport|eps', 'Retrouver ses amis|copains']),
  question('ecole-05', 'École', 'Difficile', 'Qu’est-ce qui aide le plus à réussir un contrôle ?', ['Réviser|révisions', 'Bien dormir|sommeil', 'Écouter en classe|attention', 'Faire des exercices|s entraîner', 'Rester calme|confiance']),
  question('ecole-06', 'École', 'Intermédiaire', 'Quel objet scolaire faut-il remplacer le plus souvent ?', ['Un stylo', 'Un crayon', 'Une gomme', 'Un cahier', 'Une règle']),

  question('loisirs-01', 'Loisirs', 'Facile', 'Quelle activité choisit-on pour une soirée tranquille ?', ['Regarder un film|film|cinéma', 'Jouer à un jeu|jeu société', 'Écouter de la musique|musique', 'Lire|lecture', 'Discuter|parler']),
  question('loisirs-02', 'Loisirs', 'Facile', 'Quel sport pratique-t-on facilement en famille ?', ['Le vélo', 'La randonnée|marche', 'La natation|piscine', 'Le football|foot', 'Le badminton']),
  question('loisirs-03', 'Loisirs', 'Intermédiaire', 'Que fait-on quand il pleut tout le week-end ?', ['Regarder des films|série', 'Jouer à des jeux|jeu société', 'Cuisiner|pâtisserie', 'Ranger la maison|ménage', 'Aller au cinéma|cinéma']),
  question('loisirs-04', 'Loisirs', 'Facile', 'Quel objet emporte-t-on pour une sortie au parc ?', ['Un ballon', 'Une gourde|eau', 'Un goûter|pique nique', 'Une couverture|plaid', 'Un vélo|trottinette']),
  question('loisirs-05', 'Loisirs', 'Difficile', 'Quelle activité fait perdre la notion du temps ?', ['Les jeux vidéo|gaming', 'Regarder une série|série télé', 'Lire un livre|lecture', 'Les réseaux sociaux|téléphone', 'Jardiner|bricoler']),
  question('loisirs-06', 'Loisirs', 'Intermédiaire', 'Quel jeu classique connaît presque toute la famille ?', ['Le Monopoly', 'Le Uno', 'Les petits chevaux', 'Le Scrabble', 'Le jeu de l’oie']),

  question('famille-01', 'Famille', 'Facile', 'Quel moment rassemble le plus souvent toute la famille ?', ['Le dîner|repas du soir', 'Le week-end|weekend', 'Un anniversaire|fête', 'Les vacances', 'Une soirée film|film']),
  question('famille-02', 'Famille', 'Intermédiaire', 'Quel talent est particulièrement utile dans une famille ?', ['Tout organiser|organisation', 'Faire rire|humour', 'Cuisiner', 'Calmer les disputes|médiateur', 'Retrouver les objets|chercher']),
  question('famille-03', 'Famille', 'Facile', 'Quelle preuve d’affection fait toujours plaisir ?', ['Un câlin|calin', 'Dire je t’aime|je t aime', 'Un compliment', 'Un petit cadeau|cadeau', 'Rendre service|aider']),
  question('famille-04', 'Famille', 'Intermédiaire', 'Quelle habitude familiale crée les meilleurs souvenirs ?', ['Partir en vacances|voyager', 'Manger ensemble|repas', 'Fêter les anniversaires|anniversaire', 'Prendre des photos|photo', 'Jouer ensemble|jeu']),
  question('famille-05', 'Famille', 'Difficile', 'Quelle qualité est la plus importante pour vivre ensemble ?', ['La patience', 'Le respect', 'L’écoute|ecoute', 'L’entraide|aide', 'L’humour']),
  question('famille-06', 'Famille', 'Intermédiaire', 'Quel sujet provoque le plus souvent une négociation familiale ?', ['Le temps d’écran|écrans', 'L’heure du coucher|coucher', 'Les sorties', 'L’argent de poche|argent', 'Les tâches|corvées']),

  question('fetes-01', 'Fêtes', 'Facile', 'Que trouve-t-on presque toujours à un anniversaire ?', ['Un gâteau|gateau', 'Des bougies', 'Des cadeaux', 'Des ballons', 'De la musique']),
  question('fetes-02', 'Fêtes', 'Facile', 'Quelle préparation de fête prend plus de temps que prévu ?', ['La cuisine|repas', 'La décoration|déco', 'Choisir une tenue|habits', 'Ranger la maison|ménage', 'Emballer les cadeaux|paquets']),
  question('fetes-03', 'Fêtes', 'Intermédiaire', 'Qu’est-ce qui fait rire pendant une fête de famille ?', ['Les anciennes photos|photos', 'Une histoire embarrassante|anecdote', 'La danse|danser', 'Les jeux', 'Les enfants']),
  question('fetes-04', 'Fêtes', 'Facile', 'Que fait-on juste avant de souffler les bougies ?', ['Chanter joyeux anniversaire|chanter', 'Prendre une photo|photo', 'Faire un vœu|voeu', 'Compter les bougies|compter', 'Éteindre la lumière|lumière']),
  question('fetes-05', 'Fêtes', 'Difficile', 'Quel détail peut provoquer un petit stress avant une fête ?', ['Un invité en retard|retard', 'Un plat raté|repas raté', 'Un cadeau oublié|oubli cadeau', 'Une tenue tachée|tache', 'Le mauvais temps|pluie']),
  question('fetes-06', 'Fêtes', 'Intermédiaire', 'Quel est le meilleur souvenir à conserver après une fête ?', ['Les photos|photo', 'Une vidéo', 'Une carte|mot écrit', 'Un objet souvenir', 'Les messages|témoignages'])
];

type ExpansionSeed = [
  prompt: string,
  pool: number,
  difficulty?: FamilyChallengeQuestion['difficulty'],
  ageGroup?: FamilyChallengeQuestion['ageGroup'],
  pack?: FamilyChallengeQuestion['pack']
];

const EXPANSION_POOLS: Record<FamilyChallengeQuestion['category'], string[][]> = {
  Maison: [
    ['Le canapé|sofa', 'La cuisine', 'Le lit', 'La télévision|télé', 'La salle de bain', 'Le balcon|terrasse', 'Le bureau', 'Le jardin'],
    ['Les clés|clefs', 'Le téléphone|portable', 'La télécommande', 'Les lunettes', 'Le chargeur', 'Le portefeuille', 'Les chaussettes', 'Un stylo'],
    ['Ranger', 'Passer l’aspirateur', 'Faire la vaisselle', 'Plier le linge', 'Sortir les poubelles', 'Nettoyer la salle de bain', 'Faire les vitres', 'Changer les draps'],
    ['Un lave-vaisselle', 'Un aspirateur robot', 'Une machine à laver', 'Un grand réfrigérateur|frigo', 'Un sèche-linge', 'Un four', 'Des rangements', 'Une machine à café'],
    ['La sonnette', 'Le réveil', 'L’aspirateur', 'Une porte qui claque', 'Un enfant qui pleure', 'Le téléphone', 'Le chien', 'Un objet qui tombe']
  ],
  Quotidien: [
    ['Le téléphone|portable', 'Les clés|clefs', 'Le portefeuille', 'Le chargeur', 'Une veste', 'Les écouteurs', 'La gourde', 'Un document'],
    ['Regarder l’heure', 'Éteindre le réveil', 'Regarder son téléphone', 'Aller aux toilettes', 'Boire un café', 'Ouvrir les volets', 'Prendre une douche', 'Boire de l’eau'],
    ['Les embouteillages|bouchons', 'Chercher ses affaires', 'Les enfants ne sont pas prêts', 'Se rendormir', 'Un imprévu', 'Mal calculer le temps', 'Changer de tenue', 'Le réveil ne sonne pas'],
    ['Un câlin|calin', 'Une bonne nouvelle', 'De la musique', 'Un café', 'Un compliment', 'Du soleil', 'Un bon repas', 'Voir un proche'],
    ['Le repas', 'Le coucher', 'Le programme télé', 'Les tâches', 'Le temps d’écran', 'Les achats', 'Le week-end', 'La température de la maison']
  ],
  Repas: [
    ['Des pâtes|pates', 'Une pizza', 'Des œufs|oeufs', 'Des sandwiches', 'Une salade', 'Des restes', 'Des céréales', 'Commander un repas'],
    ['Le chocolat', 'Les bonbons', 'Les frites', 'La glace', 'La pizza', 'Les biscuits', 'Les chips', 'Un soda'],
    ['La pizza', 'Les pâtes', 'Le poulet', 'Les crêpes', 'Le barbecue', 'Le couscous', 'Les lasagnes', 'La raclette'],
    ['Le lait', 'Les œufs|oeufs', 'Le beurre', 'Le fromage', 'Les yaourts', 'Des légumes', 'Une sauce', 'Des restes'],
    ['Le dessert', 'L’apéritif|apero', 'Le plat principal', 'Les discussions', 'Les cadeaux', 'Le fromage', 'Le café', 'Les photos']
  ],
  Vacances: [
    ['Le chargeur', 'La brosse à dents', 'Les papiers', 'Le maillot de bain', 'Les lunettes de soleil', 'La crème solaire', 'Les médicaments', 'Une serviette'],
    ['Poser les valises', 'Visiter la chambre', 'Tester le lit', 'Regarder la vue', 'Se connecter au wifi', 'Chercher la piscine', 'Prendre une photo', 'Se reposer'],
    ['La pluie', 'Une dispute', 'Un retard', 'Un objet perdu', 'Être malade', 'La chaleur', 'Une réservation ratée', 'Un téléphone déchargé'],
    ['Des photos', 'Un magnet', 'Une carte postale', 'Un vêtement', 'Une spécialité locale', 'Un porte-clés', 'Un coquillage', 'Un cadeau local'],
    ['La baignade', 'Une promenade', 'Un restaurant', 'Une visite', 'Un jeu de société', 'Un pique-nique', 'Une excursion', 'Un spectacle']
  ],
  École: [
    ['Un cahier', 'Une trousse', 'Les devoirs', 'Le goûter', 'La gourde', 'Un livre', 'Une règle', 'Les clés du casier'],
    ['Les mathématiques|maths', 'Le français', 'L’anglais', 'La physique', 'L’histoire', 'La chimie', 'La géographie', 'La grammaire'],
    ['Réviser', 'Bien dormir', 'Écouter en classe', 'Faire des exercices', 'Rester calme', 'Demander de l’aide', 'Faire une fiche', 'Relire ses réponses'],
    ['Un stylo', 'Un crayon', 'Une gomme', 'Un cahier', 'Une règle', 'Un surligneur', 'De la colle', 'Des feuilles'],
    ['La récréation|récré', 'La sortie', 'La cantine', 'Le sport', 'Les amis', 'Les activités artistiques', 'Le cours préféré', 'Le trajet du retour']
  ],
  Loisirs: [
    ['Regarder un film', 'Jouer à un jeu', 'Écouter de la musique', 'Lire', 'Discuter', 'Faire une promenade', 'Cuisiner', 'Faire un puzzle'],
    ['Le vélo', 'La randonnée', 'La natation', 'Le football', 'Le badminton', 'La course', 'Le basket', 'Le tennis'],
    ['Un ballon', 'Une gourde', 'Un goûter', 'Une couverture', 'Un vélo', 'De la crème solaire', 'Un livre', 'Des raquettes'],
    ['Les jeux vidéo', 'Une série', 'La lecture', 'Les réseaux sociaux', 'Le jardinage', 'Le dessin', 'La cuisine', 'Le sport'],
    ['Le Monopoly', 'Le Uno', 'Les petits chevaux', 'Le Scrabble', 'Le jeu de l’oie', 'Le Cluedo', 'La bataille', 'Le Puissance 4']
  ],
  Famille: [
    ['Le dîner', 'Le week-end', 'Un anniversaire', 'Les vacances', 'Une soirée film', 'Le petit-déjeuner', 'Une sortie', 'Une réunion familiale'],
    ['L’organisation', 'L’humour', 'La cuisine', 'Calmer les disputes', 'Retrouver les objets', 'Réparer', 'Écouter', 'Conduire'],
    ['Un câlin', 'Dire je t’aime', 'Un compliment', 'Un cadeau', 'Rendre service', 'Un message', 'Préparer un repas', 'Passer du temps ensemble'],
    ['Les vacances', 'Les repas', 'Les anniversaires', 'Les photos', 'Les jeux', 'Les histoires', 'Une sortie annuelle', 'Une tradition'],
    ['La patience', 'Le respect', 'L’écoute', 'L’entraide', 'L’humour', 'La confiance', 'La communication', 'Le pardon']
  ],
  Fêtes: [
    ['Un gâteau', 'Des bougies', 'Des cadeaux', 'Des ballons', 'De la musique', 'Des invités', 'Des boissons', 'Des photos'],
    ['La cuisine', 'La décoration', 'Choisir une tenue', 'Ranger la maison', 'Emballer les cadeaux', 'La liste des invités', 'La musique', 'Installer la table'],
    ['Les anciennes photos', 'Une anecdote', 'La danse', 'Les jeux', 'Les enfants', 'Les blagues', 'Un cadeau inattendu', 'Un enfant qui danse'],
    ['Chanter', 'Prendre une photo', 'Faire un vœu', 'Compter les bougies', 'Éteindre la lumière', 'Applaudir', 'Approcher le gâteau', 'Demander l’âge'],
    ['Un invité en retard', 'Un plat raté', 'Un cadeau oublié', 'Une tenue tachée', 'La pluie', 'Une décoration qui tombe', 'Un invité surprise', 'Une panne de musique']
  ]
};

const EXPANSION_SEEDS: Record<FamilyChallengeQuestion['category'], ExpansionSeed[]> = {
  Maison: [
    ['Dans quel endroit de la maison aime-t-on se retrouver ?', 0], ['Où finit-on souvent par s’endormir sans le prévoir ?', 0], ['Quelle pièce montre-t-on en premier aux invités ?', 0],
    ['Quel endroit devient vite le quartier général du week-end ?', 0], ['Quel objet cherche-t-on juste avant de sortir ?', 1], ['Quel objet est souvent emprunté sans demander ?', 1],
    ['Quel objet retrouve-t-on dans un endroit improbable ?', 1], ['Quelle corvée demande le plus de motivation ?', 2], ['Quelle tâche donne le résultat le plus visible ?', 2],
    ['Quelle corvée crée le plus de négociations ?', 2], ['Quelle tâche fait-on en urgence avant une visite ?', 2], ['Quel équipement ferait gagner le plus de temps ?', 3],
    ['Quel appareil manque le plus lorsqu’il tombe en panne ?', 3], ['Quel achat rendrait une petite maison plus pratique ?', 3], ['Quel équipement est le plus utilisé chaque semaine ?', 3],
    ['Quel bruit fait vérifier ce qui se passe dans la maison ?', 4], ['Quel bruit est le plus difficile à ignorer ?', 4], ['Quel son annonce souvent une interruption ?', 4],
    ['Quel bruit déclenche le plus souvent un « qui a fait ça ? » ?', 4]
  ],
  Quotidien: [
    ['Quel objet vérifie-t-on avant de fermer la porte ?', 0], ['Quel objet oublie-t-on au pire moment ?', 0], ['Que retourne-t-on chercher après être parti ?', 0],
    ['Quel objet passe le plus souvent d’une poche à l’autre ?', 0], ['Quelle action est faite presque machinalement le matin ?', 1], ['Que fait-on pour gagner cinq minutes au réveil ?', 1],
    ['Quelle habitude matinale est la plus difficile à changer ?', 1], ['Quelle est la cause la plus fréquente d’un départ retardé ?', 2], ['Quel imprévu bouleverse le plus facilement la matinée ?', 2],
    ['Quelle excuse de retard semble la plus crédible ?', 2], ['Qu’est-ce qui transforme une journée ordinaire en bonne journée ?', 3], ['Quel petit plaisir est le plus facile à offrir ?', 3],
    ['Qu’est-ce qui aide le plus à repartir après une mauvaise journée ?', 3], ['Quel geste améliore immédiatement l’ambiance ?', 3], ['Quel choix quotidien fait parler toute la famille ?', 4],
    ['Quel sujet est reporté jusqu’au dernier moment ?', 4], ['Quelle décision prend plus de temps qu’elle ne devrait ?', 4], ['Sur quoi change-t-on le plus souvent d’avis ?', 4],
    ['Quel sujet revient presque chaque soir ?', 4]
  ],
  Repas: [
    ['Quel repas prépare-t-on avec très peu de temps ?', 0], ['Que cuisine-t-on lorsque le réfrigérateur semble vide ?', 0], ['Quel repas sauve le plus souvent un dimanche soir ?', 0],
    ['Quel plat est le plus facile à adapter aux goûts de chacun ?', 0], ['Quelle gourmandise disparaît le plus vite du placard ?', 1], ['Quel aliment est le plus difficile à partager équitablement ?', 1],
    ['Que réclame-t-on après avoir pourtant dit ne plus avoir faim ?', 1], ['Quel aliment est le plus associé à une soirée détente ?', 1], ['Quel plat fait venir tout le monde à table ?', 2],
    ['Quel repas donne le plus envie de se resservir ?', 2], ['Quel plat convient le mieux à une grande tablée ?', 2], ['Quel repas crée le plus de souvenirs ?', 2],
    ['Quel produit manque toujours quand on veut cuisiner ?', 3], ['Quel aliment vérifie-t-on le plus souvent avant les courses ?', 3], ['Que trouve-t-on dans presque tous les petits-déjeuners ?', 3],
    ['Quel aliment sert le plus souvent à improviser un repas ?', 3], ['Quelle partie d’un repas de fête dure le plus longtemps ?', 4], ['Quel moment du repas rassemble le plus les générations ?', 4],
    ['Qu’attend-on avec le plus d’impatience pendant un grand repas ?', 4]
  ],
  Vacances: [
    ['Quel objet est indispensable mais souvent oublié en voyage ?', 0], ['Que vérifie-t-on plusieurs fois avant un départ ?', 0], ['Quel oubli oblige le plus souvent à acheter sur place ?', 0],
    ['Quel objet prend toujours plus de place que prévu dans la valise ?', 0], ['Que fait-on pour découvrir immédiatement son lieu de vacances ?', 1], ['Quelle est la première vérification dans une location ?', 1],
    ['Quelle activité fait-on avant même de défaire les bagages ?', 1], ['Quel détail peut gâcher une excursion ?', 2], ['Quel incident de voyage fait perdre le plus de temps ?', 2],
    ['Qu’est-ce qui provoque le plus facilement une dispute en vacances ?', 2], ['Quel imprévu oblige à changer tout le programme ?', 2], ['Quel souvenir offre-t-on le plus facilement au retour ?', 3],
    ['Quel objet rappelle le mieux un voyage plusieurs années après ?', 3], ['Que collectionne-t-on le plus volontiers pendant les vacances ?', 3], ['Quel souvenir coûte peu mais fait toujours plaisir ?', 3],
    ['Quelle activité convient le mieux à une journée sans programme ?', 4], ['Quelle sortie permet de contenter plusieurs générations ?', 4], ['Quelle activité donne les meilleures photos ?', 4],
    ['Quel programme choisit-on pour une dernière journée de vacances ?', 4]
  ],
  École: [
    ['Quel objet scolaire est le plus souvent oublié à la maison ?', 0, 'Facile', 'Enfants', 'Enfants'], ['Que demande-t-on le plus souvent à un camarade de prêter ?', 0, 'Facile', 'Enfants', 'Enfants'],
    ['Quel objet alourdit inutilement le cartable ?', 0, 'Intermédiaire', 'Enfants', 'Enfants'], ['Quelle matière demande le plus de concentration ?', 1, 'Facile', 'Enfants', 'Enfants'],
    ['Quelle matière provoque le plus souvent une demande d’aide ?', 1, 'Intermédiaire', 'Adolescents', 'Adolescents'], ['Quel cours paraît passer le moins vite ?', 1, 'Intermédiaire', 'Adolescents', 'Adolescents'],
    ['Quelle matière est la plus difficile à réviser seul ?', 1, 'Difficile', 'Adolescents', 'Adolescents'], ['Quelle habitude améliore le plus les résultats ?', 2, 'Facile', 'Enfants', 'Enfants'],
    ['Que faut-il faire en premier avant un contrôle ?', 2, 'Intermédiaire', 'Adolescents', 'Adolescents'], ['Quel conseil scolaire est le plus souvent répété ?', 2, 'Facile', 'Enfants', 'Enfants'],
    ['Qu’est-ce qui aide à reprendre confiance après une mauvaise note ?', 2, 'Difficile', 'Adolescents', 'Adolescents'], ['Quelle fourniture disparaît le plus vite ?', 3, 'Facile', 'Enfants', 'Enfants'],
    ['Quel objet faut-il racheter plusieurs fois dans l’année ?', 3, 'Facile', 'Enfants', 'Enfants'], ['Quelle fourniture est la plus souvent personnalisée ?', 3, 'Intermédiaire', 'Enfants', 'Enfants'],
    ['Quel objet scolaire est le plus souvent mâchouillé ou abîmé ?', 3, 'Facile', 'Enfants', 'Enfants'], ['Quel moment permet le mieux de retrouver ses amis ?', 4, 'Facile', 'Enfants', 'Enfants'],
    ['Quel moment de l’école crée les meilleurs souvenirs ?', 4, 'Intermédiaire', 'Adolescents', 'Adolescents'], ['Quelle partie de la journée scolaire est la plus attendue ?', 4, 'Facile', 'Enfants', 'Enfants'],
    ['Quel moment donne le plus envie de raconter sa journée ?', 4, 'Intermédiaire', 'Enfants', 'Enfants']
  ],
  Loisirs: [
    ['Quelle activité choisit-on pour ralentir le rythme ?', 0], ['Que propose-t-on lorsqu’on veut rester à la maison ?', 0], ['Quelle activité est la plus facile à commencer sans préparation ?', 0],
    ['Quel loisir permet le mieux de discuter en même temps ?', 0], ['Quel sport est le plus simple à pratiquer sans club ?', 1], ['Quelle activité sportive convient à plusieurs niveaux ?', 1],
    ['Quel sport donne le plus facilement envie de sortir ?', 1], ['Quelle activité physique peut devenir une sortie familiale ?', 1], ['Quel objet oublie-t-on le plus souvent pour une sortie ?', 2],
    ['Que faut-il toujours prévoir pour occuper les enfants dehors ?', 2], ['Quel accessoire rend une sortie plus confortable ?', 2], ['Quel loisir fait le plus oublier l’heure ?', 3],
    ['Quelle activité absorbe le plus facilement toute l’attention ?', 3], ['Quel passe-temps peut durer bien plus longtemps que prévu ?', 3], ['Quel loisir est le plus difficile à interrompre ?', 3],
    ['Quel jeu ressort le plus souvent lors d’une soirée familiale ?', 4], ['Quel jeu provoque le plus de revanche immédiate ?', 4], ['Quel jeu est expliqué le plus vite aux nouveaux joueurs ?', 4],
    ['Quel classique traverse le mieux les générations ?', 4]
  ],
  Famille: [
    ['Quel rendez-vous familial est le plus difficile à déplacer ?', 0], ['Quel moment permet le mieux de prendre des nouvelles de chacun ?', 0], ['Quand fait-on le plus facilement une photo de toute la famille ?', 0],
    ['Quel moment mérite le plus d’éteindre les téléphones ?', 0], ['Quel talent familial est le plus sous-estimé ?', 1], ['Quelle compétence sauve le plus souvent une journée compliquée ?', 1],
    ['Quel rôle finit toujours par être confié à la même personne ?', 1], ['Quel talent aimerait-on transmettre aux enfants ?', 1], ['Quel geste d’affection est compris à tout âge ?', 2],
    ['Quelle attention fait plaisir sans coûter d’argent ?', 2], ['Comment montre-t-on le plus souvent qu’on pense à quelqu’un ?', 2], ['Quel geste réconcilie le plus vite après une dispute ?', 2],
    ['Quelle tradition familiale serait la plus difficile à abandonner ?', 3], ['Quelle habitude mérite de devenir une tradition ?', 3], ['Quel rituel donne le plus le sentiment d’appartenir à une famille ?', 3],
    ['Quel souvenir familial raconte-t-on le plus souvent ?', 3], ['Quelle qualité évite le plus de conflits ?', 4], ['Quelle valeur souhaite-t-on transmettre en premier ?', 4],
    ['Quelle qualité aide le plus une famille dans une période difficile ?', 4]
  ],
  Fêtes: [
    ['Quel élément annonce immédiatement qu’une fête commence ?', 0, 'Facile', 'Famille', 'Fêtes'], ['Que remarque-t-on en premier en arrivant à un anniversaire ?', 0, 'Facile', 'Enfants', 'Fêtes'],
    ['Quel élément est indispensable sur les photos de fête ?', 0, 'Facile', 'Famille', 'Fêtes'], ['Quelle préparation est le plus souvent terminée en retard ?', 1, 'Intermédiaire', 'Adultes', 'Fêtes'],
    ['Que prépare-t-on plusieurs jours avant une grande fête ?', 1, 'Intermédiaire', 'Adultes', 'Fêtes'], ['Quelle tâche de fête demande le plus d’aide ?', 1, 'Intermédiaire', 'Famille', 'Fêtes'],
    ['Quel détail est changé au dernier moment ?', 1, 'Difficile', 'Adultes', 'Fêtes'], ['Qu’est-ce qui déclenche le plus facilement un fou rire en famille ?', 2, 'Facile', 'Famille', 'Fêtes'],
    ['Quel moment de fête devient souvent une vidéo ?', 2, 'Facile', 'Famille', 'Fêtes'], ['Qu’est-ce que les enfants retiennent le plus d’une fête ?', 2, 'Facile', 'Enfants', 'Fêtes'],
    ['Quel souvenir ressort lors des fêtes suivantes ?', 2, 'Intermédiaire', 'Famille', 'Fêtes'], ['Que fait presque tout le monde avant de couper le gâteau ?', 3, 'Facile', 'Famille', 'Fêtes'],
    ['Quel geste provoque le plus de téléphones levés ?', 3, 'Facile', 'Famille', 'Fêtes'], ['Quel moment fait taire la salle quelques secondes ?', 3, 'Intermédiaire', 'Famille', 'Fêtes'],
    ['Quel petit problème crée le plus de stress juste avant les invités ?', 4, 'Intermédiaire', 'Adultes', 'Fêtes'], ['Quel imprévu oblige à improviser pendant une fête ?', 4, 'Difficile', 'Adultes', 'Fêtes'],
    ['Quel détail vérifie-t-on plusieurs fois avant une réception ?', 4, 'Intermédiaire', 'Adultes', 'Fêtes'], ['Quel incident est souvent drôle seulement après coup ?', 4, 'Difficile', 'Famille', 'Fêtes'],
    ['Quel problème peut retarder le début de toute la fête ?', 4, 'Intermédiaire', 'Adultes', 'Fêtes']
  ]
};

const packForCategory = (
  category: FamilyChallengeQuestion['category'],
  ageGroup: FamilyChallengeQuestion['ageGroup']
): FamilyChallengeQuestion['pack'] => {
  if (category === 'Vacances') return 'Vacances';
  if (category === 'Fêtes') return 'Fêtes';
  if (ageGroup === 'Enfants') return 'Enfants';
  if (ageGroup === 'Adolescents') return 'Adolescents';
  if (ageGroup === 'Adultes') return 'Parents';
  if (category === 'Famille') return 'Culture familiale';
  return 'Essentiel';
};

const EXPANDED_FAMILY_CHALLENGE_QUESTIONS: FamilyChallengeQuestion[] = (
  Object.entries(EXPANSION_SEEDS) as Array<[FamilyChallengeQuestion['category'], ExpansionSeed[]]>
).flatMap(([category, seeds]) => seeds.map((seed, index) => {
  const [prompt, poolIndex, difficulty = 'Intermédiaire', explicitAgeGroup, explicitPack] = seed;
  const ageGroup = explicitAgeGroup || (['Enfants', 'Adolescents', 'Adultes', 'Famille'] as const)[index % 4];
  return {
    id: `survey-${category.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${String(index + 1).padStart(2, '0')}`,
    category,
    difficulty,
    ageGroup,
    pack: explicitPack || packForCategory(category, ageGroup),
    prompt,
    answers: EXPANSION_POOLS[category][poolIndex].map(answer)
  };
}));

const themedQuestion = (
  id: string,
  category: FamilyChallengeQuestion['category'],
  difficulty: FamilyChallengeQuestion['difficulty'],
  ageGroup: FamilyChallengeQuestion['ageGroup'],
  pack: FamilyChallengeQuestion['pack'],
  prompt: string,
  values: string[]
): FamilyChallengeQuestion => ({
  id,
  category,
  difficulty,
  ageGroup,
  pack,
  prompt,
  answers: values.map(answer)
});

const THEMED_FAMILY_CHALLENGE_QUESTIONS: FamilyChallengeQuestion[] = [
  themedQuestion('noel-01', 'Fêtes', 'Facile', 'Famille', 'Noël & hiver', 'Que fait-on en premier le matin de Noël ?', ['Ouvrir les cadeaux|cadeaux', 'Réveiller la famille', 'Regarder sous le sapin', 'Prendre un petit-déjeuner', 'Faire des photos', 'Mettre de la musique', 'Allumer les décorations', 'Appeler les proches']),
  themedQuestion('noel-02', 'Fêtes', 'Facile', 'Enfants', 'Noël & hiver', 'Quelle décoration les enfants préfèrent-ils installer ?', ['Les boules du sapin|boules', 'Les guirlandes lumineuses|lumières', 'L’étoile du sapin|étoile', 'La crèche', 'Les décorations de fenêtre', 'Les chaussettes de Noël', 'La couronne de porte', 'Les figurines']),
  themedQuestion('noel-03', 'Repas', 'Intermédiaire', 'Famille', 'Noël & hiver', 'Quel aliment évoque immédiatement les fêtes de fin d’année ?', ['Le chocolat', 'La bûche|buche de Noël', 'Les clémentines|mandarines', 'Le pain d’épices', 'Les marrons', 'Le saumon fumé', 'Les biscuits', 'Le fromage']),
  themedQuestion('noel-04', 'Quotidien', 'Intermédiaire', 'Famille', 'Noël & hiver', 'Quelle activité familiale choisit-on lorsqu’il fait très froid ?', ['Regarder un film', 'Boire un chocolat chaud', 'Jouer à un jeu de société', 'Cuisiner', 'Faire une promenade dans la neige', 'Lire', 'Faire un puzzle', 'Décorer la maison']),
  themedQuestion('noel-05', 'Vacances', 'Difficile', 'Adultes', 'Noël & hiver', 'Quel détail complique le plus un départ en vacances d’hiver ?', ['La météo|neige', 'Les bagages volumineux', 'Les routes chargées|embouteillages', 'Les chaînes ou pneus neige', 'Les cadeaux à transporter', 'Le froid au départ', 'Une réservation oubliée', 'Les enfants impatients']),
  themedQuestion('noel-06', 'Fêtes', 'Intermédiaire', 'Famille', 'Noël & hiver', 'Quel cadeau de dernière minute achète-t-on le plus facilement ?', ['Du chocolat', 'Une carte cadeau', 'Un livre', 'Un parfum', 'Un vêtement', 'Un jeu', 'Des fleurs', 'Une bouteille']),
  themedQuestion('noel-07', 'Famille', 'Difficile', 'Famille', 'Noël & hiver', 'Quelle tradition de fin d’année crée le plus de souvenirs ?', ['Décorer le sapin', 'Le repas familial', 'Ouvrir les cadeaux', 'Regarder un film de Noël', 'Faire une photo de famille', 'Préparer des biscuits', 'Voir les illuminations', 'Écrire des cartes']),
  themedQuestion('noel-08', 'Maison', 'Facile', 'Enfants', 'Noël & hiver', 'Quel objet disparaît souvent pendant l’emballage des cadeaux ?', ['Le ruban adhésif|scotch', 'Les ciseaux', 'Le papier cadeau', 'Les étiquettes', 'Un stylo', 'Le ruban', 'La ficelle', 'Le cadeau lui-même']),

  themedQuestion('ete-01', 'Vacances', 'Facile', 'Famille', 'Été', 'Que met-on en premier dans un sac pour la plage ?', ['La serviette', 'La crème solaire', 'Le maillot de bain', 'Une bouteille d’eau', 'Les lunettes de soleil', 'Un chapeau', 'Un goûter', 'Un livre']),
  themedQuestion('ete-02', 'Repas', 'Facile', 'Enfants', 'Été', 'Quel aliment fait le plus penser à l’été ?', ['La glace', 'La pastèque', 'Le melon', 'Les fraises', 'Les tomates', 'Les grillades', 'Les pêches', 'La salade']),
  themedQuestion('ete-03', 'Loisirs', 'Intermédiaire', 'Famille', 'Été', 'Quelle activité choisit-on pour profiter d’une longue soirée d’été ?', ['Un barbecue', 'Une promenade', 'Manger en terrasse', 'Jouer dehors', 'Regarder le coucher du soleil', 'Aller à un concert', 'Faire du vélo', 'Observer les étoiles']),
  themedQuestion('ete-04', 'Quotidien', 'Intermédiaire', 'Famille', 'Été', 'Qu’est-ce qui gêne le plus pendant une nuit très chaude ?', ['Ne pas réussir à dormir', 'Les moustiques', 'Le bruit dehors', 'La chambre trop chaude', 'La soif', 'Les draps qui collent', 'Le ventilateur bruyant', 'La lumière du matin']),
  themedQuestion('ete-05', 'Vacances', 'Difficile', 'Adultes', 'Été', 'Quel imprévu change le plus facilement une journée d’été ?', ['Un orage', 'Un coup de soleil', 'Une plage bondée', 'Une voiture en panne', 'Une réservation annulée', 'Un enfant malade', 'La canicule', 'Un objet oublié']),
  themedQuestion('ete-06', 'Loisirs', 'Facile', 'Enfants', 'Été', 'Quel jeu fait-on facilement dehors pendant les vacances ?', ['Jouer au ballon', 'Faire une bataille d’eau', 'Jouer aux raquettes', 'Faire du vélo', 'Construire un château de sable', 'Jouer à cache-cache', 'Faire une course', 'Lancer un frisbee']),
  themedQuestion('ete-07', 'Maison', 'Intermédiaire', 'Famille', 'Été', 'Quelle tâche fait-on juste avant de partir longtemps en vacances ?', ['Fermer les fenêtres', 'Vider le réfrigérateur', 'Sortir les poubelles', 'Arroser les plantes', 'Couper certains appareils', 'Vérifier les portes', 'Confier les clés', 'Ranger la maison']),
  themedQuestion('ete-08', 'Famille', 'Difficile', 'Famille', 'Été', 'Quel souvenir d’été aime-t-on revoir en hiver ?', ['Les photos de plage', 'Un coucher de soleil', 'Une vidéo familiale', 'Une carte postale', 'Un coquillage', 'Les photos d’un repas', 'Un billet de visite', 'Un dessin des enfants']),

  themedQuestion('grands-parents-01', 'Famille', 'Facile', 'Famille', 'Grands-parents', 'Qu’aime-t-on le plus faire chez ses grands-parents ?', ['Manger un bon repas', 'Écouter des histoires', 'Regarder les vieilles photos', 'Jouer à des jeux', 'Aller se promener', 'Cuisiner ensemble', 'Jardiner', 'Se faire gâter']),
  themedQuestion('grands-parents-02', 'Repas', 'Intermédiaire', 'Famille', 'Grands-parents', 'Quel plat rappelle souvent la cuisine des grands-parents ?', ['Un gâteau maison', 'Un plat mijoté', 'Une soupe', 'Un rôti', 'Une tarte', 'Des crêpes', 'Un gratin', 'De la confiture']),
  themedQuestion('grands-parents-03', 'Loisirs', 'Facile', 'Enfants', 'Grands-parents', 'Quel jeu traditionnel un grand-parent peut-il facilement apprendre ?', ['Les petits chevaux', 'La bataille', 'Les dominos', 'Les dames', 'Le jeu de l’oie', 'Le Scrabble', 'La belote', 'Les cartes']),
  themedQuestion('grands-parents-04', 'Famille', 'Difficile', 'Adultes', 'Grands-parents', 'Quel savoir familial les grands-parents transmettent-ils le mieux ?', ['Les recettes', 'L’histoire de la famille', 'Le bricolage', 'Le jardinage', 'Les valeurs', 'La gestion de l’argent', 'Les traditions', 'La patience']),
  themedQuestion('grands-parents-05', 'Maison', 'Intermédiaire', 'Famille', 'Grands-parents', 'Quel objet ancien intrigue le plus les enfants ?', ['Un téléphone à cadran', 'Une vieille photo', 'Un tourne-disque', 'Une machine à écrire', 'Une horloge', 'Un appareil photo argentique', 'Une cassette vidéo', 'Un vieux jouet']),
  themedQuestion('grands-parents-06', 'Quotidien', 'Intermédiaire', 'Adolescents', 'Grands-parents', 'Pour quoi appelle-t-on volontiers un grand-parent ?', ['Demander une recette', 'Prendre des nouvelles', 'Demander un conseil', 'Raconter une bonne nouvelle', 'Organiser une visite', 'Demander une histoire familiale', 'Souhaiter un anniversaire', 'Demander de l’aide']),
  themedQuestion('grands-parents-07', 'Famille', 'Facile', 'Famille', 'Grands-parents', 'Quel cadeau fait particulièrement plaisir à un grand-parent ?', ['Une photo de famille', 'Un dessin', 'Une visite', 'Un album photo', 'Un objet fait maison', 'Des fleurs', 'Une lettre', 'Un repas partagé']),
  themedQuestion('grands-parents-08', 'Fêtes', 'Difficile', 'Famille', 'Grands-parents', 'Quel moment de fête les grands-parents apprécient-ils le plus ?', ['Voir toute la famille', 'Le repas', 'Les photos', 'Les enfants qui jouent', 'Les discussions', 'Les cadeaux faits maison', 'Raconter des souvenirs', 'La musique']),

  themedQuestion('regions-01', 'Repas', 'Facile', 'Famille', 'France & régions', 'Quelle spécialité française partage-t-on facilement en famille ?', ['Les crêpes', 'La raclette', 'Le couscous', 'La quiche', 'Le gratin dauphinois', 'La bouillabaisse', 'La choucroute', 'Le cassoulet']),
  themedQuestion('regions-02', 'Vacances', 'Intermédiaire', 'Famille', 'France & régions', 'Quel paysage français attire le plus pour les vacances ?', ['La mer', 'La montagne', 'La campagne', 'Les villages', 'Les grandes villes', 'Les lacs', 'Les forêts', 'Les vignobles']),
  themedQuestion('regions-03', 'Loisirs', 'Facile', 'Enfants', 'France & régions', 'Quelle activité fait-on volontiers pendant une fête de village ?', ['Danser', 'Manger une spécialité', 'Écouter de la musique', 'Jouer à des stands', 'Regarder un défilé', 'Voir un feu d’artifice', 'Acheter au marché', 'Participer à une course']),
  themedQuestion('regions-04', 'Famille', 'Difficile', 'Adultes', 'France & régions', 'Qu’est-ce qui donne le plus son identité à une région ?', ['La cuisine', 'L’accent', 'Les paysages', 'Les traditions', 'L’architecture', 'Les fêtes locales', 'La musique', 'Les produits locaux']),
  themedQuestion('regions-05', 'Vacances', 'Intermédiaire', 'Famille', 'France & régions', 'Quel souvenir rapporte-t-on le plus volontiers d’une région française ?', ['Un produit alimentaire', 'Une carte postale', 'Un magnet', 'Une photo', 'Un objet artisanal', 'Une bouteille', 'Un vêtement', 'Un livre']),
  themedQuestion('regions-06', 'Repas', 'Difficile', 'Adultes', 'France & régions', 'Quel produit trouve-t-on souvent sur un marché régional ?', ['Le fromage', 'La charcuterie', 'Les fruits', 'Le pain', 'Le miel', 'Les olives', 'Le vin', 'Les pâtisseries']),
  themedQuestion('regions-07', 'Quotidien', 'Intermédiaire', 'Famille', 'France & régions', 'Quel détail remarque-t-on rapidement en changeant de région ?', ['L’accent', 'La météo', 'Les paysages', 'Les spécialités', 'Les noms de lieux', 'L’architecture', 'Le rythme de vie', 'Les expressions']),
  themedQuestion('regions-08', 'Fêtes', 'Facile', 'Famille', 'France & régions', 'Quel événement local rassemble facilement les familles ?', ['Un marché de Noël', 'Une fête de village', 'Un carnaval', 'Une brocante', 'Un festival', 'Une foire', 'Un feu d’artifice', 'Une fête gastronomique']),

  themedQuestion('monde-01', 'Repas', 'Facile', 'Famille', 'Monde & cultures', 'Quel plat étranger est largement connu des familles ?', ['La pizza', 'Le couscous', 'Les sushis', 'Le tajine', 'Les tacos', 'Le curry', 'Le kebab', 'Les nouilles']),
  themedQuestion('monde-02', 'Vacances', 'Intermédiaire', 'Famille', 'Monde & cultures', 'Que veut-on découvrir en premier dans un nouveau pays ?', ['La cuisine', 'Les monuments', 'La langue', 'Les paysages', 'Les habitants', 'Les marchés', 'Les traditions', 'La musique']),
  themedQuestion('monde-03', 'École', 'Facile', 'Enfants', 'Monde & cultures', 'Quel mot apprend-on souvent en premier dans une langue étrangère ?', ['Bonjour', 'Merci', 'Au revoir', 'Oui', 'Non', 'S’il vous plaît', 'Je m’appelle', 'Combien']),
  themedQuestion('monde-04', 'Famille', 'Difficile', 'Adultes', 'Monde & cultures', 'Quelle habitude familiale varie beaucoup selon les cultures ?', ['Les repas', 'Les salutations', 'Les fêtes', 'L’éducation', 'Les horaires', 'Les vêtements', 'Les mariages', 'La place des grands-parents']),
  themedQuestion('monde-05', 'Loisirs', 'Intermédiaire', 'Adolescents', 'Monde & cultures', 'Quel contenu donne envie de découvrir un autre pays ?', ['Un film', 'Une chanson', 'Une vidéo de voyage', 'Un livre', 'Une recette', 'Une série', 'Une photo', 'Un jeu vidéo']),
  themedQuestion('monde-06', 'Fêtes', 'Facile', 'Famille', 'Monde & cultures', 'Quel élément retrouve-t-on dans de nombreuses fêtes du monde ?', ['La musique', 'Un repas', 'La danse', 'Des vêtements spéciaux', 'Des cadeaux', 'Des lumières', 'Une cérémonie', 'Des décorations']),
  themedQuestion('monde-07', 'Vacances', 'Difficile', 'Adultes', 'Monde & cultures', 'Quelle difficulté rencontre-t-on le plus souvent lors d’un voyage à l’étranger ?', ['La langue', 'Les transports', 'La monnaie', 'Les horaires', 'La nourriture', 'L’orientation', 'Les formalités', 'La connexion internet']),
  themedQuestion('monde-08', 'Famille', 'Intermédiaire', 'Famille', 'Monde & cultures', 'Quelle découverte culturelle plaît facilement aux enfants ?', ['Un plat nouveau', 'Une danse', 'Une légende', 'Un vêtement traditionnel', 'Un instrument', 'Un jeu', 'Un animal local', 'Une fête'])
];

// 48 questions essentielles, 152 sondages généraux et 40 questions thématiques.
// Chaque tableau contient huit réponses et des alias contrôlés.
export const FAMILY_CHALLENGE_QUESTIONS: FamilyChallengeQuestion[] = [
  ...CORE_FAMILY_CHALLENGE_QUESTIONS,
  ...EXPANDED_FAMILY_CHALLENGE_QUESTIONS,
  ...THEMED_FAMILY_CHALLENGE_QUESTIONS
];

export type ChallengeQuestionFilters = {
  pack?: FamilyChallengeQuestion['pack'];
  category?: FamilyChallengeQuestion['category'];
  difficulty?: FamilyChallengeQuestion['difficulty'];
  ageGroup?: FamilyChallengeQuestion['ageGroup'];
};

export const getChallengeQuestion = (
  round: number,
  seed = 'family',
  limit = FAMILY_CHALLENGE_QUESTIONS.length,
  excludedIds: string[] = [],
  filters: ChallengeQuestionFilters = {}
): FamilyChallengeQuestion => {
  const filteredPool = FAMILY_CHALLENGE_QUESTIONS.filter(item => (
    (!filters.pack || item.pack === filters.pack)
    && (!filters.category || item.category === filters.category)
    && (!filters.difficulty || item.difficulty === filters.difficulty)
    && (!filters.ageGroup || item.ageGroup === filters.ageGroup)
  ));
  const basePool = filteredPool.length > 0 ? filteredPool : FAMILY_CHALLENGE_QUESTIONS;
  const allowed = basePool.slice(0, Math.max(1, Math.min(limit, basePool.length)));
  const excluded = new Set(excludedIds);
  const available = allowed.filter(item => !excluded.has(item.id));
  const pool = available.length > 0 ? available : allowed;
  const hash = [...seed].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 11), 0);
  const start = hash % pool.length;
  const step = 17;
  return pool[(start + round * step) % pool.length];
};
