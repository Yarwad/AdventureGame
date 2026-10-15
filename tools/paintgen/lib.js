// AGI-style raster toolkit for generating room backgrounds and sprite sheets
// under the in-game painter's constraints (public/paint.html): the EGA 16-color
// palette, flat fills, Bresenham lines, hard pixels — no anti-aliasing, no
// gradients. Art is drawn on a logical canvas and exported at 2x so pixels stay
// chunky like Sierra AGI art. Full method: docs/PAINTGEN.md.
//
// Usage:  node tools/paintgen/rooms/<scene>.js

import { writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

// EGA palette — must stay a subset of PALETTE in public/paint.html.
// TRANS is the painter's 'transparent' (only meaningful for sprite sheets).
export const PAL = {
  TRANS: null,
  BLACK: '#000000', WHITE: '#ffffff', DGRAY: '#808080', LGRAY: '#c0c0c0',
  BLUE: '#0000aa', LBLUE: '#5555ff', CYAN: '#00aaaa', LCYAN: '#55ffff',
  GREEN: '#00aa00', LGREEN: '#55ff55', BROWN: '#aa5500', YELLOW: '#ffff55',
  RED: '#aa0000', LRED: '#ff5555', MAGENTA: '#aa00aa', PINK: '#ff55ff',
};
const VALID = new Set(Object.values(PAL));

export function canvas(w, h, bg = PAL.TRANS) {
  const px = new Array(w * h).fill(bg);

  const set = (x, y, c) => {
    if (c !== null && !VALID.has(c)) throw new Error(`not an EGA palette color: ${c}`);
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < w && y >= 0 && y < h) px[y * w + x] = c;
  };

  function line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  const polyline = (pts, c) => { for (let i = 0; i + 1 < pts.length; i++) line(...pts[i], ...pts[i + 1], c); };
  const strokePoly = (pts, c) => polyline(pts.concat([pts[0]]), c);

  // A limb/stroke of width `wd` px: parallel Bresenham lines (for sprite limbs).
  function limb(x0, y0, x1, y1, wd, c) {
    const off = (wd - 1) >> 1;
    for (let i = 0; i < wd; i++) line(x0 - off + i, y0, x1 - off + i, y1, c);
  }

  function fillRect(x, y, rw, rh, c) {
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(i, j, c);
  }

  // Scanline even-odd polygon fill — the deterministic equivalent of the
  // painter's outline-then-flood-fill workflow.
  function fillPoly(pts, c) {
    const ys = pts.map(p => p[1]);
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.ceil(xs[k] - 0.5), xb = Math.floor(xs[k + 1] - 0.5);
        for (let x = xa; x <= xb; x++) set(x, y, c);
      }
    }
  }

  function fillCircle(cx, cy, r, c) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let x = cx - dx; x <= cx + dx; x++) set(x, cy + dy, c);
    }
  }

  function fillEllipse(cx, cy, rx, ry, c) {
    for (let dy = -ry; dy <= ry; dy++) {
      const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
      for (let x = cx - dx; x <= cx + dx; x++) set(x, cy + dy, c);
    }
  }

  function circleOutline(cx, cy, r, c) {
    for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= r + 0.4 && d > r - 0.7) set(cx + dx, cy + dy, c);
    }
  }

  // ── Recurring scene furniture (reference-style) ────────────────────────────
  const rock = (pts, facet = null, glint = null) => {
    fillPoly(pts, PAL.DGRAY);
    if (facet) fillPoly(facet, PAL.LGRAY);
    strokePoly(pts, PAL.BLACK);
    if (glint) set(glint[0], glint[1], PAL.WHITE);
  };
  const tuft = (x, y, c = PAL.LRED) => { line(x - 2, y, x, y - 3, c); line(x, y - 3, x + 2, y, c); };
  const streak = (x, y, len, c = PAL.LRED) => line(x, y, x + len, y, c);

  // Copy another canvas's non-transparent pixels in at (dx, dy); hflip mirrors
  // (for building left-facing sprite rows from right-facing frames).
  function blit(src, dx, dy, { hflip = false } = {}) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.px[y * src.w + x];
      if (c !== null) set(dx + (hflip ? src.w - 1 - x : x), dy + y, c);
    }
  }

  // ── PNG export (RGBA, nearest-neighbor upscale) ────────────────────────────
  function save(outPath, scale = 2) {
    const OW = w * scale, OH = h * scale;
    const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const raw = Buffer.alloc(OH * (1 + OW * 4));
    for (let y = 0; y < OH; y++) {
      const row = y * (1 + OW * 4);
      raw[row] = 0;
      for (let x = 0; x < OW; x++) {
        const c = px[Math.floor(y / scale) * w + Math.floor(x / scale)];
        const o = row + 1 + x * 4;
        if (c === null) continue; // transparent (buffer is zeroed)
        const [r, g, b] = hex(c);
        raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
      }
    }
    const crcTable = (() => {
      const t = [];
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
      }
      return t;
    })();
    const crc32 = buf => {
      let c = 0xffffffff;
      for (const v of buf) c = crcTable[(c ^ v) & 255] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
      const t = Buffer.from(type, 'ascii');
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
      return Buffer.concat([len, t, data, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4);
    ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
    writeFileSync(outPath, png);
    console.log(`wrote ${outPath} (${png.length} bytes, ${OW}x${OH})`);
  }

  return {
    w, h, px,
    set, line, polyline, strokePoly, limb, fillRect, fillPoly,
    fillCircle, fillEllipse, circleOutline, rock, tuft, streak, blit, save,
  };
}

// Repo root (lib.js lives at tools/paintgen/lib.js).
export const ROOT = new URL('../../', import.meta.url).pathname;
