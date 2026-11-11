import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/GameBalance';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { UIScene } from './scenes/UIScene';
import { setupAutoLandscapeFullscreen } from './systems/FullscreenManager';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#090d0a',
  pixelArt: true,
  roundPixels: true,
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

const game = new Phaser.Game(config);
setupAutoLandscapeFullscreen(game);

