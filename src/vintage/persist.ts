export function loadBest(key: string): number {
  const n = Number(localStorage.getItem(key) ?? '0');
  return Number.isFinite(n) ? n : 0;
}

export function saveBest(key: string, value: number): number {
  const best = Math.max(loadBest(key), value);
  localStorage.setItem(key, String(best));
  return best;
}
