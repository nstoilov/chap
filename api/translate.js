import OpenAI from 'openai';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
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

    // Initialize OpenAI with server-side API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster and cheaper model
      messages: [
        {
          role: "system",
          content: "You are a Japanese translator. Respond only with valid JSON. Be concise."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800, // Reduced for faster responses
      temperature: 0.1 // Lower for more consistent, faster responses
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      // Fallback response
      result = {
        translation: response.choices[0].message.content,
        breakdown: [],
        grammar: "Unable to parse structured response"
      };
    }
    
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to translate text',
      message: error.message,
    });
  }
}
