import Phaser from 'phaser';
import { creature } from '../game/canon';
import { el } from '../game/dom';
import { burstDots, floatLabel, pulseRing, screenWash, squashTo, UI_FONT } from '../game/juice';
import { drawCreature } from '../game/sprites';
import { loadSniperBest, saveSniperBest } from './score';
import {
  sfxBull,
  sfxDry,
  sfxFire,
  sfxHit,
  sfxMiss,
  sfxOver,
  sfxPopUp,
  sfxTick,
  unlockSniperSfx,
} from './sfx';

export const W = 390;
export const H = 844;

const ROUND_S = 48;
const TOUCH_LIFT = 56;
const COOLDOWN = 260;
const WIND_PX = 8;
const STEADY_S = 0.7;
const HIT_PAD = 16;

type Phase = 'start' | 'play' | 'over';
type Lane = 0 | 1 | 2;

type Dummy = {
  id: number;
  lane: Lane;
  slot: number;
  tier: number;
  x: number;
  y: number;
  r: number;
  live: boolean;
  root: Phaser.GameObjects.Container;
};

type Slot = { lane: Lane; x: number; taken: boolean };

type Mote = { g: Phaser.GameObjects.Arc; vx: number; vy: number };

const LANE = [
  { y: 548, cover: 62, r: 48, pts: 60, depth: 18 },
  { y: 412, cover: 50, r: 38, pts: 110, depth: 13 },
  { y: 292, cover: 38, r: 30, pts: 170, depth: 8 },
] as const;

const SLOT_X: readonly number[][] = [
  [68, 150, 236, 322],
  [86, 195, 304],
  [108, 195, 282],
];

let skipStart = false;
let nextId = 1;

function dummyRadius(tier: number, lane: Lane): number {
  return LANE[lane].r * (0.88 + tier * 0.028);
}

function pointerLift(p: Phaser.Input.Pointer): number {
  return p.wasTouch ? TOUCH_LIFT : 0;
}

function windGlyph(w: number): string {
  if (w <= -2) return '<<<';
  if (w === -1) return '<';
  if (w === 1) return '>';
  if (w >= 2) return '>>>';
  return '·';
}

export class SniperScene extends Phaser.Scene {
  private phase: Phase = 'start';
  private score = 0;
  private best = 0;
  private combo = 0;
  private left = ROUND_S;
  private wind = 0;
  private nextWind = 0;
  private nextSpawn = 0;
  private coolUntil = 0;
  private ignoreUp = false;
  private aiming = false;
  private hold = 0;
  private aimX = W * 0.5;
  private aimY = H * 0.46;
  private swayT = 0;
  private pulse = 0;
  private lastTick = 0;
  private dummies: Dummy[] = [];
  private slots: Slot[] = [];
  private motes: Mote[] = [];
  private scope!: Phaser.GameObjects.Container;
  private glass!: Phaser.GameObjects.Arc;
  private ring!: Phaser.GameObjects.Arc;
  private steady!: Phaser.GameObjects.Arc;
  private hair!: Phaser.GameObjects.Graphics;
  private windMark!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super('sniper');
  }

  create(): void {
    this.phase = 'start';
    this.score = 0;
    this.best = loadSniperBest();
    this.combo = 0;
    this.left = ROUND_S;
    this.wind = Phaser.Math.Between(-1, 1);
    this.nextWind = 0;
    this.nextSpawn = 0;
    this.coolUntil = 0;
    this.ignoreUp = false;
    this.aiming = false;
    this.hold = 0;
    this.aimX = W * 0.5;
    this.aimY = H * 0.46;
    this.swayT = 0;
    this.pulse = 0;
    this.lastTick = 0;
    this.dummies = [];
    this.motes = [];
    this.slots = [];
    for (let lane = 0; lane < 3; lane++) {
      for (const x of SLOT_X[lane]) this.slots.push({ lane: lane as Lane, x, taken: false });
    }

    this.paintRange();
    this.buildScope();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockSniperSfx();
      if (this.phase !== 'play') return;
      this.ignoreUp = false;
      this.aiming = true;
      this.hold = 0;
      this.track(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.phase === 'play' && this.aiming) this.track(p);
    });
    this.input.on('pointerup', () => {
      if (this.phase !== 'play') return;
      if (this.ignoreUp) {
        this.ignoreUp = false;
        this.aiming = false;
        this.hold = 0;
        return;
      }
      if (this.aiming) this.fire();
      this.aiming = false;
      this.hold = 0;
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
    this.swayT += s;
    this.tickMotes(s);

    if (this.phase === 'play') {
      this.left = Math.max(0, this.left - s);
      if (this.aiming) this.hold += s;
      if (this.time.now >= this.nextWind) this.rollWind();
      if (this.time.now >= this.nextSpawn) this.trySpawn();
      if (this.left <= 10 && this.left > 0) {
        const sec = Math.ceil(this.left);
        if (sec !== this.lastTick) {
          this.lastTick = sec;
          sfxTick();
        }
      }
      this.syncHud();
      if (this.left <= 0) this.gameOver();
    }

    this.placeScope();
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    unlockSniperSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'play';
    this.score = 0;
    this.combo = 0;
    this.left = ROUND_S;
    this.ignoreUp = true;
    this.aiming = false;
    this.nextWind = this.time.now + 1600;
    this.nextSpawn = this.time.now + 280;
    this.syncHud();
    this.trySpawn();
    this.trySpawn();
    this.trySpawn();
    this.tweens.add({
      targets: this.hint,
      alpha: 0,
      delay: 2800,
      duration: 420,
    });
  }

  private track(p: Phaser.Input.Pointer): void {
    const lift = pointerLift(p);
    this.aimX = Phaser.Math.Clamp(p.worldX, 28, W - 28);
    this.aimY = Phaser.Math.Clamp(p.worldY - lift, 120, 640);
  }

  private swayAmp(): number {
    const grow = 5 + Math.min(8, (ROUND_S - this.left) * 0.16);
    const calm = 1 - Math.min(0.78, this.hold / STEADY_S);
    return grow * (this.aiming ? calm : 0.55);
  }

  private sway(): { x: number; y: number } {
    const a = this.swayAmp();
    const t = this.swayT;
    return {
      x: Math.sin(t * 2.15) * a + Math.sin(t * 3.4) * a * 0.32,
      y: Math.cos(t * 1.72) * a * 0.82 + Math.sin(t * 2.7) * a * 0.18,
    };
  }

  private reticle(): { x: number; y: number } {
    const s = this.sway();
    return {
      x: this.aimX + s.x + this.wind * WIND_PX,
      y: this.aimY + s.y,
    };
  }

  private fire(): void {
    if (this.phase !== 'play' || this.left <= 0) return;
    if (this.time.now < this.coolUntil) {
      sfxDry();
      return;
    }
    this.coolUntil = this.time.now + COOLDOWN;
    this.track(this.input.activePointer);
    const ret = this.reticle();
    const impactX = Phaser.Math.Clamp(ret.x, 12, W - 12);
    const impactY = Phaser.Math.Clamp(ret.y, 110, 680);
    sfxFire();
    this.cameras.main.shake(70, 0.006);
    this.scopeKick();
    this.drawTracer(ret.x, ret.y, impactX, impactY);
    pulseRing(this, impactX, impactY, 0xe8ff47, 5, 1.6);

    const hit = this.pickHit(impactX, impactY);
    if (hit) this.landHit(hit, impactX, impactY);
    else this.landMiss(impactX, impactY);
  }

  private pickHit(x: number, y: number): Dummy | null {
    let best: Dummy | null = null;
    let bestD = Infinity;
    for (const d of this.dummies) {
      if (!d.live) continue;
      const tx = d.root.x;
      const ty = d.root.y;
      const dist = Math.hypot(x - tx, y - ty);
      if (dist <= d.r + HIT_PAD && dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    return best;
  }

  private landHit(d: Dummy, x: number, y: number): void {
    d.live = false;
    const slot = this.slots[d.slot];
    if (slot) slot.taken = false;
    const dist = Math.hypot(x - d.root.x, y - d.root.y);
    const bull = dist <= d.r * 0.32;
    this.combo += 1;
    const lanePts = LANE[d.lane].pts;
    const tierPts = d.tier * 12;
    const streak = 1 + Math.min(this.combo - 1, 4) * 0.18;
    const pts = Math.round((lanePts + tierPts) * (bull ? 1.6 : 1) * streak);
    this.score += pts;
    this.syncHud();

    const col = creature(d.tier).color;
    burstDots(this, d.x, d.y, col, bull ? 12 : 8);
    burstDots(this, d.x, d.y, 0xe8ff47, 5);
    squashTo(this, d.root, 1.28, 0.62, 140);
    floatLabel(this, d.x, d.y - d.r - 6, `+${pts}`, {
      color: bull ? '#E8FF47' : '#F4F1EA',
      size: bull ? '20px' : '16px',
      lift: 46,
    });
    if (bull) {
      floatLabel(this, d.x, d.y + 10, 'CENTRO', { color: '#6EE7FF', size: '12px', lift: 28 });
      sfxBull();
      screenWash(this, 0xe8ff47, 0.14, 160);
    } else {
      sfxHit(this.combo);
    }
    if (this.combo >= 3) {
      floatLabel(this, d.x + 28, d.y - 8, `x${this.combo}`, { color: '#FF8BD1', size: '14px', lift: 34 });
    }
    this.tweens.add({
      targets: d.root,
      y: d.y - 36,
      alpha: 0,
      scale: 1.18,
      duration: 220,
      ease: 'Back.in',
      onComplete: () => {
        d.root.destroy(true);
        this.dummies = this.dummies.filter((n) => n !== d);
      },
    });
  }

  private landMiss(x: number, y: number): void {
    this.combo = 0;
    sfxMiss();
    const dust = this.add.circle(x, y, 4, 0xf4f1ea, 0.45).setDepth(20);
    this.tweens.add({
      targets: dust,
      scale: 2.4,
      alpha: 0,
      duration: 280,
      onComplete: () => dust.destroy(),
    });
    burstDots(this, x, y, 0xf4f1ea, 4);
  }

  private trySpawn(): void {
    const elapsed = ROUND_S - this.left;
    const cap = Math.min(4, 3 + Math.floor(elapsed / 20));
    const gap = Math.max(380, 780 - elapsed * 11);
    this.nextSpawn = this.time.now + gap;
    if (this.left <= 0) return;
    const live = this.dummies.filter((d) => d.live).length;
    if (live >= cap) return;
    const free = this.slots.map((s, i) => ({ s, i })).filter((n) => !n.s.taken);
    if (!free.length) return;
    const pick = Phaser.Utils.Array.GetRandom(free);
    pick.s.taken = true;
    this.spawnDummy(pick.s, pick.i);
    if (live + 1 < cap && Math.random() < 0.45) {
      const extra = this.slots.map((s, i) => ({ s, i })).filter((n) => !n.s.taken);
      if (extra.length) {
        const e = Phaser.Utils.Array.GetRandom(extra);
        e.s.taken = true;
        this.spawnDummy(e.s, e.i);
      }
    }
  }

  private spawnDummy(slot: Slot, slotI: number): void {
    const lane = slot.lane;
    const spec = LANE[lane];
    const maxTier = Math.min(11, 2 + Math.floor((ROUND_S - this.left) / 8));
    const tier = Phaser.Math.Between(1, maxTier);
    const r = dummyRadius(tier, lane);
    const standY = spec.y - spec.cover * 0.55 - r * 0.15;
    const hideY = spec.y + 8;
    const root = this.add.container(slot.x, hideY).setDepth(spec.depth);
    const halo = this.add.circle(0, 0, r * 1.35, creature(tier).color, 0.28);
    const stick = this.add.rectangle(0, r * 0.72, Math.max(5, r * 0.18), r * 0.78, 0x2a2d38, 1);
    stick.setStrokeStyle(1, 0xf4f1ea, 0.28);
    const body = drawCreature(this, 0, 0, tier, r);
    body.setDepth(0);
    root.add([halo, stick, body]);
    root.setAlpha(0.2);
    const dummy: Dummy = {
      id: nextId++,
      lane,
      slot: slotI,
      tier,
      x: slot.x,
      y: standY,
      r,
      live: true,
      root,
    };
    this.dummies.push(dummy);
    sfxPopUp();
    this.tweens.add({
      targets: root,
      y: standY,
      alpha: 1,
      duration: 220,
      ease: 'Back.out',
    });
    const stay = Phaser.Math.Between(2000, 3400) - Math.min(800, (ROUND_S - this.left) * 16);
    this.time.delayedCall(Math.max(1200, stay), () => this.duck(dummy));
  }

  private duck(d: Dummy): void {
    if (!d.live) return;
    d.live = false;
    const slot = this.slots[d.slot];
    if (slot) slot.taken = false;
    this.tweens.add({
      targets: d.root,
      y: LANE[d.lane].y + 10,
      alpha: 0,
      duration: 180,
      ease: 'Quad.in',
      onComplete: () => {
        d.root.destroy(true);
        this.dummies = this.dummies.filter((n) => n !== d);
      },
    });
  }

  private rollWind(): void {
    const opts = [-2, -1, 0, 1, 2].filter((n) => n !== this.wind);
    this.wind = Phaser.Utils.Array.GetRandom(opts);
    this.nextWind = this.time.now + Phaser.Math.Between(3200, 5200);
    this.windMark.setText(`VIENTO  ${windGlyph(this.wind)}`);
    this.tweens.add({
      targets: this.windMark,
      scale: 1.12,
      duration: 80,
      yoyo: true,
    });
    this.syncHud();
  }

  private scopeKick(): void {
    this.tweens.killTweensOf(this.scope);
    this.scope.setScale(1.04);
    this.tweens.add({
      targets: this.scope,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: 'Sine.out',
    });
    this.aimY = Math.max(120, this.aimY - 10);
  }

  private drawTracer(x0: number, y0: number, x1: number, y1: number): void {
    const g = this.add.graphics().setDepth(26);
    g.lineStyle(2, 0xe8ff47, 0.85);
    g.lineBetween(x0, y0 + 8, x1, y1);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 140,
      onComplete: () => g.destroy(),
    });
    const flash = this.add.circle(x0, y0, 7, 0xf4f1ea, 0.7).setDepth(27);
    this.tweens.add({
      targets: flash,
      scale: 0.2,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy(),
    });
  }

  private placeScope(): void {
    const ret = this.reticle();
    this.scope.setPosition(ret.x, ret.y);
    const ready = Math.min(1, this.hold / STEADY_S);
    this.steady.setScale(1.18 - ready * 0.28);
    this.steady.setAlpha(this.aiming ? 0.2 + ready * 0.55 : 0.12);
    this.steady.setStrokeStyle(2, ready > 0.72 ? 0xe8ff47 : 0x8b9bff, 0.9);
    this.glass.setFillStyle(ready > 0.72 ? 0xe8ff47 : 0x6ee7ff, 0.06 + ready * 0.04);
    this.ring.setStrokeStyle(2, ready > 0.72 ? 0xe8ff47 : 0xf4f1ea, 0.85);
    this.scope.setAlpha(this.phase === 'over' ? 0.35 : 1);
  }

  private buildScope(): void {
    this.scope = this.add.container(this.aimX, this.aimY).setDepth(30);
    this.glass = this.add.circle(0, 0, 46, 0x6ee7ff, 0.07);
    this.ring = this.add.circle(0, 0, 48, 0x000000, 0).setStrokeStyle(2, 0xf4f1ea, 0.85);
    const outer = this.add.circle(0, 0, 58, 0x000000, 0).setStrokeStyle(3, 0x8b9bff, 0.35);
    this.steady = this.add.circle(0, 0, 34, 0x000000, 0).setStrokeStyle(2, 0x8b9bff, 0.7);
    this.hair = this.add.graphics();
    this.hair.lineStyle(1.4, 0xe8ff47, 0.92);
    this.hair.lineBetween(0, -40, 0, -10);
    this.hair.lineBetween(0, 10, 0, 40);
    this.hair.lineBetween(-40, 0, -10, 0);
    this.hair.lineBetween(10, 0, 40, 0);
    this.hair.fillStyle(0xe8ff47, 0.95);
    this.hair.fillCircle(0, 0, 2.2);
    this.hair.lineStyle(1, 0xf4f1ea, 0.35);
    this.hair.strokeCircle(0, 0, 22);
    this.scope.add([this.glass, outer, this.ring, this.steady, this.hair]);
  }

  private paintRange(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x101018, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xe8ff47, 0.08);
    g.fillEllipse(W * 0.5, 88, 300, 80);
    g.fillStyle(0x8b9bff, 0.1);
    g.fillCircle(36, 210, 110);
    g.fillStyle(0x6ee7ff, 0.08);
    g.fillCircle(W - 16, 268, 130);
    g.fillStyle(0xff8bd1, 0.07);
    g.fillCircle(W * 0.5, 760, 180);

    g.fillStyle(0x1c2030, 1);
    g.fillRect(0, 118, W, 200);
    g.fillStyle(0x2a3044, 1);
    g.fillRoundedRect(28, 138, W - 56, 168, 18);
    g.fillStyle(0x353c54, 1);
    g.fillRoundedRect(48, 156, W - 96, 128, 14);
    g.lineStyle(2, 0xe8ff47, 0.28);
    g.strokeRoundedRect(48, 156, W - 96, 128, 14);

    this.add
      .text(W / 2, 186, 'POLÍGONO A-11', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        color: '#E8FF47',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0.82)
      .setDepth(1);
    this.add
      .text(W / 2, 210, 'OPERATIVO DE JUGUETE', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        color: '#F4F1EA',
      })
      .setOrigin(0.5)
      .setAlpha(0.38)
      .setDepth(1);

    const rings = this.add.graphics().setDepth(1);
    rings.lineStyle(2, 0xf4f1ea, 0.12);
    rings.strokeCircle(W / 2, 232, 22);
    rings.strokeCircle(W / 2, 232, 12);
    rings.lineStyle(1, 0xe8ff47, 0.35);
    rings.lineBetween(W / 2 - 8, 232, W / 2 + 8, 232);
    rings.lineBetween(W / 2, 224, W / 2, 240);

    g.fillStyle(0x161a26, 1);
    g.fillRect(0, 330, W, H - 330);
    g.fillStyle(0x8b9bff, 0.05);
    g.fillTriangle(W / 2, 330, -20, H, W + 20, H);

    const floor = this.add.graphics().setDepth(1);
    floor.lineStyle(1, 0x6ee7ff, 0.1);
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const y = 340 + t * 420;
      const inset = 70 - t * 62;
      floor.lineBetween(inset, y, W - inset, y);
    }
    floor.lineBetween(70, 340, 8, 760);
    floor.lineBetween(W - 70, 340, W - 8, 760);

    this.drawBench(2, 0x1c2130);
    this.drawBench(1, 0x222838);
    this.drawBench(0, 0x2a3144);

    const lamps = [
      [70, 96],
      [195, 78],
      [320, 96],
    ] as const;
    for (const [x, y] of lamps) {
      const glow = this.add.ellipse(x, y + 18, 70, 24, 0xe8ff47, 0.08).setDepth(2);
      this.tweens.add({
        targets: glow,
        alpha: 0.14,
        duration: 1400 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
      });
      const cap = this.add.graphics().setDepth(3);
      cap.fillStyle(0x2a2d38, 1);
      cap.fillRoundedRect(x - 14, y - 8, 28, 12, 4);
      cap.fillStyle(0xe8ff47, 0.55);
      cap.fillRoundedRect(x - 10, y + 2, 20, 5, 2);
    }

    const vials = [0x7cffb2, 0x8b9bff, 0xff8bd1, 0xe8ff47, 0x6ee7ff];
    for (let i = 0; i < 5; i++) {
      const x = 22;
      const y = 360 + i * 72;
      const cab = this.add.rectangle(x, y, 18, 46, 0x171a24, 0.95).setDepth(4);
      cab.setStrokeStyle(1, vials[i], 0.4);
      this.add.circle(x, y, 5, vials[i], 0.45).setDepth(4);
    }
    for (let i = 0; i < 5; i++) {
      const x = W - 22;
      const y = 380 + i * 70;
      const cab = this.add.rectangle(x, y, 18, 46, 0x171a24, 0.95).setDepth(4);
      cab.setStrokeStyle(1, vials[i], 0.35);
      this.add.circle(x, y, 5, vials[4 - i], 0.4).setDepth(4);
    }

    for (let i = 0; i < 14; i++) {
      const mote = this.add.circle(
        Math.random() * W,
        200 + Math.random() * 500,
        1.2 + Math.random() * 1.6,
        i % 2 === 0 ? 0xe8ff47 : 0x8b9bff,
        0.18 + Math.random() * 0.22,
      );
      mote.setDepth(5);
      this.motes.push({
        g: mote,
        vx: -8 + Math.random() * 16,
        vy: -6 + Math.random() * 10,
      });
    }

    this.windMark = this.add
      .text(W / 2, 118, `VIENTO  ${windGlyph(this.wind)}`, {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#8B9BFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.hint = this.add
      .text(W / 2, 786, 'MANTÉN · SUELTA', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        color: '#E8FF47',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);
  }

  private drawBench(lane: Lane, color: number): void {
    const spec = LANE[lane];
    const b = this.add.graphics().setDepth(spec.depth - 1);
    const y = spec.y;
    const h = spec.cover;
    const inset = 22 + (2 - lane) * 18;
    b.fillStyle(color, 0.98);
    b.fillRoundedRect(inset, y - h * 0.15, W - inset * 2, h, 12);
    b.fillStyle(0xffffff, 0.1);
    b.fillRoundedRect(inset + 8, y - h * 0.1, W - inset * 2 - 16, 10, 4);
    b.fillStyle(0xe8ff47, 0.12);
    b.fillRoundedRect(inset + 10, y - h * 0.12, W - inset * 2 - 20, 5, 3);
    b.lineStyle(2, 0x8b9bff, 0.28);
    b.strokeRoundedRect(inset, y - h * 0.15, W - inset * 2, h, 12);
    const tags = ['12 m', '24 m', '36 m'] as const;
    this.add
      .text(inset + 16, y + h * 0.28, tags[lane], {
        fontFamily: UI_FONT,
        fontSize: lane === 0 ? '11px' : '10px',
        color: '#6EE7FF',
        fontStyle: 'bold',
      })
      .setAlpha(0.55)
      .setDepth(spec.depth - 1);
  }

  private tickMotes(s: number): void {
    const drift = this.wind * 10 * s;
    for (const m of this.motes) {
      m.g.x += m.vx * s + drift;
      m.g.y += m.vy * s + Math.sin((m.g.x + this.pulse * 30) * 0.05) * 0.2;
      if (m.g.x < -8) m.g.x = W + 8;
      if (m.g.x > W + 8) m.g.x = -8;
      if (m.g.y < 140) m.g.y = 720;
      if (m.g.y > 760) m.g.y = 180;
    }
  }

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    const prevBest = this.best;
    saveSniperBest(this.score);
    this.best = loadSniperBest();
    this.syncHud();
    this.aiming = false;
    this.cameras.main.shake(160, 0.01);
    screenWash(this, 0x8b9bff, 0.16, 240);
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
    const chip = document.getElementById('time-chip');
    if (chip) {
      chip.textContent = String(Math.max(0, Math.ceil(this.left)));
      chip.classList.toggle('hud-hot', this.phase === 'play' && this.left <= 10);
    }
    const wind = document.getElementById('wind-code');
    if (wind) wind.textContent = windGlyph(this.wind);
  }
}
