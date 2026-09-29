import OpenAI from 'openai';

const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
const ALLOWED_MODELS = [...GROQ_MODELS];

const buildSystemPrompt = (level) => `You are an expert JLPT ${level} test writer. Generate original, high-quality JLPT ${level} practice questions that closely reproduce real JLPT format, difficulty, and presentation style.

CRITICAL RULES:
- All question text, passages, and answer options MUST be in Japanese (kanji/hiragana/katakana only).
- NO English, NO romaji, NO hints inside questions or options.
- Only the "explanation" field may contain English.
- Generate NATURAL Japanese sentences that native speakers actually use.
- Use JLPT ${level}-level vocabulary and grammar. Do NOT use higher-level grammar or vocabulary than appropriate for ${level}.
- Every question must have exactly ONE correct answer and THREE PLAUSIBLE distractors.
- All 4 options MUST be DISTINCT. NEVER repeat the same word, phrase, or sentence twice — including trivial variations like extra spaces or full-width/half-width characters.
- Distractors must represent COMMON LEARNER MISTAKES, not absurd nonsense.
- Randomize correct answer position across 1/2/3/4. Do NOT always put the correct answer first.
- Do NOT include generic instruction sentences like "次の文の（　）に入れるのに最もよいものを、１・２・３・４から選びなさい。" in the prompt field. Output ONLY the raw problem content (the sentence, word, phrase, or passage being tested).
- Respond ONLY with valid JSON.

ACCURACY IS PARAMOUNT:
- For kanji reading questions, you MUST verify the correct reading is factually accurate. Common words have fixed readings — e.g., 休日 is きゅうじつ (or やすみび), NEVER きゅうび. 読む is よむ, NEVER のむ.
- For grammar questions, the correct option MUST be grammatically valid Japanese.
- The correctIndex you output MUST actually point to the correct option. Double-check before responding.
- If you are uncertain about a reading or answer, choose a different word or sentence that you are 100% confident about.`;

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const SECTIONS = ['vocabulary', 'grammar', 'reading'];
const COUNTS = [10, 20, 50];
const BATCH_SIZE = 10;
const MAX_COMPLETION_TOKENS_PER_BATCH = 3000;

const SCHEMA_HINT = `Respond with ONLY valid JSON matching this shape:
{
  "questions": [
    {
      "id": 1,
      "section": "<section id>",
      "type": "<question type>",
      "passage": <string for reading, otherwise null>,
      "prompt": "<raw problem content in Japanese only>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correctIndex": <0-3>,
      "explanation": "<short English sentence>",
      "topic": "<short tag>",
      "difficulty": "easy|normal|challenging"
    }
  ]
}`;

const difficultyBlock = (difficulty) => (difficulty ? `\n\nPrior weak points to address where natural:\n${difficulty}\n` : '');

const buildVocabularyPrompt = (level, count, difficulty, batchNum, totalBatches) => `Generate exactly ${count} original ${level} Vocabulary questions (文字・語彙). This is batch ${batchNum} of ${totalBatches}. All content in Japanese only. No instruction text.

Distribute "type" across ALL of these sub-sections:

1. kanji_reading — 漢字の読み方
   Format: A short Japanese sentence containing the target kanji word.
   "prompt": ONLY the sentence, with the target kanji characters wrapped in parentheses () to highlight them.
   "options": 4 hiragana readings. Distractors must be plausible misreadings (e.g., rendaku errors, similar-looking kanji readings, wrong on/kun readings).
   Example prompt: "毎朝、新聞を(読)みます。"
   Example options: ["よみます", "のみます", "よいます", "よびます"]

2. hiragana_to_kanji — 漢字の表記
   Format: A short Japanese sentence with a target word written in hiragana.
   "prompt": ONLY the sentence, with the target hiragana word wrapped in parentheses ().
   "options": 4 kanji writings with plausible similar-looking or similar-meaning distractors.
   Example prompt: "毎日、日本語を(べんきょう)しています。"
   Example options: ["勉教", "勉強", "免強", "免教"]

3. hiragana_to_katakana — カタカナの表記
   Format: A full Japanese sentence with a target loanword written in HIRAGANA.
   "prompt": ONLY the sentence, with the target hiragana loanword wrapped in parentheses ().
   CRITICAL: The word inside the parentheses MUST be written in hiragana (e.g., てれび, れすとらん, こーひー), NEVER in katakana. The question tests converting hiragana to katakana, so showing katakana in the sentence makes the question pointless.
   "options": 4 katakana writings. Distractors use common katakana confusions (ダ/タ, ピ/ビ, small-tsu errors).
   Use common N4 katakana: テレビ, レストラン, スーパー, ホテル, タクシー, シャツ, パーティー, コーヒー, スポーツ, コンピューター.
   Example prompt: "きのう、(てれび)を見ました。"
   Example options: ["テレビ", "テレピ", "デレビ", "デレピ"]

4. vocabulary_context — 文脈に合う言葉
   Format: A Japanese sentence with a blank shown as（　　）.
   "prompt": ONLY the sentence with the blank.
   "options": 4 Japanese words that could plausibly fit the context. Distractors should be contextually close but wrong (e.g., rain→umbrella vs. shoes vs. hat).
   Example prompt: "今日は雨ですから、（　　）を持って行きます。"
   Example options: ["かさ", "くつ", "ぼうし", "めがね"]

5. similar_meaning — 言い換え
   Format: A short Japanese phrase or sentence in quotes, testing synonymous expression.
   "prompt": ONLY the quoted phrase, with the key expression wrapped in parentheses ().
   "options": 4 Japanese sentences, one that expresses the SAME meaning as the prompt but with DIFFERENT wording. Distractors should change the meaning subtly.
   CRITICAL: The correct answer MUST NOT be nearly identical to the prompt. It must be a genuine rephrasing using different words or sentence structure.
   Example prompt: "「この電車は新宿へ行きます。」"
   Example options: ["この電車の行き先は新宿です。", "この電車は大阪へ行きます。", "新宿へはバスで行きます。", "この電車は新宿を通ります。"]
   Example correct answer: この電車の行き先は新宿です。(rephrases "行きます" as "行き先は...")

6. word_usage — 言葉の使い方
   Format: A Japanese word with a short task prefix.
   "prompt": The word wrapped in parentheses, prefixed with a brief Japanese phrase indicating the task: 「(word)」の使い方として最もよいものを一つ選びなさい。
   "options": 4 Japanese sentences using that word. Only one uses it correctly and naturally. Distractors should show common misuse patterns (wrong particles, wrong objects, transitive/intransitive confusion).
   Example prompt: "「(準備する)」の使い方として最もよいものを一つ選びなさい。"
   Example options: ["明日の旅行の準備をします。", "毎朝、会社を準備します。", "電車を準備して駅へ行きます。", "先生を準備して教室に入りました。"]

CRITICAL DISTRIBUTION RULES:
- Do NOT generate more than 2 vocabulary_context (blank fill) questions per batch of 10.
- You MUST include at least 1 question from every other type in each batch of 10.
- Spread types as evenly as possible.

Rules:
- "passage" is always null for vocabulary.
- "prompt" contains ONLY the raw problem content. NO instruction text, NO "次の...から選びなさい".
- "options" are 4 Japanese strings. NEVER English or romaji.
- All 4 options MUST be DISTINCT. Do NOT repeat the same answer or near-identical variations.
- "explanation" is one short English sentence.
- "topic" is a short tag (e.g., "kanji:読む", "katakana:テレビ", "usage:準備する").
- "difficulty" is "easy", "normal", or "challenging".
- "section" is always "vocabulary".
- Randomize correctIndex across 0/1/2/3. Do NOT bias toward any position.${difficultyBlock(difficulty)}

${SCHEMA_HINT}`;

const buildGrammarPrompt = (level, count, difficulty, batchNum, totalBatches) => `Generate exactly ${count} original ${level} Grammar questions (文法). This is batch ${batchNum} of ${totalBatches}. All content in Japanese only. No instruction text.

Distribute "type" across these sub-sections:

1. grammar_selection — 文法形式の判断
   Format: A Japanese sentence with a blank shown as（　　）.
   "prompt": ONLY the sentence with the blank.
   "options": 4 Japanese grammar forms, particles, or conjugations. Only one is correct.
   Test N4 grammar patterns such as: ～と思います, ～つもりです, ～予定です, ～なければなりません, ～なくてもいいです, ～たことがあります, ～たり～たりします, ～ながら, ～すぎます, ～やすい/にくい, ～そうです, ～でしょう, ～かもしれません, ～ほうがいいです, ～てみます, ～てしまいます, ～ようになります, potential form, から/ので, とき, まえに/あとで, まで/までに, なら, し, たり.
   Do NOT overuse one grammar point. Spread across multiple patterns.
   Distractors should be grammatically possible but WRONG in the given context.
   Example prompt: "来週、日本へ（　　）予定です。"
   Example options: ["行く", "行って", "行った", "行きます"]

2. sentence_order — 文の組み立て
   Format: A Japanese sentence with 4 positions shown as: ＿＿＿　＿＿＿　★　＿＿＿
   "prompt": ONLY the sentence structure with the ★ marker showing which position is being tested. Below the sentence, list the 4 parts that belong in the blanks.
   "options": The 4 numbered parts themselves (these are what the candidate chooses from to fill ★). The correctIndex is which part goes in ★.
   Make questions genuinely require understanding of Japanese sentence structure.
   Example prompt: "私は毎朝、コーヒーを\n＿＿＿　＿＿＿　★　＿＿＿。\n\n1. 飲んで\n2. 会社へ\n3. 行きます\n4. から"
   Example options: ["飲んで", "会社へ", "行きます", "から"]
   correctIndex: 0 (since 飲んで goes in ★, making: 私は毎朝、コーヒーを飲んで会社へ行きますから)

Rules:
- "passage" is always null for grammar.
- "prompt" contains ONLY the raw problem content. NO instruction text.
- "options" are 4 Japanese strings.
- All 4 options MUST be DISTINCT. Do NOT repeat the same answer or near-identical variations.
- "explanation" is one short English sentence.
- "topic" is a short tag (e.g., "grammar:予定です", "grammar:文の組み立て").
- "difficulty" is "easy", "normal", or "challenging".
- "section" is always "grammar".
- Randomize correctIndex across 0/1/2/3.${difficultyBlock(difficulty)}

${SCHEMA_HINT}`;

const buildReadingPrompt = (level, count, difficulty, batchNum, totalBatches) => `Generate exactly ${count} original ${level} Reading questions (読解). This is batch ${batchNum} of ${totalBatches}. All content in Japanese only. No instruction text.

Distribute "type" across these sub-sections:

1. short_reading — 内容理解（短文）
   Format: A short passage (1-3 sentences) in Japanese, followed by ONE question.
   "passage": The full Japanese passage.
   "prompt": ONLY the specific question in Japanese (just the question, no "文章を読んで..." instruction). Usually starts with "質問：".
   "options": 4 Japanese answers. Distractors should be plausible misreadings of the passage.
   Test: specific details, simple inference.
   Example passage: "私は毎朝7時に起きます。朝ご飯を食べてから、8時に家を出ます。会社まで電車で30分ぐらいかかります。"
   Example prompt: "質問：会社までどのくらいかかりますか。"
   Example options: ["20分", "30分", "40分", "1時間"]

2. medium_reading — 内容理解（中文章）
   Format: A medium passage (4-6 sentences) in Japanese, followed by ONE question.
   "passage": The full Japanese passage.
   "prompt": ONLY the specific question. Tests: main point, reason, sequence, comparison, conclusion.
   Example passage: "先週、私は新しい自転車を買いました。前の自転車は古くなって、よく壊れたからです。新しい自転車は前のより少し高かったですが、とても乗りやすいです。毎朝、駅まで自転車で行っています。"
   Example prompt: "質問：どうして新しい自転車を買いましたか。"
   Example options: ["駅まで遠かったから", "前の自転車が古かったから", "新しい自転車が安かったから", "自転車に乗るのが嫌だったから"]

3. information_search — 情報検索
   Format: A table, schedule, advertisement, notice, or menu in Japanese. Followed by ONE question.
   "passage": The full information text (formatted naturally, e.g., with line breaks).
   "prompt": ONLY the specific question asking about the information.
   Use realistic everyday information: schedules, opening hours, event announcements, menus, timetables, store notices.
   Example passage: "市民体育館のお知らせ\n\n月曜日　休み\n火曜日～金曜日　9:00～20:00\n土曜日　9:00～18:00\n日曜日　10:00～16:00\n\nプールは毎週水曜日に掃除します。その日はプールを使うことができません。"
   Example prompt: "質問：水曜日の午後7時に、プールを使うことができますか。"
   Example options: ["はい、使うことができます。", "いいえ、体育館が休みだからです。", "いいえ、プールを掃除するからです。", "いいえ、午後6時までだからです。"]

Rules:
- "passage" is a non-empty Japanese string with the full text.
- "prompt" contains ONLY the raw Japanese question. NO instruction text like "文章を読んで...".
- "options" are 4 Japanese strings.
- All 4 options MUST be DISTINCT. Do NOT repeat the same answer or near-identical variations.
- "explanation" is one short English sentence.
- "topic" is a short tag (e.g., "reading:detail", "reading:information").
- "difficulty" is "easy", "normal", or "challenging".
- "section" is always "reading".
- Randomize correctIndex across 0/1/2/3.${difficultyBlock(difficulty)}

${SCHEMA_HINT}`;

const buildPrompt = (section, level, count, difficulty, batchNum, totalBatches) => {
  if (section === 'vocabulary') return buildVocabularyPrompt(level, count, difficulty, batchNum, totalBatches);
  if (section === 'grammar') return buildGrammarPrompt(level, count, difficulty, batchNum, totalBatches);
  return buildReadingPrompt(level, count, difficulty, batchNum, totalBatches);
};

const normText = (s) => String(s ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');

const hasDistinctOptions = (q) => {
  const seen = new Set();
  for (const option of q.options) {
    const key = normText(option);
    if (!key || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
};

const questionKey = (q) => `${normText(q.prompt)}|${q.options.map(normText).sort().join('|')}`;

const parseQuestions = (text) => {
  const cleaned = text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  const fenceStripped = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(fenceStripped);
  const arr = Array.isArray(parsed) ? parsed : (parsed && (parsed.questions || parsed.data));
  if (!Array.isArray(arr)) throw new Error('Invalid response structure');
  return arr.filter(q => q && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4 && hasDistinctOptions(q));
};

const callGroqBatch = async (groq, model, section, level, batchSize, difficulty, batchNum, totalBatches) => {
  const prompt = buildPrompt(section, level, batchSize, batchNum === 1 ? difficulty : '', batchNum, totalBatches);

  const groqBody = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(level) },
      { role: 'user', content: prompt },
    ],
    max_completion_tokens: MAX_COMPLETION_TOKENS_PER_BATCH,
    temperature: 0.8,
    stream: true,
  };

  if (model === 'qwen/qwen3.8-27b') {
    groqBody.reasoning_effort = 'none';
  } else if (model === 'openai/gpt-oss-120b') {
    groqBody.reasoning_effort = 'low';
    groqBody.include_reasoning = false;
  }

  const stream = await groq.chat.completions.create(groqBody);
  let accumulated = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) accumulated += delta;
  }
  return parseQuestions(accumulated);
};

export default async function handler(req, res) {
  const allowedOrigin = 'https://chap-nstoilovs-projects.vercel.app';
  const origin = req.headers.origin;

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

  const appKey = req.headers['x-app-key'];
  if (process.env.APP_SECRET && appKey !== process.env.APP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { level, section, count, difficulty, model: requestedModel } = req.body;

    if (!LEVELS.includes(level)) {
      return res.status(400).json({ error: 'Invalid level' });
    }
    if (!SECTIONS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    const qCount = Number(count);
    if (!COUNTS.includes(qCount)) {
      return res.status(400).json({ error: 'Invalid count' });
    }

    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'qwen/qwen3.8-27b';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!process.env.GROK_API_KEY) {
      res.write(`data: ${JSON.stringify({ error: 'Groq API key not configured' })}\n\n`);
      return res.end();
    }

    const groq = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

    const totalBatches = Math.ceil(qCount / BATCH_SIZE);
    const maxBatches = totalBatches + 2;
    const allQuestions = [];
    const seenQuestions = new Set();
    let batchNum = 0;

    while (allQuestions.length < qCount && batchNum < maxBatches) {
      batchNum += 1;
      const batchSize = Math.min(BATCH_SIZE, qCount - allQuestions.length);

      res.write(`data: ${JSON.stringify({ chunk: '', progress: { current: batchNum, total: maxBatches } })}\n\n`);

      const questions = await callGroqBatch(groq, model, section, level, batchSize, difficulty || '', batchNum, maxBatches);

      if (questions.length === 0) {
        throw new Error(`Batch ${batchNum} returned no valid questions.`);
      }

      for (const question of questions) {
        if (allQuestions.length >= qCount) break;
        const key = questionKey(question);
        if (seenQuestions.has(key)) continue;
        seenQuestions.add(key);
        allQuestions.push(question);
      }
    }

    // Renumber IDs sequentially across all batches
    const merged = { questions: allQuestions.slice(0, qCount).map((q, idx) => ({ ...q, id: idx + 1 })) };
    const finalJson = JSON.stringify(merged);

    res.write(`data: ${JSON.stringify({ done: true, full: finalJson })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[jlpt]', error);
    res.write(`data: ${JSON.stringify({ error: 'Could not generate questions. Please try again.' })}\n\n`);
    res.end();
  }
}
