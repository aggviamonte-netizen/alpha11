export type Tier = 0 | 1 | 2;

export class Quality {
  tier: Tier = 2;
  private samples: number[] = [];
  private cool = 0;
  private listeners: Array<(tier: Tier) => void> = [];

  onChange(fn: (tier: Tier) => void): void {
    this.listeners.push(fn);
  }

  get dpr(): number {
    const cap = this.tier === 2 ? 1.75 : this.tier === 1 ? 1.25 : 1;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  get shadows(): boolean {
    return this.tier >= 2;
  }

  get glows(): boolean {
    return this.tier >= 1;
  }

  get particles(): number {
    return this.tier === 2 ? 1 : this.tier === 1 ? 0.55 : 0.28;
  }

  get city(): number {
    return this.tier === 2 ? 1 : this.tier === 1 ? 0.65 : 0.4;
  }

  tick(dt: number): void {
    this.cool = Math.max(0, this.cool - dt);
    const ms = dt * 1000;
    if (ms > 80) return;
    this.samples.push(ms);
    if (this.samples.length < 45) return;
    if (this.samples.length > 90) this.samples.shift();
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    if (this.cool > 0) return;
    if (avg > 36 && this.tier > 0) this.set((this.tier - 1) as Tier);
    else if (avg < 17 && this.tier < 2) this.set((this.tier + 1) as Tier);
  }

  private set(tier: Tier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.samples.length = 0;
    this.cool = 2.4;
    for (const fn of this.listeners) fn(tier);
  }
}
