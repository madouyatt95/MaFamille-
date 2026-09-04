import { createHouseholdData, type HouseholdData, type HouseholdGrocery, type LabAudience } from './householdLabData.ts';
import { parseGroceryEntities } from './safeGroceryEntities.ts';
import { dayInZone, shiftDay } from './householdLabDates.ts';

// Loaded only by an explicit lab button. These records never enter the real household.
export function createHouseholdFixture(now: number): HouseholdData {
  const data = createHouseholdData();
  const today = dayInZone(now, data.timezone);
  const weekday = new Date(today + 'T12:00:00Z').getUTCDay();
  const monday = shiftDay(today, -((weekday + 6) % 7));
  const friday = shiftDay(monday, weekday === 0 || weekday > 5 ? 11 : 4);
  const groceries = (text: string, prefix: string, memberId: LabAudience = null): HouseholdGrocery[] => parseGroceryEntities(text).items.map((item, index) => ({ ...item, id: `${prefix}:${index}`, bought: 0, memberId }));
  data.members = [
    { id: 'parent-test', name: 'Alex (test)', aliases: ['Alex', 'papa'], role: 'parent' },
    { id: 'mother-test', name: 'Camille (test)', aliases: ['Camille', 'maman'], role: 'parent' },
    { id: 'child-test', name: 'Ismaël (test)', aliases: ['Ismaël'], role: 'child' },
  ];
  data.groceries = [...groceries('trois bouteilles de lait et six yaourts', 'current'), ...groceries('deux pommes', 'child', 'child-test')];
  data.history = [{ id: 'archive-last-week', date: shiftDay(monday, -3), items: groceries('un pain et deux bouteilles de coca', 'archive') }];
  data.events = [
    { id: 'dentist-parent', title: 'Dentiste', date: shiftDay(today, 2), time: '10:00', duration: 30, memberId: 'parent-test' },
    { id: 'dentist-child', title: 'Dentiste', date: shiftDay(today, 3), time: '11:00', duration: 30, memberId: 'child-test' },
    { id: 'occupied-child', title: 'Activité réservée', date: friday, time: '13:00', duration: 60, memberId: 'child-test' },
  ];
  data.tasks = [{ id: 'task-school', title: 'Préparer le cartable', date: shiftDay(today, 1), memberId: 'child-test', done: false }];
  data.expenses = [{ id: 'expense-example', cents: 1250, label: 'Pharmacie', memberId: 'mother-test' }];
  data.routines = [{ id: 'holiday-example', name: 'Départ en vacances', trigger: 'prépare notre départ en vacances', steps: [
    { kind: 'task', text: 'Préparer les valises', daysBefore: 1, time: '09:00' },
    { kind: 'grocery', text: 'deux bouteilles d’eau', daysBefore: 0, time: '09:00' },
    { kind: 'reminder', text: 'Prendre les documents', daysBefore: 0, time: '08:00' },
  ] }];
  return data;
}
