import type {
  ChatGroup,
  ChatMessage,
  ChoreTask,
  Dish,
  DocumentFile,
  Foyer,
  GroceryItem,
  Member,
  NotificationAlert,
  SchoolTask,
  Transaction,
  Trip
} from '../types';
import type { UnifiedEvent } from './agendaHelper';

export type SmartFamilyTarget = {
  tab: string;
  module: string;
  toastMessage?: string;
};

export type SmartFamilyAction = {
  id: string;
  title: string;
  detail: string;
  category: 'setup' | 'priority' | 'routine' | 'parent' | 'child';
  priority: 'high' | 'medium' | 'low';
  target: SmartFamilyTarget;
};

export type SmartFamilyContext = {
  foyer?: Foyer | null;
  activeMemberId: string;
  members: Member[];
  events: UnifiedEvent[];
  tasks: ChoreTask[];
  groceries: GroceryItem[];
  transactions: Transaction[];
  trips: Trip[];
  documents: DocumentFile[];
  dishes: Dish[];
  schoolTasks: SchoolTask[];
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
};

const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysDiff = (dateStr?: string, todayStr = localDateString()) => {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const today = new Date(todayStr);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const isParentRole = (role?: string) => {
  const clean = (role || '').toLowerCase();
  return ['chef', 'admin', 'gestionnaire', 'parent'].some((part) => clean.includes(part));
};

const isChildRole = (role?: string, age?: string) => {
  const clean = (role || '').toLowerCase();
  if (clean.includes('enfant') || clean.includes('child') || clean.includes('ado') || clean.includes('adolescent')) return true;
  const ageNum = Number.parseInt(age || '0', 10);
  return ageNum > 0 && ageNum < 18;
};

const target = (module: string, tab = 'menu'): SmartFamilyTarget => ({
  tab,
  module,
  toastMessage: module ? 'Module ouvert' : undefined
});

export const buildSmartFamilyActions = (context: SmartFamilyContext): SmartFamilyAction[] => {
  const todayStr = localDateString();
  const activeMember = context.members.find((member) => member.id === context.activeMemberId);
  const isParent = isParentRole(activeMember?.role);
  const childIds = context.members
    .filter((member) => isChildRole(member.role, member.age))
    .map((member) => member.id);

  const openTasks = context.tasks.filter((task) => !task.done && !task.isArchived && task.status !== 'validated');
  const visibleTasks = isParent
    ? openTasks
    : openTasks.filter((task) =>
      task.assignedMemberId === context.activeMemberId || task.assignedMemberIds?.includes(context.activeMemberId)
    );
  const overdueTasks = visibleTasks.filter((task) => task.dueDate && task.dueDate < todayStr);
  const todayTasks = visibleTasks.filter((task) => task.dueDate === todayStr);
  const schoolDueSoon = context.schoolTasks.filter((task) => {
    const isVisible = isParent || task.assignedMemberId === context.activeMemberId;
    const diff = daysDiff(task.dueDate, todayStr);
    return isVisible && !task.done && diff >= 0 && diff <= 2;
  });
  const pendingGroceries = context.groceries.filter((item) => !item.checked);
  const expiringDocuments = context.documents.filter((doc) => doc.isExpired || (doc.expiryDate && daysDiff(doc.expiryDate, todayStr) >= 0 && daysDiff(doc.expiryDate, todayStr) <= 30));
  const nextTrip = context.trips
    .filter((trip) => trip.startDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const unreadMessages = context.chatMessages.filter((message) => {
    const group = context.chatGroups.find((candidate) => candidate.id === message.groupId);
    return !!group && group.memberIds.includes(context.activeMemberId) && !message.readBy.includes(context.activeMemberId);
  });
  const todayEvents = context.events.filter((event) => event.start_date === todayStr && !event.done);
  const monthStr = todayStr.slice(0, 7);
  const monthlyExpenses = context.transactions
    .filter((tx) => !tx.isArchived && tx.type === 'expense' && tx.date?.startsWith(monthStr))
    .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

  const actions: SmartFamilyAction[] = [];

  if (isParent && context.members.length <= 1) {
    actions.push({
      id: 'setup-members',
      title: 'Ajouter les membres du foyer',
      detail: 'Le tableau familial devient vraiment utile quand chaque parent/enfant a son profil.',
      category: 'setup',
      priority: 'high',
      target: target('membres')
    });
  }

  if (isParent && context.chatGroups.length === 0) {
    actions.push({
      id: 'setup-chat',
      title: 'Créer une première discussion',
      detail: 'Un groupe familial permet de centraliser les messages importants.',
      category: 'setup',
      priority: 'medium',
      target: target('messagerie')
    });
  }

  if (isParent && context.documents.length === 0) {
    actions.push({
      id: 'setup-documents',
      title: 'Ajouter les premiers documents',
      detail: 'Carte d’identité, assurance, école ou santé : le coffre-fort peut suivre les échéances.',
      category: 'setup',
      priority: 'medium',
      target: target('documents')
    });
  }

  if (overdueTasks.length > 0) {
    actions.push({
      id: 'overdue-tasks',
      title: `${overdueTasks.length} tâche${overdueTasks.length > 1 ? 's' : ''} en retard`,
      detail: overdueTasks[0]?.title || 'Ouvrir les tâches',
      category: isParent ? 'parent' : 'child',
      priority: 'high',
      target: target('taches')
    });
  }

  if (schoolDueSoon.length > 0) {
    actions.push({
      id: 'school-due-soon',
      title: `${schoolDueSoon.length} devoir${schoolDueSoon.length > 1 ? 's' : ''} à suivre`,
      detail: schoolDueSoon[0]?.title || 'Ouvrir le suivi scolaire',
      category: isParent ? 'parent' : 'child',
      priority: 'high',
      target: target('devoirs')
    });
  }

  if (expiringDocuments.length > 0) {
    actions.push({
      id: 'expiring-documents',
      title: `${expiringDocuments.length} document${expiringDocuments.length > 1 ? 's' : ''} à vérifier`,
      detail: expiringDocuments[0]?.name || 'Ouvrir le coffre-fort',
      category: 'priority',
      priority: 'high',
      target: target('documents')
    });
  }

  if (unreadMessages.length > 0) {
    actions.push({
      id: 'unread-messages',
      title: `${unreadMessages.length} message${unreadMessages.length > 1 ? 's' : ''} non lu${unreadMessages.length > 1 ? 's' : ''}`,
      detail: `Dernier message de ${unreadMessages[0]?.senderName || 'la famille'}`,
      category: 'priority',
      priority: 'medium',
      target: target('messagerie')
    });
  }

  if (pendingGroceries.length >= 5) {
    actions.push({
      id: 'grocery-list',
      title: 'Liste de courses à finaliser',
      detail: `${pendingGroceries.length} articles restent à acheter.`,
      category: 'routine',
      priority: 'medium',
      target: target('courses')
    });
  }

  if (nextTrip) {
    const tripDays = daysDiff(nextTrip.startDate, todayStr);
    const remaining = nextTrip.checklist?.filter((item) => !item.done).length || 0;
    if (tripDays <= 14 || remaining > 0) {
      actions.push({
        id: 'next-trip',
        title: tripDays <= 0 ? 'Voyage aujourd’hui' : `Voyage dans ${tripDays} jour${tripDays > 1 ? 's' : ''}`,
        detail: `${nextTrip.destination}${remaining > 0 ? ` • ${remaining} point${remaining > 1 ? 's' : ''} de checklist` : ''}`,
        category: 'priority',
        priority: tripDays <= 3 ? 'high' : 'medium',
        target: target('voyages')
      });
    }
  }

  if (isParent && todayEvents.length === 0 && todayTasks.length === 0 && pendingGroceries.length === 0) {
    actions.push({
      id: 'quiet-day',
      title: 'Journée calme',
      detail: 'Aucune urgence détectée. Tu peux préparer la semaine ou vérifier la timeline.',
      category: 'routine',
      priority: 'low',
      target: target('', 'timeline')
    });
  }

  if (isParent && monthlyExpenses > 0) {
    actions.push({
      id: 'budget-review',
      title: 'Point budget du mois',
      detail: `${Math.round(monthlyExpenses)} € de dépenses enregistrées ce mois-ci.`,
      category: 'routine',
      priority: 'low',
      target: target('', 'budget')
    });
  }

  if (isParent && childIds.length > 0 && openTasks.filter((task) => childIds.includes(task.assignedMemberId)).length === 0) {
    actions.push({
      id: 'child-routine',
      title: 'Attribuer une mission enfant',
      detail: 'Aucune mission ouverte n’est affectée aux enfants pour le moment.',
      category: 'parent',
      priority: 'low',
      target: target('taches')
    });
  }

  return actions
    .sort((a, b) => {
      const weight = { high: 0, medium: 1, low: 2 };
      return weight[a.priority] - weight[b.priority];
    })
    .slice(0, 8);
};

export const buildSmartFamilyAlerts = (context: SmartFamilyContext): NotificationAlert[] => {
  const actions = buildSmartFamilyActions(context);
  return actions
    .filter((action) => action.priority !== 'low')
    .slice(0, 5)
    .map((action) => ({
      id: `smart-${context.foyer?.id || 'local'}-${context.activeMemberId}-${action.id}`,
      title: action.title,
      description: action.detail,
      time: 'Maintenant',
      type: action.priority === 'high' ? 'warning' : 'info',
      read: false,
      module: action.target.module || action.target.tab,
      createdAt: new Date().toISOString()
    }));
};
