export type Creature = {
  tier: number;
  code: string;
  name: string;
  emoji: string;
  color: number;
  hex: string;
  unitR: number;
};

/** Pixels per canon radius unit (A1 0.50 → 19px, A11 2.48 → 94px). */
export const UNIT = 38;

export const CREATURES: Creature[] = [
  { tier: 1, code: 'A1', name: 'Spore', emoji: '🫧', color: 0x7cffb2, hex: '#7CFFB2', unitR: 0.5 },
  { tier: 2, code: 'A2', name: 'Mite', emoji: '🪲', color: 0xb4ff5a, hex: '#B4FF5A', unitR: 0.62 },
  { tier: 3, code: 'A3', name: 'Glim', emoji: '✨', color: 0xe8ff47, hex: '#E8FF47', unitR: 0.74 },
  { tier: 4, code: 'A4', name: 'Cub', emoji: '🐥', color: 0xffe566, hex: '#FFE566', unitR: 0.88 },
  { tier: 5, code: 'A5', name: 'Pulse', emoji: '💗', color: 0xff8bd1, hex: '#FF8BD1', unitR: 1.04 },
  { tier: 6, code: 'A6', name: 'Coil', emoji: '🌀', color: 0x8b9bff, hex: '#8B9BFF', unitR: 1.22 },
  { tier: 7, code: 'A7', name: 'Vault', emoji: '🧿', color: 0x6ee7ff, hex: '#6EE7FF', unitR: 1.42 },
  { tier: 8, code: 'A8', name: 'Forge', emoji: '🔥', color: 0xff7a45, hex: '#FF7A45', unitR: 1.64 },
  { tier: 9, code: 'A9', name: 'Crown', emoji: '👑', color: 0xffd166, hex: '#FFD166', unitR: 1.88 },
  { tier: 10, code: 'A10', name: 'Titan', emoji: '🗿', color: 0xc4b5fd, hex: '#C4B5FD', unitR: 2.16 },
  { tier: 11, code: 'A11', name: 'Alpha', emoji: '🧬', color: 0xf4f1ea, hex: '#F4F1EA', unitR: 2.48 },
];

export function creature(tier: number): Creature {
  return CREATURES[Math.max(1, Math.min(11, tier)) - 1];
}

export function radiusPx(tier: number): number {
  return creature(tier).unitR * UNIT;
}

/** Drops only A1–A5, weighted toward smaller lab creatures. */
export function rollDropTier(): number {
  const weights = [35, 28, 20, 12, 5];
  let t = Math.random() * 100;
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i];
    if (t < 0) return i + 1;
  }
  return 1;
}
