import { readNum, writeNum } from '../game/persist';

export const SNIPER_BEST_KEY = 'alpha11_sniper_best';

export function loadSniperBest(): number {
  return readNum(SNIPER_BEST_KEY);
}

export function saveSniperBest(score: number): void {
  if (score > readNum(SNIPER_BEST_KEY)) writeNum(SNIPER_BEST_KEY, score);
}
