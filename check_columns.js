import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('foyer_members').select('*').limit(1);
  if (error) {
    console.error('Error fetching foyer_members:', error);
  } else {
    console.log('Columns in foyer_members:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
  }
}
run();
