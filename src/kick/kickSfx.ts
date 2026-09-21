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

export function unlockKickSfx(): void {
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
  filter.frequency.setValueAtTime(Math.min(2600, freq * 4), t0);
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

export function sfxWhistle(): void {
  tone(1320, 0.09, 'sine', 0.03);
  tone(1480, 0.16, 'triangle', 0.024, 0.05, 80);
}

export function sfxKick(): void {
  tone(78, 0.11, 'sine', 0.07, 0, -36);
  rustle(0.08, 0.042, 0, 140, 800);
  tone(220, 0.045, 'triangle', 0.024, 0.018, 50);
  tone(340, 0.03, 'sine', 0.016, 0.03, 80);
}

export function sfxGoal(): void {
  tone(392, 0.07, 'triangle', 0.04);
  tone(523, 0.08, 'sine', 0.036, 0.05);
  tone(659, 0.1, 'sine', 0.032, 0.1);
  tone(784, 0.18, 'sine', 0.028, 0.16, 30);
  rustle(0.14, 0.022, 0.04, 700, 2800);
}

export function sfxSave(): void {
  tone(140, 0.1, 'sine', 0.052, 0, -40);
  rustle(0.1, 0.046, 0, 90, 700);
  tone(90, 0.14, 'triangle', 0.024, 0.04, -20);
}

export function sfxPost(): void {
  tone(640, 0.05, 'square', 0.032);
  tone(880, 0.09, 'triangle', 0.024, 0.028, -120);
  rustle(0.07, 0.034, 0, 400, 2200);
}

export function sfxWide(): void {
  tone(196, 0.1, 'sine', 0.03, 0, -50);
  tone(148, 0.14, 'triangle', 0.022, 0.06, -30);
}

export function sfxDive(): void {
  rustle(0.09, 0.03, 0, 180, 1100);
  tone(168, 0.07, 'sine', 0.022, 0, -50);
}

export function sfxStreak(): void {
  tone(523, 0.07, 'sine', 0.03, 0.08);
  tone(659, 0.08, 'sine', 0.028, 0.14);
  tone(784, 0.16, 'triangle', 0.024, 0.2, 40);
}
