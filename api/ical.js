export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(String(url).trim().replace(/^webcal:\/\//i, 'https://'));
  } catch {
    return res.status(400).json({ error: 'Invalid calendar url' });
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return res.status(400).json({ error: 'Only http(s) calendar urls are allowed' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'text/calendar,text/plain,*/*'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    if (data.length > 2_000_000) {
      return res.status(413).json({ error: 'Calendar file is too large' });
    }
    if (!data.includes('BEGIN:VCALENDAR')) {
      return res.status(422).json({ error: 'The url does not point to a valid ICS calendar' });
    }

    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
