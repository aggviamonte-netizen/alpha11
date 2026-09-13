import { readNum, writeNum } from './persist';

export const SHIFT_SCORE_KEY = 'alpha11_shift_score';
export const SHIFT_BEST_KEY = 'alpha11_shift_best';

export function loadShiftBest(): number {
  return readNum(SHIFT_BEST_KEY);
}

export function loadShiftScore(): number {
  return readNum(SHIFT_SCORE_KEY);
}

export function saveShiftScore(score: number): void {
  writeNum(SHIFT_SCORE_KEY, score);
  if (score > readNum(SHIFT_BEST_KEY)) writeNum(SHIFT_BEST_KEY, score);
}

export function resetShiftScore(): void {
  writeNum(SHIFT_SCORE_KEY, 0);
}

export function shiftMergePoints(tier: number): number {
  return tier * tier * 10;
}
