import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  DynamicDrawUsage,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Scene,
  SphereGeometry,
  Vector3,
} from 'three';
import { makeGlow } from './fx';
import { C, FOG_FAR, FOG_NEAR } from './palette';
import type { RushTrack } from './track';

function skyTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return new CanvasTexture(c);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#07090d');
  grd.addColorStop(0.42, '#101820');
  grd.addColorStop(0.7, '#1b2d3c');
  grd.addColorStop(0.88, '#2a3d4a');
  grd.addColorStop(1, '#3a2a22');
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 256);
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const SKY_TEX = skyTexture();

const TOWER_PAL = [0x171c26, 0x1c2430, 0x243044, 0x151820];

export class RushWorld {
  readonly sun: DirectionalLight;
  readonly fill: PointLight;
  readonly city: InstancedMesh;
  readonly pipes: InstancedMesh;
  readonly tanks: InstancedMesh;
  private readonly dummy = new Object3D();
  private readonly motes: Mesh[] = [];
  private density = 1;

  constructor(scene: Scene) {
    scene.background = new Color(C.fog);
    scene.fog = new Fog(C.fog, FOG_NEAR, FOG_FAR);

    const sky = new Mesh(
      new SphereGeometry(160, 24, 16),
      new MeshStandardMaterial({
        map: SKY_TEX,
        side: BackSide,
        depthWrite: false,
        roughness: 1,
        metalness: 0,
        emissive: new Color(0x10141c),
        emissiveIntensity: 0.35,
      }),
    );
    scene.add(sky);

    const hemi = new HemisphereLight(0x6a8aaa, 0x2a2218, 0.62);
    scene.add(hemi);

    this.sun = new DirectionalLight(0xfff1d6, 1.55);
    this.sun.position.set(18, 28, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -22;
    this.sun.shadow.camera.right = 22;
    this.sun.shadow.camera.top = 22;
    this.sun.shadow.camera.bottom = -22;
    this.sun.shadow.bias = -0.0008;
    scene.add(this.sun);

    const rim = new PointLight(C.cyan, 18, 42, 2);
    rim.position.set(-10, 8, -6);
    scene.add(rim);

    this.fill = new PointLight(C.lime, 6, 10, 2);
    scene.add(this.fill);

    const voidMesh = new Mesh(
      new PlaneGeometry(400, 400),
      new MeshStandardMaterial({ color: 0x08090c, roughness: 1, metalness: 0 }),
    );
    voidMesh.rotation.x = -Math.PI / 2;
    voidMesh.position.y = -18;
    voidMesh.receiveShadow = true;
    scene.add(voidMesh);

    const sunBall = new Mesh(
      new SphereGeometry(3.4, 16, 12),
      new MeshStandardMaterial({
        color: C.orange,
        emissive: new Color(C.orange),
        emissiveIntensity: 1.2,
        roughness: 0.4,
      }),
    );
    sunBall.position.set(-40, 38, 70);
    scene.add(sunBall);
    const sunGlow = makeGlow('orange', 18);
    sunGlow.position.copy(sunBall.position);
    scene.add(sunGlow);

    this.city = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: 0xffffff, roughness: 0.48, metalness: 0.28 }),
      80,
    );
    this.city.castShadow = true;
    this.city.receiveShadow = true;
    this.city.instanceMatrix.setUsage(DynamicDrawUsage);
    for (let i = 0; i < 80; i++) this.city.setColorAt(i, new Color(TOWER_PAL[i % TOWER_PAL.length]));
    scene.add(this.city);

    this.pipes = new InstancedMesh(
      new CylinderGeometry(0.45, 0.45, 1, 8),
      new MeshStandardMaterial({
        color: C.trackHi,
        roughness: 0.3,
        metalness: 0.65,
        emissive: new Color(C.cyan),
        emissiveIntensity: 0.08,
      }),
      40,
    );
    this.pipes.castShadow = true;
    scene.add(this.pipes);

    this.tanks = new InstancedMesh(
      new SphereGeometry(1, 10, 8),
      new MeshStandardMaterial({
        color: C.suit,
        roughness: 0.28,
        metalness: 0.72,
        emissive: new Color(C.lime),
        emissiveIntensity: 0.06,
      }),
      24,
    );
    this.tanks.castShadow = true;
    scene.add(this.tanks);

    const moteRoot = new Group();
    scene.add(moteRoot);
    for (let i = 0; i < 18; i++) {
      const m = new Mesh(
        new SphereGeometry(0.06 + Math.random() * 0.05, 6, 6),
        new MeshStandardMaterial({
          color: i % 2 ? C.lime : C.orange,
          emissive: new Color(i % 2 ? C.lime : C.orange),
          emissiveIntensity: 0.6,
        }),
      );
      m.position.set((Math.random() - 0.5) * 30, 1 + Math.random() * 8, Math.random() * 40);
      moteRoot.add(m);
      this.motes.push(m);
    }

    this.hideUnused();
  }

  setDensity(n: number): void {
    this.density = n;
  }

  setShadows(on: boolean): void {
    this.sun.castShadow = on;
  }

  sync(track: RushTrack, player: Vector3, boosting: boolean): void {
    this.sun.position.set(player.x + 16, player.y + 26, player.z + 10);
    this.sun.target.position.copy(player);
    this.sun.target.updateMatrixWorld();
    this.fill.position.set(player.x, player.y + 1.6, player.z + 0.4);
    this.fill.color.setHex(boosting ? C.orange : C.lime);
    this.fill.intensity = boosting ? 10 : 5.5;

    const items = track.decor;
    let ti = 0;
    let pi = 0;
    let ki = 0;
    const maxT = Math.floor(80 * this.density);
    const maxP = Math.floor(40 * this.density);
    const maxK = Math.floor(24 * this.density);
    for (const d of items) {
      this.dummy.position.copy(d.pos);
      if (d.kind === 'tower' && ti < maxT) {
        const h = 6 + ((d.s * 13) % 18);
        this.dummy.scale.set(2.2 + (d.s % 3), h, 2.2 + ((d.s * 3) % 2));
        this.dummy.position.y = d.pos.y + h * 0.5;
        this.dummy.rotation.set(0, d.s * 0.15, 0);
        this.dummy.updateMatrix();
        this.city.setMatrixAt(ti, this.dummy.matrix);
        this.city.setColorAt(ti, new Color(TOWER_PAL[ti % TOWER_PAL.length]));
        ti += 1;
      } else if (d.kind === 'pipe' && pi < maxP) {
        const h = 8 + ((d.s * 7) % 10);
        this.dummy.scale.set(1, h, 1);
        this.dummy.position.y = d.pos.y + h * 0.5;
        this.dummy.rotation.set(0.08 * d.side, 0, 0.04);
        this.dummy.updateMatrix();
        this.pipes.setMatrixAt(pi, this.dummy.matrix);
        pi += 1;
      } else if (d.kind === 'tank' && ki < maxK) {
        this.dummy.scale.setScalar(1.6 + (d.s % 2) * 0.4);
        this.dummy.position.y = d.pos.y + 1.8;
        this.dummy.rotation.set(0, d.s, 0);
        this.dummy.updateMatrix();
        this.tanks.setMatrixAt(ki, this.dummy.matrix);
        ki += 1;
      }
    }
    this.city.count = ti;
    this.pipes.count = pi;
    this.tanks.count = ki;
    this.city.instanceMatrix.needsUpdate = true;
    this.pipes.instanceMatrix.needsUpdate = true;
    this.tanks.instanceMatrix.needsUpdate = true;
    if (this.city.instanceColor) this.city.instanceColor.needsUpdate = true;
  }

  tickMotes(dt: number, player: Vector3, speed: number): void {
    for (const m of this.motes) {
      m.position.z -= speed * 0.35 * dt;
      m.position.y += Math.sin(m.position.x + player.z * 0.02) * 0.01;
      if (m.position.z < player.z - 12) {
        m.position.z = player.z + 28 + Math.random() * 20;
        m.position.x = player.x + (Math.random() - 0.5) * 24;
        m.position.y = player.y + 1 + Math.random() * 7;
      }
    }
  }

  dispose(): void {
    this.city.dispose();
    this.pipes.dispose();
    this.tanks.dispose();
  }

  private hideUnused(): void {
    this.city.count = 0;
    this.pipes.count = 0;
    this.tanks.count = 0;
  }
}
