import { API_CONFIG, ENDPOINTS, APP_SECRET } from '../config/api';

const isStreamingSupported = () => {
  try {
    return typeof Response !== 'undefined' && typeof new Response().body?.getReader === 'function';
  } catch {
    return false;
  }
};

// Parse SSE lines from a text buffer, returns { chunks, finalResult, remaining }
const parseSSEBuffer = (buffer) => {
  const lines = buffer.split('\n');
  const remaining = lines.pop(); // keep incomplete last line
  const chunks = [];
  let finalResult = null;

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = JSON.parse(line.slice(6));
    if (data.error) throw new Error(data.error);
    if (data.chunk) chunks.push(data.chunk);
    if (data.done) {
      try {
        // Strip markdown code fences that some models (e.g. Gemini) wrap around JSON
        const cleaned = data.full.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        finalResult = JSON.parse(cleaned);
      } catch {
        finalResult = { translation: data.full, breakdown: [], grammar: 'Unable to parse structured response' };
      }
    }
  }

  return { chunks, finalResult, remaining };
};

// Streaming via XMLHttpRequest — works on both React Native and Web
const translateWithXHR = (url, japaneseText, onChunk, model, direction) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-App-Key', APP_SECRET);

    let processed = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState < 3) return;

      const newText = xhr.responseText.slice(processed);
      if (!newText) return;

      try {
        const { chunks, finalResult, remaining } = parseSSEBuffer(newText);
        processed = xhr.responseText.length - remaining.length;

        chunks.forEach(c => onChunk?.(c));

        if (finalResult) resolve(finalResult);
      } catch (e) {
        reject(e);
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(JSON.stringify({ text: japaneseText, model, direction }));
  });
};

// onChunk(text) is called with each streamed token.
// Returns the parsed result object when streaming is complete.
export const translateWithBreakdown = async (japaneseText, onChunk, model, direction) => {
  try {
    const baseUrl = API_CONFIG.getBaseUrl();
    const apiUrl = `${baseUrl}${ENDPOINTS.TRANSLATE}`;

    // Web Streams API available (browser / Electron)
    if (isStreamingSupported()) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Key': APP_SECRET },
        body: JSON.stringify({ text: japaneseText, model, direction }),
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
        const { chunks, finalResult, remaining } = parseSSEBuffer(buffer);
        buffer = remaining;

        chunks.forEach(c => onChunk?.(c));
        if (finalResult) return finalResult;
      }
    }

    // React Native — use XHR which supports partial responseText
    return await translateWithXHR(apiUrl, japaneseText, onChunk, model, direction);

  } catch (error) {
    throw new Error(`Failed to translate text: ${error.message}`);
  }
};
