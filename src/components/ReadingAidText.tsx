import React, { useEffect, useState } from 'react';
import { getJapaneseReading, JapaneseReadingToken } from '../services/readingAids';

interface ReadingAidTextProps {
  text: string;
  enabled: boolean;
  languageHint?: 'zh' | 'ja';
}

const HAS_HAN = /\p{Script=Han}/u;
const HAS_JAPANESE_KANA = /[\u3040-\u30ff]/u;

interface PinyinToken {
  origin: string;
  pinyin: string;
  isZh: boolean;
}

export const ReadingAidText: React.FC<ReadingAidTextProps> = ({ text, enabled, languageHint }) => {
  const isJapanese = HAS_JAPANESE_KANA.test(text) || languageHint === 'ja';
  const hasHan = HAS_HAN.test(text);
  const [pinyinTokens, setPinyinTokens] = useState<PinyinToken[] | null>(null);
  const [japaneseTokens, setJapaneseTokens] = useState<JapaneseReadingToken[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPinyinTokens(null);
    if (enabled && hasHan && !isJapanese) {
      void import('pinyin-pro').then(({ pinyin }) => {
        const tokens = pinyin(text, { type: 'all', toneType: 'symbol', traditional: true });
        if (!cancelled) setPinyinTokens(tokens);
      }).catch((error: unknown) => {
        console.error('Failed to generate Chinese pinyin:', error);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [enabled, hasHan, isJapanese, text]);

  useEffect(() => {
    let cancelled = false;
    setJapaneseTokens(null);
    if (enabled && isJapanese && hasHan) {
      void getJapaneseReading(text).then((tokens) => {
        if (!cancelled) setJapaneseTokens(tokens);
      }).catch((error: unknown) => {
        console.error('Failed to generate Japanese furigana:', error);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [enabled, hasHan, isJapanese, text]);

  if (!enabled || !hasHan) return <>{text}</>;

  if (isJapanese) {
    if (!japaneseTokens) return <>{text}</>;
    return (
      <>
        {japaneseTokens.map((token, index) => (
          token.reading
            ? <ruby key={`${token.surface}-${index}`}>{token.surface}<rt>{token.reading}</rt></ruby>
            : <React.Fragment key={`${token.surface}-${index}`}>{token.surface}</React.Fragment>
        ))}
      </>
    );
  }

  if (!pinyinTokens) return <>{text}</>;

  return (
    <>
      {pinyinTokens.map((token, index) => (
        token.isZh
          ? <ruby key={`${token.origin}-${index}`}>{token.origin}<rt>{token.pinyin}</rt></ruby>
          : <React.Fragment key={`${token.origin}-${index}`}>{token.origin}</React.Fragment>
      ))}
    </>
  );
};
