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

/** Points for a merge that produces tier N. Combo ×1.2 if last merge was <1s. */
export function mergePoints(tier: number, combo: boolean): number {
  const base = tier * tier * 10;
  return Math.round(base * (combo ? 1.2 : 1));
}

/** A11+A11 pop: merge formula plus the same amount again as bonus. */
export function popPoints(combo: boolean): number {
  return mergePoints(11, combo) * 2;
}
