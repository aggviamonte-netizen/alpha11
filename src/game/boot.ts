import Phaser from 'phaser';
import { H, LabScene, W } from './LabScene';

export function startLab(parent: string | HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#0B0B0C',
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1.55 },
        enableSleeping: true,
        debug: false,
      },
    },
    scene: LabScene,
  });
}
