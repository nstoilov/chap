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
    console.log('Request body:', req.body);
    console.log('API Key exists:', !!process.env.OPENAI_API_KEY);

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      console.log('Invalid text parameter:', text);
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize OpenAI with server-side API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('Making OpenAI request for text:', text.substring(0, 50) + '...');

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

    console.log('OpenAI response received');

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw response:', response.choices[0].message.content);
      // Fallback response
      result = {
        translation: response.choices[0].message.content,
        breakdown: [],
        grammar: "Unable to parse structured response"
      };
    }
    
    console.log('Sending successful response');
    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error stack:', error.stack);
    
    // Return detailed error for debugging
    return res.status(500).json({ 
      error: 'Failed to translate text',
      message: error.message,
      type: error.constructor.name,
      // Include more details in development
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
