import { requirePremiumAiQuota, setAiQuotaHeaders } from './_aiAccess.js';

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
    const geminiKey = process.env.GEMINI_API_KEY || '';

    if (!geminiKey) {
      return res.status(503).json({ error: 'gemini_api_key_missing' });
    }

    const quota = await requirePremiumAiQuota(req, res);
    if (!quota) return;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    setAiQuotaHeaders(res, quota);
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
