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
    // pavement: pale slabs with joints
    const { c, g } = tileBase('#4a4c4f');
    sprinkle(g, 22, ['#525457', '#434548', '#4e5053']);
    dpx(g, 0, 7, 32, '#3a3c3f');                      // slab joint
    dpx(g, 15, 0, 2, 16, '#3a3c3f');
    if (rng() < 0.45) {                               // weeds through the joint
      const r = (rng() * 14) | 0;
      dpx(g, 14 + ((rng() * 4) | 0), r, 1, '#4a5a2a');
    }
    if (rng() < 0.3) dpx(g, (rng() * 24) | 0, (rng() * 15) | 0, 3, '#37393c');  // missing chip
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
    const winRow = (P0, P1, cells, glass, isSouth) => {
      for (let r = 0; r < rows; r++) {
        const v0 = 0.16 + r * (0.74 / rows), v1 = v0 + 0.44 / rows;
        for (let i = 0; i < cells; i++) {
          const u0 = (i + 0.22) / cells, u1 = (i + 0.78) / cells;
          if (kind === 'S' && r === rows - 1) continue;             // shop sign band
          poly(g, faceQuad(P0, P1, Hh, u0, u1, v0, v1), glass, '#12151a');
          // a highlight streak on the glass
          poly(g, faceQuad(P0, P1, Hh, u0, u0 + (u1 - u0) * 0.3, v0, v1), 'rgba(150,190,215,0.07)');
        }
      }
      // ground floor: shopfront glazing or a door
      if (kind === 'S' || kind === 'G') {
        poly(g, faceQuad(P0, P1, Hh, 0.08, 0.92, 0.04, 0.30),
             kind === 'G' ? st.s : glass, '#12151a');
        if (kind === 'G') for (let i = 0; i < 6; i++)
          poly(g, faceQuad(P0, P1, Hh, 0.08, 0.92, 0.05 + i * 0.042, 0.055 + i * 0.042), st.w);
      } else if (isSouth) {
        poly(g, faceQuad(P0, P1, Hh, 0.44, 0.58, 0.02, 0.24), '#2e2620', '#12151a');
        poly(g, faceQuad(P0, P1, Hh, 0.44, 0.58, 0.23, 0.26), st.t);   // lintel
      }
    };
    const cellsE = Math.max(1, Math.round(h * 0.7)), cellsS = Math.max(1, Math.round(w * 0.7));
    winRow(B, C, cellsE, st.g, false);
    winRow(C, D, cellsS, st.g, true);

    // per-type face detail
    if (kind === 'S') {                                   // lit sign band
      poly(g, faceQuad(C, D, Hh, 0.05, 0.95, 0.74, 0.9), '#2a2620', '#12151a');
      poly(g, faceQuad(C, D, Hh, 0.12, 0.5, 0.78, 0.86), '#7a6f5c');
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
      if (along) {
        poly(g, [A2, B2, rB, rA], st.r, '#20242a');
        poly(g, [rA, rB, C2, D2], st.re, '#20242a');
      } else {
        poly(g, [A2, rA, rB, D2], st.r, '#20242a');
        poly(g, [rA, B2, C2, rB], st.re, '#20242a');
      }
      g.strokeStyle = '#191d22'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(rA[0], rA[1]); g.lineTo(rB[0], rB[1]); g.stroke();
      if (kind === 'R') {                                  // ridge cross
        const mx = (rA[0] + rB[0]) / 2, my = (rA[1] + rB[1]) / 2;
        g.fillStyle = '#9a9284';
        g.fillRect(mx - 1, my - 14, 2, 14);
        g.fillRect(mx - 4, my - 11, 8, 2);
      } else if (seed % 3 === 0) {                         // chimney
        const cx2 = rA[0] + (rB[0] - rA[0]) * 0.28, cy2 = rA[1] + (rB[1] - rA[1]) * 0.28;
        g.fillStyle = '#4a3a35'; g.fillRect(cx2 - 2, cy2 - 11, 5, 12);
        g.fillStyle = '#5f4c46'; g.fillRect(cx2 - 2, cy2 - 12, 5, 2);
      }
    } else {
      poly(g, [A2, B2, C2, D2], st.r, '#20242a');
      // parapet lip around the edge
      poly(g, [A2, B2, [B2[0], B2[1] - 3], [A2[0], A2[1] - 3]], st.re);
      poly(g, [[A2[0], A2[1] - 3], [B2[0], B2[1] - 3], [C2[0], C2[1] - 3], [D2[0], D2[1] - 3]], st.r, '#20242a');
      const mx = (A2[0] + C2[0]) / 2, my = (A2[1] + C2[1]) / 2 - 3;
      if (kind === 'O' || kind === 'T' || kind === 'N') {
        g.fillStyle = '#5a5e62'; g.fillRect(mx - 9, my - 7, 10, 7);
        g.fillStyle = '#6c7074'; g.fillRect(mx - 9, my - 8, 10, 2);
        g.fillStyle = '#4a4e52'; g.fillRect(mx + 3, my - 4, 7, 5);
      } else if (kind === 'K') {
        g.fillStyle = '#9aa2a8';
        for (let i = -1; i <= 1; i++) g.fillRect(mx + i * 10 - 3, my - 4, 7, 4);
        g.fillStyle = '#5a5e62'; g.fillRect(mx - 16, my - 9, 7, 8);
      } else {
        g.fillStyle = '#4e5256'; g.fillRect(mx - 4, my - 6, 7, 5);
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

  // building corner column — height locked to the facade so the tops meet
  (function () {
    const c = makeCanvas(7, 46), g = c.getContext('2d');
    px(g, 0, 0, 7, 46, '#5a5349');
    px(g, 0, 0, 3, 46, '#6a6257');
    px(g, 0, 0, 7, 2, '#756d61');
    px(g, 0, 44, 7, 2, '#3f3a33');
    Sprites.cornerCol = outlined(c);
  })();

  // ---- makeshift signs: nailed planks, painted boards, cloth banners ----
  (function () {
    const board = makeCanvas(26, 22), g = board.getContext('2d');
    px(g, 11, 10, 3, 12, '#6a5638');                 // broom handle
    px(g, 2, 2, 22, 9, '#8a7048');                   // plank
    px(g, 2, 2, 22, 1, '#9c8055');
    px(g, 2, 6, 22, 1, '#75603c');                   // grain
    px(g, 5, 4, 3, 3, '#3a2f1e');                    // nails
    px(g, 19, 4, 3, 3, '#3a2f1e');
    Sprites.signPlank = outlined(board);

    const cloth = makeCanvas(30, 20), cg = cloth.getContext('2d');
    px(cg, 1, 1, 2, 18, '#5a4a30');                  // poles
    px(cg, 27, 1, 2, 18, '#5a4a30');
    px(cg, 3, 3, 24, 11, '#b9b2a0');                 // bedsheet
    px(cg, 3, 3, 24, 1, '#cfc8b6');
    for (let i = 0; i < 6; i++) px(cg, 4 + i * 4, 13, 3, 2, '#a79f8d');  // ragged hem
    Sprites.signCloth = outlined(cloth);

    // arrow daubed straight onto the ground
    const sp = makeCanvas(20, 12), sg2 = sp.getContext('2d');
    sg2.fillStyle = 'rgba(228,222,200,0.6)';
    sg2.fillRect(2, 5, 11, 2);
    sg2.beginPath(); sg2.moveTo(12, 1); sg2.lineTo(19, 6); sg2.lineTo(12, 11); sg2.closePath(); sg2.fill();
    Sprites.decals.paintArrow = sp;
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

  // lane dashes, sheared to lie along each road direction
  (function () {
    const mk = dir => {
      const c = makeCanvas(18, 12), g = c.getContext('2d');
      g.fillStyle = 'rgba(206,201,176,0.6)';
      for (let i = 0; i < 14; i++) {
        const yy = dir > 0 ? 2 + i * 0.5 : 9 - i * 0.5;
        g.fillRect(i + 2, yy, 1, 2);
      }
      return c;
    };
    Sprites.decals.dashX = mk(1);    // road running along world +x
    Sprites.decals.dashY = mk(-1);   // road running along world +y
  })();
})();
