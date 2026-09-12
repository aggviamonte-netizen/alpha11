import Phaser from 'phaser';
import { creature, radiusPx } from './canon';
import { DANGER_Y, FLOOR_Y, H, INNER_L, INNER_R, W, WALL, WELL_TOP } from './layout';

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

function addPoly(
  scene: Phaser.Scene,
  r: number,
  color: number,
  sides: number,
  rot: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rot + (Math.PI * 2 * i) / sides;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  return g;
}

function addBody(scene: Phaser.Scene, r: number, color: number, tier: number): Phaser.GameObjects.GameObject {
  if (tier === 2) return addPoly(scene, r, color, 6, Math.PI / 6);
  if (tier === 9) return addPoly(scene, r, color, 5, -Math.PI / 2);
  if (tier === 10) return addPoly(scene, r, color, 8, Math.PI / 8);
  if (tier === 4) return scene.add.ellipse(0, r * 0.03, r * 1.88, r * 2.02, color, 1);
  if (tier === 5) return scene.add.ellipse(0, 0, r * 2.08, r * 1.86, color, 1);
  if (tier === 8) return scene.add.ellipse(0, 0, r * 2.12, r * 1.8, color, 1);
  return scene.add.circle(0, 0, r, color, 1);
}

function addPattern(scene: Phaser.Scene, r: number, color: number, tier: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const ink = lighten(color, 0.55);
  g.lineStyle(Math.max(1, r * 0.05), ink, 0.28);
  g.fillStyle(ink, 0.2);

  if (tier === 1) {
    g.fillCircle(-r * 0.28, -r * 0.1, r * 0.16);
    g.fillCircle(r * 0.22, r * 0.1, r * 0.11);
    g.fillCircle(-r * 0.02, r * 0.28, r * 0.09);
  } else if (tier === 2) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (Math.PI / 3) * i;
      g.lineBetween(0, 0, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
    }
  } else if (tier === 3) {
    g.lineStyle(Math.max(1.2, r * 0.06), ink, 0.35);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (Math.PI / 2) * i;
      const x = Math.cos(a) * r * 0.4;
      const y = Math.sin(a) * r * 0.4;
      g.lineBetween(x - r * 0.1, y, x + r * 0.1, y);
      g.lineBetween(x, y - r * 0.1, x, y + r * 0.1);
    }
  } else if (tier === 6) {
    g.beginPath();
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const a = t * Math.PI * 3.1;
      const rr = r * 0.1 + r * 0.58 * t;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
  } else if (tier === 7) {
    g.strokeCircle(0, 0, r * 0.38);
    g.fillCircle(0, 0, r * 0.16);
  } else if (tier === 9) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
      g.lineBetween(0, 0, Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
    }
  } else if (tier === 11) {
    g.lineStyle(Math.max(1.4, r * 0.05), 0x9be7ff, 0.4);
    g.beginPath();
    g.arc(0, 0, r * 0.78, -0.9, 0.55, false);
    g.strokePath();
    g.lineStyle(Math.max(1.4, r * 0.05), 0xffb5e0, 0.35);
    g.beginPath();
    g.arc(0, 0, r * 0.78, 2.1, 3.4, false);
    g.strokePath();
  }
  return g;
}

export function paintArena(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(0x0b0b0c, 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(W / 2, H * 0.52, 340);

  const wellW = INNER_R - INNER_L;
  const wellH = FLOOR_Y - WELL_TOP;

  g.fillStyle(0x18181c, 1);
  g.fillRoundedRect(INNER_L - 4, WELL_TOP - 4, wellW + 8, wellH + WALL + 6, 24);
  g.fillStyle(0x101012, 1);
  g.fillRoundedRect(INNER_L, WELL_TOP, wellW, wellH + 2, 20);
  g.fillStyle(0x0c0c0e, 1);
  g.fillRoundedRect(INNER_L + 3, WELL_TOP + 8, wellW - 6, wellH - 10, 16);

  g.fillStyle(0xf4f1ea, 0.08);
  g.fillRect(INNER_L - WALL, WELL_TOP - 4, WALL, FLOOR_Y - (WELL_TOP - 4) + WALL);
  g.fillRect(INNER_R, WELL_TOP - 4, WALL, FLOOR_Y - (WELL_TOP - 4) + WALL);
  g.fillRect(INNER_L - WALL, FLOOR_Y, wellW + WALL * 2, WALL);

  g.fillStyle(0xf4f1ea, 0.14);
  g.fillRect(INNER_L - WALL, FLOOR_Y, wellW + WALL * 2, 3);

  g.fillStyle(0xff3b4a, 0.05);
  g.fillRect(INNER_L, DANGER_Y - 16, wellW, 32);

  g.lineStyle(1, 0xf4f1ea, 0.08);
  g.strokeRoundedRect(INNER_L + 1, WELL_TOP + 1, wellW - 2, wellH - 2, 18);
}

export function drawCreature(scene: Phaser.Scene, x: number, y: number, tier: number): Phaser.GameObjects.Container {
  const c = creature(tier);
  const r = radiusPx(tier);
  const root = scene.add.container(x, y);
  const glow = scene.add.circle(0, 0, r * 1.14, c.color, 0.16);
  const thickness = addBody(scene, r, darken(c.color, 0.38), tier);
  if ('setPosition' in thickness) (thickness as Phaser.GameObjects.Shape).setPosition(0, r * 0.08);
  const base = addBody(scene, r, c.color, tier);
  const shade = scene.add.graphics();
  shade.fillStyle(0x000000, 0.2);
  shade.slice(0, r * 0.12, r * 0.92, 0.15, Math.PI - 0.15, false);
  shade.fillPath();
  const pattern = addPattern(scene, r, c.color, tier);
  const hi = scene.add.ellipse(-r * 0.26, -r * 0.34, r * 0.72, r * 0.4, 0xffffff, 0.26);
  const spec = scene.add.ellipse(-r * 0.3, -r * 0.4, r * 0.3, r * 0.16, 0xffffff, 0.5);
  const rim = scene.add.graphics();
  rim.lineStyle(Math.max(1.6, r * 0.07), lighten(c.color, 0.62), 0.45);
  rim.beginPath();
  rim.arc(0, 0, r * 0.86, -2.45, -0.35, false);
  rim.strokePath();
  const edge = scene.add.graphics();
  edge.lineStyle(Math.max(1.4, r * 0.055), 0x0b0b0c, 0.4);
  edge.strokeCircle(0, 0, r - 0.8);
  const emoji = scene.add
    .text(0, -r * 0.06, c.emoji, {
      fontSize: `${Math.max(14, r * 0.9)}px`,
      align: 'center',
    })
    .setOrigin(0.5);
  const code = scene.add
    .text(0, r * 0.4, c.code, {
      fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
      fontSize: `${Math.max(8, r * 0.28)}px`,
      color: '#0B0B0C',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  root.add([glow, thickness, base, shade, pattern, hi, spec, rim, edge, emoji, code]);
  root.setDepth(10);
  return root;
}
