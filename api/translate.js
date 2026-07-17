import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const OPENAI_MODELS = [];
const GOOGLE_MODELS = ['gemini-3.5-flash'];
const GROQ_MODELS = ['meta-llama/llama-4-scout-17b-16e-instruct'];
const ALLOWED_MODELS = [...OPENAI_MODELS, ...GOOGLE_MODELS, ...GROQ_MODELS];
// Models that cost money — blocked server-side when ENABLE_PAID_MODELS env var is not 'true'
const PAID_MODELS = [];

const SYSTEM_PROMPT = 'You are a Japanese language expert. Respond only with valid JSON. Be concise.';

const isSingleWord = (text) => {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.includes(' ')) return false;
  if (/[。、！？….,!?;:]/.test(trimmed)) return false;
  return trimmed.length <= 6;
};

const compoundInstruction = (text, direction) => {
  if (!isSingleWord(text)) return '';
  return direction === 'en-jp'
    ? `\n- The input "${text}" is a single word. If its Japanese translation is a compound word (multiple kanji/components), break it into each component: include one breakdown entry per component with its reading and meaning, plus one entry for the full compound word with its overall meaning.`
    : `\n- The input "${text}" is a single word. If it is a compound word (multiple kanji/components), break it into each component: include one breakdown entry per component with its reading and meaning, plus one entry for the full compound word with its overall meaning.`;
};

const buildPrompt = (text) => `Translate this Japanese text to English and break down each word. Be concise.

Japanese: "${text}"

Rules for the breakdown:
- Include only meaningful words (nouns, verbs, adjectives, adverbs, particles, conjunctions).
- Do NOT include punctuation marks (。、！？…,，、· etc.) as breakdown items. If a token is punctuation only, skip it entirely.
- "reading" must be hiragana only (e.g. たべる、わたし、は). Never use katakana or romaji for the reading of native Japanese words.
${compoundInstruction(text, 'jp-en')}

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

const buildGroqPrompt = (text) => `You are a Japanese translator. Translate the Japanese text to English, then break down each Japanese word.

Japanese: "${text}"

Here is an example of correct output for Japanese: "私は猫が好きです"
{
  "translation": "I like cats",
  "breakdown": [
    { "word": "私", "reading": "わたし", "meaning": "I", "type": "pronoun" },
    { "word": "は", "reading": "は", "meaning": "topic marker", "type": "particle" },
    { "word": "猫", "reading": "ねこ", "meaning": "cat", "type": "noun" },
    { "word": "が", "reading": "が", "meaning": "subject marker", "type": "particle" },
    { "word": "好き", "reading": "すき", "meaning": "like", "type": "adjective" }
  ],
  "grammar": "は marks the topic, が marks the subject of 好き"
}

Now do the same for: "${text}"
- "word": the original Japanese word (kanji/kana, never romaji)
- "reading": hiragana/katakana pronunciation (never romaji)
- "meaning": English meaning of that word
- "type": part of speech
- Keep conjugated verbs together as one entry (e.g. 行きました as one word, not split into 行き + まし + た)
- Skip punctuation marks
${compoundInstruction(text, 'jp-en')}

Respond with ONLY valid JSON, no other text.`;

const buildEnToJpPrompt = (text, formality) => `Translate this English text to Japanese. Provide a word breakdown with furigana readings.

English: "${text}"

${formality === 'casual'
  ? 'Use casual/plain form (だ / dictionary verb form, plain い-adjectives, じゃ instead of ではない where natural). Do NOT use です・ます.'
  : 'Use polite form (です・ます form, polite い-adjectives, ではありません/じゃありません for negative).'}

Rules for the breakdown:
- Include only meaningful words (nouns, verbs, adjectives, adverbs, particles, conjunctions).
- Do NOT include punctuation as breakdown items (。、！？…,，、· etc.). If a token is punctuation only, skip it entirely.
- Keep conjugated verbs together as one entry (e.g. 行きました as one word, not split into 行き + まし + た).
- "reading" must be hiragana only (e.g. たべる、わたし、は). Never use katakana or romaji for the reading of native Japanese words.
- "meaning" is the English meaning of that word.
${compoundInstruction(text, 'en-jp')}

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

const buildGroqEnToJpPrompt = (text, formality) => `You are a Japanese translator. Translate the English text to Japanese, then break down the Japanese translation word by word.

English: "${text}"

${formality === 'casual'
  ? 'Use casual/plain form (だ / dictionary verb form, plain い-adjectives, じゃ instead of ではない where natural). Do NOT use です・ます.'
  : 'Use polite form (です・ます form, polite い-adjectives, ではありません/じゃありません for negative).'}

Here is an example of correct output for English: "I like cats"
{
  "translation": "私は猫が好きです",
  "breakdown": [
    { "word": "私", "reading": "わたし", "meaning": "I", "type": "pronoun" },
    { "word": "は", "reading": "は", "meaning": "topic marker", "type": "particle" },
    { "word": "猫", "reading": "ねこ", "meaning": "cat", "type": "noun" },
    { "word": "が", "reading": "が", "meaning": "subject marker", "type": "particle" },
    { "word": "好き", "reading": "すき", "meaning": "like", "type": "adjective" }
  ],
  "grammar": "は marks the topic, が marks the subject of 好き"
}

Now do the same for: "${text}"
- "translation": the full Japanese sentence in kanji/kana
- "word": the Japanese word from the translation (kanji/kana, never romaji)
- "reading": hiragana/katakana pronunciation (never romaji)
- "meaning": English meaning of that Japanese word
- "type": part of speech
- Keep conjugated verbs together as one entry (e.g. 行きました as one word, not split into 行き + まし + た)
${compoundInstruction(text, 'en-jp')}

Respond with ONLY valid JSON, no other text.`;

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
    const { text, model: requestedModel, direction, formality } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text parameter' });
    }

    // Server-side length guard (client limit is 150, allow a small buffer)
    if (text.length > 500) {
      return res.status(400).json({ error: 'Text too long' });
    }

    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'gemini-3.5-flash';

    // Block paid models unless explicitly enabled via env var
    if (PAID_MODELS.includes(model) && process.env.ENABLE_PAID_MODELS !== 'true') {
      return res.status(403).json({ error: 'This model is not available.' });
    }

    const isGroq = GROQ_MODELS.includes(model);
    const prompt = direction === 'en-jp'
      ? (isGroq ? buildGroqEnToJpPrompt(text, formality) : buildEnToJpPrompt(text, formality))
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
    res.write(`data: ${JSON.stringify({ done: true, full: accumulated })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[translate]', error);
    res.write(`data: ${JSON.stringify({ error: 'Translation failed. Please try again.' })}\n\n`);
    res.end();
  }
}
