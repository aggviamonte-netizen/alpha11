import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  goalBanner,
  isStreakMilestone,
  isSweetPower,
  shotHeightBias,
  shotScatter,
  streakWhisper,
  SWEET_CENTER,
  SWEET_MAX,
  SWEET_MIN,
} from './kickFeel';

describe('isSweetPower', () => {
  it('is true in the readable green band', () => {
    assert.equal(isSweetPower(SWEET_CENTER), true);
    assert.equal(isSweetPower(0.7), true);
  });

  it('is false on a weak or overhit kick', () => {
    assert.equal(isSweetPower(SWEET_MIN), false);
    assert.equal(isSweetPower(SWEET_MAX), false);
    assert.equal(isSweetPower(0.2), false);
    assert.equal(isSweetPower(0.98), false);
  });
});

describe('shotScatter', () => {
  it('is tighter in the sweet than a weak tap', () => {
    assert.ok(shotScatter(SWEET_CENTER) < shotScatter(0.3));
    assert.ok(shotScatter(SWEET_CENTER) < 5);
  });

  it('does not magnetize: even a perfect hit still has some noise', () => {
    assert.ok(shotScatter(SWEET_CENTER) >= 2);
  });
});

describe('shotHeightBias', () => {
  it('lifts an overkick and dumps a weak one', () => {
    assert.ok(shotHeightBias(0.96) > 0);
    assert.ok(shotHeightBias(0.3) < 0);
    assert.equal(shotHeightBias(SWEET_CENTER), 0);
  });
});

describe('streak copy', () => {
  it('marks 3 / 5 / 8 / 12 and later fives', () => {
    assert.equal(isStreakMilestone(2), false);
    assert.equal(isStreakMilestone(3), true);
    assert.equal(isStreakMilestone(5), true);
    assert.equal(isStreakMilestone(15), true);
  });

  it('keeps Spanish banners human, not metallic', () => {
    assert.equal(goalBanner(1), '¡GOL!');
    assert.equal(goalBanner(3), 'RACHA 3');
    assert.equal(goalBanner(8), '¡QUÉ RACHA!');
    assert.match(streakWhisper(5), /hilo/);
    assert.match(streakWhisper(12), /piensa/);
  });
});
