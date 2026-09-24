/**
 * SNIPER range feel. Pure helpers — no Phaser, no magnets.
 * The sight still sways, the wind still pushes, and the plate never comes to you.
 */

/** Finger lift on touch. Same pad the scene already used. */
export const TOUCH_LIFT = 56;
/** Bolt cooldown. A second pull inside this is a dry click, not a shot. */
export const COOLDOWN_MS = 260;
/** Pixels the sight slides per wind step. */
export const WIND_PX = 8;
/** Hold long enough and the sway calms. It never dies. */
export const STEADY_S = 0.7;
/** Fraction of sway a full hold may cancel. The rest stays, on purpose. */
export const STEADY_CALM = 0.78;
/** Generous plate edge. Not an aim assist. */
export const HIT_PAD = 16;
export const ROUND_S = 48;

/** Inside this fraction of the plate radius the shot is a bull (1.6×). */
export const BULL_RATIO = 0.32;
/** Tighter than the bull. Juice only — same 1.6×, so the center stays honest. */
export const NUCLEO_RATIO = 0.14;
/** Air just outside the plate that still reads as a near miss. */
export const NEAR_PX = 18;

/**
 * Hits chain only inside this window.
 * Longer than a calm hold + the bolt cooldown, shorter than wandering off.
 */
export const STREAK_WINDOW_MS = 2400;

export type ShotBand = 'nucleo' | 'centro' | 'placa' | 'cerca' | 'aire';
export type SniperImpact = 'none' | 'soft' | 'hard';
export type SniperWash = { color: number; alpha: number; ms: number };
export type ShotVoice = { banner: string; whisper: string };

export function markCode(tier: number): string {
  const t = Math.max(1, Math.min(11, Math.round(tier)));
  return `M${t}`;
}

/** Lateral push in px. Only the wind number — never a plate's x. */
export function windOffset(wind: number): number {
  return wind * WIND_PX;
}

/**
 * Sway radius. Holding still shrinks it; letting go, or the clock running out, grows it.
 * A full hold keeps about a fifth of the wobble so the sight is never a magnet.
 */
export function swayAmplitude(left: number, hold: number, aiming: boolean): number {
  const grow = 5 + Math.min(8, (ROUND_S - left) * 0.16);
  const calm = 1 - Math.min(STEADY_CALM, Math.max(0, hold) / STEADY_S);
  return grow * (aiming ? calm : 0.55);
}

export function isSteady(hold: number): boolean {
  return hold >= STEADY_S;
}

export function classifyShot(dist: number, radius: number): ShotBand {
  const r = Math.max(0, radius);
  if (dist <= r * NUCLEO_RATIO) return 'nucleo';
  if (dist <= r * BULL_RATIO) return 'centro';
  if (dist <= r + HIT_PAD) return 'placa';
  if (dist <= r + HIT_PAD + NEAR_PX) return 'cerca';
  return 'aire';
}

export function isBull(band: ShotBand): boolean {
  return band === 'nucleo' || band === 'centro';
}

export function isPlateHit(dist: number, radius: number): boolean {
  const band = classifyShot(dist, radius);
  return band === 'nucleo' || band === 'centro' || band === 'placa';
}

/** A hit inside the window climbs. Anything else starts the chain at one. */
export function nextCombo(prev: number, withinWindow: boolean): number {
  return withinWindow ? prev + 1 : 1;
}

/** 3, 5, 8, 12, then every fifth after that. */
export function isStreakMilestone(combo: number): boolean {
  return combo === 3 || combo === 5 || combo === 8 || combo === 12 || (combo > 12 && combo % 5 === 0);
}

export function isMarkCeremony(tier: number): boolean {
  return tier === 7 || tier === 9 || tier === 11;
}

/** Strong gust and the plate still took the bolt. */
export function isWindRead(wind: number, band: ShotBand): boolean {
  if (Math.abs(wind) < 2) return false;
  return band === 'nucleo' || band === 'centro' || band === 'placa';
}

/** Near miss on the side the gust was pushing. */
export function isWindPush(wind: number, deltaX: number): boolean {
  if (wind === 0 || deltaX === 0) return false;
  return Math.sign(wind) === Math.sign(deltaX);
}

export function streakMultiplier(combo: number): number {
  return 1 + Math.min(Math.max(0, combo - 1), 4) * 0.18;
}

/** Same curve the range already paid: lane + mark, bull 1.6×, streak caps at four steps. */
export function hitScore(lanePts: number, tier: number, combo: number, bull: boolean): number {
  const tierPts = tier * 12;
  return Math.round((lanePts + tierPts) * (bull ? 1.6 : 1) * streakMultiplier(combo));
}

export function streakBanner(combo: number): string | null {
  if (!isStreakMilestone(combo)) return null;
  if (combo >= 12) return '¡DIANA!';
  if (combo >= 8) return '¡SECO!';
  if (combo === 5) return '¡RACHA!';
  return '¡TRES!';
}

export function streakWhisper(combo: number): string | null {
  if (!isStreakMilestone(combo)) return null;
  if (combo >= 12) return 'el polígono es tuyo';
  if (combo >= 8) return 'ni un fallo';
  if (combo === 5) return 'cinco sin pestañear';
  return 'tres al hilo';
}

export function bullBanner(band: 'nucleo' | 'centro'): string {
  return band === 'nucleo' ? '¡NÚCLEO!' : '¡CENTRO!';
}

export function bullWhisper(band: 'nucleo' | 'centro', tier: number): string {
  if (band === 'nucleo') return `clavado en ${markCode(tier)}`;
  return 'en el anillo chico';
}

export function steadyBanner(): string {
  return '¡FIRME!';
}

export function steadyWhisper(): string {
  return 'la mano quieta';
}

export function nearMissBanner(): string {
  return '¡CASI!';
}

export function nearMissWhisper(): string {
  return 'un pelo';
}

export function windReadBanner(): string {
  return '¡VIENTO!';
}

export function windReadWhisper(): string {
  return 'lo leíste';
}

export function windPushBanner(): string {
  return '¡RÁFAGA!';
}

export function windPushWhisper(): string {
  return 'te empujó';
}

export function missWhisper(): string {
  return 'al aire';
}

export function dryWhisper(): string {
  return 'aún caliente';
}

/** Spoken when the gust changes. Short, so the mark stays the subject. */
export function windCall(wind: number): string {
  if (wind >= 2) return 'empuja a la derecha';
  if (wind === 1) return 'un soplo a la derecha';
  if (wind <= -2) return 'empuja a la izquierda';
  if (wind === -1) return 'un soplo a la izquierda';
  return 'el aire para';
}

/** First M7, M9, or M11 of a run. Names are range marks, never produce. */
export function markCeremony(tier: number): { banner: string; whisper: string } | null {
  if (tier === 11) return { banner: '¡M11!', whisper: 'la placa blanca cede' };
  if (tier === 9) return { banner: '¡M9!', whisper: 'oro en el stand' };
  if (tier === 7) return { banner: '¡M7!', whisper: 'verde de fondo' };
  return null;
}

export function shotVoice(opts: {
  band: ShotBand;
  tier: number;
  combo: number;
  steady: boolean;
  wind: number;
  deltaX: number;
  markFresh: boolean;
}): ShotVoice | null {
  if (opts.band === 'aire') return null;
  if (opts.band === 'cerca') {
    if (isWindPush(opts.wind, opts.deltaX)) {
      return { banner: windPushBanner(), whisper: windPushWhisper() };
    }
    return { banner: nearMissBanner(), whisper: nearMissWhisper() };
  }

  const ceremony = opts.markFresh ? markCeremony(opts.tier) : null;
  const streakLine = streakBanner(opts.combo);
  const streakLineWhisper = streakWhisper(opts.combo);
  if (ceremony) {
    return { banner: ceremony.banner, whisper: streakLineWhisper ?? ceremony.whisper };
  }
  if (streakLine && streakLineWhisper) {
    const whisper = isWindRead(opts.wind, opts.band) ? windReadWhisper() : streakLineWhisper;
    return { banner: streakLine, whisper };
  }

  const bull = opts.band === 'nucleo' || opts.band === 'centro' ? opts.band : null;
  if (bull) {
    let whisper = bullWhisper(bull, opts.tier);
    if (opts.steady) whisper = steadyWhisper();
    if (isWindRead(opts.wind, opts.band)) whisper = windReadWhisper();
    return { banner: bullBanner(bull), whisper };
  }
  if (isWindRead(opts.wind, opts.band)) {
    return { banner: windReadBanner(), whisper: windReadWhisper() };
  }
  if (opts.steady) {
    return { banner: steadyBanner(), whisper: steadyWhisper() };
  }
  return null;
}

export function voiceColor(banner: string): string {
  if (banner === '¡NÚCLEO!' || banner === '¡CENTRO!' || banner === '¡SECO!') return '#E8FF47';
  if (banner === '¡FIRME!' || banner === '¡M7!') return '#7CFFB2';
  if (banner === '¡TRES!' || banner === '¡RACHA!') return '#FF8BD1';
  if (banner === '¡DIANA!' || banner === '¡M9!') return '#FFD36A';
  if (banner === '¡CASI!') return '#6EE7FF';
  if (banner === '¡RÁFAGA!') return '#FF7A45';
  if (banner === '¡VIENTO!') return '#8B9BFF';
  if (banner === '¡M11!') return '#F4F1EA';
  return '#E8FF47';
}

/** Sparks. Stays inside burstDots' cap of 12. */
export function hitBurstCount(band: ShotBand): number {
  if (band === 'nucleo') return 12;
  if (band === 'centro') return 10;
  if (band === 'placa') return 7;
  if (band === 'cerca') return 5;
  return 3;
}

/** Extra brass sparks so a bull reads hotter than a body hit. */
export function hitAccentCount(band: ShotBand): number {
  if (band === 'nucleo') return 6;
  if (band === 'centro') return 4;
  return 0;
}

export function hitSquash(band: ShotBand): { sx: number; sy: number; ms: number } {
  if (band === 'nucleo') return { sx: 1.36, sy: 0.54, ms: 150 };
  if (band === 'centro') return { sx: 1.28, sy: 0.62, ms: 140 };
  return { sx: 1.14, sy: 0.8, ms: 120 };
}

/** Scope recoil. Settles before the bolt is cool. */
export function shotSquash(): { sx: number; sy: number; ms: number } {
  return { sx: 1.05, sy: 0.93, ms: 120 };
}

export function shotImpact(band: ShotBand, combo: number): SniperImpact {
  if (band === 'aire' || band === 'cerca') return 'none';
  if (band === 'nucleo' || combo >= 8) return 'hard';
  if (band === 'centro' || combo >= 3) return 'soft';
  return 'none';
}

export function impactShake(impact: SniperImpact): { ms: number; intensity: number } | null {
  if (impact === 'hard') return { ms: 110, intensity: 0.008 };
  if (impact === 'soft') return { ms: 70, intensity: 0.004 };
  return null;
}

export function nearMissShake(): { ms: number; intensity: number } {
  return { ms: 60, intensity: 0.0035 };
}

/** Wash is a ceremony: dead center, a long chain, a gust you actually read, or a tall mark. */
export function momentWash(opts: {
  band: ShotBand;
  combo: number;
  wind: number;
  tier: number;
  markFresh: boolean;
}): SniperWash | null {
  if (opts.markFresh && opts.tier === 11) return { color: 0xf4f1ea, alpha: 0.18, ms: 220 };
  if (opts.markFresh && opts.tier === 9) return { color: 0xffd36a, alpha: 0.16, ms: 200 };
  if (opts.band === 'nucleo') return { color: 0xe8ff47, alpha: 0.16, ms: 180 };
  if (isStreakMilestone(opts.combo) && opts.combo >= 12) return { color: 0xffd36a, alpha: 0.14, ms: 200 };
  if (opts.markFresh && opts.tier === 7) return { color: 0x7cffb2, alpha: 0.12, ms: 160 };
  if (opts.combo === 8) return { color: 0xe8ff47, alpha: 0.12, ms: 180 };
  if (isWindRead(opts.wind, opts.band)) return { color: 0x8b9bff, alpha: 0.12, ms: 160 };
  if (opts.band === 'centro') return { color: 0xe8ff47, alpha: 0.12, ms: 160 };
  return null;
}
