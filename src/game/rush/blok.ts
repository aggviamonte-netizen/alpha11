import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { C } from './palette';

export type BlokRig = {
  root: Group;
  body: Group;
  head: Group;
  torso: Group;
  armL: Group;
  armR: Group;
  legL: Group;
  legR: Group;
};

function mat(color: number, extras: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}) {
  return new MeshStandardMaterial({
    color,
    roughness: 0.46,
    metalness: 0.08,
    ...extras,
  });
}

function mesh(geo: ConstructorParameters<typeof Mesh>[0], material: MeshStandardMaterial): Mesh {
  const m = new Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createBlok(): BlokRig {
  const root = new Group();
  const body = new Group();
  root.add(body);

  const skin = mat(C.skin, { roughness: 0.42 });
  const suit = mat(C.suit, { roughness: 0.38, metalness: 0.22 });
  const boot = mat(C.boot, { roughness: 0.5 });
  const hair = mat(C.hair, { roughness: 0.55 });
  const hairDeep = mat(C.hairDeep, { roughness: 0.55 });
  const lime = mat(C.lime, { roughness: 0.28, metalness: 0.2, emissive: new Color(C.lime), emissiveIntensity: 0.35 });
  const clip = mat(C.clip, { roughness: 0.25, metalness: 0.45 });

  const legL = new Group();
  const legR = new Group();
  legL.position.set(-0.16, 0.28, 0);
  legR.position.set(0.16, 0.28, 0);
  const makeLeg = (g: Group, flip: number) => {
    const thigh = mesh(new CapsuleGeometry(0.075, 0.2, 4, 8), suit);
    thigh.position.y = -0.12;
    const shoe = mesh(new CapsuleGeometry(0.09, 0.08, 3, 8), boot);
    shoe.position.set(0, -0.28, 0.04 * flip);
    shoe.scale.set(1.15, 0.7, 1.35);
    g.add(thigh, shoe);
  };
  makeLeg(legL, -1);
  makeLeg(legR, 1);

  const torso = new Group();
  torso.position.y = 0.46;
  const chest = mesh(new CapsuleGeometry(0.22, 0.18, 5, 10), suit);
  chest.scale.set(1.15, 1, 0.72);
  const belly = mesh(new CapsuleGeometry(0.18, 0.08, 4, 8), mat(C.suitCore, { roughness: 0.4, metalness: 0.18 }));
  belly.position.y = -0.02;
  belly.scale.set(1.05, 0.7, 0.62);
  const badge = mesh(new CylinderGeometry(0.1, 0.1, 0.04, 8), lime);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0, 0.04, 0.16);
  const slot = mesh(new CylinderGeometry(0.055, 0.055, 0.03, 8), mat(0x0b0b0c, { roughness: 0.3 }));
  slot.rotation.x = Math.PI / 2;
  slot.position.set(0, 0.04, 0.18);
  torso.add(chest, belly, badge, slot);

  const armL = new Group();
  const armR = new Group();
  armL.position.set(-0.3, 0.52, 0);
  armR.position.set(0.3, 0.52, 0);
  const makeArm = (g: Group, dir: number) => {
    const sleeve = mesh(new CapsuleGeometry(0.055, 0.12, 3, 8), suit);
    sleeve.position.set(dir * 0.04, -0.04, 0);
    sleeve.rotation.z = dir * 0.35;
    const hand = mesh(new SphereGeometry(0.07, 10, 8), skin);
    hand.position.set(dir * 0.16, -0.08, 0.02);
    const cclip = mesh(new TorusGeometry(0.065, 0.018, 8, 14, Math.PI * 1.2), clip);
    cclip.position.set(dir * 0.22, -0.08, 0.02);
    cclip.rotation.set(Math.PI / 2, 0, dir > 0 ? -0.4 : Math.PI + 0.4);
    g.add(sleeve, hand, cclip);
  };
  makeArm(armL, -1);
  makeArm(armR, 1);

  const head = new Group();
  head.position.y = 0.78;
  const skull = mesh(new SphereGeometry(0.24, 18, 14), skin);
  skull.scale.set(1, 0.96, 0.92);
  const hairCap = mesh(new SphereGeometry(0.25, 16, 12), hair);
  hairCap.position.y = 0.08;
  hairCap.scale.set(1.02, 0.62, 0.95);
  const bang = mesh(new SphereGeometry(0.08, 10, 8), hairDeep);
  bang.position.set(-0.12, 0.12, 0.12);
  const bang2 = mesh(new SphereGeometry(0.075, 10, 8), hairDeep);
  bang2.position.set(0.12, 0.12, 0.12);
  const eyeL = mesh(new SphereGeometry(0.032, 8, 8), mat(0x2a2118, { roughness: 0.35 }));
  const eyeR = mesh(new SphereGeometry(0.032, 8, 8), mat(0x2a2118, { roughness: 0.35 }));
  eyeL.position.set(-0.08, 0.02, 0.2);
  eyeR.position.set(0.08, 0.02, 0.2);
  const shineL = mesh(new SphereGeometry(0.01, 6, 6), mat(0xffffff, { roughness: 0.2 }));
  const shineR = mesh(new SphereGeometry(0.01, 6, 6), mat(0xffffff, { roughness: 0.2 }));
  shineL.position.set(-0.07, 0.035, 0.225);
  shineR.position.set(0.09, 0.035, 0.225);
  const smile = mesh(new TorusGeometry(0.07, 0.01, 6, 10, Math.PI), mat(0xc45a4a, { roughness: 0.4 }));
  smile.position.set(0, -0.06, 0.2);
  smile.rotation.set(Math.PI, 0, 0);
  const cheekL = mesh(new SphereGeometry(0.03, 8, 6), mat(C.blush, { roughness: 0.5, transparent: true, opacity: 0.45 }));
  const cheekR = mesh(new SphereGeometry(0.03, 8, 6), mat(C.blush, { roughness: 0.5, transparent: true, opacity: 0.45 }));
  cheekL.position.set(-0.14, -0.04, 0.18);
  cheekR.position.set(0.14, -0.04, 0.18);
  head.add(skull, hairCap, bang, bang2, eyeL, eyeR, shineL, shineR, smile, cheekL, cheekR);

  body.rotation.y = Math.PI;
  body.add(legL, legR, torso, armL, armR, head);
  return { root, body, head, torso, armL, armR, legL, legR };
}

export function poseBlok(
  rig: BlokRig,
  run: number,
  grounded: boolean,
  vh: number,
  boosting: boolean,
): void {
  const swing = grounded ? Math.sin(run) : 0.16;
  const bob = grounded ? Math.abs(Math.sin(run)) * 0.035 : 0;
  rig.legL.rotation.x = swing * 0.85;
  rig.legR.rotation.x = -swing * 0.85;
  rig.armL.rotation.x = -swing * 0.9;
  rig.armR.rotation.x = swing * 0.9;
  rig.torso.position.y = 0.46 + bob;
  rig.head.position.y = 0.78 + bob * 0.4;
  rig.head.rotation.x = Math.max(-0.2, Math.min(0.22, vh * 0.018));
  if (!grounded) {
    rig.armL.rotation.x = -1.15;
    rig.armR.rotation.x = -1.15;
    rig.legL.rotation.x = -0.35;
    rig.legR.rotation.x = 0.55;
  }
  const sx = boosting ? 1.08 : 1;
  const sy = boosting ? 0.92 : 1;
  rig.body.scale.set(sx, sy, sx);
}
