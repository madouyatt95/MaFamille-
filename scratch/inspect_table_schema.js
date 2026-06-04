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
  // Let's run a query to get table columns using postgres RPC or any query if we can
  // Supabase REST API doesn't expose raw SQL directly unless we use an RPC, but we can query postgrest OpenAPI or check what columns are returned
  // Alternatively, we can try to insert a row with subcategories, is_active, and archived to see if it succeeds.
  // Wait, let's select columns using a query to /rest/v1/rpc if any, or check schema by fetching an empty select *
  const { data, error } = await supabase.from('custom_categories').select('*').limit(0);
  console.log('Columns metadata:', error ? error : 'success');
}
run();
