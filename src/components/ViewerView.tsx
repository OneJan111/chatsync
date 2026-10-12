import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Tv, 
  Send, 
  Smile, 
  Volume2, 
  Sparkles, 
  Heart, 
  Laugh, 
  Eye, 
  EyeOff, 
  Palette, 
  Radio,
  Gamepad2,
  Check
} from 'lucide-react';
import { ChatMessage, SuperChatGift, StreamChannelConfig, ViewerThemeId, PlatformType } from '../types';
import { EMOTE_PACKS, EMOTE_LOOKUP } from './LiveChatDeck';
import { annotateTextWithRuby, SlangEntry } from '../services/slangDictionary';
import { sound } from '../services/sound';
import { PlatformIcon, BilibiliMedalBadge } from './SiteIcons';

interface ViewerViewProps {
  messages: ChatMessage[];
  gifts: SuperChatGift[];
  channels: StreamChannelConfig[];
  viewerTheme: ViewerThemeId;
  setViewerTheme: (theme: ViewerThemeId) => void;
  onSendMessage: (text: string, platforms: PlatformType[]) => void;
}

export const ViewerView: React.FC<ViewerViewProps> = ({
  messages,
  gifts,
  channels,
  viewerTheme,
  setViewerTheme,
  onSendMessage,
}) => {
  // Only monitor platforms that are explicitly connected and have non-empty identifiers
  const monitoredChannels = React.useMemo(() => {
    return channels.filter((c) => c.isConnected && c.identifier && c.identifier.trim().length > 0);
  }, [channels]);

  const monitoredPlatforms = React.useMemo(() => {
    return monitoredChannels.map((c) => c.platform);
  }, [monitoredChannels]);

  const [selectedChannel, setSelectedChannel] = useState<StreamChannelConfig>(
    monitoredChannels[0] || channels[0] || ({} as any)
  );

  useEffect(() => {
    if (monitoredChannels.length > 0 && (!selectedChannel.platform || !monitoredPlatforms.includes(selectedChannel.platform))) {
      setSelectedChannel(monitoredChannels[0]);
    }
  }, [monitoredChannels, monitoredPlatforms, selectedChannel]);

  const [inputText, setInputText] = useState('');
  const [isDanmakuVisible, setIsDanmakuVisible] = useState(true);
  const [danmakuOpacity, setDanmakuOpacity] = useState(0.85);
  const [showRuby, setShowRuby] = useState(true);
  const [showEmotes, setShowEmotes] = useState(false);
  const [selectedSlang, setSelectedSlang] = useState<SlangEntry | null>(null);

  // Reaction counters
  const [cheerCount, setCheerCount] = useState({ hearts: 240, claps: 180, lols: 420 });

  const getThemeStyles = (theme: ViewerThemeId) => {
    switch (theme) {
      case 'cinema_dark':
        return {
          bg: 'bg-black text-slate-100',
          card: 'bg-zinc-950/90 border-zinc-800 text-zinc-100',
          accent: 'bg-indigo-600 text-white',
          border: 'border-zinc-800',
        };
      case 'cozy_latte':
        return {
          bg: 'bg-[#181310] text-[#f4ece1]',
          card: 'bg-[#221c17] border-[#3d3229] text-[#f4ece1]',
          accent: 'bg-[#d97706] text-white',
          border: 'border-[#3d3229]',
        };
      case 'pastel_sakura':
        return {
          bg: 'bg-[#150d18] text-[#fce7f3]',
          card: 'bg-[#241328] border-[#4a2352] text-[#fce7f3]',
          accent: 'bg-[#ec4899] text-white',
          border: 'border-[#4a2352]',
        };
      case 'neon_matrix':
        return {
          bg: 'bg-[#051109] text-[#86efac]',
          card: 'bg-[#091f11] border-[#166534] text-[#bbf7d0]',
          accent: 'bg-[#22c55e] text-slate-950 font-bold',
          border: 'border-[#166534]',
        };
    }
  };

  const themeStyle = getThemeStyles(viewerTheme);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChannel.platform) return;
    onSendMessage(inputText.trim(), [selectedChannel.platform]);
    setInputText('');
  };

  const triggerReaction = (type: 'heart' | 'clap' | 'lol' | 'trophy') => {
    sound.playChime();
    if (type === 'heart') {
      setCheerCount((c) => ({ ...c, hearts: c.hearts + 1 }));
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 }, colors: ['#ec4899', '#f43f5e'] });
    } else if (type === 'lol') {
      setCheerCount((c) => ({ ...c, lols: c.lols + 1 }));
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 }, colors: ['#eab308', '#f59e0b'] });
    } else {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    }
  };

  // Only display messages from monitored platforms
  const displayMessages = messages.filter((m) => monitoredPlatforms.includes(m.platform));

  return (
    <div className={`space-y-4 rounded-2xl p-3 sm:p-5 transition-colors ${themeStyle.bg}`}>
      {/* Viewer Header & Theme Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Tv className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                  沉浸式观影影院 <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">VIEWER MODE</span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                专属观众体验：无复杂OBS干扰、多通道同屏弹幕墙、一键梗百科查询与互动氛围
              </p>
            </div>
          </div>
        </div>

        {/* Viewer Theme Palette Selector */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="text-slate-400 text-xs flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" /> 观影视效:
          </span>
          {[
            { id: 'cinema_dark', label: '🌌 极夜 (OLED)' },
            { id: 'cozy_latte', label: '☕ 温暖拿铁' },
            { id: 'pastel_sakura', label: '🌸 粉樱萌系' },
            { id: 'neon_matrix', label: '⚡ 赛博电竞' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setViewerTheme(t.id as ViewerThemeId)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                viewerTheme === t.id
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Cinema Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Big Player & Flying Danmaku (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          
          {/* Channel Selector Pills - HIDES platforms that are not monitored! */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs text-slate-400 font-medium mr-1 shrink-0 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>正在监控:</span>
            </span>
            {monitoredChannels.length === 0 ? (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                暂未监控任何直播间，请在顶部【📡 房间监控设置】添加
              </span>
            ) : (
              monitoredChannels.map((ch) => (
                <button
                  key={ch.platform}
                  onClick={() => setSelectedChannel(ch)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all shrink-0 ${
                    selectedChannel.platform === ch.platform
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <PlatformIcon platform={ch.platform} size={14} />
                  <span>{ch.name}</span>
                  <span className="font-mono text-[10px] opacity-70">({ch.viewerCount.toLocaleString()})</span>
                </button>
              ))
            )}
          </div>

          {/* THE BIG CINEMA SCREEN WITH REAL-TIME FLYING DANMAKU */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl aspect-video bg-gradient-to-tr from-slate-950 via-zinc-950 to-slate-900 flex flex-col justify-between p-4 group">
            
            {/* Top HUD: Stream Info */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white border border-white/10">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold text-red-400">LIVE</span>
                <span className="font-medium truncate max-w-xs">{selectedChannel.title || '多平台实时联播房间'}</span>
              </div>

              {/* Danmaku On/Off & Opacity Quick Controls */}
              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs">
                <button
                  onClick={() => setIsDanmakuVisible(!isDanmakuVisible)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    isDanmakuVisible ? 'text-emerald-400' : 'text-slate-500 line-through'
                  }`}
                  title="开关画面飘屏弹幕"
                >
                  {isDanmakuVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>弹幕</span>
                </button>

                {isDanmakuVisible && (
                  <div className="flex items-center gap-1 border-l border-white/20 pl-2">
                    <span className="text-[10px] text-slate-400">不透明:</span>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={danmakuOpacity}
                      onChange={(e) => setDanmakuOpacity(Number(e.target.value))}
                      className="accent-indigo-500 w-14 h-1 bg-slate-700 rounded cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* FLYING DANMAKU LAYER OVER VIDEO */}
            {isDanmakuVisible && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden select-none flex flex-col justify-around py-8"
                style={{ opacity: danmakuOpacity }}
              >
                <div className="animate-danmaku text-white font-bold text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-12">
                  <span className="bg-black/30 px-2.5 py-0.5 rounded-full backdrop-blur-sm text-yellow-300">
                    草草草刚才那个反杀绝了 2333333333！
                  </span>
                  <span className="text-white">POGCHAMP UNBELIEVABLE SHOT!!</span>
                  <span className="text-sky-300">舰长出航！登船打call～ ⚓</span>
                  <span className="text-pink-300">主播今天好元气！てぇてぇ！</span>
                </div>
                <div className="animate-danmaku-slow text-slate-100 font-semibold text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-14">
                  <span className="text-purple-300">KEKW the funniest cliff jump of the week</span>
                  <span className="text-white">蚌埠住了哈哈哈哈哈哈哈！</span>
                  <span className="text-red-400">感谢老哥送出的超级留言！！</span>
                </div>
              </div>
            )}

            {/* Center Watermark Artwork */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none">
              <Gamepad2 className="w-48 h-48 text-indigo-400" />
            </div>

            {/* Bottom Stream Bar */}
            <div className="flex items-center justify-between z-10 pt-2 border-t border-white/10 text-xs text-white">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">正在播放通道:</span>
                {selectedChannel.platform && (
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono font-bold flex items-center gap-1">
                    <PlatformIcon platform={selectedChannel.platform} size={12} />
                    <span>{selectedChannel.name}</span>
                  </span>
                )}
                <span className="text-slate-400 hidden sm:inline">{selectedChannel.identifier}</span>
              </div>

              {/* Reaction Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => triggerReaction('heart')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 transition-transform active:scale-95"
                  title="点赞比心"
                >
                  <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
                  <span className="font-mono text-[11px] font-bold">{cheerCount.hearts}</span>
                </button>

                <button
                  onClick={() => triggerReaction('lol')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 transition-transform active:scale-95"
                  title="爆笑 2333"
                >
                  <Laugh className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="font-mono text-[11px] font-bold">{cheerCount.lols}</span>
                </button>

                <button
                  onClick={() => triggerReaction('clap')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-transform active:scale-95"
                  title="为高光撒花喝彩"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>喝彩</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Viewer Danmaku Sender Bar */}
          <form onSubmit={handleSend} className={`p-2.5 rounded-xl border ${themeStyle.card} flex items-center gap-2 shadow-lg`}>
            <button
              type="button"
              onClick={() => setShowEmotes(!showEmotes)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="插入弹幕表情"
            >
              <Smile className="w-4 h-4 text-amber-400" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={monitoredChannels.length === 0}
              placeholder={
                monitoredChannels.length === 0
                  ? '请先配置监控平台以发送弹幕...'
                  : `发条友善弹幕给 ${selectedChannel.name || '主播'} (支持 [doge], 2333, Pog)...`
              }
              className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || monitoredChannels.length === 0}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>发射弹幕</span>
            </button>
          </form>

          {/* Quick Emote Drawer */}
          {showEmotes && (
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-4 sm:grid-cols-8 gap-1 text-xs">
              {EMOTE_PACKS.slice(0, 8).map((em) => (
                <button
                  key={em.code}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => `${prev} ${em.code}`.trim());
                    setShowEmotes(false);
                  }}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-slate-800 text-slate-200"
                >
                  <span className="text-base">{em.icon}</span>
                  <span className="text-[10px] text-slate-400 truncate">{em.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Unified Danmaku Waterfall & Meme Dictionary (4 cols) */}
        <div className="lg:col-span-4 space-y-3 flex flex-col h-[580px]">
          {/* Header of Chat Waterfall */}
          <div className={`p-3 rounded-xl border ${themeStyle.card} flex items-center justify-between`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>全网监控弹幕流</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                {displayMessages.length}
              </span>
            </div>

            <button
              onClick={() => setShowRuby(!showRuby)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                showRuby
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="假名/拼音注音辅助，助你看懂外语VTuber直播"
            >
              拼/あ 注音: {showRuby ? '开' : '关'}
            </button>
          </div>

          {/* Messages Stream */}
          <div className={`flex-1 rounded-xl border ${themeStyle.card} overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/40 text-xs`}>
            {displayMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                暂无监控平台弹幕，请在顶部设置房间号
              </div>
            ) : (
              displayMessages.map((m) => {
                const rubyData = showRuby ? annotateTextWithRuby(m.text) : null;
                const fanMedal = m.badges.find((b) => b.type === 'fan_medal' || (b.level && b.level > 0));
                const fleetGuard = m.badges.find((b) => b.type === 'fleet_guard' || b.type === 'fleet_admiral');

                return (
                  <div key={m.id} className="pt-1.5 leading-snug">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1 py-0.2 rounded bg-slate-800/80 border border-slate-700/60 shadow-sm">
                          <PlatformIcon platform={m.platform} size={11} />
                        </span>

                        {fanMedal && (
                          <BilibiliMedalBadge
                            medalName={fanMedal.medalName || fanMedal.label.split(' ')[0] || '雅宝'}
                            level={fanMedal.level || 25}
                            guardType={fleetGuard ? (fleetGuard.type as any) : undefined}
                          />
                        )}

                        <span className="font-bold text-slate-200">{m.user}</span>
                      </div>
                      <span className="font-mono text-slate-500 text-[9px]">{m.timestamp}</span>
                    </div>

                    {/* Text with Emotes & clickable meme explanations */}
                    <div className="text-slate-100 text-xs mt-0.5 leading-relaxed break-words">
                      {rubyData && rubyData.rubyHtml !== m.text ? (
                        <span dangerouslySetInnerHTML={{ __html: rubyData.rubyHtml }} />
                      ) : (
                        <span>
                          {m.text.split(/(\[[^\]]+\]|:[a-zA-Z0-9_-]+:)/g).map((chunk, idx) => {
                            const emote = EMOTE_LOOKUP[chunk];
                            if (emote) {
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-0.5 px-1 py-0.2 mx-0.5 rounded text-[10px] border ${emote.color}`}
                                >
                                  <span>{emote.icon}</span>
                                  <span className="font-mono">{chunk}</span>
                                </span>
                              );
                            }
                            return <span key={idx}>{chunk}</span>;
                          })}
                        </span>
                      )}

                      {/* If contains slang, show clickable prompt */}
                      {rubyData?.matchedSlang && (
                        <button
                          onClick={() => setSelectedSlang(rubyData.matchedSlang!)}
                          className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-semibold"
                          title="点击查看梗意与文化渊源"
                        >
                          💡 梗百科: {rubyData.matchedSlang.keyword}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Slang Explainer Popover Card */}
          {selectedSlang && (
            <div className="p-3 rounded-xl bg-indigo-950/90 border border-indigo-500/40 text-xs space-y-1 relative animate-in fade-in">
              <div className="flex items-center justify-between text-indigo-300 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>弹幕黑话释义: {selectedSlang.keyword}</span>
                </span>
                <button
                  onClick={() => setSelectedSlang(null)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
              <div className="text-white font-semibold">{selectedSlang.translation}</div>
              <p className="text-[11px] text-slate-300 leading-snug">{selectedSlang.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
