import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Volume2, 
  Languages, 
  Search, 
  Ban, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  ArrowDown, 
  Check, 
  Smile, 
  HelpCircle, 
  Radio,
  Settings2
} from 'lucide-react';
import { ChatMessage, PlatformType, StreamChannelConfig } from '../types';
import { tts } from '../services/tts';
import { annotateTextWithRuby } from '../services/slangDictionary';
import { PlatformIcon, BilibiliMedalBadge } from './SiteIcons';

interface LiveChatDeckProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, platforms: PlatformType[]) => void;
  onBlockUser: (username: string) => void;
  onTranslateMessage: (msgId: string, targetLang: string) => void;
  blockedUsers: string[];
  channels?: StreamChannelConfig[];
  onOpenChannelMonitor?: () => void;
}

export interface EmoteData {
  code: string;
  label: string;
  icon: string;
  platform: 'bilibili' | 'youtube' | 'twitch';
  isLocked?: boolean;
  desc: string;
}

export const EMOTE_PACKS: EmoteData[] = [
  // Bilibili Emotes
  { code: '[doge]', label: 'Doge', icon: '🐶', platform: 'bilibili', desc: 'Bilibili 经典黄脸' },
  { code: '[妙啊]', label: '妙啊', icon: '🐱', platform: 'bilibili', desc: 'Bilibili 经典黄脸' },
  { code: '[点赞]', label: '点赞', icon: '👍', platform: 'bilibili', desc: 'Bilibili 点赞支持' },
  { code: '[打call]', label: '打call', icon: '🪄', platform: 'bilibili', desc: 'Bilibili 荧光棒打call' },
  { code: '[大笑]', label: '大笑', icon: '😆', platform: 'bilibili', desc: 'Bilibili 大笑黄脸' },
  { code: '[2233·加油]', label: '2233加油', icon: '🎀', platform: 'bilibili', desc: '2233娘官方表情' },
  { code: '[舰长·出航]', label: '舰长专属', icon: '⚓', platform: 'bilibili', isLocked: true, desc: '大航海舰长/提督专属表情' },
  { code: '[充电·比心]', label: '充电表情', icon: '⭐', platform: 'bilibili', isLocked: true, desc: 'UP主充电专属表情包' },

  // YouTube Emotes & Member Stamps
  { code: ':_wave:', label: 'Wave', icon: '👋', platform: 'youtube', desc: 'YouTube 官方挥手问好' },
  { code: ':stayhome:', label: 'StayHome', icon: '🏠', platform: 'youtube', desc: 'YouTube 官方居家表情' },
  { code: ':yougotthis:', label: 'YouGotThis', icon: '💪', platform: 'youtube', desc: 'YouTube 鼓励表情' },
  { code: ':buffering:', label: 'Buffering', icon: '⏳', platform: 'youtube', desc: 'YouTube 缓冲等待' },
  { code: ':member_crown:', label: 'Member皇冠', icon: '👑', platform: 'youtube', isLocked: true, desc: '频道会员专属高级Stamp' },
  { code: ':peko_cheer:', label: '胡萝卜加油', icon: '🥕', platform: 'youtube', isLocked: true, desc: '频道专属自定义会员Stamp' },
  { code: ':super_hype:', label: 'SuperHype', icon: '🔥', platform: 'youtube', isLocked: true, desc: '频道高阶会员特权表情' },

  // Twitch & Danmaku Slang
  { code: 'Pog', label: 'PogChamp', icon: '😲', platform: 'twitch', desc: 'Twitch 高光时刻表情' },
  { code: 'KEKW', label: 'KEKW', icon: '🤣', platform: 'twitch', desc: 'Twitch 爆笑表情' },
  { code: 'Kappa', label: 'Kappa', icon: '😏', platform: 'twitch', desc: 'Twitch 反讽梗表情' },
  { code: '草', label: '草 (kusa)', icon: '🌱', platform: 'twitch', desc: '日韩/弹幕通俗大笑' },
  { code: '2333', label: '2333', icon: '😹', platform: 'twitch', desc: '经典弹幕狂笑' },
  { code: '好耶', label: '好耶', icon: '🎉', platform: 'twitch', desc: '庆祝胜利' },
  { code: 'てぇてぇ', label: 'てぇてぇ', icon: '💖', platform: 'twitch', desc: 'VTuber 甜美互动' },
];

export const EMOTE_LOOKUP: Record<string, { icon: string; name: string; color: string }> = {
  '[doge]': { icon: '🐶', name: 'Doge', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  '[妙啊]': { icon: '🐱', name: '妙啊', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  '[点赞]': { icon: '👍', name: '点赞', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  '[打call]': { icon: '🪄', name: '打call', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  '[大笑]': { icon: '😆', name: '大笑', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  '[2233·加油]': { icon: '🎀', name: '2233娘', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  '[舰长·出航]': { icon: '⚓', name: '舰长专属', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  '[充电·比心]': { icon: '⭐', name: '充电专属', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  ':_wave:': { icon: '👋', name: 'Wave', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  ':stayhome:': { icon: '🏠', name: 'StayHome', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  ':yougotthis:': { icon: '💪', name: 'YouGotThis', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ':buffering:': { icon: '⏳', name: 'Buffering', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  ':member_crown:': { icon: '👑', name: 'Member VIP', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  ':peko_cheer:': { icon: '🥕', name: 'Peko Cheer', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  ':super_hype:': { icon: '🔥', name: 'Super Hype', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  'Pog': { icon: '😲', name: 'PogChamp', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  'KEKW': { icon: '🤣', name: 'KEKW', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  'Kappa': { icon: '😏', name: 'Kappa', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

export const LiveChatDeck: React.FC<LiveChatDeckProps> = ({
  messages,
  onSendMessage,
  onBlockUser,
  onTranslateMessage,
  blockedUsers,
  channels = [],
  onOpenChannelMonitor,
}) => {
  // Only monitor platforms that are explicitly connected and have non-empty identifiers
  const monitoredPlatforms = React.useMemo(() => {
    if (!channels || channels.length === 0) {
      return ['bilibili', 'youtube', 'twitch'] as PlatformType[];
    }
    const active = channels
      .filter((c) => c.isConnected && c.identifier && c.identifier.trim().length > 0)
      .map((c) => c.platform);
    return active;
  }, [channels]);

  const [inputText, setInputText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(monitoredPlatforms);

  // Sync selectedPlatforms with monitoredPlatforms whenever channels change
  useEffect(() => {
    setSelectedPlatforms((prev) => {
      const valid = prev.filter((p) => monitoredPlatforms.includes(p));
      return valid.length > 0 ? valid : monitoredPlatforms;
    });
  }, [monitoredPlatforms]);

  const [visiblePlatforms, setVisiblePlatforms] = useState<Record<PlatformType, boolean>>({
    youtube: true,
    bilibili: true,
    missevan: true,
    twitch: true,
    kick: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState<number>(0.92); // rem
  const [showReadingAids, setShowReadingAids] = useState(true);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [activeEmoteTab, setActiveEmoteTab] = useState<'bilibili' | 'youtube' | 'twitch'>(
    monitoredPlatforms.includes('bilibili') ? 'bilibili' : monitoredPlatforms.includes('youtube') ? 'youtube' : 'twitch'
  );
  const [isAutoScrollLocked, setIsAutoScrollLocked] = useState(false);
  const [targetTranslateLang, setTargetTranslateLang] = useState('en');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom if user is not inspecting history
  useEffect(() => {
    if (!isAutoScrollLocked && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isAutoScrollLocked]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsAutoScrollLocked(!isAtBottom);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || selectedPlatforms.length === 0) return;
    onSendMessage(inputText.trim(), selectedPlatforms);
    setInputText('');
  };

  const insertEmote = (code: string) => {
    setInputText((prev) => `${prev} ${code}`.trim());
    setShowEmotePicker(false);
  };

  // Filter messages: Only show messages from platforms currently being monitored AND enabled in visiblePlatforms
  const filteredMessages = messages.filter((m) => {
    // Hide platform if not monitored
    if (!monitoredPlatforms.includes(m.platform)) return false;
    // Hide if user turned off in filter pill
    if (!visiblePlatforms[m.platform]) return false;
    if (blockedUsers.includes(m.user)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.user.toLowerCase().includes(q) ||
        m.text.toLowerCase().includes(q) ||
        (m.translatedText && m.translatedText.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getPlatformLabel = (platform: PlatformType) => {
    switch (platform) {
      case 'bilibili':
        return '哔哩哔哩';
      case 'youtube':
        return 'YouTube';
      case 'twitch':
        return 'Twitch';
      case 'kick':
        return 'Kick';
      case 'missevan':
        return '猫耳FM';
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Deck Controls Bar */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Monitored Platform Filter Pills - Hides unmonitored platforms completely! */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>监控通道:</span>
          </span>

          {monitoredPlatforms.length === 0 ? (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              未开启任何房间监控
            </span>
          ) : (
            monitoredPlatforms.map((p) => {
              const isVisible = visiblePlatforms[p];
              return (
                <button
                  key={p}
                  onClick={() =>
                    setVisiblePlatforms((prev) => ({ ...prev, [p]: !prev[p] }))
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isVisible
                      ? 'bg-slate-800 border-slate-700 text-slate-100 shadow-sm'
                      : 'bg-slate-950 text-slate-600 border-slate-800 line-through opacity-60'
                  }`}
                  title={`点击显示/隐藏 ${getPlatformLabel(p)} 弹幕流`}
                >
                  <PlatformIcon platform={p} size={14} />
                  <span>{getPlatformLabel(p)}</span>
                </button>
              );
            })
          )}

          {onOpenChannelMonitor && (
            <button
              onClick={onOpenChannelMonitor}
              className="px-2 py-0.5 rounded text-[11px] text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/20 transition-all flex items-center gap-1"
              title="修改要监控的直播间号"
            >
              <Settings2 className="w-3 h-3" />
              <span>设置房间</span>
            </button>
          )}
        </div>

        {/* View Options & Search */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索弹幕或用户名..."
              className="pl-7 pr-2 py-1 bg-slate-800/80 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
            />
          </div>

          {/* Reading Aids Toggle (Ruby Pinyin / Furigana) */}
          <button
            onClick={() => setShowReadingAids((prev) => !prev)}
            className={`px-2 py-1 rounded-md text-xs font-mono font-medium border transition-all ${
              showReadingAids
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="平假名与拼音注音辅助，助主播流利读出外语弹幕与梗"
          >
            Ruby <span className="text-[10px]">あ/拼</span>
          </button>

          {/* Font Size A- / A+ */}
          <div className="flex items-center border border-slate-700/80 rounded-md bg-slate-800 overflow-hidden">
            <button
              onClick={() => setFontSize((f) => Math.max(0.75, f - 0.05))}
              className="p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="减小弹幕字号"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-400">
              {Math.round(fontSize * 100)}%
            </span>
            <button
              onClick={() => setFontSize((f) => Math.min(1.3, f + 0.05))}
              className="p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
              title="加大弹幕字号"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Messages Feed Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/60 font-sans relative"
      >
        {monitoredPlatforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6 space-y-3">
            <div className="p-3 rounded-full bg-slate-800 border border-slate-700">
              <Radio className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">当前未开启任何平台的房间监控</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                请点击上方“设置房间”或顶部“📡 房间监控设置”，输入您想要监听的 B站房间号 或 YouTube 链接。
              </p>
            </div>
            {onOpenChannelMonitor && (
              <button
                onClick={onOpenChannelMonitor}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                立即配置监控房间号
              </button>
            )}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-6">
            <Radio className="w-8 h-8 mb-2 opacity-30 text-indigo-400" />
            <p className="text-xs font-medium">暂无对应平台的实时弹幕</p>
            <p className="text-[11px] text-slate-600 mt-1">
              等待已监控的 {monitoredPlatforms.map(p => getPlatformLabel(p)).join('、')} 房间观众发言...
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const rubyData = showReadingAids ? annotateTextWithRuby(msg.text) : null;
            const isQuestion = msg.isQuestion || msg.text.includes('?') || msg.text.includes('？');

            // Find Bilibili fan medal or fleet guard
            const fanMedalBadge = msg.badges.find(
              (b) => b.type === 'fan_medal' || (b.level && b.level > 0)
            );
            const fleetGuardBadge = msg.badges.find(
              (b) => b.type === 'fleet_guard' || b.type === 'fleet_admiral' || b.type === 'fleet_governor'
            );

            return (
              <div
                key={msg.id}
                className={`pt-1.5 pb-1 px-2 rounded-lg transition-colors group hover:bg-slate-800/50 ${
                  isQuestion ? 'bg-amber-500/5 border-l-2 border-amber-500/40' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-1.5 text-xs">
                    {/* Timestamp */}
                    <span className="text-[10px] font-mono text-slate-500 select-none">
                      {msg.timestamp}
                    </span>

                    {/* Official Site Icon Badge */}
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700/80 shadow-sm"
                      title={getPlatformLabel(msg.platform)}
                    >
                      <PlatformIcon platform={msg.platform} size={12} />
                      <span className="text-[9px] text-slate-300 font-bold">
                        {msg.platform === 'missevan' ? '猫耳' : msg.platform === 'bilibili' ? 'B站' : msg.platform.slice(0, 3).toUpperCase()}
                      </span>
                    </span>

                    {/* Bilibili Fan Medal with Fan Level (粉丝牌 + 等级展示) */}
                    {fanMedalBadge && (
                      <BilibiliMedalBadge
                        medalName={fanMedalBadge.medalName || fanMedalBadge.label.split(' ')[0] || '雅宝'}
                        level={fanMedalBadge.level || 25}
                        guardType={fleetGuardBadge ? (fleetGuardBadge.type as any) : undefined}
                      />
                    )}

                    {/* Other User Badges (YouTube Member, Twitch VIP, etc.) */}
                    {msg.badges
                      .filter((b) => b.type !== 'fan_medal' && !b.level)
                      .map((b, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded text-[10px] font-semibold text-white shadow-sm"
                          style={{ backgroundColor: b.color }}
                        >
                          {b.label}
                        </span>
                      ))}

                    {/* Username */}
                    <span className="font-semibold text-slate-200 hover:underline cursor-pointer">
                      {msg.user}
                    </span>

                    {isQuestion && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <HelpCircle className="w-2.5 h-2.5" />
                        提问
                      </span>
                    )}
                  </div>

                  {/* Message Action Tools (TTS Replay, Translate, Block) */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={() =>
                        tts.enqueue({
                          id: msg.id,
                          text: msg.translatedText || msg.text,
                          speaker: msg.user,
                        })
                      }
                      className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-700/60"
                      title="语音朗读弹幕"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onTranslateMessage(msg.id, targetTranslateLang)}
                      className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-700/60"
                      title={`翻译消息 (${targetTranslateLang})`}
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onBlockUser(msg.user)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700/60"
                      title={`屏蔽用户: ${msg.user}`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Message Body with Emote Parsing & Ruby Support */}
                <div
                  className="mt-0.5 text-slate-100 leading-relaxed break-words"
                  style={{ fontSize: `${fontSize}rem` }}
                >
                  {rubyData && rubyData.rubyHtml !== msg.text ? (
                    <span dangerouslySetInnerHTML={{ __html: rubyData.rubyHtml }} />
                  ) : (
                    <span>
                      {msg.text.split(/(\[[^\]]+\]|:[a-zA-Z0-9_-]+:)/g).map((chunk, idx) => {
                        const emote = EMOTE_LOOKUP[chunk];
                        if (emote) {
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-semibold border ${emote.color} align-middle shadow-sm`}
                              title={`${chunk} (${emote.name})`}
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
                </div>

                {/* Inline Translation / Slang Note */}
                {msg.translatedText && (
                  <div className="mt-1 text-xs text-sky-300/90 bg-sky-950/40 border border-sky-800/40 rounded px-2 py-0.5 flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>{msg.translatedText}</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Scroll Lock Notice Button */}
        {isAutoScrollLocked && (
          <div className="sticky bottom-2 flex justify-center z-10">
            <button
              onClick={() => {
                setIsAutoScrollLocked(false);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-semibold shadow-lg shadow-indigo-500/40 border border-indigo-400/40 transition-transform hover:scale-105"
            >
              <ArrowDown className="w-3 h-3" />
              <span>恢复自动滚屏</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabbed Emote Picker Drawer */}
      {showEmotePicker && (
        <div className="bg-slate-900 border-t border-slate-700 p-2.5 space-y-2 shadow-2xl">
          {/* Tab selector - only show monitored emote platforms */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1 text-xs font-medium">
              <span className="text-slate-400 text-[11px] mr-1">表情包库:</span>
              
              {monitoredPlatforms.includes('bilibili') && (
                <button
                  type="button"
                  onClick={() => setActiveEmoteTab('bilibili')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    activeEmoteTab === 'bilibili'
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlatformIcon platform="bilibili" size={13} />
                  <span>哔哩哔哩 (Bilibili)</span>
                </button>
              )}

              {monitoredPlatforms.includes('youtube') && (
                <button
                  type="button"
                  onClick={() => setActiveEmoteTab('youtube')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    activeEmoteTab === 'youtube'
                      ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlatformIcon platform="youtube" size={13} />
                  <span>YouTube (Stamps)</span>
                </button>
              )}

              {monitoredPlatforms.includes('twitch') && (
                <button
                  type="button"
                  onClick={() => setActiveEmoteTab('twitch')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                    activeEmoteTab === 'twitch'
                      ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PlatformIcon platform="twitch" size={13} />
                  <span>Twitch / 梗</span>
                </button>
              )}
            </div>

            <span className="text-[10px] text-slate-500 font-mono">
              🔒 = 需对应平台会员或勋章权限 (已通过Cookies授权)
            </span>
          </div>

          {/* Emote Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {EMOTE_PACKS.filter((e) => e.platform === activeEmoteTab).map((emote) => (
              <button
                key={emote.code}
                type="button"
                onClick={() => insertEmote(emote.code)}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
                title={`${emote.desc}${emote.isLocked ? ' (需要会员/大航海权限)' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{emote.icon}</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate max-w-[70px]">
                      {emote.label}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 truncate max-w-[70px]">
                      {emote.code}
                    </div>
                  </div>
                </div>
                {emote.isLocked && (
                  <span className="text-[10px] text-amber-400 ml-1" title="会员特权表情">
                    🔒
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Multi-Platform Send Bar - Hides unmonitored platforms completely! */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium">推送目标:</span>
            {monitoredPlatforms.length === 0 ? (
              <span className="text-[11px] text-slate-500">（无监控中的目标平台）</span>
            ) : (
              monitoredPlatforms.map((p) => {
                const checked = selectedPlatforms.includes(p);
                return (
                  <label
                    key={p}
                    className={`flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      checked
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-medium'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlatforms((prev) => [...prev, p]);
                        } else {
                          setSelectedPlatforms((prev) => prev.filter((item) => item !== p));
                        }
                      }}
                    />
                    <PlatformIcon platform={p} size={11} />
                    <span>{getPlatformLabel(p)}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500">AI 实时转译:</span>
            <select
              value={targetTranslateLang}
              onChange={(e) => setTargetTranslateLang(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none"
            >
              <option value="en">English (EN)</option>
              <option value="zh">Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="ko">Korean (한국어)</option>
            </select>
          </div>
        </div>

        {/* Input & Emotes & Send Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmotePicker((prev) => !prev)}
            className={`p-2 rounded-lg border transition-colors ${
              showEmotePicker
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="选择各平台弹幕表情包"
          >
            <Smile className="w-4 h-4 text-amber-400" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={monitoredPlatforms.length === 0}
            placeholder={
              monitoredPlatforms.length === 0
                ? '请先配置并开启监控平台以发言...'
                : `向 ${selectedPlatforms.map((p) => getPlatformLabel(p)).join(' / ')} 发射弹幕 (支持 [doge], 2333, Pog)...`
            }
            className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || selectedPlatforms.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发送</span>
          </button>
        </div>
      </form>
    </div>
  );
};
