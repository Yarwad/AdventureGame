// Background for room3 "The High Pass" → public/rooms/mars_pass.png
// Composition is aligned to room3.json hotspots (base 320x180 coords / 2):
//   sky y0-32 | mountains y32-53 | ground y53-90
//   hatch x112-135 y60-77 | cave x140-160 y53-82 | path east | crater (86,70)
//
//   node tools/paintgen/rooms/mars_pass.js

import { canvas, PAL, ROOT } from '../lib.js';

const { BLACK, WHITE, DGRAY, LGRAY, BROWN, YELLOW, RED, LRED, PINK } = PAL;
const c = canvas(160, 90, LGRAY); // dull grey sky base
const { set, line, polyline, strokePoly, fillRect, fillPoly, fillCircle,
        fillEllipse, circleOutline, rock, tuft, streak } = c;

// ═══ SKY ═════════════════════════════════════════════════════════════════════
// Thin pink glow that only peeks out just above the far ridge line.
fillRect(0, 40, 160, 13, PINK);

// Two moons (Phobos and Deimos).
fillCircle(36, 12, 5, WHITE);
circleOutline(36, 12, 5, BLACK);
set(34, 11, LGRAY); set(38, 13, LGRAY); set(36, 14, LGRAY); // craters
fillCircle(54, 18, 2, WHITE);
circleOutline(54, 18, 2, BLACK);

// ═══ MOUNTAINS ═══════════════════════════════════════════════════════════════
// Far ridge — hazy salmon, no outline. Irregular peaks with flat tops.
const farTop = [[0, 40], [6, 37], [10, 38], [16, 33], [20, 33], [26, 38], [32, 36], [40, 40],
  [46, 34], [52, 34], [57, 37], [64, 35], [70, 40], [78, 36], [84, 38], [92, 33], [97, 33],
  [104, 38], [112, 36], [118, 40], [126, 35], [132, 38], [140, 34], [148, 39], [154, 37], [160, 40]];
fillPoly(farTop.concat([[160, 54], [0, 54]]), LRED);

// Near ridge — deep rust red with a black ridge line and lit left faces.
const nearTop = [[0, 47], [5, 43], [12, 46], [18, 39], [23, 38], [28, 42], [34, 45], [42, 36],
  [47, 35], [52, 39], [58, 44], [64, 47], [72, 41], [79, 40], [86, 45], [94, 48], [102, 42],
  [108, 41], [115, 46], [122, 48], [128, 44], [134, 46], [142, 43], [150, 46], [160, 44]];
fillPoly(nearTop.concat([[160, 54], [0, 54]]), RED);
polyline(nearTop, BLACK);
line(19, 41, 16, 44, LRED); line(43, 38, 40, 42, LRED); line(73, 43, 70, 46, LRED);
line(103, 44, 100, 47, LRED); line(126, 46, 124, 48, LRED);

// ═══ GROUND ══════════════════════════════════════════════════════════════════
fillRect(0, 53, 160, 37, BROWN);
line(0, 53, 159, 53, BLACK); // horizon

// Dark red regolith patches.
const patchL = [[6, 60], [22, 57], [34, 59], [40, 64], [32, 69], [14, 70], [4, 65]];
fillPoly(patchL, RED); strokePoly(patchL, BLACK);
const patchM = [[52, 57], [62, 56], [68, 59], [60, 62], [50, 60]];
fillPoly(patchM, RED); strokePoly(patchM, BLACK);
const patchB = [[16, 80], [30, 77], [40, 80], [34, 86], [18, 86], [10, 83]];
fillPoly(patchB, RED); strokePoly(patchB, BLACK);
const patchR = [[94, 60], [104, 58], [110, 61], [102, 64], [92, 63]];
fillPoly(patchR, RED); strokePoly(patchR, BLACK);

// Impact crater, right of center.
fillEllipse(86, 70, 7, 3, RED);
fillEllipse(86, 71, 4, 1, BROWN);
fillEllipse(86, 72, 3, 1, BLACK); // pit shadow
polyline([[79, 70], [81, 68], [84, 67], [89, 67], [92, 68], [93, 70], [92, 72], [88, 73], [83, 73], [80, 72], [79, 70]], BLACK);
polyline([[81, 68], [84, 67], [89, 67]], LRED); // lit rim

// Sandy path — tapers as it winds from bottom-center east to the cave mouth.
const path = [[60, 89], [66, 84], [74, 81], [84, 79], [96, 78], [108, 77], [120, 77], [130, 78],
  [138, 79], [143, 80], [143, 84], [134, 83], [124, 82], [112, 82], [100, 83], [90, 85],
  [82, 87], [76, 89]];
fillPoly(path, YELLOW); strokePoly(path, BLACK);
line(90, 83, 93, 83, BROWN); line(108, 80, 111, 80, BROWN);   // wind-blown texture
line(124, 80, 127, 80, BROWN); line(76, 86, 79, 86, BROWN);

// ═══ RIGHT CLIFF + CAVE (the way east) ═══════════════════════════════════════
const cliffTop = [[134, 53], [136, 47], [140, 44], [142, 38], [147, 36], [149, 31], [155, 30], [160, 28]];
const cliff = cliffTop.concat([[160, 86], [150, 84], [142, 80], [138, 72], [134, 62]]);
fillPoly(cliff, RED);
polyline([[134, 62], [134, 53]].concat(cliffTop.slice(1)), BLACK);
polyline([[160, 86], [150, 84], [142, 80], [138, 72], [134, 62]], BLACK);
line(146, 38, 150, 42, LRED); line(152, 34, 156, 39, LRED); line(138, 50, 141, 53, LRED);
line(150, 38, 147, 44, BLACK); line(154, 44, 152, 50, BLACK);

// Cave mouth.
fillPoly([[142, 82], [142, 64], [145, 57], [150, 55], [154, 58], [156, 66], [156, 82]], BLACK);

// ═══ HATCH (sealed metal hatch set into the rock) ════════════════════════════
const mound = [[111, 62], [114, 57], [122, 55], [130, 57], [136, 61], [136, 64], [111, 64]];
fillPoly(mound, RED); strokePoly(mound, BLACK);
line(118, 58, 121, 61, LRED); line(126, 58, 129, 60, LRED);
const hatch = [[115, 63], [131, 63], [134, 75], [112, 75]];
fillPoly(hatch, DGRAY);
line(116, 64, 130, 64, LGRAY);           // top rim highlight
line(123, 63, 123, 75, BLACK);           // panel divider
strokePoly(hatch, BLACK);
fillRect(125, 68, 2, 2, YELLOW);         // brass lock
strokePoly([[124, 67], [127, 67], [127, 70], [124, 70]], BLACK);

// ═══ ROCKS ═══════════════════════════════════════════════════════════════════
rock([[24, 70], [30, 67], [36, 69], [37, 73], [30, 75], [23, 74]],
     [[25, 70], [30, 68], [33, 69], [28, 71]], [27, 69]);
rock([[54, 80], [60, 77], [66, 79], [66, 83], [58, 84], [52, 83]],
     [[55, 80], [60, 78], [63, 79], [57, 81]], [58, 79]);
rock([[86, 64], [90, 62], [93, 64], [91, 66], [86, 66]], null, [89, 63]);
rock([[118, 84], [122, 82], [125, 84], [123, 86], [118, 86]], null, [121, 83]);

// ═══ GROUND DETAIL ═══════════════════════════════════════════════════════════
tuft(14, 76); tuft(44, 60); tuft(74, 68); tuft(100, 86); tuft(10, 58); tuft(132, 87);
streak(16, 66, 5); streak(38, 72, 6); streak(70, 64, 4); streak(96, 70, 5);
streak(54, 66, 4); streak(20, 86, 6); streak(84, 74, 4); streak(48, 86, 4);
[[34, 78], [78, 71], [58, 63], [108, 68], [44, 87]].forEach(([x, y]) => set(x, y, WHITE));
[[28, 84], [90, 73], [50, 68], [108, 84], [66, 72]].forEach(([x, y]) => set(x, y, BLACK));

c.save(process.argv[2] || `${ROOT}public/rooms/mars_pass.png`);
