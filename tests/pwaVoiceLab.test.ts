import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('le laboratoire est accessible directement sur le web, mais pas dans Capacitor', () => {
  const root = source('Root.tsx');
  assert.match(root, /isAiLabRoute\(\) && !Capacitor\.isNativePlatform\(\)/);
  assert.doesNotMatch(root, /hasAiLabAccess|sessionStorage|local-qwen/);
  assert.match(root, /lazy\(\(\) => import\('\.\/dev\/AiLab'\)/);
});

test('les reglages proposent un acces web uniquement et le masquent aussi dans la recherche native', () => {
  const settings = source('views/Settings.tsx');
  assert.match(settings, /!isNativeApp && \(\s*<a\s+id="settings-voice-lab"\s+href="\/ai-lab"/);
  assert.match(settings, /!isNativeApp \|\| item\.target !== 'settings-voice-lab'/);
  assert.doesNotMatch(settings, /import\(.*AiLab|parseHouseholdVoice|parseFamilyLabVoice/);
});

test('le retour du laboratoire reste dans l application meme depuis un lien direct', () => {
  const lab = source('dev/AiLab.tsx');
  assert.match(lab, /href="\/app"/);
  assert.doesNotMatch(lab, /history\.back|document\.referrer/);
  assert.match(lab, /Mode test/);
});

test('le micro principal ne bascule pas automatiquement sur les moteurs experimentaux', () => {
  const app = source('App.tsx');
  assert.doesNotMatch(app, /parseHouseholdVoice|parseFamilyLabVoice|HouseholdAssistantLab|VoiceBench/);
  assert.match(app, /parseSmartNaturalSentence\(text, activeMemberName\)/);
  assert.match(app, /await handleAddTransaction\(finalTx\)/);
});
