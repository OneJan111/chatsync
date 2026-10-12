import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  SplitSquareVertical, 
  Maximize2, 
  Minimize2, 
  Vibrate, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Tv, 
  Gift, 
  MessageSquare, 
  Volume2, 
  Settings, 
  Sliders, 
  ExternalLink,
  Flame,
  Gamepad2,
  Sparkles,
  Zap,
  ArrowUpDown
} from 'lucide-react';
import { ChatMessage, SuperChatGift, StreamChannelConfig, PlatformType } from '../types';
import { safeChatImageUrl, splitChatEmotes } from '../services/chatEmotes';
import { sound } from '../services/sound';
import { tts } from '../services/tts';
import { EMOTE_LOOKUP } from './LiveChatDeck';
import { PlatformIcon, BilibiliMedalBadge } from './SiteIcons';
import { useTranslate } from './LanguageContext';

interface AndroidAppModeProps {
  messages: ChatMessage[];
  gifts: SuperChatGift[];
  channels: StreamChannelConfig[];
  onSendMessage: (text: string, platforms: PlatformType[]) => void | Promise<string | void>;
  onToggleThanked: (id: string) => void;
}

export const AndroidAppMode: React.FC<AndroidAppModeProps> = ({
  messages,
  gifts,
  channels,
  onSendMessage,
  onToggleThanked,
}) => {
  const t = useTranslate();
  // Mode selection: 'split' (half screen), 'fullscreen' (phone full app), 'pip' (floating window)
  const [viewMode, setViewMode] = useState<'split' | 'fullscreen' | 'pip'>('split');
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for top game vs bottom chat
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'gifts' | 'tts' | 'apk'>('chat');
  const [isHapticEnabled, setIsHapticEnabled] = useState(true);
  const [pipOpacity, setPipOpacity] = useState(0.85);
  const [copiedCapacitor, setCopiedCapacitor] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Catch PWA beforeinstallprompt on Android browsers
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const triggerInstallPwa = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(() => {
        setInstallPrompt(null);
      });
    } else {
      alert(t('提示：在手机浏览器（Chrome/Edge）中点击右上角“⋮”菜单，选择“添加到主屏幕”即可安装为独立安卓App！'));
    }
  };

  // Trigger Android hardware vibration
  const triggerHaptic = (pattern: number[] = [30, 40, 30]) => {
    if (isHapticEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if unsupported
      }
    }
  };

  const monitoredPlatforms = React.useMemo(() => {
    if (!channels || channels.length === 0) return ['bilibili', 'youtube', 'twitch'] as PlatformType[];
    return channels
      .filter((c) => c.isConnected && c.identifier && c.identifier.trim().length > 0)
      .map((c) => c.platform);
  }, [channels]);

  const displayMessages = React.useMemo(() => {
    return messages.filter((m) => monitoredPlatforms.includes(m.platform));
  }, [messages, monitoredPlatforms]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    setSendError('');
    try {
      await onSendMessage(inputText.trim(), monitoredPlatforms.length > 0 ? monitoredPlatforms : ['bilibili']);
      setInputText('');
      triggerHaptic([20]);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : '弹幕发送失败');
    } finally {
      setIsSending(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCapacitor(true);
    setTimeout(() => setCopiedCapacitor(false), 2000);
  };

  const ANDROID_MANIFEST_SNIPPET = `<!-- AndroidManifest.xml for Split-Screen & Picture-in-Picture -->
<activity
    android:name=".MainActivity"
    android:label="@string/app_name"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:launchMode="singleTask"
    android:exported="true"
    android:resizeableActivity="true"
    android:supportsPictureInPicture="true"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
    
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>

<!-- Required Permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />`;

  const CAPACITOR_CONFIG_SNIPPET = `{
  "appId": "com.danmaku.multiplatform",
  "appName": "Multi-Platform Danmaku",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 1500,
      "backgroundColor": "#090d16"
    }
  }
}`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/20 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Smartphone className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              {t('Android 移动端 & 原生分屏/半屏工作台')}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              Half-Screen / Multi-Window Supported
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {t('支持安卓系统原生分屏模式（上半屏游戏直播、下半屏弹幕互动）、平板折叠屏左右分屏，以及悬浮窗（画中画）模式，并内置震动触感反馈与一键打包 APK 工程。')}
          </p>
        </div>

        {/* Action Buttons: PWA Install & Haptic */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setIsHapticEnabled(!isHapticEnabled);
              triggerHaptic([50, 50]);
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              isHapticEnabled
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={t('开启/关闭安卓手机触感震动反馈')}
          >
            <Vibrate className="w-3.5 h-3.5" />
            <span>{t('震动触感')}: {isHapticEnabled ? t('开') : t('关')}</span>
          </button>

          <button
            onClick={triggerInstallPwa}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('安装为安卓App (PWA)')}</span>
          </button>
        </div>
      </div>

      {/* Screen Mode Switcher */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">{t('运行形态')}:</span>
          
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
              viewMode === 'split'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5 text-emerald-300" />
            <span>{t('半屏 / 分屏模式 (Split-Screen)')}</span>
          </button>

          <button
            onClick={() => setViewMode('fullscreen')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
              viewMode === 'fullscreen'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-300" />
            <span>{t('手机全屏助手 (Full Screen)')}</span>
          </button>

          <button
            onClick={() => setViewMode('pip')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
              viewMode === 'pip'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5 text-purple-300" />
            <span>{t('悬浮窗 / 小窗 (Floating PiP)')}</span>
          </button>
        </div>

        {viewMode === 'split' && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-[11px]">{t('分屏比例')}:</span>
            {[30, 50, 70].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setSplitRatio(ratio)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  splitRatio === ratio
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {ratio === 50 ? '5:5' : ratio === 30 ? '3:7' : '7:3'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Interactive Android Device Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Device Viewport Simulation (Left 7 Cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-[420px] bg-slate-950 border-4 border-slate-800 rounded-[36px] p-2.5 shadow-2xl shadow-emerald-950/20 relative overflow-hidden flex flex-col h-[720px]">
            {/* Phone Top Notch / Camera & Status Bar */}
            <div className="flex items-center justify-between px-4 pt-1.5 pb-2 text-[10px] font-mono text-slate-400 select-none">
              <span className="font-bold text-slate-200">22:30</span>
              <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span className="text-emerald-400">98%</span>
              </div>
            </div>

            {/* SCREEN VIEW CONTENT */}
            {viewMode === 'split' ? (
              /* Half-Screen Mode (Top: Game stream, Bottom: Danmaku hub) */
              <div className="flex-1 flex flex-col overflow-hidden rounded-[24px] border border-slate-800">
                {/* Upper Half: Simulated Live Stream Game (e.g. Apex/Honor of Kings) */}
                <div
                  className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 relative flex flex-col justify-between p-3 overflow-hidden border-b-2 border-indigo-500/40"
                  style={{ height: `${100 - splitRatio}%` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] text-white">
                      <Gamepad2 className="w-3 h-3 text-emerald-400" />
                      <span>{t('上半屏：游戏画面 / 主播推流')}</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-red-500 text-white text-[9px] font-bold animate-pulse">
                      LIVE
                    </span>
                  </div>

                  {/* Danmaku flying across game screen */}
                  <div className="space-y-1 select-none pointer-events-none opacity-80">
                    <div className="text-[11px] text-white font-bold bg-black/30 px-2 py-0.5 rounded w-max animate-pulse">
                      水色之音: 草草草这局直接带飞！2333
                    </div>
                    <div className="text-[11px] text-yellow-300 font-bold bg-black/30 px-2 py-0.5 rounded w-max">
                      SakuraPeko: POG CHAMP CLUTCH!!
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 text-right">
                    分屏拖动线 ⇕
                  </div>
                </div>

                {/* Lower Half: Ultra-Compact Multi-Platform Danmaku Feed */}
                <div
                  className="flex-1 bg-slate-900/95 flex flex-col overflow-hidden"
                  style={{ height: `${splitRatio}%` }}
                >
                  {/* Micro Header */}
                  <div className="px-2.5 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-slate-200">半屏弹幕助手</span>
                      <span className="px-1 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px]">
                        {messages.length} 条
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => triggerHaptic([30])}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title={t('朗读当前最新弹幕')}
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Micro Message Stream */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/40 text-xs">
                    {displayMessages.slice(-15).map((m) => {
                      const fanMedal = m.badges.find((b) => b.type === 'fan_medal' || (b.level && b.level > 0));
                      const fleetGuard = m.badges.find((b) => b.type === 'fleet_guard' || b.type === 'fleet_admiral');

                      return (
                        <div key={m.id} className="pt-1 leading-snug">
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-slate-800 border border-slate-700/80">
                              <PlatformIcon platform={m.platform} size={10} />
                            </span>

                            {fanMedal && (
                              <BilibiliMedalBadge
                                medalName={fanMedal.medalName || fanMedal.label.split(' ')[0] || '雅宝'}
                                level={fanMedal.level || 25}
                                guardType={fleetGuard ? (fleetGuard.type as any) : undefined}
                                className="scale-75 origin-left"
                              />
                            )}

                            <span className="font-bold text-slate-300 truncate max-w-[90px]">
                              {m.user}
                            </span>
                            <span className="text-slate-500 font-mono text-[9px] ml-auto">
                              {m.timestamp}
                            </span>
                          </div>
                        <div className="text-slate-100 mt-0.5 text-[11px]">
                          {m.stickerUrl && safeChatImageUrl(m.stickerUrl) && (
                            <img
                              src={safeChatImageUrl(m.stickerUrl) || undefined}
                              alt={m.text}
                              referrerPolicy="no-referrer"
                              className="inline-block max-h-[120px] max-w-full align-middle"
                            />
                          )}
                          {!m.stickerUrl && splitChatEmotes(m.text, m.emotes).map((chunk, idx) => {
                            const customEmote = m.emotes?.find((emote) => emote.code === chunk);
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
                                  className="inline-flex items-center gap-0.5 px-1 py-0.2 mx-0.5 rounded text-[10px] bg-slate-800 border border-slate-700"
                                >
                                  <span>{emote.icon}</span>
                                  <span className="font-mono">{chunk}</span>
                                </span>
                              );
                            }
                            return <span key={idx}>{chunk}</span>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Compact Send Bar */}
                  <form onSubmit={handleSend} className="p-1.5 bg-slate-950 border-t border-slate-800 flex gap-1">
                    {sendError && <span className="self-center text-[10px] text-red-300" role="alert">{sendError}</span>}
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t('半屏快捷发言...')}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isSending}
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50"
                    >
                      {t(isSending ? '发送中…' : '发送')}
                    </button>
                  </form>
                </div>
              </div>
            ) : viewMode === 'pip' ? (
              /* Floating Window Mode (PiP) */
              <div className="flex-1 bg-gradient-to-b from-slate-950 to-slate-900 rounded-[24px] p-3 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-30 select-none">
                  <Gamepad2 className="w-32 h-32 text-indigo-400" />
                </div>

                {/* Floating Box */}
                <div
                  className="rounded-xl border border-indigo-500/50 p-2.5 space-y-1.5 shadow-2xl backdrop-blur-md relative z-10"
                  style={{
                    backgroundColor: `rgba(15, 23, 42, ${pipOpacity})`,
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-indigo-300 pb-1 border-b border-indigo-500/30">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{t('悬浮小窗弹幕 (PiP)')}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[9px]">{t('可任意拖动/透视')}</span>
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto text-[11px]">
                    {messages.slice(-4).map((m) => (
                      <div key={m.id} className="leading-snug">
                        <span className="font-bold text-sky-400">{m.user}: </span>
                        <span className="text-slate-100">{m.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 text-center text-[10px] text-slate-400">
                  {t('透明度调节')}:
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={pipOpacity}
                    onChange={(e) => setPipOpacity(Number(e.target.value))}
                    className="accent-indigo-500 ml-2 align-middle h-1"
                  />
                </div>
              </div>
            ) : (
              /* Mobile Full-Screen App Mode */
              <div className="flex-1 bg-slate-900 flex flex-col overflow-hidden rounded-[24px]">
                {/* Mobile Top Bar */}
                <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-white">
                  <span>Multi-Platform Chat Mobile</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                    LIVE
                  </span>
                </div>

                {/* Mobile Feed */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className="p-2 bg-slate-800/80 rounded-lg text-xs leading-relaxed">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="font-bold text-slate-200">{m.user}</span>
                        <span className="font-mono">{m.timestamp}</span>
                      </div>
                      <div className="text-slate-100">{m.text}</div>
                    </div>
                  ))}
                </div>

                {/* Mobile Bottom Tabs */}
                <div className="grid grid-cols-4 border-t border-slate-800 bg-slate-950 p-2 text-center text-[10px]">
                  <button className="text-indigo-400 font-bold flex flex-col items-center">
                    <MessageSquare className="w-4 h-4 mb-0.5" /> {t('弹幕')}
                  </button>
                  <button className="text-slate-400 flex flex-col items-center">
                    <Gift className="w-4 h-4 mb-0.5" /> {t('礼物')}
                  </button>
                  <button className="text-slate-400 flex flex-col items-center">
                    <Volume2 className="w-4 h-4 mb-0.5" /> {t('朗读')}
                  </button>
                  <button className="text-slate-400 flex flex-col items-center">
                    <Settings className="w-4 h-4 mb-0.5" /> {t('设置')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Android APK Packaging Guide & Permissions */}
        <div className="lg:col-span-5 space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>{t('安卓原生 APK 打包与分屏配置指南')}</span>
            </h3>
            <button
              onClick={() => copyText(ANDROID_MANIFEST_SNIPPET)}
              className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
            >
              {copiedCapacitor ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCapacitor ? t('已复制清单') : t('复制分屏配置')}</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1">
              <div className="font-bold text-emerald-300">
                1. 原生安卓分屏支持原理 (Multi-Window):
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                在 <code className="text-slate-200 font-mono">AndroidManifest.xml</code> 的主 Activity 中加入 <code className="text-emerald-300 font-mono">android:resizeableActivity="true"</code>，即可解锁 Android 7.0 到 Android 15 的系统级原生上下分屏与小窗！
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1">
              <div className="font-bold text-sky-300">
                2. 3 步打包为独立安卓 APK (Capacitor):
              </div>
              <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 leading-relaxed">
                <li>终端运行：<code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300 font-mono">npm run build</code></li>
                <li>运行：<code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300 font-mono">npx cap add android</code></li>
                <li>运行：<code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300 font-mono">npx cap open android</code>（在 Android Studio 点击 Build APK 即可导出）</li>
              </ol>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1">
              <div className="font-bold text-purple-300">
                3. 免编译快速安装 (手机直接打开即可):
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                手机打开本网页链接后，点击 Chrome/Edge 浏览器的菜单选择<strong>“添加到主屏幕”</strong>，就会像原生 App 一样常驻桌面，支持离线缓存与全屏/分屏。
              </p>
            </div>
          </div>

          {/* Config Code Box */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 mb-1">
              AndroidManifest.xml (分屏核心配置):
            </div>
            <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-48">
              {ANDROID_MANIFEST_SNIPPET}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
