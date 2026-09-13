import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';

function glowTex(inner: string, outer: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (!g) return new CanvasTexture(c);
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const LIME_GLOW = glowTex('rgba(232,255,71,0.95)', 'rgba(232,255,71,0.28)');
const ORANGE_GLOW = glowTex('rgba(255,154,60,0.95)', 'rgba(255,154,60,0.26)');
const CYAN_GLOW = glowTex('rgba(110,231,255,0.9)', 'rgba(110,231,255,0.22)');

export function makeGlow(kind: 'lime' | 'orange' | 'cyan', scale = 1.4): Sprite {
  const map = kind === 'lime' ? LIME_GLOW : kind === 'orange' ? ORANGE_GLOW : CYAN_GLOW;
  const mat = new SpriteMaterial({
    map,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85,
    color: 0xffffff,
  });
  const s = new Sprite(mat);
  s.scale.setScalar(scale);
  return s;
}

type Spark = {
  sprite: Sprite;
  vel: Vector3;
  life: number;
  max: number;
};

type Streak = {
  sprite: Sprite;
  life: number;
  max: number;
  vel: Vector3;
};

export class RushFx {
  readonly root = new Group();
  private sparks: Spark[] = [];
  private streaks: Streak[] = [];
  private trail: Spark[] = [];
  private wash: HTMLElement | null = null;
  private floats: HTMLElement | null = null;
  private rate = 1;

  bindDom(wash: HTMLElement, floats: HTMLElement): void {
    this.wash = wash;
    this.floats = floats;
  }

  setRate(n: number): void {
    this.rate = n;
  }

  burst(pos: Vector3, color: 'lime' | 'orange' | 'cyan', n = 10): void {
    const count = Math.max(3, Math.round(n * this.rate));
    for (let i = 0; i < count; i++) {
      const sprite = makeGlow(color, 0.55 + Math.random() * 0.45);
      sprite.position.copy(pos);
      this.root.add(sprite);
      const a = Math.random() * Math.PI * 2;
      const k = 3 + Math.random() * 7;
      this.sparks.push({
        sprite,
        vel: new Vector3(Math.cos(a) * k, 2 + Math.random() * 6, Math.sin(a) * k),
        life: 0.28 + Math.random() * 0.22,
        max: 0.5,
      });
    }
  }

  drip(pos: Vector3, boosting: boolean): void {
    if (Math.random() > this.rate) return;
    const sprite = makeGlow(boosting ? 'orange' : 'lime', boosting ? 0.7 : 0.45);
    sprite.position.copy(pos);
    this.root.add(sprite);
    this.trail.push({
      sprite,
      vel: new Vector3(0, 0.2, 0),
      life: 0.22,
      max: 0.22,
    });
  }

  streaksTick(origin: Vector3, tangent: Vector3, boosting: boolean, playing: boolean): void {
    if (!playing || this.rate < 0.3) return;
    const chance = boosting ? 0.55 : 0.18;
    if (Math.random() > chance * this.rate) return;
    const sprite = makeGlow(boosting ? 'orange' : 'cyan', boosting ? 1.8 : 1.1);
    const side = (Math.random() - 0.5) * 8;
    const up = 0.4 + Math.random() * 3.2;
    sprite.position.copy(origin).addScaledVector(tangent, 4 + Math.random() * 10);
    sprite.position.x += side;
    sprite.position.y += up;
    sprite.scale.set(0.18, 2.4 + Math.random() * 2.2, 1);
    this.root.add(sprite);
    this.streaks.push({
      sprite,
      life: 0.18,
      max: 0.18,
      vel: tangent.clone().multiplyScalar(-28),
    });
  }

  flash(color: 'lime' | 'orange' | 'red'): void {
    if (!this.wash) return;
    this.wash.dataset.tone = color;
    this.wash.classList.remove('on');
    void this.wash.offsetWidth;
    this.wash.classList.add('on');
  }

  float(label: string, big = false): void {
    if (!this.floats) return;
    const n = document.createElement('span');
    n.className = big ? 'rush-float big' : 'rush-float';
    n.textContent = label;
    this.floats.appendChild(n);
    window.setTimeout(() => n.remove(), 700);
  }

  tick(dt: number): void {
    this.step(this.sparks, dt, 10);
    this.step(this.trail, dt, 0.4);
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.life -= dt;
      s.sprite.position.addScaledVector(s.vel, dt);
      const mat = s.sprite.material;
      mat.opacity = Math.max(0, s.life / s.max);
      if (s.life <= 0) {
        s.sprite.removeFromParent();
        mat.dispose();
        this.streaks.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const list of [this.sparks, this.trail, this.streaks]) {
      for (const s of list) {
        s.sprite.removeFromParent();
        s.sprite.material.dispose();
      }
      list.length = 0;
    }
    this.root.removeFromParent();
  }

  private step(list: Spark[], dt: number, gravity: number): void {
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      s.life -= dt;
      s.vel.y -= gravity * dt;
      s.sprite.position.addScaledVector(s.vel, dt);
      const k = Math.max(0, s.life / s.max);
      s.sprite.material.opacity = k;
      s.sprite.scale.multiplyScalar(0.96);
      if (s.life <= 0) {
        s.sprite.removeFromParent();
        s.sprite.material.dispose();
        list.splice(i, 1);
      }
    }
  }
}
