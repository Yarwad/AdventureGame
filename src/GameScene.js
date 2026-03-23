import Phaser from 'phaser';
import { GAME_W, GAME_H, UI_STRIP_H } from './config.js';
import { Player } from './objects/Player.js';
import { ActionRunner } from './systems/ActionRunner.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { RoomSystem } from './systems/RoomSystem.js';
import { inventory } from './systems/InventorySystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.player = null;
    this.characters = new Map();
    this.flags = {};
    this._runner = null;
  }

  preload() {
    this.load.spritesheet('player_walk', '/assets/player_walk.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    // Use module-level inventory singleton (no registry timing issues)
    this.inventory = inventory;

    // Initialize registry defaults for UI state
    if (!this.registry.get('uiMode')) {
      this.registry.set('uiMode', 'verbBar');
      this.registry.set('activeVerb', 'lookAt');
      this.registry.set('hoveredObject', null);
      this.registry.set('statusText', '');
    }

    // Create player at a default position (room load will reposition)
    this.player = new Player(this, GAME_W * 0.35, GAME_H * 0.72);

    // Systems
    this.dialogue = new DialogueSystem(this);
    this.roomSystem = new RoomSystem(this);

    // Action runner
    this._runner = new ActionRunner({
      scene: this,
      player: this.player,
      inventory: this.inventory,
      flags: this.flags,
      dialogue: this.dialogue,
    });

    // Walk marker
    this._walkMarker = this.add.graphics().setDepth(950);

    // Input: click on background = walk (or dismiss dialogue)
    this.input.on('pointerdown', (pointer) => {
      this.dialogue.dismissOnClick();

      const uiMode = this.registry.get('uiMode') || 'verbBar';
      const activeVerb = this.registry.get('activeVerb') || 'lookAt';

      // Ignore clicks in the UI strip area in Mode A
      if (uiMode === 'verbBar' && pointer.y >= GAME_H - UI_STRIP_H) return;

      if (activeVerb === 'walkTo') {
        this._runner.cancel();
        this._walkPlayerTo(pointer.worldX, pointer.worldY);
      }
    });

    // Object hover → update registry for UIScene status line
    this.events.on('objectHover', (data) => {
      this.registry.set('hoveredObject', data);
    });

    // Object click → run verb actions
    this.events.on('objectClick', (data) => {
      this._handleObjectClick(data);
    });

    // Narrate action updates status line
    this.events.on('narrate', (text) => {
      this.registry.set('statusText', text);
    });

    // Load initial room with a fade-in
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.roomSystem.loadRoom('room1', Math.round(GAME_W * 0.35), Math.round(GAME_H * 0.72));
  }

  _walkPlayerTo(x, y) {
    this.player.walkTo(x, y);

    // Brief walk marker
    this._walkMarker.clear();
    this._walkMarker.fillStyle(0xffffff, 0.7);
    this._walkMarker.fillCircle(x, y, 4);
    this.time.delayedCall(500, () => this._walkMarker.clear());
  }

  _handleObjectClick(data) {
    const uiMode = this.registry.get('uiMode') || 'verbBar';

    if (uiMode === 'verbBar') {
      const verb = this.registry.get('activeVerb') || 'lookAt';

      if (verb === 'walkTo') {
        // Walk to the object's position
        this._walkPlayerTo(data.x, data.y);
        return;
      }

      const actions = data.verbs?.[verb];
      if (actions && actions.length > 0) {
        this._runner.run(actions);
      } else {
        this._runner.run([{ type: 'say', text: "I can't do that." }]);
      }
    } else {
      // Mode B: show popup with available verbs near click point
      this.events.emit('showVerbPopup', data);
    }
  }

  removeWorldItem(id) {
    this.roomSystem.removeWorldItem(id);
  }

  async goToRoom(roomId, spawnX, spawnY) {
    return new Promise(resolve => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', async () => {
        await this.roomSystem.loadRoom(roomId, spawnX, spawnY);
        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.cameras.main.once('camerafadeincomplete', resolve);
      });
    });
  }

  runActions(actions) {
    this._runner.run(actions);
  }

  update(_t, dt) {
    this.player.update(dt);
  }
}
