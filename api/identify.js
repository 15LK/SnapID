// Vercel Serverless Function — SnapID /api/identify
// Nahrazuje Railway backend (snapid-backend-production-0846.up.railway.app)
// Env var potřebný v Vercel Dashboard: ANTHROPIC_API_KEY

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mediaType } = req.body;
  if (!image || !mediaType) {
    return res.status(400).json({ error: 'Both image and mediaType are required.' });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'You are an expert identifier. Analyze this image and respond ONLY with JSON: {"name":"...","confidence":"95%","category":"...","estimated_value":"...","origin_period":"...","rarity":"...","description":"..."}' },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errorBody}` });
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text || '';
    const text = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
