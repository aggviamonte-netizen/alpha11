import Phaser from 'phaser';
import { creature, radiusPx } from './canon';
import { DANGER_Y, FLOOR_Y, H, INNER_L, INNER_R, W, WALL, WELL_TOP } from './layout';

const DPR = 2;
export const ARENA_KEY = 'arena';

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, n | 0));
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, other: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

function lighten(hex: string, t: number): string {
  return mix(hex, '#ffffff', t);
}

function darken(hex: string, t: number): string {
  return mix(hex, '#050506', t);
}

function creatureKey(tier: number): string {
  return `lab-orb-${tier}`;
}

function polygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rot: number,
  round: number,
): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (Math.PI * 2 * i) / sides;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const prev = pts[(i + sides - 1) % sides];
    const cur = pts[i];
    const next = pts[(i + 1) % sides];
    if (!prev || !cur || !next) continue;
    const p1x = cur[0] + (prev[0] - cur[0]) * round;
    const p1y = cur[1] + (prev[1] - cur[1]) * round;
    const p2x = cur[0] + (next[0] - cur[0]) * round;
    const p2y = cur[1] + (next[1] - cur[1]) * round;
    if (i === 0) ctx.moveTo(p1x, p1y);
    else ctx.lineTo(p1x, p1y);
    ctx.quadraticCurveTo(cur[0], cur[1], p2x, p2y);
  }
  ctx.closePath();
}

function pathSilhouette(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, tier: number): void {
  switch (tier) {
    case 2:
      polygon(ctx, cx, cy, r, 6, Math.PI / 6, 0.32);
      return;
    case 4:
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.03, r * 0.94, r * 1.01, 0, 0, Math.PI * 2);
      return;
    case 5:
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.04, r * 0.93, 0, 0, Math.PI * 2);
      return;
    case 8:
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.06, r * 0.9, 0, 0, Math.PI * 2);
      return;
    case 9:
      polygon(ctx, cx, cy, r, 5, -Math.PI / 2, 0.4);
      return;
    case 10:
      polygon(ctx, cx, cy, r, 8, Math.PI / 8, 0.36);
      return;
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
}

function paintPattern(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, hex: string, tier: number): void {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = lighten(hex, 0.55);
  ctx.fillStyle = lighten(hex, 0.4);

  if (tier === 1) {
    for (const [dx, dy, s] of [
      [-0.28, -0.12, 0.16],
      [0.22, 0.08, 0.12],
      [-0.04, 0.28, 0.1],
      [0.3, -0.28, 0.08],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx + r * dx, cy + r * dy, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tier === 2) {
    ctx.lineWidth = Math.max(1, r * 0.04);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
      ctx.stroke();
    }
  } else if (tier === 3) {
    ctx.lineWidth = Math.max(1.2, r * 0.06);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      const x = cx + Math.cos(a) * r * 0.42;
      const y = cy + Math.sin(a) * r * 0.42;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.12, y);
      ctx.lineTo(x + r * 0.12, y);
      ctx.moveTo(x, y - r * 0.12);
      ctx.lineTo(x, y + r * 0.12);
      ctx.stroke();
    }
  } else if (tier === 5) {
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.04, r * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tier === 6) {
    ctx.lineWidth = Math.max(1.2, r * 0.055);
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const a = t * Math.PI * 3.2;
      const rr = r * 0.12 + r * 0.58 * t;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (tier === 7) {
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (tier === 8) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = lighten(hex, 0.25);
    for (const [dx, dy, s] of [
      [-0.2, -0.18, 0.07],
      [0.26, -0.06, 0.05],
      [0.04, 0.22, 0.06],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx + r * dx, cy + r * dy, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tier === 9) {
    ctx.lineWidth = Math.max(1, r * 0.04);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62);
      ctx.stroke();
    }
  } else if (tier === 10) {
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.48, cy + Math.sin(a) * r * 0.48, r * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tier === 11) {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#9BE7FF';
    ctx.lineWidth = Math.max(1.4, r * 0.045);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, -0.9, 0.6);
    ctx.stroke();
    ctx.strokeStyle = '#FFB5E0';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 2.1, 3.4);
    ctx.stroke();
  }
  ctx.restore();
}

function paintOrb(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, hex: string, tier: number): void {
  pathSilhouette(ctx, cx, cy, r, tier);
  const body = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.38, r * 0.06, cx + r * 0.08, cy + r * 0.16, r * 1.05);
  body.addColorStop(0, lighten(hex, 0.52));
  body.addColorStop(0.38, lighten(hex, 0.08));
  body.addColorStop(0.78, hex);
  body.addColorStop(1, darken(hex, 0.38));
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  pathSilhouette(ctx, cx, cy, r, tier);
  ctx.clip();

  const inner = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  inner.addColorStop(0, mix(hex, '#ffffff', 0.22));
  inner.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = inner;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  paintPattern(ctx, cx, cy, r, hex, tier);

  ctx.globalAlpha = 0.55;
  const spec = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.42, 0, cx - r * 0.34, cy - r * 0.42, r * 0.42);
  spec.addColorStop(0, 'rgba(255,255,255,0.95)');
  spec.addColorStop(0.35, 'rgba(255,255,255,0.28)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.28, cy - r * 0.38, r * 0.34, r * 0.2, -0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = lighten(hex, 0.62);
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, -2.5, -0.35);
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = darken(hex, 0.45);
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, 0.45, 2.55);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(11,11,12,0.42)';
  ctx.lineWidth = Math.max(1.4, r * 0.055);
  pathSilhouette(ctx, cx, cy, r - ctx.lineWidth * 0.15, tier);
  ctx.stroke();
  ctx.restore();
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function bakeCreatureTexture(scene: Phaser.Scene, tier: number): string {
  const key = creatureKey(tier);
  if (scene.textures.exists(key)) return key;
  const c = creature(tier);
  const r = radiusPx(tier);
  const pad = Math.ceil(r * 0.2);
  const css = Math.ceil((r + pad) * 2);
  const canvas = makeCanvas(css * DPR, css * DPR);
  const ctx = canvas.getContext('2d');
  if (!ctx) return key;
  ctx.scale(DPR, DPR);
  ctx.imageSmoothingEnabled = true;
  const cx = css / 2;
  const cy = css / 2;
  paintOrb(ctx, cx, cy, r, c.hex, tier);
  scene.textures.addCanvas(key, canvas, true);
  return key;
}

export function bakeAllCreatureTextures(scene: Phaser.Scene): void {
  for (let t = 1; t <= 11; t++) bakeCreatureTexture(scene, t);
}

export function bakeArenaTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(ARENA_KEY)) return;
  const canvas = makeCanvas(W * DPR, H * DPR);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(DPR, DPR);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#101012');
  bg.addColorStop(0.45, '#0B0B0C');
  bg.addColorStop(1, '#080809');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.46, 520);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  const wellW = INNER_R - INNER_L;
  const wellH = FLOOR_Y - WELL_TOP;
  const x = INNER_L;
  const y = WELL_TOP;
  const rad = 22;

  ctx.save();
  ctx.shadowColor = 'rgba(232,255,71,0.08)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#141416';
  roundRect(ctx, x - 3, y - 3, wellW + 6, wellH + WALL + 6, rad);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#0A0A0B';
  roundRect(ctx, x, y, wellW, wellH + WALL, rad);
  ctx.fill();

  const well = ctx.createLinearGradient(x, y, x, y + wellH);
  well.addColorStop(0, '#151518');
  well.addColorStop(0.35, '#101012');
  well.addColorStop(1, '#0C0C0E');
  ctx.fillStyle = well;
  roundRect(ctx, x, y, wellW, wellH, rad);
  ctx.fill();

  ctx.strokeStyle = 'rgba(244,241,234,0.08)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, wellW - 1, wellH - 1, rad - 1);
  ctx.stroke();

  ctx.fillStyle = 'rgba(244,241,234,0.07)';
  ctx.fillRect(INNER_L - WALL, WELL_TOP - 4, WALL, FLOOR_Y - (WELL_TOP - 4) + WALL);
  ctx.fillRect(INNER_R, WELL_TOP - 4, WALL, FLOOR_Y - (WELL_TOP - 4) + WALL);
  ctx.fillRect(INNER_L - WALL, FLOOR_Y, wellW + WALL * 2, WALL);

  const lip = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + WALL);
  lip.addColorStop(0, 'rgba(244,241,234,0.16)');
  lip.addColorStop(1, 'rgba(244,241,234,0.04)');
  ctx.fillStyle = lip;
  ctx.fillRect(INNER_L - WALL, FLOOR_Y, wellW + WALL * 2, 3);

  ctx.fillStyle = 'rgba(232,255,71,0.035)';
  ctx.fillRect(INNER_L, DANGER_Y - 18, wellW, 36);

  scene.textures.addCanvas(ARENA_KEY, canvas, true);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
