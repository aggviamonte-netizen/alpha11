import Phaser from 'phaser';

export const UI_FONT = 'Outfit, ui-sans-serif, system-ui, sans-serif';

export function pulseRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  start = 10,
  scale = 2.4,
): void {
  const ring = scene.add.circle(x, y, start, color, 0).setStrokeStyle(2, color, 0.9).setDepth(18);
  scene.tweens.add({
    targets: ring,
    scale,
    alpha: 0,
    duration: 300,
    ease: 'Quad.out',
    onComplete: () => ring.destroy(),
  });
}

export function burstDots(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count: number,
): void {
  pulseRing(scene, x, y, color);
  const n = Math.min(count, 12);
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.22;
    const dist = 16 + Math.random() * 24;
    const dot = scene.add.circle(x, y, 2 + Math.random() * 2.2, color, 0.95).setDepth(19);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist,
      alpha: 0,
      scale: 0.12,
      duration: 320 + Math.random() * 140,
      ease: 'Quad.out',
      onComplete: () => dot.destroy(),
    });
  }
}

export function floatLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: { color?: string; size?: string; lift?: number } = {},
): void {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: UI_FONT,
      fontSize: opts.size ?? '16px',
      color: opts.color ?? '#E8FF47',
      fontStyle: 'bold',
      stroke: '#0B0B0C',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(28)
    .setScale(0.72);
  scene.tweens.add({
    targets: t,
    y: y - (opts.lift ?? 40),
    alpha: 0,
    scale: 1.08,
    duration: 640,
    ease: 'Quad.out',
    onComplete: () => t.destroy(),
  });
}

export function screenWash(scene: Phaser.Scene, color: number, alpha = 0.22, ms = 200): void {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const rect = scene.add.rectangle(w / 2, h / 2, w, h, color, alpha).setDepth(40);
  scene.tweens.add({
    targets: rect,
    alpha: 0,
    duration: ms,
    ease: 'Quad.out',
    onComplete: () => rect.destroy(),
  });
}

type Scalable = { setScale: (x: number, y?: number) => unknown };

export function popScale(
  scene: Phaser.Scene,
  target: Scalable,
  from: number,
  to = 1,
  ms = 160,
): void {
  target.setScale(from);
  scene.tweens.add({
    targets: target,
    scaleX: to,
    scaleY: to,
    duration: ms,
    ease: 'Back.out',
  });
}

export function squashTo(
  scene: Phaser.Scene,
  target: Scalable,
  sx: number,
  sy: number,
  settle = 150,
): void {
  scene.tweens.killTweensOf(target);
  target.setScale(sx, sy);
  scene.tweens.add({
    targets: target,
    scaleX: 1,
    scaleY: 1,
    duration: settle,
    ease: 'Sine.out',
  });
}

const HIT_STOP_KEY = '__juiceHitStop';

/** Brief world freeze. Uses wall-clock so nested calls don't unpause early. */
export function hitStop(scene: Phaser.Scene, ms: number, scale = 0.1): void {
  const next = ((scene.data.get(HIT_STOP_KEY) as number | undefined) ?? 0) + 1;
  scene.data.set(HIT_STOP_KEY, next);
  scene.tweens.timeScale = scale;
  scene.time.timeScale = scale;
  window.setTimeout(() => {
    if (scene.data.get(HIT_STOP_KEY) !== next) return;
    if (!scene.sys.isActive()) return;
    scene.tweens.timeScale = 1;
    scene.time.timeScale = 1;
  }, ms);
}
