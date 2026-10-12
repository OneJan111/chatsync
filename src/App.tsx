/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trash2 } from 'lucide-react';
import { Header, AppTab } from './components/Header';
import { LiveChatDeck } from './components/LiveChatDeck';
import { GiftsSuperChatDeck } from './components/GiftsSuperChatDeck';
import { ObsOverlayStudio } from './components/ObsOverlayStudio';
import { StandaloneOverlay } from './components/StandaloneOverlay';
import { AiCoPilot } from './components/AiCoPilot';
import { ObsRemoteControl } from './components/ObsRemoteControl';
import { ArchitectureAudit } from './components/ArchitectureAudit';
import { AndroidAppMode } from './components/AndroidAppMode';
import {
  CookieManager,
  readSavedBilibiliCookie,
  readSavedYoutubeCookie,
} from './components/CookieManager';
import { ChannelMonitorModal } from './components/ChannelMonitorModal';
import { LanguageContext } from './components/LanguageContext';
import { 
  ChatMessage, 
  SuperChatGift, 
  StreamChannelConfig, 
  StreamHotspot,
  SiteEmote,
  PlatformType,
  UserRole,
  ViewerThemeId,
  StreamerThemeId
} from './types';
import { INITIAL_CHANNELS } from './services/mockData';
import { sound } from './services/sound';
import { tts } from './services/tts';
import { cleanChatText, hasReadableChatText } from './services/textCleanup';
import { translateUi, type AppLanguage } from './services/i18n';

const LIVE_FEED_PLATFORMS = ['bilibili', 'youtube', 'missevan'] as const;
type LiveFeedPlatform = (typeof LIVE_FEED_PLATFORMS)[number];
type LiveFeedStatus = {
  state: string;
  error: string | null;
  loginStatus?: 'not_configured' | 'pending' | 'verified' | 'invalid';
  loginError?: string | null;
  emoteError?: string | null;
};
type TranslationPreferences = { enabled: boolean; targetLang: string };

const translateChatText = async (message: ChatMessage, targetLang: string): Promise<string | null> => {
  const text = cleanChatText(message.text);
  if (!hasReadableChatText(text)) return '';
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      targetLang,
      platform: message.platform,
    }),
  });
  const result = await response.json() as {
    translation?: unknown;
    sameLanguage?: unknown;
    error?: unknown;
  };
  if (!response.ok || typeof result.translation !== 'string') {
    throw new Error(typeof result.error === 'string' ? result.error : 'Translation failed');
  }
  if (result.sameLanguage === true
    || result.translation.trim().toLowerCase() === text.trim().toLowerCase()) {
    return null;
  }
  return result.translation;
};

export default function App() {
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem('chatsync_language');
    return saved === 'zh' || saved === 'ja' || saved === 'en' ? saved : 'en';
  });
  const t = (text: string) => translateUi(text, appLanguage);

  useEffect(() => {
    localStorage.setItem('chatsync_language', appLanguage);
    document.documentElement.lang = appLanguage === 'zh' ? 'zh-CN' : appLanguage;
  }, [appLanguage]);

  // Check if loaded directly as an OBS Browser Source overlay
  const isStandaloneOverlay =
    typeof window !== 'undefined' &&
    window.location.search.includes('view=standalone-overlay');

  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [userRole, setUserRole] = useState<UserRole>('streamer');
  const [viewerTheme, setViewerTheme] = useState<ViewerThemeId>('cinema_dark');
  const [streamerTheme, setStreamerTheme] = useState<StreamerThemeId>('studio_dark');
  const [isChannelMonitorOpen, setIsChannelMonitorOpen] = useState(false);
  const [bilibiliCookie, setBilibiliCookie] = useState(readSavedBilibiliCookie);
  const [youtubeCookie, setYoutubeCookie] = useState(readSavedYoutubeCookie);
  const [siteEmotes, setSiteEmotes] = useState<SiteEmote[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [liveChannelDefaults, setLiveChannelDefaults] = useState<Partial<Record<LiveFeedPlatform, string>>>({});
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({});
  const [isAutoTranslateEnabled, setIsAutoTranslateEnabled] = useState(true);
  const [targetTranslateLang, setTargetTranslateLang] = useState('en');
  const [showReadingAids, setShowReadingAids] = useState(true);
  const [liveFeedStatuses, setLiveFeedStatuses] = useState<Partial<Record<LiveFeedPlatform, LiveFeedStatus>>>({});
  const [clearChatsError, setClearChatsError] = useState<string | null>(null);
  const [isClearingLiveChats, setIsClearingLiveChats] = useState(false);
  const feedCursors = useRef<Record<LiveFeedPlatform, number>>({
    bilibili: 0,
    youtube: 0,
    missevan: 0,
  });
  const feedPollGeneration = useRef(0);
  const emoteCatalogLoaded = useRef({ bilibili: false, youtube: false });
  const clearingLiveChats = useRef(false);
  const handledMessageIds = useRef(new Set<string>());
  const handledGiftIds = useRef(new Set<string>());
  const translationPreferences = useRef<TranslationPreferences>({ enabled: true, targetLang: 'en' });
  translationPreferences.current = {
    enabled: isAutoTranslateEnabled && targetTranslateLang !== 'none',
    targetLang: targetTranslateLang,
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Server configuration returned HTTP ${response.status}`);
        const config = await response.json() as {
          aiEnabled?: unknown;
          liveChannelDefaults?: Partial<Record<LiveFeedPlatform, unknown>>;
        };
        if (!cancelled) {
          setAiEnabled(config.aiEnabled === true);
          const defaults = config.liveChannelDefaults;
          if (defaults) {
            setLiveChannelDefaults(Object.fromEntries(
              Object.entries(defaults).filter((entry): entry is [LiveFeedPlatform, string] =>
                typeof entry[1] === 'string' && Boolean(entry[1].trim())
              )
            ));
          }
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load server feature configuration:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSavedChannelConfig = typeof window !== 'undefined'
    && Boolean(localStorage.getItem('danmaku_monitored_channels'));
  const [channels, setChannels] = useState<StreamChannelConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('danmaku_monitored_channels');
      if (saved) {
        try {
          const parsed: StreamChannelConfig[] = JSON.parse(saved);
          return parsed.map((ch) =>
            ch.platform === 'missevan' ? { ...ch, name: '猫耳FM' } : ch
          );
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_CHANNELS;
  });

  useEffect(() => {
    if (hasSavedChannelConfig || Object.keys(liveChannelDefaults).length === 0) return;
    setChannels((previous) => previous.map((channel) => ({
      ...channel,
      identifier: liveChannelDefaults[channel.platform as LiveFeedPlatform] || channel.identifier,
    })));
  }, [hasSavedChannelConfig, liveChannelDefaults]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gifts, setGifts] = useState<SuperChatGift[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isChatTtsEnabled, setIsChatTtsEnabled] = useState(false);
  const [isGiftTtsEnabled, setIsGiftTtsEnabled] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);
  const ttsPreferences = useRef({ chat: false, gifts: false });
  ttsPreferences.current = { chat: isChatTtsEnabled, gifts: isGiftTtsEnabled };

  useEffect(() => {
    let cancelled = false;
    emoteCatalogLoaded.current = { bilibili: false, youtube: false };
    setSiteEmotes([]);
    for (const platform of LIVE_FEED_PLATFORMS) {
      const channel = channels.find((item) => item.platform === platform);
      const enabled = Boolean(channel?.isConnected && channel.identifier.trim());
      fetch(`/api/${platform}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          identifier: channel?.identifier || '',
          ...(platform === 'bilibili' ? { cookie: bilibiliCookie } : {}),
          ...(platform === 'youtube' ? { cookie: youtubeCookie } : {}),
        }),
      })
        .then(async (response) => {
          const result = await response.json() as LiveFeedStatus;
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (!cancelled) setLiveFeedStatuses((prev) => ({ ...prev, [platform]: result }));
        })
        .catch((error: unknown) => {
          console.error(`Failed to configure ${platform} live feed:`, error);
          if (!cancelled) {
            setLiveFeedStatuses((prev) => ({
              ...prev,
              [platform]: {
                state: 'error',
                error: error instanceof Error ? error.message : '连接配置失败',
              },
            }));
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [channels, bilibiliCookie, youtubeCookie]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pollFeeds = async () => {
      if (clearingLiveChats.current) {
        timer = setTimeout(() => void pollFeeds(), 1_500);
        return;
      }
      const pollGeneration = feedPollGeneration.current;
      const newMessages: ChatMessage[] = [];
      const newGifts: SuperChatGift[] = [];
      const nextStatuses: Partial<Record<LiveFeedPlatform, LiveFeedStatus>> = {};
      const nextCursors: Partial<Record<LiveFeedPlatform, number>> = {};
      const nextSiteEmotes: Partial<Record<'bilibili' | 'youtube', SiteEmote[]>> = {};
      await Promise.all(LIVE_FEED_PLATFORMS.map(async (platform) => {
        try {
          const includeEmotes = (platform === 'bilibili' || platform === 'youtube')
            && !emoteCatalogLoaded.current[platform];
          const emotesQuery = includeEmotes ? '&includeEmotes=true' : '';
          const response = await fetch(
            `/api/${platform}/feed?after=${feedCursors.current[platform]}${emotesQuery}`,
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json() as {
            status: LiveFeedStatus;
            messages: { id: number; message: ChatMessage }[];
            gifts?: { id: number; gift: SuperChatGift }[];
            emotes?: SiteEmote[];
          };
          nextStatuses[platform] = result.status;
          if ((platform === 'bilibili' || platform === 'youtube') && Array.isArray(result.emotes)) {
            nextSiteEmotes[platform] = result.emotes;
            emoteCatalogLoaded.current[platform] = true;
          }
          for (const entry of result.messages) {
            nextCursors[platform] = Math.max(nextCursors[platform] || feedCursors.current[platform], entry.id);
            newMessages.push(entry.message);
          }
          for (const entry of result.gifts || []) {
            nextCursors[platform] = Math.max(nextCursors[platform] || feedCursors.current[platform], entry.id);
            newGifts.push(entry.gift);
          }
        } catch (error) {
          console.error(`Failed to read ${platform} live feed:`, error);
          nextStatuses[platform] = {
            state: 'error',
            error: error instanceof Error ? error.message : '读取弹幕失败',
          };
        }
      }));
      if (!cancelled && pollGeneration === feedPollGeneration.current) {
        setLiveFeedStatuses((prev) => ({ ...prev, ...nextStatuses }));
        setSiteEmotes((previous) => [
          ...previous.filter((emote) => !nextSiteEmotes[emote.platform as 'bilibili' | 'youtube']),
          ...(nextSiteEmotes.bilibili || []),
          ...(nextSiteEmotes.youtube || []),
        ]);
        for (const platform of LIVE_FEED_PLATFORMS) {
          feedCursors.current[platform] = nextCursors[platform] ?? feedCursors.current[platform];
        }
        if (newMessages.length > 0) {
          const freshMessages = newMessages.filter((message) => {
            if (handledMessageIds.current.has(message.id)) return false;
            handledMessageIds.current.add(message.id);
            return true;
          });
          setMessages((prev) => {
            const knownIds = new Set(prev.map((message) => message.id));
            return [...prev, ...freshMessages.filter((message) => !knownIds.has(message.id))].slice(-500);
          });
          const preferences = translationPreferences.current;
          const incomingMessages = freshMessages;
          let nextTranslationIndex = 0;
          const translationWorkers = Array.from(
            { length: Math.min(3, incomingMessages.length) },
            async () => {
              while (nextTranslationIndex < incomingMessages.length) {
                const message = incomingMessages[nextTranslationIndex++];
                if (!preferences.enabled) {
                  if (ttsPreferences.current.chat) {
                    tts.enqueue({ id: message.id, text: message.text, speaker: message.user, category: 'chat' });
                  }
                  continue;
                }
                try {
                  const translatedText = await translateChatText(message, preferences.targetLang);
                  if (!translatedText) {
                    setTranslationErrors((prev) => {
                      const next = { ...prev };
                      delete next[message.id];
                      return next;
                    });
                    if (ttsPreferences.current.chat) {
                      tts.enqueue({
                        id: message.id,
                        text: message.text,
                        speaker: message.user,
                        category: 'chat',
                      });
                    }
                    continue;
                  }
                  setMessages((prev) => prev.map((item) => item.id === message.id
                    ? { ...item, translatedText, translationTargetLang: preferences.targetLang }
                    : item));
                  setTranslationErrors((prev) => {
                    const next = { ...prev };
                    delete next[message.id];
                    return next;
                  });
                  const currentPreferences = translationPreferences.current;
                  if (ttsPreferences.current.chat && currentPreferences.enabled
                    && currentPreferences.targetLang === preferences.targetLang) {
                    tts.enqueue({
                      id: message.id,
                      text: translatedText,
                      speaker: message.user,
                      lang: preferences.targetLang,
                      category: 'chat',
                    });
                  } else if (ttsPreferences.current.chat) {
                    tts.enqueue({ id: message.id, text: message.text, speaker: message.user, category: 'chat' });
                  }
                } catch (error: unknown) {
                  console.error('Automatic message translation failed:', error);
                  setTranslationErrors((prev) => ({
                    ...prev,
                    [message.id]: error instanceof Error ? error.message : 'Translation failed',
                  }));
                  if (ttsPreferences.current.chat) {
                    tts.enqueue({ id: message.id, text: message.text, speaker: message.user, category: 'chat' });
                  }
                }
              }
            }
          );
          void Promise.all(translationWorkers);
        }
        if (newGifts.length > 0) {
          const freshGifts = newGifts.filter((gift) => {
            if (handledGiftIds.current.has(gift.id)) return false;
            handledGiftIds.current.add(gift.id);
            return true;
          });
          setGifts((prev) => {
            const knownIds = new Set(prev.map((gift) => gift.id));
            return [...prev, ...freshGifts.filter((gift) => !knownIds.has(gift.id))].slice(-500);
          });
          if (ttsPreferences.current.gifts) {
            for (const gift of freshGifts) {
              const text = gift.currency && gift.amount > 0
                ? gift.giftName
                  ? `感谢 ${gift.user} 送出的 ${gift.amount} ${gift.currency} ${gift.giftName}！${gift.message || ''}`
                  : `来自 ${gift.user} 的醒目留言 ${gift.amount} ${gift.currency}：${gift.message || ''}`
                : `感谢 ${gift.user} ${gift.giftName || ''}！${gift.message || ''}`;
              tts.enqueue({
                id: `gift-${gift.id}`,
                text,
                isPriority: true,
                speaker: gift.user,
                category: 'gift',
              });
            }
          }
        }
      }
      if (!cancelled) timer = setTimeout(() => void pollFeeds(), 1_500);
    };
    void pollFeeds();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Hotspots for DaVinci Resolve & YouTube chapters
  const [hotspots, setHotspots] = useState<StreamHotspot[]>([
    {
      id: 'h-1',
      timestampStart: '00:12:30',
      timestampEnd: '00:14:15',
      peakCpm: 142,
      triggerKeywords: ['360 noscope', 'PogChamp', 'LETS GOOO', '神级'],
      description: 'Clutch 1v3 Victory in Final Circle + $50 Super Chat',
      giftTotal: 250,
    },
    {
      id: 'h-2',
      timestampStart: '00:25:40',
      timestampEnd: '00:27:10',
      peakCpm: 185,
      triggerKeywords: ['草', '23333', '蚌埠住了', '跳崖', 'KEKW'],
      description: 'Teammate Accidental Cliff Jump & Hysterical Danmaku Storm',
      giftTotal: 120,
    },
  ]);

  const handleSendMessage = async (text: string, selectedPlatforms: PlatformType[]): Promise<string | void> => {
    if (!selectedPlatforms.includes('bilibili')) {
      throw new Error('当前仅支持向 Bilibili 发送弹幕，请选择 Bilibili。');
    }
    if (siteEmotes.some((emote) =>
      emote.platform === 'youtube' && text.includes(emote.code))) {
      throw new Error('YouTube 会员表情可在选择器中查看，但目前还不能发送到 YouTube。');
    }
    const response = await fetch('/api/bilibili/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const result = await response.json() as { sent?: boolean; error?: string };
    if (!response.ok || result.sent !== true) {
      throw new Error(result.error || `发送 B 站弹幕失败（HTTP ${response.status}）`);
    }
    sound.playChime();
    const unsupported = selectedPlatforms.filter((platform) => platform !== 'bilibili');
    return unsupported.length
      ? '已发送到 Bilibili；YouTube、猫耳FM、Twitch 和 Kick 暂不支持发送。'
      : undefined;
  };

  const handleBilibiliCookieChange = (cookie: string) => {
    setBilibiliCookie(cookie);
    setLiveFeedStatuses((previous) => ({
      ...previous,
      bilibili: previous.bilibili
        ? {
          ...previous.bilibili,
          loginStatus: cookie.trim() ? 'pending' : 'not_configured',
          loginError: null,
        }
        : undefined,
    }));
  };

  const handleBlockUser = (username: string) => {
    setBlockedUsers((prev) => [...prev, username]);
  };

  const handleTargetTranslateLangChange = (language: string) => {
    setTargetTranslateLang(language);
    if (language === 'none') {
      setIsAutoTranslateEnabled(false);
      setMessages((previous) => previous.map((message) => ({
        ...message,
        translatedText: undefined,
        translationTargetLang: undefined,
      })));
    }
  };

  const handleClearAllChats = async () => {
    if (clearingLiveChats.current) return;
    clearingLiveChats.current = true;
    setIsClearingLiveChats(true);
    setClearChatsError(null);
    feedPollGeneration.current += 1;
    setMessages([]);
    setGifts([]);
    handledGiftIds.current.clear();
    setTranslationErrors({});
    try {
      const response = await fetch('/api/live/clear', { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Failed to clear buffered live chats:', error);
      setClearChatsError(error instanceof Error ? error.message : '清空弹幕失败');
    } finally {
      clearingLiveChats.current = false;
      setIsClearingLiveChats(false);
    }
  };

  const handleTranslateMessage = async (msgId: string, targetLang: string): Promise<string | null> => {
    if (targetLang === 'none') return null;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return null;
    if (!hasReadableChatText(cleanChatText(msg.text))) return null;

    setTranslationErrors((prev) => {
      const next = { ...prev };
      delete next[msgId];
      return next;
    });

    try {
      const translatedText = await translateChatText(msg, targetLang);
      if (!translatedText) {
        setMessages((prev) =>
          prev.map((m) => m.id === msgId
            ? { ...m, translatedText: undefined, translationTargetLang: undefined }
            : m)
        );
        return null;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, translatedText, translationTargetLang: targetLang }
            : m
        )
      );
      return translatedText;
    } catch (error: unknown) {
      console.error('Message translation failed:', error);
      setTranslationErrors((prev) => ({
        ...prev,
        [msgId]: error instanceof Error ? error.message : 'Translation failed',
      }));
      return null;
    }
  };

  const handleToggleThanked = (giftId: string) => {
    setGifts((prev) =>
      prev.map((g) => (g.id === giftId ? { ...g, isThanked: !g.isThanked } : g))
    );
  };

  const handleMarkAllThanked = () => {
    setGifts((prev) => prev.map((g) => ({ ...g, isThanked: true })));
  };

  const handleTriggerTestGift = (type: 'superchat' | 'fleet_guard') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    if (type === 'superchat') {
      const newGift: SuperChatGift = {
        id: `g-test-${Date.now()}`,
        platform: 'youtube',
        user: 'HypeMaster_VIP',
        amount: 50,
        currency: 'USD',
        message: 'TEST EVENT: Let’s break the world record tonight! 🔥',
        timestamp: timeStr,
        isThanked: false,
        tierColor: '#ef4444',
      };
      setGifts((prev) => [...prev, newGift]);
      sound.playSuperChatFanfare();
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } else if (type === 'fleet_guard') {
      const newGift: SuperChatGift = {
        id: `g-test-bili-${Date.now()}`,
        platform: 'bilibili',
        user: '星海巡航舰长',
        amount: 198,
        currency: 'CNY',
        giftName: '开通·舰长 (Fleet Guard)',
        giftIcon: '⚓',
        message: '守护主播！舰队荣耀！',
        timestamp: timeStr,
        isThanked: false,
        tierColor: '#00d0ff',
      };
      setGifts((prev) => [...prev, newGift]);
      sound.playFleetGuardFanfare();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    }
  };

  // If this window is accessed via the OBS Browser Source route (?view=standalone-overlay)
  if (isStandaloneOverlay) {
    return <StandaloneOverlay messages={messages} gifts={gifts} />;
  }

  const totalViewers = channels.reduce((acc, ch) => acc + (ch.isConnected ? ch.viewerCount : 0), 0);

  // Background styling based on active role theme
  const getAppBgClass = () => {
    if (userRole === 'viewer') {
      switch (viewerTheme) {
        case 'cinema_dark':
          return 'bg-black text-slate-100';
        case 'cozy_latte':
          return 'bg-[#120e0c] text-[#f7efe6]';
        case 'pastel_sakura':
          return 'bg-[#140b17] text-[#fce7f3]';
        case 'neon_matrix':
          return 'bg-[#030d07] text-[#86efac]';
      }
    } else {
      switch (streamerTheme) {
        case 'studio_dark':
          return 'bg-slate-950 text-slate-100';
        case 'cyber_neon':
          return 'bg-[#070b19] text-cyan-200';
        case 'broadcast_pro':
          return 'bg-[#0c121e] text-slate-100';
      }
    }
  };

  return (
    <LanguageContext.Provider value={appLanguage}>
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${getAppBgClass()}`}>
      {/* Top Header & Master Controls */}
      <Header
        channels={channels}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aiEnabled={aiEnabled}
        isAudioMuted={isAudioMuted}
        toggleAudioMuted={() => {
          const next = !isAudioMuted;
          setIsAudioMuted(next);
          sound.setMuted(next);
        }}
        isChatTtsEnabled={isChatTtsEnabled}
        isGiftTtsEnabled={isGiftTtsEnabled}
        toggleChatTts={() => {
          const nextChat = !ttsPreferences.current.chat;
          if (tts.setEnabled(nextChat || ttsPreferences.current.gifts)) {
            if (!nextChat) tts.removeCategory('chat');
            setIsChatTtsEnabled(nextChat);
          }
        }}
        toggleGiftTts={() => {
          const nextGifts = !ttsPreferences.current.gifts;
          if (tts.setEnabled(ttsPreferences.current.chat || nextGifts)) {
            if (!nextGifts) tts.removeCategory('gift');
            setIsGiftTtsEnabled(nextGifts);
          }
        }}
        totalViewers={totalViewers}
        totalChats={messages.length}
        isEcoMode={isEcoMode}
        toggleEcoMode={() => setIsEcoMode(!isEcoMode)}
        userRole={userRole}
        setUserRole={setUserRole}
        streamerTheme={streamerTheme}
        setStreamerTheme={setStreamerTheme}
        viewerTheme={viewerTheme}
        setViewerTheme={setViewerTheme}
        onOpenChannelMonitor={() => setIsChannelMonitorOpen(true)}
        appLanguage={appLanguage}
        onAppLanguageChange={setAppLanguage}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs">
          <span className="mr-1 font-semibold text-slate-300">{t('真实弹幕连接:')}</span>
          {LIVE_FEED_PLATFORMS.map((platform) => {
            const labels: Record<LiveFeedPlatform, string> = {
              bilibili: t('哔哩哔哩'),
              youtube: 'YouTube',
              missevan: '猫耳FM',
            };
            const status = liveFeedStatuses[platform];
            const stateLabels: Record<string, string> = {
              connected: t('已连接'),
              connecting: t('连接中'),
              reconnecting: t('重连中'),
              disconnected: t('未连接'),
              error: t('连接失败'),
            };
            const connected = status?.state === 'connected';
            return (
              <span
                key={platform}
                title={[status?.loginError, status?.emoteError, status?.error].filter(Boolean).join(' · ')
                  || `${labels[platform]}: ${stateLabels[status?.state || ''] || t('等待连接')}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                  connected
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : status?.error
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : status?.error ? 'bg-red-400' : 'bg-slate-500'}`} />
                {labels[platform]} · {stateLabels[status?.state || ''] || '等待连接'}
                {status?.loginStatus === 'verified' && ' · ' + t('登录已验证')}
                {status?.loginStatus === 'invalid' && ' · ' + t('Cookie 无效')}
                {status?.emoteError && ' · ' + t('表情加载失败')}
              </span>
            );
          })}
          {LIVE_FEED_PLATFORMS.some((platform) => liveFeedStatuses[platform]?.error) && (
            <span className="min-w-0 flex-1 truncate text-red-300" role="status">
              {LIVE_FEED_PLATFORMS
                .filter((platform) => liveFeedStatuses[platform]?.error)
                .map((platform) => `${platform}: ${liveFeedStatuses[platform]?.error}`)
                .join(' · ')}
            </span>
          )}
          {clearChatsError && (
            <span className="text-red-300" role="alert">{t('清空弹幕失败：')}{clearChatsError}</span>
          )}
          <button
            onClick={handleClearAllChats}
            disabled={isClearingLiveChats}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-rose-500/20 px-2.5 py-1 text-rose-300 hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-60"
            title={t('清空当前显示的所有弹幕，并清除服务端缓存')}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isClearingLiveChats ? t('清空中') : t('清空全部弹幕')}</span>
          </button>
        </div>

        {/* Both roles use the same unified live chat deck. */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <LiveChatDeck
                messages={messages}
                siteEmotes={siteEmotes}
                bilibiliLoginStatus={liveFeedStatuses.bilibili?.loginStatus}
                bilibiliEmoteError={liveFeedStatuses.bilibili?.emoteError}
                onSendMessage={handleSendMessage}
                onBlockUser={handleBlockUser}
                onTranslateMessage={handleTranslateMessage}
                translationErrors={translationErrors}
                blockedUsers={blockedUsers}
                channels={channels}
                onOpenChannelMonitor={() => setIsChannelMonitorOpen(true)}
                isAutoTranslateEnabled={isAutoTranslateEnabled}
                onAutoTranslateChange={setIsAutoTranslateEnabled}
                targetTranslateLang={targetTranslateLang}
                onTargetTranslateLangChange={handleTargetTranslateLangChange}
                showReadingAids={showReadingAids}
                onReadingAidsChange={setShowReadingAids}
              />
            </div>

            <div className="lg:col-span-4">
              <GiftsSuperChatDeck
                gifts={gifts}
                onToggleThanked={handleToggleThanked}
                onMarkAllThanked={handleMarkAllThanked}
                channels={channels}
                showReadingAids={showReadingAids}
              />
            </div>
          </div>
        )}

        {/* Android App & Split Screen Mode */}
        {activeTab === 'android' && (
          <AndroidAppMode
            messages={messages}
            gifts={gifts}
            channels={channels}
            onSendMessage={handleSendMessage}
            onToggleThanked={handleToggleThanked}
          />
        )}

        {/* Local Platform Cookies Manager (No Account / No Login Needed) */}
        {activeTab === 'cookies' && (
          <CookieManager
            bilibiliCookie={bilibiliCookie}
            bilibiliLoginStatus={liveFeedStatuses.bilibili?.loginStatus}
            onBilibiliCookieChange={handleBilibiliCookieChange}
            onYoutubeCookieChange={setYoutubeCookie}
          />
        )}

        {/* OBS Overlay Studio (WYSIWYG Overlay Designer) */}
        {activeTab === 'overlay' && (
          <ObsOverlayStudio
            messages={messages}
            gifts={gifts}
            onTriggerTestEvent={handleTriggerTestGift}
          />
        )}

        {/* AI Co-Pilot & Slang Intelligence */}
        {activeTab === 'ai' && aiEnabled && (
          <AiCoPilot messages={messages} hotspots={hotspots} />
        )}

        {/* OBS WebSocket Remote Control */}
        {activeTab === 'obs' && (
          <ObsRemoteControl messages={messages} />
        )}

        {/* Architectural Audit & Low-Memory Roadmap */}
        {activeTab === 'audit' && (
          <ArchitectureAudit />
        )}
      </main>

      {/* Modal: Channel Monitor Input Setup */}
      <ChannelMonitorModal
        isOpen={isChannelMonitorOpen}
        onClose={() => setIsChannelMonitorOpen(false)}
        channels={channels}
        onUpdateChannels={(newChannels) => setChannels(newChannels)}
      />

      {/* Footer Status Bar */}
      <footer className="border-t border-slate-900/80 bg-slate-950/90 py-3 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Multi-Platform Chat v2.0 • {t('Footer engine label')}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <button
            onClick={() => setIsChannelMonitorOpen(true)}
            className="text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer"
          >
            📡 {t('配置房间监控号')} ({channels.filter(c => c.isConnected).length}{t('在线')})
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('cookies')}
            className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            🍪 {t('免登录 Cookies 凭证')}
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('audit')}
            className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            {t('轻量架构审计')}
          </button>
        </div>
      </footer>
    </div>
    </LanguageContext.Provider>
  );
}
