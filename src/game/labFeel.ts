import { DANGER_Y, FLOOR_Y, INNER_L, INNER_R } from './layout';

/**
 * LAB merge feel. Pure helpers — no Phaser.
 * Drop aim, gravity, the 200ms fuse, and the danger line stay in the scene.
 * This module only decides how a fuse sounds, shakes, and pays the fixed ×1.2 combo.
 */

/**
 * Fuses chain only inside this window — the lab's original 1000ms combo rule.
 * A fuse strictly under a second after the last one pays ×1.2. Juice only here:
 * the pay curve is unchanged from main.
 */
export const STREAK_WINDOW_MS = 1000;

/** The lab's fixed combo pay: ×1.2 in thousandths. */
export const COMBO_THOUSANDTHS = 1200;

/** Same rest-above-the-line fail the well already used. */
export const DANGER_HOLD_MS = 1500;

/**
 * Rested back over the line at least this long, then escaped.
 * Long enough that a bounce is not a save. Still under the fail.
 */
export const CLUTCH_MS = 640;

/** Inside the fail, with a few tenths of air left. Juice only — the fail stays 1500. */
export const FILO_MS = 1080;

/** One clutch shout per dump of pieces. A later, separate save can still speak. */
export const CLUTCH_COOLDOWN_MS = 900;

export type LabImpact = 'none' | 'soft' | 'hard';
export type ClutchBand = 'none' | 'salvado' | 'filo';
export type LabVoice = { banner: string; whisper: string };
export type LabWash = { color: number; alpha: number; ms: number };

export function nextCombo(prev: number, withinWindow: boolean): number {
  return withinWindow ? prev + 1 : 1;
}

/** 3, 5, 8, 12, then every fifth after that. */
export function isStreakMilestone(combo: number): boolean {
  return combo === 3 || combo === 5 || combo === 8 || combo === 12 || (combo > 12 && combo % 5 === 0);
}

/** The second fuse is where a chain starts. Milestones take over from three. */
export function isChainOpen(combo: number): boolean {
  return combo === 2;
}

/**
 * First fuse is flat. Any chained fuse pays the lab's fixed ×1.2 — no ramp.
 * Thousandths so the multiplier does not drift.
 */
export function streakThousandths(combo: number): number {
  return combo <= 1 ? 1000 : COMBO_THOUSANDTHS;
}

/** Chain holds while the next fuse lands strictly inside the window (old `< 1000`). */
export function withinStreak(lastMs: number | null, nowMs: number): boolean {
  return lastMs != null && nowMs - lastMs < STREAK_WINDOW_MS;
}

export function streakMultiplier(combo: number): number {
  return streakThousandths(combo) / 1000;
}

/** Same base the lab already paid: tier² × 10, then ×1.2 on a chained fuse. */
export function mergeScore(tier: number, combo: number): number {
  const base = tier * tier * 10;
  return Math.round((base * streakThousandths(combo)) / 1000);
}

/** A11+A11 pop: the tier-11 merge, paid twice. */
export function popScore(combo: number): number {
  return mergeScore(11, combo) * 2;
}

export function clutchBand(heldMs: number): ClutchBand {
  if (heldMs < CLUTCH_MS) return 'none';
  if (heldMs >= FILO_MS) return 'filo';
  return 'salvado';
}

export function clutchRank(band: ClutchBand): number {
  if (band === 'filo') return 2;
  if (band === 'salvado') return 1;
  return 0;
}

export function streakBanner(combo: number): string | null {
  if (!isStreakMilestone(combo)) return null;
  if (combo >= 12) return '¡MESA!';
  if (combo >= 8) return '¡TORRE!';
  if (combo === 5) return '¡RACHA!';
  return '¡CADENA!';
}

export function streakWhisper(combo: number): string | null {
  if (!isStreakMilestone(combo)) return null;
  if (combo >= 12) return 'la mesa es tuya';
  if (combo >= 8) return 'la pila no para';
  if (combo === 5) return 'cinco en la mesa';
  return 'sigue el ritmo';
}

export function chainBanner(): string {
  return '¡FUNDE!';
}

export function chainWhisper(): string {
  return 'dos al hilo';
}

export function popBanner(fresh: boolean): string {
  return fresh ? '¡MESA LIMPIA!' : '¡POP!';
}

export function popWhisper(): string {
  return 'se fueron las dos';
}

export function filoBanner(): string {
  return '¡AL FILO!';
}

export function filoWhisper(): string {
  return 'por un pelo';
}

export function saveBanner(): string {
  return '¡SALVADO!';
}

export function saveWhisper(): string {
  return 'bajó de la línea';
}

/** First A6, A7, A8, A9, A10, or A11 of a run. Names for the two landmarks, numbers for the rest. */
export function tierCeremony(tier: number): LabVoice | null {
  if (tier === 6) return { banner: '¡BRÓCOLI!', whisper: 'verde de verdad' };
  if (tier === 7) return { banner: '¡A7!', whisper: 'ya se ve de lejos' };
  if (tier === 8) return { banner: '¡A8!', whisper: 'pesa en la mesa' };
  if (tier === 9) return { banner: '¡CALABAZA!', whisper: 'naranja y ancha' };
  if (tier === 10) return { banner: '¡A10!', whisper: 'casi el techo' };
  if (tier === 11) return { banner: '¡A11!', whisper: 'arriba del todo' };
  return null;
}

export function isTierCeremony(tier: number): boolean {
  return tierCeremony(tier) !== null;
}

export function clutchVoice(band: ClutchBand): LabVoice | null {
  if (band === 'filo') return { banner: filoBanner(), whisper: filoWhisper() };
  if (band === 'salvado') return { banner: saveBanner(), whisper: saveWhisper() };
  return null;
}

/**
 * Ceremony and the pop take the banner. A live streak still supplies the whisper.
 * A hair-from-fail save speaks under them, and speaks alone when the fuse is quiet.
 */
export function mergeVoice(opts: {
  tier: number;
  pop: boolean;
  popFresh: boolean;
  combo: number;
  tierFresh: boolean;
  clutch: ClutchBand;
}): LabVoice | null {
  const streakLine = isChainOpen(opts.combo) ? chainBanner() : streakBanner(opts.combo);
  const streakLineWhisper = isChainOpen(opts.combo) ? chainWhisper() : streakWhisper(opts.combo);
  const under = opts.clutch === 'filo' ? filoWhisper() : streakLineWhisper;

  if (opts.pop) {
    return { banner: popBanner(opts.popFresh), whisper: under ?? popWhisper() };
  }

  const ceremony = opts.tierFresh ? tierCeremony(opts.tier) : null;
  if (ceremony) {
    return { banner: ceremony.banner, whisper: under ?? ceremony.whisper };
  }
  if (streakLine && streakLineWhisper) {
    return { banner: streakLine, whisper: under ?? streakLineWhisper };
  }
  return clutchVoice(opts.clutch);
}

export function voiceColor(banner: string): string {
  if (banner === '¡FUNDE!' || banner === '¡CADENA!') return '#FF8BD1';
  if (banner === '¡RACHA!' || banner === '¡TORRE!') return '#E8FF47';
  if (banner === '¡MESA!' || banner === '¡MESA LIMPIA!') return '#FFD36A';
  if (banner === '¡BRÓCOLI!' || banner === '¡SALVADO!') return '#7CFFB2';
  if (banner === '¡CALABAZA!') return '#FF7A2E';
  if (banner === '¡A11!' || banner === '¡POP!') return '#F4F1EA';
  if (banner === '¡A10!' || banner === '¡A8!') return '#FFD36A';
  if (banner === '¡A7!') return '#F5D547';
  if (banner === '¡AL FILO!') return '#FF7A45';
  return '#E8FF47';
}

export function pointsStyle(pop: boolean, combo: number): { color: string; size: string } {
  if (pop) return { color: '#F4F1EA', size: '20px' };
  if (combo >= 2) return { color: '#E8FF47', size: '18px' };
  return { color: '#E8FF47', size: '16px' };
}

/** Sparks. Climbs with the veggie you just made, and a chain stays hot. Cap 12. */
export function mergeBurstCount(tier: number, pop: boolean, combo: number): number {
  if (pop) return 12;
  const t = Math.max(1, Math.min(11, Math.round(tier)));
  const climbed = Math.min(12, 8 + Math.floor((t - 1) / 2));
  if (combo >= 2) return Math.max(climbed, 11);
  return Math.min(climbed, 10);
}

/** Extra cream sparks so a tall fuse reads hotter than a pea. */
export function mergeAccentCount(tier: number, pop: boolean): number {
  if (pop || tier >= 11) return 6;
  if (tier >= 9) return 4;
  if (tier >= 6) return 3;
  return 0;
}

export function mergeRing(
  tier: number,
  pop: boolean,
  combo: number,
): { start: number; scale: number } | null {
  if (pop) return { start: 16, scale: 2.8 };
  if (tier >= 9 || combo >= 8) return { start: 12, scale: 2.4 };
  if (tier >= 6 || combo >= 3) return { start: 10, scale: 2.1 };
  return null;
}

/** Tall tiers and a long chain punch like the old pop. A lone pea stays on the old soft tick. */
export function mergeImpact(tier: number, pop: boolean, combo: number): LabImpact {
  if (pop || tier >= 11 || combo >= 8) return 'hard';
  if (tier >= 7 || combo >= 2) return 'soft';
  return 'none';
}

export function impactShake(impact: LabImpact): { ms: number; intensity: number } {
  if (impact === 'hard') return { ms: 90, intensity: 0.006 };
  if (impact === 'soft') return { ms: 70, intensity: 0.0045 };
  return { ms: 46, intensity: 0.003 };
}

/** Same three hit-stops the lab already used: 28, 46, 72. */
export function impactFreeze(impact: LabImpact): number {
  if (impact === 'hard') return 72;
  if (impact === 'soft') return 46;
  return 28;
}

export function contactSquash(floor: boolean): { sx: number; sy: number; ms: number } {
  if (floor) return { sx: 1.12, sy: 0.84, ms: 150 };
  return { sx: 1.16, sy: 0.82, ms: 150 };
}

export function dropSquash(): { sx: number; sy: number; ms: number } {
  return { sx: 1.16, sy: 0.76, ms: 180 };
}

/** Wash is a ceremony: the pop, a first landmark, a long chain, or a hair-from-fail. */
export function momentWash(opts: {
  tier: number;
  pop: boolean;
  combo: number;
  tierFresh: boolean;
  clutch: ClutchBand;
}): LabWash | null {
  if (opts.pop) return { color: 0xf4f1ea, alpha: 0.16, ms: 200 };
  if (opts.tierFresh && opts.tier === 11) return { color: 0xf4f1ea, alpha: 0.18, ms: 220 };
  if (opts.tierFresh && opts.tier === 9) return { color: 0xff7a2e, alpha: 0.16, ms: 200 };
  if (opts.tierFresh && opts.tier === 6) return { color: 0x7cffb2, alpha: 0.14, ms: 180 };
  if (isStreakMilestone(opts.combo) && opts.combo >= 12) return { color: 0xffd36a, alpha: 0.14, ms: 200 };
  if (opts.combo === 8) return { color: 0xe8ff47, alpha: 0.12, ms: 180 };
  if (opts.clutch === 'filo') return { color: 0xff3b4a, alpha: 0.12, ms: 160 };
  return null;
}

/* ---------- Banner placement (mobile portrait) ---------- */

export const BANNER_SIZE_PX = 22;
export const WHISPER_SIZE_PX = 13;
/** Banner sits this far above its whisper. */
export const BANNER_GAP_PX = 22;
export const BANNER_LIFT_PX = 28;
export const WHISPER_LIFT_PX = 18;
/** floatLabel tweens scale up to 1.08; stroke adds a few px each side. */
const TWEEN_SCALE = 1.08;
const STROKE_PX = 5;
/** Generous per-glyph width for the bold UI font (caps + ¡!). */
const GLYPH_W = 0.66;
/** Breathing room from the walls. */
export const BANNER_WALL_PAD_PX = 6;
/**
 * Highest any part of the banner stack may reach (incl. its lift and scale).
 * Below the danger line with a margin, so it never covers the drop zone,
 * the preview, or the line itself.
 */
export const BANNER_TOP_MIN_Y = DANGER_Y + 10;
/** Lowest the whisper may sit (its bottom stays above the floor). */
export const BANNER_BOTTOM_MAX_Y = FLOOR_Y - 8;

/** Worst-case rendered width (px) of a floating label at the end of its tween. */
export function labelWidth(text: string, sizePx: number): number {
  const chars = Array.from(text).length;
  return Math.ceil(chars * sizePx * GLYPH_W * TWEEN_SCALE + STROKE_PX * 2);
}

function labelHalfHeight(sizePx: number): number {
  return Math.ceil((sizePx * 1.25 * TWEEN_SCALE) / 2 + STROKE_PX);
}

/** Keep a label of this width fully inside the well. */
export function clampLabelX(x: number, width: number): number {
  const lo = INNER_L + BANNER_WALL_PAD_PX + width / 2;
  const hi = INNER_R - BANNER_WALL_PAD_PX - width / 2;
  if (lo > hi) return (INNER_L + INNER_R) / 2;
  return Math.min(hi, Math.max(lo, x));
}

/** Smallest whisper y that keeps the risen banner's top below BANNER_TOP_MIN_Y. */
export function bannerMinWhisperY(): number {
  return BANNER_TOP_MIN_Y + BANNER_LIFT_PX + BANNER_GAP_PX + labelHalfHeight(BANNER_SIZE_PX);
}

/** Largest whisper y that keeps the whisper above the floor. */
export function bannerMaxWhisperY(): number {
  return BANNER_BOTTOM_MAX_Y - labelHalfHeight(WHISPER_SIZE_PX);
}

export type BannerLayout = { x: number; bannerY: number; whisperY: number };

/**
 * Where a banner + whisper stack is drawn, given the wanted whisper anchor.
 * x: clamped so the wider of the two lines stays inside the well.
 * y: pushed below the danger line (never over the drop/preview band), kept above the floor.
 */
export function bannerLayout(x: number, y: number, voice: LabVoice): BannerLayout {
  const w = Math.max(labelWidth(voice.banner, BANNER_SIZE_PX), labelWidth(voice.whisper, WHISPER_SIZE_PX));
  const cx = clampLabelX(x, w);
  const wy = Math.min(bannerMaxWhisperY(), Math.max(bannerMinWhisperY(), y));
  return { x: cx, bannerY: wy - BANNER_GAP_PX, whisperY: wy };
}
