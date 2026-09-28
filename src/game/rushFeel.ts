/**
 * RUSH runner feel. Pure helpers — no Phaser, no Three.
 * The track, the jump, and the hit volumes stay the runner's.
 * This module only decides how a pass sounds, shakes, and speaks.
 */

/** How long a clean pass still belongs to the same run of the track. */
export const STREAK_WINDOW_MS = 1600;

/** Same banner twice inside this is one shout. A milestone always speaks. */
export const BANNER_COOLDOWN_MS = 680;

/** Button press flash. Long enough to see, gone before the next hop. */
export const ACK_MS = 180;

/** Jump squash the blok already used. A press reads, the suit stays readable. */
export const JUMP_SQUASH = 0.78;
export const JUMP_BURST = 7;

/** Crash pose the run already ended on. */
export const CRASH_SQUASH = 0.62;

/** Body roll into a steer. Deadzone so a resting finger does not wag. */
export const STEER_LEAN = 0.2;
export const STEER_DEAD = 0.08;

/**
 * Spike and beam volumes copied from the runner.
 * A hair outside them is a graze. Overlap is still a hit.
 */
export const SPIKE_WINDOW = 1.05;
export const SPIKE_HIT_LAT = 0.72;
export const SPIKE_HIT_H = 0.7;
export const BEAM_WINDOW = 1.15;
export const BEAM_HIT_LAT = 1.35;
export const BEAM_HIT_H = 1.15;
export const NEAR_LAT = 0.42;
export const NEAR_H = 0.45;

/** Core pickup already allows a wide grab. This is the centered thread. */
export const LANE_SLACK = 0.28;

/** Fall speed (positive down) that still sticks. Above it, the landing craters. */
export const CLEAN_FALL = 3.2;
export const HARD_FALL = 9.2;

/** Banner stack sits under the score, painted over the HUD. */
export const VOICE_TOP_PX = 86;
export const VOICE_Z = 3;
export const BANNER_SIZE_PX = 22;
export const WHISPER_SIZE_PX = 13;

export type RushMoment = 'near' | 'land' | 'lane' | 'surge' | 'loop' | 'core' | 'crash';
export type RushVoice = { banner: string; whisper: string };
export type RushTone = 'lime' | 'orange' | 'red' | 'cyan';
export type RushSpark = 'lime' | 'orange' | 'cyan';

export function nextCombo(prev: number, withinWindow: boolean): number {
  return withinWindow ? prev + 1 : 1;
}

/** 3, 5, 8, 12, then every fifth after that. */
export function isStreakMilestone(combo: number): boolean {
  return combo === 3 || combo === 5 || combo === 8 || combo === 12 || (combo > 12 && combo % 5 === 0);
}

export function withinStreak(lastMs: number | null, nowMs: number): boolean {
  return lastMs != null && nowMs - lastMs <= STREAK_WINDOW_MS;
}

/** A pass that belongs on the streak. A turbo tap and a crash do not climb it. */
export function countsForStreak(moment: RushMoment): boolean {
  return moment === 'near' || moment === 'land' || moment === 'lane' || moment === 'core' || moment === 'loop';
}

export function surgeStarted(prev: number, next: number): boolean {
  return prev <= 0 && next > 0;
}

export function bannerAllowed(nowMs: number, lastMs: number, sameBanner: boolean, milestone: boolean): boolean {
  if (milestone) return true;
  if (!sameBanner || lastMs <= 0) return true;
  return nowMs - lastMs >= BANNER_COOLDOWN_MS;
}

export function controlClasses(held: boolean, pulsed: boolean): string[] {
  const classes: string[] = [];
  if (held) classes.push('is-held');
  if (pulsed) classes.push('is-ack');
  return classes;
}

/** Positive steer (right) rolls the suit into the turn. */
export function steerLean(steer: number): number {
  const s = Math.max(-1, Math.min(1, steer));
  if (Math.abs(s) < STEER_DEAD) return 0;
  return -s * STEER_LEAN;
}

export function fallSpeed(vh: number): number {
  return Math.max(0, -vh);
}

export function isHardLand(vh: number): boolean {
  return fallSpeed(vh) >= HARD_FALL;
}

export function isCleanLand(vh: number): boolean {
  const fall = fallSpeed(vh);
  return fall >= CLEAN_FALL && fall < HARD_FALL;
}

export function isPerfectLane(dLat: number): boolean {
  return Math.abs(dLat) <= LANE_SLACK;
}

export function spikeHits(ds: number, dLat: number, height: number, grounded: boolean): boolean {
  return (
    grounded &&
    Math.abs(ds) < SPIKE_WINDOW &&
    Math.abs(dLat) < SPIKE_HIT_LAT &&
    height < SPIKE_HIT_H
  );
}

export function spikeNear(ds: number, dLat: number, height: number, grounded: boolean): boolean {
  if (Math.abs(ds) >= SPIKE_WINDOW) return false;
  if (spikeHits(ds, dLat, height, grounded)) return false;
  const lat = Math.abs(dLat);
  const side = lat >= SPIKE_HIT_LAT && lat <= SPIKE_HIT_LAT + NEAR_LAT && height < SPIKE_HIT_H + NEAR_H;
  const skim = lat < SPIKE_HIT_LAT && height >= SPIKE_HIT_H && height <= SPIKE_HIT_H + NEAR_H;
  const thread = !grounded && lat < SPIKE_HIT_LAT && height < SPIKE_HIT_H;
  return side || skim || thread;
}

export function beamHits(ds: number, dLat: number, height: number): boolean {
  return Math.abs(ds) < BEAM_WINDOW && height < BEAM_HIT_H && Math.abs(dLat) < BEAM_HIT_LAT;
}

export function beamNear(ds: number, dLat: number, height: number): boolean {
  if (Math.abs(ds) >= BEAM_WINDOW) return false;
  if (beamHits(ds, dLat, height)) return false;
  const lat = Math.abs(dLat);
  const skim = lat < BEAM_HIT_LAT && height >= BEAM_HIT_H && height <= BEAM_HIT_H + NEAR_H;
  const side = height < BEAM_HIT_H && lat >= BEAM_HIT_LAT && lat <= BEAM_HIT_LAT + NEAR_LAT;
  return skim || side;
}

export function streakBanner(combo: number): string | null {
  if (!isStreakMilestone(combo)) return null;
  if (combo >= 12) return '¡RAYO!';
  if (combo >= 8) return '¡LÍNEA!';
  if (combo === 5) return '¡RITMO!';
  return '¡TRAMO!';
}

export function streakWhisper(combo: number): string | null {
  if (!isStreakMilestone(combo)) return null;
  if (combo >= 12) return 'no se corta';
  if (combo >= 8) return 'la pista es tuya';
  if (combo === 5) return 'cinco sin frenar';
  return 'tres al paso';
}

export function nearMissBanner(): string {
  return '¡ROZÓN!';
}

export function nearMissWhisper(): string {
  return 'por un pelo';
}

export function cleanLandBanner(): string {
  return '¡CLAVADO!';
}

export function cleanLandWhisper(): string {
  return 'pies en la pista';
}

export function perfectLaneBanner(): string {
  return '¡CARRIL!';
}

export function perfectLaneWhisper(): string {
  return 'en el eje';
}

export function surgeBanner(): string {
  return '¡EMPUJE!';
}

export function surgeWhisper(): string {
  return 'el turbo entra';
}

export function loopBanner(): string {
  return '¡GIRO!';
}

export function loopWhisper(): string {
  return 'el aro cierra';
}

export function crashBanner(): string {
  return '¡CORTE!';
}

export function crashWhisper(): string {
  return 'se acabó el tramo';
}

/**
 * A milestone takes the banner on a pass. The loop, the turbo, and the crash
 * keep their own shout. A live streak still supplies the whisper.
 */
export function momentVoice(moment: RushMoment, combo: number): RushVoice | null {
  if (moment === 'crash') return { banner: crashBanner(), whisper: crashWhisper() };

  const streak = streakBanner(combo);
  const streakLine = streakWhisper(combo);

  if (moment === 'loop') return { banner: loopBanner(), whisper: streakLine ?? loopWhisper() };
  if (moment === 'surge') return { banner: surgeBanner(), whisper: streakLine ?? surgeWhisper() };

  if (streak && streakLine && (moment === 'near' || moment === 'lane' || moment === 'core' || moment === 'land')) {
    let whisper = streakLine;
    if (moment === 'near') whisper = nearMissWhisper();
    else if (moment === 'land') whisper = cleanLandWhisper();
    else if (moment === 'lane') whisper = perfectLaneWhisper();
    return { banner: streak, whisper };
  }
  if (moment === 'near') return { banner: nearMissBanner(), whisper: nearMissWhisper() };
  if (moment === 'land') return { banner: cleanLandBanner(), whisper: cleanLandWhisper() };
  if (moment === 'lane') return { banner: perfectLaneBanner(), whisper: perfectLaneWhisper() };
  return null;
}

export function voiceColor(banner: string): string {
  if (banner === '¡ROZÓN!' || banner === '¡GIRO!') return '#6EE7FF';
  if (banner === '¡EMPUJE!') return '#FF9A3C';
  if (banner === '¡CORTE!') return '#FF7A45';
  if (banner === '¡RAYO!' || banner === '¡CARRIL!') return '#F4F1EA';
  if (banner === '¡TRAMO!') return '#FF8BD1';
  if (banner === '¡LÍNEA!' || banner === '¡RITMO!' || banner === '¡CLAVADO!') return '#E8FF47';
  return '#E8FF47';
}

export function momentWash(moment: RushMoment, combo: number): RushTone | null {
  if (moment === 'crash') return 'red';
  if (moment === 'loop') return 'cyan';
  if (moment === 'surge') return 'lime';
  if (moment === 'near') return 'cyan';
  if (moment === 'lane') return 'lime';
  if (moment === 'core' && isStreakMilestone(combo) && combo >= 8) return 'lime';
  return null;
}

export function landWash(vh: number): RushTone | null {
  return isHardLand(vh) ? 'orange' : null;
}

/** Camera kick. Lite next to the crash. */
export function momentShake(moment: Exclude<RushMoment, 'land'>, combo: number): number {
  if (moment === 'crash') return 0.45;
  if (moment === 'loop') return combo >= 8 ? 0.3 : 0.28;
  if (moment === 'surge') return 0.16;
  if (moment === 'near') return combo >= 5 ? 0.12 : 0.08;
  if (moment === 'lane') return 0.11;
  if (moment === 'core') return isStreakMilestone(combo) ? 0.1 : 0;
  return 0;
}

export function landShake(vh: number): number {
  if (isHardLand(vh)) return 0.26;
  if (isCleanLand(vh)) return 0.18;
  return 0.1;
}

export function landSquash(vh: number): number {
  if (isHardLand(vh)) return 0.64;
  if (isCleanLand(vh)) return 0.72;
  return 0.84;
}

export function landBurst(vh: number): number {
  if (isHardLand(vh)) return 9;
  if (isCleanLand(vh)) return 6;
  return 4;
}

/** Sparks. Loop keeps the ring it already threw. Everything else stays inside 12. */
export function burstCount(moment: Exclude<RushMoment, 'land'>): number {
  if (moment === 'loop') return 14;
  if (moment === 'crash') return 12;
  if (moment === 'lane') return 10;
  if (moment === 'surge' || moment === 'core') return 8;
  if (moment === 'near') return 7;
  return 6;
}

export function burstColor(moment: RushMoment): RushSpark {
  if (moment === 'near' || moment === 'loop') return 'cyan';
  if (moment === 'land' || moment === 'surge' || moment === 'crash') return 'orange';
  return 'lime';
}

/** Extra lime sparks so a centered grab and a long line read hotter. */
export function accentCount(moment: RushMoment, combo: number): number {
  if (moment === 'lane') return 4;
  if (moment === 'near' && combo >= 5) return 3;
  if ((moment === 'core' || moment === 'loop') && isStreakMilestone(combo) && combo >= 8) return 4;
  return 0;
}
