import Phaser from 'phaser';
import { creature, radiusPx, rollDropTier } from './canon';
import { loadBest, mergePoints, popPoints, resetScore, saveScore } from './score';

export const W = 390;
export const H = 844;

const WALL = 16;
const INNER_L = 26;
const INNER_R = W - 26;
const FLOOR_Y = 812;
const DROP_Y = 122;
const DANGER_Y = 172;
const MERGE_MS = 200;
const DANGER_MS = 1500;
const COMBO_MS = 1000;
const DROP_CD = 360;

type Phase = 'start' | 'play' | 'over';

type Piece = {
  id: number;
  tier: number;
  radius: number;
  body: MatterJS.BodyType;
  root: Phaser.GameObjects.Container;
  overSince: number | null;
  cleared: boolean;
  locked: boolean;
};

type Contact = { a: number; b: number; t: number };

type Preview = { tier: number; root: Phaser.GameObjects.Container; x: number };

let skipStart = false;
let nextPieceId = 1;

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id}`);
  return node as T;
}

export class LabScene extends Phaser.Scene {
  private phase: Phase = 'start';
  private score = 0;
  private best = 0;
  private lastMerge = 0;
  private canDrop = false;
  private nextTier = 1;
  private preview: Preview | null = null;
  private pieces: Piece[] = [];
  private contacts = new Map<string, Contact>();
  private startAt = 0;

  constructor() {
    super('lab');
  }

  create(): void {
    this.phase = 'start';
    this.score = 0;
    this.best = loadBest();
    this.lastMerge = 0;
    this.canDrop = false;
    this.preview = null;
    this.pieces = [];
    this.contacts.clear();
    this.nextTier = rollDropTier();
    this.paintStatic();
    this.matter.world.setGravity(0, 1.55);

    this.input.on('pointerdown', () => {
      if (this.phase === 'play') this.drop();
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

  update(): void {
    if (this.preview) {
      const r = radiusPx(this.preview.tier);
      const x = Phaser.Math.Clamp(this.input.activePointer.x, INNER_L + r, INNER_R - r);
      this.preview.x = x;
      this.preview.root.setPosition(x, DROP_Y);
    }

    for (const p of this.pieces) {
      p.root.setPosition(p.body.position.x, p.body.position.y);
      p.root.setRotation(p.body.angle);
    }

    if (this.phase !== 'play') return;
    const now = this.time.now;
    this.tickMerges(now);
    this.tickDanger(now);
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'play';
    this.score = 0;
    resetScore();
    saveScore(0);
    this.syncHud();
    this.startAt = this.time.now;
    this.makePreview();
    this.time.delayedCall(220, () => {
      if (this.phase === 'play') this.canDrop = true;
    });
  }

  private paintStatic(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0b0b0c, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xf4f1ea, 0.08);
    g.fillRect(INNER_L - WALL, 96, WALL, FLOOR_Y - 96 + WALL);
    g.fillRect(INNER_R, 96, WALL, FLOOR_Y - 96 + WALL);
    g.fillRect(INNER_L - WALL, FLOOR_Y, INNER_R - INNER_L + WALL * 2, WALL);
    g.lineStyle(1, 0xe8ff47, 0.5);
    for (let x = INNER_L; x < INNER_R; x += 10) {
      g.beginPath();
      g.moveTo(x, DANGER_Y);
      g.lineTo(Math.min(x + 6, INNER_R), DANGER_Y);
      g.strokePath();
    }

    this.matter.add.rectangle(W / 2, FLOOR_Y + WALL / 2, W, WALL, {
      isStatic: true,
      friction: 0.85,
    });
    this.matter.add.rectangle(INNER_L - WALL / 2, H / 2, WALL, H, { isStatic: true });
    this.matter.add.rectangle(INNER_R + WALL / 2, H / 2, WALL, H, { isStatic: true });
  }

  private makePreview(): void {
    this.destroyPreview();
    const tier = this.nextTier;
    this.nextTier = rollDropTier();
    const root = this.drawCreature(0, 0, tier, 0.72);
    const r = radiusPx(tier);
    const x = Phaser.Math.Clamp(this.input.activePointer.x || W / 2, INNER_L + r, INNER_R - r);
    root.setPosition(x, DROP_Y);
    this.preview = { tier, root, x };
    this.syncHud();
  }

  private destroyPreview(): void {
    this.preview?.root.destroy(true);
    this.preview = null;
  }

  private drop(): void {
    if (this.phase !== 'play' || !this.canDrop || !this.preview) return;
    if (this.time.now - this.startAt < 200) return;
    const { tier, x } = this.preview;
    this.destroyPreview();
    this.spawn(tier, x, DROP_Y);
    this.canDrop = false;
    this.time.delayedCall(DROP_CD, () => {
      if (this.phase !== 'play') return;
      this.makePreview();
      this.canDrop = true;
    });
  }

  private spawn(tier: number, x: number, y: number): Piece {
    const radius = radiusPx(tier);
    const body = this.matter.add.circle(x, y, radius, {
      restitution: 0.14,
      friction: 0.44,
      frictionAir: 0.012,
      label: `a${tier}`,
    });
    const root = this.drawCreature(x, y, tier, 1);
    const piece: Piece = {
      id: nextPieceId++,
      tier,
      radius,
      body,
      root,
      overSince: null,
      cleared: false,
      locked: false,
    };
    this.pieces.push(piece);
    return piece;
  }

  private drawCreature(x: number, y: number, tier: number, alpha: number): Phaser.GameObjects.Container {
    const c = creature(tier);
    const r = radiusPx(tier);
    const root = this.add.container(x, y);
    const disc = this.add.circle(0, 0, r, c.color, alpha);
    disc.setStrokeStyle(Math.max(2, r * 0.06), 0x0b0b0c, 0.45);
    const emoji = this.add
      .text(0, -r * 0.08, c.emoji, {
        fontSize: `${Math.max(14, r * 0.92)}px`,
        align: 'center',
      })
      .setOrigin(0.5);
    const code = this.add
      .text(0, r * 0.42, c.code, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: `${Math.max(8, r * 0.3)}px`,
        color: '#0B0B0C',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    root.add([disc, emoji, code]);
    root.setDepth(10);
    return root;
  }

  private tickMerges(now: number): void {
    const seen = new Set<string>();
    const n = this.pieces.length;
    for (let i = 0; i < n; i++) {
      const a = this.pieces[i];
      if (a.locked) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.pieces[j];
        if (b.locked || a.tier !== b.tier) continue;
        const dx = a.body.position.x - b.body.position.x;
        const dy = a.body.position.y - b.body.position.y;
        const lim = a.radius + b.radius + 1.5;
        if (dx * dx + dy * dy > lim * lim) continue;
        const key = pairKey(a.id, b.id);
        seen.add(key);
        const hit = this.contacts.get(key);
        if (!hit) this.contacts.set(key, { a: a.id, b: b.id, t: now });
        else if (now - hit.t >= MERGE_MS) this.merge(a, b);
      }
    }
    for (const key of [...this.contacts.keys()]) {
      if (!seen.has(key)) this.contacts.delete(key);
    }
  }

  private merge(a: Piece, b: Piece): void {
    if (a.locked || b.locked || a.tier !== b.tier) return;
    a.locked = true;
    b.locked = true;
    const mx = (a.body.position.x + b.body.position.x) / 2;
    const my = (a.body.position.y + b.body.position.y) / 2;
    const combo = this.lastMerge > 0 && this.time.now - this.lastMerge < COMBO_MS;
    this.lastMerge = this.time.now;
    const next = a.tier + 1;
    this.kill(a);
    this.kill(b);

    if (a.tier >= 11) {
      const pts = popPoints(combo);
      this.addScore(pts, mx, my, combo, true);
      this.burst(mx, my, 0xf4f1ea);
      return;
    }

    const pts = mergePoints(next, combo);
    this.addScore(pts, mx, my, combo, false);
    const born = this.spawn(next, mx, my);
    this.matter.body.setVelocity(born.body, { x: 0, y: -1.4 });
  }

  private kill(p: Piece): void {
    this.contacts.forEach((c, key) => {
      if (c.a === p.id || c.b === p.id) this.contacts.delete(key);
    });
    this.matter.world.remove(p.body);
    p.root.destroy(true);
    this.pieces = this.pieces.filter((x) => x.id !== p.id);
  }

  private addScore(pts: number, x: number, y: number, combo: boolean, pop: boolean): void {
    this.score += pts;
    saveScore(this.score);
    this.best = loadBest();
    this.syncHud();
    const label = pop ? `+${pts} POP` : combo ? `+${pts} COMBO` : `+${pts}`;
    const t = this.add
      .text(x, y, label, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '15px',
        color: '#E8FF47',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 620,
      onComplete: () => t.destroy(),
    });
  }

  private burst(x: number, y: number, color: number): void {
    const g = this.add.graphics().setDepth(19);
    g.fillStyle(color, 0.85);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      g.fillCircle(x + Math.cos(a) * 18, y + Math.sin(a) * 18, 4);
    }
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 420,
      onComplete: () => g.destroy(),
    });
  }

  private tickDanger(now: number): void {
    for (const p of this.pieces) {
      if (p.locked) continue;
      const top = p.body.position.y - p.radius;
      if (top > DANGER_Y) {
        p.cleared = true;
        p.overSince = null;
        continue;
      }
      if (!p.cleared) continue;
      const speed = Math.hypot(p.body.velocity.x, p.body.velocity.y);
      const rest = p.body.isSleeping || speed < 0.32;
      if (rest) {
        if (p.overSince == null) p.overSince = now;
        else if (now - p.overSince >= DANGER_MS) {
          this.gameOver();
          return;
        }
      } else {
        p.overSince = null;
      }
    }
  }

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    this.canDrop = false;
    this.destroyPreview();
    this.matter.world.pause();
    saveScore(this.score);
    this.best = loadBest();
    this.syncHud();
    el('over-score').textContent = `Puntos ${this.score} · Mejor ${this.best}`;
    el('overlay-over').hidden = false;
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const next = creature(this.phase === 'play' ? this.nextTier : this.nextTier);
    el('next').textContent = `Sigue ${next.emoji} ${next.code}`;
  }
}
