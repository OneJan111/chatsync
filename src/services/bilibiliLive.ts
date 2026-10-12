import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { brotliDecompressSync, inflateSync } from 'node:zlib';
import WebSocket, { type RawData } from 'ws';
import type { ChatBadge, ChatMessage, SiteEmote, SuperChatGift } from '../types';
import { safeChatImageUrl } from './chatEmotes';
import { setGiftValue } from './giftUtils';

const ROOM_INIT_URL = 'https://api.live.bilibili.com/room/v1/Room/room_init';
const DANMAKU_INFO_URL = 'https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo';
const ROOM_EMOTES_URL = 'https://api.live.bilibili.com/xlive/web-ucenter/v2/emoticon/GetEmoticons';
const ROOM_OWNER_URL = 'https://api.live.bilibili.com/live_user/v1/UserInfo/get_anchor_in_room';
const UPOWER_EMOTES_URL = 'https://api.bilibili.com/x/upowerv2/gw/rights/index';
const GARB_SEARCH_URL = 'https://api.bilibili.com/x/garb/v2/mall/home/search';
const WBI_NAV_URL = 'https://api.bilibili.com/x/web-interface/nav';
const SEND_DANMAKU_URL = 'https://api.live.bilibili.com/msg/send';
const MAX_MESSAGES = 500;
const WBI_KEY_INDEX = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
] as const;

export type BilibiliConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface BilibiliStatus {
  state: BilibiliConnectionState;
  requestedRoom: string;
  roomId: number | null;
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

interface StoredGuardGift {
  stored: StoredGift;
  lastSeenAt: number;
  eventTypes: Set<string>;
}

interface Packet {
  body: Buffer;
  operation: number;
  version: number;
}

interface DanmakuConnectionInfo {
  token: string;
  websocketUrl: string;
}

interface BilibiliCredentials {
  cookie: string;
  uid: number;
}

const status: BilibiliStatus = {
  state: 'disconnected',
  requestedRoom: '',
  roomId: null,
  error: null,
  loginStatus: 'not_configured',
  loginError: null,
  emoteError: null,
  lastMessageAt: null,
};

const messages: StoredMessage[] = [];
const gifts: StoredGift[] = [];
let roomEmotes: SiteEmote[] = [];
let roomEmotesLoaded = false;
const seenGiftTransactions = new Set<string>();
const guardGiftEvents = new Map<string, StoredGuardGift>();
let socket: WebSocket | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let nextMessageId = 1;
let reconnectAttempts = 0;
let connectionCookie = '';
let wbiMixinKey: string | null = null;

const getBilibiliCredentials = (): BilibiliCredentials => {
  const fullCookie = (connectionCookie || process.env.BILIBILI_COOKIE || '')
    .trim()
    .replace(/^cookie:\s*/i, '');
  const cookie = fullCookie;
  const cookieUid = cookie.match(/(?:^|;\s*)DedeUserID=([^;]+)/i)?.[1].trim();
  const uid = cookieUid ? Number(cookieUid) : 0;
  if (cookieUid && (!Number.isSafeInteger(uid) || uid <= 0)) throw new Error('Cookie 中的 DedeUserID 必须是正整数');
  return { cookie, uid };
};

export const sendBilibiliMessage = async (text: string): Promise<void> => {
  const message = text.trim();
  if (!message) throw new Error('弹幕内容不能为空');
  if ([...message].length > 100) throw new Error('B 站弹幕不能超过 100 个字符');
  if (!status.roomId) throw new Error('请先连接 B 站直播间');
  const { cookie } = getBilibiliCredentials();
  const sessdata = cookie.match(/(?:^|;\s*)SESSDATA=([^;]+)/i)?.[1]?.trim();
  const csrf = cookie.match(/(?:^|;\s*)bili_jct=([^;]+)/i)?.[1]?.trim();
  if (!sessdata || !csrf) throw new Error('发送 B 站弹幕需要有效 Cookie（包含 SESSDATA 和 bili_jct）');
  if (status.loginStatus === 'invalid') throw new Error('B 站 Cookie 登录验证失败，请在 Cookie 页面更新凭证');

  const selectedEmote = roomEmotes.find((emote) => emote.code === message);
  const embeddedEmote = roomEmotes.find((emote) => message.includes(emote.code));
  if (embeddedEmote && !selectedEmote) {
    throw new Error('B 站大表情弹幕需单独发送，请不要与文字组合');
  }
  const body = new URLSearchParams({
    bubble: '0',
    color: '16777215',
    csrf,
    csrf_token: csrf,
    fontsize: '25',
    mode: '1',
    msg: message,
    rnd: String(Math.floor(Date.now() / 1_000)),
    roomid: String(status.roomId),
    ...(selectedEmote ? { dm_type: '1', emoticonOptions: '[object Object]' } : {}),
  });
  const response = await fetch(SEND_DANMAKU_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
      Origin: 'https://live.bilibili.com',
      Referer: `https://live.bilibili.com/${status.roomId}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`B 站弹幕发送失败（HTTP ${response.status}）`);
  const result = await response.json() as { code?: unknown; message?: unknown; msg?: unknown };
  if (result.code !== 0) {
    const detail = typeof result.message === 'string' ? result.message
      : typeof result.msg === 'string' ? result.msg : `API code ${String(result.code)}`;
    throw new Error(`B 站弹幕发送失败：${detail}`);
  }
};

const makePacket = (operation: number, body: Buffer, version = 1): Buffer => {
  const packet = Buffer.alloc(16 + body.length);
  packet.writeUInt32BE(packet.length, 0);
  packet.writeUInt16BE(16, 4);
  packet.writeUInt16BE(version, 6);
  packet.writeUInt32BE(operation, 8);
  packet.writeUInt32BE(1, 12);
  body.copy(packet, 16);
  return packet;
};

const asBuffer = (data: RawData): Buffer => {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
};

const unpackPackets = (data: Buffer, depth = 0): Packet[] => {
  if (depth > 8) throw new Error('Bilibili packet compression nesting is too deep');
  const packets: Packet[] = [];
  let offset = 0;

  while (offset + 16 <= data.length) {
    const packetLength = data.readUInt32BE(offset);
    const headerLength = data.readUInt16BE(offset + 4);
    const version = data.readUInt16BE(offset + 6);
    const operation = data.readUInt32BE(offset + 8);
    if (packetLength < headerLength || headerLength < 16 || offset + packetLength > data.length) {
      throw new Error('Bilibili sent a malformed live chat packet');
    }

    const body = data.subarray(offset + headerLength, offset + packetLength);
    if (operation === 5 && (version === 2 || version === 3)) {
      const inflated = version === 2 ? inflateSync(body) : brotliDecompressSync(body);
      packets.push(...unpackPackets(inflated, depth + 1));
    } else {
      packets.push({ body, operation, version });
    }
    offset += packetLength;
  }

  if (offset !== data.length) throw new Error('Bilibili sent an incomplete live chat packet');
  return packets;
};

const roomIdFromInput = (input: string): string => {
  const value = input.trim();
  const bareRoomId = value.match(/^(?:room\s*#\s*)?(\d+)$/i)?.[1];
  if (bareRoomId) return bareRoomId;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('请输入有效的 B 站直播间号或 live.bilibili.com 链接');
  }

  if (url.hostname !== 'live.bilibili.com') {
    throw new Error('直播间链接必须来自 live.bilibili.com');
  }
  const roomId = url.pathname.split('/').filter(Boolean)[0];
  if (!roomId || !/^\d+$/.test(roomId)) {
    throw new Error('直播间链接中没有有效的房间号');
  }
  return roomId;
};

const resolveRoomId = async (input: string): Promise<number> => {
  const requestedId = roomIdFromInput(input);
  const url = new URL(ROOM_INIT_URL);
  url.searchParams.set('id', requestedId);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`B 站房间信息请求失败（HTTP ${response.status}）`);
  const payload = await response.json() as {
    code?: unknown;
    message?: unknown;
    data?: { room_id?: unknown };
  };
  const roomId = payload.data?.room_id;
  if (payload.code !== 0 || typeof roomId !== 'number' || !Number.isSafeInteger(roomId) || roomId <= 0) {
    throw new Error(
      typeof payload.message === 'string' ? payload.message : '无法解析该 B 站直播间号',
    );
  }
  return roomId;
};

const verifyBilibiliCookie = async (): Promise<boolean> => {
  const { cookie } = getBilibiliCredentials();
  if (!cookie) return false;
  const response = await fetch(WBI_NAV_URL, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.bilibili.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Cookie: cookie,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Bilibili login check failed (HTTP ${response.status})`);
  const payload = await response.json() as { data?: { isLogin?: unknown } };
  return payload.data?.isLogin === true;
};

const getWbiMixinKey = async (): Promise<string> => {
  if (wbiMixinKey) return wbiMixinKey;
  const response = await fetch(WBI_NAV_URL, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.bilibili.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`B 站 WBI 密钥请求失败（HTTP ${response.status}）`);
  const payload = await response.json() as {
    code?: unknown;
    data?: { wbi_img?: { img_url?: unknown; sub_url?: unknown } };
  };
  const imgUrl = payload.data?.wbi_img?.img_url;
  const subUrl = payload.data?.wbi_img?.sub_url;
  if (typeof imgUrl !== 'string' || typeof subUrl !== 'string') {
    throw new Error('B 站未能提供 WBI 签名密钥');
  }
  const imgKey = imgUrl.split('/').pop()?.split('.')[0] || '';
  const subKey = subUrl.split('/').pop()?.split('.')[0] || '';
  const source = imgKey + subKey;
  const key = WBI_KEY_INDEX.map((index) => source[index] || '').join('').slice(0, 32);
  if (key.length !== 32) throw new Error('B 站返回了无效的 WBI 签名密钥');
  wbiMixinKey = key;
  return key;
};

const makeWbiSignedParams = async (params: Record<string, string>): Promise<URLSearchParams> => {
  const mixinKey = await getWbiMixinKey();
  const signed = { ...params, wts: String(Math.floor(Date.now() / 1_000)) };
  const query = new URLSearchParams(
    Object.entries(signed)
      .map(([key, value]) => [key, value.replace(/[!'()*]/g, '')] as [string, string])
      .sort(([left], [right]) => left.localeCompare(right)),
  ).toString();
  const wRid = createHash('md5').update(query + mixinKey).digest('hex');
  return new URLSearchParams([...new URLSearchParams(query).entries(), ['w_rid', wRid]]);
};

const getDanmakuConnectionInfo = async (roomId: number): Promise<DanmakuConnectionInfo> => {
  const { cookie } = getBilibiliCredentials();
  const url = new URL(DANMAKU_INFO_URL);
  url.search = (await makeWbiSignedParams({
    id: String(roomId),
    type: '0',
    web_location: '444.8',
  })).toString();
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://www.bilibili.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`B 站弹幕认证请求失败（HTTP ${response.status}）`);
  const payload = await response.json() as {
    code?: unknown;
    message?: unknown;
    data?: {
      token?: unknown;
      host_list?: { host?: unknown; wss_port?: unknown }[];
    };
  };
  const host = payload.data?.host_list?.find((node) =>
    typeof node.host === 'string' && typeof node.wss_port === 'number' && node.wss_port > 0,
  );
  if (payload.code !== 0 || typeof payload.data?.token !== 'string' || !host) {
    const code = typeof payload.code === 'number' ? payload.code : null;
    const detail = code === -352
      ? `-352：B 站风控拒绝了认证请求。读取公开弹幕不要求登录；请稍后重试。${cookie ? '配置 Cookie 也不一定能解除风控。' : ''}`
      : typeof payload.message === 'string' ? payload.message : String(payload.code ?? 'unknown');
    throw new Error(`B 站未能提供弹幕认证信息（${detail}）`);
  }
  return {
    token: payload.data.token,
    websocketUrl: `wss://${host.host}:${host.wss_port}/sub`,
  };
};

const toHexColor = (value: unknown): string | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return `#${Math.trunc(value).toString(16).padStart(6, '0').slice(-6)}`;
};

const getRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

const parseRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'string') return getRecord(value);
  try {
    return getRecord(JSON.parse(value));
  } catch {
    return {};
  }
};

type ProtobufField = string | number | Buffer;

const parseProtobufFields = (buffer: Buffer): Map<number, ProtobufField[]> => {
  const fields = new Map<number, ProtobufField[]>();
  let offset = 0;
  const readVarint = (): number => {
    let value = 0;
    let shift = 0;
    while (offset < buffer.length && shift < 53) {
      const byte = buffer[offset++];
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return value;
      shift += 7;
    }
    throw new Error('Invalid Bilibili gift protobuf varint');
  };
  const add = (field: number, value: ProtobufField) => {
    const values = fields.get(field) || [];
    values.push(value);
    fields.set(field, values);
  };

  while (offset < buffer.length) {
    const key = readVarint();
    const field = Math.floor(key / 8);
    const wireType = key & 7;
    if (field <= 0) throw new Error('Invalid Bilibili gift protobuf field');
    if (wireType === 0) {
      add(field, readVarint());
    } else if (wireType === 1 || wireType === 5) {
      const length = wireType === 1 ? 8 : 4;
      if (offset + length > buffer.length) throw new Error('Incomplete Bilibili gift protobuf field');
      add(field, buffer.subarray(offset, offset + length));
      offset += length;
    } else if (wireType === 2) {
      const length = readVarint();
      if (length < 0 || offset + length > buffer.length) {
        throw new Error('Incomplete Bilibili gift protobuf field');
      }
      add(field, buffer.subarray(offset, offset + length));
      offset += length;
    } else {
      throw new Error('Unsupported Bilibili gift protobuf wire type');
    }
  }
  return fields;
};

const protobufValue = (fields: Map<number, ProtobufField[]>, field: number): ProtobufField | undefined =>
  fields.get(field)?.[0];

const protobufNumber = (fields: Map<number, ProtobufField[]>, field: number): number => {
  const value = protobufValue(fields, field);
  return typeof value === 'number' ? value : 0;
};

const protobufText = (fields: Map<number, ProtobufField[]>, field: number): string => {
  const value = protobufValue(fields, field);
  return Buffer.isBuffer(value) ? value.toString('utf8') : '';
};

export const parseBilibiliGiftV2 = (encoded: string): Record<string, unknown>[] => {
  if (!encoded) return [];
  try {
    const root = parseProtobufFields(Buffer.from(encoded, 'base64'));
    return (root.get(10) || []).flatMap((giftBuffer) => {
      if (!Buffer.isBuffer(giftBuffer)) return [];
      const gift = parseProtobufFields(giftBuffer);
      return [{
        uid: protobufNumber(root, 1),
        uname: protobufText(root, 2),
        face: protobufText(root, 3),
        giftId: protobufNumber(gift, 1),
        giftName: protobufText(gift, 2),
        num: protobufNumber(gift, 3),
        giftType: protobufNumber(gift, 4),
        price: protobufNumber(gift, 5),
        total_coin: protobufNumber(gift, 7),
        coin_type: protobufText(gift, 8),
        tid: protobufText(gift, 9),
        action: protobufText(gift, 18),
        guard_level: protobufNumber(root, 5),
      }];
    });
  } catch {
    return [];
  }
};

export const parseBilibiliEmotes = (info: unknown[]): {
  emotes: { code: string; url: string }[];
  stickerUrl?: string;
} => {
  const metadata = Array.isArray(info[0]) ? info[0] : [];
  const sticker = metadata[12] === 1 ? safeChatImageUrl(getRecord(metadata[13]).url) : null;
  const extra = parseRecord(parseRecord(metadata[15]).extra);
  const rawEmotes = getRecord(extra.emots);
  const emotes = Object.entries(rawEmotes).flatMap(([code, value]) => {
    const url = safeChatImageUrl(getRecord(value).url);
    return url ? [{ code, url }] : [];
  });
  return { emotes, ...(sticker ? { stickerUrl: sticker } : {}) };
};

export const parseBilibiliRoomEmotes = (payload: unknown): SiteEmote[] => {
  const responseData = getRecord(payload).data;
  const data = Array.isArray(responseData) ? responseData
    : [
      getRecord(responseData).data,
      getRecord(responseData).list,
      getRecord(responseData).packages,
      getRecord(responseData).emoticons,
    ]
      .find(Array.isArray);
  if (!Array.isArray(data)) return [];
  return data.flatMap((pack) => {
    const packRecord = getRecord(pack);
    const entries = packRecord.emoticons;
    if (!Array.isArray(entries)) return [];
    const pkgType = packRecord.pkg_type;
    const packCategory: SiteEmote['category'] = pkgType === 1 ? 'general' : pkgType === 2 ? 'room' : 'garb';
    return entries.flatMap((entry): SiteEmote[] => {
      const emote = getRecord(entry);
      const code = typeof emote.emoticon_unique === 'string' ? emote.emoticon_unique : '';
      const url = safeChatImageUrl(emote.url);
      if (!code || !url) return [];
      const label = [emote.emoji, emote.descript, code].find(
        (value): value is string => typeof value === 'string' && Boolean(value.trim()),
      ) || code;
      const isCharge = code.startsWith('upower_[UPOWER_');
      const garbName = packCategory === 'garb'
        ? code.match(/^upower_\[(.+)_[^_\]]+\]$/)?.[1]
        : undefined;
      const category = isCharge ? 'charge' : packCategory;
      const packName = isCharge
        ? '充电表情'
        : garbName || (typeof packRecord.pkg_name === 'string' ? packRecord.pkg_name : '') || '装扮表情';
      const parsed: SiteEmote = {
        code,
        label,
        url,
        platform: 'bilibili',
        isLocked: emote.perm !== 1,
        category,
        packName,
        ...(typeof emote.unlock_show_text === 'string' && emote.unlock_show_text
          ? { unlockHint: emote.unlock_show_text }
          : {}),
      };
      return [parsed];
    });
  });
};

export const parseBilibiliUpowerEmotes = (payload: unknown, uid: number): SiteEmote[] => {
  const rights = getRecord(getRecord(payload).data).privilege_rights;
  const tiers = Object.values(getRecord(rights))
    .map((right) => getRecord(getRecord(right).emote))
    .filter((emote) => Object.keys(emote).length > 0);
  if (!tiers.length) return [];
  const selected = tiers.find((emote) => emote.locked === false) || tiers[0];
  const isLocked = selected.locked !== false;
  const seen = new Set<string>();
  const emojis = Array.isArray(selected.emojis) ? selected.emojis : [];
  return emojis.flatMap((item): SiteEmote[] => {
    const emote = getRecord(item);
    const name = typeof emote.name === 'string' ? emote.name : '';
    const url = safeChatImageUrl(emote.icon);
    if (!name || !url || seen.has(name)) return [];
    seen.add(name);
    return [{
      code: `upower_[UPOWER_${uid}_${name}]`,
      label: name,
      url,
      platform: 'bilibili',
      isLocked,
      category: 'charge',
      packName: '充电表情',
      unlockHint: '为主播充电后可用',
    }];
  });
};

export const mergeBilibiliEmotes = (
  text: string,
  inlineEmotes: { code: string; url: string }[] = [],
  catalogue: SiteEmote[] = roomEmotes,
): { code: string; url: string }[] => {
  const emotes = new Map(inlineEmotes.map((emote) => [emote.code, emote.url]));
  for (const emote of catalogue) {
    if (text.includes(emote.code) && !emotes.has(emote.code)) {
      emotes.set(emote.code, emote.url);
    }
  }
  return [...emotes].map(([code, url]) => ({ code, url }));
};

const identifyRoomOwnerGarbEmotes = async (
  catalogue: SiteEmote[],
  ownerUid: number,
  headers: HeadersInit,
): Promise<string[]> => {
  const packNames = [...new Set(catalogue
    .filter((emote) => emote.category === 'garb' && emote.packName && emote.packName !== '装扮表情')
    .map((emote) => emote.packName as string))];
  const results = await Promise.all(packNames.map(async (packName) => {
    try {
      const url = new URL(GARB_SEARCH_URL);
      url.searchParams.set('key_word', packName);
      url.searchParams.set('pn', '1');
      url.searchParams.set('ps', '20');
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as {
        code?: unknown;
        data?: { list?: unknown };
      };
      if (payload.code !== 0) throw new Error(`code ${String(payload.code)}`);
      const items = Array.isArray(payload.data?.list) ? payload.data.list : [];
      const searchName = packName.toLocaleLowerCase();
      const belongsToRoomOwner = items.some((value) => {
        const item = getRecord(value);
        const itemName = typeof item.name === 'string' ? item.name.toLocaleLowerCase() : '';
        const fanMid = getRecord(item.properties).fan_mid;
        return Boolean(itemName)
          && (searchName.includes(itemName) || itemName.includes(searchName))
          && String(fanMid) === String(ownerUid);
      });
      return { packName, belongsToRoomOwner };
    } catch (error) {
      console.warn(`Could not identify Bilibili garb owner for "${packName}":`, error);
      return { packName, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }));
  const ownedNames = new Set(results
    .filter((result) => result.belongsToRoomOwner)
    .map((result) => result.packName));
  for (const emote of catalogue) {
    if (emote.category === 'garb' && emote.packName && ownedNames.has(emote.packName)) {
      emote.isRoomOwner = true;
    }
  }
  return results.flatMap((result) => 'error' in result
    ? [`Could not identify Bilibili garb owner for "${result.packName}" (${result.error})`]
    : []);
};

const loadBilibiliRoomEmotes = async (
  roomDisplayId: string,
  connectionGeneration: number,
): Promise<void> => {
  const { cookie } = getBilibiliCredentials();
  const headers = {
    Accept: 'application/json, text/plain, */*',
    Referer: `https://live.bilibili.com/${roomDisplayId}`,
    Origin: 'https://live.bilibili.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ...(cookie ? { Cookie: cookie } : {}),
  };
  const ownerUrl = new URL(ROOM_OWNER_URL);
  ownerUrl.searchParams.set('roomid', roomDisplayId);
  const ownerRequest = Promise.allSettled([
    fetch(ownerUrl, { headers, signal: AbortSignal.timeout(10_000) }),
  ]);
  const errors: string[] = [];
  const roomEmoteErrors: string[] = [];
  let catalogue: SiteEmote[] = [];
  const roomIds = [...new Set([
    roomDisplayId,
    status.roomId === null ? roomDisplayId : String(status.roomId),
  ])];
  for (const roomId of roomIds) {
    try {
      const roomEmoteUrl = new URL(ROOM_EMOTES_URL);
      roomEmoteUrl.searchParams.set('platform', 'pc');
      roomEmoteUrl.searchParams.set('room_id', roomId);
      let response = await fetch(roomEmoteUrl, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Bilibili emote request failed (HTTP ${response.status})`);
      let payload = await response.json() as { code?: unknown; message?: unknown; data?: unknown };
      if (payload.code === -500) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        if (connectionGeneration !== generation) return;
        response = await fetch(roomEmoteUrl, {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`Bilibili emote retry failed (HTTP ${response.status})`);
        payload = await response.json() as typeof payload;
      }
      if (payload.code === 0) {
        catalogue = parseBilibiliRoomEmotes(payload);
        if (catalogue.length) break;
        roomEmoteErrors.push(`Bilibili room emote API returned no room emote packs for room_id=${roomId} (code 0)`);
      } else {
        roomEmoteErrors.push(`Bilibili room emote API returned code ${String(payload.code)} for room_id=${roomId}`
          + (typeof payload.message === 'string' ? `: ${payload.message}` : ''));
      }
    } catch (error) {
      roomEmoteErrors.push(`${error instanceof Error ? error.message : 'Could not parse Bilibili room emotes'}`
        + ` (room_id=${roomId})`);
    }
  }
  if (!catalogue.length) errors.push(...roomEmoteErrors);
  const [ownerResult] = await ownerRequest;
  if (ownerResult.status === 'fulfilled' && ownerResult.value.ok) {
    try {
      const payload = await ownerResult.value.json() as {
        code?: unknown;
        data?: { info?: { uid?: unknown } };
      };
      const uid = payload.data?.info?.uid;
      if (payload.code === 0 && typeof uid === 'number' && Number.isSafeInteger(uid) && uid > 0) {
        errors.push(...await identifyRoomOwnerGarbEmotes(catalogue, uid, headers));
        const rightsUrl = new URL(UPOWER_EMOTES_URL);
        rightsUrl.searchParams.set('up_mid', String(uid));
        const response = await fetch(rightsUrl, { headers, signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`Bilibili charging emote request failed (HTTP ${response.status})`);
        const rights = await response.json() as { code?: unknown; message?: unknown };
        if (rights.code !== 0) {
          errors.push(`Bilibili charging emote API returned code ${String(rights.code)}`
            + (typeof rights.message === 'string' ? `: ${rights.message}` : ''));
        } else {
          catalogue = [...catalogue, ...parseBilibiliUpowerEmotes(rights, uid)];
        }
      } else {
        errors.push('Could not resolve the Bilibili room owner for charging emotes');
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Bilibili charging emote request failed');
    }
  } else {
    errors.push(ownerResult.status === 'rejected'
      ? (ownerResult.reason instanceof Error ? ownerResult.reason.message : 'Room owner request failed')
      : `Bilibili room owner request failed (HTTP ${ownerResult.value.status})`);
  }
  if (connectionGeneration !== generation) return;
  roomEmotes = [...new Map(catalogue.map((emote) => [emote.code, emote])).values()];
  roomEmotesLoaded = true;
  status.emoteError = errors.length ? errors.join('; ') : null;
  for (const entry of messages) {
    const emotes = mergeBilibiliEmotes(entry.message.text, entry.message.emotes || []);
    if (emotes.length) entry.message = { ...entry.message, emotes };
  }
};

const parseDanmaku = (command: Record<string, unknown>): ChatMessage | null => {
  const info = command.info;
  if (!Array.isArray(info) || typeof info[1] !== 'string' || !info[1].trim()) return null;

  const userInfo = Array.isArray(info[2]) ? info[2] : [];
  const medal = Array.isArray(info[3]) ? info[3] : [];
  const guardLevel = typeof info[4] === 'number' ? info[4] : 0;
  const parsedEmotes = parseBilibiliEmotes(info);
  const emotes = mergeBilibiliEmotes(info[1], parsedEmotes.emotes);
  const { stickerUrl } = parsedEmotes;
  const badges: ChatBadge[] = [];
  const medalLevel = typeof medal[0] === 'number' ? medal[0] : 0;
  const medalName = typeof medal[1] === 'string' ? medal[1] : '';
  if (medalLevel > 0 && medalName) {
    badges.push({
      type: 'fan_medal',
      label: `${medalName} ${medalLevel}`,
      medalName,
      level: medalLevel,
      color: toHexColor(medal[4]) || '#23ade5',
    });
  }
  if (guardLevel > 0) {
    badges.push({
      type: guardLevel === 1 ? 'fleet_guard' : guardLevel === 2 ? 'fleet_admiral' : 'fleet_governor',
      label: guardLevel === 1 ? '舰长' : guardLevel === 2 ? '提督' : '总督',
      color: guardLevel === 1 ? '#00d0ff' : guardLevel === 2 ? '#f59e0b' : '#ef4444',
    });
  }

  const now = new Date();
  return {
    id: `bilibili-${nextMessageId}`,
    platform: 'bilibili',
    user: typeof userInfo[1] === 'string' ? userInfo[1] : 'Bilibili 用户',
    text: info[1],
    timestamp: now.toTimeString().slice(0, 8),
    badges,
    ...(emotes.length ? { emotes } : {}),
    ...(stickerUrl ? { stickerUrl } : {}),
  };
};

export const parseBilibiliGift = (command: Record<string, unknown>): SuperChatGift | null => {
  const kind = typeof command.cmd === 'string' ? command.cmd.split(':', 1)[0] : '';
  const data = getRecord(command.data);
  const isSuperChat = kind === 'SUPER_CHAT_MESSAGE' || kind === 'SUPER_CHAT_MESSAGE_JPN';
  const isGuard = kind === 'GUARD_BUY';
  const isCombo = kind === 'COMBO_SEND';
  const isGuardToast = kind === 'USER_TOAST_MSG';
  const isRedPocket = kind === 'POPULARITY_RED_POCKET_NEW';
  if (kind !== 'SEND_GIFT' && !isSuperChat && !isGuard && !isCombo && !isGuardToast && !isRedPocket) return null;

  const userInfo = getRecord(data.user_info);
  const user = [data.uname, data.username, data.sender_name, userInfo.uname].find(
    (value): value is string => typeof value === 'string' && Boolean(value.trim()),
  ) || '';
  if (!user) return null;
  const now = new Date();
  const count = Math.max(1, Number(isCombo ? data.combo_num : data.num) || 1);
  const coinTotal = isRedPocket
    ? (Number(data.price) || 0) * 100 * count
    : Number(
      (isCombo ? data.combo_total_coin : undefined)
      || data.total_coin
      || (Number(data.price) || 0) * count,
    );
  const giftAmount = isSuperChat
    ? Number(data.price) || 0
    : isGuard || isGuardToast ? (Number(data.price) || 0) * count / 1000
      : coinTotal / 1000;
  const giftNameValue = data.giftName || data.gift_name || data.role_name;
  const giftName = typeof giftNameValue === 'string' && giftNameValue.trim()
    ? giftNameValue
    : isRedPocket ? '红包' : isGuard || isGuardToast ? '大航海' : '礼物';
  const text = isSuperChat
    ? typeof data.message === 'string' ? data.message : ''
    : `${giftName} ×${count}`;
  const id = `bilibili-gift-${String(data.tid || data.batch_combo_id || data.combo_id || data.lot_id || data.id || nextMessageId)}`;
  const tierColor = giftAmount >= 1000 ? '#ef4444'
    : giftAmount >= 500 ? '#f97316'
      : giftAmount >= 100 ? '#eab308' : '#22c55e';
  return setGiftValue({
    id,
    platform: 'bilibili',
    user,
    userId: String(data.uid || data.sender_uid || userInfo.uid || ''),
    amount: 0,
    currency: '',
    ...(isSuperChat ? { giftName: '醒目留言', message: text } : { giftName: text }),
    timestamp: now.toTimeString().slice(0, 8),
    isThanked: false,
    tierColor,
  }, 'CNY', giftAmount);
};

const storeGift = (gift: SuperChatGift) => {
  const stored = { id: nextMessageId, gift };
  gifts.push(stored);
  nextMessageId += 1;
  if (gifts.length > MAX_MESSAGES) gifts.splice(0, gifts.length - MAX_MESSAGES);
  return stored;
};

const isNewGiftTransaction = (value: unknown): boolean => {
  if (typeof value !== 'string' || !value) return true;
  if (seenGiftTransactions.has(value)) return false;
  seenGiftTransactions.add(value);
  if (seenGiftTransactions.size > MAX_MESSAGES) {
    const oldest = seenGiftTransactions.values().next().value;
    if (oldest) seenGiftTransactions.delete(oldest);
  }
  return true;
};

const storeGuardGift = (kind: 'GUARD_BUY' | 'USER_TOAST_MSG', data: Record<string, unknown>) => {
  const gift = parseBilibiliGift({ cmd: kind, data });
  const userId = String(data.uid || '');
  const level = Number(data.guard_level) || 0;
  if (!gift || !userId || level <= 0) return;

  const now = Date.now();
  for (const [key, entry] of guardGiftEvents) {
    if (now - entry.lastSeenAt > 30_000) guardGiftEvents.delete(key);
  }
  const key = `${userId}:${level}`;
  const previous = guardGiftEvents.get(key);
  if (!previous || now - previous.lastSeenAt > 30_000) {
    const stored = storeGift(gift);
    guardGiftEvents.set(key, { stored, lastSeenAt: now, eventTypes: new Set([kind]) });
    return;
  }
  if (previous.eventTypes.has(kind)) return;

  previous.eventTypes.add(kind);
  previous.lastSeenAt = now;
  if (kind === 'USER_TOAST_MSG' || !previous.eventTypes.has('USER_TOAST_MSG')) {
    previous.stored.gift = { ...gift, id: previous.stored.gift.id };
  }
};

const clearTimers = () => {
  if (heartbeat) clearInterval(heartbeat);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  heartbeat = null;
  reconnectTimer = null;
};

const stopSocket = () => {
  clearTimers();
  const current = socket;
  socket = null;
  if (current && current.readyState !== WebSocket.CLOSED) current.close();
};

const setError = (message: string) => {
  status.state = 'error';
  status.error = message;
};

const connectSocket = async (connectionGeneration: number): Promise<void> => {
  if (connectionGeneration !== generation || status.roomId === null) return;
  status.state = reconnectAttempts === 0 ? 'connecting' : 'reconnecting';
  status.error = null;

  try {
    const roomId = status.roomId;
    const { uid } = getBilibiliCredentials();
    const { token, websocketUrl } = await getDanmakuConnectionInfo(roomId);
    if (connectionGeneration !== generation) return;

    const current = new WebSocket(websocketUrl, {
      headers: { Origin: 'https://live.bilibili.com' },
      handshakeTimeout: 15_000,
    });
    socket = current;

    current.on('open', () => {
      if (connectionGeneration !== generation) return current.close();
      const auth = Buffer.from(JSON.stringify({
        uid,
        roomid: roomId,
        protover: 3,
        platform: 'web',
        type: 2,
        key: token,
      }));
      current.send(makePacket(7, auth));
    });

    current.on('message', (data) => {
      if (connectionGeneration !== generation) return;
      try {
        for (const packet of unpackPackets(asBuffer(data))) {
          if (packet.operation === 8) {
            const auth = JSON.parse(packet.body.toString('utf8')) as { code?: unknown; message?: unknown };
            if (auth.code !== 0) {
              setError(typeof auth.message === 'string' ? auth.message : 'B 站直播间认证失败');
              current.close();
              continue;
            }
            status.state = 'connected';
            status.error = null;
            reconnectAttempts = 0;
            heartbeat = setInterval(() => {
              if (current.readyState === WebSocket.OPEN) current.send(makePacket(2, Buffer.alloc(0)));
            }, 25_000);
          }

          if (packet.operation !== 5) continue;
          const command = JSON.parse(packet.body.toString('utf8')) as Record<string, unknown>;
          if (typeof command.cmd !== 'string') continue;
          const kind = command.cmd.split(':', 1)[0];
          if (kind === 'SEND_GIFT_V2') {
            const payload = getRecord(command.data);
            const encoded = typeof payload.pb === 'string' ? payload.pb : '';
            for (const data of parseBilibiliGiftV2(encoded)) {
              if (!isNewGiftTransaction(data.tid)) continue;
              const gift = parseBilibiliGift({ cmd: 'SEND_GIFT', data });
              if (gift) storeGift(gift);
            }
          } else if (kind === 'DANMU_MSG') {
            const message = parseDanmaku(command);
            if (!message) continue;
            messages.push({ id: nextMessageId, message });
            nextMessageId += 1;
            if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
          } else if (kind === 'GUARD_BUY' || kind === 'USER_TOAST_MSG') {
            storeGuardGift(kind, getRecord(command.data));
          } else {
            const data = getRecord(command.data);
            if (kind === 'SEND_GIFT' && !isNewGiftTransaction(data.tid)) continue;
            const gift = parseBilibiliGift(command);
            if (!gift) continue;
            storeGift(gift);
          }
          status.lastMessageAt = new Date().toISOString();
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : '无法解析 B 站弹幕';
        console.error('Bilibili live message error:', error);
        setError(detail);
        current.close();
      }
    });

    current.on('error', (error) => {
      if (connectionGeneration !== generation) return;
      status.error = `B 站弹幕连接错误：${error.message}`;
      console.error(status.error);
    });

    current.on('close', (code, reason) => {
      if (connectionGeneration !== generation) return;
      socket = null;
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      if (status.state === 'error') return;
      status.state = 'reconnecting';
      status.error = `B 站弹幕连接已关闭（${code}${reason.length ? `：${reason.toString()}` : ''}）`;
      console.warn(status.error);
      reconnectAttempts += 1;
      const delay = Math.min(1_000 * 2 ** Math.min(reconnectAttempts - 1, 5), 30_000);
      reconnectTimer = setTimeout(() => void connectSocket(connectionGeneration), delay);
    });
  } catch (error) {
    if (connectionGeneration !== generation) return;
    setError(error instanceof Error ? error.message : '获取 B 站弹幕认证信息失败');
    console.error('Bilibili live authentication error:', error);
  }
};

export const getBilibiliStatus = (): BilibiliStatus => ({ ...status });

export const getBilibiliFeed = (afterId = 0, includeEmotes = false) => ({
  status: getBilibiliStatus(),
  messages: messages.filter((entry) => entry.id > afterId).map((entry) => entry),
  gifts: gifts.filter((entry) => entry.id > afterId).map((entry) => entry),
  ...(includeEmotes && roomEmotesLoaded ? { emotes: roomEmotes } : {}),
});

export const clearBilibiliMessages = (): void => {
  messages.length = 0;
  gifts.length = 0;
  seenGiftTransactions.clear();
  guardGiftEvents.clear();
};

export const connectBilibili = async (roomInput: string, cookie = ''): Promise<BilibiliStatus> => {
  generation += 1;
  const currentGeneration = generation;
  stopSocket();
  connectionCookie = cookie.trim();
  reconnectAttempts = 0;
  status.requestedRoom = roomInput.trim();
  status.roomId = null;
  status.lastMessageAt = null;
  status.loginStatus = connectionCookie ? 'pending' : 'not_configured';
  status.loginError = null;
  status.emoteError = null;
  status.error = null;
  status.state = 'connecting';
  messages.length = 0;
  gifts.length = 0;
  roomEmotes = [];
  roomEmotesLoaded = false;
  seenGiftTransactions.clear();
  guardGiftEvents.clear();

  try {
    const roomId = await resolveRoomId(roomInput);
    if (currentGeneration !== generation) return getBilibiliStatus();
    status.roomId = roomId;
    if (connectionCookie.trim()) {
      try {
        const loggedIn = await verifyBilibiliCookie();
        if (currentGeneration !== generation) return getBilibiliStatus();
        status.loginStatus = loggedIn ? 'verified' : 'invalid';
        status.loginError = loggedIn ? null : 'Bilibili rejected the provided cookie; logged-in emotes may be unavailable.';
      } catch (error) {
        if (currentGeneration !== generation) return getBilibiliStatus();
        status.loginStatus = 'invalid';
        status.loginError = error instanceof Error
          ? `Could not verify Bilibili cookie: ${error.message}`
          : 'Could not verify Bilibili cookie.';
      }
    } else {
      status.loginStatus = 'not_configured';
      status.loginError = null;
    }
    const roomDisplayId = roomIdFromInput(roomInput);
    const emoteLoad = loadBilibiliRoomEmotes(roomDisplayId, currentGeneration).catch((error: unknown) => {
      if (currentGeneration !== generation) return;
      console.warn('Could not load Bilibili room emotes:', error);
      roomEmotes = [];
      roomEmotesLoaded = true;
      status.emoteError = error instanceof Error ? error.message : 'Could not load Bilibili room emotes.';
    });
    await connectSocket(currentGeneration);
    await emoteLoad;
  } catch (error) {
    if (currentGeneration === generation) {
      setError(error instanceof Error ? error.message : '连接 B 站直播间失败');
    }
  }
  return getBilibiliStatus();
};

export const disconnectBilibili = (): BilibiliStatus => {
  generation += 1;
  stopSocket();
  connectionCookie = '';
  reconnectAttempts = 0;
  status.state = 'disconnected';
  status.requestedRoom = '';
  status.roomId = null;
  status.error = null;
  status.loginStatus = 'not_configured';
  status.loginError = null;
  status.emoteError = null;
  status.lastMessageAt = null;
  messages.length = 0;
  gifts.length = 0;
  roomEmotes = [];
  roomEmotesLoaded = false;
  seenGiftTransactions.clear();
  guardGiftEvents.clear();
  return getBilibiliStatus();
};
