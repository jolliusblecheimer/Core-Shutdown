// All sprites are generated procedurally at load — placeholder pixel art,
// consistent style, replaceable with hand-made art later without code changes.
const Sprites = {};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function px(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }

// shear a flat sprite so it follows an isometric edge. dir +1 = runs along the
// world x-axis (screen down-right), dir -1 = along y (screen down-left).
function sheared(src, dir) {
  const w = src.width, h = src.height;
  const c = makeCanvas(w, h + Math.ceil(w * 0.5)), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let x = 0; x < w; x++) {
    const off = dir > 0 ? Math.round(x * 0.5) : Math.round((w - 1 - x) * 0.5);
    g.drawImage(src, x, 0, 1, h, x, off, 1, h);
  }
  return c;
}

// wrap a sprite in a 1px dark outline so props read as standing objects
function outlined(src) {
  const c = makeCanvas(src.width + 2, src.height + 2), g = c.getContext('2d');
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(src, dx, dy);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#0f0b09';
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(src, 1, 1);
  return c;
}

(function buildSprites() {
  const rng = mulberry32(1337);

  // ---- Ground tiles (diamond 32x16) — scanline-filled, pixel-perfect edges.
  // No path/clip antialiasing, so adjacent tiles butt together with NO seams.
  function diamondRow(r) {           // half-width of diamond at row r (0..15)
    return r < 8 ? (r + 1) * 2 : (16 - r) * 2;
  }
  // put a pixel only if it falls inside the diamond
  function dpx(g, x, y, w, col) {
    if (y < 0 || y >= TILE_H) return;
    const hw = diamondRow(y);
    const x0 = Math.max(x, 16 - hw), x1 = Math.min(x + w, 16 + hw);
    if (x1 > x0) px(g, x0, y, x1 - x0, 1, col);
  }
  function tileBase(base) {
    const c = makeCanvas(TILE_W, TILE_H), g = c.getContext('2d');
    for (let r = 0; r < TILE_H; r++) {
      const hw = diamondRow(r);
      px(g, 16 - hw, r, hw * 2, 1, base);
    }
    return { c, g };
  }
  function sprinkle(g, n, specks) {
    for (let i = 0; i < n; i++) {
      const r = (rng() * TILE_H) | 0;
      dpx(g, (rng() * TILE_W) | 0, r, 1 + ((rng() * 2) | 0), specks[(rng() * specks.length) | 0]);
    }
  }

  // HD-2D ground pass: richer, more detailed tiles
  Sprites.asphalt = []; Sprites.dirt = []; Sprites.rubble = []; Sprites.planks = [];
  for (let i = 0; i < 8; i++) {
    // cracked concrete slabs
    const { c, g } = tileBase('#31302e');
    sprinkle(g, 40, ['#3d3b38', '#282624', '#454340', '#2b2927', '#383633']);
    if (rng() < 0.7) {                            // slab seam
      const sy = 4 + ((rng() * 8) | 0);
      dpx(g, 0, sy, 32, '#242322');
      dpx(g, 0, sy + 1, 32, 'rgba(90,88,84,0.35)');
    }
    if (rng() < 0.5) {                            // crack
      let cx = 8 + rng() * 12, cy = 3 + rng() * 8;
      for (let k = 0; k < 5; k++) {
        dpx(g, cx | 0, cy | 0, 2, '#211f1e');
        cx += 1 + rng() * 2; cy += rng() < 0.5 ? 1 : 0;
      }
    }
    for (let k = 0; k < 3; k++) {                 // small stones
      const sx = (rng() * 32) | 0, sy = (rng() * 16) | 0;
      dpx(g, sx, sy, 2, '#4f4c48');
      dpx(g, sx, sy + 1, 2, '#211f1e');
    }
    Sprites.asphalt.push(c);
  }
  for (let i = 0; i < 8; i++) {
    // packed dirt with pebbles
    const { c, g } = tileBase('#3e342a');
    sprinkle(g, 42, ['#352c22', '#483c2e', '#2f261e', '#43382c', '#39302a']);
    for (let k = 0; k < 4; k++) {                 // pebbles with shadows
      const sx = (rng() * 32) | 0, sy = (rng() * 15) | 0;
      dpx(g, sx, sy, 2, '#5a4c38');
      dpx(g, sx + 1, sy + 1, 2, '#28211a');
    }
    if (rng() < 0.4) {                            // damp patch
      const sy = 4 + ((rng() * 8) | 0), sx = (rng() * 24) | 0;
      for (let r = 0; r < 3; r++) dpx(g, sx - r, sy + r, 8 + r, 'rgba(30,24,18,0.4)');
    }
    Sprites.dirt.push(c);
  }
  for (let i = 0; i < 8; i++) {
    // debris-strewn rubble
    const { c, g } = tileBase('#37332e');
    sprinkle(g, 38, ['#403c36', '#2d2a26', '#4a463f', '#332f2b']);
    for (let k = 0; k < 5; k++) {                 // chunks with lit tops
      const sx = (rng() * 30) | 0, sy = (rng() * 14) | 0;
      dpx(g, sx, sy, 3, '#57534c');
      dpx(g, sx, sy + 1, 3, '#45413b');
      dpx(g, sx, sy + 2, 3, '#26231f');
    }
    if (rng() < 0.5) dpx(g, (rng() * 28) | 0, (rng() * 15) | 0, 2, '#6a4326');  // rust flake
    Sprites.rubble.push(c);
  }
  for (let i = 0; i < 3; i++) {
    // interior planks with nails
    const { c, g } = tileBase('#4a3a26');
    sprinkle(g, 30, ['#55432c', '#3e301e', '#5c4a30', '#463726']);
    for (let r = 2; r < TILE_H; r += 4) {
      const hw = diamondRow(r);
      px(g, 16 - hw, r, hw * 2, 1, '#3e301e');
    }
    for (let k = 0; k < 3; k++) dpx(g, (rng() * 30) | 0, (rng() * 15) | 0, 1, '#211d16');
    Sprites.planks.push(c);
  }

  // ambient-occlusion diamond (drawn on tiles that touch solid objects)
  (function () {
    const c = makeCanvas(TILE_W, TILE_H), g = c.getContext('2d');
    for (let r = 0; r < TILE_H; r++) {
      const hw = diamondRow(r);
      px(g, 16 - hw, r, hw * 2, 1, 'rgba(8,6,5,1)');
    }
    Sprites.aoTile = c;
  })();

  // ---- Ground decals (non-blocking, break up the surface) ----
  Sprites.decals = {};
  (function () {
    // crack
    const c = makeCanvas(18, 9), g = c.getContext('2d');
    g.strokeStyle = 'rgba(12,10,9,0.55)';
    g.beginPath(); g.moveTo(1, 5);
    let x = 1, y = 5;
    for (let i = 0; i < 5; i++) { x += 3 + rng() * 2; y += (rng() - 0.5) * 4; g.lineTo(x, y); }
    g.stroke();
    Sprites.decals.crack = c;
  })();
  (function () {
    // weeds
    const c = makeCanvas(10, 8), g = c.getContext('2d');
    for (let i = 0; i < 6; i++) {
      const x = 1 + rng() * 8;
      px(g, x | 0, (2 + rng() * 4) | 0, 1, 2 + ((rng() * 2) | 0), rng() < 0.5 ? '#4a5a2a' : '#3c4c22');
    }
    Sprites.decals.weed = c;
  })();
  (function () {
    // oil stain
    const c = makeCanvas(16, 8), g = c.getContext('2d');
    g.fillStyle = 'rgba(15,12,10,0.35)';
    g.beginPath(); g.ellipse(8, 4, 7, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(15,12,10,0.3)';
    g.beginPath(); g.ellipse(5, 5, 3, 1.6, 0, 0, Math.PI * 2); g.fill();
    Sprites.decals.stain = c;
  })();
  (function () {
    // rain puddle — cool reflective water against the warm ground
    const c = makeCanvas(20, 10), g = c.getContext('2d');
    g.fillStyle = '#262b34';
    g.beginPath(); g.ellipse(10, 5, 9, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#333a48';
    g.beginPath(); g.ellipse(10, 5, 7, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(150,170,210,0.5)';
    g.fillRect(6, 4, 6, 1);
    g.fillStyle = 'rgba(150,170,210,0.25)';
    g.fillRect(9, 6, 4, 1);
    Sprites.decals.puddle = c;
  })();

  // ---- Player (15x20 + outline, 2 walk frames) ----
  // Reference: black techwear — hooded long coat, pale upper face with a
  // dark mask over mouth/nose, fingerless gloves, baggy black pants, boots.
  const COAT = '#26262c', COAT_L = '#3a3a44', COAT_D = '#18181e';
  const SKIN = '#c9b8a8', MASK = '#101014';
  const PANT = '#2c2c34', PANT_D = '#222229', BOOT = '#1c1c22', BOOT_L = '#33333c';
  function playerFrame(step) {
    const c = makeCanvas(15, 20), g = c.getContext('2d');
    const b = step ? 1 : 0;
    px(g, 6, 0 + b, 3, 1, COAT_L);                     // hood peak
    px(g, 5, 1 + b, 5, 1, COAT); px(g, 5, 1 + b, 1, 1, COAT_L);
    px(g, 4, 2 + b, 7, 2, COAT); px(g, 4, 2 + b, 1, 1, COAT_L);
    px(g, 5, 4 + b, 5, 1, SKIN);                       // pale upper face
    px(g, 5, 5 + b, 5, 1, MASK);                       // mask over mouth/nose
    px(g, 4, 6 + b, 7, 1, COAT_D);                     // high collar
    px(g, 3, 7 + b, 9, 1, COAT_L);                     // padded shoulders
    px(g, 2, 8 + b, 11, 1, COAT);
    px(g, 3, 9 + b, 3, 1, COAT_L);                     // chest padding stitch
    px(g, 2, 9 + b, 11, 1, COAT); px(g, 3, 9 + b, 3, 1, COAT_L);
    px(g, 2, 10 + b, 11, 1, COAT); px(g, 7, 10 + b, 1, 1, COAT_D); // zip line
    px(g, 2, 11 + b, 11, 1, COAT); px(g, 7, 11 + b, 1, 1, COAT_D);
    px(g, 2, 11 + b, 1, 2, '#0e0e12');                 // gloved hands
    px(g, 12, 11 + b, 1, 2, '#0e0e12');
    px(g, 2, 12 + b, 11, 1, COAT); px(g, 7, 12 + b, 1, 1, COAT_D);
    px(g, 11, 9 + b, 2, 4, COAT_D);                    // right side shade
    // long open coat: dark pants show between the coat halves
    px(g, 3, 13 + b, 4, 1, COAT); px(g, 8, 13 + b, 4, 1, COAT);
    px(g, 7, 13 + b, 1, 1, PANT_D);
    px(g, 3, 14 + b, 3, 1, COAT_D); px(g, 9, 14 + b, 3, 1, COAT_D);
    px(g, 6, 14 + b, 3, 1, PANT);
    px(g, 3, 15 + b, 2, 1, COAT_D); px(g, 10, 15 + b, 2, 1, COAT_D); // coat tails
    px(g, 5, 15 + b, 5, 1, PANT);
    px(g, 4, 16 + b, 3, 1, PANT); px(g, 8, 16 + b, 3, 1, PANT);      // baggy legs
    if (step) {
      px(g, 4, 17, 3, 1, PANT_D); px(g, 8, 17, 3, 1, PANT_D);
      px(g, 4, 18, 3, 2, BOOT); px(g, 8, 18, 3, 2, BOOT);
      px(g, 4, 18, 3, 1, BOOT_L); px(g, 8, 18, 3, 1, BOOT_L);
    } else {
      px(g, 5, 17, 2, 1, PANT_D); px(g, 8, 17, 2, 1, PANT_D);
      px(g, 5, 18, 2, 2, BOOT); px(g, 8, 18, 2, 2, BOOT);
      px(g, 5, 18, 2, 1, BOOT_L); px(g, 8, 18, 2, 1, BOOT_L);
    }
    return outlined(c);
  }
  Sprites.player = [playerFrame(0), playerFrame(1)];

  // ---- NPC: old scavenger — same size & detail as the player ----
  function npcFrame(step) {
    const c = makeCanvas(15, 20), g = c.getContext('2d');
    const b = step ? 1 : 0;
    const GC = '#48503c', GC_L = '#5a624a', GC_D = '#363c2c';
    px(g, 6, 0 + b, 3, 1, GC_L);
    px(g, 5, 1 + b, 5, 1, GC); px(g, 5, 1 + b, 1, 1, GC_L);
    px(g, 4, 2 + b, 7, 2, GC); px(g, 4, 2 + b, 1, 1, GC_L);
    px(g, 5, 4 + b, 5, 1, '#0c0d12');                  // shadowed eyes
    px(g, 5, 5 + b, 5, 2, '#b8b0a0');                  // pale beard
    px(g, 4, 7 + b, 7, 1, GC_D);
    px(g, 3, 8 + b, 9, 1, GC_L);                       // shoulders
    px(g, 2, 9 + b, 11, 2, GC);
    px(g, 4, 10 + b, 7, 1, '#2e2118');                 // rope belt
    px(g, 2, 11 + b, 11, 2, GC); px(g, 11, 11 + b, 2, 2, GC_D);
    px(g, 3, 13 + b, 9, 1, GC); px(g, 6, 13 + b, 3, 1, '#867453');
    px(g, 3, 14 + b, 9, 1, GC_D); px(g, 6, 14 + b, 3, 1, '#867453');
    px(g, 5, 15 + b, 5, 1, '#4a3a2c');                 // worn pants
    px(g, 4, 16 + b, 3, 1, '#3c2f22'); px(g, 8, 16 + b, 3, 1, '#3c2f22');
    px(g, 5, 17, 2, 1, '#3c2f22'); px(g, 8, 17, 2, 1, '#3c2f22');
    px(g, 5, 18, 2, 2, BOOT); px(g, 8, 18, 2, 2, BOOT);
    return outlined(c);
  }
  Sprites.npc = [npcFrame(0), npcFrame(1)];

  // ---- Scrapper robot (16x16) ----
  const METAL = '#63636b', METAL_D = '#43434b', RUST = '#7d4a2a', RUST_D = '#5c3620', EYE = '#ffb02e';
  function scrapperFrame(lean, armUp) {
    const c = makeCanvas(16, 16), g = c.getContext('2d');
    const hx = lean;
    px(g, 4, 12, 8, 3, METAL_D);
    px(g, 4, 14, 8, 1, '#2a2a30');
    px(g, 4, 5, 8, 7, METAL);
    px(g, 4, 5, 3, 3, RUST);
    px(g, 9, 9, 3, 2, RUST_D);
    px(g, 4, 10, 2, 2, RUST_D);
    px(g, 5 + hx, 2, 6, 3, METAL_D);
    px(g, 7 + hx, 3, 3, 1, EYE);
    px(g, 2, 6, 2, 5, RUST);
    if (armUp) { px(g, 12, 1, 2, 7, RUST); px(g, 12, 0, 3, 2, METAL_D); }
    else px(g, 12, 6, 2, 5, RUST);
    return c;
  }
  Sprites.scrapper = [
    outlined(scrapperFrame(-1, false)),
    outlined(scrapperFrame(1, false)),
    outlined(scrapperFrame(0, true)),
  ];
  (function () {
    const c = makeCanvas(16, 10), g = c.getContext('2d');
    px(g, 3, 5, 10, 4, METAL_D);
    px(g, 5, 3, 5, 3, RUST);
    px(g, 10, 4, 4, 3, METAL);
    px(g, 2, 7, 3, 2, RUST_D);
    Sprites.scrapperDead = outlined(c);
  })();

  // ---- Props (all outlined so they read as objects) ----
  // tall scrap piles
  function scrapPile() {
    const c = makeCanvas(24, 22), g = c.getContext('2d');
    const cols = ['#5a5a62', '#43434b', '#7d4a2a', '#5c3620', '#6a6a72', '#333338'];
    const lit = ['#8a8a92', '#9a6a42'];
    for (let i = 0; i < 90; i++) {
      const t = rng();                      // 0 = bottom, 1 = top
      const y = 20 - t * 17;
      const spread = 10 - t * 8;
      const x = 12 + (rng() - 0.5) * 2 * spread;
      const w = 1 + ((rng() * 3) | 0);
      const col = t > 0.72 && rng() < 0.5 ? lit[(rng() * 2) | 0] : cols[(rng() * cols.length) | 0];
      px(g, x | 0, y | 0, w, 1 + ((rng() * 2) | 0), col);
    }
    return outlined(c);
  }
  Sprites.scrapPiles = [scrapPile(), scrapPile(), scrapPile()];

  // car wreck, two paint jobs
  function car(body, bodyD) {
    const c = makeCanvas(36, 20), g = c.getContext('2d');
    px(g, 3, 8, 30, 8, body);
    px(g, 6, 4, 20, 5, bodyD);
    px(g, 8, 5, 7, 3, '#14161c');
    px(g, 17, 5, 7, 3, '#14161c');
    px(g, 3, 8, 6, 3, '#7d4a2a');
    px(g, 24, 12, 8, 3, RUST_D);
    px(g, 26, 9, 5, 2, RUST);
    px(g, 6, 15, 5, 3, '#22201e');
    px(g, 25, 15, 5, 3, '#22201e');
    return outlined(c);
  }
  Sprites.cars = [car('#6e3b24', '#5c3220'), car('#3f5468', '#334455')];

  // oil barrel (upright + tipped)
  (function () {
    const c = makeCanvas(10, 14), g = c.getContext('2d');
    px(g, 1, 2, 8, 11, '#4a5240');
    px(g, 1, 1, 8, 2, '#5a6250');
    px(g, 1, 5, 8, 1, '#3a4232');
    px(g, 1, 9, 8, 1, '#3a4232');
    px(g, 2, 2, 2, 10, '#5a6250');
    px(g, 3, 6, 3, 3, RUST);
    Sprites.barrel = outlined(c);
    const t = makeCanvas(15, 9), tg = t.getContext('2d');
    px(tg, 1, 2, 12, 6, '#4a5240');
    px(tg, 12, 1, 2, 8, '#5a6250');
    px(tg, 4, 2, 1, 6, '#3a4232');
    px(tg, 8, 2, 1, 6, '#3a4232');
    px(tg, 2, 4, 3, 2, RUST_D);
    Sprites.barrelTipped = outlined(t);
  })();

  // explosive barrel — red with a hazard stripe. Shoot it. (recurring world
  // element: these appear all over the city, not just the yard)
  (function () {
    const c = makeCanvas(11, 15), g = c.getContext('2d');
    px(g, 1, 2, 9, 12, '#8a3226');
    px(g, 1, 1, 9, 2, '#a43e2c');
    px(g, 2, 2, 2, 11, '#a04434');
    px(g, 1, 6, 9, 3, '#c9a24a');        // hazard band
    px(g, 3, 6, 2, 3, '#2a2a30');        // hazard notches
    px(g, 7, 6, 2, 3, '#2a2a30');
    px(g, 1, 12, 9, 1, '#5c2418');
    Sprites.boomBarrel = outlined(c);
  })();

  // tire stack
  (function () {
    const c = makeCanvas(14, 13), g = c.getContext('2d');
    for (let i = 0; i < 3; i++) {
      const y = 9 - i * 4;
      px(g, 1, y, 12, 4, '#1e1e22');
      px(g, 2, y, 10, 1, '#32323a');
      px(g, 5, y + 1, 4, 2, '#101014');
    }
    Sprites.tires = outlined(c);
  })();

  // bent pipe
  (function () {
    const c = makeCanvas(26, 10), g = c.getContext('2d');
    px(g, 1, 5, 14, 3, '#5a5a62');
    px(g, 13, 3, 3, 5, '#6a6a72');
    px(g, 15, 2, 9, 3, '#5a5a62');
    px(g, 1, 5, 14, 1, '#7a7a82');
    px(g, 15, 2, 9, 1, '#7a7a82');
    px(g, 6, 6, 3, 2, RUST);
    Sprites.pipe = outlined(c);
  })();

  // steel girder
  (function () {
    const c = makeCanvas(30, 13), g = c.getContext('2d');
    px(g, 1, 2, 28, 3, '#55555d');
    px(g, 4, 5, 22, 4, '#43434b');
    px(g, 1, 9, 28, 3, '#55555d');
    px(g, 1, 2, 28, 1, '#75757d');
    px(g, 8, 5, 3, 4, RUST_D);
    px(g, 18, 5, 3, 4, RUST);
    Sprites.girder = outlined(c);
  })();

  // wooden crate
  (function () {
    const c = makeCanvas(14, 13), g = c.getContext('2d');
    px(g, 1, 1, 12, 11, '#5c4a2e');
    px(g, 1, 1, 12, 2, '#6e5a3a');
    px(g, 1, 1, 2, 11, '#6e5a3a');
    px(g, 1, 6, 12, 1, '#453722');
    px(g, 6, 1, 1, 11, '#453722');
    Sprites.crate = outlined(c);
  })();

  // wall/barricade segment painters — one 16px segment, bottom-aligned in
  // height H. Whole wall RUNS are painted as one strip, outlined, sheared to
  // their iso direction, then sliced back into per-tile pieces (in map.js) so
  // walls are continuous with no per-piece overlap or protruding joints.
  Sprites.paintSeg = function (g, kind, ox, H) {
    if (kind === 'M') {                       // corrugated metal fence (20 tall)
      const y = H - 20;
      const v = ((ox / 16) | 0) % 3;          // per-segment variation
      px(g, ox, y + 3, 16, 14, '#4e463e');
      for (let i = 0; i < 4; i++) px(g, ox + 1 + i * 4, y + 3, 2, 14, '#5e564c');
      px(g, ox, y + 3, 16, 2, '#6a6258');
      if (v === 0) { px(g, ox + 3, y + 10, 4, 4, RUST); px(g, ox + 11, y + 5, 4, 3, RUST_D); }
      else if (v === 1) { px(g, ox + 8, y + 12, 5, 3, RUST_D); px(g, ox + 2, y + 6, 3, 3, RUST); }
      else { px(g, ox + 12, y + 9, 3, 5, RUST); }
      px(g, ox, y + 16, 2, 4, '#3a342c');
      px(g, ox + 14, y + 16, 2, 4, '#3a342c');
    } else if (kind === 'C') {                // concrete block (14 tall)
      const y = H - 14;
      px(g, ox, y + 4, 16, 9, '#6a655c');
      px(g, ox, y + 4, 16, 2, '#7d786e');
      px(g, ox, y + 1, 3, 5, '#7d786e');
      px(g, ox + 13, y + 1, 3, 5, '#7d786e');
      px(g, ox + 5, y + 7, 5, 4, '#57534b');
    } else {                                  // 'W' shack wall (28 tall)
      const y = H - 28;
      px(g, ox, y + 3, 16, 23, '#3e3831');
      for (let i = 0; i < 4; i++) px(g, ox + 1 + i * 4, y + 3, 2, 23, '#48423a');
      px(g, ox, y + 3, 16, 2, '#565048');
      px(g, ox, y + 24, 16, 2, '#2c2822');
      px(g, ox + 11, y + 7, 4, 4, RUST_D);
      px(g, ox + 3, y + 16, 3, 5, RUST);
    }
  };

  // build a continuous wall run and slice it into per-tile drawables.
  // trimStart/trimEnd cut HALF a tile where the run meets a perpendicular
  // wall, so both faces stop exactly at the corner point instead of
  // overshooting past it (the overshoot was the "protruding" corner bug).
  Sprites.makeWallRun = function (kinds, axis, trimStart, trimEnd) {
    const n = kinds.length;
    const isWall = kinds[0] === 'W';
    const H = isWall ? 28 : 20;
    const flat = makeCanvas(16 * n, H), g = flat.getContext('2d');
    kinds.forEach((k, i) => Sprites.paintSeg(g, k, i * 16, H));
    const out = outlined(flat);
    const dir = axis === 'x' ? 1 : -1;
    const F = sheared(out, dir);
    const Wo = out.width;
    const slices = [];
    for (let i = 0; i < n; i++) {
      const si = axis === 'x' ? i : n - 1 - i;      // strip block for this tile
      let a = si === 0 ? 0 : 1 + 16 * si;
      let b = si === n - 1 ? Wo : 1 + 16 * (si + 1);
      // run-start / run-end map to opposite strip ends depending on axis
      if (axis === 'x') {
        if (trimStart && i === 0) a = Math.max(a, 9);
        if (trimEnd && i === n - 1) b = Math.min(b, 16 * si + 9);
      } else {
        if (trimStart && i === 0) b = Math.min(b, 16 * si + 9);
        if (trimEnd && i === n - 1) a = Math.max(a, 9);
      }
      const img = makeCanvas(Math.max(1, b - a), F.height);
      img.getContext('2d').drawImage(F, a, 0, b - a, F.height, 0, 0, b - a, F.height);
      const off = dir > 0 ? 8 * si + 1 : 8 * (n - si);
      const dx = (a - 1 - 16 * si) - 8;
      slices.push({ img, dx, dy: -off, lift: isWall ? 30 : 24 });
    }
    return slices;
  };

  // trash mountains — rust-heavy like a real scrap yard, in three sizes
  function mound(W, H) {
    const c = makeCanvas(W, H), g = c.getContext('2d');
    const cols = ['#7d4a2a', '#8a5530', '#5c3620', '#6a4326', '#5a5a62', '#43434b', '#96603a', '#333338'];
    const lit = ['#a4713f', '#9a9aa2', '#b07840', '#c9c9d2'];
    const cx = W / 2;
    for (let i = 0; i < W * H * 0.55; i++) {
      const t = Math.pow(rng(), 1.5);            // bias toward the base
      const y = H - 2 - t * (H - 5);
      const halfw = (1 - t) * (W / 2 - 2) + 2;
      const x = cx + (rng() * 2 - 1) * halfw;
      const col = (t > 0.55 && rng() < 0.4) ? lit[(rng() * lit.length) | 0] : cols[(rng() * cols.length) | 0];
      px(g, x | 0, y | 0, 1 + ((rng() * 3) | 0), 1 + ((rng() * 2) | 0), col);
    }
    // a few poking silhouettes on the crest (pipes, girder ends)
    for (let i = 0; i < W / 14; i++) {
      const x = cx + (rng() * 2 - 1) * (W / 5);
      px(g, x | 0, 1 + ((rng() * 5) | 0), 2, 6 + ((rng() * 5) | 0), rng() < 0.5 ? '#43434b' : '#5c3620');
    }
    return outlined(c);
  }
  Sprites.mound2 = [mound(60, 42), mound(60, 42)];
  Sprites.mound3 = [mound(116, 70), mound(116, 70)];

  // ---- Items ----
  (function () {
    // pistol on the ground / HUD icon
    const c = makeCanvas(12, 8), g = c.getContext('2d');
    px(g, 1, 2, 9, 2, '#9a9aa4');
    px(g, 1, 1, 9, 1, '#b8b8c2');
    px(g, 2, 4, 3, 3, '#6a6a74');
    px(g, 8, 4, 2, 1, '#6a6a74');
    Sprites.pistol = outlined(c);

    // ammo box
    const a = makeCanvas(10, 8), ag = a.getContext('2d');
    px(ag, 1, 2, 8, 5, '#55603c');
    px(ag, 1, 2, 8, 1, '#69754c');
    px(ag, 3, 0, 1, 3, '#c9a24a');
    px(ag, 5, 0, 1, 3, '#c9a24a');
    px(ag, 7, 0, 1, 3, '#c9a24a');
    Sprites.ammo = outlined(a);

    // scrap bit
    const s = makeCanvas(5, 5), sg = s.getContext('2d');
    px(sg, 1, 1, 3, 3, '#8a8a92');
    px(sg, 1, 1, 2, 1, '#c9c9d2');
    px(sg, 3, 3, 1, 1, '#5c3620');
    Sprites.scrapBit = s;

    // pistol icon — careful pixel study of a Glock 17 profile:
    // long boxy light-grey slide, short dark polymer frame, round trigger
    // guard, grip raking back at the classic Glock angle
    const p = makeCanvas(22, 16), pg = p.getContext('2d');
    px(pg, 2, 0, 2, 1, '#7c828e');        // rear sight
    px(pg, 17, 0, 1, 1, '#7c828e');       // front sight
    px(pg, 1, 1, 19, 5, '#9ba0ab');       // slide
    px(pg, 1, 1, 19, 1, '#c2c7d2');       // slide top light
    px(pg, 1, 5, 19, 1, '#6f7480');       // slide underside shadow
    for (let i = 0; i < 3; i++) px(pg, 14 + i * 2, 2, 1, 3, '#7c828e');  // rear serrations
    px(pg, 8, 2, 4, 2, '#868b97');        // ejection port
    px(pg, 19, 2, 1, 3, '#5d626e');       // muzzle face
    px(pg, 2, 6, 15, 3, '#3a3d45');       // frame
    px(pg, 3, 6, 9, 1, '#464a53');        // frame top line / rail
    px(pg, 8, 9, 1, 3, '#2e3138');        // trigger guard (round-ish loop)
    px(pg, 9, 11, 3, 1, '#2e3138');
    px(pg, 12, 9, 1, 2, '#2e3138');
    px(pg, 10, 9, 1, 2, '#1e2026');       // trigger
    // grip rakes back: two columns stepping right as it descends
    px(pg, 13, 6, 5, 3, '#3a3d45');
    px(pg, 14, 9, 5, 2, '#363942');
    px(pg, 15, 11, 5, 2, '#33363e');
    px(pg, 16, 13, 5, 2, '#2f323a');
    px(pg, 17, 15, 4, 1, '#26282e');      // mag base plate
    px(pg, 18, 7, 1, 7, '#464a53');       // backstrap highlight
    px(pg, 15, 9, 1, 5, '#42454e');       // grip texture
    px(pg, 17, 10, 1, 4, '#42454e');
    Sprites.pistolIcon = outlined(p);

    // compact version for the HUD weapon slot (pipe-sized)
    const ps = makeCanvas(16, 11), psg = ps.getContext('2d');
    px(psg, 1, 0, 2, 1, '#7c828e');       // rear sight
    px(psg, 12, 0, 1, 1, '#7c828e');      // front sight
    px(psg, 1, 1, 13, 3, '#9ba0ab');      // slide
    px(psg, 1, 1, 13, 1, '#c2c7d2');
    px(psg, 10, 2, 1, 2, '#7c828e');      // serrations
    px(psg, 12, 2, 1, 2, '#7c828e');
    px(psg, 13, 2, 1, 2, '#5d626e');      // muzzle
    px(psg, 1, 4, 13, 1, '#6f7480');
    px(psg, 2, 5, 9, 2, '#3a3d45');       // frame
    px(psg, 5, 7, 1, 2, '#2e3138');       // trigger guard
    px(psg, 6, 8, 2, 1, '#2e3138');
    px(psg, 8, 7, 1, 1, '#2e3138');
    px(psg, 9, 5, 4, 2, '#3a3d45');       // raked grip
    px(psg, 10, 7, 4, 2, '#363942');
    px(psg, 11, 9, 4, 2, '#2f323a');
    Sprites.pistolIconS = outlined(ps);

    // held pistol for the aiming pose — same detail level as the character
    const ph = makeCanvas(12, 8), phg = ph.getContext('2d');
    px(phg, 2, 0, 1, 1, '#7c828e');       // rear sight
    px(phg, 10, 0, 1, 1, '#7c828e');      // front sight
    px(phg, 2, 1, 9, 2, '#9ba0ab');       // slide
    px(phg, 2, 1, 9, 1, '#c2c7d2');       // slide highlight
    px(phg, 8, 2, 1, 1, '#7c828e');       // serration hint
    px(phg, 11, 1, 1, 2, '#5d626e');      // muzzle
    px(phg, 3, 3, 7, 1, '#3a3d45');       // frame
    px(phg, 6, 4, 1, 2, '#2e3138');       // trigger guard
    px(phg, 7, 5, 2, 1, '#2e3138');
    px(phg, 3, 4, 2, 2, '#34363e');       // raked grip
    px(phg, 4, 6, 2, 2, '#2f323a');
    Sprites.pistolHeld = outlined(ph);

    // metal pipe (ground item + icon)
    const pi = makeCanvas(20, 7), pig = pi.getContext('2d');
    px(pig, 1, 2, 18, 3, '#6a6a72');
    px(pig, 1, 2, 18, 1, '#8a8a92');
    px(pig, 1, 2, 2, 3, '#55555d');
    px(pig, 17, 2, 2, 3, '#55555d');
    px(pig, 6, 1, 5, 5, '#3a2a1a');       // grip tape
    px(pig, 7, 1, 1, 5, '#4a3626');
    Sprites.pipeIcon = outlined(pi);

    // piercing knife icon
    const k = makeCanvas(19, 8), kg = k.getContext('2d');
    px(kg, 1, 3, 10, 2, '#b8bcc8');       // blade
    px(kg, 1, 3, 10, 1, '#dfe3ec');
    px(kg, 11, 4, 2, 1, '#b8bcc8');       // tip taper
    px(kg, 12, 2, 1, 4, '#7d818c');       // guard
    px(kg, 13, 3, 5, 2, '#4a3a24');       // handle
    px(kg, 17, 2, 1, 4, '#3a2c1c');       // pommel
    Sprites.knifeIcon = outlined(k);
    // held version for the stab animation — same design, but compact so the
    // on-screen blade matches the actual attack range
    const kh = makeCanvas(12, 6), khg = kh.getContext('2d');
    px(khg, 1, 1, 3, 2, '#4a3a24');       // handle
    px(khg, 0, 1, 1, 2, '#3a2c1c');       // pommel
    px(khg, 4, 0, 1, 4, '#7d818c');       // guard
    px(khg, 5, 1, 6, 2, '#b8bcc8');       // blade
    px(khg, 5, 1, 6, 1, '#dfe3ec');
    px(khg, 11, 2, 1, 1, '#b8bcc8');      // tip
    Sprites.knifeHeld = outlined(kh);

    // snack bar
    const sn = makeCanvas(12, 7), sng = sn.getContext('2d');
    px(sng, 1, 1, 10, 5, '#8a5530');
    px(sng, 1, 1, 10, 1, '#a4713f');
    px(sng, 5, 1, 2, 5, '#c9a24a');       // wrapper band
    px(sng, 1, 5, 10, 1, '#6a4326');
    Sprites.snackIcon = outlined(sn);

    // tech component (little green board)
    const tc = makeCanvas(10, 9), tcg = tc.getContext('2d');
    px(tcg, 1, 2, 8, 6, '#2e5a3c');
    px(tcg, 1, 2, 8, 1, '#3c6e4c');
    px(tcg, 3, 4, 2, 2, '#1c1c22');       // chip
    px(tcg, 6, 4, 1, 1, '#c9a24a');       // gold pads
    px(tcg, 6, 6, 1, 1, '#c9a24a');
    px(tcg, 2, 6, 1, 1, '#c9a24a');
    Sprites.techIcon = outlined(tc);
  })();

  // ---- shack interior furniture ----
  (function () {
    // cot with blanket + pillow
    const c = makeCanvas(22, 14), g = c.getContext('2d');
    px(g, 1, 4, 20, 7, '#4a3a26');        // frame
    px(g, 2, 3, 18, 6, '#6a4444');        // blanket
    px(g, 2, 3, 18, 1, '#7d5252');
    px(g, 3, 4, 5, 3, '#b8b0a0');         // pillow
    px(g, 1, 11, 2, 3, '#3a2c1c');        // legs
    px(g, 19, 11, 2, 3, '#3a2c1c');
    Sprites.cot = outlined(c);

    // wooden table
    const t = makeCanvas(20, 15), tg = t.getContext('2d');
    px(tg, 1, 3, 18, 5, '#5c4a2e');
    px(tg, 1, 3, 18, 1, '#6e5a3a');
    px(tg, 2, 8, 2, 6, '#453722');
    px(tg, 16, 8, 2, 6, '#453722');
    px(tg, 5, 4, 4, 2, '#8a8a92');        // tin plate
    Sprites.table = outlined(t);

    // stool
    const st = makeCanvas(10, 10), sg2 = st.getContext('2d');
    px(sg2, 1, 2, 8, 3, '#5c4a2e');
    px(sg2, 1, 2, 8, 1, '#6e5a3a');
    px(sg2, 2, 5, 1, 4, '#453722');
    px(sg2, 7, 5, 1, 4, '#453722');
    Sprites.stool = outlined(st);

    // tall shelf with supplies
    const sh = makeCanvas(18, 26), shg = sh.getContext('2d');
    px(shg, 1, 1, 16, 24, '#4a3a26');
    px(shg, 2, 2, 14, 22, '#3a2c1c');
    for (let r = 0; r < 3; r++) {
      px(shg, 2, 8 + r * 7, 14, 1, '#5c4a2e');            // shelf boards
      const cols = ['#6a6a72', '#7d4a2a', '#55603c', '#c9a24a'];
      for (let i = 0; i < 4; i++) px(shg, 3 + i * 3.5, 4 + r * 7, 2, 3, cols[(r + i) % 4]);  // cans/jars
    }
    Sprites.shelf = outlined(sh);

    // fire barrel stove (glows — light added at draw time)
    const fv = makeCanvas(12, 16), fvg = fv.getContext('2d');
    px(fvg, 1, 3, 10, 12, '#3a3a40');
    px(fvg, 1, 3, 10, 2, '#4a4a52');
    px(fvg, 2, 3, 2, 12, '#46464e');
    px(fvg, 3, 8, 6, 3, '#1c1c22');       // fire slot
    px(fvg, 4, 9, 4, 2, '#ff7a2e');       // embers
    px(fvg, 5, 9, 2, 1, '#ffb02e');
    Sprites.stove = outlined(fv);
  })();

  // ---- THE COMPACTOR (boss): low crawler hull carried on four legs,
  // one big eye up front, four core vents behind, two grabber claws ----
  (function () {
    // round beetle-dome hull, compact
    const c = makeCanvas(34, 28), g = c.getContext('2d');
    g.fillStyle = '#565660';
    g.beginPath(); g.ellipse(17, 14, 16, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#666672';
    g.beginPath(); g.ellipse(17, 11, 12, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#75757f';
    g.beginPath(); g.ellipse(15, 8, 7, 4, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#44444c';                          // radial plate seams
    for (const a of [0.5, 1.7, 2.9, 4.1, 5.3]) {
      g.beginPath();
      g.moveTo(17 + Math.cos(a) * 5, 14 + Math.sin(a) * 4);
      g.lineTo(17 + Math.cos(a) * 15, 14 + Math.sin(a) * 12);
      g.stroke();
    }
    px(g, 7, 18, 5, 4, '#7d4a2a');                      // rust
    px(g, 23, 7, 4, 3, '#5c3620');
    Sprites.bossBody = outlined(c);

    // grabber claw — the trash-picker arms it attacks with
    const a = makeCanvas(20, 12), ag = a.getContext('2d');
    px(ag, 0, 4, 10, 4, '#4c4c56');                    // arm segment
    px(ag, 0, 4, 10, 1, '#5e5e68');
    px(ag, 9, 2, 4, 8, '#565660');                     // wrist block
    px(ag, 13, 1, 6, 3, '#6a6a74');                    // upper prong
    px(ag, 17, 3, 2, 2, '#8a8a92');
    px(ag, 13, 8, 6, 3, '#6a6a74');                    // lower prong
    px(ag, 17, 7, 2, 2, '#8a8a92');
    px(ag, 4, 5, 4, 2, '#8a8a92');                     // piston
    Sprites.bossArm = outlined(a);
  })();

  // corner / doorframe posts that cap wall joints
  function post(h) {
    const c = makeCanvas(6, h), g = c.getContext('2d');
    px(g, 0, 2, 6, h - 2, '#4a3a2c');
    px(g, 0, 2, 2, h - 2, '#5c4a38');
    px(g, 0, 0, 6, 2, '#6a5a44');
    return outlined(c);
  }
  Sprites.postS = post(26);
  Sprites.postL = post(34);
})();
