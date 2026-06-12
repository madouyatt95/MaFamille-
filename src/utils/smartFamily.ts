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

export type SmartFamilySetupProgress = {
  total: number;
  done: number;
  percent: number;
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

const parseBirthdayForYear = (birthDate: string, year: number) => {
  if (!birthDate) return null;
  const parts = birthDate.includes('/') ? birthDate.split('/') : birthDate.split('-');
  if (parts.length !== 3) return null;

  let day: number;
  let month: number;
  if (parts[0].length === 4) {
    month = Number.parseInt(parts[1], 10);
    day = Number.parseInt(parts[2], 10);
  } else {
    day = Number.parseInt(parts[0], 10);
    month = Number.parseInt(parts[1], 10);
  }
  if (!day || !month) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const getSmartFamilySetupProgress = (context: SmartFamilyContext): SmartFamilySetupProgress => {
  const parentMembers = context.members.filter((member) => isParentRole(member.role));
  const childMembers = context.members.filter((member) => isChildRole(member.role, member.age));
  const total = 7;
  const doneChecks = [
    context.members.length > 1,
    context.chatGroups.length > 0,
    context.documents.length > 0,
    context.groceries.length > 0,
    context.events.length > 0 || context.tasks.length > 0,
    context.dishes.length > 0,
    parentMembers.length > 0 && (childMembers.length > 0 || context.members.length >= 2)
  ];
  const done = doneChecks.filter(Boolean).length;
  return {
    total,
    done,
    percent: Math.round((done / total) * 100)
  };
};

export const buildSmartFamilyActions = (context: SmartFamilyContext): SmartFamilyAction[] => {
  const todayStr = localDateString();
  const todayDate = new Date();
  const activeMember = context.members.find((member) => member.id === context.activeMemberId);
  const isParent = isParentRole(activeMember?.role);
  const childIds = context.members
    .filter((member) => isChildRole(member.role, member.age))
    .map((member) => member.id);
  const parentMembers = context.members.filter((member) => isParentRole(member.role));

  const openTasks = context.tasks.filter((task) => !task.done && !task.isArchived && task.status !== 'validated');
  const validationTasks = context.tasks.filter((task) =>
    !task.isArchived && (task.status === 'pending_validation' || (task.done && task.validatedByParent === false))
  );
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
  const upcomingWeekEvents = context.events.filter((event) => {
    const diff = daysDiff(event.start_date, todayStr);
    return !event.done && diff >= 0 && diff <= 7;
  });
  const monthStr = todayStr.slice(0, 7);
  const monthlyExpenses = context.transactions
    .filter((tx) => !tx.isArchived && tx.type === 'expense' && tx.date?.startsWith(monthStr))
    .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  const upcomingBirthdays = context.members
    .map((member) => {
      const birthday = parseBirthdayForYear(member.birthDate, todayDate.getFullYear());
      return birthday ? { member, diff: daysDiff(birthday, todayStr) } : null;
    })
    .filter((entry): entry is { member: Member; diff: number } => !!entry && entry.diff >= 0 && entry.diff <= 14)
    .sort((a, b) => a.diff - b.diff);

  const actions: SmartFamilyAction[] = [];

  if (isParent && parentMembers.length === 0) {
    actions.push({
      id: 'setup-parent-role',
      title: 'Confirmer un profil parent',
      detail: 'Un parent identifié simplifie les validations, les règles enfants et les réglages sensibles.',
      category: 'setup',
      priority: 'high',
      target: target('membres')
    });
  }

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

  if (isParent && context.groceries.length === 0) {
    actions.push({
      id: 'setup-groceries',
      title: 'Préparer la première liste de courses',
      detail: 'Ajoutez quelques produits habituels pour amorcer les courses et Éco-Chef.',
      category: 'setup',
      priority: 'medium',
      target: target('courses')
    });
  }

  if (isParent && context.dishes.length === 0) {
    actions.push({
      id: 'setup-meals',
      title: 'Planifier un premier repas',
      detail: 'Un menu même simple aide à relier repas, courses et organisation de la semaine.',
      category: 'setup',
      priority: 'low',
      target: target('menus')
    });
  }

  if (isParent && context.events.length === 0 && context.tasks.length === 0) {
    actions.push({
      id: 'setup-first-planning',
      title: 'Ajouter un premier repère familial',
      detail: 'Un rendez-vous, une tâche ou une échéance suffit pour alimenter la timeline.',
      category: 'setup',
      priority: 'low',
      target: target('agenda')
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

  if (isParent && validationTasks.length > 0) {
    actions.push({
      id: 'task-validations',
      title: `${validationTasks.length} validation${validationTasks.length > 1 ? 's' : ''} parent en attente`,
      detail: validationTasks[0]?.title || 'Valider les missions terminées',
      category: 'parent',
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

  if (!isParent && todayTasks.length > 0) {
    actions.push({
      id: 'child-today-tasks',
      title: `${todayTasks.length} mission${todayTasks.length > 1 ? 's' : ''} aujourd’hui`,
      detail: todayTasks[0]?.title || 'Voir mes missions',
      category: 'child',
      priority: 'medium',
      target: target('taches')
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

  if (upcomingBirthdays.length > 0) {
    actions.push({
      id: 'birthday-soon',
      title: upcomingBirthdays[0].diff === 0 ? `Anniversaire de ${upcomingBirthdays[0].member.name}` : `Anniversaire dans ${upcomingBirthdays[0].diff} jour${upcomingBirthdays[0].diff > 1 ? 's' : ''}`,
      detail: `Pensez à préparer un message ou un souvenir pour ${upcomingBirthdays[0].member.name}.`,
      category: 'priority',
      priority: upcomingBirthdays[0].diff <= 1 ? 'high' : 'medium',
      target: target('membres')
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

  if (isParent && pendingGroceries.length > 0 && context.dishes.length === 0) {
    actions.push({
      id: 'grocery-to-meals',
      title: 'Transformer les courses en menus',
      detail: 'Votre liste contient déjà des idées pour préparer les repas de la semaine.',
      category: 'routine',
      priority: 'low',
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

  if (isParent && upcomingWeekEvents.length === 0 && openTasks.length > 0) {
    actions.push({
      id: 'tasks-without-planning',
      title: 'Des tâches sans repère agenda',
      detail: 'Vous pouvez planifier les missions importantes pour clarifier la semaine.',
      category: 'routine',
      priority: 'low',
      target: target('taches')
    });
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

  if (isParent && monthlyExpenses === 0 && context.transactions.length === 0) {
    actions.push({
      id: 'setup-budget',
      title: 'Initialiser le budget familial',
      detail: 'Ajoutez une première dépense ou un solde pour commencer le suivi financier.',
      category: 'setup',
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
    .filter((action) => action.priority !== 'low' && action.category !== 'setup')
    .slice(0, 7)
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
