import { Hotspot } from '../objects/Hotspot.js';
import { WorldItem } from '../objects/WorldItem.js';
import { Character } from '../objects/Character.js';
import { GAME_W, GAME_H } from '../config.js';

export class RoomSystem {
  constructor(scene) {
    this.scene = scene;
    this._entities = [];
    this._background = null;
    this.currentRoom = null;
  }

  async loadRoom(roomId, spawnX, spawnY) {
    this._cleanup();

    const res = await fetch(`/rooms/${roomId}.json`);
    const data = await res.json();
    this.currentRoom = data;

    const scene = this.scene;

    // Background image
    if (data.background) {
      const bgKey = `bg_${roomId}`;
      if (!scene.textures.exists(bgKey)) {
        await this._loadTexture(bgKey, data.background);
      }
      this._background = scene.add.image(0, 0, bgKey)
        .setOrigin(0, 0)
        .setDisplaySize(GAME_W, GAME_H)
        .setDepth(0);
    } else {
      scene.cameras.main.setBackgroundColor(data.backgroundColor || '#111827');
    }

    // Hotspots
    for (const hData of (data.hotspots || [])) {
      this._entities.push(new Hotspot(scene, hData));
    }

    // World items
    for (const iData of (data.items || [])) {
      const imgKey = `item_${iData.id}`;
      if (iData.image && !scene.textures.exists(imgKey)) {
        await this._loadTexture(imgKey, iData.image).catch(() => {});
      }
      this._entities.push(new WorldItem(scene, iData));
    }

    // Characters
    scene.characters.clear();
    for (const cData of (data.characters || [])) {
      const spriteKey = `char_${cData.id}`;
      if (cData.sprite && !scene.textures.exists(spriteKey)) {
        await this._loadTexture(spriteKey, cData.sprite).catch(() => {});
      }
      const char = new Character(scene, cData);
      this._entities.push(char);
      scene.characters.set(cData.id, char);
    }

    // Exits — treated as hotspots with walkTo → goTo
    for (const exit of (data.exits || [])) {
      const exitData = {
        ...exit,
        verbs: {
          walkTo: [
            { type: 'goTo', room: exit.toRoom, spawnX: exit.spawnX, spawnY: exit.spawnY },
          ],
        },
      };
      this._entities.push(new Hotspot(scene, exitData));
    }

    // Update player walk area + depth scale
    if (data.walkAreaY) scene.player.walkAreaY = data.walkAreaY;
    if (data.depthScale) scene.player.depthScale = data.depthScale;

    // Position player at spawn
    if (spawnX !== undefined && spawnY !== undefined) {
      scene.player.setPosition(spawnX, spawnY);
    }

    // Ensure player sprite is on top of room entities
    scene.player.sprite.setDepth(scene.player.y);

    scene.registry.set('currentRoom', data.id);
    scene.registry.set('roomTitle', data.title || '');
    return data;
  }

  removeWorldItem(id) {
    const idx = this._entities.findIndex(e => e.type === 'item' && e.id === id);
    if (idx >= 0) {
      this._entities[idx].destroy();
      this._entities.splice(idx, 1);
    }
  }

  _cleanup() {
    this._entities.forEach(e => e.destroy());
    this._entities = [];
    this.scene.characters.clear();
    if (this._background) {
      this._background.destroy();
      this._background = null;
    }
  }

  _loadTexture(key, url) {
    return new Promise((resolve, reject) => {
      this.scene.load.image(key, url);
      this.scene.load.once('complete', resolve);
      this.scene.load.once('loaderror', reject);
      this.scene.load.start();
    });
  }
}
