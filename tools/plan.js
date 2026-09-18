// AIRFIELD 12 — a plan of the field, drawn from the running game.
//
//   node tools/plan.js [out.png]     (needs `python3 serve.py` on 8123)
//
// Ground, collision, building footprints, the real camera cones, the real
// patrol lines and the five crossings all come out of the live build, so the
// picture cannot describe a field the game does not have.
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8123;
const OUT = process.argv[2] || 'design/airfield-plan.png';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1700, height: 900 } });
  p.on('pageerror', e => console.log('THROW', e.message));
  await p.addInitScript(() => { window.TEST_MODE = true; });
  await p.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(1600);

  const plan = await p.evaluate(() => {
    GameState = 'playing'; playerName = 'P'; Tut.active = null; window.tutShow = () => {};
    Watch.firstSight = true; Quests.provost = 'alive'; Watch.networkDown = false;
    enterArea('field12', { x: 58.5, y: 32.5 });
    player.x = 58.5; player.y = 32.5;
    const W = MAP_W, H = MAP_H, FY = 15;

    const DEFS = [
      { name: 'CULVERT', x0: 56, x1: 57, rows: [14, 16], crawl: true, lx: 60, ly: 20.6 },
      { name: 'BOWSER SQUEEZE', x0: 46, x1: 47, rows: [14, 15, 16], lx: 45, ly: 22.6 },
      { name: 'EAST GAP', x0: 78, x1: 79, rows: [14, 15, 16], lx: 84, ly: 20.6 },
      { name: 'FLATTENED WIRE', x0: 33, x1: 36, rows: [14, 15, 16], lx: 34, ly: 24.6 },
      { name: 'WEST GAP', x0: 19, x1: 21, rows: [14, 15, 16], lx: 15, ly: 20.6 },
    ];
    const lit = (x, y) => {
      for (const c of cameras) { const e = camEye(c);
        const dx = x + .5 - e.x, dy = y + .5 - e.y, d = Math.hypot(dx, dy);
        if (d > WATCH.camRange) continue;
        let a = Math.atan2(dy, dx) - c.aim;
        while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
        if (Math.abs(a) > WATCH.camArc) continue;
        if (!losClear(e.x, e.y, x + .5, y + .5)) continue;
        return true; }
      return false;
    };
    const FR = 60 * 24, hits = DEFS.map(() => 0);
    for (let f = 0; f < FR; f++) {
      updateWatch(1 / 60);
      DEFS.forEach((d, i) => {
        for (let x = d.x0; x <= d.x1; x++) if (!d.rows.some(y => lit(x, y))) return;
        hits[i]++;
      });
      Watch.seen = 0;
    }
    return {
      W, H,
      ground: (() => { const a = []; for (let y = 0; y < H; y++) a.push(Array.from(ground[y])); return a; })(),
      solid: (() => { const a = []; for (let y = 0; y < H; y++) a.push(Array.from(solid[y], v => v ? 1 : 0)); return a; })(),
      buildings: props.filter(q => q.type === 'building').map(q => ({ foot: q.foot, kind: q.kind })),
      hardware: props.filter(q => q.kind && q.type !== 'building' && q.foot)
        .map(q => ({ foot: q.foot, kind: q.kind })),
      cams: cameras.map(c => { const e = camEye(c);
        return { ex: e.x, ey: e.y, face: c.face, half: WATCH.camArc + c.sweep, range: WATCH.camRange }; }),
      routes: currentAreaDef().mpRoutes || [],
      crossings: DEFS.map((d, i) => ({ ...d, blocked: hits[i] / FR,
        dist: Math.min(Math.abs(d.x0 - 58), Math.abs(d.x1 - 58)) })),
    };
  });

  const page2 = await b.newPage({ viewport: { width: 1700, height: 900 } });
  await page2.setContent('<body style="margin:0;background:#12161a"><canvas id=c></canvas></body>');
  await page2.evaluate((P) => {
    const T = 16, PADL = 40, PADT = 92, PADB = 150, PADR = 40;
    const cv = document.getElementById('c');
    cv.width = P.W * T + PADL + PADR; cv.height = P.H * T + PADT + PADB;
    const g = cv.getContext('2d');
    const X = x => PADL + x * T, Y = y => PADT + y * T;
    const outline = (t, x, y, fill) => {
      g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(t, x, y);
      g.fillStyle = fill; g.fillText(t, x, y);
    };
    g.fillStyle = '#12161a'; g.fillRect(0, 0, cv.width, cv.height);
    const GC = { 17: '#4e5052', 18: '#414345', 19: '#a08c66', 20: '#837a6a' };
    for (let y = 0; y < P.H; y++) for (let x = 0; x < P.W; x++) {
      g.fillStyle = GC[P.ground[y][x]] || '#6b6355'; g.fillRect(X(x), Y(y), T, T);
    }
    for (let y = 0; y < P.H; y++) for (let x = 0; x < P.W; x++) if (P.solid[y][x]) {
      g.fillStyle = 'rgba(22,26,30,0.88)'; g.fillRect(X(x), Y(y), T, T);
    }
    for (const c of P.cams) {
      const gr = g.createRadialGradient(X(c.ex), Y(c.ey), 0, X(c.ex), Y(c.ey), c.range * T);
      gr.addColorStop(0, 'rgba(255,66,58,0.34)'); gr.addColorStop(1, 'rgba(255,66,58,0.04)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(X(c.ex), Y(c.ey));
      g.arc(X(c.ex), Y(c.ey), c.range * T, c.face - c.half, c.face + c.half);
      g.closePath(); g.fill();
    }
    g.setLineDash([9, 7]); g.lineWidth = 3; g.strokeStyle = 'rgba(110,185,255,0.8)';
    for (const r of P.routes) { g.beginPath(); g.moveTo(X(r[0][0] + .5), Y(r[0][1] + .5));
      for (let i = 1; i < r.length; i++) g.lineTo(X(r[i][0] + .5), Y(r[i][1] + .5)); g.stroke(); }
    g.setLineDash([]);
    for (const c of P.cams) { g.fillStyle = '#ff5a4a';
      g.beginPath(); g.arc(X(c.ex), Y(c.ey), 5, 0, 7); g.fill();
      g.strokeStyle = '#160e0f'; g.lineWidth = 2; g.stroke(); }
    for (const bd of P.buildings) { const [x0, y0, w, h] = bd.foot;
      g.fillStyle = 'rgba(28,34,40,0.95)'; g.fillRect(X(x0), Y(y0), w * T, h * T);
      g.strokeStyle = '#93a6b4'; g.lineWidth = 2; g.strokeRect(X(x0) + 1, Y(y0) + 1, w * T - 2, h * T - 2); }
    for (const q of P.hardware) { const [x0, y0, w, h] = q.foot;
      g.strokeStyle = 'rgba(200,208,216,0.34)'; g.lineWidth = 1;
      g.strokeRect(X(x0) + .5, Y(y0) + .5, w * T - 1, h * T - 1); }
    for (const c of P.crossings) {
      const hot = c.blocked;
      const col = hot > 0.6 ? [255, 90, 74] : hot > 0.35 ? [255, 194, 58] : [120, 255, 170];
      const w = (c.x1 - c.x0 + 1) * T;
      g.fillStyle = 'rgba(' + col.join(',') + ',0.38)'; g.fillRect(X(c.x0), Y(15), w, T);
      g.strokeStyle = 'rgb(' + col.join(',') + ')'; g.lineWidth = 2.5;
      if (c.crawl) g.setLineDash([4, 3]);
      g.strokeRect(X(c.x0) + 1, Y(15) + 1, w - 2, T - 2); g.setLineDash([]);
      g.font = '700 11px system-ui, sans-serif'; g.textAlign = 'center';
      outline(c.name + (c.crawl ? '  (crawl)' : ''), X(c.lx), Y(c.ly), 'rgb(' + col.join(',') + ')');
      g.font = '600 10px system-ui, sans-serif';
      outline(c.dist + ' from the gate · watched ' + Math.round(hot * 100) + '%',
              X(c.lx), Y(c.ly) + 12, 'rgba(240,244,247,0.9)');
      g.strokeStyle = 'rgba(' + col.join(',') + ',0.7)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(c.lx), Y(c.ly) - 14);
      g.lineTo(X((c.x0 + c.x1) / 2 + .5), Y(15.5)); g.stroke();
    }
    g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'center';
    for (const [lx, ly, t] of [
      [7, 6.5, 'ORDNANCE'], [16, 6.5, 'SQUADRON'], [36.5, 5.5, 'CONTROL TOWER'],
      [51, 6.5, 'TENDER SHED'], [63, 6.5, 'HANGAR 1'], [74, 6.5, 'HANGAR 2'],
      [81.5, 11.0, 'HELIPAD'], [88, 8.5, 'VEHICLES'],
      [24, 12.8, 'APRON'], [63, 19.0, 'RUNWAY  23 / 05'],
      [10, 26.8, 'BLAST PEN'], [63, 26.0, 'THE WRECK'], [24, 34.0, 'PERIMETER ROAD'],
    ]) outline(t, X(lx), Y(ly), '#e8eef2');
    g.font = '700 12px system-ui, sans-serif';
    outline('GATE  (from the Fringe)', X(58.5), Y(35.6), '#9ff0c0');
    outline('WEST BREACH', X(12), Y(23.4), '#9ff0c0');
    outline('OPEN DESERT — nothing built on this side', X(40), Y(30.5), 'rgba(255,255,255,0.5)');
    g.textAlign = 'left';
    g.fillStyle = '#f2f5f7'; g.font = '700 28px system-ui, sans-serif';
    g.fillText('AIRFIELD 12 — everything on one side of the runway', PADL, 44);
    g.fillStyle = '#9fb0bd'; g.font = '15px system-ui, sans-serif';
    g.fillText('Plan read out of the running game. Six buildings, all north of the wire; the south is sand, the blast pen and the wreck. The five ways through the',
      PADL, 70);
    g.fillText('apron fence are coloured by how much of a sweep a cone is sitting on them — red is a stare, green is a walk.', PADL, 88);
    const ly0 = PADT + P.H * T + 34;
    g.font = '600 14px system-ui, sans-serif';
    [['rgba(255,66,58,0.55)', 'camera cone, full sweep envelope'],
     ['rgba(110,185,255,0.85)', 'military-police patrol line'],
     ['#93a6b4', 'building — six now, was eight'],
     ['rgba(200,208,216,0.5)', 'parked hardware']].forEach((k, i) => {
      const yy = ly0 + i * 24;
      g.fillStyle = k[0]; g.fillRect(PADL, yy - 11, 26, 12);
      g.fillStyle = '#dfe7ec'; g.fillText(k[1], PADL + 38, yy);
    });
  }, plan);
  const dim = await page2.evaluate(() => { const c = document.getElementById('c');
    return { w: c.width, h: c.height }; });
  await page2.setViewportSize({ width: Math.min(4000, dim.w + 20), height: Math.min(4000, dim.h + 20) });
  await (await page2.$('#c')).screenshot({ path: OUT });
  console.log('wrote ' + OUT);
  await b.close();
})();
