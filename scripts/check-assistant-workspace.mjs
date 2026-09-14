import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Run against an isolated PostgreSQL engine; never connects to the real household.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const uid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const actor = async n => db.exec(`SELECT set_config('request.jwt.claim.sub', '${uid(n)}', false); SET ROLE authenticated;`);
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
  CREATE TABLE public.foyers (id uuid PRIMARY KEY);
  CREATE TABLE public.foyer_members (id uuid PRIMARY KEY, foyer_id uuid REFERENCES public.foyers, user_id uuid, display_name text, role text, approved boolean, joined_at timestamptz DEFAULT now());
  GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
  GRANT SELECT ON public.foyer_members TO authenticated;
  INSERT INTO public.foyers VALUES ('${uid(1)}'), ('${uid(2)}');
  INSERT INTO public.foyer_members(id,foyer_id,user_id,role,approved) VALUES
    ('${uid(11)}','${uid(1)}','${uid(101)}','parent',true),
    ('${uid(12)}','${uid(1)}','${uid(102)}','parent',true),
    ('${uid(13)}','${uid(1)}','${uid(103)}','child',true),
    ('${uid(14)}','${uid(1)}','${uid(104)}','child',false),
    ('${uid(21)}','${uid(2)}','${uid(201)}','admin',true);
`);
const migration = await readFile(new URL('../supabase/migrations/20260905001000_assistant_workspace.sql', import.meta.url), 'utf8');
await db.exec(migration);
await db.exec(migration);
const save = async (id, audience = 'personal', revision = 0, kind = 'memory', payload = { kind: 'shortcut', trigger: 'Mon programme', meaning: 'Quels rendez-vous demain ?' }) => (await db.query('SELECT public.save_assistant_workspace_record($1,$2,$3,$4,$5,$6,$7) AS record', [uid(1), uid(id), kind, 'Mon programme', audience, JSON.stringify(payload), revision])).rows[0].record;
const remove = (id, revision) => db.query('SELECT public.delete_assistant_workspace_record($1,$2,$3)', [uid(1), uid(id), revision]);
const visible = async () => (await db.query('SELECT id FROM public.assistant_workspace_records')).rows.map(row => row.id).sort();
try {
  await actor(101);
  const personal = await save(501); assert.equal(personal.revision, 1);
  const shared = await save(502, 'family'); assert.equal(shared.owner_member_id, uid(11));
  const edited = await save(501, 'personal', 1); assert.equal(edited.revision, 2);
  await assert.rejects(save(501, 'personal', 1), /revision/);
  await assert.rejects(remove(501, 1), /revision/);
  await actor(102); assert.deepEqual(await visible(), [uid(502)]);
  await assert.rejects(save(501, 'personal', 2), /forbidden/);
  await assert.rejects(remove(501, 2), /forbidden/);
  await assert.rejects(save(502, 'personal', 1), /forbidden/);
  assert.equal((await save(502, 'family', 1)).owner_member_id, uid(11));
  await actor(103); assert.deepEqual(await visible(), [uid(502)]);
  await assert.rejects(save(503, 'family'), /forbidden/);
  await assert.rejects(save(502, 'family', 2), /forbidden/);
  await save(503); assert.deepEqual(await visible(), [uid(502), uid(503)]);
  await assert.rejects(db.query('DELETE FROM public.assistant_workspace_records'), /permission denied/);
  await actor(104); assert.deepEqual(await visible(), []); await assert.rejects(save(504), /forbidden/);
  await actor(201); assert.deepEqual(await visible(), []); await assert.rejects(save(505), /forbidden/);
  await db.exec('SET ROLE anon'); await assert.rejects(save(505), /permission denied/);
  await actor(101);
  await assert.rejects(save(506, 'personal', null), /revision/);
  await assert.rejects(save(506, 'personal', 0, 'memory', {}), /invalid memory/);
  await assert.rejects(save(506, 'personal', 0, 'memory', { kind: 'preference', trigger: 'x'.repeat(81), meaning: 'pas de poisson' }), /invalid memory/);
  await assert.rejects(save(506, 'personal', 0, 'day', { excess: 'x'.repeat(21000) }), /invalid record/);
  await remove(501, 2); assert.deepEqual(await visible(), [uid(502)]);
  await db.exec('RESET ROLE');
  await db.exec(`INSERT INTO public.assistant_workspace_records(id,foyer_id,owner_member_id,kind,title,audience,payload) SELECT gen_random_uuid(),'${uid(1)}','${uid(11)}','memory','Test limite','personal','{}' FROM generate_series(1,148);`);
  await actor(101); await assert.rejects(save(506), /workspace limit/);
  console.log('SQL OK: migration idempotente, RLS parents/enfants/autre foyer/anon, CAS, suppression, limites et taille.');
} finally { await db.close(); }
