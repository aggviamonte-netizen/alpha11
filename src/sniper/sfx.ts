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

export function unlockSniperSfx(): void {
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

/** Toy-dart thump — playful, not a rifle crack. */
export function sfxFire(): void {
  rustle(0.045, 0.03, 0, 180, 900);
  tone(92, 0.08, 'sine', 0.05, 0, -28);
  tone(210, 0.05, 'triangle', 0.02, 0.012, 40);
  tone(640, 0.03, 'sine', 0.012, 0.02, 80);
}

export function sfxHit(combo: number): void {
  const lift = Math.min(combo, 5) * 28;
  tone(392 + lift, 0.055, 'triangle', 0.04);
  tone(523 + lift, 0.08, 'sine', 0.034, 0.03);
  if (combo >= 3) tone(784, 0.1, 'sine', 0.026, 0.07, 20);
}

export function sfxBull(): void {
  tone(523, 0.05, 'triangle', 0.036);
  tone(659, 0.07, 'sine', 0.03, 0.03);
  tone(880, 0.1, 'sine', 0.024, 0.07, 24);
}

export function sfxMiss(): void {
  rustle(0.07, 0.022, 0, 220, 700);
  tone(140, 0.07, 'sine', 0.028, 0, -40);
}

export function sfxDry(): void {
  rustle(0.03, 0.012, 0, 700, 1800);
  tone(180, 0.035, 'square', 0.01);
}

export function sfxTick(): void {
  tone(880, 0.035, 'sine', 0.016);
}

export function sfxOver(): void {
  tone(220, 0.12, 'sine', 0.038, 0, -40);
  tone(165, 0.16, 'triangle', 0.03, 0.08, -20);
}

export function sfxPopUp(): void {
  tone(280, 0.045, 'sine', 0.016, 0, 90);
  rustle(0.03, 0.01, 0, 500, 1600);
}
