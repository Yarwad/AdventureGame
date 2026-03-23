import Phaser from 'phaser';
import { GAME_W, GAME_H, UI_STRIP_H } from './config.js';
import { inventory } from './systems/InventorySystem.js';

const VERBS = [
  { id: 'walkTo',  label: 'Walk To' },
  { id: 'lookAt',  label: 'Look At' },
  { id: 'pickUp',  label: 'Pick Up' },
  { id: 'use',     label: 'Use' },
  { id: 'talkTo',  label: 'Talk To' },
];

const C = {
  barBg:     0x12122a,
  barBorder: 0x3a3a7e,
  btnNormal: 0x1e2a5a,
  btnHover:  0x2e4a8a,
  btnActive: 0x4a70cc,
  btnText:   '#c8d4ff',
  slotBg:    0x0d0d1a,
  slotBorder: 0x3a3a5e,
  slotActive: 0x6a6aee,
  statusText: '#9999cc',
};

const FONT = { fontFamily: '"Press Start 2P", monospace' };
const INV_SLOT  = 22;
const INV_PAD   = 3;
const BTN_W     = 42;
const BTN_H     = 14;
const BTN_PAD   = 2;

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: true });
    this._verbBtns    = [];
    this._invSlots    = [];
    this._statusTxt   = null;
    this._toggleBtn   = null;
    this._uiBar       = null;
    this._verbPopup   = null;
  }

  create() {
    // Transparent camera so GameScene shows through
    this.cameras.main.transparent = true;

    // Ensure registry defaults (GameScene.create runs first, but be safe)
    if (!this.registry.get('uiMode')) this.registry.set('uiMode', 'verbBar');
    if (!this.registry.get('activeVerb')) this.registry.set('activeVerb', 'lookAt');

    this.inventory = inventory;

    // Build permanent toggle button
    this._createToggle();

    // Build mode-specific UI
    this._buildModeUI();

    // Registry watchers
    this.registry.events.on('changedata-uiMode', () => {
      this._clearModeUI();
      this._buildModeUI();
    });

    this.registry.events.on('changedata-hoveredObject', (_p, val) => {
      this._updateStatus(val);
    });

    this.registry.events.on('changedata-statusText', (_p, val) => {
      if (this._statusTxt) this._statusTxt.setText(val || '');
    });

    this.registry.events.on('changedata-currentRoom', () => {
      this._hideVerbPopup();
    });

    // Inventory changes
    if (this.inventory) {
      this.inventory.onChange(() => this._rebuildInventory());
    }

    // Verb popup from GameScene
    const gs = this.scene.get('GameScene');
    gs.events.on('showVerbPopup', (data) => this._showVerbPopup(data));

    // Click outside popup dismisses it
    this.input.on('pointerdown', (pointer) => {
      if (this._verbPopup) {
        const b = this._verbPopup._bounds;
        if (b && !b.contains(pointer.x, pointer.y)) {
          this._hideVerbPopup();
        }
      }
    });
  }

  // ─── Toggle button ───────────────────────────────────────────────────────────

  _createToggle() {
    const tx = GAME_W - 6;
    const ty = GAME_H - 6;

    this._toggleBtn = this.add.text(tx, ty, '☰', {
      ...FONT,
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#333355',
      padding: { x: 5, y: 3 },
    })
      .setOrigin(1, 1)
      .setDepth(1100)
      .setInteractive({ useHandCursor: true });

    this._toggleBtn.on('pointerdown', () => {
      const cur = this.registry.get('uiMode') || 'verbBar';
      this.registry.set('uiMode', cur === 'verbBar' ? 'popup' : 'verbBar');
    });
    this._toggleBtn.on('pointerover', () => this._toggleBtn.setAlpha(0.75));
    this._toggleBtn.on('pointerout',  () => this._toggleBtn.setAlpha(1));
  }

  // ─── Mode UI ─────────────────────────────────────────────────────────────────

  _buildModeUI() {
    const mode = this.registry.get('uiMode') || 'verbBar';
    if (mode === 'verbBar') this._buildVerbBar();
  }

  _clearModeUI() {
    this._uiBar?.destroy();      this._uiBar = null;
    this._statusTxt?.destroy();  this._statusTxt = null;
    this._verbBtns.forEach(b => { b.bg?.destroy(); b.txt?.destroy(); b.zone?.destroy(); });
    this._verbBtns = [];
    this._clearInvSlots();
  }

  // ─── Verb bar ────────────────────────────────────────────────────────────────

  _buildVerbBar() {
    const barY = GAME_H - UI_STRIP_H;

    // Bar background
    this._uiBar = this.add.graphics().setDepth(1000);
    this._uiBar.fillStyle(C.barBg, 1);
    this._uiBar.fillRect(0, barY, GAME_W, UI_STRIP_H);
    this._uiBar.lineStyle(1, C.barBorder, 1);
    this._uiBar.lineBetween(0, barY, GAME_W, barY);

    // Status line
    this._statusTxt = this.add.text(4, barY + 2, '', {
      ...FONT,
      fontSize: '5px',
      color: C.statusText,
    }).setDepth(1001);

    // Verb buttons — 3 on top row, 2 on bottom row (left half)
    const verbBaseX = 3;
    const verbBaseY = barY + 10;

    VERBS.forEach((verb, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx  = verbBaseX + col * (BTN_W + BTN_PAD);
      const by  = verbBaseY + row * (BTN_H + BTN_PAD);
      this._makeVerbButton(verb, bx, by);
    });

    // Inventory slots (right side)
    this._buildInvSlots(barY);

    this._highlightActiveVerb();
  }

  _makeVerbButton(verb, bx, by) {
    const bg = this.add.graphics().setDepth(1001);
    const txt = this.add.text(bx + BTN_W / 2, by + BTN_H / 2, verb.label, {
      ...FONT,
      fontSize: '5px',
      color: C.btnText,
    }).setOrigin(0.5, 0.5).setDepth(1002);

    const zone = this.add.zone(bx, by, BTN_W, BTN_H)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(1003);

    const draw = (color) => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(bx, by, BTN_W, BTN_H, 3);
    };

    draw(C.btnNormal);

    zone.on('pointerover', () => draw(C.btnHover));
    zone.on('pointerout',  () => draw(this.registry.get('activeVerb') === verb.id ? C.btnActive : C.btnNormal));
    zone.on('pointerdown', () => {
      this.registry.set('activeVerb', verb.id);
      this._highlightActiveVerb();
    });

    this._verbBtns.push({ verb, bg, txt, zone, bx, by, draw });
  }

  _highlightActiveVerb() {
    const activeId = this.registry.get('activeVerb');
    for (const b of this._verbBtns) {
      b.draw(b.verb.id === activeId ? C.btnActive : C.btnNormal);
    }
  }

  // ─── Inventory slots ─────────────────────────────────────────────────────────

  _buildInvSlots(barY) {
    const startX   = GAME_W * 0.50;
    const slotY    = barY + (UI_STRIP_H - INV_SLOT) / 2 + 4;
    const items    = this.inventory ? this.inventory.getAll() : [];
    const maxSlots = Math.floor((GAME_W - startX - 36) / (INV_SLOT + INV_PAD));

    for (let i = 0; i < maxSlots; i++) {
      const sx   = startX + i * (INV_SLOT + INV_PAD);
      const item = items[i] || null;

      const bg = this.add.graphics().setDepth(1001);
      bg.fillStyle(C.slotBg, 1);
      bg.fillRoundedRect(sx, slotY, INV_SLOT, INV_SLOT, 3);
      bg.lineStyle(1, item ? C.slotBorder : 0x252540, 1);
      bg.strokeRoundedRect(sx, slotY, INV_SLOT, INV_SLOT, 3);

      let label = null;
      let zone  = null;

      if (item) {
        label = this.add.text(sx + INV_SLOT / 2, slotY + INV_SLOT / 2,
          item.label.slice(0, 6),
          { ...FONT, fontSize: '4px', color: '#ffffff', align: 'center',
            wordWrap: { width: INV_SLOT - 2 } })
          .setOrigin(0.5, 0.5)
          .setDepth(1002);

        zone = this.add.zone(sx, slotY, INV_SLOT, INV_SLOT)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true })
          .setDepth(1003);

        zone.on('pointerdown', () => {
          if (this.inventory) this.inventory.setActive(item.id);
          this.registry.set('activeVerb', 'use');
          this._highlightActiveVerb();
        });

        zone.on('pointerover', () => {
          bg.clear();
          bg.fillStyle(0x1a1a3a, 1);
          bg.fillRoundedRect(sx, slotY, INV_SLOT, INV_SLOT, 3);
          bg.lineStyle(1, C.slotActive, 1);
          bg.strokeRoundedRect(sx, slotY, INV_SLOT, INV_SLOT, 3);
          this.registry.set('hoveredObject', { label: item.label, verbs: {} });
        });

        zone.on('pointerout', () => {
          bg.clear();
          bg.fillStyle(C.slotBg, 1);
          bg.fillRoundedRect(sx, slotY, INV_SLOT, INV_SLOT, 3);
          bg.lineStyle(1, C.slotBorder, 1);
          bg.strokeRoundedRect(sx, slotY, INV_SLOT, INV_SLOT, 3);
          this.registry.set('hoveredObject', null);
        });
      }

      this._invSlots.push({ bg, label, zone });
    }
  }

  _clearInvSlots() {
    for (const s of this._invSlots) {
      s.bg?.destroy();
      s.label?.destroy();
      s.zone?.destroy();
    }
    this._invSlots = [];
  }

  _rebuildInventory() {
    this._clearInvSlots();
    const mode = this.registry.get('uiMode') || 'verbBar';
    if (mode === 'verbBar') {
      this._buildInvSlots(GAME_H - UI_STRIP_H);
    }
  }

  // ─── Status line ─────────────────────────────────────────────────────────────

  _updateStatus(hoveredObj) {
    if (!this._statusTxt) return;
    if (!hoveredObj) {
      this._statusTxt.setText(this.registry.get('statusText') || '');
      return;
    }
    const verb      = this.registry.get('activeVerb') || 'lookAt';
    const verbLabel = VERBS.find(v => v.id === verb)?.label || verb;
    this._statusTxt.setText(`${verbLabel}  ·  ${hoveredObj.label}`);
  }

  // ─── Verb popup (Mode B) ──────────────────────────────────────────────────────

  _showVerbPopup(data) {
    this._hideVerbPopup();

    const { x, y, verbs } = data;
    const available = VERBS.filter(v => verbs[v.id]);
    if (!available.length) return;

    const btnW   = 44;
    const btnH   = 10;
    const bPad   = 1;
    const hPad   = 3;
    const popW   = btnW + hPad * 2;
    const popH   = available.length * (btnH + bPad) - bPad + hPad * 2;

    const px = Phaser.Math.Clamp(x - popW / 2, 4, GAME_W - popW - 4);
    const py = Phaser.Math.Clamp(y - popH - 12, 4, GAME_H - popH - 4);

    const container = this.add.container(px, py).setDepth(1200);

    const bg = this.add.graphics();
    bg.fillStyle(0x12122a, 0.97);
    bg.fillRoundedRect(0, 0, popW, popH, 4);
    bg.lineStyle(1, 0x6a6aee, 1);
    bg.strokeRoundedRect(0, 0, popW, popH, 4);
    container.add(bg);

    available.forEach((verb, i) => {
      const by = hPad + i * (btnH + bPad);

      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x2a2a5e, 0);
      rowBg.fillRoundedRect(hPad, by, btnW, btnH, 2);
      container.add(rowBg);

      const txt = this.add.text(popW / 2, by + btnH / 2, verb.label, {
        ...FONT,
        fontSize: '5px',
        color: '#c8d4ff',
      }).setOrigin(0.5, 0.5);
      container.add(txt);

      const zone = this.add.zone(hPad, by, btnW, btnH)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      container.add(zone);

      zone.on('pointerover', () => {
        rowBg.clear();
        rowBg.fillStyle(0x4a4aaa, 1);
        rowBg.fillRoundedRect(hPad, by, btnW, btnH, 2);
      });
      zone.on('pointerout', () => {
        rowBg.clear();
        rowBg.fillStyle(0x2a2a5e, 0);
        rowBg.fillRoundedRect(hPad, by, btnW, btnH, 2);
      });
      zone.on('pointerdown', () => {
        this._hideVerbPopup();
        const gs = this.scene.get('GameScene');
        gs.runActions(verbs[verb.id]);
      });
    });

    this._verbPopup = container;
    this._verbPopup._bounds = new Phaser.Geom.Rectangle(px, py, popW, popH);
  }

  _hideVerbPopup() {
    if (this._verbPopup) {
      this._verbPopup.destroy(true);
      this._verbPopup = null;
    }
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update() {
    // Keep status refreshed with active verb label if something is hovered
    const hovered = this.registry.get('hoveredObject');
    if (hovered !== undefined) this._updateStatus(hovered);
  }
}
