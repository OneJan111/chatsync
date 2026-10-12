export interface SlangEntry {
  keyword: string;
  romajiOrPinyin: string;
  furiganaOrPinyinRuby?: { char: string; ruby: string }[];
  translation: string;
  explanation: string;
  platform: 'all' | 'bilibili' | 'youtube' | 'twitch';
}

export const SLANG_DICTIONARY: SlangEntry[] = [
  {
    keyword: '草',
    romajiOrPinyin: 'cǎo / kusa',
    furiganaOrPinyinRuby: [{ char: '草', ruby: 'cǎo/kusa' }],
    translation: 'LOL / LMAO / www',
    explanation: 'Originated from Japanese "w" (warau = laugh) resembling grass, widely used across both Bilibili danmaku and Japanese VTuber chats to signify burst of laughter.',
    platform: 'all',
  },
  {
    keyword: '2333',
    romajiOrPinyin: 'èr sān sān sān',
    translation: 'Hahaha! (hysterical laugh)',
    explanation: 'From Mop forum emoji #233 which was a character rolling on the ground laughing hysterically.',
    platform: 'bilibili',
  },
  {
    keyword: 'てぇてぇ',
    romajiOrPinyin: 'teetee',
    furiganaOrPinyinRuby: [{ char: 'てぇてぇ', ruby: 'teetee' }],
    translation: 'So precious / wholesome chemistry',
    explanation: 'Slang corruption of 尊い (tōtoi = precious/sacred). Used when two streamers or characters have a heartwarming, cute, or close relationship.',
    platform: 'youtube',
  },
  {
    keyword: '舰长',
    romajiOrPinyin: 'jiàn zhǎng',
    furiganaOrPinyinRuby: [{ char: '舰', ruby: 'jiàn' }, { char: '长', ruby: 'zhǎng' }],
    translation: 'Fleet Guard (Tier 1 Sub)',
    explanation: 'Bilibili monthly subscriber tier (198 CNY/mo). Gives special avatar frames, high danmaku priority, and entrance banners.',
    platform: 'bilibili',
  },
  {
    keyword: '提督',
    romajiOrPinyin: 'tí dū',
    furiganaOrPinyinRuby: [{ char: '提', ruby: 'tí' }, { char: '督', ruby: 'dū' }],
    translation: 'Fleet Admiral (Tier 2 Sub)',
    explanation: 'Bilibili high-tier monthly subscriber (1998 CNY/mo) with full-screen ship horn entrance animations.',
    platform: 'bilibili',
  },
  {
    keyword: '蚌埠住了',
    romajiOrPinyin: 'bèng bù zhù le',
    furiganaOrPinyinRuby: [{ char: '蚌', ruby: 'bèng' }, { char: '埠', ruby: 'bù' }, { char: '住', ruby: 'zhù' }, { char: '了', ruby: 'le' }],
    translation: "Can't hold back anymore / I broke down (laughing or crying)",
    explanation: 'Homophone for "绷不住了" (bēng bù zhù le) referencing Bengbu city. Means someone lost composure or couldn\'t keep a straight face.',
    platform: 'bilibili',
  },
  {
    keyword: '急了',
    romajiOrPinyin: 'jí le',
    furiganaOrPinyinRuby: [{ char: '急', ruby: 'jí' }, { char: '了', ruby: 'le' }],
    translation: 'U mad bro? / Tilted / Defensive',
    explanation: 'Used when someone is perceived to be defensively agitated or losing their cool during banter.',
    platform: 'bilibili',
  },
  {
    keyword: 'Pog / PogChamp',
    romajiOrPinyin: 'pog',
    translation: 'Incredible / Hype play!',
    explanation: 'Twitch emote expressing shock, triumph, or celebration at an unbelievable feat in-game.',
    platform: 'twitch',
  },
  {
    keyword: 'KEKW',
    romajiOrPinyin: 'kek-w',
    translation: 'Wheezing laugh (El Risitas laugh)',
    explanation: 'Twitch/Kick emote depicting Juan Joya Borja wheezing with laughter at a ridiculous stream blunder.',
    platform: 'twitch',
  },
  {
    keyword: '好耶',
    romajiOrPinyin: 'hǎo yé',
    furiganaOrPinyinRuby: [{ char: '好', ruby: 'hǎo' }, { char: '耶', ruby: 'yé' }],
    translation: 'Yay! / Let’s gooo!',
    explanation: 'Popularized from the Chainsaw Man puppy meme. Expresses genuine childlike joy and excitement.',
    platform: 'bilibili',
  },
];

// Helper to annotate a message with ruby pronunciation when enabled
export function annotateTextWithRuby(text: string): { original: string; rubyHtml: string; matchedSlang?: SlangEntry } {
  for (const entry of SLANG_DICTIONARY) {
    if (text.includes(entry.keyword)) {
      if (entry.furiganaOrPinyinRuby) {
        const rubyHtml = entry.furiganaOrPinyinRuby
          .map((item) => `<ruby>${item.char}<rt>${item.ruby}</rt></ruby>`)
          .join('');
        return {
          original: text,
          rubyHtml: text.replace(entry.keyword, rubyHtml),
          matchedSlang: entry,
        };
      }
    }
  }
  return { original: text, rubyHtml: text };
}
