import Phaser from 'phaser';
import { creature, radiusPx } from './canon';
import { el } from './dom';
import { drawCreature } from './drawCreature';
import { loadJumpBest, saveJumpBest } from './jumpScore';

export const W = 390;
export const H = 844;

const PX = 96;
const GRAVITY = 1280;
const FLAP = -390;
const MAX_FALL = 620;
const RAIL = 40;
const PIPE_W = 68;
const INTERVAL = 268;
const HIT = 0.66;

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
  private racks: Phaser.GameObjects.Shape[] = [];
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
    return 236 - Math.min(70, this.score * 1.15);
  }

  private paintWorld(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b0b0c).setDepth(0);
    this.add.rectangle(W / 2, H / 2, W, H, 0x10141c, 0.55).setDepth(0);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0xf4f1ea, 0.07);
    for (let x = 0; x <= W; x += 26) {
      grid.lineBetween(x, 0, x, H);
    }
    for (let y = 0; y <= H; y += 26) {
      grid.lineBetween(0, y, W, y);
    }

    const wash = this.add.graphics().setDepth(1);
    wash.fillStyle(0x6ee7ff, 0.04);
    wash.fillRect(0, 120, W, 80);
    wash.fillStyle(0xff8bd1, 0.035);
    wash.fillRect(0, 620, W, 70);

    const colors = [0x8b9bff, 0x6ee7ff, 0xff8bd1, 0xe8ff47];
    for (let i = 0; i < 8; i++) {
      const x = 18 + i * 52;
      const h = 110 + (i % 3) * 64;
      const y = i % 2 === 0 ? 96 + h / 2 : H - 96 - h / 2;
      const rack = this.add.rectangle(x, y, 22, h, 0x161920, 0.95).setDepth(2);
      rack.setStrokeStyle(1, colors[i % colors.length], 0.28);
      this.racks.push(rack);
      const flask = this.add.circle(x, y, 7, colors[i % colors.length], 0.35).setDepth(2);
      this.racks.push(flask);
    }

    for (let i = 0; i < 16; i++) {
      const mote = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        1.4 + Math.random() * 2,
        i % 2 === 0 ? 0xe8ff47 : 0x6ee7ff,
        0.22 + Math.random() * 0.3,
      );
      mote.setDepth(3);
      this.motes.push({ g: mote, vx: 18 + Math.random() * 36 });
    }

    const rails = this.add.graphics().setDepth(8);
    rails.fillStyle(0x141820, 1);
    rails.fillRect(0, 0, W, RAIL);
    rails.fillRect(0, H - RAIL, W, RAIL);
    rails.fillStyle(0xf4f1ea, 0.16);
    rails.fillRect(0, RAIL - 4, W, 4);
    rails.fillRect(0, H - RAIL, W, 4);
    rails.lineStyle(2, 0xe8ff47, 0.7);
    for (let x = 0; x < W; x += 12) {
      rails.lineBetween(x, RAIL - 2, Math.min(x + 7, W), RAIL - 2);
      rails.lineBetween(x, H - RAIL + 2, Math.min(x + 7, W), H - RAIL + 2);
    }

    for (let i = 0; i < 4; i++) this.spawnGate(W + 90 + i * INTERVAL);
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
    g.fillStyle(0x1a222c, 0.97);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.fillStyle(0x6ee7ff, 0.1);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 7, w * 0.36, Math.max(12, h - 14), 5);
    g.lineStyle(2, 0xf4f1ea, 0.55);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    const step = 32;
    const n = Math.max(1, Math.floor(h / step));
    const vial = [0x7cffb2, 0x8b9bff, 0xff8bd1, 0xe8ff47, 0x6ee7ff];
    for (let i = 0; i < n; i++) {
      const vy = -h / 2 + 18 + i * step;
      if (vy > h / 2 - 18) continue;
      g.fillStyle(vial[i % vial.length], 0.38);
      g.fillRoundedRect(-12, vy - 11, 24, 22, 8);
      g.lineStyle(1, 0xf4f1ea, 0.4);
      g.strokeRoundedRect(-12, vy - 11, 24, 22, 8);
      g.fillStyle(0xffffff, 0.16);
      g.fillCircle(-5, vy - 4, 3);
    }

    const lipY = lip === 'bottom' ? h / 2 - 6 : -h / 2 + 6;
    g.fillStyle(0xe8ff47, 0.95);
    g.fillRoundedRect(-w / 2 - 4, lipY - 5, w + 8, 10, 4);
    g.fillStyle(0xe8ff47, 0.22);
    g.fillRoundedRect(-w / 2 - 10, lipY - 12, w + 20, 24, 10);
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
