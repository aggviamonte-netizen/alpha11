import Phaser from 'phaser';
import { H, W } from '../game/layout';
import { KickScene } from './KickScene';

export function startKick(parent: string | HTMLElement): Phaser.Game {
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
    scene: KickScene,
  });
}
