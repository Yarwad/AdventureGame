import Phaser from 'phaser';
import { GAME_W, SCALE } from '../config.js';

const FONT_KEY = 'pixel';
const FONT_SIZE = 8 * SCALE;
const MAX_LINE_CHARS = 20;

export class DialogueSystem {
  constructor(scene) {
    this.scene = scene;
    this._bubble = null;
    this._timer = null;
    this._resolve = null;
  }

  say(text, speakerSprite = null) {
    return new Promise(resolve => {
      this._clearBubble(false); // clear without resolving old promise
      this._resolve = resolve;

      const speaker = speakerSprite || this.scene.player?.sprite;
      const sx = speaker ? speaker.x : GAME_W / 2;
      const sy = speaker ? (speaker.y - speaker.displayHeight - 4 * SCALE) : 40 * SCALE;

      this._buildBubble(text, sx, sy);

      this._timer = this.scene.time.delayedCall(2800, () => {
        this._clearBubble(true);
      });
    });
  }

  _wrapText(text) {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (test.length > MAX_LINE_CHARS && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.join('\n');
  }

  _buildBubble(text, cx, cy) {
    const pad = 4 * SCALE;
    const wrapped = this._wrapText(text);

    const textObj = this.scene.add.bitmapText(0, 0, FONT_KEY, wrapped, FONT_SIZE)
      .setTint(0xffffff)
      .setDepth(1000);

    const tw = textObj.width + pad * 2;
    const th = textObj.height + pad * 2;

    // Clamp bubble to stay on screen
    const bx = Phaser.Math.Clamp(cx - tw / 2, 4 * SCALE, GAME_W - tw - 4 * SCALE);
    const by = Math.max(cy - th - 6 * SCALE, 4 * SCALE);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(bx, by, tw, th, 3 * SCALE);
    bg.lineStyle(1, 0xffffff, 0.7);
    bg.strokeRoundedRect(bx, by, tw, th, 3 * SCALE);
    bg.setDepth(999);

    textObj.setPosition(bx + pad, by + pad);

    this._bubble = { bg, textObj };
  }

  _clearBubble(resolve) {
    if (this._timer) {
      this._timer.remove();
      this._timer = null;
    }
    if (this._bubble) {
      this._bubble.bg.destroy();
      this._bubble.textObj.destroy();
      this._bubble = null;
    }
    if (resolve && this._resolve) {
      const r = this._resolve;
      this._resolve = null;
      r();
    }
  }

  dismissOnClick() {
    if (this._bubble) {
      this._clearBubble(true);
    }
  }

  destroy() {
    this._clearBubble(false);
  }
}
