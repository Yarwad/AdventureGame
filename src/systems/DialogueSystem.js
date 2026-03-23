import Phaser from 'phaser';
import { GAME_W } from '../config.js';

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
      const sy = speaker ? (speaker.y - speaker.displayHeight - 4) : 80;

      this._buildBubble(text, sx, sy);

      this._timer = this.scene.time.delayedCall(2800, () => {
        this._clearBubble(true);
      });
    });
  }

  _buildBubble(text, cx, cy) {
    const pad = 7;
    const maxW = 200;

    const textObj = this.scene.add.text(0, 0, text, {
      fontFamily: 'monospace, "Courier New"',
      fontSize: '9px',
      color: '#ffffff',
      wordWrap: { width: maxW - pad * 2 },
      align: 'center',
    });
    textObj.setDepth(1000);

    const tw = textObj.width + pad * 2;
    const th = textObj.height + pad * 2;

    // Clamp bubble to stay on screen
    const bx = Phaser.Math.Clamp(cx - tw / 2, 4, GAME_W - tw - 4);
    const by = Math.max(cy - th - 6, 4);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(bx, by, tw, th, 4);
    bg.lineStyle(1, 0xffffff, 0.7);
    bg.strokeRoundedRect(bx, by, tw, th, 4);
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
