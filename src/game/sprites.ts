import Phaser from 'phaser';
import { creature, radiusPx } from './canon';
import { DANGER_Y, FLOOR_Y, H, INNER_L, INNER_R, W, WALL, WELL_TOP } from './layout';
import { drawVeggieArt } from './veggies';

export function paintLabBackdrop(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(0x101014, 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(0x171820, 1);
  g.fillRect(0, 0, W, 230);
  g.fillStyle(0xe8ff47, 0.055);
  g.fillCircle(52, 78, 110);
  g.fillStyle(0x6ee7ff, 0.045);
  g.fillCircle(W - 24, 168, 96);
  g.fillStyle(0xff8bd1, 0.03);
  g.fillCircle(W * 0.5, 760, 140);
  g.fillStyle(0x050506, 0.22);
  g.fillRect(0, 740, W, H - 740);
}

export function paintArena(scene: Phaser.Scene): void {
  paintLabBackdrop(scene);
  const g = scene.add.graphics().setDepth(0);
  const wellW = INNER_R - INNER_L;
  const wellH = FLOOR_Y - WELL_TOP;

  g.fillStyle(0x3a3b46, 1);
  g.fillRoundedRect(INNER_L - 8, WELL_TOP - 10, wellW + 16, wellH + WALL + 16, 28);
  g.fillStyle(0x2a2b36, 1);
  g.fillRoundedRect(INNER_L - 3, WELL_TOP - 3, wellW + 6, wellH + 8, 22);
  g.fillStyle(0x1c1d26, 1);
  g.fillRoundedRect(INNER_L, WELL_TOP, wellW, wellH + 2, 20);
  g.fillStyle(0x23242e, 1);
  g.fillRoundedRect(INNER_L + 6, WELL_TOP + 14, wellW - 12, wellH - 22, 16);

  g.fillStyle(0xe8ff47, 0.07);
  g.fillRoundedRect(INNER_L + 10, WELL_TOP + 8, wellW - 20, 30, 12);
  g.fillStyle(0xf4f1ea, 0.08);
  g.fillRoundedRect(INNER_L + 16, FLOOR_Y - 26, wellW - 32, 18, 8);

  g.fillStyle(0xd8d4cc, 0.55);
  g.fillRect(INNER_L - WALL, WELL_TOP - 4, WALL, FLOOR_Y - (WELL_TOP - 4) + WALL);
  g.fillRect(INNER_R, WELL_TOP - 4, WALL, FLOOR_Y - (WELL_TOP - 4) + WALL);
  g.fillRect(INNER_L - WALL, FLOOR_Y, wellW + WALL * 2, WALL);

  g.fillStyle(0xffffff, 0.22);
  g.fillRect(INNER_L - WALL + 3, WELL_TOP, 4, FLOOR_Y - WELL_TOP);
  g.fillStyle(0xf4f1ea, 0.5);
  g.fillRect(INNER_L - WALL, FLOOR_Y, wellW + WALL * 2, 4);
  g.fillStyle(0x2a2c36, 1);
  g.fillRect(INNER_L + 2, FLOOR_Y - 6, wellW - 4, 6);

  g.fillStyle(0xff3b4a, 0.1);
  g.fillRect(INNER_L, DANGER_Y - 18, wellW, 36);

  g.lineStyle(2, 0xe8ff47, 0.22);
  g.strokeRoundedRect(INNER_L + 1, WELL_TOP + 1, wellW - 2, wellH - 2, 18);
  g.lineStyle(1, 0xffffff, 0.12);
  g.strokeRoundedRect(INNER_L + 6, WELL_TOP + 8, wellW - 12, wellH - 16, 14);
}

/** LAB-only vegetable silhouettes. JUMP/SHIFT must use their own casts. */
export function drawCreature(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
  radius = radiusPx(tier),
): Phaser.GameObjects.Container {
  const c = creature(tier);
  const r = radius;
  const root = scene.add.container(x, y);
  const glow = scene.add.circle(0, 0, r * 1.22, c.color, 0.18);
  const art = drawVeggieArt(scene, tier, r);
  const code = scene.add
    .text(0, r * 0.78, c.code, {
      fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
      fontSize: `${Math.max(8, r * 0.26)}px`,
      color: '#F4F1EA',
      fontStyle: 'bold',
      stroke: '#0B0B0C',
      strokeThickness: Math.max(2, r * 0.08),
    })
    .setOrigin(0.5);
  root.add([glow, art, code]);
  root.setDepth(10);
  return root;
}

export function drawCreatureAtRadius(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
  r: number,
  _alpha = 1,
): Phaser.GameObjects.Container {
  return drawCreature(scene, x, y, tier, r);
}
