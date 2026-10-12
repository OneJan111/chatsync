const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u27BF\u2B00-\u2BFF\u2300-\u23FF\uFE0E\uFE0F\u200D\u20E3]/gu;
const CUSTOM_EMOTE_PATTERN = /:[A-Za-z_][A-Za-z0-9_-]*:|\[[^\[\]\s]{1,20}\]/g;
const KAOMOJI_MARKERS = /[°＾^ＴT;；ಠಥ╯╰益ω▽□口Ддᗜᐛ¬ノつ┻┳︵]/u;
const BRACKETED_KAOMOJI_PATTERN = /(?:\([^()\r\n]{0,18}\)|（[^（）\r\n]{0,18}）)/gu;
const TEXT_EMOTICON_PATTERN = /(?:\^[_-]?\^|T[_﹏-]T|Q[_﹏-]Q|;_;|>_<|xD|XD|:-?[)DP(])/g;
const TABLE_FLIP_PATTERN = /[╯╰][^。！？\r\n]*[┻┳][^。！？\r\n]*/gu;

export const hasReadableChatText = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

export const cleanChatText = (text: string): string => {
  const cleaned = text
    .replace(EMOJI_PATTERN, '')
    .replace(CUSTOM_EMOTE_PATTERN, '')
    .replace(BRACKETED_KAOMOJI_PATTERN, (candidate) => KAOMOJI_MARKERS.test(candidate) ? '' : candidate)
    .replace(TEXT_EMOTICON_PATTERN, '')
    .replace(TABLE_FLIP_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return hasReadableChatText(cleaned) ? cleaned : '';
};
