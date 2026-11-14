import Phaser from 'phaser';
import { PixelArtGenerator } from '../assets/PixelArtGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    this.load.image('prefeitura', 'assets/prefeitura.png');
    this.load.image('base_brigadista_voluntario', 'assets/base_brigadista_voluntario.png');
    this.load.image('aldeia', 'assets/aldeia.png');
    this.load.image('casa_rural', 'assets/casa_rural.png');
    this.load.image('base_bombeiros', 'assets/base_bombeiros.png');
    this.load.image('caminhao_bombeiros', 'assets/caminhao_bombeiros.png');
    this.load.spritesheet('bombeiro_spray', 'assets/bombeiro_spray.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('brigadista_voluntario', 'assets/brigadista_voluntario.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('brigada_comunitaria', 'assets/brigada_comunitaria.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('trabalhador_rural_a', 'assets/trabalhador_rural_a.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('trabalhador_rural_b', 'assets/trabalhador_rural_b.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('incendiario', 'assets/incendiario.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.image('carro_popular_vermelho', 'assets/carro_popular_vermelho.png');
    this.load.image('carro_popular_amarelo', 'assets/carro_popular_amarelo.png');
    this.load.image('carro_popular_preto', 'assets/carro_popular_preto.png');
    this.load.image('carro_popular_prata', 'assets/carro_popular_prata.png');
  }

  public create(): void {
    PixelArtGenerator.generateAll(this);
    this.createBrigadistaAnimations();
    this.createBrigadaComunitariaAnimations();
    this.createTrabalhadorRuralAnimations();
    this.createIncendiarioAnimations();
    this.scene.start('MenuScene');
  }

  // Frames definidos em scripts/create_incendiario_spritesheet.js
  private createIncendiarioAnimations(): void {
    if (!this.anims.exists('incendiario_idle')) {
      this.anims.create({
        key: 'incendiario_idle',
        frames: this.anims.generateFrameNumbers('incendiario', { frames: [0] }),
        frameRate: 1,
        repeat: -1
      });
    }
    if (!this.anims.exists('incendiario_walk')) {
      this.anims.create({
        key: 'incendiario_walk',
        frames: this.anims.generateFrameNumbers('incendiario', { frames: [1, 2, 3, 4, 5] }),
        frameRate: 7,
        repeat: -1
      });
    }
  }

  // Frames definidos em scripts/create_trabalhador_rural_spritesheet.js
  private createTrabalhadorRuralAnimations(): void {
    const variants = [
      { key: 'trabalhador_rural_a', walk: [1, 2, 3, 4, 5], extinguish: [6, 7, 8] },
      { key: 'trabalhador_rural_b', walk: [1, 2, 3], extinguish: [4, 5] }
    ];

    for (const variant of variants) {
      const prefix = variant.key;
      if (!this.anims.exists(`${prefix}_idle`)) {
        this.anims.create({
          key: `${prefix}_idle`,
          frames: this.anims.generateFrameNumbers(variant.key, { frames: [0] }),
          frameRate: 1,
          repeat: -1
        });
      }
      if (!this.anims.exists(`${prefix}_walk`)) {
        this.anims.create({
          key: `${prefix}_walk`,
          frames: this.anims.generateFrameNumbers(variant.key, { frames: variant.walk }),
          frameRate: 5,
          repeat: -1
        });
      }
      if (!this.anims.exists(`${prefix}_extinguish`)) {
        this.anims.create({
          key: `${prefix}_extinguish`,
          frames: this.anims.generateFrameNumbers(variant.key, { frames: variant.extinguish }),
          frameRate: 4,
          repeat: -1
        });
      }
    }
  }

  private createBrigadaComunitariaAnimations(): void {
    if (!this.anims.exists('comunitaria_idle')) {
      this.anims.create({
        key: 'comunitaria_idle',
        frames: this.anims.generateFrameNumbers('brigada_comunitaria', { frames: [0] }),
        frameRate: 1,
        repeat: -1
      });
    }

    // Deslocamento: carro em movimento com poeira (frames 1-6)
    if (!this.anims.exists('comunitaria_walk')) {
      this.anims.create({
        key: 'comunitaria_walk',
        frames: this.anims.generateFrameNumbers('brigada_comunitaria', {
          frames: [1, 2, 3, 4, 5, 6]
        }),
        frameRate: 9,
        repeat: -1
      });
    }

    // Combate: motorista descendo do carro para apagar o fogo (frames 7-11)
    if (!this.anims.exists('comunitaria_extinguish')) {
      this.anims.create({
        key: 'comunitaria_extinguish',
        frames: this.anims.generateFrameNumbers('brigada_comunitaria', {
          frames: [7, 8, 9, 10, 11]
        }),
        frameRate: 7,
        repeat: -1
      });
    }
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

    if (!this.anims.exists('bombeiro_spray')) {
      this.anims.create({
        key: 'bombeiro_spray',
        frames: this.anims.generateFrameNumbers('bombeiro_spray', { frames: [0, 1, 2] }),
        frameRate: 8,
        repeat: -1
      });
    }
  }
}
