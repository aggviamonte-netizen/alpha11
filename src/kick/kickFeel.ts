/** Sweet band on the oscillating power meter — timing skill, not auto-aim. */
export const SWEET_MIN = 0.54;
export const SWEET_MAX = 0.86;
export const SWEET_CENTER = 0.7;

export function isSweetPower(power: number): boolean {
  return power > SWEET_MIN && power < SWEET_MAX;
}

/** Pixels of aim noise. Tight in the green, sloppy when the kick is rushed or weak. */
export function shotScatter(power: number): number {
  if (isSweetPower(power)) {
    const span = Math.max(0.01, SWEET_MAX - SWEET_CENTER);
    const dist = Math.abs(power - SWEET_CENTER) / span;
    return 2 + dist * 4;
  }
  if (power >= SWEET_MAX) return 6 + (power - SWEET_MAX) * 20;
  return 12 + (SWEET_MIN - power) * 26;
}

/** Overkick lifts the ball (posts); underkick dumps it (easy save / grass). */
export function shotHeightBias(power: number): number {
  if (power > SWEET_MAX) return (power - SWEET_MAX) * 0.55;
  if (power < SWEET_MIN) return -(SWEET_MIN - power) * 0.22;
  return 0;
}

export function isStreakMilestone(score: number): boolean {
  return score === 3 || score === 5 || score === 8 || score === 12 || (score > 12 && score % 5 === 0);
}

export function goalBanner(score: number): string {
  if (score >= 12) return '¡IMPARABLE!';
  if (score >= 8) return '¡QUÉ RACHA!';
  if (score === 5) return 'RACHA 5';
  if (score === 3) return 'RACHA 3';
  return '¡GOL!';
}

export function streakWhisper(score: number): string {
  if (score >= 12) return 'no la piensa';
  if (score >= 8) return 'el portero ya duda';
  if (score === 5) return 'cinco al hilo';
  if (score === 3) return 'tres seguidos';
  return 'sigue';
}
