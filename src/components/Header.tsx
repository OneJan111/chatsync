import React from 'react';
import { 
  Radio, 
  Tv, 
  Youtube, 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Play, 
  Pause, 
  Layers, 
  Bot, 
  SlidersHorizontal, 
  GitPullRequest, 
  Flame, 
  Eye, 
  MessageSquare,
  Sparkles,
  Smartphone,
  SplitSquareVertical,
  User,
  Mic,
  Palette,
  Cookie,
  Film
} from 'lucide-react';
import { StreamChannelConfig, UserRole, StreamerThemeId, ViewerThemeId } from '../types';
import { PlatformIcon } from './SiteIcons';

export type AppTab = 'chat' | 'android' | 'overlay' | 'ai' | 'obs' | 'audit' | 'cookies';

interface HeaderProps {
  channels: StreamChannelConfig[];
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  isAudioMuted: boolean;
  toggleAudioMuted: () => void;
  isTtsEnabled: boolean;
  toggleTts: () => void;
  totalViewers: number;
  totalChats: number;
  isEcoMode: boolean;
  toggleEcoMode: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  streamerTheme: StreamerThemeId;
  setStreamerTheme: (theme: StreamerThemeId) => void;
  viewerTheme: ViewerThemeId;
  setViewerTheme: (theme: ViewerThemeId) => void;
  onOpenChannelMonitor: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  channels,
  activeTab,
  setActiveTab,
  isSimulating,
  toggleSimulation,
  simulationSpeed,
  setSimulationSpeed,
  isAudioMuted,
  toggleAudioMuted,
  isTtsEnabled,
  toggleTts,
  totalViewers,
  totalChats,
  isEcoMode,
  toggleEcoMode,
  userRole,
  setUserRole,
  streamerTheme,
  setStreamerTheme,
  viewerTheme,
  setViewerTheme,
  onOpenChannelMonitor,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Logo, Platform Pills & Role Selector */}
          <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                    Multi-Platform Chat <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono font-semibold border border-indigo-500/30">v2.0 Pro</span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {userRole === 'viewer' ? '观众沉浸观影视界 (免OBS/免登录)' : '主播导播专业工作台 (OBS/同屏弹幕)'}
                </p>
              </div>
            </div>

            {/* ROLE SWITCHER PILL (观众视角 vs 主播导播) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
              <button
                onClick={() => {
                  setUserRole('viewer');
                  setActiveTab('chat');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  userRole === 'viewer'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="观众视角：无OBS冗余功能，纯粹沉浸弹幕观影与梗百科"
              >
                <User className="w-3.5 h-3.5" />
                <span>观众模式 (Viewer)</span>
              </button>

              <button
                onClick={() => {
                  setUserRole('streamer');
                  setActiveTab('chat');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  userRole === 'streamer'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="主播视角：完整OBS图层制作室、WebSocket远程控制与答谢管理"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>主播模式 (Streamer)</span>
              </button>
            </div>

            {/* Role-Specific Theme Picker */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400 text-[11px]">
                {userRole === 'viewer' ? '观众主题:' : '导播主题:'}
              </span>
              {userRole === 'viewer' ? (
                <div className="flex items-center gap-1">
                  {[
                    { id: 'cinema_dark' as const, label: '影院黑', color: '#111827' },
                    { id: 'cozy_latte' as const, label: '暖拿铁', color: '#d97706' },
                    { id: 'pastel_sakura' as const, label: '樱花粉', color: '#ec4899' },
                    { id: 'neon_matrix' as const, label: '黑客绿', color: '#22c55e' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setViewerTheme(t.id)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                        viewerTheme === t.id
                          ? 'bg-purple-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {[
                    { id: 'studio_dark' as const, label: '演播暗夜' },
                    { id: 'cyber_neon' as const, label: '赛博霓虹' },
                    { id: 'broadcast_pro' as const, label: '广电专业' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setStreamerTheme(t.id)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                        streamerTheme === t.id
                          ? 'bg-indigo-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Channel Monitor Setup Button */}
            <button
              onClick={onOpenChannelMonitor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600/25 via-indigo-600/25 to-purple-600/25 hover:from-sky-600/40 hover:to-purple-600/40 text-sky-200 border border-sky-500/40 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              title="配置要监听的直播间号 (B站直播间号、YouTube直播流、Twitch频道等)"
            >
              <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>📡 房间监控设置</span>
              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
                {channels.filter((c) => c.isConnected).length}/{channels.length}
              </span>
            </button>

            {/* Platform live status indicators - ONLY show actively monitored channels! */}
            <div className="hidden xl:flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800">
              {channels
                .filter((ch) => ch.isConnected && ch.identifier && ch.identifier.trim().length > 0)
                .map((ch) => (
                  <div
                    key={ch.platform}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-slate-800/90 border-slate-700 text-slate-200 shadow-sm"
                    title={`${ch.name}: 正在监控 (${ch.identifier}) - ${ch.viewerCount.toLocaleString()} 观众`}
                  >
                    <PlatformIcon platform={ch.platform} size={13} />
                    <span className="capitalize font-semibold text-[10px]">
                      {ch.platform === 'missevan' ? '猫耳FM' : ch.platform === 'bilibili' ? 'Bilibili' : ch.platform}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Controls: Simulator & Audio Toggles */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Viewers & Chats Stat Pill */}
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/60 rounded-lg px-2.5 py-1 text-slate-300">
              <span className="flex items-center gap-1 text-emerald-400 font-mono font-medium">
                <Eye className="w-3.5 h-3.5" />
                {totalViewers.toLocaleString()}
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-sky-400 font-mono font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                {totalChats}
              </span>
            </div>

            {/* Live Feed Simulator Control */}
            <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
              <button
                onClick={toggleSimulation}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  isSimulating
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
                title="模拟多平台真实弹幕与大航海舰长/SC涌入"
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-3 h-3 text-emerald-400" />
                    <span>Live 流入中</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>启动模拟</span>
                  </>
                )}
              </button>

              {isSimulating && (
                <div className="flex items-center gap-1 px-1.5">
                  <span className="text-[10px] text-slate-400">速率:</span>
                  {[3, 1.5, 0.8].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setSimulationSpeed(speed)}
                      className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                        simulationSpeed === speed
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {speed === 3 ? '1x' : speed === 1.5 ? '2x' : '5x'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Audio alerts toggle */}
            <button
              onClick={toggleAudioMuted}
              className={`p-1.5 rounded-lg border transition-all ${
                !isAudioMuted
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
              }`}
              title={isAudioMuted ? 'Super Chat sound chimes: MUTED' : 'Super Chat sound chimes: ENABLED'}
            >
              {!isAudioMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>

            {/* Browser TTS Speech Queue toggle */}
            <button
              onClick={toggleTts}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                isTtsEnabled
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
              }`}
              title="Browser Web Speech API TTS Queue"
            >
              {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-medium hidden sm:inline">TTS</span>
            </button>

            {/* Eco Mode / Low RAM toggle */}
            <button
              onClick={toggleEcoMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono transition-all ${
                isEcoMode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={
                isEcoMode
                  ? 'Eco Mode Active: Caps buffer to 40 items, disables particle effects, uses ~24 MB RAM'
                  : 'Click to enable Ultra-Low RAM / Eco Mode (<25 MB RAM for gaming)'
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px]">
                {isEcoMode ? 'Eco ~24MB' : 'Standard'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Navigation: Tailored for Viewer vs Streamer */}
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1 pt-2.5 mt-1 border-t border-slate-800/70">
          
          {/* Main Chat Deck */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'chat'
                ? userRole === 'viewer'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                  : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {userRole === 'viewer' ? <Film className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
            <span>
              {userRole === 'viewer' ? '🎬 观众弹幕影院 (Cinema Deck)' : '🎙️ 综合导播与留言 (Unified Live Deck)'}
            </span>
          </button>

          {/* Android App & Split Screen mode */}
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>📱 安卓App / 半屏分屏</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">半屏优化</span>
          </button>

          {/* Cookies Login Management (No Account Needed on App) */}
          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'cookies'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30 font-bold'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
            }`}
            title="平台免注册Cookies凭证：本地缓存，免登录本站即可跨平台发弹幕与使用表情包"
          >
            <Cookie className="w-3.5 h-3.5 text-amber-400" />
            <span>🍪 平台Cookies凭证 (免登录)</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 font-mono font-bold">免注册</span>
          </button>

          {/* AI Co-Pilot (Both modes enjoy slang & intelligence) */}
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-pink-400" />
            <span>AI 弹幕梗百科与智能翻译</span>
            <Sparkles className="w-2.5 h-2.5 text-pink-400" />
          </button>

          {/* STREAMER-ONLY TABS (Hidden in Viewer Mode) */}
          {userRole === 'streamer' && (
            <>
              <button
                onClick={() => setActiveTab('overlay')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'overlay'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>OBS Overlay Studio (WYSIWYG)</span>
                <span className="px-1 py-0.2 text-[9px] rounded bg-purple-500/30 text-purple-300 font-mono">5 Themes</span>
              </button>

              <button
                onClick={() => setActiveTab('obs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'obs'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>OBS Remote (WebSocket v5)</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === 'audit'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">架构审计与低内存路线</span>
                <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 font-mono font-bold">轻量指南</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
