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
    // JUNKYARD ground: cracked concrete slabs, now with laid-slab edges
    const { c, g } = tileBase('#31302e');
    sprinkle(g, 40, ['#3d3b38', '#282624', '#454340', '#2b2927', '#383633']);
    // slab joints on the iso diagonals, with a lit lip like the pavement
    for (let k = 0; k < 8; k++) {
      dpx(g, 16 - k * 2, k, 1, '#232221');
      dpx(g, 16 - k * 2 + 1, k, 1, 'rgba(120,116,110,0.18)');
      dpx(g, 16 + k * 2, k, 1, '#232221');
      dpx(g, k * 2, 8 + k, 1, '#232221');
      dpx(g, 32 - k * 2, 8 + k, 1, '#232221');
    }
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

  // ---- STREET TILES (the city — nothing here comes from the yard) ----
  Sprites.road = []; Sprites.pavement = []; Sprites.verge = []; Sprites.forecourt = [];
  for (let i = 0; i < 6; i++) {
    // road: dark, smooth, polished where the wheels ran
    const { c, g } = tileBase('#33363b');
    sprinkle(g, 26, ['#2c2f33', '#3a3d42', '#303338', '#3e4147']);
    if (rng() < 0.5) { const r = (rng() * TILE_H) | 0; dpx(g, (rng() * 26) | 0, r, 5, '#3d4046'); }
    if (rng() < 0.35) {                              // patched repair
      const r = 3 + ((rng() * 8) | 0);
      dpx(g, 6, r, 14, '#1a1c1f'); dpx(g, 6, r + 1, 14, '#1d1f22');
    }
    if (rng() < 0.3) {                               // oil ghost
      const r = 4 + ((rng() * 7) | 0);
      dpx(g, 10, r, 8, 'rgba(10,10,12,0.5)'); dpx(g, 12, r + 1, 6, 'rgba(10,10,12,0.4)');
    }
    Sprites.road.push(c);
  }
  for (let i = 0; i < 5; i++) {
    // pavement: individual slabs, each with a lit top edge and a shadowed
    // joint — the detail that makes ground read as laid stone, not a fill
    const { c, g } = tileBase('#4a4c4f');
    sprinkle(g, 18, ['#525457', '#434548', '#4e5053']);
    // four slabs per tile, laid on the iso diagonals
    for (const [sx0, sy0] of [[0, 0], [16, 8], [-16, 8], [0, 16]]) {
      for (let k = 0; k < 8; k++) {
        const wdt = 16 - Math.abs(k - 4) * 2;
        dpx(g, sx0 + 8 - wdt / 2, sy0 + k - 4, wdt, k < 2 ? '#585a5d' : '#4c4e51');
      }
    }
    // joints along both diagonals
    for (let k = 0; k < 8; k++) {
      dpx(g, 16 - k * 2, k, 1, '#3a3c3f');
      dpx(g, 16 + k * 2, k, 1, '#3a3c3f');
      dpx(g, k * 2, 8 + k, 1, '#3a3c3f');
      dpx(g, 32 - k * 2, 8 + k, 1, '#3a3c3f');
    }
    if (rng() < 0.5) {                                // weeds in the joint
      const r = 2 + ((rng() * 12) | 0);
      dpx(g, 15 + ((rng() * 3) | 0), r, 1, '#4a5a2a');
      dpx(g, 16 + ((rng() * 3) | 0), r + 1, 1, '#3e4c22');
    }
    if (rng() < 0.35) {                               // a cracked / missing slab
      const r = 3 + ((rng() * 8) | 0);
      dpx(g, 10 + ((rng() * 10) | 0), r, 4, '#37393c');
      dpx(g, 11 + ((rng() * 8) | 0), r + 1, 3, '#404245');
    }
    Sprites.pavement.push(c);
  }
  for (let i = 0; i < 5; i++) {
    // verge: dead grass and gravel
    const { c, g } = tileBase('#3a3f33');
    sprinkle(g, 40, ['#333828', '#434a38', '#2e3329', '#4a5240']);
    for (let k = 0; k < 5; k++) dpx(g, (rng() * 30) | 0, (rng() * 15) | 0, 1, '#55603f');
    Sprites.verge.push(c);
  }
  for (let i = 0; i < 4; i++) {
    // forecourt: poured concrete with expansion joints
    const { c, g } = tileBase('#5a5c5e');
    sprinkle(g, 20, ['#626466', '#525456', '#5e6062']);
    dpx(g, 0, 3, 32, '#4a4c4e');
    dpx(g, 0, 11, 32, '#4a4c4e');
    if (rng() < 0.4) dpx(g, (rng() * 20) | 0, (rng() * 15) | 0, 4, '#4e5052');
    Sprites.forecourt.push(c);
  }

  // road paint, laid as decals
  Sprites.decals = Sprites.decals || {};
  (function () {
    const d = makeCanvas(14, 7), g = d.getContext('2d');
    g.fillStyle = 'rgba(200,196,170,0.55)';
    g.fillRect(0, 3, 12, 2);
    Sprites.decals.dash = d;
    const cb = makeCanvas(20, 10), cg = cb.getContext('2d');
    cg.fillStyle = 'rgba(205,201,175,0.5)';
    for (let i = 0; i < 4; i++) cg.fillRect(i * 5, 2 + i, 3, 5);
    Sprites.decals.crossbar = cb;
    const ar = makeCanvas(14, 14), ag = ar.getContext('2d');
    ag.fillStyle = 'rgba(200,196,170,0.5)';
    ag.fillRect(5, 4, 3, 8);
    ag.beginPath(); ag.moveTo(6.5, 0); ag.lineTo(12, 6); ag.lineTo(1, 6); ag.closePath(); ag.fill();
    Sprites.decals.arrow = ar;
  })();

  // ---- STREET FURNITURE ----
  (function () {
    // streetlight: tall pole, arm, dead lamp
    const c = makeCanvas(16, 44), g = c.getContext('2d');
    px(g, 6, 8, 3, 34, '#4a4e52');
    px(g, 6, 8, 1, 34, '#5c6064');
    px(g, 5, 41, 5, 3, '#3a3e42');
    px(g, 7, 6, 8, 2, '#4a4e52');
    px(g, 12, 7, 4, 3, '#33373b');
    px(g, 13, 9, 2, 1, '#6a5a3a');
    Sprites.streetlight = outlined(c);

    // traffic light
    const t = makeCanvas(12, 40), tg = t.getContext('2d');
    px(tg, 5, 10, 3, 30, '#3e4246');
    px(tg, 4, 38, 5, 2, '#31353a');
    px(tg, 3, 2, 7, 12, '#2a2e32');
    px(tg, 4, 3, 5, 3, '#4a2020');
    px(tg, 4, 6, 5, 3, '#4a4020');
    px(tg, 4, 9, 5, 3, '#204a28');
    Sprites.trafficLight = outlined(t);

    // bus stop shelter
    const b = makeCanvas(34, 26), bg2 = b.getContext('2d');
    px(bg2, 1, 2, 32, 3, '#3e4246');
    px(bg2, 2, 5, 3, 20, '#4a4e52');
    px(bg2, 29, 5, 3, 20, '#4a4e52');
    px(bg2, 5, 6, 24, 14, 'rgba(150,190,210,0.18)');
    for (let i = 0; i < 4; i++) px(bg2, 7 + i * 6, 6, 1, 14, '#4a4e52');
    px(bg2, 8, 12, 12, 6, '#6a5a3a');
    Sprites.busStop = outlined(b);
    // shelters stand ALONG the pavement, so they follow its diagonal
    Sprites.busStopIso = { x: sheared(Sprites.busStop, 1), y: sheared(Sprites.busStop, -1) };

    // dumpster
    const dm = makeCanvas(20, 15), dg = dm.getContext('2d');
    px(dg, 1, 4, 18, 9, '#2f4a38');
    px(dg, 1, 3, 18, 2, '#3b5a44');
    px(dg, 1, 12, 18, 2, '#263c2d');
    px(dg, 3, 5, 2, 7, '#3b5a44');
    px(dg, 2, 13, 3, 2, '#1c1c20');
    px(dg, 15, 13, 3, 2, '#1c1c20');
    Sprites.dumpster = outlined(dm);

    // hydrant
    const h = makeCanvas(8, 12), hg = h.getContext('2d');
    px(hg, 2, 2, 4, 9, '#8a3226');
    px(hg, 2, 1, 4, 2, '#a43e2c');
    px(hg, 0, 4, 8, 2, '#8a3226');
    px(hg, 3, 10, 2, 2, '#5c2418');
    Sprites.hydrant = outlined(h);

    // postbox
    const pb = makeCanvas(10, 16), pg2 = pb.getContext('2d');
    px(pg2, 1, 3, 8, 12, '#7a2a2a');
    px(pg2, 1, 2, 8, 2, '#8f3535');
    px(pg2, 3, 6, 4, 1, '#2a1010');
    px(pg2, 2, 14, 6, 2, '#5c1f1f');
    Sprites.postbox = outlined(pb);

    // road sign on a post (the plate; text is drawn in-world)
    const sg = makeCanvas(26, 26), sgg = sg.getContext('2d');
    px(sgg, 11, 12, 3, 14, '#4a4e52');
    px(sgg, 1, 2, 24, 11, '#2d4a3c');
    px(sgg, 1, 2, 24, 1, '#3d5a4c');
    px(sgg, 2, 3, 22, 9, '#25402f');
    Sprites.signPost = outlined(sg);

    // shopfront awning bar (small dressing over facades)
    const aw = makeCanvas(28, 8), ag2 = aw.getContext('2d');
    for (let i = 0; i < 7; i++) px(ag2, i * 4, 1, 4, 6, i % 2 ? '#6a3a35' : '#8a4a44');
    px(ag2, 0, 6, 28, 2, '#4a2a26');
    Sprites.awning = outlined(aw);

    // city bus (big wreck across a junction)
    const bs = makeCanvas(56, 26), bsg = bs.getContext('2d');
    px(bsg, 2, 6, 52, 15, '#8a6a2a');
    px(bsg, 2, 5, 52, 2, '#a4823a');
    px(bsg, 2, 19, 52, 3, '#6a4f1e');
    for (let i = 0; i < 6; i++) px(bsg, 5 + i * 8, 8, 6, 6, '#16181c');
    px(bsg, 46, 8, 7, 7, '#16181c');
    px(bsg, 6, 21, 6, 4, '#1c1c20');
    px(bsg, 42, 21, 6, 4, '#1c1c20');
    Sprites.bus = outlined(bs);
    Sprites.busIso = { x: sheared(Sprites.bus, 1), y: sheared(Sprites.bus, -1) };

    // fuel pump island
    const fp = makeCanvas(16, 22), fg = fp.getContext('2d');
    px(fg, 1, 16, 14, 5, '#5a5c5e');
    px(fg, 3, 2, 10, 15, '#b8433a');
    px(fg, 3, 2, 10, 2, '#d2564a');
    px(fg, 5, 5, 6, 5, '#1c1e22');
    px(fg, 6, 6, 4, 3, '#7ad27a');
    px(fg, 12, 8, 3, 6, '#3a3c40');
    Sprites.fuelPump = outlined(fp);

    // canopy pillar
    const cp = makeCanvas(10, 40), cpg = cp.getContext('2d');
    px(cpg, 2, 2, 6, 36, '#6e7276');
    px(cpg, 2, 2, 2, 36, '#82868a');
    px(cpg, 1, 36, 8, 4, '#5a5e62');
    Sprites.pillar = outlined(cp);
  })();

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
  Sprites.decals = Sprites.decals || {};
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

  // ---- CAR WRECKS, seen from above like everything else ----
  // Still one flat hand-drawn sprite, still chunky — but it is drawn as a ROOF
  // BAND stacked on a side elevation. Shearing that whole stack is exactly the
  // isometric projection of a box: the roof band becomes the roof parallelogram
  // and the band under it becomes the near flank, both at the road's angle.
  // A pure side elevation had no roof at all, which is why it read as a card
  // tipped over. Everything is integer px() — no antialiased polygon edges.
  function car(body, bodyD, roofC, glassC) {
    const c = makeCanvas(36, 26), g = c.getContext('2d');
    const glass = glassC || '#171b22';

    // ---- the roof, seen from above (rows 0-7) ----
    px(g, 2, 0, 32, 8, roofC);                       // whole upper surface
    px(g, 2, 0, 32, 1, shadeHex(roofC, 1.18));       // sunlit leading edge
    px(g, 2, 7, 32, 1, shadeHex(roofC, 0.78));       // where the roof turns down
    px(g, 3, 1, 7, 6, shadeHex(roofC, 1.06));        // boot lid
    px(g, 26, 1, 7, 6, shadeHex(roofC, 1.1));        // bonnet, catches most light
    px(g, 10, 1, 4, 6, glass);                       // rear screen
    px(g, 22, 1, 5, 6, glass);                       // windscreen
    px(g, 22, 1, 5, 1, shadeHex(glass, 2.1));        // glint off the glass
    px(g, 14, 1, 8, 6, shadeHex(roofC, 1.14));       // roof panel between them
    px(g, 14, 3, 8, 1, shadeHex(roofC, 0.86));       // roof crease

    // ---- the near flank (rows 8-19) ----
    px(g, 2, 8, 32, 12, body);
    px(g, 2, 8, 32, 1, shadeHex(body, 1.22));        // shoulder
    px(g, 10, 8, 17, 5, glass);                      // side windows
    px(g, 18, 8, 2, 5, bodyD);                       // B-pillar
    px(g, 2, 13, 32, 1, bodyD);                      // swage line
    px(g, 18, 13, 1, 7, bodyD);                      // door shut
    px(g, 2, 18, 32, 2, shadeHex(body, 0.5));        // sill, in its own shadow

    // ---- arches and wheels (rows 16-23) ----
    px(g, 5, 16, 8, 4, '#101216');
    px(g, 23, 16, 8, 4, '#101216');
    px(g, 6, 18, 6, 5, '#191c21');
    px(g, 24, 18, 6, 5, '#191c21');
    px(g, 7, 19, 4, 3, '#3d4249');                   // rims
    px(g, 25, 19, 4, 3, '#3d4249');

    // ---- it has been sat here a long time ----
    px(g, 4, 10, 5, 3, RUST_D);
    px(g, 28, 14, 5, 3, RUST_D);
    px(g, 6, 2, 4, 2, RUST);
    px(g, 30, 4, 3, 2, RUST_D);
    return outlined(c);
  }
  function shadeHex(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const cl = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return '#' + [cl(n >> 16), cl((n >> 8) & 255), cl(n & 255)]
      .map(v => v.toString(16).padStart(2, '0')).join('');
  }
  Sprites.cars = [
    car('#6e3b24', '#4c2a1a', '#7d452b'),
    car('#3f5468', '#2c3b4a', '#4a6377'),
    car('#5a5f52', '#40443b', '#686e5f'),
    car('#7a7468', '#565247', '#8a8377'),
  ];

  // ---- the same wrecks, drawn AT the isometric viewpoint ----
  // Shearing a side elevation can only slope a sprite one way, so its roof
  // stays a rectangle and the whole thing reads as a slab stood on edge. A real
  // iso roof is a rhombus, and that has to be built from the footprint. So:
  // a full-length lower body with a shorter, narrower cabin sat on top of it.
  // Flat colours and integer scanlines only — no gradients, no soft edges.
  function isoFill(g, pts, col) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.round(y0); y < Math.round(y1); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
        }
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p - q);
      const xa = Math.round(xs[0]), xb = Math.round(xs[xs.length - 1]);
      if (xb > xa) { g.fillStyle = col; g.fillRect(xa, y, xb - xa, 1); }
    }
  }
  function carIso(along, body, bodyD, roofC) {
    const L = 2.25, W = 1.0, BH = 11, CH = 9;      // length · width · body · cabin
    const lx = along === 'x' ? L : W, ly = along === 'x' ? W : L;
    const OX = Math.ceil(ly * 16) + 2, OY = BH + CH + 2;
    const c = makeCanvas(Math.ceil((lx + ly) * 16) + 4,
                         Math.ceil((lx + ly) * 8) + BH + CH + 5);
    const g = c.getContext('2d');
    const P = (t, v, h) => {
      const a = t * L, b = v * W;
      const wx = along === 'x' ? a : b, wy = along === 'x' ? b : a;
      return [(wx - wy) * 16 + OX, (wx + wy) * 8 - h + OY];
    };
    const box = (t0, t1, v0, v1, h0, h1, top, side, end) => {
      isoFill(g, [P(t0, v0, h1), P(t1, v0, h1), P(t1, v1, h1), P(t0, v1, h1)], top);
      isoFill(g, [P(t0, v1, h1), P(t1, v1, h1), P(t1, v1, h0), P(t0, v1, h0)], side);  // near flank
      isoFill(g, [P(t1, v0, h1), P(t1, v1, h1), P(t1, v1, h0), P(t1, v0, h0)], end);   // nose
    };
    const glass = '#181d25';
    // lower body, full footprint
    box(0, 1, 0, 1, 2, BH, roofC, body, bodyD);
    // cabin, shorter and narrower, sat on the body — this is the car in it
    box(0.24, 0.74, 0.12, 0.88, BH, BH + CH, shadeHex(roofC, 1.12), glass, glass);
    // windscreen and rear screen read as the sloped ends of the cabin
    isoFill(g, [P(0.74, 0.12, BH + CH), P(0.74, 0.88, BH + CH),
                P(0.74, 0.88, BH), P(0.74, 0.12, BH)], shadeHex(glass, 1.9));
    // waist line where the cabin meets the body, and the sill in shadow
    isoFill(g, [P(0, 1, BH), P(1, 1, BH), P(1, 1, BH - 1.6), P(0, 1, BH - 1.6)], shadeHex(body, 1.3));
    isoFill(g, [P(0, 1, 3.4), P(1, 1, 3.4), P(1, 1, 2), P(0, 1, 2)], shadeHex(body, 0.5));
    // wheels, tucked under the near flank
    for (const [t0, t1] of [[0.1, 0.28], [0.72, 0.9]]) {
      isoFill(g, [P(t0, 1.02, 6), P(t1, 1.02, 6), P(t1, 1.02, 0), P(t0, 1.02, 0)], '#15181d');
      isoFill(g, [P(t0 + 0.04, 1.03, 4.4), P(t1 - 0.04, 1.03, 4.4),
                  P(t1 - 0.04, 1.03, 1.6), P(t0 + 0.04, 1.03, 1.6)], '#3f444b');
    }
    // headlamps on the nose
    for (const [v0, v1] of [[0.08, 0.28], [0.72, 0.92]]) {
      isoFill(g, [P(1, v0, 8.5), P(1, v1, 8.5), P(1, v1, 6.2), P(1, v0, 6.2)], '#8c949c');
    }
    // rust, so no two are the same
    isoFill(g, [P(0.34, 1, 9), P(0.5, 1, 9), P(0.5, 1, 5), P(0.34, 1, 5)], RUST_D);
    const out = outlined(c);
    out.oy = -(OY + 1);
    return out;
  }
  const CAR_COLS = [
    ['#6e3b24', '#4c2a1a', '#8a4d30'],
    ['#3f5468', '#2c3b4a', '#526b83'],
    ['#5a5f52', '#40443b', '#727861'],
    ['#7a7468', '#565247', '#948d7e'],
  ];
  Sprites.carsIso = {
    x: CAR_COLS.map(p => carIso('x', p[0], p[1], p[2])),
    y: CAR_COLS.map(p => carIso('y', p[0], p[1], p[2])),
  };

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
    } else if (kind === 'W') {                // shack wall (28 tall)
      const y = H - 28;
      px(g, ox, y + 3, 16, 23, '#3e3831');
      for (let i = 0; i < 4; i++) px(g, ox + 1 + i * 4, y + 3, 2, 23, '#48423a');
      px(g, ox, y + 3, 16, 2, '#565048');
      px(g, ox, y + 24, 16, 2, '#2c2822');
      px(g, ox + 11, y + 7, 4, 4, RUST_D);
      px(g, ox + 3, y + 16, 3, 5, RUST);
    } else if (kind === 'B') {                // CITY: brick building wall (44)
      const y = H - 44;
      px(g, ox, y, 16, 44, '#4a3a35');
      for (let r = 0; r < 11; r++) {
        const off = (r % 2) * 4;
        for (let b = 0; b < 2; b++) px(g, ox + off + b * 8, y + r * 4, 7, 3, r % 3 ? '#54423c' : '#4e3d37');
      }
      px(g, ox, y, 16, 2, '#63504a');          // cap
      px(g, ox, y + 42, 16, 2, '#332824');     // base shadow
      if (ox % 32 === 0) { px(g, ox + 5, y + 12, 6, 9, '#191c20'); px(g, ox + 5, y + 12, 6, 1, '#2a2e33'); }  // window
    } else if (kind === 'S') {                // CITY: shopfront (44)
      const y = H - 44;
      px(g, ox, y, 16, 44, '#4f4a44');
      px(g, ox, y, 16, 3, '#635d55');
      px(g, ox, y + 5, 16, 8, '#2a2620');      // sign band
      px(g, ox + 2, y + 7, 12, 4, '#6a6154');
      px(g, ox + 1, y + 16, 14, 20, '#171b1f');  // glass
      px(g, ox + 1, y + 16, 14, 1, '#39424a');
      px(g, ox + 2, y + 18, 5, 8, 'rgba(150,190,210,0.10)');
      if ((ox / 16) % 3 === 1) {               // some are smashed
        px(g, ox + 4, y + 22, 8, 3, '#0d1013');
        px(g, ox + 7, y + 26, 5, 6, '#0d1013');
      }
      px(g, ox, y + 38, 16, 6, '#3e3a34');
    } else if (kind === 'H') {                // CITY: house — render + window + sill
      const y = H - 44;
      px(g, ox, y, 16, 44, '#6a6055');
      px(g, ox, y, 16, 3, '#7d7266');
      px(g, ox, y + 41, 16, 3, '#4c453d');
      px(g, ox + 3, y + 12, 10, 11, '#20242a');      // window
      px(g, ox + 3, y + 12, 10, 1, '#39424a');
      px(g, ox + 7, y + 12, 2, 11, '#5c554c');       // mullion
      px(g, ox + 2, y + 23, 12, 2, '#82776a');       // sill
      px(g, ox + 4, y + 28, 8, 8, '#5e564c');        // lower panel
    } else if (kind === 'K') {                // CITY: school — pale brick, tall windows
      const y = H - 44;
      px(g, ox, y, 16, 44, '#8a7c66');
      for (let r = 0; r < 11; r++) px(g, ox, y + r * 4, 16, 1, '#7d7059');
      px(g, ox, y, 16, 4, '#9c8d74');                 // parapet
      px(g, ox, y + 8, 16, 2, '#6e6252');             // band course
      px(g, ox + 2, y + 13, 5, 18, '#1b2026');        // tall paired windows
      px(g, ox + 9, y + 13, 5, 18, '#1b2026');
      px(g, ox + 2, y + 13, 5, 1, '#3d4650');
      px(g, ox + 9, y + 13, 5, 1, '#3d4650');
      px(g, ox + 1, y + 31, 14, 2, '#6e6252');
    } else if (kind === 'R') {                // CITY: church — stone + arched window
      const y = H - 44;
      px(g, ox, y, 16, 44, '#7a7468');
      for (let r = 0; r < 7; r++) {
        const off = (r % 2) * 5;
        for (let b = 0; b < 2; b++) px(g, ox + off + b * 9, y + 4 + r * 6, 8, 5, r % 2 ? '#847d70' : '#726c60');
      }
      px(g, ox, y, 16, 4, '#8d8578');
      px(g, ox + 5, y + 14, 6, 16, '#181d24');        // arched window
      px(g, ox + 6, y + 11, 4, 4, '#181d24');
      px(g, ox + 7, y + 10, 2, 2, '#181d24');
      px(g, ox + 7, y + 17, 2, 9, '#3f2f4a');         // stained glass mullion
      px(g, ox + 5, y + 21, 6, 1, '#4a3a2a');
    } else if (kind === 'O') {                // CITY: office — concrete + window band
      const y = H - 44;
      px(g, ox, y, 16, 44, '#5e6266');
      px(g, ox, y, 16, 3, '#70747a');
      for (let b = 0; b < 3; b++) {
        px(g, ox, y + 8 + b * 12, 16, 7, '#191d22');
        px(g, ox, y + 8 + b * 12, 16, 1, '#39424a');
        px(g, ox + 5, y + 8 + b * 12, 1, 7, '#4a4e52');
        px(g, ox + 11, y + 8 + b * 12, 1, 7, '#4a4e52');
      }
      px(g, ox, y + 42, 16, 2, '#42464a');
    } else if (kind === 'T') {                // CITY: hotel — balconies + canopy
      const y = H - 44;
      px(g, ox, y, 16, 44, '#5c4e4a');
      px(g, ox, y, 16, 3, '#71615c');
      for (let b = 0; b < 3; b++) {
        const by = y + 7 + b * 11;
        px(g, ox + 2, by, 12, 6, '#1c2026');      // window
        px(g, ox + 2, by, 12, 1, '#3d4650');
        px(g, ox, by + 6, 16, 2, '#6e5f59');      // balcony slab
        for (let i = 0; i < 5; i++) px(g, ox + 1 + i * 3, by + 4, 1, 2, '#8a7a72');
      }
      px(g, ox, y + 40, 16, 4, '#4a3f3b');
    } else if (kind === 'N') {                // CITY: bank — stone + pilasters
      const y = H - 44;
      px(g, ox, y, 16, 44, '#8d8878');
      px(g, ox, y, 16, 5, '#9d9887');           // cornice
      px(g, ox, y + 5, 16, 2, '#7a7566');
      px(g, ox + 1, y + 9, 4, 26, '#9a9584');   // pilasters
      px(g, ox + 11, y + 9, 4, 26, '#9a9584');
      px(g, ox + 6, y + 12, 4, 20, '#1b1f24');  // deep window
      px(g, ox + 6, y + 12, 4, 1, '#3d4650');
      px(g, ox, y + 35, 16, 3, '#7a7566');      // plinth band
      px(g, ox, y + 38, 16, 6, '#6e6a5d');
    } else if (kind === 'G') {                // CITY: roller shutter (44)
      const y = H - 44;
      px(g, ox, y, 16, 44, '#4a4c50');
      px(g, ox, y, 16, 3, '#5c5e62');
      for (let r = 0; r < 9; r++) px(g, ox, y + 8 + r * 4, 16, 2, '#3c3e42');
      px(g, ox + 3, y + 20, 4, 5, '#6a3a2a');  // rust bloom
      px(g, ox, y + 41, 16, 3, '#2e3034');
    }
  };

  // build a continuous wall run and slice it into per-tile drawables.
  // trimStart/trimEnd cut HALF a tile where the run meets a perpendicular
  // wall, so both faces stop exactly at the corner point instead of
  // overshooting past it (the overshoot was the "protruding" corner bug).
  // identical runs are extremely common in a city — slice each shape once
  const wallRunCache = new Map();
  Sprites.makeWallRun = function (kinds, axis, trimStart, trimEnd) {
    const ck = kinds.join('') + '|' + axis + '|' + (trimStart ? 1 : 0) + (trimEnd ? 1 : 0);
    const hit = wallRunCache.get(ck);
    if (hit) return hit;
    const res = Sprites._makeWallRun(kinds, axis, trimStart, trimEnd);
    if (wallRunCache.size < 600) wallRunCache.set(ck, res);
    return res;
  };
  Sprites._makeWallRun = function (kinds, axis, trimStart, trimEnd) {
    const n = kinds.length;
    const isWall = kinds[0] === 'W';
    const isCity = 'BSGHKROTN'.includes(kinds[0]);
    const H = isCity ? 44 : (isWall ? 28 : 20);
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
      slices.push({ img, dx, dy: -off, lift: isCity ? 46 : (isWall ? 30 : 24) });
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

  // ---- THE YARD GATE: two braced steel doors in the south wall ----
  (function () {
    const c = makeCanvas(54, 30), g = c.getContext('2d');
    px(g, 0, 2, 54, 4, '#4e463e');                     // header beam
    px(g, 0, 2, 54, 1, '#5e564c');
    for (const ox of [1, 28]) {                        // two door panels
      px(g, ox, 6, 25, 21, '#3c3c44');
      px(g, ox, 6, 25, 2, '#4c4c54');
      for (let i = 0; i < 5; i++) px(g, ox + 2 + i * 5, 8, 2, 16, '#46464e');  // ribs
      for (let i = 0; i < 5; i++) px(g, ox + i * 5, 24, 3, 3, i % 2 ? '#a8873a' : '#26262c'); // hazard stripe
      px(g, ox + 11, 15, 3, 3, '#2a2a30');             // handle plate
    }
    px(g, 26, 6, 2, 21, '#22222a');                    // center seam
    px(g, 25, 14, 4, 5, '#5c5c66');                    // the LOCK
    px(g, 26, 16, 2, 2, '#1a1a20');                    // keyhole
    Sprites.gateClosed = { a: sheared(outlined(c), 1), b: sheared(outlined(c), -1) };

    const o = makeCanvas(54, 30), og = o.getContext('2d');
    px(og, 0, 2, 54, 4, '#4e463e');                    // header beam stays
    px(og, 0, 2, 54, 1, '#5e564c');
    // the passage: solid dark backdrop so nothing shows through the opening
    px(og, 10, 5, 34, 22, '#0c0a09');
    px(og, 12, 7, 30, 3, '#151312');                   // depth banding
    px(og, 13, 10, 28, 4, '#100e0d');
    px(og, 14, 19, 26, 8, '#171b16');                  // road dust catching light
    px(og, 18, 22, 18, 3, '#1e2119');
    for (let i = 0; i < 7; i++) px(og, 15 + i * 4, 24 + (i % 2), 2, 2, '#242a1e');
    px(og, 24, 12, 6, 7, '#0a0d0a');                   // a far silhouette
    px(og, 2, 6, 8, 21, '#3c3c44');                    // doors swung aside
    px(og, 44, 6, 8, 21, '#3c3c44');
    px(og, 2, 6, 8, 2, '#4c4c54');
    px(og, 44, 6, 8, 2, '#4c4c54');
    px(og, 3, 8, 2, 16, '#46464e');
    px(og, 45, 8, 2, 16, '#46464e');
    px(og, 3, 24, 6, 3, '#a8873a');                    // hazard flash on the leaves
    px(og, 45, 24, 6, 3, '#a8873a');
    Sprites.gateOpen = { a: sheared(outlined(o), 1), b: sheared(outlined(o), -1) };
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

  // =====================================================================
  // BUILDINGS AS SOLID VOLUMES
  // A building is not four wall cards with a lid — it's one box, drawn once
  // into a single sprite: the two camera-facing faces plus the roof, sharing
  // real corners. Nothing can misalign because nothing is assembled at
  // runtime, and each building becomes ONE prop with ONE depth.
  // =====================================================================
  const BUILD_STYLE = {
    // wall / wallShade / trim / roof / roofEdge / glass  + height + pitched
    H: { w: '#6f6459', s: '#5b5147', t: '#83776a', r: '#6b4038', re: '#4a2b26', g: '#20242a', h: 46, pitch: true },
    B: { w: '#5a453f', s: '#48352f', t: '#6d564e', r: '#3e4247', re: '#2b2f33', g: '#1d2126', h: 48 },
    S: { w: '#565049', t: '#6a6357', s: '#443f39', r: '#414549', re: '#2c3033', g: '#171b1f', h: 44 },
    G: { w: '#4e5054', s: '#3e4044', t: '#5f6165', r: '#3b3f43', re: '#2a2e32', g: '#22262a', h: 44 },
    O: { w: '#64686c', s: '#4f5357', t: '#767a7e', r: '#44484c', re: '#303438', g: '#191d22', h: 64 },
    K: { w: '#8a7c66', s: '#6f6353', t: '#9c8d74', r: '#5e5a4c', re: '#43402f', g: '#1b2026', h: 52 },
    R: { w: '#7f796d', s: '#666158', t: '#918a7c', r: '#41485a', re: '#2c313d', g: '#2a2036', h: 58, pitch: true },
    T: { w: '#61534e', s: '#4d4340', t: '#75655f', r: '#463e3a', re: '#2f2a27', g: '#1c2026', h: 78 },
    N: { w: '#8d8878', s: '#726d60', t: '#a29c8a', r: '#5c584c', re: '#403d34', g: '#1b1f24', h: 58 },
  };

  function poly(g, pts, fill, stroke) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  }
  // a rectangle in "face space": u runs along the wall, v runs up it
  function faceQuad(P0, P1, Hh, u0, u1, v0, v1) {
    const p = (u, v) => [P0[0] + (P1[0] - P0[0]) * u, P0[1] + (P1[1] - P0[1]) * u - Hh * v];
    return [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)];
  }

  const buildingCache = new Map();
  // returns { img, ax, ay } — ax/ay is where the building's NORTH tile corner
  // sits inside the image
  Sprites.makeBuilding = function (w, h, kind, seed) {
    if (kind === 'C') return Sprites.makeCathedral(w, h, seed);
    const key = w + 'x' + h + kind + (seed % 4);
    const hit = buildingCache.get(key);
    if (hit) return hit;
    const st = BUILD_STYLE[kind] || BUILD_STYLE.B;
    const Hh = st.h;
    const ridge = st.pitch ? (kind === 'R' ? 20 : 13) : 0;
    const cw = (w + h) * 16, ch = (w + h) * 8 + Hh + ridge + 4;
    const c = makeCanvas(cw, ch), g = c.getContext('2d');
    const ax = h * 16, ay = Hh + ridge;
    // ground-level corners: A north, B east, C south, D west
    const A = [ax, ay], B = [ax + w * 16, ay + w * 8];
    const C = [w * 16, ay + (w + h) * 8], D = [0, ay + h * 8];
    const up = p => [p[0], p[1] - Hh];
    const A2 = up(A), B2 = up(B), C2 = up(C), D2 = up(D);

    // ---- the two faces the camera can see ----
    poly(g, [B, C, C2, B2], st.w, '#1b1e22');          // east face (lit side)
    poly(g, [C, D, D2, C2], st.s, '#1b1e22');          // south face (shaded)

    // ---- openings, laid out along each face ----
    const rows = Math.max(1, Math.floor(Hh / 15));
    // Small detail on a wall is filled with INTEGER SCANLINES, never an
    // antialiased path. A window is ~5 pixels across; a soft edge on something
    // that size does not read as a soft edge, it reads as a scuffed wall.
    const hard = (P0, P1, u0, u1, v0, v1, col) =>
      isoFill(g, faceQuad(P0, P1, Hh, u0, u1, v0, v1), col);

    const winRow = (P0, P1, cells, glass, isSouth) => {
      for (let r = 0; r < rows; r++) {
        const v0 = 0.16 + r * (0.74 / rows), v1 = v0 + 0.44 / rows;
        for (let i = 0; i < cells; i++) {
          const u0 = (i + 0.22) / cells, u1 = (i + 0.78) / cells;
          if (kind === 'S' && r === rows - 1) continue;             // shop sign band
          hard(P0, P1, u0, u1, v0, v1, glass);
          // a highlight streak down the light side of the pane
          hard(P0, P1, u0, u0 + (u1 - u0) * 0.3, v0, v1, shadeHex(glass, 1.5));
        }
      }
      // ground floor: shopfront glazing (in panes) or a shutter
      if (kind === 'S') {
        const panes = Math.max(2, cells);
        for (let i = 0; i < panes; i++) {
          const u0 = 0.06 + (i + 0.06) * (0.88 / panes), u1 = 0.06 + (i + 0.94) * (0.88 / panes);
          hard(P0, P1, u0, u1, 0.06, 0.30, glass);
          hard(P0, P1, u0, u0 + (u1 - u0) * 0.35, 0.06, 0.30, shadeHex(glass, 1.55));
        }
        hard(P0, P1, 0.04, 0.96, 0.30, 0.335, st.t);      // fascia rail
        hard(P0, P1, 0.04, 0.96, 0.03, 0.06, st.s);       // stallriser
      } else if (kind === 'G') {
        hard(P0, P1, 0.08, 0.92, 0.04, 0.30, st.s);
        for (let i = 0; i < 6; i++)
          hard(P0, P1, 0.08, 0.92, 0.05 + i * 0.042, 0.058 + i * 0.042, st.w);
      } else if (isSouth) {
        hard(P0, P1, 0.44, 0.58, 0.02, 0.24, '#2e2620');
        hard(P0, P1, 0.44, 0.58, 0.23, 0.26, st.t);   // lintel
      }
    };
    const cellsE = Math.max(1, Math.round(h * 0.7)), cellsS = Math.max(1, Math.round(w * 0.7));
    winRow(B, C, cellsE, st.g, false);
    winRow(C, D, cellsS, st.g, true);

    // per-type face detail
    if (kind === 'S') {                                   // painted shop name band
      for (const [P0, P1] of [[C, D], [B, C]]) {
        hard(P0, P1, 0.05, 0.95, 0.74, 0.88, '#6d6355');
        for (let i = 0; i < 5; i++)                        // faded lettering
          hard(P0, P1, 0.14 + i * 0.13, 0.20 + i * 0.13, 0.78, 0.845, '#3f3a31');
      }
    } else if (kind === 'N') {                            // bank pilasters
      for (let i = 0; i <= 4; i++) {
        poly(g, faceQuad(C, D, Hh, i / 4 - 0.03, i / 4 + 0.03, 0.05, 0.82), st.t);
      }
      poly(g, faceQuad(C, D, Hh, 0.05, 0.95, 0.84, 0.94), st.t, '#12151a');
    } else if (kind === 'T') {                            // hotel balcony bands
      for (let r = 1; r < rows; r++) {
        const v = 0.12 + r * (0.74 / rows);
        poly(g, faceQuad(C, D, Hh, 0.03, 0.97, v, v + 0.03), st.t);
        poly(g, faceQuad(B, C, Hh, 0.03, 0.97, v, v + 0.03), st.t);
      }
    } else if (kind === 'K') {                            // school band course
      poly(g, faceQuad(C, D, Hh, 0.02, 0.98, 0.30, 0.35), st.t);
      poly(g, faceQuad(B, C, Hh, 0.02, 0.98, 0.30, 0.35), st.t);
    }

    // ---- the roof, sharing the exact same corners ----
    if (st.pitch) {
      const along = w >= h;
      const mA = along ? [(A2[0] + D2[0]) / 2, (A2[1] + D2[1]) / 2] : [(A2[0] + B2[0]) / 2, (A2[1] + B2[1]) / 2];
      const mB = along ? [(B2[0] + C2[0]) / 2, (B2[1] + C2[1]) / 2] : [(D2[0] + C2[0]) / 2, (D2[1] + C2[1]) / 2];
      const rA = [mA[0], mA[1] - ridge], rB = [mB[0], mB[1] - ridge];
      // GABLE: fill the triangle between the wall top and the sloping roof,
      // or a hole opens up at the end of the ridge
      if (along) {
        poly(g, [B2, C2, rB], st.w, '#1b1e22');          // visible gable (east end)
        poly(g, [A2, D2, rA], st.s);                      // far gable, mostly hidden
      } else {
        poly(g, [D2, C2, rB], st.s, '#1b1e22');           // visible gable (south end)
        poly(g, [A2, B2, rA], st.w);
      }
      // SHINGLES: each slope is tiled in overlapping rows, drawn in the
      // slope's own space so they follow the pitch instead of the screen
      const shingle = (P0, P1, P2, P3, base, edge) => {
        poly(g, [P0, P1, P2, P3], base, '#20242a');
        const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const ROWS = 7;
        for (let r = 0; r < ROWS; r++) {
          const t0 = r / ROWS, t1 = (r + 1) / ROWS;
          const eA = lerp(P0, P3, t0), eB = lerp(P1, P2, t0);
          const fA = lerp(P0, P3, t1), fB = lerp(P1, P2, t1);
          // the row's own shadow line, then a lit lip on its lower edge
          poly(g, [eA, eB, lerp(eA, fA, 0.22), lerp(eB, fB, 0.22)].map((p, i) => i < 2 ? p : p), 'rgba(0,0,0,0.16)');
          const cols = 9;
          for (let c2 = 0; c2 <= cols; c2++) {
            const u = (c2 + (r % 2) * 0.5) / cols;
            if (u > 0.99) continue;
            const a = lerp(eA, eB, u), b2 = lerp(fA, fB, u);
            g.strokeStyle = 'rgba(0,0,0,0.20)';
            g.lineWidth = 1;
            g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.stroke();
          }
          poly(g, [lerp(eA, fA, 0.86), lerp(eB, fB, 0.86), fB, fA], edge);
        }
      };
      if (along) {
        shingle(A2, B2, rB, rA, st.r, 'rgba(255,235,200,0.10)');
        shingle(D2, C2, rB, rA, st.re, 'rgba(255,235,200,0.05)');
      } else {
        shingle(A2, rA, rB, D2, st.r, 'rgba(255,235,200,0.10)');
        shingle(B2, rA, rB, C2, st.re, 'rgba(255,235,200,0.05)');
      }
      // ridge cap
      g.strokeStyle = st.t; g.lineWidth = 2;
      g.beginPath(); g.moveTo(rA[0], rA[1] - 1); g.lineTo(rB[0], rB[1] - 1); g.stroke();
      g.strokeStyle = '#191d22'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(rA[0], rA[1]); g.lineTo(rB[0], rB[1]); g.stroke();
      if (kind === 'R') {                                  // ridge cross
        const mx = (rA[0] + rB[0]) / 2, my = (rA[1] + rB[1]) / 2;
        g.fillStyle = '#9a9284';
        g.fillRect(mx - 1, my - 14, 2, 14);
        g.fillRect(mx - 4, my - 11, 8, 2);
      } else {
        // roof clutter, varying per building
        const at = f => [rA[0] + (rB[0] - rA[0]) * f, rA[1] + (rB[1] - rA[1]) * f];
        if (seed % 3 === 0) {                              // chimney
          const [cx2, cy2] = at(0.28);
          g.fillStyle = '#4a3a35'; g.fillRect(cx2 - 2, cy2 - 11, 5, 12);
          g.fillStyle = '#5f4c46'; g.fillRect(cx2 - 2, cy2 - 12, 5, 2);
        }
        if (seed % 5 === 1) {                              // TV aerial
          const [cx2, cy2] = at(0.68);
          g.strokeStyle = '#3a3f45'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(cx2, cy2); g.lineTo(cx2, cy2 - 14); g.stroke();
          for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.moveTo(cx2 - 4, cy2 - 6 - i * 2.5); g.lineTo(cx2 + 4, cy2 - 6 - i * 2.5);
            g.stroke();
          }
        } else if (seed % 5 === 3) {                        // satellite dish
          const [cx2, cy2] = at(0.72);
          g.strokeStyle = '#3a3f45'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(cx2, cy2); g.lineTo(cx2, cy2 - 7); g.stroke();
          g.fillStyle = '#9aa0a6';
          g.beginPath(); g.ellipse(cx2 + 2, cy2 - 9, 4, 3, -0.5, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#5a6066';
          g.fillRect(cx2 + 1, cy2 - 10, 1, 3);
        }
      }
    } else {
      // A FLAT ROOF IS A WELL, NOT A LID. The parapet stands up around the
      // edge and the deck is set down INSIDE it. The old code drew the coping
      // as a full-size diamond over the finished deck, which repainted the
      // whole thing in one flat colour and wiped out every bit of detail — that
      // was the huge grey square on the skyline.
      const L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const PH = 5, tI = 0.3;                    // parapet height · deck inset
      const rise = (p) => [p[0], p[1] - PH];
      const A3 = rise(A2), B3 = rise(B2), C3 = rise(C2), D3 = rise(D2);
      // deck corners, drawn in from the wall line
      const dA = [A2[0], A2[1] + 16 * tI], dB = [B2[0] - 32 * tI, B2[1]];
      const dC = [C2[0], C2[1] - 16 * tI], dD = [D2[0] + 32 * tI, D2[1]];
      // coping corners: the parapet top, inset the same amount
      const iA = rise(dA), iB = rise(dB), iC = rise(dC), iD = rise(dD);
      // outer faces of the far parapet, standing above the wall head
      poly(g, [A2, B2, B3, A3], st.re);
      poly(g, [D2, A2, A3, D3], st.re);
      // and their inner faces — you are looking down into the well
      poly(g, [dA, dB, iB, iA], '#1d2126');
      poly(g, [dD, dA, iA, iD], '#252a30');
      poly(g, [dA, dB, dC, dD], st.r, '#20242a');       // the deck itself
      // roof-space point: (u along w, v along h), across the DECK
      const R = (u, v) => [dA[0] + (dB[0] - dA[0]) * u + (dD[0] - dA[0]) * v,
                           dA[1] + (dB[1] - dA[1]) * u + (dD[1] - dA[1]) * v];
      const rrng = mulberry32(seed * 2654435761 + w * 97 + h * 31);
      // felt runs down the roof: sheets laid side by side, each with a lap
      const sheets = Math.max(5, Math.round(w * 1.5));
      for (let i = 1; i < sheets; i++) {
        const a = R(i / sheets, 0), b2 = R(i / sheets, 1);
        g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.stroke();
        const a2 = R(i / sheets + 0.004, 0), b3 = R(i / sheets + 0.004, 1);
        g.strokeStyle = 'rgba(255,240,215,0.07)';
        g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b3[0], b3[1]); g.stroke();
      }
      const laps = Math.max(4, Math.round(h * 1.2));
      for (let i = 1; i < laps; i++) {
        const a = R(0, i / laps), b2 = R(1, i / laps);
        g.strokeStyle = 'rgba(255,240,215,0.055)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.stroke();
      }
      // patch repairs — squares of newer felt tarred over the old
      const patches = Math.max(4, Math.round(w * h / 6));
      for (let i = 0; i < patches; i++) {
        const u = 0.05 + rrng() * 0.8, v = 0.05 + rrng() * 0.8;
        const uw = 0.06 + rrng() * 0.16, vh = 0.08 + rrng() * 0.2;
        poly(g, [R(u, v), R(u + uw, v), R(u + uw, v + vh), R(u, v + vh)],
             rrng() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,240,215,0.05)');
      }
      // ballast: chips of grit thrown across the deck
      const grit = Math.round(w * h * 26);
      for (let i = 0; i < grit; i++) {
        const p = R(rrng(), rrng());
        g.fillStyle = rrng() < 0.5 ? 'rgba(255,240,215,0.10)' : 'rgba(0,0,0,0.16)';
        g.fillRect(p[0] | 0, p[1] | 0, 1, 1);
      }
      // standing water where the fall has failed, with a bright rim
      const pools = 1 + ((rrng() * (w * h > 90 ? 3 : 1)) | 0);
      for (let i = 0; i < pools; i++) {
        const u = 0.15 + rrng() * 0.6, v = 0.15 + rrng() * 0.6;
        const uw = 0.1 + rrng() * 0.18, vh = 0.12 + rrng() * 0.2;
        poly(g, [R(u, v + vh / 2), R(u + uw / 2, v), R(u + uw, v + vh / 2), R(u + uw / 2, v + vh)],
             'rgba(96,116,138,0.30)');
        poly(g, [R(u + 0.02, v + vh / 2), R(u + uw / 2, v + 0.02),
                 R(u + uw / 2, v + vh / 2)], 'rgba(150,175,200,0.20)');
      }
      // The parapet stands above the deck, so it throws a shadow INWARDS along
      // the two far sides. This band is what tells the eye the roof is a well
      // with walls round it rather than a rectangle painted on the sky.
      const inset = (a, b2, d) => {
        const cx3 = (A2[0] + C2[0]) / 2, cy3 = (A2[1] + C2[1]) / 2;
        return [[a[0] + (cx3 - a[0]) * d, a[1] + (cy3 - a[1]) * d],
                [b2[0] + (cx3 - b2[0]) * d, b2[1] + (cy3 - b2[1]) * d]];
      };
      for (const [e0, e1] of [[A2, B2], [D2, A2]]) {
        const [i0, i1] = inset(e0, e1, 0.1);
        poly(g, [e0, e1, i1, i0], 'rgba(0,0,0,0.30)');
        const [j0, j1] = inset(e0, e1, 0.045);
        poly(g, [e0, e1, j1, j0], 'rgba(0,0,0,0.22)');
      }
      // and a faint bounce along the near sides, where the light gets in
      for (const [e0, e1] of [[B2, C2], [C2, D2]]) {
        const [i0, i1] = inset(e0, e1, 0.05);
        poly(g, [e0, e1, i1, i0], 'rgba(255,240,215,0.06)');
      }
      // parapet: an outer wall with a lit coping, so the roof sits INSIDE it
      poly(g, [A2, B2, [B2[0], B2[1] - 3], [A2[0], A2[1] - 3]], st.re);
      poly(g, [B2, C2, [C2[0], C2[1] - 3], [B2[0], B2[1] - 3]], st.s);
      poly(g, [C2, D2, [D2[0], D2[1] - 3], [C2[0], C2[1] - 3]], st.s);
      poly(g, [[A2[0], A2[1] - 3], [B2[0], B2[1] - 3], [C2[0], C2[1] - 3], [D2[0], D2[1] - 3]], st.r, '#20242a');
      g.strokeStyle = 'rgba(255,240,215,0.16)'; g.lineWidth = 1;
      g.beginPath();
      g.moveTo(D2[0], D2[1] - 3); g.lineTo(C2[0], C2[1] - 3); g.lineTo(B2[0], B2[1] - 3);
      g.stroke();
      const mx = (A2[0] + C2[0]) / 2, my = (A2[1] + C2[1]) / 2 - 3;
      const acUnit = (ux, uy) => {
        g.fillStyle = '#5a5e62'; g.fillRect(ux, uy - 7, 10, 7);
        g.fillStyle = '#6c7074'; g.fillRect(ux, uy - 8, 10, 2);
        g.fillStyle = '#42464a';
        for (let i = 0; i < 3; i++) g.fillRect(ux + 2 + i * 3, uy - 5, 1, 4);
      };
      if (kind === 'O' || kind === 'T' || kind === 'N') {
        acUnit(mx - 9, my);
        g.fillStyle = '#4a4e52'; g.fillRect(mx + 4, my - 4, 7, 5);       // stair box
      } else if (kind === 'K') {
        g.fillStyle = '#9aa2a8';
        for (let i = -1; i <= 1; i++) g.fillRect(mx + i * 10 - 3, my - 4, 7, 4);
        g.fillStyle = '#5a5e62'; g.fillRect(mx - 16, my - 9, 7, 8);       // water tank
      } else {
        g.fillStyle = '#4e5256'; g.fillRect(mx - 4, my - 6, 7, 5);
      }
      // flat-roof clutter varies per building
      if (seed % 4 === 0) acUnit(mx + 6, my + 5);
      if (seed % 7 === 2) {                                   // satellite dish
        g.strokeStyle = '#3a3f45'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(mx - 14, my + 4); g.lineTo(mx - 14, my - 3); g.stroke();
        g.fillStyle = '#9aa0a6';
        g.beginPath(); g.ellipse(mx - 12, my - 5, 4, 3, -0.5, 0, Math.PI * 2); g.fill();
      } else if (seed % 7 === 5) {                            // aerial mast
        g.strokeStyle = '#3a3f45'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(mx + 12, my + 3); g.lineTo(mx + 12, my - 16); g.stroke();
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(mx + 8, my - 8 - i * 3); g.lineTo(mx + 16, my - 8 - i * 3); g.stroke();
        }
      }
      if (seed % 3 === 1) {                                   // vent pipes
        g.fillStyle = '#4a4e52';
        g.fillRect(mx - 2, my + 6, 3, 5);
        g.fillRect(mx + 3, my + 7, 3, 4);
      }
      // ...and then spread real plant across the rest of it, so a big deck is
      // furnished all over instead of having one lonely box in the middle
      const kit = Math.max(3, Math.round((w * h) / 8));
      for (let i = 0; i < kit; i++) {
        const p = R(0.12 + rrng() * 0.76, 0.12 + rrng() * 0.76);
        const ux = p[0] | 0, uy = (p[1] - 3) | 0;
        const r = rrng();
        if (r < 0.34) {                                       // plant unit on a frame
          acUnit(ux - 5, uy);
          g.fillStyle = 'rgba(0,0,0,0.28)';
          g.fillRect(ux - 6, uy, 12, 2);
        } else if (r < 0.55) {                                // roof hatch / stair box
          g.fillStyle = '#4a4e52'; g.fillRect(ux - 4, uy - 5, 9, 6);
          g.fillStyle = '#5d6165'; g.fillRect(ux - 4, uy - 6, 9, 2);
          g.fillStyle = '#33373b'; g.fillRect(ux - 3, uy - 3, 4, 4);
        } else if (r < 0.72) {                                // vent stacks
          g.fillStyle = '#4e5256'; g.fillRect(ux - 2, uy - 6, 3, 7);
          g.fillStyle = '#61656a'; g.fillRect(ux - 3, uy - 7, 5, 2);
          g.fillStyle = '#4e5256'; g.fillRect(ux + 3, uy - 4, 3, 5);
        } else if (r < 0.86) {                                // water tank on legs
          g.fillStyle = '#3a3e42'; g.fillRect(ux - 5, uy - 3, 2, 4);
          g.fillStyle = '#3a3e42'; g.fillRect(ux + 3, uy - 3, 2, 4);
          g.fillStyle = '#5a5e62'; g.fillRect(ux - 6, uy - 11, 12, 9);
          g.fillStyle = '#6e7276'; g.fillRect(ux - 6, uy - 12, 12, 2);
          g.fillStyle = '#43474b'; g.fillRect(ux - 6, uy - 5, 12, 1);
        } else {                                              // a duct run
          const len = 8 + ((rrng() * 14) | 0);
          g.fillStyle = '#54585c'; g.fillRect(ux - (len >> 1), uy - 3, len, 4);
          g.fillStyle = '#666a6e'; g.fillRect(ux - (len >> 1), uy - 4, len, 2);
          g.fillStyle = '#3e4246';
          for (let s3 = 0; s3 < len; s3 += 4) g.fillRect(ux - (len >> 1) + s3, uy - 4, 1, 5);
        }
      }
      if (kind === 'T') {                                   // hotel roof sign
        g.fillStyle = '#8a4a44'; g.fillRect(mx - 13, my - 19, 26, 8);
        g.fillStyle = '#cf9a92'; g.fillRect(mx - 13, my - 19, 26, 1);
        g.fillStyle = '#e8d9c0';
        for (let i = 0; i < 5; i++) g.fillRect(mx - 9 + i * 4, my - 16, 2, 4);
      }
    }

    const res = { img: c, ax, ay, h: Hh };
    if (buildingCache.size < 400) buildingCache.set(key, res);
    return res;
  };

  // =====================================================================
  // ST MARTIN'S — THE CATHEDRAL
  // Every other building is one box. This one is a composite: nave, two
  // aisles, twin west towers, buttressed flank and the fleche over the
  // crossing. It is still ONE sprite with ONE depth — nothing is assembled
  // at runtime, so nothing can drift out of line.
  //
  // It is built entirely in TILE SPACE — tx runs world +x (screen
  // right-down), ty runs world +y (screen left-down), z is real pixels
  // straight up — and projected once through S(). That is the angle rule
  // enforced by construction: a ledge, a buttress, a string course or a
  // window drawn through these helpers CANNOT come out axis-aligned,
  // because there is no rectangle anywhere in the code to shear. There are
  // only points in the world.
  // =====================================================================
  Sprites.makeCathedral = function (w, h, seed) {
    const key = 'CATH' + w + 'x' + h;
    const hit = buildingCache.get(key);
    if (hit) return hit;
    const rng = mulberry32((seed || 0) * 2654435761 + 7717);

    // ---- the stone. Warm limestone, lichened and rained on for a century.
    const ST_L = '#8e8779', ST_S = '#6f6a5e', ST_T = '#a69d8b';
    const ST_D = '#4a463e', ST_DD = '#332f2a';
    const SLATE_L = '#4d5972', SLATE_S = '#39435a';
    const SPIRE_L = '#42638f', SPIRE_S = '#2f4a72', SPIRE_H = '#6288bd';
    // Glass seen from OUTSIDE an unlit church is nearly black with the colour
    // only just showing. Bright panes would read as lamps, and nothing is lit
    // in here yet — Candlelight has not moved in.
    const GLASS = ['#26365f', '#552027', '#382248', '#20453b', '#5c471f'];
    const OAK = '#5b4128', OAK_D = '#3a2a1a', IRON = '#3c3a36';

    // ---- the volume, in tiles ----
    // THE WALLS ARE SET IN FROM THE FOOTPRINT, and the gap is what the
    // buttresses live in. A buttress is a pier standing off the wall — if the
    // wall sits on the edge of the footprint there is nowhere for it to stand,
    // and clamping it to the edge (which is what stopped it hanging in the
    // air) squashed it flat into the facade. So the west front comes back a
    // whole tile, the towers come in, and the piers fill that band.
    const BM = 0.1;                           // the plinth edge
    const BX0 = BM, BX1 = w - BM, BY1 = h - BM;
    const NF = h - 0.8;                       // the west front: the near wall
    const NX0 = 3.0, NX1 = 9.0;               // nave walls
    const AW0 = 1.0, AE1 = 11.0;              // aisle outer walls
    const AY0 = 1.6, AY1 = NF - 3.0;          // aisles run back from the towers
    const TL0 = 0.6, TL1 = 3.0;               // left (west) tower
    const TR0 = 8.9, TR1 = 11.3;              // right (east) tower
    const TY0 = NF - 3.0;                     // both towers start here
    // ---- and in pixels of height ----
    const PL = 7;                             // the plinth every wall stands on
    const AISLE = 58, AISLE_TOP = 72;         // aisle eaves · where its roof meets the nave
    const WALL = 104, RIDGE = 166;            // nave head · ridge. The pitch is
    // deliberately steeper than 1:2: at anything shallower the FAR slope turns
    // back towards the camera and shows as a grey sliver above the ridge.
    const TOW = 178, TOWCAP = 190, PIN = 214, TIP = 248;
    const FLECHE = 244, CROSSTOP = 256;

    const AX = h * 16, AYo = 152;
    const c = makeCanvas((w + h) * 16, AYo + (w + h) * 8 + 16), g = c.getContext('2d');
    const S = (tx, ty, z) => [AX + (tx - ty) * 16, AYo + (tx + ty) * 8 - z];

    // the two faces of a box the camera can see, plus its top
    const vol = (x0, y0, x1, y1, z0, z1, top, east, south, edge) => {
      if (top) poly(g, [S(x0, y0, z1), S(x1, y0, z1), S(x1, y1, z1), S(x0, y1, z1)], top, edge);
      if (east) poly(g, [S(x1, y0, z1), S(x1, y1, z1), S(x1, y1, z0), S(x1, y0, z0)], east, edge);
      if (south) poly(g, [S(x1, y1, z1), S(x0, y1, z1), S(x0, y1, z0), S(x1, y1, z0)], south, edge);
    };
    // A WALL FACE AS (u, v): u runs ALONG the wall in screen pixels — so it
    // carries the wall's iso slope with it — and v runs straight up. Every
    // piece of ornament below is placed in these coordinates.
    const SF = (ty, tx0) => { const o = S(tx0, ty, 0); return (u, v) => [o[0] + u, o[1] + u * 0.5 - v]; };
    const EF = (tx, ty0) => { const o = S(tx, ty0, 0); return (u, v) => [o[0] - u, o[1] + u * 0.5 - v]; };
    // detail is INTEGER-FILLED, never a path: a mullion is one pixel wide and
    // an antialiased edge at that size reads as a smear, not as a soft edge
    const F = (M, pts, col) => isoFill(g, pts.map(p => M(p[0], p[1])), col);
    const R = (M, u0, v0, u1, v1, col) => F(M, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], col);

    // a two-centre gothic arch: each side struck from the opposite springer,
    // which is what gives the point at the crown
    const archPts = (u0, u1, vb, vs, va) => {
      const W2 = u1 - u0, K = (va - vs) / (0.8660254 * W2), N = 8;
      const pts = [[u0, vb], [u0, vs]];
      for (let i = 1; i <= N; i++) {
        const u = u0 + W2 * 0.5 * (i / N);
        pts.push([u, vs + Math.sqrt(Math.max(0, W2 * W2 - (u - u1) * (u - u1))) * K]);
      }
      for (let i = N - 1; i >= 0; i--) {
        const u = u1 - W2 * 0.5 * (i / N);
        pts.push([u, vs + Math.sqrt(Math.max(0, W2 * W2 - (u - u0) * (u - u0))) * K]);
      }
      pts.push([u1, vb]);
      return pts;
    };
    // coursed ashlar + the grime that runs down a wall under every ledge
    const ashlar = (M, u0, u1, v0, v1, step) => {
      for (let v = v0 + step; v < v1; v += step) R(M, u0, v, u1, v + 1, 'rgba(0,0,0,0.09)');
    };
    const grime = (M, u0, u1, v0, v1, n) => {
      for (let i = 0; i < n; i++) {
        const u = u0 + rng() * (u1 - u0), len = (v1 - v0) * (0.25 + rng() * 0.6);
        R(M, u, v1 - len, u + 0.9 + rng() * 1.4, v1, 'rgba(46,50,42,0.13)');
      }
    };
    // a moulded band running the width of a face: lit top edge, shadow under
    const band = (M, u0, u1, v, t) => {
      R(M, u0, v, u1, v + t, ST_T);
      R(M, u0, v + t, u1, v + t + 1.2, 'rgba(255,244,220,0.20)');
      R(M, u0, v - 1.4, u1, v, 'rgba(0,0,0,0.28)');
    };
    // a glazed pointed window in a splayed reveal
    const lancet = (M, u0, u1, vb, vs, va, glass) => {
      F(M, archPts(u0 - 2, u1 + 2, vb, vs - 2, va + 4), ST_D);
      F(M, archPts(u0 - 1, u1 + 1, vb, vs - 1, va + 2), ST_DD);
      F(M, archPts(u0, u1, vb, vs, va), glass);
      const mid = (u0 + u1) / 2;
      R(M, mid - 0.7, vb, mid + 0.7, va - 2, ST_S);                       // mullion
      R(M, u0, vb + (va - vb) * 0.42, u1, vb + (va - vb) * 0.42 + 1.3, ST_S);   // transom
      R(M, u0, vb, u0 + 1.3, vs, shadeHex(glass, 1.55));                  // light down one jamb
      R(M, u1 - 1, vb, u1, vs, shadeHex(glass, 0.6));
    };
    // a louvred belfry opening — dark, with the slats catching light
    const louvre = (M, u0, u1, vb, vs, va) => {
      F(M, archPts(u0 - 2, u1 + 2, vb, vs - 2, va + 4), ST_D);
      F(M, archPts(u0, u1, vb, vs, va), ST_DD);
      for (let v = vb + 2; v < va - 3; v += 4) {
        R(M, u0 + 0.5, v, u1 - 0.5, v + 1.4, '#5d5749');
        R(M, u0 + 0.5, v + 1.4, u1 - 0.5, v + 2.2, '#2a2723');
      }
      R(M, (u0 + u1) / 2 - 0.7, vb, (u0 + u1) / 2 + 0.7, va - 2, ST_S);
    };
    // A SAINT. The first version was a pale capsule with a hairline of niche
    // round it, and at this size that reads as a lozenge stuck on the wall,
    // not a figure standing in it. Three things fix it: the niche has to be
    // properly dark and wider than the figure, the figure has to be stone in
    // shadow (DARKER than the sunlit wall, never brighter), and it has to
    // stand on a corbel — anything with nothing under it floats.
    const figure = (M, cu, vb, hgt) => {
      const bh = hgt * 0.64, hd = Math.max(1.6, hgt * 0.17);
      R(M, cu - 1.5, vb, cu + 1.5, vb + bh, '#7a7365');                 // robe
      R(M, cu - 1.5, vb, cu - 0.5, vb + bh, '#8f8878');                 // lit down one side
      R(M, cu + 0.85, vb, cu + 1.5, vb + bh, '#4e4941');                // shadow down the other
      R(M, cu - 1.5, vb + bh - 1.1, cu + 1.5, vb + bh, '#413d36');      // shoulder line
      R(M, cu - 0.85, vb + bh, cu + 0.85, vb + bh + hd, '#867f70');     // head
      R(M, cu - 0.85, vb + bh, cu - 0.2, vb + bh + hd, '#9a9282');
    };
    const statue = (M, cu, vb, hgt) => {
      const w2 = Math.max(2.8, hgt * 0.22);
      F(M, archPts(cu - w2 - 1.7, cu + w2 + 1.7, vb - 3.6, vb + hgt * 0.6, vb + hgt + 6), ST_T);
      F(M, archPts(cu - w2 - 0.7, cu + w2 + 0.7, vb - 2.6, vb + hgt * 0.6, vb + hgt + 4.5), ST_S);
      F(M, archPts(cu - w2, cu + w2, vb - 2, vb + hgt * 0.58, vb + hgt + 3), ST_D);
      F(M, archPts(cu - w2 + 0.9, cu + w2 - 0.9, vb - 2, vb + hgt * 0.58, vb + hgt + 2), '#26241f');
      R(M, cu - w2 + 0.3, vb - 2, cu + w2 - 0.3, vb - 0.4, ST_T);       // the corbel it stands on
      R(M, cu - w2 + 1.2, vb - 3.4, cu + w2 - 1.2, vb - 2, ST_S);
      figure(M, cu, vb, hgt);
    };
    const rose = (M, cu, cv, r) => {
      const ring = (rr, n) => {
        const p = [];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cu + Math.cos(a) * rr, cv + Math.sin(a) * rr]); }
        return p;
      };
      F(M, ring(r + 4, 24), ST_T);
      F(M, ring(r + 2, 24), ST_D);
      // Tracery, not a pinwheel: the stone between the lights is as wide as
      // the lights, and a second ring cuts every spoke in two.
      for (let k = 0; k < 10; k++) {
        const a0 = k / 10 * Math.PI * 2 + 0.16, a1 = (k + 1) / 10 * Math.PI * 2 - 0.16;
        const col = GLASS[k % 2 ? 0 : (k % 4 === 0 ? 1 : 2)];
        for (const [r0, r1] of [[5.5, r * 0.6 - 0.8], [r * 0.6 + 0.8, r]])
          F(M, [[cu + Math.cos(a0) * r0, cv + Math.sin(a0) * r0],
                [cu + Math.cos(a0) * r1, cv + Math.sin(a0) * r1],
                [cu + Math.cos(a1) * r1, cv + Math.sin(a1) * r1],
                [cu + Math.cos(a1) * r0, cv + Math.sin(a1) * r0]], col);
      }
      F(M, ring(5.6, 12), ST_T);
      F(M, ring(4, 10), GLASS[1]);
    };
    const clock = (M, cu, cv, r) => {
      const ring = (rr, n, col) => {
        const p = [];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cu + Math.cos(a) * rr, cv + Math.sin(a) * rr]); }
        F(M, p, col);
      };
      ring(r + 2, 20, ST_T);
      ring(r, 20, '#cdc6b3');
      for (let i = 0; i < 12; i++) {                       // hour marks
        const a = i / 12 * Math.PI * 2;
        R(M, cu + Math.cos(a) * (r - 1.6) - 0.6, cv + Math.sin(a) * (r - 1.6) - 0.6,
          cu + Math.cos(a) * (r - 1.6) + 0.6, cv + Math.sin(a) * (r - 1.6) + 0.6, '#4a4438');
      }
      R(M, cu - 0.7, cv, cu + 0.7, cv + r * 0.7, '#2e2a24');            // hands, stopped
      R(M, cu - 0.7, cv - 0.7, cu + r * 0.55, cv + 0.7, '#2e2a24');
    };
    // slates laid down a roof slope, in the slope's own space so the courses
    // follow the pitch instead of the screen
    const slates = (rFar, rNear, eNear, eFar, base, rows, cols, wear) => {
      poly(g, [rFar, rNear, eNear, eFar], base, '#1b1e22');
      const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      for (let r = 1; r < rows; r++) {
        const t = r / rows, a = L(rFar, eFar, t), b = L(rNear, eNear, t);
        g.lineWidth = 1;
        g.strokeStyle = 'rgba(0,0,0,0.24)';
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        const a2 = L(rFar, eFar, t + 0.014), b2 = L(rNear, eNear, t + 0.014);
        g.strokeStyle = 'rgba(206,224,248,0.08)';
        g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke();
      }
      for (let k = 1; k < cols; k++) {
        const t = k / cols, a = L(rFar, rNear, t), b = L(eFar, eNear, t);
        g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      // patches: slates relaid in a different batch, and holes where a course
      // has come off. A roof this old is never one flat colour.
      const at = (uu, vv) => L(L(rFar, eFar, vv), L(rNear, eNear, vv), uu);
      for (let i = 0; i < (wear || 0); i++) {
        const u = rng() * 0.9, v = rng() * 0.88;
        // small patches only: a tenth of a roof this size is not a relaid
        // batch of slates, it is a smudge
        const uw = 0.025 + rng() * 0.055, vh = 0.03 + rng() * 0.06;
        poly(g, [at(u, v), at(u + uw, v), at(u + uw, v + vh), at(u, v + vh)],
          rng() < 0.42 ? 'rgba(0,0,0,0.13)' : 'rgba(196,216,246,0.055)');
      }
    };
    // a tapered spike — pinnacle, spirelet, fleche. Two faces and a lit arris.
    const spike = (cx, cy, s, z0, z1, lit, dark, hi) => {
      const ap = S(cx, cy, z1);
      poly(g, [S(cx + s, cy - s, z0), S(cx + s, cy + s, z0), ap], lit);
      poly(g, [S(cx + s, cy + s, z0), S(cx - s, cy + s, z0), ap], dark);
      if (hi) {
        g.strokeStyle = hi; g.lineWidth = 1;
        const b = S(cx + s, cy + s, z0);
        g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(ap[0], ap[1]); g.stroke();
      }
    };
    // a buttress: a pier standing off the wall, stepped back once at a
    // weathered set-off, so rain runs off it instead of down the wall
    const buttress = (x0, y0, x1, y1, z, cap) => {
      const sx = (x1 - x0) * 0.16, sy = (y1 - y0) * 0.16;
      vol(x0, y0, x1, y1, PL, z * 0.55, ST_T, ST_L, ST_S, '#1b1e22');
      vol(x0 + sx, y0 + sy, x1 - sx, y1 - sy, z * 0.55, z, ST_T, shadeHex(ST_L, 1.04), ST_S, '#1b1e22');
      // no lit arris on the cap: on a pier this thin the highlight is three
      // pixels of white in mid-air, and it reads as a speck of dirt
      if (cap) spike((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 - sx,
                     z, z + cap, ST_L, ST_S, null);
    };

    // =========================== THE BUILD ===========================
    // Back to front: west aisle, west tower, nave, east aisle, fleche, east
    // tower. Anything nearer is drawn later, so the near work paints over
    // the far work and the engaged corners close up properly.

    // ---- the plinth the whole church stands on ----
    vol(BX0, BM, BX1, BY1, 0, PL, ST_T, ST_L, ST_S, '#1b1e22');
    R(SF(BY1, BX0), 0, 0, (BX1 - BX0) * 16, 2, 'rgba(0,0,0,0.25)');

    // ---- west aisle (far side): only its roof clears the nave ----
    vol(AW0, AY0, NX0, AY1, PL, AISLE, null, null, ST_S, '#1b1e22');

    // Tower body, shared by both. `east` draws the +x face: 'full' for the east
    // tower, which stands clear, and 'plain' for the west one.
    // The west tower needs that face too. Skipping it left a hole in the sky
    // between the nave head and the belfry — its cornice hung there over
    // nothing, which is the missing corner of the tower. It gets the face but
    // not the ornament, because the nave and its gable are drawn after this
    // and swallow the bottom two thirds of it; a clock cut in half by a roof
    // is worse than no clock.
    const tower = (x0, x1, east) => {
      const TW = (x1 - x0) * 16, TD = (NF - TY0) * 16;
      vol(x0, TY0, x1, NF, PL, TOW, null, east ? ST_L : null, ST_S, '#1b1e22');
      const M = SF(NF, x0);
      ashlar(M, 0, TW, PL, TOW, 7);
      grime(M, 2, TW - 2, PL, TOW, 9);
      band(M, 0, TW, 46, 2.4);
      band(M, 0, TW, 88, 2.4);
      band(M, 0, TW, 128, 2.4);
      // stage 1: a blind arcade at street level
      for (let i = 0; i < 3; i++) {
        const cu = TW * (i + 0.5) / 3;
        F(M, archPts(cu - 5, cu + 5, PL + 4, 24, 38), ST_D);
        F(M, archPts(cu - 3.6, cu + 3.6, PL + 5, 24, 36), ST_DD);
      }
      // stage 2: saints under canopies
      statue(M, TW * 0.28, 54, 22);
      statue(M, TW * 0.72, 54, 22);
      // stage 3: the clock, stopped
      clock(M, TW / 2, 106, 11);
      // stage 4: the belfry
      louvre(M, TW * 0.22, TW * 0.42, 134, 158, 170);
      louvre(M, TW * 0.58, TW * 0.78, 134, 158, 170);
      if (east) {
        const E = EF(x1, TY0);
        ashlar(E, 0, TD, PL, TOW, 7);
        grime(E, 2, TD - 2, PL, TOW, 7);
        band(E, 0, TD, 128, 2.4);
        louvre(E, TD * 0.2, TD * 0.4, 134, 158, 170);
        louvre(E, TD * 0.6, TD * 0.8, 134, 158, 170);
        if (east === 'full') {
          band(E, 0, TD, 46, 2.4); band(E, 0, TD, 88, 2.4);
          for (let i = 0; i < 2; i++) {
            const cu = TD * (i + 0.5) / 2;
            F(E, archPts(cu - 5, cu + 5, PL + 4, 24, 38), ST_D);
          }
          statue(E, TD * 0.3, 54, 22); statue(E, TD * 0.7, 54, 22);
          clock(E, TD / 2, 106, 11);
        }
      }
      // Cornice, then the parapet standing above it. It oversails ONLY on the
      // two sides the camera can see. Oversailing north or west puts a lip out
      // over a face that is never drawn, and you see sky through the gap under
      // it — that slot beside the west tower was a cornice hanging over
      // nothing, not a piece of tower gone missing.
      vol(x0, TY0, x1, NF + 0.2, TOW, TOWCAP, ST_T, ST_L, ST_S, '#1b1e22');
      const PM = SF(NF + 0.2, x0), PW = (x1 - x0) * 16;
      for (let i = 0; i < 6; i++)                       // openwork parapet
        R(PM, PW * (i + 0.25) / 6, TOW + 2, PW * (i + 0.75) / 6, TOWCAP - 2, ST_DD);
      // four pinnacles and the spirelet between them
      for (const [px2, py2] of [[x0 + 0.3, TY0 + 0.3], [x1 - 0.3, TY0 + 0.3],
                                [x0 + 0.3, NF - 0.3], [x1 - 0.3, NF - 0.3]])
        spike(px2, py2, 0.32, TOWCAP, PIN, ST_L, ST_S, 'rgba(255,246,224,0.40)');
      // the tower caps are slated like the roofs. Only the fleche is lead-blue
      // — one accent, or the whole skyline turns into a fairground.
      spike((x0 + x1) / 2, (TY0 + NF) / 2, (x1 - x0) / 2 - 0.55, TOWCAP, TIP,
            SLATE_L, SLATE_S, 'rgba(200,220,248,0.35)');
    };

    tower(TL0, TL1, 'plain');

    // ---- the nave: walls, then the steep slate roof ----
    vol(NX0, AY0, NX1, NF, PL, WALL, null, ST_L, ST_S, '#1b1e22');
    {
      const E = EF(NX1, AY0), EL = (NF - AY0) * 16;
      ashlar(E, 0, EL, PL, WALL, 7);
      grime(E, 2, EL - 2, AISLE_TOP, WALL, 12);
      band(E, 0, EL, 75, 2.2);
      band(E, 0, EL, WALL - 4, 2.6);
      // clerestory: the row of windows above the aisle roof, which is the
      // whole point of a nave — light in over the top of the aisle
      const bays = 5;
      for (let i = 0; i < bays; i++) {
        const cu = EL * (i + 0.5) / bays;
        lancet(E, cu - 7, cu + 7, AISLE_TOP + 8, 92, 99, GLASS[i % GLASS.length]);
      }
    }
    // the roof. Ridge runs north–south along the nave, so the west front
    // gets a gable and the flank gets one long slope.
    const rMid = (NX0 + NX1) / 2;
    slates(S(rMid, AY0, RIDGE), S(rMid, NF, RIDGE), S(NX1, NF, WALL), S(NX1, AY0, WALL),
           SLATE_L, 13, 16, 26);
    poly(g, [S(NX0, AY0, WALL), S(NX1, AY0, WALL), S(rMid, AY0, RIDGE)], SLATE_S);   // far gable
    { // ridge cap and its crockets
      const a = S(rMid, AY0, RIDGE), b = S(rMid, NF, RIDGE);
      g.strokeStyle = ST_T; g.lineWidth = 2;
      g.beginPath(); g.moveTo(a[0], a[1] - 1); g.lineTo(b[0], b[1] - 1); g.stroke();
      g.strokeStyle = '#20242c'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(a[0], a[1] + 1); g.lineTo(b[0], b[1] + 1); g.stroke();
      for (let t = 0.06; t < 0.98; t += 0.075) {
        const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        px(g, Math.round(p[0]) - 1, Math.round(p[1]) - 4, 2, 4, '#7f8ba3');
      }
    }

    // ---- THE WEST FRONT ----
    // The face the road brings you to. Portal, two doors, the rose, and a
    // gallery of saints under the gable.
    {
      const M = SF(NF, NX0), FW = (NX1 - NX0) * 16;      // 96 px of wall
      ashlar(M, 0, FW, PL, WALL, 7);
      grime(M, 2, FW - 2, PL, WALL, 14);

      // the great door, in four recessed orders
      for (let o = 0; o < 4; o++) {
        const s2 = o * 1.9;
        F(M, archPts(30 - s2 + 5.7, 66 + s2 - 5.7, PL, 40 - s2 * 0.4, 58 + s2 * 0.9),
          o % 2 ? ST_D : ST_S);
      }
      F(M, archPts(37, 59, PL, 40, 56), ST_DD);          // the opening itself
      R(M, 38, PL, 47.4, 44, OAK); R(M, 48.6, PL, 58, 44, OAK);   // two door leaves
      for (let v = PL + 3; v < 42; v += 5) { R(M, 38, v, 58, v + 1.2, OAK_D); }
      R(M, 47.4, PL, 48.6, 46, IRON);                    // the meeting stile
      R(M, 40, 20, 45, 21.6, IRON); R(M, 51, 20, 56, 21.6, IRON);  // strap hinges
      F(M, archPts(38, 58, 43, 47, 56), ST_DD);          // tympanum over the doors
      figure(M, 48, 45, 11);                             // the figure in it
      band(M, 26, 70, 60, 2.2);

      // the flanking doors, and the tall windows over them
      for (const cu of [14, 82]) {
        F(M, archPts(cu - 9, cu + 9, PL, 26, 36), ST_D);
        F(M, archPts(cu - 7, cu + 7, PL, 26, 34), ST_DD);
        R(M, cu - 6, PL, cu - 0.6, 27, OAK); R(M, cu + 0.6, PL, cu + 6, 27, OAK);
        R(M, cu - 0.6, PL, cu + 0.6, 29, IRON);
        band(M, cu - 12, cu + 12, 40, 2);
        lancet(M, cu - 7, cu + 7, 50, 84, 96, GLASS[cu > 48 ? 1 : 0]);
        statue(M, cu - 13.5, 52, 16);
        statue(M, cu + 13.5, 52, 16);
      }

      // the rose
      rose(M, 48, 82, 17);

      // the gable above the wall head, and the gallery of saints in it
      poly(g, [S(NX0, NF, WALL), S(NX1, NF, WALL), S(rMid, NF, RIDGE)], ST_S, '#1b1e22');
      const gable = M;
      band(gable, 0, FW, WALL - 4, 2.6);
      // coursed stone that stops at the rake, since the gable is a triangle
      for (let v = WALL + 5; v < RIDGE - 6; v += 7) {
        const hw = (1 - (v - WALL) / (RIDGE - WALL)) * (FW / 2) - 2;
        if (hw > 3) R(gable, 48 - hw, v, 48 + hw, v + 1, 'rgba(0,0,0,0.09)');
      }
      for (const cu of [33, 48, 63]) statue(gable, cu, WALL + 6, 15);
      // the gable rakes: a moulded coping either side, meeting at the apex
      for (const s2 of [-1, 1]) {
        const a = S(s2 < 0 ? NX0 : NX1, NF, WALL), b = S(rMid, NF, RIDGE);
        g.strokeStyle = ST_T; g.lineWidth = 2;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      // an oculus in the gable, and the cross on the apex
      const OCV = WALL + 38, ring = [];
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ring.push([48 + Math.cos(a) * 6.5, OCV + Math.sin(a) * 6.5]); }
      F(gable, ring, ST_D);
      const ring2 = ring.map(p => [48 + (p[0] - 48) * 0.7, OCV + (p[1] - OCV) * 0.7]);
      F(gable, ring2, GLASS[0]);
      const ap = S(rMid, NF, RIDGE);
      px(g, Math.round(ap[0]) - 1, Math.round(ap[1]) - 13, 2, 13, ST_T);
      px(g, Math.round(ap[0]) - 4, Math.round(ap[1]) - 10, 8, 2, ST_T);
    }

    // ---- east aisle: the flank the street sees, buttress by buttress ----
    // It starts at the NAVE wall, not at the far side of the church: run it
    // the full width and its south end becomes a grey slab across the west
    // front, because that end is drawn after the facade it sits behind.
    vol(NX1, AY0, AE1, AY1, PL, AISLE, null, ST_L, null, '#1b1e22');
    {
      const E = EF(AE1, AY0), AL = (AY1 - AY0) * 16;
      ashlar(E, 0, AL, PL, AISLE, 7);
      grime(E, 2, AL - 2, PL, AISLE, 8);
      const bays = 5;
      for (let i = 0; i < bays; i++) {
        const cu = AL * (i + 0.5) / bays;
        lancet(E, cu - 6, cu + 6, 18, 40, 50, GLASS[(i + 2) % GLASS.length]);
      }
      band(E, 0, AL, AISLE - 7, 2.4);
      // the lean-to roof, from the aisle eaves up to the nave wall
      slates(S(NX1, AY0, AISLE_TOP), S(NX1, AY1, AISLE_TOP), S(AE1, AY1, AISLE), S(AE1, AY0, AISLE),
             SLATE_S, 5, 12, 10);
      // a pier between every bay. They stand OFF the wall, so each one is a
      // little volume of its own on the iso grid — not a stripe painted on
      // the face, which is what a buttress becomes if you draw it flat.
      for (let i = 0; i <= bays; i++) {
        const ty = AY0 + (AY1 - AY0) * (i / bays);
        buttress(AE1 - 0.05, ty - 0.26, AE1 + 0.45, ty + 0.26, AISLE - 8, 11);
      }
      // the aisle's south end is engaged with the tower and never seen —
      // drawing it here is what put a grey slab across the west front
    }

    // ---- the fleche over the crossing ----
    {
      // It sits with its west face ON the ridge, not straddling it. The far
      // slope of the roof is never drawn, so anything hanging west of the ridge
      // hangs over sky — that was a hairline of daylight down the spire's edge.
      // Its base starts well below the ridge so the roof swallows the join.
      const fx = rMid + 0.55, fy = AY0 + (NF - AY0) * 0.5;
      vol(fx - 0.55, fy - 0.55, fx + 0.55, fy + 0.55, RIDGE - 30, RIDGE + 16, null, SPIRE_L, SPIRE_S, '#1b1e22');
      const M = SF(fy + 0.55, fx - 0.55);
      louvre(M, 3, 14, RIDGE - 6, RIDGE + 8, RIDGE + 13);
      // the spire is no wider than the box under it, or its west corner
      // overhangs the ridge again and daylight comes back
      spike(fx, fy, 0.55, RIDGE + 16, FLECHE, SPIRE_L, SPIRE_S, 'rgba(190,215,250,0.5)');
      spike(fx, fy, 0.27, RIDGE + 16, FLECHE - 4, SPIRE_H, SPIRE_L, null);
      const ap = S(fx, fy, FLECHE);
      px(g, Math.round(ap[0]) - 1, Math.round(ap[1]) - (CROSSTOP - FLECHE), 2, CROSSTOP - FLECHE, '#b9b09c');
      px(g, Math.round(ap[0]) - 4, Math.round(ap[1]) - (CROSSTOP - FLECHE) + 3, 9, 2, '#b9b09c');
    }

    // ---- east tower ----
    tower(TR0, TR1, 'full');

    // ---- THE PIERS, last of everything ----
    // They stand a full tile off the walls, which makes them the nearest thing
    // on the building, so they are drawn after every wall they clasp. Draw
    // them inside tower() instead and the nave — drawn later — paints over
    // the two on the west tower, which is what flattened them into the wall.
    {
      // Slim: a pier the width of a doorway hides the doorway. It projects
      // about two thirds of its own width, which is enough to throw a shadow
      // and read as stone standing off the wall.
      const bs = 0.42, PJ = BY1 - 0.1;
      for (const [x0, x1, east] of [[TL0, TL1, false], [TR0, TR1, true]]) {
        buttress(Math.max(BX0, x0 - 0.18), NF - bs, x0 + bs, PJ, 140, 12);
        buttress(x1 - bs, NF - bs, Math.min(BX1, x1 + 0.18), PJ, 140, 12);
        if (east) buttress(x1 - bs, TY0 - 0.18, BX1 - 0.1, TY0 + bs, 140, 12);
      }
    }

    const res = { img: c, ax: AX, ay: AYo, h: WALL };
    buildingCache.set(key, res);
    return res;
  };

  // building corner column — height locked to the facade so the tops meet
  (function () {
    const c = makeCanvas(7, 46), g = c.getContext('2d');
    px(g, 0, 0, 7, 46, '#5a5349');
    px(g, 0, 0, 3, 46, '#6a6257');
    px(g, 0, 0, 7, 2, '#756d61');
    px(g, 0, 44, 7, 2, '#3f3a33');
    Sprites.cornerCol = outlined(c);
  })();

  // ---- makeshift signs: nailed planks and cloth banners, with a painted
  // arrow that actually points where the trail goes. The board is angled to
  // the street it stands on, and the arrow to the direction of travel. ----
  (function () {
    // paint an arrow onto the board, pointing along iso direction (dx,dy)
    const paintArrow = (g, cx2, cy2, dx, dy) => {
      const ux = (dx - dy) * 7, uy = (dx + dy) * 3.5;
      g.fillStyle = '#43331d';
      for (let t = -1; t <= 0.7; t += 0.08) g.fillRect(Math.round(cx2 + ux * t), Math.round(cy2 + uy * t), 2, 2);
      const hx = cx2 + ux * 0.85, hy = cy2 + uy * 0.85;
      g.beginPath();
      g.moveTo(hx + ux * 0.5, hy + uy * 0.5);
      g.lineTo(hx - uy * 0.5, hy + ux * 0.5);
      g.lineTo(hx + uy * 0.5, hy - ux * 0.5);
      g.closePath(); g.fill();
    };
    const mkPlank = (dx, dy) => {
      const c = makeCanvas(28, 24), g = c.getContext('2d');
      px(g, 12, 11, 3, 13, '#6a5638');               // broom handle
      px(g, 2, 2, 24, 10, '#8a7048');                // plank
      px(g, 2, 2, 24, 1, '#9c8055');
      px(g, 2, 7, 24, 1, '#75603c');
      px(g, 4, 4, 2, 2, '#3a2f1e'); px(g, 22, 4, 2, 2, '#3a2f1e');   // nails
      paintArrow(g, 14, 7, dx, dy);
      return outlined(c);
    };
    const mkCloth = (dx, dy) => {
      const c = makeCanvas(32, 22), g = c.getContext('2d');
      px(g, 1, 1, 2, 20, '#5a4a30'); px(g, 29, 1, 2, 20, '#5a4a30');
      px(g, 3, 3, 26, 12, '#b9b2a0');
      px(g, 3, 3, 26, 1, '#cfc8b6');
      for (let i = 0; i < 7; i++) px(g, 4 + i * 4, 14, 3, 2, '#a79f8d');
      paintArrow(g, 16, 9, dx, dy);
      return outlined(c);
    };
    // keyed by the direction the trail continues in
    const dirs = { xm: [-1, 0], xp: [1, 0], ym: [0, -1], yp: [0, 1] };
    Sprites.signPlankDir = {}; Sprites.signClothDir = {};
    for (const k of Object.keys(dirs)) {
      const [dx, dy] = dirs[k];
      // a sign standing beside an east-west street is sheared with it
      const along = (k === 'xm' || k === 'xp') ? 1 : -1;
      Sprites.signPlankDir[k] = sheared(mkPlank(dx, dy), along);
      Sprites.signClothDir[k] = sheared(mkCloth(dx, dy), along);
    }
    Sprites.signPlank = Sprites.signPlankDir.xm;
    Sprites.signCloth = Sprites.signClothDir.xm;
  })();

  // ---- gas station: canopy fascia, pylon totem, kerbed island ----
  (function () {
    const py = makeCanvas(22, 52), g = py.getContext('2d');
    px(g, 9, 20, 4, 32, '#5e6266');                  // mast
    px(g, 2, 2, 18, 20, '#d8d2c4');                  // board
    px(g, 2, 2, 18, 3, '#b8433a');
    px(g, 4, 7, 14, 4, '#2a2e33');                   // brand bar
    px(g, 4, 13, 6, 3, '#4a5a3a');                   // prices
    px(g, 12, 13, 6, 3, '#4a5a3a');
    px(g, 4, 17, 14, 2, '#8d887a');
    Sprites.pylonSign = outlined(py);

    const isl = makeCanvas(30, 12), ig = isl.getContext('2d');
    px(ig, 0, 4, 30, 6, '#6e7276');                  // kerbed island
    px(ig, 0, 3, 30, 2, '#82868a');
    px(ig, 0, 9, 30, 2, '#565a5e');
    Sprites.pumpIsland = outlined(isl);
  })();

  // ---- GROUND PAINT: every mark lies on the iso grid, never axis-aligned ----
  // dir +1 = runs along world +x (screen down-right), -1 = along +y (down-left)
  (function () {
    // a stripe of length L running along the road
    const stripe = (dir, L, thick, col) => {
      const c = makeCanvas(L * 2 + thick * 2, L + thick * 2 + 2), g = c.getContext('2d');
      g.fillStyle = col;
      for (let i = 0; i < L * 2; i++) {
        const yy = dir > 0 ? i * 0.5 : (L - i * 0.5);
        g.fillRect(i, yy + 1, 1, thick);
      }
      return c;
    };
    Sprites.decals.dashX = stripe(1, 7, 2, 'rgba(206,201,176,0.6)');
    Sprites.decals.dashY = stripe(-1, 7, 2, 'rgba(206,201,176,0.6)');

    // crossing: bars laid ACROSS the road, so they run on the other diagonal
    const crossing = dir => {
      const c = makeCanvas(34, 26), g = c.getContext('2d');
      g.fillStyle = 'rgba(205,201,175,0.5)';
      for (let b = 0; b < 5; b++) {
        // each bar runs perpendicular to travel; step the bars along travel
        const ox2 = b * 5, oy2 = dir > 0 ? b * 2.5 : -b * 2.5;
        for (let i = 0; i < 16; i++) {
          const yy = dir > 0 ? (8 - i * 0.5) : (i * 0.5 + 2);
          g.fillRect(ox2 + i, yy + oy2 + 8, 1, 2);
        }
      }
      return c;
    };
    Sprites.decals.crossbarX = crossing(1);
    Sprites.decals.crossbarY = crossing(-1);
    Sprites.decals.crossbar = Sprites.decals.crossbarX;

    // painted arrow pointing along the road, four directions
    const arrow = (dx, dy) => {
      const c = makeCanvas(30, 22), g = c.getContext('2d');
      const cx2 = 15, cy2 = 11;
      // shaft and head follow the iso direction (dx,dy) in tile space
      const sx = dx * 16, sy = (dx + dy) * 0;   // screen dir for (dx,dy)
      const ux = (dx - dy) * 8, uy = (dx + dy) * 4;   // one tile step, halved
      g.fillStyle = 'rgba(214,209,184,0.62)';
      for (let t = -1.2; t <= 0.9; t += 0.06) {
        g.fillRect(Math.round(cx2 + ux * t), Math.round(cy2 + uy * t), 2, 2);
      }
      // head
      const hx = cx2 + ux * 1.0, hy = cy2 + uy * 1.0;
      const px2 = -uy, py2 = ux;                       // perpendicular
      g.beginPath();
      g.moveTo(hx + ux * 0.45, hy + uy * 0.45);
      g.lineTo(hx + px2 * 0.42, hy + py2 * 0.42);
      g.lineTo(hx - px2 * 0.42, hy - py2 * 0.42);
      g.closePath(); g.fill();
      return c;
    };
    Sprites.decals.arrowXp = arrow(1, 0);    // toward +x  (down-right)
    Sprites.decals.arrowXm = arrow(-1, 0);   // toward -x  (up-left)
    Sprites.decals.arrowYp = arrow(0, 1);    // toward +y  (down-left)
    Sprites.decals.arrowYm = arrow(0, -1);   // toward -y  (up-right)
    Sprites.decals.paintArrow = Sprites.decals.arrowXm;
  })();
})();
