import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function run() {
  console.log('--- FETCHING ALL FOYERS ---');
  const { data: foyers, error: foyersErr } = await supabase.from('foyers').select('*');
  if (foyersErr) {
    console.error('Error fetching foyers:', foyersErr);
  } else {
    console.log(foyers);
  }

  console.log('\n--- FETCHING ALL FOYER MEMBERS ---');
  const { data: members, error: membersErr } = await supabase.from('foyer_members').select('*');
  if (membersErr) {
    console.error('Error fetching members:', membersErr);
  } else {
    console.log(members);
  }
}

run().catch(console.error);
