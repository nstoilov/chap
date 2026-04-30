import OpenAI from 'openai';

import { API_CONFIG, ENDPOINTS } from '../config/api';

// This will now be handled by the serverless function
export const translateWithBreakdown = async (japaneseText) => {
  try {
    const baseUrl = API_CONFIG.getBaseUrl();
    const apiUrl = `${baseUrl}${ENDPOINTS.TRANSLATE}`;

    // Call our serverless function instead of OpenAI directly
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: japaneseText }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Failed to translate text: ${error.message}`);
  }
};
