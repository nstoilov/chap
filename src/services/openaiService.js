import OpenAI from 'openai';

import { API_CONFIG, ENDPOINTS } from '../config/api';

// This will now be handled by the serverless function
export const translateWithBreakdown = async (japaneseText) => {
  try {
    const baseUrl = API_CONFIG.getBaseUrl();
    const apiUrl = `${baseUrl}${ENDPOINTS.TRANSLATE}`;

    console.log('API URL:', apiUrl); // For debugging
    console.log('Base URL:', baseUrl);
    console.log('Window location:', typeof window !== 'undefined' ? window.location?.href : 'Not in browser');

    // Call our serverless function instead of OpenAI directly
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: japaneseText }),
    });

    if (!response.ok) {
      console.error('Response status:', response.status);
      console.error('Response statusText:', response.statusText);
      const errorText = await response.text();
      console.error('Response body:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Translation API Error:', error);
    throw new Error(`Failed to translate text: ${error.message}`);
  }
};
