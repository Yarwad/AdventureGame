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
        .setDepth(data.y);
    } else {
      // Placeholder NPC: body + head shapes
      const g = scene.add.graphics();
      g.fillStyle(0x4488ff, 1);
      g.fillRect(-10, -36, 20, 24);  // body
      g.fillStyle(0xffccaa, 1);
      g.fillCircle(0, -42, 8);       // head
      g.setPosition(data.x, data.y);
      g.setDepth(data.y);
      this.sprite = g;
    }

    // Interaction zone
    const zoneW = 48, zoneH = 64;
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
