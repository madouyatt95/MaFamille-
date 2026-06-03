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

export const demoMembers: Member[] = [];
export const demoEvents: FamilyEvent[] = [];
export const demoTransactions: Transaction[] = [];
export const demoDishes: Dish[] = [];
export const demoDocuments: DocumentFile[] = [];
export const demoTasks: ChoreTask[] = [];
export const demoGroceries: GroceryItem[] = [];
export const demoVehicles: Vehicle[] = [];
export const demoMaintenance: HomeMaintenance[] = [];
export const demoTrips: Trip[] = [];
export const demoPets: PetRecord[] = [];
export const demoSavingGoals: SavingGoal[] = [];
export const demoAlerts: NotificationAlert[] = [];
export const demoMemories: MemoryLog[] = [];
export const demoFamilyVotes: FamilyVote[] = [];
export const demoSchoolTasks: SchoolTask[] = [];
export const demoChatGroups: ChatGroup[] = [];
export const demoChatMessages: ChatMessage[] = [];
export const demoDemarches: Demarche[] = [];
export const demoPacks: JustificatifPack[] = [];
export const demoArtisans: Artisan[] = [];

// === DOCSBOX INTEGRATION ===
export const demarcheTemplates: DemarcheTemplate[] = [
  // IDENTITÉ
  {
    id: 'tpl-cni',
    name: 'Carte Nationale d\'Identité (CNI)',
    icon: '🪪',
    category: 'Identité',
    description: 'Première demande ou renouvellement de carte d\'identité nationale.',
    defaultSteps: [
      { title: 'Effectuer la pré-demande en ligne sur le site ANTS' },
      { title: 'Prendre rendez-vous en mairie pour le dépôt des empreintes' },
      { title: 'Acheter un timbre fiscal (25€ uniquement en cas de perte/vol)' },
      { title: 'Se rendre au rendez-vous en mairie avec les pièces' },
      { title: 'Retirer la nouvelle CNI en mairie après réception du SMS' }
    ],
    defaultPieces: [
      { name: 'Photo d\'identité de moins de 6 mois aux normes', autoAttachTags: ['photo', 'portrait'] },
      { name: 'Justificatif de domicile récent', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: 'Ancienne CNI ou Déclaration de perte/vol', autoAttachTags: ['ancienne cni', 'perte', 'vol'] },
      { name: 'Numéro de pré-demande ANTS', autoAttachTags: ['ants', 'pre-demande'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-passeport',
    name: 'Passeport National',
    icon: '🛂',
    category: 'Identité',
    description: 'Demande de passeport biométrique pour majeur ou mineur.',
    defaultSteps: [
      { title: 'Effectuer la pré-demande en ligne sur le site ANTS' },
      { title: 'Acheter le timbre fiscal dématérialisé (86€ pour majeur)' },
      { title: 'Prendre rendez-vous en mairie pour le dépôt des empreintes' },
      { title: 'Déposer le dossier complet en mairie lors du RDV' },
      { title: 'Retirer le passeport en mairie après réception du SMS' }
    ],
    defaultPieces: [
      { name: 'Photo d\'identité de moins de 6 mois aux normes', autoAttachTags: ['photo', 'portrait'] },
      { name: 'Justificatif de domicile récent', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: 'Timbre fiscal (86€ majeur, 42€ mineur de 15 ans+, 17€ moins de 15 ans)', autoAttachTags: ['timbre', 'fiscal'] },
      { name: 'Ancien passeport ou Déclaration de perte/vol', autoAttachTags: ['ancien passeport', 'perte', 'vol'] }
    ],
    defaultCost: 86
  },
  {
    id: 'tpl-visa',
    name: 'Demande de Visa Consulaire',
    icon: '🗺️',
    category: 'Identité',
    description: 'Demande de visa d\'entrée pour un pays étranger.',
    defaultSteps: [
      { title: 'Remplir le formulaire officiel de demande de visa' },
      { title: 'Prendre rendez-vous auprès du centre consulaire ou de l\'ambassade' },
      { title: 'Payer les frais de dossier de visa' },
      { title: 'Déposer le passeport et les justificatifs lors du rendez-vous' },
      { title: 'Récupérer le passeport avec le visa apposé' }
    ],
    defaultPieces: [
      { name: 'Passeport valide au moins 6 mois après le séjour', autoAttachTags: ['passeport'] },
      { name: 'Photos d\'identité récentes aux normes consulaires', autoAttachTags: ['photo'] },
      { name: 'Justificatifs financiers (relevés de compte, bulletins de salaire)', autoAttachTags: ['salaire', 'banque'] },
      { name: 'Réservation de billet d\'avion et hébergement', autoAttachTags: ['voyage', 'hotel'] }
    ],
    defaultCost: 80
  },
  {
    id: 'tpl-titre-sejour',
    name: 'Titre de Séjour / Carte de résident',
    icon: '🛂',
    category: 'Identité',
    description: 'Demande ou renouvellement de titre de séjour en préfecture.',
    defaultSteps: [
      { title: 'Prendre rendez-vous en préfecture en ligne' },
      { title: 'Rassembler les pièces et photocopies demandées' },
      { title: 'Se rendre au rendez-vous pour dépôt du dossier et prise d\'empreintes' },
      { title: 'Réceptionner le récépissé de demande' },
      { title: 'Retirer la carte finale avec timbre fiscal (taxe de séjour)' }
    ],
    defaultPieces: [
      { name: 'Passeport en cours de validité (pages d\'identité et visa)', autoAttachTags: ['passeport'] },
      { name: 'Acte de naissance traduit en français', autoAttachTags: ['naissance', 'traduit'] },
      { name: 'Justificatif de domicile de moins de 3 mois', autoAttachTags: ['domicile', 'edf', 'facture'] },
      { name: 'Photos d\'identité récentes e-photo', autoAttachTags: ['photo', 'e-photo'] }
    ],
    defaultCost: 225
  },
  {
    id: 'tpl-permis',
    name: 'Permis de Conduire',
    icon: '🪪',
    category: 'Identité',
    description: 'Demande de fabrication du permis de conduire suite à obtention ou perte.',
    defaultSteps: [
      { title: 'Passer les examens de code et de conduite' },
      { title: 'Créer un compte sur ANTS pour la demande de permis' },
      { title: 'Remplir le formulaire en ligne de demande de fabrication' },
      { title: 'Payer la taxe régionale si requise' },
      { title: 'Recevoir le permis de conduire par courrier postal' }
    ],
    defaultPieces: [
      { name: 'Justificatif d\'identité (CNI ou passeport)', autoAttachTags: ['cni', 'passeport'] },
      { name: 'Justificatif de domicile récent', autoAttachTags: ['domicile', 'edf'] },
      { name: 'Code photo signature numérique (cabine agréée)', autoAttachTags: ['photo', 'signature'] },
      { name: 'Attestation de réussite aux examens (CEPC)', autoAttachTags: ['cepc', 'reussite'] }
    ],
    defaultCost: 0
  },

  // FAMILLE
  {
    id: 'tpl-livret',
    name: 'Livret de Famille',
    icon: '📕',
    category: 'Famille',
    description: 'Mise à jour ou demande de duplicata du livret de famille.',
    defaultSteps: [
      { title: 'Remplir le formulaire de demande de livret en mairie' },
      { title: 'Rassembler les actes de naissance et de mariage correspondants' },
      { title: 'Déposer la demande en mairie de son domicile' },
      { title: 'Retirer le livret complété en mairie' }
    ],
    defaultPieces: [
      { name: 'Pièce d\'identité du demandeur', autoAttachTags: ['cni', 'passeport'] },
      { name: 'Justificatif de domicile du demandeur', autoAttachTags: ['domicile'] },
      { name: 'Acte de naissance des membres ou copie de mariage', autoAttachTags: ['acte', 'naissance', 'mariage'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-acte-naissance',
    name: 'Acte de Naissance',
    icon: '👶',
    category: 'Famille',
    description: 'Demande d\'extrait ou de copie intégrale d\'acte de naissance.',
    defaultSteps: [
      { title: 'Faire la demande en ligne sur Service-Public.fr' },
      { title: 'Ou envoyer un courrier postal à la mairie de naissance' },
      { title: 'Attendre la réception gratuite par courrier postal' }
    ],
    defaultPieces: [
      { name: 'Pièce d\'identité du demandeur', autoAttachTags: ['cni', 'passeport'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-mariage',
    name: 'Dossier de Mariage',
    icon: '💍',
    category: 'Famille',
    description: 'Constitution du dossier administratif en vue d\'un mariage civil.',
    defaultSteps: [
      { title: 'Retirer le guide des époux en mairie' },
      { title: 'Choisir la date de la cérémonie et réserver le créneau' },
      { title: 'Réunir les pièces justificatives des époux et des témoins' },
      { title: 'Déposer le dossier complet en mairie (présence des deux requise)' },
      { title: 'Publication légale des bans pendant 10 jours' }
    ],
    defaultPieces: [
      { name: 'Actes de naissance des futurs époux (< 3 mois)', autoAttachTags: ['acte', 'naissance'] },
      { name: 'Pièces d\'identité originales des futurs époux', autoAttachTags: ['cni', 'passeport'] },
      { name: 'Justificatif de domicile récent des futurs époux', autoAttachTags: ['domicile'] },
      { name: 'Copies de pièces d\'identité des témoins et fiches de renseignements', autoAttachTags: ['temoins', 'cni'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-divorce',
    name: 'Procédure de Divorce',
    icon: '⚖️',
    category: 'Famille',
    description: 'Divorce par consentement mutuel ou procédure judiciaire.',
    defaultSteps: [
      { title: 'Choisir chacun un avocat indépendant' },
      { title: 'Négocier et rédiger la convention de divorce' },
      { title: 'Signer la convention après le délai de réflexion de 15 jours' },
      { title: 'Dépôt de la convention chez le notaire pour enregistrement' }
    ],
    defaultPieces: [
      { name: 'Copie intégrale de l\'acte de mariage (< 3 mois)', autoAttachTags: ['acte', 'mariage'] },
      { name: 'Actes de naissance des époux et des enfants (< 3 mois)', autoAttachTags: ['acte', 'naissance'] },
      { name: 'Copie du livret de famille complet', autoAttachTags: ['livret', 'famille'] },
      { name: 'Contrat de mariage éventuel et état liquidatif des biens', autoAttachTags: ['contrat', 'mariage', 'notaire'] }
    ],
    defaultCost: 500
  },
  {
    id: 'tpl-adoption',
    name: 'Agrément en vue d\'Adoption',
    icon: '👪',
    category: 'Famille',
    description: 'Demande d\'agrément auprès du Conseil Départemental.',
    defaultSteps: [
      { title: 'Envoyer une lettre d\'intention au Conseil Départemental' },
      { title: 'Participer aux réunions d\'information obligatoires' },
      { title: 'Déposer le dossier officiel de demande d\'agrément' },
      { title: 'Passer les entretiens psychologiques et sociaux' },
      { title: 'Attendre la décision de la commission d\'agrément' }
    ],
    defaultPieces: [
      { name: 'Copie intégrale de l\'acte de naissance du demandeur', autoAttachTags: ['acte', 'naissance'] },
      { name: 'Extrait de casier judiciaire (bulletin n°3)', autoAttachTags: ['casier', 'judiciaire'] },
      { name: 'Certificat médical d\'aptitude à l\'adoption', autoAttachTags: ['certificat', 'medical', 'sante'] },
      { name: 'Justificatifs de ressources (impôts, salaire)', autoAttachTags: ['impots', 'salaire'] }
    ],
    defaultCost: 0
  },

  // SANTÉ
  {
    id: 'tpl-carte-vitale',
    name: 'Renouvellement Carte Vitale',
    icon: '🏥',
    category: 'Santé',
    description: 'Commande de carte vitale suite à perte, vol ou dysfonctionnement.',
    defaultSteps: [
      { title: 'Déclarer la perte/vol/dysfonctionnement sur Ameli.fr' },
      { title: 'Accéder à la rubrique "Commander ma carte vitale"' },
      { title: 'Télécharger les justificatifs requis' },
      { title: 'Valider la commande en ligne' }
    ],
    defaultPieces: [
      { name: 'Photo d\'identité numérisée aux normes', autoAttachTags: ['photo', 'portrait'] },
      { name: 'Pièce d\'identité scannée', autoAttachTags: ['cni', 'passeport'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-mutuelle',
    name: 'Inscription Mutuelle Complémentaire',
    icon: '🩺',
    category: 'Santé',
    description: 'Affiliation à une mutuelle santé pour le foyer.',
    defaultSteps: [
      { title: 'Comparer les offres de complémentaires santé' },
      { title: 'Souscrire le contrat de mutuelle en ligne ou par conseiller' },
      { title: 'Demander la télétransmission automatique avec l\'Assurance Maladie' },
      { title: 'Télécharger la carte de tiers payant de la mutuelle' }
    ],
    defaultPieces: [
      { name: 'Attestation de droits Sécurité Sociale (CPAM)', autoAttachTags: ['ameli', 'secu', 'attestation'] },
      { name: 'Relevé d\'Identité Bancaire (RIB)', autoAttachTags: ['rib', 'banque'] },
      { name: 'Pièce d\'identité du souscripteur', autoAttachTags: ['cni', 'passeport'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-remboursement',
    name: 'Demande de remboursement exceptionnel',
    icon: '💶',
    category: 'Santé',
    description: 'Envoi d\'une feuille de soins ou facture pour remboursement hors carte vitale.',
    defaultSteps: [
      { title: 'Faire remplir la feuille de soins papier par le praticien' },
      { title: 'Remplir ses informations d\'assuré' },
      { title: 'Envoyer le document papier à sa caisse d\'Assurance Maladie par courrier' },
      { title: 'Suivre le remboursement sur Ameli' }
    ],
    defaultPieces: [
      { name: 'Feuille de soins papier originale signée', autoAttachTags: ['feuille', 'soins'] },
      { name: 'Facture acquittée détaillée du praticien', autoAttachTags: ['facture', 'sante'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-dossier-medical',
    name: 'Accès au Dossier Médical / Mon Espace Santé',
    icon: '📁',
    category: 'Santé',
    description: 'Ouverture et mise à jour du dossier médical partagé.',
    defaultSteps: [
      { title: 'Activer son profil Mon Espace Santé en ligne' },
      { title: 'Compléter l\'historique médical et allergies' },
      { title: 'Ajouter les ordonnances et comptes-rendus récents' },
      { title: 'Autoriser l\'accès à ses praticiens habituels' }
    ],
    defaultPieces: [
      { name: 'Pièce d\'identité du titulaire', autoAttachTags: ['cni', 'passeport'] },
      { name: 'Dernière ordonnance ou certificat médical', autoAttachTags: ['ordonnance', 'certificat'] }
    ],
    defaultCost: 0
  },

  // ÉCOLE
  {
    id: 'tpl-inscription-scolaire',
    name: 'Inscription Scolaire',
    icon: '🏫',
    category: 'École',
    description: 'Inscription en école maternelle ou élémentaire publique.',
    defaultSteps: [
      { title: 'Se rendre au service des affaires scolaires de la mairie' },
      { title: 'Présenter les justificatifs requis' },
      { title: 'Obtenir le certificat d\'inscription scolaire' },
      { title: 'Prendre rendez-vous avec le directeur d\'école pour finaliser' }
    ],
    defaultPieces: [
      { name: 'Livret de famille complet', autoAttachTags: ['livret', 'famille'] },
      { name: 'Justificatif de domicile de moins de 3 mois', autoAttachTags: ['domicile', 'edf'] },
      { name: 'Pages vaccins du carnet de santé de l\'enfant', autoAttachTags: ['carnet', 'sante', 'vaccins'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-cantine',
    name: 'Inscription Cantine / Périscolaire',
    icon: '🍽️',
    category: 'École',
    description: 'Dossier d\'inscription à la restauration scolaire et garderie.',
    defaultSteps: [
      { title: 'Accéder au portail famille de sa commune' },
      { title: 'Saisir les jours de présence souhaités' },
      { title: 'Télécharger son dernier avis d\'imposition pour calcul de tarif' },
      { title: 'Valider le mandat de prélèvement SEPA pour la facturation' }
    ],
    defaultPieces: [
      { name: 'Dernier avis d\'imposition (calcul quotient)', autoAttachTags: ['impots', 'imposition', 'avis'] },
      { name: 'Attestation de paiement de la CAF', autoAttachTags: ['caf', 'attestation'] },
      { name: 'Relevé d\'Identité Bancaire (RIB)', autoAttachTags: ['rib'] }
    ],
    defaultCost: 50
  },
  {
    id: 'tpl-bourse',
    name: 'Demande de Bourse Scolaire',
    icon: '🎓',
    category: 'École',
    description: 'Demande d\'aide financière pour le collège ou le lycée.',
    defaultSteps: [
      { title: 'Utiliser le simulateur de bourse de l\'Éducation Nationale' },
      { title: 'Accéder au portail Scolarité Services (Educonnect)' },
      { title: 'Remplir le formulaire en ligne de demande de bourse' },
      { title: 'Valider et transmettre le dossier au secrétariat de l\'établissement' }
    ],
    defaultPieces: [
      { name: 'Avis d\'imposition de l\'année précédente', autoAttachTags: ['impots', 'imposition'] },
      { name: 'Relevé d\'Identité Bancaire (RIB) pour versement', autoAttachTags: ['rib'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-transport-scolaire',
    name: 'Carte de Transport Scolaire',
    icon: '🚌',
    category: 'École',
    description: 'Inscription aux transports scolaires régionaux ou urbains.',
    defaultSteps: [
      { title: 'Se connecter sur le site régional de transport scolaire' },
      { title: 'Créer le profil de l\'élève et choisir les trajets' },
      { title: 'Payer les frais de dossier ou d\'abonnement annuel' },
      { title: 'Recevoir ou recharger la carte de transport de l\'élève' }
    ],
    defaultPieces: [
      { name: 'Photo d\'identité récente de l\'enfant', autoAttachTags: ['photo', 'portrait'] },
      { name: 'Justificatif de scolarité (certificat d\'inscription)', autoAttachTags: ['scolarite', 'certificat'] },
      { name: 'Justificatif de domicile récent des parents', autoAttachTags: ['domicile'] }
    ],
    defaultCost: 30
  },

  // LOGEMENT
  {
    id: 'tpl-caf-apl',
    name: 'Aide Personnalisée au Logement (APL)',
    icon: '🏠',
    category: 'Logement',
    description: 'Demande d\'aide au logement auprès de la CAF.',
    defaultSteps: [
      { title: 'Effectuer une simulation d\'aide au logement sur le site CAF' },
      { title: 'Accéder à son espace allocataire et initier la demande d\'APL' },
      { title: 'Faire remplir l\'attestation de loyer par le propriétaire' },
      { title: 'Valider la demande en ligne et suivre l\'instruction' }
    ],
    defaultPieces: [
      { name: 'Contrat de bail scanné', autoAttachTags: ['bail', 'contrat'] },
      { name: 'Attestation de loyer CAF complétée par propriétaire', autoAttachTags: ['attestation', 'loyer'] },
      { name: 'Relevé d\'Identité Bancaire (RIB)', autoAttachTags: ['rib'] },
      { name: 'Ressources des 12 derniers mois de tous les occupants', autoAttachTags: ['salaire', 'caf', 'revenus'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-assurance-habitation',
    name: 'Assurance Habitation',
    icon: '🛡️',
    category: 'Logement',
    description: 'Souscription d\'une assurance multirisque habitation.',
    defaultSteps: [
      { title: 'Estimer la valeur des biens mobiliers du logement' },
      { title: 'Comparer les offres multirisques habitation en ligne' },
      { title: 'Valider le devis et souscrire le contrat d\'assurance' },
      { title: 'Transmettre l\'attestation d\'assurance au propriétaire (location)' }
    ],
    defaultPieces: [
      { name: 'Pièce d\'identité du souscripteur', autoAttachTags: ['cni', 'passeport'] },
      { name: 'Contrat de bail ou acte de propriété', autoAttachTags: ['bail', 'contrat'] },
      { name: 'Relevé d\'Identité Bancaire (RIB)', autoAttachTags: ['rib'] }
    ],
    defaultCost: 150
  },
  {
    id: 'tpl-demenagement',
    name: 'Procédure de Déménagement',
    icon: '📦',
    category: 'Logement',
    description: 'Organisation et formalités administratives de déménagement.',
    defaultSteps: [
      { title: 'Donner congé au bailleur actuel (préavis légal)' },
      { title: 'Faire des devis de déménageurs ou louer un camion' },
      { title: 'Déclarer le changement d\'adresse sur le portail interministériel' },
      { title: 'Transférer ses contrats d\'énergie et d\'accès internet' }
    ],
    defaultPieces: [
      { name: 'Justificatif du nouveau domicile', autoAttachTags: ['domicile', 'nouveau'] },
      { name: 'Contrat de bail ou promesse de vente', autoAttachTags: ['bail', 'contrat'] }
    ],
    defaultCost: 300
  },
  {
    id: 'tpl-etat-des-lieux',
    name: 'État des Lieux (Entrée / Sortie)',
    icon: '📝',
    category: 'Logement',
    description: 'Formalités contradictoires d\'état des lieux d\'un bien en location.',
    defaultSteps: [
      { title: 'Prendre rendez-vous avec le propriétaire ou l\'agence' },
      { title: 'Relever les compteurs (eau, électricité, gaz)' },
      { title: 'Inspecter méticuleusement chaque pièce et prendre des photos' },
      { title: 'Signer l\'état des lieux officiel contradictoire' }
    ],
    defaultPieces: [
      { name: 'Grille d\'état des lieux vierge officielle', autoAttachTags: ['etat des lieux'] },
      { name: 'Contrat de bail signé', autoAttachTags: ['bail', 'contrat'] }
    ],
    defaultCost: 0
  },

  // TRAVAIL
  {
    id: 'tpl-contrat',
    name: 'Contrat de Travail (Signatures & Pièces)',
    icon: '💼',
    category: 'Travail',
    description: 'Constitution du dossier salarié pour l\'embauche.',
    defaultSteps: [
      { title: 'Relire la proposition d\'embauche ou le projet de contrat' },
      { title: 'Rassembler les pièces administratives pour les RH' },
      { title: 'Signer et retourner les exemplaires de contrat' },
      { title: 'Passer la visite médicale d\'information et de prévention (VIP)' }
    ],
    defaultPieces: [
      { name: 'Relevé d\'Identité Bancaire (RIB)', autoAttachTags: ['rib'] },
      { name: 'Attestation de Carte Vitale', autoAttachTags: ['carte vitale', 'attestation'] },
      { name: 'Pièce d\'identité en cours de validité', autoAttachTags: ['cni', 'passeport'] },
      { name: 'Dernier diplôme ou attestation de scolarité', autoAttachTags: ['diplome'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-chomage',
    name: 'Inscription France Travail (Chômage)',
    icon: '💼',
    category: 'Travail',
    description: 'Inscription en tant que demandeur d\'emploi et demande d\'allocations.',
    defaultSteps: [
      { title: 'S\'inscrire en ligne sur le portail France Travail' },
      { title: 'Transmettre l\'attestation d\'employeur fournie par le travail précédent' },
      { title: 'Passer son entretien initial avec son conseiller' },
      { title: 'S\'actualiser mensuellement sur le portail' }
    ],
    defaultPieces: [
      { name: 'Attestation employeur destinée à France Travail', autoAttachTags: ['attestation', 'employeur'] },
      { name: 'Relevé d\'Identité Bancaire (RIB) pour allocations', autoAttachTags: ['rib'] },
      { name: 'Derniers bulletins de salaire concernés', autoAttachTags: ['bulletin', 'salaire'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-retraite',
    name: 'Préparation & Demande de Retraite',
    icon: '🕰️',
    category: 'Travail',
    description: 'Démarches de demande de retraite de base et complémentaire.',
    defaultSteps: [
      { title: 'Consulter son relevé de carrière sur Info-Retraite.fr' },
      { title: 'Signaler d\'éventuels oublis ou erreurs de trimestres' },
      { title: 'Déposer sa demande de retraite en ligne 6 mois avant la date de départ' },
      { title: 'Suivre l\'instruction de sa pension de retraite' }
    ],
    defaultPieces: [
      { name: 'Livret de famille complet scanné', autoAttachTags: ['livret', 'famille'] },
      { name: 'Dernier avis d\'imposition', autoAttachTags: ['impots', 'imposition'] },
      { name: 'Relevé d\'Identité Bancaire (RIB)', autoAttachTags: ['rib'] }
    ],
    defaultCost: 0
  },
  {
    id: 'tpl-formation',
    name: 'Demande de Formation (Mon Compte Formation)',
    icon: '🎓',
    category: 'Travail',
    description: 'Utilisation des droits CPF pour financer une formation professionnelle.',
    defaultSteps: [
      { title: 'Activer son compte sur le portail MonCompteFormation' },
      { title: 'Rechercher la formation souhaitée et vérifier son éligibilité' },
      { title: 'Saisir son dossier de demande de financement CPF' },
      { title: 'Entrer en contact avec l\'organisme de formation pour finaliser' }
    ],
    defaultPieces: [
      { name: 'Pièce d\'identité valide (Sécurité renforcée France Connect+)', autoAttachTags: ['cni', 'passeport'] },
      { name: 'Dernier relevé de situation ou fiche de paie', autoAttachTags: ['bulletin', 'salaire'] }
    ],
    defaultCost: 0
  },

  // VOYAGE
  {
    id: 'tpl-voyage-passeport',
    name: 'Passeport & Documents Voyage',
    icon: '✈️',
    category: 'Voyage',
    description: 'Renouvellement ou demande de passeport en vue d\'un voyage imminent.',
    defaultSteps: [
      { title: 'Vérifier la date de validité requise par le pays de destination' },
      { title: 'Initier la pré-demande de passeport en ligne' },
      { title: 'Réaliser le dépôt du dossier en mairie' },
      { title: 'Réceptionner le document' }
    ],
    defaultPieces: [
      { name: 'Photos d\'identité réglementaires', autoAttachTags: ['photo'] },
      { name: 'Justificatif de domicile de moins de 1 an', autoAttachTags: ['domicile'] },
      { name: 'Timbre fiscal de voyage', autoAttachTags: ['timbre', 'fiscal'] }
    ],
    defaultCost: 86
  },
  {
    id: 'tpl-voyage-visa',
    name: 'Obtention Visa Tourisme',
    icon: '🛂',
    category: 'Voyage',
    description: 'Demande de visa d\'entrée touristique (ex: USA, Maroc, Asie).',
    defaultSteps: [
      { title: 'Vérifier les conditions d\'entrée du pays ciblé (Visa / e-Visa / ESTA)' },
      { title: 'Remplir le formulaire en ligne de demande de visa' },
      { title: 'Effectuer le paiement en ligne des droits de visa' },
      { title: 'Déposer le passeport ou recevoir le visa électronique par e-mail' }
    ],
    defaultPieces: [
      { name: 'Passeport valide (plusieurs pages vierges)', autoAttachTags: ['passeport'] },
      { name: 'Preuve de couverture d\'assurance médicale internationale', autoAttachTags: ['assurance', 'sante', 'voyage'] },
      { name: 'Justificatifs de ressources de voyage', autoAttachTags: ['banque', 'revenus'] }
    ],
    defaultCost: 80
  },
  {
    id: 'tpl-assurance-voyage',
    name: 'Assurance Voyage Internationale',
    icon: '🛡️',
    category: 'Voyage',
    description: 'Souscription d\'une assurance assistance et rapatriement à l\'étranger.',
    defaultSteps: [
      { title: 'Vérifier les garanties déjà incluses sur sa carte bancaire (Gold/Premier)' },
      { title: 'Demander des devis d\'assureurs spécialisés (rapatriement, santé)' },
      { title: 'Souscrire le contrat en ligne pour la durée exacte du séjour' },
      { title: 'Télécharger et imprimer l\'attestation d\'assurance en anglais/français' }
    ],
    defaultPieces: [
      { name: 'Contrat d\'assurance voyage souscrit', autoAttachTags: ['assurance', 'voyage'] },
      { name: 'RIB et justificatifs d\'identité', autoAttachTags: ['rib', 'cni'] }
    ],
    defaultCost: 50
  },

  // VÉHICULES
  {
    id: 'tpl-carte-grise',
    name: 'Certificat d\'Immatriculation (Carte Grise)',
    icon: '🚗',
    category: 'Véhicules',
    description: 'Changement de titulaire ou d\'adresse de carte grise.',
    defaultSteps: [
      { title: 'Se connecter sur le site ANTS ou faire appel à un garage agréé' },
      { title: 'Indiquer les caractéristiques du véhicule et numéro de formule' },
      { title: 'Renseigner le code de cession fourni par le vendeur' },
      { title: 'Payer la taxe régionale correspondante en ligne' },
      { title: 'Imprimer le certificat provisoire d\'immatriculation' }
    ],
    defaultPieces: [
      { name: 'Ancienne carte grise barrée, signée et datée par vendeur', autoAttachTags: ['carte grise', 'ancienne'] },
      { name: 'Formulaire Cerfa de demande d\'immatriculation', autoAttachTags: ['cerfa', 'immatriculation'] },
      { name: 'Justificatif de domicile du nouveau titulaire', autoAttachTags: ['domicile'] },
      { name: 'Permis de conduire du titulaire principal', autoAttachTags: ['permis'] }
    ],
    defaultCost: 250
  },
  {
    id: 'tpl-controle-technique',
    name: 'Contrôle Technique Réglementaire',
    icon: '🔧',
    category: 'Véhicules',
    description: 'Passage du contrôle technique périodique obligatoire.',
    defaultSteps: [
      { title: 'Vérifier la date anniversaire limite du contrôle technique' },
      { title: 'Prendre rendez-vous dans un centre de contrôle technique agréé' },
      { title: 'Déposer le véhicule avec le certificat d\'immatriculation' },
      { title: 'Récupérer le véhicule avec le rapport de contrôle' },
      { title: 'Effectuer les réparations et contre-visite sous 2 mois (si refusé)' }
    ],
    defaultPieces: [
      { name: 'Certificat d\'immatriculation original (Carte Grise)', autoAttachTags: ['carte grise'] }
    ],
    defaultCost: 80
  },
  {
    id: 'tpl-assurance-auto',
    name: 'Assurance Automobile',
    icon: '🛡️',
    category: 'Véhicules',
    description: 'Souscription ou modification d\'un contrat d\'assurance auto.',
    defaultSteps: [
      { title: 'Demander son relevé d\'information chez son assureur actuel' },
      { title: 'Comparer les tarifs (Tiers, Tiers étendu, Tous Risques)' },
      { title: 'Souscrire le contrat de son choix en ligne ou agence' },
      { title: 'Apposer la carte verte d\'assurance sur son pare-brise' }
    ],
    defaultPieces: [
      { name: 'Certificat d\'immatriculation (Carte Grise)', autoAttachTags: ['carte grise'] },
      { name: 'Permis de conduire du conducteur principal', autoAttachTags: ['permis'] },
      { name: 'Relevé d\'information d\'assurance précédent (bonus/malus)', autoAttachTags: ['releve', 'assurance', 'information'] },
      { name: 'Relevé d\'Identité Bancaire (RIB)', autoAttachTags: ['rib'] }
    ],
    defaultCost: 600
  },
  {
    id: 'tpl-vente-vehicule',
    name: 'Vente / Cession de Véhicule',
    icon: '🤝',
    category: 'Véhicules',
    description: 'Formalités administratives obligatoires pour vendre son véhicule.',
    defaultSteps: [
      { title: 'Passer le contrôle technique de moins de 6 mois' },
      { title: 'Demander un certificat de situation administrative (non-gage)' },
      { title: 'Remplir le certificat de cession officiel Cerfa 15776' },
      { title: 'Barrer la carte grise et inscrire "Vendu le..." avec signature' },
      { title: 'Déclarer la cession en ligne sur l\'ANTS dans les 15 jours' }
    ],
    defaultPieces: [
      { name: 'Certificat de situation administrative (Non-gage) < 15 jours', autoAttachTags: ['non-gage', 'situation'] },
      { name: 'Rapport de contrôle technique < 6 mois', autoAttachTags: ['controle technique', 'rapport'] },
      { name: 'Certificat de cession Cerfa 15776 signé en double exemplaire', autoAttachTags: ['cerfa', 'cession'] },
      { name: 'Certificat d\'immatriculation (Carte grise)', autoAttachTags: ['carte grise'] }
    ],
    defaultCost: 0
  }
];

