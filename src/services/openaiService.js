import OpenAI from 'openai';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE = 'openai_api_key';

export const translateWithBreakdown = async (japaneseText) => {
  // Get API key from storage
  const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE);
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please configure your API key in settings.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });
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
