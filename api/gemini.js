export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Déterminer la clé API
    // D'abord on vérifie l'en-tête Authorization du client (pour compatibilité locale / dev)
    let geminiKey = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      geminiKey = authHeader.substring(7);
    }
    
    // Si aucune clé client n'est passée, on utilise la clé privée stockée côté serveur
    if (!geminiKey) {
      geminiKey = process.env.GEMINI_API_KEY || '';
    }

    if (!geminiKey) {
      return res.status(400).json({ error: 'Missing Gemini API Key. Configure GEMINI_API_KEY on Vercel or pass it via Authorization header.' });
    }

    // 2. Transmettre l'appel à l'API Google Gemini officielle
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
