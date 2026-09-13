import { readNum, writeNum } from './persist';

export const RUSH_BEST_KEY = 'alpha11_rush_best';

export function loadRushBest(): number {
  return readNum(RUSH_BEST_KEY);
}

export function saveRushBest(score: number): void {
  if (score > readNum(RUSH_BEST_KEY)) writeNum(RUSH_BEST_KEY, score);
}
