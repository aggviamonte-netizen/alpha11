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

const SKIN = 0xf3c7a0;
const HAIR = 0xc9842a;
const SUIT = 0x243044;
const CLIP = 0xf4f1ea;
const BOOT = 0x3a2a1c;
const LIME = 0xe8ff47;

export function drawBlok(scene: Phaser.Scene, x: number, y: number): BlokRig {
  const root = scene.add.container(x, y).setDepth(22);

  const legL = scene.add.container(-9, 20);
  const legR = scene.add.container(9, 20);
  const boot = (c: Phaser.GameObjects.Container, flip: number): void => {
    const g = scene.add.graphics();
    g.fillStyle(0x0b0b0c, 0.35);
    g.fillRoundedRect(-6 + flip, 0, 13, 20, 4);
    g.fillStyle(SUIT, 1);
    g.fillRoundedRect(-6, -2, 12, 18, 4);
    g.fillStyle(BOOT, 1);
    g.fillRoundedRect(-8 + flip * 2, 14, 16, 10, 4);
    g.fillStyle(0xffffff, 0.16);
    g.fillRoundedRect(-3, 0, 5, 12, 2);
    c.add(g);
  };
  boot(legL, -1);
  boot(legR, 1);

  const torso = scene.add.container(0, 4);
  const body = scene.add.graphics();
  body.fillStyle(0x0b0b0c, 0.35);
  body.fillRoundedRect(-16, 0, 34, 26, 8);
  body.fillStyle(SUIT, 1);
  body.fillRoundedRect(-17, -4, 34, 26, 8);
  body.fillStyle(0x1a2230, 1);
  body.fillRoundedRect(-13, 2, 26, 14, 6);
  body.fillStyle(LIME, 1);
  body.fillRoundedRect(-8, 4, 16, 11, 4);
  body.fillStyle(0x0b0b0c, 1);
  body.fillRoundedRect(-6, 6, 12, 7, 2);
  body.fillStyle(LIME, 1);
  body.fillRect(-4, 8, 8, 3);
  body.fillStyle(0xffffff, 0.22);
  body.fillEllipse(-6, -1, 14, 6);
  torso.add(body);

  const armL = scene.add.container(-18, 2);
  const armR = scene.add.container(18, 2);
  const arm = (c: Phaser.GameObjects.Container, dir: number): void => {
    const g = scene.add.graphics();
    g.fillStyle(SUIT, 1);
    g.fillRoundedRect(dir > 0 ? 0 : -12, -4, 12, 10, 4);
    g.fillStyle(SKIN, 1);
    g.fillCircle(dir * 13, 2, 6.2);
    g.lineStyle(3.4, CLIP, 1);
    g.beginPath();
    g.arc(dir * 17, 3, 6.6, dir > 0 ? 0.45 : Math.PI - 0.45, dir > 0 ? 2.7 : Math.PI + 2.7);
    g.strokePath();
    g.lineStyle(2.4, 0xc9c3b6, 1);
    g.beginPath();
    g.arc(dir * 17, 3, 4.1, dir > 0 ? 0.55 : Math.PI - 0.55, dir > 0 ? 2.6 : Math.PI + 2.6);
    g.strokePath();
    c.add(g);
  };
  arm(armL, -1);
  arm(armR, 1);

  const head = scene.add.container(0, -18);
  const hg = scene.add.graphics();
  hg.fillStyle(0x0b0b0c, 0.3);
  hg.fillCircle(1.4, 3, 19);
  hg.fillStyle(SKIN, 1);
  hg.fillCircle(0, 2, 18.4);
  hg.fillStyle(HAIR, 1);
  hg.fillEllipse(0, -10, 34, 16);
  hg.fillRoundedRect(-17, -18, 34, 14, 10);
  hg.fillStyle(0xa86b1c, 1);
  hg.fillEllipse(-11, -12, 8, 6);
  hg.fillEllipse(11, -12, 8, 6);
  hg.fillStyle(SKIN, 1);
  hg.fillEllipse(0, 6, 30, 22);
  hg.fillStyle(0x2a2118, 1);
  hg.fillCircle(-6.2, 1.2, 2.6);
  hg.fillCircle(6.2, 1.2, 2.6);
  hg.fillStyle(0xffffff, 0.9);
  hg.fillCircle(-5.4, 0.4, 0.85);
  hg.fillCircle(7, 0.4, 0.85);
  hg.lineStyle(2.2, 0xc45a4a, 1);
  hg.beginPath();
  hg.arc(0, 6.2, 6.4, 0.2, Math.PI - 0.2);
  hg.strokePath();
  hg.fillStyle(0xffffff, 0.38);
  hg.fillEllipse(-6, -2, 10, 5);
  hg.fillStyle(0xe8a07a, 0.35);
  hg.fillCircle(-11, 8, 3.2);
  hg.fillCircle(11, 8, 3.2);
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
  const swing = grounded ? Math.sin(run) : 0.12;
  const bob = grounded ? Math.abs(Math.sin(run)) * 2 : 0;
  rig.legL.setRotation(swing * 0.6);
  rig.legR.setRotation(-swing * 0.6);
  rig.armL.setRotation(-swing * 0.75);
  rig.armR.setRotation(swing * 0.75);
  rig.torso.setY(4 + bob);
  rig.head.setY(-18 + bob * 0.35);
  rig.head.setRotation(Phaser.Math.Clamp(vy / 1400, -0.16, 0.2));
  if (!grounded) {
    rig.armL.setRotation(-1.05);
    rig.armR.setRotation(1.05);
    rig.legL.setRotation(-0.4);
    rig.legR.setRotation(0.5);
  }
  rig.root.setScale(boosting ? 1.08 : 1, boosting ? 0.93 : 1);
}
