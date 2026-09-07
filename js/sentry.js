// =====================================================================
// SENTRY GUNS — the perimeter's teeth
//
// A fixed automatic gun on a post. It does not patrol, it does not follow you,
// and it cannot be walked round quietly: it is a THING IN THE WAY, which is
// what a perimeter needs and what this game did not have.
//
// WHAT GLOWS AMBER CAN BE HURT; DULL PLATE CANNOT. That rule was established by
// the Compactor and this is the second thing in the game to use it — which
// means a sentry teaches you nothing new, it asks you to already know it. You
// cannot shoot one while it sleeps. You have to wake it and then beat it.
//
// It is deliberately NOT an ai unit: no pathing, no squad, no memory. Four
// states on a timer and an arc it was bolted down facing.
// =====================================================================
const sentries = [];

const SENTRY = {
  hp: 40,
  wake: 11,          // tiles: enters the arc this close and it lights up
  keep: 14,          // and stops firing past this
  arc: 1.31,         // radians either side of its facing — 150 degrees total
  spin: 1.1,         // amber, traversing. THE WINDOW YOU CAN HURT IT IN
  track: 0.6,        // the red line onto your feet
  fire: 1.6,         // three-round bursts down it
  burstGap: 0.16,
  dmg: 7,
  speedB: 13,
};

function addSentry(gx, gy, facing) {
  sentries.push({
    gx, gy, x: gx + 0.5, y: gy + 0.5,
    face: facing,                  // radians, the middle of its arc
    state: 'sleep', t: 0, hp: SENTRY.hp,
    aim: facing, shots: 0, gap: 0,
    hitFlash: 0, dead: false, deadT: 0, looted: false,
  });
}
function clearSentries() { sentries.length = 0; }

// the key a save remembers it by — position, like every other world object
const sentryKey = (s) => s.gx + ',' + s.gy;
function collectDeadSentries() {
  return sentries.filter(s => s.dead).map(s => sentryKey(s) + (s.looted ? '!' : ''));
}
function restoreSentries(id) {
  const st = areaState[id];
  if (!st || !st.deadSentries) return;
  const down = new Set(st.deadSentries.map(k => k.replace('!', '')));
  const looted = new Set(st.deadSentries.filter(k => k.endsWith('!')).map(k => k.slice(0, -1)));
  for (const s of sentries) {
    if (!down.has(sentryKey(s))) continue;
    s.dead = true; s.state = 'dead'; s.hp = 0; s.deadT = 99;
    s.looted = looted.has(sentryKey(s));
  }
}

// is the player inside this gun's arc, and how far
function sentrySees(s) {
  if (s.dead || player.dead > 0) return 0;
  const d = Math.hypot(player.x - s.x, player.y - s.y);
  if (d > SENTRY.keep) return 0;
  let a = Math.atan2(player.y - s.y, player.x - s.x) - s.face;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  if (Math.abs(a) > SENTRY.arc) return 0;
  return d;
}

// AMBER MEANS OPEN. Everything below reads this and nothing else decides it.
const sentryLit = (s) => !s.dead && (s.state === 'spin' || s.state === 'track' || s.state === 'fire');

function updateSentries(dt) {
  if (!currentAreaDef().hasSentries) return;
  for (const s of sentries) {
    if (s.hitFlash > 0) s.hitFlash -= dt;
    if (s.dead) { s.deadT += dt; continue; }
    s.t += dt;
    const d = sentrySees(s);

    if (s.state === 'sleep') {
      // dull plate, no light, and no way to hurt it. It wakes on the ARC, not
      // on noise: walking loudly behind one is free, and that is the point.
      if (d > 0 && d < SENTRY.wake) { s.state = 'spin'; s.t = 0; SFX.uiOpen(); }
      continue;
    }
    // once lit it traverses onto you, and keeps traversing while it lives
    if (d > 0) {
      const want = Math.atan2(player.y - s.y, player.x - s.x);
      let da = want - s.aim;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      s.aim += Math.max(-2.6 * dt, Math.min(2.6 * dt, da));
    }
    if (s.state === 'spin' && s.t >= SENTRY.spin) { s.state = 'track'; s.t = 0; }
    else if (s.state === 'track' && s.t >= SENTRY.track) {
      s.state = 'fire'; s.t = 0; s.shots = 0; s.gap = 0;
    } else if (s.state === 'fire') {
      s.gap -= dt;
      if (s.gap <= 0 && s.shots < 3 && d > 0) {
        s.shots++; s.gap = SENTRY.burstGap;
        foeBullets.push({
          x: s.x, y: s.y - 0.2,
          vx: Math.cos(s.aim) * SENTRY.speedB, vy: Math.sin(s.aim) * SENTRY.speedB,
          life: 1.6, dmg: SENTRY.dmg, r: 0.12,
        });
        SFX.shot();
        addShake(0.5);
      }
      if (s.t >= SENTRY.fire) {
        s.t = 0;
        // still in the arc → straight back to traversing. Out of it → it cools
        // and goes dark, and it cannot be hurt again until it wakes.
        s.state = d > 0 ? 'spin' : 'sleep';
        s.shots = 0;
      }
    }
  }
}

// A ROUND ONLY LANDS ON A LIT ONE. This is the whole fight: you have to be
// inside its arc for it to be worth shooting at, and inside its arc is where
// it shoots you.
function sentryBulletHit(b) {
  if (!currentAreaDef().hasSentries) return false;
  for (const s of sentries) {
    if (s.dead) continue;
    if (Math.hypot(b.x - s.x, b.y - s.y) >= 0.5) continue;
    if (!sentryLit(s)) {
      // dull plate. It rings, and nothing else happens.
      spawnSparks(b.x, b.y, 4, ['#c9c9d2', '#8a8a92']);
      SFX.ricochet();
      return true;
    }
    s.hp -= (b.dmg || 10);
    s.hitFlash = 0.09;
    spawnSparks(b.x, b.y, 6, ['#ffd27a', '#ffb02e']);
    SFX.hitMetal();
    if (typeof markTarget === 'function') markTarget(s);
    if (s.hp <= 0) killSentry(s);
    return true;
  }
  return false;
}
function killSentry(s) {
  s.dead = true; s.state = 'dead'; s.hp = 0; s.deadT = 0;
  spawnSparks(s.x, s.y, 16, ['#ffd27a', '#ffb02e', '#c9c9d2'], 3);
  spawnSmoke(s.x, s.y, 5);
  addShake(3);
  SFX.die();
  player.inv.scrap += 2 + ((Math.random() * 2) | 0);
  if (Math.random() < 0.35) { player.inv.tech++; SFX.tech(); }
  showMsg('Sentry down', 1.4);
  saveGame();
}

// melee: the pipe reaches it, and the same amber rule decides whether it lands
function sentryMeleeHit(x, y, r, dmg) {
  if (!currentAreaDef().hasSentries) return false;
  let any = false;
  for (const s of sentries) {
    if (s.dead || Math.hypot(x - s.x, y - s.y) > r) continue;
    any = true;
    if (!sentryLit(s)) { spawnSparks(s.x, s.y, 3, ['#c9c9d2']); SFX.ricochet(); continue; }
    s.hp -= dmg; s.hitFlash = 0.09;
    spawnSparks(s.x, s.y, 6, ['#ffd27a', '#ffb02e']);
    SFX.hitMetal();
    if (s.hp <= 0) killSentry(s);
  }
  return any;
}

// and a live one counts as something hunting you, like everything else does
function sentryHunting() {
  if (!currentAreaDef().hasSentries) return false;
  return sentries.some(s => !s.dead && s.state !== 'sleep');
}
