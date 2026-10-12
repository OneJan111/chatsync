import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Gemini SDK with server-side key
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

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

// AI Endpoint: Context-aware Danmaku & Gaming Slang Translation
app.post('/api/ai/translate-slang', async (req, res) => {
  try {
    const { text, targetLang = 'en', platform = 'bilibili' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      // Fallback smart rule-based translation if no API key is present
      const fallbackSlang: Record<string, string> = {
        '草': 'LOL (kusa/laugh)',
        '2333': 'Hahaha / LMAO',
        '23333': 'Hahaha / LMAO',
        'kusa': 'LOL / funny',
        'wwww': 'hahaha (Japanese laughter)',
        'teetee': 'So wholesome / sweet ship',
        'てぇてぇ': 'Wholesome / precious interaction',
        '舰长': 'Channel Fleet Guard (Tier 1 Sub)',
        '提督': 'Channel Admiral (Tier 2 Sub)',
        '总督': 'Channel Governor (Tier 3 Sub)',
        '蚌埠住了': "Can't hold back tears/laughter",
        '急了': 'Someone got tilted / salty',
        '典': 'Classic / quintessential meme',
        '好耶': 'Yay! / Awesome!',
        'pjsk': 'Project SEKAI',
        'ggwp': 'Good game, well played',
      };
      
      let matchedMeaning = '';
      for (const [key, val] of Object.entries(fallbackSlang)) {
        if (text.toLowerCase().includes(key.toLowerCase())) {
          matchedMeaning = val;
          break;
        }
      }

      return res.json({
        original: text,
        translation: matchedMeaning || `[Auto] ${text}`,
        nuance: matchedMeaning ? 'Recognized VTuber / danmaku slang' : 'Literal meaning',
        sentiment: 'neutral',
        isAiGenerated: false,
      });
    }

    const prompt = `You are an expert streaming danmaku and gamer culture translator specializing in live streams (YouTube, Bilibili, MissEvan, Twitch).
Translate the following chat message into ${targetLang}.
If it contains gaming slang, VTuber inside jokes, or danmaku abbreviations (e.g. 草, 233, kusa, www, てぇてぇ, 舰长, 蚌埠住了, pog, kekw), explain the nuance and provide a natural streaming-equivalent translation instead of a naive literal translation.

Format your response as pure JSON with keys:
"translation": string (natural translation in ${targetLang}),
"nuance": string (brief 1-sentence cultural nuance / meme explanation if any, or null),
"sentiment": "positive" | "hype" | "funny" | "question" | "neutral" | "toxic"

Message: "${text}" (Source platform: ${platform})`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      original: text,
      translation: parsed.translation || text,
      nuance: parsed.nuance || null,
      sentiment: parsed.sentiment || 'neutral',
      isAiGenerated: true,
    });
  } catch (error: any) {
    console.error('AI translation error:', error);
    return res.status(500).json({ error: error.message || 'AI translation failed' });
  }
});

// AI Endpoint: Stream Highlights & Sentiment Intelligence
app.post('/api/ai/analyze-stream', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const ai = getAiClient();
    
    if (!ai || messages.length === 0) {
      return res.json({
        summary: 'Stream chat is actively engaging with gameplay and reactions.',
        hotTopics: ['Game mechanics', 'Funny reaction', 'Super Chat donations'],
        streamerActionItems: ['Acknowledge new Fleet Admiral', 'Address viewer question about graphics settings'],
        vibeScore: 88,
        dominantMood: 'hype',
        isAiGenerated: false,
      });
    }

    const sample = messages.slice(-25).map((m: any) => `[${m.platform}] ${m.user}: ${m.text}`).join('\n');
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
  } catch (error: any) {
    console.error('AI stream analysis error:', error);
    return res.status(500).json({ error: error.message || 'Analysis failed' });
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
