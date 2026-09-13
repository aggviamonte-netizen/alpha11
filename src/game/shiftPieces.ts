import Phaser from 'phaser';

export type PieceKind = 'dot' | 'tri' | 'diamond' | 'hex' | 'plus' | 'star' | 'chevron' | 'ring' | 'node' | 'prism' | 'core';

export type ShiftPiece = {
  tier: number;
  code: string;
  name: string;
  glyph: string;
  color: number;
  hex: string;
  kind: PieceKind;
};

/** SHIFT tesserae — geometric merge pieces, not LAB produce. */
export const SHIFT_PIECES: ShiftPiece[] = [
  { tier: 1, code: 'T1', name: 'Punto', glyph: '●', color: 0x6ee7ff, hex: '#6EE7FF', kind: 'dot' },
  { tier: 2, code: 'T2', name: 'Prisma', glyph: '▲', color: 0x8b9bff, hex: '#8B9BFF', kind: 'tri' },
  { tier: 3, code: 'T3', name: 'Rombo', glyph: '◆', color: 0xff8bd1, hex: '#FF8BD1', kind: 'diamond' },
  { tier: 4, code: 'T4', name: 'Hex', glyph: '⬡', color: 0xe8ff47, hex: '#E8FF47', kind: 'hex' },
  { tier: 5, code: 'T5', name: 'Cruz', glyph: '✚', color: 0xff9a3c, hex: '#FF9A3C', kind: 'plus' },
  { tier: 6, code: 'T6', name: 'Estrella', glyph: '★', color: 0xff7a45, hex: '#FF7A45', kind: 'star' },
  { tier: 7, code: 'T7', name: 'Flecha', glyph: '❯', color: 0x7cffb2, hex: '#7CFFB2', kind: 'chevron' },
  { tier: 8, code: 'T8', name: 'Anillo', glyph: '◎', color: 0xc9a8ff, hex: '#C9A8FF', kind: 'ring' },
  { tier: 9, code: 'T9', name: 'Nodo', glyph: '⬢', color: 0x4ad4ff, hex: '#4AD4FF', kind: 'node' },
  { tier: 10, code: 'T10', name: 'Prisma+', glyph: '✦', color: 0xffd36a, hex: '#FFD36A', kind: 'prism' },
  { tier: 11, code: 'T11', name: 'Núcleo', glyph: '✸', color: 0xf4f1ea, hex: '#F4F1EA', kind: 'core' },
];

export function shiftPiece(tier: number): ShiftPiece {
  return SHIFT_PIECES[Math.max(1, Math.min(11, tier)) - 1];
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

function regular(n: number, r: number, rot = -Math.PI / 2): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (Math.PI * 2 * i) / n;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}

function starPts(r: number, inner = 0.42, n = 5): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    const rad = i % 2 === 0 ? r : r * inner;
    out.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
  }
  return out;
}

function paintTile(g: Phaser.GameObjects.Graphics, r: number, c: number, draw: () => void): void {
  g.fillStyle(0x0b0b0c, 0.28);
  g.fillRoundedRect(-r * 0.92, -r * 0.86, r * 1.9, r * 1.9, r * 0.28);
  g.fillStyle(0x161822, 1);
  g.fillRoundedRect(-r * 0.98, -r * 0.98, r * 1.96, r * 1.96, r * 0.3);
  g.fillStyle(darken(c, 0.55), 1);
  g.fillRoundedRect(-r * 0.86, -r * 0.86, r * 1.72, r * 1.72, r * 0.24);
  g.lineStyle(Math.max(1.2, r * 0.06), lighten(c, 0.2), 0.55);
  g.strokeRoundedRect(-r * 0.86, -r * 0.86, r * 1.72, r * 1.72, r * 0.24);
  draw();
  g.fillStyle(0xffffff, 0.16);
  g.fillRoundedRect(-r * 0.7, -r * 0.78, r * 1.1, r * 0.22, r * 0.1);
}

export function drawShiftArt(scene: Phaser.Scene, tier: number, r: number): Phaser.GameObjects.Graphics {
  const p = shiftPiece(tier);
  const g = scene.add.graphics();
  const c = p.color;
  paintTile(g, r, c, () => {
    switch (p.kind) {
      case 'dot': {
        const s = r * 0.86;
        g.fillStyle(darken(c, 0.28), 1);
        g.fillRoundedRect(-s / 2 + 2, -s / 2 + 2, s, s, 4);
        g.fillStyle(c, 1);
        g.fillRoundedRect(-s / 2, -s / 2, s, s, 4);
        g.fillStyle(0x0b0b0c, 0.28);
        g.fillRect(-s * 0.12, -s * 0.32, s * 0.24, s * 0.64);
        g.fillRect(-s * 0.32, -s * 0.12, s * 0.64, s * 0.24);
        g.fillStyle(0xffffff, 0.35);
        g.fillRect(-s / 2 + 4, -s / 2 + 4, s * 0.28, 3);
        break;
      }
      case 'tri':
        g.fillStyle(darken(c, 0.3), 1);
        poly(g, regular(3, r * 0.72).map((pt) => ({ x: pt.x + r * 0.04, y: pt.y + r * 0.06 })));
        g.fillStyle(c, 1);
        poly(g, regular(3, r * 0.68));
        g.fillStyle(0xffffff, 0.28);
        poly(g, regular(3, r * 0.32));
        break;
      case 'diamond':
        g.fillStyle(darken(c, 0.28), 1);
        poly(g, regular(4, r * 0.74, 0).map((pt) => ({ x: pt.x + r * 0.04, y: pt.y + r * 0.05 })));
        g.fillStyle(c, 1);
        poly(g, regular(4, r * 0.7, 0));
        g.fillStyle(lighten(c, 0.35), 0.55);
        poly(g, regular(4, r * 0.32, 0));
        break;
      case 'hex':
        g.fillStyle(darken(c, 0.3), 1);
        poly(g, regular(6, r * 0.7).map((pt) => ({ x: pt.x + r * 0.04, y: pt.y + r * 0.05 })));
        g.fillStyle(c, 1);
        poly(g, regular(6, r * 0.66));
        g.fillStyle(0x0b0b0c, 0.22);
        poly(g, regular(6, r * 0.28));
        break;
      case 'plus': {
        const w = r * 0.28;
        const l = r * 0.7;
        g.fillStyle(darken(c, 0.28), 1);
        g.fillRoundedRect(-w + 2, -l + 2, w * 2, l * 2, 4);
        g.fillRoundedRect(-l + 2, -w + 2, l * 2, w * 2, 4);
        g.fillStyle(c, 1);
        g.fillRoundedRect(-w, -l, w * 2, l * 2, 4);
        g.fillRoundedRect(-l, -w, l * 2, w * 2, 4);
        break;
      }
      case 'star':
        g.fillStyle(darken(c, 0.28), 1);
        poly(g, starPts(r * 0.74).map((pt) => ({ x: pt.x + r * 0.03, y: pt.y + r * 0.04 })));
        g.fillStyle(c, 1);
        poly(g, starPts(r * 0.7));
        g.fillStyle(0xf4f1ea, 0.35);
        g.fillCircle(0, 0, r * 0.16);
        break;
      case 'chevron':
        g.fillStyle(darken(c, 0.28), 1);
        poly(g, [
          { x: -r * 0.42, y: -r * 0.58 },
          { x: r * 0.38, y: 0 },
          { x: -r * 0.42, y: r * 0.58 },
          { x: -r * 0.18, y: 0 },
        ]);
        g.fillStyle(c, 1);
        poly(g, [
          { x: -r * 0.48, y: -r * 0.62 },
          { x: r * 0.42, y: 0 },
          { x: -r * 0.48, y: r * 0.62 },
          { x: -r * 0.22, y: 0 },
        ]);
        break;
      case 'ring':
        g.fillStyle(c, 1);
        g.fillCircle(0, 0, r * 0.62);
        g.fillStyle(0x161822, 1);
        g.fillCircle(0, 0, r * 0.32);
        g.lineStyle(Math.max(1.4, r * 0.08), lighten(c, 0.25), 0.85);
        g.strokeCircle(0, 0, r * 0.48);
        break;
      case 'node':
        g.fillStyle(c, 1);
        poly(g, regular(6, r * 0.62));
        g.fillStyle(0x0b0b0c, 0.35);
        g.fillCircle(0, 0, r * 0.22);
        g.fillStyle(lighten(c, 0.4), 1);
        g.fillCircle(0, 0, r * 0.12);
        for (const a of [0, 2.094, 4.189]) {
          g.fillStyle(c, 0.9);
          g.fillCircle(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.1);
        }
        break;
      case 'prism':
        g.fillStyle(darken(c, 0.25), 1);
        poly(g, regular(3, r * 0.74));
        g.fillStyle(c, 1);
        poly(g, regular(3, r * 0.58, Math.PI / 6));
        g.fillStyle(0xffffff, 0.28);
        poly(g, regular(3, r * 0.28, Math.PI / 6));
        break;
      case 'core':
        g.fillStyle(c, 1);
        poly(g, starPts(r * 0.74, 0.5, 8));
        g.fillStyle(0x6ee7ff, 0.85);
        g.fillCircle(0, 0, r * 0.28);
        g.fillStyle(0xe8ff47, 1);
        g.fillCircle(0, 0, r * 0.14);
        g.fillStyle(0xffffff, 0.55);
        g.fillCircle(-r * 0.06, -r * 0.06, r * 0.06);
        break;
    }
  });
  return g;
}

export function drawShiftPiece(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
  radius: number,
): Phaser.GameObjects.Container {
  const p = shiftPiece(tier);
  const root = scene.add.container(x, y);
  const glow = scene.add.circle(0, 0, radius * 1.18, p.color, 0.16);
  const art = drawShiftArt(scene, tier, radius);
  const code = scene.add
    .text(0, radius * 0.72, p.code, {
      fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
      fontSize: `${Math.max(8, radius * 0.24)}px`,
      color: '#F4F1EA',
      fontStyle: 'bold',
      stroke: '#0B0B0C',
      strokeThickness: Math.max(2, radius * 0.08),
    })
    .setOrigin(0.5);
  root.add([glow, art, code]);
  root.setDepth(10);
  return root;
}
