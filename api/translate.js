import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const OPENAI_MODELS = ['gpt-4.1-mini', 'gpt-4o-mini'];
const GOOGLE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
const GROQ_MODELS = ['llama-3.3-70b-versatile'];
const ALLOWED_MODELS = [...OPENAI_MODELS, ...GOOGLE_MODELS, ...GROQ_MODELS];
// Models that cost money — blocked server-side when ENABLE_PAID_MODELS env var is not 'true'
const PAID_MODELS = ['gpt-4.1-mini', 'gpt-4o-mini', 'gemini-2.5-pro'];

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

const buildGroqPrompt = (text) => `Translate this Japanese text to English and break down each word.

Japanese: "${text}"

CRITICAL rules — you MUST follow these exactly:
- "word" field: the original Japanese characters (kanji or kana). Example: 食べる, は, 私. NEVER use romaji here.
- "reading" field: hiragana or katakana ONLY. Example: たべる, は, わたし. NEVER use romaji (no "taberu", no "wa", no "watashi").
- "meaning" field: English meaning of that word.
- "type" field: part of speech in English (noun, verb, particle, etc.).
- Only include meaningful words. Skip punctuation.

Respond with ONLY this JSON, no extra text:
{
  "translation": "English translation of the full sentence",
  "breakdown": [
    {
      "word": "Japanese characters only",
      "reading": "hiragana/katakana only",
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

const buildGroqEnToJpPrompt = (text) => `Translate this English text to Japanese. Provide a word breakdown.

English: "${text}"

CRITICAL rules — you MUST follow these exactly:
- "translation" field: the full Japanese translation using kanji/kana.
- "word" field: Japanese characters (kanji or kana). NEVER use romaji here.
- "reading" field: hiragana or katakana ONLY. NEVER use romaji (no "anata", no "wa", etc.).
- "meaning" field: English meaning of that word.
- "type" field: part of speech in English.
- Only include meaningful words. Skip punctuation.

Respond with ONLY this JSON, no extra text:
{
  "translation": "Japanese translation in kanji/kana",
  "breakdown": [
    {
      "word": "Japanese characters only",
      "reading": "hiragana/katakana only",
      "meaning": "English meaning",
      "type": "part of speech"
    }
  ],
  "grammar": "Brief grammar notes"
}`;

export default async function handler(req, res) {
  const allowedOrigin = 'https://chap-nstoilovs-projects.vercel.app';
  const origin = req.headers.origin;

  // Lock CORS to our own domain (mobile apps don't send Origin, so they pass through)
  res.setHeader('Access-Control-Allow-Origin', origin === allowedOrigin ? allowedOrigin : '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify shared app secret — only enforced when APP_SECRET env var is configured
  const appKey = req.headers['x-app-key'];
  if (process.env.APP_SECRET && appKey !== process.env.APP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { text, model: requestedModel, direction } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    // Server-side length guard (client limit is 150, allow a small buffer)
    if (text.length > 500) {
      return res.status(400).json({ error: 'Text too long' });
    }

    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'gemini-2.5-flash';

    // Block paid models unless explicitly enabled via env var
    if (PAID_MODELS.includes(model) && process.env.ENABLE_PAID_MODELS !== 'true') {
      return res.status(403).json({ error: 'This model is not available.' });
    }

    const isGroq = GROQ_MODELS.includes(model);
    const prompt = direction === 'en-jp'
      ? (isGroq ? buildGroqEnToJpPrompt(text) : buildEnToJpPrompt(text))
      : (isGroq ? buildGroqPrompt(text) : buildPrompt(text));

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
      const geminiModel = genAI.getGenerativeModel({
        model,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const streamResult = await geminiModel.generateContentStream(prompt);

      for await (const chunk of streamResult.stream) {
        const delta = chunk.text();
        if (delta) {
          accumulated += delta;
          res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
        }
      }
    } else if (GROQ_MODELS.includes(model)) {
      // --- Groq (OpenAI-compatible) ---
      if (!process.env.GROK_API_KEY) {
        res.write(`data: ${JSON.stringify({ error: 'Groq API key not configured' })}\n\n`);
        return res.end();
      }

      const groq = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
      const groqStream = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.1,
        stream: true,
      });

      for await (const chunk of groqStream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
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
    console.log('[translate] accumulated:', accumulated);
    res.write(`data: ${JSON.stringify({ done: true, full: accumulated })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[translate]', error);
    res.write(`data: ${JSON.stringify({ error: 'Translation failed. Please try again.' })}\n\n`);
    res.end();
  }
}
