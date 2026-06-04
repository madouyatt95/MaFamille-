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
  const tempFoyerId = 'b06cc977-013d-40e0-a44d-a4d750d43e90'; // Use a valid or dummy uuid
  // We can try to insert a custom category
  console.log('Testing insert with subcategories...');
  const { data, error } = await supabase.from('custom_categories').insert({
    id: 'test-cat-123',
    foyer_id: tempFoyerId,
    name: 'Test Cat',
    icon: '🚀',
    color: '#000000',
    budget: 100,
    display_order: 1,
    subcategories: '["Sub1", "Sub2"]'
  }).select();
  console.log('Insert result:', data, 'Error:', error);
}
run();
