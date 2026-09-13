let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockSfx(): void {
  const c = ac();
  if (c?.state === 'suspended') void c.resume();
}

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const n = Math.floor(c.sampleRate * 0.22);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  at = 0,
  slide = 0,
): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(2400, freq * 4), t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function rustle(dur: number, gain: number, at = 0, hp = 400, lp = 1800): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const hi = c.createBiquadFilter();
  hi.type = 'highpass';
  hi.frequency.setValueAtTime(hp, t0);
  const lo = c.createBiquadFilter();
  lo.type = 'lowpass';
  lo.frequency.setValueAtTime(lp, t0);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(hi);
  hi.connect(lo);
  lo.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function sfxDrop(): void {
  tone(168, 0.07, 'sine', 0.04, 0, -40);
  rustle(0.05, 0.02, 0, 200, 900);
}

export function sfxMerge(combo: boolean): void {
  const a = combo ? 466 : 349;
  const b = combo ? 698 : 523;
  tone(a, 0.06, 'triangle', 0.042);
  tone(b, 0.09, 'sine', 0.036, 0.03, 40);
}

export function sfxPop(): void {
  tone(523, 0.055, 'triangle', 0.04);
  tone(659, 0.07, 'sine', 0.034, 0.028);
  tone(784, 0.11, 'sine', 0.028, 0.06, 30);
}

export function sfxJump(): void {
  tone(310, 0.075, 'sine', 0.038, 0, 150);
  rustle(0.04, 0.016, 0, 600, 2200);
}

export function sfxLand(): void {
  tone(110, 0.09, 'sine', 0.045, 0, -50);
  rustle(0.07, 0.028, 0, 120, 700);
}

export function sfxSlide(): void {
  rustle(0.055, 0.022, 0, 500, 2400);
  tone(220, 0.04, 'sine', 0.016, 0, 80);
}

export function sfxGate(): void {
  tone(620, 0.04, 'sine', 0.02, 0, 40);
}

export function sfxOver(): void {
  tone(220, 0.12, 'sine', 0.038, 0, -40);
  tone(165, 0.16, 'triangle', 0.03, 0.08, -20);
}

export function sfxWin(): void {
  tone(392, 0.07, 'triangle', 0.036);
  tone(523, 0.08, 'sine', 0.032, 0.06);
  tone(659, 0.12, 'sine', 0.03, 0.12, 20);
}

export function sfxCore(): void {
  tone(660, 0.05, 'sine', 0.03);
  tone(880, 0.07, 'triangle', 0.022, 0.025);
}

export function sfxBoost(): void {
  tone(392, 0.07, 'triangle', 0.032, 0, 90);
  tone(523, 0.1, 'sine', 0.026, 0.04, 70);
  rustle(0.08, 0.02, 0, 800, 2800);
}

export function sfxOrbit(): void {
  tone(262, 0.08, 'sine', 0.03, 0, 120);
  tone(392, 0.1, 'triangle', 0.024, 0.05, 80);
  tone(523, 0.14, 'sine', 0.02, 0.11, 40);
}

export function sfxShot(): void {
  tone(920, 0.032, 'square', 0.016, 0, -260);
  rustle(0.028, 0.01, 0, 1400, 4200);
}

export function sfxHit(): void {
  tone(196, 0.05, 'triangle', 0.028, 0, -70);
  rustle(0.045, 0.018, 0, 280, 1500);
}

export function sfxKill(): void {
  tone(392, 0.05, 'sine', 0.03);
  tone(523, 0.07, 'triangle', 0.022, 0.028, 50);
  rustle(0.05, 0.014, 0, 500, 2200);
}
