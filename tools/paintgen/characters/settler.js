// NPC sprite sheet: a settler in a grey enviro-suit → public/characters/settler.png
// Same contract as public/assets/character.png: 6 frames x 4 rows, 34x86 px
// frames (17x43 logical at 2x), rows in walk order right / left / down / up.
// Left row is the right row mirrored.
//
//   node tools/paintgen/characters/settler.js

import { canvas, PAL, ROOT } from '../lib.js';

const { BLACK, WHITE, DGRAY, LGRAY, LBLUE, CYAN, YELLOW } = PAL;

const FW = 17, FH = 43;

// Walk cycle: which leg is lifted how far (front/back views), stride reach and
// torso bob (side view). 6 frames: contact, recoil, pass, contact, recoil, pass.
const LIFT   = [[3, 0], [1, 0], [0, 0], [0, 3], [0, 1], [0, 0]]; // [left, right]
const STRIDE = [3, 2, 0, -3, -2, 0];
const BOB    = [0, 0, 1, 0, 0, 1];

// ── Shared pieces ─────────────────────────────────────────────────────────────
function helmet(f, yo) {
  f.fillRect(5, 1 + yo, 7, 1, LGRAY);  // dome top
  f.fillRect(4, 2 + yo, 9, 7, LGRAY);  // helmet
  f.fillRect(5, 9 + yo, 7, 1, LGRAY);  // chin ring
}

function frontTorso(f, yo) {
  f.fillRect(7, 10 + yo, 3, 1, DGRAY);   // neck seal
  f.fillRect(4, 11 + yo, 9, 10, LGRAY);  // suit
  f.fillRect(12, 11 + yo, 1, 10, DGRAY); // side shade
  f.fillRect(3, 11 + yo, 1, 3, DGRAY);   // shoulder pads
  f.fillRect(13, 11 + yo, 1, 3, DGRAY);
  f.fillRect(4, 21 + yo, 9, 2, DGRAY);   // belt
  f.set(8, 21 + yo, YELLOW);             // buckle
}

function frontArms(f, yo, swing) {
  f.fillRect(2, 12 + yo + swing, 2, 8, LGRAY);
  f.fillRect(2, 20 + yo + swing, 2, 2, BLACK);
  f.fillRect(13, 12 + yo - swing, 2, 8, LGRAY);
  f.fillRect(13, 20 + yo - swing, 2, 2, BLACK);
}

function frontLegs(f, [lLift, rLift]) {
  f.fillRect(4, 23, 4, 16 - lLift, LGRAY);
  f.fillRect(7, 23, 1, 16 - lLift, DGRAY);   // inner shade
  f.fillRect(4, 39 - lLift, 4, 3, BLACK);
  f.fillRect(9, 23, 4, 16 - rLift, LGRAY);
  f.fillRect(9, 23, 1, 16 - rLift, DGRAY);
  f.fillRect(9, 39 - rLift, 4, 3, BLACK);
}

// ── Views ─────────────────────────────────────────────────────────────────────
function frameDown(i) {
  const f = canvas(FW, FH);
  const swing = LIFT[i][0] ? 1 : LIFT[i][1] ? -1 : 0;
  frontLegs(f, LIFT[i]);
  frontTorso(f, 0);
  f.fillRect(7, 13, 3, 2, CYAN); // chest panel
  frontArms(f, 0, swing);
  helmet(f, 0);
  f.polyline([[5, 3], [11, 3], [11, 6], [5, 6], [5, 3]], BLACK); // visor rim
  f.fillRect(6, 4, 5, 2, LBLUE);                                 // glass
  f.set(7, 4, WHITE);                                            // glint
  return f;
}

function frameUp(i) {
  const f = canvas(FW, FH);
  const swing = LIFT[i][0] ? 1 : LIFT[i][1] ? -1 : 0;
  frontLegs(f, LIFT[i]);
  frontTorso(f, 0);
  f.fillRect(5, 12, 7, 8, DGRAY);   // backpack
  f.fillRect(6, 13, 1, 5, CYAN);    // tanks
  f.fillRect(10, 13, 1, 5, CYAN);
  frontArms(f, 0, swing);
  helmet(f, 0);
  f.fillRect(5, 4, 7, 1, DGRAY);    // helmet seam (no visor from behind)
  return f;
}

function frameRight(i) {
  const f = canvas(FW, FH);
  const s = STRIDE[i], yo = -BOB[i];

  // Legs: diagonals from the hip; far leg shaded like the player sheet's.
  f.limb(8, 23 + yo, 8 - s, 38, 3, DGRAY);
  f.fillRect(8 - s - 1, 39, 4, 3, BLACK);  // toes point forward
  f.limb(8, 23 + yo, 8 + s, 38, 3, LGRAY);
  f.fillRect(8 + s - 1, 39, 4, 3, BLACK);
  f.fillRect(6, 22 + yo, 5, 3, LGRAY);     // hip block covers the leg join

  f.fillRect(2, 11 + yo, 3, 8, DGRAY);     // backpack
  f.fillRect(5, 11 + yo, 7, 10, LGRAY);    // torso
  f.fillRect(5, 21 + yo, 7, 2, DGRAY);     // belt

  // Arm swings opposite the leading leg; shaded sleeve stays visible
  // against the suit.
  const a = -s;
  f.limb(8, 12 + yo, 8 + a, 19 + yo, 3, DGRAY);
  f.fillRect(7 + a, 20 + yo, 3, 2, BLACK); // glove

  helmet(f, yo);
  f.fillRect(9, 3 + yo, 4, 4, LBLUE);      // visor glass (faces travel)
  f.set(11, 4 + yo, WHITE);
  f.line(9, 7 + yo, 12, 7 + yo, BLACK);    // visor under-rim
  return f;
}

// ── Assemble sheet: rows right / left / down / up ─────────────────────────────
const sheet = canvas(FW * 6, FH * 4);
for (let i = 0; i < 6; i++) {
  const r = frameRight(i);
  sheet.blit(r, i * FW, 0);
  sheet.blit(r, i * FW, FH, { hflip: true });
  sheet.blit(frameDown(i), i * FW, FH * 2);
  sheet.blit(frameUp(i), i * FW, FH * 3);
}

sheet.save(process.argv[2] || `${ROOT}public/characters/settler.png`);
