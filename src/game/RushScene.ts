import Phaser from 'phaser';
import { el } from './dom';
import { drawBlok, poseBlok, type BlokRig } from './drawBlok';
import { burstDots, floatLabel, pulseRing, screenWash, squashTo } from './juice';
import { loadRushBest, saveRushBest } from './rushScore';
import { sfxBoost, sfxCore, sfxJump, sfxLand, sfxOrbit, sfxOver, unlockSfx } from './sfx';

export const W = 390;
export const H = 844;

const PX = 108;
const GROUND = 668;
const GRAV_HOLD = 1380;
const GRAV_FALL = 2280;
const JUMP_V = -575;
const CUT = 0.4;
const COYOTE = 100;
const BUFFER = 90;
const BASE = 228;
const HIT_W = 18;
const HIT_H = 36;
const LOOP_R = 118;
const LOOP_MIN = 305;

type Phase = 'start' | 'play' | 'over';
type Kind = 'plat' | 'spike' | 'pad' | 'core' | 'beam' | 'loop' | 'zone';

type Prop = {
  kind: Kind;
  wx: number;
  y: number;
  w: number;
  h: number;
  taken?: boolean;
  root: Phaser.GameObjects.Container;
};

let skipStart = false;

function aabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class RushScene extends Phaser.Scene {
  private phase: Phase = 'start';
  private score = 0;
  private bonus = 0;
  private best = 0;
  private cores = 0;
  private py = GROUND;
  private vy = 0;
  private camX = 0;
  private spawnX = 0;
  private holding = false;
  private coyote = 0;
  private buffer = 0;
  private boostT = 0;
  private grounded = true;
  private looping = false;
  private loopA = 0;
  private loopWx = 0;
  private run = 0;
  private pulse = 0;
  private lastTrail = 0;
  private hintShown = false;
  private props: Prop[] = [];
  private motes: Array<{ g: Phaser.GameObjects.Arc; vx: number }> = [];
  private mid: Phaser.GameObjects.Container[] = [];
  private lines!: Phaser.GameObjects.Graphics;
  private rig!: BlokRig;

  constructor() {
    super('rush');
  }

  create(): void {
    this.phase = 'start';
    this.score = 0;
    this.bonus = 0;
    this.best = loadRushBest();
    this.cores = 0;
    this.py = GROUND;
    this.vy = 0;
    this.camX = 0;
    this.spawnX = 0;
    this.holding = false;
    this.coyote = 0;
    this.buffer = 0;
    this.boostT = 0;
    this.grounded = true;
    this.looping = false;
    this.loopA = 0;
    this.loopWx = 0;
    this.run = 0;
    this.pulse = 0;
    this.lastTrail = 0;
    this.props = [];
    this.motes = [];
    this.mid = [];

    this.paintWorld();
    this.lines = this.add.graphics().setDepth(16);
    this.rig = drawBlok(this, PX, this.py - 28);
    this.seedTrack();

    this.input.on('pointerdown', () => {
      unlockSfx();
      if (this.phase === 'play') this.wantJump();
    });
    this.input.on('pointerup', () => {
      this.holding = false;
    });
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-SPACE', () => this.wantJump());
      kb.on('keydown-UP', () => this.wantJump());
      kb.on('keyup-SPACE', () => {
        this.holding = false;
      });
      kb.on('keyup-UP', () => {
        this.holding = false;
      });
    }

    el('overlay-over').hidden = true;
    el('retry').onclick = () => {
      skipStart = true;
      this.scene.restart();
    };

    this.syncHud();
    if (skipStart) {
      skipStart = false;
      this.beginPlay();
    } else {
      el('overlay-start').hidden = false;
      el('overlay-start').onclick = () => this.beginPlay();
    }
  }

  update(_t: number, dt: number): void {
    const s = Math.min(dt, 32) / 1000;
    this.pulse += s;
    this.tickDecor(s);

    if (this.phase !== 'play') {
      this.rig.root.setPosition(PX, this.py - 28 + Math.sin(this.pulse * 2.2) * 3);
      poseBlok(this.rig, this.pulse * 8, true, 0, false);
      this.placeProps();
      return;
    }

    if (this.looping) this.tickLoop(s);
    else this.tickRun(s);

    this.camX += this.speed() * s;
    this.placeProps();
    this.recycle();
    this.spawnAhead();
    this.drawSpeedLines();
    this.spawnTrail();

    const dist = Math.floor(this.camX / 16);
    const next = dist + this.bonus;
    if (next !== this.score) {
      this.score = next;
      this.syncHud();
    }

    if (!this.looping) this.hitTest();
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    unlockSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'play';
    this.score = 0;
    this.bonus = 0;
    this.cores = 0;
    this.syncHud();
    this.showHint();
  }

  private speed(): number {
    const grow = Math.min(170, this.camX * 0.042);
    const turbo = this.boostT > 0 ? 150 : 0;
    return BASE + grow + turbo;
  }

  private wantJump(): void {
    if (this.phase !== 'play' || this.looping) return;
    this.holding = true;
    this.buffer = BUFFER;
    this.tryJump();
  }

  private tryJump(): void {
    if (this.looping) return;
    const can = this.grounded || this.coyote > 0;
    if (!can || this.buffer <= 0) return;
    this.vy = JUMP_V;
    this.grounded = false;
    this.coyote = 0;
    this.buffer = 0;
    this.hideHint();
    sfxJump();
    this.tweens.killTweensOf(this.rig.root);
    this.rig.root.setScale(0.86, 1.18);
    this.tweens.add({
      targets: this.rig.root,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: 'Sine.out',
    });
    burstDots(this, PX, this.py - 8, 0xe8ff47, 6);
  }

  private tickRun(s: number): void {
    this.boostT = Math.max(0, this.boostT - s);
    this.buffer = Math.max(0, this.buffer - s * 1000);
    this.coyote = Math.max(0, this.coyote - s * 1000);
    if (this.buffer > 0) this.tryJump();

    const rising = this.vy < 0;
    if (!this.holding && rising) this.vy *= Math.pow(CUT, s * 8);
    const g = rising && this.holding ? GRAV_HOLD : GRAV_FALL;
    this.vy += g * s;
    this.py += this.vy * s;

    const floor = this.floorAt(this.camX + PX, this.py);
    if (floor != null && this.vy >= 0 && this.py >= floor) {
      if (!this.grounded) {
        squashTo(this, this.rig.root, 1.18, 0.78, 120);
        sfxLand();
      }
      this.py = floor;
      this.vy = 0;
      this.grounded = true;
      this.coyote = COYOTE;
    } else if (this.py > GROUND + 90) {
      this.gameOver();
      return;
    } else {
      if (this.grounded) this.coyote = COYOTE;
      this.grounded = false;
    }

    this.run += s * (this.grounded ? this.speed() * 0.045 : 2);
    this.rig.root.setPosition(PX, this.py - 28);
    poseBlok(this.rig, this.run, this.grounded, this.vy, this.boostT > 0);
  }

  private tickLoop(s: number): void {
    this.loopA += (this.speed() * 1.25 * s) / LOOP_R;
    const cx = this.loopWx + LOOP_R - this.camX;
    const cy = GROUND - LOOP_R;
    const a = Math.PI / 2 + this.loopA;
    const sx = cx + Math.cos(a) * LOOP_R;
    const sy = cy + Math.sin(a) * LOOP_R;
    this.py = sy;
    this.rig.root.setPosition(sx, sy - 10);
    this.rig.root.setRotation(a + Math.PI / 2);
    poseBlok(this.rig, this.loopA * 10, false, -200, true);
    if (this.loopA >= Math.PI * 2) {
      this.looping = false;
      this.rig.root.setRotation(0);
      this.py = GROUND;
      this.vy = 0;
      this.grounded = true;
      this.boost(1.55);
      this.addBonus(50, PX + 20, GROUND - 80, 'ÓRBITA');
      sfxOrbit();
      burstDots(this, PX, GROUND - 40, 0x6ee7ff, 12);
      this.cameras.main.shake(80, 0.005);
    }
  }

  private floorAt(wx: number, feet: number): number | null {
    let best: number | null = null;
    for (const p of this.props) {
      if (p.kind !== 'plat' && p.kind !== 'zone') continue;
      if (wx < p.wx - 4 || wx > p.wx + p.w + 4) continue;
      const top = p.y;
      if (feet >= top - 16 && feet <= top + 22) {
        if (best == null || top < best) best = top;
      }
    }
    return best;
  }

  private hitTest(): void {
    const bx = PX - HIT_W / 2;
    const by = this.py - HIT_H;
    const wx = this.camX + PX;
    for (const p of this.props) {
      const sx = p.wx - this.camX;
      if (p.kind === 'core' && !p.taken) {
        const dx = wx - (p.wx + p.w / 2);
        const dy = this.py - 20 - p.y;
        if (dx * dx + dy * dy < 34 * 34) {
          p.taken = true;
          p.root.setVisible(false);
          this.cores += 1;
          this.addBonus(10, sx + p.w / 2, p.y, '+10');
          sfxCore();
          pulseRing(this, PX, this.py - 22, 0xe8ff47, 7, 1.8);
        }
        continue;
      }
      if (p.kind === 'pad' && !p.taken && this.grounded) {
        if (wx > p.wx && wx < p.wx + p.w) {
          p.taken = true;
          this.boost(1.25);
          this.addBonus(25, sx + p.w / 2, p.y - 20, 'TURBO');
          sfxBoost();
        }
        continue;
      }
      if (p.kind === 'zone' && this.grounded && wx > p.wx && wx < p.wx + p.w) {
        this.boostT = Math.max(this.boostT, 0.35);
        continue;
      }
      if (p.kind === 'loop' && !p.taken && wx > p.wx + 16 && wx < p.wx + 70) {
        if (this.speed() >= LOOP_MIN && this.grounded) {
          p.taken = true;
          this.looping = true;
          this.loopA = 0;
          this.loopWx = p.wx;
          sfxOrbit();
        }
        continue;
      }
      if (p.kind === 'spike' || p.kind === 'beam') {
        if (aabb(bx, by, HIT_W, HIT_H, sx, p.y, p.w, p.h)) {
          this.gameOver();
          return;
        }
      }
    }
  }

  private boost(sec: number): void {
    this.boostT = Math.max(this.boostT, sec);
    screenWash(this, 0xe8ff47, 0.08, 160);
    this.cameras.main.shake(50, 0.003);
  }

  private addBonus(n: number, x: number, y: number, label: string): void {
    this.bonus += n;
    floatLabel(this, x, y, label, { color: '#E8FF47', size: n >= 50 ? '18px' : '15px' });
  }

  private paintWorld(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x10141c, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xe8ff47, 0.05);
    g.fillCircle(40, 90, 120);
    g.fillStyle(0xff9a3c, 0.05);
    g.fillCircle(340, 210, 110);
    g.fillStyle(0x6ee7ff, 0.04);
    g.fillCircle(200, 760, 150);
    g.fillStyle(0x0b0b0c, 0.35);
    g.fillRect(0, GROUND + 8, W, H - GROUND);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0xf4f1ea, 0.05);
    for (let x = 0; x <= W; x += 26) grid.lineBetween(x, 0, x, GROUND);
    for (let y = 80; y <= GROUND; y += 26) grid.lineBetween(0, y, W, y);

    for (let i = 0; i < 5; i++) {
      const c = this.add.container(40 + i * 90, 140 + (i % 2) * 80).setDepth(2);
      const pipe = this.add.rectangle(0, 0, 18, 160 + (i % 3) * 40, 0x171c26, 0.9);
      pipe.setStrokeStyle(1, i % 2 ? 0x6ee7ff : 0xff9a3c, 0.28);
      c.add(pipe);
      this.mid.push(c);
    }

    for (let i = 0; i < 10; i++) {
      const mote = this.add
        .circle(Math.random() * W, 80 + Math.random() * 500, 1.2 + Math.random() * 1.6, i % 2 ? 0xe8ff47 : 0xff9a3c, 0.22)
        .setDepth(3);
      this.motes.push({ g: mote, vx: 18 + Math.random() * 36 });
    }

    const rail = this.add.graphics().setDepth(8);
    rail.fillStyle(0x151820, 1);
    rail.fillRect(0, GROUND + 18, W, H - GROUND - 18);
    rail.fillStyle(0x2a3140, 1);
    rail.fillRect(0, GROUND + 18, W, 10);
    rail.fillStyle(0xe8ff47, 0.8);
    for (let x = 0; x < W; x += 14) rail.fillRect(x, GROUND + 20, 8, 3);
  }

  private seedTrack(): void {
    this.addPlat(-80, 700);
    this.scatterCores(80, 220, GROUND - 90, 5);
    this.spawnX = 620;
    this.spawnAhead();
  }

  private spawnAhead(): void {
    let guard = 0;
    while (this.spawnX < this.camX + 980 && guard++ < 12) {
      const d = Math.min(1, this.camX / 4200);
      const roll = Math.random();
      if (roll < 0.16) this.patFlat();
      else if (roll < 0.32) this.patSpikes(d);
      else if (roll < 0.48) this.patGap(d);
      else if (roll < 0.6) this.patPad();
      else if (roll < 0.72) this.patBeam(d);
      else if (roll < 0.82) this.patStairs(d);
      else if (roll < 0.9) this.patZone();
      else this.patOrbit();
    }
  }

  private patFlat(): void {
    const w = 240 + Math.floor(Math.random() * 120);
    this.addPlat(this.spawnX, w);
    this.scatterCores(this.spawnX + 40, w - 80, GROUND - 70 - Math.random() * 50, 4);
    this.spawnX += w;
  }

  private patSpikes(d: number): void {
    this.addPlat(this.spawnX, 320);
    const n = 1 + (d > 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) this.addSpike(this.spawnX + 130 + i * 70);
    this.scatterCores(this.spawnX + 40, 240, GROUND - 120, 3);
    this.spawnX += 320;
  }

  private patGap(d: number): void {
    const run = 160;
    const gap = 88 + Math.floor(d * 50) + Math.floor(Math.random() * 24);
    this.addPlat(this.spawnX, run);
    this.scatterCores(this.spawnX + 20, run - 30, GROUND - 100, 3);
    this.spawnX += run + gap;
    this.addPlat(this.spawnX, 200);
    this.spawnX += 200;
  }

  private patPad(): void {
    this.addPlat(this.spawnX, 300);
    this.addPad(this.spawnX + 90);
    this.scatterCores(this.spawnX + 140, 140, GROUND - 130, 4);
    this.spawnX += 300;
  }

  private patBeam(d: number): void {
    this.addPlat(this.spawnX, 280);
    const top = GROUND - 92 + Math.floor(d * 10);
    this.addBeam(this.spawnX + 150, top, 64, 90);
    this.scatterCores(this.spawnX + 40, 80, GROUND - 50, 2);
    this.spawnX += 280;
  }

  private patStairs(d: number): void {
    const gap = 70 + Math.floor(d * 30);
    this.addPlat(this.spawnX, 140);
    this.spawnX += 140 + 36;
    this.addPlat(this.spawnX, 90, GROUND - 52);
    this.scatterCores(this.spawnX, 90, GROUND - 110, 2);
    this.spawnX += 90 + gap;
    this.addPlat(this.spawnX, 220);
    this.spawnX += 220;
  }

  private patZone(): void {
    this.addZone(this.spawnX, 260);
    this.scatterCores(this.spawnX + 20, 220, GROUND - 88, 5);
    this.spawnX += 260;
  }

  private patOrbit(): void {
    this.addPlat(this.spawnX, 80);
    this.addPad(this.spawnX + 10);
    this.spawnX += 80;
    this.addLoop(this.spawnX);
    this.addPlat(this.spawnX, LOOP_R * 2 + 20);
    this.spawnX += LOOP_R * 2 + 40;
    this.addPlat(this.spawnX, 180);
    this.spawnX += 180;
  }

  private addPlat(wx: number, w: number, y = GROUND): void {
    const root = this.add.container(wx, y).setDepth(10);
    const g = this.add.graphics();
    g.fillStyle(0x1c2430, 1);
    g.fillRoundedRect(0, 0, w, 22, 5);
    g.fillStyle(0x2b3444, 1);
    g.fillRoundedRect(2, 2, w - 4, 8, 4);
    g.fillStyle(0xe8ff47, 0.75);
    g.fillRect(6, 3, w - 12, 3);
    g.fillStyle(0xf4f1ea, 0.12);
    for (let x = 10; x < w; x += 22) g.fillRect(x, 10, 10, 8);
    root.add(g);
    this.props.push({ kind: 'plat', wx, y, w, h: 22, root });
  }

  private addSpike(wx: number): void {
    const w = 28;
    const h = 24;
    const y = GROUND - h;
    const root = this.add.container(wx, y).setDepth(12);
    const g = this.add.graphics();
    g.fillStyle(0xff3b4a, 0.95);
    g.fillTriangle(2, h, w / 2, 1, w - 2, h);
    g.fillStyle(0xff8a94, 0.7);
    g.fillTriangle(8, h, w / 2, 6, w / 2 + 2, h);
    g.fillStyle(0x1c2430, 1);
    g.fillRect(0, h - 4, w, 6);
    root.add(g);
    this.props.push({ kind: 'spike', wx, y, w, h, root });
  }

  private addPad(wx: number): void {
    const w = 46;
    const h = 12;
    const y = GROUND - 8;
    const root = this.add.container(wx, y).setDepth(11);
    const g = this.add.graphics();
    g.fillStyle(0xff9a3c, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.fillStyle(0xe8ff47, 1);
    g.fillTriangle(10, 9, 22, 2, 22, 9);
    g.fillTriangle(22, 9, 34, 2, 34, 9);
    root.add(g);
    this.props.push({ kind: 'pad', wx, y, w, h, root });
  }

  private addCore(wx: number, y: number): void {
    const root = this.add.container(wx, y).setDepth(14);
    const g = this.add.graphics();
    g.lineStyle(2.4, 0xe8ff47, 0.95);
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
      const x = Math.cos(a) * 9;
      const yy = Math.sin(a) * 9;
      if (i === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.strokePath();
    g.lineStyle(1.4, 0x6ee7ff, 0.7);
    g.strokeCircle(0, 0, 4.5);
    g.fillStyle(0xe8ff47, 0.28);
    g.fillCircle(0, 0, 3);
    root.add(g);
    this.tweens.add({
      targets: root,
      y: y - 5,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.props.push({ kind: 'core', wx, y, w: 18, h: 18, root });
  }

  private addBeam(wx: number, y: number, w: number, h: number): void {
    const root = this.add.container(wx, y).setDepth(12);
    const g = this.add.graphics();
    g.fillStyle(0x171c26, 0.96);
    g.fillRoundedRect(0, 0, w, h, 8);
    g.fillStyle(0x6ee7ff, 0.16);
    g.fillRoundedRect(6, 8, 10, h - 16, 4);
    g.lineStyle(2, 0xf4f1ea, 0.45);
    g.strokeRoundedRect(0, 0, w, h, 8);
    g.fillStyle(0xff9a3c, 0.85);
    g.fillRoundedRect(-6, h - 10, w + 12, 10, 4);
    root.add(g);
    this.props.push({ kind: 'beam', wx, y, w, h, root });
  }

  private addZone(wx: number, w: number): void {
    const root = this.add.container(wx, GROUND).setDepth(9);
    const g = this.add.graphics();
    g.fillStyle(0xff9a3c, 0.16);
    g.fillRect(0, -36, w, 36);
    g.fillStyle(0x1c2430, 1);
    g.fillRoundedRect(0, 0, w, 22, 5);
    g.fillStyle(0xff9a3c, 0.9);
    g.fillRect(4, 3, w - 8, 4);
    for (let x = 12; x < w; x += 28) {
      g.fillStyle(0xe8ff47, 0.85);
      g.fillTriangle(x, 16, x + 10, 8, x + 10, 16);
    }
    root.add(g);
    this.props.push({ kind: 'zone', wx, y: GROUND, w, h: 22, root });
  }

  private addLoop(wx: number): void {
    const root = this.add.container(wx + LOOP_R, GROUND - LOOP_R).setDepth(7);
    const g = this.add.graphics();
    g.lineStyle(16, 0x2a3140, 1);
    g.strokeCircle(0, 0, LOOP_R);
    g.lineStyle(6, 0xe8ff47, 0.85);
    g.strokeCircle(0, 0, LOOP_R);
    g.lineStyle(2, 0x6ee7ff, 0.45);
    g.strokeCircle(0, 0, LOOP_R - 14);
    g.strokeCircle(0, 0, LOOP_R + 12);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      g.lineStyle(2, 0xf4f1ea, 0.2);
      g.lineBetween(Math.cos(a) * (LOOP_R - 18), Math.sin(a) * (LOOP_R - 18), Math.cos(a) * (LOOP_R + 10), Math.sin(a) * (LOOP_R + 10));
    }
    root.add(g);
    this.props.push({ kind: 'loop', wx, y: GROUND - LOOP_R * 2, w: LOOP_R * 2, h: LOOP_R * 2, root });
  }

  private scatterCores(wx: number, span: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const lift = Math.sin(t * Math.PI) * 28;
      this.addCore(wx + t * span, y - lift);
    }
  }

  private placeProps(): void {
    for (const p of this.props) {
      if (p.kind === 'loop') p.root.setPosition(p.wx + LOOP_R - this.camX, GROUND - LOOP_R);
      else if (p.kind === 'core') p.root.setX(p.wx - this.camX);
      else p.root.setPosition(p.wx - this.camX, p.y);
    }
  }

  private recycle(): void {
    this.props = this.props.filter((p) => {
      if (p.wx + p.w > this.camX - 100) return true;
      this.tweens.killTweensOf(p.root);
      p.root.destroy(true);
      return false;
    });
  }

  private spawnTrail(): void {
    if (this.time.now - this.lastTrail < 48) return;
    this.lastTrail = this.time.now;
    const c = this.boostT > 0 ? 0xff9a3c : 0xe8ff47;
    const dot = this.add.circle(this.rig.root.x - 14, this.rig.root.y + 10, this.boostT > 0 ? 4 : 3, c, 0.35).setDepth(18);
    this.tweens.add({
      targets: dot,
      x: this.rig.root.x - 54,
      alpha: 0,
      scale: 0.2,
      duration: 240,
      onComplete: () => dot.destroy(),
    });
  }

  private drawSpeedLines(): void {
    this.lines.clear();
    if (this.phase !== 'play') return;
    const n = this.boostT > 0 ? 7 : 3;
    this.lines.lineStyle(1.4, 0xf4f1ea, this.boostT > 0 ? 0.22 : 0.08);
    for (let i = 0; i < n; i++) {
      const y = 90 + ((this.pulse * 180 + i * 90) % 520);
      const x = 40 + (i * 47) % 260;
      this.lines.lineBetween(x + 30, y, x, y + 1);
    }
  }

  private tickDecor(s: number): void {
    const drift = (this.phase === 'play' ? this.speed() : 40) * s;
    for (const c of this.mid) {
      c.x -= drift * 0.28;
      if (c.x < -30) c.x = W + 30;
    }
    for (const m of this.motes) {
      m.g.x -= m.vx * s * (this.phase === 'play' ? 1.5 : 0.4);
      if (m.g.x < -8) {
        m.g.x = W + 8;
        m.g.y = 80 + Math.random() * 500;
      }
    }
  }

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    this.looping = false;
    this.holding = false;
    const prevBest = this.best;
    saveRushBest(this.score);
    this.best = loadRushBest();
    this.syncHud();
    squashTo(this, this.rig.root, 1.24, 0.68, 180);
    this.cameras.main.shake(170, 0.012);
    burstDots(this, this.rig.root.x, this.rig.root.y, 0xff9a3c, 11);
    screenWash(this, 0xff3b4a, 0.16, 260);
    sfxLand();
    sfxOver();
    el('over-score').textContent = `Puntos ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
    this.time.delayedCall(140, () => {
      el('overlay-over').hidden = false;
    });
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const chip = document.getElementById('next-chip');
    if (chip) {
      chip.style.background = this.boostT > 0 ? '#FF9A3C' : '#E8FF47';
      chip.textContent = this.boostT > 0 ? '⚡' : '🙂';
      chip.dataset.kind = 'circle';
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = 'BLOK';
    const nuc = document.getElementById('rush-cores');
    if (nuc) nuc.textContent = String(this.cores);
  }

  private showHint(): void {
    if (this.hintShown) return;
    const hint = document.getElementById('drop-hint');
    if (!hint) return;
    hint.hidden = false;
    this.hintShown = true;
  }

  private hideHint(): void {
    const hint = document.getElementById('drop-hint');
    if (hint) hint.hidden = true;
  }
}
