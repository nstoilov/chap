import { API_CONFIG, ENDPOINTS, APP_SECRET } from '../config/api';
import { isStreamingSupported, parseSSEBuffer } from './sse';

const normText = (s) => String(s ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');

const isValidQuestion = (q) =>
  q &&
  Array.isArray(q.options) &&
  q.options.length === 4 &&
  Number.isInteger(q.correctIndex) &&
  q.correctIndex >= 0 &&
  q.correctIndex < 4 &&
  q.options.every((o) => normText(o) !== '') &&
  new Set(q.options.map(normText)).size === 4;

const normalizeJlpt = (result) => {
  const arr = Array.isArray(result) ? result : (result && (result.questions || result.data));
  if (!Array.isArray(arr)) {
    throw new Error('Could not parse questions from server response.');
  }
  const seenPrompts = new Set();
  const questions = arr
    .filter(isValidQuestion)
    .filter((q) => {
      const key = normText(q.prompt);
      if (seenPrompts.has(key)) return false;
      seenPrompts.add(key);
      return true;
    })
    .map((q, i) => ({ ...q, id: q.id || i + 1 }));
  if (questions.length === 0) {
    throw new Error('No valid questions were generated. Please try again.');
  }
  return { questions };
};

const jlptWithXHR = (url, body, onChunk) => {
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
        const { chunks, finalResult, remaining } = parseSSEBuffer(newText);
        processed = xhr.responseText.length - remaining.length;
        chunks.forEach(c => onChunk?.(c));
        if (finalResult) resolve(normalizeJlpt(finalResult));
      } catch (e) {
        reject(e);
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(JSON.stringify(body));
  });
};

export const generateJlptQuestions = async ({ level, section, count, difficulty, model }, onChunk) => {
  const baseUrl = API_CONFIG.getBaseUrl();
  const apiUrl = `${baseUrl}${ENDPOINTS.JLPT}`;
  const body = { level, section, count, difficulty, model };

  if (isStreamingSupported()) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Key': APP_SECRET },
      body: JSON.stringify(body),
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
      if (finalResult) return normalizeJlpt(finalResult);
    }
  }

  return await jlptWithXHR(apiUrl, body, onChunk);
};