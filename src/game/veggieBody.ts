import Phaser from 'phaser';
import { creature, halfHeightPx, halfWidthPx } from './canon';

export type Vert = { x: number; y: number };

function center(verts: Vert[]): Vert[] {
  let cx = 0;
  let cy = 0;
  for (const v of verts) {
    cx += v.x;
    cy += v.y;
  }
  cx /= verts.length;
  cy /= verts.length;
  return verts.map((v) => ({ x: v.x - cx, y: v.y - cy }));
}

function regular(n: number, rx: number, ry: number, rot = -Math.PI / 2): Vert[] {
  const verts: Vert[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (Math.PI * 2 * i) / n;
    verts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
  }
  return verts;
}

/** Convex hulls that match the drawn vegetable silhouettes. */
export function veggieVerts(tier: number, r: number): Vert[] {
  const hw = halfWidthPx(tier, r);
  const hh = halfHeightPx(tier, r);
  switch (tier) {
    case 3:
      return center([
        { x: 0, y: -hh },
        { x: hw * 0.42, y: -hh * 0.35 },
        { x: hw * 0.92, y: hh * 0.28 },
        { x: hw * 0.55, y: hh * 0.92 },
        { x: 0, y: hh },
        { x: -hw * 0.55, y: hh * 0.92 },
        { x: -hw * 0.92, y: hh * 0.28 },
        { x: -hw * 0.42, y: -hh * 0.35 },
      ]);
    case 4:
      return center([
        { x: 0, y: -hh },
        { x: hw * 0.55, y: -hh * 0.55 },
        { x: hw, y: hh * 0.08 },
        { x: hw * 0.78, y: hh * 0.82 },
        { x: 0, y: hh },
        { x: -hw * 0.78, y: hh * 0.82 },
        { x: -hw, y: hh * 0.08 },
        { x: -hw * 0.55, y: -hh * 0.55 },
      ]);
    case 6:
      return center([
        { x: -hw * 0.18, y: hh },
        { x: hw * 0.22, y: hh },
        { x: hw * 0.72, y: hh * 0.42 },
        { x: hw, y: -hh * 0.08 },
        { x: hw * 0.55, y: -hh },
        { x: -hw * 0.15, y: -hh * 0.92 },
        { x: -hw * 0.88, y: -hh * 0.42 },
        { x: -hw, y: hh * 0.12 },
        { x: -hw * 0.62, y: hh * 0.62 },
      ]);
    case 8:
      return regular(6, hw, hh, Math.PI / 6);
    case 10:
      return center([
        { x: 0, y: -hh },
        { x: hw * 0.52, y: -hh * 0.62 },
        { x: hw * 0.95, y: -hh * 0.08 },
        { x: hw * 0.72, y: hh * 0.55 },
        { x: 0, y: hh },
        { x: -hw * 0.72, y: hh * 0.55 },
        { x: -hw * 0.95, y: -hh * 0.08 },
        { x: -hw * 0.52, y: -hh * 0.62 },
      ]);
    case 11:
      return center([
        { x: 0, y: -hh },
        { x: hw * 0.48, y: -hh * 0.72 },
        { x: hw, y: -hh * 0.12 },
        { x: hw * 0.82, y: hh * 0.42 },
        { x: hw * 0.28, y: hh },
        { x: -hw * 0.28, y: hh },
        { x: -hw * 0.82, y: hh * 0.42 },
        { x: -hw, y: -hh * 0.12 },
        { x: -hw * 0.48, y: -hh * 0.72 },
      ]);
    default:
      return regular(8, hw, hh);
  }
}

type MatterOpts = Phaser.Types.Physics.Matter.MatterBodyConfig;

export function addVeggieBody(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
  r: number,
  opts: MatterOpts,
): MatterJS.BodyType {
  const c = creature(tier);
  const hw = halfWidthPx(tier, r) * 2;
  const hh = halfHeightPx(tier, r) * 2;

  if (c.kind === 'circle') {
    return scene.matter.add.circle(x, y, r, opts);
  }

  if (c.kind === 'capsule' || c.kind === 'wide') {
    const chamfer = Math.max(1, Math.min(hw, hh) / 2 - 0.45);
    return scene.matter.add.rectangle(x, y, hw, hh, {
      ...opts,
      chamfer: { radius: chamfer },
    });
  }

  try {
    const body = scene.matter.add.fromVertices(x, y, veggieVerts(tier, r), opts, true);
    if (body) return body;
  } catch {
    // fall through
  }
  return scene.matter.add.circle(x, y, r, opts);
}
