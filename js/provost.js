// =====================================================================
// THE PROVOST — the boss of Airfield 12, in the room the field is watched from
//
// Military police call their commander the provost, and he is in the room with
// the monitors because that is where you would put him.
//
// HE IS THE ONE EXCEPTION TO THE FIELD'S RULE, AND THE EXCEPTION IS VISIBLE.
// Every other MP unit is dull plate and cannot be touched. This one is DOCKED
// IN A CHARGING CRADLE WITH ITS BACK PLATE OPEN — so it glows amber, so it can
// be hurt. That is not a special case invented for a boss fight; it is the
// Compactor's rule, kept, and the whole area is built to make the player
// notice the difference the moment they walk in.
//
// TWO PHASES, AND THE SECOND ONE MOVES THE WEAK POINT:
//   docked  the open plate faces the room. You can hit it from anywhere — but
//           it sweeps a cone across a small room, and being held in that cone
//           calls the swarm. In here. You keep moving.
//   loose   it tears out of the cradle and the open plate is now on its BACK.
//           You have to get behind it, which is the Magistrate's lesson at a
//           much higher tempo.
// =====================================================================
const provost = {
  active: false,
  x: 0, y: 0, r: 0.55,
  fx: 0, fy: 1,
  hp: 220, maxHp: 220,
  state: 'idle',        // idle | dock | tear | loose | dead
  t: 0, anim: 0,
  aim: Math.PI / 2,
  lock: 0,              // how long its own cone has held you — 1.2s is the swarm
  fireCd: 1.2,
  hitFlash: 0,
  homeX: 0, homeY: 0,
  deadT: 0,
  name: 'THE PROVOST',
};

const PROV = {
  arc: 0.42,            // its cone is narrow — it is a searchlight, not a wall
  range: 9,
  lockTime: 1.2,        // held this long and the swarm comes for you in here
  sweep: 2.6,           // seconds for one pass of the docked sweep
  dmg: 9,
  speedB: 14,
  walk: 1.55,
  turn: 2.2,
  phase2: 0.5,          // it tears out at half
};

function spawnProvost(x, y) {
  provost.active = true;
  provost.x = x; provost.y = y;
  provost.homeX = x; provost.homeY = y;
  provost.hp = provost.maxHp;
  provost.state = 'dock';
  provost.t = 0; provost.lock = 0; provost.aim = Math.PI / 2;
  provost.fx = 0; provost.fy = 1;
  provost.fireCd = 1.6;
  provost.hitFlash = 0; provost.deadT = 0;
}

function clearProvost() { provost.active = false; provost.state = 'idle'; }

// It is only in the room while the room still has it: once it is dead it stays
// dead, and `Quests.provost` is what remembers that across a save.
function spawnProvostFor(areaId) {
  clearProvost();
  const A = Areas[areaId];
  if (!A || !A.hasBoss || A.bossKind !== 'provost') return;
  if (Quests && Quests.provost === 'dead') { Watch.networkDown = true; return; }
  spawnProvost(A.bossAt.x, A.bossAt.y);
}

// AMBER MEANS OPEN, and where the opening IS is the whole of phase two.
const provostLit = (p) => p.active && p.state !== 'dead';

// How far its own cone has got with you, 0..1 — read by the HUD, never written
// back into the field's meter.
function provostLockFrac() {
  if (!provost.active || provost.state === 'dead') return 0;
  return Math.min(1, provost.lock / PROV.lockTime);
}

// IS THE PLAYER ACTUALLY IN THE FIGHT? The boss bar is the fight's furniture,
// not the area's: without this it hangs across the top of the screen from the
// moment you come through the vehicle gate, thirty-six tiles from the room he
// is standing in, over the top of the objective line. "In the fight" is "in
// the same room", and the room is already a rectangle on the area's roof list.
function provostEngaged() {
  if (!provost.active || provost.state === 'dead') return false;
  const A = currentAreaDef();
  for (const r of (A.roofs || [])) {
    const inside = (x, y) => x >= r.x0 - 0.5 && x <= r.x1 + 1.5 && y >= r.y0 - 0.5 && y <= r.y1 + 1.5;
    if (inside(provost.x, provost.y) && inside(player.x, player.y)) return true;
  }
  return false;
}

// IS THE FIGHT ACTUALLY RUNNING? Engagement is a room test, and a room test
// alone is not enough once it has torn loose and followed you out of the door.
// Still on its cradle and you are elsewhere on the field = not the fight.
function provostInPlay() {
  if (!provost.active || provost.state === 'dead') return false;
  return provost.state !== 'dock' || provostEngaged();
}

// docked: the plate faces the room, so any angle lands.
// loose:  the plate is on its back, so the round has to come from behind it.
function provostVulnerableFrom(wx, wy) {
  if (provost.state === 'dock' || provost.state === 'tear') return true;
  const dx = wx - provost.x, dy = wy - provost.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return true;
  // the shot comes from behind when it arrives on the side its facing points away from
  return (dx * provost.fx + dy * provost.fy) / d < -0.15;
}

function updateProvost(dt) {
  if (!provost.active) return;
  if (provost.hitFlash > 0) provost.hitFlash -= dt;
  if (provost.state === 'dead') { provost.deadT += dt; return; }
  if (typeof Cine !== 'undefined' && Cine.active) return;
  if (player.dead > 0) { provost.lock = 0; return; }

  provost.t += dt;
  provost.anim += dt;

  if (provost.state === 'tear') {
    // three quarters of a second of it hauling itself off the cradle. It cannot
    // be hurt here — not because it is invulnerable, but because the plate is
    // swinging shut as it stands up, and the player can see that happening.
    addShake(1.4 * dt * 10);
    if (provost.t >= 0.75) { provost.state = 'loose'; provost.t = 0; provost.fireCd = 0.9; }
    return;
  }

  const dx = player.x - provost.x, dy = player.y - provost.y;
  const dist = Math.hypot(dx, dy);

  if (provost.state === 'dock') {
    // bolted to the cradle, sweeping the room it has always swept
    const k = (provost.t % PROV.sweep) / PROV.sweep;
    provost.aim = Math.PI / 2 + Math.sin(k * Math.PI * 2) * 1.05;
    provost.fx = Math.cos(provost.aim); provost.fy = Math.sin(provost.aim);
  } else {
    // loose: it comes for you, and it turns slower than you can circle
    if (dist > 0.001) {
      const want = Math.atan2(dy, dx);
      let da = want - provost.aim;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      provost.aim += Math.max(-PROV.turn * dt, Math.min(PROV.turn * dt, da));
      provost.fx = Math.cos(provost.aim); provost.fy = Math.sin(provost.aim);
      if (dist > 2.2) {
        const step = PROV.walk * dt;
        const nx = provost.x + Math.cos(provost.aim) * step;
        const ny = provost.y + Math.sin(provost.aim) * step;
        if (canStand(nx, provost.y, provost.r)) provost.x = nx;
        if (canStand(provost.x, ny, provost.r)) provost.y = ny;
      }
    }
  }

  // ---- ITS CONE, and the thing that makes this fight the area's lesson ----
  // Held in it for 1.2 seconds and the swarm comes through that door. The same
  // rule as outside, in a room you cannot leave, against something that aims.
  let inCone = false;
  if (dist <= PROV.range) {
    let a = Math.atan2(dy, dx) - provost.aim;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    inCone = Math.abs(a) <= PROV.arc && losClear(provost.x, provost.y, player.x, player.y);
  }
  // IT KEEPS ITS OWN COUNTER AND NEVER TOUCHES THE FIELD'S.
  // This used to write `Watch.seen` directly, every frame, in both branches —
  // and `updateProvost` runs AFTER `updateWatch`, so a boss standing in a room
  // thirty tiles away silently reset the whole field's detection meter to zero
  // on every single frame. Cameras and patrols saw you perfectly well and the
  // meter could never rise. The HUD takes the larger of the two instead; see
  // `seenLevel()`.
  if (inCone) {
    provost.lock += dt;
    if (provost.lock >= PROV.lockTime) {
      provost.lock = 0;
      if (typeof triggerSwarm === 'function') triggerSwarm();
      return;
    }
  } else {
    provost.lock = Math.max(0, provost.lock - dt * 1.6);
  }

  // ---- and it shoots, down the line it is already showing you ----
  provost.fireCd -= dt;
  if (provost.fireCd <= 0 && inCone) {
    provost.fireCd = provost.state === 'dock' ? 1.5 : 1.1;
    for (let i = 0; i < 3; i++) {
      const spread = (i - 1) * 0.055;
      foeBullets.push({
        x: provost.x, y: provost.y - 0.25,
        vx: Math.cos(provost.aim + spread) * PROV.speedB,
        vy: Math.sin(provost.aim + spread) * PROV.speedB,
        life: 1.1, dmg: PROV.dmg, r: 0.13,
      });
    }
    SFX.shot(); addShake(0.7);
  }
}

// ---------------------------------------------------------------------
// being hit
// ---------------------------------------------------------------------
function provostBulletHit(b) {
  if (!provost.active || provost.state === 'dead') return false;
  if (Math.hypot(b.x - provost.x, b.y - provost.y) >= 0.75) return false;
  hitProvost(b.x, b.y, b.dmg || 10);
  return true;
}
function provostMeleeHit(x, y, r, dmg) {
  if (!provost.active || provost.state === 'dead') return false;
  if (Math.hypot(x - provost.x, y - provost.y) > r + provost.r) return false;
  hitProvost(x, y, dmg);
  return true;
}
function hitProvost(fromX, fromY, dmg) {
  if (provost.state === 'tear' || !provostVulnerableFrom(fromX, fromY)) {
    // dull plate, exactly as everywhere else on this field
    spawnSparks(fromX, fromY, 4, ['#c9c9d2', '#8a8a92']);
    SFX.ricochet();
    if (typeof think === 'function' && provost.state === 'loose')
      think('provBack', 'The open plate is on its back. Get behind it.');
    return;
  }
  provost.hp -= dmg;
  provost.hitFlash = 0.09;
  spawnSparks(fromX, fromY, 7, ['#ffd27a', '#ffb02e']);
  SFX.hitMetal();
  if (typeof markTarget === 'function') markTarget(provost);
  if (provost.state === 'dock' && provost.hp <= provost.maxHp * PROV.phase2) {
    provost.state = 'tear'; provost.t = 0; provost.lock = 0;
    SFX.rage();
    addShake(4);
    showMsg('It tears itself off the cradle', 2.4);
    return;
  }
  if (provost.hp <= 0) killProvost();
}

function killProvost() {
  provost.state = 'dead'; provost.hp = 0; provost.deadT = 0;
  provost.lock = 0;
  spawnSparks(provost.x, provost.y, 22, ['#ffd27a', '#ffb02e', '#c9c9d2'], 3.5);
  spawnSmoke(provost.x, provost.y, 8);
  addShake(6);
  SFX.die();
  if (typeof Quests !== 'undefined') Quests.provost = 'dead';
  // THE WHOLE FIELD CHANGES STATE. Every camera goes dark and every unit stops
  // where it stands — which is a better reward than a door, because the player
  // walks back out through ground that was trying to kill them.
  if (typeof watchNetworkDown === 'function') watchNetworkDown();
  // and the plate S3 wants. It was the Magistrate's, and the recovery detail
  // is not on this field any more — so it is his. Awarded straight to the
  // inventory the way the Magistrate's is: there is no 'plate' item type, and
  // inventing one so a quest object could sit on a floor would be worse.
  if (typeof Quests !== 'undefined' && Quests.s3 === 'given' && !player.inv.shieldPlate) {
    player.inv.shieldPlate = 1;
    showMsg('SHIELD PLATE — off the Provost', 3);
  }
  showMsg('THE PROVOST IS DOWN', 3.2);
  saveGame();
}

// A death in this room retries the fight rather than the run — the same
// contract the Compactor has.
//
// IN THIS ROOM. `provost.active` is true from the moment you step through the
// vehicle gate, so testing only that made this claim EVERY death on the field:
// swarmed on the runway thirty tiles away and you were dropped at the tower
// door, told the thing had settled back onto its cradle. The field's own
// `deathSpawn` handles those; this handles the fight.
function resetProvostFight() {
  if (!provostInPlay()) return false;
  const A = currentAreaDef();
  if (!A || A.bossKind !== 'provost') return false;
  foeBullets.length = 0;
  player.x = 32.5; player.y = 11.5;          // back through the door
  player.hp = player.maxHp;
  player.iframes = 2.5;
  if (typeof Watch !== 'undefined') { Watch.seen = 0; Watch.swarm = false; }
  spawnProvost(provost.homeX, provost.homeY);
  showMsg('It settles back onto the cradle. Again.', 3.2);
  addShake(3);
  return true;
}
