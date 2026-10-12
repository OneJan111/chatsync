import React from 'react';
import { PlatformType } from '../types';

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Official YouTube Play Icon
export const YouTubeIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={`shrink-0 text-[#ff0000] ${className}`}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// 2. Official Bilibili TV Mascot Logo (小电视)
export const BilibiliIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={`shrink-0 text-[#23ade5] ${className}`}
  >
    <path d="M17.813 4.653h.854c1.51 0 2.733 1.224 2.733 2.734v10.518c0 1.51-1.223 2.734-2.733 2.734H5.333c-1.51 0-2.733-1.224-2.733-2.734V7.387c0-1.51 1.223-2.734 2.733-2.734h.875L4.417 2.75a.75.75 0 0 1 1.05-.184l3.14 2.087h6.786l3.14-2.087a.75.75 0 1 1 .832 1.246l-1.552 1.841zm-12.48 1.48a1.254 1.254 0 0 0-1.253 1.254v10.518c0 .692.561 1.254 1.253 1.254h13.334c.692 0 1.253-.562 1.253-1.254V7.387c0-.692-.561-1.254-1.253-1.254H5.333zM8.5 10.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm7 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z"/>
  </svg>
);

// 3. Official Twitch Glitch Logo
export const TwitchIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={`shrink-0 text-[#a970ff] ${className}`}
  >
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
  </svg>
);

// 4. Official Kick Brand Block Logo
export const KickIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={`shrink-0 text-[#53fc18] ${className}`}
  >
    <path d="M1.333 0h7.524v7.714L14.762 0h7.905l-7.714 8.762L23.048 24h-8.095L8.857 13.905V24H1.333V0z"/>
  </svg>
);

// 5. Official MissEvan (猫耳FM) Logo
export const MissEvanIcon: React.FC<IconProps> = ({ className = '', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={`shrink-0 text-[#ff7a45] ${className}`}
  >
    {/* Authentic Cat-Ears Audio / 猫耳FM Silhouette */}
    <path d="M4.5 10.5C4.5 6.36 7.86 3 12 3s7.5 3.36 7.5 7.5v2.25a3.75 3.75 0 0 1-3.75 3.75H15v-5h3v-1A6 6 0 0 0 6 10.5v1h3v5H8.25A3.75 3.75 0 0 1 4.5 12.75v-2.25zM3.5 2.5l4 4.5H5.2c-.38 0-.69.28-.7.66L4.5 10.5H3V4.5a2 2 0 0 1 2-2h-.5zm17 0a2 2 0 0 1 2 2v6h-1.5v-2.84c-.01-.38-.32-.66-.7-.66h-2.3l4-4.5z"/>
  </svg>
);

// Helper to render the official brand icon dynamically
export const PlatformIcon: React.FC<{ platform: PlatformType; size?: number; className?: string }> = ({
  platform,
  size = 14,
  className = '',
}) => {
  switch (platform) {
    case 'youtube':
      return <YouTubeIcon size={size} className={className} />;
    case 'bilibili':
      return <BilibiliIcon size={size} className={className} />;
    case 'twitch':
      return <TwitchIcon size={size} className={className} />;
    case 'kick':
      return <KickIcon size={size} className={className} />;
    case 'missevan':
      return <MissEvanIcon size={size} className={className} />;
  }
};

// Bilibili Fan Medal Badge (带等级、勋章名与大航海标志)
export const BilibiliMedalBadge: React.FC<{
  medalName?: string;
  level?: number;
  guardType?: 'fleet_guard' | 'fleet_admiral' | 'fleet_governor';
  className?: string;
}> = ({ medalName = '雅宝', level = 12, guardType, className = '' }) => {
  // Bilibili medal color tiers:
  // 1-8: Green (#5c968e), 9-16: Blue (#5b78b5), 17-24: Purple (#8c5db5), 25-32: Pink/Rose (#c25385), 33+: Gold/Orange (#d67831)
  const getMedalColor = (lvl: number) => {
    if (lvl >= 33) return 'from-amber-600 to-yellow-500 border-amber-400';
    if (lvl >= 25) return 'from-pink-600 to-rose-500 border-pink-400';
    if (lvl >= 17) return 'from-purple-600 to-indigo-500 border-purple-400';
    if (lvl >= 9) return 'from-blue-600 to-cyan-500 border-blue-400';
    return 'from-emerald-600 to-teal-500 border-emerald-400';
  };

  const gradientClass = getMedalColor(level);

  return (
    <span
      className={`inline-flex items-center rounded-sm text-[10px] font-bold overflow-hidden border shadow-sm select-none leading-none ${className}`}
      style={{ height: '18px' }}
      title={`Bilibili 粉丝勋章: ${medalName} ${level}级`}
    >
      {/* Guard Prefix Icon if Fleet Guard/Admiral */}
      {guardType === 'fleet_guard' && (
        <span className="bg-[#00d0ff] text-slate-950 px-1 py-0.5 text-[9px] font-extrabold flex items-center">
          ⚓ 舰
        </span>
      )}
      {guardType === 'fleet_admiral' && (
        <span className="bg-[#f59e0b] text-slate-950 px-1 py-0.5 text-[9px] font-extrabold flex items-center">
          👑 督
        </span>
      )}

      {/* Medal Name */}
      <span className={`bg-gradient-to-r ${gradientClass} text-white px-1.5 py-0.5 tracking-tight flex items-center`}>
        {medalName}
      </span>

      {/* Medal Level Number Box */}
      <span className="bg-white text-slate-900 font-mono font-extrabold px-1 py-0.5 text-[9px] min-w-[16px] text-center flex items-center justify-center">
        {level}
      </span>
    </span>
  );
};
