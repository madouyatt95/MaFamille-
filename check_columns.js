import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1].trim()] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: foyers, error: foyerErr } = await supabase.from('foyers').select('*');
  console.log('--- FOYERS ---', foyers, 'error:', foyerErr);

  const { data: members, error: memberErr } = await supabase.from('foyer_members').select('*');
  console.log('--- FOYER_MEMBERS ---', members, 'error:', memberErr);
}
run();
