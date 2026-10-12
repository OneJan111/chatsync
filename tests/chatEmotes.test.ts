import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseEmoteEntries, safeChatImageUrl, splitChatEmotes } from '../src/services/chatEmotes';

describe('chat emotes', () => {
  it('accepts HTTPS images from the supported platform CDNs only', () => {
    assert.equal(safeChatImageUrl('//i0.hdslb.com/bfs/emote/test.png'), 'https://i0.hdslb.com/bfs/emote/test.png');
    assert.equal(safeChatImageUrl('http://yt3.ggpht.com/emote.png'), 'https://yt3.ggpht.com/emote.png');
    assert.equal(safeChatImageUrl('https://attacker.example/image.png'), null);
    assert.equal(safeChatImageUrl('javascript:alert(1)'), null);
  });

  it('parses emote maps and replaces variable-length codes as complete tokens', () => {
    const emotes = parseEmoteEntries({
      '[开心]': { url: 'https://i0.hdslb.com/bfs/emote/happy.png' },
      ':wave:': { image: 'https://yt3.ggpht.com/wave.png' },
      '[invalid]': { url: 'https://attacker.example/x.png' },
    });
    assert.equal(emotes.length, 2);
    assert.deepEqual(splitChatEmotes('Hi [开心] :wave:!', emotes), ['Hi ', '[开心]', ' ', ':wave:', '!']);
  });
});
