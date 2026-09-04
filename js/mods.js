// THE PARTS REGISTRY — what a weapon can be made into.
//
// One rule holds this file together: WHAT CAN BE CHANGED IS A PROPERTY OF THE
// WEAPON, not a rule of the game. The pipe, the knife and the scrap pistol have
// no entry here and never will — they are what you make do with, and making do
// is their whole character. The service rifle is the one gun you EARN, off the
// Compactor and off Bo's bench, so it is the one gun you can argue with.
//
// A part declares deltas, never final numbers. The panel prints what a part
// does by asking the game what the gun would become — so a part's description
// and its effect cannot drift apart, because they are the same arithmetic.
// See design/gunsmith.md.

// Slot order here is the order the panel lays them out, and each slot names the
// point on the drawn rifle its leader line touches — sprite pixels in the 34x12
// build (js/sprites.js), where the standard gun starts 4px in.
const MOD_SLOTS = {
  rifle: [
    { id: 'barrel', label: 'BARREL',   ax: 8,  ay: 4 },   // mid barrel
    { id: 'optic',  label: 'OPTIC',    ax: 15, ay: 8 },   // where the laser clamps
    { id: 'mag',    label: 'MAGAZINE', ax: 19, ay: 10 },  // the magazine well
    { id: 'stock',  label: 'STOCK',    ax: 30, ay: 5 },   // the butt
  ],
};
const isModdable = (gun) => !!MOD_SLOTS[gun];
const slotsOf = (gun) => MOD_SLOTS[gun] || [];

// `std` parts are the gun as it comes: free, owned from the start, no effect.
// Everything else costs scrap and tech, which is what the ring already runs on
// — no weapon levels, no unlock ladder. `stats` are added to the base numbers;
// `flags` replace them outright, because a burst is not a bigger number.
const PARTS = {
  // ---- BARREL: one shot, or three
  barStd: {
    slot: 'barrel', gun: 'rifle', std: true, name: 'Standard barrel',
    desc: 'The barrel it was issued with. One round each time you ask.',
  },
  barBurst: {
    slot: 'barrel', gun: 'rifle', name: 'Burst regulator',
    cost: { tech: 2, scrap: 12 },
    stats: { cd: 0.17 },
    flags: { burst: 3, burstGap: 0.08, spread: 0.045, burstCool: 2.0 },
    note: 'the whole burst leaves the gun',
    // the burst is an ability, not a fire mode: it recharges, and the weapon
    // slot draws that bar. Holding the right button cannot spray with it.
    desc: 'LEFT CLICK sends one round; RIGHT CLICK sends three, then needs ' +
          'two seconds to come back. A stop and a spring off a machine that ' +
          'fired in threes — and like that machine, once a burst starts it ' +
          'finishes, whether or not the first round was enough.',
  },
  barLong: {
    slot: 'barrel', gun: 'rifle', name: 'Long barrel',
    cost: { tech: 3, scrap: 10 },
    stats: { dmg: 4, cd: 0.17, speed: 5, life: 0.3 },
    desc: 'Longer, heavier, and the round leaves it flatter and angrier. ' +
          'You will hit things further away and wait longer between saying so.',
  },

  // ---- MAGAZINE: how often you have to stop
  magStd: {
    slot: 'mag', gun: 'rifle', std: true, name: '12-round box',
    desc: 'Twelve, then the pause. The number the rifle was built around.',
  },
  magDrum: {
    slot: 'mag', gun: 'rifle', name: 'Drum, 24',
    cost: { tech: 2, scrap: 14 },
    stats: { cap: 12, reload: 1.3 },
    desc: 'A fat steel drum wired to feed. Twice the fight before you stop — ' +
          'and when you do stop, you are standing there for three seconds.',
  },
  magLight: {
    slot: 'mag', gun: 'rifle', name: 'Stripped 8-round box',
    cost: { scrap: 6 },
    stats: { cap: -4, reload: -0.45 },
    desc: 'Cut down to nothing and it drops out of the well like it is glad ' +
          'to. Fewer rounds, and barely a pause between them.',
  },

  // ---- OPTIC: knowing where the shot goes
  optStd: {
    slot: 'optic', gun: 'rifle', std: true, name: 'Iron sights',
    desc: 'A notch and a post. They work, and they tell you nothing.',
  },
  optLaser: {
    slot: 'optic', gun: 'rifle', name: 'Laser box',
    cost: { tech: 2, scrap: 6 },
    flags: { laser: true },
    note: 'draws the line the shot will take',
    desc: 'A diode in a clamp, off something that used it to aim at people. ' +
          'It draws the shot before you take it, which at a distance is the ' +
          'difference between aiming and hoping.',
  },

  // ---- STOCK: the pause, shortened
  stkStd: {
    slot: 'stock', gun: 'rifle', std: true, name: 'Fixed stock',
    desc: 'Hard plastic against your shoulder. It has never been anything else.',
  },
  stkPadded: {
    slot: 'stock', gun: 'rifle', name: 'Padded stock',
    cost: { tech: 1, scrap: 9 },
    stats: { reload: -0.35, shake: -0.4 },
    desc: 'Somebody stitched a folded blanket over the plate and it turns out ' +
          'that is most of the trick: the gun sits still and comes back to ' +
          'the shoulder faster.',
  },

  // ---- THE NORTH'S TWO. Both slots already hold something, so these are
  // ALTERNATIVES, not additions — the bench stays a set of choices.
  optGunCam: {
    slot: 'optic', gun: 'rifle', name: 'Gun-camera optic',
    cost: { tech: 3, scrap: 10 },
    flags: { mark: 4.0 },
    note: 'the last thing you hit stays visible',
    desc: 'A recording head off a surveillance mount, clamped where the sights ' +
          'were. It keeps drawing what you last hit for four seconds after it ' +
          'goes behind something — which on open ground, where you lose things ' +
          'to distance rather than to walls, is the difference between a second ' +
          'shot and a guess.',
  },
  stkBraced: {
    slot: 'stock', gun: 'rifle', name: 'Recoil-braced stock',
    cost: { tech: 2, scrap: 12 },
    stats: { shake: -0.8 },
    flags: { spreadMul: 0.55 },
    note: 'a burst goes where the first round went',
    desc: 'A machine that fired in threes needed the third round to land where ' +
          'the first one did, so it was built with a brace instead of a ' +
          'shoulder. Bolted to a rifle it does the same job for the same reason.',
  },
};

// WHAT COMES OFF WHAT. The two parts no camp can make are carried by the
// machines that use them, so the only way to own one is to put that machine
// down and strip it — once; a second is no use to anybody. Squads respawn, so
// nothing here can become unobtainable by having played early.
const DROID_PARTS = {
  marshal: 'barBurst',      // it fires in threes; the thing that makes it unbolts
  magistrate: 'barLong',    // the cannon's barrel, long and heavy and threaded
};

// the part a slot came with — used at the start of a run, and as the fallback
// for any saved id this build no longer ships
function stdPartOf(gun, slot) {
  for (const id in PARTS) {
    const p = PARTS[id];
    if (p.std && p.gun === gun && p.slot === slot) return id;
  }
  return null;
}
function freshMods() {
  const fitted = {};
  for (const gun of Object.keys(MOD_SLOTS)) {
    fitted[gun] = {};
    for (const s of MOD_SLOTS[gun]) fitted[gun][s.id] = stdPartOf(gun, s.id);
  }
  return { owned: {}, fitted };
}
player.mods = freshMods();

// what is bolted to the rifle right now, for whoever is drawing it
const rifleFit = () => player.mods.fitted.rifle || {};

const partsForSlot = (gun, slot) =>
  Object.keys(PARTS).filter(id => PARTS[id].gun === gun && PARTS[id].slot === slot);
const fittedId = (gun, slot) => (player.mods.fitted[gun] || {})[slot];
const ownsPart = (id) => !!(PARTS[id] && (PARTS[id].std || player.mods.owned[id]));
const modCount = (gun) =>
  slotsOf(gun).filter(s => { const p = PARTS[fittedId(gun, s.id)]; return p && !p.std; }).length;

// ---------- THE ONE PLACE THE RIFLE'S NUMBERS COME FROM ----------
// Firing, reloading, the HUD, the tutorial and the gunsmith all read this and
// never GUNS[gun] directly. Before mods those numbers were read in four places;
// with mods, four readers would have disagreed inside a week.
// Both the live gun and the "what if I fitted this" preview are the SAME sum
// over a list of parts, because a preview computed a different way is a
// preview that can lie. Deltas add; flags are set by whichever part carries
// them, so a barrel's burst survives a magazine being swapped under it.
function statsFor(gun, fitted) {
  const out = Object.assign({ burst: 0, laser: false }, GUNS[gun] || GUNS.pistol);
  for (const s of slotsOf(gun)) {
    const p = PARTS[fitted[s.id]];
    if (!p) continue;
    for (const k in (p.stats || {})) out[k] = (out[k] || 0) + p.stats[k];
    for (const k in (p.flags || {})) out[k] = p.flags[k];
  }
  // a part list that ever went silly must not be able to break the gun
  out.cap = Math.max(1, Math.round(out.cap));
  out.cd = Math.max(0.05, out.cd);
  out.reload = Math.max(0.3, out.reload);
  out.shake = Math.max(0, out.shake);
  return out;
}

let statCache = null, statCacheKey = '';
function gunStats(gun) {
  if (!isModdable(gun)) return GUNS[gun] || GUNS.pistol;
  const fitted = player.mods.fitted[gun] || {};
  const key = gun + ':' + slotsOf(gun).map(s => fitted[s.id]).join('|');
  if (statCache && statCacheKey === key) return statCache;
  statCache = statsFor(gun, fitted);
  statCacheKey = key;
  return statCache;
}
function modsChanged() { statCache = null; statCacheKey = ''; }

// what the gun would become with `id` in its slot — everything else as fitted
function statsWith(gun, id) {
  const p = PARTS[id];
  if (!p) return gunStats(gun);
  const trial = Object.assign({}, player.mods.fitted[gun] || {});
  trial[p.slot] = id;
  return statsFor(gun, trial);
}

// ---------- getting a part, and fitting one ----------
// THE BENCH IS NOT A SHOP. Laurens, 2026-08-21: *"you cant buy them at the
// table you need to find them or purchase them from npcs"* — and he is right,
// because a bench that sells you the part it then bolts on is a menu with a
// table drawn behind it. A part is a THING: you take it off a machine you put
// down, or you buy it from somebody who has one. The bench only fits what is
// already in your kit, which is also what makes carrying an unfitted part feel
// like carrying something.
//
// `cost` stays on the part rather than on the trader's row, so a price is
// written once no matter whose counter it turns up on.
function givePart(id) {
  const p = PARTS[id];
  if (!p || p.std) return false;
  const isNew = !player.mods.owned[id];
  player.mods.owned[id] = true;
  if (typeof saveGame === 'function') saveGame();
  return isNew;                        // false = you already had one
}

// Fitting a smaller magazine must not eat what is in the gun. RELOADING NEVER
// THROWS ROUNDS AWAY is the rule the whole ammunition system turns on, and a
// part swap is not the place to break it: the overflow goes back in the pocket.
function fitPart(gun, id) {
  const p = PARTS[id];
  if (!p || p.gun !== gun || !ownsPart(id)) return false;
  player.mods.fitted[gun][p.slot] = id;
  modsChanged();
  const A = player.arms[gun], cap = gunStats(gun).cap;
  if (A && A.loaded > cap) { A.reserve += A.loaded - cap; A.loaded = cap; }
  if (typeof saveGame === 'function') saveGame();
  return true;
}

// ---------- the parts you are carrying, in the pack ----------
// Generated rather than typed out in js/items.js, because a part is already
// declared once up there and a second copy of its name would drift. They are
// carried, not used: the pack shows what you have and which one is on the gun,
// and fitting stays a bench job.
for (const id of Object.keys(PARTS)) {
  if (PARTS[id].std) continue;
  const p = PARTS[id];
  ITEMS['part_' + id] = {
    name: p.name,
    tab: 'parts',
    icon: () => Sprites.partIcon(id),
    desc: p.desc + '  Fitted at a workbench — Bo keeps the one in Candlelight.',
    have: () => !!player.mods.owned[id],
    equipped: () => fittedId(p.gun, p.slot) === id,
  };
}

// ---------- what a part does, in the game's own units ----------
// Derived, never written twice: every line below is this build's arithmetic on
// this build's numbers, so a part cannot describe an effect it does not have.
function effectLines(gun, id) {
  const p = PARTS[id];
  if (!p) return [];
  const now = gunStats(gun), next = statsWith(gun, id), out = [];
  const n1 = (v) => (Math.round(v * 100) / 100).toString();
  if (next.burst && !now.burst)
    out.push('right click: ' + next.burst + '-round burst, ' + (next.burstCool || 2) + 's');
  if (!next.burst && now.burst) out.push('left click only');
  if (next.laser && !now.laser) out.push('aim line');
  if (next.cap !== now.cap) out.push((next.cap > now.cap ? '+' : '') + (next.cap - now.cap) + ' rounds');
  if (next.dmg !== now.dmg) out.push((next.dmg > now.dmg ? '+' : '') + (next.dmg - now.dmg) + ' damage');
  if (n1(next.reload) !== n1(now.reload)) out.push('reload ' + n1(now.reload) + '>' + n1(next.reload) + 's');
  if (n1(next.cd) !== n1(now.cd)) out.push('fire ' + n1(now.cd) + '>' + n1(next.cd) + 's');
  if (next.life !== now.life) out.push(next.life > now.life ? 'longer reach' : 'shorter reach');
  if (p.note) out.push(p.note);
  return out;
}
