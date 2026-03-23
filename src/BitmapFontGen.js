import Phaser from 'phaser';

/**
 * Renders Press Start 2P glyphs to a canvas, adds it as a texture,
 * then uses Phaser's RetroFont.Parse() to register a proper bitmap font.
 */
export function createPixelFont(scene, key = 'pixel', size = 8) {
  if (scene.cache.bitmapFont.has(key)) return;

  const chars = Phaser.GameObjects.RetroFont.TEXT_SET1;
  const cols = chars.length;

  // Measure character width with the loaded web font
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `${size}px "Press Start 2P"`;
  const cellW = Math.ceil(measure.measureText('W').width) + 1;
  const cellH = size + 4;

  // Render all glyphs in a single row on an off-screen canvas
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

  // Add canvas as a Phaser texture
  scene.textures.addCanvas(key, canvas);

  // Use Phaser's built-in RetroFont parser
  const fontData = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: key,
    width: cellW,
    height: cellH,
    chars: chars,
    charsPerRow: cols,
    spacing: { x: 0, y: 0 },
  });

  scene.cache.bitmapFont.add(key, fontData);
}
