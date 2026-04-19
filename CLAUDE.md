# Point & Click Adventure Engine

A data-driven point-and-click adventure game engine built with Phaser 3, set on Mars.

## Quick Start

```bash
npm run dev      # Start dev server
npm run build    # Production build
```

## Stack

- Phaser 3 + Vite 7 + vanilla JS (ES modules)
- No TypeScript, no test framework
- 640x360 canvas (2x upscale from 320x180 base), pixel art (nearest-neighbor)
- Room JSON coordinates are in 320x180 base space; `SCALE` in config.js converts to canvas space

## Architecture

Two parallel Phaser scenes run simultaneously:
- **GameScene** — game world: room backgrounds, player, hotspots, items, NPCs
- **UIScene** — transparent overlay: verb bar, inventory, status line

Cross-scene communication uses Phaser's registry (`scene.registry.events`) and direct scene events.

### Key Files

| Path | Purpose |
|------|---------|
| `src/main.js` | Phaser.Game bootstrap |
| `src/config.js` | Resolution constants (`GAME_W`, `GAME_H`, `UI_STRIP_H`) |
| `src/GameScene.js` | Room rendering, player, interactions |
| `src/UIScene.js` | Verb bar, inventory, verb popup |
| `src/systems/ActionRunner.js` | Sequential async action chain executor |
| `src/systems/RoomSystem.js` | Loads room JSON, spawns entities, room transitions |
| `src/systems/InventorySystem.js` | Singleton inventory state |
| `src/systems/DialogueSystem.js` | Speech bubbles |
| `src/objects/Player.js` | Player movement + depth scaling |
| `src/objects/Hotspot.js` | Invisible interactive zones |
| `src/objects/WorldItem.js` | Pickable items in rooms |
| `src/objects/Character.js` | NPCs |

### Content is Data-Driven

Game content lives in JSON files under `public/rooms/`. To add content:
- **Room**: create `public/rooms/roomN.json`
- **Background**: drop PNG in `public/rooms/`, reference in JSON `background`
- **Item**: drop PNG in `public/items/`, add to room JSON `items` array
- **NPC**: drop spritesheet in `public/characters/`, add to room JSON `characters` array

### Action System

Room JSON defines verb responses as action chains. Available actions:
`say`, `narrate`, `walkTo`, `wait`, `addItem`, `removeItem`, `removeWorldItem`, `setFlag`, `clearFlag`, `condition`, `goTo`, `animate`

### Verb IDs

`walkTo`, `lookAt`, `pickUp`, `use`, `talkTo`

## Conventions

- Keep all game logic in ES modules — no TypeScript
- Shared state goes through `InventorySystem` singleton or Phaser registry, not globals
- Room content belongs in JSON, not hardcoded in scene code
- Placeholder visuals (yellow dots, colored shapes) are fine during development
