import Phaser from 'phaser';
import { H, W } from '../game/layout';

export const GOAL = {
  cx: W * 0.5,
  barY: 172,
  lineY: 324,
  innerL: 72,
  innerR: 318,
  post: 7,
};

export const SPOT = { x: W * 0.5, y: 618 };
export const KICKER_POS = { x: W * 0.5 + 58, y: 704 };
export const KEEPER_HOME = { x: W * 0.5, y: 298 };

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
  glow.lineStyle(10, 0x7cffb2, 0.12);
  glow.strokeRoundedRect(innerL - 8, barY - 8, w + 16, h + 10, 8);

  const frame = scene.add.graphics().setDepth(6);
  frame.fillStyle(0xe8ff47, 1);
  frame.fillRoundedRect(innerL - post, barY - post, w + post * 2, post, 4);
  frame.fillRoundedRect(innerL - post, barY, post, h, 4);
  frame.fillRoundedRect(innerR, barY, post, h, 4);
  frame.fillStyle(0xffffff, 0.55);
  frame.fillRect(innerL - post + 2, barY - post + 2, w + post * 2 - 8, 3);
  frame.fillRect(innerL - post + 2, barY, 3, h - 4);
  frame.fillStyle(0x0b0b0c, 0.25);
  frame.fillRect(innerR + 2, barY + 4, 3, h - 8);

  const boots = scene.add.graphics().setDepth(6);
  boots.fillStyle(0x1a1c20, 1);
  boots.fillRoundedRect(innerL - 16, lineY - 4, 22, 12, 3);
  boots.fillRoundedRect(innerR - 6, lineY - 4, 22, 12, 3);
}

export function drawLabBall(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y).setDepth(22);
  const glow = scene.add.circle(0, 0, 18, 0xe8ff47, 0.2);
  const shade = scene.add.circle(1, 3, 13, 0x2a2c22, 1);
  const body = scene.add.circle(0, 0, 13, 0xf4f1ea, 1);
  const g = scene.add.graphics();
  g.lineStyle(1.6, 0x7cffb2, 0.85);
  g.strokeCircle(0, 0, 8.5);
  g.lineStyle(1.2, 0xff7a45, 0.55);
  g.beginPath();
  g.arc(0, 0, 8.5, 0.4, 2.2);
  g.strokePath();
  g.fillStyle(0x0b0b0c, 0.28);
  g.fillCircle(0, 0, 2.4);
  const hi = scene.add.ellipse(-4, -5, 7, 4, 0xffffff, 0.55);
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
  const len = 78 + height * 36;
  const ex = x + Math.sin(angle) * len;
  const ey = y - Math.cos(angle) * len * (0.72 + height * 0.22);
  const color = hot ? 0xe8ff47 : 0x7cffb2;
  g.lineStyle(5, color, 0.18);
  g.lineBetween(x, y, ex, ey);
  g.lineStyle(2.4, color, 0.95);
  g.lineBetween(x, y, ex, ey);
  const nx = Math.sin(angle);
  const ny = -Math.cos(angle);
  const px = -ny;
  const py = nx;
  g.fillStyle(color, 1);
  g.fillTriangle(ex + nx * 12, ey + ny * 12, ex + px * 7, ey + py * 7, ex - px * 7, ey - py * 7);
}

export function drawPowerMeter(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setDepth(25);
}

export function renderPowerMeter(g: Phaser.GameObjects.Graphics, power: number, sweet: boolean): void {
  const x = 48;
  const y = 778;
  const w = W - 96;
  const h = 16;
  g.clear();
  g.fillStyle(0x0b0b0c, 0.55);
  g.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 10);
  g.fillStyle(0x1a1e18, 1);
  g.fillRoundedRect(x, y, w, h, 8);
  g.fillStyle(0x7cffb2, 0.16);
  g.fillRoundedRect(x + w * 0.55, y + 2, w * 0.3, h - 4, 6);
  const fill = Math.max(0.04, Math.min(1, power));
  g.fillStyle(sweet ? 0xe8ff47 : 0xff7a45, 0.95);
  g.fillRoundedRect(x + 2, y + 2, (w - 4) * fill, h - 4, 6);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(x + (w - 4) * fill, y + h / 2, 5);
}

export function drawReticle(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setDepth(8);
}

export function renderReticle(g: Phaser.GameObjects.Graphics, x: number, y: number, valid: boolean): void {
  g.clear();
  const color = valid ? 0xe8ff47 : 0xff8bd1;
  g.lineStyle(2, color, 0.85);
  g.strokeCircle(x, y, 11);
  g.lineStyle(1, color, 0.45);
  g.strokeCircle(x, y, 18);
  g.lineBetween(x - 16, y, x - 7, y);
  g.lineBetween(x + 7, y, x + 16, y);
  g.lineBetween(x, y - 16, x, y - 7);
  g.lineBetween(x, y + 7, x, y + 16);
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
