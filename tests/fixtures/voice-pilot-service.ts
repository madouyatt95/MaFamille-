import type { PilotSnapshot } from '../../src/services/voicePilotService';
let loads = 0;
let stored: PilotSnapshot['groceries'] = [];

export async function loadVoicePilot(): Promise<PilotSnapshot> {
  const scenario = new URLSearchParams(location.search).get('scenario');
  loads++;
  if (scenario === 'preserved' && loads === 1) stored = [{ id: 'old', name: 'Personnes', quantity: '2', category: null, checked: null }];
  if (scenario === 'concurrent' && loads === 2) stored.push({ id: 'remote', name: 'Tomates', quantity: '2', category: 'Légumes', checked: false });
  return { scope: 'test:foyer-test:parent-test', foyerId: 'foyer-test', memberId: 'parent-test', loadedAt: Date.now() - (scenario === 'expiry' && loads === 1 ? 119000 : 0),
    groceries: structuredClone(stored), external: [], members: [{ id: 'alice', display_name: 'Alice (test)' }, { id: 'noe', display_name: 'Noé (test)' }],
    events: [{ id: 'rdv-a', title: 'Dentiste', date_time: '2026-12-15', time: '10:00', done: false, member_id: 'alice' }, { id: 'rdv-b', title: 'Dentiste', date_time: '2026-12-15', time: '11:00', done: false, member_id: 'noe' }],
  };
}
export async function commitVoicePilot(_snapshot: PilotSnapshot, _id: string, action: unknown) {
  document.body.dataset.fixtureAction = JSON.stringify(action);
  if ((action as {kind: string}).kind === 'groceries') stored = structuredClone((action as {after: PilotSnapshot['groceries']}).after);
}
