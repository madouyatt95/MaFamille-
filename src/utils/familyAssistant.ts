import type {
  ChatGroup,
  ChatMessage,
  ChoreTask,
  Dish,
  DocumentFile,
  GroceryItem,
  Member,
  NotificationAlert,
  SchoolTask,
  Transaction,
  Trip
} from '../types';
import type { UnifiedEvent } from './agendaHelper';

export type FamilyAssistantIntent =
  | 'day_summary'
  | 'priorities'
  | 'late_tasks'
  | 'groceries'
  | 'budget'
  | 'messages'
  | 'documents'
  | 'travel'
  | 'children'
  | 'week_summary'
  | 'meals'
  | 'health'
  | 'setup'
  | 'help';

export type FamilyAssistantTarget = {
  tab: string;
  module: string;
  subView?: { type: 'tab'; tab: string } | null;
  toastMessage: string;
};

export type FamilyAssistantResult = {
  intent: FamilyAssistantIntent;
  feedback: string;
  target?: FamilyAssistantTarget;
};

export type FamilyAssistantContext = {
  activeMemberId: string;
  members: Member[];
  events: UnifiedEvent[];
  tasks: ChoreTask[];
  groceries: GroceryItem[];
  transactions: Transaction[];
  documents: DocumentFile[];
  trips: Trip[];
  dishes: Dish[];
  schoolTasks: SchoolTask[];
  alerts: NotificationAlert[];
  chatGroups: ChatGroup[];
  chatMessages: ChatMessage[];
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9€\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (normalizedText: string, phrases: string[]) =>
  phrases.some((phrase) => normalizedText.includes(normalize(phrase)));

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysDiff = (dateStr: string, todayStr = getLocalDateString()) => {
  const target = new Date(dateStr);
  const today = new Date(todayStr);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const compactList = (items: string[], fallback: string, max = 3) => {
  const clean = items.filter(Boolean).slice(0, max);
  if (clean.length === 0) return fallback;
  const extra = Math.max(0, items.length - clean.length);
  return `${clean.join(', ')}${extra > 0 ? ` et ${extra} autre${extra > 1 ? 's' : ''}` : ''}`;
};

const moduleTarget = (module: string, toastMessage: string): FamilyAssistantTarget => ({
  tab: 'menu',
  module,
  toastMessage
});

export const detectFamilyAssistantIntent = (text: string): FamilyAssistantIntent | null => {
  const normalized = normalize(text);
  if (!normalized) return null;

  if (includesAny(normalized, [
    'aide assistant', 'que peux tu faire', 'tu peux faire quoi', 'aide moi', 'assistant familial',
    'commandes disponibles', 'comment tu peux aider', 'donne moi les commandes'
  ])) {
    return 'help';
  }

  if (includesAny(normalized, [
    'resume ma journee', 'resume la journee', 'quoi aujourd hui', 'qu est ce qu il y a aujourd hui',
    'j ai quoi aujourd hui', 'programme du jour', 'planning du jour', 'ma journee', 'notre journee',
    'fais le point', 'point famille', 'resume famille', 'quoi faire maintenant', 'on commence par quoi',
    'dis moi quoi faire', 'etat de la maison', 'tableau de bord famille'
  ])) {
    return 'day_summary';
  }

  if (includesAny(normalized, [
    'semaine', 'point semaine', 'resume de la semaine', 'planning semaine', 'cette semaine',
    'qu est ce qu on a cette semaine', 'programme semaine', 'semaine familiale'
  ])) {
    return 'week_summary';
  }

  if (includesAny(normalized, [
    'configuration famille', 'configurer la famille', 'demarrage guide', 'bien demarrer',
    'quoi configurer', 'que manque t il', 'ce qu il faut completer', 'foyer incomplet',
    'parametrer le foyer', 'premiers reglages'
  ])) {
    return 'setup';
  }

  if (includesAny(normalized, [
    'urgent', 'priorite', 'priorites', 'a ne pas oublier', 'on a oublie quoi',
    'quoi faire en premier', 'qu est ce qui presse', 'ce qui bloque', 'a surveiller',
    'important aujourd hui', 'alerte famille', 'risque aujourd hui', 'attention aujourd hui'
  ])) {
    return 'priorities';
  }

  if (includesAny(normalized, [
    'taches en retard', 'qui n a pas fait', 'qui doit faire quoi', 'missions en retard',
    'taches ouvertes', 'missions ouvertes', 'reste a faire', 'choses a faire',
    'missions du jour', 'mes missions', 'travail maison', 'corvees'
  ])) {
    return 'late_tasks';
  }

  if (includesAny(normalized, [
    'courses restantes', 'liste de courses restante', 'il manque quoi', 'courses a faire',
    'articles a acheter', 'qu est ce qu il manque', 'qu est ce qu on doit acheter',
    'liste d achat', 'frigo vide', 'placards', 'courses du jour'
  ])) {
    return 'groceries';
  }

  if (includesAny(normalized, [
    'qu est ce qu on mange', 'on mange quoi', 'menu du jour', 'menus de la semaine',
    'repas prevus', 'idee repas', 'planning repas', 'diner ce soir', 'dejeuner aujourd hui'
  ])) {
    return 'meals';
  }

  if (includesAny(normalized, [
    'budget aujourd hui', 'depenses aujourd hui', 'combien depense', 'point budget',
    'depenses du jour', 'argent aujourd hui', 'finances aujourd hui', 'point argent',
    'combien on a depense', 'budget du mois', 'situation budget'
  ])) {
    return 'budget';
  }

  if (includesAny(normalized, [
    'messages non lus', 'ai je des messages', 'on m a ecrit', 'messages a lire',
    'quoi dans les messages', 'message important', 'dernier message', 'messages famille',
    'conversation a lire'
  ])) {
    return 'messages';
  }

  if (includesAny(normalized, [
    'documents a verifier', 'papiers a verifier', 'document expire', 'documents expires',
    'papiers expires', 'passeport expire', 'piece d identite', 'coffre fort',
    'documents urgents', 'papiers urgents'
  ])) {
    return 'documents';
  }

  if (includesAny(normalized, [
    'point sante', 'sante famille', 'carnet de sante', 'rendez vous sante',
    'vaccins a verifier', 'traitements', 'allergies', 'medecin a venir'
  ])) {
    return 'health';
  }

  if (includesAny(normalized, [
    'point voyage', 'prepare le voyage', 'voyage a preparer', 'valises restantes',
    'checklist voyage', 'prochain voyage', 'vacances a preparer', 'bagages a faire',
    'valise a faire', 'depart bientot'
  ])) {
    return 'travel';
  }

  if (includesAny(normalized, [
    'les enfants ont quoi', 'point enfants', 'devoirs enfants', 'missions enfants',
    'quoi pour les enfants', 'ados', 'ado', 'enfants aujourd hui', 'suivi enfants',
    'missions ado', 'devoirs ado', 'enfant a faire'
  ])) {
    return 'children';
  }

  return null;
};

export const buildFamilyAssistantResponse = (
  intent: FamilyAssistantIntent,
  context: FamilyAssistantContext
): FamilyAssistantResult => {
  const todayStr = getLocalDateString();
  const activeMember = context.members.find((member) => member.id === context.activeMemberId);
  const todayEvents = context.events
    .filter((event) => event.start_date === todayStr && !event.done)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const upcomingEvents = context.events
    .filter((event) => event.start_date > todayStr && !event.done)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const openTasks = context.tasks.filter((task) => !task.done && !task.isArchived && task.status !== 'validated');
  const lateTasks = openTasks.filter((task) => task.dueDate && task.dueDate < todayStr);
  const todayTasks = openTasks.filter((task) => task.dueDate === todayStr);
  const pendingGroceries = context.groceries.filter((item) => !item.checked);
  const unreadAlerts = context.alerts.filter((alert) => !alert.read);
  const unreadMessages = context.chatMessages.filter((message) => {
    const group = context.chatGroups.find((candidate) => candidate.id === message.groupId);
    if (!group || !group.memberIds.includes(context.activeMemberId)) return false;
    return !message.readBy.includes(context.activeMemberId);
  });
  const todayTransactions = context.transactions.filter((tx) => tx.date === todayStr && !tx.isArchived);
  const monthStr = todayStr.slice(0, 7);
  const monthTransactions = context.transactions.filter((tx) => tx.date?.startsWith(monthStr) && !tx.isArchived && tx.type === 'expense');
  const todayBudgetTotal = todayTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  const monthBudgetTotal = monthTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  const expiringDocuments = context.documents.filter((doc) => {
    if (doc.isExpired) return true;
    if (!doc.expiryDate) return false;
    const diff = daysDiff(doc.expiryDate, todayStr);
    return diff >= 0 && diff <= 30;
  });
  const nextTrip = context.trips
    .filter((trip) => trip.startDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const childIds = context.members
    .filter((member) => ['child', 'enfant', 'adolescent', 'ado'].some((role) => member.role.toLowerCase().includes(role)))
    .map((member) => member.id);
  const childTasks = openTasks.filter((task) =>
    childIds.includes(task.assignedMemberId) || task.assignedMemberIds?.some((id) => childIds.includes(id))
  );
  const childSchoolTasks = context.schoolTasks.filter((task) => childIds.includes(task.assignedMemberId) && !task.done);
  const weekEvents = context.events
    .filter((event) => {
      const diff = daysDiff(event.start_date, todayStr);
      return !event.done && diff >= 0 && diff <= 7;
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const mealsToday = context.dishes.filter((dish) => {
    const day = new Date().toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3);
    return dish.day.toLowerCase().startsWith(day.toLowerCase());
  });
  const setupMissing = [
    context.members.length <= 1 ? 'ajouter les membres' : '',
    context.chatGroups.length === 0 ? 'créer une discussion familiale' : '',
    context.documents.length === 0 ? 'ajouter les premiers documents' : '',
    context.groceries.length === 0 ? 'préparer une liste de courses' : '',
    context.dishes.length === 0 ? 'planifier un repas' : ''
  ].filter(Boolean);
  const healthMembers = context.members.filter((member) =>
    member.allergies?.length || member.treatments?.length || member.bloodGroup
  );

  switch (intent) {
    case 'day_summary': {
      const parts = [
        `${todayEvents.length} événement${todayEvents.length > 1 ? 's' : ''}`,
        `${todayTasks.length} tâche${todayTasks.length > 1 ? 's' : ''} prévue${todayTasks.length > 1 ? 's' : ''}`,
        `${unreadMessages.length + unreadAlerts.length} élément${unreadMessages.length + unreadAlerts.length > 1 ? 's' : ''} à lire`
      ];
      const first = todayEvents[0]?.title || todayTasks[0]?.title || unreadMessages[0]?.content || 'rien de bloquant';
      return {
        intent,
        feedback: `Aujourd'hui : ${parts.join(', ')}. Priorité : ${first}.`,
        target: { tab: 'accueil', module: '', toastMessage: 'Résumé de la journée' }
      };
    }

    case 'priorities': {
      const priorities = [
        ...lateTasks.map((task) => `tâche en retard : ${task.title}`),
        ...expiringDocuments.map((doc) => `document à vérifier : ${doc.name}`),
        ...upcomingEvents.filter((event) => daysDiff(event.start_date, todayStr) <= 1).map((event) => `demain : ${event.title}`),
        ...unreadMessages.slice(0, 1).map((message) => `message de ${message.senderName}`)
      ];
      return {
        intent,
        feedback: priorities.length > 0
          ? `Priorités : ${compactList(priorities, 'rien de critique')}.`
          : 'Bonne nouvelle : je ne vois rien de critique pour le moment.',
        target: { tab: 'accueil', module: '', toastMessage: 'Priorités affichées' }
      };
    }

    case 'week_summary':
      return {
        intent,
        feedback: weekEvents.length > 0
          ? `Cette semaine : ${weekEvents.length} repère${weekEvents.length > 1 ? 's' : ''}. À surveiller : ${compactList(weekEvents.map((event) => event.title), 'rien')}.`
          : 'Je ne vois aucun repère familial prévu dans les 7 prochains jours.',
        target: { tab: 'accueil', module: '', toastMessage: 'Semaine affichée' }
      };

    case 'late_tasks':
      return {
        intent,
        feedback: lateTasks.length > 0
          ? `${lateTasks.length} tâche${lateTasks.length > 1 ? 's' : ''} en retard : ${compactList(lateTasks.map((task) => task.title), 'aucune')}.`
          : `Aucune tâche en retard. Il reste ${openTasks.length} tâche${openTasks.length > 1 ? 's' : ''} ouverte${openTasks.length > 1 ? 's' : ''}.`,
        target: moduleTarget('taches', 'Tâches ouvertes')
      };

    case 'groceries':
      return {
        intent,
        feedback: pendingGroceries.length > 0
          ? `Il reste ${pendingGroceries.length} article${pendingGroceries.length > 1 ? 's' : ''} à acheter : ${compactList(pendingGroceries.map((item) => item.name), 'aucun')}.`
          : 'La liste de courses est à jour : aucun article restant.',
        target: moduleTarget('courses', 'Courses ouvertes')
      };

    case 'meals':
      return {
        intent,
        feedback: mealsToday.length > 0
          ? `Repas du jour : ${compactList(mealsToday.map((dish) => dish.name), 'aucun repas')}.`
          : context.dishes.length > 0
            ? `Aucun repas prévu aujourd'hui. ${context.dishes.length} repas sont planifiés dans la semaine.`
            : "Aucun menu n'est encore planifié. Vous pouvez commencer par un repas simple.",
        target: moduleTarget('menus', 'Menus ouverts')
      };

    case 'budget':
      return {
        intent,
        feedback: todayTransactions.length > 0
          ? `Aujourd'hui, ${todayTransactions.length} mouvement${todayTransactions.length > 1 ? 's' : ''} pour environ ${Math.round(todayBudgetTotal)} €. Ce mois-ci : ${Math.round(monthBudgetTotal)} €.`
          : `Aucun mouvement aujourd'hui. Ce mois-ci : ${Math.round(monthBudgetTotal)} € enregistrés.`,
        target: { tab: 'budget', module: '', subView: { type: 'tab', tab: 'transactions' }, toastMessage: 'Budget ouvert' }
      };

    case 'messages':
      return {
        intent,
        feedback: unreadMessages.length > 0
          ? `${unreadMessages.length} message${unreadMessages.length > 1 ? 's' : ''} non lu${unreadMessages.length > 1 ? 's' : ''}. Le dernier vient de ${unreadMessages[0].senderName}.`
          : "Aucun message non lu pour ce profil.",
        target: moduleTarget('messagerie', 'Messagerie ouverte')
      };

    case 'documents':
      return {
        intent,
        feedback: expiringDocuments.length > 0
          ? `${expiringDocuments.length} document${expiringDocuments.length > 1 ? 's' : ''} à vérifier : ${compactList(expiringDocuments.map((doc) => doc.name), 'aucun')}.`
          : "Aucun document urgent à vérifier dans les 30 prochains jours.",
        target: moduleTarget('documents', 'Documents ouverts')
      };

    case 'health':
      return {
        intent,
        feedback: healthMembers.length > 0
          ? `Santé : ${healthMembers.length} profil${healthMembers.length > 1 ? 's' : ''} contient des infos médicales. Vérifiez les rendez-vous et documents santé si besoin.`
          : 'Aucune information médicale sensible renseignée pour le moment.',
        target: moduleTarget('sante', 'Santé ouverte')
      };

    case 'travel': {
      if (!nextTrip) {
        return {
          intent,
          feedback: "Je ne vois pas de voyage à venir pour le moment.",
          target: moduleTarget('voyages', 'Voyages ouverts')
        };
      }
      const remaining = nextTrip.checklist?.filter((item) => !item.done).length || 0;
      const diff = daysDiff(nextTrip.startDate, todayStr);
      return {
        intent,
        feedback: `Prochain voyage : ${nextTrip.destination} dans ${diff} jour${diff > 1 ? 's' : ''}. ${remaining} point${remaining > 1 ? 's' : ''} de checklist à préparer.`,
        target: moduleTarget('voyages', 'Voyages ouverts')
      };
    }

    case 'setup':
      return {
        intent,
        feedback: setupMissing.length > 0
          ? `Pour mieux démarrer : ${compactList(setupMissing, 'rien à compléter', 4)}.`
          : 'Le foyer est déjà bien configuré. Les prochaines améliorations viendront de vos usages.',
        target: { tab: 'accueil', module: '', toastMessage: 'Démarrage guidé' }
      };

    case 'children':
      return {
        intent,
        feedback: `Côté enfants : ${childTasks.length} mission${childTasks.length > 1 ? 's' : ''} ouverte${childTasks.length > 1 ? 's' : ''}, ${childSchoolTasks.length} devoir${childSchoolTasks.length > 1 ? 's' : ''} à suivre. ${activeMember ? `Profil actif : ${activeMember.name}.` : ''}`,
        target: moduleTarget('taches', 'Missions enfants')
      };

    case 'help':
    default:
      return {
        intent: 'help',
        feedback: "Je peux résumer la journée ou la semaine, prioriser, suivre tâches, courses, repas, budget, messages, santé, documents, voyages, enfants et configuration du foyer.",
        target: { tab: 'accueil', module: '', toastMessage: 'Assistant familial' }
      };
  }
};
