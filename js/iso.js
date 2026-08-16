// Isometric constants & conversions. World units = tiles (floats).
const VIEW_W = 320, VIEW_H = 180;   // internal pixel resolution (scaled up, pixelated)
const TILE_W = 32, TILE_H = 16;     // 2:1 diamond tiles

function isoToScreen(x, y) {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}
function screenToIso(sx, sy) {
  const a = sx / (TILE_W / 2), b = sy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

// Small seeded RNG so the map & sprites are identical every run
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
