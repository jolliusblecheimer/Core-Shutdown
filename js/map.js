// AREAS — the world is a set of hand-authored areas linked at their edges.
// The live map arrays below are swapped when the player changes area, so the
// rest of the engine keeps talking to the same names it always has.

let MAP_W = 32, MAP_H = 32;

// ground: 0 asphalt, 1 dirt, 2 rubble, 3 wood planks (interior)
const ground = [];
const groundVar = [];
const solid = [];
const heavy = [];         // walls & mountains — stops even the boss
let crushProps = {};      // "x,y" -> prop: small junk the Compactor flattens
const props = [];         // {gx, gy, type, v, dir, front, foot}
const decals = [];
const moundSpawns = [];   // hidden enemy spawn points
const boomBarrels = [];   // explosive barrels — shoot to detonate
const patrolPoints = [];  // waypoints robots patrol between
let patrolCenter = { x: 16, y: 16 };
let aoGrid = [];
let gateProp = null;      // the junkyard gate
let SHACK = null;         // survivor shack bounds (junkyard only)
let currentArea = 'junkyard';

function currentAreaDef() { return Areas[currentArea]; }

// ---------- shared helpers ----------
function isSolid(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return true;
  return solid[gy | 0] && solid[gy | 0][gx | 0];
}
function isHeavy(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return true;
  return heavy[gy | 0] && heavy[gy | 0][gx | 0];
}
function bossCanStand(x, y, r) {
  return !isHeavy(x - r, y - r) && !isHeavy(x + r, y - r) &&
         !isHeavy(x - r, y + r) && !isHeavy(x + r, y + r);
}
function canStand(x, y, r) {
  return !isSolid(x - r, y - r) && !isSolid(x + r, y - r) &&
         !isSolid(x - r, y + r) && !isSolid(x + r, y + r);
}
function insideShack(x, y) {
  if (!SHACK) return false;
  return x > SHACK.x0 && x < SHACK.x1 + 1 && y > SHACK.y0 && y < SHACK.y1 + 1;
}

// The junkyard gate: opens when the Compactor falls, and now actually leads
// somewhere — the tiles clear so the player can walk east into the Approach.
function openGate() {
  if (!gateProp || gateProp.open) return;
  gateProp.open = true;
  for (let y = 11; y <= 13; y++) {
    if (solid[y]) { solid[y][MAP_W - 1] = false; heavy[y][MAP_W - 1] = false; }
  }
}

// ---------- build scaffolding ----------
function resetMap(w, h, rng) {
  MAP_W = w; MAP_H = h;
  ground.length = 0; groundVar.length = 0; solid.length = 0; heavy.length = 0;
  props.length = 0; decals.length = 0; moundSpawns.length = 0;
  boomBarrels.length = 0; patrolPoints.length = 0;
  crushProps = {};
  gateProp = null; SHACK = null;
  for (let y = 0; y < h; y++) {
    ground[y] = []; groundVar[y] = []; solid[y] = []; heavy[y] = [];
    for (let x = 0; x < w; x++) {
      ground[y][x] = 0;
      groundVar[y][x] = (rng() * 6) | 0;
      solid[y][x] = false;
      heavy[y][x] = false;
    }
  }
}

// ---------- spatial index: only nearby props/decals are drawn & sorted ----------
const CELL = 8;
let propCells = new Map(), decalCells = new Map();
function cellOf(gx, gy) { return (Math.floor(gx / CELL)) + ',' + (Math.floor(gy / CELL)); }
function indexInto(map, obj) {
  const k = cellOf(obj.gx, obj.gy);
  let a = map.get(k);
  if (!a) { a = []; map.set(k, a); }
  a.push(obj);
}
function buildSpatialIndex() {
  propCells = new Map(); decalCells = new Map();
  for (const p of props) indexInto(propCells, p);
  for (const d of decals) indexInto(decalCells, d);
}
// props are removed at runtime (crushed junk, blown barrels) — keep both in sync
function removeProp(p) {
  const i = props.indexOf(p);
  if (i >= 0) props.splice(i, 1);
  const a = propCells.get(cellOf(p.gx, p.gy));
  if (a) {
    const j = a.indexOf(p);
    if (j >= 0) a.splice(j, 1);
  }
}
function addDecal(d) { decals.push(d); indexInto(decalCells, d); }
// everything within the camera's tile window
function gatherNear(map, x0, y0, x1, y1, out) {
  const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL);
  const cy0 = Math.floor(y0 / CELL), cy1 = Math.floor(y1 / CELL);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const a = map.get(cx + ',' + cy);
      if (a) for (const o of a) out.push(o);
    }
  }
  return out;
}

function buildAO() {
  aoGrid = [];
  for (let y = 0; y < MAP_H; y++) {
    aoGrid[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      if (solid[y][x]) { aoGrid[y][x] = 0; continue; }
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && isSolid(x + dx, y + dy)) n++;
      }
      aoGrid[y][x] = Math.min(3, n);
    }
  }
}

// continuous wall run: marks tiles solid, slices the strip per tile
function wallRun(tiles, kinds, axis, front, trimS, trimE) {
  const slices = Sprites.makeWallRun(kinds, axis, trimS, trimE);
  tiles.forEach(([x, y], i) => {
    solid[y][x] = true;
    heavy[y][x] = true;
    const s = slices[i];
    props.push({ gx: x, gy: y, type: 'wallSlice', img: s.img, dx: s.dx, dy: s.dy, lift: s.lift, front });
  });
}
const fenceKinds = n => Array.from({ length: n }, () => 'M');

// =====================================================================
// AREA 1 — THE JUNKYARD (where the game begins)
// =====================================================================
function buildJunkyard() {
  const rng = mulberry32(4242);
  resetMap(32, 32, rng);
  SHACK = { x0: 18, y0: 4, x1: 24, y1: 9, doorX: 21 };
  patrolCenter = { x: 21.5, y: 12.5 };

  const blobs = [[7, 22, 5], [22, 7, 5], [15, 16, 4], [26, 25, 4], [5, 10, 3], [11, 28, 3], [28, 13, 3]];
  for (const [bx, by, r] of blobs) {
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const d = Math.hypot(x - bx, y - by);
      if (d < r - 0.5 + rng()) ground[y][x] = 1;
      else if (d < r + 1 && rng() < 0.4) ground[y][x] = 2;
    }
  }

  wallRun(Array.from({ length: MAP_W }, (_, i) => [i, 0]), fenceKinds(MAP_W), 'x', false, true, true);
  wallRun(Array.from({ length: MAP_W }, (_, i) => [i, MAP_H - 1]), fenceKinds(MAP_W), 'x', false, true, true);
  wallRun(Array.from({ length: MAP_H }, (_, i) => [0, i]), fenceKinds(MAP_H), 'y', false, true, true);
  // EAST wall, broken by THE GATE just south of the shack (y 11..13)
  wallRun(Array.from({ length: 11 }, (_, i) => [MAP_W - 1, i]), fenceKinds(11), 'y', false, true, false);
  wallRun(Array.from({ length: MAP_H - 14 }, (_, i) => [MAP_W - 1, 14 + i]), fenceKinds(MAP_H - 14), 'y', false, false, true);
  for (let y = 11; y <= 13; y++) { solid[y][MAP_W - 1] = true; heavy[y][MAP_W - 1] = true; }
  gateProp = { gx: MAP_W - 1, gy: 12, type: 'gate', open: false, dir: 'b' };
  props.push(gateProp);
  props.push({ gx: MAP_W - 1, gy: 10, type: 'post', big: true });
  props.push({ gx: MAP_W - 1, gy: 14, type: 'post', big: true });

  const W = SHACK;
  const wk = n => Array.from({ length: n }, () => 'W');
  wallRun(Array.from({ length: W.x1 - W.x0 + 1 }, (_, i) => [W.x0 + i, W.y0]), wk(W.x1 - W.x0 + 1), 'x', false, true, true);
  const southL = [], southR = [];
  for (let x = W.x0; x <= W.x1; x++) {
    if (x < W.doorX) southL.push([x, W.y1]);
    else if (x > W.doorX) southR.push([x, W.y1]);
  }
  wallRun(southL, wk(southL.length), 'x', true, true, false);
  wallRun(southR, wk(southR.length), 'x', true, false, true);
  wallRun(Array.from({ length: W.y1 - W.y0 + 1 }, (_, i) => [W.x0, W.y0 + i]), wk(W.y1 - W.y0 + 1), 'y', false, true, true);
  wallRun(Array.from({ length: W.y1 - W.y0 + 1 }, (_, i) => [W.x1, W.y0 + i]), wk(W.y1 - W.y0 + 1), 'y', true, true, true);
  for (let y = W.y0 + 1; y < W.y1; y++) {
    for (let x = W.x0 + 1; x < W.x1; x++) {
      ground[y][x] = 3;
      groundVar[y][x] = (rng() * 3) | 0;
    }
  }
  for (const [fx, fy, ftype] of [
    [19, 5, 'cot'], [23, 5, 'shelf'], [23, 6, 'crate'],
    [19, 7, 'table'], [20, 7, 'stool'], [23, 8, 'stove'],
  ]) {
    solid[fy][fx] = true; heavy[fy][fx] = true;
    props.push({ gx: fx, gy: fy, type: ftype, v: 0 });
  }
  const postAt = (x, y, big, front) => props.push({ gx: x, gy: y, type: 'post', big, front });
  postAt(0, 0); postAt(MAP_W - 1, 0); postAt(0, MAP_H - 1); postAt(MAP_W - 1, MAP_H - 1);
  postAt(W.x0, W.y0, true); postAt(W.x1, W.y0, true, true);
  postAt(W.x0, W.y1, true, true); postAt(W.x1, W.y1, true, true);
  postAt(W.doorX - 1, W.y1, true, true); postAt(W.doorX + 1, W.y1, true, true);

  function placeMound(x0, y0, fw, fh, type, v) {
    for (let y = y0; y < y0 + fh; y++) for (let x = x0; x < x0 + fw; x++) {
      if (x >= 1 && y >= 1 && x < MAP_W - 1 && y < MAP_H - 1) { solid[y][x] = true; heavy[y][x] = true; }
    }
    props.push({ gx: x0 + fw / 2 - 0.5, gy: y0 + fh / 2 - 0.5, type, v, foot: [x0, y0, fw, fh] });
  }
  placeMound(3, 3, 4, 3, 'mound3', 0);
  placeMound(26, 20, 4, 3, 'mound3', 1);
  placeMound(13, 5, 2, 2, 'mound2', 0);
  placeMound(4, 17, 2, 2, 'mound2', 1);
  placeMound(20, 15, 2, 2, 'mound2', 0);
  placeMound(12, 24, 2, 2, 'mound2', 1);

  const reserved = (x, y) =>
    (solid[y] && solid[y][x]) ||
    (x >= SHACK.x0 - 1 && x <= SHACK.x1 + 1 && y >= SHACK.y0 - 1 && y <= SHACK.y1 + 2) ||
    (x >= SHACK.doorX - 1 && x <= SHACK.doorX + 1 && y > SHACK.y1 && y <= SHACK.y1 + 3) ||
    Math.hypot(x - 6.5, y - 26.5) < 2.5 ||
    Math.hypot(x - 9.5, y - 23.5) < 1.5 ||
    Math.hypot(x - 24.5, y - 18.5) < 1.5 ||
    (x > 25 && y > 8 && y < 17);

  function scatter(type, count, variants) {
    let placed = 0, tries = 0;
    while (placed < count && tries < 500) {
      tries++;
      const x = 2 + ((rng() * (MAP_W - 4)) | 0);
      const y = 2 + ((rng() * (MAP_H - 4)) | 0);
      if (reserved(x, y)) continue;
      solid[y][x] = true;
      const prop = { gx: x, gy: y, type, v: variants ? (rng() * variants) | 0 : 0 };
      props.push(prop);
      crushProps[x + ',' + y] = prop;
      placed++;
    }
  }
  scatter('scrap', 18, 3); scatter('barrel', 9); scatter('barrelTipped', 4);
  scatter('tires', 6); scatter('pipe', 5); scatter('girder', 4); scatter('crate', 6);

  for (const [x, y] of [[14, 15], [17, 19], [13, 22], [19, 13], [16, 17], [21, 21]]) {
    if (reserved(x, y)) continue;
    solid[y][x] = true;
    const prop = { gx: x, gy: y, type: 'boom' };
    props.push(prop);
    crushProps[x + ',' + y] = prop;
    boomBarrels.push({ gx: x, gy: y, alive: true, prop });
  }

  const carSpots = [[12, 10], [7, 15], [24, 13], [16, 25], [27, 8], [14, 18], [9, 20], [19, 28]];
  let carV = 0;
  for (const [cx, cy] of carSpots) {
    if (reserved(cx, cy) || reserved(cx + 1, cy)) continue;
    solid[cy][cx] = true; solid[cy][cx + 1] = true;
    const prop = { gx: cx + 0.5, gy: cy, type: 'car', v: carV++ % 2 };
    props.push(prop);
    crushProps[cx + ',' + cy] = prop;
    crushProps[(cx + 1) + ',' + cy] = prop;
  }

  for (const p of props) {
    if (!p.foot) continue;
    const [x0, y0, fw, fh] = p.foot;
    for (const [sx, sy] of [[x0 + fw / 2, y0 - 1.2], [x0 - 1.2, y0 + fh / 2]]) {
      if (canStand(sx, sy, 0.35)) moundSpawns.push({ x: sx, y: sy });
    }
  }
  for (const [cx, cy] of [[21.5, 12.5], [20.5, 12.5], [22.5, 13.5], [21.5, 14.5]]) {
    if (canStand(cx, cy, 0.35)) { patrolCenter = { x: cx, y: cy }; break; }
  }
  for (const s of moundSpawns) patrolPoints.push({ x: s.x, y: s.y });
  let added = 0;
  for (const p of props) {
    if (p.type !== 'scrap' || added >= 8) continue;
    const wx = p.gx + 0.5, wy = p.gy + 1.7;
    if (canStand(wx, wy, 0.35)) { patrolPoints.push({ x: wx, y: wy }); added++; }
  }

  for (let i = 0; i < 100; i++) {
    const x = 1 + rng() * (MAP_W - 2);
    const y = 1 + rng() * (MAP_H - 2);
    if (x >= SHACK.x0 && x <= SHACK.x1 + 1 && y >= SHACK.y0 && y <= SHACK.y1 + 1) continue;
    const r = rng();
    decals.push({ gx: x, gy: y, type: r < 0.4 ? 'crack' : r < 0.75 ? 'weed' : 'stain' });
  }
  let puddles = 0, ptries = 0;
  while (puddles < 8 && ptries < 200) {
    ptries++;
    const x = 2 + rng() * (MAP_W - 4);
    const y = 2 + rng() * (MAP_H - 4);
    if (x >= SHACK.x0 - 1 && x <= SHACK.x1 + 2 && y >= SHACK.y0 - 1 && y <= SHACK.y1 + 2) continue;
    if (ground[y | 0][x | 0] !== 0 || solid[y | 0][x | 0]) continue;
    decals.push({ gx: x, gy: y, type: 'puddle' });
    puddles++;
  }
  buildAO();
  buildSpatialIndex();
}

// =====================================================================
// AREA 2 — THE FRINGE: one open city. Streets are hand-drawn, the blocks
// between them are filled with buildings, and every POI hangs off a road.
// Ground types here: 4 road · 5 pavement · 6 verge · 7 forecourt
// =====================================================================
const FRINGE_W = 200, FRINGE_H = 150;
let signs = [];   // readable street signs {gx, gy, text}

function buildFringe() {
  const rng = mulberry32(20260817);
  resetMap(FRINGE_W, FRINGE_H, rng);
  signs = [];

  // everything starts as dead lots
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      ground[y][x] = rng() < 0.55 ? 6 : 2;

  // ---------- the street network ----------
  // {x0,y0,x1,y1,half} — axis-aligned segments, half = lanes each side
  const STREETS = [
    { x0: 30, y0: 120, x1: 196, y1: 120, half: 4, name: 'gate road' },
    { x0: 30, y0: 14, x1: 30, y1: 120, half: 4, name: 'spine' },
    { x0: 30, y0: 75, x1: 165, y1: 75, half: 3, name: 'east cross' },
    { x0: 30, y0: 36, x1: 172, y1: 36, half: 3, name: 'north cross' },
    { x0: 165, y0: 75, x1: 165, y1: 120, half: 3, name: 'south link' },
    { x0: 92, y0: 36, x1: 92, y1: 120, half: 2, name: 'mid street' },
  ];
  const onStreet = (x, y) => {
    for (const s of STREETS) {
      const h = s.half + 2;                     // + pavement
      if (s.x0 === s.x1) {
        if (Math.abs(x - s.x0) <= h && y >= Math.min(s.y0, s.y1) - h && y <= Math.max(s.y0, s.y1) + h) return s;
      } else {
        if (Math.abs(y - s.y0) <= h && x >= Math.min(s.x0, s.x1) - h && x <= Math.max(s.x0, s.x1) + h) return s;
      }
    }
    return null;
  };
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      for (const s of STREETS) {
        let d = null;
        if (s.x0 === s.x1) {
          if (y >= Math.min(s.y0, s.y1) - s.half - 2 && y <= Math.max(s.y0, s.y1) + s.half + 2) d = Math.abs(x - s.x0);
        } else {
          if (x >= Math.min(s.x0, s.x1) - s.half - 2 && x <= Math.max(s.x0, s.x1) + s.half + 2) d = Math.abs(y - s.y0);
        }
        if (d === null) continue;
        if (d <= s.half) ground[y][x] = 4;                                  // carriageway
        else if (d <= s.half + 2 && ground[y][x] !== 4) ground[y][x] = 5;   // pavement
      }
    }
  }

  // ---------- city blocks: buildings fill the space between streets ----------
  const buildings = [];
  function placeBuilding(x0, y0, w, h, kind) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return false;
        if (ground[y][x] === 4 || ground[y][x] === 5 || solid[y][x]) return false;
      }
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) { solid[y][x] = true; heavy[y][x] = true; ground[y][x] = 2; }
    buildings.push({ x0, y0, w, h, kind: kind || null });
    return true;
  }
  // ---------- landmarks first, so they claim their ground ----------
  // THE SCHOOL: a long pale block with a fenced yard, on the east cross street
  const SCH = { x: 108, y: 56, w: 22, h: 11 };
  placeBuilding(SCH.x, SCH.y, SCH.w, SCH.h, 'K');
  for (let y = SCH.y + SCH.h + 1; y < SCH.y + SCH.h + 7; y++)
    for (let x = SCH.x; x < SCH.x + SCH.w; x++)
      if (x < MAP_W - 1 && y < MAP_H - 1 && !solid[y][x]) ground[y][x] = 7;   // playground
  signs.push({ gx: SCH.x + 4, gy: SCH.y + SCH.h + 2, text: 'ALDERGROVE PRIMARY - GO SLOWLY' });

  // THE REGENT HOTEL and the CITY & COUNTY BANK — landmarks, not enterable
  placeBuilding(112, 96, 18, 13, 'T');
  signs.push({ gx: 112, gy: 110, text: 'THE REGENT HOTEL', kind: 'old' });
  placeBuilding(60, 96, 16, 12, 'N');
  signs.push({ gx: 60, gy: 109, text: 'CITY & COUNTY BANK', kind: 'old' });

  // ST MARTIN'S: the church that becomes Candlelight, on the spine
  const CH = { x: 36, y: 90, w: 12, h: 14 };
  placeBuilding(CH.x, CH.y, CH.w, CH.h, 'R');
  for (let y = CH.y + CH.h; y < CH.y + CH.h + 4; y++)
    for (let x = CH.x - 2; x < CH.x + CH.w + 2; x++)
      if (x > 0 && x < MAP_W - 1 && y < MAP_H - 1 && !solid[y][x]) ground[y][x] = 5;  // forecourt paving

  // walk each street and line it with buildings set back from the pavement
  for (const s of STREETS) {
    const vertical = s.x0 === s.x1;
    const len = vertical ? Math.abs(s.y1 - s.y0) : Math.abs(s.x1 - s.x0);
    const start = vertical ? Math.min(s.y0, s.y1) : Math.min(s.x0, s.x1);
    for (const side of [-1, 1]) {
      let t = start + 2 + ((rng() * 5) | 0);
      while (t < start + len - 6) {
        const run = 6 + ((rng() * 9) | 0);
        const depth = 7 + ((rng() * 10) | 0);
        const off = s.half + 3;
        // main roads get shops; back streets are houses and the odd office
        const main = s.half >= 4;
        const roll = rng();
        const kind = main ? (roll < 0.45 ? 'S' : roll < 0.6 ? 'G' : roll < 0.85 ? 'H' : 'O')
                          : (roll < 0.62 ? 'H' : roll < 0.78 ? 'B' : roll < 0.9 ? 'S' : 'O');
        if (vertical) {
          const bx = side < 0 ? s.x0 - off - depth : s.x0 + off;
          placeBuilding(bx, t, depth, run, kind);
        } else {
          const by = side < 0 ? s.y0 - off - depth : s.y0 + off;
          placeBuilding(t, by, run, depth, kind);
        }
        t += run + 2 + ((rng() * 4) | 0);      // alley gap between terraces
      }
    }
  }

  // fill the deep interior of each block too — a city is buildings, not lots
  for (let gy = 4; gy < MAP_H - 12; gy += 12) {
    for (let gx = 4; gx < MAP_W - 12; gx += 12) {
      if (rng() < 0.18) continue;                    // the odd yard or car park
      const w = 7 + ((rng() * 4) | 0), h = 7 + ((rng() * 4) | 0);
      const r2 = rng();
      placeBuilding(gx + ((rng() * 3) | 0), gy + ((rng() * 3) | 0), w, h,
                    r2 < 0.66 ? 'H' : r2 < 0.85 ? 'B' : 'O');
    }
  }

  // ---------- facades: every street-facing wall gets a face, and every
  // corner gets a column so the four runs meet cleanly ----------
  for (const b of buildings) {
    const k = b.kind || 'B';
    const kindsOf = n => Array.from({ length: n }, () => k);
    // horizontal runs own the corners; vertical runs sit between them
    const north = [], south = [], west = [], east = [];
    for (let x = b.x0; x < b.x0 + b.w; x++) { north.push([x, b.y0]); south.push([x, b.y0 + b.h - 1]); }
    for (let y = b.y0 + 1; y < b.y0 + b.h - 1; y++) { west.push([b.x0, y]); east.push([b.x0 + b.w - 1, y]); }
    wallRun(north, kindsOf(north.length), 'x', false, true, true);
    wallRun(south, kindsOf(south.length), 'x', true, true, true);
    if (west.length) wallRun(west, kindsOf(west.length), 'y', false, true, true);
    if (east.length) wallRun(east, kindsOf(east.length), 'y', true, true, true);
    for (const [cx2, cy2, front] of [
      [b.x0, b.y0, false], [b.x0 + b.w - 1, b.y0, false],
      [b.x0, b.y0 + b.h - 1, true], [b.x0 + b.w - 1, b.y0 + b.h - 1, true],
    ]) props.push({ gx: cx2, gy: cy2, type: 'cornerCol', front });
    // every building gets a roof, styled by what it is
    props.push({
      gx: b.x0 + b.w / 2 - 0.5, gy: b.y0 + b.h / 2 - 0.5, type: 'roof',
      foot: [b.x0, b.y0, b.w, b.h], kind: k, seed: (b.x0 * 31 + b.y0 * 17) % 100,
    });
  }

  // ---------- street dressing ----------
  const freeSpot = (x, y) => x > 1 && y > 1 && x < MAP_W - 1 && y < MAP_H - 1 &&
                             !solid[y][x] && ground[y][x] === 5;
  function placeProp(x, y, type, extra) {
    if (!freeSpot(x, y)) return null;
    solid[y][x] = true;
    const p = Object.assign({ gx: x, gy: y, type }, extra || {});
    props.push(p);
    return p;
  }
  for (const s of STREETS) {
    const vertical = s.x0 === s.x1;
    const len = vertical ? Math.abs(s.y1 - s.y0) : Math.abs(s.x1 - s.x0);
    const start = vertical ? Math.min(s.y0, s.y1) : Math.min(s.x0, s.x1);
    for (let t = start + 4; t < start + len - 3; t += 7 + ((rng() * 4) | 0)) {
      for (const side of [-1, 1]) {
        const off = s.half + 1 + ((rng() * 2) | 0);
        const x = vertical ? s.x0 + side * off : t;
        const y = vertical ? t : s.y0 + side * off;
        const r = rng();
        if (r < 0.42) placeProp(x, y, 'streetlight', { lit: rng() < 0.28 });   // a few still burn
        else if (r < 0.55) placeProp(x, y, 'dumpster');
        else if (r < 0.66) placeProp(x, y, 'postbox');
        else if (r < 0.78) placeProp(x, y, 'hydrant');
        else if (r < 0.86) placeProp(x, y, 'busStop');
      }
    }
    // lane paint down the middle, sheared to lie along the road
    if (vertical) for (let t2 = start + 2; t2 < start + len - 2; t2 += 3) decals.push({ gx: s.x0 + 0.4, gy: t2, type: 'dashY' });
    else for (let t2 = start + 2; t2 < start + len - 2; t2 += 3) decals.push({ gx: t2, gy: s.y0 + 0.4, type: 'dashX' });
  }
  // traffic lights + crossings at the junctions
  for (const [jx, jy] of [[30, 120], [30, 75], [30, 36], [92, 75], [92, 36], [165, 75], [165, 120], [92, 120]]) {
    placeProp(jx + 5, jy + 5, 'trafficLight') || placeProp(jx - 5, jy - 5, 'trafficLight');
    for (let i = -3; i <= 3; i++) decals.push({ gx: jx + i, gy: jy + 6.5, type: 'crossbar' });
  }

  // ---------- the traffic jam: cars queued nose to tail, doors open ----------
  function car(cx, cy, v) {
    if (cx + 1 >= MAP_W - 1 || solid[cy][cx] || solid[cy][cx + 1]) return;
    solid[cy][cx] = true; solid[cy][cx + 1] = true;
    const p = { gx: cx + 0.5, gy: cy, type: 'car', v: v % 2 };
    props.push(p);
    crushProps[cx + ',' + cy] = p; crushProps[(cx + 1) + ',' + cy] = p;
  }
  let cv = 0;
  for (let x = 60; x < 190; x += 5 + ((rng() * 4) | 0)) car(x, 118 + ((rng() * 3) | 0), cv++);
  for (let y = 40; y < 115; y += 6 + ((rng() * 5) | 0)) car(28 + ((rng() * 3) | 0), y, cv++);
  for (let x = 40; x < 150; x += 9 + ((rng() * 6) | 0)) car(x, 74 + ((rng() * 2) | 0), cv++);
  // a bus slewed across the mid junction — footprint matches the sprite
  if (!solid[76][89] && !solid[76][90] && !solid[76][91]) {
    for (let x = 89; x <= 91; x++) solid[76][x] = true;
    props.push({ gx: 90, gy: 76, type: 'bus' });
  }

  // ---------- THE GAS STATION (proper forecourt layout) ----------
  // canopy on six pillars over two kerbed pump islands, shop to the east,
  // painted in/out lanes, and a pylon totem you see from up the road
  const GX = 132, GY = 125;
  for (let y = GY - 1; y < GY + 14; y++)
    for (let x = GX - 1; x < GX + 24; x++)
      if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) { ground[y][x] = 7; solid[y][x] = false; }

  const CAN = { x0: GX + 1, y0: GY + 1, w: 14, h: 8 };     // canopy footprint
  for (const [px2, py2] of [
    [CAN.x0, CAN.y0], [CAN.x0 + 7, CAN.y0], [CAN.x0 + 13, CAN.y0],
    [CAN.x0, CAN.y0 + 7], [CAN.x0 + 7, CAN.y0 + 7], [CAN.x0 + 13, CAN.y0 + 7],
  ]) {
    solid[py2][px2] = true; heavy[py2][px2] = true;
    props.push({ gx: px2, gy: py2, type: 'pillar' });
  }
  props.push({ gx: CAN.x0 + CAN.w / 2 - 0.5, gy: CAN.y0 + CAN.h / 2 - 0.5,
               type: 'canopy', foot: [CAN.x0, CAN.y0, CAN.w, CAN.h] });
  // two islands, two pumps each
  for (const iy of [CAN.y0 + 2, CAN.y0 + 5]) {
    props.push({ gx: CAN.x0 + 6, gy: iy, type: 'pumpIsland' });
    for (const ix of [CAN.x0 + 4, CAN.x0 + 8]) {
      solid[iy][ix] = true;
      const p = { gx: ix, gy: iy, type: 'pump' };
      props.push(p);
      boomBarrels.push({ gx: ix, gy: iy, alive: true, prop: p });   // pumps detonate
    }
  }
  // the shop, glazed, east of the canopy
  if (placeBuilding(GX + 17, GY + 2, 6, 8, 'S')) {
    const b = buildings[buildings.length - 1];
    const n2 = [], s2 = [], w2 = [], e2 = [];
    for (let x = b.x0; x < b.x0 + b.w; x++) { n2.push([x, b.y0]); s2.push([x, b.y0 + b.h - 1]); }
    for (let y = b.y0 + 1; y < b.y0 + b.h - 1; y++) { w2.push([b.x0, y]); e2.push([b.x0 + b.w - 1, y]); }
    const S = n => Array.from({ length: n }, () => 'S');
    wallRun(n2, S(n2.length), 'x', false, true, true);
    wallRun(s2, S(s2.length), 'x', true, true, true);
    wallRun(w2, S(w2.length), 'y', false, true, true);
    wallRun(e2, S(e2.length), 'y', true, true, true);
    for (const [cx2, cy2, front] of [[b.x0, b.y0, false], [b.x0 + b.w - 1, b.y0, false],
                                     [b.x0, b.y0 + b.h - 1, true], [b.x0 + b.w - 1, b.y0 + b.h - 1, true]])
      props.push({ gx: cx2, gy: cy2, type: 'cornerCol', front });
    props.push({ gx: b.x0 + b.w / 2 - 0.5, gy: b.y0 + b.h / 2 - 0.5, type: 'roof',
                 foot: [b.x0, b.y0, b.w, b.h], kind: 'S', seed: 7 });
  }
  // pylon totem at the roadside
  if (!solid[GY - 1][GX + 20]) {
    solid[GY - 1][GX + 20] = true;
    props.push({ gx: GX + 20, gy: GY - 1, type: 'pylon' });
  }
  // forecourt markings: in and out
  for (let i = 0; i < 6; i++) decals.push({ gx: GX + 2 + i * 2, gy: GY - 0.4, type: 'paintArrow' });
  for (let i = 0; i < 5; i++) decals.push({ gx: GX + 3 + i * 2, gy: GY + 12.4, type: 'crossbar' });

  // ---------- signs: ONLY the shelter, and all of it handmade ----------
  // Someone walked this road afterwards with a paint tin. Planks nailed to
  // broom handles, a bedsheet between two poles, arrows daubed on the tarmac.
  const SIGNS = [
    { gx: 188, gy: 116, text: 'SHELTER ->', kind: 'plank' },
    { gx: 168, gy: 116, text: 'ST MARTINS. KEEP GOING', kind: 'plank' },
    { gx: 146, gy: 116, text: 'FOOD + BEDS ->', kind: 'cloth' },
    { gx: 124, gy: 116, text: 'SHELTER 2KM ->', kind: 'plank' },
    { gx: 100, gy: 116, text: 'NOT FAR NOW', kind: 'plank' },
    { gx: 76, gy: 116, text: 'ST MARTINS 1KM ->', kind: 'cloth' },
    { gx: 50, gy: 116, text: 'TURN RIGHT AT THE CHURCH', kind: 'plank' },
    { gx: 36, gy: 112, text: 'SHELTER ^', kind: 'plank' },
    { gx: 34, gy: 106, text: 'YOU MADE IT. KNOCK.', kind: 'cloth' },
  ];
  for (const s of SIGNS) {
    const x = s.gx | 0, y = s.gy | 0;
    if (x < MAP_W - 1 && y < MAP_H - 1 && !solid[y][x]) {
      solid[y][x] = true;
      props.push({ gx: x, gy: y, type: 'sign', kind: s.kind });
      signs.push({ gx: x, gy: y, text: s.text, kind: s.kind });
    }
  }
  // painted arrows on the road itself, pointing the same way
  for (const [ax, ay] of [[178, 118.6], [156, 118.6], [134, 118.6], [110, 118.6],
                          [88, 118.6], [64, 118.6], [42, 118.6], [31.4, 108], [31.4, 100]])
    decals.push({ gx: ax, gy: ay, type: 'paintArrow' });

  // ---------- the JUNKYARD gate, seen from the road ----------
  // the yard's outer wall, so returning is an actual door and not a void
  const gy0 = 118, gy1 = 122;
  for (let y = 104; y < 136; y++) {
    if (y >= gy0 && y <= gy1) continue;
    if (y >= MAP_H - 1) break;
    solid[y][MAP_W - 2] = true; heavy[y][MAP_W - 2] = true;
  }
  wallRun(Array.from({ length: gy0 - 104 }, (_, i) => [MAP_W - 2, 104 + i]),
          fenceKinds(gy0 - 104), 'y', false, true, true);
  wallRun(Array.from({ length: 136 - (gy1 + 1) }, (_, i) => [MAP_W - 2, gy1 + 1 + i]),
          fenceKinds(136 - (gy1 + 1)), 'y', false, true, true);
  props.push({ gx: MAP_W - 2, gy: gy0 - 1, type: 'post', big: true });
  props.push({ gx: MAP_W - 2, gy: gy1 + 1, type: 'post', big: true });
  props.push({ gx: MAP_W - 2, gy: 120, type: 'gate', open: true, dir: 'b' });
  signs.push({ gx: MAP_W - 4, gy: 120, text: 'JUNKYARD', kind: 'plank' });
  props.push({ gx: MAP_W - 4, gy: 117, type: 'sign', kind: 'plank' });

  // ---------- patrol routes: junctions and the forecourt ----------
  for (const [px2, py2] of [[30, 120], [92, 120], [165, 120], [30, 75], [92, 75], [165, 75],
                            [30, 36], [92, 36], [172, 36], [GX + 9, GY + 6], [60, 120], [30, 96]]) {
    if (canStand(px2, py2, 0.4)) patrolPoints.push({ x: px2, y: py2 });
  }
  patrolCenter = { x: 92, y: 120 };
  for (const [sx, sy] of [[40, 124], [110, 112], [70, 128], [150, 112], [36, 90], [98, 66]]) {
    if (canStand(sx, sy, 0.4)) moundSpawns.push({ x: sx, y: sy });
  }

  // ---------- ground dressing ----------
  for (let i = 0; i < 900; i++) {
    const x = 1 + rng() * (MAP_W - 2), y = 1 + rng() * (MAP_H - 2);
    if (solid[y | 0][x | 0]) continue;
    const r = rng();
    decals.push({ gx: x, gy: y, type: r < 0.4 ? 'crack' : r < 0.72 ? 'weed' : 'stain' });
  }
  for (let i = 0; i < 40; i++) {
    const x = 2 + rng() * (MAP_W - 4), y = 2 + rng() * (MAP_H - 4);
    if (solid[y | 0][x | 0] || ground[y | 0][x | 0] !== 4) continue;
    decals.push({ gx: x, gy: y, type: 'puddle' });
  }

  buildAO();
  buildSpatialIndex();
}

// =====================================================================
// AREA REGISTRY
// =====================================================================
const Areas = {
  junkyard: {
    id: 'junkyard', name: 'THE JUNKYARD', build: buildJunkyard,
    hasScrapper: true, hasBoss: true, hasNpc: true,
    tint: '#e6c092',
    makeItems: () => ([
      { type: 'pipe', x: 9.5, y: 23.5, bob: 0 },
      { type: 'ammo', x: 14.5, y: 21.5, amount: 6, bob: 1.3 },
      { type: 'ammo', x: 25.5, y: 26.5, amount: 6, bob: 2.1 },
    ]),
    // walking into the open gate leaves for the open city
    exits: [{ x0: 30.2, y0: 10.6, x1: 32, y1: 14.4, to: 'fringe', entry: { x: 194, y: 120 },
              needsGate: true }],
  },
  fringe: {
    id: 'fringe', name: 'THE FRINGE', build: buildFringe,
    hasScrapper: false, hasBoss: false, hasNpc: false,
    tint: '#efe0cc',      // thinner, cooler, brighter than the yard's dusk
    makeItems: () => ([
      { type: 'ammo', x: 150.5, y: 130.5, amount: 6, bob: 0.8 },
      { type: 'ammo', x: 62.5, y: 122.5, amount: 6, bob: 2.4 },
      { type: 'ammo', x: 33.5, y: 88.5, amount: 6, bob: 1.5 },
    ]),
    // back through the yard gate
    exits: [{ x0: 196.4, y0: 117.6, x1: 201, y1: 122.4, to: 'junkyard', entry: { x: 29.6, y: 12.5 } }],
  },
};

// build the starting area immediately so everything downstream has a map
buildJunkyard();
