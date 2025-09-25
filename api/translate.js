import OpenAI from 'openai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    // Initialize OpenAI with server-side API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Server-side environment variable
    });

    const prompt = `Please analyze this Japanese text and provide:
1. English translation
2. Word-by-word breakdown with readings (furigana) in parentheses
3. Grammar explanations for complex structures

Japanese text: "${text}"

Please format your response as JSON with the following structure:
{
  "translation": "English translation here",
  "breakdown": [
    {
      "word": "Japanese word",
      "reading": "hiragana reading",
      "meaning": "English meaning",
      "type": "part of speech"
    }
  ],
  "grammar": "Grammar explanations"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a Japanese language expert. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Return the parsed result
    res.status(200).json(result);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Return a generic error to avoid exposing internal details
    res.status(500).json({ 
      error: 'Failed to translate text. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
