import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BULL_RATIO,
  COOLDOWN_MS,
  HIT_PAD,
  NEAR_PX,
  NUCLEO_RATIO,
  ROUND_S,
  STEADY_CALM,
  STEADY_S,
  STREAK_WINDOW_MS,
  TOUCH_LIFT,
  WIND_PX,
  bullBanner,
  bullWhisper,
  classifyShot,
  dryWhisper,
  hitAccentCount,
  hitBurstCount,
  hitScore,
  hitSquash,
  impactShake,
  isBull,
  isMarkCeremony,
  isPlateHit,
  isSteady,
  isStreakMilestone,
  isWindPush,
  isWindRead,
  markCeremony,
  markCode,
  missWhisper,
  momentWash,
  nearMissBanner,
  nearMissShake,
  nearMissWhisper,
  nextCombo,
  shotImpact,
  shotSquash,
  shotVoice,
  steadyBanner,
  steadyWhisper,
  streakBanner,
  streakWhisper,
  swayAmplitude,
  voiceColor,
  windCall,
  windOffset,
  windPushBanner,
  windReadBanner,
  windReadWhisper,
} from './sniperFeel';

describe('honest range numbers', () => {
  it('keeps the touch lift, the bolt cooldown, and the wind step', () => {
    assert.equal(TOUCH_LIFT, 56);
    assert.equal(COOLDOWN_MS, 260);
    assert.equal(WIND_PX, 8);
    assert.equal(HIT_PAD, 16);
    assert.equal(ROUND_S, 48);
    assert.equal(BULL_RATIO, 0.32);
  });

  it('gives a held shot a window longer than the cooldown and shorter than a stroll', () => {
    assert.ok(STREAK_WINDOW_MS > COOLDOWN_MS + STEADY_S * 1000);
    assert.ok(STREAK_WINDOW_MS < 3200);
  });

  it('pushes the sight by the wind and never toward a plate', () => {
    assert.equal(windOffset(0), 0);
    assert.equal(windOffset(1), WIND_PX);
    assert.equal(windOffset(-2), -16);
    assert.equal(windOffset.length, 1);
  });
});

describe('steady aim', () => {
  it('shrinks sway while you hold and refuses to freeze the sight', () => {
    const loose = swayAmplitude(ROUND_S, 0, true);
    const held = swayAmplitude(ROUND_S, STEADY_S, true);
    const late = swayAmplitude(0, STEADY_S, true);
    assert.ok(held < loose * (1 - STEADY_CALM + 0.02));
    assert.ok(held > 0.8);
    assert.ok(late > held);
    assert.equal(isSteady(STEADY_S), true);
    assert.equal(isSteady(STEADY_S - 0.05), false);
  });

  it('wobbles more when the finger is up', () => {
    const held = swayAmplitude(20, STEADY_S, true);
    const idle = swayAmplitude(20, STEADY_S, false);
    assert.ok(idle > held);
  });
});

describe('shot bands', () => {
  const r = 40;

  it('reads núcleo, centro, plate, near miss, and air — and does not magnetize', () => {
    assert.equal(classifyShot(0, r), 'nucleo');
    assert.equal(classifyShot(r * NUCLEO_RATIO, r), 'nucleo');
    assert.equal(classifyShot(r * NUCLEO_RATIO + 0.5, r), 'centro');
    assert.equal(classifyShot(r * BULL_RATIO, r), 'centro');
    assert.equal(classifyShot(r * BULL_RATIO + 1, r), 'placa');
    assert.equal(classifyShot(r + HIT_PAD, r), 'placa');
    assert.equal(classifyShot(r + HIT_PAD + 1, r), 'cerca');
    assert.equal(classifyShot(r + HIT_PAD + NEAR_PX, r), 'cerca');
    assert.equal(classifyShot(r + HIT_PAD + NEAR_PX + 1, r), 'aire');
    assert.equal(isPlateHit(r + HIT_PAD, r), true);
    assert.equal(isPlateHit(r + HIT_PAD + 1, r), false);
    assert.equal(isBull('nucleo'), true);
    assert.equal(isBull('centro'), true);
    assert.equal(isBull('placa'), false);
  });

  it('pays the old bull curve and caps the streak steps at four', () => {
    assert.equal(hitScore(60, 1, 1, false), 72);
    assert.equal(hitScore(60, 1, 1, true), 115);
    assert.equal(hitScore(60, 1, 5, false), 124);
    assert.equal(hitScore(60, 1, 9, false), 124);
    assert.equal(hitScore(170, 11, 1, true), 483);
  });
});

describe('streak and wind reads', () => {
  it('resets outside the window and climbs inside it', () => {
    assert.equal(nextCombo(4, false), 1);
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

  it('treats a strong gust on a hit as a read, and a same-side miss as a push', () => {
    assert.equal(isWindRead(2, 'placa'), true);
    assert.equal(isWindRead(1, 'nucleo'), false);
    assert.equal(isWindRead(-2, 'cerca'), false);
    assert.equal(isWindRead(0, 'centro'), false);
    assert.equal(isWindPush(2, 8), true);
    assert.equal(isWindPush(-2, 8), false);
    assert.equal(isWindPush(0, 8), false);
    assert.equal(isWindPush(2, 0), false);
  });
});

describe('spanish range voice', () => {
  it('speaks short craft lines, not empty slogans', () => {
    assert.equal(streakBanner(1), null);
    assert.equal(streakBanner(3), '¡TRES!');
    assert.equal(streakBanner(5), '¡RACHA!');
    assert.equal(streakBanner(8), '¡SECO!');
    assert.equal(streakBanner(12), '¡DIANA!');
    assert.equal(streakBanner(15), '¡DIANA!');
    assert.match(streakWhisper(3) ?? '', /hilo/);
    assert.match(streakWhisper(5) ?? '', /pestañear/);
    assert.match(streakWhisper(8) ?? '', /fallo/);
    assert.match(streakWhisper(12) ?? '', /polígono/);
    assert.equal(bullBanner('nucleo'), '¡NÚCLEO!');
    assert.equal(bullBanner('centro'), '¡CENTRO!');
    assert.match(bullWhisper('nucleo', 4), /M4/);
    assert.match(bullWhisper('centro', 2), /anillo/);
    assert.equal(steadyBanner(), '¡FIRME!');
    assert.match(steadyWhisper(), /quieta/);
    assert.equal(nearMissBanner(), '¡CASI!');
    assert.match(nearMissWhisper(), /pelo/);
    assert.equal(windReadBanner(), '¡VIENTO!');
    assert.match(windReadWhisper(), /leíste/);
    assert.equal(windPushBanner(), '¡RÁFAGA!');
    assert.match(missWhisper(), /aire/);
    assert.match(dryWhisper(), /caliente/);
  });

  it('names the gust in plain Spanish', () => {
    assert.match(windCall(2), /derecha/);
    assert.match(windCall(1), /derecha/);
    assert.match(windCall(-2), /izquierda/);
    assert.match(windCall(-1), /izquierda/);
    assert.match(windCall(0), /aire/);
  });

  it('ceremonies M7, M9, and M11 only', () => {
    assert.equal(markCode(1), 'M1');
    assert.equal(markCode(11), 'M11');
    assert.equal(markCode(14), 'M11');
    assert.equal(isMarkCeremony(6), false);
    assert.equal(isMarkCeremony(7), true);
    assert.equal(markCeremony(4), null);
    assert.equal(markCeremony(7)?.banner, '¡M7!');
    assert.equal(markCeremony(9)?.banner, '¡M9!');
    assert.equal(markCeremony(11)?.banner, '¡M11!');
    assert.match(markCeremony(11)?.whisper ?? '', /placa/);
    assert.doesNotMatch(`${markCeremony(7)?.whisper} ${markCeremony(9)?.whisper}`, /berenjena|tomate|fruta/i);
  });

  it('lets a fresh tall mark and a streak speak before a plain bull', () => {
    const base = { tier: 3, combo: 1, steady: false, wind: 0, deltaX: 0, markFresh: false };
    assert.equal(shotVoice({ ...base, band: 'aire' }), null);
    assert.equal(shotVoice({ ...base, band: 'placa' }), null);
    assert.equal(shotVoice({ ...base, band: 'centro' })?.banner, '¡CENTRO!');
    assert.equal(shotVoice({ ...base, band: 'nucleo', steady: true })?.banner, '¡NÚCLEO!');
    assert.match(shotVoice({ ...base, band: 'nucleo', steady: true })?.whisper ?? '', /quieta/);
    assert.equal(shotVoice({ ...base, band: 'placa', steady: true })?.banner, '¡FIRME!');
    assert.equal(shotVoice({ ...base, band: 'placa', wind: 2 })?.banner, '¡VIENTO!');
    assert.equal(shotVoice({ ...base, band: 'centro', combo: 5 })?.banner, '¡RACHA!');
    assert.match(shotVoice({ ...base, band: 'centro', combo: 5, wind: 2 })?.whisper ?? '', /leíste/);
    assert.equal(shotVoice({ ...base, band: 'cerca', deltaX: 4 })?.banner, '¡CASI!');
    assert.equal(shotVoice({ ...base, band: 'cerca', wind: -2, deltaX: -6 })?.banner, '¡RÁFAGA!');
    assert.equal(shotVoice({ ...base, band: 'cerca', wind: 2, deltaX: -6 })?.banner, '¡CASI!');
    assert.equal(shotVoice({ ...base, band: 'placa', tier: 11, markFresh: true })?.banner, '¡M11!');
    assert.equal(shotVoice({ ...base, band: 'placa', tier: 11, markFresh: false }), null);
    assert.equal(shotVoice({ ...base, band: 'nucleo', tier: 9, combo: 8, markFresh: true })?.banner, '¡M9!');
    assert.match(shotVoice({ ...base, band: 'nucleo', tier: 9, combo: 8, markFresh: true })?.whisper ?? '', /fallo/);
  });

  it('paints banners in the range palette', () => {
    assert.equal(voiceColor('¡NÚCLEO!'), '#E8FF47');
    assert.equal(voiceColor('¡RÁFAGA!'), '#FF7A45');
    assert.equal(voiceColor('¡VIENTO!'), '#8B9BFF');
    assert.equal(voiceColor('¡M11!'), '#F4F1EA');
  });
});

describe('hit juice', () => {
  it('packs more sparks as the shot climbs air < plate < bull < núcleo', () => {
    assert.ok(hitBurstCount('aire') < hitBurstCount('cerca'));
    assert.ok(hitBurstCount('cerca') < hitBurstCount('placa'));
    assert.ok(hitBurstCount('placa') < hitBurstCount('centro'));
    assert.ok(hitBurstCount('centro') < hitBurstCount('nucleo'));
    assert.ok(hitBurstCount('nucleo') <= 12);
    assert.equal(hitAccentCount('placa'), 0);
    assert.ok(hitAccentCount('centro') > 0);
    assert.ok(hitAccentCount('nucleo') > hitAccentCount('centro'));
  });

  it('squashes a bull harder than a body hit, and recoils inside the cooldown', () => {
    assert.ok(hitSquash('nucleo').sx > hitSquash('centro').sx);
    assert.ok(hitSquash('centro').sx > hitSquash('placa').sx);
    const recoil = shotSquash();
    assert.ok(recoil.sx > 1 && recoil.sy < 1);
    assert.ok(recoil.ms < COOLDOWN_MS);
  });

  it('punches the camera on a núcleo and on a long chain', () => {
    assert.equal(shotImpact('aire', 1), 'none');
    assert.equal(shotImpact('cerca', 4), 'none');
    assert.equal(shotImpact('placa', 1), 'none');
    assert.equal(shotImpact('placa', 3), 'soft');
    assert.equal(shotImpact('centro', 1), 'soft');
    assert.equal(shotImpact('nucleo', 1), 'hard');
    assert.equal(shotImpact('placa', 8), 'hard');
    assert.equal(impactShake('none'), null);
    const soft = impactShake('soft');
    const hard = impactShake('hard');
    assert.ok(soft && hard && soft.intensity < hard.intensity && soft.ms <= hard.ms);
    const graze = nearMissShake();
    assert.ok(graze.intensity < (soft?.intensity ?? 1));
  });

  it('washes a núcleo, a read gust, and a fresh tall mark — not a lonely body hit', () => {
    const quiet = { band: 'placa' as const, combo: 1, wind: 0, tier: 2, markFresh: false };
    assert.equal(momentWash(quiet), null);
    assert.equal(momentWash({ ...quiet, band: 'centro' })?.color, 0xe8ff47);
    assert.equal(momentWash({ ...quiet, band: 'nucleo' })?.color, 0xe8ff47);
    assert.ok((momentWash({ ...quiet, band: 'nucleo' })?.alpha ?? 0) > (momentWash({ ...quiet, band: 'centro' })?.alpha ?? 1));
    assert.equal(momentWash({ ...quiet, wind: 2 })?.color, 0x8b9bff);
    assert.equal(momentWash({ ...quiet, combo: 12 })?.color, 0xffd36a);
    assert.equal(momentWash({ ...quiet, combo: 4 }), null);
    assert.equal(momentWash({ ...quiet, tier: 11, markFresh: true })?.color, 0xf4f1ea);
    assert.equal(momentWash({ ...quiet, tier: 11, markFresh: false }), null);
  });
});
