import Phaser from 'phaser';

const SKIN = 0xf3c7a0;
const HAIR_K = 0x2a2118;
const HAIR_G = 0xc45a4a;
const BOOT = 0x1a1612;
const LIME = 0xe8ff47;
const CYAN = 0x6ee7ff;
const INK = 0x0b0b0c;
const GLOVE = 0xff7a45;

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
  g.fillCircle(1.2, y + 2, 11.4);
  g.fillStyle(SKIN, 1);
  g.fillCircle(0, y, 11);
  g.fillStyle(hair, 1);
  if (keeper) {
    g.fillEllipse(0, y - 8, 22, 10);
    g.fillRoundedRect(-11, y - 14, 22, 10, 6);
  } else {
    g.fillEllipse(0, y - 7, 20, 9);
    g.fillRoundedRect(-10, y - 13, 20, 9, 5);
  }
  g.fillStyle(0x2a2118, 1);
  g.fillCircle(-3.6, y - 0.4, 1.7);
  g.fillCircle(3.6, y - 0.4, 1.7);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(-3.1, y - 1, 0.55);
  g.fillCircle(4.1, y - 1, 0.55);
  g.lineStyle(1.6, 0xc45a4a, 1);
  g.beginPath();
  g.arc(0, y + 3.2, 3.6, 0.2, Math.PI - 0.2);
  g.strokePath();
  g.fillStyle(0xffffff, 0.32);
  g.fillEllipse(-4, y - 3, 6, 3);
  parent.add(g);
}

/** Striker in an original ALPHA-11 kit — not a licensed club or produce. */
export function drawKicker(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y).setDepth(20);
  const g = scene.add.graphics();

  g.fillStyle(INK, 0.3);
  g.fillEllipse(2, 22, 18, 7);

  const shorts = 0x1a2230;
  g.fillStyle(shorts, 1);
  g.fillRoundedRect(-11, 4, 22, 12, 4);
  g.fillStyle(LIME, 1);
  g.fillRect(-11, 4, 22, 2);

  g.fillStyle(0x243044, 1);
  g.fillRoundedRect(-12, -8, 10, 14, 4);
  g.fillRoundedRect(2, -4, 10, 16, 4);
  g.fillStyle(BOOT, 1);
  g.fillRoundedRect(-16, 4, 14, 8, 3);
  g.fillRoundedRect(6, 8, 14, 8, 3);
  g.fillStyle(LIME, 0.85);
  g.fillRect(-14, 8, 8, 2);
  g.fillRect(8, 12, 8, 2);

  g.fillStyle(0x1e6b8a, 1);
  g.fillRoundedRect(-13, -18, 26, 20, 7);
  g.fillStyle(CYAN, 1);
  g.fillRoundedRect(-13, -18, 26, 6, 6);
  g.fillStyle(LIME, 1);
  g.fillRoundedRect(-5, -10, 10, 10, 3);
  g.fillStyle(INK, 1);
  g.fillRoundedRect(-3.5, -8.5, 7, 7, 2);

  const num = scene.add
    .text(0, -5, '11', {
      fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
      fontSize: '8px',
      color: '#E8FF47',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  g.fillStyle(CYAN, 1);
  g.fillRoundedRect(-20, -14, 8, 8, 3);
  g.fillRoundedRect(12, -12, 8, 10, 3);
  g.fillStyle(SKIN, 1);
  g.fillCircle(-20, -8, 4.4);
  g.fillCircle(20, -4, 4.4);

  root.add(g);
  head(scene, root, -26, HAIR_K, false);
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
  g.fillEllipse(1, 20, 20, 7);

  g.fillStyle(0x243044, 1);
  g.fillRoundedRect(-13, 2, 10, 16, 4);
  g.fillRoundedRect(3, 2, 10, 16, 4);
  g.fillStyle(0x3a2a1c, 1);
  g.fillRoundedRect(-15, 16, 13, 7, 3);
  g.fillRoundedRect(2, 16, 13, 7, 3);

  g.fillStyle(0x1a2238, 1);
  g.fillRoundedRect(-12, 2, 24, 12, 4);
  g.fillStyle(0x8b9bff, 1);
  g.fillRect(-12, 2, 24, 2);

  g.fillStyle(0x2a2048, 1);
  g.fillRoundedRect(-15, -18, 30, 22, 8);
  g.fillStyle(0x8b9bff, 1);
  g.fillRoundedRect(-15, -18, 30, 7, 7);
  g.fillStyle(LIME, 1);
  g.fillRoundedRect(-7, -8, 14, 8, 3);
  g.fillStyle(INK, 1);
  g.fillRoundedRect(-5, -6, 10, 5, 2);

  const badge = scene.add
    .text(0, -3, '1', {
      fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
      fontSize: '8px',
      color: '#E8FF47',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  root.add(g);
  head(scene, root, -26, HAIR_G, true);
  root.add(badge);

  const makeGlove = (side: number) => {
    const glove = scene.add.container(side * 20, -4);
    const pad = scene.add.graphics();
    pad.fillStyle(INK, 0.28);
    pad.fillEllipse(1, 2, 16, 18);
    pad.fillStyle(GLOVE, 1);
    pad.fillEllipse(0, 0, 16, 18);
    pad.fillStyle(LIME, 0.4);
    pad.fillEllipse(0, -1, 10, 11);
    pad.fillStyle(0xffffff, 0.28);
    pad.fillEllipse(-3, -4, 6, 4);
    glove.add(pad);
    limb(scene, root, side * 16, -10, 7, 10, 0x8b9bff, 3);
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
