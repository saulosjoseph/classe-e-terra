import Phaser from 'phaser';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config/GameBalance';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { UIScene } from './scenes/UIScene';
import { setupAutoLandscapeFullscreen } from './systems/FullscreenManager';

const TEXT_SIZE_SCALE = 1.2;

function scaleFontSize(size: string | number | undefined): string | number | undefined {
  if (size === undefined) return size;
  const px = typeof size === 'number' ? size : parseFloat(size);
  if (!Number.isFinite(px)) return size;
  return `${px * TEXT_SIZE_SCALE}px`;
}

/**
 * Configura globalmente a fábrica de textos do Phaser para renderizar em alta definição (HiDPI/Retina)
 * com filtro linear suave e fonte limpa de fácil leitura, mantendo os sprites em Pixel Art nítidos.
 */
function installCrispTextDefaults(): void {
  const textProto = Phaser.GameObjects.GameObjectFactory.prototype as {
    text: (
      this: Phaser.GameObjects.GameObjectFactory,
      x: number,
      y: number,
      text: string | string[],
      style?: Phaser.Types.GameObjects.Text.TextStyle
    ) => Phaser.GameObjects.Text;
    __crispPatched?: boolean;
  };

  if (textProto.__crispPatched) return;
  textProto.__crispPatched = true;

  const origText = textProto.text;
  const hiDpiResolution = Math.max(2, Math.min(3, Math.ceil(window.devicePixelRatio || 2)));
  const cleanFontStack =
    'Roboto, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

  textProto.text = function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    text: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const mergedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      ...style,
      fontFamily: cleanFontStack,
      fontSize: scaleFontSize(style?.fontSize),
      resolution: style?.resolution ?? hiDpiResolution
    };
    const txtObj = origText.call(this, x, y, text, mergedStyle);
    if (txtObj.texture) {
      txtObj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    return txtObj;
  };
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#090d0a',
  roundPixels: true,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'game-container'
  },
  input: {
    activePointers: 2
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene]
};

const fontsReady = Promise.all([
  document.fonts.load('400 16px Roboto'),
  document.fonts.load('700 16px Roboto')
]).catch(() => undefined);

installCrispTextDefaults();

fontsReady.then(() => {
  const game = new Phaser.Game(config);
  setupAutoLandscapeFullscreen(game);
  (window as unknown as { game: Phaser.Game }).game = game;
});

