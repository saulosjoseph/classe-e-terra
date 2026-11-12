import Phaser from 'phaser';
import { PixelArtGenerator } from '../assets/PixelArtGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    this.load.image('prefeitura', 'assets/prefeitura.png');
    this.load.spritesheet('brigadista_voluntario', 'assets/brigadista_voluntario.png', {
      frameWidth: 128,
      frameHeight: 128
    });
  }

  public create(): void {
    PixelArtGenerator.generateAll(this);
    this.createBrigadistaAnimations();
    this.scene.start('MenuScene');
  }

  private createBrigadistaAnimations(): void {
    // Animação de repouso (Idle)
    if (!this.anims.exists('brigadista_voluntario_idle')) {
      this.anims.create({
        key: 'brigadista_voluntario_idle',
        frames: this.anims.generateFrameNumbers('brigadista_voluntario', { frames: [0] }),
        frameRate: 1,
        repeat: -1
      });
    }

    // Animação de caminhada (Walk - 6 frames)
    if (!this.anims.exists('brigadista_voluntario_walk')) {
      this.anims.create({
        key: 'brigadista_voluntario_walk',
        frames: this.anims.generateFrameNumbers('brigadista_voluntario', {
          frames: [1, 2, 3, 4, 5, 6]
        }),
        frameRate: 9,
        repeat: -1
      });
    }

    // Animação de combate ao fogo com soprador e vento/faíscas (Extinguish - 5 frames)
    if (!this.anims.exists('brigadista_voluntario_extinguish')) {
      this.anims.create({
        key: 'brigadista_voluntario_extinguish',
        frames: this.anims.generateFrameNumbers('brigadista_voluntario', {
          frames: [7, 8, 9, 10, 11]
        }),
        frameRate: 7,
        repeat: -1
      });
    }
  }
}
