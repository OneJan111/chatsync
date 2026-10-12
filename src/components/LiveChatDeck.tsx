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
  Settings2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ChatMessage, PlatformType, SiteEmote, StreamChannelConfig } from '../types';
import { safeChatImageUrl, splitChatEmotes } from '../services/chatEmotes';
import { tts } from '../services/tts';
import { ReadingAidText } from './ReadingAidText';
import { PlatformIcon, BilibiliMedalBadge } from './SiteIcons';
import { useTranslate } from './LanguageContext';

interface LiveChatDeckProps {
  messages: ChatMessage[];
  siteEmotes: SiteEmote[];
  bilibiliLoginStatus?: 'not_configured' | 'pending' | 'verified' | 'invalid';
  bilibiliEmoteError?: string | null;
  onSendMessage: (text: string, platforms: PlatformType[]) => void | Promise<string | void>;
  onBlockUser: (username: string) => void;
  onTranslateMessage: (msgId: string, targetLang: string) => Promise<string | null>;
  translationErrors: Record<string, string>;
  blockedUsers: string[];
  channels?: StreamChannelConfig[];
  onOpenChannelMonitor?: () => void;
  isAutoTranslateEnabled: boolean;
  onAutoTranslateChange: (enabled: boolean) => void;
  targetTranslateLang: string;
  onTargetTranslateLangChange: (language: string) => void;
  showReadingAids: boolean;
  onReadingAidsChange: (enabled: boolean) => void;
}

export interface EmoteData {
  code: string;
  label: string;
  icon?: string;
  url?: string;
  platform: 'bilibili' | 'youtube' | 'twitch';
  isLocked?: boolean;
  category?: SiteEmote['category'];
  packName?: string;
  isRoomOwner?: boolean;
  unlockHint?: string;
  desc: string;
}

const EMOTE_GROUPS_STORAGE_KEY = 'chatsync_emote_groups_expanded';

const loadExpandedEmoteGroups = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(EMOTE_GROUPS_STORAGE_KEY);
    if (!saved) return {};
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  } catch {
    return {};
  }
};

export const EMOTE_PACKS: EmoteData[] = [
  // Bilibili Emotes
  { code: '[doge]', label: 'Doge', icon: '🐶', platform: 'bilibili', desc: 'Bilibili 经典黄脸' },
  { code: '[妙啊]', label: '妙啊', icon: '🐱', platform: 'bilibili', desc: 'Bilibili 经典黄脸' },
  { code: '[点赞]', label: '点赞', icon: '👍', platform: 'bilibili', desc: 'Bilibili 点赞支持' },
  { code: '[打call]', label: '打call', icon: '🪄', platform: 'bilibili', desc: 'Bilibili 荧光棒打call' },
  { code: '[大笑]', label: '大笑', icon: '😆', platform: 'bilibili', desc: 'Bilibili 大笑黄脸' },
  { code: '[2233·加油]', label: '2233加油', icon: '🎀', platform: 'bilibili', desc: '2233娘官方表情' },
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
  siteEmotes,
  bilibiliLoginStatus = 'not_configured',
  bilibiliEmoteError = null,
  onSendMessage,
  onBlockUser,
  onTranslateMessage,
  translationErrors,
  blockedUsers,
  channels = [],
  onOpenChannelMonitor,
  isAutoTranslateEnabled,
  onAutoTranslateChange,
  targetTranslateLang,
  onTargetTranslateLangChange,
  showReadingAids,
  onReadingAidsChange,
}) => {
  const t = useTranslate();
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
  const [sendError, setSendError] = useState('');
  const [sendNotice, setSendNotice] = useState('');
  const [isSending, setIsSending] = useState(false);
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
  const [expandedEmoteGroups, setExpandedEmoteGroups] = useState(loadExpandedEmoteGroups);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [activeEmoteTab, setActiveEmoteTab] = useState<'bilibili' | 'youtube' | 'twitch'>(
    monitoredPlatforms.includes('bilibili') ? 'bilibili' : monitoredPlatforms.includes('youtube') ? 'youtube' : 'twitch'
  );
  const [isAutoScrollLocked, setIsAutoScrollLocked] = useState(false);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || selectedPlatforms.length === 0 || isSending) return;
    setIsSending(true);
    setSendError('');
    setSendNotice('');
    try {
      const notice = await onSendMessage(inputText.trim(), selectedPlatforms);
      setInputText('');
      setSendNotice(typeof notice === 'string' ? notice : '');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : '弹幕发送失败');
    } finally {
      setIsSending(false);
    }
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

  const activeEmotes = [
    ...EMOTE_PACKS.filter((emote) =>
      emote.platform === activeEmoteTab
      && !siteEmotes.some((siteEmote) =>
        siteEmote.platform === emote.platform && siteEmote.code === emote.code)),
    ...siteEmotes
      .filter((emote) => emote.platform === activeEmoteTab)
      .map((emote): EmoteData => ({
        code: emote.code,
        label: emote.label,
        icon: '',
        url: emote.url,
        platform: emote.platform,
        isLocked: emote.isLocked,
        category: emote.category,
        packName: emote.packName,
        isRoomOwner: emote.isRoomOwner,
        unlockHint: emote.unlockHint,
        desc: emote.unlockHint || emote.label,
      })),
  ];
  const bilibiliEmoteCounts = siteEmotes
    .filter((emote) => emote.platform === 'bilibili')
    .reduce((counts, emote) => {
      const category = emote.category || 'general';
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {} as Partial<Record<NonNullable<SiteEmote['category']>, number>>);
  const emoteGroups = activeEmotes.reduce((groups, emote) => {
    const group = emote.platform === 'bilibili'
      ? `${emote.category || 'general'}\u0000${emote.packName || '常用表情'}`
      : emote.category === 'member'
        ? `${emote.category}\u0000${emote.packName || '会员表情'}`
      : emote.platform;
    groups.set(group, [...(groups.get(group) || []), emote]);
    return groups;
  }, new Map<string, EmoteData[]>());
  const isPriorityEmoteGroup = (emotes: EmoteData[]) =>
    emotes.some((emote) => emote.category === 'room'
      || emote.category === 'charge'
      || emote.isRoomOwner);
  const getEmoteGroupPriority = (emotes: EmoteData[]) => {
    if (emotes.some((emote) => emote.category === 'room')) return 0;
    if (emotes.some((emote) => emote.category === 'charge')) return 1;
    if (emotes.some((emote) => emote.isRoomOwner)) return 2;
    return 3;
  };
  const isEmoteGroupExpanded = (group: string, emotes: EmoteData[]) =>
    expandedEmoteGroups[group] ?? isPriorityEmoteGroup(emotes);
  const orderedEmoteGroups = [...emoteGroups.entries()].sort(([groupA, emotesA], [groupB, emotesB]) => {
    const expandedA = isEmoteGroupExpanded(groupA, emotesA);
    const expandedB = isEmoteGroupExpanded(groupB, emotesB);
    return Number(expandedB) - Number(expandedA)
      || getEmoteGroupPriority(emotesA) - getEmoteGroupPriority(emotesB);
  });
  const toggleEmoteGroup = (group: string, emotes: EmoteData[]) => {
    const next = {
      ...expandedEmoteGroups,
      [group]: !isEmoteGroupExpanded(group, emotes),
    };
    setExpandedEmoteGroups(next);
    try {
      localStorage.setItem(EMOTE_GROUPS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the current session's expanded state even if browser storage is unavailable.
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
            <span>{t('监控通道')}</span>
          </span>

          {monitoredPlatforms.length === 0 ? (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              {t('未开启任何房间监控')}
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
              title={t('修改要监控的直播间号')}
            >
              <Settings2 className="w-3 h-3" />
              <span>{t('设置房间')}</span>
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
              placeholder={t('搜索弹幕或用户名...')}
              className="pl-7 pr-2 py-1 bg-slate-800/80 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
            />
          </div>

          {/* Reading Aids Toggle (Ruby Pinyin / Furigana) */}
          <button
            onClick={() => onAutoTranslateChange(!isAutoTranslateEnabled)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
              isAutoTranslateEnabled
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={isAutoTranslateEnabled ? t('自动翻译新弹幕已开启') : t('自动翻译新弹幕已关闭')}
            aria-pressed={isAutoTranslateEnabled}
          >
            <Languages className="w-3 h-3" />
            <span>{t('自动翻译')}</span>
          </button>
          <select
            value={targetTranslateLang}
            onChange={(event) => onTargetTranslateLangChange(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            aria-label={t('自动翻译目标语言')}
          >
            <option value="none">{t('不翻译')}</option>
            <option value="en">{t('English')}</option>
            <option value="zh">{t('简体中文')}</option>
            <option value="ja">{t('日本語')}</option>
            <option value="ko">{t('한국어')}</option>
          </select>

          {/* Reading Aids Toggle (Ruby Pinyin / Furigana) */}
          <button
            onClick={() => onReadingAidsChange(!showReadingAids)}
            className={`px-2 py-1 rounded-md text-xs font-mono font-medium border transition-all ${
              showReadingAids
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={t('平假名与拼音注音辅助，助主播流利读出外语弹幕与梗')}
          >
            Ruby <span className="text-[10px]">あ/拼</span>
          </button>

          {/* Font Size A- / A+ */}
          <div className="flex items-center border border-slate-700/80 rounded-md bg-slate-800 overflow-hidden">
            <button
              onClick={() => setFontSize((f) => Math.max(0.75, f - 0.05))}
              className="p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
              title={t('减小弹幕字号')}
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-400">
              {Math.round(fontSize * 100)}%
            </span>
            <button
              onClick={() => setFontSize((f) => Math.min(1.3, f + 0.05))}
              className="p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
              title={t('增大弹幕字号')}
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
              <h3 className="font-bold text-white text-sm">{t('当前未开启任何平台的房间监控')}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {t('请点击上方“设置房间”或顶部“📡 房间监控设置”，输入您想要监听的 B站房间号 或 YouTube 链接。')}
              </p>
            </div>
            {onOpenChannelMonitor && (
              <button
                onClick={onOpenChannelMonitor}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                {t('立即配置监控房间号')}
              </button>
            )}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-6">
            <Radio className="w-8 h-8 mb-2 opacity-30 text-indigo-400" />
            <p className="text-xs font-medium">{t('暂无对应平台的实时弹幕')}</p>
            <p className="text-[11px] text-slate-600 mt-1">
              {t('等待已监控的')} {monitoredPlatforms.map(p => getPlatformLabel(p)).join('、')} {t('房间观众发言...')}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isQuestion = msg.isQuestion || msg.text.includes('?') || msg.text.includes('？');
            const messageHasJapaneseKana = /[\u3040-\u30ff]/u.test(msg.text);
            const languageHint = msg.platform === 'bilibili' ? 'zh'
              : msg.platform === 'missevan' || messageHasJapaneseKana ? 'ja'
                : undefined;

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
                      <ReadingAidText text={msg.user} enabled={showReadingAids} languageHint={languageHint} />
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
                          category: 'chat',
                        })
                      }
                      className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-700/60"
                      title={t('语音朗读弹幕')}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onTranslateMessage(msg.id, targetTranslateLang)}
                      disabled={targetTranslateLang === 'none'}
                      className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-700/60"
                      title={targetTranslateLang === 'none' ? t('选择翻译语言后才能手动翻译') : `${t('翻译消息')} (${targetTranslateLang})`}
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
                  {msg.stickerUrl && safeChatImageUrl(msg.stickerUrl) && (
                    <img
                      src={safeChatImageUrl(msg.stickerUrl) || undefined}
                      alt={msg.text}
                      title={msg.text}
                      referrerPolicy="no-referrer"
                      className="inline-block max-h-[120px] max-w-full align-middle"
                    />
                  )}
                  {!msg.stickerUrl && (
                  <span>
                    {splitChatEmotes(msg.text, msg.emotes).map((chunk, idx) => {
                      const customEmote = msg.emotes?.find((emote) => emote.code === chunk);
                      const customUrl = safeChatImageUrl(customEmote?.url);
                      if (customEmote && customUrl) {
                        return (
                          <img
                            key={idx}
                            src={customUrl}
                            alt={customEmote.code}
                            title={customEmote.code}
                            referrerPolicy="no-referrer"
                            className="inline-block h-[1.6em] max-w-[5em] object-contain align-middle mx-0.5"
                          />
                        );
                      }
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
                      return <ReadingAidText key={idx} text={chunk} enabled={showReadingAids} languageHint={languageHint} />;
                    })}
                  </span>
                  )}
                </div>

                {/* Inline Translation / Slang Note */}
                {msg.translatedText && (
                  <div className="mt-1 text-xs text-sky-300/90 bg-sky-950/40 border border-sky-800/40 rounded px-2 py-0.5 flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>
                      <ReadingAidText
                        text={msg.translatedText}
                        enabled={showReadingAids}
                        languageHint={msg.translationTargetLang === 'zh' ? 'zh'
                          : msg.translationTargetLang === 'ja' ? 'ja' : undefined}
                      />
                    </span>
                  </div>
                )}
                {translationErrors[msg.id] && (
                  <div className="mt-1 text-xs text-red-300" role="alert">
                    翻译失败：{translationErrors[msg.id]}
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
          <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
            {activeEmoteTab === 'bilibili' && bilibiliEmoteError && (
              <p className="text-[11px] text-amber-300" role="status">
                B 站房间/装扮表情加载失败：{bilibiliEmoteError}
              </p>
            )}
            {activeEmoteTab === 'bilibili' && bilibiliLoginStatus !== 'verified' && (
              <p className="text-[11px] text-amber-300" role="status">
                {bilibiliLoginStatus === 'invalid'
                  ? 'B 站 Cookie 登录验证失败；房间专属和装扮表情通常需要有效登录 Cookie。请在 Cookie 页面更新后重新连接房间。'
                  : bilibiliLoginStatus === 'pending'
                    ? '正在验证 B 站 Cookie。房间专属和装扮表情需要有效登录 Cookie。'
                    : '尚未配置已验证的 B 站 Cookie；房间专属和装扮表情需要登录后才能加载。'}
              </p>
            )}
            {activeEmoteTab === 'bilibili' && (
              <p className="text-[10px] text-slate-400" role="status">
                房间专属 {bilibiliEmoteCounts.room || 0} · 装扮 {bilibiliEmoteCounts.garb || 0} · 通用 {bilibiliEmoteCounts.general || 0} · 充电 {bilibiliEmoteCounts.charge || 0}
              </p>
            )}
            {orderedEmoteGroups.map(([group, emotes]) => {
              const separator = group.indexOf('\u0000');
              const category = separator >= 0 ? group.slice(0, separator) : group;
              const packName = separator >= 0 ? group.slice(separator + 1) : '';
              const categoryName = category === 'member' ? '会员表情'
                : category === 'charge' ? '充电表情'
                : category === 'room' ? '房间专属'
                  : category === 'garb' ? '装扮表情'
                    : category === 'general' ? '通用表情'
                      : category === 'youtube' ? 'YouTube 表情'
                        : category === 'twitch' ? 'Twitch / 梗'
                          : category;
              const isExpanded = isEmoteGroupExpanded(group, emotes);
              return (
                <section key={group} className="rounded border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => toggleEmoteGroup(group, emotes)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-1 px-1.5 py-1 text-left text-[10px] font-semibold text-slate-400 hover:text-slate-200"
                  >
                    {isExpanded
                      ? <ChevronDown className="h-3 w-3 shrink-0" />
                      : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <span className="truncate">
                      {categoryName}{packName && packName !== categoryName ? ` · ${packName}` : ''}
                    </span>
                    <span className="ml-auto shrink-0 text-slate-500">{emotes.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 p-1.5 pt-0">
                      {emotes.map((emote) => (
                        <button
                          key={emote.code}
                          type="button"
                          onClick={() => insertEmote(emote.code)}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
                          title={`${emote.desc}${emote.isLocked ? ` (${emote.unlockHint || '需要对应平台权限'})` : ''}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {emote.url && safeChatImageUrl(emote.url) ? (
                              <img
                                src={safeChatImageUrl(emote.url) || undefined}
                                alt={emote.label}
                                className="w-6 h-6 object-contain shrink-0"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-base">{emote.icon}</span>
                            )}
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate max-w-[70px]">
                                {emote.label}
                              </div>
                              <div className="text-[9px] font-mono text-slate-400 truncate max-w-[70px]">
                                {emote.code}
                              </div>
                            </div>
                          </div>
                          {emote.isLocked && (
                            <span className="text-[10px] text-amber-400 ml-1" title={emote.unlockHint || '会员特权表情'}>
                              🔒
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
            {activeEmotes.length === 0 && (
              <p className="py-3 text-center text-[11px] text-slate-500">
                {activeEmoteTab === 'bilibili'
                  ? '当前房间没有可加载的表情包，或登录 Cookie 未通过验证。'
                  : '没有可用表情。'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Outgoing Multi-Platform Send Bar - Hides unmonitored platforms completely! */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        {sendError && <p className="text-[11px] text-red-300" role="alert">{sendError}</p>}
        {sendNotice && <p className="text-[11px] text-amber-300" role="status">{sendNotice}</p>}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium">{t('推送目标:')}</span>
            {monitoredPlatforms.length === 0 ? (
              <span className="text-[11px] text-slate-500">{t('（无监控中的目标平台）')}</span>
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
            <span className="text-[11px] text-slate-500">{t('实时转译:')}</span>
            <select
              value={targetTranslateLang}
              onChange={(e) => onTargetTranslateLangChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none"
            >
              <option value="none">{t('不翻译')}</option>
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
            title={t('选择各平台弹幕表情包')}
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
            disabled={!inputText.trim() || selectedPlatforms.length === 0 || isSending}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? '发送中…' : '发送'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
