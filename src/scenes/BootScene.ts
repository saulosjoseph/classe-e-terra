import Phaser from 'phaser';
import { PixelArtGenerator } from '../assets/PixelArtGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    this.load.image('prefeitura', 'assets/prefeitura.png');
  }

  public create(): void {
    PixelArtGenerator.generateAll(this);
    this.scene.start('MenuScene');
  }
}
