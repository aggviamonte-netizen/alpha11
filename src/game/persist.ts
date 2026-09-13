export function readNum(key: string): number {
  const n = Number(localStorage.getItem(key) ?? '0');
  return Number.isFinite(n) ? n : 0;
}

export function writeNum(key: string, n: number): void {
  localStorage.setItem(key, String(n));
}
