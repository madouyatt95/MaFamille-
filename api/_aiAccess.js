import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ravkssbaxcfhnzsemfrh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdmtzc2JheGNmaG56c2VtZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjE0MjQsImV4cCI6MjA5NjQzNzQyNH0.huIqaed9K0iD7fQaxdS89Tpl2HJ4vynvClyqvEjRm6o';
const DAILY_LIMIT = 10;

export async function requirePremiumAiQuota(req, res) {
  const authHeader = req.headers.authorization || '';
  const foyerId = req.headers['x-foyer-id'] || req.body?.foyerId;

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'AI real access requires an authenticated premium session.' });
    return null;
  }

  if (!foyerId) {
    res.status(400).json({ error: 'Missing foyer id for AI quota.' });
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const { data, error } = await supabase.rpc('consume_ai_quota_for_foyer', {
    p_foyer_id: foyerId,
    p_limit: DAILY_LIMIT
  });

  if (error) {
    res.status(500).json({ error: `AI quota check failed: ${error.message}` });
    return null;
  }

  if (!data?.allowed) {
    const status = data?.reason === 'quota_exhausted' ? 429 : 402;
    res.status(status).json({
      error: data?.reason || 'ai_access_denied',
      quota: data || { allowed: false, remaining: 0, limit: DAILY_LIMIT }
    });
    return null;
  }

  return data;
}

