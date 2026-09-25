import { mergeScore, popScore } from './labFeel';

export const SCORE_KEY = 'alpha11_lab_score';
export const BEST_KEY = 'alpha11_lab_best';

function read(key: string): number {
  const n = Number(localStorage.getItem(key) ?? '0');
  return Number.isFinite(n) ? n : 0;
}

export function loadBest(): number {
  return read(BEST_KEY);
}

export function loadScore(): number {
  return read(SCORE_KEY);
}

export function saveScore(score: number): void {
  localStorage.setItem(SCORE_KEY, String(score));
  if (score > read(BEST_KEY)) localStorage.setItem(BEST_KEY, String(score));
}

export function resetScore(): void {
  localStorage.setItem(SCORE_KEY, '0');
}

/**
 * Points for a merge that produces tier N: tier² × 10.
 * Combo ×1.2 (fixed) when the last merge was <1s ago (combo >= 2).
 */
export function mergePoints(tier: number, combo: number): number {
  return mergeScore(tier, combo);
}

/** A11+A11 pop: the tier-11 merge, paid twice. */
export function popPoints(combo: number): number {
  return popScore(combo);
}
