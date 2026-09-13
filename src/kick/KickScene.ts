import Phaser from 'phaser';
import { creature } from '../game/canon';
import { el } from '../game/dom';
import { burstDots, pulseRing, screenWash, squashTo, UI_FONT } from '../game/juice';
import { W } from '../game/layout';
import { sfxOver, unlockSfx } from '../game/sfx';
import { drawCreature } from '../game/sprites';
import {
  addKeeperGloves,
  drawAimArrow,
  drawLabBall,
  drawPowerMeter,
  drawReticle,
  GOAL,
  KEEPER_HOME,
  KICKER_POS,
  paintKickWorld,
  renderAimArrow,
  renderPowerMeter,
  renderReticle,
  SPOT,
} from './kickArt';
import { loadKickBest, saveKickBest } from './kickScore';
import { sfxGoal, sfxKick, sfxPost, sfxSave, sfxWhistle, sfxWide, unlockKickSfx } from './kickSfx';

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
  private pulse = 0;
  private aimAngle = 0;
  private aimHeight = 0.48;
  private power = 0.5;
  private dragging = false;
  private tellClock = 0;
  private diveZone: Zone = ZONES[2];
  private shownZone: Zone = ZONES[2];
  private fake = false;
  private liveAt = 0;
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
    this.best = loadKickBest();
    this.pulse = 0;
    this.aimAngle = 0;
    this.aimHeight = 0.48;
    this.power = 0.5;
    this.dragging = false;
    this.liveAt = 0;
    this.motes = [];

    paintKickWorld(this);
    this.spawnMotes();

    this.kickerShadow = this.add.ellipse(KICKER_POS.x, KICKER_POS.y + 26, 36, 12, 0x000000, 0.28).setDepth(11);
    this.keeperShadow = this.add.ellipse(KEEPER_HOME.x, GOAL.lineY - 2, 42, 12, 0x000000, 0.3).setDepth(11);
    this.ballShadow = this.add.ellipse(SPOT.x, SPOT.y + 14, 22, 8, 0x000000, 0.26).setDepth(11);

    this.keeper = drawCreature(this, KEEPER_HOME.x, KEEPER_HOME.y, 7, 32);
    this.keeper.setDepth(16);
    this.gloves = addKeeperGloves(this, this.keeper);

    this.kicker = drawCreature(this, KICKER_POS.x, KICKER_POS.y, 5, 34);
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
      .text(W / 2, 732, 'POTENCIA', {
        fontFamily: UI_FONT,
        fontSize: '10px',
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
      this.power = 0.5 + Math.sin(this.pulse * 3.35) * 0.46;
      if (!this.dragging) {
        const sway = 0.46 - Math.min(0.16, this.score * 0.018);
        this.aimAngle = Math.sin(this.pulse * 1.35) * sway;
        this.aimHeight = 0.46 + Math.sin(this.pulse * 0.95 + 0.4) * 0.2;
      }
      this.tellClock += s;
      this.applyKeeperTell();
      this.idleActors();
      this.drawGuides();
      return;
    }

    this.idleActors();
  }

  private beginPlay(): void {
    if (this.phase === 'ready' || this.phase === 'flying') return;
    unlockSfx();
    unlockKickSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'ready';
    this.score = 0;
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
    const hint = document.getElementById('drop-hint');
    if (hint) hint.hidden = true;

    const sweet = this.power > 0.55 && this.power < 0.86;
    const scatter = sweet ? 4 : 10 + (1 - this.power) * 16;
    const raw = targetFromAim(this.aimAngle, this.aimHeight);
    const target = {
      x: raw.x + (Math.random() - 0.5) * scatter,
      y: raw.y + (Math.random() - 0.5) * scatter * 0.7,
    };

    sfxKick();
    this.cameras.main.shake(90, 0.006);
    squashTo(this, this.kicker, 1.22, 0.7, 160);
    this.tweens.add({
      targets: this.kicker,
      x: SPOT.x + 18,
      duration: 90,
      yoyo: true,
      ease: 'Quad.out',
    });
    burstDots(this, SPOT.x, SPOT.y, 0xe8ff47, 8);

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
        if (t > 0.16 && t < 0.9) this.spawnTrail(x, y);
      },
      onComplete: () => this.resolveShot(target),
    });
  }

  private diveKeeper(): void {
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
      duration: 180,
      ease: 'Back.out',
    });
    this.tweens.add({
      targets: this.keeperShadow,
      x,
      duration: 180,
    });
    this.keeper.setRotation(this.diveZone.x * 0.42);
    squashTo(this, this.keeper, 1.28, 0.72, 200);
    const stretch = this.diveZone.x < 0 ? this.gloves.left : this.gloves.right;
    stretch.setScale(1.35, 1.2);
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
    saveKickBest(this.score);
    this.best = loadKickBest();
    this.syncHud();
    sfxGoal();
    burstDots(this, x, y, 0xe8ff47, 12);
    burstDots(this, x, y - 16, 0x7cffb2, 8);
    pulseRing(this, x, y, 0xe8ff47, 12, 3.2);
    screenWash(this, 0xe8ff47, 0.16, 240);
    this.cameras.main.shake(160, 0.01);
    this.netRipple(x, y);
    this.tweens.add({
      targets: this.ball,
      x: clamp(x, GOAL.innerL + 16, GOAL.innerR - 16),
      y: clamp(y + 18, GOAL.barY + 20, GOAL.lineY - 12),
      duration: 180,
      ease: 'Quad.out',
    });
    this.popBanner('¡GOL!', '#E8FF47');
    this.time.delayedCall(1280, () => {
      if (this.phase !== 'hold') return;
      this.phase = 'ready';
      this.liveAt = this.time.now + 200;
      this.resetKick(true);
    });
  }

  private onMiss(kind: Outcome, x: number, y: number): void {
    this.phase = 'over';
    const prevBest = this.best;
    saveKickBest(this.score);
    this.best = loadKickBest();
    this.syncHud();
    this.cameras.main.shake(200, 0.014);

    if (kind === 'save') {
      sfxSave();
      squashTo(this, this.keeper, 0.78, 1.18, 180);
      this.ball.setPosition(this.keeper.x + this.diveZone.x * 10, this.keeper.y - 8);
      this.popBanner('¡PARA!', '#6EE7FF');
      burstDots(this, this.ball.x, this.ball.y, 0x6ee7ff, 10);
      screenWash(this, 0x6ee7ff, 0.16, 320);
    } else if (kind === 'post') {
      sfxPost();
      this.popBanner('¡PALO!', '#FF7A45');
      burstDots(this, x, y, 0xff7a45, 10);
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
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
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
    this.keeper.setRotation(z.x * 0.22);
    this.keeperShadow.x = this.keeper.x;
    this.gloves.left.setScale(z.x < 0 ? 1.4 : 0.9, z.y > 0.6 ? 1.22 : 1);
    this.gloves.right.setScale(z.x > 0 ? 1.4 : 0.9, z.y > 0.6 ? 1.22 : 1);
    if (z.y > 0.65) {
      this.gloves.left.y = -14;
      this.gloves.right.y = -14;
    } else {
      this.gloves.left.y = -2;
      this.gloves.right.y = -2;
    }
    this.drawTellMark(z);
  }

  private drawTellMark(z: { x: number; y: number }): void {
    const g = this.tellMark;
    g.clear();
    const x = KEEPER_HOME.x + z.x * 48;
    const y = GOAL.lineY + 10;
    const color = 0xff7a45;
    g.fillStyle(color, 0.85);
    if (Math.abs(z.x) < 0.2) {
      g.fillTriangle(x, y - 10, x - 8, y + 6, x + 8, y + 6);
    } else {
      const dir = Math.sign(z.x);
      g.fillTriangle(x + dir * 12, y, x - dir * 6, y - 9, x - dir * 6, y + 9);
    }
    g.fillStyle(color, 0.2);
    g.fillCircle(this.keeper.x, GOAL.lineY + 4, 16);
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
    const sweet = this.power > 0.55 && this.power < 0.86;
    renderAimArrow(this.arrow, SPOT.x, SPOT.y, this.aimAngle, this.aimHeight, sweet);
    renderPowerMeter(this.meter, this.power, sweet);
    this.powerLbl.setAlpha(0.85).setColor(sweet ? '#E8FF47' : '#FF7A45');
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

  private spawnTrail(x: number, y: number): void {
    const dot = this.add.circle(x, y, 3.2, 0xe8ff47, 0.4).setDepth(18);
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

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const c = creature(5);
    const chip = document.getElementById('next-chip');
    if (chip) {
      chip.style.background = c.hex;
      chip.textContent = c.emoji;
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = c.code;
  }
}
