import assert from 'node:assert/strict';
import test from 'node:test';
import { inferSharedJourneyTarget, resolveQuickActionFromLocation } from '../src/utils/journeyContracts.ts';
import { quickActionLink } from '../src/utils/nativeSharedInbox.ts';

test('les liens d’action conservent leur destination', () => {
  for (const action of ['open-micro', 'paid', 'scan-receipt', 'scan-homework', 'add-grocery', 'open-vault']) {
    const url = new URL(quickActionLink(action));
    assert.equal(url.origin, 'https://myfamilyplus.fr');
    assert.equal(resolveQuickActionFromLocation(url.pathname, url.searchParams.get('action')), action);
  }
});

test('une action explicite reste prioritaire', () => {
  assert.equal(resolveQuickActionFromLocation('/action/open-vault', 'scan-homework'), 'scan-homework');
});

test('le partage ouvre le bon module', () => {
  assert.equal(inferSharedJourneyTarget({ text: 'TOTAL TTC 24,90 € CARTE BLEUE' }), 'budget');
  assert.equal(inferSharedJourneyTarget({ text: 'Devoir de mathématiques à rendre lundi' }), 'homework');
  assert.equal(inferSharedJourneyTarget({ text: 'Réservation train Paris Dakar' }), 'trip');
  assert.equal(inferSharedJourneyTarget({ text: 'Rendez-vous le 12 juillet' }), 'agenda');
  assert.equal(inferSharedJourneyTarget({ text: 'Acheter du lait et du pain' }), 'groceries');
  assert.equal(inferSharedJourneyTarget({ text: '', fileTypes: ['image/jpeg photo.jpg'] }), 'memory');
  assert.equal(inferSharedJourneyTarget({ text: '', fileTypes: ['application/pdf attestation.pdf'] }), 'vault');
});

test('la destination imposée par un raccourci ne change pas', () => {
  assert.equal(inferSharedJourneyTarget({ forced: 'receipt', text: 'devoir de français' }), 'budget');
  assert.equal(inferSharedJourneyTarget({ forced: 'school', text: 'facture 20 €' }), 'homework');
});
