import type { ChatBadge, ChatMessage, SiteEmote, SuperChatGift } from '../types';
import { safeChatImageUrl } from './chatEmotes';
import { parseGiftAmount, setGiftValue } from './giftUtils';

const API_ORIGIN = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const CHAT_PAGE_URL = `${YOUTUBE_ORIGIN}/live_chat`;
const GET_LIVE_CHAT_URL = `${YOUTUBE_ORIGIN}/youtubei/v1/live_chat/get_live_chat`;
const MAX_MESSAGES = 500;

export type YoutubeConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface YoutubeStatus {
  state: YoutubeConnectionState;
  requestedChannel: string;
  videoId: string | null;
  error: string | null;
  loginStatus: 'not_configured' | 'pending' | 'verified' | 'invalid';
  loginError: string | null;
  emoteError: string | null;
  lastMessageAt: string | null;
}

interface StoredMessage {
  id: number;
  message: ChatMessage;
}

interface StoredGift {
  id: number;
  gift: SuperChatGift;
}

interface LiveChatListResponse {
  items?: {
    id?: string;
    snippet?: {
      type?: string;
      publishedAt?: string;
      displayMessage?: string;
      textMessageDetails?: { messageText?: string };
      superChatDetails?: { amountDisplayString?: string; userComment?: string };
      superStickerDetails?: { amountDisplayString?: string; tier?: number };
      membershipGiftingDetails?: { giftMembershipsCount?: number };
      memberMilestoneChatDetails?: { userComment?: string; memberMonth?: number };
    };
    authorDetails?: {
      displayName?: string;
      channelId?: string;
      isChatModerator?: boolean;
      isChatOwner?: boolean;
      isChatSponsor?: boolean;
    };
  }[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
}

interface WebContinuation {
  token: string;
  timeoutMs: number;
}

const status: YoutubeStatus = {
  state: 'disconnected',
  requestedChannel: '',
  videoId: null,
  error: null,
  loginStatus: 'not_configured',
  loginError: null,
  emoteError: null,
  lastMessageAt: null,
};
const messages: StoredMessage[] = [];
const gifts: StoredGift[] = [];
let generation = 0;
let nextMessageId = 1;
let nextPageToken = '';
let webContinuation = '';
let webClientVersion = '';
let webSeenIds = new Set<string>();
const channelEmotes = new Map<string, SiteEmote>();
let connectionCookie = '';
let channelEmotesLoaded = false;

const apiKey = () => process.env.YOUTUBE_API_KEY?.trim() || '';
const youtubeCookieHeader = (): string => {
  const cookie = connectionCookie.trim().replace(/^cookie:\s*/i, '');
  return cookie && !/(?:^|;\s*)SOCS=/i.test(cookie) ? `SOCS=CAI; ${cookie}` : cookie || 'SOCS=CAI';
};

const apiGet = async <T>(resource: string, params: Record<string, string>): Promise<T> => {
  const key = apiKey();
  if (!key) throw new Error('请在服务器 .env.local 中配置 YOUTUBE_API_KEY');
  const url = new URL(`${API_ORIGIN}/${resource}`);
  for (const [name, value] of Object.entries({ ...params, key })) {
    url.searchParams.set(name, value);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `YouTube API 请求失败（HTTP ${response.status}）`);
  }
  return payload;
};

const rememberChannelEmotes = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) rememberChannelEmotes(item);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  const record = value as Record<string, unknown>;
  const emojiId = typeof record.emojiId === 'string' ? record.emojiId : '';
  const shortcode = Array.isArray(record.shortcuts)
    ? record.shortcuts.find((item): item is string => typeof item === 'string' && item.length > 0)
    : undefined;
  if (emojiId && (record.isCustomEmoji === true || emojiId.includes('/'))) {
    const image = getRecord(record.image);
    const thumbnails = image.thumbnails;
    const thumbnail = Array.isArray(thumbnails) ? thumbnails[thumbnails.length - 1] : null;
    const url = safeChatImageUrl(getRecord(thumbnail).url);
    if (url) {
      const accessibility = getRecord(image.accessibility);
      const accessibilityData = getRecord(accessibility.accessibilityData);
      const label = typeof accessibilityData.label === 'string' && accessibilityData.label
        ? accessibilityData.label
        : (shortcode || emojiId.split('/').pop() || emojiId).replace(/^:|:$/g, '').replace(/_/g, ' ');
      const emote: SiteEmote = {
        code: shortcode || emojiId,
        label,
        url,
        platform: 'youtube',
        isLocked: typeof record.isLocked === 'boolean' ? record.isLocked : true,
        category: 'member',
        packName: '会员表情',
      };
      channelEmotes.set(emote.code, emote);
    }
  }
  for (const child of Object.values(record)) rememberChannelEmotes(child);
};

const getTextEmotes = (text: string): { code: string; url: string }[] =>
  [...channelEmotes].flatMap(([code, emote]) =>
    text.includes(code) ? [{ code, url: emote.url }] : []);

const getChannelEmotes = (): SiteEmote[] => [...channelEmotes.values()];

const parseVideoId = (identifier: string): string | null => {
  const value = identifier.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      const videoId = url.searchParams.get('v');
      if (videoId) return videoId;
      const match = url.pathname.match(/^\/(?:live|embed)\/([\w-]{11})/);
      if (match) return match[1];
    }
  } catch {
    return null;
  }
  return null;
};

const parseChannelHandle = (identifier: string): string => {
  try {
    const url = new URL(identifier.trim());
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      const match = url.pathname.match(/^\/@([^/]+)/);
      if (match) return match[1];
    }
  } catch {
    // The identifier may be a bare handle or channel ID.
  }
  return identifier.trim().replace(/^@/, '');
};

const resolveVideoId = async (identifier: string): Promise<string> => {
  const directId = parseVideoId(identifier);
  if (directId) return directId;

  const handle = parseChannelHandle(identifier);
  if (/^UC[\w-]+$/.test(handle)) {
    const channelId = handle;
    const result = await apiGet<{ items?: { id?: { videoId?: string } }[] }>('search', {
      part: 'id',
      channelId,
      eventType: 'live',
      type: 'video',
      maxResults: '1',
    });
    const videoId = result.items?.[0]?.id?.videoId;
    if (!videoId) throw new Error('该 YouTube 频道当前没有进行中的直播');
    return videoId;
  }

  const channel = await apiGet<{ items?: { id?: string }[] }>('channels', {
    part: 'id',
    forHandle: handle,
  });
  const channelId = channel.items?.[0]?.id;
  if (!channelId) throw new Error('找不到该 YouTube 频道，请检查频道链接或 Handle');
  const result = await apiGet<{ items?: { id?: { videoId?: string } }[] }>('search', {
    part: 'id',
    channelId,
    eventType: 'live',
    type: 'video',
    maxResults: '1',
  });
  const videoId = result.items?.[0]?.id?.videoId;
  if (!videoId) throw new Error('该 YouTube 频道当前没有进行中的直播');
  return videoId;
};

const resolveLiveChatId = async (videoId: string): Promise<string> => {
  const response = await apiGet<{
    items?: { liveStreamingDetails?: { activeLiveChatId?: string } }[];
  }>('videos', { part: 'liveStreamingDetails', id: videoId });
  const liveChatId = response.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
  if (!liveChatId) throw new Error('该 YouTube 直播当前没有可用的实时聊天室');
  return liveChatId;
};

const extractAssignedJson = (html: string, variable: string): Record<string, unknown> => {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const assignment = new RegExp(`(?:window\\["${escaped}"\\]|var ${escaped}|${escaped})\\s*=\\s*`);
  const match = assignment.exec(html);
  if (!match) return {};
  const start = html.indexOf('{', match.index + match[0].length);
  if (start < 0) return {};

  let depth = 0;
  let inString = false;
  let escapedCharacter = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escapedCharacter) escapedCharacter = false;
      else if (character === '\\') escapedCharacter = true;
      else if (character === '"') inString = false;
    } else if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        const parsed: unknown = JSON.parse(html.slice(start, index + 1));
        return typeof parsed === 'object' && parsed !== null
          ? parsed as Record<string, unknown>
          : {};
      }
    }
  }
  return {};
};

const getRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

const getText = (value: unknown): string => {
  const text = getRecord(value);
  if (typeof text.simpleText === 'string') return text.simpleText;
  if (!Array.isArray(text.runs)) return '';
  return text.runs.map((run) => {
    const record = getRecord(run);
    const emoji = getRecord(record.emoji);
    return typeof record.text === 'string'
      ? record.text
      : Array.isArray(emoji.shortcuts) && typeof emoji.shortcuts[0] === 'string'
        ? emoji.shortcuts[0]
      : typeof emoji.emojiId === 'string' ? emoji.emojiId : '';
  }).join('');
};

const getRunEmotes = (value: unknown): { code: string; url: string }[] => {
  const runs = getRecord(value).runs;
  if (!Array.isArray(runs)) return [];
  return runs.flatMap((run) => {
    const emoji = getRecord(getRecord(run).emoji);
    const emojiId = typeof emoji.emojiId === 'string' ? emoji.emojiId : '';
    if (emoji.isCustomEmoji !== true && !emojiId.includes('/')) return [];
    const shortcuts = Array.isArray(emoji.shortcuts) ? emoji.shortcuts : [];
    const code = shortcuts.find((shortcut): shortcut is string =>
      typeof shortcut === 'string' && shortcut.length > 0) || emojiId;
    const thumbnails = getRecord(emoji.image).thumbnails;
    const thumbnail = Array.isArray(thumbnails) ? thumbnails[thumbnails.length - 1] : null;
    const url = safeChatImageUrl(getRecord(thumbnail).url);
    return code && url ? [{ code, url }] : [];
  });
};

const findContinuation = (value: unknown): WebContinuation | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findContinuation(item);
      if (found) return found;
    }
    return null;
  }
  const record = getRecord(value);
  if (!Object.keys(record).length) return null;
  if (typeof record.continuation === 'string' && record.continuation) {
    return {
      token: record.continuation,
      timeoutMs: typeof record.timeoutMs === 'number' ? record.timeoutMs : 5_000,
    };
  }
  for (const child of Object.values(record)) {
    const found = findContinuation(child);
    if (found) return found;
  }
  return null;
};

const parseWebChatMessage = (action: unknown): ChatMessage | null => {
  const item = getWebChatItem(action);
  const chat = getRecord(item.liveChatTextMessageRenderer);
  const giftedMembership = getRecord(item.liveChatSponsorshipsGiftRedemptionAnnouncementRenderer);
  const renderer = Object.keys(chat).length ? chat : giftedMembership;
  const rawText = getText(renderer.message);
  const text = Object.keys(giftedMembership).length
    ? `[Gift membership] ${rawText}`.trim()
    : rawText;
  const id = renderer.id;
  if (typeof id !== 'string' || !id || !text.trim()) return null;
  const timestampUsec = Number(renderer.timestampUsec);
  const timestamp = Number.isFinite(timestampUsec) && timestampUsec > 0
    ? new Date(timestampUsec / 1_000).toTimeString().slice(0, 8)
    : new Date().toTimeString().slice(0, 8);
  const emotes = [...getTextEmotes(text), ...getRunEmotes(renderer.message)];
  return {
    id: `youtube-${id}`,
    platform: 'youtube',
    user: getText(renderer.authorName) || 'YouTube 用户',
    text,
    timestamp,
    badges: [],
    ...(emotes.length ? { emotes } : {}),
  };
};

const youtubeCurrency = (currency: string): string => {
  const normalized = currency.replace(/\s/g, '').toUpperCase();
  return normalized === '$' || normalized === 'US$' ? 'USD'
    : normalized === '¥' || normalized === '￥' ? 'CNY'
      : normalized === '€' ? 'EUR'
        : normalized === '£' ? 'GBP' : currency;
};

const storeYoutubeGift = (
  id: string,
  user: string,
  userId: string,
  displayAmount: string,
  message: string,
  timestamp: string,
  stickerUrl = '',
  emotes: { code: string; url: string }[] = [],
  isSticker = false,
): SuperChatGift | null => {
  const parsed = parseGiftAmount(displayAmount);
  if (!parsed || !user) return null;
  const tierColor = parsed.amount >= 100 ? '#ef4444'
    : parsed.amount >= 50 ? '#f97316'
      : parsed.amount >= 20 ? '#eab308' : '#22c55e';
  const gift = setGiftValue({
    id: `youtube-gift-${id}`,
    platform: 'youtube',
    user,
    userId,
    amount: 0,
    currency: '',
    giftName: isSticker || stickerUrl ? 'Super Sticker' : 'Super Chat',
    ...(message ? { message } : {}),
    ...(stickerUrl ? { giftIcon: stickerUrl } : {}),
    ...(emotes.length ? { emotes } : {}),
    timestamp,
    isThanked: false,
    tierColor,
  }, youtubeCurrency(parsed.currency), parsed.amount);
  gifts.push({ id: nextMessageId, gift });
  nextMessageId += 1;
  if (gifts.length > MAX_MESSAGES) gifts.splice(0, gifts.length - MAX_MESSAGES);
  return gift;
};

const storeYoutubeMembership = (
  id: string,
  user: string,
  userId: string,
  giftName: string,
  message: string,
  timestamp: string,
): SuperChatGift | null => {
  if (!id || !user) return null;
  const gift: SuperChatGift = {
    id: `youtube-gift-${id}`,
    platform: 'youtube',
    user,
    userId,
    amount: 0,
    currency: '',
    giftName,
    ...(message ? { message } : {}),
    timestamp,
    isThanked: false,
    tierColor: '#22c55e',
  };
  gifts.push({ id: nextMessageId, gift });
  nextMessageId += 1;
  if (gifts.length > MAX_MESSAGES) gifts.splice(0, gifts.length - MAX_MESSAGES);
  return gift;
};

const getWebChatItem = (action: unknown): Record<string, unknown> => {
  const actionRecord = getRecord(action);
  const itemAction = getRecord(actionRecord.addChatItemAction);
  const item = getRecord(itemAction.item);
  if (Object.keys(item).length) return item;
  const tickerItem = getRecord(getRecord(actionRecord.addLiveChatTickerItemAction).item);
  const ticker = getRecord(tickerItem.liveChatTickerPaidStickerItemRenderer);
  const renderer = getRecord(
    getRecord(
      getRecord(
        getRecord(ticker.showItemEndpoint).showLiveChatItemEndpoint,
      ).renderer,
    ).liveChatPaidStickerRenderer,
  );
  return Object.keys(renderer).length
    ? {
      liveChatPaidStickerRenderer: {
        ...renderer,
        id: renderer.id || ticker.id,
        authorExternalChannelId: renderer.authorExternalChannelId || ticker.authorExternalChannelId,
      },
    }
    : {};
};

const parseWebChatGift = (action: unknown): SuperChatGift | null => {
  const item = getWebChatItem(action);
  const paid = getRecord(item.liveChatPaidMessageRenderer);
  const sticker = getRecord(item.liveChatPaidStickerRenderer);
  const renderer = Object.keys(paid).length ? paid : sticker;
  const membershipGift = getRecord(item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer);
  const memberMilestone = getRecord(item.liveChatMembershipItemRenderer);
  const id = renderer.id || membershipGift.id || memberMilestone.id;
  if (typeof id !== 'string' || !id) return null;

  if (Object.keys(membershipGift).length) {
    const header = getRecord(membershipGift.header);
    const headerRenderer = getRecord(header.liveChatSponsorshipsHeaderRenderer);
    const primaryText = getText(headerRenderer.primaryText);
    const countMatch = primaryText.match(/\d[\d,]*/);
    const count = countMatch ? Number(countMatch[0].replace(/,/g, '')) : 1;
    return storeYoutubeMembership(
      id,
      getText(headerRenderer.authorName) || getText(membershipGift.authorName) || 'YouTube 用户',
      typeof (headerRenderer.authorExternalChannelId || membershipGift.authorExternalChannelId) === 'string'
        ? String(headerRenderer.authorExternalChannelId || membershipGift.authorExternalChannelId)
        : '',
      `赠送会员 ×${count}`,
      primaryText,
      timestampFromUsec(membershipGift.timestampUsec),
    );
  }
  if (Object.keys(memberMilestone).length) {
    const message = getText(memberMilestone.message);
    const header = getText(memberMilestone.headerSubtext) || getText(memberMilestone.headerPrimaryText);
    return storeYoutubeMembership(
      id,
      getText(memberMilestone.authorName) || 'YouTube 用户',
      typeof memberMilestone.authorExternalChannelId === 'string'
        ? memberMilestone.authorExternalChannelId
        : '',
      '频道会员',
      message || header,
      timestampFromUsec(memberMilestone.timestampUsec),
    );
  }

  const purchaseAmount = getText(renderer.purchaseAmountText);
  const timestamp = timestampFromUsec(renderer.timestampUsec);
  const thumbnails = getRecord(renderer.sticker).thumbnails;
  const stickerThumbnail = Array.isArray(thumbnails) ? thumbnails[thumbnails.length - 1] : null;
  return storeYoutubeGift(
    id,
    getText(renderer.authorName) || 'YouTube 用户',
    typeof renderer.authorExternalChannelId === 'string' ? renderer.authorExternalChannelId : '',
    purchaseAmount,
    getText(renderer.message),
    timestamp,
    safeChatImageUrl(getRecord(stickerThumbnail).url) || '',
    getRunEmotes(renderer.message),
  );
};

const timestampFromUsec = (value: unknown): string => {
  const timestampUsec = Number(value);
  return Number.isFinite(timestampUsec) && timestampUsec > 0
    ? new Date(timestampUsec / 1_000).toTimeString().slice(0, 8)
    : new Date().toTimeString().slice(0, 8);
};

const parseApiGift = (item: NonNullable<LiveChatListResponse['items']>[number]): SuperChatGift | null => {
  const snippet = item.snippet;
  if (!snippet) return null;
  const type = snippet.type;
  const details = type === 'superChatEvent'
    ? snippet.superChatDetails
    : type === 'superStickerEvent' ? snippet.superStickerDetails : undefined;
  if (type === 'membershipGiftingEvent' && item.id) {
    const count = Math.max(1, Number(snippet.membershipGiftingDetails?.giftMembershipsCount) || 1);
    return storeYoutubeMembership(
      item.id,
      item.authorDetails?.displayName || 'YouTube 用户',
      item.authorDetails?.channelId || '',
      `赠送会员 ×${count}`,
      snippet.textMessageDetails?.messageText || '',
      snippet.publishedAt
        ? new Date(snippet.publishedAt).toTimeString().slice(0, 8)
        : new Date().toTimeString().slice(0, 8),
    );
  }
  if ((type === 'newSponsorEvent' || type === 'memberMilestoneChatEvent') && item.id) {
    return storeYoutubeMembership(
      item.id,
      item.authorDetails?.displayName || 'YouTube 用户',
      item.authorDetails?.channelId || '',
      type === 'newSponsorEvent' ? '加入频道会员' : '频道会员里程碑',
      snippet.memberMilestoneChatDetails?.userComment
        || snippet.textMessageDetails?.messageText
        || '',
      snippet.publishedAt
        ? new Date(snippet.publishedAt).toTimeString().slice(0, 8)
        : new Date().toTimeString().slice(0, 8),
    );
  }
  if (!details || !item.id) return null;
  const timestamp = snippet.publishedAt
    ? new Date(snippet.publishedAt).toTimeString().slice(0, 8)
    : new Date().toTimeString().slice(0, 8);
  return storeYoutubeGift(
    item.id,
    item.authorDetails?.displayName || 'YouTube 用户',
    item.authorDetails?.channelId || '',
    details.amountDisplayString || '',
    snippet.superChatDetails?.userComment || '',
    timestamp,
    '',
    [],
    type === 'superStickerEvent',
  );
};

const fetchYoutubePage = async (url: URL): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      Cookie: youtubeCookieHeader(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`YouTube page returned HTTP ${response.status}`);
  return response.text();
};

const resolveVideoIdFromWeb = async (identifier: string): Promise<string> => {
  const handle = parseChannelHandle(identifier);
  if (!handle) throw new Error('请输入有效的 YouTube 视频链接或频道');
  const url = new URL(`/${handle.startsWith('@') ? handle : `@${handle}`}/live`, YOUTUBE_ORIGIN);
  const html = await fetchYoutubePage(url);
  const canonical = html.match(/<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/i)
    || html.match(/<link\s+href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"\s+rel="canonical"/i);
  if (!canonical?.[1]) throw new Error('该 YouTube 频道当前没有进行中的直播');
  const player = extractAssignedJson(html, 'ytInitialPlayerResponse');
  const details = getRecord(player.videoDetails);
  if (details.isLive !== true) throw new Error('该 YouTube 频道当前没有进行中的直播');
  return canonical[1];
};

const openWebChat = async (videoId: string): Promise<WebContinuation> => {
  const url = new URL(CHAT_PAGE_URL);
  url.searchParams.set('is_popout', '1');
  url.searchParams.set('v', videoId);
  const html = await fetchYoutubePage(url);
  if (connectionCookie) {
    const loggedIn = /["']LOGGED_IN["']\s*:\s*true/.test(html);
    status.loginStatus = loggedIn ? 'verified' : 'invalid';
    status.loginError = loggedIn
      ? null
      : 'YouTube rejected the provided cookie; logged-in channel stamps may be unavailable.';
  } else {
    status.loginStatus = 'not_configured';
    status.loginError = null;
  }
  const data = extractAssignedJson(html, 'ytInitialData');
  rememberChannelEmotes(data);
  channelEmotesLoaded = true;
  status.emoteError = null;
  const version = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1];
  const renderer = getRecord(getRecord(data.contents).liveChatRenderer);
  if (!Object.keys(renderer).length || !version) {
    const contents = getRecord(data.contents);
    const reason = getText(getRecord(contents.messageRenderer).text);
    throw new Error(reason || '该视频没有可用的公开实时聊天室');
  }
  webClientVersion = version;
  const menu = getRecord(
    getRecord(
      getRecord(
        getRecord(
          getRecord(renderer.header).liveChatHeaderRenderer,
        ).viewSelector,
      ).sortFilterSubMenuRenderer,
    ),
  ).subMenuItems;
  if (Array.isArray(menu)) {
    for (const entry of [...menu].reverse()) {
      const continuation = findContinuation(getRecord(entry).continuation);
      if (continuation) return continuation;
    }
  }
  const continuation = findContinuation(renderer.continuations);
  if (!continuation) throw new Error('无法从 YouTube 聊天页取得继续令牌');
  return continuation;
};

const pollWebChat = async (videoId: string, connectionGeneration: number): Promise<void> => {
  if (connectionGeneration !== generation) return;
  try {
    if (!webContinuation || !webClientVersion) {
      const initial = await openWebChat(videoId);
      webContinuation = initial.token;
    }
    const response = await fetch(`${GET_LIVE_CHAT_URL}?prettyPrint=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: youtubeCookieHeader(),
        Origin: YOUTUBE_ORIGIN,
        Referer: `${CHAT_PAGE_URL}?is_popout=1&v=${encodeURIComponent(videoId)}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: webClientVersion } },
        continuation: webContinuation,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = getRecord(await response.json());
    if (!response.ok) {
      const message = getText(getRecord(getRecord(result.error).message));
      throw new Error(message || `YouTube chat returned HTTP ${response.status}`);
    }
    const chat = getRecord(getRecord(result.continuationContents).liveChatContinuation);
    if (!Object.keys(chat).length) {
      webContinuation = '';
      setTimeout(() => void pollWebChat(videoId, connectionGeneration), 5_000);
      return;
    }
    const actions = Array.isArray(chat.actions) ? chat.actions : [];
    for (const action of actions) {
      const item = getWebChatItem(action);
      const candidateRenderer = getRecord(item.liveChatTextMessageRenderer);
      const paidRenderer = getRecord(item.liveChatPaidMessageRenderer);
      const stickerRenderer = getRecord(item.liveChatPaidStickerRenderer);
      const actionId = candidateRenderer.id || paidRenderer.id || stickerRenderer.id;
      const seenId = typeof actionId === 'string' ? `youtube-${actionId}` : '';
      if (seenId && webSeenIds.has(seenId)) continue;
      const message = parseWebChatMessage(action);
      if (message) {
        webSeenIds.add(message.id);
        messages.push({ id: nextMessageId, message });
        nextMessageId += 1;
        status.lastMessageAt = new Date().toISOString();
        continue;
      }
      const gift = parseWebChatGift(action);
      if (gift) {
        webSeenIds.add(seenId || gift.id);
        status.lastMessageAt = new Date().toISOString();
      }
    }
    if (webSeenIds.size > MAX_MESSAGES * 4) webSeenIds = new Set([...webSeenIds].slice(-MAX_MESSAGES * 2));
    if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
    const continuation = findContinuation(chat.continuations);
    webContinuation = continuation?.token || '';
    status.state = 'connected';
    status.error = null;
    setTimeout(
      () => void pollWebChat(videoId, connectionGeneration),
      Math.max(continuation?.timeoutMs || 5_000, 1_000),
    );
  } catch (error) {
    if (connectionGeneration !== generation) return;
    status.state = 'error';
    status.error = error instanceof Error ? error.message : 'YouTube 网页弹幕连接失败';
  }
};

const messageBadges = (author: NonNullable<LiveChatListResponse['items']>[number]['authorDetails']): ChatBadge[] => {
  if (!author) return [];
  const badges: ChatBadge[] = [];
  if (author.isChatOwner) badges.push({ type: 'admin', label: '主播', color: '#ef4444' });
  if (author.isChatModerator) badges.push({ type: 'mod', label: '管理员', color: '#3b82f6' });
  if (author.isChatSponsor) badges.push({ type: 'member', label: '会员', color: '#22c55e' });
  return badges;
};

const pollLiveChat = async (liveChatId: string, connectionGeneration: number): Promise<void> => {
  if (connectionGeneration !== generation) return;
  try {
    const params: Record<string, string> = {
      part: 'snippet,authorDetails',
      liveChatId,
      maxResults: '200',
    };
    if (nextPageToken) params.pageToken = nextPageToken;
    const result = await apiGet<LiveChatListResponse>('liveChat/messages', params);
    if (connectionGeneration !== generation) return;

    for (const item of result.items || []) {
      const gift = parseApiGift(item);
      if (gift) {
        status.lastMessageAt = new Date().toISOString();
        continue;
      }
      const snippet = item.snippet;
      if (!snippet) continue;
      const isGiftMembershipNotice = snippet.type === 'giftMembershipReceivedEvent';
      const text = isGiftMembershipNotice
        ? `[Gift membership] ${snippet.displayMessage || ''}`.trim()
        : snippet.textMessageDetails?.messageText;
      if ((snippet.type !== 'textMessageEvent' && !isGiftMembershipNotice) || !text?.trim() || !item.id) continue;
      const publishedAt = snippet.publishedAt;
      const timestamp = publishedAt
        ? new Date(publishedAt).toTimeString().slice(0, 8)
        : new Date().toTimeString().slice(0, 8);
      const emotes = getTextEmotes(text);
      messages.push({
        id: nextMessageId,
        message: {
          id: `youtube-${item.id}`,
          platform: 'youtube',
          user: item.authorDetails?.displayName || 'YouTube 用户',
          text,
          timestamp,
          badges: messageBadges(item.authorDetails),
          ...(emotes.length ? { emotes } : {}),
        },
      });
      nextMessageId += 1;
      status.lastMessageAt = new Date().toISOString();
    }
    if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
    nextPageToken = result.nextPageToken || nextPageToken;
    status.state = 'connected';
    status.error = null;

    const interval = Math.max(result.pollingIntervalMillis || 5_000, 1_000);
    setTimeout(() => void pollLiveChat(liveChatId, connectionGeneration), interval);
  } catch (error) {
    if (connectionGeneration !== generation) return;
    status.state = 'error';
    status.error = error instanceof Error ? error.message : 'YouTube 弹幕连接失败';
  }
};

export const getYoutubeStatus = (): YoutubeStatus => ({ ...status });

export const getYoutubeFeed = (afterId = 0, includeEmotes = false) => ({
  status: getYoutubeStatus(),
  messages: messages.filter((entry) => entry.id > afterId),
  gifts: gifts.filter((entry) => entry.id > afterId),
  ...(includeEmotes && channelEmotesLoaded ? { emotes: getChannelEmotes() } : {}),
});

export const clearYoutubeMessages = (): void => {
  messages.length = 0;
  gifts.length = 0;
};

export const connectYoutube = async (identifier: string, cookie = ''): Promise<YoutubeStatus> => {
  generation += 1;
  const currentGeneration = generation;
  status.state = 'connecting';
  status.requestedChannel = identifier.trim();
  status.videoId = null;
  status.error = null;
  status.loginStatus = cookie.trim() ? 'pending' : 'not_configured';
  status.loginError = cookie.trim() ? 'YouTube login has not yet been verified.' : null;
  status.emoteError = null;
  status.lastMessageAt = null;
  connectionCookie = cookie.trim();
  channelEmotesLoaded = false;
  messages.length = 0;
  gifts.length = 0;
  nextPageToken = '';
  webContinuation = '';
  webClientVersion = '';
  webSeenIds = new Set();
  channelEmotes.clear();

  try {
    let videoId: string;
    let apiFailure: string | null = null;
    if (apiKey()) {
      try {
        videoId = await resolveVideoId(identifier);
        const liveChatId = await resolveLiveChatId(videoId);
        if (currentGeneration !== generation) return getYoutubeStatus();
        status.videoId = videoId;
        status.state = 'connected';
        try {
          await openWebChat(videoId);
        } catch (error) {
          channelEmotesLoaded = true;
          status.emoteError = error instanceof Error ? error.message : 'Could not load YouTube channel stamps.';
          console.warn('Could not load YouTube custom emoji metadata:', error);
        }
        if (currentGeneration !== generation) return getYoutubeStatus();
        await pollLiveChat(liveChatId, currentGeneration);
        return getYoutubeStatus();
      } catch (error) {
        if (currentGeneration !== generation) return getYoutubeStatus();
        apiFailure = error instanceof Error ? error.message : 'YouTube Data API 请求失败';
      }
    }
    videoId = parseVideoId(identifier) || await resolveVideoIdFromWeb(identifier);
    if (currentGeneration !== generation) return getYoutubeStatus();
    status.videoId = videoId;
    await pollWebChat(videoId, currentGeneration);
    if (status.error && apiFailure) {
      status.error = `Data API: ${apiFailure}；网页备用方式: ${status.error}`;
    }
  } catch (error) {
    if (currentGeneration === generation) {
      channelEmotesLoaded = true;
      status.emoteError = error instanceof Error ? error.message : 'Could not load YouTube channel stamps.';
      status.state = 'error';
      const webFailure = error instanceof Error ? error.message : '连接 YouTube 直播失败';
      status.error = apiKey()
        ? `YouTube Data API 和网页备用方式都失败了。网页方式：${webFailure}`
        : webFailure;
    }
  }
  return getYoutubeStatus();
};

export const disconnectYoutube = (): YoutubeStatus => {
  generation += 1;
  status.state = 'disconnected';
  status.requestedChannel = '';
  status.videoId = null;
  status.error = null;
  status.loginStatus = 'not_configured';
  status.loginError = null;
  status.emoteError = null;
  status.lastMessageAt = null;
  connectionCookie = '';
  nextPageToken = '';
  webContinuation = '';
  webClientVersion = '';
  webSeenIds = new Set();
  messages.length = 0;
  gifts.length = 0;
  channelEmotes.clear();
  connectionCookie = '';
  channelEmotesLoaded = false;
  return getYoutubeStatus();
};
