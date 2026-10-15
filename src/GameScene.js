import Phaser from 'phaser';
import { GAME_W, GAME_H, UI_STRIP_H, SCALE } from './config.js';
import { Player } from './objects/Player.js';
import { ActionRunner } from './systems/ActionRunner.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { RoomSystem } from './systems/RoomSystem.js';
import { BlockerSystem } from './systems/BlockerSystem.js';
import { ParserSystem } from './systems/ParserSystem.js';
import { inventory } from './systems/InventorySystem.js';
import { createPixelFont } from './BitmapFontGen.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.player = null;
    this.characters = new Map();
    this.flags = {};
    this._runner = null;
  }

  preload() {
    this.load.spritesheet('character', 'assets/character.png', {
      frameWidth: 34,
      frameHeight: 86,
    });
  }

  create() {
    // Generate pixel-perfect bitmap font from Press Start 2P
    createPixelFont(this, 'pixel', 8 * SCALE);

    // Use module-level inventory singleton (no registry timing issues)
    this.inventory = inventory;

    // Initialize registry defaults for UI state
    if (!this.registry.get('uiMode')) {
      this.registry.set('uiMode', 'popup');
      this.registry.set('activeVerb', 'lookAt');
      this.registry.set('hoveredObject', null);
      this.registry.set('statusText', '');
    }

    // Create player at a default position (room load will reposition)
    this.player = new Player(this, GAME_W * 0.35, GAME_H * 0.72);

    // Systems
    this.dialogue = new DialogueSystem(this);
    this.roomSystem = new RoomSystem(this);
    this.blockers = new BlockerSystem(this);
    this.parser = new ParserSystem(this);

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

    // Walk-area bounds overlay (shown while tuning in Settings > Size)
    this._walkAreaGfx = this.add.graphics().setDepth(930);
    this._walkAreaLabels = [
      this.add.bitmapText(0, 0, 'pixel', 'FAR',  8 * SCALE).setTint(0x66ccff).setDepth(931).setVisible(false),
      this.add.bitmapText(0, 0, 'pixel', 'NEAR', 8 * SCALE).setTint(0xffcc44).setDepth(931).setVisible(false),
    ];
    const renderWalkArea = () => this._renderWalkArea();
    this.registry.events.on('changedata-showWalkArea',   renderWalkArea);
    this.registry.events.on('changedata-walkAreaTop',    renderWalkArea);
    this.registry.events.on('changedata-walkAreaBottom', renderWalkArea);

    // Input: click on background = walk (or dismiss dialogue)
    this.input.on('pointerdown', (pointer) => {
      if (this.registry.get('blockerDrawMode')) return;
      if (this.registry.get('parserPaused')) return;
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

    // Arrow key cursors
    this.cursors = this.input.keyboard.createCursorKeys();

    // Load initial room with a fade-in
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.roomSystem.loadRoom('room1', Math.round(GAME_W * 0.35), Math.round(GAME_H * 0.72));
  }

  _walkPlayerTo(x, y) {
    this.player.walkTo(x, y);

    // Brief walk marker
    this._walkMarker.clear();
    this._walkMarker.fillStyle(0xffffff, 0.7);
    this._walkMarker.fillCircle(x, y, 4 * SCALE);
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
    // Arrow key movement when enabled (always on in parser mode, but not while
    // a parser message window is up).
    if ((this.registry.get('arrowKeys') || this.registry.get('parserMode')) && this.cursors
        && !this.registry.get('parserPaused')) {
      const dir = { x: 0, y: 0 };
      if (this.cursors.left.isDown)  dir.x = -1;
      if (this.cursors.right.isDown) dir.x = 1;
      if (this.cursors.up.isDown)    dir.y = -1;
      if (this.cursors.down.isDown)  dir.y = 1;

      if (dir.x !== 0 || dir.y !== 0) {
        this.player.moveDirection(dir.x, dir.y, dt);
      } else {
        this.player.stopDirection();
      }
    }

    this.player.update(dt);

    // NPCs wander, but hold still during cutscenes and parser message windows.
    if (!this._runner.running && !this.registry.get('parserPaused')) {
      this.characters.forEach(c => c.update && c.update(dt));
    }

    this._checkEdgeExit();
  }

  _checkEdgeExit() {
    if (this._runner.running) return;
    if (this.registry.get('parserPaused')) return;
    const ee = this.roomSystem.currentRoom?.edgeExits;
    if (!ee) return;
    const px = this.player.x, py = this.player.y;
    const margin = 12 * SCALE;
    // Vertical exits trigger at the walk-area bounds: the walk area rarely
    // reaches the screen's top/bottom edge, and arrow movement clamps Y to it,
    // so a screen-edge margin alone would be unreachable.
    const [walkTop, walkBottom] = this.player.walkAreaY;
    const topY    = Math.max(margin, walkTop + 2 * SCALE);
    const bottomY = Math.min(GAME_H - margin, walkBottom - 2 * SCALE);
    let exit = null;
    if      (ee.right  && px >= GAME_W - margin) exit = ee.right;
    else if (ee.left   && px <= margin)          exit = ee.left;
    else if (ee.top    && py <= topY)            exit = ee.top;
    else if (ee.bottom && py >= bottomY)         exit = ee.bottom;
    if (exit) {
      this._runner.run([{ type: 'goTo', room: exit.toRoom, spawnX: exit.spawnX, spawnY: exit.spawnY }]);
    }
  }

  getInteractables() {
    return this.roomSystem.getInteractables();
  }

  _renderWalkArea() {
    const g = this._walkAreaGfx;
    if (!g) return;
    g.clear();
    this._walkAreaLabels?.forEach(l => l.setVisible(false));
    if (!this.registry.get('showWalkArea')) return;

    const top = (this.registry.get('walkAreaTop') ?? 0) * SCALE;
    const bot = (this.registry.get('walkAreaBottom') ?? 0) * SCALE;

    g.fillStyle(0x44aaff, 0.12);
    g.fillRect(0, top, GAME_W, Math.max(0, bot - top));
    g.lineStyle(1, 0x66ccff, 0.9);
    g.lineBetween(0, top, GAME_W, top);
    g.lineStyle(1, 0xffcc44, 0.9);
    g.lineBetween(0, bot, GAME_W, bot);

    const [farL, nearL] = this._walkAreaLabels || [];
    if (farL)  farL.setVisible(true).setPosition(GAME_W - farL.width - 3 * SCALE, top + 1 * SCALE);
    if (nearL) nearL.setVisible(true).setPosition(GAME_W - nearL.width - 3 * SCALE, bot - nearL.height - 1 * SCALE);
  }
}
