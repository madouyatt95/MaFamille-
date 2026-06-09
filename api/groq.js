import { requirePremiumAiQuota } from './_aiAccess.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Foyer-Id');
  res.setHeader('Access-Control-Expose-Headers', 'X-AI-Quota-Remaining, X-AI-Quota-Limit');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model, temperature } = req.body;
    const quota = await requirePremiumAiQuota(req, res);
    if (!quota) return;
    
    // 1. Déterminer la clé API Groq
    const groqKey = process.env.GROQ_API_KEY || '';

    if (!groqKey) {
      return res.status(400).json({ error: 'Missing Groq API Key. Configure GROQ_API_KEY on Vercel or pass it via Authorization header.' });
    }

    // 2. Transmettre l'appel à Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: model || 'llama-3.1-8b-instant',
        messages,
        temperature: temperature !== undefined ? temperature : 0.7
      })
    });

    const data = await response.json();
    res.setHeader('X-AI-Quota-Remaining', String(quota.remaining ?? 0));
    res.setHeader('X-AI-Quota-Limit', String(quota.limit ?? 10));
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
