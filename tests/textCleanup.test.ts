import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanChatText, hasReadableChatText } from '../src/services/textCleanup';

describe('chat text cleanup', () => {
  it('removes emoji and platform emotes while preserving readable text', () => {
    assert.equal(cleanChatText('Hello 👋 [doge] :_wave:'), 'Hello');
  });

  it('removes Japanese kaomoji and table-flip emoticons', () => {
    assert.equal(cleanChatText('すごい (＾▽＾)'), 'すごい');
    assert.equal(cleanChatText('えええ （╯°□°）╯︵ ┻━┻'), 'えええ');
  });

  it('identifies emoji- and kaomoji-only messages as unreadable', () => {
    assert.equal(cleanChatText('😂😂 (T_T)'), '');
    assert.equal(hasReadableChatText(cleanChatText('😂😂 (T_T)')), false);
  });
});
