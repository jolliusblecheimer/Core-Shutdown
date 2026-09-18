// AIRFIELD 12 — the geometry and behaviour checker.
//
// THIS LIVES IN THE REPO ON PURPOSE. It used to sit in a scratch directory and
// was lost with every new session, and it has been rebuilt from memory four
// times. Each rebuild is a chance to get the test subtly wrong, and a test that
// is subtly wrong reports success — which has happened here more than once.
//
//   node tools/field12.js          (needs `python3 serve.py` running on 8123)
//
// It answers, in order:
//   1. does any sprite PAINT over a building's own tiles      ("a plane in a house")
//   2. does any hardware footprint overlap a building or the perimeter
//   3. is every building enterable and reachable
//   4. can a droid stand inside, or walk through, an aircraft
//   5. do all four patrols actually walk their routes
//   6. the five crossings, graded — and are they still the only ways through
//   7. the culvert: solid to the world, crouch-only for the player
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8123;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push('THROW ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('ERR ' + m.text()); });
  await p.addInitScript(() => { window.TEST_MODE = true; });
  await p.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(1600);

  const out = await p.evaluate(() => {
    GameState = 'playing'; playerName = 'P'; Tut.active = null; window.tutShow = () => {};
    Watch.firstSight = true; Watch.swarmSeen = true;
    // THE BOSS STAYS ALIVE. Quests.provost='dead' also sets Watch.networkDown,
    // which blinds every camera and stops every patrol — measure that and the
    // field reports clean because nothing on it is looking.
    Quests.provost = 'alive'; Watch.networkDown = false;
    enterArea('field12', { x: 58.5, y: 32.5 });
    player.x = 58.5; player.y = 32.5;
    const W = MAP_W, H = MAP_H, L = [];
    let fails = 0;
    const ok = (cond, line) => { if (!cond) fails++; L.push((cond ? '  ok   ' : '  FAIL ') + line); };

    // ---------- which tiles a sprite actually paints over ----------
    const paintCache = {};
    const painted = (kind, f) => {
      const im = Sprites[kind];
      if (!im || !im.width) return [];
      const key = kind + ':' + f[2] + 'x' + f[3];
      if (!paintCache[key]) {
        const c = document.createElement('canvas');
        c.width = im.width; c.height = im.height;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, im.width, im.height).data;
        const a0 = isoToScreen(0, 0);
        const rel = [];
        for (let dy = -8; dy <= f[3] + 8; dy++) for (let dx = -8; dx <= f[2] + 8; dx++) {
          const s = isoToScreen(dx + 0.5, dy + 0.5);
          const px = Math.round(s.x - (a0.x - im.ox)), py = Math.round(s.y - (a0.y - im.oy));
          let hit = 0;
          for (let oy = -6; oy <= 2; oy++) for (let ox = -3; ox <= 3; ox++) {
            const qx = px + ox, qy = py + oy;
            if (qx < 0 || qy < 0 || qx >= im.width || qy >= im.height) continue;
            if (d[(qy * im.width + qx) * 4 + 3] > 40) hit++;
          }
          if (hit >= 6) rel.push([dx, dy]);
        }
        paintCache[key] = rel;
      }
      return paintCache[key].map(([dx, dy]) => [f[0] + dx, f[1] + dy]);
    };

    const blds = props.filter(q => q.type === 'building');
    const hw = props.filter(q => q.kind && q.type !== 'building' && q.foot);

    L.push('1. A SPRITE PAINTED OVER A BUILDING\'S OWN TILES');
    let painters = 0;
    for (const q of hw) {
      const hits = {};
      for (const [x, y] of painted(q.kind, q.foot)) for (const bd of blds) {
        const [bx, by, bw, bh] = bd.foot;
        if (x >= bx && x < bx + bw && y >= by && y < by + bh)
          hits[bd.foot.join(',')] = (hits[bd.foot.join(',')] || 0) + 1;
      }
      for (const k in hits) { painters++; L.push('       ' + q.kind + '@' + q.foot[0] + ',' + q.foot[1] +
        ' paints ' + hits[k] + ' tiles into building ' + k); }
    }
    ok(painters === 0, 'no sprite is drawn over a building (' + painters + ')');

    L.push('');
    L.push('2. HARDWARE OVERLAPPING A BUILDING OR THE PERIMETER');
    let laps = 0;
    const over = (a, c) => a[0] < c[0]+c[2] && a[0]+a[2] > c[0] && a[1] < c[1]+c[3] && a[1]+a[3] > c[1];
    for (const q of hw) {
      for (const bd of blds) if (over(q.foot, bd.foot)) {
        laps++; L.push('       ' + q.kind + '@' + q.foot.join(',') + ' overlaps ' + bd.foot.join(','));
      }
      const [x0, y0, w, h] = q.foot;
      if (x0 < 1 || y0 < 1 || x0 + w > W - 1 || y0 + h > H - 1) {
        laps++; L.push('       ' + q.kind + '@' + q.foot.join(',') + ' runs into the perimeter');
      }
    }
    ok(laps === 0, 'nothing parked inside a building or a fence (' + laps + ')');

    L.push('');
    L.push('3. EVERY BUILDING OPENS, AND YOU CAN GET IN');
    const walk = []; for (let y = 0; y < H; y++) walk.push(new Uint8Array(W));
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!solid[y][x]) walk[y][x] = 1;
    const seen = []; for (let y = 0; y < H; y++) seen.push(new Uint8Array(W));
    const q0 = [[58, 32]]; seen[32][58] = 1;
    while (q0.length) { const [x, y] = q0.pop();
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x+dx, ny = y+dy;
        if (nx<1||ny<1||nx>=W-1||ny>=H-1||!walk[ny][nx]||seen[ny][nx]) continue;
        seen[ny][nx]=1; q0.push([nx,ny]); } }
    const roofs = currentAreaDef().roofs || [];
    let shut = 0;
    for (const r of roofs) {
      let inside = 0, reach = 0;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
        if (!walk[y][x]) continue; inside++; if (seen[y][x]) reach++;
      }
      // WHICH ROOM IS THE BUNKER — by the blast door standing on its edge, not
      // by a hard-coded x. The first version of this looked for x0 >= 84, which
      // stopped being true the moment the bunker moved and then reported the
      // ordnance bunker as a broken room.
      const isBunker = Quests.bunker !== 'open' && props.some(q => q.type === 'blastDoor' &&
        q.gx >= r.x0 - 1 && q.gx <= r.x1 + 1 && q.gy >= r.y0 - 1 && q.gy <= r.y1 + 1);
      const good = isBunker ? reach === 0 : reach > 0;
      if (!good) shut++;
      L.push('       room ' + r.x0 + ',' + r.y0 + '-' + r.x1 + ',' + r.y1 +
             '  floor ' + inside + '  reachable ' + reach +
             (isBunker ? '   (shut by design until you have the key)' : ''));
    }
    ok(shut === 0, 'every room is reachable except the locked bunker');

    L.push('');
    L.push('4. NOTHING WALKS INTO AN AEROPLANE');
    const air = hw.filter(q => /^ac|^heli/.test(q.kind));
    const maskOf = q => new Set(hardwareTiles(q.kind, q.foot[2], q.foot[3])
      .map(([dx, dy]) => (q.foot[0]+dx) + ',' + (q.foot[1]+dy)));
    const masks = air.map(maskOf);
    let holes = 0, crossable = 0;
    air.forEach((q, i) => {
      const [x0, y0, w, h] = q.foot;
      const cov = painted(q.kind, q.foot).filter(([x, y]) =>
        x >= x0 && x < x0+w && y >= y0 && y < y0+h);
      for (const [x, y] of cov) if (!solid[y][x]) holes++;
      // through, not around: stay in the aircraft's own rows
      const st = [[x0 - 1, y0 + Math.floor(h/2)]], vis = new Set();
      let through = false;
      while (st.length) { const [x, y] = st.pop(); const k = x+','+y;
        if (vis.has(k)) continue; vis.add(k);
        if (x > x0 + w) { through = true; break; }
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx, ny=y+dy;
          if (nx < x0-1 || nx > x0+w+1 || ny < y0 || ny > y0+h-1) continue;
          if (solid[ny] && solid[ny][nx]) continue; st.push([nx,ny]); } }
      if (through) { crossable++; L.push('       ' + q.kind + ' can be walked through'); }
    });
    ok(holes === 0, 'no tile an aircraft covers is walkable (' + holes + ')');
    ok(crossable === 0, 'no aircraft can be crossed through (' + crossable + ')');

    L.push('');
    L.push('5. THE PATROLS WALK, AND STAY OUT OF THE AIRCRAFT');
    const span = mps.map(m => ({ x0: m.x, x1: m.x, y0: m.y, y1: m.y }));
    let inPlane = 0;
    for (let f = 0; f < 60 * 90; f++) {
      updateWatch(1/60);
      mps.forEach((m, i) => {
        const s = span[i];
        s.x0 = Math.min(s.x0, m.x); s.x1 = Math.max(s.x1, m.x);
        s.y0 = Math.min(s.y0, m.y); s.y1 = Math.max(s.y1, m.y);
        for (const [cx, cy] of [[m.x-m.r,m.y-m.r],[m.x+m.r,m.y-m.r],
                                [m.x-m.r,m.y+m.r],[m.x+m.r,m.y+m.r]]) {
          const k = Math.floor(cx) + ',' + Math.floor(cy);
          if (masks.some(s2 => s2.has(k))) { inPlane++; break; }
        }
      });
      Watch.seen = 0;
    }
    const walked = span.map(s => Math.round(Math.max(s.x1 - s.x0, s.y1 - s.y0)));
    L.push('       tiles covered in 90s: ' + walked.join(', '));
    ok(walked.every(v => v > 10), 'no patrol is walled in');
    ok(inPlane === 0, 'no patrol ever stands inside an aircraft (' + inPlane + ')');

    L.push('');
    L.push('6. THE FIVE CROSSINGS, GRADED');
    const FY = 15, GATE = 58;
    const CROSS = [
      ['CULVERT (crouch)', [56,57], [FY-1, FY+1]],
      ['BOWSER SQUEEZE',   [46,47], [FY-1, FY, FY+1]],
      ['EAST SERVICE GAP', [78,79], [FY-1, FY, FY+1]],
      ['FLATTENED WIRE',   [33,36], [FY-1, FY, FY+1]],
      ['WEST GAP',         [19,21], [FY-1, FY, FY+1]],
    ];
    const lit = (x, y) => {
      for (const c of cameras) { const e = camEye(c);
        const dx = x+0.5-e.x, dy = y+0.5-e.y, d = Math.hypot(dx, dy);
        if (d > WATCH.camRange) continue;
        let a = Math.atan2(dy, dx) - c.aim;
        while (a > Math.PI) a -= Math.PI*2; while (a < -Math.PI) a += Math.PI*2;
        if (Math.abs(a) > WATCH.camArc) continue;
        if (!losClear(e.x, e.y, x+0.5, y+0.5)) continue;
        return true; }
      return false;
    };
    const FR = 60 * 24, blocked = CROSS.map(() => 0);
    for (let f = 0; f < FR; f++) {
      updateWatch(1/60);
      CROSS.forEach(([, xs, rows], i) => {
        for (let x = xs[0]; x <= xs[1]; x++) if (!rows.some(y => lit(x, y))) return;
        blocked[i]++;
      });
      Watch.seen = 0;
    }
    const rows = CROSS.map(([n, xs], i) => ({ n,
      dist: Math.min(...xs.map(x => Math.abs(x - GATE))), frac: blocked[i] / FR }));
    for (const r of rows)
      L.push('       ' + r.n.padEnd(18) + String(r.dist).padStart(3) + ' tiles out   ' +
             (r.frac*100).toFixed(0).padStart(3) + '% no lane');
    const byDist = rows.slice().sort((a, c) => a.dist - c.dist);
    let mono = true;
    for (let i = 1; i < byDist.length; i++) if (byDist[i].frac > byDist[i-1].frac + 0.03) mono = false;
    ok(mono, 'nearer the gate is never easier');
    // sealed: nothing north
    const sealed = new Set();
    for (const [, xs] of CROSS) for (let x = xs[0]; x <= xs[1]; x++) sealed.add(x + ',' + FY);
    const s2 = []; for (let y = 0; y < H; y++) s2.push(new Uint8Array(W));
    const q2 = [[58,32]]; s2[32][58] = 1;
    while (q2.length) { const [x,y] = q2.pop();
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx, ny=y+dy;
        if (nx<1||ny<1||nx>=W-1||ny>=H-1||!walk[ny][nx]||s2[ny][nx]) continue;
        if (sealed.has(nx+','+ny)) continue;
        s2[ny][nx]=1; q2.push([nx,ny]); } }
    let north = 0;
    for (let y = 1; y < FY; y++) for (let x = 1; x < W-1; x++) if (s2[y][x]) north++;
    ok(north === 0, 'sealing all five leaves nothing north (' + north + ')');

    L.push('');
    L.push('7. THE CULVERT');
    ok(isSolid(56, FY) && isSolid(57, FY), 'solid to the world');
    ok(!losClear(56.5, FY-2, 56.5, FY+2), 'no cone sees down it');
    player.crouch = false;
    const up = playerCanStand(56.5, FY+0.5, player.r);
    player.crouch = true;
    const down = playerCanStand(56.5, FY+0.5, player.r);
    player.x = 56.5; player.y = FY + 1.5;
    for (let i = 0; i < 400; i++) tryMove(player, 0, -0.02);
    const through = player.y < FY - 0.2;
    player.crouch = false;
    ok(!up, 'standing, you cannot enter it');
    ok(down, 'crouched, you can');
    ok(!canStand(56.5, FY+0.5, 0.36), 'a droid cannot');
    ok(through, 'and you can crawl all the way through');

    L.push('');
    L.push('8. WHERE THE BUILDINGS ARE  (the reference has them all on one side)');
    const nb = blds.filter(q => q.foot[1] < FY).length;
    const sb = blds.filter(q => q.foot[1] >= FY).length;
    L.push('       north of the fence: ' + nb + '     south: ' + sb);
    ok(sb === 0, 'no buildings on the open side');

    return { text: L.join('\n'), fails };
  });

  console.log(out.text);
  console.log('');
  console.log(out.fails === 0 ? 'ALL CHECKS PASSED' : out.fails + ' CHECK(S) FAILED');
  if (errs.length) console.log('\nCONSOLE:\n' + errs.slice(0, 8).join('\n'));
  else console.log('no console errors');
  await b.close();
  process.exit(out.fails === 0 && errs.length === 0 ? 0 : 1);
})();
