let ctx: AudioContext | null = null;

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

function beep(freq: number, dur: number, type: OscillatorType, gain: number, at = 0): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfxDrop(): void {
  beep(196, 0.045, 'square', 0.035);
}

export function sfxMerge(combo: boolean): void {
  const a = combo ? 494 : 349;
  const b = combo ? 740 : 523;
  beep(a, 0.055, 'triangle', 0.045);
  beep(b, 0.08, 'sine', 0.038, 0.035);
}

export function sfxPop(): void {
  beep(440, 0.05, 'square', 0.042);
  beep(659, 0.07, 'triangle', 0.038, 0.03);
  beep(880, 0.1, 'sine', 0.03, 0.065);
}

export function sfxOver(): void {
  beep(196, 0.11, 'sine', 0.04);
  beep(147, 0.16, 'sine', 0.032, 0.09);
}
