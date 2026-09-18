// THE NORTH'S QUEST CHAIN, driven end to end. Every fitting on Airfield 12
// moved when the field was rebuilt onto one side, so this walks the whole
// chain and checks each one is still where the story needs it.
//
//   node tools/quests.js          (needs `python3 serve.py` running on 8123)
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
    const L = []; let fails = 0;
    const ok = (c, line) => { if (!c) fails++; L.push((c ? '  ok   ' : '  FAIL ') + line); };
    const use = (type, extra) => {
      const q = props.find(r => r.type === type && (!extra || extra(r)));
      if (!q) return null;
      // stand beside it and use it the way the player does
      player.x = q.gx + 0.5; player.y = q.gy + 1.5;
      if (!canStand(player.x, player.y, player.r)) { player.x = q.gx + 1.5; player.y = q.gy + 0.5; }
      USABLE[type](q, false);
      if (Dialog.active) Dialog.active = false;
      return q;
    };
    // ANY tile of a room, not one named tile. The first version of this asked
    // whether (6,5) was reachable — which is the tile the bunker's own chest
    // stands on, so it answered "no" for a room you can walk straight into.
    const roomReachable = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
        if (!solid[y][x] && reachable(x, y)) return true;
      return false;
    };
    const reachable = (tx, ty) => {
      const W = MAP_W, H = MAP_H;
      const seen = []; for (let y = 0; y < H; y++) seen.push(new Uint8Array(W));
      const st = [[58, 32]]; seen[32][58] = 1;
      while (st.length) { const [x, y] = st.pop();
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x+dx, ny = y+dy;
          if (nx<1||ny<1||nx>=W-1||ny>=H-1||solid[ny][nx]||seen[ny][nx]) continue;
          seen[ny][nx] = 1; st.push([nx, ny]); } }
      return !!seen[ty][tx];
    };

    Quests = Object.assign({}, QUEST_DEFAULTS);
    Quests.q2 = 'done'; Quests.q3 = 'given'; Quests.s2 = 0;
    player.inv.bunkerKey = 0; player.inv.slate = 0;
    enterArea('field12', { x: 58.5, y: 32.5 });

    L.push('EVERY FITTING THE STORY NEEDS, AND WHERE IT ENDED UP');
    // the rack is up in the cab, not on the field — checked at the end
    const need = ['deadOfficer','orderBoard','blastDoor','deadCrew','deadScav',
                  'wrensPack','cradle','breaker','stairUp'];
    for (const t of need) {
      const q = props.find(r => r.type === t);
      ok(!!q, t.padEnd(13) + (q ? 'at ' + q.gx + ',' + q.gy : 'MISSING'));
    }
    // THREE, not two: cab in the control room, shed in the tender shed, pen in
    // a hangar. S2 counts all three.
    const tapes = props.filter(r => r.type === 'tape').map(r => r.tape).sort();
    ok(tapes.length === 3, 'tapes on the field: ' + tapes.join(', '));
    const chests = props.filter(r => r.type === 'chest').map(r => r.loot).sort();
    ok(chests.includes('crypt'), 'the bunker chest is here: ' + chests.join(', '));
    ok(props.filter(r => r.type === 'monitors').length === 4, 'four monitor banks in the control room');

    L.push('');
    L.push('CAN YOU STAND BESIDE EACH ONE');
    let unreachable = 0;
    for (const q of props) {
      if (!USABLE[q.type]) continue;
      let beside = false;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]])
        if (canStand(q.gx + 0.5 + dx, q.gy + 0.5 + dy, player.r)) beside = true;
      if (!beside) { unreachable++; L.push('       ' + q.type + ' at ' + q.gx + ',' + q.gy + ' has no tile beside it'); }
    }
    ok(unreachable === 0, 'every usable thing can be stood next to (' + unreachable + ' cannot)');

    L.push('');
    L.push('THE BUNKER');
    const BUNK = props.find(r => r.type === 'building' && r.kind === 'W');
    const BR = [BUNK.foot[0]+1, BUNK.foot[1]+1, BUNK.foot[0]+BUNK.foot[2]-2, BUNK.foot[1]+BUNK.foot[3]-2];
    ok(!roomReachable(...BR), 'shut, the inside is unreachable');
    use('blastDoor');
    ok(Quests.bunker === 'shut', 'and it stays shut with no key');
    use('deadOfficer');
    ok(player.inv.bunkerKey === 1, 'the duty officer still has the key');
    use('blastDoor');
    ok(Quests.bunker === 'open', 'it opens with the key');
    ok(roomReachable(...BR), 'and now you can get in');
    enterArea('field12', { x: 58.5, y: 32.5 });
    ok(roomReachable(...BR), 'and it stays open across a rebuild');

    L.push('');
    L.push('THE TAPES AND THE PACK');
    use('wrensPack');
    ok(Quests.s1 === 'done', "Wren's pack found");
    for (const t of ['cab', 'shed', 'pen']) {
      const before = Quests.s2 || 0;
      use('tape', r => r.tape === t);
      ok((Quests.s2 || 0) === before + 1, 'tape "' + t + '" picked up');
    }

    L.push('');
    L.push('THE RECORDING, UP THE TOWER');
    const stair = props.find(r => r.type === 'stairUp');
    ok(!!stair && reachable(stair.gx, stair.gy), 'the stair in the control room is reachable');
    // BEFORE entering, not after: spawnArchivistFor runs on area entry and
    // reads Quests.archivist, so setting it afterwards left the thing alive on
    // the rack and takeSlate correctly refused.
    Quests.archivist = 'dead';
    enterArea('towercab', { x: 8.5, y: 7.5 });
    const rk = props.find(r => r.type === 'rack');
    ok(!!rk, 'the rack is up in the cab' + (rk ? ' at ' + rk.gx + ',' + rk.gy : ''));
    use('rack');
    ok(Quests.q3 === 'done', 'the recording comes off the rack');

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
