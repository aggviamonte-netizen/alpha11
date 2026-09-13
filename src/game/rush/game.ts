import {
  ACESFilmicToneMapping,
  Clock,
  Color,
  PerspectiveCamera,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { el } from '../dom';
import { loadRushBest, saveRushBest } from '../rushScore';
import { sfxBoost, sfxCore, sfxJump, sfxLand, sfxOrbit, sfxOver, unlockSfx } from '../sfx';
import { createBlok, poseBlok, type BlokRig } from './blok';
import { RushFx } from './fx';
import { RushInput } from './input';
import { C } from './palette';
import { Quality } from './quality';
import { RushTrack, TRACK_W } from './track';
import { RushWorld } from './world';

const GRAV = 32;
const JUMP_V = 11.2;
const CUT = 0.42;
const COYOTE = 0.1;
const BUFFER = 0.09;
const BASE = 11.2;
const MAX_SPEED = 26;
const BOOST = 7.2;
const STEER_ACC = 28;
const LAT_MAX = TRACK_W * 0.42;
const LOOP_MIN = 15.5;
const HEIGHT_OFF = 0.02;

type Phase = 'start' | 'play' | 'over';

let skipStart = false;

export function startRushGame(parent: string | HTMLElement): RushGame {
  const host = typeof parent === 'string' ? el(parent) : parent;
  const game = new RushGame(host);
  game.mount();
  return game;
}

export class RushGame {
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly clock = new Clock();
  private readonly quality = new Quality();
  private readonly input = new RushInput();
  private readonly fx = new RushFx();
  private readonly camPos = new Vector3(0, 3.2, -8);
  private readonly camLook = new Vector3(0, 1.2, 6);
  private readonly tmp = new Vector3();
  private readonly worldUp = new Vector3(0, 1, 0);

  private track: RushTrack;
  private world: RushWorld;
  private rig: BlokRig;
  private phase: Phase = 'start';
  private score = 0;
  private bonus = 0;
  private best = 0;
  private cores = 0;
  private s = 4;
  private lateral = 0;
  private vl = 0;
  private vs = BASE;
  private height = HEIGHT_OFF;
  private vh = 0;
  private grounded = true;
  private holding = false;
  private coyote = 0;
  private buffer = 0;
  private boostT = 0;
  private looping = false;
  private loopA = 0;
  private loopR = 6.2;
  private loopExit = 0;
  private loopOrigin = new Vector3();
  private loopFwd = new Vector3();
  private loopNrm = new Vector3();
  private run = 0;
  private pulse = 0;
  private hintShown = false;
  private shake = 0;
  private squash = 1;
  private dead = false;
  private host: HTMLElement;
  private stage: HTMLElement;

  constructor(host: HTMLElement) {
    this.host = host;
    this.stage = host.closest('.stage') ?? host;
    this.camera = new PerspectiveCamera(54, 390 / 844, 0.12, 180);
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(new Color(C.fog), 1);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';

    this.track = new RushTrack(this.scene);
    this.world = new RushWorld(this.scene);
    this.rig = createBlok();
    this.scene.add(this.rig.root);
    this.scene.add(this.fx.root);

    this.quality.onChange((tier) => this.applyQuality(tier));
  }

  mount(): void {
    this.host.innerHTML = '';
    this.host.appendChild(this.renderer.domElement);
    this.resize();
    this.track.seed();
    this.track.spawnAhead(this.s, 0);
    this.resetStats();
    this.best = loadRushBest();
    this.bindUi();
    this.fx.bindDom(el('rush-wash'), el('rush-floats'));
    this.syncHud();
    this.placeHero();
    this.world.sync(this.track, this.rig.root.position, false);

    if (skipStart) {
      skipStart = false;
      this.beginPlay();
    } else {
      el('overlay-start').hidden = false;
      el('overlay-over').hidden = true;
    }

    const vis = () => {
      this.clock.getDelta();
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('resize', () => this.resize());

    const loop = () => {
      requestAnimationFrame(loop);
      this.tick();
    };
    this.clock.start();
    loop();
  }

  private applyQuality(tier: number): void {
    this.renderer.setPixelRatio(this.quality.dpr);
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.world.setShadows(this.quality.shadows);
    this.world.setDensity(this.quality.city);
    this.fx.setRate(this.quality.particles);
    this.renderer.toneMappingExposure = tier === 0 ? 0.98 : 1.08;
  }

  private bindUi(): void {
    const jump = el('btn-jump');
    const boost = el('btn-boost');
    this.input.attach(this.stage, jump, boost);
    el('overlay-start').onclick = () => this.beginPlay();
    el('retry').onclick = () => {
      skipStart = true;
      this.restart();
    };
  }

  private restart(): void {
    this.track.dispose();
    this.track = new RushTrack(this.scene);
    this.track.seed();
    this.resetStats();
    this.dead = false;
    this.phase = 'start';
    this.looping = false;
    this.placeHero();
    this.track.spawnAhead(this.s, 0);
    el('overlay-over').hidden = true;
    el<HTMLElement>('rush-controls').hidden = true;
    const hint = document.getElementById('drop-hint');
    if (hint) hint.hidden = true;
    this.hintShown = false;
    this.syncHud();
    if (skipStart) {
      skipStart = false;
      this.beginPlay();
    } else {
      el('overlay-start').hidden = false;
    }
  }

  private resetStats(): void {
    this.score = 0;
    this.bonus = 0;
    this.cores = 0;
    this.s = 4;
    this.lateral = 0;
    this.vl = 0;
    this.vs = BASE;
    this.height = HEIGHT_OFF;
    this.vh = 0;
    this.grounded = true;
    this.holding = false;
    this.coyote = 0;
    this.buffer = 0;
    this.boostT = 0;
    this.run = 0;
    this.pulse = 0;
    this.shake = 0;
    this.squash = 1;
  }

  private beginPlay(): void {
    if (this.phase === 'play') return;
    unlockSfx();
    el('overlay-start').hidden = true;
    el('overlay-start').onclick = null;
    el<HTMLElement>('rush-controls').hidden = false;
    this.phase = 'play';
    this.score = 0;
    this.bonus = 0;
    this.cores = 0;
    this.syncHud();
    this.showHint();
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.033);
    this.quality.tick(dt);
    this.pulse += dt;
    this.shake = Math.max(0, this.shake - dt * 4);
    this.squash += (1 - this.squash) * Math.min(1, dt * 10);

    if (this.phase === 'play') {
      this.tickPlay(dt);
    } else {
      this.height = HEIGHT_OFF + Math.sin(this.pulse * 2.2) * 0.03;
      this.run += dt * 2.4;
      poseBlok(this.rig, this.run, true, 0, false);
    }

    this.animateCores(dt);
    this.placeHero();
    this.updateCamera(dt);
    this.world.sync(this.track, this.rig.root.position, this.boostT > 0);
    this.world.tickMotes(dt, this.rig.root.position, this.phase === 'play' ? this.speed() : 4);
    this.fx.tick(dt);
    if (this.phase === 'play') {
      this.fx.streaksTick(this.rig.root.position, this.track.frameAt(this.s).tangent, this.boostT > 0, true);
    }
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  private tickPlay(dt: number): void {
    if (this.input.jumpPressed) this.wantJump();
    this.holding = this.input.jumpHeld;

    if (this.input.boostHeld) this.boostT = Math.max(this.boostT, 0.16);

    if (this.looping) this.tickLoop(dt);
    else this.tickRun(dt);

    this.track.spawnAhead(this.s, Math.min(1, this.s / 420));
    this.track.recycle(this.s);
    this.collect();
    if (!this.looping) this.hazards();

    const next = Math.floor(this.s * 1.28) + this.bonus;
    if (next !== this.score) {
      this.score = next;
      this.syncHud();
    }
  }

  private speed(): number {
    const grow = Math.min(9.5, this.s * 0.012);
    const turbo = this.boostT > 0 ? BOOST : 0;
    return Math.min(MAX_SPEED, BASE + grow + turbo);
  }

  private wantJump(): void {
    if (this.phase !== 'play' || this.looping) return;
    this.holding = true;
    this.buffer = BUFFER;
    this.tryJump();
  }

  private tryJump(): void {
    if (this.looping) return;
    const can = this.grounded || this.coyote > 0;
    if (!can || this.buffer <= 0) return;
    this.vh = JUMP_V;
    this.grounded = false;
    this.coyote = 0;
    this.buffer = 0;
    this.height = Math.max(this.height, HEIGHT_OFF + 0.05);
    this.hideHint();
    this.squash = 0.78;
    sfxJump();
    this.fx.burst(this.rig.root.position, 'lime', 7);
  }

  private tickRun(dt: number): void {
    this.boostT = Math.max(0, this.boostT - dt);
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    if (this.buffer > 0) this.tryJump();

    const frame = this.track.frameAt(this.s);
    this.vs = this.speed();
    this.vs += -GRAV * frame.pitch * dt * 0.55;

    this.vl += this.input.steer * STEER_ACC * dt;
    this.vl *= Math.pow(0.08, dt);
    this.lateral += this.vl * dt;
    if (this.lateral > LAT_MAX) {
      this.lateral = LAT_MAX;
      this.vl *= -0.2;
    } else if (this.lateral < -LAT_MAX) {
      this.lateral = -LAT_MAX;
      this.vl *= -0.2;
    }

    if (this.grounded) {
      this.height = HEIGHT_OFF;
      this.vh = 0;
      this.s += this.vs * dt;
      const lip = frame.pitch > 0.38 && this.track.frameAt(this.s + 1.2).pitch < frame.pitch - 0.12;
      if (lip) {
        this.grounded = false;
        this.vh = Math.max(4.5, this.vs * Math.sin(frame.pitch) * 0.85);
        this.height = HEIGHT_OFF + 0.08;
      } else if (!this.track.hasSurface(this.s, this.lateral)) {
        this.grounded = false;
        this.vh = 0.4;
      }
    } else {
      if (!this.holding && this.vh > 0) this.vh *= Math.pow(CUT, dt * 8);
      this.vh -= GRAV * dt;
      this.height += this.vh * dt;
      this.s += this.vs * dt;
      const on = this.track.hasSurface(this.s, this.lateral);
      if (on && this.height <= HEIGHT_OFF && this.vh <= 0) {
        this.height = HEIGHT_OFF;
        this.vh = 0;
        if (!this.grounded) {
          this.squash = 0.72;
          this.shake = 0.18;
          sfxLand();
          this.fx.burst(this.rig.root.position, 'orange', 6);
        }
        this.grounded = true;
        this.coyote = COYOTE;
      } else if (this.height < -7) {
        this.gameOver();
        return;
      }
    }

    for (const p of this.track.propsNear('pad', this.s, 1.4)) {
      if (this.grounded && Math.abs(p.lateral - this.lateral) < 1.3) {
        p.taken = true;
        this.boost(1.2);
        this.addBonus(25, 'TURBO');
        sfxBoost();
      }
    }
    for (const p of this.track.propsNear('zone', this.s, 2.2)) {
      if (this.grounded && this.s >= p.s && this.s <= (p.s1 ?? p.s)) this.boostT = Math.max(this.boostT, 0.28);
    }
    for (const p of this.track.propsNear('loop', this.s, 2.4)) {
      if (this.grounded && this.speed() >= LOOP_MIN && this.s >= p.s - 0.4) {
        p.taken = true;
        this.enterLoop(p);
        sfxOrbit();
      }
    }

    this.run += dt * (this.grounded ? this.vs * 1.15 : 2.2);
    poseBlok(this.rig, this.run, this.grounded, this.vh, this.boostT > 0);
    if (Math.random() < (this.boostT > 0 ? 0.9 : 0.35)) {
      this.fx.drip(this.rig.root.position.clone().add(this.tmp.set(0, 0.2, -0.3)), this.boostT > 0);
    }
  }

  private enterLoop(p: { s: number; radius?: number }): void {
    const f = this.track.frameAt(p.s);
    this.looping = true;
    this.loopA = 0;
    this.loopR = p.radius ?? 6.2;
    this.loopExit = p.s + this.loopR * 2 + 2;
    this.loopOrigin.copy(f.pos).addScaledVector(f.tangent, this.loopR).addScaledVector(f.normal, this.loopR);
    this.loopFwd.copy(f.tangent);
    this.loopNrm.copy(f.normal);
  }

  private tickLoop(dt: number): void {
    this.loopA += (this.speed() * 1.18 * dt) / this.loopR;
    this.height = HEIGHT_OFF;
    this.grounded = false;
    this.run += dt * 10;
    poseBlok(this.rig, this.run, false, -8, true);
    if (this.loopA >= Math.PI * 2) {
      this.looping = false;
      this.s = this.loopExit;
      this.height = HEIGHT_OFF;
      this.vh = 0;
      this.grounded = true;
      this.boost(1.5);
      this.addBonus(50, 'ÓRBITA', true);
      sfxOrbit();
      this.fx.burst(this.rig.root.position, 'cyan', 14);
      this.shake = 0.28;
    }
  }

  private collect(): void {
    for (const p of this.track.propsNear('core', this.s, 1.8)) {
      if (Math.abs(p.lateral - this.lateral) > 2.1) continue;
      const dist = Math.abs(p.s - this.s) + Math.abs(p.lateral - this.lateral) * 0.45;
      if (dist > 1.55 && this.height < 2.8) continue;
      p.taken = true;
      p.mesh.visible = false;
      this.cores += 1;
      this.addBonus(10, '+10');
      sfxCore();
      this.fx.burst(p.mesh.position, 'lime', 8);
    }
  }

  private hazards(): void {
    for (const p of this.track.propsNear('spike', this.s, 1.05)) {
      if (!this.grounded) continue;
      if (Math.abs(p.lateral - this.lateral) < 0.72 && this.height < 0.7) {
        this.gameOver();
        return;
      }
    }
    for (const p of this.track.propsNear('beam', this.s, 1.15)) {
      if (this.height < 1.15 && Math.abs(this.lateral - p.lateral) < 1.35) {
        this.gameOver();
        return;
      }
    }
  }

  private placeHero(): void {
    if (this.looping) {
      const a = this.loopA;
      const pos = this.loopOrigin
        .clone()
        .addScaledVector(this.loopNrm, -this.loopR * Math.cos(a))
        .addScaledVector(this.loopFwd, this.loopR * Math.sin(a));
      this.rig.root.position.copy(pos);
      const tan = this.loopFwd.clone().multiplyScalar(Math.cos(a)).addScaledVector(this.loopNrm, Math.sin(a));
      const nrm = this.loopNrm.clone().multiplyScalar(Math.cos(a)).addScaledVector(this.loopFwd, -Math.sin(a));
      this.rig.root.up.copy(nrm);
      this.rig.root.lookAt(pos.clone().add(tan));
      this.rig.root.scale.set(1, this.squash, 1);
      return;
    }
    const f = this.track.frameAt(this.s);
    const pos = f.pos.clone().addScaledVector(f.binormal, this.lateral).addScaledVector(f.normal, 0.02 + this.height);
    this.rig.root.position.copy(pos);
    const up = this.grounded ? f.normal : this.tmp.copy(f.normal).lerp(this.worldUp, 0.55).normalize();
    this.rig.root.up.copy(up);
    this.rig.root.lookAt(pos.clone().add(f.tangent));
    this.rig.root.scale.setScalar(this.squash);
  }

  private updateCamera(dt: number): void {
    const f = this.track.frameAt(this.s);
    const speed = this.phase === 'play' ? this.speed() : 6;
    const back = 6.4 - Math.min(1.4, speed * 0.04);
    const lift = 2.35 + (this.looping ? 0.6 : 0);
    const lookAhead = 8 + speed * 0.22;
    let target: Vector3;
    let look: Vector3;
    if (this.looping) {
      const pos = this.rig.root.position;
      const tan = this.loopFwd.clone().multiplyScalar(Math.cos(this.loopA)).addScaledVector(this.loopNrm, Math.sin(this.loopA));
      target = pos.clone().addScaledVector(tan, -5.2).addScaledVector(this.loopNrm, 2.2);
      look = pos.clone().addScaledVector(tan, 6);
    } else if (this.phase === 'start') {
      target = this.rig.root.position.clone().add(this.tmp.set(3.4, 2.1, -5.6));
      look = this.rig.root.position.clone().add(new Vector3(0.2, 0.7, 1.4));
    } else {
      target = f.pos
        .clone()
        .addScaledVector(f.tangent, -back)
        .addScaledVector(f.normal, lift)
        .addScaledVector(f.binormal, this.lateral * 0.22);
      look = f.pos
        .clone()
        .addScaledVector(f.tangent, lookAhead)
        .addScaledVector(f.normal, 0.9)
        .addScaledVector(f.binormal, this.lateral * 0.35);
    }
    const k = 1 - Math.pow(0.0008, dt);
    this.camPos.lerp(target, Math.min(1, k * (this.phase === 'start' ? 0.45 : 1)));
    this.camLook.lerp(look, Math.min(1, k));
    if (this.shake > 0) {
      this.camPos.x += (Math.random() - 0.5) * this.shake * 0.35;
      this.camPos.y += (Math.random() - 0.5) * this.shake * 0.2;
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    const fov = 52 + Math.min(12, speed * 0.35) + (this.boostT > 0 ? 6 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = this.camera.fov + (fov - this.camera.fov) * 0.08;
      this.camera.updateProjectionMatrix();
    }
  }

  private boost(sec: number): void {
    this.boostT = Math.max(this.boostT, sec);
    this.fx.flash('lime');
    this.shake = Math.max(this.shake, 0.16);
    this.syncHud();
  }

  private addBonus(n: number, label: string, big = false): void {
    this.bonus += n;
    this.fx.float(label, big);
    this.syncHud();
  }

  private gameOver(): void {
    if (this.phase !== 'play' || this.dead) return;
    this.dead = true;
    this.phase = 'over';
    this.looping = false;
    this.holding = false;
    const prevBest = this.best;
    saveRushBest(this.score);
    this.best = loadRushBest();
    this.syncHud();
    this.squash = 0.62;
    this.shake = 0.45;
    this.fx.burst(this.rig.root.position, 'orange', 12);
    this.fx.flash('red');
    sfxLand();
    sfxOver();
    el('over-score').textContent = `Puntos ${this.score} · Mejor ${this.best}`;
    const rec = document.getElementById('over-record');
    if (rec) rec.hidden = !(this.score > 0 && this.score >= this.best && this.score > prevBest);
    el<HTMLElement>('rush-controls').hidden = true;
    this.hideHint();
    window.setTimeout(() => {
      el('overlay-over').hidden = false;
    }, 140);
  }

  private syncHud(): void {
    el('score').textContent = String(this.score);
    el('best').textContent = String(this.best);
    const chip = document.getElementById('next-chip');
    if (chip) {
      chip.style.background = this.boostT > 0 ? '#FF9A3C' : '#E8FF47';
      chip.textContent = this.boostT > 0 ? '⚡' : '🙂';
      chip.dataset.kind = 'circle';
    }
    const code = document.getElementById('next-code');
    if (code) code.textContent = 'BLOK';
    const nuc = document.getElementById('rush-cores');
    if (nuc) nuc.textContent = String(this.cores);
    this.stage.classList.toggle('is-boost', this.boostT > 0 && this.phase === 'play');
  }

  private showHint(): void {
    if (this.hintShown) return;
    const hint = document.getElementById('drop-hint');
    if (!hint) return;
    hint.hidden = false;
    this.hintShown = true;
  }

  private hideHint(): void {
    const hint = document.getElementById('drop-hint');
    if (hint) hint.hidden = true;
  }

  private animateCores(dt: number): void {
    for (const p of this.track.props) {
      if (p.kind !== 'core' || p.taken) continue;
      p.mesh.rotation.y += dt * 2.4;
      p.mesh.position.y += Math.sin(this.pulse * 3 + p.s) * 0.004;
    }
  }

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth || 390);
    const h = Math.max(1, this.host.clientHeight || 844);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.quality.dpr);
    this.renderer.setSize(w, h, false);
  }
}
