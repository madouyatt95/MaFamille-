import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAcceptance } from './evaluation/voiceAcceptance.ts';

test('corpus conversationnel separe : sens, quantites, questions et confirmations', () => {
  const report = evaluateAcceptance();
  assert.deepEqual(report.failures, []);
  assert.equal(report.unexpectedConfirmations, 0);
});
