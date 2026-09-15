import { evaluateAcceptance } from '../tests/evaluation/voiceAcceptance.ts';
const report = evaluateAcceptance();
console.log(JSON.stringify(report, null, 2));
if (report.passed !== report.cases || report.unexpectedConfirmations) process.exitCode = 1;
