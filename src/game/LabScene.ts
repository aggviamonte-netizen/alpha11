import Phaser from 'phaser';
import { creature, halfWidthPx, radiusPx, rollDropTier } from './canon';
import { DANGER_Y, DROP_Y, FLOOR_Y, H, INNER_L, INNER_R, W, WALL } from './layout';
import { burstDots, floatLabel, pulseRing, screenWash, squashTo } from './juice';
import {
  BANNER_LIFT_PX,
  BANNER_SIZE_PX,
  CLUTCH_COOLDOWN_MS,
  WHISPER_LIFT_PX,
  WHISPER_SIZE_PX,
  DANGER_HOLD_MS,
  bannerLayout,
  clutchBand,
  clampLabelX,
  labelWidth,
  clutchRank,
  clutchVoice,
  contactSquash,
  dropSquash,
  impactFreeze,
  impactShake,
  isTierCeremony,
  mergeAccentCount,
  mergeBurstCount,
  mergeImpact,
  mergeRing,
  mergeVoice,
  momentWash,
  nextCombo,
  pointsStyle,
  voiceColor,
  withinStreak,
  type ClutchBand,
  type LabVoice,
} from './labFeel';
import { loadBest, mergePoints, popPoints, resetScore, saveScore } from './score';
import { sfxDrop, sfxMerge, sfxOver, sfxPop, unlockSfx } from './sfx';
import { drawCreature, paintArena } from './sprites';
import { addVeggieBody } from './veggieBody';

export { H, W };

const MERGE_MS = 200;
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
  private combo = 0;
  private lastMerge: number | null = null;
  private seenTier = new Set<number>();
  private popSeen = false;
  private clutchUntil = 0;
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
    this.combo = 0;
    this.lastMerge = null;
    this.seenTier.clear();
    this.popSeen = false;
    this.clutchUntil = 0;
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
    this.combo = 0;
    this.lastMerge = null;
    this.seenTier.clear();
    this.popSeen = false;
    this.clutchUntil = 0;
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
      const landed = dropSquash();
      squashTo(this, root, landed.sx, landed.sy, landed.ms);
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
        const hit = contactSquash(false);
        this.squash(pa, hit.sx, hit.sy, hit.ms, now);
        this.squash(pb, hit.sx, hit.sy, hit.ms, now);
      } else if (pa && pair.bodyB === this.floorBody) {
        const hit = contactSquash(true);
        this.squash(pa, hit.sx, hit.sy, hit.ms, now);
      } else if (pb && pair.bodyA === this.floorBody) {
        const hit = contactSquash(true);
        this.squash(pb, hit.sx, hit.sy, hit.ms, now);
      }
    }
  }

  private squash(p: Piece, sx: number, sy: number, ms: number, now: number): void {
    if (p.locked || now - p.lastSquash < 90) return;
    p.lastSquash = now;
    squashTo(this, p.root, sx, sy, ms);
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
    const now = this.time.now;
    const held = Math.max(this.holdMs(a, now), this.holdMs(b, now));
    const clutch = clutchBand(held);
    const within = this.combo > 0 && withinStreak(this.lastMerge, now);
    this.combo = nextCombo(this.combo, within);
    this.lastMerge = now;
    const pop = a.tier >= 11;
    const produced = pop ? 11 : a.tier + 1;
    const tierFresh = !pop && isTierCeremony(produced) && !this.seenTier.has(produced);
    if (!pop && isTierCeremony(produced)) this.seenTier.add(produced);
    const popFresh = pop && !this.popSeen;
    if (pop) this.popSeen = true;
    if (clutch !== 'none') this.clutchUntil = now + CLUTCH_COOLDOWN_MS;
    const tint = pop ? 0xf4f1ea : creature(produced).color;
    this.kill(a);
    this.kill(b);

    const pts = pop ? popPoints(this.combo) : mergePoints(produced, this.combo);
    this.addScore(pts, mx, my, this.combo, pop);
    burstDots(this, mx, my, tint, mergeBurstCount(produced, pop, this.combo));
    const accent = mergeAccentCount(produced, pop);
    if (accent) burstDots(this, mx, my - 2, 0xf4f1ea, accent);
    const ring = mergeRing(produced, pop, this.combo);
    if (ring) pulseRing(this, mx, my, tint, ring.start, ring.scale);
    const impact = mergeImpact(produced, pop, this.combo);
    const shake = impactShake(impact);
    this.cameras.main.shake(shake.ms, shake.intensity);
    const voice = mergeVoice({
      tier: produced,
      pop,
      popFresh,
      combo: this.combo,
      tierFresh,
      clutch,
    });
    if (voice) this.speak(mx, my - 52, voice);
    else if (this.combo >= 2) {
      const tag = `x${this.combo}`;
      floatLabel(this, clampLabelX(mx, labelWidth(tag, 14)), my - 28, tag, { color: '#FF8BD1', size: '14px', lift: 34 });
    }
    const wash = momentWash({ tier: produced, pop, combo: this.combo, tierFresh, clutch });
    if (wash) screenWash(this, wash.color, wash.alpha, wash.ms);

    if (pop) {
      sfxPop();
      this.hitStop(impactFreeze(impact));
      return;
    }

    sfxMerge(this.combo >= 2);
    const born = this.spawn(produced, mx, my, true);
    this.matter.body.setVelocity(born.body, { x: 0, y: -1.4 });
    this.hitStop(impactFreeze(impact));
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

  private addScore(pts: number, x: number, y: number, combo: number, pop: boolean): void {
    this.score += pts;
    saveScore(this.score);
    this.best = loadBest();
    this.syncHud();
    const style = pointsStyle(pop, combo);
    const label = `+${pts}`;
    floatLabel(this, clampLabelX(x, labelWidth(label, parseInt(style.size, 10))), y, label, style);
  }

  private holdMs(p: Piece, now: number): number {
    if (p.overSince == null) return 0;
    return now - p.overSince;
  }

  private speak(x: number, y: number, voice: LabVoice): void {
    const at = bannerLayout(x, y, voice);
    floatLabel(this, at.x, at.bannerY, voice.banner, {
      size: `${BANNER_SIZE_PX}px`,
      color: voiceColor(voice.banner),
      lift: BANNER_LIFT_PX,
      duration: 900,
    });
    floatLabel(this, at.x, at.whisperY, voice.whisper, {
      size: `${WHISPER_SIZE_PX}px`,
      color: '#6EE7FF',
      lift: WHISPER_LIFT_PX,
      duration: 860,
    });
  }

  private voiceClutch(x: number, y: number, band: ClutchBand, now: number): void {
    if (now < this.clutchUntil) return;
    const voice = clutchVoice(band);
    if (!voice) return;
    this.clutchUntil = now + CLUTCH_COOLDOWN_MS;
    if (band === 'filo') {
      pulseRing(this, x, y, 0xff3b4a, 10, 2.2);
      const wash = momentWash({ tier: 1, pop: false, combo: this.combo, tierFresh: false, clutch: 'filo' });
      if (wash) screenWash(this, wash.color, wash.alpha, wash.ms);
    }
    this.speak(x, y - 20, voice);
  }

  private tickDanger(now: number): void {
    let hot = false;
    let saved: { band: ClutchBand; x: number; y: number } | null = null;
    for (const p of this.pieces) {
      if (p.locked) continue;
      const top = p.body.bounds.min.y;
      if (top > DANGER_Y) {
        const band = clutchBand(this.holdMs(p, now));
        if (band !== 'none' && (!saved || clutchRank(band) > clutchRank(saved.band))) {
          saved = { band, x: p.body.position.x, y: p.body.position.y };
        }
        p.cleared = true;
        p.overSince = null;
        continue;
      }
      if (!p.cleared) continue;
      const speed = Math.hypot(p.body.velocity.x, p.body.velocity.y);
      const rest = p.body.isSleeping || speed < 0.32;
      if (rest) {
        if (p.overSince == null) p.overSince = now;
        else if (now - p.overSince >= DANGER_HOLD_MS) {
          this.gameOver();
          return;
        }
        hot = true;
      } else {
        p.overSince = null;
      }
    }
    if (saved) this.voiceClutch(saved.x, saved.y, saved.band, now);
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
