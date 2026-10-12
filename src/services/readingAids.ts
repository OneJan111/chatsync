export interface JapaneseReadingToken {
  surface: string;
  reading: string;
}

interface ReadingAidResult {
  text: string;
  tokens: JapaneseReadingToken[];
}

const resultsCache = new Map<string, JapaneseReadingToken[]>();
const pendingRequests = new Map<
  string,
  Array<{ resolve: (tokens: JapaneseReadingToken[]) => void; reject: (error: Error) => void }>
>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

const flushRequests = async () => {
  flushTimer = undefined;
  const texts = [...pendingRequests.keys()];
  if (texts.length === 0) return;

  for (let start = 0; start < texts.length; start += 80) {
    const batch = texts.slice(start, start + 80);
    try {
      const response = await fetch('/api/reading-aids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: batch }),
      });
      const payload = await response.json() as { results?: unknown; error?: unknown };
      if (!response.ok || !Array.isArray(payload.results)) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Japanese furigana generation failed');
      }

      const results = payload.results as ReadingAidResult[];
      for (const text of batch) {
        const result = results.find((item) => item.text === text);
        if (!result || !Array.isArray(result.tokens)) {
          throw new Error('Japanese furigana response did not include requested text');
        }
        resultsCache.set(text, result.tokens);
        if (resultsCache.size > 500) {
          const oldestText = resultsCache.keys().next().value;
          if (oldestText !== undefined) resultsCache.delete(oldestText);
        }
        pendingRequests.get(text)?.forEach(({ resolve }) => resolve(result.tokens));
        pendingRequests.delete(text);
      }
    } catch (error: unknown) {
      const failure = error instanceof Error ? error : new Error('Japanese furigana generation failed');
      for (const text of batch) {
        pendingRequests.get(text)?.forEach(({ reject }) => reject(failure));
        pendingRequests.delete(text);
      }
    }
  }
};

export const getJapaneseReading = (text: string): Promise<JapaneseReadingToken[]> => {
  const cached = resultsCache.get(text);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const requests = pendingRequests.get(text) ?? [];
    requests.push({ resolve, reject });
    pendingRequests.set(text, requests);
    if (!flushTimer) flushTimer = setTimeout(() => void flushRequests(), 20);
  });
};
