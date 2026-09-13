/**
 * Vertical shooter adapted from BodhiProtocol/space-shooter (MIT).
 * UI name: SPACE.
 */

import { loadBest, saveBest } from '../persist';

type Mode = 'kids' | 'adult';
type Star = { x: number; y: number; s: number; sp: number };
type Ship = { x: number; y: number; fireT: number };
type Shot = { x: number; y: number; vx: number; vy: number };
type EnemyKind = 'grunt' | 'zigzag' | 'tank';
type Enemy = {
  x: number;
  y: number;
  type: EnemyKind;
  hp: number;
  maxHP: number;
  vy: number;
  ph: number;
  fT: number;
  r: number;
};
type Boss = {
  x: number;
  y: number;
  hp: number;
  maxHP: number;
  vy: number;
  dx: number;
  fT: number;
  phase: number;
  ready: boolean;
};
type Power = { x: number; y: number; type: 'rapid' | 'shield' | 'spread' };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const BEST_KEY = 'alpha11_space_best';

export function startSpace(): void {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const wrap = document.getElementById('wrap');
  const overlay = document.getElementById('ov');
  const scoreNode = document.getElementById('hScore');
  const waveNode = document.getElementById('hWave');
  const bestNode = document.getElementById('best');
  if (!canvas || !wrap || !overlay) return;
  const screen = overlay;
  const ctx = canvas.getContext('2d')!;
  if (bestNode) bestNode.textContent = String(loadBest(BEST_KEY));

  let CW = 360;
  let CH = 560;
  let mode: Mode = 'adult';
  let running = false;
  let raf = 0;
  let stars: Star[] = [];
  let player: Ship = { x: 0, y: 0, fireT: 0 };
  let bullets: Shot[] = [];
  let enemies: Enemy[] = [];
  let eBullets: Shot[] = [];
  let powerups: Power[] = [];
  let particles: Spark[] = [];
  let boss: Boss | null = null;
  let wave = 1;
  let score = 0;
  let queue: { type: EnemyKind; spd: number }[] = [];
  let spawnCd = 0;
  let wavePhase = 'enemies';
  let waveDelay = 0;
  let rapidT = 0;
  let spreadT = 0;
  let shieldT = 0;
  const keys: Record<string, boolean> = {};
  let touchX: number | null = null;
  let audio: AudioContext | null = null;

  const AudioCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  const ac = (): AudioContext | null => {
    if (!AudioCtor) return null;
    if (!audio) audio = new AudioCtor();
    return audio;
  };

  const snd = (fn: (ctx: AudioContext) => void): void => {
    const a = ac();
    if (!a) return;
    try {
      fn(a);
    } catch {
      /* ignore */
    }
  };

  const playLaser = (): void =>
    snd((a) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.connect(g);
      g.connect(a.destination);
      o.frequency.setValueAtTime(900, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(300, a.currentTime + 0.08);
      g.gain.setValueAtTime(0.12, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.08);
      o.start();
      o.stop(a.currentTime + 0.08);
    });

  const playExplode = (big = false): void =>
    snd((a) => {
      const len = big ? 0.5 : 0.18;
      const buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      src.buffer = buf;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = big ? 160 : 280;
      const g = a.createGain();
      src.connect(f);
      f.connect(g);
      g.connect(a.destination);
      g.gain.setValueAtTime(big ? 0.7 : 0.35, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + len);
      src.start();
      src.stop(a.currentTime + len);
    });

  const playPowerUp = (): void =>
    snd((a) => {
      [400, 600, 800, 1000].forEach((f, i) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.connect(g);
        g.connect(a.destination);
        o.frequency.value = f;
        o.type = 'sine';
        const t = a.currentTime + i * 0.07;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t);
        o.stop(t + 0.1);
      });
    });

  const playBossHit = (): void =>
    snd((a) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.connect(g);
      g.connect(a.destination);
      o.frequency.value = 120;
      o.type = 'sawtooth';
      g.gain.setValueAtTime(0.3, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.12);
      o.start();
      o.stop(a.currentTime + 0.12);
    });

  const playBossDeath = (): void =>
    snd((a) => {
      [180, 140, 100, 70].forEach((f, i) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.connect(g);
        g.connect(a.destination);
        o.type = 'sawtooth';
        const t = a.currentTime + i * 0.13;
        o.frequency.setValueAtTime(f * 2, t);
        o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.35);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.start(t);
        o.stop(t + 0.35);
      });
    });

  const resize = (): void => {
    CW = Math.min(wrap.clientWidth, 390);
    CH = Math.min(wrap.clientHeight, 620);
    canvas.width = CW;
    canvas.height = CH;
  };

  const splat = (x: number, y: number, color: string, n: number): void => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      const sp = Math.random() * 3 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 20 + Math.random() * 10,
        color,
      });
    }
  };

  const showOv = (title: string, sub: string): void => {
    screen.hidden = false;
    screen.innerHTML = `<div class="panel"><p class="eyebrow">ALPHA-11 SPACE</p><p class="fin">${title}</p><p class="over-score">${sub}</p><button type="button" id="retry">REINTENTAR</button></div>`;
    document.getElementById('retry')?.addEventListener('click', startGame);
  };

  const startWave = (): void => {
    queue = [];
    spawnCd = 0;
    waveDelay = 0;
    const isBoss = wave % 3 === 0;
    if (isBoss) {
      wavePhase = 'boss_entry';
      spawnCd = 80;
    } else {
      wavePhase = 'enemies';
      const spd = mode === 'kids' ? 0.65 : 1;
      const g = Math.min(3 + wave, 10);
      const z = wave >= 2 ? Math.min(wave - 1, 6) : 0;
      const t = wave >= 4 ? Math.min(Math.trunc(wave / 2), 4) : 0;
      for (let i = 0; i < g; i++) queue.push({ type: 'grunt', spd });
      for (let i = 0; i < z; i++) queue.push({ type: 'zigzag', spd });
      for (let i = 0; i < t; i++) queue.push({ type: 'tank', spd });
      queue.sort(() => Math.random() - 0.5);
    }
    if (waveNode) waveNode.textContent = String(wave);
  };

  const spawnE = (cfg: { type: EnemyKind; spd: number }): void => {
    const x = Math.random() * (CW - 60) + 30;
    const { type, spd } = cfg;
    if (type === 'grunt') enemies.push({ x, y: -20, type, hp: 2, maxHP: 2, vy: 1.2 * spd, ph: 0, fT: 80 + Math.trunc(Math.random() * 60), r: 14 });
    if (type === 'zigzag') enemies.push({ x, y: -20, type, hp: 1, maxHP: 1, vy: 1.9 * spd, ph: Math.random() * 6.28, fT: 0, r: 12 });
    if (type === 'tank') enemies.push({ x, y: -30, type, hp: 5, maxHP: 5, vy: 0.65 * spd, ph: 0, fT: 50 + Math.trunc(Math.random() * 40), r: 20 });
  };

  const spawnBoss = (): void => {
    const s = mode === 'kids' ? 0.6 : 1;
    boss = { x: CW / 2, y: -60, hp: 25 + wave * 4, maxHP: 25 + wave * 4, vy: 0.5 * s, dx: 1.8 * s, fT: 0, phase: 1, ready: false };
    wavePhase = 'boss';
  };

  const shootAt = (x: number, y: number, spd: number): void => {
    const dx = player.x - x;
    const dy = player.y - y;
    const l = Math.hypot(dx, dy) || 1;
    eBullets.push({ x, y, vx: (dx / l) * spd, vy: (dy / l) * spd });
  };

  const hitPlayer = (): void => {
    playExplode();
    splat(player.x, player.y, '#4a90e2', 16);
    if (mode === 'adult') {
      running = false;
      const best = saveBest(BEST_KEY, score);
      if (bestNode) bestNode.textContent = String(best);
      window.setTimeout(() => showOv('FIN', `${score} · mejor ${best}`), 600);
    } else {
      shieldT = 180;
    }
  };

  const update = (dt: number): void => {
    stars.forEach((s) => {
      s.y += s.sp * dt * 0.5;
      if (s.y > CH) s.y = 0;
    });
    if (keys.ArrowLeft || keys.a || keys.A) player.x = Math.max(20, player.x - 3.5 * dt);
    if (keys.ArrowRight || keys.d || keys.D) player.x = Math.min(CW - 20, player.x + 3.5 * dt);
    player.fireT -= dt;
    if (player.fireT <= 0) {
      player.fireT = rapidT > 0 ? 6 : 18;
      playLaser();
      if (spreadT > 0) {
        bullets.push({ x: player.x, y: player.y - 20, vx: -2, vy: -9 });
        bullets.push({ x: player.x, y: player.y - 20, vx: 0, vy: -9 });
        bullets.push({ x: player.x, y: player.y - 20, vx: 2, vy: -9 });
      } else {
        bullets.push({ x: player.x, y: player.y - 20, vx: 0, vy: -9 });
      }
    }
    if (rapidT > 0) rapidT -= dt;
    if (spreadT > 0) spreadT -= dt;
    if (shieldT > 0 && shieldT < 9999) shieldT -= dt;
    if (mode === 'kids' && shieldT <= 0) shieldT = 9999;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -10) bullets.splice(i, 1);
    }
    if (mode !== 'kids') {
      for (let i = eBullets.length - 1; i >= 0; i--) {
        const b = eBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y > CH + 10 || b.x < -10 || b.x > CW + 10) eBullets.splice(i, 1);
      }
    }
    if (wavePhase === 'enemies' && queue.length > 0) {
      spawnCd -= dt;
      if (spawnCd <= 0) {
        const next = queue.shift();
        if (next) spawnE(next);
        spawnCd = 38;
      }
    }
    if (wavePhase === 'boss_entry') {
      spawnCd -= dt;
      if (spawnCd <= 0) spawnBoss();
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.vy * dt;
      if (e.type === 'zigzag') {
        e.ph += 0.06 * dt;
        e.x += Math.sin(e.ph) * 2.5 * dt;
        e.x = Math.max(e.r, Math.min(CW - e.r, e.x));
      }
      if (mode !== 'kids' && e.type !== 'zigzag') {
        e.fT -= dt;
        if (e.fT <= 0) {
          e.fT = 60 + Math.trunc(Math.random() * 40);
          shootAt(e.x, e.y, 3);
        }
      }
      if (e.y > CH + 40) enemies.splice(i, 1);
    }
    if (boss) {
      if (!boss.ready) {
        boss.y += boss.vy * dt;
        if (boss.y >= 80) {
          boss.y = 80;
          boss.ready = true;
        }
      } else {
        boss.x += boss.dx * dt;
        if (boss.x > CW - 55 || boss.x < 55) boss.dx *= -1;
        if (boss.hp < boss.maxHP * 0.5 && boss.phase === 1) {
          boss.phase = 2;
          boss.dx *= 1.5;
        }
        boss.fT -= dt;
        if (boss.fT <= 0) {
          boss.fT = boss.phase === 2 ? 45 : 65;
          const shots = boss.phase === 2 ? 5 : 3;
          if (mode !== 'kids' || boss.phase === 1) {
            for (let i = 0; i < shots; i++) {
              const a = -Math.PI / 2 + (i - (shots - 1) / 2) * 0.36;
              eBullets.push({ x: boss.x, y: boss.y + 32, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 });
            }
          }
        }
      }
    }
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      let hit = false;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
          e.hp -= 1;
          splat(e.x, e.y, '#ff6080', 6);
          hit = true;
          if (e.hp <= 0) {
            playExplode();
            splat(e.x, e.y, '#ff6080', 14);
            score += e.type === 'tank' ? 300 : e.type === 'zigzag' ? 200 : 100;
            if (Math.random() < 0.28) {
              powerups.push({
                x: e.x,
                y: e.y,
                type: (['rapid', 'shield', 'spread'] as const)[Math.trunc(Math.random() * 3)],
              });
            }
            enemies.splice(ei, 1);
          }
          break;
        }
      }
      if (hit) {
        bullets.splice(bi, 1);
        continue;
      }
      if (boss && boss.ready && Math.hypot(b.x - boss.x, b.y - boss.y) < 46) {
        boss.hp -= 1;
        playBossHit();
        splat(boss.x, boss.y, '#c060f0', 5);
        bullets.splice(bi, 1);
        if (boss.hp <= 0) {
          playBossDeath();
          splat(boss.x, boss.y, '#c060f0', 30);
          score += 2000;
          boss = null;
          wavePhase = 'done';
          waveDelay = 130;
        }
      }
    }
    for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      if (Math.hypot(b.x - player.x, b.y - player.y) < 18) {
        eBullets.splice(i, 1);
        if (shieldT > 0) {
          shieldT = 0;
          splat(player.x, player.y, '#4a90e2', 8);
        } else {
          hitPlayer();
          if (!running) return;
        }
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + 16) {
        if (shieldT > 0) {
          shieldT = 0;
          splat(player.x, player.y, '#4a90e2', 8);
          enemies.splice(i, 1);
        } else {
          hitPlayer();
          if (!running) return;
        }
      }
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += 1.4 * dt;
      if (Math.hypot(p.x - player.x, p.y - player.y) < 24) {
        playPowerUp();
        if (p.type === 'rapid') rapidT = 600;
        if (p.type === 'shield') shieldT = 300;
        if (p.type === 'spread') spreadT = 600;
        powerups.splice(i, 1);
      } else if (p.y > CH + 20) powerups.splice(i, 1);
    }
    particles = particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
    if (wavePhase === 'enemies' && queue.length === 0 && enemies.length === 0) {
      wavePhase = 'done';
      waveDelay = 90;
    }
    if (wavePhase === 'boss' && !boss) {
      wavePhase = 'done';
      waveDelay = 130;
    }
    if (wavePhase === 'done') {
      waveDelay -= dt;
      if (waveDelay <= 0) {
        wave += 1;
        startWave();
      }
    }
    if (scoreNode) scoreNode.textContent = String(score);
  };

  const render = (): void => {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, CW, CH);
    stars.forEach((s) => {
      ctx.fillStyle = `rgba(180,200,255,${0.15 + s.s * 0.15})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    ctx.font = '18px Outfit, system-ui';
    ctx.textAlign = 'center';
    powerups.forEach((p) => ctx.fillText(p.type === 'rapid' ? '⚡' : p.type === 'shield' ? '🛡' : '💥', p.x, p.y + 6));
    enemies.forEach((e) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.type === 'grunt') {
        ctx.fillStyle = '#e24a6a';
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(-14, -9);
        ctx.lineTo(0, -4);
        ctx.lineTo(14, -9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff90a0';
        ctx.beginPath();
        ctx.arc(0, 4, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'zigzag') {
        ctx.fillStyle = '#f7c948';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff8a0';
        ctx.beginPath();
        ctx.arc(-3, -3, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#4ae2a0';
        ctx.fillRect(-20, -20, 40, 40);
        ctx.fillStyle = '#a0fff0';
        ctx.fillRect(-14, -14, 28, 28);
        ctx.fillStyle = '#1a3a2a';
        ctx.fillRect(-20, 22, 40, 4);
        ctx.fillStyle = '#4ae2a0';
        ctx.fillRect(-20, 22, 40 * (e.hp / e.maxHP), 4);
      }
      ctx.restore();
    });
    if (boss) {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.fillStyle = '#c060f0';
      ctx.beginPath();
      ctx.moveTo(0, 34);
      ctx.lineTo(-46, -12);
      ctx.lineTo(-24, -34);
      ctx.lineTo(0, -22);
      ctx.lineTo(24, -34);
      ctx.lineTo(46, -12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e090ff';
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(-20, -8);
      ctx.lineTo(0, -18);
      ctx.lineTo(20, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff3060';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (boss.ready) {
        ctx.fillStyle = '#1a0a2a';
        ctx.fillRect(CW / 2 - 80, 8, 160, 10);
        const pct = boss.hp / boss.maxHP;
        ctx.fillStyle = pct > 0.5 ? '#c060f0' : '#ff4080';
        ctx.fillRect(CW / 2 - 80, 8, 160 * pct, 10);
        ctx.fillStyle = '#8040c0';
        ctx.font = '9px Outfit, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('JEFE', CW / 2, 7);
      }
    }
    ctx.fillStyle = '#ff4060';
    eBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 5, 4, 10));
    ctx.fillStyle = '#80d0ff';
    bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 8, 4, 14));
    if (shieldT > 0) {
      ctx.strokeStyle = `rgba(74,144,226,${Math.min(shieldT / 60, 0.65)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = '#4a90e2';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-14, 12);
    ctx.lineTo(0, 7);
    ctx.lineTo(14, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a0c8ff';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-6, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff6030';
    ctx.fillRect(-5, 12, 3, 7);
    ctx.fillRect(2, 12, 3, 7);
    ctx.restore();
    let ix = 8;
    ctx.font = '14px Outfit, system-ui';
    ctx.textAlign = 'left';
    if (rapidT > 0) {
      ctx.fillText('⚡', ix, CH - 10);
      ix += 22;
    }
    if (spreadT > 0) {
      ctx.fillText('💥', ix, CH - 10);
      ix += 22;
    }
    if (shieldT > 0 && shieldT < 9000) ctx.fillText('🛡', ix, CH - 10);
    if (wavePhase === 'done' && waveDelay > 60) {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, CH / 2 - 24, CW, 44);
      ctx.fillStyle = '#e8ff47';
      ctx.font = '20px Outfit, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Oleada ${wave} lista`, CW / 2, CH / 2 + 6);
    }
  };

  function startGame(): void {
    screen.hidden = true;
    screen.innerHTML = '';
    ac()?.resume();
    stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * CW,
      y: Math.random() * CH,
      s: Math.random() * 1.5 + 0.3,
      sp: Math.random() + 0.3,
    }));
    player = { x: CW / 2, y: CH - 60, fireT: 0 };
    bullets = [];
    enemies = [];
    eBullets = [];
    powerups = [];
    particles = [];
    boss = null;
    wave = 1;
    score = 0;
    rapidT = 0;
    spreadT = 0;
    shieldT = mode === 'kids' ? 9999 : 0;
    startWave();
    running = true;
    cancelAnimationFrame(raf);
    let last = performance.now();
    const loop = (ts: number): void => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((ts - last) / 16.67, 3);
      last = ts;
      if (running) update(dt);
      render();
    };
    loop(performance.now());
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
  canvas.addEventListener(
    'touchstart',
    (e) => {
      touchX = e.touches[0].clientX;
      e.preventDefault();
    },
    { passive: false },
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (touchX !== null && player) {
        player.x = Math.max(20, Math.min(CW - 20, player.x + (e.touches[0].clientX - touchX)));
        touchX = e.touches[0].clientX;
      }
      e.preventDefault();
    },
    { passive: false },
  );
  canvas.addEventListener('touchend', () => {
    touchX = null;
  });

  document.getElementById('bK')?.addEventListener('click', () => {
    if (running) return;
    mode = 'kids';
    document.getElementById('bK')?.classList.add('active');
    document.getElementById('bA')?.classList.remove('active');
  });
  document.getElementById('bA')?.addEventListener('click', () => {
    if (running) return;
    mode = 'adult';
    document.getElementById('bA')?.classList.add('active');
    document.getElementById('bK')?.classList.remove('active');
  });
  document.getElementById('space-start')?.addEventListener('click', startGame);
}
