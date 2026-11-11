import Phaser from 'phaser';
import { DIFFICULTY_CONFIGS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameBalance';
import { SoundManager } from '../audio/SoundManager';
import { DifficultyLevel } from '../types/GameTypes';

export class MenuScene extends Phaser.Scene {
  private selectedDifficulty: DifficultyLevel = DifficultyLevel.NORMAL;
  private diffButtons: Map<
    DifficultyLevel,
    { bg: Phaser.GameObjects.Rectangle; title: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text }
  > = new Map();

  constructor() {
    super('MenuScene');
  }

  public create(): void {
    this.diffButtons.clear();

    // Fundo contrastando a mata viva com a ameaça da fumaça cinza/preta no topo (720x405 Landscape)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x09090b, 0x18181b, 0x064e3b, 0x14532d, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Faixa do Rio Tapajós decorativa ao fundo
    bg.fillStyle(0x0284c7, 0.4);
    bg.fillRect(0, 88, GAME_WIDTH, 20);

    // Cabeçalho centralizado no topo
    this.add
      .text(GAME_WIDTH / 2, 26, 'CLASSE E TERRA: A UNIÃO DO TAPAJÓS', {
        fontFamily: 'Courier New, monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#4ade80',
        stroke: '#052e16',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        54,
        'Santarém & Baixo Tapajós em Luta! Una Cidade, Campo e Floresta contra a fumaça tóxica e o Burguês.',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '11px',
          color: '#e4e4e7',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    // Decorações em Pixel Art na faixa do rio
    this.add.sprite(120, 96, 'prop_city_house').setScale(1.2);
    this.add.sprite(240, 96, 'unit_brigadista').setScale(1.2);
    this.add.sprite(360, 96, 'prop_farm').setScale(1.2);
    this.add.sprite(480, 96, 'unit_guarda').setScale(1.2);
    this.add.sprite(600, 96, 'prop_tree').setScale(1.3);

    // Coluna Esquerda (x = 195): Seleção de Dificuldade (afeta ganho das Ações Integradas)
    const leftX = 198;
    this.add
      .text(leftX, 130, 'ESCOLHA A DIFICULDADE:', {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#facc15'
      })
      .setOrigin(0.5);

    this.add
      .text(leftX, 146, '(Escala o ganho das Ações Integradas)', {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#a1a1aa'
      })
      .setOrigin(0.5);

    const levels: DifficultyLevel[] = [
      DifficultyLevel.EASY,
      DifficultyLevel.NORMAL,
      DifficultyLevel.HARD
    ];

    levels.forEach((lvl, idx) => {
      const cfg = DIFFICULTY_CONFIGS[lvl];
      const y = 186 + idx * 58;

      const rect = this.add
        .rectangle(leftX, y, 336, 48, 0x18181b, 0.92)
        .setStrokeStyle(2, 0x3f3f46)
        .setInteractive({ useHandCursor: true });

      const title = this.add
        .text(leftX, y - 8, cfg.label, {
          fontFamily: 'Courier New, monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      const sub = this.add
        .text(leftX, y + 10, cfg.subtitle, {
          fontFamily: 'Courier New, monospace',
          fontSize: '11px',
          color: '#cbd5e1'
        })
        .setOrigin(0.5);

      rect.on('pointerdown', () => {
        SoundManager.unlock();
        SoundManager.playSelect();
        this.selectedDifficulty = lvl;
        this.refreshDifficultySelection();
      });

      this.diffButtons.set(lvl, { bg: rect, title, sub });
    });

    this.refreshDifficultySelection();

    // Coluna Direita (x = 538): Guia Mobile Landscape + Botão Iniciar
    const rightX = 538;
    const tipsBox = this.add
      .rectangle(rightX, 206, 316, 132, 0x090d0a, 0.85)
      .setStrokeStyle(1.5, 0x15803d);

    this.add
      .text(
        tipsBox.x,
        tipsBox.y,
        '📱 JOGABILIDADE MOBILE (PAISAGEM):\n\n• ARRASTE O MAPA para explorar\n  (Cidade ➔ Campo ➔ Floresta).\n• Brigadistas e Guardas agem SOZINHOS\n  contra o fogo e os incendiários!\n• Use a barra inferior para acionar as\n  Ações Integradas e invocar reforços!',
        {
          fontFamily: 'Courier New, monospace',
          fontSize: '10px',
          color: '#d1fae5',
          align: 'left',
          lineSpacing: 3
        }
      )
      .setOrigin(0.5);

    const startBtn = this.add
      .rectangle(rightX, 316, 316, 56, 0x16a34a, 1)
      .setStrokeStyle(3, 0x86efac)
      .setInteractive({ useHandCursor: true });

    const startTxt = this.add
      .text(rightX, 316, '✊ INICIAR RESISTÊNCIA', {
        fontFamily: 'Courier New, monospace',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#052e16'
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: [startBtn, startTxt],
      scaleX: 1.02,
      scaleY: 1.02,
      yoyo: true,
      repeat: -1,
      duration: 700
    });

    startBtn.on('pointerdown', () => {
      SoundManager.unlock();
      SoundManager.playPhaseUp();
      this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
    });

    // Botão de Áudio no rodapé direito
    const audioBtn = this.add
      .text(GAME_WIDTH - 18, GAME_HEIGHT - 18, this.getAudioLabel(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#a1a1aa',
        backgroundColor: '#18181b',
        padding: { x: 6, y: 4 }
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    audioBtn.on('pointerdown', () => {
      SoundManager.toggleMute();
      audioBtn.setText(this.getAudioLabel());
    });
  }

  private getAudioLabel(): string {
    return SoundManager.isMuted() ? '🔇 SOM: OFF' : '🔊 SOM 8-BIT: ON';
  }

  private refreshDifficultySelection(): void {
    for (const [lvl, ui] of this.diffButtons.entries()) {
      const active = lvl === this.selectedDifficulty;
      ui.bg.setFillStyle(active ? 0x065f46 : 0x18181b, 0.95);
      ui.bg.setStrokeStyle(active ? 3 : 1.5, active ? 0x4ade80 : 0x3f3f46);
      ui.title.setColor(active ? '#fde047' : '#ffffff');
      ui.sub.setColor(active ? '#ecfdf5' : '#9ca3af');
    }
  }
}
