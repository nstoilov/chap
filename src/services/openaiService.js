import { API_CONFIG, ENDPOINTS, APP_SECRET } from '../config/api';
import { isStreamingSupported, parseSSEBuffer } from './sse';

const translateFallback = (full) => ({
  translation: full,
  breakdown: [],
  grammar: 'Unable to parse structured response',
});

const translateWithXHR = (url, japaneseText, onChunk, model, direction, formality) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-App-Key', APP_SECRET);

    let processed = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState < 3) return;

      if (xhr.readyState === 4 && xhr.status !== 200) {
        reject(new Error(`Server error (${xhr.status})`));
        return;
      }

      const newText = xhr.responseText.slice(processed);
      if (!newText) return;

      try {
        const { chunks, finalResult, remaining } = parseSSEBuffer(newText, translateFallback);
        processed = xhr.responseText.length - remaining.length;

        chunks.forEach(c => onChunk?.(c));

        if (finalResult) resolve(finalResult);
      } catch (e) {
        reject(e);
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(JSON.stringify({ text: japaneseText, model, direction, formality }));
  });
};

export const translateWithBreakdown = async (japaneseText, onChunk, model, direction, formality) => {
  try {
    const baseUrl = API_CONFIG.getBaseUrl();
    const apiUrl = `${baseUrl}${ENDPOINTS.TRANSLATE}`;

    if (isStreamingSupported()) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Key': APP_SECRET },
        body: JSON.stringify({ text: japaneseText, model, direction, formality }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { chunks, finalResult, remaining } = parseSSEBuffer(buffer, translateFallback);
        buffer = remaining;

        chunks.forEach(c => onChunk?.(c));
        if (finalResult) return finalResult;
      }
    }

    return await translateWithXHR(apiUrl, japaneseText, onChunk, model, direction, formality);
  } catch (error) {
    throw new Error('Translation failed. Please try again.');
  }
};
