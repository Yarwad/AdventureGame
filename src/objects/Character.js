import Phaser from 'phaser';
import { GAME_W, SCALE } from '../config.js';

// Same 6x4 sheet layout as the player: 6 frames per row, rows right/left/down/up.
// Idle is the "pass" pose (feet together) in the middle of each row.
const DIRS = {
  right: { start: 0,  idle: 2  },
  left:  { start: 6,  idle: 8  },
  down:  { start: 12, idle: 14 },
  up:    { start: 18, idle: 20 },
};

export class Character {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.label = data.label;
    this.verbs = data.verbs || {};
    this.type = 'character';
    this.nouns = data.nouns || [];
    this.speed = (data.speed || 35) * SCALE;
    this.facing = 'down';
    this._animated = false;
    this._target = null;
    // wander: { radius (base px), pauseMs: [min, max] } — ambles around its
    // spawn point within the room's walk area.
    this._wander = data.wander || null;
    this._home = { x: data.x, y: data.y };
    this._idleMs = 1000;

    const spriteKey = `char_${data.id}`;

    if (scene.textures.exists(spriteKey)) {
      const isSheet = !!(data.frameW && data.frameH);
      this._scalable = true;
      this.sprite = scene.add.sprite(data.x, data.y, spriteKey, isSheet ? DIRS.down.idle : 0)
        .setOrigin(0.5, 1.0)
        .setDepth(data.y);
      if (isSheet) {
        this._animated = true;
        for (const [dir, d] of Object.entries(DIRS)) {
          const key = `char_${this.id}_${dir}`;
          if (!scene.anims.exists(key)) {
            scene.anims.create({
              key,
              frames: scene.anims.generateFrameNumbers(spriteKey, { start: d.start, end: d.start + 5 }),
              frameRate: 10,
              repeat: -1,
            });
          }
        }
      }
      this._updateScale(data.y);
    } else {
      // Placeholder NPC: body + head shapes
      const g = scene.add.graphics();
      g.fillStyle(0x4488ff, 1);
      g.fillRect(-10 * SCALE, -36 * SCALE, 20 * SCALE, 24 * SCALE);  // body
      g.fillStyle(0xffccaa, 1);
      g.fillCircle(0, -42 * SCALE, 8 * SCALE);       // head
      g.setPosition(data.x, data.y);
      g.setDepth(data.y);
      this.sprite = g;
    }

    // Interaction zone — follows the sprite when it wanders.
    this._zoneW = 48 * SCALE;
    this._zoneH = 64 * SCALE;
    this.zone = scene.add.zone(data.x - this._zoneW / 2, data.y - this._zoneH, this._zoneW, this._zoneH)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    this.zone.on('pointerover', () => {
      scene.events.emit('objectHover', { label: this.label, verbs: this.verbs });
    });

    this.zone.on('pointerout', () => {
      scene.events.emit('objectHover', null);
    });

    this.zone.on('pointerdown', (_p, _lx, _ly, event) => {
      event.stopPropagation();
      scene.events.emit('objectClick', {
        x: this.sprite.x,
        y: this.sprite.y,
        label: this.label,
        verbs: this.verbs,
        source: this,
      });
    });
  }

  // NPCs shrink toward the horizon like the player does (sprites only; the
  // placeholder graphics are already drawn at canvas scale).
  _updateScale(y) {
    const p = this.scene.player;
    if (!p || !this._scalable) return;
    const [minY, maxY] = p.walkAreaY;
    const t = Phaser.Math.Clamp((y - minY) / (maxY - minY || 1), 0, 1);
    this.sprite.setScale(Phaser.Math.Linear(p.depthScale.top, p.depthScale.bottom, t) * SCALE);
  }

  update(dt) {
    if (!this._wander) return;

    if (!this._target) {
      this._idleMs -= dt;
      if (this._idleMs <= 0) this._pickTarget();
      return;
    }

    const d = dt / 1000;
    const dx = this._target.x - this.sprite.x;
    const dy = this._target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3 * SCALE) return this._arrive();

    const nx = dx / dist, ny = dy / dist;
    const newX = this.sprite.x + nx * this.speed * d;
    const newY = this.sprite.y + ny * this.speed * d;
    if (this.scene.blockers?.isBlocked(newX, newY)) return this._arrive();

    this._face(nx, ny);
    this.sprite.setPosition(newX, newY);
    this.sprite.setDepth(newY);
    this._updateScale(newY);
    this.zone.setPosition(newX - this._zoneW / 2, newY - this._zoneH);
  }

  _pickTarget() {
    const r = (this._wander.radius ?? 60) * SCALE;
    const p = this.scene.player;
    const [minY, maxY] = p ? p.walkAreaY : [this._home.y, this._home.y];
    this._target = {
      x: Phaser.Math.Clamp(this._home.x + Phaser.Math.Between(-r, r), 12 * SCALE, GAME_W - 12 * SCALE),
      y: Phaser.Math.Clamp(this._home.y + Phaser.Math.Between(-r / 2, r / 2), minY, maxY),
    };
  }

  _face(nx, ny) {
    const next = Math.abs(nx) >= Math.abs(ny) ? (nx > 0 ? 'right' : 'left') : (ny > 0 ? 'down' : 'up');
    if (this._animated && (this.facing !== next || !this.sprite.anims.isPlaying)) {
      this.sprite.play(`char_${this.id}_${next}`);
    }
    this.facing = next;
  }

  _arrive() {
    this._target = null;
    const [a, b] = this._wander.pauseMs || [1500, 4000];
    this._idleMs = Phaser.Math.Between(a, b);
    if (this._animated) {
      this.sprite.anims.stop();
      this.sprite.setFrame(DIRS[this.facing].idle);
    }
  }

  destroy() {
    this.sprite.destroy();
    this.zone.destroy();
  }
}
