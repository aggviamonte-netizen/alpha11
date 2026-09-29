/** Slide stays inside the snappy band. Hit-pause is only the freeze before the tiles move. */
export const SLIDE_MS = 118;
export const HIT_PAUSE_MS = 20;

/** Same punch sizes the other titles float over play. */
export const BANNER_SIZE_PX = 22;
export const WHISPER_SIZE_PX = 13;
export const BANNER_LIFT_PX = 28;
export const WHISPER_LIFT_PX = 18;

export type MergeImpact = 'none' | 'soft' | 'hard';

/** One hole left, or a full board that can still merge. A dead board stays quiet. */
export type BoardBand = 'none' | 'aprieta' | 'cierre';

export type ShiftVoice = { banner: string; whisper: string };

export type TierCeremony = {
  banner: string;
  whisper: string;
  wash: number;
  alpha: number;
};

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
  if (merges === 2) return '¡DOBLE!';
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
  if (streak === 5) return '¡RACHA!';
  if (streak === 3) return '¡TRES!';
  return null;
}

export function streakWhisper(streak: number): string | null {
  if (streak >= 12 && isMergeStreak(streak)) return 'no se detiene';
  if (streak >= 8 && isMergeStreak(streak)) return 'sigue subiendo';
  if (streak === 5) return 'cinco al hilo';
  if (streak === 3) return 'tres seguidos';
  return null;
}

/** First time a run reaches T7, T9, or T11. Shouts are the tessera cast. */
export function tierCeremony(tier: number): TierCeremony | null {
  if (tier === 7) return { banner: '¡FLECHA!', whisper: 'verde y recta', wash: 0x7cffb2, alpha: 0.16 };
  if (tier === 9) return { banner: '¡NODO!', whisper: 'ya se conecta', wash: 0x4ad4ff, alpha: 0.18 };
  if (tier === 11) return { banner: '¡NÚCLEO!', whisper: 'blanco en el centro', wash: 0xf4f1ea, alpha: 0.2 };
  return null;
}

/** 0 free cells but a merge remains, or a single hole left. */
export function boardBand(empty: number, canMove: boolean): BoardBand {
  if (!canMove) return 'none';
  if (empty <= 0) return 'cierre';
  if (empty === 1) return 'aprieta';
  return 'none';
}

/** Speak when the board newly tightens. Staying there does not repeat. */
export function pressureEntered(prev: BoardBand, next: BoardBand): boolean {
  return next !== 'none' && next !== prev;
}

export function pressureBanner(band: BoardBand): string | null {
  if (band === 'cierre') return '¡CIERRE!';
  if (band === 'aprieta') return '¡HUECO!';
  return null;
}

export function pressureWhisper(band: BoardBand): string | null {
  if (band === 'cierre') return 'sin hueco';
  if (band === 'aprieta') return 'queda una';
  return null;
}

/**
 * Ceremony takes the banner. A multi-merge outranks a streak.
 * A live streak still supplies the whisper. Pressure speaks alone
 * when the slide is quiet, and a fresh full board can underwrite a combo.
 */
export function slideVoice(opts: {
  merges: number;
  streak: number;
  tier: number;
  tierFresh: boolean;
  pressure: BoardBand;
}): ShiftVoice | null {
  const ceremony = opts.tierFresh ? tierCeremony(opts.tier) : null;
  const combo = comboBanner(opts.merges);
  const comboLine = comboWhisper(opts.merges);
  const streakLine = streakBanner(opts.streak);
  const streakUnder = streakWhisper(opts.streak);
  const pressureLine = pressureBanner(opts.pressure);
  const pressureUnder = pressureWhisper(opts.pressure);

  if (ceremony) {
    return { banner: ceremony.banner, whisper: streakUnder ?? comboLine ?? ceremony.whisper };
  }
  if (combo && comboLine) {
    const whisper = streakUnder ?? (opts.pressure === 'cierre' ? pressureUnder : null) ?? comboLine;
    return { banner: combo, whisper };
  }
  if (streakLine && streakUnder) {
    return {
      banner: streakLine,
      whisper: opts.pressure === 'cierre' ? (pressureUnder ?? streakUnder) : streakUnder,
    };
  }
  if (pressureLine && pressureUnder) return { banner: pressureLine, whisper: pressureUnder };
  return null;
}

export function voiceColor(banner: string): string {
  if (banner === '¡DOBLE!' || banner === '¡TRIPLE!' || banner === '¡TRES!') return '#FF8BD1';
  if (banner === '¡RACHA!' || banner === '¡QUÉ RACHA!' || banner === '¡QUÉ CADENA!') return '#E8FF47';
  if (banner === '¡IMPARABLE!' || banner === '¡NÚCLEO!') return '#F4F1EA';
  if (banner === '¡FLECHA!') return '#7CFFB2';
  if (banner === '¡NODO!' || banner === '¡HUECO!') return '#4AD4FF';
  if (banner === '¡CIERRE!') return '#FF7A45';
  return '#E8FF47';
}

/** Banner stack in the gap above the board so the top row stays readable. */
export function voiceStack(boardTop: number): { bannerY: number; whisperY: number } {
  const whisperY = boardTop - 14;
  const bannerY = whisperY - 26;
  return { bannerY, whisperY };
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

/** Multi-merge and T8+ earn a shake. A fresh lock punches too. Triples and T11 hit harder. */
export function mergeImpact(maxTier: number, merges: number, pressure: BoardBand = 'none'): MergeImpact {
  if (pressure === 'cierre' || merges >= 3 || maxTier >= 11) return 'hard';
  if (pressure === 'aprieta' || merges > 1 || maxTier >= 8) return 'soft';
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
