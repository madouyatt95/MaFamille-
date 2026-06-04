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
  const foyerId = 'b06cc977-013d-40e0-a44d-a4d750d43e90';
  const testTxId = `test-tx-${Date.now()}`;

  const payload = {
    id: testTxId,
    foyer_id: foyerId,
    amount: 10,
    type: 'expense',
    category: 'Test',
    date: '2026-06-03',
    title: 'Test standard column insert',
    member_id: '1',
    member_name: 'Test Member',
    sub_category: 'Sub',
    account_id: 'acc-1',
    receipt_base64: 'base64str',
    attachment_base64: 'base64str',
    comment: 'Test comment',
    modification_history: JSON.stringify([]),
    is_archived: false,
    recurrence: 'none',
    subscription_id: 'sub-1'
  };

  const { data, error } = await supabase.from('transactions').insert(payload).select();
  if (error) {
    console.log('Error inserting with standard columns:', error);
  } else {
    console.log('Insert succeeded with standard columns! Row data:', data);
    // Cleanup
    await supabase.from('transactions').delete().eq('id', testTxId);
  }
}

run().catch(console.error);
