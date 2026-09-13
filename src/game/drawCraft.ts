import Phaser from 'phaser';

const HULL = 0x1a2740;
const MID = 0x3a5f8a;
const LIME = 0xe8ff47;
const CYAN = 0x6ee7ff;
const PINK = 0xff8bd1;
const INK = 0x0b0b0c;
const ROCK = 0x4a435c;
const ROCK_LIT = 0x7a7188;

export type CraftRig = {
  root: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  flame: Phaser.GameObjects.Ellipse;
};

/** Original ALPHA-11 PULSO dart — lab probe, not a licensed fighter. */
export function drawPulseCraft(scene: Phaser.Scene, x: number, y: number): CraftRig {
  const root = scene.add.container(x, y).setDepth(22);
  const glow = scene.add.circle(0, 8, 30, MID, 0.28);
  const flame = scene.add.ellipse(0, 32, 10, 24, LIME, 0.95);

  const g = scene.add.graphics();
  g.fillStyle(INK, 0.32);
  g.fillEllipse(1, 12, 28, 20);

  g.fillStyle(0x122033, 1);
  g.fillRoundedRect(-15, 16, 11, 13, 4);
  g.fillRoundedRect(4, 16, 11, 13, 4);
  g.fillStyle(CYAN, 0.4);
  g.fillRoundedRect(-13, 18, 7, 7, 2);
  g.fillRoundedRect(6, 18, 7, 7, 2);

  g.fillStyle(CYAN, 1);
  g.beginPath();
  g.moveTo(-6, 0);
  g.lineTo(-28, 18);
  g.lineTo(-18, 22);
  g.lineTo(-4, 10);
  g.closePath();
  g.fillPath();
  g.beginPath();
  g.moveTo(6, 0);
  g.lineTo(28, 18);
  g.lineTo(18, 22);
  g.lineTo(4, 10);
  g.closePath();
  g.fillPath();
  g.fillStyle(LIME, 0.85);
  g.fillTriangle(-22, 19, -10, 8, -7, 14);
  g.fillTriangle(22, 19, 10, 8, 7, 14);

  g.fillStyle(HULL, 1);
  g.beginPath();
  g.moveTo(0, -28);
  g.lineTo(13, 2);
  g.lineTo(10, 20);
  g.lineTo(-10, 20);
  g.lineTo(-13, 2);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, LIME, 0.85);
  g.beginPath();
  g.moveTo(0, -28);
  g.lineTo(13, 2);
  g.lineTo(10, 20);
  g.lineTo(-10, 20);
  g.lineTo(-13, 2);
  g.closePath();
  g.strokePath();
  g.fillStyle(MID, 1);
  g.beginPath();
  g.moveTo(0, -22);
  g.lineTo(8, 4);
  g.lineTo(6, 17);
  g.lineTo(-6, 17);
  g.lineTo(-8, 4);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.2);
  g.fillTriangle(-2, -16, 4, 3, -6, 3);

  g.fillStyle(CYAN, 1);
  g.fillEllipse(0, -8, 13, 16);
  g.fillStyle(0x143046, 1);
  g.fillEllipse(0, -8, 8, 11);
  g.fillStyle(0xf4f1ea, 0.55);
  g.fillEllipse(-2, -11, 4, 5);

  g.fillStyle(PINK, 1);
  g.fillCircle(0, 8, 4.2);
  g.fillStyle(0xf4f1ea, 0.5);
  g.fillCircle(-1.2, 7, 1.6);

  g.lineStyle(2.1, LIME, 1);
  g.lineBetween(-4, -1, -4, 6);
  g.lineBetween(4, -1, 4, 6);
  g.lineStyle(1.6, LIME, 0.9);
  g.lineBetween(-7, 19, 7, 19);

  root.add([glow, flame, g]);
  return { root, glow, flame };
}

export function poseCraft(rig: CraftRig, vx: number, pulse: number, thrusting: boolean): void {
  rig.root.setRotation(Phaser.Math.Clamp(vx / 380, -0.38, 0.38));
  const flicker = thrusting ? 0.72 + Math.sin(pulse * 38) * 0.28 : 0.22 + Math.sin(pulse * 8) * 0.08;
  rig.flame.setScale(0.7 + flicker * 0.45, 0.85 + flicker * 0.55);
  rig.flame.setAlpha(flicker);
  rig.glow.setAlpha(0.14 + flicker * 0.12);
}

export function drawAsteroid(scene: Phaser.Scene, variant: number): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const r = variant === 2 ? 22 : variant === 1 ? 17 : 13;
  const pts = 7 + (variant % 3);
  g.fillStyle(INK, 0.28);
  g.fillCircle(2, 3, r + 2);
  g.fillStyle(ROCK, 1);
  g.beginPath();
  for (let i = 0; i < pts; i++) {
    const a = (Math.PI * 2 * i) / pts - Math.PI / 2;
    const wobble = 0.72 + ((variant * 17 + i * 13) % 11) / 28;
    const x = Math.cos(a) * r * wobble;
    const y = Math.sin(a) * r * wobble;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  g.fillStyle(ROCK_LIT, 1);
  g.fillCircle(-r * 0.22, -r * 0.2, r * 0.34);
  g.fillStyle(LIME, 0.55);
  g.fillCircle(r * 0.18, r * 0.08, r * 0.16);
  g.fillStyle(PINK, 0.35);
  g.fillCircle(-r * 0.08, r * 0.28, r * 0.1);
  g.lineStyle(1.4, 0xf4f1ea, 0.28);
  g.strokeCircle(0, 0, r * 0.92);
  root.add(g);
  return root;
}

export function drawSentry(scene: Phaser.Scene, elite: boolean): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const body = elite ? PINK : MID;
  g.fillStyle(body, 0.22);
  g.fillCircle(0, 0, 18);
  g.fillStyle(HULL, 1);
  g.fillRoundedRect(-15, -6, 30, 12, 6);
  g.fillStyle(body, 1);
  g.beginPath();
  g.moveTo(0, -14);
  g.lineTo(12, 4);
  g.lineTo(0, 13);
  g.lineTo(-12, 4);
  g.closePath();
  g.fillPath();
  g.fillStyle(INK, 1);
  g.fillCircle(0, -1, 6.2);
  g.fillStyle(CYAN, 1);
  g.fillCircle(0, -1, 4.2);
  g.fillStyle(0xf4f1ea, 0.7);
  g.fillCircle(-1.4, -2.4, 1.4);
  g.fillStyle(LIME, 0.9);
  g.fillTriangle(-16, 2, -8, -2, -8, 6);
  g.fillTriangle(16, 2, 8, -2, 8, 6);
  if (elite) {
    g.fillStyle(LIME, 1);
    g.fillCircle(-7, 8, 2);
    g.fillCircle(7, 8, 2);
  }
  root.add(g);
  return root;
}

export function drawBolt(scene: Phaser.Scene, enemy: boolean): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);
  const color = enemy ? PINK : LIME;
  const glow = scene.add.circle(0, 0, enemy ? 7 : 8, color, 0.36);
  const core = scene.add.ellipse(0, 0, enemy ? 7 : 6, enemy ? 14 : 20, color, 1);
  const tip = scene.add.ellipse(0, enemy ? 5 : -7, 3.4, 7, 0xf4f1ea, 0.9);
  root.add([glow, core, tip]);
  return root;
}
