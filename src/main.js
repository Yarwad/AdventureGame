import './style.css';
import Phaser from 'phaser';
import { GameScene } from './GameScene.js';
import { UIScene } from './UIScene.js';
import { GAME_W, GAME_H, SCALE } from './config.js';

// Explicitly request the pixel font before booting — document.fonts.ready alone
// resolves immediately if nothing on the page has triggered the font's load yet,
// causing BitmapFontGen to measure a fallback font on first visit.
document.fonts.load(`${8 * SCALE}px "Press Start 2P"`).then(() => {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: GAME_W,
    height: GAME_H,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    backgroundColor: '#000000',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene, UIScene],
  });
});
