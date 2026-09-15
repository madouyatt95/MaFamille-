import type { PilotSnapshot } from '../../src/services/voicePilotService';

export async function loadVoicePilot(): Promise<PilotSnapshot> {
  return { scope: 'test:foyer-test:parent-test', foyerId: 'foyer-test', memberId: 'parent-test', loadedAt: Date.now(),
    groceries: [], external: [], members: [{ id: 'alice', display_name: 'Alice (test)' }, { id: 'noe', display_name: 'Noé (test)' }],
    events: [{ id: 'rdv-a', title: 'Dentiste', date_time: '2026-12-15', time: '10:00', done: false, member_id: 'alice' }, { id: 'rdv-b', title: 'Dentiste', date_time: '2026-12-15', time: '11:00', done: false, member_id: 'noe' }],
  };
}
export async function commitVoicePilot(_snapshot: PilotSnapshot, _id: string, action: unknown) {
  document.body.dataset.fixtureAction = JSON.stringify(action);
}
