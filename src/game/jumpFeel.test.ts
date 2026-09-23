import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ASSIST_MAX,
  ASSIST_RANGE,
  COMBO_WINDOW_MS,
  FIRE_MS,
  GRACE_MS,
  GRAZE_PX,
  KILL_FREEZE_MS,
  STEER_RATE,
  aimNudge,
  comboBanner,
  comboWhisper,
  eliteEntrance,
  graceSaveBanner,
  graceSaveWhisper,
  impactShake,
  impactZoom,
  isComboMilestone,
  isNearMiss,
  killAccentCount,
  killBurstCount,
  killImpact,
  killVoice,
  momentWash,
  nearMissBanner,
  nearMissWhisper,
  nextCombo,
  scoreKill,
  shotSquash,
  surfaceGap,
} from './jumpFeel';

describe('tracking feel', () => {
  it('keeps steer snappy, fire readable, and grace short', () => {
    assert.ok(STEER_RATE >= 18 && STEER_RATE <= 28);
    assert.ok(FIRE_MS >= 88 && FIRE_MS <= 104);
    assert.ok(GRACE_MS >= 480 && GRACE_MS <= 760);
    assert.ok(COMBO_WINDOW_MS >= 1500 && COMBO_WINDOW_MS <= 1750);
  });

  it('does not freeze the craft on a kill', () => {
    assert.equal(KILL_FREEZE_MS, 0);
  });

  it('squashes the muzzle without hiding the hull', () => {
    const punch = shotSquash();
    assert.ok(punch.sx < 1 && punch.sx > 0.88);
    assert.ok(punch.sy > 1 && punch.sy < 1.16);
    assert.ok(punch.ms > 0 && punch.ms <= 72);
    assert.ok(punch.ms < FIRE_MS);
  });
});

describe('aim nudge', () => {
  it('stays quiet when the shot is already centered', () => {
    assert.equal(aimNudge(100, 100), 0);
  });

  it('does not collect a foe outside the lane', () => {
    assert.equal(aimNudge(100, 100 + ASSIST_RANGE + 8), 0);
    assert.equal(aimNudge(200, 40), 0);
  });

  it('kisses a foe you are already on, and never snaps', () => {
    const right = aimNudge(100, 110);
    const left = aimNudge(100, 90);
    assert.ok(right > 0 && right <= ASSIST_MAX);
    assert.ok(left < 0 && left >= -ASSIST_MAX);
    assert.ok(Math.abs(right) < 10);
    assert.ok(ASSIST_MAX <= 6);
    assert.ok(ASSIST_RANGE <= 22);
  });
});

describe('kill juice', () => {
  it('packs more sparks as the foe climbs rock < drone < elite', () => {
    assert.ok(killBurstCount('rock') < killBurstCount('big'));
    assert.ok(killBurstCount('big') < killBurstCount('drone'));
    assert.ok(killBurstCount('drone') < killBurstCount('elite'));
    assert.ok(killBurstCount('elite') <= 12);
    assert.equal(killAccentCount('rock'), 0);
    assert.equal(killAccentCount('big'), 0);
    assert.ok(killAccentCount('drone') > 0);
    assert.ok(killAccentCount('elite') > killAccentCount('drone'));
  });

  it('punches the camera on a multi-kill and on an elite', () => {
    assert.equal(killImpact('rock', 1), 'none');
    assert.equal(killImpact('drone', 1), 'none');
    assert.equal(killImpact('rock', 3), 'soft');
    assert.equal(killImpact('drone', 5), 'soft');
    assert.equal(killImpact('rock', 8), 'hard');
    assert.equal(killImpact('elite', 1), 'hard');
    assert.equal(impactShake('none'), null);
    const soft = impactShake('soft');
    const hard = impactShake('hard');
    assert.ok(soft && hard && soft.intensity < hard.intensity && soft.ms <= hard.ms);
    assert.ok(impactZoom('hard') > impactZoom('soft'));
    assert.equal(impactZoom('none'), 1);
  });

  it('washes only the first elite and a long streak', () => {
    assert.equal(momentWash('rock', 1, false), null);
    assert.equal(momentWash('rock', 3, false), null);
    assert.equal(momentWash('rock', 5, false), null);
    assert.equal(momentWash('elite', 1, false), null);
    assert.equal(momentWash('elite', 1, true)?.color, 0xff7a45);
    assert.ok((momentWash('rock', 8, false)?.alpha ?? 0) > 0);
    assert.ok((momentWash('rock', 12, false)?.alpha ?? 0) > 0);
    assert.equal(momentWash('rock', 13, false), null);
  });

  it('pops elites in from a small scale', () => {
    const enter = eliteEntrance();
    assert.ok(enter.from > 0.2 && enter.from < 0.7);
    assert.ok(enter.ms >= 120 && enter.ms <= 220);
  });
});

describe('combo voice', () => {
  it('resets outside the window and climbs inside it', () => {
    assert.equal(nextCombo(4, false), 1);
    assert.equal(nextCombo(4, true), 5);
  });

  it('marks 3 / 5 / 8 / 12 and later fives', () => {
    assert.equal(isComboMilestone(2), false);
    assert.equal(isComboMilestone(3), true);
    assert.equal(isComboMilestone(4), false);
    assert.equal(isComboMilestone(5), true);
    assert.equal(isComboMilestone(8), true);
    assert.equal(isComboMilestone(12), true);
    assert.equal(isComboMilestone(13), false);
    assert.equal(isComboMilestone(15), true);
  });

  it('speaks short Spanish arcade lines', () => {
    assert.equal(comboBanner(1), null);
    assert.equal(comboBanner(2), null);
    assert.equal(comboBanner(3), '¡PULSO!');
    assert.equal(comboBanner(5), '¡RACHA!');
    assert.equal(comboBanner(8), '¡LIMPIO!');
    assert.equal(comboBanner(12), '¡ÓRBITA!');
    assert.equal(comboBanner(15), '¡ÓRBITA!');
    assert.match(comboWhisper(3) ?? '', /pulso/);
    assert.match(comboWhisper(5) ?? '', /ritmo/);
    assert.match(comboWhisper(8) ?? '', /roce/);
    assert.match(comboWhisper(12) ?? '', /carril/);
    assert.equal(comboWhisper(4), null);
  });

  it('gives elites their own banner and keeps the streak whisper', () => {
    assert.equal(killVoice('rock', 1), null);
    assert.equal(killVoice('drone', 2), null);
    assert.equal(killVoice('rock', 5)?.banner, '¡RACHA!');
    assert.match(killVoice('rock', 5)?.whisper ?? '', /ritmo/);
    assert.equal(killVoice('elite', 1)?.banner, '¡CAZA!');
    assert.match(killVoice('elite', 1)?.whisper ?? '', /grande/);
    assert.equal(killVoice('elite', 8)?.banner, '¡CAZA!');
    assert.match(killVoice('elite', 8)?.whisper ?? '', /roce/);
  });

  it('pays the same combo curve the scene used to inline', () => {
    assert.equal(scoreKill('rock', 1), 8);
    assert.equal(scoreKill('big', 1), 16);
    assert.equal(scoreKill('drone', 2), 21);
    assert.equal(scoreKill('rock', 3), 14);
    assert.equal(scoreKill('elite', 5), 44);
    assert.equal(scoreKill('elite', 9), 44);
  });
});

describe('graze and grace', () => {
  it('treats a hair of air as a near miss and an overlap as a hit', () => {
    assert.ok(surfaceGap(0, 0, 9, 20, 0, 5) > 0);
    assert.ok(surfaceGap(0, 0, 9, 10, 0, 5) < 0);
    assert.equal(isNearMiss(0), true);
    assert.equal(isNearMiss(GRAZE_PX), true);
    assert.equal(isNearMiss(GRAZE_PX + 0.5), false);
    assert.equal(isNearMiss(-0.4), false);
  });

  it('voices the graze and the grace save in Spanish', () => {
    assert.equal(nearMissBanner(), '¡RASANTE!');
    assert.match(nearMissWhisper(), /pelo/);
    assert.equal(graceSaveBanner(), '¡SALVO!');
    assert.match(graceSaveWhisper(), /aguanta/);
  });
});
