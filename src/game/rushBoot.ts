import { startRushGame } from './rush/game';

export function startRush(parent: string | HTMLElement): ReturnType<typeof startRushGame> {
  return startRushGame(parent);
}
