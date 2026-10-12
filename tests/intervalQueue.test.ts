import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createIntervalQueue } from '../src/services/intervalQueue';

describe('interval queue', () => {
  it('spaces queued tasks and does not block later tasks after a failure', async () => {
    const enqueue = createIntervalQueue(30);
    const startedAt: number[] = [];
    const first = enqueue(async () => {
      startedAt.push(Date.now());
      return 'first';
    });
    const failed = enqueue(async () => {
      startedAt.push(Date.now());
      throw new Error('expected failure');
    });
    const last = enqueue(async () => {
      startedAt.push(Date.now());
      return 'last';
    });

    assert.equal(await first, 'first');
    await assert.rejects(failed, /expected failure/);
    assert.equal(await last, 'last');
    assert.equal(startedAt.length, 3);
    assert.ok(startedAt[1] - startedAt[0] >= 20);
    assert.ok(startedAt[2] - startedAt[1] >= 20);
  });
});
