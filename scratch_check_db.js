import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually since dotenv might not be installed
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Test update on a known grocery item
  const testId = 'gr-1779469281707';
  const foyerId = 'b06cc977-013d-40e0-a44d-a4d750d43e90';

  console.log('\n--- 1. Current State in DB ---');
  const { data: initial, error: err1 } = await supabase
    .from('groceries')
    .select('*')
    .eq('id', testId)
    .eq('foyer_id', foyerId);
  console.log('Initial select:', initial, 'error:', err1);

  console.log('\n--- 2. Updating checked=true ---');
  const { data: updateRes, error: err2 } = await supabase
    .from('groceries')
    .update({ checked: true, in_stock: true })
    .eq('id', testId)
    .eq('foyer_id', foyerId)
    .select();
  console.log('Update result:', updateRes, 'error:', err2);

  console.log('\n--- 3. Verifying immediately ---');
  const { data: verify, error: err3 } = await supabase
    .from('groceries')
    .select('*')
    .eq('id', testId)
    .eq('foyer_id', foyerId);
  console.log('Verify select:', verify, 'error:', err3);
}

check().catch(console.error);
