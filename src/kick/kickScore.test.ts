import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isNewKickRecord } from './kickScore';

describe('isNewKickRecord', () => {
  it('is false for a miss or empty streak', () => {
    assert.equal(isNewKickRecord(0, 0), false);
    assert.equal(isNewKickRecord(0, 4), false);
  });

  it('is true only when the streak beats the frozen previous best', () => {
    assert.equal(isNewKickRecord(1, 0), true);
    assert.equal(isNewKickRecord(6, 5), true);
  });

  it('is false on a tie or a lower streak', () => {
    assert.equal(isNewKickRecord(5, 5), false);
    assert.equal(isNewKickRecord(3, 5), false);
  });
});
