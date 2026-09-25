import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CLUTCH_COOLDOWN_MS,
  CLUTCH_MS,
  DANGER_HOLD_MS,
  FILO_MS,
  STREAK_WINDOW_MS,
  chainBanner,
  chainWhisper,
  clutchBand,
  clutchRank,
  clutchVoice,
  contactSquash,
  dropSquash,
  impactFreeze,
  impactShake,
  isChainOpen,
  isStreakMilestone,
  isTierCeremony,
  mergeAccentCount,
  mergeBurstCount,
  mergeImpact,
  mergeRing,
  mergeScore,
  mergeVoice,
  momentWash,
  nextCombo,
  pointsStyle,
  popScore,
  streakBanner,
  streakMultiplier,
  streakThousandths,
  streakWhisper,
  tierCeremony,
  voiceColor,
  withinStreak,
  bannerLayout,
  bannerMinWhisperY,
  bannerMaxWhisperY,
  clampLabelX,
  labelWidth,
  BANNER_GAP_PX,
  BANNER_LIFT_PX,
  BANNER_SIZE_PX,
  BANNER_TOP_MIN_Y,
  WHISPER_SIZE_PX,
} from './labFeel';
import { DANGER_Y, DROP_Y, FLOOR_Y, INNER_L, INNER_R } from './layout';

describe('honest lab numbers', () => {
  it('keeps the original 1000ms combo window (strictly under a second)', () => {
    assert.equal(STREAK_WINDOW_MS, 1000);
    assert.equal(withinStreak(null, 500), false);
    assert.equal(withinStreak(1000, 1999), true);
    assert.equal(withinStreak(1000, 2000), false);
  });

  it('keeps the danger fail and treats only a real rest as a clutch', () => {
    assert.equal(DANGER_HOLD_MS, 1500);
    assert.equal(CLUTCH_MS, 640);
    assert.equal(FILO_MS, 1080);
    assert.ok(CLUTCH_MS < FILO_MS);
    assert.ok(FILO_MS < DANGER_HOLD_MS);
    assert.ok(CLUTCH_COOLDOWN_MS < STREAK_WINDOW_MS);
    assert.equal(clutchBand(639), 'none');
    assert.equal(clutchBand(640), 'salvado');
    assert.equal(clutchBand(1079), 'salvado');
    assert.equal(clutchBand(1080), 'filo');
    assert.equal(clutchBand(1499), 'filo');
    assert.ok(clutchRank('filo') > clutchRank('salvado'));
    assert.ok(clutchRank('salvado') > clutchRank('none'));
  });

  it('squashes a landing the way the well already did', () => {
    assert.deepEqual(contactSquash(false), { sx: 1.16, sy: 0.82, ms: 150 });
    assert.deepEqual(contactSquash(true), { sx: 1.12, sy: 0.84, ms: 150 });
    assert.deepEqual(dropSquash(), { sx: 1.16, sy: 0.76, ms: 180 });
  });
});

describe('streak pay', () => {
  it('resets outside the window and climbs inside it', () => {
    assert.equal(nextCombo(4, false), 1);
    assert.equal(nextCombo(0, false), 1);
    assert.equal(nextCombo(4, true), 5);
    assert.equal(isChainOpen(2), true);
    assert.equal(isChainOpen(3), false);
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

  it('pays the old flat fuse and the fixed ×1.2 on every chained fuse (no ramp)', () => {
    assert.equal(streakThousandths(1), 1000);
    assert.equal(streakThousandths(2), 1200);
    assert.equal(streakMultiplier(2), 1.2);
    assert.equal(streakThousandths(5), 1200);
    assert.equal(streakThousandths(9), 1200);
    assert.equal(streakMultiplier(20), 1.2);
    assert.equal(mergeScore(1, 1), 10);
    assert.equal(mergeScore(1, 2), 12);
    assert.equal(mergeScore(5, 1), 250);
    assert.equal(mergeScore(5, 2), 300);
    assert.equal(mergeScore(11, 1), 1210);
    assert.equal(mergeScore(11, 2), 1452);
    assert.equal(mergeScore(11, 5), 1452);
    assert.equal(mergeScore(11, 20), 1452);
    assert.equal(popScore(1), 2420);
    assert.equal(popScore(2), 2904);
    assert.equal(popScore(5), 2904);
  });
});

describe('spanish bench voice', () => {
  it('speaks short craft lines', () => {
    assert.equal(streakBanner(1), null);
    assert.equal(streakBanner(2), null);
    assert.equal(chainBanner(), '¡FUNDE!');
    assert.equal(streakBanner(3), '¡CADENA!');
    assert.equal(streakBanner(5), '¡RACHA!');
    assert.equal(streakBanner(8), '¡TORRE!');
    assert.equal(streakBanner(12), '¡MESA!');
    assert.equal(streakBanner(15), '¡MESA!');
    assert.match(chainWhisper(), /hilo/);
    assert.match(streakWhisper(3) ?? '', /ritmo/);
    assert.match(streakWhisper(5) ?? '', /cinco/);
    assert.match(streakWhisper(8) ?? '', /pila/);
    assert.match(streakWhisper(12) ?? '', /mesa/);
    assert.equal(streakWhisper(4), null);
  });

  it('ceremonies broccoli, pumpkin, and the high rungs only', () => {
    assert.equal(isTierCeremony(5), false);
    assert.equal(isTierCeremony(6), true);
    assert.equal(tierCeremony(4), null);
    assert.equal(tierCeremony(6)?.banner, '¡BRÓCOLI!');
    assert.equal(tierCeremony(7)?.banner, '¡A7!');
    assert.equal(tierCeremony(8)?.banner, '¡A8!');
    assert.equal(tierCeremony(9)?.banner, '¡CALABAZA!');
    assert.equal(tierCeremony(10)?.banner, '¡A10!');
    assert.equal(tierCeremony(11)?.banner, '¡A11!');
    assert.match(tierCeremony(6)?.whisper ?? '', /verde/);
    assert.match(tierCeremony(9)?.whisper ?? '', /naranja/);
    assert.match(tierCeremony(11)?.whisper ?? '', /arriba/);
  });

  it('lets a fresh rung and a pop speak before a plain fuse', () => {
    const quiet = { tier: 3, pop: false, popFresh: false, combo: 1, tierFresh: false, clutch: 'none' as const };
    assert.equal(mergeVoice(quiet), null);
    assert.equal(mergeVoice({ ...quiet, combo: 2 })?.banner, '¡FUNDE!');
    assert.match(mergeVoice({ ...quiet, combo: 2 })?.whisper ?? '', /hilo/);
    assert.equal(mergeVoice({ ...quiet, combo: 4 }), null);
    assert.equal(mergeVoice({ ...quiet, combo: 5 })?.banner, '¡RACHA!');
    assert.equal(mergeVoice({ ...quiet, tier: 6, tierFresh: true })?.banner, '¡BRÓCOLI!');
    assert.match(mergeVoice({ ...quiet, tier: 6, tierFresh: true, combo: 5 })?.whisper ?? '', /cinco/);
    assert.equal(mergeVoice({ ...quiet, tier: 6, tierFresh: false }), null);
    assert.equal(mergeVoice({ ...quiet, tier: 9, tierFresh: true })?.banner, '¡CALABAZA!');
    assert.equal(mergeVoice({ ...quiet, tier: 11, tierFresh: true })?.banner, '¡A11!');
    assert.equal(mergeVoice({ ...quiet, tier: 11, pop: true, popFresh: true })?.banner, '¡MESA LIMPIA!');
    assert.match(mergeVoice({ ...quiet, tier: 11, pop: true, popFresh: true })?.whisper ?? '', /dos/);
    assert.equal(mergeVoice({ ...quiet, tier: 11, pop: true, popFresh: false })?.banner, '¡POP!');
    assert.match(mergeVoice({ ...quiet, tier: 11, pop: true, combo: 8 })?.whisper ?? '', /pila/);
    assert.equal(mergeVoice({ ...quiet, clutch: 'salvado' })?.banner, '¡SALVADO!');
    assert.equal(mergeVoice({ ...quiet, clutch: 'filo' })?.banner, '¡AL FILO!');
    assert.match(mergeVoice({ ...quiet, tier: 9, tierFresh: true, clutch: 'filo' })?.whisper ?? '', /pelo/);
    assert.equal(clutchVoice('none'), null);
    assert.match(clutchVoice('salvado')?.whisper ?? '', /línea/);
  });

  it('paints banners in the bench palette and keeps the point chip', () => {
    assert.equal(voiceColor('¡FUNDE!'), '#FF8BD1');
    assert.equal(voiceColor('¡RACHA!'), '#E8FF47');
    assert.equal(voiceColor('¡MESA!'), '#FFD36A');
    assert.equal(voiceColor('¡BRÓCOLI!'), '#7CFFB2');
    assert.equal(voiceColor('¡CALABAZA!'), '#FF7A2E');
    assert.equal(voiceColor('¡POP!'), '#F4F1EA');
    assert.equal(voiceColor('¡AL FILO!'), '#FF7A45');
    assert.equal(pointsStyle(false, 1).size, '16px');
    assert.equal(pointsStyle(false, 2).size, '18px');
    assert.equal(pointsStyle(true, 1).size, '20px');
    assert.equal(pointsStyle(true, 1).color, '#F4F1EA');
  });
});

describe('merge juice', () => {
  it('packs more sparks as the rung and the chain climb, inside the cap', () => {
    assert.ok(mergeBurstCount(1, false, 1) < mergeBurstCount(6, false, 1));
    assert.ok(mergeBurstCount(6, false, 1) <= mergeBurstCount(11, false, 1));
    assert.equal(mergeBurstCount(1, false, 1), 8);
    assert.equal(mergeBurstCount(1, false, 2), 11);
    assert.equal(mergeBurstCount(11, true, 1), 12);
    assert.ok(mergeBurstCount(11, false, 8) <= 12);
    assert.equal(mergeAccentCount(3, false), 0);
    assert.ok(mergeAccentCount(6, false) > 0);
    assert.ok(mergeAccentCount(11, false) > mergeAccentCount(9, false));
    assert.equal(mergeRing(2, false, 1), null);
    assert.ok(mergeRing(6, false, 1));
    assert.ok((mergeRing(11, true, 1)?.scale ?? 0) > (mergeRing(6, false, 1)?.scale ?? 0));
  });

  it('keeps the old hit-stop bands and punches harder on a tall fuse', () => {
    assert.equal(mergeImpact(2, false, 1), 'none');
    assert.equal(mergeImpact(2, false, 2), 'soft');
    assert.equal(mergeImpact(7, false, 1), 'soft');
    assert.equal(mergeImpact(4, false, 8), 'hard');
    assert.equal(mergeImpact(11, false, 1), 'hard');
    assert.equal(mergeImpact(11, true, 1), 'hard');
    assert.equal(impactFreeze('none'), 28);
    assert.equal(impactFreeze('soft'), 46);
    assert.equal(impactFreeze('hard'), 72);
    const soft = impactShake('soft');
    const hard = impactShake('hard');
    assert.ok(soft.intensity < hard.intensity);
    assert.equal(impactShake('none').ms, 46);
    assert.equal(hard.ms, 90);
  });

  it('washes the pop, the landmarks, a long chain, and a hair-from-fail', () => {
    const base = { tier: 3, pop: false, combo: 1, tierFresh: false, clutch: 'none' as const };
    assert.equal(momentWash(base), null);
    assert.equal(momentWash({ ...base, combo: 3 }), null);
    assert.equal(momentWash({ ...base, combo: 5 }), null);
    assert.ok(momentWash({ ...base, pop: true }));
    assert.equal(momentWash({ ...base, tier: 11, tierFresh: true })?.color, 0xf4f1ea);
    assert.equal(momentWash({ ...base, tier: 9, tierFresh: true })?.color, 0xff7a2e);
    assert.equal(momentWash({ ...base, tier: 6, tierFresh: true })?.color, 0x7cffb2);
    assert.equal(momentWash({ ...base, tier: 7, tierFresh: true }), null);
    assert.ok(momentWash({ ...base, combo: 8 }));
    assert.ok(momentWash({ ...base, combo: 12 }));
    assert.equal(momentWash({ ...base, combo: 13 }), null);
    assert.equal(momentWash({ ...base, clutch: 'salvado' }), null);
    assert.equal(momentWash({ ...base, clutch: 'filo' })?.color, 0xff3b4a);
  });
});

describe('banner placement (mobile portrait)', () => {
  const longest = [
    { banner: '¡MESA LIMPIA!', whisper: 'se fueron las dos' },
    { banner: '¡CALABAZA!', whisper: 'naranja y ancha' },
    { banner: '¡SALVADO!', whisper: 'bajó de la línea' },
    { banner: '¡AL FILO!', whisper: 'por un pelo' },
  ];

  function spanOf(at: { x: number }, voice: { banner: string; whisper: string }) {
    const w = Math.max(labelWidth(voice.banner, BANNER_SIZE_PX), labelWidth(voice.whisper, WHISPER_SIZE_PX));
    return { left: at.x - w / 2, right: at.x + w / 2 };
  }

  it('keeps the full text inside the well even for merges hugging a wall', () => {
    for (const voice of longest) {
      for (const x of [INNER_L, INNER_L + 5, 60, 195, 330, INNER_R - 5, INNER_R, -50, 999]) {
        const at = bannerLayout(x, 400, voice);
        const span = spanOf(at, voice);
        assert.ok(span.left >= INNER_L, `${voice.banner} at x=${x} cut on the left (${span.left})`);
        assert.ok(span.right <= INNER_R, `${voice.banner} at x=${x} cut on the right (${span.right})`);
      }
    }
  });

  it('leaves a centred banner where the merge was', () => {
    const at = bannerLayout(195, 400, longest[0]);
    assert.equal(at.x, 195);
    assert.equal(at.whisperY, 400);
    assert.equal(at.bannerY, 400 - BANNER_GAP_PX);
  });

  it('clamps any label into the well and centres one wider than the well', () => {
    assert.equal(clampLabelX(195, 40), 195);
    assert.ok(clampLabelX(INNER_L, 40) - 20 >= INNER_L);
    assert.ok(clampLabelX(INNER_R, 40) + 20 <= INNER_R);
    assert.equal(clampLabelX(0, 10_000), (INNER_L + INNER_R) / 2);
  });

  it('never covers the drop zone, the preview, or the danger line — even after the lift', () => {
    assert.ok(BANNER_TOP_MIN_Y > DANGER_Y);
    assert.ok(BANNER_TOP_MIN_Y > DROP_Y + 40);
    for (const y of [0, DROP_Y - 30, DROP_Y, DROP_Y + 40, DANGER_Y, DANGER_Y + 20, 280]) {
      const at = bannerLayout(195, y, longest[0]);
      assert.equal(at.whisperY, bannerMinWhisperY());
      // Risen banner: centre moves up by the lift, half its (scaled, stroked) height above that.
      const bannerTop = at.bannerY - BANNER_LIFT_PX - (BANNER_SIZE_PX * 1.25 * 1.08) / 2 - 5;
      assert.ok(bannerTop >= BANNER_TOP_MIN_Y, `banner top ${bannerTop} for y=${y}`);
      assert.ok(bannerTop > DANGER_Y);
    }
  });

  it('keeps the stack above the floor for low merges', () => {
    const at = bannerLayout(195, FLOOR_Y + 40, longest[0]);
    assert.equal(at.whisperY, bannerMaxWhisperY());
    assert.ok(at.whisperY < FLOOR_Y);
    assert.ok(bannerMinWhisperY() < bannerMaxWhisperY());
  });
});
