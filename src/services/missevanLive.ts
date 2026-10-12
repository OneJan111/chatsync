import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
import WebSocket, { type RawData } from 'ws';
import type { ChatMessage, SuperChatGift } from '../types';
import { parseEmoteEntries, safeChatImageUrl } from './chatEmotes';
import { setGiftValue } from './giftUtils';

const USER_INFO_URL = 'https://fm.missevan.com/api/user/info';
const SOCKET_URL = 'wss://im.missevan.com/ws';
const MAX_MESSAGES = 500;
const HEARTBEAT = '❤️';

export type MissevanConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface MissevanStatus {
  state: MissevanConnectionState;
  requestedRoom: string;
  roomId: number | null;
  error: string | null;
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

const status: MissevanStatus = {
  state: 'disconnected',
  requestedRoom: '',
  roomId: null,
  error: null,
  lastMessageAt: null,
};
const messages: StoredMessage[] = [];
const gifts: StoredGift[] = [];
let socket: WebSocket | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let nextMessageId = 1;
let reconnectAttempts = 0;

const parseRoomId = (identifier: string): number => {
  const value = identifier.trim();
  const bareRoomId = value.match(/^(?:room\s*#\s*)?(\d+)$/i)?.[1];
  const room = bareRoomId
    ? bareRoomId
    : value.match(/^https?:\/\/(?:fm\.)?missevan\.com\/live\/(\d+)(?:\/|$)/i)?.[1];
  const roomId = Number(room);
  if (!room || !Number.isSafeInteger(roomId) || roomId <= 0) {
    throw new Error('请输入有效的猫耳FM房间号或 fm.missevan.com/live/房间号 链接');
  }
  return roomId;
};

const getSessionCookie = async (): Promise<string> => {
  const response = await fetch(USER_INFO_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
      Referer: 'https://fm.missevan.com/',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`猫耳FM会话初始化失败（HTTP ${response.status}）`);
  const cookies = response.headers.getSetCookie()
    .map((cookie) => cookie.split(';', 1)[0])
    .filter(Boolean);
  return cookies.join('; ');
};

const decodeFrame = (data: Buffer): unknown[] => {
  if (data.toString('utf8') === HEARTBEAT) return [];
  const json = data[0] === 1
    ? brotliDecompressSync(data.subarray(4)).toString('utf8')
    : data.toString('utf8');
  const payload: unknown = JSON.parse(json);
  if (Array.isArray(payload)) return payload;
  return [payload];
};

const asBuffer = (data: RawData): Buffer => {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  if (typeof data === 'string') return Buffer.from(data);
  return Buffer.from(data);
};

const getRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

export const parseMissevanMessage = (event: Record<string, unknown>): ChatMessage | null => {
  if (event.type !== 'message' || event.event !== 'new') return null;
  const user = getRecord(event.user);
  const text = event.message;
  if (typeof text !== 'string' || !text.trim()) return null;
  const messageId = typeof event.msg_id === 'string' || typeof event.msg_id === 'number'
    ? String(event.msg_id)
    : String(nextMessageId);
  return {
    id: `missevan-${messageId}`,
    platform: 'missevan',
    user: typeof user.username === 'string' ? user.username : '猫耳FM 用户',
    text,
    timestamp: new Date().toTimeString().slice(0, 8),
    badges: [],
    emotes: parseEmoteEntries(event.emotes ?? event.emoticons),
    ...(safeChatImageUrl(event.sticker_url ?? event.stickerUrl)
      ? { stickerUrl: safeChatImageUrl(event.sticker_url ?? event.stickerUrl) || undefined }
      : {}),
  };
};

export const parseMissevanGift = (event: Record<string, unknown>): SuperChatGift | null => {
  let user = getRecord(event.user);
  const now = new Date();
  let name = '';
  let amount = 0;
  let currency = '💎';
  let giftName: string | undefined;
  let message: string | undefined;
  let eventId: string;

  if (event.type === 'gift' && event.event === 'send') {
    const gift = getRecord(event.gift);
    const count = Math.max(1, Number(gift.num) || 1);
    giftName = `${typeof gift.name === 'string' ? gift.name : '礼物'} ×${count}`;
    const unitPrice = Number(gift.price);
    amount = Number.isFinite(unitPrice) ? unitPrice * count : 0;
    name = typeof user.username === 'string' && user.username ? user.username : '猫耳FM 用户';
    const oid = String(event.oid ?? event.msg_id ?? '').trim().replace(/^0+$/, '');
    eventId = oid || randomUUID();
  } else if (event.type === 'question' && event.event === 'ask') {
    const question = getRecord(event.content);
    const nestedQuestionUser = getRecord(question.user);
    const questionUser = Object.keys(nestedQuestionUser).length ? nestedQuestionUser : question;
    if (!user.username && questionUser.username) user = questionUser;
    name = typeof user.username === 'string' && user.username
      ? user.username
      : typeof questionUser.username === 'string' && questionUser.username
        ? questionUser.username
        : '猫耳FM 用户';
    const questionPrice = Number(question.price);
    amount = Number.isFinite(questionPrice) ? questionPrice : 0;
    currency = '💎';
    giftName = '付费提问';
    message = typeof question.question === 'string' ? question.question : '';
    const questionId = String(question.question_id ?? '').trim().replace(/^0+$/, '');
    eventId = questionId || randomUUID();
  } else {
    return null;
  }
  const gift = setGiftValue({
    id: `missevan-gift-${eventId}`,
    platform: 'missevan',
    user: name,
    userId: String(user.user_id || ''),
    amount: 0,
    currency: '',
    giftName,
    message,
    timestamp: now.toTimeString().slice(0, 8),
    isThanked: false,
    tierColor: '#a855f7',
  }, currency, amount);
  gifts.push({ id: nextMessageId, gift });
  nextMessageId += 1;
  if (gifts.length > MAX_MESSAGES) gifts.splice(0, gifts.length - MAX_MESSAGES);
  return gift;
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

const connectSocket = async (connectionGeneration: number) => {
  if (connectionGeneration !== generation || status.roomId === null) return;
  status.state = reconnectAttempts === 0 ? 'connecting' : 'reconnecting';
  status.error = null;

  try {
    const cookie = await getSessionCookie();
    if (connectionGeneration !== generation || status.roomId === null) return;
    const url = new URL(SOCKET_URL);
    url.searchParams.set('room_id', String(status.roomId));
    const current = new WebSocket(url, {
      headers: {
        Origin: 'https://fm.missevan.com',
        Referer: 'https://fm.missevan.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      handshakeTimeout: 15_000,
    });
    socket = current;

    current.on('open', () => {
      if (connectionGeneration !== generation) return current.close();
      current.send(JSON.stringify({
        action: 'join',
        uuid: randomUUID(),
        type: 'room',
        room_id: status.roomId,
      }));
      status.state = 'connected';
      status.error = null;
      reconnectAttempts = 0;
      heartbeat = setInterval(() => {
        if (current.readyState === WebSocket.OPEN) current.send(HEARTBEAT);
      }, 25_000);
    });

    current.on('message', (raw) => {
      if (connectionGeneration !== generation) return;
      try {
        const data = asBuffer(raw);
        for (const value of decodeFrame(data)) {
          const event = getRecord(value);
          const roomId = event.room_id;
          if (roomId !== undefined && Number(roomId) !== status.roomId) continue;
          const message = parseMissevanMessage(event);
          if (message) {
            messages.push({ id: nextMessageId, message });
            nextMessageId += 1;
            if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
          } else {
            parseMissevanGift(event);
          }
          status.lastMessageAt = new Date().toISOString();
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : '无法解析猫耳FM弹幕';
        console.error('MissEvan live message error:', error);
        setError(detail);
        current.close();
      }
    });

    current.on('error', (error) => {
      if (connectionGeneration !== generation) return;
      status.error = `猫耳FM弹幕连接错误：${error.message}`;
      console.error(status.error);
    });

    current.on('close', () => {
      if (connectionGeneration !== generation) return;
      socket = null;
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      if (status.state === 'error') return;
      status.state = 'reconnecting';
      reconnectAttempts += 1;
      const delay = Math.min(1_000 * 2 ** Math.min(reconnectAttempts - 1, 5), 30_000);
      reconnectTimer = setTimeout(() => void connectSocket(connectionGeneration), delay);
    });
  } catch (error) {
    if (connectionGeneration !== generation) return;
    setError(error instanceof Error ? error.message : '连接猫耳FM失败');
  }
};

export const getMissevanStatus = (): MissevanStatus => ({ ...status });

export const getMissevanFeed = (afterId = 0) => ({
  status: getMissevanStatus(),
  messages: messages.filter((entry) => entry.id > afterId),
  gifts: gifts.filter((entry) => entry.id > afterId),
});

export const clearMissevanMessages = (): void => {
  messages.length = 0;
  gifts.length = 0;
};

export const connectMissevan = async (identifier: string): Promise<MissevanStatus> => {
  generation += 1;
  const currentGeneration = generation;
  stopSocket();
  reconnectAttempts = 0;
  status.state = 'connecting';
  status.requestedRoom = identifier.trim();
  status.roomId = null;
  status.error = null;
  status.lastMessageAt = null;
  messages.length = 0;
  gifts.length = 0;

  try {
    status.roomId = parseRoomId(identifier);
    void connectSocket(currentGeneration);
  } catch (error) {
    setError(error instanceof Error ? error.message : '连接猫耳FM失败');
  }
  return getMissevanStatus();
};

export const disconnectMissevan = (): MissevanStatus => {
  generation += 1;
  stopSocket();
  reconnectAttempts = 0;
  status.state = 'disconnected';
  status.requestedRoom = '';
  status.roomId = null;
  status.error = null;
  status.lastMessageAt = null;
  messages.length = 0;
  gifts.length = 0;
  return getMissevanStatus();
};
