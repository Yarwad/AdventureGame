export class Hotspot {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.label = data.label;
    this.verbs = data.verbs || {};
    this.type = 'hotspot';

    const { x, y, w, h } = data;

    this.zone = scene.add.zone(x, y, w, h)
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
        x: x + w / 2,
        y: y,
        label: this.label,
        verbs: this.verbs,
        source: this,
      });
    });

    // Debug outline in dev mode
    if (import.meta.env?.DEV) {
      this._debug = scene.add.graphics();
      this._debug.lineStyle(1, 0xff4444, 0.35);
      this._debug.strokeRect(x, y, w, h);
      this._debug.setDepth(901);
    }
  }

  destroy() {
    this.zone.destroy();
    this._debug?.destroy();
  }
}
