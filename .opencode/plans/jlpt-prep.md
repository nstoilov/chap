# JLPT Prep Feature — Status & Plan

Last updated: build session in progress.

## Goal

Add a JLPT prep feature ("勉強" tab) to the chap app. Start page: JLPT level
dropdown (N5–N1, remembers previous choice), section selector (real JLPT
sections, no listening), number of questions (10/20/50), Start button. Exam
questions are generated with 4 answer options. At session end, write what the
user had difficulty with to local storage and append it to the next session's
generation prompt.

## Design decisions (confirmed by user)

- **Sections**: Vocabulary / Grammar / Reading (3 skill areas, no listening).
- **Question generation**: generate all N questions upfront in one SSE call.
- **Difficulty tracking**: store wrong-answer items + topic tags per
  level+section; inject most-frequent/recent weak topics into the next prompt.
- **Tab**: name "勉強", icon `book-open-outline` (focused `book`), color teal
  `#00897B`. Distinct from Home (orange `#F4A460`) / Favorites (pink
  `#E91E63`) / Game (purple `#9C27B0`).
- Cross-platform storage via AsyncStorage + web localStorage fallback (pattern
  from `favoritesService.js` / `gameService.js`).
- Serverless endpoint mirrors `api/translate.js` (Groq + SSE + `X-App-Key`
  guard). Shared SSE parser extracted into `src/services/sse.js` used by both
  openaiService and jlptApiService.

## Current state

### Done and verified
| File | Lines | Status |
|---|---|---|
| `src/config/api.js` | 30 | Added JLPT endpoint to ENDPOINTS |
| `src/services/sse.js` | 31 | Extracted isStreamingSupported + parseSSEBuffer(buffer, fallback); shared by translate + jlpt |
| `src/services/openaiService.js` | 84 | Refactored to import from ./sse; still exports translateWithBreakdown (HomeScreen import intact) |
| `src/services/jlptService.js` | 142 | Level persistence + difficulty tracking; getLevel/setLevel, recordSession, recordWrongItems (upsert by level+section+topic, cap 40), getDifficultyForPrompt, getWeakSummary |
| `src/services/jlptApiService.js` | 86 | generateJlptQuestions(...) with fetch+SSE and XHR fallback; normalizeJlpt validates 4 options + correctIndex |

### Not yet done
| File | Status |
|---|---|
| `api/jlpt.js` | DONE (166 lines). Serverless endpoint written with prompt builders, SSE, and validation. |
| `src/screens/JlptScreen.js` | DONE (~820 lines). menu/loading/playing/finished UI with teal theme. |
| `src/navigation/ResponsiveNavigation.js` | DONE. JLPT tab wired for mobile + desktop; sidebar translateY adjusted for 4 items. |

### Already cleaned up
- `README.md` stray error-log snippets reverted via `git checkout README.md`
  (Chunk A — complete).

## Question schema (uniform across sections)

    {
      "questions": [
        {
          "id": 1,
          "section": "vocabulary|grammar|reading",
          "type": "kanji_reading|hiragana_to_kanji|hiragana_to_katakana|vocabulary_context|similar_meaning|word_usage|grammar_selection|sentence_order|short_reading|medium_reading|information_search",
          "passage": "string or null (for reading only)",
          "prompt": "raw problem content in Japanese only (sentence, word, passage question)",
          "options": ["A","B","C","D"],
          "correctIndex": 0-3,
          "explanation": "short English sentence",
          "topic": "short tag e.g. kanji:読む / grammar:予定です / reading:detail",
          "difficulty": "easy|normal|challenging"
        }
      ]
    }

## Remaining chunks

### Chunk B — Write api/jlpt.js (serverless endpoint)
Mirror api/translate.js structure:
- OpenAI SDK import, GROQ models whitelist, SSE headers, CORS, X-App-Key
  guard, OPTIONS/POST handling.
- Validate level (N5-N1), section (vocabulary/grammar/reading),
  count (10/20/50).
- Three prompt builders: buildVocabularyPrompt, buildGrammarPrompt,
  buildReadingPrompt, each emitting the uniform question schema above.
- Inject difficulty string from client into the prompt.
- Groq stream loop writing SSE chunk events, final done event with full
  cleaned JSON.
- max_completion_tokens 16000, temperature 0.3; per-model reasoning_effort
  settings (qwen none, gpt-oss low, include_reasoning false).
- Strip reasoning blocks before final JSON event (same as translate.js).
- Verify: read back; confirm ~140 lines; ends with proper closing brace for
  the exported handler.

### Chunk C — Create src/screens/JlptScreen.js
State machine mirroring GameScreen.js:
- menu: header card "📚 勉強"; Level dropdown (Paper Menu+Button
  per ModelPicker.js), persists on change via jlptService.setLevel; Section
  segmented selector (Vocabulary/Grammar/Reading); session-size buttons
  10/20/50 (per GameScreen.js:164); teal Start button; "Focus areas from last
  sessions" hint from jlptService.getWeakSummary(level, section).
- loading: indeterminate teal ProgressBar with difficulty-injection note.
- playing: header card (counter + score + ProgressBar), question Card (show
  passage for reading), 4 TouchableOpacity options with correct/wrong styles
  (per GameScreen.js:218), explanation block after answer.
- finished: score, %, "Play Again" (to menu), "Review wrong answers" list.
  On entering finished: await jlptService.recordSession(...) and
  jlptService.recordWrongItems(...).
- useFocusEffect loads saved level + weak topics on focus.
- Teal #00897B accent throughout, #f5f5f5 background, Paper components.
- Verify: read back; confirm imports resolve; ~450 lines; no syntax errors.
  (No lint script exists in package.json.)

### Chunk D — Wire ResponsiveNavigation.js
- getIconName (line 15): add case 'JLPT' -> focused book / else
  book-open-outline.
- getIconColor (line 29): add teal #00897B when active and name === 'JLPT'.
- Mobile tabBarIcon (line 116): same teal for focused JLPT tab.
- Sidebar (line 56): add 4th SidebarItem name="JLPT".
- DesktopLayout.renderScreen (line 81): add case 'JLPT': return JlptScreen.
- MobileNavigator (line 134): add Tab.Screen name="JLPT" component=JlptScreen.
- Recompute sidebar transform translateY (currently -90 for 3 items at line
  171) — adjust for 4 items (centering).
- Import JlptScreen at top.
- Verify: read back; grep for JLPT/勉強 consistency; no orphan references.

### Chunk E — Final review
- Read all 8 changed/new files.
- Confirm imports resolve across modules.
- No lint/typecheck script exists in package.json — manual scan only.
- Optional: git diff --stat for overall footprint.

## Risks / trade-offs

- **Groq 8k TPM limit**: Fixed by batching into 10-question chunks with
  3000 max_completion_tokens per batch. Sequential batches avoid rate limits.
  50 questions = 5 calls, merged into one SSE response.
- **Question quality**: Prompts rewritten per comprehensive JLPT N4 spec
  (natural Japanese, plausible distractors, randomized correct answer position,
  specific sub-section types per section). Batching and token limits constrain
  how much example content fits per batch, but 3000 tokens per 10 questions
  is sufficient.
- **AI JSON validity**: Fence-stripping + try/catch fallback pattern used.
  On parse failure, client shows "Could not generate questions, try again"
  and returns to menu.
- **Rate limiting**: Both Groq models are free, so JLPT is effectively
  unlimited today. RateLimiter not enforced for JLPT.
- **Reading fidelity**: One-passage-one-question deviates slightly from real
  JLPT (multi-question passages) but keeps the UI uniform and count meaningful.

## Out of scope

- Listening section (excluded per request).
- Timed mode, per-question timer, history charts, streak tracking.
- Kanji drawing / audio.
