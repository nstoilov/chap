import OpenAI from 'openai';

// Replace this with your actual API key
const OPENAI_API_KEY = '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';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const translateWithBreakdown = async (japaneseText) => {
  try {
    const prompt = `Please analyze this Japanese text and provide:
1. English translation
2. Word-by-word breakdown with readings (furigana) in parentheses
3. Grammar explanations for complex structures

Japanese text: "${japaneseText}"

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
    return result;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to translate text. Please check your API key and try again.');
  }
};
