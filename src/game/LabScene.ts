import Phaser from 'phaser';
import { creature, halfWidthPx, radiusPx, rollDropTier } from './canon';
import { DANGER_Y, DROP_Y, FLOOR_Y, H, INNER_L, INNER_R, W, WALL } from './layout';
import { burstDots, floatLabel, screenWash, squashTo } from './juice';
import { loadBest, mergePoints, popPoints, resetScore, saveScore } from './score';
import { sfxDrop, sfxMerge, sfxOver, sfxPop, unlockSfx } from './sfx';
import { drawCreature, paintArena } from './sprites';
import { addVeggieBody } from './veggieBody';

export { H, W };

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
  lastSquash: number;
};

type Contact = { a: number; b: number; t: number };

type Preview = { tier: number; root: Phaser.GameObjects.Container; x: number };

let skipStart = false;
let nextPieceId = 1;

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function aabbTouch(a: Piece, b: Piece, pad: number): boolean {
  const A = a.body.bounds;
  const B = b.body.bounds;
  return A.min.x <= B.max.x + pad && A.max.x >= B.min.x - pad && A.min.y <= B.max.y + pad && A.max.y >= B.min.y - pad;
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
  private byBody = new WeakMap<MatterJS.BodyType, Piece>();
  private floorBody: MatterJS.BodyType | null = null;
  private guide!: Phaser.GameObjects.Graphics;
  private danger!: Phaser.GameObjects.Graphics;
  private hintShown = false;
  private frozenUntil = 0;

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
    this.byBody = new WeakMap();
    this.frozenUntil = 0;
    this.nextTier = rollDropTier();
    this.paintStatic();
    this.matter.world.setGravity(0, 1.55);

    this.matter.world.on('collisionstart', (event: { pairs: Array<{ bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }> }) => {
      this.onCollide(event);
    });

    this.input.on('pointerdown', () => {
      unlockSfx();
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
      const hw = halfWidthPx(this.preview.tier);
      const x = Phaser.Math.Clamp(this.input.activePointer.x, INNER_L + hw, INNER_R - hw);
      this.preview.x = x;
      this.preview.root.setPosition(x, DROP_Y);
      this.drawGuide(x, hw);
    } else {
      this.guide.clear();
    }

    for (const p of this.pieces) {
      p.root.setPosition(p.body.position.x, p.body.position.y);
      p.root.setRotation(p.body.angle);
    }

    if (this.phase !== 'play') return;
    if (this.time.now < this.frozenUntil) return;
    const now = this.time.now;
    this.tickMerges(now);
    this.tickDanger(now);
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    unlockSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'play';
    this.score = 0;
    resetScore();
    saveScore(0);
    this.syncHud();
    this.startAt = this.time.now;
    this.makePreview();
    this.showDropHint();
    this.time.delayedCall(220, () => {
      if (this.phase === 'play') this.canDrop = true;
    });
  }

  private paintStatic(): void {
    paintArena(this);

    this.guide = this.add.graphics().setDepth(2);
    this.danger = this.add.graphics().setDepth(3);
    this.drawDanger(0.55);

    this.floorBody = this.matter.add.rectangle(W / 2, FLOOR_Y + WALL / 2, W, WALL, {
      isStatic: true,
      friction: 0.85,
    });
    this.matter.add.rectangle(INNER_L - WALL / 2, H / 2, WALL, H, { isStatic: true });
    this.matter.add.rectangle(INNER_R + WALL / 2, H / 2, WALL, H, { isStatic: true });
  }

  private drawDanger(alpha: number): void {
    this.danger.clear();
    const w = INNER_R - INNER_L;
    this.danger.fillStyle(0xff3b4a, 0.07 * alpha);
    this.danger.fillRect(INNER_L, DANGER_Y - 10, w, 20);
    this.danger.lineStyle(2, 0xff3b4a, alpha);
    for (let x = INNER_L; x < INNER_R; x += 11) {
      this.danger.beginPath();
      this.danger.moveTo(x, DANGER_Y);
      this.danger.lineTo(Math.min(x + 7, INNER_R), DANGER_Y);
      this.danger.strokePath();
    }
    this.danger.lineStyle(1, 0xff8a94, alpha * 0.45);
    this.danger.beginPath();
    this.danger.moveTo(INNER_L, DANGER_Y);
    this.danger.lineTo(INNER_R, DANGER_Y);
    this.danger.strokePath();
  }

  private drawGuide(x: number, _r: number): void {
    this.guide.clear();
    this.guide.lineStyle(1.5, 0xe8ff47, 0.2);
    const top = DROP_Y + 14;
    for (let y = top; y < FLOOR_Y - 6; y += 10) {
      this.guide.beginPath();
      this.guide.moveTo(x, y);
      this.guide.lineTo(x, Math.min(y + 5, FLOOR_Y - 6));
      this.guide.strokePath();
    }
    this.guide.fillStyle(0xe8ff47, 0.35);
    this.guide.fillCircle(x, FLOOR_Y - 4, 3);
  }

  private makePreview(): void {
    this.destroyPreview();
    const tier = this.nextTier;
    this.nextTier = rollDropTier();
    const root = drawCreature(this, 0, 0, tier);
    root.setAlpha(0.92);
    root.setScale(0.74);
    const hw = halfWidthPx(tier);
    const x = Phaser.Math.Clamp(this.input.activePointer.x || W / 2, INNER_L + hw, INNER_R - hw);
    root.setPosition(x, DROP_Y);
    this.tweens.add({
      targets: root,
      scaleX: 0.82,
      scaleY: 0.7,
      yoyo: true,
      repeat: -1,
      duration: 640,
      ease: 'Sine.inOut',
    });
    this.preview = { tier, root, x };
    this.syncHud();
  }

  private destroyPreview(): void {
    if (this.preview) this.tweens.killTweensOf(this.preview.root);
    this.preview?.root.destroy(true);
    this.preview = null;
  }

  private drop(): void {
    if (this.phase !== 'play' || !this.canDrop || !this.preview) return;
    if (this.time.now - this.startAt < 200) return;
    const { tier, x, root } = this.preview;
    this.tweens.killTweensOf(root);
    root.setScale(1.14, 0.7);
    this.preview = { tier, root, x };
    this.time.delayedCall(42, () => {
      if (this.phase !== 'play' || !this.preview) return;
      const dropX = this.preview.x;
      const dropTier = this.preview.tier;
      this.destroyPreview();
      this.spawn(dropTier, dropX, DROP_Y, false);
      sfxDrop();
      this.hideDropHint();
    });
    this.canDrop = false;
    this.time.delayedCall(DROP_CD, () => {
      if (this.phase !== 'play') return;
      this.makePreview();
      this.canDrop = true;
    });
  }

  private spawn(tier: number, x: number, y: number, popIn: boolean): Piece {
    const radius = radiusPx(tier);
    const body = addVeggieBody(this, x, y, tier, radius, {
      restitution: 0.14,
      friction: 0.44,
      frictionAir: 0.012,
      label: `a${tier}`,
      sleepThreshold: 24,
    });
    const root = drawCreature(this, x, y, tier);
    if (popIn) {
      root.setScale(0.38);
      this.tweens.add({
        targets: root,
        scaleX: 1,
        scaleY: 1,
        duration: 240,
        ease: 'Back.out',
      });
    } else {
      squashTo(this, root, 1.16, 0.76, 180);
    }
    const piece: Piece = {
      id: nextPieceId++,
      tier,
      radius,
      body,
      root,
      overSince: null,
      cleared: false,
      locked: false,
      lastSquash: 0,
    };
    this.pieces.push(piece);
    this.byBody.set(body, piece);
    return piece;
  }

  private onCollide(event: { pairs: Array<{ bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }> }): void {
    if (this.phase !== 'play') return;
    const now = this.time.now;
    for (const pair of event.pairs) {
      const pa = this.byBody.get(pair.bodyA);
      const pb = this.byBody.get(pair.bodyB);
      if (pa && pb) {
        this.squash(pa, 1.16, 0.82, now);
        this.squash(pb, 1.16, 0.82, now);
      } else if (pa && pair.bodyB === this.floorBody) {
        this.squash(pa, 1.12, 0.84, now);
      } else if (pb && pair.bodyA === this.floorBody) {
        this.squash(pb, 1.12, 0.84, now);
      }
    }
  }

  private squash(p: Piece, sx: number, sy: number, now: number): void {
    if (p.locked || now - p.lastSquash < 90) return;
    p.lastSquash = now;
    squashTo(this, p.root, sx, sy, 150);
  }

  private tickMerges(now: number): void {
    const seen = new Set<string>();
    const ready: Array<[Piece, Piece]> = [];
    const claimed = new Set<number>();
    const list = this.pieces;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a || a.locked || !a.body?.position) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b || b.locked || a.tier !== b.tier || !b.body?.position) continue;
        if (!aabbTouch(a, b, 2.5)) continue;
        const key = pairKey(a.id, b.id);
        seen.add(key);
        const hit = this.contacts.get(key);
        if (!hit) this.contacts.set(key, { a: a.id, b: b.id, t: now });
        else if (now - hit.t >= MERGE_MS && !claimed.has(a.id) && !claimed.has(b.id)) {
          claimed.add(a.id);
          claimed.add(b.id);
          ready.push([a, b]);
        }
      }
    }
    for (const key of [...this.contacts.keys()]) {
      if (!seen.has(key)) this.contacts.delete(key);
    }
    for (const [a, b] of ready) this.merge(a, b);
  }

  private merge(a: Piece, b: Piece): void {
    if (a.locked || b.locked || a.tier !== b.tier) return;
    a.locked = true;
    b.locked = true;
    const mx = (a.body.position.x + b.body.position.x) / 2;
    const my = (a.body.position.y + b.body.position.y) / 2;
    const combo = this.lastMerge > 0 && this.time.now - this.lastMerge < COMBO_MS;
    this.lastMerge = this.time.now;
    const tint = creature(a.tier).color;
    this.kill(a);
    this.kill(b);

    if (a.tier >= 11) {
      const pts = popPoints(combo);
      this.addScore(pts, mx, my, combo, true);
      burstDots(this, mx, my, 0xf4f1ea, 12);
      this.cameras.main.shake(90, 0.006);
      sfxPop();
      this.hitStop(72);
      return;
    }

    const pts = mergePoints(a.tier + 1, combo);
    this.addScore(pts, mx, my, combo, false);
    burstDots(this, mx, my, tint, combo ? 11 : 8);
    this.cameras.main.shake(combo ? 70 : 46, combo ? 0.0045 : 0.003);
    sfxMerge(combo);
    const born = this.spawn(a.tier + 1, mx, my, true);
    this.matter.body.setVelocity(born.body, { x: 0, y: -1.4 });
    this.hitStop(combo ? 46 : 28);
  }

  private hitStop(ms: number): void {
    this.frozenUntil = this.time.now + ms;
    this.matter.world.pause();
    this.time.delayedCall(ms, () => {
      if (this.phase === 'play') this.matter.world.resume();
    });
  }

  private kill(p: Piece): void {
    this.contacts.forEach((c, key) => {
      if (c.a === p.id || c.b === p.id) this.contacts.delete(key);
    });
    this.tweens.killTweensOf(p.root);
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
    floatLabel(this, x, y, label, {
      color: pop ? '#F4F1EA' : '#E8FF47',
      size: pop ? '20px' : combo ? '18px' : '16px',
    });
  }

  private tickDanger(now: number): void {
    let hot = false;
    for (const p of this.pieces) {
      if (p.locked) continue;
      const top = p.body.bounds.min.y;
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
        hot = true;
      } else {
        p.overSince = null;
      }
    }
    const pulse = hot ? 0.55 + Math.sin(now / 90) * 0.4 : 0.5;
    this.drawDanger(pulse);
  }

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    this.canDrop = false;
    this.destroyPreview();
    this.guide.clear();
    this.drawDanger(0.95);
    this.matter.world.pause();
    const prevBest = this.best;
    saveScore(this.score);
    this.best = loadBest();
    this.syncHud();
    screenWash(this, 0xff3b4a, 0.16, 280);
    el('over-score').textContent = `Puntos ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
    el('overlay-over').hidden = false;
    sfxOver();
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const next = creature(this.nextTier);
    const chip = el<HTMLElement>('next-chip');
    chip.style.background = next.hex;
    chip.textContent = next.emoji;
    chip.dataset.kind = next.kind;
    chip.title = `${next.code} ${next.name}`;
    el('next-code').textContent = next.code;
  }

  private showDropHint(): void {
    if (this.hintShown) return;
    const hint = document.getElementById('drop-hint');
    if (!hint) return;
    hint.hidden = false;
    this.hintShown = true;
  }

  private hideDropHint(): void {
    const hint = document.getElementById('drop-hint');
    if (hint) hint.hidden = true;
  }
}
