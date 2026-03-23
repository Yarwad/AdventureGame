/**
 * Generates a Phaser BitmapFont at runtime from the loaded "Press Start 2P" web font.
 * Renders each glyph to an off-screen canvas with no anti-aliasing,
 * then registers it as a bitmap font Phaser can use with this.add.bitmapText().
 */
export function createPixelFont(scene, key = 'pixel', size = 8) {
  const chars =
    ' !"#$%&\'()*+,-./0123456789:;<=>?@' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
    'abcdefghijklmnopqrstuvwxyz{|}~';

  const cellW = size;       // width per character cell
  const cellH = size + 2;   // height per character cell (small padding)
  const cols = chars.length;

  // Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d');

  // Disable all smoothing
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'top';
  ctx.font = `${size}px "Press Start 2P"`;
  ctx.fillStyle = '#ffffff';

  // Draw each character
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], i * cellW, 1);
  }

  // Add as texture
  scene.textures.addCanvas(key, canvas);

  // Build Phaser RetroFont config
  const config = {
    image: key,
    width: cellW,
    height: cellH,
    chars: Phaser.GameObjects.RetroFont.TEXT_SET1.length ? undefined : undefined,
    charsPerRow: cols,
    offsetX: 0,
    offsetY: 0,
    spacing: { x: 0, y: 0 },
  };

  // Use Phaser's retro font — build the font data manually
  const fontData = {
    font: key,
    size: size,
    lineHeight: cellH,
    chars: {},
  };

  for (let i = 0; i < chars.length; i++) {
    const code = chars.charCodeAt(i);
    fontData.chars[code] = {
      x: i * cellW,
      y: 0,
      width: cellW,
      height: cellH,
      centerX: Math.floor(cellW / 2),
      centerY: Math.floor(cellH / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: cellW,
      data: {},
      kerning: {},
    };
  }

  // Register as bitmap font
  scene.cache.bitmapFont.add(key, {
    data: fontData,
    texture: key,
    frame: '__BASE',
  });
}
