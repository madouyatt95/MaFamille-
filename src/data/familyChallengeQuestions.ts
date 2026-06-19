export type ChallengeAnswer = {
  label: string;
  aliases: string[];
  points: number;
};

export type FamilyChallengeQuestion = {
  id: string;
  category: 'Maison' | 'Quotidien' | 'Repas' | 'Vacances' | 'École' | 'Loisirs' | 'Famille' | 'Fêtes';
  difficulty: 'Facile' | 'Intermédiaire' | 'Difficile';
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
  prompt,
  answers: [...values, ...(EXTRA_ANSWERS[id] || [])].slice(0, 8).map(answer)
});

export const FAMILY_CHALLENGE_QUESTIONS: FamilyChallengeQuestion[] = [
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

export const getChallengeQuestion = (
  round: number,
  seed = 'family',
  limit = FAMILY_CHALLENGE_QUESTIONS.length
): FamilyChallengeQuestion => {
  const available = FAMILY_CHALLENGE_QUESTIONS.slice(0, Math.max(1, Math.min(limit, FAMILY_CHALLENGE_QUESTIONS.length)));
  const hash = [...seed].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 11), 0);
  const start = hash % available.length;
  const step = 17;
  return available[(start + round * step) % available.length];
};
