export type BodyKind = 'circle' | 'capsule' | 'wide' | 'poly';

export type Creature = {
  tier: number;
  code: string;
  name: string;
  emoji: string;
  color: number;
  hex: string;
  unitR: number;
  kind: BodyKind;
  aspectW: number;
  aspectH: number;
};

/** Pixels per canon radius unit (A1 0.50 → 19px, A11 2.48 → 94px). */
export const UNIT = 38;

/** Vegetable ladder — distinct silhouettes, no fruit-merge IP. */
export const CREATURES: Creature[] = [
  { tier: 1, code: 'A1', name: 'Guisante', emoji: '🟢', color: 0x7cffb2, hex: '#7CFFB2', unitR: 0.5, kind: 'circle', aspectW: 1, aspectH: 1 },
  { tier: 2, code: 'A2', name: 'Tomatito', emoji: '🍅', color: 0xff4d4d, hex: '#FF4D4D', unitR: 0.62, kind: 'circle', aspectW: 1, aspectH: 1 },
  { tier: 3, code: 'A3', name: 'Zanahoria', emoji: '🥕', color: 0xff8a2a, hex: '#FF8A2A', unitR: 0.74, kind: 'poly', aspectW: 0.58, aspectH: 1.38 },
  { tier: 4, code: 'A4', name: 'Pimiento', emoji: '🫑', color: 0xff3b5c, hex: '#FF3B5C', unitR: 0.88, kind: 'poly', aspectW: 0.88, aspectH: 1.18 },
  { tier: 5, code: 'A5', name: 'Berenjena', emoji: '🍆', color: 0x7b4dff, hex: '#7B4DFF', unitR: 1.04, kind: 'capsule', aspectW: 0.62, aspectH: 1.36 },
  { tier: 6, code: 'A6', name: 'Brócoli', emoji: '🥦', color: 0x3ddb6a, hex: '#3DDB6A', unitR: 1.22, kind: 'poly', aspectW: 1.12, aspectH: 1.14 },
  { tier: 7, code: 'A7', name: 'Mazorca', emoji: '🌽', color: 0xf5d547, hex: '#F5D547', unitR: 1.42, kind: 'capsule', aspectW: 0.62, aspectH: 1.38 },
  { tier: 8, code: 'A8', name: 'Col', emoji: '🥬', color: 0xb8e986, hex: '#B8E986', unitR: 1.64, kind: 'poly', aspectW: 1.05, aspectH: 1.02 },
  { tier: 9, code: 'A9', name: 'Calabaza', emoji: '🎃', color: 0xff7a2e, hex: '#FF7A2E', unitR: 1.88, kind: 'wide', aspectW: 1.22, aspectH: 0.86 },
  { tier: 10, code: 'A10', name: 'Alcachofa', emoji: '🪴', color: 0x8fbf6a, hex: '#8FBF6A', unitR: 2.16, kind: 'poly', aspectW: 1.02, aspectH: 1.14 },
  { tier: 11, code: 'A11', name: 'Alpha', emoji: '🧬', color: 0xf4f1ea, hex: '#F4F1EA', unitR: 2.48, kind: 'poly', aspectW: 1.1, aspectH: 1.16 },
];

export function creature(tier: number): Creature {
  return CREATURES[Math.max(1, Math.min(11, tier)) - 1];
}

export function radiusPx(tier: number): number {
  return creature(tier).unitR * UNIT;
}

export function halfWidthPx(tier: number, r = radiusPx(tier)): number {
  return r * creature(tier).aspectW;
}

export function halfHeightPx(tier: number, r = radiusPx(tier)): number {
  return r * creature(tier).aspectH;
}

/** Drops only A1–A5, weighted toward smaller lab veggies. */
export function rollDropTier(): number {
  const weights = [35, 28, 20, 12, 5];
  let t = Math.random() * 100;
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i];
    if (t < 0) return i + 1;
  }
  return 1;
}
