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
}

// =====================================================================
// AREA 2 — THE APPROACH (first ground outside the yard)
// A service road between collapsed retaining walls: open, low cover, and
// the first place patrols can see you coming.
// =====================================================================
function buildApproach() {
  const rng = mulberry32(90210);
  resetMap(36, 36, rng);
  patrolCenter = { x: 18, y: 18 };

  // the road: asphalt band running west→east across the middle
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const onRoad = y >= 15 && y <= 20;
      ground[y][x] = onRoad ? 0 : (rng() < 0.55 ? 1 : 2);
    }
  }
  // verges break up the shoulder
  for (const [bx, by, r] of [[8, 7, 5], [27, 9, 4], [6, 28, 5], [26, 27, 5], [17, 4, 4], [18, 31, 4]]) {
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (y >= 15 && y <= 20) continue;
      if (Math.hypot(x - bx, y - by) < r - 0.5 + rng()) ground[y][x] = 1;
    }
  }

  // ---- edges ----
  // north & south: collapsed retaining walls (concrete, heavy)
  const conc = n => Array.from({ length: n }, () => 'C');
  wallRun(Array.from({ length: MAP_W }, (_, i) => [i, 0]), conc(MAP_W), 'x', false, true, true);
  wallRun(Array.from({ length: MAP_W }, (_, i) => [i, MAP_H - 1]), conc(MAP_W), 'x', false, true, true);
  // west wall, broken where the junkyard gate lets you back in (y 16..19)
  wallRun(Array.from({ length: 16 }, (_, i) => [0, i]), fenceKinds(16), 'y', false, true, false);
  wallRun(Array.from({ length: MAP_H - 20 }, (_, i) => [0, 20 + i]), fenceKinds(MAP_H - 20), 'y', false, false, true);
  props.push({ gx: 0, gy: 15, type: 'post', big: true });
  props.push({ gx: 0, gy: 20, type: 'post', big: true });
  // east: rubble ridge — the road continues, but Aldergrove/Field 12 aren't built
  wallRun(Array.from({ length: MAP_H }, (_, i) => [MAP_W - 1, i]), conc(MAP_H), 'y', false, true, true);
  props.push({ gx: MAP_W - 1, gy: 0, type: 'post', big: true });
  props.push({ gx: MAP_W - 1, gy: MAP_H - 1, type: 'post', big: true });

  const reserved = (x, y) =>
    (solid[y] && solid[y][x]) ||
    (x < 4 && y > 13 && y < 22) ||           // arrival mouth stays clear
    (y >= 16 && y <= 19 && x < 30);          // driving lane of the road

  // ---- THE CONVOY: six vehicles nose-to-tail, the night everyone fled ----
  const convoy = [[6, 14], [10, 14], [14, 15], [19, 14], [24, 15], [28, 14]];
  let cv = 0;
  for (const [cx, cy] of convoy) {
    if (cx + 1 >= MAP_W - 1) continue;
    solid[cy][cx] = true; solid[cy][cx + 1] = true;
    const prop = { gx: cx + 0.5, gy: cy, type: 'car', v: cv++ % 2 };
    props.push(prop);
    crushProps[cx + ',' + cy] = prop;
    crushProps[(cx + 1) + ',' + cy] = prop;
  }
  // a second, scattered line on the south shoulder — people tried to overtake
  for (const [cx, cy] of [[8, 21], [16, 21], [26, 21]]) {
    solid[cy][cx] = true; solid[cy][cx + 1] = true;
    const prop = { gx: cx + 0.5, gy: cy, type: 'car', v: cv++ % 2 };
    props.push(prop);
    crushProps[cx + ',' + cy] = prop;
    crushProps[(cx + 1) + ',' + cy] = prop;
  }

  // ---- scatter ----
  function scatter(type, count, variants) {
    let placed = 0, tries = 0;
    while (placed < count && tries < 400) {
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
  scatter('scrap', 9, 3); scatter('barrel', 6); scatter('barrelTipped', 3);
  scatter('tires', 4); scatter('pipe', 4); scatter('girder', 3); scatter('crate', 5);

  // explosive barrels along the road — the convoy was carrying fuel
  for (const [x, y] of [[12, 13], [21, 22], [17, 12], [25, 23]]) {
    if (reserved(x, y)) continue;
    solid[y][x] = true;
    const prop = { gx: x, gy: y, type: 'boom' };
    props.push(prop);
    crushProps[x + ',' + y] = prop;
    boomBarrels.push({ gx: x, gy: y, alive: true, prop });
  }

  // rubble heaps on the shoulders, doubling as spawn cover
  function heap(x0, y0, fw, fh, v) {
    for (let y = y0; y < y0 + fh; y++) for (let x = x0; x < x0 + fw; x++) {
      if (x >= 1 && y >= 1 && x < MAP_W - 1 && y < MAP_H - 1) { solid[y][x] = true; heavy[y][x] = true; }
    }
    props.push({ gx: x0 + fw / 2 - 0.5, gy: y0 + fh / 2 - 0.5, type: 'mound2', v, foot: [x0, y0, fw, fh] });
  }
  heap(9, 8, 2, 2, 0); heap(23, 6, 2, 2, 1); heap(7, 26, 2, 2, 1); heap(25, 27, 2, 2, 0);

  for (const p of props) {
    if (!p.foot) continue;
    const [x0, y0, fw, fh] = p.foot;
    for (const [sx, sy] of [[x0 + fw / 2, y0 - 1.2], [x0 - 1.2, y0 + fh / 2]]) {
      if (canStand(sx, sy, 0.35)) moundSpawns.push({ x: sx, y: sy });
    }
  }
  // patrols walk the road end to end, and out to the shoulders
  for (const [px, py] of [[6, 18], [14, 17], [22, 18], [30, 18], [10, 10], [26, 10], [12, 26], [27, 25]]) {
    if (canStand(px, py, 0.35)) patrolPoints.push({ x: px, y: py });
  }
  patrolCenter = { x: 18, y: 18 };

  // ---- dressing ----
  for (let i = 0; i < 90; i++) {
    const x = 1 + rng() * (MAP_W - 2), y = 1 + rng() * (MAP_H - 2);
    const r = rng();
    decals.push({ gx: x, gy: y, type: r < 0.45 ? 'crack' : r < 0.7 ? 'weed' : 'stain' });
  }
  let pud = 0, pt = 0;
  while (pud < 7 && pt < 200) {
    pt++;
    const x = 2 + rng() * (MAP_W - 4), y = 2 + rng() * (MAP_H - 4);
    if (solid[y | 0][x | 0]) continue;
    decals.push({ gx: x, gy: y, type: 'puddle' });
    pud++;
  }
  // road markings down the centre line
  for (let x = 3; x < MAP_W - 2; x += 3) decals.push({ gx: x, gy: 17.6, type: 'crack' });

  buildAO();
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
    // walking into the open gate leaves for the Approach
    exits: [{ x0: 30.2, y0: 10.6, x1: 32, y1: 14.4, to: 'approach', entry: { x: 2.2, y: 17.6 },
              needsGate: true }],
  },
  approach: {
    id: 'approach', name: 'THE APPROACH', build: buildApproach,
    hasScrapper: true, hasBoss: false, hasNpc: false,
    tint: '#e2c39c',      // thinner, colder light out here
    makeItems: () => ([
      { type: 'ammo', x: 11.5, y: 11.5, amount: 6, bob: 0.8 },
      { type: 'ammo', x: 29.5, y: 25.5, amount: 6, bob: 2.4 },
    ]),
    exits: [{ x0: -1, y0: 15.6, x1: 1.4, y1: 19.4, to: 'junkyard', entry: { x: 29.6, y: 12.5 } }],
  },
};

// build the starting area immediately so everything downstream has a map
buildJunkyard();
