import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BANNER_LIFT_PX,
  BANNER_SIZE_PX,
  HIT_PAUSE_MS,
  SLIDE_MS,
  WHISPER_LIFT_PX,
  WHISPER_SIZE_PX,
  boardBand,
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
  pressureBanner,
  pressureEntered,
  pressureWhisper,
  slideVoice,
  streakBanner,
  streakWhisper,
  tierCeremony,
  voiceColor,
  voiceStack,
  type BoardBand,
  type ShiftVoice,
} from './shiftFeel';

const PUNCH = /^¡[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ ]*!$/;

function assertPunch(label: string): void {
  assert.match(label, PUNCH);
  assert.equal(/\d/.test(label), false);
}

function assertWhisper(line: string): void {
  assert.equal(/[¡!]/.test(line), false);
  assert.equal(line, line.toLowerCase());
}

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

  it('shakes on a multi-merge, on T8+, and on a fresh lock', () => {
    assert.equal(mergeImpact(3, 1), 'none');
    assert.equal(mergeImpact(4, 2), 'soft');
    assert.equal(mergeImpact(8, 1), 'soft');
    assert.equal(mergeImpact(9, 3), 'hard');
    assert.equal(mergeImpact(11, 1), 'hard');
    assert.equal(mergeImpact(2, 1, 'aprieta'), 'soft');
    assert.equal(mergeImpact(2, 1, 'cierre'), 'hard');
    assert.equal(mergeImpact(2, 0, 'none'), 'none');
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
    assert.equal(comboBanner(2), '¡DOBLE!');
    assert.equal(comboBanner(3), '¡TRIPLE!');
    assert.equal(comboBanner(4), '¡QUÉ CADENA!');
    assert.match(comboWhisper(2) ?? '', /una/);
    assert.match(comboWhisper(3) ?? '', /golpe/);
    assert.match(comboWhisper(4) ?? '', /cede/);
    assert.equal(streakBanner(2), null);
    assert.equal(streakBanner(3), '¡TRES!');
    assert.equal(streakBanner(5), '¡RACHA!');
    assert.equal(streakBanner(8), '¡QUÉ RACHA!');
    assert.equal(streakBanner(12), '¡IMPARABLE!');
    assert.equal(streakBanner(15), '¡IMPARABLE!');
    assert.match(streakWhisper(3) ?? '', /seguidos/);
    assert.match(streakWhisper(5) ?? '', /hilo/);
    assert.match(streakWhisper(12) ?? '', /detiene/);
    for (const label of [
      comboBanner(2),
      comboBanner(3),
      comboBanner(4),
      streakBanner(3),
      streakBanner(5),
      streakBanner(8),
      streakBanner(12),
    ]) {
      assertPunch(label ?? '');
    }
    for (const line of [comboWhisper(2), comboWhisper(3), streakWhisper(3), streakWhisper(5)]) {
      assertWhisper(line ?? '');
    }
  });
});

describe('tier ceremony', () => {
  it('speaks only for T7, T9, and T11, in the tessera cast', () => {
    assert.equal(tierCeremony(6), null);
    assert.equal(tierCeremony(8), null);
    assert.equal(tierCeremony(10), null);
    assert.equal(tierCeremony(7)?.banner, '¡FLECHA!');
    assert.equal(tierCeremony(9)?.banner, '¡NODO!');
    assert.equal(tierCeremony(11)?.banner, '¡NÚCLEO!');
    assert.match(tierCeremony(7)?.whisper ?? '', /verde/);
    assert.match(tierCeremony(9)?.whisper ?? '', /conecta/);
    assert.match(tierCeremony(11)?.whisper ?? '', /blanco/);
    assert.ok((tierCeremony(7)?.alpha ?? 0) > 0);
    assert.ok((tierCeremony(11)?.alpha ?? 0) >= (tierCeremony(7)?.alpha ?? 1));
    for (const tier of [7, 9, 11]) {
      const ceremony = tierCeremony(tier);
      assertPunch(ceremony?.banner ?? '');
      assertWhisper(ceremony?.whisper ?? '');
    }
  });
});

describe('board pressure', () => {
  it('reads one hole, a living full board, and stays quiet when the run is dead', () => {
    assert.equal(boardBand(2, true), 'none');
    assert.equal(boardBand(1, true), 'aprieta');
    assert.equal(boardBand(0, true), 'cierre');
    assert.equal(boardBand(0, false), 'none');
    assert.equal(pressureBanner('none'), null);
    assert.equal(pressureBanner('aprieta'), '¡HUECO!');
    assert.equal(pressureBanner('cierre'), '¡CIERRE!');
    assert.match(pressureWhisper('aprieta') ?? '', /una/);
    assert.match(pressureWhisper('cierre') ?? '', /hueco/);
    assertPunch(pressureBanner('aprieta') ?? '');
    assertPunch(pressureBanner('cierre') ?? '');
  });

  it('speaks when the board newly tightens and not while it stays there', () => {
    assert.equal(pressureEntered('none', 'none'), false);
    assert.equal(pressureEntered('none', 'aprieta'), true);
    assert.equal(pressureEntered('aprieta', 'aprieta'), false);
    assert.equal(pressureEntered('aprieta', 'cierre'), true);
    assert.equal(pressureEntered('cierre', 'cierre'), false);
    assert.equal(pressureEntered('cierre', 'none'), false);
    assert.equal(pressureEntered('aprieta', 'none'), false);
  });
});

describe('slide voice', () => {
  const quiet = { merges: 1, streak: 1, tier: 2, tierFresh: false, pressure: 'none' as BoardBand };

  it('stays silent on a plain merge', () => {
    assert.equal(slideVoice(quiet), null);
  });

  it('gives a double its punch and lets a streak underwrite it', () => {
    const doble = slideVoice({ ...quiet, merges: 2 });
    assert.equal(doble?.banner, '¡DOBLE!');
    assert.match(doble?.whisper ?? '', /una/);
    const streaked = slideVoice({ ...quiet, merges: 2, streak: 5 });
    assert.equal(streaked?.banner, '¡DOBLE!');
    assert.match(streaked?.whisper ?? '', /hilo/);
  });

  it('lets a fresh tessera take the banner and keep the streak whisper', () => {
    const flecha = slideVoice({ ...quiet, tier: 7, tierFresh: true });
    assert.equal(flecha?.banner, '¡FLECHA!');
    assert.match(flecha?.whisper ?? '', /verde/);
    const raced = slideVoice({ ...quiet, merges: 3, streak: 5, tier: 11, tierFresh: true });
    assert.equal(raced?.banner, '¡NÚCLEO!');
    assert.match(raced?.whisper ?? '', /hilo/);
    assert.equal(slideVoice({ ...quiet, tier: 7, tierFresh: false }), null);
  });

  it('speaks a streak when the slide itself is quiet', () => {
    assert.equal(slideVoice({ ...quiet, streak: 3 })?.banner, '¡TRES!');
    assert.equal(slideVoice({ ...quiet, streak: 8 })?.banner, '¡QUÉ RACHA!');
  });

  it('warns on a fresh lock without stepping on a louder shout', () => {
    const hole = slideVoice({ ...quiet, pressure: 'aprieta' });
    assert.equal(hole?.banner, '¡HUECO!');
    assert.match(hole?.whisper ?? '', /una/);
    const locked = slideVoice({ ...quiet, merges: 2, pressure: 'cierre' });
    assert.equal(locked?.banner, '¡DOBLE!');
    assert.match(locked?.whisper ?? '', /hueco/);
    const mild = slideVoice({ ...quiet, merges: 2, pressure: 'aprieta' });
    assert.equal(mild?.banner, '¡DOBLE!');
    assert.match(mild?.whisper ?? '', /una/);
  });

  it('paints banners in the tessera palette and stacks them above the board', () => {
    assert.equal(voiceColor('¡DOBLE!'), '#FF8BD1');
    assert.equal(voiceColor('¡TRIPLE!'), '#FF8BD1');
    assert.equal(voiceColor('¡TRES!'), '#FF8BD1');
    assert.equal(voiceColor('¡RACHA!'), '#E8FF47');
    assert.equal(voiceColor('¡QUÉ RACHA!'), '#E8FF47');
    assert.equal(voiceColor('¡QUÉ CADENA!'), '#E8FF47');
    assert.equal(voiceColor('¡IMPARABLE!'), '#F4F1EA');
    assert.equal(voiceColor('¡FLECHA!'), '#7CFFB2');
    assert.equal(voiceColor('¡NODO!'), '#4AD4FF');
    assert.equal(voiceColor('¡NÚCLEO!'), '#F4F1EA');
    assert.equal(voiceColor('¡HUECO!'), '#4AD4FF');
    assert.equal(voiceColor('¡CIERRE!'), '#FF7A45');
    assert.equal(BANNER_SIZE_PX, 22);
    assert.equal(WHISPER_SIZE_PX, 13);
    assert.ok(BANNER_LIFT_PX > WHISPER_LIFT_PX);
    const at = voiceStack(214);
    assert.ok(at.bannerY < at.whisperY);
    assert.ok(at.whisperY < 214);
    assert.ok(at.bannerY - BANNER_LIFT_PX > 0);
  });

  it('never puts produce names on a SHIFT shout', () => {
    const voices: Array<ShiftVoice | null> = [
      slideVoice({ ...quiet, merges: 2 }),
      slideVoice({ ...quiet, merges: 3 }),
      slideVoice({ ...quiet, merges: 4 }),
      slideVoice({ ...quiet, streak: 3 }),
      slideVoice({ ...quiet, streak: 5 }),
      slideVoice({ ...quiet, streak: 8 }),
      slideVoice({ ...quiet, streak: 12 }),
      slideVoice({ ...quiet, tier: 7, tierFresh: true }),
      slideVoice({ ...quiet, tier: 9, tierFresh: true }),
      slideVoice({ ...quiet, tier: 11, tierFresh: true }),
      slideVoice({ ...quiet, pressure: 'aprieta' }),
      slideVoice({ ...quiet, pressure: 'cierre' }),
    ];
    for (const voice of voices) {
      assert.ok(voice);
      assert.equal(/br[oó]coli|calabaza|berenjena|tomate|guisante|zanahoria/i.test(`${voice?.banner} ${voice?.whisper}`), false);
    }
  });
});
