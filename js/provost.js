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
// WHY THIS FIGHT WAS REBUILT. The first version was a health bar with a facing
// rule on it, and both halves of it were free:
//   - DOCKED, it was bolted to a cradle and hittable from any angle, firing
//     only when you stood in a 0.42 rad cone. So you stood outside the cone and
//     emptied a magazine into it. There was no phase one.
//   - LOOSE, its one rule was "only from behind" — and it walked at 1.55 t/s
//     and turned at 2.2 rad/s against a player who moves at 4. Circling behind
//     it was free, so the rule that was supposed to BE the challenge was the
//     easiest thing in the fight. It stopped at 2.2 tiles and never reached you.
//   - And nothing in the room took part. Four monitor banks, two consoles, a
//     breaker and a rack, all scenery.
//
// THE AREA'S RULE IS "DO NOT BE SEEN", so the boss is that rule made into a
// fight rather than an exception to it.
//
//   1. IT IS THE NETWORK. While it lives it sees through the field's own
//      cameras: it knows where you are whether or not you are in its cone, and
//      it comes. To blind it you break the FOUR MONITOR BANKS standing in that
//      room. Each one narrows its cone, slows its turn, slows its walk and
//      takes a quarter of the armour off it — so the room is the fight, and
//      shooting the boss is only half of it.
//   2. THE AMBER OPENS ON THE RECOIL. Not "get behind it": the plate cracks for
//      0.8s after each burst. What glows amber can be hurt — the game's own
//      rule, turned into a window you can see and time. You have to be near
//      enough to punish it and far enough not to be in the burst.
//   3. ITS CONE IS THE LOSS CONDITION, NOT ITS HEALTH BAR. Held 1.2s and the
//      swarm comes through that door. That was always the right idea; it never
//      fired before because the thing never hunted.
//
//   dock   bolted down and ARMOURED — it cannot be hurt at all. It sweeps and
//          it fires. You break monitors and stay out of the light.
//   tear   the last bank goes and it hauls itself off the cradle. 0.75s.
//   loose  it hunts, on the cameras it has left. Amber on every recoil.
//   blind  under half, it loses the network, plants itself and sweeps the whole
//          room on a wide continuous beam. The amber stays open — but reaching
//          it means crossing the sweep.
// =====================================================================
const provost = {
  active: false,
  x: 0, y: 0, r: 0.55,
  fx: 0, fy: 1,
  hp: 420, maxHp: 420,
  state: 'idle',        // idle | dock | tear | loose | blind | dead
  t: 0, anim: 0,
  aim: Math.PI / 2,
  lock: 0,              // how long its own cone has held you — 1.2s is the swarm
  fireCd: 1.2,
  hitFlash: 0,
  homeX: 0, homeY: 0,
  deadT: 0,
  banks: 4,             // monitor banks still lit. 4 = it sees the whole field
  open: 0,              // seconds of amber left after a burst — the ONLY window
  dark: 0,              // seconds of blackout left, from the breaker
  name: 'THE PROVOST',
};

const PROV = {
  arc: 0.42,            // its cone is narrow — it is a searchlight, not a wall
  range: 9,
  lockTime: 1.2,        // held this long and the swarm comes for you in here
  sweep: 2.6,           // seconds for one pass of the docked sweep
  dmg: 7,               // 9 -> 7: it fires MORE and each one costs less, so a
  speedB: 14,           // mistake costs a step rather than the run
  burst: 5,             // 3 -> 5 rounds
  walk: 2.35,           // 1.55 was slower than a walk. You cannot outrun this.
  turn: 3.4,            // and it turns faster than you can circle, at four banks
  bankHp: 45,           // what breaking one monitor bank takes off him
  bankArmour: 60,       // and what the bank itself takes to break
  openTime: 0.5,        // the amber window after a burst
  dockTimeout: 26,      // it comes off the cradle on its own eventually
  darkTime: 4,          // the breaker blacks the room for this long
  blindAt: 0.5,         // under half it loses the network and plants itself
};
// FOUR BANKS ARE A WHOLE ROOM OF EYES; NONE IS A THING IN THE DARK.
// Everything the fight tunes hangs off this one number, so the player can see
// what each monitor was worth the moment it goes out.
const bankScale = () => provost.banks / 4;

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
  provost.banks = 4; provost.open = 0; provost.dark = 0; provost.sighted = false;
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

// WHEN IT CAN BE HURT AT ALL. Docked it is armoured to the room — that is what
// replaces the free magazine phase one used to be, and it is why the monitors
// are the only way to start this fight. Off the cradle, the plate cracks open
// on the recoil of each burst and shuts again 0.8s later: the window is a thing
// you watch for, not an angle you walk to.
function provostVulnerableFrom() {
  if (provost.state === 'dock' || provost.state === 'tear') return false;
  return provost.open > 0;
}
// Why a shot did not land, in the player's language. The HUD says this.
function provostGuardWhy() {
  if (provost.state === 'dock') return 'ARMOURED — KILL THE MONITORS';
  if (provost.state === 'tear') return 'THE PLATE IS SWINGING SHUT';
  return provost.open > 0 ? 'AMBER — HIT IT' : 'PLATE SHUT — WAIT FOR THE RECOIL';
}

// A MONITOR BANK GOES OUT. Called from the damage path when a round or a swing
// lands on one of the four in this room while the Provost is alive.
// A BANK TAKES REAL DAMAGE. One-shotting them made the whole fight eleven
// rounds long: four shots to strip the network and seven to finish him. Sixty
// is three rifle rounds each, and you are being swept the whole time you spend
// on them — which is the phase-one fight that used to not exist at all.
function breakProvostBank(p, dmg) {
  if (!provost.active || provost.state === 'dead' || p.dead) return false;
  p.hp = (p.hp === undefined ? PROV.bankArmour : p.hp) - (dmg || 10);
  spawnSparks(p.gx + 0.5, p.gy + 0.5, 5, ['#5ad2ff', '#c9c9d2']);
  SFX.hitMetal();
  if (p.hp > 0) return true;                 // the round is spent, the bank holds
  p.dead = true;
  provost.banks = Math.max(0, provost.banks - 1);
  provost.hp = Math.max(1, provost.hp - PROV.bankHp);
  provost.hitFlash = 0.18;
  addShake(2);
  SFX.tech();
  if (provost.banks > 0) {
    showMsg(provost.banks + ' of 4 still lit. It is slower already.', 2.4);
  } else if (provost.state === 'dock') {
    showMsg('The last screen goes out. It comes off the cradle.', 2.6);
  }
  return true;
}

function updateProvost(dt) {
  if (!provost.active) return;
  if (provost.hitFlash > 0) provost.hitFlash -= dt;
  if (provost.state === 'dead') { provost.deadT += dt; return; }
  if (typeof Cine !== 'undefined' && Cine.active) return;
  if (player.dead > 0) { provost.lock = 0; return; }

  provost.t += dt;
  provost.anim += dt;
  if (provost.open > 0) provost.open -= dt;

  // ---- THE BREAKER. Four seconds of nothing, for both of you.
  if (provost.dark > 0) {
    provost.dark -= dt;
    provost.lock = Math.max(0, provost.lock - dt * 3);
    if (provost.dark <= 0) showMsg('The lights come back.', 2);
    return;                                  // it cannot see, aim, walk or fire
  }

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

  // ---- IT COMES OFF THE CRADLE WHEN THE LAST SCREEN GOES OUT.
  // The timeout is a floor, not the intended route: a player who will not touch
  // the monitors still gets a fight eventually, but they get it against
  // something that still has all four banks and every one of its numbers.
  if (provost.state === 'dock' && (provost.banks === 0 || provost.t >= PROV.dockTimeout)) {
    provost.state = 'tear'; provost.t = 0;
    SFX.tech(); addShake(4);
    return;
  }
  // ---- and under half it loses the network and plants itself.
  if (provost.state === 'loose' && provost.hp <= provost.maxHp * PROV.blindAt) {
    provost.state = 'blind'; provost.t = 0; provost.fireCd = 0.5;
    provost.banks = 0;
    showMsg('It stops walking. Now it just sweeps the room.', 3);
    addShake(3);
  }

  if (provost.state === 'dock') {
    // bolted to the cradle, sweeping the room it has always swept
    const k = (provost.t % PROV.sweep) / PROV.sweep;
    provost.aim = Math.PI / 2 + Math.sin(k * Math.PI * 2) * 1.05;
    provost.fx = Math.cos(provost.aim); provost.fy = Math.sin(provost.aim);
  } else if (provost.state === 'blind') {
    // planted, and sweeping the whole room fast. The one thing it has left.
    provost.aim += dt * 1.75;
    if (provost.aim > Math.PI) provost.aim -= Math.PI * 2;
    provost.fx = Math.cos(provost.aim); provost.fy = Math.sin(provost.aim);
  } else if (dist > 0.001) {
    // LOOSE: it hunts, and how well it hunts is how many screens it has left.
    // At four banks it turns faster than you can circle it, which is the whole
    // difference from the version where getting behind it was free.
    const turn = 1.4 + (PROV.turn - 1.4) * bankScale();
    const walk = 1.5 + (PROV.walk - 1.5) * bankScale();
    const want = Math.atan2(dy, dx);
    let da = want - provost.aim;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    provost.aim += Math.max(-turn * dt, Math.min(turn * dt, da));
    provost.fx = Math.cos(provost.aim); provost.fy = Math.sin(provost.aim);
    // IT CLOSES. The old one stopped at 2.2 tiles and never reached you, so
    // there was no reason to give ground. 0.9 is inside your own swing.
    if (dist > 0.9) {
      const step = walk * dt;
      const nx = provost.x + Math.cos(provost.aim) * step;
      const ny = provost.y + Math.sin(provost.aim) * step;
      if (canStand(nx, provost.y, provost.r)) provost.x = nx;
      if (canStand(provost.x, ny, provost.r)) provost.y = ny;
    }
  }

  // ---- ITS CONE, and the thing that makes this fight the area's lesson ----
  // Held in it for 1.2 seconds and the swarm comes through that door. The same
  // rule as outside, in a room you cannot leave, against something that aims.
  // Blind, the cone is WIDER — it has stopped looking for you and started
  // covering ground.
  const arc = provost.state === 'blind' ? PROV.arc * 2.1
            : PROV.arc * (0.7 + 0.3 * bankScale());
  let inCone = false;
  if (dist <= PROV.range) {
    let a = Math.atan2(dy, dx) - provost.aim;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    inCone = Math.abs(a) <= arc && losClear(provost.x, provost.y, player.x, player.y);
  }
  // AND WHILE IT HAS SCREENS, IT KNOWS ANYWAY. This is what "it is the network"
  // means mechanically: out of its cone you are not being LOCKED, but it still
  // walks to where you are. Break the banks and it loses that too.
  provost.sighted = inCone || (provost.banks > 0 && provost.state === 'loose');

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

  // ---- and it shoots, down the line it is already showing you.
  // THE RECOIL IS THE WHOLE FIGHT: the plate cracks open for 0.8s after every
  // burst, and that is the only time anything lands on it.
  provost.fireCd -= dt;
  if (provost.fireCd <= 0 && inCone) {
    provost.fireCd = provost.state === 'dock' ? 1.5 : provost.state === 'blind' ? 1.0 : 1.6;
    const n = provost.state === 'dock' ? 3 : PROV.burst;
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * 0.05;
      foeBullets.push({
        x: provost.x, y: provost.y - 0.25,
        vx: Math.cos(provost.aim + spread) * PROV.speedB,
        vy: Math.sin(provost.aim + spread) * PROV.speedB,
        life: 1.1, dmg: PROV.dmg, r: 0.13,
      });
    }
    if (provost.state !== 'dock') provost.open = PROV.openTime;
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
  if (!provostVulnerableFrom()) {
    // dull plate, exactly as everywhere else on this field
    spawnSparks(fromX, fromY, 4, ['#c9c9d2', '#8a8a92']);
    SFX.ricochet();
    if (typeof think === 'function') {
      if (provost.state === 'dock')
        think('provDock', 'Nothing lands on it while it is docked. Kill the screens.');
      else
        think('provOpen', 'The plate cracks when it fires. That is the only moment.');
    }
    return;
  }
  provost.hp -= dmg;
  provost.hitFlash = 0.09;
  spawnSparks(fromX, fromY, 7, ['#ffd27a', '#ffb02e']);
  SFX.hitMetal();
  if (typeof markTarget === 'function') markTarget(provost);
  if (provost.hp <= 0) killProvost();
}

// THE BREAKER, thrown mid-fight. Four seconds of nothing for both of you: it
// loses you completely, and the only light in the room is its own eye. It is
// the room fighting on your side, which is the point of putting a fight in a
// room that has things in it.
function provostBlackout() {
  if (!provost.active || provost.state === 'dead') return false;
  provost.dark = PROV.darkTime;
  provost.lock = 0;
  provost.open = 0;
  addShake(2.5);
  SFX.tech();
  showMsg('Everything goes out. Four seconds, maybe.', 2.6);
  return true;
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
  // A CLEAN RETRY. The screens come back on with him — a fight that keeps half
  // its progress across a death is a fight you win by dying at it, and the
  // banks are the interesting half.
  for (const p of props) if (p.type === 'monitors') { p.dead = false; p.hp = PROV.bankArmour; }
  player.x = 32.5; player.y = 11.5;          // back through the door
  player.hp = player.maxHp;
  player.iframes = 2.5;
  if (typeof Watch !== 'undefined') { Watch.seen = 0; Watch.swarm = false; }
  spawnProvost(provost.homeX, provost.homeY);
  showMsg('It settles back onto the cradle. Again.', 3.2);
  addShake(3);
  return true;
}
