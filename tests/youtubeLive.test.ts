import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  connectYoutube,
  disconnectYoutube,
  getYoutubeFeed,
} from '../src/services/youtubeLive';

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.YOUTUBE_API_KEY;

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const mockFetch = (handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(new URL(String(input)), init)) as typeof fetch;
};

const chatPage = (
  videoId: string,
  continuation = 'initial-token',
  extraContents: Record<string, unknown> = {},
) => {
  const initialData = {
    contents: {
      ...extraContents,
      liveChatRenderer: {
        header: { liveChatHeaderRenderer: { viewSelector: { sortFilterSubMenuRenderer: { subMenuItems: [] } } } },
        continuations: [{ timedContinuationData: { continuation, timeoutMs: 1_000 } }],
      },
    },
  };
  return `var ytInitialData = ${JSON.stringify(initialData)};`
    + `"INNERTUBE_CONTEXT_CLIENT_VERSION":"test-client";`
    + `"videoId":"${videoId}"`;
};

const webChatResponse = (text: string, id = 'message-1', runs?: unknown[]) => jsonResponse({
  continuationContents: {
    liveChatContinuation: {
      actions: [{
        addChatItemAction: {
          item: {
            liveChatTextMessageRenderer: {
              id,
              authorName: { simpleText: 'Test Viewer' },
              message: { runs: runs || [{ text }] },
              timestampUsec: '1700000000000000',
            },
          },
        },
      }],
      continuations: [{ timedContinuationData: { continuation: 'next-token', timeoutMs: 1_000 } }],
    },
  },
});

const webChatActionsResponse = (actions: unknown[]) => jsonResponse({
  continuationContents: {
    liveChatContinuation: {
      actions,
      continuations: [{ timedContinuationData: { continuation: 'next-token', timeoutMs: 1_000 } }],
    },
  },
});

describe('YouTube live service', () => {
  beforeEach(() => {
    disconnectYoutube();
    delete process.env.YOUTUBE_API_KEY;
  });

  afterEach(() => {
    disconnectYoutube();
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = originalApiKey;
  });

  it('reads live chat for a direct video URL without an API key', async () => {
    const requests: { url: URL; init?: RequestInit }[] = [];
    mockFetch((url, init) => {
      requests.push({ url, init });
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/get_live_chat')) return webChatResponse('Hello from web chat');
      throw new Error(`Unexpected request: ${url.href}`);
    });

    const status = await connectYoutube('https://www.youtube.com/watch?v=XCXfgqTmkEU');
    const feed = getYoutubeFeed();

    assert.equal(status.state, 'connected');
    assert.equal(status.videoId, 'XCXfgqTmkEU');
    assert.equal(feed.messages.length, 1);
    assert.deepEqual(feed.messages[0].message, {
      id: 'youtube-message-1',
      platform: 'youtube',
      user: 'Test Viewer',
      text: 'Hello from web chat',
      timestamp: new Date(1_700_000_000_000).toTimeString().slice(0, 8),
      badges: [],
    });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url.searchParams.get('v'), 'XCXfgqTmkEU');
    assert.equal(new Headers(requests[0].init?.headers).get('cookie'), 'SOCS=CAI');
    assert.equal(requests[1].url.pathname, '/youtubei/v1/live_chat/get_live_chat');
    assert.equal(JSON.parse(String(requests[1].init?.body)).continuation, 'initial-token');
  });

  it('resolves a channel handle to its current live video without an API key', async () => {
    const requestedUrls: string[] = [];
    mockFetch((url) => {
      requestedUrls.push(url.href);
      if (url.pathname === '/@example/live') {
        return new Response(
          `<link rel="canonical" href="https://www.youtube.com/watch?v=XCXfgqTmkEU">`
          + `var ytInitialPlayerResponse = ${JSON.stringify({ videoDetails: { isLive: true }})};`,
        );
      }
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/get_live_chat')) return webChatResponse('Channel live message');
      throw new Error(`Unexpected request: ${url.href}`);
    });

    const status = await connectYoutube('https://www.youtube.com/@example');

    assert.equal(status.state, 'connected');
    assert.equal(status.videoId, 'XCXfgqTmkEU');
    assert.match(requestedUrls[0], /\/@example\/live$/);
    assert.equal(getYoutubeFeed().messages[0].message.text, 'Channel live message');
  });

  it('preserves YouTube custom emoji shortcut and image URL from rich message runs', async () => {
    mockFetch((url) => {
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/get_live_chat')) {
        return webChatResponse('ignored', 'custom-message', [
          { text: 'Hello ' },
          {
            emoji: {
              emojiId: 'UCchannel/custom-emote',
              shortcuts: [':custom_wave:'],
              isCustomEmoji: true,
              image: { thumbnails: [{ url: 'https://yt3.ggpht.com/custom-wave.png' }] },
            },
          },
        ]);
      }
      throw new Error(`Unexpected request: ${url.href}`);
    });

    await connectYoutube('XCXfgqTmkEU');
    const message = getYoutubeFeed().messages[0].message;

    assert.equal(message.text, 'Hello :custom_wave:');
    assert.deepEqual(message.emotes, [{
      code: ':custom_wave:',
      url: 'https://yt3.ggpht.com/custom-wave.png',
    }]);
  });

  it('uses saved YouTube cookies to load logged-in channel stamps', async () => {
    const cookie = 'LOGIN_INFO=login-session; SAPISID=auth-cookie';
    const requests: { url: URL; init?: RequestInit }[] = [];
    const pickerEmoji = {
      emojiId: 'UCchannel/channel-wave',
      shortcuts: [':channel_wave:'],
      isCustomEmoji: true,
      isLocked: true,
      image: {
        thumbnails: [{ url: 'https://yt3.ggpht.com/channel-wave.png' }],
        accessibility: { accessibilityData: { label: 'Channel wave' } },
      },
    };
    mockFetch((url, init) => {
      requests.push({ url, init });
      if (url.pathname === '/live_chat') {
        return new Response(
          chatPage('XCXfgqTmkEU', 'initial-token', { emojiPickerRenderer: { emoji: pickerEmoji } })
          + '"LOGGED_IN":true',
        );
      }
      if (url.pathname.endsWith('/get_live_chat')) {
        return webChatResponse(':channel_wave:', 'member-stamp-message');
      }
      throw new Error(`Unexpected request: ${url.href}`);
    });

    const status = await connectYoutube('XCXfgqTmkEU', cookie);
    const feed = getYoutubeFeed(0, true);
    const pageRequest = requests.find(({ url }) => url.pathname === '/live_chat');
    const pollRequest = requests.find(({ url }) => url.pathname.endsWith('/get_live_chat'));

    assert.equal(status.loginStatus, 'verified');
    assert.equal(status.loginError, null);
    assert.equal(new Headers(pageRequest?.init?.headers).get('cookie'), `SOCS=CAI; ${cookie}`);
    assert.equal(new Headers(pollRequest?.init?.headers).get('cookie'), `SOCS=CAI; ${cookie}`);
    assert.deepEqual(feed.emotes, [{
      code: ':channel_wave:',
      label: 'Channel wave',
      url: 'https://yt3.ggpht.com/channel-wave.png',
      platform: 'youtube',
      isLocked: true,
      category: 'member',
      packName: '会员表情',
    }]);
    assert.deepEqual(feed.messages[0].message.emotes, [{
      code: ':channel_wave:',
      url: 'https://yt3.ggpht.com/channel-wave.png',
    }]);
  });

  it('keeps channel membership emotes that do not expose a text shortcut', async () => {
    const memberStamp = {
      emojiId: 'UCchannel/member-stamp-42',
      isCustomEmoji: true,
      isLocked: true,
      image: {
        thumbnails: [{ url: 'https://yt3.ggpht.com/member-stamp.png' }],
        accessibility: { accessibilityData: { label: 'Member stamp' } },
      },
    };
    mockFetch((url) => {
      if (url.pathname === '/live_chat') {
        return new Response(chatPage('XCXfgqTmkEU', 'initial-token', {
          emojiPickerRenderer: { emoji: memberStamp },
        }) + '"LOGGED_IN":true');
      }
      if (url.pathname.endsWith('/get_live_chat')) return webChatResponse('member chat');
      throw new Error(`Unexpected request: ${url.href}`);
    });

    await connectYoutube('XCXfgqTmkEU', 'LOGIN_INFO=login-session; SAPISID=auth-cookie');
    const feed = getYoutubeFeed(0, true);

    assert.deepEqual(feed.emotes, [{
      code: 'UCchannel/member-stamp-42',
      label: 'Member stamp',
      url: 'https://yt3.ggpht.com/member-stamp.png',
      platform: 'youtube',
      isLocked: true,
      category: 'member',
      packName: '会员表情',
    }]);
  });

  it('reports a rejected YouTube cookie without exposing it in status', async () => {
    mockFetch((url) => {
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/get_live_chat')) return webChatResponse('Public chat still works');
      throw new Error(`Unexpected request: ${url.href}`);
    });

    const status = await connectYoutube('XCXfgqTmkEU', 'LOGIN_INFO=private-cookie');

    assert.equal(status.state, 'connected');
    assert.equal(status.loginStatus, 'invalid');
    assert.match(status.loginError || '', /rejected/i);
    assert.equal(JSON.stringify(status).includes('private-cookie'), false);
  });

  it('captures ticker Super Stickers and membership events from public web chat', async () => {
    const actions = [
      {
        addLiveChatTickerItemAction: {
          item: {
            liveChatTickerPaidStickerItemRenderer: {
              id: 'ticker-sticker-1',
              authorExternalChannelId: 'UCsupporter',
              showItemEndpoint: {
                showLiveChatItemEndpoint: {
                  renderer: {
                    liveChatPaidStickerRenderer: {
                      authorName: { simpleText: 'Sticker Supporter' },
                      purchaseAmountText: { simpleText: '$5.00' },
                      sticker: { thumbnails: [{ url: 'https://yt3.ggpht.com/sticker.png' }] },
                      timestampUsec: '1700000000000000',
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        addChatItemAction: {
          item: {
            liveChatSponsorshipsGiftPurchaseAnnouncementRenderer: {
              id: 'membership-gift-1',
              authorName: { simpleText: 'Membership Gifter' },
              authorExternalChannelId: 'UCgifter',
              header: {
                liveChatSponsorshipsHeaderRenderer: {
                  authorName: { simpleText: 'Membership Gifter' },
                  authorExternalChannelId: 'UCgifter',
                  primaryText: { simpleText: 'Gifted 5 memberships' },
                },
              },
              timestampUsec: '1700000000000000',
            },
          },
        },
      },
      {
        addChatItemAction: {
          item: {
            liveChatSponsorshipsGiftRedemptionAnnouncementRenderer: {
              id: 'membership-recipient-1',
              authorName: { simpleText: 'Membership Recipient' },
              message: { simpleText: 'received a gift membership' },
              timestampUsec: '1700000000000000',
            },
          },
        },
      },
    ];
    mockFetch((url) => {
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/get_live_chat')) return webChatActionsResponse(actions);
      throw new Error(`Unexpected request: ${url.href}`);
    });

    await connectYoutube('XCXfgqTmkEU');
    const feed = getYoutubeFeed();

    assert.equal(feed.gifts.length, 2);
    assert.equal(feed.gifts[0].gift.giftName, 'Super Sticker');
    assert.equal(feed.gifts[0].gift.amount, 5);
    assert.equal(feed.gifts[0].gift.giftIcon, 'https://yt3.ggpht.com/sticker.png');
    assert.equal(feed.gifts[1].gift.user, 'Membership Gifter');
    assert.equal(feed.gifts[1].gift.giftName, '赠送会员 ×5');
    assert.equal(feed.messages[0].message.user, 'Membership Recipient');
    assert.match(feed.messages[0].message.text, /Gift membership/);
  });

  it('captures YouTube Data API Super Chats, Super Stickers, and membership gifting', async () => {
    process.env.YOUTUBE_API_KEY = 'test-api-key';
    mockFetch((url) => {
      if (url.pathname.endsWith('/videos')) {
        return jsonResponse({ items: [{ liveStreamingDetails: { activeLiveChatId: 'chat-id' } }] });
      }
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/liveChat/messages')) {
        return jsonResponse({
          items: [
            {
              id: 'api-superchat',
              snippet: {
                type: 'superChatEvent',
                publishedAt: '2026-10-12T12:00:00Z',
                superChatDetails: { amountDisplayString: '$10.00', userComment: 'Thank you!' },
              },
              authorDetails: { displayName: 'SC Supporter', channelId: 'UCsc' },
            },
            {
              id: 'api-sticker',
              snippet: {
                type: 'superStickerEvent',
                publishedAt: '2026-10-12T12:01:00Z',
                superStickerDetails: { amountDisplayString: '¥50', tier: 2 },
              },
              authorDetails: { displayName: 'Sticker Supporter', channelId: 'UCsticker' },
            },
            {
              id: 'api-membership-gift',
              snippet: {
                type: 'membershipGiftingEvent',
                displayMessage: 'Gifted 3 memberships',
                publishedAt: '2026-10-12T12:02:00Z',
                membershipGiftingDetails: { giftMembershipsCount: 3 },
              },
              authorDetails: { displayName: 'Membership Gifter', channelId: 'UCgifter' },
            },
            {
              id: 'api-membership-recipient',
              snippet: {
                type: 'giftMembershipReceivedEvent',
                displayMessage: 'received a gift membership',
                publishedAt: '2026-10-12T12:03:00Z',
              },
              authorDetails: { displayName: 'Membership Recipient', channelId: 'UCreceiver' },
            },
          ],
          nextPageToken: 'page-2',
          pollingIntervalMillis: 1_000,
        });
      }
      throw new Error(`Unexpected request: ${url.href}`);
    });

    await connectYoutube('XCXfgqTmkEU');
    const feed = getYoutubeFeed();

    assert.equal(feed.gifts.length, 3);
    assert.deepEqual(feed.gifts.map(({ gift }) => gift.giftName), [
      'Super Chat',
      'Super Sticker',
      '赠送会员 ×3',
    ]);
    assert.equal(feed.gifts[0].gift.amount, 10);
    assert.equal(feed.gifts[1].gift.amount, 50);
    assert.equal(feed.messages[0].message.user, 'Membership Recipient');
    assert.match(feed.messages[0].message.text, /Gift membership/);
  });

  it('uses the Data API when configured and maps chat messages and badges', async () => {
    process.env.YOUTUBE_API_KEY = 'test-api-key';
    const requests: URL[] = [];
    mockFetch((url) => {
      requests.push(url);
      if (url.pathname.endsWith('/videos')) {
        return jsonResponse({ items: [{ liveStreamingDetails: { activeLiveChatId: 'chat-id' } }] });
      }
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/liveChat/messages')) {
        return jsonResponse({
          items: [{
            id: 'api-message-id',
            snippet: {
              type: 'textMessageEvent',
              publishedAt: '2026-10-12T12:00:00Z',
              textMessageDetails: { messageText: 'API chat message' },
            },
            authorDetails: {
              displayName: 'API Viewer',
              isChatModerator: true,
              isChatOwner: true,
              isChatSponsor: true,
            },
          }],
          nextPageToken: 'page-2',
          pollingIntervalMillis: 1_000,
        });
      }
      throw new Error(`Unexpected request: ${url.href}`);
    });

    const status = await connectYoutube('XCXfgqTmkEU');
    const feed = getYoutubeFeed();

    assert.equal(status.state, 'connected');
    assert.equal(status.videoId, 'XCXfgqTmkEU');
    assert.equal(requests.length, 3);
    assert.equal(requests[0].searchParams.get('key'), 'test-api-key');
    assert.equal(feed.messages.length, 1);
    assert.equal(feed.messages[0].message.text, 'API chat message');
    assert.deepEqual(feed.messages[0].message.badges.map((badge) => badge.type), ['admin', 'mod', 'member']);
  });

  it('falls back to web chat when the Data API fails', async () => {
    process.env.YOUTUBE_API_KEY = 'test-api-key';
    const requests: URL[] = [];
    mockFetch((url) => {
      requests.push(url);
      if (url.pathname.endsWith('/videos')) {
        return jsonResponse({ error: { message: 'quota exceeded' } }, 403);
      }
      if (url.pathname === '/live_chat') return new Response(chatPage('XCXfgqTmkEU'));
      if (url.pathname.endsWith('/get_live_chat')) return webChatResponse('Fallback message');
      throw new Error(`Unexpected request: ${url.href}`);
    });

    const status = await connectYoutube('XCXfgqTmkEU');

    assert.equal(status.state, 'connected');
    assert.equal(getYoutubeFeed().messages[0].message.text, 'Fallback message');
    assert.equal(requests.some((url) => url.pathname.endsWith('/get_live_chat')), true);
  });

  it('reports when the public video has no available chat', async () => {
    mockFetch((url) => {
      if (url.pathname === '/live_chat') return new Response('no chat available');
      throw new Error(`Unexpected request: ${url.href}`);
    });

    const status = await connectYoutube('XCXfgqTmkEU');

    assert.equal(status.state, 'error');
    assert.equal(status.videoId, 'XCXfgqTmkEU');
    assert.match(status.error || '', /没有可用的公开实时聊天室/);
  });
});
