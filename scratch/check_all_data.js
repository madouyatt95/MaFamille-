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

const tables = [
  'foyers',
  'foyer_members',
  'events',
  'transactions',
  'saving_goals',
  'alerts',
  'memories',
  'votes',
  'school_tasks',
  'chat_groups',
  'chat_messages',
  'demarches'
];

async function run() {
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(5);
    if (error) {
      console.error(`Error on ${table}:`, error.message);
    } else {
      console.log(`Table ${table} has ${data.length} sample rows:`, data);
    }
  }
}

run().catch(console.error);
