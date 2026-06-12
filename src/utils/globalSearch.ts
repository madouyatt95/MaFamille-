import type {
  ChatGroup,
  ChatMessage,
  ChoreTask,
  Dish,
  DocumentFile,
  GroceryItem,
  Member,
  SchoolTask,
  Transaction,
  Trip
} from '../types';
import type { UnifiedEvent } from './agendaHelper';

export type GlobalSearchTarget = {
  tab: string;
  module: string;
};

export type GlobalSearchResult = {
  id: string;
  title: string;
  detail: string;
  category: string;
  icon: string;
  target: GlobalSearchTarget;
  haystack: string;
};

export type GlobalSearchContext = {
  members: Member[];
  events: UnifiedEvent[];
  tasks: ChoreTask[];
  groceries: GroceryItem[];
  transactions: Transaction[];
  documents: DocumentFile[];
  trips: Trip[];
  schoolTasks: SchoolTask[];
  dishes: Dish[];
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9€\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const makeResult = (
  id: string,
  title: string,
  detail: string,
  category: string,
  icon: string,
  target: GlobalSearchTarget,
  extra = ''
): GlobalSearchResult => ({
  id,
  title,
  detail,
  category,
  icon,
  target,
  haystack: normalize(`${title} ${detail} ${category} ${extra}`)
});

export const buildGlobalSearchIndex = (context: GlobalSearchContext): GlobalSearchResult[] => {
  const results: GlobalSearchResult[] = [];

  context.members.forEach((member) => {
    results.push(makeResult(
      `member-${member.id}`,
      member.name,
      `${member.role || 'Membre'}${member.schoolOrEmployer ? ` • ${member.schoolOrEmployer}` : ''}`,
      'Membres',
      '👤',
      { tab: 'menu', module: 'membres' },
      `${member.age} ${member.phone || ''} ${member.allergies?.join(' ') || ''}`
    ));
  });

  context.events.forEach((event) => {
    results.push(makeResult(
      `event-${event.id}`,
      event.title,
      `${event.start_date}${event.start_time ? ` • ${event.start_time}` : ''}`,
      'Agenda',
      '📅',
      { tab: 'menu', module: 'agenda' },
      `${event.description || ''} ${event.member_id || ''} ${event.event_type || ''}`
    ));
  });

  context.tasks.forEach((task) => {
    results.push(makeResult(
      `task-${task.id}`,
      task.title,
      `${task.assignedMemberName || 'Famille'}${task.dueDate ? ` • ${task.dueDate}` : ''}`,
      'Tâches',
      '🧹',
      { tab: 'menu', module: 'taches' },
      `${task.description || ''} ${task.status || ''} ${task.category || ''}`
    ));
  });

  context.groceries.forEach((item) => {
    results.push(makeResult(
      `grocery-${item.id}`,
      item.name,
      `${item.quantity || '1'} • ${item.checked ? 'Acheté' : 'À acheter'}`,
      'Courses',
      '🛒',
      { tab: 'menu', module: 'courses' },
      `${item.category || ''} ${item.meal || ''} ${item.addedBy || ''}`
    ));
  });

  context.transactions.forEach((tx) => {
    results.push(makeResult(
      `transaction-${tx.id}`,
      tx.title,
      `${Math.round(Math.abs(tx.amount || 0))} € • ${tx.date}`,
      'Budget',
      '💰',
      { tab: 'budget', module: '' },
      `${tx.category || ''} ${tx.subCategory || ''} ${tx.memberName || ''} ${tx.comment || ''}`
    ));
  });

  context.documents.forEach((doc) => {
    results.push(makeResult(
      `document-${doc.id}`,
      doc.name,
      `${doc.category}${doc.expiryDate ? ` • expire le ${doc.expiryDate}` : ''}`,
      'Documents',
      '📂',
      { tab: 'menu', module: 'documents' },
      `${doc.subCategory || ''} ${doc.memberName || ''} ${doc.tags?.join(' ') || ''}`
    ));
  });

  context.trips.forEach((trip) => {
    results.push(makeResult(
      `trip-${trip.id}`,
      trip.destination,
      `${trip.startDate} → ${trip.endDate}`,
      'Voyages',
      '✈️',
      { tab: 'menu', module: 'voyages' },
      `${trip.bookingRefs?.join(' ') || ''} ${trip.checklist?.map((item) => item.text).join(' ') || ''}`
    ));
  });

  context.schoolTasks.forEach((task) => {
    results.push(makeResult(
      `school-${task.id}`,
      task.title,
      `${task.subject} • ${task.dueDate}`,
      'École',
      '🎓',
      { tab: 'menu', module: 'devoirs' },
      `${task.grade || ''} ${task.difficulty || ''}`
    ));
  });

  context.dishes.forEach((dish) => {
    results.push(makeResult(
      `dish-${dish.id}`,
      dish.name,
      `${dish.day} • ${dish.mealType === 'lunch' ? 'Déjeuner' : 'Dîner'}`,
      'Menus',
      '🍽️',
      { tab: 'menu', module: 'menus' },
      dish.ingredients?.join(' ') || ''
    ));
  });

  context.chatGroups.forEach((group) => {
    results.push(makeResult(
      `chat-group-${group.id}`,
      group.name,
      group.lastMessage || 'Discussion familiale',
      'Messagerie',
      '💬',
      { tab: 'menu', module: 'messagerie' },
      `${group.memberIds.join(' ')} ${group.isPrivate ? 'prive privee' : 'groupe'}`
    ));
  });

  context.chatMessages.slice(-80).forEach((message) => {
    const group = context.chatGroups.find((candidate) => candidate.id === message.groupId);
    results.push(makeResult(
      `chat-message-${message.id}`,
      message.content || 'Message',
      `${message.senderName}${group ? ` • ${group.name}` : ''}`,
      'Messages',
      '💬',
      { tab: 'menu', module: 'messagerie' },
      `${message.type} ${message.timestamp}`
    ));
  });

  return results;
};

export const searchGlobalIndex = (query: string, index: GlobalSearchResult[], limit = 8) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const terms = normalizedQuery.split(' ').filter(Boolean);

  return index
    .map((item) => {
      const score = terms.reduce((sum, term) => {
        if (normalize(item.title).includes(term)) return sum + 4;
        if (normalize(item.category).includes(term)) return sum + 2;
        if (item.haystack.includes(term)) return sum + 1;
        return sum;
      }, 0);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map(({ item }) => item);
};
