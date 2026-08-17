// The Scrap Yard — bigger map, trash mountains, oriented barricades, dense junk.
const MAP_W = 32, MAP_H = 32;

// ground: 0 asphalt, 1 dirt, 2 rubble, 3 wood planks (interior)
const ground = [];
const groundVar = [];
const solid = [];
const heavy = [];    // walls & trash mountains — stops even the boss
const crushProps = {}; // "x,y" -> prop: small junk the Compactor flattens
const props = [];    // {gx, gy, type, v, dir, front, foot}
const decals = [];
const moundSpawns = [];   // enemy spawn points tucked behind trash mountains
const boomBarrels = [];   // explosive barrels — shoot to detonate
let gateProp = null;      // the yard gate (south wall) — opens when the boss falls

function openGate() {
  if (!gateProp || gateProp.open) return;
  gateProp.open = true;
  for (let y = 6; y <= 8; y++) {
    solid[y][MAP_W - 1] = false;
    heavy[y][MAP_W - 1] = false;
  }
}
const patrolPoints = [];  // scrap heaps that robots patrol between
const patrolCenter = { x: 21.5, y: 12.5 };  // hub near the shack — all routes pass it

// survivor shack (tile bounds, inclusive). Door on the south edge.
const SHACK = { x0: 18, y0: 4, x1: 24, y1: 9, doorX: 21 };

(function buildMap() {
  const rng = mulberry32(4242);

  for (let y = 0; y < MAP_H; y++) {
    ground[y] = []; groundVar[y] = []; solid[y] = []; heavy[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      ground[y][x] = 0;
      groundVar[y][x] = (rng() * 6) | 0;
      solid[y][x] = false;
      heavy[y][x] = false;
    }
  }

  // dirt & rubble blobs
  const blobs = [[7, 22, 5], [22, 7, 5], [15, 16, 4], [26, 25, 4], [5, 10, 3], [11, 28, 3], [28, 13, 3]];
  for (const [bx, by, r] of blobs) {
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const d = Math.hypot(x - bx, y - by);
      if (d < r - 0.5 + rng()) ground[y][x] = 1;
      else if (d < r + 1 && rng() < 0.4) ground[y][x] = 2;
    }
  }

  // continuous wall run: marks tiles solid, slices the strip per tile.
  // trimS/trimE stop the run's face exactly at a corner point.
  function wallRun(tiles, kinds, axis, front, trimS, trimE) {
    const slices = Sprites.makeWallRun(kinds, axis, trimS, trimE);
    tiles.forEach(([x, y], i) => {
      solid[y][x] = true;
      heavy[y][x] = true;
      const s = slices[i];
      props.push({ gx: x, gy: y, type: 'wallSlice', img: s.img, dx: s.dx, dy: s.dy, lift: s.lift, front });
    });
  }
  // uniform height — alternating tall/short pieces made the fence line look
  // like protruding teeth. Variation comes from rust patterns, not height.
  const fenceKinds = n => Array.from({ length: n }, () => 'M');

  // perimeter barricade — corner tiles belong to BOTH runs so each corner
  // gets both wall faces meeting in a proper L (no open gaps/protrusions)
  wallRun(Array.from({ length: MAP_W }, (_, i) => [i, 0]), fenceKinds(MAP_W), 'x', false, true, true);
  wallRun(Array.from({ length: MAP_W }, (_, i) => [i, MAP_H - 1]), fenceKinds(MAP_W), 'x', false, true, true);
  wallRun(Array.from({ length: MAP_H }, (_, i) => [0, i]), fenceKinds(MAP_H), 'y', false, true, true);
  // EAST wall, broken by THE GATE beside the shack (y 6..8, on the same
  // side as the house so it reads as the yard's proper exit)
  wallRun(Array.from({ length: 6 }, (_, i) => [MAP_W - 1, i]), fenceKinds(6), 'y', false, true, false);
  wallRun(Array.from({ length: MAP_H - 9 }, (_, i) => [MAP_W - 1, 9 + i]), fenceKinds(MAP_H - 9), 'y', false, false, true);
  for (let y = 6; y <= 8; y++) { solid[y][MAP_W - 1] = true; heavy[y][MAP_W - 1] = true; }
  gateProp = { gx: MAP_W - 1, gy: 7, type: 'gate', open: false, dir: 'b' };
  props.push(gateProp);
  props.push({ gx: MAP_W - 1, gy: 5, type: 'post', big: true });
  props.push({ gx: MAP_W - 1, gy: 9, type: 'post', big: true });

  // ---- the shack (corners doubled here too; south & east faces fade) ----
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

  // furnish the interior (door column x=21 stays clear)
  for (const [fx, fy, ftype] of [
    [19, 5, 'cot'], [23, 5, 'shelf'], [23, 6, 'crate'],
    [19, 7, 'table'], [20, 7, 'stool'], [23, 8, 'stove'],
  ]) {
    solid[fy][fx] = true;
    heavy[fy][fx] = true;      // interior is boss-proof anyway
    props.push({ gx: fx, gy: fy, type: ftype, v: 0 });
  }

  // posts cap every wall joint (map corners, shack corners, door frame)
  const postAt = (x, y, big, front) => props.push({ gx: x, gy: y, type: 'post', big, front });
  postAt(0, 0); postAt(MAP_W - 1, 0); postAt(0, MAP_H - 1); postAt(MAP_W - 1, MAP_H - 1);
  postAt(W.x0, W.y0, true); postAt(W.x1, W.y0, true, true);
  postAt(W.x0, W.y1, true, true); postAt(W.x1, W.y1, true, true);
  postAt(W.doorX - 1, W.y1, true, true); postAt(W.doorX + 1, W.y1, true, true);

  // ---- trash mountains (multi-tile footprints) ----
  function placeMound(x0, y0, fw, fh, type, v) {
    for (let y = y0; y < y0 + fh; y++) for (let x = x0; x < x0 + fw; x++) {
      if (x >= 1 && y >= 1 && x < MAP_W - 1 && y < MAP_H - 1) { solid[y][x] = true; heavy[y][x] = true; }
    }
    props.push({ gx: x0 + fw / 2 - 0.5, gy: y0 + fh / 2 - 0.5, type, v, foot: [x0, y0, fw, fh] });
  }
  placeMound(3, 3, 4, 3, 'mound3', 0);      // the big one, ~12 tiles
  placeMound(26, 20, 4, 3, 'mound3', 1);
  placeMound(13, 5, 2, 2, 'mound2', 0);
  placeMound(4, 17, 2, 2, 'mound2', 1);
  placeMound(20, 15, 2, 2, 'mound2', 0);
  placeMound(12, 24, 2, 2, 'mound2', 1);

  // ---- junk scatter ----
  const reserved = (x, y) =>
    (solid[y] && solid[y][x]) ||
    (x >= SHACK.x0 - 1 && x <= SHACK.x1 + 1 && y >= SHACK.y0 - 1 && y <= SHACK.y1 + 2) ||
    (x >= SHACK.doorX - 1 && x <= SHACK.doorX + 1 && y > SHACK.y1 && y <= SHACK.y1 + 3) || // door approach
    Math.hypot(x - 6.5, y - 26.5) < 2.5 ||     // player spawn
    Math.hypot(x - 9.5, y - 23.5) < 1.5 ||     // pistol
    Math.hypot(x - 24.5, y - 18.5) < 1.5 ||    // scrapper spawn
    (x > 25 && y > 3 && y < 12);               // gate approach / boss arena

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
  scatter('scrap', 18, 3);
  scatter('barrel', 9);
  scatter('barrelTipped', 4);
  scatter('tires', 6);
  scatter('pipe', 5);
  scatter('girder', 4);
  scatter('crate', 6);

  // explosive barrels in the middle of the yard — combat tools, not clutter
  for (const [x, y] of [[14, 15], [17, 19], [13, 22], [19, 13], [16, 17], [21, 21]]) {
    if (reserved(x, y)) continue;
    solid[y][x] = true;
    const prop = { gx: x, gy: y, type: 'boom' };
    props.push(prop);
    crushProps[x + ',' + y] = prop;
    boomBarrels.push({ gx: x, gy: y, alive: true, prop });
  }

  // cars (block 2 tiles each) — way more wrecks
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

  // enemy spawn points hidden behind trash mountains (north/west sides sit
  // behind the mound in draw order, so robots emerge from behind them)
  for (const p of props) {
    if (!p.foot) continue;
    const [x0, y0, fw, fh] = p.foot;
    for (const [sx, sy] of [[x0 + fw / 2, y0 - 1.2], [x0 - 1.2, y0 + fh / 2]]) {
      if (canStand(sx, sy, 0.35)) moundSpawns.push({ x: sx, y: sy });
    }
  }

  // central patrol hub in front of the shack — every patrol route passes here
  for (const [cx, cy] of [[21.5, 12.5], [20.5, 12.5], [22.5, 13.5], [21.5, 14.5]]) {
    if (canStand(cx, cy, 0.35)) { patrolCenter.x = cx; patrolCenter.y = cy; break; }
  }

  // patrol waypoints: robots walk heap-to-heap (mound spawns + scrap piles)
  for (const s of moundSpawns) patrolPoints.push({ x: s.x, y: s.y });
  let added = 0;
  for (const p of props) {
    if (p.type !== 'scrap' || added >= 8) continue;
    const wx = p.gx + 0.5, wy = p.gy + 1.7;
    if (canStand(wx, wy, 0.35)) { patrolPoints.push({ x: wx, y: wy }); added++; }
  }

  // ground decals
  for (let i = 0; i < 100; i++) {
    const x = 1 + rng() * (MAP_W - 2);
    const y = 1 + rng() * (MAP_H - 2);
    if (x >= SHACK.x0 && x <= SHACK.x1 + 1 && y >= SHACK.y0 && y <= SHACK.y1 + 1) continue;
    const r = rng();
    decals.push({ gx: x, gy: y, type: r < 0.4 ? 'crack' : r < 0.75 ? 'weed' : 'stain' });
  }
  // rain puddles (on open asphalt only) — cool reflections against warm dusk
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
})();

// ambient occlusion: tiles next to solid things sit in slight shadow
const aoGrid = [];
(function () {
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
})();

function isSolid(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return true;
  return solid[gy | 0] && solid[gy | 0][gx | 0];
}

// only walls and trash mountains stop the Compactor
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
  return x > SHACK.x0 && x < SHACK.x1 + 1 && y > SHACK.y0 && y < SHACK.y1 + 1;
}
