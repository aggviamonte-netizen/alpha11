import Phaser from 'phaser';

export type BlokRig = {
  root: Phaser.GameObjects.Container;
  torso: Phaser.GameObjects.Container;
  head: Phaser.GameObjects.Container;
  armL: Phaser.GameObjects.Container;
  armR: Phaser.GameObjects.Container;
  legL: Phaser.GameObjects.Container;
  legR: Phaser.GameObjects.Container;
};

const SKIN = 0xf0c094;
const HAIR = 0xe8c24a;
const SUIT = 0x1a2744;
const CLIP = 0xf4f1ea;
const BOOT = 0x2a2118;
const LIME = 0xe8ff47;

function sheen(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0xffffff, 0.38);
  g.fillEllipse(x, y, w, h);
}

export function drawBlok(scene: Phaser.Scene, x: number, y: number): BlokRig {
  const root = scene.add.container(x, y).setDepth(22);

  const shadow = scene.add.ellipse(0, 34, 36, 10, 0x000000, 0.22);
  root.add(shadow);

  const legL = scene.add.container(-7, 14);
  const legR = scene.add.container(7, 14);
  const boot = (c: Phaser.GameObjects.Container, flip: number): void => {
    const g = scene.add.graphics();
    g.fillStyle(SUIT, 1);
    g.fillRoundedRect(-5, -2, 10, 16, 3);
    g.fillStyle(BOOT, 1);
    g.fillRoundedRect(-6 + flip, 12, 13, 8, 3);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(-3, 0, 4, 10, 2);
    c.add(g);
  };
  boot(legL, -1);
  boot(legR, 1);

  const torso = scene.add.container(0, 2);
  const body = scene.add.graphics();
  body.fillStyle(0x0b0b0c, 0.35);
  body.fillRoundedRect(-13, -2, 28, 22, 7);
  body.fillStyle(SUIT, 1);
  body.fillRoundedRect(-14, -4, 28, 22, 7);
  body.fillStyle(LIME, 1);
  body.fillRoundedRect(-7, 2, 14, 10, 3);
  body.fillStyle(0x0b0b0c, 1);
  body.fillRoundedRect(-5, 4, 10, 6, 2);
  body.fillStyle(LIME, 1);
  body.fillRect(-3, 5.5, 6, 3);
  sheen(body, -5, -1, 10, 5);
  torso.add(body);

  const armL = scene.add.container(-15, 0);
  const armR = scene.add.container(15, 0);
  const arm = (c: Phaser.GameObjects.Container, dir: number): void => {
    const g = scene.add.graphics();
    g.fillStyle(SUIT, 1);
    g.fillRoundedRect(dir * 0, -3, dir * 10, 8, 3);
    g.fillStyle(SKIN, 1);
    g.fillCircle(dir * 11, 2, 5);
    g.lineStyle(2.6, CLIP, 1);
    g.beginPath();
    g.arc(dir * 14, 3, 5.2, dir > 0 ? 0.6 : Math.PI - 0.6, dir > 0 ? 2.55 : Math.PI + 2.55);
    g.strokePath();
    g.lineStyle(2.2, 0xd8d2c6, 1);
    g.beginPath();
    g.arc(dir * 14, 3, 3.4, dir > 0 ? 0.7 : Math.PI - 0.7, dir > 0 ? 2.45 : Math.PI + 2.45);
    g.strokePath();
    c.add(g);
  };
  arm(armL, -1);
  arm(armR, 1);

  const head = scene.add.container(0, -18);
  const hg = scene.add.graphics();
  hg.fillStyle(0x0b0b0c, 0.28);
  hg.fillCircle(1, 2, 16);
  hg.fillStyle(SKIN, 1);
  hg.fillCircle(0, 0, 15.5);
  hg.fillStyle(HAIR, 1);
  hg.fillEllipse(0, -8, 30, 18);
  hg.fillRoundedRect(-15, -14, 30, 12, 8);
  hg.fillStyle(0xd4a017, 1);
  hg.fillEllipse(-10, -10, 8, 7);
  hg.fillEllipse(10, -10, 8, 7);
  sheen(hg, -5, -10, 12, 6);
  hg.fillStyle(SKIN, 1);
  hg.fillEllipse(0, 2, 24, 20);
  hg.fillStyle(0x2a2118, 1);
  hg.fillCircle(-5.2, -0.5, 2.1);
  hg.fillCircle(5.2, -0.5, 2.1);
  hg.fillStyle(0xffffff, 0.85);
  hg.fillCircle(-4.5, -1.1, 0.7);
  hg.fillCircle(5.9, -1.1, 0.7);
  hg.lineStyle(1.8, 0xc45a4a, 1);
  hg.beginPath();
  hg.arc(0, 3.2, 5.2, 0.25, Math.PI - 0.25);
  hg.strokePath();
  hg.fillStyle(0xffffff, 0.42);
  hg.fillEllipse(-5, -4, 8, 4);
  head.add(hg);

  root.add([legL, legR, torso, armL, armR, head]);
  return { root, torso, head, armL, armR, legL, legR };
}

export function poseBlok(
  rig: BlokRig,
  run: number,
  grounded: boolean,
  vy: number,
  boosting: boolean,
): void {
  const swing = grounded ? Math.sin(run) : 0.15;
  const bob = grounded ? Math.abs(Math.sin(run)) * 1.6 : 0;
  rig.legL.setRotation(swing * 0.55);
  rig.legR.setRotation(-swing * 0.55);
  rig.armL.setRotation(-swing * 0.7);
  rig.armR.setRotation(swing * 0.7);
  rig.torso.setY(2 + bob);
  rig.head.setY(-18 + bob * 0.4);
  rig.head.setRotation(Phaser.Math.Clamp(vy / 1400, -0.18, 0.22));
  if (!grounded) {
    rig.armL.setRotation(-0.9);
    rig.armR.setRotation(0.9);
    rig.legL.setRotation(-0.35);
    rig.legR.setRotation(0.45);
  }
  rig.root.setScale(boosting ? 1.06 : 1, boosting ? 0.94 : 1);
}
