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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Checking exports_history table...");
  const { data: expData, error: expError } = await supabase.from('exports_history').select('*').limit(1);
  if (expError) {
    console.error("exports_history check error:", expError.message, expError);
  } else {
    console.log("exports_history exists! Sample:", expData);
  }

  console.log("Checking imports_history table...");
  const { data: impData, error: impError } = await supabase.from('imports_history').select('*').limit(1);
  if (impError) {
    console.error("imports_history check error:", impError.message, impError);
  } else {
    console.log("imports_history exists! Sample:", impData);
  }

  console.log("Checking storage bucket 'finance-exports'...");
  const { data: buckData, error: buckError } = await supabase.storage.getBucket('finance-exports');
  if (buckError) {
    console.error("finance-exports bucket check error:", buckError.message, buckError);
  } else {
    console.log("finance-exports bucket exists! Details:", buckData);
  }
}

run().catch(console.error);
