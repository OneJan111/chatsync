export type PlatformType = 'youtube' | 'bilibili' | 'missevan' | 'twitch' | 'kick';

export interface ChatBadge {
  type: 'member' | 'mod' | 'vip' | 'admin' | 'fleet_guard' | 'fleet_admiral' | 'fleet_governor' | 'diamond' | 'fan_medal';
  label: string;
  color: string;
  level?: number; // Bilibili fan medal level (e.g. 1 to 40)
  medalName?: string; // Bilibili fan medal name (e.g. "雅宝", "水音")
  icon?: string;
}

export interface ChatMessage {
  id: string;
  platform: PlatformType;
  user: string;
  avatar?: string;
  text: string;
  timestamp: string; // ISO or HH:MM:SS
  badges: ChatBadge[];
  translatedText?: string;
  translationTargetLang?: string;
  pinyin?: string;
  furigana?: string;
  isQuestion?: boolean;
  sentiment?: 'positive' | 'hype' | 'funny' | 'question' | 'neutral' | 'toxic';
  emotes?: { code: string; url: string }[];
  stickerUrl?: string;
  isBlocked?: boolean;
}

export interface SiteEmote {
  code: string;
  label: string;
  url: string;
  platform: 'bilibili' | 'youtube';
  isLocked?: boolean;
  category?: 'charge' | 'room' | 'general' | 'garb' | 'member';
  packName?: string;
  isRoomOwner?: boolean;
  unlockHint?: string;
}

export interface SuperChatGift {
  id: string;
  platform: PlatformType;
  user: string;
  avatar?: string;
  amount: number;
  currency: string;
  giftName?: string;
  giftIcon?: string;
  message?: string;
  emotes?: { code: string; url: string }[];
  stickerUrl?: string;
  translatedMessage?: string;
  timestamp: string;
  isThanked: boolean;
  tierColor: string; // e.g. blue, cyan, green, yellow, orange, red
  pinyin?: string;
  furigana?: string;
  userId?: string;
}

export interface StreamChannelConfig {
  platform: PlatformType;
  name: string;
  identifier: string; // channel handle, room ID, etc.
  isConnected: boolean;
  viewerCount: number;
  title: string;
  color: string;
  iconName: string;
}

export type UserRole = 'viewer' | 'streamer';

export type ViewerThemeId = 'cinema_dark' | 'cozy_latte' | 'pastel_sakura' | 'neon_matrix';
export type StreamerThemeId = 'studio_dark' | 'cyber_neon' | 'broadcast_pro';

export type OverlayThemeId = 'sakura' | 'cyberpunk' | 'minimal' | 'arcade' | 'danmaku';

export interface OverlayConfig {
  theme: OverlayThemeId;
  maxMessages: number;
  maxSuperChats: number;
  showUsernames: boolean;
  showPlatformBadges: boolean;
  showReadingAids: boolean; // pinyin / furigana
  fontSize: number; // in rem scale (0.8 to 1.5)
  backgroundOpacity: number; // 0 to 1
  selectedPlatforms: PlatformType[];
  filterBots: boolean;
  showCustomNotice: boolean;
  customNoticeText: string;
  customCss: string;
}

export interface StreamHotspot {
  id: string;
  timestampStart: string;
  timestampEnd: string;
  peakCpm: number; // chats per minute
  triggerKeywords: string[];
  description: string;
  giftTotal: number;
}
