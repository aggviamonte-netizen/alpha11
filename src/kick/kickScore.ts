import { readNum, writeNum } from '../game/persist';

export const KICK_BEST_KEY = 'alpha11_kick_best';

export function loadKickBest(): number {
  return readNum(KICK_BEST_KEY);
}

export function saveKickBest(score: number): void {
  if (score > readNum(KICK_BEST_KEY)) writeNum(KICK_BEST_KEY, score);
}

/** True only when this run's streak beats the best captured before any write. */
export function isNewKickRecord(score: number, prevBest: number): boolean {
  return score > 0 && score > prevBest;
}
