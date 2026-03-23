import Phaser from 'phaser';

export class Player {
  constructor(scene, x, y, walkAreaY = [200, 320], depthScale = { top: 0.5, bottom: 1.0 }) {
    this.scene = scene;
    this.walkAreaY = walkAreaY;
    this.depthScale = depthScale;
    this.speed = 180;
    this.target = null;
    this._onArrived = null;

    this.sprite = scene.add.sprite(x, y, 'player_walk', 0);
    this.sprite.setOrigin(0.5, 1.0);
    this._updateScale(y);
    this.sprite.setDepth(y);

    if (!scene.anims.exists('walk')) {
      scene.anims.create({
        key: 'walk',
        frames: scene.anims.generateFrameNumbers('player_walk', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  _updateScale(y) {
    const [minY, maxY] = this.walkAreaY;
    const t = Phaser.Math.Clamp((y - minY) / (maxY - minY || 1), 0, 1);
    const scale = Phaser.Math.Linear(this.depthScale.top, this.depthScale.bottom, t);
    this.sprite.setScale(scale);
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
    this.sprite.anims.stop();
    this.sprite.setFrame(0);
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

    if (dist < 4) {
      const resolve = this._onArrived;
      this.target = null;
      this._onArrived = null;
      this.sprite.anims.stop();
      this.sprite.setFrame(0);
      if (resolve) resolve();
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    this.sprite.setFlipX(nx < 0);
    if (!this.sprite.anims.isPlaying) this.sprite.play('walk');

    this.sprite.x += nx * this.speed * d;
    this.sprite.y += ny * this.speed * d;

    this._updateScale(this.sprite.y);
    this.sprite.setDepth(this.sprite.y);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  destroy() {
    this.sprite.destroy();
  }
}
