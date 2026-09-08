// =====================================================================
// THE ARCHIVIST — the mini-boss in the tower cab, and what it is sitting on
//
// The recording is not in a crashed drone any more. It is where a recording
// would actually be: in the rack at the top of the control tower, where every
// camera on the field has been writing to for a year. You have to get up there
// without being seen, and then get it off the thing that is holding it.
//
// IT IS SMALL, AND IT IS NOT A SECOND PROVOST. One room, one mechanic, and the
// mechanic is the rule this whole area is built on:
//
//   PLUGGED IN   it is jacked into the rack, drawing charge, and the port on
//                its back is OPEN — amber, and therefore mortal. It cannot
//                move. This is your window and it is the only one.
//   LOOSE        it pulls the jack, goes dull plate, and comes at you. Nothing
//                you have touches it. You keep the rack between you.
//
// So the fight is a clock, not a duel: survive the loose phase, punish the
// plugged phase. A mini-boss should teach one thing and this one teaches the
// thing the field has been saying since the gate.
// =====================================================================
const archivist = {
  active: false,
  x: 0, y: 0, r: 0.42,
  fx: 0, fy: 1,
  hp: 120, maxHp: 120,
  state: 'idle',        // idle | plugged | pull | loose | jack | dead
  t: 0, anim: 0,
  aim: Math.PI / 2,
  hitFlash: 0,
  deadT: 0,
  homeX: 0, homeY: 0,   // the rack it plugs back into
  name: 'THE ARCHIVIST',
};

const ARCH = {
  plugged: 3.4,         // seconds of open port — the window you damage it in
  pull: 0.5,            // hauling the jack out; nothing lands
  loose: 6.0,           // and this long coming at you, untouchable
  jack: 0.6,            // plugging back in
  walk: 2.05,           // faster than the Provost. It is small and it is angry
  reach: 1.05,
  dmg: 11,
  hitCd: 0.9,
};

function spawnArchivist(x, y) {
  archivist.active = true;
  archivist.x = x; archivist.y = y;
  archivist.homeX = x; archivist.homeY = y;
  archivist.hp = archivist.maxHp;
  archivist.state = 'plugged';
  archivist.t = 0; archivist.hitFlash = 0; archivist.deadT = 0;
  archivist.aim = Math.PI / 2; archivist.fx = 0; archivist.fy = 1;
  archivist.hitCd = 0;
}
function clearArchivist() { archivist.active = false; archivist.state = 'idle'; }

function spawnArchivistFor(areaId) {
  clearArchivist();
  const A = Areas[areaId];
  if (!A || A.bossKind !== 'archivist') return;
  if (Quests && Quests.archivist === 'dead') return;
  spawnArchivist(A.bossAt.x, A.bossAt.y);
}

// AMBER MEANS OPEN, and here "open" means "still plugged in".
const archivistOpen = () =>
  archivist.active && (archivist.state === 'plugged' || archivist.state === 'jack');

function updateArchivist(dt) {
  if (!archivist.active) return;
  if (archivist.hitFlash > 0) archivist.hitFlash -= dt;
  if (archivist.state === 'dead') { archivist.deadT += dt; return; }
  if (typeof Cine !== 'undefined' && Cine.active) return;
  if (player.dead > 0) return;

  archivist.t += dt;
  archivist.anim += dt;
  if (archivist.hitCd > 0) archivist.hitCd -= dt;

  const dx = player.x - archivist.x, dy = player.y - archivist.y;
  const dist = Math.hypot(dx, dy);

  switch (archivist.state) {
    case 'plugged':
      // bolted to the rack by its own cable. It watches you and cannot follow.
      if (dist > 0.001) faceToward(archivist, dx, dy, dt);
      if (archivist.t >= ARCH.plugged) { archivist.state = 'pull'; archivist.t = 0; SFX.rage(); }
      break;

    case 'pull':
      addShake(0.8 * dt * 10);
      if (archivist.t >= ARCH.pull) { archivist.state = 'loose'; archivist.t = 0; }
      break;

    case 'loose':
      // dull plate, and it comes straight at you. There is no answer but space.
      if (dist > 0.001) {
        faceToward(archivist, dx, dy, dt);
        const step = ARCH.walk * dt;
        const nx = archivist.x + (dx / dist) * step, ny = archivist.y + (dy / dist) * step;
        if (canStand(nx, archivist.y, archivist.r)) archivist.x = nx;
        if (canStand(archivist.x, ny, archivist.r)) archivist.y = ny;
      }
      if (dist < ARCH.reach && archivist.hitCd <= 0 && player.iframes <= 0) {
        archivist.hitCd = ARCH.hitCd;
        hurtPlayer(ARCH.dmg, archivist.x, archivist.y);
      }
      if (archivist.t >= ARCH.loose) { archivist.state = 'jack'; archivist.t = 0; }
      break;

    case 'jack': {
      // it goes home to charge, and going home is what opens it again
      const hx = archivist.homeX - archivist.x, hy = archivist.homeY - archivist.y;
      const hd = Math.hypot(hx, hy);
      if (hd > 0.4) {
        const step = ARCH.walk * 1.25 * dt;
        const nx = archivist.x + (hx / hd) * step, ny = archivist.y + (hy / hd) * step;
        if (canStand(nx, archivist.y, archivist.r)) archivist.x = nx;
        if (canStand(archivist.x, ny, archivist.r)) archivist.y = ny;
        faceToward(archivist, hx, hy, dt);
      } else if (archivist.t >= ARCH.jack) {
        archivist.x = archivist.homeX; archivist.y = archivist.homeY;
        archivist.state = 'plugged'; archivist.t = 0;
        SFX.tech();
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------
// being hit — the same rule, one more time
// ---------------------------------------------------------------------
function hitArchivist(fromX, fromY, dmg) {
  if (!archivistOpen()) {
    spawnSparks(fromX, fromY, 4, ['#c9c9d2', '#8a8a92']);
    SFX.ricochet();
    if (typeof think === 'function')
      think('archPlug', 'Not while it is off the rack. Wait for it to plug back in.');
    return;
  }
  archivist.hp -= dmg;
  archivist.hitFlash = 0.09;
  spawnSparks(fromX, fromY, 6, ['#ffd27a', '#ffb02e']);
  SFX.hitMetal();
  if (typeof markTarget === 'function') markTarget(archivist);
  if (archivist.hp <= 0) killArchivist();
}
function archivistBulletHit(b) {
  if (!archivist.active || archivist.state === 'dead') return false;
  if (Math.hypot(b.x - archivist.x, b.y - archivist.y) >= 0.6) return false;
  hitArchivist(b.x, b.y, b.dmg || 10);
  return true;
}
function archivistMeleeHit(x, y, r, dmg) {
  if (!archivist.active || archivist.state === 'dead') return false;
  if (Math.hypot(x - archivist.x, y - archivist.y) > r + archivist.r) return false;
  hitArchivist(x, y, dmg);
  return true;
}

function killArchivist() {
  archivist.state = 'dead'; archivist.hp = 0; archivist.deadT = 0;
  spawnSparks(archivist.x, archivist.y, 18, ['#ffd27a', '#ffb02e', '#c9c9d2'], 3);
  spawnSmoke(archivist.x, archivist.y, 6);
  addShake(4);
  SFX.die();
  if (typeof Quests !== 'undefined') Quests.archivist = 'dead';
  showMsg('The rack is yours', 2.6);
  saveGame();
}

// dying up here retries the fight, not the run — the Compactor's contract
function resetArchivistFight() {
  if (!archivist.active || archivist.state === 'dead') return false;
  const A = currentAreaDef();
  if (!A || A.bossKind !== 'archivist') return false;
  foeBullets.length = 0;
  const s = A.safeSpawn;
  player.x = s.x; player.y = s.y;
  player.hp = player.maxHp;
  player.iframes = 2.5;
  spawnArchivist(archivist.homeX, archivist.homeY);
  showMsg('It plugs itself back in. Again.', 3);
  addShake(3);
  return true;
}
