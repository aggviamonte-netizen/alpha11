import Phaser from 'phaser';

const HULL = 0x2a2048;
const MID = 0x7b4dff;
const LIME = 0xe8ff47;
const CYAN = 0x6ee7ff;
const PINK = 0xff8bd1;
const INK = 0x0b0b0c;

export type CraftRig = {
  root: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  flame: Phaser.GameObjects.Ellipse;
};

/** Original ALPHA-11 PULSO dart — lab probe flying right, not produce. */
export function drawPulseCraft(scene: Phaser.Scene, x: number, y: number): CraftRig {
  const root = scene.add.container(x, y).setDepth(22);
  const glow = scene.add.circle(-4, 0, 26, MID, 0.2);
  const flame = scene.add.ellipse(-28, 0, 20, 8, LIME, 0.92);

  const g = scene.add.graphics();
  g.fillStyle(INK, 0.32);
  g.fillEllipse(-6, 4, 22, 14);

  g.fillStyle(0x1a1628, 1);
  g.fillRoundedRect(-18, -16, 12, 9, 3);
  g.fillRoundedRect(-18, 7, 12, 9, 3);
  g.fillStyle(CYAN, 0.4);
  g.fillRoundedRect(-16, -14, 7, 5, 2);
  g.fillRoundedRect(-16, 9, 7, 5, 2);

  g.fillStyle(CYAN, 0.96);
  g.beginPath();
  g.moveTo(-2, -6);
  g.lineTo(-16, -24);
  g.lineTo(-20, -16);
  g.lineTo(-8, -3);
  g.closePath();
  g.fillPath();
  g.beginPath();
  g.moveTo(-2, 6);
  g.lineTo(-16, 24);
  g.lineTo(-20, 16);
  g.lineTo(-8, 3);
  g.closePath();
  g.fillPath();
  g.fillStyle(LIME, 0.72);
  g.fillTriangle(-16, -18, -8, -8, -12, -6);
  g.fillTriangle(-16, 18, -8, 8, -12, 6);

  g.fillStyle(HULL, 1);
  g.beginPath();
  g.moveTo(26, 0);
  g.lineTo(-2, 12);
  g.lineTo(-18, 8);
  g.lineTo(-18, -8);
  g.lineTo(-2, -12);
  g.closePath();
  g.fillPath();
  g.fillStyle(MID, 1);
  g.beginPath();
  g.moveTo(20, 0);
  g.lineTo(-2, 8);
  g.lineTo(-14, 5);
  g.lineTo(-14, -5);
  g.lineTo(-2, -8);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.18);
  g.fillTriangle(14, -2, -2, -6, -2, 2);

  g.fillStyle(CYAN, 1);
  g.fillEllipse(6, 0, 14, 11);
  g.fillStyle(0x143046, 1);
  g.fillEllipse(6, 0, 9, 7);
  g.fillStyle(0xf4f1ea, 0.55);
  g.fillEllipse(4, -2, 4, 3);

  g.fillStyle(PINK, 1);
  g.fillCircle(-6, 0, 3.4);
  g.fillStyle(0xf4f1ea, 0.5);
  g.fillCircle(-7, -1, 1.2);

  g.lineStyle(1.7, LIME, 1);
  g.lineBetween(-2, -3.4, -10, -3.4);
  g.lineBetween(-2, 3.4, -10, 3.4);
  g.lineStyle(1.2, LIME, 0.85);
  g.lineBetween(-18, -6, -18, 6);

  root.add([glow, flame, g]);
  return { root, glow, flame };
}

export function poseCraft(rig: CraftRig, vy: number, pulse: number, flapping: boolean): void {
  rig.root.setRotation(Phaser.Math.Clamp(vy / 980, -0.5, 0.72));
  const flicker = flapping ? 0.78 + Math.sin(pulse * 36) * 0.22 : 0.28 + Math.sin(pulse * 9) * 0.1;
  rig.flame.setScale(0.85 + flicker * 0.55, 0.7 + flicker * 0.4);
  rig.flame.setAlpha(flicker);
  rig.glow.setAlpha(0.14 + flicker * 0.12);
}

export const PULSO = {
  code: 'PULSO',
  color: 0x7b4dff,
  hex: '#7B4DFF',
};
