import express from 'express';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createIntervalQueue } from './src/services/intervalQueue';
import {
  connectBilibili,
  clearBilibiliMessages,
  disconnectBilibili,
  getBilibiliFeed,
  getBilibiliStatus,
  sendBilibiliMessage,
} from './src/services/bilibiliLive';
import {
  connectMissevan,
  clearMissevanMessages,
  disconnectMissevan,
  getMissevanFeed,
  getMissevanStatus,
} from './src/services/missevanLive';
import {
  connectYoutube,
  clearYoutubeMessages,
  disconnectYoutube,
  getYoutubeFeed,
  getYoutubeStatus,
} from './src/services/youtubeLive';

dotenv.config({ path: ['.env.local', '.env'] });

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const require = createRequire(import.meta.url);
type KuromojiToken = { surface_form: string; reading: string };
type KuromojiTokenizer = { tokenize: (text: string) => KuromojiToken[] };
type KuromojiApi = {
  builder: (options: { dicPath: string }) => {
    build: (callback: (error: Error | null, tokenizer?: KuromojiTokenizer) => void) => void;
  };
};
const kuromoji = require('kuromoji') as KuromojiApi;
let japaneseTokenizerPromise: Promise<KuromojiTokenizer> | null = null;
const getJapaneseTokenizer = () => {
  japaneseTokenizerPromise ??= new Promise<KuromojiTokenizer>((resolve, reject) => {
    const dictionaryPath = join(dirname(require.resolve('kuromoji')), '..', 'dict');
    kuromoji.builder({ dicPath: dictionaryPath }).build((error, tokenizer) => {
      if (error) reject(error);
      else if (tokenizer) resolve(tokenizer);
      else reject(new Error('Japanese tokenizer initialized without a tokenizer'));
    });
  });
  return japaneseTokenizerPromise;
};

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const GOOGLE_TRANSLATE_LANGUAGES: Record<string, string> = {
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
};
const queueTranslation = createIntervalQueue(1_000);

app.post('/api/reading-aids', async (req, res) => {
  const { texts } = req.body ?? {};
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > 80
    || texts.some((text) => typeof text !== 'string' || text.length > 4000)) {
    return res.status(400).json({ error: 'Provide 1 to 80 text strings, each no longer than 4000 characters' });
  }

  try {
    const tokenizer = await getJapaneseTokenizer();
    const results = texts.map((text: string) => ({
      text,
      tokens: tokenizer.tokenize(text).map((token) => ({
        surface: token.surface_form,
        reading: token.reading !== '*' && /[\u4e00-\u9fff]/u.test(token.surface_form)
          ? token.reading.replace(/[\u30a1-\u30f6]/gu, (char) =>
            String.fromCharCode(char.charCodeAt(0) - 0x60))
          : '',
      })),
    }));
    return res.json({ results });
  } catch (error: unknown) {
    console.error('Japanese furigana generation failed:', error);
    return res.status(500).json({ error: 'Japanese furigana generation failed' });
  }
});

const translateWithGoogle = async (text: string, targetLang: string) => {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', GOOGLE_TRANSLATE_LANGUAGES[targetLang]);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Translate returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    throw new Error('Google Translate returned an invalid response');
  }

  const translation = payload[0]
    .map((segment: unknown) =>
      Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''
    )
    .join('');
  if (!translation) {
    throw new Error('Google Translate returned no translation');
  }
  const sourceLanguage = typeof payload[2] === 'string' ? payload[2] : null;
  return { translation, sourceLanguage };
};

const translateWithAi = async (
  text: string,
  targetLang: string,
  platform: string,
) => {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Translate this live-stream chat message into ${targetLang}. Preserve gaming and streaming slang where possible. Return only JSON with "translation", "nuance", and "sentiment" fields.\nPlatform: ${platform}\nMessage: ${JSON.stringify(text)}`,
    config: { responseMimeType: 'application/json' },
  });
  const parsed = JSON.parse(response.text || '{}');
  if (typeof parsed.translation !== 'string' || !parsed.translation.trim()) {
    throw new Error('Gemini returned no translation');
  }
  return {
    translation: parsed.translation,
    nuance: typeof parsed.nuance === 'string' ? parsed.nuance : null,
    sentiment: typeof parsed.sentiment === 'string' ? parsed.sentiment : 'neutral',
  };
};

app.get('/api/config', (_req, res) => {
  res.json({
    aiEnabled: Boolean(process.env.GEMINI_API_KEY?.trim()),
    youtubeApiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY?.trim()),
    liveChannelDefaults: {
      bilibili: process.env.BILIBILI_ROOM_ID?.trim() || '',
      missevan: process.env.MISSEVAN_ROOM_ID?.trim() || '',
      youtube: process.env.YOUTUBE_CHANNEL?.trim() || '',
    },
  });
});

const readFeedCursor = (req: express.Request, res: express.Response): number | null => {
  const after = Number(req.query.after ?? 0);
  if (!Number.isSafeInteger(after) || after < 0) {
    res.status(400).json({ error: 'after must be a non-negative integer' });
    return null;
  }
  return after;
};

app.get('/api/bilibili/status', (_req, res) => res.json(getBilibiliStatus()));
app.get('/api/bilibili/feed', (req, res) => {
  const after = readFeedCursor(req, res);
  if (after !== null) res.json(getBilibiliFeed(after, req.query.includeEmotes === 'true'));
});
app.post('/api/bilibili/send', async (req, res) => {
  const { text } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'A non-empty text string is required' });
  }
  if ([...text].length > 100) {
    return res.status(400).json({ error: 'Bilibili danmaku must be no longer than 100 characters' });
  }
  try {
    await sendBilibiliMessage(text);
    return res.json({ sent: true });
  } catch (error) {
    console.error('Bilibili danmaku send failed:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Bilibili danmaku send failed',
    });
  }
});

const handlePlatformConnect = async (
  req: express.Request,
  res: express.Response,
  connect: (identifier: string) => Promise<unknown>,
  disconnect: () => unknown,
) => {
  const { enabled, identifier } = req.body ?? {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  if (!enabled) return res.json(disconnect());
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ error: 'A live channel identifier is required' });
  }
  return res.json(await connect(identifier));
};

app.get('/api/youtube/status', (_req, res) => res.json(getYoutubeStatus()));
app.get('/api/youtube/feed', (req, res) => {
  const after = readFeedCursor(req, res);
  if (after !== null) res.json(getYoutubeFeed(after, req.query.includeEmotes === 'true'));
});
app.post('/api/youtube/connect', (req, res) => {
  const { cookie } = req.body ?? {};
  if (cookie !== undefined && typeof cookie !== 'string') {
    return res.status(400).json({ error: 'cookie must be a string' });
  }
  if (typeof cookie === 'string' && cookie.length > 16_384) {
    return res.status(413).json({ error: 'YouTube cookie is too long' });
  }
  return handlePlatformConnect(
    req,
    res,
    (identifier) => connectYoutube(identifier, cookie ?? ''),
    disconnectYoutube,
  );
});

app.get('/api/missevan/status', (_req, res) => res.json(getMissevanStatus()));
app.get('/api/missevan/feed', (req, res) => {
  const after = readFeedCursor(req, res);
  if (after !== null) res.json(getMissevanFeed(after));
});
app.post('/api/missevan/connect', (req, res) =>
  handlePlatformConnect(req, res, connectMissevan, disconnectMissevan));

app.post('/api/bilibili/connect', (req, res) => {
  const { cookie } = req.body ?? {};
  if (cookie !== undefined && typeof cookie !== 'string') {
    return res.status(400).json({ error: 'cookie must be a string' });
  }
  if (typeof cookie === 'string' && cookie.length > 16_384) {
    return res.status(413).json({ error: 'Bilibili cookie is too long' });
  }
  return handlePlatformConnect(
    req,
    res,
    (identifier) => connectBilibili(identifier, cookie ?? ''),
    disconnectBilibili,
  );
});

app.post('/api/live/clear', (_req, res) => {
  clearBilibiliMessages();
  clearYoutubeMessages();
  clearMissevanMessages();
  res.json({ cleared: true });
});

// Mock OBS WebSocket state
let mockObsState = {
  connected: false,
  isStreaming: false,
  isRecording: false,
  currentScene: 'Gaming + Cam',
  scenes: ['Just Chatting', 'Gaming + Cam', 'BRB Screen', 'Stream Starting'],
  micMuted: false,
  desktopVolume: 0.85,
};

// Google Translate is the default; Gemini is only used when Google is unavailable.
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLang = 'en', platform = 'bilibili' } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'A non-empty text string is required' });
    }
    if (typeof targetLang !== 'string' || !(targetLang in GOOGLE_TRANSLATE_LANGUAGES)) {
      return res.status(400).json({ error: 'Unsupported target language' });
    }

    return await queueTranslation(async () => {
      try {
        const { translation, sourceLanguage } = await translateWithGoogle(text.trim(), targetLang);
        const sourceLanguageBase = sourceLanguage?.toLowerCase().split('-')[0];
        const targetLanguageBase = GOOGLE_TRANSLATE_LANGUAGES[targetLang].toLowerCase().split('-')[0];
        const sameLanguage = sourceLanguageBase === targetLanguageBase
          || translation.trim().toLowerCase() === text.trim().toLowerCase();
        return res.json({
          original: text,
          translation,
          sourceLanguage,
          sameLanguage,
          nuance: null,
          sentiment: 'neutral',
          isAiGenerated: false,
          provider: 'google',
        });
      } catch (googleError) {
        const ai = getAiClient();
        if (!ai) {
          console.error('Google Translate error:', googleError);
          return res.status(502).json({
            error: 'Google Translate is unavailable and GEMINI_API_KEY is not configured for AI fallback.',
          });
        }

        try {
          const result = await translateWithAi(text.trim(), targetLang, String(platform));
          return res.json({
            original: text,
            ...result,
            sameLanguage: result.translation.trim().toLowerCase() === text.trim().toLowerCase(),
            isAiGenerated: true,
            provider: 'gemini',
          });
        } catch (aiError) {
          console.error('Google Translate and Gemini fallback both failed:', { googleError, aiError });
          return res.status(502).json({ error: 'Google Translate and Gemini translation both failed.' });
        }
      }
    });
  } catch (error: unknown) {
    console.error('Translation request error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Translation request failed',
    });
  }
});

// AI Endpoint: Stream Highlights & Sentiment Intelligence
app.post('/api/ai/analyze-stream', async (req, res) => {
  try {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'At least one chat message is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Stream analysis requires GEMINI_API_KEY. Configure it on the server to enable AI features.',
      });
    }

    const sample = messages.slice(-25).map((message: unknown) => {
      if (typeof message !== 'object' || message === null) return '';
      const chat = message as Record<string, unknown>;
      return `[${String(chat.platform ?? '')}] ${String(chat.user ?? '')}: ${String(chat.text ?? '')}`;
    }).join('\n');
    const prompt = `Analyze this recent live chat transcript from a multi-platform broadcast (Bilibili, YouTube, Twitch):
${sample}

Provide an executive live stream telemetry analysis in pure JSON with keys:
"summary": string (1-2 sentences summarizing the chat vibe right now),
"hotTopics": string[] (3 main topics or recurring memes),
"streamerActionItems": string[] (2 practical things the streamer should notice or answer right now),
"vibeScore": number (0 to 100),
"dominantMood": "hype" | "chill" | "hilarious" | "chaotic" | "focused"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      ...parsed,
      isAiGenerated: true,
    });
  } catch (error: unknown) {
    console.error('AI stream analysis error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
});

// OBS Simulator endpoints
app.get('/api/obs/status', (req, res) => {
  res.json(mockObsState);
});

app.post('/api/obs/action', (req, res) => {
  const { action, payload } = req.body;
  if (action === 'toggle_stream') mockObsState.isStreaming = !mockObsState.isStreaming;
  if (action === 'toggle_record') mockObsState.isRecording = !mockObsState.isRecording;
  if (action === 'set_scene' && payload?.scene) mockObsState.currentScene = payload.scene;
  if (action === 'toggle_mute') mockObsState.micMuted = !mockObsState.micMuted;
  if (action === 'toggle_connect') mockObsState.connected = !mockObsState.connected;
  res.json(mockObsState);
});

// Start server and mount Vite
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
