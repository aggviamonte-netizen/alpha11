import Phaser from 'phaser';

export type RangeMark = {
  tier: number;
  code: string;
  color: number;
  hex: string;
};

/** Range marks — plates and dummies on stands. Never LAB produce. */
export const RANGE_MARKS: RangeMark[] = [
  { tier: 1, code: 'M1', color: 0x8b9bff, hex: '#8B9BFF' },
  { tier: 2, code: 'M2', color: 0x6ee7ff, hex: '#6EE7FF' },
  { tier: 3, code: 'M3', color: 0xe8ff47, hex: '#E8FF47' },
  { tier: 4, code: 'M4', color: 0xff9a3c, hex: '#FF9A3C' },
  { tier: 5, code: 'M5', color: 0xff7a45, hex: '#FF7A45' },
  { tier: 6, code: 'M6', color: 0xc9a8ff, hex: '#C9A8FF' },
  { tier: 7, code: 'M7', color: 0x7cffb2, hex: '#7CFFB2' },
  { tier: 8, code: 'M8', color: 0x4ad4ff, hex: '#4AD4FF' },
  { tier: 9, code: 'M9', color: 0xffd36a, hex: '#FFD36A' },
  { tier: 10, code: 'M10', color: 0xff8bd1, hex: '#FF8BD1' },
  { tier: 11, code: 'M11', color: 0xf4f1ea, hex: '#F4F1EA' },
];

export function rangeMark(tier: number): RangeMark {
  return RANGE_MARKS[Math.max(1, Math.min(11, tier)) - 1];
}

function mix(color: number, other: number, t: number): number {
  const ar = (color >> 16) & 255;
  const ag = (color >> 8) & 255;
  const ab = color & 255;
  const br = (other >> 16) & 255;
  const bg = (other >> 8) & 255;
  const bb = other & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function darken(color: number, t: number): number {
  return mix(color, 0x0b0b0c, t);
}

function stand(g: Phaser.GameObjects.Graphics, r: number): void {
  g.fillStyle(0x2a2d38, 1);
  g.fillRect(-r * 0.08, r * 0.42, r * 0.16, r * 0.72);
  g.fillRect(-r * 0.38, r * 1.08, r * 0.76, r * 0.1);
  g.fillStyle(0x171920, 1);
  g.fillRect(-r * 0.42, r * 1.16, r * 0.84, r * 0.07);
}

function plate(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  stand(g, r);
  g.fillStyle(0x0b0b0c, 0.3);
  g.fillCircle(r * 0.05, r * 0.06, r);
  g.fillStyle(0x2a2d38, 1);
  g.fillCircle(0, 0, r);
  g.fillStyle(c, 1);
  g.fillCircle(0, 0, r * 0.82);
  g.fillStyle(0xf4f1ea, 1);
  g.fillCircle(0, 0, r * 0.58);
  g.fillStyle(c, 1);
  g.fillCircle(0, 0, r * 0.36);
  g.fillStyle(0x1a1c22, 1);
  g.fillCircle(0, 0, r * 0.16);
  g.fillStyle(0xe8ff47, 0.95);
  g.fillCircle(0, 0, r * 0.07);
}

function diamondPlate(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  stand(g, r);
  const pts = (s: number) => [
    { x: 0, y: -s },
    { x: s * 0.78, y: 0 },
    { x: 0, y: s },
    { x: -s * 0.78, y: 0 },
  ];
  const fill = (s: number, color: number) => {
    g.fillStyle(color, 1);
    g.beginPath();
    const p = pts(s);
    p.forEach((pt, i) => (i === 0 ? g.moveTo(pt.x, pt.y) : g.lineTo(pt.x, pt.y)));
    g.closePath();
    g.fillPath();
  };
  fill(r * 1.02, 0x1a1c22);
  fill(r * 0.88, c);
  fill(r * 0.58, 0xf4f1ea);
  fill(r * 0.28, darken(c, 0.15));
  g.fillStyle(0xe8ff47, 1);
  g.fillRect(-r * 0.08, -r * 0.08, r * 0.16, r * 0.16);
}

/** Humanoid dummy: square shoulders, neck, chest plate. Not an oval fruit. */
function marksmanDummy(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  const ink = 0x171920;
  stand(g, r);
  g.fillStyle(ink, 1);
  g.fillRect(-r * 0.42, -r * 0.22, r * 0.84, r * 0.95);
  g.fillRect(-r * 0.72, -r * 0.18, r * 0.3, r * 0.16);
  g.fillRect(r * 0.42, -r * 0.18, r * 0.3, r * 0.16);
  g.fillRect(-r * 0.12, -r * 0.42, r * 0.24, r * 0.22);
  g.fillRect(-r * 0.22, -r * 0.78, r * 0.44, r * 0.4);
  g.fillStyle(c, 1);
  g.fillRect(-r * 0.34, -r * 0.14, r * 0.68, r * 0.78);
  g.fillRect(-r * 0.18, -r * 0.72, r * 0.36, r * 0.3);
  g.fillStyle(0x2a2d38, 1);
  g.fillRect(-r * 0.2, -r * 0.8, r * 0.4, r * 0.1);
  g.fillStyle(0xe8ff47, 1);
  g.fillCircle(0, 0.02 * r, r * 0.16);
  g.fillStyle(0x0b0b0c, 1);
  g.fillCircle(0, 0.02 * r, r * 0.07);
  g.fillStyle(0xffffff, 0.22);
  g.fillRect(-r * 0.22, -r * 0.1, r * 0.2, r * 0.08);
}

/** Flat cardboard pop-up: head + shoulders cutout on a hinge. Not a hooded fruit. */
function popUpSilhouette(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(0x2a2d38, 1);
  g.fillRect(-r * 0.07, r * 0.55, r * 0.14, r * 0.55);
  g.fillRect(-r * 0.34, r * 1.05, r * 0.68, r * 0.1);
  g.fillStyle(0x12141a, 1);
  g.fillRect(-r * 0.55, -r * 0.08, r * 1.1, r * 0.72);
  g.fillRect(-r * 0.22, -r * 0.72, r * 0.44, r * 0.68);
  g.fillStyle(c, 0.95);
  g.fillRect(-r * 0.46, -r * 0.02, r * 0.92, r * 0.58);
  g.fillRect(-r * 0.16, -r * 0.62, r * 0.32, r * 0.62);
  g.fillStyle(0x0b0b0c, 1);
  g.fillRect(-r * 0.1, -r * 0.52, r * 0.08, r * 0.08);
  g.fillRect(0.02 * r, -r * 0.52, r * 0.08, r * 0.08);
  g.fillStyle(0xe8ff47, 0.95);
  g.fillRect(-r * 0.18, r * 0.12, r * 0.36, r * 0.08);
  g.fillRect(-r * 0.08, r * 0.22, r * 0.16, r * 0.16);
}

export function drawRangeTarget(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
  r: number,
): Phaser.GameObjects.Container {
  const mark = rangeMark(tier);
  const root = scene.add.container(x, y);
  const halo = scene.add.circle(0, 0, r * 1.28, mark.color, 0.22);
  const g = scene.add.graphics();
  const family = (tier - 1) % 4;
  if (family === 0) plate(g, r, mark.color);
  else if (family === 1) diamondPlate(g, r, mark.color);
  else if (family === 2) marksmanDummy(g, r, mark.color);
  else popUpSilhouette(g, r, mark.color);
  root.add([halo, g]);
  root.setDepth(10);
  return root;
}
