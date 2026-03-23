/**
 * Generates a pixel-perfect bitmap font from Press Start 2P at a given size.
 * Must be called before any bitmapText is created.
 */
export function createPixelFont(scene, key = 'pixel', size = 8) {
  const chars =
    ' !"#$%&\'()*+,-./0123456789:;<=>?@' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
    'abcdefghijklmnopqrstuvwxyz{|}~';

  // Press Start 2P is monospaced but glyphs are wider than tall at small sizes.
  // Measure actual glyph width using an off-screen canvas.
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `${size}px "Press Start 2P"`;
  const cellW = Math.ceil(measure.measureText('M').width) + 1;
  const cellH = size + 4;
  const cols = chars.length;

  // Render all glyphs to a single row
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellW;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'top';
  ctx.font = `${size}px "Press Start 2P"`;
  ctx.fillStyle = '#ffffff';

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], i * cellW, 2);
  }

  // Register as a Phaser texture
  if (scene.textures.exists(key)) return; // already created
  scene.textures.addCanvas(key, canvas);

  // Build bitmap font data manually
  const data = {
    font: key,
    size: size,
    lineHeight: cellH,
    retroFont: true,
    chars: {},
  };

  for (let i = 0; i < chars.length; i++) {
    const code = chars.charCodeAt(i);
    data.chars[code] = {
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

  // Remove failed parse attempt if any, then add our data
  if (scene.cache.bitmapFont.has(key)) {
    scene.cache.bitmapFont.remove(key);
  }

  scene.cache.bitmapFont.add(key, {
    data: data,
    texture: key,
    frame: '__BASE',
  });
}
