// Player, the Scrapper, the NPC, items, bullets, dialogue, mission, trading.
const player = {
  x: 6.5, y: 26.5, r: 0.22,
  hp: 100, maxHp: 100,
  angle: 0,
  moving: false, animT: 0, frame: 0,
  fireCd: 0, muzzle: 0,
  swing: 0, swingCd: 0,
  iframes: 0, flash: 0, dead: 0,
  melee: null,                 // EQUIPPED melee: null | 'pipe' | 'knife'
  hasGun: false, ammo: 0,      // hasGun = pistol EQUIPPED
  owned: { pipe: false, knife: false, pistol: false },
  inv: { scrap: 0, tech: 0, snack: 0, gateKey: false },
};

// melee outranges the Scrapper's reach (1.15) — spacing is the skill
const MELEE = {
  pipe: { dmg: 7, cd: 0.55, range: 1.5, label: 'Metal pipe' },
  knife: { dmg: 14, cd: 0.4, range: 1.35, label: 'Piercing knife' },
};

// ---- staged tutorial: freezes the world briefly and explains one thing ----
const Tut = { active: null, done: {} };
function tutShow(id, lines, keys, footer) {
  if (Tut.done[id]) return;
  Tut.done[id] = true;
  Tut.active = { id, lines, keys, footer, grace: 0.3 };
}

const bullets = [];

// items lying in the world (glowing pickups)
const items = [
  { type: 'pipe', x: 9.5, y: 23.5, bob: 0 },
  { type: 'ammo', x: 14.5, y: 21.5, amount: 6, bob: 1.3 },
  { type: 'ammo', x: 25.5, y: 26.5, amount: 6, bob: 2.1 },
];

// pick an enemy spawn point tucked behind a trash mountain, away from the player
function pickSpawn() {
  const far = moundSpawns.filter(p => Math.hypot(p.x - player.x, p.y - player.y) > 9);
  const pool = far.length ? far : moundSpawns;
  if (pool.length) return pool[(Math.random() * pool.length) | 0];
  return { x: 24.5, y: 18.5 };
}

const scrapper = {
  spawnX: 24.5, spawnY: 18.5,
  x: 24.5, y: 18.5, r: 0.3,
  hp: 30, maxHp: 30,
  state: 'wander', t: 0,
  tx: 24.5, ty: 18.5,
  animT: 0, frame: 0,
  hitFlash: 0, respawn: 0, didHit: false,
  kbx: 0, kby: 0,
  kills: 0, looted: false,
  detour: 0, detourX: 0, detourY: 0,   // makeshift brain: sidestep obstacles
};
{
  const sp = pickSpawn();
  scrapper.x = sp.x; scrapper.y = sp.y;
  scrapper.tx = sp.x; scrapper.ty = sp.y;
  scrapper.state = 'seek';
}

const npc = { x: 21.5, y: 6.5, animT: 0, frame: 0 };

const Dialog = { active: false, lines: [], idx: 0 };
function startDialog(lines) { Dialog.active = true; Dialog.lines = lines; Dialog.idx = 0; }

const Trade = { open: false };
const InvUI = { open: false };

const mission = { state: 'none' };   // none -> active -> complete -> turned

const Msg = { text: '', t: 0 };
function showMsg(text, dur = 2.5) { Msg.text = text; Msg.t = dur; }

let Prompt = null;

const SPEED = 4.0;

function tryMove(e, dx, dy) {
  if (dx !== 0 && canStand(e.x + dx, e.y, e.r)) e.x += dx;
  if (dy !== 0 && canStand(e.x, e.y + dy, e.r)) e.y += dy;
}

function updatePlayer(dt) {
  if (player.dead > 0) {
    player.dead -= dt;
    if (player.dead <= 0) {
      player.x = 6.5; player.y = 26.5;
      player.hp = player.maxHp; player.iframes = 1.2;
    }
    return;
  }

  let ix = 0, iy = 0;
  if (Input.keys['KeyW'] || Input.keys['ArrowUp']) iy -= 1;
  if (Input.keys['KeyS'] || Input.keys['ArrowDown']) iy += 1;
  if (Input.keys['KeyA'] || Input.keys['ArrowLeft']) ix -= 1;
  if (Input.keys['KeyD'] || Input.keys['ArrowRight']) ix += 1;
  let wx = (ix + iy), wy = (iy - ix);
  const len = Math.hypot(wx, wy);
  if (len > 0) { wx /= len; wy /= len; }
  player.moving = len > 0;

  player.iframes -= dt; player.flash -= dt;
  if (player.moving) {
    tryMove(player, wx * SPEED * dt, wy * SPEED * dt);
    player.animT += dt;
    if (player.animT > 0.14) { player.animT = 0; player.frame = 1 - player.frame; }
  } else {
    player.frame = 0;
  }

  const ps = isoToScreen(player.x, player.y);
  const ms = isoToScreen(Input.worldX, Input.worldY);
  player.angle = Math.atan2(ms.y - ps.y, ms.x - ps.x);

  // ---- shooting (left mouse) ----
  player.fireCd -= dt; player.muzzle -= dt;
  player.swing -= dt; player.swingCd -= dt;
  if (Input.mouseDown && player.fireCd <= 0 && player.hasGun) {
    if (player.ammo > 0) {
      player.ammo--;
      player.fireCd = 0.5; player.muzzle = 0.06;
      const dirW = screenToIso(Math.cos(player.angle), Math.sin(player.angle));
      const dl = Math.hypot(dirW.x, dirW.y);
      bullets.push({
        x: player.x + (dirW.x / dl) * 0.35, y: player.y + (dirW.y / dl) * 0.35,
        vx: (dirW.x / dl) * 13, vy: (dirW.y / dl) * 13, life: 0.5,
      });
      addShake(1.2);
    } else {
      player.fireCd = 0.35;
      showMsg('OUT OF AMMO — use your melee (RMB)', 1.5);
    }
  }

  // ---- melee swing: just click where you want to swing.
  // No gun yet: left click swings. With a gun: LMB shoots, RMB swings.
  const wantSwing = Input.rPressed || (!player.hasGun && Input.pressed['LMB']);
  if (wantSwing && player.swingCd <= 0 && player.melee) {
    const m = MELEE[player.melee];
    player.swing = 0.22; player.swingCd = m.cd;
    addShake(1);
    if (scrapper.state !== 'dead') {
      const dx = scrapper.x - player.x, dy = scrapper.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < m.range) {
        const ss = isoToScreen(scrapper.x, scrapper.y);
        const a = Math.atan2(ss.y - ps.y, ss.x - ps.x);
        let diff = Math.abs(a - player.angle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 1.3) {
          scrapper.hp -= m.dmg;
          scrapper.hitFlash = 0.08;
          scrapper.kbx += (dx / (d || 1)) * 0.10;
          scrapper.kby += (dy / (d || 1)) * 0.10;
          spawnSparks(scrapper.x, scrapper.y, 6, ['#ffd27a', '#c9c9d2']);
          addShake(2);
          if (scrapper.hp <= 0) killScrapper();
        }
      }
    }
  }

  // ---- eat snack bar ----
  if (Input.pressed['KeyH']) {
    Input.pressed['KeyH'] = false;
    if (player.inv.snack > 0 && player.hp < player.maxHp) {
      player.inv.snack--;
      player.hp = Math.min(player.maxHp, player.hp + 40);
      showMsg('Ate a snack bar  (+40 HP)');
    } else if (player.inv.snack <= 0) {
      showMsg('No snack bars — the survivor trades them', 1.8);
    }
  }
}

// ---- interactions: items, NPC, lootable wrecks ----
function updateItems(dt) {
  Prompt = null;
  if (player.dead > 0) return;

  let best = null, bestD = 1.1, bestKind = null;
  for (const it of items) {
    const d = Math.hypot(player.x - it.x, player.y - it.y);
    if (d < bestD) { bestD = d; best = it; bestKind = 'item'; }
  }
  const npcD = Math.hypot(player.x - npc.x, player.y - npc.y);
  if (npcD < 1.3 && npcD < bestD) { bestD = npcD; best = npc; bestKind = 'npc'; }
  if (scrapper.state === 'dead' && !scrapper.looted) {
    const d = Math.hypot(player.x - scrapper.x, player.y - scrapper.y);
    if (d < 1.1 && d < bestD) { bestD = d; best = scrapper; bestKind = 'wreck'; }
  }

  if (bestKind === 'npc') {
    const s = isoToScreen(npc.x, npc.y);
    Prompt = { sx: s.x, sy: s.y - 30, text: mission.state === 'turned' ? 'E — trade' : 'E — talk' };
    if (Input.pressed['KeyE']) { Input.pressed['KeyE'] = false; talkToNpc(); }
  } else if (bestKind === 'wreck') {
    const s = isoToScreen(scrapper.x, scrapper.y);
    Prompt = { sx: s.x, sy: s.y - 20, text: 'E — loot wreck' };
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      const n = 1 + ((Math.random() < 0.5) ? 1 : 0);
      player.inv.scrap += n;
      let extra = '';
      if (Math.random() < 0.2) { player.inv.tech++; extra = '  · +1 tech component'; }
      showMsg(`Looted ${n} scrap${extra}`);
      spawnSparks(scrapper.x, scrapper.y, 5, ['#8a8a92', '#ffd27a']);
      scrapper.looted = true;
      scrapper.respawn = Math.min(scrapper.respawn, 6);
      tutShow('loot',
        ['Dead machines can be looted for scrap', 'and rare tech components.', 'Press I to open your pack.'],
        ['KeyI', 'Tab'], 'PRESS I');
    }
  } else if (bestKind === 'item') {
    const s = isoToScreen(best.x, best.y);
    Prompt = { sx: s.x, sy: s.y - 22, text: 'E — pick up' };
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      if (best.type === 'pipe') {
        player.owned.pipe = true;
        player.melee = 'pipe';
        showMsg('METAL PIPE acquired');
        tutShow('melee',
          ['Click toward a target to swing the pipe.', 'It outranges the machines — strike from', 'the edge of your reach.'],
          ['LMB'], 'CLICK TO CONTINUE');
      } else {
        player.ammo += best.amount;
        showMsg(`+${best.amount} rounds`);
      }
      spawnSparks(best.x, best.y, 8, ['#ffd27a', '#fff2c0']);
      items.splice(items.indexOf(best), 1);
    }
  }
}

function talkToNpc() {
  if (mission.state === 'none') {
    startDialog([
      "You're awake. Found you half-dead by the fence.",
      "A scout prowls this yard — a Scrapper.",
      player.melee ? "That pipe will do. Crude, but it swings."
                   : "There's a steel pipe out in the junk. Arm yourself.",
      "Break the machine. Loot 5 scrap off the wrecks.",
    ]);
    mission.state = 'active';
  } else if (mission.state === 'active') {
    startDialog(["Smash the Scrapper. Bring me 5 scrap."]);
  } else if (mission.state === 'complete') {
    startDialog([
      "Ha. Not bad for a corpse.",
      "Take this — my old sidearm. Six rounds in the mag.",
      "And these — keys to the yard gate.",
      "When you're ready, the city waits beyond it.",
      "Bring me scrap meanwhile — I trade. Food, rounds, steel.",
    ]);
    mission.state = 'turned';
    player.owned.pistol = true;
    player.hasGun = true;
    player.ammo += 6;
    player.inv.gateKey = true;
    showMsg('SCRAP PISTOL + YARD GATE KEY acquired', 3.5);
    tutShow('gun',
      ['LMB now fires the pistol.', 'RMB swings your melee weapon.', 'Rounds are scarce — melee when you can.'],
      'any', 'PRESS ANY KEY');
  } else {
    Trade.open = true;
  }
}

function tradeBuy(n) {
  const inv = player.inv;
  if (n === 1) {
    if (inv.scrap >= 4) { inv.scrap -= 4; inv.snack++; showMsg('Bought a snack bar  (H to eat)'); }
    else showMsg('Not enough scrap (need 4)', 1.5);
  } else if (n === 2) {
    if (inv.scrap >= 6) { inv.scrap -= 6; player.ammo += 6; showMsg('Bought 6 rounds'); }
    else showMsg('Not enough scrap (need 6)', 1.5);
  } else if (n === 3) {
    if (player.owned.knife) { showMsg('Already own the knife', 1.5); return; }
    if (inv.scrap >= 15) {
      inv.scrap -= 15;
      player.owned.knife = true;
      player.melee = 'knife';
      showMsg('PIERCING KNIFE acquired');
    } else showMsg('Not enough scrap (need 15)', 1.5);
  }
}

function updateMission() {
  if (mission.state === 'active' && scrapper.kills >= 1 && player.inv.scrap >= 5) {
    mission.state = 'complete';
    showMsg('Objective done — return to the survivor', 3);
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    let hit = b.life <= 0;
    if (isSolid(b.x, b.y)) {
      hit = true;
      spawnSparks(b.x, b.y, 4, ['#ffd27a', '#ffb02e', '#c9c9d2']);
    }
    if (scrapper.state !== 'dead' && Math.hypot(b.x - scrapper.x, b.y - scrapper.y) < 0.45) {
      hit = true;
      scrapper.hp -= 10;
      scrapper.hitFlash = 0.08;
      scrapper.kbx += b.vx * 0.02; scrapper.kby += b.vy * 0.02;
      spawnSparks(b.x, b.y, 6, ['#ffd27a', '#ffb02e', '#8a8a92']);
      addShake(0.8);
      if (scrapper.hp <= 0) killScrapper();
    }
    if (hit) bullets.splice(i, 1);
  }
}

function killScrapper() {
  scrapper.state = 'dead';
  scrapper.looted = false;
  scrapper.respawn = 30;        // lingers as a lootable wreck; 6s after looting
  scrapper.kills++;
  addShake(2.5);
  spawnSparks(scrapper.x, scrapper.y, 12, ['#ffd27a', '#ffb02e', '#8a8a92'], 3);
  spawnSmoke(scrapper.x, scrapper.y, 5);
}

function updateScrapper(dt) {
  const s = scrapper;
  s.hitFlash -= dt;
  if (s.kbx || s.kby) {
    tryMove(s, s.kbx, s.kby);
    s.kbx *= 0.7; s.kby *= 0.7;
    if (Math.abs(s.kbx) + Math.abs(s.kby) < 0.001) { s.kbx = 0; s.kby = 0; }
  }

  if (s.state === 'dead') {
    s.respawn -= dt;
    if (s.respawn <= 0) {
      const sp = pickSpawn();
      s.x = sp.x; s.y = sp.y;
      s.tx = sp.x; s.ty = sp.y;
      s.hp = s.maxHp; s.state = 'seek'; s.t = 0; s.looted = false;
    }
    return;
  }

  const playerSafe = insideShack(player.x, player.y);
  const distP = Math.hypot(player.x - s.x, player.y - s.y);
  s.animT += dt;
  if (s.animT > 0.22) { s.animT = 0; s.frame = 1 - s.frame; }

  switch (s.state) {
    case 'seek': {
      aiMove(s, player.x, player.y, 1.8 * dt, dt);
      if (distP < 6) {
        s.state = playerSafe ? 'wander' : 'chase';
        if (s.state === 'chase') tutEnemy();
      }
      break;
    }
    case 'wander': {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = 1.5 + Math.random() * 2;
        const a = Math.random() * Math.PI * 2, d = 1 + Math.random() * 2.5;
        s.tx = Math.min(MAP_W - 2, Math.max(1, s.x + Math.cos(a) * d));
        s.ty = Math.min(MAP_H - 2, Math.max(1, s.y + Math.sin(a) * d));
      }
      aiMove(s, s.tx, s.ty, 1.5 * dt, dt);
      if (distP < 5.5 && player.dead <= 0 && !playerSafe) { s.state = 'chase'; tutEnemy(); }
      break;
    }
    case 'chase': {
      aiMove(s, player.x, player.y, 2.5 * dt, dt);
      if (distP < 0.95) { s.state = 'windup'; s.t = 0.45; s.didHit = false; }
      else if (distP > 7.5 || player.dead > 0 || playerSafe) s.state = 'wander';
      break;
    }
    case 'windup': {
      s.t -= dt;
      if (s.t <= 0) { s.state = 'swing'; s.t = 0.16; }
      break;
    }
    case 'swing': {
      if (!s.didHit) {
        s.didHit = true;
        const d = Math.hypot(player.x - s.x, player.y - s.y);
        if (d < 1.15 && player.iframes <= 0 && player.dead <= 0) {
          player.hp -= 15;
          player.iframes = 0.5; player.flash = 0.28;
          addShake(4);
          spawnSparks(player.x, player.y, 5, ['#ff5a3c', '#ffb02e']);
          const kx = (player.x - s.x) / (d || 1), ky = (player.y - s.y) / (d || 1);
          tryMove(player, kx * 0.5, ky * 0.5);
          if (player.hp <= 0) { player.hp = 0; player.dead = 2; }
        }
      }
      s.t -= dt;
      if (s.t <= 0) { s.state = 'recover'; s.t = 0.45; }
      break;
    }
    case 'recover': {
      s.t -= dt;
      if (s.t <= 0) s.state = (distP < 5.5 && !playerSafe) ? 'chase' : 'wander';
      break;
    }
  }
}

function moveToward(e, tx, ty, step) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) return;
  tryMove(e, (dx / d) * step, (dy / d) * step);
}

// makeshift robot brain: walk at the target, and when blocked by junk,
// pick a sidestep direction that is actually open and follow it briefly
function aiMove(s, tx, ty, step, dt) {
  if (s.detour > 0) {
    s.detour -= dt;
    const ox = s.x, oy = s.y;
    tryMove(s, s.detourX * step, s.detourY * step);
    if (Math.hypot(s.x - ox, s.y - oy) > step * 0.3) return;  // detour is working
    s.detour = 0;                                              // detour blocked too
  }
  const dx = tx - s.x, dy = ty - s.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) return;
  const bx = dx / d, by = dy / d;
  const ox = s.x, oy = s.y;
  tryMove(s, bx * step, by * step);
  if (Math.hypot(s.x - ox, s.y - oy) < step * 0.3) {
    // stuck: probe rotated directions (nearest deviations first, random side)
    const base = Math.atan2(by, bx);
    const side = Math.random() < 0.5 ? 1 : -1;
    for (const da of [0.9, -0.9, 1.6, -1.6, 2.3, -2.3]) {
      const a = base + da * side;
      const nx = Math.cos(a), ny = Math.sin(a);
      if (canStand(s.x + nx * 0.45, s.y + ny * 0.45, s.r)) {
        s.detour = 0.4 + Math.random() * 0.4;
        s.detourX = nx; s.detourY = ny;
        return;
      }
    }
  }
}

function updateNpc(dt) {
  npc.animT += dt;
  if (npc.animT > 0.6) { npc.animT = 0; npc.frame = 1 - npc.frame; }
}

function tutEnemy() {
  tutShow('enemy',
    ['A Scrapper is hunting you.', 'It flashes red before it strikes —', 'back off, then hit it at max range.'],
    'any', 'PRESS ANY KEY');
}
