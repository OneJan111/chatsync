import type { SuperChatGift } from '../types';

const NUMBER_PATTERN = /\d(?:[\d.,\s\u00a0\u202f]*\d)?/;

export const parseGiftAmount = (display: string): { currency: string; amount: number } | null => {
  const text = display.trim();
  const match = NUMBER_PATTERN.exec(text);
  if (!match) return null;

  let raw = match[0].replace(/[\s\u00a0\u202f]/g, '');
  const separators = [...raw].flatMap((character, index) => character === '.' || character === ',' ? [index] : []);
  if (separators.length > 0) {
    const last = separators[separators.length - 1];
    const decimalDigits = raw.length - last - 1;
    const separatorKinds = new Set(separators.map((index) => raw[index]));
    if (separatorKinds.size > 1 || (decimalDigits !== 3 && raw.split(raw[last]).length === 2)) {
      raw = `${raw.slice(0, last).replace(/[.,]/g, '')}.${raw.slice(last + 1)}`;
    } else {
      raw = raw.replace(/[.,]/g, '');
    }
  }

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  const currency = `${text.slice(0, match.index)}${text.slice(match.index + match[0].length)}`.trim();
  return { currency, amount };
};

export const setGiftValue = <T extends SuperChatGift>(
  gift: T,
  currency: string,
  value: unknown,
): T => {
  const amount = typeof value === 'number' ? value : Number(value || 0);
  if (Number.isFinite(amount) && amount > 0 && currency) {
    return { ...gift, currency, amount };
  }
  return { ...gift, currency: '', amount: 0 };
};

export const formatGiftAmount = (currency: string, amount: number): string =>
  `${currency}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export interface GiftLeaderboardEntry {
  author: string;
  platform: SuperChatGift['platform'];
  count: number;
  totals: Record<string, number>;
  total: string;
}

export const giftLeaderboard = (
  gifts: SuperChatGift[],
  platform = '',
  top = 20,
): GiftLeaderboardEntry[] => {
  const users = new Map<string, GiftLeaderboardEntry>();
  const currencyCounts = new Map<string, number>();
  for (const gift of gifts) {
    if (platform && gift.platform !== platform) continue;
    const identity = gift.userId || gift.user;
    if (!identity) continue;
    const key = `${gift.platform}\u0000${identity}`;
    const row = users.get(key) ?? {
      author: gift.user,
      platform: gift.platform,
      count: 0,
      totals: {},
      total: '',
    };
    row.author = gift.user || row.author;
    row.count += 1;
    if (gift.currency && gift.amount > 0) {
      row.totals[gift.currency] = (row.totals[gift.currency] || 0) + gift.amount;
      currencyCounts.set(gift.currency, (currencyCounts.get(gift.currency) || 0) + 1);
    }
    users.set(key, row);
  }

  const mainCurrency = [...currencyCounts].sort((left, right) => right[1] - left[1])[0]?.[0] || '';
  return [...users.values()]
    .sort((left, right) =>
      (right.totals[mainCurrency] || 0) - (left.totals[mainCurrency] || 0)
      || right.count - left.count)
    .slice(0, Math.max(0, top))
    .map((row) => ({
      ...row,
      total: Object.entries(row.totals)
        .sort((left, right) => Number(right[0] === mainCurrency) - Number(left[0] === mainCurrency)
          || right[1] - left[1])
        .map(([currency, amount]) => formatGiftAmount(currency, amount))
        .join(' + '),
    }));
};
