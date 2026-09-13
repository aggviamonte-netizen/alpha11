import Phaser from 'phaser';
import { creature, radiusPx } from './canon';
import { el } from './dom';
import { burstDots, pulseRing, screenWash, squashTo } from './juice';
import { loadJumpBest, saveJumpBest } from './jumpScore';
import { sfxGate, sfxJump, sfxLand, sfxOver, unlockSfx } from './sfx';
import { drawCreature, paintLabBackdrop } from './sprites';

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
  private shadow!: Phaser.GameObjects.Ellipse;
  private gates: Gate[] = [];
  private motes: Mote[] = [];
  private racks: Array<{ x: number }> = [];
  private pulse = 0;
  private lastTrail = 0;
  private frozenUntil = 0;
  private flapping = false;

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
    this.frozenUntil = 0;
    this.flapping = false;

    this.paintWorld();
    this.shadow = this.add.ellipse(PX, this.py + radiusPx(5) * 0.86, 28, 10, 0x000000, 0.22).setDepth(18);
    this.player = drawCreature(this, PX, this.py, 5);
    this.player.setDepth(20);
    this.glow = this.add.circle(PX, this.py, radiusPx(5) * 1.5, creature(5).color, 0.18);
    this.glow.setDepth(19);

    this.input.on('pointerdown', () => {
      unlockSfx();
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
      const y = this.py + Math.sin(this.pulse * 2.4) * 5;
      this.player.setPosition(PX, y);
      this.glow.setPosition(PX, y);
      this.glow.setAlpha(0.16 + Math.sin(this.pulse * 3) * 0.05);
      this.shadow.setPosition(PX, y + radiusPx(5) * 0.86);
      return;
    }

    if (this.time.now < this.frozenUntil) {
      this.player.setPosition(PX, this.py);
      this.glow.setPosition(PX, this.py);
      this.shadow.setPosition(PX, this.py + radiusPx(5) * 0.86);
      return;
    }

    this.vy = Math.min(this.vy + GRAVITY * s, MAX_FALL);
    this.py += this.vy * s;
    this.player.setPosition(PX, this.py);
    this.player.setRotation(Phaser.Math.Clamp(this.vy / 980, -0.5, 0.72));
    if (!this.flapping) {
      const t = Phaser.Math.Clamp(this.vy / MAX_FALL, -0.75, 1);
      this.player.setScale(1 - t * 0.1, 1 + t * 0.13);
    }
    this.glow.setPosition(PX, this.py);
    this.glow.setAlpha(0.18 + Math.max(0, -this.vy) / 1800);
    this.shadow.setPosition(PX, this.py + radiusPx(5) * 0.86);
    this.shadow.setAlpha(0.12 + Math.max(0, this.vy) / 2800);

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
        pulseRing(this, PX + 8, this.py, 0xe8ff47, 8, 1.8);
        sfxGate();
      }
    }

    this.recycleGates();
    this.spawnTrail();

    if (this.hitWorld()) this.gameOver();
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    unlockSfx();
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
    sfxJump();
    this.flapping = true;
    this.tweens.killTweensOf(this.player);
    this.player.setScale(1.18, 0.7);
    this.tweens.add({
      targets: this.player,
      scaleX: 0.86,
      scaleY: 1.2,
      duration: 70,
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          scaleX: 1,
          scaleY: 1,
          duration: 130,
          ease: 'Sine.out',
          onComplete: () => {
            this.flapping = false;
          },
        });
      },
    });
    burstDots(this, PX, this.py + 10, creature(5).color, 7);
  }

  private scrollSpeed(): number {
    return 148 + Math.min(130, this.score * 2.1);
  }

  private gapSize(): number {
    return 236 - Math.min(70, this.score * 1.15);
  }

  private paintWorld(): void {
    paintLabBackdrop(this);
    const wash = this.add.graphics().setDepth(0);
    wash.fillStyle(0x141822, 0.82);
    wash.fillRect(0, 0, W, H);
    wash.fillStyle(0x6ee7ff, 0.08);
    wash.fillEllipse(W * 0.22, 150, 240, 110);
    wash.fillStyle(0xff8bd1, 0.07);
    wash.fillEllipse(W * 0.78, 680, 260, 120);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0xf4f1ea, 0.08);
    for (let x = 0; x <= W; x += 28) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 28) grid.lineBetween(0, y, W, y);

    const colors = [0x8b9bff, 0x6ee7ff, 0xff8bd1, 0xe8ff47];
    for (let i = 0; i < 7; i++) {
      const x = 22 + i * 56;
      const h = 96 + (i % 3) * 54;
      const y = i % 2 === 0 ? 92 + h / 2 : H - 92 - h / 2;
      const rack = this.add.rectangle(x, y, 20, h, 0x151820, 0.92).setDepth(2);
      rack.setStrokeStyle(1, colors[i % colors.length], 0.32);
      this.racks.push(rack);
      const flask = this.add.circle(x, y, 6, colors[i % colors.length], 0.4).setDepth(2);
      this.racks.push(flask);
    }

    for (let i = 0; i < 12; i++) {
      const mote = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        1.3 + Math.random() * 1.8,
        i % 2 === 0 ? 0xe8ff47 : 0x6ee7ff,
        0.2 + Math.random() * 0.28,
      );
      mote.setDepth(3);
      this.motes.push({ g: mote, vx: 16 + Math.random() * 32 });
    }

    const rails = this.add.graphics().setDepth(8);
    rails.fillStyle(0x1a202a, 1);
    rails.fillRect(0, 0, W, RAIL);
    rails.fillRect(0, H - RAIL, W, RAIL);
    rails.fillStyle(0xffffff, 0.1);
    rails.fillRect(0, RAIL - 10, W, 6);
    rails.fillStyle(0xf4f1ea, 0.28);
    rails.fillRect(0, RAIL - 4, W, 4);
    rails.fillRect(0, H - RAIL, W, 4);
    rails.lineStyle(2, 0xe8ff47, 0.75);
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
    g.fillStyle(0x1c2430, 0.98);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.fillStyle(0x6ee7ff, 0.12);
    g.fillRoundedRect(-w / 2 + 5, -h / 2 + 6, w * 0.34, Math.max(12, h - 12), 5);
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(w / 2 - 14, -h / 2 + 8, 8, Math.max(10, h - 16), 4);
    g.lineStyle(2, 0xf4f1ea, 0.5);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    const step = 32;
    const n = Math.max(1, Math.floor(h / step));
    const vial = [0x7cffb2, 0x8b9bff, 0xff8bd1, 0xe8ff47, 0x6ee7ff];
    for (let i = 0; i < n; i++) {
      const vy = -h / 2 + 18 + i * step;
      if (vy > h / 2 - 18) continue;
      g.fillStyle(vial[i % vial.length], 0.42);
      g.fillRoundedRect(-12, vy - 11, 24, 22, 8);
      g.lineStyle(1, 0xf4f1ea, 0.38);
      g.strokeRoundedRect(-12, vy - 11, 24, 22, 8);
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(-5, vy - 4, 3);
    }

    const lipY = lip === 'bottom' ? h / 2 - 6 : -h / 2 + 6;
    g.fillStyle(0xe8ff47, 0.22);
    g.fillRoundedRect(-w / 2 - 10, lipY - 12, w + 20, 24, 10);
    g.fillStyle(0xe8ff47, 0.96);
    g.fillRoundedRect(-w / 2 - 4, lipY - 5, w + 8, 10, 4);
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
    if (this.time.now - this.lastTrail < 52) return;
    this.lastTrail = this.time.now;
    const dot = this.add.circle(PX - 12, this.py + 4, 3.4, creature(5).color, 0.32).setDepth(18);
    this.tweens.add({
      targets: dot,
      x: PX - 50,
      alpha: 0,
      scale: 0.15,
      duration: 260,
      onComplete: () => dot.destroy(),
    });
  }

  private tickDecor(s: number): void {
    const drift = (this.phase === 'play' && this.time.now >= this.frozenUntil ? this.scrollSpeed() : 36) * s;
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

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    const prevBest = this.best;
    saveJumpBest(this.score);
    this.best = loadJumpBest();
    this.syncHud();
    this.frozenUntil = this.time.now + 90;
    squashTo(this, this.player, 1.22, 0.7, 180);
    this.cameras.main.shake(180, 0.012);
    burstDots(this, PX, this.py, 0xe8ff47, 10);
    screenWash(this, 0xff8bd1, 0.18, 260);
    sfxLand();
    sfxOver();
    el('over-score').textContent = `Distancia ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
    this.time.delayedCall(140, () => {
      el('overlay-over').hidden = false;
    });
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const c = creature(5);
    const chip = document.getElementById('next-chip');
    if (chip) {
      chip.style.background = c.hex;
      chip.textContent = c.emoji;
      chip.dataset.kind = c.kind;
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = c.code;
  }
}
