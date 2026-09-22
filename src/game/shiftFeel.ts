/** Slide stays inside the snappy band. Hit-pause is only the freeze before the tiles move. */
export const SLIDE_MS = 118;
export const HIT_PAUSE_MS = 20;

export type MergeImpact = 'none' | 'soft' | 'hard';

export function nextMergeStreak(prev: number, merges: number): number {
  if (merges > 0) return prev + 1;
  return 0;
}

/** Consecutive merging moves: 3, 5, 8, 12, then every fifth after that. */
export function isMergeStreak(streak: number): boolean {
  return streak === 3 || streak === 5 || streak === 8 || streak === 12 || (streak > 12 && streak % 5 === 0);
}

export function comboBanner(merges: number): string | null {
  if (merges >= 4) return '¡QUÉ CADENA!';
  if (merges === 3) return '¡TRIPLE!';
  if (merges === 2) return 'DOBLE';
  return null;
}

export function comboWhisper(merges: number): string | null {
  if (merges >= 4) return 'el tablero cede';
  if (merges === 3) return 'tres de golpe';
  if (merges === 2) return 'de una';
  return null;
}

export function streakBanner(streak: number): string | null {
  if (streak >= 12 && isMergeStreak(streak)) return '¡IMPARABLE!';
  if (streak >= 8 && isMergeStreak(streak)) return '¡QUÉ RACHA!';
  if (streak === 5) return 'RACHA 5';
  if (streak === 3) return 'RACHA 3';
  return null;
}

export function streakWhisper(streak: number): string | null {
  if (streak >= 12 && isMergeStreak(streak)) return 'no se detiene';
  if (streak >= 8 && isMergeStreak(streak)) return 'sigue subiendo';
  if (streak === 5) return 'cinco al hilo';
  if (streak === 3) return 'tres seguidos';
  return null;
}

export type TierCeremony = {
  label: string;
  wash: number;
  alpha: number;
};

/** First time a run reaches T7, T9, or T11. Names match the tessera cast. */
export function tierCeremony(tier: number): TierCeremony | null {
  if (tier === 7) return { label: 'T7 · FLECHA', wash: 0x7cffb2, alpha: 0.16 };
  if (tier === 9) return { label: 'T9 · NODO', wash: 0x4ad4ff, alpha: 0.18 };
  if (tier === 11) return { label: 'T11 · NÚCLEO', wash: 0xf4f1ea, alpha: 0.2 };
  return null;
}

/** Primary sparks. Climbs with tier and stays inside burstDots' cap of 12. */
export function mergeBurstCount(tier: number): number {
  const t = Math.max(1, Math.min(11, Math.round(tier)));
  return Math.min(12, 8 + Math.floor((t - 1) / 2));
}

/** Extra paper sparks so T7+ reads denser than a low merge. */
export function mergeAccentCount(tier: number): number {
  if (tier >= 11) return 8;
  if (tier >= 9) return 6;
  if (tier >= 8) return 5;
  if (tier >= 7) return 3;
  return 0;
}

export function mergePunchScale(tier: number): number {
  const t = Math.max(1, Math.min(11, Math.round(tier)));
  if (t >= 11) return 1.36;
  if (t >= 9) return 1.3;
  if (t >= 7) return 1.24;
  if (t >= 4) return 1.18;
  return 1.14;
}

/** Multi-merge and T8+ earn a shake. Triples and T11 punch harder. */
export function mergeImpact(maxTier: number, merges: number): MergeImpact {
  if (merges >= 3 || maxTier >= 11) return 'hard';
  if (merges > 1 || maxTier >= 8) return 'soft';
  return 'none';
}

export function impactShake(impact: MergeImpact): { ms: number; intensity: number } | null {
  if (impact === 'hard') return { ms: 140, intensity: 0.01 };
  if (impact === 'soft') return { ms: 100, intensity: 0.0055 };
  return null;
}

export function impactZoom(impact: MergeImpact): number {
  if (impact === 'hard') return 1.028;
  if (impact === 'soft') return 1.016;
  return 1;
}
