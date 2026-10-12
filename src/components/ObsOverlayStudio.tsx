import React, { useState } from 'react';
import { 
  Layers, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Eye, 
  Sliders, 
  Code, 
  Palette,
  Tv, 
  Play
} from 'lucide-react';
import { ChatMessage, SuperChatGift, OverlayConfig, OverlayThemeId, PlatformType } from '../types';
import { PlatformIcon, BilibiliMedalBadge } from './SiteIcons';
import { useTranslate } from './LanguageContext';

interface ObsOverlayStudioProps {
  messages: ChatMessage[];
  gifts: SuperChatGift[];
  onTriggerTestEvent: (type: 'superchat' | 'fleet_guard') => void;
}

export const ObsOverlayStudio: React.FC<ObsOverlayStudioProps> = ({
  messages,
  gifts,
  onTriggerTestEvent,
}) => {
  const t = useTranslate();
  const [config, setConfig] = useState<OverlayConfig>({
    theme: 'sakura',
    maxMessages: 7,
    maxSuperChats: 3,
    showUsernames: true,
    showPlatformBadges: true,
    showReadingAids: true,
    fontSize: 1.0,
    backgroundOpacity: 0.85,
    selectedPlatforms: ['youtube', 'bilibili', 'twitch', 'kick', 'missevan'],
    filterBots: false,
    showCustomNotice: true,
    customNoticeText: '🌟 Sub Goal: 9,850 / 10,000 | Discord: !discord',
    customCss: '',
  });

  const [previewBg, setPreviewBg] = useState<'checker' | 'game' | 'camera'>('game');
  const [copied, setCopied] = useState(false);

  // Generate dynamic OBS Browser Source URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const overlayUrl = `${currentOrigin}/?view=standalone-overlay&theme=${config.theme}&n=${config.maxMessages}&sc=${config.maxSuperChats}&ruby=${config.showReadingAids}&name=${config.showUsernames}&opacity=${config.backgroundOpacity}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getThemeClass = (theme: OverlayThemeId) => {
    switch (theme) {
      case 'sakura':
        return 'border-pink-500/30 bg-slate-950/80 backdrop-blur-md shadow-pink-500/10 text-pink-50';
      case 'cyberpunk':
        return 'border-cyan-500/50 bg-black/90 backdrop-blur-md shadow-cyan-500/20 text-cyan-30 font-mono';
      case 'minimal':
        return 'border-slate-800 bg-slate-950/90 text-slate-100';
      case 'arcade':
        return 'border-amber-500/50 bg-slate-900/95 font-mono text-amber-200 border-2';
      case 'danmaku':
        return 'border-transparent bg-transparent text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/20 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              {t('OBS Studio Browser Source Designer & Generator')}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {t('Single-Port Realtime Sync')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t('In the original OBS version, a second server on port 8502 blocked cloud deployment. In v2.0, the overlay runs directly with instant CSS theming and OBS Browser Source transparency.')}
          </p>
        </div>

        {/* Copy OBS Browser Source URL Button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={copyUrl}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t('URL Copied!') : t('Copy OBS Browser Source URL')}</span>
          </button>

          <a
            href={overlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title={t('Open standalone overlay in popout window')}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Visual Controls & Theme Selector */}
        <div className="lg:col-span-5 space-y-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('Select Overlay Theme Preset')}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'sakura', name: t('🌸 Sakura Anime Glass'), desc: t('Frosted blur & pastel vibes') },
                { id: 'cyberpunk', name: t('⚡ Cyberpunk Neon'), desc: t('High contrast cyan/magenta') },
                { id: 'minimal', name: t('🖤 Streamer Minimal Dark'), desc: t('Clean esports broadcast style') },
                { id: 'arcade', name: t('👾 Retro Pixel Arcade'), desc: t('8-bit retro arcade aesthetic') },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setConfig((prev) => ({ ...prev, theme: theme.id as OverlayThemeId }))}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    config.theme === theme.id
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs">{theme.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{theme.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Density & Layout Controls */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('Display & Pinning Options')}</span>
            </h3>

            {/* Max Regular Messages */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t('Chat Messages shown:')}</span>
                <span className="font-mono text-white font-bold">{config.maxMessages} {t('msgs')}</span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                value={config.maxMessages}
                onChange={(e) => setConfig((prev) => ({ ...prev, maxMessages: Number(e.target.value) }))}
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Max Super Chats Pinned */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t('Pinned Super Chats & Gifts:')}</span>
                <span className="font-mono text-white font-bold">{config.maxSuperChats} {t('pinned')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                value={config.maxSuperChats}
                onChange={(e) => setConfig((prev) => ({ ...prev, maxSuperChats: Number(e.target.value) }))}
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Font scale */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t('Overlay Font Size:')}</span>
                <span className="font-mono text-white font-bold">{Math.round(config.fontSize * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={config.fontSize}
                onChange={(e) => setConfig((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Background Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t('Background Opacity:')}</span>
                <span className="font-mono text-white font-bold">{Math.round(config.backgroundOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.backgroundOpacity}
                onChange={(e) => setConfig((prev) => ({ ...prev, backgroundOpacity: Number(e.target.value) }))}
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showUsernames}
                onChange={(e) => setConfig((prev) => ({ ...prev, showUsernames: e.target.checked }))}
                className="rounded accent-indigo-500"
              />
              <span>{t('Show Usernames')}</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showReadingAids}
                onChange={(e) => setConfig((prev) => ({ ...prev, showReadingAids: e.target.checked }))}
                className="rounded accent-indigo-500"
              />
              <span>{t('Ruby Pinyin/Furigana')}</span>
            </label>
          </div>

          {/* Custom Streamer Notice */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{t('Streamer Announcement Banner')}</span>
              <input
                type="checkbox"
                checked={config.showCustomNotice}
                onChange={(e) => setConfig((prev) => ({ ...prev, showCustomNotice: e.target.checked }))}
                className="rounded accent-indigo-500"
              />
            </label>
            {config.showCustomNotice && (
              <input
                type="text"
                value={config.customNoticeText}
                onChange={(e) => setConfig((prev) => ({ ...prev, customNoticeText: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                placeholder={t('Notice text displayed on overlay...')}
              />
            )}
          </div>

          {/* Test Events Trigger */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300">{t('Gift Preview Test Buttons:')}</div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => onTriggerTestEvent('superchat')}
                className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded font-medium text-[11px]"
              >
                + $50 SuperChat
              </button>
              <button
                onClick={() => onTriggerTestEvent('fleet_guard')}
                className="px-2 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded font-medium text-[11px]"
              >
                + {t('Bili Captain Guard')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Live Visual Viewport Simulator */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Viewport Backdrop Selector */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <Tv className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('OBS Preview Canvas (Simulated Stream Background)')}</span>
            </span>

            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-0.5 text-[11px]">
              {(['game', 'camera', 'checker'] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setPreviewBg(bg)}
                  className={`px-2 py-0.5 rounded capitalize ${
                    previewBg === bg ? 'bg-indigo-600 text-white font-medium' : 'hover:text-slate-200'
                  }`}
                >
                  {bg === 'checker' ? t('Transparent') : t(bg)}
                </button>
              ))}
            </div>
          </div>

          {/* Simulated 16:9 Stream Canvas */}
          <div
            className={`relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl h-[560px] flex flex-col justify-end p-4 transition-all ${
              previewBg === 'game'
                ? 'bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900'
                : previewBg === 'camera'
                ? 'bg-gradient-to-b from-stone-900 via-neutral-900 to-black'
                : 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950'
            }`}
          >
            {/* Stream HUD watermark to simulate real stream scene */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/60 backdrop-blur px-2.5 py-1 rounded-md text-[10px] text-slate-300 border border-slate-700/40">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-red-400">LIVE</span>
              <span>1080p60</span>
            </div>

            {/* Custom Notice Banner if enabled */}
            {config.showCustomNotice && config.customNoticeText && (
              <div className="mb-2 p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-xs text-indigo-200 font-medium flex items-center gap-2 backdrop-blur-md shadow-lg animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{config.customNoticeText}</span>
              </div>
            )}

            {/* Overlay Container: Pinned Super Chats Top, Regular Chat Bottom */}
            <div
              className={`rounded-xl border p-3 space-y-2 max-w-md transition-all ${getThemeClass(
                config.theme
              )}`}
              style={{
                fontSize: `${config.fontSize}rem`,
                backgroundColor: `rgba(15, 23, 42, ${config.backgroundOpacity})`,
              }}
            >
              {/* Pinned Super Chats & Gifts */}
              {config.maxSuperChats > 0 && gifts.slice(-config.maxSuperChats).map((gift) => (
                <div
                  key={gift.id}
                  className="rounded-lg p-2.5 shadow-lg border relative overflow-hidden transition-all text-xs"
                  style={{
                    backgroundColor: 'rgba(30, 27, 75, 0.85)',
                    borderColor: gift.tierColor,
                  }}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1 py-0.2 rounded text-[9px] bg-white/20 text-white font-mono uppercase">
                        {gift.platform}
                      </span>
                      <span>{gift.user}</span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-white"
                      style={{ backgroundColor: gift.tierColor }}
                    >
                      {gift.currency === 'USD' && '$'}
                      {gift.currency === 'CNY' && '¥'}
                      {gift.amount}
                      {gift.currency === 'Bits' && ' Bits'}
                    </span>
                  </div>
                  {gift.giftName && (
                    <div className="text-[11px] text-pink-300 mt-0.5 font-medium">
                      🎁 {gift.giftName}
                    </div>
                  )}
                  {gift.message && (
                    <div className="mt-1 text-slate-100 italic bg-black/30 p-1.5 rounded">
                      "{gift.message}"
                    </div>
                  )}
                </div>
              ))}

              {/* Chat Messages */}
              <div className="space-y-1.5 pt-1">
                {messages.slice(-config.maxMessages).map((m) => {
                  const fanMedal = m.badges.find((b) => b.type === 'fan_medal' || (b.level && b.level > 0));
                  const fleetGuard = m.badges.find((b) => b.type === 'fleet_guard' || b.type === 'fleet_admiral');

                  return (
                    <div
                      key={m.id}
                      className="p-1.5 rounded-lg bg-black/30 backdrop-blur-sm flex items-start gap-1.5 text-xs leading-snug"
                    >
                      {config.showPlatformBadges && (
                        <span className="shrink-0 mt-0.5 inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-white/10">
                          <PlatformIcon platform={m.platform} size={11} />
                        </span>
                      )}

                      {fanMedal && (
                        <BilibiliMedalBadge
                          medalName={fanMedal.medalName || fanMedal.label.split(' ')[0] || '雅宝'}
                          level={fanMedal.level || 25}
                          guardType={fleetGuard ? (fleetGuard.type as any) : undefined}
                          className="scale-90 origin-left"
                        />
                      )}

                      <div className="flex-1 break-words">
                        {config.showUsernames && (
                          <span className="font-bold text-slate-200 mr-1.5">
                            {m.user}:
                          </span>
                        )}
                        <span className="text-slate-100">{m.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
