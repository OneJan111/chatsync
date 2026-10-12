import React, { useEffect, useState } from 'react';
import { ChatMessage, SuperChatGift, OverlayThemeId } from '../types';
import { PlatformIcon, BilibiliMedalBadge } from './SiteIcons';

interface StandaloneOverlayProps {
  messages: ChatMessage[];
  gifts: SuperChatGift[];
}

export const StandaloneOverlay: React.FC<StandaloneOverlayProps> = ({
  messages,
  gifts,
}) => {
  const [params, setParams] = useState({
    theme: 'sakura' as OverlayThemeId,
    maxMessages: 7,
    maxSuperChats: 3,
    showUsernames: true,
    opacity: 0.85,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setParams({
        theme: (urlParams.get('theme') as OverlayThemeId) || 'sakura',
        maxMessages: Number(urlParams.get('n') || 7),
        maxSuperChats: Number(urlParams.get('sc') || 3),
        showUsernames: urlParams.get('name') !== 'false',
        opacity: Number(urlParams.get('opacity') || 0.85),
      });
    }
  }, []);

  const getThemeClass = (theme: OverlayThemeId) => {
    switch (theme) {
      case 'sakura':
        return 'border-pink-500/30 bg-slate-950/80 backdrop-blur-md shadow-pink-500/10 text-pink-50';
      case 'cyberpunk':
        return 'border-cyan-500/50 bg-black/90 backdrop-blur-md shadow-cyan-500/20 text-cyan-300 font-mono';
      case 'minimal':
        return 'border-slate-800 bg-slate-950/90 text-slate-100';
      case 'arcade':
        return 'border-amber-500/50 bg-slate-900/95 font-mono text-amber-200 border-2';
      case 'danmaku':
        return 'border-transparent bg-transparent text-white';
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 flex flex-col justify-end">
      <div
        className={`rounded-xl border p-3 space-y-2 max-w-lg transition-all ${getThemeClass(
          params.theme
        )}`}
        style={{
          backgroundColor: `rgba(15, 23, 42, ${params.opacity})`,
        }}
      >
        {/* Pinned Super Chats */}
        {params.maxSuperChats > 0 &&
          gifts.slice(-params.maxSuperChats).map((gift) => (
            <div
              key={gift.id}
              className="rounded-lg p-2.5 shadow-lg border relative overflow-hidden transition-all text-xs"
              style={{
                backgroundColor: 'rgba(30, 27, 75, 0.9)',
                borderColor: gift.tierColor,
              }}
            >
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/20 text-white font-mono flex items-center gap-1">
                    <PlatformIcon platform={gift.platform} size={11} />
                    <span>{gift.platform}</span>
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
                <div className="mt-1 text-slate-100 italic bg-black/40 p-1.5 rounded">
                  "{gift.message}"
                </div>
              )}
            </div>
          ))}

        {/* Regular Chat Messages */}
        <div className="space-y-1.5 pt-1">
          {messages.slice(-params.maxMessages).map((m) => {
            const fanMedal = m.badges.find((b) => b.type === 'fan_medal' || (b.level && b.level > 0));
            const fleetGuard = m.badges.find((b) => b.type === 'fleet_guard' || b.type === 'fleet_admiral');

            return (
              <div
                key={m.id}
                className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm flex items-start gap-1.5 text-xs leading-snug"
              >
                <span className="shrink-0 mt-0.5 inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-white/10">
                  <PlatformIcon platform={m.platform} size={11} />
                </span>

                {fanMedal && (
                  <BilibiliMedalBadge
                    medalName={fanMedal.medalName || fanMedal.label.split(' ')[0] || '雅宝'}
                    level={fanMedal.level || 25}
                    guardType={fleetGuard ? (fleetGuard.type as any) : undefined}
                    className="scale-90 origin-left"
                  />
                )}

                <div className="flex-1 break-words">
                  {params.showUsernames && (
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
  );
};
