import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { makeGlow } from './fx';
import { C } from './palette';

export const TRACK_W = 7.2;

export type Frame = {
  pos: Vector3;
  tangent: Vector3;
  normal: Vector3;
  binormal: Vector3;
  pitch: number;
};

export type PropKind = 'core' | 'pad' | 'spike' | 'beam' | 'loop' | 'zone';

export type Prop = {
  kind: PropKind;
  s: number;
  lateral: number;
  taken?: boolean;
  mesh: Object3D;
  s1?: number;
  radius?: number;
};

type Knot = {
  s: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

type Span = { s0: number; s1: number; solid: boolean; width: number };

type Piece = { root: Group; s0: number; s1: number };

const _crossA = new Vector3();
const _crossB = new Vector3();
const _crossC = new Vector3();
const _look = new Object3D();

function trackTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return new CanvasTexture(c);
  g.fillStyle = '#1c2430';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#2b3444';
  g.fillRect(8, 0, 112, 256);
  g.fillStyle = '#151820';
  for (let y = 0; y < 256; y += 32) g.fillRect(12, y, 104, 2);
  g.fillStyle = '#e8ff47';
  for (let y = 0; y < 256; y += 28) g.fillRect(58, y, 12, 16);
  g.fillStyle = 'rgba(244,241,234,0.16)';
  g.fillRect(10, 0, 4, 256);
  g.fillRect(114, 0, 4, 256);
  const tex = new CanvasTexture(c);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(1, 4);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function chevronTex(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (!g) return new CanvasTexture(c);
  g.fillStyle = '#ff9a3c';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#e8ff47';
  g.beginPath();
  g.moveTo(12, 48);
  g.lineTo(32, 16);
  g.lineTo(52, 48);
  g.lineTo(40, 48);
  g.lineTo(32, 30);
  g.lineTo(24, 48);
  g.closePath();
  g.fill();
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const TRACK_TEX = trackTexture();
const CHEV_TEX = chevronTex();

function align(obj: Object3D, pos: Vector3, tangent: Vector3, normal: Vector3): void {
  obj.position.copy(pos);
  _look.position.copy(pos);
  _look.up.copy(normal);
  _look.lookAt(pos.x + tangent.x, pos.y + tangent.y, pos.z + tangent.z);
  obj.quaternion.copy(_look.quaternion);
}

function ribbonGeo(
  lefts: Vector3[],
  rights: Vector3[],
  normals: Vector3[],
  s0: number,
  samples: number[],
): BufferGeometry {
  const positions: number[] = [];
  const nors: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < lefts.length; i++) {
    const l = lefts[i];
    const r = rights[i];
    const n = normals[i];
    positions.push(l.x, l.y, l.z, r.x, r.y, r.z);
    nors.push(n.x, n.y, n.z, n.x, n.y, n.z);
    const v = (samples[i] - s0) * 0.18;
    uvs.push(0, v, 1, v);
    if (i < lefts.length - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nors, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export class RushTrack {
  spawnS = 0;
  props: Prop[] = [];
  decor: Array<{ s: number; pos: Vector3; side: number; kind: 'tower' | 'pipe' | 'tank' }> = [];
  private knots: Knot[] = [];
  private spans: Span[] = [];
  private pieces: Piece[] = [];
  private readonly mats: {
    track: MeshStandardMaterial;
    stripe: MeshStandardMaterial;
    rail: MeshStandardMaterial;
    core: MeshStandardMaterial;
    pad: MeshStandardMaterial;
    spike: MeshStandardMaterial;
    beam: MeshStandardMaterial;
    beamWin: MeshStandardMaterial;
    loop: MeshStandardMaterial;
    loopGlow: MeshStandardMaterial;
    zone: MeshStandardMaterial;
  };

  constructor(private readonly scene: Scene) {
    this.mats = {
      track: new MeshStandardMaterial({
        map: TRACK_TEX,
        color: 0xffffff,
        roughness: 0.38,
        metalness: 0.62,
      }),
      stripe: new MeshStandardMaterial({
        color: C.lime,
        emissive: new Color(C.lime),
        emissiveIntensity: 0.55,
        roughness: 0.28,
        metalness: 0.2,
      }),
      rail: new MeshStandardMaterial({
        color: C.rail,
        roughness: 0.32,
        metalness: 0.7,
      }),
      core: new MeshStandardMaterial({
        color: C.lime,
        emissive: new Color(C.lime),
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.15,
      }),
      pad: new MeshStandardMaterial({
        map: CHEV_TEX,
        roughness: 0.3,
        metalness: 0.25,
        emissive: new Color(C.orange),
        emissiveIntensity: 0.25,
      }),
      spike: new MeshStandardMaterial({
        color: C.hazard,
        roughness: 0.35,
        metalness: 0.15,
        emissive: new Color(C.hazard),
        emissiveIntensity: 0.18,
      }),
      beam: new MeshStandardMaterial({
        color: 0x171c26,
        roughness: 0.4,
        metalness: 0.35,
      }),
      beamWin: new MeshStandardMaterial({
        color: C.cyan,
        emissive: new Color(C.cyan),
        emissiveIntensity: 0.45,
        roughness: 0.25,
        transparent: true,
        opacity: 0.85,
      }),
      loop: new MeshStandardMaterial({
        color: C.trackHi,
        roughness: 0.3,
        metalness: 0.72,
      }),
      loopGlow: new MeshStandardMaterial({
        color: C.lime,
        emissive: new Color(C.lime),
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.2,
        side: DoubleSide,
      }),
      zone: new MeshStandardMaterial({
        color: C.orange,
        emissive: new Color(C.orange),
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.3,
      }),
    };
  }

  seed(): void {
    this.clear();
    this.knots.push({ s: 0, x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
    this.solid(36);
    this.paintRibbon(0, this.spawnS);
    this.scatterCores(8, 28, 3, 0.9);
    this.addPad(22, 0);
    const a = this.spawnS;
    this.solid(16);
    this.paintRibbon(a, this.spawnS);
    const b = this.spawnS;
    this.hill(22, 2.2);
    this.paintRibbon(b, this.spawnS);
    this.scatterCores(b + 2, 18, 4, 1.4);
  }

  spawnAhead(playerS: number, danger: number): void {
    let guard = 0;
    while (this.spawnS < playerS + 130 && guard++ < 10) {
      const d = Math.min(1, danger);
      const roll = Math.random();
      if (roll < 0.14) this.patFlat();
      else if (roll < 0.28) this.patCurve();
      else if (roll < 0.4) this.patHill();
      else if (roll < 0.52) this.patRamp();
      else if (roll < 0.64) this.patGap(d);
      else if (roll < 0.74) this.patSpikes(d);
      else if (roll < 0.82) this.patBeam(d);
      else if (roll < 0.9) this.patZone();
      else this.patOrbit();
    }
  }

  recycle(playerS: number): void {
    this.pieces = this.pieces.filter((p) => {
      if (p.s1 > playerS - 24) return true;
      this.drop(p.root);
      return false;
    });
    this.props = this.props.filter((p) => {
      if ((p.s1 ?? p.s) > playerS - 18) return true;
      this.drop(p.mesh);
      return false;
    });
    this.decor = this.decor.filter((d) => d.s > playerS - 30);
    while (this.knots.length > 8 && this.knots[4].s < playerS - 28) this.knots.shift();
    this.spans = this.spans.filter((s) => s.s1 > playerS - 28);
  }

  frameAt(s: number): Frame {
    const knots = this.knots;
    if (knots.length < 2) {
      return {
        pos: new Vector3(),
        tangent: new Vector3(0, 0, 1),
        normal: new Vector3(0, 1, 0),
        binormal: new Vector3(1, 0, 0),
        pitch: 0,
      };
    }
    let i = 0;
    if (s >= knots[knots.length - 1].s) i = knots.length - 2;
    else {
      for (let k = 0; k < knots.length - 1; k++) {
        if (s >= knots[k].s && s <= knots[k + 1].s) {
          i = k;
          break;
        }
      }
    }
    const a = knots[i];
    const b = knots[i + 1];
    const span = Math.max(0.0001, b.s - a.s);
    const t = Math.min(1, Math.max(0, (s - a.s) / span));
    const pos = new Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
    const yaw = a.yaw + (b.yaw - a.yaw) * t;
    const pitch = a.pitch + (b.pitch - a.pitch) * t;
    const tangent = new Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ).normalize();
    const binormal = _crossA.crossVectors(tangent, _crossB.set(0, 1, 0));
    if (binormal.lengthSq() < 0.0001) binormal.set(1, 0, 0);
    else binormal.normalize();
    const normal = _crossC.crossVectors(binormal, tangent).normalize();
    return { pos, tangent, normal: normal.clone(), binormal: binormal.clone(), pitch };
  }

  hasSurface(s: number, lateral: number): boolean {
    const span = this.spanAt(s);
    if (!span || !span.solid) return false;
    return Math.abs(lateral) <= span.width * 0.5 + 0.15;
  }

  worldOnTrack(s: number, lateral: number, height: number): Vector3 {
    const f = this.frameAt(s);
    return f.pos.clone().addScaledVector(f.binormal, lateral).addScaledVector(f.normal, height);
  }

  propsNear(kind: PropKind, s: number, window = 3): Prop[] {
    return this.props.filter((p) => p.kind === kind && !p.taken && Math.abs(p.s - s) < window);
  }

  dispose(): void {
    this.clear();
    for (const m of Object.values(this.mats)) m.dispose();
  }

  private clear(): void {
    for (const p of this.pieces) this.drop(p.root);
    for (const p of this.props) this.drop(p.mesh);
    this.pieces = [];
    this.props = [];
    this.knots = [];
    this.spans = [];
    this.decor.length = 0;
    this.spawnS = 0;
  }

  private drop(obj: Object3D): void {
    obj.traverse((o: Object3D) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    obj.removeFromParent();
  }

  private spanAt(s: number): Span | null {
    for (const sp of this.spans) {
      if (s >= sp.s0 && s <= sp.s1) return sp;
    }
    return null;
  }

  private last(): Knot {
    return this.knots[this.knots.length - 1];
  }

  private advance(len: number, dYaw = 0, dy = 0): void {
    const steps = Math.max(1, Math.round(len));
    const ds = len / steps;
    const dyaw = dYaw / steps;
    const dyy = dy / steps;
    for (let i = 0; i < steps; i++) {
      const k = this.last();
      const yaw = k.yaw + dyaw;
      const x = k.x + Math.sin(yaw) * ds;
      const z = k.z + Math.cos(yaw) * ds;
      const y = k.y + dyy;
      const pitch = Math.atan2(dyy, ds);
      this.knots.push({ s: k.s + ds, x, y, z, yaw, pitch });
    }
    this.spawnS = this.last().s;
  }

  private solid(len: number, dYaw = 0, dy = 0, width = TRACK_W): void {
    const s0 = this.spawnS;
    this.advance(len, dYaw, dy);
    this.spans.push({ s0, s1: this.spawnS, solid: true, width });
    this.decorate(s0, this.spawnS);
  }

  private gap(len: number): void {
    const s0 = this.spawnS;
    this.advance(len, 0, 0);
    this.spans.push({ s0, s1: this.spawnS, solid: false, width: TRACK_W });
  }

  private hill(len: number, height: number): void {
    const s0 = this.spawnS;
    const y0 = this.last().y;
    const steps = Math.max(4, Math.round(len));
    const ds = len / steps;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const y = y0 + Math.sin(t * Math.PI) * height;
      const k = this.last();
      const dy = y - k.y;
      const x = k.x + Math.sin(k.yaw) * ds;
      const z = k.z + Math.cos(k.yaw) * ds;
      this.knots.push({ s: k.s + ds, x, y, z, yaw: k.yaw, pitch: Math.atan2(dy, ds) });
    }
    this.spawnS = this.last().s;
    this.spans.push({ s0, s1: this.spawnS, solid: true, width: TRACK_W });
    this.decorate(s0, this.spawnS);
  }

  private paintRibbon(s0: number, s1: number, zone = false): void {
    const samples = this.knots.filter((k) => k.s >= s0 - 0.01 && k.s <= s1 + 0.01);
    if (samples.length < 2) return;
    const root = new Group();
    const w = TRACK_W * 0.5;
    const lefts: Vector3[] = [];
    const rights: Vector3[] = [];
    const nors: Vector3[] = [];
    const sl: Vector3[] = [];
    const sr: Vector3[] = [];
    const ss: number[] = [];

    for (const k of samples) {
      const f = this.frameAt(k.s);
      lefts.push(f.pos.clone().addScaledVector(f.binormal, -w).addScaledVector(f.normal, 0.02));
      rights.push(f.pos.clone().addScaledVector(f.binormal, w).addScaledVector(f.normal, 0.02));
      sl.push(f.pos.clone().addScaledVector(f.binormal, -0.28).addScaledVector(f.normal, 0.05));
      sr.push(f.pos.clone().addScaledVector(f.binormal, 0.28).addScaledVector(f.normal, 0.05));
      nors.push(f.normal);
      ss.push(k.s);
    }

    const top = new Mesh(ribbonGeo(lefts, rights, nors, s0, ss), zone ? this.mats.zone : this.mats.track);
    top.castShadow = true;
    top.receiveShadow = true;
    root.add(top);
    const stripe = new Mesh(ribbonGeo(sl, sr, nors, s0, ss), zone ? this.mats.zone : this.mats.stripe);
    stripe.receiveShadow = true;
    root.add(stripe);

    for (const side of [-1, 1] as const) {
      for (let i = 0; i < samples.length; i += 2) {
        const f = this.frameAt(samples[i].s);
        const rail = new Mesh(new BoxGeometry(0.12, 0.22, 2.1), this.mats.rail);
        align(
          rail,
          f.pos.clone().addScaledVector(f.binormal, side * (w - 0.08)).addScaledVector(f.normal, 0.14),
          f.tangent,
          f.normal,
        );
        rail.castShadow = true;
        root.add(rail);
      }
    }

    this.scene.add(root);
    this.pieces.push({ root, s0, s1 });
  }

  private decorate(s0: number, s1: number): void {
    for (let s = s0 + 4; s < s1; s += 7 + Math.random() * 6) {
      const f = this.frameAt(s);
      const side = Math.random() < 0.5 ? -1 : 1;
      const dist = 10 + Math.random() * 16;
      const pos = f.pos.clone().addScaledVector(f.binormal, side * dist);
      pos.y -= 1.2;
      const kind = Math.random() < 0.45 ? 'tower' : Math.random() < 0.5 ? 'pipe' : 'tank';
      this.decor.push({ s, pos, side, kind });
    }
  }

  private scatterCores(s0: number, span: number, n: number, lift: number): void {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      this.addCore(s0 + t * span, Math.sin(t * Math.PI * 2) * 1.6, lift + Math.sin(t * Math.PI) * 0.7);
    }
  }

  private addCore(s: number, lateral: number, lift: number): void {
    const f = this.frameAt(s);
    const root = new Group();
    const hex = new Mesh(new CylinderGeometry(0.22, 0.22, 0.08, 6), this.mats.core);
    hex.rotation.x = Math.PI / 2;
    const inner = new Mesh(new SphereGeometry(0.08, 10, 8), this.mats.beamWin);
    root.add(hex, inner, makeGlow('lime', 1.35));
    root.position.copy(f.pos).addScaledVector(f.binormal, lateral).addScaledVector(f.normal, 0.85 + lift);
    this.scene.add(root);
    this.props.push({ kind: 'core', s, lateral, mesh: root });
  }

  private addPad(s: number, lateral: number): void {
    const f = this.frameAt(s);
    const mesh = new Mesh(new BoxGeometry(1.6, 0.16, 2.2), this.mats.pad);
    align(mesh, f.pos.clone().addScaledVector(f.binormal, lateral).addScaledVector(f.normal, 0.12), f.tangent, f.normal);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.props.push({ kind: 'pad', s, lateral, mesh });
  }

  private addSpike(s: number, lateral: number): void {
    const f = this.frameAt(s);
    const mesh = new Mesh(new ConeGeometry(0.32, 0.7, 5), this.mats.spike);
    align(mesh, f.pos.clone().addScaledVector(f.binormal, lateral).addScaledVector(f.normal, 0.38), f.tangent, f.normal);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.props.push({ kind: 'spike', s, lateral, mesh });
  }

  private addBeam(s: number): void {
    const f = this.frameAt(s);
    const root = new Group();
    const body = new Mesh(new BoxGeometry(2.2, 1.4, 1.1), this.mats.beam);
    const win = new Mesh(new BoxGeometry(0.35, 0.9, 0.2), this.mats.beamWin);
    win.position.set(-0.5, 0.05, 0.56);
    const lip = new Mesh(new BoxGeometry(2.5, 0.18, 1.3), this.mats.pad);
    lip.position.y = -0.7;
    root.add(body, win, lip);
    align(root, f.pos.clone().addScaledVector(f.normal, 1.55), f.tangent, f.normal);
    this.scene.add(root);
    this.props.push({ kind: 'beam', s, lateral: 0, mesh: root });
  }

  private addZone(s0: number, s1: number): void {
    const f = this.frameAt((s0 + s1) * 0.5);
    const mesh = new Mesh(new BoxGeometry(TRACK_W * 0.92, 0.08, Math.max(2, s1 - s0)), this.mats.zone);
    align(mesh, f.pos.clone().addScaledVector(f.normal, 0.08), f.tangent, f.normal);
    this.scene.add(mesh);
    this.props.push({ kind: 'zone', s: s0, s1, lateral: 0, mesh });
  }

  private addLoop(s: number): Prop {
    const f = this.frameAt(s);
    const R = 6.2;
    const root = new Group();
    const ring = new Mesh(new TorusGeometry(R, 0.42, 10, 40), this.mats.loop);
    ring.rotation.y = Math.PI / 2;
    const glow = new Mesh(new TorusGeometry(R, 0.12, 8, 40), this.mats.loopGlow);
    glow.rotation.y = Math.PI / 2;
    const inner = new Mesh(new TorusGeometry(R - 0.7, 0.05, 6, 32), this.mats.beamWin);
    inner.rotation.y = Math.PI / 2;
    root.add(ring, glow, inner);
    const center = f.pos.clone().addScaledVector(f.tangent, R).addScaledVector(f.normal, R);
    align(root, center, f.tangent, f.normal);
    this.scene.add(root);
    const prop: Prop = { kind: 'loop', s, lateral: 0, mesh: root, radius: R, s1: s + R * 2 + 4 };
    this.props.push(prop);
    return prop;
  }

  private patFlat(): void {
    const s0 = this.spawnS;
    const len = 22 + Math.floor(Math.random() * 14);
    this.solid(len);
    this.paintRibbon(s0, this.spawnS);
    this.scatterCores(s0 + 3, len - 6, 4, 0.8);
  }

  private patCurve(): void {
    const s0 = this.spawnS;
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.solid(28, dir * 0.7, 0);
    this.paintRibbon(s0, this.spawnS);
    this.scatterCores(s0 + 4, 20, 5, 0.7);
  }

  private patHill(): void {
    const s0 = this.spawnS;
    this.hill(24, 2.4 + Math.random() * 1.4);
    this.paintRibbon(s0, this.spawnS);
    this.scatterCores(s0 + 2, 20, 5, 1.2);
  }

  private patRamp(): void {
    const s0 = this.spawnS;
    this.solid(10);
    this.paintRibbon(s0, this.spawnS);
    const mid = this.spawnS;
    this.solid(12, 0, 3.6);
    this.paintRibbon(mid, this.spawnS);
    this.addPad(mid + 2, 0);
    this.scatterCores(this.spawnS, 8, 4, 2.4);
    this.gap(7 + Math.random() * 3);
    const land = this.spawnS;
    this.solid(18, 0, -2.2);
    this.paintRibbon(land, this.spawnS);
  }

  private patGap(d: number): void {
    const s0 = this.spawnS;
    this.solid(14);
    this.paintRibbon(s0, this.spawnS);
    this.scatterCores(s0 + 2, 10, 3, 1.1);
    this.gap(6.5 + d * 3.5);
    const land = this.spawnS;
    this.solid(16);
    this.paintRibbon(land, this.spawnS);
  }

  private patSpikes(d: number): void {
    const s0 = this.spawnS;
    this.solid(26);
    this.paintRibbon(s0, this.spawnS);
    this.addSpike(s0 + 10, d > 0.4 ? -1.6 : 0);
    if (d > 0.35) this.addSpike(s0 + 16, 1.7);
    this.scatterCores(s0 + 4, 16, 3, 1.5);
  }

  private patBeam(d: number): void {
    const s0 = this.spawnS;
    this.solid(22);
    this.paintRibbon(s0, this.spawnS);
    this.addBeam(s0 + 12 + d);
    this.scatterCores(s0 + 3, 8, 2, 0.5);
  }

  private patZone(): void {
    const s0 = this.spawnS;
    this.solid(24);
    this.paintRibbon(s0, this.spawnS, true);
    this.addZone(s0, this.spawnS);
    this.scatterCores(s0 + 2, 20, 5, 0.7);
  }

  private patOrbit(): void {
    const s0 = this.spawnS;
    this.solid(10);
    this.paintRibbon(s0, this.spawnS);
    this.addPad(s0 + 3, 0);
    const loop = this.addLoop(this.spawnS);
    this.gap(loop.radius! * 2 + 2);
    const land = this.spawnS;
    this.solid(16);
    this.paintRibbon(land, this.spawnS);
  }
}
