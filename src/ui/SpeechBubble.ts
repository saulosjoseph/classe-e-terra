import Phaser from 'phaser';

const BUBBLE_WIDTH = 230;
const PADDING = 10;
const HINT_GAP = 6;
const TAIL_HEIGHT = 9;
const TAIL_HALF_WIDTH = 7;
const TAP_TOLERANCE_PX = 10;
const CORNER_RADIUS = 6;
const FADE_OUT_MS = 200;
const DEPTH = 50000;

/**
 * Balão de fala com tamanho fixo na tela.
 * Vive em espaço de mundo com escala 1 / zoom da câmera, então suas unidades locais são pixels reais.
 * A origem fica na ponta da cauda, que deve ser posicionada logo acima da cabeça do personagem.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, text: string) {
    super(scene, 0, 0);

    const label = scene.add.text(0, 0, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#f4f4f5',
      align: 'left',
      lineSpacing: 4,
      wordWrap: { width: BUBBLE_WIDTH - PADDING * 2 }
    });
    label.setResolution(window.devicePixelRatio || 1);

    const hint = scene.add.text(0, 0, 'Toque para continuar', {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: '#facc15',
      align: 'center'
    });
    hint.setResolution(window.devicePixelRatio || 1);

    const bubbleHeight = label.height + HINT_GAP + hint.height + PADDING * 2;
    const top = -(TAIL_HEIGHT + bubbleHeight);
    label.setOrigin(0.5, 0).setPosition(0, top + PADDING);
    hint.setOrigin(0.5, 0).setPosition(0, top + PADDING + label.height + HINT_GAP);
    scene.tweens.add({
      targets: hint,
      alpha: 0.35,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const bg = scene.add.graphics();
    bg.fillStyle(0x090d0a, 0.96);
    bg.lineStyle(2, 0xfacc15, 1);
    bg.fillRoundedRect(-BUBBLE_WIDTH / 2, top, BUBBLE_WIDTH, bubbleHeight, CORNER_RADIUS);
    bg.strokeRoundedRect(-BUBBLE_WIDTH / 2, top, BUBBLE_WIDTH, bubbleHeight, CORNER_RADIUS);
    bg.fillStyle(0x090d0a, 0.96);
    bg.fillTriangle(-TAIL_HALF_WIDTH, -TAIL_HEIGHT - 1, TAIL_HALF_WIDTH, -TAIL_HEIGHT - 1, 0, 0);
    bg.lineStyle(2, 0xfacc15, 1);
    bg.lineBetween(-TAIL_HALF_WIDTH, -TAIL_HEIGHT, 0, 0);
    bg.lineBetween(TAIL_HALF_WIDTH, -TAIL_HEIGHT, 0, 0);

    this.add([bg, label, hint]);
    this.setDepth(DEPTH);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-BUBBLE_WIDTH / 2, top, BUBBLE_WIDTH, bubbleHeight + TAIL_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    this.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() < TAP_TOLERANCE_PX) {
        this.emit('tap');
        this.dismiss();
      }
    });

    scene.add.existing(this);
  }

  public followAnchor(x: number, y: number, cameraZoom: number): void {
    this.setPosition(x, y).setScale(1 / cameraZoom);
  }

  public dismiss(): void {
    this.disableInteractive();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: FADE_OUT_MS,
      onComplete: () => this.destroy()
    });
  }
}
