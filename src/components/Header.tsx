import React from 'react';
import { 
  Radio, 
  Tv, 
  Youtube, 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
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
  Cookie
} from 'lucide-react';
import { StreamChannelConfig, UserRole, StreamerThemeId, ViewerThemeId } from '../types';
import { PlatformIcon } from './SiteIcons';
import { APP_LANGUAGES, type AppLanguage } from '../services/i18n';
import { useTranslate } from './LanguageContext';

export type AppTab = 'chat' | 'android' | 'overlay' | 'ai' | 'obs' | 'audit' | 'cookies';

interface HeaderProps {
  channels: StreamChannelConfig[];
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  aiEnabled: boolean;
  isAudioMuted: boolean;
  toggleAudioMuted: () => void;
  isChatTtsEnabled: boolean;
  isGiftTtsEnabled: boolean;
  toggleChatTts: () => void;
  toggleGiftTts: () => void;
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
  appLanguage: AppLanguage;
  onAppLanguageChange: (language: AppLanguage) => void;
}

export const Header: React.FC<HeaderProps> = ({
  channels,
  activeTab,
  setActiveTab,
  aiEnabled,
  isAudioMuted,
  toggleAudioMuted,
  isChatTtsEnabled,
  isGiftTtsEnabled,
  toggleChatTts,
  toggleGiftTts,
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
  appLanguage,
  onAppLanguageChange,
}) => {
  const t = useTranslate();
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
                    {t('Multi-Platform Chat')} <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono font-semibold border border-indigo-500/30">v2.0 Pro</span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {userRole === 'viewer' ? t('观众沉浸观影视界 (免OBS/免登录)') : t('主播导播专业工作台 (OBS/同屏弹幕)')}
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
                title={t('观众视角：无OBS冗余功能，纯粹沉浸弹幕观影与梗百科')}
              >
                <User className="w-3.5 h-3.5" />
                <span>{t('观众模式 (Viewer)')}</span>
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
                title={t('主播视角：完整OBS图层制作室、WebSocket远程控制与答谢管理')}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{t('主播模式 (Streamer)')}</span>
              </button>
            </div>

            {/* Role-Specific Theme Picker */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400 text-[11px]">
                {userRole === 'viewer' ? t('观众主题:') : t('导播主题:')}
              </span>
              {userRole === 'viewer' ? (
                <div className="flex items-center gap-1">
                  {[
                    { id: 'cinema_dark' as const, label: t('影院黑'), color: '#111827' },
                    { id: 'cozy_latte' as const, label: t('暖拿铁'), color: '#d97706' },
                    { id: 'pastel_sakura' as const, label: t('樱花粉'), color: '#ec4899' },
                    { id: 'neon_matrix' as const, label: t('黑客绿'), color: '#22c55e' },
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
                    { id: 'studio_dark' as const, label: t('演播暗夜') },
                    { id: 'cyber_neon' as const, label: t('赛博霓虹') },
                    { id: 'broadcast_pro' as const, label: t('广电专业') },
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
              title={t('配置要监听的直播间号 (B站直播间号、YouTube直播流、Twitch频道等)')}
            >
              <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>{t('📡 房间监控设置')}</span>
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
                    title={`${ch.name}: ${t('已启用监听配置')} (${ch.identifier}); ${t('实际连接状态请查看弹幕页状态栏')}`}
                  >
                    <PlatformIcon platform={ch.platform} size={13} />
                    <span className="capitalize font-semibold text-[10px]">
                      {ch.platform === 'missevan' ? '猫耳FM' : ch.platform === 'bilibili' ? 'Bilibili' : ch.platform}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Controls: Simulator & Audio Toggles */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300">
              <span>{t('语言')}</span>
              <select
                value={appLanguage}
                onChange={(event) => onAppLanguageChange(event.target.value as AppLanguage)}
                className="bg-transparent text-slate-100 outline-none"
                aria-label={t('语言')}
              >
                {APP_LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value} className="bg-slate-900">
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
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

            {/* Audio alerts toggle */}
            <button
              onClick={toggleAudioMuted}
              className={`p-1.5 rounded-lg border transition-all ${
                !isAudioMuted
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
              }`}
              title={isAudioMuted ? t('Super Chat sound chimes: MUTED') : t('Super Chat sound chimes: ENABLED')}
            >
              {!isAudioMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>

            {/* Independent browser TTS controls for chat and gifts */}
            <button
              onClick={toggleChatTts}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                isChatTtsEnabled
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
              }`}
              title={isChatTtsEnabled ? t('自动朗读弹幕已开启') : t('开启自动朗读弹幕')}
            >
              {isChatTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-medium">弹幕TTS</span>
            </button>

            <button
              onClick={toggleGiftTts}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                isGiftTtsEnabled
                  ? 'bg-pink-500/15 border-pink-500/30 text-pink-400 hover:bg-pink-500/25'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
              }`}
              title={isGiftTtsEnabled ? t('自动朗读礼物和醒目留言已开启') : t('开启自动朗读礼物和醒目留言')}
            >
              {isGiftTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-medium">礼物TTS</span>
            </button>

            {/* Eco Mode / Low RAM toggle */}
            <button
              onClick={toggleEcoMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono transition-all ${
                isEcoMode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={t(
                isEcoMode
                  ? 'Eco Mode Active: Caps buffer to 40 items, disables particle effects, uses ~24 MB RAM'
                  : 'Click to enable Ultra-Low RAM / Eco Mode (<25 MB RAM for gaming)'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px]">
                {isEcoMode ? 'Eco ~24MB' : t('标准')}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
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
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t('🎙️ 综合弹幕直播间 (Unified Live Deck)')}</span>
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
            <span>{t('📱 安卓App / 半屏分屏')}</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">{t('半屏优化')}</span>
          </button>

          {/* Cookies Login Management (No Account Needed on App) */}
          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'cookies'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30 font-bold'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
            }`}
            title={t('平台免注册Cookies凭证：本地缓存，免登录本站即可跨平台发弹幕与使用表情包')}
          >
            <Cookie className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('🍪 平台Cookies凭证 (免登录)')}</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 font-mono font-bold">{t('免注册')}</span>
          </button>

          {/* AI Co-Pilot (Both modes enjoy slang & intelligence) */}
          {aiEnabled && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'ai'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-pink-400" />
              <span>{t('AI 弹幕梗百科与智能翻译')}</span>
              <Sparkles className="w-2.5 h-2.5 text-pink-400" />
            </button>
          )}

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
                <span>{t('OBS Overlay Studio (WYSIWYG)')}</span>
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
                <span>{t('OBS Remote (WebSocket v5)')}</span>
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
                <span className="font-semibold">{t('架构审计与低内存路线')}</span>
                <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300 font-mono font-bold">{t('轻量指南')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
