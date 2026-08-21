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
let roadblocks = [];      // bandit checkpoints — see THE CORDON in buildFringe
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
  roadblocks = [];
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
// A prop is registered in EVERY cell its footprint touches, not just the cell
// its anchor happens to sit in. A 20x13 building anchored at its north corner
// used to vanish the moment that one corner left the camera window — that was
// the "buildings disappear when I walk away" bug.
function indexInto(map, obj) {
  const f = obj.foot;
  const x0 = f ? f[0] : obj.gx, y0 = f ? f[1] : obj.gy;
  const x1 = f ? f[0] + f[2] : obj.gx, y1 = f ? f[1] + f[3] : obj.gy;
  for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
      const k = cx + ',' + cy;
      let a = map.get(k);
      if (!a) { a = []; map.set(k, a); }
      a.push(obj);
    }
  }
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
  const f = p.foot;
  const x0 = f ? f[0] : p.gx, y0 = f ? f[1] : p.gy;
  const x1 = f ? f[0] + f[2] : p.gx, y1 = f ? f[1] + f[3] : p.gy;
  for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
      const a = propCells.get(cx + ',' + cy);
      if (!a) continue;
      const j = a.indexOf(p);
      if (j >= 0) a.splice(j, 1);
    }
  }
}
function addDecal(d) { decals.push(d); indexInto(decalCells, d); }
// A crushed/absorbed prop must free EVERY tile it stood on, not just its
// anchor tile - multi-tile junk used to leave invisible walls behind.
function clearPropSolid(p) {
  const f = p.foot;
  const x0 = f ? f[0] : Math.floor(p.gx), y0 = f ? f[1] : Math.floor(p.gy);
  const x1 = f ? f[0] + f[2] - 1 : x0, y1 = f ? f[1] + f[3] - 1 : y0;
  for (let y = y0; y <= y1; y++) {
    if (!solid[y]) continue;
    for (let x = x0; x <= x1; x++) solid[y][x] = false;
  }
}
// everything within the camera's tile window. A prop spanning several cells
// appears in each of them, so results are stamped to keep them unique.
let gatherStamp = 0;
function gatherNear(map, x0, y0, x1, y1, out) {
  const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL);
  const cy0 = Math.floor(y0 / CELL), cy1 = Math.floor(y1 / CELL);
  const st = ++gatherStamp;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const a = map.get(cx + ',' + cy);
      if (!a) continue;
      for (const o of a) {
        if (o._gs === st) continue;
        o._gs = st;
        out.push(o);
      }
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

// a building is ONE prop: a pre-rendered volume with a single depth
function addBuildingProp(b) {
  props.push({
    gx: b.x0, gy: b.y0, type: 'building',
    foot: [b.x0, b.y0, b.w, b.h],
    kind: b.kind || 'B',
    seed: (b.x0 * 31 + b.y0 * 17) % 100,
  });
}

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

  // A car is 2.25 tiles long now that it is a real volume, so it blocks THREE
  // tiles along its axis and one across, and it is anchored on the MIDDLE tile
  // so the sprite stands on exactly the tiles it blocks.
  const carSpots = [[12, 10], [7, 15], [24, 13], [16, 25], [27, 8], [14, 18], [9, 20], [19, 28]];
  let carV = 0;
  for (const [cx0, cy] of carSpots) {
    // the third tile can land on junk that was scattered first - slide the
    // wreck along its own axis rather than losing it off the map
    let cx = -1;
    for (const off of [0, -1, 1, -2]) {
      const x = cx0 + off;
      if (x < 1 || x + 2 >= MAP_W - 1) continue;
      if (reserved(x, cy) || reserved(x + 1, cy) || reserved(x + 2, cy)) continue;
      cx = x; break;
    }
    if (cx < 0) continue;
    const prop = { gx: cx + 1, gy: cy, type: 'car', v: carV++ % 2, dir: 'x', foot: [cx, cy, 3, 1] };
    props.push(prop);
    for (let i = 0; i < 3; i++) { solid[cy][cx + i] = true; crushProps[(cx + i) + ',' + cy] = prop; }
  }

  for (const p of props) {
    if (!p.foot || !p.type.startsWith('mound')) continue;   // cover to spawn behind
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
        // 7 = forecourt: ground already claimed by a landmark that needs its
        // open space (the gas station). Buildings dropped on it used to stand
        // underneath the canopy — that was the grey slab floating over the road.
        const gt = ground[y][x];
        if (gt === 4 || gt === 5 || gt === 7 || solid[y][x]) return false;
      }
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) { solid[y][x] = true; heavy[y][x] = true; ground[y][x] = 2; }
    buildings.push({ x0, y0, w, h, kind: kind || null });
    return true;
  }
  // ---------- landmarks first, so they claim their ground ----------
  // THE GAS STATION claims its forecourt before anything else is built, or the
  // block-filler drops houses where the pumps go and the canopy hangs over them
  const GX = 132, GY = 125;
  for (let y = GY - 1; y < GY + 14; y++)
    for (let x = GX - 1; x < GX + 24; x++)
      if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1 && ground[y][x] !== 4 && ground[y][x] !== 5)
        ground[y][x] = 7;

  // THE SCHOOL: a long pale block with a fenced yard, on the east cross street
  const SCH = { x: 108, y: 56, w: 22, h: 11 };
  placeBuilding(SCH.x, SCH.y, SCH.w, SCH.h, 'K');
  for (let y = SCH.y + SCH.h + 1; y < SCH.y + SCH.h + 7; y++)
    for (let x = SCH.x; x < SCH.x + SCH.w; x++)
      if (x < MAP_W - 1 && y < MAP_H - 1 && !solid[y][x]) ground[y][x] = 7;   // playground

  // THE REGENT HOTEL and the CITY & COUNTY BANK — landmarks, not enterable.
  // No name bubbles: a sign only exists where a sign prop stands.
  placeBuilding(112, 96, 18, 13, 'T');
  placeBuilding(60, 96, 16, 12, 'N');

  // ST MARTIN'S: the cathedral that becomes Candlelight. It sits well off the
  // gate road, north of the east cross — you get there by turning twice, not
  // by walking one straight line from the yard.
  // The nave runs NORTH, so the west front — towers, portal, rose — faces
  // SOUTH, at the parvis and the last sign of the trail. Everything about
  // the approach depends on that: turn the church round and the player walks
  // up to a blank flank.
  const CH = { x: 50, y: 52, w: 12, h: 16 };
  placeBuilding(CH.x, CH.y, CH.w, CH.h, 'C');
  // the parvis: paved apron across the front and a strip down each flank
  for (let y = CH.y + CH.h; y < CH.y + CH.h + 3; y++)
    for (let x = CH.x - 3; x < CH.x + CH.w + 3; x++)
      if (x > 0 && x < MAP_W - 1 && y < MAP_H - 1 && !solid[y][x]) ground[y][x] = 5;
  for (let y = CH.y + 2; y < CH.y + CH.h; y++)
    for (const x of [CH.x - 2, CH.x - 1, CH.x + CH.w, CH.x + CH.w + 1])
      if (x > 0 && x < MAP_W - 1 && y < MAP_H - 1 && !solid[y][x]) ground[y][x] = 5;
  // THE WEST DOOR. The portal sits on the facade's centre line (tx 6 of the
  // volume), so these two tiles are the threshold: they come out of the solid
  // block, and standing on them is what takes you inside.
  for (const dx of [5, 6]) {
    solid[CH.y + CH.h - 1][CH.x + dx] = false;
    heavy[CH.y + CH.h - 1][CH.x + dx] = false;
    ground[CH.y + CH.h - 1][CH.x + dx] = 5;
  }

  // ---------- THE CORDON: the road to the church, and only two ways in ----
  //
  // Why this exists. The Fringe was drawn as streets laid over open lots, so
  // you could walk to St Martin's across the waste ground between blocks and
  // never touch a road. Two roadblocks on two crossroads would have gated
  // nothing at all — measured before any of this was written: cutting the
  // east cross at both junctions still left the church reachable by 46 of its
  // 46 forecourt tiles.
  //
  // So the fix is not a fence, it is CITY. The east cross between the spine
  // and the mid street becomes a proper street — continuous building frontage
  // on both sides, the way a real one has — with exactly one opening in it,
  // and that opening is the churchyard gate. The corridor then has two ends,
  // and both ends are crossroads. Put a roadblock on each and every route to
  // the church runs through one of them. Verified by flood fill from the yard
  // gate: both blocks shut, 0 of 24 forecourt tiles reachable; either one
  // open, all 24. Nothing else in the city is cut off by it.
  //
  //        spine                mid street
  //          |                       |
  //   =======+===[WEST BLOCK]==...===+=======   <- east cross (y 75)
  //          |         ^             |
  //        (30,75)     |           (92,75)
  //                 churchyard gate, north side
  const CORR = { x0: 36, x1: 88, gate: [50, 61], north: 69, south: 81 };
  const PIERS = [[48, 49], [62, 63]];            // churchyard gate piers

  // a gap too small for a building becomes a yard wall — which is exactly
  // what a real terrace does where it runs out of house
  function yardWall(x0, x1, y, dir) {
    for (let x = x0; x <= x1; x++) {
      if (x < 1 || x >= MAP_W - 1 || solid[y][x]) continue;
      solid[y][x] = true; heavy[y][x] = true;
      props.push({ gx: x, gy: y, type: 'stoneWall', dir: dir || 'x' });
    }
  }

  // close one side of the corridor: walk the frontage row and fill every hole
  function frontageRun(row, faceNorth) {
    let x = CORR.x0;
    const skip = (t) => faceNorth &&
      ((t >= CORR.gate[0] && t <= CORR.gate[1]) ||
       PIERS.some(pr => t >= pr[0] && t <= pr[1]));
    while (x <= CORR.x1) {
      if (skip(x) || solid[row][x]) { x++; continue; }
      let x2 = x;
      while (x2 <= CORR.x1 && !solid[row][x2] && !skip(x2)) x2++;
      let t = x;
      while (t < x2) {
        const run = Math.min(x2 - t, 5 + ((rng() * 7) | 0));
        const roll = rng();
        const kind = roll < 0.46 ? 'H' : roll < 0.72 ? 'S' : roll < 0.9 ? 'B' : 'O';
        let placed = false;
        for (let depth = 9; depth >= 2 && !placed; depth--) {
          const y0 = faceNorth ? row - depth + 1 : row;
          placed = placeBuilding(t, y0, run, depth, kind);
        }
        if (!placed) yardWall(t, t + run - 1, row, 'x');
        t += run;
      }
      x = x2;
    }
  }
  frontageRun(CORR.north, true);
  frontageRun(CORR.south, false);
  // the churchyard's own wall, returning to the street either side of the
  // gate. Two tiles deep, so from the road it reads as a pair of stone piers.
  for (const [a, b] of PIERS) {
    yardWall(a, b, 68, 'x');
    yardWall(a, b, 69, 'x');
  }

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


  // ---------- one solid volume per building ----------
  for (const b of buildings) addBuildingProp(b);

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
        const sd = vertical ? 'y' : 'x';        // things along this street
        if (r < 0.42) placeProp(x, y, 'streetlight', { lit: rng() < 0.28 });   // a few still burn
        else if (r < 0.55) placeProp(x, y, 'dumpster', { dir: sd });
        else if (r < 0.66) placeProp(x, y, 'postbox');
        else if (r < 0.78) placeProp(x, y, 'hydrant');
        else if (r < 0.86) placeProp(x, y, 'busStop', { dir: sd });
      }
    }
    // lane paint down the middle, sheared to lie along the road
    if (vertical) for (let t2 = start + 2; t2 < start + len - 2; t2 += 3) decals.push({ gx: s.x0 + 0.4, gy: t2, type: 'dashY' });
    else for (let t2 = start + 2; t2 < start + len - 2; t2 += 3) decals.push({ gx: t2, gy: s.y0 + 0.4, type: 'dashX' });
  }
  // traffic lights + crossings at the junctions
  for (const [jx, jy] of [[30, 120], [30, 75], [30, 36], [92, 75], [92, 36], [165, 75], [165, 120], [92, 120]]) {
    placeProp(jx + 5, jy + 5, 'trafficLight') || placeProp(jx - 5, jy - 5, 'trafficLight');
    // crossings lie across the carriageway, on the road's own diagonal
    decals.push({ gx: jx, gy: jy + 6.5, type: 'crossbarX' });
    decals.push({ gx: jx + 6.5, gy: jy, type: 'crossbarY' });
  }

  // ---------- the traffic jam: cars queued nose to tail, doors open ----------
  // cars lie ALONG their road: dir 'x' east-west, 'y' north-south
  function car(cx, cy, v, dir) {
    if (dir === 'y') {
      if (cy + 2 >= MAP_H - 1) return;
      for (let i = 0; i < 3; i++) if (solid[cy + i][cx]) return;
      const p = { gx: cx, gy: cy + 1, type: 'car', v: v % 2, dir: 'y', foot: [cx, cy, 1, 3] };
      props.push(p);
      for (let i = 0; i < 3; i++) { solid[cy + i][cx] = true; crushProps[cx + ',' + (cy + i)] = p; }
      return;
    }
    if (cx + 2 >= MAP_W - 1) return;
    for (let i = 0; i < 3; i++) if (solid[cy][cx + i]) return;
    const p = { gx: cx + 1, gy: cy, type: 'car', v: v % 2, dir: 'x', foot: [cx, cy, 3, 1] };
    props.push(p);
    for (let i = 0; i < 3; i++) { solid[cy][cx + i] = true; crushProps[(cx + i) + ',' + cy] = p; }
  }
  let cv = 0;
  for (let x = 60; x < 190; x += 5 + ((rng() * 4) | 0)) car(x, 118 + ((rng() * 3) | 0), cv++, 'x');
  for (let y = 40; y < 115; y += 6 + ((rng() * 5) | 0)) car(28 + ((rng() * 3) | 0), y, cv++, 'y');
  for (let x = 40; x < 150; x += 9 + ((rng() * 6) | 0)) car(x, 74 + ((rng() * 2) | 0), cv++, 'x');
  // a bus slewed across the mid junction — footprint matches the sprite
  if (!solid[76][89] && !solid[76][90] && !solid[76][91]) {
    for (let x = 89; x <= 91; x++) solid[76][x] = true;
    props.push({ gx: 90, gy: 76, type: 'bus', dir: 'x' });
  }

  // ---------- THE GAS STATION (proper forecourt layout) ----------
  // canopy on six pillars over two kerbed pump islands, shop to the east,
  // painted in/out lanes, and a pylon totem you see from up the road
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
  // the shop, glazed, east of the canopy — a working landmark, not a ruin.
  // Release its own tiles from the forecourt claim so it may stand there.
  for (let y = GY + 2; y < GY + 10; y++)
    for (let x = GX + 17; x < GX + 23; x++)
      if (x < MAP_W - 1 && y < MAP_H - 1) ground[y][x] = 2;
  if (placeBuilding(GX + 17, GY + 2, 6, 8, 'S')) {
    buildings[buildings.length - 1].landmark = true;
    addBuildingProp(buildings[buildings.length - 1]);
  }
  // pylon totem at the roadside
  if (!solid[GY - 1][GX + 20]) {
    solid[GY - 1][GX + 20] = true;
    props.push({ gx: GX + 20, gy: GY - 1, type: 'pylon' });
  }
  // forecourt markings: in and out
  for (let i = 0; i < 5; i++) decals.push({ gx: GX + 3 + i * 3, gy: GY - 0.4, type: 'arrowXp' });
  for (let i = 0; i < 4; i++) decals.push({ gx: GX + 4 + i * 3, gy: GY + 12.4, type: 'arrowXm' });

  // ---------- signs: ONLY the shelter, and all of it handmade ----------
  // Someone walked this road afterwards with a paint tin. Planks nailed to
  // broom handles, a bedsheet between two poles, arrows daubed on the tarmac.
  // dir = where the trail continues: 'xm' west along the road, 'ym' north up
  // the spine. The board is angled to its street and the arrow points that way.
  // Nobody paints a distance in kilometres on a bedsheet. They tell the next
  // person where to walk and where to turn: stay on this road, turn here, left
  // at the crossroads. Each board is angled to its street and its arrow points
  // the way you go next, so "left" is never ambiguous.
  // Route: west along the gate road → north up the mid street → west along the
  // east cross → the church. Three legs, two turns.
  const SIGNS = [
    // leg 1 — the gate road, heading west (signs stand on the north pavement)
    { gx: 188, gy: 114, text: 'SHELTER THIS WAY', kind: 'plank', dir: 'xm' },
    { gx: 168, gy: 114, text: 'KEEP TO THIS ROAD', kind: 'plank', dir: 'xm' },
    { gx: 146, gy: 114, text: 'FOOD AND BEDS AT THE END', kind: 'cloth', dir: 'xm' },
    { gx: 124, gy: 114, text: 'STAY ON IT TILL THE NEXT SIGN', kind: 'plank', dir: 'xm' },
    { gx: 106, gy: 114, text: 'TURN AT THE LIGHTS AHEAD', kind: 'plank', dir: 'xm' },
    // the first turn — north, up the mid street
    { gx: 96, gy: 114, text: 'TURN HERE. UP THIS STREET', kind: 'plank', dir: 'ym' },
    { gx: 95, gy: 104, text: 'KEEP GOING UP THIS ONE', kind: 'cloth', dir: 'ym' },
    { gx: 95, gy: 88, text: 'LEFT AT THE CROSSROADS', kind: 'plank', dir: 'ym' },
    // the second turn — west along the east cross
    { gx: 89, gy: 71, text: 'LEFT HERE. FOLLOW THE ROAD', kind: 'plank', dir: 'xm' },
    { gx: 76, gy: 71, text: 'ST MARTINS. NOT FAR NOW', kind: 'cloth', dir: 'xm' },
    { gx: 66, gy: 71, text: 'ALMOST THERE. KEEP ON', kind: 'plank', dir: 'xm' },
    // The trail stops at the road. The last board used to stand on the parvis
    // itself — "YOU MADE IT. KNOCK." — and a plank on poles in front of the
    // west front just got in the way of the building. The turn-off board below
    // is the last one you read; the cathedral says the rest by being there.
  ];
  for (const s of SIGNS) {
    const x = s.gx | 0, y = s.gy | 0;
    if (x < MAP_W - 1 && y < MAP_H - 1 && !solid[y][x]) {
      solid[y][x] = true;
      props.push({ gx: x, gy: y, type: 'sign', kind: s.kind, dir: s.dir, text: s.text });
      signs.push({ gx: x, gy: y, text: s.text, kind: s.kind });
    }
  }
  // painted arrows on the tarmac, following the same three legs
  for (const ax of [178, 158, 138, 118, 100])
    decals.push({ gx: ax, gy: 118.6, type: 'arrowXm' });
  for (const ay of [110, 98, 86])
    decals.push({ gx: 90.6, gy: ay, type: 'arrowYm' });
  for (const ax of [84, 74, 64])
    decals.push({ gx: ax, gy: 73.6, type: 'arrowXm' });

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
  // one board by the gate, its text on the same tile as the post
  props.push({ gx: MAP_W - 4, gy: 117, type: 'sign', kind: 'plank', dir: 'xp', text: 'JUNKYARD' });
  signs.push({ gx: MAP_W - 4, gy: 117, text: 'JUNKYARD', kind: 'plank' });


  // ---------- THE TWO ROADBLOCKS ----------
  // One on each crossroads that ends the church corridor: the spine junction
  // in the west, the mid-street junction in the east. The signed shelter trail
  // walks you straight into the EAST one — the bandits sited it exactly where
  // somebody else's arrows funnel frightened people — and the long way round,
  // back down the spine, only brings you to the other.
  //
  // Each is one tile thick and spans the full street, pavement to pavement,
  // with a two-tile chicane left open in it. You are meant to get through:
  // the gap is the door, the four of them standing behind it are the lock.
  //
  // ANGLE: the barricade runs along world +y, so every piece takes its 'y'
  // variant. Nothing here is an upright rectangle except the braziers and the
  // flag, which are free-standing and may be drawn straight.
  function clearFor(x0, x1, y0, y1) {
    for (let i = props.length - 1; i >= 0; i--) {
      const q = props[i];
      if (q.type === 'building' || q.type === 'wallSlice' || q.type === 'canopy') continue;
      const f = q.foot;
      const qx0 = f ? f[0] : q.gx, qy0 = f ? f[1] : q.gy;
      const qx1 = f ? f[0] + f[2] - 1 : q.gx, qy1 = f ? f[1] + f[3] - 1 : q.gy;
      if (qx1 < x0 || qx0 > x1 || qy1 < y0 || qy0 > y1) continue;
      for (let y = qy0; y <= qy1; y++)
        for (let x = qx0; x <= qx1; x++) {
          if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) solid[y][x] = false;
          delete crushProps[x + ',' + y];
        }
      props.splice(i, 1);
    }
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (!heavy[y][x]) solid[y][x] = false;
  }
  function blockProp(x, y, type, extra) {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return null;
    if (heavy[y][x]) return null;                    // never bury a building
    solid[y][x] = true;
    const p = Object.assign({ gx: x, gy: y, type }, extra || {});
    props.push(p);
    return p;
  }
  // dressing that must NOT close the street — skipped if its tile is needed
  function dressProp(x, y, type, extra) {
    if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) return null;
    if (solid[y][x] || heavy[y][x]) return null;
    return blockProp(x, y, type, extra);
  }

  function buildRoadblock(id, lineX, gap, facing, label) {
    const Y0 = 70, Y1 = 80;                          // pavement to pavement
    clearFor(lineX - 1, lineX + 1, Y0, Y1);
    // the barricade line, mixed materials — nobody builds one of these out of
    // a single thing, they build it out of whatever was in the street
    const PLAN = {};
    PLAN[Y0] = 'sandbags'; PLAN[Y0 + 1] = 'barricade'; PLAN[Y0 + 2] = 'barricade';
    PLAN[Y0 + 3] = 'barricadeTall'; PLAN[Y0 + 6] = 'conBlock';
    PLAN[Y0 + 7] = 'barricade'; PLAN[Y0 + 8] = 'barricade';
    PLAN[Y0 + 9] = 'sandbags'; PLAN[Y0 + 10] = 'sandbags';
    for (let y = Y0; y <= Y1; y++) {
      if (y >= gap[0] && y <= gap[1]) continue;       // the chicane
      blockProp(lineX, y, PLAN[y] || 'barricade', { dir: 'y' });
    }
    // razor coils flanking the gap on the APPROACH side, so the way through
    // reads as a throat you are funnelled into rather than a hole in a wall
    dressProp(lineX + facing, gap[0] - 1, 'razorWire', { dir: 'y' });
    dressProp(lineX + facing, gap[1] + 1, 'razorWire', { dir: 'y' });
    // fire either side of it: this is lit and it is watched, day and night
    dressProp(lineX + facing * 2, gap[0] - 1, 'brazier');
    dressProp(lineX - facing * 2, gap[1] + 1, 'brazier');
    dressProp(lineX - facing, Y0 + 1, 'banditFlag');
    // a wreck dragged in behind the line to thicken it, lying ALONG the street
    car(lineX - facing * 2, Y0 + 7, 3, 'y');
    // and a board nailed up facing the way you come in, in the same handmade
    // language as the rest of this road — except it is not trying to help you
    const sx = lineX + facing * 3, sy = Y1 - 1;
    if (!solid[sy][sx] && !heavy[sy][sx]) {
      solid[sy][sx] = true;
      const dir = facing < 0 ? 'xp' : 'xm';   // the way you are walking
      props.push({ gx: sx, gy: sy, type: 'sign', kind: 'plank', dir, text: label });
      signs.push({ gx: sx, gy: sy, text: label, kind: 'plank' });
    }
    // where the four of them stand: behind their own line, on their own side
    const inX = (n) => lineX - facing * n;
    const mid = (gap[0] + gap[1]) / 2 + 0.5;
    const posts = [
      { x: inX(3) + 0.5, y: mid - 1.5, role: 'knife', v: 0 },
      { x: inX(3) + 0.5, y: mid + 1.5, role: 'knife', v: 1 },
      { x: inX(6) + 0.5, y: mid + 0.5, role: 'pistol' },
      { x: inX(9) + 0.5, y: mid - 0.5, role: 'rifle' },
    ];
    // nudge anybody standing in something onto ground they can actually hold
    for (const p of posts) {
      if (canStand(p.x, p.y, 0.3)) continue;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [0, -2], [2, 0], [-2, 0]]) {
        if (canStand(p.x + dx, p.y + dy, 0.3)) { p.x += dx; p.y += dy; break; }
      }
    }
    roadblocks.push({
      id, lineX, gap, facing, posts,
      gate: { x: lineX + 0.5, y: mid },              // the hole in the line
      cleared: false,
    });
  }
  // `facing` points from the line toward the side you ARRIVE from. The west
  // block sits at the spine crossroads and is walked into heading east, so it
  // faces west; the east block at the mid-street crossroads faces east. Their
  // chicanes sit at different heights so the pair never reads as copy-paste.
  buildRoadblock('west', 38, [74, 75], -1, 'TOLL. LEAVE WHAT YOU CARRY');
  buildRoadblock('east', 86, [76, 77], 1, 'THIS ROAD IS OURS. PAY OR TURN BACK');

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
// AREA 3 — CANDLELIGHT, the inside of St Martin's
// A cathedral is not the point. A cathedral people are living in is the point.
// Plan: design/candlelight.md
// =====================================================================
// CANDLELIGHT, second layout. Three rules came out of the first one:
//
//   1. The floor is the footprint. 12x16 on the street, 12x16 inside.
//   2. ONLY THE FAR WALLS ARE WALLS. The north and west sides get full height;
//      the two the camera looks over get a ten-pixel kerb. A full wall there
//      has to be faded to see past, and a faded wall reads as a sheet of glass
//      lying across the floor with the people showing through it.
//   3. One thing per tile, and the room proves it. `put` below refuses to
//      stack anything and throws if the layout tries — the first pass had a
//      bench, a shelf and a pier occupying the same corner of the screen.
//
// Budget: 192 tiles. 27 go to the two real walls, 27 to the kerb, ~34 to
// furniture and piers. That leaves a bit over a hundred to walk on, which is
// what stops a camp from being a warehouse full of crates.
const CAND_W = 12, CAND_H = 16;
function shellWalls(doorX0, doorX1) {
  const W = MAP_W, H = MAP_H;
  const ik = n => Array.from({ length: n }, () => 'I');
  const lk = n => Array.from({ length: n }, () => 'L');
  wallRun(Array.from({ length: W }, (_, i) => [i, 0]), ik(W), 'x', false, true, true);
  wallRun(Array.from({ length: H }, (_, i) => [0, i]), ik(H), 'y', false, true, true);
  // near sides: kerb only, and never `front` — nothing here needs fading
  wallRun(Array.from({ length: H - 1 }, (_, i) => [W - 1, i]), lk(H - 1), 'y', false, true, true);
  const sL = [], sR = [];
  for (let x = 0; x < W; x++) {
    if (x < doorX0) sL.push([x, H - 1]);
    else if (x > doorX1) sR.push([x, H - 1]);
  }
  wallRun(sL, lk(sL.length), 'x', false, true, false);
  wallRun(sR, lk(sR.length), 'x', false, false, true);
}
// one thing per tile, and it says so out loud if the layout is wrong
function placer() {
  const taken = new Set();
  return (x, y, type, extra) => {
    const foot = (extra && extra.foot) || [x, y, 1, 1];
    for (let j = foot[1]; j < foot[1] + foot[3]; j++) {
      for (let i = foot[0]; i < foot[0] + foot[2]; i++) {
        const k = i + ',' + j;
        if (taken.has(k) || solid[j][i]) {
          console.warn('CANDLELIGHT: ' + type + ' wants ' + k + ', already occupied');
          return null;
        }
        taken.add(k);
        solid[j][i] = true;
      }
    }
    const pr = Object.assign({ gx: x, gy: y, type }, extra || {});
    props.push(pr);
    return pr;
  };
}

function buildCandlelight() {
  const rng = mulberry32(31415);
  resetMap(CAND_W, CAND_H, rng);
  const W = MAP_W, H = MAP_H;

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    ground[y][x] = 8;
    groundVar[y][x] = (rng() * 6) | 0;
  }
  for (let y = 2; y < H - 1; y++) for (let x = 4; x <= 7; x++) ground[y][x] = 9;   // walked smooth
  for (let y = 7; y <= 14; y++) for (let x = 1; x <= 2; x++) ground[y][x] = 10;    // straw, under the bays

  shellWalls(5, 6);
  const put = placer();

  // ---- THE FOURTH RULE, and it is the one this pass is about: ONE THING PER
  // TILE IS NOT ONE THING PER SCREEN. A 54px pier stands on a single tile and
  // still paints over three tiles of the room behind it, because in this
  // projection a tall sprite at (a,b) covers the whole diagonal x-y = a-b
  // above it. So there are two spacings to keep, not one:
  //
  //   * COLUMN. Nothing worth looking at may sit in a pier's column (same
  //     x-y) within about seven tiles of screen-depth above it. For the four
  //     piers below that rules out (1,3) (2,4) (5,7) (6,8) (7,9) (5,2) (6,3)
  //     (7,4) (1,8) (2,9) — and nothing else, so it is a cheap rule to keep.
  //   * DEPTH. Two big props in the same narrow aisle need three tiles of
  //     x+y between them, not one. Adjacent is what put the chest completely
  //     behind the curtain and the crate completely behind Osk.
  //
  // Checked by the screen-space cover audit, not by eye.
  for (const [px2, py2] of [[3, 5], [8, 5], [3, 10], [8, 10]]) {
    put(px2, py2, 'pier');
    heavy[py2][px2] = true;
  }

  // ---- NORTH: the chancel. Map table centre, hatch to the crypt in the
  // corner, and the whole north-west corner left as floor — the hatch is the
  // biggest sprite in the building and anything beside it stands on it.
  put(1, 1, 'stairDown');
  put(5, 1, 'mapTable', { foot: [5, 1, 2, 1] });
  put(3, 1, 'candles'); put(8, 1, 'candles');

  // ---- WEST, north end: Bo's bench, clear of the pier column at (1,3)
  put(1, 5, 'workbench', { foot: [1, 5, 2, 1] });

  // ---- EAST, north end: the medbay
  put(10, 2, 'candles');
  put(10, 3, 'cot'); put(10, 5, 'cot');
  put(9, 3, 'table');

  // ---- WEST, south end: the sleeping bays on straw, then the store.
  // Two tiles of gap between bays: the bedding is short enough to survive it,
  // the curtain and the crate are not, so they take the odd rows.
  // and the aisle walkway at x=2 stays open: nothing stands there except
  // opposite a bay, or the bay next to it is walled in on all four sides
  put(1, 7, 'curtain', { dir: 'y' }); put(2, 7, 'crate');
  put(1, 9, 'bedding');
  put(1, 11, 'bedding'); put(2, 11, 'sacks');
  put(1, 13, 'bedding'); put(2, 13, 'chest', { open: false, loot: 'junk' });

  // ---- EAST, south end: the hearth and Halden's pitch
  put(10, 6, 'sacks');
  put(10, 8, 'hearth');
  put(9, 10, 'table'); put(9, 12, 'stool');
  put(10, 11, 'crate');
  put(9, 13, 'chest', { open: false, loot: 'scrap' });

  // ---- THE NAVE: floor, and that is the point.
  // It had two pews and two fire barrels in it and read as cluttered rather
  // than lived-in — a camp needs somewhere to WALK. The hearth, the votive
  // stands and the drone bench still light it; nothing here needed a brazier
  // to be seen by.

  buildAO();
  buildSpatialIndex();
}

// =====================================================================
// AREA 4 — THE CRYPT. Under the chancel, so a fraction of the church.
// =====================================================================
const CRYPT_W = 10, CRYPT_H = 8;
function buildCrypt() {
  const rng = mulberry32(2718);
  resetMap(CRYPT_W, CRYPT_H, rng);
  const W = MAP_W, H = MAP_H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    ground[y][x] = 11;
    groundVar[y][x] = (rng() * 6) | 0;
  }
  const jk = n => Array.from({ length: n }, () => 'J');
  const lk = n => Array.from({ length: n }, () => 'L');
  wallRun(Array.from({ length: W }, (_, i) => [i, 0]), jk(W), 'x', false, true, true);
  wallRun(Array.from({ length: H }, (_, i) => [0, i]), jk(H), 'y', false, true, true);
  wallRun(Array.from({ length: H - 1 }, (_, i) => [W - 1, i]), lk(H - 1), 'y', false, true, true);
  wallRun(Array.from({ length: W }, (_, i) => [i, H - 1]), lk(W), 'x', false, true, true);

  // The crypt is the store, not a farm: nothing grows under a church. What is
  // down here is what keeps — water off the roof, hay, jars, and one box the
  // camp does not open.
  const put = placer();
  put(1, 1, 'stairUp');                       // straight under the hatch above
  put(8, 1, 'cistern');
  put(4, 2, 'waterVat'); put(6, 2, 'waterVat');
  // the bales are the tallest thing down here, so they take their own columns
  put(4, 6, 'hayStack'); put(6, 6, 'hayStack');   // not (7,6): it sealed the east corner
  put(8, 3, 'preserves'); put(8, 5, 'preserves');
  put(1, 5, 'strongbox');
  // THE DRUM IS IN THIS ONE. The camp keeps what it cannot use down here next
  // to what it cannot open, and a magazine for a rifle nobody owns is exactly
  // that — so the biggest change you can make to the rifle is something you
  // find in the dark under a church, not something on a counter.
  put(1, 6, 'chest', { open: false, loot: 'crypt', part: 'magDrum' });
  // The rations sit with the rest of the food, by the cistern and the preserve
  // racks. NOT the east corner it was in: hay, preserves and two walls boxed
  // it so it could only be approached diagonally — and a diagonal is 1.41
  // tiles against a 1.4 reach, so it simply could not be opened. Not (7,4)
  // either: that sealed (8,4) between the two preserve racks instead.
  put(7, 3, 'chest', { open: false, loot: 'mre' });
  put(3, 3, 'candles'); put(6, 3, 'candles');
  put(1, 3, 'barrel');

  buildAO();
  buildSpatialIndex();
}

// =====================================================================
// AREA REGISTRY
// =====================================================================
// ONE COORDINATE SPACE. `world` is an area's offset in city tiles, so a tile
// at (tx, ty) in area A lives at (A.world.x + tx, A.world.y + ty) and there is
// no separate "world view" to keep in sync with the area view — zooming out is
// the same draw call with a smaller number. Areas are laid out at TRUE
// RELATIVE SIZE: the yard is 32x32 against the city's 200x150 and it looks it,
// which is honest about how far you have walked.
//
// The yard sits off the city's eastern edge, level with the gate road it
// arrives on. Interiors sit exactly on the footprint of the building they are
// inside — the inside of the church IS at the church — but they are only drawn
// while you are in them, or the city would have lit rooms floating on it.
const Areas = {
  junkyard: {
    id: 'junkyard', name: 'THE JUNKYARD', build: buildJunkyard,
    world: { x: 206, y: 106 },
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
    world: { x: 0, y: 0 },
    hasScrapper: false, hasBoss: false, hasNpc: false, hasBandits: true,
    // raiders hold the roadblocks; the droid squads patrol between them
    hasDroids: true,
    tint: '#efe0cc',      // thinner, cooler, brighter than the yard's dusk
    makeItems: () => ([
      { type: 'ammo', x: 150.5, y: 130.5, amount: 6, bob: 0.8 },
      { type: 'ammo', x: 62.5, y: 122.5, amount: 6, bob: 2.4 },
      { type: 'ammo', x: 33.5, y: 88.5, amount: 6, bob: 1.5 },
    ]),
    // back through the yard gate, and in at the west door of St Martin's
    exits: [
      { x0: 196.4, y0: 117.6, x1: 201, y1: 122.4, to: 'junkyard', entry: { x: 29.6, y: 12.5 } },
      { x0: 54.8, y0: 66.3, x1: 57.2, y1: 67.95, to: 'candlelight', entry: { x: 5.5, y: 13.4 } },
    ],
  },
  candlelight: {
    id: 'candlelight', name: 'CANDLELIGHT', build: buildCandlelight,
    world: { x: 50, y: 52 },        // the church's own footprint, exactly
    hasScrapper: false, hasBoss: false, hasNpc: false, folk: 'camp',
    indoors: true,
    tint: '#f0d4b0',        // firelight, but the stone still has to read as stone
    makeItems: () => ([
      { type: 'ammo', x: 6.5, y: 5.5, amount: 6, bob: 0.5 },
    ]),
    exits: [
      { x0: 4.4, y0: 14.4, x1: 7.6, y1: 16, to: 'fringe', entry: { x: 56.5, y: 69.5 } },
      // the hatch is one tile now, so the zone is the hatch and its doorstep
      { x0: 0.6, y0: 0.6, x1: 2.4, y1: 2.4, to: 'crypt', entry: { x: 3.5, y: 2.5 } },
    ],
  },
  crypt: {
    id: 'crypt', name: 'THE CRYPT', build: buildCrypt,
    world: { x: 51, y: 53 },        // under the chancel
    hasScrapper: false, hasBoss: false, hasNpc: false, folk: 'crypt',
    indoors: true,
    tint: '#a9bccc',        // cold, and three lamps against it
    makeItems: () => ([]),
    exits: [
      // the stair tile only. Land the player CLEAR of it coming down, or the
      // zone they arrive in never disarms and the stair will not take them back.
      { x0: 0.6, y0: 0.6, x1: 2.4, y1: 2.4, to: 'candlelight', entry: { x: 3.5, y: 2.5 } },
    ],
  },
};

// =====================================================================
// PLACES — what is where, for the map
// =====================================================================
// One table. `kind` picks the icon; `travel` is where fast travel puts you
// down, and its presence is what makes a place a destination at all.
//
// A PLACE IS KNOWN WHEN ITS TILE IS EXPLORED. There is nothing else to store
// and nothing to save: fog is already per-area, already persisted and already
// migrated, so discovery, the map and the fast-travel list all fall out of
// data the game has kept since v3. An unknown place is drawn nowhere.
const POIS = [
  { id: 'shack', area: 'junkyard', x: 21.5, y: 6.5, kind: 'camp',
    name: "MAREK'S SHACK", travel: { x: 21.5, y: 10.5 },
    blurb: 'One lit window in a yard of dead machines. The old man trades, and he does not ask questions he would not want asked back.' },
  { id: 'yardgate', area: 'junkyard', x: 30.5, y: 12.5, kind: 'gate',
    name: 'THE YARD GATE', blurb: 'East, out of the yard, onto the old ring road. It was chained shut for a reason.' },
  { id: 'yardgate-f', area: 'fringe', x: 197, y: 120, kind: 'gate',
    name: 'THE YARD GATE', blurb: 'Back into the junkyard. Marek is still in there, and he still has the only counter in the ring worth the walk.' },
  { id: 'stmartins', area: 'fringe', x: 56, y: 60, kind: 'camp',
    name: 'CANDLELIGHT', travel: { x: 56.5, y: 69.5 },
    blurb: "St Martin's, and people living in it. Fires, a medbay, a map of the ring drawn by the people who walked it." },
  { id: 'gas', area: 'fringe', x: 143, y: 131, kind: 'landmark',
    name: 'THE FORECOURT', blurb: 'Six pillars, a canopy and four pumps still holding whatever was in them. Nothing here is safe to shoot.' },
  { id: 'school', area: 'fringe', x: 119, y: 61, kind: 'landmark',
    name: 'ALDERGROVE PRIMARY', blurb: 'A long pale block with a playground behind it. Somebody painted over the name and then gave up.' },
  { id: 'hotel', area: 'fringe', x: 121, y: 102, kind: 'landmark',
    name: 'THE REGENT HOTEL', blurb: 'Nine floors of grey. The lobby doors are still revolving in the wind if you stand close enough to hear it.' },
  { id: 'bank', area: 'fringe', x: 68, y: 102, kind: 'landmark',
    name: 'CITY & COUNTY BANK', blurb: 'Stone, columns, and a vault nobody has got into. The Correction did not care about money and neither does anyone left.' },
];

// The sign trail is not written into the table — it is generated off the signs
// the area already placed, so the two can never drift apart.
function poisFor(areaId) {
  const out = POIS.filter(p => p.area === areaId);
  if (areaId === currentArea && typeof signs !== 'undefined') {
    for (const s of signs) {
      out.push({ id: 'sign@' + s.gx + ',' + s.gy, area: areaId, x: s.gx, y: s.gy,
                 kind: 'sign', name: s.text, blurb: 'Hand-painted, and still standing. Somebody wanted whoever came next to find the way.' });
    }
  }
  return out;
}

// build the starting area immediately so everything downstream has a map
buildJunkyard();
