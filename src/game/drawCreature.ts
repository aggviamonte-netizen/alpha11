import Phaser from 'phaser';
import { creature, radiusPx } from './canon';

export function drawCreatureAtRadius(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
  r: number,
  alpha = 1,
): Phaser.GameObjects.Container {
  const c = creature(tier);
  const root = scene.add.container(x, y);
  const glow = scene.add.circle(0, 0, r * 1.18, c.color, 0.16 * alpha);
  const disc = scene.add.circle(0, 0, r, c.color, alpha);
  disc.setStrokeStyle(Math.max(2, r * 0.08), 0x0b0b0c, 0.5);
  const shine = scene.add.ellipse(-r * 0.28, -r * 0.32, r * 0.42, r * 0.22, 0xffffff, 0.22 * alpha);
  const emoji = scene.add
    .text(0, -r * 0.08, c.emoji, {
      fontSize: `${Math.max(14, r * 0.92)}px`,
      align: 'center',
    })
    .setOrigin(0.5);
  const code = scene.add
    .text(0, r * 0.42, c.code, {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: `${Math.max(8, r * 0.3)}px`,
      color: '#0B0B0C',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  root.add([glow, disc, shine, emoji, code]);
  root.setDepth(10);
  return root;
}

export function drawCreature(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
  alpha = 1,
): Phaser.GameObjects.Container {
  return drawCreatureAtRadius(scene, x, y, tier, radiusPx(tier), alpha);
}
