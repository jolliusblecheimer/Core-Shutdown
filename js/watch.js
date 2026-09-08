// =====================================================================
// THE WATCH — cameras and military police, and the one rule of Airfield 12
//
// WHAT GLOWS AMBER CAN BE HURT; DULL PLATE CANNOT. That is the Compactor's
// rule and the sentry guns' rule, and it is this file's rule too — applied
// honestly rather than bent. An MP unit is NEVER amber, so a round fired at
// one rings off and nothing happens. "There is no option to fight them" is
// therefore not a message on the screen: it is the thing the player already
// learned in the first hour, arriving somewhere it has no exception.
//
// The one place the rule bends is the Provost, and it bends VISIBLY: he is
// docked in a charging cradle with his back plate open. See js/provost.js.
//
// WHAT THIS FILE DOES NOT DO: it does not invent a way of seeing. Cover is
// broken by `losClear`, the same call every raider, droid and sentry in the
// world uses, so hiding is a skill rather than guesswork.
// =====================================================================
const cameras = [];
const mps = [];
const swarmBots = [];      // the six that come for you, during the cutscene only

const WATCH = {
  // cameras
  camArc: 0.52,            // radians either side — a 60 degree cone
  camRange: 11,
  camSweep: 1.9,           // seconds from one end of its sweep to the other
  camHold: 1.1,            // and how long it rests at each end
  // military police
  mpArc: 0.61,             // 70 degrees
  mpRange: 9,
  mpRangeCrouch: 4.5,      // CROUCHING IS THE ANSWER, here as everywhere else
  mpSpeed: 1.25,
  mpSweep: 2.4,            // it stops at each waypoint and looks around
  mpTurn: 1.4,
  // detection
  fill: 1 / 0.85,          // a cone holds you for 0.85s and the swarm comes
  drain: 1 / 1.6,
  noise: 22,               // how far a gunshot carries to an MP
};

const Watch = {
  seen: 0,                 // 0 .. 1, the meter
  by: null,                // what is holding you, for the HUD
  swarm: false,            // the cutscene is running
  swarmSeen: false,        // saved: has the player watched it once
  networkDown: false,      // the Provost is dead; everything here is off
  warnedPlate: false,      // the "nothing gets through that plate" thought
  firstSight: false,       // saved: the scripted teaching beat has played
};
const WATCH_DEFAULTS = { swarmSeen: false, networkDown: false, firstSight: false };

function clearWatch() {
  cameras.length = 0; mps.length = 0; swarmBots.length = 0;
  Watch.seen = 0; Watch.by = null; Watch.swarm = false;
}

// ---------------------------------------------------------------------
// building them
// ---------------------------------------------------------------------
function addCamera(gx, gy, face, sweep) {
  cameras.push({
    gx, gy, x: gx + 0.5, y: gy + 0.5,
    face, sweep: sweep || 0.5,     // centre bearing and how far it swings
    aim: face, t: Math.random() * 4, dead: false, hitFlash: 0,
  });
}
function addMP(route) {
  const [x, y] = route[0];
  mps.push({
    x: x + 0.5, y: y + 0.5, r: 0.36,
    route, leg: 0, dir: 1,
    fx: 1, fy: 0,
    state: 'walk', t: 0, sweepFrom: 0,
    goX: null, goY: null,            // where a noise sent it
    hitFlash: 0,
  });
}

function spawnWatch() {
  clearWatch();
  const A = currentAreaDef();
  if (!A || !A.hasWatch) return;
  for (const [x, y, face, sweep] of (A.cameras || [])) addCamera(x, y, face, sweep);
  for (const r of (A.mpRoutes || [])) addMP(r);
  restoreCameras(A.id);
}

// dead cameras are saved by position, like every other world object
const camKey = (c) => c.gx + ',' + c.gy;
function collectDeadCameras() {
  return cameras.filter(c => c.dead).map(camKey);
}
function restoreCameras(id) {
  const st = areaState[id];
  if (!st || !st.deadCameras) return;
  const down = new Set(st.deadCameras);
  for (const c of cameras) if (down.has(camKey(c))) c.dead = true;
}

// ---------------------------------------------------------------------
// seeing
// ---------------------------------------------------------------------
// One cone test for both kinds. `aim` is a bearing in radians, and cover
// breaks it exactly the way it breaks everything else in this game.
function coneHolds(wx, wy, aim, halfArc, range) {
  if (player.dead > 0 || Watch.swarm) return false;
  const dx = player.x - wx, dy = player.y - wy;
  const d = Math.hypot(dx, dy);
  if (d > range || d < 0.001) return false;
  let a = Math.atan2(dy, dx) - aim;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  if (Math.abs(a) > halfArc) return false;
  return losClear(wx, wy, player.x, player.y);
}
const cameraSees = (c) =>
  !c.dead && !Watch.networkDown && coneHolds(c.x, c.y, c.aim, WATCH.camArc, WATCH.camRange);
const mpSees = (m) =>
  !Watch.networkDown &&
  coneHolds(m.x, m.y, Math.atan2(m.fy, m.fx), WATCH.mpArc,
            player.crouch ? WATCH.mpRangeCrouch : WATCH.mpRange);

// ---------------------------------------------------------------------
// noise — a shot is the loudest decision you can make on this field
// ---------------------------------------------------------------------
function watchNoise(x, y) {
  if (Watch.networkDown) return;
  let best = null, bd = WATCH.noise;
  for (const m of mps) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m; }
  }
  if (best) { best.goX = x; best.goY = y; best.state = 'walk'; }
}

// ---------------------------------------------------------------------
// updating
// ---------------------------------------------------------------------
function updateWatch(dt) {
  const A = currentAreaDef();
  if (!A || !A.hasWatch) return;

  if (Watch.networkDown) {
    // the Provost is down: every housing is dark and every unit is standing
    // exactly where it stopped. Nothing here sees anything any more.
    Watch.seen = 0; Watch.by = null;
    for (const c of cameras) c.hitFlash = Math.max(0, c.hitFlash - dt);
    return;
  }
  if (Watch.swarm) return;             // the cutscene owns everything now

  let held = null;

  // ---- cameras: a fixed sweep, and it does not care that you saw it coming
  for (const c of cameras) {
    if (c.hitFlash > 0) c.hitFlash -= dt;
    if (c.dead) continue;
    c.t += dt;
    const period = WATCH.camSweep * 2 + WATCH.camHold * 2;
    let p = c.t % period, k;
    if (p < WATCH.camSweep) k = p / WATCH.camSweep;
    else if (p < WATCH.camSweep + WATCH.camHold) k = 1;
    else if (p < WATCH.camSweep * 2 + WATCH.camHold) k = 1 - (p - WATCH.camSweep - WATCH.camHold) / WATCH.camSweep;
    else k = 0;
    // ease it so it reads as a motor, not as a lerp
    const e = k * k * (3 - 2 * k);
    c.aim = c.face - c.sweep + e * c.sweep * 2;
    if (cameraSees(c)) held = held || { kind: 'cam', o: c };
  }

  // ---- military police: walk the route, stop at each end and look round
  for (const m of mps) {
    if (m.hitFlash > 0) m.hitFlash -= dt;
    m.t += dt;

    let tx, ty;
    if (m.goX !== null) { tx = m.goX; ty = m.goY; }
    else { const p = m.route[m.leg]; tx = p[0] + 0.5; ty = p[1] + 0.5; }

    if (m.state === 'walk') {
      const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
      if (d < 0.6) {
        m.state = 'sweep'; m.t = 0;
        m.sweepFrom = Math.atan2(m.fy, m.fx);
        if (m.goX !== null) { m.goX = null; m.goY = null; }
      } else {
        const step = WATCH.mpSpeed * dt;
        const nx = m.x + (dx / d) * step, ny = m.y + (dy / d) * step;
        // it walks round what it cannot walk through, one axis at a time,
        // the same way every other body in this game does
        if (canStand(nx, m.y, m.r)) m.x = nx;
        if (canStand(m.x, ny, m.r)) m.y = ny;
        faceToward(m, dx, dy, dt);
      }
    } else {
      // standing and sweeping — this is when it is most dangerous, because it
      // is looking at ground it was not walking towards
      const k = m.t / WATCH.mpSweep;
      const a = m.sweepFrom + Math.sin(k * Math.PI * 2) * 1.15;
      m.fx = Math.cos(a); m.fy = Math.sin(a);
      if (m.t >= WATCH.mpSweep) {
        m.state = 'walk'; m.t = 0;
        if (m.goX === null) {
          m.leg += m.dir;
          if (m.leg >= m.route.length) { m.leg = m.route.length - 2; m.dir = -1; }
          if (m.leg < 0) { m.leg = 1; m.dir = 1; }
        }
      }
    }
    if (mpSees(m)) held = held || { kind: 'mp', o: m };
  }

  // ---- the meter. NOT INSTANT, and that is deliberate: at four tiles a
  // second, instant detection is a coin toss rather than stealth — you would
  // be killed by a cone you never had a frame to see. 0.85s is long enough to
  // get back behind a blast pen and short enough that it never feels safe.
  if (held) {
    Watch.by = held;
    Watch.seen = Math.min(1, Watch.seen + WATCH.fill * dt);
    if (Watch.seen >= 1) triggerSwarm();
  } else {
    Watch.by = null;
    Watch.seen = Math.max(0, Watch.seen - WATCH.drain * dt);
  }
}

// ---------------------------------------------------------------------
// THE SWARM
// ---------------------------------------------------------------------
function triggerSwarm() {
  if (Watch.swarm || player.dead > 0) return;
  Watch.swarm = true;
  Watch.seen = 1;
  addShake(3.5);
  SFX.alarm();

  // six of them, from every side, from off the edge of the screen
  swarmBots.length = 0;
  // NINE TILES, NOT FIFTEEN. At zoom 1.45 the view is about seven tiles wide,
  // so from fifteen they spent the whole beat off-screen and arrived in the
  // last half second — the player saw an empty frame and then died. From nine
  // they come into shot almost at once and close for the whole beat, which is
  // the shot: not a fight, an arrival.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.45;
    swarmBots.push({
      x: player.x + Math.cos(a) * 9, y: player.y + Math.sin(a) * 9,
      fx: -Math.cos(a), fy: -Math.sin(a), a,
    });
  }
  const px = player.x, py = player.y;
  // The FIRST one cannot be skipped — it is the teaching, and a player who
  // skips it never learns why they died. Every one after it can, because a
  // death cutscene you cannot skip is one you come to hate on the second run.
  const skippable = Watch.swarmSeen;
  Watch.swarmSeen = true;

  playCine([
    // 1. the moment of being seen. No text: the alarm and the shake say it.
    { dur: 1.0, cam: [px, py], zoom: 1.6, skippable,
      tick: (t) => { if (t < 0.4) addShake(0.9); } },
    // 2. they converge. Nothing the player can do, and that is the point.
    { dur: 2.4, cam: [px, py], zoom: 1.45, skippable,
      tick: (t, dt) => {
        for (const s of swarmBots) {
          const dx = px - s.x, dy = py - s.y, d = Math.hypot(dx, dy);
          if (d > 1.2) {
            const step = 3.4 * dt;
            s.x += (dx / d) * step; s.y += (dy / d) * step;
            s.fx = dx / d; s.fy = dy / d;
          }
        }
      } },
    // 3. they arrive, and it is over between one frame and the next.
    { dur: 0.9, cam: [px, py], zoom: 1.45, skippable,
      fadeFrom: 0, fadeTo: 1, fadeDur: 0.55,
      enter: () => { addShake(4); SFX.die(); } },
  ], () => {
    swarmBots.length = 0;
    Watch.swarm = false;
    Watch.seen = 0; Watch.by = null;
    player.hp = 0; player.dead = 2;
    saveGame();
  });
}

// ---------------------------------------------------------------------
// being shot at
// ---------------------------------------------------------------------
// DULL PLATE. Nothing lands, ever, and the player is told once — in a thought,
// not a tutorial — so the second round is an informed decision.
function mpBulletHit(b) {
  const A = currentAreaDef();
  if (!A || !A.hasWatch) return false;
  for (const m of mps) {
    if (Math.hypot(b.x - m.x, b.y - m.y) >= 0.55) continue;
    m.hitFlash = 0.09;
    spawnSparks(b.x, b.y, 5, ['#c9c9d2', '#8a8a92']);
    SFX.ricochet();
    if (!Watch.networkDown) watchNoise(m.x, m.y);
    if (typeof think === 'function')
      think('mpPlate', 'Nothing gets through that plate. Nothing I have.');
    return true;
  }
  return false;
}
function mpMeleeHit(x, y, r) {
  const A = currentAreaDef();
  if (!A || !A.hasWatch) return false;
  let any = false;
  for (const m of mps) {
    if (Math.hypot(x - m.x, y - m.y) > r) continue;
    any = true; m.hitFlash = 0.09;
    spawnSparks(m.x, m.y, 3, ['#c9c9d2']);
    SFX.ricochet();
    if (typeof think === 'function')
      think('mpPlate', 'Nothing gets through that plate. Nothing I have.');
  }
  return any;
}

// A CAMERA IS A HOUSING AND A LENS, not armour. You can take one out — and the
// shot brings the nearest unit to stand exactly where you did it. That is the
// trade, and it is the only agency this field gives you before the Provost.
function cameraBulletHit(b) {
  const A = currentAreaDef();
  if (!A || !A.hasWatch) return false;
  for (const c of cameras) {
    if (c.dead) continue;
    if (Math.hypot(b.x - c.x, b.y - c.y) >= 0.6) continue;
    c.dead = true; c.hitFlash = 0.12;
    spawnSparks(c.x, c.y, 10, ['#ffd27a', '#c9c9d2'], 2);
    spawnSmoke(c.x, c.y, 2);
    SFX.hitMetal();
    showMsg('Camera down — and they heard it', 1.6);
    watchNoise(c.x, c.y);
    saveGame();
    return true;
  }
  return false;
}

// a cone on you counts as being hunted, like everything else that hunts you
function watchHunting() {
  const A = currentAreaDef();
  return !!(A && A.hasWatch && !Watch.networkDown && Watch.seen > 0.05);
}

// The Provost is down. Every housing on the field goes dark at once, and the
// units stop where they are — which is the reward, and it is a whole area
// changing state rather than a door opening.
function watchNetworkDown() {
  Watch.networkDown = true;
  Watch.seen = 0; Watch.by = null;
  showMsg('The monitors go dark', 2.2);
}
