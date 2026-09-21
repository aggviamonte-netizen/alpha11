import Phaser from 'phaser';
import { el } from '../game/dom';
import { burstDots, floatLabel, hitStop, pulseRing, screenWash, squashTo, UI_FONT } from '../game/juice';
import { W } from '../game/layout';
import { sfxOver, unlockSfx } from '../game/sfx';
import {
  drawAimArrow,
  drawLabBall,
  drawPowerMeter,
  drawReticle,
  GOAL,
  KEEPER_HOME,
  KICKER_POS,
  METER,
  paintKickWorld,
  renderAimArrow,
  renderPowerMeter,
  renderReticle,
  SPOT,
} from './kickArt';
import { drawKeeper, drawKicker, KICK_CHIP } from './drawKickCast';
import {
  goalBanner,
  isStreakMilestone,
  isSweetPower,
  shotHeightBias,
  shotScatter,
  streakWhisper,
} from './kickFeel';
import { isNewKickRecord, loadKickBest, saveKickBest } from './kickScore';
import {
  sfxDive,
  sfxGoal,
  sfxKick,
  sfxPost,
  sfxSave,
  sfxStreak,
  sfxWhistle,
  sfxWide,
  unlockKickSfx,
} from './kickSfx';

type Phase = 'start' | 'ready' | 'flying' | 'hold' | 'over';
type Outcome = 'goal' | 'save' | 'wide' | 'post';

type Zone = { x: number; y: number };

const ZONES: Zone[] = [
  { x: -1, y: 0.28 },
  { x: -0.55, y: 0.72 },
  { x: 0, y: 0.42 },
  { x: 0.55, y: 0.72 },
  { x: 1, y: 0.28 },
  { x: 0, y: 0.82 },
];

const MAX_ANGLE = 0.62;

let skipStart = false;

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function zonePoint(zone: Zone): { x: number; y: number } {
  const x = mix(GOAL.innerL + 18, GOAL.innerR - 18, (zone.x + 1) / 2);
  const y = mix(GOAL.lineY - 18, GOAL.barY + 16, zone.y);
  return { x, y };
}

function targetFromAim(angle: number, height: number): { x: number; y: number } {
  const x = GOAL.cx + Math.sin(angle) * ((GOAL.innerR - GOAL.innerL) * 0.52 + 18);
  const y = mix(GOAL.lineY - 12, GOAL.barY - 22, clamp(height, 0, 1.12));
  return { x, y };
}

function insideGoal(x: number, y: number, pad = 0): boolean {
  return (
    x >= GOAL.innerL + pad &&
    x <= GOAL.innerR - pad &&
    y >= GOAL.barY + pad &&
    y <= GOAL.lineY - pad
  );
}

function nearPost(x: number, y: number): boolean {
  const onBar = Math.abs(y - GOAL.barY) < 10 && x > GOAL.innerL - 8 && x < GOAL.innerR + 8;
  const onL = Math.abs(x - GOAL.innerL) < 10 && y > GOAL.barY - 6 && y < GOAL.lineY + 4;
  const onR = Math.abs(x - GOAL.innerR) < 10 && y > GOAL.barY - 6 && y < GOAL.lineY + 4;
  return onBar || onL || onR;
}

export class KickScene extends Phaser.Scene {
  private phase: Phase = 'start';
  private score = 0;
  private best = 0;
  private prevBest = 0;
  private newRecord = false;
  private pulse = 0;
  private aimAngle = 0;
  private aimHeight = 0.48;
  private power = 0.5;
  private dragging = false;
  private aimHeld = false;
  private tellClock = 0;
  private diveZone: Zone = ZONES[2];
  private shownZone: Zone = ZONES[2];
  private fake = false;
  private liveAt = 0;
  private keys = { l: false, r: false, u: false, d: false };
  private kicker!: Phaser.GameObjects.Container;
  private keeper!: Phaser.GameObjects.Container;
  private gloves!: { left: Phaser.GameObjects.Container; right: Phaser.GameObjects.Container };
  private ball!: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Graphics;
  private meter!: Phaser.GameObjects.Graphics;
  private reticle!: Phaser.GameObjects.Graphics;
  private kickerShadow!: Phaser.GameObjects.Ellipse;
  private keeperShadow!: Phaser.GameObjects.Ellipse;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private tellMark!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;
  private powerLbl!: Phaser.GameObjects.Text;
  private motes: Array<{ g: Phaser.GameObjects.Arc; vx: number; vy: number }> = [];

  constructor() {
    super('kick');
  }

  create(): void {
    this.phase = 'start';
    this.score = 0;
    this.armRecordTracking();
    this.pulse = 0;
    this.aimAngle = 0;
    this.aimHeight = 0.48;
    this.power = 0.5;
    this.dragging = false;
    this.aimHeld = false;
    this.keys = { l: false, r: false, u: false, d: false };
    this.liveAt = 0;
    this.motes = [];
    this.tweens.timeScale = 1;
    this.time.timeScale = 1;

    paintKickWorld(this);
    this.spawnMotes();

    this.kickerShadow = this.add.ellipse(KICKER_POS.x, KICKER_POS.y + 26, 36, 12, 0x000000, 0.28).setDepth(11);
    this.keeperShadow = this.add.ellipse(KEEPER_HOME.x, GOAL.lineY - 2, 42, 12, 0x000000, 0.3).setDepth(11);
    this.ballShadow = this.add.ellipse(SPOT.x, SPOT.y + 14, 22, 8, 0x000000, 0.26).setDepth(11);

    const keeperCast = drawKeeper(this, KEEPER_HOME.x, KEEPER_HOME.y);
    this.keeper = keeperCast.root;
    this.keeper.setDepth(16);
    this.gloves = keeperCast.gloves;

    this.kicker = drawKicker(this, KICKER_POS.x, KICKER_POS.y);
    this.kicker.setDepth(20);

    this.tellMark = this.add.graphics().setDepth(12);
    this.banner = this.add
      .text(W / 2, 400, '', {
        fontFamily: UI_FONT,
        fontSize: '42px',
        color: '#E8FF47',
        fontStyle: 'bold',
        stroke: '#0B0B0C',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0);
    this.powerLbl = this.add
      .text(W / 2, METER.y - 16, 'POTENCIA', {
        fontFamily: UI_FONT,
        fontSize: '11px',
        color: '#7CFFB2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(25)
      .setAlpha(0)
      .setLetterSpacing(3);

    this.ball = drawLabBall(this, SPOT.x, SPOT.y);
    this.arrow = drawAimArrow(this);
    this.meter = drawPowerMeter(this);
    this.reticle = drawReticle(this);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.bindKeys();

    el('overlay-over').hidden = true;
    el('retry').onclick = () => {
      skipStart = true;
      this.scene.restart();
    };

    this.syncHud();
    this.resetKick(false);
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
    this.tickMotes(s);

    if (this.phase === 'start' || this.phase === 'over' || this.phase === 'hold') {
      this.idleActors();
      this.arrow.clear();
      this.meter.clear();
      this.reticle.clear();
      this.tellMark.clear();
      this.powerLbl.setAlpha(0);
      return;
    }

    if (this.phase === 'ready') {
      this.power = 0.5 + Math.sin(this.pulse * 2.85) * 0.46;
      this.steerAim(s);
      this.tellClock += s;
      this.applyKeeperTell();
      this.idleActors();
      this.drawGuides();
      return;
    }

    this.idleActors();
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e, true));
    kb.on('keyup', (e: KeyboardEvent) => this.onKey(e, false));
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA') this.keys.l = down;
    if (code === 'ArrowRight' || code === 'KeyD') this.keys.r = down;
    if (code === 'ArrowUp' || code === 'KeyW') this.keys.u = down;
    if (code === 'ArrowDown' || code === 'KeyS') this.keys.d = down;
    if (
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'Space'
    ) {
      e.preventDefault();
    }
    if (this.phase === 'ready' && (this.keys.l || this.keys.r || this.keys.u || this.keys.d)) {
      this.aimHeld = true;
    }
    if (!down) return;
    if (code !== 'Space' && code !== 'Enter') return;
    if (this.phase === 'start') this.beginPlay();
    else if (this.phase === 'ready' && this.time.now >= this.liveAt) this.shoot();
  }

  private steerAim(s: number): void {
    const usingKeys = this.keys.l || this.keys.r || this.keys.u || this.keys.d;
    if (this.dragging || usingKeys) {
      if (usingKeys && !this.dragging) {
        const turn = 1.55 * s;
        if (this.keys.l) this.aimAngle -= turn;
        if (this.keys.r) this.aimAngle += turn;
        if (this.keys.u) this.aimHeight += 0.9 * s;
        if (this.keys.d) this.aimHeight -= 0.9 * s;
        this.aimAngle = clamp(this.aimAngle, -MAX_ANGLE, MAX_ANGLE);
        this.aimHeight = clamp(this.aimHeight, -0.05, 1.18);
      }
      return;
    }
    if (this.aimHeld) return;
    const sway = 0.46 - Math.min(0.16, this.score * 0.018);
    this.aimAngle = Math.sin(this.pulse * 1.35) * sway;
    this.aimHeight = 0.46 + Math.sin(this.pulse * 0.95 + 0.4) * 0.2;
  }

  private beginPlay(): void {
    if (this.phase === 'ready' || this.phase === 'flying') return;
    unlockSfx();
    unlockKickSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'ready';
    this.score = 0;
    this.armRecordTracking();
    this.liveAt = this.time.now + 240;
    this.syncHud();
    this.resetKick(true);
    const hint = document.getElementById('drop-hint');
    if (hint) hint.hidden = false;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    unlockSfx();
    unlockKickSfx();
    if (this.phase !== 'ready' || this.time.now < this.liveAt) return;
    this.dragging = true;
    this.aimHeld = true;
    this.pointAim(p);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (this.phase !== 'ready' || !this.dragging) return;
    this.pointAim(p);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (this.phase !== 'ready' || this.time.now < this.liveAt) return;
    if (this.dragging) this.pointAim(p);
    this.dragging = false;
    this.shoot();
  }

  private pointAim(p: Phaser.Input.Pointer): void {
    this.aimAngle = clamp(((p.x - GOAL.cx) / (W * 0.5)) * MAX_ANGLE, -MAX_ANGLE, MAX_ANGLE);
    const span = SPOT.y - GOAL.barY;
    this.aimHeight = clamp(1 - (p.y - GOAL.barY) / span, -0.05, 1.18);
  }

  private shoot(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'flying';
    this.arrow.clear();
    this.meter.clear();
    this.reticle.clear();
    this.powerLbl.setAlpha(0);
    const hint = document.getElementById('drop-hint');
    if (hint) hint.hidden = true;

    const sweet = isSweetPower(this.power);
    const scatter = shotScatter(this.power);
    const raw = targetFromAim(this.aimAngle, this.aimHeight + shotHeightBias(this.power));
    const target = {
      x: raw.x + (Math.random() - 0.5) * scatter,
      y: raw.y + (Math.random() - 0.5) * scatter * 0.7,
    };

    sfxKick();
    hitStop(this, sweet ? 48 : 36, 0.08);
    this.cameras.main.shake(sweet ? 120 : 90, sweet ? 0.008 : 0.006);
    squashTo(this, this.kicker, 1.28, 0.66, 180);
    squashTo(this, this.ball, 1.18, 0.72, 140);
    this.kicker.setRotation(-0.18);
    this.tweens.add({
      targets: this.kicker,
      x: SPOT.x + 18,
      duration: 90,
      yoyo: true,
      ease: 'Quad.out',
    });
    burstDots(this, SPOT.x, SPOT.y, 0xe8ff47, 10);
    burstDots(this, SPOT.x - 8, SPOT.y + 6, 0xff7a45, 6);
    pulseRing(this, SPOT.x, SPOT.y, sweet ? 0xe8ff47 : 0xff7a45, 10, 2.2);

    const flight = 540 - this.power * 200;
    const startX = this.ball.x;
    const startY = this.ball.y;
    const arc = 36 + (1 - this.power) * 34;
    const reaction = Math.max(70, 320 - this.score * 24);

    this.time.delayedCall(reaction, () => this.diveKeeper());

    this.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: flight,
      ease: 'Sine.out',
      onUpdate: (_tw, obj: { t: number }) => {
        const t = obj.t;
        const x = mix(startX, target.x, t);
        const y = mix(startY, target.y, t) - Math.sin(t * Math.PI) * arc;
        this.ball.setPosition(x, y);
        this.ball.setScale(1 - t * 0.12, 1 - t * 0.08);
        this.ball.setRotation(t * 6.2);
        this.ballShadow.setPosition(mix(startX, target.x, t), mix(SPOT.y + 14, GOAL.lineY + 2, t));
        this.ballShadow.setScale(1 - t * 0.35, 1 - t * 0.2);
        this.ballShadow.setAlpha(0.26 - t * 0.1);
        if (t > 0.16 && t < 0.9) this.spawnTrail(x, y, sweet);
      },
      onComplete: () => this.resolveShot(target),
    });
  }

  private diveKeeper(): void {
    if (this.phase !== 'flying') return;
    sfxDive();
    squashTo(this, this.keeper, 0.78, 1.22, 80);
    this.time.delayedCall(48, () => {
      if (this.phase !== 'flying') return;
      const dest = zonePoint(this.diveZone);
      const reach = 0.72 + Math.min(0.18, this.score * 0.02);
      const x = mix(KEEPER_HOME.x, dest.x, reach);
      const y = mix(KEEPER_HOME.y, dest.y + 8, reach * 0.85);
      this.tweens.killTweensOf(this.keeper);
      this.tweens.add({
        targets: this.keeper,
        x,
        y,
        duration: 170,
        ease: 'Cubic.out',
      });
      this.tweens.add({
        targets: this.keeperShadow,
        x,
        duration: 170,
      });
      this.keeper.setRotation(this.diveZone.x * 0.62);
      this.keeper.setScale(1.38, 0.64);
      this.tweens.add({
        targets: this.keeper,
        scaleX: 1,
        scaleY: 1,
        duration: 220,
        ease: 'Sine.out',
      });
      if (Math.abs(this.diveZone.x) < 0.2) {
        this.gloves.left.setScale(1.18, 1.32);
        this.gloves.right.setScale(1.18, 1.32);
      } else {
        const stretch = this.diveZone.x < 0 ? this.gloves.left : this.gloves.right;
        stretch.setScale(1.55, 1.28);
      }
      burstDots(this, mix(KEEPER_HOME.x, x, 0.4), GOAL.lineY - 2, 0xff7a45, 6);
    });
  }

  private resolveShot(target: { x: number; y: number }): void {
    if (this.phase !== 'flying') return;
    const bx = this.ball.x;
    const by = this.ball.y;
    let outcome: Outcome;

    if (nearPost(bx, by) && !insideGoal(bx, by, 10)) {
      outcome = Math.random() < 0.38 && insideGoal(bx, by, -2) ? 'goal' : 'post';
    } else if (!insideGoal(target.x, target.y, -4) && !insideGoal(bx, by, 2)) {
      outcome = 'wide';
    } else if (this.keeperSaves(bx, by)) {
      outcome = 'save';
    } else {
      outcome = 'goal';
    }

    if (outcome === 'goal') this.onGoal(bx, by);
    else this.onMiss(outcome, bx, by);
  }

  private keeperSaves(bx: number, by: number): boolean {
    const dx = bx - this.keeper.x;
    const dy = by - (this.keeper.y - 6);
    const reach = 46 + Math.min(16, this.score * 2.1) - this.power * 14;
    const extra = this.aimMatchesTell() ? 10 : 0;
    return dx * dx + dy * dy * 1.15 < (reach + extra) * (reach + extra);
  }

  private aimMatchesTell(): boolean {
    return Math.sign(this.aimAngle || 0.0001) === Math.sign(this.shownZone.x || 0.0001);
  }

  private onGoal(x: number, y: number): void {
    this.phase = 'hold';
    this.score += 1;
    if (isNewKickRecord(this.score, this.prevBest)) this.newRecord = true;
    saveKickBest(this.score);
    this.best = Math.max(this.prevBest, this.score);
    this.syncHud();
    sfxGoal();
    hitStop(this, 56, 0.1);
    burstDots(this, x, y, 0xe8ff47, 12);
    burstDots(this, x, y - 16, 0x7cffb2, 8);
    pulseRing(this, x, y, 0xe8ff47, 12, 3.2);
    screenWash(this, 0xe8ff47, 0.16, 240);
    this.cameras.main.shake(170, 0.011);
    this.netRipple(x, y);
    this.tweens.add({
      targets: this.ball,
      x: clamp(x, GOAL.innerL + 16, GOAL.innerR - 16),
      y: clamp(y + 18, GOAL.barY + 20, GOAL.lineY - 12),
      duration: 180,
      ease: 'Quad.out',
    });
    this.popBanner(goalBanner(this.score), '#E8FF47');
    if (isStreakMilestone(this.score)) {
      sfxStreak();
      floatLabel(this, W / 2, 448, streakWhisper(this.score), {
        color: '#7CFFB2',
        size: '15px',
        lift: 32,
      });
      screenWash(this, 0x7cffb2, 0.14, 320);
      this.cameras.main.shake(220, 0.014);
      pulseRing(this, GOAL.cx, mix(GOAL.barY, GOAL.lineY, 0.5), 0xe8ff47, 28, 2.6);
    }
    this.time.delayedCall(1280, () => {
      if (this.phase !== 'hold') return;
      this.phase = 'ready';
      this.liveAt = this.time.now + 200;
      this.resetKick(true);
    });
  }

  private onMiss(kind: Outcome, x: number, y: number): void {
    this.phase = 'over';
    this.syncHud();

    if (kind === 'save') {
      sfxSave();
      hitStop(this, 72, 0.08);
      this.cameras.main.shake(180, 0.013);
      squashTo(this, this.keeper, 0.74, 1.22, 200);
      this.ball.setPosition(this.keeper.x + this.diveZone.x * 10, this.keeper.y - 8);
      this.popBanner('¡PARA!', '#6EE7FF');
      burstDots(this, this.ball.x, this.ball.y, 0x6ee7ff, 10);
      screenWash(this, 0x6ee7ff, 0.16, 320);
    } else if (kind === 'post') {
      sfxPost();
      hitStop(this, 80, 0.07);
      this.cameras.main.shake(240, 0.018);
      this.popBanner('¡PALO!', '#FF7A45');
      burstDots(this, x, y, 0xff7a45, 10);
      pulseRing(this, x, y, 0xff7a45, 8, 2.8);
      screenWash(this, 0xff7a45, 0.16, 300);
      this.tweens.add({
        targets: this.ball,
        x: x + (x < GOAL.cx ? -70 : 70),
        y: y + 80,
        duration: 420,
        ease: 'Quad.in',
      });
    } else {
      sfxWide();
      this.cameras.main.shake(120, 0.008);
      this.popBanner('¡FUERA!', '#FF8BD1');
      burstDots(this, x, y, 0xff8bd1, 8);
      screenWash(this, 0xff8bd1, 0.14, 300);
      this.tweens.add({
        targets: this.ball,
        x: clamp(x + this.aimAngle * 80, -20, W + 20),
        y: y - 40,
        duration: 380,
        ease: 'Quad.out',
      });
    }
    sfxOver();

    el('over-score').textContent = `Racha ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !this.newRecord;
    this.time.delayedCall(880, () => {
      el('overlay-over').hidden = false;
    });
  }

  private resetKick(announce: boolean): void {
    this.tweens.killTweensOf(this.ball);
    this.tweens.killTweensOf(this.keeper);
    this.tweens.killTweensOf(this.kicker);
    this.ball.setPosition(SPOT.x, SPOT.y);
    this.ball.setScale(1);
    this.ball.setRotation(0);
    this.kicker.setPosition(KICKER_POS.x, KICKER_POS.y);
    this.kicker.setRotation(0);
    this.kicker.setScale(1);
    this.keeper.setPosition(KEEPER_HOME.x, KEEPER_HOME.y);
    this.keeper.setRotation(0);
    this.keeper.setScale(1);
    this.gloves.left.setScale(1);
    this.gloves.right.setScale(1);
    this.kickerShadow.setPosition(KICKER_POS.x, KICKER_POS.y + 26);
    this.keeperShadow.setPosition(KEEPER_HOME.x, GOAL.lineY - 2);
    this.ballShadow.setPosition(SPOT.x, SPOT.y + 14);
    this.ballShadow.setScale(1);
    this.ballShadow.setAlpha(0.26);
    this.dragging = false;
    this.aimHeld = false;
    this.pickTell();
    if (announce && this.phase === 'ready') {
      sfxWhistle();
      pulseRing(this, SPOT.x, SPOT.y, 0x7cffb2, 8, 2.1);
    }
  }

  private pickTell(): void {
    this.diveZone = ZONES[Math.floor(Math.random() * ZONES.length)];
    this.fake = this.score >= 4 && Math.random() < 0.22 + Math.min(0.16, this.score * 0.02);
    if (this.fake) {
      this.shownZone = ZONES[Math.floor(Math.random() * ZONES.length)];
      if (Math.sign(this.shownZone.x) === Math.sign(this.diveZone.x) && this.diveZone.x !== 0) {
        this.shownZone = { x: -this.diveZone.x, y: this.shownZone.y };
      }
    } else {
      this.shownZone = this.diveZone;
    }
    this.tellClock = 0;
  }

  private applyKeeperTell(): void {
    const z = this.shownZone;
    const lean = z.x * (22 + Math.min(10, this.score));
    const bob = Math.sin(this.pulse * 3.1) * 2;
    const twitch = this.fake && this.tellClock > 0.55 ? Math.sin(this.tellClock * 22) * 4 : 0;
    this.keeper.x = KEEPER_HOME.x + lean + twitch;
    this.keeper.y = KEEPER_HOME.y + bob - z.y * 8;
    this.keeper.setRotation(z.x * 0.28);
    this.keeperShadow.x = this.keeper.x;
    this.gloves.left.setScale(z.x < 0 ? 1.48 : 0.92, z.y > 0.6 ? 1.28 : 1);
    this.gloves.right.setScale(z.x > 0 ? 1.48 : 0.92, z.y > 0.6 ? 1.28 : 1);
    if (z.y > 0.65) {
      this.gloves.left.y = -16;
      this.gloves.right.y = -16;
    } else {
      this.gloves.left.y = -2;
      this.gloves.right.y = -2;
    }
    this.drawTellMark(z);
  }

  private drawTellMark(z: { x: number; y: number }): void {
    const g = this.tellMark;
    g.clear();
    const laneX = mix(GOAL.innerL + 22, GOAL.innerR - 22, (z.x + 1) / 2);
    const laneW = 54;
    const flicker = this.fake && this.tellClock > 0.55 ? 0.06 + Math.abs(Math.sin(this.tellClock * 18)) * 0.1 : 0.12;
    g.fillStyle(0xff7a45, flicker);
    g.fillRoundedRect(laneX - laneW / 2, GOAL.barY + 6, laneW, GOAL.lineY - GOAL.barY - 14, 8);
    const x = KEEPER_HOME.x + z.x * 48;
    const y = GOAL.lineY + 10;
    const color = 0xff7a45;
    g.fillStyle(color, 0.92);
    if (Math.abs(z.x) < 0.2) {
      g.fillTriangle(x, y - 12, x - 9, y + 7, x + 9, y + 7);
    } else {
      const dir = Math.sign(z.x);
      g.fillTriangle(x + dir * 14, y, x - dir * 7, y - 10, x - dir * 7, y + 10);
    }
    g.fillStyle(color, 0.22);
    g.fillCircle(this.keeper.x, GOAL.lineY + 4, 18);
  }

  private popBanner(text: string, color: string): void {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.62).setY(400);
    this.tweens.add({
      targets: this.banner,
      scale: 1.08,
      y: 368,
      duration: 180,
      ease: 'Back.out',
    });
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      delay: 720,
      duration: 260,
    });
  }

  private drawGuides(): void {
    const sweet = isSweetPower(this.power);
    renderAimArrow(this.arrow, SPOT.x, SPOT.y, this.aimAngle, this.aimHeight, sweet);
    renderPowerMeter(this.meter, this.power, sweet);
    this.powerLbl
      .setAlpha(sweet ? 1 : 0.88)
      .setColor(sweet ? '#E8FF47' : '#FF7A45')
      .setText(sweet ? '¡AHÍ!' : 'POTENCIA');
    const ghost = targetFromAim(this.aimAngle, this.aimHeight);
    renderReticle(this.reticle, ghost.x, ghost.y, insideGoal(ghost.x, ghost.y, 2));
  }

  private idleActors(): void {
    if (this.phase !== 'ready' && this.phase !== 'start') return;
    const kb = Math.sin(this.pulse * 2.2) * 4;
    this.kicker.y = KICKER_POS.y + kb;
    this.kickerShadow.setPosition(KICKER_POS.x, KICKER_POS.y + 26 + kb * 0.2);
    if (this.phase === 'start') {
      this.keeper.y = KEEPER_HOME.y + Math.sin(this.pulse * 2.6) * 3;
      this.ball.y = SPOT.y + Math.sin(this.pulse * 3.4) * 2;
    } else {
      this.ball.y = SPOT.y + Math.sin(this.pulse * 5.2) * 1.4;
    }
  }

  private spawnTrail(x: number, y: number, sweet: boolean): void {
    const color = sweet ? 0xe8ff47 : 0xff7a45;
    const dot = this.add.circle(x, y, sweet ? 3.4 : 2.8, color, 0.42).setDepth(18);
    this.tweens.add({
      targets: dot,
      alpha: 0,
      scale: 0.2,
      duration: 220,
      onComplete: () => dot.destroy(),
    });
  }

  private netRipple(x: number, y: number): void {
    pulseRing(this, x, y, 0x6ee7ff, 6, 2.4);
    pulseRing(this, GOAL.cx, mix(GOAL.barY, GOAL.lineY, 0.5), 0x7cffb2, 20, 1.8);
  }

  private spawnMotes(): void {
    for (let i = 0; i < 14; i++) {
      const g = this.add
        .circle(
          Math.random() * W,
          160 + Math.random() * 520,
          1.2 + Math.random() * 2,
          i % 3 === 0 ? 0xe8ff47 : i % 3 === 1 ? 0x7cffb2 : 0xff7a45,
          0.18 + Math.random() * 0.22,
        )
        .setDepth(3);
      this.motes.push({ g, vx: -10 + Math.random() * 20, vy: -6 + Math.random() * 12 });
    }
  }

  private tickMotes(s: number): void {
    for (const m of this.motes) {
      m.g.x += m.vx * s;
      m.g.y += m.vy * s + Math.sin((m.g.x + this.pulse * 30) * 0.04) * 0.2;
      if (m.g.x < -8) m.g.x = W + 6;
      if (m.g.x > W + 8) m.g.x = -6;
      if (m.g.y < 150) m.g.y = 720;
      if (m.g.y > 760) m.g.y = 180;
    }
  }

  private armRecordTracking(): void {
    this.prevBest = loadKickBest();
    this.best = this.prevBest;
    this.newRecord = false;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = true;
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const chip = document.getElementById('next-chip');
    if (chip) {
      chip.style.background = KICK_CHIP.hex;
      chip.textContent = '';
      chip.classList.add('kick-chip');
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = KICK_CHIP.code;
  }
}
