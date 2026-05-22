import OpenAI from 'openai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Translate this Japanese text to English and break down each word. Be concise.

Japanese: "${text}"

Respond in this exact JSON format:
{
  "translation": "English translation",
  "breakdown": [
    {
      "word": "Japanese word",
      "reading": "hiragana reading", 
      "meaning": "English meaning",
      "type": "part of speech"
    }
  ],
  "grammar": "Brief grammar notes"
}`;

    // Set SSE headers so the client can read chunks as they arrive
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Japanese translator. Respond only with valid JSON. Be concise.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.1,
      stream: true,
    });

    let accumulated = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        accumulated += delta;
        // Send each chunk as an SSE event
        res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
      }
    }

    // Send the fully accumulated text as the final event so the client can parse it
    res.write(`data: ${JSON.stringify({ done: true, full: accumulated })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
