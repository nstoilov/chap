import OpenAI from 'openai';

// This will now be handled by the serverless function
export const translateWithBreakdown = async (japaneseText) => {
  try {
    // Call our serverless function instead of OpenAI directly
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: japaneseText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Translation API Error:', error);
    throw new Error('Failed to translate text. Please try again.');
  }
};
