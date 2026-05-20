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
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  insuranceExpiry: string;
  technicalControl: string;
  lastService: string;
  nextService: string;
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
}

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
}

export interface NotificationAlert {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  module?: string;
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
}

export interface ChatGroup {
  id: string;
  name: string;
  isPrivate: boolean;
  memberIds: string[]; // Members allowed in this chat
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

// === DOCSBOX INTEGRATION ===

export type DemarcheStatus = 'draft' | 'in_progress' | 'waiting' | 'completed';

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
  assignedMemberId?: string;
  assignedMemberName?: string;
  steps: DemarcheStep[];
  pieces: DemarchePiece[];
  createdAt: string;
  notes?: string;
}

export interface DemarcheTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultSteps: { title: string; }[];
  defaultPieces: { name: string; autoAttachTags?: string[]; }[];
}

export interface JustificatifPack {
  id: string;
  name: string;
  templateType: 'location' | 'ecole' | 'banque' | 'emploi' | 'custom';
  documentIds: string[];
  createdAt: string;
}
