// AREAS — the world is a set of hand-authored areas linked at their edges.
// The live map arrays below are swapped when the player changes area, so the
// rest of the engine keeps talking to the same names it always has.

let MAP_W = 32, MAP_H = 32;

// ground: 0 asphalt, 1 dirt, 2 rubble, 3 wood planks (interior)
const ground = [];
const groundVar = [];
const solid = [];
const heavy = [];         // walls & mountains — stops even the boss
const burning = [];       // ground that is ON FIRE — walkable, and it hurts
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
  burning.length = 0;
  props.length = 0; decals.length = 0; moundSpawns.length = 0;
  boomBarrels.length = 0; patrolPoints.length = 0;
  roadblocks = [];
  crushProps = {};
  gateProp = null; SHACK = null;
  for (let y = 0; y < h; y++) {
    ground[y] = []; groundVar[y] = []; solid[y] = []; heavy[y] = []; burning[y] = [];
    for (let x = 0; x < w; x++) {
      ground[y][x] = 0;
      groundVar[y][x] = (rng() * 6) | 0;
      solid[y][x] = false;
      heavy[y][x] = false;
      burning[y][x] = false;
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

// WHERE THE FRINGE STOPS BEING THE FRINGE. Shared by the map builder (which
// makes these solid) and the renderer (which draws the fire and the water that
// explain why). See drawEdgeWeather in js/game.js.
// `front` is filled in by buildFringe: the fire's edge wanders, so the glow has
// to follow the same per-row boundary the collision uses.
const FRINGE_EDGES = { viaY0: 22, viaY1: 29, ashX1: 5, waterY0: 140, front: null, tunnels: null };

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
  // THE WEST LANE — a back street beyond the M7, through what the fire took.
  //
  // West of the spine was eight to fifteen tiles of ground with buildings
  // filling most of it: you could step off the kerb and you were already at the
  // edge. This is the road that makes it a place you walk THROUGH rather than a
  // verge you stand on — a north-south lane at x 14, with burnt shells between
  // it and the motorway and the fire coming the other way.
  //
  // It is painted and it blocks buildings like any street, but it is kept OUT
  // of `STREETS`, which is what the building-lining and street-dressing loops
  // walk. Those loops draw from the map's rng in a fixed order, and an extra
  // street in the middle of them would re-roll every building east of here.
  // The lane gets its own dressing pass, on its own seed, at the end.
  const WEST_LANES = [
    { x0: 15, y0: 31, x1: 15, y1: 138, half: 2, name: 'west lane' },
    // and two ways onto it from the motorway, so it is a junction and not a
    // scramble across open lots
    { x0: 15, y0: 52, x1: 30, y1: 52, half: 2, name: 'west link n' },
    { x0: 15, y0: 104, x1: 30, y1: 104, half: 2, name: 'west link s' },
  ];
  const ALL_STREETS = STREETS.concat(WEST_LANES);
  const onStreet = (x, y) => {
    for (const s of ALL_STREETS) {
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
      for (const s of ALL_STREETS) {
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

  // ---------- THE EDGES ----------
  // THIS MAP HAD NO EDGES. Measured before any of this was written: solid tiles
  // on the outer ring were 0 to the north, 0 to the south, 0 to the west and 0
  // to the east. You were not stopped by anything you could look at — you were
  // stopped by `x > 1 && x < MAP_W - 1` inside canStand. That is the whole
  // reason it read as a box and not as part of a ring.
  //
  // The atlas has specified what belongs on three of those sides since it was
  // drawn, and none of it was built. So the blockers go in — and they come
  // INWARD, to where the content actually stops, because the emptiness IS the
  // box: 30,000 tiles were carrying about 3,900 tiles of game, and two thirds
  // of the map was more than five tiles from anything at all.
  //
  // It runs HERE, after the streets and before the blocks, and that ordering is
  // the whole trick: placeBuilding already refuses a solid tile and placeProp's
  // freeSpot already demands pavement, so every later pass avoids the dead
  // ground for free. The map gets CHEAPER — the block filler stops generating
  // the ~34 props that used to stand out there where nobody goes.
  //
  // Every region below was checked against every POI, sign, item, chest, bench,
  // map table, raider, droid, area exit and the player's own entry point before
  // a line of it was written. All four came back clear.
  // See design/finish-the-fringe.md.
  const EDGE_ASH = 12, EDGE_WATER = 13, EDGE_DECK = 14, EDGE_SCORCH = 15, EDGE_TUNNEL = 16;
  // The renderer has to know where these run too — the fire glow and the water
  // are drawn as weather anchored to the fire line and the shore — so the
  // numbers live on the area definition and this pass reads them from there.
  // One place to change, and the art cannot drift away from the collision.
  const { viaY0: VIA_Y0, viaY1: VIA_Y1, ashX1: ASH_WEST, waterY0: WATER_Y0 } = FRINGE_EDGES;
  // THE TWO HOLES IN THE DECK. The spine goes under it at x 26-34 and the mid
  // street at x 88-96 — walkable, unlit, and dead-ending in rubble at y 21
  // because there is nothing on the far side yet. A tunnel you cannot walk out
  // of is a promise; a wall you later knock a hole in is a demolition.
  const DECK_HOLES = [[26, 34], [88, 96]];
  const inHole = (x) => DECK_HOLES.some(([a, b]) => x >= a && x <= b);
  // HOW FAR THE UNDERPASS ACTUALLY GOES. It used to stop at y 22, eight tiles
  // in — and what stopped you was ground id 14 that happened to be solid, with
  // NOTHING DRAWN ON IT. That is the invisible wall this whole plan exists to
  // get rid of, sitting at the one place on the map a player pushes hardest
  // against. It runs to y 12 now, in a cutting with real retaining walls, and
  // it ends against a collapse you can see.
  const TUN_Y0 = 12, TUN_END = 6;

  // THE FIRE IS NOT A LINE, AND IT IS NOT A WALL.
  //
  // First version of this made the Ashfield a dead-straight column at x = 19
  // and made every tile of it solid. Two things were wrong with that. A fire
  // does not have a ruled edge — a burn front eats into what it is burning in
  // bays and tongues — and a wall you cannot enter teaches you nothing: you
  // walk ten tiles west of the spine, stop against something the same colour
  // as the road, and the map has simply ended again, which is the box all over
  // again in a different paint.
  //
  // So the front WANDERS, and it is walkable. Three sine waves at different
  // frequencies give a boundary with real inlets and headlands; you can step
  // into the fire and it will kill you in about eight seconds, and only the
  // HEART of it, six tiles deeper, is solid — that is what keeps the map
  // bounded without ever being the thing that stops you. Outside the front
  // there is a two-tile band of scorched ground, so the fire announces itself
  // before you are standing in it.
  //
  // ON ITS OWN RNG. This pass runs before the block filler, and the map builder
  // draws from `rng` in a fixed order — taking numbers out of that stream here
  // would re-roll every building placed afterwards. See §12 of the plan.
  const arng = mulberry32(7717);
  const ph1 = arng() * 6.28, ph2 = arng() * 6.28, ph3 = arng() * 6.28;
  const BURN_DEPTH = 5;                  // how far into the fire you can walk
  const CORE_X = 1;                      // and the heart of it, which you cannot
  const ashFront = new Int16Array(MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    const w = Math.sin(y * 0.055 + ph1) * 1.8
            + Math.sin(y * 0.130 + ph2) * 1.1
            + Math.sin(y * 0.310 + ph3) * 0.7;
    // THE FIRE WAS PULLED BACK WEST to make room for a district. It used to sit
    // at x 19 and there was nothing between it and the motorway but a strip. It
    // stops short of the west lane's pavement (x 12-13) now: the lane is the
    // last road before the fire, and you can see the fire from it.
    ashFront[y] = Math.max(2, Math.min(8, Math.round(ASH_WEST + w)));
  }

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let g = -1;
      const front = ashFront[y];
      // THE DECK AND THE WATER WIN THEIR ROWS. The fire is the WEST FLANK, and
      // it runs between them — if it were allowed to claim the top and bottom
      // bands too, its walkable margin would run north past the viaduct and
      // south into the Grey Run, and the rim of the map would stop being solid.
      if (y <= VIA_Y1) g = EDGE_DECK;
      else if (y >= WATER_Y0) g = EDGE_WATER;
      else if (x <= front) g = EDGE_ASH;
      else if (x <= front + 2 && ground[y][x] !== 4 && ground[y][x] !== 5) g = EDGE_SCORCH;
      if (g < 0) continue;
      // the scorched band is a warning, not a blocker: normal ground, new paint
      if (g === EDGE_SCORCH) { ground[y][x] = g; continue; }
      ground[y][x] = g;
      if (g === EDGE_ASH) {
        // you may walk into the fire. You may not walk through it.
        burning[y][x] = true;
        const core = x <= CORE_X || x <= front - BURN_DEPTH;
        solid[y][x] = core;
        heavy[y][x] = core;
        continue;
      }
      // the mouths are the one place under the deck you may stand
      const open = g === EDGE_DECK && y >= TUN_Y0 && inHole(x);
      if (open) ground[y][x] = EDGE_TUNNEL;
      solid[y][x] = !open;
      heavy[y][x] = !open;
    }
  }

  // THE DECK HAS TO BE SEEN, not just bumped into. The west edge is burnt
  // ground and the south edge is black water, and both of those say what they
  // are the moment you look at them — but "solid" on its own draws nothing, so
  // the north edge was an invisible wall across the middle of the city, which is
  // worse than the open boundary it replaced. It is a ridge of volumes now.
  // Buildings are single pre-rendered volumes here and this is the same thing:
  // one per section, never assembled panels — three attempts at panels failed
  // before that rule existed.
  // the renderer draws the fire's glow along this front, so it has to be the
  // same front the collision uses — one array, published once
  FRINGE_EDGES.front = ashFront;
  // and where the two bores are, so the renderer can put a ROOF on them —
  // an underpass is a thing you drive through, not a slot you walk down
  FRINGE_EDGES.tunnels = DECK_HOLES.map(([a, b]) =>
    ({ x0: a, x1: b, y0: TUN_Y0, y1: VIA_Y1 }));

  // THE UNDERPASS, BUILT RATHER THAN IMPLIED. A cutting has sides and an end,
  // and all three have to be things the camera can see or the player is being
  // stopped by arithmetic again. Volumes, like everything else that stands up
  // on this map — never assembled panels.
  for (const [a, b] of DECK_HOLES) {
    const w = b - a + 1;
    // the two retaining walls the road runs between, north of the deck
    for (const wx of [a - 6, b + 1]) {
      if (wx < 0 || wx + 6 > MAP_W) continue;
      addBuildingProp({ x0: wx, y0: TUN_Y0, w: 6, h: VIA_Y0 - TUN_Y0, kind: 'W' });
    }
    // The far end used to be a concrete face — a wall you could look at, which
    // was the right answer while there was nothing behind it. There is now, so
    // the tunnel runs on into the dark and the SEAM is the last thing in it:
    // you walk into black and the screen fades. See the-road-north.md §4.
    // The tiles beyond stay solid as a backstop the player never reaches.
    void w;
  }

  const deckSpans = [[0, 25], [35, 87], [97, MAP_W - 1]];
  for (const [sx, ex] of deckSpans) {
    for (let x = sx; x <= ex; x += 12) {
      const w = Math.min(12, ex - x + 1);
      if (w < 2) continue;
      addBuildingProp({ x0: x, y0: VIA_Y0, w, h: VIA_Y1 - VIA_Y0 + 1, kind: 'V' });
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
        // NOTHING STANDS IN THE FIRE. The Ashfield's margin is deliberately not
        // solid — you are meant to be able to walk into it — and this filler
        // refuses solid tiles, so without the `burning` test it happily put
        // two office blocks in the middle of the coals.
        // ...and nothing stands in the underpass either. Opening the tunnel made
        // eighteen tiles walkable that had been solid, and this filler only
        // refuses SOLID — so it dropped a block across the mid mouth and sealed
        // it eight tiles in. Ground 16 is a road under a motorway, same as 4.
        const gt = ground[y][x];
        if (gt === 4 || gt === 5 || gt === 7 || gt === EDGE_TUNNEL ||
            solid[y][x] || burning[y][x]) return false;
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
  // STREET FURNITURE GOES IN FRONT OF A BLOCK, NEVER BEHIND IT.
  //
  // Screen-right-down is world +x and screen-left-down is world +y, so anything
  // at a greater x or y is drawn LATER, which is to say IN FRONT. Every block of
  // buildings therefore has a pavement strip along its up-screen faces that the
  // camera cannot see into at all — and `freeSpot` was happily planting lamp
  // posts down it, because a pavement tile is a pavement tile. A three-storey
  // facade then swallowed the whole post and left the tip of it poking out
  // through the roof. That is what "there are lanterns in buildings" looks like.
  //
  // `heavy` is the grid of things with real height — building volumes, the
  // cathedral, the boundary wall — so this asks the only question that matters:
  // is there something tall between this tile and the camera. Four tiles is what
  // it takes for a facade to stop covering a lamp; measured by counting the
  // pixels of every lamp in the Fringe that reach the screen, not guessed.
  // Close range first: anything tall in the wedge straight in front — the
  // cathedral, the boundary wall, a fence — none of which is a block rectangle.
  const HIDDEN_BEHIND = 4;
  const behindSomethingTall = (x, y) => {
    for (let dx = 0; dx <= HIDDEN_BEHIND; dx++)
      for (let dy = 0; dy <= HIDDEN_BEHIND - dx; dy++) {
        if (dx === 0 && dy === 0) continue;
        const tx = x + dx, ty = y + dy;
        if (tx < MAP_W && ty < MAP_H && heavy[ty][tx]) return true;
      }
    return false;
  };
  // A BLOCK IS A WIDE DIAMOND ON SCREEN, NOT A TILE.
  //
  // Depth is x + y, so a block whose NEAR CORNER is only a few steps deeper than
  // this tile is drawn after it and stands three storeys in front of it — and
  // because the block is wide, that corner can be well off to one side while the
  // volume still reaches back across the lamp and takes its head off. Testing
  // tile by tile cannot express that: a quadrant walks past it, and a half-plane
  // radius wide enough to catch it condemns nearly every pavement in the ring
  // (it took the Fringe from 36 lamp posts to 14 and cost two boards off the
  // trail west). So compare against the block's own rectangle, in the two axes
  // the projection actually has: depth is (x + y), screen-across is (x - y).
  const FACADE = 12;              // a facade covers about twelve depth-steps above itself
  const coveredByABlock = (x, y) => {
    const sL = x + y, aL = x - y;
    for (const bl of buildings) {
      const x1 = bl.x0 + bl.w - 1, y1 = bl.y0 + bl.h - 1;
      const sB = x1 + y1;                                  // the block's near corner
      if (sB <= sL || sB - sL >= FACADE) continue;          // behind me, or clear of me
      if (aL < bl.x0 - y1 || aL > x1 - bl.y0) continue;     // off to one side entirely
      return true;
    }
    return false;
  };
  function placeProp(x, y, type, extra) {
    if (!freeSpot(x, y) || behindSomethingTall(x, y) || coveredByABlock(x, y)) return null;
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
    // lane paint down the middle, sheared to lie along the road. The spine is
    // the M7 and gets motorway paint: a longer mark with more road between.
    const m7 = s.name === 'spine';
    const step = m7 ? 5 : 3, dt = m7 ? 'm' : '';
    if (vertical) for (let t2 = start + 2; t2 < start + len - 2; t2 += step) decals.push({ gx: s.x0 + 0.4, gy: t2, type: 'dashY' + dt });
    else for (let t2 = start + 2; t2 < start + len - 2; t2 += step) decals.push({ gx: t2, gy: s.y0 + 0.4, type: 'dashX' + dt });
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
  // The ground claim above only ever moved TILES. Buildings honour it (see
  // placeBuilding), but the street-furniture pass runs before this and plants
  // lamp posts, signs and postboxes on any pavement — and pavement inside the
  // forecourt stays pavement. So a lamp post ended up standing a tile from a
  // canopy leg, and one stood straight through one. A forecourt is open ground:
  // sweep the street furniture out of it before the station is built on it.
  // (Building volumes are already excluded — they never got in.)
  for (let i = props.length - 1; i >= 0; i--) {
    const q = props[i];
    if (q.foot || q.type === 'building') continue;
    if (q.gx >= GX - 1 && q.gx < GX + 24 && q.gy >= GY - 1 && q.gy < GY + 14) props.splice(i, 1);
  }

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
  // A SIGN THE CAMERA CANNOT SEE IS NOT A SIGN.
  // Two boards on this trail had ended up on the pavement strip along a block's
  // up-screen face, where the building in front swallows them — one of them
  // drawing exactly ZERO pixels while still putting a pin on the map, which is
  // the map promising a waypoint that is not there. A lamp post in that spot can
  // simply be dropped; a waypoint on the only marked route west cannot. So a
  // board steps ACROSS the road instead — perpendicular to the way it points,
  // nearest tile first — and takes the first free pavement the camera can see.
  // Crossing the road keeps the board at its waypoint, so that is preferred;
  // sliding along the road is the fallback, because on one stretch of leg one
  // BOTH pavements are in the shadow of a block and the only board that fits is
  // a few tiles further on. Dropping it instead left a forty-tile gap in the
  // only marked route west, which is a worse bug than the one being fixed.
  function signSpot(s) {
    const x0 = s.gx | 0, y0 = s.gy | 0;
    const vert = (s.dir === 'ym' || s.dir === 'yp');
    let best = null, bestScore = Infinity;
    for (let a = -12; a <= 12; a++) {
      for (let b = -8; b <= 8; b++) {
        const x = x0 + (vert ? a : b), y = y0 + (vert ? b : a);
        if (x < 1 || y < 1 || x >= MAP_W - 1 || y >= MAP_H - 1) continue;
        if (solid[y][x] || ground[y][x] !== 5) continue;
        if (behindSomethingTall(x, y) || coveredByABlock(x, y)) continue;
        const score = Math.abs(a) + Math.abs(b) * 1.4;   // across is cheaper than along
        if (score < bestScore) { bestScore = score; best = { x, y }; }
      }
    }
    return best;                    // null only if nowhere near it is in view
  }
  for (const s of SIGNS) {
    const at = signSpot(s);
    if (!at) continue;
    solid[at.y][at.x] = true;
    props.push({ gx: at.x, gy: at.y, type: 'sign', kind: s.kind, dir: s.dir, text: s.text });
    signs.push({ gx: at.x, gy: at.y, text: s.text, kind: s.kind });
  }
  // painted arrows on the tarmac, following the same three legs
  for (const ax of [178, 158, 138, 118, 100])
    decals.push({ gx: ax, gy: 118.6, type: 'arrowXm' });
  for (const ay of [110, 98, 86])
    decals.push({ gx: 90.6, gy: ay, type: 'arrowYm' });
  for (const ax of [84, 74, 64])
    decals.push({ gx: ax, gy: 73.6, type: 'arrowXm' });

  // ---------- THE SCHOOL MAST, and the ladder up St Martin's ----------
  // Q2's two ends. The mast is in the school yard, which is a playground the
  // landmark pass already cleared; the ladder is bolted to the cathedral's west
  // front, above the portal, where the trail's last sign leaves you looking.
  const mastAt = (mx, my) => {
    if (heavy[my][mx]) return false;
    solid[my][mx] = true;
    props.push({ gx: mx, gy: my, type: 'mast' });
    return true;
  };
  // The school block is (108,56) 22x11, so its yard is the playground strip the
  // landmark pass paves south of it. 119,61 is INSIDE the building — the spec's
  // coordinate was written before the school had a footprint.
  if (!mastAt(119, 70)) { mastAt(118, 70) || mastAt(120, 70) || mastAt(119, 71); }
  {
    // the west front faces SOUTH, so the ladder stands on the parvis in front
    // of it — one tile east of the door, where nothing else is
    const lx = 58, ly = 68;
    if (!solid[ly][lx]) { solid[ly][lx] = true; props.push({ gx: lx, gy: ly, type: 'ladder' }); }
  }

  // ---------- THE M7: GIVING THE MAP AN INWARD ----------
  // The Fringe was a box: four edges and nothing anywhere on it saying which
  // way the Core is. The spine IS the M7 — the radial motorway every ring
  // crosses — and it had never been told so. Three gantries over it still
  // carry the board, and the board still names the destination. Somebody has
  // painted DON'T across every one of them, which is this ring's whole
  // attitude in one word, and it is a stronger inward than eight lanes of
  // tarmac would have been.
  //
  // Legs stand on the pavement at x 25 and x 35 — the carriageway is x 26-34
  // and stays open, you walk under it. Placed after the street dressing so it
  // can take its two tiles off whatever got there first.
  const GANTRY_Y = [46, 88, 112];
  for (let i = 0; i < GANTRY_Y.length; i++) {
    const gyy = GANTRY_Y[i];
    for (const lx of [25, 35]) {
      for (let k = props.length - 1; k >= 0; k--) {
        const q = props[k];
        if (q.type === 'building' || q.type === 'wallSlice') continue;
        if (q.gx === lx && q.gy === gyy) { props.splice(k, 1); delete crushProps[lx + ',' + gyy]; }
      }
      solid[gyy][lx] = true;
    }
    props.push({ gx: 25, gy: gyy, type: 'gantry', seed: i, foot: [25, gyy, 11, 1] });
  }

  // ---------- the JUNKYARD gate, seen from the road ----------
  // the yard's outer wall, so returning is an actual door and not a void
  // THE EAST EDGE IS THIS WALL, and it now runs the whole height of the map.
  // It was 32 tiles long, from y 104 to y 136 — real where the gate is and
  // nothing at all above or below it, so three quarters of the city's east side
  // was an invisible limit. The same wall, the same fence kinds, from the
  // viaduct's shadow down to the water: one continuous thing with one door in
  // it. This is the cheapest of the four edges by a wide margin.
  const gy0 = 118, gy1 = 122;
  const WALL_Y0 = VIA_Y1 + 1, WALL_Y1 = WATER_Y0 - 1;   // between the other two edges
  for (let y = WALL_Y0; y <= WALL_Y1; y++) {
    if (y >= gy0 && y <= gy1) continue;
    solid[y][MAP_W - 2] = true; heavy[y][MAP_W - 2] = true;
  }
  const wallSeg = (y0, y1) => {
    const n = y1 - y0 + 1;
    if (n <= 0) return;
    wallRun(Array.from({ length: n }, (_, i) => [MAP_W - 2, y0 + i]),
            fenceKinds(n), 'y', false, true, true);
  };
  wallSeg(WALL_Y0, gy0 - 1);
  wallSeg(gy1 + 1, WALL_Y1);
  // AND THE STRIP BEHIND IT. The wall stands on x = MAP_W - 2, which leaves one
  // column outside it — and the gate is a hole in the wall, so the player could
  // step through, turn, and walk a hundred tiles up the outside of the city in a
  // one-tile corridor. The flood fill found 115 of them. Nothing is out there
  // and nothing ever will be: the junkyard exit triggers at x 196.4, well before
  // the wall, so this column is never legitimately stood on.
  for (let y = 0; y < MAP_H; y++) { solid[y][MAP_W - 1] = true; heavy[y][MAP_W - 1] = true; }
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
    const r = rng();                       // drawn either way, so the stream never shifts
    if (solid[y | 0][x | 0] || burning[y | 0][x | 0]) continue;   // no weeds on live coals
    decals.push({ gx: x, gy: y, type: r < 0.4 ? 'crack' : r < 0.72 ? 'weed' : 'stain' });
  }
  for (let i = 0; i < 40; i++) {
    const x = 2 + rng() * (MAP_W - 4), y = 2 + rng() * (MAP_H - 4);
    if (solid[y | 0][x | 0] || ground[y | 0][x | 0] !== 4) continue;
    decals.push({ gx: x, gy: y, type: 'puddle' });
  }

  // ---------- THE BURNT WEST ----------
  // Everything from here to the fire stood next to a tank farm that has been
  // alight for a year, so everything from here to the fire is a ruin. Two
  // things happen in this pass and both are deliberate:
  //
  // 1. Every building whose footprint is entirely west of the motorway's west
  //    kerb becomes a GUTTED SHELL. Retagging is enough — they are the same
  //    volumes, drawn burnt — so this costs nothing and cannot move anything.
  // 2. The strip between the west lane and the motorway is four tiles deep,
  //    and the generic filler needs seven, so it left bare lots there. Shallow
  //    terraces go in by hand, which is also how they end up all burnt.
  //
  // ON ITS OWN RNG AND LAST, for the reason in §12 of the plan: this pass
  // cannot be allowed to shift the stream the rest of the map is built from.
  const WEST_KERB = 24;
  const brng = mulberry32(31337);
  for (const b of buildings) if (b.x0 + b.w <= WEST_KERB) b.kind = 'X';

  // shallow terraces in the strip, broken by the two links onto the lane
  for (const [ty0, ty1] of [[32, 49], [55, 101], [107, 137]]) {
    let t = ty0;
    while (t < ty1 - 4) {
      const run = 5 + ((brng() * 7) | 0);
      if (t + run > ty1) break;
      const depth = 4;
      if (placeBuilding(WEST_KERB - 4, t, depth, run, 'X')) {
        buildings[buildings.length - 1].westShell = true;
      }
      t += run + 1 + ((brng() * 3) | 0);
    }
  }
  // and one more line of them along the lane's west side where there is room
  for (let t = 34; t < 136; ) {
    const run = 4 + ((brng() * 5) | 0);
    const front = ashFront[Math.min(MAP_H - 1, t)];
    const x0 = front + 3;
    if (x0 + 3 <= 10 && placeBuilding(x0, t, 3, run, 'X')) {
      buildings[buildings.length - 1].westShell = true;
    }
    t += run + 2 + ((brng() * 6) | 0);
  }
  for (const b of buildings) if (b.westShell) addBuildingProp(b);

  // what the fire left standing in the street
  // A PROP THE CAMERA CANNOT SEE IS NOT A PROP — and this pass forgot the rule
  // the street furniture already lives by. Nine of the first sixty-seven burnt
  // props drew ZERO pixels: depth is x + y, so the pavement along a block's
  // up-screen faces is simply not visible, and a stump planted there is a tile
  // you bump into with nothing standing on it. Same two tests as `placeProp`.
  const westProp = (x, y, type, extra) => {
    if (x < 2 || y < 2 || x >= MAP_W - 1 || y >= MAP_H - 1) return;
    if (solid[y][x] || heavy[y][x] || burning[y][x]) return;
    if (behindSomethingTall(x, y) || coveredByABlock(x, y)) return;
    const g = ground[y][x];
    if (g === 4) return;                            // never park it on the lane
    solid[y][x] = true;
    props.push(Object.assign({ gx: x, gy: y, type }, extra || {}));
  };
  // three attempts a row, not two: the visibility test above rejects roughly a
  // quarter of them, and a burnt district wants to look picked over
  for (let y = 33; y < 138; y += 2) {
    const front = ashFront[y];
    for (let k = 0; k < 3; k++) {
      const x = front + 1 + ((brng() * (WEST_KERB - front - 2)) | 0);
      const r = brng();
      if (r < 0.30) westProp(x, y, 'stump');
      else if (r < 0.56) westProp(x, y, 'debris');
      else if (r < 0.70) westProp(x, y, 'leaner', { dir: brng() < 0.5 ? 'y' : 'x' });
      else if (r < 0.80) westProp(x, y, 'barrelTipped');
    }
  }
  // burnt-out traffic, nose to tail down the lane the way it was left
  for (let y = 34; y < 136; y += 3 + ((brng() * 7) | 0)) {
    if (brng() < 0.45) continue;
    const x = 13 + ((brng() * 5) | 0);
    if (y + 2 >= MAP_H - 1) break;
    let clear = !behindSomethingTall(x, y + 1) && !coveredByABlock(x, y + 1);
    for (let i = 0; i < 3; i++) if (solid[y + i][x]) clear = false;
    if (!clear) continue;
    for (let i = 0; i < 3; i++) solid[y + i][x] = true;
    props.push({ gx: x, gy: y + 1, type: 'burntCar', dir: 'y',
                 v: (brng() * 3) | 0, foot: [x, y, 1, 3] });
  }

  // ---------- WHAT IS LEFT IN THE UNDERPASS ----------
  // These two tunnels were dead ends with a collapse across them. They are
  // SEAMS now — the spine goes through to the Underpass and the mid street to
  // Field 12 — so the rubble moved to the SIDES. It is still what a tunnel
  // under a fallen motorway has in it; it just no longer closes the door the
  // north expansion is walking through. Nothing goes in the middle three
  // columns of either mouth: that is the lane, and the exit zone is on it.
  for (const [a, b] of DECK_HOLES) {
    const mid0 = a + 3, mid1 = b - 3;
    for (let x = a; x <= b; x++) {
      if (x >= mid0 && x <= mid1) continue;
      for (let y = TUN_Y0 + 1; y <= TUN_Y0 + 9; y++) {
        if (solid[y][x] || brng() < 0.62) continue;
        const r = brng();
        solid[y][x] = true;
        props.push({ gx: x, gy: y,
                     type: r < 0.5 ? 'debris' : r < 0.78 ? 'girder' : 'barrelTipped' });
      }
    }
  }

  // ---------- THE GREY RUN, dressed ----------
  // The lowlands flooded when the pumps died and the traffic that was sitting
  // in them is still there, window-deep. These are the ordinary street cars,
  // sunk — the flood did not go and find different ones — and they are what
  // turns a flat dark band into a place something happened to.
  //
  // ON ITS OWN RNG, AND LAST. Every pass above draws from `rng` in a fixed
  // order, so a new pass that takes numbers out of that stream re-rolls every
  // building, prop and decal placed after it. Adding this in the middle of the
  // build moved 354 walkable tiles and shut St Martin's inside a block — the
  // map is generated fresh on every load, so that is a different city for a
  // save written against the old one. New dressing gets its own seed and goes
  // at the end, where it cannot move anything that was already there.
  const wrng = mulberry32(90210);
  for (let i = 0; i < 26; i++) {
    const wx = 22 + ((wrng() * (MAP_W - 46)) | 0);
    const wy = WATER_Y0 + 1 + ((wrng() * 6) | 0);
    const clash = props.some(q => q.type === 'drowned' &&
                                  Math.abs(q.gx - wx) < 4 && Math.abs(q.gy - wy) < 3);
    const dir = wrng() < 0.65 ? 'x' : 'y', v = (wrng() * 6) | 0, sink = 11 + ((wrng() * 8) | 0);
    if (clash) continue;
    props.push({ gx: wx, gy: wy, type: 'drowned', dir, v, sink });
  }
  // the last dry ground: silt and reeds where the water took the street.
  // Decals lie ON the ground, so these are stripes on the iso diagonal.
  for (let x = 21; x < MAP_W - 2; x += 2) {
    const skip = wrng() < 0.45, jx = wrng(), jy = wrng(), which = wrng();
    if (skip) continue;
    decals.push({ gx: x + jx, gy: WATER_Y0 - 1 - jy * 1.6, type: which < 0.5 ? 'silt' : 'siltY' });
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
// =====================================================================
// AREA 5 — THE UNDERPASS, and AREA 6 — FIELD 12
// The north expansion. design/expansion-build-spec.md is the plan; this is
// E1-E3 of it: the two seams, the airfield's ground and fence, and the
// structures. The drones, the beacon, the Lamp's people and the quests are
// E4-E8 and are NOT here.
//
// THE LOOP. Up the spine you come out in the Underpass; up the mid street you
// come out on the airfield. They join, so neither way round is the wrong one.
// =====================================================================
const UNDER_W = 20, UNDER_H = 36;
const F12_W = 96, F12_H = 72;

// ---------------------------------------------------------------------
// THE UNDERPASS — 20 x 36. A corridor, and every tile of it is tunnel,
// bay or wall. The Lamp's people are E6; this builds the room they stand in.
// ---------------------------------------------------------------------
function buildUnderpass() {
  const rng = mulberry32(9143);
  resetMap(UNDER_W, UNDER_H, rng);
  const W = MAP_W, H = MAP_H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    ground[y][x] = 16;                       // tunnel floor, same as the mouths
    groundVar[y][x] = (rng() * 6) | 0;
  }
  // YOU COME OUT THE FAR END. The first version put the way onward on the EAST
  // WALL — and worse, it was a trigger zone standing in open floor with no door
  // drawn on the wall at all, so you walked at blank concrete and the screen
  // faded. You drive into a tunnel and you come out the other side of it; that
  // is the whole shape of a tunnel and there is no reason to break it.
  //
  // So the north end is the way on to Field 12, and Ring 4's seam moves to the
  // airfield's north fence when it is built. A tunnel with a door in its side
  // is a corridor with a secret; a tunnel with two ends is a road.
  const GAP0 = 8, GAP1 = 11;
  for (let y = 0; y < H; y += 6) {
    const h = Math.min(6, H - y);
    addBuildingProp({ x0: 0, y0: y, w: 4, h, kind: 'W' });
    addBuildingProp({ x0: W - 4, y0: y, w: 4, h, kind: 'W' });
  }
  const inGap = (x) => x >= GAP0 && x <= GAP1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wall = x < 4 || x >= W - 4 || (y < 4 && !inGap(x));
    solid[y][x] = wall; heavy[y][x] = wall;
  }
  // the north wall, in two pieces with the road running out between them
  addBuildingProp({ x0: 4, y0: 0, w: GAP0 - 4, h: 4, kind: 'W' });
  addBuildingProp({ x0: GAP1 + 1, y0: 0, w: W - 4 - (GAP1 + 1), h: 4, kind: 'W' });
  // rubble banked against the wall either side of the opening, never across it
  for (let x = 5; x < W - 5; x++) {
    if (inGap(x) || rng() < 0.5) continue;
    solid[4][x] = true;
    props.push({ gx: x, gy: 4, type: rng() < 0.55 ? 'debris' : 'girder' });
  }
  // THE SERVICE BAY — a maintenance recess in the west wall. E6 puts Wren and
  // Oz in it; for now it is the shape, so the corridor is not just a corridor.
  for (let y = 8; y <= 13; y++) for (let x = 4; x <= 9; x++) {
    solid[y][x] = false; heavy[y][x] = false;
    ground[y][x] = 18;                       // poured slab, not road
  }
  addBuildingProp({ x0: 0, y0: 6, w: 4, h: 2, kind: 'W' });
  // THE LAMP. A tarp, a drum fire and a counter, and that is the whole of it —
  // no bed, no bench, no medbay, no respawn anchor. It is a shape, not a camp:
  // this is as far as anybody sane goes.
  const lampPut = (x, y, type, extra) => {
    if (solid[y][x] || heavy[y][x]) return;
    solid[y][x] = true;
    props.push(Object.assign({ gx: x, gy: y, type }, extra || {}));
  };
  lampPut(7, 12, 'drumFire');
  lampPut(5, 9, 'crate'); lampPut(5, 12, 'crate');
  lampPut(9, 9, 'handCart');
  lampPut(4, 10, 'tarp');

  // THE DEAD CAR — the one obstacle, and the only cover if anything follows
  // you in. Along the tunnel, so it takes its 'y' variant.
  props.push({ gx: 9, gy: 24, type: 'car', v: 2, dir: 'y', foot: [9, 23, 1, 3] });
  for (let i = 0; i < 3; i++) solid[23 + i][9] = true;
  // dressing: drums and debris down the length, never in the middle three lanes
  for (let i = 0; i < 22; i++) {
    const x = 4 + ((rng() * (W - 8)) | 0), y = 5 + ((rng() * (H - 8)) | 0);
    if (x >= 8 && x <= 11) continue;
    if (solid[y][x] || (x >= 4 && x <= 9 && y >= 8 && y <= 13)) continue;
    const r = rng();
    solid[y][x] = true;
    props.push({ gx: x, gy: y, type: r < 0.4 ? 'debris' : r < 0.7 ? 'barrelTipped' : 'girder' });
  }
  for (let i = 0; i < 90; i++) {
    const x = 4 + rng() * (W - 8), y = 4 + rng() * (H - 5);
    if (solid[y | 0][x | 0]) continue;
    decals.push({ gx: x, gy: y, type: rng() < 0.45 ? 'crack' : 'stain' });
  }
  // standing water where the deck leaks
  for (const [px2, py2] of [[10.4, 18.2], [13.6, 27.4], [6.6, 30.8], [12.2, 8.6]])
    decals.push({ gx: px2, gy: py2, type: 'puddle' });
  buildAO();
  buildSpatialIndex();
}

// ---------------------------------------------------------------------
// FIELD 12 — 96 x 72. An airfield inside a fence, with its edges paid for.
// Compare: the Fringe's dead north band was 4,400 tiles of nothing.
//
// THE ANGLE RULE runs this whole area. A runway is the largest flat painted
// surface in the game and every mark on it lies ON the ground, so not one of
// them is an axis-aligned rectangle — they are built in tile space and
// projected. See the RUNWAY PAINT block in js/sprites.js.
// ---------------------------------------------------------------------
function buildField12() {
  const rng = mulberry32(120012);
  resetMap(F12_W, F12_H, rng);
  const W = MAP_W, H = MAP_H;

  // ---- ground: verge everywhere, then the apron, then the runway ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    ground[y][x] = rng() < 0.62 ? 6 : 2;
    groundVar[y][x] = (rng() * 6) | 0;
  }
  const RW_Y0 = 24, RW_Y1 = 30;               // the runway
  const AP = [[14, 22], [32, 44]];            // apron north and south of it
  for (let y = 0; y < H; y++) for (let x = 4; x < W - 4; x++) {
    if (y >= RW_Y0 && y <= RW_Y1) ground[y][x] = 17;
    else if (AP.some(([a, b]) => y >= a && y <= b)) ground[y][x] = 18;
  }
  // the perimeter road, all the way round inside the fence
  for (let x = 2; x < W - 2; x++) { ground[2][x] = 18; ground[H - 3][x] = 18; }
  for (let y = 2; y < H - 2; y++) { ground[y][2] = 18; ground[y][W - 3] = 18; }

  // ---- the paint ----
  // centreline down the runway, three tiles on, two off
  for (let x = 6; x < W - 8; x += 5) decals.push({ gx: x, gy: RW_Y0 + 3, type: 'rwCentre' });
  // edge lines, both sides, laid a tile at a time
  for (let x = 5; x < W - 6; x++) {
    decals.push({ gx: x, gy: RW_Y0, type: 'rwEdge' });
    decals.push({ gx: x, gy: RW_Y1, type: 'rwEdge' });
  }
  // threshold piano keys at both ends, running ACROSS the runway
  for (const bx of [5, 6, 7, W - 9, W - 8, W - 7])
    decals.push({ gx: bx, gy: RW_Y0 + 1.5, type: 'rwBar' });
  // and the numbers the runway is called by
  decals.push({ gx: 10, gy: RW_Y0 + 0.2, type: 'rwNum12' });
  decals.push({ gx: W - 16, gy: RW_Y0 + 0.2, type: 'rwNum30' });
  // taxiway guide off the apron
  for (let y = 16; y < RW_Y0; y++) decals.push({ gx: 46, gy: y, type: 'rwGuide' });

  // ---- THE FENCE, and two ways through it ----
  // The junkyard's own chain-link, already proven. Two openings and no others;
  // the flood fill in the verification note is what says so.
  const GATE_X0 = 44, GATE_X1 = 48;           // vehicle gate, south
  const BREACH_Y0 = 44, BREACH_Y1 = 48;       // west breach
  const run = (tiles, axis) => {
    if (!tiles.length) return;
    wallRun(tiles, fenceKinds(tiles.length), axis, false, true, true);
    for (const [x, y] of tiles) { solid[y][x] = true; heavy[y][x] = true; }
  };
  const rowX = (y, x0, x1) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y]);
  const colY = (x, y0, y1) => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i]);
  run(rowX(0, 0, W - 1), 'x');
  run(rowX(H - 1, 0, GATE_X0 - 1), 'x');
  run(rowX(H - 1, GATE_X1 + 1, W - 1), 'x');
  run(colY(0, 0, BREACH_Y0 - 1), 'y');
  run(colY(0, BREACH_Y1 + 1, H - 1), 'y');
  run(colY(W - 1, 0, H - 1), 'y');
  // the gate's own posts, and the chain that was cut lying in the grass
  props.push({ gx: GATE_X0 - 1, gy: H - 1, type: 'post', big: true });
  props.push({ gx: GATE_X1 + 1, gy: H - 1, type: 'post', big: true });
  // the breach: the fence went down outwards and a path is worn through it
  for (let y = BREACH_Y0; y <= BREACH_Y1; y++) ground[y][1] = 2;

  // ---- THE STRUCTURES ----
  const box = (x0, y0, w, h, kind) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      solid[y][x] = true; heavy[y][x] = true; ground[y][x] = 2;
    }
    addBuildingProp({ x0, y0, w, h, kind });
  };
  const door = (x0, x1, y) => {
    for (let x = x0; x <= x1; x++) { solid[y][x] = false; heavy[y][x] = false; ground[y][x] = 18; }
  };
  // BUILDINGS YOU GO INSIDE. `box` fills the whole footprint solid and then the
  // interior is hollowed back out, so the volume still draws as one pre-rendered
  // box (the rule) and the inside of it is floor. The roof is a slab that fades
  // as you step under it — the shack's mechanism, and the underpass's.
  const ROOFS = [];
  // HOLLOWING THE COLLISION IS NOT ENOUGH. A building is ONE pre-rendered
  // volume (the rule), so emptying its tiles let the player walk in and left
  // them standing inside a closed box — the whole shed drawn over the top of
  // them. So the volume itself is what fades: the prop is tagged `enterable`,
  // the rectangle goes on the area's roof list, and the renderer drops it to
  // roofAlpha while you are in it. Same idea as the shack, applied to a volume
  // instead of to a separate roof card.
  const hollow = (x0, y0, w, h) => {
    for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) {
      solid[y][x] = false; heavy[y][x] = false; ground[y][x] = 18;
    }
    ROOFS.push({ x0: x0 + 1, y0: y0 + 1, x1: x0 + w - 2, y1: y0 + h - 2, noSlab: true });
    const vol = props[props.length - 1];
    if (vol && vol.type === 'building') vol.enterable = true;
  };
  box(6, 5, 15, 9, 'A');                       // HANGAR 1 — the nest
  hollow(6, 5, 15, 9); door(12, 15, 13);
  box(50, 5, 15, 9, 'A');                      // HANGAR 2 — the store
  hollow(50, 5, 15, 9); door(57, 57, 13);      // half-open: one tile passable
  box(80, 5, 8, 9, 'O');                       // the control tower
  hollow(80, 5, 8, 9); door(83, 84, 13);
  // blast pens: three-sided, opening north
  for (const px2 of [12, 34]) {
    box(px2, 38, 10, 2, 'W');                  // the back wall
    box(px2, 34, 2, 4, 'W');                   // and the two arms
    box(px2 + 8, 34, 2, 4, 'W');
  }
  box(8, 50, 12, 7, 'G');                      // crash tender shed
  hollow(8, 50, 12, 7); door(19, 19, 53);
  Areas.field12.roofs = ROOFS;

  // ---- WHAT IS INSIDE THEM ----
  const put = (x, y, type, extra) => {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return;
    if (heavy[y][x]) return;
    solid[y][x] = true;
    props.push(Object.assign({ gx: x, gy: y, type }, extra || {}));
  };
  // HANGAR 1 — the nest. Deliberately almost empty: the vents in its roof are
  // where the drones come out, and the floor has to be clear for that fight.
  put(9, 8, 'crate'); put(10, 11, 'pallet'); put(17, 7, 'tug'); put(18, 10, 'barrel');
  // HANGAR 2 — the store. Somebody camped in here, once, and left in a hurry.
  put(60, 9, 'wrensPack');                     // S1
  put(54, 8, 'chest', { open: false, loot: 'crypt', part: 'optGunCam' });
  put(56, 10, 'bedroll'); put(58, 11, 'coldFire');
  put(62, 7, 'crate'); put(63, 10, 'pallet'); put(52, 11, 'barrel');
  // THE CONTROL TOWER — the stair is under water, so the cab is E8's. What is
  // on this floor is the duty desk, the breaker, and the last tape.
  put(82, 8, 'dutyDesk'); put(85, 8, 'breaker'); put(84, 10, 'tape', { tape: 'cab' });
  put(86, 11, 'crate');
  // THE CRASH TENDER SHED — the appliance, the man who stayed with it, and the
  // first tape. The only warm colour on the whole field is that appliance.
  props.push({ gx: 13, gy: 53, type: 'tender', foot: [11, 52, 5, 2] });
  for (let x = 11; x <= 15; x++) for (let y = 52; y <= 53; y++) solid[y][x] = true;
  put(10, 55, 'deadCrew'); put(9, 52, 'tape', { tape: 'shed' }); put(17, 55, 'barrel');
  // and the second tape, dropped in a blast pen by somebody who was listening
  put(16, 37, 'tape', { tape: 'pen' });

  // fuel bowsers — four tankers, and every one of them goes up
  for (let i = 0; i < 4; i++) {
    const bx = 62 + i * 4;
    if (bx + 2 >= W) break;
    for (let k = 0; k < 3; k++) solid[36][bx + k] = true;
    props.push({ gx: bx + 1, gy: 36, type: 'bus', dir: 'x', foot: [bx, 36, 3, 1] });
    boomBarrels.push({ gx: bx + 1, gy: 36, dead: false, r: 3 });
  }
  // THE WRECK — the news drone that came down on the runway, and the thing
  // the whole area is about. Work lamps still standing round it.
  for (let y = 26; y <= 28; y++) for (let x = 44; x <= 48; x++) solid[y][x] = true;
  props.push({ gx: 46, gy: 27, type: 'wreckDrone', foot: [44, 26, 5, 3] });
  // The core is the one part of it the recovery detail had not reached. It
  // stands on the wreck's own footprint, so it is interacted with by walking
  // up to the hull rather than by finding a hotspot.
  props.push({ gx: 45, gy: 29, type: 'wreckCore', foot: [44, 29, 5, 1] });
  for (let x = 44; x <= 48; x++) solid[29][x] = true;
  for (const [lx, ly] of [[42, 25], [49, 25], [46, 30]]) {
    if (solid[ly][lx]) continue;
    solid[ly][lx] = true;
    props.push({ gx: lx, gy: ly, type: 'workLamp' });
  }
  // dead floodlight masts along the apron — unlit, every one of them
  for (const [lx, ly] of [[26, 16], [44, 16], [62, 16], [26, 44], [44, 44], [70, 44]]) {
    if (solid[ly][lx]) continue;
    solid[ly][lx] = true;
    props.push({ gx: lx, gy: ly, type: 'apronLamp' });
  }
  // the windsock, still turning, and the only thing that moves in the wind
  solid[20][90] = true;
  props.push({ gx: 90, gy: 20, type: 'windsock' });

  // ---- dressing ----
  const free = (x, y) => x > 3 && y > 3 && x < W - 3 && y < H - 3 &&
                         !solid[y][x] && !heavy[y][x] && ground[y][x] !== 17;
  for (let i = 0; i < 46; i++) {
    const x = 4 + ((rng() * (W - 8)) | 0), y = 4 + ((rng() * (H - 8)) | 0);
    const r = rng();
    if (!free(x, y)) continue;
    solid[y][x] = true;
    props.push({ gx: x, gy: y, type: r < 0.3 ? 'crate' : r < 0.55 ? 'barrel'
                              : r < 0.75 ? 'barrelTipped' : r < 0.9 ? 'debris' : 'girder' });
  }
  for (let i = 0; i < 700; i++) {
    const x = 1 + rng() * (W - 2), y = 1 + rng() * (H - 2);
    const r = rng();
    if (solid[y | 0][x | 0]) continue;
    decals.push({ gx: x, gy: y, type: r < 0.42 ? 'crack' : r < 0.74 ? 'weed' : 'stain' });
  }
  buildAO();
  buildSpatialIndex();
}

const CAND_W = 12, CAND_H = 16;
function shellWalls(doorX0, doorX1) {
  const W = MAP_W, H = MAP_H;
  const ik = n => Array.from({ length: n }, () => 'I');
  const lk = n => Array.from({ length: n }, () => 'L');
  wallRun(Array.from({ length: W }, (_, i) => [i, 0]), ik(W), 'x', false, true, true);
  wallRun(Array.from({ length: H }, (_, i) => [0, i]), ik(H), 'y', false, true, true);
  // Near sides: kerb only, and never `front` — nothing here needs fading.
  // THE EAST RUN GOES ALL THE WAY DOWN. It used to stop one tile short of
  // (W-1, H-1), which left that corner carrying the south run's slice alone —
  // and since both runs trim ~7px off the end that meets a corner, the two
  // trims met nothing and the kerb simply stopped, one tile of bare floor edge
  // at the bottom of the room. A CORNER TILE BELONGS TO BOTH RUNS: that is
  // what the half-tile trims are for, and it is why the other three corners
  // have always closed.
  wallRun(Array.from({ length: H }, (_, i) => [W - 1, i]), lk(H), 'y', false, true, true);
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
  // THE LASER BOX IS IN THIS ONE. The camp's own chest, on the warm side of
  // the nave: somebody brought a machine's optic back off the road, nobody
  // upstairs had a use for it, and it went in the box with the rest.
  put(9, 13, 'chest', { open: false, loot: 'scrap', part: 'optLaser' });

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
  // full height, so the south-east corner tile gets both runs' slices — see
  // the note in shellWalls(); the crypt had the same one-tile gap
  wallRun(Array.from({ length: H }, (_, i) => [W - 1, i]), lk(H), 'y', false, true, true);
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
// =====================================================================
// AREA 5 — THE PROLOGUE STREET, and the churchyard at the end of it
// =====================================================================
// Read from the east: a working street, then a gate, then the ground he does
// not get up from. The player runs the length of it once and never sees it
// again — but the CHURCHYARD is canonical. St Martin's churchyard, when it is
// built for real, has to be this same ground a year older: same gate, same
// railings, same stones. Two scenes, one place, a year apart, and the second
// one is where the camp now lives.
const PRO_W = 34, PRO_H = 26;
const PRO_ROAD_Y = 14;              // centre lane
const PRO_GATE_X = 8;               // the lych gate, and the end of the street
function buildPrologue() {
  const rng = mulberry32(1848);
  resetMap(PRO_W, PRO_H, rng);
  const put = placer();

  // ---- the ground ----
  for (let y = 0; y < PRO_H; y++)
    for (let x = 0; x < PRO_W; x++) ground[y][x] = 2;              // rubble default, never seen
  // the churchyard is grass all the way to the west edge
  for (let y = 4; y < PRO_H - 2; y++)
    for (let x = 1; x <= PRO_GATE_X; x++) ground[y][x] = 6;
  // the street runs east from the gate
  for (let x = PRO_GATE_X; x < PRO_W; x++) {
    for (let y = PRO_ROAD_Y - 1; y <= PRO_ROAD_Y + 1; y++) ground[y][x] = 4;   // carriageway
    ground[PRO_ROAD_Y - 2][x] = 5; ground[PRO_ROAD_Y + 2][x] = 5;              // pavement
    ground[PRO_ROAD_Y - 3][x] = 6; ground[PRO_ROAD_Y + 3][x] = 6;              // verge
  }
  // the path from the gate to where he falls
  for (let x = 2; x <= PRO_GATE_X; x++) ground[PRO_ROAD_Y][x] = 5;

  // ---- the frontage, both sides. Kept back from the pavement so the street
  // reads as a street and not a corridor. ----
  const shell = (x0, y0, w, h, kind) => {
    if (x0 < 1 || y0 < 1 || x0 + w >= PRO_W || y0 + h >= PRO_H) return;
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (solid[y][x]) return;
        solid[y][x] = true; heavy[y][x] = true; ground[y][x] = 2;
      }
    props.push({ gx: x0, gy: y0, type: 'building', foot: [x0, y0, w, h],
                 kind, seed: (x0 * 31 + y0 * 17) % 100 });
  };
  // THE CHURCH, north of its own yard, so it stands behind the stones.
  shell(1, 1, 7, 5, 'R');
  // (The Core used to stand here as a prop twelve tiles up the road. It is a
  // BACKDROP now — see drawFarCity in game.js — because the atlas puts it five
  // rings away and a prop on a tile is a thing you could walk to.)
  // north side of the street
  shell(11, 6, 6, 5, 'H'); shell(18, 6, 5, 5, 'S');
  shell(24, 5, 6, 6, 'B'); shell(31, 6, 2, 5, 'H');
  // SOUTH SIDE, KEPT WELL BACK. In this projection anything south of a subject
  // draws in FRONT of it, and a 46-pixel house stands about six tiles of screen
  // height — so frontage tight to the south pavement puts a roof across the
  // middle of every shot. Three tiles of verge is what it costs to see the
  // street the scene is about.
  shell(11, 21, 5, 4, 'S'); shell(17, 21, 6, 4, 'H');
  shell(24, 21, 5, 4, 'B'); shell(30, 21, 3, 4, 'S');

  // ---- THE CHURCHYARD ----
  // Railings run ALONG the ground, so they are sheared and take a direction.
  // The angle rule, and the single most common visual bug in this project.
  // The church stands on y1..5, so the yard's north rail runs under it at y6 —
  // the wall of the building IS the boundary along that stretch.
  const YARD_N = 6, YARD_S = PRO_H - 3;
  for (let y = YARD_N; y <= YARD_S; y++) {
    if (y >= PRO_ROAD_Y - 1 && y <= PRO_ROAD_Y + 1) continue;      // the gateway
    put(PRO_GATE_X, y, 'railing', { dir: 'y' });
  }
  for (let x = 1; x < PRO_GATE_X; x++) {
    if (!solid[YARD_N][x]) put(x, YARD_N, 'railing', { dir: 'x' });
    if (!solid[YARD_S][x]) put(x, YARD_S, 'railing', { dir: 'x' });
  }
  // The gate is the one thing here you walk THROUGH, so it gives its tile back.
  const gate = put(PRO_GATE_X, PRO_ROAD_Y, 'lychGate');
  if (gate) { solid[PRO_ROAD_Y][PRO_GATE_X] = false; heavy[PRO_ROAD_Y][PRO_GATE_X] = false; }

  // Headstones, kept off the path — he falls BETWEEN two of them, so the two
  // either side of (5, 14) are placed on purpose and the rest are scattered.
  put(5, PRO_ROAD_Y - 1, 'headstone', { v: 0 });
  put(5, PRO_ROAD_Y + 1, 'headstone', { v: 2 });
  for (const [hx, hy, v] of [
    [2, 8, 1], [4, 8, 0], [6, 8, 2], [3, 10, 0], [6, 10, 1],
    [2, 12, 2], [4, 12, 1], [7, 12, 0], [3, 17, 1], [6, 17, 2],
    [2, 19, 0], [5, 19, 1], [7, 20, 2], [3, 22, 0], [6, 22, 1],
  ]) if (!solid[hy][hx]) put(hx, hy, 'headstone', { v });

  // ---- street furniture ----
  // EVERY LAMP IS LIT. In the Fringe only twenty of sixty still burn, and that
  // ratio is most of what makes that city read as abandoned. Here they all do,
  // and it is the cheapest way to say "before".
  for (let x = 12; x < PRO_W - 2; x += 6) {
    put(x, PRO_ROAD_Y - 3, 'streetlight', { lit: true });
    put(x + 3, PRO_ROAD_Y + 3, 'streetlight', { lit: true });
  }
  // traffic, parked and orderly — nothing in this street is on fire yet
  put(13, PRO_ROAD_Y + 1, 'car', { v: 0, dir: 'x' });
  put(21, PRO_ROAD_Y - 1, 'car', { v: 2, dir: 'x' });
  put(28, PRO_ROAD_Y + 1, 'car', { v: 1, dir: 'x' });

  // ---- NOTHING BARE MAY BE IN FRAME, BUT THE SKY HAS TO STAY -----------
  // The default fill above was commented "rubble default, never seen" and that
  // was wrong: lift the camera to look at the horizon and the undressed part of
  // the map is half the picture.
  //
  // The first fix was to build on EVERY bare tile, and it traded one problem
  // for a worse one — a solid mass of roofs from edge to edge, with no sky left
  // to put a horizon in. In this projection anything north of you is drawn both
  // higher and taller, so a fully built map has no visible sky from anywhere.
  //
  // So: build the WEST bare ground only (behind the churchyard, where the
  // camera never needs to see past), and leave the northern strip open — that
  // strip is the sky the Core stands in.
  const KINDS = ['H', 'B', 'S', 'O', 'K', 'N'];
  const freeBlock = (x0, y0, w, h) => {
    if (x0 < 0 || y0 < 0 || x0 + w > PRO_W || y0 + h > PRO_H) return false;
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        if (solid[y][x] || ground[y][x] !== 2) return false;
    return true;
  };
  let fillSeed = 7;
  for (let y = 6; y < PRO_H; y += 4) {              // y >= 6: never the north strip
    for (let x = 0; x < PRO_W; x += 5) {
      for (const [w, h] of [[5, 4], [4, 4], [3, 3], [2, 2]]) {
        if (!freeBlock(x, y, w, h)) continue;
        fillSeed = (fillSeed * 1103515245 + 12345) & 0x7fffffff;
        shell(x, y, w, h, KINDS[fillSeed % KINDS.length]);
        break;
      }
    }
  }

  buildAO();
  buildSpatialIndex();
}

const Areas = {
  junkyard: {
    id: 'junkyard', name: 'THE JUNKYARD', build: buildJunkyard,
    // last-resort rescue tile for a save that woke up inside geometry: the
    // open yard south of the shack, which has been walkable since day one
    safeSpawn: { x: 21.5, y: 14.5 },
    // The Fringe is 200 wide, so this sits the yard three tiles off its east
    // edge — close enough that the one gate pin, at Fringe 197,120, lands in the
    // seam between the two and reads as the door it is, and far enough that the
    // two districts still read as two. The y is what lines the gate rows up:
    // the yard's gate row (12) lands at world 118, the Fringe's at 120.
    world: { x: 203, y: 106 },
    hasScrapper: true, hasBoss: true, hasNpc: true,
    tint: '#e6c092',
    makeItems: () => ([
      { type: 'pipe', x: 9.5, y: 23.5, bob: 0 },
      // FOOD, NOT ROUNDS. Loose ammunition lying in the road everywhere was
      // the lazy pickup: it says nothing about the place it is lying in, and
      // there is nothing to decide about it. A snack bar is a choice — eat it
      // now or carry it — and the rifle rounds are a promise about a gun you
      // have not got yet. The Compactor's own drops still cover the fight.
      { type: 'snack', x: 14.5, y: 21.5, bob: 1.3 },
      { type: 'snack', x: 25.5, y: 26.5, bob: 2.1 },
    ]),
    // walking into the open gate leaves for the open city
    exits: [{ x0: 30.2, y0: 10.6, x1: 32, y1: 14.4, to: 'fringe', entry: { x: 194, y: 120 },
              needsGate: true }],
  },
  fringe: {
    id: 'fringe', name: 'THE FRINGE', build: buildFringe,
    edges: FRINGE_EDGES,                   // drives the fire and the water
    // the spine's carriageway just inside the gate road junction — the one
    // stretch of this map that every version of it has had open
    safeSpawn: { x: 30.5, y: 110.5 },
    world: { x: 0, y: 0 },
    hasScrapper: false, hasBoss: false, hasNpc: false, hasBandits: true,
    // raiders hold the roadblocks; the droid squads patrol between them
    hasDroids: true,
    tint: '#efe0cc',      // thinner, cooler, brighter than the yard's dusk
    makeItems: () => ([
      // was 150.5,130.5 — a later building edit closed over that tile and
      // sealed the rounds inside the walls. Three tiles west is open street.
      { type: 'snack', x: 147.5, y: 130.5, bob: 0.8 },
      { type: 'ammo', gun: 'rifle', x: 62.5, y: 122.5, amount: 8, bob: 2.4 },
      { type: 'snack', x: 33.5, y: 88.5, bob: 1.5 },
    ]),
    // back through the yard gate, and in at the west door of St Martin's
    exits: [
      { x0: 196.4, y0: 117.6, x1: 201, y1: 122.4, to: 'junkyard', entry: { x: 29.6, y: 12.5 } },
      { x0: 54.8, y0: 66.3, x1: 57.2, y1: 67.95, to: 'candlelight', entry: { x: 5.5, y: 13.4 } },
      // THE TWO SEAMS NORTH. Not doors with a prompt: you walk up a tunnel into
      // the dark and the screen fades. The spine comes out in the Underpass and
      // the mid street on the airfield.
      { x0: 28.4, y0: 12.4, x1: 32.6, y1: 15.6, to: 'underpass', entry: { x: 10.5, y: 31.5 } },
      { x0: 90.4, y0: 12.4, x1: 94.6, y1: 15.6, to: 'field12', entry: { x: 46.5, y: 67.5 } },
    ],
  },
  // THE PROLOGUE. A real area, not a set of painted cards — which is the whole
  // reason the harmony scene is worth doing at all. It gets the same renderer
  // the game gets: the same tiles, the same building volumes, the same AO,
  // god rays, colour grade and tilt-shift. A hand-painted cutscene would have
  // looked like a different game, and the point of the scene is that it is the
  // SAME city the player is about to walk through as a ruin.
  //
  // No exits: you cannot walk out of a memory. It is entered by the prologue
  // script and left by it.
  prologue: {
    id: 'prologue', name: 'THE CITY, BEFORE', build: buildPrologue,
    safeSpawn: { x: 16.5, y: 12.5 },       // mid-street, though a memory never loads one
    world: { x: 40, y: 44 },        // roughly where St Martin's stands, a year on
    skyline: true,                  // the inner rings, and the Core behind them
    // A MEMORY, NOT A PLACE. Without this the prologue street ends up drawn on
    // the traveller's world map — it has a `world` offset and it collects fog
    // like any other area, so it appeared as a district sitting exactly where
    // St Martin's stands a year later. Nothing anyone can walk to belongs on
    // that map, and nothing that happened before the game starts belongs in
    // their save.
    memory: true,
    hasScrapper: false, hasBoss: false, hasNpc: false, folk: 'prologue',
    indoors: false,
    tint: '#ffe6c4',        // evening, and every window still lit
    makeItems: () => ([]),
    exits: [],
  },
  // ---- THE NORTH EXPANSION ----
  // Both sit north of the Fringe on the world map and neither overlaps it or
  // the other: the Underpass is the narrow one at x 20-40, Field 12 the wide
  // one at x 60-156. You reach the Underpass up the spine and the airfield up
  // the mid street, and they join — so neither way round is the wrong one.
  underpass: {
    id: 'underpass', name: 'THE UNDERPASS', build: buildUnderpass,
    world: { x: 20, y: -38 },
    safeSpawn: { x: 10.5, y: 30.5 },       // the lane, south of the dead car
    indoors: true,                          // lit by what comes through the cracks
    hasScrapper: false, hasBoss: false, hasNpc: false, hasBandits: false,
    hasDroids: false, folk: 'lamp',
    tint: '#b9bfc4',                        // wet concrete, and no warmth in it
    makeItems: () => ([
      { type: 'snack', x: 12.5, y: 20.5, bob: 1.1 },
    ]),
    exits: [
      // in the south mouth, out the north end. Both ends of a tunnel, and
      // nothing in the side walls but the service bay.
      { x0: 7.4, y0: 33.4, x1: 12.6, y1: 35.6, to: 'fringe', entry: { x: 30.5, y: 16.5 } },
      { x0: 7.4, y0: 0, x1: 12.6, y1: 2.6, to: 'field12', entry: { x: 3.5, y: 46.5 } },
    ],
  },
  field12: {
    id: 'field12', name: 'FIELD 12', build: buildField12,
    world: { x: 60, y: -74 },
    safeSpawn: { x: 46.5, y: 66.5 },       // inside the vehicle gate
    indoors: false, skyline: false,         // NO far-city band: see map-shape.md
    hasScrapper: false, hasBoss: false, hasNpc: false, hasBandits: false,
    hasDroids: false,                       // the drones are E4, and not built
    tint: '#e4e2dc',                        // bleached grey. Not blue.
    makeItems: () => ([
      { type: 'ammo', gun: 'rifle', x: 27.5, y: 52.5, amount: 12, bob: 0.4 },
      { type: 'snack', x: 63.5, y: 39.5, bob: 1.7 },
    ]),
    exits: [
      // the vehicle gate south, and the west breach onto the Underpass
      { x0: 43.4, y0: 69.4, x1: 48.6, y1: 71.6, to: 'fringe', entry: { x: 92.5, y: 16.5 } },
      { x0: 0.4, y0: 44.4, x1: 2.6, y1: 48.6, to: 'underpass', entry: { x: 9.5, y: 5.5 } },
    ],
  },
  candlelight: {
    id: 'candlelight', name: 'CANDLELIGHT', build: buildCandlelight,
    safeSpawn: { x: 6.5, y: 13.5 },        // the nave, inside the west door
    world: { x: 50, y: 52 },        // the church's own footprint, exactly
    hasScrapper: false, hasBoss: false, hasNpc: false, folk: 'camp',
    indoors: true,
    tint: '#f0d4b0',        // firelight, but the stone still has to read as stone
    makeItems: () => ([
      { type: 'snack', x: 6.5, y: 5.5, bob: 0.5 },
    ]),
    exits: [
      { x0: 4.4, y0: 14.4, x1: 7.6, y1: 16, to: 'fringe', entry: { x: 56.5, y: 69.5 } },
      // the hatch is one tile now, so the zone is the hatch and its doorstep
      { x0: 0.6, y0: 0.6, x1: 2.4, y1: 2.4, to: 'crypt', entry: { x: 3.5, y: 2.5 } },
    ],
  },
  crypt: {
    id: 'crypt', name: 'THE CRYPT', build: buildCrypt,
    safeSpawn: { x: 3.5, y: 2.5 },         // the foot of the stair
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
  // Both gate blurbs used to end on a line that explained nothing. The yard
  // side said "It was chained shut for a reason" — a riddle with no answer
  // anywhere in the game — and the Fringe side spent its second sentence on
  // Marek's counter instead of saying where the gate goes. A pin on a map has
  // one job: say what is on the other side, and what it costs to get there.
  // ONE DOOR, ONE PIN. There were two of these, one anchored in each area, and
  // on the world map they came out as two gates on opposite OUTER sides with
  // both districts in between — the yard's pin sat at world x 236, its far
  // side, pointing away from the Fringe it opens onto. A door is a single place
  // that two areas share, so it is pinned once, on the seam, and its blurb
  // names both sides instead of reading as a one-way trip.
  { id: 'yardgate', area: 'fringe', x: 197, y: 120, kind: 'gate',
    name: 'THE YARD GATE', blurb: "The one way between Marek's yard and the ring road. His counter is on the one side of it, and the road west into the Fringe on the other." },
  { id: 'stmartins', area: 'fringe', x: 56, y: 60, kind: 'camp',
    name: 'CANDLELIGHT', travel: { x: 56.5, y: 69.5 },
    blurb: "St Martin's, and people living in it. Fires, a medbay, a map of the ring drawn by the people who walked it." },
  // ---- NO PINS FOR PLACES THAT DO NOTHING YET ----
  // The forecourt, the school, the hotel and the bank had `landmark` pins here.
  // Laurens, 2026-08-21: *"remove the pins for those other buildings on the map
  // they dont jet have a purpose"* — and a pin is a promise. Four of them
  // spread across the ring, every one of them saying "there is something here",
  // and there is not: they are silhouettes you walk past. A map that marks
  // things you cannot use teaches the player to stop reading the map.
  //
  // The `landmark` kind stays wired up — icon, declutter rule and all — so the
  // day one of those places has a door, a trader or a fight in it, it is one
  // line to put its pin back. The names and the blurbs are kept in
  // design/map-ui.md so they are not lost with the code.
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
