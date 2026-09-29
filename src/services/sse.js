export const isStreamingSupported = () => {
  try {
    return typeof Response !== 'undefined' && typeof new Response().body?.getReader === 'function';
  } catch {
    return false;
  }
};

export const parseSSEBuffer = (buffer, fallback) => {
  const lines = buffer.split('\n');
  const remaining = lines.pop();
  const chunks = [];
  let finalResult = null;

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = JSON.parse(line.slice(6));
    if (data.error) throw new Error(data.error);
    if (data.chunk) chunks.push(data.chunk);
    if (data.done) {
      try {
        const cleaned = data.full.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        finalResult = JSON.parse(cleaned);
      } catch (e) {
        if (fallback) finalResult = fallback(data.full);
        else throw new Error('Could not parse server response.');
      }
    }
  }

  return { chunks, finalResult, remaining };
};