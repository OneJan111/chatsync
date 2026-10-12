const ALLOWED_IMAGE_HOSTS = [
  'hdslb.com',
  'ggpht.com',
  'googleusercontent.com',
  'youtube.com',
  'missevan.com',
];

export const safeChatImageUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.startsWith('//')
    ? `https:${value}`
    : value.startsWith('http://') ? `https://${value.slice('http://'.length)}` : value;
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.some((domain) =>
      host === domain || host.endsWith(`.${domain}`))) return null;
    return url.href;
  } catch {
    return null;
  }
};

export const parseEmoteEntries = (value: unknown): { code: string; url: string }[] => {
  const entries: { code: string; url: string }[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== 'object' || item === null) continue;
      const record = item as Record<string, unknown>;
      const code = typeof record.code === 'string' ? record.code
        : typeof record.name === 'string' ? record.name : '';
      const url = safeChatImageUrl(record.url || record.image || record.src);
      if (code && url) entries.push({ code, url });
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const [code, item] of Object.entries(value)) {
      const record = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
      const url = safeChatImageUrl(record.url || record.image || record.src || item);
      if (code && url) entries.push({ code, url });
    }
  }
  return entries;
};

export const splitChatEmotes = (
  text: string,
  emotes: { code: string; url: string }[] = [],
): string[] => {
  const codes = [...new Set([
    ...emotes.map((emote) => emote.code).filter(Boolean),
    ...[...text.matchAll(/\[[^\]]+\]|:[a-zA-Z0-9_-]+:/g)].map(([code]) => code),
  ])].sort((left, right) => right.length - left.length);
  if (codes.length === 0) return [text];
  return text.split(new RegExp(`(${codes.map((code) => code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g'));
};
