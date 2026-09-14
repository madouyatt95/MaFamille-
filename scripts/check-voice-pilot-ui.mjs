import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PILOT_TEST_URL || 'http://127.0.0.1:4183';
const out = new URL('../output/voice-pilot/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const failures = [];
try {
  for (const theme of ['dark', 'light', 'sepia']) {
    const context = await browser.newContext({ viewport: { width: theme === 'dark' ? 1280 : 390, height: 844 } });
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(error.message));
    const commits = [];
    let mode = 'ok';
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      if (url.pathname === '/src/services/voicePilotService.ts') return route.fulfill({ contentType: 'application/javascript', body: `
        export async function loadVoicePilot() {
          const response = await fetch('/__fixture/load'); if (!response.ok) throw new Error('Mode d’essai indisponible : migration requise.');
          return {scope:'test:foyer-test:parent-test',foyerId:'foyer-test',memberId:'parent-test',loadedAt:Date.now(),groceries:[],events:[{id:'rdv',title:'Dentiste',date_time:'2026-12-15',time:'10:00',done:false,member_id:null}],external:[]};
        }
        export async function commitVoicePilot(snapshot,id,action) { const r=await fetch('/__fixture/commit',{method:'POST',body:JSON.stringify({snapshot,id,action})}); if(!r.ok) throw new Error('La liste a changé. Actualisez avant de réessayer.'); }
      ` });
      if (url.pathname === '/src/utils/supabase.ts') return route.fulfill({ contentType: 'application/javascript', body: `export const getSupabaseClient=()=>({auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});` });
      if (url.pathname === '/__fixture/load') return route.fulfill({ status: mode === 'missing' ? 404 : 200, body: '{}' });
      if (url.pathname === '/__fixture/commit') { commits.push(route.request().postDataJSON()); return route.fulfill({ status: mode === 'conflict' ? 409 : 200, body: 'true' }); }
      return route.continue();
    });
    const open = async (phrase) => page.goto(`${base}/tests/fixtures/voice-pilot.html?theme=${theme}${phrase ? `&phrase=${encodeURIComponent(phrase)}` : ''}`);
    await open();
    await page.getByRole('button', { name: 'Confirmer la proposition', exact: true }).waitFor();
    assert.equal(commits.length, 0);
    assert.match(await page.getByRole('list', { name: 'Modifications proposées' }).innerText(), /fraise/);
    const box = await page.getByRole('dialog').boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= page.viewportSize().width + 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${out}${theme}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Confirmer la proposition', exact: true }).click();
    assert.equal(commits.length, 0);
    await page.getByRole('button', { name: 'Enregistrer dans mon foyer', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Enregistré dans votre foyer.' }).waitFor();
    assert.equal(commits.length, 1); assert.equal(commits[0].action.after.length, 2);
    assert.equal(commits[0].action.after[0].quantity, '1 pack de 6');
    mode = 'conflict'; await open('ajoute du lait');
    await page.getByRole('button', { name: 'Confirmer la proposition', exact: true }).click();
    await page.getByRole('button', { name: 'Enregistrer dans mon foyer', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'La liste a changé' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enregistrer dans mon foyer', exact: true }).count(), 0);
    const sent = commits.length;
    mode = 'ok'; await open('note 25 euros de courses');
    await page.getByRole('status').filter({ hasText: 'Budget habituel' }).waitFor();
    assert.equal(commits.length, sent);
    await open('décale le rendez-vous dentiste de trente minutes');
    await page.getByLabel('Rendez-vous à déplacer').selectOption('rdv');
    await page.getByLabel('Durée de Dentiste').fill('30');
    assert.match(await page.getByRole('dialog').innerText(), /10:00 → 10:30/);
    await page.getByRole('button', { name: 'Enregistrer dans mon foyer', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Enregistré dans votre foyer.' }).waitFor();
    assert.equal(commits.at(-1).action.kind, 'event'); assert.equal(commits.at(-1).action.time, '10:30');
    mode = 'missing'; await open();
    await page.getByRole('status').filter({ hasText: 'migration requise' }).waitFor();
    await page.getByRole('button', { name: 'Revenir au micro habituel', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('mf_voice_pilot_v1:test:foyer-test:parent-test')), null);
    await context.close();
  }
  assert.deepEqual(failures, []);
  console.log('UI OK: sombre/clair/sepia, desktop/mobile, confirmation en deux temps, erreur CAS, Budget sans ecriture, deplacement choisi, migration absente et desactivation. Reseau hors localhost bloque.');
} finally { await browser.close(); }
