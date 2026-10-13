import { GAME_W, GAME_H, SCALE } from '../config.js';

const MIN_SIZE_BASE = 4;
const HANDLE_SIZE = 6 * SCALE;

export class BlockerSystem {
  constructor(scene) {
    this.scene = scene;
    this.blockers = [];
    this._visuals = null;
    this._border = null;
    this._captureZone = null;
    this._previewGfx = null;
    this._drawMode = false;
    this._dragStart = null;
    this._dragMode = null; // 'draw' | 'resize' | 'move'
    this._origBlocker = null;
    this._resizeCorner = null;
    this._selectedIdx = -1;
    this._keyHandler = null;

    scene.registry.events.on('changedata-blockerDrawMode', (_p, val) => this.setDrawMode(val));
  }

  load(jsonBlockers) {
    this.blockers = (jsonBlockers || []).map(b => ({
      x: b.x * SCALE, y: b.y * SCALE, w: b.w * SCALE, h: b.h * SCALE,
    }));
    this._selectedIdx = -1;
    this._renderVisuals();
  }

  isBlocked(x, y) {
    for (const b of this.blockers) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  }

  setDrawMode(on) {
    this._drawMode = !!on;
    if (!this._drawMode) this._selectedIdx = -1;
    this._renderVisuals();
    if (this._drawMode) this._enableDrawInput();
    else this._disableDrawInput();
  }

  clearAll() {
    this.blockers = [];
    this._selectedIdx = -1;
    this._renderVisuals();
  }

  _renderVisuals() {
    this._visuals?.destroy();
    this._visuals = null;
    if (!this._drawMode) return;

    const g = this.scene.add.graphics().setDepth(950);
    for (let i = 0; i < this.blockers.length; i++) {
      const b = this.blockers[i];
      const sel = i === this._selectedIdx;
      g.fillStyle(sel ? 0xffcc00 : 0xff4444, 0.35);
      g.fillRect(b.x, b.y, b.w, b.h);
      g.lineStyle(1, sel ? 0xffff00 : 0xff4444, 0.9);
      g.strokeRect(b.x, b.y, b.w, b.h);
    }

    if (this._selectedIdx >= 0) {
      const b = this.blockers[this._selectedIdx];
      const half = HANDLE_SIZE / 2;
      const corners = [
        { x: b.x,       y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x,       y: b.y + b.h },
        { x: b.x + b.w, y: b.y + b.h },
      ];
      for (const c of corners) {
        g.fillStyle(0xffffff, 1);
        g.fillRect(c.x - half, c.y - half, HANDLE_SIZE, HANDLE_SIZE);
        g.lineStyle(1, 0x000000, 1);
        g.strokeRect(c.x - half, c.y - half, HANDLE_SIZE, HANDLE_SIZE);
      }
    }

    this._visuals = g;
  }

  _hitHandle(px, py) {
    if (this._selectedIdx < 0) return null;
    const b = this.blockers[this._selectedIdx];
    const half = HANDLE_SIZE / 2;
    const corners = {
      tl: { x: b.x,       y: b.y },
      tr: { x: b.x + b.w, y: b.y },
      bl: { x: b.x,       y: b.y + b.h },
      br: { x: b.x + b.w, y: b.y + b.h },
    };
    for (const [k, c] of Object.entries(corners)) {
      if (px >= c.x - half && px <= c.x + half && py >= c.y - half && py <= c.y + half) return k;
    }
    return null;
  }

  _hitBlocker(px, py) {
    for (let i = this.blockers.length - 1; i >= 0; i--) {
      const b = this.blockers[i];
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return i;
    }
    return -1;
  }

  _enableDrawInput() {
    if (this._captureZone) return;

    const zone = this.scene.add.zone(0, 0, GAME_W, GAME_H)
      .setOrigin(0, 0)
      .setInteractive()
      .setDepth(940);

    this._previewGfx = this.scene.add.graphics().setDepth(951);
    this._border = this.scene.add.graphics().setDepth(960);
    this._border.lineStyle(2, 0xff4444, 0.8);
    this._border.strokeRect(1, 1, GAME_W - 2, GAME_H - 2);

    zone.on('pointerdown', (pointer) => {
      const px = pointer.x, py = pointer.y;

      const handle = this._hitHandle(px, py);
      if (handle) {
        this._dragMode = 'resize';
        this._resizeCorner = handle;
        this._origBlocker = { ...this.blockers[this._selectedIdx] };
        this._dragStart = { x: px, y: py };
        return;
      }

      const idx = this._hitBlocker(px, py);
      if (idx >= 0) {
        this._selectedIdx = idx;
        this._dragMode = 'move';
        this._origBlocker = { ...this.blockers[idx] };
        this._dragStart = { x: px, y: py };
        this._renderVisuals();
        return;
      }

      this._selectedIdx = -1;
      this._dragMode = 'draw';
      this._dragStart = { x: px, y: py };
      this._renderVisuals();
    });

    zone.on('pointermove', (pointer) => {
      if (!this._dragStart) return;
      if (this._dragMode === 'draw') {
        this._drawRectPreview(this._normalizeRect(this._dragStart, pointer));
      } else if (this._dragMode === 'resize') {
        this._drawRectPreview(this._computeResize(pointer));
      } else if (this._dragMode === 'move') {
        this._drawRectPreview(this._computeMove(pointer));
      }
    });

    const finalize = (pointer) => {
      if (!this._dragStart) return;
      const minPx = MIN_SIZE_BASE * SCALE;
      if (this._dragMode === 'draw') {
        const r = this._normalizeRect(this._dragStart, pointer);
        if (r.w >= minPx && r.h >= minPx) {
          this.blockers.push(r);
          this._selectedIdx = this.blockers.length - 1;
        }
      } else if (this._dragMode === 'resize') {
        const r = this._computeResize(pointer);
        if (r.w >= minPx && r.h >= minPx) {
          this.blockers[this._selectedIdx] = r;
        }
      } else if (this._dragMode === 'move') {
        this.blockers[this._selectedIdx] = this._computeMove(pointer);
      }
      this._dragStart = null;
      this._dragMode = null;
      this._origBlocker = null;
      this._resizeCorner = null;
      this._previewGfx?.clear();
      this._renderVisuals();
    };

    zone.on('pointerup', finalize);
    zone.on('pointerupoutside', finalize);

    this._keyHandler = (event) => {
      if (event.key === 'Delete' && this._selectedIdx >= 0) {
        this.blockers.splice(this._selectedIdx, 1);
        this._selectedIdx = -1;
        this._renderVisuals();
      }
    };
    this.scene.input.keyboard.on('keydown', this._keyHandler);

    this._captureZone = zone;
  }

  _disableDrawInput() {
    this._captureZone?.destroy();   this._captureZone = null;
    this._previewGfx?.destroy();    this._previewGfx = null;
    this._border?.destroy();        this._border = null;
    if (this._keyHandler) {
      this.scene.input.keyboard.off('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._dragStart = null;
    this._dragMode = null;
    this._origBlocker = null;
    this._resizeCorner = null;
  }

  _drawRectPreview(r) {
    this._previewGfx.clear();
    this._previewGfx.fillStyle(0xffff88, 0.3);
    this._previewGfx.fillRect(r.x, r.y, r.w, r.h);
    this._previewGfx.lineStyle(1, 0xffff88, 1);
    this._previewGfx.strokeRect(r.x, r.y, r.w, r.h);
  }

  _normalizeRect(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(a.x - b.x),
      h: Math.abs(a.y - b.y),
    };
  }

  _computeResize(pointer) {
    const orig = this._origBlocker;
    let ax, ay;
    switch (this._resizeCorner) {
      case 'tl': ax = orig.x + orig.w; ay = orig.y + orig.h; break;
      case 'tr': ax = orig.x;          ay = orig.y + orig.h; break;
      case 'bl': ax = orig.x + orig.w; ay = orig.y;          break;
      case 'br': ax = orig.x;          ay = orig.y;          break;
    }
    return {
      x: Math.min(ax, pointer.x),
      y: Math.min(ay, pointer.y),
      w: Math.abs(pointer.x - ax),
      h: Math.abs(pointer.y - ay),
    };
  }

  _computeMove(pointer) {
    const orig = this._origBlocker;
    const dx = pointer.x - this._dragStart.x;
    const dy = pointer.y - this._dragStart.y;
    return { x: orig.x + dx, y: orig.y + dy, w: orig.w, h: orig.h };
  }
}
