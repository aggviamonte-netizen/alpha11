import Phaser from 'phaser';
import { el } from './dom';
import { drawAsteroid, drawBolt, drawPulseCraft, drawSentry, drawWreck, poseCraft, type CraftRig } from './drawCraft';
import { burstDots, floatLabel, popScale, pulseRing, screenWash, squashTo } from './juice';
import {
  ASSIST_RANGE,
  COMBO_WINDOW_MS,
  FIRE_MS,
  GRACE_MS,
  GRAZE_COOLDOWN_MS,
  STEER_RATE,
  aimNudge,
  eliteEntrance,
  graceSaveBanner,
  graceSaveWhisper,
  impactShake,
  impactZoom,
  isNearMiss,
  killAccentCount,
  killBurstCount,
  killColor,
  killImpact,
  killVoice,
  momentWash,
  nearMissBanner,
  nearMissWhisper,
  nextCombo,
  scoreKill,
  shotSquash,
  surfaceGap,
  type JumpImpact,
} from './jumpFeel';
import { loadJumpBest, saveJumpBest } from './jumpScore';
import { sfxHit, sfxKill, sfxLand, sfxOver, sfxShot, unlockSfx } from './sfx';

export const W = 390;
export const H = 844;

const PAD = 28;
const TOP = 86;
const BOT = 78;
const HIT = 9;

type Phase = 'start' | 'play' | 'over';
type FoeKind = 'rock' | 'big' | 'drone' | 'elite';

type Foe = {
  kind: FoeKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  spin: number;
  shotAt: number;
  entered: boolean;
  root: Phaser.GameObjects.Container;
};

type Bolt = {
  x: number;
  y: number;
  vy: number;
  enemy: boolean;
  root: Phaser.GameObjects.Container;
};

type Star = { g: Phaser.GameObjects.Arc; vy: number };

let skipStart = false;

function circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy < rr * rr;
}

function foeStats(kind: FoeKind): { r: number; hp: number } {
  if (kind === 'rock') return { r: 13, hp: 1 };
  if (kind === 'big') return { r: 21, hp: 2 };
  if (kind === 'drone') return { r: 14, hp: 2 };
  return { r: 16, hp: 3 };
}

export class JumpScene extends Phaser.Scene {
  private phase: Phase = 'start';
  private score = 0;
  private dist = 0;
  private kills = 0;
  private bonus = 0;
  private best = 0;
  private combo = 0;
  private comboUntil = 0;
  private px = W * 0.5;
  private py = H * 0.74;
  private vx = 0;
  private aimX = W * 0.5;
  private aimY = H * 0.74;
  private moveId = -1;
  private tapX = 0;
  private tapY = 0;
  private holdingFire = false;
  private lastShot = 0;
  private graceUntil = 0;
  private graceSpoken = false;
  private grazeUntil = 0;
  private wasGraze = false;
  private eliteSeen = false;
  private traveled = 0;
  private spawnT = 0;
  private pulse = 0;
  private lastTrail = 0;
  private keys = { l: false, r: false, u: false, d: false };
  private rig!: CraftRig;
  private foes: Foe[] = [];
  private bolts: Bolt[] = [];
  private stars: Star[] = [];
  private motes: Star[] = [];

  constructor() {
    super('jump');
  }

  create(): void {
    this.phase = 'start';
    this.score = 0;
    this.dist = 0;
    this.kills = 0;
    this.bonus = 0;
    this.best = loadJumpBest();
    this.combo = 0;
    this.comboUntil = 0;
    this.px = W * 0.5;
    this.py = H * 0.74;
    this.vx = 0;
    this.aimX = this.px;
    this.aimY = this.py;
    this.moveId = -1;
    this.holdingFire = false;
    this.lastShot = 0;
    this.graceUntil = 0;
    this.graceSpoken = false;
    this.grazeUntil = 0;
    this.wasGraze = false;
    this.eliteSeen = false;
    this.traveled = 0;
    this.spawnT = -1.15;
    this.pulse = 0;
    this.lastTrail = 0;
    this.keys = { l: false, r: false, u: false, d: false };
    this.cameras.main.resetFX();
    this.cameras.main.setZoom(1);
    this.foes = [];
    this.bolts = [];
    this.stars = [];
    this.motes = [];

    this.input.addPointer(2);
    this.paintWorld();
    this.rig = drawPulseCraft(this, this.px, this.py);
    this.bindInput();
    this.bindFirePad();

    el('overlay-over').hidden = true;
    el('retry').onclick = () => {
      skipStart = true;
      this.scene.restart();
    };

    this.syncHud();
    this.setFirePad(false);
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
      const y = this.py + Math.sin(this.pulse * 2.3) * 5;
      this.rig.root.setPosition(this.px, y);
      poseCraft(this.rig, Math.sin(this.pulse * 1.4) * 40, this.pulse, false);
      return;
    }

    this.steer(s);
    if (this.holdingFire) this.tryFire();
    this.tickBolts(s);
    this.tickFoes(s);
    this.spawnWave(s);
    this.spawnTrail();
    this.hitTest();

    this.traveled += this.scrollSpeed() * s;
    const nextDist = Math.floor(this.traveled / 16);
    if (nextDist !== this.dist) {
      this.dist = nextDist;
      this.refreshScore();
    }
    if (this.time.now > this.comboUntil) this.combo = 0;
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    unlockSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    this.phase = 'play';
    this.score = 0;
    this.dist = 0;
    this.kills = 0;
    this.bonus = 0;
    this.traveled = 0;
    this.graceUntil = this.time.now + GRACE_MS;
    this.graceSpoken = false;
    this.grazeUntil = 0;
    this.wasGraze = false;
    this.eliteSeen = false;
    this.syncHud();
    this.setFirePad(true);
    this.showHint();
    this.time.delayedCall(380, () => {
      if (this.phase === 'play' && this.foes.length === 0) {
        this.spawnFoe('rock', W * 0.5, -30);
      }
    });
  }

  private bindInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockSfx();
      if (this.phase !== 'play') return;
      this.moveId = p.id;
      this.tapX = p.x;
      this.tapY = p.y;
      this.aimX = p.x;
      this.aimY = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.phase !== 'play' || p.id !== this.moveId) return;
      this.aimX = p.x;
      this.aimY = p.y;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.phase !== 'play' || p.id !== this.moveId) return;
      const dx = p.x - this.tapX;
      const dy = p.y - this.tapY;
      if (dx * dx + dy * dy < 16 * 16) this.tryFire();
      this.moveId = -1;
    });

    const kb = this.input.keyboard;
    if (!kb) return;
    const hold = (code: string, on: boolean): void => {
      if (code === 'ArrowLeft' || code === 'KeyA') this.keys.l = on;
      if (code === 'ArrowRight' || code === 'KeyD') this.keys.r = on;
      if (code === 'ArrowUp' || code === 'KeyW') this.keys.u = on;
      if (code === 'ArrowDown' || code === 'KeyS') this.keys.d = on;
    };
    kb.on('keydown', (e: KeyboardEvent) => {
      hold(e.code, true);
      if (e.code === 'Space' || e.code === 'KeyZ') {
        e.preventDefault();
        this.holdingFire = true;
        this.tryFire();
      }
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      hold(e.code, false);
      if (e.code === 'Space' || e.code === 'KeyZ') this.holdingFire = false;
    });
  }

  private bindFirePad(): void {
    const fire = el('fire');
    fire.onpointerdown = (e: PointerEvent) => {
      e.preventDefault();
      fire.setPointerCapture(e.pointerId);
      unlockSfx();
      this.holdingFire = true;
      this.tryFire();
    };
    fire.onpointerup = () => {
      this.holdingFire = false;
    };
    fire.onpointercancel = () => {
      this.holdingFire = false;
    };
  }

  private setFirePad(on: boolean): void {
    el('fire').hidden = !on;
  }

  private steer(s: number): void {
    const kb = 210;
    if (this.keys.l) this.aimX -= kb * s;
    if (this.keys.r) this.aimX += kb * s;
    if (this.keys.u) this.aimY -= kb * s;
    if (this.keys.d) this.aimY += kb * s;

    this.aimX = Phaser.Math.Clamp(this.aimX, PAD, W - PAD);
    this.aimY = Phaser.Math.Clamp(this.aimY, TOP, H - BOT);

    const prevX = this.px;
    this.px += (this.aimX - this.px) * Math.min(1, STEER_RATE * s);
    this.py += (this.aimY - this.py) * Math.min(1, STEER_RATE * s);
    this.vx = (this.px - prevX) / Math.max(s, 0.001);
    this.rig.root.setPosition(this.px, this.py);
    poseCraft(this.rig, this.vx, this.pulse, true);
  }

  private tryFire(): void {
    if (this.phase !== 'play') return;
    if (this.time.now - this.lastShot < FIRE_MS) return;
    this.lastShot = this.time.now;
    const nudge = this.laneNudge();
    this.spawnBolt(this.px - 9, this.py - 22, -560, false);
    this.spawnBolt(this.px + nudge, this.py - 28, -600, false);
    this.spawnBolt(this.px + 9, this.py - 22, -560, false);
    sfxShot();
    const punch = shotSquash();
    squashTo(this, this.rig.root, punch.sx, punch.sy, punch.ms);
    pulseRing(this, this.px, this.py - 26, 0xe8ff47, 4, 1.25);
    this.hideHint();
  }

  private spawnBolt(x: number, y: number, vy: number, enemy: boolean): void {
    const root = drawBolt(this, enemy).setDepth(enemy ? 16 : 21);
    root.setPosition(x, y);
    this.bolts.push({ x, y, vy, enemy, root });
  }

  private tickBolts(s: number): void {
    this.bolts = this.bolts.filter((b) => {
      b.y += b.vy * s;
      b.root.setPosition(b.x, b.y);
      if (b.y < -24 || b.y > H + 24) {
        b.root.destroy(true);
        return false;
      }
      return true;
    });
  }

  private scrollSpeed(): number {
    return 104 + Math.min(128, this.dist * 1.25);
  }

  private spawnWave(s: number): void {
    this.spawnT += s;
    const gap = Math.max(0.58, 1.42 - this.dist * 0.006);
    if (this.spawnT < gap) return;
    this.spawnT = 0;
    const roll = Math.random();
    const mid = this.dist > 28;
    const late = this.dist > 80;
    if (!mid) {
      const lane = Phaser.Math.Between(0, 2);
      const x = lane === 0 ? W * 0.5 : lane === 1 ? W * 0.34 : W * 0.66;
      this.spawnFoe('rock', x, -28);
      return;
    }
    if (roll < 0.4) {
      this.spawnFoe(Math.random() < 0.22 ? 'big' : 'rock', Phaser.Math.Between(PAD + 10, W - PAD - 10), -28);
    } else if (roll < 0.7) {
      this.spawnFoe('drone', Phaser.Math.Between(52, W - 52), -30);
    } else if (roll < 0.86) {
      this.spawnFoe('rock', 64, -26);
      this.spawnFoe('rock', W - 64, -64);
    } else if (late && roll < 0.95) {
      this.spawnFoe('elite', W * 0.5, -36);
    } else {
      this.spawnFoe('rock', Phaser.Math.Between(48, W - 48), -24);
      if (late) this.spawnFoe('drone', Phaser.Math.Between(60, W - 60), -70);
    }
  }

  private spawnFoe(kind: FoeKind, x: number, y: number): void {
    const { r, hp } = foeStats(kind);
    const root =
      kind === 'drone' || kind === 'elite' ? drawSentry(this, kind === 'elite') : drawAsteroid(this, kind === 'big' ? 2 : 0);
    root.setDepth(14);
    root.setPosition(x, y);
    const speed = this.scrollSpeed();
    const vy = kind === 'drone' || kind === 'elite' ? speed * 0.36 : speed * 0.52;
    const vx = kind === 'drone' || kind === 'elite' ? Phaser.Math.FloatBetween(-36, 36) : Phaser.Math.FloatBetween(-18, 18);
    this.foes.push({
      kind,
      x,
      y,
      vx,
      vy,
      r,
      hp,
      spin: Phaser.Math.FloatBetween(-1.6, 1.6),
      shotAt: this.time.now + Phaser.Math.Between(420, 1100),
      entered: false,
      root,
    });
  }

  private tickFoes(s: number): void {
    this.foes = this.foes.filter((f) => {
      if (f.kind === 'drone' || f.kind === 'elite') {
        f.vx += Math.sin(this.pulse * 3.2 + f.x * 0.02) * 28 * s;
        f.vx = Phaser.Math.Clamp(f.vx, -80, 80);
      }
      f.x += f.vx * s;
      f.y += f.vy * s;
      if (f.x < PAD) {
        f.x = PAD;
        f.vx *= -1;
      }
      if (f.x > W - PAD) {
        f.x = W - PAD;
        f.vx *= -1;
      }
      f.root.setPosition(f.x, f.y);
      if (f.kind === 'elite' && !f.entered && f.y >= -2) {
        f.entered = true;
        const enter = eliteEntrance();
        popScale(this, f.root, enter.from, 1, enter.ms);
        pulseRing(this, f.x, f.y, 0xff7a45, 8, 2.1);
      }
      if (f.kind === 'rock' || f.kind === 'big') f.root.setRotation(f.root.rotation + f.spin * s);
      if ((f.kind === 'drone' || f.kind === 'elite') && this.time.now >= f.shotAt && f.y > 40 && f.y < H * 0.7) {
        f.shotAt = this.time.now + (f.kind === 'elite' ? 720 : 1280);
        this.spawnBolt(f.x, f.y + 14, 260, true);
      }
      if (f.y > H + 40) {
        f.root.destroy(true);
        return false;
      }
      return true;
    });
  }

  private hitTest(): void {
    this.bolts = this.bolts.filter((b) => {
      if (b.enemy) return true;
      for (const f of this.foes) {
        if (circleHit(b.x, b.y, 8, f.x, f.y, f.r + 3)) {
          b.root.destroy(true);
          this.hurtFoe(f);
          return false;
        }
      }
      return true;
    });

    this.scanThreats();
  }

  private scanThreats(): void {
    if (this.phase !== 'play') return;
    const inGrace = this.time.now < this.graceUntil;
    let lethal = false;
    let graze = false;
    for (const f of this.foes) {
      const gap = surfaceGap(this.px, this.py, HIT, f.x, f.y, f.r * 0.72);
      if (gap < 0) lethal = true;
      else if (isNearMiss(gap)) graze = true;
    }
    for (const b of this.bolts) {
      if (!b.enemy) continue;
      const gap = surfaceGap(this.px, this.py, HIT, b.x, b.y, 5);
      if (gap < 0) lethal = true;
      else if (isNearMiss(gap)) graze = true;
    }
    if (lethal && !inGrace) {
      this.wasGraze = true;
      this.gameOver();
      return;
    }
    if (lethal && inGrace && !this.graceSpoken) {
      this.graceSpoken = true;
      this.voiceAt(this.px, this.py - 52, graceSaveBanner(), graceSaveWhisper(), '#E8FF47');
    } else if (graze && !this.wasGraze && this.time.now >= this.grazeUntil) {
      this.grazeUntil = this.time.now + GRAZE_COOLDOWN_MS;
      this.voiceAt(this.px, this.py - 52, nearMissBanner(), nearMissWhisper(), '#6EE7FF');
    }
    this.wasGraze = graze || lethal;
  }

  private hurtFoe(f: Foe): void {
    f.hp -= 1;
    sfxHit();
    f.root.setAlpha(0.45);
    this.tweens.add({ targets: f.root, alpha: 1, duration: 70 });
    burstDots(this, f.x, f.y, 0xe8ff47, 4);
    if (f.hp > 0) return;
    this.shatter(f);
    this.foes = this.foes.filter((x) => x !== f);
    f.root.destroy(true);
    this.kills += 1;
    this.combo = nextCombo(this.combo, this.time.now < this.comboUntil);
    this.comboUntil = this.time.now + COMBO_WINDOW_MS;
    const pts = scoreKill(f.kind, this.combo);
    this.bonus += pts;
    const impact = killImpact(f.kind, this.combo);
    const color = killColor(f.kind);
    burstDots(this, f.x, f.y, color, killBurstCount(f.kind));
    const accent = killAccentCount(f.kind);
    if (accent) burstDots(this, f.x, f.y - 2, 0xf4f1ea, accent);
    if (impact !== 'none') pulseRing(this, f.x, f.y, color, 12, impact === 'hard' ? 2.6 : 2);
    floatLabel(this, f.x, f.y, this.combo > 1 ? `+${pts} x${this.combo}` : `+${pts}`);
    const voice = killVoice(f.kind, this.combo);
    if (voice) this.voiceCenter(voice.banner, voice.whisper, f.kind === 'elite' ? '#FF7A45' : '#E8FF47');
    this.punch(impact);
    const wash = momentWash(f.kind, this.combo, f.kind === 'elite' && !this.eliteSeen);
    if (f.kind === 'elite') this.eliteSeen = true;
    if (wash) screenWash(this, wash.color, wash.alpha, 280);
    sfxKill();
    this.refreshScore();
  }

  private shatter(f: Foe): void {
    const hull = f.kind === 'drone' || f.kind === 'elite';
    const wreck = drawWreck(this, hull).setDepth(20);
    wreck.setPosition(f.x, f.y);
    wreck.setAngle(hull ? 0 : f.root.angle);
    this.tweens.add({
      targets: wreck,
      y: f.y + 26,
      alpha: 0,
      angle: wreck.angle + (hull ? -32 : 40),
      duration: hull ? 280 : 200,
      ease: 'Quad.out',
      onComplete: () => wreck.destroy(true),
    });
  }

  private punch(impact: JumpImpact): void {
    const shake = impactShake(impact);
    const zoom = impactZoom(impact);
    if (shake) this.cameras.main.shake(shake.ms, shake.intensity);
    if (zoom === 1) return;
    this.tweens.killTweensOf(this.cameras.main);
    this.cameras.main.setZoom(zoom);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1,
      duration: shake?.ms ?? 100,
      ease: 'Quad.out',
    });
  }

  private laneNudge(): number {
    let best = ASSIST_RANGE + 1;
    let nudge = 0;
    const yMax = this.py - 16;
    const yMin = this.py - 360;
    for (const f of this.foes) {
      if (f.y > yMax || f.y < yMin) continue;
      const adx = Math.abs(f.x - this.px);
      if (adx < best) {
        best = adx;
        nudge = aimNudge(this.px, f.x);
      }
    }
    return nudge;
  }

  private voiceCenter(banner: string, whisper: string, color: string): void {
    floatLabel(this, W * 0.5, 124, banner, { size: '22px', color, lift: 26, duration: 880 });
    floatLabel(this, W * 0.5, 150, whisper, { size: '13px', color: '#6EE7FF', lift: 18, duration: 840 });
  }

  private voiceAt(x: number, y: number, banner: string, whisper: string, color: string): void {
    floatLabel(this, x, y, banner, { size: '18px', color, lift: 30, duration: 760 });
    floatLabel(this, x, y + 16, whisper, { size: '12px', color: '#6EE7FF', lift: 20, duration: 720 });
  }

  private refreshScore(): void {
    this.score = this.dist + this.bonus;
    this.syncHud();
  }

  private paintWorld(): void {
    const sky = this.add.graphics().setDepth(0);
    sky.fillStyle(0x08090f, 1);
    sky.fillRect(0, 0, W, H);
    sky.fillStyle(0x141822, 1);
    sky.fillEllipse(W * 0.2, 160, 260, 180);
    sky.fillStyle(0x3a5f8a, 0.16);
    sky.fillEllipse(80, 210, 220, 110);
    sky.fillStyle(0xff8bd1, 0.12);
    sky.fillEllipse(W - 40, 620, 240, 140);
    sky.fillStyle(0x6ee7ff, 0.1);
    sky.fillEllipse(W * 0.55, 420, 200, 90);
    sky.fillStyle(0xe8ff47, 0.08);
    sky.fillCircle(48, 92, 70);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, 0xf4f1ea, 0.05);
    for (let x = 0; x <= W; x += 32) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 32) grid.lineBetween(0, y, W, y);

    for (let i = 0; i < 42; i++) {
      const star = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        i % 7 === 0 ? 1.7 : 1.05,
        i % 5 === 0 ? 0x6ee7ff : 0xf4f1ea,
        0.18 + Math.random() * 0.45,
      );
      star.setDepth(2);
      this.stars.push({ g: star, vy: 18 + Math.random() * 46 });
    }
    for (let i = 0; i < 10; i++) {
      const mote = this.add.circle(
        Math.random() * W,
        Math.random() * H,
        1.6 + Math.random() * 2,
        i % 2 === 0 ? 0xe8ff47 : 0xff8bd1,
        0.16 + Math.random() * 0.2,
      );
      mote.setDepth(3);
      this.motes.push({ g: mote, vy: 28 + Math.random() * 40 });
    }

    const rails = this.add.graphics().setDepth(8);
    rails.fillStyle(0x10141c, 0.92);
    rails.fillRect(0, 0, 10, H);
    rails.fillRect(W - 10, 0, 10, H);
    rails.fillStyle(0xe8ff47, 0.55);
    rails.fillRect(8, 0, 2, H);
    rails.fillRect(W - 10, 0, 2, H);
    rails.fillStyle(0x6ee7ff, 0.18);
    rails.fillRect(0, 0, 6, H);
    rails.fillRect(W - 6, 0, 6, H);
  }

  private tickDecor(s: number): void {
    const play = this.phase === 'play';
    const drift = (play ? this.scrollSpeed() : 36) * s;
    for (const star of this.stars) {
      star.g.y += star.vy * s * (play ? 1.15 : 0.35);
      if (star.g.y > H + 4) {
        star.g.y = -4;
        star.g.x = Math.random() * W;
      }
    }
    for (const mote of this.motes) {
      mote.g.y += drift * 0.55;
      mote.g.x += Math.sin((mote.g.y + this.pulse * 40) * 0.04) * 0.3;
      if (mote.g.y > H + 6) {
        mote.g.y = -6;
        mote.g.x = Math.random() * W;
      }
    }
  }

  private spawnTrail(): void {
    if (this.time.now - this.lastTrail < 42) return;
    this.lastTrail = this.time.now;
    const hot = 0.4 + Math.sin(this.pulse * 40) * 0.12;
    for (const ox of [-8, 8]) {
      const dot = this.add.circle(this.px + ox, this.py + 24, 2.3, 0xe8ff47, hot).setDepth(18);
      this.tweens.add({
        targets: dot,
        y: this.py + 58,
        alpha: 0,
        scale: 0.18,
        duration: 220,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private showHint(): void {
    const hint = document.getElementById('play-hint');
    if (hint) hint.hidden = false;
  }

  private hideHint(): void {
    const hint = document.getElementById('play-hint');
    if (hint) hint.hidden = true;
  }

  private gameOver(): void {
    if (this.phase !== 'play') return;
    this.phase = 'over';
    this.holdingFire = false;
    this.setFirePad(false);
    this.hideHint();
    const prevBest = this.best;
    saveJumpBest(this.score);
    this.best = loadJumpBest();
    this.syncHud();
    this.tweens.killTweensOf(this.cameras.main);
    this.cameras.main.setZoom(1);
    squashTo(this, this.rig.root, 1.24, 0.68, 160);
    this.cameras.main.shake(160, 0.012);
    burstDots(this, this.px, this.py, 0xff8bd1, 12);
    screenWash(this, 0xff8bd1, 0.2, 280);
    sfxLand();
    sfxOver();
    el('over-score').textContent =
      `Puntos ${this.score} · Distancia ${this.dist} · Bajas ${this.kills} · Mejor ${this.best}`;
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
      chip.textContent = '';
      chip.dataset.kind = 'craft';
      chip.classList.add('jump-chip');
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = 'PULSO';
  }
}
