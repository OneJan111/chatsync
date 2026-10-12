import React, { useState } from 'react';
import { 
  Gift, 
  Heart, 
  CheckCheck, 
  Volume2, 
  DollarSign, 
  Filter, 
  Sparkles,
  ExternalLink,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SuperChatGift, StreamChannelConfig, PlatformType } from '../types';
import { tts } from '../services/tts';
import { sound } from '../services/sound';
import { PlatformIcon } from './SiteIcons';
import { ReadingAidText } from './ReadingAidText';
import { giftLeaderboard } from '../services/giftUtils';
import { safeChatImageUrl, splitChatEmotes } from '../services/chatEmotes';
import { useTranslate } from './LanguageContext';

interface GiftsSuperChatDeckProps {
  gifts: SuperChatGift[];
  onToggleThanked: (id: string) => void;
  onMarkAllThanked: () => void;
  channels?: StreamChannelConfig[];
  showReadingAids: boolean;
}

export const GiftsSuperChatDeck: React.FC<GiftsSuperChatDeckProps> = ({
  gifts,
  onToggleThanked,
  onMarkAllThanked,
  channels = [],
  showReadingAids,
}) => {
  const t = useTranslate();
  const [filterMode, setFilterMode] = useState<'all' | 'unthanked' | 'high_tier'>('all');

  const monitoredPlatforms = React.useMemo(() => {
    if (!channels || channels.length === 0) return null;
    return channels
      .filter((c) => c.isConnected && c.identifier && c.identifier.trim().length > 0)
      .map((c) => c.platform);
  }, [channels]);

  // Trigger celebration confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#a855f7', '#ec4899', '#3b82f6', '#eab308'],
    });
  };

  // Filter gifts by monitored platforms
  const platformGifts = React.useMemo(() => {
    return gifts.filter((g) => !monitoredPlatforms || monitoredPlatforms.includes(g.platform));
  }, [gifts, monitoredPlatforms]);

  // Calculate revenue totals for monitored platforms
  const totalCny = platformGifts
    .filter((g) => g.currency === 'CNY')
    .reduce((acc, g) => acc + g.amount, 0);

  const totalUsd = platformGifts
    .filter((g) => g.currency === 'USD')
    .reduce((acc, g) => acc + g.amount, 0);

  const totalBits = platformGifts
    .filter((g) => g.currency === 'Bits')
    .reduce((acc, g) => acc + g.amount, 0);
  const totalDiamonds = platformGifts
    .filter((g) => g.currency === '💎')
    .reduce((acc, g) => acc + g.amount, 0);

  const filteredGifts = platformGifts.filter((g) => {
    if (filterMode === 'unthanked') return !g.isThanked;
    if (filterMode === 'high_tier') return g.amount >= 50;
    return true;
  });

  const unthankedCount = platformGifts.filter((g) => !g.isThanked).length;
  const leaderboard = giftLeaderboard(platformGifts, '', 5);

  const handleReadSuperChat = (gift: SuperChatGift) => {
    const text = gift.currency && gift.amount > 0
      ? gift.giftName
        ? `感谢 ${gift.user} 送出的 ${gift.amount} ${gift.currency} ${gift.giftName}！${gift.message || ''}`
        : `来自 ${gift.user} 的醒目留言 ${gift.amount} ${gift.currency}：${gift.message || ''}`
      : `感谢 ${gift.user} ${gift.giftName || ''}！${gift.message || ''}`;
    
    sound.playSuperChatFanfare();
    tts.enqueue({
      id: gift.id,
      text,
      isPriority: true,
      speaker: gift.user,
      category: 'gift',
    });
  };

  const isBilibiliMonitored = !monitoredPlatforms || monitoredPlatforms.includes('bilibili');
  const isMissevanMonitored = !monitoredPlatforms || monitoredPlatforms.includes('missevan');
  const isYtMonitored = !monitoredPlatforms || monitoredPlatforms.includes('youtube');
  const isTwitchMonitored = !monitoredPlatforms || monitoredPlatforms.includes('twitch');

  return (
    <div className="flex flex-col h-[700px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header with Revenue Overview */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Gift className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('醒目留言 & 礼物答谢队列')}
            </h2>
            {unthankedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-pink-500 text-white animate-pulse">
                {unthankedCount} {t('待答谢')}
              </span>
            )}
          </div>

          {unthankedCount > 0 && (
            <button
              onClick={() => {
                onMarkAllThanked();
                triggerConfetti();
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 hover:underline"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{t('全部标记已答谢')}</span>
            </button>
          )}
        </div>

        {/* Live Ticker Bar - Only show boxes for monitored platforms! */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {isBilibiliMonitored && (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg py-1 px-2">
              <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                <PlatformIcon platform="bilibili" size={10} />
                <span>{t('B站 / 猫耳')}</span>
              </div>
              <div className="text-xs font-bold text-sky-400 font-mono">¥{totalCny.toLocaleString()}</div>
            </div>
          )}

          {isMissevanMonitored && (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg py-1 px-2">
              <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                <PlatformIcon platform="missevan" size={10} />
                <span>{t('猫耳钻石')}</span>
              </div>
              <div className="text-xs font-bold text-pink-400 font-mono">💎{totalDiamonds.toLocaleString()}</div>
            </div>
          )}

          {isYtMonitored && (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg py-1 px-2">
              <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                <PlatformIcon platform="youtube" size={10} />
                <span>YouTube SC</span>
              </div>
              <div className="text-xs font-bold text-red-400 font-mono">${totalUsd.toLocaleString()}</div>
            </div>
          )}

          {isTwitchMonitored && (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg py-1 px-2">
              <div className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                <PlatformIcon platform="twitch" size={10} />
                <span>Twitch Bits</span>
              </div>
              <div className="text-xs font-bold text-purple-400 font-mono">{totalBits.toLocaleString()}</div>
            </div>
          )}
        </div>

        {leaderboard.length > 0 && (
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-2.5 py-2">
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-300">
              <Trophy className="h-3 w-3" />
              <span>{t('支持者榜')}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {leaderboard.map((supporter, index) => (
                <span key={`${supporter.platform}-${supporter.author}`} className="text-[10px] text-slate-300">
                  <span className="mr-1 text-slate-500">{index + 1}.</span>
                  {supporter.author}
                  <span className="ml-1 text-amber-300">{supporter.total || `${supporter.count} 次`}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 flex items-center gap-0.5">
              <Filter className="w-3 h-3" /> {t('筛选')}
            </span>
            {(['all', 'unthanked', 'high_tier'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  filterMode === mode
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                {mode === 'all'
                  ? t('全部')
                  : mode === 'unthanked'
                  ? `${t('未答谢')} (${unthankedCount})`
                  : t('高额置顶 (≥50)')}
              </button>
            ))}
          </div>

          <button
            onClick={triggerConfetti}
            className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20"
            title={t('手动触发喝彩特效')}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{t('喝彩庆祝')}</span>
          </button>
        </div>
      </div>

      {/* Gifts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredGifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center p-6">
            <Heart className="w-8 h-8 mb-2 opacity-30 text-pink-400" />
            <p className="text-xs font-medium">{t('当前视图暂无礼物或醒目留言')}</p>
            <p className="text-[11px] text-slate-600 mt-1">
              {t('当观众在已监控平台发送 Super Chat、大航海舰长或礼物时，将自动置顶并播放提醒音效。')}
            </p>
          </div>
        ) : (
          filteredGifts.map((gift) => {
            const hasJapaneseKana = /[\u3040-\u30ff]/u.test(gift.message || '');
            const languageHint = gift.platform === 'bilibili' ? 'zh'
              : gift.platform === 'missevan' || hasJapaneseKana ? 'ja'
                : undefined;
            return (
            <div
              key={gift.id}
              className={`rounded-lg border p-3 transition-all relative overflow-hidden ${
                gift.isThanked
                  ? 'bg-slate-800/40 border-slate-800 opacity-60'
                  : 'bg-slate-800/90 border-slate-700 shadow-md hover:border-slate-600'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: gift.tierColor || '#a855f7' }}
              />

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Platform Indicator with Site Icon */}
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <PlatformIcon platform={gift.platform} size={11} />
                    <span className="text-[9px] font-bold">
                      {gift.platform === 'bilibili' ? 'B站' : gift.platform === 'missevan' ? '猫耳' : gift.platform.toUpperCase()}
                    </span>
                  </span>
                  
                  <span className="font-bold text-xs text-slate-100">
                    <ReadingAidText text={gift.user} enabled={showReadingAids} languageHint={languageHint} />
                  </span>
                </div>

                {/* Amount Pill */}
                {gift.currency && gift.amount > 0 && (
                  <div
                    className="px-2 py-0.5 rounded font-mono font-bold text-xs text-white shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: gift.tierColor || '#8b5cf6' }}
                  >
                    {gift.currency === 'USD' && '$'}
                    {gift.currency === 'CNY' && '¥'}
                    <span>{gift.amount}</span>
                    {gift.currency === 'Bits' && ' Bits'}
                    {!['USD', 'CNY', 'Bits'].includes(gift.currency) && gift.currency}
                  </div>
                )}
              </div>

              {/* Gift Name if non-cash Super Chat */}
              {gift.giftName && (
                <div className="mt-1 flex items-center gap-1 text-xs text-purple-300 font-medium">
                  {gift.giftIcon && safeChatImageUrl(gift.giftIcon) ? (
                    <img
                      src={safeChatImageUrl(gift.giftIcon) || undefined}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 object-contain"
                    />
                  ) : gift.giftIcon ? <span>{gift.giftIcon}</span> : null}
                  <span>
                    <ReadingAidText text={gift.giftName} enabled={showReadingAids} languageHint={languageHint} />
                  </span>
                </div>
              )}

              {/* Donation message */}
              {gift.message && (
                <div className="mt-1.5 text-xs text-slate-200 bg-slate-950/40 p-2 rounded border border-slate-800/60 break-words leading-relaxed">
                  &quot;
                  {gift.stickerUrl && safeChatImageUrl(gift.stickerUrl) ? (
                    <img
                      src={safeChatImageUrl(gift.stickerUrl) || undefined}
                      alt={gift.message}
                      referrerPolicy="no-referrer"
                      className="inline-block max-h-[120px] max-w-full align-middle"
                    />
                  ) : (
                    splitChatEmotes(gift.message, gift.emotes).map((chunk, index) => {
                      const emote = gift.emotes?.find((item) => item.code === chunk);
                      const image = safeChatImageUrl(emote?.url);
                      return image
                        ? <img key={index} src={image} alt={chunk} title={chunk} referrerPolicy="no-referrer" className="inline-block h-[1.6em] max-w-[5em] object-contain align-middle mx-0.5" />
                        : <ReadingAidText key={index} text={chunk} enabled={showReadingAids} languageHint={languageHint} />;
                    })
                  )}
                  &quot;
                </div>
              )}

              {/* Card Footer: Timestamp & Action Buttons */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-slate-500">
                  {gift.timestamp}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleReadSuperChat(gift)}
                    className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-700/60 transition-colors"
                    title="朗读答谢词"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onToggleThanked(gift.id);
                      if (!gift.isThanked) triggerConfetti();
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      gift.isThanked
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
                    }`}
                  >
                    {gift.isThanked ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-slate-400" />
                        <span>{t('已答谢')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('标为已谢')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
