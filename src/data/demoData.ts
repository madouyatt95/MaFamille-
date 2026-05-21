import type { 
  Member, 
  FamilyEvent, 
  Transaction, 
  DocumentFile, 
  GroceryItem, 
  Dish, 
  ChoreTask, 
  Vehicle, 
  HomeMaintenance, 
  Trip, 
  PetRecord, 
  SavingGoal, 
  NotificationAlert,
  MemoryLog,
  FamilyVote,
  SchoolTask,
  ChatGroup,
  ChatMessage,
  DemarcheTemplate,
  Demarche,
  JustificatifPack,
  Artisan
} from '../types';


export const demoMembers: Member[] = [
  {
    id: '1',
    name: 'Papa',
    role: 'Chef de famille',
    age: '42 ans',
    birthDate: '12/04/1984',
    bloodGroup: 'A+',
    allergies: ['Aucune'],
    treatments: ['Aucun'],
    emergencyContact: {
      name: 'Maman',
      phone: '+33 6 12 34 56 78',
      relation: 'Épouse'
    },
    schoolOrEmployer: 'Directeur Technique, TechCorp',
    photoUrl: '/avatars/papa.png',
    medicalHistory: [
      { id: 'm1', date: '10/01/2026', title: 'Bilan de santé annuel', doctor: 'Dr. Martin', notes: 'Excellente santé générale, tension normale.' }
    ],
    latitude: 48.8566,
    longitude: 2.3522,
    locationStatus: 'Au bureau 💼',
    lastLocatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Maman',
    role: 'Gestionnaire',
    age: '39 ans',
    birthDate: '28/08/1986',
    bloodGroup: 'O+',
    allergies: ['Pénicilline'],
    treatments: ['Aucun'],
    emergencyContact: {
      name: 'Papa',
      phone: '+33 6 87 65 43 21',
      relation: 'Époux'
    },
    schoolOrEmployer: 'Architecte d\'intérieur, Studio A&D',
    photoUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80',
    medicalHistory: [
      { id: 'm2', date: '22/03/2026', title: 'Consultation dentaire', doctor: 'Dr. Duval', notes: 'Détartrage effectué, aucune carie.' }
    ],
    latitude: 48.8584,
    longitude: 2.2945,
    locationStatus: 'Visite de chantier 🏗️',
    lastLocatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Amadou',
    role: '12 ans - Collège',
    age: '12 ans',
    birthDate: '15/09/2013',
    bloodGroup: 'B+',
    allergies: ['Arachides'],
    treatments: ['Ventoline (en cas de crise d\'asthme)'],
    emergencyContact: {
      name: 'Maman',
      phone: '+33 6 12 34 56 78',
      relation: 'Mère'
    },
    schoolOrEmployer: 'Collège Jean Jaurès (Classe de 5ème)',
    photoUrl: '/avatars/amadou.png',
    medicalHistory: [
      { id: 'm3', date: '05/02/2026', title: 'Rappel vaccin DTC', doctor: 'Dr. Clinique de la Paix', notes: 'Vaccin à jour, prochaine injection dans 5 ans.' }
    ],
    latitude: 48.8606,
    longitude: 2.3376,
    locationStatus: 'Au collège 🏫',
    lastLocatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Awa',
    role: '8 ans - Primaire',
    age: '8 ans',
    birthDate: '02/11/2017',
    bloodGroup: 'O+',
    allergies: ['Pollen'],
    treatments: ['Antihistaminique au printemps'],
    emergencyContact: {
      name: 'Papa',
      phone: '+33 6 87 65 43 21',
      relation: 'Père'
    },
    schoolOrEmployer: 'École élémentaire publique (Classe de CE2)',
    photoUrl: '/avatars/awa.png',
    medicalHistory: [
      { id: 'm4', date: '18/05/2026', title: 'Rendez-vous pédiatre', doctor: 'Dr. Clinique de la Paix', notes: 'Suivi de croissance parfait. Courbe de poids dans les normes.' }
    ],
    latitude: 48.8534,
    longitude: 2.3488,
    locationStatus: 'À la maison 🏠',
    lastLocatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Ibrahima',
    role: '2 ans',
    age: '2 ans',
    birthDate: '14/01/2024',
    bloodGroup: 'A+',
    allergies: ['Aucune'],
    treatments: ['Vitamine D'],
    emergencyContact: {
      name: 'Maman',
      phone: '+33 6 12 34 56 78',
      relation: 'Mère'
    },
    schoolOrEmployer: 'Crèche Les Petits Papillons',
    photoUrl: '/avatars/ibrahima.png',
    medicalHistory: [
      { id: 'm5', date: '12/04/2026', title: 'Vaccin ROR 2ème dose', doctor: 'Dr. Clinique de la Paix', notes: 'Bien supporté, aucun effet secondaire.' }
    ]
  }
];

export const demoEvents: FamilyEvent[] = [
  {
    id: 'e1',
    title: 'Rendez-vous médecin',
    type: 'medical',
    dateTime: '2026-05-18T10:30:00',
    time: '10:30',
    memberId: '4',
    memberName: 'Awa',
    location: 'Clinique de la Paix',
    description: 'Consultation pédiatrique de routine pour Awa.',
    done: false
  },
  {
    id: 'e2',
    title: 'Paiement Internet',
    type: 'bill',
    dateTime: '2026-05-19T23:59:00',
    time: 'Avant 23h59',
    memberId: '2',
    memberName: 'Maman',
    description: 'Facture mensuelle d\'accès Internet Fibre Orange.',
    done: false,
    amount: 250 // Soit 25 000 FCFA dans les montants
  },
  {
    id: 'e3',
    title: 'Devoir de Maths',
    type: 'school',
    dateTime: '2026-05-18T16:00:00',
    time: '16:00',
    memberId: '3',
    memberName: 'Amadou',
    description: 'Exercices d\'algèbre à terminer pour demain.',
    done: false
  },
  {
    id: 'e4',
    title: 'Achat de médicaments',
    type: 'medical',
    dateTime: '2026-05-20T17:30:00',
    time: '17:30',
    memberId: '2',
    memberName: 'Maman',
    location: 'Pharmacie Principale',
    description: 'Prendre l\'antihistaminique pour Awa.',
    done: false
  },
  {
    id: 'e5',
    title: 'Match de football d\'Amadou',
    type: 'social',
    dateTime: '2026-05-23T14:00:00',
    time: '14:00',
    memberId: '3',
    memberName: 'Amadou',
    location: 'Stade Municipal',
    description: 'Championnat inter-collèges, venir encourager !',
    done: false
  },
  {
    id: 'e6',
    title: 'Dîner d\'anniversaire Maman',
    type: 'social',
    dateTime: '2026-05-28T20:00:00',
    time: '20:00',
    description: 'Réservation au restaurant pour l\'anniversaire de Maman.',
    done: false
  }
];

export const demoTransactions: Transaction[] = [
  // Revenus
  { id: 't1', amount: 2500, type: 'income', category: 'Salaire Papa', date: '2026-05-01', title: 'Virement TechCorp' },
  { id: 't2', amount: 450, type: 'income', category: 'Freelance Maman', date: '2026-05-05', title: 'Facture Studio A&D' },
  
  // Dépenses
  { id: 't3', amount: 650, type: 'expense', category: 'Alimentation', date: '2026-05-10', title: 'Courses Supermarché' },
  { id: 't4', amount: 450, type: 'expense', category: 'Logement', date: '2026-05-03', title: 'Loyer mensuel' },
  { id: 't5', amount: 250, type: 'expense', category: 'Transport', date: '2026-05-05', title: 'Carburant et Abonnement Train' },
  { id: 't6', amount: 150, type: 'expense', category: 'Santé', date: '2026-05-18', title: 'Consultation Clinique' },
  { id: 't7', amount: 100, type: 'expense', category: 'Éducation', date: '2026-05-08', title: 'Fournitures scolaires' },
  { id: 't8', amount: 100, type: 'expense', category: 'Autres', date: '2026-05-12', title: 'Facture Téléphone & Internet' },
  
  // Épargne
  { id: 't9', amount: 1250, type: 'savings', category: 'Épargne Projet', date: '2026-05-01', title: 'Versement Livret A' }
];

export const demoDocuments: DocumentFile[] = [
  { id: 'd1', name: 'Passeport_Papa.pdf', category: 'identity', tags: ['Passeport', 'Voyage'], uploadDate: '12/03/2023', expiryDate: '11/03/2033', fileSize: '2.4 Mo', isExpired: false, memberId: '1', memberName: 'Papa' },
  { id: 'd2', name: 'CNI_Maman.pdf', category: 'identity', tags: ['Carte Nationale d\'Identité'], uploadDate: '05/06/2021', expiryDate: '04/06/2031', fileSize: '1.8 Mo', isExpired: false, memberId: '2', memberName: 'Maman' },
  { id: 'd3', name: 'Livret_De_Famille.pdf', category: 'identity', tags: ['Livret de famille', 'Officiel'], uploadDate: '14/01/2024', fileSize: '4.2 Mo', isExpired: false },
  { id: 'd4', name: 'Assurance_Habitation_2026.pdf', category: 'home', tags: ['Assurance', 'Maison'], uploadDate: '01/01/2026', expiryDate: '31/12/2026', fileSize: '1.1 Mo', isExpired: false, description: 'Contrat d\'assurance résidence principale.' },
  { id: 'd5', name: 'Contrat_TechCorp_Papa.pdf', category: 'contract', tags: ['Travail', 'CDI'], uploadDate: '15/10/2020', fileSize: '3.5 Mo', isExpired: false, memberId: '1', memberName: 'Papa' },
  { id: 'd6', name: 'Bulletin_Q1_Amadou.pdf', category: 'school', tags: ['Scolarité', 'Bulletin'], uploadDate: '18/12/2025', fileSize: '1.2 Mo', isExpired: false, memberId: '3', memberName: 'Amadou' },
  { id: 'd7', name: 'Passeport_Ibrahima_Expirant.pdf', category: 'identity', tags: ['Passeport', 'Urgent'], uploadDate: '14/02/2021', expiryDate: '13/06/2026', fileSize: '2.1 Mo', isExpired: false, description: 'Attention, renouvellement à prévoir sous peu.', memberId: '5', memberName: 'Ibrahima' }
];

export const demoGroceries: GroceryItem[] = [
  { id: 'g1', name: 'Filets de poulet x4', category: 'Boucherie', quantity: '1 pack', checked: false, inStock: false },
  { id: 'g2', name: 'Riz Basmati 5kg', category: 'Épicerie', quantity: '1 sac', checked: true, inStock: true },
  { id: 'g3', name: 'Lait demi-écrémé', category: 'Produits Frais', quantity: '6 briques', checked: false, inStock: true },
  { id: 'g4', name: 'Bananes Bio', category: 'Fruits & Légumes', quantity: '1 régime', checked: false, inStock: false },
  { id: 'g5', name: 'Pâtes Penne Rigate', category: 'Épicerie', quantity: '2 paquets', checked: true, inStock: true },
  { id: 'g6', name: 'Lessive liquide', category: 'Hygiène', quantity: '1 bouteille', checked: false, inStock: false },
  { id: 'g7', name: 'Yaourts nature x12', category: 'Produits Frais', quantity: '1 pack', checked: false, inStock: false },
  { id: 'g8', name: 'Huile d\'olive Vierge', category: 'Épicerie', quantity: '1 bouteille', checked: false, inStock: true }
];

export const demoDishes: Dish[] = [
  { id: 'di1', day: 'Lun', mealType: 'lunch', name: 'Poulet rôti et pommes de terre', image: '/menus/default.png', ingredients: ['Poulet', 'Pommes de terre', 'Ail', 'Herbes de Provence'] },
  { id: 'di2', day: 'Lun', mealType: 'dinner', name: 'Soupe de légumes et croûtons', image: '/menus/default.png', ingredients: ['Poireaux', 'Carottes', 'Pommes de terre', 'Pain'] },
  { id: 'di3', day: 'Mar', mealType: 'lunch', name: 'Salade de quinoa et avocat', image: '/menus/default.png', ingredients: ['Quinoa', 'Avocat', 'Tomates', 'Feta'] },
  { id: 'di4', day: 'Mar', mealType: 'dinner', name: 'Pâtes à la bolognaise maison', image: '/menus/default.png', ingredients: ['Pâtes', 'Bœuf haché', 'Sauce tomate', 'Oignons'] },
  { id: 'di5', day: 'Mer', mealType: 'lunch', name: 'Pavé de saumon et riz blanc', image: '/menus/default.png', ingredients: ['Saumon', 'Riz', 'Citron', 'Aneth'] },
  { id: 'di6', day: 'Mer', mealType: 'dinner', name: 'Quiche aux épinards et chèvre', image: '/menus/default.png', ingredients: ['Pâte brisée', 'Épinards', 'Fromage de chèvre', 'Œufs'] },
  { id: 'di7', day: 'Jeu', mealType: 'lunch', name: 'Wrap au thon et crudités', image: '/menus/default.png', ingredients: ['Galettes wrap', 'Thon', 'Mayonnaise', 'Salade'] },
  { id: 'di8', day: 'Jeu', mealType: 'dinner', name: 'Gratin de chou-fleur béchamel', image: '/menus/default.png', ingredients: ['Chou-fleur', 'Béchamel', 'Fromage râpé'] },
  { id: 'di9', day: 'Ven', mealType: 'lunch', name: 'Steak haché et haricots verts', image: '/menus/default.png', ingredients: ['Bœuf', 'Haricots verts', 'Beurre'] },
  { id: 'di10', day: 'Ven', mealType: 'dinner', name: 'Pizzas maison en famille', image: '/menus/default.png', ingredients: ['Pâte à pizza', 'Sauce tomate', 'Mozzarella', 'Jambon'] },
  { id: 'di11', day: 'Sam', mealType: 'lunch', name: 'Brochettes de bœuf au barbecue', image: '/menus/default.png', ingredients: ['Bœuf', 'Poivrons', 'Oignons'] },
  { id: 'di12', day: 'Sam', mealType: 'dinner', name: 'Tacos express croustillants', image: '/menus/default.png', ingredients: ['Coquilles tacos', 'Viande hachée', 'Épices', 'Salsa'] },
  { id: 'di13', day: 'Dim', mealType: 'lunch', name: 'Gigot d\'agneau dominical', image: '/menus/default.png', ingredients: ['Agneau', 'Ail', 'Romarin', 'Flageolets'] },
  { id: 'di14', day: 'Dim', mealType: 'dinner', name: 'Crêpes salées et sucrées', image: '/menus/default.png', ingredients: ['Farine', 'Lait', 'Œufs', 'Fromage', 'Nutella'] }
];

export const demoTasks: ChoreTask[] = [
  { id: 'ch1', title: 'Sortir les poubelles', rewardPoints: 10, assignedMemberId: '3', assignedMemberName: 'Amadou', done: false, rotation: 'daily', validatedByParent: false, dueDate: 'Ce soir' },
  { id: 'ch2', title: 'Vider le lave-vaisselle', rewardPoints: 15, assignedMemberId: '4', assignedMemberName: 'Awa', done: true, rotation: 'daily', validatedByParent: true, dueDate: 'Ce matin' },
  { id: 'ch3', title: 'Ranger la chambre', rewardPoints: 20, assignedMemberId: '3', assignedMemberName: 'Amadou', done: false, rotation: 'weekly', validatedByParent: false, dueDate: 'Mercredi' },
  { id: 'ch4', title: 'Donner à manger au chat', rewardPoints: 5, assignedMemberId: '4', assignedMemberName: 'Awa', done: true, rotation: 'daily', validatedByParent: true, dueDate: 'Chaque matin' },
  { id: 'ch5', title: 'Mettre la table pour le dîner', rewardPoints: 10, assignedMemberId: '3', assignedMemberName: 'Amadou', done: false, rotation: 'daily', validatedByParent: false, dueDate: '19:30' },
  { id: 'ch6', title: 'Nettoyer le tableau d\'école', rewardPoints: 10, assignedMemberId: '4', assignedMemberName: 'Awa', done: false, rotation: 'weekly', validatedByParent: false, dueDate: 'Vendredi' }
];

export const demoVehicles: Vehicle[] = [
  { id: 'v1', name: 'Peugeot 3008', plate: 'AB-123-CD', insuranceExpiry: '15/10/2026', technicalControl: '12/04/2027', lastService: '05/01/2026', nextService: '05/01/2027', mileage: 72400 },
  { id: 'v2', name: 'Renault Zoe (Électrique)', plate: 'EF-456-GH', insuranceExpiry: '22/11/2026', technicalControl: '14/09/2028', lastService: '10/03/2026', nextService: '10/03/2027', mileage: 18200 }
];

export const demoMaintenance: HomeMaintenance[] = [
  { id: 'hm1', title: 'Entretien annuel chaudière gaz', date: '28/05/2026', cost: 130, status: 'scheduled', provider: 'ChauffAgile' },
  { id: 'hm2', title: 'Réparation fuite évier cuisine', date: '12/04/2026', cost: 85, status: 'completed', provider: 'Plombier Pro' }
];

export const demoTrips: Trip[] = [
  { 
    id: 'tr1', 
    destination: 'Espagne (Barcelone)', 
    startDate: '12/07/2026', 
    endDate: '26/07/2026', 
    budget: 2500, 
    bookingRefs: ['Vol VY-1234', 'Hôtel Catalonia Ref: 987654'],
    checklist: [
      { id: 'tc1', text: 'Renouveler passeport Ibrahima', done: false },
      { id: 'tc2', text: 'Acheter crème solaire et maillots', done: true },
      { id: 'tc3', text: 'Imprimer les billets de vol', done: false },
      { id: 'tc4', text: 'Préparer la valise de voyage', done: false }
    ]
  }
];

export const demoPets: PetRecord[] = [
  { 
    id: 'p1', 
    name: 'Simba', 
    species: 'Chat (Siamois)', 
    lastVaccine: '12/10/2025', 
    nextVaccine: '12/10/2026', 
    vetAppointment: '12/10/2026', 
    notes: 'Prendre carnet de santé.',
    weightHistory: [
      { date: '12/10/2025', weight: 4.2 },
      { date: '15/01/2026', weight: 4.4 },
      { date: '12/04/2026', weight: 4.5 }
    ],
    documentIds: []
  }
];

export const demoSavingGoals: SavingGoal[] = [
  { id: 'sg1', title: 'Vacances été 2026', targetAmount: 2500, currentAmount: 1100, targetDate: '01/07/2026', category: 'Voyages' },
  { id: 'sg2', title: 'Rénovation Cuisine', targetAmount: 8500, currentAmount: 4200, targetDate: '15/12/2026', category: 'Logement' },
  { id: 'sg3', title: 'Achat Vélo Amadou', targetAmount: 450, currentAmount: 450, targetDate: '05/05/2026', category: 'Loisirs' }
];

export const demoAlerts: NotificationAlert[] = [
  { id: 'a0', title: 'Nouveau message 💬', description: 'Maman a envoyé un message vocal dans le Chat Familial.', time: 'À l\'instant', type: 'info', read: false, module: 'messagerie' },
  { id: 'a1', title: 'Passeport expirant bientôt', description: 'Le passeport d\'Ibrahima expire le 13/06/2026. Pensez à planifier son renouvellement.', time: 'Il y a 2h', type: 'warning', read: false, module: 'documents' },
  { id: 'a2', title: 'Rappel de vaccin', description: 'Le pédiatre attend Awa aujourd\'hui à 10:30 pour sa visite médicale.', time: 'Il y a 3h', type: 'info', read: false, module: 'sante' },
  { id: 'a3', title: 'Internet payé', description: 'Le prélèvement automatique de la facture Internet aura lieu demain.', time: 'Hier', type: 'info', read: true, module: 'finances_hub' },
  { id: 'a4', title: 'Tâche validée', description: 'Maman a validé la tâche d\'Awa : vider le lave-vaisselle (+15 points d\'argent de poche).', time: 'Hier', type: 'success', read: true, module: 'taches' }
];

export const demoMemories: MemoryLog[] = [
  {
    id: 'mem-1',
    date: '10/05/2026',
    title: 'Sortie vélo en forêt de Chevreuse 🌲',
    description: 'Une superbe après-midi en famille ! Amadou a battu son record de vitesse en montée et Awa a cueilli un magnifique bouquet de fleurs pour Maman.',
    authorName: 'Papa',
    authorPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&auto=format&fit=crop&q=80',
    likesCount: 4
  },
  {
    id: 'mem-2',
    date: '02/05/2026',
    title: 'Les 8 ans d\'Awa ! 🎂🎉',
    description: 'Awa a soufflé ses bougies et a adoré son nouveau kit de dessin. Son gâteau au chocolat géant a été dévoré en moins de 10 minutes !',
    authorName: 'Maman',
    authorPhoto: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
    likesCount: 3
  }
];

export const demoFamilyVotes: FamilyVote[] = [
  {
    id: 'vote-1',
    question: 'Quelle activité ce week-end ? 🎡🌲',
    authorName: 'Papa',
    active: true,
    dueDate: '22/05/2026',
    options: [
      { text: 'Parc d\'Attractions 🎢', votes: ['Amadou', 'Awa'] },
      { text: 'Pique-nique & Vélo en forêt 🌲', votes: ['Papa'] },
      { text: 'Cinéma & Popcorn 🎬', votes: ['Maman'] }
    ]
  },
  {
    id: 'vote-2',
    question: 'Menu du dimanche soir ? 🥞🍔',
    authorName: 'Maman',
    active: true,
    dueDate: '24/05/2026',
    options: [
      { text: 'Crêpes Party géante 🥞', votes: ['Awa', 'Maman'] },
      { text: 'Burgers maison & Frites 🍔', votes: ['Amadou', 'Papa'] }
    ]
  }
];

export const demoSchoolTasks: SchoolTask[] = [
  // Amadou (ID '3')
  {
    id: 'st-1',
    subject: 'Mathématiques',
    title: 'DM de géométrie : Théorème de Pythagore & calcul de volumes.',
    dueDate: 'Demain',
    done: false,
    assignedMemberId: '3',
    difficulty: 'hard'
  },
  {
    id: 'st-2',
    subject: 'Histoire',
    title: 'Réviser le chapitre sur Charlemagne et l\'Empire carolingien.',
    dueDate: 'Dans 3 jours',
    done: false,
    assignedMemberId: '3',
    difficulty: 'medium'
  },
  {
    id: 'st-3',
    subject: 'Anglais',
    title: 'Quiz de vocabulaire : les verbes irréguliers du groupe A.',
    dueDate: 'Terminé',
    done: true,
    assignedMemberId: '3',
    difficulty: 'easy',
    grade: '18/20'
  },
  // Awa (ID '4')
  {
    id: 'st-4',
    subject: 'Français',
    title: 'Dictée de mots de la semaine 24 et conjugaison des verbes du 1er groupe au présent.',
    dueDate: 'Ce soir',
    done: false,
    assignedMemberId: '4',
    difficulty: 'easy'
  },
  {
    id: 'st-5',
    subject: 'Sciences',
    title: 'Apprendre le cycle de l\'eau (évaporation, condensation, précipitation).',
    dueDate: 'Dans 2 jours',
    done: false,
    assignedMemberId: '4',
    difficulty: 'medium'
  }
];

export const demoChatGroups: ChatGroup[] = [
  { id: 'g_family', name: 'Famille ❤️', isPrivate: false, memberIds: ['1', '2', '3', '4', '5'], lastMessage: 'À table dans 10 min !', lastMessageTime: '19:45' },
  { id: 'g_parents', name: 'Parents (Secret)', isPrivate: true, memberIds: ['1', '2'], lastMessage: 'Tu as payé la facture ?', lastMessageTime: '14:20' },
  { id: 'g_ai_assistant', name: '🤖 Assistant Familial IA', isPrivate: false, memberIds: ['1', '2', '3', '4', '5'], lastMessage: 'Bonjour ! Comment puis-je aider votre famille aujourd\'hui ?', lastMessageTime: '08:00' }
];

export const demoChatMessages: ChatMessage[] = [
  { id: 'm1', groupId: 'g_family', senderId: '1', senderName: 'Papa', type: 'text', content: 'N\'oubliez pas vos affaires de sport demain !', timestamp: '18:30', readBy: ['1', '2', '3', '4', '5'] },
  { id: 'm2', groupId: 'g_family', senderId: '3', senderName: 'Amadou', type: 'text', content: 'Oui c\'est déjà dans le sac 🎒', timestamp: '18:35', readBy: ['1', '2', '3', '4', '5'] },
  { id: 'm3', groupId: 'g_family', senderId: '2', senderName: 'Maman', type: 'text', content: 'À table dans 10 min !', timestamp: '19:45', readBy: ['1', '2'] },
  { id: 'm_ai_init', groupId: 'g_ai_assistant', senderId: 'ai', senderName: 'Assistant IA', type: 'text', content: 'Bonjour ! Je suis l\'Assistant Familial IA. Posez-moi des questions sur les devoirs, des recettes de cuisine, ou demandez-moi des conseils d\'organisation familiale !', timestamp: '08:00', readBy: ['1', '2', '3', '4', '5'] }
];

// === DOCSBOX INTEGRATION ===

export const demarcheTemplates: DemarcheTemplate[] = [
  {
    id: 'tpl-carte-grise',
    name: 'Carte Grise',
    icon: '🚗',
    description: 'Immatriculation ou changement de titulaire',
    defaultSteps: [
      { title: 'Rassembler les pièces justificatives' },
      { title: 'Remplir le formulaire ANTS en ligne' },
      { title: 'Payer la taxe régionale' },
      { title: 'Attendre le courrier du certificat' }
    ],
    defaultPieces: [
      { name: 'Ancien certificat d\'immatriculation', autoAttachTags: ['carte grise', 'immatriculation', 'vehicule'] },
      { name: 'Pièce d\'identité', autoAttachTags: ['cni', 'passeport', 'identité', 'id'] },
      { name: 'Justificatif de domicile', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: 'Formulaire Cerfa 13750', autoAttachTags: ['cerfa', '13750'] }
    ]
  },
  {
    id: 'tpl-passeport',
    name: 'Passeport / CNI',
    icon: '🛂',
    description: 'Demande ou renouvellement de passeport ou carte d\'identité',
    defaultSteps: [
      { title: 'Prendre une photo d\'identité' },
      { title: 'Acheter le timbre fiscal en ligne' },
      { title: 'Prendre RDV en mairie' },
      { title: 'Déposer le dossier en mairie' },
      { title: 'Récupérer le document' }
    ],
    defaultPieces: [
      { name: 'Photo d\'identité', autoAttachTags: ['photo', 'portrait'] },
      { name: 'Timbre fiscal', autoAttachTags: ['timbre', 'fiscal'] },
      { name: 'Justificatif de domicile', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: 'Acte de naissance', autoAttachTags: ['acte', 'naissance'] },
      { name: 'Ancien passeport / CNI', autoAttachTags: ['cni', 'passeport', 'identité', 'id'] }
    ]
  },
  {
    id: 'tpl-caf',
    name: 'CAF / APL',
    icon: '🏠',
    description: 'Demande d\'aide au logement ou allocations familiales',
    defaultSteps: [
      { title: 'Créer un compte CAF (caf.fr)' },
      { title: 'Faire la simulation en ligne' },
      { title: 'Constituer le dossier complet' },
      { title: 'Suivre l\'avancement sur le portail' }
    ],
    defaultPieces: [
      { name: 'Pièce d\'identité', autoAttachTags: ['cni', 'passeport', 'identité', 'id'] },
      { name: 'RIB', autoAttachTags: ['rib', 'banque', 'iban', 'bic'] },
      { name: 'Bail de location', autoAttachTags: ['bail', 'location', 'contrat'] },
      { name: 'Avis d\'imposition', autoAttachTags: ['impots', 'imposition', 'avis'] },
      { name: 'Attestation de revenus', autoAttachTags: ['revenus', 'salaire', 'bulletin'] }
    ]
  },
  {
    id: 'tpl-demenagement',
    name: 'Déménagement',
    icon: '📦',
    description: 'Checklist complète pour un déménagement serein',
    defaultSteps: [
      { title: 'Envoyer le préavis au bailleur' },
      { title: 'Transférer EDF / Gaz' },
      { title: 'Transférer Internet / Téléphone' },
      { title: 'Prévenir les impôts' },
      { title: 'Mettre à jour la CAF' },
      { title: 'Prévenir la banque' },
      { title: 'Mettre à jour la carte grise' }
    ],
    defaultPieces: [
      { name: 'Nouveau bail' },
      { name: 'Justificatif ancienne adresse' },
      { name: 'Justificatif nouvelle adresse' },
      { name: 'État des lieux' }
    ]
  },
  {
    id: 'tpl-assurance',
    name: 'Assurance Habitation',
    icon: '🛡️',
    description: 'Souscription ou changement d\'assurance habitation',
    defaultSteps: [
      { title: 'Comparer les devis en ligne' },
      { title: 'Souscrire au contrat' },
      { title: 'Récupérer l\'attestation' }
    ],
    defaultPieces: [
      { name: 'Bail de location' },
      { name: 'Pièce d\'identité' },
      { name: 'RIB' }
    ]
  },
  {
    id: 'tpl-impots',
    name: 'Déclaration d\'Impôts',
    icon: '📊',
    description: 'Déclaration annuelle de revenus',
    defaultSteps: [
      { title: 'Préparer les pièces justificatives' },
      { title: 'Déclarer en ligne sur impots.gouv.fr' },
      { title: 'Vérifier et signer' },
      { title: 'Payer le solde éventuel' }
    ],
    defaultPieces: [
      { name: 'Bulletins de salaire' },
      { name: 'Relevés bancaires' },
      { name: 'Charges déductibles' },
      { name: 'Avis d\'imposition N-1' }
    ]
  },
  {
    id: 'tpl-inscription-ecole',
    name: 'Inscription École',
    icon: '🎓',
    description: 'Inscription ou réinscription scolaire',
    defaultSteps: [
      { title: 'Contacter la mairie pour la sectorisation' },
      { title: 'Constituer le dossier d\'inscription' },
      { title: 'Déposer le dossier à l\'école' },
      { title: 'Obtenir la confirmation d\'inscription' }
    ],
    defaultPieces: [
      { name: 'Livret de famille' },
      { name: 'Carnet de vaccination' },
      { name: 'Justificatif de domicile' },
      { name: 'Certificat de radiation (si changement)' },
      { name: 'Photo d\'identité enfant' }
    ]
  }
];

export const demoDemarches: Demarche[] = [
  {
    id: 'dem-1',
    templateId: 'tpl-passeport',
    title: 'Renouvellement Passeport Ibrahima',
    icon: '🛂',
    status: 'in_progress',
    assignedMemberId: '1',
    assignedMemberName: 'Papa',
    steps: [
      { id: 'ds-1', title: 'Prendre une photo d\'identité', done: true },
      { id: 'ds-2', title: 'Acheter le timbre fiscal en ligne', done: true },
      { id: 'ds-3', title: 'Prendre RDV en mairie', done: false, dueDate: '25/05/2026' },
      { id: 'ds-4', title: 'Déposer le dossier en mairie', done: false },
      { id: 'ds-5', title: 'Récupérer le document', done: false }
    ],
    pieces: [
      { id: 'dp-1', name: 'Photo d\'identité', status: 'attached', documentId: 'doc-3' },
      { id: 'dp-2', name: 'Timbre fiscal', status: 'attached' },
      { id: 'dp-3', name: 'Justificatif de domicile', status: 'attached', documentId: 'doc-8' },
      { id: 'dp-4', name: 'Acte de naissance', status: 'missing' },
      { id: 'dp-5', name: 'Ancien passeport', status: 'expired' }
    ],
    createdAt: '10/05/2026',
    notes: 'Passeport d\'Ibrahima expire le 13/06/2026'
  }
];

export const demoPacks: JustificatifPack[] = [
  {
    id: 'pack-1',
    name: 'Dossier Location Appartement',
    templateType: 'location',
    documentIds: ['doc-1', 'doc-4', 'doc-8'],
    createdAt: '01/05/2026'
  }
];

export const demoArtisans: Artisan[] = [
  { id: 'art-1', name: 'Jean Plombier 🪠', specialty: 'Plomberie & Chauffage', phone: '06 12 34 56 78', email: 'jean.plombier@example.com', rating: 5, notes: 'Très réactif. Est intervenu pour la fuite d\'évier.' },
  { id: 'art-2', name: 'ÉlecPro Paris ⚡️', specialty: 'Électricité générale', phone: '01 45 67 89 10', email: 'contact@elecpro.com', rating: 4, notes: 'Bon rapport qualité-prix.' },
  { id: 'art-3', name: 'Allo Chauffage 🔥', specialty: 'Entretien chaudière', phone: '06 98 76 54 32', email: 'contact@allochauffage.fr', rating: 5, notes: 'A effectué la révision de la chaudière annuelle.' }
];
