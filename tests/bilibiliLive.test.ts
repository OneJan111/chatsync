import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  connectBilibili,
  disconnectBilibili,
  getBilibiliFeed,
  mergeBilibiliEmotes,
  sendBilibiliMessage,
  parseBilibiliEmotes,
  parseBilibiliGift,
  parseBilibiliRoomEmotes,
  parseBilibiliUpowerEmotes,
  parseBilibiliGiftV2,
} from '../src/services/bilibiliLive';

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
let bilibiliLoginVerified = false;
let capturedBilibiliLoginCookie: string | null = null;

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const mockFetch = (handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === '/x/web-interface/nav') {
      const cookie = new Headers(init?.headers).get('cookie');
      if (cookie) capturedBilibiliLoginCookie = cookie;
      return jsonResponse({
        code: bilibiliLoginVerified ? 0 : -101,
        message: bilibiliLoginVerified ? '0' : '账号未登录',
        data: {
          isLogin: bilibiliLoginVerified,
          wbi_img: {
            img_url: 'https://i0.hdslb.com/bfs/wbi/0123456789abcdefghijklmnopqrstuvwxyzABCDEF.png',
            sub_url: 'https://i0.hdslb.com/bfs/wbi/ZYXWVUTSRQPONMLKJIHGFEDCBA9876543210fedcba.png',
          },
        },
      });
    }
    return handler(url, init);
  }) as typeof fetch;
};

const encodeVarint = (value: number): Buffer => {
  const bytes: number[] = [];
  let remaining = value;
  while (remaining > 0x7f) {
    bytes.push((remaining & 0x7f) | 0x80);
    remaining = Math.floor(remaining / 128);
  }
  bytes.push(remaining);
  return Buffer.from(bytes);
};

const encodeProtobufVarint = (field: number, value: number): Buffer =>
  Buffer.concat([encodeVarint(field << 3), encodeVarint(value)]);

const encodeProtobufBytes = (field: number, value: Buffer): Buffer =>
  Buffer.concat([encodeVarint((field << 3) | 2), encodeVarint(value.length), value]);

const encodeProtobufText = (field: number, value: string): Buffer =>
  encodeProtobufBytes(field, Buffer.from(value));

describe('Bilibili live service', () => {
  beforeEach(() => {
    disconnectBilibili();
    bilibiliLoginVerified = false;
    capturedBilibiliLoginCookie = null;
    console.error = () => {};
    console.warn = () => {};
  });

  afterEach(() => {
    disconnectBilibili();
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  it('resolves a room URL and sends a full Cookie header to danmaku auth', async () => {
    const cookie = 'SESSDATA=session-value; bili_jct=csrf-value; DedeUserID=12345';
    const requests: { url: URL; init?: RequestInit }[] = [];
    mockFetch((url, init) => {
      requests.push({ url, init });
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) return jsonResponse({ code: 0, data: [] });
      return jsonResponse({ code: -352, message: '-352', ttl: 1 });
    });

    const status = await connectBilibili('https://live.bilibili.com/25760587', cookie);

    assert.equal(status.state, 'error');
    assert.equal(status.roomId, 25760587);
    assert.equal(requests.length, 4);
    assert.equal(requests[0].url.searchParams.get('id'), '25760587');
    const authRequest = requests.find(({ url }) => url.pathname.endsWith('/getDanmuInfo'));
    assert.ok(authRequest);
    assert.equal(authRequest.url.searchParams.get('id'), '25760587');
    assert.equal(authRequest.url.searchParams.get('type'), '0');
    assert.equal(authRequest.url.searchParams.get('web_location'), '444.8');
    assert.match(authRequest.url.searchParams.get('wts') || '', /^\d+$/);
    assert.match(authRequest.url.searchParams.get('w_rid') || '', /^[a-f0-9]{32}$/);
    const headers = new Headers(authRequest.init?.headers);
    assert.equal(headers.get('cookie'), cookie);
    assert.equal(headers.get('referer'), 'https://www.bilibili.com');
    assert.match(status.error || '', /-352/);
    assert.match(status.error || '', /不要求登录/);
    assert.doesNotMatch(status.error || '', /session-value|csrf-value/);
  });

  it('accepts a bare room ID and reports room API errors', async () => {
    let requestedId: string | null = null;
    mockFetch((url) => {
      requestedId = url.searchParams.get('id');
      return jsonResponse({ code: -1, message: 'room not found' });
    });

    const status = await connectBilibili(' 25760587 ');

    assert.equal(requestedId, '25760587');
    assert.equal(status.state, 'error');
    assert.equal(status.roomId, null);
    assert.equal(status.error, 'room not found');
  });

  it('rejects URLs from hosts other than live.bilibili.com without making a request', async () => {
    let requestCount = 0;
    mockFetch(() => {
      requestCount += 1;
      return jsonResponse({});
    });

    const status = await connectBilibili('https://example.com/25760587');

    assert.equal(requestCount, 0);
    assert.equal(status.state, 'error');
    assert.match(status.error || '', /必须来自 live\.bilibili\.com/);
  });

  it('surfaces HTTP failures from room initialization', async () => {
    mockFetch(() => jsonResponse({}, 503));

    const status = await connectBilibili('25760587');

    assert.equal(status.state, 'error');
    assert.equal(status.error, 'B 站房间信息请求失败（HTTP 503）');
  });

  it('does not include cookies in the feed response', async () => {
    mockFetch((url) => url.pathname.endsWith('/room_init')
      ? jsonResponse({ code: 0, data: { room_id: 25760587 } })
      : jsonResponse({ code: -352, message: '-352' }));
    await connectBilibili('25760587', 'SESSDATA=private-value');

    const feed = getBilibiliFeed(0, true);

    assert.equal(feed.status.state, 'error');
    assert.deepEqual(feed.messages, []);
    assert.equal(JSON.stringify(feed).includes('private-value'), false);
  });

  it('requests the room emote catalogue with the saved Bilibili cookie', async () => {
    const cookie = 'SESSDATA=secret-session; bili_jct=csrf; DedeUserID=12345';
    let emoteCookie: string | null = null;
    mockFetch((url, init) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) {
        emoteCookie = new Headers(init?.headers).get('cookie');
        return jsonResponse({
          code: 0,
          data: [{
            emoticons: [{
              emoticon_unique: '[room_wave]',
              emoji: 'Room wave',
              url: 'https://i0.hdslb.com/bfs/emote/wave.png',
              perm: 1,
            }],
          }],
        });
      }
      return jsonResponse({ code: -352, message: '-352' });
    });

    await connectBilibili('25760587', cookie);
    const feed = getBilibiliFeed(0, true);

    assert.equal(emoteCookie, cookie);
    assert.deepEqual(feed.emotes?.map(({ code }) => code), ['[room_wave]']);
    assert.equal(feed.status.loginStatus, 'invalid');
  });

  it('uses the displayed room ID for emote and owner lookup, not the canonical ID', async () => {
    const requestedEmoteRoomIds: string[] = [];
    mockFetch((url) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 99887766 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) {
        requestedEmoteRoomIds.push(url.searchParams.get('room_id') || '');
        return jsonResponse({
          code: 0,
          data: [{
            pkg_type: 2,
            pkg_name: 'Room-only package',
            emoticons: [{
              emoticon_unique: '[room_only]',
              url: '//i0.hdslb.com/bfs/emote/room-only.png',
              perm: 1,
            }],
          }],
        });
      }
      if (url.pathname.endsWith('/get_anchor_in_room')) {
        assert.equal(url.searchParams.get('roomid'), '25760587');
        return jsonResponse({ code: 0, data: { info: { uid: 67890 } } });
      }
      if (url.pathname.endsWith('/rights/index')) {
        return jsonResponse({ code: 0, data: { privilege_rights: {} } });
      }
      return jsonResponse({ code: -352, message: '-352' });
    });

    const status = await connectBilibili('25760587');
    const feed = getBilibiliFeed(0, true);

    assert.equal(status.roomId, 99887766);
    assert.deepEqual(requestedEmoteRoomIds, ['25760587']);
    assert.equal(feed.emotes?.[0].code, '[room_only]');
    assert.equal(feed.emotes?.[0].category, 'room');
  });

  it('falls back to the canonical room ID when the displayed ID returns no emote packs', async () => {
    const emoteRoomIds: string[] = [];
    mockFetch((url) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 99887766 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) {
        const roomId = url.searchParams.get('room_id') || '';
        emoteRoomIds.push(roomId);
        return roomId === '25760587'
          ? jsonResponse({ code: 0, data: [] })
          : jsonResponse({
            code: 0,
            data: [{
              pkg_type: 2,
              pkg_name: 'Room package',
              emoticons: [{
                emoticon_unique: '[room_fallback]',
                url: '//i0.hdslb.com/bfs/emote/room-fallback.png',
                perm: 1,
              }],
            }],
          });
      }
      if (url.pathname.endsWith('/get_anchor_in_room')) {
        return jsonResponse({ code: 0, data: { info: { uid: 67890 } } });
      }
      if (url.pathname.endsWith('/rights/index')) {
        return jsonResponse({ code: 0, data: { privilege_rights: {} } });
      }
      return jsonResponse({ code: -352, message: '-352' });
    });

    await connectBilibili('25760587');
    const feed = getBilibiliFeed(0, true);

    assert.deepEqual(emoteRoomIds, ['25760587', '99887766']);
    assert.equal(feed.emotes?.[0].code, '[room_fallback]');
    assert.equal(feed.status.emoteError, null);
  });

  it('marks only garb packs owned by the current room streamer', async () => {
    mockFetch((url) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) {
        return jsonResponse({
          code: 0,
          data: [{
            pkg_type: 3,
            pkg_name: '装扮表情',
            emoticons: [
              {
                emoticon_unique: 'upower_[StreamerSummer_hello]',
                url: '//i0.hdslb.com/bfs/emote/streamer-summer.png',
                perm: 1,
              },
              {
                emoticon_unique: 'upower_[OtherSummer_hello]',
                url: '//i0.hdslb.com/bfs/emote/other-summer.png',
                perm: 1,
              },
            ],
          }],
        });
      }
      if (url.pathname.endsWith('/get_anchor_in_room')) {
        return jsonResponse({ code: 0, data: { info: { uid: 67890 } } });
      }
      if (url.pathname.endsWith('/home/search')) {
        const name = url.searchParams.get('key_word');
        return jsonResponse({
          code: 0,
          data: {
            list: [{
              name,
              properties: { fan_mid: name === 'StreamerSummer' ? '67890' : '12345' },
            }],
          },
        });
      }
      if (url.pathname.endsWith('/rights/index')) {
        return jsonResponse({ code: 0, data: { privilege_rights: {} } });
      }
      return jsonResponse({ code: -352, message: '-352' });
    });

    await connectBilibili('25760587');
    const feed = getBilibiliFeed(0, true);

    assert.equal(feed.emotes?.find((emote) => emote.packName === 'StreamerSummer')?.isRoomOwner, true);
    assert.equal(feed.emotes?.find((emote) => emote.packName === 'OtherSummer')?.isRoomOwner, undefined);
  });

  it('reports Bilibili login as verified when the supplied cookie is accepted', async () => {
    bilibiliLoginVerified = true;
    mockFetch((url) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) return jsonResponse({ code: 0, data: [] });
      return jsonResponse({ code: -352, message: '-352' });
    });

    const status = await connectBilibili(
      '25760587',
      'SESSDATA=session-value; bili_jct=csrf-value; DedeUserID=12345',
    );

    assert.equal(status.loginStatus, 'verified');
    assert.equal(status.loginError, null);
    assert.equal(capturedBilibiliLoginCookie, 'SESSDATA=session-value; bili_jct=csrf-value; DedeUserID=12345');
  });

  it('parses Bilibili inline emotes and sticker danmaku using safe CDN URLs', () => {
    const metadata: unknown[] = [];
    metadata[12] = 1;
    metadata[13] = { url: '//i0.hdslb.com/bfs/emote/sticker.png' };
    metadata[15] = { extra: { emots: {
      '[开心]': { url: 'https://i0.hdslb.com/bfs/emote/happy.png' },
      '[unsafe]': { url: 'https://attacker.example/emote.png' },
    } } };

    assert.deepEqual(parseBilibiliEmotes([metadata]), {
      emotes: [{ code: '[开心]', url: 'https://i0.hdslb.com/bfs/emote/happy.png' }],
      stickerUrl: 'https://i0.hdslb.com/bfs/emote/sticker.png',
    });
  });

  it('parses room emote packs and preserves lock state from the authenticated API', () => {
    const catalogue = parseBilibiliRoomEmotes({
      code: 0,
      data: [{
        pkg_name: 'Room emotes',
        pkg_type: 2,
        emoticons: [
          {
            emoticon_unique: '[room_wave]',
            emoji: 'Room wave',
            url: '//i0.hdslb.com/bfs/emote/wave.png',
            perm: 1,
          },
          {
            emoticon_unique: '[locked]',
            descript: 'Members only',
            url: 'https://i0.hdslb.com/bfs/emote/locked.png',
            perm: 0,
          },
          {
            emoticon_unique: '[unsafe]',
            url: 'https://attacker.example/emote.png',
            perm: 1,
          },
        ],
      }],
    });
    assert.deepEqual(catalogue, [
      {
        code: '[room_wave]',
        label: 'Room wave',
        url: 'https://i0.hdslb.com/bfs/emote/wave.png',
        platform: 'bilibili',
        isLocked: false,
        category: 'room',
        packName: 'Room emotes',
      },
      {
        code: '[locked]',
        label: 'Members only',
        url: 'https://i0.hdslb.com/bfs/emote/locked.png',
        platform: 'bilibili',
        isLocked: true,
        category: 'room',
        packName: 'Room emotes',
      },
    ]);
    assert.deepEqual(
      mergeBilibiliEmotes('hello [room_wave] [locked]', [], catalogue),
      [
        { code: '[room_wave]', url: 'https://i0.hdslb.com/bfs/emote/wave.png' },
        { code: '[locked]', url: 'https://i0.hdslb.com/bfs/emote/locked.png' },
      ],
    );
  });

  it('separates general, room-exclusive, and garb emote packs', () => {
    const catalogue = parseBilibiliRoomEmotes({
      code: 0,
      data: [
        {
          pkg_name: 'Common',
          pkg_type: 1,
          emoticons: [{
            emoticon_unique: '[common]',
            url: '//i0.hdslb.com/bfs/emote/common.png',
            perm: 1,
          }],
        },
        {
          pkg_name: '装扮表情',
          pkg_type: 3,
          emoticons: [{
            emoticon_unique: 'upower_[Summer_hello]',
            url: '//i0.hdslb.com/bfs/emote/hello.png',
            perm: 0,
            unlock_show_text: '需要购买装扮',
          }],
        },
      ],
    });

    assert.deepEqual(catalogue.map(({ category, packName, unlockHint }) => ({
      category,
      packName,
      unlockHint,
    })), [
      { category: 'general', packName: 'Common', unlockHint: undefined },
      { category: 'garb', packName: 'Summer', unlockHint: '需要购买装扮' },
    ]);
  });

  it('accepts wrapped room-emote response data', () => {
    const emotes = parseBilibiliRoomEmotes({
      code: 0,
      data: {
        list: [{
          pkg_type: 2,
          pkg_name: 'Wrapped room pack',
          emoticons: [{
            emoticon_unique: '[wrapped]',
            url: '//i0.hdslb.com/bfs/emote/wrapped.png',
            perm: 1,
          }],
        }],
      },
    });

    assert.equal(emotes.length, 1);
    assert.equal(emotes[0].code, '[wrapped]');
    assert.equal(emotes[0].category, 'room');
  });

  it('parses room emotes from Bilibili’s nested data.data response', () => {
    const emotes = parseBilibiliRoomEmotes({
      code: 0,
      data: {
        data: [{
          pkg_type: 2,
          pkg_name: 'Nested room pack',
          emoticons: [{
            emoticon_unique: '[nested]',
            url: '//i0.hdslb.com/bfs/emote/nested.png',
            perm: 1,
          }],
        }],
      },
    });

    assert.equal(emotes.length, 1);
    assert.equal(emotes[0].code, '[nested]');
    assert.equal(emotes[0].category, 'room');
  });

  it('parses charging emotes using the sender token and unlocked tier', () => {
    const emotes = parseBilibiliUpowerEmotes({
      code: 0,
      data: {
        privilege_rights: {
          1: {
            emote: {
              locked: true,
              emojis: [{ name: 'heart', icon: '//i0.hdslb.com/bfs/emote/heart.png' }],
            },
          },
          2: {
            emote: {
              locked: false,
              emojis: [{ name: 'clap', icon: '//i0.hdslb.com/bfs/emote/clap.png' }],
            },
          },
        },
      },
    }, 12345);

    assert.deepEqual(emotes, [{
      code: 'upower_[UPOWER_12345_clap]',
      label: 'clap',
      url: 'https://i0.hdslb.com/bfs/emote/clap.png',
      platform: 'bilibili',
      isLocked: false,
      category: 'charge',
      packName: '充电表情',
      unlockHint: '为主播充电后可用',
    }]);
  });

  it('loads charging emotes from the room owner rights API', async () => {
    const cookie = 'SESSDATA=session-value; bili_jct=csrf-value; DedeUserID=12345';
    let rightsCookie: string | null = null;
    mockFetch((url, init) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) return jsonResponse({ code: 0, data: [] });
      if (url.pathname.endsWith('/get_anchor_in_room')) {
        assert.equal(url.searchParams.get('roomid'), '25760587');
        return jsonResponse({ code: 0, data: { info: { uid: 67890 } } });
      }
      if (url.pathname.endsWith('/rights/index')) {
        rightsCookie = new Headers(init?.headers).get('cookie');
        assert.equal(url.searchParams.get('up_mid'), '67890');
        return jsonResponse({
          code: 0,
          data: {
            privilege_rights: {
              1: {
                emote: {
                  locked: true,
                  emojis: [{ name: 'spark', icon: '//i0.hdslb.com/bfs/emote/spark.png' }],
                },
              },
            },
          },
        });
      }
      return jsonResponse({ code: -352, message: '-352' });
    });

    await connectBilibili('25760587', cookie);
    const feed = getBilibiliFeed(0, true);

    assert.equal(rightsCookie, cookie);
    assert.deepEqual(feed.emotes?.map(({ code, category, packName }) => ({
      code,
      category,
      packName,
    })), [{
      code: 'upower_[UPOWER_67890_spark]',
      category: 'charge',
      packName: '充电表情',
    }]);
  });

  it('keeps charging emotes visible and reports when room emotes require login', async () => {
    mockFetch((url) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) {
        return jsonResponse({ code: -101, message: '账号未登录' });
      }
      if (url.pathname.endsWith('/get_anchor_in_room')) {
        return jsonResponse({ code: 0, data: { info: { uid: 67890 } } });
      }
      if (url.pathname.endsWith('/rights/index')) {
        return jsonResponse({
          code: 0,
          data: {
            privilege_rights: {
              1: {
                emote: {
                  locked: true,
                  emojis: [{ name: 'spark', icon: '//i0.hdslb.com/bfs/emote/spark.png' }],
                },
              },
            },
          },
        });
      }
      return jsonResponse({ code: -352, message: '-352' });
    });

    await connectBilibili('25760587');
    const feed = getBilibiliFeed(0, true);

    assert.match(feed.status.emoteError || '', /code -101.*账号未登录/);
    assert.deepEqual(feed.emotes?.map(({ category }) => category), ['charge']);
  });

  it('sends text and selected room emotes with the saved cookie and CSRF token', async () => {
    bilibiliLoginVerified = true;
    const cookie = 'SESSDATA=session-value; bili_jct=csrf-value; DedeUserID=12345';
    const sends: URLSearchParams[] = [];
    mockFetch((url, init) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) {
        return jsonResponse({
          code: 0,
          data: [{
            pkg_type: 2,
            pkg_name: 'Room pack',
            emoticons: [{
              emoticon_unique: '[room_wave]',
              emoji: 'Room wave',
              url: '//i0.hdslb.com/bfs/emote/wave.png',
              perm: 1,
            }],
          }],
        });
      }
      if (url.pathname.endsWith('/get_anchor_in_room')) {
        return jsonResponse({ code: 0, data: { info: { uid: 67890 } } });
      }
      if (url.pathname.endsWith('/rights/index')) return jsonResponse({ code: 0, data: { privilege_rights: {} } });
      if (url.pathname.endsWith('/msg/send')) {
        assert.equal(new Headers(init?.headers).get('cookie'), cookie);
        sends.push(new URLSearchParams(String(init?.body)));
        return jsonResponse({ code: 0, message: '发送成功' });
      }
      return jsonResponse({ code: -352, message: '-352' });
    });

    await connectBilibili('25760587', cookie);
    await sendBilibiliMessage('Hello chat');
    await sendBilibiliMessage('[room_wave]');

    assert.equal(sends.length, 2);
    assert.equal(sends[0].get('msg'), 'Hello chat');
    assert.equal(sends[0].get('roomid'), '25760587');
    assert.equal(sends[0].get('csrf'), 'csrf-value');
    assert.equal(sends[0].get('csrf_token'), 'csrf-value');
    assert.equal(sends[0].get('dm_type'), null);
    assert.equal(sends[1].get('msg'), '[room_wave]');
    assert.equal(sends[1].get('dm_type'), '1');
    assert.equal(sends[1].get('emoticonOptions'), '[object Object]');
  });

  it('rejects Bilibili sends without an authenticated CSRF cookie', async () => {
    mockFetch((url) => {
      if (url.pathname.endsWith('/room_init')) {
        return jsonResponse({ code: 0, data: { room_id: 25760587 } });
      }
      if (url.pathname.endsWith('/GetEmoticons')) return jsonResponse({ code: 0, data: [] });
      if (url.pathname.endsWith('/get_anchor_in_room')) {
        return jsonResponse({ code: 0, data: { info: { uid: 67890 } } });
      }
      if (url.pathname.endsWith('/rights/index')) return jsonResponse({ code: 0, data: { privilege_rights: {} } });
      return jsonResponse({ code: -352, message: '-352' });
    });
    await connectBilibili('25760587');

    await assert.rejects(sendBilibiliMessage('Hello'), /需要有效 Cookie/);
  });

  it('parses Bilibili gift events into currency-valued gifts', () => {
    const gift = parseBilibiliGift({
      cmd: 'SEND_GIFT',
      data: { uid: 42, uname: 'Supporter', giftName: '花火', num: 2, price: 1000, total_coin: 2000 },
    });
    assert.equal(gift?.user, 'Supporter');
    assert.equal(gift?.userId, '42');
    assert.equal(gift?.amount, 2);
    assert.equal(gift?.currency, 'CNY');
    assert.equal(gift?.giftName, '花火 ×2');
  });

  it('decodes SEND_GIFT_V2 protobuf events and normalizes them as visible gifts', () => {
    const giftPayload = Buffer.concat([
      encodeProtobufVarint(1, 31039),
      encodeProtobufText(2, '牛哇牛哇'),
      encodeProtobufVarint(3, 20),
      encodeProtobufVarint(5, 100),
      encodeProtobufVarint(7, 2000),
      encodeProtobufText(8, 'gold'),
      encodeProtobufText(9, 'gift-tid-1'),
    ]);
    const payload = Buffer.concat([
      encodeProtobufVarint(1, 42),
      encodeProtobufText(2, 'Supporter'),
      encodeProtobufBytes(10, giftPayload),
    ]).toString('base64');

    const [decoded] = parseBilibiliGiftV2(payload);
    const gift = parseBilibiliGift({ cmd: 'SEND_GIFT', data: decoded });

    assert.equal(gift?.user, 'Supporter');
    assert.equal(gift?.userId, '42');
    assert.equal(gift?.amount, 2);
    assert.equal(gift?.currency, 'CNY');
    assert.equal(gift?.giftName, '牛哇牛哇 ×20');
    assert.equal(gift?.id, 'bilibili-gift-gift-tid-1');
  });

  it('normalizes combo gifts and Bilibili guard purchases', () => {
    const combo = parseBilibiliGift({
      cmd: 'COMBO_SEND',
      data: {
        uid: 42,
        uname: 'Supporter',
        gift_name: '小心心',
        combo_num: 8,
        combo_total_coin: 4000,
        batch_combo_id: 'combo-1',
      },
    });
    const guard = parseBilibiliGift({
      cmd: 'GUARD_BUY',
      data: { uid: 43, username: 'Captain', guard_level: 3, num: 1, price: 198000, role_name: '舰长' },
    });

    assert.equal(combo?.amount, 4);
    assert.equal(combo?.giftName, '小心心 ×8');
    assert.equal(combo?.id, 'bilibili-gift-combo-1');
    assert.equal(guard?.user, 'Captain');
    assert.equal(guard?.amount, 198);
    assert.equal(guard?.currency, 'CNY');
    assert.equal(guard?.giftName, '舰长 ×1');
  });

  it('uses paid guard toast data and registers red packet purchases', () => {
    const toast = parseBilibiliGift({
      cmd: 'USER_TOAST_MSG',
      data: { uid: 43, username: 'Captain', guard_level: 3, num: 1, price: 150000, role_name: '舰长' },
    });
    const redPocket = parseBilibiliGift({
      cmd: 'POPULARITY_RED_POCKET_NEW',
      data: { sender_uid: 44, sender_name: 'RedEnvelope', lot_id: 77, num: 2, price: 10 },
    });

    assert.equal(toast?.amount, 150);
    assert.equal(toast?.currency, 'CNY');
    assert.equal(toast?.user, 'Captain');
    assert.equal(redPocket?.amount, 2);
    assert.equal(redPocket?.currency, 'CNY');
    assert.equal(redPocket?.giftName, '红包 ×2');
    assert.equal(redPocket?.userId, '44');
  });

  it('ignores malformed Bilibili gift protobuf payloads', () => {
    assert.deepEqual(parseBilibiliGiftV2('not base64!'), []);
  });
});
