# PAINTGEN — AGI-Style Art Generation Spec

How room backgrounds and character sprite sheets are generated for this game.
The method honors the in-game painter's constraints (`public/paint.html`) and
the look of early Sierra AGI games (King's Quest era): flat EGA colors, chunky
doubled pixels, black-outlined organic shapes.

**How to use this:** describe a room ("a cramped hab module with a bunk and an
airlock") or an NPC ("a rust-stained mining robot") and have Claude generate it.
Claude composes a scene script in `tools/paintgen/`, renders the PNG, aligns it
with the room's hotspots, and wires it into the room JSON. The references for
the style are `public/rooms/background_2.png` (Sierra screenshot) and the
worked examples below.

## Hard constraints (never break these)

1. **Palette** — exactly the EGA 16 from `PALETTE` in `public/paint.html`
   (plus transparency for sprites). `tools/paintgen/lib.js` throws on any
   other color.

   | Name | Hex | Typical roles |
   |------|-----|---------------|
   | BLACK | `#000000` | outlines, cave mouths, boots, shadows |
   | WHITE | `#ffffff` | glints, moons, pebbles |
   | DGRAY | `#808080` | metal, rock shading, far limbs |
   | LGRAY | `#c0c0c0` | dull sky, suits, rock facets |
   | BLUE / LBLUE | `#0000aa` / `#5555ff` | night sky, water, visors |
   | CYAN / LCYAN | `#00aaaa` / `#55ffff` | tech panels, ice, glass |
   | GREEN / LGREEN | `#00aa00` / `#55ff55` | foliage shadow / grass, interior walls |
   | BROWN | `#aa5500` | dirt, regolith, wood, floors |
   | YELLOW | `#ffff55` | sand paths, lamps, brass |
   | RED / LRED | `#aa0000` / `#ff5555` | Mars rock / lit Mars rock, warnings |
   | MAGENTA / PINK | `#aa00aa` / `#ff55ff` | alien accents, horizon glow |

2. **Resolution** — backgrounds are drawn at **160x90 logical px** and saved
   doubled to **320x180**; character frames at **17x43 logical** saved as
   **34x86**. The 2x chunk is what makes it read as AGI art on the 2x canvas.

3. **Technique** — flat fills, Bresenham lines, hard pixels. No anti-aliasing,
   no gradients, no dithering. Aim for ≤ 10 colors per scene.

## Backgrounds

### Composition

Work in three horizontal bands and keep them in sync with the room JSON
(logical y = base y ÷ 2):

- **Sky band** → the room's sky hotspot. One flat color; optional thin glow
  band that peeks above the backdrop silhouette; moons/suns outlined in black.
- **Backdrop band** (mountains, walls, treeline) → scenery hotspots. Two
  depths: far layer in a lighter color with no outline, near layer darker with
  a black ridge/edge line. Irregular polylines — vary peak heights, add flat
  tops, never a regular sawtooth.
- **Ground band** → must match the room's `walkAreaY` (ground starts at
  `walkAreaY[0]`). Base fill plus blobby organic patches (5-7 vertices,
  black-outlined), a tapering path toward the room's exit, faceted rocks.

Then a **detail pass**: tufts (3px inverted-V), 4-6px horizontal streaks,
single white/black pebble pixels. Light comes from the upper-left: facets and
highlights on top-left faces.

### Hotspot alignment

Design against the room's hotspot rects (divide base coords by 2), or draw
first and author hotspots from the drawing afterward. Keep item spawn points
on clear ground, draw exits as doors/caves/paths at the room's exit rects, and
keep spawn points outside edge-exit trigger zones (trigger = within ~2 base px
of a walk-area bound, or 12 base px of a screen side).

### Biome recipes

- **Mars exterior** (see `rooms/mars_pass.js`): LGRAY sky + PINK horizon glow,
  WHITE moons, LRED far ridge, RED near ridge/cliffs, BROWN ground, RED
  patches, YELLOW path, DGRAY/LGRAY rocks.
- **Interior** (style of `Test_2.png`): LGREEN walls + GREEN shadow edge,
  BROWN or YELLOW floor, furniture in BROWN/DGRAY with black outlines, one
  CYAN/LBLUE tech accent.
- **Cave/underground**: BLACK fill, DGRAY rock faces, LGRAY facets, one light
  source in YELLOW with a lit floor pool.
- **Night exterior**: BLUE sky, BLACK silhouettes, WHITE star pixels, LGRAY
  moonlit ground.
- Improvising: pick one light + one dark color per material family, outline
  near shapes in black, leave the far layer unoutlined.

## Character sheets

### Sheet contract (matches `public/assets/character.png`)

- **6 columns x 4 rows**, frame **34x86** → sheet **204x344**.
- Row order: **right, left, down, up** (frames 0-5, 6-11, 12-17, 18-23).
- Left row is the right row mirrored (`blit(..., { hflip: true })`).
- Transparent background; feet on the frame's bottom rows (origin is 0.5, 1.0).

### Figure and cycle (see `characters/settler.js`)

Proportions on the 17x43 logical frame: head/helmet y1-9, torso y11-22, legs
y23-38, boots y39-41. Black boots and gloves anchor the silhouette; far-side
limbs are shaded (DGRAY) like the player sheet's.

Six-frame walk: contact, recoil, pass, contact (other leg), recoil, pass.
- Side rows: legs are diagonal `limb()` strokes from the hip, stride x-offsets
  `[3, 2, 0, -3, -2, 0]`, arm swings opposite, torso bobs up 1px on pass frames.
- Front/back rows: alternate leg lifts `[3, 1, 0]` (shorter leg + raised boot),
  arms counter-swing 1px.

The engine idles NPCs on the middle "pass" pose (frame start+2); the player
sheet idles on frame 0 — both fine, just be consistent per sheet.

## Toolkit (`tools/paintgen/`)

```
tools/paintgen/lib.js            # palette + raster primitives + PNG writer
tools/paintgen/rooms/*.js        # one script per background
tools/paintgen/characters/*.js   # one script per sprite sheet
```

Run: `node tools/paintgen/rooms/<scene>.js` (writes into `public/`).

`canvas(w, h, bg)` returns: `set, line, polyline, strokePoly, limb, fillRect,
fillPoly, fillCircle, fillEllipse, circleOutline, rock(pts, facet, glint),
tuft, streak, blit, save(path, scale=2)`. `fillPoly` is scanline even-odd —
the deterministic equivalent of the painter's outline-then-flood-fill.

To review: save a copy at a higher scale (`c.save(path, 6)`) or zoom with
`sips -z`. Hand touch-ups: the in-game painter imports PNGs (Load) and saves
back to `public/` via its Save button (dev server only).

## Wiring into the game

**Background**: set the room JSON's `background`, set `walkAreaY` to the drawn
ground band, align `hotspots`/`exits`/`edgeExits`. Retune live via Settings >
Size, which saves back to the room file.

**NPC**: add to the room JSON's `characters`:

```json
{
  "id": "settler", "label": "Settler", "nouns": ["settler", "colonist"],
  "x": 90, "y": 150,
  "sprite": "characters/settler.png", "frameW": 34, "frameH": 86,
  "wander": { "radius": 55, "pauseMs": [1500, 4000] },
  "verbs": { "talkTo": [{ "type": "say", "characterId": "settler", "text": "..." }] }
}
```

`frameW`/`frameH` make the engine load it as a spritesheet and auto-create
`char_<id>_<right|left|down|up>` animations. `wander` makes it amble around
its spawn point inside the walk area (omit for a stationary NPC). NPCs freeze
during cutscenes and parser message windows.

## QA checklist

- [ ] Render and eyeball the PNG at 1x and zoomed (palette lib enforces EGA).
- [ ] Background: bands match the room's hotspot rects and `walkAreaY`.
- [ ] Spawn points clear of exit trigger zones (no transition ping-pong).
- [ ] Sprites: cycle reads in all four rows; silhouette clear at 1x.
- [ ] `npm run dev`, walk the room, hover every hotspot, talk to NPCs.
