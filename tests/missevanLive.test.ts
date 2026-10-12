import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  connectMissevan,
  disconnectMissevan,
  getMissevanFeed,
  getMissevanStatus,
  parseMissevanGift,
  parseMissevanMessage,
} from '../src/services/missevanLive';

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

const mockFetch = (handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(new URL(String(input)), init)) as typeof fetch;
};

describe('MissEvan live service', () => {
  beforeEach(() => {
    disconnectMissevan();
    console.error = () => {};
  });

  afterEach(() => {
    disconnectMissevan();
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  it('parses a room URL and reports session initialization failures', async () => {
    let requestedUrl: URL | undefined;
    mockFetch((url) => {
      requestedUrl = url;
      return new Response('unavailable', { status: 503 });
    });

    await connectMissevan('https://fm.missevan.com/live/138394231');
    await new Promise((resolve) => setTimeout(resolve, 10));
    const status = getMissevanStatus();

    assert.equal(status.roomId, 138394231);
    assert.equal(requestedUrl?.href, 'https://fm.missevan.com/api/user/info');
    assert.equal(status.state, 'error');
    assert.equal(status.error, '猫耳FM会话初始化失败（HTTP 503）');
  });

  it('accepts a bare room ID', async () => {
    mockFetch(() => new Response('unavailable', { status: 503 }));

    await connectMissevan('869215180');
    await new Promise((resolve) => setTimeout(resolve, 10));
    const status = getMissevanStatus();

    assert.equal(status.roomId, 869215180);
    assert.equal(status.state, 'error');
    assert.match(status.error || '', /会话初始化失败/);
  });

  it('rejects malformed or foreign room identifiers without making requests', async () => {
    let requestCount = 0;
    mockFetch(() => {
      requestCount += 1;
      return new Response('{}');
    });

    const badUrl = await connectMissevan('https://example.com/live/123');
    assert.equal(badUrl.state, 'error');
    assert.match(badUrl.error || '', /有效的猫耳FM房间号/);

    const badId = await connectMissevan('0');
    assert.equal(badId.state, 'error');
    assert.match(badId.error || '', /有效的猫耳FM房间号/);
    assert.equal(requestCount, 0);
  });

  it('clears room state and messages when disconnected', async () => {
    mockFetch(() => new Response('unavailable', { status: 503 }));
    await connectMissevan('138394231');

    const status = disconnectMissevan();
    const feed = getMissevanFeed();

    assert.equal(status.state, 'disconnected');
    assert.equal(status.roomId, null);
    assert.equal(status.requestedRoom, '');
    assert.deepEqual(feed.messages, []);
  });

  it('keeps safe custom emote image metadata on MissEvan messages', () => {
    const message = parseMissevanMessage({
      type: 'message',
      event: 'new',
      msg_id: 'emote-1',
      user: { username: 'Viewer' },
      message: '[happy]',
      emoticons: { '[happy]': { url: 'https://static.missevan.com/emotes/happy.png' } },
    });
    assert.equal(message?.text, '[happy]');
    assert.deepEqual(message?.emotes, [{
      code: '[happy]',
      url: 'https://static.missevan.com/emotes/happy.png',
    }]);
  });

  it('registers MissEvan gifts using oid and counts each gift in diamonds', () => {
    const firstGift = parseMissevanGift({
      type: 'gift',
      event: 'send',
      oid: '000000',
      msg_id: '0',
      user: { user_id: 42, username: 'Supporter' },
      gift: { name: '星星', num: 3, price: 10 },
    });
    const secondGift = parseMissevanGift({
      type: 'gift',
      event: 'send',
      oid: '000000',
      msg_id: '0',
      user: { user_id: 42, username: 'Supporter' },
      gift: { name: '星星', num: 1, price: 10 },
    });

    assert.ok(firstGift);
    assert.ok(secondGift);
    assert.equal(firstGift.platform, 'missevan');
    assert.equal(firstGift.user, 'Supporter');
    assert.equal(firstGift.userId, '42');
    assert.equal(firstGift.giftName, '星星 ×3');
    assert.equal(firstGift.amount, 30);
    assert.equal(firstGift.currency, '💎');
    assert.notEqual(firstGift.id, secondGift.id);
    assert.equal(getMissevanFeed().gifts.length, 2);
  });

  it('registers paid questions as MissEvan gifts even when the top-level user is absent', () => {
    const gift = parseMissevanGift({
      type: 'question',
      event: 'ask',
      content: {
        question_id: 'question-1',
        user: { username: 'Questioner' },
        price: 25,
        question: '请问今天播什么？',
      },
    });

    assert.equal(gift?.user, 'Questioner');
    assert.equal(gift?.giftName, '付费提问');
    assert.equal(gift?.message, '请问今天播什么？');
    assert.equal(gift?.amount, 25);
    assert.equal(getMissevanFeed().gifts.length, 1);
  });
});
