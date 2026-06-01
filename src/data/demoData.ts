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
    name: 'Renouvellement Passeport',
    icon: '🛂',
    description: 'Demande de passeport pour un majeur ou mineur',
    defaultSteps: [
      { title: 'Effectuer la pré-demande en ligne sur le site ANTS' },
      { title: 'Acheter le timbre fiscal dématérialisé' },
      { title: 'Prendre rendez-vous en mairie pour le dépôt des empreintes' },
      { title: 'Se rendre au RDV avec les pièces et le récapitulatif' },
      { title: 'Retirer le passeport en mairie après réception du SMS' }
    ],
    defaultPieces: [
      { name: 'Photo d\'identité de moins de 6 mois aux normes', autoAttachTags: ['photo', 'portrait'] },
      { name: 'Justificatif de domicile récent', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: 'Timbre fiscal (86€ pour majeur, 42€/17€ pour mineur)', autoAttachTags: ['timbre', 'timbre fiscal'] },
      { name: 'Numéro de pré-demande ANTS', autoAttachTags: ['ants', 'pre-demande'] },
      { name: 'Ancien passeport ou Déclaration de perte/vol', autoAttachTags: ['ancien passeport', 'perte', 'vol'] }
    ]
  },
  {
    id: 'tpl-creche',
    name: 'Inscription Crèche',
    icon: '🍼',
    description: 'Dossier de demande de place en crèche municipale',
    defaultSteps: [
      { title: 'Prendre contact avec le service petite enfance de la mairie' },
      { title: 'Remplir le dossier d\'inscription officiel' },
      { title: 'Rassembler les justificatifs d\'activité et de domicile' },
      { title: 'Déposer le dossier complet avant la commission' },
      { title: 'Confirmer la naissance auprès de la mairie après l\'accouchement' }
    ],
    defaultPieces: [
      { name: 'Justificatif de domicile de moins de 3 mois', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: '3 derniers bulletins de salaire des deux parents', autoAttachTags: ['bulletin', 'salaire', 'revenus'] },
      { name: 'Dernier avis d\'imposition', autoAttachTags: ['impots', 'imposition', 'avis'] },
      { name: 'Livret de famille complet', autoAttachTags: ['livret', 'famille', 'officiel'] },
      { name: 'Carnet de santé de l\'enfant', autoAttachTags: ['vaccin', 'sante', 'medical'] }
    ]
  },
  {
    id: 'tpl-mutuelle-sante',
    name: 'Complémentaire Santé',
    icon: '🩺',
    description: 'Changement de complémentaire santé pour la famille',
    defaultSteps: [
      { title: 'Demander des devis comparatifs en ligne' },
      { title: 'Vérifier les garanties essentielles (optique, dentaire)' },
      { title: 'Envoyer la lettre de résiliation à l\'ancienne mutuelle' },
      { title: 'Signer le nouveau contrat de complémentaire' },
      { title: 'Télécharger la nouvelle carte de tiers payant' }
    ],
    defaultPieces: [
      { name: 'Attestation de droits Sécurité Sociale (Ameli)', autoAttachTags: ['ameli', 'secu', 'attestation'] },
      { name: 'Ancienne carte de tiers payant', autoAttachTags: ['mutuelle', 'carte', 'assurance'] },
      { name: 'RIB pour les remboursements', autoAttachTags: ['rib', 'banque', 'iban', 'bic'] },
      { name: 'Pièce d\'identité du souscripteur', autoAttachTags: ['cni', 'passeport', 'identité', 'id'] }
    ]
  },
  {
    id: 'tpl-demande-logement',
    name: 'Demande de Logement',
    icon: '🏢',
    description: 'Dossier de demande de logement social ou de location privée',
    defaultSteps: [
      { title: 'Remplir le formulaire de demande unique en ligne' },
      { title: 'Déterminer le budget de loyer maximum et les zones souhaitées' },
      { title: 'Réunir toutes les pièces justificatives d\'éligibilité' },
      { title: 'Déposer le dossier sur le portail régional ou au bailleur' },
      { title: 'Suivre l\'avancement et renouveler la demande annuellement' }
    ],
    defaultPieces: [
      { name: 'Pièces d\'identité de tous les occupants', autoAttachTags: ['cni', 'passeport', 'identité', 'id'] },
      { name: '2 derniers avis d\'imposition', autoAttachTags: ['impots', 'imposition', 'avis'] },
      { name: '3 derniers bulletins de salaire', autoAttachTags: ['bulletin', 'salaire', 'revenus'] },
      { name: 'Justificatif de domicile actuel', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: 'Attestation de prestations CAF', autoAttachTags: ['caf', 'attestation', 'allocations'] }
    ]
  },
  {
    id: 'tpl-sports-loisirs',
    name: 'Sports & Loisirs Annuels',
    icon: '⚽',
    description: 'Inscription annuelle des enfants au club de sport ou conservatoire',
    defaultSteps: [
      { title: 'Choisir l\'activité et le créneau horaire' },
      { title: 'Participer à la séance d\'essai' },
      { title: 'Faire remplir le certificat médical par le médecin' },
      { title: 'Remplir le dossier d\'inscription officiel' },
      { title: 'Régler la cotisation (Chèques vacances / CAF / Atoutsports)' }
    ],
    defaultPieces: [
      { name: 'Certificat médical d\'aptitude', autoAttachTags: ['certificat', 'medical', 'sante'] },
      { name: 'Photo d\'identité de l\'enfant', autoAttachTags: ['photo', 'portrait'] },
      { name: 'Attestation d\'assurance responsabilité civile', autoAttachTags: ['assurance', 'civil', 'scolaire'] },
      { name: 'Justificatif de domicile', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] }
    ]
  },
  {
    id: 'tpl-mariage-pacs',
    name: 'Mariage / PACS',
    icon: '💍',
    description: 'Constitution du dossier de mariage ou PACS en mairie',
    defaultSteps: [
      { title: 'Prendre contact avec le service État Civil de la mairie' },
      { title: 'Choisir et réserver la date et l\'heure de la cérémonie' },
      { title: 'Retirer le dossier officiel de mariage ou PACS' },
      { title: 'Remplir le dossier et réunir toutes les pièces' },
      { title: 'Déposer le dossier sur RDV (présence des deux obligatoire)' },
      { title: 'Attendre la publication légale des bans' }
    ],
    defaultPieces: [
      { name: 'Pièce d\'identité originale', autoAttachTags: ['cni', 'passeport', 'identité', 'id'] },
      { name: 'Acte de naissance de moins de 3 mois', autoAttachTags: ['acte', 'naissance'] },
      { name: 'Justificatif de domicile récent', autoAttachTags: ['domicile', 'edf', 'facture', 'quittance'] },
      { name: 'Attestation sur l\'honneur de non-alliance', autoAttachTags: ['honneur', 'attestation'] },
      { name: 'Pièces d\'identité des témoins', autoAttachTags: ['temoins', 'cni'] }
    ]
  },
  {
    id: 'tpl-declaration-naissance',
    name: 'Déclaration de Naissance',
    icon: '👶',
    description: 'Démarches obligatoires suite à la naissance d\'un enfant',
    defaultSteps: [
      { title: 'Déclarer la naissance à l\'état civil de la mairie (sous 5 jours)' },
      { title: 'Déclarer le nouveau-né à la CAF' },
      { title: 'Déclarer le nouveau-né à la Sécurité Sociale (Ameli)' },
      { title: 'Rattacher le bébé à la Mutuelle complémentaire' },
      { title: 'Inscrire l\'enfant sur le Livret de Famille' }
    ],
    defaultPieces: [
      { name: 'Certificat d\'accouchement de la maternité', autoAttachTags: ['maternite', 'naissance', 'certificat'] },
      { name: 'Livret de famille ou Acte de reconnaissance', autoAttachTags: ['livret', 'famille', 'officiel'] },
      { name: 'Pièces d\'identité des parents', autoAttachTags: ['cni', 'passeport', 'identité', 'id'] },
      { name: 'Déclaration conjointe de choix de nom', autoAttachTags: ['choix', 'nom', 'declaration'] }
    ]
  }
];
