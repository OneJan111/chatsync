import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  HelpCircle, 
  Flame, 
  Download, 
  FileText, 
  Film, 
  Languages, 
  Check, 
  RefreshCw, 
  Smile, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { ChatMessage, StreamHotspot } from '../types';
import { useTranslate } from './LanguageContext';

interface AiCoPilotProps {
  messages: ChatMessage[];
  hotspots: StreamHotspot[];
}

export const AiCoPilot: React.FC<AiCoPilotProps> = ({ messages, hotspots }) => {
  const t = useTranslate();
  const [slangInput, setSlangInput] = useState('草，主播这个反向大招蚌埠住了 23333');
  const [targetLang, setTargetLang] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<{
    original: string;
    translation: string;
    nuance: string | null;
    sentiment: string;
    isAiGenerated: boolean;
  } | null>(null);

  const [isAnalyzingVibe, setIsAnalyzingVibe] = useState(false);
  const [streamVibe, setStreamVibe] = useState<{
    summary: string;
    hotTopics: string[];
    streamerActionItems: string[];
    vibeScore: number;
    dominantMood: string;
    isAiGenerated: boolean;
  } | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, boolean>>({});

  // Filter messages that look like questions
  const viewerQuestions = messages.filter(
    (m) =>
      m.isQuestion ||
      m.text.includes('?') ||
      m.text.includes('？') ||
      m.text.includes('请问') ||
      m.text.includes('what') ||
      m.text.includes('how')
  );

  const handleTranslateSlang = async () => {
    if (!slangInput.trim()) return;
    setIsTranslating(true);
    setRequestError(null);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slangInput, targetLang }),
      });
      const data = await res.json() as {
        original?: string;
        translation?: string;
        nuance?: string | null;
        sentiment?: string;
        isAiGenerated?: boolean;
        error?: string;
      };
      if (
        !res.ok ||
        typeof data.original !== 'string' ||
        typeof data.translation !== 'string' ||
        typeof data.sentiment !== 'string' ||
        typeof data.isAiGenerated !== 'boolean'
      ) {
        throw new Error(data.error || 'Translation failed');
      }
      setTranslationResult({
        original: data.original,
        translation: data.translation,
        nuance: data.nuance ?? null,
        sentiment: data.sentiment,
        isAiGenerated: data.isAiGenerated,
      });
    } catch (error: unknown) {
      console.error('Translation error:', error);
      setRequestError(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRefreshVibeAnalysis = async () => {
    setIsAnalyzingVibe(true);
    setRequestError(null);
    try {
      const res = await fetch('/api/ai/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json() as {
        summary?: string;
        hotTopics?: string[];
        streamerActionItems?: string[];
        vibeScore?: number;
        dominantMood?: string;
        isAiGenerated?: boolean;
        error?: string;
      };
      if (
        !res.ok ||
        typeof data.summary !== 'string' ||
        !Array.isArray(data.hotTopics) ||
        !Array.isArray(data.streamerActionItems) ||
        typeof data.vibeScore !== 'number' ||
        typeof data.dominantMood !== 'string' ||
        typeof data.isAiGenerated !== 'boolean'
      ) {
        throw new Error(data.error || 'Stream analysis failed');
      }
      setStreamVibe({
        summary: data.summary,
        hotTopics: data.hotTopics,
        streamerActionItems: data.streamerActionItems,
        vibeScore: data.vibeScore,
        dominantMood: data.dominantMood,
        isAiGenerated: data.isAiGenerated,
      });
    } catch (error: unknown) {
      console.error('Analysis error:', error);
      setRequestError(error instanceof Error ? error.message : 'Stream analysis failed');
    } finally {
      setIsAnalyzingVibe(false);
    }
  };

  // Export DaVinci Resolve EDL file
  const downloadEdl = () => {
    let edlContent = 'TITLE: STREAM_HOTSPOTS_DAVINCI\nFCM: NON-DROP FRAME\n\n';
    hotspots.forEach((h, index) => {
      const num = String(index + 1).padStart(3, '0');
      edlContent += `${num}  AX       V     C        ${h.timestampStart}:00 ${h.timestampEnd}:00 ${h.timestampStart}:00 ${h.timestampEnd}:00\n`;
      edlContent += `* FROM CLIP NAME: LIVE_RECORDING.mp4\n`;
      edlContent += `* MARKER: ${h.description} | Peak CPM: ${h.peakCpm}\n\n`;
    });

    const blob = new Blob([edlContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stream_hotspots.edl';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export YouTube Description Timestamps
  const downloadTimestamps = () => {
    let content = '=== STREAM HIGHLIGHT CHAPTERS ===\n';
    hotspots.forEach((h) => {
      content += `${h.timestampStart} - ${h.description} (Hot Keywords: ${h.triggerKeywords.join(', ')})\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube_chapters.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/20 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Bot className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              {t('AI Stream Co-Pilot & Danmaku Slang Intelligence')}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Google Translate · Gemini fallback
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t('Translations use free Google Translate first. Gemini is used only as a translation fallback and for AI analysis, when a server API key is configured.')}
          </p>
        </div>

        <button
          onClick={handleRefreshVibeAnalysis}
          disabled={isAnalyzingVibe}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-pink-600/30 transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingVibe ? 'animate-spin' : ''}`} />
          <span>{isAnalyzingVibe ? t('Analyzing Chat...') : t('Refresh Vibe Analysis')}</span>
        </button>
      </div>
      {requestError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{requestError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Slang Translator & Stream Vibe Gauge */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Danmaku & Gaming Slang Translator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-pink-400" />
                <span>{t('Context-Aware Slang Translator')}</span>
              </h3>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
              >
                <option value="en">English (EN)</option>
                <option value="zh">Chinese (中文)</option>
                <option value="ja">Japanese (日本語)</option>
              </select>
            </div>

            <div className="space-y-2">
              <textarea
                value={slangInput}
                onChange={(e) => setSlangInput(e.target.value)}
                rows={2}
                placeholder={t('Enter live chat slang (e.g. 草, 2333, てぇてぇ, 蚌埠住了, Pog, KEKW)...')}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>{t('Quick samples:')}</span>
                  {['草', 'てぇてぇ', '蚌埠住了', '急了'].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setSlangInput(sample)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px]"
                    >
                      {sample}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleTranslateSlang}
                  disabled={isTranslating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-md text-xs font-semibold shadow-md shadow-pink-600/30 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isTranslating ? t('Translating...') : t('Translate Slang')}</span>
                </button>
              </div>
            </div>

            {/* Translation Output Card */}
            {translationResult && (
              <div className="bg-slate-950/70 border border-pink-500/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    "{translationResult.original}"
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    {translationResult.isAiGenerated
                      ? `Gemini fallback · ${translationResult.sentiment}`
                      : 'Google Translate'}
                  </span>
                </div>

                <div className="text-sm font-semibold text-pink-200">
                  {translationResult.translation}
                </div>

                {translationResult.nuance && (
                  <div className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 leading-relaxed">
                    💡 <span className="font-semibold text-slate-200">{t('Cultural Context:')}</span> {translationResult.nuance}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Stream Vibe & Action Items */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>{t('Live Chat Sentiment & Vibe')}</span>
              </h3>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                {streamVibe ? `${t('Vibe Score')}: ${streamVibe.vibeScore}/100` : t('Not analyzed')}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/60">
              {streamVibe?.summary || t('Refresh the analysis to summarize the current chat.')}
            </p>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">{t('Suggested Streamer Actions:')}</div>
              {streamVibe ? (
                <ul className="space-y-1.5">
                  {streamVibe.streamerActionItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/60 p-2 rounded border border-slate-700/50"
                    >
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">{t('No AI analysis has been generated yet.')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Viewer Question Radar & Hotspot Clip Markers */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Viewer Question Radar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {t('Viewer Question Radar')}
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                  {viewerQuestions.length} {t('detected')}
                </span>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {viewerQuestions.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  {t('No viewer questions detected yet.')}
                </div>
              ) : (
                viewerQuestions.map((q) => {
                  const isDone = answeredQuestions[q.id];
                  return (
                    <div
                      key={q.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isDone
                          ? 'bg-slate-800/30 border-slate-800 opacity-50'
                          : 'bg-slate-800/80 border-amber-500/30 shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-bold text-slate-200">{q.user}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            ({q.platform})
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setAnsweredQuestions((prev) => ({
                              ...prev,
                              [q.id]: !prev[q.id],
                            }))
                          }
                          className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                            isDone
                              ? 'bg-slate-700 text-slate-400'
                              : 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400'
                          }`}
                        >
                          {isDone ? t('Answered ✓') : t('Mark Answered')}
                        </button>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 leading-snug">{q.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Hotspots for Clipping & Video Editors */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  🔥 {t('Stream Hotspots for Clipping')}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={downloadEdl}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition-colors"
                  title={t('Download DaVinci Resolve Timeline Markers (.edl)')}
                >
                  <Film className="w-3 h-3 text-cyan-400" />
                  <span>{t('EDL Markers')}</span>
                </button>
                <button
                  onClick={downloadTimestamps}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition-colors"
                  title={t('Download YouTube Video Chapters (.txt)')}
                >
                  <FileText className="w-3 h-3 text-red-400" />
                  <span>{t('YT Chapters')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {hotspots.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/70 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-orange-400">
                        {h.timestampStart} - {h.timestampEnd}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {t('Peak')}: {h.peakCpm} CPM
                      </span>
                    </div>
                    <div className="text-slate-200 font-medium mt-1">
                      {h.description}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t('Hot words')}: {h.triggerKeywords.join(', ')}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">{t('Gifts')}</span>
                    <span className="text-xs font-mono font-bold text-purple-400">
                      +{h.giftTotal} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
