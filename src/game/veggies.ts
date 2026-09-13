import Phaser from 'phaser';
import { creature } from './canon';

function mix(color: number, other: number, t: number): number {
  const ar = (color >> 16) & 255;
  const ag = (color >> 8) & 255;
  const ab = color & 255;
  const br = (other >> 16) & 255;
  const bg = (other >> 8) & 255;
  const bb = other & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | b;
}

function lighten(color: number, t: number): number {
  return mix(color, 0xffffff, t);
}

function darken(color: number, t: number): number {
  return mix(color, 0x050506, t);
}

function poly(g: Phaser.GameObjects.Graphics, pts: Array<{ x: number; y: number }>): void {
  g.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  });
  g.closePath();
  g.fillPath();
}

function pea(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(darken(c, 0.38), 1);
  g.fillCircle(r * 0.06, r * 0.1, r);
  g.fillStyle(c, 1);
  g.fillCircle(0, 0, r);
  g.fillStyle(lighten(c, 0.22), 0.55);
  g.fillCircle(-r * 0.22, -r * 0.28, r * 0.42);
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(-r * 0.28, -r * 0.34, r * 0.36, r * 0.2);
  g.lineStyle(Math.max(1, r * 0.06), darken(c, 0.28), 0.35);
  g.strokeCircle(0, 0, r * 0.72);
  g.fillStyle(darken(c, 0.2), 0.9);
  g.fillCircle(r * 0.02, -r * 0.86, r * 0.14);
}

function tomato(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(darken(c, 0.4), 1);
  g.fillCircle(r * 0.05, r * 0.1, r);
  g.fillStyle(c, 1);
  g.fillCircle(0, r * 0.04, r * 0.96);
  g.fillStyle(lighten(c, 0.18), 0.4);
  g.fillEllipse(-r * 0.2, -r * 0.18, r * 0.7, r * 0.42);
  g.fillStyle(0xffffff, 0.45);
  g.fillEllipse(-r * 0.26, -r * 0.22, r * 0.32, r * 0.16);
  const leaf = 0x3d9a3a;
  g.fillStyle(darken(leaf, 0.15), 1);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
    g.fillEllipse(Math.cos(a) * r * 0.32, -r * 0.72 + Math.sin(a) * r * 0.16, r * 0.34, r * 0.18);
  }
  g.fillStyle(leaf, 1);
  g.fillCircle(0, -r * 0.7, r * 0.16);
  g.fillStyle(0x6b4226, 1);
  g.fillRect(-r * 0.05, -r * 1.02, r * 0.1, r * 0.28);
}

function carrot(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(darken(c, 0.38), 1);
  poly(g, [
    { x: r * 0.08, y: -r * 0.72 },
    { x: r * 0.52, y: r * 0.2 },
    { x: r * 0.12, y: r * 1.12 },
    { x: -r * 0.36, y: r * 0.2 },
    { x: -r * 0.38, y: -r * 0.72 },
  ]);
  g.fillStyle(c, 1);
  poly(g, [
    { x: 0, y: -r * 0.82 },
    { x: r * 0.42, y: r * 0.12 },
    { x: 0, y: r * 1.08 },
    { x: -r * 0.42, y: r * 0.12 },
  ]);
  g.fillStyle(lighten(c, 0.22), 0.45);
  g.fillTriangle(-r * 0.12, -r * 0.7, -r * 0.02, r * 0.7, -r * 0.28, r * 0.05);
  g.lineStyle(Math.max(1, r * 0.05), darken(c, 0.25), 0.35);
  for (const y of [-0.25, 0.15, 0.52]) {
    g.beginPath();
    g.arc(0, r * y, r * (0.28 + y * 0.12), 0.4, Math.PI - 0.4);
    g.strokePath();
  }
  const leaf = 0x4ad15a;
  for (let i = -2; i <= 2; i++) {
    g.fillStyle(i % 2 === 0 ? leaf : darken(leaf, 0.2), 1);
    g.fillEllipse(i * r * 0.16, -r * 1.02, r * 0.16, r * 0.46);
  }
}

function pepper(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(darken(c, 0.4), 1);
  g.fillEllipse(r * 0.06, r * 0.12, r * 1.72, r * 1.95);
  g.fillStyle(c, 1);
  g.fillEllipse(0, r * 0.08, r * 1.7, r * 1.92);
  g.fillStyle(darken(c, 0.18), 1);
  g.fillEllipse(0, -r * 0.55, r * 0.95, r * 0.7);
  g.fillStyle(c, 1);
  g.fillEllipse(0, -r * 0.42, r * 1.05, r * 0.62);
  g.fillStyle(lighten(c, 0.2), 0.35);
  g.fillEllipse(-r * 0.28, -r * 0.05, r * 0.42, r * 1.15);
  g.lineStyle(Math.max(1.2, r * 0.06), darken(c, 0.28), 0.28);
  g.beginPath();
  g.moveTo(-r * 0.18, -r * 0.7);
  g.lineTo(-r * 0.22, r * 0.85);
  g.moveTo(r * 0.2, -r * 0.62);
  g.lineTo(r * 0.26, r * 0.8);
  g.strokePath();
  g.fillStyle(0x3d9a3a, 1);
  g.fillEllipse(0, -r * 0.95, r * 0.42, r * 0.28);
  g.fillStyle(0x2f7a32, 1);
  g.fillRoundedRect(-r * 0.1, -r * 1.28, r * 0.2, r * 0.4, r * 0.08);
}

function eggplant(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(darken(c, 0.4), 1);
  g.fillEllipse(r * 0.06, r * 0.12, r * 1.28, r * 2.15);
  g.fillStyle(c, 1);
  g.fillEllipse(0, r * 0.12, r * 1.24, r * 2.12);
  g.fillStyle(lighten(c, 0.28), 0.38);
  g.fillEllipse(-r * 0.18, -r * 0.08, r * 0.38, r * 1.15);
  g.fillStyle(0xffffff, 0.32);
  g.fillEllipse(-r * 0.2, -r * 0.35, r * 0.22, r * 0.5);
  g.fillStyle(0x3d9a3a, 1);
  g.fillEllipse(0, -r * 0.95, r * 0.95, r * 0.55);
  g.fillStyle(0x2f7a32, 1);
  for (let i = -2; i <= 2; i++) {
    g.fillEllipse(i * r * 0.2, -r * 1.05, r * 0.28, r * 0.22);
  }
  g.fillStyle(0x6b4226, 1);
  g.fillRoundedRect(-r * 0.08, -r * 1.32, r * 0.16, r * 0.32, r * 0.06);
}

function broccoli(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  const stem = 0xc6e36a;
  g.fillStyle(darken(stem, 0.35), 1);
  g.fillRoundedRect(-r * 0.22, r * 0.15, r * 0.52, r * 0.95, r * 0.16);
  g.fillStyle(stem, 1);
  g.fillRoundedRect(-r * 0.28, r * 0.08, r * 0.52, r * 0.95, r * 0.16);
  const heads: Array<[number, number, number]> = [
    [0, -r * 0.55, r * 0.55],
    [-r * 0.48, -r * 0.22, r * 0.42],
    [r * 0.5, -r * 0.18, r * 0.4],
    [-r * 0.18, -r * 0.88, r * 0.36],
    [r * 0.28, -r * 0.82, r * 0.34],
    [r * 0.08, -r * 0.12, r * 0.38],
  ];
  for (const [x, y, rr] of heads) {
    g.fillStyle(darken(c, 0.35), 1);
    g.fillCircle(x + rr * 0.08, y + rr * 0.1, rr);
  }
  for (const [x, y, rr] of heads) {
    g.fillStyle(c, 1);
    g.fillCircle(x, y, rr * 0.94);
    g.fillStyle(lighten(c, 0.2), 0.28);
    g.fillCircle(x - rr * 0.22, y - rr * 0.22, rr * 0.38);
  }
  g.fillStyle(darken(c, 0.15), 0.45);
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    g.fillCircle(Math.cos(a) * r * 0.42, -r * 0.48 + Math.sin(a) * r * 0.28, r * 0.07);
  }
}

function corn(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(0x3d9a3a, 1);
  g.fillEllipse(-r * 0.42, r * 0.15, r * 0.55, r * 1.7);
  g.fillEllipse(r * 0.42, r * 0.2, r * 0.5, r * 1.55);
  g.fillStyle(darken(c, 0.4), 1);
  g.fillEllipse(r * 0.05, r * 0.08, r * 1.15, r * 2.2);
  g.fillStyle(c, 1);
  g.fillEllipse(0, r * 0.04, r * 1.1, r * 2.16);
  g.fillStyle(0xffe566, 1);
  const cols = 3;
  const rows = 6;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = (j - 1) * r * 0.28;
      const y = -r * 0.72 + i * r * 0.28;
      g.fillStyle(j === 0 ? lighten(c, 0.15) : c, 1);
      g.fillCircle(x, y, r * 0.11);
    }
  }
  g.fillStyle(0x2f7a32, 1);
  g.fillTriangle(-r * 0.12, -r * 1.12, r * 0.12, -r * 1.12, 0, -r * 1.38);
}

function cabbage(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  const layers: Array<[number, number, number, number, number]> = [
    [0x6f9a4a, r * 1.08, r * 1.0, 0.15, 0],
    [c, r * 0.98, r * 0.92, -0.2, 0.02],
    [lighten(c, 0.12), r * 0.78, r * 0.74, 0.35, -0.04],
    [0xd4f2a8, r * 0.5, r * 0.48, -0.1, 0],
  ];
  for (const [col, rx, ry, rot, ox] of layers) {
    g.fillStyle(darken(col, 0.25), 1);
    g.fillEllipse(ox + r * 0.05, r * 0.08, rx * 2, ry * 2);
    g.fillStyle(col, 1);
    g.fillEllipse(ox, 0, rx * 1.92, ry * 1.92);
    g.lineStyle(Math.max(1, r * 0.04), darken(col, 0.3), 0.35);
    g.beginPath();
    g.arc(ox, 0, rx * 0.7, rot, rot + 1.8);
    g.strokePath();
  }
  g.fillStyle(0xffffff, 0.28);
  g.fillEllipse(-r * 0.22, -r * 0.28, r * 0.42, r * 0.22);
}

function pumpkin(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(darken(c, 0.4), 1);
  g.fillEllipse(r * 0.05, r * 0.1, r * 2.28, r * 1.62);
  const ribs = [-0.62, -0.32, 0, 0.32, 0.62];
  for (const [i, ox] of ribs.entries()) {
    const col = i % 2 === 0 ? c : darken(c, 0.12);
    g.fillStyle(col, 1);
    g.fillEllipse(ox * r, 0, r * 0.95, r * 1.52);
  }
  g.lineStyle(Math.max(1.1, r * 0.05), darken(c, 0.28), 0.4);
  for (const ox of [-0.46, -0.16, 0.16, 0.46]) {
    g.beginPath();
    g.moveTo(ox * r, -r * 0.62);
    g.lineTo(ox * r * 0.85, r * 0.68);
    g.strokePath();
  }
  g.fillStyle(0xffffff, 0.22);
  g.fillEllipse(-r * 0.35, -r * 0.28, r * 0.55, r * 0.22);
  g.fillStyle(0x5a8f32, 1);
  g.fillEllipse(r * 0.08, -r * 0.78, r * 0.28, r * 0.22);
  g.fillStyle(0x6b4226, 1);
  g.beginPath();
  g.moveTo(-r * 0.02, -r * 0.72);
  g.lineTo(r * 0.18, -r * 1.08);
  g.lineTo(r * 0.32, -r * 0.95);
  g.lineTo(r * 0.08, -r * 0.7);
  g.closePath();
  g.fillPath();
}

function artichoke(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  g.fillStyle(darken(c, 0.4), 1);
  g.fillEllipse(r * 0.04, r * 0.12, r * 1.85, r * 2.05);
  const petals = 14;
  for (let i = petals - 1; i >= 0; i--) {
    const t = i / petals;
    const a = -Math.PI / 2 + (i % 2 === 0 ? -0.22 : 0.22) + t * 0.15;
    const rr = r * (0.95 - t * 0.35);
    const x = Math.cos(a) * r * 0.12;
    const y = r * 0.35 - t * r * 1.15;
    g.fillStyle(i % 2 === 0 ? c : darken(c, 0.18), 1);
    g.fillEllipse(x, y, rr * 0.85, rr * 0.55);
  }
  g.fillStyle(lighten(c, 0.15), 1);
  g.fillEllipse(0, -r * 0.15, r * 0.7, r * 0.55);
  g.fillStyle(0x6b8f3a, 1);
  g.fillTriangle(-r * 0.12, -r * 0.95, r * 0.12, -r * 0.95, 0, -r * 1.22);
}

function alpha(g: Phaser.GameObjects.Graphics, r: number, c: number): void {
  const vein = 0xe8ff47;
  g.fillStyle(0xe8ff47, 0.16);
  g.fillCircle(0, 0, r * 1.2);
  g.fillStyle(darken(c, 0.35), 1);
  poly(g, [
    { x: r * 0.06, y: -r * 1.05 },
    { x: r * 1.05, y: -r * 0.15 },
    { x: r * 0.72, y: r * 0.95 },
    { x: -r * 0.55, y: r * 0.95 },
    { x: -r * 1.0, y: -r * 0.12 },
    { x: -r * 0.42, y: -r * 1.05 },
  ]);
  g.fillStyle(c, 1);
  poly(g, [
    { x: 0, y: -r * 1.08 },
    { x: r * 0.98, y: -r * 0.18 },
    { x: r * 0.68, y: r * 0.92 },
    { x: -r * 0.62, y: r * 0.92 },
    { x: -r * 0.98, y: -r * 0.15 },
    { x: -r * 0.4, y: -r * 1.08 },
  ]);
  g.lineStyle(Math.max(1.4, r * 0.06), vein, 0.55);
  g.beginPath();
  g.moveTo(0, -r * 0.7);
  g.lineTo(r * 0.22, -r * 0.1);
  g.lineTo(-r * 0.08, r * 0.35);
  g.lineTo(r * 0.18, r * 0.7);
  g.moveTo(r * 0.22, -r * 0.1);
  g.lineTo(r * 0.55, r * 0.08);
  g.strokePath();
  g.lineStyle(Math.max(1.2, r * 0.05), 0xff8bd1, 0.4);
  g.beginPath();
  g.moveTo(-r * 0.35, -r * 0.2);
  g.lineTo(-r * 0.08, r * 0.35);
  g.lineTo(-r * 0.4, r * 0.62);
  g.strokePath();
  g.fillStyle(0x4ad15a, 1);
  for (let i = -2; i <= 2; i++) {
    g.fillEllipse(i * r * 0.18, -r * 1.12, r * 0.18, r * 0.42);
  }
  g.fillStyle(0x0b0b0c, 0.55);
  g.fillRoundedRect(-r * 0.32, r * 0.18, r * 0.64, r * 0.28, r * 0.08);
  g.fillStyle(vein, 1);
  g.fillTriangle(-r * 0.12, r * 0.38, r * 0.12, r * 0.38, 0, r * 0.2);
}

const DRAW: Record<number, (g: Phaser.GameObjects.Graphics, r: number, c: number) => void> = {
  1: pea,
  2: tomato,
  3: carrot,
  4: pepper,
  5: eggplant,
  6: broccoli,
  7: corn,
  8: cabbage,
  9: pumpkin,
  10: artichoke,
  11: alpha,
};

export function drawVeggieArt(scene: Phaser.Scene, tier: number, r: number): Phaser.GameObjects.Graphics {
  const c = creature(tier);
  const g = scene.add.graphics();
  const fn = DRAW[tier] ?? pea;
  fn(g, r, c.color);
  return g;
}
