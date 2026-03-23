export class WorldItem {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.label = data.label;
    this.verbs = data.verbs || {};
    this.type = 'item';

    const imgKey = `item_${data.id}`;

    if (scene.textures.exists(imgKey)) {
      this.sprite = scene.add.image(data.x, data.y, imgKey)
        .setOrigin(0.5, 1.0)
        .setDepth(data.y);
    } else {
      // Yellow dot placeholder
      this.sprite = scene.add.circle(data.x, data.y - 8, 7, 0xffcc00, 1)
        .setDepth(data.y);
      // Outline
      this._outline = scene.add.graphics()
        .setDepth(data.y + 1);
      this._outline.lineStyle(1, 0xffa500, 1);
      this._outline.strokeCircle(data.x, data.y - 8, 7);
    }

    // Interaction zone centered on the item
    const zoneW = 32, zoneH = 32;
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
        y: data.y - zoneH / 2,
        label: this.label,
        verbs: this.verbs,
        source: this,
      });
    });
  }

  destroy() {
    this.sprite.destroy();
    this._outline?.destroy();
    this.zone.destroy();
  }
}
