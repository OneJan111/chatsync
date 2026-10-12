/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header, AppTab } from './components/Header';
import { LiveChatDeck } from './components/LiveChatDeck';
import { GiftsSuperChatDeck } from './components/GiftsSuperChatDeck';
import { ObsOverlayStudio } from './components/ObsOverlayStudio';
import { StandaloneOverlay } from './components/StandaloneOverlay';
import { AiCoPilot } from './components/AiCoPilot';
import { ObsRemoteControl } from './components/ObsRemoteControl';
import { ArchitectureAudit } from './components/ArchitectureAudit';
import { AndroidAppMode } from './components/AndroidAppMode';
import { ViewerView } from './components/ViewerView';
import { CookieManager } from './components/CookieManager';
import { ChannelMonitorModal } from './components/ChannelMonitorModal';
import { 
  ChatMessage, 
  SuperChatGift, 
  StreamChannelConfig, 
  StreamHotspot,
  PlatformType,
  UserRole,
  ViewerThemeId,
  StreamerThemeId
} from './types';
import { 
  INITIAL_CHANNELS, 
  INITIAL_MESSAGES, 
  INITIAL_GIFTS, 
  RANDOM_CHATTERS, 
  RANDOM_SUPERCHATS 
} from './services/mockData';
import { sound } from './services/sound';
import { tts } from './services/tts';

export default function App() {
  // Check if loaded directly as an OBS Browser Source overlay
  const isStandaloneOverlay =
    typeof window !== 'undefined' &&
    window.location.search.includes('view=standalone-overlay');

  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [userRole, setUserRole] = useState<UserRole>('streamer');
  const [viewerTheme, setViewerTheme] = useState<ViewerThemeId>('cinema_dark');
  const [streamerTheme, setStreamerTheme] = useState<StreamerThemeId>('studio_dark');
  const [isChannelMonitorOpen, setIsChannelMonitorOpen] = useState(false);

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

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [gifts, setGifts] = useState<SuperChatGift[]>(INITIAL_GIFTS);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(3); // seconds between messages
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);

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

  // Live stream incoming simulator loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Pick only from connected channels
      const activeChannels = channels.filter(c => c.isConnected);
      if (activeChannels.length === 0) return;

      const isSuperChat = Math.random() < 0.2;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      if (isSuperChat) {
        const eligibleGifts = RANDOM_SUPERCHATS.filter(s => 
          activeChannels.some(ac => ac.platform === s.platform)
        );
        const randomSc = eligibleGifts.length > 0 
          ? eligibleGifts[Math.floor(Math.random() * eligibleGifts.length)]
          : RANDOM_SUPERCHATS[Math.floor(Math.random() * RANDOM_SUPERCHATS.length)];

        const newGift: SuperChatGift = {
          id: `g-${Date.now()}`,
          platform: randomSc.platform as PlatformType,
          user: `${randomSc.user}_${Math.floor(Math.random() * 90 + 10)}`,
          amount: randomSc.amount,
          currency: randomSc.currency,
          giftName: randomSc.giftName,
          message: randomSc.message,
          timestamp: timeStr,
          isThanked: false,
          tierColor: randomSc.tierColor,
        };

        setGifts((prev) => [...prev, newGift]);
        sound.playSuperChatFanfare();

        // Enqueue to TTS if enabled
        if (tts.getIsEnabled()) {
          tts.enqueue({
            id: newGift.id,
            text: `Super Chat from ${newGift.user}: ${newGift.amount} ${newGift.currency}. ${newGift.message || ''}`,
            isPriority: true,
            speaker: newGift.user,
          });
        }
      } else {
        const eligibleChats = RANDOM_CHATTERS.filter(c => 
          activeChannels.some(ac => ac.platform === c.platform)
        );
        const randomChat = eligibleChats.length > 0
          ? eligibleChats[Math.floor(Math.random() * eligibleChats.length)]
          : RANDOM_CHATTERS[Math.floor(Math.random() * RANDOM_CHATTERS.length)];

        const newMsg: ChatMessage = {
          id: `m-${Date.now()}`,
          platform: randomChat.platform as PlatformType,
          user: `${randomChat.user}`,
          text: randomChat.text,
          timestamp: timeStr,
          badges: (randomChat.badges || []) as any,
          isQuestion: (randomChat as any).isQuestion,
        };

        setMessages((prev) => {
          const maxBufferSize = isEcoMode ? 40 : 250;
          const updated = [...prev, newMsg];
          return updated.slice(-maxBufferSize);
        });

        sound.playChime();

        // Enqueue to TTS if enabled
        if (tts.getIsEnabled()) {
          tts.enqueue({
            id: newMsg.id,
            text: newMsg.text,
            speaker: newMsg.user,
          });
        }
      }
    }, simulationSpeed * 1000);

    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, isEcoMode, channels]);

  const handleSendMessage = (text: string, selectedPlatforms: PlatformType[]) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const outgoingMessages: ChatMessage[] = selectedPlatforms.map((p) => ({
      id: `out-${Date.now()}-${p}`,
      platform: p,
      user: userRole === 'viewer' ? 'MyViewerUser (本机观众)' : 'Streamer (Host 主播)',
      text,
      timestamp: timeStr,
      badges: userRole === 'viewer' 
        ? [{ type: 'fan_medal', label: '雅宝 28', medalName: '雅宝', level: 28, color: '#ec4899' }]
        : [{ type: 'admin', label: 'STREAMER', color: '#6366f1' }],
    }));

    setMessages((prev) => [...prev, ...outgoingMessages]);
    sound.playChime();
  };

  const handleBlockUser = (username: string) => {
    setBlockedUsers((prev) => [...prev, username]);
  };

  const handleTranslateMessage = async (msgId: string, targetLang: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    try {
      const res = await fetch('/api/ai/translate-slang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.text,
          targetLang,
          platform: msg.platform,
        }),
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, translatedText: data.translation, translationTargetLang: targetLang }
            : m
        )
      );
    } catch {
      // Fallback
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, translatedText: `[Translated] ${m.text}`, translationTargetLang: targetLang }
            : m
        )
      );
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

  const handleTriggerTestEvent = (type: 'superchat' | 'fleet_guard' | 'chat') => {
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
    } else {
      const testMsg: ChatMessage = {
        id: `m-test-${Date.now()}`,
        platform: 'bilibili',
        user: '弹幕大军',
        text: '草草草，主播这个走位简直绝了 233333333333！',
        timestamp: timeStr,
        badges: [
          { type: 'fleet_guard', label: '舰长', color: '#00d0ff' },
          { type: 'fan_medal', label: '雅宝 28', medalName: '雅宝', level: 28, color: '#ec4899' }
        ],
      };
      setMessages((prev) => [...prev, testMsg]);
      sound.playChime();
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
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${getAppBgClass()}`}>
      {/* Top Header & Master Controls */}
      <Header
        channels={channels}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        toggleSimulation={() => setIsSimulating(!isSimulating)}
        simulationSpeed={simulationSpeed}
        setSimulationSpeed={setSimulationSpeed}
        isAudioMuted={isAudioMuted}
        toggleAudioMuted={() => {
          const next = !isAudioMuted;
          setIsAudioMuted(next);
          sound.setMuted(next);
        }}
        isTtsEnabled={isTtsEnabled}
        toggleTts={() => {
          const next = !isTtsEnabled;
          setIsTtsEnabled(next);
          tts.setEnabled(next);
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
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        
        {/* Chat Tab: Dynamically switches between Viewer View and Streamer Deck */}
        {activeTab === 'chat' && (
          userRole === 'viewer' ? (
            <ViewerView
              messages={messages}
              gifts={gifts}
              channels={channels}
              viewerTheme={viewerTheme}
              setViewerTheme={setViewerTheme}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Live Chat Deck (8 cols on desktop) */}
              <div className="lg:col-span-8">
                <LiveChatDeck
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onBlockUser={handleBlockUser}
                  onTranslateMessage={handleTranslateMessage}
                  blockedUsers={blockedUsers}
                  channels={channels}
                  onOpenChannelMonitor={() => setIsChannelMonitorOpen(true)}
                />
              </div>

              {/* Gifts & Super Chat Tracker (4 cols on desktop) */}
              <div className="lg:col-span-4">
                <GiftsSuperChatDeck
                  gifts={gifts}
                  onToggleThanked={handleToggleThanked}
                  onMarkAllThanked={handleMarkAllThanked}
                  channels={channels}
                />
              </div>
            </div>
          )
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
          <CookieManager />
        )}

        {/* OBS Overlay Studio (WYSIWYG Overlay Designer) */}
        {activeTab === 'overlay' && (
          <ObsOverlayStudio
            messages={messages}
            gifts={gifts}
            onTriggerTestEvent={handleTriggerTestEvent}
          />
        )}

        {/* AI Co-Pilot & Slang Intelligence */}
        {activeTab === 'ai' && (
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
          <span>Multi-Platform Chat v2.0 • 实时多平台弹幕引擎与房间监控</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <button
            onClick={() => setIsChannelMonitorOpen(true)}
            className="text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer"
          >
            📡 配置房间监控号 ({channels.filter(c => c.isConnected).length}在线)
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('cookies')}
            className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            🍪 免登录 Cookies 凭证
          </button>
          <span>•</span>
          <button
            onClick={() => setActiveTab('audit')}
            className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            轻量架构审计
          </button>
        </div>
      </footer>
    </div>
  );
}
