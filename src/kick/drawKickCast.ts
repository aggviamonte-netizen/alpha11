import Phaser from 'phaser';

const SKIN = 0xf3c7a0;
const HAIR_K = 0x2a2118;
const HAIR_G = 0xc45a4a;
const BOOT = 0x1a1612;
const LIME = 0xe8ff47;
const CYAN = 0x6ee7ff;
const INK = 0x0b0b0c;
const GLOVE = 0xff7a45;
const KIT = 0x1e6b8a;
const SHORTS = 0x1a2230;
const SOCK = 0xf4f1ea;

export type KickGloves = {
  left: Phaser.GameObjects.Container;
  right: Phaser.GameObjects.Container;
};

function limb(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  rx = 4,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(INK, 0.28);
  g.fillRoundedRect(-w / 2 + 1, 1, w, h, rx);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, 0, w, h, rx);
  g.fillStyle(0xffffff, 0.16);
  g.fillRoundedRect(-w / 2 + 2, 1, w * 0.35, h * 0.45, 2);
  c.add(g);
  parent.add(c);
  return c;
}

function head(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  y: number,
  hair: number,
  keeper: boolean,
): void {
  const g = scene.add.graphics();
  g.fillStyle(INK, 0.28);
  g.fillCircle(1.2, y + 2, 10.6);
  g.fillStyle(SKIN, 1);
  g.fillCircle(0, y, 10);
  g.fillStyle(hair, 1);
  if (keeper) {
    g.fillRect(-10, y - 12, 20, 8);
    g.fillRect(-8, y - 16, 16, 6);
    g.fillStyle(INK, 0.55);
    g.fillRect(-11, y - 6, 22, 3);
  } else {
    g.fillRect(-9, y - 11, 18, 7);
    g.fillTriangle(-9, y - 11, 9, y - 11, 0, y - 17);
  }
  g.fillStyle(0x2a2118, 1);
  g.fillRect(-5.2, y - 1.4, 2.4, 2.4);
  g.fillRect(2.8, y - 1.4, 2.4, 2.4);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(-3.2, y - 1.2, 0.5);
  g.fillCircle(4, y - 1.2, 0.5);
  g.lineStyle(1.5, 0xc45a4a, 1);
  g.beginPath();
  g.arc(0, y + 2.8, 3.2, 0.2, Math.PI - 0.2);
  g.strokePath();
  parent.add(g);
}

/** Striker in an original ALPHA-11 kit — human footballer, never produce. */
export function drawKicker(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y).setDepth(20);
  const g = scene.add.graphics();

  g.fillStyle(INK, 0.3);
  g.fillEllipse(2, 24, 20, 7);

  // Run-up: plant right, striking left toward the spot.
  g.fillStyle(SHORTS, 1);
  g.fillRoundedRect(-14, 1, 26, 12, 3);
  g.fillStyle(LIME, 1);
  g.fillRect(-14, 1, 26, 2);
  g.fillStyle(CYAN, 0.9);
  g.fillRect(-14, 11, 26, 2);

  g.fillStyle(SOCK, 1);
  g.fillRect(-16, 12, 9, 8);
  g.fillRect(6, 13, 9, 7);
  g.fillStyle(LIME, 1);
  g.fillRect(-16, 12, 9, 2);
  g.fillRect(6, 13, 9, 2);
  g.fillStyle(0xd8d4cc, 1);
  g.fillRoundedRect(-15, 15, 7, 5, 1);
  g.fillRoundedRect(7, 16, 7, 4, 1);

  g.fillStyle(BOOT, 1);
  g.fillRoundedRect(-22, 18, 18, 7, 2);
  g.fillRoundedRect(6, 18, 16, 7, 2);
  g.fillStyle(LIME, 0.95);
  g.fillRect(-20, 21, 10, 2);
  g.fillRect(8, 21, 8, 2);

  g.fillStyle(SKIN, 1);
  g.fillRect(-5, -21, 8, 5);
  g.fillStyle(KIT, 1);
  g.fillRoundedRect(-14, -17, 27, 21, 5);
  g.fillStyle(CYAN, 1);
  g.fillRect(-14, -17, 27, 5);
  g.fillStyle(LIME, 1);
  g.fillRect(-14, -3, 27, 2);
  g.fillRoundedRect(-6, -11, 11, 9, 2);
  g.fillStyle(INK, 1);
  g.fillRoundedRect(-4.5, -9.5, 8, 6, 2);

  const num = scene.add
    .text(0, -6, '11', {
      fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
      fontSize: '8px',
      color: '#E8FF47',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  g.fillStyle(CYAN, 1);
  g.fillRoundedRect(-22, -13, 9, 11, 3);
  g.fillRoundedRect(12, -12, 9, 13, 3);
  g.fillStyle(0xff7a45, 1);
  g.fillRect(-22, -8, 9, 3);
  g.fillStyle(SKIN, 1);
  g.fillCircle(-22, -4, 4.2);
  g.fillCircle(21, -1, 4.2);

  root.add(g);
  head(scene, root, -27, HAIR_K, false);
  root.add(num);
  return root;
}

/** Keeper with dive gloves as separate nodes so tells still stretch. */
export function drawKeeper(
  scene: Phaser.Scene,
  x: number,
  y: number,
): { root: Phaser.GameObjects.Container; gloves: KickGloves } {
  const root = scene.add.container(x, y).setDepth(16);
  const g = scene.add.graphics();

  g.fillStyle(INK, 0.28);
  g.fillEllipse(1, 24, 24, 7);

  g.fillStyle(0x243044, 1);
  g.fillRect(-16, 6, 10, 12);
  g.fillRect(6, 6, 10, 12);
  g.fillStyle(SOCK, 1);
  g.fillRect(-16, 16, 10, 5);
  g.fillRect(6, 16, 10, 5);
  g.fillStyle(0x3a2a1c, 1);
  g.fillRoundedRect(-18, 19, 14, 6, 2);
  g.fillRoundedRect(4, 19, 14, 6, 2);

  g.fillStyle(0x1a2238, 1);
  g.fillRoundedRect(-15, 3, 30, 12, 4);
  g.fillStyle(0x8b9bff, 1);
  g.fillRect(-15, 3, 30, 2);
  g.fillStyle(LIME, 1);
  g.fillRect(-15, 13, 30, 2);

  g.fillStyle(SKIN, 1);
  g.fillRect(-4, -20, 8, 4);
  g.fillStyle(0x2a2048, 1);
  g.fillRoundedRect(-16, -18, 32, 22, 6);
  g.fillStyle(0x8b9bff, 1);
  g.fillRect(-16, -18, 32, 6);
  g.fillStyle(LIME, 1);
  g.fillRoundedRect(-8, -8, 16, 9, 2);
  g.fillStyle(INK, 1);
  g.fillRoundedRect(-6, -6, 12, 5, 2);

  const badge = scene.add
    .text(0, -3, '1', {
      fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
      fontSize: '8px',
      color: '#E8FF47',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  root.add(g);
  head(scene, root, -27, HAIR_G, true);
  root.add(badge);

  const makeGlove = (side: number) => {
    const glove = scene.add.container(side * 24, -2);
    const pad = scene.add.graphics();
    pad.fillStyle(INK, 0.28);
    pad.fillRoundedRect(-10, -10, 20, 22, 6);
    pad.fillStyle(GLOVE, 1);
    pad.fillRoundedRect(-10, -11, 20, 22, 6);
    pad.fillStyle(LIME, 0.5);
    pad.fillRoundedRect(-6, -7, 12, 12, 4);
    pad.fillStyle(0xffffff, 0.32);
    pad.fillRect(-6, -8, 6, 3);
    pad.fillStyle(CYAN, 0.55);
    pad.fillCircle(side * 3, 6, 2.2);
    glove.add(pad);
    limb(scene, root, side * 17, -8, 8, 11, 0x8b9bff, 3);
    root.add(glove);
    return glove;
  };

  const gloves = { left: makeGlove(-1), right: makeGlove(1) };
  return { root, gloves };
}

export const KICK_CHIP = {
  code: 'KICK',
  hex: '#FF7A45',
};
