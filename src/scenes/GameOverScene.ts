import Phaser from 'phaser';
import { DIFFICULTY_CONFIGS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameBalance';
import { SoundManager } from '../audio/SoundManager';
import { toggleGameFullscreen } from '../systems/FullscreenManager';
import { GameStatsResult } from '../types/GameTypes';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  public create(stats: GameStatsResult): void {
    SoundManager.stopMusic();
    if (stats.victory) {
      SoundManager.playVictory();
    } else {
      SoundManager.playDefeat();
    }

    const bg = this.add.graphics();
    if (stats.victory) {
      bg.fillGradientStyle(0x052e16, 0x064e3b, 0x0c4a6e, 0x14532d, 1);
    } else {
      bg.fillGradientStyle(0x000000, 0x09090b, 0x18181b, 0x000000, 1);
    }
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const badge = stats.victory ? '✊ VITÓRIA POPULAR!' : '⚫ FLORESTA CONSUMIDA';
    const titleColor = stats.victory ? '#4ade80' : '#d4d4d8';

    this.add
      .text(GAME_WIDTH / 2, 42, badge, {
        fontFamily: 'Courier New, monospace',
        fontSize: '26px',
        fontStyle: 'bold',
        color: titleColor,
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 82, stats.reason, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#f4f4f5',
        align: 'center',
        wordWrap: { width: 620 }
      })
      .setOrigin(0.5);

    const diffCfg = DIFFICULTY_CONFIGS[stats.difficulty];
    const panel = this.add
      .rectangle(235, 232, 390, 210, 0x090d0a, 0.88)
      .setStrokeStyle(2, stats.victory ? 0x22c55e : 0x52525b);

    const reportLines = [
      `DIFICULDADE: ${diffCfg.label}`,
      `CONSCIÊNCIA COLETIVA: ${Math.round(stats.maxConsciousness)}%`,
      `SAÚDE DA FLORESTA: ${Math.round(stats.forestHealthRemaining)}%`,
      `INCÊNDIOS APAGADOS: ${stats.firesExtinguished}`,
      `INCENDIÁRIOS CAPTURADOS: ${stats.arsonistsCaptured}`,
      `AÇÕES INTEGRADAS: ${stats.integratedActionsUsed}`,
      `TEMPO DE LUTA: ${stats.elapsedSeconds}s`
    ];

    this.add
      .text(panel.x, panel.y, reportLines.join('\n'), {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e2e8f0',
        align: 'left',
        lineSpacing: 7
      })
      .setOrigin(0.5);

    const retryBtn = this.add
      .rectangle(575, 198, 235, 58, 0x16a34a, 1)
      .setStrokeStyle(3, 0x86efac)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(575, 198, '🔄 JOGAR NOVAMENTE', {
        fontFamily: 'Courier New, monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#052e16'
      })
      .setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      SoundManager.playSelect();
      this.scene.start('GameScene', { difficulty: stats.difficulty });
    });

    const menuBtn = this.add
      .rectangle(575, 272, 235, 52, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(575, 272, '⚙️ MENU / DIFICULDADE', {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    menuBtn.on('pointerdown', () => {
      SoundManager.playSelect();
      this.scene.start('MenuScene');
    });

    const fullscreenBtn = this.add
      .text(575, 336, this.getFullscreenLabel(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#a1a1aa',
        backgroundColor: '#18181b',
        padding: { x: 8, y: 5 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    fullscreenBtn.on('pointerup', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      SoundManager.playSelect();
      this.toggleFullscreen();
    });

    const onFullscreenChange = () => {
      if (fullscreenBtn.active) {
        fullscreenBtn.setText(this.getFullscreenLabel());
      }
    };

    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, onFullscreenChange);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, onFullscreenChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, onFullscreenChange);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, onFullscreenChange);
    });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-F', () => {
        this.toggleFullscreen();
      });
    }
  }

  private toggleFullscreen(): void {
    toggleGameFullscreen(this.scale);
  }

  private getFullscreenLabel(): string {
    return this.scale.isFullscreen ? '🗗 SAIR TELA CHEIA (F)' : '⛶ TELA CHEIA (F)';
  }
}
