import Phaser from 'phaser';
import { creature, radiusPx } from './canon';
import { el } from './dom';
import { drawCreature } from './drawCreature';
import { loadJumpBest, saveJumpBest } from './jumpScore';

export const W = 390;
export const H = 844;

const PX = 96;
const GRAVITY = 1680;
const FLAP = -430;
const MAX_FALL = 760;
const RAIL = 36;
const PIPE_W = 56;
const INTERVAL = 248;
const HIT = 0.7;

type Phase = 'start' | 'play' | 'over';

type Gate = {
  x: number;
  gapY: number;
  gap: number;
  scored: boolean;
  root: Phaser.GameObjects.Container;
};

type Mote = { g: Phaser.GameObjects.Arc; vx: number };

let skipStart = false;

function circleRect(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number): boolean {
  const nx = Phaser.Math.Clamp(cx, x, x + w);
  const ny = Phaser.Math.Clamp(cy, y, y + h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export class JumpScene extends Phaser.Scene {
  private phase: Phase = 'start';
  private score = 0;
  private best = 0;
  private py = H * 0.46;
  private vy = 0;
  private traveled = 0;
  private player!: Phaser.GameObjects.Container;
  private glow!: Phaser.GameObjects.Arc;
  private gates: Gate[] = [];
  private motes: Mote[] = [];
  private racks: Phaser.GameObjects.Rectangle[] = [];
  private pulse = 0;
  private lastTrail = 0;

  constructor() {
    super('jump');
  }

  create(): void {
    this.phase = 'start';
    this.score = 0;
    this.best = loadJumpBest();
    this.py = H * 0.46;
    this.vy = 0;
    this.traveled = 0;
    this.gates = [];
    this.motes = [];
    this.racks = [];
    this.pulse = 0;
    this.lastTrail = 0;

    this.paintWorld();
    this.player = drawCreature(this, PX, this.py, 5, 1);
    this.player.setDepth(20);
    this.glow = this.add.circle(PX, this.py, radiusPx(5) * 1.45, creature(5).color, 0.2);
    this.glow.setDepth(19);

    this.input.on('pointerdown', () => {
      if (this.phase === 'play') this.flap();
    });

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
      this.player.setPosition(PX, this.py + Math.sin(this.pulse * 2.4) * 5);
      this.glow.setPosition(PX, this.player.y);
      this.glow.setAlpha(0.16 + Math.sin(this.pulse * 3) * 0.05);
      return;
    }

    this.vy = Math.min(this.vy + GRAVITY * s, MAX_FALL);
    this.py += this.vy * s;
    this.player.setPosition(PX, this.py);
    this.player.setRotation(Phaser.Math.Clamp(this.vy / 980, -0.5, 0.72));
    this.glow.setPosition(PX, this.py);
    this.glow.setAlpha(0.2 + Math.max(0, -this.vy) / 1800);

    const speed = this.scrollSpeed();
    this.traveled += speed * s;
    const next = Math.floor(this.traveled / 16);
    if (next !== this.score) {
      this.score = next;
      this.syncHud();
    }

    for (const gate of this.gates) {
      gate.x -= speed * s;
      gate.root.setX(gate.x);
      if (!gate.scored && gate.x + PIPE_W / 2 < PX) {
        gate.scored = true;
      }
    }

    this.recycleGates();
    this.spawnTrail();

    if (this.hitWorld()) this.gameOver();
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'play';
    this.score = 0;
    this.traveled = 0;
    this.syncHud();
    this.flap();
  }

  private flap(): void {
    if (this.phase !== 'play') return;
    this.vy = FLAP;
    this.burst(PX, this.py, creature(5).color);
  }

  private scrollSpeed(): number {
    return 148 + Math.min(130, this.score * 2.1);
  }

  private gapSize(): number {
    return 224 - Math.min(78, this.score * 1.45);
  }

  private paintWorld(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b0b0c).setDepth(0);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0xf4f1ea, 0.045);
    for (let x = 0; x <= W; x += 26) {
      grid.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y <= H; y += 26) {
      grid.lineBetween(0, y, W, y);
    }

    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 62;
      const h = 90 + (i % 3) * 50;
      const y = i % 2 === 0 ? 90 + h / 2 : H - 90 - h / 2;
      const rack = this.add.rectangle(x, y, 18, h, 0x12141a, 0.9).setDepth(2);
      rack.setStrokeStyle(1, 0x6ee7ff, 0.12);
      this.racks.push(rack);
    }

    for (let i = 0; i < 14; i++) {
      const mote = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        1.2 + Math.random() * 1.6,
        0xe8ff47,
        0.18 + Math.random() * 0.25,
      );
      mote.setDepth(3);
      this.motes.push({ g: mote, vx: 18 + Math.random() * 36 });
    }

    const rails = this.add.graphics().setDepth(8);
    rails.fillStyle(0x101218, 1);
    rails.fillRect(0, 0, W, RAIL);
    rails.fillRect(0, H - RAIL, W, RAIL);
    rails.fillStyle(0xf4f1ea, 0.12);
    rails.fillRect(0, RAIL - 3, W, 3);
    rails.fillRect(0, H - RAIL, W, 3);
    rails.lineStyle(1, 0xe8ff47, 0.55);
    for (let x = 0; x < W; x += 12) {
      rails.lineBetween(x, RAIL - 1, Math.min(x + 7, W), RAIL - 1);
      rails.lineBetween(x, H - RAIL + 1, Math.min(x + 7, W), H - RAIL + 1);
    }

    for (let i = 0; i < 4; i++) this.spawnGate(W + 70 + i * INTERVAL);
  }

  private spawnGate(x: number): void {
    const gap = this.gapSize();
    const minY = RAIL + 18 + gap / 2;
    const maxY = H - RAIL - 18 - gap / 2;
    const gapY = Phaser.Math.Between(Math.ceil(minY), Math.floor(maxY));
    const topH = gapY - gap / 2;
    const botY = gapY + gap / 2;
    const botH = H - botY;
    const root = this.add.container(x, 0).setDepth(12);
    root.add(this.drawColumn(0, topH / 2, PIPE_W, topH, 'bottom'));
    root.add(this.drawColumn(0, botY + botH / 2, PIPE_W, botH, 'top'));
    this.gates.push({ x, gapY, gap, scored: false, root });
  }

  private drawColumn(
    x: number,
    y: number,
    w: number,
    h: number,
    lip: 'top' | 'bottom',
  ): Phaser.GameObjects.Container {
    const col = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x141820, 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 7);
    g.fillStyle(0x6ee7ff, 0.07);
    g.fillRoundedRect(-w / 2 + 5, -h / 2 + 6, w * 0.34, Math.max(12, h - 12), 4);
    g.lineStyle(2, 0xf4f1ea, 0.3);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 7);

    const step = 34;
    const n = Math.max(1, Math.floor(h / step));
    for (let i = 0; i < n; i++) {
      const vy = -h / 2 + 18 + i * step;
      if (vy > h / 2 - 16) continue;
      g.fillStyle(i % 2 === 0 ? 0x8b9bff : 0xff8bd1, 0.16);
      g.fillCircle(0, vy, 10);
      g.lineStyle(1, 0xf4f1ea, 0.22);
      g.strokeCircle(0, vy, 10);
      g.fillStyle(0xe8ff47, 0.12);
      g.fillCircle(-3, vy - 3, 3);
    }

    const lipY = lip === 'bottom' ? h / 2 - 5 : -h / 2 + 5;
    g.fillStyle(0xe8ff47, 0.9);
    g.fillRoundedRect(-w / 2 - 3, lipY - 4, w + 6, 8, 3);
    g.fillStyle(0xe8ff47, 0.18);
    g.fillRoundedRect(-w / 2 - 8, lipY - 10, w + 16, 20, 8);
    col.add(g);
    return col;
  }

  private recycleGates(): void {
    this.gates = this.gates.filter((gate) => {
      if (gate.x > -PIPE_W - 20) return true;
      gate.root.destroy(true);
      return false;
    });
    let farthest = this.gates.reduce((m, g) => Math.max(m, g.x), PX);
    while (this.gates.length < 4) {
      farthest += INTERVAL;
      this.spawnGate(farthest);
    }
  }

  private spawnTrail(): void {
    if (this.time.now - this.lastTrail < 48) return;
    this.lastTrail = this.time.now;
    const dot = this.add.circle(PX - 10, this.py + 4, 3.2, creature(5).color, 0.35).setDepth(18);
    this.tweens.add({
      targets: dot,
      x: PX - 46,
      alpha: 0,
      scale: 0.2,
      duration: 280,
      onComplete: () => dot.destroy(),
    });
  }

  private tickDecor(s: number): void {
    const drift = (this.phase === 'play' ? this.scrollSpeed() : 36) * s;
    for (const rack of this.racks) {
      rack.x -= drift * 0.28;
      if (rack.x < -20) rack.x = W + 20;
    }
    for (const mote of this.motes) {
      mote.g.x -= mote.vx * s * (this.phase === 'play' ? 1.4 : 0.4);
      mote.g.y += Math.sin((mote.g.x + this.pulse * 40) * 0.04) * 0.25;
      if (mote.g.x < -8) {
        mote.g.x = W + 8;
        mote.g.y = Math.random() * H;
      }
    }
  }

  private hitWorld(): boolean {
    const r = radiusPx(5) * HIT;
    if (this.py - r <= RAIL || this.py + r >= H - RAIL) return true;
    for (const gate of this.gates) {
      const topH = gate.gapY - gate.gap / 2;
      const botY = gate.gapY + gate.gap / 2;
      if (circleRect(PX, this.py, r, gate.x - PIPE_W / 2, 0, PIPE_W, topH)) return true;
      if (circleRect(PX, this.py, r, gate.x - PIPE_W / 2, botY, PIPE_W, H - botY)) return true;
    }
    return false;
  }

  private burst(x: number, y: number, color: number): void {
    const g = this.add.graphics().setDepth(22);
    g.fillStyle(color, 0.8);
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7;
      g.fillCircle(x + Math.cos(a) * 14, y + Math.sin(a) * 14, 3);
    }
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 280,
      onComplete: () => g.destroy(),
    });
  }

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    saveJumpBest(this.score);
    this.best = loadJumpBest();
    this.syncHud();
    this.cameras.main.shake(160, 0.01);
    this.burst(PX, this.py, 0xe8ff47);
    el('over-score').textContent = `Distancia ${this.score} · Mejor ${this.best}`;
    el('overlay-over').hidden = false;
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    el('hint').textContent = `${creature(5).emoji} ${creature(5).code} ${creature(5).name}`;
  }
}
