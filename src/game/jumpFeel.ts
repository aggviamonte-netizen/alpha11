/** Drag follow. Higher closes the finger gap faster without snapping. */
export const STEER_RATE = 22;

/** Hold-to-fire interval. Short enough to track, long enough to read each bolt. */
export const FIRE_MS = 96;

/** Opening invulnerability. Long enough to find a lane, not a free ram. */
export const GRACE_MS = 640;

/**
 * Combo resets if the next kill lands after this.
 * Just over the opening wave gap (~1.4s) so holding the lane keeps the beat.
 * Letting a rock through (~2.8s) breaks it.
 */
export const COMBO_WINDOW_MS = 1640;

/**
 * Kills do not freeze the craft. Camera punch only, so drag+fire stays 1:1.
 * Death no longer parks the play loop on a hit-stop either.
 */
export const KILL_FREEZE_MS = 0;

/** Horizontal band where a shot may kiss a foe you are already on. Not a magnet. */
export const ASSIST_RANGE = 18;
/** Hard cap. A full miss outside the lane is never collected. */
export const ASSIST_MAX = 4;

/** Surface gap that still counts as a graze (px). Overlap is a hit, not a graze. */
export const GRAZE_PX = 11;
export const GRAZE_COOLDOWN_MS = 1100;

export type JumpFoe = 'rock' | 'big' | 'drone' | 'elite';
export type JumpImpact = 'none' | 'soft' | 'hard';

export type JumpWash = { color: number; alpha: number };

export function nextCombo(prev: number, withinWindow: boolean): number {
  return withinWindow ? prev + 1 : 1;
}

/** 3, 5, 8, 12, then every fifth after that. */
export function isComboMilestone(combo: number): boolean {
  return combo === 3 || combo === 5 || combo === 8 || combo === 12 || (combo > 12 && combo % 5 === 0);
}

export function comboBanner(combo: number): string | null {
  if (!isComboMilestone(combo)) return null;
  if (combo >= 12) return '¡ÓRBITA!';
  if (combo >= 8) return '¡LIMPIO!';
  if (combo === 5) return '¡RACHA!';
  return '¡PULSO!';
}

export function comboWhisper(combo: number): string | null {
  if (!isComboMilestone(combo)) return null;
  if (combo >= 12) return 'el carril es tuyo';
  if (combo >= 8) return 'ni un roce';
  if (combo === 5) return 'sigue el ritmo';
  return 'tres al pulso';
}

export function foePoints(kind: JumpFoe): number {
  if (kind === 'rock') return 8;
  if (kind === 'big') return 16;
  if (kind === 'drone') return 18;
  return 32;
}

export function scoreKill(kind: JumpFoe, combo: number): number {
  const bonus = Math.min(12, Math.max(0, combo - 1) * 3);
  return foePoints(kind) + bonus;
}

/** Elite ceremony wins the banner. A live streak still supplies the whisper. */
export function killVoice(kind: JumpFoe, combo: number): { banner: string; whisper: string } | null {
  const streak = comboWhisper(combo);
  if (kind === 'elite') return { banner: '¡CAZA!', whisper: streak ?? 'el grande cae' };
  const banner = comboBanner(combo);
  if (!banner || !streak) return null;
  return { banner, whisper: streak };
}

export function nearMissBanner(): string {
  return '¡RASANTE!';
}

export function nearMissWhisper(): string {
  return 'un pelo';
}

export function graceSaveBanner(): string {
  return '¡SALVO!';
}

export function graceSaveWhisper(): string {
  return 'el pulso aguanta';
}

/** Sparks. Rock < big < drone < elite, inside burstDots' cap of 12. */
export function killBurstCount(kind: JumpFoe): number {
  if (kind === 'elite') return 12;
  if (kind === 'drone') return 10;
  if (kind === 'big') return 8;
  return 6;
}

/** Extra hull sparks so drones and elites read hotter than rock. */
export function killAccentCount(kind: JumpFoe): number {
  if (kind === 'elite') return 6;
  if (kind === 'drone') return 3;
  return 0;
}

export function killColor(kind: JumpFoe): number {
  if (kind === 'elite') return 0xff7a45;
  if (kind === 'drone') return 0x6ee7ff;
  if (kind === 'big') return 0xc5d0dc;
  return 0x8a93a0;
}

/** Camera punch on multi-kills and elite downs. A lone rock stays quiet. */
export function killImpact(kind: JumpFoe, combo: number): JumpImpact {
  if (kind === 'elite' || combo >= 8) return 'hard';
  if (combo >= 3) return 'soft';
  return 'none';
}

export function impactShake(impact: JumpImpact): { ms: number; intensity: number } | null {
  if (impact === 'hard') return { ms: 120, intensity: 0.0075 };
  if (impact === 'soft') return { ms: 80, intensity: 0.004 };
  return null;
}

export function impactZoom(impact: JumpImpact): number {
  if (impact === 'hard') return 1.02;
  if (impact === 'soft') return 1.011;
  return 1;
}

/** Wash is rare: the first elite of a run, or a long clean streak. */
export function momentWash(kind: JumpFoe, combo: number, firstElite: boolean): JumpWash | null {
  if (kind === 'elite' && firstElite) return { color: 0xff7a45, alpha: 0.16 };
  if (isComboMilestone(combo) && combo >= 12) return { color: 0xe8ff47, alpha: 0.13 };
  if (combo === 8) return { color: 0x6ee7ff, alpha: 0.11 };
  return null;
}

/** Muzzle squash. Small, so the hull stays readable between shots on a phone. */
export function shotSquash(): { sx: number; sy: number; ms: number } {
  return { sx: 0.93, sy: 1.07, ms: 64 };
}

export function eliteEntrance(): { from: number; ms: number } {
  return { from: 0.4, ms: 170 };
}

export function surfaceGap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy) - (ar + br);
}

export function isNearMiss(gap: number): boolean {
  return gap >= 0 && gap <= GRAZE_PX;
}

/**
 * Pixels to slide the center bolt toward a foe already in the lane.
 * Zero when centered or when the foe sits outside ASSIST_RANGE.
 */
export function aimNudge(craftX: number, foeX: number): number {
  const dx = foeX - craftX;
  const adx = Math.abs(dx);
  if (adx === 0 || adx > ASSIST_RANGE) return 0;
  const pull = Math.min(ASSIST_MAX, adx * 0.25);
  return Math.sign(dx) * pull;
}
