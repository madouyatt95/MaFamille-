// === FOYER SYSTEM ===

export type MemberRole = 'chef_famille' | 'parent' | 'gestionnaire' | 'adulte' | 'adolescent' | 'enfant' | 'invite' | 'admin' | 'child' | 'guest';

export interface ModulePermissions {
  voir: boolean;
  ajouter: boolean;
  modifier: boolean;
  supprimer: boolean;
  valider: boolean;
  archiver: boolean;
  recevoir_notifications: boolean;
}

export type FamilyModule = 
  | 'accueil'
  | 'timeline'
  | 'budget'
  | 'agenda'
  | 'courses'
  | 'sante'
  | 'voyages'
  | 'documents'
  | 'vehicules'
  | 'logement'
  | 'animaux'
  | 'ecole'
  | 'taches'
  | 'conseil_famille'
  | 'histoires_soir'
  | 'messagerie'
  | 'capsule_temporelle'
  | 'repertoire_important'
  | 'peacemaker'
  | 'carte_familiale'
  | 'menu_semaine'
  | 'demarches'
  | 'notifications'
  | 'parametres'
  | 'micro'
  | 'jeux_famille'
  | 'commune'
  | 'etablissement';

export interface MalusSettings {
  enabled: boolean;
  shields_enabled: boolean;
  weekly_shields: number;
  reparation_enabled: boolean;
  max_malus_per_day: number;
  rewards_enabled?: boolean;
  reward_parent_validation?: boolean;
  reward_daily_cap?: number;
  reward_game_points?: number;
  reward_sources?: {
    tasks: boolean;
    school: boolean;
    games: boolean;
  };
}

export interface Foyer {
  id: string;
  name: string;
  inviteCode: string;
  inviteLink?: string;
  createdBy: string;
  createdAt: string;
  isPremium: boolean;
  maxMembers: number;
  premiumSource?: 'test' | 'stripe' | 'appstore' | null;
  premiumPlan?: 'monthly' | 'yearly' | null;
  premiumStatus?: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | null;
  premiumExpiresAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  appStoreOriginalTransactionId?: string | null;
  malusSettings?: MalusSettings;
}

export interface FoyerMember {
  id: string;
  foyerId: string;
  userId: string | null;
  displayName: string;
  role: MemberRole;
  photoUrl?: string;
  age?: string;
  birthDate?: string;
  bloodGroup?: string;
  allergies?: string[];
  treatments?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  schoolOrEmployer?: string;
  joinedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  locationStatus?: string;
  lastLocatedAt?: string;
  hasExemption?: boolean;
  approved?: boolean;
  notificationPrefs?: Record<string, boolean>;
}

export type FoyerMemberProfileUpdate = Partial<Omit<FoyerMember, 'userId'>> & {
  userId?: string | null;
};

export interface FoyerInvitation {
  id: string;
  foyerId: string;
  email: string;
  role: MemberRole;
  invitedBy: string;
  createdAt: string;
  accepted: boolean;
}

export interface FamilyJoinRequest {
  id: string;
  familyId: string;
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  applicantAvatar?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requestedByCode?: boolean;
  requestedByQr?: boolean;
  familyName?: string;
  inviteCode?: string;
}

// === DATA TYPES ===

export interface MedicalLog {
  id: string;
  date: string;
  title: string;
  doctor: string;
  notes: string;
}

export interface Member {
  id: string;
  userId?: string;
  name: string;
  role: string;
  age: string;
  birthDate: string;
  bloodGroup: string;
  allergies: string[];
  treatments: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  schoolOrEmployer: string;
  photoUrl: string;
  medicalHistory: MedicalLog[];
  latitude?: number | null;
  longitude?: number | null;
  locationStatus?: string;
  lastLocatedAt?: string;
  hasExemption?: boolean;
  approved?: boolean;
  phone?: string;
}

export type EventType = 'medical' | 'school' | 'bill' | 'grocery' | 'social' | 'other' | 'vaccine';

export interface FamilyEvent {
  id: string;
  title: string;
  type: EventType;
  dateTime: string;
  time: string;
  memberId?: string; // color code
  memberName?: string;
  location?: string;
  description?: string;
  done: boolean;
  amount?: number; // for bills
  isExternal?: boolean;
  sourceName?: string;
  sourceColor?: string;
}

export type TransactionType = 'income' | 'expense' | 'savings';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string; // Alimentation, Logement, Transport, Santé, Éducation, Loisirs, Divers
  date: string;
  title: string;
  memberId?: string;
  memberName?: string;
  subCategory?: string;
  accountId?: string;
  receiptUrl?: string;
  attachmentUrl?: string;
  receiptBase64?: string;
  attachmentBase64?: string;
  comment?: string;
  modificationHistory?: { author: string; date: string; action: string }[];
  isArchived?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'quarterly' | 'semiannually' | 'custom';
  subscriptionId?: string;
  moduleSource?: string;
  categoryId?: string;
  subCategoryId?: string;
  currency?: string;
  recurrenceInterval?: number;
  startDate?: string;
  endDate?: string;
  entryDate?: string;
  entryTime?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  source_module?: string;
  travel_id?: string;
  travelId?: string;
  nextOccurrence?: string;
}

export type DocumentCategory = 'identity' | 'health' | 'school' | 'insurance' | 'bank' | 'contract' | 'vehicle' | 'home' | 'travel' | 'other';

export interface DocumentFile {
  id: string;
  name: string;
  category: DocumentCategory;
  subCategory?: string;
  memberId?: string;
  memberName?: string;
  tags: string[];
  uploadDate: string;
  expiryDate?: string;
  fileSize: string;
  isExpired: boolean;
  description?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileBase64?: string; // Legacy local/database payload kept only for migration
  isSecure?: boolean; // Requires PIN to view/download
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string; // Boucherie, Épicerie, Produits Frais, Hygiène, Fruits & Légumes, etc.
  quantity: string;
  checked: boolean;
  inStock: boolean;
  expiryDate?: string;
  meal?: string;
  addedBy?: string;
  isFavorite?: boolean;
}

export interface ArchivedList {
  id: string;
  name: string;
  date: string;
  items: GroceryItem[];
  store?: string;
  createdBy: string;
}

export interface Dish {
  id: string;
  day: string; // Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche
  mealType: 'lunch' | 'dinner';
  name: string;
  image: string; // Lucide icon or abstract drawing category
  ingredients: string[];
}

export interface ChoreTask {
  id: string;
  title: string;
  rewardPoints: number;
  assignedMemberId: string;
  assignedMemberName: string;
  done: boolean;
  rotation: 'daily' | 'weekly' | 'none';
  validatedByParent: boolean;
  dueDate: string;
  rewardAmount?: number;

  // Metadata properties parsed from/serialized to the 'title' column
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'pending_validation' | 'validated' | 'refused';
  validationRequired?: boolean;
  isArchived?: boolean;
  time?: string;
  assignedMemberIds?: string[];
  recurrence?: 'daily' | 'weekly' | 'none';

  // Task Wall properties
  attributionMode?: 'single' | 'multiple' | 'wall';
  maxParticipants?: number;
  selectionMode?: 'first_come' | 'approval';
  candidates?: string[];
  acceptedVolunteers?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  imageUrl?: string;
  estimatedTime?: string;
  isDailySpecial?: boolean;
  xpReward?: number;
}

export interface ChoreTaskMetadata {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'pending_validation' | 'validated' | 'refused';
  validationRequired?: boolean;
  isArchived?: boolean;
  time?: string;
  rewardAmount?: number;
  assignedMemberIds?: string[];
  recurrence?: 'daily' | 'weekly' | 'none';

  // Task Wall properties
  attributionMode?: 'single' | 'multiple' | 'wall';
  maxParticipants?: number;
  selectionMode?: 'first_come' | 'approval';
  candidates?: string[];
  acceptedVolunteers?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  imageUrl?: string;
  estimatedTime?: string;
  isDailySpecial?: boolean;
  xpReward?: number;
}

export function parseChoreTitle(rawTitle: string): ChoreTaskMetadata {
  if (rawTitle && rawTitle.startsWith('{') && rawTitle.endsWith('}')) {
    try {
      const data = JSON.parse(rawTitle);
      if (data && typeof data === 'object' && 'title' in data) {
        return {
          title: data.title || '',
          description: data.description || '',
          priority: data.priority || 'medium',
          status: data.status || 'todo',
          validationRequired: data.validationRequired !== false,
          isArchived: !!data.isArchived,
          time: data.time || '',
          rewardAmount: data.rewardAmount || 0,
          assignedMemberIds: Array.isArray(data.assignedMemberIds) ? data.assignedMemberIds : [],
          recurrence: data.recurrence || 'none',
          attributionMode: data.attributionMode || 'single',
          maxParticipants: data.maxParticipants || 1,
          selectionMode: data.selectionMode || 'first_come',
          candidates: Array.isArray(data.candidates) ? data.candidates : [],
          acceptedVolunteers: Array.isArray(data.acceptedVolunteers) ? data.acceptedVolunteers : [],
          difficulty: data.difficulty || 'medium',
          category: data.category || 'Divers',
          imageUrl: data.imageUrl || '',
          estimatedTime: data.estimatedTime || '',
          isDailySpecial: !!data.isDailySpecial,
          xpReward: data.xpReward
        };
      }
    } catch {
      // Ignored, fallback to plain title
    }
  }
  return {
    title: rawTitle || '',
    description: '',
    priority: 'medium',
    status: 'todo',
    validationRequired: true,
    isArchived: false,
    time: '',
    rewardAmount: 0,
    assignedMemberIds: [],
    recurrence: 'none',
    attributionMode: 'single',
    maxParticipants: 1,
    selectionMode: 'first_come',
    candidates: [],
    acceptedVolunteers: [],
    difficulty: 'medium',
    category: 'Divers',
    imageUrl: '',
    estimatedTime: '',
    isDailySpecial: false,
    xpReward: undefined
  };
}

export function serializeChoreTitle(meta: ChoreTaskMetadata): string {
  return JSON.stringify({
    title: meta.title || '',
    description: meta.description || '',
    priority: meta.priority || 'medium',
    status: meta.status || 'todo',
    validationRequired: meta.validationRequired !== false,
    isArchived: !!meta.isArchived,
    time: meta.time || '',
    rewardAmount: meta.rewardAmount || 0,
    assignedMemberIds: meta.assignedMemberIds || [],
    recurrence: meta.recurrence || 'none',
    attributionMode: meta.attributionMode || 'single',
    maxParticipants: meta.maxParticipants || 1,
    selectionMode: meta.selectionMode || 'first_come',
    candidates: meta.candidates || [],
    acceptedVolunteers: meta.acceptedVolunteers || [],
    difficulty: meta.difficulty || 'medium',
    category: meta.category || 'Divers',
    imageUrl: meta.imageUrl || '',
    estimatedTime: meta.estimatedTime || '',
    isDailySpecial: !!meta.isDailySpecial,
    xpReward: meta.xpReward
  });
}


export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  insuranceExpiry: string;
  technicalControl: string;
  lastService: string;
  nextService: string;
  mileage?: number;
}

export interface HomeMaintenance {
  id: string;
  title: string;
  date: string;
  cost: number;
  status: 'scheduled' | 'completed' | 'urgent';
  provider: string;
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  checklist: { id: string; text: string; done: boolean }[];
  bookingRefs: string[];
}

export interface PetRecord {
  id: string;
  name: string;
  species: string;
  lastVaccine: string;
  nextVaccine: string;
  vetAppointment?: string;
  notes?: string;
  weightHistory?: { date: string; weight: number }[];
  documentIds?: string[];
}

export interface SavingGoalContribution {
  memberName: string;
  amount: number;
  date: string;
}

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  contributions?: SavingGoalContribution[];
}

export interface CustomCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  budget?: number;
  displayOrder?: number;
  subcategories?: string[];
  isArchived?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'savings' | 'wallet';
  balance: number;
  icon?: string;
  color?: string;
  initialBalance?: number;
}

export interface Abonnement {
  id: string;
  name: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextBillingDate: string;
  category?: string;
}

export interface Debt {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  payerName: string;
  debtorId: string;
  debtorName: string;
  isRepaid: boolean;
}

export interface VoiceCommandLog {
  id: string;
  userId?: string;
  memberId?: string;
  memberName?: string;
  command: string;
  success: boolean;
  createdAt?: string;
  moduleSource?: string;
  categoryId?: string;
  subCategoryId?: string;
  amount?: number;
  currency?: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
}

export interface NotificationAlert {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  module?: string;
  senderUserId?: string;
  senderMemberId?: string;
  senderName?: string;
  senderAvatar?: string;
  createdAt?: string;
}

export interface MemoryLog {
  id: string;
  date: string;
  title: string;
  description: string;
  authorName: string;
  authorPhoto: string;
  imageUrl?: string;
  imageUrls?: string[];
  likesCount: number;
  isPrivate?: boolean;
  theme?: string;
}

export interface FamilyVote {
  id: string;
  question: string;
  options: { text: string; votes: string[] }[];
  authorName: string;
  active: boolean;
  dueDate: string;
}

export interface SchoolTask {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
  done: boolean;
  assignedMemberId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  grade?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export type MessageType = 'text' | 'image' | 'voice' | 'document';

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderUserId?: string;
  senderName: string;
  type: MessageType;
  content: string; // text or base64 data for media
  timestamp: string;
  readBy: string[]; // array of member IDs
  reactions?: { emoji: string; senderName: string }[];
}

export interface ChatGroup {
  id: string;
  name: string;
  isPrivate: boolean;
  memberIds: string[]; // Members allowed in this chat
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  pinnedMessageId?: string;
}

// === DOCSBOX INTEGRATION ===

export type DemarcheStatus = 'todo' | 'in_progress' | 'waiting' | 'missing_docs' | 'payment_pending' | 'completed' | 'archived';

export interface DemarcheStep {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
}

export interface DemarchePiece {
  id: string;
  name: string;
  documentId?: string; // linked to a DocumentFile
  status: 'missing' | 'attached' | 'expired';
}

export interface Demarche {
  id: string;
  templateId?: string;
  title: string;
  icon: string;
  status: DemarcheStatus;
  category?: string; // e.g. Identité, Famille, Santé, École, Logement, Travail, Voyage, Véhicules, Autre
  assignedMemberId?: string;
  assignedMemberName?: string;
  steps: DemarcheStep[];
  pieces: DemarchePiece[];
  createdAt: string;
  dueDate?: string;
  notes?: string;
  cost?: number; // fallback or legacy
  costEstimated?: number;
  costReal?: number;
  isPaid?: boolean;
  paymentStatus?: 'unpaid' | 'paid' | 'none';
  receiptDocId?: string;
  recurrence?: string; // optional recurrence info
  reminders?: string[]; // array of reminder strings or dates
}

export interface DemarcheTemplate {
  id: string;
  name: string;
  icon: string;
  category: string; // e.g. Identité, Famille, Santé, École, Logement, Travail, Voyage, Véhicules
  description: string;
  defaultSteps: { title: string; }[];
  defaultPieces: { name: string; autoAttachTags?: string[]; }[];
  defaultCost?: number;
}

export interface JustificatifPack {
  id: string;
  name: string;
  templateType: 'location' | 'ecole' | 'banque' | 'emploi' | 'custom';
  documentIds: string[];
  createdAt: string;
}

export interface Artisan {
  id: string;
  name: string;
  specialty: string;
  phone?: string;
  email?: string;
  rating: number;
  notes?: string;
}

export interface PocketMoneyChild {
  id: string;
  name: string;
  balance: number;
  points: number;
  avatar: string;
  shields?: number;
  streak?: number;
  lastShieldReset?: string;
  lastConnection?: string;
  goalTitle?: string;
  goalAmount?: number;
  goalType?: 'points' | 'money';
  rules?: PocketMoneyRule[];
}

export const ALL_FAMILY_MODULES: FamilyModule[] = [
  'accueil', 'timeline', 'budget', 'agenda', 'courses', 'sante', 'voyages', 'documents',
  'vehicules', 'logement', 'animaux', 'ecole', 'taches', 'conseil_famille', 'histoires_soir',
  'messagerie', 'capsule_temporelle', 'repertoire_important', 'peacemaker', 'carte_familiale',
  'menu_semaine', 'demarches', 'notifications', 'parametres', 'micro', 'commune', 'etablissement'
];

export function getDefaultPermissions(role: string): Record<FamilyModule, ModulePermissions> {
  const isAdultRole = ['chef_famille', 'parent', 'gestionnaire', 'adulte', 'admin'].includes(role);
  const perms = {} as Record<FamilyModule, ModulePermissions>;
  
  for (const m of ALL_FAMILY_MODULES) {
    if (isAdultRole) {
      perms[m] = { voir: true, ajouter: true, modifier: true, supprimer: true, valider: true, archiver: true, recevoir_notifications: true };
    } else if (role === 'adolescent') {
      const allowedToSee = [
        'accueil', 'timeline', 'agenda', 'courses', 'voyages', 'ecole', 'taches',
        'conseil_famille', 'messagerie', 'capsule_temporelle', 'repertoire_important',
        'peacemaker', 'carte_familiale', 'menu_semaine', 'notifications', 'etablissement'
      ].includes(m);
      
      perms[m] = {
        voir: allowedToSee,
        ajouter: ['courses', 'taches', 'messagerie', 'ecole', 'conseil_famille', 'peacemaker', 'capsule_temporelle'].includes(m) && allowedToSee,
        modifier: ['taches', 'messagerie', 'ecole', 'peacemaker'].includes(m) && allowedToSee,
        supprimer: false,
        valider: ['taches'].includes(m) && allowedToSee,
        archiver: false,
        recevoir_notifications: allowedToSee
      };
    } else if (role === 'enfant' || role === 'child') {
      const allowedToSee = [
        'accueil', 'agenda', 'courses', 'voyages', 'ecole', 'taches', 'conseil_famille',
        'histoires_soir', 'capsule_temporelle', 'peacemaker', 'menu_semaine'
      ].includes(m);
      
      perms[m] = {
        voir: allowedToSee,
        ajouter: ['courses', 'taches', 'peacemaker', 'capsule_temporelle'].includes(m) && allowedToSee,
        modifier: ['taches', 'peacemaker'].includes(m) && allowedToSee,
        supprimer: false,
        valider: ['taches'].includes(m) && allowedToSee,
        archiver: false,
        recevoir_notifications: allowedToSee
      };
    } else {
      // Invite or default
      const allowedToSee = ['accueil', 'agenda', 'courses', 'voyages', 'menu_semaine', 'capsule_temporelle'].includes(m);
      perms[m] = {
        voir: allowedToSee,
        ajouter: false,
        modifier: false,
        supprimer: false,
        valider: false,
        archiver: false,
        recevoir_notifications: false
      };
    }
  }
  return perms;
}

export interface PocketMoneyRule {
  id: string;
  type: 'weekly' | 'monthly' | 'after_mission' | 'after_grade' | 'after_average' | 'after_badge' | 'after_challenge';
  amount: number;
  points: number;
  active: boolean;
  conditionValue?: string;
  lastPaymentDate?: string;
}

export function parsePocketMoneyTitle(rawTitle: string): { goalTitle?: string; goalType?: 'points' | 'money'; rules?: PocketMoneyRule[] } {
  if (!rawTitle) return {};
  const trimmed = rawTitle.trim();
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.error("Error parsing pocket money metadata:", e);
    }
  }
  return { goalTitle: rawTitle, goalType: 'money', rules: [] };
}

export function serializePocketMoneyTitle(metadata: { goalTitle?: string; goalType?: 'points' | 'money'; rules?: PocketMoneyRule[] }): string {
  return JSON.stringify(metadata);
}

export interface MalusTemplate {
  id: string;
  foyerId: string;
  title: string;
  emoji: string;
  description?: string;
  category: string;
  starsRemoved: number;
  xpRemoved: number;
  lossStreak: boolean;
  lossShield: boolean;
  commentRequired: boolean;
  doubleParentValidation: boolean;
  createdAt?: string;
}

export interface AppliedMalus {
  id: string;
  foyerId: string;
  memberId: string;
  title: string;
  emoji: string;
  description?: string;
  starsRemoved: number;
  xpRemoved: number;
  lossStreak: boolean;
  lossShield: boolean;
  comment?: string;
  shieldUsed: boolean;
  repaired: boolean;
  repairedAt?: string;
  reparationTaskId?: string;
  createdAt: string;
}
