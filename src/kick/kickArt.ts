import Phaser from 'phaser';
import { H, W } from '../game/layout';
import { SWEET_MAX, SWEET_MIN } from './kickFeel';

export const GOAL = {
  cx: W * 0.5,
  barY: 168,
  lineY: 328,
  innerL: 64,
  innerR: 326,
  post: 9,
};

export const SPOT = { x: W * 0.5, y: 608 };
export const KICKER_POS = { x: W * 0.5 + 62, y: 698 };
export const KEEPER_HOME = { x: W * 0.5, y: 292 };
export const METER = { x: 28, y: 750, w: W - 56, h: 22 };

export function paintKickWorld(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(0x0b0d10, 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(0x12161c, 1);
  g.fillRect(0, 0, W, 156);
  g.fillStyle(0xe8ff47, 0.05);
  g.fillCircle(36, 64, 120);
  g.fillStyle(0x7cffb2, 0.05);
  g.fillCircle(W - 20, 210, 130);
  g.fillStyle(0xff7a45, 0.04);
  g.fillCircle(W * 0.7, 760, 160);

  g.fillStyle(0x101812, 1);
  g.fillRect(0, 148, W, H - 148);

  const tile = 28;
  for (let y = 156; y < H; y += tile) {
    for (let x = -10; x < W; x += tile) {
      const odd = Math.floor(y / tile) % 2;
      g.fillStyle(odd ? 0x132016 : 0x16261a, 0.94);
      g.fillRoundedRect(x, y, tile - 2, tile - 2, 5);
    }
  }

  g.fillStyle(0x7cffb2, 0.05);
  g.fillEllipse(W * 0.5, 430, 340, 220);

  const lines = scene.add.graphics().setDepth(1);
  lines.lineStyle(3, 0xe8ff47, 0.78);
  lines.strokeRect(36, 324, W - 72, 268);
  lines.strokeRect(86, 324, W - 172, 118);
  lines.strokeCircle(SPOT.x, SPOT.y, 44);
  lines.fillStyle(0xe8ff47, 0.95);
  lines.fillCircle(SPOT.x, SPOT.y, 5);
  lines.lineStyle(2, 0xf4f1ea, 0.22);
  lines.lineBetween(36, 456, W - 36, 456);
  lines.lineStyle(2, 0x7cffb2, 0.35);
  lines.beginPath();
  lines.arc(SPOT.x, 324, 52, 0.18, Math.PI - 0.18, false);
  lines.strokePath();

  const sheen = scene.add.graphics().setDepth(1);
  sheen.fillStyle(0xffffff, 0.045);
  sheen.fillTriangle(0, 200, 140, 200, 0, 520);
  sheen.fillStyle(0x000000, 0.16);
  sheen.fillRect(0, 780, W, 64);

  paintGallery(scene);
  paintGoal(scene);
}

function paintGallery(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(2);
  g.fillStyle(0x171b22, 1);
  g.fillRoundedRect(10, 86, W - 20, 58, 12);
  g.fillStyle(0x0d1014, 1);
  g.fillRoundedRect(16, 92, W - 32, 46, 10);
  const panes = [0x7cffb2, 0x6ee7ff, 0xff8bd1, 0xe8ff47, 0xff7a45];
  for (let i = 0; i < 5; i++) {
    const x = 28 + i * 70;
    g.fillStyle(panes[i], 0.16);
    g.fillRoundedRect(x, 98, 58, 34, 6);
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(x + 4, 102, 18, 12, 3);
  }
  g.fillStyle(0xe8ff47, 0.55);
  g.fillRoundedRect(168, 78, 54, 8, 3);
}

export function paintGoal(scene: Phaser.Scene): void {
  const { innerL, innerR, barY, lineY, post } = GOAL;
  const w = innerR - innerL;
  const h = lineY - barY;
  const net = scene.add.graphics().setDepth(4);
  net.fillStyle(0x6ee7ff, 0.06);
  net.fillRect(innerL, barY, w, h);
  net.lineStyle(1, 0x6ee7ff, 0.28);
  const cols = 9;
  const rows = 7;
  for (let i = 0; i <= cols; i++) {
    const x = innerL + (w * i) / cols;
    net.lineBetween(x, barY, Phaser.Math.Linear(x, GOAL.cx, 0.12), lineY);
  }
  for (let j = 0; j <= rows; j++) {
    const y = barY + (h * j) / rows;
    const inset = 6 + j * 1.4;
    net.lineBetween(innerL + inset, y, innerR - inset, y);
  }

  const glow = scene.add.graphics().setDepth(5);
  glow.lineStyle(16, 0x7cffb2, 0.16);
  glow.strokeRoundedRect(innerL - 10, barY - 10, w + 20, h + 14, 10);
  glow.lineStyle(6, 0xe8ff47, 0.22);
  glow.strokeRoundedRect(innerL - 6, barY - 6, w + 12, h + 8, 8);

  const frame = scene.add.graphics().setDepth(6);
  frame.fillStyle(0xe8ff47, 1);
  frame.fillRoundedRect(innerL - post, barY - post, w + post * 2, post, 5);
  frame.fillRoundedRect(innerL - post, barY, post, h, 5);
  frame.fillRoundedRect(innerR, barY, post, h, 5);
  frame.fillStyle(0xffffff, 0.62);
  frame.fillRect(innerL - post + 2, barY - post + 2, w + post * 2 - 10, 3);
  frame.fillRect(innerL - post + 2, barY, 3, h - 4);
  frame.fillStyle(0x0b0b0c, 0.25);
  frame.fillRect(innerR + 3, barY + 4, 3, h - 8);

  const boots = scene.add.graphics().setDepth(6);
  boots.fillStyle(0x1a1c20, 1);
  boots.fillRoundedRect(innerL - 16, lineY - 4, 22, 12, 3);
  boots.fillRoundedRect(innerR - 6, lineY - 4, 22, 12, 3);
}

export function drawLabBall(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y).setDepth(22);
  const glow = scene.add.circle(0, 0, 22, 0xe8ff47, 0.22);
  const shade = scene.add.circle(1.4, 3.2, 15, 0x2a2c22, 1);
  const body = scene.add.circle(0, 0, 15, 0xf4f1ea, 1);
  const g = scene.add.graphics();
  g.lineStyle(1.7, 0x0b0b0c, 0.88);
  g.strokeCircle(0, 0, 14.2);
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const px = Math.cos(a) * 5.6;
    const py = Math.sin(a) * 5.6;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.strokePath();
  g.lineStyle(1.3, 0x7cffb2, 0.75);
  g.strokeCircle(0, 0, 10);
  g.lineStyle(1.2, 0xff7a45, 0.55);
  g.beginPath();
  g.arc(0, 0, 10, 0.45, 2.15);
  g.strokePath();
  g.fillStyle(0x0b0b0c, 0.55);
  g.fillCircle(0, 0, 2.4);
  const hi = scene.add.ellipse(-5, -6, 8, 4.5, 0xffffff, 0.55);
  root.add([glow, shade, body, g, hi]);
  return root;
}

export function drawAimArrow(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setDepth(24);
}

export function renderAimArrow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  angle: number,
  height: number,
  hot: boolean,
): void {
  g.clear();
  const len = 118 + height * 42;
  const ex = x + Math.sin(angle) * len;
  const ey = y - Math.cos(angle) * len * (0.74 + height * 0.2);
  const color = hot ? 0xe8ff47 : 0x7cffb2;
  if (hot) {
    g.lineStyle(18, color, 0.12);
    g.lineBetween(x, y, ex, ey);
  }
  g.lineStyle(12, color, 0.16);
  g.lineBetween(x, y, ex, ey);
  g.lineStyle(5, color, 0.98);
  g.lineBetween(x, y, ex, ey);
  const nx = Math.sin(angle);
  const ny = -Math.cos(angle);
  const px = -ny;
  const py = nx;
  g.fillStyle(color, 1);
  g.fillTriangle(ex + nx * 16, ey + ny * 16, ex + px * 10, ey + py * 10, ex - px * 10, ey - py * 10);
  g.fillStyle(color, 0.55);
  g.fillCircle(x, y, 5);
}

export function drawPowerMeter(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setDepth(25);
}

export function renderPowerMeter(g: Phaser.GameObjects.Graphics, power: number, sweet: boolean): void {
  const { x, y, w, h } = METER;
  g.clear();
  g.fillStyle(0x0b0b0c, 0.72);
  g.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 14);
  g.fillStyle(0x141814, 1);
  g.fillRoundedRect(x, y, w, h, 11);
  const sweetX = x + 2 + (w - 4) * SWEET_MIN;
  const sweetW = (w - 4) * (SWEET_MAX - SWEET_MIN);
  g.fillStyle(0x7cffb2, sweet ? 0.38 : 0.22);
  g.fillRoundedRect(sweetX, y + 3, sweetW, h - 6, 8);
  const fill = Math.max(0.05, Math.min(1, power));
  g.fillStyle(sweet ? 0xe8ff47 : 0xff7a45, 0.96);
  g.fillRoundedRect(x + 2, y + 3, (w - 4) * fill, h - 6, 8);
  g.lineStyle(2, 0xe8ff47, sweet ? 0.9 : 0.55);
  g.lineBetween(sweetX, y + 2, sweetX, y + h - 2);
  g.lineBetween(sweetX + sweetW, y + 2, sweetX + sweetW, y + h - 2);
  const nx = x + 2 + (w - 4) * fill;
  g.fillStyle(0x0b0b0c, 0.55);
  g.fillCircle(nx, y + h / 2, 8);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(nx, y + h / 2, 6);
  if (sweet) {
    g.fillStyle(0xe8ff47, 0.55);
    g.fillCircle(nx, y + h / 2, 3);
  }
}

export function drawReticle(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setDepth(8);
}

export function renderReticle(g: Phaser.GameObjects.Graphics, x: number, y: number, valid: boolean): void {
  g.clear();
  const color = valid ? 0xe8ff47 : 0xff8bd1;
  g.fillStyle(color, 0.14);
  g.fillCircle(x, y, 18);
  g.lineStyle(3, color, 0.95);
  g.strokeCircle(x, y, 14);
  g.lineStyle(2, color, 0.45);
  g.strokeCircle(x, y, 24);
  g.lineBetween(x - 22, y, x - 9, y);
  g.lineBetween(x + 9, y, x + 22, y);
  g.lineBetween(x, y - 22, x, y - 9);
  g.lineBetween(x, y + 9, x, y + 22);
  g.fillStyle(color, 0.9);
  g.fillCircle(x, y, 2.4);
}

export function addKeeperGloves(
  scene: Phaser.Scene,
  keeper: Phaser.GameObjects.Container,
): { left: Phaser.GameObjects.Container; right: Phaser.GameObjects.Container } {
  const make = (side: number) => {
    const glove = scene.add.container(side * 22, -4);
    const pad = scene.add.ellipse(0, 0, 16, 18, 0xff7a45, 1);
    const rim = scene.add.ellipse(0, -1, 11, 12, 0xe8ff47, 0.35);
    glove.add([pad, rim]);
    keeper.add(glove);
    return glove;
  };
  return { left: make(-1), right: make(1) };
}
