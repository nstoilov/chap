import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const OPENAI_MODELS = ['gpt-4.1-mini', 'gpt-4o-mini'];
const GOOGLE_MODELS = ['gemini-2.5-flash'];
const ALLOWED_MODELS = [...OPENAI_MODELS, ...GOOGLE_MODELS];

const SYSTEM_PROMPT = 'You are a Japanese language expert. Respond only with valid JSON. Be concise.';

const buildPrompt = (text) => `Translate this Japanese text to English and break down each word. Be concise.

Japanese: "${text}"

Rules for the breakdown:
- Include only meaningful words (nouns, verbs, adjectives, adverbs, particles, conjunctions).
- Do NOT include punctuation marks (。、！？… etc.) as breakdown items.

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

const buildEnToJpPrompt = (text) => `Translate this English text to Japanese. Provide a word breakdown with furigana readings.

English: "${text}"

Rules for the breakdown:
- Include only meaningful words (nouns, verbs, adjectives, adverbs, particles, conjunctions).
- Do NOT include punctuation as breakdown items.
- "reading" must be the hiragana/katakana reading of the Japanese word.
- "meaning" is the English meaning of that word.

Respond in this exact JSON format:
{
  "translation": "Japanese translation (kanji/kana)",
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
    const { text, model: requestedModel, direction } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'gpt-4.1-mini';
    const prompt = direction === 'en-jp' ? buildEnToJpPrompt(text) : buildPrompt(text);

    // Set SSE headers so the client can read chunks as they arrive
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let accumulated = '';

    if (GOOGLE_MODELS.includes(model)) {
      // --- Google Gemini ---
      if (!process.env.GEMINI_API_KEY) {
        res.write(`data: ${JSON.stringify({ error: 'Gemini API key not configured' })}\n\n`);
        return res.end();
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT });
      const streamResult = await geminiModel.generateContentStream(prompt);

      for await (const chunk of streamResult.stream) {
        const delta = chunk.text();
        if (delta) {
          accumulated += delta;
          res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
        }
      }
    } else {
      // --- OpenAI ---
      if (!process.env.OPENAI_API_KEY) {
        res.write(`data: ${JSON.stringify({ error: 'OpenAI API key not configured' })}\n\n`);
        return res.end();
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const stream = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.1,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          accumulated += delta;
          res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
        }
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
