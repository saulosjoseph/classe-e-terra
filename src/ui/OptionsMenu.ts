import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameBalance';
import { SoundManager } from '../audio/SoundManager';

const SHOW_FPS_STORAGE_KEY = 'classe-e-terra:show-fps';
const FPS_REFRESH_MS = 250;

function loadShowFpsPreference(): boolean {
  try {
    return window.localStorage.getItem(SHOW_FPS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveShowFpsPreference(show: boolean): void {
  try {
    window.localStorage.setItem(SHOW_FPS_STORAGE_KEY, show ? '1' : '0');
  } catch {
    // Armazenamento indisponível (modo privado, por exemplo): a preferência vale só nesta sessão
  }
}

/**
 * Menu de opções aberto com ESC. Enquanto está aberto, a partida fica pausada
 * pelo mesmo flag usado pelos modais de história.
 */
export class OptionsMenu {
  private readonly scene: Phaser.Scene;
  private readonly pauseTarget: { isStoryModalOpen: boolean };
  private container: Phaser.GameObjects.Container | null = null;
  private toggleLabel: Phaser.GameObjects.Text | null = null;
  private wasStoryModalOpen = false;
  private showFps: boolean;
  private readonly fpsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, pauseTarget: { isStoryModalOpen: boolean }) {
    this.scene = scene;
    this.pauseTarget = pauseTarget;
    this.showFps = loadShowFpsPreference();

    this.fpsText = scene.add
      .text(14, 42, '', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#86efac',
        backgroundColor: '#090d0acc',
        padding: { x: 4, y: 2 }
      })
      .setDepth(90)
      .setVisible(this.showFps);

    scene.time.addEvent({
      delay: FPS_REFRESH_MS,
      loop: true,
      callback: () => this.refreshFps()
    });
  }

  public isOpen(): boolean {
    return this.container !== null;
  }

  public toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    if (this.isOpen()) return;
    this.wasStoryModalOpen = this.pauseTarget.isStoryModalOpen;
    this.pauseTarget.isStoryModalOpen = true;

    const container = this.scene.add.container(0, 0).setDepth(300);
    this.container = container;

    const backdrop = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 420;
    const boxH = 200;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.scene.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const title = this.scene.add
      .text(boxX, boxY - boxH / 2 + 28, '⚙ OPÇÕES', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);

    const btnW = 300;
    const btnH = 38;
    const fpsBtnY = boxY - 10;
    const closeBtnY = boxY + boxH / 2 - 36;

    const fpsBtn = this.scene.add
      .rectangle(boxX, fpsBtnY, btnW, btnH, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    this.toggleLabel = this.scene.add
      .text(boxX, fpsBtnY, this.getFpsLabel(), {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    const closeBtn = this.scene.add
      .rectangle(boxX, closeBtnY, btnW, btnH, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    const closeText = this.scene.add
      .text(boxX, closeBtnY, 'Fechar (ESC)', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    fpsBtn.on('pointerup', () => {
      SoundManager.unlock();
      SoundManager.playSelect();
      this.setShowFps(!this.showFps);
    });
    backdrop.on('pointerup', () => this.close());
    closeBtn.on('pointerup', () => this.close());

    container.add([
      backdrop,
      boxBg,
      title,
      fpsBtn,
      this.toggleLabel,
      closeBtn,
      closeText
    ]);
  }

  private close(): void {
    if (!this.isOpen()) return;
    SoundManager.unlock();
    this.pauseTarget.isStoryModalOpen = this.wasStoryModalOpen;
    this.container?.destroy();
    this.container = null;
    this.toggleLabel = null;
  }

  private setShowFps(show: boolean): void {
    this.showFps = show;
    saveShowFpsPreference(show);
    this.fpsText.setVisible(show);
    this.toggleLabel?.setText(this.getFpsLabel());
    if (show) this.refreshFps();
  }

  private getFpsLabel(): string {
    return `Mostrar FPS: ${this.showFps ? 'SIM' : 'NÃO'}`;
  }

  private refreshFps(): void {
    if (!this.showFps) return;
    const fps = Math.round(this.scene.game.loop.actualFps);
    this.fpsText.setText(`${fps} FPS`);
  }
}
