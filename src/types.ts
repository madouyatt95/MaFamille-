// === FOYER SYSTEM ===

export type MemberRole = 'admin' | 'parent' | 'child' | 'guest';

export interface Foyer {
  id: string;
  name: string;
  inviteCode: string;
  inviteLink?: string;
  createdBy: string;
  createdAt: string;
  isPremium: boolean;
  maxMembers: number;
  parentPin?: string;
}

export interface FoyerMember {
  id: string;
  foyerId: string;
  userId: string;
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
  latitude?: number;
  longitude?: number;
  locationStatus?: string;
  lastLocatedAt?: string;
  hasExemption?: boolean;
  approved?: boolean;
}

export interface FoyerInvitation {
  id: string;
  foyerId: string;
  email: string;
  role: MemberRole;
  invitedBy: string;
  createdAt: string;
  accepted: boolean;
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
  latitude?: number;
  longitude?: number;
  locationStatus?: string;
  lastLocatedAt?: string;
  hasExemption?: boolean;
  approved?: boolean;
}

export type EventType = 'medical' | 'school' | 'bill' | 'grocery' | 'social' | 'other';

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
  fileBase64?: string; // Stored locally
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
  goalTitle?: string;
  goalAmount?: number;
}
