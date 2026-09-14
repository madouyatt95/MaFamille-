import { readFile } from 'node:fs/promises';
import { validFeedback, replayFeedback } from '../src/ai/local/parserFeedback.ts';
const path = process.argv[2];
if (!path) throw new Error('Usage: node --experimental-strip-types scripts/replay-parser-feedback.mjs chemin/export.json');
const cases = JSON.parse(await readFile(path, 'utf8'));
if (!Array.isArray(cases) || cases.length > 50 || !cases.every(validFeedback)) throw new Error('Export invalide.');
let failed = 0;
for (const [index, row] of cases.entries()) {
  const result = replayFeedback(row);
  if (!result.passed) failed++;
  console.log(`Cas ${index + 1}: ${result.passed ? 'OK' : 'ECHEC'} (${result.status})`);
}
console.log(`${cases.length - failed}/${cases.length} cas conformes. Aucune ecriture ni transmission.`);
process.exitCode = failed ? 1 : 0;
