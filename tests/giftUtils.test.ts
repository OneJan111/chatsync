import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SuperChatGift } from '../src/types';
import { giftLeaderboard, parseGiftAmount, setGiftValue } from '../src/services/giftUtils';

const gift = (id: string, user: string, currency: string, amount: number): SuperChatGift => ({
  id,
  platform: 'youtube',
  user,
  amount,
  currency,
  timestamp: '12:00:00',
  isThanked: false,
  tierColor: '#ef4444',
});

describe('gift helpers', () => {
  it('parses common international amount formats', () => {
    assert.deepEqual(parseGiftAmount('$5.00'), { currency: '$', amount: 5 });
    assert.deepEqual(parseGiftAmount('CA$1,000.00'), { currency: 'CA$', amount: 1_000 });
    assert.deepEqual(parseGiftAmount('5,00 €'), { currency: '€', amount: 5 });
    assert.deepEqual(parseGiftAmount('¥500'), { currency: '¥', amount: 500 });
    assert.equal(parseGiftAmount('no amount'), null);
  });

  it('sets only positive, valid gift amounts', () => {
    assert.equal(setGiftValue(gift('1', 'A', '', 0), '💎', '12').amount, 12);
    assert.equal(setGiftValue(gift('2', 'A', 'USD', 4), 'USD', 'invalid').currency, '');
  });

  it('ranks supporters without combining unlike currencies', () => {
    const ranked = giftLeaderboard([
      gift('1', 'Alice', 'USD', 5),
      gift('2', 'Alice', 'USD', 10),
      gift('3', 'Bob', 'CNY', 200),
      gift('4', 'Alice', 'CNY', 7),
    ]);
    assert.deepEqual(ranked.map(({ author, count }) => [author, count]), [['Alice', 3], ['Bob', 1]]);
    assert.equal(ranked[0].total, 'USD15 + CNY7');
  });
});
