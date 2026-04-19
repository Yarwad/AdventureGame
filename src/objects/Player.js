import Phaser from 'phaser';
import { GAME_W, SCALE } from '../config.js';

const DIRS = {
  right: { key: 'walk_right', start: 0,  end: 5,  idle: 0  },
  left:  { key: 'walk_left',  start: 6,  end: 11, idle: 6  },
  down:  { key: 'walk_down',  start: 12, end: 17, idle: 12 },
  up:    { key: 'walk_up',    start: 18, end: 23, idle: 18 },
};

export class Player {
  constructor(scene, x, y, walkAreaY = [100 * SCALE, 160 * SCALE], depthScale = { top: 0.5, bottom: 1.0 }) {
    this.scene = scene;
    this.walkAreaY = walkAreaY;
    this.depthScale = depthScale;
    this.speed = 90 * SCALE;
    this.target = null;
    this._onArrived = null;
    this._dirMoving = false;
    this.facing = 'down';

    this.sprite = scene.add.sprite(x, y, 'character', DIRS.down.idle);
    this.sprite.setOrigin(0.5, 1.0);
    this._updateScale(y);
    this.sprite.setDepth(y);

    for (const dir of Object.values(DIRS)) {
      if (!scene.anims.exists(dir.key)) {
        scene.anims.create({
          key: dir.key,
          frames: scene.anims.generateFrameNumbers('character', { start: dir.start, end: dir.end }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }
  }

  _pickFacing(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  _playWalk(dx, dy) {
    const next = this._pickFacing(dx, dy);
    if (this.facing !== next || !this.sprite.anims.isPlaying) {
      this.facing = next;
      this.sprite.play(DIRS[next].key);
    }
  }

  _idleFrame() {
    this.sprite.anims.stop();
    this.sprite.setFrame(DIRS[this.facing].idle);
  }

  _updateScale(y) {
    const [minY, maxY] = this.walkAreaY;
    const t = Phaser.Math.Clamp((y - minY) / (maxY - minY || 1), 0, 1);
    const scale = Phaser.Math.Linear(this.depthScale.top, this.depthScale.bottom, t);
    this.sprite.setScale(scale * SCALE);
  }

  walkTo(x, y) {
    return new Promise(resolve => {
      this.target = new Phaser.Math.Vector2(x, y);
      this._onArrived = resolve;
    });
  }

  stopWalking() {
    this.target = null;
    const resolve = this._onArrived;
    this._onArrived = null;
    this._idleFrame();
    if (resolve) resolve();
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this._updateScale(y);
    this.sprite.setDepth(y);
  }

  update(dt) {
    if (!this.target) return;

    const d = dt / 1000;
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4 * SCALE) {
      const resolve = this._onArrived;
      this.target = null;
      this._onArrived = null;
      this._idleFrame();
      if (resolve) resolve();
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    this._playWalk(nx, ny);

    this.sprite.x += nx * this.speed * d;
    this.sprite.y += ny * this.speed * d;

    this._updateScale(this.sprite.y);
    this.sprite.setDepth(this.sprite.y);
  }

  moveDirection(dx, dy, dt) {
    // Cancel any click-to-walk target
    if (this.target) {
      this.target = null;
      this._onArrived = null;
    }

    const d = dt / 1000;
    const len = Math.hypot(dx, dy);
    const nx = dx / len;
    const ny = dy / len;

    const newX = this.sprite.x + nx * this.speed * d;
    const newY = this.sprite.y + ny * this.speed * d;

    // Clamp Y to walk area
    const [minY, maxY] = this.walkAreaY;
    const clampedY = Phaser.Math.Clamp(newY, minY, maxY);

    // Clamp X to screen bounds
    const clampedX = Phaser.Math.Clamp(newX, 8 * SCALE, GAME_W - 8 * SCALE);

    this.sprite.setPosition(clampedX, clampedY);
    this._playWalk(nx, ny);
    this._updateScale(clampedY);
    this.sprite.setDepth(clampedY);
    this._dirMoving = true;
  }

  stopDirection() {
    if (this._dirMoving) {
      this._dirMoving = false;
      if (!this.target) this._idleFrame();
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  destroy() {
    this.sprite.destroy();
  }
}
