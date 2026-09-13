import Phaser from 'phaser';

const HULL = 0x1a2740;
const STEEL = 0x2a3f5c;
const MID = 0x3a5f8a;
const LIME = 0xe8ff47;
const CYAN = 0x6ee7ff;
const INK = 0x0b0b0c;
const ROCK = 0x5a6574;
const ROCK_LIT = 0x8a93a0;

export type CraftRig = {
  root: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  flame: Phaser.GameObjects.Ellipse;
};

/** ALPHA-11 PULSO — angular steel/navy interceptor. Never a produce silhouette. */
export function drawPulseCraft(scene: Phaser.Scene, x: number, y: number): CraftRig {
  const root = scene.add.container(x, y).setDepth(22);
  const glow = scene.add.circle(0, 10, 28, MID, 0.22);
  const flame = scene.add.ellipse(0, 34, 8, 22, LIME, 0.95);

  const g = scene.add.graphics();
  g.fillStyle(INK, 0.34);
  g.fillTriangle(-16, 18, 16, 18, 0, 28);

  // Twin rectangular engine bells
  g.fillStyle(0x121820, 1);
  g.fillRect(-12, 16, 9, 12);
  g.fillRect(3, 16, 9, 12);
  g.fillStyle(CYAN, 0.55);
  g.fillRect(-10, 18, 5, 6);
  g.fillRect(5, 18, 5, 6);
  g.fillStyle(LIME, 0.9);
  g.fillRect(-9, 26, 3, 3);
  g.fillRect(6, 26, 3, 3);

  // Swept hard wings (chevrons, not leaves)
  g.fillStyle(CYAN, 1);
  g.fillTriangle(-4, 2, -30, 16, -14, 20);
  g.fillTriangle(4, 2, 30, 16, 14, 20);
  g.fillStyle(STEEL, 1);
  g.fillTriangle(-6, 4, -26, 15, -12, 18);
  g.fillTriangle(6, 4, 26, 15, 12, 18);
  g.fillStyle(LIME, 1);
  g.fillTriangle(-22, 16, -12, 8, -10, 14);
  g.fillTriangle(22, 16, 12, 8, 10, 14);

  // Faceted hexagonal hull — boxy dart, not a capsule/aubergine
  g.fillStyle(HULL, 1);
  g.beginPath();
  g.moveTo(0, -26);
  g.lineTo(8, -14);
  g.lineTo(11, 4);
  g.lineTo(7, 18);
  g.lineTo(-7, 18);
  g.lineTo(-11, 4);
  g.lineTo(-8, -14);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, LIME, 0.9);
  g.beginPath();
  g.moveTo(0, -26);
  g.lineTo(8, -14);
  g.lineTo(11, 4);
  g.lineTo(7, 18);
  g.lineTo(-7, 18);
  g.lineTo(-11, 4);
  g.lineTo(-8, -14);
  g.closePath();
  g.strokePath();

  g.fillStyle(MID, 1);
  g.beginPath();
  g.moveTo(0, -20);
  g.lineTo(5, -10);
  g.lineTo(6, 6);
  g.lineTo(4, 15);
  g.lineTo(-4, 15);
  g.lineTo(-6, 6);
  g.lineTo(-5, -10);
  g.closePath();
  g.fillPath();

  // Rectangular canopy + hard window panes
  g.fillStyle(CYAN, 1);
  g.fillRect(-6, -12, 12, 12);
  g.fillStyle(0x143046, 1);
  g.fillRect(-5, -11, 10, 10);
  g.lineStyle(1.2, CYAN, 0.85);
  g.lineBetween(0, -11, 0, -1);
  g.lineBetween(-5, -6, 5, -6);
  g.fillStyle(0xf4f1ea, 0.45);
  g.fillRect(-4, -10, 3, 3);

  // Deck plates / hard lights — never a seed or stem
  g.fillStyle(LIME, 1);
  g.fillRect(-3, 6, 6, 4);
  g.fillStyle(INK, 1);
  g.fillRect(-2, 7, 4, 2);
  g.lineStyle(1.8, LIME, 1);
  g.lineBetween(-5, 2, -5, 8);
  g.lineBetween(5, 2, 5, 8);
  g.lineStyle(1.5, LIME, 0.85);
  g.lineBetween(-6, 17, 6, 17);

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
  const pts = 6 + (variant % 2);
  g.fillStyle(INK, 0.28);
  g.fillCircle(2, 3, r + 2);
  g.fillStyle(ROCK, 1);
  g.beginPath();
  for (let i = 0; i < pts; i++) {
    const a = (Math.PI * 2 * i) / pts - Math.PI / 2;
    const wobble = 0.78 + ((variant * 17 + i * 13) % 11) / 36;
    const x = Math.cos(a) * r * wobble;
    const y = Math.sin(a) * r * wobble;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
  g.fillStyle(ROCK_LIT, 1);
  g.fillRect(-r * 0.28, -r * 0.28, r * 0.34, r * 0.22);
  g.fillStyle(CYAN, 0.4);
  g.fillRect(r * 0.08, r * 0.04, r * 0.18, r * 0.14);
  g.lineStyle(1.4, 0xf4f1ea, 0.28);
  g.strokeCircle(0, 0, r * 0.92);
  root.add(g);
  return root;
}

export function drawSentry(scene: Phaser.Scene, elite: boolean): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const body = elite ? 0xff7a45 : MID;
  g.fillStyle(body, 0.2);
  g.fillCircle(0, 0, 18);
  g.fillStyle(HULL, 1);
  g.fillRect(-16, -5, 32, 10);
  g.fillStyle(body, 1);
  g.fillTriangle(0, -14, 12, 4, 0, 12);
  g.fillTriangle(0, -14, -12, 4, 0, 12);
  g.fillStyle(INK, 1);
  g.fillRect(-5, -4, 10, 8);
  g.fillStyle(CYAN, 1);
  g.fillRect(-3.5, -2.5, 7, 5);
  g.fillStyle(0xf4f1ea, 0.7);
  g.fillRect(-2.6, -1.6, 2, 2);
  g.fillStyle(LIME, 0.95);
  g.fillTriangle(-16, 2, -8, -2, -8, 6);
  g.fillTriangle(16, 2, 8, -2, 8, 6);
  if (elite) {
    g.fillStyle(LIME, 1);
    g.fillRect(-8, 8, 3, 3);
    g.fillRect(5, 8, 3, 3);
  }
  root.add(g);
  return root;
}

export function drawBolt(scene: Phaser.Scene, enemy: boolean): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);
  const color = enemy ? 0xff7a45 : LIME;
  const glow = scene.add.circle(0, 0, enemy ? 7 : 8, color, 0.36);
  const core = scene.add.rectangle(0, 0, enemy ? 5 : 4, enemy ? 14 : 20, color, 1);
  const tip = scene.add.rectangle(0, enemy ? 5 : -8, 3, 6, 0xf4f1ea, 0.9);
  root.add([glow, core, tip]);
  return root;
}
