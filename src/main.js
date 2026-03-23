import './style.css';
import Phaser from 'phaser';
import { GameScene } from './GameScene.js';
import { UIScene } from './UIScene.js';
import { GAME_W, GAME_H } from './config.js';

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
