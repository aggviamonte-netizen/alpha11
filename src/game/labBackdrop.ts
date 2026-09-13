import Phaser from 'phaser';
import { H, W } from './layout';

/** Shared lab glass wash. No produce — other games may use this backdrop. */
export function paintLabBackdrop(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(0x101014, 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(0x171820, 1);
  g.fillRect(0, 0, W, 230);
  g.fillStyle(0xe8ff47, 0.055);
  g.fillCircle(52, 78, 110);
  g.fillStyle(0x6ee7ff, 0.045);
  g.fillCircle(W - 24, 168, 96);
  g.fillStyle(0xff8bd1, 0.03);
  g.fillCircle(W * 0.5, 760, 140);
  g.fillStyle(0x050506, 0.22);
  g.fillRect(0, 740, W, H - 740);
}
