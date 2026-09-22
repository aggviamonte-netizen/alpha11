import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HIT_PAUSE_MS,
  SLIDE_MS,
  comboBanner,
  comboWhisper,
  impactShake,
  impactZoom,
  isMergeStreak,
  mergeAccentCount,
  mergeBurstCount,
  mergeImpact,
  mergePunchScale,
  nextMergeStreak,
  streakBanner,
  streakWhisper,
  tierCeremony,
} from './shiftFeel';

describe('timing', () => {
  it('keeps the slide snappy and the hit-pause short', () => {
    assert.ok(SLIDE_MS >= 100 && SLIDE_MS <= 130);
    assert.ok(HIT_PAUSE_MS > 0 && HIT_PAUSE_MS <= 28);
  });
});

describe('merge juice', () => {
  it('packs more sparks as the tier climbs', () => {
    assert.ok(mergeBurstCount(1) >= 8);
    assert.ok(mergeBurstCount(8) > mergeBurstCount(1));
    assert.ok(mergeBurstCount(11) >= mergeBurstCount(8));
    assert.equal(mergeAccentCount(4), 0);
    assert.ok(mergeAccentCount(7) > 0);
    assert.ok(mergeAccentCount(8) > mergeAccentCount(7));
    assert.ok(mergeAccentCount(11) > mergeAccentCount(8));
  });

  it('punches harder on high tiers', () => {
    assert.ok(mergePunchScale(1) > 1);
    assert.ok(mergePunchScale(7) > mergePunchScale(2));
    assert.ok(mergePunchScale(11) > mergePunchScale(7));
  });

  it('shakes on a multi-merge and on T8+', () => {
    assert.equal(mergeImpact(3, 1), 'none');
    assert.equal(mergeImpact(4, 2), 'soft');
    assert.equal(mergeImpact(8, 1), 'soft');
    assert.equal(mergeImpact(9, 3), 'hard');
    assert.equal(mergeImpact(11, 1), 'hard');
    assert.equal(impactShake('none'), null);
    const soft = impactShake('soft');
    const hard = impactShake('hard');
    assert.ok(soft && hard && soft.intensity < hard.intensity && soft.ms <= hard.ms);
    assert.ok(impactZoom('hard') > impactZoom('soft'));
    assert.equal(impactZoom('none'), 1);
  });
});

describe('combo and streak voice', () => {
  it('resets the streak when a slide does not merge', () => {
    assert.equal(nextMergeStreak(4, 0), 0);
    assert.equal(nextMergeStreak(4, 2), 5);
  });

  it('marks 3 / 5 / 8 / 12 and later fives', () => {
    assert.equal(isMergeStreak(2), false);
    assert.equal(isMergeStreak(3), true);
    assert.equal(isMergeStreak(5), true);
    assert.equal(isMergeStreak(8), true);
    assert.equal(isMergeStreak(15), true);
    assert.equal(isMergeStreak(13), false);
  });

  it('keeps Spanish banners human, not metallic', () => {
    assert.equal(comboBanner(1), null);
    assert.equal(comboBanner(2), 'DOBLE');
    assert.equal(comboBanner(3), '¡TRIPLE!');
    assert.equal(comboBanner(4), '¡QUÉ CADENA!');
    assert.match(comboWhisper(3) ?? '', /golpe/);
    assert.match(comboWhisper(4) ?? '', /cede/);
    assert.equal(streakBanner(2), null);
    assert.equal(streakBanner(3), 'RACHA 3');
    assert.equal(streakBanner(5), 'RACHA 5');
    assert.equal(streakBanner(8), '¡QUÉ RACHA!');
    assert.equal(streakBanner(12), '¡IMPARABLE!');
    assert.equal(streakBanner(15), '¡IMPARABLE!');
    assert.match(streakWhisper(3) ?? '', /seguidos/);
    assert.match(streakWhisper(5) ?? '', /hilo/);
    assert.match(streakWhisper(12) ?? '', /detiene/);
  });
});

describe('tier ceremony', () => {
  it('speaks only for T7, T9, and T11', () => {
    assert.equal(tierCeremony(6), null);
    assert.equal(tierCeremony(8), null);
    assert.equal(tierCeremony(10), null);
    assert.equal(tierCeremony(7)?.label, 'T7 · FLECHA');
    assert.equal(tierCeremony(9)?.label, 'T9 · NODO');
    assert.equal(tierCeremony(11)?.label, 'T11 · NÚCLEO');
    assert.ok((tierCeremony(7)?.alpha ?? 0) > 0);
    assert.ok((tierCeremony(11)?.alpha ?? 0) >= (tierCeremony(7)?.alpha ?? 1));
  });
});
