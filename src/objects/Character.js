import { SCALE } from '../config.js';

export class Character {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.label = data.label;
    this.verbs = data.verbs || {};
    this.type = 'character';

    const spriteKey = `char_${data.id}`;

    if (scene.textures.exists(spriteKey)) {
      this.sprite = scene.add.sprite(data.x, data.y, spriteKey, 0)
        .setOrigin(0.5, 1.0)
        .setScale(SCALE)
        .setDepth(data.y);
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

    // Interaction zone
    const zoneW = 48 * SCALE, zoneH = 64 * SCALE;
    this.zone = scene.add.zone(data.x - zoneW / 2, data.y - zoneH, zoneW, zoneH)
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
        x: data.x,
        y: data.y,
        label: this.label,
        verbs: this.verbs,
        source: this,
      });
    });
  }

  destroy() {
    this.sprite.destroy();
    this.zone.destroy();
  }
}
