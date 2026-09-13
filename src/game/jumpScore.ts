import { readNum, writeNum } from './persist';

export const JUMP_BEST_KEY = 'alpha11_jump_best';

export function loadJumpBest(): number {
  return readNum(JUMP_BEST_KEY);
}

export function saveJumpBest(score: number): void {
  if (score > readNum(JUMP_BEST_KEY)) writeNum(JUMP_BEST_KEY, score);
}
