import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ACK_MS,
  BANNER_COOLDOWN_MS,
  BANNER_SIZE_PX,
  BEAM_HIT_H,
  BEAM_HIT_LAT,
  BEAM_WINDOW,
  CLEAN_FALL,
  CRASH_SQUASH,
  HARD_FALL,
  JUMP_BURST,
  JUMP_SQUASH,
  LANE_SLACK,
  NEAR_H,
  NEAR_LAT,
  SPIKE_HIT_H,
  SPIKE_HIT_LAT,
  SPIKE_WINDOW,
  STEER_DEAD,
  STEER_LEAN,
  STREAK_WINDOW_MS,
  VOICE_TOP_PX,
  VOICE_Z,
  WHISPER_SIZE_PX,
  accentCount,
  bannerAllowed,
  beamHits,
  beamNear,
  burstColor,
  burstCount,
  cleanLandBanner,
  cleanLandWhisper,
  controlClasses,
  countsForStreak,
  crashBanner,
  crashWhisper,
  fallSpeed,
  isCleanLand,
  isHardLand,
  isPerfectLane,
  isStreakMilestone,
  landBurst,
  landShake,
  landSquash,
  landWash,
  loopBanner,
  loopWhisper,
  momentShake,
  momentVoice,
  momentWash,
  nearMissBanner,
  nearMissWhisper,
  nextCombo,
  perfectLaneBanner,
  perfectLaneWhisper,
  spikeHits,
  spikeNear,
  steerLean,
  streakBanner,
  streakWhisper,
  surgeBanner,
  surgeStarted,
  surgeWhisper,
  voiceColor,
  withinStreak,
} from './rushFeel';

const PUNCH = /^¡[A-ZÁÉÍÓÚÜÑ]+!$/;

describe('runner feel', () => {
  it('keeps the jump squash, the crash pose, and a short press ack', () => {
    assert.equal(JUMP_SQUASH, 0.78);
    assert.equal(JUMP_BURST, 7);
    assert.equal(CRASH_SQUASH, 0.62);
    assert.ok(ACK_MS >= 120 && ACK_MS <= 220);
    assert.ok(BANNER_COOLDOWN_MS >= 500 && BANNER_COOLDOWN_MS < STREAK_WINDOW_MS);
    assert.equal(VOICE_Z, 3);
    assert.ok(VOICE_TOP_PX >= 72 && VOICE_TOP_PX <= 110);
    assert.equal(BANNER_SIZE_PX, 22);
    assert.equal(WHISPER_SIZE_PX, 13);
  });

  it('rolls into a steer and stays quiet inside the deadzone', () => {
    assert.equal(steerLean(0), 0);
    assert.equal(steerLean(STEER_DEAD / 2), 0);
    assert.ok(steerLean(1) < 0);
    assert.ok(steerLean(-1) > 0);
    assert.equal(steerLean(1), -STEER_LEAN);
    assert.equal(steerLean(4), steerLean(1));
    assert.ok(Math.abs(steerLean(1)) <= 0.24);
  });

  it('acks a held control and a fresh press without renaming the buttons', () => {
    assert.deepEqual(controlClasses(false, false), []);
    assert.deepEqual(controlClasses(true, false), ['is-held']);
    assert.deepEqual(controlClasses(false, true), ['is-ack']);
    assert.deepEqual(controlClasses(true, true), ['is-held', 'is-ack']);
  });
});

describe('streak', () => {
  it('resets outside the window and climbs inside it', () => {
    assert.equal(STREAK_WINDOW_MS, 1600);
    assert.equal(withinStreak(null, 500), false);
    assert.equal(withinStreak(1000, 2600), true);
    assert.equal(withinStreak(1000, 2601), false);
    assert.equal(nextCombo(4, false), 1);
    assert.equal(nextCombo(0, false), 1);
    assert.equal(nextCombo(4, true), 5);
  });

  it('marks 3 / 5 / 8 / 12 and later fives', () => {
    assert.equal(isStreakMilestone(2), false);
    assert.equal(isStreakMilestone(3), true);
    assert.equal(isStreakMilestone(4), false);
    assert.equal(isStreakMilestone(5), true);
    assert.equal(isStreakMilestone(8), true);
    assert.equal(isStreakMilestone(12), true);
    assert.equal(isStreakMilestone(13), false);
    assert.equal(isStreakMilestone(15), true);
  });

  it('lets a clean pass climb and leaves a turbo tap off the chain', () => {
    assert.equal(countsForStreak('near'), true);
    assert.equal(countsForStreak('land'), true);
    assert.equal(countsForStreak('lane'), true);
    assert.equal(countsForStreak('core'), true);
    assert.equal(countsForStreak('loop'), true);
    assert.equal(countsForStreak('surge'), false);
    assert.equal(countsForStreak('crash'), false);
    assert.equal(surgeStarted(0, 0.16), true);
    assert.equal(surgeStarted(0.2, 0.4), false);
    assert.equal(surgeStarted(0, 0), false);
  });

  it('lets a milestone repeat and swallows the same shout twice', () => {
    assert.equal(bannerAllowed(1000, 0, false, false), true);
    assert.equal(bannerAllowed(1000, 900, true, false), false);
    assert.equal(bannerAllowed(900 + BANNER_COOLDOWN_MS, 900, true, false), true);
    assert.equal(bannerAllowed(1000, 900, true, true), true);
    assert.equal(bannerAllowed(1000, 900, false, false), true);
  });
});

describe('spanish track voice', () => {
  it('speaks short runner punches', () => {
    assert.equal(streakBanner(1), null);
    assert.equal(streakBanner(2), null);
    assert.equal(streakBanner(3), '¡TRAMO!');
    assert.equal(streakBanner(5), '¡RITMO!');
    assert.equal(streakBanner(8), '¡LÍNEA!');
    assert.equal(streakBanner(12), '¡RAYO!');
    assert.equal(streakBanner(15), '¡RAYO!');
    assert.match(streakWhisper(3) ?? '', /paso/);
    assert.match(streakWhisper(5) ?? '', /cinco/);
    assert.match(streakWhisper(8) ?? '', /pista/);
    assert.match(streakWhisper(12) ?? '', /corta/);
    assert.equal(streakWhisper(4), null);
    assert.equal(nearMissBanner(), '¡ROZÓN!');
    assert.match(nearMissWhisper(), /pelo/);
    assert.equal(cleanLandBanner(), '¡CLAVADO!');
    assert.match(cleanLandWhisper(), /pista/);
    assert.equal(perfectLaneBanner(), '¡CARRIL!');
    assert.match(perfectLaneWhisper(), /eje/);
    assert.equal(surgeBanner(), '¡EMPUJE!');
    assert.match(surgeWhisper(), /turbo/);
    assert.equal(loopBanner(), '¡GIRO!');
    assert.match(loopWhisper(), /aro/);
    assert.equal(crashBanner(), '¡CORTE!');
    assert.match(crashWhisper(), /tramo/);
  });

  it('lets the loop, the turbo, and the crash keep their own banner', () => {
    assert.equal(momentVoice('core', 1), null);
    assert.equal(momentVoice('core', 2), null);
    assert.equal(momentVoice('core', 4), null);
    assert.equal(momentVoice('core', 5)?.banner, '¡RITMO!');
    assert.match(momentVoice('core', 5)?.whisper ?? '', /cinco/);
    assert.equal(momentVoice('near', 1)?.banner, '¡ROZÓN!');
    assert.equal(momentVoice('near', 8)?.banner, '¡LÍNEA!');
    assert.match(momentVoice('near', 8)?.whisper ?? '', /pelo/);
    assert.equal(momentVoice('land', 1)?.banner, '¡CLAVADO!');
    assert.equal(momentVoice('land', 3)?.banner, '¡TRAMO!');
    assert.match(momentVoice('land', 3)?.whisper ?? '', /pista/);
    assert.equal(momentVoice('lane', 1)?.banner, '¡CARRIL!');
    assert.equal(momentVoice('lane', 12)?.banner, '¡RAYO!');
    assert.match(momentVoice('lane', 12)?.whisper ?? '', /eje/);
    assert.equal(momentVoice('surge', 1)?.banner, '¡EMPUJE!');
    assert.equal(momentVoice('surge', 8)?.banner, '¡EMPUJE!');
    assert.match(momentVoice('surge', 8)?.whisper ?? '', /pista/);
    assert.equal(momentVoice('loop', 1)?.banner, '¡GIRO!');
    assert.match(momentVoice('loop', 1)?.whisper ?? '', /aro/);
    assert.equal(momentVoice('loop', 15)?.banner, '¡GIRO!');
    assert.match(momentVoice('loop', 15)?.whisper ?? '', /corta/);
    assert.equal(momentVoice('crash', 9)?.banner, '¡CORTE!');
    assert.match(momentVoice('crash', 9)?.whisper ?? '', /tramo/);
  });

  it('paints punches in the track palette and stays off the produce bench', () => {
    const lines = [
      nearMissBanner(),
      cleanLandBanner(),
      perfectLaneBanner(),
      surgeBanner(),
      loopBanner(),
      crashBanner(),
      streakBanner(3),
      streakBanner(5),
      streakBanner(8),
      streakBanner(12),
    ];
    for (const line of lines) {
      assert.ok(line);
      assert.match(line, PUNCH);
      assert.equal(voiceColor(line).startsWith('#'), true);
    }
    const blob = [
      ...lines,
      nearMissWhisper(),
      cleanLandWhisper(),
      perfectLaneWhisper(),
      surgeWhisper(),
      loopWhisper(),
      crashWhisper(),
      streakWhisper(3),
      streakWhisper(5),
      streakWhisper(8),
      streakWhisper(12),
    ].join(' ');
    assert.equal(/br[oó]coli|calabaza|berenjena|tomate/i.test(blob), false);
    assert.equal(/capcom|nintendo|sega|sonic|street fighter/i.test(blob), false);
    assert.equal(blob.includes('¡RASANTE!'), false);
    assert.equal(blob.includes('¡ÓRBITA!'), false);
    assert.equal(blob.includes('¡FUNDE!'), false);
    assert.equal(blob.includes('¡GOL!'), false);
    assert.equal(blob.includes('¡DIANA!'), false);
  });
});

describe('graze and land', () => {
  it('keeps the old spike and beam hit volumes', () => {
    assert.equal(spikeHits(0, 0, 0.2, true), true);
    assert.equal(spikeHits(SPIKE_WINDOW - 0.01, SPIKE_HIT_LAT - 0.01, SPIKE_HIT_H - 0.01, true), true);
    assert.equal(spikeHits(0, 0, 0.2, false), false);
    assert.equal(spikeHits(0, SPIKE_HIT_LAT, 0.2, true), false);
    assert.equal(spikeHits(0, 0, SPIKE_HIT_H, true), false);
    assert.equal(spikeHits(SPIKE_WINDOW, 0, 0.2, true), false);
    assert.equal(beamHits(0, 0, 0.4), true);
    assert.equal(beamHits(BEAM_WINDOW - 0.01, BEAM_HIT_LAT - 0.01, BEAM_HIT_H - 0.01), true);
    assert.equal(beamHits(0, 0, BEAM_HIT_H), false);
    assert.equal(beamHits(0, BEAM_HIT_LAT, 0.4), false);
    assert.equal(beamHits(BEAM_WINDOW, 0, 0.4), false);
  });

  it('treats a hair of air as a near miss and an overlap as a hit', () => {
    assert.equal(spikeNear(0, 0, 0.2, true), false);
    assert.equal(spikeNear(0, SPIKE_HIT_LAT, 0.2, true), true);
    assert.equal(spikeNear(0, SPIKE_HIT_LAT + NEAR_LAT, 0.2, true), true);
    assert.equal(spikeNear(0, SPIKE_HIT_LAT + NEAR_LAT + 0.05, 0.2, true), false);
    assert.equal(spikeNear(0, 0, SPIKE_HIT_H, false), true);
    assert.equal(spikeNear(0, 0, SPIKE_HIT_H + NEAR_H, false), true);
    assert.equal(spikeNear(0, 0, SPIKE_HIT_H + NEAR_H + 0.2, false), false);
    assert.equal(spikeNear(0, 0, 0.2, false), true);
    assert.equal(spikeNear(SPIKE_WINDOW, 0, 0.2, false), false);
    assert.equal(beamNear(0, 0, 0.4), false);
    assert.equal(beamNear(0, 0, BEAM_HIT_H), true);
    assert.equal(beamNear(0, 0, BEAM_HIT_H + NEAR_H), true);
    assert.equal(beamNear(0, 0, BEAM_HIT_H + NEAR_H + 0.2), false);
    assert.equal(beamNear(0, BEAM_HIT_LAT, 0.4), true);
    assert.equal(beamNear(0, BEAM_HIT_LAT + NEAR_LAT, 0.4), true);
    assert.equal(beamNear(0, BEAM_HIT_LAT + NEAR_LAT + 0.05, 0.4), false);
  });

  it('sticks a controlled landing and craters a full send', () => {
    assert.equal(fallSpeed(-4), 4);
    assert.equal(fallSpeed(2), 0);
    assert.equal(isCleanLand(-(CLEAN_FALL - 0.1)), false);
    assert.equal(isCleanLand(-CLEAN_FALL), true);
    assert.equal(isCleanLand(-(HARD_FALL - 0.1)), true);
    assert.equal(isHardLand(-(HARD_FALL - 0.1)), false);
    assert.equal(isHardLand(-HARD_FALL), true);
    assert.equal(isCleanLand(-HARD_FALL), false);
    assert.equal(landSquash(-6), 0.72);
    assert.ok(landSquash(-HARD_FALL) < landSquash(-6));
    assert.ok(landSquash(-1) > landSquash(-6));
    assert.ok(landShake(-1) < landShake(-6));
    assert.ok(landShake(-6) < landShake(-HARD_FALL));
    assert.ok(landShake(-HARD_FALL) < momentShake('crash', 1));
    assert.equal(landBurst(-6), 6);
    assert.equal(landBurst(-HARD_FALL), 9);
    assert.equal(landWash(-6), null);
    assert.equal(landWash(-HARD_FALL), 'orange');
  });

  it('calls a centered grab and ignores a wide one', () => {
    assert.equal(isPerfectLane(0), true);
    assert.equal(isPerfectLane(LANE_SLACK), true);
    assert.equal(isPerfectLane(-LANE_SLACK), true);
    assert.equal(isPerfectLane(LANE_SLACK + 0.02), false);
    assert.ok(LANE_SLACK < 1);
  });
});

describe('juice', () => {
  it('keeps shakes lite and sparks inside the runner cap', () => {
    assert.ok(momentShake('near', 1) < momentShake('near', 5));
    assert.ok(momentShake('near', 5) < momentShake('surge', 1));
    assert.equal(momentShake('surge', 1), 0.16);
    assert.equal(momentShake('loop', 1), 0.28);
    assert.ok(momentShake('loop', 8) > momentShake('loop', 1));
    assert.equal(momentShake('core', 1), 0);
    assert.ok(momentShake('core', 3) > 0);
    assert.equal(momentShake('crash', 1), 0.45);
    assert.ok(momentShake('crash', 1) < 0.6);
    assert.equal(burstCount('near'), 7);
    assert.equal(burstCount('core'), 8);
    assert.equal(burstCount('lane'), 10);
    assert.equal(burstCount('crash'), 12);
    assert.equal(burstCount('loop'), 14);
    assert.ok(burstCount('lane') <= 12);
    assert.equal(burstColor('near'), 'cyan');
    assert.equal(burstColor('land'), 'orange');
    assert.equal(burstColor('lane'), 'lime');
    assert.equal(accentCount('core', 1), 0);
    assert.equal(accentCount('lane', 1), 4);
    assert.equal(accentCount('near', 5), 3);
    assert.equal(accentCount('loop', 8), 4);
    assert.ok(accentCount('lane', 1) <= 6);
  });

  it('washes a graze, a turbo, a ring, and a long line', () => {
    assert.equal(momentWash('core', 1), null);
    assert.equal(momentWash('core', 5), null);
    assert.equal(momentWash('core', 8), 'lime');
    assert.equal(momentWash('near', 1), 'cyan');
    assert.equal(momentWash('surge', 1), 'lime');
    assert.equal(momentWash('loop', 1), 'cyan');
    assert.equal(momentWash('lane', 1), 'lime');
    assert.equal(momentWash('land', 1), null);
    assert.equal(momentWash('crash', 1), 'red');
  });
});
