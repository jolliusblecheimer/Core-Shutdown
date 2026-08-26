// =====================================================================
// HHD SQUADS — the Human-Hunter-Droids that hold the Fringe
//
// These are the machines built for the Correction: the ones that herded
// people to the edges. The Scrapper is something the city threw together
// out of junk; an HHD is something the city was ISSUED. That difference is
// the whole design — uniformity is the horror.
//
// WHY THIS IS A SEPARATE SYSTEM, NOT A REFACTOR OF `scrapper`:
// the Scrapper is a bespoke tutorial enemy — mission-gated, respawn-on-loot,
// wired into the freeze-frame tutorials and the save. Folding it into a
// general squad system would force its quirks onto every droid, or the
// squad system's shape onto the tutorial. So `droids[]` is ADDITIVE: the
// junkyard is not touched at all, and a live save cannot regress. If it is
// ever worth unifying them, doing it in this direction is the safe order.
//
// Enemies are never persisted (`save.js`: "robots re-enter fresh") — squads
// rebuild on area entry, so this needs no save version bump.
//
// THIS FILE OWNS SQUADS, NOT SEEING OR SHOOTING. Sight, facing, cover and
// enemy bullets are the game's, not the droids': `canSpot` / `canSpotWide` /
// `losClear` / `faceToward` / `foeShot` / `foeBullets` in entities.js already
// answer "can it see me" for every raider and machine in the world. A droid
// asking that question its own way would make hiding guesswork instead of a
// skill, so it asks the same one. What is genuinely new here is the SQUAD:
// packs with a shared alert, a formation, a route and a respawn clock.
// =====================================================================

// ---------------------------------------------------------------------
// THE ROSTER — sizes and weapons vary; all of them are bigger than the
// Scrapper (16px) and the player (18px). Names are CODE-ONLY: nothing in
// the game ever shows a unit name (Laurens, 2026-08-19).
// ---------------------------------------------------------------------
const DROID_TYPES = {
  // SCOUT — designed, deliberately NOT DEPLOYED this phase. Its weapon is
  // the flare: on detection it wakes the whole squad and pulls the nearest
  // one, which makes killing it first the lesson. Held back until Laurens
  // decides whether the alarm belongs in this phase at all.
  scout: {
    key: 'scout', hp: 35, r: 0.28, speed: 1.7, chaseSpeed: 2.9,
    sight: 9.0, sightCrouch: 4.5, arc: 1.35, weapon: 'flare',
  },
  // BAILIFF — the flusher. Fastest thing in the squad, will not stand and
  // trade at range. This is what punishes hiding in one spot forever.
  bailiff: {
    key: 'bailiff', hp: 45, r: 0.32, speed: 1.5, chaseSpeed: 2.9,
    sight: 7.0, sightCrouch: 3.6, arc: 1.25, weapon: 'baton',
    dmg: 12, reach: 1.25, windup: 0.40, recover: 0.40,
  },
  // MARSHAL — the core threat. Holds its distance, takes its time, and
  // telegraphs every burst with a laser sight (the fair-telegraph rule).
  marshal: {
    key: 'marshal', hp: 55, r: 0.34, speed: 1.3, chaseSpeed: 2.2,
    sight: 8.5, sightCrouch: 4.2, arc: 1.2, weapon: 'rifle',
    dmg: 8, hold: 5.0, aim: 0.70, burst: 3, burstGap: 0.11, recover: 1.1,
  },
  // MAGISTRATE — the size variety, and a wall. Its frontal shield takes
  // ZERO damage (boss-grade), so it must be flanked or avoided: it should
  // read as "come back later", which is how the pressure gradient works
  // without putting up walls.
  magistrate: {
    key: 'magistrate', hp: 140, r: 0.55, speed: 0.9, chaseSpeed: 1.5,
    sight: 7.5, sightCrouch: 3.8, arc: 1.1, weapon: 'cannon',
    dmg: 16, hold: 4.0, aim: 1.10, burst: 1, burstGap: 0, recover: 1.4,
    shield: true,
  },
};

// A pack is a ROLE MIX, never copies of one thing — mixed pressure is the
// rule from GAME_PLAN.md. (No scout this phase.)
const SQUAD_COMPS = {
  light:    ['bailiff', 'marshal'],
  standard: ['bailiff', 'marshal', 'bailiff'],
  heavy:    ['bailiff', 'bailiff', 'marshal', 'magistrate'],
};

// Patrol routes over the street junctions map.js already builds, with the
// DENSITY GRADIENT: the player arrives at the east end of the gate road, so
// the east and south are deliberately thin and the north is where it gets
// heavy. Pressure expressed as patrol density instead of walls.
// St Martin's (50,54)-(60,69) is left alone — the camp has to be the warm
// spot, so no route comes near it.
const FRINGE_ROUTES = [
  { comp: 'light',    pts: [[165, 120], [92, 120]] },          // gate road
  { comp: 'light',    pts: [[165, 120], [165, 75]] },          // south link
  { comp: 'standard', pts: [[92, 120], [92, 75]] },            // mid street
  { comp: 'standard', pts: [[92, 75], [165, 75]] },            // east cross
  { comp: 'standard', pts: [[30, 120], [30, 96], [30, 75]] },  // spine, south
  { comp: 'standard', pts: [[30, 75], [30, 36]] },             // spine, north
  { comp: 'standard', pts: [[30, 36], [92, 36]] },             // north cross
  { comp: 'heavy',    pts: [[92, 36], [172, 36]] },            // north cross, deep
];

const droids = [];        // every live unit, flat, for collision and drawing
const squads = [];        // { pts, i, idleT, alert, memory, lastPX, lastPY, members, respawnT }

const SQUAD_RESPAWN = 60; // seconds — long enough to cross the ground they
                          // were patrolling before they are back (Laurens)
const SIM_RANGE = 30;     // squads further than this freeze entirely; the
                          // frame budget is what keeps this map open-world
const MEMORY = 12;        // shared with the Scrapper's 12s memory rule

// ---------------------------------------------------------------------
// VISION — the system that makes "hide behind an object" mean anything
//
// The Scrapper's detection is radius-only: it sees through buildings. In a
// junkyard of sparse mounds that never showed; in a city of solid volumes
// it is nonsense. Three things fix it: line of sight, a facing arc, and a
// small all-round peripheral radius so you cannot stand on a droid's heel.
// ---------------------------------------------------------------------

// Sight range per unit, and the crouch rule the whole game shares: crouching
// halves what a machine can see, so breaking line of sight is finally worth
// doing. Everything else — the 120 degree cone, the peripheral bubble, the
// cover test — is `canSpot` in entities.js.
function droidRange(d) {
  const t = DROID_TYPES[d.type];
  return player.crouch ? t.sightCrouch : t.sight;
}
// A droid already hunting sweeps the wider arc, same as a raider does.
function droidSees(d) {
  const r = droidRange(d);
  if (d.squad && d.squad.alert >= 1) return canSpotWide(d, r);
  // `arc` is the HALF-angle in radians, so 1.25 is a 143 degree cone. These
  // are purpose-built hunters and they were seeing no wider than a Scrapper.
  return canSpot(d, r, Math.cos(DROID_TYPES[d.type].arc));
}

// ---------------------------------------------------------------------
// SPAWNING
// ---------------------------------------------------------------------
function clearDroids() {
  droids.length = 0;
  squads.length = 0;
}

function makeDroid(type, x, y, squad, idx) {
  const t = DROID_TYPES[type];
  const d = {
    type, squad, x, y, r: t.r,
    hp: t.hp, maxHp: t.hp,
    state: 'patrol', t: 0,
    // facing is a UNIT VECTOR, not an angle — that is what canSpot and
    // faceToward expect, and the whole game shares them
    fx: 1, fy: 0, scan: Math.random() * 6.28,
    animT: 0, frame: 0, hitFlash: 0, clank: 0,
    kbx: 0, kby: 0, detour: 0, detourX: 0, detourY: 0,
    alert: 0, burst: 0, burstT: 0,
    scanBase: 0, scanT: 0,             // standing-watch head sweep
    looted: false, deadT: 0,
    // formation slot: leader on the route line, the rest fanned back
    form: [{ lat: 0, back: 0 }, { lat: 0.9, back: 1.0 },
           { lat: -0.9, back: 1.0 }, { lat: 0, back: 2.0 }][idx] || { lat: 0, back: 2.6 },
  };
  droids.push(d);
  return d;
}

function spawnSquad(route) {
  const sq = {
    pts: route.pts, comp: route.comp, i: 0, idleT: 0,
    alert: 0, memory: 0, lastPX: 0, lastPY: 0,
    members: [], respawnT: 0,
  };
  const start = route.pts[0];
  SQUAD_COMPS[route.comp].forEach((type, idx) => {
    // fan the pack out around the first waypoint so they do not stack
    let x = start[0] + (idx % 2 ? 0.9 : -0.9), y = start[1] + (idx > 1 ? 1.1 : -0.3);
    if (!canStand(x, y, DROID_TYPES[type].r)) { x = start[0]; y = start[1]; }
    sq.members.push(makeDroid(type, x, y, sq, idx));
  });
  squads.push(sq);
  return sq;
}

// A junction is a nominal point on the street grid, and the street dressing
// (a queued car, a traffic light) can be sitting exactly on it. Dropping the
// route in that case loses a whole patrol silently — half the city's squads
// vanished that way — so snap to the nearest tile that can actually be stood
// on instead. Only if nothing within 4 tiles works is the route really gone,
// and then it says so.
function snapWaypoint(x, y) {
  if (canStand(x, y, 0.4)) return [x, y];
  for (let r = 1; r <= 4; r++) {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const nx = Math.round(x + Math.cos(ang) * r), ny = Math.round(y + Math.sin(ang) * r);
      if (nx > 1 && ny > 1 && nx < MAP_W - 1 && ny < MAP_H - 1 && canStand(nx, ny, 0.4)) {
        return [nx, ny];
      }
    }
  }
  return null;
}

function spawnFringeSquads() {
  clearDroids();
  for (const r of FRINGE_ROUTES) {
    const pts = r.pts.map(p => snapWaypoint(p[0], p[1]));
    if (pts.some(p => !p)) {
      console.warn('HHD: route dropped, no standable ground near', r.pts);
      continue;
    }
    spawnSquad({ comp: r.comp, pts });
  }
}

// A wiped squad comes back on its route, but never in front of you: the
// rule is that machines are never seen popping into existence.
function respawnSquad(sq) {
  const start = sq.pts[0];
  if (Math.hypot(start[0] - player.x, start[1] - player.y) < 22) {
    sq.respawnT = 6;          // player is still standing there — wait
    return;
  }
  sq.i = 0; sq.idleT = 0; sq.alert = 0; sq.memory = 0;
  sq.members.forEach((d, idx) => {
    const t = DROID_TYPES[d.type];
    d.x = start[0] + (idx % 2 ? 0.9 : -0.9);
    d.y = start[1] + (idx > 1 ? 1.1 : -0.3);
    if (!canStand(d.x, d.y, t.r)) { d.x = start[0]; d.y = start[1]; }
    d.hp = d.maxHp; d.state = 'patrol'; d.alert = 0; d.looted = false;
    d.deadT = 0; d.kbx = 0; d.kby = 0; d.detour = 0; d.burst = 0;
  });
}

// ---------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------
function updateDroids(dt) {
  if (!currentAreaDef().hasDroids) return;
  for (const sq of squads) updateSquad(sq, dt);
}

function updateSquad(sq, dt) {
  const alive = sq.members.filter(d => d.state !== 'dead');
  if (!alive.length) {
    sq.respawnT -= dt;
    if (sq.respawnT <= 0) respawnSquad(sq);
    return;
  }
  // fade the wrecks of the fallen even while the rest of the squad fights
  for (const d of sq.members) if (d.state === 'dead') d.deadT += dt;

  // FROZEN AT DISTANCE: no steering, no line of sight, no animation
  let near = false;
  for (const d of alive) {
    if (Math.hypot(d.x - player.x, d.y - player.y) < SIM_RANGE) { near = true; break; }
  }
  if (!near) return;

  // ---- detection, per unit ----
  const canBeSeen = player.dead <= 0 && !insideShack(player.x, player.y);
  for (const d of alive) {
    if (sq.alert >= 1) break;                 // already hunting; skip the meter
    if (canBeSeen && droidSees(d)) {
      const dist = Math.hypot(player.x - d.x, player.y - d.y);
      const range = player.crouch ? DROID_TYPES[d.type].sightCrouch : DROID_TYPES[d.type].sight;
      d.alert += dt * (0.5 + 1.6 * (1 - dist / range));
    } else {
      d.alert = Math.max(0, d.alert - dt * 0.5);
    }
    // SQUAD-SHARED ALERT: one of them seeing you puts the whole pack on you.
    // This is what makes a pack different from three separate machines.
    if (d.alert >= 1) {
      sq.alert = 1; sq.memory = MEMORY;
      sq.lastPX = player.x; sq.lastPY = player.y;
      for (const m of alive) m.alert = 1;
      SFX.alert();
      break;
    }
  }

  // ---- shared memory: they push to where they last saw you ----
  if (sq.alert >= 1) {
    player.combatT = 0;                       // being hunted counts as combat
    let anySees = false;
    for (const d of alive) {
      if (canBeSeen && droidSees(d)) { anySees = true; break; }
    }
    if (anySees) {
      sq.memory = MEMORY;
      sq.lastPX = player.x; sq.lastPY = player.y;
    } else {
      sq.memory -= dt;
    }
    if (sq.memory <= 0) {
      sq.alert = 0;
      for (const d of alive) { d.alert = 0.35; d.state = 'patrol'; d.t = 0; }
    }
  }

  // ---- move the route along (patrol only) ----
  if (sq.alert < 1) {
    if (sq.idleT > 0) sq.idleT -= dt;
    else {
      const lead = alive[0];
      const tgt = formationPoint(sq, lead);
      if (Math.hypot(tgt.x - lead.x, tgt.y - lead.y) < 1.2) {
        sq.i = (sq.i + 1) % sq.pts.length;
        sq.idleT = 1.0 + Math.random() * 1.8;   // pause to scan, like the Scrapper
        // each unit sweeps its cone from wherever it happened to stop, and
        // they start out of phase so the pack covers the street between them
        sq.members.forEach((m, k) => {
          m.scanBase = Math.atan2(m.fy, m.fx);
          m.scanT = k * 1.1;
        });
      }
    }
  }

  for (const d of alive) updateDroidUnit(d, sq, dt);
}

// where this unit should stand: its formation slot, rotated onto the heading
// of the leg being walked, so the pack spreads ACROSS the street it patrols
function formationPoint(sq, d) {
  const wp = sq.pts[sq.i];
  const prev = sq.pts[(sq.i + sq.pts.length - 1) % sq.pts.length];
  let hx = wp[0] - prev[0], hy = wp[1] - prev[1];
  const hl = Math.hypot(hx, hy) || 1;
  hx /= hl; hy /= hl;
  return {
    x: wp[0] - hy * d.form.lat - hx * d.form.back,
    y: wp[1] + hx * d.form.lat - hy * d.form.back,
  };
}

// look at a point, using the game's shared turner (entities.js)
function droidLookAt(d, tx, ty, dt) { faceToward(d, tx - d.x, ty - d.y, dt); }

function updateDroidUnit(d, sq, dt) {
  const t = DROID_TYPES[d.type];
  d.hitFlash -= dt; d.clank -= dt;
  if (d.kbx || d.kby) {
    tryMove(d, d.kbx, d.kby);
    d.kbx *= 0.7; d.kby *= 0.7;
    if (Math.abs(d.kbx) + Math.abs(d.kby) < 0.001) { d.kbx = 0; d.kby = 0; }
  }
  d.animT += dt;
  if (d.animT > 0.24) { d.animT = 0; d.frame = 1 - d.frame; }

  const dist = Math.hypot(player.x - d.x, player.y - d.y);

  // ---------------- patrol ----------------
  if (sq.alert < 1 && d.state === 'patrol') {
    if (sq.idleT > 0) {
      // STANDING WATCH: the head sweeps, so the cone crosses the street and
      // back. A frozen facing would make a stopped patrol a blind statue —
      // and would make waiting behind cover free.
      d.scanT += dt * 1.5;
      const a = d.scanBase + Math.sin(d.scanT) * 0.9;
      d.fx = Math.cos(a); d.fy = Math.sin(a);
      return;
    }
    const tgt = formationPoint(sq, d);
    const before = { x: d.x, y: d.y };
    aiMove(d, tgt.x, tgt.y, t.speed * dt, dt);
    // face the way you are actually walking, not the way you meant to
    if (Math.hypot(d.x - before.x, d.y - before.y) > 0.0005) {
      faceToward(d, d.x - before.x, d.y - before.y, dt);
    }
    return;
  }

  // ---------------- combat ----------------
  const tx = sq.memory > 0 && !droidSees(d) ? sq.lastPX : player.x;
  const ty = sq.memory > 0 && !droidSees(d) ? sq.lastPY : player.y;
  droidLookAt(d, tx, ty, dt);

  switch (d.state) {
    case 'patrol':
    case 'chase': {
      d.state = 'chase';
      if (t.weapon === 'baton') {
        aiMove(d, tx, ty, t.chaseSpeed * dt, dt);
        if (dist < t.reach * 0.8 && droidSees(d)) {
          d.state = 'windup'; d.t = t.windup;
          SFX.charge();
        }
      } else {
        // RANGED: hold a working distance, and only shoot with a clear line
        const sees = droidSees(d);
        if (!sees || dist > t.hold * 1.15) {
          aiMove(d, tx, ty, t.chaseSpeed * dt, dt);
        } else if (dist < t.hold * 0.65) {
          aiMove(d, d.x - (player.x - d.x), d.y - (player.y - d.y), t.speed * dt, dt);
        }
        if (sees && dist < t.hold * 1.3) { d.state = 'aim'; d.t = t.aim; }
      }
      break;
    }
    case 'windup': {
      d.t -= dt;
      if (d.t <= 0) { d.state = 'swing'; d.t = 0.16; d.didHit = false; }
      break;
    }
    case 'swing': {
      if (!d.didHit) {
        d.didHit = true;
        if (dist < t.reach && player.iframes <= 0 && player.dead <= 0) {
          hurtPlayer(t.dmg, d.x, d.y);
        }
      }
      d.t -= dt;
      if (d.t <= 0) { d.state = 'recover'; d.t = t.recover; }
      break;
    }
    case 'aim': {
      d.t -= dt;                                // laser sight is drawn here
      if (d.t <= 0) { d.state = 'fire'; d.burst = t.burst; d.burstT = 0; }
      break;
    }
    case 'fire': {
      d.burstT -= dt;
      if (d.burstT <= 0 && d.burst > 0) {
        d.burst--;
        d.burstT = t.burstGap;
        fireDroidShot(d, t);
        if (d.burst <= 0) { d.state = 'recover'; d.t = t.recover; }
      }
      break;
    }
    case 'recover': {
      d.t -= dt;
      if (d.t <= 0) d.state = 'chase';
      break;
    }
  }
}

// Their bolts go into `foeBullets` with everyone else's, so one system draws
// them, one system collides them with you, and a droid's shot and a raider's
// shot obey the same rules.
function fireDroidShot(d, t) {
  foeShot(d, player.x, player.y,
          { spread: t.shield ? 0.05 : 0.09, speedB: t.shield ? 13 : 11, dmg: t.dmg },
          SFX.shot);
}

// ---------------------------------------------------------------------
// TAKING DAMAGE — locational, using the game's established language:
// WHAT GLOWS AMBER CAN BE HURT, DULL PLATE CANNOT.
// The boss's zero-damage armour is too harsh for a three-pack, so an HHD
// gets a softer version: the frontal plate halves damage and the amber
// sensor spine down its back doubles it. Flanking is the skill. Only the
// Magistrate's shield is true zero, which is what marks it as boss-adjacent.
// ---------------------------------------------------------------------
function droidZoneAt(d, hx, hy) {
  const dx = hx - d.x, dy = hy - d.y;
  const len = Math.hypot(dx, dy) || 1;
  const f = Math.hypot(d.fx, d.fy) || 1;
  // cos of the angle between "where it is looking" and "where it was hit"
  const dot = (dx * d.fx + dy * d.fy) / (len * f);
  if (dot > 0.36) return 'front';     // within ~69 degrees of dead ahead
  if (dot < -0.5) return 'spine';     // behind it, where the sensor spine runs
  return 'side';
}

function droidHit(d, hx, hy, dmg, kind) {
  if (d.state === 'dead') return false;
  const t = DROID_TYPES[d.type];
  const zone = droidZoneAt(d, hx, hy);
  let mult = 1;
  if (zone === 'front') mult = t.shield ? 0 : 0.5;
  else if (zone === 'spine') mult = 2;

  if (mult === 0) {
    // dull plate: grey spark, a flat clank, no hit-flash — the same
    // feedback the Compactor taught
    d.clank = 0.12;
    spawnSparks(hx, hy, 5, ['#c9c9d2', '#8a8a92'], 2);
    SFX.clang();
    return false;
  }
  d.hp -= dmg * mult;
  d.hitFlash = 0.08;
  if (zone === 'spine') {
    spawnSparks(hx, hy, 8, ['#ffd27a', '#ffb02e', '#ff8b45'], 4);
    addShake(1.4);
  } else {
    spawnSparks(hx, hy, 6, ['#ffd27a', '#c9c9d2', '#8a8a92'], 3);
    addShake(0.8);
  }
  SFX.hitMetal();
  // being shot at from cover still gives you away
  const sq = d.squad;
  if (sq && sq.alert < 1) {
    sq.alert = 1; sq.memory = MEMORY;
    sq.lastPX = player.x; sq.lastPY = player.y;
    for (const m of sq.members) if (m.state !== 'dead') m.alert = 1;
    SFX.alert();
  } else if (sq) {
    sq.memory = MEMORY; sq.lastPX = player.x; sq.lastPY = player.y;
  }
  if (d.hp <= 0) killDroid(d);
  return true;
}

function killDroid(d) {
  d.state = 'dead';
  d.deadT = 0;
  d.hp = 0;
  spawnSparks(d.x, d.y, 14, ['#ffd27a', '#ffb02e', '#c9c9d2'], 3);
  spawnSmoke(d.x, d.y, 6);
  addShake(2.5);
  SFX.robotDie();
  const sq = d.squad;
  if (sq && sq.members.every(m => m.state === 'dead')) sq.respawnT = SQUAD_RESPAWN;
}

// player bullets — called from updateBullets
function droidBulletHit(b) {
  for (const d of droids) {
    if (d.state === 'dead') continue;
    if (Math.hypot(b.x - d.x, b.y - d.y) < d.r + 0.14) {
      droidHit(d, b.x, b.y, b.dmg || 10, 'bullet');
      d.kbx += b.vx * 0.012; d.kby += b.vy * 0.012;
      return true;
    }
  }
  return false;
}

// player melee — called from the swing in updatePlayer
function droidMeleeHit(m, ps) {
  for (const d of droids) {
    if (d.state === 'dead') continue;
    const dx = d.x - player.x, dy = d.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > m.range + d.r) continue;
    const ss = isoToScreen(d.x, d.y);
    const a = Math.atan2(ss.y - ps.y, ss.x - ps.x);
    let diff = Math.abs(a - player.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > 1.3) continue;
    // impact lands on the surface facing the player, so a flank swing
    // reads as a flank hit
    const hx = d.x - (dx / (dist || 1)) * d.r, hy = d.y - (dy / (dist || 1)) * d.r;
    if (droidHit(d, hx, hy, m.dmg, m.stab ? 'knife' : 'pipe')) {
      d.kbx += (dx / (dist || 1)) * 0.09;
      d.kby += (dy / (dist || 1)) * 0.09;
    }
    return true;
  }
  return false;
}

// Looting a droid wreck lives in entities.js with every other interaction,
// so it competes for the prompt fairly against items, bodies and wrecks
// instead of fighting them for it.

// =====================================================================
// SPRITES — the modern design language
//
// The Scrapper is rust, mismatched plate and a bulb eye: something the city
// threw together. An HHD is matte composite panels, seamless joints, one
// amber sensor BAR instead of an eye, and a stencilled WARDEN chevron that
// is identical on every unit. It should read as issued equipment.
//
// All of it is drawn with px() — integer rectangles, flat colours. The
// project rule holds: anything under about ten pixels must be integer
// filled, and every one of these details is.
// =====================================================================
(function buildDroidSprites() {
  const SHELL = '#c6c5bf', SHELL_H = '#dcdbd4', SHELL_S = '#9b9a94';
  const DARK = '#3a3d42', DARK2 = '#25282c';
  // CORE BLUE, not amber. The palette journey in art-style.md runs rust/amber
  // at the outskirts to cold neon blue/white at the Core, and an HHD is issued
  // equipment — WARDEN's own light, carried out to the edge where it does not
  // belong. (The Scrapper's bulb was amber when this was written, as the junk
  // bot's warm exception. It is CORE_BLUE as of 2026-08-26: every machine in
  // the city sees with the Core's light, and amber means damage and nothing
  // else. See the note on EYE in sprites.js.)
  //
  // THE AMBER LAW STILL HOLDS. "What glows amber can be hurt, dull plate
  // cannot" now reads even harder: nothing warm is left on the machine at all,
  // so the only amber you ever see on a droid is the flash of a weak-point hit.
  // Blue is WARDEN. Amber is damage.
  const CORE = '#6fd3ff', CORE_D = '#2b7fb5', CHEV = '#5f666e';

  // the shared face: a recessed visor slot with one cold blue bar in it
  function visor(g, x, y, w) {
    px(g, x, y, w, 2, DARK2);
    px(g, x, y, w, 1, CORE);
    px(g, x, y + 1, w, 1, CORE_D);
  }
  // WARDEN chevron — the same stencil on every unit
  function chevron(g, x, y) {
    px(g, x, y, 3, 1, CHEV);
    px(g, x, y + 1, 2, 1, CHEV);
  }

  // ---- BAILIFF: squat and wide, a shock baton. The flusher. ----
  function bailiffFrame(step, armUp) {
    const c = makeCanvas(18, 20), g = c.getContext('2d');
    px(g, 3, 18 - step, 5, 2, DARK2);              // feet
    px(g, 10, 18 + step, 5, 2, DARK2);
    px(g, 4, 13 - step, 4, 5, DARK);               // shins
    px(g, 10, 13 + step, 4, 5, DARK);
    px(g, 3, 11, 12, 3, SHELL_S);                  // hips
    px(g, 2, 5, 14, 7, SHELL);                     // wide torso
    px(g, 2, 5, 14, 1, SHELL_H);                   // lit top edge
    px(g, 8, 6, 1, 5, SHELL_S);                    // centre seam
    chevron(g, 4, 7);
    px(g, 0, 5, 3, 4, SHELL_S);                    // shoulder pads
    px(g, 15, 5, 3, 4, SHELL_S);
    px(g, 5, 1, 8, 4, SHELL);                      // head
    px(g, 5, 1, 8, 1, SHELL_H);
    visor(g, 6, 2, 6);
    if (armUp) {                                   // baton raised
      px(g, 16, 0, 2, 8, DARK);
      px(g, 16, 0, 2, 2, CORE);
    } else {
      px(g, 16, 7, 2, 7, DARK);
      px(g, 16, 12, 2, 2, CORE);
    }
    return c;
  }

  // ---- MARSHAL: tall and narrow, a rifle held across the chest ----
  function marshalFrame(step, aiming) {
    const c = makeCanvas(18, 24), g = c.getContext('2d');
    px(g, 4, 22 - step, 4, 2, DARK2);
    px(g, 10, 22 + step, 4, 2, DARK2);
    px(g, 5, 16 - step, 3, 6, DARK);
    px(g, 10, 16 + step, 3, 6, DARK);
    px(g, 4, 13, 10, 3, SHELL_S);
    px(g, 3, 6, 12, 8, SHELL);                     // upright torso
    px(g, 3, 6, 12, 1, SHELL_H);
    px(g, 9, 7, 1, 6, SHELL_S);
    chevron(g, 4, 8);
    px(g, 1, 6, 2, 4, SHELL_S);
    px(g, 15, 6, 2, 4, SHELL_S);
    px(g, 6, 1, 6, 5, SHELL);                      // narrow head
    px(g, 6, 1, 6, 1, SHELL_H);
    visor(g, 6, 3, 6);
    // the rifle: level when aiming, carried low otherwise
    const ry = aiming ? 8 : 11;
    px(g, 11, ry, 7, 2, DARK);
    px(g, 16, ry, 2, 1, CORE);                    // muzzle glow
    px(g, 12, ry + 2, 2, 2, DARK);                 // grip
    return c;
  }

  // ---- MAGISTRATE: the heavy. A riot shield slab and an arm cannon. ----
  function magistrateFrame(step, firing) {
    const c = makeCanvas(28, 34), g = c.getContext('2d');
    px(g, 5, 31 - step, 7, 3, DARK2);              // heavy feet
    px(g, 16, 31 + step, 7, 3, DARK2);
    px(g, 6, 23 - step, 6, 8, DARK);               // thick legs
    px(g, 17, 23 + step, 6, 8, DARK);
    px(g, 5, 19, 18, 5, SHELL_S);                  // hip block
    px(g, 4, 8, 20, 12, SHELL);                    // slab torso
    px(g, 4, 8, 20, 1, SHELL_H);
    px(g, 13, 9, 1, 10, SHELL_S);
    chevron(g, 6, 11);
    px(g, 9, 2, 10, 6, SHELL);                     // head
    px(g, 9, 2, 10, 1, SHELL_H);
    visor(g, 10, 4, 8);
    // THE SHIELD: a full-height slab down its leading side. This is the
    // zero-damage face — it has to read as a wall, not a pauldron.
    px(g, 0, 6, 5, 22, SHELL_S);
    px(g, 0, 6, 5, 1, SHELL_H);
    px(g, 0, 6, 1, 22, DARK);
    px(g, 1, 15, 3, 2, CHEV);
    // the cannon
    px(g, 24, 12, 4, 5, DARK);
    px(g, 24, 13, 4, 2, firing ? CORE : CORE_D);
    return c;
  }

  // ---- SCOUT: small body, long thin legs, a sensor mast. NOT DEPLOYED
  // this phase — built so the design is not lost, spawned by nobody. ----
  function scoutFrame(step) {
    const c = makeCanvas(14, 22), g = c.getContext('2d');
    px(g, 3, 20 - step, 3, 2, DARK2);
    px(g, 8, 20 + step, 3, 2, DARK2);
    px(g, 4, 12 - step, 2, 8, DARK);               // long spindly legs
    px(g, 9, 12 + step, 2, 8, DARK);
    px(g, 3, 6, 8, 6, SHELL);                      // small body
    px(g, 3, 6, 8, 1, SHELL_H);
    chevron(g, 4, 8);
    px(g, 6, 1, 2, 5, DARK);                       // sensor mast
    px(g, 5, 0, 4, 2, SHELL);
    px(g, 6, 0, 2, 1, CORE);
    return c;
  }

  // a wreck: the same shell, collapsed and dark
  function wreck(w, h) {
    const c = makeCanvas(w, h), g = c.getContext('2d');
    px(g, 1, h - 4, w - 2, 4, SHELL_S);
    px(g, 2, h - 6, w - 6, 2, SHELL);
    px(g, 3, h - 7, 4, 2, DARK);
    px(g, w - 7, h - 5, 4, 2, DARK2);
    px(g, 4, h - 3, 2, 1, CORE_D);                 // one dying light
    return c;
  }

  // pack a frame with the offsets that put its feet on the tile, matching
  // the Scrapper's convention (bottom of the sprite sits 2px below the anchor)
  const pack = (canvas) => {
    const img = outlined(canvas);
    return { img, ox: Math.round(img.width / 2), oy: img.height - 2 };
  };

  Sprites.droids = {
    bailiff: {
      walk: [pack(bailiffFrame(0, false)), pack(bailiffFrame(1, false))],
      act: pack(bailiffFrame(0, true)),
      dead: pack(wreck(18, 10)),
    },
    marshal: {
      walk: [pack(marshalFrame(0, false)), pack(marshalFrame(1, false))],
      act: pack(marshalFrame(0, true)),
      dead: pack(wreck(18, 10)),
    },
    magistrate: {
      walk: [pack(magistrateFrame(0, false)), pack(magistrateFrame(1, false))],
      act: pack(magistrateFrame(0, true)),
      dead: pack(wreck(26, 14)),
    },
    scout: {
      walk: [pack(scoutFrame(0)), pack(scoutFrame(1))],
      act: pack(scoutFrame(0)),
      dead: pack(wreck(14, 8)),
    },
  };
})();

// =====================================================================
// DRAWING
// =====================================================================
// the frame this one is showing — shared with the ghost pass in js/game.js
function droidFrame(d) {
  const set = Sprites.droids[d.type];
  const acting = d.state === 'windup' || d.state === 'swing' ||
                 d.state === 'aim' || d.state === 'fire';
  return acting ? set.act : set.walk[d.frame];
}

function drawDroid(d, x, y) {
  const set = Sprites.droids[d.type];
  const t = DROID_TYPES[d.type];

  if (d.state === 'dead') {
    const fade = Math.max(0, 1 - Math.max(0, d.deadT - CORPSE_LINGER) / CORPSE_FADE);
    ctx.globalAlpha = (d.looted ? 0.45 : 1) * fade;
    ctx.drawImage(set.dead.img, Math.round(x - set.dead.ox), Math.round(y - set.dead.oy));
    ctx.globalAlpha = 1;
    if (!d.looted && fade > 0) addLight(x, y - 4, 0, 10, '255,210,140', 0.15);
    return;
  }

  drawShadow(x, y, t.r * 20);
  const fr = droidFrame(d);
  const dx = Math.round(x - fr.ox), dy = Math.round(y - fr.oy);

  if (d.hitFlash > 0) {
    ctx.drawImage(fr.img, dx, dy);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(fr.img, dx, dy);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.drawImage(fr.img, dx, dy);
  }

  // the sensor bar glows harder once it is hunting you
  const hunting = d.squad && d.squad.alert >= 1;
  const headY = y - fr.oy + 4;
  addLight(x, headY, 0, hunting ? 14 : 9, '110,200,255', hunting ? 0.5 : 0.28);

  // LASER SIGHT — every burst is telegraphed, the fair-telegraph rule
  if (d.state === 'aim') {
    const ps = isoToScreen(player.x, player.y), ds = isoToScreen(d.x, d.y);
    ctx.strokeStyle = ((performance.now() / 90) | 0) % 2
      ? 'rgba(255,90,60,0.75)' : 'rgba(255,90,60,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(x), Math.round(y - fr.oy + 10));
    ctx.lineTo(Math.round(x + (ps.x - ds.x)), Math.round(y + (ps.y - ds.y) - 8));
    ctx.stroke();
  }
  // dull plate rejecting a hit
  if (d.clank > 0) {
    ctx.fillStyle = '#c9c9d2';
    ctx.fillRect(Math.round(x - 1), Math.round(y - fr.oy + 8), 2, 2);
  }

  // SUSPICION METER — same language as the Scrapper's: an eye bar that
  // turns red as it fills, deliberately unlike the health bar
  if (d.squad && d.squad.alert < 1 && d.alert > 0.03) {
    const ay = Math.round(y - fr.oy - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(Math.round(x - 6), ay - 1, 14, 4);
    ctx.fillStyle = d.alert > 0.7 ? '#ff5a3c' : '#efe6d2';
    ctx.fillRect(Math.round(x - 5), ay, Math.round(12 * Math.min(1, d.alert)), 2);
  }
  // health, once hurt
  if (d.hp < d.maxHp) {
    const hy = Math.round(y - fr.oy - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(Math.round(x - 6), hy - 1, 14, 3);
    const f = Math.max(0, d.hp / d.maxHp);
    ctx.fillStyle = 'hsl(' + Math.round(112 * f) + ',65%,48%)';
    ctx.fillRect(Math.round(x - 5), hy, Math.round(12 * f), 1);
  }
}

// (droid bolts are drawn by the game's own foeBullets pass — nothing here)
